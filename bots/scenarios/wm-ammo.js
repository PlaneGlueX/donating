// WeaponMechanics item ammo for shop.sk: every gun we sell reloads only from ammo items that shop.sk
// builds (Skript items with the weaponmechanics:ammo-name tag, in the upper inventory), takes exactly
// a magazine's worth, ignores the wrong ammo type, and F doesn't stop a reload. Also: a new gun
// starts full unless given {ammo:0} (why the shop always passes it), Stims stack and leave nothing
// behind, the knife stays put on Q/F, and the config files have no forbidden keys. Every sold gun fires
// and reloads with the bag in the offhand (WeaponMechanics counts any offhand item as dual wielding,
// and its default guns deny shooting while dual wielding: nobody could shoot until 2026-09-25).
// Bullets look like bullets (owner, 2026-09-26): every sold gun's projectile is a fake item display
// holding an iron nugget with custom model data 7001-7003 (the pack draws our tracers for those),
// turned along its flight.
const fs = require('fs')
const path = require('path')
const { Vec3 } = require('vec3')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const NAME = 'AmmoBot'
const Y = 200
const PLATFORM = `660 ${Y - 1} 660 664 ${Y - 1} 664`
const CHUNKS = '660 660 664 664'
const WM = path.join(__dirname, '..', '..', 'server', 'plugins', 'WeaponMechanics')
// Sold guns: file, ammo type, magazine, a mistaken ammo type, the tracer model its bullets carry.
const GUNS = [
  { w: '50_GS', file: 'weapons/pistols/50_GS.yml', type: 'light', mag: 7, wrong: 'rifle', tracer: 'light', cmd: 7001 },
  { w: 'Uzi', file: 'weapons/sub_machine_guns/Uzi.yml', type: 'light', mag: 32, wrong: 'shells', tracer: 'light', cmd: 7001 },
  { w: 'R9_0', file: 'weapons/shotguns/R9_0.yml', type: 'shells', mag: 14, wrong: 'light', tracer: 'pellet', cmd: 7003 },
  { w: 'AK_47', file: 'weapons/assault_rifles/AK_47.yml', type: 'rifle', mag: 30, wrong: 'light', tracer: 'rifle', cmd: 7002 }
]

module.exports = async ({ check }) => {
  // ---------- The config files ----------
  const read = f => fs.readFileSync(path.join(WM, f), 'utf8')
  const forbidden = /Ammo_Switch_Trigger|Unload_Ammo_On_Reload: *true|Weapon_Converter_Check|Ammo_Converter_Check|Destroy_When_Empty|Magazine_Item/
  const files = [...GUNS.map(g => g.file), 'weapons/melee/Combat_Knife.yml', 'weapons/consumables/Stim.yml', 'ammos/Donating_Ammos.yml']
  const bad = files.filter(f => forbidden.test(read(f).split('\n').filter(l => !l.trim().startsWith('#')).join('\n')))
  check('no forbidden WeaponMechanics keys in what we sell', bad.length === 0, bad.join(', '))
  const gunsOk = GUNS.filter(g => new RegExp(`Ammos:\\s*\\n\\s*- "Donating_${g.type[0].toUpperCase() + g.type.slice(1)}"`).test(read(g.file)) && /Swap_Hands: true/.test(read(g.file)))
  check('every sold gun has item ammo and Swap_Hands', gunsOk.length === GUNS.length, `${gunsOk.map(g => g.w)}`)
  check('the knife and the Stim cancel Q and F too', ['weapons/melee/Combat_Knife.yml', 'weapons/consumables/Stim.yml'].every(f => /Drop_Item: true/.test(read(f)) && /Swap_Hands: true/.test(read(f))))
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])
  const dual = walk(path.join(WM, 'weapons')).filter(p => /^\s*Dual_Wielding:/m.test(fs.readFileSync(p, 'utf8')))
  check('no weapon has a Dual_Wielding rule (the bag is always in the offhand)', dual.length === 0, dual.map(p => path.basename(p)).join(', '))
  check('Donating_Ammos.yml defines the three ammo types', ['Donating_Light:', 'Donating_Shells:', 'Donating_Rifle:'].every(t => read('ammos/Donating_Ammos.yml').includes(t)))
  const projOf = g => (read(g.file).match(/^ {2}Projectile: "([^"]+)"/m) || [])[1]
  const projBlocks = {}
  for (const part of read('projectiles/Donating_Projectiles.yml').split(/^(?=\S)/m)) {
    const name = (part.match(/^([a-z_]+):/) || [])[1]
    if (name) projBlocks[name] = part
  }
  const ours = GUNS.filter(g => { const b = projBlocks[projOf(g)] || ''; return /Type: "ITEM_DISPLAY"/.test(b) && /Type: "IRON_NUGGET"/.test(b) && b.includes(`Custom_Model_Data: ${g.cmd}`) })
  check('every sold gun shoots a Donating bullet (an item display with its tracer model), no snowballs or eggs', ours.length === GUNS.length, GUNS.map(g => `${g.w}=${projOf(g)}`).join(' '))
  const pack = path.join(__dirname, '..', '..', 'pack', 'assets', 'donating')
  const nugget = fs.readFileSync(path.join(pack, '..', 'minecraft', 'items', 'iron_nugget.json'), 'utf8')
  const art = [['light', 7001], ['rifle', 7002], ['pellet', 7003]].filter(([k, n]) => {
    const m = JSON.parse(fs.readFileSync(path.join(pack, 'models', 'item', `tracer_${k}.json`), 'utf8'))
    // Glowing, nothing drawn behind z = 12 (it would stick out of the shooter's head on the first tick),
    // no backward faces (the shooter looks straight down the path).
    const ok = m.elements.every(e => e.light_emission === 15 && e.to[2] <= 12 && e.from[2] >= -16 && !e.faces.south)
    return ok && new RegExp(`"threshold": ${n},\\s*"model": \\{\\s*"type": "minecraft:model",\\s*"model": "donating:item/tracer_${k}"`).test(nugget)
  })
  check('...and the pack draws each tracer (glowing, forward of the shooter\'s eye) for its number, and light ammo keeps its icon', art.length === 3 && /"when": "donating:ammo_light"/.test(nugget), art.map(a => a[0]).join(' '))
  // Our gun art (tools\make-item-art.js, tools\guns\): the built pack's feather.json draws every skin number
  // WeaponMechanics gives what we sell (Default, Scope +1000, Sprint +2000 of the four guns; the Combat
  // Knife -10; the Stim -1) with donating: models, with no re-equip dip on a state change, sorted by
  // threshold (the client picks the last entry <= the number), and keeps WeaponMechanics' own entries for
  // the guns we don't sell (build-pack.js merges the two files by threshold).
  {
    const { readZip } = require('../../tools/make-car-wraps')
    const packs = path.join(__dirname, '..', '..', 'extras', 'packs')
    const jsonIn = (zip, name) => { try { return JSON.parse(readZip(zip).get(name).toString('utf8').replace(/^﻿/, '')) } catch (e) { return null } }
    const NUMBERS = [-10, -1, 1, 5, 9, 14, 1001, 1005, 1009, 1014, 2001, 2005, 2009, 2014]
    // build-pack.js wraps every item definition: a display_context select whose first-person case draws the
    // item only while the local player is the camera (view_entity; nothing under the car camera), with the
    // item's own model as both that case's on_true and the fallback. unwrap gives that model, or null.
    const FP = ['firstperson_righthand', 'firstperson_lefthand']
    const unwrap = m => {
      const c = m && /display_context$/.test(m.property) && Array.isArray(m.cases) ? m.cases[0] : null
      const ok = !!c && m.cases.length === 1 && Array.isArray(c.when) && c.when.length === 2 && FP.every(x => c.when.includes(x)) &&
        !!c.model && /condition$/.test(c.model.type) && /view_entity$/.test(c.model.property) && /empty$/.test((c.model.on_false || {}).type) &&
        JSON.stringify(c.model.on_true) === JSON.stringify(m.fallback)
      return ok ? m.fallback : null
    }
    const zipFile = path.join(packs, 'Donating-pack.zip')
    const featherDef = jsonIn(zipFile, 'assets/minecraft/items/feather.json')
    const feather = featherDef && { ...featherDef, model: unwrap(featherDef.model) }
    const entries = feather && feather.model && Array.isArray(feather.model.entries) ? feather.model.entries : []
    const modelsOf = m => !m || typeof m !== 'object' ? [] : [
      ...(/(^|:)model$/.test(m.type) && typeof m.model === 'string' ? [m.model] : []),
      ...Object.values(m).flatMap(v => Array.isArray(v) ? v.flatMap(modelsOf) : typeof v === 'object' ? modelsOf(v) : [])
    ]
    const drawn = NUMBERS.filter(n => {
      const e = entries.filter(x => x.threshold === n)
      const ms = e.length === 1 ? modelsOf(e[0].model) : []
      return ms.length > 0 && ms.every(id => id.startsWith('donating:'))
    })
    const sorted = entries.every((e, i) => i === 0 || entries[i - 1].threshold < e.threshold)
    check('the built pack\'s feather.json draws all 14 sold numbers with our models, no re-equip dip, sorted', !!feather && feather.hand_animation_on_swap === false && sorted && drawn.length === NUMBERS.length,
      `ours: ${drawn.join(' ')}; hand_animation_on_swap ${feather && feather.hand_animation_on_swap}; sorted ${sorted}`)
    const wm = jsonIn(path.join(packs, 'wm', 'WeaponMechanicsResourcePack-3.0.0.zip'), 'assets/minecraft/items/feather.json')
    const others = wm ? wm.model.entries.filter(e => !NUMBERS.includes(e.threshold)) : []
    const kept = others.filter(e => { const x = entries.find(y => y.threshold === e.threshold); return x && JSON.stringify(x.model) === JSON.stringify(e.model) })
    check('...and keeps WeaponMechanics\' other entries (the guns we don\'t sell) and its fallback', !!wm && others.length > 0 && kept.length === others.length &&
      JSON.stringify(feather.model.fallback) === JSON.stringify(wm.model.fallback), wm ? `${kept.length}/${others.length} kept` : 'WeaponMechanics\' pack is missing')
    // No hands under the car camera: the gun, the bag, the hands' cash and the map key are wrapped, and the
    // tripwire hook (the key while the car camera is on) has the carkey case.
    const wrapped = ['feather', 'leather', 'paper', 'filled_map'].filter(i => { const d = jsonIn(zipFile, `assets/minecraft/items/${i}.json`); return !!d && !!unwrap(d.model) })
    const hook = jsonIn(zipFile, 'assets/minecraft/items/tripwire_hook.json')
    const hookIn = hook && unwrap(hook.model)
    const hookOk = !!hookIn && /select$/.test(hookIn.type) && /custom_model_data$/.test(hookIn.property) &&
      hookIn.cases.some(c => c.when === 'donating:carkey' && c.model && c.model.model === 'minecraft:item/tripwire_hook')
    check('the built pack draws no first-person items under the car camera (feather, leather, paper, filled_map wrapped) and has the tripwire-hook car key',
      wrapped.length === 4 && hookOk, `wrapped: ${wrapped.join(' ')}; tripwire hook carkey ${hookOk}`)
  }

  const rcon = await rconLib.connect()
  let bot = null
  try {
    await rcon.cmd(`forceload add ${CHUNKS}`)
    await rcon.cmd(`fill ${PLATFORM} glass`)
    bot = await join(NAME)
    // Fake projectile entities: spawns of item displays, their item (metadata) and their moves.
    const displayId = bot.registry.entitiesByName.item_display.id
    const fakes = new Map()
    bot._client.on('packet', (data, meta) => {
      if (meta.name === 'spawn_entity' && data.type === displayId) fakes.set(data.entityId, { model: null, moves: [] })
      const e = data && data.entityId !== undefined ? fakes.get(data.entityId) : null
      if (!e) return
      if (meta.name === 'entity_metadata') {
        const m = JSON.stringify(data.metadata).match(/custom_model_data[\s\S]{0,120}?(700[1-3])/)
        if (m) e.model = Number(m[1])
      } else if (meta.name === 'entity_move_look') {
        e.moves.push({ dx: data.dX, dy: data.dY, dz: data.dZ, yaw: data.yaw, pitch: data.pitch })
      }
    })
    const angle = b => ((b * 360 / 256) % 360 + 360) % 360
    const yawOff = mv => { const want = ((Math.atan2(-mv.dx, mv.dz) * 180 / Math.PI) % 360 + 360) % 360; const d = Math.abs(want - angle(mv.yaw)); return Math.min(d, 360 - d) }
    await rcon.cmd(`gamemode survival ${NAME}`)
    await rcon.cmd(`minecraft:tp ${NAME} 662.5 ${Y} 662.5`)
    const dig = status => bot._client.write('block_dig', { status, location: new Vec3(0, 0, 0), face: 0, sequence: 0 })
    const wm = async () => (await rcon.cmd(`zzwm ${NAME}`)).trim()
    const loaded = async slot => Number(((await wm()).match(new RegExp(`(?:^WM |\\| )${slot}=[^:]+:(\\d+)x`)) || [])[1])
    const ammo = async type => Number(((await wm()).match(new RegExp(`ammo ${type}=(\\d+)`)) || [])[1])
    const fresh = async () => {
      await rcon.cmd(`zzclear ${NAME}`)
      await rcon.cmd('minecraft:kill @e[type=item,x=662,y=200,z=662,distance=..20]')
    }
    const give = async (w, data) => {
      await rcon.cmd(`wm give ${NAME} ${w} 1 ${data}`)
      bot.setQuickBarSlot(0)
      await sleep(2000) // Weapon_Equip_Delay
    }

    // ---------- A new gun starts full ----------
    await fresh()
    await give('50_GS', '{slot:0}')
    check('control: a gun given without {ammo:0} starts full (so the shop always passes it)', (await loaded(0)) === 7, await wm())

    for (const g of GUNS) {
      // No ammo: Q reloads nothing.
      await fresh()
      await give(g.w, '{slot:0,ammo:0}')
      dig(4)
      await sleep(4500)
      check(`${g.w}: no free reloads (Q with no ammo stays at 0)`, (await loaded(0)) === 0, await wm())
      // The wrong type does nothing either.
      await rcon.cmd(`zzammo ${NAME} ${g.wrong} 40`)
      dig(4)
      await sleep(4500)
      check(`${g.w}: the wrong ammo type isn't used`, (await loaded(0)) === 0 && (await ammo(g.wrong)) === 40, await wm())
      // The right type: exactly one magazine, and F halfway doesn't stop it.
      await rcon.cmd(`zzammo ${NAME} ${g.type} ${g.mag + 10}`)
      dig(4)
      await sleep(500)
      dig(6) // F
      await sleep(4500)
      check(`${g.w}: Q loads a magazine from the shop's ammo items (F doesn't stop it)`, (await loaded(0)) === g.mag && (await ammo(g.type)) === 10, await wm())
    }

    // ---------- Two stacks ----------
    await fresh()
    await give('AK_47', '{slot:0,ammo:0}')
    // WeaponMechanics walks slots 0-35 and takes a magazine from the first stack big enough, so the
    // small stack goes first: 10 rounds in slot 9, 64 in slot 20.
    await rcon.cmd(`zzfill ${NAME} 9 19`)
    await rcon.cmd(`zzammo ${NAME} rifle 64`) // lands in slot 20
    await rcon.cmd(`minecraft:item replace entity ${NAME} container.9 with air`)
    await rcon.cmd(`zzammo ${NAME} rifle 10`) // slot 20 is full: lands in slot 9
    const stacks = (await rcon.cmd(`zzdump ${NAME}`)).trim()
    dig(4)
    await sleep(4500)
    const after = (await rcon.cmd(`zzdump ${NAME}`)).trim()
    check('a reload takes rounds from several stacks', /(^DUMP |\| )9=gold nugget x10 /.test(stacks) && /(^DUMP |\| )20=gold nugget x64 /.test(stacks) && (await loaded(0)) === 30 && !/(^DUMP |\| )9=gold nugget/.test(after) && /(^DUMP |\| )20=gold nugget x44 /.test(after), `before ${stacks}; after ${after}`)

    // ---------- Stims ----------
    await fresh()
    await rcon.cmd(`wm give ${NAME} Stim 3 {slot:1}`)
    await rcon.cmd(`damage ${NAME} 8 minecraft:generic`)
    await sleep(500)
    const hurt = bot.health
    bot.setQuickBarSlot(1)
    await sleep(1500)
    bot.activateItem()
    await sleep(2500)
    const stimLine = await wm()
    const ground = await rcon.cmd(`execute at ${NAME} if entity @e[type=item,distance=..20]`)
    check('a Stim heals, uses one of the stack and leaves nothing behind', /1=Stim:\d+x2/.test(stimLine) && bot.health > hurt && !/passed/i.test(ground), `${stimLine}; health ${hurt} -> ${bot.health}; ground ${ground.trim()}`)

    // ---------- Knife ----------
    await fresh()
    await rcon.cmd(`wm give ${NAME} Combat_Knife 1 {slot:0}`)
    bot.setQuickBarSlot(0)
    await sleep(1500)
    dig(4)
    await sleep(300)
    dig(6)
    await sleep(800)
    const knife = await wm()
    const ground2 = await rcon.cmd(`execute at ${NAME} if entity @e[type=item,distance=..20]`)
    check('Q and F leave the knife in place and drop nothing', /(^WM |\| )0=Combat_Knife:/.test(knife) && !/passed/i.test(ground2), `${knife}; ground ${ground2.trim()}`)

    // ---------- With the bag in the offhand ----------
    for (const g of GUNS) {
      await rcon.cmd(`zztestkit ${NAME}`) // bag tier 2 in the offhand
      await rcon.cmd(`minecraft:item replace entity ${NAME} hotbar.0 with air`)
      await give(g.w, '{slot:0}')
      const before = await loaded(0)
      fakes.clear()
      // Aim level and a little to the side, so the bullets fly across open air.
      await bot.look(0.7, 0, true)
      for (let i = 0; i < 4; i++) { bot.activateItem(); await sleep(200); bot.deactivateItem(); await sleep(400) }
      await sleep(600)
      const after = await loaded(0)
      const off = (await rcon.cmd(`zzdump ${NAME}`)).trim()
      check(`${g.w} fires with the bag in the offhand`, /40=leather x1 \[bag:2\]/.test(off) && after < before, `${before} -> ${after}; ${off}`)
      const shots = [...fakes.values()]
      const moves = shots.flatMap(e => e.moves).filter(mv => Math.abs(mv.dx) + Math.abs(mv.dz) > 400)
      const worst = moves.length ? Math.max(...moves.map(yawOff)) : 999
      check(`...its bullets are tracers (${g.tracer}, custom model data ${g.cmd}) facing where they fly`, shots.length > 0 && shots.every(e => e.model === g.cmd) && moves.length > 0 && worst < 6, `${shots.length} bullets, models ${[...new Set(shots.map(e => e.model))]}, ${moves.length} moves, worst yaw off ${worst.toFixed(1)}°`)
    }
    await rcon.cmd(`zztestkit ${NAME}`)
    await rcon.cmd(`minecraft:item replace entity ${NAME} hotbar.0 with air`)
    await give('AK_47', '{slot:0,ammo:0}')
    await rcon.cmd(`zzammo ${NAME} rifle 40`)
    dig(4)
    await sleep(4500)
    check('...and reloads with the bag in the offhand', (await loaded(0)) === 30 && (await ammo('rifle')) === 10, await wm())

    // ---------- Ammo never in the hotbar ----------
    await fresh()
    await rcon.cmd(`zzammo ${NAME} light 300`)
    const dump = (await rcon.cmd(`zzdump ${NAME}`)).trim()
    check('ammo only goes to the upper inventory', !/(^DUMP |\| )[0-7]=[a-z ]*nugget/.test(dump) && (await ammo('light')) === 300, dump)
  } finally {
    await rcon.cmd(`zzclear ${NAME}`).catch(() => {})
    await rcon.cmd(`minecraft:tp ${NAME} 0.5 68 -656.5`).catch(() => {})
    if (bot) await quit(bot)
    await rcon.cmd(`fill ${PLATFORM} air replace glass`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
