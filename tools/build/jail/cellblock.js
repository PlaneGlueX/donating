// M3 of the Jailbreak prison (jail-spec sections 5 and 7.1): B1, the cell level under the main building, and the
// tutorial vent. The cell wings and the cross corridor, the guard post (keycard desk), the main corridor, Rusty's cell,
// the Security Office lower floor (tutorial room), the showers, storage and boiler room, the landing and the stair
// steps up to G, and the vent: the mouth, the crawl, the walk tunnel under the lane and the west wall, the shaft and its
// hatch outside. Regions: B1 x 43..126, y 50..63, z 47..113; DUCT x -2..42, y 55..61, z 82..86; EXIT x -7..-3,
// y 55..68, z 82..86. Natural stone and dirt stay around the dug rooms; every visible wall is set explicitly.
// The escape rework (ESCAPE-SPEC 3.2, 2026-10-14): B1's west wing is the controls course (hurdles, signs); the crawl
// turns north into the boiler room, a broken wall leads on into Rusty's cell, and the walk tunnel and its shaft are
// sealed (grass over the old hatch).

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

void inMain; void ring; void inUpper; void line4 // COMMON helpers M3 doesn't need

// ---- M3 layout (jail-spec 5.2) ----
const NORTH_CELLS = [46, 53, 60, 67, 74, 89, 96, 103, 110] // north row x0 (front z 55); slot 117 is the MAX SECURITY gate
const SOUTH_CELLS = [46, 53, 60, 67, 96, 103, 110, 117] // south row x0 (front z 64)
const inCross = (x, z) => x >= 45 && x <= 123 && z >= 56 && z <= 63 // the cross corridor (cell wings) with the junction
const inMainC = (x, z) => x >= 80 && x <= 88 && z >= 64 && z <= 99 // the main corridor
const inLanding = (x, z) => x >= 80 && x <= 88 && z >= 100 && z <= 105
const inStair = (x, z) => x >= 80 && x <= 88 && z >= 106 && z <= 111
const inC = (x, z) => inCross(x, z) || inMainC(x, z) || inLanding(x, z) || inStair(x, z)
const inJunction = (x, z) => x >= 80 && x <= 88 && z >= 56 && z <= 63

module.exports = (b) => {
  const set = (x, y, z, s) => b.set(x, y, z, s)
  // a box (corners inclusive); s is a state or a function (x, y, z) -> state
  const F = (x1, y1, z1, x2, y2, z2, s) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) set(x, y, z, typeof s === 'function' ? s(x, y, z) : s)
  }
  const AIR = 'air'
  const brick = (x, y, z) => pick(x, y, z, MIX.brick)
  const navy = (x, y, z) => pick(x, y, z, MIX.navy)
  const groove = n => (n % 2 ? 'deepslate_tiles' : 'polished_deepslate') // dark grooved metal rows
  // corridor wall rows: brick, the orange band at y 61 and the white band at y 62, the ceiling border at y 63
  const cwall = (x, y, z) => y === 61 ? 'orange_concrete' : y === 62 ? 'smooth_quartz' : y === 63 ? 'polished_deepslate' : brick(x, y, z)
  const tile = (x, y, z) => (y === 58 || y === 61) ? 'light_gray_concrete' : (h(x, y, z) < 25 ? 'smooth_quartz' : 'white_concrete') // shower tiles
  const bars = 'iron_bars'

  // ===== 1. Corridors: the cross corridor, the junction, the main corridor, the landing and the stair (5.1, 5.2) =====
  // dig
  for (let x = 45; x <= 123; x++) for (let z = 56; z <= 111; z++) if (inC(x, z) && !inStair(x, z)) F(x, 58, z, x, 62, z, AIR)
  F(80, 63, 104, 88, 63, 105, AIR) // no ceiling over the stair opening (M2 leaves y 64 open over z 104..111)

  // walls: every column touching a corridor (8-neighbour) inside B1, rows y 57..63 (z 112 is under M2's top step: left as ground)
  for (let x = 43; x <= 126; x++) for (let z = 47; z <= 111; z++) {
    if (inC(x, z)) continue
    let near = false
    for (let dx = -1; dx <= 1 && !near; dx++) for (let dz = -1; dz <= 1; dz++) if (inC(x + dx, z + dz)) { near = true; break }
    if (near) F(x, 57, z, x, 63, z, cwall)
  }

  // floors (y 57): a brick border along each wall, dark grooved metal rows, the orange runner
  for (let x = 45; x <= 123; x++) for (let z = 56; z <= 105; z++) {
    let s = null
    if (inCross(x, z)) {
      if (x === 45 || x === 123) s = brick(x, 57, z) // the brick border along the end walls
      else if (z >= 58 && z <= 61) s = 'orange_concrete' // the 4-wide runner
      else if (inJunction(x, z)) {
        if (x >= 82 && x <= 86 && z >= 62) s = 'orange_concrete' // the main runner joins the cross runner
        else if (z === 56 && (x === 80 || x === 88)) s = brick(x, 57, z)
        else s = groove(x)
      } else if (z === 56 || z === 63) s = brick(x, 57, z)
      else s = groove(x) // rows across the corridor, alternating along it
    } else if (inMainC(x, z)) {
      if (x === 80 || x === 88) s = brick(x, 57, z)
      else if (x >= 82 && x <= 86) s = 'orange_concrete' // the 5-wide runner
      else s = groove(z)
    } else if (inLanding(x, z)) s = groove(z)
    if (s) set(x, 57, z, s)
  }
  // yellow chevrons in the runners, pointing back toward the stair: east in the west wing, west in the east wing, south in the main corridor
  const chevX = (x0, dir) => { // ">" (dir 1) or "<" (dir -1), 3 long, in the cross runner z 58..61
    for (let i = 0; i < 3; i++) for (let z = 58; z <= 61; z++) {
      const outer = z === 58 || z === 61
      const k = dir > 0 ? i : 2 - i
      if (outer ? k <= 1 : k >= 1) set(x0 + i, 57, z, 'yellow_concrete')
    }
  }
  for (const x0 of [55, 58, 67, 70]) chevX(x0, 1)
  for (const x0 of [96, 99, 108, 111]) chevX(x0, -1)
  const chevZ = z0 => { // "V", 4 long, in the main runner x 82..86
    for (const [dz, xs] of [[0, [82, 86]], [1, [82, 83, 85, 86]], [2, [83, 84, 85]], [3, [84]]]) for (const x of xs) set(x, 57, z0 + dz, 'yellow_concrete')
  }
  for (const z0 of [69, 73, 88, 92]) chevZ(z0)
  // the controls course's hurdles (ESCAPE-SPEC 3.2-1): two 1-high striped bars across the west wing, jumped over
  for (const x of [71, 77]) for (let z = 56; z <= 63; z++) set(x, 58, z, z % 2 ? 'yellow_concrete' : 'black_concrete')

  // ceiling (y 63): deepslate tiles with polished deepslate borders; none over the stair opening z 104..111
  for (let x = 45; x <= 123; x++) for (let z = 56; z <= 103; z++) {
    if (!inC(x, z)) continue
    const border = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => !inC(x + dx, z + dz))
    set(x, 63, z, border ? 'polished_deepslate' : 'deepslate_tiles')
  }
  // recessed warm light strips every 6 along each corridor's centre line, each in a polished deepslate light box
  const strip = (x1, z1, x2, z2) => { F(x1 - 1, 63, z1 - 1, x2 + 1, 63, z2 + 1, 'polished_deepslate'); F(x1, 63, z1, x2, 63, z2, 'ochre_froglight') }
  for (let c = 48; c <= 120; c += 6) strip(c - 1, 59, c + 1, 60) // cross corridor (8 wide: a 2x3 panel on the centre)
  for (const z of [66, 72, 78, 84, 90, 96]) strip(84, z, 84, z + 2) // main corridor, 1x3 on x 84
  strip(84, 100, 84, 102) // landing (its box stops at z 103: no ceiling over z 104..111)

  // brick piers, 1 deep, between the cells and along the main corridor (y 58..60 brick, the bands on top)
  const pier = (x, z) => F(x, 57, z, x, 62, z, cwall)
  for (const x of [52, 59, 66, 73, 80, 88, 95, 102, 109, 116]) pier(x, 56)
  for (const x of [52, 59, 66, 73, 79, 89, 95, 102, 109, 116]) pier(x, 63)
  for (const z of [67, 73, 81, 87, 99]) pier(80, z)
  for (const z of [67, 73, 81, 87, 93, 99]) pier(88, z)

  // the corridor ends: a barred gate into the dark, recessed in a 2-thick end wall
  for (const [xw, xb] of [[44, 43], [124, 125]]) {
    F(xb, 57, 58, xb, 61, 61, 'polished_blackstone_bricks')
    F(xb, 58, 59, xb, 60, 60, 'black_concrete')
    F(xw, 58, 59, xw, 60, 60, bars)
    F(xw, 58, 58, xw, 60, 58, 'polished_blackstone'); F(xw, 58, 61, xw, 60, 61, 'polished_blackstone') // jambs
  }

  // landing: two potted plants in its north corners (the foot of the stair, z 105, stays clear)
  set(88, 58, 100, 'potted_bamboo'); set(80, 58, 100, 'potted_fern')

  // the stair: block y = 58 + (z - 106), solid under each step, open above to G (M2's top step at (80..88, 64, 112))
  for (let z = 106; z <= 111; z++) {
    const y = 58 + (z - 106)
    F(80, 57, z, 88, y - 1, z, 'polished_deepslate')
    F(80, y, z, 88, y, z, 'polished_deepslate_stairs[facing=south,half=bottom]')
    if (y < 63) F(80, y + 1, z, 88, 63, z, AIR)
  }

  // ===== 2. Cells (5.3): 6 x 7 x 4, the 2026 look =====
  const cell = (x0, north) => {
    const zf = north ? 55 : 64 // front wall (on the corridor)
    const zb = north ? 47 : 72 // back wall
    const z1 = north ? 48 : 65, z2 = north ? 54 : 71
    F(x0, 58, z1, x0 + 5, 61, z2, AIR)
    F(x0, 57, z1, x0 + 5, 57, z2, navy) // navy floor
    F(x0, 62, z1, x0 + 5, 62, z2, (x, y, z) => ((x + z) % 2 ? 'white_concrete' : 'smooth_quartz')) // white ceiling tiles
    F(x0 - 1, 57, zb, x0 + 6, 62, zb, 'blue_terracotta') // navy back wall
    for (const xw of [x0 - 1, x0 + 6]) F(xw, 57, z1, xw, 62, z2, (x, y) => (y === 59 ? 'blue_terracotta' : 'white_concrete')) // side walls, navy dado
    // the front (table in 5.3)
    for (let i = 0; i <= 5; i++) {
      const x = x0 + i
      set(x, 57, zf, brick(x, 57, zf))
      for (let y = 58; y <= 60; y++) set(x, y, zf, i === 0 || i === 5 ? brick(x, y, zf) : bars)
      set(x, 61, zf, i >= 1 && i <= 3 ? 'red_stained_glass' : 'orange_concrete')
      set(x, 62, zf, 'smooth_quartz')
    }
    door(b, x0 + 2, 58, zf, north ? 'south' : 'north', 'left')
    for (let i = 1; i <= 3; i++) set(x0 + i, 61, north ? zf - 1 : zf + 1, 'light[level=10]') // the red strip's light
    if (north) {
      bed(b, 'orange', x0, 58, 48, 'north')
      set(x0 + 5, 58, 48, 'cauldron'); set(x0 + 5, 59, 48, 'iron_trapdoor[facing=south,half=bottom,open=true]')
      set(x0 + 5, 58, 50, 'spruce_slab[type=top]'); set(x0 + 5, 58, 51, 'spruce_slab[type=top]')
      set(x0 + 4, 58, 50, 'acacia_stairs[facing=west,half=bottom]')
    } else {
      bed(b, 'orange', x0, 58, 71, 'south')
      set(x0 + 5, 58, 71, 'cauldron'); set(x0 + 5, 59, 71, 'iron_trapdoor[facing=north,half=bottom,open=true]')
      set(x0 + 5, 58, 68, 'spruce_slab[type=top]'); set(x0 + 5, 58, 69, 'spruce_slab[type=top]')
      set(x0 + 4, 58, 69, 'acacia_stairs[facing=west,half=bottom]')
    }
  }
  for (const x0 of NORTH_CELLS) cell(x0, true)
  for (const x0 of SOUTH_CELLS) cell(x0, false)

  // ===== 3. Mop and supply closets in the south row (x 74..78, x 90..94): no door, a barred window =====
  const closet = (xa, mirror) => {
    const xb = xa + 4
    F(xa, 58, 65, xb, 61, 71, AIR)
    F(xa, 57, 65, xb, 57, 71, (x, y, z) => ((x + z) % 2 ? 'smooth_stone' : 'polished_andesite'))
    F(xa, 62, 65, xb, 62, 71, 'smooth_stone')
    F(mirror ? xa : xa - 1, 57, 72, mirror ? xb + 1 : xb, 62, 72, brick) // back wall (the corridor side keeps its wall and bands)
    F(xa + 1, 59, 64, xb - 1, 60, 64, bars) // the barred window in the front
    const wx = mirror ? xb : xa, ex = mirror ? xa : xb
    set(wx, 58, 71, 'water_cauldron[level=2]') // the mop bucket
    set(wx, 58, 70, 'barrel[facing=up,open=false]')
    set(xa + 1, 58, 71, 'chiseled_bookshelf[facing=north,slot_0_occupied=true,slot_1_occupied=false,slot_2_occupied=true,slot_3_occupied=true,slot_4_occupied=true,slot_5_occupied=false]')
    set(xa + 2, 58, 71, 'barrel[facing=north,open=false]')
    set(xa + 3, 58, 71, 'chiseled_bookshelf[facing=north,slot_0_occupied=false,slot_1_occupied=true,slot_2_occupied=true,slot_3_occupied=true,slot_4_occupied=false,slot_5_occupied=true]')
    F(xa + 1, 59, 71, xa + 3, 59, 71, 'spruce_slab[type=bottom]') // shelf top
    set(ex, 58, 71, 'barrel[facing=up,open=false]'); set(ex, 59, 71, 'barrel[facing=up,open=false]')
    set(ex, 58, 66, 'white_wool'); set(ex, 59, 66, 'white_carpet') // a pile of towels
    set(xa + 2, 61, 68, 'lantern[hanging=true]')
  }
  closet(74, false)
  closet(90, true)

  // ===== 4. The guard post (keycard desk; the sleeping guard) =====
  F(81, 58, 48, 87, 61, 55, AIR) // open on its south side (the junction), 4 tall
  F(81, 57, 48, 87, 57, 55, 'polished_deepslate')
  F(81, 62, 48, 87, 62, 55, 'smooth_quartz') // ceiling, the white band over the opening
  F(83, 62, 52, 85, 62, 52, 'sea_lantern')
  F(80, 57, 47, 88, 62, 47, brick) // brick back wall
  F(81, 58, 47, 87, 61, 47, 'black_concrete') // monitor frame
  F(82, 59, 47, 86, 60, 47, 'sea_lantern') // 3 monitors: x 82..83, 84..85, 86
  F(82, 58, 51, 86, 58, 51, 'dark_oak_slab[type=top]') // the desk, top surface y 59.0
  set(84, 58, 50, 'dark_oak_stairs[facing=north,half=bottom]') // the guard's chair, seat facing south
  set(86, 59, 51, 'lantern[hanging=false]') // desk lamp
  set(87, 58, 48, 'dark_oak_slab[type=top]'); set(87, 59, 48, 'cyan_concrete') // the keycard rack
  set(81, 58, 48, 'barrel[facing=up,open=false]'); set(81, 58, 49, 'barrel[facing=up,open=false]'); set(81, 59, 48, 'potted_fern') // files

  // ===== 5. MAX SECURITY: the sealed gate in the north slot x 117..122 =====
  F(118, 58, 48, 121, 62, 54, AIR)
  F(118, 57, 48, 121, 57, 54, 'polished_blackstone')
  F(117, 63, 48, 122, 63, 54, 'polished_blackstone_bricks')
  for (const xw of [117, 122, 123]) F(xw, 57, 47, xw, 63, 54, (x, y) => (y === 61 ? 'red_concrete' : 'polished_blackstone_bricks'))
  F(117, 57, 47, 122, 63, 47, 'polished_blackstone_bricks') // back wall
  F(118, 61, 47, 121, 63, 47, 'red_concrete'); F(119, 61, 47, 120, 62, 47, 'iron_block') // a sealed door at the top, red-framed
  // the stair stub up to it (rising north), a landing at the top
  for (const [z, y] of [[53, 58], [52, 59], [51, 60]]) {
    F(118, 57, z, 121, y - 1, z, 'polished_blackstone')
    F(118, y, z, 121, y, z, 'polished_blackstone_stairs[facing=north,half=bottom]')
  }
  F(118, 57, 48, 121, 60, 50, 'polished_blackstone')
  set(119, 62, 52, 'light[level=9]')
  // the gate face: red frame, iron bars, a closed double iron door, the white band
  F(117, 57, 55, 122, 57, 55, 'polished_blackstone')
  F(117, 58, 55, 117, 61, 55, 'red_concrete'); F(122, 58, 55, 122, 61, 55, 'red_concrete'); F(118, 61, 55, 121, 61, 55, 'red_concrete')
  F(118, 58, 55, 121, 60, 55, bars)
  door(b, 119, 58, 55, 'south', 'right'); door(b, 120, 58, 55, 'south', 'left')
  F(117, 62, 55, 122, 62, 55, 'smooth_quartz')

  // ===== 6. Rusty's cell (x 75..78, z 76..79, clear y 58..60) =====
  F(75, 58, 76, 78, 60, 79, AIR)
  F(75, 57, 76, 78, 57, 79, brick); F(75, 61, 76, 78, 61, 79, brick)
  F(74, 57, 75, 74, 61, 80, brick); F(75, 57, 75, 78, 61, 75, brick); F(75, 57, 80, 78, 61, 80, brick)
  F(79, 58, 76, 79, 60, 79, bars) // the front, on the corridor
  door(b, 79, 58, 78, 'east', 'left')
  set(75, 60, 76, 'cobweb'); set(75, 60, 79, 'cobweb')
  F(75, 58, 78, 76, 58, 79, 'yellow_carpet') // straw mat
  set(76, 58, 76, 'spruce_slab[type=bottom]') // stool
  set(76, 60, 77, 'lantern[hanging=true]')
  for (let z = 75; z <= 80; z++) set(80, 57, z, z % 2 ? 'black_concrete' : 'yellow_concrete') // hazard tape in front

  // ===== 7. The tutorial vent (5.4) =====
  // the mouth on the main corridor (x 79), its frame, reader and grille plates
  door(b, 79, 58, 84, 'east', 'left')
  F(79, 57, 83, 79, 57, 85, 'iron_block')
  F(79, 60, 83, 79, 60, 85, 'iron_block'); F(79, 58, 83, 79, 59, 83, 'iron_block'); set(79, 58, 85, 'iron_block')
  set(79, 59, 85, 'red_concrete')
  set(80, 59, 85, 'tripwire_hook[facing=east,attached=false,powered=false]')
  set(80, 58, 83, 'iron_trapdoor[facing=east,half=bottom,open=true]'); set(80, 59, 83, 'iron_trapdoor[facing=east,half=top,open=true]')
  set(80, 58, 85, 'iron_trapdoor[facing=east,half=bottom,open=true]')
  // the chamber (2 tall) with the two crawl lids, open
  F(77, 57, 83, 78, 60, 83, 'iron_block'); F(77, 57, 85, 78, 60, 85, 'iron_block')
  F(77, 57, 84, 78, 57, 84, 'iron_block'); F(77, 60, 84, 78, 60, 84, 'iron_block')
  F(77, 58, 84, 78, 58, 84, AIR)
  set(77, 59, 84, 'iron_trapdoor[facing=north,half=bottom,open=true]'); set(78, 59, 84, 'iron_trapdoor[facing=north,half=bottom,open=true]')
  // the crawl (1 high), x 76 -> 61: diamond plate, grates every 5, a lamp every 6
  for (let x = 61; x <= 76; x++) {
    set(x, 58, 84, AIR)
    F(x, 57, 83, x, 57, 85, 'iron_block')
    F(x, 59, 83, x, 59, 85, 'iron_block')
    if ((x - 1) % 6 === 0) set(x, 59, 84, 'sea_lantern')
    const g = (76 - x) % 5 === 0 ? 'waxed_copper_grate' : 'iron_block'
    set(x, 58, 83, g); set(x, 58, 85, g)
    if (g !== 'iron_block') { set(x, 58, 86, 'black_concrete'); if (x > 72) set(x, 58, 82, 'black_concrete') } // dark depth behind a grate (x 61..71 look into the boiler room)
  }
  // the walk tunnel (2 high), x 60 -> -4: iron under the building, concrete-grey polished andesite with iron ribs under the earth
  for (let x = -4; x <= 60; x++) {
    F(x, 58, 84, x, 59, 84, AIR)
    const rib = (x - 1) % 6 === 0
    const w = x <= 39 && !rib ? 'polished_andesite' : 'iron_block'
    F(x, 57, 83, x, 57, 85, 'iron_block')
    F(x, 58, 83, x, 59, 83, w); F(x, 58, 85, x, 59, 85, w)
    F(x, 60, 83, x, 60, 85, w)
    if (rib) set(x, 60, 84, 'sea_lantern')
  }
  // grates looking into the boiler room
  for (const x of [50, 56]) F(x, 58, 83, x, 59, 83, 'waxed_copper_grate')
  // the fan alcove under the building wall (x 40..42, widened to z 82..86)
  F(40, 57, 82, 42, 61, 86, 'iron_block')
  F(40, 58, 83, 42, 60, 85, AIR)
  F(40, 58, 82, 42, 60, 82, 'waxed_copper_grate'); F(40, 58, 86, 42, 60, 86, 'waxed_copper_grate')
  for (const x of [39, 43]) for (const z of [82, 86]) F(x, 58, z, x, 60, z, 'iron_block') // the grate walls' end posts (the stone behind them is outside DUCT)
  set(41, 59, 83, 'lightning_rod[facing=south,powered=false]'); set(41, 59, 85, 'lightning_rod[facing=north,powered=false]') // the fan hubs
  set(41, 61, 84, 'sea_lantern')
  // the exit shaft (inside EXIT): a ladder up to the grass outside the west wall, closed over since the vent no longer
  // leads out (ESCAPE-SPEC 3.2-4: the hatch and the ladder support's top are grass, the outlet is gone)
  F(-5, 57, 83, -5, 63, 83, 'iron_block'); F(-5, 57, 85, -5, 63, 85, 'iron_block')
  set(-5, 57, 84, 'iron_block')
  F(-4, 60, 84, -4, 63, 84, 'iron_block')
  F(-6, 58, 84, -6, 63, 84, 'iron_block') // the ladder's support, the shaft's west side
  F(-5, 58, 84, -5, 63, 84, 'ladder[facing=east]')
  set(-5, 61, 83, 'sea_lantern')
  set(-5, 64, 84, 'grass_block'); set(-6, 64, 84, 'grass_block')
  F(-6, 65, 83, -6, 67, 85, AIR)
  set(-6, 64, 83, 'grass_block'); set(-6, 64, 85, 'grass_block') // the grass died to dirt under the old outlet
  // ESCAPE-SPEC 3.2-2: the crawl turns north into the boiler room at x 61 and its west end is capped, so the walk
  // tunnel (x -4..59, still dug) is sealed off; 3.2-3: a broken wall from the boiler room into Rusty's cell
  set(61, 58, 83, AIR)
  F(60, 58, 84, 60, 59, 84, 'iron_block')

  // ===== 8. The Security Office lower floor (tutorial room; int-SecurityOffice2026) =====
  F(64, 58, 88, 78, 62, 106, AIR)
  F(64, 57, 88, 78, 57, 106, 'smooth_sandstone') // beige tiles
  F(64, 63, 88, 78, 63, 106, navy) // dark navy ceiling
  for (const z of [92, 101]) F(68, 63, z, 74, 63, z, 'sea_lantern') // recessed light strips
  const gray = (x, y) => (y === 58 ? 'black_concrete' : 'gray_concrete') // gray walls, black skirting
  F(63, 57, 87, 78, 63, 87, gray) // north wall
  F(63, 57, 88, 63, 63, 106, gray) // west wall
  F(63, 57, 107, 78, 63, 107, brick) // south wall
  // the camera wall on x 63: one big screen and 3 small ones, framed in blue. Each screen is a sea lantern behind
  // cyan stained glass (1.8.1), flush in the wall: the glass at x 63, the lantern in the fill behind it at x 62
  F(63, 58, 89, 63, 63, 105, 'blue_concrete')
  const screen = (y1, z1, y2, z2) => { F(62, y1, z1, 62, y2, z2, 'sea_lantern'); F(63, y1, z1, 63, y2, z2, 'cyan_stained_glass') }
  screen(59, 90, 62, 97)
  screen(61, 99, 62, 100); screen(59, 101, 60, 102); screen(61, 103, 62, 104)
  // the glass wall x 79 onto the corridor and the landing: blackstone base and posts, light-blue panes
  for (let z = 88; z <= 106; z++) {
    set(79, 57, z, 'polished_blackstone'); set(79, 58, z, 'polished_blackstone')
    const post = [88, 92, 95, 99, 103, 106].includes(z)
    F(79, 59, z, 79, 62, z, post ? 'polished_blackstone' : 'light_blue_stained_glass_pane')
  }
  // the keycard gate: a closed double iron door, iron bars above, readers on red plates
  door(b, 79, 58, 93, 'east', 'left'); door(b, 79, 58, 94, 'east', 'right')
  F(79, 60, 93, 79, 62, 94, bars)
  set(79, 59, 95, 'red_concrete'); set(80, 59, 95, 'tripwire_hook[facing=east,attached=false,powered=false]')
  set(79, 59, 92, 'red_concrete'); set(78, 59, 92, 'tripwire_hook[facing=west,attached=false,powered=false]')
  // the rug (leaving the table cells), the gun table, the console under the screens
  F(66, 58, 90, 76, 58, 104, 'blue_carpet')
  F(70, 58, 95, 72, 58, 97, 'light_blue_concrete') // the starter item table, top surface y 59.0
  F(65, 58, 91, 65, 58, 96, 'smooth_stone_slab[type=top]')
  set(66, 58, 92, 'dark_oak_stairs[facing=east,half=bottom]'); set(66, 58, 95, 'dark_oak_stairs[facing=east,half=bottom]')
  // the ladder up the NW corner (M4 closes the top with an iron trapdoor at y 64)
  F(64, 58, 88, 64, 63, 88, 'ladder[facing=east]')
  // the baton mount on the south wall, a locker and a water cooler
  set(70, 60, 106, 'iron_trapdoor[facing=north,half=top,open=true]'); set(70, 59, 106, 'end_rod[facing=up]')
  F(74, 58, 106, 77, 59, 106, 'light_gray_concrete')
  F(74, 58, 105, 77, 58, 105, 'iron_trapdoor[facing=north,half=bottom,open=true]'); F(74, 59, 105, 77, 59, 105, 'iron_trapdoor[facing=north,half=top,open=true]')
  set(78, 58, 106, 'white_concrete'); set(78, 59, 106, 'light_blue_stained_glass')
  F(68, 58, 88, 72, 58, 88, 'dark_oak_slab[type=bottom]') // a bench along the north wall

  // ===== 9. The showers (x 90..106, z 74..96; scenery) =====
  F(90, 58, 74, 106, 62, 96, AIR)
  F(90, 57, 74, 106, 57, 96, (x, y, z) => ((x + z) % 2 ? 'white_concrete' : 'light_gray_concrete')) // tiles
  F(90, 63, 74, 106, 63, 96, 'smooth_quartz')
  for (const x of [93, 98, 103]) for (const z of [79, 85, 91]) set(x, 63, z, 'sea_lantern')
  F(90, 57, 73, 106, 63, 73, tile); F(90, 57, 97, 106, 63, 97, tile) // north and south walls
  F(90, 57, 74, 90, 63, 96, tile); F(106, 57, 74, 106, 63, 96, tile) // inner tile layers (the corridor's brick x 89 and the storage's x 107 outside)
  // stalls along the north and south walls: dividers, heads and flush drains
  for (const [zw, z1, z2, zd] of [[74, 74, 76, 75], [96, 94, 96, 95]]) {
    for (const x of [94, 98, 102]) F(x, 58, z1, x, 60, z2, 'smooth_quartz')
    for (const x of [92, 96, 100, 104]) {
      set(x, 62, zw, 'lightning_rod[facing=down,powered=false]') // shower head
      set(x, 57, zd, 'iron_trapdoor[facing=north,half=top,open=false]'); set(x, 56, zd, 'black_concrete') // drain over a dark pit
    }
  }
  // benches in the middle, a drain between them
  F(94, 58, 81, 101, 58, 81, 'birch_slab[type=bottom]'); F(94, 58, 88, 101, 58, 88, 'birch_slab[type=bottom]')
  set(98, 57, 84, 'iron_trapdoor[facing=north,half=top,open=false]'); set(98, 57, 85, 'iron_trapdoor[facing=north,half=top,open=false]')
  set(98, 56, 84, 'black_concrete'); set(98, 56, 85, 'black_concrete')
  // sinks on the west wall: basins in a quartz counter, tap hooks above them
  for (const [za, basins] of [[77, [78, 80]], [87, [88, 90]]]) for (let z = za; z <= za + 4; z++) {
    const basin = basins.includes(z)
    set(91, 58, z, basin ? 'cauldron' : 'smooth_quartz_slab[type=top]')
    if (basin) set(91, 59, z, 'tripwire_hook[facing=east,attached=false,powered=false]')
  }
  F(105, 58, 80, 105, 58, 82, 'white_wool') // folded towels
  set(105, 59, 80, 'white_carpet')

  // ===== 10. Storage (x 108..123, z 74..106; scenery): shelves, crates, a laundry cart =====
  F(108, 58, 74, 123, 62, 106, AIR)
  F(108, 57, 74, 123, 57, 106, (x, y, z) => (x % 4 === 0 || z % 4 === 0 ? 'smooth_stone' : 'polished_andesite'))
  F(108, 63, 74, 123, 63, 106, (x, y, z) => (x === 108 || x === 123 || z === 74 || z === 106 ? 'polished_deepslate' : 'deepslate_tiles'))
  for (const x of [110, 116, 122]) for (const z of [77, 83, 89, 95, 101]) set(x, 63, z, 'ochre_froglight')
  const swall = (x, y, z) => (y === 58 ? 'polished_deepslate' : cwall(x, y, z)) // brick, a dark plinth, the bands
  F(107, 57, 73, 124, 63, 73, swall); F(107, 57, 107, 124, 63, 107, swall)
  F(107, 57, 74, 107, 63, 106, swall); F(124, 57, 74, 124, 63, 106, swall)
  F(106, 58, 90, 107, 61, 91, AIR) // the doorway from the showers (2 deep)
  F(89, 58, 84, 90, 61, 85, AIR) // the showers' open doorway from the main corridor (2 deep)
  const SHELF = [['barrel[facing=up,open=false]', 35], ['chiseled_bookshelf[facing=west,slot_0_occupied=true,slot_1_occupied=true,slot_2_occupied=false,slot_3_occupied=true,slot_4_occupied=false,slot_5_occupied=true]', 30], ['stripped_spruce_wood[axis=y]', 20], ['spruce_planks', 15]]
  for (const x of [111, 115, 119]) for (const [za, zb] of [[76, 86], [94, 104]]) {
    for (let z = za; z <= zb; z++) {
      const end = z === za || z === zb
      for (let y = 58; y <= 60; y++) set(x, y, z, end ? 'stripped_spruce_log[axis=y]' : pick(x, y, z, SHELF))
      set(x, 61, z, end ? 'stripped_spruce_log[axis=y]' : 'spruce_slab[type=bottom]')
    }
  }
  // crates at the east end of the cross aisle, a laundry cart by the door
  F(121, 58, 88, 123, 58, 93, 'stripped_oak_wood[axis=y]'); F(122, 59, 88, 123, 59, 90, 'stripped_oak_wood[axis=y]'); set(123, 60, 88, 'packed_mud')
  F(121, 58, 76, 123, 58, 78, 'packed_mud'); F(122, 59, 76, 123, 59, 77, 'stripped_oak_wood[axis=y]')
  F(109, 58, 87, 110, 58, 87, 'barrel[facing=up,open=false]'); F(109, 59, 87, 110, 59, 87, 'white_carpet')

  // ===== 11. The boiler room (x 45..72, z 74..81; sealed, seen through the vent grates) =====
  F(45, 58, 74, 72, 62, 81, AIR)
  F(45, 57, 74, 72, 57, 81, (x, y, z) => ((x + z) % 2 ? 'polished_andesite' : 'andesite'))
  F(45, 63, 74, 72, 63, 81, 'polished_deepslate')
  const bwall = (x, y, z) => (y === 58 ? 'polished_deepslate' : y === 63 ? 'polished_deepslate' : brick(x, y, z))
  F(44, 57, 73, 73, 63, 73, bwall); F(44, 57, 82, 73, 63, 82, bwall); F(44, 57, 74, 44, 63, 81, bwall); F(73, 57, 74, 73, 63, 81, bwall)
  for (const x of [50, 56]) F(x, 58, 82, x, 59, 82, AIR) // openings behind the tunnel grates
  for (const x of [61, 66, 71]) set(x, 58, 82, AIR) // and behind the crawl grates
  // two copper boilers (rounded 4x4), a copper band, a slab lid
  for (const xa of [49, 57]) for (let x = xa; x <= xa + 3; x++) for (let z = 76; z <= 79; z++) {
    if ((x === xa || x === xa + 3) && (z === 76 || z === 79)) continue
    for (let y = 58; y <= 61; y++) set(x, y, z, y === 60 ? 'waxed_cut_copper' : 'waxed_copper_block')
    set(x, 62, z, 'waxed_cut_copper_slab[type=bottom]')
  }
  // the firebox and its flue, a coal heap, a pipe run under the ceiling
  F(64, 58, 74, 66, 58, 74, 'blast_furnace[facing=south,lit=true]')
  F(64, 59, 74, 66, 62, 74, 'polished_blackstone_bricks')
  F(68, 58, 74, 70, 58, 75, 'coal_block'); set(68, 59, 74, 'coal_block')
  F(46, 62, 75, 71, 62, 75, 'waxed_cut_copper'); F(46, 62, 80, 71, 62, 80, 'iron_chain[axis=x]')
  set(70, 58, 81, 'smithing_table'); set(69, 58, 81, 'anvil[facing=east]')
  for (const x of [47, 54, 63]) { set(x, 62, 78, 'iron_chain[axis=y]'); set(x, 61, 78, 'lantern[hanging=true]') }
  // the course's way on (ESCAPE-SPEC 3.2-3): a broken wall, 2 high, through the boiler room's east wall (x 73) and
  // Rusty's west wall (x 74) at z 77
  F(73, 58, 77, 74, 59, 77, AIR)
}

module.exports.labels = [
  { x: 80.03, y: 60.5, z: 84.5, facing: 'east', text: 'VENT', color: '#ffd54a', scale: 1 },
  { x: 119.5, y: 61.5, z: 56.03, facing: 'south', text: 'MAX SECURITY', color: '#ffffff', scale: 1 },
  { x: 84.5, y: 61.0, z: 50.5, facing: 'up', text: 'Z', color: '#cfe8ff', scale: 1 },
  // the controls course's signs (ESCAPE-SPEC 3.2-5), free-floating
  { x: 49.0, y: 61.0, z: 60.0, facing: 'west', text: 'WALK: W A S D', color: '#ffffff', scale: 0.6 }, // L_WALK
  { x: 57.0, y: 61.0, z: 60.0, facing: 'west', text: 'SPRINT: double-tap W (or hold Ctrl)', color: '#ffffff', scale: 0.6 }, // L_SPRINT
  { x: 68.0, y: 61.0, z: 60.0, facing: 'west', text: 'JUMP: Space', color: '#ffffff', scale: 0.6 }, // L_JUMP
  { x: 84.0, y: 60.8, z: 56.5, facing: 'south', text: "SNEAK: hold Shift. Take his keycard. Don't wake him.", color: '#ffffff', scale: 0.6 }, // L_SNEAK
  { x: 80.03, y: 59.9, z: 86.5, facing: 'east', text: 'KEYCARD: right-click the red reader', color: '#ffffff', scale: 0.6 }, // L_READER
  { x: 77.0, y: 59.8, z: 76.03, facing: 'south', text: 'PHONE: slot 9. Right-click: map. F: apps', color: '#ffffff', scale: 0.6 }, // L_PHONE
  { x: 77.0, y: 59.8, z: 79.97, facing: 'north', text: 'HOTBAR: keys 1-5 or the mouse wheel', color: '#ffffff', scale: 0.6 }, // L_HOTBAR
  { x: 80.03, y: 61.0, z: 94.0, facing: 'east', text: 'SECURITY OFFICE (keycard)', color: '#ffffff', scale: 0.6 }, // L_OFFICE
  { x: 66.0, y: 60.0, z: 88.03, facing: 'south', text: 'CLIMB: walk into the ladder', color: '#ffffff', scale: 0.6 } // L_LADDER
]

// the Skript spots of 7.1 and 10, copied exactly; block spots (doors, lids, hatches, readers) with yaw 0
const points = {
  T_SPAWN: [62.5, 58.0, 51.5, 0],
  T_KEYCARD: [82.5, 59.0, 51.5, 0],
  T_GUARD_SEAT: [84.5, 58.5, 50.5, 0],
  T_DONUT: [85.5, 59.0, 51.5, 0],
  T_STARTER: [71.5, 59.0, 96.5, 0],
  T_VENT_STAND: [77.5, 58.0, 84.5, 0],
  RUSTY: [77.5, 58.0, 77.5, -90],
  T_SPAWN_DOOR: [62, 58, 55, 0],
  T_SO_GATE: [79, 58, 93, 0], // 7.1's name for the pair: the lower half of its north door (= T_SO_GATE_A)
  T_SO_GATE_A: [79, 58, 93, 0],
  T_SO_GATE_B: [79, 58, 94, 0],
  T_SO_READER_OUT: [80, 59, 95, 0],
  T_SO_READER_IN: [78, 59, 92, 0],
  T_VENT_DOOR: [79, 58, 84, 0],
  T_VENT_READER: [80, 59, 85, 0],
  T_VENT_LID_A: [77, 59, 84, 0],
  T_VENT_LID_B: [78, 59, 84, 0],
  // the controls course (ESCAPE-SPEC Appendix B, M3)
  CP_VENT: [84.5, 58, 80.5, 180],
  CP_OFFICE: [84.5, 58, 90.5, 180],
  COURSE_PUSH: [84.5, 58, 97.5, 180],
  RUSTY_DOOR: [79, 58, 78, 0],
  RUSTY_IN: [75.5, 58, 77.5, -90],
  RUSTY_TALK: [80.25, 58.0, 77.5, 90],
  BOILER_IN: [61.5, 58, 80.5, 0],
  SNEAK_BACK: [78.5, 58, 59.5, -90],
  L_WALK: [49.0, 61.0, 60.0, 90],
  L_SPRINT: [57.0, 61.0, 60.0, 90],
  L_JUMP: [68.0, 61.0, 60.0, 90],
  L_SNEAK: [84.0, 60.8, 56.5, 0],
  L_READER: [80.03, 59.9, 86.5, -90],
  L_PHONE: [77.0, 59.8, 76.03, 0],
  L_HOTBAR: [77.0, 59.8, 79.97, 180],
  L_OFFICE: [80.03, 61.0, 94.0, -90],
  L_LADDER: [66.0, 60.0, 88.03, 0]
}
// the other tutorial spawn cells and their doors (7.1)
for (const x0 of [46, 53, 67, 74, 89, 96, 103, 110]) { points[`T_CELL_N${x0}`] = [x0 + 2.5, 58.0, 51.5, 0]; points[`T_CELL_N${x0}_DOOR`] = [x0 + 2, 58, 55, 0] }
for (const x0 of [46, 53, 60, 67, 96, 103, 110, 117]) { points[`T_CELL_S${x0}`] = [x0 + 2.5, 58.0, 68.5, 180]; points[`T_CELL_S${x0}_DOOR`] = [x0 + 2, 58, 64, 0] }
module.exports.points = points
// the cell rows (x0 of each cell), for jail.js points (the cell doors and zones) and the escape checker
module.exports.cells = { north: NORTH_CELLS, south: SOUTH_CELLS }
