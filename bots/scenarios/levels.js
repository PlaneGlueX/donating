// levels.sk: robber levels. Level n needs T(n) = 6.5 × n × (n + 5) XP (owner, 2026-09-27: about level 150 after a
// month of 2 h a day), titles by range (0 Pickpocket, 5 Shoplifter, 15 Burglar, ... 150 Kingpin). XP from selling loot
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
    check('a new robber is level 0 (Pickpocket) with 0 XP; /level shows the next level at T(1) = 6.5 × 1 × 6 = 39 XP', /Your level: 0 Pickpocket · 0 XP/.test(out) && /Next: level 1 Pickpocket at 39 XP/.test(out), out)
    out = await said('/levels', 1500)
    check('/levels lists only the levels that unlock something, with T(n) and the title where a range starts', /5\. Shoplifter - 325 XP · .*the \.50 GS.*the Duffel Bag.*the Safe Kit/.test(out) && /15\. Burglar - 1,950 XP · .*the Uzi.*the Drill/.test(out) && /150\. Kingpin - 151,125 XP · .*the SUV \(car\)/.test(out) && !/ 1\. /.test(out) && !/ 7\. /.test(out), out.slice(0, 1500))
    check('the footer shows the level and the XP to the next one', /Pickpocket$/.test(await papi('donating_level')) && (await papi('donating_level_num')) === '0' && (await papi('donating_level_xp')) === '0/39 XP', `${await papi('donating_level')} ${await papi('donating_level_xp')}`)

    // ---------- Selling earns XP ----------
    await cmd(`zztestkit ${R}`) // bag tier 2
    await cmd(`zzbagadd ${R} rka#1 2000`)
    await cmd(`zzbagadd ${R} rkb#3 500`)
    setMark()
    let t = Date.now()
    await cmd(`zzheisttp ${R} 840.5 ${Y} 840.5`)
    await sleep(1800)
    let i = await info()
    check('selling $2,500 from 2 heists at the base gives 25 + 2 × 10 = 45 XP (level 1 at 39)', i.xp === 45 && i.rank === 1 && /\+45 XP/.test(text(t)) && logged(/xp LevelBot \S+ \+45 why=sell total=45 level=0->1/).length === 1, `${i.raw} ${text(t)}`)
    await cmd(`zzheisttp ${R} 830.5 ${Y} 830.5`)
    await sleep(500)
    await cmd(`zzbagadd ${R} rka#1 300`)
    await cmd(`zzbagadd ${R} rka#2 100`)
    t = Date.now()
    await cmd(`zzheisttp ${R} 840.5 ${Y} 840.5`)
    await sleep(1800)
    i = await info()
    check('the +10 per heist run is paid once per run: selling more of rka#1 and a new run rka#2 gives 4 + 10 = 14 XP', i.xp === 59 && /\+14 XP/.test(text(t)), `${i.raw} ${text(t)}`)
    await cmd(`zzheisttp ${R} 830.5 ${Y} 830.5`)

    // ---------- Level up ----------
    t = Date.now()
    await cmd(`dlevel xp ${R} 266`)
    await sleep(600)
    i = await info()
    check('reaching 325 XP: level 5 (Shoplifter)', i.rank === 5 && i.xp === 325, i.raw)
    check('...with a LEVEL UP title and what it unlocks (guns, the Duffel Bag, the Safe Kit), to that player', messagesSince(bot, t).some(m => m.kind === 'title:title' && /LEVEL UP/.test(m.text)) && /Level up! You're level 5 now: Shoplifter/.test(text(t)) && /Unlocked: the \.50 GS/.test(text(t)) && /Unlocked: the Duffel Bag/.test(text(t)) && /Unlocked: the Safe Kit/.test(text(t)), text(t))
    check('...and the footer follows (T(6) = 429)', /Shoplifter$/.test(await papi('donating_level')) && (await papi('donating_level_xp')) === '325/429 XP', `${await papi('donating_level')} ${await papi('donating_level_xp')}`)
    t = Date.now()
    await cmd(`dlevel xp ${R} 3000`)
    await sleep(600)
    i = await info()
    check('a jump over several levels lists every unlock on the way (3,325 XP: level 20 Burglar, T(20) = 3,250)', i.rank === 20 && /Burglar/.test(text(t)) && /Unlocked: the Drill/.test(text(t)) && /Unlocked: the Uzi/.test(text(t)) && /Unlocked: the Hockey Bag/.test(text(t)), `${i.raw} ${text(t).slice(0, 600)}`)

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
    check('below its level the Drill isn\'t sold, and the shop says why', drillSlot >= 0 && /needs level 15 \(Burglar\)/.test(status) && !/\[tool:drill\]/.test(dump), `slot ${drillSlot}; ${status}; ${dump}`)
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
    check('XP can only be added, never taken away', /only adds/.test(await cmd(`dlevel xp ${R} -5`)) && (await info()).xp === 1950, (await info()).raw)
    setMark()
    await cmd(`dlevel set ${R} 0`)
    i = await info()
    check('staff can set a level either way; the XP moves to that level\'s start', i.rank === 0 && i.xp === 0 && logged(/set LevelBot \S+ level=0/).length === 1, i.raw)
    await cmd(`dlevel set ${R} 60`)

    // ---------- It's saved ----------
    await quit(bot)
    await sleep(1000)
    bot = await join(R)
    await sleep(1500)
    i = await info()
    check('the level and XP survive a relog (level 60 = 25,350 XP, Heister)', i.rank === 60 && i.xp === 25350 && /Heister$/.test(await papi('donating_level')), `${i.raw} ${await papi('donating_level')}`)
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
