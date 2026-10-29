'use strict'
// Ironvale's site plan preview (tools/build/expand/PLAN.md section 1.2, tools/build/iron/PLAN.md): COMMON, then a painter.
// ---- COMMON (tools/build/iron: copy verbatim into every Ironvale module; city.js check compares them) ----
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
  // city additions
  plaza: [['polished_andesite', 75], ['andesite', 15], ['stone', 10]],      // alleys, plazas, Hatch Lane, the channel floor
  walk: [['light_gray_concrete', 100]],                                      // sidewalks (plain, as the prison's: jail/outdoors.js)
  curb: [['smooth_stone', 85], ['stone', 15]]
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

// ---- Ironvale's frame (tools/build/iron/PLAN.md section 0) ------------------------------------------------------------
const WORLD = 'world'
const CITY = { x1: 830, z1: 150, x2: 1500, z2: 800, y1: 44, y2: 140 } // every block of Ironvale lies in here
const GROUND_Y = 64 // the generated grass's top block; feet stand at 65
const LABEL_TAG = 'iron_label', DISPLAY_TAG = 'iron_display'

// module boxes [x1, z1, x2, z2]: the module owns every column inside, y CITY.y1..CITY.y2
const BOX = {
  power: [950, 270, 1120, 415],   // the Power Plant, its yard and cooling towers, its gate on the avenue's north walk
  police: [950, 445, 1070, 555],  // the Police HQ, its front on the avenue's south walk
  mansion: [1160, 560, 1340, 740] // Mansion Hill and the house on top (Hill Drive's strip is the streets')
}
const BUILDINGS = Object.keys(BOX)
// the heist regions [x1, y1, z1, x2, y2, z2]: each module sets its own when it's built (until then a small placeholder)
const REGION = {
  power: [1020, 59, 320, 1090, 81, 370],
  police: [995, 63, 485, 1025, 75, 515],
  mansion: [1235, 89, 635, 1265, 101, 665]
}
const KEEP_FREE = []

const inBox = (x, z, boxes) => boxes.some(([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2)
// ---- streets (module `streets`, PLAN section 1) ------------------------------------------------------------------------
const AVE_E = { x1: 830, x2: 1280, z1: 419, z2: 441, dash: 430, edge: [420, 440], curb: [418, 442], walk: [416, 444], end: 1281 }
const HILL = { x1: 1240, x2: 1251, road: [1242, 1249], dash: [1245, 1246], walk: [1241, 1250], z1: 445, z2: 600, top: 90 }
const hillTop = z => Math.min(HILL.top, 64 + Math.max(0, Math.floor((z - 444) / 6))) // Hill Drive's surface block at z
// x 830..940 is Rising City's (tools/build/city): Ironvale owns only Main Avenue East's stretch there.
const ownerOf = (x, z) => {
  if (x < CITY.x1 || x > CITY.x2 || z < CITY.z1 || z > CITY.z2) return null
  if (x <= 940) return z >= AVE_E.walk[0] && z <= AVE_E.walk[1] ? 'streets' : null
  if (x >= HILL.x1 && x <= HILL.x2 && z >= HILL.z1 && z <= HILL.z2) return 'streets'
  if (inBox(x, z, KEEP_FREE)) return 'free'
  for (const m of BUILDINGS) if (inBox(x, z, [BOX[m]])) return m
  return 'streets'
}
const ownFor = mod => (x, y, z) => y >= CITY.y1 && y <= CITY.y2 && ownerOf(x, z) === mod

// What the streets module lays at (x, z), or null (the grass stays). top = the surface block's y.
// kinds: road (asphalt), line (white / yellow), walk (sidewalk), curb (sidewalk edge, a slab at top + 1), wall (Hill
// Drive's retaining wall, to top, a parapet above)
function streetCell (x, z) {
  if (x >= AVE_E.x1 && x <= AVE_E.end && z >= AVE_E.walk[0] && z <= AVE_E.walk[1]) {
    if (x === AVE_E.end) return { kind: 'curb', top: 64 }
    if (z >= AVE_E.z1 && z <= AVE_E.z2) {
      if (z === AVE_E.edge[0] || z === AVE_E.edge[1]) return { kind: 'line', top: 64, color: 'white' }
      if (z === AVE_E.dash && ((x % 6) + 6) % 6 < 3) return { kind: 'line', top: 64, color: 'yellow' }
      return { kind: 'road', top: 64 }
    }
    if (z > AVE_E.z2 && x >= HILL.walk[0] && x <= HILL.walk[1]) return { kind: 'road', top: 64 } // Hill Drive's mouth
    return { kind: z === AVE_E.curb[0] || z === AVE_E.curb[1] ? 'curb' : 'walk', top: 64 }
  }
  if (x >= HILL.x1 && x <= HILL.x2 && z >= HILL.z1 && z <= HILL.z2) {
    const top = hillTop(z)
    if (x === HILL.x1 || x === HILL.x2) return { kind: 'wall', top }
    if (x === HILL.walk[0] || x === HILL.walk[1]) return { kind: 'walk', top }
    if ((x === HILL.dash[0] || x === HILL.dash[1]) && z % 6 < 3) return { kind: 'line', top, color: 'yellow' }
    return { kind: 'road', top }
  }
  return null
}

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
// ---- the preview: tools/node/node.exe tools/build/render.js tools/build/iron/plan-layout.js <out> --views top ------------
const COLOR = { power: 'yellow_wool', police: 'blue_wool', mansion: 'purple_wool' }
const SURFACE = { road: 'black_concrete', walk: 'light_gray_concrete', curb: 'smooth_stone', wall: 'stone_bricks' }
module.exports = () => {
  const b = new (require('../mcstruct').Build)()
  for (let x = CITY.x1; x <= CITY.x2; x++) for (let z = CITY.z1; z <= CITY.z2; z++) {
    const o = ownerOf(x, z)
    if (!o) continue
    if (o === 'streets') { const c = streetCell(x, z); b.set(x, c ? c.top : GROUND_Y, z, c ? (c.kind === 'line' ? `${c.color}_concrete` : SURFACE[c.kind]) : 'grass_block'); continue }
    b.set(x, GROUND_Y, z, COLOR[o] || 'white_wool')
  }
  for (const [x1, , z1, x2, , z2] of Object.values(REGION)) rect(x1, z1, x2, z2, (x, z) => { if (x === x1 || x === x2 || z === z1 || z === z2) b.set(x, 99, z, 'red_wool') })
  return b
}
module.exports.build = () => module.exports()
