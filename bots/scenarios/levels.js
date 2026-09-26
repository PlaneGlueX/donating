// levels.sk: robber levels. XP from selling loot at the base, X = floor(P / 100) + 10 × H (each heist
// run once); a level-up (title, what it unlocks, to that player only); /level and /levels; the heist
// tools' level (the shop refuses below it and says why); /dlevel for staff only (info, set, xp, reset;
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
    check('a new robber is level 0 (Pickpocket) with 0 XP; /level shows the next level and its XP', /Your level: 0 Pickpocket \(of 6\) · 0 XP/.test(out) && /Next: level 1 Shoplifter at 250 XP/.test(out) && /It unlocks: .*the Safe Kit/.test(out), out)
    out = await said('/levels')
    check('/levels lists all 7 levels with their XP and unlocks', /0\. Pickpocket - 0 XP/.test(out) && /1\. Shoplifter - 250 XP · the Safe Kit/.test(out) && /2\. Burglar - 1,000 XP · the Drill/.test(out) && /6\. Kingpin - 50,000 XP/.test(out), out)
    check('the footer shows the level and the XP to the next one', /Pickpocket$/.test(await papi('donating_level')) && (await papi('donating_level_num')) === '0' && (await papi('donating_level_xp')) === '0/250 XP', `${await papi('donating_level')} ${await papi('donating_level_xp')}`)

    // ---------- Selling earns XP ----------
    await cmd(`zztestkit ${R}`) // bag tier 2
    await cmd(`zzbagadd ${R} rka#1 2000`)
    await cmd(`zzbagadd ${R} rkb#3 500`)
    setMark()
    let t = Date.now()
    await cmd(`zzheisttp ${R} 840.5 ${Y} 840.5`)
    await sleep(1800)
    let i = await info()
    check('selling $2,500 from 2 heists at the base gives 25 + 2 × 10 = 45 XP', i.xp === 45 && i.rank === 0 && /\+45 XP/.test(text(t)) && logged(/xp LevelBot \S+ \+45 why=sell total=45 level=0->0/).length === 1, `${i.raw} ${text(t)}`)
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
    await cmd(`dlevel xp ${R} 191`)
    await sleep(600)
    i = await info()
    check('reaching 250 XP: level 1 (Shoplifter)', i.rank === 1 && i.xp === 250, i.raw)
    check('...with a LEVEL UP title and what it unlocks, to that player', messagesSince(bot, t).some(m => m.kind === 'title:title' && /LEVEL UP/.test(m.text)) && /Level up! You're level 1 now: Shoplifter/.test(text(t)) && /Unlocked: the Safe Kit/.test(text(t)), text(t))
    check('...and the footer follows', /Shoplifter$/.test(await papi('donating_level')) && (await papi('donating_level_xp')) === '250/1,000 XP', `${await papi('donating_level')} ${await papi('donating_level_xp')}`)
    t = Date.now()
    await cmd(`dlevel xp ${R} 3000`)
    await sleep(600)
    i = await info()
    check('a jump over several levels lists every unlock on the way (3,250 XP: Safecracker)', i.rank === 3 && /Safecracker/.test(text(t)) && /Unlocked: the Drill/.test(text(t)), `${i.raw} ${text(t)}`)

    // ---------- Tools need their level ----------
    await cmd(`dlevel set ${R} 1`)
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
    check('below its level the Drill isn\'t sold, and the shop says why', drillSlot >= 0 && /needs level 2 \(Burglar\)/.test(status) && !/\[tool:drill\]/.test(dump), `slot ${drillSlot}; ${status}; ${dump}`)
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
    await cmd(`dlevel set ${R} 2`)
    win = await openTools()
    t = Date.now()
    if (drillSlot >= 0) { bot.clickWindow(drillSlot, 0, 0).catch(() => {}); await sleep(900) }
    if (bot.currentWindow) { bot.clickWindow(drillSlot, 0, 0).catch(() => {}); await sleep(900) } // the $1,000+ confirm
    dump = await cmd(`zzdump ${R}`)
    check('at level 2 it is', /\[tool:drill\]/.test(dump), `${text(t)}; ${dump}`)
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)

    // ---------- Staff ----------
    out = await said('/dlevel info LevelBot')
    check('/dlevel is staff only', /Staff only/.test(out), out)
    check('XP can only be added, never taken away', /only adds/.test(await cmd(`dlevel xp ${R} -5`)) && (await info()).xp === 1000, (await info()).raw)
    setMark()
    await cmd(`dlevel set ${R} 0`)
    i = await info()
    check('staff can set a level either way; the XP moves to that level\'s start', i.rank === 0 && i.xp === 0 && logged(/set LevelBot \S+ level=0/).length === 1, i.raw)
    await cmd(`dlevel set ${R} 4`)

    // ---------- It's saved ----------
    await quit(bot)
    await sleep(1000)
    bot = await join(R)
    await sleep(1500)
    i = await info()
    check('the level and XP survive a relog', i.rank === 4 && i.xp === 8000 && /Heister$/.test(await papi('donating_level')), `${i.raw} ${await papi('donating_level')}`)
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
