'use strict'
// streets: Rising City's streets east of the prison (tools/build/city/PLAN.md section 3, GPS 7.8; module 'streets').
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
const WORLD = 'world'
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

// =====================================================================================================================
// The streets module (PLAN.md section 3; GPS paths 7.8). Every column ownerOf() gives 'streets' gets what streetCell()
// says goes there; the furniture (lights, stop bars, lamps, trees, the island's sign and shrubs, the ramp's lamps, the
// channel's rail) is placed on top. Nothing here reads blocks; every write goes through S (clipped to the street
// columns), so a street block can never land in a building's box or a kept-free box.
//   node tools/build/city/streets.js                         -> counts, bounds, furniture, the GPS node check
//   node tools/build/city/streets.js --render <dir> [--px n] [--crop x1,z1,x2,z2] [--views top,plan,iso] [--y 60,65,73]
// =====================================================================================================================
const MOD = 'streets'
const own = ownFor(MOD)
let B = null
const MISSED = [] // writes S dropped (outside the street columns): the CLI reports them; there should be none
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, s); else MISSED.push([x, y, z, s]) }
const key = (x, z) => `${x},${z}`

// ---- the street cells ------------------------------------------------------------------------------------------------
const CELL = new Map() // "x,z" -> streetCell(x, z), the streets module's columns only (null cells left out)
for (let x = CITY.x1; x <= CITY.x2; x++) for (let z = CITY.z1; z <= CITY.z2; z++) {
  if (ownerOf(x, z) !== MOD) continue
  const c = streetCell(x, z)
  if (c) CELL.set(key(x, z), c)
}
const cellAt = (x, z) => CELL.get(key(x, z)) || null
const kindAt = (x, z) => { const c = cellAt(x, z); return c ? c.kind : null }
const ROAD = new Set(['road', 'line'])
const isRoad = (x, z) => ROAD.has(kindAt(x, z))

// ---- GPS (7.8) -------------------------------------------------------------------------------------------------------
const GPS = {
  nodes: [
    [3001, 482.5, 65, 426.5, 'AVE_W'], [3002, 497.5, 65, 426.5, 'AVE_WEST_ST'], [3003, 612.5, 65, 426.5, 'AVE_JEWELRY'],
    [3004, 651.5, 65, 426.5, 'AVE_BANK_ST'], [3005, 780.5, 65, 426.5, 'AVE_E'], [3006, 795.5, 65, 430.5, 'RB_W'],
    [3007, 810.5, 65, 415.5, 'RB_N'], [3008, 825.5, 65, 430.5, 'RB_E'], [3009, 810.5, 65, 445.5, 'RB_S'],
    [3010, 831.5, 65, 405.5, 'RAMP_FOOT'], [3011, 890.5, 73, 405.5, 'RAMP_TOP'], [3012, 890.5, 73, 396.5, 'PLAZA'],
    [3013, 869.5, 73, 380.5, 'CASINO_EXIT'], [3014, 651.5, 65, 347.5, 'BANK_ST_VAULT'], [3015, 651.5, 65, 300.5, 'BANK_FRONT'],
    [3016, 636.5, 65, 300.5, 'BANK_EXIT'], [3017, 651.5, 65, 262.5, 'BANK_ST_N'], [3018, 497.5, 65, 347.5, 'WEST_ST_N'],
    [3019, 619.5, 65, 347.5, 'VAULT_ALLEY'], [3020, 619.5, 65, 364.5, 'ALLEY'], [3021, 781.5, 65, 347.5, 'VAULT_E'],
    [3022, 781.5, 65, 337.5, 'CH_LEG_TOP'], [3023, 781.5, 60, 295.5, 'CH_LEG_FOOT'], [3024, 781.5, 60, 288.5, 'CH_BEND'],
    [3025, 869.5, 60, 288.5, 'CH_CASINO'], [3026, 869.5, 60, 294.5, 'DRAIN_MOUTH'], [3027, 869.5, 65, 329.5, 'DRAIN_TOP'],
    [3028, 497.5, 65, 300.5, 'WEST_ST_HATCH'], [3029, 570.5, 65, 300.5, 'HATCH_PLAZA'], [3030, 612.5, 65, 417.5, 'JEWELRY_EXIT']
  ],
  links: [
    [1002, 3001], [3001, 3002], [3002, 3003], [3003, 3030], [3003, 3004], [3004, 3005], [3005, 3006],
    [3006, 3007], [3007, 3008], [3008, 3009], [3009, 3006],
    [3007, 3010], [3010, 3011], [3011, 3012], [3012, 3013],
    [3004, 3014], [3014, 3015], [3015, 3016], [3015, 3017],
    [3002, 3018], [3018, 3019], [3019, 3014], [3019, 3020], [3014, 3021],
    [3021, 3022], [3022, 3023], [3023, 3024], [3024, 3025], [3025, 3026], [3026, 3027],
    [3018, 3028], [3028, 3029]
  ]
}
// The nodes the streets module stands people on (the rest lie in a building's box: the bank's exit, the plaza, the
// casino's exit, the alley, the drain's top, Hatch Plaza): the CLI checks their feet against this build.
const OWN_NODES = GPS.nodes.filter(([, x, , z]) => ownerOf(Math.floor(x), Math.floor(z)) === MOD)
const segD = (px, pz, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz))
}
const NODE = new Map(GPS.nodes.map(n => [n[0], n]))
const onLink = (x, z) => GPS.links.some(([p, q]) => {
  const a = NODE.get(p), b = NODE.get(q)
  return a && b && segD(x + 0.5, z + 0.5, [a[1], a[3]], [b[1], b[3]]) < 1.5
})

// ---- spots other modules' setup stands people on: no post on them (exits, cop spots on the sidewalks) ----------------
const SPOTS = [[612, 417], [596, 417], [662, 417], [636, 300], [660, 296], [660, 305]]

// ---- the junction (3.2): a 4-light junction at Bank Street x Main Avenue -----------------------------------------------
// [pole x, z, arm dx, dz, arm length]: the town's design (town/streets.js trafficLight), the head hanging over the lanes
// whose traffic it faces. Traffic keeps right: eastbound z 431..439, westbound z 421..429, Bank Street southbound
// x 643..650. SW: eastbound (near side); NE: westbound (near side; one east of the cop spot 662.5 417.5); NW: Bank
// Street southbound; SE: eastbound again, far side (Bank Street is a T: nothing comes from the south).
const LIGHTS = [[641, 443, 0, -1, 8], [663, 417, 0, 1, 8], [641, 417, 1, 0, 6], [662, 443, 0, -1, 8]]
// Stop bars [x1, z1, x2, z2]: one white row across the lanes heading into the junction, 2 cells before the crossing
// street's sidewalk, never on the dash. Vault Street at Bank Street (eastbound z 349..352, westbound z 343..346), Vault
// Street westbound at West Street, West Street southbound (x 493..497) at the avenue.
const STOPBARS = [[638, 349, 638, 352], [665, 343, 665, 346], [507, 343, 507, 346], [493, 414, 497, 414]]

// ---- lamps (3.2): streetLamp every 24 on both avenue sidewalks, Bank Street and Vault Street ---------------------------
// A strip: the posts' line (`axis` the run's direction, `at` the line across it), the arm toward the road, the run, the
// first post and the rows kept free (+-2 around crossings, lights, bars, spots and the GPS links walked across a
// sidewalk; and the frontages within 4 of a building's or a kept-free box, where tall things don't stand: the Jewelry
// Store's avenue and Vault Street sides, the base lot's Vault Street side, Bank Street's west side along the bank).
const LAMP_STRIPS = [
  { name: 'avenue N', axis: 'x', at: 417, arm: [0, 1], from: 482, to: 786, first: 500, skip: [[590, 645]] },
  { name: 'avenue S', axis: 'x', at: 443, arm: [0, -1], from: 482, to: 786, first: 488, skip: [] },
  { name: 'Bank St E', axis: 'z', at: 662, arm: [-1, 0], from: 284, to: 410, first: 404, step: -24, skip: [] },
  { name: 'Bank St W', axis: 'z', at: 641, arm: [1, 0], from: 234, to: 276, first: 274, step: -24, skip: [] },
  { name: 'Vault St N', axis: 'x', at: 341, arm: [0, 1], from: 508, to: 772, first: 520, skip: [] },
  { name: 'Vault St S', axis: 'x', at: 354, arm: [0, -1], from: 508, to: 772, first: 532, skip: [[504, 554], [592, 643]] }
]
const cellOf = (st, t) => st.axis === 'x' ? [t, st.at] : [st.at, t]
const lampOk = (st, t) => {
  if (t < st.from || t > st.to || st.skip.some(([a, b]) => t >= a && t <= b)) return false
  const [x, z] = cellOf(st, t)
  if (kindAt(x, z) !== 'walk') return false
  for (let d = -2; d <= 2; d++) { // the rows around it: plain sidewalk (no crossing, no road), no light, bar or spot
    const [cx, cz] = cellOf(st, t + d)
    const k = kindAt(cx, cz)
    if (k !== 'walk' && k !== 'curb') return false
    if ([...LIGHTS, ...SPOTS].some(([lx, lz]) => lx === cx && lz === cz)) return false
  }
  if (STOPBARS.some(([a, b, c, d]) => Math.abs(x - (a + c) / 2) < 6 && Math.abs(z - (b + d) / 2) < 6)) return false
  if (LIGHTS.some(([lx, lz]) => Math.abs(lx - x) <= 4 && Math.abs(lz - z) <= 4)) return false
  if (onLink(x, z)) return false
  return true
}
const LAMPS = [] // [x, z, dx, dz, y0]
for (const st of LAMP_STRIPS) {
  const step = st.step || 24, dir = Math.sign(step)
  for (let t = st.first; dir > 0 ? t <= st.to : t >= st.from; t += step) {
    let u = null
    for (let d = 0; d <= 8 && u === null; d++) for (const s of d ? [-d, d] : [0]) if (u === null && lampOk(st, t + s)) u = t + s
    if (u === null) continue
    const [x, z] = cellOf(st, u)
    if (LAMPS.some(([lx, lz]) => Math.abs(lx - x) + Math.abs(lz - z) < 12)) continue
    LAMPS.push([x, z, ...st.arm, 64])
  }
}
// The ramp wall's lamps (3.2): on the wall's top at x 846, 862, 878, the arm over the ramp road.
const RAMP_LAMPS = [846, 862, 878].map(x => [x, RAMP.wall, 0, -1, rampFeet(x)])

// ---- the parking strip's trees (3.2): every 10 on a bay line, oak and shrub in turn -----------------------------------
// Each stands in a 1 x 3 grass planter (z 448..450) on the bay line (x % 10 === 0), clear of the roundabout's end.
const TREES = [] // [x, kind]
for (let x = 490; x <= 780; x += 10) TREES.push([x, x % 20 === 0 ? 'oak' : 'shrub'])

// ---- the roundabout's island (3.2, 7.6): the city sign, the shrub ring, the POI spot ------------------------------------
// The sign: a calcite panel x 804, z 427..433, y 65..67 with a polished andesite plinth and cap, "Rising City" on its
// west face (the avenue's drivers see it head-on) and its east face. The POI spot (810.5, 65, 430.5) stays clear.
const SIGN = { x: 804, z1: 427, z2: 433, y1: 65, y2: 67 }
const POI = [810.5, 65, 430.5, -90]
const islandShrub = (x, z) => { const d = rbD(x, z); return d >= 6.5 && d < 7.5 && !(x >= SIGN.x - 1 && x <= SIGN.x + 1 && z >= SIGN.z1 - 1 && z <= SIGN.z2 + 1) && h(x, 7, z) < 45 }

// ---- labels ------------------------------------------------------------------------------------------------------------
const LABELS = (() => {
  const zc = (SIGN.z1 + SIGN.z2 + 1) / 2, scale = 3.2, y = Math.round(((SIGN.y1 + SIGN.y2 + 1) / 2 - 0.125 * scale) * 100) / 100
  return [
    { x: SIGN.x - 0.03, y, z: zc, facing: 'west', text: 'Rising City', color: '#ffffff', scale },
    { x: SIGN.x + 1.03, y, z: zc, facing: 'east', text: 'Rising City', color: '#ffffff', scale }
  ]
})()

// ---- builders --------------------------------------------------------------------------------------------------------
const stone = (x, y, z) => pick(x, y, z, MIX.stonebrick)
// The surface of every street cell, the carving of the channel and its leg, the fill under the ramp.
function surface () {
  for (const [k, c] of CELL) {
    const [x, z] = k.split(',').map(Number)
    switch (c.kind) {
      case 'road': S(x, c.top, z, pick(x, c.top, z, MIX.asphalt)); break
      case 'line': S(x, c.top, z, `${c.color}_concrete`); break
      case 'walk': S(x, c.top, z, pick(x, c.top, z, MIX.walk)); break
      case 'island': S(x, c.top, z, 'grass_block[snowy=false]'); break
      case 'lane': S(x, c.top, z, pick(x, c.top, z, MIX.plaza)); break
      case 'park': S(x, c.top, z, c.bay ? 'white_concrete' : pick(x, c.top, z, MIX.asphalt)); break
      case 'curb': // the ramp's curb (z 401) stands on the ramp's fill
        for (let y = GROUND_Y; y < c.top; y++) S(x, y, z, stone(x, y, z))
        S(x, c.top, z, pick(x, c.top, z, MIX.curb)); S(x, c.top + 1, z, 'smooth_stone_slab[type=bottom,waterlogged=false]'); break
      case 'ramp': // asphalt on a stone-brick fill; the flat top (x >= 887, and z 401 there) is plaza (3.3)
        for (let y = GROUND_Y; y < c.top; y++) S(x, y, z, stone(x, y, z))
        S(x, c.top, z, x >= RAMP.top ? pick(x, c.top, z, MIX.plaza) : pick(x, c.top, z, MIX.asphalt)); break
      case 'rampwall': for (let y = GROUND_Y; y <= c.top; y++) S(x, y, z, stone(x, y, z)); break
      case 'chan': // the floor, the air above it up to the ground's top
        S(x, c.top, z, pick(x, c.top, z, MIX.plaza))
        for (let y = c.top + 1; y <= GROUND_Y; y++) S(x, y, z, 'air'); break
      case 'wall': { // the channel's walls from below its floor to y 64; the rail on top; the culvert mouth open
        const floor = x >= LEG.x1 && x <= LEG.x2 && z >= LEG.z1 ? legFloor(z) : CHAN.floor
        if (c.mouth) { S(x, CHAN.floor, z, pick(x, CHAN.floor, z, MIX.plaza)); for (let y = CHAN.floor + 1; y <= GROUND_Y; y++) S(x, y, z, 'air'); break }
        for (let y = floor - 1; y <= c.top; y++) S(x, y, z, stone(x, y, z))
        const rail = (a, d) => { const n = cellAt(a, d); return !!n && n.kind === 'wall' && !n.mouth }
        S(x, c.top + 1, z, `iron_bars[east=${rail(x + 1, z)},north=${rail(x, z - 1)},south=${rail(x, z + 1)},waterlogged=false,west=${rail(x - 1, z)}]`); break
      }
      default: throw new Error(`unknown street kind ${c.kind} at ${x},${z}`)
    }
  }
}
// Half steps where the ramp and the leg rise a block (people and bikes walk up; the plan's heights are unchanged: the
// slab sits on the last cell of each run, at that cell's feet).
function steps () {
  for (let x = RAMP.x1; x < RAMP.x2; x++) {
    if (rampFeet(x + 1) <= rampFeet(x)) continue
    const slab = x + 1 >= RAMP.top ? 'polished_andesite_slab[type=bottom,waterlogged=false]' : 'polished_blackstone_slab[type=bottom,waterlogged=false]'
    for (let z = RAMP.z1; z <= RAMP.z2; z++) S(x, rampFeet(x), z, slab)
  }
  for (let z = LEG.z1; z < LEG.z2; z++) {
    if (legFloor(z + 1) <= legFloor(z)) continue
    for (let x = LEG.x1 + 1; x < LEG.x2; x++) S(x, legFloor(z) + 1, z, 'polished_andesite_slab[type=bottom,waterlogged=false]')
  }
}
// The ramp's east end: a stone-brick wall x 895, z 401..410, from the ground to y 73 (a parapet 1 over the flat top),
// so nobody walks off the ramp's open end 8 blocks down.
function rampEnd () {
  for (let z = RAMP.curb; z <= RAMP.wall; z++) for (let y = GROUND_Y; y <= 73; y++) S(RAMP.x2 + 1, y, z, stone(RAMP.x2 + 1, y, z))
}
function markings () {
  for (const [x1, z1, x2, z2] of STOPBARS) rect(x1, z1, x2, z2, (x, z) => {
    if (kindAt(x, z) !== 'road') throw new Error(`stop bar cell ${x},${z} is ${kindAt(x, z)}`)
    S(x, 64, z, 'white_concrete')
  })
}
// A curb slab (y 65) on every sidewalk curb cell (3.2): the curb kind's top + 1.
function curbs () {
  for (const [k, c] of CELL) {
    if (c.kind !== 'curb' || c.top !== GROUND_Y) continue
    const [x, z] = k.split(',').map(Number)
    S(x, 64, z, pick(x, 64, z, MIX.curb)); S(x, 65, z, 'smooth_stone_slab[type=bottom,waterlogged=false]')
  }
}
// The town's traffic light (town/streets.js): a diorite pole y 65..74, the arm at y 74, the head red/yellow/lime facing
// the traffic, a polished blackstone housing behind it.
function trafficLight ([px, pz, dx, dz, len]) {
  for (let y = 65; y <= 74; y++) S(px, y, pz, 'diorite_wall')
  S(px, 75, pz, 'polished_diorite_slab[type=bottom,waterlogged=false]')
  for (let k = 1; k <= len; k++) S(px + dx * k, 74, pz + dz * k, 'diorite_wall')
  const back = dx > 0 ? 'west' : dx < 0 ? 'east' : dz > 0 ? 'north' : 'south'
  for (const k of [1, Math.floor(len / 2)]) S(px + dx * k, 73, pz + dz * k, `diorite_stairs[facing=${back},half=top,shape=straight,waterlogged=false]`)
  const hx = px + dx * len, hz = pz + dz * len, tx = -dz, tz = dx
  S(hx, 73, hz, 'red_concrete'); S(hx, 72, hz, 'yellow_concrete'); S(hx, 71, hz, 'lime_concrete')
  for (let y = 71; y <= 73; y++) S(hx + tx, y, hz + tz, 'polished_blackstone')
  S(hx + tx, 74, hz + tz, 'polished_blackstone_slab[type=bottom,waterlogged=false]')
  S(hx, 70, hz, 'polished_blackstone_slab[type=top,waterlogged=false]'); S(hx + tx, 70, hz + tz, 'polished_blackstone_slab[type=top,waterlogged=false]')
}
// Night light under every lamp head and signal head (an invisible light block, no collision), as the town's.
const GLOW = []
const glow = (x, y, z) => { S(x, y, z, 'light[level=15,waterlogged=false]'); GLOW.push([x, y, z]) }
function trees () {
  for (const [x, kind] of TREES) {
    for (let z = 448; z <= 450; z++) S(x, 64, z, 'grass_block[snowy=false]')
    if (kind === 'oak') oak(S, x, 449)
    else { for (let z = 448; z <= 450; z++) S(x, 65, z, 'azalea_leaves[distance=7,persistent=true,waterlogged=false]'); S(x, 66, 449, 'flowering_azalea_leaves[distance=7,persistent=true,waterlogged=false]') }
  }
}
function island () {
  for (const [k, c] of CELL) {
    if (c.kind !== 'island') continue
    const [x, z] = k.split(',').map(Number)
    if (islandShrub(x, z)) shrub(S, x, z)
  }
  // the sign: plinth y 64 is the island's grass; panel y 65..67 calcite framed by polished andesite ends, a cap of slabs
  for (let z = SIGN.z1 - 1; z <= SIGN.z2 + 1; z++) {
    const end = z < SIGN.z1 || z > SIGN.z2
    for (let y = SIGN.y1; y <= SIGN.y2; y++) S(SIGN.x, y, z, end ? 'polished_andesite' : 'calcite')
    S(SIGN.x, SIGN.y2 + 1, z, 'polished_andesite_slab[type=bottom,waterlogged=false]')
  }
  for (let z = SIGN.z1 - 1; z <= SIGN.z2 + 1; z++) for (const x of [SIGN.x - 1, SIGN.x + 1]) S(x, 64, z, 'polished_andesite')
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  MISSED.length = 0; GLOW.length = 0
  surface()
  steps()
  rampEnd()

  markings()
  for (const l of LIGHTS) { trafficLight(l); const [px, pz, dx, dz, len] = l; glow(px + dx * len, 66, pz + dz * len) }
  for (const [x, z, dx, dz, y0] of [...LAMPS, ...RAMP_LAMPS]) { streetLamp(S, x, z, dx, dz, y0); glow(x + dx * 3, (z === RAMP.wall ? rampFeet(x) : 65) + 1, z + dz * 3) }
  trees()
  island()
  B = null
  return b
}
module.exports.build = () => module.exports()
module.exports.labels = LABELS
module.exports.displays = []
module.exports.points = { RISING_CITY: POI }
module.exports.setup = {
  regions: [{ id: 'district_rising_city', box: [CITY.x1, CITY.y1, CITY.z1, CITY.x2, CITY.y2, CITY.z2], flags: { passthrough: 'allow' }, launch: true,
    note: 'the district (7.1): (L) define, (C) the flag, (L) the name',
    lines: ['(L) //pos1 481,44,226', '(L) //pos2 940,110,470', '(L) /rg define district_rising_city', '(C) rg flag -w world district_rising_city passthrough allow', '(L) /ddistrict name rising_city Rising City'] }],
  heists: [], keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [],
  pois: [{ at: POI, cmd: '/dpoi add landmark Rising City', launch: true, lines: ['(L) /dpoi add landmark Rising City'] }],
  walls: [], holos: [], bikes: [],
  phone: ['(C) dphone city scan -40 -30 940 1300 0 world'] // 7.6: the phone's map, then the hand paths (7.8)
}
module.exports.gps = GPS
module.exports.furniture = { lights: LIGHTS, stopbars: STOPBARS, lamps: LAMPS, rampLamps: RAMP_LAMPS, trees: TREES, glow: GLOW, missed: MISSED }

// ---- CLI -------------------------------------------------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2)
  const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : args[i + 1] }
  const b = module.exports()
  const bb = b.bounds()
  console.log(`streets: ${b.blocks.size} blocks (budget 250,000) in ${CELL.size} street cells, box ${bb.x1},${bb.y1},${bb.z1} to ${bb.x2},${bb.y2},${bb.z2}`)
  const kinds = {}; for (const c of CELL.values()) kinds[c.kind] = (kinds[c.kind] || 0) + 1
  console.log(`  cells: ${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', ')}`)
  console.log(`  ${LIGHTS.length} traffic lights, ${STOPBARS.length} stop bars, ${LAMPS.length} street lamps + ${RAMP_LAMPS.length} on the ramp wall, ${TREES.length} trees, ${GLOW.length} light blocks, ${LABELS.length} labels, ${GPS.nodes.length} GPS nodes, ${GPS.links.length} links`)
  for (const st of LAMP_STRIPS) console.log(`    lamps ${st.name}: ${LAMPS.filter(([x, z]) => (st.axis === 'x' ? z : x) === st.at && (st.axis === 'x' ? x : z) >= st.from && (st.axis === 'x' ? x : z) <= st.to).map(([x, z]) => st.axis === 'x' ? x : z).join(' ')}`)
  console.log(`  writes dropped outside the street columns: ${MISSED.length}${MISSED.length ? ' e.g. ' + JSON.stringify(MISSED.slice(0, 8)) : ''}`)
  // every block inside the city box and the module's own columns
  let bad = 0
  for (const k of b.blocks.keys()) { const [x, y, z] = k.split(',').map(Number); if (!own(x, y, z)) bad++ }
  console.log(`  blocks outside the street columns or the city box: ${bad}`)
  // open-sky road blocks at y 62..71 outside a road or line cell (3.3): park cells are the parking strip (asphalt, 3.1)
  const roadBlock = /^(black|gray|white|yellow)_concrete(_powder)?$/
  const top = new Map()
  for (const [k, s] of b.blocks) { const [x, y, z] = k.split(',').map(Number); if (/^air$|^light\[/.test(s)) continue; const kk = key(x, z); if (!top.has(kk) || top.get(kk)[0] < y) top.set(kk, [y, s]) }
  const offRoad = []
  for (const [kk, [y, s]] of top) { const [x, z] = kk.split(',').map(Number); const c = cellAt(x, z); if (y >= 62 && y <= 71 && roadBlock.test(s.replace(/\[.*$/, '')) && !(c && ['road', 'line', 'park', 'ramp'].includes(c.kind))) offRoad.push([x, y, z, s]) }
  console.log(`  open-sky road blocks off the streets' road cells: ${offRoad.length}${offRoad.length ? ' e.g. ' + JSON.stringify(offRoad.slice(0, 6)) : ''}`)
  // the GPS nodes the streets stand: a solid block (or the world's grass) under the feet, the feet and head clear
  const solid = s => s && !/^air$|^light\[|_slab\[type=bottom|iron_bars|_wall$|_leaves/.test(s)
  const feet = []
  for (const [id, x, y, z, name] of OWN_NODES) {
    const fx = Math.floor(x), fz = Math.floor(z)
    const under = b.get(fx, y - 1, fz) || (y - 1 === GROUND_Y ? 'grass_block' : null)
    const ok = solid(under) && !solid(b.get(fx, y, fz)) && !solid(b.get(fx, y + 1, fz))
    if (!ok) feet.push(`${id} ${name}: under=${under} feet=${b.get(fx, y, fz)} head=${b.get(fx, y + 1, fz)}`)
  }
  console.log(`  GPS nodes on the streets checked: ${OWN_NODES.length}, bad: ${feet.length}${feet.length ? '\n    ' + feet.join('\n    ') : ''}`)
  const ids = new Set(GPS.nodes.map(n => n[0])); ids.add(1002)
  const dangling = GPS.links.filter(([p, q]) => !ids.has(p) || !ids.has(q))
  console.log(`  GPS links to unknown nodes: ${dangling.length}`)
  const dir = opt('render', null)
  if (dir) {
    const path = require('path'), fs = require('fs')
    const R = require('../render.js')
    const px = Number(opt('px', 3))
    const views = opt('views', 'top,plan,iso').split(',')
    const ys = opt('y', '60,65,73').split(',').map(Number)
    const crop = opt('crop', null)
    const [x1, z1, x2, z2] = crop ? crop.split(',').map(Number) : [-1e9, -1e9, 1e9, 1e9]
    const rb = new (require('../mcstruct').Build)()
    for (const [k, s] of b.blocks) { const [x, , z] = k.split(',').map(Number); if (x >= x1 && x <= x2 && z >= z1 && z <= z2 && !/^(air|light\[)/.test(s)) rb.blocks.set(k, s) }
    if (args.includes('--ground')) { // the world's flat grass under the unset columns (not where the channel is carved)
      const gb = rb.bounds()
      for (let x = Math.max(x1, gb.x1); x <= Math.min(x2, gb.x2); x++) for (let z = Math.max(z1, gb.z1); z <= Math.min(z2, gb.z2); z++) if (!b.blocks.has(`${x},64,${z}`)) rb.blocks.set(`${x},64,${z}`, 'grass_block')
    }
    fs.mkdirSync(dir, { recursive: true })
    const name = opt('name', crop ? `streets-${crop.replace(/,/g, '_')}` : 'streets')
    const save = (suffix, img) => { const f = path.join(dir, `${name}-${suffix}.png`); fs.writeFileSync(f, img.png()); console.log(`wrote ${f} (${img.w}x${img.h})`) }
    if (views.includes('top')) save('top', R.top(rb, px))
    if (views.includes('plan')) for (const y of ys) save(`plan-y${y}`, R.plan(rb, y, px))
    if (views.includes('iso')) for (const d of (opt('iso', 'NE,SE,SW,NW')).split(',')) save(`iso-${d}`, R.iso(rb, d, Math.max(2, Math.round(px / 2))))
  }
}
