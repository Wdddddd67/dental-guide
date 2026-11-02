import test from 'node:test';
import assert from 'node:assert/strict';
import { serverchanRecipients,notificationChannels,deliver } from '../server/notifications.mjs';
import { DeliveryCoordinator,handleRequest } from '../server/worker.mjs';

const a='SCT1111111111TEST',b='SCT2222222222TEST',c='SCT3333333333TEST';
const env=()=>({NOTIFICATION_CHANNELS:'serverchan',SERVERCHAN_SENDKEYS:a+'\n'+b,IP_HASH_SALT:'test-only-salt',ALLOWED_ORIGINS:'https://example.github.io'});
const data=()=>({id:'9be260e3-f3ac-4aa3-89b0-010a86e9da91',intake:{version:3,repairTypeId:'crown',toothIds:[11],preferences:{hardness:6,aesthetics:6}},respondent:{name:'虚构测试',contact:'must-not-persist-contact',notes:'local-only-questionnaire'},consent:{accepted:true,version:'2026-10-29'}});
const req=()=>new Request('https://internal/submit',{method:'POST',body:JSON.stringify(data())});
const accepted=()=>new Response('{"code":0,"data":{"errno":0}}');
function context(){const values=new Map();let queue=Promise.resolve();return {values,storage:{get:async k=>structuredClone(values.get(k)),put:async(k,v)=>values.set(k,structuredClone(v)),setAlarm:async()=>{},deleteAll:async()=>values.clear()},blockConcurrencyWhile(fn){const next=queue.then(fn);queue=next.catch(()=>{});return next;}};}

test('多微信名单支持换行和逗号、去重、优先于单密钥，最多十人',()=>{
 assert.deepEqual(serverchanRecipients(env()),[a,b]);
 assert.deepEqual(serverchanRecipients({SERVERCHAN_SENDKEY:a}),[a]);
 assert.deepEqual(serverchanRecipients({SERVERCHAN_SENDKEY:a,SERVERCHAN_SENDKEYS:'  \n '}),[a]);
 assert.deepEqual(serverchanRecipients({SERVERCHAN_SENDKEY:c,SERVERCHAN_SENDKEYS:' '+a+',\n'+b+'\r\n'+a}),[a,b]);
 assert.equal(serverchanRecipients({SERVERCHAN_SENDKEYS:Array.from({length:11},(_,i)=>'SCT'+String(i).padStart(10,'0')+'TEST').join('\n')}),null);
 for(const value of [a+',https://evil.test',a+',sctp12345test',a+',SCT../../other','["'+a+'"]'])assert.equal(serverchanRecipients({SERVERCHAN_SENDKEY:a,SERVERCHAN_SENDKEYS:value}),null);
 assert.deepEqual(notificationChannels(env()),['serverchan']);
});

test('同时向每个不同密钥推送同一份问卷，等待所有确认而不是串行发送',{timeout:3000},async()=>{
 let release,allStarted;const gate=new Promise(r=>{release=r;}),started=new Promise(r=>{allStarted=r;});
 const calls=[],done=[];
 const sending=deliver('serverchan',data(),'2026-11-02T00:00:00Z',env(),async(url,options)=>{
  calls.push({url,body:JSON.parse(options.body)});if(calls.length===2)allStarted();await gate;return accepted();
 },{onRecipient:async id=>done.push(id)});
 try{await started;assert.equal(calls.length,2);assert.deepEqual(calls[0].body,calls[1].body);assert.match(calls[0].body.desp,/1\. LAVA/);assert.equal(done.length,0);}finally{release();}
 await sending;assert.equal(new Set(done).size,2);for(const id of done)assert.match(id,/^[a-f0-9]{64}$/);
});

test('部分微信确认后重启并调整名单顺序，重试只发失败者，最终重复提交不再发',async()=>{
 const original=globalThis.fetch,calls=[];let bFailed=false;
 globalThis.fetch=async url=>{calls.push(url);if(url.includes(b)&&!bFailed){bFailed=true;return new Response('{"code":40001}');}return accepted();};
 try{
  const ctx=context();let actor=new DeliveryCoordinator(ctx,env());
  const partial=await actor.fetch(req());assert.equal(partial.status,503);assert.match((await partial.json()).message,/部分通知已确认/);
  assert.equal(ctx.values.get('submission').serverchanRecipients.length,1);
  actor=new DeliveryCoordinator(ctx,{...env(),SERVERCHAN_SENDKEYS:b+'\n'+a});
  assert.equal((await actor.fetch(req())).status,200);
  assert.equal((await actor.fetch(req())).status,200);
  assert.equal(calls.filter(url=>url.includes(a)).length,1);assert.equal(calls.filter(url=>url.includes(b)).length,2);
  const persisted=JSON.stringify([...ctx.values]);for(const value of [a,b,'must-not-persist-contact','local-only-questionnaire'])assert.ok(!persisted.includes(value));
 }finally{globalThis.fetch=original;}
});

test('两个微信中一个网络失败时仍保存另一个确认，错误信息不泄漏任何密钥',async()=>{
 const done=[];
 await assert.rejects(deliver('serverchan',data(),'2026-11-02T00:00:00Z',env(),async url=>{if(url.includes(b))throw Error('network at '+url);return accepted();},{onRecipient:async id=>done.push(id)}),error=>!error.message.includes(a)&&!error.message.includes(b));
 assert.equal(done.length,1);
});

test('名单中任何密钥格式错误都不会给其余人发送或报告服务就绪',async()=>{
 let calls=0;const bad={...env(),SERVERCHAN_SENDKEYS:a+'\ninvalid'};
 await assert.rejects(deliver('serverchan',data(),'2026-11-02T00:00:00Z',bad,async()=>{calls++;return accepted();}));
 assert.equal(calls,0);assert.equal(notificationChannels(bad),null);
 assert.equal((await handleRequest(new Request('https://api.test/api/health'),{...bad,DELIVERY:{}})).status,503);
});

test('多微信发送期间的并发重复提交等待，所有确认后才返回成功',async()=>{
 const original=globalThis.fetch;let release,started;const gate=new Promise(r=>{release=r;}),both=new Promise(r=>{started=r;});let calls=0;
 globalThis.fetch=async()=>{calls++;if(calls===2)started();await gate;return accepted();};
 try{
  const actor=new DeliveryCoordinator(context(),env()),first=actor.fetch(req());
  await both;const duplicate=await actor.fetch(req());assert.equal(duplicate.status,409);release();
  assert.equal((await first).status,200);assert.equal((await actor.fetch(req())).status,200);assert.equal(calls,2);
 }finally{release();globalThis.fetch=original;}
});

test('兼容旧单微信已完成记录，新增名单不会重发已经成功的旧回执',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return accepted();};
 try{
  const ctx=context();await new DeliveryCoordinator(ctx,{...env(),SERVERCHAN_SENDKEYS:'',SERVERCHAN_SENDKEY:a}).fetch(req());
  const legacy=ctx.values.get('submission');delete legacy.serverchanRecipients;ctx.values.set('submission',legacy);
  assert.equal((await new DeliveryCoordinator(ctx,env()).fetch(req())).status,200);assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});
