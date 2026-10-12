// node coplanar.js <assets dir> <gun> [parts...]: faces of two elements (unrotated) on the same plane, facing the same
// way, overlapping with a positive area: they z-fight in the client (the house rule: stagger them a hair).
const fs = require('fs'); const path = require('path')
const [dir, gun, ...partsArg] = process.argv.slice(2)
const parts = partsArg.length ? partsArg : ['body', 'spin', 'mag', 'stock']
const els = []
for (const p of parts) {
  const f = path.join(dir, `assets/donating/models/item/gun_${gun}_${p}.json`)
  if (!fs.existsSync(f)) continue
  JSON.parse(fs.readFileSync(f)).elements.forEach((e, i) => els.push({ p, i, e }))
}
const AX = { west: 0, east: 0, down: 1, up: 1, north: 2, south: 2 }
const SIGN = { west: -1, east: 1, down: -1, up: 1, north: -1, south: 1 }
const hits = []
for (let a = 0; a < els.length; a++) for (let b = a + 1; b < els.length; b++) {
  const A = els[a].e; const B = els[b].e
  if (A.rotation || B.rotation) continue
  for (const dirn of Object.keys(AX)) {
    if (!A.faces[dirn] || !B.faces[dirn]) continue
    const k = AX[dirn]; const s = SIGN[dirn]
    const pa = s > 0 ? A.to[k] : A.from[k]; const pb = s > 0 ? B.to[k] : B.from[k]
    if (Math.abs(pa - pb) > 1e-4) continue
    const o = [0, 1, 2].filter(i => i !== k)
    const ov = o.map(i => Math.min(A.to[i], B.to[i]) - Math.max(A.from[i], B.from[i]))
    if (ov[0] > 1e-4 && ov[1] > 1e-4) hits.push(`${els[a].p}#${els[a].i} & ${els[b].p}#${els[b].i} ${dirn} at ${'xyz'[k]}=${pa} overlap ${ov.map(v => v.toFixed(2)).join('x')}`)
  }
}
console.log(`${gun}: ${hits.length} coplanar overlapping face pairs`)
hits.forEach(h => console.log('  ' + h))
