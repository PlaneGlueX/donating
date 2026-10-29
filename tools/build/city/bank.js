'use strict'
// bank: the Bank (tools/build/city/PLAN.md section 5; its setup lines 7.1 and 7.3). Box x 560..639, z 280..321, y 44..110;
// world `jailbreak`, ground y 64. The green-glass tower x 597..628, z 282..319 (lobby, mezzanine, sealed floors 2-5, the
// helipad roof, the brick B-A-N-K pylon), B1 (the laser bay, the counting room) and B2 (antechamber, vestibule, vault)
// under it, the tunnel west to the manhole on Hatch Plaza, the front plaza onto Bank Street.
//   node tools/build/city/bank.js   -> blocks vs the budget (PLAN 9.1) and the bounds
//   node tools/build/render.js tools/build/city/bank.js <out> --views top,plan,iso --y 49,57,65,71,78 --px 6
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

const MOD = 'bank'
const own = ownFor(MOD)
let B = null
// the module's clipped setter: a state string, or a function (x, y, z) -> state (a mix)
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s)
}
const M = m => (x, y, z) => pick(x, y, z, m)
const stairs = (m, facing, half = 'bottom') => `${m}_stairs[facing=${facing},half=${half},shape=straight,waterlogged=false]`

// ---- the bank's numbers (PLAN 5.2; every one is the plan's) -----------------------------------------------------------
const BLD = { x1: 597, x2: 628, z1: 282, z2: 319 }       // the tower's walls (inside x 598..627, z 283..318)
const LOBBY_Y = 64, MEZZ_Y = 70, FLOORS = [77, 83, 89, 95], ROOF_Y = 98 // floor slabs; B1's is 56, B2's 48
const PYLON = { x1: 625, z1: 316, x2: 628, z2: 319, top: 102 } // the brick B-A-N-K pylon at the SE corner
const DOOR = { z1: 298, z2: 301, y2: 68 }                 // the front doorway in the east face x 628, 4 wide x 4 high
const FRONT = [629, 280, 639, 321]                        // the front plaza onto Bank Street's sidewalk (x 640)
const HATCH = [560, 285, 590, 315]                        // Hatch Plaza behind the bank
const HOLE = { x: 575, z: 300 }                           // the manhole: the shaft's one column, ladder against x 574
const TUNNEL = { x1: 576, x2: 594, z1: 299, z2: 300 }     // floor y 48, feet 49..52
const PIERS_X = [597, 603, 609, 615, 621, 628], PIERS_Z = [282, 288, 294, 300, 306, 312, 319]
const inPylon = (x, z) => x >= PYLON.x1 && x <= PYLON.x2 && z >= PYLON.z1 && z <= PYLON.z2
const edge = (x, z) => x === BLD.x1 || x === BLD.x2 || z === BLD.z1 || z === BLD.z2
const pier = (x, z) => (x === BLD.x1 || x === BLD.x2) ? PIERS_Z.includes(z) : PIERS_X.includes(x)

// ---- underground: everything under the tower is solid, then B1 and B2 are carved out of it --------------------------------
function underground () {
  F(595, 47, 281, 628, 63, 320, 'stone')               // the basement block (the region's columns that hold rooms)
  F(574, 47, 298, 594, 63, 301, M(MIX.stonebrick))     // the tunnel's and the shaft's block

  // B2 (floor 48, feet 49): the corridor from the stair, the antechamber, the vestibule, the vault
  F(601, 48, 281, 614, 56, 307, 'polished_deepslate')  // antechamber + corridor shell (floor 48, ceiling 56)
  F(595, 48, 296, 601, 53, 304, 'polished_deepslate')  // the vestibule's shell
  F(614, 48, 292, 627, 56, 307, M(MIX.darkstone))      // the vault's shell (re-dressed below)
  F(602, 49, 294, 613, 54, 306, 'air')                 // the antechamber (ceiling y 55)
  rect(602, 294, 613, 306, (x, z) => S(x, 48, z, (x + z) % 2 ? 'polished_blackstone_bricks' : 'polished_deepslate'))
  F(596, 49, 297, 601, 52, 303, 'air')                 // the exit vestibule (lasers T16-T18 across it)
  F(596, 48, 297, 601, 48, 303, 'polished_blackstone_bricks')
  F(595, 49, 299, 595, 51, 300, 'iron_block')          // G7 the alternate exit, in the region's west face (opens from inside)
  F(603, 49, 282, 607, 52, 283, 'air')                 // the stair's foot landing
  F(606, 49, 284, 607, 52, 293, 'air')                 // the corridor south into the antechamber
  // lights: sea lanterns in the antechamber's ceiling, one each in the corridor and the vestibule
  for (const [x, z] of [[604, 297], [610, 297], [604, 303], [610, 303]]) S(x, 55, z, 'sea_lantern')
  S(606, 53, 288, 'sea_lantern')
  S(598, 53, 300, 'sea_lantern')

  // the vault x 615..626, z 293..306 (froglight-lit), its walls x 614 / 627, z 292 / 307
  F(615, 49, 293, 626, 55, 306, 'air')
  rect(615, 293, 626, 306, (x, z) => S(x, 48, z, (x + z) % 2 ? 'smooth_quartz' : 'polished_diorite'))
  rect(615, 293, 626, 306, (x, z) => S(x, 56, z, (x - 615) % 4 === 1 && (z - 293) % 4 === 1 ? 'ochre_froglight[axis=y]' : 'smooth_quartz'))
  for (let y = 49; y <= 55; y++) {
    for (let z = 292; z <= 307; z++) { S(627, y, z, y === 55 ? 'gold_block' : 'polished_deepslate'); S(614, y, z, 'polished_deepslate') }
    for (let x = 615; x <= 626; x++) { S(x, y, 292, y === 55 ? 'gold_block' : 'polished_deepslate'); S(x, y, 307, y === 55 ? 'gold_block' : 'polished_deepslate') }
  }
  // the deposit walls: east (x 626, P9 on the y 50 ledge, z 295..302) and north (z 293, P10, x 619..624): boxes below and
  // above a 2-high recess (the pile cells' air)
  F(626, 49, 293, 626, 55, 306, 'chiseled_polished_blackstone')
  F(626, 50, 295, 626, 50, 302, 'iron_block'); F(626, 51, 295, 626, 52, 302, 'air')
  F(619, 49, 293, 624, 55, 293, 'chiseled_polished_blackstone')
  F(619, 50, 293, 624, 50, 293, 'iron_block'); F(619, 51, 293, 624, 52, 293, 'air')
  // the gold pallets P6 (617..618, z 294..296) and P7 (z 303..305), the cash trolley P8 (620..621, z 294..296)
  F(617, 49, 294, 618, 49, 296, 'stripped_oak_wood[axis=x]'); F(617, 49, 303, 618, 49, 305, 'stripped_oak_wood[axis=x]')
  F(620, 49, 294, 621, 49, 296, 'iron_block')
  // the Reserve cage: G6 the bars at z 303 (x 623..625, y 49..51), bars round it and over it, P12's pallets at z 305..306
  F(622, 49, 303, 622, 52, 306, 'iron_bars'); F(623, 52, 303, 625, 52, 306, 'iron_bars')
  F(623, 49, 303, 625, 51, 303, 'iron_bars')            // G6
  F(623, 49, 305, 625, 49, 306, 'stripped_oak_wood[axis=x]')
  // Box 167: G5 (623, 50..51, 307) in the south wall, P11 behind it (623, 49, 308) in a 1 x 1 x 2 box
  F(622, 48, 307, 624, 53, 309, 'polished_deepslate')
  S(623, 49, 307, 'polished_deepslate'); F(623, 50, 307, 623, 51, 307, 'iron_block')   // G5
  S(623, 49, 308, 'iron_block'); F(623, 50, 308, 623, 51, 308, 'air')                  // P11's cell and its air
  // the vault door G4: a 5 x 5 octagon face at x 614, z 298..302, y 49..53 (a polished_deepslate X and rim, a chiseled
  // stone wheel in the middle, iron between), in a gold ring; the barred viewing port beside it (z 304..305, y 51..52)
  for (let dz = 0; dz < 5; dz++) for (let dy = 0; dy < 5; dy++) {
    const z = 298 + dz, y = 49 + dy, rim = dz === 0 || dz === 4 || dy === 0 || dy === 4, diag = dz === dy || dz === 4 - dy
    S(614, y, z, dz === 2 && dy === 2 ? 'chiseled_stone_bricks' : diag ? 'polished_deepslate' : rim ? 'polished_blackstone' : 'iron_block')
  }
  for (let z = 297; z <= 303; z++) { S(614, 54, z, 'gold_block'); if (z === 297 || z === 303) F(614, 49, z, 614, 53, z, 'gold_block') }
  F(614, 51, 304, 614, 52, 305, 'iron_bars')

  // B1 (floor 56, feet 57): the laser bay x 599..606, z 291..312, the counting room x 608..614, z 300..308
  for (let y = 56; y <= 63; y++) for (let x = 598; x <= 607; x++) for (let z = 290; z <= 313; z++) {
    if (x > 598 && x < 607 && z > 290 && z < 313) continue
    S(x, y, z, (x === 598 || x === 607 ? z : x) % 3 === 0 ? 'iron_block' : 'polished_blackstone')
  }
  F(599, 57, 291, 606, 63, 312, 'air')
  F(599, 56, 291, 606, 56, 312, 'red_nether_bricks')
  for (const z of [295, 301, 307]) { S(598, 61, z, 'sea_lantern'); S(607, 61, z, 'sea_lantern') }
  // the counting room: plain walls, dark floor, a light strip; its doorway x 607, z 304..305 with the plates T13-T15
  F(608, 56, 299, 615, 63, 309, 'polished_andesite')
  F(608, 57, 300, 614, 63, 308, 'air')
  F(608, 56, 300, 614, 56, 308, 'dark_oak_planks')
  for (const z of [302, 306]) S(615, 61, z, 'sea_lantern')
  F(607, 57, 304, 607, 59, 305, 'air'); S(607, 56, 304, 'red_nether_bricks'); S(607, 56, 305, 'red_nether_bricks')
  S(607, 57, 304, 'stone_pressure_plate[powered=false]'); S(607, 57, 305, 'stone_pressure_plate[powered=false]')
  S(608, 57, 305, 'stone_pressure_plate[powered=false]')
  F(610, 57, 303, 612, 57, 304, 'stripped_dark_oak_wood[axis=x]')   // P4 the cash tables
  F(614, 57, 301, 614, 59, 307, 'smooth_stone')                     // the money counters' bench along the east wall
  F(614, 58, 301, 614, 58, 307, 'gray_concrete')
  F(608, 57, 301, 608, 58, 302, 'iron_block')                       // a cash-sorting cabinet in the NW corner

  // the stair from the bay's north end down to B2: north along x 603..604 (feet 56 at z 290 .. 50 at z 284) onto the
  // landing (feet 49, z 282..283), then the corridor x 606..607 back south (a wall x 605 between)
  for (const x of [603, 604]) for (let z = 290; z >= 284; z--) { const feet = 56 - (290 - z); step(x, z, feet, 'south', feet + 3) }
  F(603, 48, 282, 607, 48, 283, 'polished_blackstone_bricks'); F(606, 48, 284, 607, 48, 293, 'polished_blackstone_bricks')

  // the tunnel to the manhole (outside the region): floor y 48, feet 49..52, froglights every 6; the shaft x 575, z 300
  F(TUNNEL.x1, 49, TUNNEL.z1, TUNNEL.x2, 52, TUNNEL.z2, 'air')
  F(TUNNEL.x1, 48, TUNNEL.z1, TUNNEL.x2, 48, TUNNEL.z2, M(MIX.stonebrick))
  for (let x = 579; x <= 594; x += 6) S(x, 53, 300, 'ochre_froglight[axis=y]')
  for (let y = 49; y <= 64; y++) S(HOLE.x, y, HOLE.z, 'ladder[facing=east,waterlogged=false]')
  S(HOLE.x, 48, HOLE.z, 'stone_bricks')
}

// the stairs' one step: the stair block under the feet, air from the feet up to top
const step = (x, z, feet, facing, top) => { S(x, feet - 1, z, stairs('polished_blackstone', facing)); F(x, feet, z, x, top, z, 'air') }

// ---- the lobby (floor 64, inside 65..76) and the mezzanine (slab 70 over the west third) ---------------------------------
function lobby () {
  rect(BLD.x1, BLD.z1, BLD.x2, BLD.z2, (x, z) => S(x, LOBBY_Y, z, edge(x, z) ? 'polished_deepslate' : (Math.floor(x / 2) + Math.floor(z / 2)) % 2 ? 'prismarine_bricks' : 'dark_prismarine'))
  for (let z = DOOR.z1; z <= DOOR.z2; z++) S(BLD.x2, LOBBY_Y, z, 'polished_andesite') // the threshold
  // the walls y 65..76
  for (let y = 65; y <= 76; y++) {
    for (let z = BLD.z1; z <= BLD.z2; z++) {
      // west: a blank wall onto Hatch Plaza
      S(BLD.x1, y, z, pier(BLD.x1, z) ? 'polished_deepslate' : M(MIX.navy))
      // east: the glass front (L1 z 283..296, L2 z 303..315: all glass, y 65..76), the quartz-framed doorway
      const x = BLD.x2
      if (inPylon(x, z)) continue
      if (z === BLD.z1) S(x, y, z, 'polished_deepslate')
      else if (z >= DOOR.z1 && z <= DOOR.z2) S(x, y, z, y <= DOOR.y2 ? 'air' : y === DOOR.y2 + 1 ? 'quartz_block' : 'green_stained_glass')
      else if (z === DOOR.z1 - 1 || z === DOOR.z2 + 1) S(x, y, z, y <= DOOR.y2 + 1 ? 'quartz_pillar[axis=y]' : 'green_stained_glass')
      else S(x, y, z, 'green_stained_glass')
    }
    for (let x = BLD.x1 + 1; x < BLD.x2; x++) for (const z of [BLD.z1, BLD.z2]) {
      if (inPylon(x, z)) continue
      // north and south: solid navy over the mezzanine third, double-height glass x 608..627 (L3 / L4: y 65..75)
      if (x <= 607) S(x, y, z, x === 607 || x === 603 ? 'polished_deepslate' : y >= 73 && y <= 75 && x !== 601 && x !== 602 && !(z === BLD.z1 && x >= 598 && x <= 606) ? 'green_stained_glass' : M(MIX.navy))
      else S(x, y, z, y === 76 ? 'blue_terracotta' : 'green_stained_glass')
    }
  }
  // the ceiling (floor 2's slab, y 77): quartz with a grid of sea lanterns
  rect(BLD.x1 + 1, BLD.z1 + 1, BLD.x2 - 1, BLD.z2 - 1, (x, z) => { if (!inPylon(x, z)) S(x, 77, z, x % 5 === 2 && z % 5 === 2 ? 'sea_lantern' : 'smooth_quartz') })

  // the mezzanine slab (full blocks: P5 lies on it) over x 598..607, its glass rail on x 607 (L5 z 292..315, y 71..74)
  rect(598, 283, 607, 318, (x, z) => S(x, MEZZ_Y, z, (x % 4 === 1 && z % 5 === 3 && z > 290) ? 'sea_lantern' : 'dark_prismarine'))
  for (let z = 283; z <= 318; z++) if (z !== 289 && z !== 290) F(607, 71, z, 607, 74, z, 'green_stained_glass')
  for (const z of [294, 309]) F(607, 65, z, 607, 69, z, 'quartz_pillar[axis=y]') // the mezzanine's edge posts
  // the mezzanine stair: west along z 289..290 from feet 65 (x 613) to feet 70 (x 608), onto the mezzanine at x 607
  for (const z of [289, 290]) for (let x = 612; x >= 608; x--) {
    const top = 65 + (612 - x)
    if (top > 65) F(x, 65, z, x, top - 1, z, 'light_gray_concrete')
    S(x, top, z, stairs('dark_prismarine', 'west'))
  }
  for (let x = 608; x <= 612; x++) {                              // its sides: stringers to the step, a glass rail on the open one
    const top = 65 + (612 - x)
    F(x, 65, 288, x, top, 288, 'light_gray_concrete'); F(x, 65, 291, x, top, 291, 'light_gray_concrete')
    S(x, top + 1, 291, 'light_gray_stained_glass_pane')
  }

  // the tellers (west side): a pen x 598..602, z 297..302 behind the counter x 603: the blue-glass screen G1 (z 297..302,
  // y 66..67) over the counter, a quartz header to the mezzanine; the tills P1-P3 at x 600 (z 298, 300, 302) on a back counter
  F(598, 65, 296, 603, 69, 296, 'light_gray_concrete'); F(598, 65, 303, 603, 69, 303, 'light_gray_concrete')
  F(603, 65, 297, 603, 65, 302, 'polished_deepslate')
  F(603, 66, 297, 603, 67, 302, 'blue_stained_glass')             // G1
  F(603, 68, 297, 603, 69, 302, 'smooth_quartz')
  F(600, 65, 297, 600, 65, 302, 'smooth_stone')                   // the back counter; the tills are its z 298, 300, 302
  for (const z of [298, 300, 302]) S(600, 65, z, 'polished_andesite')

  // the security gate G3 (x 599..601, z 316, y 65..67) at the back of a 3-deep alcove (z 313..315), the stairwell
  // behind it (x 598..606, z 317..318) inside a closed block x 598..607, z 312..318 under the mezzanine
  F(598, 65, 312, 607, 69, 318, 'light_gray_concrete')
  F(599, 65, 312, 601, 67, 315, 'air')                            // the alcove (its mouth on z 312)
  F(599, 65, 316, 601, 67, 316, 'iron_block')                     // G3
  S(602, 66, 315, 'polished_blackstone'); S(601, 66, 315, 'polished_blackstone_button[face=wall,facing=west,powered=false]') // the keypad prop
  F(598, 68, 312, 602, 68, 312, 'polished_deepslate')             // a dark lintel over the alcove mouth
  F(599, 65, 317, 601, 69, 318, 'air')                            // the landing behind the gate (feet 65)

  // the manager's office on the mezzanine: x 598..605, z 285..287 inside, the doorway x 603..604 in z 288; the wall safe
  // G2 (x 601..602, z 284, y 71..72) in the back wall, the Bonds P5 behind it on the slab (z 283)
  F(598, 71, 283, 606, 76, 283, 'light_gray_concrete')
  F(598, 71, 284, 605, 76, 284, 'dark_oak_planks')
  F(601, 71, 283, 602, 72, 283, 'air')                            // P5's niche
  F(601, 71, 284, 602, 72, 284, 'iron_block')                     // G2
  F(600, 71, 284, 600, 73, 284, 'polished_blackstone'); F(603, 71, 284, 603, 73, 284, 'polished_blackstone'); F(601, 73, 284, 602, 73, 284, 'polished_blackstone')
  F(606, 71, 284, 606, 76, 288, 'light_gray_concrete'); F(598, 71, 288, 605, 76, 288, 'light_gray_concrete')
  F(603, 71, 288, 604, 73, 288, 'air')                            // the office doorway
  F(598, 71, 286, 600, 71, 286, 'dark_oak_slab[type=top,waterlogged=false]')     // the manager's desk
  S(599, 71, 287, stairs('dark_oak', 'south'))
  // the loan desks along the mezzanine
  for (const z of [294, 300, 306]) { F(600, 71, z, 601, 71, z, 'dark_oak_slab[type=top,waterlogged=false]'); S(600, 71, z + 1, stairs('dark_oak', 'south')); S(601, 71, z - 1, stairs('dark_oak', 'north')) }

  // the open floor: quartz columns, the info desk, benches by the glass, planters; the doorway path (z 298..301) stays clear
  for (const x of [616, 622]) for (const z of [288, 294, 306, 312]) F(x, 65, z, x, 76, z, 'quartz_pillar[axis=y]')
  F(617, 65, 291, 619, 65, 292, 'smooth_quartz'); F(617, 66, 291, 619, 66, 292, 'smooth_quartz_slab[type=bottom,waterlogged=false]')
  for (let x = 610; x <= 626; x++) if (x % 6 !== 3) S(x, 65, 283, stairs('dark_oak', 'north'))
  for (let x = 610; x <= 622; x++) if (x % 6 !== 3) S(x, 65, 318, stairs('dark_oak', 'south'))
  for (const [x, z] of [[627, 284], [627, 296], [627, 303], [624, 315], [609, 283], [609, 318]]) { S(x, 65, z, 'moss_block'); S(x, 66, z, 'azalea_leaves[persistent=true,distance=7,waterlogged=false]') }
  // camera housings: a dark block over each lens (the lens stays in air) hung on chains from the ceiling
  for (const [x, y, z] of [[608, 72, 306], [612, 73, 288], [611, 71, 293]]) { S(x, y + 1, z, 'polished_blackstone'); F(x, y + 2, z, x, 76, z, 'iron_chain[axis=y,waterlogged=false]') }
}

// ---- the stair behind G3 (after the lobby: it cuts the lobby floor and the stairwell's block) ------------------------------
function gateStair () {
  // the stair from the lobby (G3) down to the bay: east along z 317..318 (feet 64, 63, 62), a landing at feet 61
  // (x 605..606), then north along x 605..606 (feet 60, 59, 58) onto the bay floor at z 313
  for (const z of [317, 318]) {
    step(602, z, 64, 'west', 69); step(603, z, 63, 'west', 69); step(604, z, 62, 'west', 64)
    S(605, 60, z, 'polished_blackstone'); S(606, 60, z, 'polished_blackstone'); F(605, 61, z, 606, 63, z, 'air')
  }
  for (const x of [605, 606]) {
    step(x, 316, 60, 'south', 63); step(x, 315, 59, 'south', 63); step(x, 314, 58, 'south', 63)
    S(x, 56, 313, 'red_nether_bricks'); F(x, 57, 313, x, 60, 313, 'air')
  }
}

// ---- the tower: floors 2-5 sealed behind green glass in a navy frame, the roof and its helipad, the brick pylon -----------
function tower () {
  for (const fy of FLOORS) if (fy !== 77) rect(BLD.x1 + 1, BLD.z1 + 1, BLD.x2 - 1, BLD.z2 - 1, (x, z) => { if (!inPylon(x, z)) S(x, fy, z, x % 6 === 0 && z % 6 === 3 ? 'sea_lantern' : 'polished_andesite') })
  for (let y = 77; y <= ROOF_Y; y++) rect(BLD.x1, BLD.z1, BLD.x2, BLD.z2, (x, z) => {
    if (!edge(x, z) || inPylon(x, z)) return
    let s
    if (y === 77) s = 'sea_lantern'                                       // the neon line's lanterns (glass in front)
    else if (FLOORS.includes(y) || y === ROOF_Y) s = M(MIX.navy)
    else if (pier(x, z)) s = 'polished_deepslate'
    else s = y >= 90 && y <= 94 ? 'blue_stained_glass' : 'green_stained_glass' // one band of blue windows (floor 4)
    S(x, y, z, s)
  })
  // the neon line round the base of the tower: light blue glass one block out, in front of the y 77 lanterns
  for (let z = BLD.z1 - 1; z <= BLD.z2 + 1; z++) { S(BLD.x1 - 1, 77, z, 'light_blue_stained_glass'); if (z < PYLON.z1) S(BLD.x2 + 1, 77, z, 'light_blue_stained_glass') }
  for (let x = BLD.x1; x <= BLD.x2; x++) { S(x, 77, BLD.z1 - 1, 'light_blue_stained_glass'); if (x < PYLON.x1) S(x, 77, BLD.z2 + 1, 'light_blue_stained_glass') }
  // the roof (y 98): smooth quartz, a calcite helipad with a yellow ring and H (unreachable), a parapet, plant boxes
  rect(BLD.x1 + 1, BLD.z1 + 1, BLD.x2 - 1, BLD.z2 - 1, (x, z) => {
    if (inPylon(x, z)) return
    const d = Math.hypot(x + 0.5 - 612.5, z + 0.5 - 300.5)
    const H = (x >= 609 && x <= 610 && z >= 297 && z <= 304) || (x >= 615 && x <= 616 && z >= 297 && z <= 304) || (x >= 611 && x <= 614 && z >= 300 && z <= 301)
    S(x, ROOF_Y, z, d < 9 ? (H || (d >= 7.6 && d < 8.6) ? 'yellow_terracotta' : 'calcite') : 'smooth_quartz')
  })
  rect(BLD.x1, BLD.z1, BLD.x2, BLD.z2, (x, z) => { if (edge(x, z) && !inPylon(x, z)) S(x, ROOF_Y + 1, z, 'polished_deepslate') })
  for (const [x, z] of [[602, 287], [602, 313]]) F(x, 99, z, x + 2, 100, z + 2, 'smooth_stone') // the roof's plant boxes
  for (const [x, z] of [[603, 291], [622, 291], [603, 310], [622, 310]]) S(x, 99, z, 'sea_lantern')
  // the pylon: brick from the lobby floor to y 102
  F(PYLON.x1, LOBBY_Y, PYLON.z1, PYLON.x2, PYLON.top, PYLON.z2, M(MIX.brick))
  rect(PYLON.x1, PYLON.z1, PYLON.x2, PYLON.z2, (x, z) => S(x, PYLON.top, z, 'polished_deepslate'))
}

// ---- outside: the front plaza, Hatch Plaza and the manhole --------------------------------------------------------------
function outside () {
  // the front plaza x 629..639 (polished andesite, a calcite band under the door's line), ATMs, planters, lamps, bollards
  rect(FRONT[0], FRONT[1], FRONT[2], FRONT[3], (x, z) => S(x, LOBBY_Y, z, z >= 297 && z <= 302 && x <= 634 ? 'calcite' : M(MIX.plaza)))
  for (const z of [289, 312]) F(629, 65, z, 629, 67, z, 'barrier')                 // the ATMs (DISPLAYS)
  for (const [x1, z1] of [[631, 283], [631, 315]]) {                              // two planters with shrubs
    rect(x1, z1, x1 + 3, z1 + 3, (x, z) => S(x, 65, z, x === x1 || x === x1 + 3 || z === z1 || z === z1 + 3 ? 'smooth_stone_slab[type=bottom,waterlogged=false]' : 'moss_block'))
    shrub(S, x1 + 1, z1 + 1, 65); shrub(S, x1 + 2, z1 + 2, 65)
  }
  streetLamp(S, 635, 290, 0, 1); streetLamp(S, 635, 311, 0, -1)
  for (let z = 282; z <= 319; z += 3) if (z < 295 || z > 305) S(638, 65, z, 'andesite_wall')

  // Hatch Plaza x 560..590, z 285..315: polished andesite with a smooth stone border, benches, lamps, shrubs
  rect(HATCH[0], HATCH[1], HATCH[2], HATCH[3], (x, z) => S(x, LOBBY_Y, z, x === HATCH[0] || x === HATCH[2] || z === HATCH[1] || z === HATCH[3] ? 'smooth_stone' : M(MIX.plaza)))
  for (const [x, z] of [[566, 290], [584, 290], [566, 310], [584, 310]]) streetLamp(S, x, z, 0, z < 300 ? 1 : -1)
  for (const z of [287, 313]) for (let x = 570; x <= 580; x++) if (x !== 575) S(x, 65, z, stairs('dark_oak', z < 300 ? 'north' : 'south'))
  for (const [x, z] of [[562, 287], [588, 287], [562, 313], [588, 313]]) { S(x, 65, z, 'moss_block'); shrub(S, x, z, 65) }
  // the manhole: a 1 x 1 open shaft (top y 64), an iron-bar ring at y 65 with a 1-wide gap on the ladder (west) side,
  // andesite_wall bollards at the ring's corners
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    if (!dx && !dz) continue
    if (dx === -1 && dz === 0) continue // the gap
    S(HOLE.x + dx, 65, HOLE.z + dz, dx && dz ? 'andesite_wall' : 'iron_bars')
  }
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  underground(); lobby(); gateStair(); tower(); outside()
  for (let y = 49; y <= 64; y++) S(HOLE.x, y, HOLE.z, 'ladder[facing=east,waterlogged=false]') // the shaft, through the plaza
  B = null
  return b
}
module.exports.build = () => module.exports()

// ---- labels, displays, points, setup (PLAN 7.1, 7.3) ---------------------------------------------------------------------
// "B A N K" stacked on the pylon's east (Bank Street) and south faces, white, 0.03 off the brick
const LETTERS = [['B', 95.5], ['A', 91.0], ['N', 86.5], ['K', 82.0]]
module.exports.labels = [
  ...LETTERS.map(([t, y]) => ({ x: 629.03, y, z: 318.0, facing: 'east', text: t, color: '#ffffff', scale: 7 })),
  ...LETTERS.map(([t, y]) => ({ x: 627.0, y, z: 320.03, facing: 'south', text: t, color: '#ffffff', scale: 7 }))
]
const furn = (x, y, z, m, yaw) => ({ x, y, z, item: 'iron_ingot', cmd: `donating:furn_${m}`, yaw, pitch: 0, scale: 1 })
module.exports.displays = [furn(629.5, 66.5, 289.5, 'atm', -90), furn(629.5, 66.5, 312.5, 'atm', -90)] // facing Bank Street
module.exports.points = {
  BANK_EXIT: [636.5, 65, 300.5, -90],
  BANK_HOLO: [633.5, 71, 300.5, -90],       // /dheist holo bank 633.5 71 300.5
  BANK_CHASE: [612.5, 74.5, 300.5, 0],      // the chase centre
  BANK_DOOR: [627.5, 65, 299.5, 90],        // inside the doorway
  BANK_COP_1: [660.5, 65, 296.5, 90],
  BANK_COP_2: [660.5, 65, 305.5, 90],
  BANK_BIKE_1: [565.5, 65, 297.5, 90],
  BANK_BIKE_2: [565.5, 65, 303.5, 90],
  BANK_MANHOLE: [575.5, 65, 300.5, 0]
}
// section 7.1's lines for heist_bank and section 7.3's, verbatim and in order (`city.js setup` strips the # notes and
// puts the world in for W / jailbreak)
const REGION_LINES = [
  '(G) //pos1 595,47,280',
  '(G) //pos2 630,102,321',
  '(G) /rg define heist_bank',
  '(C) rg flag -w W heist_bank passthrough allow'
]
const HEIST_LINES = `(G) /dheist create bank 3
(G) /dheist set bank name Bank
(G) /dheist set bank advanced true
(G) /dheist set bank pool 80000
(G) /dheist exit bank 636.5 65 300.5 -90
# gates (G1..G7)
(G) /dloot add bank smash 603 66 297 603 67 302                         # G1 teller screen
(G) /dloot add bank safe 601 71 284 602 72 284                          # G2 manager's wall safe
(G) /dloot add bank safe 599 65 316 601 67 316                          # G3 security gate
(G) /dloot add bank drill 614 49 298 614 53 302 time=75 jams=2 claim=10 # G4 vault door (alarm)
(G) /dloot add bank drill 623 50 307 623 51 307 time=30 jams=1 alarm=true   # G5 Box 167
(G) /dloot add bank safe 623 49 303 625 51 303                          # G6 Reserve cage (test 2.9c)
(G) /dloot add bank safe 595 49 299 595 51 300                          # G7 alternate exit (region face)
# piles (P1..P12)
(G) /dloot add bank pile 600 65 298 600 65 298 value=1000-2000 style=register piece=250 take=2.0 behind=1 name=Till
(G) /dloot add bank pile 600 65 300 600 65 300 value=1000-2000 style=register piece=250 take=2.0 behind=1 name=Till
(G) /dloot add bank pile 600 65 302 600 65 302 value=1000-2000 style=register piece=250 take=2.0 behind=1 name=Till
#   fallback if test 2.9b fails: style=cash on 2 cells each
(G) /dloot add bank pile 610 57 303 612 57 304 value=3000-6000 style=cash piece=500 take=4.0 behind=3 name=Counting_room
(G) /dloot add bank pile 601 70 283 602 70 283 value=4000-8000 style=cash piece=1000 take=4.0 behind=2 name=Bonds
(G) /dloot add bank pile 617 49 294 618 49 296 value=8000-12000 style=gold piece=1000 take=3.0 behind=4 name=Gold_pallet
(G) /dloot add bank pile 617 49 303 618 49 305 value=8000-12000 style=gold piece=1000 take=3.0 behind=4 name=Gold_pallet
(G) /dloot add bank pile 620 49 294 621 49 296 value=8000-12000 style=cash piece=500 take=4.0 behind=4 name=Cash_trolley
(G) /dloot add bank pile 626 50 295 626 50 302 value=3000-6000 style=jewel behind=4 name=Deposit_jewels
(G) /dloot add bank pile 619 50 293 624 50 293 value=4000-8000 style=goods piece=500 take=2.5 per-cell=4 behind=4 name=Valuables
(G) /dloot add bank pile 623 49 308 623 49 308 value=5000-7500 style=goods piece=2500 take=5.0 per-cell=4 behind=5 name=Box_167
(G) /dloot add bank pile 623 49 305 625 49 306 value=12000-24000 style=gold piece=2000 take=4.5 behind=6 name=Reserve
(G) /dloot check bank
# traps (T1..T19)
(G) /dtrap add bank camera 608.5 72.0 306.5 50 36 effect=alarm angle=30 range=12 sweep=60 period=8   # T1 gate floor
(G) /dtrap add bank camera 612.5 73.5 288.5 70 15 effect=alarm angle=20 range=9                       # T2 mezzanine stair top
(G) /dtrap add bank laser 599.0 57.4 310.5 607.0 57.4 310.5 damage=2    # T3 bay low
(G) /dtrap add bank laser 599.0 57.4 307.5 607.0 57.4 307.5 damage=2    # T4
(G) /dtrap add bank laser 599.0 57.4 300.5 607.0 57.4 300.5 damage=2    # T5
(G) /dtrap add bank laser 599.0 57.4 297.5 607.0 57.4 297.5 damage=2    # T6
(G) /dtrap add bank laser 599.0 58.65 305.5 607.0 58.65 305.5 damage=2  # T7 duck
(G) /dtrap add bank laser 599.0 58.65 298.5 607.0 58.65 298.5 damage=2  # T8
(G) /dtrap add bank laser 599.0 57.4 302.5 607.0 57.4 302.5 damage=2 blink=true on=2 off=2 offset=0     # T9 timed wall (low)
(G) /dtrap add bank laser 599.0 58.65 302.5 607.0 58.65 302.5 damage=2 blink=true on=2 off=2 offset=2   # T10 (duck, in turn with T9)
(G) /dtrap add bank laser 599.0 58.0 295.5 607.0 58.0 295.5 effect=alarm   # T11 alarm laser
(G) /dtrap add bank laser 599.0 58.0 293.5 607.0 58.0 293.5 effect=alarm   # T12
(G) /dtrap add bank plate 607 57 304 damage=2   # T13 counting-room door
(G) /dtrap add bank plate 607 57 305 damage=2   # T14
(G) /dtrap add bank plate 608 57 305 damage=2   # T15
(G) /dtrap add bank laser 598.5 49.4 297.0 598.5 49.4 304.0 damage=2    # T16 vestibule low
(G) /dtrap add bank laser 600.5 49.4 297.0 600.5 49.4 304.0 damage=2    # T17
(G) /dtrap add bank laser 599.5 50.65 297.0 599.5 50.65 304.0 damage=2  # T18 duck
(G) /dtrap add bank camera 611.5 71.0 293.5 53 24 effect=alarm range=12   # T19 teller camera (sneak passes)
# lockdown (iron bars), cops, hologram, open
(G) /dheist lock bank add 628 65 283 628 76 296 iron_bars    # L1 front glass north of the door
(G) /dheist lock bank add 628 65 303 628 76 315 iron_bars    # L2 front glass south (stops short of the pylon x 625..628, z 316..319)
(G) /dheist lock bank add 608 65 282 627 75 282 iron_bars    # L3 north side glass
(G) /dheist lock bank add 608 65 319 624 75 319 iron_bars    # L4 south side glass (stops short of the pylon)
(G) /dheist lock bank add 607 71 292 607 74 315 iron_bars    # L5 mezzanine inner glass (the stair arrives at z 289..290, outside it)
(G) /dcops bank add 660.5 65 296.5   # Bank Street, level with the door
(G) /dcops bank add 660.5 65 305.5
(G) /dheist snapshot bank
(G) /dheist holo bank 633.5 71 300.5
(G) /dheist enable bank`.split('\n')
const BIKE_LINES = ['(C) dbike spotat jailbreak 565.5 65 297.5 90', '(C) dbike spotat jailbreak 565.5 65 303.5 90']
module.exports.setup = {
  regions: [{ id: 'heist_bank', box: REGION.bank, flags: ['passthrough allow'], lines: REGION_LINES,
    note: 'the tower, B1 and B2 (y 47..102); the tunnel and the shaft stay outside (x < 595)' }],
  heists: [{
    id: 'bank', difficulty: 3, level: 20, advanced: true, name: 'Bank', pool: 80000, escape: '8:00', cooldown: '15:00',
    exit: [636.5, 65, 300.5, -90], holo: [633.5, 71, 300.5], chase: [612.5, 74.5, 300.5],
    snapshot: 'with the room clean: G1-G7 closed, the three plates up, no bars in L1-L5',
    proposal: 'core.sk difficulty::3::alarm::warning 25, ::max-cops 5, ::pool 5, ::heavy-from 4 (the owner\'s call)',
    lines: HEIST_LINES
  }],
  keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], pois: [], walls: [], holos: [],
  bikes: BIKE_LINES
}

// ---- self-report: node tools/build/city/bank.js -> blocks vs the budget (PLAN 9.1) and the bounds -----------------------
if (require.main === module) {
  const b = module.exports(), bb = b.bounds()
  let solid = 0; for (const s of b.blocks.values()) if (s !== 'air') solid++
  console.log(`bank: ${b.blocks.size} blocks (${solid} not air), budget 90000; box ${bb.x1},${bb.y1},${bb.z1} to ${bb.x2},${bb.y2},${bb.z2}`)
}
