'use strict'
// poolhall: the Broker's Pool Hall at the end of Main Street (tools/build/town/PLAN.md section 15.5, 2026-10-21; Q15).
// Box x 418..479, z 1129..1172, every y; world `jailbreak`, ground y 64. A black box with a green neon line and an 8-ball
// over the door, facing north across Hill Road up Main Street; inside, dark oak, four pool tables under hanging lamps and
// the Broker's corner (quests.sk kind `hits`) under a WANTED board. Written by a cloud session (no server, no client): the
// local session renders it against the wiki and checks it in the client (handoff/2026-10-21/README.md).
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
const MOD = 'poolhall'
const own = ownFor(MOD)
let B = null
// The module's setter, clipped to its columns (a state may be a function of x, y, z for the hashed mixes).
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s) }
const DB = { set: S } // for COMMON's door()

// ---- the plan's numbers (PLAN 15.5) -------------------------------------------------------------------------------
// Box x 418..479, z 1129..1172, across Hill Road (its south sidewalk z 1126..1128) from where Main Street ends: the hall
// closes Main's view south. The hall x 431..466, z 1138..1165 (centred on Main's middle line, x 449.0): 1-thick walls
// y 64..74 (y 64 a blackstone base course), a green neon line at y 72, a black sign band y 73..74, the roof deck y 75 under
// a parapet y 76; an 8-ball (a black disc, a white circle, the "8" a label) on the front parapet over the door. The front
// (z 1138) faces north: the doorway x 448..449 (iron doors held open inward at z 1139), glass sidelights x 447 and 450,
// a transom y 68..69, tall green windows x 434..442 and 455..463 (y 66..70). Inside: dark oak, four pool tables, the
// Broker's corner on a half-block platform at the back.
const BX = BOX.poolhall[0]                                      // 418, 1129 .. 479, 1172
const HALL = { x1: 431, x2: 466, z1: 1138, z2: 1165 }
const TOP = 74, ROOF = 75
const DOOR_X = [448, 449], SIDE_X = [447, 450]
const WINDOWS = [[434, 442], [455, 463]]                        // the front's tall windows (y 66..70)
const TABLES = [[434, 1142], [460, 1142], [434, 1153], [460, 1153]] // each 4 (x) by 7 (z) from its north-west corner
const BROKER = [448.5, 65.5, 1161.5, 180]                      // dquest addatw hits ... (on the platform, facing the door)
const DOOR_SPOT = [448.5, 65, 1131.5, 0]                        // on the forecourt in front of the door (GPS node 1056)
const WALL = (x, y, z) => h(x, y, z) < 12 ? 'cracked_polished_blackstone_bricks' : 'polished_blackstone_bricks'
const BASE = 'polished_blackstone'
const ROOFB = (x, y, z) => h(x, 9, z) < 15 ? 'deepslate_tiles' : 'polished_deepslate' // no road blocks face the sky
const SLAB_TOP = s => `${s}_slab[type=top,waterlogged=false]`
const SLAB_BOT = s => `${s}_slab[type=bottom,waterlogged=false]`
const PANE_X = c => `${c}_stained_glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]`
const fenceX = (w, e) => `dark_oak_fence[east=${e},north=false,south=false,waterlogged=false,west=${w}]`
const CHAIN_Y = 'iron_chain[axis=y,waterlogged=false]'
const LANTERN_HANG = 'lantern[hanging=true,waterlogged=false]'

// The columns the land module covered before this box was the Pool Hall's (T1's west foot, oaks and pines): x:z0-z1@top
// from the land module of 2026-10-20 (git 7b8c9b7), cleared first (see pawnshop.js).
const OLD_LAND = [
  '419:1160@66 420:1160@65 425:1135@65 425:1145@66 426:1134-1135@65 427:1135@70 427:1136@71 427:1137@70 427:1148@65',
  '427:1150@65 427:1164@66 428:1134@71 428:1135-1137@72 428:1138@71 428:1144@65 428:1149@65 428:1151@65 429:1133@70',
  '429:1134-1135@72 429:1136@73 429:1137-1138@72 429:1139@70 429:1145@66 429:1148@66 430:1133@71 430:1134@72',
  '430:1135-1137@73 430:1138@72 430:1139@71 430:1143-1145@65 431:1133@70 431:1134-1135@72 431:1136@73',
  '431:1137-1138@72 431:1139@70 431:1145@66 431:1147@65 432:1134@71 432:1135-1137@72 432:1138@71 432:1139@65',
  '432:1142@65 432:1144@65 432:1162-1163@65 433:1135@70 433:1136@71 433:1137@70 433:1161@65 433:1167@65',
  '434:1140-1142@65 434:1146@65 434:1162@65 434:1164@65 435:1162@65 436:1141@65 436:1143@65 436:1147@66 436:1159@66',
  '436:1161@65 437:1145@65 437:1165@66 437:1172@68 438:1145@65 438:1159@65 438:1161@65 438:1172@68 439:1136@65',
  '439:1140@65 439:1149@65 439:1163@65 439:1172@68 440:1144@65 441:1145-1146@65 446:1151-1153@69 447:1144-1145@65',
  '447:1149-1150@69 447:1151-1153@74 447:1154-1155@69 448:1147@66 448:1149@69 448:1150@74 448:1151@77 448:1152@78',
  '448:1153@77 448:1154@74 448:1155@69 449:1148@69 449:1149@74 449:1150@77 449:1151@79 449:1152@80 449:1153@79',
  '449:1154@77 449:1155@74 449:1156@69 450:1148@69 450:1149@74 450:1150@78 450:1151@80 450:1152@81 450:1153@80',
  '450:1154@78 450:1155@74 450:1156@69 451:1148@69 451:1149@74 451:1150@77 451:1151@79 451:1152@80 451:1153@79',
  '451:1154@77 451:1155@74 451:1156@69 452:1149@69 452:1150@74 452:1151@77 452:1152@78 452:1153@77 452:1154@74',
  '452:1155@69 453:1149-1150@69 453:1151-1153@74 453:1154-1155@69 453:1172@65 454:1150@65 454:1151-1153@69',
  '454:1169-1172@65 455:1150@65 455:1167-1172@65 456:1132@65 456:1139@66 456:1165-1169@65 456:1170-1172@66',
  '457:1163-1166@65 457:1167-1171@66 457:1172@67 458:1132@65 458:1134@65 458:1138@65 458:1140@66 458:1161-1164@65',
  '458:1165-1168@66 458:1169-1172@67 459:1136@65 459:1142@66 459:1159-1162@65 459:1163-1166@66 459:1167-1171@67',
  '459:1172@68 460:1141@65 460:1142-1143@66 460:1158-1161@65 460:1162-1164@66 460:1165-1168@67 460:1169-1172@68',
  '461:1132-1134@65 461:1137@65 461:1142-1143@65 461:1156-1159@65 461:1160-1162@66 461:1163-1166@67',
  '461:1167-1170@68 461:1171-1172@69 462:1136-1137@65 462:1155-1158@65 462:1159-1161@66 462:1162-1164@67',
  '462:1165-1168@68 462:1169-1172@69 463:1132@65 463:1154-1156@65 463:1157-1159@66 463:1160-1162@67',
  '463:1163-1166@68 463:1167-1169@69 463:1170-1172@70 464:1147@65 464:1153-1155@65 464:1156-1158@66',
  '464:1159-1161@67 464:1162-1164@68 464:1165-1167@69 464:1168-1171@70 464:1172@71 465:1145@66 465:1147@66',
  '465:1148@65 465:1152-1154@65 465:1155-1157@66 465:1158-1159@67 465:1160-1162@68 465:1163-1165@69',
  '465:1166-1169@70 465:1170-1172@71 466:1151-1153@65 466:1154-1155@66 466:1156-1158@67 466:1159-1161@68',
  '466:1162-1164@69 466:1165-1167@70 466:1168-1171@71 466:1172@72 467:1150-1152@65 467:1153-1154@66',
  '467:1155-1157@67 467:1158-1160@68 467:1161-1162@69 467:1163-1165@70 467:1166-1169@71 467:1170-1172@72',
  '468:1149-1151@65 468:1152-1153@66 468:1154-1156@67 468:1157-1158@68 468:1159-1161@69 468:1162-1164@70',
  '468:1165-1167@71 468:1168-1170@72 468:1171-1172@73 469:1138@66 469:1144@65 469:1148-1150@65 469:1151-1152@66',
  '469:1153-1155@67 469:1156-1157@68 469:1158-1160@69 469:1161-1162@70 469:1163-1165@71 469:1166-1168@72',
  '469:1169-1172@73 470:1145@65 470:1146@66 470:1147-1149@65 470:1150-1151@66 470:1152-1154@67 470:1155-1156@68',
  '470:1157-1158@69 470:1159-1161@70 470:1162-1164@71 470:1165-1167@72 470:1168-1170@73 470:1171-1172@74',
  '471:1147-1148@65 471:1149@66 471:1150-1153@67 471:1154-1155@68 471:1156-1157@69 471:1158-1160@70',
  '471:1161-1162@71 471:1163-1165@72 471:1166-1168@73 471:1169-1172@74 472:1146-1148@65 472:1149-1150@66',
  '472:1151-1152@67 472:1153-1154@68 472:1155-1156@69 472:1157-1159@70 472:1160-1161@71 472:1162-1164@72',
  '472:1165-1167@73 472:1168-1172@74 473:1145-1147@65 473:1148-1149@66 473:1150-1151@67 473:1152-1153@68',
  '473:1154-1155@69 473:1156-1158@70 473:1159-1160@71 473:1161-1163@72 473:1164-1165@73 473:1166-1168@74',
  '473:1169@82 473:1170@83 473:1171@82 473:1172@74 474:1141@66 474:1145-1146@65 474:1147-1148@66 474:1149-1150@67',
  '474:1151-1153@68 474:1154-1155@69 474:1156-1157@70 474:1158-1159@71 474:1160-1161@72 474:1162-1164@73',
  '474:1165-1167@74 474:1168@83 474:1169-1171@84 474:1172@83 475:1132-1133@65 475:1140@65 475:1144-1146@65',
  '475:1147-1148@66 475:1149-1150@67 475:1151-1152@68 475:1153-1154@69 475:1155-1156@70 475:1157-1158@71',
  '475:1159-1160@72 475:1161-1163@73 475:1164-1166@74 475:1167@82 475:1168-1169@84 475:1170@85 475:1171-1172@84',
  '476:1132@65 476:1144-1145@65 476:1146-1147@66 476:1148-1149@67 476:1150-1151@68 476:1152-1153@69',
  '476:1154-1155@70 476:1156-1157@71 476:1158-1159@72 476:1160-1162@73 476:1163-1166@74 476:1167@83 476:1168@84',
  '476:1169-1171@85 476:1172@84 477:1143-1144@65 477:1145-1146@66 477:1147-1148@67 477:1149-1150@68',
  '477:1151-1152@69 477:1153-1154@70 477:1155-1156@71 477:1157-1159@72 477:1160-1161@73 477:1162-1166@74',
  '477:1167@82 477:1168-1169@84 477:1170@85 477:1171-1172@84 478:1143-1144@65 478:1145-1146@66 478:1147-1148@67',
  '478:1149-1150@68 478:1151-1152@69 478:1153-1154@70 478:1155-1156@71 478:1157-1158@72 478:1159-1160@73',
  '478:1161-1165@74 478:1166-1167@76 478:1168@83 478:1169-1171@84 478:1172@83 479:1139@65 479:1142-1143@65',
  '479:1144-1145@66 479:1146-1147@67 479:1148-1149@68 479:1150-1151@69 479:1152-1153@70 479:1154-1155@71',
  '479:1156-1157@72 479:1158-1159@73 479:1160-1164@74 479:1165-1168@76 479:1169@82 479:1170@83 479:1171@82',
  '479:1172@78'
]
function clearOld () {
  for (const line of OLD_LAND) for (const run of line.split(' ')) {
    const m = /^(\d+):(\d+)(?:-(\d+))?@(\d+)$/.exec(run)
    if (!m) throw new Error(`OLD_LAND: bad run ${run}`)
    const x = +m[1], z0 = +m[2], z1 = m[3] ? +m[3] : z0, top = +m[4]
    for (let z = z0; z <= z1; z++) for (let y = 65; y <= top; y++) S(x, y, z, 'air')
  }
}

// ---- the ground: the forecourt from Hill Road's sidewalk, grass round the hall, a fence along the back -----------------
function ground () {
  for (let x = BX[0]; x <= BX[2]; x++) for (let z = BX[1]; z <= BX[3]; z++) {
    let s = 'grass_block'
    if (x >= HALL.x1 && x <= HALL.x2 && z >= HALL.z1 && z <= HALL.z2) s = null    // the hall's own floor
    else if (z < HALL.z1 && x >= HALL.x1 - 2 && x <= HALL.x2 + 2) s = 'light_gray_concrete' // the forecourt
    else if (x >= HALL.x1 - 1 && x <= HALL.x2 + 1 && z <= HALL.z2 + 1) s = 'gray_concrete' // a 1-wide apron round the walls
    if (s) S(x, 64, z, s)
  }
  // a darker path from the sidewalk to the door (x 446..451)
  F(446, 64, BX[1], 451, 64, HALL.z1 - 1, 'polished_andesite')
  // two planters on the forecourt (a smooth stone curb round grass and shrubs), lamps either side of the path
  for (const [x1, x2] of [[435, 441], [456, 462]]) {
    for (let x = x1; x <= x2; x++) for (let z = 1131; z <= 1134; z++) {
      const rim = x === x1 || x === x2 || z === 1131 || z === 1134
      S(x, 64, z, rim ? 'smooth_stone' : 'grass_block')
      if (rim) S(x, 65, z, SLAB_BOT('smooth_stone')); else if ((x + z) % 2) S(x, 65, z, h(x, 3, z) < 50 ? 'azalea_leaves[distance=7,persistent=true,waterlogged=false]' : 'oak_leaves[distance=7,persistent=true,waterlogged=false]')
    }
  }
  for (const x of [444, 453]) {
    for (let y = 65; y <= 68; y++) S(x, y, 1131, 'polished_blackstone_wall[east=none,north=none,south=none,up=true,waterlogged=false,west=none]')
    S(x, 69, 1131, 'lantern[hanging=false,waterlogged=false]')
  }
  // trees in the side yards (4+ from the box's edges, 3 from the hall), shrubs, the back fence
  for (const [x, z] of [[424, 1143], [424, 1160], [473, 1143], [473, 1160]]) oak(S, x, z)
  for (const [x, z] of [[421, 1135], [476, 1135], [427, 1168], [470, 1168]]) shrub(S, x, z)
  for (let x = 420; x <= 477; x++) S(x, 65, 1171, fenceX(x > 420, x < 477))
}

// ---- the shell ------------------------------------------------------------------------------------------------------
const onEdge = (x, z) => x === HALL.x1 || x === HALL.x2 || z === HALL.z1 || z === HALL.z2
const isCorner = (x, z) => (x === HALL.x1 || x === HALL.x2) && (z === HALL.z1 || z === HALL.z2)
function shell () {
  for (let x = HALL.x1; x <= HALL.x2; x++) for (let z = HALL.z1; z <= HALL.z2; z++) {
    const e = onEdge(x, z)
    S(x, 64, z, e ? BASE : 'dark_oak_planks')
    for (let y = 65; y <= TOP; y++) S(x, y, z, e ? WALL : 'air')
    if (e) { S(x, 66, z, 'green_concrete'); S(x, 72, z, 'black_concrete'); S(x, 73, z, 'black_concrete'); S(x, 74, z, 'black_concrete') }
    S(x, ROOF, z, e ? 'polished_blackstone' : ROOFB)
    if (e) {
      const alongX = z === HALL.z1 || z === HALL.z2
      S(x, ROOF + 1, z, isCorner(x, z) ? 'polished_blackstone_wall[east=none,north=none,south=none,up=true,waterlogged=false,west=none]'
        : alongX ? 'polished_blackstone_wall[east=low,north=none,south=none,up=false,waterlogged=false,west=low]'
          : 'polished_blackstone_wall[east=none,north=low,south=low,up=false,waterlogged=false,west=none]')
    }
  }
  // the neon line: the front's y 72 course in lime glass over a lit froglight a block inside (the hall's own light too)
  for (let x = HALL.x1 + 1; x < HALL.x2; x++) { S(x, 72, HALL.z1, 'lime_stained_glass'); S(x, 72, HALL.z1 + 1, 'verdant_froglight[axis=y]') }
  // black pilasters at the corners and every 7 along the sides and back
  for (let y = 64; y <= TOP; y++) {
    for (const [x, z] of [[HALL.x1, HALL.z1], [HALL.x1, HALL.z2], [HALL.x2, HALL.z1], [HALL.x2, HALL.z2]]) S(x, y, z, 'polished_blackstone')
    for (let z = HALL.z1 + 7; z < HALL.z2; z += 7) { S(HALL.x1, y, z, 'polished_blackstone'); S(HALL.x2, y, z, 'polished_blackstone') }
    for (let x = HALL.x1 + 7; x < HALL.x2; x += 7) S(x, y, HALL.z2, 'polished_blackstone')
  }
}

// ---- the front: the doorway, the windows and their awnings, the 8-ball --------------------------------------------
function front () {
  const Z = HALL.z1
  for (const x of DOOR_X) { for (let y = 65; y <= 67; y++) S(x, y, Z, 'air'); S(x, 68, Z, 'glass'); S(x, 69, Z, 'glass') }
  for (const x of SIDE_X) { for (let y = 65; y <= 69; y++) S(x, y, Z, PANE_X('green')) }
  for (const x of [SIDE_X[0] - 1, SIDE_X[1] + 1]) for (let y = 65; y <= 70; y++) S(x, y, Z, 'polished_blackstone')
  for (let x = SIDE_X[0] - 1; x <= SIDE_X[1] + 1; x++) S(x, 70, Z, 'polished_blackstone')
  door(DB, DOOR_X[0], 65, Z + 1, 'north', 'left', true)
  door(DB, DOOR_X[1], 65, Z + 1, 'north', 'right', true)
  // the tall windows: green glass panes y 66..70 (over the green band's course y 66 they replace it), dark frames, a
  // dark green awning over each (upside-down stairs a block out at y 71)
  for (const [x1, x2] of WINDOWS) {
    for (let x = x1; x <= x2; x++) {
      for (let y = 66; y <= 70; y++) S(x, y, Z, (x - x1) % 3 === 2 ? 'polished_blackstone' : PANE_X('green'))
      S(x, 71, Z - 1, 'green_terracotta')
      S(x, 70, Z - 1, `dark_oak_trapdoor[facing=north,half=top,open=false,powered=false,waterlogged=false]`)
    }
    for (let y = 65; y <= 71; y++) { S(x1 - 1, y, Z, 'polished_blackstone'); S(x2 + 1, y, Z, 'polished_blackstone') }
  }
  // the 8-ball on the front parapet, in the front's plane: a black disc of radius 3.6 round (449.0, 81.0), a white circle
  // of radius 1.5 in it (the "8" is a label on it)
  for (let x = 444; x <= 453; x++) for (let y = 77; y <= 85; y++) {
    const d = Math.hypot(x + 0.5 - 449, y + 0.5 - 81)
    if (d <= 3.6) S(x, y, Z, d <= 1.5 ? 'white_concrete' : 'black_concrete')
  }
}

// ---- inside: the tables, their lamps, the Broker's corner ------------------------------------------------------------
function inside () {
  // four pool tables, 4 by 7 and a block high: a dark oak rim round green cloth, black pockets at the corners and the
  // middle of the long sides; two lamps over each on chains from the roof
  for (const [x0, z0] of TABLES) {
    for (let x = x0; x <= x0 + 3; x++) for (let z = z0; z <= z0 + 6; z++) {
      const rimX = x === x0 || x === x0 + 3, rimZ = z === z0 || z === z0 + 6
      const pocket = (rimX && rimZ) || (rimX && z === z0 + 3)
      S(x, 65, z, pocket ? 'black_concrete' : rimX || rimZ ? 'dark_oak_planks' : 'green_wool')
    }
    for (const [x, z] of [[x0 + 1, z0 + 2], [x0 + 2, z0 + 4]]) {
      for (let y = 71; y <= TOP; y++) S(x, y, z, CHAIN_Y)
      S(x, 70, z, LANTERN_HANG)
    }
  }
  // cue racks on the side walls by the tables (iron bars on a dark board: a look)
  for (const x of [HALL.x1 + 1, HALL.x2 - 1]) for (const z of [1145, 1156]) {
    for (let y = 66; y <= 68; y++) S(x, y, z, 'dark_oak_planks')
    S(x, 69, z, SLAB_BOT('dark_oak'))
  }
  // the Broker's corner: a half-block platform at the back, a desk, two chairs for the people he talks to, a lamp
  F(443, 65, 1159, 454, 65, 1164, SLAB_BOT('dark_oak'))
  for (let x = 446; x <= 451; x++) { S(x, 65, 1159, 'dark_oak_planks'); S(x, 66, 1159, SLAB_BOT('dark_oak')) }
  S(446, 65, 1157, 'dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]')
  S(451, 65, 1157, 'dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]')
  for (let y = 71; y <= TOP; y++) S(448, y, 1161, CHAIN_Y)
  S(448, 70, 1161, LANTERN_HANG)
  // the WANTED board on the back wall over the platform (a cork board; its words are labels)
  F(444, 67, HALL.z2 - 1, 453, 70, HALL.z2 - 1, 'brown_terracotta')
  F(445, 68, HALL.z2 - 1, 452, 69, HALL.z2 - 1, 'white_terracotta')
  // hanging lamps over the walkway from the door to the platform
  for (const z of [1143, 1150]) { for (let y = 71; y <= TOP; y++) S(448, y, z, CHAIN_Y); S(448, 70, z, LANTERN_HANG) }
}

// ---- the roof's plant: two AC units ---------------------------------------------------------------------------------
function roofPlant () {
  for (const [x, z] of [[437, 1158], [457, 1158]]) {
    F(x, ROOF + 1, z, x + 2, ROOF + 1, z + 2, 'light_gray_concrete')
    F(x, ROOF + 2, z, x + 2, ROOF + 2, z + 2, 'iron_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]')
  }
}

module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  clearOld(); ground(); shell(); front(); inside(); roofPlant()
  B = null
  return b
}
// Text displays (tag LABEL_TAG): 3 decimals, 0.03 off the face they sit on; y = the text's bottom.
module.exports.labels = [
  { x: 449.0, y: 73.15, z: 1137.97, facing: 'north', text: 'POOL HALL', color: '#7cff5b', scale: 3.4, brightness: { sky: 15, block: 15 } }, // the sign band
  { x: 449.0, y: 80.45, z: 1137.97, facing: 'north', text: '8', color: '#101010', scale: 4 },                                            // on the 8-ball's white circle
  { x: 449.0, y: 80.45, z: 1139.03, facing: 'south', text: '8', color: '#101010', scale: 4 },                                            // and from behind
  { x: 449.0, y: 69.6, z: HALL.z2 - 1.03, facing: 'north', text: 'WANTED', color: '#b71c1c', scale: 1.6 },                               // the board
  { x: 449.0, y: 68.35, z: HALL.z2 - 1.03, facing: 'north', text: 'HITS  ·  BOUNTIES', color: '#202020', scale: 0.9 }
]
module.exports.displays = []
module.exports.points = {
  POOL_DOOR: DOOR_SPOT,       // GPS node 1056 (streets' gps), on the forecourt in front of the door
  POOL_BROKER: BROKER         // the Broker (quests.sk, kind hits): on his platform behind the desk, facing the door
}
module.exports.setup = {
  regions: [{ id: 'safe_poolhall', box: [418, 63, 1129, 479, 90, 1172], flags: { passthrough: 'allow' },
    note: 'the Broker\'s Pool Hall, its forecourt and yards' }],
  heists: [], keepers: [], crates: [], carSpots: [], chops: [], garages: [], pois: [], walls: [], holos: [], pumps: [],
  givers: [{ kind: 'hits', at: BROKER, cmd: 'dquest addatw hits jailbreak 448.5 65.5 1161.5 180 Pool Hall',
    launchCmd: 'dquest addat hits 448.5 65.5 1161.5 180 Pool Hall', note: 'the Broker, behind his desk, facing the door' }]
}
module.exports.build = () => module.exports()

if (require.main === module) {
  const b = module.exports(), bd = b.bounds()
  console.log(`${MOD}: ${b.blocks.size} blocks, box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}; ${module.exports.labels.length} labels`)
}
