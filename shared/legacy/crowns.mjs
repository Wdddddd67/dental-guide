const CROWN_REFERENCE_NOTE = '仅供参考，具体需要医生解释。'
// Photos and product names were supplied by the project owner. Descriptions stay
// neutral until model-specific product information is supplied and confirmed.
const CROWN_LIST = [
  { id:'aierchuang', name:'爱尔创', image:'./assets/images/crowns/aierchuang.jpg', summary:'爱尔创牙冠方案，具体材质与适用情况请由医生解释。' },
  { id:'wieland', name:'威兰德', image:'./assets/images/crowns/wieland.jpg', summary:'威兰德牙冠方案，可向医生了解具体型号与修复特点。' },
  { id:'cercon', name:'泽康', image:'./assets/images/crowns/cercon.jpg', summary:'泽康牙冠方案，具体色泽与修复设计请由医生说明。' },
  { id:'lava', name:'LAVA', image:'./assets/images/crowns/lava.jpg', summary:'LAVA 牙冠方案，可向医生了解材料与外观设计。' },
  { id:'titanium', name:'钛合金一体冠', image:'./assets/images/crowns/titanium.jpg', summary:'钛合金一体冠方案，材料组成与适用情况需医生解释。' }
].map(item=>({ ...item, shortName:item.name, fullName:item.name+' · 牙冠修复', introduction:item.summary+'本页仅按您填写的硬度与美观要求展示材料参考顺序。具体产品型号、材料特点及修复方案，需要接诊医生结合检查结果说明。', tags:['牙冠修复','硬度与美观'] }))

// Key order: hardness, then aesthetics. These are preference ranks, not clinical probabilities.
const CROWN_ORDERS = {
  'low-low':['aierchuang','wieland','cercon','lava','titanium'],
  'high-low':['wieland','aierchuang','cercon','lava','titanium'],
  'low-high':['wieland','cercon','aierchuang','lava','titanium'],
  'high-high':['lava','cercon','wieland','aierchuang','titanium']
}
function recommendCrowns(hardness,aesthetics) {
  if(![hardness,aesthetics].every(score=>Number.isInteger(score)&&score>=1&&score<=6))return []
  const key=(hardness>=4?'high':'low')+'-'+(aesthetics>=4?'high':'low')
  return CROWN_ORDERS[key].map((id,index)=>({ ...CROWN_LIST.find(item=>item.id===id), rank:index+1, match:90-index*10 }))
}
export { CROWN_LIST, CROWN_REFERENCE_NOTE, recommendCrowns }
