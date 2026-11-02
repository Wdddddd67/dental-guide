// Project-owner copy supplied on 2026-11-02. Preserve wording and punctuation.
// Presentation content is separate from the original recommendation rules.
export const MATERIAL_COPY = {
  p60: {
    features: ['填料含量高，耐磨、抗咬合力、聚合收缩低，硬度强'],
    suitableFor: '后牙大龋洞、咬合受力大的位置，经常咬硬物人群'
  },
  z350: {
    features: ['纳米填料，色号多，抛光好，强度与美观均衡，门诊基础通用款'],
    suitableFor: '前后牙中小龋洞，日常补牙，兼顾美观+强度，性价比高'
  },
  shofu: {
    features: ['S-PRG填料，可以持续释放氟，预防继发蛀牙；变色龙效应，颜色随口腔环境微调，抛光优秀'],
    suitableFor: '牙颈部楔缺、容易蛀牙的患者、前牙常规修复'
  },
  ivoclar: {
    features: ['瓷化填料，抛光持久，不容易染色，低收缩，色泽稳定'],
    suitableFor: '前牙、对美观有要求，担心后期发黄染色的患者，前后牙通用'
  },
  ena: {
    features: ['分牙本质色+牙釉质色分层堆塑，乳光、荧光效果高度仿真天然牙，高填料，耐磨性接近牙釉质，边缘隐形。不含Bis-GMA，生物相容性好'],
    suitableFor: '前牙大面积缺损、门牙崩角、贴面直接修复，高美学需求',
    tagline: '一句话：美学天花板，追求补牙看不出痕迹选这款。'
  },
  aierchuang: {
    strength: '最高900MPa',
    features: [
      '国产头部品牌，性价比高，价格友好，门诊主推基础款',
      '分层渐变瓷块玉瓷TT透光率最高可达49%，前牙美学款色彩自然',
      '强度足够，支持单冠、长桥、种植上部修复，适配绝大多数前后牙病例',
      '国内加工配套成熟，调改、返工更方便，正品可查防伪'
    ],
    suitableFor: '预算中等、后牙修复、根管牙保护、简单前牙美学'
  },
  wieland: {
    strength: '约1100MPa',
    features: [
      '强度+美学均衡型，进口里面综合平衡最好的一款，临床使用年限长（15年+）',
      '梯度透光设计：颈部不透、切端高透，复刻天然牙颜色过渡',
      '边缘密合度高（误差＜20微米），减少食物嵌塞，生物相容性好，无牙龈黑线',
      '备牙量偏小，可做单冠、多单位连桥、种植冠，前后牙通吃'
    ],
    suitableFor: '大多数单冠、前牙美学、后牙咀嚼、种植修复、中等偏高预算患者'
  },
  cercon: {
    strength: '最高1300MPa，四款里面强度最高',
    features: [
      '抗老化强，长期使用强度衰减慢，磨牙症、咬合力量大的患者优选',
      '氧化锆纯度高，封闭防伪系统，官网验真，假货少',
      '可做到0.3mm超薄壁厚，备牙更少，保留更多自体牙体；支持长桥修复'
    ],
    suitableFor: '重度咬合、夜磨牙、后牙大咬合力、多单位桥体'
  },
  lava: {
    strength: '1100~1200MPa',
    features: [
      '美学天花板，自带荧光效果，自然光下和天然牙光学高度接近，高端前牙首选',
      '分层氧化锆，色彩层次细腻，遮色能力强，适合死髓变色牙',
      '材料稳定性好，密合精度高，全口重建复杂修复常用'
    ],
    suitableFor: '前牙高端美学、门牙种植冠、对美观要求极高、变色基牙'
  }
};

export function withMaterialCopy(material) {
  const copy = MATERIAL_COPY[material.id];
  return copy ? { ...material, ...copy, summary: copy.features.join('；') } : material;
}
