// Jailbreak prison, module M1 (jail-spec sections 3, 7.3 and 10): the perimeter and everything outdoors.
// Brick walls W1..W7, chain-link fences F1..F7 (plus the annex south fence, F4 and the inner vehicle gate fence), the
// 15 watchtowers (8 in brick walls, 7 lattice towers in fence lines), the front gate with its booth (a reader and a fuse
// box: ESCAPE-SPEC 3.1-11), the closed back gate, the roads, the parking lot, the service lane, the yard (field, goals,
// bleachers, workout pads, paths, scoreboard, floodlights), the plaza and walkway, the picnic annex with the parkour
// crates, the water tower, manholes, lamps, trees and grass.
// The escape rework (ESCAPE-SPEC, 2026-10-14): F6 is one fence (no RELEASE gap), the back gate is closed and the easy
// route is gone. The paste is sparse, so everything removed is set explicitly (air, grass or the surface underneath).
// Every block goes through S(), which writes only inside M1's region (spec 2.1); later parts overwrite earlier ones
// (towers last: tower bases win over every surface).
// ---- COMMON (jail-spec 1.7, copy verbatim) ----
const h = (x, y, z) => (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 100
const pick = (x, y, z, mix) => { const v = h(x, y, z); let a = 0; for (const [s, p] of mix) { a += p; if (v < a) return s } return mix[mix.length - 1][0] }
const MIX = {
  white: [['white_concrete', 70], ['smooth_quartz', 20], ['calcite', 10]],
  brick: [['bricks', 85], ['polished_granite', 8], ['terracotta', 7]],
  asphalt: [['black_concrete', 75], ['black_concrete_powder', 15], ['gray_concrete_powder', 10]],
  darkstone: [['blackstone', 40], ['cobbled_deepslate', 35], ['polished_basalt', 25]],
  navy: [['blue_terracotta', 80], ['blue_concrete', 20]]
}
// true if column (x,z) is inside or on the main building's outer face
const inMain = (x, z) => {
  if (x < 41 || x > 142 || z < 45 || z > 245) return false
  if (x > 128) return z >= x - 55 && z <= 127 + Math.floor((142 - x) * 3 / 7)       // the east bulge, both chamfers
  if (x >= 111 && z > 356 - x) return false                                          // SE chamfer (128,228)-(111,245)
  if (x <= 87 && z > 219 + Math.floor((x - 41) * 26 / 46)) return false              // SW chamfer (41,219)-(87,245)
  return true
}
const ring = (inside, x, z, t) => { if (!inside(x, z)) return false                  // t-thick outer wall ring of a footprint
  for (let dx = -t; dx <= t; dx++) for (let dz = -t; dz <= t; dz++) if (!inside(x + dx, z + dz)) return true; return false }
const inUpper = (x, z) => inMain(x, z) && x >= 58 && z <= 192 && (z <= 133 || x <= 122)   // the 3-storey block
// both halves of a door; y = the lower half. Iron doors can't be opened by hand.
const door = (b, x, y, z, facing, hinge = 'left', open = false, block = 'iron_door') => {
  b.set(x, y, z, `${block}[facing=${facing},half=lower,hinge=${hinge},open=${open},powered=false]`)
  b.set(x, y + 1, z, `${block}[facing=${facing},half=upper,hinge=${hinge},open=${open},powered=false]`) }
// both parts of a bed; (x,y,z) = the head, the foot is one block opposite to facing. Beds are decoration only.
const bed = (b, color, x, y, z, facing) => {
  const d = { north: [0, 1], south: [0, -1], east: [-1, 0], west: [1, 0] }[facing]
  b.set(x, y, z, `${color}_bed[facing=${facing},part=head,occupied=false]`)
  b.set(x + d[0], y, z + d[1], `${color}_bed[facing=${facing},part=foot,occupied=false]`) }
// a diagonal line rasterized 4-connected (an extra cell wherever x and z both change), for fences and bars
const line4 = (x1, z1, x2, z2, fn) => { const n = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1)); let px = null, pz = null
  for (let i = 0; i <= n; i++) { const x = Math.round(x1 + (x2 - x1) * i / n), z = Math.round(z1 + (z2 - z1) * i / n)
    if (px !== null && x !== px && z !== pz) fn(x, pz); fn(x, z); px = x; pz = z } }
// ---- end COMMON ----
void ring; void inUpper; void bed // COMMON helpers M1 doesn't need

// ---------------------------------------------------------------------------------------------------------------------
// M1's region (2.1): x -40..480, z -30..470, y 62..130, minus the M5 boxes, the main building polygon and its 1-block
// apron (except the cells of W2 and W3 and F6's end post), and M3's EXIT box.
const M5 = [[63, -6, 254, 42], [182, 43, 254, 68], [182, 69, 238, 80], [118, 275, 162, 322], [193, 283, 338, 345], [289, 237, 334, 262]]
const apronMemo = new Map()
const inApron = (x, z) => {
  const k = `${x},${z}`
  let v = apronMemo.get(k)
  if (v === undefined) {
    v = false
    if (!inMain(x, z)) for (let dx = -1; dx <= 1 && !v; dx++) for (let dz = -1; dz <= 1; dz++) if (inMain(x + dx, z + dz)) { v = true; break }
    apronMemo.set(k, v)
  }
  return v
}
const inW23 = (x, z) => (x >= 8 && x <= 40 && z >= 72 && z <= 74) || (x >= 129 && x <= 181 && z >= 71 && z <= 73)
const own = (x, y, z) => {
  if (y < 62 || y > 130 || x < -40 || x > 480 || z < -30 || z > 470) return false
  for (const r of M5) if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) return false
  if (x >= 304 && x <= 347 && z >= 398 && z <= 415) return false // the bike shop's box (bikeshop.js, town PLAN 15.3)
  if (x >= -7 && x <= -3 && z >= 82 && z <= 86) return false
  if (inMain(x, z)) return false
  if (inApron(x, z)) return (inW23(x, z) && y <= 78) || (x === 88 && z === 246)
  return true
}

// ---------------------------------------------------------------------------------------------------------------------
// Geometry shared by the build and by the labels (pure).
const DIR = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }
const OPP = { north: 'south', south: 'north', east: 'west', west: 'east' }
// [name, x, z, kind, spotlight lens faces, wall-tower door [face, offset along the face], cab doorway]
const TOWERS = [
  ['T1', 8, 73, 'wall', 'east', ['east', 2], 'south'],
  ['T2', 172, 72, 'wall', 'south', ['south', 0], 'west'],
  ['T3', 261, 72, 'wall', 'south', ['south', 0], 'east'],
  ['T4', 279, 113, 'wall', 'west', ['west', 0], 'north'],
  ['T5', 279, 171, 'wall', 'west', ['west', 0], 'south'],
  ['T6', 279, 235, 'wall', 'west', ['west', 0], 'north'],
  ['T7', 381, 235, 'wall', 'west', ['south', -2], 'south'],
  ['T8', 381, 272, 'wall', 'west', ['west', 0], 'north'],
  ['T9', 381, 347, 'lattice', 'west', null, 'north'],
  ['T10', 381, 396, 'lattice', 'north', null, 'west'],
  ['T11', 296, 396, 'lattice', 'north', null, 'east'],
  ['T12', 248, 396, 'lattice', 'north', null, 'west'],
  ['T13', 110, 396, 'lattice', 'north', null, 'east'],
  ['T14', 110, 292, 'lattice', 'north', null, 'east'],
  ['T15', 75, 292, 'lattice', 'east', null, 'north']
]
const inBase = (x, z) => TOWERS.some(t => Math.abs(x - t[1]) <= 4 && Math.abs(z - t[2]) <= 4)
const inDeck = (x, z) => TOWERS.some(t => Math.abs(x - t[1]) <= 6 && Math.abs(z - t[2]) <= 6)

// Brick walls: [x1, z1, x2, z2, axis, centre] (3 thick = centre ±1). W4 runs to x 280 to close the W4/W5 corner.
const WALLS = [
  [7, 73, 9, 213, 'z', 8], [8, 72, 40, 74, 'x', 73], [129, 71, 181, 73, 'x', 72], [239, 71, 280, 73, 'x', 72],
  [278, 72, 280, 235, 'z', 279], [279, 234, 381, 236, 'x', 235], [380, 235, 382, 347, 'z', 381]
]
const BAND = new Map() // "x,z" -> { centre }
for (const [x1, z1, x2, z2, ax, c] of WALLS) for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) {
  const k = `${x},${z}`, centre = ax === 'z' ? x === c : z === c
  BAND.set(k, { centre: centre || (BAND.get(k) || {}).centre || false })
}
const inBand = (x, z) => BAND.has(`${x},${z}`)

// Chain-link fences: ordered cells, the outward side (outriggers lean away from the yard), a closed gate's index range.
const axisCells = (x1, z1, x2, z2) => { const c = []; for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) c.push([x, z]); return c }
const lineCells = (x1, z1, x2, z2) => { const c = []; line4(x1, z1, x2, z2, (x, z) => c.push([x, z])); return c }
const F6ALL = lineCells(88, 246, 106, 288)
const FENCES = [
  { name: 'F1', cells: axisCells(381, 352, 381, 391), out: [1, 0] },
  { name: 'F2 west', cells: axisCells(115, 396, 243, 396), out: [0, 1] },
  { name: 'F2 east', cells: axisCells(301, 396, 376, 396), out: [0, 1] },
  { name: 'F3', cells: axisCells(110, 297, 110, 391), out: [-1, 0] },
  { name: 'F4', cells: axisCells(115, 292, 117, 292), out: [0, 1] },
  { name: 'F5', cells: lineCells(9, 214, 71, 289).filter(([x, z]) => !inBase(x, z)), out: [-1, 1] },
  { name: 'F6', cells: F6ALL.filter(([x, z]) => !inBase(x, z)), out: [-1, 0] }, // one fence: the RELEASE gap is closed
  // F7's punch gate spans the whole gap between the Gun Shop and the police station (owner, 2026-10-21: "as wide as the
  // gap between the Gun Shop and the police station"): z 260..284, posts at z 259 and 285.
  { name: 'F7', cells: axisCells(339, 237, 339, 349), out: [1, 0], gate: [23, 47] },
  { name: 'annex south', cells: axisCells(340, 349, 376, 349), out: [0, 1] },
  { name: 'inner gate', cells: axisCells(163, 322, 192, 322), out: [0, 1], gate: [7, 23] }
]
// The HIGH VOLTAGE plates are gone (owner, 2026-10-21: "remove the yellow high-voltage blocks"); the fences shock on
// contact instead (prison.sk). Every fence cell but the gates goes to jailpoints.sk ({-jailfence::<x>|<z>} = its mesh's
// axis, x / z / c for both, with "p" for a post): [x, z, axis, post].
const fenceCells = () => FENCES.flatMap(f => {
  const n = f.cells.length, out = []
  f.cells.forEach(([x, z], i) => {
    if (f.gate && i >= f.gate[0] && i <= f.gate[1]) return
    const nb = [f.cells[i - 1], f.cells[i + 1]].filter(Boolean)
    const ax = nb.some(c => c[0] !== x) ? (nb.some(c => c[1] !== z) ? 'c' : 'x') : 'z'
    const post = i % 4 === 0 || i === n - 1 || (f.gate && (i === f.gate[0] - 1 || i === f.gate[1] + 1))
    out.push([x, z, ax, post])
  })
  return out
})

// The old easy-escape route (7.3), removed by unroute(). The route and its 2-block margin are kept: greenery and the
// pilasters stay off ROUTE_NEAR, so their output doesn't change.
const ROUTE = [[130.5, 197.5], [140.5, 197.5], [140.5, 255.5], [101.5, 255.5], [96.5, 265.5], [92.5, 292.5], [92.5, 418.5]]
const segDist = (px, pz, a, b) => {
  const vx = b[0] - a[0], vz = b[1] - a[1], L2 = vx * vx + vz * vz
  const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / L2))
  return Math.hypot(px - a[0] - t * vx, pz - a[1] - t * vz)
}
const routeDist = (x, z) => { let d = Infinity; for (let i = 1; i < ROUTE.length; i++) d = Math.min(d, segDist(x + 0.5, z + 0.5, ROUTE[i - 1], ROUTE[i])); return d }
const ROUTE_CELLS = new Set()
const ROUTE_NEAR = new Set() // the route and 2 blocks either side: nothing tall goes there
for (let x = 84; x <= 146; x++) for (let z = 192; z <= 422; z++) {
  const d = routeDist(x, z)
  if (d <= 2.5) ROUTE_CELLS.add(`${x},${z}`)
  if (d <= 4.5) ROUTE_NEAR.add(`${x},${z}`)
}
// EXIT signs at the turns: [post x, z, the face the label is on, text]
const SIGNS = [[145, 197, 'west', 'EXIT →'], [140, 260, 'north', 'EXIT →'], [97, 254, 'east', 'EXIT ←'], [91, 264, 'east', 'EXIT ←']]

// ---------------------------------------------------------------------------------------------------------------------
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, s) }
const G = (x, y, z) => B.get(x, y, z)
const D = (x, y, z) => { if (own(x, y, z)) B.blocks.delete(`${x},${y},${z}`) }
const rect = (x1, z1, x2, z2, fn) => { for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) fn(x, z) }
const asphalt = (x, z) => S(x, 64, z, pick(x, 64, z, MIX.asphalt))
const white = (x, z) => S(x, 64, z, 'white_concrete')
const joint = (x, z) => S(x, 64, z, (x % 6 === 0 || z % 6 === 0) ? 'smooth_stone' : 'light_gray_concrete') // concrete with smooth_stone joints
const PAD = [['lime_concrete_powder', 70], ['grass_block', 30]]
const PANEL = [['blackstone', 45], ['cobbled_deepslate', 35], ['deepslate_tiles', 20]] // darker than MIX.darkstone, for the tower panels

// ---- lamps, manholes, trees -------------------------------------------------------------------------------------------
// Lamp post (3.4): a polished_blackstone_wall pole y 65..71 and a 3-lamp head of ochre_froglight (y 72) under
// polished_blackstone_slab (y 73).
function lamp (x, z, axis = 'x') {
  for (let y = 65; y <= 71; y++) S(x, y, z, 'polished_blackstone_wall')
  for (let k = -1; k <= 1; k++) {
    const lx = axis === 'x' ? x + k : x, lz = axis === 'x' ? z : z + k
    S(lx, 72, lz, 'ochre_froglight[axis=y]')
    S(lx, 73, lz, 'polished_blackstone_slab[type=bottom]')
  }
}
// Manhole: an iron trapdoor cover, ringed by polished_andesite, with a smooth_stone rim.
function manhole (x, z) {
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    const r = Math.max(Math.abs(dx), Math.abs(dz))
    if (r === 2 && Math.abs(dx) + Math.abs(dz) === 4) continue
    S(x + dx, 64, z + dz, r === 0 ? 'iron_trapdoor[facing=north,half=top,open=false,powered=false,waterlogged=false]' : r === 1 ? 'polished_andesite' : 'smooth_stone')
  }
}
// Cypress: a spruce_log trunk under a stacked spruce_leaves cone (8 tall, 3 wide).
function cypress (x, z, tall = 8) {
  S(x, 65, z, 'spruce_log[axis=y]')
  for (let y = 66; y < 66 + tall; y++) {
    const k = y - 66
    const shape = k === 0 || k === tall - 3 || k === tall - 2 ? 'plus' : k === tall - 1 ? 'dot' : 'full'
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (shape === 'dot' && (dx || dz)) continue
      if (shape === 'plus' && dx && dz) continue
      S(x + dx, y, z + dz, (dx || dz || k >= tall - 3) ? 'spruce_leaves[persistent=true]' : 'spruce_log[axis=y]')
    }
  }
}
// Round tree: an oak trunk under a ball of oak leaves.
function oak (x, z) {
  const cy = 70
  for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) {
    if (dx * dx + dy * dy + dz * dz > 10.5) continue
    S(x + dx, cy + dy, z + dz, 'oak_leaves[persistent=true]')
  }
  for (let y = 65; y <= 69; y++) S(x, y, z, 'oak_log[axis=y]')
}
// A spot is clear for a tree when nothing of ours is there (no paving, no structure) and it's all M1's.
function clear (x, z, r, top) {
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
    if (ROUTE_NEAR.has(`${x + dx},${z + dz}`)) return false
    for (let y = 64; y <= top; y++) if (!own(x + dx, y, z + dz) || G(x + dx, y, z + dz)) return false
  }
  return true
}
function shrub (x, z) {
  const s = h(x, 1, z) < 50 ? 'oak_leaves[persistent=true]' : 'azalea_leaves[persistent=true]'
  S(x, 65, z, s)
  if (h(x, 2, z) < 50) S(x + 1, 65, z, s)
  if (h(x, 3, z) < 50) S(x, 65, z + 1, s)
  if (h(x, 4, z) < 40) S(x, 66, z, s)
}

// ---- roads and ground -------------------------------------------------------------------------------------------------
function roads () {
  // Service lane, then the diagonal band between F5 and F6 / the SW chamfer, down to the back gate.
  rect(10, 75, 39, 212, asphalt)
  const f5 = new Map(), f6 = new Map()
  line4(9, 214, 71, 289, (x, z) => f5.set(z, Math.max(f5.get(z) ?? -99, x)))
  for (const [x, z] of F6ALL) f6.set(z, Math.min(f6.get(z) ?? 999, x))
  let lastF5 = 9
  for (let z = 213; z <= 291; z++) {
    if (f5.has(z)) lastF5 = f5.get(z)
    const xmin = lastF5 + 1
    const xmax = z < 246 ? 87 : z <= 288 ? f6.get(z) - 1 : 105
    for (let x = xmin; x <= xmax; x++) if (!inMain(x, z) && !inApron(x, z)) asphalt(x, z)
  }
  for (let x = 81; x <= 104; x++) asphalt(x, 292) // through the back gate
  // Patrol parking stalls along the building's west face (not in front of its service doors at z 100..101, 116..117).
  for (let z = 76; z <= 208; z += 4) if (z <= 92 || z >= 124) for (let x = 32; x <= 39; x++) white(x, z)
  // Back road, gate driveway, south road, highway.
  rect(82, 293, 103, 418, asphalt)
  rect(252, 397, 291, 418, asphalt)
  const crossing = x => (x >= 82 && x <= 103) || (x >= 252 && x <= 291) || (x >= 316 && x <= 321) || (x >= 431 && x <= 466) // 316..321: the bike lot's mouth
  for (let x = -40; x <= 480; x++) {
    const jct = x >= 431 && x <= 466
    for (let z = 419; z <= 441; z++) {
      if (!jct && z === 430 && ((x % 6) + 6) % 6 < 3) S(x, 64, z, 'yellow_concrete')
      else if (!jct && ((z === 420 && !crossing(x)) || z === 440)) white(x, z)
      else asphalt(x, z)
    }
    for (const z of [416, 417, 418]) if (!crossing(x)) S(x, 64, z, 'light_gray_concrete')
    for (const z of [442, 443, 444]) if (!jct) S(x, 64, z, 'light_gray_concrete')
    if (!crossing(x)) S(x, 65, 418, 'smooth_stone_slab[type=bottom]')
    if (!jct) S(x, 65, 442, 'smooth_stone_slab[type=bottom]')
  }
  for (let z = 300; z <= 470; z++) {
    if (z >= 419 && z <= 441) continue
    for (let x = 431; x <= 466; x++) {
      if (x === 448 || x === 449) S(x, 64, z, 'yellow_concrete')
      else if (x === 432 || x === 465 || ((x === 440 || x === 457) && ((z % 6) + 6) % 6 < 3)) white(x, z)
      else asphalt(x, z)
    }
  }
  rect(316, 416, 321, 418, asphalt) // the bike lot's dropped curb across the sidewalk (bikeshop.js)
  for (let x = 316; x <= 321; x++) S(x, 65, 418, 'air') // the curb slab the first paste put there
  // Traffic lights at the junction's 4 corners: a pole, an arm over the road, a red/yellow/lime head.
  for (const [px, pz, dir] of [[429, 417, 1], [468, 417, -1], [429, 443, 1], [468, 443, -1]]) {
    for (let y = 65; y <= 72; y++) S(px, y, pz, 'polished_blackstone_wall')
    for (let k = 1; k <= 4; k++) S(px + dir * k, 72, pz, 'polished_blackstone_wall')
    const hx = px + dir * 4
    S(hx, 71, pz, 'red_concrete'); S(hx, 70, pz, 'yellow_concrete'); S(hx, 69, pz, 'lime_concrete')
    S(hx, 68, pz, 'polished_blackstone_slab[type=top]')
  }
  // Sidewalk lamps along the south road.
  for (const x of [-20, 40, 140, 200, 330, 400, 476]) lamp(x, 417)
  // The old vent-exit path west of W1 (the vent no longer leads out): grass again, its 4 lamp posts gone.
  rect(-6, 87, -2, 415, (x, z) => S(x, 64, z, 'grass_block'))
  for (const z of [120, 200, 280, 360]) {
    for (let y = 65; y <= 71; y++) S(-8, y, z, 'air')
    for (let k = -1; k <= 1; k++) { S(-8, 72, z + k, 'air'); S(-8, 73, z + k, 'air') }
  }
  // Lane lamps on its west edge.
  for (const z of [90, 138, 162, 186]) lamp(11, z, 'z')
}

function parkingLot () {
  const median = (x, z) => x >= 147 && x <= 231 && z >= 346 && z <= 350
  const lot = (x, z) => { if (!median(x, z)) asphalt(x, z) }
  rect(111, 323, 192, 349, lot)
  rect(111, 293, 117, 322, lot)
  rect(193, 346, 338, 349, lot)
  rect(111, 350, 380, 393, lot)
  // the strip along the front fence: a sidewalk with a curb, asphalt in front of the gate
  rect(111, 394, 380, 395, (x, z) => {
    if (x >= 252 && x <= 292) { asphalt(x, z); return }
    S(x, 64, z, 'light_gray_concrete')
    if (z === 394) S(x, 65, z, 'smooth_stone_slab[type=bottom]')
  })
  // stalls 4 wide x 8 deep along the south fence: none at the ramp (x 128..175) or the gate (252..292)
  for (const [a, b] of [[114, 126], [176, 248], [296, 376]]) for (let x = a; x <= b; x += 4) for (let z = 386; z <= 393; z++) white(x, z)
  // planted median with cypresses and lamps
  rect(147, 346, 231, 350, (x, z) => {
    if (x === 147 || x === 231 || z === 346 || z === 350) { S(x, 64, z, 'smooth_stone'); S(x, 65, z, 'smooth_stone_slab[type=bottom]') }
  })
  for (let x = 153; x <= 225; x += 12) cypress(x, 348)
  for (const x of [159, 183, 207]) lamp(x, 348)
  // lamps every ~24
  for (const x of [130, 155, 180]) lamp(x, 336)
  for (const x of [120, 186, 210, 234, 258, 282, 306, 330, 354, 374]) lamp(x, 380)
  ramp()
}

// Wooden escape ramp (scenery): spruce slabs and stairs rising west from the ground to a top at y 69, oak trim.
function ramp () {
  const k = x => x <= 136 ? 10 : 1 + Math.floor((171 - x) * 9 / 35) // surface = 65 + k/2
  for (let x = 132; x <= 171; x++) for (let z = 373; z <= 387; z++) {
    const kk = k(x), full = kk >> 1, side = z === 373 || z === 387
    if (side) { // oak trim: a full-height oak side with a fence rail along the higher part
      const n = Math.ceil(kk / 2)
      for (let y = 65; y < 65 + n; y++) S(x, y, z, 'oak_planks')
      if (kk >= 4) S(x, 65 + n, z, 'oak_fence')
      continue
    }
    for (let y = 65; y < 65 + full; y++) S(x, y, z, y === 64 + full && kk % 2 === 0 && k(x + 1) === kk - 1 && x < 171 ? 'spruce_stairs[facing=west,half=bottom]' : 'spruce_planks')
    if (kk % 2 === 1) S(x, 65 + full, z, 'spruce_slab[type=bottom]')
  }
}

// ---- yard, plaza, walkway -----------------------------------------------------------------------------------------------
const PLAZA = (x, z) => (x >= 163 && x <= 192 && z >= 279 && z <= 321) || (x >= 112 && x <= 162 && z >= 265 && z <= 274) ||
  (x >= 163 && x <= 334 && z >= 265 && z <= 278) || (x >= 335 && x <= 338 && z >= 263 && z <= 282)
const DIAG = [[140.5, 133], [170, 103]]
const PATH = (x, z) => (x >= 134 && x <= 147 && z >= 134 && z <= 264) || (x >= 169 && x <= 240 && z >= 98 && z <= 108) ||
  (x >= 147 && x <= 196 && z >= 185 && z <= 193) || (x >= 185 && x <= 196 && z >= 185 && z <= 243) ||
  (z >= 98 && z <= 134 && x >= 134 && x <= 176 && segDist(x, z, DIAG[0], DIAG[1]) <= 6.6)

function plazaAndPaths () {
  // plaza, the strip by the Visitors Building, the walkway and the strip east of it (concrete with joints)
  rect(112, 263, 338, 321, (x, z) => { if (PLAZA(x, z)) joint(x, z) })
  manhole(180, 290)
  // SEASON board, facing north: black board, red cells
  for (let x = 170; x <= 176; x++) for (let y = 65; y <= 69; y++) {
    const frame = x === 170 || x === 176 || y === 65 || y === 69
    S(x, y, 279, frame || (x + y) % 2 ? 'black_concrete' : 'red_concrete')
  }
  // yard paths: light_gray_concrete with smooth_stone edges (a path edge is where it meets grass)
  rect(130, 96, 242, 264, (x, z) => {
    if (!PATH(x, z)) return
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => !PATH(x + dx, z + dz) && !PLAZA(x + dx, z + dz))
    S(x, 64, z, edge ? 'smooth_stone' : 'light_gray_concrete')
  })
  manhole(191, 243)
  // walkway and plaza lamps
  for (const x of [199, 223, 247, 271, 295, 319]) lamp(x, 277)
  lamp(168, 300); lamp(187, 300)
  // The old punch box's footprint decals (x 335..338) are grass again: the box moved to the gate's south end.
  for (const [x, z] of [[338, 255], [337, 253], [336, 255], [335, 253]]) S(x, 64, z, 'grass_block')
}

function field () {
  // mown stripes: 5-wide bands across the field (grass bands are the world's own grass)
  rect(200, 128, 260, 232, (x, z) => { if (Math.floor((z - 128) / 5) % 2 === 1) S(x, 64, z, 'moss_block') })
  for (let z = 128; z <= 232; z++) { white(200, z); white(260, z) }
  for (let x = 200; x <= 260; x++) { white(x, 128); white(x, 232); white(x, 180) }
  rect(219, 169, 241, 191, (x, z) => { if (Math.abs(Math.hypot(x - 230, z - 180) - 9) < 0.5) white(x, z) })
  white(230, 180); white(230, 139); white(230, 221)
  const outline = (x1, z1, x2, z2) => { for (let x = x1; x <= x2; x++) { white(x, z1); white(x, z2) } for (let z = z1; z <= z2; z++) { white(x1, z); white(x2, z) } }
  outline(212, 128, 248, 144); outline(212, 216, 248, 232); outline(222, 128, 238, 133); outline(222, 227, 238, 232)
  // goals 7 wide x 3 tall with white nets: red north (z 128), blue south (z 232)
  for (const [gz, dz, col] of [[128, -1, 'red_concrete'], [232, 1, 'blue_concrete']]) {
    for (let y = 65; y <= 67; y++) { S(227, y, gz, col); S(233, y, gz, col) }
    for (let x = 228; x <= 232; x++) S(x, 67, gz, col)
    for (let y = 65; y <= 67; y++) {
      for (let x = 227; x <= 233; x++) S(x, y, gz + 2 * dz, 'white_stained_glass_pane')
      for (const x of [227, 233]) S(x, y, gz + dz, 'white_stained_glass_pane')
    }
  }
  // floodlight masts at the field corners: 14 tall, 3 sea_lantern heads under a cap
  for (const [x, z] of [[198, 126], [262, 126], [198, 234], [262, 234]]) {
    for (let y = 65; y <= 78; y++) S(x, y, z, 'polished_blackstone_wall')
    for (let k = -1; k <= 1; k++) { S(x + k, 79, z, 'sea_lantern'); S(x + k, 80, z, 'polished_blackstone_slab[type=bottom]') }
  }
  // scoreboard on the east side between the bleachers, facing west (team strips on top)
  for (let z = 169; z <= 177; z++) for (let y = 66; y <= 69; y++) S(272, y, z, y === 69 && z <= 172 ? 'red_concrete' : y === 69 && z >= 174 ? 'blue_concrete' : 'black_concrete')
  S(272, 65, 170, 'polished_blackstone_wall'); S(272, 65, 176, 'polished_blackstone_wall')
  // an interior yard fence along the field's west side (4 high) with open 3-wide gaps
  for (let z = 128; z <= 232; z++) {
    if ((z >= 150 && z <= 152) || (z >= 188 && z <= 190) || (z >= 208 && z <= 210)) continue
    const post = z === 128 || z === 232 || z % 4 === 0 || z === 149 || z === 153 || z === 187 || z === 191 || z === 207 || z === 211
    if (post) for (let y = 65; y <= 68; y++) S(197, y, z, 'diorite_wall')
    else { for (let y = 65; y <= 67; y++) S(197, y, z, 'iron_bars'); S(197, 68, z, 'iron_chain[axis=z]') }
  }
}

// Bleachers: 4 tiers of quartz_stairs seats on smooth_quartz, then a top platform with a rail at the back.
function bleacher (x1, z1, x2, z2, front) {
  const back = front === 'south' ? 'north' : 'east'
  const depth = front === 'south' ? z2 - z1 + 1 : x2 - x1 + 1
  rect(x1, z1, x2, z2, (x, z) => {
    const r = front === 'south' ? z2 - z : x - x1
    if (r <= 7) {
      const t = r >> 1
      for (let y = 65; y < 65 + t; y++) S(x, y, z, 'smooth_quartz')
      S(x, 65 + t, z, r % 2 === 0 ? `quartz_stairs[facing=${back},half=bottom]` : 'smooth_quartz')
    } else {
      for (let y = 65; y <= 67; y++) S(x, y, z, 'smooth_quartz')
      S(x, 68, z, 'quartz_slab[type=top]')
      const sideEnd = front === 'south' ? x === x1 || x === x2 : z === z1 || z === z2
      if (r === depth - 1 || sideEnd) S(x, 69, z, 'iron_bars')
    }
  })
}

// Workout pads: lighter grass in a chamfered white outline, trampolines, benches and dumbbell racks.
function pads () {
  const pad = (x1, z1, x2, z2, c = 4) => {
    const inside = (x, z) => x >= x1 && x <= x2 && z >= z1 && z <= z2 && (x - x1) + (z - z1) >= c && (x2 - x) + (z - z1) >= c &&
      (x - x1) + (z2 - z) >= c && (x2 - x) + (z2 - z) >= c
    rect(x1, z1, x2, z2, (x, z) => {
      if (!inside(x, z)) return
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => !inside(x + dx, z + dz))) { white(x, z); return }
      const s = pick(x, 64, z, PAD)
      if (s !== 'grass_block') S(x, 64, z, s)
    })
  }
  pad(161, 124, 185, 180); pad(161, 200, 185, 240)
  const trampoline = (x, z) => {
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      const a = Math.abs(dx), c = Math.abs(dz)
      if (a + c > 4) continue
      if (a <= 2 && c <= 2 && a + c <= 3) { S(x + dx, 64, z + dz, 'slime_block'); S(x + dx, 65, z + dz, 'black_carpet') } else S(x + dx, 64, z + dz, 'polished_andesite')
    }
  }
  trampoline(169, 135); trampoline(170, 168); trampoline(172, 222)
  const bench = (x, z) => { // a weight bench along x: seat slabs, uprights at the head and a bar across
    for (let k = 0; k <= 2; k++) S(x + k, 65, z, 'quartz_slab[type=top]')
    for (const dz of [-1, 1]) { S(x, 65, z + dz, 'iron_bars'); S(x, 66, z + dz, 'iron_bars') }
    for (let dz = -1; dz <= 1; dz++) S(x, 67, z + dz, 'iron_chain[axis=z]')
  }
  bench(176, 140); bench(176, 150); bench(166, 232); bench(176, 212)
  const rack = (x, z) => { // dumbbells: iron_block ends with iron_chain bars between, two rows
    for (const dz of [0, 2]) { S(x, 65, z + dz, 'iron_block'); S(x + 3, 65, z + dz, 'iron_block'); S(x + 1, 65, z + dz, 'iron_chain[axis=x]'); S(x + 2, 65, z + dz, 'iron_chain[axis=x]') }
  }
  rack(176, 160); rack(166, 152); rack(176, 228); rack(165, 206)
}

// Benches (quartz stairs, back toward `back`, with smooth_quartz arms) and planters along the plaza, walkway and yard path.
function bench (x, z, along, back) {
  const [ax, az] = along === 'x' ? [1, 0] : [0, 1]
  S(x - ax, 65, z - az, 'quartz_slab[type=bottom]'); S(x + 3 * ax, 65, z + 3 * az, 'quartz_slab[type=bottom]')
  for (let k = 0; k <= 2; k++) S(x + k * ax, 65, z + k * az, `quartz_stairs[facing=${back},half=bottom]`)
}
function planter (x, z) {
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    if (dx || dz) S(x + dx, 65, z + dz, 'smooth_stone_slab[type=bottom]')
  }
  S(x, 64, z, 'grass_block'); S(x, 65, z, 'azalea_leaves[persistent=true]'); S(x, 66, z, 'azalea_leaves[persistent=true]')
}
function furniture () {
  bench(164, 296, 'z', 'west'); bench(164, 312, 'z', 'west')
  planter(189, 284); planter(189, 316); planter(166, 284)
  for (const x of [205, 255, 305]) bench(x, 264, 'x', 'north')
  bench(149, 205, 'z', 'east'); bench(149, 233, 'z', 'east'); bench(149, 160, 'z', 'east')
}

// ---- the picnic annex and the water tower ------------------------------------------------------------------------------
function annex () {
  rect(340, 237, 379, 348, joint)
  const umbrella = (cx, cz) => {
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (Math.abs(dx) + Math.abs(dz) <= 4) S(cx + dx, 64, cz + dz, 'sandstone')
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      const r = Math.max(Math.abs(dx), Math.abs(dz))
      if (r === 1) S(cx + dx, 65, cz + dz, 'birch_slab[type=top]')
      if (r === 2 && Math.abs(dx) + Math.abs(dz) <= 3) S(cx + dx, 65, cz + dz, 'birch_slab[type=bottom]')
    }
    for (let y = 65; y <= 69; y++) S(cx, y, cz, 'oak_fence')
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > 6) continue
      const sector = Math.floor((Math.atan2(dz, dx) + Math.PI) / (Math.PI / 4)) % 2
      S(cx + dx, 70, cz + dz, sector ? 'blue_concrete' : 'light_blue_concrete')
      if (Math.abs(dx) + Math.abs(dz) <= 2) S(cx + dx, 71, cz + dz, 'blue_concrete')
    }
    S(cx, 72, cz, 'end_rod[facing=up]')
  }
  umbrella(355, 247); umbrella(355, 293); umbrella(360, 320)
  // stacked boxes
  for (let x = 345; x <= 359; x += 3) for (let z = 328; z <= 342; z += 3) {
    if (h(x, 0, z) < 25) continue
    const top = 65 + h(x, 1, z) % 3
    for (let y = 65; y <= top; y++) {
      const s = h(x, y, z) % 2 ? 'stripped_oak_wood[axis=y]' : 'packed_mud'
      rect(x, z, x + 1, z + 1, (bx, bz) => S(bx, y, bz, s))
    }
  }
  lamp(370, 262); lamp(345, 305); lamp(372, 332)
}

// The parkour (ESCAPE-SPEC 3.1-8): from the annex's box stacks up five props P1..P5 to the annex's south fence, over its
// mesh (chain top 72.6, feet at 73) and down three crates L1..L3 into the lot. One way: L3 to L2 is +2.
// [x1, z1, x2, z2, top]; crates alternate stripped oak and packed mud like the annex's boxes; P3 is an AC unit.
const PARKOUR = [
  ['P1', 360, 340, 361, 341, 68], ['P2', 363, 340, 364, 341, 69], ['P3', 366, 340, 367, 341, 70], ['P4', 366, 343, 367, 344, 71],
  ['P5', 366, 346, 367, 348, 72], ['L1', 366, 351, 367, 351, 69], ['L2', 366, 352, 367, 352, 67], ['L3', 366, 353, 367, 353, 65]
]
const PARKOUR_VENTS = [366, 66, 339, 367, 69, 339] // P3's vents on its north face
function parkour () {
  for (const [name, x1, z1, x2, z2, top] of PARKOUR) rect(x1, z1, x2, z2, (x, z) => {
    for (let y = 65; y <= top; y++) S(x, y, z, name === 'P3' ? 'light_gray_concrete' : (x + y + z) % 2 ? 'stripped_oak_wood[axis=y]' : 'packed_mud')
  })
  const [vx1, vy1, vz, vx2, vy2] = PARKOUR_VENTS
  for (let x = vx1; x <= vx2; x++) for (let y = vy1; y <= vy2; y++) S(x, y, vz, 'iron_trapdoor[facing=north,half=bottom,open=true]')
  // The punch gate's old reader (by the gate's old north post) is gone: the reader and the punch box stand at the gate's
  // south end now, on the police station's apron (buildings.js). The paste is sparse: air.
  S(338, 65, 262, 'air'); S(338, 66, 262, 'air'); S(337, 66, 262, 'air')
}

// The dugout (owner, 2026-10-21: "a ladder or dugout under one lot fence, a way out that bypasses the front gate for
// players with no keycard, as easy as the gate"): inmates dug a shaft at the lot's west edge (x 113) and a 2-high tunnel
// west under F3 (x 110) to a shaft up on the far side (x 105). Under the fence the tunnel is packed coarse dirt (breach
// "dig", x 109..111, y 62..63): Skript digs it open (hold right-click) for a while, then it caves in again. Floor y 61
// (the world's dirt: M1 owns y 62 up), roof y 64 (the lot's asphalt, the fence's base, the grass).
const DUG_Z = 360
function dugout () {
  const z = DUG_Z
  for (let x = 104; x <= 114; x++) for (const dz of [-1, 1]) for (let y = 62; y <= 63; y++) S(x, y, z + dz, (x + y) % 3 ? 'dirt' : 'coarse_dirt')
  for (let x = 106; x <= 112; x++) for (let y = 62; y <= 63; y++) S(x, y, z, x >= 109 && x <= 111 ? 'coarse_dirt' : 'air')
  // timber props where the tunnel starts on each side
  for (const x of [108, 112]) { S(x, 63, z - 1, 'stripped_spruce_log[axis=y]'); S(x, 63, z + 1, 'stripped_spruce_log[axis=y]') }
  // the shafts: a ladder each, on the side away from the tunnel; a rim of broken asphalt / dug-up dirt round each hole
  for (let y = 62; y <= 64; y++) {
    S(114, y, z, y === 64 ? pick(114, 64, z, MIX.asphalt) : 'dirt'); S(113, y, z, 'ladder[facing=west,waterlogged=false]')
    S(104, y, z, y === 64 ? 'grass_block' : 'dirt'); S(105, y, z, 'ladder[facing=east,waterlogged=false]')
  }
  for (const [x, dz] of [[112, -1], [113, -1], [113, 1], [112, 1], [114, -1], [114, 1]]) S(x, 64, z + dz, h(x, 7, z + dz) < 50 ? 'gravel' : 'coarse_dirt')
  for (const [x, dz] of [[104, -1], [105, -1], [106, -1], [104, 1], [105, 1], [106, 1], [106, 0]]) S(x, 64, z + dz, h(x, 8, z + dz) < 50 ? 'coarse_dirt' : 'rooted_dirt')
}

function waterTower (cx = 300, cz = 30) {
  // 4 legs up to the tank's rounded bottom, iron_chain braces between them at two levels
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) for (let y = 65; y <= 83; y++) S(cx + dx, y, cz + dz, 'polished_blackstone_wall')
  for (const y of [71, 78]) for (let k = -2; k <= 2; k++) {
    S(cx + k, y, cz - 3, 'iron_chain[axis=x]'); S(cx + k, y, cz + 3, 'iron_chain[axis=x]')
    S(cx - 3, y, cz + k, 'iron_chain[axis=z]'); S(cx + 3, y, cz + k, 'iron_chain[axis=z]')
  }
  const disc = (y, r, s, hollow = false) => {
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const inside = (a, b) => a * a + b * b <= (r + 0.5) * (r + 0.5)
      if (!inside(dx, dz)) continue
      if (hollow && inside(dx + 1, dz) && inside(dx - 1, dz) && inside(dx, dz + 1) && inside(dx, dz - 1)) continue
      S(cx + dx, y, cz + dz, s)
    }
  }
  // the tank, radius 6, y 84..94, rounded top and bottom, a light_blue_terracotta band; a blue cone roof
  disc(84, 4, 'light_blue_concrete'); disc(85, 5, 'light_blue_concrete', true)
  for (let y = 86; y <= 92; y++) disc(y, 6, y === 88 || y === 89 ? 'light_blue_terracotta' : 'light_blue_concrete', true)
  disc(93, 5, 'light_blue_concrete', true); disc(94, 5, 'light_blue_concrete')
  for (let y = 95, r = 4; r >= 0; y++, r--) disc(y, r, 'blue_concrete')
}

// ---- brick walls --------------------------------------------------------------------------------------------------------
function walls () {
  const ringCells = new Set()
  for (const [k, v] of BAND) {
    const [x, z] = k.split(',').map(Number)
    for (let y = 62; y <= 64; y++) S(x, y, z, 'stone_bricks')
    for (let y = 65; y <= 66; y++) S(x, y, z, 'polished_deepslate')
    for (let y = 67; y <= 76; y++) S(x, y, z, y === 71 || y === 73 ? 'orange_terracotta' : pick(x, y, z, MIX.brick))
    S(x, 77, z, v.centre ? 'deepslate_tiles' : 'polished_blackstone')
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (!inBand(x + dx, z + dz)) ringCells.add(`${x + dx},${z + dz}`)
  }
  // the walkway's overhang ledge and its iron_bars railing; where the ledge can't go (another module's region) the
  // railing stands on the wall's own edge instead
  for (const k of ringCells) {
    const [x, z] = k.split(',').map(Number)
    if (inDeck(x, z)) continue
    if (own(x, 77, z)) { S(x, 77, z, 'polished_blackstone_slab[type=top]'); S(x, 78, z, 'iron_bars'); continue }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inBand(x + dx, z + dz) && !inDeck(x + dx, z + dz)) S(x + dx, 78, z + dz, 'iron_bars')
  }
  // pilasters every 12 blocks on both faces: 1 block proud where the ground is free, else flush in the face
  for (const [x1, z1, x2, z2, ax, c] of WALLS) {
    for (let a = (ax === 'z' ? z1 : x1); a <= (ax === 'z' ? z2 : x2); a++) {
      if (a % 12 !== 0) continue
      for (const side of [-1, 1]) {
        const fx = ax === 'z' ? c + side : a, fz = ax === 'z' ? a : c + side
        const px = ax === 'z' ? c + 2 * side : a, pz = ax === 'z' ? a : c + 2 * side
        if (inDeck(fx, fz)) continue
        const proud = !inBand(px, pz) && !G(px, 64, pz) && !inDeck(px, pz) && !ROUTE_NEAR.has(`${px},${pz}`) &&
          [64, 65, 76].every(y => own(px, y, pz))
        for (let y = 67; y <= 76; y++) S(fx, y, fz, 'polished_deepslate')
        if (proud) { S(px, 64, pz, 'stone_bricks'); for (let y = 65; y <= 76; y++) S(px, y, pz, 'polished_deepslate') }
      }
    }
  }
  // C4 weak spot on W5's inside face (x 278, z 133..158): a dashed chalk square and chalk dots
  for (let z = 133; z <= 158; z++) for (let y = 65; y <= 76; y++) {
    if (z % 12 === 0) continue
    const onSquare = (z >= 138 && z <= 153 && y >= 67 && y <= 74) && (z === 138 || z === 153 || y === 67 || y === 74)
    if (onSquare) { if ((z + y) % 2 === 0) S(278, y, z, 'white_concrete') } else if (h(278, y, z) < 6) S(278, y, z, h(279, y, z) % 2 ? 'white_terracotta' : 'calcite')
  }
}

// ---- chain-link fences and gates ----------------------------------------------------------------------------------------
function fences () {
  for (const f of FENCES) {
    const cells = f.cells, on = new Set(cells.map(c => c.join())), n = cells.length
    for (let i = 0; i < n; i++) {
      const [x, z] = cells[i]
      const nb = cells[i + 1] || cells[i - 1]
      const ax = nb && nb[0] !== x ? 'x' : 'z'
      const inGate = f.gate && i >= f.gate[0] && i <= f.gate[1]
      if (inGate) { // a closed sliding gate: iron_bars on a polished_andesite track, light grey top rail
        S(x, 64, z, 'polished_andesite')
        for (let y = 65; y <= 70; y++) S(x, y, z, 'iron_bars')
        S(x, 71, z, 'light_gray_concrete')
        continue
      }
      const post = i % 4 === 0 || i === n - 1 || (f.gate && (i === f.gate[0] - 1 || i === f.gate[1] + 1))
      let o = null
      for (const c of [[x + f.out[0], z], [x, z + f.out[1]]]) if ((c[0] !== x || c[1] !== z) && !on.has(c.join())) { o = c; break }
      S(x, 64, z, 'smooth_stone'); S(x, 65, z, 'polished_andesite')
      for (let y = 66; y <= 70; y++) S(x, y, z, 'iron_bars')
      if (post) {
        for (let y = 65; y <= 72; y++) S(x, y, z, 'diorite_wall')
        if (o) S(o[0], 72, o[1], 'andesite_wall')
      } else {
        S(x, 71, z, `iron_chain[axis=${ax}]`); S(x, 72, z, `iron_chain[axis=${ax}]`)
        if (o) S(o[0], 72, o[1], `iron_chain[axis=${ax}]`)
      }
    }
  }
  // F7's punch gate: posts were set at its ends; the panel is the gate range above (Skript slides it open: breach
  // "punch", a column every 2 ticks from the police station's end).
  // F6's old RELEASE arch is gone (F6 is one fence now): its sign plate's one block off the fence line goes too.
  S(97, 71, 264, 'air')
  // Front gate: closed sliding panels x 253..267 and x 277..291 meeting the booth (Skript slides them open: breach "front").
  for (const [x1, x2] of [[253, 267], [277, 291]]) for (let x = x1; x <= x2; x++) {
    S(x, 64, 396, 'polished_andesite')
    const stile = x === x1 || x === x2 || x === (x1 + x2) >> 1
    for (let y = 65; y <= 70; y++) S(x, y, 396, stile ? 'light_gray_concrete' : 'iron_bars')
    S(x, 71, 396, 'light_gray_concrete')
  }
  // Back gate (closed): the andesite_wall gantry over two shut sliding panels x 81..104 (stiles at 81, 92, 93, 104).
  for (const x of [80, 105]) { S(x, 64, 292, 'smooth_stone'); for (let y = 65; y <= 72; y++) S(x, y, 292, 'andesite_wall') }
  for (let x = 80; x <= 105; x++) S(x, 73, 292, 'andesite_wall')
  for (let x = 81; x <= 104; x++) {
    S(x, 64, 292, 'polished_andesite')
    for (let y = 65; y <= 70; y++) S(x, y, 292, [81, 92, 93, 104].includes(x) ? 'light_gray_concrete' : 'iron_bars')
    S(x, 71, 292, 'light_gray_concrete')
  }
  // The panels that stood parked at z 297 are gone: the lot's asphalt strip from x 111, grass west of it (F3's post at
  // x 110 stays).
  for (const [x1, x2] of [[71, 79], [106, 114]]) for (let x = x1; x <= x2; x++) {
    if (x === 110) continue
    S(x, 64, 297, x >= 111 ? pick(x, 64, 297, MIX.asphalt) : 'grass_block')
    for (let y = 65; y <= 70; y++) S(x, y, 297, 'air')
  }
}

// Gatehouse booth (x 268..276, z 391..399, y 64..70) on its island (x 267..277, z 386..416).
function booth () {
  rect(267, 386, 277, 416, (x, z) => {
    if ((x >= 268 && x <= 276 && z >= 391 && z <= 399) || z === 396) return // the booth; the gate panels' row
    if (x === 267 || x === 277 || z === 386 || z === 416) { S(x, 64, z, 'smooth_stone'); S(x, 65, z, 'smooth_stone_slab[type=bottom]') } else D(x, 64, z)
  })
  const row = { 64: 'light_gray_concrete', 65: 'red_concrete', 67: 'red_concrete', 69: 'red_terracotta' }
  rect(268, 391, 276, 399, (x, z) => {
    const r = Math.max(Math.abs(x - 272), Math.abs(z - 395))
    S(x, 70, z, 'red_concrete')
    if (r < 3) { S(x, 64, z, 'blue_concrete'); return }
    for (let y = 64; y <= 69; y++) S(x, y, z, row[y] || pick(x, y, z, MIX.white))
    const corner = Math.abs(x - 272) >= 3 && Math.abs(z - 395) >= 3
    const window = corner || ((x <= 269 || x >= 275) && (z === 393 || z === 394)) || (z >= 398 && x >= 271 && x <= 273) ||
      (z <= 392 && (x === 270 || x === 274))
    if (window) for (let y = 66; y <= 68; y++) S(x, y, z, 'light_blue_stained_glass')
  })
  // the door (closed iron, north side) in the inner layer, framed in the outer layer
  D(272, 65, 391); D(272, 66, 391)
  for (let y = 65; y <= 67; y++) { S(271, y, 391, 'light_gray_concrete'); S(273, y, 391, 'light_gray_concrete') }
  S(272, 67, 391, 'light_gray_concrete')
  if (own(272, 65, 392)) door(B, 272, 65, 392, 'north')
  // the console: two red_concrete blocks with a stone_button each (6 blocks from the door), a desk and a chair
  for (const x of [271, 273]) { S(x, 65, 397, 'red_concrete'); S(x, 66, 397, 'stone_button[face=floor,facing=north,powered=false]') }
  S(272, 65, 397, 'smooth_stone_slab[type=top]')
  S(272, 65, 396, 'polished_blackstone_stairs[facing=north,half=bottom]')
  S(272, 69, 395, 'lantern[hanging=true,waterlogged=false]')
  // ESCAPE-SPEC 3.1-11: the door's outside reader (a red plate in the frame's west side, the hook on the island) and the
  // fuse box on the curb against the booth's west wall (punched from the lot at (266, 395)). The console's buttons are
  // 5 blocks from the door (jail-spec 1.8 keeps 3); Skript cancels clicks on them.
  S(271, 66, 391, 'red_concrete'); S(271, 66, 390, 'tripwire_hook[facing=north,attached=false,powered=false]')
  S(267, 65, 395, 'iron_block'); S(267, 66, 395, 'iron_block')
  cypress(272, 404)
  manhole(272, 410)
}

// ---- watchtowers --------------------------------------------------------------------------------------------------------
function tower ([name, cx, cz, kind, spot, doorSpec, cabDoor]) {
  void name
  for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) for (let y = 62; y <= 90; y++) {
    if ((Math.abs(dx) <= 4 && Math.abs(dz) <= 4) || y >= 77) D(cx + dx, y, cz + dz)
  }
  const P = (d, t) => DIR[d][0] === 0 ? [t, 0] : [0, t] // offset along a face
  // base 9x9, y 64..76
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
    const x = cx + dx, z = cz + dz, a = Math.abs(dx), c = Math.abs(dz), r = Math.max(a, c)
    const leg = a >= 3 && c >= 3
    if (kind === 'wall') {
      if (r <= 2) { S(x, 64, z, 'polished_andesite'); continue }
      for (let y = 62; y <= 63; y++) S(x, y, z, 'stone_bricks')
      for (let y = 64; y <= 76; y++) {
        let s
        if (leg) s = 'light_gray_concrete'
        else if (r === 3) s = pick(x, y, z, MIX.darkstone)
        else if (y === 64 || y === 70 || y === 76) s = 'light_gray_concrete'
        else { // dark panels, an X-brace in each 5x5 panel (y 65..69 under the middle beam, y 71..75 over it)
          const t = (a === 4 ? dz : dx) + 2, k = y < 70 ? y - 65 : y - 71
          s = (t === k || t === 4 - k) ? 'light_gray_concrete' : pick(x, y, z, PANEL)
        }
        S(x, y, z, s)
      }
    } else {
      if (leg) { for (let y = 62; y <= 76; y++) S(x, y, z, 'polished_blackstone'); continue }
      if (r <= 3) { S(x, 64, z, 'polished_andesite'); continue }
      // the chain-link wrap y 64..70, a beam at y 71 and y 76, a zig-zag brace between
      S(x, 64, z, 'smooth_stone'); S(x, 65, z, 'polished_andesite')
      for (let y = 66; y <= 70; y++) S(x, y, z, 'iron_bars')
      S(x, 71, z, 'polished_blackstone_wall'); S(x, 76, z, 'polished_blackstone_wall')
      const face = a === 4 ? (dx > 0 ? 0 : 2) : (dz > 0 ? 1 : 3)
      let t = a === 4 ? dz : dx
      if (face % 2) t = -t
      const zig = { '-2': [72], '-1': [72, 73], 0: [73, 74], 1: [74, 75], 2: [75] }[t]
      for (const y of zig) S(x, y, z, 'polished_blackstone_wall')
    }
  }
  if (kind === 'wall') {
    // door (closed iron) on the inside face, framed in light grey; a ladder up the opposite inner wall to the deck
    const [face, t] = doorSpec, d = DIR[face], [px, pz] = P(face, t), [qx, qz] = P(face, 1)
    const ox = cx + 4 * d[0] + px, oz = cz + 4 * d[1] + pz, ix = cx + 3 * d[0] + px, iz = cz + 3 * d[1] + pz
    D(ox, 65, oz); D(ox, 66, oz)
    for (let y = 65; y <= 67; y++) { S(ox + qx, y, oz + qz, 'light_gray_concrete'); S(ox - qx, y, oz - qz, 'light_gray_concrete') }
    S(ox, 67, oz, 'light_gray_concrete')
    if (own(ix, 65, iz)) door(B, ix, 65, iz, face)
    for (let y = 65; y <= 77; y++) S(cx - 2 * d[0], y, cz - 2 * d[1], `ladder[facing=${face},waterlogged=false]`)
    S(cx + qx, 76, cz + qz, 'lantern[hanging=true,waterlogged=false]')
  }
  // deck 13x13 at y 77 with a polished_blackstone_slab edge and an iron_bars railing (open where a wall walkway joins)
  for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) {
    const x = cx + dx, z = cz + dz, rim = Math.max(Math.abs(dx), Math.abs(dz)) === 6
    if (kind === 'wall' && G(x, 77, z) && G(x, 77, z).startsWith('ladder')) continue
    S(x, 77, z, rim ? 'polished_blackstone_slab[type=top]' : 'deepslate_tiles')
    if (rim && !inBand(x, z)) { S(x, 78, z, 'iron_bars'); S(x, 76, z, 'polished_blackstone_slab[type=top]') }
  }
  // cab 7x7 y 78..81: blue corners, light blue glass, a doorway; a desk and a chair at the yard-side window
  const f = DIR[spot], [fqx, fqz] = P(spot, 1), cd = DIR[cabDoor]
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== 3) continue
    const x = cx + dx, z = cz + dz, corner = Math.abs(dx) === 3 && Math.abs(dz) === 3
    const doorway = dx === 3 * cd[0] && dz === 3 * cd[1]
    for (let y = 78; y <= 81; y++) {
      if (doorway && y <= 79) continue
      S(x, y, z, corner || y === 78 || y === 81 || doorway ? 'blue_concrete' : 'light_blue_stained_glass_pane')
    }
  }
  for (let k = -1; k <= 1; k++) S(cx + 2 * f[0] + k * fqx, 78, cz + 2 * f[1] + k * fqz, 'smooth_stone_slab[type=top]')
  S(cx + f[0], 78, cz + f[1], `polished_blackstone_stairs[facing=${OPP[spot]},half=bottom]`)
  S(cx, 81, cz, 'lantern[hanging=true,waterlogged=false]')
  // roof: a wide, low, stepped octagon, orange_terracotta rim, y 82..84
  for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
    const a = Math.abs(dx), c = Math.abs(dz)
    const oct = r => a <= r && c <= r && a + c <= r + Math.floor(r / 2)
    if (!oct(5)) continue
    const rim = !oct(4)
    S(cx + dx, 82, cz + dz, rim ? 'orange_terracotta' : 'orange_concrete')
    if (oct(3)) S(cx + dx, 83, cz + dz, oct(2) ? 'orange_concrete' : 'red_concrete')
    if (a <= 1 && c <= 1) S(cx + dx, 84, cz + dz, 'red_concrete')
  }
  // spotlight: a dark neck and a round lamp head with a sea_lantern lens toward the yard
  S(cx, 85, cz, 'polished_blackstone_wall')
  for (let y = 86; y <= 87; y++) {
    S(cx, y, cz, 'iron_block')
    S(cx + f[0], y, cz + f[1], 'sea_lantern')
    for (const s of [-1, 1]) {
      S(cx + s * fqx, y, cz + s * fqz, 'light_gray_concrete')
      S(cx + f[0] + s * fqx, y, cz + f[1] + s * fqz, 'light_gray_concrete')
    }
  }
}

// T9's west face where the annex's south fence (z 349, the parkour's last fence) meets it. The face's brace leaves a
// notch over the y 71 beam there (72.5 to the brace at 75), and a crouching player could walk the fence top east from
// the parkour, step off the post at x 376 into it and drop into the tower's hollow, which straddles the outline (x 381.5):
// out past the front gate. Braced shut up to the y 75 brace (WP-BUILD review, 2026-10-14; the checker's crouch pass).
function sealT9 () {
  for (let y = 72; y <= 74; y++) S(377, y, 349, 'polished_blackstone_wall')
}

// ---- the old easy-escape route, removed (ESCAPE-SPEC 3.1-4) ---------------------------------------------------------
// Its paint goes back to grass where nothing earlier set the cell (paths, roads and the doorstep keep their own surface:
// route() no longer paints over them), its 12 lamps and 4 EXIT sign posts become air.
function unroute () {
  for (const k of ROUTE_CELLS) { const [x, z] = k.split(',').map(Number); if (!G(x, 64, z)) S(x, 64, z, 'grass_block') }
  for (const [x, z, ax] of [[136, 193, 'x'], [145, 213, 'z'], [145, 229, 'z'], [145, 245, 'z'], [126, 251, 'x'], [110, 251, 'x'],
    [88, 276, 'z'], [80, 305, 'z'], [80, 329, 'z'], [80, 353, 'z'], [80, 377, 'z'], [80, 401, 'z']]) {
    const gone = (x, y, z) => { if (!G(x, y, z)) S(x, y, z, 'air') } // a cell an earlier part set keeps that block
    for (let y = 65; y <= 71; y++) gone(x, y, z)
    for (let k = -1; k <= 1; k++) {
      const lx = ax === 'x' ? x + k : x, lz = ax === 'x' ? z : z + k
      gone(lx, 72, lz); gone(lx, 73, lz)
    }
  }
  for (const [x, z] of SIGNS) {
    if (!G(x, 64, z)) S(x, 64, z, 'grass_block')
    for (let y = 65; y <= 68; y++) S(x, y, z, 'air')
  }
}

// ---- trees, shrubs, grass -----------------------------------------------------------------------------------------------
const OAKS = [[-18, 110], [-16, 160], [-20, 205], [-17, 250], [-22, 300], [-18, 350], [-24, 395], [-32, 140], [-34, 230], [-30, 330],
  [22, 56], [30, 40], [8, 48], [145, 52], [168, 62], [176, 47],
  [275, 52], [318, 58], [332, 28], [284, 12], [350, 88], [312, 118], [300, 160], [296, 205], [340, 130], [365, 185], [392, 140],
  [412, 205], [402, 85], [362, 40], [420, 30], [440, 120], [455, 250], [470, 330], [395, 262], [402, 302], [396, 338], [408, 372], [418, 410],
  [0, 456], [62, 458], [132, 456], [198, 460], [278, 455], [352, 458], [418, 460], [470, 455],
  [128, 406], [196, 408], [352, 409], // [320, 406] went for the bike lot (2026-10-21)
  [30, 320], [52, 362], [18, 400], [62, 408], [22, 262], [44, 292], [-2, 240],
  [40, 20], [100, 0], [180, 10], [250, -15], [-25, 40], [10, -10], [140, -20], [220, -25]]
const OUT_CYPRESS = [[230, 406], [372, 405], // [310, 404] went for the bike lot (2026-10-21)
  [160, 404], [-10, 430], [420, 290]]
function greenery () {
  // cypresses along the facades (the two at the entrance first), the police strip and the pocket by the Visitors Building
  for (const [x, z] of [[131, 192], [131, 203], [131, 150], [131, 166], [131, 182], [131, 213], [131, 223],
    [205, 281], [221, 281], [237, 281], [312, 281], [328, 281], [114, 283]]) cypress(x, z)
  for (const [x, z] of OUT_CYPRESS) if (clear(x, z, 1, 74)) cypress(x, z)
  for (const [x, z] of OAKS) {
    const jx = x + (h(x, 5, z) % 3) - 1, jz = z + (h(x, 6, z) % 3) - 1
    if (clear(jx, jz, 3, 74)) oak(jx, jz)
  }
  // shrubs: the row north of the main building and the north pocket
  for (let x = 44; x <= 124; x += 7) S(x, 65, 43, h(x, 7, 43) < 50 ? 'oak_leaves[persistent=true]' : 'azalea_leaves[persistent=true]')
  for (const [x, z] of [[134, 60], [138, 47], [152, 66], [158, 45], [172, 54], [180, 66], [160, 58], [131, 52], [150, 44]]) if (clear(x, z, 1, 66)) shrub(x, z)
  // clumps of short and tall grass on the open grass (never on the field, the route or anything built)
  for (let x = -40; x <= 480; x++) for (let z = -30; z <= 470; z++) {
    if (h(x >> 3, 9, z >> 3) >= 30) continue // clumps, not an even sprinkle
    const v = h(x, 65, z)
    if (v >= 14) continue
    if (x >= 99 && x <= 338 && z >= 74 && z <= 322) continue // outside landscaping only: the yard, lawn and plaza stay mown
    if (ROUTE_NEAR.has(`${x},${z}`)) continue
    if (G(x, 64, z) || G(x, 65, z) || G(x, 66, z) || !own(x, 64, z) || !own(x, 66, z)) continue
    if (v < 3) { S(x, 65, z, 'tall_grass[half=lower]'); S(x, 66, z, 'tall_grass[half=upper]') } else S(x, 65, z, 'short_grass')
  }
}

// ---------------------------------------------------------------------------------------------------------------------
module.exports = (b) => {
  B = b
  roads()
  parkingLot()
  plazaAndPaths()
  field()
  bleacher(186, 82, 236, 92, 'south')
  bleacher(265, 128, 276, 162, 'west')
  bleacher(265, 184, 276, 218, 'west')
  pads()
  furniture()
  annex()
  parkour()
  dugout()
  waterTower()
  manhole(424, 386)
  unroute()
  walls()
  fences()
  booth()
  for (const t of TOWERS) tower(t)
  sealT9()
  greenery()
  B = null
  return b
}

// ---- labels (1.6; a label on a face sits on the face plane + 0.03) ----------------------------------------------------
const LABELS = [
  { x: 271.97, y: 67.5, z: 173.5, facing: 'west', text: '0 0', color: '#ffffff', scale: 1 },
  { x: 173.5, y: 69.5, z: 278.97, facing: 'north', text: 'SEASON', color: '#ffffff', scale: 1 },
  { x: 272.5, y: 68.5, z: 390.97, facing: 'north', text: 'GATEHOUSE', color: '#ffffff', scale: 0.8 }, // L_GATEHOUSE
  { x: 266.97, y: 66.5, z: 395.5, facing: 'west', text: 'FUSE BOX', color: '#ffd84d', scale: 0.5 } // L_FUSE
]
module.exports.labels = LABELS
module.exports.fenceCells = fenceCells

// ---- points (7.2, 10; ESCAPE-SPEC Appendix B, M1) -----------------------------------------------------------------------
// Cop patrol points (jailcops.sk walks each route there and back).
const YARDN_PTS = [[140.5, 65, 140.5], [156.5, 65, 122.5], [172.5, 65, 103.5], [205.5, 65, 103.5], [238.5, 65, 103.5], [263.5, 65, 118.5]]
const YARDS_PTS = [[263.5, 65, 145.5], [263.5, 65, 172.5], [263.5, 65, 199.5], [263.5, 65, 226.5], [263.5, 65, 245.5], [227.5, 65, 243.5],    [190.5, 65, 240.5], [190.5, 65, 215.5], [190.5, 65, 189.5], [165.5, 65, 189.5], [140.5, 65, 189.5], [140.5, 65, 165.5]]
const WALK_PTS = [[180.5, 65, 310.5], [180.5, 65, 290.5], [180.5, 65, 271.5], [205.5, 65, 271.5], [235.5, 65, 271.5], [265.5, 65, 271.5],    [295.5, 65, 271.5], [330.5, 65, 271.5], [336.5, 65, 265.5], [336.5, 65, 258.5]]
const W5_PTS = [[279.5, 78, 120.5], [279.5, 78, 141.5], [279.5, 78, 163.5], [283.5, 78, 166.5], [283.5, 78, 175.5], [279.5, 78, 178.5],    [279.5, 78, 203.5], [279.5, 78, 228.5]]
const W67_PTS = [[287.5, 78, 235.5], [310.5, 78, 235.5], [340.5, 78, 235.5], [373.5, 78, 235.5], [377.5, 78, 240.5], [381.5, 78, 243.5],    [381.5, 78, 264.5], [377.5, 78, 267.5], [377.5, 78, 277.5], [381.5, 78, 280.5], [381.5, 78, 310.5], [381.5, 78, 340.5]]
const GATE_PTS = [[236.5, 65, 389.5], [272.5, 65, 389.5], [308.5, 65, 389.5]]
const LOT_PTS = [[150.5, 65, 362.5], [190.5, 65, 362.5], [230.5, 65, 362.5], [270.5, 65, 362.5], [310.5, 65, 362.5], [350.5, 65, 362.5]]
const FIELD_PTS = [[205.5, 65, 133.5], [255.5, 65, 133.5], [255.5, 65, 226.5], [205.5, 65, 226.5], [205.5, 65, 140.5]]
const PLAZA_PTS = [[116.5, 65, 268.5], [150.5, 65, 268.5], [170.5, 65, 289.5], [170.5, 65, 312.5]]
const route = (name, pts) => Object.fromEntries(pts.map((p, i) => [`ROUTE_${name}_${i + 1}`, [...p, 0]]))
module.exports.points = {
  R_SPAWN_OUT: [133.5, 65, 197.5, -90],
  // cop patrols (jailcops.sk walks them there and back)
  ...route('YARDN', YARDN_PTS),
  ...route('YARDS', YARDS_PTS),
  ...route('WALK', WALK_PTS),
  ...route('W5', W5_PTS),
  ...route('W67', W67_PTS),
  ...route('GATE', GATE_PTS), // the lot's south strip, past the booth door
  ...route('LOT', LOT_PTS),
  // More guards (owner, 2026-10-21: "20 (2x) normally, 30 (3x) while more than 3 players are in the prison"; core.sk
  // jailcop::roster and roster-busy): the old patrols the other way round (a second guard starting at the far end), the
  // football field, the west plaza by the Visitors Building, the lot's west end (the dugout) and east end (the parkour's
  // landing), the annex.
  ...route('YARDNR', [...YARDN_PTS].reverse()),
  ...route('YARDSR', [...YARDS_PTS].reverse()),
  ...route('WALKR', [...WALK_PTS].reverse()),
  ...route('W5R', [...W5_PTS].reverse()),
  ...route('W67R', [...W67_PTS].reverse()),
  ...route('GATER', [...GATE_PTS].reverse()),
  ...route('LOTR', [...LOT_PTS].reverse()),
  ...route('FIELD', FIELD_PTS),
  ...route('FIELDR', [...FIELD_PTS].reverse()),
  ...route('PLAZA', PLAZA_PTS),
  ...route('PLAZAR', [...PLAZA_PTS].reverse()),
  ...route('LOTW', [[125.5, 65, 328.5], [125.5, 65, 365.5], [118.5, 65, 385.5]]),
  ...route('LOTE', [[345.5, 65, 356.5], [372.5, 65, 356.5], [372.5, 65, 388.5]]),
  ...route('ANNEX', [[350.5, 65, 245.5], [370.5, 65, 260.5], [370.5, 65, 305.5], [350.5, 65, 315.5]]),
  TANK: [181.5, 65, 156.5, 90],
  // the C4 on the inner vehicle gate
  PLANT_GATE: [178.5, 65, 320.5, 0],
  C4_GATE: [178.5, 67.0, 321.9, 180],
  // the punch box and the punch gate on F7 (2026-10-21: the gate spans z 260..284; the box and its reader stand at its
  // south end on the police station's apron, buildings.js)
  PUNCH_STAND: [335.5, 65, 282.5, 0],
  PUNCH_READER: [338, 66, 283, 0],
  PUNCH_IN: [340.5, 65, 272.5, -90],
  // the dugout under F3 (2026-10-21): the lot side's stand, the plug's face in the tunnel, the far side's stand
  DUG_IN: [114.5, 65, 362.5, 90],
  DUG_FACE: [112.5, 62, 360.5, 90],
  DUG_OUT: [105.5, 65, 362.5, 90],
  RUN_1: [172.5, 65, 103.5, 0],
  RUN_2: [238.5, 65, 103.5, 0],
  RUN_3: [227.5, 65, 243.5, 0],
  RUN_4: [140.5, 65, 240.5, 0],
  STASH_1: [273.5, 65, 180.5, 0],
  STASH_2: [238.5, 65, 94.5, 0],
  STASH_3: [162.5, 65, 245.5, 0],
  STASH_4: [190.5, 65, 318.5, 0],
  // the lot, the gatehouse booth and the front gate
  LOT_EXIT: [260.5, 65, 404.5, 0],
  BOOTH_OUT: [272.5, 65, 389.5, 0],
  BOOTH_READER: [271, 66, 390, 0],
  BOOTH_DOOR: [272, 65, 392, 0],
  BOOTH_IN: [272.5, 65, 393.5, 0],
  BOOTH_STAND: [272.5, 65, 395.5, 0],
  CONSOLE: [272.5, 65.0, 397.5, 0],
  FUSE_BOX: [267, 66, 395, 0],
  FUSE_STAND: [266.5, 65, 395.5, -90],
  FRONT_IN: [260.5, 65, 392.5, 180],
  L_GATEHOUSE: [272.5, 68.5, 390.97, 180],
  L_FUSE: [266.97, 66.5, 395.5, 90]
}
// The parkour props' blocks (the checker takes them out to prove they're the only way over the annex fence).
module.exports.parkour = [
  ...PARKOUR.map(([, x1, z1, x2, z2, top]) => [x1, 65, z1, x2, top, z2]),
  [PARKOUR_VENTS[0], PARKOUR_VENTS[1], PARKOUR_VENTS[2], PARKOUR_VENTS[3], PARKOUR_VENTS[4], PARKOUR_VENTS[2]]
]
