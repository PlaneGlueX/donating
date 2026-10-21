'use strict'
// land: every town column (z >= 729) that no other module owns (tools/build/town/PLAN.md section 5): the river's west
// branch and its bend, the lake and its beach, the hills (E1..E5, T1, W1, W2, S1) as closed shells, the three wind
// turbines, the water tower and its stair path, a satellite dish on E3 (the brief's optional landmark), Riverside Park
// (paths, benches, the pier, oaks), the beach (umbrellas, deckchairs, a lifeguard stand, palms), a meadow pond by the
// water tower hill (the brief's other optional landmark), the orange ground patches, pines, oaks and grass. Region:
// x 120..770, z 729..1300, y 50..160, only where ownerOf(x, z) is 'land'. Exports biomes (warm ocean for its water).
//   node tools/build/town/land.js                     the block count and bounds
//   node tools/build/town/land.js --render [dir]      preview PNGs (default tools/build/town/renders/land/)
//     [--only top,wide,tower,turbine,park,beach,east,west,dish,pond] [--crop name:x1,z1,x2,z2[:scale[:y1]]]
// Nothing here pastes or talks to the server.
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

// ---------------------------------------------------------------------------------------------------------------------
// land (PLAN.md section 5)
const MOD = 'land'
const own = ownFor(MOD)
let B = null
const S = (x, y, z, s) => { if (own(x, y, z)) B.set(x, y, z, s) }
const G = (x, y, z) => B.get(x, y, z)
const DS = { set: S } // for COMMON's door(), which calls b.set
const R = { x1: TOWN.x1, z1: TOWN_Z, x2: TOWN.x2, z2: TOWN.z2 } // every land column lies in here

const LW = R.z2 - R.z1 + 1
const LAND = new Int8Array((R.x2 - R.x1 + 1) * LW) // 0 unknown, 1 not land, 2 land
const isLand = (x, z) => {
  if (x < R.x1 || x > R.x2 || z < R.z1 || z > R.z2) return false
  const i = (x - R.x1) * LW + (z - R.z1)
  if (!LAND[i]) LAND[i] = ownerOf(x, z) === MOD ? 2 : 1
  return LAND[i] === 2
}
const kept = (x, z) => inBox(x, z, KEEP_FREE) // plain grass only (the volcano's site, the future north-west road)
const ground = (x, z) => 64 + groundTop(x, z) // a dry column's top block
// Plants and trees: only into cells nothing took yet, above the column's ground (never into a hill, the river's cleared
// air or another module's columns).
const P = (x, y, z, s) => { if (isLand(x, z) && !G(x, y, z) && y > ground(x, z)) S(x, y, z, s) }
// A footprint is clear for something reaching r blocks out: every column land, none kept free.
const roomFor = (x, z, r) => {
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (!isLand(x + dx, z + dz) || kept(x + dx, z + dz)) return false
  return true
}
const rnd = (x, z, salt) => h(x, salt, z) * 100 + h(x, salt + 1, z) // 0..9999
// Smooth value noise (0..1), so patches hang together instead of a per-block sprinkle.
const vnoise = (x, z, cell, salt) => {
  const gx = Math.floor(x / cell), gz = Math.floor(z / cell), fx = x / cell - gx, fz = z / cell - gz
  const v = (i, j) => h(gx + i, salt, gz + j) / 99, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz)
  return (v(0, 0) * (1 - sx) + v(1, 0) * sx) * (1 - sz) + (v(0, 1) * (1 - sx) + v(1, 1) * sx) * sz
}
const patch = (x, z, salt) => 0.55 * vnoise(x, z, 20, salt) + 0.3 * vnoise(x, z, 8, salt + 1) + 0.15 * vnoise(x, z, 3, salt + 2)
// Jailbreak's orange ground is one flat colour per patch (town_2025, town_view_to_volcano), so the material is picked per
// 9-block blob, not per block: mostly red sand, some patches of orange terracotta (no coarse dirt: it read as brown
// spots), and orange terracotta on a real cliff's rim, where it joins the cliff's bands.
const orangeMat = (x, z, cliff = false) => cliff || vnoise(x, z, 9, 77) > 0.74 ? 'orange_terracotta' : 'red_sand'

// ---- landmarks the trees keep away from --------------------------------------------------------------------------
const TURBINES = [[660, 800], [700, 870], [715, 985]] // E1, E2, E4: the peaks; the tower is x cx-1..cx, z cz-1..cz
const DISH = [650, 930] // a satellite dish on E3's top (town_view1: the big dish on a hill beside the town)
// no tree whose trunk or canopy (radius 4) would stand in the pond or on its shore
const nearPond = (x, z) => x >= POND_BOX[0] - 5 && x <= POND_BOX[2] + 5 && z >= POND_BOX[1] - 5 && z <= POND_BOX[3] + 5 &&
  [-4, -2, 0, 2, 4].some(dx => [-4, -2, 0, 2, 4].some(dz => pondAt(x + dx, z + dz)))
const NO_TREES = [[500, 1186, 22], ...TURBINES.map(([x, z]) => [x, z, 9]), [...DISH, 24]] // [x, z, radius]
const nearMark = (x, z) => NO_TREES.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) ||
  (x >= STAIRS[0] - 5 && x <= STAIRS[2] + 5 && z >= STAIRS[1] - 2 && z <= STAIRS[3] + 2)

// ---- the river, the lake and the beach (3.5's rules) ----------------------------------------------------------------
const nearBeach = (x, z) => x + 0.5 > LAKE.cx - 14 && z + 0.5 > LAKE.cz - 34
function waterColumn (x, z, r) {
  S(x, r.bed, z, nearBeach(x, z) ? 'sand' : pick(x, r.bed, z, MIX.riverbed))
  for (let y = r.bed + 1; y <= WATER_Y; y++) S(x, y, z, 'water')
  for (let y = WATER_Y + 1; y <= 64; y++) S(x, y, z, 'air')
}
// riverAt's beach stops on two straight lines (x 182 on the south shore, z 1210 on the east shore), where the bank's
// steeper climb meets the beach's flat one: a step of up to 2 and sand flipping to orange. Within about 10 blocks of
// each cut the bank side is sand too, tapering from the beach's 14-block width to the bank's 6 (ragged by noise), and
// boulders (beachRocks) hide the step itself. d = the distance from the cut on the bank side, null off those shores.
const cutD = (x, z) => {
  if (z + 0.5 > LAKE.cz && x + 0.5 <= LAKE.cx - 10) return LAKE.cx - 10 - (x + 0.5) + 0.5 // south shore, west of x 182
  if (x + 0.5 > LAKE.cx && z + 0.5 <= LAKE.cz - 30) return LAKE.cz - 30 - (z + 0.5) + 0.5 // east shore, north of z 1210
  return null
}
const beachFade = (x, z) => {
  const d = cutD(x, z)
  if (d === null || d > 12) return false
  return lakeE(x + 0.5, z + 0.5) <= BEACH - 1.3 * d + 2.5 * (vnoise(x, z, 4, 95) - 0.5) // 14 wide at the cut, gone by d 10
}
// The bank, as approach.js builds its own (one rule on both sides of z 728/729): sand at the water's edge (y 61),
// Jailbreak's solid orange rim above it (y 62..63: BANK_RIM, no coarse dirt), and grass on top, the lip (a y-64 cell
// beside the water or a lower bank cell) red sand, so the rim reads as one orange line from the town. Under the bank and
// the beach the water's sides are sand down to y 56 (the deepest water's bottom), not the world's stone (a grey ring
// round the turquoise water). The beach is sand right through, with streaks of red sand (town_2025).
const BANK_RIM = [['red_sand', 80], ['orange_terracotta', 20]]
const beachStreak = (x, z) => vnoise(x * 3, z, 14, 96) > 0.7 && vnoise(x, z, 9, 97) > 0.45 // long thin streaks along z
function bankColumn (x, z, r) {
  for (let y = 56; y < r.top && y <= WATER_Y; y++) S(x, y, z, 'sand')
  if (r.beach) {
    for (let y = 61; y < r.top; y++) S(x, y, z, 'sand')
    S(x, r.top, z, r.top >= 62 && beachStreak(x, z) ? 'red_sand' : 'sand')
  } else {
    const lip = r.top === 64 && NB.some(([dx, dz]) => { const n = riverAt(x + dx, z + dz); return n && (n.water || n.top < 64) })
    S(x, r.top, z, beachFade(x, z) || r.top <= 61 ? 'sand' : r.top <= 63 ? pick(x, r.top, z, BANK_RIM) : lip ? 'red_sand' : 'grass_block')
  }
  for (let y = r.top + 1; y <= 64; y++) S(x, y, z, 'air')
}

// ---- the meadow pond (the brief's optional pond, town_view1: a blob of water in the grass with the water tower beside
// it), in the open meadow south-east of T1 (x 540..584, z 1248..1278: flat, 30+ from any street, box or the volcano's
// site). Two overlapping ellipses with a ragged edge; its own water level, y 63, one under the meadow (the river's and
// the lake's is y 60): every water block has the world's dirt or more water beside it at its level, so nothing flows.
const POND = { lobes: [[556, 1260, 15, 9], [572, 1268, 9, 7]], top: 63 } // [cx, cz, rx, rz]
// The pond's d: < 0 in the water (more negative toward the middle), 0..0.3 its shore, > 0.3 the meadow.
const pondD = (x, z) => {
  let d = Infinity
  for (const [cx, cz, rx, rz] of POND.lobes) d = Math.min(d, Math.hypot((x + 0.5 - cx) / rx, (z + 0.5 - cz) / rz) - 1)
  return d + 0.22 * (vnoise(x, z, 5, 91) - 0.5) // a ragged, natural edge
}
const POND_BOX = [533, 1246, 587, 1280] // every column pondD can reach below 0.3
// A column of the pond: { water, bed } in the water, { shore } on the sand ring level with the water (top y 63, air
// above), { lip } on a ragged red-sand ring at meadow height, or null.
const pondAt = (x, z) => {
  if (!inBox(x, z, [POND_BOX])) return null
  const d = pondD(x, z)
  if (d < 0) return { water: true, bed: POND.top - 1 - Math.min(2, Math.floor(-d * 7)) } // 1..3 deep
  if (d < 0.1 || NB.some(([dx, dz]) => pondD(x + dx, z + dz) < 0)) return { shore: true }
  if (d < 0.3 && vnoise(x, z, 4, 92) > 0.42) return { lip: true }
  return null
}
function pondColumn (x, z, p) {
  if (p.water) {
    S(x, p.bed, z, pick(x, p.bed, z, [['sand', 45], ['clay', 30], ['gravel', 25]])) // on the world's dirt or stone
    for (let y = p.bed + 1; y <= POND.top; y++) S(x, y, z, 'water')
    S(x, 64, z, 'air')
  } else if (p.shore) { S(x, POND.top, z, h(x, 93, z) < 70 ? 'sand' : 'red_sand'); S(x, 64, z, 'air') } // on the world's dirt
  else S(x, 64, z, 'red_sand')
}

// ---- the water tower's stair path (COMMON's STAIRS: built solid, its own even climb) ------------------------------
function stairColumn (x, z) {
  const t = groundTop(x, z)
  if (t <= 0) { S(x, 64, z, 'smooth_stone'); return } // the foot of the path, level with Hill Road's sidewalk
  for (let y = 65; y < 64 + t; y++) S(x, y, z, pick(x, y, z, MIX.stonebrick))
  // a step wherever the column north of it is lower: stairs facing south (walking up the slope, southward)
  S(x, 64 + t, z, groundTop(x, z - 1) < t ? 'stone_brick_stairs[facing=south,half=bottom]' : 'smooth_stone')
  // Every 8 blocks a diorite_wall post with a lantern on the path's edge, on alternate sides (z 1133 west, 1141 east,
  // ...), so the path never narrows below 2 and is lit at night. A railing where the ground beside the path (the hill or
  // a berm) drops 2 or more: an iron trapdoor standing open against the path's outer edge (nobody can open it by hand),
  // so all 3 blocks stay walkable. (With the berms that's nowhere on the current hill.)
  if (x === STAIRS[0] || x === STAIRS[2]) {
    const west = x === STAIRS[0], side = west ? x - 1 : x + 1
    const row = (z - STAIRS[1]) % 8 === 4, post = row && ((z - STAIRS[1] - 4) / 8) % 2 === (west ? 0 : 1)
    if (post) { S(x, 65 + t, z, 'diorite_wall'); S(x, 66 + t, z, 'lantern[hanging=false]') }
    else if (Math.max(groundTop(side, z), bermTop(side, z)) <= t - 2) S(x, 65 + t, z, `iron_trapdoor[facing=${west ? 'east' : 'west'},half=bottom,open=true]`)
  }
}
// The path climbs faster than T1's flank at its foot (z 1131..1152: up to 3 over the ground beside it), which left a
// stone-brick causeway with bare sides. Grass berms beside it (3 columns a side) step down 1 a block from the path's
// height, built solid from y 65 wherever that's over the ground there: bermTop = the berm's height over 64, else 0.
const bermTop = (x, z) => {
  if (z < STAIRS[1] || z > STAIRS[3]) return 0
  const d = x < STAIRS[0] ? STAIRS[0] - x : x > STAIRS[2] ? x - STAIRS[2] : 0
  if (d < 1 || d > 3 || !isLand(x, z)) return 0
  const bt = groundTop(STAIRS[0], z) - d
  return bt > groundTop(x, z) ? bt : 0
}
function stairBerms () {
  rect(STAIRS[0] - 3, STAIRS[1], STAIRS[2] + 3, STAIRS[3], (x, z) => {
    const bt = bermTop(x, z)
    if (!bt) return
    for (let y = 65; y < 64 + bt; y++) S(x, y, z, 'dirt')
    S(x, 64 + bt, z, 'grass_block')
  })
}

// ---- hills: COMMON's hill() and, on top, Jailbreak's orange slopes ---------------------------------------------------
// Ragged orange blobs on the hills, stretched along a random direction (eroded slopes).
const hillOrange = (x, z) => {
  const Q = 22, gx = Math.floor(x / Q), gz = Math.floor(z / Q)
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const cx = gx + i, cz = gz + j
    if (h(cx, 21, cz) >= 42) continue
    const ox = cx * Q + h(cx, 22, cz) % Q, oz = cz * Q + h(cx, 23, cz) % Q, r = 3 + h(cx, 24, cz) % 8
    const a = h(cx, 25, cz) * Math.PI / 50, ca = Math.cos(a), sa = Math.sin(a)
    const u = (x - ox) * ca + (z - oz) * sa, v = (-(x - ox) * sa + (z - oz) * ca) * 2.2
    if (Math.hypot(u, v) < r + (h(x, 26, z) % 3) - 1) return true
  }
  return false
}
// The terrace a column sits on: the domes' height, even above 10, as groundCalc rounds it (before its clamps). Two
// columns on the same terrace that still differ by 2 were cut by a clamp (dryD, builtD, the box's edge). Steps between
// terraces are the hill's real terraces, and keep hillColumn's orange cliff bands. (groundTop had a patchy +-1 until
// 2026-10-20, which made 2-high bumps on the crowns; COMMON dropped it, so the bump rule below seldom applies now.)
const terrace = (x, z) => {
  let t = 0
  for (const p of RIDGE) t = Math.max(t, dome(x, z, p))
  for (const p of HILLS) t = Math.max(t, dome(x, z, p))
  return t > 10 ? t - t % 2 : t
}
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]]
// The surface of a hill column after hill() built it (its height never changes; only the blocks of its top and its
// exposed sides): grass or a coherent orange patch on top (no per-block speckle). A 2-high side that isn't a real
// cliff is dressed in the top's own material (moss under grass: grass under a block turns to dirt), so the hills read
// as Jailbreak's smooth green slopes instead of topo-map rings:
//   - a bump: a 2-step between columns of the same terrace (a clamp's edge);
//   - a gentle terrace's edge: 2 down onto a terrace at least 3 wide (the next step down is 3+ blocks on).
// Only a real cliff (steps bunched together along a stretch, or one step of 3+) keeps hillColumn's banded side; a lone
// bunched column on a terrace's edge (no banded neighbour) would only be a speck, so it's dressed too.
const minNb = (x, z) => Math.min(...NB.map(([dx, dz]) => groundTop(x + dx, z + dz)))
const bunched = (x, z) => { // a 2+ step that's neither a bump nor a gentle terrace's edge (pure: heights only)
  const t = groundTop(x, z), n = minNb(x, z)
  if (t - n < 2) return false
  if (t - n > 2) return true
  const ring = terrace(x, z)
  if (NB.every(([dx, dz]) => groundTop(x + dx, z + dz) >= t || terrace(x + dx, z + dz) === ring)) return false // a bump
  return !NB.every(([dx, dz]) => groundTop(x + dx, z + dz) !== n || // not a gentle edge
    (groundTop(x + 2 * dx, z + 2 * dz) >= n && groundTop(x + 3 * dx, z + 3 * dz) >= n))
}
// A real cliff's rim (keeps its bands), or a 2-high side dressed in the top's material (a bump, a gentle edge or a lone
// bunched column).
const sideOf = (x, z) => {
  const t = groundTop(x, z), n = minNb(x, z)
  const cliff = bunched(x, z) && (t - n > 2 || NB.some(([dx, dz]) => bunched(x + dx, z + dz)))
  return { cliff, dress: t - n === 2 && !cliff }
}
function hillTop (x, z) {
  const t = groundTop(x, z), top = 64 + t
  if (!G(x, top, z)) return
  const { cliff, dress } = sideOf(x, z)
  // orange in coherent patches, more of it on real cliffs' rims and around the hill's foot (Jailbreak's eroded slopes)
  const orange = hillOrange(x, z) || patch(x, z, 70) > 0.64 - (cliff ? 0.08 : 0) - (t <= 3 ? 0.06 : 0)
  let m = orange ? orangeMat(x, z, cliff) : 'grass_block'
  if (m === 'red_sand' && !G(x, top - 1, z)) m = 'orange_terracotta' // never sand over the hollow inside
  S(x, top, z, m)
  if (dress) S(x, top - 1, z, orange ? m : 'moss_block') // stands on the shell below (hillColumn builds to minN - 2)
}
// The future north-west road (KEEP_FREE[1]) counts as built for builtD; inside it, how far the nearest real street or
// box is (1, 2, or 3 for farther), so its grass can be dressed lightly too.
const inNW = (x, z) => inBox(x, z, [KEEP_FREE[1]])
const freeD = (x, z) => {
  if (!inNW(x, z)) return builtD(x, z)
  for (let d = 1; d <= 2; d++) for (const [dx, dz] of NB) { const o = ownerOf(x + dx * d, z + dz * d); if (o && o !== MOD) return d }
  return 3
}
// The orange verge along the sidewalks (Jailbreak's thin orange strip outside every sidewalk: town_view_to_prison_tunnel,
// town_view_to_volcano): red sand on the 2 columns beside the street network, in ragged stretches, never in front of a
// driveway, in the park or on the kept-free ground. On by default; TOWN_VERGE=0 leaves those 2 columns grass (PLAN 5's
// old rule).
const VERGE = process.env.TOWN_VERGE !== '0'
const verge = (x, z) => !inPark(x, z) && !kept(x, z) && vnoise(x, z, 7, 88) > 0.3 &&
  NB.some(([dx, dz]) => [1, 2].some(d => ownerOf(x + dx * d, z + dz * d) === 'streets' && !inDriveway(x + dx * d, z + dz * d)))
// Flat ground (the world's own grass): orange patches, an orange fringe along the banks and around the hills' feet,
// sand where the beach tapers out beside its cuts. The volcano's site gets the same ground (nothing tall is planted
// there); the north-west strip only the rarer blobs.
function flatColumn (x, z) {
  if (beachFade(x, z)) { S(x, 64, z, 'sand'); return }
  const nw = inNW(x, z)
  if (freeD(x, z) <= 2) { if (VERGE && !nw && verge(x, z)) S(x, 64, z, 'red_sand'); return }
  const hillNext = groundTop(x + 1, z) > 0 || groundTop(x - 1, z) > 0 || groundTop(x, z + 1) > 0 || groundTop(x, z - 1) > 0
  const p = patch(x, z, 80)
  const bank = dryD(x, z) < 3 && p > 0.47 // an orange fringe along the banks
  const o = inPark(x, z) ? bank : nw ? orangeAt(x, z) : orangeAt(x, z) || bank || (hillNext && p > 0.52) || p > 0.72 // the park is a lawn
  if (o) S(x, 64, z, orangeMat(x, z))
}

function terrain () {
  for (let x = R.x1; x <= R.x2; x++) for (let z = R.z1; z <= R.z2; z++) {
    if (!isLand(x, z)) continue
    const r = riverAt(x, z)
    if (r) { if (r.water) waterColumn(x, z, r); else bankColumn(x, z, r); continue }
    if (inBox(x, z, [STAIRS])) { stairColumn(x, z); continue }
    const p = pondAt(x, z)
    if (p) { pondColumn(x, z, p); continue }
    if (hill(S, x, z)) { hillTop(x, z); continue }
    flatColumn(x, z)
  }
}

// ---- the orange ground's clean-up (after terrain() and park(): the tops of the dry land, flat and hill alike) ---------
// The patch rules leave specks where their edges fray (orangeAt's per-block jitter, the bank fringe, a patch's threshold),
// and the park's paths cut the bank's fringe into more; the landmarks' pads count as neither (they stop a piece).
// Jailbreak has fewer, bigger patches (town_view1, town_view_to_volcano), so an orange piece of 6 cells or fewer
// (4-connected) goes back to grass, and a grass hole of 4 cells or fewer with orange all round it turns orange. The
// river's banks, the stairs, the pond (all but its red-sand lip) and anything not grass or orange (sand, paths) are left
// alone and count as neither.
const ORANGE = new Set(['red_sand', 'orange_terracotta', 'coarse_dirt'])
const SPECK = 6, HOLE = 4
function cleanOrange () {
  const D = R.z2 - R.z1 + 1, kind = new Int8Array((R.x2 - R.x1 + 1) * D) // 0 neither, 1 grass, 2 orange
  const at = (x, z) => x < R.x1 || x > R.x2 || z < R.z1 || z > R.z2 ? 0 : kind[(x - R.x1) * D + (z - R.z1)]
  const topOf = (x, z) => { const s = G(x, ground(x, z), z); return s === undefined ? (groundTop(x, z) ? null : 'grass_block') : s.replace(/\[.*$/, '') }
  for (let x = R.x1; x <= R.x2; x++) for (let z = R.z1; z <= R.z2; z++) {
    if (!isLand(x, z) || riverAt(x, z) || inBox(x, z, [STAIRS]) || (pondAt(x, z) && !pondAt(x, z).lip)) continue
    const s = topOf(x, z)
    kind[(x - R.x1) * D + (z - R.z1)] = s === 'grass_block' ? 1 : ORANGE.has(s) ? 2 : 0
  }
  const pieces = k => { // every 4-connected piece of kind k: its cells and whether only orange borders it
    const seen = new Uint8Array(kind.length), out = []
    for (let i = 0; i < kind.length; i++) {
      if (kind[i] !== k || seen[i]) continue
      const cells = [], st = [i]; let ringOrange = true; seen[i] = 1
      while (st.length) {
        const j = st.pop(), x = R.x1 + Math.floor(j / D), z = R.z1 + j % D
        cells.push([x, z])
        for (const [dx, dz] of NB) {
          const q = at(x + dx, z + dz)
          if (q !== k) { if (q !== 2) ringOrange = false; continue }
          const jj = (x + dx - R.x1) * D + (z + dz - R.z1)
          if (!seen[jj]) { seen[jj] = 1; st.push(jj) }
        }
      }
      out.push({ cells, ringOrange })
    }
    return out
  }
  for (const { cells } of pieces(2)) if (cells.length <= SPECK) for (const [x, z] of cells) { // specks back to grass
    const y = ground(x, z)
    kind[(x - R.x1) * D + (z - R.z1)] = 1
    if (y === 64) { B.blocks.delete(`${x},64,${z}`); continue } // the world's own grass
    S(x, y, z, 'grass_block')
    if (sideOf(x, z).dress && ORANGE.has((G(x, y - 1, z) || '').replace(/\[.*$/, ''))) S(x, y - 1, z, 'moss_block')
  }
  for (const { cells, ringOrange } of pieces(1)) if (cells.length <= HOLE && ringOrange) for (const [x, z] of cells) { // holes filled
    const y = ground(x, z), near = {}
    for (const [dx, dz] of NB) if (at(x + dx, z + dz) === 2) { const m = topOf(x + dx, z + dz); near[m] = (near[m] || 0) + 1 }
    let m = Object.keys(near).sort((a, c) => near[c] - near[a])[0]
    if (m === 'coarse_dirt') m = 'red_sand'
    const side = y > 64 && sideOf(x, z).dress && G(x, y - 1, z) === 'moss_block'
    if (m === 'red_sand' && y > 64 && !G(x, y - 1, z)) m = 'orange_terracotta' // never sand over the hollow inside
    S(x, y, z, m)
    if (side) S(x, y - 1, z, m === 'red_sand' && !G(x, y - 2, z) ? 'orange_terracotta' : m)
  }
}

// ---- water life: lily pads by the banks, seagrass in the deeper water ------------------------------------------------
function waterLife () {
  for (let x = R.x1; x <= R.x2; x++) for (let z = R.z1; z <= R.z2; z++) {
    if (!isLand(x, z)) continue
    const r = riverAt(x, z)
    if (!r || !r.water) continue
    const v = rnd(x, z, 40)
    if (r.bed === WATER_Y - 2 && v < 70 && !nearBeach(x, z)) S(x, WATER_Y + 1, z, 'lily_pad')
    else if (r.bed <= WATER_Y - 4 && v >= 9600) {
      if (r.bed <= WATER_Y - 5 && v >= 9900) { S(x, r.bed + 1, z, 'tall_seagrass[half=lower]'); S(x, r.bed + 2, z, 'tall_seagrass[half=upper]') }
      else S(x, r.bed + 1, z, 'seagrass')
    }
  }
  // the pond: lily pads on its deeper water, reeds (tall grass) in clumps round its shore on the meadow side
  rect(POND_BOX[0], POND_BOX[1], POND_BOX[2], POND_BOX[3], (x, z) => {
    const p = pondAt(x, z), v = rnd(x, z, 94)
    if (p && p.water && p.bed <= POND.top - 2 && v < 600) S(x, POND.top + 1, z, 'lily_pad')
    else if (!p && isLand(x, z) && G(x, 64, z) === undefined && NB.some(([dx, dz]) => { const q = pondAt(x + dx, z + dz); return q && !q.water }) && vnoise(x, z, 3, 95) > 0.45) {
      S(x, 65, z, 'tall_grass[half=lower]'); S(x, 66, z, 'tall_grass[half=upper]')
    }
  })
}

// ---- the water tower (current look: lime, PLAN 5) --------------------------------------------------------------------
// On T1's flat top (ground y 84). Its centre is the point (500, 1186), a block corner, so everything is symmetric.
function waterTower () {
  const cx = T1_TOP.cx, cz = T1_TOP.cz, g = 64 + T1_TOP.h, NAVY = 'blue_concrete'
  const disc = (rmin, rmax, fn) => {
    for (let x = cx - 11; x <= cx + 10; x++) for (let z = cz - 11; z <= cz + 10; z++) {
      const r = Math.hypot(x + 0.5 - cx, z + 0.5 - cz)
      if (r > rmin && r <= rmax) fn(x, z, r)
    }
  }
  // a concrete pad under it, and the walk from the top of the stairs
  disc(-1, 9.4, (x, z) => S(x, g, z, (x + z) % 7 === 0 ? 'polished_andesite' : 'smooth_stone'))
  for (let z = STAIRS[3] + 1; z <= cz - 9; z++) for (let x = STAIRS[0]; x <= STAIRS[2]; x++) S(x, g, z, 'smooth_stone')
  // four outer legs (2x2, on the diagonals, outside the tank) up past the middle ring
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const a of [5, 6]) for (const b of [5, 6]) {
    const x = sx < 0 ? cx - 1 - a : cx + a, z = sz < 0 ? cz - 1 - b : cz + b
    for (let y = g + 1; y <= g + 25; y++) S(x, y, z, NAVY)
    S(x, g + 26, z, 'blue_terracotta')
  }
  // four thin inner legs and the thick centre column, up to the bottom ring
  for (const x of [cx - 5, cx + 4]) for (const z of [cz - 5, cz + 4]) for (let y = g + 1; y <= g + 14; y++) S(x, y, z, NAVY)
  for (let x = cx - 2; x <= cx + 1; x++) for (let z = cz - 2; z <= cz + 1; z++) {
    if ((x === cx - 2 || x === cx + 1) && (z === cz - 2 || z === cz + 1)) continue
    for (let y = g + 1; y <= g + 15; y++) S(x, y, z, y === g + 1 ? 'blue_terracotta' : NAVY)
  }
  // the bottom ring (two thick, the tank's floor; its railing below), and the middle ring hugging the tank
  disc(5, 9.4, (x, z) => S(x, g + 15, z, NAVY))
  disc(-1, 9.4, (x, z) => S(x, g + 16, z, NAVY))
  const ladder = [cx - 7, cz - 8] // up the north-west leg to the bottom ring, which is a 2-wide walk round the tank
  // the bottom ring's railing: iron bars round its outer edge, open where the ladder comes up (and where a leg stands)
  disc(-1, 9.4, (x, z) => {
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dz]) => Math.hypot(x + dx + 0.5 - cx, z + dz + 0.5 - cz) > 9.4)
    if (edge && Math.hypot(x - ladder[0], z - ladder[1]) > 1.5 && !G(x, g + 17, z)) S(x, g + 17, z, 'iron_bars')
  })
  // the tank: lime glass (a few yellow streaks) over a lit core, mostly verdant froglight (pale lime, as in the picture)
  // with ochre streaks: a glowing landmark at night. Rounded at the top. The glass reaches r 7.4, against the diagonal
  // legs (r 7.8), so no gap shows between them.
  const glass = (x, y, z) => h(x, 1, z) % 10 < 8 ? 'lime_stained_glass' : 'yellow_stained_glass' // vertical streaks
  const core = (x, y, z) => h(x, 3, z) % 10 < 7 ? 'verdant_froglight[axis=y]' : 'ochre_froglight[axis=y]'
  for (let y = g + 17; y <= g + 26; y++) {
    disc(6, 7.4, (x, z) => S(x, y, z, glass(x, y, z)))
    disc(5, 6, (x, z) => S(x, y, z, core(x, y, z)))
  }
  disc(7, 8.4, (x, z) => S(x, g + 22, z, NAVY)) // the middle ring: a band about 1 block proud of the glass
  disc(5.5, 6.6, (x, z) => S(x, g + 27, z, glass(x, g + 27, z)))
  disc(-1, 5.5, (x, z) => S(x, g + 27, z, core(x, g + 27, z)))
  disc(-1, 5.6, (x, z) => S(x, g + 28, z, glass(x, g + 28, z)))
  // the cap: a navy plate and a glowing cyan box
  disc(-1, 1.6, (x, z) => S(x, g + 29, z, NAVY))
  for (let y = g + 30; y <= g + 32; y++) disc(-1, 1.6, (x, z, r) => S(x, y, z, r < 1 && y < g + 32 ? 'sea_lantern' : 'light_blue_stained_glass'))
  // a ladder up the north-west leg to the ring's walkway
  for (let y = g + 1; y <= g + 17; y++) S(ladder[0], y, ladder[1], 'ladder[facing=north]')
}

// ---- wind turbines on E1, E2 and E4 (PLAN 5), all facing west ---------------------------------------------------------
// 2x2 tower 36 tall on the highest of its 4 columns (a foundation fills down to the others), a 3x3x5 nacelle, a hub and
// three blades about 16 long in the plane facing west, 120 degrees apart, one straight up.
function turbine (cx, cz) {
  const cols = [[cx - 1, cz - 1], [cx, cz - 1], [cx - 1, cz], [cx, cz]]
  const y0 = Math.max(...cols.map(([x, z]) => ground(x, z)))
  for (let x = cx - 2; x <= cx + 1; x++) for (let z = cz - 2; z <= cz + 1; z++) { // the foundation, flush at y0
    if (ground(x, z) > y0) continue
    for (let y = ground(x, z) + 1; y < y0; y++) S(x, y, z, 'polished_andesite')
    S(x, y0, z, 'smooth_stone')
  }
  for (const [x, z] of cols) for (let y = y0 + 1; y <= y0 + 36; y++) {
    S(x, y, z, y === y0 + 1 ? 'light_gray_concrete' : (y - y0) % 12 === 0 ? 'smooth_quartz' : 'white_concrete')
  }
  door(DS, cx - 1, y0 + 1, cz, 'east', 'left', false, 'iron_door') // a service door on the west face
  const yh = y0 + 38 // the hub's height
  for (let x = cx - 3; x <= cx + 1; x++) for (let z = cz - 1; z <= cz + 1; z++) for (let y = y0 + 37; y <= y0 + 39; y++) {
    S(x, y, z, y === y0 + 39 ? 'smooth_quartz' : x === cx + 1 ? 'light_gray_concrete' : 'white_concrete')
  }
  S(cx + 1, y0 + 39, cz, 'redstone_block'); S(cx + 1, y0 + 40, cz, 'redstone_lamp[lit=true]') // the aviation light, lit
  const xb = cx - 4 // the rotor's plane
  S(xb, yh, cz, 'smooth_quartz'); S(xb - 1, yh, cz, 'end_rod[facing=west]')
  for (const deg of [0, 120, 240]) {
    const a = deg * Math.PI / 180, dz = Math.sin(a), dy = Math.cos(a)
    let pz = null, py = null
    for (let k = 1; k <= 32; k++) { // half steps, 4-connected so the blade reads as one line
      const f = k / 2, z = Math.round(cz + dz * f), y = Math.round(yh + dy * f)
      if (pz !== null && z !== pz && y !== py) S(xb, py, z, 'smooth_quartz')
      S(xb, y, z, 'smooth_quartz')
      if (f <= 8) S(xb, Math.round(yh + dy * f - dz * 0.9), Math.round(cz + dz * f + dy * 0.9), 'smooth_quartz') // 2 wide to 8 out (a 1-block line vanishes from afar)
      pz = z; py = y
    }
  }
}

// ---- the satellite dish on E3 (town_view1; the brief's optional landmark) ------------------------------------------------
// A wide, shallow lavender-grey bowl about 22 across (house size, as in town_view1) on a white pedestal, its axis 68
// degrees up and leaning west, so it faces mostly the sky and a little the town. The bowl is a paraboloid shell (depth
// r^2 / 4f, f 10: 3 deep at the rim): its face light_blue_terracotta, its back polished diorite, a calcite rim, a short
// feed horn on the axis. Like the turbines it stands on a pad on top of the hill's own columns; the lower rim is about
// 6 over the pad.
function dish (cx, cz) {
  let y0 = 0
  for (let x = cx - 4; x <= cx + 4; x++) for (let z = cz - 4; z <= cz + 4; z++) y0 = Math.max(y0, ground(x, z))
  for (let x = cx - 4; x <= cx + 4; x++) for (let z = cz - 4; z <= cz + 4; z++) { // the pad, flush at y0
    if (Math.abs(x - cx) === 4 && Math.abs(z - cz) === 4) continue
    for (let y = ground(x, z) + 1; y < y0; y++) S(x, y, z, 'polished_andesite')
    S(x, y0, z, Math.abs(x - cx) === 4 || Math.abs(z - cz) === 4 ? 'polished_andesite' : 'smooth_stone')
  }
  for (let x = cx - 3; x <= cx + 3; x++) for (let z = cz - 3; z <= cz + 3; z++) if (Math.abs(x - cx) + Math.abs(z - cz) <= 5) S(x, y0 + 1, z, 'polished_diorite')
  for (let x = cx - 2; x <= cx + 2; x++) for (let z = cz - 2; z <= cz + 2; z++) { // the pedestal, 5x5 with its corners cut
    if (Math.abs(x - cx) === 2 && Math.abs(z - cz) === 2) continue
    for (let y = y0 + 2; y <= y0 + 5; y++) S(x, y, z, y === y0 + 5 && (x !== cx || z !== cz) ? 'polished_diorite' : 'calcite')
  }
  for (let y = y0 + 6; y <= y0 + 7; y++) S(cx, y, cz, 'polished_andesite') // the neck to the bowl's back
  const e = 68 * Math.PI / 180, ax = [-Math.cos(e), Math.sin(e), 0], pv = [Math.sin(e), Math.cos(e), 0] // axis, the bowl's 'up'
  const V = [cx + 0.5 + 0.8, y0 + 8.5, cz + 0.5], R = 11, F = 10 // the vertex (a little east of the neck), radius, focus
  for (let x = cx - 12; x <= cx + 12; x++) for (let y = y0 + 2; y <= y0 + 20; y++) for (let z = cz - 12; z <= cz + 12; z++) {
    const d = [x + 0.5 - V[0], y + 0.5 - V[1], z + 0.5 - V[2]]
    const u = d[0] * ax[0] + d[1] * ax[1], p = d[0] * pv[0] + d[1] * pv[1], w = d[2], r = Math.hypot(p, w)
    if (r > R) continue
    const off = u - r * r / (4 * F) // 0 on the bowl's face; > 0 in front of it
    // Each layer is 1.1 thick along the axis, so every line of blocks through it (along x, y or z) meets at least one
    // block centre in it: the face is closed from every side (at 0.7 thick the back showed through it in light grey).
    if (off > 0.45 || off < -1.75) continue
    S(x, y, z, r > R - 0.9 ? 'calcite' : off > -0.65 ? 'light_blue_terracotta' : r < 1.6 ? 'polished_andesite' : 'polished_diorite')
  }
  let last = null // the feed horn, from the vertex out along the axis, 4-connected (3.5 past the rim's plane)
  const FEED = 6.5
  for (let k = 0.5; k <= FEED; k += 0.5) {
    const q = [Math.floor(V[0] + ax[0] * k), Math.floor(V[1] + ax[1] * k), Math.floor(V[2])]
    if (last && q[0] !== last[0] && q[1] !== last[1]) S(q[0], last[1], q[2], 'light_gray_concrete')
    S(q[0], q[1], q[2], k >= FEED - 0.6 ? 'polished_andesite' : 'light_gray_concrete')
    last = q
  }
  S(last[0], last[1] + 1, last[2], 'end_rod[facing=up]') // a small aviation light on the feed
}

// ---- Riverside Park (PLAN 5): inside the river's bend, x 212..299, z 729..879 minus the streets; no buildings ----------
const PARK = [204, 729, 299, 842] // its columns (the strip z 843..864 south of it stays plain grass)
const inPark = (x, z) => x >= PARK[0] && x <= PARK[2] && z >= PARK[1] && z <= PARK[3] && isLand(x, z) && !kept(x, z)
const TRAIL = [[293.5, 842.5], [278, 826], [254, 811], [230, 801], [211, 797]] // from the trailhead to the bank path
const SPUR = [[278, 826], [273, 795], [266, 762], [262, 739]]                 // up to the north bank
const polyD = (px, pz, pts) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, segD(px, pz, pts[i - 1], pts[i])); return d }
const onPath = (x, z) => {
  if (!inPark(x, z) || riverAt(x, z) || groundTop(x, z) > 0) return false
  const d = dryD(x, z)
  if (d >= 1.5 && d < 4.0) return true // the bank path, just beyond the bank
  return polyD(x + 0.5, z + 0.5, TRAIL) <= 1.5 || polyD(x + 0.5, z + 0.5, SPUR) <= 1.3
}
const PIER = { z1: 811, z2: 815, len: 9 } // a spruce pier into the west branch from the park's bank (deck y 61)
function park () {
  const taken = new Set() // columns of park furniture (no trees there)
  const take = (x, z, r = 0) => { for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) taken.add(`${x + dx},${z + dz}`) }
  // paths
  for (let x = PARK[0]; x <= PARK[2]; x++) for (let z = PARK[1]; z <= PARK[3]; z++) if (onPath(x, z)) { S(x, 64, z, 'dirt_path'); take(x, z) }
  // the pier: the deck at y 61 from the first bank column out over the water, posts down to the bed, railings
  const zc = Math.round((PIER.z1 + PIER.z2) / 2)
  let xw = null
  for (let x = 230; x > 170 && xw === null; x--) { const r = riverAt(x, zc); if (r && r.water) xw = x }
  const xs = xw - PIER.len + 1, xe = xw + 1 // xe = the first bank column (its top is y 61)
  for (let x = xs; x <= xe; x++) for (let z = PIER.z1; z <= PIER.z2; z++) {
    S(x, 61, z, (x - xs) % 3 === 0 ? 'stripped_spruce_log[axis=z]' : 'spruce_planks')
    const r = riverAt(x, z)
    const post = (z === PIER.z1 || z === PIER.z2) && ((x - xs) % 4 === 0)
    if (r && r.water && post) for (let y = r.bed + 1; y <= WATER_Y; y++) S(x, y, z, 'spruce_log[axis=y]')
    if (x <= xw && (z === PIER.z1 || z === PIER.z2 || x === xs)) {
      S(x, 62, z, 'spruce_fence')
      if (post && x === xs) S(x, 63, z, 'lantern[hanging=false]')
    }
  }
  // steps up the bank from the pier to the park (3 wide, z 812..814)
  for (let z = PIER.z1 + 1; z <= PIER.z2 - 1; z++) for (let x = xe + 1; x <= xe + 8; x++) {
    const r = riverAt(x, z)
    if (!r || r.water) break
    const prev = riverAt(x - 1, z), pt = prev && !prev.water ? prev.top : 61
    S(x, r.top, z, r.top > pt ? 'spruce_stairs[facing=east,half=bottom]' : 'spruce_planks')
  }
  rect(xs - 1, PIER.z1 - 1, xe + 9, PIER.z2 + 1, (x, z) => taken.add(`${x},${z}`))
  // benches along the bank path, sitting toward the river (spruce stairs, open trapdoors for arms)
  const benchZ = (z) => { // on the west bank, along z: the first column east of the path at this z
    let x = 205; while (x < 240 && !(dryD(x, z) >= 4.0 && dryD(x, z + 2) >= 4.0)) x++
    S(x, 65, z - 1, 'spruce_trapdoor[facing=north,half=bottom,open=true]')
    S(x, 65, z + 3, 'spruce_trapdoor[facing=south,half=bottom,open=true]')
    for (let k = 0; k <= 2; k++) S(x, 65, z + k, 'spruce_stairs[facing=east,half=bottom]')
    take(x, z + 1, 2)
    return x
  }
  const benchX = (x) => { // on the north bank, along x: the first column south of the path
    let z = 729; while (z < 760 && !(dryD(x, z) >= 4.0 && dryD(x + 2, z) >= 4.0)) z++
    S(x - 1, 65, z, 'spruce_trapdoor[facing=west,half=bottom,open=true]')
    S(x + 3, 65, z, 'spruce_trapdoor[facing=east,half=bottom,open=true]')
    for (let k = 0; k <= 2; k++) S(x + k, 65, z, 'spruce_stairs[facing=south,half=bottom]')
    take(x + 1, z, 2)
    return z
  }
  const bins = []
  bins.push([benchZ(770) + 1, 774]); bins.push([benchZ(793) + 1, 797]); bins.push([benchZ(830) + 1, 834])
  bins.push([284, benchX(281) + 1])
  for (const [x, z] of bins) { S(x, 65, z, 'green_terracotta'); S(x, 66, z, 'iron_trapdoor[facing=north,half=bottom,open=false]'); take(x, z, 1) }
  // lamps along the paths: a dark oak post with a lantern on top
  const lamps = [[289, 836], [270, 818], [246, 811], [222, 804], [272, 806], [267, 778], [260, 752], [231, 760], [214, 785]]
  for (const [x, z] of lamps) {
    if (!inPark(x, z) || onPath(x, z) || riverAt(x, z) || dryD(x, z) < 1.5) continue // on dry lawn only
    for (let y = 65; y <= 67; y++) S(x, y, z, 'dark_oak_fence')
    S(x, 68, z, 'lantern[hanging=false]')
    take(x, z, 1)
  }
  // two picnic tables on the lawn (top slabs on the table, bottom slabs for seats)
  for (const [x, z] of [[247, 787], [256, 828]]) {
    for (let k = 0; k <= 2; k++) { S(x + k, 65, z, 'spruce_slab[type=top]'); S(x + k, 65, z - 1, 'spruce_slab[type=bottom]'); S(x + k, 65, z + 1, 'spruce_slab[type=bottom]') }
    take(x + 1, z, 3)
  }
  // flower beds (a ring of moss and flowers)
  const FLOWERS = ['poppy', 'dandelion', 'cornflower', 'oxeye_daisy', 'allium', 'azure_bluet', 'red_tulip', 'orange_tulip']
  for (const [cx, cz] of [[262, 796], [238, 823], [283, 760]]) {
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      const d = Math.hypot(dx, dz), x = cx + dx, z = cz + dz
      if (d > 3.2 || onPath(x, z)) continue
      if (d > 2.4) { S(x, 64, z, 'mud_bricks'); continue } // the bed's edge
      S(x, 64, z, 'grass_block'); S(x, 65, z, FLOWERS[h(x, 31, z) % FLOWERS.length])
    }
    take(cx, cz, 4)
  }
  // the sign over the trailhead: two posts, a green board with the name on both faces
  for (let y = 65; y <= 69; y++) { S(289, y, 842, 'dark_oak_log[axis=y]'); S(297, y, 842, 'dark_oak_log[axis=y]') }
  for (let x = 290; x <= 296; x++) { S(x, 68, 842, 'green_terracotta'); S(x, 69, 842, 'green_terracotta'); S(x, 70, 842, 'dark_oak_slab[type=bottom]') }
  S(289, 70, 842, 'dark_oak_slab[type=bottom]'); S(297, 70, 842, 'dark_oak_slab[type=bottom]')
  take(293, 842, 4)
  // the trailhead's path on across the kept-free strip to the NW corner's sidewalk (flat, so the strip's rule holds)
  rect(292, 843, 295, 848, (x, z) => { if (isLand(x, z)) S(x, 64, z, 'dirt_path') })
  // trees over the lawn: a jittered grid with a bit under half its cells kept (all of them read as an orchard), a third
  // of them pines, clear of the paths, the furniture and the view from the bridge to the park's sign
  const VIEW = [[434.5, 726.5], [293.5, 842.5]]
  for (let gx = PARK[0]; gx <= PARK[2]; gx += 10) for (let gz = PARK[1]; gz <= PARK[3]; gz += 10) {
    const x = gx + h(gx, 32, gz) % 9 - 4, z = gz + h(gx, 33, gz) % 9 - 4
    if (h(gx, 34, gz) < 55 || !inPark(x, z) || riverAt(x, z) || dryD(x, z) < 6 || polyD(x + 0.5, z + 0.5, VIEW) < 7) continue
    let ok = roomFor(x, z, 4)
    for (let dx = -4; dx <= 4 && ok; dx++) for (let dz = -4; dz <= 4 && ok; dz++) if (taken.has(`${x + dx},${z + dz}`) || onPath(x + dx, z + dz)) ok = false
    if (!ok || !tree(x, z, 7)) continue
    if (h(gx, 35, gz) < 33) pine(P, x, z, 13 + h(x, 36, z) % 4); else oak(P, x, z)
  }
}

// ---- the beach (the lake's south-east shore) -------------------------------------------------------------------------
const lakeDir = (x, z) => { const dx = x - LAKE.cx, dz = z - LAKE.cz; return Math.abs(dx) * LAKE.rz > Math.abs(dz) * LAKE.rx ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north') }
const sandTop = (x, z) => { const r = riverAt(x, z); return r && !r.water && r.beach && isLand(x, z) ? r.top : null }
const airAt = (x, y, z) => { const s = G(x, y, z); return !s || s === 'air' } // nothing built there (or cleared air)
// The column e blocks beyond the lake's edge (COMMON's lakeE, wobble and all) on the ray at deg degrees from its centre.
const shorePoint = (deg, e) => {
  const a = deg * Math.PI / 180, at = r => [Math.floor(LAKE.cx + LAKE.rx * r * Math.cos(a)), Math.floor(LAKE.cz + LAKE.rz * r * Math.sin(a))]
  let r = 0.5
  while (r < 2 && lakeE(at(r)[0] + 0.5, at(r)[1] + 0.5) < e) r += 0.004
  return at(r)
}
// Sandstone boulders over the beach's two cuts (cutD): where the bank's top stands 2 over the beach's across the cut
// line, a rock straddles it (a 2x2 core 2 over the highest ground round it, a rim of stairs 1 over), up to 3 a cut,
// 4+ apart, with dead bushes in the sand beside them. Their footprints go into items (no umbrella there).
function beachRocks (items) {
  const top = (x, z) => { if (!isLand(x, z)) return null; const r = riverAt(x, z); return r ? (r.water ? null : r.top) : groundTop(x, z) ? null : 64 }
  const cuts = [
    { k1: LAKE.cz - 29, k2: TOWN.z2 - 2, cell: (k, i, j) => [LAKE.cx - 11 + i, k + j] }, // south shore: bank x 181 | beach x 182
    { k1: LAKE.cx + 1, k2: LAKE.cx + 70, cell: (k, i, j) => [k + j, LAKE.cz - 31 + i] } // east shore: bank z 1209 | beach z 1210
  ]
  for (const c of cuts) {
    const at = []
    for (let k = c.k1; k <= c.k2; k++) {
      const a = top(...c.cell(k, 0, 0)), b = top(...c.cell(k, 1, 0))
      if (a !== null && b !== null && Math.abs(a - b) >= 2 && at.every(q => Math.abs(q - k) >= 4)) at.push(k)
    }
    for (const k of at.slice(0, 3)) {
      // i 0 = the bank-side column, 1 = the beach-side; j 0..1 along the cut; the rim one cell out on every side
      // rim cells carry the step (di, dj) toward the core: their stairs' high side faces it
      const core = [[0, 0], [1, 0], [0, 1], [1, 1]]
      const rim = [[-1, 0, 1, 0], [-1, 1, 1, 0], [2, 0, -1, 0], [2, 1, -1, 0], [0, -1, 0, 1], [1, -1, 0, 1], [0, 2, 0, -1], [1, 2, 0, -1]]
      if (core.some(([i, j]) => top(...c.cell(k, i, j)) === null)) continue
      let h0 = 0
      for (const [i, j] of [...core, ...rim]) { const t = top(...c.cell(k, i, j)); if (t !== null) h0 = Math.max(h0, t) }
      for (const [i, j] of core) {
        const [x, z] = c.cell(k, i, j), t = top(x, z)
        for (let y = t + 1; y <= h0 + 1; y++) S(x, y, z, 'smooth_sandstone')
        S(x, h0 + 2, z, h(x, 70, z) < 40 ? 'sandstone_slab[type=bottom]' : 'sandstone')
      }
      for (const [i, j, di, dj] of rim) {
        const [x, z] = c.cell(k, i, j), t = top(x, z)
        if (t === null) continue
        const [qx, qz] = c.cell(k, i + di, j + dj), dx = qx - x, dz = qz - z
        for (let y = t + 1; y <= h0; y++) S(x, y, z, 'smooth_sandstone')
        if (h(x, 71, z) < 75) S(x, h0 + 1, z, `sandstone_stairs[facing=${dx > 0 ? 'east' : dx < 0 ? 'west' : dz > 0 ? 'south' : 'north'},half=bottom]`)
      }
      for (let i = -2; i <= 3; i++) for (let j = -2; j <= 3; j++) { const [x, z] = c.cell(k, i, j); items.add(`${x},${z}`) }
      let bushes = 0
      for (let i = -3; i <= 4 && bushes < 3; i++) for (let j = -3; j <= 4 && bushes < 3; j++) {
        if (i >= -1 && i <= 2 && j >= -1 && j <= 2) continue
        const [x, z] = c.cell(k, i, j), t = top(x, z)
        if (t === null || G(x, t, z) !== 'sand' || !airAt(x, t + 1, z) || h(x, 72, z) >= 18) continue
        S(x, t + 1, z, 'dead_bush'); bushes++
      }
    }
  }
}
function beach () {
  const items = new Set()
  beachRocks(items)
  // a lifeguard stand in the middle of the beach, facing the lake (first: the umbrellas keep clear of it)
  {
    const a = 42 * Math.PI / 180
    const x = Math.round(LAKE.cx + (LAKE.rx + 6) * Math.cos(a)), z = Math.round(LAKE.cz + (LAKE.rz + 6) * Math.sin(a))
    const dir = lakeDir(x, z) // toward the land: the stand's back
    const [ux, uz] = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] }[dir], vx = uz ? 1 : 0, vz = ux ? 1 : 0
    const W = (i, j) => [x + ux * (i - 1) + vx * (j - 1), z + uz * (i - 1) + vz * (j - 1)] // i 0 lake side .. 2 land side
    const top = (i, j) => sandTop(...W(i, j)) ?? 62
    let y0 = 0
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) y0 = Math.max(y0, top(i, j))
    for (const [i, j] of [[0, 0], [0, 2], [2, 0], [2, 2], [2, 1]]) { // white legs (the back middle one carries the ladder)
      const [lx, lz] = W(i, j)
      for (let y = top(i, j) + 1; y <= y0 + 4; y++) S(lx, y, lz, 'stripped_birch_log[axis=y]')
    }
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) {
      const [px, pz] = W(i, j), corner = (i !== 1) && (j !== 1)
      S(px, y0 + 5, pz, 'birch_planks')
      if (corner) for (let y = y0 + 6; y <= y0 + 8; y++) S(px, y, pz, 'birch_fence')
      else if (!(i === 1 && j === 1) && !(i === 2 && j === 1)) S(px, y0 + 6, pz, 'birch_fence')
      S(px, y0 + 9, pz, (i + j) % 2 ? 'red_wool' : 'white_wool')
    }
    { const [px, pz] = W(1, 1); S(px, y0 + 6, pz, `birch_stairs[facing=${dir},half=bottom]`); S(px, y0 + 10, pz, 'red_wool') }
    // the ladder ends level with the platform (the back middle leg and the planks hold it; above them is the way in)
    { const [lx, lz] = W(3, 1); for (let y = (sandTop(lx, lz) ?? 62) + 1; y <= y0 + 5; y++) S(lx, y, lz, `ladder[facing=${dir}]`) }
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) items.add(`${x + dx},${z + dz}`)
  }
  const COLORS = [['red', 'white'], ['blue', 'white'], ['yellow', 'orange'], ['lime', 'white'], ['magenta', 'pink'], ['cyan', 'light_blue']]
  let n = 0
  for (let deg = -12; deg <= 96; deg += 18, n++) {
    const a = deg * Math.PI / 180
    const x = Math.round(LAKE.cx + (LAKE.rx + 8) * Math.cos(a)), z = Math.round(LAKE.cz + (LAKE.rz + 8) * Math.sin(a))
    const y0 = sandTop(x, z)
    if (y0 === null || sandTop(x + 3, z) === null || sandTop(x - 3, z) === null || sandTop(x, z + 3) === null || sandTop(x, z - 3) === null) continue
    let clear = true // the canopy and the chairs keep off the stand and the rocks
    for (let dx = -4; dx <= 4 && clear; dx++) for (let dz = -4; dz <= 4 && clear; dz++) if (items.has(`${x + dx},${z + dz}`)) clear = false
    if (!clear) continue
    const [c1, c2] = COLORS[n % COLORS.length]
    for (let y = y0 + 1; y <= y0 + 5; y++) S(x, y, z, 'birch_fence')
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) { // the canopy: 8 coloured sectors, a peak
      const d = Math.hypot(dx, dz)
      if (d > 3.3) continue
      const sector = Math.floor((Math.atan2(dz, dx) + Math.PI) / (Math.PI / 4)) % 2
      S(x + dx, d > 2.2 ? y0 + 5 : y0 + 6, z + dz, `${sector ? c1 : c2}_wool`)
    }
    S(x, y0 + 7, z, `${c1}_wool`)
    // a towel and two deckchairs facing the lake
    const dir = lakeDir(x, z), back = dir, [fx, fz] = { east: [-1, 0], west: [1, 0], south: [0, -1], north: [0, 1] }[dir]
    const side = fx ? [0, 1] : [1, 0]
    for (const k of [-1, 1]) {
      const cx = x + fx * 2 + side[0] * k * 2, cz = z + fz * 2 + side[1] * k * 2, ct = sandTop(cx, cz)
      if (ct !== null && ct <= 64) S(cx, ct + 1, cz, `birch_stairs[facing=${back},half=bottom]`)
    }
    for (let i = 0; i <= 1; i++) for (let j = 0; j <= 2; j++) {
      const tx = x + (fx ? fx * (3 + j) : side[0] * (i - 3)), tz = z + (fz ? fz * (3 + j) : side[1] * (i - 3))
      const tt = sandTop(tx, tz)
      if (tt !== null && tt <= 64 && airAt(tx, tt + 1, tz)) S(tx, tt + 1, tz, `${c1}_carpet`)
    }
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) items.add(`${x + dx},${z + dz}`)
  }
  // two palms near the back of the sand (11 blocks up the beach, which is 14 wide)
  for (const deg of [8, 70]) {
    const [x, z] = shorePoint(deg, 11), y0 = sandTop(x, z)
    if (y0 === null || items.has(`${x},${z}`)) continue
    palm(x, z, y0, lakeDir(x, z))
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) items.add(`${x + dx},${z + dz}`)
  }
  // a few cacti on the sand (town_2025, town_view_to_volcano), 2-3 tall, each with its four sides clear (a cactus
  // beside anything solid breaks): every neighbour beach sand no higher than its own, so the beach's own slope decides
  let cacti = 0
  const spots = []
  for (let deg = -30; deg <= 104 && cacti < 4; deg += 6) {
    const [x, z] = shorePoint(deg, 7.5 + h(deg + 500, 37, 0) % 5), y0 = sandTop(x, z)
    if (y0 === null || y0 < 62 || !/sand$/.test(G(x, y0, z) || '') || spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 12)) continue
    let ok = true
    for (let dx = -2; dx <= 2 && ok; dx++) for (let dz = -2; dz <= 2 && ok; dz++) if (items.has(`${x + dx},${z + dz}`)) ok = false
    if (!ok || !NB.every(([dx, dz]) => { const t = sandTop(x + dx, z + dz); return t !== null && t <= y0 && airAt(x + dx, y0 + 1, z + dz) })) continue
    const tall = 2 + h(x, 38, z) % 2
    for (let k = 1; k <= tall; k++) S(x, y0 + k, z, 'cactus[age=0]')
    spots.push([x, z]); items.add(`${x},${z}`); cacti++
  }
  // pines behind the beach
  let placed = 0
  for (let deg = -25; deg <= 105 && placed < 9; deg += 13) {
    const a = deg * Math.PI / 180, e = 18 + h(deg + 400, 35, 0) % 9
    const x = Math.round(LAKE.cx + (LAKE.rx + e) * Math.cos(a)), z = Math.round(LAKE.cz + (LAKE.rz + e) * Math.sin(a))
    if (riverAt(x, z) || groundTop(x, z) > 0 || !roomFor(x, z, 4) || builtD(x, z) < 6 || !tree(x, z, 8)) continue
    pine(P, x, z, 13 + h(x, 36, z) % 5); placed++
  }
}
// A palm: a jungle trunk leaning away from the lake, a crown of drooping fronds.
function palm (x, z, y0, away) {
  const [lx, lz] = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] }[away].map(v => -v) // lean toward the lake
  const tall = 8
  let tx = x, tz = z
  for (let k = 1; k <= tall; k++) {
    // at the two heights where it leans, a log at both its old and its new spot, so the trunk never joins at an edge only
    if (k === 5 || k === 7) { S(tx, y0 + k, tz, 'jungle_log[axis=y]'); tx += lx; tz += lz }
    S(tx, y0 + k, tz, 'jungle_log[axis=y]')
  }
  const ty = y0 + tall + 1
  S(tx, ty, tz, 'jungle_leaves[persistent=true]')
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    for (let k = 1; k <= 4; k++) S(tx + dx * k, ty - (k >= 3 ? k - 2 : 0), tz + dz * k, 'jungle_leaves[persistent=true]')
  }
}

// ---- trees: pines on the hills, pines and oaks on the open ground ----------------------------------------------------
const TREEGRID = new Map()
// Keeps trees d apart: false if one stands closer, else records this one.
function tree (x, z, d) {
  const gx = Math.floor(x / 16), gz = Math.floor(z / 16)
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const [tx, tz] of TREEGRID.get(`${gx + i},${gz + j}`) || []) if (Math.hypot(tx - x, tz - z) < d) return false
  const k = `${gx},${gz}`
  if (!TREEGRID.has(k)) TREEGRID.set(k, [])
  TREEGRID.get(k).push([x, z])
  return true
}
function trees () {
  for (let x = R.x1 + 4; x <= R.x2 - 4; x++) for (let z = R.z1 + 4; z <= R.z2 - 4; z++) {
    if (!isLand(x, z) || kept(x, z) || riverAt(x, z) || inBox(x, z, [STAIRS]) || nearMark(x, z) || inPark(x, z) || nearPond(x, z)) continue
    const t = groundTop(x, z), v = rnd(x, z, 50)
    if (t > 0) { // on the hills: terrace cells (all 4 neighbours level) with grass on top (not an orange patch)
      if (v >= 40) continue
      if (groundTop(x + 1, z) !== t || groundTop(x - 1, z) !== t || groundTop(x, z + 1) !== t || groundTop(x, z - 1) !== t) continue
      if (G(x, 64 + t, z) !== 'grass_block' || !roomFor(x, z, 4) || !tree(x, z, 9)) continue
      // Jailbreak scatters lone cone trees and round gem trees over its hills: a third round oaks, like approach's ridge
      if (h(x, 54, z) < 33) oak(P, x, z, 64 + t); else pine(P, x, z, 12 + h(x, 51, z) % 7, 64 + t)
    } else { // open ground: fewer, oaks near the river, pines elsewhere
      if (v >= 26 || builtD(x, z) < 7) continue
      const nearRiver = dryD(x, z) < 30
      if (!roomFor(x, z, 4) || !tree(x, z, 9)) continue
      if (nearRiver ? h(x, 52, z) < 70 : h(x, 52, z) < 25) oak(P, x, z)
      else pine(P, x, z, 12 + h(x, 51, z) % 7)
    }
  }
  // shrubs here and there on the open ground and the hills' feet
  for (let x = R.x1 + 2; x <= R.x2 - 2; x++) for (let z = R.z1 + 2; z <= R.z2 - 2; z++) {
    if (rnd(x, z, 53) >= 22 || !isLand(x, z) || kept(x, z) || riverAt(x, z) || inBox(x, z, [STAIRS]) || nearMark(x, z)) continue
    if (groundTop(x, z) > 0 || builtD(x, z) < 4 || onPath(x, z) || !roomFor(x, z, 1) || G(x, 64, z)) continue
    shrub(P, x, z)
  }
}

// ---- grass and flowers last (only on grass; on the kept-free ground too, nothing there is taller than a shrub, and
// the north-west strip gets half as much) ----------------------------------------------------------------------------
function greenery () {
  const FL = ['dandelion', 'poppy', 'cornflower', 'oxeye_daisy', 'azure_bluet']
  for (let x = R.x1; x <= R.x2; x++) for (let z = R.z1; z <= R.z2; z++) {
    if (!isLand(x, z) || riverAt(x, z) || inBox(x, z, [STAIRS])) continue
    if (inNW(x, z) && h(x, 64, z) % 2) continue
    const y = ground(x, z), top = G(x, y, z)
    if (!(top === undefined && y === 64) && top !== 'grass_block') continue
    if (G(x, y + 1, z) || G(x, y + 2, z) || freeD(x, z) < 2) continue
    const hillCol = y > 64, pk = inPark(x, z)
    if (h(x >> 3, 9, z >> 3) >= (hillCol ? 22 : 32)) continue // clumps, not an even sprinkle
    const v = rnd(x, z, 60)
    if (v >= (hillCol ? 900 : 1500)) continue
    if (v < (pk ? 120 : 40)) S(x, y + 1, z, FL[h(x, 61, z) % FL.length])
    else if (v < 320 && !hillCol) { S(x, y + 1, z, 'tall_grass[half=lower]'); S(x, y + 2, z, 'tall_grass[half=upper]') }
    else if (v < 380 && pk) S(x, y + 1, z, `wildflowers[facing=${['north', 'east', 'south', 'west'][h(x, 62, z) % 4]},flower_amount=${1 + h(x, 63, z) % 4}]`)
    else S(x, y + 1, z, 'short_grass')
  }
}

// ---------------------------------------------------------------------------------------------------------------------
module.exports = (b = new (require('../mcstruct').Build)()) => {
  B = b
  TREEGRID.clear()
  terrain()
  stairBerms()
  waterLife()
  waterTower()
  for (const [x, z] of TURBINES) turbine(x, z)
  dish(...DISH)
  park()
  cleanOrange() // after the park: its paths cut the bank's orange fringe into specks
  beach()
  trees()
  greenery()
  B = null
  return b
}
module.exports.labels = [
  { x: 293.5, y: 68.75, z: 843.03, facing: 'south', text: 'RIVERSIDE PARK', color: '#ffffff', scale: 2 },
  { x: 293.5, y: 68.75, z: 841.97, facing: 'north', text: 'RIVERSIDE PARK', color: '#ffffff', scale: 2 }
]
module.exports.displays = []
// Biome boxes for later (a paste with the owner's OK, like approach's: `fillbiome <x1> <y1> <z1> <x2> <y2> <z2> <biome>`
// in W): plains water is deep blue, Jailbreak's river and lake turquoise, so the land's water (y 56..63: the deepest bed
// is y 55, the river's surface y 60, the meadow pond's y 63) becomes warm ocean, the pond too, so it matches the river.
// The west branch runs north-south and the lake is round, so it's one box per 16 x 16 chunk tile, from its first to its
// last water column each way. fillbiome works in 4 x 4 x 4 cells, so the boxes stop at y 63 like approach's: the next
// cell up (y 64..67) holds the banks' grass, which a box to y 64 tinted warm-ocean green in 4-block steps.
module.exports.biomes = (() => {
  const out = []
  for (let x0 = Math.floor(TOWN.x1 / 16) * 16; x0 <= RIVER_END_X; x0 += 16) for (let z0 = Math.floor(TOWN_Z / 16) * 16; z0 <= TOWN.z2; z0 += 16) { // chunk tiles
    let x1 = Infinity, z1 = Infinity, x2 = -Infinity, z2 = -Infinity
    for (let x = x0; x < x0 + 16 && x <= RIVER_END_X; x++) for (let z = z0; z < z0 + 16 && z <= TOWN.z2; z++) {
      if (ownerOf(x, z) !== MOD) continue
      const r = riverAt(x, z), p = pondAt(x, z)
      if ((r && r.water) || (p && p.water)) { x1 = Math.min(x1, x); x2 = Math.max(x2, x); z1 = Math.min(z1, z); z2 = Math.max(z2, z) }
    }
    if (x1 <= x2) out.push({ biome: 'minecraft:warm_ocean', box: [x1, 56, z1, x2, 63, z2] })
  }
  return out
})()
module.exports.points = {
  WATER_TOWER: [500.5, 85, 1176.5, 0], // the top of the stairs, looking at the tower (the landmark POI's spot)
  STAIRS_FOOT: [499.5, 65, 1129.5, 0], // the stair path leaves Hill Road's south sidewalk here
  PARK_GATE: [293.5, 65, 840.5, 180],  // under the park sign, looking into the park
  PIER_END: [205.5, 62, 813.5, 90]     // replaced by the computed end below
}
module.exports.setup = {
  regions: [], heists: [], keepers: [], givers: [], crates: [], carSpots: [], chops: [], garages: [], walls: [], holos: [],
  pois: [{ type: 'landmark', name: 'Water Tower', at: [500.5, 85, 1176.5], launch: true, cmd: '/dpoi add landmark Water Tower' }] // PLAN 8.2
}
// GPS path nodes and links (8.4's format): the stair path up T1, so a pin on the Water Tower routes up the stairs instead
// of stopping on Hill Road (the POI is ~59 blocks from the nearest street link; paths reach 24). 1051 lies on Hill Road's
// centre line between streets' 1013 and 1023, splitting that stretch: streets has no 1013-1023 link (PLAN 8.4).
module.exports.gps = {
  nodes: [[1051, 499.5, 65, 1117.5, 'HILL_STAIRS'], [1052, 499.5, 65, 1128.5, 'STAIRS_FOOT'], [1053, 499.5, 85, 1176.5, 'WATER_TOWER']],
  links: [[1013, 1051], [1051, 1023], [1051, 1052], [1052, 1053]]
}
{ // the pier's end, from the same river geometry the build uses
  let xw = null
  for (let x = 230; x > 170 && xw === null; x--) { const r = riverAt(x, 813); if (r && r.water) xw = x }
  module.exports.points.PIER_END = [xw - PIER.len + 2.5, 62, 813.5, 90]
}

// ---- previews (never part of the build) --------------------------------------------------------------------------------
// The land's blocks, with context: the other modules' columns as plan-layout.js paints them (buildings as solid boxes
// up to their roof) and the world's flat grass under every land column the build leaves empty.
function preview () {
  const { Build } = require('../mcstruct')
  const land = module.exports()
  const all = new Build()
  const SWAP = { smooth_quartz: 'quartz_block', smooth_red_sandstone: 'red_sandstone', smooth_sandstone: 'sandstone', short_grass: 'moss_carpet', tall_grass: 'moss_block', wildflowers: 'pink_wool', lily_pad: 'lime_carpet' }
  for (const [k, s] of land.blocks) { const n = s.replace(/\[.*$/, ''); all.blocks.set(k, SWAP[n] || s) }
  const ctx = require('./plan-layout.js')()
  for (const [k, s] of ctx.blocks) {
    const [x, y, z] = k.split(',').map(Number)
    if (z < TOWN_Z || isLand(x, z)) continue
    all.blocks.set(k, s)
    if (y > 65 && y !== 100) for (let yy = 65; yy < y; yy++) all.blocks.set(`${x},${yy},${z}`, s) // solid massing
  }
  for (let x = R.x1; x <= R.x2; x++) for (let z = R.z1; z <= R.z2; z++) if (isLand(x, z) && !all.blocks.has(`${x},64,${z}`)) all.blocks.set(`${x},64,${z}`, 'grass_block')
  return { land, all }
}
function crop (b, x1, z1, x2, z2, y1 = -999) {
  const { Build } = require('../mcstruct')
  const c = new Build()
  for (const [k, s] of b.blocks) { const [x, y, z] = k.split(',').map(Number); if (x >= x1 && x <= x2 && z >= z1 && z <= z2 && y >= y1) c.blocks.set(k, s) }
  return c
}
if (require.main === module) {
  const path = require('path'), fs = require('fs')
  const args = process.argv.slice(2)
  const ri = args.indexOf('--render')
  if (ri < 0) {
    const b = module.exports(), bb = b.bounds()
    const kinds = new Map(); for (const s of b.blocks.values()) { const n = s.replace(/\[.*$/, ''); kinds.set(n, (kinds.get(n) || 0) + 1) }
    console.log(`land: ${b.blocks.size} blocks, box ${bb.x1},${bb.y1},${bb.z1} to ${bb.x2},${bb.y2},${bb.z2}`)
    console.log([...kinds].sort((a, c) => c[1] - a[1]).slice(0, 25).map(([n, c]) => `${n} ${c}`).join(', '))
  } else {
    const dir = path.resolve(args[ri + 1] && !args[ri + 1].startsWith('--') ? args[ri + 1] : path.join(__dirname, 'renders', 'land'))
    const oi = args.indexOf('--only'), only = oi >= 0 ? args[oi + 1].split(',') : []
    fs.mkdirSync(dir, { recursive: true })
    const { top, iso } = require('../render.js')
    const { land, all } = preview()
    const save = (name, img) => { const f = path.join(dir, `${name}.png`); fs.writeFileSync(f, img.png()); console.log(`wrote ${f} (${img.w}x${img.h})`) }
    const want = n => !only.length || only.includes(n)
    console.log(`land: ${land.blocks.size} blocks`)
    const close = {
      tower: [440, 1110, 560, 1240], turbine: [660, 830, 740, 910], park: [180, 725, 310, 850],
      beach: [150, 1185, 310, 1300], east: [560, 729, 770, 1110], west: [120, 860, 260, 1120], dish: [626, 906, 674, 954],
      pond: [520, 1235, 600, 1290]
    }
    const ci = args.indexOf('--crop') // --crop name:x1,z1,x2,z2[:scale[:y1]] (any close look; repeatable)
    for (let i = ci; i >= 0; i = args.indexOf('--crop', i + 1)) {
      const [n, box, s = '6', y1 = '55'] = args[i + 1].split(':'), [x1, z1, x2, z2] = box.split(',').map(Number)
      const c = crop(all, x1, z1, x2, z2, Number(y1))
      for (const d of ['SE', 'NW', 'SW', 'NE']) save(`land-${n}-${d}`, iso(c, d, Number(s)))
    }
    if (ci >= 0 && !only.length) return
    if (want('top')) save('land-top', top(all, 1))
    if (want('wide')) { save('land-iso-SW', iso(crop(all, 120, 729, 770, 1300, 60), 'SW', 2)); save('land-iso-NE', iso(crop(all, 120, 729, 770, 1300, 60), 'NE', 2)) }
    for (const [n, [x1, z1, x2, z2]] of Object.entries(close)) if (want(n)) {
      const c = crop(all, x1, z1, x2, z2, 55)
      save(`land-${n}-SE`, iso(c, 'SE', n === 'east' || n === 'west' ? 3 : 5))
      save(`land-${n}-NW`, iso(c, 'NW', n === 'east' || n === 'west' ? 3 : 5))
      if (n === 'tower' || n === 'turbine' || n === 'dish') save(`land-${n}-SW`, iso(c, 'SW', n === 'dish' ? 10 : 6))
    }
  }
}
