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

// Lucky Pawn (north/PLAN.md section 5): a store on Gallery Row. The shop floor, the counter with the register and the
// clerk behind it, the back room and its locked jewelry cabinet. Every write goes through S (clipped to the module's own columns).
//   node tools/build/north/pawn.js   -> counts and bounds
// =====================================================================================================================
const MOD = 'pawn'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s)
}

// ---- the store's numbers (PLAN 5) ----------------------------------------------------------------------------------------------
const BLD = { x1: 606, x2: 630, z1: 80, z2: 104 }    // the walls (inside x 607..629, z 81..103)
const ROOF = 71
const DOOR = { x1: 617, x2: 619, y2: 67 }            // the front door in the south face z 104
const WINDOWS = [[609, 614], [622, 627]]             // the display windows (y 66..68), barred outside
const COUNTER = { z: 91, x1: 607, x2: 627 }, REGISTER = [617, 619]
const BACK_Z = 85, BACK_DOOR = [610, 611]
// the walk-in cabinet x 626..629, z 81..83 (walls x 625, z 84), its glass front G1. A store takes piles and glass only
// (loot.sk), so it's smashed, not a safe.
const SAFE = { x: 625, z1: 82, z2: 83, pileX: 629 }
const CLERK = [618.5, 65, 89.5, 0], SHELVES = [[610.5, 65, 87.5], [626.5, 65, 87.5], [618.5, 65, 87.5]]
const ATM = [612, 107]
const edge = (x, z) => x === BLD.x1 || x === BLD.x2 || z === BLD.z1 || z === BLD.z2
const brick = (x, y, z) => pick(x, y, z, MIX.brick)

// ---- the building ---------------------------------------------------------------------------------------------------------------
function shell () {
  rect(BLD.x1, BLD.z1, BLD.x2, BLD.z2, (x, z) => S(x, 64, z, edge(x, z) ? 'stone_bricks' : z < BACK_Z ? 'polished_andesite' : 'spruce_planks'))
  for (let y = 65; y < ROOF; y++) {
    for (let x = BLD.x1; x <= BLD.x2; x++) {
      let s = brick(x, y, BLD.z2)
      if (x >= DOOR.x1 && x <= DOOR.x2 && y <= DOOR.y2) s = 'air'
      else if (y >= 66 && y <= 68 && WINDOWS.some(([a, b]) => x >= a && x <= b)) s = 'glass'
      S(x, y, BLD.z2, s)
      S(x, y, BLD.z1, brick(x, y, BLD.z1))
    }
    for (let z = BLD.z1 + 1; z < BLD.z2; z++) { S(BLD.x1, y, z, brick(BLD.x1, y, z)); S(BLD.x2, y, z, brick(BLD.x2, y, z)) }
    // the back room's wall (its door x 610..611)
    for (let x = BLD.x1 + 1; x < BLD.x2; x++) S(x, y, BACK_Z, x >= BACK_DOOR[0] && x <= BACK_DOOR[1] && y <= 67 ? 'air' : 'spruce_planks')
  }
  rect(BLD.x1, BLD.z1, BLD.x2, BLD.z2, (x, z) => {
    S(x, ROOF, z, !edge(x, z) && x % 5 === 3 && z % 5 === 3 ? 'sea_lantern' : 'smooth_stone')
    if (edge(x, z)) S(x, ROOF + 1, z, 'brick_slab[type=bottom,waterlogged=false]')
  })
}

// ---- inside -----------------------------------------------------------------------------------------------------------------
function inside () {
  // the counter with the register on it (P1), the hinge gap at x 628..629
  for (let x = COUNTER.x1; x <= COUNTER.x2; x++) S(x, 65, COUNTER.z, 'polished_blackstone')
  // the back shelves (z 86, the gap in front of the back room's door), barrels and slabs
  for (let x = BLD.x1 + 1; x < BLD.x2; x++) {
    if (x >= BACK_DOOR[0] && x <= BACK_DOOR[1]) continue
    S(x, 65, 86, 'barrel[facing=north,open=false]'); S(x, 66, 86, x % 2 ? 'chiseled_bookshelf[facing=south,slot_0_occupied=true,slot_1_occupied=false,slot_2_occupied=true,slot_3_occupied=true,slot_4_occupied=false,slot_5_occupied=true]' : 'barrel[facing=north,open=false]')
    S(x, 67, 86, 'spruce_slab[type=bottom,waterlogged=false]')
  }
  // the shop floor: two glass display cases, guitars (note blocks under jukeboxes) on the west wall, TVs on the east
  for (const [a, b] of [[610, 614], [622, 626]]) for (let x = a; x <= b; x++) { S(x, 65, 96, 'dark_oak_planks'); S(x, 66, 96, 'glass') }
  for (const z of [94, 98, 102]) { S(607, 65, z, 'note_block'); S(607, 66, z, 'jukebox') }
  for (const z of [94, 98]) F(629, 66, z, 629, 67, z + 1, 'black_concrete')
  for (const [x, z] of [[607, 103], [629, 103]]) { S(x, 65, z, 'moss_block'); S(x, 66, z, 'azalea_leaves[persistent=true,distance=7,waterlogged=false]') }

  // the back room: boxes, the walk-in cabinet (G1 its glass front, P3 on its shelf)
  for (const [x, z] of [[607, 81], [608, 81], [607, 82], [607, 84], [613, 81], [614, 81]]) { S(x, 65, z, 'barrel[facing=up,open=false]'); if (h(x, 5, z) < 50) S(x, 66, z, 'barrel[facing=up,open=false]') }
  for (let y = 65; y < ROOF; y++) {
    for (let z = BLD.z1 + 1; z <= 84; z++) S(SAFE.x, y, z, z >= SAFE.z1 && z <= SAFE.z2 && y <= 66 ? 'glass' : 'polished_deepslate')
    for (let x = SAFE.x; x < BLD.x2; x++) S(x, y, 84, 'polished_deepslate')
    for (let x = SAFE.x + 1; x < BLD.x2; x++) for (let z = BLD.z1 + 1; z < 84; z++) S(x, y, z, y >= 68 ? 'polished_deepslate' : 'air')
  }
  for (let z = SAFE.z1; z <= SAFE.z2; z++) S(SAFE.pileX, 65, z, 'polished_blackstone')
}

// ---- the front: the bars, the awning, the apron, the ATM; a tree behind ---------------------------------------------------------
function front () {
  rect(600, 105, 636, 109, (x, z) => S(x, 64, z, pick(x, 64, z, MIX.walk)))
  for (const [a, b] of WINDOWS) for (let x = a; x <= b; x++) for (let y = 66; y <= 68; y++) S(x, y, BLD.z2 + 1, 'iron_bars')
  for (let x = 608; x <= 628; x++) for (const z of [105, 106]) S(x, 69, z, Math.floor(x / 2) % 2 ? 'yellow_terracotta' : 'black_terracotta')
  for (let y = 65; y <= 67; y++) S(ATM[0], y, ATM[1], 'barrier')
  oak(S, 618, 72)
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  shell(); inside(); front()
  B = null
  return b
}
module.exports.build = () => module.exports()

// ---- labels, displays, points, setup (PLAN 5) -----------------------------------------------------------------------------------
module.exports.labels = [{ x: 618.5, y: 70.1, z: 105.03, facing: 'south', text: 'LUCKY PAWN', color: '#ffcc33', scale: 2 }]
module.exports.displays = [{ x: ATM[0] + 0.5, y: 66.5, z: ATM[1] + 0.5, item: 'iron_ingot', cmd: 'donating:furn_atm', yaw: 0, pitch: 0, scale: 1 }]
module.exports.points = {
  PAWN_EXIT: [618.5, 65, 107.5, 0],
  PAWN_HOLO: [623.5, 65, 107.5, 0],
  PAWN_CLERK: CLERK
}
const REGION_LINES = [
  '(G) //pos1 605,63,79',
  '(G) //pos2 631,73,104',
  '(G) /rg define heist_pawn',
  '(C) rg flag -w W heist_pawn passthrough allow'
]
const HEIST_LINES = [
  '(G) /dheist create pawn 0',
  '(G) /dheist set pawn name Lucky Pawn',
  '(G) /dheist set pawn pool 5000',
  '(G) /dheist set pawn level 1',
  '(G) /dheist exit pawn 618.5 65 107.5 0',
  `(G) /dloot add pawn smash ${SAFE.x} 65 ${SAFE.z1} ${SAFE.x} 66 ${SAFE.z2}   # G1 the back cabinet's glass`,
  `(G) /dloot add pawn pile ${REGISTER[0]} 65 ${COUNTER.z} ${REGISTER[1]} 65 ${COUNTER.z} value=1500-3000 style=register piece=125 name=Register   # P2`,
  `(G) /dloot add pawn pile ${SAFE.pileX} 65 ${SAFE.z1} ${SAFE.pileX} 65 ${SAFE.z2} value=1000-2000 style=jewel behind=1 name=Pawned_jewelry   # P3`,
  '(G) /dloot check pawn',
  `(G) /dclerk pawn setat ${CLERK.join(' ')}`,
  ...SHELVES.map(s => `(G) /dclerk pawn shelfat ${s.join(' ')}`),
  '(G) /dheist snapshot pawn',
  '(G) /dheist holo pawn 623.5 65 107.5',
  '(G) /dheist enable pawn'
]
module.exports.setup = {
  regions: [{ id: 'heist_pawn', box: REGION.pawn, flags: ['passthrough allow'], lines: REGION_LINES,
    note: 'the store; the apron stays outside (z > 104)' }],
  heists: [{
    id: 'pawn', difficulty: 0, level: 1, advanced: false, name: 'Lucky Pawn', pool: 5000,
    exit: [618.5, 65, 107.5, 0], holo: [623.5, 65, 107.5],
    snapshot: "with the back cabinet's glass whole",
    lines: HEIST_LINES
  }],
  keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], walls: [], holos: [], bikes: [],
  atms: [`(C) datm add ${ATM[0]} 65 ${ATM[1]}`],
  pois: []
}
module.exports.gps = { nodes: [[5040, 618.5, 65, 107.5, 'PAWN']], links: [[5008, 5040]] }

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}`)
}
