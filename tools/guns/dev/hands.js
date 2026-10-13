// Checks the first-person hands of built guns (tools\guns\pg.js spec.hands; handoff/2026-10-12/hands/PLAN.md):
//   - every arm's far end (the sleeve's end, arm-local x = 30) lies off the screen in every first-person composite, in
//     the contexts that draw it (right hand, left hand), at every screen shape from 4:3 to 21:9 (70 degrees high, the
//     client's HUD projection): an arm never shows a cut end;
//   - every wrist is in front of the camera (near plane 0.05);
//   - aimed (Scope, +1000), no glove or arm corner is in the middle of the screen (the sight picture);
//   - no hand model outside the first-person contexts (third person, the ground, item frames, the icon).
// node tools/guns/dev/hands.js [gun,...] [--kit pg.js] [--mod <gun>=<module.js>]   (default: every gun with hands)
// Exit code 1 when anything fails.
const path = require('path')
const { build, GUNS, TOOLS } = require('./harness.js')
const args = process.argv.slice(2)
const opt = k => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v }
const kit = path.resolve(opt('--kit') || path.join(TOOLS, 'guns', 'pg.js'))
const modules = {}
for (let m; (m = opt('--mod'));) { const [g, f] = m.split('='); modules[g] = path.resolve(f) }
const NUM = { gs50: 9, uzi: 1, r90: 14, ak47: 5, rev: 8, tommy: 15, m16: 7, sniper: 13, lmg: 11, minigun: 6 }
const want = args[0] ? args[0].split(',') : [...GUNS, 'minigun']
// the harness writes the models to disk: a scratch dir, removed at the end
const os = require('os'); const fs = require('fs')
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'hands-'))
const { results } = build({ kit, out, guns: want, skins: false, modules })
const modelJson = id => { const [ns, p] = id.split(':'); return JSON.parse(fs.readFileSync(path.join(out, 'assets', ns, 'models', p + '.json'), 'utf8')) }
const displayOf = (id, ctx) => {
  for (let m = modelJson(id); m; m = m.parent && m.parent.startsWith('donating:') ? modelJson(m.parent) : null) {
    if (m.display && m.display[ctx]) return m.display[ctx]
    if (m.display && ctx === 'firstperson_lefthand' && m.display.firstperson_righthand) return m.display.firstperson_righthand // the deserializer's copy
  }
  return null
}
// the projection (render-item.js's itemMatrix + applyItemArmTransform)
const RAD = Math.PI / 180
const rx3 = d => { const c = Math.cos(d * RAD); const s = Math.sin(d * RAD); return [[1, 0, 0], [0, c, -s], [0, s, c]] }
const ry3 = d => { const c = Math.cos(d * RAD); const s = Math.sin(d * RAD); return [[c, 0, s], [0, 1, 0], [-s, 0, c]] }
const rz3 = d => { const c = Math.cos(d * RAD); const s = Math.sin(d * RAD); return [[c, -s, 0], [s, c, 0], [0, 0, 1]] }
const mul3 = (a, b) => a.map(r => [0, 1, 2].map(j => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j]))
const app3 = (m, v) => m.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2])
const qRot = (q, v) => { const [x, y, z, w] = q; const ix = w * v[0] + y * v[2] - z * v[1]; const iy = w * v[1] + z * v[0] - x * v[2]; const iz = w * v[2] + x * v[1] - y * v[0]; const iw = -x * v[0] - y * v[1] - z * v[2]; return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x] }
const toWorld = (d, p, local, left) => {
  if (local) p = qRot(local.q, p.map((v, i) => v * local.s[i])).map((v, i) => v + local.t[i]) // a transformation: scale, turn, move
  const tr = (d.translation || [0, 0, 0]).map(v => Math.max(-80, Math.min(80, v)) / 16)
  const ro = d.rotation || [0, 0, 0]; const sc = d.scale || [1, 1, 1]
  const R = mul3(mul3(rx3(ro[0]), ry3(left ? -ro[1] : ro[1])), rz3(left ? -ro[2] : ro[2]))
  const q = app3(R, [(p[0] / 16 - 0.5) * sc[0], (p[1] / 16 - 0.5) * sc[1], (p[2] / 16 - 0.5) * sc[2]])
  return [(left ? -0.56 : 0.56) + (left ? -tr[0] : tr[0]) + q[0], -0.52 + tr[1] + q[1], -0.72 + tr[2] + q[2]]
}
const T35 = Math.tan(35 * RAD)
const ASPECTS = { '4:3': 4 / 3, '16:9': 16 / 9, '21:9': 21 / 9 }
// the narrowest screen shape that shows camera-space point w ('' for none)
const vis = w => { if (w[2] > -0.05) return ''; const sx = Math.abs(w[0] / -w[2]); const sy = Math.abs(w[1] / -w[2]); if (sy > T35) return ''; for (const [k, a] of Object.entries(ASPECTS)) if (sx <= T35 * a) return k; return '' }
const central = w => w[2] < -0.05 && Math.abs(w[0] / -w[2]) < T35 * 0.4 && Math.abs(w[1] / -w[2]) < T35 * 0.4
// every composite under a tree with the display contexts that draw it (all of them, so a hand outside first person in
// any context is caught, not only in a select's fallback)
const FP = ['firstperson_righthand', 'firstperson_lefthand']
const ALL = ['none', 'thirdperson_lefthand', 'thirdperson_righthand', 'firstperson_lefthand', 'firstperson_righthand', 'head', 'gui', 'ground', 'fixed', 'on_shelf']
const leaves = (m, out, ctxs) => {
  if (!m || typeof m !== 'object') return out
  if (m.type === 'minecraft:composite') { out.push([m, ctxs]); return out }
  if (m.type === 'minecraft:select' && m.property === 'minecraft:display_context') {
    for (const c of m.cases) leaves(c.model, out, ctxs.filter(x => [].concat(c.when).includes(x)))
    leaves(m.fallback, out, ctxs.filter(x => !m.cases.some(c => [].concat(c.when).includes(x))))
    return out
  }
  for (const v of Object.values(m)) if (typeof v === 'object') Array.isArray(v) ? v.forEach(x => leaves(x, out, ctxs)) : leaves(v, out, ctxs)
  return out
}
const BOX = [[0, 0, 0], [16, 0, 0], [0, 16, 0], [0, 0, 16], [16, 16, 0], [16, 0, 16], [0, 16, 16], [16, 16, 16]]
const cornersOf = id => { const m = modelJson(id); let e = m.elements; for (let p = m; !e && p && p.parent; p = modelJson(p.parent)) e = p.elements; return (e || []).flatMap(el => BOX.map(b => b.map((v, i) => v ? el.to[i] : el.from[i]))) }
let bad = 0; let total = 0
for (const g of want) {
  const defs = results[g]
  if (!defs) continue
  let arms = 0; const fails = []; let hasHands = false
  for (const [n, def] of Object.entries(defs)) {
    for (const [c, ctxs] of leaves(def, [], ALL)) {
      for (const m of c.models) {
        if (!/^donating:item\/hands\//.test(m.model)) continue
        hasHands = true
        if (ctxs.some(x => !FP.includes(x))) { fails.push(`${n}: ${m.model} outside first person (${ctxs.filter(x => !FP.includes(x)).join(', ')})`); continue }
        const local = m.transformation ? { t: m.transformation.translation.map(v => v * 16), q: m.transformation.left_rotation, s: m.transformation.scale || [1, 1, 1] } : null
        for (const ctx of ctxs.filter(x => FP.includes(x))) {
          const left = ctx === 'firstperson_lefthand'
          const d = displayOf(m.model, ctx)
          if (/_arm(_|$)/.test(m.model)) {
            arms++
            const end = [[30, 6, 6], [30, 10, 6], [30, 6, 10], [30, 10, 10]].map(p => vis(toWorld(d, p, local, left))).find(s => s)
            const wrist = toWorld(d, [0, 8, 8], local, left)
            if (end) fails.push(`${n} ${ctx}: an arm's end shows at ${end}`)
            if (wrist[2] > -0.05) fails.push(`${n} ${ctx}: a wrist behind the camera`)
          }
          if (+n >= 1000 && +n < 2000 && !left && cornersOf(m.model).some(p => central(toWorld(d, p, local, left)))) fails.push(`${n}: ${m.model} in the sight picture`)
        }
      }
    }
  }
  total += arms
  if (!hasHands) { console.log(`${g}: no hands`); continue }
  bad += fails.length
  console.log(`${g}: ${arms} arm placements, ${fails.length} problems`)
  for (const f of [...new Set(fails)].slice(0, 12)) console.log('  ' + f)
}
fs.rmSync(out, { recursive: true, force: true })
console.log(`${total} arm placements checked, ${bad} problems`)
process.exitCode = bad ? 1 : 0
