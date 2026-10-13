// For each gun's first-person display: where sample hand/elbow points (camera space) land in the gun's model pixels,
// to see whether arms fit the -16..32 element box without a scaling transformation. usage: node reach.js <pack dir>
const fs = require('fs')
const path = require('path')
const P = process.argv[2]
const RAD = Math.PI / 180
const rot = ([a, b, c]) => {
  const [ca, sa, cb, sb, cc, sc] = [Math.cos(a * RAD), Math.sin(a * RAD), Math.cos(b * RAD), Math.sin(b * RAD), Math.cos(c * RAD), Math.sin(c * RAD)]
  const mul = (A, B) => A.map((r, i) => B[0].map((_, j) => r.reduce((s, _, k) => s + A[i][k] * B[k][j], 0)))
  return mul(mul([[1, 0, 0], [0, ca, -sa], [0, sa, ca]], [[cb, 0, sb], [0, 1, 0], [-sb, 0, cb]]), [[cc, -sc, 0], [sc, cc, 0], [0, 0, 1]])
}
const pts = {
  'left elbow, off-screen bottom-centre (-0.20,-0.75,-0.35)': [-0.2, -0.75, -0.35],
  'left elbow, off-screen bottom-left (-0.45,-0.70,-0.40)': [-0.45, -0.7, -0.4],
  'right elbow, off-screen bottom-right (0.42,-0.95,-0.42)': [0.42, -0.95, -0.42],
  'bag spot (offhand origin) (-0.56,-0.52,-0.72)': [-0.56, -0.52, -0.72]
}
const keys = ['gs50', 'rev', 'uzi', 'tommy', 'r90', 'm16', 'ak47', 'sniper', 'lmg', 'minigun']
for (const k of keys) {
  const f = path.join(P, 'assets/donating/models/item', `gun_${k}_base.json`)
  if (!fs.existsSync(f)) { console.log(`${k}: no gun_${k}_base.json in this pack`); continue }
  const d = JSON.parse(fs.readFileSync(f, 'utf8')).display.firstperson_righthand
  const R = rot(d.rotation || [0, 0, 0])
  const t = (d.translation || [0, 0, 0]).map(v => Math.max(-80, Math.min(80, v)) / 16)
  const s = d.scale || [1, 1, 1]
  const inv = c => { const v = [0, 1, 2].map(i => c[i] - [0.56, -0.52, -0.72][i] - t[i]); const q = [0, 1, 2].map(j => R[0][j] * v[0] + R[1][j] * v[1] + R[2][j] * v[2]); return q.map((x, i) => (x / s[i] + 0.5) * 16) }
  const lines = Object.entries(pts).map(([n, c]) => { const p = inv(c); const ok = p.every(v => v >= -16 && v <= 32); return `   ${ok ? 'fits' : 'OUT '} ${n} -> px (${p.map(v => v.toFixed(1)).join(', ')})` })
  console.log(`${k}: display scale ${s[0]}, rotation [${d.rotation}], translation [${d.translation}]  (1 model px = ${(s[0] / 16).toFixed(4)} blocks)`)
  console.log(lines.join('\n'))
}
