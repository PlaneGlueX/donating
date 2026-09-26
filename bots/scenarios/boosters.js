const fs = require('fs')
const path = require('path')
// boosters.sk: server-wide money boosters. While one runs, every loot sale pays P × b for everyone and
// P × (b + 0.5) for its buyer (owner, 2026-09-26); level XP and the bounty stay on P; the start and the
// end are announced; the footer shows it; more queue behind it; bad values are refused; staff only.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'BoostA' // the buyer
const B = 'BoostB'
const Y = 200
const CHUNKS = '850 850 866 866'
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const papi = async (name, ph) => ((await cmd(`zzpapi ${name} ${ph}`)).match(/= (.*)$/m) || [])[1] || ''
    const info = async () => cmd('dbooster info')
    // Sells $1,000 (one heist run) at the base; returns what the balance went up by.
    let run = 1
    const sell = async name => {
      await cmd(`zzheisttp ${name} 852.5 ${Y} 852.5`)
      await sleep(400)
      await cmd(`zzbagadd ${name} bst#${run++} 1000`)
      const before = await bal(name)
      await cmd(`zzheisttp ${name} 862.5 ${Y} 862.5`)
      await sleep(1800)
      return (await bal(name)) - before
    }

    // ---------- Setup ----------
    await cmd('dbooster stop')
    await cmd('dbooster clear')
    await cmd('rg remove -w world safe_base_bt')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 850 ${Y - 1} 850 866 ${Y - 1} 866 glass`)
    await cmd('zzregion safe_base_bt 858 190 858 866 208 866')
    await cmd('rg flag -w world safe_base_bt passthrough allow')
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzbagclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`zzbountyreset ${name}`)
      await cmd(`dlevel reset ${name}`)
      await cmd(`dranks give ${name} none`)
      await cmd(`lp user ${name} permission unset donating.staff`)
      await cmd(`zztestkit ${name}`) // bag tier 2
      await cmd(`eco set ${name} 10000`)
    }
    await sleep(2000)
    check('no booster: a $1,000 sale pays $1,000', (await sell(B)) === 1000)

    // ---------- A booster ----------
    let t = Date.now()
    const started = await cmd(`dbooster add ${A} 1.5 30`)
    await sleep(800)
    check('a booster starts for everyone, announced with the buyer\'s name', /started/.test(started) && /BoostA started a 1\.5× money booster for everyone!/.test(text(B, t)), `${started} / ${text(B, t)}`)
    const foot = await papi(B, 'donating_booster')
    check('everyone\'s footer shows it: the multiplier, the time left and the buyer', /1\.5× money for everyone/.test(foot) && /thanks .*BoostA/.test(foot) && /(30:00|29:5\d)/.test(foot), foot)
    t = Date.now()
    const gotB = await sell(B)
    check('everyone\'s sales pay 1.5× ($1,500 for $1,000)', gotB === 1500 && /Money booster 1\.5×: \+\$500/.test(text(B, t)), `${gotB} ${text(B, t)}`)
    const gotA = await sell(A)
    check('the buyer\'s own sales pay 2× ($2,000): the booster plus the buyer bonus', gotA === 2000, `${gotA}`)
    const lv = await cmd(`dlevel info ${B}`)
    check('level XP stays on the normal pay (10 + 10 per sale, not 15 + 10)', /xp=40\b/.test(lv), lv)
    t = Date.now()
    bots[A].chat('/booster')
    await sleep(800)
    check('/booster shows it, and tells the buyer theirs is 2×', /1\.5× money for everyone/.test(text(A, t)) && /Yours: 2×/.test(text(A, t)), text(A, t))

    // ---------- The queue ----------
    const queued = await cmd(`dbooster add ${B} 2 1`)
    check('a second booster queues behind the running one', /queued/.test(queued) && /queued=1/.test(await info()) && /multiplier=1\.5/.test(await info()), `${queued} / ${await info()}`)
    t = Date.now()
    await cmd('dbooster stop')
    await sleep(800)
    check('when one ends (here: staff stop), the next starts at once and is announced', /multiplier=2\b/.test(await info()) && /queued=0/.test(await info()) && /money booster from BoostA ended/.test(text(A, t)) && /BoostB started a 2× money booster/.test(text(A, t)), `${await info()} / ${text(A, t)}`)
    t = Date.now()
    await cmd('zzboosterleft 2')
    await sleep(3500)
    check('it runs out by itself: announced, the footer is empty, sales are normal again', /active=none/.test(await info()) && /ended/.test(text(A, t)) && (await papi(B, 'donating_booster')) === '(amp)r' && (await sell(B)) === 1000, `${await info()} / ${await papi(B, 'donating_booster')}`)

    // ---------- Refusals, staff only, saved ----------
    const bad = [await cmd(`dbooster add ${A} 1 30`), await cmd(`dbooster add ${A} 3 30`), await cmd(`dbooster add ${A} 1.5 0`), await cmd(`dbooster add ${A} 1.5 999`)]
    check('refused: a multiplier of 1 or over 2, 0 minutes or over 4 hours', bad.every(r => /more than 1|minutes/.test(r)) && /active=none/.test(await info()), bad.join(' / '))
    t = Date.now()
    bots[B].chat('/dbooster info')
    await sleep(800)
    check('/dbooster is the owner\'s and the store\'s only', /Only the owner and the store/.test(text(B, t)), text(B, t))
    // Tebex's {purchaseQuantity}: "$1 per 5 minutes" bought 3 times = one 15-minute booster; 3 × 100
    // minutes is over the 240-minute limit, so it's two queued boosters (240 + 60).
    await cmd(`dbooster add ${A} 1.5 5 3`)
    const q1 = await info()
    await cmd(`dbooster add ${A} 1.5 100 3`)
    const q2 = await info()
    check('a quantity multiplies the minutes (5 × 3 = 15 min), and a long one is split into queued boosters', /left=900\b/.test(q1) && /queued=2\b/.test(q2), `${q1} / ${q2}`)
    await cmd('dbooster clear')
    await cmd('dbooster stop')
    const odd = await cmd(`dbooster add ${A} 1.004 5`)
    check('a multiplier is checked as it\'s saved (1.004 rounds to 1: refused, and logged)', /more than 1/.test(odd) && /active=none/.test(await info()), odd)
    await cmd(`dbooster add ${A} 1.25 10`)
    // Skript writes saved variables to variables.csv on a clean stop (Minehut's sleep and restarts are
    // clean) and after 1,000 changes (config.sk), so the file lags; what makes a booster survive is that
    // its state is in saved variables: no memory-only {-...} name (config.sk's database pattern (?!-).*).
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'scripts', 'boosters.sk'), 'utf8')
    const cfgsk = fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'config.sk'), 'utf8')
    check('the booster state is in saved variables, so a restart or Minehut sleep keeps it', src.includes('{booster::active}') && src.includes('{booster::left}') && src.includes('{booster::queue::') && !src.includes('{-booster::') && /type: CSV[\s\S]*?pattern: \(\?!-\)\.\*/.test(cfgsk))
    await cmd('sk reload boosters')
    await sleep(1500)
    check('...and a reload too', /multiplier=1\.25/.test(await info()), await info())
  } finally {
    await rcon.cmd('dbooster stop').catch(() => {})
    await rcon.cmd('dbooster clear').catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzbagclear ${name}`).catch(() => {})
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot)
    await rcon.cmd('rg remove -w world safe_base_bt').catch(() => {})
    await rcon.cmd(`fill 850 ${Y - 1} 850 866 ${Y - 1} 866 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
