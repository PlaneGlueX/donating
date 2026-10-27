'use strict'
// The city's site plan preview (tools/build/city/PLAN.md): COMMON exactly as in the plan, then a painter.
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
  museum: [820, 296, 920, 400]   // the mesa (x 820..920, z 300..400, top y 72), the plaza, the terraces, the drain tunnel
}
const BUILDINGS = Object.keys(BOX)
// the heist regions [x1, y1, z1, x2, y2, z2] (section 7.1)
const REGION = {
  jewelry: [598, 56, 374, 634, 97, 414],
  bank: [595, 47, 280, 630, 102, 321],
  museum: [841, 60, 330, 898, 97, 371]
}
// owned by nobody: no module writes a block here (the base lot, the power plant strip, the casino blocks)
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
const RAMP = { x1: 830, x2: 894, z1: 402, z2: 409, curb: 401, wall: 410, top: 887 } // the ramp road up the mesa's south wall
const BANK_ST = { x1: 640, x2: 663, road: [643, 660], z1: 230 }   // north from the avenue to z 230
const SECOND = { z1: 340, z2: 355, road: [343, 352], x1: 490, x2: 787 }
const WEST_ST = { x1: 490, x2: 505, road: [493, 502], z1: 296 }   // north from the avenue to z 296
const HATCH_LANE = [506, 296, 559, 304]                            // polished andesite, into Hatch Plaza (bank module)
const CHAN = { x1: 776, x2: 930, z1: 280, z2: 295, floor: 59, mouth: [868, 870] } // the storm channel, walls at its edges
const LEG = { x1: 776, x2: 787, z1: 296, z2: 355 }                 // its west leg, up into 2nd Street

const rbD = (x, z) => Math.hypot(x + 0.5 - RB.cx, z + 0.5 - RB.cz)
const rampFeet = x => x >= RAMP.top ? 73 : 65 + Math.floor((x - RAMP.x1) / 8) // where feet stand on the ramp at column x
const legFloor = z => z <= 296 ? 59 : z >= 336 ? 64 : 59 + Math.floor((z - 296) / 8) // the leg's floor block
const drainFloor = z => 59 + Math.floor((z - 294) / 7) // the drain tunnel's floor block, z 296..329 (museum module)

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
  if (x >= LEG.x1 && x <= LEG.x2 && z >= LEG.z1 && z < SECOND.z1) {
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
  // Bank Street, 2nd Street, West Street (crossings are asphalt)
  const inBank = x >= BANK_ST.x1 && x <= BANK_ST.x2 && z >= BANK_ST.z1 && z < AVE.walk[0][0]
  const inSecond = z >= SECOND.z1 && z <= SECOND.z2 && x >= SECOND.x1 && x <= SECOND.x2
  const inWest = x >= WEST_ST.x1 && x <= WEST_ST.x2 && z >= WEST_ST.z1 && z < AVE.walk[0][0]
  if (inBank || inSecond || inWest) {
    const roadB = inBank && x >= BANK_ST.road[0] && x <= BANK_ST.road[1]
    const roadS = inSecond && z >= SECOND.road[0] && z <= SECOND.road[1]
    const roadW = inWest && x >= WEST_ST.road[0] && x <= WEST_ST.road[1]
    if (roadB || roadS || roadW) {
      const dashB = roadB && !inSecond && (x === 651 || x === 652) && z % 6 < 3
      const dashS = roadS && !inBank && !inWest && (z === 347 || z === 348) && x % 6 < 3
      return dashB || dashS ? { kind: 'line', top: 64, color: 'yellow' } : { kind: 'road', top: 64 }
    }
    const curb = (inBank && (x === 642 || x === 661)) || (inSecond && (z === 342 || z === 353)) || (inWest && (x === 492 || x === 503))
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
// ---- the preview: footprints [x1, z1, x2, z2, y, block] at their roof heights, then spots ---------------------------
const FOOT = [
  // Jewelry Store (section 4): the alley, the store's roof, the L-shaped hut, the east deck, the fire escape landing
  [598, 356, 639, 373, 64, 'polished_andesite'], [600, 376, 631, 411, 91, 'smooth_quartz'], [606, 377, 614, 397, 96, 'gray_terracotta'],
  [632, 389, 634, 393, 91, 'polished_andesite'], [598, 374, 631, 375, 74, 'iron_block'],
  // Bank (section 5): the front plaza, Hatch Plaza, the tower's roof
  [629, 280, 639, 321, 64, 'polished_andesite'], [560, 285, 590, 315, 64, 'polished_andesite'], [597, 282, 628, 319, 101, 'polished_deepslate'],
  // Museum (section 6): the mesa top, the plaza, the hall's roof, the wing roofs, the portico, the ladder towers
  [820, 300, 920, 400, 72, 'smooth_sandstone'], [841, 372, 898, 400, 72, 'polished_andesite'], [857, 331, 882, 364, 96, 'calcite'],
  [843, 339, 856, 361, 89, 'smooth_quartz'], [883, 339, 896, 361, 89, 'smooth_quartz'], [857, 365, 882, 371, 88, 'calcite'],
  [839, 349, 840, 351, 89, 'stone_bricks'], [899, 349, 900, 351, 89, 'stone_bricks']
]
const SPOTS = [
  [612, 417], [632, 413], [596, 417], [662, 417], [601, 360], [603, 360], [605, 360],           // jewelry: exit, holo, cops, bikes
  [636, 300], [633, 300], [662, 337], [662, 262], [565, 297], [565, 303], [574, 299],           // bank: exit, holo, cops, bikes, manhole
  [869, 380], [869, 373], [870, 388], [810, 430], [925, 350], [866, 290], [869, 290], [872, 290] // museum: exit, holo, cops, bikes
]
const COLOR = { jewelry: 'blue_wool', bank: 'green_wool', museum: 'yellow_wool', free: 'white_wool' }
const SURFACE = { road: 'black_concrete', walk: 'light_gray_concrete', curb: 'smooth_stone', island: 'grass_block', park: 'gray_concrete',
  ramp: 'black_concrete', rampwall: 'stone_bricks', lane: 'polished_andesite', chan: 'polished_andesite', wall: 'stone_bricks' }
module.exports = () => {
  const b = new (require('../mcstruct').Build)()
  const P = (x, y, z, s) => b.set(x, y, z, s)
  for (let x = CITY.x1; x <= CITY.x2; x++) for (let z = CITY.z1; z <= CITY.z2; z++) {
    const o = ownerOf(x, z)
    if (o === 'streets') {
      const c = streetCell(x, z)
      if (!c) { P(x, GROUND_Y, z, 'grass_block'); continue }
      P(x, c.top, z, c.kind === 'line' ? `${c.color}_concrete` : c.kind === 'park' && c.bay ? 'white_concrete' : SURFACE[c.kind])
      if (c.kind === 'wall' && !c.mouth) P(x, 65, z, 'iron_bars')
      continue
    }
    P(x, GROUND_Y, z, 'grass_block')
    const bx = o === 'free' ? KEEP_FREE.find(k => inBox(x, z, [k])) : BOX[o]
    if (x === bx[0] || x === bx[2] || z === bx[1] || z === bx[3]) P(x, 65, z, COLOR[o])
  }
  for (const [x1, z1, x2, z2, y, s] of FOOT) rect(x1, z1, x2, z2, (x, z) => P(x, y, z, s))
  for (const [x1, , z1, x2, , z2] of Object.values(REGION)) rect(x1, z1, x2, z2, (x, z) => { if (x === x1 || x === x2 || z === z1 || z === z2) P(x, 99, z, 'red_wool') })
  for (const [x, z] of SPOTS) P(x, 100, z, 'gold_block')
  const cr = (process.env.CROP || '').split(',').map(Number)
  if (cr.length === 4) for (const k of [...b.blocks.keys()]) { const [x, , z] = k.split(',').map(Number); if (x < cr[0] || x > cr[2] || z < cr[1] || z > cr[3]) b.blocks.delete(k) }
  return b
}
