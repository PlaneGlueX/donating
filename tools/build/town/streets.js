'use strict'
// streets: the town's street network south of the prison (tools/build/town/PLAN.md section 4; module 'streets').
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
  [433, 744, 436, 757], [433, 829, 436, 838], // donut: the lot, the drive-thru exit (Main, west side)
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

// =====================================================================================================================
// streets (PLAN.md section 4): every street column of the town (ownerOf(x, z) === 'streets', z >= 729; the bounding box
// is x 277..578, z 729..1204). The surface at y 64 (asphalt, lines, sidewalks with joints, curb-cut aprons), the curbs,
// zebra crosswalks and stop bars, traffic lights, stop signs, street name blades, cobra-head street lamps, the power
// lines, manholes, storm drains, trash bins, hydrants, Birch Court's island, and the town's GPS path nodes (section
// 8.4). Nothing here reads blocks; every write goes
// through S (clipped to the street columns), so a street block can never land on a plot, a lot or the land.
//   node tools/build/town/streets.js                         -> counts, bounds, the furniture lists
//   node tools/build/town/streets.js --render <dir> [--px n] [--crop x1,z1,x2,z2] [--views top,plan,iso] [--y 64,65]
// =====================================================================================================================
const MOD = 'streets'
const own = ownFor(MOD)
let B = null
const MISSED = [] // writes S dropped (outside the street columns): the CLI reports them; there should be none
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, s); else MISSED.push([x, y, z, s]) }
const key = (x, z) => `${x},${z}`

// ---- the street cells ------------------------------------------------------------------------------------------------
const REGION = { x1: 277, z1: 729, x2: 578, z2: 1204 } // every street column lies in here (checked at load)
const CELL = new Map() // "x,z" -> streetCell(x, z), the streets module's columns only
for (let x = TOWN.x1; x <= TOWN.x2; x++) for (let z = TOWN_Z; z <= TOWN.z2; z++) {
  if (ownerOf(x, z) !== MOD) continue
  if (x < REGION.x1 || x > REGION.x2 || z < REGION.z1 || z > REGION.z2) throw new Error(`street cell ${x},${z} outside ${JSON.stringify(REGION)}`)
  CELL.set(key(x, z), streetCell(x, z))
}
const cellAt = (x, z) => CELL.get(key(x, z)) || null
const isAsphalt = (x, z) => { const c = cellAt(x, z); return !!c && c.kind === 'asphalt' }
const isWalk = (x, z) => { const c = cellAt(x, z); return !!c && c.kind === 'walk' }
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const cornerOf = (x, z) => CORNERS.find(q => (x + 0.5 - q.cx) * q.sx >= 0 && (z + 0.5 - q.cz) * q.sz >= 0)
// The arcs' white edge lines, closed up: streetCell's 1-wide white ring touches itself only at a corner wherever it runs
// near 45 degrees (20 such joins an arc), which reads as a dotted line from above. One cell beside each such join is
// painted white as well: of the two cells both line cells touch, the one nearer the line's centre radius (r 17.5 inner,
// 30.5 outer), never a yellow cell. Pure: from the street cells.
const ARC_WHITE = new Set()
{ const arcWhite = (x, z) => { const c = cellAt(x, z); return !!c && c.kind === 'asphalt' && c.line === 'white' && c.street === 'corner' }
  const white = (x, z) => { const c = cellAt(x, z); return !!c && c.line === 'white' }
  for (const k of CELL.keys()) {
    const [x, z] = k.split(',').map(Number)
    if (!arcWhite(x, z)) continue
    const q = cornerOf(x, z), rl = CORNER.r + (Math.hypot(x + 0.5 - q.cx, z + 0.5 - q.cz) < CORNER.r ? -6.5 : 6.5)
    const off = ([cx, cz]) => Math.abs(Math.hypot(cx + 0.5 - q.cx, cz + 0.5 - q.cz) - rl)
    for (const dz of [1, -1]) {
      if (!arcWhite(x + 1, z + dz) || white(x + 1, z) || white(x, z + dz)) continue
      const c = [[x + 1, z], [x, z + dz]].filter(([cx, cz]) => isAsphalt(cx, cz) && cellAt(cx, cz).line !== 'yellow').sort((a, b) => off(a) - off(b))[0]
      if (c) ARC_WHITE.add(key(...c))
    }
  } }
const lineAt = (x, z) => { const c = cellAt(x, z); return c && (c.line || (ARC_WHITE.has(key(x, z)) ? 'white' : null)) }
// Birch Court's turning circle gets a centre island (a cul-de-sac's look, like the houses' courts in Jailbreak's town):
// grass r <= 5 around the circle's centre, a curb ring of slabs at r 5..6 and an oak; the lane round it is 10 wide.
const ISLAND = { r: 5, curb: 6, oak: [337, 1185] }
const islandR = (x, z) => Math.hypot(x + 0.5 - CIRCLE.cx, z + 0.5 - CIRCLE.cz)
const inIsland = (x, z) => isAsphalt(x, z) && islandR(x, z) <= ISLAND.curb
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]]
const islandRing = (x, z) => inIsland(x, z) && N8.some(([dx, dz]) => !inIsland(x + dx, z + dz)) // a closed (4-connected) ring

// ---- crosswalks and stop bars (4.2) ----------------------------------------------------------------------------------
// [x1, z1, x2, z2, the axis people walk along]. A zebra: 1-wide stripes with 1-wide gaps along the walking direction.
// Main x 1st and Main x 2nd on all four arms, Main at Hill Road on its three; and (not in the plan's table, the same
// rule) the three side-street mouths that cut a sidewalk: 2nd Street at Elm Road and at East Street, Birch Court at Hill.
const CROSSWALKS = [
  [437, 843, 460, 845, 'x'], [437, 862, 460, 864, 'x'], [433, 846, 436, 861, 'z'], [461, 846, 464, 861, 'z'], // Main x 1st
  [437, 987, 460, 989, 'x'], [437, 1006, 460, 1008, 'x'], [433, 990, 436, 1005, 'z'], [461, 990, 464, 1005, 'z'], // Main x 2nd
  [437, 1107, 460, 1109, 'x'], [433, 1110, 436, 1125, 'z'], [461, 1110, 464, 1125, 'z'], // Main at Hill Road
  [296, 990, 298, 1005, 'z'], [557, 990, 559, 1005, 'z'], [330, 1126, 345, 1128, 'x'] // the stop-sign mouths
]
const CW = new Map() // "x,z" -> 'stripe' | 'gap'
for (const [x1, z1, x2, z2, a] of CROSSWALKS) rect(x1, z1, x2, z2, (x, z) => {
  if (!isAsphalt(x, z)) throw new Error(`crosswalk cell ${x},${z} is not asphalt`)
  CW.set(key(x, z), ((a === 'x' ? x - x1 : z - z1) % 2 === 0) ? 'stripe' : 'gap')
})
const crossEnd = (x, z) => isWalk(x, z) && N4.some(([dx, dz]) => CW.has(key(x + dx, z + dz)))
// One white row across the lanes heading into a crosswalk (or a stop sign), 2 cells before it. Traffic keeps right:
// Main southbound x 439..447, northbound x 450..458; eastbound the south half of an E-W street, westbound the north half.
const STOPBARS = [
  [439, 841, 447, 841], [450, 866, 458, 866], [431, 855, 431, 859], [466, 848, 466, 852], // Main x 1st
  [439, 985, 447, 985], [450, 1010, 458, 1010], [431, 999, 431, 1003], [466, 992, 466, 996], // Main x 2nd
  [439, 1105, 447, 1105], [431, 1119, 431, 1123], [466, 1112, 466, 1116], // Main at Hill Road
  [300, 992, 300, 996], [555, 999, 555, 1003], [339, 1130, 345, 1130] // at the stop signs
]
// The near-side edge line is broken across the mouth of a T (cars turn there): Hill Road's north line across Main, Elm
// Road's east line and East Street's west line across 2nd Street, Hill Road's south line across Birch Court.
const MOUTHS = [[437, 1111, 460, 1111], [294, 990, 294, 1005], [561, 990, 561, 1005], [330, 1124, 345, 1124]]

// ---- GPS (8.4) -------------------------------------------------------------------------------------------------------
// GPS path nodes and links (8.4): the street nodes 1007..1031, the door nodes 1040..1049, and every link among them. The
// spine's link 1006-1007 across the module seam is the approach's (it lists 187..1006, 1050 and [1006, 1007]): not here.
// Hill Road's stretch 1013..1023 is the land module's: its node 1051 (HILL_STAIRS, the stair path's foot) splits it into
// 1013-1051-1023, so the loop is two chains here with no 1013-1023 (it would lie on top of those two).
const GPS = {
  nodes: [
    [1007, 448.5, 65, 730.5, 'MAIN_N'], [1008, 448.5, 65, 790.5, 'MAIN_SHOPS'], [1009, 448.5, 65, 853.5, 'MAIN_1ST'],
    [1010, 448.5, 65, 925.5, 'MAIN_GAS'], [1011, 448.5, 65, 997.5, 'MAIN_2ND'], [1012, 448.5, 65, 1055.5, 'MAIN_DEALER'],
    [1013, 448.5, 65, 1117.5, 'MAIN_HILL'], [1014, 360.5, 65, 853.5, ''], [1015, 520.5, 65, 853.5, ''],
    [1016, 295.0, 65, 861.0, 'NW_CORNER'], [1017, 561.0, 65, 861.0, 'NE_CORNER'], [1018, 288.0, 65, 911.5, 'ELM_SAFEHOUSE'],
    [1019, 288.0, 65, 997.5, 'ELM_2ND'], [1020, 288.0, 65, 1060.5, ''], [1021, 295.0, 65, 1111.0, 'SW_CORNER'],
    [1022, 337.5, 65, 1117.5, 'HILL_BIRCH'], [1023, 520.5, 65, 1117.5, ''], [1024, 561.0, 65, 1111.0, 'SE_CORNER'],
    [1025, 568.0, 65, 925.5, ''], [1026, 568.0, 65, 997.5, 'EAST_2ND'], [1027, 568.0, 65, 1053.5, 'EAST_SCRAP'],
    [1028, 360.5, 65, 997.5, ''], [1029, 520.5, 65, 997.5, ''], [1030, 337.5, 65, 1160.5, ''], [1031, 337.5, 65, 1176.5, 'BIRCH_CIRCLE'],
    [1040, 476.5, 65, 802.5, 'GUN_SHOP'], [1041, 431.5, 65, 804.5, 'DONUT'], [1042, 352.5, 65, 830.5, 'GARAGE'],
    [1043, 392.5, 65, 907.5, 'GAS'], [1044, 468.5, 65, 885.5, 'GEAR_SHOP'], [1045, 468.5, 65, 926.5, 'BAG_SHOP'],
    [1046, 501.5, 65, 1072.5, 'DEALER'], [1047, 267.5, 65, 911.5, 'SAFEHOUSE'], [1048, 584.5, 65, 1053.5, 'SCRAP_YARD'],
    [1049, 402.5, 65, 953.5, 'GAS_FORECOURT']
  ],
  links: (() => {
    const chain = ids => ids.slice(1).map((id, i) => [ids[i], id])
    return [
      ...chain([1007, 1008, 1009, 1010, 1011, 1012, 1013]),
      ...chain([1009, 1014, 1016, 1018, 1019, 1020, 1021, 1022, 1013]), // the loop, west half (Hill Road to Main)
      ...chain([1023, 1024, 1027, 1026, 1025, 1017, 1015, 1009]), // east half (1013-1051-1023: land's)
      ...chain([1011, 1028, 1019]), ...chain([1011, 1029, 1026]), ...chain([1022, 1030, 1031]),
      [1040, 1008], [1041, 1008], [1042, 1014], ...chain([1043, 1049, 1010]), [1044, 1010], [1045, 1010], [1046, 1012], [1047, 1018], [1048, 1027]
    ]
  })()
}
// The sidewalk cells a door node's link runs over (the cell's centre within 1 of the line): people follow those links
// from Main to a shop's door, so no post (lamp, pole, bin, hydrant) stands on one.
const ON_LINK = new Set()
{ const at = new Map(GPS.nodes.map(n => [n[0], n]))
  for (const [p, q] of GPS.links) {
    if (p < 1040 && q < 1040) continue
    const [, ax, , az] = at.get(p), [, bx, , bz] = at.get(q)
    rect(Math.floor(Math.min(ax, bx)) - 1, Math.floor(Math.min(az, bz)) - 1, Math.floor(Math.max(ax, bx)) + 1, Math.floor(Math.max(az, bz)) + 1, (x, z) => {
      if (isWalk(x, z) && segD(x + 0.5, z + 0.5, [ax, az], [bx, bz]) < 1) ON_LINK.add(key(x, z))
    })
  } }

// ---- furniture positions ---------------------------------------------------------------------------------------------
// Traffic lights (4.3): [pole x, z, arm dx, dz, arm length]. The pole on the corner square's outer cell, the arm over
// the lanes whose traffic comes toward that corner (each corner is the near-right corner of one approach). The prison's
// arm is 4 long, which only reaches the asphalt's first cell from here; like Jailbreak's (town_view_to_prison_tunnel),
// these reach over the approach's lanes: 8 over Main's (the head at x 441 / 456), 6 over a side street's (z +-6). So
// the heads hang over driving lanes, 2 higher than the prison's (trafficLight): 5.5 clear over the road.
const LIGHTS = [
  [433, 843, 1, 0, 8], [464, 843, 0, 1, 6], [464, 864, -1, 0, 8], [433, 864, 0, -1, 6], // Main x 1st: NW, NE, SE, SW
  [433, 987, 1, 0, 8], [464, 987, 0, 1, 6], [464, 1008, -1, 0, 8], [433, 1008, 0, -1, 6], // Main x 2nd
  // Main at Hill Road (a T): Main southbound, Hill westbound, and (the plan's two plus this one) Hill eastbound from the
  // south corner, which has a stop bar but would otherwise face no signal.
  [433, 1107, 1, 0, 8], [464, 1107, 0, 1, 6], [433, 1128, 0, -1, 6]
]
// Stop signs (4.3): [x, z, the face toward the traffic]. 2nd at Elm Road (westbound), 2nd at East Street (eastbound),
// Birch Court at Hill Road (northbound).
const STOPS = [[299, 988, 'east'], [556, 1007, 'west'], [347, 1130, 'south']]
// Street name signs: [x, z, the lower blade's y, the E-W street (a blade along x), the N-S street (a blade along z)].
// One per junction, mounted on a pole that's already there (the NW traffic light, the stop sign), and one on its own
// diorite post at the middle of each loop corner's outer sidewalk (r 33.5, 45 degrees).
const NAMES = [
  [433, 843, 68, '1st Street', 'Main Street'], [433, 987, 68, '2nd Street', 'Main Street'], [433, 1107, 68, 'Hill Road', 'Main Street'],
  [299, 988, 72, '2nd Street', 'Elm Road'], [556, 1007, 72, '2nd Street', 'East Street'], [347, 1130, 72, 'Hill Road', 'Birch Court'],
  [288, 854, 68, '1st Street', 'Elm Road'], [567, 854, 68, '1st Street', 'East Street'],
  [288, 1117, 68, 'Hill Road', 'Elm Road'], [567, 1117, 68, 'Hill Road', 'East Street']
]
const ARC_SIGNS = NAMES.slice(6)
// Manholes (the prison's, 5 x 5): in a lane, clear of every line. Main at z 760, 930 and 1060; one on each side street.
const MANHOLES = [[443, 760], [454, 930], [443, 1060], [372, 850], [500, 1001], [400, 1114], [284, 940], [571, 960], [342, 1150]]
// Trash bins on Main's sidewalks (lime concrete under an iron trapdoor lid): by the donut, the gun shop, gas, the shops.
// Each stands clear of the buildings' walkway mouths (WALKWAYS) and of the door nodes' GPS links (the donut's runs
// through z 790..804, the Gun Shop's crosses the sidewalk at z 795..798, the Bag Shop's runs along z 926).
const BINS = [[435, 813], [462, 792], [435, 921], [462, 940]]
// Fire hydrants (a red nether brick post on the sidewalk's outer cell), a few along Main, never in a walkway's mouth.
const HYDRANTS = [[433, 776], [464, 920], [433, 940], [464, 1045]]
// Where a building's walkway meets Main's sidewalk [x1, z1, x2, z2] (the sidewalk rows in front of it): the Gun Shop's
// (z 801..804), the Gear Shop's (884..887), the shops' plaza between the Gear and Bag Shops (900..911), the Bag Shop's
// red carpet (925..928), the donut's north walkway (780..781) and the gas station's (932..936). Kept free of posts.
const WALKWAYS = [[461, 801, 464, 804], [461, 884, 464, 887], [461, 900, 464, 911], [461, 925, 464, 928], [433, 780, 436, 781], [433, 932, 436, 936]]
// Cells kept free of lamps and poles (+-3; driveways and crosswalks keep +-6, the plan's rule): every post above, the
// walkway mouths, and the foot of the water tower's stair path on Hill Road's south sidewalk (x 498..500).
const RESERVED = new Set()
for (const [x, z] of [...LIGHTS, ...STOPS, ...ARC_SIGNS, ...BINS, ...HYDRANTS]) RESERVED.add(key(x, z))
for (const [x1, z1, x2, z2] of WALKWAYS) rect(x1, z1, x2, z2, (x, z) => RESERVED.add(key(x, z)))
for (let x = STAIRS[0]; x <= STAIRS[2]; x++) RESERVED.add(key(x, STAIRS[1] - 1))
for (const [x, z] of [...BINS, ...HYDRANTS]) if (ON_LINK.has(key(x, z))) throw new Error(`bin or hydrant ${x},${z} on a door's GPS link`)
// A sidewalk cell a post may stand near: a plain walk cell (no driveway cut, no crosswalk end).
const plain = (x, z) => isWalk(x, z) && !inDriveway(x, z) && !crossEnd(x, z)

// A sidewalk strip along a street: the post's line across (`at`), the strip's cells across (`a1..a2`), and its run
// (`from..to`) along `axis`. A post at t needs every strip cell in the rows t-6..t+6 to be plain, and nothing reserved
// in the rows t-3..t+3, and its own cell off every door's GPS link.
const strip = (axis, at, a1, a2, from, to) => ({ axis, at, a1, a2, from, to })
const cellOf = (st, t, a) => st.axis === 'z' ? [a, t] : [t, a]
const clearAt = (st, t) => {
  if (ON_LINK.has(key(...cellOf(st, t, st.at)))) return false
  for (let d = -6; d <= 6; d++) for (let a = st.a1; a <= st.a2; a++) {
    if (t + d < st.from || t + d > st.to) continue // rows past the strip's run (an arc, the bridge) don't count
    const [x, z] = cellOf(st, t + d, a); if (!plain(x, z) || (Math.abs(d) <= 3 && RESERVED.has(key(x, z)))) return false
  }
  return true
}
const nearestClear = (st, t, r, ok = u => clearAt(st, u)) => { for (let d = 0; d <= r; d++) for (const s of d ? [-d, d] : [0]) { const u = t + s; if (u >= st.from && u <= st.to && ok(u)) return u } return null }
// Lamps: every `step`, the first at `first`, each nudged to the nearest clear row within +-12; where a junction or a
// cut blocks all of that, the first clear row after it. `avoid`: the other side's lamps (Main): a row within 5 of one
// isn't taken, so the stagger survives the junctions (both sides' first clear row after a crosswalk is the same row).
function lampRow (st, first, step, avoid = []) {
  const out = [], ok = u => clearAt(st, u) && avoid.every(a => Math.abs(a - u) >= 6)
  for (let t = first; t <= st.to; ) {
    let u = nearestClear(st, t, 12, ok)
    if (u === null) for (let v = t + 13; v <= Math.min(st.to, t + step); v++) if (ok(v)) { u = v; break }
    if (u === null) { t += step; continue }
    if (!out.length || u - out[out.length - 1] >= step / 2) out.push(u)
    t = u + step
  }
  return out
}
// Power poles: fixed ends and anchors (a pole a service drop hangs from), the spans between them split evenly (about
// 24) and each pole nudged to the nearest clear row within +-10.
function poleRow (st, fixed) {
  const out = []
  for (let i = 0; i < fixed.length; i++) {
    if (!clearAt(st, fixed[i])) throw new Error(`pole ${st.axis}=${fixed[i]} at ${st.at} isn't clear`)
    out.push(fixed[i])
    if (i === fixed.length - 1) break
    const L = fixed[i + 1] - fixed[i], n = Math.max(1, Math.round(L / 24))
    for (let k = 1; k < n; k++) { const u = nearestClear(st, Math.round(fixed[i] + k * L / n), 10); if (u !== null && u > out[out.length - 1] + 8 && u < fixed[i + 1] - 8) out.push(u) }
  }
  return out
}
// The strips. Lamps go on the side without power poles (4.3); Main gets both sides, staggered.
const LAMP_STRIPS = [
  { st: strip('z', 435, 433, 436, 729, 1109), first: 735, step: 30, arm: [1, 0] }, // Main, west
  { st: strip('z', 462, 461, 464, 729, 1109), first: 780, step: 30, arm: [-1, 0] }, // Main, east: halfway between the west's 765 and 795 (the Gun Shop lot's cut fills 744..757)
  { st: strip('x', 863, 862, 864, 312, 543), first: 332, step: 40, arm: [0, -1] }, // 1st Street, south side
  { st: strip('x', 988, 987, 989, 296, 559), first: 316, step: 40, arm: [0, 1] }, // 2nd Street, north side
  { st: strip('x', 1127, 1126, 1128, 312, 543), first: 332, step: 40, arm: [0, -1] }, // Hill Road, south side
  { st: strip('z', 297, 296, 298, 878, 1093), first: 898, step: 40, arm: [-1, 0] }, // Elm Road, east side
  { st: strip('z', 577, 576, 578, 878, 1093), first: 898, step: 40, arm: [-1, 0] }, // East Street, east side
  { st: strip('z', 347, 346, 348, 1129, 1172), first: 1150, step: 40, arm: [-1, 0] } // Birch Court, east side
]
const LAMPS = [] // [x, z, dx, dz]
const LAMP_ROWS = []
for (const [i, { st, first, step, arm }] of LAMP_STRIPS.entries()) {
  LAMP_ROWS.push(lampRow(st, first, step, i === 1 ? LAMP_ROWS[0] : []))
  for (const t of LAMP_ROWS[i]) { const [x, z] = cellOf(st, t, st.at); LAMPS.push([x, z, ...arm]) }
}
// Birch Court's turning circle: two lamps on its sidewalk (r 17.5) east and west, arms toward the middle.
LAMPS.push([355, 1186, -1, 0], [320, 1186, 1, 0])
// The loop's four corner arcs: one lamp each at the arc's middle on its inner sidewalk (r ~14.8, 45 degrees), the arm
// reaching outward along x over the arc's inner lane. The straight strips stop where the arcs begin, which left 70..80
// blocks of the loop unlit at every corner (the name signs stand on the outer sidewalk there).
for (const c of CORNERS) {
  const d = 14.5 / Math.SQRT2, x = Math.floor(c.cx + c.sx * d), z = Math.floor(c.cz + c.sz * d)
  if (!plain(x, z) || [1, 2, 3].some(k => !isAsphalt(x + c.sx * k, z) && !isWalk(x + c.sx * k, z)) || !isAsphalt(x + c.sx * 3, z)) throw new Error(`arc lamp ${x},${z}`)
  LAMPS.push([x, z, c.sx, 0])
}
// Power lines (4.3): poles on the MIDDLE sidewalk cell (the crossarm spans the sidewalk), every ~24, poles at the loop
// arcs' ends. Two service drops cross a street: Elm Road's line feeds 2nd Street's (z 1007, across Elm), Hill Road's
// feeds Birch Court's (x 328, across Hill).
const POLE_STRIPS = [
  { id: 'elm', st: strip('z', 278, 277, 279, 878, 1093), fixed: [878, 1007, 1093], out: [-1, 0] }, // Elm Road, west side
  { id: 'second', st: strip('x', 1007, 1006, 1008, 296, 432), fixed: [305, 426], out: [0, 1] }, // 2nd Street, south side, west of Main
  { id: 'hill', st: strip('x', 1108, 1107, 1109, 312, 432), fixed: [312, 328, 426], out: [0, -1] }, // Hill Road, north side, west of Main
  { id: 'birch', st: strip('z', 328, 327, 329, 1126, 1172), fixed: [1135, 1158], out: [-1, 0] } // Birch Court, west side
]
const POLES = {} // id -> [t, ...]
for (const p of POLE_STRIPS) POLES[p.id] = poleRow(p.st, p.fixed)
const DROPS = [ // [axis, at, from, to]: a wire along `axis` at y 76 (the service drops)
  ['x', 1007, 280, 304], // Elm's pole at z 1007 (its arm end x 279) -> 2nd Street's first pole (x 305)
  ['z', 328, 1110, 1134] // Hill's pole at x 328 (its arm end z 1109) -> Birch Court's first pole (z 1135)
]

// ---- builders --------------------------------------------------------------------------------------------------------
const WIRE_Y = 76
// The surface: asphalt and its lines; sidewalks in light gray concrete with a smooth stone joint every 6 blocks across
// the walking direction (radial on the loop's corners); smooth stone aprons across every curb cut; Birch Court's island
// (grass inside a smooth stone ring, the ring's slabs: island()).
function surface () {
  for (const [k, c] of CELL) {
    const [x, z] = k.split(',').map(Number)
    if (inIsland(x, z)) { S(x, 64, z, islandRing(x, z) ? 'smooth_stone' : 'grass_block'); continue }
    if (c.kind === 'asphalt') { const l = lineAt(x, z); S(x, 64, z, l === 'yellow' ? 'yellow_concrete' : l === 'white' ? 'white_concrete' : pick(x, 64, z, MIX.asphalt)); continue }
    if (inDriveway(x, z)) { S(x, 64, z, 'smooth_stone'); continue }
    S(x, 64, z, jointAt(x, z, c) ? 'smooth_stone' : 'light_gray_concrete')
  }
}
// A sidewalk joint: every 6 blocks along the street the sidewalk belongs to; on a corner every 6 blocks of the centre
// arc (r 24) or, on the circle, of its sidewalk (r 17.5).
function jointAt (x, z, c) {
  const s = STREETS.find(q => q.id === c.street)
  if (c.street === 'corner') {
    const k = CORNERS.find(q => (x + 0.5 - q.cx) * q.sx >= 0 && (z + 0.5 - q.cz) * q.sz >= 0 && Math.abs(Math.hypot(x + 0.5 - q.cx, z + 0.5 - q.cz) - CORNER.r) < CORNER.half + CORNER.walk)
    if (!k) return false
    const a = Math.atan2(Math.abs(z + 0.5 - k.cz), Math.abs(x + 0.5 - k.cx)) * CORNER.r
    return Math.floor(a) % 6 === 0
  }
  if (c.street === 'birch' && z > 1172) return Math.floor((Math.atan2(z + 0.5 - CIRCLE.cz, x + 0.5 - CIRCLE.cx) + Math.PI) * 17.5) % 6 === 0
  if (!s) return false
  return ((s.axis === 'z' ? z : x) % 6 + 6) % 6 === 0
}
function markings () {
  for (const [x1, z1, x2, z2] of MOUTHS) rect(x1, z1, x2, z2, (x, z) => { if (isAsphalt(x, z)) S(x, 64, z, pick(x, 64, z, MIX.asphalt)) })
  for (const [k, v] of CW) { const [x, z] = k.split(',').map(Number); S(x, 64, z, v === 'stripe' ? 'white_concrete' : pick(x, 64, z, MIX.asphalt)) }
  for (const [x1, z1, x2, z2] of STOPBARS) rect(x1, z1, x2, z2, (x, z) => { if (!isAsphalt(x, z) || CW.has(key(x, z))) throw new Error(`stop bar cell ${x},${z}`); S(x, 64, z, 'white_concrete') })
}
// The prison's manhole (outdoors.js), on asphalt only and never on a line, crosswalk or bar.
function manhole (x, z) {
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    const r = Math.max(Math.abs(dx), Math.abs(dz))
    if (r === 2 && Math.abs(dx) + Math.abs(dz) === 4) continue
    const c = cellAt(x + dx, z + dz)
    if (!c || c.kind !== 'asphalt' || lineAt(x + dx, z + dz) || CW.has(key(x + dx, z + dz)) || inIsland(x + dx, z + dz)) throw new Error(`manhole ${x},${z}: cell ${x + dx},${z + dz} isn't plain asphalt`)
    S(x + dx, 64, z + dz, r === 0 ? 'iron_trapdoor[facing=north,half=top,open=false,powered=false,waterlogged=false]' : r === 1 ? 'polished_andesite' : 'smooth_stone')
  }
  S(x, 63, z, 'black_concrete') // the shaft under the cover (not in the prison's: there the dirt shows through the grate)
}
// Curbs (4.2): a bottom smooth stone slab at y 65 on every sidewalk cell touching asphalt on a side, except curb cuts
// and a crosswalk's ends (people and cars step off level there).
const CURBS = new Set()
let CURB_BRIDGES = 0 // the slabs that close up the curved curbs (the CLI reports them)
function curbs () {
  for (const [k, c] of CELL) {
    if (c.kind !== 'walk') continue
    const [x, z] = k.split(',').map(Number)
    if (inDriveway(x, z) || crossEnd(x, z)) continue
    if (N4.some(([dx, dz]) => isAsphalt(x + dx, z + dz))) { S(x, 65, z, 'smooth_stone_slab[type=bottom]'); CURBS.add(k) }
  }
  // The corner arcs' and the turning circle's curbs, closed up like the arcs' white lines: a curved curb's slabs touch
  // only at a corner in places (a jagged line), so a sidewalk cell beside each such join gets a slab too, never a curb
  // cut, a crosswalk's end or a cell a post stands on (a lamp never stands on a curb).
  const posts = new Set([...LAMPS, ...LIGHTS, ...STOPS, ...ARC_SIGNS, ...BINS, ...HYDRANTS].map(([x, z]) => key(x, z)))
  for (const p of POLE_STRIPS) for (const t of POLES[p.id]) posts.add(key(...cellOf(p.st, t, p.st.at)))
  const add = new Set()
  for (const k of CURBS) {
    const [x, z] = k.split(',').map(Number), st = cellAt(x, z).street
    if (st !== 'corner' && st !== 'birch') continue
    for (const dz of [1, -1]) {
      if (!CURBS.has(key(x + 1, z + dz)) || CURBS.has(key(x + 1, z)) || CURBS.has(key(x, z + dz))) continue
      const c = [[x + 1, z], [x, z + dz]].find(([cx, cz]) => isWalk(cx, cz) && !inDriveway(cx, cz) && !crossEnd(cx, cz) && !posts.has(key(cx, cz)))
      if (c) add.add(key(...c))
    }
  }
  for (const k of add) { const [x, z] = k.split(',').map(Number); S(x, 65, z, 'smooth_stone_slab[type=bottom]'); CURBS.add(k) }
  CURB_BRIDGES = add.size
}
// Birch Court's island: the ring's slabs on its smooth stone (surface() lays the grass and the ring) and an oak.
function island () {
  for (const k of CELL.keys()) { const [x, z] = k.split(',').map(Number); if (islandRing(x, z)) S(x, 65, z, 'smooth_stone_slab[type=bottom]') }
  oak(S, ...ISLAND.oak)
}
// A traffic light (the prison's design, 4.3, 2 higher) on a diorite pole: pole y 65..74 under a polished diorite cap,
// the arm at y 74 `len` cells toward (dx, dz), stair brackets under its first cell and at its middle, and the head
// hanging from the arm's end: red y 73, yellow 72, lime 71 facing the traffic it serves, a polished blackstone housing
// behind them (so the head reads as a signal box with its lamps on the drivers' side), on a dark top slab at y 70 under
// both. The prison's heads (2 lower) sit by the road's edge; these hang over the lanes, and the chase camera rides
// about y 68-69 (5.5 back at pitch 18, ~1.7 over the driver's eye): the head's underside at y 70.5 leaves 5.5 over the
// road, so the camera's wall check never pulls in under a signal. The street name blades on the pole stay at y 68/69.
// The traffic it serves runs along t = (-dz, dx) (toward the junction); the lamps face -t, the housing is at +t.
function trafficLight ([px, pz, dx, dz, len]) {
  for (let y = 65; y <= 74; y++) S(px, y, pz, 'diorite_wall')
  S(px, 75, pz, 'polished_diorite_slab[type=bottom]')
  for (let k = 1; k <= len; k++) S(px + dx * k, 74, pz + dz * k, 'diorite_wall')
  const back = dx > 0 ? 'west' : dx < 0 ? 'east' : dz > 0 ? 'north' : 'south' // a bracket's tall side faces the pole
  for (const k of [1, Math.floor(len / 2)]) S(px + dx * k, 73, pz + dz * k, `diorite_stairs[facing=${back},half=top,shape=straight,waterlogged=false]`)
  const hx = px + dx * len, hz = pz + dz * len, tx = -dz, tz = dx
  S(hx, 73, hz, 'red_concrete'); S(hx, 72, hz, 'yellow_concrete'); S(hx, 71, hz, 'lime_concrete')
  for (let y = 71; y <= 73; y++) S(hx + tx, y, hz + tz, 'polished_blackstone')
  S(hx + tx, 74, hz + tz, 'polished_blackstone_slab[type=bottom]')
  S(hx, 70, hz, 'polished_blackstone_slab[type=top]'); S(hx + tx, 70, hz + tz, 'polished_blackstone_slab[type=top]')
}
// The labels (text displays) don't depend on the Build: they're collected once at load by a dry run of the signs (see
// below the builders), so module.exports.labels is complete without a build (jail.js reads labels that way).
const LABELS = []
let COLLECT = false
const FACE = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }
// A label centred on a block face (x, y, z) facing `f`: 0.03 off the face, decimals always written.
const faceLabel = (x, y, z, f, text, color, scale, dy = 0.36) => {
  const [fx, fz] = FACE[f]
  if (COLLECT) LABELS.push({ x: fx ? x + (fx > 0 ? 1.03 : -0.03) : x + 0.5, y: y + dy, z: fz ? z + (fz > 0 ? 1.03 : -0.03) : z + 0.5, facing: f, text, color, scale })
}
// A stop sign (4.3), sized like Jailbreak's (modern_town_home: the sign about a third of the post's height): the post
// y 65..67, the sign a 3 x 3 red panel at y 68..70 in the plane facing the traffic (its bottom row stays over the head
// of anyone standing on a curb slab, y 67.3), "STOP" across its middle, and the post again at y 71 for the name blades.
function stopSign ([x, z, f]) {
  for (let y = 65; y <= 67; y++) S(x, y, z, 'polished_blackstone_wall')
  const [ax, az] = f === 'east' || f === 'west' ? [0, 1] : [1, 0] // along the sign's plane
  for (let y = 68; y <= 70; y++) for (const k of [-1, 0, 1]) S(x + ax * k, y, z + az * k, 'red_concrete')
  S(x, 71, z, 'polished_blackstone_wall')
  faceLabel(x, 69, z, f, 'STOP', '#ffffff', 2.6, 0.17)
}
// A street name blade: green concrete 3 long through (x, y, z) along `axis` (only over street cells), the name in
// white on both long faces. Text is about 0.15 x scale blocks a character wide.
function blade (x, y, z, axis, name) {
  const [ax, az] = axis === 'x' ? [1, 0] : [0, 1]
  const ks = [-1, 0, 1].filter(k => own(x + ax * k, y, z + az * k))
  for (const k of ks) S(x + ax * k, y, z + az * k, 'green_concrete')
  const len = ks.length, mid = (ks[0] + ks[ks.length - 1]) / 2
  const scale = Math.min(1.6, (len - 0.4) / (0.15 * name.length))
  if (COLLECT) for (const f of axis === 'x' ? ['north', 'south'] : ['west', 'east']) {
    const [fx, fz] = FACE[f]
    LABELS.push({
      x: axis === 'x' ? x + mid * ax + 0.5 : x + (fx > 0 ? 1.03 : -0.03), y: y + Math.round((0.5 - 0.125 * scale) * 100) / 100, // the text box (0.25 x scale tall) centred
      z: axis === 'z' ? z + mid * az + 0.5 : z + (fz > 0 ? 1.03 : -0.03), facing: f, text: name, color: '#ffffff', scale: Math.round(scale * 100) / 100
    })
  }
}
function nameSign ([x, z, y, ew, ns], ownPost) {
  if (ownPost) { for (let yy = 65; yy < y; yy++) S(x, yy, z, 'diorite_wall'); S(x, y + 2, z, 'polished_diorite_slab[type=bottom]') }
  blade(x, y, z, 'x', ew)
  blade(x, y + 1, z, 'z', ns)
}
// The power line's pole: stripped spruce y 65..77, the crossarm across the sidewalk at y 76 (the pole pokes 1 above it),
// small white insulators (end rods) on the arm's ends, and a transformer can (polished basalt) on every third pole, on
// the sidewalk's outer side.
function powerLine ({ id, st, out }) {
  const ts = POLES[id], across = st.axis === 'z' ? 'x' : 'z'
  ts.forEach((t, i) => {
    const [x, z] = cellOf(st, t, st.at)
    for (let y = 65; y <= 77; y++) S(x, y, z, 'stripped_spruce_log[axis=y]')
    for (const a of [st.a1, st.a2]) { const [cx, cz] = cellOf(st, t, a); S(cx, WIRE_Y, cz, `stripped_spruce_log[axis=${across}]`); S(cx, WIRE_Y + 1, cz, 'end_rod[facing=up]') }
    if (i % 3 === 1) { S(x + out[0], 72, z + out[1], 'polished_basalt[axis=y]'); S(x + out[0], 73, z + out[1], 'polished_basalt[axis=y]'); S(x + out[0], 74, z + out[1], 'polished_blackstone_slab[type=bottom]') }
  })
  for (let i = 1; i < ts.length; i++) for (let t = ts[i - 1] + 1; t < ts[i]; t++) for (const a of [st.a1, st.a2]) {
    const [cx, cz] = cellOf(st, t, a); S(cx, WIRE_Y, cz, `iron_chain[axis=${st.axis},waterlogged=false]`)
  }
}
// Storm drains: an iron trapdoor grate (closed, top half: flush with the road) in the gutter, the asphalt cell beside a
// curb, every 40 blocks on the straight streets, both sides; never on a line, crosswalk, stop bar or manhole.
const GUTTERS = [ // [axis, the gutter's line across, from, to]
  ['z', 437, 729, 1109], ['z', 460, 729, 1109], ['x', 846, 312, 543], ['x', 861, 312, 543], ['x', 990, 296, 559], ['x', 1005, 296, 559],
  ['x', 1110, 312, 543], ['x', 1125, 312, 543], ['z', 280, 878, 1093], ['z', 295, 878, 1093], ['z', 560, 878, 1093], ['z', 575, 878, 1093],
  ['z', 330, 1129, 1170], ['z', 345, 1129, 1170]
]
const DRAINS = []
function drains () {
  for (const [axis, at, from, to] of GUTTERS) {
    for (let t = from + 20; t <= to - 4; t += 40) {
      for (const d of [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5]) {
        const [x, z] = axis === 'z' ? [at, t + d] : [t + d, at]
        const c = cellAt(x, z)
        if (!c || c.kind !== 'asphalt' || lineAt(x, z) || inIsland(x, z) || CW.has(key(x, z)) || STOPBARS.some(([a, b, p, q]) => x >= a && x <= p && z >= b && z <= q)) continue
        if (MANHOLES.some(([mx, mz]) => Math.abs(mx - x) <= 3 && Math.abs(mz - z) <= 3)) continue
        if (!N4.some(([dx, dz]) => CURBS.has(key(x + dx, z + dz)))) continue // only beside a curb (not at a cut or a mouth)
        S(x, 63, z, 'black_concrete') // a dark pit under the grate (the world's dirt showed through it)
        S(x, 64, z, `iron_trapdoor[facing=${axis === 'z' ? 'north' : 'west'},half=top,open=false,powered=false,waterlogged=false]`)
        DRAINS.push([x, z]); break
      }
    }
  }
}
function bin ([x, z]) {
  S(x, 65, z, 'lime_concrete')
  S(x, 66, z, 'iron_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]')
}

// Night light: an invisible light block (no collision: people and cars pass through it) at head height under every
// lamp head and every traffic light's head, so each lamp leaves a lit pool on the road the way Jailbreak's do (a head
// at y 74 alone only lights the ground under it to about 6) and the junctions, where no lamp may stand, are lit too.
const GLOW = []
function glow (x, z) { if (isAsphalt(x, z) || isWalk(x, z)) { S(x, 66, z, 'light[level=15,waterlogged=false]'); GLOW.push([x, z]) } }

// The labels, once, at load (the signs' blocks go nowhere: a throwaway setter).
{ const keep = B; B = { set () {} }; COLLECT = true
  for (const s of STOPS) stopSign(s)
  for (const n of NAMES) nameSign(n, ARC_SIGNS.includes(n))
  COLLECT = false; B = keep }

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  CURBS.clear(); DRAINS.length = 0; MISSED.length = 0; GLOW.length = 0
  surface()
  markings()
  for (const [x, z] of MANHOLES) manhole(x, z)
  curbs()
  island()
  drains()
  for (const l of LIGHTS) { trafficLight(l); const [px, pz, dx, dz, len] = l; glow(px + dx * len, pz + dz * len) }
  for (const s of STOPS) stopSign(s)
  for (const n of NAMES) nameSign(n, ARC_SIGNS.includes(n))
  for (const [x, z, dx, dz] of LAMPS) { if (CURBS.has(key(x, z))) throw new Error(`lamp on a curb ${x},${z}`); streetLamp(S, x, z, dx, dz); glow(x + dx * 3, z + dz * 3) }
  for (const p of POLE_STRIPS) powerLine(p)
  for (const [a, at, from, to] of DROPS) for (let t = from; t <= to; t++) S(a === 'x' ? t : at, WIRE_Y, a === 'x' ? at : t, `iron_chain[axis=${a},waterlogged=false]`)
  for (const p of BINS) bin(p)
  for (const [x, z] of HYDRANTS) { S(x, 65, z, 'red_nether_brick_wall'); S(x, 66, z, 'red_nether_brick_slab[type=bottom]') }
  B = null
  return b
}
module.exports.build = () => module.exports()
module.exports.labels = LABELS
module.exports.displays = []
module.exports.points = {}
module.exports.setup = { regions: [], heists: [], keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], pois: [], walls: [], holos: [] }
module.exports.gps = GPS
module.exports.furniture = { lights: LIGHTS, stops: STOPS, names: NAMES, lamps: LAMPS, poles: POLES, drops: DROPS, manholes: MANHOLES, bins: BINS, hydrants: HYDRANTS, drains: DRAINS, glow: GLOW, missed: MISSED, crosswalks: CROSSWALKS, stopbars: STOPBARS }

// ---- CLI -------------------------------------------------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2)
  const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : args[i + 1] }
  const b = module.exports()
  const bb = b.bounds()
  console.log(`streets: ${b.blocks.size} blocks in ${CELL.size} columns, box ${bb.x1},${bb.y1},${bb.z1} to ${bb.x2},${bb.y2},${bb.z2}`)
  console.log(`  ${LIGHTS.length} traffic lights, ${STOPS.length} stop signs, ${NAMES.length} name signs, ${LAMPS.length} lamps, ` +
    `${Object.values(POLES).reduce((a, p) => a + p.length, 0)} power poles (${Object.entries(POLES).map(([k, v]) => `${k} ${v.join('/')}`).join('; ')}), ` +
    `${MANHOLES.length} manholes, ${DRAINS.length} drains, ${GLOW.length} light blocks, ${BINS.length} bins, ${HYDRANTS.length} hydrants, ${CROSSWALKS.length} crosswalks, ${STOPBARS.length} stop bars, ${ARC_WHITE.size} arc line joins, ${CURB_BRIDGES} curb joins, ${module.exports.labels.length} labels, ` +
    `${module.exports.gps.nodes.length} GPS nodes, ${module.exports.gps.links.length} links`)
  console.log(`  writes dropped outside the street columns: ${MISSED.length}${MISSED.length ? ' e.g. ' + JSON.stringify(MISSED.slice(0, 8)) : ''}`)
  const dir = opt('render', null)
  if (dir) {
    const path = require('path'), fs = require('fs')
    const R = require('../render.js')
    const px = Number(opt('px', 3))
    const views = opt('views', 'top,plan,iso').split(',')
    const ys = opt('y', '64,65').split(',').map(Number)
    // The preview only: render.js has no texture for smooth quartz (it would draw magenta), so it's drawn as quartz block;
    // the invisible light blocks are left out.
    const look = s => s.replace(/^(minecraft:)?smooth_quartz/, 'quartz_block')
    const crop = opt('crop', null)
    const [x1, z1, x2, z2] = crop ? crop.split(',').map(Number) : [-1e9, -1e9, 1e9, 1e9]
    const rb = new (require('../mcstruct').Build)()
    for (const [k, s] of b.blocks) { const [x, , z] = k.split(',').map(Number); if (x >= x1 && x <= x2 && z >= z1 && z <= z2 && !/^(minecraft:)?light\[/.test(s)) rb.blocks.set(k, look(s)) }
    if (args.includes('--ground')) { // the world's flat grass under the crop's unset columns, so the iso views read like the town
      const bb = rb.bounds()
      for (let x = Math.max(x1, bb.x1); x <= Math.min(x2, bb.x2); x++) for (let z = Math.max(z1, bb.z1); z <= Math.min(z2, bb.z2); z++) if (!rb.blocks.has(`${x},64,${z}`)) rb.blocks.set(`${x},64,${z}`, 'grass_block')
    }
    fs.mkdirSync(dir, { recursive: true })
    const name = opt('name', crop ? `streets-${crop.replace(/,/g, '_')}` : 'streets')
    const save = (suffix, img) => { const f = path.join(dir, `${name}-${suffix}.png`); fs.writeFileSync(f, img.png()); console.log(`wrote ${f} (${img.w}x${img.h})`) }
    if (views.includes('top')) save('top', R.top(rb, px))
    if (views.includes('plan')) for (const y of ys) save(`plan-y${y}`, R.plan(rb, y, px))
    if (views.includes('iso')) for (const d of (opt('iso', 'NE,SE,SW,NW')).split(',')) save(`iso-${d}`, R.iso(rb, d, Math.max(2, Math.round(px / 2))))
  }
}
