'use strict'
// donut: the Donut Shop (a store), its lot and the giant roof donut (tools/build/town/PLAN.md section 6.2). Box x 386..432,
// z 730..842, every y; world `jailbreak`, ground y 64. Looks from the wiki pictures donut_current, donut_front,
// donut_interior, donut_wide_with_garage. No drive-thru (owner, 2026-10-21: builds are practical; everyone walks in to rob it).
//   node tools/build/town/donut.js                 -> blocks and bounds
//   node tools/build/town/donut.js --render <dir>  -> preview PNGs (top, plans, iso, elevations; preview-only ground)
// Ids are the 26.1.2 server's (no concrete or terracotta stairs or slabs). Nothing here reads blocks.
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

const MOD = 'donut'
const own = ownFor(MOD)
let B = null
// The module's setter, clipped to its columns (a state may be a function of x, y, z for the hashed mixes, taken at the
// coordinates as written). While TURN is set (the donut group, below) every cell is turned a quarter turn about the
// donut's centre column (415.5, 804.5) before it's set: (x, z) -> (1219 - z, x + 389), so north becomes east.
let TURN = false
const S = (x, y, z, s) => {
  if (typeof s === 'function') s = s(x, y, z)
  if (TURN) [x, z] = [1219 - z, x + 389]
  if (own(x, y, z)) B.set(x, y, z, s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s) }
const DB = { set: S } // for COMMON's door()
const WH = (x, y, z) => pick(x, y, z, MIX.white)
const ASPH = (x, y, z) => pick(x, y, z, MIX.asphalt)
const ROOFMIX = [['polished_deepslate', 86], ['smooth_basalt', 14]] // the dark roof: no road blocks (PLAN 10.2)
// the roof membrane: dark grey with a few basalt patches (no seam grid: it read as tic-tac-toe from above)
const RF = (x, y, z) => pick(x, y, z, ROOFMIX)

// ---- the plan's numbers (PLAN 6.2) ----------------------------------------------------------------------------------
const SHOP = { x1: 401, x2: 430, z1: 782, z2: 827 }        // walls y 64..73, floor y 64, ceiling y 73
const ROOF = { x1: 400, x2: 432, z1: 781, z2: 828, y: 74 } // the deck over the shop (2 over the storefront, 1 elsewhere;
                                                            // quartz soffit wherever it's outside)
const DOOR_Z = [804, 805], BACKDOOR = [401, 65, 812]
// The storefront z 786..811: one glass block off-centre to the north (like donut_front, mirrored), 4 panes north of the
// door and 1 south of it; z 812..827 stays the plain striped wall.
const MULLIONS = [786, 790, 794, 798, 803, 806, 811]
const GLASS_Z = [786, 811]
const WINDOWS = [[423, 427]]                                // the south wall's window (z 827) over the booths: glass
                                                            // y 66..69, a mullion in the middle, frame x a-1..b+1, y 65..70
// The roof torus, written facing north and turned to face east (TURN): the hole faces Main Street and the Gun Shop across
// it, and up. Its lowest block is y 77 (heist_donut ends at y 76); a new tilt or cy must keep that (tilt 72 needs cy 88).
const DONUT = { cx: 415.5, cy: 87, cz: 804.5, R: 7.5, r: 3.5, tilt: 60 }
const DRIPS = 14                                                       // icing drips round the ring's outer rim
const SPRINKLES = ['pink_concrete'] // a few deeper pink flecks in the frosting (colored sprinkles read as noise from the street)
// The wall's stripes (outside and in: the walls are 1 thick): a pink base, a thin light line, a thick hot-pink band, white
// above it to the fascia (donut_front: the glazing stops at the thick band's top).
const stripe = y => (y === 64 || y === 65 || y === 70 || y === 71) ? 'pink_concrete' : y === 68 ? 'pink_wool' : null

// ---- the ground (y 64) -----------------------------------------------------------------------------------------------
// shop = the footprint; asph = the lot and the west strip; walk = paving with curbs; green = a planting strip;
// grass = the world's own grass (left unset).
function ground (x, z) {
  if (x >= SHOP.x1 && x <= SHOP.x2 && z >= SHOP.z1 && z <= SHOP.z2) return 'shop'
  if (x >= 401 && z === 828) return 'walk'                            // along the south wall
  if (x >= 399 && x <= 400 && z >= 780 && z <= 828) return 'walk'     // along the west wall (the back door)
  if (x >= 399 && z >= 780 && z <= 781) return 'walk'                 // along the north wall
  if (x >= 431 && z >= 781 && z <= 827) return 'walk'                 // the front apron (Main's sidewalk to the door)
  if (x >= 399 && z >= 829) return 'grass'                            // the lawn south of the shop
  if (x >= 431) return (z >= 744 && z <= 757) ? 'asph' : z >= 731 ? 'green' : 'grass' // the driveway; a planting strip
  if (z <= 730) return 'grass'
  if (z <= 738) return 'plant'                                       // the lot's north row up to its fences (x 386, z 731): grass
                                                                     // and oaks, a curb on its south side (x 387..430)
  if (z <= 779 || x <= 398) return 'asph'                            // the lot; the west strip (the lot's way to 1st Street)
  return 'grass'
}
const BX = BOX.donut[0]
const inB = (x, z) => x >= BX[0] && x <= BX[2] && z >= BX[1] && z <= BX[3]
const isAsph = (x, z) => inB(x, z) && ground(x, z) === 'asph'

function groundLayer () {
  rect(BX[0], BX[1], BX[2], BX[3], (x, z) => {
    const g = ground(x, z)
    if (g === 'asph') S(x, 64, z, ASPH)
    else if (g === 'walk') S(x, 64, z, 'light_gray_concrete')
    else if (g === 'green' && x === 431) S(x, 65, z, 'smooth_stone_slab[type=bottom]') // the strip's curb stone
    else if (g === 'plant') { S(x, 64, z, 'grass_block'); if (z === 738 && x >= 387) S(x, 65, z, 'smooth_stone_slab[type=bottom]') }
  })
  // curbs: every paved cell that touches asphalt on one of its 4 sides
  rect(BX[0], BX[1], BX[2], BX[3], (x, z) => {
    if (ground(x, z) !== 'walk') return
    if (isAsph(x + 1, z) || isAsph(x - 1, z) || isAsph(x, z + 1) || isAsph(x, z - 1)) S(x, 65, z, 'smooth_stone_slab[type=bottom]')
  })
  // parking stalls (white lines, 4 wide): a double row in the middle, a row in front of the shop
  for (let x = 394; x <= 418; x += 4) F(x, 64, 751, x, 64, 762, 'white_concrete')
  F(394, 64, 756, 418, 64, 756, 'white_concrete')
  for (let x = 402; x <= 430; x += 4) F(x, 64, 774, x, 64, 779, 'white_concrete')
  // the double row's planter islands (raised 1 block): a round tree west, a lamp east; the east one 10 blocks in from
  // the Main driveway (z 744..757), so cars coming in have a cross aisle (x 422..430) before it
  for (const [x1, x2] of [[391, 393], [419, 421]]) rect(x1, 751, x2, 762, (x, z) => {
    const edge = x === x1 || x === x2 || z === 751 || z === 762
    S(x, 64, z, edge ? 'smooth_stone' : 'dirt'); S(x, 65, z, edge ? 'smooth_stone' : 'grass_block')
  })
}

// ---- the shop: walls, storefront, windows, doors ------------------------------------------------------------------------
function shell () {
  const { x1, x2, z1, z2 } = SHOP
  // the floor: big light pink tiles with slightly deeper pink lines every 4; the kitchen's floor light stone tiles
  rect(x1 + 1, z1 + 1, x2 - 1, z2 - 1, (x, z) => {
    const grout = ((x - x1) % 4 === 0) || ((z - z1) % 4 === 0)
    if (x <= 408) S(x, 64, z, grout ? 'smooth_stone' : 'polished_diorite')
    else S(x, 64, z, grout ? 'pink_concrete' : 'pink_wool')
  })
  // walls y 64..73, white with the stripes
  rect(x1, z1, x2, z2, (x, z) => {
    if (x !== x1 && x !== x2 && z !== z1 && z !== z2) return
    for (let y = 64; y <= 73; y++) S(x, y, z, stripe(y) || WH)
  })
  // the ceiling (y 73): white with long strip lights
  rect(x1 + 1, z1 + 1, x2 - 1, z2 - 1, (x, z) => {
    const strip = [405, 417, 424].includes(x) && ((z - z1) % 9) >= 2 && ((z - z1) % 9) <= 7
    S(x, 73, z, strip ? 'sea_lantern' : WH)
  })
  // the storefront (east, x 430): tall panes in pink mullions up to the thick band, its pink head the band's lower row
  // (y 71), white wall over it; the double door in its south part (z 804..805: GPS node 1041, the exit, the hologram)
  for (let z = GLASS_Z[0]; z <= GLASS_Z[1]; z++) {
    for (let y = 65; y <= 70; y++) S(x2, y, z, MULLIONS.includes(z) ? 'pink_concrete' : 'glass_pane')
    S(x2, 71, z, 'pink_concrete')
  }
  door(DB, x2, 65, DOOR_Z[0], 'east', 'left', false, 'pale_oak_door'); door(DB, x2, 65, DOOR_Z[1], 'east', 'right', false, 'pale_oak_door')
  S(x2, 67, DOOR_Z[0], 'pink_concrete'); S(x2, 67, DOOR_Z[1], 'pink_concrete') // the transom bar over the doors
  // the south window (z 827): closed glass 5 x 4 with a mullion in the middle, in a thick pink frame up to the band
  for (const [a, b] of WINDOWS) {
    const mid = (a + b) / 2
    for (let x = a - 1; x <= b + 1; x++) for (let y = 65; y <= 70; y++) S(x, y, z2, (x >= a && x <= b && x !== mid && y >= 66 && y <= 69) ? 'glass_pane' : 'pink_concrete')
  }
  // the back door (west): an iron door in a pink frame, a little awning and a light over it
  const [bx, , bz] = BACKDOOR
  door(DB, bx, 65, bz, 'west', 'left', false, 'iron_door')
  S(bx, 67, bz, 'pink_concrete'); S(bx, 68, bz, 'sea_lantern')
  F(bx - 1, 68, bz - 1, bx - 1, 68, bz + 1, 'polished_deepslate_slab[type=top]')
  F(bx - 1, 65, bz - 1, bx - 1, 65, bz + 1, 'smooth_stone_slab[type=bottom]') // the stoop
  // the kitchen's exhaust grille high in the west wall, over the band
  F(x1, 72, 789, x1, 72, 791, 'iron_bars')
}

// ---- the roof deck ----------------------------------------------------------------------------------------------------
function roof () {
  const { x1, x2, z1, z2, y } = ROOF
  rect(x1, z1, x2, z2, (x, z) => {
    const ring = x === x1 || x === x2 || z === z1 || z === z2
    const ring2 = !ring && (x === x1 + 1 || x === x2 - 1 || z === z1 + 1 || z === z2 - 1)
    if (ring) {                                                // the fascia (2 high, like donut_front's thin edge): dark,
      S(x, y - 1, z, 'polished_deepslate_slab[type=top]')      // its lower edge (the soffit's white edge shows under it)
      S(x, y, z, 'pink_stained_glass')                         // the pink neon line ...
      S(x, y + 1, z, 'polished_deepslate_slab[type=bottom]')   // its upper edge, a half-block parapet
    } else if (ring2) {
      S(x, y, z, 'pearlescent_froglight[axis=y]')              // ... lit from behind
      S(x, y + 1, z, 'polished_deepslate_slab[type=bottom]')   // the parapet's inner step hides the light from above
    } else S(x, y, z, RF)
    const overShop = x >= SHOP.x1 && x <= SHOP.x2 && z >= SHOP.z1 && z <= SHOP.z2
    if (!ring && !overShop) S(x, y - 1, z, 'smooth_quartz')   // the soffit wherever the deck is outside the walls (the front overhang)
  })
  // on the deck: two AC units with fan grilles, vent stacks over the kitchen, a roof hatch
  for (const [ax, az] of [[403, 785], [425, 821]]) {
    F(ax, 75, az, ax + 2, 76, az + 2, 'light_gray_concrete')
    F(ax, 77, az, ax + 2, 77, az + 2, 'iron_trapdoor[facing=north,half=bottom,open=false]')
    S(ax + 1, 75, az - 1, 'iron_block')
  }
  for (const z of [790, 792]) { S(403, 75, z, 'polished_blackstone_wall'); S(403, 76, z, 'polished_blackstone_wall'); S(403, 77, z, 'polished_blackstone_slab[type=bottom]') }
  S(406, 75, 822, 'iron_trapdoor[facing=south,half=bottom,open=false]')
}

// ---- inside ---------------------------------------------------------------------------------------------------------------
const DISPLAYS = []
// an item display (summoned later by town.js displays); cmd = the item's custom_model_data string, or none
const disp = (x, y, z, item, scale = 0.5, yaw = 0, pitch = 0, cmd) => DISPLAYS.push(cmd ? { x, y, z, item, cmd, yaw, pitch, scale } : { x, y, z, item, yaw, pitch, scale })
// a donut: the pack's donut sprite (the prison's jail donut, brick + "donating:jail_donut"), lying flat
// a register's lit green screen: the lime glass pane item (a flat framed sprite; a lone pane block is only a thin post),
// standing on the block under it and tilted back a little, facing yaw (0 south, 90 west, -90 east)
const screen = (x, z, yaw, y = 67.25) => disp(x, y, z, 'lime_stained_glass_pane', 0.42, yaw, -15)
const donutDisp = (x, y, z, scale = 0.55, yaw = 0) => disp(x, y, z, 'brick', scale, yaw, 90, 'donating:jail_donut')
function inside () {
  // the kitchen (x 402..408): lookalikes only, nothing with a menu (PLAN 10.2)
  F(402, 65, 784, 402, 65, 789, 'smooth_quartz')                                     // a prep counter
  F(402, 65, 790, 402, 65, 791, 'iron_block')                                        // two fryers with grate lids
  F(402, 66, 790, 402, 66, 791, 'iron_trapdoor[facing=east,half=bottom,open=false]')
  F(402, 71, 789, 403, 72, 792, 'light_gray_concrete'); F(403, 71, 789, 403, 71, 792, 'iron_trapdoor[facing=west,half=top,open=false]') // the hood
  F(402, 65, 793, 402, 68, 796, 'iron_block')                                        // the ovens, doors on their fronts
  for (let z = 793; z <= 796; z++) { S(403, 66, z, 'iron_trapdoor[facing=east,half=bottom,open=true]'); S(402, 66, z, 'tinted_glass') }
  F(402, 65, 797, 402, 65, 799, 'smooth_quartz')                                     // a sink counter
  for (const [a, b] of [[801, 803], [806, 808]]) F(402, 65, a, 402, 69, b, 'iron_bars') // donut racks
  F(402, 65, 815, 402, 65, 817, 'smooth_quartz'); S(402, 66, 816, 'iron_block'); S(402, 67, 816, 'light_gray_concrete') // a stand mixer
  F(402, 65, 819, 404, 70, 825, 'iron_block')                                       // the walk-in freezer (solid: no dark room)
  F(404, 66, 819, 404, 69, 825, 'light_gray_concrete'); door(DB, 404, 65, 822, 'west', 'left', false, 'iron_door')
  for (const [a, b] of [[788, 796], [800, 808]]) F(405, 65, a, 406, 65, b, 'smooth_quartz') // two prep islands
  F(409, 65, 795, 409, 65, 812, 'smooth_quartz')                                     // the back counter, coffee machines on it
  for (const z of [797, 809]) { S(409, 66, z, 'iron_block'); S(409, 67, z, 'polished_blackstone_slab[type=bottom]') }
  S(409, 66, 803, 'polished_blackstone'); screen(409.5, 803.5, -90)                       // the back register (faces the clerks' aisle)
  // the menu boards hanging over the clerks (they face the customers through the counter)
  const PANEL = ['magenta_concrete', 'magenta_concrete', 'pearlescent_froglight[axis=y]', 'pearlescent_froglight[axis=y]', 'pink_concrete', 'pink_concrete']
  for (const z0 of [795, 808]) for (let k = 0; k < 6; k++) {
    S(410, 72, z0 + k, 'polished_blackstone'); S(410, 71, z0 + k, PANEL[k]); S(410, 70, z0 + k, PANEL[k])
  }
  // the front counter (x 412, z 793..814): white, raised ends; the register cells (z 800..802) stay bare with air above
  F(412, 65, 793, 412, 65, 814, 'smooth_quartz')
  S(412, 66, 793, 'quartz_slab[type=bottom]'); S(412, 66, 814, 'quartz_slab[type=bottom]')
  S(412, 66, 803, 'polished_blackstone'); screen(412.5, 803.5, -90)                       // the decorative cash register (faces the customers)
  // the donut case in front of it (glass, as high as the counter; donuts inside as item displays), open in front of the
  // registers
  for (const [a, b] of [[793, 799], [805, 813]]) for (let z = a; z <= b; z++) {
    S(413, 65, z, 'glass')
    donutDisp(413.5, 65.3, z + 0.5, 0.55, (h(413, 5, z) % 4) * 90)
  }
  for (const z of [795, 796, 811]) { disp(412.5, 66.25, z + 0.5, 'pink_wool', 0.45, 90, 0); disp(412.5, 66.7, z + 0.5, 'pink_wool', 0.4, 75, 0) } // bakery boxes
  // the half wall that closes the clerks' side to the south (jumpable); the way behind is round the north end (z 792)
  F(412, 65, 815, 421, 65, 815, 'smooth_quartz'); F(421, 65, 816, 421, 65, 826, 'smooth_quartz')
  // seating: purpur tables (top slabs) with purpur-stair benches on light blue rugs, north and south of the aisle
  const seating = (rx1, rz1, rx2, rz2, sets) => {
    const used = new Set()
    for (const [tx, tz] of sets) for (const x of [tx, tx + 1]) {
      S(x, 65, tz, 'purpur_slab[type=top]')
      S(x, 65, tz - 1, 'purpur_stairs[facing=north,half=bottom]'); S(x, 65, tz + 1, 'purpur_stairs[facing=south,half=bottom]')
      for (const z of [tz - 1, tz, tz + 1]) used.add(`${x},${z}`)
    }
    rect(rx1, rz1, rx2, rz2, (x, z) => { if (!used.has(`${x},${z}`)) S(x, 65, z, 'light_blue_carpet') })
  }
  seating(419, 785, 426, 797, [[420, 787], [424, 787], [420, 793], [424, 793]])
  seating(422, 816, 428, 824, [[423, 818], [426, 818], [423, 822], [426, 822]])
  // arcade cabinets, 3 high (pink, a dark screen, a lit marquee): the south-east corner and by the counter's north end
  for (const [x, z] of [[428, 826], [429, 826], [413, 783], [414, 783]]) {
    S(x, 65, z, 'pink_concrete'); S(x, 66, z, 'black_stained_glass'); S(x, 67, z, 'pearlescent_froglight[axis=y]')
  }
  S(429, 65, 804, 'pink_carpet'); S(429, 65, 805, 'pink_carpet') // the door mat
  // two pink bins by the door, a block off the glass (a pane would reach out to them; closed iron lids: they can't be opened)
  for (const z of [801, 808]) { S(428, 65, z, 'pink_concrete'); S(428, 66, z, 'iron_trapdoor[facing=west,half=bottom,open=false]') }
  // the condiment station on the north wall: a white counter with napkin and straw dispensers, the posters over it
  F(416, 65, 783, 424, 65, 783, 'smooth_quartz')
  for (const x of [417, 420, 423]) S(x, 66, 783, x === 420 ? 'polished_blackstone_slab[type=bottom]' : 'iron_trapdoor[facing=south,half=bottom,open=false]')
  for (const x0 of [416, 421]) for (let x = x0; x <= x0 + 3; x++) for (let y = 68; y <= 71; y++) {
    const edge = x === x0 || x === x0 + 3 || y === 68 || y === 71
    S(x, y, 783, edge ? 'magenta_concrete' : (y === 70 && x === x0 + 1) ? 'pearlescent_froglight[axis=y]' : 'pink_wool')
  }
  // the donut-man by the north-east window, facing the room (seen from Main through the panes: his ring z 794..798, the eyes
  // behind the panes 795..797, the arms at 793 and 799): a 5x5 pink ring for a body, legs, white gloves, a face
  const sx = 428, sz = 796, sy = 68 // the ring's centre (its hole)
  for (let dz = -2; dz <= 2; dz++) for (let dy = -2; dy <= 2; dy++) {
    if ((Math.abs(dz) === 2 && Math.abs(dy) === 2) || (dz === 0 && dy === 0)) continue
    S(sx, sy + dy, sz + dz, dy >= 0 ? 'pink_wool' : 'pink_concrete')                 // frosting over the dough
  }
  S(sx, 70, sz - 1, 'light_blue_wool'); S(sx, 70, sz + 1, 'yellow_wool')              // two sprinkles
  S(sx, 69, sz - 1, 'black_concrete'); S(sx, 69, sz + 1, 'black_concrete')           // eyes
  F(sx, 66, sz - 1, sx, 66, sz + 1, 'red_concrete')                                   // a grin along the bottom
  S(sx, 65, sz - 1, 'pink_concrete'); S(sx, 65, sz + 1, 'pink_concrete')             // legs
  S(sx, 67, sz - 3, 'pink_concrete'); S(sx, 66, sz - 3, 'white_concrete')            // the left arm down, a glove
  S(sx, 69, sz + 3, 'pink_concrete'); S(sx, 70, sz + 3, 'white_concrete')            // the right arm up, waving
}

// ---- around the shop: fences, lamps, the dumpster, plants, the ATM ---------------------------------------------------------
function yard () {
  for (let z = 731; z <= 842; z++) { S(386, 65, z, 'dark_oak_fence'); S(386, 66, z, 'dark_oak_fence') }
  for (let x = 386; x <= 432; x++) { S(x, 65, 731, 'dark_oak_fence'); S(x, 66, 731, 'dark_oak_fence') }
  // lamps: three in the north planter (the east one west of the pylon, so it never stands in front of its face), one on
  // the east island, one by the west strip
  for (const x of [398, 414, 425]) streetLamp(S, x, 732, 0, 1)
  streetLamp(S, 420, 756, -1, 0, 65)
  streetLamp(S, 387, 800, 1, 0)
  oak(S, 392, 756, 65)
  for (const x of [390, 406, 419]) oak(S, x, 735)           // the north planter's oaks, 4+ clear of the lamps
  for (const x of [405, 414]) oak(S, x, 836)                // the south lawn's oaks, clear of the window and its label (x 421..428)
  shrub(S, 420, 752, 65); shrub(S, 420, 760, 65)
  // the DONUTS pole sign at the lot's north-east corner, its faces north (the bridge and the approach road) and south (the
  // lot): a pink pole and trim, a black panel 5 x 2 under a deepslate cap (no road block faces the sky)
  F(430, 65, 736, 430, 68, 736, 'pink_concrete')
  F(428, 69, 736, 432, 69, 736, 'pink_concrete')
  F(428, 70, 736, 432, 71, 736, 'black_concrete')
  F(428, 72, 736, 432, 72, 736, 'polished_deepslate_slab[type=bottom]')
  // the planting strip along Main (x 431..432): shrubs on the outer cells
  // (bushes 1 wide and 2 long along the strip: COMMON's shrub would reach over x 432 into the sidewalk's column)
  for (const z of [739, 761, 766, 771, 775]) {
    const s = h(432, 1, z) < 50 ? 'oak_leaves[persistent=true]' : 'azalea_leaves[persistent=true]'
    S(432, 65, z, s); S(432, 65, z + 1, s); if (h(432, 4, z) < 50) S(432, 66, z, s)
  }
  // the front apron: hedge planters against the solid wall (north of the glass, and on the plain south wall) and the ATM
  // beside the door (a lilac box in front of the mullion z 803; the door's spot (431.5, 804.5) stays clear)
  for (const [a, b] of [[782, 785], [821, 824]]) { F(431, 65, a, 432, 65, b, 'smooth_stone'); F(431, 66, a, 432, 66, b, 'azalea_leaves[persistent=true]') }
  S(431, 65, 803, 'purpur_block'); S(431, 66, 803, 'purpur_block'); S(431, 67, 803, 'purpur_slab[type=bottom]')
  // the dumpster pen in the lot's north-west corner (x 387..391, z 740..746: out of the west strip's way), fenced on three
  // sides (the lot fence is the fourth)
  for (let x = 387; x <= 391; x++) for (const z of [740, 746]) { S(x, 65, z, 'dark_oak_fence'); S(x, 66, z, 'dark_oak_fence') }
  for (let z = 741; z <= 745; z++) { S(391, 65, z, 'dark_oak_fence'); S(391, 66, z, 'dark_oak_fence') }
  F(387, 65, 741, 388, 66, 743, 'green_concrete'); F(387, 67, 741, 388, 67, 743, 'iron_trapdoor[facing=east,half=bottom,open=false]')
  F(387, 65, 745, 388, 65, 745, 'blue_concrete'); F(387, 66, 745, 388, 66, 745, 'iron_trapdoor[facing=east,half=bottom,open=false]')
}

// ---- the giant donut, its truss and the DONUTS sign box (the 2022 look; PLAN Q8) ------------------------------------------------
// Written facing north (the coordinates below) and set with TURN on, so the finished group faces east: the hole and
// the sign box toward Main Street, like the picture donut_front. Turned, the feet land at x 402..424, z 795..814 (clear
// of the AC units, the vent stacks and the hatch). Slim like the reference (two A-frames and a strut up the back): legs
// 1 thick standing straight on the deck, no foot pads and no tie between the back props (with them, the truss read as
// spider legs from above).
// 6-connected 3D line (every step shares a face with the last), so a 1-block strut never reads as dotted.
function line3 (a, b, fn) {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]))
  let p = null
  for (let i = 0; i <= n; i++) {
    const c = [0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * i / n))
    if (p) { const q = [...p]; for (let k = 0; k < 3; k++) if (q[k] !== c[k]) { q[k] = c[k]; if (q.some((v, j) => v !== c[j])) fn(...q) } }
    fn(...c); p = c
  }
}
const mirror = ([x, y, z]) => [831 - x, y, z] // across the donut's centre line x 415.5
function truss () {
  const T = 'pink_concrete'
  const put = (x, y, z) => S(x, y, z, T)
  for (const m of [p => p, mirror]) {
    const putB = (x, y, z) => { put(x, y, z); put(x, y, z + 1) }                  // the back prop: 2 thick, toward the back
    const [f1, f2, ap] = [[406, 75, 795], [406, 75, 811], [410, 82, 802]].map(m) // an A-frame each side, legs splayed
    // the back prop rises behind the tube, outside the hole's span (x 411.5..419.5), to the ring's upper back
    const [bf, bt] = [[408, 75, 816], [409, 89, 809]].map(m)
    line3(f1, ap, put); line3(f2, ap, put)
    line3(m([408, 78, 798]), m([408, 78, 807]), put)                              // its tie
    line3(bf, bt, putB)
  }
}
function torus () {
  const { cx, cy, cz, R, r } = DONUT
  const t = DONUT.tilt * Math.PI / 180
  const n = [0, Math.cos(t), -Math.sin(t)]        // the ring's axis: up and north as written (east once turned)
  const E2 = [0, n[2], -n[1]]                     // with x, the ring plane's second axis (n x (1, 0, 0))
  const L = (() => { const v = [-0.35, 0.75, -0.55], l = Math.hypot(...v); return v.map(c => c / l) })() // the gloss light
  const geo = (x, y, z) => {
    const p = [x + 0.5 - cx, y + 0.5 - cy, z + 0.5 - cz]
    const a = p[0] * n[0] + p[1] * n[1] + p[2] * n[2]
    const q = [p[0] - a * n[0], p[1] - a * n[1], p[2] - a * n[2]], rho = Math.hypot(...q) || 1e-9
    return { p, a, q, rho, in: (rho - R) ** 2 + a * a <= r * r }
  }
  const E = Math.ceil(R + r + 1)
  for (let x = Math.floor(cx - E); x <= Math.ceil(cx + E); x++) for (let y = Math.floor(cy - E); y <= Math.ceil(cy + E); y++) for (let z = Math.floor(cz - E); z <= Math.ceil(cz + E); z++) {
    const g = geo(x, y, z)
    if (!g.in) continue
    const surface = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([dx, dy, dz]) => !geo(x + dx, y + dy, z + dz).in)
    if (!surface) { S(x, y, z, 'pink_concrete'); continue }        // the hidden core (solid: no dark cavity)
    const u = g.q.map(c => c / g.rho)                                  // outward in the ring's plane
    const d = g.p.map((c, k) => c - u[k] * R), dl = Math.hypot(...d) || 1e-9
    const nd = d.map(c => c / dl)                                      // the surface normal
    const na = nd[0] * n[0] + nd[1] * n[1] + nd[2] * n[2], nr = nd[0] * u[0] + nd[1] * u[1] + nd[2] * u[2]
    const lit = nd[0] * L[0] + nd[1] * L[1] + nd[2] * L[2]
    // Jailbreak's donut is one glowing pink: light frosting on the faces turned to the road and the sky, a deeper pink
    // dough under it, a pale gloss streak where the light catches it, and the hole's inside lit. The frosting's edge
    // runs in drips round the outer rim (DRIPS sectors, each its own length), so it reads as icing, not as noise.
    const th = (Math.atan2(u[0] * E2[0] + u[1] * E2[1] + u[2] * E2[2], u[0]) / (2 * Math.PI) + 1) % 1 // the angle round the ring, 0..1
    const sec = Math.floor(th * DRIPS), w = th * DRIPS - sec - 0.5          // the drip's sector and where in it (-0.5..0.5)
    const len = (h(sec, 31, 7) % 100) / 100                                  // this drip's length
    const drip = Math.max(0, 1 - Math.abs(w) / 0.32) * (0.25 + 0.75 * len)  // 0 between drips, up to 1 at a long drip's middle
    const edge = nr < 0 ? -0.3 : -0.12 - 0.25 * drip                         // the frosting's lower edge (as na; short
                                                                             // drips: the 2022 donut's edge is clean)
    let s
    if (nr < -0.62) s = (na > 0.2 && h(x, y, z) < 60) ? 'pearlescent_froglight[axis=y]' : 'pink_wool' // the hole's inside:
                                                                             // light pink, lit on its upper faces (no white grille)
    else if (na > edge) {                                                    // the frosting
      if (lit > 0.9 && na > 0.35) s = 'pearlescent_froglight[axis=y]'      // the gloss streak
      else if (na > 0.3 && h(x, y, z) < 5 && SPRINKLES.length) s = SPRINKLES[h(z, x, y) % SPRINKLES.length] // a few deeper flecks
      else s = 'pink_wool'
    } else s = 'pink_concrete'                                                // the dough (terracotta would read brown)
    S(x, y, z, s)
  }
}
function signBox () {
  // black, set into the front of the ring's upper tube below its crown (donut_wide: it covers the tube's face, it doesn't
  // perch on top; about 2 rows of tube show over it from Main and the hole stays clear under it): world x 415..416,
  // y 91..93, z 800..809, its face (x 416, east) proud of the tube; the DONUTS label is pink (labels). Its top is a
  // blackstone cap (y 94), so no road block faces the sky (PLAN 10.2). The old, taller box's cells are the torus's own again.
  F(411, 91, 803, 420, 93, 804, 'black_concrete')
  F(411, 94, 803, 420, 94, 804, 'polished_blackstone_slab[type=bottom]')
}

// ---- the module ------------------------------------------------------------------------------------------------------------
module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  groundLayer(); shell(); roof(); inside(); yard()
  TURN = true; truss(); torus(); signBox(); TURN = false // the donut group, turned to face east
  B = null
  return b
}
module.exports.labels = [
  { x: 417.03, y: 91.62, z: 805.0, facing: 'east', text: 'DONUTS', color: '#ff6ec7', scale: 7 },      // the roof sign box (face x 416, y 91..94.5)
  { x: 416.0, y: 72.05, z: 781.97, facing: 'north', text: 'DONUTS', color: '#e8387f', scale: 3.5 },   // the north wall's white over the band (the lot)
  { x: 431.03, y: 71.12, z: 805.0, facing: 'east', text: 'DONUTS', color: '#ffffff', scale: 2.5 },    // over the door (the pink head, y 71)
  { x: 431.03, y: 72.0, z: 820.0, facing: 'east', text: 'DONUTS', color: '#e8387f', scale: 4 },       // the plain front wall south of the glass (z 812..827, white, y 72)
  { x: 425.0, y: 70.15, z: 828.03, facing: 'south', text: 'DONUTS', color: '#ffffff', scale: 4 },      // the south wall's band over its window (toward 1st Street)
  { x: 402.03, y: 72.0, z: 805.0, facing: 'east', text: 'DONUTS', color: '#ff4f9a', scale: 3.5 },     // inside, the back wall over the band
  { x: 430.5, y: 70.5, z: 735.97, facing: 'north', text: 'DONUTS', color: '#ff6ec7', scale: 3.5 },     // the pole sign (panel x 428..432, y 70..72), toward the bridge
  { x: 430.5, y: 70.5, z: 737.03, facing: 'south', text: 'DONUTS', color: '#ff6ec7', scale: 3.5 },     // the pole sign, toward the lot
  { x: 400.97, y: 67.55, z: 812.5, facing: 'west', text: 'STAFF ONLY', color: '#ffffff', scale: 0.6 }, // the back door
  { x: 432.03, y: 66.3, z: 803.5, facing: 'east', text: 'ATM', color: '#ffffff', scale: 0.9 },        // the lilac box beside the door
  { x: 418.0, y: 69.3, z: 784.03, facing: 'south', text: 'FRESH', color: '#ffffff', scale: 1.2 },     // the posters over the
  { x: 423.0, y: 69.3, z: 784.03, facing: 'south', text: 'DAILY', color: '#ffffff', scale: 1.2 }       // condiment station
]
module.exports.displays = DISPLAYS
// The store's spots (PLAN 8.2). Loot cells are the blocks the loot lies on (y 65: the counter top is y 66).
module.exports.points = {
  DONUT_EXIT: [435.5, 65, 804.5, -90],      // /dheist exit donut (Main's sidewalk: the streets module's column)
  DONUT_HOLO: [431.5, 65, 811.5, -90],      // /dheist holo donut (the apron in front of the glass, clear of the door; it floats 2.5 up)
  DONUT_REGISTER_A: [412, 65, 801, 0],
  DONUT_REGISTER_B: [412, 65, 802, 0],
  DONUT_REGISTER_C: [412, 65, 800, 0],
  DONUT_DOOR: [431.5, 65, 804.5, 90],       // outside the double door, facing in (GPS door node 1041)
  DONUT_BACKDOOR: [400.5, 65, 812.5, 90]
}
module.exports.setup = {
  regions: [{ id: 'heist_donut', box: [401, 63, 782, 430, 76, 827], flags: ['passthrough allow'], note: 'store; the floor to just over the roof deck (the truss feet at y 75..76 are in it, the donut is not)' }],
  heists: [{
    id: 'donut', difficulty: 0, name: 'Donut Shop', exit: [435.5, 65, 804.5, -90], holo: [431.5, 65, 811.5],
    snapshot: 'with the front doors (430, 65, 804..805) closed',
    // one register for the whole $3,000 pool: 3 cells (a register cell holds 12 bills of $100, so 2 cells top out at $2,400)
    loot: [
      { name: 'Front_register', cells: [412, 65, 800, 412, 65, 802], value: '1800-3000', style: 'register',
        cmd: 'dloot add donut pile 412 65 800 412 65 802 value=1800-3000 style=register name=Front_register' }
    ]
  }],
  keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], pois: [], walls: [], holos: []
}
module.exports.build = () => module.exports()

// ---- previews (node tools/build/town/donut.js --render <dir>) -------------------------------------------------------------
// The preview adds the world's grass and Main Street's west half around the build (never part of the build itself).
function previewBuild () {
  const { Build } = require('../mcstruct')
  const b = module.exports()
  const p = new Build()
  for (let x = BX[0] - 2; x <= 462; x++) for (let z = BX[1] - 4; z <= BX[3] + 6; z++) {
    if (inB(x, z)) { if (!b.get(x, 64, z)) p.set(x, 64, z, 'grass_block'); continue }
    const c = streetCell(x, z)
    p.set(x, 64, z, !c ? 'grass_block' : c.kind === 'walk' ? 'light_gray_concrete' : c.line === 'yellow' ? 'yellow_concrete' : c.line === 'white' ? 'white_concrete' : 'black_concrete')
  }
  const ALIAS = { smooth_quartz: 'quartz_block', smooth_quartz_slab: 'quartz_block', quartz_slab: 'quartz_block' }
  for (const [k, s] of b.blocks) p.blocks.set(k, ALIAS[s.replace(/^minecraft:/, '').replace(/\[.*$/, '')] || s)
  return p
}
function sub (b, x1, z1, x2, z2, y1 = -999, y2 = 999) {
  const out = new (require('../mcstruct').Build)()
  for (const [k, s] of b.blocks) { const [x, y, z] = k.split(',').map(Number); if (x >= x1 && x <= x2 && z >= z1 && z <= z2 && y >= y1 && y <= y2) out.blocks.set(k, s) }
  return out
}
// An orthographic side view: face = where the viewer stands (east = looking west at the storefront).
function elevation (b, face, px) {
  const { blockColor } = require('../render')
  const { canvas } = require('../../png')
  const f = { east: [c => -c.z, c => c.x], west: [c => c.z, c => -c.x], north: [c => -c.x, c => -c.z], south: [c => c.x, c => c.z] }[face]
  const cells = []
  for (const [k, s] of b.blocks) { const col = blockColor(s); if (!col) continue; const [x, y, z] = k.split(',').map(Number); cells.push({ x, y, z, col, u: f[0]({ x, z }), d: f[1]({ x, z }) }) }
  const u1 = Math.min(...cells.map(c => c.u)), u2 = Math.max(...cells.map(c => c.u))
  const y1 = Math.min(...cells.map(c => c.y)), y2 = Math.max(...cells.map(c => c.y))
  const d1 = Math.min(...cells.map(c => c.d)), d2 = Math.max(...cells.map(c => c.d))
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
if (require.main === module) {
  const args = process.argv.slice(2)
  const ri = args.indexOf('--render')
  const b = module.exports()
  const bb = b.bounds()
  console.log(`donut: ${b.blocks.size} blocks, box ${bb.x1},${bb.y1},${bb.z1} to ${bb.x2},${bb.y2},${bb.z2}; ${module.exports.labels.length} labels, ${DISPLAYS.length} displays`)
  if (ri >= 0) {
    const fs = require('fs'), path = require('path')
    const R = require('../render')
    const dir = args[ri + 1] || path.join(__dirname, 'renders', 'donut')
    fs.mkdirSync(dir, { recursive: true })
    const save = (name, img) => { const f = path.join(dir, `${name}.png`); fs.writeFileSync(f, img.png()); console.log(`wrote ${f} (${img.w}x${img.h})`) }
    const p = previewBuild()
    const shop = sub(p, 384, 776, 440, 846, 60)
    save('top', R.top(p, 5))
    for (const y of [65, 66, 75]) save(`plan-y${y}`, R.plan(sub(p, BX[0], BX[1], BX[2], BX[3]), y, 6))
    for (const d of ['NE', 'SE', 'SW', 'NW']) save(`iso-${d}`, R.iso(p, d, 4))
    for (const d of ['NE', 'SE', 'NW']) save(`shop-iso-${d}`, R.iso(shop, d, 8))
    const cut = sub(p, 396, 778, 436, 845, 60, 72) // the roof off: the rooms
    for (const d of ['NE', 'SW']) save(`cut-${d}`, R.iso(cut, d, 12))
    for (const d of ['NE', 'SE', 'NW']) save(`donut-iso-${d}`, R.iso(sub(p, 400, 790, 431, 820, 75), d, 14)) // the roof donut on its own (it faces east)
    for (const fc of ['east', 'south', 'north', 'west']) save(`elev-${fc}`, elevation(sub(p, 384, 776, 440, 846, 63), fc, 8))
  }
}
