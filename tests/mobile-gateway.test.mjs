import test from 'node:test';
import assert from 'node:assert/strict';
import { createMobileGateway,signedGatewayHeaders,authenticateGateway,readLimitedBodyBytes } from '../server/mobile-gateway.mjs';
import { handleRequest,DeliveryCoordinator } from '../server/worker.mjs';
import { normalizeApiBaseUrl } from '../scripts/build.mjs';

const origin='https://wdddddd67.github.io',upstream='https://dental-guide-notify.wdz1367.workers.dev';
const base='https://czszufrhouyjuzrhvgjg.supabase.co/functions/v1/dental-gateway';
const secret='test-only-mobile-gateway-secret-0123456789abcdef';
const data=()=>({id:'9be260e3-f3ac-4aa3-89b0-010a86e9da91',intake:{version:3,repairTypeId:'crown',toothIds:[11],preferences:{hardness:6,aesthetics:6}},respondent:{name:'虚构中转测试',contact:'not-a-real-contact',notes:'local-gateway-test-only'},consent:{accepted:true,version:'2026-10-29'},website:''});
const body=()=>new TextEncoder().encode(JSON.stringify(data()));
const request=(options={})=>new Request(base+'/api/submissions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...options.headers},body:JSON.stringify(data()),...options});
function context(){const values=new Map();let queue=Promise.resolve();return {values,storage:{get:async k=>structuredClone(values.get(k)),put:async(k,v)=>values.set(k,structuredClone(v)),setAlarm:async()=>{},deleteAll:async()=>values.clear()},blockConcurrencyWhile(fn){const next=queue.then(fn);queue=next.catch(()=>{});return next;}};}
async function signedRequest(path='/api/submissions',bytes=body(),time=String(Date.now()),signingSecret=secret){const headers=await signedGatewayHeaders(signingSecret,time,'POST',path,bytes);return new Request(upstream+path,{method:'POST',headers:{...headers,Origin:origin,'Content-Type':'application/json'},body:bytes});}

test('支持函数根路径并清理隐藏空白，拒绝认证参数和错误的提交路径',()=>{
 assert.equal(normalizeApiBaseUrl('\t '+base+'/ \n'),base);
 assert.equal(normalizeApiBaseUrl(upstream+'/'),upstream);
 assert.equal(normalizeApiBaseUrl(''), '');
 assert.equal(normalizeApiBaseUrl('http://127.0.0.1:4186/'),'http://127.0.0.1:4186');
 for(const value of [base+'?key=secret',base+'#fragment','https://user:pass@example.test','http://example.test','ftp://localhost/api',base+'/api/submissions',base+'/api/health'])assert.throws(()=>normalizeApiBaseUrl(value));
});

test('签名绑定正文、方法、路径、时间，伪造及过期请求被拒绝',async()=>{
 const bytes=body(),time=String(Date.now()),headers=await signedGatewayHeaders(secret,time,'POST','/api/submissions',bytes);
 const valid=await authenticateGateway(new Request(upstream+'/api/submissions',{method:'POST',headers,body:bytes}),{DENTAL_GATEWAY_SECRET:secret});
 assert.deepEqual(valid.body,bytes);
 for(const [method,path,payload] of [['POST','/api/submissions',new TextEncoder().encode('{}')],['PUT','/api/submissions',bytes],['POST','/api/other',bytes]])await assert.rejects(authenticateGateway(new Request(upstream+path,{method,headers,body:payload}),{DENTAL_GATEWAY_SECRET:secret}),e=>e.status===401);
 await assert.rejects(authenticateGateway(await signedRequest('/api/submissions',bytes,String(Date.now()-121000)),{DENTAL_GATEWAY_SECRET:secret}),e=>e.status===401);
 await assert.rejects(authenticateGateway(await signedRequest(),{DENTAL_GATEWAY_SECRET:'a-different-shared-secret-0123456789abcdef'}),e=>e.status===401);
 await assert.rejects(authenticateGateway(await signedRequest(),{}),e=>e.status===503);
 assert.equal(await authenticateGateway(new Request(upstream+'/api/health'),{}),null);
});

test('转发前的来源、方法、正文大小和配置检查阻止无效请求',async()=>{
 let calls=0;const relay=createMobileGateway({DENTAL_GATEWAY_SECRET:secret},async()=>{calls++;throw Error('must not call');});
 for(const [r,status] of [[new Request(base+'/api/submissions',{method:'POST',body:'{}'}),403],[request({headers:{Origin:'https://evil.test','Content-Type':'application/json'}}),403],[request({headers:{Origin:origin,'Content-Type':'text/plain'}}),415],[new Request(base+'/unknown'),404],[request({body:'x'.repeat(12001)}),413],[request({body:'{bad'}),400],[new Request(base+'/api/health',{method:'POST'}),405]])assert.equal((await relay(r)).status,status);
 assert.equal((await createMobileGateway({},async()=>{calls++;})(request())).status,503);assert.equal(calls,0);
 const preflight=await relay(new Request(base+'/api/submissions',{method:'OPTIONS',headers:{Origin:origin}}));assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(calls,0);
});

test('转发固定后台且只传必要头，阻止用户改目标及携带服务凭据',async()=>{
 let seen;
 const relay=createMobileGateway({DENTAL_GATEWAY_SECRET:secret},async(url,options)=>{seen={url,options};return new Response(JSON.stringify({ok:true,id:data().id,acceptedAt:'2026-11-02T00:00:00Z',privateValue:'never_return'}),{headers:{'Set-Cookie':'private=secret'}});});
 const r=await relay(new Request(base+'/api/submissions?target=https://evil.test',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer do-not-forward',Cookie:'do-not-forward=1','X-Forwarded-For':'forged-client'},body:JSON.stringify(data())}));
 assert.equal(r.status,200);assert.equal(seen.url,upstream+'/api/submissions');assert.equal(seen.options.redirect,'error');
 const headers=new Headers(seen.options.headers);for(const name of ['Authorization','Cookie','X-Forwarded-For'])assert.equal(headers.get(name),null);
 assert.equal(r.headers.get('Set-Cookie'),null);assert.ok(!(await r.text()).includes('never_return'));
});

test('上游无效回执、超时或HTML错误不伪造成功，也不泄漏共享密钥',async()=>{
 const replies=[async()=>new Response('{}'),async()=>new Response(JSON.stringify({ok:true,id:'wrong',acceptedAt:'now'})),async()=>new Response('<html>error</html>'),async()=>{throw Error('network with '+secret);}];
 for(const fetcher of replies){const r=await createMobileGateway({DENTAL_GATEWAY_SECRET:secret},fetcher)(request());assert.equal(r.status,502);const text=await r.text();assert.equal(JSON.parse(text).ok,false);assert.ok(!text.includes(secret));}
 const failed=await createMobileGateway({DENTAL_GATEWAY_SECRET:secret},async()=>new Response(JSON.stringify({ok:false,message:'部分通知待确认。'}),{status:503,headers:{'Retry-After':'600'}}))(request());assert.equal(failed.status,503);assert.equal(failed.headers.get('Retry-After'),'600');
});

test('兼容Supabase路径前缀；健康检查同时核对共享密钥和后台就绪',async()=>{
 const env={DENTAL_GATEWAY_SECRET:secret,NOTIFICATION_CHANNELS:'serverchan',SERVERCHAN_SENDKEY:'SCT1234567890TEST',IP_HASH_SALT:'test-salt',ALLOWED_ORIGINS:origin,DELIVERY:{}};
 const relay=createMobileGateway({DENTAL_GATEWAY_SECRET:secret},(url,options)=>handleRequest(new Request(url,options),env));
 for(const prefix of ['', '/dental-gateway','/functions/v1/dental-gateway']){const r=await relay(new Request('https://example.supabase.co'+prefix+'/api/health'));assert.equal(r.status,200);assert.equal((await r.json()).ready,true);}
 const wrong=createMobileGateway({DENTAL_GATEWAY_SECRET:'wrong-gateway-secret-0123456789abcdef'},(url,options)=>handleRequest(new Request(url,options),env));const r=await wrong(new Request(base+'/api/health'));assert.equal(r.status,503);assert.equal((await r.json()).ready,false);
 const legacy=createMobileGateway({DENTAL_GATEWAY_SECRET:secret},async()=>new Response(JSON.stringify({service:'dental-guide-notify',ready:true})));assert.equal((await legacy(new Request(base+'/api/health'))).status,503);
 // The original public health endpoint remains available without gateway headers.
 assert.equal((await handleRequest(new Request(upstream+'/api/health'),env)).status,200);
});

test('中转完整经过既有后端，保留两人推送、重复提交去重和正文不落库',async()=>{
 const actors=new Map(),contexts=new Map();let pushes=0;
 const env={DENTAL_GATEWAY_SECRET:secret,NOTIFICATION_CHANNELS:'serverchan',SERVERCHAN_SENDKEYS:'SCT1111111111TEST,SCT2222222222TEST',IP_HASH_SALT:'test-salt',ALLOWED_ORIGINS:origin,DELIVERY:{idFromName:name=>name,get(name){if(!actors.has(name)){const ctx=context();contexts.set(name,ctx);actors.set(name,new DeliveryCoordinator(ctx,env));}return actors.get(name);}}};
 const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{if(url.startsWith(upstream+'/'))return handleRequest(new Request(url,options),env);if(url.startsWith('https://sctapi.ftqq.com/')){pushes++;return new Response('{"code":0,"data":{"errno":0}}');}throw Error('Unexpected external destination');};
 try{
  const relay=createMobileGateway({DENTAL_GATEWAY_SECRET:secret},globalThis.fetch);
  const r=await relay(request());assert.equal(r.status,200);assert.equal((await r.json()).id,data().id);assert.equal(pushes,2);
  assert.equal((await relay(request())).status,200);assert.equal(pushes,2);assert.ok(contexts.has('rate:signed-mobile-gateway'));
  const stored=JSON.stringify([...contexts.values()].flatMap(ctx=>[...ctx.values]));for(const text of [secret,'not-a-real-contact','local-gateway-test-only'])assert.ok(!stored.includes(text));
  const direct=data();direct.id='7e8ab460-d598-43a3-b07f-17e307c3f232';const desktop=await handleRequest(new Request(upstream+'/api/submissions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.20'},body:JSON.stringify(direct)}),env);assert.equal(desktop.status,200);assert.equal(pushes,4);
 }finally{globalThis.fetch=original;}
});

test('中转入口使用独立的全局限流，不信任转发的客户端IP',async()=>{
 const ctx=context(),actor=new DeliveryCoordinator(ctx,{});
 for(let i=0;i<100;i++)assert.equal((await actor.fetch(new Request('https://internal/gateway-rate',{method:'POST'}))).status,200);
 assert.equal((await actor.fetch(new Request('https://internal/gateway-rate',{method:'POST'}))).status,429);
 await actor.alarm();assert.equal((await actor.fetch(new Request('https://internal/gateway-rate',{method:'POST'}))).status,200);
});

test('包括已签名请求在内的流式正文上限统一为12KB',async()=>{
 const large=new TextEncoder().encode('x'.repeat(12001));
 await assert.rejects(readLimitedBodyBytes(new Request(upstream+'/api/submissions',{method:'POST',body:large})),e=>e.status===413);
 const headers=await signedGatewayHeaders(secret,String(Date.now()),'POST','/api/submissions',large);
 const r=await handleRequest(new Request(upstream+'/api/submissions',{method:'POST',headers:{...headers,Origin:origin,'Content-Type':'application/json'},body:large}),{DENTAL_GATEWAY_SECRET:secret,NOTIFICATION_CHANNELS:'serverchan',SERVERCHAN_SENDKEY:'SCT1234567890TEST',IP_HASH_SALT:'test-salt',ALLOWED_ORIGINS:origin,DELIVERY:{}});
 assert.equal(r.status,413);
});
