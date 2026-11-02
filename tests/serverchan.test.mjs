import test from 'node:test';
import assert from 'node:assert/strict';
import { serverchanEndpoint,notificationChannels,notificationMarkdown,deliver } from '../server/notifications.mjs';
import { handleRequest,DeliveryCoordinator } from '../server/worker.mjs';

const sendkey='SCT1234567890TEST';
const data=()=>({id:'9be260e3-f3ac-4aa3-89b0-010a86e9da91',intake:{version:3,repairTypeId:'crown',toothIds:[11],preferences:{hardness:6,aesthetics:6}},respondent:{name:'本地测试',contact:'not-a-real-contact',notes:'只测试桩，不外发'},consent:{accepted:true,version:'2026-10-29'}});
const env=()=>({NOTIFICATION_CHANNELS:'serverchan',SERVERCHAN_SENDKEY:sendkey,IP_HASH_SALT:'test-only-salt',ALLOWED_ORIGINS:'https://wdddddd67.github.io'});
const time='2026-10-30T00:00:00Z';
function context(){const values=new Map();let queue=Promise.resolve();return {values,storage:{get:async k=>structuredClone(values.get(k)),put:async(k,v)=>values.set(k,structuredClone(v)),setAlarm:async()=>{},deleteAll:async()=>values.clear()},blockConcurrencyWhile(fn){const next=queue.then(fn);queue=next.catch(()=>{});return next;}};}
const request=d=>new Request('https://internal/submit',{method:'POST',body:JSON.stringify(d)});

test('个人微信不需要邮件凭据；SendKey不能变成任意请求网址',()=>{
 assert.deepEqual(notificationChannels(env()),['serverchan']);
 for(const key of ['',undefined,'https://evil.test/key','SCT../../evil','sctp1234tabc'])assert.equal(serverchanEndpoint(key),null);
 assert.equal(notificationChannels({...env(),SERVERCHAN_SENDKEY:''}),null);
 assert.equal(serverchanEndpoint(sendkey),'https://sctapi.ftqq.com/'+sendkey+'.send');
 assert.equal(notificationChannels({...env(),NOTIFICATION_CHANNELS:'email,serverchan'}),null);
});
test('个人微信只给固定提示摘要，详情包含完整答案、正确排名与真实换行',async()=>{
 let call;await deliver('serverchan',data(),time,env(),async(url,options)=>{call={url,options};return new Response('{"code":0,"data":{"errno":0,"pushid":"local-only"}}');});
 assert.equal(call.url,serverchanEndpoint(sendkey));
 const body=JSON.parse(call.options.body);assert.equal(body.short,'收到一份新的修复需求问卷，请点击查看。');
 assert.ok(!body.short.includes('not-a-real-contact'));
 assert.match(body.desp,/1\. LAVA/);assert.match(body.desp,/硬度要求是？ 6\/6/);
 assert.match(body.desp,/not-a-real-contact/);assert.ok(body.desp.split('\n').length>20);assert.equal(body.noip,1);
});
test('备注中的Markdown、HTML、代码围栏保持为文字',()=>{
 const malicious='```\n[点我](https://evil.test)\n<img src=x>\n``````';
 const output=notificationMarkdown(malicious);const lines=output.split('\n');
 assert.equal(lines[0],'```````text');assert.equal(lines.at(-1),'```````');assert.ok(output.includes(malicious));
});
test('Server酱HTTP成功但业务失败时仍视为失败，错误不泄漏SendKey',async()=>{
 for(const [status,body] of [[500,'{"code":0}'],[200,'{"code":40001}'],[200,'{"code":0,"data":{"errno":1024}}'],[200,'not json']]){
  await assert.rejects(deliver('serverchan',data(),time,env(),async()=>new Response(body,{status})),error=>!error.message.includes(sendkey));
 }
});
test('已确认的微信请求不重复推送，失败后可重试且不保存问卷原文',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({code:calls===1?40001:0}));};
 try{const ctx=context(),actor=new DeliveryCoordinator(ctx,env());assert.equal((await actor.fetch(request(data()))).status,503);assert.equal((await actor.fetch(request(data()))).status,200);assert.equal((await actor.fetch(request(data()))).status,200);assert.equal(calls,2);assert.doesNotMatch(JSON.stringify([...ctx.values]),/not-a-real-contact|只测试桩/);}finally{globalThis.fetch=original;}
});
test('状态检查只报告配置就绪，不报告真实送达或暴露密钥与收件人',async()=>{
 const unconfigured=await handleRequest(new Request('https://api.test/api/health'),{});assert.equal(unconfigured.status,503);
 const r=await handleRequest(new Request('https://api.test/api/health'),{...env(),DELIVERY:{}});assert.equal(r.status,200);
 const text=await r.text();assert.equal(JSON.parse(text).ready,true);assert.ok(!text.includes(sendkey));assert.ok(!text.includes('SERVERCHAN_SENDKEY'));assert.match(text,/仍需提交测试/);
});
