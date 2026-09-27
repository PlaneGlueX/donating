// progress.sk's ledger and run notes (built 2026-09-27 for contact jobs and Vic's Wanted List): the loot a player
// robbed themselves per heist run (a sale uses it up; a duffel's or someone else's loot never counts), the notes
// the heist, trap and loot scripts leave on a run (a trap touched you, an alarm hunted you, the clock when you
// walked out; a dry-mode hit never counts), heat (once per run), pruning finished runs, and the week number.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')
const conv = require('mineflayer/lib/conversions')

const A = 'ProgA'
const B = 'ProgB'
const Y = 200
const ID = 'zprog'
const CHUNKS = '2595 2595 2630 2630'
const START = [2607.5, 2610.5] // west of the heist (x 2610..2620); walking east 1.5 s ends near x 2614
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
    const field = (s, k) => (s.match(new RegExp(` ${k}=(\\S*)`)) || [])[1]
    const heist = async () => cmd(`dheist info ${ID}`)
    const run = async name => cmd(`zzrun ${name} ${ID}#${field(await heist(), 'run')}`)
    const place = async (name, x, z) => { await cmd(`zzheisttp ${name} ${x} ${Y} ${z}`); await sleep(1300) }
    const walk = async (name, notchYaw, ms) => {
      const bot = bots[name]
      await bot.look(conv.fromNotchianYaw(notchYaw), 0, true)
      bot.setControlState('forward', true)
      await sleep(ms)
      bot.setControlState('forward', false)
      await sleep(1300)
    }
    const walkIn = async name => { await place(name, START[0], START[1]); await walk(name, -90, 1500) }
    const walkOut = async name => walk(name, 90, 2500)

    // ---------- Setup: a difficulty-4 test heist with a plate trap ----------
    await cmd(`dtrap clear ${ID} confirm`)
    await cmd(`dheist delete ${ID} confirm`)
    await cmd(`rg remove -w world heist_${ID}`)
    await cmd('zzcfgreload')
    await cmd('zzcfgtext heist::start-on enter')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 2598 ${Y} 2598 2628 ${Y + 8} 2622 air`)
    await cmd(`fill 2598 ${Y - 1} 2598 2628 ${Y - 1} 2622 glass`)
    await cmd(`zzregion heist_${ID} 2610 199 2605 2620 206 2615`)
    await cmd('setblock 2613 200 2610 stone_pressure_plate')
    for (const c of [`dheist create ${ID} 4`, `dheist set ${ID} level 0`, `dheist set ${ID} name Prog Vault`, `dheist set ${ID} escape 600`, `dheist set ${ID} cooldown 5`,
      `dheist exit ${ID} 2603.5 200 2610.5 -90`, `dtrap add ${ID} plate 2613 200 2610 damage=1`, `dheist snapshot ${ID}`, `dheist enable ${ID}`]) await cmd(c)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`dtrap dry ${name} off`)
    }
    await place(A, 2600.5, 2610.5)
    await place(B, 2600.5, 2612.5)
    const opened = await (async () => { for (let i = 0; i < 40; i++) { if (field(await heist(), 'state') === 'open') return true; await sleep(250) } return false })()
    await sleep(5000) // bots can't be hurt until about 6 s after joining (the plate's hit must land)
    const R = field(await heist(), 'run')
    const TAG = `${ID}#${R}`

    // ---------- Real notes: a trap hit, an alarm, the clock at the walk-out ----------
    await walkIn(A)
    let r = await run(A)
    check('walking over a trap plate in the heist notes "touched" on that run', opened && /touched=true/.test(r) && /flag=\d+/.test(r), `${opened} ${r} | ${await heist()}`)
    await cmd(`dheist alarm ${ID}`)
    await sleep(800)
    r = await run(A)
    check('an alarm hunting the robber notes "loud" on the run', /loud=true/.test(r), r)
    const leftBefore = Number(field(await heist(), 'left'))
    await walkOut(A)
    r = await run(A)
    const left = Number(field(r, 'left'))
    check('walking out notes the seconds left on the clock', Math.abs(left - leftBefore) <= 6 && left > 500, `left=${left} before=${leftBefore} | ${r}`)
    await cmd(`dtrap dry ${B} on`)
    await walkIn(B)
    const rb = await run(B)
    await walkOut(B)
    check('a dry-mode hit (staff testing traps) never notes "touched"', !/touched=true/.test(rb), rb)

    // ---------- The ledger: own loot, sales, duffels ----------
    await cmd(`zzprog ${A} rob 1500 ${TAG}`)
    r = await run(A)
    check('a robbery adds its $ to the robber\'s own loot of that run', /own=1500/.test(r), r)
    await cmd(`zzprog ${A} sell 2000 ${TAG}`)
    const afterSell = await run(A)
    await cmd(`zzprog ${A} sell 500 ${TAG}`)
    const afterSell2 = await run(A)
    check('a sale uses up only what the player robbed themselves ($1,500 of a $2,000 sale), then nothing more', /sold=1500/.test(afterSell) && /sold=1500/.test(afterSell2), `${afterSell} | ${afterSell2}`)
    await cmd(`zzprog ${A} sell 800 zother#1`)
    const other = await cmd(`zzrun ${A} zother#1`)
    check('selling loot of a run never robbed (a picked-up duffel) counts no own loot', /sold=<none>/.test(other) && /flag=<none>/.test(other), other)

    // ---------- Heat ----------
    const h1 = await cmd(`zzheat ${ID}`)
    await cmd(`zzprog ${A} rob 200 ${TAG}`)
    const h2 = await cmd(`zzheat ${ID}`)
    check('heat: the last robbery time, and the week\'s count once per run (not per piece)', /last=\d+/.test(h1) && field(h1, 'week') === field(h2, 'week') && Number(field(h1, 'week')) >= 1 && field(h1, 'lastrun') === R, `${h1} | ${h2}`)

    // ---------- Pruning ----------
    await cmd(`zzprog ${A} rob 100 ${ID}#0`)
    const before = await cmd(`zzrun ${A} ${ID}#0`)
    await cmd(`zzprune ${A}`)
    const gone = await cmd(`zzrun ${A} ${ID}#0`)
    const kept = await run(A)
    check('pruning forgets an older run with no loot left in the bag, and keeps the current one', /own=100/.test(before) && /flag=<none>/.test(gone) && /own=1700/.test(kept), `${before} | ${gone} | ${kept}`)

    // ---------- The week ----------
    const w = await cmd('zzweek')
    const unix = Number(field(w, 'unix'))
    const wk = Number((w.match(/WEEK (\d+)/) || [])[1])
    await cmd('zzcfgset week::offset 604800')
    const w2 = Number(((await cmd('zzweek')).match(/WEEK (\d+)/) || [])[1])
    await cmd('zzcfgset week::offset 0')
    await cmd('zzweek 7')
    const w3 = Number(((await cmd('zzweek')).match(/WEEK (\d+)/) || [])[1])
    await cmd('zzweek off')
    check('the week is floor(unix / 604800) (Thursday 00:00 UTC), week::offset moves it, a test override works', wk === Math.floor(unix / 604800) && w2 === wk + 1 && w3 === 7, `${w} ${w2} ${w3}`)
    void messagesSince
  } finally {
    await rcon.cmd('zzweek off').catch(() => {})
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd(`dtrap clear ${ID} confirm`).catch(() => {})
    await rcon.cmd(`dheist delete ${ID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${ID}`).catch(() => {})
    await rcon.cmd(`minecraft:kill @e[tag=poi_h_${ID}]`).catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`dtrap dry ${name} off`).catch(() => {})
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill 2598 ${Y - 1} 2598 2628 ${Y + 8} 2622 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
