// FDI permanent dentition; patient right is shown on the left, as in the supplied chart.
const TOOTH_NAMES = ['中切牙', '侧切牙', '尖牙', '第一前磨牙', '第二前磨牙', '第一磨牙', '第二磨牙', '第三磨牙']
const QUADRANTS = [
  { id: 'upper-right', name: '右上牙区', shortName: '右上', prefix: 1, jaw: 'upper', positions: [8, 7, 6, 5, 4, 3, 2, 1] },
  { id: 'upper-left', name: '左上牙区', shortName: '左上', prefix: 2, jaw: 'upper', positions: [1, 2, 3, 4, 5, 6, 7, 8] },
  { id: 'lower-right', name: '右下牙区', shortName: '右下', prefix: 4, jaw: 'lower', positions: [8, 7, 6, 5, 4, 3, 2, 1] },
  { id: 'lower-left', name: '左下牙区', shortName: '左下', prefix: 3, jaw: 'lower', positions: [1, 2, 3, 4, 5, 6, 7, 8] }
].map(quadrant => ({ ...quadrant, teeth: quadrant.positions.map(position => {
  const family = position <= 2 ? 'incisor' : position === 3 ? 'canine' : position <= 5 ? 'premolar' : 'molar'
  return { id: quadrant.prefix * 10 + position, quadrantId: quadrant.id, jaw: quadrant.jaw,
    name: quadrant.shortName + TOOTH_NAMES[position - 1], family, region: position <= 3 ? 'anterior' : 'posterior',
    zoneId: position <= 3 ? 'anterior' : [1, 4].includes(quadrant.prefix) ? 'posterior-right' : 'posterior-left',
    image: './assets/teeth/' + family + '.png', selectedImage: './assets/teeth/' + family + '-selected.png' }
}) }))
const TEETH = QUADRANTS.reduce((all, quadrant) => all.concat(quadrant.teeth), [])
const byId = id => TEETH.find(tooth => tooth.id === id)
const TOOTH_ZONES = [
  { id: 'posterior-right', name: '右侧后牙区', label: '后牙区', side: '你的右侧', region: 'posterior', rows: [[18,17,16,15,14],[48,47,46,45,44]] },
  { id: 'anterior', name: '前牙区', label: '前牙区', side: '中间区域', region: 'anterior', rows: [[13,12,11,21,22,23],[43,42,41,31,32,33]] },
  { id: 'posterior-left', name: '左侧后牙区', label: '后牙区', side: '你的左侧', region: 'posterior', rows: [[24,25,26,27,28],[34,35,36,37,38]] }
].map(zone => ({...zone, rows: zone.rows.map((ids,index) => ({id: index ? 'lower' : 'upper', teeth: ids.map(byId)}))}))
export { QUADRANTS, TEETH, TOOTH_ZONES }
