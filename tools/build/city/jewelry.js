'use strict'
// jewelry: the Jewelry Store (tools/build/city/PLAN.md section 4; its setup lines are section 7.2): Jailbreak's
// black-framed blue-glass corner store at Main Avenue x Bank Street, its basement, two laser floors, the final floor
// with the manager's office, the roof huts, the vent shaft, the east deck, the fire escape and the alley.
// Box x 596..639, z 356..415, y 44..110; world `jailbreak`, ground y 64.
//   node tools/build/city/jewelry.js                 -> blocks and bounds
//   node tools/build/city/jewelry.js --check         -> the section 9.1 / 11 checks this module can run on its own
// Ids are the 26.1.2 server's. Nothing here reads blocks.
// ---- COMMON (tools/build/city/PLAN.md section 8: copy verbatim into every city module) ----
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

// ---- the city's frame ----------------------------------------------------------------------------------------------
const WORLD = 'jailbreak'
const CITY = { x1: 481, z1: 226, x2: 940, z2: 470, y1: 44, y2: 110 } // every block of Rising City lies in here
const GROUND_Y = 64 // the generated grass's top block; feet stand at 65
const LABEL_TAG = 'city_label', DISPLAY_TAG = 'city_display' // the tags of the city's text displays and item displays

// module boxes [x1, z1, x2, z2]: the module owns every column inside, y CITY.y1..CITY.y2
const BOX = {
  jewelry: [596, 356, 639, 415], // the store, its alley (z 356..373) and the fire escape
  bank: [560, 280, 639, 321],    // the tower, Hatch Plaza (x 560..590), the front plaza (x 629..639), the tunnel and shaft
  casino: [820, 296, 920, 400]   // the podium (x 820..920, z 300..400, top y 72), the plaza, the casino, the tunnels
}
const BUILDINGS = Object.keys(BOX)
// the heist regions [x1, y1, z1, x2, y2, z2] (section 7.1)
const REGION = {
  jewelry: [598, 56, 374, 634, 97, 414],
  bank: [595, 47, 280, 630, 102, 321],
  casino: [841, 55, 330, 898, 71, 371] // B1 and B2 under the public gaming floor
}
// owned by nobody: no module writes a block here (the base lot, the power plant strip, the later blocks)
const KEEP_FREE = [[506, 356, 550, 410], [931, 226, 940, 470], [664, 226, 930, 279]]

const inBox = (x, z, boxes) => boxes.some(([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2)
const ownerOf = (x, z) => {
  if (x < CITY.x1 || x > CITY.x2 || z < CITY.z1 || z > CITY.z2) return null
  if (inBox(x, z, KEEP_FREE)) return 'free'
  for (const m of BUILDINGS) if (inBox(x, z, [BOX[m]])) return m
  return 'streets'
}
const ownFor = mod => (x, y, z) => y >= CITY.y1 && y <= CITY.y2 && ownerOf(x, z) === mod

// ---- streets (module `streets`; the numbers are section 3's) -------------------------------------------------------
const AVE = { x1: 481, x2: 789, z1: 419, z2: 441, dash: 430, edge: [420, 440], walk: [[416, 418], [442, 444]], park: [445, 470] }
const RB = { cx: 810, cz: 430, r: 20, island: 8, walk: 3 } // the roundabout: island d < 8, asphalt 8..20, sidewalk 20..23
const SPUR = [812, 402, 829, 414]   // asphalt from the roundabout's north-east to the ramp's foot
const RAMP = { x1: 830, x2: 894, z1: 402, z2: 409, curb: 401, wall: 410, top: 887 } // the ramp road up the podium's south wall
const BANK_ST = { x1: 640, x2: 663, road: [643, 660], z1: 230 }   // north from the avenue to z 230
const VAULT_ST = { z1: 340, z2: 355, road: [343, 352], x1: 490, x2: 787 }
const WEST_ST = { x1: 490, x2: 505, road: [493, 502], z1: 296 }   // north from the avenue to z 296
const HATCH_LANE = [506, 296, 559, 304]                            // polished andesite, into Hatch Plaza (bank module)
const CHAN = { x1: 776, x2: 930, z1: 280, z2: 295, floor: 59, mouth: [868, 870] } // the storm channel, walls at its edges
const LEG = { x1: 776, x2: 787, z1: 296, z2: 339 }                 // its west leg, up into Vault Street (which starts at z 340)

const rbD = (x, z) => Math.hypot(x + 0.5 - RB.cx, z + 0.5 - RB.cz)
const rampFeet = x => x >= RAMP.top ? 73 : 65 + Math.floor((x - RAMP.x1) / 8) // where feet stand on the ramp at column x
const legFloor = z => z <= 296 ? 59 : z >= 336 ? 64 : 59 + Math.floor((z - 296) / 8) // the leg's floor block
const drainFloor = z => 59 + Math.floor((z - 294) / 7) // the drain tunnel's floor block, z 296..329 (casino module)

// What the streets module lays at (x, z), or null (grass at GROUND_Y). top = the surface block's y.
// kinds: road (asphalt), line (white / yellow), walk (sidewalk), curb (sidewalk edge, a slab at top + 1), island,
// park (parking bay), ramp, rampwall (to top), lane (polished andesite), chan (channel floor), wall (to top, rail above)
function streetCell (x, z) {
  // the storm channel and its west leg
  if (x >= CHAN.x1 && x <= CHAN.x2 && z >= CHAN.z1 && z <= CHAN.z2) {
    if (z === CHAN.z1 || x === CHAN.x1 || x === CHAN.x2) return { kind: 'wall', top: 64 }
    if (z === CHAN.z2 && x >= LEG.x2) return x >= CHAN.mouth[0] && x <= CHAN.mouth[1] ? { kind: 'wall', top: 64, mouth: true } : { kind: 'wall', top: 64 }
    return { kind: 'chan', top: x < LEG.x2 ? legFloor(z) : CHAN.floor }
  }
  if (x >= LEG.x1 && x <= LEG.x2 && z >= LEG.z1 && z < VAULT_ST.z1) {
    if (x === LEG.x1 || x === LEG.x2) return { kind: 'wall', top: 64 }
    return { kind: 'chan', top: legFloor(z) }
  }
  // the ramp road, its spur and the roundabout
  if (x >= RAMP.x1 && x <= RAMP.x2) {
    if (z >= RAMP.z1 && z <= RAMP.z2) return { kind: 'ramp', top: rampFeet(x) - 1 }
    if (z === RAMP.curb) return x >= RAMP.top ? { kind: 'ramp', top: 72 } : { kind: 'curb', top: rampFeet(x) - 1 }
    if (z === RAMP.wall) return { kind: 'rampwall', top: rampFeet(x) }
  }
  if (inBox(x, z, [SPUR])) return { kind: 'road', top: 64 }
  // Main Avenue, its sidewalks and the parking strip
  if (x >= AVE.x1 && x <= AVE.x2) {
    if (z >= AVE.z1 && z <= AVE.z2) {
      if (z === AVE.edge[0] || z === AVE.edge[1]) return { kind: 'line', top: 64, color: 'white' }
      if (z === AVE.dash && x % 6 < 3) return { kind: 'line', top: 64, color: 'yellow' }
      return { kind: 'road', top: 64 }
    }
    const cross = (x >= BANK_ST.road[0] && x <= BANK_ST.road[1]) || (x >= WEST_ST.road[0] && x <= WEST_ST.road[1])
    if (z >= AVE.walk[0][0] && z <= AVE.walk[0][1]) return cross ? { kind: 'road', top: 64 } : { kind: z === AVE.walk[0][1] ? 'curb' : 'walk', top: 64 }
    if (z >= AVE.walk[1][0] && z <= AVE.walk[1][1]) return { kind: z === AVE.walk[1][0] ? 'curb' : 'walk', top: 64 }
    if (z >= AVE.park[0] && z <= AVE.park[1]) return { kind: 'park', top: 64, bay: x % 5 === 0 && z <= 452 }
  }
  const d = rbD(x, z) // after the avenue, so the ring's sidewalk never cuts the avenue's end
  if (d < RB.r + RB.walk) return d < RB.island ? { kind: 'island', top: 64 } : d < RB.r ? { kind: 'road', top: 64 } : { kind: 'walk', top: 64 }
  // Bank Street, Vault Street, West Street (crossings are asphalt)
  const inBank = x >= BANK_ST.x1 && x <= BANK_ST.x2 && z >= BANK_ST.z1 && z < AVE.walk[0][0]
  const inVault = z >= VAULT_ST.z1 && z <= VAULT_ST.z2 && x >= VAULT_ST.x1 && x <= VAULT_ST.x2
  const inWest = x >= WEST_ST.x1 && x <= WEST_ST.x2 && z >= WEST_ST.z1 && z < AVE.walk[0][0]
  if (inBank || inVault || inWest) {
    const roadB = inBank && x >= BANK_ST.road[0] && x <= BANK_ST.road[1]
    const roadS = inVault && z >= VAULT_ST.road[0] && z <= VAULT_ST.road[1]
    const roadW = inWest && x >= WEST_ST.road[0] && x <= WEST_ST.road[1]
    if (roadB || roadS || roadW) {
      const dashB = roadB && !inVault && (x === 651 || x === 652) && z % 6 < 3
      const dashS = roadS && !inBank && !inWest && (z === 347 || z === 348) && x % 6 < 3
      return dashB || dashS ? { kind: 'line', top: 64, color: 'yellow' } : { kind: 'road', top: 64 }
    }
    const curb = (inBank && (x === 642 || x === 661)) || (inVault && (z === 342 || z === 353)) || (inWest && (x === 492 || x === 503))
    return { kind: curb ? 'curb' : 'walk', top: 64 }
  }
  if (inBox(x, z, [HATCH_LANE])) return { kind: 'lane', top: 64 }
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
const MOD = 'jewelry'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, s) }
const F = (x1, y1, z1, x2, y2, z2, s) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s) }
const G = (x, y, z) => B.get(x, y, z)

// ---- the numbers (section 4.2) ----------------------------------------------------------------------------------------
const BX = BOX.jewelry                                   // [596, 356, 639, 415]
const RG = REGION.jewelry                                // [598, 56, 374, 634, 97, 414]
const W = { x1: 600, x2: 631, z1: 376, z2: 411 }         // the building's outer walls; inside x 601..630, z 377..410
const IN = { x1: 601, x2: 630, z1: 377, z2: 410 }
const BASE = 57, GF = 64, OB1 = 72, OB2 = 79, FIN = 86, ROOF = 91 // floor slabs (feet stand one above)
const SLABS = [GF, OB1, OB2, FIN]
const HUT_TOP = 95, HUT_ROOF = 96
const ALLEY = [598, 356, 639, 373]
const STEP_BLOCKS = [[618, 385], [623, 386], [629, 391], [623, 393], [618, 396], [624, 401], // obby 1 east half
  [612, 401], [607, 403], [603, 395], [609, 393], [604, 386], [610, 385]]                    // and west half
const OB2_PILLARS = [604, 609, 614, 619, 625]
const VENT = { x1: 598, x2: 599, z1: 388, z2: 389 }      // the vent shaft (outside the west wall, sealed from the obbies)
const DECK = { x1: 632, x2: 634, z1: 389, z2: 393, ladder: [632, 391] }
const HUT_N = { x1: 606, x2: 614, z1: 377, z2: 387 }     // the north hut (flight A comes up in it)
const HUT_W = { x1: 608, x2: 614, z1: 387, z2: 397 }     // the west hut (flight B), with the north hut an L

// materials
const PIER = 'polished_blackstone', BAND = 'blackstone', CURTAIN = 'light_blue_stained_glass'
const DARKWALL = [['blackstone', 60], ['polished_blackstone_bricks', 40]]
const PLINTH = 'polished_deepslate'
const stair = (m, facing, half = 'bottom') => `${m}_stairs[facing=${facing},half=${half},shape=straight,waterlogged=false]`
const slab = (m, type) => `${m}_slab[type=${type},waterlogged=false]`
const ladder = facing => `ladder[facing=${facing},waterlogged=false]`
const LANTERN_HANG = 'lantern[hanging=true,waterlogged=false]'

// ---- the ground: the alley, the forecourt and every open column of the box (MIX.plaza: never a road block) ------------
function ground () {
  rect(BX[0], BX[1], BX[2], BX[3], (x, z) => {
    if (x >= W.x1 && x <= W.x2 && z >= W.z1 && z <= W.z2) return
    S(x, GF, z, pick(x, GF, z, MIX.plaza))
  })
  // a polished-andesite border round the forecourt (z 412..414, x 632..634) and the alley's gutter line
  for (let x = RG[0]; x <= RG[3]; x++) S(x, GF, 414, 'polished_andesite')
  for (let z = RG[2]; z <= 414; z++) S(634, GF, z, 'polished_andesite')
  for (let x = ALLEY[0]; x <= ALLEY[2]; x++) S(x, GF, 364, 'smooth_stone')
  // the two red X marks under the X window (3 x 3 each)
  for (const cx of [604, 609]) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (Math.abs(dx) === Math.abs(dz)) S(cx + dx, GF, 413 + dz, 'red_terracotta')
}

// ---- the shell: walls, floor slabs, roof and parapet --------------------------------------------------------------------
const isPierS = x => [600, 605, 611, 618, 624, 631].includes(x)   // south face (the X window bay x 606..610 has none)
const isPierE = z => [376, 382, 388, 394, 400, 406, 411].includes(z)
function wallBlock (x, y, z) {
  const south = z === W.z2, east = x === W.x2
  if (y <= BASE + 6) return 'polished_blackstone_bricks'                  // the basement walls (y 56..63)
  if (SLABS.includes(y)) return BAND                                       // the floor bands
  if (y === ROOF) return PIER
  const corner = (x === W.x1 || x === W.x2) && (z === W.z1 || z === W.z2)
  if (corner) return PIER
  if (south || east) {
    if ((south && isPierS(x)) || (east && isPierE(z))) return PIER
    if (y >= FIN + 1 && y <= FIN + 2) return 'polished_andesite'           // the top band: iron bars over andesite
    if (y >= FIN + 3) return 'iron_bars'
    return CURTAIN
  }
  // north and west: blackstone with small windows (1 x 2) between the floors, none by the vent shaft
  const along = z === W.z1 ? x : z
  const win = (along - 3) % 6 === 0 && [67, 68, 75, 76, 82, 83].includes(y) && !(x === W.x1 && along >= 386 && along <= 391)
  return win ? CURTAIN : pick(x, y, z, DARKWALL)
}
function shell () {
  // the basement's ground: carve the inside, floor y 56..57
  F(W.x1, 56, W.z1, W.x2, 56, W.z2, 'polished_blackstone_bricks')
  for (let x = IN.x1; x <= IN.x2; x++) for (let z = IN.z1; z <= IN.z2; z++) {
    S(x, BASE, z, (x + z) % 2 ? 'polished_deepslate' : 'deepslate_tiles')
    for (let y = BASE + 1; y <= GF - 1; y++) S(x, y, z, 'air')
  }
  // walls from y 56 to the roof
  for (let y = 56; y <= ROOF; y++) {
    for (let x = W.x1; x <= W.x2; x++) { S(x, y, W.z1, wallBlock(x, y, W.z1)); S(x, y, W.z2, wallBlock(x, y, W.z2)) }
    for (let z = W.z1 + 1; z < W.z2; z++) { S(W.x1, y, z, wallBlock(W.x1, y, z)); S(W.x2, y, z, wallBlock(W.x2, y, z)) }
  }
  // the cyan diamond (5 x 5) at the SE top corner, on both faces: sea lantern, prismarine, cyan glass
  const dia = (d, set) => { for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const r = Math.abs(a) + Math.abs(b); if (r <= 2) set(a, b, r === 0 ? 'sea_lantern' : r === 1 ? 'prismarine' : 'cyan_stained_glass') } }
  dia(0, (a, b, s) => S(627 + a, 84 + b, W.z2, s))
  dia(0, (a, b, s) => S(W.x2, 84 + b, 407 + a, s))
  // the floor slabs inside
  const floorMat = { [GF]: 'polished_blackstone', [OB1]: 'smooth_quartz', [OB2]: 'polished_deepslate', [FIN]: 'dark_oak_planks' }
  for (const y of SLABS) for (let x = IN.x1; x <= IN.x2; x++) for (let z = IN.z1; z <= IN.z2; z++) S(x, y, z, floorMat[y])
  // the ground slab lights the basement (sea lanterns under the carpet, every 6)
  for (let x = 604; x <= 628; x += 6) for (let z = 380; z <= 404; z += 6) S(x, GF, z, 'sea_lantern')
  // the roof: smooth quartz with polished-andesite ribs; the calcite parapet with its three gaps
  for (let x = IN.x1; x <= IN.x2; x++) for (let z = IN.z1; z <= IN.z2; z++) S(x, ROOF, z, (x - 600) % 6 === 0 || (z - 376) % 6 === 0 ? 'polished_andesite' : 'smooth_quartz')
  const gap = (x, z) => (z === W.z1 && x >= 609 && x <= 610) || (x === W.x1 && z >= VENT.z1 && z <= VENT.z2) || (x === W.x2 && z >= 390 && z <= 392)
  for (let x = W.x1; x <= W.x2; x++) for (const z of [W.z1, W.z2]) if (!gap(x, z)) S(x, ROOF + 1, z, 'calcite')
  for (let z = W.z1 + 1; z < W.z2; z++) for (const x of [W.x1, W.x2]) if (!gap(x, z)) S(x, ROOF + 1, z, 'calcite')
}

// ---- stairs between the floors ------------------------------------------------------------------------------------------
// One 3-wide flight: steps[i] = [z, top block y]; the steps are stairs, filled solid under them down to `base`.
function flight (x1, x2, steps, facing, base, mat = 'polished_blackstone') {
  for (const [z, y] of steps) for (let x = x1; x <= x2; x++) {
    for (let yy = base; yy < y; yy++) S(x, yy, z, mat)
    S(x, y, z, stair(mat, facing))
  }
}
function stairs () {
  // back stair NW: ground (feet 65) down north to the basement (feet 58), x 601..603, z 383..378; hole in the ground slab
  F(601, GF, 377, 603, GF, 383, 'air')
  flight(601, 603, [[383, 63], [382, 62], [381, 61], [380, 60], [379, 59], [378, 58]], 'south', BASE + 1)
  for (let z = 377; z <= 383; z++) S(604, GF + 1, z, 'iron_bars')                    // the rail along its open side
  for (let x = 601; x <= 603; x++) S(x, GF + 1, IN.z1 - 0, 'iron_bars')               // and its head end (z 377)
  // main stair NE: ground (feet 65) up north to obby 1's east end (feet 73 at z 379), x 628..630
  flight(628, 630, [[386, 65], [385, 66], [384, 67], [383, 68], [382, 69], [381, 70], [380, 71]], 'north', GF + 1)
  F(628, OB1, 380, 630, OB1, 383, 'air')
  // obby 1 -> obby 2, NW: up north from z 384 (feet 74) to the obby 2 floor at z 378 (feet 80), x 601..603
  flight(601, 603, [[384, 73], [383, 74], [382, 75], [381, 76], [380, 77], [379, 78]], 'north', OB1 + 1)
  F(601, OB2, 379, 603, OB2, 382, 'air')
  // obby 2 -> final floor, NE: up north from z 386 (feet 81) to the final floor at z 380 (feet 87), x 628..630
  flight(628, 630, [[386, 80], [385, 81], [384, 82], [383, 83], [382, 84], [381, 85]], 'north', OB2 + 1)
  F(628, FIN, 381, 630, FIN, 384, 'air')
  // flights A (north) and B (south) at x 611..613 up to the huts, each with a flat landing at feet 90 under its duck laser
  flight(611, 613, [[388, 87], [387, 88], [386, 89], [385, 89], [384, 89], [383, 90]], 'north', FIN + 1, 'polished_andesite')
  flight(611, 613, [[389, 87], [390, 88], [391, 89], [392, 89], [393, 89], [394, 90]], 'south', FIN + 1, 'polished_andesite')
  for (const z of [384, 385, 386, 391, 392, 393]) for (let x = 611; x <= 613; x++) S(x, 89, z, 'polished_andesite') // landings flat
  F(611, ROOF, 383, 613, ROOF, 386, 'air'); F(611, ROOF, 391, 613, ROOF, 394, 'air')          // the roof slab cut above them
}

// ---- the ground floor: the showroom ---------------------------------------------------------------------------------
// An island: a 1 x 4 plinth (the pile cells) at y 65, air 66..67, a glass lid at y 68, pane ends, the smash front 4 x 2.
function island (x1, pileZ, frontZ) {
  const backZ = pileZ + (pileZ - frontZ), x2 = x1 + 3
  for (let x = x1 - 1; x <= x2 + 1; x++) for (const z of [backZ, pileZ, frontZ]) {
    S(x, GF + 1, z, PLINTH)
    const end = x === x1 - 1 || x === x2 + 1
    for (const y of [GF + 2, GF + 3]) S(x, y, z, end ? 'glass_pane' : z === pileZ ? 'air' : 'glass') // front = the smash gate, back = permanent glass
    S(x, GF + 4, z, 'glass')                                                                          // the lid
  }
}
function showroom () {
  island(607, 382, 383); island(620, 382, 383)                     // islands 1, 2 face south onto the aisle (z 384..386)
  island(603, 388, 387); island(613, 388, 387); island(623, 388, 387) // islands 3-5 face north
  // the cashier counter on the north side (x 609..622, z 379) and the staff's back shelf
  for (let x = 609; x <= 622; x++) { S(x, GF + 1, 379, 'polished_blackstone'); S(x, GF + 2, 379, slab('smooth_quartz', 'bottom')) }
  for (let x = 609; x <= 622; x++) { S(x, GF + 1, 377, 'dark_oak_planks'); S(x, GF + 2, 377, slab('dark_oak', 'bottom')) }
  // dark pillars
  for (const [x, z] of [[608, 395], [621, 395], [608, 403], [621, 403]]) F(x, GF + 1, z, x, OB1 - 1, z, 'polished_blackstone')
  // the light box: sea lanterns in the slab over the centre aisle behind white glass
  for (let x = 605; x <= 626; x++) for (let z = 384; z <= 386; z++) { S(x, OB1, z, 'sea_lantern'); S(x, OB1 - 1, z, 'white_stained_glass') }
  // the vent's opening in the west wall (2 high) and the X window, the fake glass double door
  F(W.x1, GF + 1, VENT.z1, W.x1, GF + 2, VENT.z2, 'air')
  F(606, GF + 1, W.z2, 607, GF + 2, W.z2, 'red_stained_glass')     // G1 (smash gate: full glass)
  F(606, GF + 3, W.z2, 607, GF + 3, W.z2, PIER)                     // its dark lintel
  S(608, GF + 1, W.z2, PIER); S(608, GF + 2, W.z2, PIER); S(608, GF + 3, W.z2, PIER)
  F(609, GF + 1, W.z2, 610, GF + 2, W.z2, 'glass')                  // the fake double door (glass leaves, a dark frame)
  F(609, GF + 3, W.z2, 610, GF + 3, W.z2, PIER)
  // the smooth-quartz awning over the window and door
  for (let x = 603; x <= 612; x++) { S(x, GF + 4, 412, slab('smooth_quartz', 'bottom')); S(x, GF + 4, 413, slab('smooth_quartz', 'bottom')) }
  // a hanging sea-lantern pair over the counter
  for (const x of [611, 620]) S(x, OB1 - 1, 380, LANTERN_HANG)
}

// ---- the basement: the ring and watch counters, the workshop with the small safe ----------------------------------------
function counter (pileX, frontX, backX, z1, z2) {
  const lo = Math.min(pileX, frontX, backX), hi = Math.max(pileX, frontX, backX)
  for (let x = lo; x <= hi; x++) for (let z = z1 - 1; z <= z2 + 1; z++) {
    const end = z === z1 - 1 || z === z2 + 1
    S(x, BASE + 1, z, x === backX ? 'dark_oak_planks' : PLINTH)
    for (const y of [BASE + 2, BASE + 3]) S(x, y, z, x === backX ? 'dark_oak_planks' : end ? 'glass_pane' : x === pileX ? 'air' : 'glass')
    S(x, BASE + 4, z, x === backX ? slab('dark_oak', 'bottom') : 'glass')
  }
}
function basement () {
  counter(602, 603, 601, 390, 399)                                 // rings (G7 / P6) on the west wall
  counter(629, 628, 630, 391, 398)                                 // watches (G8 / P7) on the east wall
  // the workshop x 610..621, z 403..408: walls x 609 / 622, z 402 (doorway x 615..616), the safe wall z 409
  for (let y = BASE + 1; y <= GF - 1; y++) {
    for (let z = 402; z <= 410; z++) { S(609, y, z, 'polished_blackstone_bricks'); S(622, y, z, 'polished_blackstone_bricks') }
    for (let x = 609; x <= 622; x++) {
      if (!(x >= 615 && x <= 616 && y <= BASE + 3)) S(x, y, 402, 'polished_blackstone_bricks')
      S(x, y, 409, 'polished_blackstone_bricks'); S(x, y, 410, 'polished_blackstone_bricks')
    }
  }
  F(615, BASE + 2, 409, 616, BASE + 3, 409, 'iron_block')          // G9, the small safe (4 blocks)
  S(614, BASE + 2, 409, PIER); S(617, BASE + 2, 409, PIER); S(614, BASE + 3, 409, PIER); S(617, BASE + 3, 409, PIER); F(614, BASE + 4, 409, 617, BASE + 4, 409, PIER)
  // the repair-tray niche behind it at z 410: the tray y 58, air 59..60, solid above
  for (const x of [615, 616]) { S(x, BASE + 1, 410, 'smooth_stone'); S(x, BASE + 2, 410, 'air'); S(x, BASE + 3, 410, 'air') }
  // benches along the workshop's side walls, a lamp
  for (let z = 403; z <= 407; z++) { S(610, BASE + 1, z, 'dark_oak_planks'); S(610, BASE + 2, z, slab('dark_oak', 'bottom')); S(621, BASE + 1, z, 'dark_oak_planks'); S(621, BASE + 2, z, slab('dark_oak', 'bottom')) }
  S(612, BASE + 2, 405, 'lightning_rod[facing=up,powered=false,waterlogged=false]'); S(619, BASE + 2, 406, 'iron_chain[axis=x,waterlogged=false]')
  S(615, GF - 1, 405, LANTERN_HANG); S(616, GF - 1, 405, LANTERN_HANG)
}

// ---- obby 1 "Layered Laser" and obby 2 "Moving Lasers" ----------------------------------------------------------------
function obbies () {
  // obby 1: the partition x 615..616 (gap z 405..410), twelve glass stepping blocks, the mid landing P8
  F(615, OB1 + 1, IN.z1, 616, OB2 - 1, 404, 'polished_blackstone_bricks')
  for (const [x, z] of STEP_BLOCKS) S(x, OB1 + 1, z, CURTAIN)
  F(615, OB1 + 1, 407, 616, OB1 + 1, 408, PLINTH)
  // obby 2: five pillar pairs on the north (z 377) and south (z 410) walls, red emitters at the beam heights
  for (const x of OB2_PILLARS) for (const z of [IN.z1, IN.z2]) for (let y = OB2 + 1; y <= FIN - 1; y++) S(x, y, z, y === OB2 + 1 || y === OB2 + 2 ? 'red_stained_glass' : PIER)
  F(622, OB2 + 1, 389, 623, OB2 + 1, 390, PLINTH)                  // landing P9
  S(630, OB2 + 1, 389, 'polished_blackstone'); S(630, OB2 + 2, 389, 'iron_block'); S(630, OB2 + 3, 389, 'yellow_terracotta') // the fuse box prop (630, 81, 389)
  // dim ceiling lights (sea lanterns in the slab above, out of the beams' way)
  for (const y of [OB2, FIN]) for (let x = 606; x <= 626; x += 10) for (const z of [394, 404]) S(x, y, z, 'sea_lantern')
}

// ---- the final floor: P10, the glass-pane office wall with the VIP curtain, the safe G10 and the closet ---------------
function finalFloor () {
  F(624, FIN + 1, 380, 625, FIN + 1, 381, PLINTH)                  // P10's plinth
  // the office wall z 398 (glass panes), doorway x 615..616, y 87..89
  for (let x = IN.x1; x <= IN.x2; x++) for (let y = FIN + 1; y <= ROOF - 1; y++) if (!(x >= 615 && x <= 616 && y <= FIN + 3)) S(x, y, 398, 'glass_pane')
  // the closet x 612..619, z 406..410: walls x 611 / 620 and z 405; the safe G10 at x 615..616, y 87..88 in a dark frame
  for (let y = FIN + 1; y <= ROOF - 1; y++) {
    for (let z = 405; z <= 410; z++) { S(611, y, z, 'calcite'); S(620, y, z, 'calcite') }
    for (let x = 611; x <= 620; x++) S(x, y, 405, 'calcite')
  }
  F(614, FIN + 1, 405, 617, FIN + 3, 405, PIER)
  F(615, FIN + 1, 405, 616, FIN + 2, 405, 'iron_block')            // G10 (4 blocks)
  // the closet's piles: office cash P11 (a cash table) and the Blue Heart P12 (a plinth)
  F(612, FIN + 1, 408, 614, FIN + 1, 409, 'stripped_dark_oak_wood[axis=y]')
  S(618, FIN + 1, 409, 'light_blue_glazed_terracotta[facing=north]')
  S(615, ROOF - 1, 407, LANTERN_HANG)
  // the office: a desk, carpet; the rest of the floor blue carpet (laid in carpets())
  for (let x = 622; x <= 626; x++) { S(x, FIN + 1, 402, 'dark_oak_planks'); S(x, FIN + 2, 402, slab('dark_oak', 'bottom')) }
  S(624, FIN + 1, 404, stair('dark_oak', 'south'))
  for (const [x, z] of [[606, 392], [624, 392], [606, 402], [620, 380]]) S(x, ROOF, z, 'sea_lantern')
}

// ---- the roof huts, the vent shaft, the east deck --------------------------------------------------------------------
function hut (H) {
  for (let y = ROOF + 1; y <= HUT_TOP; y++) for (let x = H.x1; x <= H.x2; x++) for (let z = H.z1; z <= H.z2; z++) {
    if (x !== H.x1 && x !== H.x2 && z !== H.z1 && z !== H.z2) continue
    const edge = (x === H.x1 || x === H.x2) && (z === H.z1 || z === H.z2)
    S(x, y, z, edge || y === HUT_TOP ? 'smooth_quartz' : 'calcite')
  }
  F(H.x1, HUT_ROOF, H.z1, H.x2, HUT_ROOF, H.z2, 'gray_terracotta')
}
function roofTop () {
  hut(HUT_N); hut(HUT_W)
  // the three open doorways (no door blocks): north (to the landing), and west / east at the west hut's south end
  F(609, ROOF + 1, HUT_N.z1, 610, ROOF + 3, HUT_N.z1, 'air')
  F(HUT_W.x1, ROOF + 1, 395, HUT_W.x1, ROOF + 3, 396, 'air')
  F(HUT_W.x2, ROOF + 1, 395, HUT_W.x2, ROOF + 3, 396, 'air')
  for (const H of [HUT_N, HUT_W]) S(Math.round((H.x1 + H.x2) / 2) - 1, HUT_TOP, H.z1 + 2, 'sea_lantern')
  // the vent shaft x 598..599, z 388..389: walls x 597, z 387 / 390 from y 65 to the parapet; ladder at x 599 on the
  // building wall from y 68 (3 blocks over the shaft floor: a drop) to the roof
  for (let y = GF + 1; y <= ROOF + 1; y++) {
    for (let z = VENT.z1 - 1; z <= VENT.z2 + 1; z++) S(VENT.x1 - 1, y, z, pick(VENT.x1 - 1, y, z, DARKWALL))
    for (let x = VENT.x1; x <= VENT.x2; x++) { S(x, y, VENT.z1 - 1, pick(x, y, VENT.z1 - 1, DARKWALL)); S(x, y, VENT.z2 + 1, pick(x, y, VENT.z2 + 1, DARKWALL)) }
  }
  for (let y = 68; y <= ROOF; y++) for (let z = VENT.z1; z <= VENT.z2; z++) S(VENT.x2, y, z, ladder('west'))
  for (let x = VENT.x1 - 1; x <= VENT.x2; x++) for (const z of [VENT.z1 - 1, VENT.z2 + 1]) S(x, ROOF + 2, z, slab('polished_blackstone', 'bottom'))
  // the east deck over the forecourt (y 91), its rail, the ladder hole at (632, 391): ladder y 69..90 on the wall
  for (let x = DECK.x1; x <= DECK.x2; x++) for (let z = DECK.z1; z <= DECK.z2; z++) {
    if (x === DECK.ladder[0] && z === DECK.ladder[1]) continue
    S(x, ROOF, z, 'polished_andesite')
    if (x === DECK.x2 || z === DECK.z1 || z === DECK.z2) S(x, ROOF + 1, z, 'iron_bars')
  }
  for (let y = 69; y <= ROOF - 1; y++) { S(W.x2, y, DECK.ladder[1], PIER); S(DECK.ladder[0], y, DECK.ladder[1], ladder('east')) }
  for (const z of [DECK.z1, DECK.z2]) S(DECK.x1, ROOF - 1, z, stair('polished_blackstone', 'west', 'top'))
  // AC units on the open roof (east half)
  for (const [x, z] of [[621, 381], [621, 404], [627, 404]]) { F(x, ROOF + 1, z, x + 2, ROOF + 1, z + 1, 'light_gray_concrete'); F(x, ROOF + 2, z, x + 2, ROOF + 2, z + 1, 'iron_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]') }
}

// ---- the roof landing, the steel fire escape (z 370..373) and the alley -------------------------------------------------
function fireEscape () {
  const TD = 'iron_trapdoor[facing=north,half=top,open=false,powered=false,waterlogged=false]'
  F(604, ROOF, 374, 614, ROOF, 375, TD)                             // the landing z 374..375 (in the region)
  F(604, ROOF, 370, 606, ROOF, 373, TD)                             // P0
  for (let i = 1; i <= 8; i++) for (const z of [370, 371]) S(606 + i, ROOF - i, z, stair('polished_blackstone', 'west'))   // F1 down east
  F(615, 82, 370, 617, 82, 373, TD)                                 // P1
  for (let j = 1; j <= 8; j++) for (const z of [372, 373]) S(615 - j, 82 - j, z, stair('polished_blackstone', 'east'))     // F2 down west
  F(604, 73, 370, 606, 73, 373, TD)                                 // P2
  for (let k = 1; k <= 3; k++) for (const z of [370, 371]) S(606 + k, 73 - k, z, stair('polished_blackstone', 'west'))     // F3 down east
  F(610, 69, 370, 612, 69, 371, TD)                                 // P3, the lowest rung: y 69 (a drop to the alley)
  // rails on the outer side (z 369) and the landing's ends; the hangers (chains) between the platforms
  for (const [x1, x2, y] of [[604, 606, ROOF], [615, 617, 82], [604, 606, 73]]) for (let x = x1; x <= x2; x++) S(x, y + 1, 369, 'iron_bars')
  for (let z = 370; z <= 373; z++) { S(603, ROOF + 1, z, 'iron_bars'); S(603, 74, z, 'iron_bars'); S(618, 83, z, 'iron_bars') }
  for (let y = 74; y <= ROOF - 1; y++) S(604, y, 369, 'iron_chain[axis=y,waterlogged=false]')
  for (let y = 83; y <= ROOF - 1; y++) S(617, y, 369, 'iron_chain[axis=y,waterlogged=false]')
}
function alley () {
  // a dumpster (no container: concrete with a trapdoor lid) and a pile of crates against the store's north wall
  for (const [x, z] of [[622, 372]]) { F(x, GF + 1, z, x + 2, GF + 1, z + 1, 'green_concrete'); F(x, GF + 2, z, x + 2, GF + 2, z + 1, 'iron_trapdoor[facing=south,half=bottom,open=false,powered=false,waterlogged=false]') }
  F(627, GF + 1, 373, 628, GF + 1, 373, 'spruce_planks'); S(627, GF + 2, 373, 'spruce_planks')
  // wall lanterns on the store's north wall over the alley (on slabs fixed to the wall)
  for (const x of [603, 616, 629]) { S(x, 70, 375, slab('polished_blackstone', 'top')); S(x, 69, 375, LANTERN_HANG) }
  // bollards at the alley's east mouth onto Bank Street (the bikes leave west)
  for (const z of [358, 362, 366, 370]) { S(638, GF + 1, z, 'andesite_wall[east=none,north=none,south=none,up=true,waterlogged=false,west=none]') }
}

// ---- carpets, then pane and bar connections --------------------------------------------------------------------------
const SOLIDISH = s => s && !/^(?:minecraft:)?(air|.*_slab|.*_stairs|.*_carpet|ladder|.*_trapdoor|.*_wall|iron_chain|lantern|lightning_rod|.*_pane|iron_bars)(\[|$)/.test(s)
function carpets () {
  const lay = (y, color, zz = () => true) => { for (let x = IN.x1; x <= IN.x2; x++) for (let z = IN.z1; z <= IN.z2; z++) if (!G(x, y, z) && SOLIDISH(G(x, y - 1, z)) && zz(z)) S(x, y, z, `${color}_carpet`) }
  lay(GF + 1, 'blue')
  lay(FIN + 1, 'light_blue', z => z < 398); lay(FIN + 1, 'blue', z => z > 398)
}
function connect () {
  const pane = s => s && /^(glass_pane|iron_bars)$/.test(s)
  const joins = s => !!s && (/(glass_pane|iron_bars)/.test(s) || !!SOLIDISH(s))
  for (const [k, s] of [...B.blocks]) {
    if (!pane(s)) continue
    const [x, y, z] = k.split(',').map(Number)
    const c = (dx, dz) => joins(B.get(x + dx, y, z + dz))
    B.blocks.set(k, `${s}[east=${c(1, 0)},north=${c(0, -1)},south=${c(0, 1)},waterlogged=false,west=${c(-1, 0)}]`)
  }
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  ground(); shell(); stairs(); showroom(); basement(); obbies(); finalFloor(); roofTop(); fireEscape(); alley(); carpets(); connect()
  B = null
  return b
}
module.exports.build = () => module.exports()

// Text displays (tag city_label): 0.03 off the face, y = the text's bottom.
module.exports.labels = [
  { x: 615.0, y: 69.3, z: 412.03, facing: 'south', text: 'JEWELRY', color: '#e8f8ff', scale: 3.2 },   // the south curtain over the awning
  { x: 632.03, y: 69.3, z: 400.0, facing: 'east', text: 'JEWELRY', color: '#e8f8ff', scale: 3.2 },    // the east curtain on Bank Street
  { x: 610.0, y: 95.1, z: 376.97, facing: 'north', text: 'FIRE EXIT', color: '#ff3b30', scale: 0.9 }  // over the north hut's doorway (y 92..94)
]
module.exports.displays = []
// Section 7.2's spots (x, y, z, yaw).
module.exports.points = {
  JEWELRY_EXIT: [612.5, 65, 417.5, 0],
  JEWELRY_HOLO: [632.5, 70, 413.5, 0],
  JEWELRY_COP_1: [596.5, 65, 417.5, 0],
  JEWELRY_COP_2: [662.5, 65, 417.5, 0],
  JEWELRY_BIKE_1: [601.5, 65, 360.5, 90],
  JEWELRY_BIKE_2: [603.5, 65, 360.5, 90],
  JEWELRY_BIKE_3: [605.5, 65, 360.5, 90],
  JEWELRY_FUSE: [630, 81, 389, -90],          // the fuse box prop (M2)
  JEWELRY_VENT_TOP: [599.5, 92, 388.5, 90],   // the vent shaft's ladder top
  JEWELRY_DECK: [633.5, 92, 391.5, -90]
}
// Section 7.1 / 7.2 verbatim (city.js setup strips the # notes and puts in the world).
module.exports.setup = {
  regions: [{ id: 'heist_jewelry', box: RG, size: (RG[3] - RG[0] + 1) * (RG[4] - RG[1] + 1) * (RG[5] - RG[2] + 1), flags: ['passthrough allow'],
    lines: [
      '(G) //pos1 598,56,374',
      '(G) //pos2 634,97,414',
      '(G) /rg define heist_jewelry',
      '(C) rg flag -w W heist_jewelry passthrough allow',
    ] }],
  heists: [{
    id: 'jewelry', difficulty: 2, name: 'Jewelry Store', level: 5, advanced: false, pvp: false, police: true,
    pool: 26000, escape: '6:00', cooldown: '10:00', exit: [612.5, 65, 417.5, 0], holo: [632.5, 70, 413.5],
    lines: [
      '(G) /dheist create jewelry 2',
      '(G) /dheist set jewelry name Jewelry Store',
      '(G) /dheist set jewelry pool 26000',
      '(G) /dheist exit jewelry 612.5 65 417.5 0',
      '# gates (G1..G10)',
      '(G) /dloot add jewelry smash 606 65 411 607 66 411                    # G1 X window (entry; test 2.9a)',
      '(G) /dloot add jewelry smash 607 66 383 610 67 383                    # G2 island 1 front',
      '(G) /dloot add jewelry smash 620 66 383 623 67 383                    # G3 island 2',
      '(G) /dloot add jewelry smash 603 66 387 606 67 387                    # G4 island 3',
      '(G) /dloot add jewelry smash 613 66 387 616 67 387                    # G5 island 4',
      '(G) /dloot add jewelry smash 623 66 387 626 67 387                    # G6 island 5',
      '(G) /dloot add jewelry smash 603 59 390 603 60 399                    # G7 ring counter',
      '(G) /dloot add jewelry smash 628 59 391 628 60 398                    # G8 watch counter',
      '(G) /dloot add jewelry safe 615 59 409 616 60 409 digits=4 claim=6    # G9 workshop safe',
      '(G) /dloot add jewelry safe 615 87 405 616 88 405 digits=4 claim=6    # G10 office safe',
      '# piles (P1..P13)',
      '(G) /dloot add jewelry pile 607 65 382 610 65 382 value=1250-2250 style=jewel behind=2 name=Display_case',
      '(G) /dloot add jewelry pile 620 65 382 623 65 382 value=1250-2250 style=jewel behind=3 name=Display_case',
      '(G) /dloot add jewelry pile 603 65 388 606 65 388 value=1250-2250 style=jewel behind=4 name=Display_case',
      '(G) /dloot add jewelry pile 613 65 388 616 65 388 value=1250-2250 style=jewel behind=5 name=Display_case',
      '(G) /dloot add jewelry pile 623 65 388 626 65 388 value=1250-2250 style=jewel behind=6 name=Display_case',
      '(G) /dloot add jewelry pile 602 58 390 602 58 399 value=2000-3500 style=jewel behind=7 name=Rings',
      '(G) /dloot add jewelry pile 629 58 391 629 58 398 value=2000-3400 style=goods per-cell=4 behind=8 name=Watches',
      '(G) /dloot add jewelry pile 615 73 407 616 73 408 value=500-1250 style=jewel name=Loose_gems',
      '(G) /dloot add jewelry pile 622 80 389 623 80 390 value=500-1250 style=jewel name=Loose_gems',
      '(G) /dloot add jewelry pile 624 87 380 625 87 381 value=500-1250 style=jewel name=Loose_gems',
      '(G) /dloot add jewelry pile 612 87 408 614 87 409 value=1200-2400 style=cash behind=10 name=Office_cash',
      '(G) /dloot add jewelry pile 618 87 409 618 87 409 value=6000-6000 style=jewel piece=6000 take=4 behind=10 name=Blue_Heart',
      '(G) /dloot add jewelry pile 615 58 410 616 58 410 value=1000-2000 style=jewel behind=9 name=Repair_tray',
      '#   fallback P14 only if test 2.9a fails (a smash gate needs a pile behind it):',
      '#   /dloot add jewelry pile 605 65 410 605 65 410 value=250-500 style=jewel behind=1 name=Window_tray',
      '(G) /dloot check jewelry',
      '# traps (T1..T27)',
      '(G) /dtrap add jewelry laser 601.0 65.4 390.5 631.0 65.4 390.5 damage=1.5',
      '(G) /dtrap add jewelry laser 601.0 65.4 385.5 631.0 65.4 385.5 damage=1.5',
      '(G) /dtrap add jewelry laser 628.5 65.4 388 628.5 65.4 410 damage=1.5',
      '(G) /dtrap add jewelry camera 615.5 70.5 379.5 0 25 effect=damage damage=1 angle=30 range=12 sweep=70 period=6 every=1.0   # T4 counter turret',
      '(G) /dtrap add jewelry laser 604.0 58.4 389.5 628.0 58.4 389.5 damage=1.5 blink=true on=2 off=1.5 offset=0',
      '(G) /dtrap add jewelry laser 604.0 58.4 394.5 628.0 58.4 394.5 damage=1.5 blink=true on=2 off=1.5 offset=0.7',
      '(G) /dtrap add jewelry laser 604.0 58.4 399.5 628.0 58.4 399.5 damage=1.5 blink=true on=2 off=1.5 offset=1.4',
      '(G) /dtrap add jewelry laser 617.0 73.4 388.5 631.0 73.4 388.5 damage=2           # T8  obby 1 east',
      '(G) /dtrap add jewelry laser 617.0 74.65 398.5 631.0 74.65 398.5 damage=2         # T9  (duck)',
      '(G) /dtrap add jewelry laser 620.5 73.4 377.0 620.5 73.4 404.0 damage=2           # T10',
      '(G) /dtrap add jewelry laser 626.5 74.65 377.0 626.5 74.65 404.0 damage=2         # T11 (duck)',
      '(G) /dtrap add jewelry laser 601.0 73.4 398.5 615.0 73.4 398.5 damage=2           # T12 obby 1 west',
      '(G) /dtrap add jewelry laser 601.0 74.65 388.5 615.0 74.65 388.5 damage=2         # T13 (duck)',
      '(G) /dtrap add jewelry laser 605.5 73.4 377.0 605.5 73.4 404.0 damage=2           # T14',
      '(G) /dtrap add jewelry laser 611.5 73.4 377.0 611.5 73.4 404.0 damage=2           # T15',
      '(G) /dtrap add jewelry laser 604.5 80.4 377.0 604.5 80.4 410.0 damage=2 blink=true on=1.5 off=1.5 offset=0       # T16 obby 2, pair 1 (low)',
      '(G) /dtrap add jewelry laser 609.5 81.65 377.0 609.5 81.65 410.0 damage=2 blink=true on=1.5 off=1.5 offset=0.5   # T17 pair 2 (duck)',
      '(G) /dtrap add jewelry laser 614.5 80.4 377.0 614.5 80.4 410.0 damage=2 blink=true on=1.5 off=1.5 offset=1       # T18 pair 3 (low)',
      '(G) /dtrap add jewelry laser 619.5 81.65 377.0 619.5 81.65 410.0 damage=2 blink=true on=1.5 off=1.5 offset=1.5   # T19 pair 4 (duck)',
      '(G) /dtrap add jewelry laser 625.5 80.4 377.0 625.5 80.4 410.0 damage=2 blink=true on=1.5 off=1.5 offset=2       # T20 pair 5 (low)',
      '(G) /dtrap add jewelry laser 625.5 81.65 377.0 625.5 81.65 410.0 damage=2 blink=true on=1.5 off=1.5 offset=0.5   # T21 pair 5 (duck, in turn with T20)',
      '(G) /dtrap add jewelry laser 611.0 91.65 385.5 614.0 91.65 385.5 damage=2         # T22 flight A landing (feet 90, duck)',
      '(G) /dtrap add jewelry laser 611.0 91.65 392.5 614.0 91.65 392.5 damage=2         # T23 flight B landing (feet 90, duck)',
      '(G) /dtrap add jewelry laser 615.0 87.4 398.5 617.0 87.4 398.5 damage=1 blink=true on=2 off=2 offset=0     # T24 VIP curtain',
      '(G) /dtrap add jewelry laser 615.0 88.0 398.5 617.0 88.0 398.5 damage=1 blink=true on=2 off=2 offset=0     # T25',
      '(G) /dtrap add jewelry laser 615.0 88.65 398.5 617.0 88.65 398.5 damage=1 blink=true on=2 off=2 offset=0   # T26',
      '(G) /dtrap add jewelry camera 615.5 90.0 401.5 180 35 effect=damage damage=1 angle=25 range=5 every=1.0   # T27 office turret: inside, over the curtain, looking north at the doorway',
      '# cops (unused while not advanced), hologram, open',
      '(G) /dcops jewelry add 596.5 65 417.5',
      '(G) /dcops jewelry add 662.5 65 417.5',
      '(G) /dheist snapshot jewelry',
      '(G) /dheist holo jewelry 632.5 70 413.5',
      '(G) /dheist enable jewelry',
    ]
  }],
  keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], pois: [], walls: [], holos: [],
  bikes: [
        '(C) dbike spotat jailbreak 601.5 65 360.5 90',
        '(C) dbike spotat jailbreak 603.5 65 360.5 90',
        '(C) dbike spotat jailbreak 605.5 65 360.5 90',
  ]
}

// ---- self-checks (node tools/build/city/jewelry.js --check): the parts of 9.1 / 11 this module can run alone -----------
function selfCheck () {
  const b = module.exports(), bad = [], warn = []
  const air = (x, y, z) => { const s = b.get(x, y, z); return y >= GF + 1 ? (!s || s === 'air') : s === 'air' }
  const solid = (x, y, z) => { const s = b.get(x, y, z); return !!s && s !== 'air' && !/(_carpet|ladder|lantern|_pane|iron_bars|iron_chain)/.test(s) }
  for (const k of b.blocks.keys()) { const [x, y, z] = k.split(',').map(Number); if (!own(x, y, z)) bad.push(`block outside the box: ${k}`) }
  const [rx1, ry1, rz1, rx2, ry2, rz2] = RG
  const inR = (x, y, z) => x >= rx1 && x < rx2 + 1 && y >= ry1 && y < ry2 + 1 && z >= rz1 && z < rz2 + 1
  const lines = module.exports.setup.heists[0].lines.map(l => l.replace(/#.*$/, '').trim())
  const piles = [], gates = []
  for (const l of lines) {
    let m
    if ((m = /dloot add jewelry (smash|safe|drill|pile) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+)/.exec(l))) {
      const c = m.slice(2, 8).map(Number), cells = []
      for (let x = c[0]; x <= c[3]; x++) for (let y = c[1]; y <= c[4]; y++) for (let z = c[2]; z <= c[5]; z++) cells.push([x, y, z])
      ;(m[1] === 'pile' ? piles : gates).push({ kind: m[1], cells, l })
    } else if ((m = /dtrap add jewelry laser ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)/.exec(l))) {
      const c = m.slice(1, 7).map(Number)
      const inside = (x, y, z) => x - rx1 >= 2 && rx2 + 1 - x >= 2 && y - ry1 >= 2 && ry2 + 1 - y >= 2 && z - rz1 >= 2 && rz2 + 1 - z >= 2
      if (!inside(c[0], c[1], c[2]) || !inside(c[3], c[4], c[5])) bad.push(`laser < 2 inside the region: ${l}`)
      // nothing solid on the beam's path except its ends (sampled every 0.25)
      const n = Math.ceil(Math.hypot(c[3] - c[0], c[4] - c[1], c[5] - c[2]) * 4), hits = new Set()
      for (let i = 1; i < n; i++) { const t = i / n, x = Math.floor(c[0] + (c[3] - c[0]) * t), y = Math.floor(c[1] + (c[4] - c[1]) * t), z = Math.floor(c[2] + (c[5] - c[2]) * t); if (solid(x, y, z)) hits.add(`${x},${y},${z}=${b.get(x, y, z)}`) }
      if (hits.size) warn.push(`beam through blocks (${[...hits].slice(0, 4).join(' ')}${hits.size > 4 ? ' ...' : ''}): ${l}`)
    } else if ((m = /dtrap add jewelry camera ([\d.]+) ([\d.]+) ([\d.]+)/.exec(l))) {
      const [x, y, z] = m.slice(1, 4).map(Number)
      if (solid(Math.floor(x), Math.floor(y), Math.floor(z))) bad.push(`camera inside a block: ${l}`)
    }
  }
  for (const p of piles) for (const [x, y, z] of p.cells) {
    if (!solid(x, y, z)) bad.push(`pile cell not solid (${x},${y},${z}=${b.get(x, y, z)}): ${p.l}`)
    if (!air(x, y + 1, z) || !air(x, y + 2, z)) bad.push(`pile cell without 2 air above (${x},${y},${z}: ${b.get(x, y + 1, z)}, ${b.get(x, y + 2, z)}): ${p.l}`)
    if (!inR(x, y, z)) bad.push(`pile outside the region: ${p.l}`)
  }
  const seen = new Set()
  for (const p of piles) for (const c of p.cells) { const k = c.join(','); if (seen.has(k)) bad.push(`piles overlap at ${k}`); seen.add(k) }
  for (const g of gates) {
    if (g.cells.length > 27) bad.push(`gate over 27 blocks: ${g.l}`)
    for (const [x, y, z] of g.cells) {
      const s = b.get(x, y, z) || ''
      if (!solid(x, y, z)) bad.push(`gate cell not solid (${x},${y},${z}=${s}): ${g.l}`)
      if (g.kind === 'smash' && !/(^|_)glass$|stained_glass$/.test(s)) bad.push(`smash gate cell not full glass (${x},${y},${z}=${s})`)
      if (!inR(x, y, z)) bad.push(`gate outside the region: ${g.l}`)
    }
  }
  for (const [n, p] of Object.entries(module.exports.points)) if (/EXIT|COP|BIKE/.test(n) && inR(...p.slice(0, 3))) bad.push(`${n} inside the region`)
  // open-sky road blocks at y 62..71 (9.2): no black / gray / white / yellow concrete or powder on top of an open column
  const top = new Map()
  for (const k of b.blocks.keys()) { const [x, y, z] = k.split(',').map(Number); const t = top.get(`${x},${z}`); if (b.get(x, y, z) !== 'air' && (t === undefined || y > t)) top.set(`${x},${z}`, y) }
  for (const [k, y] of top) { const [x, z] = k.split(',').map(Number); const s = b.get(x, y, z); if (y >= 62 && y <= 71 && /^(black|gray|white|yellow)_concrete/.test(s)) bad.push(`open-sky road block ${s} at ${x},${y},${z}`) }
  // the ladders end where the plan says (drops, no climbs)
  const lowest = (x, z) => { for (let y = 56; y <= 100; y++) if (/ladder/.test(b.get(x, y, z) || '')) return y }
  if (lowest(599, 388) !== 68) bad.push(`vent ladder starts at ${lowest(599, 388)}, not 68`)
  if (lowest(632, 391) !== 69) bad.push(`deck ladder starts at ${lowest(632, 391)}, not 69`)
  let feLow = 999
  for (const k of b.blocks.keys()) { const [x, y, z] = k.split(',').map(Number); if (z >= 369 && z <= 373 && x >= 603 && x <= 618 && y > GF && b.get(x, y, z) !== 'air') feLow = Math.min(feLow, y) }
  if (feLow !== 69) bad.push(`fire escape's lowest block y ${feLow}, not 69`)
  const n = b.blocks.size
  if (n > 70000) bad.push(`${n} blocks over the 70K budget`)
  return { n, bad, warn, piles: piles.length, gates: gates.length }
}

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks (budget 70,000), box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}; ${module.exports.labels.length} labels`)
  if (process.argv.includes('--check')) {
    const r = selfCheck()
    console.log(`${r.gates} gates, ${r.piles} piles checked`)
    for (const w of r.warn) console.log(`WARN ${w}`)
    for (const e of r.bad) console.log(`FAIL ${e}`)
    console.log(r.bad.length ? `${r.bad.length} problem(s)` : 'all checks passed')
    process.exit(r.bad.length ? 1 : 0)
  }
}
