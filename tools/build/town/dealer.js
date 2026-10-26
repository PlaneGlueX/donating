'use strict'
// dealer: the 1M Dealership on Main Street's east side (tools/build/town/PLAN.md section 6.6; built by a cloud session
// 2026-10-21, section 15.6). Box x 465..556, z 1009..1106, every y; world `jailbreak`, ground y 64. Like Jailbreak's 1M
// Dealership: a lot with white stalls behind a strip of round oaks, a one-storey blue glass showroom wing with red fins and
// an orange neon fascia, and the three-floor navy tower with a glass curtain and the gold "1M" lit from behind. Inside the
// tower: the Car Dealer's sales desk, the garage attendant's desk (launch), four car bays for the City Garage site
// "dealer", the Supercar and Hypercar crate stands, switchback stairs to both upper floors, and cars on show on every
// floor (item displays of our car models; the Extreme cars on the top floor). No server, no client here: the local
// session renders it against the wiki and checks it in the client (handoff/2026-10-21/README.md).
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
const MOD = 'dealer'
const own = ownFor(MOD)
let B = null
// The module's setter, clipped to its columns (a state may be a function of x, y, z for the hashed mixes).
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s) }
const DB = { set: S } // for COMMON's door()

// ---- the plan's numbers (PLAN 6.6 and 8.2) -------------------------------------------------------------------------
// Box x 465..556, z 1009..1106 on Main's east side between 2nd Street and Hill Road. From Main: a grass strip with small
// round oaks (x 465..469), the lot (x 470..500, white stalls, Main's driveways z 1020..1031 and 1080..1091), a walk along
// the glass fronts (x 501..502), then the buildings: the wing (showroom 2) x 503..542, z 1012..1059, one tall storey
// (walls y 64..75, a white roof y 76), and the tower (the main showroom) x 503..542, z 1060..1103, three floors (slabs y
// 64, 75, 86; the roof grate y 96), its glass curtain on the west face, the "1M" in gold block letters in front of its
// upper floors (x 502, z 1072..1091, y 77..90). Inside the tower: the sales desk (x 515, z 1078..1085: the Car Dealer
// behind it), the garage attendant's desk (launch), four car bays (x 526..530) for the City Garage site "dealer", two
// crate stands (Supercar and Hypercar keys), switchback stairs (x 534..541, z 1061..1066) to both upper floors. Cars on
// show are item displays of our car models (never real MTVehicles cars); the Extreme cars stand on the top floor.
const BX = BOX.dealer[0]                                        // 465, 1009 .. 556, 1106
const WING = { x1: 503, x2: 542, z1: 1012, z2: 1059, top: 75, roof: 76 }
const TOWER = { x1: 503, x2: 542, z1: 1060, z2: 1103, floors: [64, 75, 86], roof: 96 }
const DRIVE = [[1020, 1031], [1080, 1091]]                      // Main's driveways (COMMON's DRIVEWAYS x 461..464)
const WING_DOOR = [1034, 1036]                                  // the wing's doorway (y 65..67)
const TOWER_DOORS = [[1071, 1073], [1087, 1089]]                // the tower's doorways (y 65..67)
const ONE_M = { x: 502, z1: 1072, z2: 1091, y1: 77, y2: 90 } // where the gold "1M" stood (removed 2026-10-22)
// The big car: a racecar model at 2x (2 x the bays' 0.625 would be 1.25; 2.0 is 12.8 long, 6.9 wide, 4.6 high), its
// wheels on the ledge's top (y 79): y = 79 + 2.0 x 2.704 (the bays' 1.69 lift at 0.625). Yaw 0 runs it along z.
const BIG_CAR = { x: 499.5, z: 1081.5, scale: 2.0, damage: 1166, ledge: { x1: 496, x2: 502, z1: 1075, z2: 1088, y: 78 } }
const DESK = { x: 515, z1: 1078, z2: 1085 }                     // the sales desk (the Car Dealer at 516.5 behind it)
const DESK2 = { x: 515, z1: 1069, z2: 1073 }                    // the garage attendant's desk (launch)
const BAYS = [1067.5, 1076.5, 1085.5, 1094.5]                   // bay spots' z (x 528.5), 3 wide x 5 long over x 526..530
const CRATES = { supercar: [508, 65, 1064], hypercar: [508, 65, 1100] }
const SPOT = {
  dealer: [516.5, 65, 1081.5, 90], attendant: [516.5, 65, 1071.5, 90],
  exit1: [484.5, 65, 1025.5, 90], exit2: [484.5, 65, 1085.5, 90], ret: [490.5, 65, 1055.5, 90],
  door: [501.5, 65, 1072.5, 90], poiGarage: [490.5, 65, 1055.5, 0]
}
const NAVY = (x, y, z) => pick(x, y, z, MIX.navy)
const LIGHT = 'light_gray_concrete'
const ASPH = (x, y, z) => pick(x, y, z, MIX.asphalt)
const WHITE_ROOF = (x, y, z) => h(x, 5, z) < 30 ? 'calcite' : 'smooth_quartz' // no road blocks face the sky
const SLAB_BOT = s => `${s}_slab[type=bottom,waterlogged=false]`
const SLAB_TOP = s => `${s}_slab[type=top,waterlogged=false]`
const PANE_Z = c => `${c}_stained_glass_pane[east=false,north=true,south=true,waterlogged=false,west=false]`
const PANE_X = c => `${c}_stained_glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]`
const GLASS_PANE_X = 'glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]'
const GLASS_PANE_Z = 'glass_pane[east=false,north=true,south=true,waterlogged=false,west=false]'
const CURB = 'smooth_stone_slab[type=bottom,waterlogged=false]'

// a small round oak (the strip is 5 wide: COMMON's oak would hang over the sidewalk)
function smallOak (x, z) {
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
    if (dx * dx + dy * dy + dz * dz > 5.5) continue
    S(x + dx, 69 + dy, z + dz, 'oak_leaves[distance=7,persistent=true,waterlogged=false]')
  }
  for (let y = 65; y <= 68; y++) S(x, y, z, 'oak_log[axis=y]')
}

// ---- the ground: the strip, the lot, the walk, the back -------------------------------------------------------------
const inDrive = z => DRIVE.some(([a, b]) => z >= a && z <= b)
function ground () {
  for (let x = BX[0]; x <= BX[2]; x++) for (let z = BX[1]; z <= BX[3]; z++) {
    let s = 'grass_block'
    if (x <= 469) s = inDrive(z) ? ASPH : 'grass_block'                     // the strip, the driveways across it
    else if (x <= 500) s = z >= 1011 && z <= 1104 ? ASPH : 'grass_block'     // the lot
    else if (x <= 502) s = z >= 1011 && z <= 1104 ? LIGHT : 'grass_block'    // the walk along the fronts
    else if (x > WING.x2) s = (z >= 1011 && z <= 1104 && x <= 545) ? LIGHT : 'grass_block' // a walk round the back
    else continue // the buildings' own floors
    S(x, 64, z, s)
  }
  // the lot's edges: a curb along the strip (not across the driveways) and along the walk
  for (let z = 1011; z <= 1104; z++) {
    if (!inDrive(z)) S(469, 65, z, CURB)
    S(501, 65, z, CURB)
  }
  for (let x = 470; x <= 500; x++) { S(x, 64, 1010, 'smooth_stone'); S(x, 65, 1010, CURB); S(x, 64, 1105, 'smooth_stone'); S(x, 65, 1105, CURB) }
  // gaps in the walk's curb at the doors (people walk from the lot into the showrooms)
  for (const [a, b] of [WING_DOOR, ...TOWER_DOORS]) for (let z = a - 1; z <= b + 1; z++) S(501, 65, z, 'air')
  // stalls: 4 wide (white lines every 5 z), 6 deep, against the strip (x 470..475) and against the walk (x 495..500);
  // none across the driveways' mouths, in front of the doors, or at the garage site's exits and return (the aisle)
  const stallOk = (z, east) => !inDrive(z) && (!east || ![WING_DOOR, ...TOWER_DOORS].some(([a, b]) => z >= a - 2 && z <= b + 2))
  for (let z = 1012; z <= 1103; z++) {
    if ((z - 1012) % 5 !== 0) continue
    if (stallOk(z, false)) for (let x = 470; x <= 475; x++) S(x, 64, z, 'white_concrete')
    if (stallOk(z, true)) for (let x = 495; x <= 500; x++) S(x, 64, z, 'white_concrete')
  }
  // the strip's small oaks (4+ from the driveways and the box's ends) and its lamps
  for (const z of [1014, 1040, 1052, 1064, 1076, 1099]) smallOak(467, z)
  for (const z of [1034, 1058, 1095]) streetLamp(S, 468, z, 1, 0)
  // the back: grass, a fence on the box's east side clear of the loop's corner, pines on the slope behind
  for (let z = 1013; z <= 1090; z++) S(552, 65, z, `dark_oak_fence[east=false,north=${z > 1013},south=${z < 1090},waterlogged=false,west=false]`)
  for (const [x, z] of [[549, 1020], [549, 1036], [549, 1052], [549, 1068]]) shrub(S, x, z)
}

// ---- the wing: showroom 2 -------------------------------------------------------------------------------------------
function wing () {
  const { x1, x2, z1, z2, top, roof } = WING
  for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) {
    const edge = x === x1 || x === x2 || z === z1 || z === z2
    S(x, 64, z, edge ? 'blue_concrete' : (x + z) % 2 ? 'polished_diorite' : 'white_concrete')
    for (let y = 65; y <= top; y++) S(x, y, z, edge ? NAVY : 'air')
    S(x, roof, z, edge ? LIGHT : WHITE_ROOF)
    if (!edge && (x - x1) % 6 === 3 && (z - z1) % 6 === 3) S(x, roof, z, 'sea_lantern')       // the ceiling's lights
  }
  // the west front: blue glass panels between navy piers (every 6, the door's frame), a light blue kick plate, an orange
  // neon strip along the fascia (orange concrete over ochre froglights a block inside), a light cap
  const piers = new Set([1012, 1018, 1024, 1030, 1033, 1037, 1042, 1048, 1054, 1059])
  for (let z = z1; z <= z2; z++) {
    for (let y = 65; y <= top; y++) {
      let s
      if (piers.has(z)) s = NAVY
      else if (y === 65) s = 'light_blue_concrete'
      else if (y <= 72) s = 'blue_stained_glass'
      else if (y === 73) s = NAVY
      else if (y === 74) s = 'orange_concrete'
      else s = LIGHT
      S(x1, y, z, s)
    }
    if (!piers.has(z)) S(x1 + 1, 74, z, 'ochre_froglight[axis=y]')
  }
  // the doorway: open, a glass transom over it
  for (let z = WING_DOOR[0]; z <= WING_DOOR[1]; z++) { for (let y = 65; y <= 67; y++) S(x1, y, z, 'air'); S(x1, 64, z, 'smooth_stone') }
  // red fins standing out on the piers (1 wide, 4 high)
  for (const z of [1018, 1024, 1042, 1048, 1054]) for (let y = 68; y <= 71; y++) S(x1 - 1, y, z, 'red_concrete')
  // the other faces: navy with a light cap, a window band on the north face
  for (let x = x1 + 1; x < x2; x++) for (let y = 67; y <= 71; y++) if ((x - x1) % 6 !== 0) S(x, y, z1, PANE_X('light_blue'))
  // two navy HVAC boxes on the roof
  for (const [x, z] of [[515, 1025], [530, 1045]]) { F(x, roof + 1, z, x + 2, roof + 2, z + 2, 'blue_terracotta'); F(x, roof + 3, z, x + 2, roof + 3, z + 2, 'iron_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]') }
  // a doorway through to the tower (x 520..522)
  for (let x = 520; x <= 522; x++) for (let y = 65; y <= 67; y++) { S(x, y, z2, 'air'); S(x, y, TOWER.z1, 'air') }
}

// ---- the tower: the main showroom, three floors --------------------------------------------------------------------
const towerEdge = (x, z) => x === TOWER.x1 || x === TOWER.x2 || z === TOWER.z1 || z === TOWER.z2
function tower () {
  const { x1, x2, z1, z2, floors, roof } = TOWER
  for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) {
    const edge = towerEdge(x, z)
    // the ground floor: an orange and red checker; the upper floors' slabs: light polished stone with lights in rows
    S(x, 64, z, edge ? 'blue_concrete' : (Math.floor(x / 2) + Math.floor(z / 2)) % 2 ? 'orange_concrete' : 'red_concrete')
    for (const f of floors.slice(1)) S(x, f, z, edge ? LIGHT : ((x - x1) % 6 === 3 && (z - z1) % 6 === 3) ? 'sea_lantern' : 'polished_diorite')
    for (let y = 65; y < roof; y++) if (!floors.includes(y)) S(x, y, z, edge ? NAVY : 'air')
    S(x, roof, z, edge ? LIGHT : ((x - x1) % 6 === 3 && (z - z1) % 6 === 3) ? 'sea_lantern' : 'gray_terracotta')
  }
  // light bands at the floor lines and under the roof all round
  for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) if (towerEdge(x, z)) for (const y of [75, 86, 95]) S(x, y, z, LIGHT)
  // the west face: the glass curtain (light blue panes, blue mullions every 5, the light bands), the doors
  for (let z = z1; z <= z2; z++) for (let y = 65; y <= 95; y++) {
    if (y === 75 || y === 86 || y === 95) continue
    S(x1, y, z, (z - z1) % 5 === 0 || z === z2 ? 'blue_concrete' : PANE_Z('light_blue'))
  }
  for (const [a, b] of TOWER_DOORS) for (let z = a; z <= b; z++) { for (let y = 65; y <= 67; y++) S(x1, y, z, 'air'); S(x1, 64, z, 'smooth_stone') }
  // the other faces: navy with a window band on each floor (the north face only over the wing's roof)
  for (const [y1, y2] of [[67, 72], [78, 83], [89, 93]]) {
    for (let z = z1 + 1; z < z2; z++) if ((z - z1) % 5 !== 0) for (let y = y1; y <= y2; y++) S(x2, y, z, PANE_Z('light_blue'))
    for (let x = x1 + 1; x < x2; x++) if ((x - x1) % 5 !== 0) for (let y = y1; y <= y2; y++) { S(x, y, z2, PANE_X('light_blue')); if (y1 > 76) S(x, y, z1, PANE_X('light_blue')) }
  }
  // the roof as a grate: iron bars in a grid over the gray terracotta deck, a light parapet
  for (let x = x1 + 1; x < x2; x++) for (let z = z1 + 1; z < z2; z++) if ((x - x1) % 3 === 0 || (z - z1) % 3 === 0) S(x, roof + 1, z, `iron_bars[east=${(z - z1) % 3 === 0},north=${(x - x1) % 3 === 0},south=${(x - x1) % 3 === 0},waterlogged=false,west=${(z - z1) % 3 === 0}]`)
  for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) if (towerEdge(x, z)) S(x, roof + 1, z, 'smooth_quartz')
}

// ---- the stairs: two switchback flights, one per floor (x 534..541, z 1061..1066) ----------------------------------
// From floor level F (the slab's block y; feet at F + 1): flight A climbs east along the south wall (stairs at F+1..F+6,
// x 534..539, z 1061..1062, a stringer under it), a landing at F+6 (x 540..541), flight B climbs west (F+7..F+11, x 539..535,
// z 1065..1066, floating: the floor under it stays free), its last step in the next floor's slab. The slab above B is cut
// (x 536..538) for head room and railed with glass on the next floor.
function flights (F) {
  const up = F + 11
  for (let k = 0; k <= 5; k++) for (const z of [1061, 1062]) {
    const y = F + 1 + k
    for (let yy = F + 1; yy < y; yy++) S(534 + k, yy, z, 'polished_andesite')
    S(534 + k, y, z, 'quartz_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]')
  }
  for (let x = 540; x <= 541; x++) for (let z = 1061; z <= 1066; z++) { for (let y = F + 1; y < F + 6; y++) S(x, y, z, 'polished_andesite'); S(x, F + 6, z, 'smooth_quartz') }
  for (let j = 0; j <= 4; j++) for (const z of [1065, 1066]) S(539 - j, F + 7 + j, z, 'quartz_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]')
  for (let x = 536; x <= 538; x++) for (const z of [1065, 1066]) S(x, up, z, 'air')
  // glass rails: along A's open side (z 1063), the landing's west edge, both sides of B below the next floor, round the cut
  for (let k = 0; k <= 5; k++) S(534 + k, F + 2 + k, 1063, GLASS_PANE_X)
  for (const z of [1063, 1064]) S(539, F + 7, z, GLASS_PANE_Z)
  for (let j = 0; j <= 1; j++) for (const z of [1064, 1067]) S(539 - j, F + 8 + j, z, GLASS_PANE_X)
  for (let x = 536; x <= 539; x++) for (const z of [1064, 1067]) S(x, up + 1, z, GLASS_PANE_X)
  for (const z of [1065, 1066]) S(539, up + 1, z, GLASS_PANE_Z)
}

// ---- the "1M": block letters in gold in front of the tower's upper floors, lit from behind ------------------------
const LETTERS = (() => {
  const c = new Set(), add = (z, y) => c.add(`${z},${y}`)
  // "1": a 3-wide stem, a flag, a foot (z 1072..1077)
  for (let y = 77; y <= 90; y++) for (let z = 1074; z <= 1076; z++) add(z, y)
  for (let z = 1072; z <= 1077; z++) for (const y of [77, 78]) add(z, y)
  for (const [z, y] of [[1073, 88], [1073, 89], [1072, 87], [1072, 88], [1073, 90]]) add(z, y)
  // "M" (z 1080..1091): two 3-wide legs, the V between them
  for (let y = 77; y <= 90; y++) for (const z of [1080, 1081, 1082, 1089, 1090, 1091]) add(z, y)
  for (const [z, y] of [[1083, 90], [1083, 89], [1084, 89], [1084, 88], [1084, 87], [1085, 87], [1085, 86], [1085, 85], [1085, 84],
    [1088, 90], [1088, 89], [1087, 89], [1087, 88], [1087, 87], [1086, 87], [1086, 86], [1086, 85], [1086, 84]]) add(z, y)
  return c
})()
// Owner, 2026-10-22: "change the 1M sign on the car dealership to a car": the letters go (air where they stood: a
// paste only changes the blocks it sets) and a racecar twice life size stands on a lit ledge in their place (BIG_CAR,
// an item display in module.exports.displays).
function oneM () {
  for (const k of LETTERS) {
    const [z, y] = k.split(',').map(Number)
    S(ONE_M.x, y, z, 'air')
  }
  const L = BIG_CAR.ledge
  for (let x = L.x1; x <= L.x2; x++) for (let z = L.z1; z <= L.z2; z++) {
    const edge = x === L.x1 || z === L.z1 || z === L.z2
    S(x, L.y, z, edge ? 'ochre_froglight[axis=y]' : 'black_concrete') // lit edges seen from the street
  }
  // two brackets under it into the curtain's floor band
  for (const z of [L.z1 + 2, L.z2 - 2]) for (let x = L.x2 - 2; x <= L.x2; x++) S(x, L.y - 1 - (L.x2 - x), z, 'polished_blackstone_stairs[facing=west,half=top,shape=straight,waterlogged=false]')
}

// ---- inside the tower: the desks, the bays, the crate stands, plants -------------------------------------------------
function inside () {
  for (const d of [DESK, DESK2]) for (let z = d.z1; z <= d.z2; z++) { S(d.x, 65, z, 'smooth_quartz'); S(d.x, 66, z, SLAB_BOT('smooth_quartz')) }
  for (const d of [DESK, DESK2]) S(d.x + 2, 65, Math.floor((d.z1 + d.z2) / 2) + 1, 'quartz_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]') // a chair behind each
  // the bays: a white outline 7 by 5 round each spot (x 525..531, z c-2..c+2), a smooth stone pad inside
  for (const c of BAYS) {
    const z0 = Math.floor(c)
    for (let x = 525; x <= 531; x++) for (let z = z0 - 2; z <= z0 + 2; z++) S(x, 64, z, x === 525 || x === 531 || z === z0 - 2 || z === z0 + 2 ? 'white_concrete' : 'smooth_stone')
  }
  // the crate stands: gold blocks, 3 clear over them (crates.sk floats each one's hologram there)
  for (const [x, y, z] of Object.values(CRATES)) { S(x, y, z, 'gold_block'); for (let d = 1; d <= 3; d++) S(x, y + d, z, 'air') }
  // planters by the doors (glass case look: azalea in a quartz box)
  for (const z of [1069, 1075, 1085, 1091]) { S(505, 65, z, 'smooth_quartz'); S(505, 66, z, 'flowering_azalea_leaves[distance=7,persistent=true,waterlogged=false]') }
  // the wing's and the floors' car podiums: polished blackstone, one high (the Extreme cars on the top floor)
  for (const [x, z] of PODIUMS) F(x - 2, 87, z - 3, x + 2, 87, z + 3, 'polished_blackstone')
}
const PODIUMS = [[512, 1070], [522, 1084], [512, 1098]] // the top floor's three, under the Extreme cars

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  ground(); wing(); tower(); flights(64); flights(75); oneM(); inside()
  B = null
  return b
}
// Text displays (tag LABEL_TAG): 3 decimals, 0.03 off the face they sit on; y = the text's bottom.
module.exports.labels = [
  { x: 502.97, y: 75.18, z: 1081.5, facing: 'west', text: 'CAR DEALER', color: '#0d1b5e', scale: 2.4 },     // the tower's light band
  { x: 502.97, y: 74.12, z: 1035.0, facing: 'west', text: 'SHOWROOM', color: '#ffffff', scale: 1.8, brightness: { sky: 15, block: 15 } }, // the wing's neon strip
  ...BAYS.map((c, i) => ({ x: 530.6, y: 65.02, z: c, facing: 'up', text: `BAY ${i + 1}`, color: '#ffffff', scale: 1.2 }))
]
// Item displays (tag DISPLAY_TAG): the cars on show (our models as the bays draw them: a diamond hoe of the colour's
// damage, unbreakable, the head transform at scale 0.625, garage::bay-lift 1.69 over the floor it stands on).
const car = (x, floorTop, z, damage, yaw, note) => ({ x, y: floorTop + 1.69, z, item: 'diamond_hoe', damage, unbreakable: true, transform: 'head', yaw, pitch: 0, scale: 0.625, viewRange: 2, note })
module.exports.displays = [
  // the wing: a row facing the glass, a row behind it turned toward the doorway
  car(512.5, 65, 1018.5, 1017, 90, 'Sedan Red'), car(512.5, 65, 1027.5, 1060, 90, 'Sports Car White'),
  car(512.5, 65, 1043.5, 1116, 90, 'Sport Sedan Obsidian'), car(512.5, 65, 1052.5, 1073, 90, 'Jeep Blue'),
  car(528.5, 65, 1022.5, 1006, 60, 'Hotrod Red'), car(528.5, 65, 1036.5, 1141, 90, 'SUV Black'), car(528.5, 65, 1050.5, 1003, 120, 'Sedan Navy'),
  // the tower's ground floor (by the doors; the bays stay free for the garage site's personal views)
  car(509.5, 65, 1080.5, 1063, 0, 'Sports Car Flame Red'), car(520.5, 65, 1097.5, 1159, 90, 'Hotrod Blue'),
  // the first floor
  car(512.5, 76, 1068.5, 1070, 0, 'Sports Car Black'), car(512.5, 76, 1082.5, 1139, 0, 'SUV White'), car(512.5, 76, 1096.5, 1161, 0, 'Hotrod Black'),
  car(524.5, 76, 1076.5, 1023, 90, 'Sport Sedan Quartz'), car(524.5, 76, 1092.5, 1074, 90, 'Jeep Gold'),
  // the top floor: the Extreme cars on their podiums
  car(512.5, 88, 1070.5, 1036, 0, 'Viper Orange'), car(522.5, 88, 1084.5, 1198, 0, 'Riviera Black Orange'), car(512.5, 88, 1098.5, 1166, 0, 'Apex Red'),
  // the big car on the tower's face, where the "1M" was (lit, seen from the far end of Main Street)
  { ...car(BIG_CAR.x, BIG_CAR.ledge.y + 1, BIG_CAR.z, BIG_CAR.damage, 0, 'the big Apex over the doors'), y: BIG_CAR.ledge.y + 1 + 2.704 * BIG_CAR.scale, scale: BIG_CAR.scale, viewRange: 4, brightness: { sky: 15, block: 15 } }
]
module.exports.points = {
  DEALER_DOOR: SPOT.door, DEALER_CARS: SPOT.dealer, DEALER_ATTENDANT: SPOT.attendant,
  DEALER_EXIT_1: SPOT.exit1, DEALER_EXIT_2: SPOT.exit2, DEALER_RETURN: SPOT.ret,
  DEALER_CRATE_SUPER: [...CRATES.supercar, 0], DEALER_CRATE_HYPER: [...CRATES.hypercar, 0]
}
module.exports.setup = {
  regions: [{ id: 'safe_garage_dealer', box: [466, 63, 1010, 543, 110, 1105], flags: { passthrough: 'allow' },
    note: 'the dealership, its lot and the strip; becomes the City Garage site "dealer" at launch' }],
  heists: [],
  keepers: [
    { kind: 'cars', at: SPOT.dealer, cmd: '/dshopkeeper add cars', note: 'behind the sales desk, facing the doors' },
    { kind: 'garage', at: SPOT.attendant, launch: true, cmd: '/dshopkeeper add garage', note: 'behind the second desk' }
  ],
  givers: [],
  crates: [
    { crate: 'supercar', at: CRATES.supercar, cmd: '/dcrate place supercar' },
    { crate: 'hypercar', at: CRATES.hypercar, cmd: '/dcrate place hypercar' }
  ],
  carSpots: [], chops: [],
  garages: [{ site: 'dealer', region: 'safe_garage_dealer', exits: [SPOT.exit1, SPOT.exit2], returns: [SPOT.ret],
    bays: BAYS.map(z => [528.5, 65, z, 90]), launch: true,
    cmds: [...BAYS.map(z => `dgaragesite bayat dealer 528.5 65 ${z} 90`), 'dgaragesite exitat dealer 484.5 65 1025.5 90',
      'dgaragesite exitat dealer 484.5 65 1085.5 90', 'dgaragesite returnat dealer 490.5 65 1055.5 90', 'dgaragesite holo dealer'] }],
  pois: [
    { type: 'shop', name: 'Car Dealer', at: SPOT.door, launch: true, cmd: '/dpoi add shop Car Dealer' },
    { type: 'garage', name: 'Dealer Garage', at: SPOT.poiGarage, launch: true, cmd: '/dpoi add garage Dealer Garage' }
  ],
  walls: [], holos: [], pumps: []
}
module.exports.build = () => module.exports()

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}; ${module.exports.labels.length} labels, ${module.exports.displays.length} displays`)
}
