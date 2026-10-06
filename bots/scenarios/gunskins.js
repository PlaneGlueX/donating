// Gun skins (2026-10-06; the owner: "revamp the gun skin system to have different skin variants of specific guns"):
// cosmetics.sk's gun skins (core.sk cos::<id>::type "gunskin", one look of one gun) and DonatingPhone's GunFx, which puts
// the look on the player's guns as their minecraft:item_model (/dphone gunskin; Skript never sets it on a real gun).
// Checks: the 18 skins and their pack files, the crate tables (every total 1000, each crate's cosmetics within the owner's
// cap, every crate skin in one crate), a crate line giving a skin with a serial and a repeat paying the dupe value, a
// Hacked set giving only its missing gun skin, the level-100 skin (bound, once), the wardrobe (/cosmetics' Gun skins
// button, the page of guns, a gun's page, wearing and taking off), the look on a gun WeaponMechanics makes (with the
// gun's own model number), the look through aiming, reloading, shooting and slot switches, another player seeing it, the
// default look (no override, the gun's number kept), refusals (another gun's skin, one not owned, bad GunFx titles and
// keys), /gunskin by name and its tab completion, changing the look mid-pump and mid-reload on the Shotgun (it still
// fires), the gun shop's hotbar mirror and Weapons tab, gunfx.skins.enabled false and a /dphone reload, death and Restore
// loadout, a trade (the giver's gun back to its own look, the serial moving, earned skins not offered, the trade icon is
// the skinned gun), a rejoin keeping the look, a skin no longer owned taken off at the join, and a Legend's retired skin
// coming off when the rank goes.
const fs = require('fs')
const path = require('path')
const { Vec3 } = require('vec3')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'SkinA'
const B = 'SkinB'
const X = 7880; const Y = 170; const Z = 7880
const CHUNKS = `${X - 8} ${Z - 8} ${X + 24} ${Z + 8}`
const PA = [X + 0.5, Y, Z + 0.5]
const PB = [X + 2.5, Y, Z + 0.5]
const FAR = '0.5 68 -656.5'
const ROOT = path.join(__dirname, '..', '..')
const LOGS = path.join(ROOT, 'server', 'plugins', 'Skript', 'logs')
const CORE = path.join(ROOT, 'server', 'plugins', 'Skript', 'scripts', 'core.sk')
const ITEMS = path.join(ROOT, 'pack', 'assets', 'donating', 'items')
const PHONE_CFG = path.join(ROOT, 'server', 'plugins', 'DonatingPhone', 'config.yml')
// The owner's caps on a crate's cosmetics (per 1000; Legendary's car counts inside its 15%).
const CAPS = { daily: 10, common: 30, uncommon: 50, rare: 70, epic: 100, legendary: 150 }
const GUNS = ['Classic Pistol', 'Old Revolver', 'Machine Gun', 'Brave Patriot', 'Shotgun', 'Combat Rifle', 'AK-48', 'Sniper Rifle']

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  let cfgChanged = false
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const log = name => { try { return fs.readFileSync(path.join(LOGS, `${name}.log`), 'utf8') } catch (e) { return '' } }
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
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
    const modelOf = i => { const c = comp(i, 'item_model'); return c ? String(typeof c.data === 'object' ? JSON.stringify(c.data) : c.data) : '' }
    const glints = i => Boolean(comp(i, 'enchantment_glint_override'))
    const slotOf = (name, n) => { const w = bots[name].currentWindow; return w ? w.slots[n] : null }
    const findSlot = (name, re) => { const w = bots[name].currentWindow; if (!w) return -1; for (let s = 0; s < w.inventoryStart; s++) if (w.slots[s] && re.test(itemName(w.slots[s]))) return s; return -1 }
    const describe = i => (i ? `${i.name} "${itemName(i)}" model=${modelOf(i)} (${itemLore(i)})` : 'empty')
    const windowOpen = bot => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const closeAll = async name => { if (bots[name].currentWindow) { bots[name].closeWindow(bots[name].currentWindow); await sleep(400) } }
    const opens = async (name, fn) => { const o = windowOpen(bots[name]); await fn(); const w = await o; await sleep(400); return w }
    const chatOpen = async (name, line) => { await closeAll(name); return opens(name, () => bots[name].chat(line)) }
    const click = async (name, n) => opens(name, () => { bots[name].clickWindow(n, 0, 0).catch(() => {}) })
    const clickInPlace = async (name, n) => { bots[name].clickWindow(n, 0, 0).catch(() => {}); await sleep(800) }
    // The server's truth: the gun's item_model component (only there when set) and its custom_model_data.
    const model = async (name, slot) => {
      const out = await cmd(`data get entity ${name} Inventory[{Slot:${slot}b}].components."minecraft:item_model"`)
      const m = out.match(/data: "([^"]+)"/)
      return m ? m[1] : (/Found no elements/.test(out) ? 'none' : out)
    }
    const cmdData = async (name, slot) => cmd(`data get entity ${name} Inventory[{Slot:${slot}b}].components."minecraft:custom_model_data"`)
    const ammo = async (name, slot) => {
      const out = await cmd(`data get entity ${name} Inventory[{Slot:${slot}b}].components."minecraft:custom_data".PublicBukkitValues."weaponmechanics:ammo-left"`)
      const m = out.match(/data: (-?\d+)/)
      return m ? Number(m[1]) : NaN
    }
    const gunskin = async name => cmd(`zzgunskin ${name}`)
    const gunfx = async name => cmd(`dphone gunskin ${name}`)
    const serialOf = async (name, id) => Number(((await gunskin(name)).match(new RegExp(`${id}#(\\d+)`)) || [])[1] || 0)
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const dig = (name, status) => bots[name]._client.write('block_dig', { status, location: new Vec3(0, 0, 0), face: 0, sequence: 0 })
    const fire = async name => { bots[name].activateItem(); await sleep(80); bots[name].deactivateItem() }
    const tp = async (name, [x, y, z]) => cmd(`zzheisttp ${name} ${x} ${y} ${z}`)
    // A suggestion request answered only by the reply with its transaction id (tabcomplete.js's way).
    let txn = 0
    const tab = (name, line) => new Promise(resolve => {
      const client = bots[name]._client
      const id = ++txn
      let timer = null
      const on = p => { if (p.transactionId === id) done((p.matches || []).map(m => (typeof m === 'string' ? m : m.match))) }
      const done = r => { clearTimeout(timer); client.removeListener('tab_complete', on); resolve(r || []) }
      timer = setTimeout(() => done(null), 4000)
      client.on('tab_complete', on)
      client.write('tab_complete', { transactionId: id, text: line })
    })
    const reset = async name => {
      await cmd(`zzcratereset ${name}`)
      await cmd(`zzlvlrewards ${name}`)
      await cmd(`dphone gunskin ${name} clear`)
      await cmd(`dshop lock ${name} AK_47`)
      await cmd(`dshop lock ${name} R9_0`)
    }

    // ---------- The skins and the crates (core.sk, the pack) ----------
    const core = fs.readFileSync(CORE, 'utf8')
    const skinLine = core.split('\n').find(l => /loop "gs_safety\|/.test(l)) || ''
    const defs = [...skinLine.matchAll(/"([a-z0-9_]+)\|([A-Za-z0-9_]+)\|([a-z0-9]+)\|([a-z0-9]+)\|([^|"]+)\|([^|"]+)\|([a-z]+)"/g)].map(m => ({ id: m[1], gun: m[2], mod: m[3], look: m[4], name: m[6], rarity: m[7] }))
    const missing = defs.filter(d => !fs.existsSync(path.join(ITEMS, `gunskin_${d.mod}_${d.look}.json`)))
    const live = await cmd('zzcfg cos::ak_golden::model')
    const bound = await cmd('zzcfg cos::lvl_kingpin_ak::bound')
    check('core.sk defines 18 gun skins (the eight guns), each with its pack item definition (retired and testing ones included); the level ones are bound',
      defs.length === 18 && missing.length === 0 && /donating:gunskin_ak47_golden/.test(live) && /true/.test(bound) && defs.filter(d => d.rarity === 'level').length === 2,
      `${defs.length} skins; missing ${missing.map(d => d.id).join(',')}; ${live}; ${bound}`)
    const crates = {}
    for (const m of core.matchAll(/set \{-cfg::crate::([a-z]+)::rewards::\*\} to (.+)/g)) crates[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map(x => x[1])
    const totals = []
    for (const c of ['daily', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'hacked']) totals.push(`${c}:${(await cmd(`zzcrateroll ${c} 1`)).match(/total=(\d+)/)[1]}`)
    const over = Object.entries(CAPS).filter(([c, cap]) => crates[c].filter(l => /\|(cos|car)\|/.test(l)).reduce((s, l) => s + Number(l.split('|')[0]), 0) > cap)
    const placed = defs.filter(d => d.rarity !== 'level').map(d => [d.id, Object.entries(crates).filter(([, ls]) => ls.some(l => l.split('|')[1] === 'cos' && l.split('|')[2].split(',').includes(d.id))).map(([c]) => c)])
    check('every crate still adds up to 1000, each crate\'s cosmetics stay within the owner\'s cap (1/3/5/7/10/15%), and every crate skin is in exactly one crate (the Hacked ones in its sets)',
      totals.every(t => /:1000$/.test(t)) && over.length === 0 && placed.every(([, cs]) => cs.length === 1) && crates.hacked.includes('200|cos|hacker,matrix,ak_h4ck3r'),
      `${totals.join(' ')} over=${over.map(o => o[0])} ${placed.map(([id, cs]) => `${id}:${cs.join('/')}`).join(' ')}`)

    // ---------- Setup ----------
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${X - 6} ${Y - 1} ${Z - 6} ${X + 20} ${Y - 1} ${Z + 6} glass`)
    await cmd(`fill ${X - 6} ${Y} ${Z - 6} ${X + 20} ${Y + 4} ${Z + 6} air`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await sleep(500)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`dranks give ${name} none`)
      await cmd(`dlevel set ${name} 30`)
      await cmd(`eco set ${name} 100000`)
      await reset(name)
    }
    await tp(A, PA)
    await tp(B, PB)
    await sleep(1500)

    // ---------- Crates and levels give gun skins ----------
    let t = Date.now()
    let got = await cmd(`zzcrategrant ${A} rare 9|cos|ak_crimson`)
    const sn = await serialOf(A, 'ak_crimson')
    check('a crate line gives a gun skin, numbered like any crate cosmetic ("Crimson AK-48 #N/M gun skin")', /Crimson AK-48 #\d+\/\d+ gun skin/.test(got) && sn > 0 && /owned=[^ ]*ak_crimson/.test(await gunskin(A)), `${got} serial=${sn}`)
    const b0 = await bal(A)
    got = await cmd(`zzcrategrant ${A} rare 9|cos|ak_crimson`)
    check('...and a repeat pays the rarity\'s dupe value instead ($1,500 for a Rare)', /you have it: \$1,500 instead/.test(got) && (await bal(A)) === b0 + 1500, `${got} ${b0} -> ${await bal(A)}`)
    await cmd(`zzcosgive ${B} hacker`)
    await cmd(`zzcosgive ${B} matrix`)
    const b1 = await bal(B)
    got = await cmd(`zzcrategrant ${B} hacked 200|cos|hacker,matrix,ak_h4ck3r`)
    check('a Hacked set gives only the part you lack (its gun skin), no dupe money', /H4CK3R AK-48 #\d+\/\d+ gun skin/.test(got) && !/H4CK3R #/.test(got) && !/instead/.test(got) && /owned=[^ ]*ak_h4ck3r/.test(await gunskin(B)) && (await bal(B)) === b1, `${got} ${b1} -> ${await bal(B)}`)
    await cmd(`dlevel set ${A} 99`)
    const lvMark = log('levels').length
    t = Date.now()
    await cmd(`dlevel xp ${A} 2000`)
    await sleep(800)
    const lv1 = await gunskin(A)
    await cmd(`dlevel xp ${A} 10`)
    await sleep(500)
    const rewards = log('levels').slice(lvMark).split('\n').filter(l => /reward SkinA \S+ 100\|gunskin\|lvl_mastermind_gs/.test(l))
    check('level 100 gives the Mastermind Classic Pistol skin once, bound (no serial)', /Unlocked: the Mastermind Classic Pistol gun skin/.test(text(A, t)) && /lvl_mastermind_gs#0/.test(lv1) && rewards.length >= 1 && (text(A, t).match(/Mastermind Classic Pistol/g) || []).length === 1, `${lv1} | ${text(A, t).slice(0, 400)}`)
    await cmd(`dlevel set ${A} 30`)

    // ---------- The wardrobe ----------
    let w = await chatOpen(A, '/cosmetics')
    const btn = slotOf(A, 14)
    check('/cosmetics has a Gun skins button at 14 (the AK-48, your skins counted)', w && /Gun skins/.test(itemName(btn)) && /Owned: 2/.test(itemLore(btn)) && btn.name === 'feather', describe(btn))
    w = await click(A, 14)
    const names = [11, 12, 13, 14, 15, 20, 21, 22].map(s => itemName(slotOf(A, s)))
    const ak = slotOf(A, 21)
    check('the Gun skins page: a tile per gun in shop order, each its look, skins, "Not bought" and the level it unlocks at; ◀ Cosmetics at 2',
      /Gun skins$/.test(title(w)) && GUNS.every((g, k) => names[k] === g) && /Look: default/.test(itemLore(ak)) && /Skins: 1/.test(itemLore(ak)) && /Not bought/.test(itemLore(ak)) && /Unlocks at level 50/.test(itemLore(ak)) && itemName(slotOf(A, 2)) === '◀ Cosmetics',
      `"${title(w)}" ${names.join(',')} | ${describe(ak)}`)
    w = await click(A, 21)
    const crim = slotOf(A, 11)
    const def = slotOf(A, 4)
    check('a gun\'s page: its own look at 4 (worn: glints), the skins you own as the gun in that look with their serial, ◀ Gun skins at 2',
      /AK-48$/.test(title(w)) && /Default look/.test(itemName(def)) && glints(def) && /Wearing it/.test(itemLore(def)) && itemName(crim) === 'Crimson AK-48' && /gunskin_ak47_crimson/.test(modelOf(crim)) && new RegExp(`Serial #${sn} of`).test(itemLore(crim)) && !glints(crim) && itemName(slotOf(A, 2)) === '◀ Gun skins',
      `"${title(w)}" 4: ${describe(def)} | 11: ${describe(crim)}`)
    const logMark = log('cosmetics').length
    await clickInPlace(A, 11)
    const worn = await gunskin(A)
    const fx = await gunfx(A)
    check('clicking it wears it: data gunskin::AK_47, GunFx told every gun (the rest "default"), the page shows it worn, logged',
      /AK_47=ak_crimson\/ak_crimson/.test(worn) && /AK_47=donating:gunskin_ak47_crimson/.test(fx) && /50_GS=default/.test(fx) && /AX_50=default/.test(fx) && glints(slotOf(A, 11)) && /Wearing it/.test(itemLore(slotOf(A, 11))) && !glints(slotOf(A, 4)) && /wear-gunskin SkinA \S+ AK_47 ak_crimson/.test(log('cosmetics').slice(logMark)),
      `${worn} | ${fx} | ${describe(slotOf(A, 11))}`)
    w = await click(A, 2)
    check('...and the Gun skins page shows the AK-48 in that look ("Look: Crimson")', /Gun skins$/.test(title(w)) && /gunskin_ak47_crimson/.test(modelOf(slotOf(A, 21))) && /Look: Crimson/.test(itemLore(slotOf(A, 21))), describe(slotOf(A, 21)))
    await closeAll(A)

    // ---------- The look on a real gun ----------
    await cmd(`dshop unlock ${A} AK_47`)
    await cmd(`dshop unlock ${A} R9_0`)
    await cmd(`wm give ${A} AK_47 1 {slot:0,ammo:30}`)
    await sleep(300)
    check('a gun WeaponMechanics makes carries the worn look as its item_model, with the gun\'s own model number (5)',
      (await model(A, 0)) === 'donating:gunskin_ak47_crimson' && /floats: \[5\.0f\]/.test(await cmdData(A, 0)), `${await model(A, 0)} ${await cmdData(A, 0)}`)
    // Another player sees it (the equipment packet of the gun in hand).
    const seen = []
    const onEq = p => { if (bots[B].players[A] && bots[B].players[A].entity && p.entityId === bots[B].players[A].entity.id) seen.push(JSON.stringify(p)) }
    bots[B]._client.on('entity_equipment', onEq)
    bots[A].setQuickBarSlot(3)
    await sleep(500)
    bots[A].setQuickBarSlot(0)
    await sleep(1600)
    bots[B]._client.removeListener('entity_equipment', onEq)
    check('another player sees the look on the gun in hand (the equipment packet carries the item_model)', seen.some(s => /gunskin_ak47_crimson/.test(s)), seen.slice(-2).join(' ').slice(0, 600))
    // Aim, reload, shoot and switch: WeaponMechanics changes the model number, never the look.
    await bots[A].look(0, Math.PI / 3, true)
    await cmd(`zzammo ${A} rifle 64`)
    const states = []
    bots[A].swingArm('right') // aim
    await sleep(500)
    states.push(await cmdData(A, 0), await model(A, 0))
    bots[A].swingArm('right') // aim off
    await sleep(400)
    await fire(A)
    await sleep(200)
    const afterShot = await ammo(A, 0)
    states.push(await cmdData(A, 0), await model(A, 0))
    await sleep(400)
    dig(A, 4) // Q: reload
    await sleep(600)
    states.push(await cmdData(A, 0), await model(A, 0))
    await sleep(3200)
    // Sprinting (Sprint +2000).
    bots[A].setControlState('forward', true)
    bots[A].setControlState('sprint', true)
    await sleep(700)
    states.push(await cmdData(A, 0), await model(A, 0))
    bots[A].setControlState('sprint', false)
    bots[A].setControlState('forward', false)
    await sleep(300)
    bots[A].setQuickBarSlot(2)
    await sleep(400)
    bots[A].setQuickBarSlot(0)
    await sleep(1600)
    states.push(await cmdData(A, 0), await model(A, 0))
    const models = states.filter((s, k) => k % 2 === 1)
    const numbers = states.filter((s, k) => k % 2 === 0)
    check('the look stays through aiming, a shot (rounds used), a reload and slot switches while the model number changes (1005, 3005; a bot\'s sprint never reaches WeaponMechanics through ViaBackwards, so Sprint is checked in the client)',
      models.every(m => m === 'donating:gunskin_ak47_crimson') && numbers.some(n => /1005\.0f/.test(n)) && numbers.some(n => /3005\.0f/.test(n)) && typeof afterShot === 'number' && afterShot < 30 && (await ammo(A, 0)) === 30, `${states.join(' | ')} after the shot ${afterShot}, ammo ${await ammo(A, 0)}`)

    // ---------- The gun shop shows the look ----------
    w = await opens(A, () => cmd(`dshop open ${A} gun`))
    const hot = slotOf(A, 11)
    const loadoutCell = findSlot(A, /^AK-48$/)
    const loadoutIcon = loadoutCell >= 0 ? slotOf(A, loadoutCell) : null
    await clickInPlace(A, 47)
    const wpnCell = findSlot(A, /^AK-48$/)
    const wpn = wpnCell >= 0 ? slotOf(A, wpnCell) : null
    const plainCell = findSlot(A, /^Shotgun$/)
    const plain = plainCell >= 0 ? slotOf(A, plainCell) : null
    check('the gun shop shows the worn look: the hotbar mirror, the Loadout tab and the Weapons tab ("Look: Crimson"); a gun without one is plain',
      /gunskin_ak47_crimson/.test(modelOf(hot)) && /gunskin_ak47_crimson/.test(modelOf(loadoutIcon)) && /gunskin_ak47_crimson/.test(modelOf(wpn)) && /Look: Crimson/.test(itemLore(wpn)) && plain !== null && modelOf(plain) === '',
      `mirror ${describe(hot)} | loadout ${describe(loadoutIcon)} | weapons ${describe(wpn)} | shotgun ${describe(plain)}`)
    // Save the loadout for the Restore check below.
    await clickInPlace(A, 45)
    await clickInPlace(A, 2)
    await closeAll(A)

    // ---------- The default look ----------
    w = await chatOpen(A, '/gunskins')
    w = await click(A, 21)
    await clickInPlace(A, 4)
    await sleep(300)
    check('"Default look" takes it off: no data, GunFx "default", the gun has no item_model override and keeps its model number (5)',
      /AK_47=<none>\//.test(await gunskin(A)) && /AK_47=default/.test(await gunfx(A)) && (await model(A, 0)) === 'none' && /floats: \[5\.0f\]/.test(await cmdData(A, 0)) && glints(slotOf(A, 4)),
      `${await gunskin(A)} | ${await gunfx(A)} | ${await model(A, 0)} ${await cmdData(A, 0)}`)
    await closeAll(A)

    // ---------- /gunskin, refusals, tab completion ----------
    t = Date.now()
    bots[A].chat('/gunskin ak-48 bubblegum')
    await sleep(500)
    bots[A].chat('/gunskin classicpistol bubblegum')
    await sleep(500)
    bots[A].chat('/gunskin AK-48 H4CK3R')
    await sleep(600)
    check('another gun\'s skin and a skin you don\'t own are refused (nothing worn)',
      /There's no AK-48 skin called bubblegum/.test(text(A, t)) && /You don't have Bubblegum Classic Pistol/.test(text(A, t)) && /You don't have H4CK3R AK-48/.test(text(A, t)) && /50_GS=<none>\/,/.test(await gunskin(A)) && /AK_47=<none>\//.test(await gunskin(A)),
      `${text(A, t)} | ${await gunskin(A)}`)
    const bad = [await cmd(`dphone gunskin ${A} Foo=default`), await cmd(`dphone gunskin ${A} AK_47=minecraft:stone`)]
    check('GunFx refuses a title that isn\'t a gun and a model that isn\'t a donating:gunskin_* one', bad.every(r => /GUNSKIN refused/.test(r)), bad.join(' / '))
    t = Date.now()
    bots[A].chat('/gunskin AK-48 Crimson')
    await sleep(700)
    check('/gunskin <gun> <look> wears it by name (any case, the gun by its name)', /Your AK-48: Crimson AK-48/.test(text(A, t)) && (await model(A, 0)) === 'donating:gunskin_ak47_crimson', `${text(A, t)} ${await model(A, 0)}`)
    t = Date.now()
    bots[A].chat('/gunskin')
    await sleep(500)
    check('/gunskin alone lists your skins per gun with the one worn', /AK-48: Crimson .*now: Crimson/.test(text(A, t)) && /Classic Pistol: Mastermind/.test(text(A, t)), text(A, t))
    const t1 = await tab(A, '/gunskin ')
    const t2 = await tab(A, '/gunskin AK-48 ')
    const t3 = await tab(A, '/skript:gunskin ')
    check('/gunskin tab-completes the guns you have skins for, then "default" and your looks (the namespaced label too)',
      t1.includes('AK-48') && t1.includes('ClassicPistol') && !t1.includes('Shotgun') && t2.includes('default') && t2.includes('Crimson') && t2.includes('Mastermind') && t3.includes('AK-48'), `${t1} | ${t2} | ${t3}`)

    // ---------- The Shotgun: a new look mid-pump and mid-reload ----------
    await cmd(`zzcosgive ${A} r90_urban`)
    await cmd(`wm give ${A} R9_0 1 {slot:1,ammo:6}`)
    bots[A].setQuickBarSlot(1)
    await sleep(1600)
    await fire(A)
    await sleep(700)
    await fire(A) // 5 -> 4: pumps
    await sleep(60)
    bots[A].chat('/gunskin shotgun urbancamo')
    await sleep(1600)
    const mid = await model(A, 1)
    const a4 = await ammo(A, 1)
    await fire(A)
    await sleep(800)
    const a3 = await ammo(A, 1)
    check('a new look mid-pump leaves the Shotgun ready: the next click fires', mid === 'donating:gunskin_r90_urban' && a4 === 4 && a3 === 3, `${mid} ammo ${a4} -> ${a3}`)
    await cmd(`zzammo ${A} shells 32`)
    await sleep(600)
    dig(A, 4) // reload shell by shell (4 ticks a shell)
    await sleep(300)
    bots[A].chat('/gunskin shotgun default')
    await sleep(3600)
    const full = await ammo(A, 1)
    const md = await model(A, 1)
    await sleep(400)
    await fire(A)
    await sleep(800)
    check('...and mid-reload: the reload finishes (14) and the next click fires (13)', md === 'none' && full === 14 && (await ammo(A, 1)) === 13, `${md} ammo ${full} -> ${await ammo(A, 1)}`)

    // ---------- gunfx.skins.enabled false; a /dphone reload ----------
    const cfg0 = fs.readFileSync(PHONE_CFG, 'utf8')
    if (/ {2}skins:\n {4}enabled: true/.test(cfg0)) {
      fs.writeFileSync(PHONE_CFG, cfg0.replace(/( {2}skins:\n {4}enabled: )true/, '$1false'))
      cfgChanged = true
      await cmd('dphone reload')
      bots[A].setQuickBarSlot(0)
      await sleep(600)
      const off = await model(A, 0)
      fs.writeFileSync(PHONE_CFG, cfg0)
      cfgChanged = false
      await cmd('dphone reload')
      bots[A].setQuickBarSlot(2)
      await sleep(400)
      bots[A].setQuickBarSlot(0)
      await sleep(600)
      check('gunfx.skins.enabled false puts a gun back to its own look when it\'s touched; after a /dphone reload with skins on, the look comes back (the choice kept)',
        off === 'none' && (await model(A, 0)) === 'donating:gunskin_ak47_crimson' && /skins=on/.test(await gunfx(A)), `off: ${off}; on: ${await model(A, 0)}`)
    } else {
      check('gunfx.skins.enabled false: the live config has the skins switch', false, 'no "skins:\\n    enabled: true" in plugins/DonatingPhone/config.yml')
    }

    // ---------- Death and Restore loadout ----------
    await cmd(`minecraft:kill ${A}`)
    await sleep(3500)
    await tp(A, PA)
    await sleep(800)
    const afterDeath = await model(A, 0)
    w = await opens(A, () => cmd(`dshop open ${A} gun`))
    t = Date.now()
    await clickInPlace(A, 6)
    if (/Confirm/.test(itemName(slotOf(A, 6)))) await clickInPlace(A, 6)
    await sleep(600)
    await closeAll(A)
    check('after a death (the guns are gone), Restore loadout gives the AK-48 back in its look', afterDeath === 'none' && (await model(A, 0)) === 'donating:gunskin_ak47_crimson' && /floats: \[5\.0f\]/.test(await cmdData(A, 0)), `after death ${afterDeath}; restored ${await model(A, 0)} ${await cmdData(A, 0)} ${text(A, t).slice(0, 300)}`)

    // ---------- A trade ----------
    await tp(B, PB)
    await sleep(800)
    await closeAll(A)
    await closeAll(B)
    bots[A].chat(`/trade ${B}`)
    await sleep(700)
    const oa = windowOpen(bots[A])
    const ob = windowOpen(bots[B])
    bots[B].chat(`/trade ${A}`)
    await Promise.all([oa, ob])
    await sleep(500)
    w = await click(A, 46) // Add a cosmetic
    const listed = w ? w.slots.slice(0, 45).filter(Boolean).map(itemName) : []
    const crimSlot = findSlot(A, /^Crimson AK-48/)
    const listIcon = crimSlot >= 0 ? slotOf(A, crimSlot) : null
    check('"Add a cosmetic" lists the gun skin as the gun in that look; the earned Mastermind skin isn\'t offered', listIcon && /gunskin_ak47_crimson/.test(modelOf(listIcon)) && /Gun skin/.test(itemLore(listIcon)) && !listed.some(n => /Mastermind/.test(n)), `${listed.join(', ')} | ${describe(listIcon)}`)
    await click(A, crimSlot)
    await sleep(300)
    const mine = slotOf(A, 9)
    const theirs = slotOf(B, 14)
    check('the trade window shows the gun skin (the skinned gun) on both sides', /gunskin_ak47_crimson/.test(modelOf(mine)) && /gunskin_ak47_crimson/.test(modelOf(theirs)), `${describe(mine)} | ${describe(theirs)}`)
    await sleep(1100)
    const tradeMark = log('cosmetics').length
    bots[A].clickWindow(48, 0, 0).catch(() => {})
    await sleep(500)
    bots[B].clickWindow(48, 0, 0).catch(() => {})
    t = Date.now()
    await until(async () => !bots[A].currentWindow && !bots[B].currentWindow, 9000)
    await sleep(600)
    const ga = await gunskin(A)
    const gb = await gunskin(B)
    check('after the trade: the skin and its serial are the other player\'s, the giver\'s worn look came off (data, GunFx, the gun in hand)',
      /Trade done/.test(text(A, t)) && !/ak_crimson/.test(ga.replace(/worn=\S*/, '')) && /AK_47=<none>\//.test(ga) && new RegExp(`ak_crimson#${sn}`).test(gb) && /AK_47=default/.test(await gunfx(A)) && (await model(A, 0)) === 'none' && /unworn-gunskin SkinA \S+ AK_47 ak_crimson \(traded\)/.test(log('cosmetics').slice(tradeMark)),
      `${text(A, t).slice(0, 200)} | ${ga} | ${gb} | ${await model(A, 0)}`)

    // ---------- Rejoining ----------
    await cmd(`zzcosgive ${A} ak_golden`)
    bots[A].chat('/gunskin ak-48 golden')
    await sleep(700)
    await cmd(`dlevel set ${A} 150`) // a staff set: the 150 rewards come at the next join
    await quit(bots[A])
    await sleep(1200)
    bots[A] = await join(A)
    await sleep(2500)
    check('a rejoin keeps the look (GunFx\'s choice and the gun), and the level-150 Kingpin AK-48 skin came at the join',
      /AK_47=ak_golden\/ak_golden/.test(await gunskin(A)) && /AK_47=donating:gunskin_ak47_golden/.test(await gunfx(A)) && (await model(A, 0)) === 'donating:gunskin_ak47_golden' && /lvl_kingpin_ak#0/.test(await gunskin(A)),
      `${await gunskin(A)} | ${await gunfx(A)} | ${await model(A, 0)}`)
    await quit(bots[A])
    await sleep(800)
    await cmd(`zzdata ${A} cos::ak_golden none`)
    const lostMark = log('cosmetics').length
    bots[A] = await join(A)
    await sleep(2500)
    check('a worn skin no longer owned comes off at the join (data, GunFx and the gun), logged',
      /AK_47=<none>\//.test(await gunskin(A)) && /AK_47=default/.test(await gunfx(A)) && (await model(A, 0)) === 'none' && /unworn-gunskin SkinA \S+ AK_47 ak_golden \(not owned\)/.test(log('cosmetics').slice(lostMark)),
      `${await gunskin(A)} | ${await gunfx(A)} | ${await model(A, 0)}`)

    // ---------- A Legend's retired skin ----------
    await cmd('zzcfgbool cos::uzi_carbon::retired true')
    await cmd(`dranks give ${A} legend`)
    const owns = await until(async () => /owned=[^ ]*uzi_carbon/.test(await gunskin(A)), 6000)
    await cmd(`wm give ${A} Uzi 1 {slot:2,ammo:0}`)
    await cmd(`dshop unlock ${A} Uzi`)
    t = Date.now()
    bots[A].chat('/gunskin machinegun carbon')
    await sleep(800)
    const onUzi = await model(A, 2)
    const rankMark = log('cosmetics').length
    await cmd(`dranks give ${A} none`)
    const off = await until(async () => /Uzi=<none>\//.test(await gunskin(A)), 14000)
    await sleep(300)
    check('a Legend owns retired gun skins and can wear one; losing the rank takes it off (the 5 s pass: data, GunFx, the gun)',
      owns && onUzi === 'donating:gunskin_uzi_carbon' && off && /Uzi=default/.test(await gunfx(A)) && (await model(A, 2)) === 'none' && /unworn-gunskin SkinA \S+ Uzi uzi_carbon \(not owned\)/.test(log('cosmetics').slice(rankMark)),
      `owns=${owns} on=${onUzi} off=${off} | ${await gunskin(A)} | ${await gunfx(A)} | ${await model(A, 2)} | ${text(A, t).slice(0, 200)}`)
  } finally {
    if (cfgChanged) {
      try { const c = fs.readFileSync(PHONE_CFG, 'utf8'); fs.writeFileSync(PHONE_CFG, c.replace(/( {2}skins:\n {4}enabled: )false/, '$1true')) } catch (e) {}
      await rcon.cmd('dphone reload').catch(() => {})
    }
    await rcon.cmd('zzcfgreload').catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`zzcratereset ${name}`).catch(() => {})
      await rcon.cmd(`zzlvlrewards ${name}`).catch(() => {})
      await rcon.cmd(`dphone gunskin ${name} clear`).catch(() => {})
      for (const wpn of ['AK_47', 'R9_0', 'Uzi']) await rcon.cmd(`dshop lock ${name} ${wpn}`).catch(() => {})
      await rcon.cmd(`dranks give ${name} none`).catch(() => {})
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill ${X - 6} ${Y - 1} ${Z - 6} ${X + 20} ${Y + 4} ${Z + 6} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
