'use strict'
// shops: the Gear Shop and the Bag Shop, the walkway between them, their rear parking lot, the giant helmet and the
// giant duffel on the roofs and the lit BAGS sign by Main Street (tools/build/town/PLAN.md section 6.5; regions and spots
// in 8.1 and 8.2). Box x 465..556, z 865..986, every height (BOX.shops); the north-east corner is the loop's street arc.
// Jailbreak's Glider Store and Pet Shop (the wiki's town_view_to_volcano, gunshop_view, pet_shop pictures) made over for
// Donating (Q1):
//   Gear Shop = the Glider Store: a small white and blue box with a blue glass storefront, a glowing cyan line and an
//     orange roof slab; on the roof a giant olive tactical helmet with cyan goggles where the glider sails were.
//   Bag Shop = the Pet Shop: a white wing with red and pink stripes, black-trimmed windows and a red entrance under a
//     flat canopy over a red carpet, beside a two-storey glass box framed in blue with pink and magenta glass lit pink
//     inside and a white ledge band round its middle; on its roof a giant loot duffel where the dog statue stood.
// Inside: counters with lit cases, pegboard walls, pedestals, cubbies and hooks; the bags' showroom in the glass box
// (the five tiers round a gold plinth) and the bag skins' gallery upstairs. Gear, tools and bags on show are item displays
// (module.exports.displays), the keepers stand where 8.2 puts them.
// Run on its own: node tools/build/town/shops.js [--render [<dir>]]   (default dir: tools/build/town/renders/shops)
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

const MOD = 'shops'
const own = ownFor(MOD)
let B = null
// every write goes through S (the module's columns only); s may be a function (x, y, z) -> state
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const SB = { set: S } // for COMMON's door(): both halves through S
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s)
}
const inR = (v, a, b) => v >= a && v <= b
const mine = (x, z) => ownerOf(x, z) === MOD
const [BX1, BZ1, BX2, BZ2] = BOX.shops[0]

// ---- the plan's numbers (PLAN.md 6.5, 8.1, 8.2) ------------------------------------------------------------------------
const GEAR = { x1: 470, x2: 495, z1: 872, z2: 899 }   // walls y 64..72 (2 thick), roof y 73 (a y 74 lip at its edge)
const WING = { x1: 470, x2: 497, z1: 912, z2: 941 }   // walls y 64..73 (2 thick), roof y 74 (a y 75 fascia at its edge)
const GLASS = { x1: 470, x2: 491, z1: 942, z2: 963 }  // y 64..82, roof y 83, the white ledge band y 74..75 (the upper floor)
const WALK = { x1: 465, x2: 499, z1: 900, z2: 911 }
const LOT = { x1: 500, x2: 554, z1: 868, z2: 984 }
// the lot's driveways, paved through its border to the sidewalks' curb cuts (DRIVEWAYS: 1st, 2nd and East Street)
const CUTS = [[520, 865, 533, 868], [520, 984, 533, 986], [554, 920, 556, 933]]
const CANOPY = { x1: 465, x2: 467, z1: 923, z2: 930 } // the entrance canopy beyond the wing's 2-deep overhang (x 468..469)
const GEAR_DOOR = [885, 886], BAG_DOOR = [926, 927]   // open doorways in x 470, y 65..67
const GEAR_KEEPER = [487.5, 65, 880.5, 90], TOOLS_KEEPER = [487.5, 65, 891.5, 90], BAG_KEEPER = [486.5, 65, 927.5, 90]
const GEAR_POI = [468.5, 65, 885.5], BAG_POI = [468.5, 65, 926.5] // the POIs and the GPS door nodes 1044 / 1045

const layer = (x, z, r) => (inR(x, r.x1, r.x2) && inR(z, r.z1, r.z2)) ? Math.min(x - r.x1, r.x2 - x, z - r.z1, r.z2 - z) + 1 : 0
const inFoot = (x, z) => layer(x, z, GEAR) > 0 || layer(x, z, WING) > 0 || layer(x, z, GLASS) > 0

// ---- materials ---------------------------------------------------------------------------------------------------------
const WH = (x, y, z) => pick(x, y, z, MIX.white)                                // walls and ceilings (never on top)
const WROOF = (x, y, z) => pick(x, y, z, [['smooth_quartz', 60], ['calcite', 40]]) // white roofs and ledges (no road blocks)
const NV = (x, y, z) => pick(x, y, z, MIX.navy)
const ASPH = (x, y, z) => pick(x, y, z, MIX.asphalt)
const PEG = f => `iron_trapdoor[facing=${f},half=bottom,open=true]`
// a lit glass case: a sea lantern in the floor under cyan glass, a quartz top
const litCase = (x, z, glass = 'light_blue_stained_glass') => { S(x, 64, z, 'sea_lantern'); S(x, 65, z, glass); S(x, 66, z, 'smooth_quartz_slab[type=bottom]') }
// a till with a lit screen: two panes side by side along z join into one plate facing the customer (a lone pane is a rod)
const register = (x, y, z) => { for (const k of [z, z + 1]) { S(x, y, k, 'polished_blackstone'); S(x, y + 1, k, 'lime_stained_glass_pane') } }
const PAVED = new Set()
const pave = (x, z, s) => { S(x, 64, z, s); PAVED.add(`${x},${z}`) }
const paveStone = (x, z) => pave(x, z, (x % 5 === 0 || z % 5 === 0) ? 'smooth_stone' : 'light_gray_concrete')
const LEAF = (x, y, z) => h(x, y, z) < 45 ? 'oak_leaves[persistent=true]' : h(x, y, z) < 85 ? 'azalea_leaves[persistent=true]' : 'flowering_azalea_leaves[persistent=true]'
const FLOWERS = ['poppy', 'dandelion', 'cornflower', 'allium', 'oxeye_daisy', 'azure_bluet']
// a round tree with a taller trunk than COMMON's oak (the lot's: leaves from y 69, clear of cars' roofs)
function tallOak (x, z, y0 = 64) {
  for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) {
    if (dx * dx + dy * dy * 1.3 + dz * dz > 10.5 || (dy === -3 && h(x + dx, 3, z + dz) < 50)) continue
    S(x + dx, y0 + 8 + dy, z + dz, 'oak_leaves[persistent=true]')
  }
  for (let y = y0 + 1; y <= y0 + 7; y++) S(x, y, z, 'oak_log[axis=y]')
}

// ---- the ground: lawns, aprons, the paths, the service strips -----------------------------------------------------------
function ground () {
  for (let x = BX1; x <= BX2; x++) for (let z = BZ1; z <= BZ2; z++) S(x, 64, z, 'grass_block')
  for (let x = BX1; x <= 499; x++) for (let z = BZ1; z <= BZ2; z++) {
    if (inFoot(x, z)) continue
    const front = inR(x, 468, 469) && (inR(z, 871, 900) || inR(z, 911, 966))   // under the overhangs, along Main
    const gearApron = inR(x, 468, 496) && (z === 871 || z === 900)
    const gearPath = inR(x, 465, 467) && inR(z, 884, 887)                       // the Gear Shop's front path
    const canopy = inR(x, CANOPY.x1, CANOPY.x2) && inR(z, CANOPY.z1, CANOPY.z2)
    const service = (inR(x, 496, 499) && inR(z, 871, 899)) || (inR(x, 498, 499) && inR(z, 911, 941)) || (inR(x, 492, 499) && inR(z, 942, 966))
    const southApron = inR(x, 468, 499) && inR(z, 964, 966)
    const southPath = inR(x, 480, 481) && inR(z, 967, BZ2)                      // from 2nd Street to the glass box
    if (front || gearApron || gearPath || canopy || service || southApron || southPath) paveStone(x, z)
  }
  // the red carpet, from the sidewalk under the canopy to the doorway (4 wide outside, the doorway's 2 inside)
  for (let x = 465; x <= 469; x++) for (let z = 925; z <= 928; z++) S(x, 65, z, 'red_carpet')
  // the gear path's edging and two flower beds flanking it
  for (let x = 465; x <= 467; x++) { pave(x, 884, 'smooth_stone'); pave(x, 887, 'smooth_stone') }
}

// lawn texture and planting, once everything paved is known
function lawns () {
  const open = (x, z) => mine(x, z) && x <= 499 && !PAVED.has(`${x},${z}`) && !inFoot(x, z) && !inR(x, LOT.x1, LOT.x2)
  const openAround = (x, z, d) => { for (let i = -d; i <= d; i++) for (let k = -d; k <= d; k++) if (!open(x + i, z + k)) return false; return true }
  const taken = new Set()
  const plant = (x, z, fn) => { if (!open(x, z)) return; taken.add(`${x},${z}`); fn() }
  // low hedges and shrubs along the fronts (x 466: knee high, never blocking the windows)
  // (the Gear Shop's hedge stops 3 short of its path either side: flowers there, so the GPS trail from the door node 1044
  // toward Main / Gas (1010) crosses no leaves)
  for (const z of [874, 875, 876, 895, 896, 897]) plant(466, z, () => S(466, 65, z, LEAF(466, 65, z)))
  for (const z of [914, 915, 916, 919, 920, 934, 935, 938, 939]) plant(466, z, () => S(466, 65, z, LEAF(466, 65, z)))
  for (const [x, z] of [[466, 945], [466, 958], [466, 961], [471, 867], [478, 868], [489, 867], [497, 868], [470, 982], [486, 984], [497, 978]]) {
    plant(x, z, () => shrub(S, x, z)); taken.add(`${x + 1},${z}`); taken.add(`${x},${z + 1}`) // the shrub's side leaves too
  }
  // flowers in the beds beside the gear path and in a bed on the lawn in front of the glass box
  for (const [x, z] of [[465, 882], [466, 883], [465, 889], [466, 888], [466, 880], [466, 882], [466, 889], [466, 891], [465, 947], [467, 953], [465, 953], [467, 946],
    [466, 949], [465, 950], [467, 950], [466, 951]]) plant(x, z, () => S(x, 65, z, FLOWERS[h(x, 5, z) % FLOWERS.length]))
  // the corner lawn at Main and 2nd Street: low planting in front of the glass box (a flower bed round two shrubs, so its
  // south face stays in view from 2nd Street), one round oak east of it, 5 off the box's corner (its crown x 493..499),
  // and a bench looking at the path
  oak(S, 496, 980)
  for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) taken.add(`${496 + i},${980 + k}`)
  for (const [x, z] of [[471, 975], [473, 977]]) plant(x, z, () => shrub(S, x, z))
  for (let x = 469; x <= 475; x++) for (let z = 973; z <= 979; z++) {
    if (Math.hypot(x - 472, (z - 976) * 1.2) > 3.3 || taken.has(`${x},${z}`) || B.blocks.has(`${x},65,${z}`)) continue
    plant(x, z, () => S(x, 65, z, FLOWERS[h(x, 6, z) % FLOWERS.length]))
  }
  for (let k = 0; k <= 2; k++) S(478, 65, 973 + k, 'spruce_stairs[facing=west,half=bottom]')
  S(478, 65, 972, 'spruce_trapdoor[facing=north,half=bottom,open=true]'); S(478, 65, 976, 'spruce_trapdoor[facing=south,half=bottom,open=true]')
  for (let z = 972; z <= 976; z++) taken.add(`478,${z}`)
  // Jailbreak's orange ground well away from anything paved, grass tufts elsewhere
  for (let x = BX1; x <= 499; x++) for (let z = BZ1; z <= BZ2; z++) {
    if (!open(x, z) || taken.has(`${x},${z}`)) continue
    if (orangeAt(x, z) && openAround(x, z, 2)) S(x, 64, z, pick(x, 64, z, MIX.orange))
    else if (h(x, 9, z) < 9 && openAround(x, z, 1)) S(x, 65, z, 'short_grass')
  }
}

// ---- the Gear Shop (Jailbreak's Glider Store) -------------------------------------------------------------------------------
// the glowing cyan line at y 71 runs round all four faces: cyan glass in the outer layer over sea lanterns in the inner one
// (the storefront sets its own the same way; the window frames stop at y 70)
const gearOut = (x, y, z) => y === 64 || y === 72 ? 'blue_concrete' : y === 71 ? 'light_blue_stained_glass' : WH(x, y, z)
const gearIn = (x, y, z) => y <= 65 ? 'blue_terracotta' : y === 71 ? 'sea_lantern' : WH(x, y, z)
const gearFloor = (x, z) => x >= 487 ? 'polished_andesite'
  : GEAR_DOOR.includes(z) ? 'blue_terracotta'                                    // the runner from the door to the counter
    : ((x >> 1) + (z >> 1)) & 1 ? 'polished_diorite' : 'smooth_stone'
// a window in a z-face: glass x1..x2, y1..y2 in the outer layer zo, a frame round it, the inner layer zi opened (a reveal)
// with a quartz sill
const winX = (zo, zi, x1, x2, y1, y2, glass, frame) => {
  for (let x = x1 - 1; x <= x2 + 1; x++) for (let y = y1 - 1; y <= y2 + 1; y++) {
    const f = x < x1 || x > x2 || y < y1 || y > y2
    S(x, y, zo, f ? frame : glass)
    if (!f) S(x, y, zi, y === y1 ? 'smooth_quartz_slab[type=bottom]' : 'air')
  }
}
const winZ = (xo, xi, z1, z2, y1, y2, glass, frame) => {
  for (let z = z1 - 1; z <= z2 + 1; z++) for (let y = y1 - 1; y <= y2 + 1; y++) {
    const f = z < z1 || z > z2 || y < y1 || y > y2
    S(xo, y, z, f ? frame : glass)
    if (!f) S(xi, y, z, y === y1 ? 'smooth_quartz_slab[type=bottom]' : 'air')
  }
}
function gearShop () {
  const G = GEAR
  for (let x = G.x1; x <= G.x2; x++) for (let z = G.z1; z <= G.z2; z++) {
    const l = layer(x, z, G)
    if (l === 1) {
      const corner = (x === G.x1 || x === G.x2) && (z === G.z1 || z === G.z2)
      for (let y = 64; y <= 72; y++) S(x, y, z, corner ? 'blue_concrete' : gearOut(x, y, z))
    } else if (l === 2) for (let y = 64; y <= 72; y++) S(x, y, z, y === 72 ? WH(x, y, z) : gearIn(x, y, z))
    else {
      S(x, 64, z, gearFloor(x, z))
      for (let y = 65; y <= 71; y++) S(x, y, z, 'air')
      S(x, 72, z, WH(x, 72, z))
    }
  }
  // the storefront (west, x 470 / 471): blue glass y 65..70 between blue posts, the open doorway z 885..886 with a glass
  // transom, the glowing cyan line at y 71 (glass over sea lanterns: the inside's light strip too), a blue band at y 72;
  // behind the glass a quartz display bed (window displays)
  const POSTS = [874, 879, 884, 887, 892, 897]
  for (let z = 874; z <= 897; z++) {
    const post = POSTS.includes(z), door = GEAR_DOOR.includes(z)
    for (let y = 64; y <= 72; y++) {
      let o, i
      if (y === 64) { o = door ? 'smooth_stone' : 'blue_concrete'; i = door ? 'smooth_stone' : 'blue_terracotta' }
      else if (y <= 70) { // the glass y 65..70 (PLAN 6.5), the doorway's transom y 68..70
        if (post) { o = 'blue_concrete'; i = 'blue_concrete' }
        else if (door) { o = y <= 67 ? 'air' : 'light_blue_stained_glass'; i = 'air' }
        else { o = 'light_blue_stained_glass'; i = y === 65 ? 'smooth_quartz_slab[type=bottom]' : 'air' }
      } else if (y === 71) { o = 'light_blue_stained_glass'; i = 'sea_lantern' }
      else { o = 'blue_concrete'; i = WH(471, y, z) }
      S(G.x1, y, z, o); S(G.x1 + 1, y, z, i)
    }
  }
  // side windows: two on the north (1st Street) and two on the south (the walkway), over the shop floor
  for (const [x1, x2] of [[474, 477], [480, 483]]) {
    winX(G.z1, G.z1 + 1, x1, x2, 66, 69, 'light_blue_stained_glass', 'blue_concrete')
    winX(G.z2, G.z2 - 1, x1, x2, 66, 69, 'light_blue_stained_glass', 'blue_concrete')
  }
  winX(G.z1, G.z1 + 1, 487, 490, 66, 69, 'light_blue_stained_glass', 'blue_concrete') // a third on the north, behind the counter
  // the staff door at the back (east, onto the service strip): an iron door with no redstone, so it never opens (a
  // lookalike: the keeper's side is sealed)
  door(SB, G.x2, 65, 896, 'east'); S(G.x2 - 1, 65, 896, 'air'); S(G.x2 - 1, 66, 896, 'air')
  // the counter, 1 deep at x 486 (z 876..895): lit glass cases (gear north of the divider, tools south of it), a solid
  // blue middle across from the door, a till at each end (z 877..878, 893..894): never in front of a keeper (z 880, 891),
  // whose head is all that shows over the counter and must stay clickable straight on
  for (let z = 876; z <= 895; z++) {
    if (GEAR_DOOR.includes(z)) { S(486, 65, z, 'blue_concrete'); S(486, 66, z, 'smooth_quartz_slab[type=bottom]') }
    else litCase(486, z)
  }
  register(486, 66, 877); register(486, 66, 893)
  // counter returns to the walls (z 874..875, 896..897): nobody walks behind it onto the keepers' spots (staff fly in or
  // teleport there for /dshopkeeper add; the back door is sealed)
  for (const z of [874, 875, 896, 897]) { S(486, 65, z, 'blue_concrete'); S(486, 66, z, 'smooth_quartz_slab[type=bottom]') }
  // the back walls behind the keepers (backing in the inner wall layer x 494, pegs at x 493 over a low cabinet): slate
  // for helmets and vests, orange for the heist tools, a blue pilaster between them, a blue band with the labels at y 71
  for (let z = 875; z <= 895; z++) {
    if (z === 886) { for (let y = 65; y <= 71; y++) S(493, y, z, 'blue_concrete'); continue }
    const tools = z >= 887
    S(493, 65, z, 'dark_oak_planks'); S(493, 66, z, 'dark_oak_slab[type=bottom]')
    for (let y = 67; y <= 70; y++) { S(494, y, z, tools ? 'orange_terracotta' : 'cyan_terracotta'); S(493, y, z, PEG('west')) }
    S(494, 71, z, 'blue_concrete')
  }
  // the north case under the side windows (gear lying in it)
  for (let x = 474; x <= 483; x++) litCase(x, 874)
  // pedestals on the shop floor: helmets at counter height, vests a block higher (torso height)
  for (const [x, z, tall] of [[476, 879, false], [481, 879, true], [476, 892, true], [481, 892, false]]) {
    S(x, 65, z, 'quartz_pillar[axis=y]')
    if (tall) { S(x, 66, z, 'quartz_pillar[axis=y]'); S(x, 67, z, 'smooth_quartz_slab[type=bottom]') } else S(x, 66, z, 'smooth_quartz_slab[type=bottom]')
  }
  // two lit glass islands between the pedestals (either side of the runner)
  for (const z0 of [881, 889]) for (let x = 478; x <= 479; x++) for (let z = z0; z <= z0 + 1; z++) litCase(x, z)
  // a door mat and a bench by the south windows
  for (let z = 884; z <= 887; z++) S(472, 65, z, 'gray_carpet')
  for (let x = 474; x <= 477; x++) S(x, 65, 897, 'spruce_stairs[facing=south,half=bottom]')
  // ceiling light strips
  for (let z = 876; z <= 895; z++) { S(476, 72, z, 'sea_lantern'); S(481, 72, z, 'sea_lantern'); S(490, 72, z, 'sea_lantern') }
  // the roof: the Glider Store's orange slab, 2 deep over the storefront, a 2-high orange fascia lip, downlights under the
  // front overhang, an air unit at the back
  for (let x = G.x1 - 2; x <= G.x2 + 1; x++) for (let z = G.z1 - 1; z <= G.z2 + 1; z++) {
    const edge = x === G.x1 - 2 || x === G.x2 + 1 || z === G.z1 - 1 || z === G.z2 + 1
    S(x, 73, z, 'orange_concrete') // flat bright orange like the Glider Store's slab (terracotta specks read as rust)
    if (edge) S(x, 74, z, 'orange_concrete')
  }
  for (const z of [876, 882, 890, 896]) S(G.x1 - 1, 73, z, 'sea_lantern')
  F(491, 74, 873, 494, 74, 876, 'light_gray_terracotta'); F(491, 75, 873, 494, 75, 876, 'iron_trapdoor[facing=north,half=bottom]')
  S(492, 76, 874, 'iron_chain[axis=y]'); S(493, 76, 875, 'iron_chain[axis=y]') // vent pipes (a lone iron bar is a post)
}

// ---- the giant tactical helmet on the Gear Shop's roof (the Glider Store's sails, made over: Q1) -------------------------
// An olive high-cut helmet, about 10 tall, facing Main Street (west), on a light two-step stand: rounder than an ellipsoid
// (a superellipsoid), its rim raised two blocks at the high-cut ear openings, a black rubber trim along the rim (black
// padding inside the openings), a black goggle strap round it, cyan goggles on the brow (glass over sea
// lanterns, so they glow: the Tactical Helmet's art), grey side rails, a night-vision mount over the goggles, a patch on
// the back. Moved toward the street and raised on its stand so the goggles clear the roof's edge seen from Main.
const HELM = { cx: 482.0, cz: 886.0, y0: 76, rx: 7.4, rz: 7.0, ry: 10.0, ph: 2.0, pv: 2.1 }
const LIGHT = (() => { const v = [-0.55, 0.75, 0.32], n = Math.hypot(...v); return v.map(c => c / n) })()
function helmet () {
  const { cx, cz, y0, rx, rz, ry, ph, pv } = HELM
  // the stand: y 74 a disc 1.5 wider than the helmet (slab-edged), y 75 just wider than its rim
  for (let x = 471; x <= 494; x++) for (let z = 875; z <= 897; z++) {
    const d = Math.hypot((x + 0.5 - cx) / (rx + 1.5), (z + 0.5 - cz) / (rz + 1.5))
    if (d <= 1) S(x, 74, z, d > 0.9 ? 'polished_andesite_slab[type=bottom]' : 'polished_andesite')
    if (Math.hypot((x + 0.5 - cx) / (rx + 0.6), (z + 0.5 - cz) / (rz + 0.6)) <= 1) S(x, 75, z, 'smooth_stone')
  }
  const norm = (x, y, z) => [(x + 0.5 - cx) / rx, (y + 0.5 - y0) / ry, (z + 0.5 - cz) / rz]
  // how far the rim is raised (blocks over y0) round the helmet: a = 0 at the front (west) .. PI at the back. Only the ear
  // openings: a brow raised a block left a dark notch under the olive that read as a mouth from Main, so the front's trim
  // is the same one row as the rest of the rim
  const rim = (dx, dz) => {
    const a = Math.acos(Math.max(-1, Math.min(1, -dx / (Math.hypot(dx, dz) || 1))))
    const ear = Math.max(0, 1 - ((a - 0.47 * Math.PI) / (0.15 * Math.PI)) ** 2)
    return Math.round(2.2 * ear)
  }
  const shape = (x, y, z) => {
    if (y < y0) return false
    const [dx, dy, dz] = norm(x, y, z)
    if ((Math.abs(dx) ** ph + Math.abs(dz) ** ph) ** (pv / ph) + Math.abs(dy) ** pv > 1) return false
    return y - y0 >= rim(dx, dz)
  }
  const X1 = Math.floor(cx - rx) - 1, X2 = Math.ceil(cx + rx) + 1, Z1 = Math.floor(cz - rz) - 1, Z2 = Math.ceil(cz + rz) + 1
  for (let x = X1; x <= X2; x++) for (let z = Z1; z <= Z2; z++) for (let y = y0; y <= y0 + Math.ceil(ry); y++) {
    if (!shape(x, y, z)) continue
    const [dx, dy, dz] = norm(x, y, z)
    const surface = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, b, c]) => !shape(x + a, y + b, z + c))
    if (!surface) { S(x, y, z, y <= y0 + 2 ? 'black_wool' : 'green_terracotta'); continue } // the padding (seen through the ear openings)
    const n = [dx / rx, dy / ry, dz / rz], nl = Math.hypot(...n), lit = (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / nl
    let s
    if (!shape(x, y - 1, z)) s = 'black_terracotta'                                                   // the rubber rim trim
    else if (y === y0 + 4) s = 'black_wool'                                                           // the goggle strap
    else if (y === y0 + 6 && Math.abs(dz) > 0.75 && dx > -0.5 && dx < 0.45) s = 'polished_andesite'   // the side rails
    else if (dx > 0.7 && inR(y, y0 + 6, y0 + 7) && Math.abs(z + 0.5 - cz) < 2) s = (z === Math.floor(cz) && y === y0 + 7) ? 'red_wool' : 'gray_wool' // the back patch
    // the shell cel-shaded in two olive tones by the light (smooth like Jailbreak's props), a light moss speckle on the lit side
    else if (lit > 0.2) s = pick(x, y, z, [['lime_terracotta', 90], ['moss_block', 10]])
    else s = pick(x, y, z, [['green_terracotta', 94], ['lime_terracotta', 6]])
    S(x, y, z, s)
  }
  // the goggles on the brow, low over the rim: two lit cyan lenses (glass over sea lanterns, y0+3..y0+4) one block proud
  // of the shell (they follow its curve), dark ends and a dark bridge on the strap's line (y0+4), a thin dark bar over them
  const front = (y, z) => { for (let x = X1; x <= X2; x++) if (shape(x, y, z)) return x; return null }
  const gz = Math.floor(cz)
  for (let z = gz - 6; z <= gz + 5; z++) for (let y = y0 + 3; y <= y0 + 5; y++) {
    const xs = front(y, z); if (xs === null) continue
    const o = z - gz // -6 end, -5..-2 lens, -1..0 bridge, 1..4 lens, 5 end
    const lens = y <= y0 + 4 && (inR(o, -5, -2) || inR(o, 1, 4))
    if (lens) { S(xs - 1, y, z, 'light_blue_stained_glass'); S(xs, y, z, 'sea_lantern') }
    else if (y <= y0 + 4 || inR(o, -5, 4)) S(xs - 1, y, z, 'polished_blackstone')
  }
  // the night-vision mount over the goggles (grey, like the rails)
  for (let z = gz - 1; z <= gz; z++) for (let y = y0 + 6; y <= y0 + 7; y++) {
    const xs = front(y, z); if (xs !== null) S(xs - 1, y, z, y === y0 + 7 ? 'polished_andesite_slab[type=bottom]' : 'polished_andesite')
  }
}

// ---- the Bag Shop's wing (Jailbreak's Pet Shop) --------------------------------------------------------------------------
const wingOut = (x, y, z) => y === 64 ? 'red_concrete' : y === 65 ? 'pink_concrete' : (y === 71 || y === 72) ? 'red_concrete' : WH(x, y, z)
const wingIn = (x, y, z) => y === 64 ? 'red_concrete' : y === 65 ? 'pink_concrete' : y === 71 ? 'red_concrete' : WH(x, y, z)
const wingFloor = (x, z) => x >= 492 ? 'polished_andesite' : x >= 486 ? 'smooth_stone'
  : (x === 472 || z === 914 || z === 939 || x === 484) ? 'pink_concrete'
    : ((x + z) & 1) ? 'white_concrete' : 'calcite'
function wing () {
  const W = WING
  for (let x = W.x1; x <= W.x2; x++) for (let z = W.z1; z <= W.z2; z++) {
    const l = layer(x, z, W)
    if (l === 1) {
      const corner = (x === W.x1 || x === W.x2) && (z === W.z1 || z === W.z2)
      for (let y = 64; y <= 73; y++) S(x, y, z, corner ? NV(x, y, z) : wingOut(x, y, z))
    } else if (l === 2) for (let y = 64; y <= 73; y++) S(x, y, z, y === 73 ? WH(x, y, z) : wingIn(x, y, z))
    else {
      S(x, 64, z, wingFloor(x, z))
      for (let y = 65; y <= 72; y++) S(x, y, z, 'air')
      S(x, 73, z, WH(x, 73, z))
    }
  }
  // the red entrance (west, z 923..930): red through both layers, the open doorway z 926..927 (y 65..67) under a glass
  // transom, glass sidelights z 924..925 and 928..929 (y 65..68)
  for (let z = 923; z <= 930; z++) for (let y = 64; y <= 73; y++) {
    const doorZ = BAG_DOOR.includes(z), sideZ = inR(z, 924, 925) || inR(z, 928, 929)
    let o = 'red_concrete', i = 'red_concrete'
    if (y === 64) { o = doorZ ? 'smooth_stone' : 'red_concrete'; i = doorZ ? 'smooth_stone' : 'red_concrete' }
    else if (doorZ && y <= 67) { o = 'air'; i = 'air' }
    else if ((doorZ && y === 68) || (sideZ && y <= 68)) { o = 'glass_pane'; i = 'air' }
    S(W.x1, y, z, o); S(W.x1 + 1, y, z, i)
  }
  // black-trimmed windows either side of it, one onto the walkway (north)
  winZ(W.x1, W.x1 + 1, 915, 920, 66, 69, 'glass_pane', 'black_concrete')
  winZ(W.x1, W.x1 + 1, 933, 938, 66, 69, 'glass_pane', 'black_concrete')
  winX(W.z1, W.z1 + 1, 474, 479, 66, 69, 'glass_pane', 'black_concrete')
  // and two on the back (east, toward the lot) into the stock room
  winZ(W.x2, W.x2 - 1, 916, 921, 66, 69, 'glass_pane', 'black_concrete')
  winZ(W.x2, W.x2 - 1, 926, 931, 66, 69, 'glass_pane', 'black_concrete')
  // navy pilasters under the 2-deep front overhang (the Pet Shop's dark posts), the canopy's two posts
  for (const z of [912, 922, 931]) for (let y = 64; y <= 73; y++) S(469, y, z, NV(469, y, z))
  for (const z of [CANOPY.z1, CANOPY.z2]) for (let y = 64; y <= 73; y++) S(CANOPY.x1, y, z, NV(CANOPY.x1, y, z))
  // the opening into the glass box (x 478..481, y 65..68, through the wing's south wall z 940..941; the box's own wall
  // z 942 is opened by glassBox), quartz jambs
  for (let x = 477; x <= 482; x++) for (let y = 64; y <= 69; y++) for (const z of [940, 941]) {
    const open = inR(x, 478, 481) && inR(y, 65, 68)
    S(x, y, z, open ? 'air' : y === 64 ? (inR(x, 478, 481) ? 'calcite' : 'red_concrete') : 'smooth_quartz')
  }
  // the staff door at the back (east): iron, no redstone, never opens (a lookalike)
  door(SB, W.x2, 65, 936, 'east'); S(W.x2 - 1, 65, 936, 'air'); S(W.x2 - 1, 66, 936, 'air')
  // the counter, 1 deep at x 485 (z 920..934): red front, a quartz top, the till, white end posts
  for (let z = 920; z <= 934; z++) { S(485, 65, z, 'red_concrete'); S(485, 66, z, 'smooth_quartz_slab[type=bottom]') }
  for (const z of [919, 935]) { S(485, 65, z, 'smooth_quartz'); S(485, 66, z, 'smooth_quartz') }
  register(485, 66, 924)
  // counter returns to the walls (z 914..918, 936..939): the keeper's side and the stock room are sealed (staff fly in or
  // teleport for /dshopkeeper add; the back door never opens)
  for (const z of [914, 915, 916, 917, 918, 936, 937, 938, 939]) { S(485, 65, z, 'red_concrete'); S(485, 66, z, 'smooth_quartz_slab[type=bottom]') }
  // the cubby wall behind the keeper (x 490, backing x 491): dark oak frames every 3 z and at y 65 / 68 / 71, pink holes
  // (bags in them), a solid end and a doorway into the stock room at z 938..939
  for (let z = 914; z <= 939; z++) for (let y = 65; y <= 72; y++) {
    if (inR(z, 938, 939)) { const open = y <= 67; S(490, y, z, open ? 'air' : 'dark_oak_planks'); S(491, y, z, open ? 'air' : 'white_concrete'); continue }
    const frame = z > 935 || (z - 914) % 3 === 0 || y === 65 || y === 68 || y >= 71
    S(490, y, z, frame ? 'dark_oak_planks' : 'air'); S(491, y, z, frame || y === 72 ? 'dark_oak_planks' : 'pink_concrete')
  }
  // the stock room behind (x 492..495): stacked cardboard-coloured boxes (lookalikes: nothing opens)
  for (let x = 493; x <= 495; x++) for (let z = 914; z <= 934; z++) {
    const v = h(x, 21, z); if (v < 35) continue
    const n = 1 + (v % 3)
    for (let k = 0; k < n; k++) S(x, 65 + k, z, h(x, 22 + k, z) < 55 ? 'stripped_oak_wood[axis=y]' : 'stripped_birch_wood[axis=y]')
  }
  // the bag hooks on the north and south walls (tripwire hooks: the second paste pass)
  for (const x of [482, 485]) S(x, 70, 914, 'tripwire_hook[facing=south]')
  for (const x of [474, 484]) S(x, 70, 939, 'tripwire_hook[facing=north]')
  // a mirror on the south wall (tinted glass in the inner layer, a quartz frame)
  for (let x = 475; x <= 477; x++) for (let y = 65; y <= 69; y++) S(x, y, 940, (x === 476 && y <= 68 && y >= 66) ? 'tinted_glass' : 'smooth_quartz')
  // two display tables (a pink middle in a quartz top), the bench under each window, the carpet runner to the counter
  for (const z0 of [917, 933]) {
    for (let x = 475; x <= 477; x++) for (let z = z0; z <= z0 + 2; z++) S(x, 65, z, x === 476 && z === z0 + 1 ? 'pink_concrete' : 'smooth_quartz_slab[type=top]')
  }
  // two 2x2 quartz plinths either side of the runner, a bag on each (displays)
  for (const z0 of [921, 931]) F(478, 65, z0, 479, 65, z0 + 1, 'quartz_bricks'), F(478, 66, z0, 479, 66, z0 + 1, 'smooth_quartz_slab[type=bottom]')
  for (const [z1, z2] of [[915, 920], [933, 938]]) {
    for (let z = z1; z <= z2; z++) S(472, 65, z, 'cherry_stairs[facing=west,half=bottom]')
    S(472, 65, z1 - 1, 'cherry_trapdoor[facing=north,half=bottom,open=true]'); S(472, 65, z2 + 1, 'cherry_trapdoor[facing=south,half=bottom,open=true]')
  }
  for (let x = 470; x <= 484; x++) for (const z of BAG_DOOR) S(x, 65, z, 'red_carpet')
  // ceiling lights
  for (let z = 916; z <= 937; z++) { S(476, 73, z, 'sea_lantern'); S(481, 73, z, 'sea_lantern') }
  for (const z of [920, 930]) { S(488, 73, z, 'sea_lantern'); S(494, 73, z, 'sea_lantern') }
  // the roof and the ledge: white, 2 deep over the front (on the pilasters) and out over the entrance canopy, 1 elsewhere;
  // its edge a y 75 fascia (the glass box's ledge band carries on from it at z 942); navy beams and an air unit on top;
  // downlights under the front overhang and the canopy
  const roofAt = (x, z) => (inR(x, 468, W.x2 + 1) && inR(z, W.z1 - 1, W.z2)) || (inR(x, CANOPY.x1, CANOPY.x2) && inR(z, CANOPY.z1, CANOPY.z2))
  const ledgeAt = (x, z) => inR(x, 468, 493) && inR(z, 942, 965)
  for (let x = CANOPY.x1; x <= W.x2 + 1; x++) for (let z = W.z1 - 1; z <= W.z2; z++) {
    if (!roofAt(x, z)) continue
    S(x, 74, z, WROOF)
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => !roofAt(x + a, z + c) && !ledgeAt(x + a, z + c))
    if (edge) S(x, 75, z, WROOF)
  }
  for (const z of [915, 919, 934, 938]) S(469, 74, z, 'sea_lantern')
  for (const z of [925, 928]) S(466, 74, z, 'sea_lantern')
  // the navy beams run across the roof, front to back (as in the bird's-eye picture), clear of the air unit (z 915..918)
  for (const z of [920, 925, 930, 935]) for (let x = 471; x <= 496; x++) S(x, 75, z, 'blue_terracotta')
  F(492, 75, 915, 495, 75, 918, 'light_gray_terracotta'); F(492, 76, 915, 495, 76, 918, 'iron_trapdoor[facing=north,half=bottom]')
}

// ---- the Bag Shop's glass box ---------------------------------------------------------------------------------------------
// Inside x 471..490, z 943..962. The ground floor (y 65..73) is the showroom: the five bag tiers round a gold plinth on a
// round quartz platform. The upper floor (the slab y 74..75: its edge is the white ledge band outside) is the bag skins'
// gallery, up quartz stairs along the east glass. Glass walls of pink and magenta panes in white mullions between blue
// posts (2x2 at the corners and mid-face), a blue sill at y 64, a blue beam y 82..83 round the roof.
const GPOST_Z = [952, 953], GPOST_X = [480, 481]
const GMULL_Z = [947, 958], GMULL_X = [475, 486]
const STAIR = { x1: 488, x2: 490, zTop: 952, zBot: 962 }             // up toward north: y = 65 + (962 - z), 3 wide to the east glass
const stairY = z => 65 + (STAIR.zBot - z)
const inStairHole = (x, y, z) => inR(x, STAIR.x1, STAIR.x2) && ((y === 75 && inR(z, 953, 956)) || (y === 74 && inR(z, 954, 956)))
const PLAT = { cx: 481.0, cz: 953.0, r: 5.6 }                          // the showroom's round platform
const PEDS = [[477, 949, 1], [484, 949, 2], [484, 956, 3], [477, 956, 4]] // tier pedestals round the vault bag's plinth
const SKINPEDS = [[473, 945, 'camo'], [473, 949, 'arctic'], [473, 956, 'gilded'], [473, 960, 'neon'], [477, 960, 'cherry'], [481, 960, 'tiger'], [485, 960, 'diamond']]
function glassBox () {
  const G = GLASS
  const pane = (x, y, z) => h(x, y >> 1, z) < 50 ? 'pink_stained_glass_pane' : 'magenta_stained_glass_pane'
  // the inside: floors, air, the slab between them
  for (let x = G.x1 + 1; x <= G.x2 - 1; x++) for (let z = G.z1 + 1; z <= G.z2 - 1; z++) {
    const rim = x === G.x1 + 1 || x === G.x2 - 1 || z === G.z1 + 1 || z === G.z2 - 1
    S(x, 64, z, rim ? 'red_concrete' : ((x >> 1) + (z >> 1)) & 1 ? 'pink_concrete' : 'pink_terracotta')
    for (let y = 65; y <= 73; y++) S(x, y, z, 'air')
    S(x, 74, z, (x % 5 === 1 && z % 5 === 1) ? 'pearlescent_froglight[axis=y]' : WH(x, 74, z))     // the showroom's ceiling
    S(x, 75, z, rim ? 'white_concrete' : 'pink_concrete')                                       // the gallery's floor
    for (let y = 76; y <= 82; y++) S(x, y, z, 'air')
    S(x, 83, z, WROOF)
  }
  for (const [x, z] of [[475, 947], [475, 958], [486, 947], [481, 953]]) S(x, 82, z, 'pearlescent_froglight[axis=y]') // gallery lights
  for (let x = 480; x <= 481; x++) for (let z = 952; z <= 953; z++) S(x, 74, z, 'pearlescent_froglight[axis=y]')    // over the vault bag
  // the walls
  for (let x = G.x1; x <= G.x2; x++) for (let z = G.z1; z <= G.z2; z++) {
    if (layer(x, z, G) !== 1) continue
    const north = z === G.z1
    const along = (x === G.x1 || x === G.x2) ? z : x                       // the coordinate along this face
    const post = (x === G.x1 || x === G.x2) ? (z === G.z1 || z === G.z2 || GPOST_Z.includes(z)) : (x === G.x1 || x === G.x2 || (!north && GPOST_X.includes(x)))
    const mull = (x === G.x1 || x === G.x2) ? GMULL_Z.includes(along) : GMULL_X.includes(along)
    for (let y = 64; y <= 82; y++) {
      let s
      if (y === 64) s = 'blue_concrete'
      else if (y === 82) s = 'blue_concrete'
      else if (y === 74 || y === 75) s = WROOF(x, y, z)                    // the ledge band through the glass line
      else if (north && y <= 73) s = (inR(x, 478, 481) && inR(y, 65, 68)) ? 'air'             // against the wing: the way in
        : (inR(x, 477, 482) && y <= 69) || x === G.x1 || x === G.x2 || y === 73 ? WH(x, y, z) : 'pink_concrete' // a pink wall (it lights the glass pink), white round the way in
      else if (north && inR(x, 477, 484) && inR(y, 77, 80)) s = WH(x, y, z) // the gallery's sign panel (BAG SKINS inside)
      else if (post) s = 'blue_concrete'
      else if (mull || y === 67) s = 'white_concrete'
      else s = pane(x, y, z)
      S(x, y, z, s)
    }
  }
  // the ledge band (y 74..75) all round, 2 out from the glass (it carries on as the wing's roof at z 941), and the blue
  // roof beam (y 82..83) 1 out
  for (let x = G.x1 - 2; x <= G.x2 + 2; x++) for (let z = G.z1; z <= G.z2 + 2; z++) {
    if (layer(x, z, G) > 0) continue
    S(x, 74, z, WROOF); S(x, 75, z, WROOF)
  }
  for (let x = G.x1 - 1; x <= G.x2 + 1; x++) for (let z = G.z1; z <= G.z2 + 1; z++) {
    if (layer(x, z, G) > 1) continue
    S(x, 82, z, 'blue_concrete'); S(x, 83, z, 'blue_concrete')
  }
  // the blue posts, 2x2 out from the glass at the corners and mid-face, full height (they pass the ledge)
  const posts = [[G.x1 - 1, G.x1, G.z2, G.z2 + 1], [G.x2, G.x2 + 1, G.z2, G.z2 + 1], [G.x1 - 1, G.x1, G.z1 - 1, G.z1], [G.x2, G.x2 + 1, G.z1, G.z1],
    [G.x1 - 1, G.x1, 952, 953], [G.x2, G.x2 + 1, 952, 953], [480, 481, G.z2, G.z2 + 1]]
  for (const [x1, x2, z1, z2] of posts) F(x1, 64, z1, x2, 83, z2, 'blue_concrete')
  // the south door through the mid-south post (x 480..481, z 963..964), where the path from 2nd Street arrives: an open
  // doorway y 65..67 under the post's blue lintel (y 68 up), a smooth stone threshold, a red mat inside
  for (let x = 480; x <= 481; x++) {
    for (const z of [G.z2, G.z2 + 1]) { S(x, 64, z, 'smooth_stone'); for (let y = 65; y <= 67; y++) S(x, y, z, 'air') }
    S(x, 65, G.z2 - 1, 'red_carpet')
  }
  // the showroom: the round platform (a half step up, ringed in red on the floor), four tier pedestals, the vault bag in a
  // glass case on a gold plinth
  for (let x = G.x1 + 1; x <= G.x2 - 1; x++) for (let z = G.z1 + 1; z <= G.z2 - 1; z++) {
    const r = Math.hypot(x + 0.5 - PLAT.cx, z + 0.5 - PLAT.cz)
    if (r <= PLAT.r) S(x, 65, z, 'smooth_quartz_slab[type=bottom]')
    else if (r <= PLAT.r + 1) S(x, 64, z, 'red_concrete')
  }
  for (const [x, z] of PEDS) { S(x, 65, z, 'quartz_pillar[axis=y]'); S(x, 66, z, 'smooth_quartz_slab[type=bottom]') }
  F(480, 65, 952, 481, 66, 953, 'gold_block'); F(480, 67, 952, 481, 67, 953, 'glass'); F(480, 68, 952, 481, 68, 953, 'smooth_quartz_slab[type=bottom]')
  // the stairs up along the east glass (x 488..490: no gap between them and the glass), a solid quartz stringer under them
  // with a half-height rail at x 487, which stops 2 short of the bottom so the first two steps are walked onto from the
  // showroom's floor (x 487, z 961..962)
  for (let z = STAIR.zTop; z <= STAIR.zBot; z++) {
    const sy = stairY(z)
    for (let x = STAIR.x1; x <= STAIR.x2; x++) { for (let y = 65; y < sy; y++) S(x, y, z, 'smooth_quartz'); S(x, sy, z, 'quartz_stairs[facing=north,half=bottom]') }
    if (z > STAIR.zTop && z <= STAIR.zBot - 2) { for (let y = 65; y <= Math.min(sy, 73); y++) S(487, y, z, 'smooth_quartz'); if (sy + 1 <= 73) S(487, sy + 1, z, 'smooth_quartz_slab[type=bottom]') }
  }
  for (let x = STAIR.x1; x <= STAIR.x2; x++) for (let z = 953; z <= 956; z++) for (const y of [74, 75]) if (inStairHole(x, y, z)) S(x, y, z, 'air')
  // the gallery's rail round the stair hole
  for (let z = 953; z <= 957; z++) S(487, 76, z, 'glass_pane')
  for (let x = STAIR.x1; x <= STAIR.x2; x++) S(x, 76, 957, 'glass_pane')
  // the gallery: skin pedestals along the west and south glass, a pink sofa facing the street, a rug, a coffee table,
  // potted azaleas
  for (const [x, z] of SKINPEDS) { S(x, 76, z, 'quartz_pillar[axis=y]'); S(x, 77, z, 'smooth_quartz_slab[type=bottom]') }
  for (let x = 477; x <= 483; x++) for (let z = 945; z <= 951; z++) if (!(x === 483)) S(x, 76, z, 'magenta_carpet')
  for (let z = 946; z <= 950; z++) S(483, 76, z, 'cherry_stairs[facing=east,half=bottom]')
  S(483, 76, 945, 'cherry_trapdoor[facing=north,half=bottom,open=true]'); S(483, 76, 951, 'cherry_trapdoor[facing=south,half=bottom,open=true]')
  F(479, 76, 947, 480, 76, 949, 'smooth_quartz_slab[type=top]')
  // azaleas in the corners, planted in the floor (moss): no flower pots, whose plant comes away in a player's hand
  for (const [x, z] of [[471, 943], [490, 943], [471, 962], [479, 943]]) { S(x, 75, z, 'moss_block'); S(x, 76, z, 'flowering_azalea') }
}

// ---- the giant duffel on the glass box's roof (the Pet Shop's dog statue, made over: Q1) ----------------------------------
// The loot duffel's 3D model blown up (make-item-art.js BAGS.loot and its bag_loot_3d texture): tan canvas, light on top
// and darker underneath, a green band the whole length at mid height with the gold $ over it on both long sides (west
// toward Main, east toward the lot), black straps round it at a quarter and three quarters of its length that rise into a
// carry handle with a grey grip, a grey zipper along the light top with a gold pull, round end caps with a darker seam
// ring at the rim and a short strap loop in the middle. Canvas blocks only (packed mud, smooth sandstone, terracotta): no
// wood grain. 16 long (z 945..960, the loops 944 and 961), 9 across, 8 tall (y 86..93), the handle to y 96; a round
// cross-section, the ends tapered.
// It stands on a light two-step stand like the helmet's (y 84 polished andesite, slab-edged, y 85 smooth stone), and a
// little west of the box's middle, so from Main the band and the whole $ clear the ledge and the roof beam.
const DUF = { cx: 478.5, cy: 90.0, y0: 86, zA: 945, zB: 960, rx: 4.3, ry: 4.0, straps: [949, 956] }
// The $ as a 5x7 glyph (rows y 93 .. 87, columns z 950..954 between the straps, left to right as seen from that side):
// the item art's 3x5 one (make-item-art.js DOLLAR) blown up read as a squiggle from the street.
const DOLLAR = ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..']
const DOLLAR_Y = DUF.cy + 3, DOLLAR_Z = 950
function duffel () {
  const { cx, cy, y0, zA, zB, rx, ry, straps } = DUF
  const X1 = Math.floor(cx - rx) - 1, X2 = Math.ceil(cx + rx) + 1, Y2 = y0 + 2 * ry
  // the stand: rounded rectangles (a superellipse, power 4) under the bag, y 84 two wider than it, y 85 just wider than
  // the rows it rests on
  const zc = (zA + zB + 1) / 2
  const rr = (x, z, ax, az) => ((Math.abs(x + 0.5 - cx) / ax) ** 4 + (Math.abs(z + 0.5 - zc) / az) ** 4) ** 0.25
  for (let x = X1 - 2; x <= X2 + 2; x++) for (let z = zA - 3; z <= zB + 3; z++) {
    const d = rr(x, z, rx + 2, (zB - zA + 1) / 2 + 2)
    if (d <= 1) S(x, y0 - 2, z, d > 0.88 ? 'polished_andesite_slab[type=bottom]' : 'polished_andesite')
    if (rr(x, z, 3.2, (zB - zA + 1) / 2 + 1) <= 1) S(x, y0 - 1, z, 'smooth_stone')
  }
  const f = z => [0.72, 0.9, 0.97][Math.min(z - zA, zB - z)] || 1
  const shape = (x, y, z) => { if (z < zA || z > zB || y < y0) return false; const k = f(z), dx = (x + 0.5 - cx) / (rx * k), dy = (y + 0.5 - cy) / (ry * k); return dx * dx + dy * dy <= 1 }
  for (let x = X1; x <= X2; x++) for (let y = y0; y <= Y2; y++) for (let z = zA; z <= zB; z++) {
    if (!shape(x, y, z)) continue
    const surf = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, b, c]) => !shape(x + a, y + b, z + c))
    if (!surf) { S(x, y, z, 'brown_concrete'); continue }
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, r = Math.hypot(nx, ny)
    const top = !shape(x, y + 1, z)
    let s
    // canvas, not wood: no grain anywhere (stripped wood read as a log or a keg from the street), and the end caps plain
    // canvas with a thin darker seam ring at their rim (a dark centre read as a log's heart or a keyhole)
    if (z <= zA + 1 || z >= zB - 1) s = r > 0.78 ? 'brown_concrete' : 'packed_mud'                              // the end caps
    else if (straps.includes(z)) s = 'black_terracotta'                                                          // the straps
    else if (top && x === Math.floor(cx)) s = 'smooth_stone'                                                     // the zipper (grey metal on the light top)
    else if ((y === cy - 1 || y === cy) && Math.abs(nx) > 0.5) s = 'green_concrete'                              // the band
    else if (ny / (r || 1) > 0.62) s = 'smooth_sandstone'                                                        // the light top
    else if (ny / (r || 1) < -0.55) s = 'brown_terracotta'                                                       // the shaded bottom
    else s = 'packed_mud'
    S(x, y, z, s)
  }
  // the gold $ over the band on both long sides (columns left to right as seen from that side)
  const side = (y, z, west) => { for (let x = west ? X1 : X2; west ? x <= X2 : x >= X1; x += west ? 1 : -1) if (shape(x, y, z)) return x; return null }
  const W = DOLLAR[0].length
  for (const west of [true, false]) for (let y = DOLLAR_Y - DOLLAR.length + 1; y <= DOLLAR_Y; y++) for (let z = DOLLAR_Z; z < DOLLAR_Z + W; z++) {
    const c = west ? z - DOLLAR_Z : DOLLAR_Z + W - 1 - z
    if (DOLLAR[DOLLAR_Y - y][c] !== '#') continue
    const xs = side(y, z, west); if (xs !== null) S(xs, y, z, 'gold_block')
  }
  // the carry handle up from the straps (over the bag's top, y 93), its grey grip; the zipper's gold pull at the south end
  const hx = Math.floor(cx), ht = y0 + 7
  for (const z of straps) { S(hx, ht + 1, z, 'black_terracotta'); S(hx, ht + 2, z, 'black_terracotta') }
  for (let z = straps[0]; z <= straps[1]; z++) S(hx, ht + 3, z, inR(z, 951, 954) ? 'gray_wool' : 'black_terracotta')
  S(hx, ht + 1, zB - 3, 'gold_block')
  // a short strap loop sewn to the middle of each end cap (what reads as a bag's end, not a log's, from 2nd Street)
  for (const z of [zA - 1, zB + 1]) for (let y = cy - 1; y <= cy + 1; y++) S(hx, y, z, 'black_terracotta')
}

// ---- the walkway between the shops --------------------------------------------------------------------------------------
function walkway () {
  for (let x = WALK.x1; x <= WALK.x2; x++) for (let z = WALK.z1; z <= WALK.z2; z++)
    pave(x, z, (z === WALK.z1 || z === WALK.z2 || x % 6 === 0) ? 'smooth_stone' : 'light_gray_concrete')
  // the planter in the middle (a raised bed with a curbed rim, a round oak and flowers), benches against its long sides
  const P = { x1: 480, x2: 485, z1: 903, z2: 908 }
  for (let x = P.x1; x <= P.x2; x++) for (let z = P.z1; z <= P.z2; z++) {
    const rim = x === P.x1 || x === P.x2 || z === P.z1 || z === P.z2
    S(x, 64, z, 'dirt'); S(x, 65, z, rim ? 'stone_bricks' : 'grass_block')
    if (rim) S(x, 66, z, 'smooth_stone_slab[type=bottom]')
    else if (h(x, 31, z) < 45 && !(x === 482 && z === 905)) S(x, 66, z, FLOWERS[h(x, 32, z) % FLOWERS.length])
  }
  oak(S, 482, 905, 65)
  for (const [z, f] of [[902, 'south'], [909, 'north']]) {
    for (let x = 481; x <= 484; x++) S(x, 65, z, `spruce_stairs[facing=${f},half=bottom]`)
    S(480, 65, z, 'spruce_trapdoor[facing=west,half=bottom,open=true]'); S(485, 65, z, 'spruce_trapdoor[facing=east,half=bottom,open=true]')
  }
  // lamps either side of the planter, a bin by the street
  for (const x of [474, 491]) { for (let y = 65; y <= 67; y++) S(x, y, 905, 'diorite_wall'); S(x, 68, 905, 'lantern') }
  S(467, 65, 902, 'lime_concrete'); S(467, 66, 902, 'iron_trapdoor[facing=north,half=bottom]')
}

// ---- the rear parking lot -------------------------------------------------------------------------------------------------
// A drive straight through from 1st Street to 2nd Street (x 520..533, the two curb cuts), a cross drive to East Street
// (z 920..933), cross aisles at both ends (z 869..874, 979..983), and four rows of stalls (3 wide, white lines every 4)
// on two inner aisles: W1 x 501..506 and W2 x 514..518 on aisle A x 507..513, E1 x 535..539 and E2 x 548..553 on aisle B
// x 540..547; 1-wide planted islands at x 519 and x 534 along the drive with lamps and trees. A pedestrian spine carries
// the walkway on through the lot (z 900..911: paved islands across the stall rows, zebra crossings at z 903..908) out to
// East Street's sidewalk. Its border is a curbed light grey ring that follows the street arc at the north-east corner.
// A pocket park takes the middle of the south-east rows (PARK: E1, aisle B and E2 over z 943..969, on the stall grid: the
// stalls either side stay whole), so the asphalt seen from the ridge breaks up: grass, a cross of paths, four oaks, benches.
const PARK = { x1: 535, x2: 553, z1: 943, z2: 969 }
const inPark = (x, z) => inR(x, PARK.x1, PARK.x2) && inR(z, PARK.z1, PARK.z2)
const LOTCOLS = [[501, 506], [514, 518], [535, 539], [548, 553]]
const LOTROWS = [[875, 899], [912, 919], [934, 978]]
const ISLES = [519, 534]
const PED = { z1: 900, z2: 911, cz1: 903, cz2: 908 }
const AISLES = [[507, 513], [520, 533], [540, 547]]
const inCut = (x, z) => inBox(x, z, CUTS)
const lotCell = (x, z) => mine(x, z) && ((inR(x, LOT.x1, LOT.x2) && inR(z, LOT.z1, LOT.z2)) || inCut(x, z))
function lot () {
  const inRow = z => LOTROWS.some(([a, b]) => inR(z, a, b))
  for (let x = LOT.x1; x <= BX2; x++) for (let z = BZ1; z <= BZ2; z++) {
    if (!mine(x, z)) continue
    if (!lotCell(x, z)) {
      // the verges between the lot and the streets: grass, a hedge next to the lot's curb, the pedestrian spine paved
      if (inR(z, PED.cz1, PED.cz2) && x > LOT.x2) { pave(x, z, 'light_gray_concrete'); continue }
      S(x, 64, z, 'grass_block')
      const hedge = (z === LOT.z1 - 1 && inR(x, LOT.x1, LOT.x2)) || (x === LOT.x2 + 1 && inR(z, LOT.z1, LOT.z2)) || (z === LOT.z2 + 1 && inR(x, LOT.x1, LOT.x2))
      if (hedge) S(x, 65, z, LEAF(x, 65, z))
      continue
    }
    PAVED.add(`${x},${z}`)
    const cut = inCut(x, z)
    const edge = !cut && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([a, c]) => !lotCell(x + a, z + c))
    const ped = inR(z, PED.z1, PED.z2)
    if (edge) {
      S(x, 64, z, 'light_gray_concrete')
      const gap = (x === LOT.x1 && ped) || (x === LOT.x2 && inR(z, PED.cz1, PED.cz2)) // the spine's ends: no curb
      if (!gap) S(x, 65, z, 'smooth_stone_slab[type=bottom]')
      continue
    }
    // the pocket park: curbed at its north and south ends (open where its path meets aisle B), grass inside with a cross of
    // paths (the planted island x 534 and the lot's own curb x 554 close its other sides)
    if (inPark(x, z)) {
      const nsPath = inR(x, 543, 544), ewPath = inR(z, 955, 956), plaza = inR(x, 541, 546) && inR(z, 953, 958)
      if (z === PARK.z1 || z === PARK.z2) { S(x, 64, z, 'light_gray_concrete'); if (!nsPath) S(x, 65, z, 'smooth_stone_slab[type=bottom]'); continue }
      if (plaza) S(x, 64, z, (x === 541 || x === 546 || z === 953 || z === 958) ? 'smooth_stone' : 'polished_andesite')
      else if (nsPath || ewPath) S(x, 64, z, (x + z) % 5 === 0 ? 'smooth_stone' : 'light_gray_concrete')
      else S(x, 64, z, 'grass_block')
      continue
    }
    // the islands along the drive and the pedestrian spine's islands across the stall rows (curbed, flush where the
    // zebra crossings meet them)
    const isle = ISLES.includes(x) && (inRow(z) || ped)
    const pedIsle = ped && (LOTCOLS.some(([a, b]) => inR(x, a, b)) || ISLES.includes(x))
    if (isle || pedIsle) {
      S(x, 64, z, 'light_gray_concrete')
      const ramp = inR(z, PED.cz1, PED.cz2) && AISLES.some(([a, b]) => x === a - 1 || x === b + 1) // flush where a crossing lands
      if (!ramp) S(x, 65, z, 'smooth_stone_slab[type=bottom]')
      continue
    }
    // zebra crossings over the aisles and the drive on the spine
    if (inR(z, PED.cz1, PED.cz2) && AISLES.some(([a, b]) => inR(x, a, b))) { S(x, 64, z, (z - PED.cz1) % 2 === 0 ? 'white_concrete' : ASPH(x, 64, z)); continue }
    if (ped && AISLES.some(([a, b]) => inR(x, a, b))) { S(x, 64, z, ASPH(x, 64, z)); continue }
    // stall lines
    const col = LOTCOLS.find(([a, b]) => inR(x, a, b))
    let line = false
    if (col) for (const [a, b] of LOTROWS) if (inR(z, a, b) && (z - a) % 4 === 0) line = true
    S(x, 64, z, line ? 'white_concrete' : ASPH(x, 64, z))
  }
  park()
  // trees at the islands' ends (their trunk cells planted) and lamps on the islands, arms over the stalls
  for (const x of ISLES) for (const z of [876, 918, 935, 977]) { S(x, 64, z, 'grass_block'); S(x, 65, z, 'air'); tallOak(x, z) }
  for (const z of [887, 957]) { streetLamp(S, 519, z, -1, 0); streetLamp(S, 534, z, 1, 0) }
  streetLamp(S, 519, 901, -1, 0); streetLamp(S, 534, 910, 1, 0) // the pedestrian spine's islands: the lot's middle lit at night
  streetLamp(S, LOT.x1, 944, 1, 0); streetLamp(S, LOT.x2, 965, -1, 0)
  // stop bars where the drive leaves for the streets (the outbound half of each driveway: traffic keeps right, PLAN 4.2,
  // so the east half heading north to 1st Street, the west half heading south to 2nd, the south half heading east)
  for (let x = 527; x <= 533; x++) S(x, 64, 869, 'white_concrete')
  for (let x = 520; x <= 526; x++) S(x, 64, 983, 'white_concrete')
  for (let z = 927; z <= 933; z++) S(553, 64, z, 'white_concrete')
}

// the pocket park's planting and furniture (its ground is lot()'s): four tall oaks in the quarters (crowns clear of the lot
// lamps' heads at (537, 74, 957) and (551, 74, 965)), benches facing the north-south path, lantern posts at the plaza's
// corners, a ring of flowers round the plaza, shrubs and flowers in the grass
function park () {
  const grass = (x, z) => inPark(x, z) && z > PARK.z1 && z < PARK.z2 && !inR(x, 543, 544) && !inR(z, 955, 956) && !(inR(x, 541, 546) && inR(z, 953, 958))
  const used = new Set()
  for (const [x, z] of [[538, 948], [549, 948], [538, 963], [549, 963]]) {
    tallOak(x, z); for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) used.add(`${x + i},${z + k}`)
  }
  // benches (2 long, spruce stairs with trapdoor arms), backs to the grass, looking at the path
  for (const [x, f, a] of [[542, 'west', 'west'], [545, 'east', 'east']]) for (const z1 of [946, 962]) {
    for (let z = z1; z <= z1 + 1; z++) { S(x, 65, z, `spruce_stairs[facing=${f},half=bottom]`); used.add(`${x},${z}`) }
    S(x, 65, z1 - 1, 'spruce_trapdoor[facing=north,half=bottom,open=true]'); S(x, 65, z1 + 2, 'spruce_trapdoor[facing=south,half=bottom,open=true]')
    used.add(`${x},${z1 - 1}`); used.add(`${x},${z1 + 2}`)
  }
  for (const [x, z] of [[541, 953], [546, 958]]) { for (let y = 65; y <= 67; y++) S(x, y, z, 'diorite_wall'); S(x, 68, z, 'lantern') }
  // the flower ring round the plaza (the grass cells touching it), then scattered shrubs, flowers and tufts
  for (let x = 540; x <= 547; x++) for (let z = 952; z <= 959; z++) {
    if (!grass(x, z) || used.has(`${x},${z}`)) continue
    S(x, 65, z, FLOWERS[h(x, 41, z) % FLOWERS.length]); used.add(`${x},${z}`)
  }
  for (let x = PARK.x1; x <= PARK.x2; x++) for (let z = PARK.z1; z <= PARK.z2; z++) {
    if (!grass(x, z) || used.has(`${x},${z}`)) continue
    const v = h(x, 42, z)
    if (v < 4 && grass(x + 1, z) && grass(x, z + 1) && !used.has(`${x + 1},${z}`) && !used.has(`${x},${z + 1}`)) {
      shrub(S, x, z); used.add(`${x},${z}`); used.add(`${x + 1},${z}`); used.add(`${x},${z + 1}`)
    } else if (v < 12) S(x, 65, z, FLOWERS[h(x, 43, z) % FLOWERS.length])
    else if (v < 22) S(x, 65, z, 'short_grass')
  }
}

// ---- the lit BAGS sign by the road (post at 466, 909): a dark box on one post at the wing's far end from the glass box, ---
// where the Pet Shop's lime-and-white sign box stands, over the walkway's mouth; its faces north and south to the traffic
// on Main, lit across their whole width. 3 wide (x 465..467): clear of the wing's overhang at x 468..469 and of the
// glass box's ledge band; its underside y 67 leaves the walkway's head room.
const SIGN = { x: 466, z: 909 }
function bagsSign () {
  // polished deepslate, not blackstone: its top (y 72) is open sky by the road, and polished_blackstone is a GPS road block
  // (PLAN 8.3 step 7, 10.2)
  const { x, z } = SIGN
  S(x, 65, z, 'polished_deepslate_wall'); S(x, 66, z, 'polished_deepslate_wall')
  F(x - 1, 67, z - 1, x + 1, 72, z + 1, 'polished_deepslate')
  for (let y = 68; y <= 71; y++) {
    const g = y >= 70 ? 'lime_stained_glass' : 'white_stained_glass'
    for (let i = x - 1; i <= x + 1; i++) { S(i, y, z - 1, g); S(i, y, z + 1, g); S(i, y, z, 'sea_lantern') }
  }
}

// ---- the service strips behind the shops: a dumpster lookalike and air units ------------------------------------------------
function service () {
  F(497, 65, 875, 498, 66, 877, 'green_terracotta'); F(497, 67, 875, 498, 67, 877, 'deepslate_tile_slab[type=bottom]') // the lid (no blackstone slab open to the sky: 10.2)
  for (const z0 of [946, 956]) { F(494, 65, z0, 495, 66, z0 + 1, 'iron_block'); F(494, 67, z0, 495, 67, z0 + 1, 'iron_trapdoor[facing=north,half=bottom]') }
  for (const z of [880, 890]) S(497, 65, z, h(497, 4, z) < 50 ? 'stripped_oak_wood[axis=y]' : 'stripped_birch_wood[axis=y]')
}

// ---- the module ------------------------------------------------------------------------------------------------------------
module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  PAVED.clear()
  ground(); walkway(); lot(); gearShop(); wing(); glassBox(); helmet(); duffel(); bagsSign(); service(); lawns()
  B = null
  return b
}

// ---- labels (text displays tagged town_label; 0.03 off the face, coordinates always with their decimals) ---------------------
module.exports.labels = [
  { x: 469.97, y: 72.12, z: 886.0, facing: 'west', text: 'GEAR SHOP', color: '#8ff0ff', scale: 3 },      // the storefront's blue band
  { x: 483.0, y: 72.12, z: 871.97, facing: 'north', text: 'GEAR SHOP', color: '#ffffff', scale: 3 },     // toward 1st Street (the middle of x 470..495)
  { x: 489.5, y: 72.12, z: 900.03, facing: 'south', text: 'GEAR SHOP', color: '#ffffff', scale: 3 },     // toward the walkway (east of the planter's oak)
  { x: 496.03, y: 72.12, z: 886.0, facing: 'east', text: 'GEAR SHOP', color: '#ffffff', scale: 3 },      // toward the rear lot
  { x: 493.97, y: 71.15, z: 880.5, facing: 'west', text: 'HELMETS & VESTS', color: '#ffffff', scale: 1.5 }, // over the gear wall
  { x: 493.97, y: 71.15, z: 891.5, facing: 'west', text: 'HEIST TOOLS', color: '#ffffff', scale: 1.5 },   // over the tools wall
  { x: 485.97, y: 65.2, z: 880.5, facing: 'west', text: 'GEAR', color: '#0b2a5a', scale: 1.2 },          // the counter's front (dark on the lit glass)
  { x: 485.97, y: 65.2, z: 891.5, facing: 'west', text: 'TOOLS', color: '#0b2a5a', scale: 1.2 },
  { x: 469.97, y: 71.15, z: 927.0, facing: 'west', text: 'BAGS', color: '#ffffff', scale: 4 },           // over the red entrance
  { x: 486.0, y: 71.15, z: 911.97, facing: 'north', text: 'BAG SHOP', color: '#ffffff', scale: 3.5 },    // toward the walkway
  { x: 498.03, y: 71.15, z: 926.5, facing: 'east', text: 'BAG SHOP', color: '#ffffff', scale: 3.5 },     // toward the rear lot (the red band)
  { x: 466.5, y: 70.25, z: 907.97, facing: 'north', text: 'BAGS', color: '#14320f', scale: 2.4 },        // the lit sign box's lime panel, both faces
  { x: 466.5, y: 70.25, z: 911.03, facing: 'south', text: 'BAGS', color: '#14320f', scale: 2.4 },
  { x: 466.5, y: 68.4, z: 907.97, facing: 'north', text: 'OPEN', color: '#d01c1c', scale: 1.5 },         // its white panel
  { x: 466.5, y: 68.4, z: 911.03, facing: 'south', text: 'OPEN', color: '#d01c1c', scale: 1.5 },
  { x: 469.97, y: 71.2, z: 917.0, facing: 'west', text: 'BAG SHOP', color: '#ffffff', scale: 2.5 },      // the wing's red band between the pilasters
  { x: 469.97, y: 71.2, z: 936.0, facing: 'west', text: 'DUFFELS', color: '#ffffff', scale: 2.5 },
  { x: 467.97, y: 74.15, z: 952.5, facing: 'west', text: 'BAG SHOP', color: '#e0287a', scale: 4.5 },  // the glass box's white ledge band, toward Main
  { x: 481.0, y: 74.15, z: 966.03, facing: 'south', text: 'BAG SHOP', color: '#e0287a', scale: 4.5 },  // and toward 2nd Street
  { x: 480.0, y: 70.35, z: 943.03, facing: 'south', text: 'BAGS', color: '#ffffff', scale: 6 },         // the showroom, over the way in (on its pink wall, y 70..72)
  { x: 481.0, y: 78.3, z: 943.03, facing: 'south', text: 'BAG SKINS', color: '#ff7fc0', scale: 3 },      // the gallery's back wall
  ...PEDS.map(([x, z, t]) => ({ x: x < 481 ? x - 0.03 : x + 1.03, y: 65.25, z: z + 0.5, facing: x < 481 ? 'west' : 'east',
    text: ['Gym Bag', 'Duffel Bag', 'Hockey Bag', 'Armored Duffel'][t - 1], color: '#ffffff', scale: 0.55 })),
  { x: 479.97, y: 65.75, z: 953.0, facing: 'west', text: 'Vault Bag', color: '#5a3c00', scale: 0.7 },    // the gold plinth
  { x: 496.03, y: 67.6, z: 896.5, facing: 'east', text: 'STAFF ONLY', color: '#1d1d1d', scale: 0.7 },   // the back doors
  { x: 498.03, y: 67.6, z: 936.5, facing: 'east', text: 'STAFF ONLY', color: '#1d1d1d', scale: 0.7 }
]

// ---- item displays (tagged town_display; town.js displays): gear, tools and bags by their pack models -------------------------
// Helmets and vests: their base items with the custom model data string donating:gear_<id> (make-item-art.js GEAR; the
// pack draws them as their inventory sprites). Tools: donating:tool_<t> on iron_ingot (Drill), flint (Safe Kit), breeze_rod
// (Grappler): 3D models. Bags: leather with donating:bag_<tier|skin> (the 3D duffel in every context but the inventory).
// Yaw as the labels' (0 = seen from the south, 90 = from the west, 180 = from the north, -90 = from the east); pitch -90
// lies flat (in the glass cases). Use the item display's "fixed" transform, like an item frame.
const GEARITEM = { 'helmet-1': 'iron_helmet', 'helmet-2': 'diamond_helmet', 'vest-1': 'chainmail_chestplate', 'vest-2': 'diamond_chestplate' }
const TOOLITEM = { drill: 'iron_ingot', 'safe-kit': 'flint', grappler: 'breeze_rod' }
// (PLAN 10.2's default transform is none: without 'fixed' the tools' 3D models skip their display.fixed turn and face
// backwards, and the bags lose their 0.9 scale)
const gear = (id, x, y, z, yaw, pitch = 0, scale = 0.8) => ({ x, y, z, item: GEARITEM[id], cmd: `donating:gear_${id}`, yaw, pitch, scale, transform: 'fixed' })
// A gear sprite standing upright on a top at y `top`: the generated model's fixed transform is a 1-block sprite centred on
// the display, and the art leaves empty rows under the drawing (helmets 2 of 16, vests 1: the pack's gear_*.png), so the
// centre goes s/2 - s * empty/16 over the top (+0.01): the drawing's bottom edge on it, not hovering.
const GEAR_EMPTY = { helmet: 2, vest: 1 }
const gearOn = (id, x, top, z, yaw, scale = 0.8) => gear(id, x, +(top + scale / 2 - scale * GEAR_EMPTY[id.split('-')[0]] / 16 + 0.01).toFixed(3), z, yaw, 0, scale)
const tool = (t, x, y, z, yaw, pitch = 0, scale = 0.8) => ({ x, y, z, item: TOOLITEM[t], cmd: `donating:tool_${t}`, yaw, pitch, scale, transform: 'fixed' })
const bag = (t, x, y, z, yaw, pitch = 0, scale = 0.8) => ({ x, y, z, item: 'leather', cmd: `donating:bag_${t}`, yaw, pitch, scale, transform: 'fixed' })
// A bag standing on a top at y `top`: the 3D duffel (bag_<t>_3d.json) is drawn round its model centre (8, 8, 8) with its
// bottom at y 3 of 16 and its handle's top at 11.8, and its fixed transform scales it 0.9, so its bottom lies
// 5/16 x 0.9 x s under the display (0.225 at s 0.8: at top + 0.45 every bag hovered a quarter block). bagHang: the
// handle's top at a wall hook's arm (y + 0.28 of the hook's block).
const BAG_FOOT = 5 / 16 * 0.9, BAG_HEAD = 3.8 / 16 * 0.9
const bagOn = (t, x, top, z, yaw, scale = 0.8) => bag(t, x, +(top + BAG_FOOT * scale + 0.01).toFixed(3), z, yaw, 0, scale)
const bagHang = (t, x, hookY, z, yaw, scale = 0.8) => bag(t, x, +(hookY + 0.28 - BAG_HEAD * scale).toFixed(3), z, yaw, 0, scale)
const CUBBY = [1, 2, 3, 4, 5, 'camo', 2, 3, 1, 4, 'arctic', 5, 2, 'cherry']
module.exports.displays = [
  // the Gear Shop: window beds (seen from Main), the north case, the counter's cases, the back walls, the floor pedestals
  gearOn('helmet-2', 471.5, 65.5, 877.0, 90), gearOn('vest-2', 471.5, 65.5, 882.0, 90), gearOn('helmet-1', 471.5, 65.5, 890.0, 90), gearOn('vest-1', 471.5, 65.5, 895.0, 90),
  gear('helmet-1', 475.5, 65.5, 874.5, 0, -90, 0.6), gear('helmet-2', 478.5, 65.5, 874.5, 0, -90, 0.6), gear('vest-1', 481.5, 65.5, 874.5, 0, -90, 0.6),
  gear('helmet-2', 486.5, 65.5, 879.5, 90, -90, 0.6), gear('vest-2', 486.5, 65.5, 881.5, 90, -90, 0.6), gear('helmet-1', 486.5, 65.5, 883.5, 90, -90, 0.6),
  tool('safe-kit', 486.5, 65.5, 888.5, 90, -90, 0.6), tool('drill', 486.5, 65.5, 890.5, 90, -90, 0.6), tool('grappler', 486.5, 65.5, 892.5, 90, -90, 0.6),
  ...[876.5, 880.5, 884.5].flatMap((z, i) => [gear(i === 1 ? 'helmet-2' : 'helmet-1', 493.6, 69.6, z, 90), gear(i === 1 ? 'vest-2' : 'vest-1', 493.6, 67.6, z, 90)]),
  ...[['drill', 'safe-kit'], ['safe-kit', 'grappler'], ['grappler', 'drill']].flatMap(([a, c], i) => [tool(a, 493.6, 69.6, 888.5 + 3 * i, 90), tool(c, 493.6, 67.6, 888.5 + 3 * i, 90)]),
  gearOn('helmet-1', 476.5, 66.5, 879.5, 90), gearOn('vest-1', 481.5, 67.5, 879.5, 90), gearOn('vest-2', 476.5, 67.5, 892.5, 90), gearOn('helmet-2', 481.5, 66.5, 892.5, 90),
  gear('helmet-2', 478.6, 65.5, 881.6, 90, -90, 0.6), gear('vest-1', 479.4, 65.5, 882.4, 90, -90, 0.6), tool('grappler', 478.6, 65.5, 889.6, 90, -90, 0.6), tool('drill', 479.4, 65.5, 890.4, 90, -90, 0.6),
  // the Bag Shop's wing: the cubby wall, the hooks, the tables, the counter
  ...[916.0, 919.0, 922.0, 925.0, 928.0, 931.0, 934.0].flatMap((z, i) => [bagOn(CUBBY[2 * i], 490.45, 69.0, z, 90, 0.75), bagOn(CUBBY[2 * i + 1], 490.45, 66.0, z, 90, 0.75)]),
  bagHang(2, 482.5, 70, 914.45, 0), bagHang(3, 485.5, 70, 914.45, 0), bagHang(1, 474.5, 70, 939.55, 180), bagHang(4, 484.5, 70, 939.55, 180),
  bagOn(1, 475.7, 66.0, 917.9, 30, 0.6), bagOn(2, 477.2, 66.0, 919.1, 120, 0.6), bagOn(3, 475.8, 66.0, 935.1, 150, 0.6), bagOn(1, 477.3, 66.0, 933.9, 60, 0.6),
  bagOn(2, 485.5, 66.5, 931.5, 90, 0.6),
  // the two plinths either side of the runner, each bag facing it
  bagOn(4, 479.0, 66.5, 922.0, 0, 0.9), bagOn('arctic', 479.0, 66.5, 932.0, 180, 0.9),
  // the glass box: the tiers round the gold plinth, the vault bag in its glass case (on the gold, under the case's lid), the skins
  // upstairs
  ...PEDS.map(([x, z, t]) => bagOn(t, x + 0.5, 66.5, z + 0.5, x < 481 ? 90 : -90)),
  bagOn(5, 481.0, 67.0, 953.0, 90, 0.9),
  ...SKINPEDS.map(([x, z, s]) => bagOn(s, x + 0.5, 77.5, z + 0.5, z === 960 ? 0 : 90))
]

// ---- spots (PLAN 8.2) --------------------------------------------------------------------------------------------------------
module.exports.points = {
  GEAR_KEEPER, TOOLS_KEEPER, BAG_KEEPER,                // behind their counters, facing the doors (west)
  GEAR_POI: [...GEAR_POI, -90],                         // the "Gear Shop" POI and GPS door node 1044: the path outside the doorway
  BAG_POI: [...BAG_POI, -90],                           // the "Bag Shop" POI and GPS door node 1045: under the canopy, on the carpet
  GEAR_DOOR_IN: [472.5, 65, 886.0, -90],                // just inside the Gear Shop's doorway
  BAG_DOOR_IN: [472.5, 65, 927.0, -90],                 // just inside the Bag Shop's doorway
  BAG_SHOWROOM: [481.0, 65, 960.5, 180],                // the glass box's ground floor, south of the tiers' platform
  BAG_GALLERY: [478.5, 76, 955.5, 90],                  // the bag skins' gallery (up the stairs at x 488..490)
  SHOPS_WALKWAY: [476.5, 65, 905.5, -90]                // the walkway between the shops
}
module.exports.setup = {
  regions: [{ id: 'safe_shops', box: [467, 63, 870, 499, 100, 966], flags: { passthrough: 'allow', 'weapon-shoot': 'deny' },
    note: 'the Gear and Bag Shops, the walkway between them and the front lawn; not the rear lot' }],
  heists: [],
  keepers: [
    { kind: 'gear', at: GEAR_KEEPER, cmd: '/dshopkeeper add gear', note: 'behind the counter\'s gear cases' },
    { kind: 'tools', at: TOOLS_KEEPER, cmd: '/dshopkeeper add tools', note: 'behind the counter\'s tool cases' },
    { kind: 'bag', at: BAG_KEEPER, cmd: '/dshopkeeper add bag', note: 'behind the red counter, in front of the cubby wall' }
  ],
  givers: [], crates: [], carSpots: [], chops: [], garages: [],
  pois: [
    { type: 'shop', name: 'Gear Shop', at: GEAR_POI, launch: true, cmd: '/dpoi add shop Gear Shop' },
    { type: 'shop', name: 'Bag Shop', at: BAG_POI, launch: true, cmd: '/dpoi add shop Bag Shop' }
  ],
  walls: [], holos: []
}

// ---- run on its own: counts, or preview PNGs ----------------------------------------------------------------------------------
//   node tools/build/town/shops.js                    -> block count and bounds
//   node tools/build/town/shops.js --render [<dir>]   -> top, plans, iso views, close-ups, cut-aways and elevations
if (require.main === module) {
  const fs = require('fs'), path = require('path')
  const args = process.argv.slice(2)
  const b = module.exports()
  const bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}; ` +
    `${module.exports.labels.length} labels, ${module.exports.displays.length} displays`)
  const stray = [...b.blocks.keys()].filter(k => { const [x, , z] = k.split(',').map(Number); return ownerOf(x, z) !== MOD })
  if (stray.length) console.log(`STRAY blocks outside the module's columns: ${stray.length}`)
  const ri = args.indexOf('--render')
  if (ri >= 0) {
    const R = require('../render')
    const { Build } = require('../mcstruct')
    const dir = path.resolve(args[ri + 1] && !args[ri + 1].startsWith('--') ? args[ri + 1] : path.join(__dirname, 'renders', 'shops'))
    fs.mkdirSync(dir, { recursive: true })
    const save = (n, img) => { const f = path.join(dir, `${n}.png`); fs.writeFileSync(f, img.png()); console.log(`wrote ${f} (${img.w}x${img.h})`) }
    // preview stand-ins (render.js finds no texture for these): never in the build itself
    const LOOK = { smooth_quartz: 'quartz_block', smooth_quartz_slab: 'quartz_block', short_grass: 'moss_carpet', quartz_stairs: 'quartz_block', smooth_sandstone: 'sandstone' }
    const look = v => { const m = /^(?:minecraft:)?([a-z0-9_]+)(.*)$/.exec(v); return LOOK[m[1]] ? LOOK[m[1]] + (m[1].endsWith('_slab') ? '' : m[2]) : v }
    // the streets round the box for context (asphalt, lines, sidewalks), then the module
    const p = new Build()
    for (let x = 430; x <= 590; x++) for (let z = 836; z <= 1012; z++) {
      const c = streetCell(x, z)
      if (c) p.set(x, 64, z, c.kind === 'walk' ? 'light_gray_concrete' : c.line === 'yellow' ? 'yellow_concrete' : c.line === 'white' ? 'white_concrete' : 'black_concrete')
    }
    for (const [k, v] of b.blocks) p.blocks.set(k, look(v))
    const sub = (x1, z1, x2, z2, y1 = -999, y2 = 999) => { const o = new Build(); for (const [k, v] of p.blocks) { const [x, y, z] = k.split(',').map(Number); if (x >= x1 && x <= x2 && z >= z1 && z <= z2 && y >= y1 && y <= y2) o.blocks.set(k, v) } return o }
    save('top', R.top(sub(440, 850, 580, 1000), 4))
    const bld = sub(462, 866, 500, 968)
    for (const y of [64, 65, 66, 69, 76]) save(`plan-y${y}`, R.plan(bld, y, 8))
    save('plan-lot', R.plan(sub(496, 862, 560, 990), 64, 5))
    for (const d of ['NE', 'SE', 'SW', 'NW']) save(`iso-${d}`, R.iso(sub(440, 850, 580, 1000), d, 3))
    const gearC = sub(461, 862, 502, 908)
    for (const d of ['SW', 'NW', 'NE']) save(`gear-${d}`, R.iso(gearC, d, 9))
    const bagC = sub(461, 906, 502, 990)
    for (const d of ['SW', 'NW', 'SE']) save(`bag-${d}`, R.iso(bagC, d, 8))
    save('helmet-NW', R.iso(sub(470, 872, 497, 900, 73), 'NW', 14)); save('helmet-SW', R.iso(sub(470, 872, 497, 900, 73), 'SW', 14))
    save('duffel-SW', R.iso(sub(466, 940, 496, 968, 82), 'SW', 14)); save('duffel-NE', R.iso(sub(466, 940, 496, 968, 82), 'NE', 14))
    save('cut-gear', R.iso(sub(466, 868, 500, 904, -999, 71), 'SW', 11))
    save('cut-wing', R.iso(sub(466, 908, 500, 945, -999, 72), 'SW', 11))
    save('cut-box', R.iso(sub(466, 938, 496, 968, -999, 73), 'SW', 11))
    save('cut-gallery', R.iso(sub(466, 938, 496, 968, -999, 81), 'SW', 11))
    save('cut-gallery-NE', R.iso(sub(466, 938, 496, 968, -999, 81), 'NE', 11))
    // elevations: straight at a face (the nearest block of each cell, glass blended over what's behind it)
    const elev = (face, bb, ppx) => {
      const { canvas } = require('../../png')
      const f = { east: [c => -c.z, c => c.x], west: [c => c.z, c => -c.x], north: [c => -c.x, c => -c.z], south: [c => c.x, c => c.z] }[face]
      const cells = []
      for (const [k, s] of bb.blocks) { const col = R.blockColor(s); if (!col) continue; const [x, y, z] = k.split(',').map(Number); if (y < 64) continue; cells.push({ x, y, z, col, u: f[0]({ x, z }), d: f[1]({ x, z }) }) }
      const u1 = Math.min(...cells.map(c => c.u)), u2 = Math.max(...cells.map(c => c.u))
      const y1 = Math.min(...cells.map(c => c.y)), y2 = Math.max(...cells.map(c => c.y))
      const d1 = Math.min(...cells.map(c => c.d)), d2 = Math.max(...cells.map(c => c.d))
      const img = canvas((u2 - u1 + 1) * ppx, (y2 - y1 + 1) * ppx)
      for (let i = 0; i < img.w * img.h; i++) img.px.set([150, 190, 230, 255], i * 4)
      cells.sort((a, c) => a.d - c.d) // far first, near last (painted over)
      for (const c of cells) {
        const sh = 0.55 + 0.45 * (c.d - d1) / Math.max(1, d2 - d1), a = (c.col[3] ?? 255) / 255
        for (let i = 0; i < ppx; i++) for (let j = 0; j < ppx; j++) {
          const X = (c.u - u1) * ppx + i, Y = (y2 - c.y) * ppx + j, o = (Y * img.w + X) * 4
          for (let k = 0; k < 3; k++) img.px[o + k] = Math.round(img.px[o + k] * (1 - a) + Math.min(255, c.col[k] * sh) * a)
        }
      }
      return img
    }
    save('elev-west', elev('west', sub(465, 865, 499, 986), 8))
    save('elev-north', elev('north', sub(465, 865, 556, 905), 6))
    save('elev-south', elev('south', sub(465, 930, 499, 986), 8))
    const missing = [...new Set([...b.blocks.values()].map(v => look(v)))].filter(v => { const c = R.blockColor(v); return c && c[0] === 255 && c[1] === 0 && c[2] === 255 })
    if (missing.length) console.log(`no texture (magenta in the previews): ${[...new Set(missing.map(v => v.split('[')[0]))].join(', ')}`)
  }
}
