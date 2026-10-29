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
  club: [668, 228, 740, 278],    // the Nightclub, on Rising City's old kept-free strip, its door on Bank Street (x 664..667 walk)
  pawn: [600, 66, 636, 109],     // Lucky Pawn, its front on Gallery Row
  carwash: [490, 126, 550, 200]  // the Car Wash, its front on Gallery Row
}
const BUILDINGS = Object.keys(BOX)
// the heist regions [x1, y1, z1, x2, y2, z2]: each module sets its own when it's built (until then the whole box)
const REGION = {
  reserve: [683, 51, 153, 748, 77, 200],
  gallery: [561, 60, 139, 631, 77, 201],
  club: [670, 64, 230, 738, 78, 276],
  pawn: [602, 63, 68, 634, 75, 104],
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

// The Art Gallery (north/PLAN.md section 3): the plaza on Gallery Row, the glass-fronted lobby, the Sculpture Court, the
// Jewel Room and the Modern Wing. Every write goes through S (clipped to the module's own columns).
//   node tools/build/north/gallery.js   -> counts and bounds
// =====================================================================================================================
const MOD = 'gallery'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s)
}
const stairs = (m, facing, half = 'bottom') => `${m}_stairs[facing=${facing},half=${half},shape=straight,waterlogged=false]`

// ---- the Gallery's numbers (PLAN 3) ----------------------------------------------------------------------------------------
const BLD = { x1: 562, x2: 630, z1: 140, z2: 200 }   // the walls (inside x 563..629, z 141..199)
const ROOF = 75                                      // the roof (the rooms' ceiling), a parapet on it
const DOOR = { x1: 594, x2: 597, y2: 68 }            // the front doorway in the north face z 140
const LOBBY_Z = 153, COURT_X = 595, WING_Z = 177     // the partition walls
const WHITE = 'white_concrete', DARK = 'black_concrete', PLINTH = 'polished_blackstone'
const edge = (x, z) => x === BLD.x1 || x === BLD.x2 || z === BLD.z1 || z === BLD.z2

// ---- paintings: 5 x 3 block art in a dark wood frame, standing 1 out from a wall ------------------------------------------
const ART = [
  [['light_blue', 'light_blue', 'yellow', 'light_blue', 'light_blue'], ['lime', 'lime', 'green', 'lime', 'lime'], ['green', 'green', 'brown', 'green', 'green']].map(r => r.map(c => `${c}_terracotta`)),
  [['white', 'light_blue', 'light_blue', 'white', 'light_blue'], ['cyan', 'cyan', 'blue', 'cyan', 'cyan'], ['blue', 'blue', 'blue', 'blue', 'blue']].map(r => r.map(c => `${c}_terracotta`)),
  [['red', 'black', 'yellow', 'black', 'red'], ['black', 'white', 'black', 'white', 'black'], ['blue', 'black', 'red', 'black', 'yellow']].map(r => r.map(c => `${c}_concrete`)),
  [['brown', 'brown', 'orange', 'brown', 'brown'], ['brown', 'orange', 'white', 'orange', 'brown'], ['black', 'red', 'red', 'red', 'black']].map(r => r.map(c => `${c}_terracotta`))
]
let artN = 0
// on a wall along z at x (axis 'z': the picture runs along z, centred on c) or along x at z (axis 'x')
function painting (axis, at, c) {
  const art = ART[artN++ % ART.length]
  for (let i = -3; i <= 3; i++) for (let y = 66; y <= 70; y++) {
    const frame = i === -3 || i === 3 || y === 66 || y === 70
    const s = frame ? 'stripped_dark_oak_wood[axis=y]' : art[70 - 1 - y][i + 2]
    if (axis === 'z') S(at, y, c + i, s); else S(c + i, y, at, s)
  }
}

// ---- the building: the floor, the walls, the partitions, the roof ------------------------------------------------------------
function shell () {
  rect(BLD.x1, BLD.z1, BLD.x2, BLD.z2, (x, z) => {
    let s
    if (edge(x, z)) s = DARK
    else if (z < LOBBY_Z) s = 'polished_andesite'
    else if (x < COURT_X) s = (x + z) % 2 ? 'polished_diorite' : 'calcite'
    else if (z < WING_Z) s = 'polished_blackstone_bricks'
    else s = 'smooth_quartz'
    S(x, 64, z, s)
  })
  for (let y = 65; y <= ROOF - 1; y++) {
    for (let x = BLD.x1; x <= BLD.x2; x++) {
      // north: the glass curtain with black mullions, the doorway, the white band (the label) at y 74
      let s = y === 65 ? DARK : WHITE
      if (x >= DOOR.x1 && x <= DOOR.x2 && y <= DOOR.y2) s = 'air'
      else if (x >= DOOR.x1 && x <= DOOR.x2 && y === DOOR.y2 + 1) s = DARK
      else if (x >= 566 && x <= 626 && y >= 66 && y <= 73) s = (x - 566) % 6 === 0 ? DARK : 'glass'
      S(x, y, BLD.z1, s)
      S(x, y, BLD.z2, y === 65 ? DARK : WHITE)
    }
    for (let z = BLD.z1 + 1; z < BLD.z2; z++) for (const x of [BLD.x1, BLD.x2]) S(x, y, z, y === 65 ? DARK : WHITE)
    // the partitions: z 153 (openings x 576..579 and 612..615), x 595, z 177 (opening x 611..614)
    for (let x = BLD.x1 + 1; x < BLD.x2; x++) {
      const open = (x >= 576 && x <= 579) || (x >= 612 && x <= 615)
      S(x, y, LOBBY_Z, open && y <= 68 ? 'air' : y === 65 ? DARK : WHITE)
    }
    for (let z = LOBBY_Z + 1; z < BLD.z2; z++) S(COURT_X, y, z, y === 65 ? DARK : WHITE)
    for (let x = COURT_X + 1; x < BLD.x2; x++) S(x, y, WING_Z, x >= 611 && x <= 614 && y <= 68 ? 'air' : y === 65 ? DARK : WHITE)
  }
  // the roof: white with a lantern grid, skylight strips over the court; a parapet round the edge
  rect(BLD.x1, BLD.z1, BLD.x2, BLD.z2, (x, z) => {
    let s = WHITE
    if (!edge(x, z) && x > 564 && x < 593 && z > 155 && z < 198 && z % 6 === 0) s = 'glass'
    else if (!edge(x, z) && x % 6 === 3 && z % 6 === 3) s = 'sea_lantern'
    S(x, ROOF, z, s)
  })
  rect(BLD.x1, BLD.z1, BLD.x2, BLD.z2, (x, z) => { if (edge(x, z)) S(x, ROOF + 1, z, 'smooth_quartz_slab[type=bottom,waterlogged=false]') })
}

// ---- inside -----------------------------------------------------------------------------------------------------------------
// A case island (the Jewelry store's): a 1 x 4 plinth (the pile cells) at y 65, air 66..67, a glass lid at y 68, pane ends,
// the smash front 4 x 2 (the gate), permanent glass behind
function island (x1, pileZ, frontZ) {
  const backZ = pileZ + (pileZ - frontZ), x2 = x1 + 3
  for (let x = x1 - 1; x <= x2 + 1; x++) for (const z of [backZ, pileZ, frontZ]) {
    S(x, 65, z, PLINTH)
    const end = x === x1 - 1 || x === x2 + 1
    for (const y of [66, 67]) S(x, y, z, end ? 'glass_pane' : z === pileZ ? 'air' : 'glass')
    S(x, 68, z, 'glass')
  }
}
const ISLANDS = [[602, 160, 161], [618, 160, 161], [602, 170, 169], [618, 170, 169]] // [x1, pile z, front z]
const PLINTHS = [[570, 166], [586, 186]]  // the court's sculptures (2 cells along x)
function inside () {
  // the lobby: the reception desk, benches under the glass, plants in the corners
  for (let x = 590; x <= 601; x++) { S(x, 65, 147, PLINTH); S(x, 66, 147, 'smooth_quartz_slab[type=bottom,waterlogged=false]') }
  for (const x0 of [568, 618]) for (let x = x0; x <= x0 + 4; x++) S(x, 65, 141, stairs('dark_oak', 'north'))
  for (const [x, z] of [[563, 141], [629, 141], [563, 152], [629, 152]]) { S(x, 65, z, 'moss_block'); S(x, 66, z, 'azalea_leaves[persistent=true,distance=7,waterlogged=false]') }

  // the Sculpture Court: the two plinths, paintings on both long walls
  for (const [x, z] of PLINTHS) { S(x, 65, z, 'chiseled_quartz_block'); S(x + 1, 65, z, 'chiseled_quartz_block') }
  for (const c of [160, 172, 184, 196]) { painting('z', 563, c); painting('z', COURT_X - 1, c) }

  // the Jewel Room: the four case islands, paintings, the turret housings (the lenses stay in air)
  for (const [x1, pz, fz] of ISLANDS) island(x1, pz, fz)
  for (const c of [158, 167]) { painting('z', BLD.x2 - 1, c); painting('z', COURT_X + 1, c) }
  for (const [x, z] of [[597, 155], [628, 175], [628, 198]]) S(x, 74, z, PLINTH)

  // the Modern Wing: the quartz dais with the masterpiece, the collapsing floor's pit, paintings
  F(610, 65, 187, 615, 65, 191, 'smooth_quartz')
  S(612, 65, 189, 'chiseled_quartz_block'); S(613, 65, 189, 'chiseled_quartz_block')
  F(611, 61, 183, 614, 63, 185, 'air')
  for (const c of [183, 192]) { painting('z', BLD.x2 - 1, c); painting('z', COURT_X + 1, c) }
  for (const c of [602, 621]) painting('x', BLD.z2 - 1, c)
}

// ---- the plaza on Gallery Row -----------------------------------------------------------------------------------------------
function plaza () {
  rect(576, 126, 615, 139, (x, z) => S(x, 64, z, x >= DOOR.x1 && x <= DOOR.x2 ? 'calcite' : pick(x, 64, z, MIX.plaza)))
  for (const [x1, z1] of [[579, 129], [609, 129]]) {
    rect(x1, z1, x1 + 3, z1 + 3, (x, z) => S(x, 65, z, x === x1 || x === x1 + 3 || z === z1 || z === z1 + 3 ? 'smooth_stone_slab[type=bottom,waterlogged=false]' : 'moss_block'))
    shrub(S, x1 + 1, z1 + 1, 65); shrub(S, x1 + 2, z1 + 2, 65)
  }
  for (const x0 of [584, 603]) for (let x = x0; x <= x0 + 3; x++) S(x, 65, 136, stairs('dark_oak', 'south'))
  streetLamp(S, 577, 137, 0, -1); streetLamp(S, 614, 137, 0, -1)
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  artN = 0
  shell(); inside(); plaza()
  B = null
  return b
}
module.exports.build = () => module.exports()

// ---- labels, displays, points, setup (PLAN 3) -----------------------------------------------------------------------------------
module.exports.labels = [{ x: 596.0, y: 74.1, z: 139.97, facing: 'north', text: 'ART GALLERY', color: '#1a1a1a', scale: 3 }]
module.exports.displays = []
module.exports.points = {
  GALLERY_EXIT: [595.5, 65, 133.5, 180],
  GALLERY_HOLO: [595.5, 70, 133.5, 180]
}
const REGION_LINES = [
  '(G) //pos1 561,60,139',
  '(G) //pos2 631,77,201',
  '(G) /rg define heist_gallery',
  '(C) rg flag -w W heist_gallery passthrough allow'
]
const BLINK = n => `damage=2 blink=true on=2 off=2 offset=${n}`
const TURRET = 'effect=damage damage=0.5 angle=25 range=14'
const COURT_LASERS = [158.5, 161.5, 164.5, 168.5, 174.5, 180.5, 183.5, 189.5, 194.5]
const HEIST_LINES = [
  '(G) /dheist create gallery 2',
  '(G) /dheist set gallery name Art Gallery',
  '(G) /dheist set gallery pool 18000',
  '(G) /dheist set gallery level 12',
  '(G) /dheist exit gallery 595.5 65 133.5 180',
  '# gates (G1..G4): the case fronts',
  ...ISLANDS.map(([x1, , fz], i) => `(G) /dloot add gallery smash ${x1} 66 ${fz} ${x1 + 3} 67 ${fz}   # G${i + 1}`),
  '# piles (P1..P7)',
  ...ISLANDS.map(([x1, pz], i) => `(G) /dloot add gallery pile ${x1} 65 ${pz} ${x1 + 3} 65 ${pz} value=1000-2000 style=jewel behind=${i + 1} name=Display_case`),
  ...PLINTHS.map(([x, z]) => `(G) /dloot add gallery pile ${x} 65 ${z} ${x + 1} 65 ${z} value=2000-4000 style=art name=Sculpture`),
  '(G) /dloot add gallery pile 612 65 189 613 65 189 value=2000-4000 style=art name=Masterpiece',
  '(G) /dloot check gallery',
  '# traps (T1..T15)',
  ...COURT_LASERS.map((z, i) => `(G) /dtrap add gallery laser 563.0 65.4 ${z} 595.0 65.4 ${z} ${BLINK(i % 2 ? 2 : 0)}`),
  `(G) /dtrap add gallery camera 597.5 73.5 155.5 -45 40 ${TURRET} sweep=60 period=8   # T10 Jewel Room`,
  `(G) /dtrap add gallery camera 628.5 73.5 175.5 135 40 ${TURRET} sweep=60 period=8   # T11`,
  '(G) /dtrap add gallery floor 611 64 183 614 64 185 damage=2 depth=3   # T12 the Modern Wing\'s collapsing floor',
  `(G) /dtrap add gallery laser 596.0 65.4 181.5 630.0 65.4 181.5 ${BLINK(0)}`,
  `(G) /dtrap add gallery laser 596.0 65.4 194.5 630.0 65.4 194.5 ${BLINK(2)}`,
  `(G) /dtrap add gallery camera 628.5 73.5 198.5 135 30 ${TURRET}   # T15`,
  '(G) /dheist snapshot gallery',
  '(G) /dheist holo gallery 595.5 70 133.5',
  '(G) /dheist enable gallery'
]
module.exports.setup = {
  regions: [{ id: 'heist_gallery', box: REGION.gallery, flags: ['passthrough allow'], lines: REGION_LINES,
    note: 'the building (y 60..77, down to the collapsing floor\'s pit); the plaza stays outside (z < 139)' }],
  heists: [{
    id: 'gallery', difficulty: 2, level: 12, advanced: false, name: 'Art Gallery', pool: 18000, escape: '6:00', cooldown: '10:00',
    exit: [595.5, 65, 133.5, 180], holo: [595.5, 70, 133.5],
    snapshot: 'with the room clean: the case fronts whole, the floor up',
    lines: HEIST_LINES
  }],
  keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], walls: [], holos: [], bikes: [], atms: [],
  pois: ['(C) dpoi addat landmark 595 65 133 Art Gallery']
}
module.exports.gps = { nodes: [[5020, 595.5, 65, 131.5, 'GALLERY']], links: [[5006, 5020]] }

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}`)
}
