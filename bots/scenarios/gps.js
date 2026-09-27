// The GPS (gps.sk + the phone plugin): the road scan (road, open ground, water), a pin's way along the roads
// (by car only on the road; on foot across the plaza, around the water), another way at once from another
// street, the way on the phone map, the boss bar, the dot on the locator bar and the dust trail (that player
// only), arriving (also passing through the area at speed), the pause inside a heist, dropping and removing
// a pin with a left-click on the big map, and /gps.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'GpsA'
const B = 'GpsB'
const Y = 200 // standing height (the platform is at Y - 1)
// Inside the local test city (maps 0/20/23/24: x -64..191, z -704..-449).
const X1 = 40, X2 = 110, Z1 = -690, Z2 = -630
const PLATFORM = `${X1} ${Y - 1} ${Z1} ${X2} ${Y - 1} ${Z2}`
const CHUNKS = `${X1} ${Z1} ${X2} ${Z2}`
const HID = 'zgps'
const FAR = '0.5 68 -656.5'
// A U of road (black concrete): west x 45-47, south z -642..-640, east x 103-105; a plaza between, a pool in it.
const START = [46.5, Y, -678.5] // the west road's north end
const PIN = [104.5, Y, -678.5]  // the east road's north end

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const gps = async name => cmd(`dphone gps ${name}`)
    const field = (s, k) => (s.match(new RegExp(`${k}=(\\S*)`)) || [])[1] || ''
    const num = (s, k) => Number(field(s, k))
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(200) }
      return Boolean(await fn())
    }
    // A pin the way a player drops one (the big map's left-click runs /gpspick), after clearing any old one.
    const pin = async (name, x, z) => {
      bots[name].chat('/gps clear')
      await sleep(400)
      await cmd(`gpspick ${name} ${x} ${z} 2`)
      await sleep(400)
    }

    // ---------- Setup: the road U, the plaza, the pool ----------
    await cmd('zzcfgreload')
    await cmd(`dheist delete ${HID} confirm`)
    await cmd(`rg remove -w world heist_${HID}`)
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} smooth_stone`)
    await cmd(`fill 45 ${Y - 1} -680 47 ${Y - 1} -640 black_concrete`)
    await cmd(`fill 45 ${Y - 1} -642 105 ${Y - 1} -640 black_concrete`)
    await cmd(`fill 103 ${Y - 1} -680 105 ${Y - 1} -640 black_concrete`)
    await cmd(`fill 60 ${Y} -685 90 ${Y} -667 glass`) // the pool's rim (across the straight line)...
    await cmd(`fill 61 ${Y} -684 89 ${Y} -668 water`) // ...and its water
    await cmd(`fill ${X1} ${Y} ${Z1} ${X2} ${Y + 6} ${Z2} air replace smooth_stone`) // nothing left standing on the road
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`dphone gps ${name} clear`)
      await cmd(`zzdata ${name} gps-tip none`) // the big map's one-time tip shows again
    }
    const bars = new Map()
    bots[A]._client.on('boss_bar', p => {
      if (p.action === 1) { bars.delete(p.entityUUID); return }
      const b = bars.get(p.entityUUID) || {}
      if (p.title !== undefined) b.title = require('prismarine-chat')(bots[A].registry).fromNotch(p.title).toString()
      bars.set(p.entityUUID, b)
    })
    const barText = () => JSON.stringify([...bars.values()])
    const waypoints = { [A]: [], [B]: [] }
    const particles = { [A]: 0, [B]: 0 }
    const screen = { [A]: new Array(128 * 128).fill(0) }
    for (const name of [A, B]) {
      bots[name]._client.on('tracked_waypoint', p => waypoints[name].push(p))
      bots[name]._client.on('world_particles', () => { particles[name]++ })
    }
    bots[A]._client.on('map', p => {
      if (p.columns) for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.columns; c++) screen[A][(p.y + r) * 128 + p.x + c] = p.data[r * p.columns + c]
    })
    await sleep(2500)
    await cmd(`minecraft:tp ${A} ${START.join(' ')} 180 0`) // on the west road, facing north
    await cmd(`zzheisttp ${B} 60.5 ${Y} -645.5`)
    await sleep(1500)

    // ---------- The road scan ----------
    let t0 = Date.now()
    await cmd(`dphone roads scan ${X1} ${Z1} ${X2} ${Z2}`)
    const scanned = await until(async () => { const r = await cmd('dphone roads info'); return /road=\d+/.test(r) && !/scanning=/.test(r) && Number((r.match(/road=(\d+)/) || [])[1]) > 100 }, 60000)
    const info = await cmd('dphone roads info')
    check('staff scan the city for roads: road, open ground and water (blocked) cells', scanned && Number(info.match(/road=(\d+)/)[1]) >= 200 && Number(info.match(/blocked=(\d+)/)[1]) >= 200, `${info} (${Date.now() - t0} ms)`)

    // ---------- A pin: the way along the roads ----------
    await cmd(`ride ${A} dismount`)
    await cmd(`summon minecart ${START.join(' ')} {Tags:["gpstest"]}`)
    await cmd(`ride ${A} mount @e[tag=gpstest,limit=1]`)
    await sleep(500)
    await pin(A, PIN[0], PIN[2])
    let s = ''
    await until(async () => { s = await gps(A); return /state=route/.test(s) && /car=true/.test(s) }, 5000)
    const straight = Math.hypot(PIN[0] - START[0], PIN[2] - START[2])
    check('in a car the way keeps to the road: down the west road, along the south road, up the east one', /state=route/.test(s) && num(s, 'walk') > 90 && num(s, 'walkRoad') === num(s, 'walk') && num(s, 'left') > straight * 1.8, `${s} (straight ${straight.toFixed(1)})`)
    check('...and the next corner (where the dot sits) is down the west road, with a left turn there', field(s, 'next') !== 'none' && /turn=left@/.test(s) && Number(field(s, 'next').split(',')[2]) > -678, s)
    await cmd(`ride ${A} dismount`)
    await cmd('minecraft:kill @e[tag=gpstest]')
    await cmd(`minecraft:tp ${A} ${START.join(' ')} 180 0`)
    await until(async () => { s = await gps(A); return /car=false/.test(s) && /state=route/.test(s) }, 5000)
    await sleep(500) // one more update: the way is walked again with the walkers' field
    s = await gps(A)
    check('on foot the way cuts across the plaza (shorter), but around the water, never through it', num(s, 'walkRoad') < num(s, 'walk') && num(s, 'walkBlocked') === 0 && num(s, 'walk') < 90 && num(s, 'left') < straight * 1.6, s)
    // Taking another street: the best way from the new spot is known at once (no new search).
    const version = num(s, 'version')
    await cmd(`minecraft:tp ${A} 75.5 ${Y} -641.5 180 0`) // the south road
    await sleep(600)
    s = await gps(A)
    check('taking another street: at once a new way from there (the same flow field, no new search)', /state=route/.test(s) && num(s, 'version') === version && Math.abs(num(s, 'left') - (Math.abs(PIN[2] + 641.5) + Math.abs(PIN[0] - 75.5))) < 20, s)

    // ---------- Shown only to that player ----------
    await sleep(1500)
    check('the boss bar: "GPS · Pin <arrow> <n>m"', /GPS . Pin .*\d+m/.test(barText()), barText())
    const standId = await (async () => {
      const m = (await cmd('data get entity @e[tag=donating_gps,limit=1] UUID')).match(/\[I; (-?\d+), (-?\d+), (-?\d+), (-?\d+)\]/)
      if (!m) return ''
      const hex = m.slice(1).map(n => (Number(n) >>> 0).toString(16).padStart(8, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    })()
    const dotA = waypoints[A].some(p => p.waypoint && p.waypoint.uuid === standId && p.waypoint.icon && p.waypoint.icon.color && p.waypoint.icon.color.red === 208 && p.waypoint.icon.color.green === 64 && p.waypoint.icon.color.blue === 224)
    const dotB = waypoints[B].some(p => p.waypoint && p.waypoint.uuid === standId)
    check('the dot on the locator bar (pin purple): the player\'s, and nobody else\'s', standId !== '' && dotA && !dotB, `${standId} A=${dotA} B=${dotB}`)
    particles[A] = particles[B] = 0
    await sleep(1600)
    check('the dust trail on the way ahead: for the player only', particles[A] >= 8 && particles[B] === 0, `A=${particles[A]} B=${particles[B]}`)
    // The phone map: hold the phone, the route's pixels are on it.
    bots[A].setQuickBarSlot(8)
    await sleep(2500)
    const st = await cmd(`dphone status ${A}`)
    const routeByte = Number((st.match(/route=(-?\d+),/) || [])[1])
    const routePx = screen[A].filter(v => ((v << 24) >> 24) === routeByte || v === (routeByte & 255)).length
    check('the phone map shows the way (route pixels on the held phone)', routePx >= 10, `route byte ${routeByte}: ${routePx} pixels; ${st}`)
    bots[A].setQuickBarSlot(0)

    // ---------- Arriving ----------
    let t = Date.now()
    await cmd(`minecraft:tp ${A} ${PIN[0]} ${Y} ${PIN[2] + 4} 180 0`)
    const arrived = await until(async () => !/slots=\S*pin/.test(await gps(A)), 3000)
    check('arriving inside the pin\'s area: the pin is cleared ("Arrived")', arrived && /Arrived/.test(text(A, t)), `${await gps(A)} ${text(A, t)}`)
    // Passing through the area between two checks (a car at speed).
    await pin(A, PIN[0], -660.5)
    // A car's step between two checks (18 blocks, both ends outside the 8-block area) counts...
    await cmd(`minecraft:tp ${A} ${PIN[0]} ${Y} -669.5 0 0`)
    await sleep(700)
    await cmd(`minecraft:tp ${A} ${PIN[0]} ${Y} -651.5 0 0`)
    const passed = await until(async () => !/slots=\S*pin/.test(await gps(A)), 3000)
    check('passing right through the area between two checks (an 18-block step) still counts as arriving', passed, await gps(A))
    // ...a teleport across it (40 blocks: a respawn, /spawn, an eviction) doesn't.
    await pin(A, PIN[0], -660.5)
    await cmd(`minecraft:tp ${A} ${PIN[0]} ${Y} -680.5 0 0`)
    await sleep(700)
    await cmd(`minecraft:tp ${A} ${PIN[0]} ${Y} -640.5 0 0`)
    await sleep(1500)
    check('...but a teleport across it doesn\'t (the pin stays)', /slots=\S*pin/.test(await gps(A)), await gps(A))

    // ---------- Inside a heist: nothing in the world ----------
    await cmd(`zzregion heist_${HID} 86 ${Y - 1} -672 100 ${Y + 6} -662`)
    await cmd(`dheist create ${HID} 1`)
    await cmd(`dheist set ${HID} level 0`)
    await cmd(`dheist exit ${HID} 95.5 ${Y} -650.5`)
    await cmd(`dheist snapshot ${HID}`)
    await cmd(`dheist enable ${HID}`)
    await until(async () => /state=open/.test(await cmd(`zzheist ${HID}`)), 10000)
    await pin(A, 50.5, -690.5)
    await cmd(`zzheisttp ${A} 93.5 ${Y} -667.5`)
    const paused = await until(async () => /state=paused/.test(await gps(A)) && /stand=false/.test(await gps(A)), 4000)
    particles[A] = 0
    await sleep(1200)
    check('inside a heist the GPS shows nothing in the world (paused, no dot, no trail)', paused && particles[A] === 0, `${await gps(A)} particles=${particles[A]}`)
    await cmd(`dheist delete ${HID} confirm`)
    await cmd(`rg remove -w world heist_${HID}`)
    await cmd(`zzheisttp ${A} ${START.join(' ')}`)
    const resumed = await until(async () => /state=route/.test(await gps(A)) && /stand=true/.test(await gps(A)), 4000)
    check("...and it's back as soon as they're out", resumed, await gps(A))

    // ---------- The big map: a left-click drops a pin, again removes it ----------
    await cmd(`dphone gps ${A} clear`)
    await cmd(`zzheisttp ${A} ${START.join(' ')}`)
    await sleep(800)
    bots[A].setQuickBarSlot(8)
    await sleep(800)
    t = Date.now()
    bots[A].activateItem()
    await sleep(100)
    bots[A].deactivateItem()
    const anchored = await until(async () => /open=true/.test(await cmd(`dphone status ${A}`)) && !/cursor=-1/.test(await cmd(`dphone status ${A}`)), 4000)
    await sleep(1500)
    const below = bots[A].entity.position.floored().offset(0, -1, 0)
    bots[A]._client.write('block_dig', { status: 0, location: below, face: 1, sequence: 0 })
    await sleep(1200)
    let g = await gps(A)
    check('the big map: a left-click drops a pin where the cursor is (the city\'s middle), and the tip explains it once', anchored && /slots=\S*pin/.test(g) && /active=pin/.test(g) && /left-click the big map/.test(text(A, t)), `${g} ${text(A, t).slice(0, 300)}`)
    check("...and the block under the player isn't touched", /passed/i.test(await cmd(`execute if block ${below.x} ${below.y} ${below.z} black_concrete`)), await cmd(`execute if block ${below.x} ${below.y} ${below.z} black_concrete`))
    await sleep(600)
    bots[A]._client.write('block_dig', { status: 0, location: below, face: 1, sequence: 1 })
    await sleep(1200)
    g = await gps(A)
    check('a second left-click on the pin removes it', !/slots=\S*pin/.test(g), g)
    bots[A].activateItem()
    await sleep(100)
    bots[A].deactivateItem()
    await sleep(500)
    bots[A].setQuickBarSlot(0)

    // ---------- /gps ----------
    await cmd(`zzheisttp ${A} ${START.join(' ')}`)
    await pin(A, 80.5, -641.5)
    const o = new Promise(resolve => { const tm = setTimeout(() => resolve(null), 4000); bots[A].once('windowOpen', w => { clearTimeout(tm); resolve(w) }) })
    bots[A].chat('/gps')
    const w = await o
    await sleep(300)
    const itemText = i => (i ? JSON.stringify(i) : '')
    check('/gps shows where you\'re headed (the pin, its distance) and how to drop one', w && /GPS/.test(JSON.stringify(w.title)) && w.slots[4] && w.slots[4].name === 'compass' && /Heading to/.test(itemText(w.slots[4])) && w.slots[40] && w.slots[40].name === 'book', `${JSON.stringify(w && w.title)} ${itemText(w && w.slots[4]).slice(0, 300)}`)
    bots[A].clickWindow(4, 0, 0).catch(() => {})
    await sleep(1200)
    check('...and clicking it removes the pin', !/slots=\S*pin/.test(await gps(A)), await gps(A))
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd('minecraft:kill @e[tag=gpstest]').catch(() => {})
    await rcon.cmd(`dheist delete ${HID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${HID}`).catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`dphone gps ${name} clear`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill ${X1} ${Y} ${Z1} ${X2} ${Y} ${Z2} air`).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    // The grid there goes back to what's below (a rescan of the box).
    await rcon.cmd(`dphone roads scan ${X1} ${Z1} ${X2} ${Z2}`).catch(() => {})
    await sleep(8000)
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
