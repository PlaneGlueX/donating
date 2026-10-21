'use strict'
// gas: the Gas Station (its forecourt, the canopy, six pump islands, the price sign) and the Convenience Store (a store)
// (tools/build/town/PLAN.md section 6.4). Box x 366..432, z 865..986, every y; world `jailbreak`, ground y 64.
// Looks from the wiki pictures gas_current, gas_top, gas_view, gas_view0 and convenience_store.
//   node tools/build/town/gas.js                 -> blocks and bounds
//   node tools/build/town/gas.js --render <dir>  -> preview PNGs (top, plans, iso, close-ups, elevations; preview-only ground)
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

const MOD = 'gas'
const own = ownFor(MOD)
let B = null
// The module's setter, clipped to its columns (a state may be a function of x, y, z for the hashed mixes).
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, typeof s === 'function' ? s(x, y, z) : s) }
const F = (x1, y1, z1, x2, y2, z2, s) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s) }
const DB = { set: S } // for COMMON's door()
const ASPH = (x, y, z) => pick(x, y, z, MIX.asphalt)
const LID = f => `iron_trapdoor[facing=${f},half=bottom,open=false]` // a closed lid or grille (can't be opened by hand)

// ---- the plan's numbers (PLAN 6.4) ----------------------------------------------------------------------------------
const BX = BOX.gas[0]                                             // 366, 865 .. 432, 986
const STORE = { x1: 370, x2: 391, z1: 885, z2: 930, zs: 904 }     // north part z 885..903 (walls y 64..71, roof y 72),
                                                                  // south part z 904..930 (walls y 64..72, roof y 73): the
                                                                  // taller part, its lit step edge on z 904 (y 73)
const roofY = z => z >= STORE.zs ? 73 : 72                       // the roof block over a store column
const topY = z => roofY(z) - 1                                    // the walls' top course (the neon) = the drop ceiling
const FRIDGE_TOP = () => 70                                       // the fridge wall's header (under both ceilings)
const CANOPY = { x1: 406, x2: 423, z1: 873, z2: 941 }             // underside y 72, body y 72..73, glass panels y 74; it
                                                                  // overhangs the first and the last island tip by 3
const PILLARS = [879, 890, 901, 912, 923, 934]                    // 2x2 teal pillars at x 414..415, z p..p+1 (PLAN 6.4)
const ISLAND = { x1: 413, x2: 416, a: 3, b: 4 }                  // pump islands z p-3..p+4: the pillar's middle +-4
const PUMP_Z = [-2, 3]                                            // pumps on x 414..415 at z p-2 and p+3: pump | pillar | pump
                                                                  // (as in gas_view0), their screens and nozzles facing the
                                                                  // lanes where cars stop, x 412 (west) and 417 (east)
const DRIVE_IN = [868, 879], DRIVE_OUT = [952, 963]               // Main's curb cuts (COMMON's DRIVEWAYS)
const DOOR_Z = [907, 908]                                         // the double birch door in the front wall x 391
const SIDE_DOOR = [380, 65, 885]                                  // the grey staff door in the north wall
const COUNTER = { x: 386, z1: 912, z2: 919 }                      // the checkout, 1 deep; the clerk works west of it
const REGISTER = [[386, 65, 914], [386, 65, 915]]                 // the register's loot cells (the blocks it lies on)
const DECO_REGISTER = [386, 66, 916]                              // the decorative cash register on the counter
const TILL = [380, 65, 890]                                       // the lottery counter's till (a loot cell)
const SIGN = { x1: 428, x2: 430, z1: 966, z2: 970, y1: 68, y2: 74 } // the price sign's box (on two posts), faces Main and the pumps
// the storefront's piers: wide frosted panels 5 across (convenience_store), the step's pair (903, 904), the door bay's
// (906, 909) and the band's end (912)
const FRONT_PIERS = new Set([885, 891, 897, 903, 904, 906, 909, 912, 918, 924, 930])
// blue pilasters on the side and rear walls (the walls are one flat colour otherwise): the rear's follow the front's
// rhythm, the north wall's stand either side of the staff door
const PILASTERS = { rear: [891, 897, 903, 912, 918, 924], north: [375, 385], south: [375, 380, 385] }
const isPillarCell = (x, z) => (x === 414 || x === 415) && PILLARS.some(p => z === p || z === p + 1)
const islandOf = (x, z) => x >= ISLAND.x1 && x <= ISLAND.x2 ? PILLARS.find(p => z >= p - ISLAND.a && z <= p + ISLAND.b) : undefined

// ---- the ground (y 64) -----------------------------------------------------------------------------------------------
// asph = the forecourt, the lots and the drives; walk = paving (curbs where it meets asphalt); util = gravel behind the
// store; island = the raised pump and air islands; green / lawn = the world's grass (curbed where it meets asphalt);
// fence = the back fence line; store = the building's footprint.
function ground (x, z) {
  if (x === BX[0]) return 'fence'
  if (x >= STORE.x1 && x <= STORE.x2 && z >= STORE.z1 && z <= STORE.z2) return 'store'
  if (x >= 430 && ((z >= DRIVE_IN[0] && z <= DRIVE_IN[1]) || (z >= DRIVE_OUT[0] && z <= DRIVE_OUT[1]))) return 'asph'
  if (z <= 867 || z >= 983) return 'green'                           // the strips along 1st and 2nd Street
  if (x >= 424 && z >= 964) return 'green'                           // the price sign's corner
  if (x >= 430) return (z >= 932 && z <= 936) ? 'walk' : 'green'      // the strip along Main, a footpath across it
  if (x >= 392 && x <= 393 && z >= 882 && z <= 933) return 'walk'     // the store's front walk
  if (x <= 391 && ((z >= 882 && z <= 884) || (z >= 931 && z <= 933))) return 'walk' // along the north and south walls
  if (x <= 369 && z >= 885 && z <= 930) return 'util'                // the utility strip behind the store
  if (x <= 391 && z >= 956) return 'lawn'                            // the picnic lawn
  if (x >= 400 && x <= 423 && z >= 965 && z <= 967) return 'green'   // a curbed planted island across the south forecourt
                                                                     // (the south lot is reached past its west end, x 392..399)
  if (islandOf(x, z) !== undefined) return 'island'
  if (x >= 380 && x <= 385 && z >= 942 && z <= 947) return 'island'  // the air and vacuum island
  return 'asph'
}
const inB = (x, z) => x >= BX[0] && x <= BX[2] && z >= BX[1] && z <= BX[3]
const gAt = (x, z) => inB(x, z) ? ground(x, z) : null
const nextTo = (x, z, g) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => gAt(x + dx, z + dz) === g)
// curb cuts in the store's walks: the front door (its path to the pumps) and the side door's path from the north lot
const curbCut = (x, z) => (x === 393 && z >= 905 && z <= 914) || (z === 882 && x >= 378 && x <= 382) || x >= 430

// A painted arrow (white concrete): its tip at (tx, tz) pointing [dx, dz], a 3-row head and a shaft of n cells behind.
function arrow (tx, tz, dx, dz, n = 5) {
  const px = -dz, pz = dx
  for (let k = 0; k <= 2; k++) for (let w = -k; w <= k; w++) S(tx - dx * k + px * w, 64, tz - dz * k + pz * w, 'white_concrete')
  for (let k = 3; k < 3 + n; k++) S(tx - dx * k, 64, tz - dz * k, 'white_concrete')
}

function groundLayer () {
  rect(BX[0], BX[1], BX[2], BX[3], (x, z) => {
    const g = ground(x, z)
    if (g === 'asph') S(x, 64, z, ASPH)
    else if (g === 'walk') S(x, 64, z, 'light_gray_concrete')
    else if (g === 'util') S(x, 64, z, h(x, 1, z) < 80 ? 'gravel' : 'andesite')
    else if (g === 'island') { S(x, 64, z, 'smooth_stone'); S(x, 65, z, 'smooth_stone_slab[type=bottom]') }
    else if ((g === 'green' || g === 'lawn') && nextTo(x, z, 'asph')) { S(x, 64, z, 'smooth_stone'); S(x, 65, z, 'smooth_stone_slab[type=bottom]') } // curb stones
    else if (g === 'fence') { S(x, 65, z, 'dark_oak_fence'); S(x, 66, z, 'dark_oak_fence') } // the back fence, 2 high
  })
  // the walks' curbs: every paved cell that touches asphalt, except the cuts
  rect(BX[0], BX[1], BX[2], BX[3], (x, z) => {
    if (ground(x, z) === 'walk' && !curbCut(x, z) && nextTo(x, z, 'asph')) S(x, 65, z, 'smooth_stone_slab[type=bottom]')
  })
  // parking stalls (white lines): in front of the store (nose in), a no-parking hatch at its door, the north lot, the
  // service lot along the back fence, and a row along 2nd Street
  for (const z of [884, 888, 892, 896, 900, 904, 911, 915, 919, 923, 927, 931]) F(394, 64, z, 399, 64, z, 'white_concrete')
  rect(394, 905, 399, 910, (x, z) => { if ((x + z) % 3 === 0) S(x, 64, z, 'white_concrete') })
  for (const x of [374, 378, 382, 386, 390]) F(x, 64, 868, x, 64, 873, 'white_concrete')
  for (const z of [935, 939, 943, 947, 951, 955]) F(367, 64, z, 372, 64, z, 'white_concrete')
  for (let x = 394; x <= 422; x += 4) F(x, 64, 977, x, 64, 982, 'white_concrete')
  // the flow: IN from Main, south through both pump lanes, OUT to Main (a stop bar before the sidewalk)
  arrow(424, 873, -1, 0, 6); arrow(427, 957, 1, 0, 5) // the OUT arrow's head stops 2 short of the stop bar
  for (const x of [409, 420]) { arrow(x, 875, 0, 1, 4); arrow(x, 951, 0, 1, 4) } // the lanes' centre cells
  F(429, 64, DRIVE_OUT[0], 429, 64, DRIVE_OUT[1], 'white_concrete')
}

// ---- the canopy: glowing cyan fascia, blue soffit with light panels, glass top in 4 sections, teal Y pillars ----------
function canopy () {
  const { x1, x2, z1, z2 } = CANOPY
  const DIV = [891, 907, 923]                                      // the top's frames between its 4 glass sections
  rect(x1, z1, x2, z2, (x, z) => {
    const ring = x === x1 || x === x2 || z === z1 || z === z2
    const ring2 = !ring && (x === x1 + 1 || x === x2 - 1 || z === z1 + 1 || z === z2 - 1)
    const frame = ring2 || DIV.includes(z)                           // the top's frame: the rim and the dividers
    if (ring) { // the fascia: a navy lip (y 72, the soffit's edge) under a band that glows cyan (y 73..74) ...
      S(x, 72, z, 'blue_concrete'); for (let y = 73; y <= 74; y++) S(x, y, z, 'light_blue_stained_glass'); return }
    if (ring2) { for (let y = 72; y <= 74; y++) S(x, y, z, 'sea_lantern'); return }                    // ... lit from behind,
                                                                     // and a glowing rim round the top (gas_top)
    // the soffit: blue, with long light panels over both lanes (4 lit, 2 dark, counted from the rim)
    const m = (((z - z1 - 1) % 6) + 6) % 6
    const lanes = ((x >= 408 && x <= 410) || (x >= 419 && x <= 421)) && m >= 1 && m <= 4
    S(x, 72, z, lanes ? 'sea_lantern' : 'blue_concrete')
    S(x, 73, z, 'blue_concrete')                                    // under the panels: mid blue from above (gas_top)
    S(x, 74, z, frame ? 'smooth_quartz' : 'light_blue_stained_glass') // the top: 4 glass panels, thin white dividers
  })
  // the spine beam under the soffit (y 71), teal, with downlights between the islands
  for (let z = z1 + 1; z <= z2 - 1; z++) for (const x of [414, 415]) S(x, 71, z, islandOf(414, z) === undefined ? 'sea_lantern' : 'cyan_concrete')
  // the pillars, teal, each opening into a V that carries the beam (gas_view0): the arms step out and up along the
  // canopy, y 69 one out, y 70 two out (air stays over the pump tops' light block, y 68, and the hose holsters, y 67)
  for (const p of PILLARS) {
    F(414, 65, p, 415, 70, p + 1, 'cyan_concrete')
    for (const [dz, y] of [[-1, 69], [-1, 70], [-2, 70], [2, 69], [2, 70], [3, 70]]) F(414, y, p + dz, 415, y, p + dz, 'cyan_concrete')
    F(414, 65, p, 415, 65, p + 1, 'light_blue_concrete')             // a pale plinth on the island
  }
}

// ---- the pump islands: purple pumps with a lit magenta head, a black screen and a hose; bins and bollards -----------
// the pumps' numbers (a label on both lane faces of each pump, over the island's rim): 1 the north pump and 2 the south
// pump of the north island, and so on south
const PUMP_LABELS = PILLARS.flatMap((p, i) => PUMP_Z.flatMap((dz, j) => [['west', 413.97], ['east', 416.03]].map(([facing, x]) => ({
  x, y: 65.58, z: p + dz + 0.5, facing, text: String(i * 2 + j + 1), color: '#ffffff', scale: 1.2 }))))
// A pump across the island (x 414..415) at z q, 3 high (Jailbreak's pumps are about a robber's height): a purple body with
// a small dark screen on each lane face (buttons: pressing one does nothing), a magenta head kept lit by a light block over
// it (a froglight read white, and a carpet cap is invisible from the lanes); its hose hangs in the gap g between the pump
// and the pillar (on the west half for the north pump, the east half for the south one).
function pump (q, g, hx) {
  F(414, 65, q, 415, 66, q, 'purple_concrete')                     // the body, purple top to bottom (gas_view0)
  S(413, 66, q, 'polished_blackstone_button[face=wall,facing=west,powered=false]') // the screens, one on each lane face
  S(416, 66, q, 'polished_blackstone_button[face=wall,facing=east,powered=false]') // (a full black course read as a band)
  F(414, 67, q, 415, 67, q, 'magenta_concrete')                    // the head
  F(414, 68, q, 415, 68, q, 'light[level=15,waterlogged=false]')   // its glow (air at y 69 under the canopy's V arms)
  S(hx, 65, g, 'iron_chain[axis=y]'); S(hx, 66, g, 'iron_chain[axis=y]') // the hose (on the island's stone)
  S(hx, 67, g, 'polished_blackstone_slab[type=bottom]')            // its holster
}
function islands () {
  for (const p of PILLARS) {
    pump(p - 2, p - 1, 414); pump(p + 3, p + 2, 415)
    // yellow bollards, thin posts a metre tall, guarding both tips' lane corners (a bamboo fence post stands alone: no
    // neighbour has a full side; concrete cubes read as 24 yellow boxes beside the pumps)
    for (const x of [ISLAND.x1, ISLAND.x2]) for (const z of [p - 3, p + 4]) S(x, 65, z, 'bamboo_fence[east=false,north=false,south=false,waterlogged=false,west=false]')
  }
  // a pair of lime bins at each end of the row, on their own curbed pads clear of the islands (gas_view0, gas_top: the
  // green bins stand at the row's ends; on an island tip they merged with the pump behind them into one box)
  for (const zc of [PILLARS[0] - 7, PILLARS[PILLARS.length - 1] + 8]) { // pads z 871..873 and 941..943
    rect(ISLAND.x1, zc - 1, ISLAND.x2, zc + 1, (x, z) => { S(x, 64, z, 'smooth_stone'); S(x, 65, z, 'smooth_stone_slab[type=bottom]') })
    for (const x of [414, 415]) { S(x, 65, zc, 'lime_concrete'); S(x, 66, zc, 'lime_concrete'); S(x, 67, zc, LID(x === 414 ? 'west' : 'east')) }
  }
}

// ---- the convenience store ---------------------------------------------------------------------------------------------
function storeShell () {
  const { x1, x2, z1, z2, zs } = STORE
  // the floor: white tiles, 2x2, in a quiet checker
  rect(x1 + 1, z1 + 1, x2 - 1, z2 - 1, (x, z) => S(x, 64, z, ((Math.floor((x - x1) / 2) + Math.floor((z - z1) / 2)) % 2) ? 'polished_diorite' : 'smooth_quartz'))
  // walls: light blue over a blue base course, blue corners and pilasters, the neon course on top (cyan glass, lit from
  // behind); the plain light blue flecked with powder (10%; every course over y 64 stands on a wall block, and the staff
  // door's bay x 379..381 gets none: its frame and lintel are set after)
  rect(x1, z1, x2, z2, (x, z) => {
    if (x !== x1 && x !== x2 && z !== z1 && z !== z2) return
    const top = topY(z)
    const corner = (x === x1 || x === x2) && (z === z1 || z === z2 || (x === x1 && z === zs))
    const pilaster = (x === x1 && PILASTERS.rear.includes(z)) || (z === z1 && PILASTERS.north.includes(x)) || (z === z2 && PILASTERS.south.includes(x))
    const fleck = x !== x2 && !(z === z1 && x >= 379 && x <= 381)
    for (let y = 64; y <= top; y++) {
      S(x, y, z, y === top ? 'light_blue_stained_glass' : y === 64 || corner || pilaster ? 'blue_concrete'
        : fleck && h(x, y, z) < 10 ? 'light_blue_concrete_powder' : 'light_blue_concrete')
    }
  })
  // the step between the two parts (z 904): a white bulkhead inside where the low ceiling (y 71) meets the high one (y 72);
  // the taller part's neon line on its roof edge over the north roof is storeRoof's
  for (let x = x1 + 1; x < x2; x++) { S(x, 72, zs, 'smooth_quartz'); S(x, 71, zs, 'smooth_quartz') }
  // the storefront (east, x 391): frosted lit windows between light blue piers (the end corners keep the dark trim), the
  // double door with a transom, and a white sign band over the door bay (y 70..71, under the canopy's sight line from Main:
  // the roof box is hidden behind the canopy from the street)
  for (let z = z1; z <= z2; z++) {
    const top = topY(z)
    // frosted glass as whole blocks (two faces of white tint read milky and lit, like convenience_store; a pane is one)
    for (let y = 65; y < top; y++) S(x2, y, z, z === z1 || z === z2 ? 'blue_concrete' : FRONT_PIERS.has(z) ? 'light_blue_concrete' : 'white_stained_glass')
  }
  F(x2, 70, 904, x2, 71, 911, 'smooth_quartz')
  door(DB, x2, 65, DOOR_Z[0], 'east', 'left', false, 'birch_door'); door(DB, x2, 65, DOOR_Z[1], 'east', 'right', false, 'birch_door')
  for (const z of DOOR_Z) S(x2, 67, z, 'light_blue_concrete')       // the transom bar
  // the grey staff door (north wall): an iron door in a grey frame, a little awning and a light over it, a stoop
  const [sx, , sz] = SIDE_DOOR
  door(DB, sx, 65, sz, 'north', 'left', false, 'iron_door')
  for (const x of [sx - 1, sx + 1]) F(x, 65, sz, x, 67, sz, 'light_gray_concrete')
  S(sx, 67, sz, 'light_gray_concrete'); S(sx, 68, sz, 'sea_lantern')
  F(sx - 1, 69, sz - 1, sx + 1, 69, sz - 1, 'polished_deepslate_slab[type=bottom]')
  F(sx - 1, 65, sz - 1, sx + 1, 65, sz - 1, 'smooth_stone_slab[type=bottom]')
  // the drop ceilings (y 71 north, y 72 south): white with lit panels, a cove of lanterns behind the neon all round
  rect(x1 + 1, z1 + 1, x2 - 1, z2 - 1, (x, z) => {
    if (z === zs) return                                           // the step's glass is the ceiling there
    const y = topY(z)
    const cove = x === x1 + 1 || x === x2 - 1 || z === z1 + 1 || z === z2 - 1 || z === zs + 1
    const panel = (x === 376 || x === 381 || x === 386) && (((z - z1) % 5) >= 1 && ((z - z1) % 5) <= 3)
    S(x, y, z, cove || panel ? 'sea_lantern' : 'smooth_quartz')
  })
}
// the roofs: dark slate, overhanging 1 (the neon line shows under the lip); rooftop units, vents and a hatch.
// Deepslate with a few blue concrete specks, a dark slate with a navy cast (convenience_store; no road blocks: PLAN 10.2):
// blue terracotta read purple-grey, alone and as specks
const ROOFMIX = [['polished_deepslate', 60], ['deepslate_tiles', 30], ['blue_concrete', 10]]
function storeRoof () {
  const { x1, x2, z1, z2, zs } = STORE
  rect(x1 - 1, z1 - 1, x2 + 1, z2 + 1, (x, z) => { const y = roofY(z); S(x, y, z, (x - x1) % 7 === 3 ? 'deepslate_tiles' : pick(x, y, z, ROOFMIX)) })
  // the taller part's neon line on its step edge (y 73, z 904) over the north roof: glass with lights right behind it
  for (let x = x1; x <= x2; x++) { S(x, 73, zs, 'light_blue_stained_glass'); S(x, 73, zs + 1, 'sea_lantern') }
  const unit = (ax, ay, az) => {                                    // an AC unit: a grey box with a fan grille on top
    F(ax, ay, az, ax + 2, ay + 1, az + 2, 'light_gray_concrete')
    F(ax, ay + 2, az, ax + 2, ay + 2, az + 2, LID('north'))
    F(ax - 1, ay, az + 1, ax - 1, ay, az + 1, 'iron_block')        // its duct into the roof
  }
  unit(374, roofY(889) + 1, 889); unit(374, roofY(914) + 1, 914); unit(374, roofY(921) + 1, 921)
  for (const z of [896, 898]) { S(384, roofY(z) + 1, z, 'polished_blackstone_wall'); S(384, roofY(z) + 2, z, 'polished_blackstone_slab[type=bottom]') } // vent stacks
  S(386, roofY(926) + 1, 926, LID('south'))                           // the roof hatch
  // the sign box on the south roof's front, over the door: a lit white face in a light blue frame ("24/7 MART"), seen
  // from the forecourt and the approach road; a light blue back plate keeps its lights off the north lot and 1st Street
  for (let z = 904; z <= 911; z++) for (let y = 74; y <= 77; y++) {
    const edge = z === 904 || z === 911 || y === 74 || y === 77
    S(x2, y, z, edge ? 'light_blue_concrete' : 'white_stained_glass')
    S(x2 - 1, y, z, edge ? 'light_blue_concrete' : 'sea_lantern')
  }
  F(x2 - 2, 75, 905, x2 - 2, 76, 910, 'light_blue_concrete')         // the back plate
  for (const z of [905, 910]) S(x2 - 2, 74, z, 'light_blue_concrete') // its feet
}

// ---- inside: fridges, aisles, the checkout, the lottery counter, coffee and slush -------------------------------------
const GOODS = ['red_terracotta', 'orange_terracotta', 'yellow_terracotta', 'lime_terracotta', 'light_blue_terracotta', 'white_terracotta',
  'magenta_terracotta', 'cyan_terracotta', 'brown_terracotta', 'red_wool', 'orange_wool', 'yellow_wool', 'lime_wool', 'light_blue_wool', 'white_wool']
const goods = (x, y, z) => GOODS[h(x, y, z) % GOODS.length]
const DRINKS = ['red_concrete', 'orange_concrete', 'lime_concrete', 'blue_concrete', 'yellow_concrete', 'white_concrete', 'brown_concrete', 'cyan_concrete']
// A low 2-deep shelf unit of lookalikes, 2.5 tall (a birch kick, a row of goods, a birch top), its end cells a red or
// orange promo card
function gondola (x1, z1, x2, z2) {
  const alongX = (x2 - x1) > (z2 - z1)
  rect(x1, z1, x2, z2, (x, z) => {
    const end = alongX ? (x === x1 || x === x2) : (z === z1 || z === z2)
    S(x, 65, z, 'stripped_birch_wood[axis=y]')
    S(x, 66, z, end ? (h(x, 66, z) < 50 ? 'red_concrete' : 'orange_concrete') : goods(x, 66, z))
    S(x, 67, z, 'birch_slab[type=bottom]')
  })
}
// Item displays (tag DISPLAY_TAG): two hot dogs on the roller grill behind the checkout.
const DISPLAYS = [914, 915].map(z => ({ x: 382.5, y: 66.3, z: z + 0.5, item: 'cooked_porkchop', cmd: null, yaw: 90, pitch: 90, scale: 0.4 }))
function inside () {
  // the fridge wall (x 371..372): drinks behind light blue glass doors in steel frames, lit from the top, a blue header
  // (y 70: right under the north part's ceiling, with a white bulkhead over it in the taller south part)
  for (let z = 893; z <= 928; z++) {
    const post = (z - 893) % 3 === 0 || z === 928, hd = FRIDGE_TOP(z)
    F(371, 65, z, 372, 65, z, 'light_gray_concrete')
    for (let y = 66; y <= hd - 2; y++) S(371, y, z, DRINKS[h(371, y, z) % DRINKS.length])
    S(371, hd - 1, z, 'sea_lantern')
    for (let y = 66; y <= hd - 1; y++) S(372, y, z, post ? 'iron_block' : 'light_blue_stained_glass')
    F(371, hd, z, 372, hd, z, 'blue_concrete')
    if (z >= STORE.zs) F(371, hd + 1, z, 372, hd + 1, z, 'smooth_quartz') // a bulkhead up to the south part's higher ceiling
  }
  // aisles: two units along x in the north part, four along z in the south part (a cross aisle at z 914..916)
  gondola(375, 894, 384, 895); gondola(375, 898, 384, 899)
  for (const x of [375, 379]) { gondola(x, 906, x + 1, 913); gondola(x, 917, x + 1, 926) }
  // the lottery counter (z 890): the till cell bare, slip stands and a scratch-card case on the other cells
  F(376, 65, 890, 384, 65, 890, 'smooth_quartz')
  S(376, 66, 890, 'quartz_slab[type=bottom]'); S(384, 66, 890, 'quartz_slab[type=bottom]')
  S(377, 66, 890, 'yellow_stained_glass'); S(383, 66, 890, 'lime_stained_glass')
  // behind it on the north wall: the lottery board (two rows of lit dispensers under a black header) over a back counter
  for (const [a, b] of [[372, 378], [382, 389]]) {
    F(a, 65, 886, b, 65, 886, 'smooth_quartz')
    for (let x = a; x <= b; x++) {
      S(x, 67, 886, ['yellow_concrete', 'lime_concrete', 'orange_concrete', 'light_blue_concrete', 'magenta_concrete'][h(x, 67, 886) % 5])
      S(x, 68, 886, ['red_concrete', 'yellow_concrete', 'lime_concrete', 'pink_concrete', 'light_blue_concrete'][h(x, 68, 886) % 5])
      S(x, 69, 886, 'polished_blackstone')
    }
  }
  // the checkout (x 386, z 912..919): the register's two cells bare (air above them), a card reader, the decorative
  // register, a candy tray; the half wall that closes the clerk's side to the south (jumpable); the way in is z 911
  F(COUNTER.x, 65, COUNTER.z1, COUNTER.x, 65, COUNTER.z2, 'smooth_quartz')
  S(386, 66, 912, 'quartz_slab[type=bottom]'); S(386, 66, 919, 'quartz_slab[type=bottom]')
  S(386, 66, 913, 'polished_blackstone_slab[type=bottom]')
  S(DECO_REGISTER[0], DECO_REGISTER[1], DECO_REGISTER[2], 'polished_blackstone'); S(386, 67, 916, 'lime_stained_glass_pane')
  S(386, 66, 918, 'red_wool')
  F(383, 65, 920, 386, 65, 920, 'smooth_quartz')
  F(383, 65, 913, 385, 65, 918, 'gray_carpet')                     // the clerk's mat
  // the back counter (x 382): coffee machine, the hot dog roller, a microwave, cups; a lit menu hung over it
  F(382, 65, 911, 382, 65, 920, 'smooth_quartz')
  S(382, 66, 912, 'iron_block'); S(382, 67, 912, 'polished_blackstone_slab[type=bottom]')
  F(382, 66, 914, 382, 66, 915, LID('east'))                     // the roller grill (DISPLAYS: its hot dogs)
  S(382, 66, 917, 'iron_block'); S(382, 66, 919, 'white_terracotta')
  for (const z of [912, 919]) S(382, 71, z, 'iron_chain[axis=y]')
  for (let z = 912; z <= 919; z++) { S(382, 70, z, 'polished_blackstone'); S(382, 69, z, (z % 2) ? 'pearlescent_froglight[axis=y]' : 'sea_lantern') }
  // coffee and slush along the south wall: three slush tanks, two coffee makers, cups and lids
  F(375, 65, 929, 388, 65, 929, 'smooth_quartz')
  for (const [x, s] of [[376, 'red_stained_glass'], [377, 'blue_stained_glass'], [378, 'lime_stained_glass']]) { S(x, 66, 929, s); S(x, 67, 929, 'iron_block') }
  for (const x of [381, 383]) { S(x, 66, 929, 'polished_blackstone'); S(x, 67, 929, 'polished_blackstone_slab[type=bottom]') }
  S(385, 66, 929, 'white_terracotta'); S(386, 66, 929, 'quartz_slab[type=bottom]'); S(387, 66, 929, LID('north'))
  F(375, 68, 929, 388, 68, 929, 'polished_blackstone')             // the menu strip over the counter
  // by the windows: a magazine rack, the ATM; the door mat
  for (let z = 913; z <= 918; z++) { S(390, 65, z, 'stripped_birch_wood[axis=y]'); S(390, 66, z, goods(390, 66, z)) }
  S(390, 65, 924, 'light_gray_concrete'); S(390, 66, 924, 'polished_blackstone'); S(390, 67, 924, 'light_gray_concrete')
  F(390, 65, DOOR_Z[0], 390, 65, DOOR_Z[1], 'gray_carpet')
  // a cooler of ice cream by the north aisle
  F(386, 65, 894, 388, 65, 895, 'white_concrete'); F(386, 66, 894, 388, 66, 895, 'light_blue_stained_glass')
}

// ---- outside the store: walks, bins, ice, propane, AC units -------------------------------------------------------------
function storeOutside () {
  for (const z of [903, 914]) { S(392, 65, z, 'gray_terracotta'); S(392, 66, z, LID('east')) } // bins by the door
  F(392, 65, 925, 392, 66, 928, 'smooth_quartz'); F(392, 67, 925, 392, 67, 928, 'light_blue_concrete') // the ice chest
  // the propane cage on the north walk: white tanks behind bars under a stone lid
  F(384, 65, 884, 387, 66, 884, 'white_terracotta'); F(384, 65, 883, 387, 66, 883, 'iron_bars')
  F(384, 67, 883, 387, 67, 884, 'smooth_stone_slab[type=bottom]')
  // AC condensers and a meter on the utility strip behind the store
  for (const z of [890, 919]) { F(367, 65, z, 368, 65, z + 1, 'light_gray_concrete'); F(367, 66, z, 368, 66, z + 1, LID('east')) }
  S(369, 65, 905, 'polished_blackstone_wall'); S(369, 66, 905, 'iron_block')
}

// ---- the lots: the dumpster corner, the air and vacuum island, the picnic lawn ------------------------------------------
function lots () {
  // the dumpster corner in the north lot, fenced on three sides (the back fence is the fourth), the gate east
  for (let x = 367; x <= 372; x++) for (const z of [868, 874]) { S(x, 65, z, 'dark_oak_fence'); S(x, 66, z, 'dark_oak_fence') }
  for (const z of [869, 873]) { S(372, 65, z, 'dark_oak_fence'); S(372, 66, z, 'dark_oak_fence') }
  F(367, 65, 869, 369, 66, 870, 'green_concrete'); F(367, 67, 869, 369, 67, 870, LID('east'))
  F(367, 65, 872, 368, 65, 873, 'blue_concrete'); F(367, 66, 872, 368, 66, 873, LID('east'))
  // the air and water machine (red) and the vacuum (yellow) on their island, a lamp between them
  S(381, 65, 944, 'red_concrete'); S(381, 66, 944, 'red_concrete'); S(381, 67, 944, 'polished_deepslate_slab[type=bottom]')
  S(381, 65, 945, 'iron_chain[axis=y]')
  S(384, 65, 944, 'yellow_terracotta'); S(384, 66, 944, 'yellow_terracotta'); S(384, 67, 944, 'polished_deepslate_slab[type=bottom]')
  S(384, 65, 945, 'iron_chain[axis=y]'); S(384, 66, 945, 'iron_chain[axis=y]')
  // the picnic lawn: two tables with benches, oaks, a bin
  for (const tz of [964, 976]) for (let x = 379; x <= 381; x++) {
    S(x, 65, tz, 'spruce_slab[type=top]')
    S(x, 65, tz - 1, 'spruce_stairs[facing=north,half=bottom]'); S(x, 65, tz + 1, 'spruce_stairs[facing=south,half=bottom]')
  }
  S(383, 65, 970, 'green_terracotta'); S(383, 66, 970, LID('north'))
  oak(S, 373, 961); oak(S, 387, 968); oak(S, 372, 977)
}

// ---- the price sign (SE corner, x 428..430, z 966..970, up to y 74) -----------------------------------------------------
// A tall light blue box on two posts: a blue header band ("GAS") over a lit white price screen, both faces (east to Main,
// west to the pumps); the digits are labels.
function priceSign () {
  const { x1, x2, z1, z2, y1, y2 } = SIGN
  rect(x1 - 1, z1 - 1, x2 + 1, z2 + 1, (x, z) => {                // its planter: a stone rim round flowers (planting())
    if (x >= x1 && x <= x2 && z >= z1 && z <= z2) return
    const corner = (x === x1 - 1 || x === x2 + 1) && (z === z1 - 1 || z === z2 + 1)
    S(x, 64, z, 'smooth_stone'); S(x, 65, z, corner ? 'oak_leaves[persistent=true]' : 'smooth_stone_slab[type=bottom]')
  })
  for (const z of [z1 + 1, z2 - 1]) F(x1 + 1, 65, z, x1 + 1, y1 - 1, z, 'light_blue_concrete') // the two posts
  for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) for (let y = y1; y <= y2; y++) {
    const face = x !== x1 + 1
    const rim = z === z1 || z === z2 || y === y1 || y === y2
    let s
    if (y === y2 - 1 && !rim) s = face ? 'blue_concrete' : 'light_blue_concrete'          // the header band
    else if (rim || y === y2 - 2) s = 'light_blue_concrete'                                 // the frame and its divider
    else s = face ? 'white_stained_glass' : 'sea_lantern'                                    // the lit price screen
    S(x, y, z, s)
  }
}

// ---- planting: the strips' shrubs and flowers, lamps, the corner oak ----------------------------------------------------
const FLOWERS = ['poppy', 'dandelion', 'cornflower', 'oxeye_daisy', 'allium']
function planting () {
  for (const x of [372, 388, 404, 418]) shrub(S, x, 865)              // 1st Street side (the lamp takes x 392)
  for (const x of [372, 386, 402, 416]) shrub(S, x, 985)              // 2nd Street side
  for (let z = 882; z <= 950; z += 8) if (z < 929 || z > 939) shrub(S, 431, z) // Main side (the footpath at z 932..936 stays clear)
  shrub(S, 431, 976)
  for (const x of [406, 416]) {                                       // the planted island south of the canopy: low hedges on
    F(x, 65, 966, x + 1, 65, 966, 'azalea_leaves[persistent=true]')   // its middle row only (z 965 and 967 are its curbs)
    S(x, 66, 966, 'flowering_azalea_leaves[persistent=true]')
  }
  oak(S, 427, 980)
  // grass clumps and flowers on the strips, the corner and the lawn's edges
  rect(BX[0] + 1, BX[1], BX[2], BX[3], (x, z) => {
    const g = ground(x, z)
    if ((g !== 'green' && g !== 'lawn') || B.get(x, 64, z) || B.get(x, 65, z) || B.get(x, 66, z)) return
    const bed = x >= SIGN.x1 && x <= SIGN.x2 && z >= SIGN.z1 && z <= SIGN.z2 // the sign's planter
    if (!bed && h(x >> 3, 9, z >> 3) >= 55) return
    const v = h(x, 65, z)
    if (bed) S(x, 65, z, FLOWERS[v % FLOWERS.length])
    else if (v < 3) { S(x, 65, z, 'tall_grass[half=lower]'); S(x, 66, z, 'tall_grass[half=upper]') } else if (v < 14) S(x, 65, z, 'short_grass')
    else if (v < 18) S(x, 65, z, FLOWERS[h(x, 66, z) % FLOWERS.length])
  })
  // the lamps alternate with the street module's: 1st Street's at x 372 and 412 (z 863), 2nd Street's at x 396 (z 988)
  streetLamp(S, 392, 866, 0, 1)                                        // over the north lot
  streetLamp(S, 425, 973, -1, 0)                                       // over the drive behind the price sign
  streetLamp(S, 411, 984, 0, -1)                                       // over the 2nd Street stalls
  streetLamp(S, 382, 947, 0, -1)                                       // the air island's light
}

// ---- the module ------------------------------------------------------------------------------------------------------------
module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  groundLayer(); canopy(); islands(); storeShell(); storeRoof(); inside(); storeOutside(); lots(); priceSign(); planting()
  B = null
  return b
}
// Text displays (tag LABEL_TAG): 3 decimals, 0.03 off the face they sit on; y = the text's bottom (one line at scale s
// is about 0.25 s tall).
const signFace = (x, facing) => [
  { x, y: 73.2, z: 968.5, facing, text: 'GAS', color: '#ffffff', scale: 2.4 },                   // the blue header band (y 73; the store's signs say 24/7 MART)
  { x, y: 70.95, z: 968.5, facing, text: 'REG     3.49', color: '#d81e1e', scale: 1.15 },        // the lit screen (y 69..71)
  { x, y: 70.15, z: 968.5, facing, text: 'PLUS    3.79', color: '#d81e1e', scale: 1.15 },
  { x, y: 69.35, z: 968.5, facing, text: 'DIESEL  3.99', color: '#d81e1e', scale: 1.15 }
]
module.exports.labels = [
  { x: 392.03, y: 75.625, z: 908.0, facing: 'east', text: '24/7 MART', color: '#0d47a1', scale: 3 },      // the roof sign (y 75..76)
  { x: 392.03, y: 70.7, z: 908.0, facing: 'east', text: '24/7 MART', color: '#0d47a1', scale: 2.4 },       // the sign band over the door (y 70..71)
  { x: 424.03, y: 73.44, z: 907.5, facing: 'east', text: 'FUEL', color: '#0a2a6e', scale: 4.5 },          // the canopy fascia's glowing band (Main, y 73..74; its middle z 907.5)
  { x: 393.03, y: 65.62, z: 927.0, facing: 'east', text: 'ICE', color: '#1e6fd0', scale: 1.6 },           // the ice chest
  { x: 386.0, y: 67.03, z: 882.97, facing: 'north', text: 'PROPANE', color: '#d32f2f', scale: 0.75 },     // the propane cage's lid
  { x: 380.5, y: 67.12, z: 884.97, facing: 'north', text: 'STAFF ONLY', color: '#ffffff', scale: 0.6 },   // over the side door
  { x: 389.97, y: 66.2, z: 924.5, facing: 'west', text: 'ATM', color: '#ffffff', scale: 0.9 },            // the ATM
  { x: 375.5, y: 69.325, z: 887.03, facing: 'south', text: 'LOTTERY', color: '#ffd54f', scale: 1.4 },     // the lottery boards' headers (y 69)
  { x: 386.0, y: 69.325, z: 887.03, facing: 'south', text: 'LOTTERY', color: '#ffd54f', scale: 1.4 },
  { x: 373.03, y: 70.375, z: 898.5, facing: 'east', text: 'COLD DRINKS', color: '#ffffff', scale: 1.0 },   // the fridges' header (y 70),
  { x: 373.03, y: 70.375, z: 916.5, facing: 'east', text: 'COLD DRINKS', color: '#ffffff', scale: 1.0 },   // one on each part (the south run z 904..928)
  { x: 377.5, y: 68.35, z: 928.97, facing: 'north', text: 'SLUSH', color: '#80d8ff', scale: 1.2 },        // the menu strip over the
  { x: 382.5, y: 68.35, z: 928.97, facing: 'north', text: 'COFFEE', color: '#ffcc80', scale: 1.2 },       // coffee counter
  { x: 383.03, y: 70.12, z: 916.0, facing: 'east', text: 'HOT FOOD  SNACKS', color: '#ffffff', scale: 0.9 }, // the clerk's menu
  { x: 381.5, y: 66.15, z: 943.97, facing: 'north', text: 'AIR', color: '#ffffff', scale: 0.9 },          // the air machine
  { x: 384.5, y: 66.15, z: 943.97, facing: 'north', text: 'VAC', color: '#202020', scale: 0.9 },          // the vacuum
  ...signFace(431.03, 'east'), ...signFace(427.97, 'west'),
  ...PUMP_LABELS
]
module.exports.displays = DISPLAYS
// The store's spots (PLAN 8.2). Loot cells are the blocks the loot lies on (y 65: the counter top is y 66).
module.exports.points = {
  GAS_EXIT: [397.5, 65, 907.5, -90],         // /dheist exit gas (the no-parking hatch in front of the door)
  GAS_HOLO: [392.5, 69.6, 907.5, -90],       // the hologram's own spot: /dheist holo gas 392.5 69.6 907.5 (given x y z,
                                             // nothing is added; its lines at 69.6, 69.3, 69.0 hang before the glass over the
                                             // transom, y 68..69, under the sign band, y 70: seen from Main under the canopy)
  GAS_REGISTER_A: [386, 65, 914, 0],
  GAS_REGISTER_B: [386, 65, 915, 0],
  GAS_LOTTERY_TILL: [380, 65, 890, 0],
  GAS_DOOR: [392.5, 65, 907.5, 90],          // outside the double door, facing in (GPS door node 1043)
  GAS_SIDEDOOR: [380.5, 65, 883.5, 0],       // outside the staff door (off its stoop), facing in
  GAS_FORECOURT: [402.5, 65, 953.5, 0]       // GPS node 1049 (the door's link on to Main passes south of the pumps and of
                                             // the south bin pad, z 941..943, and meets Main's strip on its footpath)
}
module.exports.setup = {
  regions: [{ id: 'heist_gas', box: [370, 63, 885, 391, 75, 930], flags: ['passthrough allow'],
    note: 'store; the convenience store building only, floor to just over the roofs (the roof sign over y 75 and the overhangs stay out)' }],
  heists: [{
    id: 'gas', difficulty: 0, name: 'Gas Station', exit: [397.5, 65, 907.5, -90], holo: [392.5, 69.6, 907.5],
    holoCmd: 'dheist holo gas 392.5 69.6 907.5', // the hologram's own location (not a spot to stand on)
    snapshot: 'with the front doors (391, 65, 907..908) and the staff door (380, 65, 885) closed',
    loot: [
      { name: 'Register', cells: [386, 65, 914, 386, 65, 915], value: '1500-2400', style: 'register',
        cmd: 'dloot add gas pile 386 65 914 386 65 915 value=1500-2400 style=register name=Register' },
      { name: 'Lottery_till', cells: [380, 65, 890, 380, 65, 890], value: '300-600', style: 'register',
        cmd: 'dloot add gas pile 380 65 890 380 65 890 value=300-600 style=register name=Lottery_till' }
    ]
  }],
  keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], pois: [], walls: [], holos: []
}
module.exports.build = () => module.exports()

// ---- previews (node tools/build/town/gas.js --render <dir>) ---------------------------------------------------------------
// The preview adds the world's grass and the streets round the box (Main's west half, 1st and 2nd Street's sidewalks),
// never part of the build itself. render.js has no texture for smooth quartz: the preview draws it as quartz block.
function previewBuild () {
  const { Build } = require('../mcstruct')
  const b = module.exports()
  const p = new Build()
  for (let x = BX[0] - 4; x <= 462; x++) for (let z = BX[1] - 8; z <= BX[3] + 8; z++) {
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
// An orthographic side view: face = where the viewer stands (east = looking west at the canopy and the storefront).
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
if (require.main === module) {
  const args = process.argv.slice(2)
  const ri = args.indexOf('--render')
  const b = module.exports()
  const bb = b.bounds()
  console.log(`gas: ${b.blocks.size} blocks, box ${bb.x1},${bb.y1},${bb.z1} to ${bb.x2},${bb.y2},${bb.z2}; ${module.exports.labels.length} labels, ${module.exports.displays.length} displays`)
  if (ri >= 0) {
    const fs = require('fs'), path = require('path')
    const R = require('../render')
    const dir = args[ri + 1] || path.join(__dirname, 'renders', 'gas')
    fs.mkdirSync(dir, { recursive: true })
    const save = (name, img) => { const f = path.join(dir, `${name}.png`); fs.writeFileSync(f, img.png()); console.log(`wrote ${f} (${img.w}x${img.h})`) }
    const p = previewBuild()
    save('top', R.top(p, 5))
    for (const y of [65, 66, 72]) save(`plan-y${y}`, R.plan(sub(p, BX[0], BX[1], BX[2], BX[3]), y, 6))
    for (const d of ['NE', 'SE', 'SW', 'NW']) save(`iso-${d}`, R.iso(p, d, 4))
    const store = sub(p, 362, 876, 400, 940, 60)
    for (const d of ['NE', 'SE', 'NW']) save(`store-iso-${d}`, R.iso(store, d, 9))
    for (const d of ['NE', 'SE']) save(`front-iso-${d}`, R.iso(sub(p, 378, 880, 402, 936, 60), d, 14)) // the storefront close
    const cut = sub(p, 366, 880, 396, 935, 60, 70) // the roof and ceilings off: the rooms
    for (const d of ['NE', 'SE', 'SW']) save(`cut-${d}`, R.iso(cut, d, 12))
    const pumps = sub(p, 400, 870, 432, 948, 60)
    for (const d of ['NE', 'SW']) save(`canopy-iso-${d}`, R.iso(pumps, d, 9))
    save('canopy-under-NE', R.iso(sub(p, 404, 872, 426, 916, 60, 71), 'NE', 14)) // the canopy off: pumps and pillars
    save('sign-iso-SE', R.iso(sub(p, 420, 958, 434, 986, 60), 'SE', 14))
    for (const fc of ['east', 'south', 'north', 'west']) save(`elev-${fc}`, elevation(sub(p, 364, 862, 434, 988, 63), fc, 10))
  }
}
