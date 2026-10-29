'use strict'
// ---- COMMON (tools/build/north: copy verbatim into every Rising City North module; city.js check compares them) ----
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

// ---- Rising City North's frame (tools/build/expand/PLAN.md section 1.1) -----------------------------------------------
const WORLD = 'world'
const CITY = { x1: 481, z1: 0, x2: 940, z2: 279, y1: 44, y2: 120 } // every block of Rising City North lies in here
const GROUND_Y = 64 // the generated grass's top block; feet stand at 65
const LABEL_TAG = 'north_label', DISPLAY_TAG = 'north_display'

// module boxes [x1, z1, x2, z2]: the module owns every column inside, y CITY.y1..CITY.y2
const BOX = {
  reserve: [664, 132, 800, 222], // the Federal Reserve and its plaza on Bank Street North (x 664..669)
  gallery: [556, 126, 636, 222], // the Art Gallery, its front on Gallery Row
  club: [664, 228, 740, 278],    // the Nightclub, on Rising City's old kept-free strip, its forecourt from Bank Street's east walk
  pawn: [600, 66, 636, 109],     // Lucky Pawn, its front on Gallery Row
  carwash: [490, 126, 550, 200]  // the Car Wash, its front on Gallery Row
}
const BUILDINGS = Object.keys(BOX)
// the heist regions [x1, y1, z1, x2, y2, z2]: each module sets its own when it's built (until then the whole box)
const REGION = {
  reserve: [683, 51, 153, 748, 77, 200],
  gallery: [561, 60, 139, 631, 77, 201],
  club: [669, 63, 239, 738, 77, 277],
  pawn: [605, 63, 79, 631, 73, 104],
  carwash: [492, 63, 134, 548, 75, 198]
}
const KEEP_FREE = []

const inBox = (x, z, boxes) => boxes.some(([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2)
// z 226..279 is the built Rising City's (the streets module of tools/build/city): North owns only the club's lot there and
// Bank Street North's last 4 rows (z 226..229, grass in the city's build) that join it to the city's Bank Street at z 230.
const ownerOf = (x, z) => {
  if (x < CITY.x1 || x > CITY.x2 || z < CITY.z1 || z > CITY.z2) return null
  if (z >= 226) {
    if (inBox(x, z, [BOX.club])) return 'club'
    return x >= 640 && x <= 663 && z <= 229 ? 'streets' : null
  }
  if (inBox(x, z, KEEP_FREE)) return 'free'
  for (const m of BUILDINGS) if (inBox(x, z, [BOX[m]])) return m
  return 'streets'
}
const ownFor = mod => (x, y, z) => y >= CITY.y1 && y <= CITY.y2 && ownerOf(x, z) === mod

// ---- streets (module `streets`) ---------------------------------------------------------------------------------------
const BANK_N = { x1: 640, x2: 663, road: [643, 660], dash: [651, 652], curb: [642, 661], z1: 0, z2: 229 }
const ROW = { x1: 481, x2: 930, z1: 110, z2: 125, road: [113, 122], dash: [117, 118], curb: [112, 123] } // Gallery Row

// What the streets module lays at (x, z), or null (the grass stays). top = the surface block's y.
// kinds: road (asphalt), line (white / yellow), walk (sidewalk), curb (sidewalk edge, a slab at top + 1)
function streetCell (x, z) {
  const inBank = x >= BANK_N.x1 && x <= BANK_N.x2 && z >= BANK_N.z1 && z <= BANK_N.z2
  const inRow = x >= ROW.x1 && x <= ROW.x2 && z >= ROW.z1 && z <= ROW.z2
  if (!inBank && !inRow) return null
  const roadB = inBank && x >= BANK_N.road[0] && x <= BANK_N.road[1]
  const roadR = inRow && z >= ROW.road[0] && z <= ROW.road[1]
  if (roadB || roadR) {
    const dashB = roadB && !inRow && (x === BANK_N.dash[0] || x === BANK_N.dash[1]) && ((z % 6) + 6) % 6 < 3
    const dashR = roadR && !inBank && (z === ROW.dash[0] || z === ROW.dash[1]) && ((x % 6) + 6) % 6 < 3
    return dashB || dashR ? { kind: 'line', top: 64, color: 'yellow' } : { kind: 'road', top: 64 }
  }
  // where the two cross, the corner squares stay sidewalk; a curb only along the road
  const curb = (inBank && !inRow && (x === BANK_N.curb[0] || x === BANK_N.curb[1])) || (inRow && !inBank && (z === ROW.curb[0] || z === ROW.curb[1]))
  return { kind: curb ? 'curb' : 'walk', top: 64 }
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

// The Nightclub, "Club Neon" (north/PLAN.md section 4): the forecourt off Bank Street, the lobby, the main room (the bar,
// the dance floor and its blinking lasers, the DJ booth), the VIP lounge and the manager's office with its wall safe.
// Every write goes through S (clipped to the module's own columns).
//   node tools/build/north/club.js   -> counts and bounds
// =====================================================================================================================
const MOD = 'club'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s)
}
const stairs = (m, facing, half = 'bottom') => `${m}_stairs[facing=${facing},half=${half},shape=straight,waterlogged=false]`
const SLAB_TOP = m => `${m}_slab[type=top,waterlogged=false]`

// ---- the club's numbers (PLAN 4) ----------------------------------------------------------------------------------------------
const BLD = { x1: 670, x2: 737, z1: 240, z2: 276 }   // the walls (inside x 671..736, z 241..275)
const ROOF = 75
const DOOR = { z1: 261, z2: 264, y2: 68 }            // the front doorway in the west face x 670
const LOBBY_X = 681, BACK_X = 723, OFFICE_Z = 265    // the partition walls
const BAR = { x1: 686, x2: 718, back: 242, front: 246, g1: [700, 703] }
const TILLS = [691, 702, 713]                        // P1-P3 on the back counter
const LASER_X = [689.5, 693.5, 697.5, 707.5, 711.5, 715.5]
const DANCE = { x1: 688, x2: 716, z1: 251, z2: 271 }
const DJ = { x1: 717, x2: 721, z1: 265, z2: 274 }, DJ_BOX = [720, 66, 266]
const VIP_GAP = [249, 252], VIP_TABLES = [[729, 247], [729, 258]]
const STAFF_DOOR = [270, 271], SAFE = { x: 733, z1: 270, z2: 271 }, SAFE_PILE_X = 736
const ATM = [667, 256]
const edge = (x, z) => x === BLD.x1 || x === BLD.x2 || z === BLD.z1 || z === BLD.z2
const wall = (x, y, z) => pick(x, y, z, MIX.darkstone)

// ---- the building: the floor, the walls and their neon band, the partitions, the roof ---------------------------------------
function shell () {
  rect(BLD.x1, BLD.z1, BLD.x2, BLD.z2, (x, z) => {
    let s = 'polished_deepslate'
    if (edge(x, z)) s = 'polished_blackstone'
    else if (x < LOBBY_X) s = 'polished_blackstone_bricks'
    else if (x > BACK_X && z < OFFICE_Z) s = 'crimson_planks'
    else if (x > BACK_X) s = 'dark_oak_planks'
    else if (x >= DANCE.x1 && x <= DANCE.x2 && z >= DANCE.z1 && z <= DANCE.z2) {
      s = (x + z) % 2 ? 'magenta_stained_glass' : 'light_blue_stained_glass'
      S(x, 63, z, 'sea_lantern')
    }
    S(x, 64, z, s)
  })
  // the outer walls: a pink and light blue neon band at y 70 (2 blocks each), the doorway in the west face
  const face = (x, y, z) => y === 70 ? (Math.floor((x + z) / 2) % 2 ? 'pink_concrete' : 'light_blue_concrete') : wall(x, y, z)
  for (let y = 65; y < ROOF; y++) {
    for (let x = BLD.x1; x <= BLD.x2; x++) { S(x, y, BLD.z1, face(x, y, BLD.z1)); S(x, y, BLD.z2, face(x, y, BLD.z2)) }
    for (let z = BLD.z1 + 1; z < BLD.z2; z++) {
      const door = z >= DOOR.z1 && z <= DOOR.z2
      S(BLD.x1, y, z, door && y <= DOOR.y2 ? 'air' : door && y === DOOR.y2 + 1 ? 'polished_blackstone' : face(BLD.x1, y, z))
      S(BLD.x2, y, z, face(BLD.x2, y, z))
      // the partitions: x 681 (the lobby, opening z 261..264), x 723 (the VIP gap, the staff door), z 265 (lounge | office)
      S(LOBBY_X, y, z, z >= DOOR.z1 && z <= DOOR.z2 && y <= DOOR.y2 ? 'air' : 'polished_blackstone')
      const gap = (z >= VIP_GAP[0] && z <= VIP_GAP[1] && y <= 68) || (z >= STAFF_DOOR[0] && z <= STAFF_DOOR[1] && y <= 67)
      S(BACK_X, y, z, gap ? 'air' : 'polished_blackstone')
    }
    for (let x = BACK_X + 1; x < BLD.x2; x++) S(x, y, OFFICE_Z, 'polished_blackstone')
  }
  // the roof: a light grid (froglights over the main room), a parapet
  rect(BLD.x1, BLD.z1, BLD.x2, BLD.z2, (x, z) => {
    let s = 'polished_blackstone'
    if (!edge(x, z) && x % 6 === 3 && z % 6 === 3) s = x > LOBBY_X && x < BACK_X ? ((x + z) % 12 === 0 ? 'pearlescent_froglight[axis=y]' : 'verdant_froglight[axis=y]') : 'sea_lantern'
    S(x, ROOF, z, s)
    if (edge(x, z)) S(x, ROOF + 1, z, 'polished_blackstone_slab[type=bottom,waterlogged=false]')
  })
}

// ---- inside -----------------------------------------------------------------------------------------------------------------
function inside () {
  // the lobby: the coat check along the north wall, the bouncer's stand, couches on the south wall, plants
  for (let x = 672; x <= 679; x++) { S(x, 65, 245, 'dark_oak_planks'); S(x, 66, 245, 'dark_oak_slab[type=bottom,waterlogged=false]') }
  for (let x = 672; x <= 679; x++) S(x, 65, 242, 'dark_oak_fence')   // the coat rails
  F(678, 65, 258, 678, 66, 258, 'polished_blackstone_wall')
  for (let x = 672; x <= 679; x++) S(x, 65, 275, stairs('crimson', 'north'))
  for (const [x, z] of [[671, 241], [671, 275], [680, 275]]) { S(x, 65, z, 'moss_block'); S(x, 66, z, 'azalea_leaves[persistent=true,distance=7,waterlogged=false]') }

  // the bar: the back shelves (z 241), the back counter with the tills (z 242), the front counter with glass on it (z 246)
  for (let x = BAR.x1 + 1; x < BAR.x2; x++) {
    S(x, 65, 241, 'dark_oak_planks'); S(x, 66, 241, 'glass'); S(x, 67, 241, SLAB_TOP('dark_oak')); S(x, 68, 241, 'glass')
    S(x, 65, BAR.back, TILLS.includes(x) ? 'polished_blackstone' : 'dark_oak_planks')
  }
  for (let x = BAR.x1; x <= BAR.x2; x++) {
    S(x, 65, BAR.front, 'polished_blackstone')
    for (const y of [66, 67]) S(x, y, BAR.front, 'glass')   // G1 is the glass at x 700..703
  }
  for (const x of [BAR.x1, BAR.x2]) for (let z = BAR.back; z < BAR.front; z++) F(x, 65, z, x, 67, z, z === BAR.back ? 'dark_oak_planks' : 'glass')

  // the speakers at the dance floor's corners, the DJ booth (raised one block), its decks and the cash box
  for (const [x, z] of [[687, 250], [687, 272], [717, 250]]) F(x, 65, z, x, 67, z, 'note_block')
  F(DJ.x1, 65, DJ.z1, DJ.x2, 65, DJ.z2, 'polished_blackstone')
  for (const z of [268, 269]) S(DJ.x1 - 1, 65, z, stairs('polished_blackstone', 'east'))   // the step up from the dance floor
  for (let z = 268; z <= 272; z++) S(DJ.x2, 66, z, z === 270 ? 'jukebox' : 'polished_deepslate_slab[type=bottom,waterlogged=false]')
  S(DJ_BOX[0], DJ_BOX[1], DJ_BOX[2], 'polished_deepslate')

  // the VIP lounge: two tables (the cash, P5 and P6) with red couches round them, gold lamps
  for (const [x, z] of VIP_TABLES) {
    S(x, 65, z, 'smooth_quartz'); S(x + 1, 65, z, 'smooth_quartz')
    for (let dx = -1; dx <= 2; dx++) { S(x + dx, 65, z - 2, stairs('crimson', 'south')); S(x + dx, 65, z + 2, stairs('crimson', 'north')) }
  }
  for (const [x, z] of [[735, 241], [735, 264], [724, 241]]) { S(x, 65, z, 'gold_block'); S(x, 66, z, 'lantern[hanging=false,waterlogged=false]') }

  // the office: the desk, the bookshelf row x 731 with its 2-wide gap (the plates), the safe wall x 733 and its closet
  F(726, 65, 267, 728, 65, 267, 'dark_oak_planks'); S(727, 65, 268, stairs('dark_oak', 'north'))
  for (let z = OFFICE_Z + 1; z < BLD.z2; z++) if (z < STAFF_DOOR[0] || z > STAFF_DOOR[1]) F(731, 65, z, 731, 66, z, 'bookshelf')
  for (const z of STAFF_DOOR) S(731, 65, z, 'stone_pressure_plate[powered=false]')
  for (let z = OFFICE_Z + 1; z < BLD.z2; z++) for (let x = SAFE.x; x < BLD.x2; x++) for (let y = 65; y < ROOF; y++) {
    const closet = x > SAFE.x && z >= 269 && z <= 272 && y <= 67
    const door = x === SAFE.x && z >= SAFE.z1 && z <= SAFE.z2 && y <= 66
    S(x, y, z, door ? 'iron_block' : closet ? (x === SAFE_PILE_X && y === 65 && z >= SAFE.z1 && z <= SAFE.z2 ? 'polished_blackstone' : 'air') : 'polished_deepslate')
  }
  // the lounge's 4 plates just inside the rope gap
  for (let z = VIP_GAP[0]; z <= VIP_GAP[1]; z++) S(725, 65, z, 'stone_pressure_plate[powered=false]')
  // the turret housings (the lenses stay in air)
  for (const [x, z] of [[721, 241], [736, 252]]) S(x, 74, z, 'polished_blackstone')
}

// ---- the forecourt on Bank Street, the canopy, the ATM, the lot ----------------------------------------------------------------
function front () {
  rect(664, 228, 669, 278, (x, z) => S(x, 64, z, pick(x, 64, z, MIX.walk)))
  rect(664, DOOR.z1, 669, DOOR.z2, (x, z) => S(x, 65, z, 'red_carpet'))
  rect(666, 259, 669, 266, (x, z) => S(x, 69, z, 'polished_blackstone_slab[type=bottom,waterlogged=false]'))
  for (const z of [259, 266]) for (let y = 65; y <= 68; y++) S(666, y, z, 'polished_blackstone_wall')
  for (let y = 65; y <= 67; y++) S(ATM[0], y, ATM[1], 'barrier')
  // the rest of the lot: grass, a few trees
  for (const [x, z] of [[680, 232], [700, 233], [722, 232], [688, 278], [716, 278]]) oak(S, x, z)
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  shell(); inside(); front()
  B = null
  return b
}
module.exports.build = () => module.exports()

// ---- labels, displays, points, setup (PLAN 4) -----------------------------------------------------------------------------------
module.exports.labels = [{ x: 669.97, y: 71.3, z: 263.0, facing: 'west', text: 'CLUB NEON', color: '#ff4fd8', scale: 3 }]
module.exports.displays = [{ x: ATM[0] + 0.5, y: 66.5, z: ATM[1] + 0.5, item: 'iron_ingot', cmd: 'donating:furn_atm', yaw: 90, pitch: 0, scale: 1 }]
module.exports.points = {
  CLUB_EXIT: [666.5, 65, 262.5, 90],
  CLUB_HOLO: [666.5, 70, 262.5, 90]
}
const REGION_LINES = [
  '(G) //pos1 669,63,239',
  '(G) //pos2 738,77,277',
  '(G) /rg define heist_club',
  '(C) rg flag -w W heist_club passthrough allow'
]
const BEAT = n => `damage=2 blink=true on=2 off=2 offset=${n}`
const TURRET = 'effect=damage damage=0.5 range=14'
const HEIST_LINES = [
  '(G) /dheist create club 2',
  '(G) /dheist set club name Nightclub',
  '(G) /dheist set club pool 14000',
  '(G) /dheist set club level 10',
  '(G) /dheist exit club 666.5 65 262.5 90',
  '# gates: G1 the bar\'s glass (smash), G2 the office safe',
  `(G) /dloot add club smash ${BAR.g1[0]} 66 ${BAR.front} ${BAR.g1[1]} 67 ${BAR.front}   # G1`,
  `(G) /dloot add club safe ${SAFE.x} 65 ${SAFE.z1} ${SAFE.x} 66 ${SAFE.z2} digits=4 claim=6   # G2`,
  '# piles (P1..P7)',
  ...TILLS.map(x => `(G) /dloot add club pile ${x} 65 ${BAR.back} ${x} 65 ${BAR.back} value=600-1200 style=register piece=250 take=2.0 behind=1 name=Till`),
  `(G) /dloot add club pile ${DJ_BOX.join(' ')} ${DJ_BOX.join(' ')} value=500-1000 style=cash piece=250 take=2.0 name=DJ_cash_box`,
  ...VIP_TABLES.map(([x, z]) => `(G) /dloot add club pile ${x} 65 ${z} ${x + 1} 65 ${z} value=1000-2000 style=cash piece=500 take=3.0 name=VIP_table`),
  `(G) /dloot add club pile ${SAFE_PILE_X} 65 ${SAFE.z1} ${SAFE_PILE_X} 65 ${SAFE.z2} value=3000-5000 style=cash piece=1000 take=4.0 behind=2 name=Office_safe`,
  '(G) /dloot check club',
  '# traps (T1..T14): the dance floor\'s six lasers rippling west to east, the turrets, the plates',
  ...LASER_X.map((x, i) => `(G) /dtrap add club laser ${x} 66.2 247.0 ${x} 66.2 276.0 ${BEAT(i % 3)}`),
  `(G) /dtrap add club camera 721.5 73.5 241.5 90 35 ${TURRET} angle=25 sweep=60 period=8   # T7 over the bar`,
  `(G) /dtrap add club camera 735.5 73.5 252.5 90 40 ${TURRET} angle=25 sweep=70 period=8   # T8 the VIP lounge`,
  ...[249, 250, 251, 252].map(z => `(G) /dtrap add club plate 725 65 ${z} damage=2`),
  ...STAFF_DOOR.map(z => `(G) /dtrap add club plate 731 65 ${z} damage=2`),
  '(G) /dheist snapshot club',
  '(G) /dheist holo club 666.5 70 262.5',
  '(G) /dheist enable club'
]
module.exports.setup = {
  regions: [{ id: 'heist_club', box: REGION.club, flags: ['passthrough allow'], lines: REGION_LINES,
    note: 'the building; the forecourt stays outside (x < 669)' }],
  heists: [{
    id: 'club', difficulty: 2, level: 10, advanced: false, name: 'Nightclub', pool: 14000, escape: '6:00', cooldown: '10:00',
    exit: [666.5, 65, 262.5, 90], holo: [666.5, 70, 262.5],
    snapshot: 'with the room clean: the bar\'s glass whole, the safe shut, the plates up',
    lines: HEIST_LINES
  }],
  keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], walls: [], holos: [], bikes: [],
  atms: [`(C) datm add ${ATM[0]} 65 ${ATM[1]}`],
  pois: ['(C) dpoi addat landmark 666 65 262 Nightclub']
}
module.exports.gps = { nodes: [[5030, 666.5, 65, 262.5, 'CLUB']], links: [[3017, 5030]] }

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}`)
}
