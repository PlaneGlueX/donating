// Rocking a car back and forth (the owner, 2026-09-30: "the user popping out of the car when moving back and forth
// fast"). A bot drives a fully tuned Apex (engine, turbo and handling III, like the owner's) with its own keys
// (player_input) and flips between W and S every few ticks at speed, with the chase camera off and on; after each run it
// must still sit in the driver's seat, and no CARLEAVE line (DonatingPhone logs every seat exit with what caused it)
// may appear before the test itself gets out. Then the other ways out found on the owner's PC: the chase view after the
// car jumps far (the client must end up looking through the camera again), a normal logout in the car, and joining
// while sitting in a seat (what a server restart did: the seat came back with the player and the car cleanup threw
// them out of it a few seconds later).
const fs = require('fs')
const path = require('path')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const D = 'ShakeD'
const Y = 200
const X0 = 6600, X1 = 6760, Z0 = 6600, Z1 = 6760
const CHUNKS = `${X0} ${Z0} ${X1} ${Z1}`
const PLATFORM = `${X0} ${Y - 1} ${Z0} ${X1} ${Y - 1} ${Z1}`
const START = [6640.5, Y, 6680.5] // facing east (yaw -90): 120 blocks of floor ahead
const FAR = [START[0] + 300, Y, START[2]] // where the car jumps to (a pad of its own)
const FAR_PAD = `6928 ${Y - 1} 6668 6952 ${Y - 1} 6692` // whole numbers (a .5 makes fill and forceload fail)
const FAR_CHUNKS = "6924 6664 6956 6696"
const LOG = path.join(__dirname, '..', '..', 'server', 'logs', 'latest.log')

const logLines = () => fs.readFileSync(LOG, 'utf8').split(/\r?\n/)

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  let plate = null
  try {
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} gray_concrete`)
    bot = await join(D)
    await cmd(`gamemode survival ${D}`)
    await cmd(`zzclear ${D}`)
    await cmd(`zzcombatend ${D}`)
    await cmd(`zzpassive ${D} off`)
    await cmd(`dlevel set ${D} 150`)
    for (const m of [...String(await cmd(`dgarage info ${D}`)).matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)]) await cmd(`dgarage take ${D} ${m[1]}`)
    await cmd(`dgarage build ${D} apex|Red|-|3|3|3|-|-`)
    plate = ((await cmd(`dgarage info ${D}`)).match(/([A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2})=apex\(/) || [])[1]
    if (!plate) throw new Error('no Apex')
    await sleep(1000)

    const keys = k => bot._client.write('player_input', { inputs: { forward: k.includes('w'), backward: k.includes('s'), left: k.includes('a'), right: k.includes('d'), jump: false, shift: false, sprint: false } })
    const seated = async () => (await cmd(`zzcarseat ${D}`)).includes(`driver:${plate}`)
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
      await sleep(600)
      return seated()
    }
    // Full speed ahead, then W and S in turn, `ticks` each, `flips` times; the car rocks back and forth.
    const rock = async (ticks, flips, steer = '') => {
      keys('w' + steer)
      await sleep(1500)
      for (let i = 0; i < flips; i++) {
        keys((i % 2 === 0 ? 's' : 'w') + steer)
        await sleep(50 * ticks)
      }
      keys('s')
      await sleep(900)
      keys('')
      await sleep(400)
    }
    const stat = await cmd(`dphone carstat ${plate}`)

    for (const cam of ['off', 'on']) {
      await cmd(`tag ${D} ${cam === 'off' ? 'add' : 'remove'} donating_carcam_off`)
      const ok = await place()
      const mark = logLines().length
      const results = []
      for (const [ticks, flips, steer] of [[2, 24, ''], [3, 20, ''], [5, 14, ''], [2, 24, 'd'], [4, 16, 'a']]) {
        await rock(ticks, flips, steer)
        const still = await seated()
        results.push(`${ticks}t x${flips}${steer ? ' +' + steer : ''}: ${still ? 'seated' : 'OUT'}`)
        if (!still) break
        await cmd(`zzcartp ${plate} ${START.join(' ')}`) // back to the start (MTVehicles' teleport keeps the driver)
        await sleep(600)
        await cmd(`execute as @e[type=armor_stand,name=MTVEHICLES_MAIN_${plate}] at @s run minecraft:tp @s ~ ~ ~ -90 0`)
        await sleep(400)
      }
      const leaves = logLines().slice(mark).filter(l => /CARLEAVE/.test(l) && l.includes(D))
      const cams = cam === 'on' ? await cmd(`dphone cam ${D}`) : ''
      check(`rocking the tuned Apex back and forth (W and S every 2-5 ticks, straight and steering) with the chase camera ${cam}: the driver stays in the seat, no seat exit logged`,
        ok && results.every(r => r.endsWith('seated')) && leaves.length === 0 && (cam === 'off' || /plate=/.test(cams)),
        `${stat} | ${results.join('; ')} | ${leaves.map(l => l.slice(l.indexOf('CARLEAVE'))).join(' || ')}${cam === 'on' ? ' | ' + cams.slice(0, 120) : ''}`)
    }

    // ---------- The chase camera after the car jumps far (MTVehicles' teleport): the client is told to look again ----------
    // (A 26.3 client drops its camera when the camera entity leaves its view; the copy sent later isn't looked through.)
    const cameraPk = []
    const spawnPk = [], destroyPk = []
    bot._client.on('camera', p => cameraPk.push({ t: Date.now(), id: p.cameraId }))
    bot._client.on('spawn_entity', p => spawnPk.push({ t: Date.now(), id: p.entityId }))
    bot._client.on('entity_destroy', p => destroyPk.push({ t: Date.now(), ids: p.entityIds || [] }))
    await cmd(`forceload add ${FAR_CHUNKS}`)
    await cmd(`fill ${FAR_PAD} gray_concrete`)
    const camBefore = await cmd(`dphone cam ${D}`)
    const camId = Number((camBefore.match(/ id=(\d+)/) || [])[1])
    let mark = logLines().length
    const tj = Date.now()
    await cmd(`zzcartp ${plate} ${FAR.join(' ')}`)
    await sleep(2500)
    const camAfter = await cmd(`dphone cam ${D}`)
    const resent = logLines().slice(mark).some(l => l.includes(`carcam ${D}: the camera was sent to the client again`))
    const idAfter = Number((camAfter.match(/ id=(\d+)/) || [])[1])
    const pkAfter = cameraPk.filter(e => e.t > tj)
    // The stand left the client's view and was sent again, or the plugin made a new camera; either way the client must end
    // up looking through an entity it has: the last camera packet is for the camera in use and came after that entity's last
    // spawn (a camera packet for an entity the client doesn't have is ignored), with no removal of it since. When the spawn
    // came after the camera's first packet (the re-send's case), the re-send must have happened.
    const lastCam = pkAfter[pkAfter.length - 1]
    const spawns = spawnPk.filter(e => e.t > tj && e.id === idAfter)
    const lastSpawn = spawns[spawns.length - 1]
    const firstCam = pkAfter.find(e => e.id === idAfter)
    const destroyedAfter = lastCam ? destroyPk.some(e => e.t > lastCam.t && e.ids.includes(idAfter)) : true
    const lateSpawn = lastSpawn && firstCam && lastSpawn.t > firstCam.t
    check('after the car is teleported 300 blocks with the chase view on, the client looks through the camera in use: its last camera packet came after the stand was spawned there (and after a re-send when the spawn was late), nothing removed it since',
      Number.isFinite(camId) && Number.isFinite(idAfter) && lastCam && lastCam.id === idAfter && lastSpawn && lastCam.t >= lastSpawn.t && !destroyedAfter && (!lateSpawn || resent) && (idAfter !== camId || resent) && await seated(),
      `camera ${camId} -> ${idAfter}; camera packets ${JSON.stringify(pkAfter.map(e => [e.t - tj, e.id]))} spawns of ${idAfter} ${JSON.stringify(spawns.map(e => e.t - tj))} late=${lateSpawn} resent-log=${resent} | ${camAfter.slice(0, 100)}`)

    // ---------- Logging out in the car: back without a seat (a seat saved with the player comes back at the next join,
    // where the car cleanup removes it as a stray and throws the player out; a server stop did that: PhonePlugin.onDisable
    // takes drivers out first, and a normal logout goes through MTVehicles' LeaveListener) ----------
    await place()
    const inBefore = await seated()
    mark = logLines().length
    await quit(bot)
    bot = null
    await sleep(1500)
    bot = await join(D)
    await sleep(2500)
    const after = await cmd(`zzcarseat ${D}`)
    const lines = logLines().slice(mark)
    const tookOut = lines.some(l => /CARLEAVE/.test(l) && l.includes(`CARLEAVE ${D} `) && /LeaveListener\.onPlayerLeave/.test(l))
    const restored = lines.some(l => l.includes(`carsmooth: ${D} joined in a car seat`))
    const ejected = lines.filter(l => /CARLEAVE/.test(l) && l.includes(`CARLEAVE ${D} `) && /seatValid=false/.test(l))
    check('logging out while driving (a normal logout): out of the seat at the logout (MTVehicles\' LeaveListener), back standing at the next join, nobody thrown out of a seat',
      inBefore && tookOut && !restored && ejected.length === 0 && / riding=<none>/.test(after),
      `before=${inBefore} out-at-logout=${tookOut} restored=${restored} | ${after} | ${ejected.map(l => l.slice(l.indexOf('CARLEAVE'), l.indexOf('CARLEAVE') + 160)).join(' || ')}`)

    // ---------- Joining in a seat anyway (what a server stop did: vanilla put the seat saved with the player back at the
    // join; PhonePlugin.onDisable now takes drivers out before a stop saves them, checked by hand by stopping the server
    // under a seated bot): /zzseatonjoin seats the bot in the join tick, and DonatingPhone takes it out a tick later ----------
    await place()
    await quit(bot)
    bot = null
    await sleep(1500)
    await cmd(`zzseatonjoin ${D} ${plate}`)
    mark = logLines().length
    bot = await join(D)
    await sleep(2000)
    const back = await cmd(`zzcarseat ${D}`)
    const lines2 = logLines().slice(mark)
    const seatedAtJoin = lines2.some(l => l.includes(`carsmooth: ${D} joined in a car seat saved with them: out of it`))
    const leftBy = lines2.filter(l => /CARLEAVE/.test(l) && l.includes(`CARLEAVE ${D} `)).map(l => l.slice(l.indexOf(' by ') + 4, l.indexOf(' by ') + 90))
    check('joining while sitting in a car seat (a seat saved with the player): DonatingPhone takes the player out a tick after the join, before the car cleanup could throw them out of a stray copy',
      seatedAtJoin && / riding=<none>/.test(back) && !/driver:/.test(back) && leftBy.length === 1 && !/EffKill/.test(leftBy[0]),
      `log=${seatedAtJoin} | ${back} | exits: ${leftBy.join(' || ')}`)
  } finally {
    if (bot) {
      try { bot._client.write('player_input', { inputs: { forward: false, backward: false, left: false, right: false, jump: false, shift: false, sprint: false } }) } catch (e) { }
    }
    await rcon.cmd(`minecraft:ride ${D} dismount`).catch(() => {})
    if (plate) {
      await rcon.cmd(`dgarage take ${D} ${plate}`).catch(() => {})
      await rcon.cmd(`zzcardelete ${plate}`).catch(() => {})
    }
    await rcon.cmd(`tag ${D} remove donating_carcam_off`).catch(() => {})
    await rcon.cmd(`dlevel reset ${D}`).catch(() => {})
    await rcon.cmd(`zzheisttp ${D} 0.5 68 -656.5`).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`fill ${FAR_PAD} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${FAR_CHUNKS}`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    if (bot) await quit(bot)
    rcon.close()
  }
}
