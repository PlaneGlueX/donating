// Smoother cars (DonatingPhone CarSmooth.java; owner, 2026-09-29: "research if theres a way for the cars to ride
// smoother, test it out using bots"). The same course four times, with /dphone carsmooth off, sync, track and all:
// straight up to full speed, a slalom (11 key changes: the research said each one makes MTVehicles skip a movement tick),
// a tight circle, then the brake. Measured two ways:
//  - on the server, /dphone carprobe (per tick, after every Bukkit task: where MAIN, SKIN and the driver's seat are,
//    skipped movement ticks, hitches, mspt; rows in plugins\DonatingPhone\carprobe.log, which this test reads);
//  - on the clients, what two bots are sent for the car's model stand (SKIN) and the driver's seat (MAINSEAT): the
//    driver (SmoothD) and a player watching from the side (SmoothO): moves a second, the gaps between them, and where
//    the seat is against the model (the seat error a watcher sees).
// Found 2026-09-29 (why earlier runs failed): `execute as <stand> run tp @s ~ ~ ~ ...` from RCON teleported MAIN to the
// console's spot (the world spawn: `~` is the source's position without `at @s`), so the car faced south, drove off the
// platform and fell; `/dgarage store` didn't store a car spawned by /zzcarspawn, so each run left a second copy of every
// stand; and armor stands are sent only within 64 blocks (spigot.yml entity-tracking-range other), while the seat
// carries a player and is sent within 128 (a watcher 70 blocks away saw the driver without the car). Now the car is put
// back with /zzcartp (the same stands, one copy), turned with `at @s`, and the course stays within 56 blocks of the
// watcher.
// The floating driver (2026-09-29): CarSmooth's track also raises a driven car's stands' tracker range to
// carsmooth.range (128, the driver's). A third bot (SmoothF) stands 84-105 blocks from the course on a pad of its own:
// with off and sync it's sent the driver on his seat but never the car model; with track and all the model too.
// Resyncing together (2026-09-29, the owner's 26.3 client: "player velocity doesnt match the car and their head glitches
// out"): a full position resync (sync_entity_position) becomes a 3-tick step for a 26.3 client through ViaVersion while
// the per-tick moves are 1-tick steps, so the model (SKIN) and the driver's seat (MAINSEAT) resyncing on different ticks
// put the driver up to 2 blocks off the car. CarSmooth's carsmooth.together (track mode) never lets the periodic resync
// fire while driving and makes the whole car resync in the same tick whenever one stand has to (a new player starting to
// watch it). The last drive checks it: 32 s in track mode (past the 400-tick periodic resync), and a fourth bot (SmoothN)
// comes into range mid-drive, leaves and comes back; every resync any bot gets of SKIN has one of MAINSEAT in the same
// tick and back, and the probe counts no tick where exactly one of them resynced.
const fs = require('fs')
const path = require('path')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const D = 'SmoothD' // the driver
const O = 'SmoothO' // watches from the side
const F = 'SmoothF' // watches from far away: past the armor stands' 64 blocks, inside the driver's 128
const Y = 200
const X0 = 6090, X1 = 6250, Z0 = 6080, Z1 = 6200
const CHUNKS = `${X0} ${Z0} ${X1} ${Z1}`
const PLATFORM = `${X0} ${Y - 1} ${Z0} ${X1} ${Y - 1} ${Z1}`
const START = [6110.5, Y, 6140.5] // the car, facing east (yaw -90)
const WATCH = [6147.5, Y, 6122.5] // the watcher, beside the middle of the course (41-47 blocks from the car at most)
const FAR = [6160.5, Y, 6227.5] // SmoothF, south of the platform (about 85-118 blocks from the car on CarSteer's wider circles)
const FAR_PAD = `6158 ${Y - 1} 6225 6162 ${Y - 1} 6229` // block coordinates are whole numbers (a .5 makes fill and forceload fail)
const FAR_CHUNKS = `6158 6225 6162 6229`
const N = 'SmoothN' // the together drive: out of range (340 blocks off, past the view distance), then in, out and in again
const N_PAD_SPOT = [6160.5, Y, 6480.5]
const N_PAD = `6158 ${Y - 1} 6478 6162 ${Y - 1} 6482`
const N_CHUNKS = `6158 6478 6162 6482`
const N_WATCH = [6130.5, Y, 6168.5] // on the platform, 20-50 blocks from the circle
const MODES = ['off', 'sync', 'track', 'all']
const PROBE_LOG = path.join(__dirname, '..', '..', 'server', 'plugins', 'DonatingPhone', 'carprobe.log')
// Packets that move an entity (entity_look and entity_head_rotation only turn it).
const MOVES = new Set(['rel_entity_move', 'entity_move_look', 'sync_entity_position', 'entity_teleport'])
const now = () => Number(process.hrtime.bigint()) / 1e6

// Everything a bot is sent about entities: arrival time, the packet, its size, and the entity's position after it (as the
// client works it out: spawn and sync absolute, moves as deltas in 1/4096 blocks).
function watch (bot) {
  const w = { events: [], pos: new Map(), spawned: new Map(), destroyed: new Map(), everDestroyed: new Set(), passengers: new Map() }
  bot._client.on('packet', (d, meta, buf) => {
    if (!d) return
    const t = now()
    const n = meta.name
    if (n === 'entity_destroy') { for (const id of d.entityIds || []) { w.destroyed.set(id, t); w.everDestroyed.add(id) } return }
    if (d.entityId === undefined) return
    if (n === 'set_passengers') w.passengers.set(d.entityId, d.passengers || [])
    let p = w.pos.get(d.entityId)
    if (n === 'spawn_entity') { p = [d.x, d.y, d.z]; w.spawned.set(d.entityId, t); w.destroyed.delete(d.entityId) }
    else if (n === 'rel_entity_move' || n === 'entity_move_look') { if (p) p = [p[0] + d.dX / 4096, p[1] + d.dY / 4096, p[2] + d.dZ / 4096] }
    else if (n === 'sync_entity_position') p = [d.x, d.y, d.z]
    else if (n === 'entity_teleport') { const f = d.flags || {}; p = [f.x && p ? p[0] + d.x : d.x, f.y && p ? p[1] + d.y : d.y, f.z && p ? p[2] + d.z : d.z] }
    if (p) w.pos.set(d.entityId, p)
    w.events.push({ t, id: d.entityId, n, p: p ? p.slice() : null, bytes: buf ? buf.length : 0 })
  })
  return w
}

// One stand as a bot saw it between t0 and t1: moves a second, gaps between moves (ms), bytes, still tracked.
function standStats (w, id, t0, t1) {
  const ev = w.events.filter(e => e.id === id && e.t >= t0 && e.t <= t1)
  const ts = ev.filter(e => MOVES.has(e.n)).map(e => e.t)
  const gaps = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b)
  const q = f => gaps.length ? gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * f))] : Infinity
  const destroyed = w.destroyed.get(id)
  return {
    n: ts.length,
    rate: ts.length / ((t1 - t0) / 1000),
    median: q(0.5),
    p95: q(0.95),
    max: gaps.length ? gaps[gaps.length - 1] : Infinity,
    long: gaps.length ? gaps.filter(g => g > 75).length / gaps.length : 1, // share of gaps over 1.5 ticks
    bytes: ev.reduce((a, e) => a + e.bytes, 0) / ((t1 - t0) / 1000),
    tracked: w.spawned.has(id) && w.spawned.get(id) < t0 && !(destroyed !== undefined && destroyed <= t1)
  }
}

// Where the seat is against the model as a bot sees it: the drift of (seat - model) from what it was at rest, after each
// batch of packets (a tick's packets arrive together; a batch = events within 8 ms). The sedan's driver seat sits
// straight under the model (MTVehicles' mainx/mainz 0), so the rest offset is only vertical and doesn't turn with the car.
function seatView (w, skinId, seatId, t0, t1) {
  const last = (id, t) => { let p = null; for (const e of w.events) { if (e.t > t) break; if (e.id === id && e.p) p = e.p } return p }
  const k0 = last(skinId, t0), s0 = last(seatId, t0)
  if (!k0 || !s0) return { ok: false, rest: null, max: Infinity, mean: Infinity, n: 0 }
  const rest = [s0[0] - k0[0], s0[1] - k0[1], s0[2] - k0[2]]
  let k = k0, s = s0
  const errs = []
  let batchEnd = -1
  const flush = () => { errs.push(Math.hypot(s[0] - k[0] - rest[0], s[1] - k[1] - rest[1], s[2] - k[2] - rest[2])) }
  for (const e of w.events) {
    if (e.t < t0 || !e.p || (e.id !== skinId && e.id !== seatId)) continue
    if (e.t > t1) break
    if (batchEnd >= 0 && e.t > batchEnd) { flush(); batchEnd = -1 }
    if (batchEnd < 0) batchEnd = e.t + 8
    if (e.id === skinId) k = e.p; else s = e.p
  }
  if (batchEnd >= 0) flush()
  return { ok: Math.hypot(rest[0], rest[2]) < 0.05, rest, max: errs.length ? Math.max(...errs) : Infinity, mean: errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : Infinity, n: errs.length }
}

// The last carprobe block for a plate and mode in carprobe.log: its per-tick rows.
function probeRows (plate, mode, ticks) {
  const lines = fs.readFileSync(PROBE_LOG, 'utf8').split(/\r?\n/)
  let start = -1
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i].startsWith(`# carprobe ${plate} ticks=${ticks} mode=${mode} `)) { start = i; break }
  if (start < 0) return []
  const rows = []
  for (let i = start + 2; i < lines.length && !lines[i].startsWith('#'); i++) {
    const c = lines[i].split(',')
    if (c.length < 24) continue
    rows.push({
      mspt: +c[2], main: [+c[4], +c[5], +c[6]], mainYaw: +c[7], skin: [+c[8], +c[9], +c[10]], skinYaw: +c[11],
      skinEqMain: c[16] === 'true', seatErr: +c[17], skipped: c[19] === 'true', reapplied: c[20] === 'true', hitch: c[21] === 'true', mainStep: +c[22]
    })
  }
  return rows
}

// Resyncs of two stands a bot was sent between t0 and t1: each one's count, and how many of either have none of the other
// within 20 ms (a tick's packets arrive together).
function resyncPairs (w, a, b, t0, t1) {
  const at = id => w.events.filter(e => e.id === id && e.n === 'sync_entity_position' && e.t >= t0 && e.t <= t1).map(e => e.t)
  const sa = at(a), sb = at(b)
  const lone = (xs, ys) => xs.filter(t => !ys.some(u => Math.abs(u - t) <= 20))
  return { a: sa.length, b: sb.length, miss: lone(sa, sb).length + lone(sb, sa).length, loneA: lone(sa, sb).map(Math.round), loneB: lone(sb, sa).map(Math.round) }
}

// Every row of the last carprobe block for a plate, mode and length, with the resync columns (24-33).
function probeRowsFull (plate, mode, ticks) {
  const lines = fs.readFileSync(PROBE_LOG, 'utf8').split(/\r?\n/)
  let start = -1
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i].startsWith(`# carprobe ${plate} ticks=${ticks} mode=${mode} `)) { start = i; break }
  if (start < 0) return []
  const rows = []
  for (let i = start + 2; i < lines.length && !lines[i].startsWith('#'); i++) {
    const c = lines[i].split(',')
    if (c.length < 34) continue
    rows.push({ mainStep: +c[22], skinTd: +c[24], skinForce: c[25] === 'true', seatTd: +c[27], seatForce: c[28] === 'true', forced: c[30] === 'true', predicted: c[31] === 'true', prevSkin: c[32] === 'true', prevSeat: c[33] === 'true' })
  }
  return rows
}

const yawDiff = (a, b) => { const d = Math.abs(((a - b) % 360 + 540) % 360 - 180); return d }
const f1 = x => Number.isFinite(x) ? x.toFixed(1) : String(x)
const f0 = x => Number.isFinite(x) ? x.toFixed(0) : String(x)
const f3 = x => Number.isFinite(x) ? x.toFixed(3) : String(x)

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  let plate = null
  let modeBefore = 'track'
  let togetherBefore = 'on'
  try {
    const was = await cmd('dphone carsmooth')
    modeBefore = (was.match(/mode=(\w+)/) || [])[1] || 'track'
    togetherBefore = (was.match(/together=(on|off)/) || [])[1] || 'on'
    // ---------- Setup ----------
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} gray_concrete`)
    await cmd(`forceload add ${FAR_CHUNKS}`)
    await cmd(`fill ${FAR_PAD} gray_concrete`)
    await cmd(`forceload add ${N_CHUNKS}`)
    await cmd(`fill ${N_PAD} gray_concrete`)
    for (const name of [D, O, F, N]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`tag ${name} add donating_carcam_off`) // no chase camera in this test (carcam.js covers it)
      for (const m of [...String(await cmd(`dgarage info ${name}`)).matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)]) await cmd(`dgarage take ${name} ${m[1]}`)
    }
    const view = { [D]: watch(bots[D]), [O]: watch(bots[O]), [F]: watch(bots[F]), [N]: watch(bots[N]) }
    await cmd(`dlevel set ${D} 150`)
    await cmd(`zzheisttp ${O} ${WATCH.join(' ')}`)
    await cmd(`zzheisttp ${F} ${FAR.join(' ')}`)
    await cmd(`zzheisttp ${N} ${N_PAD_SPOT.join(' ')}`)
    await cmd('dphone carsmooth together on')
    const gave = await cmd(`dgarage give ${D} sedan Red`)
    plate = (gave.match(/: ([A-Z0-9-]+) vin=/) || [])[1]
    if (!plate) throw new Error(`no car: ${gave}`)
    await sleep(2000)

    let useHelper = false
    let keyChanges = 0
    const keys = async k => {
      keyChanges++
      if (useHelper) { await cmd(`dphone carsmooth input ${D} ${k || 'none'}`); return }
      bots[D]._client.write('player_input', { inputs: { forward: k.includes('w'), backward: k.includes('s'), left: k.includes('a'), right: k.includes('d'), jump: false, shift: false, sprint: false } })
    }
    const probe = async () => cmd(`dphone carprobe ${plate}`)
    const num = (s, k) => Number((s.match(new RegExp(`${k}=(-?[\\d.]+)`)) || [])[1])
    const pair = (s, k) => { const m = s.match(new RegExp(`${k}=(-?[\\d.]+)/(-?[\\d.]+)`)); return m ? [Number(m[1]), Number(m[2])] : [NaN, NaN] }
    const idsOf = s => Object.fromEntries(((s.match(/ids=(\S+)/) || [])[1] || '').split(',').filter(Boolean).map(x => x.split(':')).map(([k, v]) => [k, Number(v)]))
    const nbt = async (sel, key) => ((await cmd(`data get entity ${sel} ${key}`)).match(/data: \[([^\]]*)\]/) || [])[1] || ''

    // Puts the car at the start (the first time spawned there, then moved back with MTVehicles' own teleport, which
    // keeps one copy of each stand), the driver in it, MAIN turned east. Returns what it found.
    let spawnedOnce = false
    const place = async () => {
      await keys('')
      await cmd(`minecraft:ride ${D} dismount`).catch(() => {})
      if (!spawnedOnce) { await cmd(`zzcarspawn ${plate} ${START.join(' ')}`); spawnedOnce = true } else await cmd(`zzcartp ${plate} ${START.join(' ')}`)
      await sleep(500)
      await cmd(`zzheisttp ${D} ${START[0] - 2} ${Y} ${START[2]}`)
      await cmd(`zzcarmount ${D} ${plate}`)
      await sleep(400)
      // `at @s`: without it `~ ~ ~` is the console's spot (the world spawn).
      await cmd(`execute as @e[type=armor_stand,name=MTVEHICLES_MAIN_${plate}] at @s run minecraft:tp @s ~ ~ ~ -90 0`)
      await sleep(300)
      const main = `@e[type=armor_stand,name=MTVEHICLES_MAIN_${plate},limit=1]`
      const pos = (await nbt(main, 'Pos')).split(',').map(s => parseFloat(s))
      const yaw = parseFloat((await nbt(main, 'Rotation')).split(',')[0])
      const copies = [] // one RCON command at a time (the server drops a connection that sends two packets at once)
      for (const st of ['MAIN', 'SKIN', 'MAINSEAT']) copies.push(Number(((await cmd(`execute if entity @e[type=armor_stand,name=MTVEHICLES_${st}_${plate}]`)).match(/Count: (\d+)/) || [])[1] || 0))
      const seat = await cmd(`zzcarseat ${D}`)
      return { pos, yaw, copies, seated: seat.includes(`driver:${plate}`) }
    }
    const brake = async () => { await keys('s'); await sleep(1100); await keys(''); await sleep(600) }

    // ---------- Do a bot's own keys drive the car? ----------
    await cmd('dphone carsmooth off')
    await place()
    await cmd(`dphone carprobe ${plate} 30`)
    await keys('w')
    await sleep(1200)
    await brake()
    let p = await probe()
    const botMoved = num(p, 'moved')
    if (!(botMoved > 1)) {
      useHelper = true
      await place()
      await cmd(`dphone carprobe ${plate} 30`)
      await keys('w')
      await sleep(1200)
      await brake()
      p = await probe()
    }
    check(`the car drives under test input: ${useHelper ? 'NOT from the bot\'s own player_input (the /dphone carsmooth input helper drives it)' : 'the bot\'s own player_input packets reach MTVehicles'}`, num(p, 'moved') > 1, `bot=${botMoved} ${p}`)

    // ---------- The course, once per mode ----------
    const TICKS = 260 // the course (10 s), the brake, a moment standing
    const course = async () => {
      await keys('w'); await sleep(3000) // straight, nearly up to full speed
      await keys('wa'); await sleep(200) // slalom: 11 key changes, the heading swinging around east (CarSteer: gentler at speed than MTVehicles' 8° a tick)
      for (let i = 0; i < 9; i++) { await keys(i % 2 === 0 ? 'wd' : 'wa'); await sleep(400) }
      await keys('wd'); await sleep(200)
      await keys('wa'); await sleep(3000) // a circle (CarSteer's circle for the speed: a radius of about 13 blocks at full speed; MTVehicles' 8° a tick made it 4.6)
    }
    const drive = async mode => {
      await cmd(`dphone carsmooth ${mode}`)
      const at = await place()
      // The stands' ids (new after each /zzcartp), then both bots must have been sent them before the drive (the far
      // watcher: the seat, and the model only where CarSmooth raises its range).
      await cmd(`dphone carprobe ${plate} 1`)
      await sleep(250)
      const ids = idsOf(await probe())
      const tracks = mode === 'track' || mode === 'all'
      const ready = () => [D, O].every(b => view[b].spawned.has(ids.SKIN) && view[b].spawned.has(ids.MAINSEAT)) &&
        view[F].spawned.has(ids.MAINSEAT) && (!tracks || view[F].spawned.has(ids.SKIN))
      for (let i = 0; i < 50 && !ready(); i++) await sleep(100)
      await cmd(`dphone carprobe ${plate} ${TICKS}`)
      await sleep(250)
      const t0 = now()
      const k0 = keyChanges
      await course()
      const t1 = now()
      const k1 = keyChanges
      await brake()
      let sum = await probe()
      for (let i = 0; i < 60 && / running /.test(sum); i++) { await sleep(100); sum = await probe() }
      const rows = probeRows(plate, mode, TICKS)
      const moving = rows.filter(r => r.mainStep > 0.01)
      const far = rows.reduce((a, r) => Math.max(a, Math.hypot(r.main[0] - WATCH[0], r.main[2] - WATCH[2])), 0)
      const farD = rows.map(r => Math.hypot(r.main[0] - FAR[0], r.main[2] - FAR[2]))
      const onPlatform = rows.length > 0 && rows.every(r => Math.abs(r.main[1] - Y) < 0.01 && r.main[0] > X0 + 1 && r.main[0] < X1 - 1 && r.main[2] > Z0 + 1 && r.main[2] < Z1 - 1)
      // Ticks where "sync" would have had something to correct: the model off MAIN (spot or yaw), the seat off the model,
      // or a skipped MTVehicles movement tick (only meaningful in the runs without sync, where the rows are MTVehicles' own).
      const syncWork = moving.filter(r => !r.skinEqMain || yawDiff(r.mainYaw, r.skinYaw) > 1e-3 || r.seatErr > 1e-4 || r.skipped).length
      const r = {
        mode, at, sum, keys: k1 - k0, secs: (t1 - t0) / 1000,
        moved: num(sum, 'moved'), mspt: pair(sum, 'mspt'), err: pair(sum, 'seatErr'),
        skips: num(sum, 'skips'), reapplied: num(sum, 'reapplied'), hitches: num(sum, 'hitches'),
        rows: rows.length, movingTicks: moving.length, syncWork, far, onPlatform,
        farMin: farD.length ? Math.min(...farD) : NaN, farMax: farD.length ? Math.max(...farD) : NaN,
        end: rows.length ? rows[rows.length - 1].main : [NaN, NaN, NaN]
      }
      for (const b of [D, O]) {
        r[b] = {
          skin: standStats(view[b], ids.SKIN, t0, t1),
          seat: standStats(view[b], ids.MAINSEAT, t0, t1),
          carBytes: Object.values(ids).reduce((a, id) => a + standStats(view[b], id, t0, t1).bytes, 0),
          view: seatView(view[b], ids.SKIN, ids.MAINSEAT, t0, t1)
        }
      }
      // The far watcher: whether it was ever sent the model, the seat's and the model's moves, the driver on the seat.
      const driverId = bots[D].entity && bots[D].entity.id
      r[F] = {
        skinSpawned: view[F].spawned.has(ids.SKIN),
        skin: standStats(view[F], ids.SKIN, t0, t1),
        seat: standStats(view[F], ids.MAINSEAT, t0, t1),
        driverAboard: driverId !== undefined && (view[F].passengers.get(ids.MAINSEAT) || []).includes(driverId)
      }
      const st = s => `${f1(s.rate)}/s med ${f0(s.median)} p95 ${f0(s.p95)} max ${f0(s.max)}ms >75ms ${f0(s.long * 100)}%`
      r.farText = `${mode}: far watcher ${f1(r.farMin)}-${f1(r.farMax)} blocks away: SKIN ${r[F].skinSpawned ? 'sent' : 'never sent'}${r[F].skinSpawned ? ` (${st(r[F].skin)}, kept ${r[F].skin.tracked})` : ''} | MAINSEAT ${st(r[F].seat)} kept ${r[F].seat.tracked} | driver on the seat ${r[F].driverAboard}`
      const who = b => `${b === D ? 'driver' : 'watcher'}: SKIN ${st(r[b].skin)} | MAINSEAT ${st(r[b].seat)} | seat drift max/mean ${f3(r[b].view.max)}/${f3(r[b].view.mean)} | car ${f0(r[b].carBytes)} B/s`
      r.text = `${mode}: moved ${f1(r.moved)} (${r.movingTicks} moving ticks, ${r.keys} keys, farthest ${f1(far)} from the watcher, end ${r.end.map(f1).join(' ')}) server seatErr ${r.err.map(f3).join('/')} skips ${r.skips} reapplied ${r.reapplied} hitches ${r.hitches} syncWork ${syncWork} mspt ${r.mspt.join('/')} || ${who(O)} || ${who(D)}`
      return r
    }
    const runs = {}
    for (const mode of MODES) { runs[mode] = await drive(mode); await sleep(500) }
    const { off, sync, track, all } = runs
    const every = f => MODES.every(m => f(runs[m]))
    const texts = ms => ms.map(m => runs[m].text).join('  ##  ')
    const bothBots = f => [D, O].every(b => f(b))

    check('every run started the same way: one copy of each stand at the start line, MAIN facing east (yaw -90), the driver in the seat',
      every(r => r.at.seated && r.at.copies.every(c => c === 1) && Math.abs(yawDiff(r.at.yaw, -90)) < 0.5 && Math.hypot(r.at.pos[0] - START[0], r.at.pos[2] - START[2]) < 0.1),
      MODES.map(m => `${m}: ${JSON.stringify(runs[m].at)}`).join(' | '))
    check('every run drove the same course on the platform: the same keys, the path length within 10% of off\'s, always at y 200, and at most 56 blocks from the watcher (armor stands are only sent within 64)',
      every(r => r.keys === off.keys && r.moved > 60 && Math.abs(r.moved - off.moved) <= 0.1 * off.moved && r.onPlatform && r.far <= 56),
      MODES.map(m => `${m}: moved ${f1(runs[m].moved)} keys ${runs[m].keys} farthest ${f1(runs[m].far)} on platform ${runs[m].onPlatform} end ${runs[m].end.map(f1).join(' ')}`).join(' | '))
    check('both bots were sent the car\'s model (SKIN) and the driver\'s seat (MAINSEAT) before every drive, and kept them to the end',
      every(r => bothBots(b => r[b].skin.tracked && r[b].seat.tracked && r[b].skin.n > 20 && r[b].seat.n > 20)),
      texts(MODES))
    // Measured 2026-09-29: with carsmooth off the seat already sits on the model and no key change skips a tick
    // (against the research's reading of MTVehicles' bytecode); what makes cars look choppy is the tracker sending armor
    // stands every 3rd tick (ServerEntity updateInterval 3).
    const every3rd = s => s.rate >= 5.5 && s.rate <= 7.5 && s.median >= 125
    check('the problem, carsmooth off: the driver and the watcher get the model and the seat only every 3rd tick (5.5-7.5 moves a second, gaps of ~150 ms)',
      bothBots(b => every3rd(off[b].skin) && every3rd(off[b].seat)), off.text)
    const everyTick = s => s.rate >= 16 && s.median <= 60 && s.long <= 0.1
    check('carsmooth track: the driver and the watcher get the model and the seat every tick (at least 16 moves a second, gaps of ~50 ms, at most 10% over 75 ms)',
      bothBots(b => everyTick(track[b].skin) && everyTick(track[b].seat)), texts(['off', 'track']))
    check('carsmooth all: the same, every tick for the model and the seat, at the driver and the watcher',
      bothBots(b => everyTick(all[b].skin) && everyTick(all[b].seat)), texts(['off', 'all']))
    check('carsmooth track and all: the longest wait between the model\'s moves is shorter than with off (both bots)',
      bothBots(b => track[b].skin.max < off[b].skin.max && all[b].skin.max < off[b].skin.max && track[b].seat.max < off[b].seat.max && all[b].seat.max < off[b].seat.max),
      MODES.map(m => `${m}: watcher SKIN max ${f0(runs[m][O].skin.max)} MAINSEAT max ${f0(runs[m][O].seat.max)}, driver SKIN max ${f0(runs[m][D].skin.max)} MAINSEAT max ${f0(runs[m][D].seat.max)} ms`).join(' | '))
    check('the driver\'s seat stays on the model, as both bots see it and on the server: never drifting more than 0.05 blocks in any mode (no worse than off)',
      every(r => r.err[1] <= 0.05 && bothBots(b => r[b].view.ok && r[b].view.max <= Math.max(0.05, off[b].view.max + 0.01))),
      MODES.map(m => `${m}: server ${runs[m].err.map(f3).join('/')} watcher ${f3(runs[m][O].view.max)} driver ${f3(runs[m][D].view.max)} (rest offset ${(runs[m][O].view.rest || []).map(f3).join(',')})`).join(' | '))
    // The research's other two fixes ("sync"): the seat a tick behind the model and the key-change skip. If MTVehicles
    // really did either, the off and track runs (MTVehicles' own placement) would show it here.
    check('carsmooth sync has nothing to correct: in the runs without it (off, track) MTVehicles already had the model on MAIN (spot and yaw), the seat on the model and no skipped tick, on every moving tick; the sync run looks like off',
      off.syncWork === 0 && track.syncWork === 0 && off.skips === 0 && track.skips === 0 && sync.reapplied === 0 &&
        bothBots(b => every3rd(sync[b].skin) && every3rd(sync[b].seat)),
      `ticks sync would have corrected: off ${off.syncWork}/${off.movingTicks}, track ${track.syncWork}/${track.movingTicks}; skips off ${off.skips} track ${track.skips}; the sync run reapplied ${sync.reapplied}, all ${all.reapplied}  ##  ${texts(['sync'])}`)
    // The floating driver: an armor stand is tracked within spigot.yml's 64 blocks, the seat carrying a player within
    // the player's 128, so between the two others saw the driver sitting on nothing. CarSmooth's track raises the car's
    // stands to carsmooth.range (128).
    const farTexts = ms => ms.map(m => runs[m].farText).join(' | ')
    check('the far watcher stayed 72-120 blocks from the car in every run (past the armor stands\' 64, inside the driver\'s 128)',
      every(r => r.farMin >= 72 && r.farMax <= 120), farTexts(MODES))
    check('the floating driver, carsmooth off and sync: the far watcher is sent the driver on his seat (the seat moving, the driver aboard) but never the car model',
      ['off', 'sync'].every(m => { const f = runs[m][F]; return !f.skinSpawned && f.seat.tracked && f.seat.n > 20 && f.driverAboard }), farTexts(MODES))
    check('the fix, carsmooth track and all: the far watcher is sent the car model too (before the drive, kept to the end) and gets its moves every tick, like the seat\'s',
      ['track', 'all'].every(m => { const f = runs[m][F]; return f.skin.tracked && everyTick(f.skin) && everyTick(f.seat) && f.driverAboard }), farTexts(MODES))
    check('the cost stays small: the average tick with carsmooth all is at most 3 ms longer than with it off',
      all.mspt[0] <= off.mspt[0] + 3,
      MODES.map(m => `${m}: mspt ${runs[m].mspt.join('/')}, the watcher is sent ${f0(runs[m][O].carBytes)} B/s for the car`).join(' | '))

    // ---------- Resyncing together: a 32 s drive with a new watcher coming and going ----------
    await cmd('dphone carsmooth track')
    await cmd('dphone carsmooth together on')
    await place()
    await cmd(`dphone carprobe ${plate} 1`)
    await sleep(250)
    const tids = idsOf(await probe())
    for (let i = 0; i < 50 && ![D, O, F].every(b => view[b].spawned.has(tids.SKIN) && view[b].spawned.has(tids.MAINSEAT)); i++) await sleep(100)
    const LONG = 640
    await cmd(`dphone carprobe ${plate} ${LONG}`)
    await sleep(250)
    const tt0 = now()
    await keys('w'); await sleep(2000)
    await keys('wa'); await sleep(4000) // circling from here on
    const nIn1 = now()
    await cmd(`zzheisttp ${N} ${N_WATCH.join(' ')}`) // into range mid-drive: it starts tracking the car
    await sleep(8000)
    const nOut = now()
    await cmd(`zzheisttp ${N} ${N_PAD_SPOT.join(' ')}`)
    await sleep(4000)
    const nIn2 = now()
    await cmd(`zzheisttp ${N} ${N_WATCH.join(' ')}`) // and again
    await sleep(12500)
    const tt1 = now()
    await brake()
    let lsum = await probe()
    for (let i = 0; i < 80 && / running /.test(lsum); i++) { await sleep(100); lsum = await probe() }
    const lrows = probeRowsFull(plate, 'track', LONG)
    const nSpawns = [nIn1, nIn2].map(t => { const s = view[N].spawned.get(tids.SKIN); return s !== undefined && s >= t })
    const nSpawnedSkin = view[N].events.filter(e => e.id === tids.SKIN && e.n === 'spawn_entity' && e.t >= nIn1).length
    const nSpawnedSeat = view[N].events.filter(e => e.id === tids.MAINSEAT && e.n === 'spawn_entity' && e.t >= nIn1).length
    const pr = {}
    for (const b of [D, O, F, N]) pr[b] = resyncPairs(view[b], tids.SKIN, tids.MAINSEAT, tt0, tt1 + 1500)
    const prText = [D, O, F, N].map(b => `${b}: SKIN ${pr[b].a} MAINSEAT ${pr[b].b} alone ${pr[b].miss}${pr[b].miss ? ` (SKIN ${pr[b].loneA.join(' ')} MAINSEAT ${pr[b].loneB.join(' ')})` : ''}`).join(' | ')
    const maxTd = lrows.reduce((a, r) => Math.max(a, r.skinTd, r.seatTd), 0)
    const forcedRows = lrows.filter(r => r.forced).length
    check('the together drive: 32 s in track mode (past the 20 s periodic resync), the probe ran every tick, and the new watcher was sent the car both times it came into range (and left in between)',
      lrows.length >= LONG - 5 && num(lsum, 'moved') > 60 && nSpawnedSkin >= 2 && nSpawnedSeat >= 2 && view[N].everDestroyed.has(tids.SKIN),
      `${lsum} | rows ${lrows.length} | N spawns SKIN ${nSpawnedSkin} MAINSEAT ${nSpawnedSeat} (${nSpawns}) out at ${Math.round(nOut - tt0)} ms`)
    check('while driving, the periodic resync never comes near (teleportDelay kept at 0-1 on the model and the seat, not counting up to 400)',
      lrows.length > 0 && maxTd <= 2, `max teleportDelay ${maxTd}`)
    check('every resync of the car\'s model (SKIN) reaches every bot in the same tick as one of the driver\'s seat (MAINSEAT) and back: the driver, the watcher, the far watcher and the one who came into range mid-drive (none alone)',
      [D, O, F, N].every(b => pr[b].miss === 0) && [D, O].every(b => pr[b].a >= 2), prText)
    // (A teleported player is usually added by the tracker the tick its chunks arrive, which the pre-tracker prediction
    // can't see: then the new-tracker event flags the rest of the car. Either way both resync in one tick.)
    check('the probe: no tick where exactly one of SKIN and MAINSEAT resynced (target 0), with the new watcher\'s tracking seen both times (at least 4 new trackers: the model and the seat, twice) and resyncs of both counted',
      / together=true /.test(lsum) && num(lsum, 'oneResync') === 0 && num(lsum, 'events') >= 4 && num(lsum, 'bothResync') >= 2,
      `${lsum} | forced rows ${forcedRows}, predicted ${lrows.filter(r => r.predicted).length}`)
  } finally {
    await rcon.cmd(`dphone carsmooth ${modeBefore}`).catch(() => {})
    await rcon.cmd(`dphone carsmooth together ${togetherBefore}`).catch(() => {})
    for (const name of [D, O, F, N]) {
      await rcon.cmd(`minecraft:ride ${name} dismount`).catch(() => {})
      await rcon.cmd(`tag ${name} remove donating_carcam_off`).catch(() => {})
      for (const m of [...String(await rcon.cmd(`dgarage info ${name}`).catch(() => '')).matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)]) {
        await rcon.cmd(`dgarage take ${name} ${m[1]}`).catch(() => {})
        await rcon.cmd(`zzcardelete ${m[1]}`).catch(() => {})
      }
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} 0.5 68 -656.5`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    await rcon.cmd(`fill ${FAR_PAD} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${FAR_CHUNKS}`).catch(() => {})
    await rcon.cmd(`fill ${N_PAD} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${N_CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
