// One bundle per car and tick (DonatingPhone CarBundle.java; owner, 2026-09-30: "drive in the hotrod car and look how
// the player lags into the back seat"). In the 26.3 client a frame could start between the model's (SKIN) move and the
// seat's (MAINSEAT) of the same tick; when that frame ran a tick, the seat (and its rider) stayed a tick behind the model
// for as long as the car moved. Now every entity of a driven car (MAIN, SKIN, the seats, the chase camera) has its
// movement packets held and sent to each player as one bundle at the end of the tick, which the client handles in one go.
// What the bots check, from the packets they're sent (minecraft-protocol emits a bundle's delimiters around its packets):
// while the car drives, every move of its stands arrives inside a bundle, the model and the seat in the same one every
// time, each bundle holding only that car's packets (at most 30); other entities' packets (the driver, a walker) aren't
// held; /dphone carsmooth bundle off sends them one by one again (and on brings it back, saved); the car's entities
// leave the list about 2 s after nobody drives it.
const fs = require('fs')
const path = require('path')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const D = 'BunD' // drives
const W = 'BunW' // watches from the side
const Y = 200
const X0 = 7400, X1 = 7560, Z0 = 7400, Z1 = 7520
const CHUNKS = `${X0} ${Z0} ${X1} ${Z1}`
const PLATFORM = `${X0} ${Y - 1} ${Z0} ${X1} ${Y - 1} ${Z1}`
const START = [7420.5, Y, 7460.5] // facing east
const WATCH = [7455.5, Y, 7445.5]
// Packets about an entity's movement (CarBundle holds these for a car's entities).
const MOVEMENT = new Set(['rel_entity_move', 'entity_move_look', 'entity_look', 'sync_entity_position', 'entity_teleport', 'entity_head_rotation', 'entity_velocity'])
const POS = new Set(['rel_entity_move', 'entity_move_look'])
const now = () => Number(process.hrtime.bigint()) / 1e6
const SWITCHES = path.join(__dirname, '..', '..', 'server', 'plugins', 'DonatingPhone', 'carsmooth.yml')
const saved = () => { try { return fs.readFileSync(SWITCHES, 'utf8') } catch (e) { return '' } }

// Every packet a bot is sent, in order, with the bundle it came in (null: outside any).
function record (bot) {
  const r = { ev: [], bundle: null, n: 0 }
  bot._client.on('packet', (d, meta) => {
    if (meta.name === 'bundle_delimiter') {
      if (r.bundle === null) r.bundle = ++r.n
      else r.bundle = null
      return
    }
    if (!d || d.entityId === undefined || !MOVEMENT.has(meta.name)) return
    r.ev.push({ t: now(), id: d.entityId, n: meta.name, b: r.bundle })
  })
  return r
}

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  let plate = null
  let before = 'on'
  let clockBefore = 'on'
  try {
    const was = await cmd('dphone carsmooth')
    before = (was.match(/bundle=(on|off)/) || [])[1] || 'on'
    clockBefore = (was.match(/via-clock=(on|off)/) || [])[1] || 'on'
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} gray_concrete`)
    for (const name of [D, W]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`tag ${name} add donating_carcam_off`)
      for (const m of [...String(await cmd(`dgarage info ${name}`)).matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)]) await cmd(`dgarage take ${name} ${m[1]}`)
    }
    const rec = { [D]: record(bots[D]), [W]: record(bots[W]) }
    await cmd(`dlevel set ${D} 150`)
    await cmd(`zzheisttp ${W} ${WATCH.join(' ')}`)
    await cmd('dphone carsmooth bundle on')
    const gave = await cmd(`dgarage give ${D} sedan Red`)
    plate = (gave.match(/: ([A-Z0-9-]+) vin=/) || [])[1]
    if (!plate) throw new Error(`no car: ${gave}`)
    await sleep(1500)

    const st = await cmd(`dphone carbundle ${W}`)
    const stD = await cmd(`dphone carbundle ${D}`)
    check('/dphone carbundle: on, working, a handler on each bot\'s connection', /on=true state=ok/.test(st) && st.includes('installed:true') && stD.includes('installed:true'), `${st} | ${stD}`)
    // The shared ViaVersion clock (26.3 clients only: bots speak 1.21.11, so ViaVersion's 26.3 step timing never runs
    // for them; the owner's client checked it, PLAYTEST): ViaVersion's classes found, and the switch saved to carsmooth.yml.
    const clkOff = await cmd('dphone carsmooth via-clock off')
    const ymlOff = saved()
    const clkOn = await cmd('dphone carsmooth via-clock on')
    const ymlOn = saved()
    check('the shared ViaVersion clock: its classes found (via=ok), the switch works both ways and is saved in carsmooth.yml', / via=ok /.test(st) && clkOff.includes('via-clock=off') && /via-clock: false/.test(ymlOff) && clkOn.includes('via-clock=on') && /via-clock: true/.test(ymlOn), `${st} | ${clkOff.slice(-40)} | ${clkOn.slice(-40)} | yml off=${/via-clock: false/.test(ymlOff)} on=${/via-clock: true/.test(ymlOn)}`)

    const keys = k => bots[D]._client.write('player_input', { inputs: { forward: k.includes('w'), backward: k.includes('s'), left: k.includes('a'), right: k.includes('d'), jump: false, shift: false, sprint: false } })
    const idsOf = s => Object.fromEntries(((s.match(/ids=(\S+)/) || [])[1] || '').split(',').filter(Boolean).map(x => x.split(':')).map(([k, v]) => [k, Number(v)]))
    let spawned = false
    const place = async () => {
      keys('')
      await cmd(`minecraft:ride ${D} dismount`).catch(() => {})
      if (!spawned) { await cmd(`zzcarspawn ${plate} ${START.join(' ')}`); spawned = true } else await cmd(`zzcartp ${plate} ${START.join(' ')}`)
      await sleep(500)
      await cmd(`zzheisttp ${D} ${START[0] - 2} ${Y} ${START[2]}`)
      await cmd(`zzcarmount ${D} ${plate}`)
      await sleep(400)
      await cmd(`execute as @e[type=armor_stand,name=MTVEHICLES_MAIN_${plate}] at @s run minecraft:tp @s ~ ~ ~ -90 0`)
      await sleep(300)
      await cmd(`dphone carprobe ${plate} 1`)
      await sleep(250)
      return idsOf(await cmd(`dphone carprobe ${plate}`))
    }
    // Straight up to speed, then a circle, then the brake; returns the time window of the driving part.
    const drive = async () => {
      const t0 = now()
      // The driver looks around on the way (a passenger's turns go out to the watcher: they must not be held with the car).
      keys('w'); await sleep(1500)
      await cmd(`minecraft:rotate ${D} 40 10`); await sleep(1500)
      keys('wa'); await sleep(1500)
      await cmd(`minecraft:rotate ${D} -150 -10`); await sleep(1500)
      const t1 = now()
      keys('s'); await sleep(1000)
      keys(''); await sleep(700)
      return [t0 + 300, t1] // past the first moves of the start
    }
    // What a bot got of the car's stands in a window: the moves inside / outside bundles, ticks where the model moved
    // and the seat's move wasn't in the same bundle, bundles mixing in another entity, the biggest bundle.
    const look = (r, ids, t0, t1, others) => {
      const car = new Set(Object.values(ids))
      const ev = r.ev.filter(e => e.t >= t0 && e.t <= t1)
      const carEv = ev.filter(e => car.has(e.id))
      const inside = carEv.filter(e => e.b !== null).length
      const byBundle = new Map()
      for (const e of ev) if (e.b !== null) { if (!byBundle.has(e.b)) byBundle.set(e.b, []); byBundle.get(e.b).push(e) }
      let carBundles = 0, mixed = 0, apart = 0, biggest = 0
      for (const list of byBundle.values()) {
        if (!list.some(e => car.has(e.id))) continue
        carBundles++
        biggest = Math.max(biggest, list.length)
        if (list.some(e => !car.has(e.id))) mixed++
        const skin = list.some(e => e.id === ids.SKIN && POS.has(e.n)), seat = list.some(e => e.id === ids.MAINSEAT && POS.has(e.n))
        if (skin !== seat) apart++
      }
      // A model move outside any bundle, or with no seat move in its bundle, counts too.
      const loneSkin = carEv.filter(e => e.id === ids.SKIN && POS.has(e.n) && e.b === null).length
      const otherHeld = ev.filter(e => others.includes(e.id) && e.b !== null && (byBundle.get(e.b) || []).some(x => car.has(x.id))).length
      return { moves: carEv.length, inside, outside: carEv.length - inside, carBundles, mixed, apart: apart + loneSkin, biggest, otherHeld,
        skinMoves: carEv.filter(e => e.id === ids.SKIN && POS.has(e.n)).length }
    }
    const fmt = s => `moves=${s.moves} inside=${s.inside} outside=${s.outside} bundles=${s.carBundles} mixed=${s.mixed} apart=${s.apart} biggest=${s.biggest} otherHeld=${s.otherHeld} skinMoves=${s.skinMoves}`
    const entityId = name => bots[name].entity && bots[name].entity.id

    // ---------- Bundle on ----------
    let ids = await place()
    check('the car\'s stand ids from the probe (MAIN, SKIN, MAINSEAT)', ids.MAIN > 0 && ids.SKIN > 0 && ids.MAINSEAT > 0, JSON.stringify(ids))
    let [t0, t1] = await drive()
    const others = [entityId(D), entityId(W)].filter(x => x !== undefined)
    const sw = look(rec[W], ids, t0, t1, others), sd = look(rec[D], ids, t0, t1, others)
    check('bundle on, the watcher: every move of the car\'s stands arrives inside a bundle (the drive: 5.4 s)', sw.skinMoves > 60 && sw.outside === 0, fmt(sw))
    check('bundle on, the watcher: the model\'s and the seat\'s moves of a tick always in the same bundle', sw.carBundles > 60 && sw.apart === 0, fmt(sw))
    check('bundle on, the watcher: a car bundle holds only that car\'s packets, at most 30 (minecraft-protocol unpacks up to 32)', sw.mixed === 0 && sw.biggest >= 2 && sw.biggest <= 30 && sw.otherHeld === 0, fmt(sw))
    check('bundle on, the driver\'s own connection the same', sd.skinMoves > 60 && sd.outside === 0 && sd.apart === 0 && sd.mixed === 0, fmt(sd))
    // The driver bot as the watcher sees it (a passenger: turns only) is never held with the car.
    const dTurns = rec[W].ev.filter(e => e.id === entityId(D) && e.t >= t0 && e.t <= t1)
    check('the driver\'s own packets (as the watcher gets them: they looked around) aren\'t held with the car', dTurns.length > 0 && dTurns.every(e => e.b === null || !rec[W].ev.some(x => x.b === e.b && Object.values(ids).includes(x.id))), `driverPackets=${dTurns.length} inBundles=${dTurns.filter(e => e.b !== null).length}`)
    const after = await cmd(`dphone carbundle ${W}`)
    const driving = after
    check('a 1.21.11 bot\'s connection has no ViaVersion 26.3 tracker: the clock leaves it alone', after.includes('via26_3:no') && /,shared:0,/.test(after), after)
    check('/dphone carbundle counts the bundles sent to the watcher', Number((after.match(/=bundles:(\d+)/) || [])[1]) > 60, after)

    // ---------- Bundle off (A/B) ----------
    const off = await cmd('dphone carsmooth bundle off')
    const offSaved = /bundle: false/.test(saved())
    ids = await place()
    ;[t0, t1] = await drive()
    const so = look(rec[W], ids, t0, t1, others)
    check('bundle off: the car\'s moves go out one by one again', off.includes('bundle=off') && so.skinMoves > 60 && so.inside <= 2, `${fmt(so)} | ${off}`)
    const on = await cmd('dphone carsmooth bundle on')
    const yml = await cmd('dphone carsmooth')
    check('bundle off and on again, saved in carsmooth.yml each time', on.includes('bundle=on') && yml.includes('bundle=on') && offSaved && /bundle: true/.test(saved()), `${on} | saved off=${offSaved}`)

    // ---------- Nobody drives: the list empties ----------
    await cmd(`minecraft:ride ${D} dismount`)
    // Entities leave the list 40 ticks after their car was last driven, checked every 20: within 3 s, polled to 8 s.
    let idle = ''
    for (let i = 0; i < 16; i++) { await sleep(500); idle = await cmd('dphone carbundle'); if (!idle.includes(plate + '=')) break }
    check('about 2 s after nobody drives the car, none of its entities are held any more (all 4 were while it drove)', driving.includes(plate + '=4') && / cars=/.test(idle) && !idle.includes(plate + '='), `${idle} | while driving: ${driving}`)
  } finally {
    await cmd(`dphone carsmooth bundle ${before}`).catch(() => {})
    await cmd(`dphone carsmooth via-clock ${clockBefore}`).catch(() => {})
    if (plate) { await cmd(`dgarage take ${D} ${plate}`).catch(() => {}); await cmd(`zzcardelete ${plate}`).catch(() => {}) }
    for (const name of Object.keys(bots)) {
      await cmd(`tag ${name} remove donating_carcam_off`).catch(() => {})
      await cmd(`zzheisttp ${name} 0.5 68 -656.5`).catch(() => {})
      await quit(bots[name]).catch(() => {})
    }
    await cmd(`dlevel reset ${D}`).catch(() => {})
    await cmd(`fill ${PLATFORM} air`).catch(() => {})
    await cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
