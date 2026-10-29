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

// The Police HQ (iron/PLAN.md section 3): the front plaza on Main Avenue East, the station (the lobby and its front desk,
// the bullpen, the sergeant's office and its safe, the back hall, the stair), the basement's laser corridor and the
// evidence room's cage, and the back lot. Every write goes through S (clipped to the module's columns).
//   node tools/build/iron/evidence.js   -> counts and bounds
// =====================================================================================================================
const MOD = 'evidence'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s)
}
const mix = m => (x, y, z) => pick(x, y, z, m)
const stairs = (m, facing, half = 'bottom') => `${m}_stairs[facing=${facing},half=${half},shape=straight,waterlogged=false]`

// ---- the station's numbers (PLAN 3) ---------------------------------------------------------------------------------------
const BLD = { x1: 975, x2: 1045, z1: 460, z2: 520 }  // the walls (inside x 976..1044, z 461..519)
const ROOF = 72, B1 = 56, B1_CEIL = 62               // the roof (the rooms' ceiling); the basement's floor and ceiling
const DOOR = [1008, 1011], BACK_DOOR = [1028, 1029]  // the front door in z 460 (y 65..68), the back door in z 520 (y 65..67)
const LOBBY_Z = 475, BACK_Z = 501                    // the walls between the lobby, the bullpen and the back rooms
const STAIR = { x1: 1008, x2: 1011, z1: 504, z2: 511 } // down south: the step at z 503 + k is a stair block at y 65 - k
const LANDING = { x1: 1008, x2: 1017, z1: 512, z2: 519 }
const CORR = { x1: 1014, x2: 1017, z1: 479, z2: 511 }  // the basement corridor (walls x 1013 and 1018)
const ROOM = { x1: 990, x2: 1030, z1: 461, z2: 477 }   // the evidence room (its wall z 478, the doorway x 1014..1017)
const CAGE = { x1: 995, x2: 1025, z: 473 }, CAGE_DOOR = [1009, 1011]
const WIN_F = [[979, 981], [986, 988], [993, 995], [1000, 1002], [1017, 1019], [1024, 1026], [1031, 1033], [1038, 1040]].map(([a, b]) => [a, 66, BLD.z1, b, 68, BLD.z1])
const WIN_S = [[465, 467], [472, 474], [481, 483], [488, 490], [495, 497], [506, 508], [513, 515]].flatMap(([a, b]) => [[BLD.x1, 66, a, BLD.x1, 68, b], [BLD.x2, 66, a, BLD.x2, 68, b]])
const WINDOWS = [...WIN_F, ...WIN_S]
const inWin = (x, y, z) => WINDOWS.some(([x1, y1, z1, x2, y2, z2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2 && z >= z1 && z <= z2)

// ---- outside: the front plaza and the back lot ---------------------------------------------------------------------------
function outside () {
  F(985, 64, 445, 1035, 64, BLD.z1 - 1, mix(MIX.plaza))
  for (let x = 986; x <= 1034; x += 3) if (x < 1004 || x > 1015) S(x, 65, 446, 'andesite_wall')
  for (let y = 65; y <= 77; y++) S(1000, y, 452, 'andesite_wall')
  F(1001, 75, 452, 1003, 76, 452, 'blue_wool'); S(1000, 78, 452, 'lantern[hanging=false,waterlogged=false]')
  for (const x of [990, 1030]) { F(x - 1, 64, 451, x + 1, 64, 453, 'dirt'); shrub(S, x, 452) }
  // the back lot, fenced, a gap on its west side
  F(985, 64, BLD.z2 + 1, 1035, 64, 550, mix(MIX.plaza))
  for (let x = 985; x <= 1035; x++) for (let z = BLD.z2 + 1; z <= 550; z++) {
    if (x !== 985 && x !== 1035 && z !== 550) continue
    if (x === 985 && z >= 535 && z <= 538) continue
    S(x, 65, z, 'iron_bars'); S(x, 66, z, 'iron_bars')
  }
}

// ---- the basement: a stone brick block under the back half, the rooms carved out of it -------------------------------------
function basement () {
  F(989, 55, BLD.z1, 1031, 63, BLD.z2, mix(MIX.stonebrick))
  F(ROOM.x1, B1 + 1, ROOM.z1, ROOM.x2, B1_CEIL - 1, ROOM.z2, 'air')
  F(ROOM.x1, B1, ROOM.z1, ROOM.x2, B1, ROOM.z2, 'smooth_stone')
  F(CORR.x1, B1 + 1, CORR.z1 - 1, CORR.x2, B1_CEIL - 1, CORR.z2, 'air')                // the corridor and its doorway in z 478
  F(CORR.x1, B1, CORR.z1 - 1, CORR.x2, B1, CORR.z2, 'polished_blackstone_bricks')
  F(LANDING.x1, B1 + 1, LANDING.z1, LANDING.x2, B1_CEIL - 1, LANDING.z2, 'air')
  F(LANDING.x1, B1, LANDING.z1, LANDING.x2, B1, LANDING.z2, 'polished_blackstone_bricks')
  for (let x = ROOM.x1 + 3; x <= ROOM.x2 - 3; x += 6) for (const z of [468, 476]) S(x, B1_CEIL, z, 'sea_lantern')
  for (let z = CORR.z1 + 2; z <= LANDING.z2; z += 6) S(1015, B1_CEIL, z, 'sea_lantern')

  // the cage: bars on the front (z 473) and both sides, G2 in the front, the shelves on the back wall with P3-P5
  for (let y = B1 + 1; y <= B1_CEIL - 1; y++) {
    for (let x = CAGE.x1; x <= CAGE.x2; x++) S(x, y, CAGE.z, 'iron_bars')
    for (let z = ROOM.z1; z < CAGE.z; z++) { S(CAGE.x1, y, z, 'iron_bars'); S(CAGE.x2, y, z, 'iron_bars') }
  }
  F(CAGE_DOOR[0], B1 + 1, CAGE.z, CAGE_DOOR[1], B1 + 3, CAGE.z, 'iron_block')                    // G2
  F(CAGE.x1 + 1, B1 + 1, ROOM.z1, CAGE.x2 - 1, B1 + 4, ROOM.z1, 'polished_andesite')              // the shelving's back
  F(997, B1 + 1, 462, 1001, B1 + 1, 462, 'stripped_oak_wood[axis=x]')                              // P3 pallets
  F(1009, B1 + 1, 462, 1011, B1 + 1, 462, 'iron_block')                                           // P4 the jewel case
  F(1019, B1 + 1, 462, 1023, B1 + 1, 462, 'barrel[facing=up,open=false]')                          // P5 crates
  for (const x of [1007, 1013]) S(x, B1 + 1, 475, 'stone_pressure_plate[powered=false]')
  S(1029, B1_CEIL - 1, 477, 'polished_blackstone')                                                // the camera's mount

  // the stair: stair blocks, solid under them, open above to the roof; the shaft over the landing
  for (let k = 1; k <= 8; k++) {
    const z = 503 + k, y = 65 - k
    F(STAIR.x1, B1, z, STAIR.x2, y - 1, z, mix(MIX.stonebrick))
    F(STAIR.x1, y, z, STAIR.x2, y, z, stairs('polished_andesite', 'north'))
    F(STAIR.x1, y + 1, z, STAIR.x2, ROOF - 1, z, 'air')
  }
  F(STAIR.x1, B1_CEIL, LANDING.z1, STAIR.x2, ROOF - 1, LANDING.z2, 'air')
  for (let y = B1 + 1; y <= ROOF - 1; y++) for (const x of [STAIR.x1 - 1, STAIR.x2 + 1]) for (let z = STAIR.z1; z <= LANDING.z2; z++) if (y >= 63 || z <= STAIR.z2) S(x, y, z, 'white_concrete')
}

// ---- the station: floor, walls, roof, the rooms ----------------------------------------------------------------------------
function station () {
  for (let x = BLD.x1; x <= BLD.x2; x++) for (let z = BLD.z1; z <= BLD.z2; z++) {
    if (!(x >= STAIR.x1 && x <= STAIR.x2 && z >= STAIR.z1)) S(x, 64, z, z < LOBBY_Z ? ((x + z) % 2 ? 'polished_diorite' : 'polished_andesite') : 'light_gray_concrete')
    const edge = x === BLD.x1 || x === BLD.x2 || z === BLD.z1 || z === BLD.z2
    if (edge) {
      for (let y = 65; y <= 71; y++) S(x, y, z, inWin(x, y, z) ? 'gray_stained_glass' : y >= 70 ? mix(MIX.navy) : 'white_concrete')
      S(x, 73, z, 'white_concrete')
    }
    S(x, ROOF, z, x >= STAIR.x1 && x <= STAIR.x2 && z >= STAIR.z1 && z <= LANDING.z2 ? 'glass' : 'smooth_stone')
  }
  F(DOOR[0], 65, BLD.z1, DOOR[1], 68, BLD.z1, 'air')
  F(BACK_DOOR[0], 65, BLD.z2, BACK_DOOR[1], 67, BLD.z2, 'air')
  for (let x = BLD.x1 + 3; x <= BLD.x2 - 3; x += 6) for (let z = BLD.z1 + 4; z <= BLD.z2 - 3; z += 6) {
    if (x >= STAIR.x1 - 1 && x <= STAIR.x2 + 1 && z >= STAIR.z1) continue
    S(x, ROOF, z, 'sea_lantern')
  }

  // inner walls: the lobby's (z 475, doorway x 1009..1011), the back rooms' (z 501), the office's and back hall's (x 1007 / 1012)
  F(BLD.x1 + 1, 65, LOBBY_Z, BLD.x2 - 1, 71, LOBBY_Z, 'white_concrete'); F(1009, 65, LOBBY_Z, 1011, 67, LOBBY_Z, 'air')
  F(BLD.x1 + 1, 65, BACK_Z, BLD.x2 - 1, 71, BACK_Z, 'white_concrete')
  F(990, 65, BACK_Z, 991, 66, BACK_Z, 'air'); F(STAIR.x1, 65, BACK_Z, STAIR.x2, 67, BACK_Z, 'air'); F(1030, 65, BACK_Z, 1031, 66, BACK_Z, 'air')
  F(STAIR.x1 - 1, 65, BACK_Z + 1, STAIR.x1 - 1, 71, BLD.z2 - 1, 'white_concrete')
  F(STAIR.x2 + 1, 65, BACK_Z + 1, STAIR.x2 + 1, 71, BLD.z2 - 1, 'white_concrete')

  // the lobby: the front desk with P1, the holding cells, the waiting chairs
  F(995, 65, 470, 1024, 65, 470, 'polished_andesite')
  F(1009, 65, 470, 1011, 65, 470, 'smooth_stone')                                          // P1's drawer top
  F(977, 65, 465, 989, 68, 465, 'iron_bars'); F(983, 65, 466, 983, 68, LOBBY_Z - 1, 'white_concrete')
  for (const x of [978, 979, 980, 985, 986, 987]) S(x, 65, 473, stairs('spruce', 'south'))
  for (let x = 1030; x <= 1040; x += 2) for (const z of [463, 466]) S(x, 65, z, stairs('spruce', 'north'))

  // the bullpen: rows of desks with chairs, leaving the middle aisle (x 1006..1013) clear
  for (let x = 980; x <= 1040; x += 6) for (const z of [480, 486, 492]) {
    if (x >= 1004 && x <= 1013) continue
    F(x, 65, z, x + 1, 65, z, 'stripped_spruce_wood[axis=x]'); S(x, 66, z, 'black_stained_glass_pane[east=false,north=false,south=false,waterlogged=false,west=false]')
    S(x, 65, z + 1, stairs('spruce', 'north'))
  }
  for (const x of [990, 991]) S(x, 65, BACK_Z - 1, 'stone_pressure_plate[powered=false]')

  // the sergeant's office: a desk, filing cabinets, the safe cabinet (G1 its face, P2 inside)
  F(990, 65, 514, 993, 65, 514, 'stripped_spruce_wood[axis=x]'); S(991, 65, 515, stairs('spruce', 'north'))
  for (let z = 503; z <= 507; z++) F(976, 65, z, 976, 66, z, 'iron_block')
  F(976, 65, 509, 978, 68, 512, 'iron_block')
  S(977, 65, 510, 'smooth_stone'); S(977, 65, 511, 'smooth_stone')                           // P2's shelf
  F(977, 66, 510, 977, 67, 511, 'air')                                                       // G1 (x 978, y 65..66) closes it
  // the back hall: an interview table and lockers
  F(1024, 65, 508, 1027, 65, 509, 'stripped_spruce_wood[axis=x]')
  for (let x = 1034; x <= 1043; x++) { S(x, 65, 518, 'iron_block'); S(x, 66, 518, 'iron_trapdoor[facing=north,half=bottom,open=true,powered=false,waterlogged=false]') }
  // the cameras' mounts
  for (const [x, z] of [[977, 462], [1043, 462], [977, 500], [1043, 500]]) S(x, 70, z, 'polished_blackstone')
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  outside(); basement(); station()
  B = null
  return b
}
module.exports.build = () => module.exports()

// ---- labels, displays, points, setup (PLAN 3) -----------------------------------------------------------------------------------
module.exports.labels = [{ x: 1010.0, y: 70.4, z: 459.97, facing: 'north', text: 'IRONVALE POLICE', color: '#ffffff', scale: 2.5 }]
module.exports.displays = []
module.exports.points = {
  EVIDENCE_EXIT: [1009.5, 65, 455.5, 180],
  EVIDENCE_HOLO: [1015.5, 70, 455.5, 180],
  EVIDENCE_CHASE: [1010.5, 60, 490.5, 0],
  EVIDENCE_COP_1: [1009.5, 65, 450.5, 0],
  EVIDENCE_COP_2: [1028.5, 65, 530.5, 180]
}
const REGION_LINES = [
  `(G) //pos1 ${REGION.evidence.slice(0, 3).join(',')}`,
  `(G) //pos2 ${REGION.evidence.slice(3).join(',')}`,
  '(G) /rg define heist_evidence',
  '(C) rg flag -w W heist_evidence passthrough allow'
]
const LOW = 57.4, DUCK = 58.65
const laser = (z, y, o) => `(G) /dtrap add evidence laser 1013.0 ${y} ${z} 1018.0 ${y} ${z} ${o}`
const BLINK = n => `damage=2 blink=true on=2 off=2 offset=${n}`
const HEIST_LINES = [
  '(G) /dheist create evidence 3',
  '(G) /dheist set evidence name Police HQ',
  '(G) /dheist set evidence advanced true',
  '(G) /dheist set evidence pool 38000',
  '(G) /dheist set evidence level 30',
  '(G) /dheist exit evidence 1009.5 65 455.5 180',
  '# gates (G1, G2): first, so the piles\' behind= numbers match',
  '(G) /dloot add evidence safe 978 65 510 978 66 511                        # G1 the sergeant\'s safe',
  '(G) /dloot add evidence drill 1009 57 473 1011 59 473 time=90 jams=2 claim=12 alarm=true   # G2 the cage door',
  '# piles (P1..P5)',
  '(G) /dloot add evidence pile 1009 65 470 1011 65 470 value=1000-2000 style=register piece=250 take=2.0 name=Fines_drawer',
  '(G) /dloot add evidence pile 977 65 510 977 65 511 value=3000-5000 style=cash piece=500 take=3.0 behind=1 name=Bribe_money',
  '(G) /dloot add evidence pile 997 57 462 1001 57 462 value=8000-12000 style=cash piece=1000 take=4.0 behind=2 name=Seized_cash',
  '(G) /dloot add evidence pile 1009 57 462 1011 57 462 value=5000-8000 style=jewel piece=1000 take=2.0 behind=2 name=Seized_jewels',
  '(G) /dloot add evidence pile 1019 57 462 1023 57 462 value=4000-7000 style=goods piece=1000 take=2.0 behind=2 name=Seized_goods',
  '(G) /dloot check evidence',
  '# traps',
  '(G) /dtrap add evidence camera 977.5 69.5 462.5 -45 30 effect=alarm angle=25 range=14    # lobby west',
  '(G) /dtrap add evidence camera 1043.5 69.5 462.5 45 30 effect=alarm angle=25 range=14    # lobby east',
  '(G) /dtrap add evidence camera 977.5 69.5 500.5 -135 30 effect=alarm angle=25 range=16 sweep=60 period=8   # bullpen west',
  '(G) /dtrap add evidence camera 1043.5 69.5 500.5 135 30 effect=alarm angle=25 range=16 sweep=60 period=8   # bullpen east',
  '(G) /dtrap add evidence camera 1029.5 60.5 476.5 90 25 effect=alarm angle=25 range=12    # evidence room',
  laser('506.5', DUCK, 'damage=2'), laser('503.5', LOW, 'damage=2'),
  laser('499.5', LOW, BLINK(0)), laser('499.5', DUCK, BLINK(2)),
  laser('496.5', DUCK, 'damage=2'), laser('493.5', LOW, 'damage=2'),
  laser('489.5', LOW, BLINK(0)), laser('489.5', DUCK, BLINK(2)),
  laser('486.5', DUCK, 'damage=2'), laser('483.5', LOW, 'damage=2'),
  '(G) /dtrap add evidence plate 990 65 500 damage=2',
  '(G) /dtrap add evidence plate 991 65 500 damage=2',
  '(G) /dtrap add evidence plate 1007 57 475 damage=2',
  '(G) /dtrap add evidence plate 1013 57 475 damage=2',
  '# lockdown (iron bars over every window), cops, hologram, open',
  ...WINDOWS.map(w => `(G) /dheist lock evidence add ${w.join(' ')} iron_bars`),
  '(G) /dcops evidence add 1009.5 65 450.5',
  '(G) /dcops evidence add 1028.5 65 530.5',
  '(G) /dheist snapshot evidence',
  '(G) /dheist holo evidence 1015.5 70 455.5',
  '(G) /dheist enable evidence'
]
module.exports.setup = {
  regions: [{ id: 'heist_evidence', box: REGION.evidence, flags: ['passthrough allow'], lines: REGION_LINES,
    note: 'the station and its basement (y 55..72); the plaza and the back lot stay outside' }],
  heists: [{
    id: 'evidence', difficulty: 3, level: 30, advanced: true, name: 'Police HQ', pool: 38000, escape: '8:00', cooldown: '15:00',
    exit: [1009.5, 65, 455.5, 180], holo: [1015.5, 70, 455.5], chase: [1010.5, 60, 490.5],
    snapshot: 'with the room clean: G1-G2 closed, the plates up, no bars in the windows',
    lines: HEIST_LINES
  }],
  keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], walls: [], holos: [], bikes: [],
  pois: [],
  atms: []
}
module.exports.gps = { nodes: [[6020, 1009.5, 65, 455.5, 'POLICE']], links: [[6002, 6020]] }

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}`)
}
