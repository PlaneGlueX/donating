// Back buttons in every menu (owner, 2026-09-28: "make sure all menus have a back button to their main page";
// phone.sk's "Back buttons"): each phone app's main page has "◀ Phone" however it was opened (here: its command), which
// opens the phone's apps, and the phone's app button opens that page again; each page under a main page has "◀ Back"
// to the page it came from (the car dealer's colors, a car's options, repaint and tuning, a crate's contents from
// /crates and from a stand, the cosmetics pages, the jobs board's swap step, last season's finals, the gun shop's
// tabs, the trade's lists), and it opens that page. Minigames (lock picking, a safe, a drill, a crate's spin) and
// the trade window itself have none, and single-page shops have nothing to go back to.
const { Vec3 } = require('vec3')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'MenuA'
const B = 'MenuB'
const Y = 200
const CHUNKS = '3495 3495 3530 3530'
const PLATFORM = `3495 ${Y - 1} 3495 3530 ${Y - 1} 3530`
const PA = [3510.5, Y, 3510.5]
const PB = [3512.5, Y, 3510.5]
// Mara (a story quest giver) next to A: the jobs board's swap step only shows near her.
const MARA = [3510.5, Y, 3514.5]
// A crate stand block next to A.
const STAND = [3507, Y, 3510]
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  const plates = []
  let mara = ''
  let standPlaced = false
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    // Text of a chat component in NBT form (window titles, item names): the "text" parts in order.
    const nbtText = nbt => {
      const out = []
      const walk = v => {
        if (!v || typeof v !== 'object') return
        if (v.text && v.text.type === 'string') out.push(v.text.value)
        for (const k of Object.keys(v)) if (k !== 'text') walk(v[k])
      }
      walk(nbt)
      return out.join('')
    }
    const title = w => (w ? (typeof w.title === 'string' ? w.title : nbtText(w.title)) : '')
    const comp = (i, type) => (i && i.components ? i.components.find(c => c.type === type) : null)
    const itemName = i => { const c = comp(i, 'custom_name'); return c ? nbtText(c.data) : '' }
    const itemLore = i => { const c = comp(i, 'lore'); return c ? c.data.map(nbtText).join(' / ') : '' }
    const slotOf = (name, n) => { const w = bots[name].currentWindow; return w ? w.slots[n] : null }
    const describe = (name, n) => { const i = slotOf(name, n); return i ? `${i.name} "${itemName(i)}" (${itemLore(i)})` : 'empty' }
    // The standard buttons (phone.sk backItem / phoneBackItem): an arrow named "◀ Back" / "◀ Phone".
    const isBack = (name, n, to) => { const i = slotOf(name, n); return Boolean(i && i.name === 'arrow' && itemName(i) === '◀ Back') }
    // "◀ Phone" by its name only: the GPS's is an app icon (a dye), not an arrow.
    const isPhone = (name, n) => { const i = slotOf(name, n); return Boolean(i && itemName(i) === '◀ Phone') }
    // The phone's home screen (phone.sk openPhone): its title is only the clock, so it's known by the dock's GPS and
    // the home button (Close at 49). An app's slot is found by its name.
    const isHome = w => Boolean(w && w.slots[39] && itemName(w.slots[39]) === 'GPS' && w.slots[49] && itemName(w.slots[49]) === 'Close')
    const appSlot = (w, app) => { if (w) for (let s = 0; s < w.inventoryStart; s++) if (w.slots[s] && itemName(w.slots[s]) === app) return s; return -1 }
    // Every standard button in the open window (slots of the menu only).
    const arrows = name => {
      const w = bots[name].currentWindow
      if (!w) return []
      const out = []
      for (let s = 0; s < w.inventoryStart; s++) if (w.slots[s] && /^◀ /.test(itemName(w.slots[s]))) out.push(s)
      return out
    }
    const windowOpen = bot => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const closeAll = async name => { if (bots[name].currentWindow) { bots[name].closeWindow(bots[name].currentWindow); await sleep(400) } }
    // Runs something that should open a window (a command, a click) and returns that window.
    const opens = async (name, fn) => {
      const o = windowOpen(bots[name])
      await fn()
      const w = await o
      await sleep(400)
      return w
    }
    const chatOpen = async (name, line) => { await closeAll(name); return opens(name, () => bots[name].chat(line)) }
    const click = async (name, n, button = 0) => opens(name, () => { bots[name].clickWindow(n, button, 0).catch(() => {}) })
    // A click that redraws the same window (no new window): waits for the redraw.
    const clickInPlace = async (name, n) => { bots[name].clickWindow(n, 0, 0).catch(() => {}); await sleep(700) }

    // A phone app's main page: "◀ Phone" at slot n opens the phone, and the phone's app (the icon named app) opens the
    // page again, with "◀ Phone" still at n. open: how the page is opened; re: its title.
    const phoneApp = async (label, open, n, app, re) => {
      const w = await open()
      const t1 = title(w)
      const d1 = describe(A, n)
      const had = w && re.test(t1) && isPhone(A, n)
      const pw = had ? await click(A, n) : null
      const s = appSlot(pw, app)
      const back = s >= 0 ? await click(A, s) : null
      const t3 = title(back)
      const again = back && re.test(t3) && isPhone(A, n)
      check(`${label}: "◀ Phone" at slot ${n} opens the phone, and the phone's ${app} app opens it again`, had && isHome(pw) && again, `title="${t1}" ${n}: ${d1} -> home=${isHome(pw)} ${app}@${s} -> "${t3}" ${n}: ${describe(A, n)}`)
      await closeAll(A)
    }
    // A page under another: "◀ Back" at slot n (lore "To <to>.") opens the page it came from (title re).
    const backTo = async (label, w, n, to, re) => {
      const t1 = title(w)
      const d1 = describe(A, n)
      const had = w && isBack(A, n, to)
      const bw = had ? await click(A, n) : null
      const t2 = title(bw)
      check(`${label}: "◀ Back" at slot ${n} goes back to ${to}`, had && re.test(t2), `"${t1}" ${n}: ${d1} -> "${t2}"`)
      return bw
    }

    // ---------- Setup ----------
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    await cmd(`fill 3495 ${Y} 3495 3530 ${Y + 4} 3530 air`)
    await cmd(`setblock ${STAND.join(' ')} ender_chest`)
    await cmd(`dcrate remove ${STAND.join(' ')}`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`dranks give ${name} none`)
      await cmd(`dlevel set ${name} 30`)
      await cmd(`djobs clear ${name}`)
      await cmd(`eco set ${name} 100000`)
      await cmd(`lp user ${name} permission unset donating.store`)
      // Leftover cars from an earlier run.
      for (const m of (await cmd(`dgarage info ${name}`)).matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)) await cmd(`dgarage take ${name} ${m[1]}`)
    }
    await cmd(`dgarage give ${A} sedan Red`)
    const plate = ((await cmd(`dgarage info ${A}`)).match(/([A-Z0-9-]+)=sedan\(/) || [])[1] || ''
    plates.push(plate)
    // Mara's board open (zzclear shuts it): her jobs arrive, and near her the board has "Swap a job".
    await cmd(`zzdata ${A} jobs::mara::unlocked none`)
    mara = ((await cmd(`dquest addat story ${MARA.join(' ')} 180 Safehouse`)).match(/giver (\d+) \(story\) added/) || [])[1] || ''
    // A live season for /lb (seasons.js does the same; it wipes them again after).
    await cmd('zzseasonwipe')
    await cmd('dseason start 28')
    await cmd(`zzheisttp ${A} ${PA.join(' ')}`)
    await cmd(`zzheisttp ${B} ${PB.join(' ')}`)
    await sleep(2500)
    // The crate stand: placed in game (the block A looks at), with donating.store for a moment.
    await cmd(`lp user ${A} permission set donating.store true`)
    await sleep(1500)
    await cmd(`minecraft:tp ${A} ${STAND[0] + 0.5} ${Y} ${STAND[2] + 2.5} 180 20`)
    await sleep(600)
    await bots[A].lookAt(new Vec3(STAND[0] + 0.5, STAND[1] + 0.5, STAND[2] + 0.5), true)
    await sleep(300)
    bots[A].chat('/dcrate place common')
    await sleep(900)
    standPlaced = true
    await cmd(`lp user ${A} permission unset donating.store`)
    await cmd(`minecraft:tp ${A} ${PA.join(' ')} 0 20`)
    await sleep(3500)
    const stands = await cmd('dcrate list')

    // ---------- The phone ----------
    bots[A].setQuickBarSlot(8)
    await sleep(300)
    const pw = await opens(A, () => bots[A]._client.write('block_dig', { status: 6, location: new Vec3(0, 0, 0), face: 0, sequence: 0 }))
    check('F with the phone opens the phone\'s home screen (no back button: it\'s where they lead)', isHome(pw) && arrows(A).length === 0, `"${title(pw)}" home=${isHome(pw)} arrows=${arrows(A)}`)
    await closeAll(A)
    bots[A].setQuickBarSlot(0)

    // ---------- Every phone app's main page: "◀ Phone" ----------
    // The GPS is a phone page (its title ends with "GPS"; a category's with its name): "◀ Phone" at 2.
    await phoneApp('/gps (GPS)', () => chatOpen(A, '/gps'), 2, 'GPS', /GPS$/)
    await phoneApp('/lb (Season, a live season)', () => chatOpen(A, '/lb'), 45, 'Season', /^Season 1 · Top Earners$/)
    await phoneApp('/missions (Missions)', () => chatOpen(A, '/missions'), 27, 'Missions', /^Missions$/)
    // The quest menus (jobs, hits, car contracts) live on the GPS's Quests page (gps.sk gpsCat) since the phone's
    // apps went: "◀ Back" at slot n opens that page (a phone title with "GPS · Quests"), and its entry there (found by
    // its name, right-click) opens the menu again, with "◀ Back" still at n.
    const questBack = async (label, open, n, re, entry) => {
      const w = await open()
      const t1 = title(w)
      const d1 = describe(A, n)
      const had = w && re.test(t1) && isBack(A, n)
      const gw = had ? await click(A, n) : null
      const t2 = title(gw)
      let s = -1
      if (gw) for (let i = 0; i < gw.inventoryStart; i++) if (gw.slots[i] && entry.test(itemName(gw.slots[i]))) { s = i; break }
      const again = s >= 0 ? await click(A, s, 1) : null
      const t3 = title(again)
      check(`${label}: "◀ Back" at slot ${n} opens the GPS's Quests page, and its entry there (right-click) opens it again`, had && /GPS · Quests/.test(t2) && again && re.test(t3) && isBack(A, n), `title="${t1}" ${n}: ${d1} -> "${t2}" -> [${s}] "${t3}" ${n}: ${describe(A, n)}`)
      await closeAll(A)
    }
    await questBack('/jobs (Jobs)', () => chatOpen(A, '/jobs'), 37, /^Jobs$/, /Side jobs/)
    await questBack('/hits (Hit contracts)', () => chatOpen(A, '/hits'), 28, /^Hit contracts$/, /Hit contracts/)
    await questBack('/contracts (Car contracts)', () => chatOpen(A, '/contracts'), 28, /^Car contracts$/, /Car contracts/)
    await phoneApp('/garage (Garage)', () => chatOpen(A, '/garage'), 45, 'Garage', /^Your garage \(1\/\d+\)$/)
    await phoneApp('/cosmetics (Cosmetics)', () => chatOpen(A, '/cosmetics'), 18, 'Cosmetics', /^Your cosmetics$/)
    await phoneApp('/crates (Crates)', () => chatOpen(A, '/crates'), 27, 'Crates', /^Crates$/)
    await phoneApp('/bag (Bag)', () => chatOpen(A, '/bag'), 18, 'Bag', /^Your bag$/)

    // ---------- Pages under them: "◀ Back" ----------
    // The Car Dealer (a shop's main page: no button) -> a model's colors.
    let w = await opens(A, () => cmd(`dshop open ${A} cars`))
    const dealerArrows = arrows(A)
    w = await click(A, 10)
    await backTo('the Car Dealer\'s colors page ("Sedan: pick a color")', /pick a color$/.test(title(w)) && dealerArrows.length === 0 ? w : null, 18, 'all cars', /^Car Dealer$/)
    await closeAll(A)
    // The garage -> a car's options (right-click) -> repaint and tuning.
    w = await chatOpen(A, '/garage')
    w = await click(A, 9, 1)
    const optTitle = title(w)
    w = await backTo('a car\'s options ("Red Sedan")', /^Red Sedan$/.test(optTitle) ? w : null, 18, 'your garage', /^Your garage \(1\/\d+\)$/)
    w = await click(A, 9, 1)
    w = await click(A, 12)
    w = await backTo('the repaint page ("Sedan: repaint")', /^Sedan: repaint$/.test(title(w)) ? w : null, 18, 'your Red Sedan', /^Red Sedan$/)
    w = await click(A, 14)
    await backTo('the tuning page ("Tune: Red Sedan")', /^Tune: Red Sedan$/.test(title(w)) ? w : null, 18, 'your Red Sedan', /^Red Sedan$/)
    await closeAll(A)
    // /crates -> a crate's contents.
    w = await chatOpen(A, '/crates')
    w = await click(A, 10)
    await backTo('a crate\'s contents from /crates', /: what's inside$/.test(title(w)) ? w : null, 45, 'all crates', /^Crates$/)
    await closeAll(A)
    // A crate stand -> its contents (the page a stand starts on): back to /crates too.
    await sleep(400)
    w = await opens(A, async () => { try { await bots[A].activateBlock(bots[A].blockAt(new Vec3(...STAND))) } catch (e) {} })
    await backTo('a crate\'s contents from a crate stand', /^Common Crate: what's inside$/.test(title(w)) && /common at world:3507:200:3510/.test(stands) ? w : null, 45, 'all crates', /^Crates$/)
    await closeAll(A)
    // The cosmetics pages: from /cosmetics, and opened directly by their commands.
    w = await chatOpen(A, '/cosmetics')
    w = await click(A, 11)
    await backTo('your titles (from /cosmetics)', /^Your titles$/.test(title(w)) ? w : null, 45, 'your cosmetics', /^Your cosmetics$/)
    w = await chatOpen(A, '/bagskins')
    await backTo('your bag skins (/bagskins)', /^Your bag skins$/.test(title(w)) ? w : null, 45, 'your cosmetics', /^Your cosmetics$/)
    w = await chatOpen(A, '/killeffects')
    await backTo('your kill effects (/killeffects)', /^Your kill effects$/.test(title(w)) ? w : null, 45, 'your cosmetics', /^Your cosmetics$/)
    await closeAll(A)
    // The jobs board's swap step (near Mara): "◀ Back" ends it, and the board has "◀ Phone" again.
    w = await chatOpen(A, '/jobs')
    const swapBtn = describe(A, 17)
    w = await click(A, 17)
    // The swap step redraws the board (jobs on it, if any, turn into "Swap this one?"); "◀ Back" draws the plain board.
    const inSwap = w && /^Jobs$/.test(title(w)) && /Swap a job/.test(swapBtn)
    const bw = await backTo('the jobs board\'s swap step (near Mara)', inSwap ? w : null, 37, 'your jobs', /^Jobs$/)
    check('...and back on the board: "◀ Back" (to the GPS\'s Quests page) at 37, out of the swap step', bw && isBack(A, 37) && !/Swap this one/.test(JSON.stringify(bw.slots.slice(0, 45).map(itemName))), `swap button: ${swapBtn} | 37: ${describe(A, 37)}`)
    await closeAll(A)

    // ---------- Last season's finals ----------
    // No season running: /lb opens the finals, the Season app's main page then ("◀ Phone").
    await cmd('dseason end')
    await sleep(500)
    await phoneApp('/lb with no season running (Season 1\'s finals)', () => chatOpen(A, '/lb'), 45, 'Season', /^Season 1 \(final\) · Top Earners$/)
    // A new season: the finals are a page under its boards ("Last season" at 47, "◀ Back" to this season's boards).
    await cmd('dseason start 28')
    await sleep(500)
    w = await chatOpen(A, '/lb')
    const last = describe(A, 47)
    w = await click(A, 47)
    await backTo(`last season's finals while Season 2 runs ("Last season" at 47: ${/Last season/.test(last)})`, /^Season 1 \(final\) · Top Earners$/.test(title(w)) ? w : null, 45, 'this season\'s boards', /^Season 2 · Top Earners$/)
    await closeAll(A)

    // ---------- Shops ----------
    // The gun shop: Weapons, Ammo and Items get "◀ Back" (slot 53) to the Loadout tab, the first page; Loadout has none.
    w = await opens(A, () => cmd(`dshop open ${A} gun`))
    const loadoutArrows = arrows(A)
    for (const [tab, slot] of [['Weapons', 47], ['Ammo', 49], ['Items', 51]]) {
      await clickInPlace(A, slot)
      const on = await cmd(`zzshop ${A}`)
      const d = describe(A, 53)
      const had = isBack(A, 53, 'the Loadout tab') && new RegExp(`tab=${tab.toLowerCase()}`).test(on)
      await clickInPlace(A, 53)
      const after = await cmd(`zzshop ${A}`)
      check(`the gun shop's ${tab} tab: "◀ Back" at 53 goes back to the Loadout tab (which has none)`, loadoutArrows.length === 0 && had && /tab=loadout/.test(after) && arrows(A).length === 0 && /Gun Shop/.test(title(bots[A].currentWindow)), `${on} | 53: ${d} -> ${after} arrows=${arrows(A)} loadout=${loadoutArrows}`)
    }
    await closeAll(A)
    // Shops with one page have nothing to go back to.
    const single = []
    for (const kind of ['gear', 'bag', 'tools']) {
      w = await opens(A, () => cmd(`dshop open ${A} ${kind}`))
      single.push(`${kind}:"${title(w)}" arrows=${arrows(A).length}`)
      await closeAll(A)
    }
    check('the gear, bag and tools shops (one page each) have no back button', single.every(s => /arrows=0$/.test(s)) && single.length === 3 && single.every(s => !/:""/.test(s)), single.join(' | '))

    // ---------- Trading: the lists go back to the trade, which goes on ----------
    await closeAll(A)
    await closeAll(B)
    let t = Date.now()
    bots[A].chat(`/trade ${B}`)
    await sleep(700)
    const [ta] = await Promise.all([windowOpen(bots[A]), windowOpen(bots[B]), (async () => bots[B].chat(`/trade ${A}`))()])
    await sleep(400)
    const tradeArrows = ta ? arrows(A) : ['no window']
    w = await click(A, 45)
    await backTo('the trade\'s "Add a car" list', /^Add a car$/.test(title(w)) && tradeArrows.length === 0 ? w : null, 45, 'the trade', /^Trade · MenuB$/)
    w = await click(A, 46)
    await backTo('the trade\'s "Add a cosmetic" list', /^Add a cosmetic$/.test(title(w)) ? w : null, 45, 'the trade', /^Trade · MenuB$/)
    await sleep(600)
    check('going to the lists and back didn\'t end the trade (the trade window has no back button)', /^Trade · MenuB$/.test(title(bots[A].currentWindow)) && /^Trade · MenuA$/.test(title(bots[B].currentWindow)) && !/cancel|ended|closed/i.test(text(A, t) + text(B, t)) && tradeArrows.length === 0, `A="${title(bots[A].currentWindow)}" B="${title(bots[B].currentWindow)}" arrows=${tradeArrows} | ${text(A, t)} | ${text(B, t)}`)
    bots[A].chat('/trade cancel')
    await sleep(600)
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    if (standPlaced) await rcon.cmd(`dcrate remove ${STAND.join(' ')}`).catch(() => {})
    await rcon.cmd(`setblock ${STAND.join(' ')} air`).catch(() => {})
    if (mara) await rcon.cmd(`dquest remove ${mara}`).catch(() => {})
    await rcon.cmd('zzseasonwipe').catch(() => {})
    for (const p of plates) if (p) await rcon.cmd(`zzcardelete ${p}`).catch(() => {})
    for (const name of [A, B]) {
      for (const m of [...((await rcon.cmd(`dgarage info ${name}`).catch(() => '')) || '').matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)]) await rcon.cmd(`dgarage take ${name} ${m[1]}`).catch(() => {})
      await rcon.cmd(`djobs clear ${name}`).catch(() => {})
      await rcon.cmd(`lp user ${name} permission unset donating.store`).catch(() => {})
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
