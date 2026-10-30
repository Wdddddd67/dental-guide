import { notificationText } from './validation.mjs';
export function notificationChannels(env){const channels=String(env.NOTIFICATION_CHANNELS||'email').split(',').map(s=>s.trim()).filter(Boolean);if(!channels.length||channels.some(c=>!['email','wecom'].includes(c)))return null;if(channels.includes('email')&&(!env.RESEND_API_KEY||!env.EMAIL_FROM||!env.EMAIL_TO))return null;if(channels.includes('wecom')){try{const u=new URL(env.WECOM_WEBHOOK_URL);if(u.protocol!=='https:'||u.hostname!=='qyapi.weixin.qq.com'||u.pathname!=='/cgi-bin/webhook/send'||!u.searchParams.get('key'))return null;}catch{return null;}}return [...new Set(channels)];}
export function textParts(text,maxBytes=1700){const encoder=new TextEncoder(),parts=[];let part='',size=0;for(const c of text){const n=encoder.encode(c).length;if(size+n>maxBytes){parts.push(part);part='';size=0;}part+=c;size+=n;}if(part)parts.push(part);return parts;}
export async function deliver(channel,data,acceptedAt,env,fetcher=fetch,progress={}){const text=notificationText(data,acceptedAt);let response;
 if(channel==='email'){response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'dental-'+data.id},body:JSON.stringify({from:env.EMAIL_FROM,to:[env.EMAIL_TO],subject:'看牙有谱 · 新的修复需求问卷',text}),signal:AbortSignal.timeout(9000)});if(!response.ok)throw Error('email_unavailable');const body=await response.json();if(typeof body.id!=='string'||!body.id)throw Error('email_unconfirmed');return;}
 if(channel==='wecom'){
  const parts=textParts(text);for(let i=0;i<parts.length;i++){if(progress.completedParts?.includes(i))continue;const content='问卷 '+data.id+' · '+(i+1)+'/'+parts.length+'\n'+parts[i];response=await fetcher(env.WECOM_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({msgtype:'text',text:{content}}),signal:AbortSignal.timeout(7000)});if(!response.ok)throw Error('wecom_unavailable');const body=await response.json();if(body.errcode!==0)throw Error('wecom_unconfirmed');if(progress.onPart)await progress.onPart(i);}
  return;
 }
 throw Error('channel_invalid');
}
