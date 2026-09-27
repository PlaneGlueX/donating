// trade.sk: trading in person (owner, 2026-09-26: cars and crate cosmetics, in person, no tax). A request needs
// the other player next to you; the same command back opens the window for both; cars and crate cosmetics are
// added from lists (with why not: they have that car already, the level, a rank's look), shown to the other
// side at once; any change makes both not ready; both ready runs a countdown and the swap (the car keeps its
// plate and becomes the other player's in MTVehicles too; a worn cosmetic comes off); a change during the
// countdown stops it; closing, walking away and getting hurt cancel it; every trade is logged.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'TradeA'
const B = 'TradeB'
const Y = 200
const CHUNKS = '2090 2090 2140 2130'
const PLATFORM = `2090 ${Y - 1} 2090 2140 ${Y - 1} 2130`
const FAR = '0.5 68 -656.5'
const PA = [2110.5, Y, 2110.5]
const PB = [2112.5, Y, 2110.5]
const CARS = ['sedan', 'sportsedan', 'jeep', 'sports', 'hotrod', 'suv', 'vandal', 'specter', 'overclock']
const COS = ['tiger', 'ghost']

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(200) }
      return Boolean(await fn())
    }
    const windowOpen = bot => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const closeAll = async name => { if (bots[name].currentWindow) { bots[name].closeWindow(bots[name].currentWindow); await sleep(400) } }
    const title = w => (w ? JSON.stringify(w.title) : '')
    const itemText = i => (i ? JSON.stringify(i) : '')
    const slot = (name, n) => { const w = bots[name].currentWindow; return w && w.slots[n] ? w.slots[n].name : '' }
    const click = async (name, n, waitWindow = false) => {
      const o = waitWindow ? windowOpen(bots[name]) : null
      bots[name].clickWindow(n, 0, 0).catch(() => {})
      if (o) await o
      await sleep(500)
    }
    const garage = async name => cmd(`dgarage info ${name}`)
    const plateOf = async (name, car) => ((await garage(name)).match(new RegExp(`${car}=(\\S+?)\\(`)) || [])[1] || ''
    const cos = async name => cmd(`zzcos ${name}`)
    const LOG = require('path').join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs', 'trade.log')
    const log = () => (require('fs').existsSync(LOG) ? require('fs').readFileSync(LOG, 'utf8') : '')
    const logMark = log().length
    const logged = re => log().slice(logMark).split('\n').filter(l => re.test(l))
    const tp = async (name, [x, y, z]) => { await cmd(`zzheisttp ${name} ${x} ${y} ${z}`) }
    const reset = async () => {
      for (const name of [A, B]) {
        for (const c of CARS) await cmd(`dgarage take ${name} ${c}`)
        for (const c of COS) await cmd(`zzdata ${name} cos::${c} none`)
        await cmd(`zzdata ${name} title none`)
        await cmd(`zzdata ${name} bag-skin none`)
      }
    }
    // Opens a trade: A asks, B answers; returns both windows.
    const open = async () => {
      await closeAll(A)
      await closeAll(B)
      bots[A].chat(`/trade ${B}`)
      await sleep(600)
      const oa = windowOpen(bots[A])
      const ob = windowOpen(bots[B])
      bots[B].chat(`/trade ${A}`)
      const [wa, wb] = await Promise.all([oa, ob])
      await sleep(400)
      return [wa, wb]
    }
    const addFirst = async (name, kind) => {
      await click(name, kind === 'car' ? 45 : 46, true)
      const w = bots[name].currentWindow
      await click(name, 0, true)
      return w
    }

    // ---------- Setup ----------
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`dlevel set ${name} 2`)
    }
    await reset()
    await cmd(`dgarage give ${A} sedan Red`)
    await cmd(`zzcosgive ${A} tiger`)
    await cmd(`zzdatatext ${A} bag-skin tiger`)
    await cmd(`zzcosgive ${B} ghost`)
    await tp(A, PA)
    await tp(B, [PB[0] + 20, Y, PB[2]])
    await sleep(5000) // EssentialsX's teleport protection: the hurt check below needs hits to land

    // ---------- Requests ----------
    let t = Date.now()
    bots[A].chat(`/trade ${B}`)
    await until(async () => /Stand next to/.test(text(A, t)), 3000)
    check('a trade needs the other player next to you (in person)', /Stand next to TradeB/.test(text(A, t)) && !/wants to trade/.test(text(B, t)), text(A, t))
    await tp(B, PB)
    await sleep(800)
    t = Date.now()
    let [wa, wb] = await open()
    check('/trade asks them; the same command back opens the window for both', /wants to trade with you/.test(text(B, t)) && /Trade . TradeB/.test(title(wa)) && /Trade . TradeA/.test(title(wb)), `${text(B, t)} | ${title(wa)} ${title(wb)}`)

    // ---------- Offers ----------
    const picker = await addFirst(A, 'car')
    check('"Add a car" lists your cars; picking one shows it on both sides', /Add a car/.test(title(picker)) && picker.slots[0] && picker.slots[0].name === 'diamond_hoe' && /Click: add it/.test(itemText(picker.slots[0])) && slot(A, 9) === 'diamond_hoe' && slot(B, 14) === 'diamond_hoe', `${title(picker)} ${itemText(picker && picker.slots[0]).slice(0, 200)} A9=${slot(A, 9)} B14=${slot(B, 14)}`)
    await addFirst(A, 'cos')
    await addFirst(B, 'cos')
    check('crate cosmetics too (a bag skin one way, a title the other)', slot(A, 10) === 'leather' && slot(B, 15) === 'leather' && slot(B, 9) === 'name_tag' && slot(A, 14) === 'name_tag', `A10=${slot(A, 10)} B15=${slot(B, 15)} B9=${slot(B, 9)} A14=${slot(A, 14)}`)
    await sleep(1100) // Ready is refused for 1 s after a change
    await click(A, 48)
    const aReady = slot(A, 48) === 'lime_concrete' && slot(B, 50) === 'lime_concrete'
    await click(B, 9) // B takes the title back
    check('ready shows on both sides; any change makes both not ready again', aReady && slot(A, 48) === 'red_concrete' && slot(A, 14) !== 'name_tag', `aReady=${aReady} A48=${slot(A, 48)} A14=${slot(A, 14)}`)
    await addFirst(B, 'cos')
    const plate = await plateOf(A, 'sedan')
    const serial = async (name, id) => Number(((await cmd(`zzdata ${name} cosserial::${id}`)).match(/= (\d+)/) || [])[1] || 0)
    const tigerA = await serial(A, 'tiger')
    const ChatMessage = require('prismarine-chat')(bots[B].registry)
    const loreOf = i => ((i && i.customLore) || []).map(l => { try { return ChatMessage.fromNotch(l).toString() } catch (e) { return '' } }).join(' / ')
    const tigerLore = bots[B].currentWindow ? bots[B].currentWindow.slots.slice(0, 45).filter(Boolean).map(loreOf).join(' | ') : ''
    t = Date.now()
    await click(A, 48) // at once: refused
    const tooSoon = slot(A, 48) === 'red_concrete' && /offer just changed/.test(text(A, t))
    await sleep(1100)
    await click(A, 48)
    await click(B, 48)
    const counting = await until(async () => slot(A, 49) === 'clock' && slot(B, 49) === 'clock', 2000)
    t = Date.now()
    const closed = await until(async () => !bots[A].currentWindow && !bots[B].currentWindow, 8000)
    await sleep(500)
    const ga = await garage(A)
    const gb = await garage(B)
    const car = await cmd(`zzcarinfo ${plate}`)
    const ca = await cos(A)
    const cb = await cos(B)
    check('Ready right after a change is refused ("the offer just changed")', tooSoon, text(A, t))
    check('both ready: a countdown, then the swap (windows close, "Trade done")', counting && closed && /Trade done/.test(text(A, t)) && /Trade done/.test(text(B, t)), `counting=${counting} closed=${closed} ${text(A, t)} | ${text(B, t)}`)
    check('the car keeps its plate and is the other player\'s now (garage and MTVehicles)', plate !== '' && !/sedan=/.test(ga) && gb.includes(`sedan=${plate}`) && /owner=TradeB/.test(car), `${plate} | ${ga} | ${gb} | ${car}`)
    check('the cosmetics changed hands, and the worn bag skin came off', /owned=ghost/.test(ca) && !/tiger/.test(ca.replace(/bagskin=\S*/, '')) && /bagskin=<none>/.test(ca) && /owned=tiger/.test(cb) && !/ghost/.test(cb), `${ca} | ${cb}`)
    const tigerB = await serial(B, 'tiger')
    const tigerGone = await serial(A, 'tiger')
    check('a crate cosmetic\'s serial shows in the other player\'s trade window and moves with it (the same #N, none left with the giver)', tigerA > 0 && new RegExp(`Serial #${tigerA} of`).test(tigerLore) && tigerB === tigerA && tigerGone === 0, `A had #${tigerA}, B has #${tigerB}, A now ${tigerGone} | ${tigerLore.slice(0, 300)}`)
    check('the trade is logged (who gave what)', logged(/trade sid=\d+ TradeA .* gave=\[car:sedan,cos:tiger\] TradeB .* gave=\[cos:ghost\]/).length === 1, log().slice(logMark).slice(-400))

    // ---------- What can't be added; a same-model swap ----------
    await cmd(`dgarage give ${A} sedan Navy`)
    await cmd(`dgarage give ${A} suv`)
    await cmd(`dgarage give ${A} vandal`)
    const plateA2 = await plateOf(A, 'sedan')
    ;[wa, wb] = await open()
    await click(A, 45, true)
    const list = bots[A].currentWindow
    const byName = n => (list ? list.slots.filter(Boolean).map(itemText).find(s => new RegExp(n).test(s)) || '' : '')
    const sedanRow = byName('Navy Sedan')
    const suvRow = byName('SUV')
    const vandalRow = byName('Vandal')
    const vandalLore = list ? loreOf(list.slots.find(i => i && /Vandal/.test(itemText(i)))) : ''
    check('a crate car shows its serial in the list (#N of M so far)', /Serial #\d+ of \d+/.test(vandalLore), vandalLore)
    check('the list says why not (the car\'s level), a crate car needs none, and a model they have says they must give theirs', /has a Sedan: they must/.test(sedanRow) && /give theirs in this trade/.test(sedanRow) && /Click: add it/.test(sedanRow) && /needs level 6/.test(suvRow) && /Click: add it/.test(vandalRow), `${sedanRow.slice(-300)} | ${suvRow.slice(-200)} | ${vandalRow.slice(-200)}`)
    const suvSlot = list.slots.findIndex(i => i && /SUV/.test(itemText(i)))
    await click(A, suvSlot)
    const stillList = /Add a car/.test(title(bots[A].currentWindow))
    await click(A, 45, true) // back to the trade
    check('clicking a refused one adds nothing', stillList && /Trade . TradeB/.test(title(bots[A].currentWindow)) && slot(A, 9) !== 'diamond_hoe' && slot(B, 14) !== 'diamond_hoe', `list=${stillList} ${title(bots[A].currentWindow)} A9=${slot(A, 9)}`)
    // A's Navy Sedan for nothing: B has a Sedan, so Ready says why; once B adds theirs it's a swap.
    await click(A, 45, true)
    await click(A, bots[A].currentWindow.slots.findIndex(i => i && /Navy Sedan/.test(itemText(i))), true)
    await sleep(1100)
    t = Date.now()
    await click(A, 48)
    check('Ready is refused while the swap couldn\'t happen, with the reason', slot(A, 48) === 'red_concrete' && /TradeB has a Sedan already/.test(text(A, t)), text(A, t))
    await addFirst(B, 'car')
    await sleep(1100)
    await click(A, 48)
    await click(B, 48)
    await until(async () => !bots[A].currentWindow && !bots[B].currentWindow, 8000)
    await sleep(500)
    check('two players swap Sedans (each gets the other\'s plate)', (await garage(A)).includes(`sedan=${plate}`) && (await garage(B)).includes(`sedan=${plateA2}`), `${plate} ${plateA2} | ${await garage(A)} | ${await garage(B)}`)

    // ---------- A change during the countdown; ending a trade ----------
    await open()
    await click(A, 45, true)
    const vSlot = bots[A].currentWindow.slots.findIndex(i => i && /Vandal/.test(itemText(i)))
    await click(A, vSlot, true)
    await sleep(1100)
    await click(A, 48)
    await click(B, 48)
    await until(async () => slot(A, 49) === 'clock', 2000)
    await click(A, 9) // takes the Vandal back mid-countdown
    await sleep(6500)
    check('taking something back during the countdown stops it (no swap)', /vandal=/.test(await garage(A)) && !/vandal=/.test(await garage(B)) && Boolean(bots[A].currentWindow), `${await garage(A)} | ${await garage(B)}`)
    t = Date.now()
    await closeAll(A)
    await sleep(800)
    check('closing the window cancels it for both', !bots[B].currentWindow && /cancelled: TradeA closed it/.test(text(B, t)), text(B, t))
    await open()
    t = Date.now()
    await tp(B, [PB[0] + 15, Y, PB[2]])
    const walked = await until(async () => !bots[A].currentWindow && !bots[B].currentWindow, 3000)
    check('walking away cancels it', walked && /cancelled/.test(text(A, t)), text(A, t))
    await tp(B, PB)
    await sleep(5000)
    await open()
    t = Date.now()
    await cmd(`minecraft:damage ${A} 1`)
    const hurt = await until(async () => !bots[A].currentWindow && !bots[B].currentWindow, 3000)
    check('getting hurt cancels it', hurt && /TradeA got hurt/.test(text(B, t)), text(B, t))
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    for (const name of [A, B]) {
      for (const c of CARS) await rcon.cmd(`dgarage take ${name} ${c}`).catch(() => {})
      for (const c of COS) await rcon.cmd(`zzdata ${name} cos::${c} none`).catch(() => {})
      await rcon.cmd(`zzdata ${name} bag-skin none`).catch(() => {})
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
