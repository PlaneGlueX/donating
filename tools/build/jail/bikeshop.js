// The bike shop in front of the prison (tools/build/town/PLAN.md section 15.3, 2026-10-21; the owner's Q14: "a small shop
// in front of the prison with a little parking lot where small vehicles (bikes) spawn; a player steals one with a
// quick-time event"). A sixth prison module, run after M5. Box x 304..347, z 398..415, y 62..90: between the front fence
// (z 396) and the highway's sidewalk (z 416..418), east of tower T11's deck (x 290..302) and west of the oak at 351..354
// (its leaves reach x 348). outdoors.js leaves this box out (its own() and the crossing at x 316..321). World
// `jailbreak`, ground grass at y 64. The lot (x 305..331, z 399..414) holds 4 bike stalls; bikes.sk parks a bike in each
// (item displays: no blocks here) and the shop (x 333..346, z 400..413) is scenery: a small corrugated workshop. The box
// is cleared first (y 65..80): the prison's first paste had an oak and a cypress here. Written by a cloud session (no
// server, no client); the local session renders it and checks it in the client (handoff/2026-10-21/README.md).
'use strict'

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

const BOX = { x1: 304, z1: 398, x2: 347, z2: 415, y1: 62, y2: 90 }
const LOT = { x1: 305, z1: 399, x2: 331, z2: 414 }
const SHOP = { x1: 333, z1: 400, x2: 346, z2: 413, roof: 72 }
const LINES = [308, 313, 318, 323, 328]          // the stalls' white lines (z 402..410); bikes stand between them
const BIKES = [310.5, 315.5, 320.5, 325.5]       // the stalls' middles (z 406.5, facing south to the highway)
const DOORWAY = [406, 407]                       // the shop's doorway (x 333, y 65..66), iron doors held open
const ROLLUP = [409, 412]                        // the roll-up door (x 333, y 65..68), iron trapdoors, closed
const inBox = (x, y, z) => y >= BOX.y1 && y <= BOX.y2 && x >= BOX.x1 && x <= BOX.x2 && z >= BOX.z1 && z <= BOX.z2

module.exports = (b) => {
  const strays = []
  const S = (x, y, z, s) => { const v = typeof s === 'function' ? s(x, y, z) : s; if (!v) return; if (inBox(x, y, z)) b.set(x, y, z, v); else strays.push(`${x},${y},${z} ${v}`) }
  const F = (x1, y1, z1, x2, y2, z2, s) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s) }
  const B = { set: S }
  const ASPH = (x, y, z) => pick(x, y, z, MIX.asphalt)

  // the box cleared, then the ground: grass, the lot, a walk between the lot and the shop
  F(BOX.x1, 65, BOX.z1, BOX.x2, 80, BOX.z2, 'air')
  for (let x = BOX.x1; x <= BOX.x2; x++) for (let z = BOX.z1; z <= BOX.z2; z++) {
    const lot = x >= LOT.x1 && x <= LOT.x2 && z >= LOT.z1 && z <= LOT.z2
    S(x, 64, z, lot ? ASPH : x === LOT.x2 + 1 && z >= LOT.z1 ? 'light_gray_concrete' : 'grass_block')
  }
  // the lot: white stall lines, wheel stops behind each stall, a curb on its north and west edges (open to the sidewalk)
  for (const x of LINES) for (let z = 402; z <= 410; z++) S(x, 64, z, 'white_concrete')
  for (const bx of BIKES) for (let x = Math.floor(bx) - 1; x <= Math.floor(bx) + 1; x++) S(x, 65, 402, 'smooth_stone_slab[type=bottom,waterlogged=false]')
  for (let x = LOT.x1; x <= LOT.x2; x++) S(x, 65, LOT.z1 - 1, 'smooth_stone_slab[type=bottom,waterlogged=false]')
  for (let z = LOT.z1 - 1; z <= LOT.z2; z++) S(LOT.x1 - 1, 65, z, 'smooth_stone_slab[type=bottom,waterlogged=false]')
  // a bike sign at the lot's mouth: an orange board on a post (x 306, y 65..68)
  F(306, 65, 413, 306, 66, 413, 'polished_blackstone_wall')
  F(306, 67, 412, 306, 68, 414, 'orange_concrete')
  // the prison's lamp at the lot's middle (its blackstone pole and froglights)
  for (let y = 65; y <= 71; y++) S(319, y, 399, 'polished_blackstone_wall')
  for (let k = -1; k <= 1; k++) { S(319 + k, 72, 399, 'ochre_froglight[axis=y]'); S(319 + k, 73, 399, 'polished_blackstone_slab[type=bottom,waterlogged=false]') }

  // ---- the shop: a small corrugated workshop (light grey ribbed walls, an orange stripe at y 69, a dark roof)
  const { x1, z1, x2, z2, roof } = SHOP
  for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) {
    const e = x === x1 || x === x2 || z === z1 || z === z2
    S(x, 64, z, e ? 'polished_andesite' : 'smooth_stone')
    for (let y = 65; y < roof; y++) {
      if (!e) { S(x, y, z, 'air'); continue }
      const u = x === x1 || x === x2 ? z : x
      S(x, y, z, y === 69 ? 'orange_concrete' : y === roof - 1 ? 'gray_concrete' : u % 2 ? 'light_gray_concrete' : 'polished_andesite')
    }
    S(x, roof, z, e ? 'polished_deepslate' : h(x, roof, z) < 20 ? 'smooth_basalt' : 'polished_deepslate')
  }
  for (let x = x1; x <= x2; x++) for (const z of [z1, z2]) S(x, roof + 1, z, 'polished_deepslate_slab[type=bottom,waterlogged=false]')
  for (let z = z1; z <= z2; z++) for (const x of [x1, x2]) S(x, roof + 1, z, 'polished_deepslate_slab[type=bottom,waterlogged=false]')
  // the doorway: iron doors held open, the BIKES board over it (orange, on the wall at y 69..70)
  for (const z of DOORWAY) { S(x1, 64, z, 'smooth_stone'); door(B, x1, 65, z, 'east', z === DOORWAY[0] ? 'right' : 'left', true); S(x1, 67, z, 'gray_concrete') }
  F(x1, 69, DOORWAY[0] - 2, x1, 70, DOORWAY[1] + 2, 'orange_concrete')
  // the roll-up door: closed iron trapdoors standing in the opening (y 65..68), a dark head over it
  for (let z = ROLLUP[0]; z <= ROLLUP[1]; z++) {
    for (let y = 65; y <= 68; y++) S(x1, y, z, 'iron_trapdoor[facing=east,half=bottom,open=true,powered=false,waterlogged=false]')
    S(x1 - 1, 64, z, 'smooth_stone')
  }
  // windows on the south face (toward the highway): glass in grey frames
  for (let x = 336; x <= 343; x++) if (x % 4 !== 3) for (const y of [66, 67]) S(x, y, z2, 'glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]')
  // the tyre sign on the roof's north-west corner: a tyre standing up (black wool round a grey hub), facing west
  for (let dy = 0; dy <= 2; dy++) for (let dz = 0; dz <= 2; dz++) S(x1 + 1, roof + 1 + dy, z1 + 1 + dz, dy === 1 && dz === 1 ? 'gray_wool' : 'black_wool')
  // inside (scenery, nothing with a menu): a workbench along the east wall, a tyre rack, a parts wall, a bike on a stand
  for (let z = 402; z <= 411; z++) { S(x2 - 1, 65, z, 'stripped_spruce_wood[axis=z]'); S(x2 - 1, 66, z, 'iron_trapdoor[facing=west,half=bottom,open=false,powered=false,waterlogged=false]') }
  for (let x = 336; x <= 343; x++) for (let y = 65; y <= 67; y++) if (x % 2 === 0) S(x, y, z1 + 1, y === 66 ? 'polished_blackstone' : 'blackstone')
  F(x2 - 1, 68, 402, x2 - 1, 69, 411, 'waxed_exposed_copper_grate')
  for (const z of [404, 409]) S(x2 - 1, 67, z, 'iron_chain[axis=y,waterlogged=false]')
  for (const z of [403, 408]) for (const x of [337, 341]) S(x, roof - 1, z, 'lantern[hanging=true,waterlogged=false]')
  module.exports.strays = strays
  return b
}

// Labels (jail-spec 1.8): on the face plane + 0.03 along facing.
module.exports.labels = [
  { x: 332.97, y: 69.3, z: 406.5, facing: 'west', text: 'BIKES', color: '#ffffff', scale: 2.4 },                 // the board over the doorway
  { x: 305.97, y: 67.3, z: 413.5, facing: 'west', text: 'BIKES', color: '#ffffff', scale: 1.0 },                 // the lot's sign
  { x: 306.5, y: 67.3, z: 414.53, facing: 'south', text: 'BIKES →', color: '#ffffff', scale: 0.8 },              // its south end
  { x: 339.5, y: 69.15, z: 413.53, facing: 'south', text: 'REPAIRS · PARTS', color: '#ffffff', scale: 0.9 }      // the stripe facing the highway
]
module.exports.points = {
  BIKE_SHOP: [320.5, 65, 412.5, 0],                       // the GPS's stop (tools/make-jail-gps-paths.js: LOT_EXIT -> BIKE_SHOP)
  ...Object.fromEntries(BIKES.map((x, i) => [`BIKE_${i + 1}`, [x, 65, 406.5, 0]]))
}
module.exports.box = BOX
module.exports.strays = []
