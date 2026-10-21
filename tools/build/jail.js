// The Jailbreak prison (2026-10-14): the modules in tools/build/jail/ run into one Build, M1 first (jail-spec 9.1); the
// sixth, bikeshop (2026-10-21), is the bike shop in front of the prison (tools/build/town/PLAN.md 15.3).
//   node tools/build/jail.js                     -> counts only
//   node tools/build/jail.js paste [--box x1,z1,x2,z2[;...]]
//                                                -> pastes it into the jailbreak world (--box: only those columns)
//   node tools/build/jail.js labels              -> every module's labels as text displays in the jailbreak world (RCON)
//   node tools/build/jail.js points              -> writes server/plugins/Skript/scripts/jailpoints.sk (ESCAPE-SPEC 2.3)
//   node tools/build/jail.js check               -> tools/build/jail-escape-check.js (ESCAPE-SPEC 3.8); non-zero on a failure
// Also a build.js for tools/build/render.js. Later modules win where two set the same block (none should).
const fs = require('fs')
const path = require('path')
const { Build, place } = require('./mcstruct')
const MODULES = ['outdoors', 'mainbuilding', 'cellblock', 'mainrooms', 'buildings', 'bikeshop'] // bikeshop: town PLAN 15.3
const ROOT = path.join(__dirname, '..', '..')
const WORLD = 'jailbreak'
const POINTS_SK = path.join(ROOT, 'server', 'plugins', 'Skript', 'scripts', 'jailpoints.sk')

function build () {
  const b = new Build()
  for (const m of MODULES) require(`./jail/${m}.js`)(b)
  return b
}
const labels = () => MODULES.flatMap(m => require(`./jail/${m}.js`).labels || [])
// Every module's points; a name two modules give different values is an error.
const points = () => {
  const all = {}
  for (const m of MODULES) for (const [k, v] of Object.entries(require(`./jail/${m}.js`).points || {})) {
    if (all[k] && all[k].join() !== v.join()) throw new Error(`point ${k} differs between modules`)
    all[k] = v
  }
  return all
}

module.exports = { build, labels, points }

// ---- points: the generated Skript data (ESCAPE-SPEC 2.3) ------------------------------------------------------------
// A world cell the build doesn't set is the jailbreak world's flat default.
const defaultBlock = y => y === 64 ? 'grass_block' : (y >= 61 && y <= 63) ? 'dirt' : y <= 60 ? 'stone' : 'air'
const num = n => String(Math.round(n * 1000) / 1000)

function pointsSk (b) {
  const Z = require('./jail/zones.js')
  const { cells } = require('./jail/cellblock.js')
  const pts = points()
  // T_CELL_N60 doesn't exist (N60 is the tutorial's T_SPAWN cell): every cell gets its T_CELL_<ID>
  if (!pts.T_CELL_N60 && pts.T_SPAWN) pts.T_CELL_N60 = pts.T_SPAWN
  if (!pts.T_CELL_N60_DOOR && pts.T_SPAWN_DOOR) pts.T_CELL_N60_DOOR = pts.T_SPAWN_DOOR
  const get = (x, y, z) => b.get(x, y, z) ?? defaultBlock(y)
  const L = []
  const counts = {}
  const count = k => { counts[k] = (counts[k] || 0) + 1 }

  // points
  const names = Object.keys(pts).sort()
  for (const n of names) { const [x, y, z, yaw] = pts[n]; L.push(`\tset {-jailpt::${n}} to "${num(x)}|${num(y)}|${num(z)}|${num(yaw)}"`); count('points') }
  // cop routes: ROUTE_<R>_1..n, then n-1 back to 2 (a there-and-back loop)
  const routes = {}
  for (const n of names) { const m = /^ROUTE_([A-Z0-9]+)_(\d+)$/.exec(n); if (m) (routes[m[1]] = routes[m[1]] || [])[Number(m[2]) - 1] = pts[n] }
  for (const [r, list] of Object.entries(routes)) {
    if (list.some(p => !p)) throw new Error(`route ${r} has a gap in its numbering`)
    const seq = [...list, ...list.slice(1, -1).reverse()]
    for (const [x, y, z] of seq) L.push(`\tadd "${num(x)}|${num(y)}|${num(z)}" to {-jailroute::${r.toLowerCase()}::*}`)
    count('routes')
  }
  // zones (Appendix C) and one per cell
  const zones = { ...Z.ZONES }
  for (const x0 of cells.north) zones[`cell_n${x0}`] = [[x0, 57, 48, x0 + 5, 62, 54]]
  for (const x0 of cells.south) zones[`cell_s${x0}`] = [[x0, 57, 65, x0 + 5, 62, 71]]
  for (const [zone, boxes] of Object.entries(zones)) {
    for (const bx of boxes) L.push(`\tadd "${bx.join('|')}" to {-jailzone::${zone}::*}`)
    count('zones')
  }
  // the chain-link fence cells without their gates (prison.sk's shock on contact): the mesh's axis, "p" for a post
  for (const [x, z, ax, post] of require('./jail/outdoors.js').fenceCells()) { L.push(`\tset {-jailfence::${x}|${z}} to "${ax}${post ? 'p' : ''}"`); count('fences') }
  // the outline and the inner outline, vertices in order
  for (const [x, z] of Z.WALL) L.push(`\tadd "${num(x)}|${num(z)}" to {-jailwall::*}`)
  for (const [x, z] of Z.INNER) L.push(`\tadd "${num(x)}|${num(z)}" to {-jailinner::*}`)
  // doors: every half of each iron door, each trapdoor, as built (doors closed, the vent lids open)
  const doors = { ...Z.DOORS }
  for (const x0 of cells.north) doors[`cell_n${x0}`] = [[x0 + 2, 58, 55]]
  for (const x0 of cells.south) doors[`cell_s${x0}`] = [[x0 + 2, 58, 64]]
  for (const [door, blocks] of Object.entries(doors)) {
    for (const [x, y, z] of blocks) {
      const s = b.get(x, y, z)
      if (!s || !/_(door|trapdoor)\[/.test(s)) throw new Error(`door ${door}: no door or trapdoor at ${x} ${y} ${z} (${s})`)
      L.push(`\tadd "${x}|${y}|${z}|${s}" to {-jaildoor::${door}::*}`)
      if (/_door\[/.test(s)) {
        const u = b.get(x, y + 1, z)
        if (!u || !/half=upper/.test(u)) throw new Error(`door ${door}: no upper half at ${x} ${y + 1} ${z}`)
        L.push(`\tadd "${x}|${y + 1}|${z}|${u}" to {-jaildoor::${door}::*}`)
      }
    }
    count('doors')
  }
  // breaches: every cell of their boxes as built; the rubble
  for (const [id, boxes] of Object.entries(Z.BREACHES)) {
    for (const [x1, y1, z1, x2, y2, z2] of boxes) for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) {
      L.push(`\tadd "${x}|${y}|${z}|${get(x, y, z)}" to {-jailbreach::${id}::*}`)
    }
    count('breaches')
  }
  for (const [id, cellsR] of Object.entries(Z.RUBBLE)) for (const [x, y, z, s] of cellsR) L.push(`\tadd "${x}|${y}|${z}|${s}" to {-jailrubble::${id}::*}`)
  // a quote or a % in a value, or a # anywhere (Skript cuts the line there, even inside a variable name), breaks the line
  for (const l of L) if (/[%#]/.test(l) || (l.match(/"/g) || []).length !== 2) throw new Error(`unsafe text in: ${l}`)

  const head = [
    '# jailpoints.sk: GENERATED by `node tools/build/jail.js points` from tools/build/jail/*.js (the modules\' points,',
    '# zones.js and the build). Do not edit it by hand: change the modules or zones.js and run the generator again',
    '# (ESCAPE-SPEC 2.3). jailPointsLoad() deletes and refills exactly these memory variables: {-jailpt::*},',
    '# {-jailroute::*}, {-jailzone::*}, {-jailwall::*}, {-jailinner::*}, {-jaildoor::*}, {-jailbreach::*},',
    '# {-jailrubble::*}, {-jailfence::*} and {-jailpts::*}.',
    `# ${counts.points} points, ${counts.routes} routes, ${counts.zones} zones, ${Z.WALL.length} + ${Z.INNER.length} outline vertices, ${counts.doors} doors, ${counts.breaches} breaches, ${counts.fences} fence cells.`,
    '',
    'on load:',
    '\tjailPointsLoad()',
    '',
    'function jailPointsLoad():',
    '\tdelete {-jailpt::*}',
    '\tdelete {-jailroute::*}',
    '\tdelete {-jailzone::*}',
    '\tdelete {-jailwall::*}',
    '\tdelete {-jailinner::*}',
    '\tdelete {-jaildoor::*}',
    '\tdelete {-jailbreach::*}',
    '\tdelete {-jailrubble::*}',
    '\tdelete {-jailfence::*}',
    '\tdelete {-jailpts::*}'
  ]
  const tail = [`\tset {-jailpts::count} to ${counts.points}`, '\tset {-jailpts::loaded} to true', '']
  return { text: [...head, ...L, ...tail].join('\n'), counts }
}

// ---- labels: text displays over RCON (ESCAPE-SPEC 3.6) ----------------------------------------------------------------
const YAW = { south: 0, west: 90, north: 180, east: -90, up: 0 }
// SNBT-safe text: backslash and quote escaped, anything outside printable ASCII as \uXXXX (SNBT escapes, 1.21.5+)
const snbt = s => [...s].map(c => {
  const code = c.codePointAt(0)
  if (c === '\\' || c === '"') return `\\${c}`
  if (code >= 0x20 && code < 0x7f) return c
  if (code > 0xffff) return `\\U${code.toString(16).padStart(8, '0')}`
  return `\\u${code.toString(16).padStart(4, '0')}`
}).join('')
const f = n => `${Math.round(n * 1000) / 1000}f`

// A whole number in a command coordinate means the block centre (+0.5): always write the decimals.
async function placeLabels () {
  const rcon = require(path.join(ROOT, 'bots', 'rcon.js'))
  const list = labels()
  const ex = `execute in minecraft:${WORLD} run`
  const chunks = new Map()
  for (const l of list) chunks.set(`${Math.floor(l.x / 16)},${Math.floor(l.z / 16)}`, [Math.floor(l.x), Math.floor(l.z)])
  const r = await rcon.connect()
  const added = []
  try {
    for (const [k, [x, z]] of chunks) {
      const q = await r.cmd(`${ex} forceload query ${x} ${z}`)
      if (/is not marked/i.test(q)) { await r.cmd(`${ex} forceload add ${x} ${z}`); added.push([x, z]) } else if (!/is marked/i.test(q)) throw new Error(`forceload query ${k}: ${q.trim()}`)
    }
    // entities load a little after their chunk: wait, then remove the old labels everywhere they could be
    await new Promise(res => setTimeout(res, 2500))
    const killed = await r.cmd(`${ex} minecraft:kill @e[type=minecraft:text_display,tag=jail_label]`)
    let n = 0
    for (const l of list) {
      const pitch = l.facing === 'up' ? -90 : 0
      const nbtText = `{Tags:["jail_label"],text:${require('./signfonts').textNbt(l, 'jail', snbt)},billboard:"fixed",Rotation:[${f(YAW[l.facing] ?? 0)},${f(pitch)}],background:0,` +
        `transformation:{left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f],translation:[0f,0f,0f],scale:[${f(l.scale)},${f(l.scale)},${f(l.scale)}]}}`
      let out = ''
      for (let t = 0; t < 40; t++) {
        out = await r.cmd(`${ex} summon minecraft:text_display ${l.x.toFixed(3)} ${l.y.toFixed(3)} ${l.z.toFixed(3)} ${nbtText}`)
        if (!/not loaded|out of the world/i.test(out)) break
        await new Promise(res => setTimeout(res, 100))
      }
      if (!/summoned/i.test(out)) throw new Error(`label "${l.text}" at ${l.x} ${l.y} ${l.z}: ${out.trim()}`)
      n++
    }
    const have = await r.cmd(`${ex} execute if entity @e[type=minecraft:text_display,tag=jail_label]`)
    console.log(`removed old labels: ${killed.trim() || '(none)'}`)
    console.log(`placed ${n} labels in ${chunks.size} chunk(s); in the world now: ${have.trim()}`)
    const m = /count:\s*(\d+)/i.exec(have)
    if (!m || Number(m[1]) !== list.length) throw new Error(`expected ${list.length} labels in the world`)
  } finally {
    for (const [x, z] of added) await r.cmd(`${ex} forceload remove ${x} ${z}`)
    r.close()
  }
}

// ---- paste --box: only the blocks in some columns -------------------------------------------------------------------
function boxed (b, spec) {
  const boxes = spec.split(';').filter(Boolean).map(s => s.split(',').map(Number))
  if (!boxes.length || boxes.some(q => q.length !== 4 || q.some(Number.isNaN))) throw new Error(`bad --box ${spec}: x1,z1,x2,z2[;...]`)
  const out = new Build()
  for (const [k, s] of b.blocks) {
    const [x, , z] = k.split(',').map(Number)
    if (boxes.some(([x1, z1, x2, z2]) => x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && z >= Math.min(z1, z2) && z <= Math.max(z1, z2))) out.blocks.set(k, s)
  }
  return out
}

if (require.main === module) {
  const cmd = process.argv[2]
  const fail = e => { console.error(e.message || e); process.exit(1) }
  if (cmd === 'labels') placeLabels().catch(fail)
  else if (cmd === 'check') {
    const r = require('child_process').spawnSync(process.execPath, ['--max-old-space-size=6000', path.join(__dirname, 'jail-escape-check.js'), ...process.argv.slice(3)], { stdio: 'inherit' })
    process.exit(r.status === null ? 1 : r.status)
  } else {
    const b = build()
    console.log(`${b.blocks.size} blocks`, JSON.stringify(b.bounds()))
    if (cmd === 'points') {
      try {
        const { text, counts } = pointsSk(b)
        fs.writeFileSync(POINTS_SK, text)
        console.log(`wrote ${path.relative(ROOT, POINTS_SK)}: ${JSON.stringify(counts)}`)
      } catch (e) { fail(e) }
    } else if (cmd === 'paste') {
      const i = process.argv.indexOf('--box')
      let pb = b
      if (i > 0) { try { pb = boxed(b, process.argv[i + 1] || '') } catch (e) { fail(e) } console.log(`--box: ${pb.blocks.size} blocks`) }
      place(pb, { name: 'jail', world: WORLD }).catch(fail)
    } else if (cmd) fail(`unknown command ${cmd}: paste, labels, points, check`)
  }
}
