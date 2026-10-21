'use strict'
// pawnshop: Vic's Pawn Shop on East Street (tools/build/town/PLAN.md section 15.4, 2026-10-21; Q15: build it in town).
// Box x 579..614, z 940..985, every y; world `jailbreak`, ground y 64. A dark red brick shop with barred display windows
// and a mustard sign band, the pawnbroker's three gold balls on its corner; inside, a glass counter with Vic behind it
// (quests.sk kind `fence`), shelves and cabinets of goods (item displays). Written by a cloud session (no server, no
// client): the local session renders it against the wiki and checks it in the client (handoff/2026-10-21/README.md).
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
const MOD = 'pawnshop'
const own = ownFor(MOD)
let B = null
// The module's setter, clipped to its columns (a state may be a function of x, y, z for the hashed mixes).
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s) }
const DB = { set: S } // for COMMON's door()

// ---- the plan's numbers (PLAN 15.4) -------------------------------------------------------------------------------
// Box x 579..614, z 940..985 on East Street's east side (its sidewalk x 576..578). The shop x 585..608, z 948..978: 1-thick
// walls y 64..72 (y 64 a blackstone base course), the roof deck y 73 over x 585..608 (a gray terracotta deck: no road
// blocks face the sky), a parapet y 74 round its edge. The front (x 585) faces west onto the street: the doorway z 962..963,
// two barred display windows z 951..958 and 967..975 (glass y 66..69 in the wall, iron bars a block out at x 584), the
// mustard sign band y 70..71. Inside: the counter at x 597 (z 952..973, a gap at the north end z 951 to get behind it), Vic
// behind it at (600.5, 65, 962.5) facing the door, shelves on the back wall x 607.
const BX = BOX.pawnshop[0]                                      // 579, 940 .. 614, 985
const SHOP = { x1: 585, x2: 608, z1: 948, z2: 978 }
const TOP = 72, ROOF = 73                                       // the walls' top course; the roof deck
const DOOR_Z = [962, 963]
const WINDOWS = [[951, 958], [967, 975]]                        // the two display windows' z spans (y 66..69)
const COUNTER = { x: 597, z1: 952, z2: 973 }
const VIC = [600.5, 65, 962.5, 90]                              // dquest addatw fence ... (facing west, the door)
const DOOR_SPOT = [582.5, 65, 962.5, 90]                        // on the forecourt in front of the door (GPS node 1054)
// dark red brick: plain bricks with a few dark and a few tan ones, so the wall isn't one flat red
const BRICK = [['bricks', 76], ['red_nether_bricks', 12], ['mud_bricks', 12]]
const brick = (x, y, z) => pick(x, y, z, BRICK)
const BASE = 'polished_blackstone'
const BAND = 'yellow_terracotta'                                // the mustard sign band
const DARK = 'polished_blackstone_bricks'
const ROOFB = (x, y, z) => h(x, 7, z) < 15 ? 'deepslate_tiles' : 'polished_deepslate' // a dark deck (no road blocks face the sky)
const SLAB_TOP = s => `${s}_slab[type=top,waterlogged=false]`
const SLAB_BOT = s => `${s}_slab[type=bottom,waterlogged=false]`
const BARS_Z = 'iron_bars[east=false,north=true,south=true,waterlogged=false,west=false]' // bars running along z
const PANE_Z = 'glass_pane[east=false,north=true,south=true,waterlogged=false,west=false]'
const fenceZ = (n, s) => `dark_oak_fence[east=false,north=${n},south=${s},waterlogged=false,west=false]`
const fenceX = (w, e) => `dark_oak_fence[east=${e},north=false,south=false,waterlogged=false,west=${w}]`
const LANTERN_HANG = 'lantern[hanging=true,waterlogged=false]'

// The columns the land module covered before this box was the Pawn Shop's (the foot of E3, a few pines): x:z0-z1@top
// from the land module of 2026-10-20 (git 7b8c9b7). The world still has those blocks where the local session pasted the
// town, so they're cleared (air from y 65 up to the old top) before anything is built; a paste over a fresh world just
// writes air where there was air. Columns this module builds anyway are overwritten after.
const OLD_LAND = [
  '581:944-946@69 581:961@65 582:942-943@69 582:944-946@72 582:947-948@69 582:953@66 582:954@65 582:959@66',
  '583:942@69 583:943@72 583:944-946@75 583:947@72 583:948@69 583:962@66 584:941@69 584:942@72 584:943@75',
  '584:944@76 584:945@77 584:946@76 584:947@75 584:948@72 584:949@69 585:941@69 585:942@72 585:943@75 585:944@77',
  '585:945@78 585:946@77 585:947@75 585:948@72 585:949@69 586:941@69 586:942@72 586:943@75 586:944@76 586:945@77',
  '586:946@76 586:947@75 586:948@72 586:949@69 587:942@69 587:943@72 587:944-946@75 587:947@72 587:948@69',
  '588:942-943@69 588:944-946@72 588:947-948@69 589:944-946@69 591:940@66 591:941@65 593:940-943@65 594:940-947@65',
  '595:940-941@66 595:942-949@65 596:940-945@66 596:946-952@65 596:965@66 597:940@67 597:941-948@66 597:949-954@65',
  '597:965@65 598:940-944@67 598:945-950@66 598:951-956@65 599:940-947@67 599:948-953@66 599:954-958@65',
  '600:940-943@68 600:944-950@67 600:951@66 600:952@67 600:953-956@66 600:957-960@65 601:940-946@68 601:947-952@67',
  '601:953-957@66 601:958-961@65 601:978-979@65 602:940-943@69 602:944-949@68 602:950-954@67 602:955-958@66',
  '602:959-963@65 603:940-946@69 603:947-951@68 603:952-956@67 603:957-960@66 603:961-964@65 604:940-943@70',
  '604:944-949@69 604:950-952@68 604:953@69 604:954-957@67 604:958-961@66 604:962-965@65 604:977-979@68',
  '605:940-941@71 605:942-946@70 605:947-951@69 605:952-955@68 605:956-959@67 605:960-963@66 605:964-967@65',
  '605:975-976@68 605:977-979@71 605:980-981@68 606:940-943@71 606:944-948@70 606:949-953@69 606:954-957@68',
  '606:958-960@67 606:961-964@66 606:965-968@65 606:975@68 606:976@71 606:977-979@74 606:980@71 606:981@68',
  '607:940-946@71 607:947-950@70 607:951-953@69 607:954@70 607:955@69 607:956-958@68 607:959-962@67 607:963-965@66',
  '607:966-969@65 607:974@68 607:975@71 607:976@74 607:977@75 607:978@76 607:979@75 607:980@74 607:981@71',
  '607:982@68 608:940-943@72 608:944-948@71 608:949-952@70 608:953-956@69 608:957-960@68 608:961-963@67',
  '608:964-966@66 608:967-970@65 608:974@68 608:975@71 608:976@74 608:977-979@76 608:980@74 608:981@71 608:982@68',
  '609:940-945@72 609:946-950@71 609:951-954@70 609:955-958@69 609:959-961@68 609:962-964@67 609:965-967@66',
  '609:968-971@65 609:974@68 609:975@71 609:976@74 609:977@75 609:978@76 609:979@75 609:980@74 609:981@71',
  '609:982@68 610:940-942@73 610:943-948@72 610:949-952@71 610:953-956@70 610:957-959@69 610:960-962@68',
  '610:963-965@67 610:966-968@66 610:969-972@65 610:975@68 610:976@71 610:977-979@74 610:980@71 610:981@68',
  '610:982@65 611:940-945@73 611:946-950@72 611:951-954@71 611:955-957@70 611:958-960@69 611:961-963@68',
  '611:964-966@67 611:967-969@66 611:970-973@65 611:975-976@68 611:977-979@71 611:980-981@68 612:940-942@74',
  '612:943-947@73 612:948-951@72 612:952-955@71 612:956-958@70 612:959-961@69 612:962-964@68 612:965-967@67',
  '612:968-970@66 612:971-974@65 612:976@65 612:977-979@68 613:940-944@74 613:945-949@73 613:950-953@72',
  '613:954-956@71 613:957-960@70 613:961-963@69 613:964-965@68 613:966-968@67 613:969-971@66 613:972-974@65',
  '613:978@65 613:983@65 614:940-941@82 614:942-947@74 614:948-951@73 614:952-954@72 614:955-958@71 614:959-961@70',
  '614:962-964@69 614:965-966@68 614:967-969@67 614:970-972@66 614:973-975@65 614:978@66 614:979@65'
]
function clearOld () {
  for (const line of OLD_LAND) for (const run of line.split(' ')) {
    const m = /^(\d+):(\d+)(?:-(\d+))?@(\d+)$/.exec(run)
    if (!m) throw new Error(`OLD_LAND: bad run ${run}`)
    const x = +m[1], z0 = +m[2], z1 = m[3] ? +m[3] : z0, top = +m[4]
    for (let z = z0; z <= z1; z++) for (let y = 65; y <= top; y++) S(x, y, z, 'air')
  }
}

// ---- the ground (y 64): the paved forecourt, grass round the shop, a fenced back yard -------------------------------
function ground () {
  for (let x = BX[0]; x <= BX[2]; x++) for (let z = BX[1]; z <= BX[3]; z++) {
    let s = 'grass_block'
    if (x <= 584) s = 'light_gray_concrete'                     // the forecourt, flush with East Street's sidewalk
    else if (x >= SHOP.x1 && x <= SHOP.x2 && z >= SHOP.z1 && z <= SHOP.z2) s = null // the shop's own floor
    else if (z >= SHOP.z1 - 1 && z <= SHOP.z2 + 1 && x <= SHOP.x2 + 1) s = 'gray_concrete' // a 1-wide apron round the walls
    if (s) S(x, 64, z, s)
  }
  // a planter strip along the forecourt's street edge, broken at the door's path (z 960..965) and at both ends
  for (let z = 943; z <= 982; z++) {
    if (z >= 960 && z <= 965) continue
    S(579, 64, z, 'smooth_stone'); S(579, 65, z, SLAB_BOT('smooth_stone'))
  }
  // the back yard: a dark oak fence round the box's east and side edges behind the shop's front line
  for (let z = 941; z <= 984; z++) S(614, 65, z, fenceZ(z > 941, z < 984))
  for (let x = 586; x <= 613; x++) { S(x, 65, 941, fenceX(x > 586, true)); S(x, 65, 984, fenceX(x > 586, true)) }
  S(614, 65, 941, `dark_oak_fence[east=false,north=false,south=true,waterlogged=false,west=true]`)
  S(614, 65, 984, `dark_oak_fence[east=false,north=true,south=false,waterlogged=false,west=true]`)
  // trees and shrubs in the side yards (4+ from the box's edges), a dumpster pen behind the shop
  oak(S, 597, 944); oak(S, 608, 944); oak(S, 597, 981); oak(S, 608, 981)
  for (const [x, z] of [[588, 945], [603, 945], [592, 981], [603, 982]]) shrub(S, x, z)
  F(610, 65, 958, 611, 66, 961, 'green_terracotta')              // the dumpster (a green bin with a dark lid)
  F(610, 67, 958, 611, 67, 961, 'iron_trapdoor[facing=west,half=bottom,open=false,powered=false,waterlogged=false]')
}

// ---- the shell ------------------------------------------------------------------------------------------------------
const onEdge = (x, z) => x === SHOP.x1 || x === SHOP.x2 || z === SHOP.z1 || z === SHOP.z2
const isCorner = (x, z) => (x === SHOP.x1 || x === SHOP.x2) && (z === SHOP.z1 || z === SHOP.z2)
function shell () {
  for (let x = SHOP.x1; x <= SHOP.x2; x++) for (let z = SHOP.z1; z <= SHOP.z2; z++) {
    // the floor: a checker of light and dark polished stone, a red runner from the door to the counter
    if (!onEdge(x, z)) S(x, 64, z, (x + z) % 2 ? 'polished_andesite' : 'polished_basalt[axis=y]')
    for (let y = 65; y <= TOP; y++) S(x, y, z, onEdge(x, z) ? brick : 'air')
    if (onEdge(x, z)) S(x, 64, z, BASE)
    S(x, ROOF, z, onEdge(x, z) ? DARK : ROOFB)
  }
  // dark pilasters at the corners and every 6 along the sides and back (the brick wall isn't one flat run)
  for (let y = 64; y <= TOP; y++) {
    for (const [x, z] of [[SHOP.x1, SHOP.z1], [SHOP.x1, SHOP.z2], [SHOP.x2, SHOP.z1], [SHOP.x2, SHOP.z2]]) S(x, y, z, DARK)
    for (let x = SHOP.x1 + 6; x < SHOP.x2; x += 6) { S(x, y, SHOP.z1, DARK); S(x, y, SHOP.z2, DARK) }
    for (let z = SHOP.z1 + 6; z < SHOP.z2; z += 6) S(SHOP.x2, y, z, DARK)
  }
  // the parapet: a blackstone-brick wall all round the roof's edge, posts at the corners
  for (let x = SHOP.x1; x <= SHOP.x2; x++) for (let z = SHOP.z1; z <= SHOP.z2; z++) {
    if (!onEdge(x, z)) continue
    const alongX = z === SHOP.z1 || z === SHOP.z2
    const st = isCorner(x, z) ? 'polished_blackstone_brick_wall[east=none,north=none,south=none,up=true,waterlogged=false,west=none]'
      : alongX ? 'polished_blackstone_brick_wall[east=low,north=none,south=none,up=false,waterlogged=false,west=low]'
        : 'polished_blackstone_brick_wall[east=none,north=low,south=low,up=false,waterlogged=false,west=none]'
    S(x, ROOF + 1, z, st)
  }
}

// ---- the front: the doorway, the barred windows, the sign band, the pawnbroker's three gold balls ------------------
function front () {
  const X = SHOP.x1
  // the sign band y 70..71 the whole front, a dark course over it (y 72)
  for (let z = SHOP.z1 + 1; z < SHOP.z2; z++) { S(X, 70, z, BAND); S(X, 71, z, BAND); S(X, 72, z, DARK) }
  // the doorway: open, iron doors held open inward (they can't be closed by hand), a dark frame, a glass transom
  for (const z of DOOR_Z) { for (let y = 65; y <= 67; y++) S(X, y, z, 'air'); S(X, 68, z, 'glass'); S(X, 69, z, 'glass') }
  for (const z of [DOOR_Z[0] - 1, DOOR_Z[1] + 1]) for (let y = 65; y <= 69; y++) S(X, y, z, DARK)
  door(DB, X + 1, 65, DOOR_Z[0], 'west', 'right', true)
  door(DB, X + 1, 65, DOOR_Z[1], 'west', 'left', true)
  S(X - 1, 64, DOOR_Z[0], 'polished_blackstone_slab[type=top,waterlogged=false]')  // a dark doorstep, flush
  S(X - 1, 64, DOOR_Z[1], 'polished_blackstone_slab[type=top,waterlogged=false]')
  // the display windows: glass panes in the wall over a brick sill, bars a block out, a roll-up shutter box over them
  for (const [z1, z2] of WINDOWS) {
    for (let z = z1; z <= z2; z++) {
      for (let y = 66; y <= 69; y++) { S(X, y, z, PANE_Z); S(X - 1, y, z, BARS_Z) }
      S(X - 1, 65, z, SLAB_TOP('stone_brick'))                    // the bars' foot
      S(X - 1, 70, z, 'iron_trapdoor[facing=west,half=top,open=false,powered=false,waterlogged=false]') // the shutter box
    }
    for (let y = 65; y <= 69; y++) { S(X, y, z1 - 1, DARK); S(X, y, z2 + 1, DARK) } // dark jambs
    // the window display: a dark oak platform inside, its goods are displays
    for (let z = z1; z <= z2; z++) S(X + 1, 65, z, SLAB_TOP('dark_oak'))
  }
  // the three gold balls on a bracket off the north-west corner (the pawnbroker's sign), over the forecourt
  for (const x of [584, 583, 582]) S(x, 72, SHOP.z1 + 1, SLAB_TOP('polished_blackstone'))
  S(582, 71, SHOP.z1 + 1, 'iron_chain[axis=y,waterlogged=false]')
  S(582, 70, SHOP.z1 + 1, 'iron_chain[axis=z,waterlogged=false]')
  S(582, 70, SHOP.z1, 'gold_block'); S(582, 70, SHOP.z1 + 2, 'gold_block'); S(582, 69, SHOP.z1 + 1, 'gold_block')
  // lanterns on the jambs either side of the door
  S(X - 1, 68, DOOR_Z[0] - 1, 'lantern[hanging=false,waterlogged=false]')
  S(X - 1, 67, DOOR_Z[0] - 1, SLAB_TOP('polished_blackstone'))
  S(X - 1, 68, DOOR_Z[1] + 1, 'lantern[hanging=false,waterlogged=false]')
  S(X - 1, 67, DOOR_Z[1] + 1, SLAB_TOP('polished_blackstone'))
}

// ---- inside: the counter, Vic's side, the shelves, the lights ------------------------------------------------------
function inside () {
  // the red runner from the door to the counter
  for (let x = SHOP.x1 + 2; x < COUNTER.x; x++) for (const z of DOOR_Z) S(x, 65, z, 'red_carpet')
  // the counter: a glass case (the goods inside are displays) under a dark oak top, from z 952 to 973; its ends dark wood
  for (let z = COUNTER.z1; z <= COUNTER.z2; z++) {
    const end = z === COUNTER.z1 || z === COUNTER.z2
    S(COUNTER.x, 65, z, end ? 'dark_oak_planks' : 'glass')
    S(COUNTER.x, 66, z, SLAB_BOT('dark_oak'))
  }
  // the old till on the counter by the door's line
  S(COUNTER.x, 67, 964, 'polished_blackstone_button[face=floor,facing=west,powered=false]')
  // Vic's side: a worn rug, a stool, the back wall's shelves (dark oak slabs at y 66 and 68) and a pegboard over them
  F(599, 65, 958, 602, 65, 967, 'brown_carpet')
  S(603, 65, 962, 'spruce_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]')
  for (let z = 951; z <= 975; z++) {
    if ((z - 951) % 8 === 7) { for (let y = 65; y <= 69; y++) S(607, y, z, 'dark_oak_planks'); continue } // the uprights
    S(607, 66, z, SLAB_TOP('dark_oak')); S(607, 68, z, SLAB_TOP('dark_oak'))
    S(607, 70, z, 'light_gray_terracotta')                        // the pegboard strip over the shelves
  }
  // the safe in the back corner (a dark block with a dial: a look only)
  F(605, 65, 975, 606, 66, 976, 'polished_deepslate')
  S(604, 66, 975, 'polished_blackstone_button[face=wall,facing=west,powered=false]')
  // glass cabinets along the shoppers' side walls (2 high, a dark oak top), goods inside as displays
  for (const z of [SHOP.z1 + 1, SHOP.z2 - 1]) for (let x = 588; x <= 594; x++) {
    S(x, 65, z, 'glass'); S(x, 66, z, 'glass'); S(x, 67, z, SLAB_BOT('dark_oak'))
  }
  // hanging lanterns from the deck (two rows each side of the counter), a lit beam over the counter
  for (let z = 952; z <= 974; z += 6) { S(591, TOP, z, LANTERN_HANG); S(602, TOP, z, LANTERN_HANG) }
  for (let z = COUNTER.z1; z <= COUNTER.z2; z += 3) S(COUNTER.x, TOP, z, 'lantern[hanging=true,waterlogged=false]')
}

// ---- the roof's plant: an AC unit and a vent stack ----------------------------------------------------------------
function roofPlant () {
  F(600, ROOF + 1, 965, 602, ROOF + 1, 967, 'light_gray_concrete')
  F(600, ROOF + 2, 965, 602, ROOF + 2, 967, 'iron_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]')
  S(592, ROOF + 1, 970, 'andesite_wall[east=none,north=none,south=none,up=true,waterlogged=false,west=none]')
  S(592, ROOF + 2, 970, 'andesite_wall[east=none,north=none,south=none,up=true,waterlogged=false,west=none]')
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  clearOld(); ground(); shell(); front(); inside(); roofPlant()
  B = null
  return b
}
// Text displays (tag LABEL_TAG): 3 decimals, 0.03 off the face they sit on; y = the text's bottom.
module.exports.labels = [
  { x: 584.97, y: 70.3, z: 963.0, facing: 'west', text: 'VIC\'S PAWN', color: '#5a1010', scale: 2.6 },   // the sign band
  { x: 583.97, y: 68.25, z: 955.0, facing: 'west', text: 'OPEN', color: '#ff3b30', scale: 1.4, brightness: { sky: 15, block: 15 } },
  { x: 583.97, y: 68.25, z: 971.0, facing: 'west', text: 'WE BUY GOLD', color: '#ffd54f', scale: 0.9, brightness: { sky: 15, block: 15 } },
  { x: 606.97, y: 70.62, z: 963.0, facing: 'west', text: 'NO REFUNDS', color: '#202020', scale: 1.1 }     // over the shelves
]
// Item displays (tag DISPLAY_TAG): the goods in the windows, the counter's case, the shelves and the cabinets.
const GOODS = ['clock', 'gold_ingot', 'diamond', 'compass', 'spyglass', 'emerald', 'bell', 'music_disc_cat', 'golden_apple',
  'goat_horn', 'amethyst_shard', 'recovery_compass', 'gold_nugget', 'music_disc_13', 'trident', 'golden_helmet']
const good = i => GOODS[i % GOODS.length]
const DISPLAYS = []
WINDOWS.forEach(([z1, z2], w) => { for (let z = z1 + 1, i = 0; z <= z2 - 1; z += 2, i++) DISPLAYS.push({ x: 586.5, y: 66.25, z: z + 0.5, item: good(i + w * 5), yaw: 90, pitch: 0, scale: 0.55 }) })
for (let z = COUNTER.z1 + 2, i = 0; z <= COUNTER.z2 - 2; z += 3, i++) DISPLAYS.push({ x: 597.5, y: 65.35, z: z + 0.5, item: good(i + 2), yaw: 90, pitch: -90, scale: 0.45 })
for (let z = 952, i = 0; z <= 974; z += 2, i++) {
  if ((z - 951) % 8 === 7) continue
  DISPLAYS.push({ x: 607.5, y: 67.25, z: z + 0.5, item: good(i + 4), yaw: 90, pitch: 0, scale: 0.5 })
  if (i % 2 === 0) DISPLAYS.push({ x: 607.5, y: 69.25, z: z + 0.5, item: good(i + 9), yaw: 90, pitch: 0, scale: 0.5 })
}
for (const z of [SHOP.z1 + 1, SHOP.z2 - 1]) for (let x = 589, i = 0; x <= 593; x += 2, i++) DISPLAYS.push({ x: x + 0.5, y: 66.2, z: z + 0.5, item: good(i + 6 + (z > 960 ? 3 : 0)), yaw: z > 960 ? 180 : 0, pitch: 0, scale: 0.5 })
module.exports.displays = DISPLAYS
module.exports.points = {
  PAWN_DOOR: DOOR_SPOT,       // GPS node 1054 (streets' gps), on the forecourt in front of the doorway
  PAWN_VIC: VIC               // Vic (quests.sk, kind fence): behind the counter, facing the door
}
// PLAN 15.4: a safe zone over the whole box (Vic stands in it: a giver outside a safe zone gets a warning).
module.exports.setup = {
  regions: [{ id: 'safe_pawnshop', box: [579, 63, 940, 614, 85, 985], flags: { passthrough: 'allow', 'weapon-shoot': 'deny' },
    note: 'Vic\'s Pawn Shop, its forecourt and yard' }],
  heists: [], keepers: [], crates: [], carSpots: [], chops: [], garages: [], pois: [], walls: [], holos: [], pumps: [],
  givers: [{ kind: 'fence', at: VIC, cmd: 'dquest addatw fence jailbreak 600.5 65 962.5 90 Pawn Shop',
    launchCmd: 'dquest addat fence 600.5 65 962.5 90 Pawn Shop', note: 'Vic, behind the counter, facing the door' }]
}
module.exports.build = () => module.exports()

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}; ${module.exports.labels.length} labels, ${DISPLAYS.length} displays`)
}
