// Checks every first-person frame of a built gun for the hands' arms: the sleeve's far end (arm-local x = 30) must lie
// off the screen (below the bottom edge, or past a side edge for screens up to 21:9, or behind the camera), so no arm
// ever shows a cut end; and the wrist must not sit behind the camera. Right hand (firstperson_righthand) and left
// hand (firstperson_lefthand) contexts. node verify.js <assets dir> <gun key> <numbers,...>
const fs = require('fs'); const path = require('path')
const { toWorld } = require('./proj.js')
const [dir, key, nums] = process.argv.slice(2)
const A = path.join(dir, 'assets')
const items = JSON.parse(fs.readFileSync(path.join(A, 'minecraft/items/feather.json'), 'utf8'))
const modelJson = id => { const [ns, p] = id.split(':'); return JSON.parse(fs.readFileSync(path.join(A, ns, 'models', p + '.json'), 'utf8')) }
const displayOf = (id, ctx) => { for (let m = modelJson(id); m; m = m.parent && m.parent.startsWith('donating:') ? modelJson(m.parent) : null) if (m.display && m.display[ctx]) return m.display[ctx]; return null }
// every composite with the first-person context(s) that draw it (a display_context select's cases)
const leaves = (m, out = [], ctxs = ['firstperson_righthand', 'firstperson_lefthand']) => {
  if (!m || typeof m !== 'object') return out
  if (m.type === 'minecraft:composite') { out.push([m, ctxs]); return out }
  if (m.type === 'minecraft:select' && m.property === 'minecraft:display_context') { for (const c of m.cases) leaves(c.model, out, ctxs.filter(x => c.when.includes(x))); return out }
  for (const v of Object.values(m)) if (typeof v === 'object') Array.isArray(v) ? v.forEach(x => leaves(x, out, ctxs)) : leaves(v, out, ctxs)
  return out
}
const x0 = v => v
const tan35 = Math.tan(35 * Math.PI / 180)
const ASPECTS = { '4:3': 4 / 3, '16:9': 16 / 9, '21:9': 21 / 9 }
const status = w => {
  if (w[2] > -0.05) return 'behind'
  const sx = w[0] / -w[2]; const sy = w[1] / -w[2]
  if (sy < -tan35) return 'below'
  if (sy > tan35) return 'ABOVE'
  for (const [k, a] of Object.entries(ASPECTS).reverse()) if (Math.abs(sx) <= tan35 * a) return `ON-SCREEN(${k}) sy=${(sy / tan35).toFixed(2)}`
  return 'side'
}
// the narrowest screen shape that shows point w ('' if none: behind the camera or outside up to 21:9)
const vis = w => { if (w[2] > -0.05) return ''; const sx = Math.abs(w[0] / -w[2]); const sy = Math.abs(w[1] / -w[2]); if (sy > tan35) return ''; for (const [k, a] of Object.entries(ASPECTS)) if (sx <= tan35 * a) return k; return '' }
let checked = 0; const bad = []
for (const n of nums.split(',').map(Number)) {
  const e = items.model.entries.find(x => x.threshold === n)
  if (!e) { console.log('no', n); continue }
  const comps = leaves(e.model)
  for (const [ci, [c, ctxs]] of comps.entries()) for (const m of c.models) {
    if (!/hands\/.*_arm/.test(m.model)) continue
    const tr = m.transformation; const local = { t: tr.translation.map(v => v * 16), q: tr.left_rotation }
    for (const [ctx, left] of [['firstperson_righthand', false], ['firstperson_lefthand', true]].filter(([c]) => ctxs.includes(c))) {
      const d = displayOf(m.model, ctx)
      checked++
      // the far end's four corners must be off screen (no cut end), at every aspect up to 21:9
      const ends = [[30, 6, 6], [30, 10, 6], [30, 6, 10], [30, 10, 10]].map(p => vis(toWorld(d, p, local, left)))
      const wrist = toWorld(d, [0, 8, 8], local, left)
      const worst = ends.find(s => s)
      if (worst || wrist[2] > -0.05) bad.push(`${n} #${ci} ${ctx}: end visible at ${worst} wrist z ${wrist[2].toFixed(2)}`)
    }
  }
}
console.log(`${checked} arm placements checked, ${bad.length} with an end on screen`)
for (const b of bad.slice(0, 40)) console.log('  ' + b)
