// M2 of the Jailbreak prison (jail-spec 4.1-4.7): the main building's shell (walls, roofs, fascias, windows, exterior
// doors, skylights, roof equipment) plus Hall A (the entrance hall), Hall B, the G part of the stairwell, the Cafeteria,
// the Telephone room and the Infirmary. Everything else inside the shell is M4's, B1 below is M3's.
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

// ---- M2 geometry ----
const memo = f => { const m = new Map(); return (x, z) => { const k = (x + 100) * 1000 + z + 100; let v = m.get(k); if (v === undefined) { v = f(x, z); m.set(k, v) } return v } }
const IM = memo(inMain)
const IU = memo(inUpper)
const R1m = memo((x, z) => ring(IM, x, z, 1))          // the main ring's outer layer
const R2m = memo((x, z) => ring(IM, x, z, 2))          // the main ring (2 thick)
const R1u = memo((x, z) => ring(IU, x, z, 1))          // the upper block's outer layer
const R2u = memo((x, z) => ring(IU, x, z, 2))          // the upper block's ring
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const APR = memo((x, z) => !IM(x, z) && N8.some(([dx, dz]) => IM(x + dx, z + dz)))   // the 1-block apron
// M1's cells inside the apron: the brick walls W2 (z 73 +-1, to x 40) and W3 (z 72 +-1, from x 129), F6's end post
const M1X = (x, z) => (x === 40 && z >= 72 && z <= 74) || (x >= 129 && x <= 181 && z >= 71 && z <= 73) || (x === 88 && z === 246)
const BX0 = 39, BX1 = 144, BZ0 = 43, BZ1 = 247          // every column M2 can touch

module.exports = (b) => {
  const L = new Map()                                  // a local buffer, so openings can be cut; copied into b at the end
  const K = (x, y, z) => `${x},${y},${z}`
  const S = (x, y, z, s) => { L.set(K(x, y, z), s) }
  const D = (x, y, z) => { L.delete(K(x, y, z)) }
  const G = (x, y, z) => L.get(K(x, y, z))
  const F = (x1, y1, z1, x2, y2, z2, s) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) S(x, y, z, typeof s === 'function' ? s(x, y, z) : s)
  }
  const LB = { set: S }                                // for door() and bed()
  const W = (x, y, z) => pick(x, y, z, MIX.white)
  const BR = (x, y, z) => pick(x, y, z, MIX.brick)
  const cols = fn => { const out = []; for (let x = BX0; x <= BX1; x++) for (let z = BZ0; z <= BZ1; z++) if (fn(x, z)) out.push([x, z]); return out }

  // block states used often
  const STAIRS = (m, f, half = 'bottom') => `${m}_stairs[facing=${f},half=${half},shape=straight,waterlogged=false]`
  const SLAB = (m, t) => `${m}_slab[type=${t},waterlogged=false]`
  const TRAP = (f, half, open) => `iron_trapdoor[facing=${f},half=${half},open=${open},powered=false,waterlogged=false]`
  const CHAIN = 'iron_chain[axis=y,waterlogged=false]'
  const LANTERN = 'lantern[hanging=true,waterlogged=false]'
  const GLASS = 'light_blue_stained_glass_pane'
  const FROG = 'ochre_froglight[axis=y]'
  const ROD = 'lightning_rod[facing=up,powered=false,waterlogged=false]'
  const HOOK = f => `tripwire_hook[facing=${f},attached=false,powered=false]`
  const CANDLE = c => `${c}_candle[candles=1,lit=false,waterlogged=false]`

  // wall rows: the exterior face, the inside face (Hall finish: skirting, bands y 68 and 70), piers, the upper storeys
  const extRow = (x, y, z) => y === 64 ? 'light_gray_concrete' : (y === 65 || y === 68) ? 'orange_concrete' : y === 70 ? 'orange_terracotta' : W(x, y, z)
  const intRow = (x, y, z) => y === 64 ? 'gray_concrete' : y === 65 ? 'orange_terracotta' : (y === 68 || y === 70) ? 'orange_concrete' : W(x, y, z)
  const ringIn = (x, y, z) => y === 64 ? 'light_gray_concrete' : intRow(x, y, z)
  const pierRow = (x, y, z) => y === 64 ? 'gray_concrete' : y === 65 ? 'orange_terracotta' : (y === 68 || y === 70) ? 'orange_concrete' : 'smooth_quartz'
  const highRow = (x, y, z) => y === 72 ? 'light_gray_concrete' : y === 75 ? 'orange_concrete' : W(x, y, z)   // the cafeteria's walls above y 71 (y 72: the L2 floor line)
  const brickRow = (x, y, z) => y === 70 ? 'orange_concrete' : y === 71 ? 'smooth_quartz' : BR(x, y, z)

  // ================= 1. Shell: footing, G storey, low-wing fascia, upper walls, roofs =================
  for (const [x, z] of cols(IM)) {
    if (R2m(x, z)) {
      const outer = R1m(x, z)
      S(x, 62, z, 'stone_bricks'); S(x, 63, z, 'stone_bricks')
      for (let y = 64; y <= 71; y++) S(x, y, z, outer ? extRow(x, y, z) : ringIn(x, y, z))
      if (!IU(x, z)) for (let y = 72; y <= 74; y++) S(x, y, z, 'orange_concrete')       // fascia 72..73, parapet 74
    }
    if (R2u(x, z)) {
      const outer = R1u(x, z), flush = R2m(x, z)
      for (let y = 72; y <= 81; y++) {
        let s
        if (y === 72) s = flush && outer ? 'orange_terracotta' : 'light_gray_concrete'   // a storey line; a beam over the low roof
        else if (y === 75 || y >= 79) s = 'orange_concrete'                               // band; fascia 79..80, parapet 81
        else s = W(x, y, z)
        if (s) S(x, y, z, s)
      }
    } else if (IU(x, z)) S(x, 79, z, 'orange_terracotta')                                 // the upper roof
    else if (!R2m(x, z)) S(x, 72, z, 'orange_terracotta')                                 // the low roof
  }
  // corners and chamfer jogs: quartz pillars in the white rows of the outer layer
  const corner = (inside, x, z) => (!inside(x - 1, z) || !inside(x + 1, z)) && (!inside(x, z - 1) || !inside(x, z + 1))
  for (const [x, z] of cols(R1m)) if (corner(IM, x, z)) for (const y of [66, 67, 69, 71]) S(x, y, z, 'quartz_pillar[axis=y]')
  for (const [x, z] of cols(R1u)) if (corner(IU, x, z)) for (const y of [73, 74, 76, 77, 78]) S(x, y, z, 'quartz_pillar[axis=y]')

  // lips and soffits: the low roof's lip in the apron (y 73, soffit 72), the upper roof's lip one block out (y 80, soffit 79)
  const toward = (inside, x, z) => {
    for (const [dx, dz, f] of [[1, 0, 'east'], [-1, 0, 'west'], [0, 1, 'south'], [0, -1, 'north']]) if (inside(x + dx, z + dz)) return f
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) if (inside(x + dx, z + dz)) return dx > 0 ? 'east' : 'west'
    return null
  }
  const lowWing = (x, z) => IM(x, z) && !IU(x, z)
  for (const [x, z] of cols((x, z) => (IM(x, z) || APR(x, z)) && !M1X(x, z))) {
    if (!IU(x, z)) {
      const f = toward(IU, x, z)
      if (f) { S(x, 80, z, 'orange_concrete'); S(x, 79, z, STAIRS('acacia', f, 'top')) }
    }
    if (APR(x, z)) {
      const f = toward(lowWing, x, z)
      if (f) { S(x, 73, z, 'orange_concrete'); S(x, 72, z, STAIRS('acacia', f, 'top')) }
    }
  }

  // ================= 2. Windows (frames in the outer layer, glass in the inner layer) =================
  // span selects wall columns; wall/outer = the ring and its outer layer; glass = a state or (x,y,z) => state
  function win (wall, outer, span, y1, y2, glass, { frame = 'light_gray_concrete', top = true, bottom = true, sill = true } = {}) {
    const cs = cols((x, z) => wall(x, z) && span(x, z))
    const inSpan = new Set(cs.map(([x, z]) => `${x},${z}`))
    for (const [x, z] of cs) {
      if (!outer(x, z)) { for (let y = y1; y <= y2; y++) S(x, y, z, typeof glass === 'function' ? glass(x, y, z) : glass); continue }
      for (let y = y1; y <= y2; y++) D(x, y, z)
      if (bottom) S(x, y1 - 1, z, frame)
      if (top) S(x, y2 + 1, z, frame)
      for (const [dx, dz] of N4) {
        const nx = x + dx, nz = z + dz
        if (wall(nx, nz) && outer(nx, nz) && !inSpan.has(`${nx},${nz}`)) for (let y = y1 - (bottom ? 1 : 0); y <= y2 + (top ? 1 : 0); y++) S(nx, y, nz, frame)
        if (sill && y1 === 66 && APR(nx, nz) && !M1X(nx, nz)) S(nx, 65, nz, SLAB('smooth_quartz', 'top'))
      }
    }
  }
  const winG = (span, y1, y2, glass, o) => win(R2m, R1m, span, y1, y2, glass, o)
  const winU = (span, y1, y2, glass, o) => win(R2u, R1u, span, y1, y2, glass, o)
  const PIC = { bottom: false }                       // picture windows keep the orange base line under them (the sill sits in front)
  const GB = 'light_blue_stained_glass'                // full blocks on the chamfers (panes break up on a staircase)
  const westF = (a, b) => (x, z) => x <= 42 && z >= a && z <= b
  const northF = (a, b) => (x, z) => z <= 46 && x >= a && x <= b
  const eastF = (a, b) => (x, z) => x >= 127 && x <= 128 && z >= a && z <= b
  const southF = (a, b) => (x, z) => z >= 244 && x >= a && x <= b
  const bulgeE = (a, b) => (x, z) => x >= 141 && z >= a && z <= b
  const chamNE = (a, b) => (x, z) => x >= 129 && z <= 92 && x >= a && x <= b
  const chamBS = (a, b) => (x, z) => x >= 129 && z >= 124 && x >= a && x <= b
  const chamSE = (a, b) => (x, z) => x >= 111 && z >= 229 && x >= a && x <= b
  const chamSW = (a, b) => (x, z) => x <= 87 && z >= 219 && x >= a && x <= b

  // west face (service lane): small barred windows 2 x 2 (y 67..68); the chapel gets stained glass
  for (const [a, b2] of [[51, 52], [60, 61], [79, 80], [92, 93], [106, 107], [126, 127], [136, 137], [146, 147], [155, 156], [166, 167], [176, 177], [186, 187]])
    winG(westF(a, b2), 67, 68, 'iron_bars')
  const chapelGlass = (x, y, z) => ['blue', 'red', 'yellow', 'purple'][(y + z) % 4] + '_stained_glass_pane'
  for (const [a, b2] of [[197, 198], [204, 205], [211, 212]]) winG(westF(a, b2), 66, 69, chapelGlass, PIC)
  // north face (towards Max Security): small barred windows; ribbon windows on L2
  for (const [a, b2] of [[47, 48], [55, 56], [68, 69], [76, 77], [84, 85], [92, 93], [102, 103], [110, 111], [118, 119]]) winG(northF(a, b2), 67, 68, 'iron_bars')
  // east face (yard side): picture windows 5 x 4 (y 66..69)
  for (const [a, b2] of [[50, 54], [62, 66]]) winG(eastF(a, b2), 66, 69, GLASS, PIC)                       // classroom (M4)
  for (let z = 140; z <= 180; z += 8) winG(eastF(z, z + 4), 66, 69, GLASS, PIC)                            // cafeteria low aisle
  winG(eastF(194, 194), 66, 69, GLASS, PIC); winG(eastF(201, 201), 66, 69, GLASS, PIC)                          // Hall A, beside the entrance
  for (const z of [208, 214, 220]) winG(eastF(z, z + 4), 66, 69, GLASS, PIC)                               // telephone room
  // the bulge and its chamfers: 4 x 3 (y 66..68), and L2 (y 74..77)
  for (const z of [90, 98, 106, 114, 122]) { winG(bulgeE(z, z + 3), 66, 68, GLASS, PIC); winU(bulgeE(z, z + 3), 74, 77, GLASS) }
  for (const x of [131, 136]) {
    winG(chamNE(x, x + 3), 66, 68, GB, PIC); winU(chamNE(x, x + 3), 74, 77, GB)
    winG(chamBS(x, x + 3), 66, 68, GB, PIC); winU(chamBS(x, x + 3), 74, 77, GB)
  }
  // south face and chamfers: picture windows into the storage room (M4) and the infirmary
  for (const [a, b2] of [[89, 93], [105, 109]]) winG(southF(a, b2), 66, 69, GLASS, PIC)
  for (const x of [114, 120]) winG(chamSE(x, x + 3), 66, 69, GB, PIC)
  for (const x of [55, 66, 80]) winG(chamSW(x, x + 4), 66, 69, GB, PIC)
  // the upper block: ribbon (clerestory) windows y 76..78, the band at y 75 and the fascia stay
  const rib = { top: false, bottom: false }
  for (const [a, b2] of [[62, 71], [76, 85], [90, 96], [100, 111], [115, 124]]) winU(northF(a, b2), 76, 78, GLASS, rib)
  for (const [a, b2] of [[49, 58], [63, 70]]) winU(eastF(a, b2), 76, 78, GLASS, rib)
  for (const [a, b2] of [[50, 59], [64, 73], [78, 87], [92, 98], [108, 117], [122, 131], [136, 145], [150, 159], [164, 173], [178, 187]])
    winU((x, z) => x >= 58 && x <= 59 && z >= a && z <= b2, 76, 78, GLASS, rib)                    // the west step
  for (const [a, b2] of [[62, 71], [76, 85], [93, 102], [107, 116]])
    winU((x, z) => z >= 191 && z <= 192 && x >= a && x <= b2, 76, 78, GLASS, rib)                   // the south face
  for (const [a, b2] of [[137, 146], [150, 159], [163, 172], [176, 185]])
    winU((x, z) => x >= 121 && x <= 122 && z >= a && z <= b2, 74, 77, GLASS)                         // the cafeteria's clerestory

  // ================= 3. Exterior doors =================
  // west-face service doors (workshop, guard lockers, Hall C): closed iron double doors in x 42, frames in x 41, awnings
  for (const z of [66, 100, 116]) {
    for (let y = 65; y <= 67; y++) { D(41, y, z); D(41, y, z + 1) }
    door(LB, 42, 65, z, 'west', 'right'); door(LB, 42, 65, z + 1, 'west', 'left')
    S(42, 67, z, GLASS); S(42, 67, z + 1, GLASS)
    for (let y = 65; y <= 68; y++) { S(41, y, z - 1, 'light_gray_concrete'); S(41, y, z + 2, 'light_gray_concrete') }
    F(41, 68, z - 1, 41, 68, z + 2, 'light_gray_concrete')
    F(40, 64, z - 1, 40, 64, z + 2, 'smooth_stone')                                  // doorstep
    for (let dz = -1; dz <= 2; dz++) S(40, 69, z + dz, STAIRS('waxed_cut_copper', 'east'))   // the awning
    S(40, 68, z, LANTERN); S(40, 68, z + 1, LANTERN)
  }
  // the entrance (east face, x 127..128, z 197..198): open iron double door, sidelights, transom, frame, sign plate
  for (let z = 196; z <= 199; z++) for (let y = 65; y <= 67; y++) D(128, y, z)
  door(LB, 127, 65, 197, 'west', 'right', true); door(LB, 127, 65, 198, 'west', 'left', true)
  for (const z of [196, 199]) { S(127, 65, z, GLASS); S(127, 66, z, GLASS) }
  F(127, 67, 196, 127, 67, 199, 'light_blue_stained_glass')                           // transom
  for (let y = 65; y <= 68; y++) { S(128, y, 195, 'light_gray_concrete'); S(128, y, 200, 'light_gray_concrete') }
  F(128, 68, 195, 128, 68, 200, 'light_gray_concrete')
  F(128, 69, 195, 128, 69, 200, 'orange_concrete')                                    // the sign plate
  F(127, 64, 196, 128, 64, 199, 'smooth_stone')                                       // threshold
  F(129, 64, 194, 129, 64, 201, 'smooth_stone')                                       // doorstep, flush with the ground

  // ================= 4. Interior walls of the M2 zones =================
  const free = (x, z) => IM(x, z) && !R2m(x, z)        // not the shell
  // x 79: Hall B's west wall, Hall A's, the telephone room's and the infirmary's (the stairwell part is brick)
  for (let z = 103; z <= 243; z++) if (free(79, z)) for (let y = 64; y <= 71; y++) S(79, y, z, z <= 113 ? brickRow(79, y, z) : intRow(79, y, z))
  // x 89: Hall B's east wall; x 89..90 from z 134 is the cafeteria's west wall, up to the roof
  for (let z = 103; z <= 192; z++) for (let y = 64; y <= 71; y++) S(89, y, z, z <= 113 ? brickRow(89, y, z) : intRow(89, y, z))
  for (let z = 134; z <= 192; z++) for (let y = 64; y <= 78; y++) {
    if (y <= 71) { S(90, y, z, intRow(90, y, z)); continue }
    for (const x of [89, 90]) if (!R2u(x, z)) S(x, y, z, highRow(x, y, z))
  }
  F(80, 64, 103, 88, 71, 103, brickRow)                                                // the stairwell's north wall
  // the cafeteria's north wall z 134..135 (to the roof over the double-height part)
  for (let x = 91; x <= 126; x++) for (const z of [134, 135]) {
    for (let y = 64; y <= 71; y++) S(x, y, z, intRow(x, y, z))
    if (x <= 120) for (let y = 72; y <= 78; y++) S(x, y, z, highRow(x, y, z))
  }
  // Hall A's north wall (z 191..192, the cafeteria's south wall) and south wall (z 204..205, the telephone room's north wall)
  for (let x = 89; x <= 126; x++) for (const z of [191, 192]) for (let y = 64; y <= 71; y++) S(x, y, z, intRow(x, y, z))
  for (let x = 80; x <= 126; x++) for (const z of [204, 205]) for (let y = 64; y <= 71; y++) S(x, y, z, intRow(x, y, z))
  // the telephone room's south wall z 227 (the infirmary's north wall)
  for (let x = 80; x <= 126; x++) if (free(x, 227)) for (let y = 64; y <= 71; y++) S(x, y, 227, intRow(x, y, 227))

  // doorways: an opening (x1..x2 or z1..z2, y 65..68) through the wall cells listed, framed in gray_concrete
  const doorway = (cells, frameCells, y2 = 68) => {
    for (const [x, z] of cells) { for (let y = 65; y <= y2; y++) D(x, y, z); S(x, 64, z, 'gray_concrete') }
    for (const [x, z] of frameCells) for (let y = 65; y <= y2 + 1; y++) S(x, y, z, 'gray_concrete')
    for (const [x, z] of cells) S(x, y2 + 1, z, 'gray_concrete')
  }
  const rng = (a, b2) => { const r = []; for (let i = a; i <= b2; i++) r.push(i); return r }
  const xs = (a, b2, zz) => rng(a, b2).flatMap(x => zz.map(z => [x, z]))
  const zs = (a, b2, xx) => rng(a, b2).flatMap(z => xx.map(x => [x, z]))
  doorway(xs(106, 110, [191, 192]), xs(105, 105, [191, 192]).concat(xs(111, 111, [191, 192])))   // Hall A -> cafeteria
  doorway(xs(99, 103, [204, 205]), xs(98, 98, [204, 205]).concat(xs(104, 104, [204, 205])))       // Hall A -> telephone room
  doorway(zs(115, 119, [89]), [[89, 114], [89, 120]])                                             // Hall B -> Hall N (M4)
  doorway(zs(140, 144, [89, 90]), zs(139, 139, [89, 90]).concat(zs(145, 145, [89, 90])))          // Hall B -> cafeteria
  // door pairs in openings: open iron doors (players can't toggle them), a glass transom above
  const doorPair = (cells, frameCells, facing, hinges, transom) => {
    doorway(cells, frameCells)
    cells.forEach(([x, z], i) => { door(LB, x, 65, z, facing, hinges[i], true); S(x, 67, z, transom); S(x, 68, z, transom) })
  }
  doorPair([[79, 140], [79, 141]], [[79, 139], [79, 142]], 'east', ['left', 'right'], GLASS)       // gym (M4)
  doorPair([[79, 176], [79, 177]], [[79, 175], [79, 178]], 'east', ['left', 'right'], GLASS)       // inmate showers (M4)
  doorPair([[79, 201], [79, 202]], [[79, 200], [79, 203]], 'east', ['left', 'right'], GLASS)       // chapel (M4)
  doorPair([[79, 235], [79, 236]], [[79, 234], [79, 237]], 'west', ['right', 'left'], GLASS)       // storage (M4)
  doorPair([[98, 227], [99, 227]], [[97, 227], [100, 227]], 'south', ['right', 'left'], GLASS)     // telephone -> infirmary
  doorway(xs(104, 105, [134, 135]), xs(103, 103, [134, 135]).concat(xs(106, 106, [134, 135])))   // cafeteria -> library (M4)
  door(LB, 104, 65, 135, 'south', 'right', true); door(LB, 105, 65, 135, 'south', 'left', true)
  for (const x of [104, 105]) { S(x, 67, 135, GLASS); S(x, 68, 135, GLASS) }
  // the big window from Hall B into the cafeteria (x 89..90, z 160..176, y 66..69): framed opening in x 89, panes in x 90
  for (let z = 160; z <= 176; z++) for (let y = 66; y <= 69; y++) { D(89, y, z); S(90, y, z, GLASS) }
  for (const x of [89, 90]) {
    for (let y = 65; y <= 70; y++) { S(x, y, 159, 'light_gray_concrete'); S(x, y, 177, 'light_gray_concrete') }
    for (let z = 159; z <= 177; z++) { S(x, 65, z, 'light_gray_concrete'); S(x, 70, z, 'light_gray_concrete') }
  }
  F(91, 65, 160, 91, 65, 176, SLAB('smooth_quartz', 'bottom'))                         // a ledge under it, cafeteria side

  // ================= 5. Hall A, the entrance hall (interior x 80..126, z 193..203) =================
  F(80, 64, 193, 126, 64, 203, 'gray_concrete')
  F(80, 64, 196, 126, 64, 200, 'orange_concrete')                                      // the runner, the whole length
  F(82, 64, 191, 86, 64, 195, 'orange_concrete')                                       // ... turning north into Hall B
  F(106, 64, 191, 110, 64, 195, 'orange_concrete')                                     // ... and to the cafeteria's path
  // an arrow pointing +x (tip at 0,0): a solid triangle head and a short shaft
  const ARROW = [[0, 0], [-1, -1], [-1, 0], [-1, 1], [-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2], [-3, 0]]
  for (let tx = 94; tx <= 124; tx += 6)                                                // white arrows pointing east (the exit)
    for (const [dx, dz] of ARROW) S(tx + dx, 64, 198 + dz, 'white_concrete')
  const PIERS_A = [90, 96, 104, 112, 120]
  for (const x of PIERS_A) {
    for (let y = 65; y <= 71; y++) { S(x, y, 193, pierRow(x, y, 193)); S(x, y, 203, pierRow(x, y, 203)) }
    if (x !== 90 && x !== 112) F(x, 71, 194, x, 71, 202, 'white_concrete')             // white beams across (not under a well's opening)
  }
  for (const x of [81, 87, 93, 99, 105, 111, 117, 123]) { S(x, 72, 194, FROG); S(x, 72, 202, FROG) }   // ceiling panels, flush in the y 72 slab
  // skylights over Hall A: a light well through the low roof (rim y 72, glass y 73, curb y 73..74, bars y 74)
  for (const [x1, x2] of [[84, 96], [107, 120]]) {
    for (let x = x1; x <= x2; x++) for (let z = 195; z <= 201; z++) {
      const edge = x === x1 || x === x2 || z === 195 || z === 201
      if (edge) { S(x, 72, z, 'light_gray_concrete'); S(x, 73, z, 'light_gray_concrete'); S(x, 74, z, 'light_gray_concrete') } else { D(x, 72, z); S(x, 73, z, 'light_blue_stained_glass') }
    }
    for (let x = x1 + 6; x < x2; x += 6) F(x, 74, 196, x, 74, 200, 'iron_bars')
  }
  // the ATM
  F(124, 65, 193, 124, 67, 193, 'light_gray_concrete'); S(124, 65, 194, 'light_gray_concrete'); S(124, 66, 194, 'cyan_concrete')
  S(124, 67, 194, 'end_rod[facing=south]')
  // the 'Most Wanted' Bounty Board on the west wall x 79 (z 194..199, y 66..69)
  for (let z = 194; z <= 199; z++) for (let y = 66; y <= 69; y++) {
    const edge = z === 194 || z === 199 || y === 66
    S(79, y, z, edge ? 'black_concrete' : y === 69 ? 'red_concrete' : 'gray_concrete')
  }
  S(79, 70, 194, 'black_concrete'); S(79, 70, 199, 'black_concrete'); F(79, 70, 195, 79, 70, 198, 'black_concrete')
  S(80, 70, 196, 'end_rod[facing=east]'); S(80, 70, 197, 'end_rod[facing=east]')      // two picture lights over it
  // benches along the south wall (and one on the north), potted plants
  for (const [x1, x2, z] of [[91, 95, 203], [106, 110, 203], [114, 118, 203], [114, 118, 193]]) F(x1, 65, z, x2, 65, z, SLAB('smooth_quartz', 'bottom'))
  for (const [x, z] of [[80, 203], [97, 203], [126, 193], [126, 203], [105, 193], [89, 193]]) S(x, 65, z, 'potted_bamboo')

  // ================= 6. Hall B (interior x 80..88, z 114..192) =================
  F(80, 64, 114, 88, 64, 192, 'gray_concrete')
  F(82, 64, 114, 86, 64, 192, 'orange_concrete')
  for (const tz of [126, 152, 178])                                                    // white arrows pointing south, to Hall A
    for (const [a, c] of ARROW) S(84 + c, 64, tz + a, 'white_concrete')
  for (const z of [121, 129, 137, 147, 155, 163, 171, 181, 189]) for (let y = 65; y <= 71; y++) S(80, y, z, pierRow(80, y, z))
  for (const z of [121, 129, 137, 147, 155, 181, 189]) for (let y = 65; y <= 71; y++) S(88, y, z, pierRow(88, y, z))
  for (const c of [119, 133, 147, 161, 175, 189]) {                                    // end_rod tube lights on chains
    S(84, 71, c - 3, CHAIN); S(84, 71, c + 3, CHAIN)
    for (let z = c - 3; z <= c + 3; z++) S(84, 70, z, 'end_rod[facing=south]')
  }
  // the SECURITY door (79, 65..66, 117): closed, light grey frame, a red reader light, no button
  door(LB, 79, 65, 117, 'east', 'left', false)
  for (let y = 65; y <= 67; y++) S(79, y, 116, 'light_gray_concrete')
  S(79, 65, 118, 'light_gray_concrete'); S(79, 66, 118, 'red_concrete'); S(79, 67, 118, 'light_gray_concrete'); S(79, 67, 117, 'light_gray_concrete')
  for (const [x, z] of [[87, 157], [87, 178], [81, 184]]) S(x, 65, z, 'potted_bamboo')
  for (const [z1, z2] of [[157, 161], [165, 169], [149, 153]]) F(80, 65, z1, 80, 65, z2, SLAB('smooth_quartz', 'bottom'))   // benches between the piers

  // ================= 7. Stairwell, G part (walls x 79 / 89 and z 103 are built above) =================
  F(80, 64, 104, 88, 64, 111, 'air')                                                   // open over M3's stair
  F(80, 64, 112, 88, 64, 112, STAIRS('polished_deepslate', 'south'))                   // the top step
  F(80, 64, 113, 88, 64, 113, 'polished_deepslate')                                    // the gate row
  for (const x of [80, 81, 82, 83, 86, 87, 88]) F(x, 65, 113, x, 70, 113, 'iron_bars')
  door(LB, 84, 65, 113, 'north', 'left', false); door(LB, 85, 65, 113, 'north', 'right', false)
  F(84, 67, 113, 85, 70, 113, 'iron_bars')
  F(80, 71, 113, 88, 71, 113, 'red_concrete')
  for (const z of [106, 110]) { S(84, 71, z, CHAIN); S(84, 70, z, CHAIN); S(84, 69, z, LANTERN) }

  // ================= 8. Cafeteria (interior x 91..126, z 136..190) =================
  for (let x = 91; x <= 126; x++) for (let z = 136; z <= 190; z++)
    S(x, 64, z, ((x - 91) % 6 === 0 || (z - 136) % 6 === 0) ? 'polished_deepslate' : 'blue_terracotta')
  // orange arrow paths from both doorways to the counter
  F(106, 64, 143, 110, 64, 190, 'orange_concrete')                                     // from Hall A (x 106..110)
  for (const [z, a, b2] of [[142, 104, 112], [141, 105, 111], [140, 106, 110], [139, 107, 109], [138, 108, 108]]) F(a, 64, z, b2, 64, z, 'orange_concrete')
  F(89, 64, 140, 100, 64, 144, 'orange_concrete')                                      // from Hall B (z 140..144), bending north
  F(96, 64, 139, 100, 64, 139, 'orange_concrete'); F(97, 64, 138, 99, 64, 138, 'orange_concrete')
  // the step wall x 121..122: the beam (y 72, the upper ring) on piers at G level
  for (const z of [145, 153, 161, 169, 177, 185]) for (const x of [121, 122]) for (const zz of [z, z + 1]) for (let y = 64; y <= 71; y++) S(x, y, zz, pierRow(x, y, zz))
  // serving counter along the north wall: iron_block back row, a top-slab lip in front (top surface 66.0), trays, pots
  for (const [x1, x2] of [[95, 102], [107, 120]]) for (let x = x1; x <= x2; x++) {
    S(x, 65, 136, 'iron_block'); S(x, 65, 137, SLAB('smooth_stone', 'top'))
    const i = x - x1
    if (i % 4 === 1) S(x, 66, 136, 'cauldron'); else if (i % 4 === 3) S(x, 66, 136, TRAP('south', 'bottom', false))
    if (i % 2 === 0) S(x, 66, 137, 'light_gray_carpet')
  }
  // 3 menu screens (y 70..72): stained glass in front of sea lanterns, black frames
  for (const [x1, c] of [[97, 'light_blue'], [106, 'lime'], [115, 'pink']]) {
    for (let x = x1 - 1; x <= x1 + 5; x++) for (let y = 69; y <= 73; y++) {
      const edge = x === x1 - 1 || x === x1 + 5 || y === 69 || y === 73
      S(x, y, 136, edge ? 'black_concrete' : `${c}_stained_glass`)
      if (!edge) S(x, y, 135, 'sea_lantern')
    }
  }
  // hexagonal picnic tables (top 66.0) with 6 bench segments, juice boxes and trays
  const TOP = [[-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1]]
  const BENCH = [[-1, -2], [0, -2], [1, -2], [-1, 2], [0, 2], [1, 2], [2, -1], [2, 1], [-2, -1], [-2, 1]]
  const JUICE = ['lime', 'pink', 'light_blue']
  const tables = [[96, 152], [96, 163], [96, 174], [96, 185], [102, 157], [102, 168], [102, 179], [116, 154], [116, 168], [116, 182]]
  tables.forEach(([cx, cz], t) => {
    for (const [dx, dz] of TOP) S(cx + dx, 65, cz + dz, SLAB('acacia', 'top'))
    for (const [dx, dz] of BENCH) S(cx + dx, 65, cz + dz, SLAB('acacia', 'bottom'))
    S(cx - 1, 66, cz - 1, CANDLE(JUICE[t % 3])); S(cx + 1, 66, cz + 1, CANDLE(JUICE[(t + 1) % 3])); S(cx + 2, 66, cz, CANDLE(JUICE[(t + 2) % 3]))
    S(cx - 1, 66, cz + 1, 'light_gray_carpet'); S(cx + 1, 66, cz - 1, 'light_gray_carpet'); S(cx - 2, 66, cz, 'light_gray_carpet')
  })
  // bins by the west wall: white, lime, blue, gray, with iron trapdoor lids
  ;[[148, 'white'], [149, 'white'], [150, 'lime'], [151, 'blue'], [152, 'gray'], [181, 'white'], [182, 'lime'], [183, 'blue'], [184, 'gray']]
    .forEach(([z, c]) => { for (const x of [91, 92]) { S(x, 65, z, `${c}_concrete`); S(x, 66, z, TRAP('east', 'bottom', false)) } })
  // long hanging tube lights from the roof (end rods on chains y 74..78), froglight panels in the low aisle's ceiling
  for (const z of [147, 161, 175, 187]) for (const [x1, x2] of [[93, 103], [109, 119]]) {
    for (let y = 74; y <= 78; y++) { S(x1, y, z, CHAIN); S(x2, y, z, CHAIN) }
    for (let x = x1; x <= x2; x++) S(x, 73, z, 'end_rod[facing=east]')
  }
  for (let z = 139; z <= 190; z += 6) S(125, 72, z, FROG)                             // flush in the low aisle's ceiling (the low roof)
  for (const [x, z] of [[126, 136], [126, 190], [123, 136], [123, 190]]) S(x, 65, z, 'potted_bamboo')
  // the low aisle: a window bar under each yard window (top 66.0) with stools
  for (let z0 = 140; z0 <= 180; z0 += 8) { F(126, 65, z0, 126, 65, z0 + 4, SLAB('smooth_quartz', 'top')); for (const z of [z0 + 1, z0 + 3]) S(125, 65, z, SLAB('acacia', 'bottom')) }

  // ================= 9. Telephone room (interior x 80..126, z 206..226) =================
  F(80, 64, 206, 126, 64, 226, 'gray_concrete')
  F(92, 65, 210, 114, 65, 222, 'orange_carpet')                                        // the big rug
  const pillarRow = (x, y, z) => y === 64 ? 'gray_concrete' : (y === 65 || y === 68 || y === 70) ? 'orange_concrete' : W(x, y, z)
  // booths: 5 per side (2 west of the doorways, 3 east), 3 wide x 3 deep, divided by deep white pillars with orange bands
  const booths = [89, 93, 107, 111, 115]
  const pillars = [88, 92, 96, 106, 110, 114, 118]
  for (const [back, z1, chairZ, chairF] of [[206, 206, 207, 'south'], [226, 224, 225, 'north']]) {
    for (const px of pillars) for (let z = z1; z <= z1 + 2; z++) for (let y = 65; y <= 71; y++) S(px, y, z, pillarRow(px, y, z))
    for (const bx of booths) {
      F(bx, 66, back, bx + 2, 66, back, SLAB('smooth_stone', 'bottom'))               // the shelf
      S(bx + 1, 67, back, 'orange_terracotta')                                          // the orange phone ...
      S(bx + 2, 67, back, HOOK('east'))                                                 // ... with its receiver beside it
      S(bx + 1, 65, chairZ, STAIRS('bamboo_mosaic', chairF))                            // a yellow chair
    }
  }
  for (const x of [83, 89, 95, 101, 107, 113, 119, 125]) { S(x, 72, 212, FROG); S(x, 72, 220, FROG) }   // flush in the ceiling
  S(124, 71, 211, CHAIN); S(124, 71, 221, CHAIN); F(124, 70, 211, 124, 70, 221, 'end_rod[facing=south]')   // tube light by the windows
  for (const [x, z] of [[80, 206], [80, 226], [126, 206], [126, 226]]) S(x, 65, z, 'potted_bamboo')
  F(81, 65, 215, 81, 65, 217, SLAB('smooth_quartz', 'bottom'))                          // a waiting bench at the west end
  // a roof hatch over the room's west end
  S(82, 72, 216, TRAP('north', 'top', false)); for (const [dx, dz] of N8) S(82 + dx, 72, 216 + dz, 'light_gray_concrete')

  // ================= 10. Infirmary (x 80..126 inside the shell, z 228..243) =================
  const infirm = cols((x, z) => x >= 80 && x <= 126 && z >= 228 && z <= 243 && free(x, z))
  const inInf = new Set(infirm.map(([x, z]) => `${x},${z}`))
  for (const [x, z] of infirm) {
    const border = N4.some(([dx, dz]) => !inInf.has(`${x + dx},${z + dz}`))
    S(x, 64, z, border || (x % 4 === 0 && z % 4 === 0) ? 'light_blue_concrete' : 'white_concrete')
    S(x, 71, z, 'white_concrete')                                                      // a white dropped ceiling ...
  }
  for (const [x, z] of infirm) if ((x - 84) % 6 === 0 && (z === 231 || z === 238)) S(x, 71, z, 'sea_lantern')   // ... with sea lantern panels
  // 4 beds along the north wall with white curtain screens between them, bedside tables
  for (const x of [104, 108, 112, 116]) { bed(LB, 'white', x, 65, 228, 'north'); S(x + 1, 65, 228, SLAB('smooth_quartz', 'top')) }
  S(105, 66, 228, 'potted_azure_bluet'); S(113, 66, 228, 'potted_oxeye_daisy')
  for (const x of [102, 106, 110, 114, 118]) F(x, 65, 228, x, 67, 230, 'white_stained_glass_pane')
  // the medicine cabinet (iron trapdoor doors on white concrete) and the nurse's desk
  F(80, 65, 229, 80, 67, 231, 'white_concrete')
  F(81, 66, 229, 81, 67, 231, TRAP('east', 'bottom', true))
  F(84, 65, 233, 88, 65, 233, SLAB('smooth_quartz', 'top'))
  S(86, 65, 234, STAIRS('smooth_quartz', 'south')); S(84, 66, 233, 'potted_azure_bluet'); S(88, 66, 233, 'flower_pot')
  // waiting chairs by the door (backs to the north wall; x 97..100 stays clear), a sink, a second cabinet east of the beds
  for (const x of [89, 90, 91, 93, 94, 95]) S(x, 65, 228, STAIRS('smooth_quartz', 'north'))
  S(92, 65, 228, 'potted_bamboo')
  S(82, 65, 228, 'cauldron')
  F(121, 65, 228, 122, 67, 228, 'white_concrete'); F(121, 66, 229, 122, 67, 229, TRAP('south', 'bottom', true))
  // an exam table (top 66.0, a sheet on it) behind a glass screen, and a stool
  F(91, 65, 239, 92, 65, 239, SLAB('smooth_quartz', 'top')); F(91, 66, 239, 92, 66, 239, 'white_carpet')
  F(94, 65, 237, 94, 67, 240, 'white_stained_glass_pane')
  S(93, 65, 241, SLAB('smooth_quartz', 'bottom')); S(110, 65, 238, 'potted_bamboo')
  // a red cross on the south wall (inner layer z 244)
  for (let x = 96; x <= 102; x++) for (let y = 65; y <= 71; y++) {
    const dx = Math.abs(x - 99), dy = Math.abs(y - 68)
    S(x, y, 244, (dx === 0 && dy <= 2) || (dy === 0 && dx <= 2) ? 'red_concrete' : 'white_concrete')
  }

  // ================= 11. Roof: skylights, HVAC boxes, hatches =================
  // S1..S3 on the upper roof (z 93..161): glass is the roof, a curb raised 1 (y 80), iron bar mullions every 6
  for (const [x1, x2] of [[67, 77], [89, 99], [110, 120]]) {
    for (let x = x1; x <= x2; x++) for (let z = 93; z <= 161; z++) {
      const edge = x === x1 || x === x2 || z === 93 || z === 161
      if (edge) { S(x, 79, z, 'light_gray_concrete'); S(x, 80, z, 'light_gray_concrete') } else S(x, 79, z, 'light_blue_stained_glass')
    }
    for (let z = 99; z < 161; z += 6) F(x1 + 1, 80, z, x2 - 1, 80, z, 'iron_bars')
  }
  // HVAC boxes: light grey, copper grate panels, iron trapdoor vents on top, a lightning rod 3+ blocks from the vents
  for (const [hx, hz] of [[62, 52], [102, 55], [80, 170], [104, 172], [131, 100], [60, 120]]) {
    F(hx, 80, hz, hx + 4, 81, hz + 2, 'light_gray_concrete')
    for (let x = hx + 1; x <= hx + 3; x++) { S(x, 80, hz, 'waxed_copper_grate'); S(x, 80, hz + 2, 'waxed_copper_grate') }
    F(hx, 82, hz, hx + 1, 82, hz + 2, TRAP('north', 'bottom', false))
    S(hx + 4, 82, hz + 2, ROD)
    S(hx + 3, 82, hz + 1, 'andesite_wall'); S(hx + 3, 83, hz + 1, 'andesite_wall')   // an exhaust stack
  }
  // roof access hatches on the upper roof
  for (const [x, z] of [[85, 60], [110, 182]]) { S(x, 79, z, TRAP('north', 'top', false)); for (const [dx, dz] of N8) S(x + dx, 80, z + dz, 'light_gray_concrete') }

  // ---- copy into the shared build ----
  for (const [k, s] of L) { const [x, y, z] = k.split(',').map(Number); b.set(x, y, z, s) }
}

module.exports.labels = [
  { x: 129.03, y: 69.4, z: 198.0, facing: 'east', text: 'CELLS AND CAFETERIA', color: '#ffffff', scale: 1 },
  { x: 80.03, y: 69.5, z: 197.0, facing: 'east', text: 'MOST WANTED', color: '#ffffff', scale: 1 },
  { x: 80.03, y: 68.5, z: 117.5, facing: 'east', text: 'SECURITY', color: '#ffffff', scale: 1 },
  { x: 84.5, y: 70.5, z: 114.03, facing: 'south', text: 'CELL BLOCK', color: '#ffffff', scale: 1 }
]
module.exports.points = {
  R_SPAWN: [86.5, 65, 198.5, -90],
  B_BOUNTY: [80.03, 67.6, 197.0, -90],
  // the escape (ESCAPE-SPEC Appendix B, M2)
  ROUTE_HALLB_1: [84.5, 65, 121.5, 0],
  ROUTE_HALLB_2: [84.5, 65, 155.5, 0],
  ROUTE_HALLB_3: [84.5, 65, 188.5, 0],
  LEFTY: [80.5, 65.5, 151.5, -90],
  WHISPER: [108.5, 65, 209.5, 0],
  DONUT_CAFE: [100.5, 66.0, 137.5, 0],
  SEARCH_TIMER: [81, 66, 230, 0],
  STAIR_GATE_A: [84, 65, 113, 0],
  STAIR_GATE_B: [85, 65, 113, 0],
  SECURITY_DOOR: [79, 65, 117, 0],
  COURSE_DONE: [82.5, 65, 117.5, -90]
}
