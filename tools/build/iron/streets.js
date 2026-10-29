'use strict'
// ---- COMMON (tools/build/iron: copy verbatim into every Ironvale module; city.js check compares them) ----
const h = (x, y, z) => (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 100
const pick = (x, y, z, mix) => { const v = h(x, y, z); let a = 0; for (const [s, p] of mix) { a += p; if (v < a) return s } return mix[mix.length - 1][0] }
const MIX = {
  white: [['white_concrete', 70], ['smooth_quartz', 20], ['calcite', 10]],
  brick: [['bricks', 85], ['polished_granite', 8], ['terracotta', 7]],
  asphalt: [['black_concrete', 75], ['black_concrete_powder', 15], ['gray_concrete_powder', 10]],
  darkstone: [['blackstone', 40], ['cobbled_deepslate', 35], ['polished_basalt', 25]],
  navy: [['blue_terracotta', 80], ['blue_concrete', 20]],
  // town additions
  deck: [['black_concrete', 90], ['gray_concrete', 10]], // asphalt with no powder: bridge decks and anything over air
  stonebrick: [['stone_bricks', 70], ['cracked_stone_bricks', 12], ['tuff_bricks', 18]],
  // city additions
  plaza: [['polished_andesite', 75], ['andesite', 15], ['stone', 10]],      // alleys, plazas, Hatch Lane, the channel floor
  walk: [['light_gray_concrete', 100]],                                      // sidewalks (plain, as the prison's: jail/outdoors.js)
  curb: [['smooth_stone', 85], ['stone', 15]]
}
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
const rect = (x1, z1, x2, z2, fn) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) fn(x, z) }

// ---- Ironvale's frame (tools/build/iron/PLAN.md section 0) ------------------------------------------------------------
const WORLD = 'world'
const CITY = { x1: 830, z1: 150, x2: 1500, z2: 800, y1: 44, y2: 140 } // every block of Ironvale lies in here
const GROUND_Y = 64 // the generated grass's top block; feet stand at 65
const LABEL_TAG = 'iron_label', DISPLAY_TAG = 'iron_display'

// module boxes [x1, z1, x2, z2]: the module owns every column inside, y CITY.y1..CITY.y2
const BOX = {
  power: [950, 270, 1120, 415],   // the Power Plant, its yard and cooling towers, its gate on the avenue's north walk
  police: [950, 445, 1070, 555],  // the Police HQ, its front on the avenue's south walk
  mansion: [1160, 560, 1340, 740] // Mansion Hill and the house on top (Hill Drive's strip is the streets')
}
const BUILDINGS = Object.keys(BOX)
// the heist regions [x1, y1, z1, x2, y2, z2]: each module sets its own when it's built (until then a small placeholder)
const REGION = {
  power: [1020, 63, 330, 1050, 75, 360],
  police: [995, 63, 485, 1025, 75, 515],
  mansion: [1235, 89, 635, 1265, 101, 665]
}
const KEEP_FREE = []

const inBox = (x, z, boxes) => boxes.some(([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2)
// ---- streets (module `streets`, PLAN section 1) ------------------------------------------------------------------------
const AVE_E = { x1: 830, x2: 1280, z1: 419, z2: 441, dash: 430, edge: [420, 440], curb: [418, 442], walk: [416, 444], end: 1281 }
const HILL = { x1: 1240, x2: 1251, road: [1242, 1249], dash: [1245, 1246], walk: [1241, 1250], z1: 445, z2: 600, top: 90 }
const hillTop = z => Math.min(HILL.top, 64 + Math.max(0, Math.floor((z - 444) / 6))) // Hill Drive's surface block at z
// x 830..940 is Rising City's (tools/build/city): Ironvale owns only Main Avenue East's stretch there.
const ownerOf = (x, z) => {
  if (x < CITY.x1 || x > CITY.x2 || z < CITY.z1 || z > CITY.z2) return null
  if (x <= 940) return z >= AVE_E.walk[0] && z <= AVE_E.walk[1] ? 'streets' : null
  if (x >= HILL.x1 && x <= HILL.x2 && z >= HILL.z1 && z <= HILL.z2) return 'streets'
  if (inBox(x, z, KEEP_FREE)) return 'free'
  for (const m of BUILDINGS) if (inBox(x, z, [BOX[m]])) return m
  return 'streets'
}
const ownFor = mod => (x, y, z) => y >= CITY.y1 && y <= CITY.y2 && ownerOf(x, z) === mod

// What the streets module lays at (x, z), or null (the grass stays). top = the surface block's y.
// kinds: road (asphalt), line (white / yellow), walk (sidewalk), curb (sidewalk edge, a slab at top + 1), wall (Hill
// Drive's retaining wall, to top, a parapet above)
function streetCell (x, z) {
  if (x >= AVE_E.x1 && x <= AVE_E.end && z >= AVE_E.walk[0] && z <= AVE_E.walk[1]) {
    if (x === AVE_E.end) return { kind: 'curb', top: 64 }
    if (z >= AVE_E.z1 && z <= AVE_E.z2) {
      if (z === AVE_E.edge[0] || z === AVE_E.edge[1]) return { kind: 'line', top: 64, color: 'white' }
      if (z === AVE_E.dash && ((x % 6) + 6) % 6 < 3) return { kind: 'line', top: 64, color: 'yellow' }
      return { kind: 'road', top: 64 }
    }
    if (z > AVE_E.z2 && x >= HILL.walk[0] && x <= HILL.walk[1]) return { kind: 'road', top: 64 } // Hill Drive's mouth
    return { kind: z === AVE_E.curb[0] || z === AVE_E.curb[1] ? 'curb' : 'walk', top: 64 }
  }
  if (x >= HILL.x1 && x <= HILL.x2 && z >= HILL.z1 && z <= HILL.z2) {
    const top = hillTop(z)
    if (x === HILL.x1 || x === HILL.x2) return { kind: 'wall', top }
    if (x === HILL.walk[0] || x === HILL.walk[1]) return { kind: 'walk', top }
    if ((x === HILL.dash[0] || x === HILL.dash[1]) && z % 6 < 3) return { kind: 'line', top, color: 'yellow' }
    return { kind: 'road', top }
  }
  return null
}

// ---- props shared by the modules (S = the module's clipped setter, y0 = the ground block's y) ------------------------
// Town street lamp (a cobra-head): a diorite_wall post y0+1..y0+10, a smooth_quartz cap, an arm of top slabs reaching 3
// cells toward (dx, dz) at y0+11, and a sea_lantern head hanging under the arm's end.
function streetLamp (S, x, z, dx, dz, y0 = 64) {
  for (let y = y0 + 1; y <= y0 + 10; y++) S(x, y, z, 'diorite_wall')
  S(x, y0 + 11, z, 'smooth_quartz')
  for (let k = 1; k <= 3; k++) S(x + dx * k, y0 + 11, z + dz * k, 'smooth_quartz_slab[type=top]')
  S(x + dx * 3, y0 + 10, z + dz * 3, 'sea_lantern')
}
// The prison's lamp (the approach road keeps it): a polished_blackstone_wall pole, 3 ochre froglights under slabs.
function prisonLamp (S, x, z, axis = 'x', y0 = 64) {
  for (let y = y0 + 1; y <= y0 + 7; y++) S(x, y, z, 'polished_blackstone_wall')
  for (let k = -1; k <= 1; k++) {
    const lx = axis === 'x' ? x + k : x, lz = axis === 'x' ? z : z + k
    S(lx, y0 + 8, lz, 'ochre_froglight[axis=y]'); S(lx, y0 + 9, lz, 'polished_blackstone_slab[type=bottom]')
  }
}
// A Jailbreak pine: a spruce trunk and 3 stacked cones of persistent spruce leaves (radius 4, 3, 2), tall 12..18.
function pine (S, x, z, tall = 14, y0 = 64) {
  const t = Math.max(12, Math.min(18, tall)), tiers = [[0.25, 4], [0.5, 3], [0.72, 2]]
  for (let y = y0 + 1; y <= y0 + t - 2; y++) S(x, y, z, 'spruce_log[axis=y]')
  for (const [f, r0] of tiers) {
    const yb = y0 + 1 + Math.round(t * f), hgt = Math.round(t * 0.32)
    for (let k = 0; k < hgt; k++) {
      const r = r0 * (1 - k / hgt) + 0.4
      for (let dx = -r0; dx <= r0; dx++) for (let dz = -r0; dz <= r0; dz++) if ((dx || dz) && dx * dx + dz * dz <= r * r) S(x + dx, yb + k, z + dz, 'spruce_leaves[persistent=true]')
    }
  }
  S(x, y0 + t - 1, z, 'spruce_leaves[persistent=true]'); S(x, y0 + t, z, 'spruce_leaves[persistent=true]')
}
// A round tree (the prison's oak): a trunk under a ball of persistent oak leaves.
function oak (S, x, z, y0 = 64) {
  for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) {
    if (dx * dx + dy * dy + dz * dz > 10.5) continue
    S(x + dx, y0 + 6 + dy, z + dz, 'oak_leaves[persistent=true]')
  }
  for (let y = y0 + 1; y <= y0 + 5; y++) S(x, y, z, 'oak_log[axis=y]')
}
function shrub (S, x, z, y0 = 64) {
  const s = h(x, 1, z) < 50 ? 'oak_leaves[persistent=true]' : 'azalea_leaves[persistent=true]'
  S(x, y0 + 1, z, s)
  if (h(x, 2, z) < 50) S(x + 1, y0 + 1, z, s)
  if (h(x, 3, z) < 50) S(x, y0 + 1, z + 1, s)
  if (h(x, 4, z) < 40) S(x, y0 + 2, z, s)
}
// ---- end COMMON ----

// The streets module of Ironvale (tools/build/iron/PLAN.md section 1): Main Avenue East from the roundabout, Hill Drive
// up to Mansion Hill, their curbs and lamps, two ATMs, the GPS nodes. Every write goes through S (clipped to the street
// columns).
//   node tools/build/iron/streets.js   -> counts and bounds
// =====================================================================================================================
const MOD = 'streets'
const own = ownFor(MOD)
let B = null
const MISSED = []
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, s); else MISSED.push([x, y, z, s]) }

const CELL = new Map()
for (let x = CITY.x1; x <= CITY.x2; x++) for (let z = CITY.z1; z <= CITY.z2; z++) {
  if (ownerOf(x, z) !== MOD) continue
  const c = streetCell(x, z)
  if (c) CELL.set(`${x},${z}`, c)
}
// ATMs on the avenue's north walk (PLAN 1): [x, z, yaw], the screen facing the street (south, yaw 0).
const ATMS = [[1000, 416, 0], [1180, 416, 0]]
const LAMPS = []

function surface () {
  for (const [k, c] of CELL) {
    const [x, z] = k.split(',').map(Number)
    for (let y = 64; y < c.top; y++) S(x, y, z, c.kind === 'wall' ? pick(x, y, z, MIX.stonebrick) : 'stone') // Hill Drive's embankment
    if (c.kind === 'road') S(x, c.top, z, pick(x, c.top, z, MIX.asphalt))
    else if (c.kind === 'line') S(x, c.top, z, `${c.color}_concrete`)
    else if (c.kind === 'walk') S(x, c.top, z, pick(x, c.top, z, MIX.walk))
    else if (c.kind === 'curb') { S(x, c.top, z, pick(x, c.top, z, MIX.curb)); S(x, c.top + 1, z, 'smooth_stone_slab[type=bottom,waterlogged=false]') }
    else if (c.kind === 'wall') { S(x, c.top, z, pick(x, c.top, z, MIX.stonebrick)); S(x, c.top + 1, z, 'stone_brick_wall') }
  }
  // shrubs behind the avenue's end curb
  for (let z = 417; z <= 443; z += 3) shrub(S, AVE_E.end + 2, z)
}
// Lamps every 24 blocks on both avenue walks, the arm over the road; none at Hill Drive's mouth or by an ATM. Hill Drive:
// both walks every 24 from z 462, standing on the walk.
function lamps () {
  for (let x = 842; x <= 1278; x += 24) for (const [z, dz] of [[416, 1], [444, -1]]) {
    if (z === 444 && x >= 1230 && x <= 1261) continue
    if (ATMS.some(([ax, az]) => Math.abs(ax - x) <= 2 && az === z)) continue
    streetLamp(S, x, z, 0, dz); LAMPS.push([x, z])
  }
  for (let z = 462; z <= HILL.z2; z += 24) for (const [x, dx] of [[HILL.walk[0], 1], [HILL.walk[1], -1]]) {
    streetLamp(S, x, z, dx, 0, hillTop(z)); LAMPS.push([x, z])
  }
}
// An ATM (atm.sk): three barriers under the furniture model (the display in DISPLAYS); atm.sk adds the click box and
// the floating screen.
function atm ([x, z]) { for (let y = 65; y <= 67; y++) S(x, y, z, 'barrier') }

// ---- GPS (ids from 6001; the city's 3008 is the roundabout's east side) -------------------------------------------------
const GPS = {
  nodes: [
    [6001, 840.5, 65, 430.5, 'AVE_E_W'], [6002, 1010.5, 65, 430.5, 'AVE_E_MID'], [6003, 1245.5, 65, 430.5, 'HILL_FOOT'],
    [6004, 1276.5, 65, 430.5, 'AVE_E_END'], [6005, 1245.5, 91, 600.5, 'HILL_TOP']
  ],
  links: [[3008, 6001], [6001, 6002], [6002, 6003], [6003, 6004], [6003, 6005]]
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  LAMPS.length = 0
  surface(); lamps(); for (const a of ATMS) atm(a)
  B = null
  return b
}
module.exports.build = () => module.exports()
module.exports.labels = []
module.exports.displays = ATMS.map(([x, z, yaw]) => ({ x: x + 0.5, y: 66.5, z: z + 0.5, item: 'iron_ingot', cmd: 'donating:furn_atm', yaw, pitch: 0, scale: 1 }))
module.exports.points = {}
module.exports.setup = {
  regions: [{ id: 'district_ironvale', box: [941, 0, 150, 1500, 200, 800], flags: ['passthrough allow'], launch: true,
    lines: ['(C) zzregion district_ironvale 941 0 150 1500 200 800   # local; on Minehut: //pos1 941,0,150 //pos2 1500,200,800 /rg define',
      '(C) rg flag -w world district_ironvale passthrough allow'] }],
  heists: [], keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], pois: [], walls: [], holos: [], bikes: [],
  atms: ATMS.map(([x, z]) => `(C) datm add ${x} 65 ${z}`),
  phone: ['(C) dphone city scan -40 -30 1500 1300 0 world confirm', '(C) dphone roads scan']
}
module.exports.gps = GPS

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}; ${LAMPS.length} lamps; ${MISSED.length} missed writes`)
  if (MISSED.length) { console.log(MISSED.slice(0, 10)); process.exit(1) }
}
