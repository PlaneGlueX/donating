// hits.sk: hit contracts (owner, 2026-09-27). One target a week; a contract per tier is taken in person from the
// Broker (the level, one a week, only switching to an easier one); away from the Broker a click leads the GPS there.
// Windows are shared and run only while the tier is active (2+ online, or a holder of that tier online). While one
// runs the holder hunts their own copy: the target and 2 bodyguards, Citizens NPCs only the holder's client ever gets;
// only the holder hurts them and only they hurt the holder (a bodyguard's hits are the "hit" death cause); tips put a
// search area on the GPS; seen = spotted (the title, a locator mark); hitting it = noticed; the takedown pays the
// tier (never boosted), XP and a streak; dying or quitting takes the copy away; staff only.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

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
    await cmd(`dlevel set ${A} 2`)
    await cmd(`dlevel set ${B} 1`)
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
    check('below the tier\'s level: "Needs level 2", nothing taken', /Needs level 2/.test(l) && field(await info(B), 'tier') === '', `${field(await info(B), 'tier')} | ${l.slice(0, 300)}`)
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
    await cmd(`dlevel set ${A} 4`)
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
    await cmd(`minecraft:tp ${A} ${AWAY[0]} ${Y} ${AWAY[2]}`)
    await cmd(`minecraft:tp ${B} ${AWAY[0] + 2} ${Y} ${AWAY[2]}`)
    t = Date.now()
    const tWin = t
    await cmd('dhit window easy open 600')
    await until(async () => field(await info(A), 'guuids').split(',').filter(Boolean).length === 2, 10000)
    i = await info(A)
    const gps = await cmd(`dphone gps ${A}`)
    check('in town: the Broker\'s tip puts a search area on the GPS (the quest slot)', field(i, 'now') === 'true' && /active=quest/.test(gps) && /search_area/.test(gps) && /Broker: seen/.test(text(A, t)), `${gps} | ${text(A, t).slice(0, 200)}`)
    const guards = field(i, 'guards').split(',').filter(Boolean)
    const tu = field(i, 'tuuid').toLowerCase()
    const gu = field(i, 'guuids').split(',').filter(Boolean).map(s => s.toLowerCase())
    check('the hunter\'s copy: the target and 2 bodyguards (Citizens NPCs)', /^\d+$/.test(field(i, 'target')) && guards.length === 2 && tu.length === 36 && gu.length === 2, i)
    await sleep(2500)
    const pvT = await cmd(`dphone pv ${tu}`)
    check('only the hunter\'s client ever gets them (the other player standing next to them gets no spawn packet)', seen[A].has(tu) && gu.every(u => seen[A].has(u)) && !seen[B].has(tu) && !gu.some(u => seen[B].has(u)) && /tracked=HitA( |$)/.test(pvT), `A=${seen[A].has(tu)} B=${seen[B].has(tu)} guards A=${gu.map(u => seen[A].has(u))} B=${gu.map(u => seen[B].has(u))} | ${pvT}`)
    const sb = await papi(A, '%donating_hit%')
    check('the sidebar: hunting, with the window\'s time left', /hunting \d+:\d\d/.test(sb), sb)

    // ---------- Only the hunter hurts them, only they hurt the hunter ----------
    const h0 = await npcHealth(tu)
    await cmd(`minecraft:damage ${tu} 5 minecraft:player_attack by ${B}`)
    await sleep(300)
    const h1 = await npcHealth(tu)
    check('another player can\'t hurt the target', h0 > 0 && h1 === h0, `${h0} -> ${h1}`)
    await cmd(`zzhp ${B} 20`)
    await cmd(`minecraft:damage ${B} 4 minecraft:mob_attack by ${gu[0]}`)
    await sleep(300)
    check('a bodyguard can\'t hurt anyone but the hunter', (await hp(B)) === 20, `${await hp(B)}`)
    // Near the target: spotted.
    const te = Object.values(bots[A].entities).find(e => e.uuid && e.uuid.toLowerCase() === tu)
    if (te) await cmd(`minecraft:tp ${A} ${te.position.x + 12} ${Y} ${te.position.z}`)
    t = Date.now()
    await until(async () => field(await info(A), 'spotted') === 'true', 6000)
    await sleep(600)
    const mark = await cmd(`dphone mark ${A} status`)
    check('within sight: TARGET SPOTTED, and a locator mark for the hunter', field(await info(A), 'spotted') === 'true' && /TARGET SPOTTED/.test(text(A, tWin)) && /stand=[0-9a-f-]{36}/.test(mark), `${mark} | ${await info(A)} | ${text(A, tWin).slice(0, 300)}`)
    await sleep(4500) // EssentialsX's teleport protection
    await cmd(`zzhp ${A} 20`)
    await cmd(`minecraft:damage ${A} 2 minecraft:mob_attack by ${gu[0]}`)
    await sleep(400)
    const cA = await cmd(`zzcombat ${A}`)
    check('a bodyguard\'s hit lands on the hunter and tags them for the hit ("hit", not "cop")', (await hp(A)) < 20 && /cause=hit/.test(cA), `${await hp(A)} | ${cA}`)
    await cmd(`minecraft:damage ${tu} 3 minecraft:player_attack by ${A}`)
    await sleep(500)
    check('the hunter\'s hit lands and the target notices them', (await npcHealth(tu)) < h0 && field(await info(A), 'noticed') === 'true', `${await npcHealth(tu)} | ${await info(A)}`)
    await cmd(`zzhp ${A} 20`)
    const shot = await until(async () => (await hp(A)) < 20, 12000)
    check('the bodyguards shoot the hunter on their own (Sentinel, no projectile)', shot, `${await hp(A)}`)
    await cmd(`zzhp ${A} 20`)

    // ---------- The takedown ----------
    const before = await bal(A)
    t = Date.now()
    await cmd(`minecraft:damage ${tu} 200 minecraft:player_attack by ${A}`)
    await until(async () => field(await info(A), 'state') === 'done', 4000)
    await sleep(1500)
    i = await info(A)
    const paidA = (await bal(A)) - before
    check('the takedown pays the Easy contract ($10,000), once, with TARGET DOWN', paidA === 10000 && /TARGET DOWN/.test(text(A, t)) && field(i, 'streak') === '1', `paid ${paidA} | ${i} | ${text(A, t).slice(0, 200)}`)
    const gone = await cmd(`dphone pv ${gu[0]}`)
    check('...and the copy is gone (target, bodyguards, the mark)', field(i, 'target') === '<none>' && /none/.test(gone) && /stand=none/.test(await cmd(`dphone mark ${A} status`)), `${i} | ${gone}`)
    w = await openHits(A)
    await cmd(`minecraft:tp ${A} ${HERE[0]} ${Y} ${HERE[2]}`)
    close(A)
    await sleep(600)
    w = await openHits(A)
    l = lore(w)
    check('one contract a week: taken again = refused', /already took this week/.test(l) || /Target down this week/.test(l), l.slice(0, 400))
    close(A)
    check('the sidebar after the takedown', /Target down/.test(await papi(A, '%donating_hit%')), await papi(A, '%donating_hit%'))

    // ---------- Dying to a bodyguard, quitting ----------
    await cmd(`dhit give ${A} medium`)
    await cmd(`minecraft:tp ${A} ${AWAY[0]} ${Y} ${AWAY[2]}`)
    await cmd('dhit window medium open 600')
    await until(async () => /^\d+$/.test(field(await info(A), 'target')), 8000)
    await sleep(5000)
    const gu2 = field(await info(A), 'guuids').split(',').filter(Boolean)
    await cmd(`zzdata ${A} last-death-cause none`)
    // Bodyguards only hurt the hunter once the target has noticed them (before that Sentinel's safeshot cancels it),
    // and Sentinel sets every hit by its NPCs to their damage setting (1 in this test): half a heart left.
    await cmd(`minecraft:damage ${field(await info(A), 'tuuid')} 1 minecraft:player_attack by ${A}`)
    await until(async () => field(await info(A), 'noticed') === 'true', 3000)
    await cmd(`zzhp ${A} 1`)
    const dmg = await cmd(`minecraft:damage ${A} 100 minecraft:mob_attack by ${gu2[0]}`)
    await sleep(800)
    const cause = await cmd(`zzdata ${A} last-death-cause`)
    check('dying to a bodyguard is a "hit" death, and the copy goes', /= hit$/.test(cause) && field(await info(A), 'target') === '<none>', `${dmg} | ${cause} | ${await info(A)}`)
    try { bots[A].respawn() } catch (err) {}
    await sleep(2000)
    await until(async () => /^\d+$/.test(field(await info(A), 'target')), 8000)
    const tu3 = field(await info(A), 'tuuid')
    await cmd(`zzcombatend ${A}`)
    await quit(bots[A])
    delete bots[A]
    await sleep(1500)
    check('quitting takes the copy away', /none/.test(await cmd(`dphone pv ${tu3}`)), await cmd(`dphone pv ${tu3}`))

    // ---------- Active only: 2+ online, or a holder of that tier ----------
    await cmd('dhit window medium open 100')
    await sleep(3200)
    const frozen = await left('medium')
    await cmd(`dhit give ${B} medium`)
    await sleep(3200)
    const moving = await left('medium')
    check('with one player online a window only runs while they hold that tier\'s contract', frozen === 100 && moving < 100, `${frozen} -> ${moving}`)
    await cmd(`dhit end ${B}`)
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
    for (const n of nodes) if (n) await rcon.cmd(`dhit node remove ${n}`).catch(() => {})
    if (broker) await rcon.cmd(`dquest remove ${broker}`).catch(() => {})
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill 3088 ${Y - 1} 3088 3172 ${Y + 5} 3142 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    await rcon.cmd('zzcfgreload').catch(() => {})
    rcon.close()
  }
}
