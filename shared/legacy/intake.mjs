const REPAIR_TYPES = [
  { id: 'caries', name: '龋齿修复', english: 'CARIES RESTORATION', description: '了解牙齿龋损相关的修复项目', image: './assets/images/resin-filling.png' },
  { id: 'crown', name: '牙冠修复', english: 'CROWN RESTORATION', description: '了解牙冠覆盖与修复相关项目', image: './assets/images/restoration.png' },
  { id: 'inlay', name: '嵌体修复', english: 'INLAY RESTORATION', description: '了解嵌体修复相关项目', image: './assets/images/implant.png' }
]

const EXPOSURE_QUESTION = { id: 'smokeCoffee', title: '您是否抽烟或喝咖啡？', options: [{id:'yes',label:'是'},{id:'no',label:'否'}] }
const REQUIREMENT_LEVELS = [1,2,3,4,5,6]
function requirementQuestion(region) { return {id:'requirement', title: region === 'posterior' ? '您的硬度要求是？' : '您的美观要求是？', description: '1 分要求较低，6 分要求较高'} }
function questionnaire(repairTypeId, region) {
  if (repairTypeId === 'crown') return [
    { id:'hardness', type:'score', title:'您的硬度要求是？', description:'1 分要求较低，6 分要求较高' },
    { id:'aesthetics', type:'score', title:'您的美观要求是？', description:'1 分要求较低，6 分要求较高' }
  ]
  return [{ ...EXPOSURE_QUESTION, type:'choice' }, { ...requirementQuestion(region), type:'score' }]
}
function emptyPreferences(repairTypeId) {
  return repairTypeId === 'crown' ? { hardness:0, aesthetics:0 } : { smokeCoffee:'', requirement:0, region:'' }
}
export { REPAIR_TYPES, EXPOSURE_QUESTION, REQUIREMENT_LEVELS, requirementQuestion, questionnaire, emptyPreferences }
