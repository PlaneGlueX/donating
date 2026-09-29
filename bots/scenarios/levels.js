// levels.sk: robber levels. Level 1 needs 49 XP and each level after needs a little more than the one before (8% easing
// to 2% by level 60; owner, 2026-09-27: about level 150 after a month of 2 h a day; 2026-09-28: "each level should get a
// little harder each time"), titles by range (0 Pickpocket, 5 Shoplifter, 20 Burglar, ... 150 Kingpin, 200 Godfather).
// Rewards past the unlocks (level::rewards: bound titles, keys at 100, 125, 150 ...), given once, at the level-up or
// the next join; members-only areas (a region lvl<N>_<name> lets in level N and up). XP from selling loot
// at the base, X = floor(P / 100) + 10 × H (each heist run once); a level-up (title, what it unlocks, to that player
// only); /level and /levels (only the levels that unlock something); the heist tools' and bag tiers' levels (the shop
// refuses below them and says why); /dlevel for staff only (info, set, xp, reset;
// XP is never taken away); the footer placeholders; levels survive a relog. The heist gate itself is in
// bots\run.js heists. (Paid ranks, in the tab list, are bots\run.js ranks.)
const fs = require('fs')
const path = require('path')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const R = 'LevelBot'
const Y = 200
const CHUNKS = '826 826 846 846'
const FAR = '0.5 68 -656.5'
const LOGS = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  try {
    const logLines = name => { const f = path.join(LOGS, `${name}.log`); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l !== '') : [] }
    let mark = 0
    const setMark = () => { mark = logLines('levels').length }
    const logged = re => logLines('levels').slice(mark).filter(l => re.test(l))
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const said = async (c, ms = 800) => { const t = Date.now(); bot.chat(c); await sleep(ms); return text(t) }
    const info = async () => {
      const r = await cmd(`dlevel info ${R}`)
      return { raw: r, rank: Number((r.match(/level=(\d+)/) || [])[1]), xp: Number((r.match(/xp=(\d+)/) || [])[1]) }
    }
    const papi = async ph => ((await cmd(`zzpapi ${R} ${ph}`)).match(/= (.*)$/m) || [])[1] || ''

    // ---------- Setup ----------
    await cmd('rg remove -w world safe_base_rk')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 826 ${Y - 1} 826 846 ${Y - 1} 846 glass`)
    await cmd('zzregion safe_base_rk 836 190 836 846 208 846')
    await cmd('rg flag -w world safe_base_rk passthrough allow')
    await cmd('zzcfgreload')
    bot = await join(R)
    await cmd(`gamemode survival ${R}`)
    await cmd(`zzclear ${R}`)
    await cmd(`zzbagclear ${R}`)
    await cmd(`zzcombatend ${R}`)
    await cmd(`zzpassive ${R} off`)
    await cmd(`zzdata ${R} passive-switched none`)
    await cmd(`dlevel reset ${R}`)
    await cmd(`eco set ${R} 100000`)
    await cmd(`lp user ${R} permission unset donating.staff`)
    await cmd(`zzheisttp ${R} 830.5 ${Y} 830.5`)
    await sleep(2500)

    // ---------- A new robber ----------
    let out = await said('/level')
    check('a new robber is level 0 (Pickpocket) with 0 XP; /level shows the next level at T(1) = 49 XP', /Your level: 0 Pickpocket · 0 XP/.test(out) && /Next: level 1 Pickpocket at 49 XP/.test(out), out)
    out = await said('/levels', 1500)
    check('/levels lists only the levels that unlock something, with T(n) and the title where a range starts (and the rewards)', /5\. Shoplifter - 287 XP · .*the \.50 GS.*the Duffel Bag.*the Safe Kit/.test(out) && /15\. - 1,281 XP · .*the Uzi.*the Drill/.test(out) && /20\. Burglar - 2,078 XP/.test(out) && /100\. Mastermind - 75,514 XP · .*the «Mastermind» title/.test(out) && /150\. Kingpin - 240,190 XP · .*the SUV \(car\).*the Apex \(car\).*the «Kingpin» title/.test(out) && !/ 1\. /.test(out) && !/ 7\. /.test(out), out.slice(0, 2500))
    check('the footer shows the level and the XP to the next one', /Pickpocket$/.test(await papi('donating_level')) && (await papi('donating_level_num')) === '0' && (await papi('donating_level_xp')) === '0/49 XP', `${await papi('donating_level')} ${await papi('donating_level_xp')}`)

    // ---------- Selling earns XP ----------
    await cmd(`zztestkit ${R}`) // bag tier 2
    await cmd(`zzbagadd ${R} rka#1 2000`)
    await cmd(`zzbagadd ${R} rkb#3 500`)
    setMark()
    let t = Date.now()
    await cmd(`zzheisttp ${R} 840.5 ${Y} 840.5`)
    await sleep(1800)
    let i = await info()
    check('selling $2,500 from 2 heists at the base gives 25 + 2 × 10 = 45 XP (still level 0: level 1 needs 49)', i.xp === 45 && i.rank === 0 && /\+45 XP/.test(text(t)) && logged(/xp LevelBot \S+ \+45 why=sell total=45 level=0->0/).length === 1, `${i.raw} ${text(t)}`)
    await cmd(`zzheisttp ${R} 830.5 ${Y} 830.5`)
    await sleep(500)
    await cmd(`zzbagadd ${R} rka#1 300`)
    await cmd(`zzbagadd ${R} rka#2 100`)
    t = Date.now()
    await cmd(`zzheisttp ${R} 840.5 ${Y} 840.5`)
    await sleep(1800)
    i = await info()
    check('the +10 per heist run is paid once per run: selling more of rka#1 and a new run rka#2 gives 4 + 10 = 14 XP (59: level 1)', i.xp === 59 && i.rank === 1 && /\+14 XP/.test(text(t)), `${i.raw} ${text(t)}`)
    await cmd(`zzheisttp ${R} 830.5 ${Y} 830.5`)

    // ---------- Level up ----------
    t = Date.now()
    await cmd(`dlevel xp ${R} 228`)
    await sleep(600)
    i = await info()
    check('reaching 287 XP: level 5 (Shoplifter)', i.rank === 5 && i.xp === 287, i.raw)
    check('...with a LEVEL UP title and what it unlocks (guns, the Duffel Bag, the Safe Kit), to that player', messagesSince(bot, t).some(m => m.kind === 'title:title' && /LEVEL UP/.test(m.text)) && /Level up! You're level 5 now: Shoplifter/.test(text(t)) && /Unlocked: the \.50 GS/.test(text(t)) && /Unlocked: the Duffel Bag/.test(text(t)) && /Unlocked: the Safe Kit/.test(text(t)), text(t))
    check('...and the footer follows (T(6) = 358)', /Shoplifter$/.test(await papi('donating_level')) && (await papi('donating_level_xp')) === '287/358 XP', `${await papi('donating_level')} ${await papi('donating_level_xp')}`)
    t = Date.now()
    await cmd(`dlevel xp ${R} 3000`)
    await sleep(600)
    i = await info()
    check('a jump over several levels lists every unlock on the way (3,287 XP: level 25 Burglar, T(25) = 3,147)', i.rank === 25 && /Burglar/.test(text(t)) && /Unlocked: the Drill/.test(text(t)) && /Unlocked: the Uzi/.test(text(t)) && /Unlocked: the Hockey Bag/.test(text(t)) && /Unlocked: the Armored Duffel/.test(text(t)), `${i.raw} ${text(t).slice(0, 600)}`)
    // Each level needs more than the one before (the owner's "a little harder each time").
    const needs = []
    for (const n of [2, 10, 30, 60, 100, 150]) { await cmd(`dlevel set ${R} ${n - 1}`); const a = (await info()).xp; await cmd(`dlevel set ${R} ${n}`); needs.push((await info()).xp - a) }
    check('each level needs more XP than the one before (levels 2, 10, 30, 60, 100, 150 alone)', needs.every((v, k) => k === 0 || v > needs[k - 1]) && needs[0] === 53, needs.join(', '))
    await cmd(`dlevel set ${R} 25`)

    // ---------- Tools need their level ----------
    await cmd(`dlevel set ${R} 5`)
    const openTools = async () => {
      if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); await sleep(300) }
      const w = new Promise(resolve => { const tm = setTimeout(() => resolve(null), 3000); bot.once('windowOpen', win => { clearTimeout(tm); resolve(win) }) })
      await cmd(`dshop open ${R} tools`)
      const win = await w
      await sleep(300)
      return win
    }
    let win = await openTools()
    const drillSlot = win ? win.slots.findIndex((it, n) => n < win.inventoryStart && it && it.name === 'iron_ingot') : -1
    t = Date.now()
    if (drillSlot >= 0) { bot.clickWindow(drillSlot, 0, 0).catch(() => {}); await sleep(900) }
    let dump = await cmd(`zzdump ${R}`)
    // The shop's answer is its status line (the menu's status item), not chat.
    const status = await cmd(`zzshop ${R}`)
    check('below its level the Drill isn\'t sold, and the shop says why', drillSlot >= 0 && /needs level 15 \(Shoplifter\)/.test(status) && !/\[tool:drill\]/.test(dump), `slot ${drillSlot}; ${status}; ${dump}`)
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
    // A bag tier's first unlock needs its level too (the Hockey Bag: level 10; the bot carries a Duffel Bag).
    await cmd(`dlevel set ${R} 0`)
    const bw = new Promise(resolve => { const tm = setTimeout(() => resolve(null), 3000); bot.once('windowOpen', win2 => { clearTimeout(tm); resolve(win2) }) })
    await cmd(`dshop open ${R} bag`)
    await bw
    await sleep(300)
    bot.clickWindow(13, 0, 0).catch(() => {})
    await sleep(900)
    const bagStatus = await cmd(`zzshop ${R}`)
    check('a new bag tier needs its level: the Hockey Bag at level 0 is refused ("needs level 10 (Shoplifter)")', /Hockey Bag needs level 10 \(Shoplifter\)/.test(bagStatus), bagStatus)
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
    await cmd(`dlevel set ${R} 15`)
    win = await openTools()
    t = Date.now()
    if (drillSlot >= 0) { bot.clickWindow(drillSlot, 0, 0).catch(() => {}); await sleep(900) }
    if (bot.currentWindow) { bot.clickWindow(drillSlot, 0, 0).catch(() => {}); await sleep(900) } // the $1,000+ confirm
    dump = await cmd(`zzdump ${R}`)
    check('at level 15 it is', /\[tool:drill\]/.test(dump), `${text(t)}; ${dump}`)
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)

    // ---------- Staff ----------
    out = await said('/dlevel info LevelBot')
    check('/dlevel is staff only', /Staff only/.test(out), out)
    check('XP can only be added, never taken away', /only adds/.test(await cmd(`dlevel xp ${R} -5`)) && (await info()).xp === 1281, (await info()).raw)
    setMark()
    await cmd(`dlevel set ${R} 0`)
    i = await info()
    check('staff can set a level either way; the XP moves to that level\'s start', i.rank === 0 && i.xp === 0 && logged(/set LevelBot \S+ level=0/).length === 1, i.raw)

    // ---------- Rewards past the unlocks ----------
    await cmd(`dlevel set ${R} 99`)
    await cmd(`zzlvlrewards ${R}`)
    await cmd(`zzdata ${R} keys::epic 0`)
    await cmd(`zzdata ${R} keys::legendary 0`)
    t = Date.now()
    await cmd(`dlevel xp ${R} 2000`)
    await sleep(800)
    i = await info()
    const epic1 = await cmd(`zzdata ${R} keys::epic`)
    const cos1 = await cmd(`zzdata ${R} cos::lvl_mastermind`)
    check('level 100 gives its rewards once, at the level-up: the «Mastermind» title (bound) and 2 Epic keys', i.rank === 100 && /Unlocked: the «Mastermind» title/.test(text(t)) && /Unlocked: 2 Epic Crate keys/.test(text(t)) && /\b2\b/.test(epic1) && /true/.test(cos1), `${i.raw} ${epic1} ${cos1} ${text(t).slice(0, 500)}`)
    await cmd(`dlevel xp ${R} 10`)
    await sleep(500)
    const epic2 = await cmd(`zzdata ${R} keys::epic`)
    check('...never twice (more XP at level 100 gives no more keys)', /\b2\b/.test(epic2), epic2)
    // A staff set gives no level-up: those rewards come at the next join (below).
    await cmd(`dlevel set ${R} 150`)
    await sleep(300)
    const leg0 = await cmd(`zzdata ${R} keys::legendary`)

    // ---------- Members-only areas ----------
    await cmd('rg remove -w world lvl150_rktest')
    await cmd('zzregion lvl150_rktest 826 190 826 832 208 832')
    await cmd('rg flag -w world lvl150_rktest passthrough allow')
    await cmd(`dlevel set ${R} 149`)
    await cmd(`zzheisttp ${R} 836.5 ${Y} 829.5`)
    await sleep(400)
    t = Date.now()
    await cmd(`minecraft:tp ${R} 829.5 ${Y} 829.5`)
    await sleep(900)
    const px = Number(((await cmd(`data get entity ${R} Pos[0]`)).match(/data: (-?[\d.]+)/) || [])[1])
    check('a members-only area (region lvl150_rktest) keeps a level-149 robber out, and says why', px > 832 && /Members only: level 150/.test(text(t)), `x ${px} ${text(t)}`)
    await cmd(`dlevel set ${R} 150`)
    await cmd(`minecraft:tp ${R} 829.5 ${Y} 829.5`)
    await sleep(900)
    const px2 = Number(((await cmd(`data get entity ${R} Pos[0]`)).match(/data: (-?[\d.]+)/) || [])[1])
    check('...and lets level 150 in', px2 < 832, `x ${px2}`)
    await cmd('rg remove -w world lvl150_rktest')
    await cmd(`zzheisttp ${R} 830.5 ${Y} 830.5`)
    await cmd(`dlevel set ${R} 150`)

    // ---------- It's saved ----------
    await quit(bot)
    await sleep(1000)
    bot = await join(R)
    await sleep(1500)
    i = await info()
    check('the level and XP survive a relog (level 150 = 240,190 XP, Kingpin)', i.rank === 150 && i.xp === 240190 && /Kingpin$/.test(await papi('donating_level')), `${i.raw} ${await papi('donating_level')}`)
    // Level 150 came from a staff set (no level-up): the 125 and 150 rewards came at this join.
    const leg1 = await cmd(`zzdata ${R} keys::legendary`)
    const king = await cmd(`zzdata ${R} cos::lvl_kingpin`)
    check('rewards for levels reached without a level-up (a staff set to 150) come at the next join: 1 + 2 Legendary keys and the «Kingpin» title', /\b0\b/.test(leg0) && /\b3\b/.test(leg1) && /true/.test(king), `${leg0} -> ${leg1} ${king}`)
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd(`dlevel reset ${R}`).catch(() => {})
    await rcon.cmd(`zzclear ${R}`).catch(() => {})
    await rcon.cmd(`zzbagclear ${R}`).catch(() => {})
    await rcon.cmd(`zzheisttp ${R} ${FAR}`).catch(() => {})
    if (bot) await quit(bot)
    await rcon.cmd('rg remove -w world safe_base_rk').catch(() => {})
    await rcon.cmd(`fill 826 ${Y - 1} 826 846 ${Y - 1} 846 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
