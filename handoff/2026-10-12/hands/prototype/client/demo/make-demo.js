// Writes demo models (stand-in arms that inherit the AK-48's display) into the unpacked pack copy, and the item
// definitions the proof renders use. Everything stays under this demo folder.
// usage: node make-demo.js <demo dir>
const fs = require('fs')
const path = require('path')
const D = process.argv[2]
const P = path.join(D, 'pack')
const RAD = Math.PI / 180
const put = (rel, obj) => { const f = path.join(P, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(obj, null, 1)) }
const putDef = (name, obj) => fs.writeFileSync(path.join(D, name), JSON.stringify(obj, null, 1))
const box = (from, to, tex) => ({ from, to, faces: Object.fromEntries(['north', 'south', 'east', 'west', 'up', 'down'].map(f => [f, { uv: [0, 0, 16, 16], texture: tex }])) })
// An arm along +x from 0: a glove (0..g) and a sleeve (g..len), w wide. Parent = the AK's base (its display).
const arm = (len, g, w) => ({
  parent: 'donating:item/gun_ak47_base',
  textures: { glove: 'minecraft:block/brown_terracotta', sleeve: 'minecraft:block/blue_concrete', particle: 'minecraft:block/blue_concrete' },
  elements: [box([0, -w * 0.85, -w * 0.85], [g, w * 0.85, w * 0.85], '#glove'), box([g, -w, -w], [len, w, w], '#sleeve')]
})
put('assets/donating/models/item/demo_arm_left.json', arm(24, 4, 1.9))
put('assets/donating/models/item/demo_arm_right.json', arm(16, 4, 1.9))

// The AK's first-person frame, inverted: camera point -> AK model px (as compute.js).
const d = JSON.parse(fs.readFileSync(path.join(P, 'assets/donating/models/item/gun_ak47_base.json'), 'utf8')).display.firstperson_righthand
const rot = ([a, b, c]) => {
  const [ca, sa, cb, sb, cc, sc] = [Math.cos(a * RAD), Math.sin(a * RAD), Math.cos(b * RAD), Math.sin(b * RAD), Math.cos(c * RAD), Math.sin(c * RAD)]
  const mul = (A, B) => A.map((r, i) => B[0].map((_, j) => r.reduce((s, _, k) => s + A[i][k] * B[k][j], 0)))
  return mul(mul([[1, 0, 0], [0, ca, -sa], [0, sa, ca]], [[cb, 0, sb], [0, 1, 0], [-sb, 0, cb]]), [[cc, -sc, 0], [sc, cc, 0], [0, 0, 1]])
}
const R = rot(d.rotation)
const inv = c => { const v = [0, 1, 2].map(i => c[i] - [0.56, -0.52, -0.72][i] - d.translation[i] / 16); const q = [0, 1, 2].map(j => R[0][j] * v[0] + R[1][j] * v[1] + R[2][j] * v[2]); return q.map((x, i) => (x / d.scale[i] + 0.5) * 16) }
// A transformation (in the gun model's blocks) that puts the arm's x axis from `handPx` towards `elbowPx`.
const place = (handPx, elbowPx) => {
  const v = elbowPx.map((x, i) => x - handPx[i])
  const n = Math.hypot(...v)
  const u = v.map(x => x / n)
  const ax = [0, -u[2], u[1]]
  const an = Math.hypot(...ax)
  const ang = Math.acos(Math.max(-1, Math.min(1, u[0])))
  const s = Math.sin(ang / 2)
  const q = an < 1e-9 ? [0, 0, 0, 1] : [ax[0] / an * s, ax[1] / an * s, ax[2] / an * s, Math.cos(ang / 2)]
  return { translation: handPx.map(x => x / 16), left_rotation: q, scale: [1, 1, 1], right_rotation: [0, 0, 0, 1], len: n }
}
const leftT = place([2, 4.6, 8], inv([-0.2, -0.75, -0.35]))
const rightT = place([19.5, 1.5, 8], inv([0.42, -0.95, -0.42]))
console.log('left arm length px', leftT.len.toFixed(1), 'elbow px', inv([-0.2, -0.75, -0.35]).map(x => x.toFixed(1)).join(','))
console.log('right arm length px', rightT.len.toFixed(1), 'elbow px', inv([0.42, -0.95, -0.42]).map(x => x.toFixed(1)).join(','))
delete leftT.len
delete rightT.len

const FP = ['firstperson_righthand', 'firstperson_lefthand']
const ak = { type: 'minecraft:model', model: 'donating:item/gun_ak47_full' }
// Hands only in the first-person contexts; every other context draws the gun alone.
putDef('def-hands.json', {
  model: {
    type: 'minecraft:select', property: 'minecraft:display_context',
    cases: [{ when: FP, model: { type: 'minecraft:composite', models: [ak,
      { type: 'minecraft:model', model: 'donating:item/demo_arm_left', transformation: leftT },
      { type: 'minecraft:model', model: 'donating:item/demo_arm_right', transformation: rightT }] } }],
    fallback: ak
  }
})
putDef('def-ak.json', { model: ak })
// The bag rule: in first person, nothing while the bag's cooldown group (minecraft:leather) runs; a short drop at
// the start (share left 1 -> 0.9) and a rise at the end (0.08 -> 0), in steps the client reads once a tick.
const bag3d = { type: 'minecraft:model', model: 'donating:item/bag_1_3d' }
const down = dy => ({ type: 'minecraft:model', model: 'donating:item/bag_1_3d', transformation: { translation: [0, dy, 0], left_rotation: [0, 0, 0, 1], scale: [1, 1, 1], right_rotation: [0, 0, 0, 1] } })
putDef('def-bag.json', {
  model: {
    type: 'minecraft:select', property: 'minecraft:display_context',
    cases: [
      { when: ['gui'], model: { type: 'minecraft:model', model: 'donating:item/bag_1' } },
      { when: FP, model: { type: 'minecraft:range_dispatch', property: 'minecraft:cooldown', entries: [
        { threshold: 0.0001, model: down(-0.6) }, { threshold: 0.04, model: down(-1.4) }, { threshold: 0.08, model: { type: 'minecraft:empty' } },
        { threshold: 0.92, model: down(-1.4) }, { threshold: 0.96, model: down(-0.6) }], fallback: bag3d } }],
    fallback: bag3d
  }
})
console.log('wrote demo models and defs')
