'use strict'
// houses: the town's 12 houses (tools/build/town/PLAN.md section 7; built by a cloud session 2026-10-21, section 15.6).
// Boxes: PLOTS H1..H12, every y; world `jailbreak`, ground y 64. Ten kit houses (ranch or two-storey, PLAN 7's colours,
// windows of opaque blue panels, an iron front door, a garage or a carport, the driveway where a car-theft contract's car
// waits, a mailbox, fenced back yards, shrubs and trees), H6 the modern home on its mound and H11 the rentable house with
// its butterfly roof and FOR SALE! sign. Locked shells: no insides. No server, no client here: the local session renders
// them and checks them in the client (handoff/2026-10-21/README.md).
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
  pawnshop: [[579, 940, 614, 985]], // Vic's Pawn Shop (section 15.4, 2026-10-21)
  poolhall: [[418, 1129, 479, 1172]], // the Broker's Pool Hall (section 15.5)
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
const MOD = 'houses'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s) }
const DB = { set: S }

// ---- PLAN 7's table: [x1, z1, x2, z2] rectangles, the face toward the street, the kit's kind and colours --------------
// Front doors are iron doors (closed): the houses are locked shells with no inside. Windows are Jailbreak's opaque blue
// panels (light blue stained glass in white frames, a white blind block right behind each glass cell).
const WALLS = {
  cream: 'smooth_sandstone', peach: 'white_terracotta', pink: 'cherry_planks', lavender: 'light_blue_terracotta',
  periwinkle: 'light_blue_concrete', // PLAN 7 names light blue concrete powder: powder falls over a window, so concrete
  white: (x, y, z) => pick(x, y, z, MIX.white), tan: 'stripped_birch_wood[axis=y]', yellow: 'yellow_terracotta'
}
const ROOFS = { brown: ['spruce_planks', 'spruce_slab'], navy: ['deepslate_tiles', 'deepslate_tile_slab'],
  slate: ['polished_andesite', 'polished_andesite_slab'], maroon: ['mangrove_planks', 'mangrove_slab'] }
const H = [
  { id: 'H1', plot: PLOTS.H1, face: 'west', kind: 'ranch', wall: 'cream', roof: 'brown', house: [308, 877, 325, 902], garage: [308, 903, 319, 912], drive: [299, 905, 307, 909], door: [308, 889], spot: [303.5, 65, 907.5, 90] },
  { id: 'H2', plot: PLOTS.H2, face: 'west', kind: 'two', wall: 'lavender', roof: 'navy', house: [308, 935, 325, 958], garage: [308, 959, 319, 968], drive: [299, 961, 307, 965], door: [308, 946], spot: [303.5, 65, 963.5, 90] },
  { id: 'H3', plot: PLOTS.H3, face: 'north', kind: 'ranch', wall: 'peach', roof: 'maroon', house: [309, 1018, 334, 1035], garage: [335, 1018, 344, 1029], drive: [338, 1009, 342, 1017], door: [321, 1018], spot: [340.5, 65, 1013.5, 180] },
  { id: 'H4', plot: PLOTS.H4, face: 'north', kind: 'two', wall: 'pink', roof: 'slate', house: [376, 1018, 399, 1035], garage: [400, 1018, 409, 1029], drive: [403, 1009, 407, 1017], door: [387, 1018], spot: [405.5, 65, 1013.5, 180] },
  { id: 'H5', plot: PLOTS.H5, face: 'south', kind: 'ranch', wall: 'periwinkle', roof: 'brown', house: [309, 1080, 334, 1097], garage: [335, 1086, 344, 1097], drive: [338, 1098, 342, 1106], door: [321, 1097], spot: [340.5, 65, 1102.5, 0] },
  { id: 'H7', plot: PLOTS.H7, face: 'east', kind: 'two', wall: 'yellow', roof: 'brown', house: [250, 956, 267, 979], garage: [256, 980, 267, 989], drive: [268, 982, 276, 986], door: [267, 967], spot: [272.5, 65, 984.5, -90] },
  { id: 'H8', plot: PLOTS.H8, face: 'east', kind: 'ranch', wall: 'white', roof: 'navy', house: [250, 1010, 267, 1035], garage: [256, 1036, 267, 1045], drive: [268, 1038, 276, 1042], door: [267, 1022], spot: [272.5, 65, 1040.5, -90] },
  { id: 'H9', plot: PLOTS.H9, face: 'east', kind: 'two', wall: 'tan', roof: 'maroon', house: [250, 1074, 267, 1097], garage: [256, 1064, 267, 1073], drive: [268, 1066, 276, 1070], door: [267, 1085], spot: [272.5, 65, 1068.5, -90] },
  { id: 'H10', plot: PLOTS.H10, face: 'east', kind: 'ranch', wall: 'pink', roof: 'slate', house: [300, 1139, 317, 1164], carport: [306, 1165, 317, 1169], drive: [318, 1165, 326, 1169], door: [317, 1151], spot: [322.5, 65, 1167.5, -90] },
  { id: 'H12', plot: PLOTS.H12, face: 'west', kind: 'ranch', wall: 'cream', roof: 'brown', house: [358, 1139, 375, 1164], carport: [358, 1165, 369, 1169], drive: [349, 1165, 357, 1169], door: [358, 1151], spot: [353.5, 65, 1167.5, 90] }
]
const H6 = { id: 'H6', plot: PLOTS.H6, face: 'south', A: [378, 1074, 399, 1097], Bw: [400, 1068, 423, 1093], C: [402, 1094, 408, 1101],
  drive: [387, 1098, 391, 1106], door: [405, 1093], spot: [389.5, 65, 1102.5, 0] }
const H11 = { id: 'H11', plot: PLOTS.H11, face: 'north', house: [312, 1215, 335, 1232], carport: [336, 1215, 345, 1226],
  drive: [336, 1205, 340, 1214], door: [324, 1215], spot: [338.5, 65, 1209.5, 180], sign: [322, 1208] }

// ---- geometry helpers: a plot's street edge and depth --------------------------------------------------------------
const OUT = { west: [-1, 0], east: [1, 0], north: [0, -1], south: [0, 1] }
const inR = ([x1, z1, x2, z2], x, z) => x >= x1 && x <= x2 && z >= z1 && z <= z2
const along = face => face === 'west' || face === 'east' ? 'z' : 'x'
// the cell at (u along the face, d deep from the plot's street edge)
const cellAt = (p, u, d) => p.face === 'west' ? [p.plot[0] + d, u] : p.face === 'east' ? [p.plot[2] - d, u] : p.face === 'north' ? [u, p.plot[1] + d] : [u, p.plot[3] - d]
const depthOf = (p, x, z) => p.face === 'west' ? x - p.plot[0] : p.face === 'east' ? p.plot[2] - x : p.face === 'north' ? z - p.plot[1] : p.plot[3] - z
const uOf = (p, x, z) => along(p.face) === 'z' ? z : x
const uRange = p => along(p.face) === 'z' ? [p.plot[1], p.plot[3]] : [p.plot[0], p.plot[2]]
const frontDepth = p => depthOf(p, ...(p.face === 'west' ? [p.house[0], p.house[1]] : p.face === 'east' ? [p.house[2], p.house[1]] : p.face === 'north' ? [p.house[0], p.house[1]] : [p.house[0], p.house[3]]))
const SLAB = (s, t) => `${s}[type=${t},waterlogged=false]`

// a stepped roof surface: k half-steps above yBase (0 = a bottom slab at yBase)
function roofCell (x, z, k, yBase, full, slab) {
  const n = Math.floor(k / 2)
  for (let y = yBase; y < yBase + n; y++) S(x, y, z, full)
  S(x, yBase + n, z, SLAB(slab, k % 2 ? 'top' : 'bottom'))
}

// a box's walls with windows (each window 2 wide and 2 high, a frame ring round it, a blind behind each glass cell)
function walls (r, yTop, wall, opts) {
  const [x1, z1, x2, z2] = r
  for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) {
    const e = x === x1 || x === x2 || z === z1 || z === z2
    if (!e) { if (opts.hollow !== false) for (let y = 65; y <= yTop; y++) S(x, y, z, 'air'); continue }
    S(x, 64, z, opts.base || 'stone_bricks')
    for (let y = 65; y <= yTop; y++) S(x, y, z, y === opts.band ? 'white_concrete' : wall)
  }
  if (!opts.windows) return
  const frame = opts.frame || 'white_concrete', glass = opts.glass || 'light_blue_stained_glass'
  for (const side of ['west', 'east', 'north', 'south']) {
    const fixed = side === 'west' ? x1 : side === 'east' ? x2 : side === 'north' ? z1 : z2
    const [u1, u2] = side === 'west' || side === 'east' ? [z1, z2] : [x1, x2]
    const [ox, oz] = OUT[side]
    const at = u => side === 'west' || side === 'east' ? [fixed, u] : [u, fixed]
    const ok = u => { // a window column: the outside cell free of the garage, away from the door and the corners
      const [x, z] = at(u)
      if (u < u1 + 2 || u > u2 - 2) return false
      if ((opts.blocked || []).some(b => inR(b, x + ox, z + oz))) return false
      if (opts.door && opts.doorSide === side && Math.abs(uOfSide(side, opts.door) - u) <= 2) return false
      return true
    }
    for (let u = u1 + 2; u + 1 <= u2 - 2; u += 5) {
      if (!ok(u) || !ok(u + 1)) continue
      for (const [ya, yb] of opts.rows) {
        for (let du = -1; du <= 2; du++) for (let y = ya - 1; y <= yb + 1; y++) {
          const [x, z] = at(u + du)
          const g = du >= 0 && du <= 1 && y >= ya && y <= yb
          S(x, y, z, g ? glass : frame)
          if (g) S(x - ox, y, z - oz, 'white_concrete') // the blind
        }
      }
    }
  }
}
const uOfSide = (side, [x, z]) => side === 'west' || side === 'east' ? z : x

// ---- the kit house -----------------------------------------------------------------------------------------------------
function kitHouse (p) {
  const wall = WALLS[p.wall], [rFull, rSlab] = ROOFS[p.roof]
  const yTop = p.kind === 'two' ? 78 : 71, yRoof = yTop + 1
  // the ground of the plot
  for (let x = p.plot[0]; x <= p.plot[2]; x++) for (let z = p.plot[1]; z <= p.plot[3]; z++) S(x, 64, z, 'grass_block')
  // the garage (or the carport) first, so the house's roof overhang lies over it
  if (p.garage) {
    walls(p.garage, 71, wall, { windows: false })
    F(p.garage[0], 72, p.garage[1], p.garage[2], 72, p.garage[3], rFull)
    // the garage door: on the face toward the driveway, 5 wide, 4 high, white rows, a dark head over it
    const g = p.garage, d = p.drive, side = p.face
    for (let u = along(side) === 'z' ? d[1] : d[0]; u <= (along(side) === 'z' ? d[3] : d[2]); u++) {
      const fx = side === 'west' ? g[0] : side === 'east' ? g[2] : u, fz = side === 'north' ? g[1] : side === 'south' ? g[3] : u
      for (let y = 65; y <= 68; y++) S(fx, y, fz, y % 2 ? 'smooth_quartz' : 'white_concrete')
      S(fx, 69, fz, 'light_gray_concrete')
    }
  }
  if (p.carport) {
    const [x1, z1, x2, z2] = p.carport
    for (const [x, z] of [[x1, z1], [x1, z2], [x2, z1], [x2, z2]]) F(x, 65, z, x, 68, z, 'stripped_birch_log[axis=y]')
    F(x1, 64, z1, x2, 64, z2, 'smooth_stone')
    for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) {
      const e = x === x1 || x === x2 || z === z1 || z === z2
      S(x, 69, z, e ? rFull : SLAB(rSlab, 'top'))
    }
  }
  // the house: walls, windows (2 rows on a two-storey), a white band at the upper floor's line
  const blocked = [p.garage, p.carport].filter(Boolean)
  walls(p.house, yTop, wall, { windows: true, rows: p.kind === 'two' ? [[66, 67], [74, 75]] : [[66, 67]], band: p.kind === 'two' ? 71 : null,
    blocked, door: p.door, doorSide: p.face })
  // the roof: a low mono-pitch shed roof in slabs (low at the street, 4 half-steps up to the back), overhang 1
  const [x1, z1, x2, z2] = p.house
  for (let x = x1 - 1; x <= x2 + 1; x++) for (let z = z1 - 1; z <= z2 + 1; z++) {
    if ((p.garage && inR(p.garage, x, z)) || (p.carport && inR(p.carport, x, z))) continue // never over the garage or carport
    const front = p.face === 'west' ? x1 - 1 : p.face === 'east' ? x2 + 1 : p.face === 'north' ? z1 - 1 : z2 + 1
    const back = p.face === 'west' ? x2 + 1 : p.face === 'east' ? x1 - 1 : p.face === 'north' ? z2 + 1 : z1 - 1
    const c = along(p.face) === 'z' ? x : z
    const t = (c - front) / (back - front + (back > front ? 1 : -1))
    roofCell(x, z, Math.min(3, Math.floor(4 * t)), yRoof, rFull, rSlab)
  }
  // the front door: an iron door in a white frame, a slab canopy over it, a slab doorstep, the walk to the street
  const [dx, dz] = p.door, [ox, oz] = OUT[p.face]
  const uDoor = uOf(p, dx, dz)
  const facing = { west: 'east', east: 'west', north: 'south', south: 'north' }[p.face] // the door's outward side
  for (let du = -1; du <= 1; du++) for (let y = 65; y <= 67; y++) {
    const [x, z] = along(p.face) === 'z' ? [dx, dz + du] : [dx + du, dz]
    if (du === 0 && y <= 66) continue
    S(x, y, z, 'white_concrete')
    if (y === 67) S(x + ox, 68, z + oz, SLAB(rSlab, 'bottom'))
  }
  door(DB, dx, 65, dz, facing)
  S(dx + ox, 65, dz + oz, SLAB('smooth_stone_slab', 'bottom'))
  const fd = depthOf(p, dx + ox, dz + oz)
  for (let d = 0; d < fd; d++) for (const du of [0, 1]) { const [x, z] = cellAt(p, uDoor + du, d); S(x, 64, z, 'light_gray_concrete') }
  // the driveway
  F(p.drive[0], 64, p.drive[1], p.drive[2], 64, p.drive[3], 'smooth_stone')
  // the mailbox beside the driveway, 1 inside the plot (the side away from the house's door)
  const du0 = along(p.face) === 'z' ? p.drive[1] : p.drive[0], du1 = along(p.face) === 'z' ? p.drive[3] : p.drive[2]
  const uMail = uDoor < du0 ? du1 + 1 : du0 - 1, [mx, mz] = cellAt(p, uMail, 1)
  S(mx, 65, mz, 'birch_fence[east=false,north=false,south=false,waterlogged=false,west=false]'); S(mx, 66, mz, 'smooth_quartz')
  const [fx, fz] = along(p.face) === 'z' ? [0, uDoor < du0 ? 1 : -1] : [uDoor < du0 ? 1 : -1, 0]
  const bf = fx === 1 ? 'east' : fx === -1 ? 'west' : fz === 1 ? 'south' : 'north'
  S(mx + fx, 66, mz + fz, `crimson_button[face=wall,facing=${bf},powered=false]`)
  yardDress(p, [uDoor, uDoor + 1], [du0, du1])
}

// the fences (dark oak, 2 high: the back and side yards behind the house's front line), shrubs along the front, trees
function yardDress (p, walkU, driveU) {
  const [u1, u2] = uRange(p), fd = frontDepth(p)
  const backD = depthOf(p, ...(p.face === 'west' ? [p.plot[2], 0] : p.face === 'east' ? [p.plot[0], 0] : p.face === 'north' ? [0, p.plot[3]] : [0, p.plot[1]]))
  const blds = [p.house, p.garage, p.carport, p.A, p.Bw].filter(Boolean)
  const fence = (u, d, y0 = 64) => { const [x, z] = cellAt(p, u, d); S(x, y0 + 1, z, 'dark_oak_fence[east=false,north=false,south=false,waterlogged=false,west=false]'); S(x, y0 + 2, z, 'dark_oak_fence[east=false,north=false,south=false,waterlogged=false,west=false]') }
  const groundY = p.groundY || (() => 64)
  for (let d = fd; d <= backD; d++) { const [ax, az] = cellAt(p, u1, d), [bx, bz] = cellAt(p, u2, d); fence(u1, d, groundY(ax, az)); fence(u2, d, groundY(bx, bz)) }
  for (let u = u1; u <= u2; u++) { const [x, z] = cellAt(p, u, backD); fence(u, backD, groundY(x, z)) }
  // across the front line from each side to the first building cell
  const onLine = u => { const [x, z] = cellAt(p, u, fd); return blds.some(r => inR(r, x, z)) }
  for (let u = u1 + 1; u < u2 && !onLine(u); u++) { const [x, z] = cellAt(p, u, fd); fence(u, fd, groundY(x, z)) }
  for (let u = u2 - 1; u > u1 && !onLine(u); u--) { const [x, z] = cellAt(p, u, fd); fence(u, fd, groundY(x, z)) }
  // shrubs one out from the front wall, clear of the walk, the driveway and the door
  for (let u = u1 + 3; u <= u2 - 3; u += 3) {
    if (u >= walkU[0] - 2 && u <= walkU[1] + 2) continue
    if (u >= driveU[0] - 1 && u <= driveU[1] + 1) continue
    const [x, z] = cellAt(p, u, fd - 1)
    if (!blds.some(r => inR(r, ...cellAt(p, u, fd)))) continue
    shrub(S, x, z, groundY(x, z))
  }
  // a tree in the front yard (4 from every edge and 3 from the walk and the driveway) when there's room, one in the back
  const fy = Math.floor(fd / 2)
  if (fd >= 9) {
    for (const u of [u1 + 5, u2 - 5]) {
      if (Math.abs(u - walkU[0]) < 5 || (u >= driveU[0] - 4 && u <= driveU[1] + 4)) continue
      const [x, z] = cellAt(p, u, fy); oak(S, x, z, groundY(x, z)); break
    }
  }
  const [bx, bz] = cellAt(p, Math.floor((u1 + u2) / 2) + 3, backD - 5)
  if (backD - 5 > fd + 2 && !blds.some(r => inR([r[0] - 3, r[1] - 3, r[2] + 3, r[3] + 3], bx, bz))) oak(S, bx, bz, groundY(bx, bz))
}

// ---- H6: the modern home on a mound (PLAN 7) ----------------------------------------------------------------------------
function modernHome () {
  const p = H6, [px1, pz1, px2, pz2] = p.plot
  const dist = (x, z) => Math.min(...[p.A, p.Bw, p.C].map(([a, b, c, d]) => Math.max(a - x, 0, x - c) + Math.max(b - z, 0, z - d)))
  // the mound: ground up to y 66 near the house, 65 a ring further out, never on the driveway (its sides retained)
  const gY = (x, z) => inR(p.drive, x, z) ? 64 : dist(x, z) <= 6 ? 66 : dist(x, z) <= 9 ? 65 : 64
  p.groundY = gY
  for (let x = px1; x <= px2; x++) for (let z = pz1; z <= pz2; z++) {
    if ([p.A, p.Bw, p.C].some(r => inR(r, x, z))) continue
    const top = gY(x, z)
    for (let y = 64; y < top; y++) S(x, y, z, inR([p.drive[0] - 1, p.drive[1], p.drive[2] + 1, p.drive[3]], x, z) ? 'stone_bricks' : 'dirt')
    S(x, top, z, inR(p.drive, x, z) ? 'smooth_stone' : fieldN(x, z, 5, 23) > 0.72 ? pick(x, top, z, MIX.orange) : 'grass_block')
  }
  // A: a white box, 2 storeys (y 64..80), big corner windows; the navy garage door with a strip of 4 windows
  walls(p.A, 80, (x, y, z) => pick(x, y, z, MIX.white), { windows: false })
  for (let x = p.A[0]; x <= p.A[2]; x++) for (let z = p.A[1]; z <= p.A[3]; z++) S(x, 81, z, h(x, 81, z) < 30 ? 'calcite' : 'smooth_quartz')
  for (let x = p.A[0]; x <= p.A[2]; x++) for (const z of [p.A[1], p.A[3]]) S(x, 82, z, SLAB('smooth_quartz_slab', 'bottom'))
  for (let z = p.A[1]; z <= p.A[3]; z++) S(p.A[0], 82, z, SLAB('smooth_quartz_slab', 'bottom'))
  const corner = (x, y, z, bx, bz) => { S(x, y, z, 'light_blue_stained_glass'); S(bx, y, bz, 'white_concrete') }
  for (let y = 73; y <= 78; y++) {
    for (let z = p.A[3] - 7; z <= p.A[3]; z++) corner(p.A[0], y, z, p.A[0] + 1, z)       // the west face's corner window
    for (let x = p.A[0]; x <= p.A[0] + 7; x++) corner(x, y, p.A[3], x, p.A[3] - 1)       // round the corner on the south face
    for (let z = p.A[1]; z <= p.A[1] + 7; z++) corner(p.A[0], y, z, p.A[0] + 1, z)       // the north-west corner too
  }
  for (let y = 66; y <= 69; y++) for (let z = p.A[1] + 3; z <= p.A[1] + 12; z++) corner(p.A[0], y, z, p.A[0] + 1, z)
  for (let x = 387; x <= 391; x++) for (let y = 65; y <= 68; y++) S(x, y, p.A[3], y === 67 && x !== 389 ? 'light_blue_stained_glass' : y % 2 ? 'blue_terracotta' : 'blue_concrete')
  for (let x = 386; x <= 392; x++) S(x, 69, p.A[3], 'black_concrete')
  // B: the lavender-grey tall wing (y 64..86) with cyan ribbon windows
  walls(p.Bw, 86, 'light_gray_terracotta', { windows: false })
  for (let x = p.Bw[0]; x <= p.Bw[2]; x++) for (let z = p.Bw[1]; z <= p.Bw[3]; z++) {
    const e = x === p.Bw[0] || x === p.Bw[2] || z === p.Bw[1] || z === p.Bw[3]
    S(x, 87, z, e ? 'light_gray_terracotta' : 'polished_deepslate'); if (e) S(x, 88, z, SLAB('polished_deepslate_slab', 'bottom'))
  }
  for (const [ya, yb] of [[69, 70], [75, 76], [81, 82]]) for (let y = ya; y <= yb; y++) {
    for (let x = p.Bw[0] + 2; x <= p.Bw[2] - 2; x++) for (const [z, iz] of [[p.Bw[1], p.Bw[1] + 1], [p.Bw[3], p.Bw[3] - 1]]) {
      if (z === p.Bw[3] && x >= p.C[0] - 1 && x <= p.C[2] + 1 && y <= 70) continue // the entrance
      S(x, y, z, 'cyan_stained_glass'); S(x, y, iz, 'white_concrete')
    }
    for (let z = p.Bw[1] + 2; z <= p.Bw[3] - 2; z++) { S(p.Bw[2], y, z, 'cyan_stained_glass'); S(p.Bw[2] - 1, y, z, 'white_concrete')
      if (!inR(p.A, p.Bw[0] - 1, z) || y > 80) { S(p.Bw[0], y, z, 'cyan_stained_glass'); S(p.Bw[0] + 1, y, z, 'white_concrete') } }
  }
  // C: concrete stairs with parapets up to the front door (the landing at y 68: feet at 69)
  const [cx1, cz1, cx2, cz2] = p.C
  for (let z = cz1; z <= cz2; z++) {
    const step = z <= 1097 ? null : 1101 - z // 0..3 for z 1101..1098
    const top = step === null ? 68 : 65 + step
    for (let x = cx1 + 1; x <= cx2 - 1; x++) {
      for (let y = 64; y < top; y++) S(x, y, z, 'light_gray_concrete')
      S(x, top, z, step === null ? 'light_gray_concrete' : 'polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]')
      for (let y = top + 1; y <= 71; y++) S(x, y, z, 'air')
    }
    for (const x of [cx1, cx2]) for (let y = 64; y <= top + 1; y++) S(x, y, z, 'light_gray_concrete')
  }
  door(DB, p.door[0], 69, p.door[1], 'north')
  for (const x of [p.door[0] - 1, p.door[0] + 1]) for (let y = 69; y <= 71; y++) S(x, y, p.door[1], 'black_concrete')
  S(p.door[0], 71, p.door[1], 'black_concrete')
  F(p.drive[0], 64, p.drive[1], p.drive[2], 64, p.drive[3], 'smooth_stone')
  // the mailbox (east of the driveway, 1 inside the plot), the fences, shrubs and trees on the mound
  S(393, 65, pz2 - 1, 'birch_fence[east=false,north=false,south=false,waterlogged=false,west=false]'); S(393, 66, pz2 - 1, 'smooth_quartz')
  S(394, 66, pz2 - 1, 'crimson_button[face=wall,facing=east,powered=false]')
  yardDress({ ...p, house: [p.A[0], p.Bw[1], p.Bw[2], p.A[3]] }, [p.C[0] + 1, p.C[2] - 1], [p.drive[0], p.drive[2]])
}

// ---- H11: the rentable house (PLAN 7) ----------------------------------------------------------------------------------
function rentable () {
  const p = H11, [x1, z1, x2, z2] = p.house
  for (let x = p.plot[0]; x <= p.plot[2]; x++) for (let z = p.plot[1]; z <= p.plot[3]; z++) S(x, 64, z, 'grass_block')
  walls(p.house, 78, 'light_blue_concrete', { windows: false, band: 71 })
  // the 2 x 2 window grid with black frames on every face, both storeys (the front's middle left for the door)
  for (const [ya, yb] of [[66, 67], [74, 75]]) {
    for (const [z, iz] of [[z1, z1 + 1], [z2, z2 - 1]]) for (let x = x1 + 2; x + 1 <= x2 - 2; x += 4) {
      if (z === z1 && ya < 70 && x + 1 >= p.door[0] - 1 && x <= p.door[0] + 1) continue
      for (let dx = -1; dx <= 2; dx++) for (let y = ya - 1; y <= yb + 1; y++) {
        const g = dx >= 0 && dx <= 1 && y >= ya && y <= yb
        S(x + dx, y, z, g ? 'light_blue_stained_glass' : 'black_concrete'); if (g) S(x + dx, y, iz, 'white_concrete')
      }
    }
    for (const [x, ix] of [[x1, x1 + 1]]) for (let z = z1 + 2; z + 1 <= z2 - 2; z += 4) for (let dz = -1; dz <= 2; dz++) for (let y = ya - 1; y <= yb + 1; y++) {
      const g = dz >= 0 && dz <= 1 && y >= ya && y <= yb
      S(x, y, z + dz, g ? 'light_blue_stained_glass' : 'black_concrete'); if (g) S(ix, y, z + dz, 'white_concrete')
    }
  }
  // the butterfly roof: low in the middle (x 323..324), rising to the edges, a deep blue-purple fascia all round
  const mid = (x1 + x2) / 2
  for (let x = x1 - 1; x <= x2 + 1; x++) for (let z = z1 - 1; z <= z2 + 1; z++) {
    const k = Math.min(6, Math.round(6 * Math.abs(x - mid) / ((x2 - x1) / 2 + 1)))
    const edge = x === x1 - 1 || x === x2 + 1 || z === z1 - 1 || z === z2 + 1
    if (edge) { for (let y = 79; y <= 79 + Math.floor(k / 2); y++) S(x, y, z, 'purple_terracotta') } else roofCell(x, z, k, 79, 'deepslate_tiles', 'deepslate_tile_slab')
  }
  // the door, the walk, the carport, the driveway, the mailbox
  const [dx, dz] = p.door
  for (const x of [dx - 1, dx + 1]) for (let y = 65; y <= 67; y++) S(x, y, dz, 'black_concrete')
  S(dx, 67, dz, 'black_concrete'); door(DB, dx, 65, dz, 'south'); S(dx, 65, dz - 1, SLAB('smooth_stone_slab', 'bottom'))
  for (let z = p.plot[1]; z < dz - 1; z++) for (const x of [dx, dx + 1]) S(x, 64, z, 'light_gray_concrete')
  const [cx1, cz1, cx2, cz2] = p.carport
  for (const [x, z] of [[cx1 + 1, cz1], [cx2, cz1], [cx2, cz2], [cx1 + 1, cz2]]) F(x, 65, z, x, 68, z, 'white_concrete')
  for (let x = cx1; x <= cx2; x++) for (let z = cz1; z <= cz2; z++) { S(x, 64, z, 'smooth_stone'); S(x, 69, z, x === cx2 || z === cz1 || z === cz2 ? 'purple_terracotta' : SLAB('quartz_slab', 'top')) }
  F(p.drive[0], 64, p.drive[1], p.drive[2], 64, p.drive[3], 'smooth_stone')
  S(342, 65, p.plot[1] + 1, 'birch_fence[east=false,north=false,south=false,waterlogged=false,west=false]'); S(342, 66, p.plot[1] + 1, 'smooth_quartz')
  S(343, 66, p.plot[1] + 1, 'crimson_button[face=wall,facing=east,powered=false]')
  // the FOR SALE! sign: a white board with a red bottom (x 321..323, y 66..67) on a white post
  const [sx, sz] = p.sign
  S(sx, 65, sz, 'white_concrete'); for (let x = sx - 1; x <= sx + 1; x++) { S(x, 66, sz, 'red_concrete'); S(x, 67, sz, 'calcite') }
  yardDress({ ...p, kind: 'two' }, [dx, dx + 1], [p.drive[0], p.drive[2]])
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  for (const p of H) kitHouse(p)
  modernHome(); rentable()
  B = null
  return b
}
module.exports.labels = [
  { x: 322.5, y: 66.95, z: 1207.97, facing: 'north', text: 'FOR SALE!', color: '#c62828', scale: 1.0 },
  { x: 322.5, y: 66.95, z: 1209.03, facing: 'south', text: 'FOR SALE!', color: '#c62828', scale: 1.0 }
]
module.exports.displays = []
module.exports.points = Object.fromEntries([...H, H6, H11].map(p => [`CARSPOT_${p.id}`, p.spot]))
module.exports.setup = {
  regions: [], heists: [], keepers: [], givers: [], crates: [],
  carSpots: [...H, H6, H11].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))).map(p => ({ at: p.spot, launch: true, cmd: '/dcontract spot add', note: `${p.id}'s driveway, facing the street` })),
  chops: [], garages: [], pois: [], walls: [], holos: [], pumps: []
}
module.exports.build = () => module.exports()

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}; ${module.exports.labels.length} labels, ${module.exports.displays.length} displays`)
}
