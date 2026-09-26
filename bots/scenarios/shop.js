// shop.sk: the gun, gear and bag shops. Opened like a Citizens NPC would (console "dshop open") and
// once through a tagged shopkeeper. Money is checked all-or-nothing, confirm clicks, one action per
// click (same-tick double clicks), ammo room, the loadout (move, unequip gives rounds back), Stims,
// save + restore after dying, combat and staff rules, the weapon audit, gear and bags.
const { Vec3 } = require('vec3')
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const NAME = 'ShopBot'
const Y = 200
const PLATFORM = `680 ${Y - 1} 680 690 ${Y - 1} 690`
const CHUNKS = '680 680 690 690'
// Gun shop (6 rows): tabs, hotbar mirror (hotbar 1-5 = 11-15), content cells.
const TAB = { loadout: 45, weapons: 47, ammo: 49, items: 51 }
const HOT = n => 11 + n
const CELL = [19, 20, 21, 22, 23, 24, 25, 28, 29, 30, 31, 32, 33, 34, 37, 38, 39, 40, 41, 42, 43]
const WPN = { Combat_Knife: CELL[0], '50_GS': CELL[1], Uzi: CELL[2], R9_0: CELL[3], AK_47: CELL[4] } // Weapons tab
const AMMO_ROW = { light: 19, shells: 28, rifle: 37 } // +pack = row + 2, +5 packs = row + 3, fill = row + 4

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const CONFIRM = Number(((await rcon.cmd('zzcfg shop::confirm-above')).match(/= (\d+)/) || [])[1]) || 1000
  let bot = null
  try {
    await rcon.cmd(`forceload add ${CHUNKS}`)
    await rcon.cmd(`fill ${PLATFORM} glass`)
    bot = await join(NAME)
    await rcon.cmd(`gamemode survival ${NAME}`)
    await rcon.cmd(`minecraft:tp ${NAME} 685.5 ${Y} 685.5`)
    const reset = async (money = 500) => {
      await rcon.cmd(`zzshopreset ${NAME}`)
      await rcon.cmd(`zzclear ${NAME}`)
      await rcon.cmd(`zzpassive ${NAME} off`)
      await rcon.cmd(`zzcombatend ${NAME}`)
      await rcon.cmd(`lp user ${NAME} permission unset donating.inventory.bypass`)
      await rcon.cmd(`eco set ${NAME} ${money}`)
    }
    await reset()
    const bal = async () => Number(((await rcon.cmd(`zzbal ${NAME}`)).match(/: (-?\d+)/) || [])[1])
    const wm = async () => (await rcon.cmd(`zzwm ${NAME}`)).trim()
    const ammo = async type => Number(((await wm()).match(new RegExp(`ammo ${type}=(\\d+)`)) || [])[1])
    const data = async key => ((await rcon.cmd(`zzdata ${NAME} ${key}`)).match(/= (.*)$/m) || [])[1]
    const shop = async () => (await rcon.cmd(`zzshop ${NAME}`)).trim()
    const dump = async () => (await rcon.cmd(`zzdump ${NAME}`)).trim()
    const open = async (kind = 'gun') => {
      if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); await sleep(400) }
      const opened = new Promise(resolve => {
        const timer = setTimeout(() => resolve(null), 3000)
        bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
      })
      await rcon.cmd(`dshop open ${NAME} ${kind}`)
      const w = await opened
      await sleep(300)
      return w
    }
    // mode 0 = click, 1 = shift-click, 2 = number key (mouse = the key).
    const click = async (slot, mode = 0, mouse = 0) => {
      bot.clickWindow(slot, mouse, mode).catch(() => {})
      await sleep(700)
    }
    // Clicks a tab and waits until the server has drawn it (a busy server can take longer than 700 ms).
    const tab = async name => {
      await click(TAB[name])
      for (let i = 0; i < 20 && !new RegExp(`tab=${name} `).test(await shop()); i++) await sleep(150)
    }
    const at = slot => (bot.currentWindow && bot.currentWindow.slots[slot] ? bot.currentWindow.slots[slot].name : 'empty')
    // Sounds the server plays to the bot: shopFail = entity.villager.no, needsConfirm =
    // block.note_block.pling. Mineflayer's 1.21.11 sound ids are one off (villager.no arrives as
    // villager.hurt, pling as hat), so the checks only match "villager" / "note_block".
    const sounds = []
    const soundName = s => String((s && (s.soundName || s.name)) || s || '')
    bot.on('soundEffectHeard', name => sounds.push({ t: Date.now(), name: soundName(name) }))
    bot.on('hardcodedSoundEffectHeard', id => sounds.push({ t: Date.now(), name: soundName(bot.registry.sounds && bot.registry.sounds[id]) }))
    const heard = t0 => sounds.filter(x => x.t >= t0).map(x => x.name).join(',')

    // ---------- Layout ----------
    let w = await open()
    const layout = [0, 2, 4, 6, 8, 11, 45, 47, 49, 51].map(s => `${s}=${at(s)}`).join(' ')
    check('the gun shop opens with its layout', w && JSON.stringify(w.title).includes('Gun Shop') && layout === '0=gold_ingot 2=writable_book 4=book 6=recovery_compass 8=barrier 11=light_gray_stained_glass_pane 45=chest 47=feather 49=gold_nugget 51=feather', layout)

    // ---------- Buying weapons ----------
    await tab('weapons')
    await click(WPN['50_GS'])
    check('buying the .50 GS ($300): charged, unlocked, in hotbar 1 with an empty magazine', (await bal()) === 200 && (await data('wpn::50_GS')) === 'true' && /(^WM |\| )0=50_GS:0x1/.test(await wm()), `${await bal()}; ${await wm()}`)
    await click(WPN['50_GS'])
    check('buying it again charges nothing', (await bal()) === 200 && /already in hotbar 1/.test(await shop()), await shop())
    let t0 = Date.now()
    await click(WPN.AK_47)
    check('too little money for a $1,000+ buy: refused on the first click with the decline sound (no confirm)', (await bal()) === 200 && /confirm=<none>/.test(await shop()) && /costs \$15,000/.test(await shop()) && at(WPN.AK_47) !== 'lime_concrete' && /villager/.test(heard(t0)) && !/note_block/.test(heard(t0)), `${await shop()}; slot ${at(WPN.AK_47)}; sounds ${heard(t0)}`)
    await click(WPN.AK_47)
    check('too little money: no charge, no unlock, no gun', (await bal()) === 200 && (await data('wpn::AK_47')) !== 'true' && !/AK_47/.test(await wm()) && /costs \$15,000/.test(await shop()), `${await bal()}; ${await shop()}`)
    await rcon.cmd(`eco set ${NAME} 20000`)
    t0 = Date.now()
    await click(WPN.AK_47)
    const confirmItem = bot.currentWindow && bot.currentWindow.slots[WPN.AK_47]
    const confirmName = confirmItem ? JSON.stringify(confirmItem.customName || confirmItem.nbt || confirmItem.components || '') : ''
    const armed = (await bal()) === 20000 && /Click again/.test(await shop()) && at(WPN.AK_47) === 'lime_concrete' && /note_block/.test(heard(t0))
    check('a $1,000+ buy turns its button into a green "Confirm purchase?" block', armed && /Confirm purchase/.test(confirmName), `${at(WPN.AK_47)}; ${confirmName.slice(0, 160)}; ${await shop()}; sounds ${heard(t0)}`)
    await click(WPN.AK_47)
    check('$1,000 or more needs a second click, then it\'s bought', armed && (await bal()) === 5000 && (await data('wpn::AK_47')) === 'true' && /(^WM |\| )1=AK_47:0x1/.test(await wm()) && at(WPN.AK_47) !== 'lime_concrete', `armed ${armed}; ${await bal()}; ${await wm()}; slot ${at(WPN.AK_47)}`)
    await rcon.cmd(`eco set ${NAME} 20000`)
    await click(WPN.Uzi)
    const uziArmed = at(WPN.Uzi)
    await sleep(5500) // the confirm window (5 s) runs out
    const uziAfter = at(WPN.Uzi)
    await click(WPN.Uzi)
    const reArmed = (await bal()) === 20000 && /Click again/.test(await shop())
    await click(WPN.Uzi)
    check('a confirm that ran out turns back into the item and only arms again', uziArmed === 'lime_concrete' && uziAfter !== 'lime_concrete' && reArmed && (await bal()) === 17000, `${uziArmed} -> ${uziAfter}; re-armed ${reArmed}; ${await bal()}`)

    // ---------- Ammo ----------
    await tab('ammo')
    await click(AMMO_ROW.light + 2)
    check('+16 light rounds: $16, in the upper inventory', (await bal()) === 16984 && (await ammo('light')) === 16 && !/(^DUMP |\| )[0-7]=iron nugget/.test(await dump()), `${await bal()}; ${await wm()}`)
    // Same tick: two clicks, one screen, one purchase.
    bot.clickWindow(AMMO_ROW.light + 2, 0, 0).catch(() => {})
    bot.clickWindow(AMMO_ROW.light + 2, 0, 0).catch(() => {})
    await sleep(900)
    check('a same-tick double click buys once', (await ammo('light')) === 32 && (await bal()) === 16968, `${await ammo('light')} rounds; ${await bal()}`)
    await click(AMMO_ROW.light + 2)
    await click(AMMO_ROW.light + 2)
    check('control: two separate clicks buy twice', (await ammo('light')) === 64, `${await ammo('light')} rounds`)
    let before = await bal()
    await click(AMMO_ROW.light + 4)
    check('fill up: exactly to the max (256), paid per round', (await ammo('light')) === 256 && (await bal()) === before - 192, `${await ammo('light')} rounds; ${before} -> ${await bal()}`)
    before = await bal()
    await click(AMMO_ROW.light + 2)
    check('at the max: refused, no charge', (await ammo('light')) === 256 && (await bal()) === before && at(AMMO_ROW.light + 4) === 'barrier', `${await ammo('light')}; ${await bal()}; fill slot ${at(AMMO_ROW.light + 4)}`)
    await rcon.cmd(`zzfill ${NAME} 9 35`)
    await open()
    await tab('ammo')
    before = await bal()
    await click(AMMO_ROW.rifle + 2)
    check('no free ammo slots: refused, no charge', (await ammo('rifle')) === 0 && (await bal()) === before && /No room/.test(await shop()), `${await shop()}; ${await bal()}`)

    // ---------- The loadout ----------
    await rcon.cmd(`zzclear ${NAME}`)
    await rcon.cmd(`wm give ${NAME} 50_GS 1 {slot:0,ammo:5}`)
    await open()
    await tab('loadout')
    await click(CELL[0]) // .50 GS is the first unlocked weapon in catalogue order (no knife yet)
    await click(HOT(2))
    let line = await wm()
    check('select + hotbar 3: the gun moves, keeping its 5 loaded rounds', /(^WM |\| )2=50_GS:5x1/.test(line) && (line.match(/50_GS/g) || []).length === 1, line)
    await click(HOT(2))
    line = await wm()
    check('clicking it again takes it out and gives the 5 rounds back', !/50_GS/.test(line) && (await ammo('light')) === 5, line)
    before = await bal()
    await click(CELL[0])
    await click(HOT(0))
    check('equipping it again is free and empty', /(^WM |\| )0=50_GS:0x1/.test(await wm()) && (await bal()) === before, `${await wm()}; ${before} -> ${await bal()}`)

    // ---------- Stims ----------
    await tab('items')
    // A lower confirm limit for this part: the shift-fill ($400) must ask first, then go through.
    await rcon.cmd('zzcfgset shop::confirm-above 300')
    before = await bal()
    await click(CELL[0]) // $200: under the limit, bought at once
    await click(CELL[0], 1) // shift: 2 more for $400
    const stimArmedBuy = /Click again/.test(await shop()) && (await bal()) === before - 200
    await click(CELL[0], 1)
    await rcon.cmd(`zzcfgset shop::confirm-above ${CONFIRM}`)
    await click(CELL[0])
    line = await wm()
    check('Stims: one stack, up to 3 (a buy over the confirm limit asks, then goes through); the 4th is refused with no charge', stimArmedBuy && /Stim:0x3/.test(line) && (await bal()) === before - 600 && /carry 3/.test(await shop()), `armed ${stimArmedBuy}; ${line}; ${before} -> ${await bal()}; ${await shop()}`)
    const stimSlot = Number((line.match(/(\d+)=Stim/) || [])[1])
    await click(HOT(stimSlot))
    const stimArmed = /Stim/.test(await wm()) && at(HOT(stimSlot)) === 'red_concrete'
    await click(HOT(stimSlot))
    check('throwing Stims away takes two clicks (the first shows a red "Throw away?" block)', stimArmed && !/Stim/.test(await wm()), `${await wm()}; armed ${stimArmed}`)

    // ---------- Save, die, restore ----------
    await rcon.cmd(`zzclear ${NAME}`)
    await rcon.cmd(`wm give ${NAME} AK_47 1 {slot:0,ammo:0}`)
    await rcon.cmd(`wm give ${NAME} Stim 2 {slot:1}`)
    await open()
    await click(2) // save
    check('saving the loadout', (await data('loadout::1')) === 'wpn:AK_47' && (await data('loadout::2')) === 'con:Stim' && (await data('loadout::2::count')) === '2', `${await data('loadout::1')} / ${await data('loadout::2')} x${await data('loadout::2::count')}`)
    bot.closeWindow(bot.currentWindow)
    await rcon.cmd(`minecraft:kill ${NAME}`)
    await sleep(2000)
    check('dying loses them (death.sk)', !/AK_47|Stim/.test(await wm()), await wm())
    await rcon.cmd(`minecraft:tp ${NAME} 685.5 ${Y} 685.5`)
    await rcon.cmd(`eco set ${NAME} 5000`)
    await open()
    await click(6) // restore: 2 Stims $400 + 3 magazines x 30 rifle rounds x $3 = $670
    line = await wm()
    check('restore: AK-47 back in hotbar 1, 2 Stims in hotbar 2, 90 rifle rounds, $670', /(^WM |\| )0=AK_47:0x1/.test(line) && /1=Stim:0x2/.test(line) && (await ammo('rifle')) === 90 && (await bal()) === 4330, `${line}; ${await bal()}`)
    // The saved Stims already carried in another slot: no second stack (only the ammo is bought).
    await rcon.cmd(`zzclear ${NAME}`)
    await rcon.cmd(`wm give ${NAME} AK_47 1 {slot:0,ammo:0}`)
    await rcon.cmd(`wm give ${NAME} Stim 2 {slot:2}`)
    await open()
    before = await bal()
    await click(6)
    line = await wm()
    check('restore with the Stims in another slot: no second stack, only ammo is paid ($270)', (line.match(/Stim/g) || []).length === 1 && /2=Stim:0x2/.test(line) && (await ammo('rifle')) === 90 && (await bal()) === before - 270, `${line}; ${before} -> ${await bal()}`)
    bot.closeWindow(bot.currentWindow)
    await rcon.cmd(`minecraft:kill ${NAME}`)
    await sleep(2000)
    await rcon.cmd(`minecraft:tp ${NAME} 685.5 ${Y} 685.5`)
    await rcon.cmd(`eco set ${NAME} 100`)
    await open()
    await click(6)
    line = await wm()
    check('restore with too little money: weapons only, no charge', /(^WM |\| )0=AK_47:0x1/.test(line) && !/Stim/.test(line) && (await bal()) === 100 && /cost \$670/.test(await shop()), `${line}; ${await bal()}; ${await shop()}`)

    // ---------- Rules ----------
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
    await sleep(500)
    await rcon.cmd(`zztag ${NAME}`)
    let t = Date.now()
    w = await open()
    check('no shopping in combat', !w && messagesSince(bot, t).some(m => /can't shop while in combat/.test(m.text)), messagesSince(bot, t).map(m => m.text).join(' | '))
    await rcon.cmd(`zzcombatend ${NAME}`)
    await rcon.cmd(`zzshieldoff ${NAME}`)
    await sleep(1500)
    w = await open()
    check('control: out of combat it opens', Boolean(w))
    t = Date.now()
    const closed = new Promise(resolve => {
      const timer = setTimeout(() => resolve(false), 3000)
      bot.once('windowClose', () => { clearTimeout(timer); resolve(true) })
    })
    await rcon.cmd(`zztag ${NAME}`)
    await rcon.cmd(`damage ${NAME} 1 minecraft:generic`)
    check('getting hurt in combat closes the shop', (await closed) && messagesSince(bot, t).some(m => /Shop closed: you're in combat/.test(m.text)), messagesSince(bot, t).map(m => m.text).join(' | '))
    await rcon.cmd(`zzcombatend ${NAME}`)
    await sleep(1500)
    await rcon.cmd(`zzpassive ${NAME} on`)
    w = await open()
    check('passive players can shop', Boolean(w))
    await rcon.cmd(`zzpassive ${NAME} off`)

    await tab('weapons')
    await rcon.cmd(`eco set ${NAME} 1000`) // enough for the knife ($150), so a handled click would buy it
    before = await bal()
    const beforeDump = await dump()
    const beforeShop = await shop() // gen= counts handled clicks
    await click(WPN.Combat_Knife, 2, 0) // number key 1 on the knife's buy button
    await click(54 + WPN.Combat_Knife) // the same index in the player's own inventory (window slot 73)
    check('number keys and clicks below the shop do nothing', (await bal()) === before && (await dump()) === beforeDump && (await data('wpn::Combat_Knife')) !== 'true' && (await shop()) === beforeShop, `${await bal()}; ${await dump()}; ${beforeShop} -> ${await shop()}`)
    await rcon.cmd(`lp user ${NAME} permission set donating.inventory.bypass true`)
    let perm = ''
    for (let i = 0; i < 12 && !/: true/.test(perm); i++) { await sleep(500); perm = await rcon.cmd(`zzperm ${NAME} donating.inventory.bypass`) }
    await click(TAB.weapons, 1)
    await click(WPN.AK_47, 0)
    check('staff with the bypass can\'t take shop items either', /: true/.test(perm) && (await dump()) === beforeDump && !bot.currentWindow.selectedItem, `${perm.trim()}; ${await dump()}`)
    await rcon.cmd(`lp user ${NAME} permission unset donating.inventory.bypass`)
    await sleep(1500)

    // ---------- The weapon audit ----------
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
    await rcon.cmd(`wm give ${NAME} R9_0 1 {slot:12}`) // not unlocked, upper inventory
    await rcon.cmd(`wm give ${NAME} AK_47 1 {slot:3}`) // a second AK
    await open()
    line = await wm()
    check('opening a shop removes weapons that shouldn\'t exist (not unlocked, second copy)', !/R9_0/.test(line) && (line.match(/AK_47/g) || []).length === 1 && /(^WM |\| )0=AK_47/.test(line), line)

    // ---------- Gear ----------
    await rcon.cmd(`eco set ${NAME} 10000`)
    const gw = await open('gear')
    check('the gear shop has its title', gw && JSON.stringify(gw.title).includes('Gear Shop'), gw && JSON.stringify(gw.title))
    await click(10)
    let d = await dump()
    check('a Light Helmet goes straight on ($750)', /39=iron helmet x1 \[gear:helmet-1\]/.test(d) && (await bal()) === 9250, `${d}; ${await bal()}`)
    const unbreakable = await rcon.cmd(`data get entity ${NAME} equipment.head.components`)
    check('...and it\'s unbreakable', /unbreakable/.test(unbreakable), unbreakable.slice(0, 200))
    await click(10)
    check('the same helmet again: refused', (await bal()) === 9250, await shop())
    await click(11)
    const gearArmed = (await bal()) === 9250 && /replaces what you wear/.test(await shop())
    await click(11)
    d = await dump()
    check('a better helmet asks first (no refund), then replaces it', gearArmed && /39=diamond helmet x1 \[gear:helmet-2\]/.test(d) && (await bal()) === 6750, `armed ${gearArmed}; ${d}; ${await bal()}`)

    // ---------- Bags ----------
    await rcon.cmd(`zzdata ${NAME} bag-best 2`)
    await rcon.cmd(`zzdata ${NAME} bag-tier none`)
    await rcon.cmd(`eco set ${NAME} 40000`)
    await open('bag')
    await click(12) // tier 2: unlocked, a new one costs $750
    d = await dump()
    check('a lost bag of an unlocked tier costs the replacement price ($750)', /40=leather x1 \[bag:2\]/.test(d) && (await data('bag-tier')) === '2' && (await bal()) === 39250, `${d}; ${await bal()}`)
    await click(13) // tier 3: unlock $30,000, and another bag is carried
    const bagArmed = (await bal()) === 39250
    await click(13)
    check('a new tier unlocks it (asks first: the old bag is thrown away)', bagArmed && /40=leather x1 \[bag:3\]/.test(await dump()) && (await data('bag-best')) === '3' && (await bal()) === 9250, `${await dump()}; best ${await data('bag-best')}; ${await bal()}`)
    await click(13)
    check('the bag you carry: refused', (await bal()) === 9250 && /carrying the Hockey Bag already/.test(await shop()), await shop())

    // ---------- A shopkeeper ----------
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
    await rcon.cmd('summon minecraft:mannequin 687.5 200 685.5 {Tags:["donating_shop","shop_gun","zztest"],Invulnerable:1b,immovable:1b,CustomName:"Gun Shop",CustomNameVisible:1b}')
    await sleep(1000)
    const keeper = Object.values(bot.entities).find(e => e.name === 'mannequin' || (e.displayName || '').toLowerCase() === 'mannequin')
    let kw = null
    if (keeper) {
      await bot.lookAt(keeper.position.offset(0, 1.4, 0), true)
      const opened = new Promise(resolve => {
        const timer = setTimeout(() => resolve(null), 3000)
        bot.once('windowOpen', win => { clearTimeout(timer); resolve(win) })
      })
      bot.activateEntity(keeper)
      kw = await opened
    }
    check('right-clicking a tagged shopkeeper (mannequin) opens its shop', kw && JSON.stringify(kw.title).includes('Gun Shop'), keeper ? (kw ? 'opened' : 'no window') : `no mannequin seen: ${Object.values(bot.entities).map(e => e.name).filter(Boolean).slice(0, 10)}`)
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
    await rcon.cmd('minecraft:kill @e[tag=zztest]')

    // ---------- /dshopkeeper (staff) ----------
    t = Date.now()
    bot.chat('/dshopkeeper add gun')
    await sleep(1000)
    check('/dshopkeeper is staff only', messagesSince(bot, t).some(m => /Staff only|permission/i.test(m.text)), messagesSince(bot, t).map(m => m.text).join(' | '))
    await rcon.cmd(`lp user ${NAME} permission set donating.staff true`)
    for (let i = 0; i < 12 && !/: true/.test(perm = await rcon.cmd(`zzperm ${NAME} donating.staff`)); i++) await sleep(500)
    t = Date.now()
    bot.chat('/dshopkeeper add gun')
    await sleep(1500)
    const added = messagesSince(bot, t).map(m => m.text).join(' | ')
    const id = (added.match(/Shopkeeper (\d+) \(gun\) added/) || [])[1]
    const count = async () => Number(((await rcon.cmd(`execute if entity @e[type=mannequin,tag=shopk_${id}]`)).match(/Count: (\d+)/i) || [0, 0])[1])
    check('staff add a shopkeeper where they stand (a mannequin)', id && (await count()) === 1, `${added}; count ${await count()}`)
    await rcon.cmd(`minecraft:kill @e[tag=shopk_${id}]`)
    await sleep(500)
    const gone = await count()
    let back = 0
    for (let i = 0; i < 36 && back === 0; i++) { await sleep(1000); back = await count() }
    check('a killed shopkeeper comes back within 30 s', gone === 0 && back === 1, `after kill ${gone}, later ${back}`)
    bot.chat(`/dshopkeeper remove ${id}`)
    await sleep(1000)
    check('/dshopkeeper remove takes it away for good', (await count()) === 0, `count ${await count()}`)
    t = Date.now()
    bot.chat('/dshopkeeper add gear')
    await sleep(1500)
    const again = messagesSince(bot, t).map(m => m.text).join(' | ')
    const id2 = (again.match(/Shopkeeper (\d+) \(gear\) added/) || [])[1]
    check('the next shopkeeper gets the removed one\'s number again', id2 === id, `first ${id}, next ${id2}; ${again}`)
    if (id2) { bot.chat(`/dshopkeeper remove ${id2}`); await sleep(1000) }
    await rcon.cmd(`lp user ${NAME} permission unset donating.staff`)
  } finally {
    await rcon.cmd(`lp user ${NAME} permission unset donating.inventory.bypass`).catch(() => {})
    await rcon.cmd('minecraft:kill @e[tag=zztest]').catch(() => {})
    await rcon.cmd(`zzshopreset ${NAME}`).catch(() => {})
    await rcon.cmd(`zzclear ${NAME}`).catch(() => {})
    await rcon.cmd(`zzcombatend ${NAME}`).catch(() => {})
    await rcon.cmd(`zzpassive ${NAME} off`).catch(() => {})
    await rcon.cmd(`minecraft:tp ${NAME} 0.5 68 -656.5`).catch(() => {})
    if (bot) await quit(bot)
    await rcon.cmd(`fill ${PLATFORM} air replace glass`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
