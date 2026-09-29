// phone.sk + pvp.sk: F (swap-hand key) with the phone opens the home screen (6 rows drawn as a phone, ui.sk; the
// apps are one dye, told apart by their names); right-click toggles the big map instead (phone-map.js checks the
// map itself). Nothing in the menu can be taken (not even with the inventory bypass), your head shows the player's
// numbers, the passive switch follows pvp.sk's rules (switch cooldown, no going passive with a bounty), and
// right-clicking an entity or a block
// with the phone behaves (entities keep working; a usable block isn't used and doesn't toggle the map, a quiet
// hint says to put the phone away).
// Runs on its own glass platform in the sky and removes everything it placed.
const { Vec3 } = require('vec3')
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const NAME = 'PhoneBot'
const PHONE_SLOT = 89 // hotbar 9 in a 6-row chest window (0-53 menu, 54-80 upper inventory, 81-89 hotbar)
// The home screen's apps (phone.sk openPhone).
const APPS = { 2: 'Crates', 3: 'Cosmetics', 4: 'Season', 5: 'Bounties', 11: 'Passive: off', 12: 'How to play', 38: 'Messages', 39: 'GPS', 40: 'Missions', 41: 'Garage', 42: 'Bag', 49: 'Close' }
const STATS = 6 // your head
const PASSIVE = 11
const Y = 200
const PLATFORM = `520 ${Y - 1} 520 528 ${Y - 1} 528`
const CHUNKS = '520 520 528 528'
const LEVER = { x: 524, y: Y, z: 522 }

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  let bot = null
  try {
    await rcon.cmd(`forceload add ${CHUNKS}`)
    await rcon.cmd(`fill ${PLATFORM} glass`)
    bot = await join(NAME)
    const ChatMessage = require('prismarine-chat')(bot.registry)
    const dump = async () => (await rcon.cmd(`zzdump ${NAME}`)).trim()
    const data = async key => ((await rcon.cmd(`zzdata ${NAME} ${key}`)).match(/= (.*)$/m) || [])[1]
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const loreText = item => ((item && item.customLore) || []).map(l => ChatMessage.fromNotch(l).toString()).join(' / ')
    // Item names from the NBT components (the apps are all the same dye).
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
    const itemName = i => { const c = i && i.components ? i.components.find(x => x.type === 'custom_name') : null; return c ? nbtText(c.data) : '' }
    const nameAt = (win, n) => (win && win.slots[n] ? itemName(win.slots[n]) : '')
    // The home screen: GPS in the dock and the home button (Close) at 49 (its title is only the clock).
    const isHome = win => Boolean(win && nameAt(win, 39) === 'GPS' && nameAt(win, 49) === 'Close')

    // F key (swap hands): the player-action packet a real client sends.
    const pressF = () => bot._client.write('block_dig', { status: 6, location: new Vec3(0, 0, 0), face: 0, sequence: 0 })
    const phone = async () => (await rcon.cmd(`zzphone ${NAME}`)).trim()
    // Presses F with the phone (or does something else with it) and resolves with the menu window, or null.
    const openMenu = async (how = pressF, waitMs = 3000) => {
      bot.setQuickBarSlot(8)
      await sleep(300)
      const opened = new Promise(resolve => {
        const timer = setTimeout(() => resolve(null), waitMs)
        bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
      })
      await how()
      const w = await opened
      await sleep(300)
      return w
    }
    const closed = () => new Promise(resolve => {
      const timer = setTimeout(() => resolve(false), 3000)
      bot.once('windowClose', () => { clearTimeout(timer); resolve(true) })
    })
    const click = async (slot, mouse, mode) => {
      try { await bot.clickWindow(slot, mouse, mode) } catch (err) { /* the server refuses; checked below */ }
      await sleep(700)
    }

    await sleep(1000)
    await rcon.cmd(`gamemode survival ${NAME}`)
    await rcon.cmd(`minecraft:tp ${NAME} 522.5 ${Y} 522.5 0 0`)
    await rcon.cmd(`lp user ${NAME} permission unset donating.inventory.bypass`)
    await rcon.cmd(`zzclear ${NAME}`)
    await rcon.cmd(`zzpassive ${NAME} off`)
    await rcon.cmd(`zzdata ${NAME} passive-switched none`)
    await rcon.cmd(`zzdata ${NAME} bounty none`)
    await sleep(1000)

    // ---------- The item ----------
    // The pack's filled_map.json draws a map whose first custom_model_data string is this as a phone.
    const cmd = await rcon.cmd(`data get entity ${NAME} Inventory[{Slot:8b}].components."minecraft:custom_model_data"`)
    check('the phone carries the pack\'s phone model tag (a phone icon in the inventory)', /strings: \["donating:phone"\]/.test(cmd), cmd.trim())

    // ---------- Opening and contents ----------
    let w = await openMenu(() => bot.activateItem(), 1500)
    check('right-clicking the phone opens no menu', !w, w ? JSON.stringify(w.title).slice(0, 80) : 'no window')
    check('...it opens the big map instead', / open=true/.test(await phone()), await phone())
    if (w) bot.closeWindow(w)
    w = await openMenu()
    check('F with the phone opens the home screen', isHome(w), w ? `${nameAt(w, 39)} ${nameAt(w, 49)}` : 'no window')
    check('...and closes the big map', / open=false/.test(await phone()), await phone())
    if (!w) return
    const layout = Object.keys(APPS).map(s => `${s}=${nameAt(w, Number(s))}`).join(' ')
    const want = Object.entries(APPS).map(([s, n]) => `${s}=${n}`).join(' ')
    check('the apps are in place (Crates, Cosmetics, Season, Bounties, you; Passive, How to play; the dock: Messages, GPS, Missions, Garage, Bag; Close)', layout === want && w.slots[STATS] && w.slots[STATS].name === 'player_head' && nameAt(w, STATS) === NAME, `${layout} | ${STATS}=${w.slots[STATS] && w.slots[STATS].name} "${nameAt(w, STATS)}"`)
    const gone = w.slots.slice(0, 54).map(itemName).filter(n => /Contracts|Jobs|Hits/.test(n))
    check('...and no Contracts, Jobs or Hits apps (they\'re on the GPS\'s Quests page)', gone.length === 0, gone.join(', '))
    const stats = loreText(w.slots[STATS])
    check('your head shows the real numbers', /Balance: \$[\d,]+/.test(stats) && /Bounty: \$0/.test(stats) && /Bag: none \(hands: \$1,000\)/.test(stats) && /Level: /.test(stats), stats)

    // ---------- Nothing can be taken ----------
    const before = await dump()
    const menuBefore = JSON.stringify(w.slots.slice(0, 54).map(i => i && i.name))
    const unchanged = async label => {
      const after = await dump()
      const menuNow = JSON.stringify((bot.currentWindow ? bot.currentWindow.slots : []).slice(0, 54).map(i => i && i.name))
      check(label, after === before && menuNow === menuBefore, after === before ? `menu ${menuNow}` : after)
    }
    await click(STATS, 0, 0)
    await unchanged('clicking your head takes nothing')
    await click(0, 0, 0)
    await unchanged('clicking an empty slot takes nothing')
    await click(STATS, 0, 1)
    await unchanged('shift-clicking your head takes nothing')
    await click(PHONE_SLOT, 0, 1)
    await unchanged('shift-clicking the phone into the menu moves nothing')
    await click(STATS, 1, 2) // on your head: a button would run and close the menu
    await unchanged('number key on your head moves nothing')
    await rcon.cmd(`lp user ${NAME} permission set donating.inventory.bypass true`)
    let perm = ''
    for (let i = 0; i < 10 && !/: true/.test(perm); i++) {
      await sleep(500)
      perm = await rcon.cmd(`zzperm ${NAME} donating.inventory.bypass`)
    }
    check('bypass is active for the next checks', /: true/.test(perm), perm.trim())
    await click(STATS, 0, 0)
    await unchanged('with the inventory bypass, clicking still takes nothing')
    await click(STATS, 0, 1)
    await unchanged('with the inventory bypass, shift-clicking still takes nothing')
    await click(PHONE_SLOT, 0, 1)
    await unchanged('with the inventory bypass, shift-clicking the phone into the menu still moves nothing')
    await rcon.cmd(`lp user ${NAME} permission unset donating.inventory.bypass`)
    await sleep(1500)

    // ---------- Apps ----------
    let t = Date.now()
    const garageOpen = new Promise(resolve => { const timer = setTimeout(() => resolve(null), 3000); bot.once('windowOpen', w2 => { clearTimeout(timer); resolve(w2) }) })
    await click(41, 0, 0)
    const gw = await garageOpen
    check('the Garage app opens your garage (garage.sk)', gw && /Your garage/.test(JSON.stringify(gw.title)), JSON.stringify(gw && gw.title))
    if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); await sleep(300) }
    w = await openMenu()
    const gpsOpen = new Promise(resolve => { const timer = setTimeout(() => resolve(null), 3000); bot.once('windowOpen', w2 => { clearTimeout(timer); resolve(w2) }) })
    await click(39, 0, 0)
    const gpw = await gpsOpen
    check('the GPS app opens the GPS (gps.sk: Quests, Heists, Shops, Places)', gpw && ['Quests', 'Heists', 'Shops', 'Places'].every((n, k) => nameAt(gpw, 11 + k) === n), gpw ? [11, 12, 13, 14].map(n => nameAt(gpw, n)).join(',') : 'no window')
    if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); await sleep(300) }
    let closing
    w = await openMenu()
    t = Date.now()
    closing = closed()
    await click(5, 0, 0)
    check('the Bounties app closes the menu and lists bounties', (await closing) && /Bounties \(players online\)/.test(text(t)) && /Place one: \/bounty/.test(text(t)), text(t))

    // ---------- Passive switch ----------
    w = await openMenu()
    t = Date.now()
    closing = closed()
    // Two clicks in a row (spam): only the first may run.
    bot.clickWindow(PASSIVE, 0, 0).catch(() => {})
    bot.clickWindow(PASSIVE, 0, 0).catch(() => {})
    check('passive switch closes the menu', await closing)
    await sleep(800)
    check('passive switch turns passive on and says so', (await data('passive')) === 'true' && /Passive mode on/.test(text(t)), `${await data('passive')} | ${text(t)}`)
    check('a double click runs the switch once', !/switch passive mode again/.test(text(t)), text(t))

    w = await openMenu()
    check('the home screen shows passive as on', nameAt(w, PASSIVE) === 'Passive: on', w ? nameAt(w, PASSIVE) : 'no window')
    t = Date.now()
    await click(PASSIVE, 0, 0)
    await sleep(500)
    check('switching again right away is refused (cooldown)', (await data('passive')) === 'true' && /switch passive mode again in 10 minutes/.test(text(t)), `${await data('passive')} | ${text(t)}`)

    await rcon.cmd(`zzpassive ${NAME} off`)
    await rcon.cmd(`zzdata ${NAME} passive-switched none`)
    await rcon.cmd(`zzdata ${NAME} bounty 500`)
    w = await openMenu()
    const statsBounty = loreText(w && w.slots[STATS])
    const bountyApp = loreText(w && w.slots[5])
    check('your head shows the new bounty, the Bounties app yours, the switch "Passive: off"', /Bounty: \$500/.test(statsBounty) && /Yours: \$500/.test(bountyApp) && nameAt(w, PASSIVE) === 'Passive: off', `${statsBounty} | ${bountyApp} | ${nameAt(w, PASSIVE)}`)
    t = Date.now()
    await click(PASSIVE, 0, 0)
    await sleep(500)
    check('no going passive with a bounty', (await data('passive')) !== 'true' && /can't go passive while you have a bounty/.test(text(t)), `${await data('passive')} | ${text(t)}`)
    await rcon.cmd(`zzdata ${NAME} bounty none`)

    // ---------- Help and close ----------
    w = await openMenu()
    t = Date.now()
    closing = closed()
    await click(12, 0, 0)
    check('How to play closes the menu and shows the help page', (await closing) && /How to play/.test(text(t)), text(t))
    w = await openMenu()
    closing = closed()
    await click(49, 0, 0)
    check('the home button closes the menu', await closing)

    // ---------- Right-clicking entities and blocks with the phone ----------
    await rcon.cmd(`summon armor_stand 522.5 ${Y} 524.5 {Tags:["zztest"]}`)
    await rcon.cmd(`summon villager 524.5 ${Y} 524.5 {Tags:["zztest"],NoAI:1b}`)
    await sleep(1000)
    for (const kind of ['armor_stand', 'villager']) {
      const e = Object.values(bot.entities).filter(x => x.name === kind).sort((x, y) => y.id - x.id)[0]
      if (!e) {
        check(`right-clicking a ${kind} with the phone opens no menu`, false, 'entity not visible to the bot')
        continue
      }
      await bot.lookAt(e.position.offset(0, 1, 0), true)
      w = await openMenu(() => bot.activateEntity(e), 1500)
      check(`right-clicking a ${kind} with the phone opens no menu or map`, !isHome(w) && / open=false/.test(await phone()), w ? JSON.stringify(w.title).slice(0, 80) : await phone())
      if (w) bot.closeWindow(w)
    }
    await rcon.cmd('minecraft:kill @e[tag=zztest]')

    await rcon.cmd(`setblock ${LEVER.x} ${LEVER.y} ${LEVER.z} lever[face=floor]`)
    await sleep(500)
    let tl = Date.now()
    w = await openMenu(async () => {
      await bot.activateBlock(bot.blockAt(new Vec3(LEVER.x, LEVER.y, LEVER.z)))
      // A real client also sends a use-item click after a block click that did nothing.
      await sleep(100)
      bot.activateItem()
    }, 1500)
    await sleep(800)
    const lever = await rcon.cmd(`execute if block ${LEVER.x} ${LEVER.y} ${LEVER.z} lever[powered=false]`)
    // Owner, 2026-09-27: no block use with the phone out; the map stays shut and a quiet hint says why.
    check('right-clicking a lever with the phone opens no map (block + air click) and quietly says to put the phone away', !w && / open=false/.test(await phone()) && /Put your phone away to use that/.test(text(tl)), `window ${Boolean(w)}, ${await phone()} | ${text(tl)}`)
    check('...and does not flip the lever', /passed/i.test(lever), lever)
    if (w) bot.closeWindow(w)
    await sleep(600)
    bot.activateItem()
    await sleep(600)
    check('a plain right-click in the air opens the map', / open=true/.test(await phone()), await phone())
    bot.activateItem()
    await sleep(600)
    check('right-clicking again closes the map', / open=false/.test(await phone()), await phone())
    // Holding the button: the client repeats the click every 4 ticks (0.2 s).
    await sleep(600)
    // Checked after every repeat: the old debounce opened, closed and opened again (0, 0.4, 0.8 s).
    const during = []
    for (let i = 0; i < 6; i++) {
      bot.activateItem()
      await sleep(100)
      during.push(/ open=true/.test(await phone()))
      await sleep(100)
    }
    check('holding right-click opens the map once (no flicker)', during.every(Boolean), `open after each repeat: ${during}`)
    await sleep(400)
    bot.activateItem()
    await sleep(500)
    check('...and a new click after letting go closes it', / open=false/.test(await phone()), await phone())
    // Getting hurt closes the big map (the camera is tilted and the bag is off while it's open).
    await sleep(600)
    bot.activateItem()
    await sleep(600)
    const openBefore = / open=true/.test(await phone())
    t = Date.now()
    await rcon.cmd(`minecraft:damage ${NAME} 1 minecraft:generic`)
    await sleep(600)
    check('a hit closes the big map and says so', openBefore && / open=false/.test(await phone()) && /Hit: your map closed/.test(text(t)), `${openBefore} ${await phone()} | ${text(t)}`)
  } finally {
    await rcon.cmd(`lp user ${NAME} permission unset donating.inventory.bypass`).catch(() => {})
    await rcon.cmd(`zzpassive ${NAME} off`).catch(() => {})
    await rcon.cmd(`zzdata ${NAME} passive-switched none`).catch(() => {})
    await rcon.cmd(`zzdata ${NAME} bounty none`).catch(() => {})
    await rcon.cmd('minecraft:kill @e[tag=zztest]').catch(() => {})
    await rcon.cmd(`setblock ${LEVER.x} ${LEVER.y} ${LEVER.z} air`).catch(() => {})
    await rcon.cmd(`minecraft:tp ${NAME} 0.5 68 -656.5`).catch(() => {}) // solid ground near spawn
    if (bot) await quit(bot)
    await rcon.cmd(`fill ${PLATFORM} air replace glass`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
