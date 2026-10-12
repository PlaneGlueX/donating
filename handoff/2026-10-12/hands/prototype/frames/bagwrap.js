// The bag out of view while a gun reloads (HANDS PROTOTYPE): what build-pack.js / make-item-art.js would wrap round
// each bag's (and the cash stack's) 3D model in leather.json / paper.json. GunFx starts a cooldown on the item's own
// group (minecraft:leather, minecraft:paper: the bag has no use_cooldown component) as long as the reload; the
// first-person contexts read it (minecraft:cooldown: 1 at the start, 0 at the end): the bag dips out over the first
// DIP of the clock, stays out, and comes back over the last DIP. Third person, the ground and the icon never change.
// node bagwrap.js <out dir>  -> bag-def.json (one bag) + renders of the left-hand view at a few clock values
const fs = require('fs'); const path = require('path')
const round = v => Math.round(v * 10000) / 10000
const DIP = 0.1; const N = 6
const pose = k => ({ translation: [round(-0.3 * k), round(-2.6 * k * k), round(0.3 * k)], left_rotation: [round(Math.sin(-25 * k * Math.PI / 360)), 0, 0, round(Math.cos(-25 * k * Math.PI / 360))], scale: [1, 1, 1], right_rotation: [0, 0, 0, 1] })
// k = how far out (0 in place, 1 gone) as a function of v (the share of the clock left)
const bagHide = model => {
  const entries = []
  // v in (0, DIP]: coming back (k from 1 to 0 as v goes to 0); v in (DIP, 1 - DIP): gone; v in [1 - DIP, 1): going
  for (let i = 0; i < N; i++) { const v0 = DIP * i / N; const k = (i + 0.5) / N; entries.push({ threshold: round(v0 + 1e-4), model: { ...model, transformation: pose(k) } }) }
  entries.push({ threshold: round(DIP + 1e-4), model: { type: 'minecraft:empty' } })
  for (let i = 0; i < N; i++) { const v0 = 1 - DIP + DIP * i / N; const k = 1 - (i + 0.5) / N; entries.push({ threshold: round(v0 + 1e-4), model: { ...model, transformation: pose(k) } }) }
  return { type: 'minecraft:select', property: 'minecraft:display_context', cases: [{ when: ['firstperson_lefthand', 'firstperson_righthand'], model: { type: 'minecraft:range_dispatch', property: 'minecraft:cooldown', entries, fallback: model } }], fallback: model }
}
module.exports = { bagHide }
if (require.main === module) {
  const out = process.argv[2]; fs.mkdirSync(out, { recursive: true })
  const def = { model: { type: 'minecraft:select', property: 'minecraft:display_context', cases: [{ when: ['gui'], model: { type: 'minecraft:model', model: 'donating:item/bag_3' } }], fallback: bagHide({ type: 'minecraft:model', model: 'donating:item/bag_3_3d' }) } }
  fs.writeFileSync(path.join(out, 'bag-def.json'), JSON.stringify(def, null, 1))
  const RI = require('./render-item-clip.js'); const { encode } = require('C:/Users/matti/OneDrive/Desktop/Donating Test Server/tools/png.js')
  const vs = [0, 0.99, 0.96, 0.93, 0.5, 0.05]
  const imgs = vs.map(v => RI.decodePng(RI.render('(def)', 'fpl', 480, 270, { def, cooldown: v }).png))
  const w = 480, h = 270, W = 3 * w + 24, H = 2 * h + 18; const px = Buffer.alloc(W * H * 4); for (let i = 0; i < W * H; i++) px.set([30, 30, 34, 255], i * 4)
  imgs.forEach((im, i) => { const ox = 6 + (i % 3) * (w + 6), oy = 6 + Math.floor(i / 3) * (h + 6); for (let y = 0; y < h; y++) im.px.copy(px, ((oy + y) * W + ox) * 4, y * w * 4, (y + 1) * w * 4) })
  fs.writeFileSync(path.join(out, 'bag-dip.png'), encode(W, H, px))
  console.log('clock values:', vs.join(', '))
}
