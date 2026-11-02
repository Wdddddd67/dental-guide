// Standalone Supabase Edge Function; also imported by the existing Worker.
// No notification keys or database credentials belong in this file.
export const GATEWAY_BODY_LIMIT=12000;
const UPSTREAM='https://dental-guide-notify.wdz1367.workers.dev';
const WEB_ORIGIN='https://wdddddd67.github.io';
const PREFIXES=['','/dental-gateway','/functions/v1/dental-gateway'];
const encoder=new TextEncoder();
export class GatewayError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const hex=bytes=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
const validSecret=value=>typeof value==='string'&&value.length>=32&&value.length<=256&&!/REPLACE|YOUR_/i.test(value);
export async function readLimitedBodyBytes(request){
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();
 const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>GATEWAY_BODY_LIMIT){await reader.cancel();throw new GatewayError('提交内容过长，请缩短补充需求。',413);}chunks.push(value);}
 const body=new Uint8Array(length);let offset=0;for(const part of chunks){body.set(part,offset);offset+=part.byteLength;}return body;
}
async function signingInput(time,method,path,body){
 const digest=hex(await crypto.subtle.digest('SHA-256',body));
 return encoder.encode(['dental-gateway-v1',time,method,path,digest].join('\n'));
}
async function signingKey(secret,usage){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,[usage]);}
export async function signedGatewayHeaders(secret,time,method,path,body){
 if(!validSecret(secret))throw new GatewayError('手机提交入口尚未配置完成。',503);
 const signature=await crypto.subtle.sign('HMAC',await signingKey(secret,'sign'),await signingInput(time,method,path,body));
 return {'X-Dental-Gateway-Time':time,'X-Dental-Gateway-Signature':hex(signature)};
}
export async function authenticateGateway(request,env,now=Date.now()){
 const time=request.headers.get('X-Dental-Gateway-Time'),signature=request.headers.get('X-Dental-Gateway-Signature');
 if(time===null&&signature===null)return null;
 const secret=env.DENTAL_GATEWAY_SECRET;
 if(!validSecret(secret))throw new GatewayError('手机提交入口尚未配置完成。',503);
 if(!/^\d{13}$/.test(time||'')||Math.abs(now-Number(time))>120000||!/^[a-f0-9]{64}$/.test(signature||''))throw new GatewayError('接入验证失败，请稍后重试。',401);
 const body=await readLimitedBodyBytes(request);
 const bytes=Uint8Array.from(signature.match(/../g),pair=>parseInt(pair,16));
 const ok=await crypto.subtle.verify('HMAC',await signingKey(secret,'verify'),bytes,await signingInput(time,request.method,new URL(request.url).pathname,body));
 if(!ok)throw new GatewayError('接入验证失败，请稍后重试。',401);
 return {body};
}
function json(data,status,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});}
export function createMobileGateway(env,fetcher=fetch){
 return async request=>{
  const origin=request.headers.get('Origin')||'';
  const cors=origin===WEB_ORIGIN?{'Access-Control-Allow-Origin':WEB_ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600',Vary:'Origin'}:{Vary:'Origin'};
  const path=new URL(request.url).pathname;
  const health=PREFIXES.some(prefix=>path===prefix+'/api/health');
  const submit=PREFIXES.some(prefix=>path===prefix+'/api/submissions');
  if(!health&&!submit)return json({ok:false,message:'接口不存在。'},404,cors);
  if(origin&&origin!==WEB_ORIGIN)return json({ok:false,message:'当前网页未获准提交。'},403,cors);
  if(health&&request.method!=='GET')return json({ok:false,message:'仅支持读取状态。'},405,{...cors,Allow:'GET'});
  if(submit){
   if(origin!==WEB_ORIGIN)return json({ok:false,message:'请通过项目网页提交。'},403,cors);
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
   if(request.method!=='POST')return json({ok:false,message:'仅支持提交问卷。'},405,{...cors,Allow:'POST, OPTIONS'});
   if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return json({ok:false,message:'请通过网页正常提交。'},415,cors);
  }
  try{
   if(!validSecret(env.DENTAL_GATEWAY_SECRET))throw new GatewayError('手机提交入口尚未配置完成。',503);
   const body=health?new Uint8Array():await readLimitedBodyBytes(request);
   let id;
   if(submit){try{id=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body)).id;}catch{throw new GatewayError('提交内容格式不正确。');}}
   const targetPath=health?'/api/health':'/api/submissions';
   const headers=await signedGatewayHeaders(env.DENTAL_GATEWAY_SECRET,String(Date.now()),request.method,targetPath,body);
   if(submit){headers['Content-Type']='application/json';headers.Origin=WEB_ORIGIN;}
   const reply=await fetcher(UPSTREAM+targetPath,{method:request.method,headers,...(submit?{body}:{}),redirect:'error',signal:AbortSignal.timeout(18000),credentials:'omit'});
   let result;try{result=await reply.json();}catch{throw new GatewayError('暂时未收到后台确认，请稍后重试。',502);}
   if(health){
    const ready=reply.ok&&result.service==='dental-guide-notify'&&result.ready===true&&result.gatewayVerified===true;
    return json({service:'dental-mobile-gateway',reachable:true,ready,message:ready?'手机入口与通知后台已连接，仍需问卷联调确认收件。':'手机入口已可达，通知后台尚未就绪。'},ready?200:503,cors);
   }
   if(reply.ok&&(result.ok!==true||typeof id!=='string'||result.id!==id||typeof result.acceptedAt!=='string'))throw new GatewayError('暂时未收到提交确认，请稍后重试。',502);
   // Return only public receipt/error fields, never upstream headers or credentials.
   const safe={ok:result.ok===true,...(typeof result.id==='string'?{id:result.id}:{}),...(typeof result.acceptedAt==='string'?{acceptedAt:result.acceptedAt}:{}),...(typeof result.message==='string'?{message:result.message}:{})};
   const retryAfter=reply.headers.get('Retry-After');
   return json(safe,reply.status,{...cors,...(retryAfter&&/^\d{1,5}$/.test(retryAfter)?{'Retry-After':retryAfter}:{})});
  }catch(error){return json({ok:false,message:error instanceof GatewayError?error.message:'连接通知后台超时或中断，请稍后重试；你的填写仍保留在当前页面。'},error instanceof GatewayError?error.status:502,cors);}
 };
}
// Copy this whole file into Supabase's index.ts. This branch is inactive in Node/Workers.
if(typeof Deno!=='undefined'&&typeof Deno.serve==='function'){
 Deno.serve(createMobileGateway({DENTAL_GATEWAY_SECRET:Deno.env.get('DENTAL_GATEWAY_SECRET')}));
}
