// DonatingPhone's BagHide (2026-10-12; gunfx.bag-hide lookalike): while a gun reloads, its holder alone is sent a copy
// of their offhand bag (or cash in hand) whose item_model draws nothing in first person, so the gun frames' gloved left
// hand has room; about 3 ticks before the reload ends a "shown" copy (the swap animation slides it back up), then the
// real item. The server's inventory never changes and other players see nothing. Bots speak 1.21.11 (through
// ViaBackwards) and can't see 26.x item models, so this checks the packets and the server state: every packet that
// sets the holder's own offhand (equipment for their own entity, set_slot 45 and window_items of window 0,
// set_player_inventory 40) and the watcher's equipment packets for the holder.
const { Vec3 } = require('vec3')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const NAME = 'BagBot'
const OTHER = 'BagWatch'
const X = 7760; const Y = 160; const Z = 7760
const CHUNKS = `${X - 8} ${Z - 8} ${X + 8} ${Z + 8}`

// What an offhand item packet carries: the look-alikes by their item_model, anything else is the real item.
const kind = item => {
  if (!item || !item.itemCount) return 'empty'
  const s = JSON.stringify(item)
  if (/donating:(bag|cash)_hidden/.test(s)) return 'hidden'
  if (/donating:(bag|cash)_shown/.test(s)) return 'shown'
  return 'real'
}

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  let bot = null
  let other = null
  const views = [] // the holder's own offhand as their client is told: { t, src, k, raw }
  const seen = [] // the watcher's equipment packets for the holder's offhand: { t, k }
  const since = t => views.filter(v => v.t >= t)
  // Consecutive duplicates folded: the sequence of looks the client was told.
  const looks = t => since(t).map(v => v.k).filter((k, i, a) => i === 0 || a[i - 1] !== k)
  const status = async () => {
    const s = await rcon.cmd('dphone gunfx')
    const m = s.match(/bag-hide=(\w+) hidden=(\d+) hides=(\d+)/)
    return m ? { mode: m[1], hidden: Number(m[2]), hides: Number(m[3]), raw: s } : { raw: s.slice(0, 300) }
  }
  const ammo = async slot => {
    const out = await rcon.cmd(`data get entity ${NAME} Inventory[{Slot:${slot}b}].components."minecraft:custom_data".PublicBukkitValues."weaponmechanics:ammo-left"`)
    const m = out.match(/data: (-?\d+)/)
    return m ? Number(m[1]) : -1
  }
  const dump = async () => (await rcon.cmd(`zzdump ${NAME}`)).trim()
  const offhandOf = d => (d.match(/(?:^|\| )40=([^|]*)/) || [])[1] || 'none'
  const dig = status => bot._client.write('block_dig', { status, location: new Vec3(0, 0, 0), face: 0, sequence: 0 })
  const give = async (w, slot, rounds) => {
    await rcon.cmd(`wm give ${NAME} ${w} 1 {slot:${slot},ammo:${rounds}}`)
    bot.setQuickBarSlot(slot)
    await sleep(1800) // the equip delay and the draw clock
  }
  const bag = async tier => {
    await rcon.cmd(`zzdata ${NAME} bag-tier ${tier}`)
    return rcon.cmd(`zzbagapply ${NAME}`)
  }
  try {
    await rcon.cmd(`forceload add ${CHUNKS}`)
    await rcon.cmd(`fill ${X - 4} ${Y - 1} ${Z - 4} ${X + 4} ${Y - 1} ${Z + 4} glass`)
    bot = await join(NAME, { pack: 'loaded' }) // the look-alike only goes to players whose pack loaded
    other = await join(OTHER)
    const self = () => bot.entity.id
    bot._client.on('entity_equipment', p => {
      if (p.entityId !== self()) return
      for (const e of p.equipments) if (e.slot === 1) views.push({ t: Date.now(), src: 'equipment', k: kind(e.item), raw: e.item })
    })
    bot._client.on('set_slot', p => { if (p.windowId === 0 && p.slot === 45) views.push({ t: Date.now(), src: 'set_slot', k: kind(p.item), raw: p.item }) })
    bot._client.on('window_items', p => { if (p.windowId === 0 && p.items && p.items.length > 45) views.push({ t: Date.now(), src: 'window_items', k: kind(p.items[45]), raw: p.items[45] }) })
    bot._client.on('set_player_inventory', p => { if (p.slotId === 40) views.push({ t: Date.now(), src: 'set_player_inventory', k: kind(p.contents), raw: p.contents }) })
    other._client.on('entity_equipment', p => {
      const e = other.players[NAME] && other.players[NAME].entity
      if (!e || p.entityId !== e.id) return
      for (const q of p.equipments) if (q.slot === 1) seen.push({ t: Date.now(), k: kind(q.item) })
    })
    await sleep(1000)
    for (const n of [NAME, OTHER]) {
      await rcon.cmd(`zzclear ${n}`)
      await rcon.cmd(`gamemode survival ${n}`)
    }
    await rcon.cmd(`zzheisttp ${NAME} ${X + 0.5} ${Y} ${Z + 0.5}`)
    await rcon.cmd(`zzheisttp ${OTHER} ${X + 0.5} ${Y} ${Z + 3.5}`)
    await sleep(1500)
    await bot.look(0, Math.PI / 4, true)

    const st0 = await status()
    check('/dphone gunfx: bag-hide is lookalike (the default), nothing hidden', st0.mode === 'lookalike' && st0.hidden === 0, st0.raw)

    // A magazine reload with the bag in the offhand: the AK-48 with 5 rounds left reloads over 57 ticks.
    const applied = await bag(1)
    await give('AK_47', 0, 5)
    await rcon.cmd(`zzammo ${NAME} rifle 64`)
    await sleep(300)
    const before = await dump()
    let t = Date.now()
    dig(4) // Q
    await sleep(500)
    const st1 = await status()
    const during = await dump()
    const watcherDuring = seen.filter(s => s.t >= t)
    check('a reload hides the bag for its holder: their client is sent the look-alike (equipment for their own entity, item_model donating:bag_hidden)',
      /bag:1/.test(applied) && st1.hidden === 1 && st1.hides === st0.hides + 1 && looks(t)[0] === 'hidden' && since(t)[0].src === 'equipment',
      `${applied.trim()}; ${st1.raw.slice(0, 200)}; ${JSON.stringify(since(t).map(v => [v.src, v.k, v.t - t]))}`)
    check('...the server\'s inventory doesn\'t change (the offhand still the real bag, every slot the same)',
      during === before && /leather/.test(offhandOf(during)), `before ${before}\nduring ${during}`)
    check('...and the other player sees nothing different (no offhand change for the holder)', watcherDuring.length === 0, JSON.stringify(watcherDuring))

    await sleep(3300) // to the reload's end (2.85 s) and the real item 8 ticks after the shown copy
    const st2 = await status()
    const tl = since(t)
    const shown = tl.find(v => v.k === 'shown')
    const real = tl.find(v => v.k === 'real' && shown && v.t >= shown.t)
    check('the bag comes back near the reload\'s end: the shown copy (the slide up) about 3 ticks before it, then the real item about 8 ticks later',
      JSON.stringify(looks(t)) === '["hidden","shown","real"]' && !!shown && shown.t - t >= 2300 && shown.t - t <= 3100 && !!real && real.t - shown.t >= 300 && real.t - shown.t <= 700 && st2.hidden === 0,
      `${JSON.stringify(tl.map(v => [v.src, v.k, v.t - t]))}; ${st2.raw.slice(0, 200)}`)
    const after = await dump()
    check('...the reload filled the magazine, the offhand is still the same bag, and the other player never saw a look-alike',
      (await ammo(0)) === 30 && offhandOf(after) === offhandOf(before) && !seen.some(s => s.k === 'hidden' || s.k === 'shown'),
      `ammo ${await ammo(0)}; offhand ${offhandOf(after)}; watcher ${JSON.stringify(seen.filter(s => s.t >= t))}`)

    // A slot change mid-reload: the real item at once, no slide.
    await give('AK_47', 0, 5)
    dig(4)
    await sleep(500)
    const hidSw = looks(Date.now() - 500)
    t = Date.now()
    bot.setQuickBarSlot(2)
    await sleep(400)
    const st3 = await status()
    check('switching slots mid-reload brings the real bag back at once (no shown copy), nothing left hidden',
      hidSw[0] === 'hidden' && looks(t).filter(k => k !== 'hidden').join() === 'real' && looks(t).slice(-1)[0] === 'real' && st3.hidden === 0, // (a hide already in flight may land first)
      `before ${JSON.stringify(hidSw)}; after ${JSON.stringify(since(t).map(v => [v.src, v.k, v.t - t]))}; ${st3.raw.slice(0, 200)}`)

    // Mid-reload resyncs of the real bag: bag.sk redrawing its fill (loot added) sends the real item again, and so may a
    // menu opening (one that leaves the weapons alone: the gun shop's audit rewrites the gun, which ends the reload);
    // each is hidden again at the tick's end. Closing the menu mustn't leave the real bag showing either.
    await rcon.cmd(`zzammo ${NAME} rifle 64`)
    await give('AK_47', 0, 5)
    dig(4)
    await sleep(400)
    t = Date.now()
    await rcon.cmd(`zzbagadd ${NAME} bagtest#2 300`)
    await sleep(400)
    const fill = since(t)
    const st4 = await status()
    check('loot added mid-reload (the bag\'s fill redrawn, the real item resent): hidden again at once',
      fill.some(v => v.k === 'real') && fill[fill.length - 1].k === 'hidden' && st4.hidden === 1,
      `${JSON.stringify(fill.map(v => [v.src, v.k, v.t - t]))}; ${st4.raw.slice(0, 200)}`)
    // A cancelled click in the player's own inventory (inventory.sk cancels them all): Paper sends the whole inventory
    // back, the real offhand too, without changing it.
    t = Date.now()
    await bot.clickWindow(20, 0, 0).catch(() => {}) // an ammo row (a click on the gun's own slot ends the reload)
    await sleep(300)
    const clicked = since(t)
    check('a cancelled click in their own inventory mid-reload (Paper resends the real offhand): hidden again by the tick\'s end',
      clicked.length > 0 && clicked[clicked.length - 1].k === 'hidden' && (await status()).hidden === 1,
      JSON.stringify(clicked.map(v => [v.src, v.k, v.t - t])))
    t = Date.now()
    bot.chat('/crates')
    await sleep(500)
    const openLooks = since(t)
    const st5 = await status()
    check('a menu opening mid-reload (/crates): the bag stays hidden (the last offhand the client was told is the look-alike)',
      !!bot.currentWindow && (openLooks.length === 0 || openLooks[openLooks.length - 1].k === 'hidden') && st5.hidden === 1,
      `window ${!!bot.currentWindow}; ${JSON.stringify(openLooks.map(v => [v.src, v.k, v.t - t]))}; ${st5.raw.slice(0, 200)}`)
    t = Date.now()
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
    await sleep(400)
    const closeLooks = since(t)
    const st6 = await status()
    check('...and closing it mid-reload: still hidden', (closeLooks.length === 0 || closeLooks[closeLooks.length - 1].k === 'hidden') && st6.hidden === 1,
      `${JSON.stringify(closeLooks.map(v => [v.src, v.k, v.t - t]))}; ${st6.raw.slice(0, 200)}`)
    await sleep(1900)
    check('...then back at the reload\'s end', since(t).some(v => v.k === 'real') && (await status()).hidden === 0 && (await ammo(0)) === 30,
      `${JSON.stringify(since(t).map(v => [v.src, v.k, v.t - t]))}; ammo ${await ammo(0)}`)
    await rcon.cmd(`zzbagclear ${NAME}`)

    // The Shotgun: WeaponMechanics loads every shell in one 4-tick reload (ammo-per-reload -1 with item ammo), so with
    // rounds left the bag stays (it would only bob); from empty the pump opens first and the reload is long enough.
    await give('R9_0', 1, 2)
    await rcon.cmd(`zzammo ${NAME} shells 20`)
    await sleep(300)
    let sh0 = await status()
    t = Date.now()
    dig(4)
    await sleep(700)
    check('the Shotgun with rounds left (all its shells in 4 ticks): the bag stays, nothing hidden',
      (await ammo(1)) === 14 && (await status()).hides === sh0.hides && !since(t).some(v => v.k === 'hidden'),
      `ammo ${await ammo(1)}; hides ${sh0.hides} -> ${(await status()).hides}; ${JSON.stringify(since(t).map(v => [v.src, v.k, v.t - t]))}`)
    await give('R9_0', 1, 0)
    await rcon.cmd(`zzammo ${NAME} shells 20`)
    sh0 = await status()
    t = Date.now()
    dig(4)
    await sleep(1600)
    check('...from empty (the pump opens and closes around it, about 18 ticks): hidden, then shown and the real bag at the end',
      // (the real offhand may be resent in the tick the reload starts, before the hide: from the first hidden on)
      (await ammo(1)) === 14 && (await status()).hides === sh0.hides + 1 && looks(t).indexOf('hidden') <= 1 && JSON.stringify(looks(t).slice(looks(t).indexOf('hidden'))) === '["hidden","shown","real"]' && (await status()).hidden === 0,
      `ammo ${await ammo(1)}; ${JSON.stringify(since(t).map(v => [v.src, v.k, v.t - t]))}`)

    // No spare rounds: WeaponMechanics refuses the reload, so nothing is hidden.
    await rcon.cmd(`zzclear ${NAME}`)
    await bag(1)
    await give('AK_47', 0, 5)
    const st8 = await status()
    t = Date.now()
    dig(4)
    await sleep(600)
    const st9 = await status()
    check('Q with no spare rounds hides nothing (no reload)', st9.hides === st8.hides && !since(t).some(v => v.k === 'hidden'), `${st8.hides} -> ${st9.hides}; ${JSON.stringify(since(t).map(v => [v.src, v.k]))}`)

    // Cash in hand (no bag, loot in the hands): the same with the cash look-alike.
    await bag('none')
    await rcon.cmd(`zzbagadd ${NAME} bagtest#1 500`)
    await sleep(300)
    const hands = (await rcon.cmd(`zzoffhand ${NAME}`)).trim()
    await rcon.cmd(`zzammo ${NAME} rifle 64`)
    await give('AK_47', 0, 5)
    t = Date.now()
    dig(4)
    await sleep(500)
    const cashHidden = since(t).find(v => v.k === 'hidden')
    const offCash = offhandOf(await dump())
    await sleep(3300)
    check('cash in hand hides the same way (donating:cash_hidden), the server\'s offhand still paper, back at the end',
      /Cash in hand/.test(hands) && !!cashHidden && /cash_hidden/.test(JSON.stringify(cashHidden.raw)) && /paper/.test(offCash) && JSON.stringify(looks(t)) === '["hidden","shown","real"]',
      `${hands}; ${offCash}; ${JSON.stringify(since(t).map(v => [v.src, v.k, v.t - t]))}`)
    // A player whose pack didn't load (the watcher declined it) gets no look-alike: it would be the missing-model cube.
    {
      const own = []
      other._client.on('entity_equipment', p => { if (p.entityId === other.entity.id) for (const e of p.equipments) if (e.slot === 1) own.push(kind(e.item)) })
      await rcon.cmd(`zzdata ${OTHER} bag-tier 1`)
      await rcon.cmd(`zzbagapply ${OTHER}`)
      await rcon.cmd(`wm give ${OTHER} AK_47 1 {slot:0,ammo:5}`)
      await rcon.cmd(`zzammo ${OTHER} rifle 64`)
      other.setQuickBarSlot(0)
      await sleep(1800)
      const h0 = (await status()).hides
      other._client.write('block_dig', { status: 4, location: new Vec3(0, 0, 0), face: 0, sequence: 0 })
      await sleep(800)
      const h1 = (await status()).hides
      const reloading = (await rcon.cmd(`data get entity ${OTHER} SelectedItem.components."minecraft:custom_model_data"`)).trim()
      check('a player without the pack reloading: nothing hidden (no look-alike sent)', h1 === h0 && !own.includes('hidden') && /3005/.test(reloading), `hides ${h0} -> ${h1}; own offhand packets ${JSON.stringify(own)}; ${reloading}`)
    }
    check('the other player never got a look-alike of the holder\'s offhand in the whole run', !seen.some(s => s.k === 'hidden' || s.k === 'shown'), JSON.stringify(seen))
  } finally {
    await rcon.cmd(`zzbagclear ${NAME}`).catch(() => {})
    for (const n of [NAME, OTHER]) await rcon.cmd(`zzclear ${n}`).catch(() => {})
    await quit(bot)
    await quit(other)
    await rcon.cmd(`fill ${X - 4} ${Y - 1} ${Z - 4} ${X + 4} ${Y + 2} ${Z + 4} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
