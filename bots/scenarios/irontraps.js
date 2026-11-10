// Ironvale's traps in the real buildings (tools/build/iron/PLAN.md, 2026-10-29), after iron.js's loot checks: the Mansion's
// laser hall, the library's collapsing floor (walked and sprinted), its ledge camera; the Police HQ's laser corridor; the
// Power Plant's catwalk; then the GPS route up Hill Drive to the Mansion and the phone map over Ironvale.
// `bots/run.js irontraps`. Each heist is ended and reopened after (the room reset puts the floors back).
const fs = require('fs')
const path = require('path')
const conv = require('mineflayer/lib/conversions')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const P = 'IronTrap'
const LOG = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs', 'traps.log')
const YAW = { south: 0, west: 90, north: 180, east: -90 }

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).replace(/§./g, '').trim()
  let bot = null
  const lines = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split(/\r?\n/).filter(Boolean) : [])
  let mark = 0
  const setMark = () => { mark = lines().length }
  const logged = re => lines().slice(mark).filter(l => re.test(l))
  const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(250) } return Boolean(await fn()) }
  const pos = async () => ((await cmd(`data get entity ${P} Pos`)).match(/\[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/) || []).slice(1).map(Number)
  const member = async () => ((await cmd(`zzinheist ${P}`)).match(/INHEIST \S+ (\S+)/) || [])[1]
  const alarm = async h => ((await cmd(`zzheist ${h}`)).match(/ alarm=(\S+)/) || [])[1]
  const hp = async () => Number(((await cmd(`data get entity ${P} Health`)).match(/data: ([\d.]+)/) || [])[1])
  const fresh = async () => { await cmd(`zzhp ${P} 20`); await cmd(`zzcombatend ${P}`) }
  // into heist h at [x,y,z] facing dir, a member, at full health
  const enter = async (h, [x, y, z], dir) => {
    await cmd(`zzheisttp ${P} ${x} ${y} ${z}`)
    await sleep(1500)
    await bot.look(conv.fromNotchianYaw(YAW[dir]), 0, true)
    await fresh()
    return until(async () => (await member()) === h, 8000)
  }
  const walk = async (ms, { sprint = false, jump = false } = {}) => {
    setMark()
    if (sprint) bot.setControlState('sprint', true)
    if (jump) bot.setControlState('jump', true)
    bot.setControlState('forward', true)
    await sleep(ms)
    bot.clearControlStates()
    await sleep(800)
  }
  const reopen = async h => {
    await cmd(`zzheisttp ${P} 1010.5 65 430.5`) // Main Avenue East, outside every heist
    await sleep(1500)
    await cmd(`dheist end ${h}`); await cmd(`dheist open ${h}`)
    // collapsed floors come back on their own timer (floor::restore), not with the room reset
    return await until(async () => /state=open/.test(await cmd(`zzheist ${h}`)), 60000) &&
      until(async () => !/floors=\S*(down|crack)/.test(await cmd(`zztrap ${h}`)), 20000)
  }

  try {
    bot = await join(P)
    await cmd(`zzclear ${P}`); await cmd(`zzbagclear ${P}`); await cmd(`gamemode survival ${P}`); await cmd(`zzpassive ${P} off`)
    await cmd(`dlevel set ${P} 60`)
    for (const h of ['mansion', 'evidence', 'power']) await reopen(h)
    await sleep(5000) // a new player can't be hurt for ~6 s (CLAUDE.md: bots never say they've loaded)

    // ---------- The Mansion ----------
    // The laser hall, walked west from the foyer's doorway without jumping or ducking.
    check('mansion: in at the laser hall', await enter('mansion', [1237.5, 91, 622.5], 'west'), await cmd(`zzinheist ${P}`))
    await walk(4000)
    const lasers = logged(new RegExp(`hit ${P} \\S+ mansion-\\d+ laser`))
    check('mansion: walking the laser hall upright gets hit', lasers.length >= 1, lines().slice(mark).join(' / ') || 'no trap lines')
    await reopen('mansion')

    // The library's floor at a walk: it cracks, drops the robber and puts them back before it.
    await enter('mansion', [1229.5, 91, 630.5], 'south')
    await walk(2500)
    await until(async () => logged(new RegExp(`hit ${P} \\S+ mansion-\\d+ floor`)).length >= 1, 4000)
    await sleep(500)
    const pw = await pos()
    check('mansion: walking onto the library floor (still holding forward) collapses it, hurts once and puts the robber back on the north side', logged(/collapse mansion-\d+/).length >= 1 && logged(new RegExp(`hit ${P} \\S+ mansion-\\d+ floor`)).length === 1 && (await hp()) > 0 && pw[2] < 633 && Math.abs(pw[1] - 91) < 0.6, `${pw} ${lines().slice(mark).join(' / ')}`)
    await reopen('mansion')

    // Sprinting across: 2-deep strips, each cracks 0.5 s after it's stepped on, so a sprinter is off each one in time.
    await enter('mansion', [1229.5, 91, 629.5], 'south')
    await walk(3500, { sprint: true })
    const ps = await pos()
    check('mansion: a sprinter makes it over the library floor untouched', ps[2] > 645 && logged(new RegExp(`hit ${P} \\S+ mansion-\\d+ floor`)).length === 0, `${ps} ${lines().slice(mark).join(' / ')}`)
    await reopen('mansion')

    // The west ledge, along the shelves: the library's camera trips the alarm.
    await enter('mansion', [1222.5, 91, 627.5], 'south')
    const quiet = (await alarm('mansion')) === 'none'
    await walk(4500)
    const tripped = await until(async () => (await alarm('mansion')) !== 'none', 6000)
    const pl = await pos()
    check('mansion: sneaking the west ledge gets past the floor but the camera trips the alarm', quiet && tripped && pl[2] > 640 && logged(/collapse mansion-\d+/).length === 0, `alarm=${await alarm('mansion')} at ${pl} ${lines().slice(mark).join(' / ')}`)
    await reopen('mansion')

    // ---------- The Police HQ: the basement corridor, north from the landing ----------
    check('evidence: in at the basement landing', await enter('evidence', [1015.5, 57, 511.5], 'north'), await cmd(`zzinheist ${P}`))
    await walk(4000)
    check('evidence: walking the corridor upright gets hit by its lasers', logged(new RegExp(`hit ${P} \\S+ evidence-\\d+ laser`)).length >= 1, lines().slice(mark).join(' / ') || 'no trap lines')
    await reopen('evidence')

    // ---------- The Power Plant: the catwalk over the turbine pit ----------
    check('power: in at the catwalk\'s south end', await enter('power', [1055.5, 65, 348.5], 'north'), await cmd(`zzinheist ${P}`))
    await walk(3000)
    await until(async () => logged(new RegExp(`hit ${P} \\S+ power-\\d+ floor`)).length >= 1, 4000)
    check('power: the catwalk collapses under a robber holding forward: one hit, alive, re-falls only put them back', logged(/collapse power-\d+/).length >= 1 && logged(new RegExp(`hit ${P} \\S+ power-\\d+ floor`)).length === 1 && (await hp()) > 0, lines().slice(mark).join(' / '))
    await reopen('power')
    await enter('power', [1055.5, 65, 349.5], 'north')
    await walk(4000, { sprint: true })
    const pp = await pos()
    check('power: a sprinter makes it over the catwalk untouched', pp[2] < 330 && logged(new RegExp(`hit ${P} \\S+ power-\\d+ floor`)).length === 0, `${pp} ${lines().slice(mark).join(' / ')}`)
    await reopen('power')

    // ---------- The GPS to the Mansion, from Main Avenue East ----------
    await cmd(`zzheisttp ${P} 1010.5 65 430.5`)
    await sleep(1500)
    await cmd(`dphone gps ${P} clear`)
    await cmd(`dphone gps ${P} set pin world 8 1250.5,91,611.5 Mansion`)
    await cmd(`dphone gps ${P} active pin`)
    let g = ''
    const routed = await until(async () => /way=path/.test(g = await cmd(`dphone gps ${P}`)), 8000)
    check('gps: a pin at the Mansion routes along the paths up Hill Drive', routed && /via=\S*(6003|6005|6030)/.test(g), g.slice(0, 300))
    await cmd(`dphone gps ${P} clear`)

    // ---------- The phone map covers Ironvale (scanned 2026-10-29) ----------
    const px = async (x, z) => ((await cmd(`dphone city pixel ${x} ${z}`)).match(/ = (\d+) color=(\d+)/) || []).slice(1).map(Number)
    const [, roof] = await px(1250, 650), [, dash] = await px(1250, 430), [, hillGrass] = await px(1200, 720)
    check('map: the Mansion, Main Avenue East and Mansion Hill are on the phone map', roof === 14 && dash === 18 && hillGrass === 1, `gallery=${roof} dash=${dash} hill=${hillGrass}`)
  } finally {
    if (bot) bot.clearControlStates()
    await rcon.cmd(`dphone gps ${P} clear`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    for (const h of ['mansion', 'evidence', 'power']) { await rcon.cmd(`dheist end ${h}`).catch(() => {}); await rcon.cmd(`dheist open ${h}`).catch(() => {}) }
    rcon.close()
  }
}
