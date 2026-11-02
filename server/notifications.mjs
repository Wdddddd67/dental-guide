import { notificationText } from './validation.mjs';
export function serverchanEndpoint(key){
 if(typeof key!=='string'||!/^SCT[A-Za-z0-9_-]{8,200}$/.test(key))return null;
 return 'https://sctapi.ftqq.com/'+key+'.send';
}
export function serverchanRecipients(env){
 const multiple=env.SERVERCHAN_SENDKEYS;
 if(multiple!==undefined&&typeof multiple!=='string')return null;
 const value=multiple?.trim();
 const candidates=value?value.split(/[\r\n,]+/).map(key=>key.trim()).filter(Boolean):[env.SERVERCHAN_SENDKEY?.trim?.()];
 const keys=[...new Set(candidates)];
 if(!keys.length||keys.length>10||keys.some(key=>!serverchanEndpoint(key)))return null;
 return keys;
}
async function recipientId(key){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('serverchan-recipient:v1|'+key));
 return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
}
export function notificationChannels(env){const channels=String(env.NOTIFICATION_CHANNELS||'serverchan').split(',').map(s=>s.trim()).filter(Boolean);if(!channels.length||channels.some(c=>!['email','wecom','serverchan'].includes(c)))return null;if(channels.includes('email')&&(!env.RESEND_API_KEY||!env.EMAIL_FROM||!env.EMAIL_TO))return null;if(channels.includes('serverchan')&&!serverchanRecipients(env))return null;if(channels.includes('wecom')){try{const u=new URL(env.WECOM_WEBHOOK_URL);if(u.protocol!=='https:'||u.hostname!=='qyapi.weixin.qq.com'||u.pathname!=='/cgi-bin/webhook/send'||!u.searchParams.get('key'))return null;}catch{return null;}}return [...new Set(channels)];}
export function notificationMarkdown(text){
 // A longer fence prevents free-text answers from injecting Markdown links or HTML.
 const longest=Math.max(0,...Array.from(text.matchAll(/`+/g),m=>m[0].length));
 const fence='`'.repeat(Math.max(3,longest+1));
 return [fence+'text',text,fence].join('\n');
}
export function textParts(text,maxBytes=1700){const encoder=new TextEncoder(),parts=[];let part='',size=0;for(const c of text){const n=encoder.encode(c).length;if(size+n>maxBytes){parts.push(part);part='';size=0;}part+=c;size+=n;}if(part)parts.push(part);return parts;}
export async function deliver(channel,data,acceptedAt,env,fetcher=fetch,progress={}){const text=notificationText(data,acceptedAt);let response;
 if(channel==='email'){response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'dental-'+data.id},body:JSON.stringify({from:env.EMAIL_FROM,to:[env.EMAIL_TO],subject:'看牙有谱 · 新的修复需求问卷',text}),signal:AbortSignal.timeout(9000)});if(!response.ok)throw Error('email_unavailable');const body=await response.json();if(typeof body.id!=='string'||!body.id)throw Error('email_unconfirmed');return;}
 if(channel==='serverchan'){
  const keys=serverchanRecipients(env);
  if(!keys)throw Error('serverchan_not_configured');
  const payload=JSON.stringify({title:'看牙有谱 · 新的修复需求问卷',short:'收到一份新的修复需求问卷，请点击查看。',desp:notificationMarkdown(text),noip:1});
  const results=await Promise.allSettled(keys.map(async key=>{
   const id=await recipientId(key);
   if(progress.completedRecipients?.includes(id))return;
   try{
    const reply=await fetcher(serverchanEndpoint(key),{method:'POST',headers:{'Content-Type':'application/json;charset=utf-8'},body:payload,signal:AbortSignal.timeout(9000)});
    if(!reply.ok)throw Error('unavailable');
    const body=await reply.json();
    if(body.code!==0||(body.data?.errno!==undefined&&body.data.errno!==0))throw Error('unconfirmed');
    if(progress.onRecipient)await progress.onRecipient(id);
   }catch{throw Error('serverchan_unconfirmed');}
  }));
  if(results.some(result=>result.status==='rejected'))throw Error('serverchan_unconfirmed');
  return;
 }
 if(channel==='wecom'){
  const parts=textParts(text);for(let i=0;i<parts.length;i++){if(progress.completedParts?.includes(i))continue;const content='问卷 '+data.id+' · '+(i+1)+'/'+parts.length+'\n'+parts[i];response=await fetcher(env.WECOM_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({msgtype:'text',text:{content}}),signal:AbortSignal.timeout(7000)});if(!response.ok)throw Error('wecom_unavailable');const body=await response.json();if(body.errcode!==0)throw Error('wecom_unconfirmed');if(progress.onPart)await progress.onPart(i);}
  return;
 }
 throw Error('channel_invalid');
}
