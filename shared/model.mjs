import { REPAIR_TYPES, questionnaire, emptyPreferences } from './legacy/intake.mjs';
import { TEETH, TOOTH_ZONES } from './legacy/teeth.mjs';
import { emptyDraft, selectedRegion, isIntakeValid, isToothValid, getMissingPreferences } from './legacy/intake-store.mjs';
import { recommendMaterials } from './legacy/catalog.mjs';
import { recommendCrowns } from './legacy/crowns.mjs';
export { REPAIR_TYPES, TEETH, TOOTH_ZONES, emptyDraft, selectedRegion, isIntakeValid, getMissingPreferences, questionnaire };
export const RESIN_NOTE='最终材料选择，需要医生检查牙洞位置、大小评估后确定。';
export const CROWN_NOTE='仅供参考，具体需要医生解释。';
export const referenceNote=d=>d.repairTypeId==='crown'?CROWN_NOTE:RESIN_NOTE;
export function changeRepair(d,id){ if(!REPAIR_TYPES.some(r=>r.id===id))return d;if(d.repairTypeId===id)return d;return {...d,repairTypeId:id,preferences:emptyPreferences(id)}; }
export function toggleTooth(d,id){
 if(!isToothValid(id))return {draft:d,error:'牙位无效，请重新选择。'};
 const ids=new Set(d.toothIds), tooth=TEETH.find(t=>t.id===id), region=selectedRegion(d.toothIds);
 if(!ids.has(id)&&region&&region!==tooth.region)return {draft:d,error:'前牙和后牙不能混选，请先清空已选牙位。'};
 ids.has(id)?ids.delete(id):ids.add(id);
 const next={...d,toothIds:[...ids].sort((a,b)=>a-b),preferences:{...d.preferences}};
 const nextRegion=selectedRegion(next.toothIds);
 if(d.repairTypeId!=='crown'&&next.preferences.region!==nextRegion){next.preferences.requirement=0;next.preferences.region=nextRegion;}
 return {draft:next,error:''};
}
export function clearTeeth(d){return {...d,toothIds:[],preferences:d.repairTypeId==='crown'?{...d.preferences}:{...d.preferences,requirement:0,region:''}};}
export function recommendations(d){if(!isIntakeValid(d))return [];return d.repairTypeId==='crown'?recommendCrowns(d.preferences.hardness,d.preferences.aesthetics):recommendMaterials(selectedRegion(d.toothIds),d.preferences.smokeCoffee,d.preferences.requirement);}
export function cleanIntake(d){if(!isIntakeValid(d))throw Error('请先完成测试。');return {version:3,repairTypeId:d.repairTypeId,toothIds:[...d.toothIds].sort((a,b)=>a-b),preferences:d.repairTypeId==='crown'?{hardness:d.preferences.hardness,aesthetics:d.preferences.aesthetics}:{smokeCoffee:d.preferences.smokeCoffee,requirement:d.preferences.requirement,region:selectedRegion(d.toothIds)}};}
export function resultSummary(d){const repair=REPAIR_TYPES.find(r=>r.id===d.repairTypeId);return {repairName:repair?.name||'',regionName:selectedRegion(d.toothIds)==='anterior'?'前牙区':'后牙区',toothIds:d.toothIds.join('、'),questions:questionnaire(d.repairTypeId,selectedRegion(d.toothIds)).map(q=>({title:q.title,value:q.type==='score'?d.preferences[q.id]+'/6':d.preferences[q.id]==='yes'?'是':'否'})),ranking:recommendations(d).map(m=>({id:m.id,name:m.name,match:m.match})),note:referenceNote(d)};}
