// First-person projection like tools\render-item.js (fp: 70° vertical FOV, the arm offset (0.56, -0.52, -0.72),
// firstperson_righthand, then the per-model transformation). Model units in, screen pixels out (W x H).
const RAD = Math.PI / 180
const rx3 = d => { const c = Math.cos(d * RAD); const s = Math.sin(d * RAD); return [[1, 0, 0], [0, c, -s], [0, s, c]] }
const ry3 = d => { const c = Math.cos(d * RAD); const s = Math.sin(d * RAD); return [[c, 0, s], [0, 1, 0], [-s, 0, c]] }
const rz3 = d => { const c = Math.cos(d * RAD); const s = Math.sin(d * RAD); return [[c, -s, 0], [s, c, 0], [0, 0, 1]] }
const mul3 = (a, b) => a.map(r => [0, 1, 2].map(j => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j]))
const app3 = (m, v) => m.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2])
const rotXYZ = r => mul3(mul3(rx3(r[0] || 0), ry3(r[1] || 0)), rz3(r[2] || 0))
// world = arm + R(rot) * S * ((p/16) - 0.5) + tr ; local: a rig { t, q } in model units applied first.
const qRot = (q, v) => { const [x, y, z, w] = q; const ix = w * v[0] + y * v[2] - z * v[1]; const iy = w * v[1] + z * v[0] - x * v[2]; const iz = w * v[2] + x * v[1] - y * v[0]; const iw = -x * v[0] - y * v[1] - z * v[2]; return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x] }
const toWorld = (disp, p, local, left = false) => {
  if (local) p = qRot(local.q, p).map((v, i) => v + local.t[i])
  const tr = disp.translation.map(v => Math.max(-80, Math.min(80, v)) / 16)
  const ro = disp.rotation; const sc = disp.scale
  const R = rotXYZ([ro[0], left ? -ro[1] : ro[1], left ? -ro[2] : ro[2]])
  const q = app3(R, [(p[0] / 16 - 0.5) * sc[0], (p[1] / 16 - 0.5) * sc[1], (p[2] / 16 - 0.5) * sc[2]])
  return [(left ? -0.56 : 0.56) + (left ? -tr[0] : tr[0]) + q[0], -0.52 + tr[1] + q[1], -0.72 + tr[2] + q[2]]
}
const screen = (w, W = 960, H = 540) => { const k = 1 / Math.tan(35 * RAD) * H / 2; return w[2] > -0.05 ? null : [Math.round(W / 2 + w[0] / -w[2] * k), Math.round(H / 2 - w[1] / -w[2] * k), +(-w[2]).toFixed(3)] }
// The camera (world origin) in model space, and model directions of screen down / right.
const inverse = (disp) => {
  const ro = disp.rotation; const sc = disp.scale; const tr = disp.translation.map(v => v / 16)
  const R = rotXYZ(ro); const Rt = R[0].map((_, i) => R.map(r => r[i]))
  const d = [0 - 0.56 - tr[0], 0 + 0.52 - tr[1], 0 + 0.72 - tr[2]]
  const q = app3(Rt, d)
  return q.map((v, i) => (v / sc[i] + 0.5) * 16)
}
module.exports = { toWorld, screen, inverse }
if (require.main === module) {
  const disp = JSON.parse(process.argv[2]); const pts = JSON.parse(process.argv[3])
  console.log('camera in model space', inverse(disp).map(v => v.toFixed(2)).join(', '))
  for (const p of pts) console.log(JSON.stringify(p), '->', JSON.stringify(screen(toWorld(disp, p))))
}
