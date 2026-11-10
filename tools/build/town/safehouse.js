'use strict'
// safehouse: Mara's Safehouse, the base (tools/build/town/PLAN.md section 6.8; built by a cloud session 2026-10-21,
// section 15.6). Box x 212..276, z 880..944, every y; world `jailbreak`, ground y 64. A two-storey brick and navy house on
// Elm Road with a dark oak pergola porch (the eight crate stands), the leaderboard yard, a garage and a fenced garden with
// a pool. Only the ground floor has an inside (Mara's front room with the wall map, a kitchen and a lounge, lookalikes
// only). No server, no client here: the local session renders it and checks it in the client (handoff/2026-10-21).
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
const MOD = 'safehouse'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s) }

// ---- the plan's numbers (PLAN 6.8, 7 and 8.2) ----------------------------------------------------------------------
// Box x 212..276, z 880..944 on Elm Road's west side (the road's sidewalk is x 277..279). A two-storey house facing east
// (x 236..258, z 896..927: a brick ground floor y 64..71, a navy upper floor y 72..78, a flat roof y 79 with a parapet),
// its open doorway (x 258, z 911..912, y 65..67) under a dark oak pergola porch (x 259..266, z 897..915) where the eight
// crate stands stand in two staggered rows; the garage (x 246..258, z 929..938) and its driveway (x 259..276, z 932..936);
// the front yard on the north side (x 237..276, z 881..895) with the three leaderboard pads; the fenced back garden
// (x 213..235) with a pool. Only the ground floor has an inside: Mara's front room (x 247..257) with the wall map on the
// north wall, a kitchen and a lounge behind it, all lookalikes (no containers, beds or menus); the upper floor is closed.
const HOUSE = { x1: 236, x2: 258, z1: 896, z2: 927, top1: 71, top2: 78, roof: 79 }
const DOOR = [911, 912]                          // the doorway's z (x 258, y 65..67)
const PORCH = { x1: 259, x2: 266, z1: 897, z2: 915 }
const GARAGE = { x1: 246, x2: 258, z1: 929, z2: 938, roof: 72 }
const GDOOR = [932, 936]                         // the garage door's z (x 258, y 65..68)
const DRIVE = { x1: 259, x2: 276, z1: 932, z2: 936 }
const DIVIDER = 246                              // the front room's west wall (the front room x 247..257)
const PARTITION = 911                            // kitchen (z 897..910) | lounge (z 912..926), x 237..245
const MAP_WALL = [250, 252]                      // the wall map's blocks on the north wall (z 896, y 66..67)
// crate stands (PLAN 8.2, moved for the doorway: 'rare' from 260 911, in front of the doorway, to 260 915): blocks with 3
// clear above, every two at least 4 apart (each hologram is about 2 wide)
const CRATES = { daily: [260, 65, 899], common: [260, 65, 903], uncommon: [260, 65, 907], rare: [260, 65, 915],
  epic: [265, 65, 901], legendary: [265, 65, 905], hacked: [265, 65, 909], season: [265, 65, 913] }
const BOARDS = { earners: [242.5, 65, 885.5, 0], heisters: [252.5, 65, 885.5, 0], wheelmen: [262.5, 65, 885.5, 0] }
const SPOT = { mara: [250.5, 65, 911.5, -90], door: [267.5, 65, 911.5, 90], poi: [268.5, 65, 911.5, 0] }
const BRICK = (x, y, z) => pick(x, y, z, MIX.brick)
const NAVY = (x, y, z) => pick(x, y, z, MIX.navy)
const PANE_Z = c => `${c}[east=false,north=true,south=true,waterlogged=false,west=false]`
const PANE_X = c => `${c}[east=true,north=false,south=false,waterlogged=false,west=true]`
const FENCE = 'dark_oak_fence[east=false,north=false,south=false,waterlogged=false,west=false]'
const LANTERN = 'lantern[hanging=false,waterlogged=false]'
const LANTERN_HANG = 'lantern[hanging=true,waterlogged=false]'
const SLAB_TOP = s => `${s}_slab[type=top,waterlogged=false]`
const SLAB_BOT = s => `${s}_slab[type=bottom,waterlogged=false]`
const stairs = (s, facing) => `${s}_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`

// a fence run, 2 high, its posts joined along the run (x or z)
function fenceRun (x1, z1, x2, z2) {
  const alongX = z1 === z2
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) {
    const a = alongX ? x > Math.min(x1, x2) : z > Math.min(z1, z2), b = alongX ? x < Math.max(x1, x2) : z < Math.max(z1, z2)
    const st = alongX ? `dark_oak_fence[east=${b},north=false,south=false,waterlogged=false,west=${a}]`
      : `dark_oak_fence[east=false,north=${a},south=${b},waterlogged=false,west=false]`
    S(x, 65, z, st); S(x, 66, z, st)
  }
}

// ---- the yards ------------------------------------------------------------------------------------------------------
function yards () {
  for (let x = 212; x <= 276; x++) for (let z = 880; z <= 944; z++) S(x, 64, z, 'grass_block')
  // the driveway, the walk to the porch (the GPS's SAFEHOUSE node is at its east end, 267.5 911.5)
  F(DRIVE.x1, 64, DRIVE.z1, DRIVE.x2, 64, DRIVE.z2, 'smooth_stone')
  F(267, 64, DOOR[0], 276, 64, DOOR[1], 'light_gray_concrete')
  // the front yard: three paved pads for the leaderboards (each hologram floats 3.5 over its pad), a hedge behind them
  for (const [x, , z] of Object.values(BOARDS)) {
    F(Math.floor(x) - 1, 64, Math.floor(z) - 1, Math.floor(x) + 1, 64, Math.floor(z) + 1, 'polished_andesite')
    for (const dx of [-2, 2]) S(Math.floor(x) + dx, 65, Math.floor(z) - 1, LANTERN) // lanterns standing by the pad
  }
  for (let x = 239; x <= 266; x++) S(x, 64, 883, 'polished_andesite') // a path along the pads
  for (let x = 238; x <= 267; x++) { S(x, 65, 881, 'azalea_leaves[distance=7,persistent=true,waterlogged=false]'); if (h(x, 1, 881) < 35) S(x, 66, 881, 'flowering_azalea_leaves[distance=7,persistent=true,waterlogged=false]') }
  oak(S, 271, 888); shrub(S, 272, 900); shrub(S, 272, 922); shrub(S, 239, 890)
  streetLamp(S, 275, 914, -1, 0)
  // the mailbox beside the driveway, 1 inside the plot: smooth quartz on a birch post, a crimson flag
  S(275, 65, 931, 'birch_fence[east=false,north=false,south=false,waterlogged=false,west=false]'); S(275, 66, 931, 'smooth_quartz')
  S(275, 66, 930, 'crimson_button[face=wall,facing=north,powered=false]')
  // the fences: the back garden all round (x 213..236), the side yard behind the garage, the gap by the house
  fenceRun(213, 881, 236, 881); fenceRun(213, 882, 213, 943); fenceRun(214, 943, 258, 943)
  fenceRun(236, 882, 236, 895); fenceRun(259, 939, 259, 943); fenceRun(258, 928, 258, 928)
}

// ---- the back garden: a lawn, a pool, a patio of lookalike loungers, trees -------------------------------------------
function garden () {
  const P = { x1: 218, x2: 224, z1: 904, z2: 916 }
  for (let x = P.x1 - 1; x <= P.x2 + 1; x++) for (let z = P.z1 - 1; z <= P.z2 + 1; z++) {
    const rim = x < P.x1 || x > P.x2 || z < P.z1 || z > P.z2
    if (rim) { F(x, 62, z, x, 63, z, 'smooth_stone'); S(x, 64, z, 'smooth_quartz'); continue }
    S(x, 62, z, 'light_blue_terracotta'); S(x, 63, z, 'water[level=0]'); S(x, 64, z, 'water[level=0]')
  }
  // the patio east of the pool, its loungers (bottom slabs and a stair as the back rest), a parasol
  F(227, 64, 902, 233, 64, 918, 'polished_andesite')
  for (const z of [904, 908, 912]) { S(229, 65, z, SLAB_BOT('birch')); S(230, 65, z, SLAB_BOT('birch')); S(231, 65, z, stairs('birch', 'east')) }
  for (let y = 65; y <= 67; y++) S(230, y, 916, 'birch_fence[east=false,north=false,south=false,waterlogged=false,west=false]')
  F(229, 68, 915, 231, 68, 917, 'white_wool'); S(230, 69, 916, 'white_wool')
  oak(S, 219, 889); oak(S, 221, 934); oak(S, 231, 938)
  for (const [x, z] of [[216, 898], [216, 922], [232, 926], [226, 886]]) shrub(S, x, z)
}

// ---- the house ------------------------------------------------------------------------------------------------------
const edge = (x, z) => x === HOUSE.x1 || x === HOUSE.x2 || z === HOUSE.z1 || z === HOUSE.z2
// the windows (a window cell is glass; the cells round it are its black frame). Ground floor y 66..68 (clear glass: the
// inside shows), upper floor y 73..76 (blue glass with a white blind right behind it: the closed floor never shows).
const WIN = {
  east: [[899, 901], [905, 907], [916, 918], [921, 923]],
  west: [[899, 901], [905, 907], [915, 917], [921, 923]],
  north: [[239, 241], [254, 256]], south: [[239, 241], [249, 251], [254, 256]],
  northUp: [[239, 241], [249, 252], [254, 256]] // the upper floor over the map wall too
}
function windowAt (face, u, y) {
  const lists = face === 'east' || face === 'west' ? WIN[face] : face === 'north' ? (y > 71 ? WIN.northUp : WIN.north) : WIN.south
  const rows = y > 71 ? [73, 76] : [66, 68]
  for (const [a, b] of lists) {
    if (u >= a && u <= b && y >= rows[0] && y <= rows[1]) return 'glass'
    if (u >= a - 1 && u <= b + 1 && y >= rows[0] - 1 && y <= rows[1] + 1) return 'frame'
  }
  return null
}
function house () {
  const { x1, x2, z1, z2, top1, top2, roof } = HOUSE
  for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) {
    if (!edge(x, z)) {
      // the floors: dark oak in the front room, a checker in the kitchen, spruce in the lounge; the ceiling slab y 71
      S(x, 64, z, x > DIVIDER ? 'dark_oak_planks' : z < PARTITION ? ((x + z) % 2 ? 'white_concrete' : 'gray_concrete') : 'spruce_planks')
      for (let y = 65; y < top1; y++) S(x, y, z, 'air')
      S(x, top1, z, 'dark_oak_planks')
      for (let y = top1 + 1; y <= top2; y++) S(x, y, z, 'air') // the closed upper floor
      S(x, roof, z, h(x, 3, z) < 15 ? 'smooth_basalt' : 'polished_deepslate')
      continue
    }
    const face = x === x2 ? 'east' : x === x1 ? 'west' : z === z1 ? 'north' : 'south'
    const u = face === 'east' || face === 'west' ? z : x
    S(x, 64, z, 'stone_bricks') // the base course
    for (let y = 65; y <= top2; y++) {
      const w = (x === x1 || x === x2) && (z === z1 || z === z2) ? null : windowAt(face, u, y)
      let s = y <= top1 ? (y === top1 ? 'smooth_stone' : BRICK) : NAVY
      if (w === 'frame') s = 'black_concrete'
      else if (w === 'glass') s = y > top1 ? 'light_blue_stained_glass' : (face === 'east' || face === 'west' ? PANE_Z('glass_pane') : PANE_X('glass_pane'))
      S(x, y, z, s)
      if (w === 'glass' && y > top1) { // the blind behind it
        const [ix, iz] = face === 'east' ? [x - 1, z] : face === 'west' ? [x + 1, z] : face === 'north' ? [x, z + 1] : [x, z - 1]
        S(ix, y, iz, 'white_concrete')
      }
    }
    S(x, roof, z, NAVY); S(x, roof + 1, z, 'polished_deepslate_slab[type=bottom,waterlogged=false]') // the parapet
  }
  // the doorway: open, a stone step, a dark oak lintel and two lanterns standing on the porch beside it
  for (const z of DOOR) { for (let y = 65; y <= 67; y++) S(x2, y, z, 'air'); S(x2, 64, z, 'polished_andesite') }
  for (let z = DOOR[0] - 1; z <= DOOR[1] + 1; z++) S(x2, 68, z, 'stripped_dark_oak_wood[axis=z]')
  // the roof's plant: an AC unit
  F(242, roof + 1, 902, 244, roof + 1, 904, 'light_gray_concrete'); F(242, roof + 2, 902, 244, roof + 2, 904, 'iron_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]')
}

// ---- inside: the front room, the kitchen, the lounge -----------------------------------------------------------------
function inside () {
  const W = 'white_terracotta'
  // the divider (x 246) with doorways into the kitchen (z 902..903) and the lounge (z 918..919); the partition (z 911)
  for (let z = 897; z <= 926; z++) for (let y = 65; y <= 70; y++) S(DIVIDER, y, z, (z >= 902 && z <= 903 || z >= 918 && z <= 919) && y <= 67 ? 'air' : W)
  for (let x = 237; x < DIVIDER; x++) for (let y = 65; y <= 70; y++) S(x, y, PARTITION, x >= 241 && x <= 242 && y <= 67 ? 'air' : W)
  // the ceiling's lights
  for (let x = 239; x <= 256; x += 5) for (let z = 899; z <= 924; z += 5) S(x, 70, z, LANTERN_HANG)

  // Mara's front room (x 247..257): her desk between her and the door, a chair behind her, the planning table in front of
  // the wall map (its slots x 250..252, y 66..67, z 897 stay clear), bookshelves on the divider, a rug, plants
  for (let z = 909; z <= 914; z++) S(252, 65, z, 'stripped_dark_oak_wood[axis=z]')
  S(252, 66, 910, 'black_carpet'); S(252, 66, 913, 'white_carpet') // a laptop, papers
  S(249, 65, 911, stairs('dark_oak', 'west'))
  for (let x = 249; x <= 253; x++) for (let z = 900; z <= 902; z++) S(x, 65, z, SLAB_TOP('dark_oak'))
  for (const z of [897, 898, 899, 905, 906, 907, 908, 913, 914, 915, 916, 922, 923, 924, 925, 926]) for (let y = 65; y <= 67; y++) S(DIVIDER + 1, y, z, 'bookshelf')
  for (let x = 254; x <= 256; x++) for (let z = 917; z <= 922; z++) S(x, 65, z, 'red_carpet')
  for (const [x, z] of [[257, 897], [257, 926], [247, 920]]) { S(x, 65, z, 'moss_block'); S(x, 66, z, 'flowering_azalea_leaves[distance=7,persistent=true,waterlogged=false]') }
  // two armchairs by the rug, facing it
  S(253, 65, 918, stairs('spruce', 'west')); S(253, 65, 921, stairs('spruce', 'west'))

  // the kitchen (x 237..245, z 897..910): counters along the west wall with a stove and a sink, a fridge, wall cabinets,
  // an island with stools
  for (let z = 897; z <= 907; z++) {
    S(237, 65, z, z === 900 ? 'polished_blackstone' : z === 904 ? 'smooth_stone' : 'birch_planks')
    S(237, 66, z, z === 900 ? 'iron_trapdoor[facing=east,half=bottom,open=false,powered=false,waterlogged=false]' : SLAB_BOT('smooth_quartz'))
    S(237, 68, z, 'stripped_birch_wood[axis=z]')
  }
  F(237, 65, 909, 237, 67, 910, 'white_concrete'); S(238, 66, 909, 'iron_bars[east=false,north=false,south=false,waterlogged=false,west=false]')
  for (let z = 902; z <= 906; z++) { S(241, 65, z, 'polished_andesite'); S(241, 66, z, SLAB_BOT('smooth_quartz')) }
  for (const z of [903, 905]) S(243, 65, z, 'dark_oak_fence[east=false,north=false,south=false,waterlogged=false,west=false]')

  // the lounge (x 237..245, z 912..926): a TV on the west wall over a cabinet, a couch facing it, a coffee table, a lamp
  for (let z = 916; z <= 921; z++) S(237, 65, z, 'dark_oak_planks')
  F(237, 66, 917, 237, 67, 920, 'black_concrete')
  for (let z = 916; z <= 921; z++) S(242, 65, z, stairs('dark_oak', 'east'))
  S(242, 65, 915, 'brown_wool'); S(242, 65, 922, 'brown_wool')
  for (const z of [918, 919]) S(240, 65, z, SLAB_TOP('dark_oak'))
  S(244, 65, 925, 'end_rod[facing=up]'); S(238, 65, 925, 'bookshelf'); S(238, 66, 925, 'bookshelf')
}

// ---- the porch: a dark oak pergola over the deck (beams y 70, joists y 71), lanterns standing on the joists ----------
function porch () {
  const { x1, x2, z1, z2 } = PORCH
  F(x1, 64, z1, x2, 64, z2, 'dark_oak_planks')
  for (const [x, z] of [[x1, z1], [x1, z2], [x2, z1], [x2, 903], [x2, 911], [x2, z2]]) for (let y = 65; y <= 69; y++) S(x, y, z, 'dark_oak_log[axis=y]')
  for (const x of [x1, x2]) for (let z = z1; z <= z2; z++) S(x, 70, z, 'dark_oak_log[axis=z]')
  for (let z = z1; z <= z2; z += 3) for (let x = x1; x <= x2; x++) S(x, 71, z, 'dark_oak_log[axis=x]')
  for (const z of [900, 906, 912]) S(262, 72, z, LANTERN)
  for (const z of [903, 909]) S(263, 70, z, LANTERN_HANG)
  // the crate stands: chiseled quartz pedestals
  for (const [x, y, z] of Object.values(CRATES)) { S(x, y, z, 'chiseled_quartz_block'); for (let d = 1; d <= 3; d++) S(x, y + d, z, 'air') }
}

// ---- the garage ------------------------------------------------------------------------------------------------------
function garage () {
  const { x1, x2, z1, z2, roof } = GARAGE
  for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) {
    const e = x === x1 || x === x2 || z === z1 || z === z2
    S(x, 64, z, e ? 'stone_bricks' : 'smooth_stone')
    for (let y = 65; y < roof; y++) S(x, y, z, e ? (y === roof - 1 ? 'smooth_stone' : BRICK) : 'air')
    S(x, roof, z, 'polished_deepslate')
  }
  for (let z = GDOOR[0]; z <= GDOOR[1]; z++) for (let y = 65; y <= 68; y++) S(x2, y, z, y % 2 ? 'smooth_quartz' : 'white_concrete')
  for (let z = GDOOR[0] - 1; z <= GDOOR[1] + 1; z++) S(x2, 69, z, 'black_concrete') // the door's frame head
  for (const y of [65, 66, 67, 68]) { S(x2, y, GDOOR[0] - 1, 'black_concrete'); S(x2, y, GDOOR[1] + 1, 'black_concrete') }
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  yards(); garden(); house(); inside(); porch(); garage()
  B = null
  return b
}
module.exports.labels = [
  { x: 276.03, y: 66.25, z: 931.5, facing: 'east', text: 'M.', color: '#1a237e', scale: 0.6 } // the mailbox (PLAN 6.8)
]
module.exports.displays = [
  { x: 251.0, y: 66.03, z: 901.0, item: 'map', yaw: 0, pitch: 90, scale: 1.6, note: 'a city map on the planning table' },
  { x: 252.5, y: 66.03, z: 912.0, item: 'paper', yaw: 30, pitch: 90, scale: 0.5, note: 'papers on Mara\'s desk' },
  { x: 241.5, y: 66.53, z: 904.5, item: 'bread', yaw: 15, pitch: 90, scale: 0.5, note: 'on the kitchen island' }
]
module.exports.points = {
  SAFEHOUSE_DOOR: SPOT.door, SAFEHOUSE_MARA: SPOT.mara, SAFEHOUSE_WALLMAP: [250, 66, 896, 0],
  LB_EARNERS: BOARDS.earners, LB_HEISTERS: BOARDS.heisters, LB_WHEELMEN: BOARDS.wheelmen,
  ...Object.fromEntries(Object.entries(CRATES).map(([k, v]) => [`CRATE_${k.toUpperCase()}`, [...v, 0]]))
}
module.exports.setup = {
  regions: [{ id: 'safe_base_safehouse', box: [213, 63, 881, 276, 95, 943], flags: { passthrough: 'allow', 'weapon-shoot': 'deny' },
    note: 'the base: loot sells on entry (bag.sk: a safe zone whose id starts with safe_base). House, porch, yards; not the sidewalk.' }],
  heists: [], keepers: [],
  givers: [{ kind: 'story', at: SPOT.mara, cmd: 'dquest addatw story world 250.5 65 911.5 -90 Safehouse',
    launchCmd: 'dquest addat story 250.5 65 911.5 -90 Safehouse', note: 'Mara, behind her desk facing the doorway' }],
  crates: Object.entries(CRATES).map(([crate, at]) => ({ crate, at, cmd: `/dcrate place ${crate}` })),
  carSpots: [], chops: [], garages: [],
  pois: [{ type: 'base', name: 'Safehouse', at: SPOT.poi, launch: true, cmd: '/dpoi add base Safehouse' }],
  walls: [{ name: 'base', at: [250, 66, 896], launch: true,
    cmd: 'dphone wall create base 3 2 world 250 66 896 south   (the console form: the north wall\'s inside, x 250..252, y 66..67)' }],
  holos: Object.entries(BOARDS).map(([board, at]) => ({ board, at, cmd: `/minecraft:tp @s ${at[0]} ${at[1]} ${at[2]} 0 0   then   /dseason holo ${board}` })),
  pumps: []
}
module.exports.build = () => module.exports()

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}; ${module.exports.labels.length} labels, ${module.exports.displays.length} displays`)
}
