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

// The Federal Reserve (north/PLAN.md section 2): the portico and plaza on Bank Street North, the banking hall, the teller
// line, the secure wing, and B1's laser gallery, cage room and gold vault. Every write goes through S (clipped to the
// module's own columns).
//   node tools/build/north/reserve.js   -> counts and bounds
// =====================================================================================================================
const MOD = 'reserve'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s)
}
const stairs = (m, facing, half = 'bottom') => `${m}_stairs[facing=${facing},half=${half},shape=straight,waterlogged=false]`
const SLAB = 'smooth_quartz_slab[type=bottom,waterlogged=false]'

// ---- the Reserve's numbers (PLAN 2) ---------------------------------------------------------------------------------------
const BLD = { x1: 684, x2: 747, z1: 154, z2: 199 }   // the walls (inside x 685..746, z 155..198)
const CEIL = 76, TOP = 80, ROOF = 81                 // the hall's ceiling, the walls' top course, the roof
const DOOR = { z1: 175, z2: 178, y2: 68 }            // the front doorway in the west face x 684
const TELLER = { x: 718, z1: 162, z2: 191 }          // the counter; the teller line x 719..726 behind it
const WING_X = 727                                   // the secure wing's wall (G2 in it)
const B1 = 52                                        // B1's floor (feet 53..57, ceiling 58)
const ATM = [666, 192]                               // the plaza's ATM, facing Bank Street North
const PIL_W = [154, 160, 166, 172, 181, 187, 193, 199]
const pilNS = x => x === BLD.x1 || x === BLD.x2 || (x - BLD.x1) % 6 === 0
// the windows (each a lockdown box, y 67..73): west z ranges, north/south x ranges over the hall and the teller line
const WIN_W = [[156, 158], [162, 164], [168, 170], [183, 185], [189, 191], [195, 197]]
const WIN_NS = [[686, 688], [692, 694], [698, 700], [704, 706], [710, 712], [716, 718], [722, 724]]
const inR = (v, rs) => rs.some(([a, b]) => v >= a && v <= b)
const GLASS = 'gray_stained_glass'

// ---- underground: solid under the whole building, then B1 is carved out of it ---------------------------------------------
function underground () {
  F(BLD.x1, 51, BLD.z1, BLD.x2, 63, BLD.z2, 'stone')
  // the stair's landing x 743..746, z 168..179 and the laser gallery x 712..742, z 168..172
  F(743, 53, 168, 746, 57, 179, 'air'); F(743, B1, 168, 746, B1, 179, 'polished_blackstone_bricks')
  F(712, 53, 168, 742, 57, 172, 'air')
  rect(712, 168, 742, 172, (x, z) => S(x, B1, z, (x + z) % 2 ? 'polished_blackstone_bricks' : 'polished_deepslate'))
  for (let x = 712; x <= 742; x++) for (let y = 53; y <= 57; y++) for (const z of [167, 173]) S(x, y, z, x % 3 === 0 ? 'iron_block' : 'polished_blackstone')
  for (let x = 714; x <= 746; x += 6) S(x, 58, 170, 'sea_lantern')
  S(744, 58, 176, 'sea_lantern')

  // vault door 1 (G3) at x 711 and vault door 2 (G6) at x 696: a 5 x 5 octagon face in a gold ring (the Bank's door)
  for (const dx of [711, 696]) {
    for (let dz = 0; dz < 5; dz++) for (let dy = 0; dy < 5; dy++) {
      const z = 168 + dz, y = 53 + dy, rim = dz === 0 || dz === 4 || dy === 0 || dy === 4, diag = dz === dy || dz === 4 - dy
      S(dx, y, z, dz === 2 && dy === 2 ? 'chiseled_stone_bricks' : diag ? 'polished_deepslate' : rim ? 'polished_blackstone' : 'iron_block')
    }
    F(dx, 53, 167, dx, 58, 167, 'gold_block'); F(dx, 53, 173, dx, 58, 173, 'gold_block'); F(dx, 58, 167, dx, 58, 173, 'gold_block')
  }

  // the cage room x 697..710, z 160..180: dark walls, a checker floor, lights; the cash pallets P7 (x 701..705, z 177)
  F(697, 53, 160, 710, 57, 180, 'air')
  rect(697, 160, 710, 180, (x, z) => S(x, B1, z, (x + z) % 2 ? 'polished_deepslate' : 'deepslate_tiles'))
  for (let y = 53; y <= 57; y++) {
    for (let z = 159; z <= 181; z++) for (const x of [696, 711]) if (z < 167 || z > 173) S(x, y, z, 'polished_deepslate')
    for (let x = 697; x <= 710; x++) for (const z of [159, 181]) S(x, y, z, 'polished_deepslate')
  }
  for (const [x, z] of [[700, 164], [707, 164], [700, 176], [707, 176]]) S(x, 58, z, 'sea_lantern')
  F(701, 53, 177, 705, 53, 177, 'stripped_oak_wood[axis=x]')                                   // P7
  F(700, 53, 179, 706, 55, 179, 'iron_bars')                                                  // a cage back behind the pallets
  // the deposit alcoves behind the safes G4 (north, z 159) and G5 (south, z 181): x 699..707; [first z, last z, gate z,
  // pile z, back wall z]
  for (const [za, zb, zg, zp, zw] of [[155, 158, 159, 155, 154], [182, 185, 181, 185, 186]]) {
    F(699, 53, za, 707, 56, zb, 'air')
    rect(699, za, 707, zb, (x, z) => S(x, B1, z, 'polished_deepslate'))
    F(699, 53, zw, 707, 56, zw, 'chiseled_polished_blackstone')                              // the deposit-box wall
    F(700, 53, zp, 706, 53, zp, 'iron_block')                                                // P5 / P6's ledge
    F(701, 53, zg, 701, 56, zg, 'polished_blackstone'); F(705, 53, zg, 705, 56, zg, 'polished_blackstone'); F(702, 56, zg, 704, 56, zg, 'polished_blackstone')
    F(702, 53, zg, 704, 55, zg, 'iron_block')                                                // G4 / G5
    S(703, 57, (za + zb) >> 1, 'sea_lantern')
  }
  // the plates in front of each alcove and inside vault door 1 (T16-T19)
  for (const [x, z] of [[703, 160], [703, 180], [709, 169], [709, 171]]) S(x, 53, z, 'stone_pressure_plate[powered=false]')

  // the gold vault x 686..695, z 157..183: quartz and diorite, a gold band, froglights; the bullion pallets P8-P10
  F(686, 53, 157, 695, 57, 183, 'air')
  rect(686, 157, 695, 183, (x, z) => S(x, B1, z, (x + z) % 2 ? 'smooth_quartz' : 'polished_diorite'))
  rect(686, 157, 695, 183, (x, z) => S(x, 58, z, (x - 686) % 4 === 1 && (z - 157) % 4 === 1 ? 'ochre_froglight[axis=y]' : 'smooth_quartz'))
  for (let y = 53; y <= 57; y++) {
    const s = y === 57 ? 'gold_block' : 'polished_deepslate'
    for (let z = 156; z <= 184; z++) S(685, y, z, s)
    for (let x = 686; x <= 695; x++) { S(x, y, 156, s); S(x, y, 184, s) }
  }
  F(687, 53, 158, 688, 53, 158, 'stripped_oak_wood[axis=x]')    // P8
  F(687, 53, 182, 688, 53, 182, 'stripped_oak_wood[axis=x]')    // P9
  F(687, 53, 169, 687, 53, 171, 'stripped_oak_wood[axis=z]')    // P10

  // the stair from the secure wing (feet 65 at x 730) east down to the landing (feet 53 at x 742), z 176..177
  for (const z of [176, 177]) for (let x = 731; x <= 742; x++) {
    const feet = 65 - (x - 730)
    S(x, feet - 1, z, stairs('polished_blackstone', 'west')); F(x, feet, z, x, 69, z, 'air')
  }
}

// ---- the building above ground: the floor, the walls, the ceiling and the roof ----------------------------------------------
function shell () {
  rect(BLD.x1, BLD.z1, BLD.x2, BLD.z2, (x, z) => {
    let s
    if (x < TELLER.x) s = x === 685 || x === 717 || z === 155 || z === 198 ? 'polished_andesite' : (Math.floor(x / 2) + Math.floor(z / 2)) % 2 ? 'calcite' : 'polished_diorite'
    else if (x < WING_X) s = 'dark_oak_planks'
    else s = 'polished_andesite'
    S(x, 64, z, s)
  })
  for (let z = DOOR.z1; z <= DOOR.z2; z++) S(BLD.x1, 64, z, 'polished_andesite')
  for (let y = 65; y <= TOP; y++) {
    for (let z = BLD.z1; z <= BLD.z2; z++) {
      // west: pilasters, the windows, the doorway and its transom
      let s = y === 65 ? 'polished_diorite' : 'calcite'
      if (PIL_W.includes(z) || y === TOP) s = 'smooth_quartz'
      else if (z >= DOOR.z1 && z <= DOOR.z2) s = y <= DOOR.y2 ? 'air' : y === DOOR.y2 + 1 ? 'chiseled_quartz_block' : y <= 73 ? GLASS : 'calcite'
      else if (inR(z, WIN_W) && y >= 67 && y <= 73) s = GLASS
      S(BLD.x1, y, z, s)
      S(BLD.x2, y, z, PIL_W.includes(z) || y === TOP ? 'smooth_quartz' : y === 65 ? 'polished_diorite' : 'calcite')
    }
    for (let x = BLD.x1 + 1; x < BLD.x2; x++) for (const z of [BLD.z1, BLD.z2]) {
      S(x, y, z, pilNS(x) || y === TOP ? 'smooth_quartz' : inR(x, WIN_NS) && y >= 67 && y <= 73 ? GLASS : y === 65 ? 'polished_diorite' : 'calcite')
    }
  }
  // the ceiling: smooth quartz with a grid of sea lanterns; the roof, its cornice and parapet
  rect(BLD.x1 + 1, BLD.z1 + 1, BLD.x2 - 1, BLD.z2 - 1, (x, z) => S(x, CEIL, z, x % 5 === 2 && z % 5 === 2 ? 'sea_lantern' : 'smooth_quartz'))
  rect(BLD.x1, BLD.z1, BLD.x2, BLD.z2, (x, z) => S(x, ROOF, z, 'smooth_stone'))
  for (let x = BLD.x1 - 1; x <= BLD.x2 + 1; x++) for (const z of [BLD.z1 - 1, BLD.z2 + 1]) S(x, TOP, z, 'smooth_quartz_slab[type=top,waterlogged=false]')
  for (let z = BLD.z1; z <= BLD.z2; z++) for (const x of [BLD.x1 - 1, BLD.x2 + 1]) S(x, TOP, z, 'smooth_quartz_slab[type=top,waterlogged=false]')
  rect(BLD.x1, BLD.z1, BLD.x2, BLD.z2, (x, z) => { if (x === BLD.x1 || x === BLD.x2 || z === BLD.z1 || z === BLD.z2) S(x, ROOF + 1, z, SLAB) })
}

// ---- inside: the hall, the teller line, the secure wing ----------------------------------------------------------------------
function inside () {
  // the hall's quartz columns, benches under the windows, plants in the corners
  for (const x of [691, 698, 705, 712]) for (const z of [163, 190]) F(x, 65, z, x, CEIL - 1, z, 'quartz_pillar[axis=y]')
  for (const [a, b] of WIN_NS.filter(([a]) => a < TELLER.x)) for (let x = a; x <= b; x++) { S(x, 65, 155, stairs('dark_oak', 'north')); S(x, 65, 198, stairs('dark_oak', 'south')) }
  for (const [x, z] of [[686, 156], [686, 197], [716, 156], [716, 197]]) { S(x, 65, z, 'moss_block'); S(x, 66, z, 'azalea_leaves[persistent=true,distance=7,waterlogged=false]') }
  // a camera housing over each camera (T1-T3), hung from the ceiling (the lens stays in air)
  for (const [x, z] of [[690, 158], [690, 195], [745, 157]]) S(x, 75, z, 'polished_blackstone')

  // the teller counter x 718: the counter, G1's glass (z 170..182, y 66..67), bars either side, a wall to the ceiling;
  // the end walls z 161 / 192 close the teller line
  F(TELLER.x, 65, TELLER.z1, TELLER.x, 65, TELLER.z2, 'polished_blackstone')
  F(TELLER.x, 66, TELLER.z1, TELLER.x, 67, TELLER.z2, 'iron_bars')
  F(TELLER.x, 66, 170, TELLER.x, 67, 182, 'light_blue_stained_glass')                      // G1
  F(TELLER.x, 69, TELLER.z1, TELLER.x, CEIL - 1, TELLER.z2, 'calcite')
  F(TELLER.x, 68, TELLER.z1, TELLER.x, 68, TELLER.z2, 'chiseled_quartz_block')
  F(TELLER.x, 65, TELLER.z1 - 1, WING_X - 1, CEIL - 1, TELLER.z1 - 1, 'calcite')
  F(TELLER.x, 65, TELLER.z2 + 1, WING_X - 1, CEIL - 1, TELLER.z2 + 1, 'calcite')
  // the teller desks x 721 with the tills P1-P3 (z 172, 176, 180), a stool behind each
  for (const z of [172, 176, 180]) { S(721, 65, z, 'polished_andesite'); S(722, 65, z, stairs('dark_oak', 'east')) }
  for (const z of [166, 186]) { S(721, 65, z, 'smooth_stone'); S(722, 65, z, stairs('dark_oak', 'east')) }

  // the secure wing's wall x 727 with the security door G2 (z 175..177, y 65..67) in a dark frame
  F(WING_X, 65, BLD.z1 + 1, WING_X, CEIL - 1, BLD.z2 - 1, 'calcite')
  F(WING_X, 65, 174, WING_X, 68, 178, 'polished_blackstone')
  F(WING_X, 65, 175, WING_X, 67, 177, 'iron_block')                                       // G2
  S(726, 66, 174, 'polished_blackstone_button[face=wall,facing=west,powered=false]')       // the keypad prop
  // the secure wing: the cash carts P4 (x 735..737, z 158), the stairwell's rails, lockers along the east wall, a desk
  F(735, 65, 158, 737, 65, 158, 'iron_block')
  for (let x = 731; x <= 742; x++) { S(x, 65, 175, 'iron_bars'); S(x, 65, 178, 'iron_bars') }
  for (const z of [176, 177]) S(743, 65, z, 'iron_bars')
  for (let z = 184; z <= 196; z += 2) F(746, 65, z, 746, 66, z, 'iron_block')
  S(740, 65, 192, 'dark_oak_slab[type=top,waterlogged=false]'); S(741, 65, 192, 'dark_oak_slab[type=top,waterlogged=false]'); S(740, 65, 193, stairs('dark_oak', 'south'))
}

// ---- the portico, the plaza, the ATM, the getaway lot ---------------------------------------------------------------------------
const COLS = [165, 169, 173, 180, 184, 188]
function front () {
  rect(674, 164, 683, 189, (x, z) => S(x, 64, z, 'polished_diorite'))
  for (const z of COLS) F(675, 65, z, 675, 75, z, 'quartz_pillar[axis=y]')
  rect(674, 164, 683, 189, (x, z) => { S(x, 76, z, 'smooth_quartz'); S(x, 77, z, x === 674 ? 'calcite' : 'quartz_bricks') })
  // the pediment: rows narrowing to the top (y 78..83), its face calcite
  for (const [y, za, zb] of [[78, 165, 188], [79, 167, 186], [80, 169, 184], [81, 171, 182], [82, 173, 180], [83, 175, 178]]) {
    for (let z = za; z <= zb; z++) for (let x = 674; x <= 683; x++) S(x, y, z, x === 674 ? 'calcite' : 'smooth_quartz')
  }
  // the plaza x 664..673 (a calcite band to the door), the planters, two lamps, the ATM's barriers (the model in DISPLAYS)
  rect(664, 140, 673, 213, (x, z) => S(x, 64, z, z >= DOOR.z1 && z <= DOOR.z2 ? 'calcite' : pick(x, 64, z, MIX.plaza)))
  for (const [x1, z1] of [[666, 144], [666, 196]]) {
    rect(x1, z1, x1 + 3, z1 + 3, (x, z) => S(x, 65, z, x === x1 || x === x1 + 3 || z === z1 || z === z1 + 3 ? 'smooth_stone_slab[type=bottom,waterlogged=false]' : 'moss_block'))
    shrub(S, x1 + 1, z1 + 1, 65); shrub(S, x1 + 2, z1 + 2, 65)
  }
  streetLamp(S, 672, 160, 0, 1); streetLamp(S, 672, 193, 0, -1)
  for (let y = 65; y <= 67; y++) S(ATM[0], y, ATM[1], 'barrier')
  // the drive from Bank Street North (z 205..214) and the getaway lot south of the building (x 684..747, z 203..214)
  rect(664, 205, 683, 214, (x, z) => S(x, 64, z, pick(x, 64, z, MIX.plaza)))
  rect(684, 203, 747, 214, (x, z) => S(x, 64, z, (x - 684) % 6 === 0 && (z <= 206 || z >= 211) ? 'calcite' : 'smooth_stone'))
  for (const x of [700, 730]) streetLamp(S, x, 215, 0, -1)
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  underground(); shell(); inside(); front()
  B = null
  return b
}
module.exports.build = () => module.exports()

// ---- labels, displays, points, setup (PLAN 2) -----------------------------------------------------------------------------------
module.exports.labels = [{ x: 673.97, y: 77.1, z: 176.5, facing: 'west', text: 'FEDERAL RESERVE', color: '#3a3a3a', scale: 4 }]
module.exports.displays = [{ x: ATM[0] + 0.5, y: 66.5, z: ATM[1] + 0.5, item: 'iron_ingot', cmd: 'donating:furn_atm', yaw: 90, pitch: 0, scale: 1 }]
module.exports.points = {
  RESERVE_EXIT: [676.5, 65, 176.5, 90],
  RESERVE_HOLO: [672.5, 71, 176.5, 90],
  RESERVE_CHASE: [715.5, 60, 176.5, 0],
  RESERVE_COP_1: [655.5, 65, 168.5, 90],
  RESERVE_COP_2: [655.5, 65, 185.5, 90]
}
const REGION_LINES = [
  '(G) //pos1 683,51,153',
  '(G) //pos2 748,77,200',
  '(G) /rg define heist_reserve',
  '(C) rg flag -w W heist_reserve passthrough allow'
]
const laser = (x1, y1, z1, x2, y2, z2, o) => `(G) /dtrap add reserve laser ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${o}`
const LOW = 53.4, DUCK = 54.65, MID = 54.0
const gallery = (x, y, o) => laser(x, y, '168.0', x, y, '173.0', o)   // across the gallery (z 168..172)
const vault = (z, y, o) => laser('686.0', y, z, '696.0', y, z, o)      // across the gold vault (x 686..695)
const BLINK = n => `damage=2 blink=true on=2 off=2 offset=${n}`
const WINDOWS = [
  ...WIN_W.map(([a, b]) => [684, 67, a, 684, 73, b]), [684, 70, DOOR.z1, 684, 73, DOOR.z2],
  ...WIN_NS.map(([a, b]) => [a, 67, 154, b, 73, 154]), ...WIN_NS.map(([a, b]) => [a, 67, 199, b, 73, 199])
]
const HEIST_LINES = [
  '(G) /dheist create reserve 4',
  '(G) /dheist set reserve name Federal Reserve',
  '(G) /dheist set reserve advanced true',
  '(G) /dheist set reserve pool 70000',
  '(G) /dheist set reserve level 50',
  '(G) /dheist exit reserve 676.5 65 176.5 90',
  '# gates (G1..G6)',
  '(G) /dloot add reserve smash 718 66 170 718 67 182                     # G1 teller glass',
  '(G) /dloot add reserve safe 727 65 175 727 67 177                      # G2 security door',
  '(G) /dloot add reserve drill 711 53 168 711 57 172 time=90 jams=2 claim=10    # G3 vault door 1',
  '(G) /dloot add reserve safe 702 53 159 704 55 159                      # G4 north deposit alcove',
  '(G) /dloot add reserve safe 702 53 181 704 55 181                      # G5 south deposit alcove',
  '(G) /dloot add reserve drill 696 53 168 696 57 172 time=120 jams=3 claim=15 alarm=true   # G6 vault door 2',
  '# piles (P1..P10)',
  ...[172, 176, 180].map(z => `(G) /dloot add reserve pile 721 65 ${z} 721 65 ${z} value=1000-2000 style=register piece=250 take=2.0 behind=1 name=Till`),
  '(G) /dloot add reserve pile 735 65 158 737 65 158 value=4000-8000 style=cash piece=1000 take=4.0 behind=2 name=Cash_carts',
  '(G) /dloot add reserve pile 700 53 155 706 53 155 value=3000-6000 style=jewel behind=4 name=Deposit_boxes',
  '(G) /dloot add reserve pile 700 53 185 706 53 185 value=3000-6000 style=jewel behind=5 name=Deposit_boxes',
  '(G) /dloot add reserve pile 701 53 177 705 53 177 value=6000-10000 style=cash piece=1000 take=4.0 behind=3 name=Cash_pallets',
  '(G) /dloot add reserve pile 687 53 158 688 53 158 value=10000-15000 style=bullion behind=6 name=Bullion',
  '(G) /dloot add reserve pile 687 53 182 688 53 182 value=10000-15000 style=bullion behind=6 name=Bullion',
  '(G) /dloot add reserve pile 687 53 169 687 53 171 value=10000-20000 style=bullion behind=6 name=Bullion',
  '(G) /dloot check reserve',
  '# traps (T1..T31)',
  '(G) /dtrap add reserve camera 690.5 74.5 158.5 -45 35 effect=alarm angle=25 range=12 sweep=60 period=8   # T1 hall north',
  '(G) /dtrap add reserve camera 690.5 74.5 195.5 -135 35 effect=alarm angle=25 range=12 sweep=60 period=8  # T2 hall south',
  '(G) /dtrap add reserve camera 745.5 74.5 157.5 135 35 effect=alarm angle=25 range=12                     # T3 secure wing',
  gallery('740.5', LOW, 'damage=2'), gallery('737.5', DUCK, 'damage=2'), gallery('734.5', LOW, 'damage=2'),
  gallery('731.5', LOW, BLINK(0)), gallery('731.5', DUCK, BLINK(2)),
  gallery('728.5', MID, 'effect=alarm'), gallery('725.5', LOW, 'damage=2'), gallery('722.5', DUCK, 'damage=2'),
  gallery('719.5', LOW, BLINK(0)), gallery('719.5', DUCK, BLINK(2)),
  gallery('716.5', MID, 'effect=alarm'), gallery('713.5', LOW, 'damage=2'),
  '(G) /dtrap add reserve plate 703 53 160 damage=2',
  '(G) /dtrap add reserve plate 703 53 180 damage=2',
  '(G) /dtrap add reserve plate 709 53 169 damage=2',
  '(G) /dtrap add reserve plate 709 53 171 damage=2',
  '(G) /dtrap add reserve camera 709.5 57.5 176.5 90 30 effect=alarm angle=25 range=12   # T20 cage room',
  vault('166.5', LOW, 'damage=2'), vault('164.5', DUCK, 'damage=2'),
  vault('162.5', LOW, BLINK(0)), vault('162.5', DUCK, BLINK(2)), vault('160.5', LOW, 'damage=2'),
  vault('174.5', LOW, 'damage=2'), vault('176.5', DUCK, 'damage=2'),
  vault('178.5', LOW, BLINK(0)), vault('178.5', DUCK, BLINK(2)), vault('180.5', LOW, 'damage=2'),
  laser('689.5', DUCK, '167.0', '689.5', DUCK, '174.0', BLINK(1)),
  '# lockdown (iron bars over every window), cops, hologram, open',
  ...WINDOWS.map(w => `(G) /dheist lock reserve add ${w.join(' ')} iron_bars`),
  '(G) /dcops reserve add 655.5 65 168.5',
  '(G) /dcops reserve add 655.5 65 185.5',
  '(G) /dheist snapshot reserve',
  '(G) /dheist holo reserve 672.5 71 176.5',
  '(G) /dheist enable reserve'
]
module.exports.setup = {
  regions: [{ id: 'heist_reserve', box: REGION.reserve, flags: ['passthrough allow'], lines: REGION_LINES,
    note: 'the building and B1 (y 51..77); the portico, the plaza and the lot stay outside (x < 683, z > 200)' }],
  heists: [{
    id: 'reserve', difficulty: 4, level: 50, advanced: true, name: 'Federal Reserve', pool: 70000, escape: '10:00', cooldown: '30:00',
    exit: [676.5, 65, 176.5, 90], holo: [672.5, 71, 176.5], chase: [715.5, 60, 176.5],
    snapshot: 'with the room clean: G1-G6 closed, the plates up, no bars in the windows',
    lines: HEIST_LINES
  }],
  keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], walls: [], holos: [], bikes: [],
  pois: ['(C) dpoi addat landmark 676 65 176 Federal Reserve'],
  atms: [`(C) datm add ${ATM[0]} 65 ${ATM[1]}`]
}
module.exports.gps = { nodes: [[5010, 676.5, 65, 176.5, 'RESERVE']], links: [[5001, 5010]] }

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}`)
}
