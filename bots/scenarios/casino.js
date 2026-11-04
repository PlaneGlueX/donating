// casino.sk: the cashier (a second click confirms, charged once, refused when carrying loot or under the level), slots
// (a forced result pays exactly bet x table, chips can't go below the bet) and the cash-out fee.
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')
const P = 'CasinoBot'
const COUNTER = [858, 73, 354]
const MACHINE = [862, 73, 339]
const STAND = [862.5, 73, 341.5]
const CASHIER_STAND = [860.5, 73, 354.5]

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  const chips = async () => Number(((await cmd(`zzchips ${P}`)).match(/ (\d+(?:\.\d+)?)$/) || [])[1])
  const bal = async () => Number(((await cmd(`zzbal ${P}`)).match(/: (-?[\d.]+)/) || [])[1])
  const open = async ([x, y, z], title) => {
    const Vec3 = require('vec3')
    const w = new Promise(res => { bot.once('windowOpen', res); setTimeout(() => res(null), 4000) })
    bot.activateBlock(bot.blockAt(new Vec3(x, y, z))).catch(() => {})
    const win = await w
    check(`${title} opens on a click`, Boolean(win), win ? String(win.title).slice(0, 80) : `no window; block ${bot.blockAt(new Vec3(x, y, z)) && bot.blockAt(new Vec3(x, y, z)).name} bot ${bot.entity.position} ${await cmd(`zzinheist ${P}`)}`)
    if (!win) throw new Error('no menu')
    await sleep(300)
    return win
  }
  const click = async slot => { await bot.clickWindow(slot, 0, 0).catch(() => {}); await sleep(500) }
  try {
    await cmd('zzcasinoforce none')
    bot = await join(P)
    await cmd(`zzjail ${P} state none`)
    await cmd(`zzclear ${P}`)
    await cmd(`zzbagclear ${P}`)
    await cmd(`gamemode survival ${P}`)
    await cmd(`zzchips ${P} 0`)
    await cmd(`dlevel set ${P} 5`)
    await cmd(`eco set ${P} 10000`)
    await cmd(`zzheisttp ${P} ${CASHIER_STAND.join(' ')}`)
    await sleep(3000)

    await open(COUNTER, 'the cashier')
    const before = await bal()
    await click(10) // Buy 1,000: asks
    check('one click only asks to confirm', (await chips()) === 0 && (await bal()) === before, `${await chips()} ${await bal()}`)
    await click(10)
    check('the second click buys 1,000 chips for $1,000', (await chips()) === 1000 && (await bal()) === before - 1000, `${await chips()} ${await bal()}`)
    bot.closeWindow(bot.currentWindow)
    await sleep(500)

    await cmd(`zzheisttp ${P} ${STAND.join(' ')}`)
    await sleep(1500)
    await open(MACHINE, 'a slot machine')
    await cmd('zzcasinoforce 3 Bars')
    await click(22)
    check('a forced 3 Bars on a bet of 10 pays 100', (await chips()) === 1090, String(await chips()))
    await sleep(1700)
    await cmd('zzcasinoforce Nothing')
    await click(22)
    check('a losing spin takes only the bet', (await chips()) === 1080, String(await chips()))
    await click(22)
    check('a spin within the 1.5 s gap does nothing', (await chips()) === 1080, String(await chips()))
    await sleep(1700)
    await cmd(`zzchips ${P} 5`)
    await click(22)
    check('a bet above your chips is refused', (await chips()) === 5, String(await chips()))
    bot.closeWindow(bot.currentWindow)
    await sleep(500)

    await cmd(`zzchips ${P} 1000`)
    await cmd(`zzheisttp ${P} ${CASHIER_STAND.join(' ')}`)
    await sleep(1500)
    const b2 = await bal()
    await open(COUNTER, 'the cashier again')
    await click(15)
    check('cash out pays chips less the 2% fee', (await chips()) === 0 && (await bal()) === b2 + 980, `${await chips()} ${await bal()}`)
    bot.closeWindow(bot.currentWindow)
    await sleep(500)

    // ---------- The Lucky Wheel ----------
    const WHEEL = [869, 75, 364], WSTAND = [869.5, 73, 367.5], TABLE = [866, 74, 357], TSTAND = [866.5, 73, 360.5], RL = [884, 74, 357], RSTAND = [884.5, 73, 360.5]
    const clickBlock = async ([x, y, z]) => { const Vec3 = require('vec3'); await bot.activateBlock(bot.blockAt(new Vec3(x, y, z))).catch(() => {}); await sleep(600) }
    await cmd(`zzcasinoreset ${P}`)
    await cmd(`zzchips ${P} 0`)
    await cmd(`zzheisttp ${P} ${WSTAND.join(' ')}`)
    await sleep(1500)
    await cmd('zzcasinowheel 1') // the first segment: 1,000 chips
    await clickBlock(WHEEL)
    check('the wheel pays its prize', (await chips()) === 1000, String(await chips()))
    await clickBlock(WHEEL)
    check('a second spin the same day is refused', (await chips()) === 1000, String(await chips()))
    await cmd('zzcasinowheel none')
    await cmd(`zzheisttp ${P} ${CASHIER_STAND.join(' ')}`)
    await sleep(1500)
    await open(COUNTER, 'the cashier with wheel chips')
    await click(15)
    check("the wheel's chips can't be cashed out for a day", (await chips()) === 1000, String(await chips()))
    bot.closeWindow(bot.currentWindow)
    await sleep(500)
    await cmd(`zzcasinoreset ${P}`)

    // ---------- Blackjack ----------
    const DEAL = 49, HIT = 47, BJSTAND = 49, DOUBLE = 51
    await cmd(`zzheisttp ${P} ${TSTAND.join(' ')}`)
    await sleep(1500)
    await cmd(`zzchips ${P} 1000`)
    await open(TABLE, 'a blackjack table')
    const hand = async (deck, ...clicks) => { await cmd(`zzcasinodeck ${deck}`); await click(DEAL); for (const c of clicks) await click(c) }
    await hand('10:S,10:H,9:D,7:C', BJSTAND) // 19 against 17
    check('a win pays 1:1', (await chips()) === 1100, String(await chips()))
    await hand('10:S,10:H,7:D,7:C', BJSTAND) // 17 against 17
    check('a push returns the bet', (await chips()) === 1100, String(await chips()))
    await hand('A:S,10:H,K:D,7:C') // a natural
    check('blackjack pays 3:2, no click needed', (await chips()) === 1250, String(await chips()))
    await hand('10:S,10:H,6:D,7:C,K:C', HIT) // 26
    check('a bust loses the bet', (await chips()) === 1150, String(await chips()))
    await hand('6:S,10:H,5:D,7:C,10:C', DOUBLE) // 21 against 17 on 200
    check('a double pays on twice the bet', (await chips()) === 1350, String(await chips()))
    await hand('5:S,10:H,5:D,6:C,K:C', BJSTAND) // 10 against 16, the dealer draws K: bust
    check('the dealer draws to 17 and can bust', (await chips()) === 1450, String(await chips()))
    await hand('10:S,10:H,9:D,7:C')
    const midHand = await chips()
    bot.closeWindow(bot.currentWindow)
    await sleep(800)
    check('closing the menu stands the hand and pays it', midHand === 1350 && (await chips()) === 1550, `${midHand} ${await chips()}`)
    await cmd('zzcasinodeck none')

    // ---------- Roulette ----------
    await cmd(`zzheisttp ${P} ${RSTAND.join(' ')}`)
    await sleep(1500)
    await cmd(`zzchips ${P} 1000`)
    await cmd('zzcasinort 0')
    await open(RL, 'the roulette table')
    await click(37) // Red, a 50 chip
    check('a chip goes on the table at once', (await chips()) === 950, String(await chips()))
    await bot.clickWindow(37, 1, 0).catch(() => {})
    await sleep(500)
    check('a right-click takes it back', (await chips()) === 1000, String(await chips()))
    await click(37) // Red
    await click(6) // number 7 (red), 50
    await click(7) // number 8 (black), 50
    await cmd('zzcasinorl 7')
    await cmd('zzcasinort 19')
    await sleep(1500)
    const closed = await chips()
    await click(39)
    check('no bets once the wheel is spinning', (await chips()) === closed && closed === 850, `${closed} ${await chips()}`)
    await cmd('zzcasinort 27')
    await sleep(2500)
    // red 50 x 2 + number 7 50 x 36 + number 8 lost = 1,900
    check('the result pays each bet by its odds', (await chips()) === 2750, String(await chips()))
    await cmd('zzcasinorl none')
    bot.closeWindow(bot.currentWindow)
    await sleep(500)

    await cmd(`zzheisttp ${P} ${CASHIER_STAND.join(' ')}`)
    await sleep(1500)
    await cmd(`zzchips ${P} 0`)
    await cmd(`dlevel set ${P} 4`)
    await open(COUNTER, 'the cashier under the level')
    const b3 = await bal()
    await click(10); await click(10)
    check('under level 5 buying is refused', (await chips()) === 0 && (await bal()) === b3, `${await chips()} ${await bal()}`)
  } finally {
    for (const c of ['zzcasinoforce none', 'zzcasinodeck none', 'zzcasinorl none', 'zzcasinowheel none']) await rcon.cmd(c).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
