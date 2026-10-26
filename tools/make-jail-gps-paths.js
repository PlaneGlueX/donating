// The prison's first GPS path graph (DonatingPhone's /dphone path, 2026-10-14): walks the real build (tools/build/jail.js)
// between the named points a prisoner goes to (the B1 course, Hall B, Hall A, the yard, the walk to the police station
// and the Gun Shop, the parkour, the lot, the gatehouse and the front gate, Sparks' weapon parts, the lot fence's dugout), with every door and breach open (the GPS
// shows the way out), and simplifies each walk into the corners a straight line can join without leaving the walkable
// floor. Writes tools/jail-gps-paths.txt: the /dphone path lines that make it (local: RCON; Minehut: the console, or
// upload the paths.yml they make).
//   tools\node\node.exe tools\make-jail-gps-paths.js [--out <file>] [--check] [--renumber]   (--check: RCON spot checks of
//   every node; a node keeps the id it had in the file there before, unless --renumber)
// The walk model is the escape checker's (tools/build/jail-escape-check.js, its strict mode: step 9/16, jump 20/16,
// ladders, straight gap jumps of 2-3; standing room 29/16), copied here because that file runs its checks when loaded;
// drops are capped at 3 blocks and every move has a cost (a jump or a gap jump only when it saves real walking).
'use strict'
const fs = require('fs')
const path = require('path')
const { build, points } = require('./build/jail.js')
const Z = require('./build/jail/zones.js')
const { cells: CELLS } = require('./build/jail/cellblock.js')

const WORLD = 'jailbreak'
const outArg = process.argv.indexOf('--out')
const OUT = outArg > 0 ? process.argv[outArg + 1] : path.join(__dirname, 'jail-gps-paths.txt')

// ---- the world: the build with every door and breach open, the flat default elsewhere ----------------------------------
const B = build()
const P = points()
const defaultBlock = y => y === 64 ? 'grass_block' : (y >= 61 && y <= 63) ? 'dirt' : y <= 60 ? 'stone' : 'air'
const overlay = new Map()
const DOORS = { ...Z.DOORS }
for (const x0 of CELLS.north) DOORS[`cell_n${x0}`] = [[x0 + 2, 58, 55]]
for (const x0 of CELLS.south) DOORS[`cell_s${x0}`] = [[x0 + 2, 58, 64]]
for (const [name, blocks] of Object.entries(DOORS)) for (const [x, y, z] of blocks) {
  const s = B.get(x, y, z)
  for (const yy of /_door\[/.test(s) ? [y, y + 1] : [y]) overlay.set(`${x},${yy},${z}`, name === 'sohatch' ? 'air' : B.get(x, yy, z).replace('open=false', 'open=true'))
}
for (const boxes of Object.values(Z.BREACHES)) for (const [x1, y1, z1, x2, y2, z2] of boxes) for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) overlay.set(`${x},${y},${z}`, 'air')
const get = (x, y, z) => { const k = `${x},${y},${z}`; return overlay.has(k) ? overlay.get(k) : (B.get(x, y, z) ?? defaultBlock(y)) }

// Collision per block in 1/16 (from, to) or null: the escape checker's table.
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
const Y0 = 50, Y1 = 100, H = 29
const profiles = new Map()
function profile (x, z) {
  const k = x * 4096 + z
  let p = profiles.get(k)
  if (p) return p
  const iv = []; const lad = new Set()
  for (let y = Y0; y <= Y1; y++) {
    const s = get(x, y, z)
    if (isLadder(s)) lad.add(y)
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
  p = { free, floors, lad }
  profiles.set(k, p)
  return p
}

// ---- Dijkstra over standing spots (x, z, f = the feet's height in 1/16) ----------------------------------------------------
const key = (x, z, f) => ((x + 64) * 1024 + (z + 64)) * 2048 + f
const unkey = k => { const f = k % 2048; const r = (k - f) / 2048; const z = r % 1024 - 64; return [(r - (z + 64)) / 1024 - 64, z, f] }
function heapPush (h, item) { h.push(item); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p } }
function heapPop (h) {
  const top = h[0]; const last = h.pop()
  if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m } }
  return top
}
// The moves from a spot: [x, z, f, cost].
function moves (x, z, f) {
  const out = []
  const o = profile(x, z)
  if (o.lad.size) for (const g of o.floors) if (Math.abs(g - f) === 16 && (o.lad.has(f >> 4) || o.lad.has(g >> 4) || o.lad.has((f >> 4) - 1) || o.lad.has((g >> 4) - 1)) && o.free(Math.min(f, g), Math.max(f, g) + H)) out.push([x, z, g, 1.2])
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    if (!dx && !dz) continue
    const t = profile(x + dx, z + dz)
    for (const g of t.floors) {
      const dh = g - f
      if (dh < -48) continue // a drop of 3 blocks at most
      let extra = dh < -9 ? 0.5 : 0
      if (dh <= 9) { if (!(t.free(g, Math.max(f, g) + H) && o.free(f, Math.max(f, g) + H))) continue }
      else if (dh <= 20) { if (!(o.free(f, f + H + 20) && t.free(g, f + H + 20))) continue; extra = 0.6 }
      else continue
      if (dx && dz) {
        const h = Math.max(f, g)
        if (!(profile(x + dx, z).free(h, h + H) && profile(x, z + dz).free(h, h + H))) continue
      }
      out.push([x + dx, z + dz, g, (dx && dz ? 1.414 : 1) + extra])
    }
  }
  if (!o.free(f, f + H + 20)) return out
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 2; k <= 3; k++) {
    const nx = x + k * dx, nz = z + k * dz
    const t = profile(nx, nz)
    for (const g of t.floors) {
      const dh = g - f
      if (dh > (k === 2 ? 20 : 16) || dh < -64) continue
      const top = Math.max(f, g)
      let ok = t.free(g, top + H + 8)
      for (let i = 1; i < k && ok; i++) ok = profile(x + i * dx, z + i * dz).free(top, top + H + 8)
      // A gap jump only over a real gap (no floor to walk on at that height in between): otherwise it's just a walk.
      let gap = false
      for (let i = 1; i < k; i++) if (!profile(x + i * dx, z + i * dz).floors.some(h => Math.abs(h - f) <= 9)) gap = true
      if (ok && gap) out.push([nx, nz, g, k + 3])
    }
  }
  return out
}
// The spot to start or end at near a point: the standing spot within 2 blocks (flat) nearest it, its height within 1.5.
function spotNear (x, y, z) {
  let best = null, bd = Infinity
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    const cx = Math.floor(x) + dx, cz = Math.floor(z) + dz
    for (const f of profile(cx, cz).floors) {
      const d = Math.hypot(cx + 0.5 - x, cz + 0.5 - z) + Math.abs(f / 16 - y) * 2
      if (Math.abs(f / 16 - y) <= 1.5 && d < bd && moves(cx, cz, f).length) { bd = d; best = [cx, cz, f] } // not a closed pocket
    }
  }
  return best
}
function walk (a, b) {
  const [x1, z1] = a, [x2, z2] = b
  const box = [Math.min(x1, x2) - 48, Math.min(z1, z2) - 48, Math.max(x1, x2) + 48, Math.max(z1, z2) + 48]
  const dist = new Map(), prev = new Map()
  const start = key(...a), goal = key(...b)
  const heap = [[0, start]]
  dist.set(start, 0)
  let n = 0
  while (heap.length && n++ < 3e6) {
    const [d, k] = heapPop(heap)
    if (d > dist.get(k)) continue
    if (k === goal) break
    const [x, z, f] = unkey(k)
    for (const [nx, nz, g, c] of moves(x, z, f)) {
      if (nx < box[0] || nz < box[1] || nx > box[2] || nz > box[3]) continue
      const nk = key(nx, nz, g), nd = d + c
      if (nd < (dist.has(nk) ? dist.get(nk) : Infinity)) { dist.set(nk, nd); prev.set(nk, k); heapPush(heap, [nd, nk]) }
    }
  }
  if (!prev.has(goal) && start !== goal) return null
  const out = []
  for (let k = goal; k !== undefined; k = prev.get(k)) out.push(unkey(k))
  return { path: out.reverse(), cost: dist.get(goal), reached: dist }
}

// ---- simplifying a walk into corners -----------------------------------------------------------------------------------
// Can a straight line join these two walk points? Every 0.2 blocks along it (and 0.3 to each side) there's a spot the walk
// reached at about the line's height (a stair counts its steps; a ladder its rungs).
function straight (p, q, reached) {
  const [ax, az, af] = p, [bx, bz, bf] = q
  const L = Math.hypot(bx - ax, bz - az)
  const nx = L > 0 ? -(bz - az) / L : 0, nz = L > 0 ? (bx - ax) / L : 0
  const steps = Math.max(1, Math.ceil(L / 0.2))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, sx = ax + 0.5 + (bx - ax) * t, sz = az + 0.5 + (bz - az) * t, sf = af + (bf - af) * t
    for (const side of [0, -0.3, 0.3]) {
      const cx = Math.floor(sx + nx * side), cz = Math.floor(sz + nz * side)
      if (!profile(cx, cz).floors.some(g => Math.abs(g - sf) <= 12 && reached.has(key(cx, cz, g)))) return false
    }
  }
  return true
}
function corners (w) {
  // String pulling: from each corner the farthest walk point a straight line reaches (looking a few points past a miss:
  // an 8-way walk weaves).
  const path = w.path, out = [path[0]]
  let i = 0
  while (i < path.length - 1) {
    let j = i + 1, misses = 0
    for (let k = i + 2; k < path.length && misses < 8; k++) {
      if (straight(path[i], path[k], w.reached)) { j = k; misses = 0 } else misses++
    }
    out.push(path[j])
    i = j
  }
  return out
}

// ---- the routes (by the build's point names; [x, y, z] for a spot of our own) ------------------------------------------
// A cell's middle, named after the cell (cellblock.js's cell lists: x0 is the cell's west wall).
const CELLNAMES = new Map()
const cellAt = (row, x0, z) => { const p = [x0 + 2.5, 58, z]; CELLNAMES.set(p, `Cell ${row}${x0}`); return p }
const pt = n => { if (Array.isArray(n)) return n; const p = P[n]; if (!p) throw new Error(`no point ${n}`); return p }
const corridor = []
for (const x0 of [...CELLS.north, ...CELLS.south].sort((a, b) => a - b)) if (!corridor.some(c => c[0] === x0 + 2.5)) corridor.push([x0 + 2.5, 58, 59.5])
const ROUTES = [
  // B1: the cells along the cross corridor, the course's east corridor, Rusty, the boiler room, the office gate, the ladder.
  corridor,
  ...CELLS.north.map(x0 => [cellAt('N', x0, 51.5), [x0 + 2.5, 58, 59.5]]),
  ...CELLS.south.map(x0 => [cellAt('S', x0, 68.5), [x0 + 2.5, 58, 59.5]]),
  ['SNEAK_BACK', 'CP_VENT', 'CP_OFFICE', 'COURSE_PUSH'],
  ['CP_VENT', 'RUSTY_TALK'],
  ['CP_VENT', 'BOILER_IN'],
  ['CP_OFFICE', 'T_SO_GATE', 'SO_UP', 'COURSE_DONE'],
  // Up into Hall B (the stair gate), Hall B, Hall A, out to the yard; the inmates and the searches near them.
  ['COURSE_PUSH', 'STAIR_GATE_A', 'ROUTE_HALLB_1'],
  ['COURSE_DONE', 'ROUTE_HALLB_1', [82.5, 65, 151.5], 'ROUTE_HALLB_2', 'ROUTE_HALLB_3', 'R_SPAWN', 'R_SPAWN_OUT'],
  ['ROUTE_HALLB_2', 'DONUT_CAFE'],
  ['COURSE_DONE', 'SEARCH_WIRES'],
  ['ROUTE_HALLB_1', 'ASSEMBLE_STAND', 'SEARCH_PUTTY'],
  ['R_SPAWN', [108.5, 65, 211.5]],
  ['R_SPAWN', 'SEARCH_TIMER'],
  // The yard: its loop, across it past Tank, the yard run's marks and the stashes.
  ['R_SPAWN_OUT', 'ROUTE_YARDS_12', 'ROUTE_YARDN_1', 'ROUTE_YARDN_2', 'ROUTE_YARDN_3', 'ROUTE_YARDN_4', 'ROUTE_YARDN_5', 'ROUTE_YARDN_6',
    'ROUTE_YARDS_1', 'ROUTE_YARDS_2', 'ROUTE_YARDS_3', 'ROUTE_YARDS_4', 'ROUTE_YARDS_5', 'ROUTE_YARDS_6', 'ROUTE_YARDS_7', 'ROUTE_YARDS_8',
    'ROUTE_YARDS_9', 'ROUTE_YARDS_10', 'ROUTE_YARDS_11', 'ROUTE_YARDS_12'],
  ['ROUTE_YARDS_12', [179.5, 65, 156.5], 'ROUTE_YARDS_2'],
  ['ROUTE_YARDS_11', 'RUN_4', 'ROUTE_YARDS_7'],
  ['ROUTE_YARDS_2', 'STASH_1'], ['ROUTE_YARDN_5', 'STASH_2'], ['ROUTE_YARDS_7', 'STASH_3'],
  // The walk: to the C4 gate and the lot, the police station, the Gun Shop and the punch box, the parkour.
  ['ROUTE_YARDS_7', 'ROUTE_WALK_3', 'ROUTE_WALK_2', 'ROUTE_WALK_1', 'STASH_4'],
  ['ROUTE_WALK_1', 'PLANT_GATE', [178.5, 65, 326.5], 'ROUTE_LOT_2'],
  ['ROUTE_WALK_3', 'ROUTE_WALK_4', 'ROUTE_WALK_5', 'ROUTE_WALK_6', 'ROUTE_WALK_7', 'ROUTE_WALK_8', 'ROUTE_WALK_9', 'ROUTE_WALK_10', 'PUNCH_STAND'],
  ['ROUTE_WALK_7', [311.5, 65, 246.5]],
  ['ROUTE_WALK_4', 'POL_IN', 'ROUTE_POLOFFICE_1', 'ROUTE_POLOFFICE_2', 'ROUTE_POLOFFICE_3', 'ROUTE_POLOFFICE_4'],
  ['POL_IN', 'ROUTE_POLDESK_1', [210.5, 65, 319.5], [210.5, 65, 326.5], 'ROUTE_LOT_3'],
  ['PUNCH_STAND', 'PUNCH_IN', 'ROUTE_LOT_6'],
  // The lot, the gatehouse booth and its console, the front gate and out.
  ['ROUTE_LOT_1', 'ROUTE_LOT_2', 'ROUTE_LOT_3', 'ROUTE_LOT_4', 'ROUTE_LOT_5', 'ROUTE_LOT_6'],
  ['ROUTE_LOT_4', 'ROUTE_GATE_2', 'BOOTH_IN', 'CONSOLE'],
  ['ROUTE_GATE_1', 'ROUTE_GATE_2', 'ROUTE_GATE_3'],
  ['BOOTH_IN', 'FUSE_STAND'],
  ['ROUTE_GATE_1', 'FRONT_IN', 'LOT_EXIT'],
  // Sparks' weapon parts (2026-10-20, last so the older nodes keep their ids): the gym's weights from Hall B, the storage
  // room through the infirmary, the laundry through the workshop's door (Sparks himself stands 3 blocks from
  // ASSEMBLE_STAND, walked above).
  ['ROUTE_HALLB_2', [47.5, 65, 159.5]], // in front of the rack (the point itself is on its top, which no walk reaches)
  ['SEARCH_TIMER', 'SEARCH_TAPE'],
  ['SEARCH_PUTTY', 'SEARCH_HANDLE'],
  // The bike shop in front of the prison (2026-10-21, tools/build/jail/bikeshop.js; last so the older nodes keep their ids)
  ['LOT_EXIT', 'BIKE_SHOP'],
  // The dugout under the west lot fence (2026-10-21, outdoors.js dugout: the plug dug out). Not on to the bike shop: the
  // model has no ground outside the build, so that walk went back through the tunnel and out the front gate.
  ['ROUTE_LOT_1', 'DUG_IN', 'DUG_OUT'],
  // The ladder over the lot's south fence (2026-10-22, outdoors.js lotLadder, where the ramp stood; last so the older
  // nodes keep their ids)
  ['ROUTE_LOT_1', 'LADDER_IN', 'LADDER_OUT']
]
const NAMES = new Map() // "x,z,f" of an anchor -> its point name
const nodes = [] // {x, z, f, name}
const links = new Set()
function nodeAt (s, name) {
  // The same spot (the same block, 12/16 of height) is one node: never merged across a wall.
  let i = nodes.findIndex(n => n.x === s[0] && n.z === s[1] && Math.abs(n.f - s[2]) <= 12)
  if (i < 0) { nodes.push({ x: s[0], z: s[1], f: s[2], name: '' }); i = nodes.length - 1 }
  if (name && !nodes[i].name) nodes[i].name = name
  return i
}
const link = (a, b) => { if (a !== b) links.add(a < b ? `${a}-${b}` : `${b}-${a}`) }
const report = []
for (const route of ROUTES) {
  for (let r = 0; r < route.length - 1; r++) {
    const an = route[r], bn = route[r + 1]
    const pa = pt(an), pb = pt(bn)
    const sa = spotNear(pa[0], pa[1], pa[2]), sb = spotNear(pb[0], pb[1], pb[2])
    const label = `${Array.isArray(an) ? an.join(',') : an} -> ${Array.isArray(bn) ? bn.join(',') : bn}`
    if (!sa || !sb) { report.push(`SKIP ${label}: no standing spot near ${!sa ? 'the start' : 'the end'}`); continue }
    const w = walk(sa, sb)
    if (!w) { report.push(`SKIP ${label}: no walk between them`); continue }
    const flat = Math.hypot(sb[0] - sa[0], sb[1] - sa[1])
    const cs = corners(w)
    report.push(`ok   ${label}: ${w.path.length} steps, ${cs.length} corners${w.cost > flat * 2.5 + 20 ? ` (a long way round: ${Math.round(w.cost)} for ${Math.round(flat)} straight)` : ''}`)
    const nameOf = v => typeof v === 'string' ? v : CELLNAMES.get(v) || ''
    let last = nodeAt(cs[0], nameOf(an))
    for (let i = 1; i < cs.length; i++) {
      const id = nodeAt(cs[i], i === cs.length - 1 ? nameOf(bn) : '')
      link(last, id)
      last = id
    }
  }
}
// T-junctions: a node lying on another link (within 0.8 blocks, the same height) splits it, so the routes join there.
const pos = n => [n.x + 0.5, n.f / 16, n.z + 0.5]
for (let changed = true; changed;) {
  changed = false
  for (const l of [...links]) {
    const [a, b] = l.split('-').map(Number), A = pos(nodes[a]), Bp = pos(nodes[b])
    for (let i = 0; i < nodes.length && !changed; i++) {
      if (i === a || i === b) continue
      const p = pos(nodes[i])
      const vx = Bp[0] - A[0], vy = Bp[1] - A[1], vz = Bp[2] - A[2], L2 = vx * vx + vy * vy + vz * vz
      const t = L2 ? ((p[0] - A[0]) * vx + (p[1] - A[1]) * vy + (p[2] - A[2]) * vz) / L2 : 0
      if (t <= 0.02 || t >= 0.98) continue
      if (Math.hypot(A[0] + t * vx - p[0], A[1] + t * vy - p[1], A[2] + t * vz - p[2]) > 0.8) continue
      links.delete(l); link(a, i); link(i, b); changed = true
    }
    if (changed) break
  }
}

// ---- the lines -----------------------------------------------------------------------------------------------------------
const num = v => String(Math.round(v * 100) / 100)
// Ids: a node at the same spot as in the file written last time keeps its id (2026-10-21: the punch box moved and its walk
// lost two corners, which renumbered everything after it, LOT_EXIT 187 among them, which the town's GPS file links to);
// new spots get ids after the highest old one. --renumber starts from 1 again.
const spotKey = n => `${n.x + 0.5}|${num(n.f / 16)}|${n.z + 0.5}`
const oldIds = new Map()
if (!process.argv.includes('--renumber') && fs.existsSync(OUT)) {
  for (const m of fs.readFileSync(OUT, 'utf8').matchAll(/^dphone path addat \S+ (\S+) (\S+) (\S+) id=(\d+)/gm)) oldIds.set(`${m[1]}|${m[2]}|${m[3]}`, Number(m[4]))
}
const idOf = new Array(nodes.length)
const usedIds = new Set()
nodes.forEach((n, i) => { const o = oldIds.get(spotKey(n)); if (o && !usedIds.has(o)) { idOf[i] = o; usedIds.add(o) } })
let nextFree = Math.max(0, ...oldIds.values())
nodes.forEach((n, i) => { if (!idOf[i]) { while (usedIds.has(++nextFree)); idOf[i] = nextFree; usedIds.add(nextFree) } })
const lines = [
  `# The prison's GPS paths (${nodes.length} nodes, ${links.size} links), made by tools/make-jail-gps-paths.js from tools/build/jail.js.`,
  '# Run every line that isn\'t a comment, in order (local: tools\\rcon.ps1; Minehut: the console, or upload the paths.yml they make).',
  `dphone path clear ${WORLD} confirm`
]
const order = nodes.map((n, i) => i).sort((a, b) => idOf[a] - idOf[b])
for (const i of order) { const n = nodes[i]; lines.push(`dphone path addat ${WORLD} ${n.x + 0.5} ${num(n.f / 16)} ${n.z + 0.5} id=${idOf[i]} nolink${n.name ? ' ' + n.name : ''}`) }
for (const [a, b] of [...links].map(l => l.split('-').map(Number)).map(([a, b]) => [Math.min(idOf[a], idOf[b]), Math.max(idOf[a], idOf[b])]).sort((p, q) => p[0] - q[0] || p[1] - q[1])) {
  lines.push(`dphone path link ${a} ${b}`)
}
fs.writeFileSync(OUT, lines.join('\n') + '\n')
for (const r of report) console.log(r)
console.log(`wrote ${OUT}: ${nodes.length} nodes, ${links.size} links`)

// ---- --check: every node against the real world over RCON (the paste may differ from the build) ------------------------
if (process.argv.includes('--check')) {
  (async () => {
    const rcon = await require('../bots/rcon').connect()
    const bad = []
    for (const [i, n] of nodes.entries()) {
      const y = n.f / 16, by = Math.ceil(y) - 1 // the block the feet stand on (a slab's own block when y is x.5)
      const feet = Math.floor(y), x = n.x, z = n.z
      // The build as pasted (doors closed, breaches standing), not the opened model.
      const want = (yy) => (B.get(x, yy, z) ?? defaultBlock(yy)).replace(/\[.*$/, '').replace(/^minecraft:/, '')
      const test = async (yy, w) => /passed/i.test(await rcon.cmd(`execute in minecraft:${WORLD} if block ${x} ${yy} ${z} ${w}`))
      // The world has what the build says under, at and above the feet (doors are closed in the world: any door counts).
      for (const yy of [by, feet, feet + 1]) {
        const w = want(yy)
        const ok = /_door$|_trapdoor$/.test(w) ? await test(yy, `#minecraft:doors`) || await test(yy, `#minecraft:trapdoors`) || await test(yy, 'minecraft:air') : await test(yy, w)
        if (!ok) bad.push(`#${idOf[i]} at ${x} ${yy} ${z}: the build says ${w}`)
      }
    }
    rcon.close()
    console.log(bad.length ? `CHECK ${bad.length} differences:\n${bad.join('\n')}` : `CHECK every node's blocks match the world (${nodes.length} nodes)`)
  })().catch(e => { console.error(e); process.exit(1) })
}
