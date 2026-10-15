// The prison's escape checker (ESCAPE-SPEC 3.8, revision 3): a walk model of the real build (tools/build/jail.js), with
// the Skript-driven states (doors, breaches, the front gate) opened from tools/build/jail/zones.js, proving that
//   - with everything closed nobody inside reaches the lot or beyond, and nobody outside reaches in;
//   - each escape method (the police doors, the gate breach, the punch gate and the parkour) reaches the lot and nothing
//     further; from the lot only the front gate leads out; the gatehouse booth opens only by its door;
//   - every point of Appendix B stands where it should, on its side of the outlines; every cop route is walkable;
//   - the controls course goes on from the crawl through the boiler room and Rusty's cell (10), the model does see a
//     leak when one is put back (11), and no spot anyone reaches is in a block an outline runs through (12).
//   node --max-old-space-size=6000 tools/build/jail-escape-check.js [--only <n,...>]   (or: node tools/build/jail.js check)
// Steps 1-9 are ESCAPE-SPEC 3.8's assertions in its order. Exits 1 when an assertion fails. About two and a half minutes.
//
// The model (the critique's stricter rules, so later map edits are tested with them): standing nodes (x, z, f), f = the
// feet's height in 1/16 blocks. Collision per block in 1/16 (from, to): none for air, light, plants, hooks, buttons,
// levers, ladders, vines, banners, redstone wire and torches; flower pots 0..6; lanterns 0..9 (hanging 1..10); end rods
// and lightning rods 0..16 up or down, 6..10 lying; candles 0..6; chains 0..16 upright, 6..10 lying; carpets 0..1; open
// doors and trapdoors none; closed trapdoors 0..3 (bottom) or 13..16 (top); slabs 0..8, 8..16 or 0..16; iron bars and
// panes 0..16; fences, walls and fence gates 0..24; beds 0..9; heavy cores 0..8; everything else 0..16. A standing spot
// needs H = 29/16 free above. Moves: step up 9/16, jump up 20/16 (H + 20 free above the start), any drop, ladders one
// block at a time, diagonals past at least one free corner (strict: both), straight gap jumps over k - 1 gaps landing at
// most +20 (k = 2), +16 (3), +9 (4), 0 (5) or -24 (6) sixteenths above the take-off and diagonal gap jumps (k = 2 up to
// +16, k = 3 up to +9). Modes: "generous" (all of that: used to prove a place is NOT reached; a jump up only needs the
// landing's own standing room, ESCAPE-SPEC 3.8's rule, not H + 20 over the landing too), "strict" (both free corners,
// straight gap jumps over 1 gap up to +20 and 2 gaps up to +16, no diagonal gap jumps: used to prove a place IS reached),
// "npc" (the cop routes, a mob's pathfinding: no gap jumps, no ladders, drops of 3 blocks at most, diagonals past both
// free corners). Slime and knockback are left out (the yard's trampolines are 58+ blocks from both outlines).
// The crouch pass (WP-BUILD review, 2026-10-14): every "not reached" assertion runs again with H = 24/16, a sneaking
// player (1.5 high: sneaking, or crouching mid-jump, fits under a 1.5-high gap that a standing player can't). It found
// T9's notch (outdoors.js sealT9). Step 12 (the same review) checks every run for spots in the blocks an outline edge
// runs through: Skript tests the player's exact position, and such a spot is on both sides (zones.js lists the edges
// it moved).
'use strict'
const { build, points } = require('./jail.js')
const Z = require('./jail/zones.js')
const outdoors = require('./jail/outdoors.js')
const { cells: CELLS } = require('./jail/cellblock.js')

const t0 = Date.now()
const secs = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`
const onlyArg = process.argv.indexOf('--only')
const ONLY = onlyArg > 0 ? new Set(process.argv[onlyArg + 1].split(',').map(Number)) : null

// ---- the world: the build, the jailbreak world's flat default elsewhere, an overlay for opened states ----------------
const B = build()
const defaultBlock = y => y === 64 ? 'grass_block' : (y >= 61 && y <= 63) ? 'dirt' : y <= 60 ? 'stone' : 'air'
const baseGet = (x, y, z) => B.get(x, y, z) ?? defaultBlock(y)

const NONE = /^(air|cave_air|void_air|light|short_grass|tall_grass|fern|cobweb|tripwire_hook|.*_button|lever|ladder|vine|.*_banner|redstone_wire|torch|wall_torch|redstone_torch|redstone_wall_torch)$/
const props = s => { const o = {}; const m = /\[(.*)\]/.exec(s); if (m) for (const kv of m[1].split(',')) { const [k, v] = kv.split('='); o[k] = v } return o }
const colMemo = new Map()
function col (s) {
  if (colMemo.has(s)) return colMemo.get(s)
  const n = s.replace(/^minecraft:/, '').replace(/\[.*$/, '')
  const p = props(s)
  let c
  if (n === 'flower_pot' || n.startsWith('potted_')) c = [0, 6]
  else if (n === 'lantern' || n === 'soul_lantern') c = p.hanging === 'true' ? [1, 10] : [0, 9]
  else if (/end_rod$|lightning_rod$/.test(n)) c = (p.facing === 'up' || p.facing === 'down' || !p.facing) ? [0, 16] : [6, 10]
  else if (/candle$/.test(n)) c = [0, 6]
  else if (/chain$/.test(n)) c = (p.axis === 'y' || !p.axis) ? [0, 16] : [6, 10]
  else if (NONE.test(n)) c = null
  else if (/_carpet$/.test(n)) c = [0, 1]
  else if (/_door$/.test(n)) c = p.open === 'true' ? null : [0, 16]
  else if (/_trapdoor$/.test(n)) c = p.open === 'true' ? null : p.half === 'top' ? [13, 16] : [0, 3]
  else if (/_slab$/.test(n)) c = p.type === 'top' ? [8, 16] : p.type === 'double' ? [0, 16] : [0, 8]
  else if (/(^iron_bars|_pane)$/.test(n)) c = [0, 16]
  else if (/(_fence|_wall|_fence_gate)$/.test(n)) c = [0, 24]
  else if (/_bed$/.test(n)) c = [0, 9]
  else if (n === 'heavy_core') c = [0, 8]
  else c = [0, 16]
  colMemo.set(s, c)
  return c
}
const isLadder = s => /^(minecraft:)?ladder/.test(s)

// A column's collision intervals (absolute 1/16), merged; its standing heights (H free above); its ladder cells.
const Y0 = 50, Y1 = 100
const STAND = 29, CROUCH = 24
function makeProfile (get, x, z, H) {
  const iv = []; const lad = []
  for (let y = Y0; y <= Y1; y++) {
    const s = get(x, y, z)
    if (isLadder(s)) lad.push(y)
    const c = col(s)
    if (c) iv.push([y * 16 + c[0], y * 16 + c[1]])
  }
  iv.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const r of iv) { const L = merged[merged.length - 1]; if (L && r[0] <= L[1]) L[1] = Math.max(L[1], r[1]); else merged.push([r[0], r[1]]) }
  const free = (a, b) => merged.every(r => r[1] <= a || r[0] >= b)
  const floors = []
  for (const r of merged) if (free(r[1], r[1] + H) && r[1] < Y1 * 16) floors.push(r[1])
  for (const y0 of lad) for (const y of [y0, y0 + 1]) if (free(y * 16, y * 16 + H) && !floors.includes(y * 16)) floors.push(y * 16)
  floors.sort((a, b) => a - b)
  return { merged, free, floors, lad: new Set(lad) }
}
const baseProfiles = { [STAND]: new Map(), [CROUCH]: new Map() }
// A model over the build plus an overlay ("x,y,z" -> state): only the overlay's columns get their own profiles.
// crouch: a sneaking player (H = 24/16) instead of a standing one (29/16).
function makeModel (overlay = new Map(), { crouch = false } = {}) {
  const H = crouch ? CROUCH : STAND
  const get = (x, y, z) => { const k = `${x},${y},${z}`; return overlay.has(k) ? overlay.get(k) : baseGet(x, y, z) }
  const touched = new Set()
  for (const k of overlay.keys()) { const [x, , z] = k.split(','); touched.add(`${x},${z}`) }
  const own = new Map()
  const profile = (x, z) => {
    const k = `${x},${z}`
    const memo = touched.has(k) ? own : baseProfiles[H]
    let p = memo.get(k)
    if (!p) { p = makeProfile(touched.has(k) ? get : baseGet, x, z, H); memo.set(k, p) }
    return p
  }
  return { get, profile, H }
}

const BOX = [-45, -35, 485, 475]
function bfs (model, starts, { mode = 'strict', box = BOX, limit = 8e6 } = {}) {
  if (!['strict', 'generous', 'npc'].includes(mode)) throw new Error(`unknown mode ${mode}`)
  const npc = mode === 'npc', generous = mode === 'generous'
  const seen = new Map()
  const q = []
  for (const [x, z, f] of starts) { const k = `${x},${z},${f}`; seen.set(k, null); q.push([x, z, f]) }
  const inBox = (x, z) => x >= box[0] && z >= box[1] && x <= box[2] && z <= box[3]
  const push = (x, z, f, from) => { const k = `${x},${z},${f}`; if (!seen.has(k)) { seen.set(k, from); q.push([x, z, f]) } }
  const P = model.profile
  const H = model.H, JUMP = H + 20, ARC = H + 8 // standing room, a jump's room over the take-off, a gap jump's arc
  let n = 0, qi = 0
  while (qi < q.length && n++ < limit) {
    const [x, z, f] = q[qi++]
    const from = `${x},${z},${f}`
    const o = P(x, z)
    if (o.lad.size && !npc) for (const g of o.floors) if (Math.abs(g - f) === 16 && (o.lad.has(f >> 4) || o.lad.has(g >> 4) || o.lad.has((f >> 4) - 1) || o.lad.has((g >> 4) - 1)) && o.free(Math.min(f, g), Math.max(f, g) + H)) push(x, z, g, from)
    const canStep = (t, g) => {
      const dh = g - f
      if (npc && dh < -48) return false // a mob's path drops 3 blocks at most
      if (dh <= 9) return t.free(g, Math.max(f, g) + H) && o.free(f, Math.max(f, g) + H)
      if (dh <= 20) return o.free(f, f + JUMP) && t.free(g, generous ? g + H : f + JUMP)
      return false
    }
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue
      const nx = x + dx, nz = z + dz
      if (!inBox(nx, nz)) continue
      const t = P(nx, nz)
      for (const g of t.floors) {
        if (!canStep(t, g)) continue
        if (dx && dz) {
          const h = Math.max(f, g)
          const a = P(x + dx, z).free(h, h + H), c = P(x, z + dz).free(h, h + H)
          if (generous ? !(a || c) : !(a && c)) continue
        }
        push(nx, nz, g, from)
      }
    }
    if (npc || !o.free(f, f + JUMP)) continue
    const MAXS = generous ? { 2: 20, 3: 16, 4: 9, 5: 0, 6: -24 } : { 2: 20, 3: 16 }
    const lowest = generous ? -96 : -64
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 2; k <= (generous ? 6 : 3); k++) {
      const nx = x + k * dx, nz = z + k * dz
      if (!inBox(nx, nz)) continue
      const t = P(nx, nz)
      for (const g of t.floors) {
        const dh = g - f
        if (dh > MAXS[k] || dh < lowest) continue
        const top = Math.max(f, g)
        let ok = t.free(g, top + ARC)
        for (let i = 1; i < k && ok; i++) ok = P(x + i * dx, z + i * dz).free(top, top + ARC)
        if (ok) push(nx, nz, g, from)
      }
    }
    if (!generous) continue
    const MAXD = { 2: 16, 3: 9 }
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let k = 2; k <= 3; k++) {
      const nx = x + k * dx, nz = z + k * dz
      if (!inBox(nx, nz)) continue
      const t = P(nx, nz)
      for (const g of t.floors) {
        const dh = g - f
        if (dh > MAXD[k] || dh < -96) continue
        const top = Math.max(f, g)
        let ok = t.free(g, top + ARC)
        for (let i = 1; i < k && ok; i++) ok = P(x + i * dx, z + i * dz).free(top, top + ARC) && (P(x + i * dx, z + (i - 1) * dz).free(top, top + ARC) || P(x + (i - 1) * dx, z + i * dz).free(top, top + ARC))
        if (ok) push(nx, nz, g, from)
      }
    }
  }
  if (qi < q.length) throw new Error(`bfs stopped at its limit (${limit})`)
  return seen
}

// ---- the outlines -----------------------------------------------------------------------------------------------------
function inPoly (poly, px, pz) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j]
    if (((zi > pz) !== (zj > pz)) && (px < (xj - xi) * (pz - zi) / (zj - zi) + xi)) c = !c
  }
  return c
}
const inWall = (x, z) => inPoly(Z.WALL, x + 0.5, z + 0.5)
const inInner = (x, z) => inPoly(Z.INNER, x + 0.5, z + 0.5)
const where = (x, z) => !inWall(x, z) ? 'outside' : inInner(x, z) ? 'inner' : 'lot'
const inBooth = (x, z) => x >= 270 && x <= 274 && z >= 393 && z <= 397
const inLane = (x, z) => ((x >= 253 && x <= 267) || (x >= 277 && x <= 291)) && z >= 397 && z <= 399
const trace = (seen, key) => { const out = []; let k = key; while (k) { out.push(k); k = seen.get(k) } return out.reverse() }
const xzOf = k => k.split(',').map(Number)

// ---- the opened states (zones.js) -------------------------------------------------------------------------------------
const DOORS = { ...Z.DOORS }
for (const x0 of CELLS.north) DOORS[`cell_n${x0}`] = [[x0 + 2, 58, 55]]
for (const x0 of CELLS.south) DOORS[`cell_s${x0}`] = [[x0 + 2, 58, 64]]
const OPEN = {
  cells: Object.keys(DOORS).filter(d => /^cell_/.test(d)),
  stair: ['stairgate'],
  course: ['vent', 'rusty', 'sogate', 'sohatch', 'security'],
  police: ['poln', 'pols'],
  booth: ['booth']
}
const AIR_DOORS = new Set(['sohatch']) // the hatch is opened as air (ESCAPE-SPEC 3.8)
function overlay (open = {}, { noProps = false } = {}) {
  const P = new Map()
  const openDoor = name => {
    for (const [x, y, z] of DOORS[name]) {
      const s = B.get(x, y, z)
      if (!s || !/_(door|trapdoor)\[/.test(s)) throw new Error(`door ${name}: nothing to open at ${x} ${y} ${z}`)
      const ys = /_door\[/.test(s) ? [y, y + 1] : [y]
      for (const yy of ys) P.set(`${x},${yy},${z}`, AIR_DOORS.has(name) ? 'air' : B.get(x, yy, z).replace('open=false', 'open=true'))
    }
  }
  for (const [what, on] of Object.entries(open)) {
    if (!on) continue
    if (OPEN[what]) for (const d of OPEN[what]) openDoor(d)
    else if (Z.BREACHES[what]) for (const [x1, y1, z1, x2, y2, z2] of Z.BREACHES[what]) for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) P.set(`${x},${y},${z}`, 'air')
    else throw new Error(`unknown open state ${what}`)
  }
  if (noProps) for (const [x1, y1, z1, x2, y2, z2] of outdoors.parkour) for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) P.set(`${x},${y},${z}`, 'air')
  return P
}

// ---- spots on an outline (Skript tests a player's exact x and z, not the block they stand in) -------------------------
// Every outline vertex is on a block centre, so an edge runs through a row of blocks. A block there that someone can
// stand in puts the player on either side of the edge by where they lean (a wall recess, a gap in a lattice), e.g. a
// prisoner pressed into it "escaped". Barrier blocks (the doors, the breaches: the barrier itself) and spots on top of
// a fence (y 72 and up: the parkour walks the annex fence) are allowed.
const onEdge = poly => (x, z) => poly.some((a, i) => {
  const b = poly[(i + 1) % poly.length], px = x + 0.5, pz = z + 0.5
  const vx = b[0] - a[0], vz = b[1] - a[1], L2 = vx * vx + vz * vz
  const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / L2))
  return Math.hypot(a[0] + t * vx - px, a[1] + t * vz - pz) < 1e-9
})
const ON_WALL = onEdge(Z.WALL), ON_INNER = onEdge(Z.INNER)
const BARRIER = new Set()
for (const blocks of Object.values(DOORS)) for (const [x, , z] of blocks) BARRIER.add(`${x},${z}`)
for (const boxes of Object.values(Z.BREACHES)) for (const [x1, , z1, x2, , z2] of boxes) for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) BARRIER.add(`${x},${z}`)
const EDGE = new Map() // "x,z,f" -> the run that reached it
const edgeSpots = seen => [...seen.keys()].filter(k => {
  const [x, z, f] = k.split(',').map(Number)
  return f < 72 * 16 && !BARRIER.has(`${x},${z}`) && (ON_WALL(x, z) || ON_INNER(x, z))
})

// ---- the report -------------------------------------------------------------------------------------------------------
let failures = 0
const ok = (cond, text) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${text}`); if (!cond) failures++; return cond }
function run (label, open, starts, mode, opts = {}) {
  const seen = bfs(makeModel(overlay(open, opts), { crouch: opts.crouch }), starts, { mode })
  for (const k of edgeSpots(seen)) if (!EDGE.has(k)) EDGE.set(k, `${label}${opts.crouch ? ', crouching' : ''}`)
  const r = { seen, out: [], lot: [], inner: [], booth: [] }
  for (const k of seen.keys()) {
    const [x, z] = xzOf(k)
    const w = where(x, z)
    r[w === 'outside' ? 'out' : w].push(k)
    if (inBooth(x, z)) r.booth.push(k)
  }
  console.log(`- ${label} [${mode}${opts.crouch ? ', crouching' : ''}]: ${seen.size} spots: ${r.inner.length} inside, ${r.lot.length} in the lot, ${r.out.length} outside, ${r.booth.length} in the booth (${secs()})`)
  return r
}
// A "nothing reached there" assertion: generous moves, for a standing and then a crouching player. bad(r) lists the
// spots that must not be reached. Returns the standing run.
function never (label, open, starts, bad, text, opts = {}) {
  let first = null
  for (const crouch of [false, true]) {
    const r = run(label, open, starts, 'generous', { ...opts, crouch })
    const list = bad(r)
    ok(list.length === 0, crouch ? `${text} (crouching too)` : text); showLeak(r, list)
    first = first || r
  }
  return first
}
// The last steps of the path to the first spot of `list` (to show where a leak crosses).
const pathTo = (r, list) => list.length ? trace(r.seen, list[0]).slice(-8).join(' > ') : ''
const showLeak = (r, list) => { if (list.length) console.log(`       e.g. ${pathTo(r, list)}`) }
const near = (list, gx, gz) => list.filter(k => { const [x, z] = xzOf(k); return Math.abs(x - gx) <= 2 && Math.abs(z - gz) <= 2 })
const step = n => !ONLY || ONLY.has(n)

const PTS = points()
const node = name => { const p = PTS[name]; return [Math.floor(p[0]), Math.floor(p[2]), Math.round(p[1] * 16)] }
const R_SPAWN = node('R_SPAWN')

// Every passable cell at y 58 (the crawl's floor) reachable from the vent chamber (77, 84), 4-connected, inside x 0..126,
// z 47..113: the 1-high crawl that the walk model can't follow (step 10).
function crawlFlood (m) {
  const seen = new Set(['77,84']), q = [[77, 84]]
  while (q.length) {
    const [x, z] = q.pop()
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, k = `${nx},${nz}`
      if (seen.has(k) || nx < 0 || nx > 126 || nz < 47 || nz > 113 || col(m.get(nx, 58, nz))) continue
      seen.add(k); q.push([nx, nz])
    }
  }
  return seen
}

const beyondInner = r => [...r.lot, ...r.out]
// 1. closed, generous, from R_SPAWN: nothing outside the inner outline
if (step(1)) {
  console.log('1. Everything closed')
  never('closed, from R_SPAWN', {}, [R_SPAWN], beyondInner, 'nothing in the lot or outside')
}
// 2. cells (+ the stair gate, + the course doors) open
if (step(2)) {
  console.log('2. Cells, the stair gate and the course doors open')
  never('cells + stair open, from cell N96', { cells: true, stair: true }, [[98, 51, 58 * 16]], beyondInner, 'nothing outside the inner outline')
  never('cells + stair + course open, from T_SPAWN', { cells: true, stair: true, course: true }, [node('T_SPAWN')], beyondInner, 'nothing outside the inner outline')
}
// 3. from outside: never in
if (step(3)) {
  console.log('3. From outside (the south road, west of W1, north of Max Security, the back road)')
  never('from outside', {}, [[272, 425, 1040], [-20, 100, 1040], [300, 20, 1040], [92, 350, 1040]], r => [...r.lot, ...r.inner], 'nothing inside the outline')
}
// 4. each method on its own, the booth and the front gate closed: into the lot, no further
if (step(4)) {
  console.log('4. Each method on its own (the booth door and the front gate closed)')
  for (const [label, open, goal] of [['police doors open', { police: true }, [210, 324]], ['gate breach open', { gate: true }, [178, 324]], ['punch gate open', { punch: true }, [366, 355]]]) {
    const r = run(`${label}, from R_SPAWN`, open, [R_SPAWN], 'strict')
    const hit = near(r.lot, goal[0], goal[1])
    ok(hit.length > 0, `reaches the lot at (${goal[0]}±2, ${goal[1]}±2)`); if (hit.length) console.log(`       ${pathTo(r, hit)}`)
    ok(r.out.length === 0 && r.booth.length === 0, 'nothing outside, not the booth\'s inside'); showLeak(r, [...r.out, ...r.booth])
    never(`${label}, from R_SPAWN`, open, [R_SPAWN], g => [...g.out, ...g.booth], 'nothing outside, not the booth\'s inside, with generous moves')
  }
}
// 5. from the lot
if (step(5)) {
  console.log('5. From the lot')
  const L = [[210, 330, 1040]]
  never('the lot, all closed', {}, L, a => [...a.inner, ...a.out, ...a.booth], 'nothing inside the inner outline, nothing outside, not the booth\'s inside')
  const b = run('the lot, the booth door open', { booth: true }, L, 'strict')
  ok(b.seen.has(`${node('BOOTH_STAND').join(',')}`), 'BOOTH_STAND (272, 395) reached')
  ok(b.out.length === 0, 'nothing outside'); showLeak(b, b.out)
  never('the lot, the booth door open', { booth: true }, L, bg => bg.out, 'nothing outside, with generous moves')
  const c = run('the lot, the front gate open', { front: true }, L, 'strict')
  const west = c.out.filter(k => { const [x, z] = xzOf(k); return x >= 253 && x <= 267 && z >= 397 && z <= 399 })
  const east = c.out.filter(k => { const [x, z] = xzOf(k); return x >= 277 && x <= 291 && z >= 397 && z <= 399 })
  ok(west.length > 0 && east.length > 0, 'out through both lanes (x 253..267 and 277..291, z 397..399)')
  never('the booth\'s inside, all closed', {}, [node('BOOTH_STAND')], d => [...d.seen.keys()].filter(k => !inBooth(...xzOf(k))), 'the closed booth is sealed (nothing reached outside it)')
}
// 6. each method's barrier and the front gate together: out; the front gate alone: nothing outside the inner outline
if (step(6)) {
  console.log('6. Each method and the front gate open')
  for (const [label, open] of [['police doors + front gate open', { police: true, front: true }], ['gate breach + front gate open', { gate: true, front: true }], ['punch gate + front gate open', { punch: true, front: true }]]) {
    const r = run(`${label}, from R_SPAWN`, open, [R_SPAWN], 'strict')
    const lane = r.out.filter(k => { const [x, z] = xzOf(k); return inLane(x, z) })
    ok(lane.length > 0, 'out through a gate lane'); if (lane.length) console.log(`       ${pathTo(r, lane)}`)
  }
  never('the front gate open alone, from R_SPAWN', { front: true }, [R_SPAWN], beyondInner, 'nothing outside the inner outline')
}

// 7. the points of Appendix B: present with the spec's numbers, each kind check, each standing point on its side
// [name, x, y, z, kind, side]: kind stand | display | block:<regex> | label:<facing>[:face]; side inner | lot | outside |
// any (the wall-top routes run on the outlines)
const R = (name, side, list) => list.map((p, i) => [`ROUTE_${name}_${i + 1}`, ...p, 'stand', side])
const APPENDIX_B = [
  ...R('YARDN', 'inner', [[140.5, 65, 140.5], [156.5, 65, 122.5], [172.5, 65, 103.5], [205.5, 65, 103.5], [238.5, 65, 103.5], [263.5, 65, 118.5]]),
  ...R('YARDS', 'inner', [[263.5, 65, 145.5], [263.5, 65, 172.5], [263.5, 65, 199.5], [263.5, 65, 226.5], [263.5, 65, 245.5], [227.5, 65, 243.5], [190.5, 65, 240.5], [190.5, 65, 215.5], [190.5, 65, 189.5], [165.5, 65, 189.5], [140.5, 65, 189.5], [140.5, 65, 165.5]]),
  ...R('WALK', 'inner', [[180.5, 65, 310.5], [180.5, 65, 290.5], [180.5, 65, 271.5], [205.5, 65, 271.5], [235.5, 65, 271.5], [265.5, 65, 271.5], [295.5, 65, 271.5], [330.5, 65, 271.5], [336.5, 65, 265.5], [336.5, 65, 258.5]]),
  ...R('W5', 'any', [[279.5, 78, 120.5], [279.5, 78, 141.5], [279.5, 78, 163.5], [283.5, 78, 166.5], [283.5, 78, 175.5], [279.5, 78, 178.5], [279.5, 78, 203.5], [279.5, 78, 228.5]]),
  ...R('W67', 'any', [[287.5, 78, 235.5], [310.5, 78, 235.5], [340.5, 78, 235.5], [373.5, 78, 235.5], [377.5, 78, 240.5], [381.5, 78, 243.5], [381.5, 78, 264.5], [377.5, 78, 267.5], [377.5, 78, 277.5], [381.5, 78, 280.5], [381.5, 78, 310.5], [381.5, 78, 340.5]]),
  ['TANK', 181.5, 65, 156.5, 'stand', 'inner'],
  ['PLANT_GATE', 178.5, 65, 320.5, 'stand', 'inner'],
  ['C4_GATE', 178.5, 67.0, 321.9, 'display'],
  ['PUNCH_STAND', 335.5, 65, 254.5, 'stand', 'inner'],
  ['PUNCH_READER', 337, 66, 262, 'block:tripwire_hook'],
  ['PUNCH_IN', 340.5, 65, 264.5, 'stand', 'inner'],
  ['RUN_1', 172.5, 65, 103.5, 'stand', 'inner'], ['RUN_2', 238.5, 65, 103.5, 'stand', 'inner'], ['RUN_3', 227.5, 65, 243.5, 'stand', 'inner'], ['RUN_4', 140.5, 65, 240.5, 'stand', 'inner'],
  ['STASH_1', 273.5, 65, 180.5, 'stand', 'inner'], ['STASH_2', 238.5, 65, 94.5, 'stand', 'inner'], ['STASH_3', 162.5, 65, 245.5, 'stand', 'inner'], ['STASH_4', 190.5, 65, 318.5, 'stand', 'inner'],
  ['LOT_EXIT', 260.5, 65, 404.5, 'stand', 'outside'],
  ...R('GATE', 'lot', [[236.5, 65, 389.5], [272.5, 65, 389.5], [308.5, 65, 389.5]]),
  ...R('LOT', 'lot', [[150.5, 65, 362.5], [190.5, 65, 362.5], [230.5, 65, 362.5], [270.5, 65, 362.5], [310.5, 65, 362.5], [350.5, 65, 362.5]]),
  ['BOOTH_OUT', 272.5, 65, 389.5, 'stand', 'lot'],
  ['BOOTH_READER', 271, 66, 390, 'block:tripwire_hook'],
  ['BOOTH_DOOR', 272, 65, 392, 'block:iron_door'],
  ['BOOTH_IN', 272.5, 65, 393.5, 'stand', 'lot'],
  ['BOOTH_STAND', 272.5, 65, 395.5, 'stand', 'lot'],
  ['CONSOLE', 272.5, 65.0, 397.5, 'block:smooth_stone_slab'],
  ['FUSE_BOX', 267, 66, 395, 'block:iron_block'],
  ['FUSE_STAND', 266.5, 65, 395.5, 'stand', 'lot'],
  ['FRONT_IN', 260.5, 65, 392.5, 'stand', 'lot'],
  ['L_GATEHOUSE', 272.5, 68.5, 390.97, 'label:north:face'],
  ['L_FUSE', 266.97, 66.5, 395.5, 'label:west:face'],
  ...R('HALLB', 'inner', [[84.5, 65, 121.5], [84.5, 65, 155.5], [84.5, 65, 188.5]]),
  ['LEFTY', 80.5, 65.5, 151.5, 'stand', 'inner'],
  ['WHISPER', 108.5, 65, 209.5, 'stand', 'inner'],
  ['DONUT_CAFE', 100.5, 66.0, 137.5, 'display'],
  ['SEARCH_TIMER', 81, 66, 230, 'block:iron_trapdoor'],
  ['STAIR_GATE_A', 84, 65, 113, 'block:iron_door'], ['STAIR_GATE_B', 85, 65, 113, 'block:iron_door'],
  ['SECURITY_DOOR', 79, 65, 117, 'block:iron_door'],
  ['COURSE_DONE', 82.5, 65, 117.5, 'stand', 'inner'],
  ['CP_VENT', 84.5, 58, 80.5, 'stand', 'inner'], ['CP_OFFICE', 84.5, 58, 90.5, 'stand', 'inner'], ['COURSE_PUSH', 84.5, 58, 97.5, 'stand', 'inner'],
  ['RUSTY_DOOR', 79, 58, 78, 'block:iron_door'],
  ['RUSTY_IN', 75.5, 58, 77.5, 'stand', 'inner'],
  ['BOILER_IN', 61.5, 58, 80.5, 'stand', 'inner'],
  ['SNEAK_BACK', 78.5, 58, 59.5, 'stand', 'inner'],
  ['RUSTY_TALK', 80.25, 58.0, 77.5, 'display'],
  ['L_OFFICE', 80.03, 61.0, 94.0, 'label:east'],
  ['SEARCH_PUTTY', 61, 65, 53, 'block:barrel'], ['SEARCH_WIRES', 81, 65, 90, 'block:barrel'],
  ['ASSEMBLE', 49, 65, 51, 'block:crafting_table'],
  ['ASSEMBLE_STAND', 49.5, 65, 52.5, 'stand', 'inner'],
  ['T_SO_HATCH', 64, 64, 88, 'block:iron_trapdoor'],
  ['SO_UP', 64.5, 65, 89.5, 'stand', 'inner'],
  ['ROUTE_POLDESK_1', 220.5, 65, 304.5, 'stand', 'inner'],
  ...R('POLOFFICE', 'inner', [[225.5, 65, 292.5], [225.5, 65, 296.5], [246.5, 65, 296.5], [246.5, 65, 293.5]]),
  ['POL_DOOR_N', 210, 65, 286, 'block:iron_door'], ['POL_DOOR_S', 210, 65, 321, 'block:iron_door'],
  ['POL_READER_N_OUT', 209, 66, 284, 'block:tripwire_hook'], ['POL_READER_N_IN', 212, 66, 287, 'block:tripwire_hook'], ['POL_READER_S_IN', 209, 66, 320, 'block:tripwire_hook'],
  ['POL_IN', 210.5, 65, 288.5, 'stand', 'inner'],
  ['L_POLICE_N', 211.0, 69.5, 284.97, 'label:north:face']
]
const EXISTING = ['R_SPAWN', 'T_SPAWN', 'T_KEYCARD', 'T_GUARD_SEAT', 'T_DONUT', 'T_VENT_STAND', 'T_VENT_DOOR', 'T_VENT_READER', 'T_SO_GATE_A',
  'T_SO_GATE_B', 'T_SO_READER_OUT', 'T_SO_READER_IN', 'RUSTY', 'GUN_KEEPER',
  ...CELLS.north.filter(x0 => x0 !== 60).map(x0 => `T_CELL_N${x0}`), ...CELLS.south.map(x0 => `T_CELL_S${x0}`)]
const DROPPED = ['E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'T_EXIT', 'T_SHAFT_HATCH', 'PLANT_WALL', 'C4_WALL', 'GATE_OUT', 'WALL_OUT', 'ROUTE_POLAISLE_1',
  // the course's instruction signs (owner, 2026-10-14: the steps are told on screen)
  'L_WALK', 'L_SPRINT', 'L_JUMP', 'L_SNEAK', 'L_READER', 'L_PHONE', 'L_HOTBAR', 'L_LADDER']
if (step(7)) {
  console.log('7. The points (Appendix B)')
  const m = makeModel()
  const bad = []
  for (const [name, x, y, z, kind, side] of APPENDIX_B) {
    const p = PTS[name]
    if (!p) { bad.push(`${name}: missing`); continue }
    if (p[0] !== x || p[1] !== y || p[2] !== z) { bad.push(`${name}: (${p.slice(0, 3)}) in the module, (${x},${y},${z}) in the spec`); continue }
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z)
    const at = (dy = 0) => m.get(bx, by + dy, bz)
    if (kind === 'stand') {
      const frac = y - by, fc = col(at())
      const support = frac > 0 ? (fc && fc[1] >= frac * 16 - 1 && fc[1] <= frac * 16 + 1) : (col(at(-1)) && col(at(-1))[1] === 16)
      const head1 = col(at(1)), head2 = frac > 0 ? col(at(2)) : null
      const fits = support && (frac > 0 || !fc) && !head1 && !(head2 && head2[0] < (frac * 16 + 13) % 16)
      if (!fits) bad.push(`${name}: can't stand (below ${at(-1)}, feet ${at()}, head ${at(1)})`)
      const w = where(bx, bz)
      if (side !== 'any' && w !== side) bad.push(`${name}: ${w}, should be ${side}`)
    } else if (kind === 'display') {
      if (col(at())) bad.push(`${name}: the display cell holds ${at()}`)
    } else if (kind.startsWith('block:')) {
      if (!new RegExp(kind.slice(6)).test(at())) bad.push(`${name}: ${at()}, should be ${kind.slice(6)}`)
    } else if (kind.startsWith('label:')) {
      const [, facing, face] = kind.split(':')
      if (col(at())) bad.push(`${name}: the label cell holds ${at()}`)
      if (face) {
        const d = { north: [0, 1], south: [0, -1], east: [-1, 0], west: [1, 0] }[facing]
        const behind = m.get(Math.floor(x + d[0] * 0.1), by, Math.floor(z + d[1] * 0.1))
        if (!col(behind)) bad.push(`${name}: no face behind it (${behind})`)
      }
    }
  }
  for (const n of EXISTING) if (!PTS[n]) bad.push(`${n}: missing (an existing point the scripts use)`)
  for (const n of DROPPED) if (PTS[n]) bad.push(`${n}: still there (dropped by ESCAPE-SPEC)`)
  for (const b of bad) console.log(`       ${b}`)
  ok(bad.length === 0, `${APPENDIX_B.length} Appendix B points and ${EXISTING.length} existing ones: ${bad.length} problem(s)`)
  // a few zone facts (Appendix C's notes): the hole zones hold their breach boxes, the move-to points are outside them
  const inZone = (zone, x, y, z) => Z.ZONES[zone].some(([a, b, c, d, e, g]) => x >= a && x <= d && y >= b && y <= e && z >= c && z <= g)
  const pz = name => { const p = PTS[name]; return [Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2])] }
  const facts = [
    ['the gate breach inside gatehole', Z.BREACHES.gate.every(([x1, y1, z1, x2, y2, z2]) => inZone('gatehole', x1, y1, z1) && inZone('gatehole', x2, y2, z2))],
    ['the punch gate inside punchhole', Z.BREACHES.punch.every(([x1, y1, z1, x2, y2, z2]) => inZone('punchhole', x1, y1, z1) && inZone('punchhole', x2, y2, z2))],
    ['the front gate inside fronthole', Z.BREACHES.front.every(([x1, y1, z1, x2, y2, z2]) => inZone('fronthole', x1, y1, z1) && inZone('fronthole', x2, y2, z2))],
    ['PLANT_GATE in plantgate, outside gatehole', inZone('plantgate', ...pz('PLANT_GATE')) && !inZone('gatehole', ...pz('PLANT_GATE'))],
    ['FRONT_IN and LOT_EXIT outside fronthole', !inZone('fronthole', ...pz('FRONT_IN')) && !inZone('fronthole', ...pz('LOT_EXIT'))],
    ['BOOTH_IN in boothin, BOOTH_OUT in boothapp, BOOTH_STAND in booth', inZone('boothin', ...pz('BOOTH_IN')) && inZone('boothapp', ...pz('BOOTH_OUT')) && inZone('booth', ...pz('BOOTH_STAND'))],
    ['FUSE_BOX in fusebox', inZone('fusebox', ...pz('FUSE_BOX'))],
    ['PUNCH_IN in punchhole', inZone('punchhole', ...pz('PUNCH_IN'))],
    ['POL_IN in polnin', inZone('polnin', ...pz('POL_IN'))]
  ]
  for (const [text, cond] of facts) ok(cond, text)
}

// 8. the cop routes: every hop connected for a walker with no gap jumps
if (step(8)) {
  console.log('8. The cop routes (a walker, no gap jumps)')
  const m = makeModel()
  const routes = {}
  for (const [name, p] of Object.entries(PTS)) { const r = /^ROUTE_([A-Z0-9]+)_(\d+)$/.exec(name); if (r) (routes[r[1]] = routes[r[1]] || [])[Number(r[2]) - 1] = [name, p] }
  let worst = 0, worstAt = ''
  for (const [r, list] of Object.entries(routes)) {
    const seq = list.length > 1 ? [...list, ...list.slice(1, -1).reverse(), list[0]] : list
    let longest = 0, connected = true
    for (let i = 0; i + 1 < seq.length; i++) {
      const a = [Math.floor(seq[i][1][0]), Math.floor(seq[i][1][2]), Math.round(seq[i][1][1] * 16)]
      const b = [Math.floor(seq[i + 1][1][0]), Math.floor(seq[i + 1][1][2]), Math.round(seq[i + 1][1][1] * 16)]
      const box = [Math.min(a[0], b[0]) - 30, Math.min(a[1], b[1]) - 30, Math.max(a[0], b[0]) + 30, Math.max(a[1], b[1]) + 30]
      const seen = bfs(m, [a], { mode: 'npc', box })
      const k = b.join(',')
      if (!seen.has(k)) { connected = false; console.log(`       ${seq[i][0]} -> ${seq[i + 1][0]}: not connected`); continue }
      longest = Math.max(longest, trace(seen, k).length)
    }
    if (longest > worst) { worst = longest; worstAt = r }
    ok(connected, `${r.toLowerCase()}: ${list.length} points, longest hop ${longest} blocks of path`)
  }
  console.log(`       ${Object.keys(routes).length} routes, the longest hop ${worst} (${worstAt.toLowerCase()})`)
}

// 9. the punch gate open with the parkour props taken out: nothing outside the inner outline (the props are the only way)
if (step(9)) {
  console.log('9. The punch gate open without the parkour props')
  never('punch gate open, no props, from R_SPAWN', { punch: true }, [R_SPAWN], beyondInner, 'nothing outside the inner outline', { noProps: true })
}

// 10. the controls course after the crawl (its doors open): the boiler room leads on through Rusty's cell
if (step(10)) {
  console.log('10. The course after the crawl (the course doors open)')
  const r = run('from BOILER_IN', { course: true }, [node('BOILER_IN')], 'strict')
  // a standing spot in that column on that floor (a carpet or a slab lifts the feet a little)
  const has = (x, z, y) => { for (let f = y * 16; f < y * 16 + 16; f++) if (r.seen.has(`${x},${z},${f}`)) return true; return false }
  ok(has(76, 77, 58), "Rusty's cell (76, 77)")
  ok(has(70, 100, 58), 'the Security Office, lower floor (70, 100)')
  ok(has(64, 89, 65), 'the Security Office, upper floor (64, 89)')
  ok(has(72, 117, 65), 'Hall C (72, 117)')
  ok(has(82, 117, 65), 'Hall B (82, 117)')
  // The crawl is 1 high (players crawl through it), which the walk model can't follow: flood its floor level instead,
  // every passable cell at y 58 from the vent chamber, the doors closed. It must turn north into the boiler room and go
  // on into Rusty's cell, and never reach the old walk tunnel west of the cap at x 60.
  const seen = crawlFlood(makeModel())
  console.log(`- the crawl's floor (y 58) from the vent chamber, doors closed: ${seen.size} cells`)
  ok(seen.has('61,83') && seen.has('61,82') && seen.has('61,80'), 'the crawl turns north into the boiler room at x 61')
  ok(seen.has('73,77') && seen.has('74,77') && seen.has('76,77'), "the broken wall leads on into Rusty's cell")
  ok(!seen.has('60,84') && !seen.has('59,84') && ![...seen].some(k => Number(k.split(',')[0]) < 44), 'the old walk tunnel is sealed (nothing west of the cap at x 60)')
  ok(!seen.has('80,84') && !seen.has('80,78'), 'the vent and Rusty\'s doors closed: not into the main corridor')
}

// 11. the model can see a leak: with the old RELEASE gap in F6 and the back gate reopened it finds the old way out, and
// without the crawl's cap the flood reaches the old walk tunnel (so a pass above means something)
if (step(11)) {
  console.log('11. The model can see a leak')
  const P = new Map()
  for (let x = 88; x <= 106; x++) for (let z = 262; z <= 268; z++) for (let y = 65; y <= 72; y++) {
    const s = B.get(x, y, z)
    if (s && /^(iron_bars|diorite_wall|andesite_wall|iron_chain)/.test(s)) P.set(`${x},${y},${z}`, 'air')
  }
  for (let x = 81; x <= 104; x++) for (let y = 65; y <= 71; y++) P.set(`${x},${y},292`, 'air')
  const seen = bfs(makeModel(P), [R_SPAWN], { mode: 'generous' })
  const out = [...seen.keys()].filter(k => { const [x, z] = xzOf(k); return !inWall(x, z) })
  console.log(`- the RELEASE gap and the back gate reopened, from R_SPAWN [generous]: ${seen.size} spots, ${out.length} outside (${secs()})`)
  ok(out.length > 0, 'the model finds the old way out')
  const f = crawlFlood(makeModel(new Map([['60,58,84', 'air'], ['60,59,84', 'air']])))
  ok(f.has('59,84'), 'without the cap the crawl flood reaches the old tunnel')
  // T9's notch reopened (outdoors.js sealT9): the punch gate open, a crouching player walks the annex fence top into the
  // tower's hollow, across the outline; standing, nobody does (so the crouch pass is what catches it)
  const T9 = new Map([72, 73, 74].map(y => [`377,${y},349`, 'air']))
  for (const [k, v] of overlay({ punch: true })) T9.set(k, v)
  const t9 = crouch => {
    const s = bfs(makeModel(T9, { crouch }), [R_SPAWN], { mode: 'generous' })
    const o = [...s.keys()].filter(k => { const [x, z] = xzOf(k); return !inWall(x, z) })
    console.log(`- T9's notch reopened, the punch gate open [generous${crouch ? ', crouching' : ''}]: ${o.length} outside (${secs()})`)
    return o
  }
  ok(t9(false).length === 0 && t9(true).some(k => { const [x, z] = xzOf(k); return x >= 381 && x <= 384 && z >= 344 && z <= 350 }), 'only the crouch pass finds the way into T9\'s hollow')
}

// 12. every run above: no spot anyone reached lies in a block an outline runs through (see "spots on an outline")
console.log('12. Spots on the outlines (every run above)')
for (const [k, label] of [...EDGE].slice(0, 12)) console.log(`       ${k} (${label})`)
ok(EDGE.size === 0, `no reached spot is in a block an outline edge runs through: ${EDGE.size}`)

console.log(failures ? `FAILED: ${failures} assertion(s) (${secs()})` : `all checks passed (${secs()})`)
process.exit(failures ? 1 : 0)
