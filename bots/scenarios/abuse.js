// The abuse review of 2026-09-28 (heists, stores, bounties, levels, items) and the owner's answers the same day:
// a death while an alarm hunts you costs at least that heist's cop price (a fall used to cost difficulty 1's p);
// a hunted robber's duffel is HOT: whoever takes it (the robber too) can't sell those lines for duffel::hot-time (5 min),
// the base keeps them; a store's loot stays in a duffel for robbers over the store's max level; level XP from a sale
// counts only loot the seller robbed themselves; a claimed bounty stays new money for the killer and costs its victim
// 10% more (owner: "player pays 10% of their bounty on top of their death tax"); a run saves its reopen time when its
// clock starts (a stop mid-run can't skip the cooldown); Heist Rush cuts a cooldown once, never while its alarm runs;
// a members-only area (lvl<N>_) drawn around a low-level player moves them out; no Energy Drink inside a heist, and
// outside it's Speed II for 3 s (owner, after the test).
const fs = require('fs')
const path = require('path')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'AbuseA'
const B = 'AbuseB'
const Y = 200
const H = 'atest'
const S = 'astore'
const CHUNKS = '1392 1392 1456 1456'
const FAR = '0.5 68 -656.5'
const LOGS = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bots = {}
  const cmd = async c => (await rcon.cmd(c)).trim()
  try {
    // ---------- Helpers ----------
    const logLines = name => { const f = path.join(LOGS, `${name}.log`); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l !== '') : [] }
    const mark = {}
    const setMark = () => { for (const n of ['bag', 'levels', 'bounty', 'heists']) mark[n] = logLines(n).length }
    const logged = (re, name) => logLines(name).slice(mark[name] || 0).filter(l => re.test(l))
    const since = name => logLines(name).slice(mark[name] || 0).join(' / ')
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const bar = (name, t) => messagesSince(bots[name], t).filter(m => m.kind === 'game_info').map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(200) } return Boolean(await fn()) }
    const tp = async (name, x, z) => { await cmd(`zzheisttp ${name} ${x} ${Y} ${z}`); await sleep(400) }
    const bag = async name => {
      const r = await cmd(`zzbag ${name}`)
      return { raw: r, total: Number((r.match(/total=([\d.]+)/) || [])[1]), lines: (r.match(/lines=(\S*)/) || [])[1] || '' }
    }
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const data = async (name, key) => ((await cmd(`zzdata ${name} ${key}`)).match(/= (.*)$/) || [])[1]
    const duffels = async () => cmd('zzduffels')
    const reopen = async () => {
      const r = await cmd(`zzheistreopen ${H}`)
      return { raw: r, state: (r.match(/state=(\S+)/) || [])[1], until: Number((r.match(/until=(-?\d+)/) || [])[1]), reopen: Number((r.match(/reopen=(-?\d+)/) || [])[1]), rushed: (r.match(/rushed=(\S+)/) || [])[1] }
    }
    const reset = async name => {
      await cmd(`zzclear ${name}`)
      await cmd(`zzbagclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzhunt ${name} x release`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`zzbounty ${name}`)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zztestkit ${name}`) // bag tier 2 ($6,000)
      await cmd(`dlevel reset ${name}`) // level 0, and no heist run credited yet
      await cmd(`zzdata ${name} bounty none`)
      await cmd(`zzdata ${name} bounty-kills none`)
    }
    const clearItems = () => cmd('minecraft:kill @e[type=item,x=1392,y=190,z=1392,dx=64,dy=24,dz=64]')

    // ---------- Setup ----------
    for (const id of [H, S]) {
      await cmd(`dheist delete ${id} confirm`)
      await cmd(`rg remove -w world heist_${id}`)
    }
    await cmd('rg remove -w world safe_base_abuse')
    await cmd('rg remove -w world lvl100_abuse')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 1392 ${Y} 1392 1456 ${Y + 8} 1456 air`)
    await cmd(`fill 1392 ${Y - 1} 1392 1456 ${Y - 1} 1456 glass`)
    await clearItems()
    await cmd('zzcfgreload')
    await cmd(`zzregion heist_${H} 1420 ${Y - 1} 1400 1430 ${Y + 5} 1410`)
    await cmd(`dheist create ${H} 4`)
    await cmd(`dheist set ${H} name Abuse Bank`)
    await cmd(`dheist set ${H} level 0`)
    await cmd(`dheist set ${H} escape 300`)
    await cmd(`dheist set ${H} cooldown 600`)
    await cmd(`dheist exit ${H} 1415.5 ${Y} 1405.5`)
    await cmd(`dheist snapshot ${H}`)
    await cmd(`zzregion heist_${S} 1434 ${Y - 1} 1400 1438 ${Y + 5} 1404`)
    await cmd(`dheist create ${S} 0`)
    await cmd(`zzregion safe_base_abuse 1400 ${Y - 1} 1430 1406 ${Y + 5} 1436`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await reset(name)
    }
    await tp(A, 1410.5, 1420.5)
    await tp(B, 1412.5, 1420.5)
    await sleep(6000) // new players can't be hurt for a few seconds (CLAUDE.md)

    // ---------- A death while hunted costs the chase's cop price ----------
    const copP = Number(((await cmd('zzcfg difficulty::4::cop-p')).match(/= ([\d.]+)/) || [])[1])
    const p1 = Number(((await cmd('zzcfg difficulty::1::p')).match(/= ([\d.]+)/) || [])[1])
    await cmd(`eco set ${A} 20000`)
    await cmd(`zzhunt ${A} ${H}`)
    await cmd(`minecraft:kill ${A}`)
    await sleep(1500)
    const lossHunted = Number(await data(A, 'last-death-loss'))
    check(`a fall (no attacker) while an alarm hunts you costs the heist's cop price: min($20,000 × ${copP}, the bag's $6,000) = $${20000 * copP}`, lossHunted === 20000 * copP && (await bal(A)) === 20000 - 20000 * copP, `loss=${lossHunted} bal=${await bal(A)}`)
    await sleep(4000)
    await reset(A)
    await tp(A, 1410.5, 1420.5)
    await cmd(`eco set ${A} 20000`)
    await cmd(`minecraft:kill ${A}`)
    await sleep(1500)
    const lossFree = Number(await data(A, 'last-death-loss'))
    check(`...and the same death not hunted costs difficulty 1's p: $${20000 * p1}`, lossFree === 20000 * p1, `loss=${lossFree}`)
    await sleep(4000)

    // ---------- Hot loot ----------
    await reset(A)
    await reset(B)
    await tp(A, 1410.5, 1415.5)
    await tp(B, 1403.5, 1433.5) // in the base, out of the way
    await cmd(`zzbagadd ${A} ${H}#1 1500 own`)
    await cmd(`zzhunt ${A} ${H}`)
    setMark()
    await cmd(`minecraft:kill ${A}`)
    await sleep(1500)
    const d1 = await duffels()
    check('a hunted robber drops a HOT duffel (its name says so, the log keeps the hot time)', /HOT/.test(d1) && /lines=atest#1=1500/.test(d1) && logged(/death-lost AbuseA .*hot=\d{9,}/, 'bag').length === 1, `${d1} ${since('bag')}`)
    let t = Date.now()
    await tp(B, 1410.5, 1415.5)
    await sleep(1500)
    const hotB = Number(await data(B, `hot::${H}#1`))
    check('whoever takes it gets the loot and the heat (data hot::<tag>, about 5 min ahead) and is told', (await bag(B)).lines.includes('atest#1=1500') && hotB > Date.now() / 1000 + 250 && hotB < Date.now() / 1000 + 310 && /HOT LOOT/.test(text(B, t)), `${(await bag(B)).raw} hot=${hotB} ${text(B, t)}`)
    setMark()
    t = Date.now()
    await tp(B, 1403.5, 1433.5)
    await sleep(2500)
    check('the base keeps hot loot: nothing sold, the action bar counts it down', (await bag(B)).lines.includes('atest#1=1500') && /HOT LOOT.*can't be sold for/.test(bar(B, t)) && logged(/sell AbuseB/, 'bag').length === 0, `${(await bag(B)).raw} ${bar(B, t)} ${since('bag')}`)
    await cmd(`zzdata ${B} hot::${H}#1 1`) // the heat ran out
    await sleep(2000)
    check('...and sells it once the heat is over', (await bag(B)).total === 0 && logged(/sell AbuseB .*total=1500 /, 'bag').length === 1 && (await data(B, `hot::${H}#1`)) === '<none>', `${(await bag(B)).raw} ${since('bag')}`)

    // ---------- Store loot stays for new robbers ----------
    await reset(A)
    await reset(B)
    await tp(B, 1403.5, 1425.5)
    await tp(A, 1410.5, 1415.5)
    await cmd(`zzbagadd ${A} ${S}#1 500`)
    await cmd(`minecraft:kill ${A}`)
    await sleep(1500)
    await cmd(`dlevel set ${B} 20`)
    t = Date.now()
    await tp(B, 1410.5, 1415.5)
    await sleep(1500)
    check('a robber over a store\'s max level (9) leaves its loot in the duffel, and is told why', (await bag(B)).total === 0 && /lines=astore#1=500/.test(await duffels()) && /Store loot is for new robbers \(up to level 9\)/.test(bar(B, t)), `${(await bag(B)).raw} ${await duffels()} ${bar(B, t)}`)
    await cmd(`dlevel set ${B} 0`)
    await sleep(1500)
    check('...a new robber takes it', (await bag(B)).lines.includes('astore#1=500') && !/astore#1/.test(await duffels()), `${(await bag(B)).raw} ${await duffels()}`)
    await clearItems()

    // ---------- Level XP from a sale: own loot only ----------
    await reset(B)
    await tp(B, 1412.5, 1420.5)
    await cmd(`zzbagadd ${B} ${H}#5 1000`)
    setMark()
    t = Date.now()
    await tp(B, 1403.5, 1433.5)
    await sleep(1500)
    check('selling loot the seller didn\'t rob (a picked-up duffel) pays money but no level XP', logged(/sell AbuseB .*total=1000 .*own=0 /, 'bag').length === 1 && logged(/xp AbuseB/, 'levels').length === 0 && !/XP/.test(text(B, t)), `${since('bag')} ${since('levels')} ${text(B, t)}`)
    await tp(B, 1412.5, 1420.5)
    await cmd(`zzbagadd ${B} ${H}#6 1000 own`)
    setMark()
    t = Date.now()
    await tp(B, 1403.5, 1433.5)
    await sleep(1500)
    check('selling loot they robbed themselves: floor($1,000 / 100) + 10 = 20 XP', logged(/xp AbuseB \S+ \+20 why=sell/, 'levels').length === 1 && /\+20 XP/.test(text(B, t)), `${since('levels')} ${text(B, t)}`)

    // ---------- A claimed bounty costs its victim 10% ----------
    await reset(A)
    await reset(B)
    await tp(A, 1410.5, 1420.5)
    await tp(B, 1412.5, 1420.5)
    await sleep(5000)
    await cmd(`eco set ${A} 10000`)
    const bB = await bal(B)
    await cmd('zzbountyip off') // both bots play from 127.0.0.1
    await cmd(`zzbounty ${A} 5000 robbery`)
    setMark()
    t = Date.now()
    await cmd(`damage ${A} 1000 minecraft:player_attack by ${B}`)
    await sleep(1500)
    const aBal = await bal(A)
    check('the killer is paid the whole $5,000 bounty (new money, owner 2026-09-28)', (await bal(B)) === bB + 5000, `B ${bB} -> ${await bal(B)}`)
    check('...and the victim pays 10% of it on top of the death: $10,000 - $100 (1%) - $500 = $9,400', aBal === 9400 && /Your \$5,000 bounty was claimed: you paid a 10% fee on what you earned of it \(\$500\) on top of your death/.test(text(A, t)) && logged(/fee AbuseA \S+ bounty=5000 fee=500/, 'bounty').length === 1, `${aBal} ${text(A, t)} ${since('bounty')}`)
    await sleep(4000)
    await reset(A)
    await tp(A, 1410.5, 1420.5)
    await sleep(5000)
    await cmd(`eco set ${A} 10000`)
    await cmd(`zzbounty ${A} 3000 placed`)
    setMark()
    t = Date.now()
    await cmd(`damage ${A} 1000 minecraft:player_attack by ${B}`)
    await sleep(1500)
    check('a bounty other players placed costs its target no fee (else a placer could claim it back and drain them): $10,000 - $100', (await bal(A)) === 9900 && logged(/fee AbuseA/, 'bounty').length === 0, `${await bal(A)} ${since('bounty')}`)
    await sleep(4000)

    // ---------- A run saves its reopen time when it starts; Heist Rush cuts a cooldown once ----------
    await cmd(`dheist enable ${H}`)
    await until(async () => (await reopen()).state === 'open', 15000)
    await cmd(`dheist start ${H}`)
    await sleep(300)
    const r1 = await reopen()
    check('the clock\'s start saves the reopen time: escape 300 s + cooldown 600 s (a stop mid-run can\'t skip the cooldown)', r1.state === 'active' && r1.reopen >= 890 && r1.reopen <= 901, r1.raw)
    await cmd(`dheist end ${H}`)
    await sleep(300)
    const r2 = await reopen()
    await cmd('dbooster clear rush')
    await cmd('dbooster stop rush')
    await cmd(`dbooster add ${A} rush 2 1 2`)
    await sleep(500)
    const r3 = await reopen()
    check('a Heist Rush (2x) halves a running cooldown once (600 s -> about 300 s)', r2.state === 'cooldown' && r2.until >= 595 && r3.until >= 290 && r3.until <= 305 && r3.rushed === 'true', `${r2.raw} -> ${r3.raw}`)
    await cmd('dbooster stop rush') // the queued second rush starts now
    await sleep(500)
    const r4 = await reopen()
    check('...the next queued rush doesn\'t cut the same cooldown again', r4.until >= 285 && r4.until <= 305, r4.raw)
    await cmd('dbooster clear rush')
    await cmd('dbooster stop rush')
    await cmd(`dheist disable ${H}`)
    await cmd(`dheist enable ${H}`)
    await until(async () => (await reopen()).state === 'open', 15000)
    await cmd(`dheist start ${H}`)
    await cmd(`dheist end ${H}`)
    // An alarm that still hunts someone (heistAlarmTick ends one that hunts nobody).
    await tp(A, 1410.5, 1420.5)
    await cmd(`zzhunt ${A} ${H}`)
    await cmd(`zzheistvar ${H} alarm waves`)
    await sleep(300)
    const r5 = await reopen()
    await cmd(`dbooster add ${A} rush 2 1`)
    await sleep(500)
    const r6 = await reopen()
    check('a Heist Rush never cuts a cooldown while that heist\'s alarm still runs (opening would end the chase)', r5.until >= 595 && r6.until >= 590 && r6.rushed !== 'true', `${r5.raw} -> ${r6.raw}`)
    await cmd(`zzheistvar ${H} alarm none`)
    await cmd(`zzhunt ${A} x release`)
    await cmd('dbooster clear rush')
    await cmd('dbooster stop rush')

    // ---------- A members-only area drawn around someone ----------
    await reset(A)
    await tp(A, 1440.5, 1440.5)
    await sleep(1500)
    t = Date.now()
    await cmd(`zzregion lvl100_abuse 1436 ${Y - 1} 1436 1446 ${Y + 5} 1446`)
    const out = await until(async () => {
      const r = await cmd(`execute as ${A} run data get entity @s Pos`)
      const x = Number((r.match(/\[(-?[\d.]+)d/) || [])[1])
      return Math.abs(x - 1440.5) > 20
    }, 4000)
    check('a level-0 player inside a new lvl100_ region is moved out (to spawn: their last spot is in it too)', out && /Members only: level 100/.test(bar(A, t)), `${await cmd(`execute as ${A} run data get entity @s Pos`)} ${bar(A, t)}`)
    await cmd('rg remove -w world lvl100_abuse')

    // ---------- The Energy Drink ----------
    await reset(A)
    await cmd(`dheist disable ${H}`)
    await cmd(`dheist enable ${H}`)
    await until(async () => (await reopen()).state === 'open', 15000)
    await tp(A, 1425.5, 1405.5) // inside the open heist
    await sleep(1500)
    await cmd(`wm give ${A} Energy_Drink 1 {slot:0}`)
    await sleep(300)
    bots[A].setQuickBarSlot(0)
    await sleep(300)
    t = Date.now()
    bots[A].activateItem()
    await sleep(200)
    bots[A].deactivateItem()
    await sleep(1200)
    const inHeist = await cmd(`data get entity ${A} active_effects`)
    check('no Energy Drink inside a heist: refused, no Speed, the can is kept', !/speed/.test(inHeist) && /No energy drinks inside a heist/.test(bar(A, t)) && /0=amethyst shard x1/.test(await cmd(`zzdump ${A}`)), `${inHeist} ${bar(A, t)} ${await cmd(`zzdump ${A}`)}`)
    await tp(A, 1410.5, 1420.5)
    await sleep(1500)
    bots[A].setQuickBarSlot(0)
    bots[A].activateItem()
    await sleep(200)
    bots[A].deactivateItem()
    await sleep(700)
    const outside = await cmd(`data get entity ${A} active_effects`)
    const dur = Number((outside.match(/duration: (\d+)/) || [])[1])
    const amp = Number((outside.match(/amplifier: (\d+)b/) || [])[1])
    check('outside it\'s Speed II (amplifier 1) for 3 seconds (60 ticks, owner 2026-09-28)', /minecraft:speed/.test(outside) && amp === 1 && dur > 20 && dur <= 60, outside)
  } finally {
    await rcon.cmd('zzbountyip on').catch(() => {})
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd('dbooster clear rush').catch(() => {})
    await rcon.cmd('dbooster stop rush').catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`zzhunt ${name} x release`).catch(() => {})
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzbagclear ${name}`).catch(() => {})
      await rcon.cmd(`zzbounty ${name}`).catch(() => {})
      await rcon.cmd(`dlevel set ${name} 0`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot)
    for (const id of [H, S]) {
      await rcon.cmd(`dheist delete ${id} confirm`).catch(() => {})
      await rcon.cmd(`rg remove -w world heist_${id}`).catch(() => {})
    }
    await rcon.cmd('rg remove -w world safe_base_abuse').catch(() => {})
    await rcon.cmd('rg remove -w world lvl100_abuse').catch(() => {})
    await rcon.cmd('minecraft:kill @e[type=item,x=1392,y=190,z=1392,dx=64,dy=24,dz=64]').catch(() => {})
    await rcon.cmd(`fill 1392 ${Y} 1392 1456 ${Y + 8} 1456 air`).catch(() => {})
    await rcon.cmd(`fill 1392 ${Y - 1} 1392 1456 ${Y - 1} 1456 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
