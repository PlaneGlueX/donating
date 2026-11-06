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
  evidence: [950, 445, 1070, 555], // the Police HQ (heist evidence), its front on the avenue's south walk
  mansion: [1160, 560, 1340, 740] // Mansion Hill and the house on top (Hill Drive's strip is the streets')
}
const BUILDINGS = Object.keys(BOX)
// the heist regions [x1, y1, z1, x2, y2, z2]: each module sets its own when it's built (until then a small placeholder)
const REGION = {
  power: [1020, 59, 320, 1090, 81, 370],
  evidence: [975, 55, 460, 1045, 72, 520],
  mansion: [1218, 84, 618, 1282, 104, 672]
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

// The Mansion (iron/PLAN.md section 4): Mansion Hill (a hollow shell), the front court and the gardens, Holloway Manor
// (the foyer and its stair, the laser hall, the library's collapsing floor and code door, the vault room, the gallery's
// cases, the dining room, upstairs the bedroom and the study's master safe). Every write goes through S.
//   node tools/build/iron/mansion.js   -> counts and bounds
// =====================================================================================================================
const MOD = 'mansion'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s)
}
const mix = m => (x, y, z) => pick(x, y, z, m)
const stairs = (m, facing, half = 'bottom') => `${m}_stairs[facing=${facing},half=${half},shape=straight,waterlogged=false]`
const LEAVES = 'oak_leaves[persistent=true]', PLATE = 'stone_pressure_plate[powered=false]'

// ---- the numbers (PLAN 4) -----------------------------------------------------------------------------------------------
const PLAT = { x1: 1195, x2: 1305, z1: 601, z2: 705, y: 90 }
const hillAt = (x, z) => {
  const d = Math.hypot(Math.max(PLAT.x1 - x, 0, x - PLAT.x2), Math.max(PLAT.z1 - z, 0, z - PLAT.z2))
  return Math.max(GROUND_Y, PLAT.y - Math.floor(d / 1.2))
}
const H = { x1: 1220, x2: 1280, z1: 620, z2: 670 }  // the walls (inside x 1221..1279, z 621..669)
const FL = 90, MID = 97, ROOF = 103                   // the ground floor, the upper floor, the roof
const WEST = 1239, EAST = 1261                        // the wings' walls
const GAL = { x1: 1240, x2: 1260, z1: 638, z2: 669 }  // the gallery (double height)
const STAIR = { x1: 1256, x2: 1259, z1: 625 }         // step k (0..6) at z 625 + k, y 91 + k
const OPEN = { z1: 627, z2: 630 }                     // the upper floor's opening over the stair
const PIT = { x1: 1223, x2: 1236, z1: 633, z2: 644, floor: 85 }
const VAULT = { x1: 1224, x2: 1235, z1: 659 }         // the vault's walls (to the back wall z 670)
const ISLANDS = [[1243, 645, 644], [1254, 645, 644], [1243, 660, 659], [1254, 660, 659]] // [x1, pile z, front z]
const SAFE = { x1: 1277, x2: 1279, z1: 639, z2: 642 } // the master safe's cabinet, y 98..101
const wins = (y1, y2) => [
  ...[1223, 1230, 1242, 1256, 1268, 1275].map(a => [a, y1, H.z1, a + 2, y2, H.z1]),
  ...[1244, 1254, 1266, 1273].map(a => [a, y1, H.z2, a + 2, y2, H.z2]),
  ...[628, 640, 655, 663].flatMap(a => [[H.x1, y1, a, H.x1, y2, a + 2], [H.x2, y1, a, H.x2, y2, a + 2]])]
const WINDOWS = [...wins(92, 94), ...wins(99, 101)]
const inWin = (x, y, z) => WINDOWS.some(([x1, y1, z1, x2, y2, z2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2 && z >= z1 && z <= z2)
const inGal = (x, z) => x >= GAL.x1 && x <= GAL.x2 && z >= GAL.z1 && z <= GAL.z2

// ---- Mansion Hill: grass over 2 dirt, hollow below ------------------------------------------------------------------------
function hill () {
  const [x1, z1, x2, z2] = BOX.mansion
  for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) {
    const t = hillAt(x, z)
    if (t <= GROUND_Y) continue
    F(x, Math.max(GROUND_Y, t - 2), z, x, t - 1, z, 'dirt'); S(x, t, z, 'grass_block[snowy=false]')
  }
}

// ---- the court, the hedge, trees, the fountain ------------------------------------------------------------------------------
function grounds () {
  const y = PLAT.y
  F(1238, y, PLAT.z1, 1262, y, H.z1 - 1, mix(MIX.plaza))
  for (const [x, z] of [[1238, 603], [1262, 603], [1238, 616], [1262, 616]]) { F(x, y + 1, z, x, y + 3, z, 'quartz_pillar[axis=y]'); S(x, y + 4, z, 'lantern[hanging=false,waterlogged=false]') }
  for (const x of [1245, 1255]) F(x, y + 1, 616, x, MID - 1, 616, 'quartz_pillar[axis=y]')
  F(1244, MID, 614, 1256, MID, 619, 'smooth_quartz')
  for (let x = PLAT.x1; x <= PLAT.x2; x++) { if (x < 1238 || x > 1262) S(x, y + 1, PLAT.z1, LEAVES); S(x, y + 1, PLAT.z2, LEAVES) }
  for (let z = PLAT.z1; z <= PLAT.z2; z++) { S(PLAT.x1, y + 1, z, LEAVES); S(PLAT.x2, y + 1, z, LEAVES) }
  for (const [x, z] of [[1207, 613], [1293, 613], [1207, 693], [1293, 693], [1228, 690], [1272, 690]]) oak(S, x, z, y)
  for (const [x, z, t] of [[1175, 640, 15], [1180, 600, 14], [1325, 650, 16], [1320, 700, 13], [1200, 725, 15], [1300, 725, 14], [1290, 580, 13], [1215, 585, 16]]) pine(S, x, z, t, hillAt(x, z))
  // the fountain: a stone brick ring, water inside, a quartz spout
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
    const r = Math.hypot(dx, dz)
    if (r <= 3.2) S(1250 + dx, y + 1, 692 + dz, 'water[level=0]')
    else if (r <= 4.2) S(1250 + dx, y + 1, 692 + dz, 'stone_brick_wall')
  }
  F(1250, y + 1, 692, 1250, y + 3, 692, 'quartz_pillar[axis=y]')
}

// ---- the house's shell: floors, walls, roof, lights ----------------------------------------------------------------------------
function shell () {
  for (let x = H.x1; x <= H.x2; x++) for (let z = H.z1; z <= H.z2; z++) {
    const edge = x === H.x1 || x === H.x2 || z === H.z1 || z === H.z2
    const foyer = x >= 1240 && x <= 1260 && z <= 636
    S(x, FL, z, edge ? 'smooth_quartz' : foyer ? ((x + z) % 2 ? 'polished_diorite' : 'polished_blackstone') : inGal(x, z) ? 'smooth_quartz' : 'dark_oak_planks')
    if (edge) {
      const corner = (x === H.x1 || x === H.x2) && (z === H.z1 || z === H.z2)
      for (let y = FL + 1; y <= ROOF; y++) S(x, y, z, inWin(x, y, z) ? 'glass' : corner ? 'quartz_pillar[axis=y]' : y === MID ? 'quartz_bricks' : 'smooth_quartz')
      S(x, ROOF + 1, z, 'smooth_quartz_slab[type=bottom,waterlogged=false]')
      continue
    }
    const sky = x >= GAL.x1 + 3 && x <= GAL.x2 - 3 && z >= GAL.z1 + 3 && z <= GAL.z2 - 3
    S(x, ROOF, z, sky ? 'glass' : 'deepslate_tiles')
    if (!inGal(x, z)) S(x, MID, z, 'spruce_planks')
  }
  F(1249, FL + 1, H.z1, 1251, FL + 4, H.z1, 'air')
  for (let x = H.x1 + 3; x <= H.x2 - 3; x += 6) for (let z = H.z1 + 3; z <= H.z2 - 3; z += 6) {
    const lamp = 'lantern[hanging=true,waterlogged=false]'
    if (inGal(x, z)) { S(x, ROOF - 1, z, lamp); continue }
    if (!(x >= STAIR.x1 - 1 && x <= STAIR.x2 + 1 && z >= STAIR.z1 - 1 && z <= STAIR.z1 + 7)) S(x, MID - 1, z, lamp)
    S(x, ROOF - 1, z, lamp)
  }
}

// ---- inner walls ---------------------------------------------------------------------------------------------------------------
function walls () {
  const W = 'smooth_quartz'
  F(WEST, FL + 1, H.z1 + 1, WEST, ROOF - 1, H.z2 - 1, W); F(EAST, FL + 1, H.z1 + 1, EAST, ROOF - 1, H.z2 - 1, W)
  F(GAL.x1, FL + 1, GAL.z1 - 1, GAL.x2, ROOF - 1, GAL.z1 - 1, W)
  F(H.x1 + 1, FL + 1, 625, WEST - 1, MID - 1, 625, W)                       // the laser hall's south wall
  F(H.x1 + 1, FL + 1, 651, WEST - 1, MID - 1, 651, W)                       // the library's south wall (G1)
  F(EAST + 1, FL + 1, 646, H.x2 - 1, MID - 1, 646, W)                       // the dining room / the kitchen
  for (const x1 of [H.x1 + 1, EAST + 1]) F(x1, MID + 1, 646, x1 + 17, ROOF - 1, 646, W) // upstairs: the attic closed off
  // doorways
  F(WEST, FL + 1, 622, WEST, FL + 3, 624, 'air'); F(EAST, FL + 1, 628, EAST, FL + 3, 630, 'air')
  F(1249, FL + 1, GAL.z1 - 1, 1251, FL + 4, GAL.z1 - 1, 'air'); F(H.x1 + 1, FL + 1, 625, H.x1 + 3, FL + 3, 625, 'air')
  F(1270, FL + 1, 646, 1272, FL + 3, 646, 'air')
  F(WEST, MID + 1, 632, WEST, MID + 3, 634, 'air'); F(EAST, MID + 1, 632, EAST, MID + 3, 634, 'air')
  F(1229, FL + 1, 651, 1230, FL + 3, 651, 'iron_block')                    // G1 the code door
}

// ---- the grand stair, the upper hall's railing -------------------------------------------------------------------------------
function stair () {
  for (let k = 0; k <= 6; k++) {
    const z = STAIR.z1 + k, y = FL + 1 + k
    if (k > 0) F(STAIR.x1, FL + 1, z, STAIR.x2, y - 1, z, 'dark_oak_planks')
    F(STAIR.x1, y, z, STAIR.x2, y, z, stairs('dark_oak', 'south'))
  }
  F(STAIR.x1, MID, OPEN.z1, STAIR.x2, MID, OPEN.z2, 'air')
  const rail = 'dark_oak_fence[east=false,north=false,south=false,waterlogged=false,west=false]'
  for (let z = OPEN.z1; z <= OPEN.z2; z++) { S(STAIR.x1 - 1, MID + 1, z, rail); S(STAIR.x2 + 1, MID + 1, z, rail) }
  F(STAIR.x1 - 1, MID + 1, OPEN.z1 - 1, STAIR.x2 + 1, MID + 1, OPEN.z1 - 1, rail)
  F(1249, FL + 1, H.z1 + 1, 1251, FL + 1, GAL.z1 - 2, 'red_carpet')
}

// ---- the west wing: the library and its pit, the vault room and the vault --------------------------------------------------------
function west () {
  // the pit: a stone box under the library's middle, a ladder back up at its north end
  F(PIT.x1 - 1, 84, PIT.z1 - 2, PIT.x2 + 1, FL - 1, PIT.z2 + 1, 'stone')
  F(PIT.x1, PIT.floor + 1, PIT.z1, PIT.x2, FL - 1, PIT.z2, 'air')
  F(1230, PIT.floor + 1, PIT.z1 - 1, 1230, FL, PIT.z1 - 1, 'ladder[facing=south,waterlogged=false]')
  F(PIT.x1, FL, PIT.z1, PIT.x2, FL, PIT.z2, 'stripped_dark_oak_wood[axis=x]')                     // the collapsing floor
  for (const x of [H.x1 + 1, WEST - 1]) for (let z = 627; z <= 649; z++) for (let y = FL + 1; y <= FL + 5; y++)
    if (!inWin(x - 1, y, z)) S(x, y, z, 'bookshelf')
  F(1228, FL + 1, 646, 1231, FL + 1, 648, 'stripped_spruce_wood[axis=x]')                         // a reading table
  for (const [x, z] of [[1222, 626], [1237, 626]]) S(x, MID - 1, z, 'polished_blackstone')        // the cameras' mounts
  // the vault room: plates, the vault (G2 in its front), pallets
  for (const x of [1227, 1233]) S(x, FL + 1, VAULT.z1 - 2, PLATE)
  for (let y = FL + 1; y <= MID - 1; y++) {
    F(VAULT.x1, y, VAULT.z1, VAULT.x2, y, VAULT.z1, 'polished_deepslate')
    F(VAULT.x1, y, VAULT.z1, VAULT.x1, y, H.z2 - 1, 'polished_deepslate'); F(VAULT.x2, y, VAULT.z1, VAULT.x2, y, H.z2 - 1, 'polished_deepslate')
  }
  F(VAULT.x1 + 1, FL, VAULT.z1 + 1, VAULT.x2 - 1, FL, H.z2 - 1, 'polished_deepslate')
  F(1229, FL + 1, VAULT.z1, 1231, FL + 3, VAULT.z1, 'iron_block')                                 // G2
  F(1226, FL + 1, 668, 1227, FL + 1, 668, 'stripped_oak_wood[axis=x]'); F(1232, FL + 1, 668, 1233, FL + 1, 668, 'stripped_oak_wood[axis=x]')
  F(1225, FL + 1, 662, 1225, FL + 1, 667, 'stripped_oak_wood[axis=z]')
}

// ---- the gallery: the case islands (the Jewelry store's), sculptures, the masterpiece -------------------------------------------
function island (x1, pileZ, frontZ) {
  const backZ = pileZ + (pileZ - frontZ), x2 = x1 + 3
  for (let x = x1 - 1; x <= x2 + 1; x++) for (const z of [backZ, pileZ, frontZ]) {
    S(x, FL + 1, z, 'polished_deepslate')
    const end = x === x1 - 1 || x === x2 + 1
    for (const y of [FL + 2, FL + 3]) S(x, y, z, end ? 'glass_pane' : z === pileZ ? 'air' : 'glass')
    S(x, FL + 4, z, 'glass')
  }
}
function gallery () {
  for (const [x1, pz, fz] of ISLANDS) island(x1, pz, fz)
  for (const x of [1243, 1244, 1256, 1257]) S(x, FL + 1, 652, 'chiseled_quartz_block')
  S(1250, FL + 1, 667, 'chiseled_quartz_block'); S(1251, FL + 1, 667, 'chiseled_quartz_block')
  for (const [x, z] of [[1249, 650], [1251, 650], [1250, 656]]) S(x, FL + 1, z, PLATE)
}

// ---- the east wing: the dining room, the kitchen; upstairs the bedroom and the study --------------------------------------------
function rooms () {
  F(1266, FL + 1, 634, 1275, FL + 1, 636, 'stripped_dark_oak_wood[axis=x]')
  for (let x = 1267; x <= 1274; x += 2) { S(x, FL + 1, 633, stairs('dark_oak', 'south')); S(x, FL + 1, 637, stairs('dark_oak', 'north')) }
  F(1278, FL + 1, 630, 1278, FL + 1, 632, 'stripped_dark_oak_wood[axis=z]')                       // the sideboard (silverware)
  S(1279, MID - 1, 621, 'polished_blackstone')
  F(EAST + 2, FL + 1, H.z2 - 1, H.x2 - 1, FL + 1, H.z2 - 1, 'smooth_stone')
  for (const x of [1266, 1270, 1274]) S(x, FL + 1, H.z2 - 1, 'furnace[facing=north,lit=false]')
  // the bedroom
  for (const x of [1229, 1230]) { S(x, MID + 1, 622, 'red_bed[facing=north,part=head,occupied=false]'); S(x, MID + 1, 623, 'red_bed[facing=north,part=foot,occupied=false]') }
  F(1222, MID + 1, 640, 1223, MID + 1, 640, 'dark_oak_planks')                                     // the dresser (jewelry box)
  F(1236, MID + 1, 622, 1237, MID + 3, 623, 'dark_oak_planks')
  // the study: the desk, shelves, the master safe's cabinet (G7 its face, the shelf inside)
  F(1268, MID + 1, 630, 1271, MID + 1, 630, 'stripped_spruce_wood[axis=x]'); S(1269, MID + 1, 631, stairs('spruce', 'north'))
  for (let x = EAST + 2; x <= 1272; x++) if (x < 1268 || x > 1270) F(x, MID + 1, H.z1 + 1, x, MID + 4, H.z1 + 1, 'bookshelf')
  F(SAFE.x1, MID + 1, SAFE.z1, SAFE.x2, MID + 4, SAFE.z2, 'iron_block')
  F(1278, MID + 1, 640, 1278, MID + 1, 641, 'smooth_stone'); F(1278, MID + 2, 640, 1278, MID + 3, 641, 'air')
  for (const z of [640, 641]) S(1274, MID + 1, z, PLATE)
  S(EAST + 1, ROOF - 1, H.z1 + 1, 'polished_blackstone')
  for (const [x, z] of [[1240, 621], [1260, 621]]) S(x, MID - 1, z, 'polished_blackstone')
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  hill(); grounds(); shell(); walls(); stair(); west(); gallery(); rooms()
  B = null
  return b
}
module.exports.build = () => module.exports()

// ---- labels, displays, points, setup (PLAN 4) -----------------------------------------------------------------------------------
module.exports.labels = [{ x: 1250.5, y: 99.4, z: 619.97, facing: 'north', text: 'HOLLOWAY MANOR', color: '#ffffff', scale: 2.5 }]
module.exports.displays = []
module.exports.points = {
  MANSION_EXIT: [1250.5, 91, 611.5, 180],
  MANSION_HOLO: [1256.5, 95, 611.5, 180],
  MANSION_CHASE: [1250.5, 95, 645.5, 0],
  MANSION_COP_1: [1250.5, 91, 605.5, 0],
  MANSION_COP_2: [1250.5, 91, 682.5, 180]
}
const REGION_LINES = [
  `(G) //pos1 ${REGION.mansion.slice(0, 3).join(',')}`,
  `(G) //pos2 ${REGION.mansion.slice(3).join(',')}`,
  '(G) /rg define heist_mansion',
  '(C) rg flag -w W heist_mansion passthrough allow'
]
const LOW = 91.4, DUCK = 92.65
const laser = (x, y, o) => `(G) /dtrap add mansion laser ${x} ${y} 620.0 ${x} ${y} 626.0 ${o}`
const BLINK = n => `damage=2 blink=true on=2 off=2 offset=${n}`
const HEIST_LINES = [
  '(G) /dheist create mansion 4',
  '(G) /dheist set mansion name Mansion',
  '(G) /dheist set mansion advanced true',
  '(G) /dheist set mansion pool 70000',
  '(G) /dheist set mansion level 60',
  '(G) /dheist exit mansion 1250.5 91 611.5 180',
  '# gates (G1..G7): first, so the piles\' behind= numbers match',
  '(G) /dloot add mansion safe 1229 91 651 1230 93 651                       # G1 the library\'s code door',
  '(G) /dloot add mansion drill 1229 91 659 1231 93 659 time=120 jams=3 claim=15 alarm=true   # G2 the vault door',
  ...ISLANDS.map(([x1, , fz], i) => `(G) /dloot add mansion smash ${x1} 92 ${fz} ${x1 + 3} 93 ${fz}   # G${i + 3}`),
  '(G) /dloot add mansion safe 1277 98 640 1277 99 641                       # G7 the master safe',
  '# piles (in-game ids 8..20)',
  '(G) /dloot add mansion pile 1278 91 630 1278 91 632 value=1000-2000 style=goods piece=500 take=2.0 name=Silverware',
  '(G) /dloot add mansion pile 1243 91 652 1244 91 652 value=2000-4000 style=art name=Sculpture',
  '(G) /dloot add mansion pile 1256 91 652 1257 91 652 value=2000-4000 style=art name=Sculpture',
  ...ISLANDS.map(([x1, pz], i) => `(G) /dloot add mansion pile ${x1} 91 ${pz} ${x1 + 3} 91 ${pz} value=2000-3500 style=jewel behind=${i + 3} name=Display_case`),
  '(G) /dloot add mansion pile 1226 91 668 1227 91 668 value=10000-15000 style=bullion behind=2 name=Bullion',
  '(G) /dloot add mansion pile 1232 91 668 1233 91 668 value=10000-15000 style=bullion behind=2 name=Bullion',
  '(G) /dloot add mansion pile 1225 91 662 1225 91 667 value=8000-12000 style=cash piece=1000 take=4.0 behind=2 name=Cash_pallets',
  '(G) /dloot add mansion pile 1278 98 640 1278 98 641 value=6000-9000 style=cash piece=2500 take=4.0 behind=7 name=Master_safe',
  '(G) /dloot add mansion pile 1222 98 640 1223 98 640 value=1500-3000 style=jewel piece=500 name=Jewelry_box',
  '(G) /dloot add mansion pile 1250 91 667 1251 91 667 value=4000-6000 style=art piece=3000 name=Masterpiece',
  '(G) /dloot check mansion',
  '# traps',
  '(G) /dtrap add mansion camera 1240.5 95.5 621.5 -45 30 effect=alarm angle=25 range=14    # foyer west',
  '(G) /dtrap add mansion camera 1260.5 95.5 621.5 45 30 effect=alarm angle=25 range=14     # foyer east',
  '(G) /dtrap add mansion camera 1222.5 95.5 626.5 0 30 effect=alarm angle=25 range=14      # library, the west ledge',
  '(G) /dtrap add mansion camera 1237.5 95.5 626.5 0 30 effect=alarm angle=25 range=14      # library, the east ledge',
  '(G) /dtrap add mansion camera 1279.5 95.5 621.5 45 30 effect=alarm angle=25 range=12     # dining room',
  '(G) /dtrap add mansion camera 1262.5 101.5 621.5 -45 30 effect=alarm angle=25 range=12   # study',
  laser('1236.5', DUCK, 'damage=2'), laser('1233.5', LOW, 'damage=2'),
  laser('1230.5', LOW, BLINK(0)), laser('1230.5', DUCK, BLINK(2)),
  laser('1227.5', DUCK, 'damage=2'), laser('1224.5', LOW, 'damage=2'),
  ...[[1227, 91, 657], [1233, 91, 657], [1249, 91, 650], [1251, 91, 650], [1250, 91, 656], [1274, 98, 640], [1274, 98, 641]].map(p => `(G) /dtrap add mansion plate ${p.join(' ')} damage=2`),
  // the library's collapsing floor in 2-deep strips, each cracking on its own: a sprinter outruns the collapse, a walker
  // falls (mansion-23..28 in game)
  ...[633, 635, 637, 639, 641, 643].map(z => `(G) /dtrap add mansion floor ${PIT.x1} ${FL} ${z} ${PIT.x2} ${FL} ${z + 1} damage=2 depth=4`),
  '# lockdown (iron bars over every window), cops, hologram, open',
  ...WINDOWS.map(w => `(G) /dheist lock mansion add ${w.join(' ')} iron_bars`),
  '(G) /dcops mansion add 1250.5 91 605.5',
  '(G) /dcops mansion add 1250.5 91 682.5',
  '(G) /dheist snapshot mansion',
  '(G) /dheist holo mansion 1256.5 95 611.5',
  '(G) /dheist enable mansion'
]
module.exports.setup = {
  regions: [{ id: 'heist_mansion', box: REGION.mansion, flags: ['passthrough allow'], lines: REGION_LINES,
    note: 'the house and the library\'s pit (y 84..104); the court and the gardens stay outside' }],
  heists: [{
    id: 'mansion', difficulty: 4, level: 60, advanced: true, name: 'Mansion', pool: 70000, escape: '10:00', cooldown: '30:00',
    exit: [1250.5, 91, 611.5, 180], holo: [1256.5, 95, 611.5], chase: [1250.5, 95, 645.5],
    snapshot: 'with the house clean: G1-G7 closed, the floor and the plates up, no bars in the windows',
    lines: HEIST_LINES
  }],
  keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], walls: [], holos: [], bikes: [],
  pois: [],
  atms: []
}
module.exports.gps = { nodes: [[6030, 1250.5, 91, 611.5, 'MANSION']], links: [[6005, 6030]] }

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}`)
}
