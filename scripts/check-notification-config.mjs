// Validate local setup without printing recipients or any credentials.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { notificationChannels,serverchanRecipients } from '../server/notifications.mjs';

const path=fileURLToPath(new URL('../.dev.vars',import.meta.url));
const local={};
try{
 for(const line of (await readFile(path,'utf8')).split(/\r?\n/)){
  const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if(!match)continue;
  let value=match[2];
  if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
  local[match[1]]=value;
 }
}catch(error){if(error.code!=='ENOENT')throw error;}
const env={...local,...process.env};
const selected=String(env.NOTIFICATION_CHANNELS||'serverchan').split(',').map(c=>c.trim()).filter(Boolean);
const required=['IP_HASH_SALT'];
if(selected.includes('serverchan'))required.push(env.SERVERCHAN_SENDKEYS?.trim()?'SERVERCHAN_SENDKEYS':'SERVERCHAN_SENDKEY');
if(selected.includes('email'))required.push('RESEND_API_KEY','EMAIL_FROM','EMAIL_TO');
if(selected.includes('wecom'))required.push('WECOM_WEBHOOK_URL');
const missing=required.filter(k=>!env[k]||/REPLACE|YOUR_/i.test(env[k]));
const channelValid=!!notificationChannels(env);
console.log(JSON.stringify({channels:selected,missing,channelConfigValid:channelValid,wechatRecipients:selected.includes('serverchan')?(serverchanRecipients(env)?.length||0):0,readyForLocalConfig:missing.length===0&&channelValid,note:'不输出收件人或密钥；这不是实际投递测试，也不代表线上已配置。'},null,2));
if(missing.length||!channelValid)process.exitCode=2;
