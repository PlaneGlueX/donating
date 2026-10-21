'use strict'
// Mountainside, the town south of the prison (2026-10-20; tools/build/town/PLAN.md). Each module in tools/build/town/
// runs into its own Build, then they're merged (a module only writes the columns COMMON's ownerOf gives it). A module
// whose file doesn't exist yet is skipped with a note, so the town can be previewed while it grows. TOWN_ONLY=a,b limits
// every command to those modules. Run with node --max-old-space-size=6000 (about 1.3M blocks now, ~1.9M when complete).
//   node tools/build/town.js                              -> blocks per module and the bounds
//   node tools/build/town.js check [--seal] [--registry <blocks.json>]
//                                                         -> the offline checks (PLAN 10.3); exits 1 on a failure
//   node tools/build/town.js render [--out <dir>] [--px <n>] [--views top,planned,descent,main,corner,aerial]
//                                                         -> tools/build/town/renders/town/: from above, street views
//   node tools/build/town.js setup [--world jailbreak|world]
//                                                         -> every setup command (PLAN 8.3), (G) in game / (C) console
//   node tools/build/town.js gps [--world W] [--out <file>] -> the GPS path lines (default tools/build/town/town-gps-paths.txt)
//   node tools/build/town.js biomes [--world W] [--apply] -> the fillbiome lines that turn the river turquoise
// These change the world (only with the owner's OK; never while another workflow tests on the server):
//   node tools/build/town.js paste [--world W] [--box x1,z1,x2,z2[;...]]
//   node tools/build/town.js labels [--world W]           -> the text displays (tag town_label), old ones removed first
//   node tools/build/town.js displays [--world W]         -> the item displays (tag town_display), old ones removed first
// Also a build.js for tools/build/render.js (module.exports.build).
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Build, place, parseState } = require('./mcstruct')

const MODULES = ['approach', 'streets', 'land', 'gunshop', 'donut', 'garage', 'gas', 'shops', 'dealer', 'houses', 'safehouse', 'scrapyard',
  'pawnshop', 'poolhall'] // the last two: PLAN 15.4 and 15.5 (2026-10-21)
const DIR = path.join(__dirname, 'town')
const ROOT = path.join(__dirname, '..', '..')
const PRISON = { x1: -40, z1: -30, x2: 480, z2: 470 } // the prison's box (jail.js): the town never writes in it
const PRISON_GPS = new Set([187]) // the prison's LOT_EXIT (tools/jail-gps-paths.txt): the town's spine starts there

const only = (process.env.TOWN_ONLY || '').split(',').map(s => s.trim()).filter(Boolean)
const HAVE = MODULES.filter(m => (!only.length || only.includes(m)) && fs.existsSync(path.join(DIR, `${m}.js`)))
const present = () => HAVE
const missing = () => MODULES.filter(m => (!only.length || only.includes(m)) && !HAVE.includes(m))
const mod = m => require(path.join(DIR, `${m}.js`))

// ---- COMMON: every module carries the same copy (PLAN section 9); the checks read it from the first module ----------------
const E = '// ---- end COMMON ----'
const commonOf = src => { src = src.replace(/\r/g, ''); const a = src.indexOf('// ---- COMMON'), b = src.indexOf(E); return a < 0 || b < 0 ? null : src.slice(a, b + E.length) }
const commonHash = s => crypto.createHash('md5').update(s).digest('hex').slice(0, 8)
let COMMON = null
function common () {
  if (COMMON) return COMMON
  const files = [...present().map(m => path.join(DIR, `${m}.js`)), path.join(DIR, 'plan-layout.js')]
  const src = commonOf(fs.readFileSync(files[0], 'utf8'))
  const names = ['ownerOf', 'groundTop', 'riverAt', 'inBox', 'inStreet', 'streetCell', 'TOWN', 'TOWN_Z', 'BOX', 'STAIRS', 'TUNNEL',
    'PORTAL_N', 'PORTAL_S', 'WORLD', 'LABEL_TAG', 'DISPLAY_TAG', 'approachLevel', 'WATER_Y']
  // eslint-disable-next-line no-new-func
  COMMON = new Function(`${src}\nreturn { ${names.join(', ')} }`)()
  COMMON.hashes = Object.fromEntries(files.map(f => [path.basename(f, '.js'), commonHash(commonOf(fs.readFileSync(f, 'utf8')) || '')]))
  return COMMON
}

// ---- the build ---------------------------------------------------------------------------------------------------------
const xyz = k => k.split(',').map(Number)
// Every module into its own Build (the checks need them apart).
function buildEach () {
  const out = []
  for (const m of present()) {
    const t0 = Date.now()
    const b = new Build()
    mod(m)(b)
    out.push({ m, b, ms: Date.now() - t0 })
  }
  return out
}
// One Build of every module. Later modules win where two set the same block (check says none should differ).
function build () {
  const b = new Build()
  for (const m of present()) mod(m)(b)
  return b
}
const gather = key => present().flatMap(m => mod(m)[key] || [])
const labels = () => gather('labels')
const displays = () => gather('displays')
const biomes = () => gather('biomes')
function points () {
  const all = {}
  for (const m of present()) for (const [k, v] of Object.entries(mod(m).points || {})) {
    if (all[k] && all[k].join() !== v.join()) throw new Error(`point ${k} differs between modules`)
    all[k] = v
  }
  return all
}
const SETUP_KEYS = ['regions', 'heists', 'keepers', 'givers', 'crates', 'carSpots', 'chops', 'garages', 'pois', 'walls', 'holos', 'pumps']
function setup () {
  const s = Object.fromEntries(SETUP_KEYS.map(k => [k, []]))
  for (const m of present()) for (const k of SETUP_KEYS) for (const v of (mod(m).setup || {})[k] || []) s[k].push({ ...v, module: m })
  return s
}
function gps () {
  const nodes = [], links = []
  for (const m of present()) { const g = mod(m).gps; if (!g) continue; nodes.push(...g.nodes); links.push(...g.links) }
  return { nodes, links }
}
module.exports = { build, labels, displays, points, setup, gps, biomes, MODULES, check: o => check(o || {}) }

// A region's flags as [[flag, value], ...] (modules write { flag: value } or ['flag value']).
const flagList = f => Array.isArray(f) ? f.map(s => s.split(' ')) : Object.entries(f || {})
const inB = (p, b) => p[0] >= b[0] && p[0] < b[3] + 1 && p[1] >= b[1] && p[1] < b[4] + 1 && p[2] >= b[2] && p[2] < b[5] + 1 // a point (x y z, decimals) in a region box (blocks inclusive)
const blockIn = (x, y, z, b) => x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && z >= b[2] && z <= b[5]
const boxesTouch = (a, b) => a[0] <= b[3] + 1 && b[0] <= a[3] + 1 && a[1] <= b[4] + 1 && b[1] <= a[4] + 1 && a[2] <= b[5] + 1 && b[2] <= a[5] + 1
const vol = b => (b[3] - b[0] + 1) * (b[4] - b[1] + 1) * (b[5] - b[2] + 1)

// ---- check (PLAN 10.3) -----------------------------------------------------------------------------------------------------
const AIRISH = /^(air|cave_air|void_air|light|short_grass|tall_grass|fern|large_fern|dead_bush|poppy|dandelion|cornflower|oxeye_daisy|allium|azure_bluet|orange_tulip|red_tulip|white_tulip|pink_tulip|lily_of_the_valley|wildflowers|seagrass|tall_seagrass|lily_pad|.*_carpet|.*_pressure_plate|.*_button|tripwire_hook|ladder|redstone_wire|rail|snow)$/
const GRAVITY = /^(sand|red_sand|gravel|suspicious_sand|suspicious_gravel|.*_concrete_powder|anvil|dragon_egg|pointed_dripstone)$/
// thin or see-through blocks a label or a display may sit in (a slab's free half, a pegboard's trapdoor, a glass case)
const THIN = /(_slab|_trapdoor|glass|_pane|iron_bars|_fence|_wall$|_stairs|_door|chain|end_rod|lantern|_button|_carpet|ladder|_sign|tripwire|lever|rail|torch|leaves|water)$/
const nameOf = s => s.replace(/^minecraft:/, '').replace(/\[.*$/, '')
// A cell's block: the build's, else the jailbreak world's flat default (grass y 64, dirt 61..63, stone below, air above).
const worldAt = y => y === 64 ? 'grass_block' : y >= 61 && y <= 63 ? 'dirt' : y <= 60 ? 'stone' : 'air'

function check (opts) {
  const C = common()
  const fails = [], warns = [], infos = []
  const fail = (what, list = []) => fails.push({ what, list })
  const warn = (what, list = []) => warns.push({ what, list })
  const ok = what => infos.push(what)
  let tl = Date.now()
  const lap = what => { if (process.env.TOWN_TIMING) { console.log(`  [${what}: ${((Date.now() - tl) / 1000).toFixed(1)} s]`); tl = Date.now() } }
  const t0 = Date.now()
  if (missing().length) infos.push(`not built yet (skipped): ${missing().join(', ')}`)

  // 1. COMMON
  const hs = Object.entries(C.hashes), first = hs[0][1]
  const odd = hs.filter(([, h]) => h !== first)
  if (odd.length) fail(`COMMON differs between modules (${hs.map(([m, h]) => `${m} ${h}`).join(', ')})`)
  else ok(`COMMON identical in ${hs.length} files (${first})`)

  // 2-3. ownership, the town box, and no two modules writing the same block differently
  const each = buildEach()
  const all = new Map(), from = new Map()
  let dupSame = 0
  const conflicts = []
  for (let i = 0; i < each.length; i++) {
    const { m, b } = each[i]
    const stray = []
    for (const [k, s] of b.blocks) {
      const [x, y, z] = xyz(k)
      if (C.ownerOf(x, z) !== m || y < C.TOWN.y1 || y > C.TOWN.y2) { if (stray.length < 8) stray.push(`${k} ${s}`); stray.n = (stray.n || 0) + 1 }
      const o = all.get(k)
      if (o === undefined) { all.set(k, s); from.set(k, i); continue }
      if (o === s) { dupSame++; continue }
      conflicts.push(`${k}: ${each[from.get(k)].m} ${o} / ${m} ${s}`)
    }
    if (stray.n) fail(`${m}: ${stray.n} block(s) outside its own columns or the town box`, stray)
  }
  ok(`${each.map(e => `${e.m} ${e.b.blocks.size}`).join(', ')}: ${all.size} blocks in all`)
  if (conflicts.length) fail(`${conflicts.length} block(s) written by two modules with different states`, conflicts.slice(0, 12))
  else ok(`no two modules write the same block differently (${dupSame} written twice with the same state)`)
  const get = (x, y, z) => all.get(`${x},${y},${z}`)
  const at = (x, y, z) => { const s = get(x, y, z); return s === undefined ? worldAt(y) : s }
  const solidAt = (x, y, z) => !AIRISH.test(nameOf(at(x, y, z))) && nameOf(at(x, y, z)) !== 'water'

  lap('build and merge')
  // 4. the prison: nothing of the town in its box; the road joint at z 470/471
  let inPrison = 0
  for (const k of all.keys()) { const [x, , z] = xyz(k); if (x >= PRISON.x1 && x <= PRISON.x2 && z >= PRISON.z1 && z <= PRISON.z2) inPrison++ }
  const ents = [...labels().map(l => ['label', l]), ...displays().map(d => ['display', d])]
  const entsIn = ents.filter(([, e]) => e.x >= PRISON.x1 && e.x < PRISON.x2 + 1 && e.z >= PRISON.z1 && e.z < PRISON.z2 + 1)
  if (inPrison || entsIn.length) fail(`${inPrison} block(s) and ${entsIn.length} label(s)/display(s) inside the prison's box`, entsIn.slice(0, 5).map(([t, e]) => `${t} ${e.text || e.item} ${e.x} ${e.y} ${e.z}`))
  else ok('nothing written inside the prison\'s box (x -40..480, z -30..470)')
  // The joint: the prison's road (outdoors.js roads(): asphalt x 431..466, white 432/465, dashed white 440/457 where
  // z % 6 < 3, yellow 448/449) carries on over z 471..478 at y 64, with nothing in the way above it.
  const roadKind = (x, z) => x === 448 || x === 449 ? 'yellow' : x === 432 || x === 465 || ((x === 440 || x === 457) && ((z % 6) + 6) % 6 < 3) ? 'white' : 'asphalt'
  const kindOf = s => !s ? null : /yellow_concrete|bamboo/.test(s) ? 'yellow' : /white_concrete|smooth_quartz/.test(s) ? 'white' : /black_concrete|gray_concrete_powder|blackstone/.test(s) ? 'asphalt' : s
  const joint = []
  if (present().includes('approach')) {
    for (let z = 471; z <= 478; z++) for (let x = 431; x <= 466; x++) {
      const k = kindOf(get(x, 64, z))
      if (k !== roadKind(x, z)) joint.push(`town ${x} 64 ${z}: ${get(x, 64, z) || '(world grass)'} (the prison's rule: ${roadKind(x, z)})`)
      for (let y = 65; y <= 68; y++) if (solidAt(x, y, z)) joint.push(`town ${x} ${y} ${z}: ${at(x, y, z)} over the road`)
    }
    let jb = null
    try { jb = require('./jail.js').build() } catch (e) { warn(`the prison's build didn't load (${e.message}): its side of the joint not checked`) }
    if (jb) {
      let inTown = 0
      for (const k of jb.blocks.keys()) { const [x, , z] = xyz(k); if (x >= C.TOWN.x1 && x <= C.TOWN.x2 && z >= C.TOWN.z1 && z <= C.TOWN.z2) inTown++ }
      if (inTown) fail(`${inTown} prison block(s) inside the town's box`)
      for (let x = 431; x <= 466; x++) { const k = kindOf(jb.get(x, 64, 470)); if (k !== roadKind(x, 470)) joint.push(`prison ${x} 64 470: ${jb.get(x, 64, 470)} (rule: ${roadKind(x, 470)})`) }
      for (const x of [429, 430, 467, 468]) if (jb.get(x, 64, 470) && kindOf(jb.get(x, 64, 470)) === 'asphalt') joint.push(`prison ${x} 64 470: road past the town's edge`)
    }
    if (joint.length) fail(`the road joint at z 470/471 doesn't line up (${joint.length})`, joint.slice(0, 10))
    else ok(`the road joint: z 471..478 carry on the prison's road (x 431..466${jb ? ', the prison\'s z 470 row checked' : ''}), clear above`)
  }

  lap('prison joint')
  // 5. points
  let pts = {}
  try { pts = points(); ok(`${Object.keys(pts).length} point names, unique`) } catch (e) { fail(e.message) }

  // 6-12. setup
  const S = setup()
  const regions = S.regions, rid = new Set()
  for (const r of regions) {
    if (rid.has(r.id)) fail(`region ${r.id} defined twice`)
    rid.add(r.id)
    const b = r.box
    if (b[0] < C.TOWN.x1 || b[3] > C.TOWN.x2 || b[2] < C.TOWN.z1 || b[5] > C.TOWN.z2 || b[1] < C.TOWN.y1 - 13 || b[4] > C.TOWN.y2) fail(`region ${r.id} leaves the town box: ${b.join(' ')}`)
    if (b[0] > b[3] || b[1] > b[4] || b[2] > b[5]) fail(`region ${r.id}: corners out of order ${b.join(' ')}`)
  }
  const safes = regions.filter(r => /^safe/.test(r.id)), heistRegions = regions.filter(r => /^heist_/.test(r.id))
  const inSafe = p => safes.find(r => inB(p, r.box)), inHeist = p => heistRegions.find(r => inB(p, r.box))
  for (let i = 0; i < heistRegions.length; i++) {
    const a = heistRegions[i]
    if (vol(a.box) >= 100000) fail(`${a.id}: ${vol(a.box)} blocks (a room reset over 100,000 is too slow)`)
    for (const s of safes) if (boxesTouch(a.box, s.box)) fail(`${a.id} touches the safe zone ${s.id}`)
    for (let j = i + 1; j < heistRegions.length; j++) if (boxesTouch(a.box, heistRegions[j].box)) fail(`${a.id} and ${heistRegions[j].id} overlap or touch`)
  }
  const standOk = (p, what) => { // feet and head free, a floor under the feet
    const x = Math.floor(p[0]), y = Math.floor(p[1]), z = Math.floor(p[2])
    const bad = []
    if (solidAt(x, y, z)) bad.push(`feet in ${at(x, y, z)}`)
    if (solidAt(x, y + 1, z)) bad.push(`head in ${at(x, y + 1, z)}`)
    if (!solidAt(x, y - 1, z) && !/slab|stairs/.test(at(x, y, z))) bad.push(`nothing under the feet (${at(x, y - 1, z)})`)
    if (bad.length) fail(`${what} at ${p.slice(0, 3).join(' ')}: ${bad.join(', ')}`)
  }
  for (const h of S.heists) {
    const reg = heistRegions.find(r => r.id === `heist_${h.id}`)
    if (!reg) { fail(`heist ${h.id}: no region heist_${h.id}`); continue }
    if (inSafe(h.exit)) fail(`heist ${h.id}: its exit is in the safe zone ${inSafe(h.exit).id}`)
    if (inHeist(h.exit)) fail(`heist ${h.id}: its exit is inside ${inHeist(h.exit).id}`)
    standOk(h.exit, `heist ${h.id} exit`)
    for (const l of h.loot || []) {
      const [x1, y1, z1, x2, y2, z2] = l.cells
      for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) {
        if (!blockIn(x, y, z, reg.box)) fail(`heist ${h.id} loot ${l.name}: ${x} ${y} ${z} outside ${reg.id}`)
        if (!solidAt(x, y, z)) fail(`heist ${h.id} loot ${l.name}: nothing for the loot to lie on at ${x} ${y} ${z} (${at(x, y, z)})`)
        if (solidAt(x, y + 1, z) || solidAt(x, y + 2, z)) fail(`heist ${h.id} loot ${l.name}: less than 2 air over ${x} ${y} ${z} (${at(x, y + 1, z)}, ${at(x, y + 2, z)})`)
      }
    }
  }
  for (const k of S.keepers) {
    if (!inSafe(k.at)) fail(`keeper ${k.kind} at ${k.at.slice(0, 3).join(' ')} isn't in a safe zone`)
    standOk(k.at, `keeper ${k.kind}`)
  }
  for (const c of S.crates) {
    if (!inSafe(c.at)) fail(`crate stand ${c.crate} isn't in a safe zone`)
    const [x, y, z] = c.at.map(Math.floor)
    if (!solidAt(x, y, z)) fail(`crate stand ${c.crate}: no block at ${x} ${y} ${z}`)
    for (let d = 1; d <= 3; d++) if (solidAt(x, y + d, z)) fail(`crate stand ${c.crate}: ${at(x, y + d, z)} ${d} over it`)
  }
  for (const pu of S.pumps) { // fuel.sk's pumps (PLAN 15.2): every block of a pump's box is a block to click
    const [x1, y1, z1, x2, y2, z2] = pu.box
    for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) if (!solidAt(x, y, z)) fail(`pump ${pu.label}: no block at ${x} ${y} ${z} (${at(x, y, z)})`)
    if (!inSafe([x1, y1, z1]) && inHeist([x1, y1, z1])) fail(`pump ${pu.label} is inside ${inHeist([x1, y1, z1]).id}`)
  }
  const chops = S.chops.map(c => c.at)
  for (let i = 0; i < S.carSpots.length; i++) {
    const a = S.carSpots[i].at
    if (inSafe(a) || inHeist(a)) fail(`car spot ${a.join(' ')} is in ${(inSafe(a) || inHeist(a)).id}`)
    for (let j = i + 1; j < S.carSpots.length; j++) { const b = S.carSpots[j].at; if (Math.hypot(a[0] - b[0], a[2] - b[2]) < 6) fail(`car spots ${a.join(' ')} and ${b.join(' ')} are under 6 apart`) }
    for (const c of chops) if (Math.hypot(a[0] - c[0], a[2] - c[2]) < 50) fail(`car spot ${a.join(' ')} is under 50 from a chop shop`)
  }
  for (const g of S.garages) for (const p of [...(g.exits || []), ...(g.returns || []), ...(g.bays || [])]) {
    const reg = regions.find(r => r.id === g.region)
    if (!reg || !inB(p, reg.box)) fail(`garage ${g.site}: ${p.join(' ')} isn't inside ${g.region}`)
  }
  ok(`setup: ${SETUP_KEYS.map(k => `${S[k].length} ${k}`).join(', ')}`)

  lap('setup')
  // 13. hill tops: every hill column of approach and land has its top block at 64 + groundTop
  const portalCol = (x, z) => ((z >= C.PORTAL_N && z <= C.PORTAL_N + 2) || (z >= C.PORTAL_S - 2 && z <= C.PORTAL_S)) && x >= 418 && x <= 479
  const tops = []
  let hillCols = 0
  for (let x = C.TOWN.x1; x <= C.TOWN.x2; x++) for (let z = C.TOWN.z1; z <= C.TOWN.z2; z++) {
    const o = C.ownerOf(x, z)
    if ((o !== 'approach' && o !== 'land') || !present().includes(o)) continue
    const t = C.groundTop(x, z)
    if (t <= 0 || portalCol(x, z) || (x >= 429 && x <= 468 && z <= 728 && (z < 551 || z > 614))) continue
    hillCols++
    if (!solidAt(x, 64 + t, z)) tops.push(`${x} ${64 + t} ${z}: ${at(x, 64 + t, z)} (groundTop ${t}, ${o})`)
  }
  if (tops.length) fail(`${tops.length} hill column(s) without their top block at 64 + groundTop`, tops.slice(0, 10))
  else ok(`${hillCols} hill columns, each with its top block at 64 + groundTop`)

  lap('hill tops')
  // 14-16. water, gravity, powder next to water (the whole build over the world's flat ground)
  const leaks = [], falls = [], powder = []
  for (const [k, s] of all) {
    const n = nameOf(s), [x, y, z] = xyz(k)
    if (n === 'water' || /waterlogged=true/.test(s) || n === 'seagrass' || n === 'tall_seagrass') {
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0]]) {
        const o = at(x + dx, y + dy, z + dz), on = nameOf(o)
        if (on === 'water' || /waterlogged=true/.test(o) || /seagrass/.test(on) || !AIRISH.test(on) || on === 'lily_pad') continue
        if (leaks.length < 10) leaks.push(`${k} ${n} beside ${x + dx},${y + dy},${z + dz} ${o}`)
        leaks.n = (leaks.n || 0) + 1
      }
      if (n === 'water' && s !== 'water' && !/level=0/.test(s)) { leaks.n = (leaks.n || 0) + 1; if (leaks.length < 10) leaks.push(`${k} ${s}: not a source`) }
    }
    if (GRAVITY.test(n)) {
      const below = at(x, y - 1, z)
      if (AIRISH.test(nameOf(below)) || nameOf(below) === 'water') { falls.n = (falls.n || 0) + 1; if (falls.length < 10) falls.push(`${k} ${n} over ${below}`) }
      if (/concrete_powder/.test(n)) for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]]) {
        if (nameOf(at(x + dx, y + dy, z + dz)) === 'water') { powder.n = (powder.n || 0) + 1; if (powder.length < 10) powder.push(`${k} ${n} next to water`); break }
      }
    }
  }
  if (leaks.n) fail(`${leaks.n} water face(s) that would flow (an open side or under it, or not a source)`, leaks)
  else ok('every water block is a source, closed on its 4 sides and below')
  if (falls.n) fail(`${falls.n} sand/gravel/powder block(s) over air or water`, falls)
  else ok('no sand, gravel or concrete powder over air')
  if (powder.n) fail(`${powder.n} concrete powder block(s) next to water (they'd harden)`, powder)

  lap('water and gravity')
  // 17. GPS: ids unique, links to known nodes, no link twice, a clear way at head height along each link
  const G = gps(), ids = new Map()
  for (const [id, x, y, z, name] of G.nodes) {
    if (ids.has(id)) fail(`GPS node ${id} defined twice`)
    ids.set(id, [x, y, z, name])
    if (x >= PRISON.x1 && x < PRISON.x2 + 1 && z >= PRISON.z1 && z < PRISON.z2 + 1) infos.push(`GPS node ${id} ${name || ''} lies on the prison's road (${x} ${y} ${z}): a path node, no blocks`)
  }
  const seen = new Set(), blocked = []
  for (const [a, b] of G.links) {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (seen.has(key)) fail(`GPS link ${key} listed twice`)
    seen.add(key)
    for (const id of [a, b]) if (!ids.has(id) && !PRISON_GPS.has(id)) fail(`GPS link ${a}-${b}: no node ${id}`)
    if (!ids.has(a) || !ids.has(b)) continue
    const p = ids.get(a), q = ids.get(b), n = Math.ceil(Math.hypot(q[0] - p[0], q[2] - p[2]) * 2)
    for (let i = 1; i < n; i++) {
      const t = i / n, x = Math.floor(p[0] + (q[0] - p[0]) * t), y = Math.floor(p[1] + (q[1] - p[1]) * t + 1.2), z = Math.floor(p[2] + (q[2] - p[2]) * t)
      if (C.TOWN && (z < C.TOWN.z1)) continue // the prison's own ground
      if (solidAt(x, y, z)) { blocked.push(`${a}-${b} at ${x} ${y} ${z}: ${at(x, y, z)}`); break }
    }
  }
  if (blocked.length) fail(`${blocked.length} GPS link(s) through a solid block at head height`, blocked.slice(0, 10))
  else ok(`GPS: ${G.nodes.length} nodes, ${G.links.length} links, every link clear at head height`)

  lap('gps')
  // 18. labels and displays: in their own cell's air (a label 0.03 off a face; a display not buried in a block)
  const buried = []
  for (const l of labels()) {
    const s = at(Math.floor(l.x), Math.floor(l.y), Math.floor(l.z))
    if (!AIRISH.test(nameOf(s)) && !THIN.test(nameOf(s))) buried.push(`label "${l.text.replace(/\n/g, ' / ')}" ${l.x} ${l.y} ${l.z} in ${s}`)
    if (!/^#[0-9a-f]{6}$/i.test(l.color) || !['north', 'south', 'east', 'west', 'up'].includes(l.facing)) fail(`label "${l.text}": bad color or facing`)
  }
  for (const d of displays()) {
    const s = at(Math.floor(d.x), Math.floor(d.y), Math.floor(d.z))
    if (!AIRISH.test(nameOf(s)) && !THIN.test(nameOf(s))) buried.push(`display ${d.item} ${d.x} ${d.y} ${d.z} in ${s}`)
  }
  if (buried.length) warn(`${buried.length} label(s)/display(s) inside a full block`, buried)

  lap('labels')
  // 19. block states against the 26.1.2 registry (reports/blocks.json from the server jar's data generator)
  if (opts.registry) {
    const reg = JSON.parse(fs.readFileSync(opts.registry, 'utf8'))
    const states = new Set(all.values()), bad = []
    for (const s of states) {
      const { name, props } = parseState(s), r = reg[name]
      if (!r) { bad.push(`unknown block ${name}`); continue }
      for (const [k, v] of Object.entries(props)) if (!r.properties || !r.properties[k] || !r.properties[k].includes(v)) bad.push(`${s}: ${k}=${v}`)
    }
    if (bad.length) fail(`${bad.length} bad block state(s)`, bad.slice(0, 12))
    else ok(`${states.size} block states, all in the 26.1.2 registry`)
  } else infos.push('block states not checked against the registry (--registry <blocks.json>)')

  lap('registry')
  // 20. --seal: air from the sky and the box's open edges must never reach under a hill column's top
  if (opts.seal) seal(C, all, at, fail, ok)
  lap('seal')

  // report
  console.log(`town check (${present().join(', ')}) in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  for (const i of infos) console.log(`  ok   ${i}`)
  for (const w of warns) { console.log(`  WARN ${w.what}`); for (const l of w.list.slice(0, 12)) console.log(`         ${l}`) }
  for (const f of fails) { console.log(`  FAIL ${f.what}`); for (const l of f.list.slice(0, 12)) console.log(`         ${l}`) }
  console.log(fails.length ? `${fails.length} failure(s), ${warns.length} warning(s)` : `all checks passed (${warns.length} warning(s))`)
  return fails.length === 0
}

function seal (C, all, at, fail, ok) {
  const X1 = C.TOWN.x1, X2 = C.TOWN.x2, Z1 = C.TOWN.z1, Z2 = C.TOWN.z2, Y1 = 55
  let top = 64
  for (let x = X1; x <= X2; x++) for (let z = Z1; z <= Z2; z++) top = Math.max(top, 64 + C.groundTop(x, z))
  const Y2 = top + 1, W = X2 - X1 + 1, D = Z2 - Z1 + 1, H = Y2 - Y1 + 1
  const idx = (x, y, z) => ((x - X1) * D + (z - Z1)) * H + (y - Y1)
  const solid = new Uint8Array(W * D * H)
  for (let x = X1; x <= X2; x++) for (let z = Z1; z <= Z2; z++) for (let y = Y1; y <= 64; y++) solid[idx(x, y, z)] = 1
  for (const [k, s] of all) {
    const [x, y, z] = xyz(k)
    if (y < Y1 || y > Y2) continue
    solid[idx(x, y, z)] = AIRISH.test(nameOf(s)) ? 0 : 1 // water counts as closed (it isn't open air)
  }
  const seen = new Uint8Array(W * D * H), q = new Int32Array(W * D * H)
  let n = 0
  const seed = i => { if (!solid[i] && !seen[i]) { seen[i] = 1; q[n++] = i } }
  for (let x = X1; x <= X2; x++) for (let z = Z1; z <= Z2; z++) seed(idx(x, Y2, z))
  for (let y = 65; y <= Y2; y++) {
    for (let x = X1; x <= X2; x++) { seed(idx(x, y, Z1)); seed(idx(x, y, Z2)) }
    for (let z = Z1; z <= Z2; z++) { seed(idx(X1, y, z)); seed(idx(X2, y, z)) }
  }
  for (let r = 0; r < n; r++) {
    const i = q[r], yy = i % H, zz = ((i - yy) / H) % D, xx = Math.floor(i / (D * H))
    if (yy > 0) seed(i - 1); if (yy < H - 1) seed(i + 1)
    if (zz > 0) seed(i - H); if (zz < D - 1) seed(i + H)
    if (xx > 0) seed(i - D * H); if (xx < W - 1) seed(i + D * H)
  }
  // the tunnel's bore (its vault reaches at most 12 over the road block, and the jet fans hang in it) is meant to be open
  const inTunnel = (x, y, z) => z >= C.PORTAL_N && z <= C.PORTAL_S && x >= C.TUNNEL.x1 && x <= C.TUNNEL.x2 && y <= C.TUNNEL.floor + 12
  const out = []
  let cells = 0
  for (let x = X1; x <= X2; x++) for (let z = Z1; z <= Z2; z++) {
    const t = C.groundTop(x, z)
    if (t <= 0) continue
    for (let y = 65; y < 64 + t; y++) {
      if (!seen[idx(x, y, z)]) continue
      if (inTunnel(x, y, z)) continue
      cells++
      if (out.length < 12) out.push(`${x} ${y} ${z} (groundTop ${t}: ${at(x, 64 + t, z)} on top)`)
    }
  }
  if (cells) fail(`--seal: ${cells} cell(s) under a hill's top that open air reaches (a hollow hill that doesn't close)`, out)
  else ok(`--seal: open air (${n} cells flooded, y ${Y1}..${Y2}) reaches nothing under a hill's top`)
}

// ---- render: the town from above and from the street (offline previews) ---------------------------------------------------
const blockColor = s => require('./render').blockColor(s) // lazy: render.js loads this file as a build.js
const { canvas } = require('../png')
// render.js finds a colour by a texture's name; these are drawn with another block's texture
const RENAME = { smooth_quartz: 'quartz_block_top', smooth_quartz_slab: 'quartz_block_top', smooth_quartz_stairs: 'quartz_block_top', smooth_red_sandstone: 'red_sandstone_top', smooth_sandstone: 'sandstone_top', smooth_stone_slab: 'smooth_stone', quartz_slab: 'quartz_block_top', quartz_stairs: 'quartz_block_top', iron_chain: 'iron_bars', end_rod: 'end_rod' }
const colorOf = s => { const n = nameOf(s); return n === 'light' ? null : blockColor(RENAME[n] || s) }
const PLANT = /^(short_grass|tall_grass|fern|dead_bush|poppy|dandelion|cornflower|oxeye_daisy|allium|azure_bluet|orange_tulip|red_tulip|wildflowers|seagrass|tall_seagrass|lily_pad|light|air)$/
const SKY = [150, 195, 240]
const GROUND = y => y === 64 ? [110, 160, 70, 255] : y >= 61 ? [134, 96, 67, 255] : [125, 125, 125, 255]

// From above: each column's highest drawn block, shaded by its height and lit from the north-west (hillshade);
// columns the build leaves alone are the world's grass.
function topView (b, box, px) {
  const [X1, Z1, X2, Z2] = box, W = X2 - X1 + 1, D = Z2 - Z1 + 1
  const hy = new Int16Array(W * D).fill(-1), st = new Array(W * D).fill(null), carved = new Uint8Array(W * D)
  for (const [k, s] of b.blocks) {
    const [x, y, z] = xyz(k)
    if (x < X1 || x > X2 || z < Z1 || z > Z2) continue
    const n = nameOf(s), j = (x - X1) * D + (z - Z1)
    if (n === 'air') { if (y === 64) carved[j] = 1; continue }
    if ((PLANT.test(n) && n !== 'lily_pad') || !colorOf(s)) continue
    if (y > hy[j]) { hy[j] = y; st[j] = s }
  }
  // the world's grass is on top where the build leaves y 64 alone and sets nothing higher
  for (let j = 0; j < W * D; j++) if (hy[j] < 64 && !carved[j]) { hy[j] = 64; st[j] = null }
  const img = canvas(W * px, D * px)
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    const j = x * D + z, s = st[j], wat = s && nameOf(s) === 'water'
    let c = s ? colorOf(s) : GROUND(64)
    if (!c || c[0] === 255 && c[1] === 0 && c[2] === 255) c = GROUND(64)
    const nw = x > 0 && z > 0 ? hy[(x - 1) * D + (z - 1)] : hy[j]
    let f = 0.86 + 0.0035 * (hy[j] - 64) + 0.07 * Math.max(-3, Math.min(3, hy[j] - nw))
    if (wat) f = 1
    for (let i = 0; i < px; i++) for (let k = 0; k < px; k++) {
      const o = ((z * px + k) * img.w + x * px + i) * 4
      img.px[o] = Math.min(255, c[0] * f); img.px[o + 1] = Math.min(255, c[1] * f); img.px[o + 2] = Math.min(255, c[2] * f); img.px[o + 3] = 255
    }
  }
  return img
}

// A perspective view (a ray cast through the blocks, the world's flat ground under them): camera at (ex, ey, ez), yaw as
// Minecraft's (0 south, 90 west, 180 north, -90 east), pitch down positive.
function perspGrid (b, box) {
  const [X1, Z1, X2, Z2] = box, Y1 = 50, NY = 111, NX = X2 - X1 + 1, NZ = Z2 - Z1 + 1
  const grid = new Uint16Array(NX * NY * NZ), info = [], pal = new Map()
  for (const [k, s] of b.blocks) {
    const [x, y, z] = xyz(k)
    if (x < X1 || x > X2 || z < Z1 || z > Z2 || y < Y1 || y >= Y1 + NY) continue
    const n = nameOf(s)
    let v = 1
    if (n !== 'air') {
      if (!pal.has(s)) {
        pal.set(s, info.length)
        const c = colorOf(s) || [0, 0, 0, 0]
        const thin = /(_pane|iron_bars|iron_chain|_fence|end_rod)$/.test(n)
        info.push({ c, alpha: PLANT.test(n) || !colorOf(s) ? 0 : n === 'water' ? 0.6 : /glass/.test(n) ? 0.4 : thin ? 0.55 : 1, half: /_slab$/.test(n) && !/type=double/.test(s) ? (/type=top/.test(s) ? 'top' : 'bottom') : null })
      }
      v = pal.get(s) + 2
    }
    grid[((x - X1) * NY + (y - Y1)) * NZ + (z - Z1)] = v
  }
  return { X1, Y1, Z1, NX, NY, NZ, grid, info }
}
function persp (g, [ex, ey, ez, yawD, pitchD, fovD = 75, W = 1600, H = 900]) {
  const { X1, Y1, Z1, NX, NY, NZ, grid, info } = g
  const cell = (x, y, z) => {
    if (x >= X1 && x < X1 + NX && y >= Y1 && y < Y1 + NY && z >= Z1 && z < Z1 + NZ) { const v = grid[((x - X1) * NY + (y - Y1)) * NZ + (z - Z1)]; if (v === 1) return null; if (v > 1) return info[v - 2] }
    if (y <= 64) return { c: GROUND(y), alpha: 1 }
    return null
  }
  const img = canvas(W, H)
  const yaw = yawD * Math.PI / 180, pitch = pitchD * Math.PI / 180, f = Math.tan(fovD * Math.PI / 360)
  const fwd = [-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)], right = [-Math.cos(yaw), 0, -Math.sin(yaw)]
  const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]]
  const MAXD = 900
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const sx = (2 * (px + 0.5) / W - 1) * f, sy = (1 - 2 * (py + 0.5) / H) * f * H / W
    let d = [fwd[0] + sx * right[0] + sy * up[0], fwd[1] + sx * right[1] + sy * up[1], fwd[2] + sx * right[2] + sy * up[2]]
    const L = Math.hypot(...d); d = d.map(v => v / L)
    let x = Math.floor(ex), y = Math.floor(ey), z = Math.floor(ez)
    const step = d.map(v => v > 0 ? 1 : -1), tD = d.map(v => Math.abs(1 / v)), o = [ex, ey, ez]
    const tM = [0, 1, 2].map(i => d[i] > 0 ? (Math.floor(o[i]) + 1 - o[i]) * tD[i] : (o[i] - Math.floor(o[i])) * tD[i])
    const acc = [0, 0, 0]
    let tr = 1, t = 0, face = 1
    while (t < MAXD && tr > 0.02) {
      const c = cell(x, y, z)
      if (c && c.alpha > 0) {
        let hit = true
        if (c.half) { const y0 = o[1] + d[1] * (t + 0.001) - y, y1 = o[1] + d[1] * (Math.min(tM[0], tM[1], tM[2]) - 0.001) - y; hit = c.half === 'bottom' ? Math.min(y0, y1) <= 0.5 : Math.max(y0, y1) >= 0.5 }
        if (hit) {
          const sh = face === 1 ? (d[1] < 0 ? 1.0 : 0.5) : face === 0 ? 0.8 : 0.65, fog = Math.min(1, t / MAXD) ** 1.5
          for (let k = 0; k < 3; k++) acc[k] += tr * c.alpha * (c.c[k] * sh * (1 - fog) + SKY[k] * fog)
          tr *= 1 - c.alpha
        }
      }
      const i = tM[0] < tM[1] ? (tM[0] < tM[2] ? 0 : 2) : (tM[1] < tM[2] ? 1 : 2)
      t = tM[i]; tM[i] += tD[i]; face = i
      if (i === 0) x += step[0]; else if (i === 1) y += step[1]; else z += step[2]
      if (y < Y1 - 1 || y > 230) break
    }
    for (let k = 0; k < 3; k++) acc[k] += tr * SKY[k]
    const j = (py * W + px) * 4
    img.px[j] = Math.min(255, acc[0]); img.px[j + 1] = Math.min(255, acc[1]); img.px[j + 2] = Math.min(255, acc[2]); img.px[j + 3] = 255
  }
  return img
}
// The plan's massing (plan-layout.js) for the building modules that don't exist yet: their footprints up to their roofs.
function massing (b) {
  const gone = missing().filter(m => m !== 'approach' && m !== 'streets' && m !== 'land')
  if (!gone.length) return 0
  const C = common(), plan = require(path.join(DIR, 'plan-layout.js'))()
  let n = 0
  for (const [k, s] of plan.blocks) {
    const [x, y, z] = xyz(k)
    if (!gone.includes(C.ownerOf(x, z)) || y === 100 || b.blocks.has(k)) continue
    for (let yy = y > 65 ? 65 : y; yy <= y; yy++) { b.set(x, yy, z, s); n++ }
  }
  return n
}
const VIEWS = {
  // the road comes out of the ridge's south portal and drops to the bridge with the town spread out below (PLAN 0)
  descent: [448.5, 74.5, 619.5, 0, 9, 75],
  // Main Street from the bridge's south end: the Gun Shop on the left, the Donut Shop and the Garage on the right
  main: [448.5, 68.5, 712.5, 0, 3, 80],
  // a pedestrian at the north-east corner of Main x 1st (eye height on the sidewalk) looking south-west: the junction's
  // lights, the Gas Station's canopy and store across Main, the Gear Shop's helmet on the left
  corner: [463.5, 66.62, 840.5, 28, 2, 80],
  // over the south end looking north, like the wiki's bird's-eye picture: the town, the river, the ridge and the tunnel
  aerial: [455, 205, 1345, 180, 28, 70]
}
function render (opts) {
  const C = common()
  const out = path.resolve(opts.out || path.join(DIR, 'renders', 'town'))
  fs.mkdirSync(out, { recursive: true })
  const views = (opts.views || 'top,planned,descent,main,corner,aerial').split(',')
  const px = Number(opts.px || 2)
  const b = build()
  const bd = b.bounds()
  console.log(`${b.blocks.size} blocks (${present().join(', ')}), box ${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}`)
  const box = [C.TOWN.x1, C.TOWN.z1, C.TOWN.x2, C.TOWN.z2]
  const save = (name, img) => { const f = path.join(out, `${name}.png`); fs.writeFileSync(f, img.png()); console.log(`wrote ${f} (${img.w}x${img.h})`) }
  if (views.includes('top')) save('town-top', topView(b, box, px))
  let g = null
  const pv = Object.keys(VIEWS).filter(v => views.includes(v))
  if (pv.length) { g = perspGrid(b, box); for (const v of pv) { const t0 = Date.now(); save(`town-${v}`, persp(g, VIEWS[v])); console.log(`  ${v}: ${((Date.now() - t0) / 1000).toFixed(1)} s`) } }
  if (views.includes('planned')) {
    const n = massing(b)
    console.log(`plan massing for ${missing().join(', ') || 'nothing'}: ${n} blocks`)
    save('town-top-planned', topView(b, box, px))
    if (views.includes('aerial')) { g = perspGrid(b, box); save('town-aerial-planned', persp(g, VIEWS.aerial)) }
  }
}

// ---- setup: the commands that make the town playable (PLAN 8.3) -------------------------------------------------------------
const f1 = n => String(Math.round(n * 1000) / 1000)
const xyzs = p => p.slice(0, 3).map(f1).join(' ')
const yawOf = p => p.length > 3 ? f1(p[3]) : '0'
function setupLines (W) {
  const C = common(), S = setup(), L = []
  const now = W === C.WORLD
  const tag = (t, l) => L.push(`${t} ${l}`)
  const goto = p => `/minecraft:tp @s ${xyzs(p)} ${yawOf(p)} 0`
  L.push(`# Mountainside setup for world "${W}" (generated by node tools/build/town.js setup). (G) in game, standing in ${W};`)
  L.push('# (C) console (Minehut console panel; locally tools\\rcon.ps1 or /console); (L) only once the jailbreak map is the main world.')
  L.push('', '## 1. Regions (G: WorldEdit selection by coordinates, then define; C: the flags)')
  for (const r of S.regions) {
    const b = r.box, launch = r.launch && now
    L.push(`# ${r.id}: ${r.note || ''}`.trim())
    tag('(G)', `//pos1 ${b[0]},${b[1]},${b[2]}`); tag('(G)', `//pos2 ${b[3]},${b[4]},${b[5]}`); tag('(G)', `/rg define ${r.id}`)
    for (const [k, v] of flagList(r.flags)) tag(launch ? '(L)' : '(C)', `rg flag -w ${W} ${r.id} ${k} ${v}`)
    if (r.priority) tag('(C)', `rg setpriority -w ${W} ${r.id} ${r.priority}`)
  }
  L.push('', '## 2. Stores (difficulty 0): create in game in the world, the rest from the console. /dloot needs the heist disabled (it starts so).')
  for (const h of S.heists) {
    const holo = h.holoCmd ? h.holoCmd : `dheist holo ${h.id} ${f1(h.holo[0])} ${f1(h.holo[1] + 2.5)} ${f1(h.holo[2])}`
    tag('(G)', `/dheist create ${h.id} ${h.difficulty}`)
    tag('(C)', `dheist set ${h.id} name ${h.name}`)
    tag('(C)', `dheist exit ${h.id} ${xyzs(h.exit)} ${yawOf(h.exit)}`)
    for (const l of h.loot) tag('(C)', l.cmd)
    tag('(C)', `dloot check ${h.id}`)
    tag('(C)', `dheist snapshot ${h.id}`); L.push(`#      (the room clean: ${h.snapshot})`)
    tag('(C)', holo)
    tag('(C)', `dheist enable ${h.id}`)
  }
  L.push('', '## 3. Shopkeepers (G: each one stands where you stand, facing your way: the tp puts you there)')
  for (const k of S.keepers) { tag(k.launch && now ? '(L)' : '(G)', `${goto(k.at)}   then   ${k.cmd}`); if (k.note) L.push(`#      ${k.kind}: ${k.note}`) }
  L.push('', '## 4. City Garage sites (citygarage.sk: the main world only)')
  for (const g of S.garages) for (const c of g.cmds || []) tag(now ? '(L)' : '(C)', c)
  L.push('', '## 5. Points of interest (nav.sk: /dpoi add only in the main world)')
  for (const p of S.pois) tag(now ? '(L)' : '(G)', `${goto(p.at)}   then   ${p.cmd}`)
  if (S.givers.length || S.crates.length || S.carSpots.length || S.chops.length || S.walls.length || S.holos.length) {
    L.push('', '## 6. Quest givers, crate stands, car spots, chop shops, wall maps, leaderboards')
    for (const q of S.givers) tag('(C)', now ? q.cmd : (q.launchCmd || q.cmd)) // addatw <kind> jailbreak ... now, addat at launch
    for (const c of S.crates) tag('(G)', `look at ${c.at.join(' ')}, then ${c.cmd}`)
    for (const c of [...S.carSpots, ...S.chops]) tag(c.launch && now ? '(L)' : '(G)', `${goto(c.at)}   then   ${c.cmd}`) // car jobs: the main world only
    for (const w of [...S.walls, ...S.holos]) tag(now ? '(L)' : '(G)', w.cmd)
  }
  if (S.pumps.length) {
    L.push('', '## 6b. Fuel pumps (fuel.sk, PLAN 15.2: a box of blocks per pump, its number)')
    for (const p of S.pumps) tag('(C)', `dfuel pumpat ${W} ${p.box.join(' ')} ${p.label}`)
  }
  L.push('', '## 7. GPS paths and the phone\'s map')
  tag('(C)', `the lines of tools/jail-gps-paths.txt (they clear the world's graph first), then tools/build/town/town-gps-paths.txt`)
  tag('(C)', `dphone city scan -40 -30 770 1300 0${now ? ` ${W}` : ''}`)
  if (!now) tag('(C)', 'dphone city use scan   (then the gps.road-blocks and street-y lines of PLAN 8.3 step 7, and dphone roads scan)')
  return L
}

function gpsLines (W) {
  const G = gps()
  const L = [`# The town's GPS paths (${G.nodes.length} nodes, ${G.links.length} links), made by \`node tools/build/town.js gps\` from the town modules.`,
    '# Run every line that isn\'t a comment, in order, AFTER tools/jail-gps-paths.txt: its first line clears the world\'s graph, and',
    '# the spine starts at the prison\'s node 187 (LOT_EXIT). The remove lines make a second run safe (an existing id is refused).']
  for (const [id] of G.nodes) L.push(`dphone path remove ${id}`)
  for (const [id, x, y, z, name] of G.nodes) L.push(`dphone path addat ${W} ${f1(x)} ${f1(y)} ${f1(z)} id=${id} nolink${name ? ` ${name}` : ''}`)
  for (const [a, b] of G.links) L.push(`dphone path link ${a} ${b}`)
  return L
}

// ---- RCON: paste, labels, displays, biomes (change the world: only with the owner's OK) ------------------------------------
// Blocks hung on a side neighbour that mcstruct's own second pass (its ATTACHED list) doesn't hold back: pasted after
// everything else, or one whose support lands in a later 48x48 piece breaks.
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
  await place(main, { name: 'town', world: W })
  if (late.blocks.size) await place(late, { name: 'town_late', world: W })
}
const YAW = { south: 0, west: 90, north: 180, east: -90, up: 0 }
// SNBT-safe text (jail.js's): backslash and quote escaped, anything outside printable ASCII as \uXXXX
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
    `transformation:{left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f],translation:[0f,0f,0f],scale:[${fl(s)},${fl(s)},${fl(s)}]}}`
}
// Summons every entity of a list (each chunk force-loaded while it runs), after removing the old ones with that tag.
async function summonAll (W, list, type, tag, nbtOf, what) {
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
    await new Promise(res => setTimeout(res, 2500)) // entities load a little after their chunk
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
const biomeLines = W => biomes().map(({ biome, box: b }) => `execute in minecraft:${W} run fillbiome ${b[0]} ${b[1]} ${b[2]} ${b[3]} ${b[4]} ${b[5]} ${biome}`)
async function applyBiomes (W) {
  const rcon = require(path.join(ROOT, 'bots', 'rcon.js'))
  const r = await rcon.connect()
  try {
    for (const { biome, box: b } of biomes()) {
      const ex = `execute in minecraft:${W} run`
      await r.cmd(`${ex} forceload add ${b[0]} ${b[2]} ${b[3]} ${b[5]}`)
      let out = ''
      for (let t = 0; t < 40; t++) { out = await r.cmd(`${ex} fillbiome ${b.join(' ')} ${biome}`); if (!/not loaded/i.test(out)) break; await new Promise(res => setTimeout(res, 100)) }
      await r.cmd(`${ex} forceload remove ${b[0]} ${b[2]} ${b[3]} ${b[5]}`)
      console.log(`${b.join(' ')}: ${out.trim()}`)
    }
  } finally { r.close() }
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
      for (const { m, b, ms } of each) { const bd = b.bounds(); n += b.blocks.size; console.log(`${m.padEnd(9)} ${String(b.blocks.size).padStart(8)} blocks  ${bd ? `${bd.x1},${bd.y1},${bd.z1} to ${bd.x2},${bd.y2},${bd.z2}` : '(none)'}  ${ms} ms`) }
      console.log(`${n} blocks in ${each.length} modules; not built yet: ${missing().join(', ') || 'none'}; ${labels().length} labels, ${displays().length} displays`)
    } else if (cmd === 'check') process.exit(check({ seal: !!opt('seal', false), registry: opt('registry', null) }) ? 0 : 1)
    else if (cmd === 'render') render({ out: opt('out', null), px: opt('px', null), views: opt('views', null) })
    else if (cmd === 'setup') console.log(setupLines(W).join('\n'))
    else if (cmd === 'gps') {
      const file = path.resolve(opt('out', null) || path.join(DIR, 'town-gps-paths.txt'))
      const L = gpsLines(W)
      fs.writeFileSync(file, L.join('\n') + '\n')
      console.log(`wrote ${file} (${L.length} lines)`)
    } else if (cmd === 'biomes') { if (opt('apply', false)) applyBiomes(W).catch(fail); else console.log(biomeLines(W).join('\n')) }
    else if (cmd === 'paste') paste(W, opt('box', null)).catch(fail)
    else if (cmd === 'labels') summonAll(W, labels(), 'text_display', common().LABEL_TAG, labelNbt, 'label').catch(fail)
    else if (cmd === 'displays') summonAll(W, displays(), 'item_display', common().DISPLAY_TAG, displayNbt, 'display').catch(fail)
    else fail(`unknown command ${cmd}: check, render, setup, gps, biomes, paste, labels, displays`)
  } catch (e) { fail(e) }
}
