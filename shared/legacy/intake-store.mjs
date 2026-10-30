import { REPAIR_TYPES, questionnaire, emptyPreferences } from './intake.mjs'
import { TEETH, TOOTH_ZONES } from './teeth.mjs'
const STORAGE_KEY = 'dentalGuide:lastMaterialIntake'
const VERSION = 3
function emptyDraft() { return {version:VERSION,repairTypeId:'',toothIds:[],preferences:emptyPreferences('')} }
function resetDraft(app) { app.globalData.intakeDraft=emptyDraft(); return app.globalData.intakeDraft }
function getDraft(app) { const d=app.globalData.intakeDraft; return !d || d.version!==VERSION || !Array.isArray(d.toothIds) || !d.preferences || typeof d.preferences!=='object' ? resetDraft(app) : d }
function isRepairValid(id) { return REPAIR_TYPES.some(item=>item.id===id) }
function isToothValid(id) { return Number.isInteger(id) && TEETH.some(t=>t.id===id) }
function selectedRegion(ids) {
  if (!Array.isArray(ids) || !ids.length || !ids.every(isToothValid)) return ''
  const regions=new Set(ids.map(id=>TEETH.find(t=>t.id===id).region))
  return regions.size===1 ? Array.from(regions)[0] : ''
}
function isPreferenceValid(id,value) { return id==='smokeCoffee' ? ['yes','no'].includes(value) : ['requirement','hardness','aesthetics'].includes(id) && Number.isInteger(value) && value>=1 && value<=6 }
function getMissingPreferences(preferences,region,repairTypeId='caries') {
  const p=preferences||{}
  return questionnaire(repairTypeId,region).filter(q=>!isPreferenceValid(q.id,p[q.id]) || (q.id==='requirement' && p.region!==region))
}
function isIntakeValid(d) { const region=d&&selectedRegion(d.toothIds); return !!region && d.version===VERSION && isRepairValid(d.repairTypeId) && d.toothIds.length<=32 && new Set(d.toothIds).size===d.toothIds.length && getMissingPreferences(d.preferences,region,d.repairTypeId).length===0 }
function copyIntake(d) { return {version:VERSION,repairTypeId:d.repairTypeId,toothIds:d.toothIds.slice().sort((a,b)=>a-b),preferences:d.repairTypeId==='crown'?{hardness:d.preferences.hardness,aesthetics:d.preferences.aesthetics}:{smokeCoffee:d.preferences.smokeCoffee,requirement:d.preferences.requirement,region:d.preferences.region}} }
function saveIntake(api,app) {
  const d=getDraft(app)
  if(!isIntakeValid(d)) throw new TypeError('请先完成牙位及两道需求问题')
  const result={...copyIntake(d),submittedAt:Date.now()}; app.globalData.lastIntake=result
  try { api.setStorageSync(STORAGE_KEY,result); return {result,saved:true} } catch(e) { return {result,saved:false} }
}
function readLastIntake(api,app) {
  const valid=d=>isIntakeValid(d) && Number.isFinite(d.submittedAt) && d.submittedAt>0
  if(valid(app.globalData.lastIntake)) return copyIntake(app.globalData.lastIntake)
  try { const d=api.getStorageSync(STORAGE_KEY); if(!valid(d)) return null; app.globalData.lastIntake={...copyIntake(d),submittedAt:d.submittedAt}; return copyIntake(d) } catch(e) { return null }
}
function toothViewState(ids,zoneId) {
  const selected=new Set(ids.filter(isToothValid))
  const zones=TOOTH_ZONES.map(z=>({...z,selectedCount:z.rows.reduce((n,r)=>n+r.teeth.filter(t=>selected.has(t.id)).length,0),rows:z.rows.map(r=>({...r,teeth:r.teeth.map(t=>({...t,selected:selected.has(t.id)}))}))}))
  const active=zones.find(z=>z.id===zoneId)||zones[1]
  return {zones,activeZoneId:active.id,activeZoneName:active.name,activeTeeth:active.rows.reduce((a,r)=>a.concat(r.teeth),[]),selectedRegion:selectedRegion(Array.from(selected)),selectedRegionName:selectedRegion(Array.from(selected))==='anterior'?'前牙区':selected.size?'后牙区':'',selectedCount:selected.size,selectedTeeth:TEETH.filter(t=>selected.has(t.id)).map(t=>({id:t.id,name:t.name})).sort((a,b)=>a.id-b.id)}
}
export {STORAGE_KEY,VERSION,emptyDraft,resetDraft,getDraft,isRepairValid,isToothValid,selectedRegion,isPreferenceValid,getMissingPreferences,isIntakeValid,saveIntake,readLastIntake,toothViewState}
