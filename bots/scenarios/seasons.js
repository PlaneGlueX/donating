// seasons.sk (+ progress.sk): seasons, three leaderboards with different metrics, prizes for the top (owner,
// 2026-09-27). A season starts (staff); loot counts only from runs the player robbed; a run's Master Thieves
// points are capped (selling more of the same run adds money but no points; half the loot is half the points);
// passive players count at 75%; safes, vaults, getaways (only with that run's loot, after a wave, once per run)
// and contracts count; staff (donating.season.exempt) aren't counted; the boards rank into placeholders, the
// sidebar line and /lb; milestones give Season keys; the end freezes the boards, sets prizes aside for a review
// (only players with enough hours), starts the next season, and pays on approval (online at once, offline at
// their next join, never twice); earned titles can't be traded; Season keys can't be given by command.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'SeasA'
const B = 'SeasB'
const C = 'SeasC'
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const st = async name => cmd(`zzseason ${name}`)
    const val = (s, k) => { const m = s.match(new RegExp(`${k}=(\\S*?)#`)); return m ? m[1] : '' }
    const rank = (s, k) => { const m = s.match(new RegExp(`${k}=\\S*?#(\\S*)`)); return m ? m[1] : '' }
    const field = (s, k) => (s.match(new RegExp(`${k}=(\\S*)`)) || [])[1] || ''
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const papi = async (name, ph) => ((await cmd(`zzpapi ${name} ${ph}`)).match(/= (.*)$/m) || [])[1] || ''
    const windowOpen = bot => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const closeAll = async name => { if (bots[name].currentWindow) { bots[name].closeWindow(bots[name].currentWindow); await sleep(300) } }
    const title = w => (w ? JSON.stringify(w.title) : '')
    const itemText = i => (i ? JSON.stringify(i) : '')
    const ev = async (name, e, n, d) => cmd(`zzprog ${name} ${e} ${n} ${d}`)

    // ---------- Setup: no season at all ----------
    await cmd('zzseasonwipe')
    await cmd('zzcfgreload')
    for (const name of [A, B, C]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzbagclear ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`lp user ${name} permission unset donating.season.exempt`)
      await cmd(`zzdata ${name} season-seen none`)
      await cmd(`eco set ${name} 10000`)
      await cmd(`zzheisttp ${name} ${FAR}`)
    }
    await sleep(2000)

    // ---------- A season starts ----------
    let t = Date.now()
    const started = await cmd('dseason start 28')
    await sleep(800)
    const info = await cmd('dseason info')
    const end = Number(field(info, 'end'))
    const now = Math.floor(Date.now() / 1000)
    check('staff start Season 1 (28 days, ending on the hour); everyone is told', /started/.test(started) && /num=1 state=live/.test(info) && end % 3600 === 0 && end - now > 28 * 86400 - 60 && end - now <= 28 * 86400 + 3600 && /Season 1 has started/.test(text(A, t)), `${started} | ${info} | ${text(A, t)}`)

    // ---------- What counts ----------
    await ev(A, 'sell', 1000, 'zsx#1')
    let s = await st(A)
    check('loot from a run you didn\'t rob yourself (a picked-up duffel) counts for nothing', val(s, 'earners') === '<none>' && val(s, 'heisters') === '<none>', s)
    await ev(A, 'rob', 2000, 'zsx#1')
    await ev(A, 'sell', 1000, 'zsx#1')
    s = await st(A)
    check('a run you robbed: Top Earners gets the money ($1,000), Master Thieves the run\'s points (25 at difficulty 1)', val(s, 'earners') === '1000' && val(s, 'heisters') === '25', s)
    await ev(A, 'sell', 1000, 'zsx#1')
    s = await st(A)
    check('selling more of the same run adds money but no points (capped per run)', val(s, 'earners') === '2000' && val(s, 'heisters') === '25', s)
    await ev(B, 'rob', 1000, 'zsy#1')
    await ev(B, 'sell', 500, 'zsy#1')
    const half = val(await st(B), 'heisters')
    await ev(B, 'sell', 500, 'zsy#1')
    s = await st(B)
    check('half the run\'s loot is half its points (12), the rest later adds up to the full 25', half === '12' && val(s, 'heisters') === '25' && val(s, 'earners') === '1000', `${half} ${s}`)
    await cmd(`zzpassive ${C} on`)
    await ev(C, 'rob', 1000, 'zsz#1')
    await ev(C, 'sell', 1000, 'zsz#1')
    await cmd(`zzpassive ${C} off`)
    s = await st(C)
    check('passive players count at 75% ($750, 18 points)', val(s, 'earners') === '750' && val(s, 'heisters') === '18', s)
    // A duffel mule: C took $300 of run zsm#1 and sells $1,300 of it (the rest from another robber's duffel).
    const cm0 = val(await st(C), 'earners')
    await ev(C, 'rob', 300, 'zsm#1')
    await ev(C, 'sell', 1300, 'zsm#1')
    const cm1 = val(await st(C), 'earners')
    check('only the dollars you took yourself count (a picked-up duffel of the same run doesn\'t): $300 of $1,300', Number(cm1) - Number(cm0) === 300, `${cm0} -> ${cm1}`)
    await ev(A, 'crack', 1, 'zsx')
    await ev(A, 'drill', 1, 'zsx')
    s = await st(A)
    check('a safe cracked (+10) and a vault drilled (+25)', val(s, 'heisters') === '60', s)
    await ev(A, 'getaway', 1, 'zsx')
    const noWave = val(await st(A), 'heisters')
    await cmd('zzheistwave zsx 1')
    await ev(A, 'getaway', 1, 'zsx')
    const noLoot = val(await st(A), 'heisters')
    await cmd(`zzbagadd ${A} zsx#0 1000`)
    await ev(A, 'rob', 1000, 'zsx#0')
    await ev(A, 'getaway', 1, 'zsx')
    const got = val(await st(A), 'heisters')
    await ev(A, 'getaway', 1, 'zsx')
    const again = val(await st(A), 'heisters')
    await cmd('zzheistwave zsx 0')
    await cmd(`zzbagadd ${A} zsx#0 0`)
    check('a getaway counts (+40) only after a wave, with that run\'s loot, and once per run', noWave === '60' && noLoot === '60' && got === '100' && again === '100', `${noWave} ${noLoot} ${got} ${again}`)
    await ev(A, 'contract', 3000, 'basic')
    s = await st(A)
    check('a car contract: its pay on Top Earners, 20 points on Wheelmen (Street job)', val(s, 'earners') === '5000' && val(s, 'wheelmen') === '20', s)
    await cmd(`lp user ${B} permission set donating.season.exempt true`)
    await sleep(1500)
    await ev(B, 'rob', 5000, 'zsy#2')
    await ev(B, 'sell', 5000, 'zsy#2')
    s = await st(B)
    await cmd(`lp user ${B} permission unset donating.season.exempt`)
    await sleep(1500)
    check('staff with donating.season.exempt aren\'t counted', val(s, 'earners') === '1000', s)

    // A real sale at a base (bag.sk's hook): the run's loot reaches the boards.
    await cmd('forceload add 850 850 866 866')
    await cmd('fill 850 199 850 866 199 866 glass')
    await cmd('rg remove -w world safe_base_zs')
    await cmd('zzregion safe_base_zs 858 190 858 866 208 866')
    await cmd('rg flag -w world safe_base_zs passthrough allow')
    await cmd(`zztestkit ${C}`) // a bag
    await cmd(`zzheisttp ${C} 852.5 200 852.5`)
    await sleep(500)
    await ev(C, 'rob', 2000, 'zreal#1')
    await cmd(`zzbagadd ${C} zreal#1 2000`)
    const c0 = val(await st(C), 'earners')
    await cmd(`zzheisttp ${C} 862.5 200 862.5`)
    await until(async () => val(await st(C), 'earners') !== c0, 4000)
    s = await st(C)
    check('a real sale at the base reaches the boards (bag.sk: +$2,000 on Top Earners)', Number(val(s, 'earners')) === Number(c0) + 2000, `${c0} -> ${s}`)
    await cmd(`zzheisttp ${C} ${FAR}`)
    await cmd('rg remove -w world safe_base_zs')
    await cmd('fill 850 199 850 866 199 866 air')
    await cmd('forceload remove 850 850 866 866')

    // ---------- The boards ----------
    await cmd('dseason rank')
    await sleep(1200)
    const top1 = await papi(B, 'donating_lb_earners_1')
    const top2 = await papi(B, 'donating_lb_earners_2')
    s = await st(A)
    check('the boards rank (placeholders: #1 SeasA $5,000, #2 SeasC $3,050); ranks per board', /#1.*SeasA.*\$5,000/.test(top1) && /#2.*SeasC.*\$3,050/.test(top2) && rank(s, 'earners') === '1' && rank(s, 'heisters') === '1', `${top1} | ${top2} | ${s}`)
    const line = await papi(A, 'donating_season')
    check('the sidebar line: season, time left, your best rank', /S1/.test(line) && /#1/.test(line) && /(27|28)d/.test(line), line)
    await closeAll(A)
    let o = windowOpen(bots[A])
    bots[A].chat('/lb')
    let w = await o
    await sleep(300)
    const firstRow = itemText(w && w.slots[20])
    const mine = itemText(w && w.slots[40])
    o = windowOpen(bots[A])
    bots[A].clickWindow(4, 0, 0).catch(() => {})
    const w2 = await o
    await sleep(300)
    check('/lb: the top 10 as heads, your own place, the three boards as tabs', /Season 1 . Top Earners/.test(title(w)) && w.slots[20] && w.slots[20].name === 'player_head' && /#1/.test(firstRow) && /SeasA/.test(firstRow) && /"You: "/.test(mine) && /"#1"/.test(mine) && /Master Thieves/.test(title(w2)), `title=${/Season 1 . Top Earners/.test(title(w))} head=${w && w.slots[20] && w.slots[20].name} r1=${/#1/.test(firstRow)} name=${/SeasA/.test(firstRow)} mine=${/"You: "/.test(mine) && /"#1"/.test(mine)} tab=${/Master Thieves/.test(title(w2))} ${(mine.match(/"value":"[^"]*"/g) || []).join(" ")}`)
    await closeAll(A)
    t = Date.now()
    bots[A].chat('/season')
    await sleep(800)
    check('/season: your ranks, season points, the next milestone, the prizes', /Season 1/.test(text(A, t)) && /Top Earners.*#1/.test(text(A, t)) && /Season points/.test(text(A, t)) && /Next milestone/.test(text(A, t)), text(A, t).slice(0, 600))

    // ---------- Milestones ----------
    t = Date.now()
    for (let i = 0; i < 16; i++) await ev(A, 'drill', 1, 'zsx')
    await until(async () => /Season milestone/.test(text(A, t)), 3000)
    await sleep(500)
    s = await st(A)
    check('a milestone (500 season points): a Season key, told once', Number(field(s, 'points')) >= 500 && field(s, 'keys') === '1' && field(s, 'ms') === '1' && (text(A, t).match(/Season milestone/g) || []).length === 1, `${s} ${text(A, t).slice(0, 300)}`)
    const give = await cmd(`dcrate give ${A} season 1`)
    check('Season keys can\'t be given by command (no store package can sell them)', /only come from seasons/.test(give) && field(await st(A), 'keys') === '1', give)

    // ---------- The end ----------
    await cmd(`zzseasonmins ${A} 400`)
    await cmd(`zzseasonmins ${B} 400`)
    await cmd(`zzseasonmins ${C} 10`)
    // season::auto is off by default (the owner releases seasons by hand); on here to test the automatic start.
    await cmd('zzcfgbool season::auto true')
    t = Date.now()
    const endedAt = Math.floor(Date.now() / 1000)
    const ended = await cmd('dseason end')
    await sleep(1000)
    const info2 = await cmd('dseason info')
    const end2 = Number(field(info2, 'end'))
    check('the end: everyone hears the top 3, and Season 2 starts at once (28 days, on the hour)', /state=live now num=2/.test(ended) && /Season 1 is over/.test(text(B, t)) && /Top Earners: #1 SeasA/.test(text(B, t)) && end2 % 3600 === 0 && end2 - endedAt >= 28 * 86400 - 5 && end2 - endedAt <= 28 * 86400 + 3600, `${ended} | ${info2} | ${text(B, t).slice(0, 400)}`)
    check('online players are told their placing', /Season 1 ended: you placed #1 Top Earners/.test(text(A, t)), text(A, t).slice(0, 600))
    // Prizes wait for the review: nothing paid yet; C (10 minutes played) gets nothing.
    const balA0 = await bal(A)
    const balB0 = await bal(B)
    const balC0 = await bal(C)
    check('prizes wait for the review (nothing paid yet)', /review=\d+/.test(info2) && !/paid=1/.test(info2), info2)
    // A void during the review re-freezes Season 1 in the same order (SeasC has no prize to lose).
    const before = await cmd('dseason finals 1 earners')
    const voided = await cmd(`dseason void ${C}`)
    const after = await cmd('dseason finals 1 earners')
    check('a void during the review re-freezes the season under review, in the same order', /taken off season 1; its prizes worked out again/.test(voided) && /#1=SeasA/.test(after) && /#2=SeasB/.test(after) && before === after, `${voided} | ${before} | ${after}`)
    // B logs out before the payout (paid at the next join).
    await quit(bots[B])
    await sleep(1000)
    t = Date.now()
    const appr = await cmd('dseason approve 1')
    await sleep(1500)
    const balA1 = await bal(A)
    const cosA = await cmd(`zzcos ${A}`)
    check('approved: the #1 of all three boards gets 3 × $25,000, 3 × 3 Season keys and the three «Top» titles', /paid/.test(appr) && balA1 - balA0 === 75000 && field(await st(A), 'keys') === '10' && /s1_earners_1/.test(cosA) && /s1_heisters_1/.test(cosA) && /s1_wheelmen_1/.test(cosA) && /SEASON 1 PRIZE|Season 1 prize/.test(text(A, t)), `${appr} +${balA1 - balA0} ${await st(A)} ${cosA}`)
    check('a player under the minimum hours gets no prize', (await bal(C)) === balC0 && !/s1_/.test(await cmd(`zzcos ${C}`)), `${await bal(C)} ${await cmd(`zzcos ${C}`)}`)
    bots[B] = await join(B)
    await sleep(5000)
    const balB1 = await bal(B)
    check('a player who was offline gets theirs at the next join (#2 on two boards: 2 × $10,000)', balB1 - balB0 === 20000 && /s1_earners_3/.test(await cmd(`zzcos ${B}`)), `+${balB1 - balB0} ${await cmd(`zzcos ${B}`)}`)
    await cmd('dseason approve 1')
    await quit(bots[B])
    bots[B] = await join(B)
    await sleep(5000)
    check('never twice (approving again, rejoining)', (await bal(B)) === balB1 && (await bal(A)) === balA1, `${await bal(B)} ${await bal(A)}`)

    // ---------- Earned titles can't be traded ----------
    await cmd(`zzheisttp ${A} 0.5 68 -656.5`)
    await cmd(`zzheisttp ${B} 2.5 68 -656.5`)
    await sleep(1200)
    await closeAll(A)
    bots[A].chat(`/trade ${B}`)
    await sleep(700)
    const oa = windowOpen(bots[A])
    bots[B].chat(`/trade ${A}`)
    await oa
    await sleep(500)
    o = windowOpen(bots[A])
    bots[A].clickWindow(46, 0, 0).catch(() => {})
    w = await o
    await sleep(300)
    const list = w ? w.slots.slice(0, 45).filter(Boolean).map(itemText).join(' ') : ''
    check('earned titles can\'t be traded (they aren\'t in the list)', /Add a cosmetic/.test(title(w)) && !/S1 Top/.test(list), `${title(w)} ${list.slice(0, 300)}`)
    await closeAll(A)
    await sleep(500)

    // ---------- Seasons by hand (the default): nothing starts until staff start it ----------
    await cmd('zzcfgreload')
    const ended2 = await cmd('dseason end')
    await sleep(1000)
    const off = await cmd('dseason info')
    const restarted = await cmd('dseason start 28')
    const on3 = await cmd('dseason info')
    check('by default a season that ends leaves no season running until staff run /dseason start', /state=off/.test(ended2 + off) && /num=2/.test(off) && /started/.test(restarted) && /num=3 state=live/.test(on3), `${ended2} | ${off} | ${restarted} | ${on3}`)
  } finally {
    await rcon.cmd('rg remove -w world safe_base_zs').catch(() => {})
    await rcon.cmd('fill 850 199 850 866 199 866 air').catch(() => {})
    await rcon.cmd('forceload remove 850 850 866 866').catch(() => {})
    await rcon.cmd('zzseasonwipe').catch(() => {})
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd('zzheistwave zsx 0').catch(() => {})
    for (const name of [A, B, C]) {
      await rcon.cmd(`zzbagadd ${name} zsx#0 0`).catch(() => {})
      for (const b of ['earners', 'heisters', 'wheelmen']) for (const r of [1, 3, 10]) await rcon.cmd(`zzdata ${name} cos::s1_${b}_${r} none`).catch(() => {})
      await rcon.cmd(`zzdata ${name} cos::s1_veteran none`).catch(() => {})
      await rcon.cmd(`zzdata ${name} keys::season none`).catch(() => {})
      await rcon.cmd(`zzdata ${name} season-paid::1 none`).catch(() => {})
      await rcon.cmd(`zzdata ${name} season-seen none`).catch(() => {})
      await rcon.cmd(`lp user ${name} permission unset donating.season.exempt`).catch(() => {})
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    rcon.close()
  }
}
