'use strict'
// casino: the Casino module (tools/build/city/PLAN.md section 6, its setup lines 7.1 and 7.4): the podium with its
// terraces, trench stairs and plaza, the public casino (gaming floor with its launch-fallback block props), and the heist
// under it (B1 security and cash, B2 the vault level), the security tunnel and the drain to the storm channel.
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

const MOD = 'casino'
const own = ownFor(MOD)
let B = null
let clipped = 0 // writes refused by own() (should stay 0: everything here is planned inside BOX.casino)
// The module's setter, clipped to its columns (a state may be a function of x, y, z for the hashed mixes).
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s); else clipped++ }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s) }
const AIR = 'air'
const M = mix => (x, y, z) => pick(x, y, z, mix)
const stair = (m, f) => `${m}_stairs[facing=${f},half=bottom,shape=straight,waterlogged=false]`
const slabTop = m => `${m}_slab[type=top,waterlogged=false]`
const bars = (e, n, s, w) => `iron_bars[east=${e},north=${n},south=${s},waterlogged=false,west=${w}]`
const BARS_X = bars(true, false, false, true), BARS_Z = bars(false, true, true, false) // a run along x / along z
const OBS = f => `observer[facing=${f},powered=false]` // camera housings, keypads, card readers, the PC (props)
const PLATE = 'polished_blackstone_pressure_plate[powered=false]'
const FROG = 'ochre_froglight[axis=y]', PFROG = 'pearlescent_froglight[axis=y]'

// ---- the plan's numbers (PLAN 6.2) -----------------------------------------------------------------------------------
const POD = { x1: 820, x2: 920, z1: 300, z2: 400, top: 72 }          // the podium (the old mesa): top block y 72
const RG = REGION.casino                                              // 841 55 330 .. 898 71 371: B1 and B2 only
const HALL = { x1: 843, x2: 896, z1: 331, z2: 371, floor: 72, roof: 84 } // the public casino (walls y 73..83)
const TOWER = { x1: 862, x2: 877, z1: 365, z2: 371, top: 97 }         // the marquee tower over the roof
const PLAZA = { x1: 841, x2: 898, z1: 372, z2: 400 }
const FOUNTAIN = { x1: 846, x2: 855, z1: 382, z2: 391 }
const ENTRANCE = { x1: 866, x2: 873, z: 371, y1: 73, y2: 77 }        // 8 x 5, open
const STAFF_DOORWAY = { x: 849, z1: 348, z2: 349, y1: 73, y2: 75 }   // off the floor into the staff corridor
const RAMP_GAP = [887, 894]                                           // the ramp road meets the plaza (no parapet)
// the terrace stairs down the podium walls: a trench x a..a+2 from the terrace at z 371 (feet 73) south down 8 steps
// (z 372..379) to a landing z 380..382 at ground level, out through the retaining wall
const TRENCHES = [{ x1: 822, x2: 824, wallIn: 825, wallOut: 821, face: 820 }, { x1: 916, x2: 918, wallIn: 915, wallOut: 919, face: 920 }]
const TR = { top: 371, steps: [372, 379], landing: [380, 382], end: 383 }
const TUN = { x1: 899, x2: 920, z1: 352, z2: 355 }                    // the security tunnel (outside the region)
const tunnelFeet = x => Math.max(57, Math.min(65, 57 + Math.floor((x - 901) / 2)))
const DRAIN = { x1: 868, x2: 870, z1: 296, z2: 329 }                  // the drain (outside the region), floor drainFloor(z)
// the rooms: interior boxes (x1..x2, z1..z2, y1..y2 = the air; walls one block round, floor y1 - 1, ceiling y2 + 1)
const B1 = { floor: 64, y1: 65, y2: 70, ceil: 71 }, B2 = { floor: 56, y1: 57, y2: 62, ceil: 63 }
const ROOMS = {
  // B1, security and cash (feet 65)
  landing: { x1: 843, x2: 847, z1: 332, z2: 337, ...B1, wall: 'polished_andesite', fl: 'polished_andesite', ce: 'smooth_stone' },
  staffStair: { x1: 844, x2: 846, z1: 338, z2: 344, ...B1, wall: 'polished_andesite', fl: 'polished_andesite', ce: 'smooth_stone' },
  corridor: { x1: 849, x2: 896, z1: 333, z2: 336, ...B1, wall: 'light_gray_concrete', fl: 'polished_andesite', ce: 'smooth_stone' },
  alcove: { x1: 866, x2: 871, z1: 331, z2: 332, ...B1, wall: 'stone_bricks', fl: 'polished_andesite', ce: 'smooth_stone' },
  security: { x1: 849, x2: 861, z1: 338, z2: 349, ...B1, wall: 'gray_concrete', fl: 'polished_deepslate', ce: 'smooth_stone' },
  counting: { x1: 863, x2: 879, z1: 338, z2: 349, ...B1, wall: 'white_concrete', fl: 'smooth_stone', ce: 'smooth_stone' },
  office: { x1: 881, x2: 891, z1: 338, z2: 349, ...B1, wall: 'smooth_quartz', fl: 'dark_oak_planks', ce: 'smooth_stone' },
  backStair: { x1: 893, x2: 896, z1: 338, z2: 349, floor: 56, y1: 57, y2: 70, ceil: 71, wall: 'polished_andesite', fl: 'polished_blackstone_bricks', ce: 'smooth_stone' },
  // B2, the vault level (feet 57)
  passage: { x1: 891, x2: 892, z1: 346, z2: 349, ...B2, wall: 'polished_deepslate', fl: 'polished_blackstone_bricks', ce: 'polished_deepslate' },
  bay: { x1: 885, x2: 890, z1: 346, z2: 358, ...B2, wall: 'deepslate_tiles', fl: 'polished_blackstone_bricks', ce: 'polished_deepslate' },
  tunnelIn: { x1: 891, x2: 898, z1: 352, z2: 355, ...B2, y2: 60, ceil: 61, wall: 'polished_andesite', fl: 'polished_andesite', ce: 'polished_andesite' },
  mantrap: { x1: 877, x2: 883, z1: 353, z2: 355, ...B2, y2: 60, ceil: 61, wall: 'polished_blackstone', fl: 'polished_blackstone', ce: 'polished_blackstone' },
  ante: { x1: 862, x2: 876, z1: 349, z2: 359, ...B2, wall: 'polished_deepslate', fl: 'polished_blackstone_bricks', ce: 'polished_deepslate' },
  deposit: { x1: 864, x2: 874, z1: 340, z2: 347, ...B2, wall: 'polished_blackstone_bricks', fl: 'dark_oak_planks', ce: 'polished_deepslate' },
  daily: { x1: 866, x2: 872, z1: 361, z2: 366, ...B2, y2: 60, ceil: 61, wall: 'polished_deepslate', fl: 'polished_blackstone_bricks', ce: 'polished_deepslate' },
  vault: { x1: 846, x2: 860, z1: 344, z2: 368, ...B2, wall: 'quartz_bricks', fl: 'smooth_quartz', ce: 'quartz_block' }
}
// openings between rooms whose walls would otherwise close them [x1, y1, z1, x2, y2, z2]
const OPENINGS = [
  [854, 65, 337, 855, 67, 337], // corridor -> security room
  [870, 65, 337, 871, 67, 337], // corridor -> counting room
  [884, 65, 337, 885, 67, 337], // corridor -> manager's office
  [893, 65, 337, 896, 70, 337], // corridor -> the back stair
  [884, 57, 353, 884, 60, 355]  // loading bay -> mantrap
]
// the robbery's blocks (PLAN 7.4): gates, then the piles' cells
const GATES = {
  G1: [848, 65, 334, 848, 67, 335], G2: [867, 65, 343, 875, 66, 343], G3: [889, 66, 350, 890, 67, 350],
  G4: [868, 57, 348, 870, 59, 348], G5: [861, 57, 352, 861, 61, 356], G6: [868, 57, 360, 870, 59, 360], G7: [868, 65, 330, 869, 66, 330]
}
const CAMS = { T1: [850, 70, 334, 'down'], T2: [895, 70, 334, 'down'], T10: [871, 70, 338, 'down'], T15: [885, 62, 357, 'down'], T22: [853, 63, 354, 'down'] } // housings over the lenses
const HOLE = [844, 341, 846, 344] // the staff stair hole through y 71 and y 72

// ---- the podium, its terraces and stairs ------------------------------------------------------------------------------
const onPerimeter = (x, z) => x === POD.x1 || x === POD.x2 || z === POD.z1 || z === POD.z2
const inR = (x, z, r) => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2
// the terrace paths: a ring round the casino and the walks to the two stair heads (z 368..371)
const terracePath = (x, z) => (x >= 838 && x <= 901 && z >= 326 && z <= 371 && !inR(x, z, HALL)) || (z >= 368 && z <= 371)
const plazaTop = (x, z) => (x - PLAZA.x1) % 8 === 0 || (z - PLAZA.z1) % 7 === 0 ? 'calcite' : pick(x, 72, z, MIX.plaza)
const hallFloor = (x, z) => {
  if (x === HALL.x1 || x === HALL.x2 || z === HALL.z1 || z === HALL.z2) return 'smooth_quartz'
  if (x <= 848) return 'polished_andesite' // the staff corridor
  const a = (x + z) % 8 === 0, b = (x - z + 800) % 8 === 0
  return a && b ? 'yellow_wool' : a || b ? 'black_wool' : 'red_wool'
}
function podium () {
  for (let x = POD.x1; x <= POD.x2; x++) for (let z = POD.z1; z <= POD.z2; z++) {
    if (onPerimeter(x, z)) { // the retaining wall: stone bricks below, polished andesite above, capped at the top
      for (let y = 65; y <= 71; y++) S(x, y, z, y <= 68 ? M(MIX.stonebrick) : 'polished_andesite')
      S(x, 72, z, 'polished_andesite'); continue
    }
    S(x, 72, z, inR(x, z, HALL) ? hallFloor(x, z) : inR(x, z, PLAZA) ? plazaTop(x, z) : terracePath(x, z) ? M(MIX.plaza) : 'grass_block')
  }
}
// The trench stairs (west and east): walls closed to the hollow podium, the landing out through the retaining wall.
function trenches () {
  for (const t of TRENCHES) {
    for (let z = TR.steps[0]; z <= TR.end; z++) for (let y = 64; y <= 72; y++) { S(t.wallIn, y, z, M(MIX.stonebrick)); S(t.wallOut, y, z, M(MIX.stonebrick)) }
    for (let x = Math.min(t.wallIn, t.wallOut); x <= Math.max(t.wallIn, t.wallOut); x++) for (let y = 64; y <= 72; y++) S(x, y, TR.end, M(MIX.stonebrick))
    for (let z = TR.steps[0]; z <= TR.steps[1]; z++) {
      const feet = 72 - (z - TR.steps[0])
      for (let x = t.x1; x <= t.x2; x++) {
        for (let y = 64; y <= feet - 2; y++) S(x, y, z, M(MIX.stonebrick))
        S(x, feet - 1, z, stair('stone_brick', 'north'))
        for (let y = feet; y <= 72; y++) S(x, y, z, AIR)
      }
    }
    for (let z = TR.landing[0]; z <= TR.landing[1]; z++) {
      for (let x = t.x1; x <= t.x2; x++) { S(x, 64, z, M(MIX.plaza)); for (let y = 65; y <= 72; y++) S(x, y, z, AIR) }
      for (const x of [t.wallOut, t.face]) { S(x, 64, z, M(MIX.plaza)); for (let y = 65; y <= 67; y++) S(x, y, z, AIR) } // the way out
    }
  }
}
// The parapet (andesite_wall, joined to its neighbours) round the podium and the trenches; the ramp's gap stays open.
function parapets () {
  const cells = new Set()
  for (let x = POD.x1; x <= POD.x2; x++) for (let z = POD.z1; z <= POD.z2; z++) {
    if (!onPerimeter(x, z)) continue
    if (z === POD.z2 && x >= RAMP_GAP[0] && x <= RAMP_GAP[1]) continue
    cells.add(`${x},${z}`)
  }
  for (const t of TRENCHES) {
    for (let z = TR.steps[0]; z <= TR.end; z++) { cells.add(`${t.wallIn},${z}`); cells.add(`${t.wallOut},${z}`) }
    for (let x = Math.min(t.wallIn, t.wallOut); x <= Math.max(t.wallIn, t.wallOut); x++) cells.add(`${x},${TR.end}`)
  }
  wallRun(cells, 73, 'andesite_wall')
}
// A run of wall blocks at height y with each block's connections set from its neighbours in the run.
function wallRun (cells, y, block) {
  for (const k of cells) {
    const [x, z] = k.split(',').map(Number)
    const e = cells.has(`${x + 1},${z}`), w = cells.has(`${x - 1},${z}`), n = cells.has(`${x},${z - 1}`), s = cells.has(`${x},${z + 1}`)
    const straight = (e && w && !n && !s) || (n && s && !e && !w)
    const c = v => v ? 'low' : 'none'
    S(x, y, z, `${block}[east=${c(e)},north=${c(n)},south=${c(s)},up=${!straight},waterlogged=false,west=${c(w)}]`)
  }
}

// ---- B1 and B2 (the region) --------------------------------------------------------------------------------------------
// The whole region solid first (closed shell), then each room's shell, then every room's air, so shared walls stay walls.
function region () {
  F(RG[0], RG[1], RG[2], RG[3], 63, RG[5], 'deepslate')
  F(RG[0], 64, RG[2], RG[3], RG[4], RG[5], 'stone')
  const rooms = Object.values(ROOMS)
  for (const r of rooms) {
    F(r.x1 - 1, r.y1, r.z1 - 1, r.x2 + 1, r.y2, r.z2 + 1, r.wall)
    F(r.x1 - 1, r.y1 - 1, r.z1 - 1, r.x2 + 1, r.y1 - 1, r.z2 + 1, r.fl)
    F(r.x1 - 1, r.y2 + 1, r.z1 - 1, r.x2 + 1, r.y2 + 1, r.z2 + 1, r.ce)
  }
  for (const r of rooms) F(r.x1, r.y1, r.z1, r.x2, r.y2, r.z2, AIR)
  for (const o of OPENINGS) F(...o, AIR)
  // ceiling lights: a sea lantern every 4 (a froglight in the vault), none over a camera, the stairs or the hole
  const camAt = new Set(Object.values(CAMS).map(([x, , z]) => `${x},${z}`))
  for (const [name, r] of Object.entries(ROOMS)) {
    if (name === 'staffStair' || name === 'backStair') continue
    const step = name === 'vault' ? 3 : 4
    for (let x = r.x1; x <= r.x2; x++) for (let z = r.z1; z <= r.z2; z++) {
      if ((x - r.x1) % step !== 1 || (z - r.z1) % step !== 1 || camAt.has(`${x},${z}`)) continue
      S(x, r.y2 + 1, z, name === 'vault' ? FROG : 'sea_lantern')
    }
  }
}
// The staff stair (from the floor's hole down north to the landing) and the back stair (B1 down south to B2).
function stairs () {
  // staff stair x 844..846: feet 72 at z 344 .. feet 66 at z 338 (the top step is the floor at z 345, feet 73).
  // The hole is cut first, so the stair's y 71 step at z 344 stands in it (the cut at y 71 is open over z 341..343)
  rect(HOLE[0], HOLE[1], HOLE[2], HOLE[3], (x, z) => { S(x, 71, z, AIR); S(x, 72, z, AIR) })
  for (let z = 338; z <= 344; z++) {
    const feet = 66 + (z - 338)
    for (let x = 844; x <= 846; x++) {
      for (let y = 64; y <= feet - 2; y++) S(x, y, z, 'polished_andesite')
      S(x, feet - 1, z, stair('polished_andesite', 'south'))
      for (let y = feet; y <= 70; y++) S(x, y, z, AIR)
    }
  }
  // back stair x 893..896: feet 65 at z 338 down south to feet 58 at z 345, the landing z 346..349 at feet 57
  for (let z = 338; z <= 345; z++) {
    const feet = 65 - (z - 338)
    for (let x = 893; x <= 896; x++) {
      for (let y = 56; y <= feet - 2; y++) S(x, y, z, 'polished_andesite')
      S(x, feet - 1, z, z === 338 ? 'polished_andesite' : stair('polished_andesite', 'north'))
      for (let y = feet; y <= 70; y++) S(x, y, z, AIR)
    }
  }
}
// B1's rooms: the staff door, the corridor's alcove and false floor, the security room, the cash cage, the office.
function b1 () {
  // G1, the staff door (2 x 3 iron) and its keypad on the landing side
  F(...GATES.G1, 'iron_block')
  S(848, 66, 336, OBS('west'))
  // the corridor: camera housings, pipes along the north wall, the drain hatch G7 at the back of the alcove
  F(...GATES.G7, 'iron_block')
  F(867, 67, 330, 870, 67, 330, 'polished_blackstone'); S(867, 65, 330, 'polished_blackstone'); S(870, 65, 330, 'polished_blackstone')
  S(867, 66, 330, 'polished_blackstone'); S(870, 66, 330, 'polished_blackstone')
  for (let x = 849; x <= 896; x++) if (x < 866 || x > 871) S(x, 70, 333, x % 7 === 0 ? 'waxed_copper_block' : 'waxed_cut_copper')
  // T6, the false floor: the same floor over a pit y 61..63 (z 336 stays a 1-wide strip)
  F(874, 61, 333, 877, 63, 335, AIR)
  // the security room: the monitor wall on z 350, desks, the PC, Seized cash on a table
  for (let x = 849; x <= 861; x++) for (let y = 66; y <= 69; y++) {
    const edge = x === 849 || x === 861 || y === 66 || y === 69 || (x - 849) % 4 === 0
    S(x, y, 350, edge ? 'black_concrete' : ['light_blue_concrete', 'cyan_concrete', 'lime_concrete'][(x + y) % 3])
  }
  F(850, 65, 348, 860, 65, 348, slabTop('polished_blackstone'))                // the monitor desk
  for (const x of [851, 853]) S(x, 65, 347, stair('dark_oak', 'north'))        // its chairs, facing the monitors
  F(850, 65, 343, 852, 65, 345, slabTop('polished_blackstone'))                // the PC desk
  S(851, 66, 344, OBS('east'))                                                // the security PC (a prop until M2)
  S(853, 65, 344, stair('dark_oak', 'east'))
  F(855, 65, 346, 857, 65, 347, 'spruce_planks')                             // P1 Seized cash (the table top)
  F(858, 65, 338, 861, 66, 338, 'iron_block')                                 // lockers
  // the counting room: the cash cage (G2 glass, permanent glass above, bars either side), plates, carts and racks
  F(...GATES.G2, 'glass')
  F(867, 67, 343, 875, 70, 343, 'glass')
  for (const [a, b] of [[863, 866], [876, 879]]) F(a, 65, 343, b, 70, 343, BARS_X)
  for (const x of [868, 871, 874]) S(x, 65, 342, PLATE)                        // T7-T9
  F(867, 65, 346, 869, 65, 347, 'iron_block'); F(873, 65, 346, 875, 65, 347, 'iron_block') // P2, P3 cash carts
  F(867, 65, 349, 875, 65, 349, 'dark_oak_planks')                           // P4 chip racks
  for (let x = 863; x <= 879; x++) if (x < 867 || x > 875) S(x, 65, 349, 'polished_blackstone')
  F(865, 65, 339, 867, 65, 340, slabTop('smooth_stone')); F(875, 65, 339, 877, 65, 340, slabTop('smooth_stone')) // count tables
  // the manager's office: G3 in a polished_blackstone frame, the niche behind it (P5), a desk and shelves
  F(888, 65, 350, 891, 68, 350, 'polished_blackstone'); F(...GATES.G3, 'iron_block')
  F(889, 65, 351, 890, 65, 351, 'gold_block'); F(889, 66, 351, 890, 67, 351, AIR); F(888, 68, 351, 891, 68, 351, 'polished_blackstone')
  for (const x of [881, 882]) for (let z = 340; z <= 348; z++) if (z !== 344) for (let y = 65; y <= 67; y++) if (x === 881) S(x, y, z, 'bookshelf')
  F(885, 65, 344, 888, 65, 345, slabTop('dark_oak')); S(886, 65, 346, stair('dark_oak', 'south'))
  F(884, 65, 338, 885, 65, 338, PLATE)                                         // T11, T12
  S(891, 65, 339, 'azalea_leaves[persistent=true,distance=7,waterlogged=false]')
  for (const x of [884, 885]) S(x, 64, 338, 'dark_oak_planks')
}
// B2's rooms: the readers, the mantrap, the antechamber's three gates, the deposit room, the daily vault, the vault.
function b2 () {
  S(884, 58, 351, OBS('east')); S(884, 58, 357, OBS('east'))                 // the mantrap's keycard readers (M2)
  // the loading bay: pallets of crates
  for (const [x, z] of [[886, 347], [889, 347], [886, 357]]) { S(x, 57, z, 'stripped_spruce_wood[axis=y]'); S(x, 58, z, 'stripped_spruce_wood[axis=y]') }
  S(889, 57, 357, 'stripped_spruce_wood[axis=y]')
  for (let z = 352; z <= 355; z++) S(898, 61, z, 'yellow_terracotta')        // the tunnel mouth's hazard band
  // G4 the deposit shutter (iron, a tinted-glass band), G5 the round vault door, G6 the daily vault's bars
  F(...GATES.G4, 'iron_block'); F(868, 58, 348, 870, 58, 348, 'tinted_glass')
  for (let z = 352; z <= 356; z++) for (let y = 57; y <= 61; y++) {
    const dz = Math.abs(z - 354), dy = Math.abs(y - 59)
    const s = dz === 0 && dy === 0 ? 'chiseled_stone_bricks' : (dz === 2 && dy === 2) ? 'deepslate_tiles'
      : (dz === 2 && dy === 0) || (dz === 0 && dy === 2) ? 'gold_block' : dz === 2 || dy === 2 ? 'polished_deepslate' : 'iron_block'
    S(861, y, z, s)
  }
  F(...GATES.G6, BARS_X)
  // the deposit room: the ledge (P6), the box wall behind it, the high roller's plinth (P7)
  F(864, 57, 340, 874, 58, 340, 'polished_blackstone'); F(866, 58, 340, 872, 58, 340, 'iron_block')
  for (let x = 864; x <= 874; x++) for (let y = 57; y <= 62; y++) S(x, y, 339, (x + y) % 2 ? 'iron_block' : 'polished_deepslate')
  S(869, 57, 343, 'quartz_pillar[axis=y]')
  // the daily vault (P13 on a shelf)
  F(866, 57, 364, 872, 57, 364, 'iron_block')
  for (let x = 866; x <= 872; x++) for (let y = 57; y <= 60; y++) S(x, y, 367, y === 60 ? 'gold_block' : 'iron_block')
  // the vault: gold pilasters, trolleys (P8, P9), gold (P10), art (P11), the Diamonds' plinth (P12) under the turret
  for (let z = 344; z <= 368; z += 4) for (let y = 57; y <= 62; y++) { S(845, y, z, 'gold_block') }
  for (let x = 846; x <= 860; x += 4) for (let y = 57; y <= 62; y++) { S(x, y, 343, 'gold_block'); S(x, y, 369, 'gold_block') }
  for (let x = 846; x <= 860; x++) for (let z = 344; z <= 368; z++) if (x === 846 || x === 860 || z === 344 || z === 368 || (x === 853 && z >= 349 && z <= 359)) S(x, 56, z, 'gold_block')
  F(848, 57, 346, 850, 57, 348, 'iron_block'); F(848, 57, 362, 850, 57, 364, 'iron_block')   // P8, P9 cash trolleys
  F(855, 57, 346, 858, 57, 348, 'gold_block')                                               // P10 vault gold
  F(855, 57, 363, 858, 57, 364, 'smooth_quartz')                                            // P11 vault art (crates)
  S(853, 57, 354, 'chiseled_quartz_block')                                                  // P12 the Diamonds' plinth
  for (const [x, z] of [[852, 353], [854, 353], [852, 355], [854, 355]]) S(x, 56, z, 'gold_block')
  for (const [n, [x, y, z, f]] of Object.entries(CAMS)) S(x, y, z, OBS(f))                  // T1, T2, T10, T15, T22 housings
}

// ---- the tunnels outside the region ------------------------------------------------------------------------------------
function tunnels () {
  // the security tunnel x 899..920, z 352..355, 4 high, rising 1 every 2 east to the portal in the podium's east face
  for (let x = TUN.x1; x <= TUN.x2; x++) {
    const f = tunnelFeet(x), up = f > tunnelFeet(x - 1)
    for (let z = TUN.z1; z <= TUN.z2; z++) {
      S(x, f - 1, z, up ? stair('polished_andesite', 'east') : z === TUN.z1 || z === TUN.z2 ? 'yellow_terracotta' : M(MIX.plaza))
      for (let y = f; y <= f + 3; y++) S(x, y, z, AIR)
      if (x < TUN.x2) S(x, f + 4, z, (x - TUN.x1) % 5 === 2 && (z === 353 || z === 354) ? 'sea_lantern' : 'polished_andesite')
    }
    if (x < TUN.x2) for (const z of [TUN.z1 - 1, TUN.z2 + 1]) for (let y = f - 1; y <= f + 4; y++) S(x, y, z, 'polished_andesite')
  }
  for (const z of [351, 356]) for (let y = 65; y <= 69; y++) S(920, y, z, 'polished_blackstone') // the portal's jambs
  for (let z = 351; z <= 356; z++) S(920, 69, z, 'polished_blackstone')
  // the drain x 868..870 from the region's north face down to the channel's culvert mouth (z 295), 3 high
  for (let z = DRAIN.z1; z <= DRAIN.z2; z++) {
    const f = drainFloor(z), up = z > DRAIN.z1 && f > drainFloor(z - 1)
    for (let x = DRAIN.x1; x <= DRAIN.x2; x++) {
      S(x, f, z, up ? stair('stone_brick', 'south') : x === 869 ? 'mossy_stone_bricks' : M(MIX.stonebrick))
      for (let y = f + 1; y <= f + 3; y++) S(x, y, z, AIR)
      S(x, f + 4, z, x === 869 && z % 7 === 3 ? 'sea_lantern' : M(MIX.stonebrick))
    }
    for (const x of [DRAIN.x1 - 1, DRAIN.x2 + 1]) for (let y = f; y <= f + 4; y++) S(x, y, z, M(MIX.stonebrick))
  }
}

// ---- the casino building (public; outside the region) ------------------------------------------------------------------
function hall () {
  // walls y 73..83: a smooth quartz base, calcite, gold pilasters every 6, a yellow glass band, an ochre froglight cornice
  for (let x = HALL.x1; x <= HALL.x2; x++) for (let z = HALL.z1; z <= HALL.z2; z++) {
    const ex = x === HALL.x1 || x === HALL.x2, ez = z === HALL.z1 || z === HALL.z2
    if (!ex && !ez) continue
    const pil = (ex && ez) || (ez && (x - HALL.x1) % 6 === 0) || (ex && (z - HALL.z1) % 6 === 0)
    for (let y = 73; y <= 83; y++) {
      const s = y === 83 ? FROG : pil ? 'gold_block' : y === 73 ? 'smooth_quartz' : y >= 78 && y <= 80 ? 'yellow_stained_glass' : y >= 81 ? 'smooth_quartz' : 'calcite'
      S(x, y, z, s)
    }
    S(x, 85, z, 'calcite') // the roof's parapet
  }
  // the roof y 84 (lights every 6 over the hall), the marquee tower
  for (let x = HALL.x1; x <= HALL.x2; x++) for (let z = HALL.z1; z <= HALL.z2; z++) {
    const inner = x > HALL.x1 && x < HALL.x2 && z > HALL.z1 && z < HALL.z2
    S(x, 84, z, inner && (x - 846) % 6 === 0 && (z - 334) % 6 === 0 ? PFROG : 'smooth_quartz')
  }
  for (let x = TOWER.x1; x <= TOWER.x2; x++) for (let z = TOWER.z1; z <= TOWER.z2; z++) for (let y = 85; y <= TOWER.top; y++) {
    const ex = x === TOWER.x1 || x === TOWER.x2, ez = z === TOWER.z1 || z === TOWER.z2
    if (y === TOWER.top) { S(x, y, z, 'gold_block'); continue }
    if (!ex && !ez) continue
    let s = (ex && ez) ? 'gold_block' : y === 96 ? FROG : 'calcite'
    if (z === TOWER.z2 && !ex) { // the front: a black marquee panel framed in froglights, CASINO in gold on it
      s = y === 85 || y === 96 ? FROG : x === TOWER.x1 + 1 || x === TOWER.x2 - 1 ? FROG : 'black_concrete'
    }
    S(x, y, z, s)
  }
  // over the entrance: a bulb marquee band (y 78..82), the black glass canopy on two gold posts
  for (let x = 862; x <= 877; x++) for (let y = 78; y <= 82; y++) {
    if ((x - 843) % 6 === 0) continue
    S(x, y, HALL.z2, y === 78 || y === 82 ? (x % 2 ? FROG : 'gold_block') : 'black_concrete')
  }
  F(ENTRANCE.x1, ENTRANCE.y1, ENTRANCE.z, ENTRANCE.x2, ENTRANCE.y2, ENTRANCE.z, AIR)
  F(ENTRANCE.x1, 72, ENTRANCE.z, ENTRANCE.x2, 72, ENTRANCE.z, 'polished_andesite')
  for (let x = 864; x <= 875; x++) for (let z = 372; z <= 375; z++) S(x, 78, z, x === 864 || x === 875 || z === 375 ? 'gold_block' : 'black_stained_glass')
  for (const x of [864, 875]) for (let y = 73; y <= 77; y++) S(x, y, 375, 'gold_block')
  // the staff corridor x 844..848 behind the wall x 849 (the staff doorway z 348..349), the stair hole's railing
  for (let z = 332; z <= 350; z++) for (let y = 73; y <= 83; y++) S(849, y, z, y === 83 ? FROG : y === 73 || y >= 81 ? 'smooth_quartz' : 'calcite')
  for (let x = 844; x <= 848; x++) for (let y = 73; y <= 83; y++) S(x, y, 351, y === 83 ? FROG : 'calcite')
  F(STAFF_DOORWAY.x, STAFF_DOORWAY.y1, STAFF_DOORWAY.z1, STAFF_DOORWAY.x, STAFF_DOORWAY.y2, STAFF_DOORWAY.z2, AIR)
  for (let x = 844; x <= 846; x++) S(x, 73, 340, BARS_X)
  S(847, 73, 340, bars(false, false, true, true))
  for (let z = 341; z <= 343; z++) S(847, 73, z, BARS_Z)
  S(847, 73, 344, bars(false, true, false, false))
  for (let x = 844; x <= 848; x++) { S(x, 73, 332, 'iron_block'); S(x, 74, 332, 'iron_block') } // staff lockers
  for (let z = 333; z <= 336; z++) S(844, 73, z, slabTop('polished_blackstone'))
  // the cashier cage x 850..858, z 351..358: bars, the counter on x 858 (a window at y 74), a quartz top
  for (let x = 850; x <= 857; x++) for (let y = 73; y <= 76; y++) { S(x, y, 351, BARS_X); S(x, y, 358, BARS_X) }
  for (let z = 351; z <= 358; z++) for (let y = 73; y <= 76; y++) S(849, y, z, z === 351 ? bars(true, false, true, false) : z === 358 ? bars(true, true, false, false) : BARS_Z) // the cage's west side
  for (let z = 351; z <= 358; z++) { S(858, 73, z, 'polished_blackstone'); if (z > 351 && z < 358) { S(858, 75, z, BARS_Z); S(858, 76, z, BARS_Z) } else for (let y = 74; y <= 76; y++) S(858, y, z, 'gold_block') }
  F(849, 77, 351, 858, 77, 358, 'smooth_quartz')
  for (let z = 352; z <= 357; z++) S(850, 73, z, z % 2 ? 'gold_block' : 'yellow_wool') // chip stacks behind the cashier
  // slots: four rows of six facing south (cabinet, light-blue screen, a lit topper)
  for (const z of [335, 339, 343, 347]) for (const x of SLOT_X) {
    S(x, 73, z, 'polished_blackstone'); S(x, 74, z, 'light_blue_stained_glass'); S(x, 75, z, PFROG); S(x, 76, z, slabTop('polished_blackstone').replace('type=top', 'type=bottom'))
  }
  // the table pit: two blackjack tables, roulette (green carpet on dark oak slabs), a gold rope line round it
  for (const [x1, x2] of [[865, 867], [873, 875], [882, 886]]) for (let x = x1; x <= x2; x++) for (let z = 356; z <= 358; z++) {
    S(x, 73, z, slabTop('dark_oak'))
    S(x, 74, z, x === 886 ? (z === 357 ? 'black_carpet' : 'red_carpet') : 'green_carpet')
  }
  // the Lucky Wheel on its podium (x 868..871, z 363..366), its disc facing the entrance
  for (let x = 868; x <= 871; x++) for (let z = 363; z <= 366; z++) S(x, 73, z, (x === 868 || x === 871) && (z === 363 || z === 366) ? 'gold_block' : 'smooth_quartz')
  const WHEEL = ['red_concrete', 'white_concrete', 'black_concrete', 'lime_concrete', 'light_blue_concrete', 'orange_concrete', 'magenta_concrete', 'yellow_concrete']
  for (let x = 868; x <= 871; x++) for (let y = 74; y <= 77; y++) {
    const corner = (x === 868 || x === 871) && (y === 74 || y === 77)
    S(x, y, 364, corner ? 'gold_block' : WHEEL[(x * 3 + y * 5) % WHEEL.length])
  }
  S(869, 78, 364, 'gold_block'); S(870, 78, 364, 'gold_block')
  // the Inside Track: a screen on the east wall (x 895, z 333..345, y 75..81), six seats facing it at x 889..890
  for (let z = 333; z <= 345; z++) for (let y = 75; y <= 81; y++) {
    const edge = z === 333 || z === 345 || y === 75 || y === 81
    const horse = y === 78 && [335, 338, 341, 343].includes(z)
    S(895, y, z, edge ? 'black_concrete' : horse ? ['red_concrete', 'yellow_concrete', 'blue_concrete', 'white_concrete'][z % 4] : y <= 77 ? 'green_concrete' : y === 78 ? 'lime_concrete' : 'light_blue_concrete')
  }
  for (const z of [334, 336, 338, 340, 342, 344]) { S(889, 73, z, stair('red_nether_brick', 'west')); S(890, 73, z, slabTop('dark_oak')) }
  // chandeliers: a gold ring and a pearlescent froglight under six of the roof lights
  for (const [x, z] of [[858, 340], [876, 340], [858, 364], [882, 352], [864, 352], [882, 364]]) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) S(x + dx, 83, z + dz, dx || dz ? 'gold_block' : PFROG)
    S(x, 82, z, PFROG)
  }
}
const SLOT_X = [862, 866, 871, 875, 880, 884]

// ---- the plaza and the terraces ----------------------------------------------------------------------------------------
function plaza () {
  // the fountain x 846..855, z 382..391: a quartz rim, water, a central column
  for (let x = FOUNTAIN.x1; x <= FOUNTAIN.x2; x++) for (let z = FOUNTAIN.z1; z <= FOUNTAIN.z2; z++) {
    const rim = x === FOUNTAIN.x1 || x === FOUNTAIN.x2 || z === FOUNTAIN.z1 || z === FOUNTAIN.z2
    S(x, 71, z, 'polished_andesite')
    if (rim) { S(x, 72, z, 'quartz_bricks'); S(x, 73, z, 'smooth_quartz_slab[type=bottom,waterlogged=false]') } else { S(x, 72, z, 'water[level=0]') }
  }
  for (let x = 850; x <= 851; x++) for (let z = 386; z <= 387; z++) { S(x, 72, z, 'quartz_pillar[axis=y]'); S(x, 73, z, 'quartz_pillar[axis=y]'); S(x, 74, z, 'gold_block'); S(x, 75, z, 'sea_lantern') }
  // lamps (the town's cobra-head on the podium's top) and shrubs
  streetLamp(S, 845, 375, 1, 0, 72); streetLamp(S, 894, 375, -1, 0, 72)
  streetLamp(S, 845, 396, 1, 0, 72); streetLamp(S, 884, 396, -1, 0, 72)
  for (const [x, z] of [[860, 394], [876, 394], [880, 386], [860, 378], [880, 378], [896, 388]]) shrub(S, x, z, 72)
  // terrace trees, at least 4 from the box's edge
  for (const [x, z] of [[828, 310], [828, 335], [828, 358], [912, 310], [912, 336], [850, 312], [870, 312], [890, 312], [830, 392], [910, 392]]) oak(S, x, z, 72)
}

// ---- the module ------------------------------------------------------------------------------------------------------------
module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b; clipped = 0
  podium(); trenches(); parapets(); region(); stairs(); b1(); b2(); tunnels(); hall(); plaza()
  B = null
  return b
}
module.exports.build = () => module.exports()
module.exports.clipped = () => clipped

// Text displays (tag LABEL_TAG): 0.03 off the face they sit on; y = the text's bottom.
module.exports.labels = [
  { x: 870.0, y: 88.6, z: 372.03, facing: 'south', text: 'CASINO', color: '#ffc928', scale: 6 },          // the marquee tower's panel (y 86..95)
  { x: 850.03, y: 76.15, z: 349.0, facing: 'east', text: 'STAFF ONLY', color: '#ffffff', scale: 0.6 },     // over the staff doorway
  { x: 859.03, y: 77.25, z: 355.0, facing: 'east', text: 'CASHIER', color: '#ffc928', scale: 1.2 },        // the cage's top
  { x: 870.0, y: 78.3, z: 365.03, facing: 'south', text: 'LUCKY WHEEL', color: '#ffc928', scale: 1.0 },    // over the wheel
  { x: 895.97, y: 82.1, z: 339.5, facing: 'west', text: 'INSIDE TRACK', color: '#ffffff', scale: 1.4 },    // over the screen
  { x: 859.03, y: 73.3, z: 355.0, facing: 'east', text: 'GAMES OPENING SOON', color: '#ffffff', scale: 0.5, note: 'launch fallback (6.2): remove when casino.sk opens the floor' }
]
module.exports.displays = [] // launch fallback (6.2): the floor's games are plain block props, nothing is summoned
module.exports.points = {
  CASINO_EXIT: [869.5, 73, 380.5, 0], CASINO_HOLO: [869.5, 80, 373.5, 0], CASINO_CHASE: [869.5, 63.5, 350.5, 0],
  CASHIER: [854.5, 73, 354.5, -90], BJ_1: [866.5, 73, 357.5, 0], BJ_2: [874.5, 73, 357.5, 0], ROULETTE: [884.5, 73, 357.5, 0],
  WHEEL: [870.0, 73, 367.5, 180], // where a player stands to spin: in front of the disc (x 868..871, z 364), facing north
  TRACK: [889.5, 73, 339.5, -90], // the middle of the six seats, facing the screen on the east wall
  ...Object.fromEntries([335, 339, 343, 347].flatMap((z, r) => SLOT_X.map((x, i) => [`SLOT_${r * 6 + i + 1}`, [x + 0.5, 73, z + 0.5, 0]]))),
  DRAIN_TOP: [869.5, 65, 329.5, 180], TUNNEL_PORTAL: [921.5, 65, 353.5, 90]
}
// PLAN 7.1 and 7.4, line for line (W = the world: jailbreak now, world at launch; city.js strips the # notes)
const REGION_LINES = [
  '(G) //pos1 841,55,330',
  '(G) //pos2 898,71,371',
  '(G) /rg define heist_casino',
  '(C) rg flag -w W heist_casino passthrough allow'
]
const HEIST_LINES = [
  '(G) /dheist create casino 4',
  '(G) /dheist set casino name Casino',
  '(G) /dheist set casino advanced true',
  '(G) /dheist set casino pool 240000',
  '(G) /dheist exit casino 869.5 73 380.5 0',
  '# gates (G1..G7)',
  '(G) /dloot add casino safe 848 65 334 848 67 335                               # G1 staff door keypad (the quiet way in)',
  '(G) /dloot add casino smash 867 65 343 875 66 343 alarm=true                   # G2 cash cage glass',
  '(G) /dloot add casino safe 889 66 350 890 67 350                               # G3 manager\'s wall safe',
  '(G) /dloot add casino drill 868 57 348 870 59 348 time=60 jams=2 alarm=false   # G4 deposit-room shutter (quiet)',
  '(G) /dloot add casino drill 861 57 352 861 61 356 time=90 jams=3 claim=10      # G5 vault door (alarm)',
  '(G) /dloot add casino safe 868 57 360 870 59 360                               # G6 daily vault cage (test 2.9c)',
  '(G) /dloot add casino safe 868 65 330 869 66 330                               # G7 drain hatch (region face)',
  '# piles (P1..P13)',
  '(G) /dloot add casino pile 855 65 346 857 65 347 value=4000-8000 style=cash piece=1000 take=4 per-cell=2 name=Seized_cash',
  '(G) /dloot add casino pile 867 65 346 869 65 347 value=10000-20000 style=cash piece=2000 take=4 per-cell=2 behind=2 name=Cash_cart',
  '(G) /dloot add casino pile 873 65 346 875 65 347 value=10000-20000 style=cash piece=2000 take=4 per-cell=2 behind=2 name=Cash_cart',
  '(G) /dloot add casino pile 867 65 349 875 65 349 value=5000-10000 style=goods piece=1000 take=4 behind=2 name=Chip_racks',
  '(G) /dloot add casino pile 889 65 351 890 65 351 value=4500-9000 style=cash piece=1500 take=4 per-cell=4 behind=3 name=Manager_stash',
  '(G) /dloot add casino pile 866 58 340 872 58 340 value=10000-20000 style=goods piece=2000 take=4 per-cell=2 behind=4 name=Deposit_boxes',
  '(G) /dloot add casino pile 869 57 343 869 57 343 value=10000-20000 style=goods piece=5000 take=5 per-cell=4 behind=4 name=High_roller_case',
  '(G) /dloot add casino pile 848 57 346 850 57 348 value=15000-27000 style=cash piece=1500 take=4.5 per-cell=2 behind=5 name=Cash_trolley',
  '(G) /dloot add casino pile 848 57 362 850 57 364 value=15000-27000 style=cash piece=1500 take=4.5 per-cell=2 behind=5 name=Cash_trolley',
  '(G) /dloot add casino pile 855 57 346 858 57 348 value=21000-36000 style=gold piece=1500 take=4.5 behind=5 name=Vault_gold',
  '(G) /dloot add casino pile 855 57 363 858 57 364 value=20000-35000 style=art piece=5000 take=6 behind=5 name=Vault_art',
  '(G) /dloot add casino pile 853 57 354 853 57 354 value=25000-50000 style=jewel piece=12500 take=10 behind=5 name=Diamonds',
  '(G) /dloot add casino pile 866 57 364 872 57 364 value=15000-27000 style=cash piece=1500 take=4 per-cell=4 behind=6 name=Daily_cash',
  '(G) /dloot check casino',
  '# traps (T1..T22)',
  '(G) /dtrap add casino camera 850.5 69.0 334.5 -90 20 effect=alarm angle=25 range=12 sweep=60 period=8   # T1 corridor west (its back to G1)',
  '(G) /dtrap add casino camera 895.5 69.0 334.5 90 20 effect=alarm angle=25 range=12 sweep=60 period=9    # T2 corridor east',
  '(G) /dtrap add casino laser 858.5 65.4 333.0 858.5 65.4 337.0 damage=2       # T3 corridor low (jump)',
  '(G) /dtrap add casino laser 860.5 66.65 333.0 860.5 66.65 337.0 damage=2     # T4 corridor duck',
  '(G) /dtrap add casino laser 882.5 65.3 333.0 882.5 65.3 337.0 effect=alarm   # T5 ankle alarm laser',
  '(G) /dtrap add casino floor 874 64 333 877 64 335 damage=2 depth=3          # T6 false floor (z 336 stays a strip)',
  '(G) /dtrap add casino plate 868 65 342 damage=2   # T7 cash cage plates',
  '(G) /dtrap add casino plate 871 65 342 damage=2   # T8',
  '(G) /dtrap add casino plate 874 65 342 damage=2   # T9',
  '(G) /dtrap add casino camera 871.5 69.5 338.5 0 30 effect=damage damage=1 angle=30 range=8 sweep=60 period=6 every=1.0   # T10 counting-room turret',
  '(G) /dtrap add casino plate 884 65 338 damage=2   # T11 office doorway',
  '(G) /dtrap add casino plate 885 65 338 damage=2   # T12',
  '(G) /dtrap add casino laser 893.5 57.4 352.0 893.5 57.4 356.0 effect=alarm blink=true on=2 off=1.5 offset=0       # T13 tunnel curtain (jump)',
  '(G) /dtrap add casino laser 893.5 58.65 352.0 893.5 58.65 356.0 effect=alarm blink=true on=2 off=1.5 offset=1.75  # T14 (duck)',
  '(G) /dtrap add casino camera 885.5 61.5 357.5 -135 25 effect=alarm angle=25 range=12 sweep=60 period=8   # T15 loading bay',
  '(G) /dtrap add casino laser 880.5 57.4 353.0 880.5 57.4 356.0 damage=1 blink=true on=1.5 off=1.5 offset=0      # T16 mantrap laser wall (dark 1.5..2.0 s of each 3 s)',
  '(G) /dtrap add casino laser 880.5 58.0 353.0 880.5 58.0 356.0 damage=1 blink=true on=1.5 off=1.5 offset=0.5    # T17',
  '(G) /dtrap add casino laser 880.5 58.65 353.0 880.5 58.65 356.0 damage=1 blink=true on=1.5 off=1.5 offset=1.0  # T18',
  '(G) /dtrap add casino laser 864.0 57.4 345.5 875.0 57.4 345.5 damage=1 blink=true on=1.5 off=1.5 offset=0     # T19 deposit-room laser wall',
  '(G) /dtrap add casino laser 864.0 58.0 345.5 875.0 58.0 345.5 damage=1 blink=true on=1.5 off=1.5 offset=0.5   # T20',
  '(G) /dtrap add casino laser 864.0 58.65 345.5 875.0 58.65 345.5 damage=1 blink=true on=1.5 off=1.5 offset=1   # T21',
  '(G) /dtrap add casino camera 853.5 62.5 354.5 0 90 effect=damage damage=1 angle=50 range=6.5 every=1.0   # T22 Diamonds turret (straight down; sneaking halves its range: sneak to take them)',
  '# lockdown (iron bars), cops, hologram, open',
  '(G) /dheist lock casino add 844 66 338 846 70 338 iron_bars   # L1 staff stair foot (the ceiling y 71 is solid over z 338..340: no gap over the bars)',
  '(G) /dcops casino add 925.5 65 349.5   # C1 east lawn by the tunnel portal (every cop comes in by the tunnel)',
  '(G) /dcops casino add 925.5 65 353.5   # C2',
  '(G) /dcops casino add 925.5 65 358.5   # C3',
  '(G) /dheist snapshot casino',
  '(G) /dheist holo casino 869.5 80 373.5',
  '(G) /dheist enable casino'
]
const BIKE_LINES = ['(C) dbike spotat jailbreak 866.5 60 290.5 90', '(C) dbike spotat jailbreak 869.5 60 290.5 90', '(C) dbike spotat jailbreak 872.5 60 290.5 90']
module.exports.setup = {
  regions: [{ id: 'heist_casino', box: RG.slice(), flags: ['passthrough allow'], lines: REGION_LINES,
    note: 'B1 and B2 only: the gaming floor (y >= 72), the security tunnel (x > 898) and the drain (z < 330) stay outside' }],
  heists: [{ id: 'casino', difficulty: 4, name: 'Casino', exit: [869.5, 73, 380.5, 0], holo: [869.5, 80, 373.5], chase: [869.5, 63.5, 350.5],
    settings: { advanced: true, escape: '10:00', cooldown: '30:00', level: 45, pool: 240000, police: true },
    snapshot: 'the room clean: every gate as built, G7 closed, no L1 bars', lines: HEIST_LINES }],
  keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], pois: [], walls: [], holos: [],
  bikes: BIKE_LINES.map(l => { const [x, y, z, yaw] = l.split(' ').slice(-4).map(Number); return { at: [x, y, z, yaw], tag: 'C', cmd: l.slice(4) } })
}

// ---- checks and previews (node tools/build/city/casino.js [--check] [--render <dir>]) --------------------------------------
const PASSABLE = /^(air|.*_carpet|.*_pressure_plate|.*_button)$/
const nameOf = s => s.replace(/^minecraft:/, '').replace(/\[.*$/, '')
function check (b) {
  const probs = [], info = []
  const get = (x, y, z) => b.get(x, y, z)
  const isAir = (x, y, z) => get(x, y, z) === AIR
  const solid = (x, y, z) => { const s = get(x, y, z); return !!s && !PASSABLE.test(nameOf(s)) }
  const inRg = (x, y, z) => x >= RG[0] && x <= RG[3] + 1 && y >= RG[1] && y <= RG[4] + 1 && z >= RG[2] && z <= RG[5] + 1 // continuous
  const inRgB = (x, y, z) => x >= RG[0] && x <= RG[3] && y >= RG[1] && y <= RG[4] && z >= RG[2] && z <= RG[5]          // block
  const cells = (x1, y1, z1, x2, y2, z2) => { const o = []; for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) o.push([x, y, z]); return o }
  const lines = HEIST_LINES.map(l => l.replace(/#.*$/, '').trim()).filter(Boolean)
  const nums = l => l.split(/\s+/).filter(t => /^-?[\d.]+$/.test(t)).map(Number)
  const kv = l => Object.fromEntries(l.split(/\s+/).filter(t => t.includes('=')).map(t => t.split('=')))
  const gates = [], piles = [], traps = []
  for (const l of lines) {
    let m
    if ((m = /dloot add casino (safe|smash|drill) /.exec(l))) gates.push({ kind: m[1], box: nums(l).slice(0, 6), l })
    else if (/dloot add casino pile /.test(l)) piles.push({ box: nums(l).slice(0, 6), l })
    else if ((m = /dtrap add casino (\w+) /.exec(l))) traps.push({ kind: m[1], n: nums(l), kv: kv(l), l })
  }
  // gates: solid, at most 27 blocks; smash gates glass
  for (const g of gates) {
    const c = cells(...g.box)
    if (c.length > 27) probs.push(`gate over 27 blocks: ${g.l}`)
    for (const p of c) if (!solid(...p)) probs.push(`gate cell ${p} not solid (${get(...p)}): ${g.l}`)
    if (g.kind === 'smash') for (const p of c) if (!/glass/.test(get(...p) || '')) probs.push(`smash cell ${p} not glass`)
    if (!c.every(p => inRgB(...p))) probs.push(`gate outside the region: ${g.l}`)
  }
  // piles: solid, 2 air above, no overlap
  const seen = new Map()
  for (const pl of piles) for (const p of cells(...pl.box)) {
    const [x, y, z] = p
    if (!solid(x, y, z)) probs.push(`pile cell ${p} not solid (${get(x, y, z)})`)
    if (!isAir(x, y + 1, z) || !isAir(x, y + 2, z)) probs.push(`pile cell ${p}: no 2 air above (${get(x, y + 1, z)}, ${get(x, y + 2, z)})`)
    if (seen.has(`${p}`)) probs.push(`piles overlap at ${p}`); seen.set(`${p}`, pl.l)
    if (!inRgB(x, y, z)) probs.push(`pile cell ${p} outside the region`)
  }
  // traps
  const edge = (x, y, z) => Math.min(x - RG[0], RG[3] + 1 - x, y - RG[1], RG[4] + 1 - y, z - RG[2], RG[5] + 1 - z)
  for (const t of traps) {
    if (t.kind === 'laser') {
      const [x1, y1, z1, x2, y2, z2] = t.n
      if (edge(x1, y1, z1) < 2 || edge(x2, y2, z2) < 2) probs.push(`laser < 2 inside the region: ${t.l}`)
      for (let i = 1; i < 40; i++) { // the beam crosses air only (wall to wall)
        const f = i / 40, px = x1 + (x2 - x1) * f, py = y1 + (y2 - y1) * f, pz = z1 + (z2 - z1) * f
        if (!isAir(Math.floor(px), Math.floor(py), Math.floor(pz))) { probs.push(`laser crosses ${get(Math.floor(px), Math.floor(py), Math.floor(pz))} at ${[px, py, pz].map(v => v.toFixed(1))}: ${t.l}`); break }
      }
      const mx = Math.floor((x1 + x2) / 2), mz = Math.floor((z1 + z2) / 2); let fy = Math.floor(y1)
      while (fy > 40 && !solid(mx, fy, mz)) fy--
      info.push(`T${traps.indexOf(t) + 1}: ${(y1 - fy - 1).toFixed(2)} over the feet (floor y ${fy})`)
    } else if (t.kind === 'camera') {
      const [x, y, z] = t.n
      if (edge(x, y, z) < 2) probs.push(`camera < 2 inside: ${t.l}`)
      if (!isAir(Math.floor(x), Math.floor(y), Math.floor(z))) probs.push(`camera lens in a block (${get(Math.floor(x), Math.floor(y), Math.floor(z))}): ${t.l}`)
      // no safe or drill gate cell in its cone (rule 2.1): range, yaw +- (angle + sweep / 2), pitch +- angle
      const yaw = t.n[3], pitch = t.n[4], ang = Number(t.kv.angle || 30), rng = Number(t.kv.range || 12), sw = Number(t.kv.sweep || 0)
      for (const g of gates) if (g.kind !== 'smash') for (const c of cells(...g.box)) for (const [ox, oy, oz] of [[0.5, 0.5, 0.5], [0, 0, 0], [1, 1, 1], [1, 0, 0], [0, 1, 1], [0, 0, 1], [1, 1, 0]]) {
        const dx = c[0] + ox - x, dy = c[1] + oy - y, dz = c[2] + oz - z, d = Math.hypot(dx, dy, dz)
        if (d > rng || d < 1e-6) continue
        const cy = Math.atan2(-dx, dz) * 180 / Math.PI, cp = Math.asin(-dy / d) * 180 / Math.PI
        let dyaw = Math.abs(((cy - yaw) % 360 + 540) % 360 - 180)
        if (pitch >= 80) dyaw = 0 // straight down: the cone is round
        if (dyaw <= ang + sw / 2 && Math.abs(cp - pitch) <= ang) { probs.push(`camera sees gate cell ${c}: ${t.l}`); break }
      }
    } else if (t.kind === 'plate') {
      const [x, y, z] = t.n
      if (!/pressure_plate/.test(get(x, y, z) || '')) probs.push(`no plate block at ${x} ${y} ${z}`)
      if (!solid(x, y - 1, z)) probs.push(`plate ${x} ${y} ${z} over nothing`)
      if (edge(x + 0.5, y, z + 0.5) < 2) probs.push(`plate < 2 inside: ${t.l}`)
    } else if (t.kind === 'floor') {
      const [x1, y1, z1, x2, y2, z2] = t.n, depth = Number(t.kv.depth)
      for (const [x, y, z] of cells(x1, y1, z1, x2, y2, z2)) {
        if (!solid(x, y, z)) probs.push(`false floor ${x} ${y} ${z} not solid`)
        for (let d = 1; d <= depth; d++) if (!isAir(x, y - d, z)) probs.push(`pit ${x} ${y - d} ${z} not air`)
        if (!solid(x, y - depth - 1, z)) probs.push(`pit bottom ${x} ${y - depth - 1} ${z} not solid`)
        if (!inRgB(x, y - depth - 1, z)) probs.push('pit outside the region')
      }
      if (!isAir(x1, y1 + 1, z2 + 1) || solid(x1, y1, z2 + 1) === false) probs.push('the strip beside the false floor is not walkable')
    }
  }
  // L1's cells stay air (the bars come at the alarm); the ceiling over them is solid
  for (const p of cells(844, 66, 338, 846, 70, 338)) if (!isAir(...p)) probs.push(`L1 cell ${p} not air`)
  for (let x = 844; x <= 846; x++) for (let z = 338; z <= 340; z++) if (!solid(x, 71, z)) probs.push(`ceiling over L1 open at ${x} 71 ${z}`)
  // spots outside the region
  for (const [n, p] of [['exit', [869.5, 73, 380.5]], ['C1', [925.5, 65, 349.5]], ['C2', [925.5, 65, 353.5]], ['C3', [925.5, 65, 358.5]], ...module.exports.setup.bikes.map(k => ['bike', k.at])])
    if (inRg(...p)) probs.push(`${n} ${p} inside the region`)
  // the region is sealed: a flood over passable cells from every room may leave it only by the planned ways
  const start = Object.values(ROOMS).map(r => [r.x1, r.y1 + 1, r.z1])
  const key = (x, y, z) => `${x},${y},${z}`, done = new Set(), exits = new Map(), q = []
  for (const s of start) if (!solid(...s)) { q.push(s); done.add(key(...s)) }
  while (q.length) {
    const [x, y, z] = q.pop()
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const n = [x + dx, y + dy, z + dz]
      if (solid(...n)) continue
      if (!inRgB(...n)) { const k = `${dx},${dy},${dz}`; exits.set(k, [...(exits.get(k) || []), key(x, y, z)]); continue }
      if (!done.has(key(...n))) { done.add(key(...n)); q.push(n) }
    }
  }
  const ex = [...exits].map(([d, l]) => `${d}: ${l.length} cell(s) e.g. ${l[0]}`)
  const okExit = ([d, l]) => (d === '0,1,0' && l.every(c => { const [x, y, z] = c.split(',').map(Number); return y === 71 && x >= HOLE[0] && x <= HOLE[2] && z >= HOLE[1] && z <= HOLE[3] })) ||
    (d === '1,0,0' && l.every(c => { const [x, y, z] = c.split(',').map(Number); return x === 898 && y >= 57 && y <= 60 && z >= 352 && z <= 355 }))
  for (const e of exits) if (!okExit(e)) probs.push(`the region opens at ${e[0]}: ${e[1].slice(0, 4).join(' ')}`)
  info.push(`region ways out: ${ex.join('; ')}`)
  // the region's own cells are all written (closed shell); nothing at y >= 72 in its columns is in it by construction
  let unwritten = 0
  for (const p of cells(...RG)) if (!get(...p)) unwritten++
  if (unwritten) probs.push(`${unwritten} region cells unwritten`)
  // open-sky road blocks at y 62..71
  const top = new Map()
  for (const k of b.blocks.keys()) { const [x, y, z] = k.split(',').map(Number); const t = top.get(`${x},${z}`); if (b.get(x, y, z) !== AIR && (t === undefined || y > t)) top.set(`${x},${z}`, y) }
  for (const [k, y] of top) if (y >= 62 && y <= 71 && /^(black|gray|white|yellow)_concrete(_powder)?$/.test(nameOf(b.get(...k.split(',').map(Number).flatMap((v, i) => i === 0 ? [v, y] : [v]))))) probs.push(`open-sky road block at ${k} y ${y}`)
  if (clipped) probs.push(`${clipped} write(s) outside the module's columns`)
  return { probs, info }
}
function previewBuild () {
  const { Build } = require('../mcstruct')
  const b = module.exports(), p = new Build()
  const ALIAS = { smooth_quartz: 'quartz_block', smooth_quartz_slab: 'quartz_block', water: 'water' }
  for (const [k, s] of b.blocks) p.blocks.set(k, ALIAS[nameOf(s)] || s)
  return p
}
function sub (b, x1, z1, x2, z2, y1 = -999, y2 = 999) {
  const out = new (require('../mcstruct').Build)()
  for (const [k, s] of b.blocks) { const [x, y, z] = k.split(',').map(Number); if (x >= x1 && x <= x2 && z >= z1 && z <= z2 && y >= y1 && y <= y2) out.blocks.set(k, s) }
  return out
}
if (require.main === module) {
  const args = process.argv.slice(2)
  const b = module.exports(), bb = b.bounds()
  console.log(`casino: ${b.blocks.size} blocks (budget 200,000), box ${bb.x1},${bb.y1},${bb.z1} to ${bb.x2},${bb.y2},${bb.z2}; ${module.exports.labels.length} labels, ${module.exports.displays.length} displays, ${Object.keys(module.exports.points).length} points`)
  if (args.includes('--check')) {
    const { probs, info } = check(b)
    for (const i of info) console.log(`  info: ${i}`)
    for (const p of probs) console.log(`  PROBLEM: ${p}`)
    console.log(probs.length ? `${probs.length} problem(s)` : 'check ok')
    if (probs.length) process.exitCode = 1
  }
  const ri = args.indexOf('--render')
  if (ri >= 0) {
    const fs = require('fs'), path = require('path'), R = require('../render')
    const dir = args[ri + 1]
    fs.mkdirSync(dir, { recursive: true })
    const save = (name, img) => { const f = path.join(dir, `${name}.png`); fs.writeFileSync(f, img.png()); console.log(`wrote ${f} (${img.w}x${img.h})`) }
    const p = previewBuild()
    save('top', R.top(p, 5))
    const rg = sub(p, RG[0] - 2, RG[2] - 2, RG[3] + 2, RG[5] + 2)
    for (const y of [57, 58, 65, 66, 73, 74, 85]) save(`plan-y${y}`, R.plan(rg, y, 10))
    save('plan-drain-tunnel-y61', R.plan(sub(p, 860, 294, 922, 360), 61, 8))
    for (const d of ['NE', 'SE', 'SW', 'NW']) save(`iso-${d}`, R.iso(p, d, 4))
    save('cut-B2-SE', R.iso(sub(p, 843, 336, 900, 371, 55, 62), 'SE', 10))
    save('cut-B1-SE', R.iso(sub(p, 841, 328, 900, 371, 63, 70), 'SE', 10))
    save('cut-hall-SE', R.iso(sub(p, 843, 331, 896, 371, 72, 79), 'SE', 10))
    save('cut-hall-NW', R.iso(sub(p, 843, 331, 896, 371, 72, 79), 'NW', 10))
    save('front-SE', R.iso(sub(p, 836, 360, 905, 400, 64), 'SE', 8))
    save('tunnels-NE', R.iso(sub(p, 860, 294, 922, 360, 55, 71), 'NE', 8))
  }
}
