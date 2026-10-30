const MATERIALS = {
  p60: { id:'p60', shortName:'P60', name:'3M P60', fullName:'3M P60 后牙修复树脂', summary:'高填料，注重耐磨与抗咬合力，侧重后牙受力修复。', introduction:'后牙修复树脂，特点为较高的填料含量，关注耐磨性、抗咬合力及聚合收缩。可作为后牙龋洞与受力部位修复时的材料了解方向。', tags:['后牙修复','耐磨','受力部位'] },
  z350: { id:'z350', shortName:'Z350', name:'3M Z350 XT', fullName:'3M Z350 XT 通用纳米树脂', summary:'纳米填料，色号丰富，兼顾抛光、美观与强度。', introduction:'前后牙通用的纳米填料树脂，具有多种色号与透明度选择，可用于常规修复中兼顾外观与强度的材料了解。', tags:['前后牙通用','纳米填料','美观与强度'] },
  shofu: { id:'shofu', shortName:'松风', name:'松风 Beautifil II', fullName:'松风 Beautifil II 含氟修复树脂', summary:'S-PRG 填料，具有氟释放特性，兼顾色泽融合与抛光。', introduction:'采用 S-PRG 填料的修复材料，具有氟释放和再充填特性，并关注色泽融合、荧光及表面抛光。可作为常规前后牙修复时的材料了解方向。', tags:['S-PRG 填料','氟释放特性','色泽融合'] },
  ivoclar: { id:'ivoclar', shortName:'义获嘉', name:'义获嘉 Tetric N-Ceram', fullName:'义获嘉 Tetric N-Ceram 通用修复树脂', summary:'通用纳米混合树脂，关注自然色泽、抛光与低收缩。', introduction:'适用于前后牙修复的通用纳米混合树脂，关注自然色泽融合、表面抛光与较低的聚合收缩。可用于兼顾外观和日常修复需求的材料了解。', tags:['前后牙通用','自然色泽','表面抛光'] },
  ena: { id:'ena', shortName:'美塑', name:'美塑 ENA HRi', fullName:'意大利美塑 ENA HRi 美学修复树脂', summary:'牙本质色与牙釉质色分层，注重天然牙色泽与光学表现。', introduction:'采用牙本质色与牙釉质色分层修复的美学树脂系统，关注天然牙的色泽、透明度和光学表现。可作为前牙缺损、崩角及直接美学修复时的材料了解方向。', tags:['分层美学','前牙修复','天然牙色泽'] }
}
const MATERIAL_LIST = Object.values(MATERIALS).map(item=>({...item,image:'./assets/images/resins/'+item.id+'-v1.jpg'}))
const CONSULTATION = { displayName:'看牙咨询', wechatId:'AAAAAAA', isPlaceholder:true }
// User-specified preference ordering; percentages indicate rank, not clinical success probability.
const ORDERS = {
  anterior: {
    'yes-high':['ena','ivoclar','shofu','z350','p60'],
    'yes-low':['ivoclar','z350','shofu','ena','p60'],
    'no-high':['ivoclar','shofu','z350','ena','p60'],
    'no-low':['shofu','z350','ivoclar','ena','p60']
  },
  posterior: {
    'yes-low':['shofu','p60','z350','ivoclar','ena'],
    'yes-high':['p60','shofu','z350','ivoclar','ena'],
    'no-high':['p60','shofu','z350','ivoclar','ena'],
    'no-low':['shofu','z350','p60','ivoclar','ena']
  }
}
function recommendMaterials(region, smokeCoffee, requirement) {
  if (!ORDERS[region] || !['yes','no'].includes(smokeCoffee) || !Number.isInteger(requirement) || requirement<1 || requirement>6) return []
  return ORDERS[region][smokeCoffee+'-'+(requirement>=4?'high':'low')].map((id,index)=>({...MATERIAL_LIST.find(item=>item.id===id),rank:index+1,match:90-index*10}))
}


export { MATERIAL_LIST, CONSULTATION, recommendMaterials }
