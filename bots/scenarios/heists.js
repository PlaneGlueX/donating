// heists.sk: a test heist built on a glass platform (no city yet), driven through /dheist like staff
// would. Checks the staff setup, the entry gates (closed, teleports, PvP heists, rank), a run (the
// clock, messages, placeholders, the waypoint rule, no teleport commands or passive switching inside),
// the heist crew (no hurting each other inside; shooting in and out works), the block-break lock, the
// countdown (thrown out, loot forfeited, the room reset), deaths inside (death.sk uses the heist's
// numbers), logging out inside (forfeit, back at spawn on rejoin), the "rob" clock start, and the alarm
// (waves, the chase range, the lockdown bars).
// The heist is x 730..740, y 199..206, z 725..735; robbers walk in from the west.
const fs = require('fs')
const path = require('path')
const conv = require('mineflayer/lib/conversions')
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'HeistA'
const B = 'HeistB'
const Y = 200
const ID = 'ztest'
const REGION = 'heist_ztest'
const SAFE = 'safe_zheist'
const CHUNKS = '720 720 750 740'
const PLATFORM = `720 ${Y - 1} 720 750 ${Y - 1} 740`
const EDGE = 730
const START = [727.5, 730.5] // west of the heist; walking east 1.5 s ends near x 734
const OUTSIDE = [724.5, 724.5]
const EXIT = [725.5, 730.5]
const FAR = '0.5 68 -656.5' // solid ground near spawn
const SERVER = path.join(__dirname, '..', '..', 'server')
const LOG = path.join(SERVER, 'plugins', 'Skript', 'logs', 'heists.log')
const HOLO = path.join(SERVER, 'plugins', 'DecentHolograms', 'holograms', 'donating_heist_ztest.yml')
const NBT = path.join(SERVER, 'world', 'generated', 'donating', 'structures', 'heist', 'ztest', '1.nbt')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bots = {}
  const cmd = async c => (await rcon.cmd(c)).trim()
  try {
    // ---------- Helpers ----------
    const heist = async () => cmd(`zzheist ${ID}`)
    const field = async k => ((await heist()).match(new RegExp(` ${k}=(\\S*)`)) || [])[1]
    const member = async name => ((await cmd(`zzinheist ${name}`)).match(/INHEIST \S+ (\S+)/) || [])[1]
    const hunt = async name => ((await cmd(`zzinheist ${name}`)).match(/hunt=(\S+)/) || [])[1]
    const pos = async name => {
      const m = (await cmd(`data get entity ${name} Pos`)).match(/\[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/)
      return m ? m.slice(1).map(Number) : [NaN, NaN, NaN]
    }
    const near = (p, x, z, d = 1.5) => Math.abs(p[0] - x) <= d && Math.abs(p[2] - z) <= d
    const range = async name => ((await cmd(`attribute ${name} minecraft:waypoint_receive_range base get`)).match(/is (-?[\d.E]+)/) || [])[1]
    const papi = async (name, ph) => ((await cmd(`zzpapi ${name} ${ph}`)).match(/= (.*)$/m) || [])[1] || ''
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const data = async (name, key) => ((await cmd(`zzdata ${name} ${key}`)).match(/= (.*)$/m) || [])[1]
    const health = async name => Number(((await cmd(`data get entity ${name} Health`)).match(/data: ([\d.]+)/) || [])[1])
    const isBlock = async (x, y, z, b) => /passed/i.test(await cmd(`execute if block ${x} ${y} ${z} minecraft:${b}`))
    const logLines = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split(/\r?\n/).filter(l => l !== '') : [])
    let mark = 0
    const setMark = () => { mark = logLines().length }
    const logged = re => logLines().slice(mark).filter(l => re.test(l))
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const bars = (name, t) => messagesSince(bots[name], t).filter(m => m.kind === 'game_info').map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    // heists.sk's own teleport: never gated, so it also moves a robber out of the heist.
    const place = async (name, x, z) => { await cmd(`zzheisttp ${name} ${x} ${Y} ${z}`); await sleep(1300) }
    const walk = async (name, notchYaw, ms) => {
      const bot = bots[name]
      await bot.look(conv.fromNotchianYaw(notchYaw), 0, true)
      bot.setControlState('forward', true)
      await sleep(ms)
      bot.setControlState('forward', false)
      await sleep(1300) // the reconcile runs a tick after the region event, or within a second
    }
    const walkIn = async name => { await place(name, START[0], START[1]); const t = Date.now(); await walk(name, -90, 1500); return t }
    const walkOut = async name => { const t = Date.now(); await walk(name, 90, 2500); return t }
    const punch = async (from, to) => {
      const a = bots[from]
      const target = a.players[to] && a.players[to].entity
      if (!target) return { landed: false, lost: 0, bars: '' }
      await cmd(`minecraft:effect give ${to} minecraft:instant_health 1 10 true`)
      await sleep(300)
      const before = await health(to)
      const t = Date.now()
      await a.lookAt(target.position.offset(0, 1.4, 0), true)
      a.attack(target)
      await sleep(800)
      return { landed: true, lost: before - (await health(to)), bars: bars(from, t) }
    }
    const heistSet = async (key, value) => cmd(`dheist set ${ID} ${key} ${value}`)

    // ---------- Clean start ----------
    await cmd(`dheist delete ${ID} confirm`)
    await cmd(`rg remove -w world ${REGION}`)
    await cmd(`rg remove -w world ${SAFE}`)
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 720 ${Y} 720 750 ${Y + 10} 740 air`)
    await cmd(`fill ${PLATFORM} glass`)
    await cmd('zzcfgreload')
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`zzdata ${name} passive-switched none`)
      await cmd(`zzdata ${name} rank none`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`lp user ${name} permission unset donating.wanted`)
    }
    await place(A, OUTSIDE[0], OUTSIDE[1])
    await place(B, OUTSIDE[0], OUTSIDE[1] + 1)
    await sleep(6000) // bots can't be hurt until about 6 s after joining

    // ---------- Staff setup ----------
    check('create refuses a heist without its region', /no region heist_ztest/.test(await cmd(`dheist create ${ID} 3`)))
    await cmd(`zzregion ${REGION} 730 199 725 740 206 735`)
    const created = await cmd(`dheist create ${ID} 3`)
    check('create: the heist starts disabled', /created/.test(created) && (await field('state')) === 'disabled', `${created}; ${await heist()}`)
    check('ids are lowercase letters and digits', /ids are/.test(await cmd('dheist create Bad_Id 1')))
    await heistSet('name', 'Test Vault')
    await heistSet('escape', 60)
    await heistSet('cooldown', 6)
    let info = await cmd(`dheist info ${ID}`)
    check('set: name, escape, cooldown; the rest from difficulty 3', /name=Test Vault difficulty=3 escape=1:00 cooldown=0:06 pool=\$40,000 rank=0 advanced=false pvp=false/.test(info), info)
    check('enable needs an exit spot', /set the exit spot first/.test(await cmd(`dheist enable ${ID}`)))
    await cmd(`zzregion ${SAFE} 721 199 736 723 206 739`)
    await cmd(`rg flag -w world ${SAFE} passthrough allow`)
    const exitIn = await cmd(`dheist exit ${ID} 735.5 200 730.5`)
    const exitSafe = await cmd(`dheist exit ${ID} 722.5 200 737.5`)
    const exitOk = await cmd(`dheist exit ${ID} ${EXIT[0]} 200 ${EXIT[1]} -90`)
    check('the exit spot can\'t be inside the heist or in a safe zone', /inside a heist/.test(exitIn) && /safe zone/.test(exitSafe) && /exit set/.test(exitOk), `${exitIn} / ${exitSafe} / ${exitOk}`)
    check('enable needs a saved room', /save the room first/.test(await cmd(`dheist enable ${ID}`)))
    await cmd(`setblock 736 203 731 gold_block`)
    await cmd(`setblock 740 206 735 diamond_block`)
    const snap = await cmd(`dheist snapshot ${ID}`)
    check('snapshot: 1 section, 11x8x11 blocks, saved to a file', /1 sections, 11x8x11 = 968 blocks/.test(snap) && fs.existsSync(NBT), snap)
    await cmd(`dheist holo ${ID} 727.5 202 727.5`)
    await sleep(1000) // DecentHolograms writes the file after each line change
    const holo = fs.existsSync(HOLO) ? fs.readFileSync(HOLO, 'utf8') : ''
    check('holo: a DecentHolograms hologram showing the heist\'s placeholders', /727\.500:202\.000:727\.500/.test(holo) && /donating_heist_status_ztest/.test(holo), holo.slice(0, 120))
    let t = Date.now()
    bots[A].chat('/dheist list')
    await sleep(800)
    check('/dheist is staff only', /Staff only/.test(text(A, t)), text(A, t))
    t = Date.now()
    bots[A].chat('/heists')
    await sleep(800)
    check('/heists hides disabled heists', /Heists:/.test(text(A, t)) && !/Test Vault/.test(text(A, t)), text(A, t))
    check('the hologram status says CLOSED', /CLOSED/.test(await papi(A, 'donating_heist_status_ztest')), await papi(A, 'donating_heist_status_ztest'))

    // ---------- Gates while disabled ----------
    t = await walkIn(A)
    let p = await pos(A)
    check('a disabled heist pushes robbers back', p[0] < EDGE && (await member(A)) === 'none' && /is closed/.test(bars(A, t)), `x ${p[0]}; ${bars(A, t)}`)
    t = Date.now()
    await cmd(`minecraft:tp ${A} 735.5 ${Y} 730.5`)
    await sleep(800)
    p = await pos(A)
    check('no teleporting into a heist', p[0] < EDGE && /teleport into a heist/.test(bars(A, t)), `x ${p[0]}; ${bars(A, t)}`)

    // ---------- Enable ----------
    setMark()
    await cmd(`dheist enable ${ID}`)
    const opened = await until(async () => (await field('state')) === 'open', 5000)
    check('enable: the room resets, then the heist opens (run 1)', opened && (await field('run')) === '1' && logged(/reset ztest/).length === 1, await heist())
    check('...and the hologram says OPEN', /OPEN/.test(await papi(A, 'donating_heist_status_ztest')))
    t = Date.now()
    bots[A].chat('/heists')
    await sleep(800)
    check('/heists lists it', /Test Vault/.test(text(A, t)) && /OPEN/.test(text(A, t)), text(A, t))
    await cmd(`minecraft:tp ${A} 735.5 ${Y} 730.5`)
    await sleep(800)
    check('an open heist still can\'t be teleported into (and a refusal starts nothing)', (await pos(A))[0] < EDGE && (await field('state')) === 'open')

    await heistSet('pvp', 'true')
    await cmd(`zzpassive ${B} on`)
    t = await walkIn(B)
    check('passive players can\'t enter a PvP heist', (await pos(B))[0] < EDGE && /PvP heist/.test(bars(B, t)) && (await field('state')) === 'open', `x ${(await pos(B))[0]}; ${bars(B, t)}`)
    await heistSet('pvp', 'default')
    await cmd(`zzpassive ${B} off`)
    await cmd(`zzdata ${B} passive-switched none`)
    await place(B, OUTSIDE[0], OUTSIDE[1])

    await heistSet('rank', 1)
    t = await walkIn(A)
    check('a rank requirement pushes lower ranks back', (await pos(A))[0] < EDGE && /robber rank 1/.test(bars(A, t)), bars(A, t))
    await cmd(`zzdata ${A} rank 1`)

    // ---------- Round 1: escape 60 s ----------
    t = Date.now()
    const tB = Date.now()
    await walkIn(A)
    await heistSet('rank', 'default')
    let left = Number(await field('left'))
    check('walking into the open heist starts run 1 (60 s)', (await member(A)) === ID && (await field('state')) === 'active' && (await field('run')) === '1' && left >= 54 && left <= 60, await heist())
    check('the robber is told the time and that everyone inside is their crew', /You're in the Test Vault/.test(text(A, t)) && /crew/.test(text(A, t)), text(A, t))
    check('everyone hears that the heist is being robbed', /Test Vault is being robbed/.test(text(B, tB)), text(B, tB))
    check('enable refuses a heist that is already enabled (it would strand the robbers)', /already enabled/.test(await cmd(`dheist enable ${ID}`)) && (await field('state')) === 'active')
    check('inside, the robber receives no waypoints (the XP bar shows the bag)', Number(await range(A)) === 0, await range(A))
    check('placeholders: in_heist / heist_name for the robber, not for others; the status counts robbers', (await papi(A, 'donating_in_heist')) === 'yes' && (await papi(A, 'donating_heist_name')) === 'Test Vault' && (await papi(B, 'donating_in_heist')) === 'no' && /BEING ROBBED/.test(await papi(A, 'donating_heist_status_ztest')) && /1 inside/.test(await papi(A, 'donating_heist_status_ztest')), `${await papi(A, 'donating_in_heist')} ${await papi(A, 'donating_heist_name')} ${await papi(B, 'donating_in_heist')} ${await papi(A, 'donating_heist_status_ztest')}`)
    t = Date.now()
    bots[A].chat('/spawn')
    await sleep(800)
    check('no teleport commands inside', /can't use \/spawn inside a heist/.test(text(A, t)) && (await member(A)) === ID, text(A, t))
    t = Date.now()
    await cmd(`minecraft:tp ${A} ${EXIT[0]} ${Y} ${EXIT[1]}`)
    await sleep(800)
    check('no teleporting out of a heist (walk out past the traps)', (await pos(A))[0] >= EDGE && (await member(A)) === ID && /teleport out of a heist/.test(bars(A, t)), `x ${(await pos(A))[0]}; ${bars(A, t)}`)
    check('no switching passive mode inside a heist', /inside a heist/.test(await cmd(`zzpassivewhy ${A}`)) && /PASSIVEWHY\s*$/.test(await cmd(`zzpassivewhy ${B}`)), `${await cmd(`zzpassivewhy ${A}`)} / ${await cmd(`zzpassivewhy ${B}`)}`)
    left = Number(await field('left'))
    await walkIn(B)
    check('a second robber joins the same run; the clock keeps going', (await field('inside')) === '2' && (await field('run')) === '1' && Number(await field('left')) <= left, await heist())

    // ---------- The heist crew ----------
    await sleep(4500) // EssentialsX: no PvP for 4 s after a teleport (place() before walking in)
    let r = await punch(A, B)
    check('the heist crew can\'t hurt each other inside', r.landed && r.lost === 0 && /heist crew/.test(r.bars), JSON.stringify(r))
    await heistSet('pvp', 'true')
    r = await punch(A, B)
    check('...except in a PvP heist', r.landed && r.lost > 0, JSON.stringify(r))
    await heistSet('pvp', 'default')
    t = await walkOut(B)
    check('walking out: out of the heist, told so, waypoints back', (await member(B)) === 'none' && /You got out of the Test Vault/.test(text(B, t)) && Number(await range(B)) > 1e7, `${await member(B)}; ${text(B, t)}; ${await range(B)}`)
    // Robbers can shoot out, and anyone can shoot in (owner, 2026-09-25).
    await cmd(`minecraft:tp ${A} 730.7 ${Y} 730.5`) // inside, at the door (a teleport within the heist fires no region event)
    await cmd(`minecraft:tp ${B} 728.9 ${Y} 730.5`)
    for (const name of [A, B]) await cmd(`zzcombatend ${name}`)
    await sleep(5000)
    const inOut = [await member(A), await member(B)]
    r = await punch(A, B)
    const r2 = await punch(B, A)
    check('hits in and out of a heist land (only the crew inside is protected)', inOut[0] === ID && inOut[1] === 'none' && r.lost > 0 && r2.lost > 0, `${inOut}; out ${JSON.stringify(r)}; in ${JSON.stringify(r2)}`)
    for (const name of [A, B]) await cmd(`zzcombatend ${name}`)
    try { await bots[A].dig(bots[A].blockAt(new (require('vec3').Vec3)(732, 199, 731)), true) } catch (e) { /* cancelled */ }
    await sleep(500)
    check('robbers can\'t break blocks (no digging past traps)', await isBlock(732, 199, 731, 'glass'))

    // ---------- 0:00 ----------
    await heistSet('cooldown', 14) // room for the restart and "moved out" checks below
    setMark()
    t = Date.now()
    await cmd(`dheist end ${ID}`)
    await sleep(800)
    p = await pos(A)
    check('at 0:00 robbers inside are thrown out to the exit spot', near(p, EXIT[0], EXIT[1]) && (await member(A)) === 'none' && /Too late/.test(text(A, t)), `${p}; ${text(A, t)}`)
    check('...and lose that heist\'s loot (one forfeit, only for them)', logged(new RegExp(`forfeit ${A} \\S+ ztest#1 `)).length === 1 && logged(new RegExp(`forfeit ${B} `)).length === 0, logged(/forfeit/).join(' / '))
    check('...then the heist is closed for its cooldown', (await field('state')) === 'cooldown' && Number(await field('left')) <= 14, await heist())
    // A restart or Minehut sleep wipes memory: the saved reopen time keeps the cooldown.
    await cmd(`zzheistforget ${ID}`)
    await sleep(1500)
    check('a restart keeps the cooldown (it doesn\'t reopen at once)', (await field('state')) === 'cooldown' && Number(await field('left')) >= 2, await heist())
    t = await walkIn(A)
    check('a closed heist says when it opens', (await pos(A))[0] < EDGE && /Opens in 0:\d\d/.test(bars(A, t)), bars(A, t))
    await cmd(`zzheisttp ${B} 735.5 ${Y} 730.5`)
    const ejected = await until(async () => near(await pos(B), EXIT[0], EXIT[1]), 2500)
    check('anyone inside a closed heist is moved out', ejected && (await member(B)) === 'none', `${await pos(B)}`)
    check('after the cooldown it opens again (run 2)', await until(async () => (await field('state')) === 'open' && (await field('run')) === '2', 14000), await heist())
    await heistSet('cooldown', 6)

    // ---------- Round 2: the countdown and the room reset ----------
    await heistSet('escape', 15)
    setMark()
    t = await walkIn(A)
    left = Number(await field('left'))
    check('run 2 starts with a 15 s clock', (await field('state')) === 'active' && left <= 15 && left >= 11, await heist())
    await cmd('setblock 736 203 731 air')
    await cmd('setblock 740 206 735 air')
    const warned = await until(async () => /0:10 left/.test(text(A, t)), 8000)
    check('a warning at 10 s, none for 60 s or 30 s in a 15 s run', warned && !/1:00 left|0:30 left/.test(text(A, t)), text(A, t))
    const out = await until(async () => near(await pos(A), EXIT[0], EXIT[1]), 14000)
    check('the clock runs out: thrown out, forfeit, waypoints back', out && /Too late/.test(text(A, t)) && logged(/forfeit HeistA \S+ ztest#2 /).length === 1 && Number(await range(A)) > 1e7, `${await pos(A)}; ${logged(/forfeit/)}`)
    const restored = await until(async () => (await isBlock(736, 203, 731, 'gold_block')) && (await isBlock(740, 206, 735, 'diamond_block')), 4000)
    check('the room resets during the cooldown (both corners of the box)', restored)
    await until(async () => (await field('reset')) === 'none', 5000)
    const before = await heist()
    setMark()
    await cmd('sk reload heists')
    await sleep(2000)
    check('/sk reload keeps the state (the counter is saved)', (await field('state')) === 'cooldown' || (await field('state')) === 'open', `${before} -> ${await heist()}`)
    check('...and it opens again (run 3)', await until(async () => (await field('state')) === 'open' && (await field('run')) === '3', 10000), await heist())
    check('...without a second room reset (the memory was kept)', logged(/reset ztest sections=/).length === 0, logged(/reset|open/).join(' / '))

    // ---------- Deaths inside: death.sk uses the heist's numbers ----------
    await heistSet('escape', 180)
    const dieInside = async (money, pool) => {
      await cmd(`zztestkit ${A}`) // bag tier 2: holds $6,000
      await cmd(`eco set ${A} ${money}`)
      if (pool) await heistSet('pool', pool)
      await walkIn(A)
      const inside = await member(A)
      setMark()
      await cmd(`minecraft:kill ${A}`)
      await sleep(1500)
      if (pool) await heistSet('pool', 'default')
      return inside
    }
    let inside = await dieInside(100000)
    check('dying inside (Hard): L = min(100,000 × 3.5%, min(6,000, 40,000)) = $3,500', inside === ID && (await bal(A)) === 96500 && (await member(A)) === 'none' && logged(/forfeit/).length === 0, `inside ${inside}; ${await bal(A)}`)
    await sleep(1500)
    check('...and after respawning the waypoints are back', Number(await range(A)) > 1e7, await range(A))
    inside = await dieInside(100000, 2000)
    check('the heist\'s loot pool caps it: L = min(3,500, min(6,000, 2,000)) = $2,000', inside === ID && (await bal(A)) === 98000, `${await bal(A)}`)
    await cmd(`zztestkit ${A}`)
    await cmd(`eco set ${A} 100000`)
    await place(A, START[0], START[1])
    await cmd(`minecraft:kill ${A}`)
    await sleep(1500)
    check('control: the same death outside counts as Easy: $1,000', (await bal(A)) === 99000, `${await bal(A)}`)

    await cmd(`zztestkit ${A}`)
    await cmd(`eco set ${A} 50000`)
    await walkIn(A)
    await cmd(`lp user ${A} permission set donating.wanted true`)
    await until(async () => /: true/.test(await cmd(`zzperm ${A} donating.wanted`)), 6000)
    setMark()
    await quit(bots[A])
    await sleep(1500)
    check('logging out wanted inside is a cop death at the heist\'s cop rate: L = min(50,000 × 8%, 6,000) = $4,000', (await bal(A)) === 46000 && (await data(A, 'last-death-cause')) === 'cop' && logged(/forfeit/).length === 0, `${await bal(A)}; ${await data(A, 'last-death-cause')}`)
    await cmd(`lp user ${A} permission unset donating.wanted`)
    await until(async () => /: false/.test(await cmd(`zzperm ${A} donating.wanted`)), 6000)
    bots[A] = await join(A)
    await sleep(2000)

    // ---------- Logging out inside ----------
    const spawn = (await cmd('zzspawn')).match(/SPAWN (\S+) (\S+) (\S+)/).slice(1).map(Number)
    await cmd(`zzcombatend ${A}`)
    await walkIn(A)
    const wasIn = await member(A)
    setMark()
    await quit(bots[A])
    const forfeited = await until(async () => logged(/forfeit HeistA /).length === 1, 4000)
    check('logging out inside (not in combat) counts as failing: the heist\'s loot is lost', wasIn === ID && forfeited, `${wasIn}; ${logged(/forfeit/)}`)
    t = Date.now()
    bots[A] = await join(A)
    const home = await until(async () => near(await pos(A), spawn[0] + 0.5, spawn[2] + 0.5, 12), 5000)
    check('...and rejoining puts them at spawn, with a note', home && (await member(A)) === 'none' && /logged out inside the Test Vault/.test(text(A, t)), `${await pos(A)}; ${text(A, t)}`)
    await cmd(`zzcombatend ${A}`)
    await walkIn(A)
    setMark()
    await cmd(`zzkick ${A}`) // a staff kick (the console's /kick is flagged the same way)
    await sleep(1000)
    check('a kick (restart, staff) costs nothing', logged(/forfeit/).length === 0)
    t = Date.now()
    bots[A] = await join(A)
    const home2 = await until(async () => near(await pos(A), spawn[0] + 0.5, spawn[2] + 0.5, 12), 5000)
    check('...and rejoining puts them at spawn too', home2 && /moved out of the Test Vault/.test(text(A, t)), `${await pos(A)}; ${text(A, t)}`)
    // A kick the player causes (chat or command spam, a timed-out client) counts as logging out.
    await cmd(`zzcombatend ${A}`)
    await walkIn(A)
    const spamIn = await member(A)
    setMark()
    for (let i = 0; i < 25; i++) bots[A].chat('/heists')
    const spamLost = await until(async () => logged(/forfeit HeistA /).length === 1, 6000)
    check('getting yourself kicked (command spam) doesn\'t dodge the loss', spamIn === ID && spamLost, `${spamIn}; ${logged(/forfeit|leave/).join(' / ')}`)
    await sleep(1000)
    bots[A] = await join(A)
    await sleep(2000)

    // ---------- The clock starts at the first robbery (start-on "rob") ----------
    await cmd(`dheist end ${ID}`)
    await cmd('zzcfgtext heist::start-on rob')
    await until(async () => (await field('state')) === 'open', 10000)
    t = await walkIn(A)
    check('with start-on "rob", walking in doesn\'t start the clock', (await member(A)) === ID && (await field('state')) === 'open' && /clock starts at the first robbery/.test(text(A, t)) && /1 inside/.test(await papi(A, 'donating_heist_status_ztest')), `${await heist()}; ${text(A, t)}`)
    t = Date.now()
    await cmd(`dheist start ${ID}`) // what loot.sk calls at the first robbery
    await sleep(500)
    check('...the first robbery does', (await field('state')) === 'active' && /being robbed/.test(text(B, t)), `${await heist()}; ${text(B, t)}`)
    await cmd('zzcfgreload')

    // ---------- Alarm (advanced heists) and the lockdown ----------
    check('only advanced heists have an alarm', /not an advanced heist/.test(await cmd(`dheist alarm ${ID}`)) && (await field('alarm')) === 'none')
    await heistSet('advanced', 'true')
    const lockBad = await cmd(`dheist lock ${ID} add 728 201 725 733 202 725`)
    const lockOk = await cmd(`dheist lock ${ID} add 731 201 725 733 202 725 iron_bars`)
    check('lockdown boxes must be inside the heist', /outside the heist/.test(lockBad) && /lock box added/.test(lockOk), `${lockBad} / ${lockOk}`)
    await cmd('zzcfgtime alarm::warning 3 seconds')
    await cmd('zzcfgtime alarm::wave-interval 2 seconds')
    await place(B, OUTSIDE[0], OUTSIDE[1])
    setMark()
    t = Date.now()
    const alarm = await cmd(`dheist alarm ${ID}`)
    await sleep(400)
    check('the alarm: warning, robbers inside hunted, everyone told', /HEIST ztest alarm$/.test(alarm) && (await field('alarm')) === 'warning' && (await field('hunted')) === '1' && /ALARM/.test(text(A, t)) && /Alarm at the Test Vault/.test(text(B, t)) && (await hunt(B)) === 'none', `${alarm}; ${await heist()}; ${text(B, t)}`)
    check('...and the windows lock (bars)', await isBlock(732, 201, 725, 'iron_bars'))
    check('a second alarm does nothing', /already running/.test(await cmd(`dheist alarm ${ID}`)))
    // Waves are checked once a second: wave 1 at 3-4 s, wave 2 two seconds later.
    const w1 = await until(async () => (await field('alarm')) === 'waves' && (await field('wave')) === '1', 5000)
    const w2 = await until(async () => (await field('wave')) === '2', 3500)
    check('after the warning a wave, then one every interval', w1 && w2 && logged(/wave ztest 1/).length === 1 && logged(/wave ztest 2/).length === 1, `${w1} ${w2}; ${await heist()}`)
    await walkOut(A)
    check('walking out keeps the cops on you while in range', (await member(A)) === 'none' && (await hunt(A)) === ID && (await field('hunted')) === '1', `${await member(A)} ${await hunt(A)}`)
    t = Date.now()
    await cmd(`minecraft:tp ${A} ${FAR}`)
    const lost = await until(async () => (await field('alarm')) === 'none', 3000)
    check('leaving the chase radius loses the cops, and the alarm ends with nobody hunted', lost && (await field('hunted')) === '0' && /You lost the cops/.test(text(A, t)) && logged(/alarm-end ztest/).length === 1, `${await heist()}; ${text(A, t)}`)
    await walkIn(A)
    await cmd(`dheist alarm ${ID}`)
    const hunted = await field('hunted')
    await cmd(`dheist end ${ID}`)
    await sleep(800)
    check('robbers who fail leave the hunt (the alarm ends)', hunted === '1' && (await field('hunted')) === '0' && (await field('alarm')) === 'none', `${hunted}; ${await heist()}`)
    check('the reset takes the bars away again', await until(async () => isBlock(732, 201, 725, 'air'), 4000))
    await cmd('zzcfgreload')

    // ---------- Delete ----------
    const del = await cmd(`dheist delete ${ID} confirm`)
    check('delete removes the heist, its room file and hologram (the region stays)', /rg remove/.test(del) && /unknown/.test(await heist()) && !fs.existsSync(NBT) && !fs.existsSync(HOLO), `${del}; nbt ${fs.existsSync(NBT)}; holo ${fs.existsSync(HOLO)}`)
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd(`dheist delete ${ID} confirm`).catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`lp user ${name} permission unset donating.wanted`).catch(() => {})
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`zzdata ${name} rank none`).catch(() => {})
      await rcon.cmd(`zzdata ${name} passive-switched none`).catch(() => {})
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} 0.5 68 -656.5`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot)
    await rcon.cmd(`rg remove -w world ${REGION}`).catch(() => {})
    await rcon.cmd(`rg remove -w world ${SAFE}`).catch(() => {})
    await rcon.cmd(`fill 720 ${Y} 720 750 ${Y + 10} 740 air`).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air replace glass`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
