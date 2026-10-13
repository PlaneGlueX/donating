// Checks the spin part's sweep against the static parts: for every spin box, its max radius from the axis (AY, AZ);
// for every static box overlapping it in x, the nearest distance from the axis to that box (y-z rectangle). A static box
// closer than the sweep radius (and not containing the axis region, i.e. a housing) is a collision while spinning.
const fs = require('fs'); const path = require('path')
const A = (process.argv[2] || 'p5') + '-assets/assets/donating/models/item/'
const AY = 8.6, AZ = 8.0
const els = p => JSON.parse(fs.readFileSync(A + 'gun_minigun_' + p + '.json')).elements
const spin = els('spin'); const stat = [...els('body'), ...els('mag'), ...els('stock')]
const rmax = e => { let r = 0; for (const y of [e.from[1], e.to[1]]) for (const z of [e.from[2], e.to[2]]) r = Math.max(r, Math.hypot(y - AY, z - AZ)); return r }
const rmin = e => { const dy = Math.max(e.from[1] - AY, 0, AY - e.to[1]); const dz = Math.max(e.from[2] - AZ, 0, AZ - e.to[2]); return Math.hypot(dy, dz) }
let bad = 0
for (const s of spin) for (const b of stat) {
  if (b.rotation) continue
  const ox = Math.min(s.to[0], b.to[0]) - Math.max(s.from[0], b.from[0]); if (ox <= 0) continue
  const R = rmax(s); const d = rmin(b)
  const housing = d === 0 // the axis passes through it: the cluster's end inside the rotor housing
  if (!housing && d < R) { bad++; console.log('HIT spin', JSON.stringify([s.from, s.to]), 'r', R.toFixed(2), 'static', JSON.stringify([b.from, b.to]), 'd', d.toFixed(2)) }
}
console.log('spin boxes', spin.length, 'max r', Math.max(...spin.map(rmax)).toFixed(2), 'collisions', bad)
const tex = require('../style/lib.js').load((process.argv[2] || 'p5') + '-tex.png'); console.log('texture', tex.w, 'x', tex.h)
