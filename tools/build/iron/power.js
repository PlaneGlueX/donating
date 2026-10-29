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

// The Power Plant (iron/PLAN.md section 2): the fenced yard with its gate on Main Avenue East, two hollow cooling towers,
// the transformer yard, and the plant: the entrance hall, the control room's payroll safe, the turbine hall with its pit,
// collapsing catwalk and laser walkways, and the copper cage. Every write goes through S (clipped to the module's columns).
//   node tools/build/iron/power.js   -> counts and bounds
// =====================================================================================================================
const MOD = 'power'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s)
}
const mix = m => (x, y, z) => pick(x, y, z, m)

// ---- the plant's numbers (PLAN 2) -----------------------------------------------------------------------------------------
const FENCE = { x1: 952, x2: 1118, z1: 272, z2: 412 }, GATE = [1028, 1037]
const BLD = { x1: 1020, x2: 1090, z1: 320, z2: 370 }  // the walls (inside x 1021..1089, z 321..369)
const TOP = 80, ROOF = 81, LOW_CEIL = 71                // the walls' top, the roof; the front rooms' ceiling
const HALL_Z = 357, CTRL_X = 1045                       // the hall's south wall; the control room's east wall
const DOOR = [1053, 1056]                               // the front door in z 370 (y 65..68)
const PIT = { x1: 1040, x2: 1070, z1: 330, z2: 346, floor: 59 }
const CATWALK = [1054, 1056]
const CAGE = { x1: 1046, x2: 1064, z1: 321, z2: 327 }, CAGE_DOOR = [1054, 1056]
const TOWERS = [[972, 300], [972, 350]]
// the windows (each a lockdown box): [x1, y1, z1, x2, y2, z2]
const WIN_S = [[1023, 1025], [1032, 1034], [1041, 1043], [1063, 1065], [1072, 1074], [1082, 1084]].map(([a, b]) => [a, 66, BLD.z2, b, 68, BLD.z2])
const WIN_N = [[1023, 1026], [1033, 1036], [1043, 1046], [1053, 1056], [1063, 1066], [1073, 1076], [1083, 1086]].map(([a, b]) => [a, 73, BLD.z1, b, 76, BLD.z1])
const WIN_EW = [[323, 326], [333, 336], [343, 346], [353, 356]].flatMap(([a, b]) => [[BLD.x1, 73, a, BLD.x1, 76, b], [BLD.x2, 73, a, BLD.x2, 76, b]])
const TRANSOM = [DOOR[0], 69, BLD.z2, DOOR[1], 70, BLD.z2]
const WINDOWS = [...WIN_S, ...WIN_N, ...WIN_EW, TRANSOM]
const inWin = (x, y, z) => WINDOWS.some(([x1, y1, z1, x2, y2, z2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2 && z >= z1 && z <= z2)
const GLASS = 'gray_stained_glass'

// ---- the yard: the fence, the gate and booth, the drive and parking -------------------------------------------------------
function yard () {
  for (let x = FENCE.x1; x <= FENCE.x2; x++) for (let z = FENCE.z1; z <= FENCE.z2; z++) {
    if (x !== FENCE.x1 && x !== FENCE.x2 && z !== FENCE.z1 && z !== FENCE.z2) continue
    if (z === FENCE.z2 && x >= GATE[0] && x <= GATE[1]) continue
    S(x, 65, z, 'stone_brick_wall'); S(x, 66, z, 'iron_bars'); S(x, 67, z, 'iron_bars')
  }
  // the drive from the avenue's walk to the plant's door, the apron along the front, the parking strip
  F(GATE[0], 64, BLD.z2 + 1, GATE[1], 64, 415, mix(MIX.plaza))
  F(BLD.x1, 64, BLD.z2 + 1, BLD.x2, 64, BLD.z2 + 10, mix(MIX.plaza))
  F(1040, 64, 395, 1060, 64, 405, mix(MIX.plaza))                 // not asphalt: the GPS reads asphalt as a street
  for (let x = 1040; x <= 1060; x += 4) F(x, 64, 395, x, 64, 399, 'polished_diorite')
  // the guard booth beside the gate
  F(1039, 64, 408, 1041, 64, 410, 'smooth_stone')
  F(1039, 65, 408, 1041, 67, 410, 'white_concrete'); F(1040, 65, 409, 1040, 67, 409, 'air')
  F(1039, 66, 409, 1039, 67, 409, 'glass'); F(1041, 66, 409, 1041, 67, 409, 'glass'); F(1040, 66, 410, 1040, 67, 410, 'glass')
  S(1040, 65, 408, 'air'); S(1040, 66, 408, 'air')
  F(1039, 68, 408, 1041, 68, 410, 'smooth_stone_slab[type=bottom,waterlogged=false]')
  // a few pines inside the fence along the avenue
  for (const x of [962, 986, 1010, 1078, 1102]) pine(S, x, 404, 13 + (x % 3))
}

// ---- the cooling towers: hollow hyperboloid shells, outside the region ------------------------------------------------------
// r(y) = 9 √(1 + ((y − 100) / 33.6)²): 13 at the foot (y 65), 9 at the waist (y 100), 9.6 at the lip (y 112)
const towerR = y => 9 * Math.sqrt(1 + ((y - 100) / 33.6) ** 2)
function towers () {
  for (const [cx, cz] of TOWERS) {
    for (let y = 65; y <= 112; y++) {
      const r = towerR(y)
      for (let x = cx - 14; x <= cx + 14; x++) for (let z = cz - 14; z <= cz + 14; z++) {
        const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz)
        if (d < r - 0.6 || d > r + 0.6) continue
        S(x, y, z, y >= 104 && y <= 106 ? 'white_concrete' : y === 112 ? 'smooth_stone' : 'light_gray_concrete')
      }
    }
    F(cx - 1, 65, cz + 11, cx + 1, 67, cz + 14, 'air') // the doorway on the south side
  }
}

// ---- the transformer yard -----------------------------------------------------------------------------------------------------
function transformers () {
  for (let x = 1096; x <= 1114; x++) for (let z = 330; z <= 370; z++) {
    if (x !== 1096 && x !== 1114 && z !== 330 && z !== 370) { S(x, 64, z, 'gravel'); continue }
    if (x === 1096 && z >= 349 && z <= 351) continue
    S(x, 64, z, 'gravel'); S(x, 65, z, 'iron_bars'); S(x, 66, z, 'iron_bars')
  }
  for (const [x, z] of [[1101, 336], [1109, 336], [1101, 363], [1109, 363]]) {
    F(x - 2, 64, z - 2, x + 2, 64, z + 2, 'smooth_stone')
    F(x - 1, 65, z - 1, x + 1, 67, z + 1, 'iron_block'); F(x - 1, 66, z - 2, x + 1, 66, z - 2, 'polished_blackstone')
    for (const dx of [-1, 0, 1]) { S(x + dx, 68, z, 'lightning_rod[facing=up,powered=false,waterlogged=false]'); S(x + dx, 69, z, 'iron_chain[axis=y,waterlogged=false]') }
  }
}

// ---- the plant's shell: floor, walls, roof, chimneys ------------------------------------------------------------------------
function shell () {
  F(BLD.x1, 64, BLD.z1, BLD.x2, 64, BLD.z2, mix(MIX.plaza))
  for (let x = BLD.x1; x <= BLD.x2; x++) for (let z = BLD.z1; z <= BLD.z2; z++) {
    const edge = x === BLD.x1 || x === BLD.x2 || z === BLD.z1 || z === BLD.z2
    if (!edge) continue
    const pil = ((z === BLD.z1 || z === BLD.z2) && (x - BLD.x1) % 10 === 0) || ((x === BLD.x1 || x === BLD.x2) && (z - BLD.z1) % 10 === 0)
    for (let y = 65; y <= TOP; y++) S(x, y, z, inWin(x, y, z) ? GLASS : pil || y === 65 || y === TOP ? mix(MIX.stonebrick) : mix(MIX.brick))
    S(x, ROOF + 1, z, 'stone_brick_wall')
  }
  F(BLD.x1, ROOF, BLD.z1, BLD.x2, ROOF, BLD.z2, 'gray_concrete')
  F(DOOR[0], 65, BLD.z2, DOOR[1], 68, BLD.z2, 'air')
  // two chimneys on the roof
  for (const [cx, cz] of [[1030, 326], [1080, 326]]) for (let y = ROOF + 1; y <= 106; y++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    if (!dx && !dz) { S(cx, y, cz, 'air'); continue }
    S(cx + dx, y, cz + dz, y >= 103 ? 'stone_bricks' : mix(MIX.brick))
  }
}

// ---- inside -----------------------------------------------------------------------------------------------------------------------
function inside () {
  // the front rooms' ceiling and the walls between them and the hall
  F(BLD.x1 + 1, LOW_CEIL, HALL_Z, BLD.x2 - 1, LOW_CEIL, BLD.z2 - 1, 'smooth_stone')
  F(BLD.x1 + 1, 65, HALL_Z, BLD.x2 - 1, TOP, HALL_Z, mix(MIX.brick))
  F(CTRL_X, 65, HALL_Z + 1, CTRL_X, LOW_CEIL - 1, BLD.z2 - 1, mix(MIX.brick))
  F(DOOR[0] + 1, 65, HALL_Z, DOOR[1], 67, HALL_Z, 'air')         // the doorway into the hall, x 1054..1056
  F(CTRL_X, 65, 362, CTRL_X, 66, 363, 'air')                      // the control room's door
  F(1026, 66, HALL_Z, 1040, 68, HALL_Z, 'glass')                  // the control room's window onto the hall
  for (let x = 1024; x <= 1088; x += 6) for (const z of [360, 366]) S(x, LOW_CEIL, z, 'sea_lantern')

  // the entrance hall: the security desk (P4 on it), lockers along the hall wall, benches
  F(1058, 65, 361, 1064, 65, 361, 'polished_andesite'); F(1058, 65, 362, 1058, 65, 363, 'polished_andesite'); F(1064, 65, 362, 1064, 65, 363, 'polished_andesite')
  F(1060, 65, 362, 1062, 65, 362, 'smooth_stone')                 // P4's desk top
  for (let x = 1070; x <= 1088; x++) { S(x, 65, 358, 'iron_block'); S(x, 66, 358, 'iron_trapdoor[facing=south,half=bottom,open=true,powered=false,waterlogged=false]') }
  for (const x of [1048, 1049, 1050, 1080, 1081, 1082]) S(x, 65, 368, 'spruce_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]')

  // the control room: consoles along the hall wall, the payroll cabinet on the west wall (G1, P1 inside)
  for (let x = 1025; x <= 1041; x++) { S(x, 65, 358, 'polished_blackstone'); S(x, 66, 358, h(x, 66, 358) < 50 ? 'redstone_lamp[lit=true]' : 'black_stained_glass') }
  F(1021, 65, 362, 1023, 68, 365, 'iron_block')
  S(1022, 65, 363, 'smooth_stone'); S(1022, 65, 364, 'smooth_stone')   // P1's shelf
  F(1022, 66, 363, 1022, 67, 364, 'air')                               // G1 (x 1023, y 65..66) closes the front
  for (const z of [367, 368]) S(1030, 65, z, 'spruce_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]')

  // the turbine hall: the pit, its lining, ladder and turbines; the catwalk with railings
  F(PIT.x1 - 1, PIT.floor, PIT.z1 - 1, PIT.x2 + 1, 63, PIT.z2 + 1, 'smooth_stone')
  F(PIT.x1, PIT.floor, PIT.z1, PIT.x2, PIT.floor, PIT.z2, mix(MIX.darkstone))
  F(PIT.x1, PIT.floor + 1, PIT.z1, PIT.x2, 64, PIT.z2, 'air')
  for (let y = PIT.floor + 1; y <= 64; y++) S(1042, y, PIT.z2, 'ladder[facing=north,waterlogged=false]')
  for (const cx of [1047, 1064]) for (let z = PIT.z1 + 2; z <= PIT.z2 - 2; z++) for (let x = cx - 4; x <= cx + 3; x++) for (let y = PIT.floor; y <= 66; y++) {
    const dd = Math.hypot(x + 0.5 - cx, y + 0.5 - 63)
    if (dd > 3.6) continue
    const cap = z === PIT.z1 + 2 || z === PIT.z2 - 2
    S(x, y, z, cap ? 'polished_deepslate' : (z - PIT.z1) % 4 === 0 ? 'iron_block' : 'light_gray_concrete')
  }
  F(CATWALK[0], 64, PIT.z1, CATWALK[1], 64, PIT.z2, 'waxed_exposed_cut_copper')
  for (const x of [CATWALK[0] - 1, CATWALK[1] + 1]) F(x, 65, PIT.z1, x, 65, PIT.z2, 'iron_bars')

  // pipe runs along both long walls by the pit (the walkways' lasers start at them), the copper wire reels at the walkways'
  // far (north) ends (P5 west, P6 east)
  for (const x of [BLD.x1 + 1, BLD.x2 - 1]) { F(x, 65, PIT.z1, x, 65, PIT.z2, 'light_gray_concrete'); F(x, 66, PIT.z1, x, 66, PIT.z2, 'iron_block') }
  F(1022, 65, 323, 1022, 65, 325, 'waxed_copper_block'); F(1088, 65, 323, 1088, 65, 325, 'waxed_copper_block')

  // the copper cage: bars on three sides, G2 in the front, the spools P2 / P3 inside, plates in front
  for (let y = 65; y <= 71; y++) {
    for (let x = CAGE.x1; x <= CAGE.x2; x++) S(x, y, CAGE.z2, 'iron_bars')
    for (let z = CAGE.z1; z < CAGE.z2; z++) { S(CAGE.x1, y, z, 'iron_bars'); S(CAGE.x2, y, z, 'iron_bars') }
  }
  F(CAGE_DOOR[0], 65, CAGE.z2, CAGE_DOOR[1], 67, CAGE.z2, 'iron_block')                           // G2
  F(1048, 65, 322, 1050, 65, 322, 'waxed_cut_copper'); F(1060, 65, 322, 1062, 65, 322, 'waxed_cut_copper')
  for (const x of [1051, 1059]) S(x, 65, 328, 'stone_pressure_plate[powered=false]')

  // the hall's lights: lanterns on chains from the roof
  for (let x = 1026; x <= 1086; x += 10) for (const z of [324, 338, 352]) {
    if (x >= PIT.x1 && x <= PIT.x2 && z >= PIT.z1 && z <= PIT.z2) continue
    for (let y = 75; y <= TOP; y++) S(x, y, z, 'iron_chain[axis=y,waterlogged=false]')
    S(x, 74, z, 'lantern[hanging=true,waterlogged=false]')
  }
  // the cameras' mounts
  for (const [x, y, z] of [[1088, 70, 368], [1043, 70, 359], [1022, 78, 322], [1088, 78, 322]]) S(x, y, z, 'polished_blackstone')
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  yard(); towers(); transformers(); shell(); inside()
  B = null
  return b
}
module.exports.build = () => module.exports()

// ---- labels, displays, points, setup (PLAN 2) -----------------------------------------------------------------------------------
module.exports.labels = [{ x: 1055.0, y: 74.5, z: 371.03, facing: 'south', text: 'IRONVALE POWER', color: '#f2c94c', scale: 3 }]
module.exports.displays = []
module.exports.points = {
  POWER_EXIT: [1054.5, 65, 374.5, 0],
  POWER_HOLO: [1060.5, 70, 374.5, 0],
  POWER_CHASE: [1055.5, 65, 352.5, 0],
  POWER_COP_1: [1032.5, 65, 392.5, 180],
  POWER_COP_2: [1078.5, 65, 392.5, 180]
}
const REGION_LINES = [
  `(G) //pos1 ${REGION.power.slice(0, 3).join(',')}`,
  `(G) //pos2 ${REGION.power.slice(3).join(',')}`,
  '(G) /rg define heist_power',
  '(C) rg flag -w W heist_power passthrough allow'
]
const laser = (z, o) => [[1022.0, 1040.0], [1071.0, 1089.0]].map(([a, b]) => `(G) /dtrap add power laser ${a} 65.4 ${z} ${b} 65.4 ${z} ${o}`)
const BLINK = n => `damage=2 blink=true on=2 off=2 offset=${n}`
const HEIST_LINES = [
  '(G) /dheist create power 3',
  '(G) /dheist set power name Power Plant',
  '(G) /dheist set power advanced true',
  '(G) /dheist set power pool 32000',
  '(G) /dheist set power level 25',
  '(G) /dheist exit power 1054.5 65 374.5 0',
  '# gates (G1, G2): first, so the piles\' behind= numbers match',
  '(G) /dloot add power safe 1023 65 363 1023 66 364                     # G1 the payroll safe',
  '(G) /dloot add power drill 1054 65 327 1056 67 327 time=75 jams=2 claim=10 alarm=true   # G2 the cage door',
  '# piles (P1..P6)',
  '(G) /dloot add power pile 1022 65 363 1022 65 364 value=4000-6000 style=cash piece=500 take=3.0 behind=1 name=Payroll',
  '(G) /dloot add power pile 1048 65 322 1050 65 322 value=5000-8000 style=goods piece=1500 take=3.0 behind=2 name=Copper_spools',
  '(G) /dloot add power pile 1060 65 322 1062 65 322 value=5000-8000 style=goods piece=1500 take=3.0 behind=2 name=Copper_spools',
  '(G) /dloot add power pile 1060 65 362 1062 65 362 value=800-1500 style=register piece=250 take=2.0 name=Petty_cash',
  '(G) /dloot add power pile 1022 65 323 1022 65 325 value=1500-2500 style=goods piece=500 take=1.5 name=Copper_wire',
  '(G) /dloot add power pile 1088 65 323 1088 65 325 value=1500-2500 style=goods piece=500 take=1.5 name=Copper_wire',
  '(G) /dloot check power',
  '# traps',
  '(G) /dtrap add power camera 1088.5 69.5 368.5 135 30 effect=alarm angle=25 range=12   # entrance hall',
  '(G) /dtrap add power camera 1043.5 69.5 359.5 90 30 effect=alarm angle=25 range=12    # control room (G1 out of its range)',
  '(G) /dtrap add power camera 1022.5 77.5 322.5 -45 35 effect=alarm angle=25 range=16 sweep=60 period=8   # hall north-west',
  '(G) /dtrap add power camera 1088.5 77.5 322.5 45 35 effect=alarm angle=25 range=16 sweep=60 period=8    # hall north-east',
  ...laser('334.5', BLINK(0)), ...laser('338.5', BLINK(2)), ...laser('342.5', BLINK(0)),
  '(G) /dtrap add power plate 1051 65 328 damage=2',
  '(G) /dtrap add power plate 1059 65 328 damage=2',
  // the catwalk in 2-deep strips, each cracking on its own: a sprinter outruns the collapse, a walker falls (2026-10-29;
  // one 17-long floor was never crossable). After the plates, as in game (power-14..22).
  ...Array.from({ length: 9 }, (_, i) => PIT.z1 + 2 * i).map(z => `(G) /dtrap add power floor ${CATWALK[0]} 64 ${z} ${CATWALK[1]} 64 ${Math.min(z + 1, PIT.z2)} damage=2 depth=4`),
  '# lockdown (iron bars over every window and the transom), cops, hologram, open',
  ...WINDOWS.map(w => `(G) /dheist lock power add ${w.join(' ')} iron_bars`),
  '(G) /dcops power add 1032.5 65 392.5',
  '(G) /dcops power add 1078.5 65 392.5',
  '(G) /dheist snapshot power',
  '(G) /dheist holo power 1060.5 70 374.5',
  '(G) /dheist enable power'
]
module.exports.setup = {
  regions: [{ id: 'heist_power', box: REGION.power, flags: ['passthrough allow'], lines: REGION_LINES,
    note: 'the plant, down to the turbine pit\'s floor (y 59..81); the yard, the towers and the transformers stay outside' }],
  heists: [{
    id: 'power', difficulty: 3, level: 25, advanced: true, name: 'Power Plant', pool: 32000, escape: '8:00', cooldown: '15:00',
    exit: [1054.5, 65, 374.5, 0], holo: [1060.5, 70, 374.5], chase: [1055.5, 65, 352.5],
    snapshot: 'with the room clean: G1-G2 closed, the catwalk and the plates up, no bars in the windows',
    lines: HEIST_LINES
  }],
  keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], walls: [], holos: [], bikes: [],
  pois: ['(C) dpoi addat landmark 1054 65 374 Power Plant'],
  atms: []
}
module.exports.gps = { nodes: [[6010, 1054.5, 65, 374.5, 'POWER'], [6011, 1032.5, 65, 410.5, 'POWER_GATE']], links: [[6002, 6011], [6011, 6010]] }

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}`)
}
