// Writes the scooter and skateboard models (2026-11-10, owner: "low level scooters and skateboards outside the prison"):
// plain block-textured boxes (straight: no rotated elements) in the frame of MTVehicles' motorbike (nose to -x, centred on z 8, the same display), so
// MTVehicles' armor-stand head and the parked bikes' item displays (bikes.sk) show them like the bike.
// Usage: tools\node\node.exe tools\make-small-rides.js, then tools\build-pack.js.
const fs = require('fs')
const path = require('path')
const out = path.join(__dirname, '..', 'pack', 'assets', 'minecraft', 'models', 'custom', 'donating')

// The motorbike's display (motor_blue.json): same size and placement on the armor stand's head.
const display = {
  thirdperson_righthand: { scale: [0.0001, 0.0001, 0.0001] },
  thirdperson_lefthand: { scale: [0.0001, 0.0001, 0.0001] },
  firstperson_righthand: { rotation: [0, 32, 0], translation: [0.6956, 4.1738, 0], scale: [0.25, 0.25, 0.25] },
  firstperson_lefthand: { rotation: [0, 32, 0], translation: [0.6956, 4.1738, 0], scale: [0.25, 0.25, 0.25] },
  gui: { rotation: [30, 125, 0], translation: [0.1, 0.1, 0], scale: [0.9, 0.9, 0.9] },
  head: { rotation: [-2.5, -90, 0], translation: [0, -26.5, -14.99], scale: [2.3, 2.3, 2.3] },
  ground: { translation: [0, 5, 0] },
  fixed: { rotation: [-12, -39, 9], translation: [3.4782, -1.13, 0.6956], scale: [0.9, 0.9, 0.9] }
}

// A box with one texture on every face (or per face: { up: 'grip', ... }), UVs from its own size.
function box (from, to, tex, rot) {
  const faces = {}
  const size = { x: to[0] - from[0], y: to[1] - from[1], z: to[2] - from[2] }
  const uv = { north: [size.x, size.y], south: [size.x, size.y], east: [size.z, size.y], west: [size.z, size.y], up: [size.x, size.z], down: [size.x, size.z] }
  for (const f of Object.keys(uv)) {
    const t = typeof tex === 'string' ? tex : (tex[f] || tex.side)
    faces[f] = { uv: [0, 0, Math.min(16, uv[f][0]), Math.min(16, uv[f][1])], texture: `#${t}` }
  }
  const e = { from, to, faces }
  if (rot) e.rotation = rot
  return e
}

// About 18 model units to a block (the motorbike is 38 long): a scooter 1.2 m, a skateboard 0.8 m.
const scooter = {
  textures: { particle: 'block/light_blue_concrete', deck: 'block/light_blue_concrete', grip: 'block/black_concrete', metal: 'block/iron_block', tyre: 'block/black_concrete', rim: 'block/light_gray_concrete' },
  display,
  elements: [
    box([-1, 3, 5.5], [19, 4.5, 10.5], { up: 'grip', side: 'deck' }), // deck
    box([-2.5, 3, 6.5], [-1, 4.5, 9.5], 'deck'), // neck to the stem
    box([-4, 2.5, 7.25], [-2.5, 24, 8.75], 'metal'), // stem and fork
    box([-6, 0, 7], [-1, 5, 9], { north: 'rim', south: 'rim', side: 'tyre' }), // front wheel
    box([15, 0, 7], [20, 5, 9], { north: 'rim', south: 'rim', side: 'tyre' }), // rear wheel
    box([15, 5, 6.5], [20.5, 6, 9.5], 'deck'), // rear fender
    box([-4, 22.5, 1.5], [-2.5, 24, 14.5], 'metal'), // handlebar
    box([-4.25, 22.25, 0.5], [-2.25, 24.25, 3], 'grip'), // grips
    box([-4.25, 22.25, 13], [-2.25, 24.25, 15.5], 'grip')
  ]
}

const skateboard = {
  textures: { particle: 'block/stripped_dark_oak_log', wood: 'block/stripped_dark_oak_log', grip: 'block/black_concrete', truck: 'block/iron_block', wheel: 'block/white_concrete' },
  display,
  elements: [
    box([0, 2, 5], [16, 3, 11], { up: 'grip', side: 'wood' }), // deck
    box([-3, 2.5, 5.5], [0, 3.5, 10.5], { up: 'grip', side: 'wood' }), // nose kick (a step up: no rotated boxes)
    box([16, 2.5, 5.5], [19, 3.5, 10.5], { up: 'grip', side: 'wood' }), // tail kick
    box([2, 1.25, 6], [4, 2, 10], 'truck'), // trucks
    box([12, 1.25, 6], [14, 2, 10], 'truck'),
    box([1.75, 0, 4.25], [4.25, 1.5, 6], 'wheel'), // wheels
    box([1.75, 0, 10], [4.25, 1.5, 11.75], 'wheel'),
    box([11.75, 0, 4.25], [14.25, 1.5, 6], 'wheel'),
    box([11.75, 0, 10], [14.25, 1.5, 11.75], 'wheel')
  ]
}

fs.mkdirSync(out, { recursive: true })
for (const [name, m] of Object.entries({ scooter, skateboard })) {
  for (const e of m.elements) for (const i of [0, 1, 2]) if (e.from[i] < -16 || e.to[i] > 32 || e.from[i] >= e.to[i]) throw new Error(`${name}: bad box ${e.from} ${e.to}`)
  fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(m, null, 1) + '\n')
  console.log(`${name}: ${m.elements.length} boxes`)
}
