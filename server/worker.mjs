import { validateSubmission, PublicError } from './validation.mjs';
import { deliver, notificationChannels } from './notifications.mjs';
import { authenticateGateway,readLimitedBodyBytes,GatewayError } from './mobile-gateway.mjs';
const DAY=86400000;
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function readBody(request,bytes){const all=bytes??await readLimitedBodyBytes(request);if(!all.length)throw new PublicError('请求内容为空。');try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));}catch{throw new PublicError('提交内容格式不正确。');}}
function corsHeaders(origin){return {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600',Vary:'Origin'};}
export async function handleRequest(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/api/health'){
  if(request.method!=='GET')return json({ok:false,message:'仅支持读取状态。'},405,{Allow:'GET'});
  let gatewayVerified=false;try{gatewayVerified=!!await authenticateGateway(request,env);}catch(error){return json({ready:false,message:'手机入口与后台尚未连接。'},error instanceof GatewayError?error.status:503);}
  const ready=!!(notificationChannels(env)&&env.DELIVERY&&env.IP_HASH_SALT&&String(env.ALLOWED_ORIGINS||'').trim());
  return json({service:'dental-guide-notify',ready,...(gatewayVerified?{gatewayVerified:true}:{}),message:ready?'通知服务配置已就绪，仍需提交测试并确认实际收件。':'通知服务尚未配置完成。'},ready?200:503);
 }
 if(url.pathname!=='/api/submissions')return json({ok:false,message:'接口不存在。'},404);
 const origin=request.headers.get('Origin')||'';const allowed=String(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(!origin||!allowed.includes(origin))return json({ok:false,message:'当前网页未获准提交。'},403);
 const cors=corsHeaders(origin);if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return json({ok:false,message:'仅支持提交问卷。'},405,{...cors,Allow:'POST, OPTIONS'});
 if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return json({ok:false,message:'请通过网页正常提交。'},415,cors);
 if(!notificationChannels(env)||!env.DELIVERY||!env.IP_HASH_SALT)return json({ok:false,message:'提交服务尚未配置完成，请稍后再试。'},503,cors);
 try{
  const gateway=await authenticateGateway(request,env);
  const data=validateSubmission(await readBody(request,gateway?.body));
  const rawIP=request.headers.get('CF-Connecting-IP');if(!gateway&&!rawIP)return json({ok:false,message:'提交服务暂不可用，请稍后再试。'},503,cors);
  // The gateway has a separate global budget. Do not trust forwarded client-IP headers.
  const rateId=gateway?'rate:signed-mobile-gateway':('rate:'+await hash(env.IP_HASH_SALT+'|'+rawIP));
  const rate=env.DELIVERY.get(env.DELIVERY.idFromName(rateId));const rateResponse=await rate.fetch(new Request(gateway?'https://internal/gateway-rate':'https://internal/rate',{method:'POST'}));
  if(rateResponse.status!==200)return json({ok:false,message:'提交次数较多，请十分钟后再试。'},429,{...cors,'Retry-After':'600'});
  const actor=env.DELIVERY.get(env.DELIVERY.idFromName('submission:'+data.id));
  const response=await actor.fetch(new Request('https://internal/submit',{method:'POST',body:JSON.stringify(data)}));
  return new Response(response.body,{status:response.status,headers:{...Object.fromEntries(response.headers),...cors}});
 }catch(error){const known=error instanceof PublicError||error instanceof GatewayError;return json({ok:false,message:known?error.message:'暂时未收到发送确认，请稍后重试。'},known?error.status:503,cors);}
}
export default {fetch:handleRequest};
// State contains only irreversible payload hash, send status, and timestamps; no questionnaire or contact text is persisted.
export class DeliveryCoordinator{
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 async fetch(request){
  const path=new URL(request.url).pathname;
  if(path==='/rate'||path==='/gateway-rate')return this.ctx.blockConcurrencyWhile(async()=>{const now=Date.now(),limit=path==='/gateway-rate'?100:10;let state=await this.ctx.storage.get('rate');if(!state||state.resetAt<=now)state={count:0,resetAt:now+600000};if(state.count>=limit)return json({ok:false},429);state.count++;await this.ctx.storage.put('rate',state);await this.ctx.storage.setAlarm(state.resetAt+1000);return json({ok:true});});
  if(path!=='/submit')return json({ok:false},404);
  let data;try{data=validateSubmission(await request.json());}catch(error){return json({ok:false,message:'提交内容无效。'},400);}
  const channels=notificationChannels(this.env);if(!channels)return json({ok:false,message:'通知渠道尚未配置。'},503);
  const digest=await hash(JSON.stringify(data)),now=Date.now();let state;
  const reserved=await this.ctx.blockConcurrencyWhile(async()=>{state=await this.ctx.storage.get('submission');if(state&&state.expiresAt<=now)state=null;
   if(state&&state.hash!==digest)return json({ok:false,message:'提交内容已变化，请重新填写后发送。'},409);
   if(state&&channels.every(c=>state.delivered.includes(c)))return json({ok:true,id:data.id,acceptedAt:state.acceptedAt});
   if(state&&state.leaseUntil>now)return json({ok:false,message:'上次提交仍在确认中，请稍后重试。'},409,{'Retry-After':'15'});
   state=state||{hash:digest,acceptedAt:new Date(now).toISOString(),delivered:[],wecomParts:[],serverchanRecipients:[],expiresAt:now+DAY};state.leaseUntil=now+60000;
   await this.ctx.storage.put('submission',state);await this.ctx.storage.setAlarm(state.expiresAt);return null;});
  if(reserved)return reserved;
  const pending=channels.filter(c=>!state.delivered.includes(c));const results=await Promise.allSettled(pending.map(c=>deliver(c,data,state.acceptedAt,this.env,fetch,{
   completedParts:state.wecomParts||[],
   completedRecipients:state.serverchanRecipients||[],
   onPart:i=>this.ctx.blockConcurrencyWhile(async()=>{state.wecomParts=[...new Set([...(state.wecomParts||[]),i])];await this.ctx.storage.put('submission',state);}),
   onRecipient:id=>this.ctx.blockConcurrencyWhile(async()=>{state.serverchanRecipients=[...new Set([...(state.serverchanRecipients||[]),id])];await this.ctx.storage.put('submission',state);})
  })));
  await this.ctx.blockConcurrencyWhile(async()=>{for(let i=0;i<results.length;i++)if(results[i].status==='fulfilled')state.delivered.push(pending[i]);state.leaseUntil=0;await this.ctx.storage.put('submission',state);});
  if(channels.every(c=>state.delivered.includes(c)))return json({ok:true,id:data.id,acceptedAt:state.acceptedAt});
  if(state.delivered.length||state.serverchanRecipients?.length||state.wecomParts?.length)return json({ok:false,message:'部分通知已确认，请重试补发尚未确认的通知；已确认的接收人不会重复发送。'},503);
  return json({ok:false,message:'通知暂未发送成功，请稍后重试。你的填写内容仍保留在当前页面。'},503);
 }
 async alarm(){await this.ctx.storage.deleteAll();}
}
