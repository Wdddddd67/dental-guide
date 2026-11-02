// Preview by default. --send explicitly delivers one fictional integration test.
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { deliver, notificationChannels } from '../server/notifications.mjs';
import { notificationText, validateSubmission, PRIVACY_VERSION } from '../server/validation.mjs';

const send=process.argv.includes('--send');
if(process.argv.slice(2).some(arg=>arg!=='--send')){
 console.error('仅支持 --send；不带参数时只预览，不发送。');
 process.exit(2);
}
const acceptedAt=new Date().toISOString();
const data=validateSubmission({
 id:randomUUID(),
 intake:{version:3,repairTypeId:'crown',toothIds:[11],preferences:{hardness:6,aesthetics:6}},
 respondent:{name:'上线联调测试（虚构）',contact:'',notes:'这是项目负责人主动发起的接收通道测试，全部为虚构信息，不是患者问卷。'},
 consent:{accepted:true,version:PRIVACY_VERSION}
});
if(!send){
 console.log('仅预览：不会发送消息，也不会检查或显示私有密钥。\n');
 console.log(notificationText(data,acceptedAt));
 process.exit(0);
}
try{
 const local={};
 for(const line of (await readFile(new URL('../.dev.vars',import.meta.url),'utf8')).split(/\r?\n/)){
  const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if(!match)continue;
  let value=match[2];
  if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
  local[match[1]]=value;
 }
 const env={...local,...process.env};
 if(!notificationChannels({...env,NOTIFICATION_CHANNELS:'serverchan'}))throw Error('not_configured');
 await deliver('serverchan',data,acceptedAt,env);
 console.log(JSON.stringify({providerAccepted:true,receiptId:data.id,fictionalDataOnly:true,workerTested:false,note:'Server酱接口已确认，请本人核对微信是否实际收到。这不等同于网页提交链路已经开通。'},null,2));
}catch{
 console.error('未取得测试通知确认。请检查本地SendKey、接收通道及网络；不自动重试，以免重复通知。');
 process.exitCode=1;
}
