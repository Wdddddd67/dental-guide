import { cleanIntake, resultSummary } from '../shared/model.mjs';
export const PRIVACY_VERSION='2026-10-29';
export class PublicError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function field(value,max,multiline=false){if(typeof value!=='string'||value.length>max||(!multiline&&/[\r\n\u0000-\u001f\u007f]/.test(value))||(multiline&&/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)))throw new PublicError('填写内容格式有误或超出长度，请修改后重试。');return value.trim();}
export function validateSubmission(data){
 if(!object(data)||typeof data.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id))throw new PublicError('提交编号无效，请刷新页面后重试。');
 if(data.website)throw new PublicError('请求无法处理，请通过网页正常填写。');
 if(!object(data.consent)||data.consent.accepted!==true||data.consent.version!==PRIVACY_VERSION)throw new PublicError('请重新阅读信息用途，并勾选同意。');
 if(!object(data.intake)||!object(data.intake.preferences))throw new PublicError('测试信息不完整，请重新完成测试。');
 let intake;try{intake=cleanIntake(data.intake);}catch{throw new PublicError('测试信息不完整，请重新完成测试。');}
 if(!object(data.respondent))throw new PublicError('问卷格式有误，请重新填写。');
 const respondent={name:field(data.respondent.name,40),contact:field(data.respondent.contact,120),notes:field(data.respondent.notes,1000,true)};
 return {id:data.id.toLowerCase(),intake,respondent,consent:{accepted:true,version:PRIVACY_VERSION}};
}
export function notificationText(data,acceptedAt){const s=resultSummary(data.intake);return ['看牙有谱 · 新的修复需求问卷','回执编号：'+data.id,'提交时间：'+new Date(acceptedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}),'','【测试结果】','修复方向：'+s.repairName,'牙位类别：'+s.regionName,'牙位：'+s.toothIds,...s.questions.map(q=>q.title+' '+q.value),'','【材料偏好排序】',...s.ranking.map((m,i)=>(i+1)+'. '+m.name+' · 匹配度 '+m.match+'%'),'','【自愿补充信息】','称呼：'+(data.respondent.name||'未填写'),'联系方式：'+(data.respondent.contact||'未填写'),'补充需求：'+(data.respondent.notes||'未填写'),'','信息用途已同意；说明版本：'+data.consent.version,'匹配度表示偏好排序，不是临床成功率。',s.note].join('\n');}
