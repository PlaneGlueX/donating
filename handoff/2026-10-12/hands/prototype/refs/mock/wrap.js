// Wraps a repo gun module (tools\guns\<id>.js, read only) for the hands mock: adds the hand parts to its spec (hidden,
// out of _full), then walks the item definitions it returns and adds the hand models to every first-person
// composite with a transformation worked out from the gun's own (the body's) and, for the left hand, the part it
// follows at that moment of the reload (the choreography: CHOREO.md).
const path = require('path')
const REPO = 'C:/Users/matti/OneDrive/Desktop/Donating Test Server'
const geo = require('./handsgeo.js')
const D2R = Math.PI / 180
const qAxis = (axis, deg) => { const a = deg * D2R / 2; const n = Math.hypot(...axis) || 1; return [axis[0] / n * Math.sin(a), axis[1] / n * Math.sin(a), axis[2] / n * Math.sin(a), Math.cos(a)] }
const qMul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]
const qRot = (q, v) => { const p = qMul(qMul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]); return [p[0], p[1], p[2]] }
const ID = { t: [0, 0, 0], q: [0, 0, 0, 1] }
const then = (a, b) => ({ t: qRot(b.q, a.t).map((v, i) => v + b.t[i]), q: qMul(b.q, a.q) })
const apply = (m, v) => qRot(m.q, v).map((x, i) => x + m.t[i])
// a placement: turns [[axis, deg], ...] (first listed first), then move to t
const place = (t, rot = []) => { let q = [0, 0, 0, 1]; for (const [ax, d] of rot) q = qMul(qAxis(ax, d), q); return { t, q } }
// the rotation turning +x onto direction d (then a roll about d)
const aim = (d, roll = 0) => {
  const n = Math.hypot(...d); const u = d.map(v => v / n)
  const c = u[0]; const ax = [0, -u[2], u[1]]; const s = Math.hypot(...ax)
  let q = s < 1e-9 ? [0, 0, 0, 1] : qAxis(ax, Math.atan2(s, c) / D2R)
  if (roll) q = qMul(qAxis(u, roll), q)
  return q
}
const round = v => Math.round(v * 10000) / 10000
const toJson = m => ({ translation: m.t.map(v => round(v / 16)), left_rotation: m.q.map(round), scale: [1, 1, 1], right_rotation: [0, 0, 0, 1] })
const fromJson = j => j ? { t: j.translation.map(v => v * 16), q: j.left_rotation } : ID

// choreo: { G: grip top [x,y,z], rake (deg about z), armR: dir, armL: dir, rightOff: p => bool (the right hand off the
//   grip), left: (p, ctx) => null | { follow: part|'gun', at: placement in that part's space, bag } }
module.exports = (id, choreo) => ctx => {
  const orig = require(path.join(REPO, 'tools/guns', id + '.js'))
  const pg = { ...ctx.pg }
  let gunName = null
  pg.pgGun = (name, spec) => {
    gunName = name
    const s = { ...spec, palette: { ...spec.palette, ...geo.palette }, mats: { ...(spec.mats || {}), ...geo.mats }, parts: { ...spec.parts, handR: geo.handR(choreo.grip), armR: geo.arm(20), handL: geo.handL, armL: geo.arm(20) } }
    s.noFull = [...(spec.noFull || []), 'handR', 'armR', 'handL', 'armL']
    s.hidden = [...(spec.hidden || []), 'handR', 'armR', 'handL', 'armL']
    return ctx.pg.pgGun(name, s)
  }
  const defs = orig({ ...ctx, pg })
  const P = `donating:item/${gunName}_`
  const partOf = m => { const r = m.model.slice(P.length); for (const st of ['_ads', '_sprint']) if (r.endsWith(st)) return [r.slice(0, -st.length), st]; return [r, ''] }
  const anchorR = place(choreo.G, [[[0, 0, 1], choreo.rake || 0]])
  const add = (comp, p, isReload, num) => {
    const models = comp.models
    const byPart = {}
    let st = ''
    for (const m of models) { const [part, s] = partOf(m); byPart[part] = fromJson(m.transformation); if (part === 'body') st = s }
    const T_gun = byPart.body || ID
    const out = []
    const hand = (part, T) => out.push({ type: 'minecraft:model', model: P + part + st, transformation: toJson(T) })
    // the right hand on the grip, its sleeve to the lower right
    const rOff = choreo.right ? choreo.right(p, isReload, num) : null
    const T_hr = rOff ? then(rOff, T_gun) : then(anchorR, T_gun)
    if (!(choreo.noRight && st === '_ads')) {
      hand('handR', T_hr)
      hand('armR', { t: apply(T_hr, geo.WRIST_R(choreo.grip)), q: aim(choreo.armR || [0.75, -0.45, -0.5]) })
    }
    const L = choreo.left ? choreo.left(p, isReload, num, byPart) : null
    if (L) {
      const base = L.follow === 'gun' ? T_gun : byPart[L.follow]
      if (base) {
        const T_hl = then(L.at, base)
        hand('handL', T_hl)
        hand('armL', { t: apply(T_hl, geo.WRIST_L), q: aim(L.arm || choreo.armL || [0.7, -0.45, 0.55]) })
      }
    }
    comp.models = models.concat(out)
    const lift = choreo.lift && isReload && p !== null ? choreo.lift(p) : null
    if (lift) for (const m of comp.models) m.transformation = toJson(then(fromJson(m.transformation), lift))
  }
  // walk: p is set inside a cooldown range_dispatch (each entry's p), null elsewhere
  const walk = (node, p, isReload, num) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'minecraft:composite') return add(node, p, isReload, num)
    if (node.type === 'minecraft:range_dispatch' && node.property === 'minecraft:cooldown') {
      const n = node.entries.length
      node.entries.forEach((e, k) => walk(e.model, 1 - (k + 0.5) / n, isReload, num))
      return walk(node.fallback, null, isReload, num)
    }
    for (const k of ['on_true', 'on_false', 'fallback', 'model']) if (node[k]) walk(node[k], p, isReload, num)
    for (const k of ['cases', 'entries']) if (node[k]) node[k].forEach(c => walk(c.model, p, isReload, num))
  }
  for (const [num, def] of Object.entries(defs)) {
    // byContext: cases[0] is first person; the fallback is the static _full model (left alone)
    if (def.type === 'minecraft:select' && def.property === 'minecraft:display_context') walk(def.cases[0].model, null, +num % 1000 === +num % 1000 && Math.floor(+num / 1000) === 3, +num)
  }
  return defs
}
module.exports.util = { place, then, apply, aim, qAxis, ID }
