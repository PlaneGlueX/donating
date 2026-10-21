'use strict'
// approach: the road from the prison to Mountainside (tools/build/town/PLAN.md section 3; region z 471..728, x 120..770).
// The prison's N-S road carried on past z 470, its taper from 36 to 24 wide, the climb (half a block every 4) into the
// ridge's cutting, the 64-block tunnel at y 70 with its two portals, the descent (half a block every 6) to the river, the
// bridge, the river's north branch from its culvert at x 739, the ridge's hollow hills, the welcome sign, a guide sign
// over the road, lamps, pines, oaks and grass. Every block goes through S(), clipped to the module's columns.
//   node tools/build/town/approach.js                    -> counts and bounds
//   node tools/build/town/approach.js --render <dir>     -> preview PNGs (tools/build/render.js views) in <dir>
// Also a build file for tools/build/render.js (the default export takes no argument).
// ---- COMMON (tools/build/town/PLAN.md section 9: copy verbatim into every town module) ----
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
  riverbed: [['sand', 55], ['gravel', 25], ['clay', 20]],
  bank: [['sand', 40], ['coarse_dirt', 35], ['red_sand', 25]],
  orange: [['red_sand', 50], ['coarse_dirt', 30], ['orange_terracotta', 20]] // Jailbreak's orange ground patches
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

// ---- the town's frame --------------------------------------------------------------------------------------------
const WORLD = 'jailbreak'
const TOWN = { x1: 120, z1: 471, x2: 770, z2: 1300, y1: 50, y2: 160 } // every block of the town lies in here
const TOWN_Z = 729   // z < 729: the approach module; z >= 729: the town
const WATER_Y = 60   // the river's and the lake's top water block
const LABEL_TAG = 'town_label', DISPLAY_TAG = 'town_display' // the tags of the town's text displays and item displays
// The building modules' column boxes [x1, z1, x2, z2] (all y). A street cell inside a box still belongs to the streets.
const PLOTS = {
  H1: [299, 866, 365, 925], H2: [299, 926, 365, 985], H3: [299, 1009, 365, 1057], H4: [366, 1009, 432, 1057],
  H5: [299, 1058, 365, 1106], H6: [366, 1058, 432, 1106], H7: [212, 948, 276, 1000], H8: [212, 1004, 276, 1056],
  H9: [212, 1060, 276, 1112], H10: [264, 1135, 326, 1170], H11: [300, 1205, 375, 1250], H12: [349, 1135, 413, 1170]
}
const BOX = {
  gunshop: [[465, 730, 556, 842]],
  donut: [[386, 730, 432, 842]],
  garage: [[300, 730, 385, 842]],
  gas: [[366, 865, 432, 986]],
  shops: [[465, 865, 556, 986]],
  dealer: [[465, 1009, 556, 1106]],
  safehouse: [[212, 880, 276, 944]],
  scrapyard: [[579, 1012, 662, 1100]],
  houses: Object.values(PLOTS)
}
const BUILDINGS = Object.keys(BOX)

// ---- streets (z >= 729; the approach road and the bridge are the approach module's) ----------------------------------
// Straight streets: the asphalt cells, the axis traffic runs along, the sidewalk width, and the lines: a cell is yellow
// (white) when its centre is `yellow` (`white`) blocks from the asphalt's centre line.
const STREETS = [
  { id: 'main', name: 'Main Street', x1: 437, z1: 729, x2: 460, z2: 1109, axis: 'z', walk: 4, yellow: 0.5, white: 10.5 },
  { id: 'first', name: '1st Street', x1: 312, z1: 846, x2: 543, z2: 861, axis: 'x', walk: 3, yellow: 0.5, white: 6.5 },
  { id: 'second', name: '2nd Street', x1: 296, z1: 990, x2: 559, z2: 1005, axis: 'x', walk: 3, yellow: 0.5, white: 6.5 },
  { id: 'hill', name: 'Hill Road', x1: 312, z1: 1110, x2: 543, z2: 1125, axis: 'x', walk: 3, yellow: 0.5, white: 6.5 },
  { id: 'elm', name: 'Elm Road', x1: 280, z1: 878, x2: 295, z2: 1093, axis: 'z', walk: 3, yellow: 0.5, white: 6.5 },
  { id: 'east', name: 'East Street', x1: 560, z1: 878, x2: 575, z2: 1093, axis: 'z', walk: 3, yellow: 0.5, white: 6.5 },
  { id: 'birch', name: 'Birch Court', x1: 330, z1: 1126, x2: 345, z2: 1186, axis: 'z', walk: 3, yellow: 0.5, white: null }
]
// The loop's four rounded corners: the arc's centre and its quadrant (sx, sz: the side of the centre it lies on).
// Asphalt where the distance r from the centre is 16..32 (centre line at 24), sidewalks 13..16 and 32..35.
const CORNERS = [{ cx: 312, cz: 878, sx: -1, sz: -1 }, { cx: 544, cz: 878, sx: 1, sz: -1 },
  { cx: 312, cz: 1094, sx: -1, sz: 1 }, { cx: 544, cz: 1094, sx: 1, sz: 1 }]
const CORNER = { r: 24, half: 8, walk: 3 }
const CIRCLE = { cx: 338, cz: 1186, r: 16, walk: 3 } // Birch Court's turning circle: asphalt r < 16, sidewalk 16..19
// Curb cuts [x1, z1, x2, z2]: sidewalk cells with no curb slab where a lot or a driveway meets the street (the module
// behind paves its side right up to the sidewalk there).
const DRIVEWAYS = [
  [433, 744, 436, 757], // donut: the lot (Main, west side)
  [433, 868, 436, 879], [433, 952, 436, 963], // gas station forecourt in and out
  [461, 744, 464, 757], // gun shop lot (Main, east side)
  [461, 1020, 464, 1031], [461, 1080, 464, 1091], // dealer lot
  [330, 843, 375, 845], [388, 843, 399, 845], // town garage apron, donut west strip (1st Street, north side)
  [520, 862, 533, 864], [520, 987, 533, 989], [557, 920, 559, 933], // the shops' rear lot (1st, 2nd, East Street)
  [576, 1050, 578, 1057], // scrap yard gate (East Street, east side)
  [296, 905, 298, 909], [296, 961, 298, 965], // H1, H2 (Elm Road, east side)
  [338, 1006, 342, 1008], [403, 1006, 407, 1008], // H3, H4 (2nd Street, south side)
  [338, 1107, 342, 1109], [387, 1107, 391, 1109], // H5, H6 (Hill Road, north side)
  [277, 932, 279, 936], [277, 982, 279, 986], [277, 1038, 279, 1042], [277, 1066, 279, 1070], // safehouse, H7, H8, H9
  [327, 1165, 329, 1169], [336, 1202, 340, 1204], [346, 1165, 348, 1169] // H10, H11, H12 (Birch Court)
]
// What a column of the street network is: null, or { kind: 'asphalt' | 'walk', line: 'yellow' | 'white' | null, street }.
// Asphalt wins over a sidewalk; a cell in two streets' asphalt (a junction) has no line. Pure: no blocks are read.
function streetCell (x, z) {
  if (z < TOWN_Z) return null
  const px = x + 0.5, pz = z + 0.5
  let asph = null, n = 0, walk = null
  for (const s of STREETS) {
    const inX = x >= s.x1 && x <= s.x2, inZ = z >= s.z1 && z <= s.z2
    if (inX && inZ) {
      n++
      const o = s.axis === 'z' ? Math.abs(px - (s.x1 + s.x2 + 1) / 2) : Math.abs(pz - (s.z1 + s.z2 + 1) / 2)
      asph = { kind: 'asphalt', line: o === s.yellow ? 'yellow' : o === s.white ? 'white' : null, street: s.id }
    } else if (!walk && (s.axis === 'z' ? inZ : inX)) {
      const d = s.axis === 'z' ? (x < s.x1 ? s.x1 - x : x - s.x2) : (z < s.z1 ? s.z1 - z : z - s.z2)
      if (d >= 1 && d <= s.walk) walk = { kind: 'walk', line: null, street: s.id }
    }
  }
  for (const c of CORNERS) {
    const dx = px - c.cx, dz = pz - c.cz
    if (dx * c.sx < 0 || dz * c.sz < 0) continue
    const o = Math.hypot(dx, dz) - CORNER.r, f = Math.floor(o)
    if (o >= -CORNER.half && o < CORNER.half) { n++; asph = { kind: 'asphalt', line: f === -1 || f === 0 ? 'yellow' : f === -7 || f === 6 ? 'white' : null, street: 'corner' } }
    else if (!walk && Math.abs(o) < CORNER.half + CORNER.walk) walk = { kind: 'walk', line: null, street: 'corner' }
  }
  const rc = Math.hypot(px - CIRCLE.cx, pz - CIRCLE.cz)
  if (rc < CIRCLE.r) { n++; asph = { kind: 'asphalt', line: null, street: 'birch' } } else if (!walk && rc < CIRCLE.r + CIRCLE.walk) walk = { kind: 'walk', line: null, street: 'birch' }
  if (asph) { if (n > 1) asph.line = null; return asph }
  return walk
}
const SC = new Int8Array((TOWN.x2 - TOWN.x1 + 1) * (TOWN.z2 - TOWN.z1 + 1)) // 0 unknown, 1 no street, 2 street
const inStreet = (x, z) => {
  if (x < TOWN.x1 || x > TOWN.x2 || z < TOWN.z1 || z > TOWN.z2) return false
  const i = (x - TOWN.x1) * (TOWN.z2 - TOWN.z1 + 1) + (z - TOWN.z1)
  if (!SC[i]) SC[i] = streetCell(x, z) ? 2 : 1
  return SC[i] === 2
}
const inDriveway = (x, z) => DRIVEWAYS.some(([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2)
// Which module owns a column: 'approach', 'streets', a building module, or 'land' (everything else in the town).
const inBox = (x, z, boxes) => boxes.some(([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2)
const ownerOf = (x, z) => {
  if (x < TOWN.x1 || x > TOWN.x2 || z < TOWN.z1 || z > TOWN.z2) return null
  if (z < TOWN_Z) return 'approach'
  if (inStreet(x, z)) return 'streets'
  for (const m of BUILDINGS) if (inBox(x, z, BOX[m])) return m
  return 'land'
}
const ownFor = mod => (x, y, z) => y >= TOWN.y1 && y <= TOWN.y2 && ownerOf(x, z) === mod

// ---- the approach road (z 471..728) ----------------------------------------------------------------------------------
// Its surface in half blocks over y 64: L 0 = the road block at y 64; L even = the road block at y 64 + L/2; L odd = a
// bottom slab at y 65 + (L-1)/2 on a full block. Half a block up every 4 blocks (z 503..550), level in the tunnel
// (L 12, z 551..614: the road block at y 70), half a block down every 6 blocks (z 615..686), level over the bridge.
const approachLevel = z => z <= 502 ? 0 : z <= 550 ? Math.floor((z - 503) / 4) + 1 : z <= 614 ? 12 : z <= 686 ? 11 - Math.floor((z - 615) / 6) : 0
const levelTop = L => ({ full: 64 + Math.floor(L / 2), slab: L % 2 === 1, stand: 65 + L / 2 }) // stand: where feet are
const TUNNEL = { z1: 551, z2: 614, x1: 434, x2: 463, floor: 70 } // the tunnel's inside (walls x 432..433 and 464..465)
// The approach's cross-section outside the tunnel (x ranges): the road (lines as Main Street: white 438 and 459, yellow
// 448 and 449), walkways, verges, the cutting's retaining walls. The bridge carries road and walkways over z 686..728.
const APPROACH = { road: [437, 460], walk: [[433, 436], [461, 464]], verge: [[431, 432], [465, 466]], wall: [[429, 430], [467, 468]] }
const BRIDGE = { z1: 686, z2: 728 }

// ---- the river and the lake (shared by approach and land) ----------------------------------------------------------
// The north branch (x 270..745, z <= 728) is generated from NORTH, the straight line it used to be: a point [x, z, half]
// every 8 blocks, swinging up to 8 off that line with a half-width of 10..15 (northBend). It stays straight with half 13
// under the bridge (|x + 0.5 - 449| <= 40), at the culvert (x 712 on) and into the bend (x 290 and west), and its south
// bank never reaches z 729 (west of x 540 never past the straight line's: the town's lots keep their grass). From the bend
// on it's [x, z] points with riverHalf(z), and the west branch meanders (z 856 on: [x, z, half], half 11..13) westward
// only: its east bank stays at x 207 or less (x + half <= 201), clear of the safehouse and the plots at x 212.
const NORTH = [[745, 701], [640, 704], [540, 707], [449, 708], [350, 706], [270, 711]]
const smooth01 = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t)
const northZ = x => { for (let i = 1; i < NORTH.length; i++) { const [ax, az] = NORTH[i - 1], [bx, bz] = NORTH[i]; if (x >= bx) return az + (bz - az) * (ax - x) / (ax - bx) } return NORTH[NORTH.length - 1][1] }
const northBend = x => {
  const env = smooth01((x - 290) / 40) * smooth01((712 - x) / 32) * smooth01((Math.abs(x + 0.5 - 449) - 40) / 30)
  const lim = x < 540 ? 0 : (709.5 - northZ(x)) * smooth01((x - 540) / 60) // how far the south edge may pass the line's
  let m = 8 * Math.sin(2 * Math.PI * (x - 237) / 150), w = 12.5 + 2.5 * Math.sin(2 * Math.PI * (x - 300) / 105)
  const ex = m + w - 13 - lim // past the limit: narrower first, then farther north
  if (ex > 0) { const dw = Math.min(ex, w - 10); w -= dw; m -= ex - dw }
  return [x, northZ(x) + env * m, 13 + env * (w - 13)]
}
const RIVER = [...Array.from({ length: 60 }, (_, i) => northBend(745 - 8 * i)), [270, 711, 13], [228, 728], [203, 760],
  [191, 800], [190, 856, 11], [180, 905, 12], [186, 960, 11], [176, 1010, 13], [184, 1065, 11], [178, 1120, 12],
  [188, 1170, 11], [192, 1196, 11]]
const LAKE = { cx: 192, cz: 1240, rx: 60, rz: 46 }
const riverHalf = z => z <= 740 ? 13 : z >= 790 ? 11 : 13 - 2 * (z - 740) / 50 // half-width of the water
const BANK = 6, BEACH = 14
const RIVER_END_X = 739 // the river comes out of a culvert in the hill: no river east of x 739 (the headwall is x 739..741)
const segT = (px, pz, a, b) => { const vx = b[0] - a[0], vz = b[1] - a[1]
  return Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / (vx * vx + vz * vz))) }
const segD = (px, pz, a, b) => { const t = segT(px, pz, a, b); return Math.hypot(px - a[0] - t * (b[0] - a[0]), pz - a[1] - t * (b[1] - a[1])) }
// How far a point lies outside the river's water (<= 0 in it): the least, over the segments, of the distance minus the
// half-width there (a [x, z, half] segment's own, else riverHalf).
const riverE = (px, pz) => { let e = Infinity
  for (let i = 1; i < RIVER.length; i++) {
    const a = RIVER[i - 1], b = RIVER[i], t = segT(px, pz, a, b)
    const w = a.length > 2 && b.length > 2 ? a[2] + t * (b[2] - a[2]) : riverHalf(pz)
    e = Math.min(e, Math.hypot(px - a[0] - t * (b[0] - a[0]), pz - a[1] - t * (b[1] - a[1])) - w)
  }
  return e }
// The same for the lake (<= 0 in it): an ellipse whose radius wobbles round the shore (up to about 11% in or out), so the
// lake isn't a perfect oval.
const lakeE = (px, pz) => { const u = (px - LAKE.cx) / LAKE.rx, v = (pz - LAKE.cz) / LAKE.rz, a = Math.atan2(v, u)
  return (Math.hypot(u, v) - 1 - 0.07 * Math.sin(3 * a + 1) - 0.04 * Math.sin(5 * a + 2)) * Math.min(LAKE.rx, LAKE.rz) }
// A column of the river or the lake: null (dry land), { water: true, bed } (the bed block at y bed, water from bed + 1 to
// WATER_Y, air above to y 64), or { water: false, top, beach } (a bank or the beach: its top block at y top, air above).
function riverAt (x, z) {
  const px = x + 0.5, pz = z + 0.5
  if (px < 110 || px > RIVER_END_X || pz < 664 || pz > 1300) return null
  let e = riverE(px, pz)
  const el = lakeE(px, pz)
  const lake = el < e
  if (lake) e = el
  if (e <= 0) return { water: true, bed: WATER_Y - 2 - Math.min(3, Math.floor(-e / 4)) }
  const beach = lake && px > LAKE.cx - 10 && pz > LAKE.cz - 30
  const w = beach ? BEACH : BANK
  if (e > w) return null
  return { water: false, top: Math.min(64, WATER_Y + Math.ceil(4 * e / w)), beach }
}
// How far a column is beyond the river's banks (0 on a bank or in the water): hills keep h <= dryD - 2 near the river.
// Behind the culvert (x 742 on) it rises 1:1 from the river's end, plus CULVERT_RISE behind the headwall (z 685..717) and
// its wings (z 681..684, 718..721), so the hill there meets their top instead of leaving a ditch behind them.
const CULVERT_RISE = z => z >= 685 && z <= 717 ? 7 : z >= 681 && z <= 684 ? z - 678 : z >= 718 && z <= 721 ? 724 - z : 0
const dryD = (x, z) => { const px = x + 0.5, pz = z + 0.5; let e = Infinity
  if (px > RIVER_END_X + 3) return dryD(RIVER_END_X + 2, z) + (x - RIVER_END_X - 2) + CULVERT_RISE(z) // behind the culvert
  e = riverE(px, pz) - BANK
  const el = lakeE(px, pz) - BEACH
  return Math.max(0, Math.min(e, el)) }

// ---- terrain helpers (approach and land) -----------------------------------------------------------------------------
// A dome hill [cx, cz, r, H]: H blocks over y 64 at its centre, 0 at radius r.
const dome = (x, z, p) => { const t = Math.hypot(x + 0.5 - p[0], z + 0.5 - p[1]) / p[2]; return t >= 1 ? 0 : Math.round(p[3] * Math.pow(1 - t * t, 1.3)) }
const CLIFF = ['orange_terracotta', 'smooth_red_sandstone', 'orange_terracotta', 'red_sandstone', 'orange_terracotta', 'smooth_red_sandstone']
// One hill column as a closed shell: blocks from max(65, minN - 2) up to top (minN = the lowest of the 4 neighbours'
// tops; the inside of a big hill stays air, unseen). Grass on top, dirt under it; wherever the column stands 2+ above a
// neighbour its exposed blocks are banded salmon orange (Jailbreak's cliffs). rim (hill(): a real cliff's top, or near a
// riser) gives it orange ground on top instead: red sand, a quarter orange terracotta, coarse dirt where red sand would
// sit over air (only a column 2+ under all its neighbours has nothing under its top). S = the clipped setter.
function hillColumn (S, x, z, top, minN, rim = top - minN >= 4) {
  const held = top - 1 <= 64 || top - 1 >= Math.max(65, minN - 2)
  for (let y = Math.max(65, minN - 2); y <= top; y++) {
    let s
    if (y === top) { s = !rim ? 'grass_block' : h(x, y, z) < 75 ? 'red_sand' : 'orange_terracotta'; if (s === 'red_sand' && !held) s = 'coarse_dirt' }
    else if (y > minN) s = CLIFF[Math.floor(y / 3) % CLIFF.length]
    else s = y >= top - 3 ? 'dirt' : 'stone'
    S(x, y, z, s)
  }
}
// Jailbreak's orange ground: ragged blobs of red sand and coarse dirt in the grass (true = this column is one).
const orangeAt = (x, z) => {
  const gx = Math.floor(x / 24), gz = Math.floor(z / 24)
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const cx = gx + i, cz = gz + j
    if (h(cx, 11, cz) >= 22) continue
    const ox = cx * 24 + h(cx, 12, cz) % 24, oz = cz * 24 + h(cx, 13, cz) % 24, r = 3 + h(cx, 14, cz) % 6
    if (Math.hypot(x - ox, (z - oz) * 1.6) < r + (h(x, 15, z) % 3) - 1) return true
  }
  return false
}

// ---- terrain heights: the ONE height of every hill column, for the approach and the land module alike -----------------
// groundTop(x, z) = blocks over y 64 (0 = the world's own flat grass). Each module builds its hill columns with
// hill(S, x, z), which takes minN from groundTop() of the 4 neighbours whichever module owns them, so a hollow hill always
// closes across a module's edge (z 728/729 above all). Pure and memoized; reads no blocks.
const RIDGE = [[449, 582, 95, 34], [565, 566, 115, 44], [345, 596, 100, 30], [668, 612, 85, 26], [748, 668, 55, 22],
  [258, 616, 75, 16], [175, 650, 55, 10]] // R1..R7: the ridge between the prison and the town (section 3.4)
// E2, E4, W1, W2 and S1 fit inside the town's box (2026-10-20: cut by its edge they ended in straight 1:1 ramps, which
// will show once the map grows past it).
const HILLS = [[660, 800, 70, 26], [700, 870, 70, 30], [650, 930, 60, 20], [715, 985, 55, 24], [700, 760, 60, 18],
  [500, 1186, 50, 20], [152, 900, 32, 12], [150, 1060, 30, 14], [420, 1258, 42, 10]] // E1..E5, T1, W1, W2, S1 (section 5)
const T1_TOP = { cx: 500, cz: 1186, r: 10, h: 20 } // the water tower hill's flat top: ground y 84
const STAIRS = [498, 1129, 500, 1176] // the water tower's stair path [x1, z1, x2, z2]: its own even climb, 20 up over 48
const KEEP_FREE = [[600, 1110, 770, 1300], [120, 843, 311, 864]] // the volcano's site; the future north-west road (flat)
const PAD = [469, 674, 479, 686] // the welcome sign's levelled pad (section 3.7)
const PORTAL_N = 548, PORTAL_S = 617 // the portals' outer faces (headwalls z 548..550 and 615..617)
const standY = z => 65 + approachLevel(z) / 2 // where feet are on the approach road
const portalD = z => z < PORTAL_N ? PORTAL_N - z : z > PORTAL_S ? z - PORTAL_S : 0
const inCutting = z => (z >= 485 && z < PORTAL_N) || (z > PORTAL_S && z <= 686)
// The cutting's cap (a y): 4 over the walkway, rising 2 a block over the last 14 blocks before a portal, so the retaining
// walls and the hill behind them climb into the headwall with no step.
const capY = z => Math.floor(standY(z)) + 4 + 2 * Math.max(0, 14 - portalD(z))
let BUILT = null // steps (4-connected) from each town column to the nearest street, building box or the north-west strip
const builtD = (x, z) => {
  const W = TOWN.x2 - TOWN.x1 + 1, D = TOWN.z2 - TOWN.z1 + 1
  if (!BUILT) {
    BUILT = new Int16Array(W * D).fill(32767); const q = new Int32Array(W * D); let n = 0
    for (let i = TOWN.x1; i <= TOWN.x2; i++) for (let k = TOWN.z1; k <= TOWN.z2; k++) {
      const o = ownerOf(i, k)
      if ((o !== 'land' && o !== 'approach') || inBox(i, k, [KEEP_FREE[1]])) { const j = (i - TOWN.x1) * D + (k - TOWN.z1); BUILT[j] = 0; q[n++] = j }
    }
    for (let r = 0; r < n; r++) {
      const j = q[r], i = Math.floor(j / D), k = j % D, d = BUILT[j] + 1
      if (i > 0 && BUILT[j - D] > d) { BUILT[j - D] = d; q[n++] = j - D }
      if (i < W - 1 && BUILT[j + D] > d) { BUILT[j + D] = d; q[n++] = j + D }
      if (k > 0 && BUILT[j - 1] > d) { BUILT[j - 1] = d; q[n++] = j - 1 }
      if (k < D - 1 && BUILT[j + 1] > d) { BUILT[j + 1] = d; q[n++] = j + 1 }
    }
  }
  return BUILT[(x - TOWN.x1) * D + (z - TOWN.z1)]
}
// A smooth field 0..1 (bilinear over a c x c grid of hashed values, smoothstepped): wide, gentle variation, never a bump.
const fieldN = (x, z, c, salt) => { const gx = Math.floor(x / c), gz = Math.floor(z / c), fx = smooth01(x / c - gx), fz = smooth01(z / c - gz)
  const v = (i, j) => h(gx + i, salt, gz + j) / 99
  return (v(0, 0) * (1 - fx) + v(1, 0) * fx) * (1 - fz) + (v(0, 1) * (1 - fx) + v(1, 1) * fx) * fz }
// The ridge's foot on the prison's side: 0 at z 482 (to 487 along a slow wave in x, so its contours don't run parallel
// to the prison's fence), then 0.6 a block (a 1:1 ramp read as one straight bank from the prison).
const ridgeFoot = (x, z) => Math.floor(0.6 * (z - 482) - 1.5 + 1.5 * Math.sin(x / 19 + 0.7) * Math.cos(x / 53))
function groundCalc (x, z) {
  if (z < 482 || riverAt(x, z) || inBox(x, z, KEEP_FREE) || inBox(x, z, [PAD])) return 0
  if (inBox(x, z, [STAIRS])) return Math.min(T1_TOP.h, Math.floor((z - STAIRS[1] + 1) * T1_TOP.h / 48))
  const tunnel = z >= PORTAL_N && z <= PORTAL_S && x >= 424 && x <= 473 // over the tunnel, its headwalls and their ends
  if (!tunnel && z <= 728 && x >= 429 && x <= 468) return 0 // the approach road's corridor: approach builds it itself
  let t = 0
  for (const p of RIDGE) t = Math.max(t, dome(x, z, p))
  for (const p of HILLS) t = Math.max(t, dome(x, z, p))
  if (t > 0) { // the ridge (z < 709; none on the town's side): wavy contours and a wandering terrace line, not rings
    const k = smooth01((TOWN_Z - 20 - z) / 20)
    t = Math.round(t + k * 4 * (fieldN(x, z, 48, 61) - 0.5) * Math.min(1, t / 8))
    if (t > 10 + Math.round(k * 6 * (fieldN(x, z, 40, 62) - 0.5))) t -= t % 2 // even terraces: steps of 2 with cliff bands
  }
  if (Math.hypot(x + 0.5 - T1_TOP.cx, z + 0.5 - T1_TOP.cz) <= T1_TOP.r) t = T1_TOP.h
  if (tunnel) t = Math.max(t, 26) // the cover over the tunnel's lining reaches y 90
  t = Math.min(t, ridgeFoot(x, z), x - TOWN.x1, TOWN.x2 - x, TOWN.z2 - z, Math.floor(dryD(x, z)) - 2, builtD(x, z) - 3)
  if (inCutting(z) && (x < 429 || x > 468)) t = Math.min(t, capY(z) - 64 + (x < 429 ? 429 - x : x - 468))
  return Math.max(0, t)
}
let GT = null
const groundTop = (x, z) => {
  if (x < TOWN.x1 || x > TOWN.x2 || z < TOWN.z1 || z > TOWN.z2) return 0
  const D = TOWN.z2 - TOWN.z1 + 1, j = (x - TOWN.x1) * D + (z - TOWN.z1)
  if (!GT) GT = new Int16Array((TOWN.x2 - TOWN.x1 + 1) * D).fill(-1)
  if (GT[j] < 0) GT[j] = groundCalc(x, z)
  return GT[j]
}
// A riser: a hill column standing 2+ over its lowest neighbour (a terrace's or a cliff's edge).
const riserAt = (x, z) => { const t = groundTop(x, z)
  return t > 0 && t - Math.min(groundTop(x + 1, z), groundTop(x - 1, z), groundTop(x, z + 1), groundTop(x, z - 1)) >= 2 }
// Jailbreak's orange ground hugs its cliffs: a column within 2 steps (4-connected) of a riser, inside fieldN's
// coherent patches (about half the ground near the risers: with every one of them orange, a dome's steep side read as
// solid orange rings).
const nearRiser = (x, z) => { if (fieldN(x, z, 14, 47) < 0.5) return false
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.abs(dx) + Math.abs(dz) <= 2 && riserAt(x + dx, z + dz)) return true
  return false }
// One hill column (false where groundTop is 0). Not for the portals' headwalls and wing walls, the cutting's walls or the
// stair path: those are built solid from y 65 to 64 + groundTop by their own code.
function hill (S, x, z) {
  const t = groundTop(x, z)
  if (t <= 0) return false
  const n = Math.min(groundTop(x + 1, z), groundTop(x - 1, z), groundTop(x, z + 1), groundTop(x, z - 1))
  hillColumn(S, x, z, 64 + t, 64 + n, t - n >= 4 || nearRiser(x, z))
  return true
}
// The y of the top block of the cutting's retaining walls (x 429..430 west, 467..468 east; inCutting(z) only): as high as
// the hill beside them, at least 1 over the walkway, never above capY.
const retainY = (z, west) => Math.max(Math.floor(standY(z)) + 1, Math.min(capY(z), 64 + groundTop(west ? 428 : 469, z)))

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

// ---------------------------------------------------------------------------------------------------------------------
const MOD = 'approach'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, s) }
const G = (x, y, z) => B.get(x, y, z)
// Trees and plants: only into empty cells above the column's ground (a tree never replaces terrain, road or a building;
// a trunk may replace a tree's own leaves).
const T = (x, y, z, s) => {
  if (!own(x, y, z) || y <= 64 + groundTop(x, z)) return
  const o = G(x, y, z)
  if (o && !/_leaves\[/.test(o)) return
  B.set(x, y, z, s)
}
const R = { set: S } // COMMON's door and bed write through S

// ---- the approach's own geometry (pure) --------------------------------------------------------------------------
const PORTAL_X1 = 418, PORTAL_X2 = 479 // the headwalls and their wing walls
const isPortalZ = z => (z >= PORTAL_N && z <= PORTAL_N + 2) || (z >= PORTAL_S - 2 && z <= PORTAL_S)
const isPortalCol = (x, z) => isPortalZ(z) && x >= PORTAL_X1 && x <= PORTAL_X2
const FACE_ROW = z => z === PORTAL_N || z === PORTAL_S // the headwalls' outer faces
// The bore: the inside's top over the road block is 8 + 4 sqrt(1 - (u/15)^2), u = |x + 0.5 - 449| (8 at the walls, 12 in
// the middle).
const VAULT = new Map()
for (let x = TUNNEL.x1; x <= TUNNEL.x2; x++) VAULT.set(x, TUNNEL.floor + Math.round(8 + 4 * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - 449) / 15) ** 2))))
const inBore = (x, y) => x >= TUNNEL.x1 && x <= TUNNEL.x2 && y > TUNNEL.floor && y <= VAULT.get(x)
const nearBore = (x, y) => { for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (inBore(x + dx, y + dy)) return true; return false }
const touchesBore = (x, y) => inBore(x + 1, y) || inBore(x - 1, y) || inBore(x, y + 1) || inBore(x, y - 1)
const BORE_TOP = Math.max(...VAULT.values()) + 2 // the lining's highest block (y 84)

// What an approach road cell is, z 471..685 outside the tunnel zone: null, or { k: 'road'|'walk'|'curb'|'verge'|'wall',
// line: 'yellow'|'white'|null }. The bridge (z 686..728) and the tunnel zone (z 548..617) are built by their own code.
const ROAD = (line = null) => ({ k: 'road', line })
const dash = z => ((z % 6) + 6) % 6 < 3
function roadCell (x, z) {
  if (z <= 478) { // the prison's own pattern carried on (outdoors.js roads())
    if (x < 431 || x > 466) return null
    if (x === 448 || x === 449) return ROAD('yellow')
    if (x === 432 || x === 465 || ((x === 440 || x === 457) && dash(z))) return ROAD('white')
    return ROAD()
  }
  const wall = inCutting(z) && ((x >= APPROACH.wall[0][0] && x <= APPROACH.wall[0][1]) || (x >= APPROACH.wall[1][0] && x <= APPROACH.wall[1][1]))
  if (z <= 502) { // the taper, 36 wide to 24 (k = 1..6 a side)
    const k = Math.min(6, Math.ceil((z - 478) / 4)), a = 431 + k, b = 466 - k
    if (x >= a && x <= b) {
      if (x === 448 || x === 449) return ROAD('yellow')
      if (x === a + 1 || x === b - 1) return ROAD('white')
      if (z <= 486 && (x === 440 || x === 457) && dash(z)) return ROAD('white')
      return ROAD()
    }
    if (x >= 433 && x <= 464) return { k: x === a - 1 || x === b + 1 ? 'curb' : 'walk' }
    if (x >= 431 && x <= 466) return { k: 'verge' }
    return wall ? { k: 'wall' } : null
  }
  const [r1, r2] = APPROACH.road
  if (x >= r1 && x <= r2) return ROAD(x === 448 || x === 449 ? 'yellow' : x === r1 + 1 || x === r2 - 1 ? 'white' : null)
  if (x >= APPROACH.walk[0][0] && x <= APPROACH.walk[1][1]) return { k: x === r1 - 1 || x === r2 + 1 ? 'curb' : 'walk' }
  if (x >= APPROACH.verge[0][0] && x <= APPROACH.verge[1][1]) return { k: 'verge' }
  return wall ? { k: 'wall' } : null
}

// One surface cell at level L (PLAN 3.1): odd L is a bottom slab on a full block. Everything under it from y 65 is
// solid (stone, dirt for the top 3), because the hill shells beside the road are hollow. A curb is half a block over its
// walkway: a bottom slab on an even level, a full block on an odd one.
// The climb and the descent (z 503..550, 615..686: every slab row lies in them) are surfaced so a full row and a slab row
// are the same block family and read as one road from a car: the road blackstone 55 / polished blackstone 45 (no black
// concrete: it has no slab and showed as black squares), the yellow line bamboo planks under bamboo slabs, the white line
// smooth quartz under smooth quartz slabs, the walkway's slab rows plain stone slabs (smooth stone slabs are lighter than
// the walkway's light gray concrete: a stripe every 4-6 rows). The flat stretches, the tunnel and the bridge deck keep
// their black concrete; each of the four seams (z 497..502, 551..556, 609..614, 687..692) blends one into the other
// over 6 rows, a cell at a time (slopeShare: the share of cells that take the slope's blocks).
const SLAB = { white: 'smooth_quartz_slab[type=bottom]', yellow: 'bamboo_slab[type=bottom]', walk: 'stone_slab[type=bottom]' }
const SLOPE = { full: [['blackstone', 55], ['polished_blackstone', 45]],
  slab: [['blackstone_slab[type=bottom]', 55], ['polished_blackstone_slab[type=bottom]', 45]],
  line: { yellow: 'bamboo_planks', white: 'smooth_quartz' } }
const FLAT_LINE = { yellow: 'yellow_concrete', white: 'white_concrete' }
const onSlope = z => (z >= 503 && z <= 550) || (z >= 615 && z <= 686)
const slopeShare = z => onSlope(z) ? 1 : z >= 497 && z <= 502 ? (z - 496) / 7 : z >= 551 && z <= 556 ? (557 - z) / 7
  : z >= 609 && z <= 614 ? (z - 608) / 7 : z >= 687 && z <= 692 ? (693 - z) / 7 : 0
const slopeCell = (x, z) => h(x, 77, z) < 100 * slopeShare(z) // this cell takes the slope's blocks
function fillUnder (x, z, top) { for (let y = 65; y < top; y++) S(x, y, z, y >= top - 3 ? 'dirt' : 'stone') }
function lay (x, z, L, c, mix = MIX.asphalt) {
  const t = levelTop(L), sl = slopeCell(x, z)
  fillUnder(x, z, t.full)
  if (c.k === 'road') {
    S(x, t.full, z, c.line ? (sl ? SLOPE.line : FLAT_LINE)[c.line] : pick(x, t.full, z, sl ? SLOPE.full : mix))
    if (t.slab) S(x, t.full + 1, z, c.line ? SLAB[c.line] : pick(x, t.full + 1, z, SLOPE.slab))
  } else if (c.k === 'walk' || c.k === 'curb') {
    S(x, t.full, z, 'light_gray_concrete')
    if (c.k === 'curb') S(x, t.full + 1, z, t.slab ? 'smooth_stone' : 'smooth_stone_slab[type=bottom]')
    else if (t.slab) S(x, t.full + 1, z, SLAB.walk)
  } else if (c.k === 'verge') S(x, t.full, z, 'grass_block') // the verge steps a whole block every 8: never over the walk
}

// ---- the road from z 471 to the bridge (PLAN 3.1, 3.2) -----------------------------------------------------------------
// The cutting's retaining walls (x 429..430, 467..468): stone brick up to wallTop with a smooth stone cap, a smooth stone
// pilaster on the road face every 12 blocks. wallTop is retainY's running maximum from the cutting's far end (z 485, 686)
// toward the portal, so the wall never dips before the headwall (where the hill behind it is 2 lower it stands as a
// parapet). The cap is a bottom slab, or a full block where the next row toward the portal is 2 or more higher.
const WALL_TOP = new Map()
const wallTop = (z, west) => {
  const k = `${z},${west}`
  if (!WALL_TOP.has(k)) {
    let m = -Infinity
    if (z < PORTAL_N) for (let i = 485; i <= z; i++) m = Math.max(m, retainY(i, west))
    else for (let i = z; i <= BRIDGE.z1; i++) m = Math.max(m, retainY(i, west))
    WALL_TOP.set(k, m)
  }
  return WALL_TOP.get(k)
}
// The last 6 rows before each portal (z 542..547, 618..623) stand full height, their smooth stone cap level with the
// headwall's cornice (portalTop, y 94): the face's frame instead of a wall climbing into it 2 a row.
const wallEnd = z => (z >= PORTAL_N - 6 && z < PORTAL_N) || (z > PORTAL_S && z <= PORTAL_S + 6)
function retain (x, z) {
  const west = x < 449, end = wallEnd(z), top = end ? portalTop() - 1 : wallTop(z, west), face = x === 430 || x === 467
  const next = z < PORTAL_N ? z + 1 : z - 1, step = end || (inCutting(next) && (wallEnd(next) ? portalTop() - 1 : wallTop(next, west)) >= top + 2)
  for (let y = 64; y <= top; y++) S(x, y, z, face && ((z % 12) + 12) % 12 === 0 && y > 64 ? 'smooth_stone' : pick(x, y, z, MIX.stonebrick))
  S(x, top + 1, z, step ? 'smooth_stone' : 'smooth_stone_slab[type=bottom]')
}
function road () {
  for (let z = 471; z < BRIDGE.z1; z++) {
    if (z >= PORTAL_N && z <= PORTAL_S) continue
    const L = approachLevel(z)
    for (let x = 429; x <= 468; x++) {
      const c = roadCell(x, z)
      if (!c) continue
      if (c.k === 'wall') retain(x, z); else lay(x, z, L, c)
    }
  }
  // the cutting's last wall row at z 686 (the bridge's abutment takes the road there)
  for (const x of [429, 430, 467, 468]) retain(x, BRIDGE.z1)
}

// ---- the tunnel and its portals (PLAN 3.3) ---------------------------------------------------------------------------
function liningAt (x, y) {
  if (!touchesBore(x, y)) return 'stone'
  if (y === 71) return 'polished_andesite' // base course on the walls' faces
  if (y <= 74) return 'smooth_stone'
  return 'light_gray_concrete'
}
// The road through the bore and the portals: road x 437..460 with the approach's lines, walkways x 434..436 and 461..463,
// a curb half a block up at x 436 and 461.
function tunnelRoad (x, z, L) {
  const [r1, r2] = APPROACH.road
  const c = x >= r1 && x <= r2 ? ROAD(x === 448 || x === 449 ? 'yellow' : x === r1 + 1 || x === r2 - 1 ? 'white' : null)
    : { k: x === r1 - 1 || x === r2 + 1 ? 'curb' : 'walk' }
  lay(x, z, L, c)
}
function tunnel () {
  for (let z = TUNNEL.z1; z <= TUNNEL.z2; z++) {
    const L = approachLevel(z), t = levelTop(L)
    for (let x = TUNNEL.x1 - 2; x <= TUNNEL.x2 + 2; x++) {
      if (x >= TUNNEL.x1 && x <= TUNNEL.x2) tunnelRoad(x, z, L)
      else fillUnder(x, z, t.full)
      const curb = x === TUNNEL.x1 + 2 || x === TUNNEL.x2 - 2
      for (let y = t.full; y <= BORE_TOP; y++) {
        if (x >= TUNNEL.x1 && x <= TUNNEL.x2 && y <= t.full + (t.slab || curb ? 1 : 0)) continue // the road and curbs
        if (inBore(x, y)) S(x, y, z, 'air')
        else if (nearBore(x, y) || (y === t.full && (x < TUNNEL.x1 || x > TUNNEL.x2))) S(x, y, z, liningAt(x, y))
      }
    }
    // lights: 2-long sea lantern strips on both walls at y 77 every 6, two ceiling rows at x 441 and 456 every 4
    const k = z - TUNNEL.z1
    if (k % 6 < 2) { S(TUNNEL.x1 - 1, 77, z, 'sea_lantern'); S(TUNNEL.x2 + 1, 77, z, 'sea_lantern') }
    if (k % 4 === 2) for (const x of [441, 456]) S(x, VAULT.get(x) + 1, z, 'sea_lantern')
    // emergency points: a red box flush in each wall, with a label
    if (SOS.includes(z)) for (const x of [TUNNEL.x1 - 1, TUNNEL.x2 + 1]) { S(x, 72, z, 'red_concrete'); S(x, 73, z, 'red_concrete') }
  }
  // jet fans: pairs of 4-long fans hung on chains from the crown, over each carriageway
  for (const z0 of JET_FANS) for (const x of [444, 453]) for (let z = z0; z < z0 + 4; z++) {
    S(x, VAULT.get(x) - 1, z, z === z0 || z === z0 + 3 ? 'polished_deepslate' : 'polished_basalt[axis=z]')
    if (z === z0 + 1 || z === z0 + 2) S(x, VAULT.get(x), z, 'iron_chain[axis=y]')
  }
}
const SOS = [566, 582, 598]
const JET_FANS = [571, 591]
const jetFan = (x, y, z) => JET_FANS.some(z0 => z >= z0 && z < z0 + 4) && (x === 444 || x === 453) && y >= VAULT.get(x) - 1
// A portal: the headwall and its wing walls (x 418..479, 3 deep) solid from y 65 up, the bore open through it with a
// 2-wide ring (polished diorite on the face, so it reads against the concrete; polished andesite behind), light gray
// concrete elsewhere. Over the cutting (x 429..468) all three rows stand to one level, portalTop() (y 94, the face's
// design height, or the highest 64 + groundTop over both portals' rows, x 418..479, if that's higher: without
// groundTop's old patchy +-1 that's y 92, which left no room over the name panel), so the face has a straight top: a
// polished andesite cornice on it
// and an andesite wall parapet over that; the rows behind it are grass over dirt, their sides above a lower neighbour
// banded like a hill's. The wing walls (x 418..428, 469..479) stop at 64 + groundTop under a grass top, so the hill runs
// over them. Every portal column is at least as high as groundTop says, so the hollow hills beside it close against it.
let PT = null
const portalTop = () => {
  if (PT === null) { PT = 94; for (let z = PORTAL_N; z <= PORTAL_S; z++) if (isPortalZ(z)) for (let x = PORTAL_X1; x <= PORTAL_X2; x++) PT = Math.max(PT, 64 + groundTop(x, z)) }
  return PT
}
const portalColTop = (x, z) => isPortalCol(x, z) ? (x >= 429 && x <= 468 ? portalTop() : 64 + groundTop(x, z)) : 64 + groundTop(x, z)
function portal (z) {
  const L = approachLevel(z), t = levelTop(L)
  for (let x = PORTAL_X1; x <= PORTAL_X2; x++) {
    const mid = x >= 429 && x <= 468, top = portalColTop(x, z), face = FACE_ROW(z) && mid
    // the lowest neighbour's top (not for the face: its front is the cutting)
    const minN = Math.min(portalColTop(x + 1, z), portalColTop(x - 1, z), portalColTop(x, z + 1), portalColTop(x, z - 1))
    const bore = x >= TUNNEL.x1 && x <= TUNNEL.x2
    if (bore) tunnelRoad(x, z, L)
    const curb = x === TUNNEL.x1 + 2 || x === TUNNEL.x2 - 2
    for (let y = 65; y <= top; y++) {
      if (bore && y <= t.full + (t.slab || curb ? 1 : 0)) continue
      if (inBore(x, y)) { S(x, y, z, 'air'); continue }
      if (y >= t.full && nearBore(x, y)) { S(x, y, z, FACE_ROW(z) ? ringFace(x, y) : 'polished_andesite'); continue }
      if (y === top) S(x, y, z, face ? 'polished_andesite' : 'grass_block')
      else if (face) S(x, y, z, faceAt(x, y))
      else if (y > minN) S(x, y, z, CLIFF[Math.floor(y / 3) % CLIFF.length]) // a side over a lower neighbour (the wings too)
      else if (y >= top - 2) S(x, y, z, 'dirt')
      else S(x, y, z, 'light_gray_concrete')
    }
    if (face) S(x, top + 1, z, 'andesite_wall')
  }
}
// The outer face between the cutting's walls (x 429..468): a polished andesite base course at y 71 like the bore's,
// smooth stone pilasters at x 431 and 466 with a sea lantern each, and a name panel (smooth quartz in a polished andesite
// frame, x 439..458, y 87..91: centred between the ring's top, y 84, and the cornice, y 94) for the label. The concrete
// is jointed into panels like a cast face (a plain 40 x 29 gray wall otherwise): smooth stone bands at y 80 and 86, and
// polished andesite joints at x 439 and 458, the panel frame's own columns carried down to the ring and up to the cornice.
// The ring's stepped outline is rounded on the face: an upside-down polished diorite stair on each step of its inner edge
// (the bore's), a right-way-up one in each notch of its outer edge.
const PANEL = { x1: 439, x2: 458, y1: 87, y2: 91 }
const crownward = x => x <= 448 ? 1 : -1 // the bore is symmetric about x 449.0: x 448 and 449 are its crown
const ringAt = (x, y) => nearBore(x, y) && !inBore(x, y)
const stair = (facing, half) => `polished_diorite_stairs[facing=${facing},half=${half},shape=straight,waterlogged=false]`
function ringFace (x, y) {
  const d = crownward(x)
  if (inBore(x + d, y) && inBore(x, y - 1)) return stair(d > 0 ? 'west' : 'east', 'top') // its open quarter faces the bore
  return 'polished_diorite'
}
function faceAt (x, y) {
  const d = crownward(x)
  if (ringAt(x + d, y) && ringAt(x, y - 1)) return stair(d > 0 ? 'east' : 'west', 'bottom') // fills the notch
  if (x >= PANEL.x1 && x <= PANEL.x2 && y >= PANEL.y1 && y <= PANEL.y2) return x === PANEL.x1 || x === PANEL.x2 || y === PANEL.y1 || y === PANEL.y2 ? 'polished_andesite' : 'smooth_quartz'
  if (x === 431 || x === 466) return y === 79 ? 'sea_lantern' : y >= 71 ? 'smooth_stone' : 'light_gray_concrete'
  if (y === 71) return 'polished_andesite'
  if (y === 80 || y === 86) return 'smooth_stone'
  if (x === PANEL.x1 || x === PANEL.x2) return 'polished_andesite'
  return 'light_gray_concrete'
}
// A check of the bore's own shape: every cell inside the bore between the portals is air in the build.
const boreCells = () => { const out = []; for (let z = PORTAL_N; z <= PORTAL_S; z++) for (let x = TUNNEL.x1; x <= TUNNEL.x2; x++) for (let y = 72; y <= VAULT.get(x); y++) if (!jetFan(x, y, z)) out.push([x, y, z]); return out }

// ---- the ridge (PLAN 3.4): every hill column through COMMON's hill(); the portals build their own -----------------------
// (groundTop has no patchy +-1 any more, so there are no 2-high bumps to dress in moss: every riser is a real terrace's
// edge and keeps its cliff bands.)
function ridge () {
  for (let x = TOWN.x1; x <= TOWN.x2; x++) for (let z = TOWN.z1; z < TOWN_Z; z++) if (!isPortalCol(x, z)) hill(S, x, z)
}

// ---- the river's north branch (PLAN 3.5) -----------------------------------------------------------------------------
const BANK_RIM = [['red_sand', 80], ['orange_terracotta', 20]] // no coarse dirt: it read as dark dots in a brick-like band
function river () {
  for (let x = TOWN.x1; x <= RIVER_END_X; x++) for (let z = TOWN.z1; z < TOWN_Z; z++) {
    const r = riverAt(x, z)
    if (!r) continue
    if (r.water) {
      S(x, r.bed, z, pick(x, r.bed, z, MIX.riverbed))
      for (let y = r.bed + 1; y <= WATER_Y; y++) S(x, y, z, 'water')
      for (let y = WATER_Y + 1; y <= 64; y++) S(x, y, z, 'air')
      // a handful of lily pads, away from the bridge and the culvert
      if (h(x, 61, z) === 0 && h(x, 62, z) < 35 && (x < 420 || x > 477) && x < 725) S(x, WATER_Y + 1, z, 'lily_pad')
    } else {
      // the bank: sand at the water's edge, Jailbreak's solid orange rim above it (y 62..63), and grass on top, the lip
      // (a y-64 cell beside a lower bank cell or the water) red sand, so the rim reads as one orange line from town.
      // Under a bank cell the water's sides are sand down to y 56 (the deepest water's bottom), not the world's stone.
      const top = r.top
      for (let y = 56; y < top && y <= WATER_Y; y++) S(x, y, z, 'sand')
      const lip = top === 64 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => { const n = riverAt(x + dx, z + dz); return n && (n.water || n.top < 64) })
      S(x, top, z, top <= 61 ? 'sand' : top <= 63 ? pick(x, top, z, BANK_RIM) : lip ? 'red_sand' : 'grass_block')
      for (let y = top + 1; y <= 64; y++) S(x, y, z, 'air')
    }
  }
}

// ---- the culvert at the river's east end (PLAN 3.4) ------------------------------------------------------------------
// A smooth stone headwall x 739..741, z 685..717, y 56..69 with a polished andesite cap and an iron bar railing; the mouth
// over z 693..709 spans the waterline: bars at x 739 (waterlogged under y 61), water at x 740 under y 61, a dark pipe behind,
// framed in polished andesite. Wing walls over z 681..684 and 718..721 step down from it; the hill behind (x 742 on)
// stands about 1 over the cap (COMMON's CULVERT_RISE), lower toward z 717 where R5 itself falls away.
function culvert () {
  const X = RIVER_END_X, Z1 = 685, Z2 = 717, M1 = 693, M2 = 709
  for (let x = X; x <= X + 2; x++) for (let z = Z1; z <= Z2; z++) for (let y = 56; y <= 69; y++) {
    let s = y === 69 ? 'polished_andesite' : 'smooth_stone'
    const mouthZ = z >= M1 && z <= M2
    if (x === X && ((z === M1 - 1 || z === M2 + 1) && y >= 57 && y <= 64 || (mouthZ && (y === 57 || y === 64)))) s = 'polished_andesite'
    if (mouthZ && y >= 58 && y <= 63) {
      if (x === X) s = y <= WATER_Y ? 'iron_bars[waterlogged=true]' : 'iron_bars[waterlogged=false]'
      else if (x === X + 1) s = y <= WATER_Y ? 'water' : 'black_concrete'
      else s = 'black_concrete'
    }
    S(x, y, z, s)
  }
  for (let z = Z1; z <= Z2; z++) S(X + 1, 70, z, 'iron_bars[waterlogged=false]')
  for (const z of [Z1, Z2]) S(X + 1, 70, z, 'andesite_wall') // end posts
  // wing walls over z 681..684 and 718..721, their top stepping down 1 a block from the headwall's (y 68 .. 65), so the
  // bank's low cells beside them (x 738) meet stone, and the hill behind (COMMON's CULVERT_RISE) steps down with them
  for (let k = 1; k <= 4; k++) for (const z of [Z1 - k, Z2 + k]) for (let x = X; x <= X + 2; x++) {
    const top = 69 - k
    for (let y = 58; y <= top; y++) S(x, y, z, y === top ? 'polished_andesite' : 'smooth_stone')
  }
}

// ---- the bridge (PLAN 3.6) -------------------------------------------------------------------------------------------
function bridge () {
  for (let z = BRIDGE.z1; z <= BRIDGE.z2; z++) {
    const under = z >= BRIDGE.z1 + 3 && z <= BRIDGE.z2 - 2
    for (let x = 431; x <= 466; x++) {
      // the deck at y 64
      let s
      if (x >= 437 && x <= 460) { // the descent's blocks blend into the deck's over z 686..692
        const line = x === 448 || x === 449 ? 'yellow' : x === 438 || x === 459 ? 'white' : null, sl = slopeCell(x, z)
        s = line ? (sl ? SLOPE.line : FLAT_LINE)[line] : pick(x, 64, z, sl ? SLOPE.full : MIX.deck)
      }
      else if (x >= 433 && x <= 464) s = 'light_gray_concrete'
      else s = 'smooth_stone' // under the parapets and the deck's outer edge
      S(x, 64, z, s)
      if (under) S(x, 63, z, x === 431 || x === 466 ? 'polished_andesite' : 'smooth_stone')
      else for (let y = 61; y <= 63; y++) S(x, y, z, pick(x, y, z, MIX.stonebrick)) // abutments
    }
    // curbs and parapets: light blue terracotta with a smooth stone cap, smooth quartz posts every 6
    S(436, 65, z, 'smooth_stone_slab[type=bottom]'); S(461, 65, z, 'smooth_stone_slab[type=bottom]')
    const post = ((z - BRIDGE.z1) % 6) === 0 || z === BRIDGE.z2
    for (const x of [432, 465]) {
      if (post) { S(x, 65, z, 'smooth_quartz'); S(x, 66, z, 'smooth_quartz'); S(x, 67, z, 'smooth_stone_slab[type=bottom]') }
      else { S(x, 65, z, 'light_blue_terracotta'); S(x, 66, z, 'smooth_stone_slab[type=bottom]') }
    }
    // girders under the deck's edges set in 3 from the y-63 fascia (x 431, 466), so a shadow line shows under the deck
    // from the side between the piers, and one under the middle
    if (under) for (const x of [434, 435, 448, 449, 462, 463]) S(x, 62, z, 'polished_andesite')
  }
  // piers from the river bed up to the girders
  for (const zz of [701, 702, 713, 714]) for (const [a, b] of [[432, 434], [447, 450], [463, 465]]) for (let x = a; x <= b; x++) {
    const r = riverAt(x, zz)
    const y0 = r ? (r.water ? r.bed : r.top) : 64
    for (let y = y0; y <= 62; y++) S(x, y, zz, pick(x, y, zz, MIX.stonebrick))
  }
  // cutwaters: a smooth stone block past each pier's ends, at its middle columns, from the bed to just over the water
  for (const zz of [700, 703, 712, 715]) for (const x of [433, 448, 449, 464]) {
    const r = riverAt(x, zz)
    if (!r || !r.water) continue
    for (let y = r.bed; y <= 61; y++) S(x, y, zz, 'smooth_stone')
  }
  for (const z of [698, 716]) { streetLamp(S, 435, z, 1, 0); streetLamp(S, 462, z, -1, 0) }
}

// ---- signs (PLAN 3.7 and the guide sign) -----------------------------------------------------------------------------
// The welcome sign on its pad: a board 9 x 4 (x 470..478, z 680, y 68..71: the plan's y 66..69 hid its lower half
// behind the cutting's east wall from a driver's eye) in a light blue concrete frame (light blue terracotta read as a
// dull lavender gray) with a smooth quartz face toward the cars coming down (north), on two posts behind it, over a bed
// of flowers. Its back says COME BACK SOON (a label) to everyone leaving town.
const WELCOME_Y = 68
const FLOWERS = ['poppy', 'dandelion', 'cornflower', 'oxeye_daisy', 'allium', 'azure_bluet']
function welcome () {
  const [px1, pz1, px2, pz2] = PAD
  const Y1 = WELCOME_Y, Y2 = WELCOME_Y + 3
  for (let x = 470; x <= 478; x++) for (let y = Y1; y <= Y2; y++) S(x, y, 680, x === 470 || x === 478 || y === Y1 || y === Y2 ? 'light_blue_concrete' : 'smooth_quartz')
  for (const x of [471, 477]) {
    for (let y = 65; y <= Y2; y++) S(x, y, 681, 'diorite_wall')
    S(x, Y2 + 1, 681, 'smooth_quartz_slab[type=bottom]')
    for (let y = 65; y < Y1; y++) S(x, y, 680, 'diorite_wall')
  }
  for (let x = 470; x <= 478; x++) S(x, Y2 + 1, 680, 'smooth_quartz_slab[type=bottom]') // the board's cap
  // the flower bed in front of it, edged with smooth stone slabs
  for (let x = px1 + 1; x <= px2 - 1; x++) for (let z = 677; z <= 679; z++) {
    const edge = x === px1 + 1 || x === px2 - 1 || z === 677
    if (edge) { S(x, 64, z, 'smooth_stone'); S(x, 65, z, 'smooth_stone_slab[type=bottom]') }
    else { S(x, 64, z, 'grass_block'); if (h(x, 66, z) < 80) S(x, 65, z, FLOWERS[h(x, 67, z) % FLOWERS.length]) }
  }
  shrub(S, px1, 681); shrub(S, px2 - 1, 681)
  void pz1; void pz2
}
// A green guide sign over the southbound lanes just past the prison (z 476): a pole on the west verge, an arm at y 73
// with a diagonal brace from the pole (430, 70) up to it (433, 73), and a board x 436..447, y 69..72 in dark prismarine
// (highway-sign green; green concrete reads olive) with a smooth quartz border, facing the cars heading south.
function guideSign () {
  const z = 476
  for (let y = 65; y <= 73; y++) S(429, y, z, 'polished_blackstone_wall')
  for (let x = 430; x <= 446; x++) S(x, 73, z, 'polished_blackstone_wall')
  for (let k = 0; k <= 3; k++) S(430 + k, 70 + k, z, 'polished_blackstone_wall') // a brace under the 17-long arm
  for (let x = 436; x <= 447; x++) for (let y = 69; y <= 72; y++) S(x, y, z, x === 436 || x === 447 || y === 69 || y === 72 ? 'smooth_quartz' : 'dark_prismarine')
}

// ---- lamps (PLAN 3.1) ------------------------------------------------------------------------------------------------
// The climb keeps the prison's lamps (the walkways' outer cells, about every 30 a side, staggered). From the south portal
// on the town's cobra-heads take over (as on the bridge and Main Street): a pair every 18 blocks on the walkways' inner
// cells (x 435, 462), each arm reaching over its carriageway, in step with the bridge's pairs at z 698 and 716.
const LAMPS = [[433, 494], [464, 505], [433, 520], [464, 535]]
const DESCENT_LAMPS = [626, 644, 662, 680]
function lamps () {
  for (const [x, z] of LAMPS) prisonLamp(S, x, z, 'z', levelTop(approachLevel(z)).full)
  for (const z of DESCENT_LAMPS) { const y0 = levelTop(approachLevel(z)).full; streetLamp(S, 435, z, 1, 0, y0); streetLamp(S, 462, z, -1, 0, y0) }
}

// ---- trees, ground and grass (PLAN 3.4) -------------------------------------------------------------------------------
// within 6 of the road's corridor (x 429..468): no trees there, except over the tunnel (z 556..609), where the hill is
// whole and a bare strip read as a firebreak from town
const OVER_TUNNEL = z => z >= 556 && z <= 609
const nearCorridor = (x, z) => x >= 423 && x <= 474 && !OVER_TUNNEL(z)
// within 6 of the culvert's headwall and wings (x 739..741, z 681..721): a pine there hung its leaves over the cap
// and the railing
const nearCulvert = (x, z) => x >= RIVER_END_X - 6 && x <= RIVER_END_X + 8 && z >= 675 && z <= 727
const edgeOk = (x, z, m) => x >= TOWN.x1 + m && x <= TOWN.x2 - m && z >= TOWN.z1 + m && z <= TOWN_Z - 1 - m
const flatGround = (x, z) => groundTop(x, z) === 0 && !riverAt(x, z) && !(x >= 427 && x <= 470) && !isPortalCol(x, z) && !inBox(x, z, [PAD]) && !(x >= RIVER_END_X && x <= RIVER_END_X + 2 && z >= 680 && z <= 722)
// Jailbreak's big orange patches on the approach's ground: ragged ellipses of radius 6..14 in 35 of every 100 cells of a
// 28 x 28 grid, each turned its own way (COMMON's orangeAt, the town's small blobs, adds its own). A blob that would
// reach z 729 is left out, so the town's side of the seam (orangeAt only) meets no cut-off patch.
const bigOrange = (x, z) => {
  const c = 28, gx = Math.floor(x / c), gz = Math.floor(z / c)
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const cx = gx + i, cz = gz + j
    if (h(cx, 51, cz) >= 35) continue
    const ox = cx * c + h(cx, 52, cz) % c, oz = cz * c + h(cx, 53, cz) % c, r = 6 + h(cx, 54, cz) % 9
    if (oz + r + 1 >= TOWN_Z) continue
    const a = h(cx, 55, cz) * Math.PI / 50, ca = Math.cos(a), sa = Math.sin(a)
    const u = (x - ox) * ca + (z - oz) * sa, v = (-(x - ox) * sa + (z - oz) * ca) * 1.6
    if (Math.hypot(u, v) < r + (h(x, 56, z) % 3) - 1) return true
  }
  return false
}
// Jailbreak's orange patches: on the flat grass, and on the hills' grass where a column lies within 2 of its 4
// neighbours, so the big orange blobs run over the slopes too (the height never changes; a 3+ step is a cliff's).
function orange () {
  for (let x = TOWN.x1; x <= TOWN.x2; x++) for (let z = TOWN.z1; z < TOWN_Z; z++) {
    if (!orangeAt(x, z) && !bigOrange(x, z)) continue
    if (flatGround(x, z)) { S(x, 64, z, pick(x, 64, z, MIX.orange)); continue }
    const t = groundTop(x, z), top = 64 + t
    if (t <= 0 || isPortalCol(x, z) || G(x, top, z) !== 'grass_block') continue
    if ([groundTop(x + 1, z), groundTop(x - 1, z), groundTop(x, z + 1), groundTop(x, z - 1)].some(v => Math.abs(v - t) > 2)) continue
    let m = pick(x, top, z, MIX.orange)
    if (m === 'red_sand' && top > 65 && !G(x, top - 1, z)) m = 'coarse_dirt' // never sand over the hollow inside
    S(x, top, z, m)
  }
}
function trees () {
  // one candidate in each 13 x 13 cell, jittered: on the slopes (where the 4 neighbours differ by at most 1) 45 in 100
  // kept, a third of those a round oak; on the flat a pine kept 1 in 4 (Jailbreak scatters lone cone trees and round gem
  // trees over its hills, not a forest)
  for (let gx = TOWN.x1; gx <= TOWN.x2; gx += 13) for (let gz = TOWN.z1; gz < TOWN_Z; gz += 13) {
    const x = gx + h(gx, 31, gz) % 13, z = gz + h(gx, 32, gz) % 13
    if (!edgeOk(x, z, 5) || nearCorridor(x, z) || nearCulvert(x, z) || isPortalCol(x, z) || riverAt(x, z)) continue
    const t = groundTop(x, z)
    if (h(x, 38, z) >= (t > 0 ? 45 : 75)) continue
    if (t === 0 && (!flatGround(x, z) || dryD(x, z) < 4 || h(x, 33, z) >= 33)) continue
    const n = [groundTop(x + 1, z), groundTop(x - 1, z), groundTop(x, z + 1), groundTop(x, z - 1)]
    if (n.some(v => Math.abs(v - t) > 1)) continue
    if (t > 0 && G(x, 64 + t, z) !== 'grass_block') continue // not on a cliff band
    if (t === 0 && G(x, 64, z) && G(x, 64, z) !== 'grass_block') continue
    if (t > 0 && h(x, 39, z) < 33) oak(T, x, z, 64 + t); else pine(T, x, z, 12 + h(x, 34, z) % 7, 64 + t)
  }
  // a few round oaks on the flat ground along the river's north bank
  for (let gx = TOWN.x1; gx <= TOWN.x2; gx += 16) for (let gz = 640; gz < TOWN_Z; gz += 16) {
    const x = gx + h(gx, 35, gz) % 16, z = gz + h(gx, 36, gz) % 16
    if (!edgeOk(x, z, 5) || nearCorridor(x, z) || nearCulvert(x, z) || !flatGround(x, z) || h(x, 37, z) >= 55) continue
    const d = dryD(x, z)
    if (d < 3 || d > 14) continue
    if (G(x, 64, z) && G(x, 64, z) !== 'grass_block') continue
    oak(T, x, z, 64)
  }
}
// Clumps of short and tall grass on open grass (the prison's greenery() masks), never on the road's corridor.
function grass () {
  for (let x = TOWN.x1; x <= TOWN.x2; x++) for (let z = TOWN.z1; z < TOWN_Z; z++) {
    if (h(x >> 3, 9, z >> 3) >= 30) continue
    const v = h(x, 65, z)
    if (v >= 14) continue
    if (x >= 427 && x <= 470 && z < BRIDGE.z2 + 1 && !OVER_TUNNEL(z)) continue
    if (isPortalCol(x, z) || inBox(x, z, [PAD])) continue
    const r = riverAt(x, z)
    if (r && (r.water || r.top < 64)) continue
    const top = 64 + groundTop(x, z), o = G(x, top, z)
    if (o ? o !== 'grass_block' : top !== 64) continue
    if (G(x, top + 1, z) || G(x, top + 2, z) || !own(x, top + 2, z)) continue
    if (v < 3) { S(x, top + 1, z, 'tall_grass[half=lower]'); S(x, top + 2, z, 'tall_grass[half=upper]') } else S(x, top + 1, z, 'short_grass')
  }
}

// ---------------------------------------------------------------------------------------------------------------------
module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  ridge()
  river()
  road()
  for (const z of [PORTAL_N, PORTAL_N + 1, PORTAL_N + 2, PORTAL_S - 2, PORTAL_S - 1, PORTAL_S]) portal(z)
  tunnel()
  bridge()
  culvert()
  welcome()
  guideSign()
  lamps()
  orange()
  trees()
  grass()
  B = null
  return b
}

// ---- labels (a label on a face sits 0.03 off the face plane; coordinates keep their decimals) --------------------------
// The signs' labels carry their own light (brightness: the text display's brightness override): the portal panels' only
// light is the pilasters' sea lanterns at y 79, and the welcome board and the guide sign have none, so at night their
// text would sink into the dark. The SOS labels sit in the lit tunnel.
const LIT = { sky: 15, block: 15 }
module.exports.labels = [
  { x: 449.0, y: 88.6, z: PORTAL_N - 0.03, facing: 'north', text: 'MOUNTAINSIDE', color: '#1d2a44', scale: 7.5, brightness: LIT },
  { x: 449.0, y: 88.6, z: PORTAL_S + 1.03, facing: 'south', text: 'PRISON', color: '#1d2a44', scale: 7.5, brightness: LIT },
  { x: 474.5, y: 70.25, z: 679.97, facing: 'north', text: 'WELCOME TO', color: '#2a6fb0', scale: 2, brightness: LIT },
  { x: 474.5, y: 69.15, z: 679.97, facing: 'north', text: 'MOUNTAINSIDE', color: '#1d2a44', scale: 3.2, brightness: LIT },
  // the board's back (z 681, between its posts at x 471 and 477), for everyone leaving town
  { x: 474.5, y: 69.75, z: 681.03, facing: 'south', text: 'COME BACK SOON', color: '#2a6fb0', scale: 2, brightness: LIT },
  { x: 442.0, y: 71.2, z: 475.97, facing: 'north', text: 'MOUNTAINSIDE', color: '#ffffff', scale: 2.2, brightness: LIT },
  { x: 442.0, y: 70.05, z: 475.97, facing: 'north', text: '↓  TOWN  ↓', color: '#ffffff', scale: 1.6, brightness: LIT },
  ...SOS.flatMap(z => [
    { x: TUNNEL.x1 + 0.03, y: 72.6, z: z + 0.5, facing: 'east', text: 'SOS', color: '#ffffff', scale: 1 },
    { x: TUNNEL.x2 + 0.97, y: 72.6, z: z + 0.5, facing: 'west', text: 'SOS', color: '#ffffff', scale: 1 }
  ])
]
module.exports.displays = []
// Biome boxes for later (a paste with the owner's OK: `fillbiome <x1> <y1> <z1> <x2> <y2> <z2> <biome>` in W): the
// world's plains water is deep blue, Jailbreak's river turquoise, so the river's water (y 56..63: the deepest bed is y 55,
// the surface y 60) becomes warm ocean. fillbiome works in 4 x 4 x 4 cells, so the boxes stop at y 63: the next cell up
// (y 64..67) holds the banks' grass, which a box to y 64 tinted warm-ocean green in 4-block steps. One box per 16-wide
// strip of x (4-wide over x 216..299, where the river bends south-west and a 16-wide strip's box took in the land beside
// it), from its first to its last water column.
module.exports.biomes = (() => {
  const out = []
  for (let x0 = TOWN.x1; x0 <= RIVER_END_X;) {
    const w = x0 >= 216 && x0 < 300 ? 4 : 16
    let z1 = Infinity, z2 = -Infinity, x1 = Infinity, x2 = -Infinity
    for (let x = x0; x < x0 + w && x <= RIVER_END_X; x++) for (let z = TOWN.z1; z < TOWN_Z; z++) {
      const r = riverAt(x, z)
      if (r && r.water) { z1 = Math.min(z1, z); z2 = Math.max(z2, z); x1 = Math.min(x1, x); x2 = Math.max(x2, x) }
    }
    if (z1 <= z2) out.push({ biome: 'minecraft:warm_ocean', box: [x1, 56, z1, x2, 63, z2] })
    x0 += w
  }
  return out
})()
// Spots worth standing on in a playtest (PLAN 12.6: the view from the south portal, the bridge).
module.exports.points = {
  APPROACH_TUNNEL_N: [448.5, standY(545), 545.5, 0], // facing south into the tunnel
  APPROACH_PORTAL_S_VIEW: [448.5, standY(621), 621.5, 0], // the town opens up below
  APPROACH_BRIDGE: [448.5, 65, 707.5, 0],
  APPROACH_WELCOME: [474.5, 67, 668.5, 0] // on the slope north of the welcome sign (z 680; the ground's top is y 66 here), facing it
}
module.exports.setup = { regions: [], heists: [], keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], pois: [], walls: [], holos: [] }
// GPS path nodes (PLAN 8.4): the spine from the prison's LOT_EXIT (187) to the bridge, joined to Main Street's 1007.
module.exports.gps = {
  nodes: [
    [1001, 260.5, 65, 426.5, 'HIGHWAY_GATE'], [1002, 448.5, 65, 426.5, 'JUNCTION'], [1003, 448.5, 65, 490.5, 'APPROACH'],
    [1050, 448.5, 65, 502.5, 'CLIMB'], [1004, 448.5, 71, 550.5, 'TUNNEL_N'], [1005, 448.5, 71, 614.5, 'TUNNEL_S'],
    [1006, 448.5, 65, 688.5, 'BRIDGE_N']
  ],
  links: [[187, 1001], [1001, 1002], [1002, 1003], [1003, 1050], [1050, 1004], [1004, 1005], [1005, 1006], [1006, 1007]]
}
module.exports.boreCells = boreCells

// ---- run on its own ----------------------------------------------------------------------------------------------------
// Preview only: the world's flat ground under the build (grass y 64, dirt 61..63, stone below) where the build sets
// nothing, so a crop reads like the world it'll be pasted into. render.js finds a block's colour by its texture's name,
// and the smooth blocks are drawn with another block's top texture: those are renamed here (the preview only), so they
// show in their colour instead of magenta.
const previewAs = s => s.replace(/^smooth_quartz/, 'quartz_block_top').replace(/^smooth_red_sandstone/, 'red_sandstone_top')
function withGround (b, box, y1 = 64) {
  const out = new (require('../mcstruct').Build)()
  const [x1, z1, x2, z2] = box
  for (const [k, s] of b.blocks) { const [x, , z] = k.split(',').map(Number); if (x >= x1 && x <= x2 && z >= z1 && z <= z2) out.blocks.set(k, previewAs(s)) }
  for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) for (let y = y1; y <= 64; y++) {
    if (out.get(x, y, z) !== undefined) continue
    out.set(x, y, z, y === 64 ? 'grass_block' : y >= 61 ? 'dirt' : 'stone')
  }
  return out
}
if (require.main === module) {
  const path = require('path'), fs = require('fs')
  const t0 = Date.now()
  const b = module.exports()
  const bb = b.bounds()
  console.log(`approach: ${b.blocks.size} blocks, box ${bb.x1},${bb.y1},${bb.z1} to ${bb.x2},${bb.y2},${bb.z2} (${Date.now() - t0} ms)`)
  let stray = 0
  for (const k of b.blocks.keys()) { const [x, y, z] = k.split(',').map(Number); if (!own(x, y, z)) stray++ }
  const bad = boreCells().filter(([x, y, z]) => b.get(x, y, z) !== 'air')
  console.log(`outside the region: ${stray}; bore cells not air: ${bad.length}`)
  const i = process.argv.indexOf('--render')
  if (i > 0) {
    const dir = path.resolve(process.argv[i + 1] || '.')
    fs.mkdirSync(dir, { recursive: true })
    const { top, plan, iso } = require('../render')
    const save = (name, img) => { const f = path.join(dir, `${name}.png`); fs.writeFileSync(f, img.png()); console.log(`wrote ${f} (${img.w}x${img.h})`) }
    const all = withGround(b, [TOWN.x1, TOWN.z1, TOWN.x2, TOWN_Z - 1])
    save('approach-top', top(all, 2))
    for (const d of (process.env.ISO_ALL || 'SW,SE').split(',').filter(Boolean)) save(`approach-iso-${d}`, iso(all, d, 2))
    const CROPS = { // name: [x1, z1, x2, z2, ground y, iso px, views]
      portal_n: [400, 486, 500, 560, 60, 6, 'NE,NW'],
      portal_s: [400, 606, 500, 690, 60, 6, 'SE,SW'],
      bridge: [410, 672, 488, 728, 56, 6, 'SE,SW,NE'],
      culvert: [712, 668, 770, 728, 55, 6, 'SW,NW'],
      signs: [425, 471, 485, 500, 62, 8, 'NE,NW'],
      welcome: [460, 668, 488, 692, 62, 10, 'NW,NE']
    }
    for (const [name, [x1, z1, x2, z2, y1, s, views]] of Object.entries(CROPS)) {
      if (process.env.CROPS && !process.env.CROPS.split(',').includes(name)) continue
      const c = withGround(b, [x1, z1, x2, z2], y1)
      save(`${name}-top`, top(c, s))
      for (const d of views.split(',')) save(`${name}-iso-${d}`, iso(c, d, s))
    }
    const tun = withGround(b, [426, 540, 471, 625], 60)
    save('tunnel-plan-y71', plan(tun, 71, 6))
    // straight-on views of what a driver sees: each portal's face from the road, and a slice across the bore
    save('portal_n-elev', elevation(withGround(b, [400, 500, 497, 560]), 'north', 6))
    save('portal_s-elev', elevation(withGround(b, [400, 606, 497, 680]), 'south', 6))
    save('bridge-elev', elevation(withGround(b, [405, 686, 492, 728], 55), 'west', 6))
    save('tunnel-section', elevation(slice(b, [420, 580, 477, 580]), 'north', 8))
  }
}
// An orthographic side view: face = where the viewer stands (north = looking south). Nearer cells are drawn over farther
// ones and lit brighter; sky blue behind.
function elevation (b, face, px) {
  const { blockColor } = require('../render')
  const { canvas } = require('../../png')
  const f = { east: [c => -c.z, c => c.x], west: [c => c.z, c => -c.x], north: [c => -c.x, c => -c.z], south: [c => c.x, c => c.z] }[face]
  const cells = []
  for (const [k, s] of b.blocks) { const col = blockColor(s); if (!col) continue; const [x, y, z] = k.split(',').map(Number); cells.push({ y, col, u: f[0]({ x, z }), d: f[1]({ x, z }) }) }
  let u1 = Infinity, u2 = -Infinity, y1 = Infinity, y2 = -Infinity, d1 = Infinity, d2 = -Infinity
  for (const c of cells) { u1 = Math.min(u1, c.u); u2 = Math.max(u2, c.u); y1 = Math.min(y1, c.y); y2 = Math.max(y2, c.y); d1 = Math.min(d1, c.d); d2 = Math.max(d2, c.d) }
  const img = canvas((u2 - u1 + 1) * px, (y2 - y1 + 1) * px)
  for (let i = 0; i < img.w * img.h; i++) img.px.set([150, 190, 230, 255], i * 4)
  cells.sort((a, c) => a.d - c.d)
  for (const c of cells) {
    const sh = 0.55 + 0.45 * (c.d - d1) / Math.max(1, d2 - d1), a = (c.col[3] ?? 255) / 255
    for (let i = 0; i < px; i++) for (let j = 0; j < px; j++) {
      const X = (c.u - u1) * px + i, Y = (y2 - c.y) * px + j, o = (Y * img.w + X) * 4
      for (let k = 0; k < 3; k++) img.px[o + k] = Math.round(img.px[o + k] * (1 - a) + Math.min(255, c.col[k] * sh) * a)
    }
  }
  return img
}
function slice (b, [x1, z1, x2, z2]) {
  const out = new (require('../mcstruct').Build)()
  for (const [k, s] of b.blocks) { const [x, , z] = k.split(',').map(Number); if (x >= x1 && x <= x2 && z >= z1 && z <= z2) out.blocks.set(k, previewAs(s)) }
  return out
}
