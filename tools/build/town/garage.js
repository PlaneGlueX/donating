'use strict'
// garage: the Town Garage (tools/build/town/PLAN.md section 6.3; pictures garage_new, town_garage_2022,
// donut_wide_with_garage). The current Jailbreak look: grey-blue brick, three red stripes, a red fascia, two white-framed
// bays (their sectional doors raised on tracks under the ceiling, the west one glass), "GARAGE" on the east and west faces
// and a red car on a low podium on the roof.
// Between the bays the attendant's office; in front the asphalt apron onto 1st Street with the City Garage's exit lanes
// and return spot; behind it a striped lot reached past the building's sides, then a strip of grass and trees.
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
const WORLD = 'world'
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
void bed; void line4; void rect // COMMON helpers the garage doesn't need

// ---------------------------------------------------------------------------------------------------------------------
const MOD = 'garage'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, s) }
// A filled box through S; s is a state or a function (x, y, z) -> state.
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, typeof s === 'function' ? s(x, y, z) : s)
}
const DOOR = { set: S } // for COMMON's door(): both halves through S

// ---- the plan's numbers (PLAN.md 6.3 and 8.2) ------------------------------------------------------------------------
// The box is x 300..385, z 730..842 (every column the garage's). Building x 330..359, z 787..810: outer walls y 64..73,
// roof deck y 74 with a red fascia overhanging 1 (x 329..360, z 786..811) and a 1-high lip at y 75. Inside, 2-thick side
// and back walls (a plain brick lining at x 331, 358 and z 788), the bays x 332..341 and 348..357 (openings x 334..340
// and 349..355 in z 810, y 65..70, framed by posts at x 333, 341, 348, 356: the frames take 18 of the front's 30 columns,
// garage_new's 55-60%), the office x 343..346 between the dividers x 342 and 347: its front room z 801..809
// (the counter at z 807, the attendant behind it) and its back room z 789..799, split by a partition at z 800.
// Doors: the office's double birch door x 344..345 z 810 (y 65..66), the partition's birch door x 345 z 800, doorways
// (air, y 65..67) from the back room into both bays at x 342 / 347, z 792..793; the staff door at the back, x 344 z 787,
// is iron (no button: it stays shut).
// Every spot is a block centre (.5), so everything painted round one is an odd number of blocks wide with the spot's block
// in its middle (an even width would put the centre on a block edge, half a block off the car standing there).
// The return sits against the donut lot's fence, out of the aisles: citygarage.sk's garageReturnCheck parks any of the
// player's garage cars driven within garage::return-radius (4) of it, with no grace, so a return in a lane people drive
// through would park cars on their way to the stalls. The east aisle (x 362..377) stays clear of its 4 blocks, the E1
// stalls end at z 827, and exit 2 is about 31 away.
const GAR = { x1: 330, x2: 359, z1: 787, z2: 810 }
// No holo spot: citygarage.sk's /dgaragesite holo only uses where you stand to pick the site, and hangs one
// DecentHolograms label per bay at the bay spot + garage::bay-label-height (2.4): (337.5, 67.4, 800.5) and
// (352.5, 67.4, 800.5), clear of everything (the lanterns over the bays hang at y 71).
const SPOT = {
  attendant: [344.5, 65, 806.5, 0], bay1: [337.5, 65, 800.5, 0], bay2: [352.5, 65, 800.5, 0],
  exit1: [337.5, 65, 824.5, 0], exit2: [352.5, 65, 824.5, 0], ret: [381.5, 65, 834.5, 180],
  poi: [352.5, 65, 830.5, 0]
}
// Jailbreak's grey-blue brick: garage_new's is clean and even, so mostly plain stone bricks (tuff, olive, only a touch)
const BRICK = [['stone_bricks', 82], ['cracked_stone_bricks', 12], ['tuff_bricks', 6]]
// The three red stripes across the middle of the wall (visible wall y 65..73: a polished andesite base course at y 65,
// the first course over the pad, then plain brick under and over the stripes, as in garage_new), on all four faces. On
// the east and west faces GARAGE's letters are inlaid flush (y 69..73) and the top stripe (y 70) is plain brick behind
// them (only its corner cells stay red, so the front's and back's stripes end at the corners): the letters sit on the
// stripe at y 68, on plain brick, as in garage_new.
const STRIPES = new Set([66, 68, 70])
const outer = (x, y, z) => y === 65 ? 'polished_andesite' : STRIPES.has(y) ? 'red_concrete' : pick(x, y, z, BRICK)
const plain = (x, y, z) => pick(x, y, z, BRICK)
const WHITE = 'white_concrete', YELLOW = 'yellow_concrete', CURB = 'smooth_stone_slab[type=bottom]'
const LEAVES = (x, z) => h(x, 22, z) < 60 ? 'oak_leaves[persistent=true]' : 'azalea_leaves[persistent=true]'

// ---- ground: the north strip, the striped lot, the lanes past the building, the apron (y 64) -------------------------
// Rows of stalls (white separators every 5, 4 clear between): A z 752..757 (noses north to the curb at z 751), B z 768..773
// (noses south to the planter z 774..776), W1 x 302..306 along the west fence (wheel stops at x 301), W2 x 322..327
// against the building's pad, E1 x 380..384 against the donut lot's fence at x 386 (wheel stops at x 385). Aisles: z 758..767,
// z 777..784 behind the building, x 307..321 west and x 362..379 east of it, and the apron x 328..385, z 813..840.
function ground () {
  for (let x = 301; x <= 385; x++) for (let z = 733; z <= 842; z++) {
    if (z <= 750) { if (z >= 734 && z <= 748 && x >= 303 && x <= 382 && orangeAt(x, z)) S(x, 64, z, pick(x, 64, z, MIX.orange)); continue }
    if (z === 751) { S(x, 64, z, 'smooth_stone'); S(x, 65, z, CURB); continue } // the lot's north curb
    S(x, 64, z, pick(x, 64, z, MIX.asphalt))
  }
  // the light concrete pad round the building (its front strip z 811..812 flush for the cars), curbed on the sides and back
  F(328, 64, 785, 361, 64, 812, 'light_gray_concrete')
  F(328, 65, 785, 328, 65, 809, CURB); F(361, 65, 785, 361, 65, 809, CURB); F(329, 65, 785, 360, 65, 785, CURB)
  // the planter between row B and the back aisle: a curbed island of grass with shrubs and the lot lights
  F(312, 64, 774, 372, 64, 776, 'smooth_stone'); F(313, 64, 775, 371, 64, 775, 'grass_block')
  F(312, 65, 774, 372, 65, 774, CURB); F(312, 65, 776, 372, 65, 776, CURB); S(312, 65, 775, CURB); S(372, 65, 775, CURB)
  for (let x = 314; x <= 370; x += 3) if (Math.abs(x - 322) > 1 && Math.abs(x - 342) > 1 && Math.abs(x - 362) > 1) S(x, 65, 775, LEAVES(x, 775))
  // the planters either side of 1st Street's cut (x 330..375): a curb at z 841, grass at z 842 against the sidewalk.
  // The west one (x 301..329) lies mostly outside safe_garage_town (it starts at x 328), and a curb slab is no barrier to
  // a car (MTVehicles drives up a block), so it's fenced: a 1-high dark oak fence (collision 1.5) on its grass, joined to
  // the west fence, keeps the cut the lot's only way in. The east one keeps its hedge (all of it is inside the region).
  // No leaves on the street lamps' cells (x 327, 377) or beside the garage sign's post (x 381), where the posts' walls
  // would join them.
  for (const [x1, x2] of [[301, 329], [376, 385]]) {
    F(x1, 64, 841, x2, 64, 841, 'smooth_stone'); F(x1, 65, 841, x2, 65, 841, CURB); F(x1, 64, 842, x2, 64, 842, 'grass_block')
    for (let x = x1; x <= x2; x++) {
      if (x2 === 329) { S(x, 65, 842, 'dark_oak_fence'); continue }
      if (h(x, 23, 842) < 30 && x !== 377 && Math.abs(x - 381) > 1) S(x, 65, 842, LEAVES(x, 842)); else if (h(x, 24, 842) < 40) S(x, 65, 842, 'short_grass')
    }
  }
  // stall lines and wheel stops
  for (let x = 302; x <= 382; x += 5) F(x, 64, 752, x, 64, 757, WHITE)
  for (let x = 312; x <= 372; x += 5) F(x, 64, 768, x, 64, 773, WHITE)
  for (let z = 787; z <= 837; z += 5) F(302, 64, z, 306, 64, z, WHITE)
  F(301, 65, 787, 301, 65, 837, CURB)
  for (let z = 789; z <= 809; z += 5) F(322, 64, z, 327, 64, z, WHITE)
  for (let z = 787; z <= 827; z += 5) F(380, 64, z, 384, 64, z, WHITE)
  F(385, 65, 787, 385, 65, 827, CURB)
  // the City Garage's two exit lanes: a yellow box (9 x 9, the exit spot's block in its middle) round each exit spot, a
  // white arrow inside it pointing out (south): a 1-wide shaft and a head 5, 3, 1 wide
  for (const c of [337, 352]) {
    for (let x = c - 4; x <= c + 4; x++) { S(x, 64, 820, YELLOW); S(x, 64, 828, YELLOW) }
    for (let z = 820; z <= 828; z++) { S(c - 4, 64, z, YELLOW); S(c + 4, 64, z, YELLOW) }
    F(c, 64, 821, c, 64, 824, WHITE); F(c - 2, 64, 825, c + 2, 64, 825, WHITE); F(c - 1, 64, 826, c + 1, 64, 826, WHITE); S(c, 64, 827, WHITE)
  }
  // the return spot (381.5 834.5): a yellow box x 378..384, z 830..838 with a white P in its middle (its top to the north,
  // read by drivers coming in from 1st Street)
  for (let x = 378; x <= 384; x++) { S(x, 64, 830, YELLOW); S(x, 64, 838, YELLOW) }
  for (let z = 830; z <= 838; z++) { S(378, 64, z, YELLOW); S(384, 64, z, YELLOW) }
  const P = ['###', '#.#', '###', '#..', '#..']
  P.forEach((row, r) => [...row].forEach((c, k) => { if (c === '#') S(380 + k, 64, 832 + r, WHITE) }))
}

// ---- the building ----------------------------------------------------------------------------------------------------
const FONT = { // 3 x 5 block letters, rows top to bottom
  G: ['###', '#..', '#.#', '#.#', '###'], A: ['###', '#.#', '###', '#.#', '#.#'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'], E: ['###', '#..', '##.', '#..', '###']
}
function building () {
  const { x1, x2, z1, z2 } = GAR
  // floors: the bays smooth stone with oil stains (polished deepslate, dark enough to read on it) inside the yellow
  // outlines (x 335..339 / 350..354, z 796..804; inside() paints the outlines): per bay a big one under the engine (the
  // cars stand facing south, so at the front, z ~803), a smaller one under the gearbox and a drip, ragged from the hash,
  // about 8% of the bays' floors; the office's front room (z 801..809) a quartz and deepslate checker, its back room
  // (z 789..799) polished andesite
  const stain = (x, z) => {
    if (!(((x >= 335 && x <= 339) || (x >= 350 && x <= 354)) && z >= 796 && z <= 804)) return false
    const c = x <= 339 ? 337 : 352, s = c === 337 ? 1 : -1, j = ((h(x, 4, z) % 3) - 1) * 0.45
    return Math.hypot(x + 0.5 - (c + 0.5 + 0.5 * s), (z + 0.5 - 803) * 1.2) < 1.9 + j ||
      Math.hypot(x + 0.5 - (c + 0.5 - 0.5 * s), z + 0.5 - 799.5) < 1.2 + j || (x === c + s && z === 797)
  }
  F(331, 64, 788, 358, 64, 809, (x, y, z) => stain(x, z) ? 'polished_deepslate' : 'smooth_stone')
  F(343, 64, 801, 346, 64, 809, (x, y, z) => (x + z) % 2 ? 'smooth_quartz' : 'polished_deepslate')
  F(343, 64, 789, 346, 64, 800, 'polished_andesite')
  // outer walls (striped), the plain linings inside them, the dividers either side of the office
  for (let y = 64; y <= 73; y++) {
    for (let z = z1; z <= z2; z++) { S(x1, y, z, outer(x1, y, z)); S(x2, y, z, outer(x2, y, z)) }
    for (let x = x1; x <= x2; x++) { S(x, y, z1, outer(x, y, z1)); S(x, y, z2, outer(x, y, z2)) }
  }
  F(331, 65, 788, 331, 72, 809, plain); F(358, 65, 788, 358, 72, 809, plain); F(331, 65, 788, 358, 72, 788, plain)
  F(342, 65, 789, 342, 73, 809, plain); F(347, 65, 789, 347, 73, 809, plain)
  // a smooth wainscot in both bays (garage_new's light inner jambs), y 65..69 on their side walls and back wall, with a
  // red stripe at y 68; the dividers are one block thick, so the office gets the same panelling. The pegboards, windows
  // and doorways written later cut through it.
  const wains = (x, y, z) => y === 68 ? 'red_concrete' : 'smooth_stone'
  for (const x of [331, 342, 347, 358]) F(x, 65, 789, x, 69, 809, wains)
  F(332, 65, 788, 341, 69, 788, wains); F(348, 65, 788, 357, 69, 788, wains)
  // the insides, written as air, then the ceilings: the bays at y 73 (white, strip lights), the office lower at y 71
  F(332, 65, 789, 341, 72, 809, 'air'); F(348, 65, 789, 357, 72, 809, 'air'); F(343, 65, 789, 346, 70, 809, 'air')
  F(331, 73, 788, 358, 73, 809, 'smooth_quartz'); F(343, 71, 789, 346, 72, 809, 'smooth_quartz')
  // strip lights: three per row; bay 1's front ones (z 805..807) shine through its glass door panel, bay 2's sit at
  // z 801..803, just ahead of its solid panel (z 804..809 at y 72) that would hide them
  for (const x of [335, 339, 350, 354]) for (const z0 of [791, 798, x < 345 ? 805 : 801]) F(x, 73, z0, x, 73, z0 + 2, 'sea_lantern')
  for (const z of [792, 797, 803, 807]) F(344, 71, z, 345, 71, z, 'sea_lantern')
  // the front (z 810): white frames standing 1 proud (z 811) round both bays, closed at the foot by a quartz threshold and
  // ending just over the top stripe (posts y 64..71, a head at y 71), with plain brick over them to the fascia as in
  // garage_new; the doors are raised inside (inside()); the office's double door between. The frames (x 333..341,
  // 348..356) leave striped wall at x 330..332, 342, 347 and 357..359.
  for (const px of [333, 341, 348, 356]) F(px, 64, 810, px, 71, 811, 'smooth_quartz')
  F(333, 71, 810, 341, 71, 811, 'smooth_quartz'); F(348, 71, 810, 356, 71, 811, 'smooth_quartz')
  for (const [a, b] of [[334, 340], [349, 355]]) { F(a, 64, 810, b, 64, 810, 'smooth_quartz'); F(a, 65, 810, b, 70, 810, 'air') }
  F(333, 72, 810, 341, 73, 810, outer); F(348, 72, 810, 356, 73, 810, outer)
  // the office's glass front between the white posts: a double birch door (players walk in to the attendant), glass
  // sidelights, a transom; the stripes run on over it. Full glass, not panes: a pane doesn't join a door, so the cells
  // beside the doors would be half panes with a gap.
  F(343, 64, 810, 346, 64, 810, 'smooth_quartz')
  door(DOOR, 344, 65, 810, 'south', 'right', false, 'birch_door'); door(DOOR, 345, 65, 810, 'south', 'left', false, 'birch_door')
  F(343, 65, 810, 343, 67, 810, 'glass'); F(346, 65, 810, 346, 67, 810, 'glass'); F(344, 67, 810, 345, 67, 810, 'glass')
  // windows from the office's front room into both bays (the attendant sees both cars), a doorway from its back room
  // into each bay, and the partition between the two rooms (a birch door at x 345)
  for (const dx of [342, 347]) { F(dx, 66, 802, dx, 68, 805, 'glass_pane'); F(dx, 65, 792, dx, 67, 793, 'air') }
  F(343, 65, 800, 346, 70, 800, plain); door(DOOR, 345, 65, 800, 'south', 'left', false, 'birch_door')
  F(343, 66, 800, 344, 67, 800, 'glass') // full glass: a pane beside the door would be half a pane
  // the back (z 787): a staff door out of the office under a little trapdoor awning, downpipes, the AC unit, a dumpster
  door(DOOR, 344, 65, 787, 'north', 'left'); F(344, 65, 788, 344, 66, 788, 'air')
  F(343, 68, 786, 345, 68, 786, 'iron_trapdoor[facing=south,half=top,open=false]')
  for (const x of [331, 358]) F(x, 65, 786, x, 73, 786, 'polished_deepslate_wall')
  F(335, 65, 786, 336, 65, 786, 'light_gray_concrete'); F(335, 66, 786, 336, 66, 786, 'iron_trapdoor[facing=north,half=bottom,open=false]')
  F(350, 65, 785, 352, 66, 786, 'green_concrete'); F(350, 67, 785, 352, 67, 786, 'dark_oak_trapdoor[facing=north,half=bottom,open=false]')
  // GARAGE on the east and west faces: white block letters 5 high (calcite: the brightest white that isn't one of the
  // road scan's road blocks) inlaid flush in the wall over y 69..73, their foot on the second stripe (y 68). The top
  // stripe's cells along the letters (z 788..809) are plain brick first (the corner cells z 787 and 810 stay red, so the
  // front's and back's stripes end at the corners), so no red shows inside or between them, as on garage_new's plain
  // brick. The east face (x 359) reads south to north. It is seen from Main Street (z 735..775) and from the bridge's south
  // end, across the donut's north lot, 29-41 degrees off its normal: there letters standing 1 block out would close up
  // their 1-block gaps (tan 40 degrees ~ 0.84), so they stay flush like garage_new's painted text. The west face (x 330,
  // toward the W1/W2 stalls and the future north-west road, garage_new's lettered side) is its mirror, reading north to
  // south. 23 letter columns on a 24-block face: both start at the back (north) corner, keeping the front corners clean.
  F(359, 70, 788, 359, 70, 809, plain); F(330, 70, 788, 330, 70, 809, plain)
  ;[...'GARAGE'].forEach((ch, i) => FONT[ch].forEach((row, r) => [...row].forEach((c, k) => {
    if (c === '#') { S(359, 73 - r, 809 - 4 * i - k, 'calcite'); S(330, 73 - r, 787 + 4 * i + k, 'calcite') }
  })))
  // two yellow bollards either side of the office door, capped so their tops aren't a road block the launch road scan
  // could stand on
  for (const x of [342, 347]) { S(x, 65, 812, YELLOW); S(x, 66, 812, 'smooth_stone_slab[type=bottom]') }
}

// ---- the roof: red deck, red fascia ring with a lip, the AC plant, a hatch, a vent and the car's podium; the car is an
// item display ---------------------------------------------------------------------------------------------------------
function roof () {
  // the deck an even maroon darker than the fascia (nether wart block with a little red nether brick: red terracotta at
  // 30% made brown-orange blotches like camouflage), the fascia ring bright red concrete like the picture's band
  const DECK = [['nether_wart_block', 85], ['red_nether_bricks', 15]]
  F(329, 74, 786, 360, 74, 811, (x, y, z) => x === 329 || x === 360 || z === 786 || z === 811 ? 'red_concrete'
    : pick(x, y, z, DECK))
  for (let x = 329; x <= 360; x++) { S(x, 75, 786, 'red_concrete'); S(x, 75, 811, 'red_concrete') }
  for (let z = 786; z <= 811; z++) { S(329, 75, z, 'red_concrete'); S(360, 75, z, 'red_concrete') }
  F(352, 75, 788, 355, 76, 789, 'light_gray_concrete'); F(352, 75, 790, 355, 76, 790, 'iron_bars')
  F(353, 77, 788, 354, 77, 789, 'iron_trapdoor[facing=north,half=bottom,open=false]')
  S(334, 75, 789, 'iron_trapdoor[facing=south,half=bottom,open=false]')
  // the vent, clear of the car (its footprint about x 334.5..354.5, z 798.5..806.5)
  S(331, 75, 806, 'polished_deepslate_wall'); S(331, 76, 806, 'polished_deepslate_slab[type=bottom]')
  // the car's podium, 2 high: the fascia and the lip (y 75) hide everything under about y 78 at the car from 1st Street
  // and the Main / 1st junction, which was all of its wheels; on the podium (top face y 77.0) they show, as in garage_new
  // and donut_wide_with_garage
  F(337, 75, 799, 352, 76, 806, 'polished_deepslate')
}

// ---- inside: the two bays and the office ------------------------------------------------------------------------------
const tyres = (x, z, n) => { for (let k = 0; k < n; k++) S(x, 65 + k, z, k % 2 ? 'polished_blackstone' : 'blackstone') }
function inside () {
  // both bays: a yellow outline (7 x 11, the spot's block in its middle) round the car's place (the bay spots 337.5 800.5
  // and 352.5 800.5)
  for (const [a, b] of [[334, 340], [349, 355]]) {
    for (let x = a; x <= b; x++) { S(x, 64, 795, YELLOW); S(x, 64, 805, YELLOW) }
    for (let z = 795; z <= 805; z++) { S(a, 64, z, YELLOW); S(b, 64, z, YELLOW) }
  }
  // the raised sectional doors: two tracks of chain under each bay's ceiling (y 72, z 796..809) and the door's panel
  // lying on them over the front (x 334..340 / 349..355, z 804..809: 6 long, a block per block of the door's height):
  // bay 1's of white glass (the strip lights over it shine through), bay 2's of ribbed full blocks (white and light grey
  // sections, so it reads against the white ceiling). The panels are as wide as the openings (x 334..340 / 349..355), and
  // the tracks run behind the jambs (x 333, 341, 348, 356), as on a real sectional door. The door's bottom rail is the
  // white lip just inside each opening (z 809, y 70: a top slab, 70.5..71), what the street sees of a raised door; the
  // clear height under it is 5.5.
  for (const x of [333, 341, 348, 356]) F(x, 72, 796, x, 72, 809, 'iron_chain[axis=z]')
  F(334, 72, 804, 340, 72, 809, 'white_stained_glass')
  F(349, 72, 804, 355, 72, 809, (x, y, z) => z % 2 === 0 ? 'white_concrete' : 'light_gray_concrete')
  F(334, 70, 809, 340, 70, 809, 'smooth_quartz_slab[type=top]'); F(349, 70, 809, 355, 70, 809, 'smooth_quartz_slab[type=top]')
  // a parts rack against each bay's back lining (z 789): spruce posts, two shelves of tyres (bay 2's the mirror of bay 1's)
  for (const [a, b] of [[335, 339], [350, 354]]) {
    for (const x of [a, b]) F(x, 65, 789, x, 69, 789, 'spruce_fence')
    F(a + 1, 67, 789, b - 1, 67, 789, 'spruce_slab[type=top]'); F(a + 1, 69, 789, b - 1, 69, 789, 'spruce_slab[type=top]')
    for (let x = a + 1; x <= b - 1; x++) {
      if (h(x, 26, 789) < 75) S(x, 68, 789, h(x, 27, 789) < 50 ? 'blackstone' : 'polished_blackstone')
      if (h(x, 28, 789) < 50) S(x, 70, 789, 'blackstone')
    }
  }
  // bay 1 (west, the glass door): a floor drain, tyres, a compressor, a red tool cabinet by the door
  S(337, 63, 808, 'black_concrete'); S(337, 64, 808, 'iron_trapdoor[facing=north,half=top,open=false]')
  tyres(332, 789, 2); tyres(333, 789, 3); tyres(332, 790, 1)
  S(340, 65, 789, 'light_gray_concrete'); S(341, 65, 789, 'red_concrete'); S(340, 66, 789, 'iron_trapdoor[facing=south,half=bottom,open=false]')
  F(341, 65, 806, 341, 66, 806, 'red_concrete'); S(341, 67, 806, 'polished_blackstone_slab[type=bottom]')
  // a workbench along the west wall under a pegboard (birch boards set into the lining, hooks and pegs on them), a vise
  F(332, 65, 796, 332, 65, 801, 'spruce_slab[type=top]'); F(331, 66, 796, 331, 68, 801, 'birch_planks')
  for (const [y, z] of [[67, 796], [66, 798], [68, 799], [67, 801]]) S(332, y, z, 'iron_trapdoor[facing=east,half=bottom,open=true]')
  for (const [y, z] of [[68, 797], [67, 798], [66, 800], [68, 801]]) S(332, y, z, 'tripwire_hook[attached=false,facing=east,powered=false]')
  S(332, 66, 797, 'polished_blackstone_wall')
  // work lights hanging over both cars' places
  for (const x of [337, 352]) { S(x, 72, 800, 'iron_chain[axis=y]'); S(x, 71, 800, 'lantern[hanging=true]') }
  // bay 2 (east, open): a two-post lift either side of the car's place, the pegboard and bench on the east wall, a tool
  // cabinet, tyres, an oil drum and cones near the door
  for (const x of [348, 356]) { S(x, 65, 800, 'polished_blackstone'); F(x, 66, 800, x, 69, 800, YELLOW); S(x, 70, 800, 'polished_blackstone_slab[type=bottom]') }
  F(358, 66, 790, 358, 68, 797, 'birch_planks')
  F(357, 65, 790, 357, 65, 797, 'spruce_slab[type=top]')
  for (const [y, z] of [[67, 791], [66, 793], [68, 794], [67, 796]]) S(357, y, z, 'iron_trapdoor[facing=west,half=bottom,open=true]')
  for (const [y, z] of [[68, 792], [67, 795], [66, 790], [68, 797]]) S(357, y, z, 'tripwire_hook[attached=false,facing=west,powered=false]')
  F(357, 65, 805, 357, 66, 806, 'red_concrete'); F(357, 67, 805, 357, 67, 806, 'polished_blackstone_slab[type=bottom]')
  tyres(348, 789, 3); tyres(348, 790, 2); tyres(349, 790, 1) // a gap at (349, 789): the rack's post would join them
  F(357, 65, 808, 357, 66, 808, 'polished_basalt[axis=y]')
  // traffic cones in both bays (garage_new), free-standing: a wall touching a wall or a solid block gets an arm at the paste
  // (none at x 356, z 809: the frame's post at x 356 stands in front of it)
  for (const [x, z] of [[349, 806], [350, 808], [355, 808], [339, 808], [335, 807]]) S(x, 65, z, 'red_sandstone_wall')
  // the office's front room: a counter across it (z 807) with a lift-up flap at its east end, the register and a desk bell
  // on it; customers stand in front (z 808..809), the attendant behind it (344.5 806.5, facing south); behind them, in
  // the room's back corners clear of the windows into the bays (z 802..805), a key cabinet on the east wall and a desk
  // with a monitor and a chair on the west wall (the desk runs on under the west window, below its sill)
  F(343, 65, 807, 345, 65, 807, 'red_concrete'); S(346, 65, 807, 'spruce_trapdoor[facing=south,half=top,open=false]')
  S(343, 66, 807, 'polished_blackstone_slab[type=bottom]')
  S(345, 66, 807, 'polished_blackstone_button[face=floor,facing=south,powered=false]')
  F(346, 65, 801, 346, 68, 801, 'stripped_spruce_wood[axis=y]')
  for (const y of [67, 68]) S(345, y, 801, 'tripwire_hook[attached=false,facing=west,powered=false]')
  F(343, 65, 801, 343, 65, 803, 'spruce_slab[type=top]'); S(343, 66, 801, 'black_concrete')
  S(344, 65, 801, 'spruce_stairs[facing=east,half=bottom]')
  // the back room (z 789..799, through the partition's door): a break room with a table and two chairs in its north end,
  // a soda machine, a water cooler, a filing cabinet and a shelf of binders; doorways into both bays at z 792..793, the
  // staff door north. The aisle x 344..345, z 792..799 stays clear (the partition's door to both doorways), and
  // (343..344, 789) reaches the staff door.
  F(344, 65, 790, 345, 65, 790, 'spruce_slab[type=top]')
  S(344, 65, 791, 'spruce_stairs[facing=south,half=bottom]'); S(345, 65, 789, 'spruce_stairs[facing=north,half=bottom]')
  F(346, 65, 797, 346, 68, 798, 'red_concrete'); F(346, 66, 797, 346, 67, 797, 'light_blue_stained_glass')
  S(346, 65, 789, 'smooth_quartz'); S(346, 66, 789, 'light_blue_stained_glass')
  F(346, 65, 790, 346, 66, 790, 'light_gray_terracotta')
  F(343, 65, 796, 343, 66, 799, 'bookshelf'); F(343, 67, 796, 343, 67, 799, 'spruce_slab[type=bottom]')
}

// ---- outside: the strip of grass and trees, the lot lights, the street lamps, the signs -------------------------------
// A lot light: a diorite post with arms of quartz slabs along the axis (ends: -2 and/or 2, the side each arm reaches to)
// and a sea lantern under each arm's end. The arms are bottom slabs (74..74.5), so each head (73..74) hangs right under
// its arm. A sea lantern at y 73 lights the ground (y 65) under it only to about 7, so an invisible light block (level
// 15, no collision; the prison's cellblock uses them) sits at y 66 under each head.
const GLOW = 'light[level=15,waterlogged=false]'
function lotLight (x, z, axis, ends = [-2, 2]) {
  for (let y = 65; y <= 73; y++) S(x, y, z, 'diorite_wall')
  S(x, 74, z, 'smooth_quartz')
  for (const e of ends) for (const k of [e / 2, e]) S(axis === 'x' ? x + k : x, 74, axis === 'x' ? z : z + k, 'smooth_quartz_slab[type=bottom]')
  for (const e of ends) {
    const hx = axis === 'x' ? x + e : x, hz = axis === 'x' ? z : z + e
    S(hx, 73, hz, 'sea_lantern'); S(hx, 66, hz, GLOW)
  }
}
function outside () {
  // the north fence (z 731) and the west fence (x 300), dark oak, 2 high; a hedge inside the north one
  for (let x = 300; x <= 385; x++) { S(x, 65, 731, 'dark_oak_fence'); S(x, 66, 731, 'dark_oak_fence') }
  for (let z = 732; z <= 842; z++) { S(300, 65, z, 'dark_oak_fence'); S(300, 66, z, 'dark_oak_fence') }
  for (let x = 301; x <= 385; x++) if (h(x, 21, 732) < 85) S(x, 65, 732, LEAVES(x, 732))
  // trees along the strip (oaks and pines, nudged by the hash), shrubs along the curb
  const trees = [[306, 'oak'], [318, 'pine'], [331, 'oak'], [344, 'oak'], [357, 'pine'], [369, 'oak'], [380, 'oak']]
  for (const [x, k] of trees) {
    const jx = x + (h(x, 5, 741) % 3) - 1, jz = 741 + (h(x, 6, 741) % 3) - 1
    if (k === 'oak') oak(S, jx, jz); else pine(S, jx, jz, 13 + h(x, 8, 741) % 5)
  }
  for (let x = 305; x <= 381; x += 7) shrub(S, x, 748)
  // the strip's light: five invisible light blocks along it, as if spilled from the lot lights (never in a trunk or shrub)
  for (const x of [304, 322, 340, 358, 376]) if (!B.get(x, 66, 739)) S(x, 66, 739, GLOW)
  // grass clumps and a few flowers on the strip, only on the world's own grass (none on an orange patch: a plant on red
  // sand or terracotta would drop off at the paste)
  const FLOWERS = ['poppy', 'dandelion', 'cornflower', 'oxeye_daisy', 'allium']
  for (let x = 301; x <= 385; x++) for (let z = 733; z <= 750; z++) {
    if (B.get(x, 64, z) || B.get(x, 65, z) || B.get(x, 66, z)) continue
    if (h(x >> 3, 9, z >> 3) >= 45) continue
    const v = h(x, 65, z)
    if (v < 3) { S(x, 65, z, 'tall_grass[half=lower]'); S(x, 66, z, 'tall_grass[half=upper]') } else if (v < 16) S(x, 65, z, 'short_grass')
    else if (v < 19) S(x, 65, z, FLOWERS[h(x, 66, z) % FLOWERS.length])
  }
  for (let x = 313; x <= 371; x++) if (!B.get(x, 65, 775) && h(x, 25, 775) < 35) S(x, 65, 775, 'short_grass')
  // light (a lamp about every 20 blocks; each head has a light block under it, see lotLight):
  // - three lot lights on the planter (arms over row B and the back aisle) and five on row A's curb (arms south over the
  //   stalls), on stall lines so the posts stand between two cars' noses;
  // - the back aisle's two corners, against the fences (arms in);
  // - the side rows' wheel-stop curbs (W1 at x 301, E1 at x 385; arms over the stalls), on stall lines;
  // - the building pad's four corners and the west side's middle: light blocks under the fascia and out over the W2
  //   stalls and the east aisle (no posts, no fittings), and GARAGE itself lit;
  // - a curbed plinth between the two exit lanes and a curbed island in the middle of the cut onto 1st Street, in line
  //   with it, both with light blocks and no post: a post on either stood on the facade's axis and hid the office door
  //   from 1st Street (from the sidewalk at z 844 the island's covered the whole door). The island splits the cut into a
  //   west half, where lane 1's cars leave, and an east half, where lane 2's cars leave and drivers come in to the return
  //   and the east aisle;
  // - light blocks under the fascia over both bays (garage_new shows no fittings there), and one out over each lane;
  // - cobra-head lamps over the apron's planters, either side of the cut.
  for (const x of [322, 342, 362]) lotLight(x, 775, 'z')
  for (const x of [302, 322, 342, 362, 382]) lotLight(x, 751, 'z', [2])
  lotLight(301, 780, 'x', [2]); lotLight(385, 780, 'x', [-2])
  for (const z of [792, 812, 832]) lotLight(301, z, 'x', [2])
  for (const z of [797, 817]) lotLight(385, z, 'x', [-2])
  // the building pad's four corners and the west side's middle: no posts there (they stood level with the fascia and
  // framed the facade like goalposts; garage_new's box stands clean on its pad), but the same light: the light blocks
  // where the posts' heads were (2 out over the W2 stalls and the east aisle), and light blocks just outside the wall
  // under the fascia (y 72; sea lanterns set into the brick read as pale patches garage_new doesn't have), on the west
  // face and on the back near its corners
  for (const [x, z] of [[326, 785], [363, 785], [326, 812], [363, 812], [326, 799]]) S(x, 66, z, GLOW)
  for (const z of [789, 799, 808]) S(GAR.x1 - 1, 72, z, GLOW)
  for (const x of [333, 356]) S(x, 72, GAR.z1 - 1, GLOW)
  // both GARAGEs lit from under the eave, 2 out from their faces (no post in front of the letters)
  for (const z of [791, 799, 807]) { S(361, 68, z, GLOW); S(328, 68, z, GLOW) }
  F(343, 64, 823, 345, 64, 825, 'smooth_stone'); F(343, 65, 823, 345, 65, 825, CURB); S(344, 66, 824, GLOW)
  F(343, 64, 836, 345, 64, 842, 'smooth_stone'); F(343, 65, 836, 345, 65, 842, CURB)
  S(344, 66, 839, GLOW); S(342, 66, 839, GLOW); S(346, 66, 839, GLOW)
  for (const x of [334, 340, 349, 355]) S(x, 73, 811, GLOW)
  S(337, 66, 815, GLOW); S(352, 66, 815, GLOW)
  streetLamp(S, 327, 841, 0, -1); streetLamp(S, 377, 841, 0, -1)
  S(327, 66, 838, GLOW); S(377, 66, 838, GLOW)
  // the return spot's sign at the head of its box (north of it, facing south: drivers coming in from 1st Street read it)
  // and the garage's sign on the east planter. The building stands 32 blocks back and the donut hides it from Main
  // Street, so the sign stands across 1st Street's direction, read by traffic along it from both ways: a diorite post
  // and a red panel (x 381, y 70..73, z 838..842, over the return box's south edge with 5 clear under it), lettered on
  // both faces (the east face ~11 degrees off the line of sight from the Main / 1st junction). Their caps are quartz
  // slabs: smooth quartz slabs are on the launch road scan's list, and these sit open to the sky at street height
  // (PLAN 10.2).
  for (let y = 65; y <= 67; y++) S(381, y, 829, 'diorite_wall')
  F(380, 68, 829, 382, 69, 829, 'blue_concrete'); F(380, 70, 829, 382, 70, 829, 'quartz_slab[type=bottom]')
  for (let y = 65; y <= 69; y++) S(381, y, 842, 'diorite_wall')
  F(381, 70, 838, 381, 73, 842, 'red_concrete'); F(381, 74, 838, 381, 74, 842, 'quartz_slab[type=bottom]')
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  ground()
  building()
  roof()
  inside()
  outside()
  B = null
  return b
}
// Text displays (tag LABEL_TAG): 3 decimals, 0.03 off the face they sit on. A text display grows up from its y by about
// 0.25 x scale a line, so y = the middle of what it sits on - 0.125 x scale.
module.exports.labels = [
  { x: 337.5, y: 71.2, z: 812.03, facing: 'south', text: 'BAY 1', color: '#c62828', scale: 2.4 }, // on the frame's head (y 71, 9 wide)
  { x: 352.5, y: 71.2, z: 812.03, facing: 'south', text: 'BAY 2', color: '#c62828', scale: 2.4 },
  { x: 345.0, y: 70.3, z: 811.03, facing: 'south', text: 'OFFICE', color: '#ffffff', scale: 1.6 }, // on the top stripe (y 70)
  { x: 344.5, y: 67.5, z: 786.97, facing: 'north', text: 'STAFF ONLY', color: '#ffffff', scale: 0.7 },
  { x: 381.5, y: 68.84, z: 830.03, facing: 'south', text: 'CAR RETURN', color: '#ffffff', scale: 1.3 }, // panel y 68..69
  // the garage sign's panel (x 381, y 70..73, z 838..842, middle y 72.0, z 840.5): two lines on each face, ~0.75 high
  { x: 380.97, y: 72.15, z: 840.5, facing: 'west', text: 'TOWN', color: '#ffffff', scale: 3.0 },
  { x: 380.97, y: 71.05, z: 840.5, facing: 'west', text: 'GARAGE', color: '#ffffff', scale: 3.0 },
  { x: 382.03, y: 72.15, z: 840.5, facing: 'east', text: 'TOWN', color: '#ffffff', scale: 3.0 },
  { x: 382.03, y: 71.05, z: 840.5, facing: 'east', text: 'GARAGE', color: '#ffffff', scale: 3.0 }
]
// Item displays (tag DISPLAY_TAG): a giant Pipe Wrench on the roof (owner, 2026-10-22: "change the garage model to a
// wrench or something"; the red Sedan stood there before and the dealership has the big car now). The wrench is the
// melee weapon's own model (amethyst shard, custom_model_data 2: make-item-art.js pipe_wrench, built on a diagonal),
// shown with the fixed transform (flat like a framed item, its face toward Main Street to the east: yaw -90) at scale 7,
// about 7 blocks corner to corner, its lower end just over the roof podium (top face y 77.0, x 337..352, z 799..806).
// Tune y, scale and yaw in the client. Fields: `cmd` (custom_model_data float), `transform`, `viewRange` (64 x
// view_range x the entity distance setting: 3 shows it from the Main / 1st junction), `brightness` (full: it reads at night).
module.exports.displays = [
  { x: 344.5, y: 81.3, z: 802.5, item: 'amethyst_shard', cmd: 2, transform: 'fixed', yaw: -90, pitch: 0, scale: 7, viewRange: 3,
    brightness: { sky: 15, block: 15 },
    note: 'the Pipe Wrench (title Baseball_Bat, shard 2), face east toward Main Street, its lower end over the roof podium (top face y 77.0)' }
]
module.exports.points = {
  GARAGE_ATTENDANT: SPOT.attendant, GARAGE_BAY_1: SPOT.bay1, GARAGE_BAY_2: SPOT.bay2,
  GARAGE_EXIT_1: SPOT.exit1, GARAGE_EXIT_2: SPOT.exit2, GARAGE_RETURN: SPOT.ret,
  GARAGE_POI: SPOT.poi
}
// PLAN 8.1/8.2. The region takes in the building, its pad and the apron from x 328 east (the exits and the return), not
// the north lot or the west stalls. It also covers the whole cut onto 1st Street (x 330..375, z 841..842), the lot's
// only way in (the west planter, x 301..327 outside the region, is fenced; the east one is inside it). It isn't a safe
// zone (only the bases are, owner 2026-10-21): a player is safe there only while the garage menu is open. Launch items (a
// City Garage site needs the main world: citygarage.sk) are marked launch: true.
module.exports.setup = {
  regions: [{ id: 'safe_garage_town', box: [328, 63, 785, 385, 90, 842], flags: { passthrough: 'allow' },
    note: 'the garage and its apron from x 328 east (exits, return, the cut onto 1st Street: the lot\'s only way in, the west planter fenced); becomes the City Garage site "town" at launch' }],
  heists: [],
  keepers: [{ kind: 'garage', at: SPOT.attendant, launch: true, cmd: '/dshopkeeper add garage',
    note: 'behind the office counter, facing the door (south)' }],
  givers: [], crates: [],
  carSpots: [{ at: [320.5, 65, 754.5, 180], launch: true, cmd: '/dcontract spot add', note: 'a parked car for car jobs (the north lot and the west stalls, outside the garage site)' },
    { at: [370.5, 65, 754.5, 180], launch: true, cmd: '/dcontract spot add', note: 'a parked car for car jobs (the north lot and the west stalls, outside the garage site)' },
    { at: [335.5, 65, 770.5, 0], launch: true, cmd: '/dcontract spot add', note: 'a parked car for car jobs (the north lot and the west stalls, outside the garage site)' },
    { at: [304.5, 65, 805.5, 90], launch: true, cmd: '/dcontract spot add', note: 'a parked car for car jobs (the north lot and the west stalls, outside the garage site)' }],
  chops: [],
  garages: [{ site: 'town', region: 'safe_garage_town', exits: [SPOT.exit1, SPOT.exit2], returns: [SPOT.ret], bays: [SPOT.bay1, SPOT.bay2], launch: true,
    // Console lines with the real spots (citygarage.sk's exitat|returnat|bayat <site> <x> <y> <z> <yaw>). Bays are
    // numbered in the order they're added, and bay 1 must be the west one (337.5 65 800.5) to match the painted
    // "BAY 1". `holo town` works from the console: it hangs one label per bay, 2.4 over its spot (no holo point here).
    cmds: ['dgaragesite bayat town 337.5 65 800.5 0', 'dgaragesite bayat town 352.5 65 800.5 0',
      'dgaragesite exitat town 337.5 65 824.5 0', 'dgaragesite exitat town 352.5 65 824.5 0',
      'dgaragesite returnat town 381.5 65 834.5 180', 'dgaragesite holo town'] }],
  pois: [{ type: 'garage', name: 'Town Garage', at: SPOT.poi, launch: true, cmd: '/dpoi add garage Town Garage' }],
  walls: [], holos: []
}

// ---- previews (offline only; nothing here is part of the build) -------------------------------------------------------
// The build with what the world and the neighbours would show round it: flat grass for every column the garage leaves
// unset, and 1st Street's asphalt, lines and sidewalk south of the box (from COMMON's streetCell). render.js has no
// texture for smooth quartz or quartz slabs, so the preview draws them as quartz block.
function previewBuild (b) {
  const { Build } = require('../mcstruct')
  const p = new Build()
  for (let x = 296; x <= 389; x++) for (let z = 726; z <= 866; z++) {
    const c = streetCell(x, z)
    if (c) p.set(x, 64, z, c.kind === 'walk' ? 'light_gray_concrete' : c.line === 'yellow' ? 'yellow_concrete' : c.line === 'white' ? 'white_concrete' : 'black_concrete')
    else if (!b.get(x, 64, z)) p.set(x, 64, z, 'grass_block')
  }
  for (const [k, s] of b.blocks) p.blocks.set(k, /^(minecraft:)?(smooth_)?quartz(_slab)?\b/.test(s) ? 'quartz_block' : s)
  return p
}
function sub (b, x1, z1, x2, z2, y1 = -999, y2 = 999) {
  const out = new (require('../mcstruct').Build)()
  for (const [k, s] of b.blocks) { const [x, y, z] = k.split(',').map(Number); if (x >= x1 && x <= x2 && z >= z1 && z <= z2 && y >= y1 && y <= y2) out.blocks.set(k, s) }
  return out
}
// An orthographic side view: face = where the viewer stands (south = looking north at the bays). Nearer blocks brighter.
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

// node tools/build/town/garage.js [--render [<dir>]]: the block count and bounds; with --render, previews into <dir>
// (default tools/build/town/renders/garage): the box from above, floor plans of the building, isometric views of the
// whole box, close ones of the building, cutaways with the roof and the upper walls off (cut72: only the ceiling off,
// for the raised doors), and the four elevations.
if (require.main === module) {
  const path = require('path'), fs = require('fs')
  const args = process.argv.slice(2)
  const b = module.exports()
  const bd = b.bounds()
  console.log(`garage: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}; ` +
    `${module.exports.labels.length} labels, ${module.exports.displays.length} displays`)
  const ri = args.indexOf('--render')
  if (ri >= 0) {
    const R = require('../render')
    const dir = path.resolve(args[ri + 1] && !args[ri + 1].startsWith('--') ? args[ri + 1] : path.join(__dirname, 'renders', 'garage'))
    fs.mkdirSync(dir, { recursive: true })
    const save = (name, img) => { const f = path.join(dir, `${name}.png`); fs.writeFileSync(f, img.png()); console.log(`wrote ${f} (${img.w}x${img.h})`) }
    const p = previewBuild(b)
    save('top', R.top(sub(p, 296, 726, 389, 866), 4))
    for (const y of [65, 67, 71, 72]) save(`plan-y${y}`, R.plan(sub(p, 326, 783, 363, 816), y, 12))
    for (const d of ['SE', 'SW', 'NE']) save(`iso-${d}`, R.iso(sub(p, 296, 726, 389, 866), d, 3))
    const close = sub(p, 322, 780, 368, 822)
    for (const d of ['SE', 'SW', 'NE', 'NW']) save(`close-${d}`, R.iso(close, d, 9))
    const cut = sub(p, 326, 783, 363, 816, -999, 70)
    for (const d of ['SE', 'NW']) save(`cut-${d}`, R.iso(cut, d, 12))
    save('cut72-SE', R.iso(sub(p, 326, 783, 363, 816, -999, 72), 'SE', 12)) // the raised doors on their tracks
    for (const fc of ['south', 'east', 'west', 'north']) save(`elev-${fc}`, elevation(sub(p, 324, 782, 365, 816, 63, 80), fc, 10))
  }
}
