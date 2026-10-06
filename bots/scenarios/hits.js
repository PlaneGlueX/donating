// hits.sk: hit contracts (owner, 2026-09-27). One target a week; a contract per tier is taken in person from the
// Broker (the level, one a week, only switching to an easier one); away from the Broker a click leads the GPS there.
// Windows are shared and run only while the tier is active (2+ online, or a holder of that tier online). While one
// runs the holder hunts their own copy: the target and 2 bodyguards, Citizens NPCs only the holder's client ever gets;
// only the holder hurts them and only they hurt the holder (a bodyguard's hits are the "hit" death cause); tips put a
// search area on the GPS; seen = spotted (the title, a locator mark); hitting it = noticed; the takedown pays the
// tier (never boosted), XP and a streak; dying or quitting takes the copy away; staff only.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')
const fs = require('fs')
const path = require('path')

const A = 'HitA'
const B = 'HitB'
const Y = 200
const CHUNKS = '3088 3088 3172 3142'
const BROKER = [3095.5, Y, 3095.5]
const HERE = [3097.5, Y, 3097.5]
const AWAY = [3140.5, Y, 3120.5]
const FAR = '0.5 68 -656.5'
const NODES = [[3100, 3100], [3130, 3100], [3160, 3100], [3160, 3130], [3130, 3130], [3100, 3130]]

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  const nodes = []
  let broker = ''
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const field = (s, k) => (s.match(new RegExp(` ${k}=(\\S*)`)) || [])[1] || ''
    const info = async name => cmd(`dhit info ${name}`)
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const hp = async name => Number(((await cmd(`zzhp ${name}`)).match(/HP \S+ ([\d.]+)/) || [])[1])
    const npcHealth = async uuid => Number(((await cmd(`data get entity ${uuid} Health`)).match(/data: ([\d.]+)f/) || [])[1])
    const papi = async (name, ph) => ((await cmd(`zzpapi ${name} ${ph}`)).match(/= (.*)$/m) || [])[1] || ''
    const windowOpen = bot => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const openHits = async name => { const o = windowOpen(bots[name]); bots[name].chat('/hits'); const w = await o; await sleep(300); return w }
    const lore = w => (w ? w.slots.slice(0, 36).map(i => (i ? JSON.stringify(i) : '')).join(' ') : '')
    const click = async (name, s) => { if (bots[name].currentWindow) await bots[name].clickWindow(s, 0, 0).catch(() => {}); await sleep(600) }
    const close = name => { if (bots[name].currentWindow) bots[name].closeWindow(bots[name].currentWindow) }
    const week = async () => cmd('dhit week')
    const left = async t => Number((((await week()).match(new RegExp(`open-${t}=\\d+\\|\\d+\\|(\\d+)`))) || [])[1])

    // ---------- Setup: a street loop, the Broker, two hunters ----------
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 3088 ${Y} 3088 3172 ${Y + 5} 3142 air`)
    await cmd(`fill 3088 ${Y - 1} 3088 3172 ${Y - 1} 3142 glass`)
    for (const [x, z] of NODES) nodes.push(((await cmd(`dhit node addat ${x} ${Y} ${z} Test_Street`)).match(/node (\d+) added/) || [])[1] || '')
    for (let i = 0; i < nodes.length; i++) await cmd(`dhit node link ${nodes[i]} ${nodes[(i + 1) % nodes.length]}`)
    await cmd(`dhit node link ${nodes[1]} ${nodes[4]}`)
    broker = ((await cmd(`dquest addat hits ${BROKER.join(' ')} 180 Test Hall`)).match(/giver (\d+) \(hits\) added/) || [])[1] || ''
    // The copy appears at once, anywhere on the loop; bodyguards hit softly (the Sentinel check below).
    await cmd('zzcfgset hit::start-away 0')
    await cmd('zzcfgset hit::materialize 300')
    await cmd('zzcfgset hit::guard-damage 1')
    const seen = { [A]: new Set(), [B]: new Set() }
    for (const name of [A, B]) {
      bots[name] = await join(name)
      bots[name]._client.on('spawn_entity', p => seen[name].add(String(p.objectUUID).toLowerCase()))
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`dhit reset ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`eco set ${name} 50000`)
      await cmd(`minecraft:tp ${name} ${AWAY[0]} ${Y} ${AWAY[2]}`)
    }
    // Joining makes 2 online: the week's due windows open; close them (they stay used).
    await sleep(1500)
    for (const t of ['easy', 'medium', 'hard']) await cmd(`dhit window ${t} close`)
    await cmd(`dlevel set ${A} 15`)
    await cmd(`dlevel set ${B} 14`)
    check('street nodes and the Broker are placed', nodes.every(Boolean) && broker !== '', `${nodes} | ${broker}`)

    // ---------- Taking a contract, in person ----------
    let w = await openHits(A)
    let l = lore(w)
    check('away from the Broker, /hits shows this week\'s target and says to take it at the Broker', /WANTED/.test(l) && /Take it at the Broker/.test(l), l.slice(0, 400))
    await click(A, 11)
    const pin = await cmd(`dphone gps ${A}`)
    check('...and a click leads the GPS to the Broker (a pin named by its place)', /active=pin/.test(pin) && /label=Test_Hall/.test(pin), pin)
    close(A)
    await cmd(`dphone gps ${A} clear`)
    for (const name of [A, B]) await cmd(`minecraft:tp ${name} ${HERE[0]} ${Y} ${HERE[2]}`)
    await sleep(800)
    w = await openHits(B)
    l = lore(w)
    await click(B, 11)
    await click(B, 11)
    check('below the tier\'s level: "Needs level 15", nothing taken', /Needs level 15/.test(l) && field(await info(B), 'tier') === '', `${field(await info(B), 'tier')} | ${l.slice(0, 300)}`)
    close(B)
    let t = Date.now()
    w = await openHits(A)
    await click(A, 11)
    const armed = lore(bots[A].currentWindow)
    await click(A, 11)
    await sleep(500)
    let i = await info(A)
    check('at the Broker: a second click takes the Easy contract (the Broker\'s text)', /Click again/.test(armed) && field(i, 'tier') === 'easy' && field(i, 'state') === 'hunting' && /Broker/.test(text(A, t)), `${i} | ${text(A, t).slice(0, 200)}`)
    close(A)
    await cmd(`dlevel set ${A} 50`)
    w = await openHits(A)
    l = lore(w)
    await click(A, 13)
    await click(A, 13)
    check('only an easier contract can replace it', /only switch to an easier/.test(l) && field(await info(A), 'tier') === 'easy', `${field(await info(A), 'tier')} | ${l.slice(0, 300)}`)
    close(A)
    await sleep(1500)
    const side = await papi(A, '%donating_hit%')
    check('while the target is away: no hunt, and the sidebar says when it\'s due', field(await info(A), 'now') === 'false' && field(await info(A), 'target') === '<none>' && /◎/.test(side) && /(next in|due soon|gone for)/.test(side), `${await info(A)} | ${side}`)

    // ---------- The window: the walker, tips, the copy ----------
    // Nothing is spotted until the proximity checks below (spot-range 0): the hit-to-notice path is tested alone.
    await cmd('zzcfgset hit::spot-range 0')
    const W = Number(((await week()).match(/week=(\d+)/) || [])[1])
    await cmd(`minecraft:tp ${A} ${AWAY[0]} ${Y} ${AWAY[2]}`)
    await cmd(`minecraft:tp ${B} ${AWAY[0] + 2} ${Y} ${AWAY[2]}`)
    const tB = Date.now()
    t = Date.now()
    const tWin = t
    await cmd('dhit window easy open 600')
    await until(async () => field(await info(A), 'guuids').split(',').filter(Boolean).length === 2, 10000)
    i = await info(A)
    const gps = await cmd(`dphone gps ${A}`)
    check('in town: the Broker\'s tip puts a search area on the GPS (the quest slot)', field(i, 'now') === 'true' && /active=quest/.test(gps) && /search_area/.test(gps) && /Broker: seen/.test(text(A, t)), `${gps} | ${text(A, t).slice(0, 200)}`)
    let guards = field(i, 'guards').split(',').filter(Boolean)
    let tu = field(i, 'tuuid').toLowerCase()
    let gu = field(i, 'guuids').split(',').filter(Boolean).map(x => x.toLowerCase())
    check('the hunter\'s copy: the target and 2 bodyguards (Citizens NPCs)', /^\d+$/.test(field(i, 'target')) && guards.length === 2 && tu.length === 36 && gu.length === 2, i)
    // The bodyguards see as far as hit::guard-range (30): Sentinel's default 20, measured from each one's own eye, let a
    // hunter inside the old 24-block gate shoot the target with no answer (review, 2026-10-06).
    await cmd('zzconsole citizens save')
    await sleep(1500)
    const saves = fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'plugins', 'Citizens', 'saves.yml'), 'utf8')
    const block = id => { const m = saves.split(new RegExp(`\\n  '?${id}'?:\\n`))[1]; return m ? m.split(/\n  '?\d+'?:\n/)[0] : '' }
    const ranges = guards.map(id => (block(id).match(/\n\s+range: ([\d.]+)/) || [])[1])
    check('the bodyguards\' Sentinel range is hit::guard-range (30), past the 16-block gate plus their 12-block spread', guards.length === 2 && ranges.every(r => Number(r) === 30), `ranges ${ranges.join(',')}`)
    await sleep(1000)
    const pvT = await cmd(`dphone pv ${tu}`)
    check('only the hunter\'s client ever gets them (the other player standing next to them gets no spawn packet)', seen[A].has(tu) && gu.every(u => seen[A].has(u)) && !seen[B].has(tu) && !gu.some(u => seen[B].has(u)) && /tracked=HitA( |$)/.test(pvT), `A=${seen[A].has(tu)} B=${seen[B].has(tu)} guards A=${gu.map(u => seen[A].has(u))} B=${gu.map(u => seen[B].has(u))} | ${pvT}`)
    const sb = await papi(A, '%donating_hit%')
    check('the sidebar: hunting, with the window\'s time left', /hunting \d+:\d\d/.test(sb), sb)

    // ---------- Only the hunter hurts them, only they hurt the hunter ----------
    await sleep(Math.max(0, 6000 - (Date.now() - tB))) // EssentialsX's teleport protection
    const h0 = await npcHealth(tu)
    await cmd(`minecraft:damage ${tu} 5 minecraft:player_attack by ${B}`)
    await sleep(300)
    const h1 = await npcHealth(tu)
    check('another player can\'t hurt the target', h0 > 0 && h1 === h0, `${h0} -> ${h1}`)
    // B as a Sentinel target too: only hits.sk's gate can refuse the hit then (safeshot would let it through).
    const bUuid = bots[B].player.uuid
    await cmd(`zzconsole sentinel addtarget uuid:${bUuid} --id ${guards[0]}`)
    await cmd(`zzhp ${B} 20`)
    await cmd(`minecraft:damage ${B} 4 minecraft:mob_attack by ${gu[0]}`)
    await sleep(300)
    check('a bodyguard can\'t hurt anyone but the hunter (even someone its Sentinel would shoot)', (await hp(B)) === 20, `${await hp(B)}`)
    await cmd(`zzconsole sentinel removetarget uuid:${bUuid} --id ${guards[0]}`)
    const notYet = field(await info(A), 'noticed')
    // The hunter stands wherever the copy came up (often 16-24 blocks off): the range gate is checked on its own below.
    await cmd('zzcfgset hit::max-range 64')
    await cmd(`minecraft:damage ${tu} 3 minecraft:player_attack by ${A}`)
    await until(async () => field(await info(A), 'noticed') === 'true', 2000)
    check('the hunter\'s hit lands and the target notices them (never seen close before)', notYet !== 'true' && (await npcHealth(tu)) < h0 && field(await info(A), 'noticed') === 'true', `${notYet} | ${await npcHealth(tu)} | ${await info(A)}`)
    await cmd(`zzhp ${A} 20`)
    await cmd(`minecraft:damage ${A} 2 minecraft:mob_attack by ${gu[0]}`)
    await sleep(400)
    const cA = await cmd(`zzcombat ${A}`)
    check('a bodyguard\'s hit lands on the hunter and tags them for the hit ("hit", not "cop")', (await hp(A)) < 20 && /cause=hit/.test(cA), `${await hp(A)} | ${cA}`)
    // Carrying loot, the base's route wins; the search area comes back after.
    await cmd(`zzbagadd ${A} zz#1 500`)
    await until(async () => !/search_area/.test(await cmd(`dphone gps ${A}`)), 3000)
    const withLoot = await cmd(`dphone gps ${A}`)
    await cmd(`zzbagadd ${A} zz#1 0`)
    await until(async () => /search_area/.test(await cmd(`dphone gps ${A}`)), 3000)
    const after = await cmd(`dphone gps ${A}`)
    check('carrying loot the search area gives way to the base, and comes back after', !/search_area/.test(withLoot) && /search_area/.test(after), `${withLoot} | ${after}`)
    // Going AFK mid-fight doesn't reset it (the copy stays while it fought the hunter lately).
    const keepT = field(await info(A), 'target')
    await cmd(`zzhp ${A} 20`)
    await cmd(`minecraft:damage ${tu} 1 minecraft:player_attack by ${A}`) // a fresh engagement (the 30 s window)
    await cmd(`zzafk ${A}`)
    const wentAfk = await until(async () => /: true/.test(await cmd(`zzafkstate ${A}`)), 11000) // afk.sk marks AFK every 10 s
    await sleep(1500) // at least one pass of hitSecond while AFK
    const afkInfo = await info(A)
    bots[A].chat('/level')
    await sleep(500)
    check('going AFK in the middle of a fight doesn\'t take the copy away', wentAfk && field(afkInfo, 'eligible') === 'false' && /^\d+$/.test(keepT) && field(afkInfo, 'target') === keepT && field(await info(A), 'target') === keepT, `${wentAfk} | ${afkInfo}`)
    // A target whose chunk unloaded (here: despawned): the copy goes after 3 s, and a new one comes.
    const oldT = field(await info(A), 'target')
    await cmd(`zzconsole npc despawn ${oldT}`)
    await until(async () => field(await info(A), 'target') !== oldT, 8000)
    const gone1 = field(await info(A), 'target')
    await until(async () => /^\d+$/.test(field(await info(A), 'target')) && field(await info(A), 'guuids').split(',').filter(Boolean).length === 2, 10000)
    i = await info(A)
    check('a target that can\'t be found (its chunk unloaded) takes its copy with it, and a new copy comes', gone1 !== oldT && /^\d+$/.test(field(i, 'target')) && field(i, 'target') !== oldT, `${oldT} -> ${gone1} -> ${field(i, 'target')}`)
    tu = field(i, 'tuuid').toLowerCase()
    gu = field(i, 'guuids').split(',').filter(Boolean).map(x => x.toLowerCase())
    guards = field(i, 'guards').split(',').filter(Boolean)
    // Near the target: spotted.
    await cmd('zzcfgset hit::spot-range 40')
    await sleep(1500)
    const te = Object.values(bots[A].entities).find(e => e.uuid && e.uuid.toLowerCase() === tu)
    if (te) await cmd(`minecraft:tp ${A} ${te.position.x + 12} ${Y} ${te.position.z}`)
    await until(async () => field(await info(A), 'spotted') === 'true', 6000)
    await sleep(600)
    const mark = await cmd(`dphone mark ${A} status`)
    check('within sight: TARGET SPOTTED, and a locator mark for the hunter', field(await info(A), 'spotted') === 'true' && /TARGET SPOTTED/.test(text(A, tWin)) && /stand=[0-9a-f-]{36}/.test(mark), `${mark} | ${await info(A)} | ${text(A, tWin).slice(0, 300)}`)
    await sleep(4500) // EssentialsX's teleport protection
    await cmd(`minecraft:damage ${tu} 1 minecraft:player_attack by ${A}`) // this copy notices them too
    await cmd(`zzhp ${A} 20`)
    const shot = await until(async () => (await hp(A)) < 20, 12000)
    check('the bodyguards shoot the hunter on their own (Sentinel, no projectile)', shot, `${await hp(A)}`)
    await cmd(`zzhp ${A} 20`)

    // Beyond hit::max-range (2026-10-06: a Sniper Rifle from past the bodyguards' 16-block reach was a free kill) the
    // hunter's hit is refused; set to 1 block here, so the hunter standing next to the target is "too far".
    await cmd('zzcfgset hit::max-range 1')
    const hr0 = await npcHealth(tu)
    t = Date.now()
    await cmd(`minecraft:damage ${tu} 1 minecraft:player_attack by ${A}`)
    await sleep(400)
    const hr1 = await npcHealth(tu)
    await cmd('zzcfgset hit::max-range 16')
    check('a hit from beyond hit::max-range is refused ("Too far")', hr0 > 0 && hr1 === hr0 && /Too far/.test(text(A, t)), `${hr0} -> ${hr1} | ${text(A, t).slice(0, 200)}`)

    // ---------- The takedown ----------
    // A streak: last contract two weeks ago (one missed week is forgiven): +5%.
    await cmd(`zzdata ${A} hit::streak-week ${W - 2}`)
    await cmd(`zzdata ${A} hit::streak 1`)
    const before = await bal(A)
    t = Date.now()
    await cmd('zzcfgset hit::max-range 64') // the target may have run off by now (the gate has its own check)
    await cmd(`minecraft:damage ${tu} 200 minecraft:player_attack by ${A}`)
    await until(async () => field(await info(A), 'state') === 'done', 4000)
    await cmd('zzcfgset hit::max-range 16')
    await sleep(1500)
    i = await info(A)
    const paidA = (await bal(A)) - before
    check('the takedown pays the Easy contract with a 2-week streak ($10,000 x 1.05 = $10,500), once, with TARGET DOWN', paidA === 10500 && /TARGET DOWN/.test(text(A, t)) && field(i, 'streak') === '2', `paid ${paidA} | ${i} | ${text(A, t).slice(0, 200)}`)
    check('...and nobody else hears about it (no death message for the target)', !/was slain|was killed|died|was shot/.test(text(B, t)), text(B, t).slice(0, 300))
    const gone = await cmd(`dphone pv ${gu[0]}`)
    check('...and the copy is gone (target, bodyguards, the mark)', field(i, 'target') === '<none>' && /^PV \S+ none$/.test(gone) && /stand=none/.test(await cmd(`dphone mark ${A} status`)), `${i} | ${gone}`)
    await cmd(`minecraft:tp ${A} ${HERE[0]} ${Y} ${HERE[2]}`)
    await sleep(800)
    w = await openHits(A)
    l = lore(w)
    await click(A, 13)
    await click(A, 13)
    close(A)
    const i2 = await info(A)
    check('one contract a week: taking another is refused', /already took this week/.test(l) && field(i2, 'tier') === 'easy' && field(i2, 'state') === 'done', `${i2} | ${l.slice(0, 300)}`)
    check('the sidebar after the takedown', /Target down/.test(await papi(A, '%donating_hit%')), await papi(A, '%donating_hit%'))

    // ---------- Dying to a bodyguard, the week turning, quitting ----------
    await cmd(`dhit give ${A} medium`)
    await cmd(`minecraft:tp ${A} ${AWAY[0]} ${Y} ${AWAY[2]}`)
    await cmd('dhit window medium open 600')
    await until(async () => /^\d+$/.test(field(await info(A), 'target')) && field(await info(A), 'guuids').split(',').filter(Boolean).length === 2, 10000)
    await sleep(5000)
    const gu2 = field(await info(A), 'guuids').split(',').filter(Boolean)
    await cmd(`zzdata ${A} last-death-cause none`)
    await cmd(`zzdata ${A} bag-tier 1`)
    // Bodyguards only hurt the hunter once the target has noticed them (before that Sentinel's safeshot cancels it),
    // and Sentinel sets every hit by its NPCs to their damage setting (1 in this test): half a heart left.
    await cmd('zzcfgset hit::max-range 64') // wherever the copy came up (the gate has its own check)
    await cmd(`minecraft:damage ${field(await info(A), 'tuuid')} 1 minecraft:player_attack by ${A}`)
    await until(async () => field(await info(A), 'noticed') === 'true', 3000)
    await cmd(`eco set ${A} 100000`) // B x p = 3,000 > the Gym Bag's 2,000: the cap binds
    const b0d = await bal(A)
    t = Date.now()
    // The bodyguards are shooting already: a real hit just before leaves Minecraft's half-second invulnerability,
    // which swallows the test's blow. Retry until the hunter is down.
    let dmg = ''
    for (let k = 0; k < 4; k++) {
      await cmd(`zzhp ${A} 1`)
      dmg = await cmd(`minecraft:damage ${A} 100 minecraft:mob_attack by ${gu2[0]}`)
      await sleep(800)
      if (/= hit$/.test(await cmd(`zzdata ${A} last-death-cause`))) break
    }
    const cause = await cmd(`zzdata ${A} last-death-cause`)
    const loss = Number(((await cmd(`zzdata ${A} last-death-loss`)).match(/= (\d+)/) || [])[1])
    const want = Math.floor(Math.min(b0d * 0.03, 2000))
    check('dying to a bodyguard is a "hit" death costing 3% capped at the bag, the copy goes, and it isn\'t announced', /= hit$/.test(cause) && loss === want && field(await info(A), 'target') === '<none>' && !/HitA/.test(text(B, t)), `${dmg} | ${cause} loss=${loss} want=${want} | ${await info(A)} | B heard: ${text(B, t).slice(0, 200)}`)
    await cmd('zzcfgset hit::max-range 16')
    try { bots[A].respawn() } catch (err) {}
    await sleep(4000)
    await cmd(`minecraft:tp ${A} ${AWAY[0]} ${Y} ${AWAY[2]}`)
    await until(async () => /^\d+$/.test(field(await info(A), 'target')), 10000)
    const tu3 = field(await info(A), 'tuuid').toLowerCase()
    check('after respawning the hunt goes on: a new copy', /^[0-9a-f-]{36}$/.test(tu3), tu3)
    // The week turns mid-hunt: the copy, the walker and the search area go.
    await cmd(`zzweek ${W + 1}`)
    await until(async () => field(await info(A), 'target') === '<none>' && !/search_area/.test(await cmd(`dphone gps ${A}`)), 5000)
    const turned = await info(A)
    const turnedGps = await cmd(`dphone gps ${A}`)
    await cmd('zzweek off')
    check('the week turning mid-hunt ends it: no copy, no search area', field(turned, 'target') === '<none>' && !/search_area/.test(turnedGps) && /^PV \S+ none$/.test(await cmd(`dphone pv ${tu3}`)), `${turned} | ${turnedGps}`)
    await until(async () => /^\d+$/.test(field(await info(A), 'target')), 10000)
    const tu4 = field(await info(A), 'tuuid').toLowerCase()
    await cmd(`zzcombatend ${A}`)
    await quit(bots[A])
    delete bots[A]
    await sleep(1500)
    const q = await cmd(`dphone pv ${tu4}`)
    check('quitting takes the copy away', /^[0-9a-f-]{36}$/.test(tu4) && /^PV \S+ none$/.test(q), `${tu4} | ${q}`)

    // ---------- The schedule ----------
    await cmd('dhit week reroll')
    const wl = await cmd('dhit week list')
    const hardDays = new Set((wl.match(/HIT {3}hard #\d+ at=(\d+)/g) || []).map(x => Math.floor((Number(x.match(/at=(\d+)/)[1]) - W * 604800) / 86400)))
    check('the week\'s windows: Easy 14 (2 a day), Medium 7, Hard 5 on 5 different days', /easy windows=14/.test(wl) && /medium windows=7/.test(wl) && /hard windows=5/.test(wl) && hardDays.size === 5, `${[...hardDays]} | ${wl.split('\n').slice(0, 4).join(' / ')}`)
    // Only B is online, with no medium contract: due windows wait; once B holds one the latest opens, the older is used.
    // Anyone else online too (the owner playing on the test server) makes the server active (2+ online): then the
    // latest due window opens at once instead of waiting, and the older one is still used up.
    const others = Number(((await cmd('list')).match(/There are (\d+)/) || [])[1]) - 1
    await cmd('zzhitwin medium clear')
    const nowU = Math.floor(Date.now() / 1000)
    await cmd(`zzhitwin medium 1 ${nowU - 7200}`)
    await cmd(`zzhitwin medium 2 ${nowU - 3600}`)
    await sleep(3200)
    const waiting = await week()
    await cmd(`dhit give ${B} medium`)
    await until(async () => /open-medium=\d+\|2\|/.test(await week()), 4000)
    const opened = await cmd('dhit week list')
    const waited = others > 0 ? /open-medium=\d+\|2\|/.test(waiting) : /open-medium=<none>/.test(waiting)
    check(`a window due while nobody could play waits; then only the latest opens (the older one is used up)${others > 0 ? ` [${others} other player(s) online: active, so it opened at once]` : ''}`, waited && /open-medium=\d+\|2\|/.test(opened) && /medium #1 at=\d+ in=-?\d+s used/.test(opened) && /medium #2 at=\d+ in=-?\d+s used/.test(opened), `${waiting.split('\n')[0]} | ${opened.split('\n').filter(x => /medium/.test(x)).join(' / ')}`)
    await sleep(3200)
    const moving = await left('medium')
    check('...and it runs while its holder is online', moving < 3600, `${moving}`)
    await cmd(`dhit end ${B}`)
    await cmd('dhit window medium close')

    // ---------- Bounties are posted with the Broker ----------
    await cmd(`zzbountyreset ${A}`)
    await cmd(`minecraft:tp ${B} ${AWAY[0]} ${Y} ${AWAY[2]}`)
    await sleep(700)
    const b0 = await bal(B)
    t = Date.now()
    bots[B].chat(`/bounty ${A} 1000`)
    await sleep(900)
    const awayPin = await cmd(`dphone gps ${B}`)
    check('away from the Broker a bounty isn\'t posted (nothing charged): the GPS leads to him', /posted with the Broker/.test(text(B, t)) && (await bal(B)) === b0 && /active=pin/.test(awayPin) && /Test_Hall/.test(awayPin), `${text(B, t).slice(0, 200)} | ${await bal(B)} | ${awayPin}`)
    bots[B].chat('/gps clear')
    await cmd(`minecraft:tp ${B} ${HERE[0]} ${Y} ${HERE[2]}`)
    await sleep(900)
    t = Date.now()
    bots[B].chat(`/bounty ${A} 1000`)
    await sleep(900)
    check('...next to the Broker it is ($1,000 charged)', /You put \$1,000 on HitA/.test(text(B, t)) && (await bal(B)) === b0 - 1000, `${text(B, t).slice(0, 200)} | ${b0} -> ${await bal(B)}`)
    await cmd(`zzbountyreset ${A}`)
    const deny = Date.now()
    bots[B].chat('/dhit week')
    await sleep(800)
    check('/dhit is staff only', /Staff only/.test(text(B, deny)), text(B, deny))
  } finally {
    for (const tt of ['easy', 'medium', 'hard']) await rcon.cmd(`dhit window ${tt} close`).catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`dhit reset ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`dphone gps ${name} clear`).catch(() => {})
      await rcon.cmd(`minecraft:tp ${name} ${FAR}`).catch(() => {})
    }
    await rcon.cmd('zzweek off').catch(() => {})
    await rcon.cmd('dhit week reroll').catch(() => {}) // a full schedule again (windows already past stay used)
    for (const n of nodes) if (n) await rcon.cmd(`dhit node remove ${n}`).catch(() => {})
    if (broker) await rcon.cmd(`dquest remove ${broker}`).catch(() => {})
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill 3088 ${Y - 1} 3088 3172 ${Y + 5} 3142 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    await rcon.cmd('zzcfgreload').catch(() => {})
    rcon.close()
  }
}
