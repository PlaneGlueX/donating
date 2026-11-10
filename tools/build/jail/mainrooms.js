// M4 (jail-spec 4.8): the main building's other interiors. G: workshop, laundry, guard lockers, the Security Office
// upper floor, the supply closet, Hall C, the gym, the inmate showers, the chapel, storage, Hall N, the classroom and the
// library with the bulge reading room. The y 72 slab inside the upper block (L2 floor; Hall B's ceiling pattern over
// Hall B and the stairwell). L2: the corridor over Hall N with its stair, the cross corridor, staff lounge, records,
// archive, visitation office, the Warden's anteroom and office, the control room.
// Walls are generated: every M4 cell at a level that isn't a room interior or a doorway is wall (2 thick between rooms),
// and each wall face takes the bands of the room it faces. No labels and no points of M4's own (jail-spec 10).

// ---- COMMON (jail-spec 1.7, copy verbatim) ----
const h = (x, y, z) => (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 100
const pick = (x, y, z, mix) => { const v = h(x, y, z); let a = 0; for (const [s, p] of mix) { a += p; if (v < a) return s } return mix[mix.length - 1][0] }
const MIX = {
  white: [['white_concrete', 70], ['smooth_quartz', 20], ['calcite', 10]],
  brick: [['bricks', 85], ['polished_granite', 8], ['terracotta', 7]],
  asphalt: [['black_concrete', 75], ['black_concrete_powder', 15], ['gray_concrete_powder', 10]],
  darkstone: [['blackstone', 40], ['cobbled_deepslate', 35], ['polished_basalt', 25]],
  navy: [['blue_terracotta', 80], ['blue_concrete', 20]]
}
// true if column (x,z) is inside or on the main building's outer face
const inMain = (x, z) => {
  if (x < 41 || x > 142 || z < 45 || z > 245) return false
  if (x > 128) return z >= x - 55 && z <= 127 + Math.floor((142 - x) * 3 / 7)       // the east bulge, both chamfers
  if (x >= 111 && z > 356 - x) return false                                          // SE chamfer (128,228)-(111,245)
  if (x <= 87 && z > 219 + Math.floor((x - 41) * 26 / 46)) return false              // SW chamfer (41,219)-(87,245)
  return true
}
const ring = (inside, x, z, t) => { if (!inside(x, z)) return false                  // t-thick outer wall ring of a footprint
  for (let dx = -t; dx <= t; dx++) for (let dz = -t; dz <= t; dz++) if (!inside(x + dx, z + dz)) return true; return false }
const inUpper = (x, z) => inMain(x, z) && x >= 58 && z <= 192 && (z <= 133 || x <= 122)   // the 3-storey block
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
// ---- end COMMON ----

// ---- M4's region (jail-spec 2.1, 2.2) ----
// M2 zones: [x1, x2, z1, z2, y1, y2], walls on a zone's edge belong to the zone.
const ZONES = [[79, 126, 191, 205, 64, 72], [79, 89, 113, 192, 64, 71], [79, 89, 103, 113, 64, 71],
  [89, 126, 134, 192, 64, 79], [79, 126, 204, 227, 64, 72], [79, 126, 227, 243, 64, 72]]
const ringCache = new Map()
const ringOf = (fn, tag, x, z) => { const k = `${tag}${x},${z}`; let v = ringCache.get(k); if (v === undefined) { v = ring(fn, x, z, 2); ringCache.set(k, v) } return v }
const inZone = (x, y, z) => ZONES.some(([a, b, c, d, e, f]) => x >= a && x <= b && z >= c && z <= d && y >= e && y <= f)
// true if (x, y, z) is M4's: inside the main building's shell, not B1 (M3), not an M2 zone, not the low roof (outside
// inUpper from y 72), not the upper block's walls (inUpper's ring from y 72) and not the upper roof (y 79 up).
const mine = (x, y, z) => {
  if (y < 62 || y > 110 || !inMain(x, z) || ringOf(inMain, 'm', x, z)) return false
  if (x >= 43 && x <= 126 && z >= 47 && z <= 113 && y >= 50 && y <= 63) return false
  if (inZone(x, y, z)) return false
  if (y >= 72 && (!inUpper(x, z) || ringOf(inUpper, 'u', x, z))) return false
  return y <= 78
}

// ---- rooms ----
// G rooms: interior boxes [x1, z1, x2, z2] (clipped by the polygon; a room may list several), wall style, floor (y 64),
// ceiling (y 72 where M4's). L2 rooms: interior boxes, wall style, carpet (y 73).
// Inner walls are placed so none of them runs into a window of M2's shell (the west face's barred windows, the chapel's
// stained glass, the north barred windows, the ribbon windows y 76..78, the bulge's chamfer windows): Hall N and its
// L2 corridor reach the north wall (z 47), the L2 partitions on the west step sit between M2's ribbon windows
// (z 74..75, 99, 148..149), and the classroom/library partition jogs to z 89 at the NE chamfer (its window x 136..139).
const GR = [
  { id: 'workshop', box: [43, 47, 61, 85], style: 'shop' },
  { id: 'laundry', box: [64, 47, 87, 85], style: 'room' },
  { id: 'lockers', box: [43, 88, 61, 112], style: 'room' },
  { id: 'so', box: [64, 88, 78, 112], style: 'so' },
  { id: 'closet', box: [81, 88, 87, 102], style: 'room' },
  { id: 'hallC', box: [43, 115, 78, 119], style: 'hall' },
  { id: 'gym', box: [43, 122, 78, 160], style: 'gym' },
  { id: 'showers', box: [43, 163, 78, 192], style: 'tile' },
  { id: 'chapel', box: [44, 195, 78, 218], style: 'chapel' },
  { id: 'storage', box: [43, 221, 78, 236], style: 'room' },
  { id: 'hallN', box: [90, 47, 96, 133], style: 'hall' },
  { id: 'class', box: [[99, 47, 140, 85], [135, 86, 139, 88]], style: 'room' },
  { id: 'library', box: [[99, 88, 133, 133], [134, 90, 140, 133]], style: 'lib' }
]
const LR = [
  { id: 'corr', box: [90, 47, 96, 132], style: 'hall2' },   // z 133 stays wall: L2 never relies on M2's cafeteria wall
  { id: 'cross', box: [60, 100, 89, 104], style: 'hall2' },
  { id: 'lounge', box: [60, 47, 87, 73], style: 'room2' },
  { id: 'records', box: [60, 76, 87, 98], style: 'room2' },
  { id: 'archive', box: [60, 107, 87, 147], style: 'room2' },
  { id: 'visit', box: [60, 150, 87, 190], style: 'room2' },
  { id: 'ante', box: [99, 88, 110, 132], style: 'off2' },
  { id: 'warden', box: [[113, 88, 133, 132], [134, 90, 140, 132]], style: 'warden' },
  { id: 'control', box: [[99, 47, 140, 85], [135, 86, 139, 88]], style: 'ctrl' }
]
// Doorways in M4's own walls. axis 'x': the wall is a plane x = w[0]..w[1] and the opening runs along z (a[0]..a[1]);
// axis 'z': the wall is z = w and the opening runs along x. kind: open (an empty framed opening) or iron (open iron
// doors in the layer `at`, a glass transom above). Doors on M2's walls are M2's (jail-spec 2.3).
const DOORS = [
  { lvl: 'G', axis: 'x', w: [62, 63], a: [75, 76], kind: 'iron', at: 63, facing: 'east' },   // workshop - laundry
  { lvl: 'G', axis: 'x', w: [88, 89], a: [70, 71], kind: 'iron', at: 88, facing: 'west' },   // laundry - Hall N (x 89, z 70..71)
  { lvl: 'G', axis: 'z', w: [113, 114], a: [52, 53], kind: 'iron', at: 113, facing: 'north' }, // lockers - Hall C (x 52..53)
  { lvl: 'G', axis: 'z', w: [113, 114], a: [70, 71], kind: 'iron', at: 113, facing: 'north' }, // Security Office - Hall C (x 70..71)
  { lvl: 'G', axis: 'x', w: [88, 89], a: [94, 95], kind: 'iron', at: 88, facing: 'west' },   // closet - Hall N
  { lvl: 'G', axis: 'x', w: [97, 98], a: [66, 67], kind: 'iron', at: 98, facing: 'east' },   // Hall N - classroom (x 97, z 66..67)
  { lvl: 'G', axis: 'x', w: [97, 98], a: [110, 111], kind: 'open' },                          // Hall N - library (x 97, z 110..111)
  { lvl: 'G', axis: 'z', w: [161, 162], a: [70, 71], kind: 'open' },                          // gym - showers
  { lvl: 'L2', axis: 'x', w: [88, 89], a: [60, 61], kind: 'iron', at: 88, facing: 'west' },  // corridor - lounge
  { lvl: 'L2', axis: 'x', w: [97, 98], a: [66, 67], kind: 'iron', at: 98, facing: 'east' },  // corridor - control room
  { lvl: 'L2', axis: 'x', w: [97, 98], a: [101, 103], kind: 'open' },                         // corridor - anteroom
  { lvl: 'L2', axis: 'x', w: [88, 89], a: [131, 132], kind: 'open' },                         // landing - archive
  { lvl: 'L2', axis: 'x', w: [97, 98], a: [131, 132], kind: 'open' },                         // landing - anteroom
  { lvl: 'L2', axis: 'z', w: [99, 99], a: [73, 74], kind: 'iron', at: 99, facing: 'south' }, // records - cross corridor
  { lvl: 'L2', axis: 'z', w: [74, 75], a: [66, 67], kind: 'iron', at: 74, facing: 'south' }, // lounge - records
  { lvl: 'L2', axis: 'z', w: [105, 106], a: [73, 74], kind: 'iron', at: 106, facing: 'north' }, // archive - cross corridor
  { lvl: 'L2', axis: 'z', w: [148, 149], a: [73, 74], kind: 'iron', at: 148, facing: 'south' }, // archive - visitation
  { lvl: 'L2', axis: 'x', w: [111, 112], a: [108, 109], kind: 'iron', at: 112, facing: 'east' } // anteroom - Warden
]
const LV = { G: { floor: 64, y1: 65, y2: 71, rooms: GR }, L2: { floor: 72, y1: 73, y2: 78, rooms: LR } }
const roomMap = {}
for (const [lvl, L] of Object.entries(LV)) {
  const m = new Map()
  for (const r of L.rooms) for (const bx of (Array.isArray(r.box[0]) ? r.box : [r.box])) for (let x = bx[0]; x <= bx[2]; x++) for (let z = bx[1]; z <= bx[3]; z++) {
    if (mine(x, L.y1, z) && !m.has(`${x},${z}`)) m.set(`${x},${z}`, r)
  }
  roomMap[lvl] = m
}
const roomAt = (lvl, x, z) => roomMap[lvl].get(`${x},${z}`) || null
const doorCells = { G: new Set(), L2: new Set() }
for (const d of DOORS) for (let w = d.w[0]; w <= d.w[1]; w++) for (let a = d.a[0]; a <= d.a[1]; a++) {
  doorCells[d.lvl].add(d.axis === 'x' ? `${w},${a}` : `${a},${w}`)
}
// L2 stair: 8 steps at z 123..130 (y 65..72), no L2 slab over x 90..96, z 121..130.
const inHole = (x, z) => x >= 90 && x <= 96 && z >= 121 && z <= 130

// Wall faces: the bands of the room a face looks into (y -> block; null = the white mix).
const FACE = {
  room: (y) => ({ 65: 'light_gray_concrete', 68: 'orange_concrete' })[y],
  hall: (y) => ({ 65: 'orange_terracotta', 68: 'orange_concrete', 70: 'orange_concrete' })[y],
  shop: (y) => ({ 65: 'gray_concrete', 66: 'light_gray_concrete', 67: 'light_gray_concrete', 68: 'orange_concrete' })[y],
  so: (y) => ({ 65: 'blue_concrete', 68: 'light_blue_concrete', 70: 'light_blue_concrete' })[y],
  gym: (y) => ({ 65: 'gray_concrete', 68: 'orange_concrete', 70: 'orange_terracotta' })[y],
  tile: (y, x, z) => y === 65 ? 'light_gray_concrete' : y === 68 ? 'orange_concrete' : (y === 66 || y === 67) ? (((x + z + y) & 1) ? 'white_concrete' : 'light_gray_concrete') : null,
  chapel: (y) => ({ 65: 'spruce_planks', 66: 'spruce_planks', 67: 'smooth_quartz', 68: 'orange_concrete' })[y],
  lib: (y) => ({ 65: 'dark_oak_planks', 66: 'birch_planks', 67: 'birch_planks', 68: 'orange_concrete' })[y],
  room2: (y) => ({ 73: 'light_gray_concrete', 75: 'orange_concrete' })[y],
  hall2: (y) => ({ 73: 'orange_terracotta', 75: 'orange_concrete', 77: 'orange_concrete' })[y],
  ctrl: (y) => ({ 73: 'blue_concrete', 75: 'orange_concrete', 77: 'light_blue_concrete' })[y],
  off2: (y) => ({ 73: 'dark_oak_planks', 75: 'orange_concrete' })[y],
  warden: (y) => ({ 73: 'dark_oak_planks', 74: 'dark_oak_planks', 75: 'orange_concrete' })[y]
}
const HALLS = new Set(['hall', 'hall2'])

// ---- block-state shorthands ----
const st = (m, f, half = 'bottom') => `${m}_stairs[facing=${f},half=${half},shape=straight]`
const sl = (m, t = 'bottom') => `${m}_slab[type=${t}]`
const td = (m, f, half, open) => `${m}_trapdoor[facing=${f},half=${half},open=${open}]`
const LANTERN = 'lantern[hanging=true]'
const CHAIN_Y = 'iron_chain[axis=y]'
const LG = 'light_gray_concrete'
const OPP = { north: 'south', south: 'north', east: 'west', west: 'east' }
const RIGHT = { north: 'east', east: 'south', south: 'west', west: 'north' }  // the player's right when facing this way

module.exports = (b) => {
  const drops = []
  const own = new Map() // M4's own blocks, so the lighting pass never depends on what other modules put in the Build
  const S = (x, y, z, s) => { if (mine(x, y, z)) { b.set(x, y, z, s); own.set(`${x},${y},${z}`, s) } else drops.push(`${x},${y},${z} ${s}`) }
  const F = (x1, y1, z1, x2, y2, z2, s) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, typeof s === 'function' ? s(x, y, z) : s)
  }
  const W = (x, y, z) => pick(x, y, z, MIX.white)
  const pendant = (x, z, yTop, len = 1) => { for (let i = 0; i < len; i++) S(x, yTop - i, z, CHAIN_Y); S(x, yTop - len, z, LANTERN) }
  const ironDoor = (x, y, z, facing, hinge, open = true) => {
    if (!mine(x, y, z) || !mine(x, y + 1, z)) { drops.push(`door ${x},${y},${z}`); return }
    door({ set: S }, x, y, z, facing, hinge, open)
  }
  // a pair of doors in cells p (two cells along the wall), hinges on the outer edges
  const ironDouble = (cells, y, facing, open = true) => {
    const R = RIGHT[facing], d = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] }[R]
    const score = ([x, z]) => x * d[0] + z * d[1]
    const [p0, p1] = [...cells].sort((a, c) => score(c) - score(a)) // p0 = the one further right
    ironDoor(p0[0], y, p0[1], facing, 'right', open)
    ironDoor(p1[0], y, p1[1], facing, 'left', open)
  }
  const roomCells = (lvl, id) => [...roomMap[lvl]].filter(([, r]) => r.id === id).map(([k]) => k.split(',').map(Number))
  const isRoom = (lvl, x, z, id) => { const r = roomAt(lvl, x, z); return !!r && (!id || r.id === id) }

  // ---- floors, walls, ceiling/L2 slab ----
  const floorG = {
    // polished andesite (jail-spec 4.8), the walkway from the exterior door marked out in yellow and paved smooth stone
    workshop: (x, z) => (z === 64 || z === 69) && x <= 56 ? 'yellow_concrete' : (x === 56 && (z < 64 || z > 69)) ? 'yellow_concrete'
      : (z >= 65 && z <= 68 && x <= 55) ? 'smooth_stone' : 'polished_andesite',
    laundry: (x, z) => (x % 4 === 0 || z % 4 === 0) ? LG : 'white_concrete',
    lockers: (x, z) => (z >= 99 && z <= 102) ? 'polished_andesite' : (((x >> 1) + (z >> 1)) & 1) ? 'smooth_stone' : 'polished_andesite',
    so: (x, z) => (x % 4 === 0 || z % 4 === 0) ? 'smooth_stone' : LG,
    closet: () => 'smooth_stone',
    hallC: (x, z) => (z >= 116 && z <= 118) ? (x >= 75 ? 'red_concrete' : 'orange_concrete') : 'gray_concrete',
    gym: () => 'oak_planks',
    showers: (x, z) => ((x + z) & 1) ? 'white_concrete' : LG,
    chapel: (x, z) => x <= 50 ? ((((x + z) & 1) ? 'smooth_quartz' : 'quartz_bricks')) : (z === 195 || z === 218 || x === 51) ? 'dark_oak_planks' : 'spruce_planks',
    storage: (x, z) => (x >= 76) ? 'polished_andesite' : (x === 75 ? 'yellow_concrete' : 'smooth_stone'),
    hallN: (x, z) => (x >= 92 && x <= 94) ? 'orange_concrete' : 'gray_concrete',
    class: (x, z) => (x % 4 === 0 || z % 4 === 0) ? 'cut_sandstone' : 'smooth_sandstone',
    library: (x, z) => (x >= 127 ? (((x + z) % 5 === 0) ? 'stripped_birch_wood[axis=y]' : 'birch_planks') : 'birch_planks')
  }
  // y 72 seen from below: per G room (or Hall B/stairwell below, x 79..89, z 103..192)
  const hallBCeil = (x, z) => z % 8 === 0 ? 'white_concrete' : 'orange_terracotta'
  const ceilG = {
    hallN: (x, z) => z % 8 === 0 ? 'white_concrete' : (x >= 92 && x <= 94 && z % 6 === 3) ? 'ochre_froglight[axis=y]' : 'orange_terracotta',
    hallC: (x, z) => x % 8 === 0 ? 'white_concrete' : (z >= 116 && z <= 118 && x % 6 === 3) ? 'ochre_froglight[axis=y]' : 'orange_terracotta',
    laundry: (x, z) => ((x === 68 || x === 76 || x === 84) && z % 7 === 1) ? 'sea_lantern' : (((x / 3 | 0) + (z / 3 | 0)) & 1) ? 'smooth_quartz' : 'white_concrete',
    so: (x, z) => (x === 71 && [90, 91, 92, 96, 97, 98, 102, 103, 104, 108, 109, 110].includes(z)) ? 'sea_lantern' : (((x >> 1) + (z >> 1)) & 1) ? 'smooth_quartz' : 'white_concrete',
    closet: (x, z) => (x === 84 && z === 95) ? 'sea_lantern' : 'white_concrete',
    class: (x, z) => ([103, 110, 117, 124, 131].includes(x) && [51, 59, 67, 75, 83].includes(z)) ? 'sea_lantern' : (x % 4 === 0 || z % 4 === 0) ? 'smooth_quartz' : 'white_concrete',
    library: (x, z) => (([103, 111, 119, 127, 135].includes(x) && [92, 100, 108, 116, 124, 131].includes(z)) || (x === 99 && (z === 120 || z === 128))) ? 'ochre_froglight[axis=y]' : (z % 4 === 0 ? 'stripped_birch_wood[axis=x]' : 'birch_planks')
  }
  const ceilDefault = (x, z) => z % 8 === 0 ? 'white_concrete' : 'orange_terracotta' // the split rooms match M2's orange low roof
  const carpetL2 = {
    corr: (x, z) => (x >= 92 && x <= 94) ? 'orange_carpet' : 'gray_carpet',
    cross: (x, z) => (z >= 101 && z <= 103) ? 'orange_carpet' : 'gray_carpet',
    lounge: (x, z) => (x >= 61 && x <= 68 && z >= 51 && z <= 60) ? ((x === 61 || x === 68 || z === 51 || z === 60) ? 'orange_carpet' : 'brown_carpet') : 'light_gray_carpet',
    records: (x, z) => 'light_gray_carpet',
    archive: (x, z) => (x >= 71 && x <= 76) ? 'blue_carpet' : 'gray_carpet',
    visit: (x, z) => z <= 164 ? ((x >= 72 && x <= 75) ? 'blue_carpet' : 'light_gray_carpet') : 'gray_carpet',
    ante: (x, z) => (x === 104 || x === 105) ? 'light_blue_carpet' : 'gray_carpet',
    warden: (x, z) => (x >= 120 && x <= 136 && z >= 97 && z <= 119) ? ((x === 120 || x === 136 || z === 97 || z === 119) ? 'yellow_carpet' : 'red_carpet') : 'light_gray_carpet',
    control: (x, z) => (z >= 65 && z <= 68) ? 'light_gray_carpet' : 'gray_carpet'
  }

  for (const [lvl, L] of Object.entries(LV)) {
    for (let x = 41; x <= 142; x++) for (let z = 45; z <= 245; z++) {
      if (!mine(x, L.y1, z)) continue
      const r = roomAt(lvl, x, z)
      if (r) continue
      const isDoor = doorCells[lvl].has(`${x},${z}`)   // a doorway: only the wall above its lintel (the door pass does the rest)
      // a wall cell: find the room it faces (4-neighbours), prefer halls
      let face = null, dir = null
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = roomAt(lvl, x + dx, z + dz)
        if (n && (!face || (HALLS.has(n.style) && !HALLS.has(face.style)))) { face = n; dir = dx ? 'x' : 'z' }
      }
      const pil = !isDoor && face && HALLS.has(face.style) && ((dir === 'x' && z % 8 === 0) || (dir === 'z' && x % 8 === 0))
      for (let y = isDoor ? L.y1 + 5 : L.y1; y <= L.y2; y++) {
        let s = null
        if (pil) s = 'quartz_pillar[axis=y]'
        else if (face) s = FACE[face.style](y, x, z) || null
        S(x, y, z, s || W(x, y, z))
      }
      if (lvl === 'G' && !isDoor) S(x, 64, z, LG)
    }
  }
  // G floors
  for (const [k, r] of roomMap.G) { const [x, z] = k.split(',').map(Number); S(x, 64, z, floorG[r.id](x, z)) }
  for (const k of doorCells.G) { const [x, z] = k.split(',').map(Number); S(x, 64, z, LG) }
  // y 72: the G ceiling and the L2 floor
  for (let x = 41; x <= 142; x++) for (let z = 45; z <= 245; z++) {
    if (!mine(x, 72, z) || inHole(x, z)) continue
    const g = roomAt('G', x, z), l2 = roomAt('L2', x, z)
    let s
    if (x >= 79 && x <= 89 && z >= 103 && z <= 192) s = hallBCeil(x, z)
    else if (g) s = (ceilG[g.id] || ceilDefault)(x, z)
    else if (!l2 && !doorCells.L2.has(`${x},${z}`)) s = W(x, 72, z)
    else s = 'white_concrete'
    S(x, 72, z, s)
  }
  // L2 carpets
  for (const [k, r] of roomMap.L2) { const [x, z] = k.split(',').map(Number); if (!inHole(x, z)) S(x, 73, z, carpetL2[r.id](x, z)) }

  // ---- doorways ----
  for (const d of DOORS) {
    const L = LV[d.lvl], y1 = L.y1
    const cells = []
    for (let w = d.w[0]; w <= d.w[1]; w++) for (let a = d.a[0]; a <= d.a[1]; a++) cells.push(d.axis === 'x' ? [w, a] : [a, w])
    // lintel and the wall above the opening; the frame is gray_concrete like M2's doorways (and the game's dark frames)
    for (const [x, z] of cells) S(x, y1 + 4, z, 'gray_concrete')
    // jambs: the wall cells beside the opening, both layers, y1..y1+4
    for (let w = d.w[0]; w <= d.w[1]; w++) for (const a of [d.a[0] - 1, d.a[1] + 1]) {
      const [x, z] = d.axis === 'x' ? [w, a] : [a, w]
      if (!roomAt(d.lvl, x, z)) for (let y = y1; y <= y1 + 4; y++) S(x, y, z, 'gray_concrete')
    }
    if (d.kind === 'iron') {
      const dc = cells.filter(([x, z]) => (d.axis === 'x' ? x : z) === d.at)
      for (const [x, z] of dc) { S(x, y1 + 2, z, 'glass_pane'); S(x, y1 + 3, z, 'glass_pane') }
      if (dc.length === 2) ironDouble(dc, y1, d.facing)
      else for (const [x, z] of dc) ironDoor(x, y1, z, d.facing, 'left')
    }
    if (d.lvl === 'L2') for (const [x, z] of cells) if (!(d.kind === 'iron' && (d.axis === 'x' ? x : z) === d.at)) S(x, 73, z, 'gray_carpet')
  }

  // beam under the upper block's west wall (x 58..59) and south wall (z 191..192), where a G room lies below
  for (let x = 58; x <= 78; x++) for (let z = 47; z <= 192; z++) {
    if (!((x === 58 || x === 59) || (z >= 191 && x >= 58))) continue
    if (roomAt('G', x, z) && !doorCells.G.has(`${x},${z}`)) S(x, 71, z, LG)
  }

  // ======================================================================================
  // G FURNITURE
  // ======================================================================================

  // ---- Workshop (plate shop) x 43..61, z 47..85; exterior door x 42 z 66..67, laundry door x 62..63 z 75..76 ----
  {
    const tools = ['smithing_table', 'stonecutter[facing=south]', 'anvil[facing=east]', 'grindstone[face=floor,facing=south]', 'crafting_table']
    for (const [zr, off] of [[51, 0], [58, 2]]) for (let x = 45; x <= 54; x++) {
      let s = tools[(x - 45 + off) % tools.length]
      if (zr === 58) s = s.replace('facing=south', 'facing=north')
      S(x, 65, zr, s)
    }
    // pallets of stamped plates between the rows
    for (const x0 of [46, 51]) for (let x = x0; x <= x0 + 2; x++) for (const z of [54, 55]) {
      S(x, 64, z, 'spruce_planks')
      const hgt = 1 + (h(x, 65, z) % 2)
      for (let y = 65; y < 65 + hgt; y++) S(x, y, z, 'iron_block')
      S(x, 65 + hgt, z, td('iron', 'north', 'bottom', false))
    }
    // conveyor (belt = black carpet on a smooth stone bed) with two presses over it
    for (let x = 45; x <= 54; x++) { S(x, 65, 77, sl('smooth_stone', 'top')); S(x, 66, 77, 'black_carpet') }
    S(44, 65, 77, 'iron_block'); S(55, 65, 77, 'iron_block'); S(44, 66, 77, 'iron_trapdoor[facing=north,half=bottom,open=false]')
    for (const x of [47, 52]) {
      F(x, 65, 76, x, 67, 76, 'andesite_wall'); F(x, 65, 78, x, 67, 78, 'andesite_wall')
      F(x, 68, 76, x, 68, 78, 'polished_andesite'); S(x, 67, 77, 'piston[facing=down,extended=false]')
    }
    // finished-plate shelves on the south wall, barrels under
    for (let x = 45; x <= 54; x++) { S(x, 65, 85, 'barrel[facing=up,open=false]'); S(x, 67, 85, 'spruce_shelf[facing=north,powered=false,side_chain=unconnected]') }
    // pegboard of tools on the east wall (against x 62)
    F(61, 66, 49, 61, 67, 53, td('iron', 'west', 'bottom', true))
    S(61, 65, 49, 'barrel[facing=west,open=false]'); S(61, 65, 53, 'barrel[facing=west,open=false]')
    // paint corner with hazard stripes, a cauldron of paint
    for (let x = 43; x <= 47; x++) for (let z = 81; z <= 85; z++) if (x >= 45 || z <= 82) S(x, 64, z, ((x + z) & 1) ? 'yellow_concrete' : 'black_concrete')
    S(43, 65, 84, 'cauldron'); S(43, 65, 85, 'water_cauldron[level=3]')

    // lights: the lighting pass at the end (lanterns on chains)
  }

  // ---- Laundry x 64..87, z 47..85; doors: workshop x 62..63 z 75..76, Hall N x 88..89 z 70..71 ----
  {
    // stacked washer/dryer units along the north wall
    for (let x = 66; x <= 85; x++) {
      if ((x - 66) % 5 === 4) { S(x, 65, 47, LG); S(x, 66, 47, LG) } else { S(x, 65, 47, 'blast_furnace[facing=south,lit=false]'); S(x, 66, 47, 'smoker[facing=south,lit=false]') }
    }
    // islands: top-loading washers (z 53..54) and dryers (z 60..61), back to back
    for (const [x1, x2] of [[67, 74], [77, 84]]) for (let x = x1; x <= x2; x++) {
      S(x, 65, 53, 'blast_furnace[facing=north,lit=false]'); S(x, 66, 53, td('iron', 'north', 'bottom', false))
      S(x, 65, 54, 'blast_furnace[facing=south,lit=false]'); S(x, 66, 54, td('iron', 'south', 'bottom', false))
      S(x, 65, 60, 'smoker[facing=north,lit=false]'); S(x, 66, 60, 'smoker[facing=north,lit=false]')
      S(x, 65, 61, 'smoker[facing=south,lit=false]'); S(x, 66, 61, 'smoker[facing=south,lit=false]')
      S(x, 67, 60, sl('smooth_stone')); S(x, 67, 61, sl('smooth_stone'))
    }
    // drying lines: a chain at y 70 with orange jumpsuits and white sheets on it
    for (const z of [57, 65]) for (let x = 64; x <= 87; x++) {
      S(x, 70, z, 'iron_chain[axis=x]')
      const v = h(x, 70, z) % 5
      if (v < 3 && x > 64 && x < 87) S(x, 71, z, v === 0 ? 'white_carpet' : v === 1 ? 'orange_carpet' : 'light_gray_carpet')
    }
    // folding tables with folded clothes
    for (const [x1, x2] of [[66, 72], [78, 84]]) for (let x = x1; x <= x2; x++) for (const z of [80, 81]) {
      S(x, 65, z, sl('smooth_stone', 'top'))
      const v = h(x, 66, z) % 4
      if (v === 0) S(x, 66, z, 'white_carpet'); else if (v === 1) S(x, 66, z, 'orange_carpet')
    }
    // laundry carts
    for (const [x, z] of [[75, 79], [76, 84], [86, 78], [65, 68], [86, 63]]) { S(x, 65, z, 'barrel[facing=up,open=false]'); S(x, 66, z, 'white_carpet') }
    // detergent shelves and sinks on the south wall
    for (let x = 65; x <= 71; x++) { S(x, 65, 85, 'barrel[facing=north,open=false]'); S(x, 67, 85, 'spruce_shelf[facing=north,powered=false,side_chain=unconnected]'); S(x, 69, 85, 'spruce_shelf[facing=north,powered=false,side_chain=unconnected]') }
    for (const x of [80, 82, 84]) { S(x, 65, 85, 'water_cauldron[level=3]'); S(x + 1, 65, 85, sl('smooth_stone', 'top')) }
    S(86, 65, 85, 'potted_fern')
  }

  // ---- Guard lockers (staff) x 43..61, z 88..112; exterior door x 42 z 100..101, Hall C door z 113..114 x 52..53 ----
  {
    const lockerRow = (cells, doorFacing, doff) => {
      for (const [x, z, i] of cells) {
        if (i % 4 === 3) { F(x, 65, z, x, 67, z, LG); S(x, 68, z, sl('smooth_stone')); continue }
        F(x, 65, z, x, 67, z, 'light_blue_concrete'); S(x, 68, z, sl('smooth_stone'))
        F(x + doff[0], 65, z + doff[1], x + doff[0], 67, z + doff[1], td('iron', doorFacing, 'bottom', true))
      }
    }
    const north = [], east = [], south = []
    for (let x = 44; x <= 59; x++) north.push([x, 88, x - 44])
    for (let z = 91; z <= 109; z++) east.push([61, z, z - 91])
    for (const x of [44, 45, 46, 47, 48, 49, 50, 55, 56, 57, 58, 59]) south.push([x, 112, x])
    lockerRow(north, 'south', [0, 1])
    lockerRow(east, 'west', [-1, 0])
    lockerRow(south, 'north', [0, -1])
    for (let x = 47; x <= 56; x++) { S(x, 65, 95, sl('spruce')); S(x, 65, 106, sl('spruce')) }
    S(44, 65, 95, LG); S(44, 66, 95, 'light_blue_stained_glass')                // water cooler
    S(44, 65, 106, 'water_cauldron[level=3]'); S(44, 65, 107, sl('smooth_stone', 'top'))
    S(44, 65, 90, 'potted_fern')
    // lights: the lighting pass
  }

  // ---- Security Office upper floor (staff, the 2023 look) x 64..78, z 88..112 ----
  {
    S(64, 64, 88, 'iron_trapdoor[facing=east,half=top,open=false]')            // the ladder hatch (jail-spec 2.3)
    S(65, 64, 88, 'yellow_concrete'); S(64, 64, 89, 'yellow_concrete'); S(65, 64, 89, 'black_concrete')
    for (let x = 69; x <= 73; x++) for (let z = 90; z <= 110; z++) S(x, 65, z, 'blue_carpet')
    // west wall: the big pink alert panel and a cyan side panel (sea lanterns in the wall face, glass in front)
    F(63, 65, 93, 63, 69, 100, 'black_concrete')
    for (let z = 94; z <= 99; z++) if (z !== 98) for (let y = 66; y <= 68; y++) { S(63, y, z, 'sea_lantern'); S(64, y, z, z === 99 ? 'cyan_stained_glass' : 'pink_stained_glass') }
    F(64, 65, 94, 65, 65, 99, 'blue_terracotta')                                 // navy bench under it
    F(63, 66, 104, 63, 69, 108, 'black_concrete')
    for (let z = 105; z <= 107; z++) for (let y = 67; y <= 68; y++) { S(63, y, z, 'sea_lantern'); S(64, y, z, 'cyan_stained_glass') }
    for (let z = 105; z <= 107; z++) S(64, 65, z, sl('smooth_stone', 'top'))
    S(65, 65, 106, st('polished_blackstone', 'east'))
    // east wall: the TV over a navy bench
    F(79, 65, 90, 79, 69, 97, 'black_concrete')
    for (let z = 91; z <= 96; z++) for (let y = 66; y <= 68; y++) { S(79, y, z, 'sea_lantern'); S(78, y, z, 'light_blue_stained_glass') }
    F(77, 65, 91, 78, 65, 96, 'blue_terracotta')
    // north wall: the camera desk (cyan monitors) and the baton rack
    F(71, 66, 87, 77, 69, 87, 'black_concrete')
    for (let x = 72; x <= 76; x++) { S(x, 67, 87, 'sea_lantern'); S(x, 68, 87, 'sea_lantern'); S(x, 67, 88, 'cyan_stained_glass'); S(x, 68, 88, 'cyan_stained_glass'); S(x, 65, 88, sl('smooth_stone', 'top')) }
    S(73, 65, 89, st('polished_blackstone', 'south')); S(75, 65, 89, st('polished_blackstone', 'south'))
    F(66, 66, 87, 68, 68, 87, LG)
    for (let x = 66; x <= 68; x++) { S(x, 68, 88, sl('polished_blackstone', 'top')); S(x, 67, 88, CHAIN_Y) }
    // light-blue table (like the 2023 office), weapon lockers by the south wall, a water cooler, plants
    for (let x = 75; x <= 77; x++) for (let z = 101; z <= 104; z++) { S(x, 65, z, sl('smooth_stone', 'top')); S(x, 66, z, 'light_blue_carpet') }
    for (const [x1, x2] of [[64, 67], [74, 78]]) for (let x = x1; x <= x2; x++) { F(x, 65, 112, x, 67, 112, 'light_blue_concrete'); F(x, 65, 111, x, 67, 111, td('iron', 'north', 'bottom', true)) }
    S(78, 65, 99, 'white_concrete'); S(78, 66, 99, 'light_blue_stained_glass')
    S(64, 65, 102, 'potted_fern'); S(78, 65, 109, 'potted_bamboo')
  }

  // ---- Supply closet x 81..87, z 88..102; door to Hall N x 88..89 z 94..95 ----
  {
    const cb = (f, i) => `chiseled_bookshelf[facing=${f},slot_0_occupied=${i % 2 === 0},slot_1_occupied=${i % 3 !== 0},slot_2_occupied=true,slot_3_occupied=${i % 2 === 1},slot_4_occupied=false,slot_5_occupied=${i % 3 === 0}]`
    for (let z = 89; z <= 101; z++) for (let y = 65; y <= 67; y++) S(81, y, z, (z >= 93 && z <= 96) ? cb('east', z + y) : `barrel[facing=east,open=false]`)
    for (let x = 82; x <= 86; x++) { S(x, 65, 88, 'barrel[facing=up,open=false]'); S(x, 66, 88, 'spruce_shelf[facing=south,powered=false,side_chain=unconnected]'); S(x, 68, 88, 'spruce_shelf[facing=south,powered=false,side_chain=unconnected]') }
    for (let x = 82; x <= 85; x++) { S(x, 65, 102, 'barrel[facing=north,open=false]'); if (x % 2) S(x, 66, 102, 'barrel[facing=up,open=false]') }
    S(86, 65, 102, 'water_cauldron[level=2]')
    for (const z of [89, 90, 91, 98, 99, 100, 101]) { S(87, 66, z, 'spruce_shelf[facing=west,powered=false,side_chain=unconnected]'); S(87, 68, z, 'spruce_shelf[facing=west,powered=false,side_chain=unconnected]'); S(87, 65, z, 'barrel[facing=west,open=false]') }
  }

  // ---- Hall C (closed staff corridor) x 43..78, z 115..119 ----
  {
    // lights: the lighting pass (tube lights on chains)
    for (let x = 59; x <= 61; x++) S(x, 65, 119, sl('smooth_quartz'))           // a bench between the piers (x % 8 == 0)
    S(58, 65, 119, 'potted_bamboo'); S(62, 65, 119, 'potted_bamboo')
    F(66, 66, 120, 68, 67, 120, 'brown_terracotta')                             // notice board
    S(76, 65, 115, 'water_cauldron[level=3]')
  }

  // ---- Gym x 43..78, z 122..160; door to Hall B x 79 z 140..141, showers z 161..162 x 70..71 ----
  {
    // half court: centre x 60, baseline z 124, half line z 146
    const line = (x, z) => S(x, 64, z, 'white_concrete')
    for (let x = 47; x <= 73; x++) { line(x, 124); line(x, 146) }
    for (let z = 124; z <= 146; z++) { line(47, z); line(73, z) }
    for (let z = 124; z <= 131; z++) { line(57, z); line(63, z) }
    for (let x = 57; x <= 63; x++) line(x, 131)
    for (let x = 58; x <= 62; x++) for (let z = 125; z <= 130; z++) S(x, 64, z, 'orange_terracotta')
    for (let x = 47; x <= 73; x++) for (let z = 124; z <= 146; z++) {
      const d1 = Math.hypot(x - 60, z - 131), d3 = Math.hypot(x - 60, z - 125), dc = Math.hypot(x - 60, z - 146)
      if ((z > 131 && Math.abs(d1 - 3) < 0.5) || (z >= 125 && Math.abs(d3 - 11) < 0.5) || (z < 146 && Math.abs(dc - 3.5) < 0.5)) line(x, z)
    }
    // the hoop on the north wall (face z 121)
    F(59, 68, 121, 61, 70, 121, 'white_concrete'); S(60, 69, 121, 'red_concrete'); S(60, 68, 122, 'hopper[facing=down]')
    // scoreboard
    F(66, 69, 121, 69, 70, 121, 'black_concrete'); S(67, 70, 121, 'red_concrete'); S(68, 70, 121, 'lime_concrete')
    // benches by the court
    for (let z = 125; z <= 136; z++) S(77, 65, z, sl('smooth_quartz'))
    for (let z = 145; z <= 147; z++) S(77, 65, z, sl('smooth_quartz'))
    S(77, 65, 143, 'water_cauldron[level=3]')
    // weights area: mats, bench presses, a dumbbell rack, punching bags, treadmills, a pull-up bar
    for (let x = 45; x <= 56; x++) for (let z = 149; z <= 158; z++) S(x, 65, z, 'black_carpet')
    for (const x of [48, 53]) {
      for (let z = 151; z <= 153; z++) S(x, 65, z, sl('polished_blackstone'))
      F(x - 1, 65, 151, x - 1, 66, 151, 'andesite_wall'); F(x + 1, 65, 151, x + 1, 66, 151, 'andesite_wall')
      for (let dx = -1; dx <= 1; dx++) S(x + dx, 67, 151, 'iron_chain[axis=x]')
      S(x - 2, 67, 151, 'heavy_core'); S(x + 2, 67, 151, 'heavy_core')
    }
    for (let x = 45; x <= 56; x++) { S(x, 65, 160, sl('polished_blackstone', 'top')); S(x, 66, 160, x % 2 ? 'heavy_core' : 'iron_chain[axis=x]') }
    S(44, 65, 160, 'andesite_wall'); S(57, 65, 160, 'andesite_wall')
    for (const x of [64, 68, 72]) { F(x, 69, 151, x, 71, 151, CHAIN_Y); F(x, 66, 151, x, 68, 151, 'brown_wool') }
    for (const x of [61, 64, 67]) {
      for (let z = 156; z <= 158; z++) S(x, 65, z, sl('polished_blackstone'))
      F(x, 65, 155, x, 66, 155, 'andesite_wall'); S(x, 67, 155, 'black_concrete')
    }
    F(75, 65, 150, 75, 68, 150, 'andesite_wall'); F(75, 65, 154, 75, 68, 154, 'andesite_wall'); F(75, 68, 151, 75, 68, 153, 'iron_chain[axis=z]')
    // high-bay lights
    // high-bay lights: the lighting pass
  }

  // ---- Inmate showers and lockers x 43..78, z 163..192; Hall B door x 79 z 176..177, gym door z 161..162 x 70..71 ----
  {
    // the shower island (a tiled partition) with stalls on both sides
    for (let z = 166; z <= 187; z++) for (let y = 65; y <= 70; y++) { S(50, y, z, ((y + z) & 1) ? 'white_concrete' : LG); S(51, y, z, ((y + z + 1) & 1) ? 'white_concrete' : LG) }
    for (const z of [166, 169, 172, 175, 178, 181, 184, 187]) for (let y = 65; y <= 67; y++) {
      for (let x = 47; x <= 49; x++) S(x, y, z, 'white_stained_glass_pane')
      for (let x = 52; x <= 54; x++) S(x, y, z, 'white_stained_glass_pane')
    }
    for (let zc = 167; zc <= 185; zc += 3) {
      S(49, 70, zc, 'lightning_rod[facing=down,powered=false]'); S(52, 70, zc, 'lightning_rod[facing=down,powered=false]')
      S(48, 64, zc + 1, td('iron', 'north', 'top', false)); S(53, 64, zc + 1, td('iron', 'north', 'top', false))
    }
    F(50, 71, 166, 51, 71, 187, 'iron_chain[axis=z]')                              // the supply pipe on top
    // inmate lockers on the north wall (orange), benches, sinks with a mirror strip on the south wall
    for (let x = 60; x <= 78; x++) {
      if (x >= 69 && x <= 72) continue
      if ((x - 60) % 4 === 3) { F(x, 65, 163, x, 67, 163, LG); continue }
      F(x, 65, 163, x, 67, 163, 'orange_terracotta'); F(x, 65, 164, x, 67, 164, td('iron', 'south', 'bottom', true))
    }
    for (let x = 62; x <= 75; x++) { S(x, 65, 170, sl('smooth_quartz')); S(x, 65, 182, sl('smooth_quartz')) }
    for (let x = 61; x <= 75; x++) S(x, 65, 192, (x % 2 === 0) ? 'water_cauldron[level=3]' : sl('smooth_stone', 'top'))
    F(61, 67, 193, 75, 68, 193, 'glass')
    for (const x of [62, 66, 70, 74]) S(x, 69, 192, 'end_rod[facing=north]')     // vanity lights over the mirror (under the beam's shadow)
    F(77, 67, 185, 77, 67, 189, 'iron_chain[axis=z]'); for (const z of [185, 187, 189]) S(77, 68, z, 'white_carpet')
    pendant(46, 190, 71, 2); pendant(56, 189, 71, 2)                              // the dark south end behind the island
    // lights: the lighting pass
  }

  // ---- Chapel x 44..78, z 195..218 (clipped); door x 79 z 201..202; a quartz lining at x 43 ----
  // M2's stained glass sits in the west face at z 197..198, 204..205 and 211..212 (y 66..69): the lining has a deep
  // reveal behind each window (open, with a corbelled head at y 70), and the altar is centred on the middle one.
  {
    const WIN = [197, 204, 211]                                                  // the north cell of each 2-wide window
    for (let z = 195; z <= 218; z++) {
      if (!mine(43, 65, z)) continue
      S(43, 65, z, 'smooth_quartz'); S(43, 71, z, 'smooth_quartz')
      const w = WIN.find(a => z === a || z === a + 1)
      for (let y = 66; y <= 69; y++) S(43, y, z, w ? 'air' : 'quartz_pillar[axis=y]')
      S(43, 70, z, w ? st('smooth_quartz', z === w ? 'north' : 'south', 'top') : (WIN.some(a => z === a - 1 || z === a + 2) ? 'chiseled_quartz_block' : 'quartz_pillar[axis=y]'))
    }
    // red carpet: in at the door (z 201..202), across the vestibule and down the middle aisle (z 204..205) to the rail
    for (let x = 74; x <= 78; x++) for (let z = 201; z <= 205; z++) S(x, 65, z, 'red_carpet')
    for (let x = 52; x <= 73; x++) for (const z of [204, 205]) S(x, 65, z, 'red_carpet')
    // pews (seats face west to the altar), kneelers in front, either side of the aisle
    for (const p of [54, 57, 60, 63, 66, 69]) for (const [z1, z2] of [[196, 202], [207, 213]]) for (let z = z1; z <= z2; z++) {
      S(p, 65, z, st('spruce', 'east'))
      S(p - 1, 65, z, td('spruce', 'east', 'bottom', false))
    }
    // communion rail with a gap, the altar with candles, candle stands, the pulpit
    for (let z = 198; z <= 211; z++) if (z !== 204 && z !== 205) S(51, 65, z, 'spruce_fence')
    for (let z = 203; z <= 206; z++) S(46, 65, z, z === 203 || z === 206 ? 'quartz_pillar[axis=z]' : 'chiseled_quartz_block')
    S(46, 66, 203, 'white_candle[candles=3,lit=true]'); S(46, 66, 206, 'white_candle[candles=3,lit=true]')
    S(46, 66, 204, 'white_candle[candles=1,lit=true]'); S(46, 66, 205, 'white_candle[candles=1,lit=true]')
    for (let z = 203; z <= 206; z++) S(47, 65, z, 'red_carpet')                  // the altar step's runner
    for (const z of [199, 210]) { S(45, 65, z, 'quartz_pillar[axis=y]'); S(45, 66, z, 'white_candle[candles=4,lit=true]') }
    S(49, 65, 200, 'lectern[facing=east]')
    S(44, 65, 196, 'potted_azalea_bush'); S(44, 65, 213, 'potted_flowering_azalea_bush')
    // the south aisle: a votive candle rack and a confessional (two booths, a lattice between, curtains)
    for (let x = 55; x <= 61; x++) { S(x, 65, 217, 'spruce_planks'); if (x % 2) S(x, 66, 217, `white_candle[candles=${1 + h(x, 66, 217) % 4},lit=true]`) }
    F(66, 65, 218, 70, 67, 218, 'dark_oak_planks'); F(66, 68, 215, 70, 68, 218, 'dark_oak_planks')
    for (const x of [66, 70]) F(x, 65, 215, x, 67, 217, 'dark_oak_planks')
    S(68, 65, 216, 'dark_oak_planks'); S(68, 65, 217, 'dark_oak_planks'); S(68, 66, 216, 'dark_oak_planks'); S(68, 66, 217, td('spruce', 'east', 'bottom', true)); S(68, 67, 216, 'dark_oak_planks'); S(68, 67, 217, 'dark_oak_planks')
    S(67, 65, 217, st('spruce', 'south')); S(69, 65, 217, st('spruce', 'south'))
    S(67, 67, 215, 'red_wool'); S(69, 67, 215, 'red_wool'); S(68, 67, 215, 'dark_oak_planks'); S(68, 66, 215, 'dark_oak_planks'); S(68, 65, 215, 'dark_oak_planks')
    // a chandelier over the altar (the rest: the lighting pass)
    pendant(47, 204, 71, 2)
  }

  // ---- Storage x 43..78, z 221..236 (clipped by the SW chamfer); door x 79 z 235..236 ----
  {
    const byShell = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => ringOf(inMain, 'm', x + dx, z + dz))
    const crate = (x, z) => {
      const v = h(x, 65, z)
      const n = byShell(x, z) ? 1 : 1 + v % 3                                 // 1 high against the shell: its windows start at y 66
      for (let y = 65; y < 65 + n; y++) {
        const c = h(x, y, z) % 4
        S(x, y, z, c === 0 ? 'barrel[facing=up,open=false]' : c === 1 ? 'stripped_oak_wood[axis=x]' : c === 2 ? 'packed_mud' : 'stripped_spruce_wood[axis=z]')
      }
    }
    for (const [z, x1, x2] of [[223, 56, 72], [224, 56, 72], [228, 64, 72], [229, 64, 72], [232, 71, 73]]) for (let x = x1; x <= x2; x++) if (isRoom('G', x, z, 'storage') && x % 6 !== 4) crate(x, z)
    for (let x = 52; x <= 74; x++) if (isRoom('G', x, 221, 'storage')) { S(x, 65, 221, 'barrel[facing=south,open=false]'); S(x, 66, 221, 'spruce_shelf[facing=south,powered=false,side_chain=unconnected]'); S(x, 68, 221, 'spruce_shelf[facing=south,powered=false,side_chain=unconnected]') }
    // shelving on the east wall (x 78) up to z 230, the way in from the infirmary door (z 233..236) kept clear; a cart
    for (let z = 223; z <= 230; z++) { S(78, 65, z, 'barrel[facing=west,open=false]'); S(78, 66, z, 'spruce_shelf[facing=west,powered=false,side_chain=unconnected]'); S(78, 68, z, 'spruce_shelf[facing=west,powered=false,side_chain=unconnected]') }
    S(75, 65, 226, 'barrel[facing=up,open=false]'); S(75, 66, 226, 'white_carpet')
    // lights: the lighting pass
  }

  // ---- Hall N x 90..96, z 48..133, the L2 stair at its south end ----
  {
    for (let x = 92; x <= 94; x++) S(x, 65, 47, sl('smooth_quartz'))             // a bench under M2's barred window
    S(90, 65, 47, 'potted_azalea_bush'); S(96, 65, 47, 'potted_flowering_azalea_bush')
    for (const [z1, z2] of [[74, 77], [98, 101]]) { for (let z = z1; z <= z2; z++) S(96, 65, z, sl('smooth_quartz')); S(96, 65, z1 - 1, 'potted_bamboo'); S(96, 65, z2 + 1, 'potted_bamboo') }
    for (let z = 82; z <= 86; z++) S(90, 65, z, sl('smooth_quartz'))             // benches between the piers (z % 8 == 0)
    S(90, 65, 81, 'potted_fern'); S(90, 65, 87, 'potted_fern')
    S(90, 65, 60, 'composter'); S(96, 65, 90, 'composter')
    F(97, 66, 81, 97, 67, 83, 'brown_terracotta')                             // notice board
    // the stair: 8 steps rising south, solid under each step
    for (let k = 1; k <= 8; k++) {
      const z = 122 + k, y = 64 + k
      for (let x = 90; x <= 96; x++) { S(x, y, z, st('polished_deepslate', 'south')); for (let yy = 65; yy < y; yy++) S(x, yy, z, 'smooth_quartz') }
    }
  }

  // ---- Classroom x 99..126 (+ the bulge's north triangle), z 47..85; door x 97..98 z 66..67 ----
  {
    // blackboard on the south wall (face z 86), dark oak frame, chalk tray
    F(104, 65, 86, 122, 70, 86, 'dark_oak_planks')
    for (let x = 105; x <= 121; x++) for (let y = 66; y <= 69; y++) {
      const v = h(x, y, 86) % 9
      S(x, y, 86, (y === 68 && x >= 107 && x <= 111) || (y === 67 && x >= 114 && x <= 119 && v < 6) || (y === 69 && v === 0) ? 'white_concrete' : 'black_concrete')
    }
    for (let x = 105; x <= 121; x++) S(x, 65, 85, sl('dark_oak', 'top'))
    // teacher's desk and chair
    S(110, 65, 81, 'dark_oak_planks'); S(114, 65, 81, 'dark_oak_planks')
    for (let x = 111; x <= 113; x++) S(x, 65, 81, sl('dark_oak', 'top'))
    S(110, 66, 81, 'potted_cactus'); S(112, 66, 81, 'black_stained_glass_pane'); S(113, 66, 81, 'black_stained_glass_pane'); S(114, 66, 81, 'lantern[hanging=false]')
    S(112, 65, 82, st('dark_oak', 'south'))
    // student desks facing the board
    for (const zd of [54, 60, 66, 72, 77]) for (const x of [103, 104, 108, 109, 115, 116, 120, 121]) { S(x, 65, zd, sl('oak', 'top')); S(x, 65, zd - 1, st('oak', 'north')) }
    // low bookshelves along the east face with plants
    for (let z = 48; z <= 72; z++) { S(126, 65, z, z % 4 === 0 ? 'chiseled_bookshelf[facing=west,slot_0_occupied=true,slot_1_occupied=true,slot_2_occupied=false,slot_3_occupied=true,slot_4_occupied=false,slot_5_occupied=true]' : 'bookshelf'); if (z % 6 === 2) S(126, 66, z, 'potted_fern') }
    S(124, 65, 48, 'spruce_fence'); S(124, 66, 48, 'light_blue_stained_glass')   // a globe
    // posters on the west wall
    for (const [z, c] of [[50, 'yellow'], [52, 'light_blue'], [77, 'lime'], [79, 'pink']]) F(98, 67, z, 98, 68, z, `${c}_terracotta`)
    // reading corner in the bulge's north triangle: a rug and bean bags
    for (let x = 124; x <= 135; x++) for (let z = 77; z <= 84; z++) if (isRoom('G', x, z, 'class')) S(x, 65, z, ((x + z) % 3 === 0) ? 'light_blue_carpet' : 'blue_carpet')
    for (const [x, z, c] of [[127, 80, 'red'], [130, 83, 'yellow'], [125, 83, 'lime'], [132, 84, 'light_blue']]) S(x, 65, z, `${c}_wool`)
  }

  // ---- Library x 99..126 + the bulge reading room x 127..140, z 88..133; doors: Hall N x 97..98 z 110..111, cafeteria x 104..105 z 134 ----
  {
    const cb = (f, x, y, z) => `chiseled_bookshelf[facing=${f},slot_0_occupied=${h(x, y, z) % 2 === 0},slot_1_occupied=true,slot_2_occupied=${h(x, y, z) % 3 !== 0},slot_3_occupied=${h(x, y, z) % 5 !== 0},slot_4_occupied=true,slot_5_occupied=${h(x, y, z) % 2 === 1}]`
    const stack = (x, z, f) => { for (let y = 65; y <= 67; y++) S(x, y, z, h(x, y, z) % 3 === 0 ? cb(f, x, y, z) : 'bookshelf'); S(x, 68, z, sl('dark_oak')) }
    for (const zr of [90, 94, 98, 121, 125]) for (let x = 106; x <= 124; x++) {
      if (x === 115) continue
      stack(x, zr, 'north'); stack(x, zr + 1, 'south')
    }
    // librarian's counter by the Hall N door
    for (let x = 100; x <= 104; x++) S(x, 65, 104, 'dark_oak_planks')
    S(104, 65, 102, 'dark_oak_planks'); S(104, 65, 103, 'dark_oak_planks')
    S(102, 65, 103, st('dark_oak', 'north'))
    S(100, 66, 104, 'lantern[hanging=false]'); S(102, 66, 104, 'black_stained_glass_pane'); S(103, 66, 104, 'black_stained_glass_pane'); S(104, 66, 102, 'potted_fern')
    // reading tables with chairs and lamps
    for (const x0 of [108, 114, 120]) for (const z0 of [106, 113]) {
      for (let x = x0; x <= x0 + 1; x++) for (let z = z0; z <= z0 + 3; z++) S(x, 65, z, sl('birch', 'top'))
      for (let z = z0; z <= z0 + 3; z++) { S(x0 - 1, 65, z, st('birch', 'west')); S(x0 + 2, 65, z, st('birch', 'east')) }
      S(x0, 66, z0 + 1, 'lantern[hanging=false]'); S(x0 + 1, 66, z0 + 2, 'lantern[hanging=false]')
    }
    for (const x of [109, 113, 117, 121]) S(x, 65, 130, 'lectern[facing=south]')
    // the arcade into the reading room
    for (const z of [89, 94, 99, 104, 109, 114, 119, 124]) F(126, 65, z, 126, 71, z, 'quartz_pillar[axis=y]')
    // reading room: a rug, armchairs round coffee tables, a sofa under the windows, floor lamps
    for (let x = 129; x <= 138; x++) for (let z = 95; z <= 118; z++) if (isRoom('G', x, z, 'library')) S(x, 65, z, (x === 129 || x === 138 || z === 95 || z === 118) ? 'orange_carpet' : 'brown_carpet')
    for (const z0 of [99, 112]) {
      for (let z = z0; z <= z0 + 1; z++) { S(133, 65, z, sl('spruce', 'top')); S(134, 65, z, sl('spruce', 'top')); S(131, 65, z, st('mangrove', 'west')); S(136, 65, z, st('mangrove', 'east')) }
      S(133, 66, z0, 'potted_cactus')
    }
    for (let z = 104; z <= 108; z++) S(140, 65, z, st('mangrove', 'east'))
    for (const [x, z] of [[130, 96], [137, 117], [138, 102], [138, 110], [130, 121]]) { S(x, 65, z, 'spruce_fence'); S(x, 66, z, 'spruce_fence'); S(x, 67, z, 'lantern[hanging=false]') }
    for (const [x, z] of [[128, 90], [139, 90], [128, 123], [134, 124]]) S(x, 65, z, 'potted_flowering_azalea_bush')
  }

  // ======================================================================================
  // L2
  // ======================================================================================

  // ---- the corridor over Hall N, the stair well, the landing ----
  {
    for (let x = 90; x <= 96; x++) S(x, 73, 120, 'andesite_wall')                // railing at the top of the stair
    for (let z0 = 50; z0 <= 90; z0 += 8) for (let z = z0; z <= z0 + 2; z++) S(93, 78, z, 'end_rod[facing=south]')
    S(93, 73, 47, 'potted_azalea_bush'); S(90, 73, 47, 'potted_fern'); S(96, 73, 47, 'potted_fern')
    for (let z = 77; z <= 79; z++) S(96, 73, z, sl('smooth_quartz'))
    for (let z = 109; z <= 111; z++) S(90, 73, z, sl('smooth_quartz'))
    for (const z of [65, 89, 106]) S(90, 73, z, 'potted_bamboo')
    S(90, 73, 86, 'white_concrete'); S(90, 74, 86, 'light_blue_stained_glass')     // water cooler
    pendant(93, 125, 78, 3); pendant(93, 129, 78, 2)                              // pendants in the stair well
    // a staff notice board on the landing's south wall (M2's solid cafeteria wall is right behind it)
    F(91, 74, 133, 95, 77, 133, 'spruce_planks'); F(92, 75, 133, 94, 76, 133, 'brown_terracotta')
    S(92, 76, 133, 'white_terracotta'); S(94, 75, 133, 'yellow_terracotta'); S(93, 75, 133, 'light_blue_terracotta')
  }
  // ---- the cross corridor ----
  {
    for (const [x1, x2] of [[61, 65], [79, 87]]) for (let x = x1; x <= x2; x++) S(x, 78, 102, 'end_rod[facing=east]')
    for (let x = 61; x <= 63; x++) S(x, 73, 104, sl('smooth_quartz'))
    S(60, 73, 100, 'potted_bamboo'); S(60, 73, 104, 'potted_bamboo'); S(81, 73, 100, 'potted_fern')
  }

  // ---- Staff lounge x 60..87, z 47..72 ----
  {
    // TV on the west wall over a low stand (kept under y 76: the upper block's ribbon windows are y 76..78)
    F(60, 73, 53, 60, 75, 58, 'black_concrete')
    for (let z = 54; z <= 57; z++) for (let y = 74; y <= 75; y++) { S(60, y, z, 'sea_lantern'); S(61, y, z, 'light_blue_stained_glass') }
    for (let z = 53; z <= 58; z++) S(61, 73, z, sl('dark_oak', 'top'))
    // U-shaped sofa facing the TV, coffee table
    for (let z = 53; z <= 58; z++) S(66, 73, z, st('mangrove', 'east'))
    for (let x = 63; x <= 65; x++) { S(x, 73, 52, st('mangrove', 'north')); S(x, 73, 59, st('mangrove', 'south')) }
    for (let x = 63; x <= 64; x++) for (let z = 55; z <= 56; z++) S(x, 73, z, sl('spruce', 'top'))
    S(63, 74, 55, 'potted_cactus')
    // kitchenette on the north wall
    for (let x = 72; x <= 85; x++) S(x, 73, 47, 'smooth_quartz')
    S(75, 73, 47, 'blast_furnace[facing=south,lit=false]'); S(78, 73, 47, 'water_cauldron[level=3]')
    S(80, 74, 47, 'brewing_stand'); S(82, 74, 47, 'decorated_pot'); S(73, 74, 47, 'smoker[facing=south,lit=false]')
    F(86, 73, 47, 87, 74, 48, 'iron_block')                                       // fridge
    // dining table with chairs
    for (let x = 74; x <= 77; x++) { for (const z of [53, 54]) S(x, 73, z, sl('spruce', 'top')); S(x, 73, 52, st('spruce', 'north')); S(x, 73, 55, st('spruce', 'south')) }
    S(75, 74, 53, 'lantern[hanging=false]')
    // pool table (green carpet on a dark oak top)
    for (let x = 74; x <= 78; x++) for (let z = 62; z <= 64; z++) { S(x, 73, z, sl('dark_oak', 'top')); S(x, 74, z, 'green_carpet') }
    // vending machines on the east wall
    for (const [z, c] of [[66, 'red_concrete'], [68, 'blue_concrete']]) {
      S(87, 73, z, c); S(86, 73, z, c); S(87, 74, z, 'sea_lantern'); S(87, 75, z, 'sea_lantern')
      S(86, 74, z, 'light_blue_stained_glass'); S(86, 75, z, 'light_blue_stained_glass'); S(86, 76, z, c); S(87, 76, z, c)
    }
    S(60, 73, 47, 'potted_fern'); S(60, 73, 73, 'potted_bamboo'); S(87, 73, 73, 'potted_fern')
    for (const x of [64, 72, 80]) for (const z of [51, 59, 67]) S(x, 78, z, 'sea_lantern')
  }

  // ---- Records x 60..87, z 75..97 ----
  {
    const cb = (f, x, y, z) => `chiseled_bookshelf[facing=${f},slot_0_occupied=true,slot_1_occupied=${h(x, y, z) % 2 === 0},slot_2_occupied=true,slot_3_occupied=${h(x, y, z) % 3 !== 0},slot_4_occupied=${h(x, y, z) % 4 !== 0},slot_5_occupied=true]`
    for (const zr of [78, 83, 88, 93]) for (let x = 61; x <= 71; x++) for (let y = 73; y <= 75; y++) {
      S(x, y, zr, h(x, y, zr) % 2 ? cb('north', x, y, zr) : 'bookshelf'); S(x, y, zr + 1, h(x, y, zr + 1) % 2 ? cb('south', x, y, zr + 1) : 'barrel[facing=south,open=false]')
    }
    for (const zd of [79, 85, 91]) {
      S(80, 73, zd, sl('spruce', 'top')); S(81, 73, zd, sl('spruce', 'top'))
      S(80, 74, zd, 'black_stained_glass_pane'); S(81, 74, zd, 'black_stained_glass_pane'); S(82, 73, zd, st('spruce', 'east'))
    }
    for (const z of [80, 81, 82, 83, 84, 88, 89, 90, 91, 92, 93, 94]) { S(87, 73, z, LG); S(87, 74, z, LG); S(87, 75, z, sl('smooth_stone')) }
    S(86, 73, 77, 'dropper[facing=up]'); S(85, 73, 77, 'crafter[orientation=north_up,crafting=false,triggered=false]')
    F(85, 73, 95, 86, 74, 96, 'iron_block')                                        // the records safe
    for (const [x, z] of [[66, 80], [66, 90], [80, 76], [80, 95]]) S(x, 78, z, 'sea_lantern')
  }

  // ---- Archive x 60..87, z 107..150 (under skylight S1) ----
  {
    const cb = (f, x, y, z) => `chiseled_bookshelf[facing=${f},slot_0_occupied=${h(x, y, z) % 2 === 0},slot_1_occupied=true,slot_2_occupied=true,slot_3_occupied=${h(x, y, z) % 3 === 0},slot_4_occupied=true,slot_5_occupied=${h(x, y, z) % 2 === 1}]`
    const shelf = (x, z, f, top = 76) => {
      for (let y = 73; y <= top; y++) { const v = h(x, y, z) % 5; S(x, y, z, v < 2 ? 'bookshelf' : v < 4 ? cb(f, x, y, z) : `barrel[facing=${f},open=false]`) }
      if (top === 76) S(x, 77, z, sl('dark_oak'))
    }
    for (const [z1, z2] of [[109, 128], [135, 145]]) for (let z = z1; z <= z2; z++) {
      for (const xr of [63, 67, 78, 82]) { shelf(xr, z, 'west'); shelf(xr + 1, z, 'east') }
      shelf(60, z, 'east', 75)                                                      // low under the west ribbon windows
      if (z < 130 || z > 133) shelf(87, z, 'west')
    }
    for (let x = 72; x <= 75; x++) for (let z = 140; z <= 142; z++) S(x, 73, z, sl('spruce', 'top'))
    S(72, 74, 140, 'lantern[hanging=false]'); S(75, 74, 142, 'lantern[hanging=false]'); S(73, 73, 144, 'cartography_table')
    for (const z of [139, 140, 141, 142, 143]) if (z >= 140 && z <= 142) { S(71, 73, z, st('spruce', 'west')); S(76, 73, z, st('spruce', 'east')) }
    for (const z of [112, 120, 128, 138, 146]) { S(61, 78, z, 'sea_lantern'); S(85, 78, z, 'sea_lantern') }
  }

  // ---- Visitation office x 60..87, z 150..190 ----
  {
    // waiting area chairs facing the service counter, a ticket stand and a notice board by the door from the archive
    for (const z of [154, 157, 160]) for (let x = 61; x <= 86; x++) if ((x >= 62 && x <= 70) || (x >= 77 && x <= 85)) S(x, 73, z, st('dark_oak', 'north'))
    S(76, 73, 151, 'polished_blackstone_wall'); S(76, 74, 151, 'red_concrete')
    F(66, 74, 149, 70, 75, 149, 'brown_terracotta'); for (const [x, y, c] of [[67, 75, 'white_terracotta'], [69, 74, 'yellow_terracotta'], [70, 75, 'white_terracotta']]) S(x, y, 149, c)
    // the service counter with glass partitions and teller gaps; the gate gap at x 73..74
    for (let x = 60; x <= 87; x++) {
      if (x === 73 || x === 74) continue
      S(x, 73, 165, 'smooth_quartz')
      if (x % 4 !== 2) { S(x, 74, 165, 'glass_pane'); S(x, 75, 165, 'glass_pane') }
    }
    // desks with computers behind
    for (const zd of [172, 180]) for (const x0 of [62, 67, 79, 84]) {
      S(x0, 73, zd, sl('spruce', 'top')); S(x0 + 1, 73, zd, sl('spruce', 'top'))
      S(x0, 74, zd, 'black_stained_glass_pane'); S(x0 + 1, 74, zd, 'black_stained_glass_pane')
      S(x0, 73, zd + 1, st('spruce', 'south'))
    }
    for (let x = 61; x <= 72; x++) { S(x, 73, 190, LG); S(x, 74, 190, LG); S(x, 75, 190, sl('smooth_stone')) }
    // a whiteboard schedule on the east wall (x 88)
    F(88, 74, 175, 88, 76, 182, 'calcite')
    for (let z = 176; z <= 181; z++) for (const y of [74, 75, 76]) if (h(88, y, z) % 3 === 0) S(88, y, z, (y === 76) ? 'red_terracotta' : 'light_blue_terracotta')
    S(60, 73, 150, 'potted_bamboo'); S(87, 73, 150, 'potted_bamboo'); S(87, 73, 190, 'potted_fern')
    S(86, 73, 167, 'white_concrete'); S(86, 74, 167, 'light_blue_stained_glass')
    for (const [x, z] of [[62, 157], [82, 157], [64, 170], [72, 170], [80, 170], [64, 184], [72, 184], [80, 184]]) S(x, 78, z, 'sea_lantern')
  }

  // ---- Warden's anteroom x 99..110, z 88..133 ----
  {
    for (let z = 99; z <= 105; z++) S(103, 73, z, 'dark_oak_planks')
    S(104, 73, 99, 'dark_oak_planks'); S(104, 73, 105, 'dark_oak_planks')
    S(104, 73, 102, st('dark_oak', 'east'))
    S(103, 74, 101, 'black_stained_glass_pane'); S(103, 74, 102, 'black_stained_glass_pane'); S(103, 74, 104, 'lantern[hanging=false]'); S(103, 74, 99, 'potted_flowering_azalea_bush')
    for (let z = 112; z <= 118; z++) S(99, 73, z, z === 115 ? sl('spruce', 'top') : st('dark_oak', 'west'))
    S(99, 74, 115, 'potted_cactus')
    for (let z = 89; z <= 97; z++) for (let y = 73; y <= 75; y++) S(110, y, z, (z + y) % 3 === 0 ? 'chiseled_bookshelf[facing=west,slot_0_occupied=true,slot_1_occupied=false,slot_2_occupied=true,slot_3_occupied=true,slot_4_occupied=false,slot_5_occupied=true]' : 'bookshelf')
    S(110, 73, 106, 'blue_banner[rotation=12]'); S(110, 73, 111, 'white_banner[rotation=12]')
    S(99, 73, 89, 'potted_fern'); S(110, 73, 132, 'potted_fern'); S(99, 73, 126, 'white_concrete'); S(99, 74, 126, 'light_blue_stained_glass')
    // a waiting corner at the south end: a sofa and armchairs round a low table, a tall plant
    for (let z = 121; z <= 124; z++) S(109, 73, z, st('mangrove', 'east'))
    for (let z = 122; z <= 123; z++) { S(107, 73, z, sl('spruce', 'top')); S(106, 73, z, sl('spruce', 'top')) }
    S(106, 73, 120, st('mangrove', 'north')); S(106, 73, 125, st('mangrove', 'south')); S(107, 74, 122, 'potted_cactus')
    S(101, 73, 130, 'potted_bamboo'); S(102, 73, 130, 'bookshelf'); S(103, 73, 130, 'bookshelf'); S(102, 74, 130, 'potted_fern')
    for (const z of [92, 100, 108, 116, 124]) S(104, 78, z, 'sea_lantern')
  }

  // ---- Warden's office x 113..140, z 88..133 (+ the bulge) ----
  {
    // bookcase wall on the north side with dark oak pilasters
    for (let x = 114; x <= 134; x++) {                                          // stops short of the bulge's windows
      if (!isRoom('L2', x, 88, 'warden')) continue
      for (let y = 73; y <= 76; y++) S(x, y, 88, x % 5 === 0 ? 'dark_oak_planks' : (h(x, y, 88) % 4 === 0 ? 'chiseled_bookshelf[facing=south,slot_0_occupied=true,slot_1_occupied=true,slot_2_occupied=false,slot_3_occupied=true,slot_4_occupied=true,slot_5_occupied=false]' : 'bookshelf'))
      S(x, 77, 88, sl('dark_oak'))
    }
    // the big desk, the Warden's chair, visitor chairs, a credenza and flags behind
    for (let z = 105; z <= 112; z++) { S(132, 73, z, 'dark_oak_planks'); S(133, 73, z, sl('dark_oak', 'top')) }
    S(132, 74, 106, 'lantern[hanging=false]'); S(132, 74, 109, 'black_stained_glass_pane'); S(132, 74, 110, 'black_stained_glass_pane'); S(132, 74, 112, 'potted_cactus')
    S(134, 73, 108, st('dark_oak', 'east')); S(130, 73, 107, st('dark_oak', 'west')); S(130, 73, 110, st('dark_oak', 'west'))
    for (let z = 104; z <= 112; z++) S(138, 73, z, sl('dark_oak', 'top'))
    S(138, 74, 105, 'potted_flowering_azalea_bush'); S(138, 74, 111, 'decorated_pot')
    S(136, 73, 103, 'blue_banner[rotation=4]'); S(136, 73, 113, 'white_banner[rotation=4]')
    // sofas round a coffee table
    for (let x = 122; x <= 128; x++) S(x, 73, 126, st('mangrove', 'south'))
    for (let z = 121; z <= 124; z++) S(121, 73, z, st('mangrove', 'west'))
    for (let x = 124; x <= 126; x++) for (let z = 122; z <= 123; z++) S(x, 73, z, sl('spruce', 'top'))
    S(125, 74, 122, 'potted_cactus')
    // the conference table on the west side (under skylight S3), chairs round it, table lamps
    for (let x = 115; x <= 117; x++) for (let z = 92; z <= 104; z++) S(x, 73, z, sl('dark_oak', 'top'))
    for (let z = 93; z <= 103; z += 2) { S(114, 73, z, st('dark_oak', 'west')); S(118, 73, z, st('dark_oak', 'east')) }
    S(116, 73, 91, st('dark_oak', 'north')); S(116, 73, 105, st('dark_oak', 'south'))
    S(116, 74, 95, 'lantern[hanging=false]'); S(116, 74, 101, 'lantern[hanging=false]'); S(115, 74, 98, 'black_stained_glass_pane'); S(117, 74, 98, 'potted_fern')
    // a trophy cabinet along the west wall, plaques above it on the wall (x 112)
    for (let z = 114; z <= 127; z++) {
      S(113, 73, z, z % 3 === 1 ? 'barrel[facing=east,open=false]' : 'dark_oak_planks')
      const v = h(113, 74, z) % 4
      if (z % 2 === 0) S(113, 74, z, v === 0 ? 'decorated_pot' : v === 1 ? 'potted_cactus' : v === 2 ? 'lantern[hanging=false]' : 'flower_pot')
      if (z % 3 === 2) S(112, 76, z, 'yellow_terracotta')                        // plaques above the band
    }
    // filing cabinets on the south wall beside the safe
    for (let x = 116; x <= 120; x++) { S(x, 73, 132, LG); S(x, 74, 132, LG); S(x, 75, 132, sl('smooth_stone')) }
    // the safe, a globe, plants
    F(114, 73, 131, 115, 74, 132, 'iron_block')
    S(137, 73, 124, 'spruce_fence'); S(137, 74, 124, 'light_blue_stained_glass')
    for (const [x, z] of [[114, 89], [138, 92], [117, 128], [133, 124]]) S(x, 73, z, 'potted_flowering_azalea_bush')
    for (const [x, z] of [[125, 96], [125, 118], [134, 99], [134, 117]]) pendant(x, z, 78)
  }

  // ---- Control room x 99..138, z 47..85 ----
  {
    // camera wall: the frame at z 85, sea lanterns behind the screens at z 86
    for (let x = 100; x <= 125; x++) for (let y = 73; y <= 78; y++) {
      const col = (x - 100) % 4 !== 0, row = y === 74 || y === 75 || y === 77
      if (col && row) {
        const v = h(x, y, 85) % 12
        S(x, y, 85, v === 0 ? 'light_blue_stained_glass' : (v === 1 && y === 77) ? 'red_stained_glass' : 'cyan_stained_glass')
        S(x, y, 86, 'sea_lantern')
      } else { S(x, y, 85, 'blue_concrete'); S(x, y, 86, 'blue_concrete') }
    }
    // consoles: iron desks with buttons and small screens, operators' chairs
    for (const [zc, x1, x2] of [[81, 101, 124], [74, 105, 119]]) for (let x = x1; x <= x2; x++) {
      if ((x - x1) % 6 === 5) continue
      S(x, 73, zc, 'iron_block')
      const v = h(x, 74, zc) % 4
      S(x, 74, zc, v === 0 ? 'stone_button[face=floor,facing=north,powered=false]' : v === 1 ? 'light_blue_stained_glass_pane' : v === 2 ? 'polished_blackstone_button[face=floor,facing=north,powered=false]' : 'black_stained_glass_pane')
      if ((x - x1) % 2 === 0) S(x, 73, zc - 1, st('polished_blackstone', 'north'))
    }
    // the map table: a little prison map in carpet
    for (let x = 109; x <= 115; x++) for (let z = 56; z <= 60; z++) {
      S(x, 73, z, sl('dark_oak', 'top'))
      const v = h(x, 74, z) % 5
      S(x, 74, z, (z === 58 || x === 112) ? 'gray_carpet' : v < 2 ? 'green_carpet' : v < 3 ? 'lime_carpet' : 'orange_carpet')
    }
    // server racks in the west corner (two rows facing an aisle)
    for (let z = 49; z <= 62; z++) for (let y = 73; y <= 75; y++) {
      S(99, y, z, (z + y) % 2 ? 'crafter[orientation=east_up,crafting=false,triggered=false]' : 'dropper[facing=east]')
      if (z >= 50 && z <= 61) S(102, y, z, (z + y) % 2 ? 'dropper[facing=west]' : 'crafter[orientation=west_up,crafting=false,triggered=false]')
    }
    for (let z = 50; z <= 61; z++) { S(100, 73, z, 'black_carpet'); S(101, 73, z, 'black_carpet') }
    // a low break corner in the bulge's north triangle (its chamfer windows stay clear)
    S(128, 73, 80, st('polished_blackstone', 'west')); S(128, 73, 81, st('polished_blackstone', 'west'))
    S(129, 73, 80, sl('spruce', 'top')); S(129, 73, 81, sl('spruce', 'top')); S(129, 74, 80, 'potted_cactus')
    S(127, 73, 83, 'potted_bamboo')
    S(99, 73, 48, 'potted_fern'); S(124, 73, 48, 'potted_fern'); S(99, 73, 84, 'potted_bamboo')
    for (const x of [104, 112, 120]) for (const z of [52, 60, 68, 76]) S(x, 78, z, 'sea_lantern')
    S(127, 78, 79, 'sea_lantern'); S(131, 78, 83, 'sea_lantern'); S(137, 78, 87, 'sea_lantern')
    S(138, 73, 88, 'potted_flowering_azalea_bush'); S(136, 73, 88, 'potted_bamboo')   // the nook by the NE chamfer window
  }

  // ======================================================================================
  // HALL PIERS: the Hall finish of M2's halls (jail-spec 4.2): smooth quartz piers 1 deep every 8 blocks, carrying the
  // skirting and the bands, under the ceiling's white beams. Hall N and its L2 corridor (not over the stair, not at the
  // cross-corridor junction), Hall C, the cross corridor.
  // ======================================================================================
  {
    const pierG = (x, y) => y === 65 ? 'orange_terracotta' : (y === 68 || y === 70) ? 'orange_concrete' : 'smooth_quartz'
    const pierL = (x, y) => y === 73 ? 'orange_terracotta' : (y === 75 || y === 77) ? 'orange_concrete' : 'smooth_quartz'
    const pier = (lvl, x, z) => { const L = LV[lvl]; if (!roomAt(lvl, x, z)) return; F(x, L.y1, z, x, L.y2, z, lvl === 'G' ? pierG : pierL) }
    for (let z = 56; z <= 120; z += 8) for (const x of [90, 96]) {
      pier('G', x, z)
      if (!(x === 90 && z >= 100 && z <= 104)) pier('L2', x, z)
    }
    for (const x of [48, 56, 64, 72]) for (const z of [115, 119]) pier('G', x, z)
    for (const x of [64, 72, 80, 88]) for (const z of [100, 104]) pier('L2', x, z)
  }

  // ======================================================================================
  // LIGHTING: per room a regular grid of visible fixtures (lanterns on chains, tube lights, ceiling panels), the
  // sparsest grid that brings ~80% of the floor to block light 6+ (light = level - Manhattan distance, walls ignored).
  // Only M4's own lights count, so the result never depends on other modules; cells under a skylight count as lit.
  // ======================================================================================
  {
    const LIGHT = [[/^(lantern|sea_lantern|ochre_froglight|pearlescent_froglight|verdant_froglight|shroomlight|glowstone)/, 15], [/^end_rod/, 14], [/_candle\[candles=(\d)[^\]]*lit=true/, 0]]
    const lightOf = (s) => { for (const [re, l] of LIGHT) { const m = re.exec(s); if (m) return l || 3 * Number(m[1]) } return 0 }
    const sky = (lvl, x, z) => (lvl === 'L2' && z >= 93 && z <= 161 && ((x >= 67 && x <= 77) || (x >= 89 && x <= 99) || (x >= 110 && x <= 120))) || inHole(x, z)
    const PLAN = {
      G: { workshop: 'pendant', laundry: 'tube-x', lockers: 'pendant', so: 'tube-z', closet: 'pendant', hallC: 'tube-x', gym: 'pendant', showers: 'pendant', chapel: 'pendant', storage: 'pendant', hallN: 'tube-z', class: 'tube-x', library: 'pendant' },
      L2: { corr: 'tube-z', cross: 'tube-x', lounge: 'panel', records: 'panel', archive: 'panel', visit: 'panel', ante: 'panel', warden: 'pendant', control: 'panel' }
    }
    const OPTS = { pendant: [[7, 7], [6, 6], [6, 5], [5, 5], [5, 4], [4, 4]], panel: [[7, 7], [6, 6], [6, 5], [5, 5], [4, 4]], tube: [[7, 7], [7, 6], [6, 6], [6, 5], [5, 5], [5, 4], [4, 4]] }
    for (const [lvl, rooms] of Object.entries(PLAN)) {
      const y0 = LV[lvl].y1, top = LV[lvl].y2 // the standing cell; the top clear cell (where fixtures hang from)
      for (const [id, kind] of Object.entries(rooms)) {
        const all = roomCells(lvl, id), cells = all.filter(([x, z]) => !sky(lvl, x, z))
        if (!cells.length) continue
        const inRoom = new Set(all.map(([x, z]) => `${x},${z}`))
        const base = []
        for (const [k, s] of own) { const [x, y, z] = k.split(',').map(Number); if (y >= y0 - 1 && y <= top + 1 && inRoom.has(`${x},${z}`)) { const l = lightOf(s); if (l) base.push([x, y, z, l]) } }
        const coverage = (srcs) => cells.filter(([x, z]) => { for (const [lx, ly, lz, l] of srcs) if (l - Math.abs(lx - x) - Math.abs(ly - y0) - Math.abs(lz - z) >= 6) return true; return false }).length / cells.length
        if (coverage(base) >= 0.8) continue
        const xs0 = all.map(c => c[0]), zs0 = all.map(c => c[1])
        const [minX, maxX, minZ, maxZ] = [Math.min(...xs0), Math.max(...xs0), Math.min(...zs0), Math.max(...zs0)]
        const tube = kind.startsWith('tube'), ax = kind === 'tube-x'
        // the blocks of one fixture centred on (x, z), or null where it doesn't fit
        const fixture = (x, z, used) => {
          const freeAt = (cx, cy, cz) => inRoom.has(`${cx},${cz}`) && mine(cx, cy, cz) && !own.has(`${cx},${cy},${cz}`) && !used.has(`${cx},${cy},${cz}`)
          if (kind === 'pendant') return lvl === 'G'
            ? (freeAt(x, top, z) && freeAt(x, top - 1, z) && freeAt(x, top - 2, z) && freeAt(x, top - 3, z) ? [[x, top, z, CHAIN_Y, 0], [x, top - 1, z, CHAIN_Y, 0], [x, top - 2, z, LANTERN, 15]] : null)
            : (freeAt(x, top, z) && freeAt(x, top - 1, z) ? [[x, top, z, CHAIN_Y, 0], [x, top - 1, z, LANTERN, 15]] : null)
          if (kind === 'panel') return freeAt(x, top, z) ? [[x, top, z, 'sea_lantern', 15]] : null
          const run = [-1, 0, 1].map(i => ax ? [x + i, z] : [x, z + i]), yRod = lvl === 'G' ? top - 2 : top
          if (!run.every(([cx, cz]) => freeAt(cx, yRod, cz) && (lvl === 'L2' || (freeAt(cx, top, cz) && freeAt(cx, top - 1, cz) && freeAt(cx, top - 3, cz))))) return null
          const out = run.map(([cx, cz]) => [cx, yRod, cz, `end_rod[facing=${ax ? 'east' : 'south'}]`, 14])
          if (lvl === 'G') for (const e of [run[0], run[2]]) out.push([e[0], top, e[1], CHAIN_Y, 0], [e[0], top - 1, e[1], CHAIN_Y, 0])
          return out
        }
        const grid = ([sa, sc]) => {
          const [sx, sz] = tube && !ax ? [sc, sa] : [sa, sc]
          const cx = Math.round((minX + maxX) / 2), cz = Math.round((minZ + maxZ) / 2)
          const pts = []
          for (let x = cx - Math.floor((cx - minX - 1) / sx) * sx; x <= maxX - 1; x += sx) for (let z = cz - Math.floor((cz - minZ - 1) / sz) * sz; z <= maxZ - 1; z += sz) pts.push([x, z])
          const used = new Set(), out = []
          for (const [x, z] of pts) {
            if (sky(lvl, x, z)) continue
            for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const f = fixture(x + dx, z + dz, used)
              if (f) { for (const [fx, fy, fz] of f) used.add(`${fx},${fy},${fz}`); out.push(...f); break }
            }
          }
          return out
        }
        const opts = OPTS[tube ? 'tube' : kind]
        let pickd = null
        for (const o of opts) { const g = grid(o); pickd = g; const cv = coverage([...base, ...g.filter(f => f[4]).map(([x, y, z, , l]) => [x, y, z, l])]); if (cv >= 0.8) break }
        for (const [x, y, z, s] of pickd) S(x, y, z, s)
      }
    }
  }

  module.exports._drops = drops
}
module.exports.labels = []
// the escape (ESCAPE-SPEC Appendix B, M4): the C4 parts' search spots, the bench, the Security Office's hatch
module.exports.points = {
  SEARCH_PUTTY: [61, 65, 53, 0],
  SEARCH_WIRES: [81, 65, 90, 0],
  ASSEMBLE: [49, 65, 51, 0],
  ASSEMBLE_STAND: [49.5, 65, 52.5, 180],
  T_SO_HATCH: [64, 64, 88, 0],
  SO_UP: [64.5, 65, 89.5, 0],
  // Sparks and his weapon parts (2026-10-20, prison round 3): he stands behind the old C4 bench facing south across it;
  // the parts are searched at blocks already built: the gym's dumbbell rack (a heavy core), the storage room's east shelf
  // barrel, a laundry cart (a barrel under a white carpet).
  SPARKS: [49.5, 65, 49.5, 0],
  SEARCH_SCRAP: [47, 66, 160, 0],
  SEARCH_TAPE: [78, 65, 227, 0],
  SEARCH_HANDLE: [86, 65, 63, 0]
}
module.exports._mine = mine
module.exports._roomAt = (lvl, x, z) => { const r = roomAt(lvl, x, z); return r ? r.id : null }
