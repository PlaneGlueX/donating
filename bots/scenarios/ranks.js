// ranks.sk: robber ranks. XP from selling loot at the base, X = floor(P / 100) + 10 × H; a rank-up
// (title, what it unlocks, to that player only); /rank and /ranks; the heist tools' rank (the shop
// refuses below it and says why); /drank for staff only (info, set, xp, reset; XP is never taken away);
// the tab-list placeholders; ranks survive a relog. The heist gate itself is in bots\run.js heists.
const fs = require('fs')
const path = require('path')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const R = 'RankBot'
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
    const setMark = () => { mark = logLines('ranks').length }
    const logged = re => logLines('ranks').slice(mark).filter(l => re.test(l))
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const said = async (c, ms = 800) => { const t = Date.now(); bot.chat(c); await sleep(ms); return text(t) }
    const info = async () => {
      const r = await cmd(`drank info ${R}`)
      return { raw: r, rank: Number((r.match(/rank=(\d+)/) || [])[1]), xp: Number((r.match(/xp=(\d+)/) || [])[1]) }
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
    await cmd(`drank reset ${R}`)
    await cmd(`eco set ${R} 100000`)
    await cmd(`lp user ${R} permission unset donating.staff`)
    await cmd(`zzheisttp ${R} 830.5 ${Y} 830.5`)
    await sleep(2500)

    // ---------- A new robber ----------
    let out = await said('/rank')
    check('a new robber is a Pickpocket (rank 0) with 0 XP; /rank shows the next rank and its XP', /Your rank: Pickpocket \(rank 0 of 6\) · 0 XP/.test(out) && /Next: Shoplifter at 250 XP/.test(out) && /It unlocks: .*the Safe Kit/.test(out), out)
    out = await said('/ranks')
    check('/ranks lists all 7 ranks with their XP and unlocks', /0\. Pickpocket - 0 XP/.test(out) && /1\. Shoplifter - 250 XP · the Safe Kit/.test(out) && /2\. Burglar - 1,000 XP · the Drill/.test(out) && /6\. Kingpin - 50,000 XP/.test(out), out)
    check('the tab list shows the rank and the XP to the next one', /Pickpocket$/.test(await papi('donating_rank')) && (await papi('donating_rank_xp')) === '0/250 XP', `${await papi('donating_rank')} ${await papi('donating_rank_xp')}`)

    // ---------- Selling earns XP ----------
    await cmd(`zztestkit ${R}`) // bag tier 2
    await cmd(`zzbagadd ${R} rka#1 2000`)
    await cmd(`zzbagadd ${R} rkb#3 500`)
    setMark()
    let t = Date.now()
    await cmd(`zzheisttp ${R} 840.5 ${Y} 840.5`)
    await sleep(1800)
    let i = await info()
    check('selling $2,500 from 2 heists at the base gives 25 + 2 × 10 = 45 XP', i.xp === 45 && i.rank === 0 && /\+45 XP/.test(text(t)) && logged(/xp RankBot \S+ \+45 why=sell total=45 rank=0->0/).length === 1, `${i.raw} ${text(t)}`)
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

    // ---------- Rank up ----------
    t = Date.now()
    await cmd(`drank xp ${R} 191`)
    await sleep(600)
    i = await info()
    check('reaching 250 XP: rank 1 (Shoplifter)', i.rank === 1 && i.xp === 250, i.raw)
    check('...with a RANK UP title and what it unlocks, to that player', messagesSince(bot, t).some(m => m.kind === 'title:title' && /RANK UP/.test(m.text)) && /Rank up! You're a Shoplifter now \(rank 1\)/.test(text(t)) && /Unlocked: the Safe Kit/.test(text(t)), text(t))
    check('...and the tab list follows', /Shoplifter$/.test(await papi('donating_rank')) && (await papi('donating_rank_xp')) === '250/1,000 XP', `${await papi('donating_rank')} ${await papi('donating_rank_xp')}`)
    t = Date.now()
    await cmd(`drank xp ${R} 3000`)
    await sleep(600)
    i = await info()
    check('a jump over several ranks lists every unlock on the way (3,250 XP: Safecracker)', i.rank === 3 && /Safecracker/.test(text(t)) && /Unlocked: the Drill/.test(text(t)), `${i.raw} ${text(t)}`)

    // ---------- Tools need their rank ----------
    await cmd(`drank set ${R} 1`)
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
    check('below its rank the Drill isn\'t sold, and the shop says why', drillSlot >= 0 && /needs robber rank 2 \(Burglar\)/.test(status) && !/\[tool:drill\]/.test(dump), `slot ${drillSlot}; ${status}; ${dump}`)
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
    await cmd(`drank set ${R} 2`)
    win = await openTools()
    t = Date.now()
    if (drillSlot >= 0) { bot.clickWindow(drillSlot, 0, 0).catch(() => {}); await sleep(900) }
    if (bot.currentWindow) { bot.clickWindow(drillSlot, 0, 0).catch(() => {}); await sleep(900) } // the $1,000+ confirm
    dump = await cmd(`zzdump ${R}`)
    check('at rank 2 it is', /\[tool:drill\]/.test(dump), `${text(t)}; ${dump}`)
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)

    // ---------- Staff ----------
    out = await said('/drank info RankBot')
    check('/drank is staff only', /Staff only/.test(out), out)
    check('XP can only be added, never taken away', /only adds/.test(await cmd(`drank xp ${R} -5`)) && (await info()).xp === 1000, (await info()).raw)
    setMark()
    await cmd(`drank set ${R} 0`)
    i = await info()
    check('staff can set a rank either way; the XP moves to that rank\'s start', i.rank === 0 && i.xp === 0 && logged(/set RankBot \S+ rank=0/).length === 1, i.raw)
    await cmd(`drank set ${R} 4`)

    // ---------- It's saved ----------
    await quit(bot)
    await sleep(1000)
    bot = await join(R)
    await sleep(1500)
    i = await info()
    check('the rank and XP survive a relog', i.rank === 4 && i.xp === 8000 && /Heister$/.test(await papi('donating_rank')), `${i.raw} ${await papi('donating_rank')}`)
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd(`drank reset ${R}`).catch(() => {})
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
