'use strict'
// Rising City, the three heists east of the prison (2026-10-28; tools/build/city/PLAN.md). A mirror of town.js: each
// module in tools/build/city/ runs into its own Build, then they're merged (a module only writes the columns COMMON's
// ownerOf gives it). A module whose file doesn't exist yet is skipped with a warning. CITY_ONLY=a,b limits every
// command to those modules (CITY_DIR=<dir> reads the modules from another folder: tests only).
//   node tools/build/city.js                              -> blocks per module (against PLAN 9.1's budget) and the bounds
//   node tools/build/city.js check [--registry <blocks.json>]
//                                                         -> the offline checks (PLAN 9.3); exits 1 on a failure. The
//                                                            registry is the server's reports/blocks.json or the 26.1
//                                                            blocks.json of bots/node_modules/minecraft-data
//   node tools/build/city.js setup [--world jailbreak|world]
//                                                         -> section 7's lines, tagged (G) / (C) / (L), notes stripped
//   node tools/build/city.js gps [--world W] [--out <file>] -> the GPS path lines (default tools/city-gps-paths.txt)
// These change the world (only with the owner's OK; never while another workflow tests on the server):
//   node tools/build/city.js paste [--world W] [--box x1,z1,x2,z2[;...]]   (wall-mounted blocks go in a city_late pass)
//   node tools/build/city.js labels [--world W]           -> the text displays (tag city_label), old ones removed first
//   node tools/build/city.js displays [--world W]         -> the item displays (tag city_display), old ones removed first
// Also a build.js for tools/build/render.js (module.exports.build).
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Build, place, parseState } = require('./mcstruct')

const MODULES = ['streets', 'jewelry', 'bank', 'casino']
const BUDGET = { streets: 250000, jewelry: 70000, bank: 90000, casino: 200000 } // PLAN 9.1
const PLAN_DIR = path.join(__dirname, 'city')
const DIR = process.env.CITY_DIR ? path.resolve(process.env.CITY_DIR) : PLAN_DIR
const ROOT = path.join(__dirname, '..', '..')
const PRISON_GPS = new Set([1002]) // the prison's JUNCTION (tools/jail-gps-paths.txt): the city's first link starts there

const only = (process.env.CITY_ONLY || '').split(',').map(s => s.trim()).filter(Boolean)
const HAVE = MODULES.filter(m => (!only.length || only.includes(m)) && fs.existsSync(path.join(DIR, `${m}.js`)))
const present = () => HAVE
const missing = () => MODULES.filter(m => (!only.length || only.includes(m)) && !HAVE.includes(m))
const mod = m => require(path.join(DIR, `${m}.js`))
let warned = false
const warnMissing = () => { if (!warned && missing().length) { warned = true; console.warn(`city: not built yet (skipped): ${missing().join(', ')}`) } }

// ---- COMMON: plan-layout.js holds the source of truth (PLAN section 8); every module carries the same copy ---------------
const E = '// ---- end COMMON ----'
const commonOf = src => { src = src.replace(/\r/g, ''); const a = src.indexOf('// ---- COMMON'), b = src.indexOf(E); return a < 0 || b < 0 ? null : src.slice(a, b + E.length) }
const commonHash = s => crypto.createHash('md5').update(s).digest('hex').slice(0, 8)
let COMMON = null
function common () {
  if (COMMON) return COMMON
  const src = commonOf(fs.readFileSync(path.join(PLAN_DIR, 'plan-layout.js'), 'utf8'))
  if (!src) throw new Error('tools/build/city/plan-layout.js has no COMMON block')
  const names = ['ownerOf', 'inBox', 'streetCell', 'CITY', 'BOX', 'REGION', 'KEEP_FREE', 'BUILDINGS', 'WORLD', 'GROUND_Y', 'LABEL_TAG', 'DISPLAY_TAG']
  // eslint-disable-next-line no-new-func
  COMMON = new Function(`${src}\nreturn { ${names.join(', ')} }`)()
  COMMON.src = src
  return COMMON
}

// ---- the build ---------------------------------------------------------------------------------------------------------
const xyz = k => k.split(',').map(Number)
function buildEach () {
  warnMissing()
  const out = []
  for (const m of present()) {
    const t0 = Date.now()
    const b = new Build()
    mod(m)(b)
    out.push({ m, b, ms: Date.now() - t0 })
  }
  return out
}
function build () {
  warnMissing()
  const b = new Build()
  for (const m of present()) mod(m)(b)
  return b
}
const gather = key => present().flatMap(m => mod(m)[key] || [])
const labels = () => gather('labels')
const displays = () => { build(); return gather('displays') } // a module may fill its list while it builds
function points () {
  const all = {}
  for (const m of present()) for (const [k, v] of Object.entries(mod(m).points || {})) {
    if (all[k] && all[k].join() !== v.join()) throw new Error(`point ${k} differs between modules`)
    all[k] = v
  }
  return all
}
const SETUP_KEYS = ['regions', 'heists', 'keepers', 'givers', 'crates', 'carSpots', 'chops', 'garages', 'pois', 'walls', 'holos', 'bikes']
function setup () {
  const s = Object.fromEntries(SETUP_KEYS.map(k => [k, []])) // and any other key a module adds (e.g. phone)
  for (const m of present()) for (const [k, list] of Object.entries(mod(m).setup || {})) for (const v of Array.isArray(list) ? list : [list]) (s[k] = s[k] || []).push({ v, module: m })
  return s
}
function gps () {
  const nodes = [], links = []
  for (const m of present()) { const g = mod(m).gps; if (!g) continue; nodes.push(...(g.nodes || [])); links.push(...(g.links || [])) }
  return { nodes, links }
}
module.exports = { build, labels, displays, points, setup, gps, MODULES, check: o => check(o || {}), setupLines: W => setupLines(W) }

// ---- setup lines: a module's setup entries as { tag, cmd } ------------------------------------------------------------------
// An entry is a line "(G) /dheist create bank 3   # a note", an array of them, { lines: [...] }, { tag, cmd } or a region
// { id, box: [x1, y1, z1, x2, y2, z2], flags, launch } (written out as section 7.1's lines). `#` starts a note.
const noteless = s => s.replace(/#.*$/, '').trim()
const defTag = c => c.startsWith('/') ? '(G)' : '(C)'
function linesOf (v) {
  if (v == null) return []
  if (Array.isArray(v)) return v.flatMap(linesOf)
  if (typeof v === 'string') {
    const m = /^\s*\(([GCL])\)\s*(.*)$/.exec(v)
    const cmd = noteless(m ? m[2] : v)
    return cmd ? [{ tag: m ? `(${m[1]})` : defTag(cmd), cmd }] : []
  }
  if (v.lines) return linesOf(v.lines)
  if (v.cmd || v.line) { const cmd = noteless(v.cmd || v.line); return cmd ? [{ tag: v.tag ? `(${String(v.tag).replace(/[()]/g, '')})` : defTag(cmd), cmd }] : [] }
  if (v.id && v.box) {
    const b = v.box, t = v.launch ? '(L)' : '(G)'
    const L = [{ tag: t, cmd: `//pos1 ${b[0]},${b[1]},${b[2]}` }, { tag: t, cmd: `//pos2 ${b[3]},${b[4]},${b[5]}` }, { tag: t, cmd: `/rg define ${v.id}` }]
    const flags = Array.isArray(v.flags) ? v.flags.map(s => s.split(' ')) : Object.entries(v.flags || { passthrough: 'allow' })
    for (const [k, val] of flags) L.push({ tag: '(C)', cmd: `rg flag -w ${v.launch ? 'world' : 'W'} ${v.id} ${k} ${val}` })
    return L
  }
  return []
}
// the world's name where a line names one: the token W or jailbreak (-w W, spotat world, ... 0 jailbreak), {W}
const inWorld = (cmd, W) => cmd.replace(/\{W\}/g, W).replace(/(^| )(W|jailbreak)(?= |$)/g, `$1${W}`)
// every key's lines; an entry with launch: true goes to the launch group whole (its (C) flag lines too)
const allLines = () => { const S = setup(); return Object.fromEntries(Object.keys(S).map(k => [k, S[k].flatMap(e => linesOf(e.v).map(l => ({ ...l, module: e.module, launch: !!(e.v && e.v.launch) })))])) }

// City-wide lines no module owns (sections 7.1 and 7.6), added only when no module's setup has them.
const CITYWIDE = {
  regions: [['district_rising_city', ['(L) //pos1 481,44,226', '(L) //pos2 940,110,470', '(L) /rg define district_rising_city',
    '(C) rg flag -w world district_rising_city passthrough allow', '(L) /ddistrict name rising_city Rising City']]],
  pois: [['dpoi add landmark', ['(L) /minecraft:tp @s 810.5 65 430.5 0 0', '(L) /dpoi add landmark Rising City']],
    ['dphone city scan', ['(C) dphone city scan -40 -30 940 1300 0 W']]]
}
// Section 7.7's order: regions, heists, bikes, the rest, the phone scan; every (L) line (and the district) at the end.
const ORDER = ['regions', 'heists', 'bikes', 'keepers', 'givers', 'crates', 'carSpots', 'chops', 'garages', 'walls', 'holos', 'pois']
function setupLines (W) {
  const A = allLines(), now = [], launch = []
  const has = s => Object.values(A).some(ls => ls.some(l => l.cmd.includes(s)))
  const put = (l, toLaunch) => (toLaunch || l.launch || l.tag === '(L)' ? launch : now).push(`${l.tag} ${inWorld(l.cmd, W)}`)
  const keys = [...ORDER.slice(0, -1), ...Object.keys(A).filter(k => !ORDER.includes(k)), 'pois']
  for (const k of keys) {
    for (const l of A[k] || []) put(l, false)
    for (const [needle, lines] of CITYWIDE[k] || []) if (!has(needle)) for (const l of linesOf(lines)) put(l, needle === 'district_rising_city')
  }
  return [...now, ...launch]
}

// Section 7's commands parsed for the checks: heists with their exit, gates, piles, traps, cops; regions; bikes.
const num = s => Number(s)
const kv = toks => Object.fromEntries(toks.filter(t => t.includes('=')).map(t => { const i = t.indexOf('='); return [t.slice(0, i), t.slice(i + 1)] }))
function parseSetup () {
  const A = allLines(), lines = Object.values(A).flat()
  const regions = [], heists = new Map(), bikes = [], bad = []
  let pos1 = null, pos2 = null
  const H = id => { if (!heists.has(id)) heists.set(id, { id, gates: [], piles: [], traps: [], cops: [], locks: [], exit: null, holo: null, module: null }); return heists.get(id) }
  for (const { cmd, module } of lines) {
    const t = cmd.replace(/^\/+/, m => m.length === 2 ? '//' : '').split(/\s+/)
    const c = t[0].replace(/^\//, '')
    try {
      if (c === '/pos1' || c === '/pos2') { const p = t[1].split(',').map(num); if (c === '/pos1') pos1 = p; else pos2 = p }
      else if (c === 'rg' && t[1] === 'define') {
        if (!pos1 || !pos2) bad.push(`${module}: /rg define ${t[2]} without //pos1 and //pos2`)
        else regions.push({ id: t[2], box: [Math.min(pos1[0], pos2[0]), Math.min(pos1[1], pos2[1]), Math.min(pos1[2], pos2[2]), Math.max(pos1[0], pos2[0]), Math.max(pos1[1], pos2[1]), Math.max(pos1[2], pos2[2])], module })
        pos1 = pos2 = null
      } else if (c === 'dheist' && t[1] === 'create') { const h = H(t[2]); h.module = module; h.difficulty = num(t[3]) }
      else if (c === 'dheist' && t[1] === 'exit') H(t[2]).exit = t.slice(3, 7).map(num)
      else if (c === 'dheist' && t[1] === 'holo') H(t[2]).holo = t.slice(3, 6).map(num)
      else if (c === 'dheist' && t[1] === 'lock') H(t[2]).locks.push(t.slice(4, 10).map(num))
      else if (c === 'dloot' && t[1] === 'add') {
        const h = H(t[2]), kind = t[3], cells = t.slice(4, 10).map(num), o = kv(t.slice(10))
        if (cells.some(Number.isNaN)) throw new Error('bad corners')
        const box = [Math.min(cells[0], cells[3]), Math.min(cells[1], cells[4]), Math.min(cells[2], cells[5]), Math.max(cells[0], cells[3]), Math.max(cells[1], cells[4]), Math.max(cells[2], cells[5])]
        if (kind === 'pile') h.piles.push({ box, o, name: o.name || `P${h.piles.length + 1}`, n: h.piles.length + 1 })
        else h.gates.push({ kind, box, o, n: h.gates.length + 1 })
      } else if (c === 'dtrap' && t[1] === 'add') {
        const h = H(t[2]), kind = t[3], o = kv(t.slice(4)), n = h.traps.length + 1, nums = t.slice(4).filter(s => !s.includes('=')).map(num)
        if (nums.some(Number.isNaN)) throw new Error('bad numbers')
        if (kind === 'laser') h.traps.push({ kind, n, a: nums.slice(0, 3), b: nums.slice(3, 6), o })
        else if (kind === 'plate') h.traps.push({ kind, n, a: nums.slice(0, 3), o })
        else if (kind === 'floor') h.traps.push({ kind, n, a: nums.slice(0, 3), b: nums.slice(3, 6), o })
        else if (kind === 'camera') h.traps.push({ kind, n, a: nums.slice(0, 3), yaw: nums[3], pitch: nums[4], o })
        else throw new Error(`unknown trap kind ${kind}`)
      } else if (c === 'dcops' && t[2] === 'add') H(t[1]).cops.push(t.slice(3, 6).map(num))
      else if (c === 'dbike' && t[1] === 'spotat') bikes.push({ at: t.slice(3, 7).map(num), module })
    } catch (e) { bad.push(`${module}: ${cmd}: ${e.message}`) }
  }
  return { regions, heists: [...heists.values()], bikes, bad }
}

// ---- check (PLAN 9.3) ------------------------------------------------------------------------------------------------------
const AIRISH = /^(air|cave_air|void_air|light|short_grass|tall_grass|fern|large_fern|dead_bush|poppy|dandelion|cornflower|oxeye_daisy|allium|azure_bluet|orange_tulip|red_tulip|white_tulip|pink_tulip|lily_of_the_valley|wildflowers|seagrass|tall_seagrass|lily_pad|.*_carpet|.*_pressure_plate|.*_button|tripwire_hook|ladder|redstone_wire|rail|snow)$/
const GRAVITY = /^(sand|red_sand|gravel|suspicious_sand|suspicious_gravel|.*_concrete_powder|anvil|dragon_egg|pointed_dripstone)$/
const THIN = /(_slab|_trapdoor|glass|_pane|iron_bars|_fence|_wall$|_stairs|_door|chain|end_rod|lantern|_button|_carpet|ladder|_sign|tripwire|lever|rail|torch|leaves|water|barrier)$/
const ROAD = /^(black|gray|white|yellow)_concrete(_powder)?$/ // the GPS's road blocks (section 9.2's open-sky rule)
const nameOf = s => s.replace(/^minecraft:/, '').replace(/\[.*$/, '')
const worldAt = y => y === 64 ? 'grass_block' : y >= 61 && y <= 63 ? 'dirt' : y <= 60 ? 'stone' : 'air' // the jailbreak world's flat ground
const inB = (p, b) => p[0] >= b[0] && p[0] < b[3] + 1 && p[1] >= b[1] && p[1] < b[4] + 1 && p[2] >= b[2] && p[2] < b[5] + 1
const blockIn = (x, y, z, b) => x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && z >= b[2] && z <= b[5]
const boxesTouch = (a, b) => a[0] <= b[3] + 1 && b[0] <= a[3] + 1 && a[1] <= b[4] + 1 && b[1] <= a[4] + 1 && a[2] <= b[5] + 1 && b[2] <= a[5] + 1
const vol = b => (b[3] - b[0] + 1) * (b[4] - b[1] + 1) * (b[5] - b[2] + 1)
const cellsOf = (b, fn) => { for (let x = b[0]; x <= b[3]; x++) for (let y = b[1]; y <= b[4]; y++) for (let z = b[2]; z <= b[5]; z++) fn(x, y, z) }
const p3 = p => p.slice(0, 3).join(' ')

// The registry: the server's reports/blocks.json ({ "minecraft:x": { properties } }) or minecraft-data's blocks.json array.
function loadRegistry (file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!Array.isArray(raw)) return raw
  const out = {}
  for (const b of raw) {
    const props = {}
    for (const s of b.states || []) props[s.name] = s.type === 'bool' ? ['true', 'false'] : (s.values || []).map(String)
    out[`minecraft:${b.name}`] = { properties: Object.keys(props).length ? props : undefined }
  }
  return out
}

// A camera sees the point when it's within range and the cone's half-angle of any yaw of its sweep (traps.sk trapCameraSees).
function coneHas (cam, p) {
  const angle = Number(cam.o.angle ?? 30), range = Number(cam.o.range ?? 12), sweep = Number(cam.o.sweep ?? 0)
  const v = [p[0] - cam.a[0], p[1] - cam.a[1], p[2] - cam.a[2]], d = Math.hypot(...v)
  if (d > range || d === 0) return false
  const cos = Math.cos(angle * Math.PI / 180), pr = cam.pitch * Math.PI / 180
  const steps = Math.max(1, Math.ceil(sweep))
  for (let i = 0; i <= steps; i++) {
    const yaw = (cam.yaw - sweep / 2 + sweep * i / steps) * Math.PI / 180
    const f = [-Math.sin(yaw) * Math.cos(pr), -Math.sin(pr), Math.cos(yaw) * Math.cos(pr)]
    if ((v[0] * f[0] + v[1] * f[1] + v[2] * f[2]) / d >= cos) return true
  }
  return false
}

function check (opts) {
  const C = common()
  const fails = [], warns = [], infos = []
  const fail = (what, list = []) => fails.push({ what, list })
  const warn = (what, list = []) => warns.push({ what, list })
  const ok = what => infos.push(what)
  const t0 = Date.now()
  if (missing().length) warn(`not built yet (skipped): ${missing().join(', ')}`)

  // 1. COMMON: PLAN.md section 8 = plan-layout.js = every module's copy
  const planSrc = commonOf((/```js\n([\s\S]*?)```/.exec(fs.readFileSync(path.join(PLAN_DIR, 'PLAN.md'), 'utf8').replace(/\r/g, '').split('## 8. COMMON')[1] || '') || [])[1] || '')
  if (planSrc !== C.src) fail('plan-layout.js\'s COMMON differs from PLAN.md section 8')
  const odd = present().filter(m => commonOf(fs.readFileSync(path.join(DIR, `${m}.js`), 'utf8')) !== C.src)
  if (odd.length) fail(`COMMON differs from plan-layout.js's in: ${odd.join(', ')}`)
  else ok(`COMMON identical in plan-layout.js${planSrc === C.src ? ', PLAN.md' : ''} and ${present().length} module(s) (${commonHash(C.src)})`)

  // 2. ownership: every block in its module's own columns, in the city box, never in a kept-free box; the budgets
  const each = buildEach()
  const all = new Map(), owner = new Map()
  for (const { m, b } of each) {
    const stray = [], free = []
    for (const [k, s] of b.blocks) {
      const [x, y, z] = xyz(k), o = C.ownerOf(x, z)
      if (o === 'free') { free.n = (free.n || 0) + 1; if (free.length < 8) free.push(`${k} ${s}`) } else if (o !== m || y < C.CITY.y1 || y > C.CITY.y2) { stray.n = (stray.n || 0) + 1; if (stray.length < 8) stray.push(`${k} ${s} (column of ${o || 'nobody: outside the city'})`) }
      all.set(k, s); owner.set(k, m)
    }
    if (stray.n) fail(`${m}: ${stray.n} block(s) outside its own columns or the city box`, stray)
    if (free.n) fail(`${m}: ${free.n} block(s) in a kept-free box`, free)
    if (b.blocks.size > BUDGET[m]) fail(`${m}: ${b.blocks.size} blocks, over its budget of ${BUDGET[m]}`)
  }
  ok(`${each.map(e => `${e.m} ${e.b.blocks.size}/${BUDGET[e.m] / 1000}K`).join(', ') || 'no modules'}: ${all.size} blocks in all, each in its own columns`)
  const built = (x, z) => { const o = C.ownerOf(x, z); return o && present().includes(o) } // a column whose module exists
  const get = (x, y, z) => all.get(`${x},${y},${z}`)
  const at = (x, y, z) => { const s = get(x, y, z); return s === undefined ? worldAt(y) : s }
  const solidAt = (x, y, z) => !AIRISH.test(nameOf(at(x, y, z))) && nameOf(at(x, y, z)) !== 'water'

  // 3. points
  try { ok(`${Object.keys(points()).length} point names, unique`) } catch (e) { fail(e.message) }

  // 4. regions: the setup's against COMMON's REGION, under 100,000 blocks, apart, off every safe zone, in the city box
  const P = parseSetup()
  for (const b of P.bad) fail(`setup line not understood: ${b}`)
  const regions = [...P.regions]
  for (const [m, box] of Object.entries(C.REGION)) {
    const id = `heist_${m}`, r = regions.find(q => q.id === id)
    if (!r) { if (present().includes(m)) fail(`${m}: its setup defines no region ${id}`); regions.push({ id, box, module: 'COMMON' }) } else if (r.box.join() !== box.join()) fail(`${id}: the setup's box ${r.box.join(' ')} isn't COMMON's ${box.join(' ')}`)
  }
  const ids = new Set()
  for (const r of regions) { if (ids.has(r.id)) fail(`region ${r.id} defined twice`); ids.add(r.id) }
  let safes = regions.filter(r => /^safe/.test(r.id))
  try { safes = safes.concat(require('./town.js').setup().regions.filter(r => /^safe/.test(r.id)).map(r => ({ id: r.id, box: r.box }))) } catch (e) { warn(`the town's safe zones didn't load (${e.message})`) }
  const heistRegions = regions.filter(r => /^heist_/.test(r.id))
  for (let i = 0; i < heistRegions.length; i++) {
    const a = heistRegions[i], b = a.box
    if (vol(b) >= 100000) fail(`${a.id}: ${vol(b)} blocks (a room reset over 100,000 is too slow)`)
    if (b[0] < C.CITY.x1 || b[3] > C.CITY.x2 || b[2] < C.CITY.z1 || b[5] > C.CITY.z2 || b[1] < C.CITY.y1 || b[4] > C.CITY.y2) fail(`${a.id} leaves the city box: ${b.join(' ')}`)
    for (const s of safes) if (boxesTouch(b, s.box)) fail(`${a.id} touches the safe zone ${s.id}`)
    for (let j = i + 1; j < heistRegions.length; j++) if (boxesTouch(b, heistRegions[j].box)) fail(`${a.id} and ${heistRegions[j].id} overlap or touch`)
  }
  ok(`regions: ${heistRegions.map(r => `${r.id} ${vol(r.box)}`).join(', ')}; ${safes.length} safe zone(s) checked, none touched`)

  // 5. exits, cop spots, bikes outside every heist region and safe zone; exits standing room
  const inHeist = p => heistRegions.find(r => inB(p, r.box)) || safes.find(r => inB(p, r.box))
  const standOk = (p, what) => {
    const x = Math.floor(p[0]), y = Math.floor(p[1]), z = Math.floor(p[2])
    if (!built(x, z)) return
    const bad = []
    if (solidAt(x, y, z)) bad.push(`feet in ${at(x, y, z)}`)
    if (solidAt(x, y + 1, z)) bad.push(`head in ${at(x, y + 1, z)}`)
    if (!solidAt(x, y - 1, z) && !/slab|stairs/.test(at(x, y, z))) bad.push(`nothing under the feet (${at(x, y - 1, z)})`)
    if (bad.length) fail(`${what} at ${p3(p)}: ${bad.join(', ')}`)
  }
  let spots = 0
  for (const h of P.heists) {
    if (!h.exit) fail(`heist ${h.id}: no /dheist exit`)
    for (const [what, p] of [...(h.exit ? [['exit', h.exit]] : []), ...h.cops.map((c, i) => [`cop spot C${i + 1}`, c])]) {
      spots++
      const r = inHeist(p)
      if (r) fail(`heist ${h.id}: its ${what} ${p3(p)} is inside ${r.id}`)
      standOk(p, `heist ${h.id} ${what}`)
    }
  }
  for (const b of P.bikes) {
    spots++
    const r = inHeist(b.at)
    if (r) fail(`bike ${p3(b.at)} (${b.module}) is inside ${r.id}`)
    if (b.at[0] % 1 !== 0.5 || b.at[2] % 1 !== 0.5) fail(`bike ${p3(b.at)} (${b.module}) isn't on a block centre`)
    standOk(b.at, `bike (${b.module})`)
  }
  ok(`${P.heists.length} heist(s) (${P.heists.map(h => h.id).join(', ') || 'none'}): ${spots} exit, cop and bike spot(s) outside every region`)

  // 6. loot: piles solid with 2 air above, apart; gates solid and at most 27 blocks; smash gates glass
  let nLoot = 0
  for (const h of P.heists) {
    const reg = heistRegions.find(r => r.id === `heist_${h.id}`)
    if (!reg) { fail(`heist ${h.id}: no region heist_${h.id}`); continue }
    const piled = new Map()
    for (const p of h.piles) {
      nLoot++
      if (p.o.behind && !(Number(p.o.behind) >= 1 && Number(p.o.behind) <= h.gates.length)) fail(`heist ${h.id} pile ${p.name}: behind=${p.o.behind}, but there are ${h.gates.length} gate(s)`)
      const what = `heist ${h.id} pile P${p.n} ${p.name} (${p.box.join(' ')})`, under = [], over = []
      cellsOf(p.box, (x, y, z) => {
        const k = `${x},${y},${z}`
        if (piled.has(k)) fail(`heist ${h.id}: piles ${piled.get(k)} and ${p.name} share ${x} ${y} ${z}`)
        piled.set(k, p.name)
        if (!blockIn(x, y, z, reg.box)) fail(`${what}: ${x} ${y} ${z} outside ${reg.id}`)
        if (!built(x, z)) return
        if (!solidAt(x, y, z)) under.push(`${x} ${y} ${z} ${at(x, y, z)}`)
        if (solidAt(x, y + 1, z) || solidAt(x, y + 2, z)) over.push(`${x} ${y} ${z}: ${at(x, y + 1, z)}, ${at(x, y + 2, z)} above`)
      })
      if (under.length) fail(`${what}: ${under.length} cell(s) with no solid block for the loot to lie on`, under)
      if (over.length) fail(`${what}: ${over.length} cell(s) without 2 air above`, over)
    }
    for (const g of h.gates) {
      nLoot++
      const what = `heist ${h.id} gate G${g.n} (${g.kind})`
      if (vol(g.box) > 27) fail(`${what}: ${vol(g.box)} blocks (27 at most)`)
      const notSolid = [], notGlass = []
      cellsOf(g.box, (x, y, z) => {
        if (!blockIn(x, y, z, reg.box)) fail(`${what}: ${x} ${y} ${z} outside ${reg.id}`)
        if (!built(x, z)) return
        if (!solidAt(x, y, z)) notSolid.push(`${x} ${y} ${z} ${at(x, y, z)}`)
        else if (g.kind === 'smash' && !/glass$/.test(nameOf(at(x, y, z)))) notGlass.push(`${x} ${y} ${z} ${at(x, y, z)}`)
      })
      if (notSolid.length) fail(`${what}: ${notSolid.length} cell(s) not solid`, notSolid)
      if (notGlass.length) fail(`${what}: a smash gate must be full glass`, notGlass)
    }
  }
  ok(`loot: ${nLoot} gate(s) and pile(s) checked`)

  // 7. traps: 2 blocks inside their region; floor pits 2+ deep, inside, open under the floor; no camera cone on a safe or drill gate;
  // a laser no longer than core.sk's trap::laser::max-length (/dtrap refuses it)
  let nTraps = 0
  const maxLaser = Number(/\{-cfg::trap::laser::max-length\} to (\d+(?:\.\d+)?)/.exec(fs.readFileSync(path.join(ROOT, 'server', 'plugins', 'Skript', 'scripts', 'core.sk'), 'utf8'))[1])
  for (const h of P.heists) {
    const reg = heistRegions.find(r => r.id === `heist_${h.id}`)
    if (!reg) continue
    const b = reg.box
    const pointIn = p => Math.min(p[0] - b[0], p[1] - b[1], p[2] - b[2], b[3] + 1 - p[0], b[4] + 1 - p[1], b[5] + 1 - p[2]) // a decimal point
    const blockInset = p => Math.min(p[0] - b[0], p[1] - b[1], p[2] - b[2], b[3] - p[0], b[4] - p[1], b[5] - p[2]) // a block
    const locked = h.gates.filter(g => g.kind === 'safe' || g.kind === 'drill')
    for (const t of h.traps) {
      nTraps++
      const what = `heist ${h.id} trap T${t.n} (${t.kind})`
      const blocky = t.kind === 'plate' || t.kind === 'floor'
      for (const p of [t.a, t.b].filter(Boolean)) {
        const d = blocky ? blockInset(p) : pointIn(p)
        if (d < 2) fail(`${what}: ${p3(p)} is ${d} from ${reg.id}'s edge (2 at least)`)
      }
      if (t.kind === 'laser' && t.b && Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1], t.b[2] - t.a[2]) > maxLaser) fail(`${what}: ${Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1], t.b[2] - t.a[2])} long, over core.sk's laser max-length ${maxLaser}`)
      if (t.kind === 'floor') {
        const depth = Number(t.o.depth ?? 4), fb = [Math.min(t.a[0], t.b[0]), Math.min(t.a[1], t.b[1]), Math.min(t.a[2], t.b[2]), Math.max(t.a[0], t.b[0]), Math.max(t.a[1], t.b[1]), Math.max(t.a[2], t.b[2])]
        if (depth < 2) fail(`${what}: its pit is ${depth} deep (2 at least)`)
        if (fb[1] - depth < b[1]) fail(`${what}: its pit reaches y ${fb[1] - depth}, under ${reg.id} (y ${b[1]})`)
        const filled = []
        cellsOf([fb[0], fb[1] - depth, fb[2], fb[3], fb[1] - 1, fb[5]], (x, y, z) => { if (built(x, z) && solidAt(x, y, z)) filled.push(`${x} ${y} ${z} ${at(x, y, z)}`) })
        if (filled.length) fail(`${what}: its pit isn't open`, filled)
      }
      if (t.kind === 'camera') {
        const seen = []
        for (const g of locked) cellsOf(g.box, (x, y, z) => {
          for (const dx of [0, 0.5, 1]) for (const dy of [0, 0.5, 1]) for (const dz of [0, 0.5, 1]) if (coneHas(t, [x + dx, y + dy, z + dz])) { if (!seen.includes(`G${g.n}`)) seen.push(`G${g.n}`); return }
        })
        if (seen.length) fail(`${what} at ${p3(t.a)}: its cone (angle ${t.o.angle ?? 30}, range ${t.o.range ?? 12}, sweep ${t.o.sweep ?? 0}) contains ${seen.join(', ')} (rule 2.1)`)
      }
    }
  }
  ok(`traps: ${nTraps} checked (inset, pits, camera cones)`)

  // 8. the open-sky rule: no column's top block at y 62..71 is a road block outside a street cell
  const tops = new Map()
  for (const [k, s] of all) { const [x, y, z] = xyz(k); if (AIRISH.test(nameOf(s))) continue; const c = `${x},${z}`, o = tops.get(c); if (!o || y > o[0]) tops.set(c, [y, s]) }
  const roads = []
  for (const [c, [y, s]] of tops) {
    if (y < 62 || y > 71 || !ROAD.test(nameOf(s))) continue
    const [x, z] = c.split(',').map(Number)
    if (C.ownerOf(x, z) === 'streets' && C.streetCell(x, z)) continue
    roads.n = (roads.n || 0) + 1; if (roads.length < 10) roads.push(`${x} ${y} ${z} ${s} (${owner.get(`${x},${y},${z}`)})`)
  }
  if (roads.n) fail(`${roads.n} open-sky road block(s) at y 62..71 outside a street cell (the GPS would read a street)`, roads)
  else ok('no open-sky road block at y 62..71 outside a street cell')

  // 9. water and gravity (the build over the world's flat ground)
  const leaks = [], falls = []
  for (const [k, s] of all) {
    const n = nameOf(s), [x, y, z] = xyz(k)
    if (n === 'water' || /waterlogged=true/.test(s)) {
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0]]) {
        const o = at(x + dx, y + dy, z + dz), on = nameOf(o)
        if (on === 'water' || /waterlogged=true/.test(o) || !AIRISH.test(on)) continue
        leaks.n = (leaks.n || 0) + 1; if (leaks.length < 10) leaks.push(`${k} ${n} beside ${x + dx},${y + dy},${z + dz} ${o}`)
      }
    }
    if (GRAVITY.test(n)) { const below = at(x, y - 1, z); if (AIRISH.test(nameOf(below)) || nameOf(below) === 'water') { falls.n = (falls.n || 0) + 1; if (falls.length < 10) falls.push(`${k} ${n} over ${below}`) } }
  }
  if (leaks.n) fail(`${leaks.n} water face(s) that would flow`, leaks)
  if (falls.n) fail(`${falls.n} sand/gravel/powder block(s) over air or water`, falls)
  if (!leaks.n && !falls.n) ok('no water that flows, no sand or powder over air')

  // 10. GPS: ids unique, links to known nodes, no link twice, clear at head height (in built columns)
  const G = gps(), gid = new Map()
  for (const [id, x, y, z, name] of G.nodes) { if (gid.has(id)) fail(`GPS node ${id} defined twice`); gid.set(id, [x, y, z, name]) }
  const seenL = new Set(), blocked = []
  for (const [a, b] of G.links) {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (seenL.has(key)) fail(`GPS link ${key} listed twice`)
    seenL.add(key)
    for (const id of [a, b]) if (!gid.has(id) && !PRISON_GPS.has(id)) fail(`GPS link ${a}-${b}: no node ${id}`)
    if (!gid.has(a) || !gid.has(b)) continue
    const p = gid.get(a), q = gid.get(b), n = Math.ceil(Math.hypot(q[0] - p[0], q[2] - p[2]) * 2)
    for (let i = 1; i < n; i++) {
      const t = i / n, x = Math.floor(p[0] + (q[0] - p[0]) * t), y = Math.floor(p[1] + (q[1] - p[1]) * t + 1.2), z = Math.floor(p[2] + (q[2] - p[2]) * t)
      if (!built(x, z)) continue
      if (solidAt(x, y, z)) { blocked.push(`${a}-${b} at ${x} ${y} ${z}: ${at(x, y, z)}`); break }
    }
  }
  if (blocked.length) fail(`${blocked.length} GPS link(s) through a solid block at head height`, blocked.slice(0, 10))
  else ok(`GPS: ${G.nodes.length} nodes, ${G.links.length} links, every link clear at head height`)

  // 11. labels and displays: in their own cell's air (a label 0.03 off a face; a display not buried)
  const buried = []
  for (const l of labels()) {
    const s = at(Math.floor(l.x), Math.floor(l.y), Math.floor(l.z))
    if (!AIRISH.test(nameOf(s)) && !THIN.test(nameOf(s))) buried.push(`label "${String(l.text).replace(/\n/g, ' / ')}" ${l.x} ${l.y} ${l.z} in ${s}`)
    if (!/^#[0-9a-f]{6}$/i.test(l.color) || !['north', 'south', 'east', 'west', 'up'].includes(l.facing)) fail(`label "${l.text}": bad color or facing`)
  }
  for (const d of displays()) {
    const s = at(Math.floor(d.x), Math.floor(d.y), Math.floor(d.z))
    if (!AIRISH.test(nameOf(s)) && !THIN.test(nameOf(s))) buried.push(`display ${d.item} ${d.x} ${d.y} ${d.z} in ${s}`)
  }
  if (buried.length) warn(`${buried.length} label(s)/display(s) inside a full block`, buried)

  // 12. block states against the 26.1 registry
  if (opts.registry) {
    const reg = loadRegistry(opts.registry)
    const states = new Set(all.values()), bad = []
    for (const s of states) {
      let ps
      try { ps = parseState(s) } catch (e) { bad.push(e.message); continue }
      const r = reg[ps.name]
      if (!r) { bad.push(`unknown block ${ps.name}`); continue }
      for (const [k, v] of Object.entries(ps.props)) if (!r.properties || !r.properties[k] || !r.properties[k].includes(v)) bad.push(`${s}: ${k}=${v}`)
    }
    if (bad.length) fail(`${bad.length} bad block state(s)`, bad.slice(0, 12))
    else ok(`${states.size} block states, all in the registry (${path.basename(path.dirname(opts.registry))}/${path.basename(opts.registry)})`)
  } else warn('block states not checked against the registry (--registry <blocks.json>)')

  console.log(`city check (${present().join(', ') || 'no modules'}) in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  for (const i of infos) console.log(`  ok   ${i}`)
  for (const w of warns) { console.log(`  WARN ${w.what}`); for (const l of w.list.slice(0, 12)) console.log(`         ${l}`) }
  for (const f of fails) { console.log(`  FAIL ${f.what}`); for (const l of f.list.slice(0, 12)) console.log(`         ${l}`) }
  console.log(fails.length ? `${fails.length} failure(s), ${warns.length} warning(s)` : `all checks passed (${warns.length} warning(s))`)
  return fails.length === 0
}

// ---- gps: the path lines (section 7.8) ---------------------------------------------------------------------------------
const f1 = n => String(Math.round(n * 1000) / 1000)
function gpsLines (W) {
  const G = gps()
  const L = [`# Rising City's GPS paths (${G.nodes.length} nodes, ${G.links.length} links), made by \`node tools/build/city.js gps\` from the city modules.`,
    '# Run every line that isn\'t a comment, in order, AFTER tools/jail-gps-paths.txt and the town\'s file: the first link joins',
    '# the prison\'s node 1002 (JUNCTION). The remove lines make a second run safe (an existing id is refused).']
  for (const [id] of G.nodes) L.push(`dphone path remove ${id}`)
  for (const [id, x, y, z, name] of G.nodes) L.push(`dphone path addat ${W} ${f1(x)} ${f1(y)} ${f1(z)} id=${id} nolink${name ? ` ${name}` : ''}`)
  for (const [a, b] of G.links) L.push(`dphone path link ${a} ${b}`)
  return L
}

// ---- RCON: paste, labels, displays (change the world: only with the owner's OK) ---------------------------------------------
const LATE = /(_wall_sign|_wall_hanging_sign|_hanging_sign|_wall_banner|^vine|glow_lichen|_wall_head|_wall_skull|cocoa|^tripwire$)/
function boxed (b, spec) {
  const boxes = spec.split(';').filter(Boolean).map(s => s.split(',').map(Number))
  if (!boxes.length || boxes.some(q => q.length !== 4 || q.some(Number.isNaN))) throw new Error(`bad --box ${spec}: x1,z1,x2,z2[;...]`)
  const out = new Build()
  for (const [k, s] of b.blocks) {
    const [x, , z] = xyz(k)
    if (boxes.some(([x1, z1, x2, z2]) => x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && z >= Math.min(z1, z2) && z <= Math.max(z1, z2))) out.blocks.set(k, s)
  }
  return out
}
async function paste (W, spec) {
  let b = build()
  if (spec) { b = boxed(b, spec); console.log(`--box: ${b.blocks.size} blocks`) }
  const main = new Build(), late = new Build()
  for (const [k, s] of b.blocks) (LATE.test(nameOf(s)) ? late : main).blocks.set(k, s)
  await place(main, { name: 'city', world: W })
  if (late.blocks.size) await place(late, { name: 'city_late', world: W })
}
const YAW = { south: 0, west: 90, north: 180, east: -90, up: 0 }
const snbt = s => [...s].map(c => {
  const code = c.codePointAt(0)
  if (c === '\\' || c === '"') return `\\${c}`
  if (code >= 0x20 && code < 0x7f) return c
  if (code > 0xffff) return `\\U${code.toString(16).padStart(8, '0')}`
  return `\\u${code.toString(16).padStart(4, '0')}`
}).join('')
const fl = n => `${Math.round(n * 1000) / 1000}f`
const labelNbt = l => `{Tags:["${common().LABEL_TAG}"],text:${require('./signfonts').textNbt(l, 'town', snbt)},billboard:"fixed",Rotation:[${fl(YAW[l.facing] ?? 0)},${fl(l.facing === 'up' ? -90 : 0)}],background:0,` +
  (l.brightness ? `brightness:{sky:${l.brightness.sky},block:${l.brightness.block}},` : '') +
  `transformation:{left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f],translation:[0f,0f,0f],scale:[${fl(l.scale)},${fl(l.scale)},${fl(l.scale)}]}}`
function displayNbt (d) {
  const comp = []
  if (typeof d.cmd === 'number') comp.push(`"minecraft:custom_model_data":{floats:[${fl(d.cmd)}]}`)
  else if (typeof d.cmd === 'string' && d.cmd) comp.push(`"minecraft:custom_model_data":{strings:["${snbt(d.cmd)}"]}`)
  if (d.damage !== undefined) comp.push(`"minecraft:damage":${d.damage}`)
  if (d.unbreakable) comp.push('"minecraft:unbreakable":{}')
  const s = d.scale ?? 1
  return `{Tags:["${common().DISPLAY_TAG}"],item:{id:"minecraft:${d.item}",count:1${comp.length ? `,components:{${comp.join(',')}}` : ''}},item_display:"${d.transform || 'none'}",` +
    `Rotation:[${fl(d.yaw || 0)},${fl(d.pitch || 0)}],view_range:${fl(d.viewRange ?? 1)},` +
    (d.brightness ? `brightness:{sky:${d.brightness.sky},block:${d.brightness.block}},` : '') +
    `transformation:{left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f],translation:[0f,0f,0f],scale:[${fl(s)},${fl(s)},${fl(s)}]}}`
}
async function summonAll (W, list, type, tag, nbtOf, what, ifMissing) {
  const rcon = require(path.join(ROOT, 'bots', 'rcon.js'))
  const ex = `execute in minecraft:${W} run`
  const chunks = new Map()
  for (const e of list) chunks.set(`${Math.floor(e.x / 16)},${Math.floor(e.z / 16)}`, [Math.floor(e.x), Math.floor(e.z)])
  const r = await rcon.connect()
  const added = []
  try {
    for (const [k, [x, z]] of chunks) {
      const q = await r.cmd(`${ex} forceload query ${x} ${z}`)
      if (/is not marked/i.test(q)) { await r.cmd(`${ex} forceload add ${x} ${z}`); added.push([x, z]) } else if (!/is marked/i.test(q)) throw new Error(`forceload query ${k}: ${q.trim()}`)
    }
    await new Promise(res => setTimeout(res, 2500))
    if (ifMissing) {
      const now = /count:\s*(\d+)/i.exec(await r.cmd(`${ex} execute if entity @e[type=minecraft:${type},tag=${tag}]`))
      if (now && Number(now[1]) === list.length) { console.log(`all ${list.length} ${what}s are in the world`); return }
      console.log(`${what}s in the world: ${now ? now[1] : 0} of ${list.length}: placing them again`)
    }
    const killed = await r.cmd(`${ex} minecraft:kill @e[type=minecraft:${type},tag=${tag}]`)
    let n = 0
    for (const e of list) {
      let out = ''
      for (let t = 0; t < 40; t++) {
        out = await r.cmd(`${ex} summon minecraft:${type} ${e.x.toFixed(3)} ${e.y.toFixed(3)} ${e.z.toFixed(3)} ${nbtOf(e)}`)
        if (!/not loaded|out of the world/i.test(out)) break
        await new Promise(res => setTimeout(res, 100))
      }
      if (!/summoned/i.test(out)) throw new Error(`${what} ${e.text || e.item} at ${e.x} ${e.y} ${e.z}: ${out.trim()}`)
      n++
    }
    const have = await r.cmd(`${ex} execute if entity @e[type=minecraft:${type},tag=${tag}]`)
    console.log(`removed old ${what}s: ${killed.trim() || '(none)'}`)
    console.log(`placed ${n} ${what}s in ${chunks.size} chunk(s); in the world now: ${have.trim()}`)
    const m = /count:\s*(\d+)/i.exec(have)
    if (!m || Number(m[1]) !== list.length) throw new Error(`expected ${list.length} ${what}s in the world`)
  } finally {
    for (const [x, z] of added) await r.cmd(`${ex} forceload remove ${x} ${z}`)
    r.close()
  }
}

// ---- command line ------------------------------------------------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2)
  const cmd = args[0] && !args[0].startsWith('--') ? args[0] : ''
  const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) }
  const fail = e => { console.error(e.stack || e.message || e); process.exit(1) }
  const W = opt('world', null) || common().WORLD
  try {
    if (!cmd) {
      const each = buildEach()
      let n = 0
      for (const { m, b, ms } of each) { const bd = b.bounds(); n += b.blocks.size; console.log(`${m.padEnd(8)} ${String(b.blocks.size).padStart(8)} / ${String(BUDGET[m]).padStart(6)} blocks  ${bd ? `${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}` : '(none)'}  ${ms} ms`) }
      console.log(`${n} blocks in ${each.length} modules; not built yet: ${missing().join(', ') || 'none'}; ${labels().length} labels, ${displays().length} displays`)
    } else if (cmd === 'check') process.exit(check({ registry: opt('registry', null) }) ? 0 : 1)
    else if (cmd === 'setup') { warnMissing(); console.log(setupLines(W).join('\n')) }
    else if (cmd === 'gps') {
      const file = path.resolve(opt('out', null) || path.join(ROOT, 'tools', 'city-gps-paths.txt'))
      if (!gps().nodes.length) fail('no GPS nodes (the streets module exports them): nothing written')
      const L = gpsLines(W)
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, L.join('\n') + '\n')
      console.log(`wrote ${file} (${L.length} lines)`)
    } else if (cmd === 'paste') paste(W, opt('box', null)).catch(fail)
    else if (cmd === 'labels') summonAll(W, labels(), 'text_display', common().LABEL_TAG, labelNbt, 'label', !!opt('if-missing', false)).catch(fail)
    else if (cmd === 'displays') summonAll(W, displays(), 'item_display', common().DISPLAY_TAG, displayNbt, 'display', !!opt('if-missing', false)).catch(fail)
    else fail(`unknown command ${cmd}: check, setup, gps, paste, labels, displays`)
  } catch (e) { fail(e) }
}
