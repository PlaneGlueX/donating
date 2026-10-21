'use strict'
// gunshop: the Gun Shop, its shooting range annex, the parking lot, the target signs and the pennant (tools/build/town/
// PLAN.md section 6.1; regions and spots in 8.1 and 8.2). Box x 465..556, z 730..842, every height (BOX.gunshop).
// Jailbreak's town gun shop (the wiki's gunshop_* pictures) in the prison's style: a long lavender-grey front with three
// black stripes (a pair low on the wall, one under the fascia), one dark window block (the thin stripe running on across
// it as a transom), a stretch of wall, the glazed entrance with its doors held open and a long blank wall to the corner;
// the south end face solid navy; a white roof with a light line along its top edge, vents and HVAC units; a red-tiled
// hall with pegboard gun walls and a free-standing pegboard, a lit glass island and an L-shaped lit counter with the
// keeper's side behind both arms; a red corridor to eight booth windows and a brick backstop, a dark opening in the
// range's north face showing its red wall (onto the lot's asphalt); a big round target on a pole by Main Street in front
// of the window block, turned to face the bridge and the street both, a small one on the roof peeking over the front and
// a red pennant on the front lawn by the south end.
// Run on its own: node tools/build/town/gunshop.js [--render <dir> [--px n]]
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

const MOD = 'gunshop'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, s) }
const SB = { set: S } // for COMMON's door(): every half of a door goes through S too
// a filled box; s may be a function (x, y, z) -> state
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, typeof s === 'function' ? s(x, y, z) : s)
}

// ---- the plan's numbers (PLAN.md 6.1 and 8) --------------------------------------------------------------------------
const SHOP = { x1: 478, x2: 509, z1: 776, z2: 831 }   // walls y 64..74 (2 thick), roof y 75 with a 1-block overhang
const ANNEX = { x1: 510, x2: 545, z1: 786, z2: 821 }  // the range: shares the shop's east wall (x 508..509)
const LOT = { x1: 466, x2: 554, z1: 731, z2: 770 }
const OPEN = { x1: 518, x2: 532, z1: 771, z2: 785 }   // asphalt from the lot's south edge to the range's opening (x 519..531, z 786)
const DRIVE = { z1: 744, z2: 757 }                    // Main's curb cut (DRIVEWAYS [461, 744, 464, 757])
const BAY_Z = 822                                     // the back room (z 822..829); the navy is the south face (z 831) only
const WIN = { z1: 781, z2: 791, mull: [783, 786, 789] } // the window block's glass (frame at z 780 and 792), 4 panes of 2
const DOOR_Z = [802, 803]                             // the open front doorway, x 478, y 65..67, transom y 68..71
const RDOOR_Z = [788, 789]                            // the doorway into the range corridor, x 508..509
const PART = [787, 791, 795, 799, 803, 807, 811, 815, 819] // booth partitions (x 515..517)
const LANES = [789, 793, 797, 801, 805, 809, 813, 817]     // booth and lane centres (booths z c-1..c+1)
const KEEPER = [496.5, 65, 803.5, 90]
const POI = [476.5, 65, 802.5]

const inShop = (x, z) => x >= SHOP.x1 && x <= SHOP.x2 && z >= SHOP.z1 && z <= SHOP.z2
const inAnnex = (x, z) => x >= ANNEX.x1 && x <= ANNEX.x2 && z >= ANNEX.z1 && z <= ANNEX.z2
const inFoot = (x, z) => inShop(x, z) || inAnnex(x, z)
const shopLayer = (x, z) => inShop(x, z) ? Math.min(x - SHOP.x1, SHOP.x2 - x, z - SHOP.z1, SHOP.z2 - z) + 1 : 0
const annexLayer = (x, z) => inAnnex(x, z) ? Math.min(ANNEX.x2 - x, z - ANNEX.z1, ANNEX.z2 - z) + 1 : 0 // west: the shop's wall
const inRange = (v, a, b) => v >= a && v <= b

// ---- materials ---------------------------------------------------------------------------------------------------------
const LAV = 'light_blue_terracotta'                   // Jailbreak's lavender-grey walls, inside (under the hall's lights)
// outside: clay, the pictures' pale lavender-grey. light_blue_terracotta came out dark purple-grey there, darker still on
// the shaded west face.
const OUT = 'clay'
// The shop's navy: blue concrete with lapis (toward the pictures' blue, sampled 70,107,174 and 46,85,154: blue concrete
// alone reads purple) and a little wool for texture. MIX.navy (mostly blue_terracotta) reads purple-grey here, so it
// stays only in the indoor skirting (inner()).
const NAVY = [['blue_concrete', 55], ['lapis_block', 30], ['blue_wool', 15]]
const NV = (x, y, z) => pick(x, y, z, NAVY)
const WH = (x, y, z) => pick(x, y, z, MIX.white)      // indoor white (ceilings): never under the open sky
const WR = (x, y, z) => pick(x, y, z, [['smooth_quartz', 60], ['calcite', 40]]) // the white roof (no road blocks on top)
const BR = (x, y, z) => pick(x, y, z, MIX.brick)
const ASPH = (x, y, z) => pick(x, y, z, MIX.asphalt)
const TRIM = 'blue_concrete'                          // window and door frames
// The stripes (gunshop_current, measured from the ground up): lavender y 65, the thick black band y 66, lavender y 67, a
// thin black stripe y 68, lavender y 69..72, black y 73, the navy fascia y 74. The base course (y 64) stays under the
// grass and the aprons.
const STRIPE = y => y === 66 || y === 68 || y === 73
// the outer face: a navy base course, the black stripes, a navy fascia band under the roof (the navy face: navy between)
const ext = (x, y, z, navy) => y === 64 || y === 74 ? NV(x, y, z) : STRIPE(y) ? 'black_concrete' : navy ? NV(x, y, z) : OUT
// the inner face of the shop: a navy skirting, the same black stripes (they line up through the glass), lavender
const inner = (x, y, z) => y <= 65 ? 'blue_terracotta' : STRIPE(y) ? 'black_concrete' : LAV
// the range's red walls: a red_nether_bricks base, a white trim line under the ceiling
const red = (x, y, z) => y <= 65 ? 'red_nether_bricks' : y === 73 ? 'white_concrete' : 'red_concrete'
const shopFloor = (x, y, z) => ((x >> 1) + (z >> 1)) & 1 ? 'red_concrete' : 'red_concrete_powder' // 2x2 bright red tiles (indoors, on y 63 ground)
const backFloor = (x, y, z) => ((x >> 1) + (z >> 1)) & 1 ? 'light_gray_concrete' : 'polished_andesite'
const tile = (x, y, z) => (z % 4 === 0 || x === 512) ? 'purple_terracotta' : 'pink_terracotta' // the range's pink tiles

// a pegboard: a light_blue_concrete backing in the wall's inner layer and open iron trapdoors in front of it
const PEG = f => `iron_trapdoor[facing=${f},half=bottom,open=true]`
// a lit display case: cyan glass over a sea lantern in the floor, optionally a quartz top (the shop counters)
const litCase = (x, z, top) => { S(x, 64, z, 'sea_lantern'); S(x, 65, z, 'light_blue_stained_glass'); if (top) S(x, 66, z, 'smooth_quartz_slab[type=bottom]') }

// ---- the ground: lot, aprons, paths, lawn --------------------------------------------------------------------------------
function ground () {
  const [bx1, bz1, bx2, bz2] = BOX.gunshop[0]
  // the aprons: 2 blocks of light_gray_concrete round the shop and the range (8-neighbour distance 1..2)
  const near = (x, z, d) => { for (let i = -d; i <= d; i++) for (let k = -d; k <= d; k++) if (inFoot(x + i, z + k)) return true; return false }
  const paved = new Set()
  const pave = (x, z, s) => { S(x, 64, z, s); paved.add(`${x},${z}`) }
  for (let x = bx1; x <= bx2; x++) for (let z = bz1; z <= bz2; z++) {
    if (inFoot(x, z)) continue
    // the lot
    if (inRange(x, LOT.x1 - 1, LOT.x2) && inRange(z, LOT.z1, LOT.z2)) {
      const drive = x <= LOT.x1 && inRange(z, DRIVE.z1, DRIVE.z2)
      if (x === LOT.x1 - 1 && !drive) continue                                  // x 465: the hedge strip (below)
      const border = !drive && (x === LOT.x1 || x === LOT.x2 || z === LOT.z1 || z === LOT.z2)
      const cut = z === LOT.z2 && inRange(x, OPEN.x1, OPEN.x2) // no curb where the lot runs on to the range's opening
      if (border) { pave(x, z, 'light_gray_concrete'); if (z !== LOT.z1 && !cut) S(x, 65, z, 'smooth_stone_slab[type=bottom]'); continue }
      // the middle island z 753..755 (x 480..550): curbed concrete edges, a grass bed down its middle
      if (inRange(x, 480, 550) && inRange(z, 753, 755)) {
        if (z === 754 && x > 480 && x < 550) { S(x, 64, z, 'grass_block'); paved.add(`${x},${z}`) } else { pave(x, z, 'light_gray_concrete'); S(x, 65, z, 'smooth_stone_slab[type=bottom]') }
        continue
      }
      let line = false
      if (inRange(z, 732, 737) && x >= 470 && x <= 550 && (x - 470) % 5 === 0) line = true          // the north row's stalls
      if ((inRange(z, 748, 752) || inRange(z, 756, 760)) && x >= 480 && x <= 550 && (x - 480) % 5 === 0) line = true // the double row
      if (x === 467 && inRange(z, DRIVE.z1, 750)) line = true                                       // stop bar, the way out
      pave(x, z, line ? 'white_concrete' : ASPH(x, 64, z))
      continue
    }
    // the lot's asphalt runs on to the range's dark opening (gunshop_view2)
    if (inRange(x, OPEN.x1, OPEN.x2) && inRange(z, OPEN.z1, OPEN.z2)) { pave(x, z, ASPH(x, 64, z)); continue }
    // aprons round the buildings, the front path, the walk from the lot, the service yard (both sides of that asphalt),
    // the side door path
    const apron = near(x, z, 2)
    const front = inRange(x, bx1, 477) && inRange(z, 801, 804)
    const walk = inRange(x, 474, 477) && inRange(z, 771, 773)
    const yard = (inRange(x, 512, 517) || inRange(x, 533, 542)) && inRange(z, 776, 783)
    const side = inRange(x, 496, 498) && inRange(z, 834, bz2)
    if (apron || front || walk || yard || side) { pave(x, z, (x % 6 === 0 || z % 6 === 0) ? 'smooth_stone' : 'light_gray_concrete'); continue }
    S(x, 64, z, 'grass_block')
  }
  // lawn texture: Jailbreak's orange ground well away from anything paved, grass tufts elsewhere
  const openLawn = (x, z, d) => { for (let i = -d; i <= d; i++) for (let k = -d; k <= d; k++) { const X = x + i, Z = z + k; if (X < bx1 || X > bx2 || Z < bz1 || Z > bz2 || paved.has(`${X},${Z}`) || inFoot(X, Z) || (inRange(X, LOT.x1 - 1, LOT.x2) && inRange(Z, LOT.z1, LOT.z2))) return false } return true }
  for (let x = bx1; x <= bx2; x++) for (let z = bz1; z <= bz2; z++) {
    if (!openLawn(x, z, 0)) continue
    if (orangeAt(x, z) && openLawn(x, z, 2)) S(x, 64, z, pick(x, 64, z, MIX.orange))
    else if (h(x, 9, z) < 9 && openLawn(x, z, 1)) S(x, 65, z, 'short_grass')
  }
  // the hedge between the lot and Main Street's sidewalk (x 465), broken by the driveway
  for (let z = LOT.z1; z <= LOT.z2; z++) if (!inRange(z, DRIVE.z1, DRIVE.z2)) { S(LOT.x1 - 1, 64, z, 'grass_block'); S(LOT.x1 - 1, 65, z, h(465, 5, z) < 70 ? 'oak_leaves[persistent=true]' : 'azalea_leaves[persistent=true]') }
  // the fence along the lot's north edge (z 731), 2 high
  for (let x = LOT.x1; x <= LOT.x2; x++) { S(x, 65, LOT.z1, 'dark_oak_fence'); S(x, 66, LOT.z1, 'dark_oak_fence') }
  // lot lights: on the island and on the south border, arms over the stalls
  streetLamp(S, 490, 754, 0, -1); streetLamp(S, 515, 754, 0, 1); streetLamp(S, 540, 754, 0, -1)
  streetLamp(S, 492, LOT.z2, 0, -1); streetLamp(S, 536, LOT.z2, 0, -1) // (not at x 518..532: the curb cut to the opening)
  for (const x of [484, 498, 506, 522, 532, 546]) if (h(x, 6, 754) < 70) S(x, 65, 754, h(x, 7, 754) < 50 ? 'oak_leaves[persistent=true]' : 'azalea_leaves[persistent=true]')
}

// ---- the shop's shell -----------------------------------------------------------------------------------------------------
function shopShell () {
  for (let x = SHOP.x1; x <= SHOP.x2; x++) for (let z = SHOP.z1; z <= SHOP.z2; z++) {
    const l = shopLayer(x, z)
    if (l === 1) {
      if (x === SHOP.x2 && inRange(z, ANNEX.z1, ANNEX.z2)) {
        // the east wall's outer layer inside the annex: the corridor's red west wall (z 788..819), hidden at the corners
        for (let y = 64; y <= 73; y++) S(x, y, z, inRange(z, 788, 819) ? red(x, y, z) : LAV)
        S(x, 74, z, WH(x, 74, z))
      } else for (let y = 64; y <= 74; y++) S(x, y, z, ext(x, y, z, z === SHOP.z2)) // navy: the south end face only (its corners too)
    } else if (l === 2) {
      for (let y = 64; y <= 73; y++) S(x, y, z, inner(x, y, z))
      S(x, 74, z, WH(x, 74, z))
    } else {
      S(x, 64, z, z >= BAY_Z ? backFloor(x, 64, z) : shopFloor(x, 64, z))
      for (let y = 65; y <= 73; y++) S(x, y, z, 'air')
      S(x, 74, z, WH(x, 74, z))
    }
  }
  // the front, north to south (gunshop_current, about 30 px a block): 4 blocks of corner wall (z 776..779), the window
  // block (frame z 780..792), the wall again (z 793..797), the entrance (z 798..807), then blank wall to the corner.
  // The window block: dark blue glass in a navy frame, y 66..71, four panes of 2 between navy mullions, the inner layer
  // open behind the glass (a reveal, a quartz sill); the thin y 68 stripe runs on across it as a black transom (it wins
  // over the mullions), while the thick y 66 band stops at the frame (glass there)
  for (let z = WIN.z1 - 1; z <= WIN.z2 + 1; z++) for (let y = 65; y <= 72; y++) {
    const edge = z < WIN.z1 || z > WIN.z2 || y === 65 || y === 72, mull = WIN.mull.includes(z)
    S(SHOP.x1, y, z, edge ? TRIM : y === 68 ? 'black_concrete' : mull ? TRIM : 'blue_stained_glass_pane')
    if (!edge && !mull && y !== 68) S(SHOP.x1 + 1, y, z, 'air')
  }
  for (let z = WIN.z1; z <= WIN.z2; z++) if (!WIN.mull.includes(z)) S(SHOP.x1 + 1, 65, z, 'smooth_quartz_slab[type=top]')
  // the entrance (Jailbreak's glazed double door), as tall as the window block: the open doorway z 802..803, y 65..67,
  // a glass transom y 68..71 over it, dark glass sidelights z 799..800 and 805..806 (y 65..71), navy posts at z 798, 801,
  // 804 and 807 and a navy head at y 72 (under the y 73 stripe); the inner layer open behind the glass
  for (let z = 798; z <= 807; z++) for (let y = 64; y <= 72; y++) {
    const door = DOOR_Z.includes(z), side = (z >= 799 && z <= 800) || (z >= 805 && z <= 806)
    if (y === 64) { S(SHOP.x1, y, z, door ? 'smooth_stone' : NV(SHOP.x1, y, z)); if (door) S(SHOP.x1 + 1, y, z, 'smooth_stone'); continue }
    if (y === 72) { S(SHOP.x1, y, z, TRIM); continue }                                    // the head (x 479 stays the wall)
    if (door && y <= 67) { S(SHOP.x1, y, z, 'air'); S(SHOP.x1 + 1, y, z, 'air'); continue }
    if (door || side) { S(SHOP.x1, y, z, 'blue_stained_glass_pane'); S(SHOP.x1 + 1, y, z, 'air'); continue }
    S(SHOP.x1, y, z, TRIM); S(SHOP.x1 + 1, y, z, TRIM)                                    // a post, 2 deep
  }
  // the glazed double door, held open inward: iron doors (hands can't close them) on the smooth_stone sill, each panel
  // lying along its post (z 801, 804), 1.6 blocks clear between them
  door(SB, SHOP.x1 + 1, 65, DOOR_Z[0], 'east', 'left', true); door(SB, SHOP.x1 + 1, 65, DOOR_Z[1], 'east', 'right', true)
  // the side door (gunshop_view2's white door in the navy end face): a closed iron door in a white frame, into the back room
  door(SB, 497, 65, SHOP.z2, 'south')
  S(497, 65, SHOP.z2 - 1, 'air'); S(497, 66, SHOP.z2 - 1, 'air')
  for (let y = 64; y <= 67; y++) { S(496, y, SHOP.z2, 'smooth_quartz'); S(498, y, SHOP.z2, 'smooth_quartz') }
  S(497, 67, SHOP.z2, 'smooth_quartz'); S(497, 64, SHOP.z2, 'smooth_stone')
}

// ---- the shop's interior ----------------------------------------------------------------------------------------------------
function shopInside () {
  // the partition to the back room (z 821) with a closed staff door
  for (let x = 480; x <= 507; x++) for (let y = 64; y <= 73; y++) S(x, y, 821, inner(x, y, 821))
  door(SB, 500, 65, 821, 'north')
  for (let y = 65; y <= 67; y++) { S(499, y, 821, TRIM); S(501, y, 821, TRIM) }
  S(500, 67, 821, TRIM)

  // the north gun wall (z 777 backing): pegboard y 66..71 over a lit glass case, a navy frame
  for (let x = 481; x <= 506; x++) for (let y = 65; y <= 72; y++) {
    if (x === 481 || x === 506 || y === 72) S(x, y, 777, TRIM)
    else if (y >= 66) { S(x, y, 777, 'light_blue_concrete'); S(x, y, 778, PEG('south')) }
  }
  for (let x = 482; x <= 505; x++) litCase(x, 778, false)
  // the east gun wall (x 508 backing): beside the corridor doorway, above the window to the range, south of it
  const eastPeg = (z1, z2, y1, y2) => {
    for (let z = z1; z <= z2; z++) {
      for (let y = y1; y <= y2; y++) { S(508, y, z, 'light_blue_concrete'); S(507, y, z, PEG('west')) }
      S(508, y2 + 1, z, TRIM)
    }
  }
  eastPeg(779, 786, 66, 71); eastPeg(791, 793, 66, 71); eastPeg(795, 815, 70, 71); eastPeg(817, 820, 66, 71)
  // a lit glass case along the east wall (not in front of the corridor doorway)
  for (let z = 779; z <= 820; z++) if (z < 787 || z > 790) litCase(507, z, false)
  // the doorway into the range corridor: navy-framed, x 508..509, z 788..789, y 65..67
  for (const x of [508, 509]) {
    for (const z of RDOOR_Z) { for (let y = 65; y <= 67; y++) S(x, y, z, 'air'); S(x, 68, z, TRIM); S(x, 64, z, 'smooth_stone') }
    for (const z of [787, 790]) for (let y = 64; y <= 68; y++) S(x, y, z, TRIM)
  }
  // the window to the range corridor: clear glass at x 509, z 795..815, y 66..68 (mullions every 5), a navy frame, the
  // inner layer open behind it
  for (let z = 794; z <= 816; z++) for (let y = 65; y <= 69; y++) {
    const frame = z === 794 || z === 816 || y === 65 || y === 69
    S(509, y, z, frame || [800, 805, 810].includes(z) ? TRIM : 'glass_pane')
    S(508, y, z, frame ? TRIM : 'air')
  }

  // the L-shaped counter: the long arm 1 deep at x 495 (z 795..812), the short arm along z 812 (x 488..494); cyan-lit
  // glass fronts over sea lanterns, a quartz slab top; the navy register on the short arm, facing the staff side
  for (let z = 795; z <= 812; z++) litCase(495, z, true)
  for (let x = 488; x <= 494; x++) litCase(x, 812, true)
  S(491, 66, 812, 'blue_concrete'); S(492, 66, 812, 'polished_deepslate_slab[type=bottom]')
  S(495, 66, 804, 'polished_deepslate_slab[type=bottom]')                                  // a card terminal by the keeper
  // pillars with black bands at the counter's two ends (2x2, to the ceiling)
  for (const [x0, z0] of [[495, 793], [486, 812]]) F(x0, 65, z0, x0 + 1, 73, z0 + 1, inner)
  // the staff side behind both arms (gunshop_interior2: the keeper and a pegboard behind each arm): the keeper's box
  // x 496..506, z 795..812 and the strip x 488..506, z 813..820 behind the short arm, closed by low quartz walls (1.5
  // high) at z 794 and along x 487 (z 814..820, from the pillar to the partition), a post over the east case at z 794
  for (let x = 497; x <= 506; x++) { S(x, 65, 794, 'smooth_quartz'); S(x, 66, 794, 'smooth_quartz_slab[type=bottom]') }
  for (let z = 814; z <= 820; z++) { S(487, 65, z, 'smooth_quartz'); S(487, 66, z, 'smooth_quartz_slab[type=bottom]') }
  S(507, 66, 794, 'smooth_quartz'); S(507, 67, 794, 'smooth_quartz')
  // the pegboard behind the short arm, on the partition (z 821) facing north, y 66..71 (not round the staff door), and
  // the staff shelving under it at x 489..493 (2 deep, y 65..67: the board above it y 68..71)
  for (let x = 488; x <= 506; x++) {
    if (x >= 498 && x <= 502) continue
    const y1 = x >= 489 && x <= 493 ? 68 : 66
    for (let y = y1; y <= 71; y++) { S(x, y, 821, 'light_blue_concrete'); S(x, y, 820, PEG('north')) }
    S(x, 72, 821, TRIM)
  }
  for (let x = 489; x <= 493; x++) for (const z of [819, 820]) {
    S(x, 65, z, 'stripped_dark_oak_wood')
    S(x, 66, z, (x + z) % 3 === 0 ? 'stripped_spruce_wood' : 'green_terracotta')
    S(x, 67, z, 'dark_oak_slab[type=bottom]')
  }
  // in the keeper's box: a gun bench, ammo cans and crates
  F(501, 65, 806, 503, 65, 806, 'dark_oak_planks'); F(501, 66, 806, 503, 66, 806, 'dark_oak_slab[type=bottom]')
  F(497, 65, 796, 499, 65, 796, 'green_terracotta'); S(497, 66, 796, 'green_terracotta')
  F(504, 65, 809, 506, 65, 811, 'stripped_spruce_wood'); F(505, 66, 810, 506, 66, 811, 'stripped_spruce_wood')
  for (const [x, z] of [[504, 809], [504, 810], [504, 811], [505, 809], [506, 809]]) S(x, 66, z, 'spruce_trapdoor[facing=north,half=bottom,open=false]')
  // the white outline on the floor in front of the counter (Jailbreak's shop square)
  for (let x = 487; x <= 492; x++) for (let z = 799; z <= 808; z++) if (x === 487 || x === 492 || z === 799 || z === 808) S(x, 64, z, 'white_concrete')
  // its thin white corner posts, nearly to the ceiling (gunshop_interior2)
  for (const [x, z] of [[487, 799], [492, 799], [487, 808], [492, 808]]) for (let y = 65; y <= 71; y++) S(x, y, z, 'end_rod[facing=up]')

  // the customer side: a lit glass island in the north half, a bench by the front wall between the windows and the
  // door, planters by the door, a doormat, ammo shelves in the south-west corner
  for (let x = 488; x <= 496; x++) for (const z of [786, 787]) litCase(x, z, true)
  for (const z of [786, 787]) { S(487, 65, z, 'blue_concrete'); S(497, 65, z, 'blue_concrete'); S(487, 66, z, 'smooth_quartz_slab[type=bottom]'); S(497, 66, z, 'smooth_quartz_slab[type=bottom]') }
  // a free-standing double-sided pegboard right behind the window block (gunshop_interior), so its guns show from Main
  // Street: a 1-thick core (navy foot, light blue board, navy cap), pegs and a lit glass case on both faces
  for (let z = WIN.z1 + 1; z <= WIN.z2 - 1; z++) {
    S(483, 65, z, NV(483, 65, z)); S(483, 71, z, TRIM)
    for (let y = 66; y <= 70; y++) { S(483, y, z, 'light_blue_concrete'); S(482, y, z, PEG('west')); S(484, y, z, PEG('east')) }
    litCase(482, z, false); litCase(484, z, false)
  }
  for (let z = 793; z <= 796; z++) S(480, 65, z, 'polished_blackstone_stairs[facing=west,half=bottom]') // its back to the wall
  for (const z of [800, 805]) { S(480, 65, z, 'moss_block'); S(480, 66, z, 'flowering_azalea') }
  for (const z of DOOR_Z) { S(480, 65, z, 'gray_carpet'); S(481, 65, z, 'gray_carpet') }
  for (let x = 481; x <= 485; x++) for (const z of [816, 817]) {
    S(x, 65, z, 'stripped_dark_oak_wood')
    S(x, 66, z, (x + z) % 3 === 0 ? 'stripped_spruce_wood' : 'green_terracotta')
    S(x, 67, z, 'dark_oak_slab[type=bottom]')
  }
  // ceiling lights: three long strips in the hall, one in the back room
  for (const x of [485, 493, 501]) for (const [z1, z2] of [[781, 786], [790, 795], [799, 804], [808, 813], [816, 819]]) F(x, 74, z1, x, 74, z2, 'sea_lantern')
  F(493, 74, 824, 493, 74, 827, 'sea_lantern')

  // the back room (z 822..829): a desk and chair, a safe, ammo shelves on the partition, crates
  F(482, 65, 827, 486, 65, 827, 'dark_oak_slab[type=top]'); S(484, 65, 826, 'dark_oak_stairs[facing=north,half=bottom]')
  F(505, 65, 828, 506, 66, 829, 'iron_block'); F(505, 65, 827, 506, 66, 827, PEG('north'))
  for (let x = 482; x <= 497; x++) { S(x, 65, 822, 'stripped_dark_oak_wood'); S(x, 66, 822, h(x, 66, 822) < 60 ? 'green_terracotta' : 'stripped_spruce_wood'); S(x, 67, 822, 'dark_oak_slab[type=bottom]') }
  F(502, 65, 823, 504, 66, 824, 'stripped_spruce_wood'); S(503, 67, 823, 'stripped_spruce_wood')
}

// ---- the shooting range annex -----------------------------------------------------------------------------------------------
function range () {
  for (let x = ANNEX.x1; x <= ANNEX.x2; x++) for (let z = ANNEX.z1; z <= ANNEX.z2; z++) {
    const l = annexLayer(x, z)
    if (l === 1) {
      // outside: the shop's wall language on every face (the brick backstop is only inside, x 544), so the range reads as
      // part of the gun shop from the east and south-east too
      for (let y = 64; y <= 74; y++) S(x, y, z, ext(x, y, z, false))
    } else if (l === 2) {
      // inside: red walls (z 787, z 820), the brick far wall (x 544)
      for (let y = 64; y <= 73; y++) S(x, y, z, x === ANNEX.x2 - 1 ? BR(x, y, z) : red(x, y, z))
      S(x, 74, z, WH(x, 74, z))
    } else {
      // the floor: pink tiles in the corridor and booths, dark under the shooting ledge, lanes, grass at the far end
      let f
      if (x <= 516) f = tile(x, 64, z)
      else if (x === 517) f = 'polished_deepslate'
      else if (x >= 541) f = 'grass_block'
      else if (PART.includes(z)) f = 'red_concrete'                                             // lane dividers
      else if ((x === 526 || x === 534) && LANES.includes(z)) f = 'white_concrete'                // distance marks
      else f = 'smooth_stone'
      S(x, 64, z, f)
      for (let y = 65; y <= 73; y++) S(x, y, z, 'air')
      S(x, 74, z, WH(x, 74, z))
    }
  }
  // the booths: polished_deepslate partitions (x 515..517, y 65..68) every 4 z with navy posts at the corridor end, a navy
  // lintel over them all (y 69), the red wall above, and a booth window at x 517 (gunshop_range): deepslate tile panels at
  // y 65 and 67..68 round a 1-high shooting slit at y 66. Standing eyes (66.62) and sneaking eyes (66.27) are in the
  // slit and the targets (x 542, y 66..68) in full view; nobody fits through, so nobody walks downrange.
  for (const z of PART) { S(515, 64, z, TRIM); for (let y = 65; y <= 68; y++) { S(515, y, z, TRIM); S(516, y, z, 'polished_deepslate'); S(517, y, z, 'polished_deepslate') } }
  for (let z = 787; z <= 820; z++) {
    for (let x = 515; x <= 517; x++) { S(x, 69, z, TRIM); for (let y = 70; y <= 73; y++) S(x, y, z, x === 517 && y === 70 ? 'white_concrete' : red(x, y, z)) }
    if (z >= 788 && z <= 819 && !PART.includes(z)) { S(517, 65, z, 'deepslate_tiles'); S(517, 66, z, 'air'); S(517, 67, z, 'deepslate_tiles'); S(517, 68, z, 'deepslate_tiles') }
  }
  for (let y = 64; y <= 73; y++) for (let x = 515; x <= 517; x++) if (y !== 69) S(x, y, 820, red(x, y, 820))
  // the targets: white boards with three target blocks down their middle, on iron legs, at x 542
  for (const c of LANES) {
    for (let y = 66; y <= 68; y++) { S(542, y, c - 1, 'white_concrete'); S(542, y, c, 'target'); S(542, y, c + 1, 'white_concrete') }
    S(542, 65, c - 1, 'iron_bars'); S(542, 65, c + 1, 'iron_bars')
    if (h(541, 65, c) < 50) S(541, 65, c + (h(c, 1, 541) < 50 ? -2 : 2), 'short_grass')
  }
  for (let z = 788; z <= 819; z++) if (h(543, 65, z) < 35) S(543, 65, z, 'short_grass')
  // the ceiling: red and white trim beams across the lanes, lit panels, a lantern line down the corridor
  for (let z = 788; z <= 819; z++) { S(523, 73, z, 'red_concrete'); S(524, 73, z, 'white_concrete'); S(533, 73, z, 'red_concrete'); S(534, 73, z, 'white_concrete') }
  for (const c of LANES) { S(519, 74, c, 'sea_lantern'); for (let k = -1; k <= 1; k++) { S(528, 74, c + k, 'sea_lantern'); S(538, 74, c + k, 'sea_lantern') } }
  for (let z = 790; z <= 818; z += 4) S(512, 74, z, 'sea_lantern')
  // the corridor's south end: a bench
  for (let x = 511; x <= 513; x++) S(x, 65, 819, 'polished_blackstone_stairs[facing=south,half=bottom]')
  // outside, toward the lot: a deep opening in the north face with the range's red wall inside (Jailbreak's dark opening
  // with a red interior); the inner red layer (z 787) stays, so the range is still closed
  for (let x = 519; x <= 531; x++) for (let y = 64; y <= 71; y++) {
    const fr = x === 519 || x === 531 || y === 71
    if (y === 64) { S(x, y, ANNEX.z1, fr ? 'polished_deepslate' : 'polished_blackstone'); continue }
    S(x, y, ANNEX.z1, fr ? 'polished_deepslate' : 'air')
  }
  for (let x = 520; x <= 530; x++) S(x, 70, ANNEX.z1, 'polished_deepslate_slab[type=top]')     // a lintel lip
}

// ---- the roof: the white slab with its glowing top edge, HVAC boxes, the small target -----------------------------------------
function roof () {
  for (let x = SHOP.x1 - 1; x <= ANNEX.x2 + 1; x++) for (let z = SHOP.z1 - 1; z <= SHOP.z2 + 1; z++) {
    if (inFoot(x, z)) { S(x, 75, z, WR(x, 75, z)); continue }
    // the 1-block overhang, and on top of it the light line (Jailbreak's glow runs along the top of the white slab):
    // end rods laid along each edge (south = along z, the west and east faces; east = along x, the north and south faces)
    const alongZ = inFoot(x + 1, z) || inFoot(x - 1, z), alongX = inFoot(x, z + 1) || inFoot(x, z - 1)
    let ring = alongZ || alongX
    for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) if (inFoot(x + i, z + k)) ring = true
    if (ring) { S(x, 75, z, 'smooth_quartz'); S(x, 76, z, `end_rod[facing=${alongZ && !alongX ? 'south' : 'east'}]`) }
  }
  // HVAC units: grey boxes with a fan grille on top, a duct, a hatch
  for (const [x0, z0] of [[491, 798], [491, 817], [526, 801]]) {
    F(x0, 76, z0, x0 + 2, 77, z0 + 2, 'light_gray_concrete')
    S(x0 + 1, 78, z0 + 1, 'iron_trapdoor[facing=north,half=bottom,open=false]')
    S(x0 - 1, 76, z0 + 1, 'polished_andesite'); S(x0 - 2, 76, z0 + 1, 'polished_andesite')
  }
  S(540, 76, 815, 'iron_trapdoor[facing=north,half=bottom,open=false]')
  // the range's ventilation: two exhaust fans over the lanes and a duct from the big unit to the shop's roof
  for (const [x0, z0] of [[536, 792], [536, 811]]) { F(x0, 76, z0, x0 + 1, 76, z0 + 1, 'polished_andesite'); F(x0, 77, z0, x0 + 1, 77, z0 + 1, 'iron_trapdoor[facing=north,half=bottom,open=false]') }
  for (let x = 508; x <= 523; x++) S(x, 76, 802, 'polished_andesite_slab[type=bottom]')
  S(507, 76, 802, 'polished_andesite'); S(507, 77, 802, 'iron_trapdoor[facing=north,half=bottom,open=false]') // its end cap
  // vent stacks and a roof hatch box over the back room
  for (const [x, z] of [[486, 824], [500, 784], [484, 792], [520, 816], [530, 790]]) { S(x, 76, z, 'andesite_wall'); S(x, 77, z, 'iron_trapdoor[facing=north,half=bottom,open=false]') }
  F(502, 76, 825, 504, 76, 827, 'light_gray_concrete'); S(503, 77, 826, 'iron_trapdoor[facing=north,half=bottom,open=false]')
  // the small roof target (gunshop_current: only its upper half peeks over the roof, between the door and the end):
  // radius 4.5 round the block (z 812, y 81), 2 thick (x 492..493), 15 blocks back from the roof's edge, on navy legs.
  // From Main Street the roof edge hides it below about y 81, and the pennant (z 826..831) flies clear of it
  disc(492, 493, 812, 81, 4.5, 0)
  for (const x of [492, 493]) for (const z of [811, 813]) S(x, 76, z, NV(x, 76, z))
}

// A target disc in the plane x x1..x2 round the block (zc, yc), its rings in proportion to r like the pictures' (d = the
// distance from the centre): white d < 0.5r, black d <= 0.72r, the red rim out to r, and a pink bullseye d <= dot (1.5:
// a 3x3 dot; 0: one cell). Both faces alike, the edge red. red_wool, nearer the pictures' coral than red concrete (never
// concrete powder: the disc floats).
const ring = (d, r, dot) => d <= dot ? 'pink_concrete' : d < 0.5 * r ? 'white_concrete' : d <= 0.72 * r ? 'black_concrete' : 'red_wool'
function disc (x1, x2, zc, yc, r, dot) {
  for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
    const d = Math.hypot(dz, dy)
    if (d > r) continue
    for (let x = x1; x <= x2; x++) S(x, yc + dy, zc + dz, ring(d, r, dot))
  }
}

// ---- the target sign, the pennant, planting ------------------------------------------------------------------------------------
// The big target sign by Main Street, in front of the window block at the end nearest the bridge (gunshop_current, and
// gunshop_view: the first thing seen coming down Main). Radius 8 (y 80..96): the disc as wide as the pole below it is
// tall, like both pictures. Its plane is turned 27 degrees off the front (a 1:2 slope, the cleanest staircase after
// 45), so it faces west-north-west: Jailbreak's disc reads round both from the approach road and from across the street,
// and here the two are at right angles. Off its axis: 40 degrees from the bridge's south end (an x-plane disc: 67),
// 27 from directly across Main, 33 from the Donut Shop; near edge-on only from the lot. A 2x2 navy pole (470..471,
// 782..783, y 65..79) on a concrete footing (clear of the lawn's tufts).
function bigSign () {
  const R = 8
  F(469, 64, 781, 472, 64, 784, 'light_gray_concrete'); F(469, 65, 781, 472, 65, 784, 'air'); F(470, 64, 782, 471, 64, 783, 'polished_andesite')
  F(470, 65, 782, 471, 79, 783, NV)
  // cells 2dx + dz = -1, 0, 1 round the column (471, 783) (dx, dz from it): a staircase 3 / sqrt 5 = 1.3 blocks thick
  // with no gaps seen from any side; u = the distance along the plane, v = up from the centre (y 88)
  for (let x = 464; x <= 478; x++) for (let z = 774; z <= 792; z++) for (let y = 80; y <= 96; y++) {
    const dx = x - 471, dz = z - 783, v = y - 88
    if (Math.abs(2 * dx + dz) > 1) continue
    const u = (dx - 2 * dz) / Math.sqrt(5), d = Math.hypot(u, v)
    if (d > R) continue
    // the pink dot: 3 cells across (u 0 and +-0.89, the oblique cells 1.34 wide) by 3 high, square seen face-on
    S(x, y, z, Math.abs(u) < 1 && Math.abs(v) <= 1 ? 'pink_concrete' : ring(d, R, -1))
  }
}
function props () {
  bigSign()
  // the pennant by the south end: a thin dark pole (471, 65..80, 826), a red flag at y 77..80 flying south, above the
  // roofline so it reads against the sky (gunshop_view)
  for (let y = 65; y <= 80; y++) S(471, y, 826, 'polished_blackstone_wall')
  const FLAG = { 80: [827, 831], 79: [827, 830], 78: [827, 828], 77: [827, 827] }
  for (const [y, [z1, z2]] of Object.entries(FLAG)) for (let z = z1; z <= z2; z++) S(471, Number(y), z, 'red_wool')
  // by the entrance: a bench against the wall between the window block and the door (iron trapdoor arms: nobody flips
  // them) and a trash bin
  for (let z = 794; z <= 796; z++) S(477, 65, z, 'polished_blackstone_stairs[facing=east,half=bottom]')
  S(477, 65, 793, 'iron_trapdoor[facing=north,half=bottom,open=true]'); S(477, 65, 797, 'iron_trapdoor[facing=south,half=bottom,open=true]')
  S(477, 65, 808, 'green_terracotta'); S(477, 66, 808, 'iron_trapdoor[facing=west,half=bottom,open=false]')
  // shrubs along the front (not in front of the bench or the entrance), and round the corners
  for (let z = 779; z <= 828; z += 3) if (!inRange(z, 792, 808)) shrub(S, 474, z)
  for (const [x, z] of [[484, 772], [492, 772], [500, 772], [508, 836], [520, 836], [549, 790], [549, 805]]) shrub(S, x, z)
  // pines on the lawns (each at least 4 from the box's edge)
  for (const [x, z, t] of [[552, 776, 15], [552, 801, 13], [551, 826, 16], [535, 837, 14], [470, 837, 13], [516, 838, 12]]) pine(S, x, z, t)
  oak(S, 471, 776)
  // the service yard east of the range's opening (x 533..541, so the opening looks onto the lot's asphalt): two AC
  // condensers and a dumpster
  for (const x0 of [533, 536]) { F(x0, 65, 778, x0 + 1, 65, 779, 'light_gray_concrete'); F(x0, 66, 778, x0 + 1, 66, 779, 'iron_trapdoor[facing=north,half=bottom,open=false]') }
  F(539, 65, 778, 541, 66, 779, 'green_concrete'); F(539, 67, 778, 541, 67, 779, 'iron_trapdoor[facing=south,half=bottom,open=false]')
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  ground(); shopShell(); range(); shopInside(); roof(); props()
  B = null
  return b
}

// ---- labels, displays, points, setup ----------------------------------------------------------------------------------------
// Labels sit 0.03 off their face and keep their decimals (a whole number in a command is the block's centre).
module.exports.labels = [
  { x: 477.97, y: 70.25, z: 819.5, facing: 'west', text: 'GUN SHOP', color: '#232a7a', scale: 4 },            // the blank front wall south of the entrance (Main Street): navy on the pale clay
  { x: 494.0, y: 70.25, z: 775.97, facing: 'north', text: 'GUN SHOP', color: '#232a7a', scale: 5 },           // the north face, toward the lot
  { x: 510.03, y: 70.2, z: 805.5, facing: 'east', text: 'SHOOTING\nRANGE', color: '#1d1d1d', scale: 3 },   // the corridor wall over the window
  ...LANES.map((c, i) => ({ x: 514.97, y: 69.15, z: c + 0.5, facing: 'west', text: String(i + 1), color: '#ffffff', scale: 1 })), // on each booth's lintel
  { x: 512.5, y: 68.0, z: 819.97, facing: 'north', text: 'RANGE RULES\nShoot from the booths only\nKeep the muzzle downrange', color: '#ffffff', scale: 0.6 },
  { x: 500.5, y: 68.1, z: 820.97, facing: 'north', text: 'STAFF ONLY', color: '#1d1d1d', scale: 0.7 }
]
// Guns as item displays (town.js displays): a feather with the gun's WeaponMechanics skin number as its custom model data
// float, the melee weapons amethyst shards (core.sk wpn::<W>::model). Yaw as the labels' (0 = seen from the south), pitch
// -90 lies flat (in the glass cases). transform 'fixed' (the item_display transform, like an item frame; PLAN 10.2's default is
// none): every gun model's fixed display hangs it at 45 degrees and scales it to fit (the AK-48 about 1.8 blocks long at 0.8).
const GUNS = [['feather', 9], ['feather', 8], ['feather', 1], ['feather', 15], ['feather', 14], ['feather', 7], ['feather', 5],
  ['feather', 13], ['feather', 11], ['feather', 6], ['amethyst_shard', 1], ['feather', -10], ['amethyst_shard', 2], ['amethyst_shard', 6], ['amethyst_shard', 7]]
let gi = 0
const gun = (x, y, z, yaw, pitch = 0, scale = 0.8) => { const [item, cmd] = GUNS[gi++ % GUNS.length]; return { x, y, z, item, cmd, yaw, pitch, scale, transform: 'fixed' } }
module.exports.displays = [
  // (on the pegboards 0.2 in front of the pegs' 3/16 panels, so thick gun models don't clip into them)
  ...[70.4, 67.9].flatMap(y => [483.5, 486.5, 489.5, 492.5, 495.5, 498.5, 501.5, 504.5].map(x => gun(x, y, 778.4, 0))),      // the north pegboard
  ...[69.8, 67.3].flatMap(y => [783.5, 786.5, 789.5].flatMap(z => [gun(482.6, y, z, 90), gun(484.4, y, z, -90)])),         // the free-standing pegboard, both faces
  ...[70.4, 67.9].flatMap(y => [780.5, 784.5].map(z => gun(507.6, y, z, 90))),                                               // east, north of the doorway
  ...[796.5, 799.5, 802.5, 805.5, 808.5, 811.5, 814.5].map(z => gun(507.6, 70.9, z, 90)),                                     // east, over the window
  ...[818.5].flatMap(z => [70.4, 67.9].map(y => gun(507.6, y, z, 90))),                                                      // east, south part
  ...[70.4, 67.9].flatMap(y => [495.5, 504.5].map(x => gun(x, y, 820.6, 180))), ...[491.5].map(x => gun(x, 70.4, 820.6, 180)), // the partition, behind the short arm
  ...[484.5, 488.5, 492.5, 496.5, 500.5, 504.5].map(x => gun(x, 65.5, 778.5, 0, -90, 0.6)),                                 // the north case
  ...[489.5, 492.5, 495.5].map(x => gun(x, 65.5, 787.0, 0, -90, 0.6)),                                                        // the glass island
  ...[797.5, 801.5, 806.5, 810.5].map(z => gun(495.5, 65.5, z, 90, -90, 0.6)),                                                // the long counter
  ...[489.5, 493.5].map(x => gun(x, 65.5, 812.5, 0, -90, 0.6)),                                                               // the short counter
  ...[781.5, 785.5, 798.5, 804.5, 810.5, 818.5].map(z => gun(507.5, 65.5, z, 90, -90, 0.6)),                                  // the east case
  gun(502.5, 66.55, 806.5, 0, -90, 0.7)                                                                                       // on the gun bench
]
module.exports.points = {
  GUN_KEEPER: KEEPER,                       // the gun shopkeeper behind the counter, facing the door
  GUN_POI: [...POI, -90],                    // the "Gun Shop" POI: the path just outside the front doorway
  GUN_DOOR_IN: [480.5, 65, 802.5, -90],     // just inside the front doorway
  RANGE_ENTRY: [511.5, 65, 788.5, 0],     // in the corridor, through the doorway from the shop
  ...Object.fromEntries(LANES.map((c, i) => [`RANGE_BOOTH_${i + 1}`, [515.5, 65, c + 0.5, -90]])) // a shooter's spot in each booth
}
module.exports.setup = {
  regions: [
    { id: 'safe_gunshop', box: [472, 63, 774, 547, 95, 833], flags: { passthrough: 'allow', 'weapon-shoot': 'deny' }, note: 'the shop, the range and the front lawn up to the doorstep' },
    { id: 'safe_gunrange', box: [515, 64, 787, 544, 76, 820], priority: 10, flags: { passthrough: 'allow', 'weapon-shoot': 'allow' }, note: 'the booths (shooters stand at x 515..516) and the lanes; PvP stays off (safe_*)' }
  ],
  heists: [],
  keepers: [{ kind: 'gun', at: KEEPER, cmd: '/dshopkeeper add gun', note: 'behind the long counter, facing the front door (west)' }],
  givers: [], crates: [], carSpots: [], chops: [], garages: [],
  pois: [{ type: 'shop', name: 'Gun Shop', at: POI, launch: true, cmd: '/dpoi add shop Gun Shop' }],
  walls: [], holos: []
}

// ---- run on its own: counts, or preview PNGs ------------------------------------------------------------------------------------
//   node tools/build/town/gunshop.js                      -> block count and bounds
//   node tools/build/town/gunshop.js --render <dir> [--px n]
//        -> top, plans of the building at y 64..73 and of the lot, iso from the 4 corners, close looks (SW, NW, SE),
//           cut-aways (the rooms at y <= 73, the hall and the range at y <= 72) and elevations (west, the front, south, north)
if (require.main === module) {
  const fs = require('fs'), path = require('path')
  const args = process.argv.slice(2)
  const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
  const b = module.exports()
  const bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}`)
  const dir = arg('--render', null)
  if (dir) {
    const R = require('../render.js')
    const { Build } = require('../mcstruct')
    const px = Number(arg('--px', 4)), s = Math.max(2, Math.round(px / 2))
    fs.mkdirSync(dir, { recursive: true })
    const save = (n, img) => { const f = path.join(dir, `${n}.png`); fs.writeFileSync(f, img.png()); console.log(`wrote ${f} (${img.w}x${img.h})`) }
    // preview stand-ins only (render.js finds no texture for these, or draws them untinted): never in the build itself
    const LOOK = { smooth_quartz: 'quartz_block', smooth_quartz_slab: 'quartz_block', short_grass: 'moss_carpet', flowering_azalea: 'azalea_leaves' }
    const look = v => { const m = /^(?:minecraft:)?([a-z0-9_]+)(.*)$/.exec(v); return LOOK[m[1]] ? LOOK[m[1]] + m[2] : v }
    const sub = keep => { const o = new Build(); for (const [k, v] of b.blocks) { const [x, y, z] = k.split(',').map(Number); if (keep(x, y, z)) o.blocks.set(k, look(v)) } return o }
    const all = sub(() => true)
    save('top', R.top(all, px))
    const bld = sub((x, y, z) => x >= 470 && x <= 552 && z >= 772 && z <= 838)
    for (const y of [64, 65, 66, 67, 70, 73]) save(`plan-y${y}`, R.plan(bld, y, 9))
    save('plan-lot', R.plan(sub((x, y, z) => z <= 775), 64, 7))
    for (const d of ['NE', 'SE', 'SW', 'NW']) save(`iso-${d}`, R.iso(all, d, s))
    const close = sub((x, y, z) => x >= 463 && x <= 552 && z >= 768 && z <= 840)
    for (const d of ['SW', 'NW', 'SE']) save(`close-${d}`, R.iso(close, d, s + 4))
    const cut = sub((x, y, z) => y <= 73 && x >= 476 && x <= 547 && z >= 774 && z <= 833)
    for (const d of ['SW', 'SE', 'NE']) save(`cut-${d}`, R.iso(cut, d, s + 4))
    // the hall alone, cut away at y 72 (the counters, the gun walls, the floor square)
    const hall = sub((x, y, z) => y <= 72 && x >= 476 && x <= 512 && z >= 774 && z <= 833)
    save('hall-SW', R.iso(hall, 'SW', 9)); save('hall-NE', R.iso(hall, 'NE', 9))
    // the range alone, cut away at y 72
    const rng = sub((x, y, z) => y <= 72 && x >= 507 && x <= 547 && z >= 784 && z <= 823)
    save('range-SW', R.iso(rng, 'SW', 9)); save('range-NW', R.iso(rng, 'NW', 9))
    // elevations: straight at a face, the nearest block of each (u, y) cell, glass blended over what's behind it,
    // farther blocks a little darker so overhangs and reveals read
    const elev = (face, keep, ppx) => {
      const cs = []
      for (const [k, v] of b.blocks) {
        const [x, y, z] = k.split(',').map(Number)
        if (!keep(x, y, z)) continue
        const col = R.blockColor(look(v)); if (!col) continue
        cs.push({ x, y, z, col })
      }
      const bx = { x1: Math.min(...cs.map(c => c.x)), x2: Math.max(...cs.map(c => c.x)), z1: Math.min(...cs.map(c => c.z)), z2: Math.max(...cs.map(c => c.z)), y1: Math.min(...cs.map(c => c.y)), y2: Math.max(...cs.map(c => c.y)) }
      const P = { west: c => [c.z - bx.z1, c.x - bx.x1], east: c => [bx.z2 - c.z, bx.x2 - c.x], south: c => [c.x - bx.x1, bx.z2 - c.z], north: c => [bx.x2 - c.x, c.z - bx.z1] }[face]
      const W = (face === 'west' || face === 'east' ? bx.z2 - bx.z1 : bx.x2 - bx.x1) + 1, H = bx.y2 - bx.y1 + 1
      const cols = new Map()
      for (const c of cs) { const [u, d] = P(c); const key = u * 1000 + (bx.y2 - c.y); if (!cols.has(key)) cols.set(key, []); cols.get(key).push({ d, col: c.col }) }
      const { canvas } = require('../../png')
      const img = canvas(W * ppx, H * ppx)
      for (let i = 0; i < W * H * ppx * ppx; i++) img.px.set([150, 190, 235, 255], i * 4) // sky
      for (const [key, list] of cols) {
        const u = Math.floor(key / 1000), v = key % 1000
        list.sort((a, c) => a.d - c.d)
        let r = 0, g = 0, bl = 0, a = 0
        for (const { d, col } of list) {
          const al = (col[3] === undefined ? 255 : col[3]) / 255, f = Math.max(0.55, 1 - d * 0.012), w = (1 - a) * al
          r += col[0] * f * w; g += col[1] * f * w; bl += col[2] * f * w; a += w
          if (a > 0.97) break
        }
        const sky = [150, 190, 235]
        const out = [Math.round(r + sky[0] * (1 - a)), Math.round(g + sky[1] * (1 - a)), Math.round(bl + sky[2] * (1 - a)), 255]
        for (let i = 0; i < ppx; i++) for (let j = 0; j < ppx; j++) img.px.set(out, ((v * ppx + j) * img.w + u * ppx + i) * 4)
      }
      return img
    }
    const site = (x, y, z) => x >= 465 && x <= 556 && z >= 772 && z <= 842 && y >= 64
    save('elev-west', elev('west', (x, y, z) => site(x, y, z) && y >= 64, 8))
    save('elev-front', elev('west', (x, y, z) => x >= 470 && x <= 520 && z >= 774 && z <= 834 && y >= 64 && y <= 80, 14))
    save('elev-south', elev('south', (x, y, z) => site(x, y, z) && z <= 834, 8))
    save('elev-north', elev('north', (x, y, z) => site(x, y, z) && z >= 772, 8))
    const missing = [...new Set([...b.blocks.values()].map(v => look(v)))].filter(v => { const c = R.blockColor(v); return c && c[0] === 255 && c[1] === 0 && c[2] === 255 })
    if (missing.length) console.log(`no texture (magenta in the previews): ${[...new Set(missing.map(v => v.split('[')[0]))].join(', ')}`)
  }
}
