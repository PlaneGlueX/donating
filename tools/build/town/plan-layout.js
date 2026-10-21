'use strict'
// The town's site plan preview (tools/build/town/PLAN.md): COMMON exactly as in the plan, then a painter.
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

// ---------------------------------------------------------------------------------------------------------------------
// The plan's preview (not a town module, never pasted): paints the site plan's geometry from COMMON and PLAN.md's tables
// so render.js can show it. Streets, the river and the hills (groundTop) come from COMMON itself; buildings are their
// footprints at their roof height; gold blocks at y 100 are the gameplay spots.
//   node tools/build/render.js tools/build/town/plan-layout.js <outPrefix> --views top --px 2
//   CROP=x1,z1,x2,z2 limits it to a box (closer looks).
const FOOT = [ // [x1, z1, x2, z2, y, block]: buildings at their roof height, lots and aprons at y 64
  [466, 731, 554, 770, 64, 'gray_concrete'], [478, 776, 509, 831, 75, 'light_blue_terracotta'], [510, 786, 545, 821, 75, 'red_concrete'],
  [386, 731, 430, 780, 64, 'gray_concrete'], [386, 781, 400, 842, 64, 'gray_concrete'], [401, 782, 430, 827, 74, 'pink_concrete'], [400, 828, 431, 841, 74, 'gray_concrete'],
  [300, 752, 385, 786, 64, 'gray_concrete'], [300, 811, 385, 842, 64, 'gray_concrete'], [330, 787, 359, 810, 74, 'stone_bricks'],
  [392, 866, 432, 985, 64, 'gray_concrete'], [406, 876, 423, 941, 74, 'light_blue_stained_glass'], [370, 885, 391, 930, 73, 'light_blue_concrete'],
  [500, 868, 554, 984, 64, 'gray_concrete'], [470, 872, 495, 899, 73, 'white_concrete'], [470, 912, 497, 941, 74, 'red_concrete'], [470, 942, 491, 963, 83, 'magenta_stained_glass'],
  [470, 1011, 500, 1104, 64, 'gray_concrete'], [503, 1012, 542, 1059, 76, 'blue_stained_glass'], [503, 1060, 542, 1103, 96, 'blue_terracotta'],
  [236, 896, 258, 927, 79, 'bricks'], [259, 897, 266, 915, 71, 'dark_oak_planks'], [246, 929, 258, 938, 72, 'bricks'],
  [580, 1013, 661, 1099, 64, 'coarse_dirt'], [590, 1020, 601, 1029, 72, 'orange_terracotta'],
  [308, 877, 325, 902, 73, 'yellow_terracotta'], [308, 903, 319, 912, 72, 'white_concrete'], [308, 935, 325, 958, 80, 'light_blue_terracotta'], [308, 959, 319, 968, 72, 'white_concrete'],
  [309, 1018, 334, 1035, 73, 'white_terracotta'], [335, 1018, 344, 1029, 72, 'white_concrete'], [376, 1018, 399, 1035, 80, 'pink_concrete_powder'], [400, 1018, 409, 1029, 72, 'white_concrete'],
  [309, 1080, 334, 1097, 73, 'light_blue_concrete_powder'], [335, 1086, 344, 1097, 72, 'white_concrete'], [378, 1068, 423, 1097, 86, 'white_concrete'],
  [250, 956, 267, 979, 80, 'yellow_terracotta'], [256, 980, 267, 989, 72, 'white_concrete'], [250, 1010, 267, 1035, 73, 'white_concrete'], [256, 1036, 267, 1045, 72, 'white_concrete'],
  [256, 1064, 267, 1073, 72, 'white_concrete'], [250, 1074, 267, 1097, 80, 'stripped_birch_wood'],
  [300, 1139, 317, 1164, 73, 'pink_concrete_powder'], [312, 1215, 335, 1232, 80, 'light_blue_concrete_powder'], [358, 1139, 375, 1164, 73, 'yellow_terracotta']
]
const SPOTS = [[412, 801], [412, 802], [417, 826], [386, 914], [386, 915], [380, 890], [435, 804], [397, 907], [496, 803], [487, 880], [487, 891], [486, 927],
  [516, 1081], [516, 1071], [344, 806], [250, 911], [595, 1028], [632, 1068], [337, 800], [352, 800], [337, 824], [352, 824], [370, 835],
  [484, 1025], [484, 1085], [490, 1055], [303, 907], [303, 963], [340, 1013], [405, 1013], [340, 1102], [389, 1102], [272, 984], [272, 1040], [272, 1068],
  [322, 1167], [338, 1209], [353, 1167], [508, 1064], [508, 1100]]
const COLOR = { gunshop: 'red_wool', donut: 'pink_wool', garage: 'orange_wool', gas: 'cyan_wool', shops: 'purple_wool', dealer: 'blue_wool', safehouse: 'brown_wool', scrapyard: 'yellow_wool', houses: 'lime_wool' }
module.exports = () => {
  const b = new (require('../mcstruct').Build)()
  const P = (x, y, z, s) => b.set(x, y, z, s)
  for (let x = TOWN.x1; x <= TOWN.x2; x++) for (let z = TOWN.z1; z <= TOWN.z2; z++) {
    const o = ownerOf(x, z), r = riverAt(x, z)
    if (z <= BRIDGE.z2 && z >= BRIDGE.z1 && x >= 432 && x <= 465) { P(x, 64, z, x === 448 || x === 449 ? 'yellow_concrete' : x >= 437 && x <= 460 ? 'black_concrete' : 'light_gray_concrete'); continue }
    if (r) { if (r.water) P(x, WATER_Y, z, 'water'); else P(x, r.top, z, r.beach || r.top < 63 ? 'sand' : 'coarse_dirt'); continue }
    if (z < TOWN_Z) {
      if (x >= 429 && x <= 468) {
        const t = levelTop(approachLevel(z)), tun = z >= TUNNEL.z1 && z <= TUNNEL.z2
        P(x, t.full, z, tun ? (x >= TUNNEL.x1 && x <= TUNNEL.x2 ? 'smooth_stone' : 'light_gray_concrete') : x === 448 || x === 449 ? 'yellow_concrete'
          : x >= 437 && x <= 460 ? 'black_concrete' : x >= 433 && x <= 464 ? 'light_gray_concrete' : x <= 430 || x >= 467 ? 'stone_bricks' : 'grass_block')
        continue
      }
      const hh = groundTop(x, z)
      if (hh > 0) P(x, 64 + hh, z, hh > 25 ? 'stone' : 'grass_block')
      continue
    }
    const c = streetCell(x, z)
    if (c) { P(x, 64, z, c.kind === 'walk' ? (inDriveway(x, z) ? 'smooth_stone' : 'light_gray_concrete') : c.line === 'yellow' ? 'yellow_concrete' : c.line === 'white' ? 'white_concrete' : 'black_concrete'); continue }
    if (o !== 'land') {
      const bx = BOX[o].find(([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2)
      if (bx && (x === bx[0] || x === bx[2] || z === bx[1] || z === bx[3])) P(x, 65, z, COLOR[o])
      continue
    }
    const hh = groundTop(x, z)
    if (hh > 0) P(x, 64 + hh, z, inBox(x, z, [STAIRS]) ? 'stone_bricks' : 'grass_block')
    else if (orangeAt(x, z)) P(x, 64, z, 'red_sand')
  }
  for (const [x1, z1, x2, z2, y, s] of FOOT) rect(x1, z1, x2, z2, (x, z) => { if (!inStreet(x, z)) P(x, y, z, s) })
  for (const [x, z] of SPOTS) P(x, 100, z, 'gold_block')
  const cr = (process.env.CROP || '').split(',').map(Number)
  if (cr.length === 4) for (const k of [...b.blocks.keys()]) { const [x, , z] = k.split(',').map(Number); if (x < cr[0] || x > cr[2] || z < cr[1] || z > cr[3]) b.blocks.delete(k) }
  return b
}
