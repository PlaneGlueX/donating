// The first-person frame in numbers (26.3: FirstPersonHandsAndItemsRenderer.applyItemArmTransform, ItemTransform.apply,
// Camera.calculateHudFov 70, GameRenderer.render3dHud near 0.05). Camera space: x right, y up, -z forward (blocks).
// usage: node compute.js <pack dir> [model...]   (models default: the AK-48's parts)
const fs = require('fs')
const path = require('path')
const dir = process.argv[2]
const ids = process.argv.slice(3).length ? process.argv.slice(3) : ['body', 'fore', 'mag', 'bolt'].map(p => `donating:item/gun_ak47_${p}`)
const RAD = Math.PI / 180
const T35 = Math.tan(35 * RAD)
const ASPECT = 1920 / 1200
const load = id => {
  const [ns, p] = id.includes(':') ? id.split(':') : ['minecraft', id]
  const j = JSON.parse(fs.readFileSync(path.join(dir, 'assets', ns, 'models', p + '.json'), 'utf8'))
  if (j.parent) {
    const par = load(j.parent)
    return { elements: j.elements || par.elements, display: { ...par.display, ...(j.display || {}) } }
  }
  return { elements: j.elements || [], display: j.display || {} }
}
const rotXYZ = ([a, b, c]) => {
  // Quaternionf.rotationXYZ(a, b, c) as a matrix: Rx * Ry * Rz
  const [ca, sa, cb, sb, cc, sc] = [Math.cos(a * RAD), Math.sin(a * RAD), Math.cos(b * RAD), Math.sin(b * RAD), Math.cos(c * RAD), Math.sin(c * RAD)]
  const Rx = [[1, 0, 0], [0, ca, -sa], [0, sa, ca]]
  const Ry = [[cb, 0, sb], [0, 1, 0], [-sb, 0, cb]]
  const Rz = [[cc, -sc, 0], [sc, cc, 0], [0, 0, 1]]
  const mul = (A, B) => A.map((r, i) => B[0].map((_, j) => r.reduce((s, _, k) => s + A[i][k] * B[k][j], 0)))
  return mul(mul(Rx, Ry), Rz)
}
// model pixel -> camera (right hand when left = false)
const toCam = (d, left) => {
  const t = (d.translation || [0, 0, 0]).map(v => Math.max(-80, Math.min(80, v)) / 16)
  const r = d.rotation || [0, 0, 0]
  const s = (d.scale || [1, 1, 1]).map(v => Math.max(-4, Math.min(4, v)))
  const R = rotXYZ([r[0], left ? -r[1] : r[1], left ? -r[2] : r[2]])
  const A = [left ? -0.56 : 0.56, -0.52, -0.72]
  return p => {
    const q = [0, 1, 2].map(i => s[i] * (p[i] / 16 - 0.5))
    return [0, 1, 2].map(i => A[i] + (left ? (i === 0 ? -t[0] : t[i]) : t[i]) + R[i][0] * q[0] + R[i][1] * q[1] + R[i][2] * q[2])
  }
}
const screen = c => [c[0] / (-c[2] * T35 * ASPECT), c[1] / (-c[2] * T35)] // -1..1 each way (1920x1200)
const f = v => v.map(x => x.toFixed(3)).join(', ')
console.log(`hud FOV 70: at depth d the screen spans x +-${(T35 * ASPECT).toFixed(3)}d (16:10), y +-${T35.toFixed(3)}d; near plane 0.05`)
for (const [name, A] of [['right-hand item origin', [0.56, -0.52, -0.72]], ['offhand item origin', [-0.56, -0.52, -0.72]]]) console.log(`${name} (${f(A)}) -> screen (${f(screen(A))})`)
for (const id of ids) {
  const m = load(id)
  const cam = toCam(m.display.firstperson_righthand || {}, false)
  const pts = []
  for (const e of m.elements) for (const x of [e.from[0], e.to[0]]) for (const y of [e.from[1], e.to[1]]) for (const z of [e.from[2], e.to[2]]) pts.push(cam([x, y, z]))
  const lo = [0, 1, 2].map(i => Math.min(...pts.map(p => p[i])))
  const hi = [0, 1, 2].map(i => Math.max(...pts.map(p => p[i])))
  const mid = lo.map((v, i) => (v + hi[i]) / 2)
  const mlo = [0, 1, 2].map(i => Math.min(...m.elements.flatMap(e => [e.from[i], e.to[i]])))
  const mhi = [0, 1, 2].map(i => Math.max(...m.elements.flatMap(e => [e.from[i], e.to[i]])))
  console.log(`${id}: model px [${f(mlo)}]..[${f(mhi)}]  camera [${f(lo)}]..[${f(hi)}]  centre screen (${f(screen(mid))})`)
}
// The bag (tier 1) in the offhand.
const bag = load('donating:item/bag_1_3d')
const bc = toCam(bag.display.firstperson_lefthand || {}, true)
const bp = []
for (const e of bag.elements) for (const x of [e.from[0], e.to[0]]) for (const y of [e.from[1], e.to[1]]) for (const z of [e.from[2], e.to[2]]) bp.push(bc([x, y, z]))
const sp = bp.map(screen)
console.log(`bag_1_3d in the offhand: screen x ${Math.min(...sp.map(p => p[0])).toFixed(2)}..${Math.max(...sp.map(p => p[0])).toFixed(2)}, y ${Math.min(...sp.map(p => p[1])).toFixed(2)}..${Math.max(...sp.map(p => p[1])).toFixed(2)} (-1 = left/bottom edge)`)
// Inverse: a camera point -> AK model pixel (no local transformation), to place hand boxes.
const d = load('donating:item/gun_ak47_base').display.firstperson_righthand
const R = rotXYZ(d.rotation)
const t = d.translation.map(v => v / 16)
const s = d.scale
const inv = c => { const v = [0, 1, 2].map(i => c[i] - [0.56, -0.52, -0.72][i] - t[i]); const q = [0, 1, 2].map(j => R[0][j] * v[0] + R[1][j] * v[1] + R[2][j] * v[2]); return q.map((x, i) => (x / s[i] + 0.5) * 16) }
for (const c of [[-0.2, -0.75, -0.35], [-0.05, -0.32, -0.55], [0.3, -0.75, -0.45], [0.42, -0.42, -0.62]]) console.log(`camera (${f(c)}) screen (${f(screen(c))}) -> AK model px (${f(inv(c))})`)
