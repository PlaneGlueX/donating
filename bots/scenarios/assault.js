// heists.sk + cops.sk: the dynamic police waves (owner, 2026-10-21: "implement some aspects of the dynamic police waves",
// Payday's). After the response time the police come in assaults: assault n sends its pool of cops in waves up to the
// cap for its time; it's repelled early once the pool is spent and every cop is down, or it ends at its time; then a
// break with no reinforcements; then assault n+1, bigger (pool + pool-step), tougher (health × (1 + health-step)),
// with heavies from heavy-from on. Short timings here (core.sk's are PROPOSALs).
const fs = require('fs')
const path = require('path')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')
const LOGS = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs')
const readLog = name => { try { return fs.readFileSync(path.join(LOGS, `${name}.log`), 'utf8') } catch (e) { return '' } }

const A = 'AssaultA'
const Y = 200
const ID = 'zasl'
const CHUNKS = '4590 4590 4660 4660'
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  const heists0 = readLog('heists').length
  const cops0 = readLog('cops').length
  const heistLog = () => readLog('heists').slice(heists0)
  const copLog = () => readLog('cops').slice(cops0)
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(250) } return Boolean(await fn()) }
    const field = (s, k) => (s.match(new RegExp(` ${k}=(\\S*)`)) || [])[1]
    const alarm = async () => cmd(`zzalarm ${ID}`)
    const stage = async () => field(await alarm(), 'stage')
    const killCop = async () => cmd('minecraft:kill @e[tag=CITIZENS_NPC,name=Cop,limit=1,sort=nearest,x=4625,y=200,z=4645]')

    // ---------- Build: an advanced heist (difficulty 2) with a cop spot ----------
    await cmd(`dheist delete ${ID} confirm`)
    await cmd(`rg remove -w world heist_${ID}`)
    await cmd('zzcfgreload')
    await cmd('zzcfgtext heist::start-on enter')
    await cmd('zzcfgtime alarm::warning 3 seconds')
    await cmd('zzcfgtime alarm::wave-interval 2 seconds')
    await cmd('zzcfgset alarm::per-wave 2')
    await cmd('zzcfgset alarm::max-cops 6')
    await cmd('zzcfgset alarm::pool 2')
    await cmd('zzcfgset alarm::pool-step 2')
    await cmd('zzcfgset alarm::pool-per-robber 0')
    await cmd('zzcfgset alarm::assault-time 40')
    await cmd('zzcfgset alarm::assault-step 0')
    await cmd('zzcfgset alarm::break 5')
    await cmd('zzcfgset alarm::break-step 0')
    await cmd('zzcfgset alarm::break-min 2')
    await cmd('zzcfgset alarm::heavy-from 2')
    await cmd('zzcfgset alarm::heavy-every 1')
    await cmd('zzcfgset alarm::health-step 0.15')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 4590 ${Y} 4590 4660 ${Y + 8} 4660 air`)
    await cmd(`fill 4590 ${Y - 1} 4590 4660 ${Y - 1} 4660 glass`)
    await cmd(`fill 4606 ${Y} 4606 4607 ${Y} 4606 stone`)
    await cmd(`zzregion heist_${ID} 4600 ${Y - 1} 4600 4614 ${Y + 6} 4614`)
    await cmd(`dheist create ${ID} 2`)
    for (const c of [`dheist set ${ID} name Assault Lab`, `dheist set ${ID} advanced true`, `dheist set ${ID} level 0`, `dheist exit ${ID} 4607.5 ${Y} 4619.5 180`, `dheist snapshot ${ID}`]) await cmd(c)
    await cmd(`dloot add ${ID} pile 4606 ${Y} 4606 4607 ${Y} 4606 value=6000 style=cash`)
    await cmd(`dcops ${ID} add 4625.5 ${Y} 4645.5`)
    bots[A] = await join(A)
    await cmd(`gamemode survival ${A}`)
    await cmd(`zzclear ${A}`)
    await cmd(`zzcombatend ${A}`)
    await cmd(`zzpassive ${A} off`)
    await cmd(`dlevel set ${A} 50`)
    await cmd(`dheist enable ${ID}`)
    await until(async () => /state=open/.test(await cmd(`zzheist ${ID}`)), 12000)
    await cmd(`zzheisttp ${A} 4607.5 ${Y} 4610.5`)
    await sleep(2000)
    await cmd(`minecraft:effect give ${A} minecraft:resistance 120 4 true`)
    await cmd(`minecraft:effect give ${A} minecraft:regeneration 120 4 true`)

    // ---------- The response time, then assault 1 ----------
    let t = Date.now()
    await cmd(`dheist alarm ${ID}`)
    await sleep(400)
    let a = await alarm()
    check('the alarm: the response time first (warning, no assault yet, its length the warning)', field(a, 'stage') === 'warning' && field(a, 'assault') === '0' && field(a, 'len') === '3', a)
    const a1 = await until(async () => (await stage()) === 'assault', 5000)
    a = await alarm()
    check('then assault 1: its pool sent (2), the ASSAULT title', a1 && field(a, 'assault') === '1' && /assault zasl n=1 pool=2 /.test(heistLog()) && messagesSince(bots[A], t).some(m => m.kind === 'title:title' && /ASSAULT 1/.test(m.text)), `${a} | ${text(A, t).slice(0, 300)}`)
    const two = await until(async () => Number(field(await alarm(), 'alive')) === 2, 8000)
    await sleep(1500) // Citizens respawns a new NPC once (the skin)
    check('...two cops in the world, the pool spent', two && field(await alarm(), 'pool') === '0', await alarm())
    check('...assault 1\'s cops are the difficulty\'s (difficulty 2: 20 health), no heavies yet', /setup id=\d+ heist=zasl assault=1 heavy=false health=20 /.test(copLog()), copLog().split('\n').filter(l => /setup/.test(l)).join(' / '))

    // ---------- Repelled: the pool spent and every cop down ----------
    t = Date.now()
    await killCop()
    await sleep(400)
    await killCop()
    const repelled = await until(async () => (await stage()) === 'break', 5000)
    a = await alarm()
    check('every cop of assault 1 down with its pool spent: repelled, a break (its length: break 5 s)', repelled && /break zasl after=1 why=repelled for=5 /.test(heistLog()) && field(a, 'len') === '5' && /REPELLED/.test(text(A, t)), `${a} | ${text(A, t).slice(0, 300)}`)
    check('...no reinforcements during the break', Number(field(await alarm(), 'alive')) === 0 && Number(field(await alarm(), 'pending')) === 0, await alarm())

    // ---------- Assault 2: bigger, tougher, heavies ----------
    t = Date.now()
    const a2 = await until(async () => field(await alarm(), 'assault') === '2', 8000)
    check('after the break, assault 2 with a bigger pool (2 + 2 = 4)', a2 && /assault zasl n=2 pool=4 /.test(heistLog()), heistLog().split('\n').filter(l => /assault zasl/.test(l)).join(' / '))
    const cops2 = await until(async () => /setup id=\d+ heist=zasl assault=2 /.test(copLog()), 8000)
    check('...its cops tougher (20 × 1.15 = 23 health), heavies from assault 2 here (× 2 = 46, the heavy gun)', cops2 && /setup id=\d+ heist=zasl assault=2 heavy=true health=46 /.test(copLog()), copLog().split('\n').filter(l => /setup/.test(l)).join(' / '))
    const capped = await until(async () => Number(field(await alarm(), 'alive')) >= 2, 8000)
    a = await alarm()
    check('...the cap (max-cops 6, + cap-step 1 = 7 in assault 2) never passed', capped && Number(field(a, 'alive')) <= 7 && field(a, 'cap') === '7', a)

    // ---------- An assault that ends at its time (cops still standing) ----------
    await cmd(`zzalarm ${ID} end`)
    const timed = await until(async () => (await stage()) === 'break', 4000)
    check('an assault whose time is up ends in a break, its cops still standing', timed && /break zasl after=2 why=time /.test(heistLog()) && Number(field(await alarm(), 'alive')) >= 1, await alarm())

    // ---------- Getting away ends it all ----------
    t = Date.now()
    await cmd(`zzheisttp ${A} ${FAR}`)
    const ended = await until(async () => (await stage()) === 'none', 4000)
    const gone = await until(async () => Number(field(await alarm(), 'alive')) === 0, 4000)
    check('getting away ends the alarm: no assault, no break, every cop gone', ended && gone && field(await alarm(), 'assault') === '0', await alarm())
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd(`dcops ${ID} removeall`).catch(() => {})
    await rcon.cmd(`dheist delete ${ID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${ID}`).catch(() => {})
    await rcon.cmd(`minecraft:kill @e[tag=poi_h_${ID}]`).catch(() => {})
    await rcon.cmd(`zzcombatend ${A}`).catch(() => {})
    await rcon.cmd(`dlevel reset ${A}`).catch(() => {})
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill 4590 ${Y - 1} 4590 4660 ${Y + 8} 4660 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
