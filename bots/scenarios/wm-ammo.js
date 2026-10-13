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
  { w: 'AK_47', file: 'weapons/assault_rifles/AK_47.yml', type: 'rifle', mag: 30, wrong: 'light', tracer: 'rifle', cmd: 7002 },
  // The PG3D recreations added 2026-10-06.
  { w: '357_Magnum', file: 'weapons/pistols/357_Magnum.yml', type: 'light', mag: 6, wrong: 'rifle', tracer: 'light', cmd: 7001 },
  { w: 'STG44', file: 'weapons/assault_rifles/STG44.yml', type: 'light', mag: 50, wrong: 'shells', tracer: 'light', cmd: 7001 },
  { w: 'M4A1', file: 'weapons/assault_rifles/M4A1.yml', type: 'rifle', mag: 30, wrong: 'light', tracer: 'rifle', cmd: 7002 },
  { w: 'AX_50', file: 'weapons/sniper_rifles/AX_50.yml', type: 'rifle', mag: 5, wrong: 'shells', tracer: 'sniper', cmd: 7005 },
  { w: 'MG34', file: 'weapons/light_machine_guns/MG34.yml', type: 'rifle', mag: 50, wrong: 'light', tracer: 'rifle', cmd: 7002 },
  // The Hand Minigun (2026-10-12): it spins up before it fires (DonatingPhone's GunSpin), so it's fired with the trigger held.
  { w: 'FN_FAL', file: 'weapons/assault_rifles/FN_FAL.yml', type: 'rifle', mag: 100, wrong: 'light', tracer: 'rifle', cmd: 7002, spin: true }
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
  const art = [['light', 7001], ['rifle', 7002], ['pellet', 7003], ['sniper', 7005]].filter(([k, n]) => {
    const m = JSON.parse(fs.readFileSync(path.join(pack, 'models', 'item', `tracer_${k}.json`), 'utf8'))
    // Glowing, nothing drawn behind z = 12 (it would stick out of the shooter's head on the first tick),
    // no backward faces (the shooter looks straight down the path).
    const ok = m.elements.every(e => e.light_emission === 15 && e.to[2] <= 12 && e.from[2] >= -16 && !e.faces.south)
    return ok && new RegExp(`"threshold": ${n},\\s*"model": \\{\\s*"type": "minecraft:model",\\s*"model": "donating:item/tracer_${k}"`).test(nugget)
  })
  check('...and the pack draws each tracer (glowing, forward of the shooter\'s eye) for its number, and light ammo keeps its icon', art.length === 4 && /"when": "donating:ammo_light"/.test(nugget), art.map(a => a[0]).join(' '))
  // Our gun art (tools\make-item-art.js, tools\guns\): the built pack's feather.json draws every skin number
  // WeaponMechanics gives what we sell (Default, Scope +1000, Sprint +2000 of the four guns; the Combat
  // Knife -10; the Stim -1) with donating: models, with no re-equip dip on a state change, sorted by
  // threshold (the client picks the last entry <= the number), and keeps WeaponMechanics' own entries for
  // the guns we don't sell (build-pack.js merges the two files by threshold).
  {
    const { readZip } = require('../../tools/make-car-wraps')
    const packs = path.join(__dirname, '..', '..', 'extras', 'packs')
    const jsonIn = (zip, name) => { try { return JSON.parse(readZip(zip).get(name).toString('utf8').replace(/^﻿/, '')) } catch (e) { return null } }
    // The four guns' Default, Scope +1000, Sprint +2000, Reload +3000 (the Pixel Gun 3D recreations since
    // 2026-10-05), the Combat Knife and the Stim.
    const NUMBERS = [-10, -1, 1, 5, 6, 7, 8, 9, 11, 13, 14, 15, 1001, 1005, 1006, 1007, 1008, 1009, 1011, 1013, 1014, 1015, 2001, 2005, 2006, 2007, 2008, 2009, 2011, 2013, 2014, 2015, 3001, 3005, 3006, 3007, 3008, 3009, 3011, 3013, 3014, 3015, 10014, 11014, 12014, 13014, 20014, 21014, 22014, 23014]
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
    check(`the built pack's feather.json draws all ${NUMBERS.length} sold numbers with our models, no re-equip dip, sorted`, !!feather && feather.hand_animation_on_swap === false && sorted && drawn.length === NUMBERS.length,
      `ours: ${drawn.join(' ')}; hand_animation_on_swap ${feather && feather.hand_animation_on_swap}; sorted ${sorted}`)
    const wm = jsonIn(path.join(packs, 'wm', 'WeaponMechanicsResourcePack-3.0.0.zip'), 'assets/minecraft/items/feather.json')
    const others = wm ? wm.model.entries.filter(e => !NUMBERS.includes(e.threshold)) : []
    const kept = others.filter(e => { const x = entries.find(y => y.threshold === e.threshold); return x && JSON.stringify(x.model) === JSON.stringify(e.model) })
    check('...and keeps WeaponMechanics\' other entries (the guns we don\'t sell) and its fallback', !!wm && others.length > 0 && kept.length === others.length &&
      JSON.stringify(feather.model.fallback) === JSON.stringify(wm.model.fallback), wm ? `${kept.length}/${others.length} kept` : 'WeaponMechanics\' pack is missing')
    // The fire flicker needs GunFx's firing flag (custom_model_data flag 0: a shot really went off) as well as the held
    // key, and the shotgun draws the pump alone under flag 1 (a pump WeaponMechanics works without a shot; review
    // 2026-10-05: holding right-click on loot, or with an empty gun, flickered the flash).
    const gunEntry = n => { const e = entries.filter(x => x.threshold === n); return e.length === 1 ? e[0].model : null }
    const all = (m, pred, out = []) => {
      if (m && typeof m === 'object') { if (pred(m)) out.push(m); for (const v of Object.values(m)) (Array.isArray(v) ? v : [v]).forEach(x => all(x, pred, out)) }
      return out
    }
    const isFlag = i => m => /condition$/.test(m.type || '') && /custom_model_data$/.test(m.property || '') && (m.index || 0) === i
    const gated = [1, 1001, 5, 1005, 15, 1015, 11, 1011, 6, 1006].filter(n => {
      const e = gunEntry(n)
      const keys = all(e, m => /keybind_down$/.test(m.property || ''))
      const flags = all(e, isFlag(0))
      return keys.length > 0 && keys.every(k => flags.some(f => f.on_true === k))
    })
    const pumps = [14, 1014].filter(n => all(gunEntry(n), isFlag(1)).length === 1)
    check('the automatic guns\' fire flicker needs GunFx\'s firing flag and the held key; the shotgun has the pump alone (flag 1)', gated.length === 10 && pumps.length === 2, `gated ${gated.join(' ')}; pump ${pumps.join(' ')}`)
    // The guns with both a draw and a shot clock (Combat Rifle 7, Old Revolver 8, Sniper Rifle 13) tell the draw from a
    // shot by GunFx's flag 2, aimed too; the Sniper Rifle draws its bolt alone under flag 1 (review 2026-10-06).
    const draws = [7, 1007, 8, 1008, 13, 1013].filter(n => all(gunEntry(n), isFlag(2)).length === 1)
    const bolts = [13, 1013].filter(n => all(gunEntry(n), isFlag(1)).length === 1)
    check('the Combat Rifle, Old Revolver and Sniper Rifle draw under flag 2 (default and aimed); the Sniper Rifle\'s bolt alone is flag 1', draws.length === 6 && bolts.length === 2, `draw ${draws.join(' ')}; bolt ${bolts.join(' ')}`)
    // The Veteran's sights sit 2.1 units left of the bore, like a Bren's: its aimed models move the gun right in the right
    // hand and the mirrored amount in the left, so the post lands on the crosshair in both.
    const lmgAds = ['body', 'stock', 'bolt', 'mag', 'flash', 'flash2', 'full'].map(p => jsonIn(zipFile, `assets/donating/models/item/gun_lmg_${p}_ads.json`))
    const adsOk = lmgAds.filter(j => j && j.display && j.display.firstperson_righthand && j.display.firstperson_lefthand &&
      Math.abs(j.display.firstperson_lefthand.translation[0] - (j.display.firstperson_righthand.translation[0] - 10.08)) < 1e-3 &&
      j.display.firstperson_lefthand.translation[1] === j.display.firstperson_righthand.translation[1] &&
      j.display.firstperson_lefthand.translation[2] === j.display.firstperson_righthand.translation[2])
    check('the Veteran\'s offset sights land on the crosshair in both hands (left aim x = right x - 10.08)', adsOk.length === 7, `${adsOk.length}/7`)
    // The Hand Minigun (2026-10-12): the barrels turn on GunFx's and GunSpin's flags. In first person (either hand) the
    // spin-up (flag 3) and the spin-down (flag 4) run on the gun's clock (minecraft:cooldown), default and aimed, the
    // sprint keeps the spin-down and the draw is flag 2; everywhere else (third person in either hand, the ground, item
    // frames) only the flags 0, 3 and 4 turn them, never the clock or the held key (the viewer's own, not the holder's:
    // other players would see their own cooldown); the inventory icon stands still.
    let mgPack = new Map()
    try { mgPack = readZip(zipFile) } catch (e) { }
    const mgJson = name => { try { return JSON.parse(mgPack.get(name).toString('utf8').replace(/^\uFEFF/, '')) } catch (e) { return null } }
    const ctxOf = (m, ctx) => {
      if (!m || !/select$/.test(m.type || '') || !/display_context$/.test(m.property || '')) return m
      const c = (m.cases || []).find(x => [].concat(x.when).includes(ctx))
      return c ? c.model : m.fallback
    }
    const onClock = m => /range_dispatch$/.test(m.type || '') && /cooldown$/.test(m.property || '')
    const hand = h => h.endsWith('lefthand') ? 'L' : 'R'
    const flagOnClock = (n, i, h) => all(ctxOf(gunEntry(n), h), isFlag(i)).some(f => all(f.on_true, onClock).length > 0)
    const fpSpin = FP.flatMap(h => [[6, 3], [6, 4], [1006, 3], [1006, 4], [6, 2]].filter(([n, i]) => flagOnClock(n, i, h)).map(([n, i]) => `${hand(h)}${n}:${i}`))
    const sprintDown = FP.filter(h => all(ctxOf(gunEntry(2006), h), isFlag(4)).length > 0).map(hand)
    const ELSEWHERE = ['thirdperson_righthand', 'thirdperson_lefthand', 'ground', 'fixed', 'head']
    const viewers = [6, 1006, 2006, 3006].flatMap(n => ELSEWHERE.flatMap(c => all(ctxOf(gunEntry(n), c), m => /cooldown$|keybind_down$/.test(m.property || '')).map(() => `${n}/${c}`)))
    const tpFlags = ELSEWHERE.slice(0, 2).flatMap(h => [6, 1006, 2006].filter(n => [0, 3, 4].every(i => all(ctxOf(gunEntry(n), h), isFlag(i)).length > 0)).map(n => `${hand(h)}${n}`))
    const stillIcon = [6, 1006, 2006, 3006].filter(n => { const g = ctxOf(gunEntry(n), 'gui'); return !!g && all(g, m => /condition$|range_dispatch$|select$/.test(m.type || '')).length === 0 })
    check('the Hand Minigun\'s barrels: spin-up (flag 3) and spin-down (flag 4) on the clock in first person (default and aimed, both hands), the sprint\'s spin-down, the draw (flag 2); elsewhere the flags alone (0, 3, 4), never the clock or the held key; a still icon',
      fpSpin.length === 10 && sprintDown.length === 2 && viewers.length === 0 && tpFlags.length === 6 && stillIcon.length === 4,
      `first person ${fpSpin.join(' ')}; sprint flag 4 ${sprintDown.join(' ') || 'none'}; viewer-only elsewhere: ${viewers.join(' ') || 'none'}; third person flags ${tpFlags.join(' ')}; still icons ${stillIcon.join(' ')}`)
    // Nothing static stands in the spinning cluster's way (spec 3.3): the spin part turns about the x axis through the
    // middle of its own y/z extent, so each of its boxes sweeps a disc as wide as its farthest corner; a box of a static
    // part over the same x must stay outside it, unless it holds that whole disc (the housing the barrels end in). A
    // rotated box counts with both turns' corners. The flash is hidden until its frames move it out.
    const corners = e => {
      const out = []
      for (const x of [e.from[0], e.to[0]]) for (const y of [e.from[1], e.to[1]]) for (const z of [e.from[2], e.to[2]]) {
        const p = [x, y, z]
        const r = e.rotation
        if (!r || !r.angle) { out.push(p); continue }
        const [i, j] = { x: [1, 2], y: [2, 0], z: [0, 1] }[r.axis]
        for (const sg of [1, -1]) {
          const a = sg * r.angle * Math.PI / 180
          const q = [...p]
          q[i] = r.origin[i] + (p[i] - r.origin[i]) * Math.cos(a) - (p[j] - r.origin[j]) * Math.sin(a)
          q[j] = r.origin[j] + (p[i] - r.origin[i]) * Math.sin(a) + (p[j] - r.origin[j]) * Math.cos(a)
          out.push(q)
        }
      }
      return out
    }
    const box = e => { const c = corners(e); const lo = k => Math.min(...c.map(p => p[k])); const hi = k => Math.max(...c.map(p => p[k])); return { x0: lo(0), x1: hi(0), y0: lo(1), y1: hi(1), z0: lo(2), z1: hi(2), c } }
    const partEls = p => ((mgJson(`assets/donating/models/item/gun_minigun_${p}.json`) || {}).elements || []).map(box)
    const spinEls = partEls('spin')
    const statics = [...mgPack.keys()].map(k => (k.match(/^assets\/donating\/models\/item\/gun_minigun_([a-z0-9]+)\.json$/) || [])[1])
      .filter(p => p && !/^(base|full|spin|flash\d*)$/.test(p))
    const span = k => spinEls.flatMap(b => b.c.map(p => p[k]))
    const AY = (Math.min(...span(1)) + Math.max(...span(1))) / 2
    const AZ = (Math.min(...span(2)) + Math.max(...span(2))) / 2
    const hits = []
    let housed = 0
    let rMax = 0
    for (const s of spinEls) rMax = Math.max(rMax, ...s.c.map(q => Math.hypot(q[1] - AY, q[2] - AZ)))
    for (const p of statics) {
      for (const st of partEls(p)) {
        const d = Math.hypot(Math.max(st.y0 - AY, 0, AY - st.y1), Math.max(st.z0 - AZ, 0, AZ - st.z1))
        for (const s of spinEls) {
          if (st.x0 >= s.x1 || st.x1 <= s.x0) continue
          const r = Math.max(...s.c.map(q => Math.hypot(q[1] - AY, q[2] - AZ)))
          if (st.y0 <= AY - r + 1e-3 && st.y1 >= AY + r - 1e-3 && st.z0 <= AZ - r + 1e-3 && st.z1 >= AZ + r - 1e-3) { housed++; continue }
          if (d < r - 1e-3) hits.push(`${p} [${st.x0.toFixed(2)}..${st.x1.toFixed(2)}] ${d.toFixed(2)} < ${r.toFixed(2)}`)
        }
      }
    }
    // Its sights sit on z = 8 (over the barrels' axis), so the aimed models are the plain mirror: the same display in
    // both hands, the same in every part (the Veteran's sit 2.1 to the side and need an offset). make-item-art.js's aim()
    // puts the sight line on the crosshair at tx -8.96 (z = 8) and ty = 8.32 - scale.y × (sightY - 8): the red dot (a
    // glowing box of a static part) must sit on that line, above the spinning cluster.
    const mgAds = [...mgPack.keys()].filter(k => /^assets\/donating\/models\/item\/gun_minigun_[a-z0-9]+_ads\.json$/.test(k)).map(k => mgJson(k))
    const fpAds = mgAds.map(j => j && j.display && j.display.firstperson_righthand)
    const mgAdsOk = mgAds.filter(j => j && j.display && j.display.firstperson_righthand && j.display.firstperson_lefthand &&
      JSON.stringify(j.display.firstperson_lefthand.translation) === JSON.stringify(j.display.firstperson_righthand.translation) &&
      JSON.stringify(j.display.firstperson_righthand) === JSON.stringify(fpAds[0]))
    const ads0 = fpAds[0] || { translation: [NaN, NaN, NaN], scale: [NaN, NaN, NaN] }
    const sightY = 8 + (8.32 - ads0.translation[1]) / ads0.scale[1]
    const mid = (e, k) => (e.from[k] + e.to[k]) / 2
    const dots = statics.flatMap(p => ((mgJson(`assets/donating/models/item/gun_minigun_${p}.json`) || {}).elements || [])
      .filter(e => (e.light_emission || 0) > 0 && Math.abs(mid(e, 1) - sightY) < 0.05 && Math.abs(mid(e, 2) - 8) < 0.05)
      .map(e => `${p} x ${mid(e, 0).toFixed(2)}`))
    check('the Hand Minigun\'s sights land on the crosshair in both hands (the aimed models are the plain mirror, at the dot\'s height and on z = 8, over the spinning barrels), and nothing static stands in the spinning cluster\'s way',
      mgAds.length >= 5 && mgAdsOk.length === mgAds.length && Math.abs(ads0.translation[0] + 8.96) < 1e-6 && dots.length >= 1 && sightY > AY + rMax &&
      spinEls.length > 0 && statics.length >= 2 && hits.length === 0,
      `aimed ${mgAdsOk.length}/${mgAds.length} (tx ${ads0.translation[0]}); sight y ${sightY.toFixed(2)}, dot ${dots.join(', ') || 'none'}; spin boxes ${spinEls.length} about y ${AY.toFixed(2)} z ${AZ.toFixed(2)}, reach ${rMax.toFixed(2)}; static parts ${statics.join(' ')}; housed ${housed}; in the way: ${hits.slice(0, 6).join('; ') || 'none'}`)
    // No No_Ammo skin (WeaponMechanics puts it over Scope and Sprint: an empty gun dropped out of the sights; the Shotgun's
    // named skins Shell_In and Shell_Out mark its shell-by-shell reload's ends: DonatingPhone ShellLoad), and no
    // firearm-action sounds on the pistol and the AK-48 (their reload frames show no slide or bolt action of its own).
    const yamlOf = g => read(g.file).split('\n').filter(l => !l.trim().startsWith('#')).join('\n')
    const skins = GUNS.filter(g => {
      const sec = (yamlOf(g).match(/\n {2}Skin:\n((?: {4}.*\n)+)/) || [])[1] || ''
      return [...sec.matchAll(/^ {4}(\w+):/gm)].map(m => m[1]).filter(k => k !== 'blue' && k !== 'red').join(',') === (g.w === 'R9_0' ? 'Default,Scope,Sprint,Reload,Shell_In,Shell_Out' : 'Default,Scope,Sprint,Reload')
    })
    const silent = GUNS.filter(g => ['50_GS', 'AK_47', 'STG44', 'M4A1', 'MG34'].includes(g.w)).filter(g => {
      const fa = (yamlOf(g).match(/\n {2}Firearm_Action:\n((?: {4}.*\n)+)/) || [])[1] || ''
      return fa.length > 0 && !/Mechanics/.test(fa)
    })
    check('every sold gun\'s skins are Default, Scope, Sprint and Reload (no No_Ammo; the Shotgun also Shell_In and Shell_Out); the firearm action is silent where the reload frames show none of its own (Classic Pistol, AK-48, Brave Patriot, Combat Rifle, Veteran)', skins.length === GUNS.length && silent.length === 5, `skins ok ${skins.map(g => g.w)}; silent ${silent.map(g => g.w)}`)
    // No hands under the car camera: the gun, the bag, the hands' cash and the map key are wrapped, and the
    // tripwire hook (the key while the car camera is on) has the carkey case.
    const wrapped = ['feather', 'leather', 'paper', 'filled_map'].filter(i => { const d = jsonIn(zipFile, `assets/minecraft/items/${i}.json`); return !!d && !!unwrap(d.model) })
    const hook = jsonIn(zipFile, 'assets/minecraft/items/tripwire_hook.json')
    const hookIn = hook && unwrap(hook.model)
    const hookOk = !!hookIn && /select$/.test(hookIn.type) && /custom_model_data$/.test(hookIn.property) &&
      hookIn.cases.some(c => c.when === 'donating:carkey' && c.model && c.model.model === 'minecraft:item/tripwire_hook')
    check('the built pack draws no first-person items under the car camera (feather, leather, paper, filled_map wrapped) and has the tripwire-hook car key',
      wrapped.length === 4 && hookOk, `wrapped: ${wrapped.join(' ')}; tripwire hook carkey ${hookOk}`)
    // Gun noises 35% quieter (owner, 2026-09-29; build-pack.js GUN_SOUND_VOLUME). The 26.3 client plays a sound
    // at gain min(v, 1), fading to 0 at max(v, 1) × attenuation_distance blocks, v = the server's volume × the
    // sounds.json entry's. So every WeaponMechanics event a sold gun plays (at server volume V, from its file) must
    // be 0.65 × as loud as with WeaponMechanics' own entry, and heard as far; every other event is untouched; the
    // vanilla sounds in the gun files (not scalable in the pack) are at 0.65 or less.
    const F = 0.65
    const noComments = t => t.split('\n').filter(l => !l.trim().startsWith('#')).join('\n')
    const plan = new Map()
    for (const g of GUNS) {
      for (const m of noComments(read(g.file)).matchAll(/CustomSound\{([^}]*)\}/g)) {
        const ev = ((m[1].match(/(?:^|,)\s*sound=([^,\s]+)/) || [])[1] || '').replace(/^minecraft:/, '')
        const V = +((m[1].match(/(?:^|,)\s*volume=([\d.]+)/) || [])[1] || 1)
        plan.set(ev, Math.max(plan.get(ev) || 0, V))
      }
    }
    const wmSnd = jsonIn(path.join(packs, 'wm', 'WeaponMechanicsResourcePack-3.0.0.zip'), 'assets/minecraft/sounds.json') || {}
    // Our own gun sounds (tools\sounds\make-gun-sounds.js, donating.gun.*) are measured against our source sounds.json.
    let ourSnd = {}
    try { ourSnd = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'pack', 'assets', 'minecraft', 'sounds.json'), 'utf8')) } catch (e) { }
    const sourceOf = ev => ev.startsWith('donating.') ? ourSnd[ev] : wmSnd[ev]
    const packSnd = jsonIn(zipFile, 'assets/minecraft/sounds.json') || {}
    const entryOf = s => typeof s === 'string' ? { name: s, volume: 1, att: 16 } : { name: s.name, volume: s.volume ?? 1, att: s.attenuation_distance ?? 16 }
    const heard = (V, e) => ({ gain: Math.min(V * e.volume, 1), range: Math.max(V * e.volume, 1) * e.att })
    const quieter = [...plan].filter(([ev, V]) => {
      const a = ((sourceOf(ev) || {}).sounds || []).map(entryOf)
      const b = ((packSnd[ev] || {}).sounds || []).map(entryOf)
      return a.length > 0 && a.length === b.length && a.every((x, i) => {
        const was = heard(V, x)
        const now = heard(V, b[i])
        return x.name === b[i].name && Math.abs(now.gain - F * was.gain) < 0.002 && Math.abs(now.range - was.range) < 0.5
      })
    }).map(([ev]) => ev)
    const otherEvents = Object.keys(wmSnd).filter(ev => !plan.has(ev))
    const same = otherEvents.filter(ev => JSON.stringify(wmSnd[ev]) === JSON.stringify(packSnd[ev]))
    const loudVanilla = GUNS.flatMap(g => [...noComments(read(g.file)).matchAll(/(?<!Custom)Sound\{([^}]*)\}/g)]
      // Each vanilla line is 0.65 of what WeaponMechanics shipped (volume 1 -> 0.65, 0.5 -> 0.325): putting one back fails.
      .filter(m => { const v = +((m[1].match(/(?:^|,)\s*volume=([\d.]+)/) || [])[1] || 1); return ![F, F * 0.5].some(x => Math.abs(v - x) < 1e-9) })
      .map(m => `${g.w}: ${m[0]}`))
    check('the sold guns\' sounds are 35% quieter at the same range (pack events and vanilla sounds), other WeaponMechanics sounds untouched',
      plan.size >= 8 && quieter.length === plan.size && otherEvents.length > 0 && same.length === otherEvents.length && loudVanilla.length === 0,
      `quieter ${quieter.length}/${plan.size} (${[...plan.keys()].filter(ev => !quieter.includes(ev)).join(' ') || 'all'}); others untouched ${same.length}/${otherEvents.length}; vanilla not at 0.65 of before: ${loudVanilla.join('; ') || 'none'}`)
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
        const m = JSON.stringify(data.metadata).match(/custom_model_data[\s\S]{0,120}?(700[1-5])/)
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
      if (g.spin) {
        // One use_item every 100 ms for 1.5 s, as a held key repeats it: the barrels spin up (the first round about 8
        // ticks in) and it fires at up to 16 a second.
        const end = Date.now() + 1500
        while (Date.now() < end) { bot.activateItem(); await sleep(100) }
        bot.deactivateItem()
      } else {
        for (let i = 0; i < 4; i++) { bot.activateItem(); await sleep(200); bot.deactivateItem(); await sleep(400) }
      }
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
