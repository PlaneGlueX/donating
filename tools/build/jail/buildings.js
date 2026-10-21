// M5 of the Jailbreak prison (jail-spec.md section 6): the Visitors Building, the Prison Police Station (scenery), the
// Prison Gun Shop with its punch box, and Maximum Security (a scenery shell). World `jailbreak`, 1 stud = 1 block,
// ground grass at y 64. The integrator runs this into the shared tools/build/mcstruct Build after M1..M4; every block
// stays inside M5's boxes (jail-spec 2.1; anything outside is dropped and listed in module.exports.strays).
// Ids are checked against the 26.1.2 server: it has no concrete or terracotta stairs, so the Visitors soffit is
// red_nether_brick_stairs and the police tower's roof edge is plain blue_concrete. The lightning rods (flagpole, punch-box
// conduits) are waxed_lightning_rod, so they keep their copper look instead of weathering green.
'use strict'

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

// M5's boxes (jail-spec 2.1), every y 55..110.
const REGION = [
  ['MS-A', 63, 254, -6, 42], ['MS-B', 182, 254, 43, 68], ['MS-C', 182, 238, 69, 80],
  ['VIS', 118, 162, 275, 322], ['POL', 193, 338, 283, 345], ['GUN', 289, 334, 237, 262]]
const inRegion = (x, y, z) => y >= 55 && y <= 110 && REGION.some(([, x1, x2, z1, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2)

const mod = (a, n) => ((a % n) + n) % n
const LG = [['light_gray_concrete', 65], ['polished_andesite', 35]]          // steel grey (pillars, frames)
// layer of a rectangle footprint: 1 = the outer face, 2 = the inner layer, 3+ = inside, 0 = outside
const rectLayer = (X1, X2, Z1, Z2) => (x, z) => (x < X1 || x > X2 || z < Z1 || z > Z2) ? 0 : Math.min(x - X1, X2 - x, z - Z1, Z2 - z) + 1
// a rectangle's face: ax = the axis it runs along, o = its outer layer, i = its inner layer, out = the outward step
const faceOf = (side, X1, X2, Z1, Z2) => ({
  N: { ax: 'x', o: Z1, i: Z1 + 1, out: -1 }, S: { ax: 'x', o: Z2, i: Z2 - 1, out: 1 },
  W: { ax: 'z', o: X1, i: X1 + 1, out: -1 }, E: { ax: 'z', o: X2, i: X2 - 1, out: 1 } })[side]
const xz = (f, a, d) => f.ax === 'x' ? [a, d] : [d, a]

module.exports = (b) => {
  // Everything goes into a local map first (so windows can cut recesses into walls), then into b, region-checked.
  const blocks = new Map()
  const key = (x, y, z) => `${x},${y},${z}`
  const S = (x, y, z, s) => { const v = typeof s === 'function' ? s(x, y, z) : s; if (v) blocks.set(key(x, y, z), v) }
  const D = (x, y, z) => blocks.delete(key(x, y, z))
  const F = (x1, y1, z1, x2, y2, z2, s) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, s) }
  const clear = (x1, y1, z1, x2, y2, z2) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) D(x, y, z) }
  const B = { set: S }                                           // for COMMON's door()
  const W = (x, y, z) => pick(x, y, z, MIX.white)
  const DK = (x, y, z) => pick(x, y, z, MIX.darkstone)
  const NV = (x, y, z) => pick(x, y, z, MIX.navy)
  const ASPH = (x, y, z) => pick(x, y, z, MIX.asphalt)
  const LGM = (x, y, z) => pick(x, y, z, LG)
  const conc = (x, y, z) => (mod(x, 6) === 0 || mod(z, 6) === 0) ? 'smooth_stone' : 'light_gray_concrete'   // concrete paving
  const louvre = y => mod(y, 2) === 0 ? 'light_gray_concrete' : 'gray_concrete'

  // A window: glass in the inner layer, the outer layer open (a recess) inside a frame ring, a sill in the apron.
  const win = (f, a1, a2, y1, y2, o = {}) => {
    for (let a = a1 - 1; a <= a2 + 1; a++) for (let y = y1 - 1; y <= y2 + 1; y++) {
      const [xo, zo] = xz(f, a, f.o), [xi, zi] = xz(f, a, f.i)
      if (a < a1 || a > a2 || y < y1 || y > y2) { if (!o.noFrame) S(xo, y, zo, o.frame || 'light_gray_concrete'); continue }
      D(xo, y, zo)
      if (o.bars && o.bars.includes(y)) S(xo, y, zo, 'iron_bars')
      S(xi, y, zi, o.pane || 'light_blue_stained_glass_pane')
    }
    if (o.sill) for (let a = a1; a <= a2; a++) { const [xs, zs] = xz(f, a, f.o + f.out); S(xs, y1 - 1, zs, 'smooth_quartz_slab[type=top]') }
  }
  // A cypress: a spruce_log trunk under a narrow spruce_leaves cone (9 tall in all).
  const cypress = (x, z, y0 = 65) => {
    const L = 'spruce_leaves[persistent=true]'
    const rows = ['plus', 'full', 'full', 'full', 'plus', 'plus', 'one', 'one']
    rows.forEach((r, i) => {
      const y = y0 + 1 + i
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (r === 'one' && (dx || dz)) continue
        if (r === 'plus' && dx && dz) continue
        S(x + dx, y, z + dz, L)
      }
    })
    for (let y = y0; y <= y0 + 3; y++) S(x, y, z, 'spruce_log[axis=y]')
  }

  // ===================== 6.1 Visitors Building (VIS) =====================
  const visitors = () => {
    const X1 = 118, X2 = 160, Z1 = 277, Z2 = 320
    const lay = rectLayer(X1, X2, Z1, Z2)
    const mid = x => x >= 132 && x <= 146                                                  // the raised middle third
    const ext = (x, y, z) => y === 64 ? 'light_gray_concrete' : (y === 65 || y === 68) ? 'red_concrete' : y === 70 ? 'red_terracotta' : W(x, y, z)
    const inr = (x, y, z) => y === 64 ? 'light_gray_concrete' : (y === 65 || y === 69 || y === 71) ? 'red_concrete' : W(x, y, z)
    const tile = (x, y, z) => (mod(x, 4) === 0 || mod(z, 4) === 0) ? 'red_concrete' : 'red_terracotta'
    for (let x = X1; x <= X2; x++) for (let z = Z1; z <= Z2; z++) {
      const l = lay(x, z)
      if (l <= 2) {
        for (let y = 64; y <= 71; y++) S(x, y, z, l === 1 ? ext : inr)
        if (mid(x)) { S(x, 72, z, W); S(x, 73, z, 'red_concrete'); S(x, 74, z, 'red_concrete') }   // the red cap, one higher
        else { S(x, 72, z, 'red_concrete'); S(x, 73, z, 'red_concrete') }
      } else {
        S(x, 64, z, tile)
        S(x, 72, z, 'white_concrete')                                                      // ceiling and roof slab
        if (mid(x)) S(x, 73, z, 'white_concrete')
      }
    }
    // the step of the raised middle third, across the roof
    for (let z = Z1 + 2; z <= Z2 - 2; z++) if (z < 285 || z > 290) { S(132, 74, z, 'red_concrete'); S(146, 74, z, 'red_concrete') }
    // lip and soffit: north, south and east (the west face has no apron: T14 and F4 stand there)
    for (let x = X1; x <= X2 + 1; x++) {
      const cy = (x <= X2 && mid(x)) ? 74 : 73
      S(x, cy, Z1 - 1, 'red_concrete'); S(x, cy - 1, Z1 - 1, 'red_nether_brick_stairs[facing=south,half=top]')
      S(x, cy, Z2 + 1, 'red_concrete'); S(x, cy - 1, Z2 + 1, 'red_nether_brick_stairs[facing=north,half=top]')
    }
    for (let z = Z1; z <= Z2; z++) { S(X2 + 1, 73, z, 'red_concrete'); S(X2 + 1, 72, z, 'red_nether_brick_stairs[facing=west,half=top]') }

    // aprons: concrete north and on the east strip, asphalt south; the vehicle-gate post
    for (let x = 118; x <= 162; x++) for (const z of [275, 276]) S(x, 64, z, conc)
    for (let z = 277; z <= 319; z++) for (const x of [161, 162]) S(x, 64, z, conc)
    for (let x = 118; x <= 160; x++) for (const z of [321, 322]) S(x, 64, z, ASPH)
    F(161, 64, 320, 162, 71, 322, 'light_gray_concrete')
    F(161, 72, 320, 162, 72, 322, 'smooth_stone_slab[type=bottom]')
    // piers where the middle third steps up, on both long faces
    for (const x of [131, 147]) for (const z of [Z1 - 1, Z2 + 1]) F(x, 64, z, x, 72, z, 'light_gray_concrete')

    // doors: open iron double doors on both faces (the frame in the outer layer, a transom above)
    const frontDoor = (zi, zo, facing, hingeW, hingeE) => {
      clear(138, 65, zo, 139, 67, zo)
      door(B, 138, 65, zi, facing, hingeW, true); door(B, 139, 65, zi, facing, hingeE, true)
      S(138, 67, zi, 'light_blue_stained_glass'); S(139, 67, zi, 'light_blue_stained_glass')
      F(137, 64, zo, 137, 68, zo, 'light_gray_concrete'); F(140, 64, zo, 140, 68, zo, 'light_gray_concrete')
      F(138, 68, zo, 139, 68, zo, 'light_gray_concrete')
    }
    frontDoor(278, 277, 'north', 'left', 'right')
    frontDoor(319, 320, 'south', 'right', 'left')
    // sign bands behind the white VISITORS labels (y 69.5): the y 69 row red over x 135..142, so the letters sit on a
    // thick red stripe as in the game (white on the white row would not read)
    for (let x = 135; x <= 142; x++) { S(x, 69, Z1, 'red_concrete'); S(x, 69, Z2, 'red_concrete') }
    // windows in light_gray_concrete frames
    const fN = faceOf('N', X1, X2, Z1, Z2), fS = faceOf('S', X1, X2, Z1, Z2), fE = faceOf('E', X1, X2, Z1, Z2), fW = faceOf('W', X1, X2, Z1, Z2)
    win(fN, 124, 127, 66, 69, { sill: true })
    win(fS, 124, 127, 66, 69, { sill: true }); win(fS, 150, 153, 66, 69, { sill: true })
    win(fE, 283, 286, 66, 69, { sill: true }); win(fE, 303, 306, 66, 69, { sill: true })
    win(fW, 306, 309, 66, 69)

    // the booth wall along z 298..299: wall ends, 5 booths, deep pillars between them
    for (let x = 120; x <= 158; x++) for (const z of [298, 299]) { S(x, 64, z, 'light_gray_concrete'); for (let y = 65; y <= 71; y++) S(x, y, z, inr) }
    for (const p of [128, 135, 142, 149]) for (let x = p; x <= p + 1; x++) for (let z = 296; z <= 301; z++) {
      S(x, 64, z, 'light_gray_concrete'); for (let y = 65; y <= 71; y++) S(x, y, z, inr) }
    for (const x0 of [123, 130, 137, 144, 151]) {
      for (let x = x0; x <= x0 + 4; x++) {
        S(x, 66, 298, 'glass_pane'); S(x, 67, 298, 'iron_bars'); S(x, 68, 298, 'glass_pane')
        for (let y = 66; y <= 68; y++) S(x, y, 299, 'glass_pane')
        S(x, 65, 297, 'smooth_stone_slab[type=top]'); S(x, 65, 300, 'smooth_stone_slab[type=top]')
      }
      S(x0 + 2, 65, 296, 'warped_stairs[facing=north,half=bottom]')                     // blue chair, faces the glass
      S(x0 + 2, 65, 301, 'polished_blackstone_stairs[facing=south,half=bottom]')        // black chair, faces the glass
    }
    // civilian side: a gray walkway along the booths and to the south door
    for (let x = 121; x <= 157; x++) for (let z = 300; z <= 302; z++) {
      if ([128, 129, 135, 136, 142, 143, 149, 150].includes(x) && z <= 301) continue
      S(x, 64, z, 'gray_concrete') }
    F(137, 64, 303, 140, 64, 318, 'gray_concrete')

    // ceiling: sea_lantern panels, the inmate-side skylight, two square vents
    for (const z of [281, 294, 304, 313]) for (const x0 of [123, 130, 137, 147, 154]) { S(x0, 72, z, 'sea_lantern'); S(x0 + 1, 72, z, 'sea_lantern') }
    for (let x = 122; x <= 156; x++) for (let z = 285; z <= 290; z++) {
      if (x === 122 || x === 156 || z === 285 || z === 290) S(x, mid(x) ? 74 : 73, z, 'light_gray_concrete')
      else { S(x, 72, z, 'light_blue_stained_glass'); if (mid(x)) S(x, 73, z, 'light_blue_stained_glass') }
    }
    for (const vx of [125, 151]) F(vx, 72, 291, vx + 1, 72, 292, 'iron_trapdoor[facing=north,half=top,open=false]')
    // inmate side: the closed-off vent grille, benches, a guard desk, a water cooler, a plant
    F(120, 66, 286, 120, 67, 288, 'iron_trapdoor[facing=east,half=bottom,open=true]')
    for (let x = 121; x <= 133; x++) S(x, 65, 279, 'smooth_quartz_slab[type=bottom]')
    for (let x = 144; x <= 151; x++) S(x, 65, 279, 'smooth_quartz_slab[type=bottom]')
    F(153, 65, 282, 156, 65, 282, 'dark_oak_slab[type=top]')
    S(154, 65, 281, 'polished_blackstone_stairs[facing=north,half=bottom]')
    S(157, 65, 280, 'iron_block'); S(157, 66, 280, 'light_blue_stained_glass')
    S(121, 65, 296, 'potted_bamboo')
    // civilian side: waiting benches, a reception desk, the 'watchtower picture', plants
    for (const z of [304, 305, 306, 307, 308, 311, 312, 313, 314, 315]) S(121, 65, z, 'polished_blackstone_stairs[facing=west,half=bottom]')
    F(147, 65, 312, 153, 65, 312, 'white_concrete'); F(147, 66, 312, 153, 66, 312, 'smooth_stone_slab[type=bottom]')
    S(150, 65, 311, 'polished_blackstone_stairs[facing=north,half=bottom]')
    F(159, 66, 310, 159, 70, 314, 'light_gray_concrete')
    const PIC = [['light_blue_concrete', 'orange_concrete', 'light_blue_concrete'],
      ['light_blue_concrete', 'blue_concrete', 'light_blue_concrete'], ['lime_concrete', 'black_concrete', 'lime_concrete']]
    PIC.forEach((row, i) => row.forEach((s, j) => S(159, 69 - i, 311 + j, s)))
    S(121, 65, 317, 'potted_bamboo'); S(157, 65, 317, 'potted_bamboo')
  }

  // ===================== 6.2 Prison Police Station (POL, scenery) =====================
  const police = () => {
    const PZ1 = 285, PZ2 = 322
    const lw = rectLayer(195, 251, PZ1, PZ2), le = rectLayer(301, 338, PZ1, PZ2)
    const CX = 276, CZ = 310
    const oct = a => (x, z) => { const dx = Math.abs(x - CX), dz = Math.abs(z - CZ); return dx <= a && dz <= a && dx + dz <= Math.floor(a * Math.SQRT2) }
    const inT = oct(24), roofT = oct(26)
    const octL = (x, z) => ring(inT, x, z, 1) ? 1 : ring(inT, x, z, 2) ? 2 : 3
    const inBld = (x, z) => lw(x, z) > 0 || le(x, z) > 0 || inT(x, z)
    const wingExt = (x, y, z) => y === 64 ? 'light_gray_concrete' : (y === 67 || y === 71) ? 'light_blue_concrete' : y === 69 ? 'blue_concrete' : W(x, y, z)
    const wingInt = (x, y, z) => y === 64 ? 'light_gray_concrete' : y === 65 ? 'blue_concrete' : (y === 67 || y === 71) ? 'light_blue_concrete' : y === 69 ? 'blue_concrete' : W(x, y, z)

    // the two wings: walls 64..72, a blue ceiling with white beams at 72, the roof deck 73 (blue edge), railing 74
    const wing = (lay, X1, X2, floor, lipW, lipE) => {
      for (let x = X1; x <= X2; x++) for (let z = PZ1; z <= PZ2; z++) {
        const l = lay(x, z)
        if (l <= 2) {
          for (let y = 64; y <= 72; y++) S(x, y, z, l === 1 ? wingExt : wingInt)
          S(x, 73, z, l === 1 ? 'blue_concrete' : 'smooth_stone')
          if (l === 1 && !inT(x - 1, z) && !inT(x + 1, z)) S(x, 74, z, 'polished_blackstone_wall')
        } else {
          S(x, 64, z, floor)
          S(x, 72, z, mod(x, 6) === 0 ? 'white_concrete' : 'blue_concrete')
          if (mod(z, 8) === 4 && mod(x, 12) >= 2 && mod(x, 12) <= 4) S(x, 72, z, 'sea_lantern')   // tube-light panels
          S(x, 73, z, 'smooth_stone')
        }
      }
      for (let x = lipW; x <= lipE; x++) { S(x, 73, PZ1 - 1, 'blue_concrete'); S(x, 73, PZ2 + 1, 'blue_concrete') }
    }
    wing(lw, 195, 251, (x, y, z) => (mod(x, 6) === 0 || mod(z, 6) === 0) ? 'light_gray_terracotta' : 'cyan_terracotta', 195, 252)
    for (let z = PZ1 - 1; z <= 320; z++) S(194, 73, z, 'blue_concrete')                   // west lip (the fence corner stays clear)
    wing(le, 301, 338, 'blue_concrete', 300, 338)

    // ---- the tower: an octagon, 2 storeys of ribbon windows between white posts ----
    const isPost = (x, z) => {
      const dx = x - CX, dz = z - CZ, ax = Math.abs(dx), az = Math.abs(dz)
      if (ax >= 23 && az <= 10) return az >= 9 || mod(z, 4) === 0
      if (az >= 23 && ax <= 10) return ax >= 9 || mod(x, 4) === 0
      if (Math.min(ax, az) >= 22 || Math.min(ax, az) <= 11) return true                 // the corners
      const along = (dx > 0) === (dz > 0) ? dx - dz : dx + dz
      return mod(Math.floor(along / 2), 4) === 0
    }
    const winRow = y => (y >= 66 && y <= 70) || (y >= 74 && y <= 78)
    for (let x = CX - 24; x <= CX + 24; x++) for (let z = CZ - 24; z <= CZ + 24; z++) {
      if (!inT(x, z)) continue
      const l = octL(x, z), dx = x - CX, dz = z - CZ
      const contact = Math.abs(dx) >= 23 && Math.abs(dz) <= 9                         // the flats the wings lean on
      if (l === 1) {
        for (let y = 64; y <= 80; y++) {
          if (y === 64) S(x, y, z, 'light_gray_concrete')
          else if (y === 72 || y === 80) S(x, y, z, 'blue_concrete')
          else if (winRow(y)) { if ((contact && y <= 70) || isPost(x, z)) S(x, y, z, 'white_concrete') }
          else S(x, y, z, W)
        }
      } else if (l === 2) {
        for (let y = 64; y <= 80; y++) S(x, y, z, winRow(y) && !(contact && y <= 70) ? 'light_blue_stained_glass_pane' : W)
      } else {
        const d = Math.hypot(dx, dz)
        S(x, 64, z, (d >= 9.5 && d < 10.5) ? 'white_concrete' : ((d >= 12.5 && d < 13.5) || d < 2.5) ? 'light_blue_concrete' : 'cyan_terracotta')
        if (d * d >= 36) S(x, 72, z, 'cyan_terracotta')                                    // F2 floor, an atrium in the middle
      }
    }
    // roof 81 overhanging by 2, the big helipad at 82
    for (let x = CX - 26; x <= CX + 26; x++) for (let z = CZ - 26; z <= CZ + 26; z++) if (roofT(x, z)) S(x, 81, z, 'blue_concrete')
    const helipad = (cx, cz, y, R, r1, r2, legX, legZ, barX, barZ) => {
      for (let x = cx - R; x <= cx + R; x++) for (let z = cz - R; z <= cz + R; z++) {
        const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz)
        if (d > R + 0.5) continue
        const H = (legX.includes(Math.abs(dx)) && Math.abs(dz) <= legZ) || (Math.abs(dx) <= barX && Math.abs(dz) <= barZ)
        S(x, y, z, (d >= r1 - 0.5 && d < r2 + 0.5) || H ? 'white_concrete' : 'blue_concrete')
      }
    }
    helipad(CX, CZ, 82, 20, 17, 18, [4, 5], 6, 3, 1)
    for (let k = 0; k < 8; k++) {
      const px = CX + Math.round(19.5 * Math.cos(k * Math.PI / 4)), pz = CZ + Math.round(19.5 * Math.sin(k * Math.PI / 4))
      S(px, 81, pz, 'sea_lantern'); S(px, 82, pz, 'light_blue_stained_glass')
    }
    // the small helipad on the west wing roof, centred (221, 303)
    helipad(221, 303, 74, 12, 10, 11, [3], 4, 2, 0)
    for (const [px, pz] of [[209, 303], [233, 303], [221, 291], [221, 315]]) { S(px, 73, pz, 'sea_lantern'); S(px, 74, pz, 'light_blue_stained_glass') }
    // the ladder up the tower's west side from the west wing roof
    for (let y = 74; y <= 80; y++) S(252, y, 310, 'white_concrete')
    for (let y = 74; y <= 81; y++) S(251, y, 310, 'ladder[facing=west]')
    // doorways wing - tower - wing (inside, scenery)
    clear(250, 65, 309, 253, 67, 311); clear(299, 65, 309, 302, 67, 311)

    // tower inside: the round desk, a stair to F2, a chandelier, tube lights, F2 desks and the atrium railing
    for (let x = CX - 6; x <= CX + 6; x++) for (let z = CZ - 6; z <= CZ + 6; z++) {
      const dx = x - CX, dz = z - CZ, d = Math.hypot(dx, dz)
      if (d >= 3.5 && d < 5 && !(dz < 0 && Math.abs(dx) <= 1)) S(x, 65, z, 'white_concrete')
    }
    S(CX, 65, CZ + 1, 'polished_blackstone_stairs[facing=north,half=bottom]')
    for (const [x, z] of [[276, 314], [272, 310], [280, 310]]) S(x, 66, z, 'light_gray_carpet')
    for (let k = 1; k <= 8; k++) for (const x of [296, 297]) S(x, 64 + k, 318 - k, 'polished_andesite_stairs[facing=north,half=bottom]')
    clear(296, 72, 311, 297, 72, 318)
    for (let z = 311; z <= 318; z++) { S(295, 73, z, 'iron_bars'); S(298, 73, z, 'iron_bars') }
    S(296, 73, 319, 'iron_bars'); S(297, 73, 319, 'iron_bars')
    for (let x = CX - 8; x <= CX + 8; x++) for (let z = CZ - 8; z <= CZ + 8; z++) {
      const d2 = (x - CX) ** 2 + (z - CZ) ** 2
      if (d2 < 36) continue
      // the atrium railing: every floor cell touching the hole, corners too, so the panes join (jail-spec 1.8.5)
      let rim = false
      for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) if ((x + a - CX) ** 2 + (z + c - CZ) ** 2 < 36) rim = true
      if (rim) S(x, 73, z, 'light_blue_stained_glass_pane')
    }
    for (let y = 75; y <= 80; y++) S(CX, y, CZ, 'iron_chain[axis=y]')
    S(CX, 74, CZ, 'sea_lantern')
    for (const [x, z] of [[268, 300], [284, 300], [268, 320], [284, 320], [262, 310], [290, 310], [276, 296], [276, 324]]) {
      for (let i = -1; i <= 1; i++) S(x + i, 70, z, 'end_rod[facing=east]')
      S(x - 1, 71, z, 'iron_chain[axis=y]'); S(x + 1, 71, z, 'iron_chain[axis=y]')
      S(x, 81, z, 'sea_lantern')
    }
    for (const [cx, cz] of [[264, 300], [288, 300], [264, 320], [288, 320]]) {
      F(cx - 1, 73, cz, cx + 1, 73, cz, 'spruce_slab[type=top]')
      S(cx, 73, cz < CZ ? cz - 1 : cz + 1, `dark_oak_stairs[facing=${cz < CZ ? 'north' : 'south'},half=bottom]`)
      S(cx + 1, 74, cz, 'light_gray_carpet')
    }
    S(276, 73, 290, 'potted_bamboo'); S(276, 73, 330, 'potted_bamboo'); S(262, 73, 316, 'barrel[facing=up,open=false]')

    // ---- the west wing inside: lobby, briefing room, office, dispatch ----
    for (let x = 197; x <= 249; x++) for (let y = 65; y <= 71; y++) S(x, y, 299, wingInt)
    for (let z = 300; z <= 320; z++) for (let y = 65; y <= 71; y++) S(236, y, z, wingInt)
    for (let z = 287; z <= 298; z++) for (let y = 65; y <= 71; y++) S(223, y, z, wingInt)
    clear(209, 65, 299, 211, 68, 299); clear(241, 65, 299, 243, 68, 299); clear(236, 65, 311, 236, 68, 313); clear(223, 65, 291, 223, 68, 293)
    // a screen: cyan glass in a black frame, sea_lanterns behind it in the wall's inner layer
    const screen = (x, xIn, za, zb, ya, yb) => {
      for (let z = za - 1; z <= zb + 1; z++) for (let y = ya - 1; y <= yb + 1; y++) {
        if (z < za || z > zb || y < ya || y > yb) S(x, y, z, 'black_concrete')
        else { S(x, y, z, 'cyan_stained_glass'); S(xIn, y, z, 'sea_lantern') }
      }
    }
    screen(197, 196, 303, 311, 67, 69)                                                    // the lobby's monitor wall
    // front desk: a counter with officers behind it, facing the door
    F(215, 65, 307, 229, 65, 307, 'white_concrete'); F(215, 66, 307, 229, 66, 307, 'smooth_quartz_slab[type=bottom]')
    F(229, 65, 302, 229, 65, 306, 'white_concrete'); F(229, 66, 302, 229, 66, 306, 'smooth_quartz_slab[type=bottom]')
    for (const x of [218, 222, 226]) S(x, 65, 306, 'polished_blackstone_stairs[facing=north,half=bottom]')
    for (let x = 226; x <= 234; x++) S(x, 65, 320, 'polished_blackstone_stairs[facing=south,half=bottom]')   // benches under the window
    for (let x = 199; x <= 205; x++) S(x, 65, 320, 'polished_blackstone_stairs[facing=south,half=bottom]')
    S(198, 65, 320, 'potted_bamboo'); S(234, 65, 301, 'potted_bamboo')
    S(213, 65, 301, 'iron_block'); S(213, 66, 301, 'light_blue_stained_glass')            // water cooler
    F(209, 64, 310, 212, 64, 320, 'light_blue_concrete')                                  // a runner from the door
    // briefing room: rows of chairs facing a screen on the west wall
    screen(197, 196, 289, 296, 67, 69)
    S(200, 65, 292, 'spruce_planks'); S(200, 65, 293, 'spruce_planks')
    for (const x of [203, 206, 209, 212, 215, 218]) for (const z of [289, 290, 291, 294, 295, 296]) S(x, 65, z, 'spruce_stairs[facing=east,half=bottom]')
    // office: desks, chairs, filing cabinets
    for (const x0 of [227, 233, 239, 245]) {
      F(x0, 65, 291, x0 + 2, 65, 291, 'spruce_slab[type=top]'); S(x0 + 1, 65, 292, 'dark_oak_stairs[facing=south,half=bottom]')
      S(x0 + 2, 66, 291, 'light_gray_carpet')
    }
    for (let z = 288; z <= 290; z++) F(249, 65, z, 249, 66, z, 'barrel[facing=up,open=false]')
    S(224, 65, 297, 'potted_bamboo')
    // dispatch (east office): screens in the tower-side wall, desks, chairs
    for (const [za, zb] of [[302, 306], [314, 318]]) {
      screen(249, 250, za, zb, 67, 68)
      for (let z = za; z <= zb; z++) S(248, 65, z, 'spruce_slab[type=top]')
      S(247, 65, za + 1, 'dark_oak_stairs[facing=west,half=bottom]'); S(247, 65, zb - 1, 'dark_oak_stairs[facing=west,half=bottom]')
    }
    S(238, 65, 319, 'potted_bamboo')

    // ---- the east wing: the garage hall (empty bays) and a workshop corner ----
    for (const [a1, a2] of [[311, 322], [325, 336]]) for (let x = a1; x <= a2; x++) {
      clear(x, 65, 321, x, 69, 322); S(x, 64, 321, 'blue_concrete'); S(x, 64, 322, 'blue_concrete') }
    for (let z = 301; z <= 320; z++) { S(317, 64, z, 'white_concrete'); S(330, 64, z, 'white_concrete') }
    for (let x = 311; x <= 336; x++) S(x, 64, 301, 'white_concrete')
    for (let x = 314; x <= 333; x++) for (let z = 304; z <= 314; z++) {                   // a skylight over the bays
      D(x, 72, z); S(x, 73, z, 'light_blue_stained_glass') }
    S(304, 65, 288, 'crafting_table'); S(306, 65, 288, 'anvil[facing=east]'); S(308, 65, 288, 'smithing_table')
    for (const z of [288, 289, 290]) F(303, 65, z, 303, 66, z, 'barrel[facing=up,open=false]')
    for (const z of [295, 296]) F(309, 65, z, 309, 66, z, 'coal_block')
    F(303, 65, 300, 303, 67, 302, 'iron_block')
    S(303, 65, 318, 'potted_bamboo')

    // ---- windows and doors ----
    const wN = faceOf('N', 195, 251, PZ1, PZ2), wS = faceOf('S', 195, 251, PZ1, PZ2)
    for (const a of [200, 213, 226, 239]) win(wN, a, a + 6, 66, 69, { sill: true })
    win(wS, 225, 245, 66, 69, { sill: true }); win(wS, 216, 219, 66, 69, { sill: true })
    const eN = faceOf('N', 301, 338, PZ1, PZ2), eS = faceOf('S', 301, 338, PZ1, PZ2)
    for (const a of [305, 315, 326]) win(eN, a, a + 5, 66, 69, { sill: true })
    win(eS, 303, 308, 66, 69, { sill: true })
    // the POLICE doors: a closed double iron door in the inner layer, the frame outside
    clear(210, 65, 322, 211, 67, 322)
    door(B, 210, 65, 321, 'south', 'right', false); door(B, 211, 65, 321, 'south', 'left', false)
    S(210, 67, 321, 'light_blue_stained_glass'); S(211, 67, 321, 'light_blue_stained_glass')
    F(209, 64, 322, 209, 68, 322, 'light_gray_concrete'); F(212, 64, 322, 212, 68, 322, 'light_gray_concrete')
    F(210, 68, 322, 211, 68, 322, 'light_gray_concrete')
    F(208, 70, 322, 214, 70, 322, 'blue_concrete')                                       // sign band behind the white POLICE label

    // ---- the keycard route (ESCAPE-SPEC 3.4): the paste is sparse, so openings are set to air ----
    // the yard (north) door in the west wing's north face, x 210..211 between the window frames at x 207 and 212:
    // the outer layer open, a closed iron double door in the inner layer (hinges outside), a transom, the frame
    F(210, 65, 285, 211, 67, 285, 'air')
    door(B, 210, 65, 286, 'north', 'left', false); door(B, 211, 65, 286, 'north', 'right', false)
    S(210, 67, 286, 'light_blue_stained_glass'); S(211, 67, 286, 'light_blue_stained_glass')
    F(209, 64, 285, 209, 68, 285, 'light_gray_concrete'); F(212, 64, 285, 212, 68, 285, 'light_gray_concrete')
    F(210, 68, 285, 211, 68, 285, 'light_gray_concrete')
    S(209, 66, 285, 'red_concrete'); S(209, 66, 284, 'tripwire_hook[facing=north,attached=false,powered=false]')  // reader outside
    S(212, 66, 286, 'red_concrete'); S(212, 66, 287, 'tripwire_hook[facing=south,attached=false,powered=false]')  // reader inside
    // the POLICE doors' inside reader (no outside reader: they open only from inside)
    S(209, 66, 321, 'red_concrete'); S(209, 66, 320, 'tripwire_hook[facing=north,attached=false,powered=false]')
    // roller doors on the garage bays (inner layer z 321; the outer layer z 322 stays a 1-deep recess), so the station
    // is closed to the lot
    for (const [a1, a2] of [[311, 322], [325, 336]]) for (let x = a1; x <= a2; x++) for (let y = 65; y <= 69; y++) {
      S(x, y, 321, y % 2 ? 'light_gray_concrete' : 'polished_andesite') }

    // ---- the front: star, flagpole, planter, paving, stalls, the Bank Truck box, the fence segment ----
    const STAR = ['...X...', '...X...', 'XXXXXXX', '.XXXXX.', '..XXX..', '.XX.XX.', 'XX...XX']   // y 73 (top) .. 67
    const TIPS = new Set(['3,0', '0,2', '6,2', '0,6', '6,6', '1,6', '5,6'])
    STAR.forEach((row, r) => [...row].forEach((c, i) => { if (c === 'X') S(273 + i, 73 - r, 335, TIPS.has(`${i},${r}`) ? 'quartz_block' : 'sea_lantern') }))
    // the face behind it (outer layer z 334): a white pier across the G windows, and a blue outline around the star's
    // silhouette (as in the game: a glowing white star with a thin blue edge; white lanterns on white would not read)
    F(272, 66, 334, 280, 70, 334, 'white_concrete')
    const starAt = (x, y) => { const r = 73 - y, i = x - 273; return r >= 0 && r < 7 && i >= 0 && i < 7 && STAR[r][i] === 'X' }
    for (let x = 272; x <= 280; x++) for (let y = 66; y <= 74; y++) {
      if (starAt(x, y)) continue
      let edge = false
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (starAt(x + dx, y + dy)) edge = true
      if (edge) S(x, y, 334, 'blue_concrete')
    }
    // paving of the POL box around the buildings
    const planter = (x, z) => x >= 260 && x <= 268 && z >= 338 && z <= 344
    for (let x = 193; x <= 338; x++) for (let z = 283; z <= 345; z++) {
      if (inBld(x, z) || planter(x, z) || (x <= 194 && z === 322)) continue
      let s
      if (z <= 322) s = conc                                                                // the yard side and the notches
      else if (x >= 252 && x <= 300) s = conc                                               // the star plaza
      else if (z <= 324 && x >= 195 && x <= 310) s = conc                                   // sidewalk along the front
      else s = ASPH
      S(x, 64, z, s)
    }
    for (let x = 195; x <= 310; x++) if (!(x >= 208 && x <= 213) && !(x >= 252 && x <= 300)) S(x, 65, 324, 'smooth_stone_slab[type=bottom]')
    // stall lines (4 wide x 8 deep) and the Bank Truck drop-off box
    for (const x of [196, 200, 204, 208, 214, 218, 222, 226, 230, 234, 238]) for (let z = 325; z <= 332; z++) S(x, 64, z, 'white_concrete')
    for (let x = 240; x <= 250; x++) for (let z = 330; z <= 338; z++) {
      if (x === 240 || x === 250 || z === 330 || z === 338 || mod(x - z, 4) === 0) S(x, 64, z, 'white_concrete') }
    // planter with 2 cypresses and the flagpole
    for (let x = 260; x <= 268; x++) for (let z = 338; z <= 344; z++) {
      if (x === 260 || x === 268 || z === 338 || z === 344) { S(x, 64, z, 'smooth_stone'); S(x, 65, z, 'smooth_stone_slab[type=bottom]') } }
    cypress(262, 342); cypress(266, 342)
    for (const [x, z] of [[261, 339], [267, 339], [264, 343], [263, 339]]) S(x, 65, z, 'short_grass')
    S(264, 64, 340, 'polished_andesite')
    for (let y = 65; y <= 79; y++) S(264, y, 340, 'waxed_lightning_rod[facing=up]')
    S(264, 80, 340, 'end_rod[facing=up]')
    for (let x = 265; x <= 270; x++) for (let y = 76; y <= 79; y++) {
      const canton = x <= 266 && y >= 78
      S(x, y, 340, canton ? 'light_blue_wool' : (y === 79 || y === 77) ? 'red_wool' : 'white_wool')
    }
    // chain-link segment x 193..194 on z 322, from M1's inner gate fence (its end post at x 192) to the west wing, in
    // M1's make-up (jail-spec 1.2, 3.2): x 193 mesh (curb, bars 66..70, wires 71..72), x 194 a post (65..72); the
    // outrigger leans one block away from the yard at y 72, like M1's
    S(193, 64, 322, 'smooth_stone'); S(194, 64, 322, 'smooth_stone'); S(193, 65, 322, 'polished_andesite')
    for (let y = 65; y <= 72; y++) S(194, y, 322, 'diorite_wall')
    for (let y = 66; y <= 70; y++) S(193, y, 322, 'iron_bars')
    S(193, 71, 322, 'iron_chain[axis=x]'); S(193, 72, 322, 'iron_chain[axis=x]')
    S(194, 72, 323, 'andesite_wall'); S(193, 72, 323, 'iron_chain[axis=x]')
  }

  // ===================== 6.3 Prison Gun Shop (GUN) =====================
  const gunShop = () => {
    const X1 = 290, X2 = 333, Z1 = 237, Z2 = 259
    const lay = rectLayer(X1, X2, Z1, Z2)
    const ext = (x, y, z) => y === 64 ? 'blue_concrete' : (y === 69 || y === 71) ? 'light_blue_concrete' : W(x, y, z)
    const inr = (x, y, z) => (y === 68 || y === 70) ? 'red_concrete' : NV(x, y, z)
    const floor = (x, y, z) => ((x >> 1) + (z >> 1)) % 2 ? 'red_concrete' : 'red_terracotta'
    for (let x = X1; x <= X2; x++) for (let z = Z1; z <= Z2; z++) {
      const l = lay(x, z)
      if (l <= 2) {
        for (let y = 64; y <= 72; y++) S(x, y, z, l === 1 ? ext : inr)
        S(x, 73, z, 'blue_concrete'); S(x, 74, z, 'blue_concrete')                         // the blue cap
        if (l === 1) S(x, 75, z, 'iron_bars')                                              // railing
      } else { S(x, 64, z, floor); S(x, 73, z, 'smooth_stone') }
    }
    for (let z = Z1; z <= Z2 + 1; z++) { S(X1 - 1, 74, z, 'blue_concrete'); S(X2 + 1, 74, z, 'blue_concrete') }   // the lip (none north: W6)
    for (let x = X1 - 1; x <= X2 + 1; x++) S(x, 74, Z2 + 1, 'blue_concrete')
    // front: the big window, the single open door, the small window, the target logo
    const fS = faceOf('S', X1, X2, Z1, Z2)
    win(fS, 293, 309, 65, 68); win(fS, 326, 331, 65, 68)
    for (const [a, c] of [[292, 310], [325, 332]]) for (let x = a; x <= c; x++) S(x, 64, Z2, 'blue_concrete')   // the base line runs on under the windows, as in the photo
    // the door is keycard-only (owner, 2026-10-20: "the gun shop is supposed to be keycard access only in the prison"):
    // built closed, a reader outside on the frame's right post like the police station's (jailescape.sk opens it for a
    // keycard and from inside for anyone). The paste is sparse: the opening is set to air.
    F(316, 65, 259, 316, 66, 259, 'air')
    door(B, 316, 65, 258, 'south', 'left', false)
    F(315, 65, 259, 315, 67, 259, 'light_gray_concrete'); F(317, 65, 259, 317, 67, 259, 'light_gray_concrete')
    S(316, 67, 259, 'light_gray_concrete'); S(316, 67, 258, 'light_gray_concrete')
    S(317, 66, 259, 'red_concrete'); S(317, 66, 260, 'tripwire_hook[facing=south,attached=false,powered=false]')  // the reader outside
    const LOGO = ['WRRRW', 'RKKKR', 'RKCKR', 'RKKKR', 'WRRRW']                              // y 72 (top) .. 68
    LOGO.forEach((row, r) => [...row].forEach((c, i) => {
      const x = 314 + i, y = 72 - r
      S(x, y, 259, c === 'R' ? 'red_concrete' : c === 'K' ? 'black_concrete' : c === 'C' ? 'white_concrete' : W(x, y, 259))
    }))
    // the path to the door (M1's walkway is at z 265..278)
    for (let x = 314; x <= 318; x++) for (let z = 260; z <= 262; z++) S(x, 64, z, conc)
    // inside: the pegboard gun wall, the glass counter, shelves, the bench, lights
    F(296, 66, 239, 327, 69, 239, 'iron_trapdoor[facing=south,half=bottom,open=true]')
    F(296, 65, 239, 327, 65, 239, 'dark_oak_slab[type=top]')
    S(300, 65, 247, 'white_concrete'); S(322, 65, 247, 'white_concrete')
    for (let x = 301; x <= 321; x++) { S(x, 65, 247, 'glass'); S(x, 64, 247, 'black_concrete') }
    S(293, 65, 241, 'smithing_table'); S(295, 65, 241, 'anvil[facing=north]')
    for (const z of [243, 244, 245]) F(292, 65, z, 292, 66, z, 'barrel[facing=up,open=false]')
    F(329, 65, 240, 331, 66, 241, 'iron_block'); F(329, 67, 240, 331, 67, 241, 'polished_blackstone_slab[type=bottom]')   // a safe
    for (const z of [244, 245]) F(331, 65, z, 331, 67, z, 'barrel[facing=west,open=false]')
    for (let z = 249; z <= 255; z++) S(292, 65, z, 'barrel[facing=east,open=false]')          // ammo boxes along the west wall
    for (let x = 295; x <= 302; x++) S(x, 65, 257, 'polished_blackstone_stairs[facing=south,half=bottom]')   // bench under the window
    for (let x = 315; x <= 317; x++) S(x, 65, 257, 'gray_carpet')
    S(325, 65, 256, 'potted_bamboo'); S(331, 65, 256, 'potted_bamboo')
    for (const [x0, z] of [[302, 243], [316, 243], [296, 252], [310, 252], [324, 252]]) F(x0, 73, z, x0 + 4, 73, z, 'sea_lantern')
    // roof: an HVAC unit
    F(298, 74, 243, 300, 75, 245, 'light_gray_concrete'); S(299, 76, 244, 'iron_trapdoor[facing=north,half=bottom,open=false]')
    // the punch box on the east face (apron x 334): cabinet, door decor, LED strip, conduits
    // the cabinet: two diamond-plate doors meeting at a seam of open iron_trapdoors (flat on the face) at z 254; the
    // conduits keep 3+ from them (jail-spec 1.8)
    F(334, 65, 252, 334, 67, 256, 'iron_block')
    S(334, 65, 254, 'iron_trapdoor[facing=west,half=bottom,open=true]'); S(334, 66, 254, 'iron_trapdoor[facing=west,half=bottom,open=true]')
    for (let y = 65; y <= 67; y++) { S(334, y, 257, 'light_blue_stained_glass'); S(333, y, 257, 'sea_lantern') }
    // conduits: waxed lightning rods (a plain copper rod weathers to green over time)
    for (let y = 68; y <= 70; y++) { S(334, y, 253, 'waxed_lightning_rod[facing=up]'); S(334, y, 255, 'waxed_lightning_rod[facing=up]') }
    // a brown sign plate in the wall behind the light-red "Don't Punch!" label (334.03, 66.0, 250.5), as in the game
    F(333, 65, 249, 333, 66, 251, 'dark_oak_planks')
  }

  // ===================== 6.4 Maximum Security (MS-A, MS-B, MS-C; scenery shell) =====================
  const maxSecurity = () => {
    // ---- the bar x 65..239, z 0..42, walls 64..82, roof 83 ----
    const BX1 = 65, BX2 = 239, BZ1 = 0, BZ2 = 42
    const bl = rectLayer(BX1, BX2, BZ1, BZ2)
    const pil = []; for (let k = 0; k <= 14; k++) pil.push(65 + Math.round(k * 173 / 14))   // 2-wide pillars, ~every 12
    const pilX = new Set(pil.flatMap(p => [p, p + 1]))
    const panelsX = []; for (let k = 0; k < 14; k++) panelsX.push([pil[k] + 2, pil[k + 1] - 1])
    const pilZ = new Set([0, 1, 14, 15, 27, 28, 41, 42])
    const panelsZ = [[2, 13], [16, 26], [29, 40]]
    const wRow = y => (y >= 72 && y <= 74) || (y >= 78 && y <= 80)
    const fRow = y => y === 71 || y === 75 || y === 77 || y === 81
    // one cell of the bar's outer layer on a face; null = a window opening (the inner layer gets glass)
    const barOuter = (x, y, z, face) => {
      const ns = face === 'N' || face === 'S', along = ns ? x : z
      if (y === 82) return 'blue_concrete'
      if (ns ? pilX.has(x) : pilZ.has(z)) return LGM(x, y, z)
      if (y === 64) return 'polished_deepslate'
      if (y === 76) return 'light_gray_concrete'
      const pan = (ns ? panelsX : panelsZ).find(([p1, p2]) => along >= p1 && along <= p2)
      if (!pan) return DK(x, y, z)
      if (face === 'S' && along >= 182) return DK(x, y, z)                                 // behind the front block
      if (face === 'S' && pan[0] <= 181 && pan[1] >= 164) return y >= 71 ? louvre(y) : DK(x, y, z)   // the side wing's louvres
      if (face === 'N') return (wRow(y) && along >= pan[0] + 2 && along <= pan[1] - 2 && mod(along - pan[0], 3) === 2) ? null : DK(x, y, z)
      const a1 = pan[0] + 2, a2 = pan[1] - 2
      if (along >= a1 && along <= a2) return wRow(y) ? ((y === 73 || y === 79) ? 'iron_bars' : null) : fRow(y) ? 'light_gray_concrete' : DK(x, y, z)
      if ((along === a1 - 1 || along === a2 + 1) && (wRow(y) || fRow(y))) return 'light_gray_concrete'
      return DK(x, y, z)
    }
    const faceAt = (x, z) => z === BZ1 ? 'N' : z === BZ2 ? 'S' : x === BX1 ? 'W' : 'E'
    for (let x = BX1; x <= BX2; x++) for (let z = BZ1; z <= BZ2; z++) {
      const l = bl(x, z)
      if (l === 1) for (let y = 64; y <= 82; y++) S(x, y, z, barOuter(x, y, z, faceAt(x, z)))
      else if (l === 2) {
        const [ox, oz] = z === BZ1 + 1 ? [x, BZ1] : z === BZ2 - 1 ? [x, BZ2] : x === BX1 + 1 ? [BX1, z] : [BX2, z]
        for (let y = 64; y <= 82; y++) {
          const o = barOuter(ox, y, oz, faceAt(ox, oz))
          S(x, y, z, (o === null || o === 'iron_bars') ? 'light_blue_stained_glass_pane' : 'light_gray_concrete')
        }
      }
      S(x, 83, z, 'blue_concrete')                                                         // the roof
    }
    for (let z = BZ1 - 1; z <= BZ2; z++) { S(BX1 - 1, 83, z, 'blue_concrete'); S(BX2 + 1, 83, z, 'blue_concrete') }
    for (let x = BX1 - 1; x <= BX2 + 1; x++) S(x, 83, BZ1 - 1, 'blue_concrete')
    // 4 skylights: glass in the roof under an iron_bars grid in a raised grey curb
    for (const [x1, x2] of [[75, 94], [106, 127], [139, 159], [171, 191]]) {
      for (let x = x1 - 1; x <= x2 + 1; x++) for (let z = 9; z <= 29; z++) {
        if (x < x1 || x > x2 || z < 10 || z > 28) { S(x, 84, z, 'light_gray_concrete'); continue }
        S(x, 83, z, 'light_blue_stained_glass')
        if (mod(x - x1, 3) === 1 || z === 19) S(x, 84, z, 'iron_bars')
      }
    }
    for (const x0 of [100, 150, 205]) { F(x0, 84, 33, x0 + 2, 85, 35, 'light_gray_concrete'); S(x0 + 1, 86, 34, 'iron_trapdoor[facing=north,half=bottom,open=false]') }
    S(70, 84, 36, 'iron_trapdoor[facing=north,half=bottom,open=false]')                    // roof hatch

    // inside: three tiers of cells on both long walls, galleries and bridges around a tall atrium
    const TIERS = [64, 70, 76]
    for (let x = 67; x <= 237; x++) for (let z = 2; z <= 40; z++) {
      const cellZ = z <= 8 || z >= 34, walk = (z >= 9 && z <= 11) || (z >= 31 && z <= 33)
      S(x, 64, z, cellZ ? 'gray_concrete' : walk ? 'smooth_stone' : (mod(x, 6) === 0 || mod(z - 12, 6) === 0) ? 'polished_deepslate' : 'gray_concrete')
      if (cellZ) { S(x, 70, z, 'gray_concrete'); S(x, 76, z, 'gray_concrete'); S(x, 82, z, 'light_gray_concrete') }
      if (walk) { S(x, 70, z, 'smooth_stone'); S(x, 76, z, 'smooth_stone') }
      if (z >= 12 && z <= 30) {
        if (x <= 72 || x >= 232) S(x, 70, z, 'smooth_stone')
        if (x <= 72 || (x >= 232 && z <= 24)) S(x, 76, z, 'smooth_stone')
      }
    }
    for (const fl of TIERS) {
      const top = fl + 5
      for (const [zf, z1, z2, zb, facing] of [[8, 2, 7, 2, 'south'], [34, 35, 40, 40, 'north']]) {
        for (const xw of [67, 237].concat(Array.from({ length: 29 }, (_, k) => 68 + 6 * k)))
          for (let y = fl + 1; y <= top; y++) for (let z = Math.min(z1, zf); z <= Math.max(z2, zf); z++) S(xw, y, z, 'light_gray_concrete')
        for (let k = 0; k < 28; k++) {
          const x0 = 69 + 6 * k                                                             // cell inside x0..x0+4
          for (let x = x0; x <= x0 + 4; x++) { for (let y = fl + 1; y <= fl + 4; y++) S(x, y, zf, 'iron_bars'); S(x, top, zf, 'light_gray_concrete') }
          door(B, x0 + 2, fl + 1, zf, facing, 'left', false)
          for (let i = 0; i < 3; i++) { const z = zb === 2 ? 2 + i : 40 - i; S(x0, fl + 1, z, 'smooth_stone_slab[type=top]'); S(x0, fl + 2, z, 'white_carpet') }
          S(x0 + 4, fl + 1, zb, 'cauldron')
          S(x0 + 2, top, zb === 2 ? 5 : 37, 'end_rod[facing=down]')
        }
      }
    }
    for (const fl of [70, 76]) {                                                            // railings on the galleries and bridges
      for (let x = 73; x <= 231; x++) { S(x, fl + 1, 11, 'iron_bars'); S(x, fl + 1, 31, 'iron_bars') }
      for (let z = 12; z <= 30; z++) {
        if (!(fl === 70 && z >= 29)) S(72, fl + 1, z, 'iron_bars')
        if (fl === 70 || z <= 24) S(232, fl + 1, z, 'iron_bars')
      }
    }
    for (const x of [233, 234, 237]) S(x, 77, 24, 'iron_bars')
    for (let k = 1; k <= 6; k++) for (const z of [29, 30]) S(79 - k, 64 + k, z, 'polished_andesite_stairs[facing=west,half=bottom]')
    for (let k = 1; k <= 6; k++) for (const x of [235, 236]) S(x, 70 + k, 31 - k, 'polished_andesite_stairs[facing=north,half=bottom]')
    // the atrium: steel tables, a glass guard booth, lights under the galleries and the roof
    for (const x0 of [90, 112, 134, 186, 208]) for (const z0 of [16, 24]) {
      F(x0, 65, z0, x0 + 1, 65, z0 + 1, 'smooth_stone_slab[type=top]')
      for (const [x, z] of [[x0 - 1, z0], [x0 + 2, z0 + 1], [x0, z0 + 2], [x0 + 1, z0 - 1]]) S(x, 65, z, 'polished_andesite_slab[type=bottom]')
    }
    for (let x = 155; x <= 163; x++) for (let z = 17; z <= 25; z++) {
      const edge = x === 155 || x === 163 || z === 17 || z === 25, corner = (x === 155 || x === 163) && (z === 17 || z === 25)
      if (corner) F(x, 65, z, x, 67, z, 'light_gray_concrete')
      else if (edge && !(z === 25 && x === 159)) F(x, 65, z, x, 67, z, 'light_blue_stained_glass_pane')
      S(x, 68, z, 'polished_andesite_slab[type=bottom]')
    }
    F(157, 65, 19, 161, 65, 19, 'iron_block'); S(159, 65, 20, 'polished_blackstone_stairs[facing=north,half=bottom]')
    S(157, 66, 19, 'light_gray_carpet'); S(161, 66, 19, 'light_gray_carpet')
    for (let x = 68; x <= 236; x++) if (mod(x, 8) === 4) for (const fl of [70, 76]) { S(x, fl, 10, 'sea_lantern'); S(x, fl, 32, 'sea_lantern') }
    for (let x = 68; x <= 236; x++) if (mod(x, 8) === 0) {
      S(x, 82, 30, 'sea_lantern')
      if (!(x >= 75 && x <= 94) && !(x >= 106 && x <= 127) && !(x >= 139 && x <= 159) && !(x >= 171 && x <= 191)) S(x, 82, 20, 'sea_lantern')
    }

    // ---- the front block x 182..238, z 43..78, walls 64..86, roof 87; its gate face at z 78 ----
    const FX1 = 182, FX2 = 238, FZ1 = 43, FZ2 = 78
    const flay = rectLayer(FX1, FX2, FZ1, FZ2)
    const sidePil = new Set([43, 44, 60, 61, 77, 78])
    const fbOuter = (x, y, z, face) => {
      if (y === 86) return 'blue_concrete'
      if (y === 85) return 'light_gray_concrete'
      const pillar = face === 'S' || face === 'N' ? (x <= 183 || x >= 237) : sidePil.has(z)
      if (pillar) return LGM(x, y, z)
      if (y === 64) return 'polished_deepslate'
      if (y >= 77) return louvre(y)
      if (y === 76) return 'light_gray_concrete'
      if ((face === 'W' || face === 'E') && y >= 72 && y <= 74 && mod(z, 4) === 2) return null   // slit windows
      return DK(x, y, z)
    }
    const fFace = (x, z) => z === FZ2 ? 'S' : z === FZ1 ? 'N' : x === FX1 ? 'W' : 'E'
    for (let x = FX1; x <= FX2; x++) for (let z = FZ1; z <= FZ2; z++) {
      const l = flay(x, z)
      if (l === 1) for (let y = 64; y <= 86; y++) S(x, y, z, fbOuter(x, y, z, fFace(x, z)))
      else if (l === 2) {
        const [ox, oz] = z === FZ1 + 1 ? [x, FZ1] : z === FZ2 - 1 ? [x, FZ2] : x === FX1 + 1 ? [FX1, z] : [FX2, z]
        for (let y = 64; y <= 86; y++) S(x, y, z, fbOuter(ox, y, oz, fFace(ox, oz)) === null ? 'light_blue_stained_glass_pane' : 'light_gray_concrete')
      } else {
        S(x, 64, z, (mod(x, 6) === 0 || mod(z, 6) === 0) ? 'polished_deepslate' : 'gray_concrete')
        S(x, 86, z, (mod(x, 6) === 3 && mod(z, 6) === 3) ? 'sea_lantern' : 'white_concrete')
      }
      S(x, 87, z, 'blue_concrete')
    }
    for (let x = FX1; x <= FX2; x++) { S(x, 87, FZ2 + 1, 'blue_concrete'); S(x, 87, FZ1 - 1, 'blue_concrete') }   // lip (none west: M1's)
    for (let z = FZ1 - 1; z <= 68; z++) S(FX2 + 1, 87, z, 'blue_concrete')
    // the yard facade: two tall pillars, the braced dark gate panel, the glazed watch room above
    for (const [p1, p2] of [[186, 191], [229, 234]]) F(p1, 64, 76, p2, 86, 79, LGM)
    for (let x = 192; x <= 228; x++) {
      for (let y = 64; y <= 76; y++) { D(x, y, 78); S(x, y, 77, DK); S(x, y, 76, 'light_gray_concrete') }
      for (let y = 77; y <= 84; y++) { D(x, y, 78); S(x, y, 77, 'light_blue_stained_glass_pane'); D(x, y, 76) }
      for (const z of [76, 77, 78]) S(x, 85, z, 'light_gray_concrete')
      S(x, 86, 77, 'blue_concrete'); S(x, 86, 78, 'blue_concrete'); S(x, 86, 76, 'white_concrete')
      if (mod(x - 192, 6) === 0) F(x, 77, 78, x, 84, 78, 'light_gray_concrete')            // mullions
      else { S(x, 79, 78, 'iron_bars'); S(x, 82, 78, 'iron_bars') }                       // horizontal bars
    }
    // diagonals as walls: 1.5 tall each, so the braces are no staircase up the facade
    const brace = (xa, ya, xb, yb) => line4(xa, ya, xb, yb, (x, y) => S(x, y, 78, 'andesite_wall'))
    brace(192, 64, 204, 70); brace(192, 70, 204, 76)                                        // left bay: "/"
    brace(228, 64, 216, 70); brace(228, 70, 216, 76)                                        // right bay: "\"
    brace(204, 64, 216, 70); brace(216, 64, 204, 70); brace(204, 70, 216, 76); brace(216, 70, 204, 76)   // middle: X X
    for (const x of [192, 204, 216, 228]) F(x, 64, 78, x, 76, 78, 'light_gray_concrete')
    for (const y of [64, 70, 76]) F(192, y, 78, 228, y, 78, 'light_gray_concrete')
    for (let x = 182; x <= 238; x++) for (const z of [79, 80]) if (!((x >= 186 && x <= 191) || (x >= 229 && x <= 234)) || z === 80) S(x, 64, z, 'polished_andesite')
    // inside: the gate hall, a stair to the watch room, crates, lights
    // the watch-room floor at y 76 (only the facade pillars' own cells at z 76 are left alone)
    for (let x = 184; x <= 236; x++) for (let z = 62; z <= 76; z++) if (!(z === 76 && ((x >= 186 && x <= 191) || (x >= 229 && x <= 234)))) S(x, 76, z, (mod(x, 6) === 3 && (z === 66 || z === 72)) ? 'sea_lantern' : 'light_gray_concrete')
    for (let k = 1; k <= 12; k++) for (const x of [184, 185]) S(x, 64 + k, 49 + k, 'polished_andesite_stairs[facing=south,half=bottom]')
    for (let x = 186; x <= 236; x++) S(x, 77, 62, 'iron_bars')
    for (const x of [196, 208, 220, 232]) F(x, 65, 62, x, 75, 62, 'light_gray_concrete')
    for (let x = 192; x <= 228; x++) for (const z of [74, 75]) S(x, 64, z, mod(x + z, 4) < 2 ? 'yellow_concrete' : 'black_concrete')
    F(188, 65, 46, 190, 65, 48, 'barrel[facing=up,open=false]'); F(188, 66, 46, 189, 66, 47, 'barrel[facing=up,open=false]')
    F(226, 65, 46, 230, 65, 47, 'barrel[facing=up,open=false]'); F(214, 65, 46, 216, 66, 46, 'iron_block')
    F(200, 65, 70, 202, 65, 70, 'spruce_slab[type=top]'); S(201, 65, 69, 'polished_blackstone_stairs[facing=north,half=bottom]')
    // the watch room: consoles facing the yard, chairs, camera walls on both side walls
    for (let x = 188; x <= 232; x++) if (mod(x, 8) !== 4) {
      S(x, 77, 74, 'iron_block'); if (mod(x, 2) === 0) S(x, 78, 74, 'light_gray_carpet')
      if (mod(x, 4) === 2) S(x, 77, 73, 'polished_blackstone_stairs[facing=north,half=bottom]')
    }
    const camWall = (x, xIn) => {
      for (let z = 63; z <= 75; z++) for (let y = 77; y <= 84; y++) {
        if (z === 63 || z === 75 || y === 77 || y === 84) S(x, y, z, 'blue_concrete')
        else { S(x, y, z, 'cyan_stained_glass'); S(xIn, y, z, 'sea_lantern') }
      }
    }
    camWall(184, 183); camWall(236, 237)
    // roof: an HVAC unit and an antenna mast
    F(200, 88, 55, 202, 89, 57, 'light_gray_concrete'); S(201, 90, 56, 'iron_trapdoor[facing=north,half=bottom,open=false]')
    for (let y = 88; y <= 94; y++) S(215, y, 50, 'iron_bars')
    S(215, 95, 50, 'end_rod[facing=up]')

    // ---- the east block x 239..252, z 43..68, walls 64..82, roof 83 (louvred side wing) ----
    const EX1 = 239, EX2 = 252, EZ1 = 43, EZ2 = 68
    const el = rectLayer(EX1, EX2, EZ1, EZ2)
    const ebOuter = (x, y, z, face) => {
      if (y === 82) return 'blue_concrete'
      const pillar = face === 'S' || face === 'N' ? [239, 240, 245, 246, 251, 252].includes(x) : [43, 44, 55, 56, 67, 68].includes(z)
      if (pillar) return LGM(x, y, z)
      if (y === 64) return 'polished_deepslate'
      if (y >= 70) return louvre(y)
      return DK(x, y, z)
    }
    const eFace = (x, z) => z === EZ2 ? 'S' : z === EZ1 ? 'N' : x === EX1 ? 'W' : 'E'
    for (let x = EX1; x <= EX2; x++) for (let z = EZ1; z <= EZ2; z++) {
      const l = el(x, z)
      if (l === 1) for (let y = 64; y <= 82; y++) S(x, y, z, ebOuter(x, y, z, eFace(x, z)))
      else if (l === 2) for (let y = 64; y <= 82; y++) S(x, y, z, 'light_gray_concrete')
      else { S(x, 64, z, (mod(x, 4) === 0 || mod(z, 4) === 0) ? 'polished_deepslate' : 'gray_concrete'); S(x, 82, z, 'white_concrete') }
      S(x, 83, z, 'blue_concrete')
    }
    for (let z = EZ1 - 1; z <= EZ2; z++) S(EX2 + 1, 83, z, 'blue_concrete')
    for (let x = EX1 + 1; x <= EX2 + 1; x++) S(x, 83, EZ1 - 1, 'blue_concrete')
    // inside: a generator room (machines, vents, pipes), stacked barrels, lights
    F(243, 65, 49, 247, 66, 53, 'iron_block'); F(243, 67, 50, 247, 67, 52, 'polished_andesite_slab[type=bottom]')
    for (let z = 50; z <= 52; z++) { S(242, 65, z, 'waxed_copper_grate'); S(242, 66, z, 'waxed_copper_grate') }
    for (const z of [47, 49, 51]) for (let y = 65; y <= 81; y++) S(249, y, z, 'polished_basalt[axis=y]')
    for (let z = 59; z <= 64; z++) F(242, 65, z, 243, z % 2 ? 67 : 66, z, 'barrel[facing=up,open=false]')
    F(247, 65, 60, 249, 66, 63, 'iron_block')
    for (const [x, z] of [[245, 47], [245, 56], [245, 64], [248, 56]]) S(x, 82, z, 'sea_lantern')
  }

  visitors()
  police()
  gunShop()
  maxSecurity()

  const strays = []
  for (const [k, s] of blocks) {
    const [x, y, z] = k.split(',').map(Number)
    if (inRegion(x, y, z)) b.set(x, y, z, s); else strays.push(`${k} ${s}`)
  }
  module.exports.strays = strays
  return b
}

// Fixed labels (jail-spec 1.8 and 10): on the face plane + 0.03 along facing.
module.exports.labels = [
  { x: 139.0, y: 69.5, z: 276.97, facing: 'north', text: 'VISITORS', color: '#ffffff', scale: 4 },
  { x: 139.0, y: 69.5, z: 321.03, facing: 'south', text: 'VISITORS', color: '#ffffff', scale: 4 },
  { x: 211.0, y: 70.5, z: 323.03, facing: 'south', text: 'POLICE', color: '#ffffff', scale: 3 },
  { x: 334.03, y: 66.0, z: 250.5, facing: 'east', text: "Don't Punch!", color: '#ff8f80', scale: 1.5 },
  { x: 211.0, y: 69.5, z: 284.97, facing: 'north', text: 'POLICE · STAFF ONLY', color: '#ffffff', scale: 0.8 }, // L_POLICE_N
  { x: 316.5, y: 67.5, z: 260.03, facing: 'south', text: 'KEYCARD', color: '#ffffff', scale: 0.5 } // L_GUNSHOP, on the lintel
]
// Skript spots (jail-spec 7 and 10): the Gun Shop's shopkeeper, facing the customers; the escape's police station
// (ESCAPE-SPEC Appendix B, M5).
module.exports.points = {
  GUN_KEEPER: [311.5, 65.0, 243.5, 0],
  ROUTE_POLDESK_1: [220.5, 65, 304.5, 0], // the desk cop behind the front desk, facing the POLICE doors
  ROUTE_POLOFFICE_1: [225.5, 65, 292.5, 0], // the office cop's loop in the north-east office
  ROUTE_POLOFFICE_2: [225.5, 65, 296.5, 0],
  ROUTE_POLOFFICE_3: [246.5, 65, 296.5, 0],
  ROUTE_POLOFFICE_4: [246.5, 65, 293.5, 0],
  POL_DOOR_N: [210, 65, 286, 0],
  POL_DOOR_S: [210, 65, 321, 0],
  POL_READER_N_OUT: [209, 66, 284, 0],
  POL_READER_N_IN: [212, 66, 287, 0],
  POL_READER_S_IN: [209, 66, 320, 0],
  POL_IN: [210.5, 65, 288.5, 180],
  L_POLICE_N: [211.0, 69.5, 284.97, 180],
  // the keycard-only Gun Shop door (2026-10-20): the door, its reader outside, a spot outside and one inside
  GUN_DOOR: [316, 65, 258, 0],
  GUN_READER: [317, 66, 260, 0],
  GUN_OUT: [316.5, 65, 261.5, 180],
  GUN_IN: [316.5, 65, 256.5, 0],
  L_GUNSHOP: [316.5, 67.5, 260.03, 0]
}
module.exports.strays = []
