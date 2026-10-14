// Melee weapons and consumables (owner, 2026-09-28: "more melee weapons/consumables (dagger,
// throwable knife, grappler ..., energy drink (15 seconds speed 3, test this one out to balance it)"; 2026-10-13:
// "get some melee ideas from pg3d and replace some of the melees we have now").
// The damage rule (owner, 2026-09-26): the strongest gun (AK-48, 5.5 a body shot) kills an unarmored
// player in 4 hits and one in the best gear (Tactical Helmet 3 + Heavy Vest 8 = 11 armor points: -66%
// at Per_Armor_Point -6%) in 10-12, and nothing is stronger; every melee does base + bonus <= 5.0 (2026-10-13).
// An attacker bot hits a target bot 3 blocks away (each health drop is one hit): the Karambit (title Dagger) 4,
// 5.25 from behind (4 + its backstab 1.0, + config.yml's Back +5%), a hit every 12 ticks; the Pipe Wrench (title
// Baseball_Bat) 5 with knockback, a hit every 28 ticks, 5.75 at the eyes (the Head +15%), landing past 3 blocks on a
// swing alone (WeaponMechanics' own 4-block reach), and never shoving a passive player, an NPC or anyone toward a
// heist; a Throwing Knife 5 (one used per throw, flying as an item display with custom model data 7004), then the
// same through the best gear. The pack draws the melees and consumables 3D in the shop too (no 2D icons). The Energy
// Drink gives Speed II for 3 s (owner, 2026-09-28, after Speed III for 15 s was tested), the Bandage heals 6 over 4 s,
// and both are used up with nothing left behind.
// Balance numbers for the drink: sprint speed over 60 blocks with and without Speed III (and sprint
// jumping), a Citizens NPC walking at the cops' 1.3 speed, and what those mean for a collapsing floor
// and a chase (printed in the check details).
// Usage: bots/run.js wm-melee [static] [melee] [throw] [drink] [bandage] [speed] [cop]  (default: all)
const fs = require('fs')
const path = require('path')
const { Vec3 } = require('vec3')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'ItmA' // attacker, drinker, runner
const B = 'ItmB' // target
const Y = 200
const X0 = 3700
const Z0 = 3700
const PLATFORM = `${X0} ${Y - 1} ${Z0} ${X0 + 100} ${Y - 1} ${Z0 + 8}`
const CHUNKS = `${X0} ${Z0} ${X0 + 100} ${Z0 + 8}`
const WM = path.join(__dirname, '..', '..', 'server', 'plugins', 'WeaponMechanics')
const PACK = path.join(__dirname, '..', '..', 'pack', 'assets')
const LOG = path.join(__dirname, '..', '..', 'server', 'logs', 'latest.log')
// model = the pack's donating:item/<model> that draws it (3D everywhere, the shop and hotbar too).
const ITEMS = [
  { w: 'Dagger', file: 'weapons/melee/Dagger.yml', cmd: 1, model: 'karambit' },
  { w: 'Baseball_Bat', file: 'weapons/melee/Baseball_Bat.yml', cmd: 2, model: 'pipe_wrench' },
  { w: 'Throwing_Knife', file: 'weapons/consumables/Throwing_Knife.yml', cmd: 3, model: 'throwing_knife', consumable: true },
  { w: 'Energy_Drink', file: 'weapons/consumables/Energy_Drink.yml', cmd: 4, model: 'energy_drink', consumable: true },
  { w: 'Bandage', file: 'weapons/consumables/Bandage.yml', cmd: 5, model: 'bandage', consumable: true }
]
const HEIST = 'zshove' // a disabled heist 2 blocks behind the wrench's target (never shoved toward it)
const WALL = `${X0 + 13} ${Y} ${Z0 + 3} ${X0 + 13} ${Y + 2} ${Z0 + 6}` // glass right behind the target

module.exports = async ({ check, args = [] }) => {
  const want = s => args.length === 0 || args.includes(s)
  const read = f => fs.readFileSync(path.join(WM, f), 'utf8')

  // ---------- The files and the pack ----------
  if (want('static')) {
    const bad = ITEMS.filter(it => {
      const t = read(it.file).split('\n').filter(l => !l.trim().startsWith('#')).join('\n')
      return !/Drop_Item: true/.test(t) || !/Swap_Hands: true/.test(t) || !/Deny_Use_In_Crafting: true/.test(t) ||
        /Dual_Wielding|FEATHER/.test(t) || !/Type: "AMETHYST_SHARD"/.test(t) || !new RegExp(`Custom_Model_Data: ${it.cmd}\\b`).test(t) ||
        (it.consumable && !/Consume_Item_On_Shoot: true/.test(t))
    })
    check('each new item cancels Q and F, never crafts, has no Dual_Wielding rule, is an amethyst shard with its model number, and consumables are used up', bad.length === 0, bad.map(i => i.w).join(', '))
    // The melee rule (2026-10-13): Base_Damage + any bonus <= 5.0 (the AK-48 does 5.5), and no keys WeaponMechanics
    // 4.3.1 never reads (Damage.Victim_Mechanics left the knife's hits silent; Show_Time is the paid Cosmetics add-on's).
    const melee = ['Combat_Knife', 'Baseball_Bat', 'Dagger'].map(w => {
      const t = read(`weapons/melee/${w}.yml`).split('\n').filter(l => !l.trim().startsWith('#')).join('\n')
      const bonus = [...t.matchAll(/Bonus_Damage: ([\d.]+)/g)].reduce((s, x) => s + Number(x[1]), 0) // WeaponMechanics adds them together
      return { w, top: Number((t.match(/Base_Damage: ([\d.]+)/) || [])[1]) + bonus, dead: /Victim_Mechanics|Show_Time/.test(t) }
    })
    check('every melee does at most 5.0 a hit with its bonuses, and keeps no keys WeaponMechanics never reads', melee.every(x => x.top <= 5 && !x.dead), melee.map(x => `${x.w} ${x.top}${x.dead ? ' (dead keys)' : ''}`).join(', '))
    const shard = JSON.parse(fs.readFileSync(path.join(PACK, 'minecraft', 'items', 'amethyst_shard.json'), 'utf8'))
    const entries = (shard.model && shard.model.entries) || []
    // A 3D model that sets its own shop and hotbar view (display.gui), like the Drill and the Safe Kit.
    const has3dGui = name => {
      try {
        const m = JSON.parse(fs.readFileSync(path.join(PACK, 'donating', 'models', 'item', `${name}.json`), 'utf8'))
        return Array.isArray(m.elements) && m.elements.length > 0 && !!(m.display && m.display.gui)
      } catch (err) { return false }
    }
    // Each entry is a plain model (no 2D icon for the gui).
    const drawn = ITEMS.filter(it => {
      const e = entries.find(x => x.threshold === it.cmd)
      return !!e && /(^|:)model$/.test(e.model.type) && e.model.model === `donating:item/${it.model}` && has3dGui(it.model)
    })
    const after = entries.find(e => e.threshold === ITEMS.length + 1)
    check('...and the pack draws each one by its number as its 3D model, 3D everywhere, the shop too (a plain model with its own display.gui), a plain shard otherwise', drawn.length === ITEMS.length && after && /minecraft:item\/amethyst_shard/.test(JSON.stringify(after.model)) && shard.hand_animation_on_swap === false,
      `3D: ${drawn.map(i => i.model).join(' ')}; not: ${ITEMS.filter(i => !drawn.includes(i)).map(i => i.model).join(' ') || 'none'}`)
    const nugget = fs.readFileSync(path.join(PACK, 'minecraft', 'items', 'iron_nugget.json'), 'utf8')
    const proj = read('projectiles/Donating_Projectiles.yml').split(/^(?=\S)/m).find(p => p.startsWith('donating_throwing_knife:')) || ''
    const knife = JSON.parse(fs.readFileSync(path.join(PACK, 'donating', 'models', 'item', 'thrown_knife.json'), 'utf8'))
    const knifeOk = knife.elements.every(e => e.to[2] <= 12 && e.from[2] >= -16 && !e.faces.south)
    check('the thrown knife is an item display (iron nugget, custom model data 7004) and the pack draws it point first, nothing behind the eye', /Type: "ITEM_DISPLAY"/.test(proj) && /Custom_Model_Data: 7004/.test(proj) && /Gravity: 9\.8/.test(proj) &&
      /"threshold": 7004,\s*"model": \{\s*"type": "minecraft:model",\s*"model": "donating:item\/thrown_knife"/.test(nugget) && knifeOk)
    const breeze = fs.readFileSync(path.join(PACK, 'minecraft', 'items', 'breeze_rod.json'), 'utf8')
    const grappler = ((JSON.parse(breeze).model || {}).cases || []).find(c => c.when === 'donating:tool_grappler')
    const grappler3d = !!grappler && !/_icon"/.test(JSON.stringify(grappler.model)) && has3dGui('tool_grappler')
    check('the grappler, its hook and its rope have models (breeze_rod: donating:tool_grappler, donating:grapple_hook, donating:grapple_rope), the grappler 3D in the shop too',
      ['tool_grappler', 'grapple_hook', 'grapple_rope'].every(n => breeze.includes(`"when": "donating:${n}"`) && fs.existsSync(path.join(PACK, 'donating', 'models', 'item', `${n}.json`))) && grappler3d,
      `grappler ${grappler ? JSON.stringify(grappler.model) : 'missing'}`)
  }
  if (!['melee', 'throw', 'drink', 'bandage', 'speed', 'cop'].some(want)) return

  const rcon = await rconLib.connect()
  const cmd = c => rcon.cmd(c)
  let a = null
  let b = null
  let npc = null
  let shoveNpc = null
  try {
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    a = await join(A)
    b = await join(B)
    await cmd(`zzclear ${A}`)
    await cmd(`zzclear ${B}`)
    await cmd(`zzpassive ${B} off`) // a hard-killed run can leave it on
    // No natural regeneration: a heal in a hit's tick halved a drop (1.36 - 1), and it padded the Bandage's heal.
    await cmd('minecraft:gamerule natural_regeneration false')
    await sleep(6500) // a new player can't be hurt until its client says it has loaded (bots never do)
    // Every health drop of the target, in order.
    let drops = []
    let dropAt = [] // when each drop arrived (ms)
    let last = null
    b.on('health', () => {
      if (last !== null && b.health < last - 0.01) { drops.push(+(last - b.health).toFixed(2)); dropAt.push(Date.now()) }
      last = b.health
    })
    // Mineflayer 4.39 reads the 1.21.9+ velocity packet (already in blocks per tick) as the old 1/8000
    // units, so a bot never flies back from a hit; apply it the way the real client does.
    b._client.on('entity_velocity', p => { if (b.entity && p.entityId === b.entity.id) b.entity.velocity.set(p.velocity.x, p.velocity.y, p.velocity.z) })
    // The fight lane runs along +x: the attacker at x0+10, the target 3 blocks on (facing back, or
    // away for a backstab), so knockback pushes along the platform.
    const AX = X0 + 10.5
    const Z = Z0 + 4.5
    const place = async (dist = 3, away = false) => {
      await cmd(`minecraft:tp ${A} ${AX} ${Y} ${Z} -90 0`)
      await cmd(`minecraft:tp ${B} ${AX + dist} ${Y} ${Z} ${away ? -90 : 90} 0`)
      await sleep(3600) // pvp.sk's teleport immunity (3 s)
      await cmd(`zzshieldoff ${A}`)
      await cmd(`zzshieldoff ${B}`)
    }
    // 40 health (health boost doesn't change the damage), so nothing kills the target; checks use drops.
    const heal = async () => {
      await sleep(600)
      await cmd(`minecraft:effect give ${B} minecraft:health_boost 600 4 true`)
      await cmd(`minecraft:effect give ${B} minecraft:instant_health 1 10 true`)
      await cmd(`zzhp ${B} 40`)
      await sleep(400)
      last = b.health
      drops = []
      dropAt = []
    }
    const target = () => a.players[B] && a.players[B].entity
    // h = the height aimed at above the feet (1.0 the body; 1.6 the eyes, a head hit); who = the entity hit.
    const aim = async (h = 1.0, who = target) => { const t = who(); if (t) await a.lookAt(t.position.offset(0, h, 0), true) }
    const give = async (w, n, slot) => {
      await cmd(`minecraft:item replace entity ${A} hotbar.${slot} with minecraft:air`)
      await cmd(`wm give ${A} ${w} ${n} {slot:${slot}}`)
    }
    const wm = async () => (await cmd(`zzwm ${A}`)).trim()
    const countIn = async slot => Number(((await wm()).match(new RegExp(`(?:^WM |\\| )${slot}=[^:]+:\\d*x(\\d+)`)) || [])[1] || 0)
    const ground = async () => /passed/i.test(await cmd(`execute at ${A} if entity @e[type=item,distance=..20]`))
    // A new weapon in hand gets 1.5 s before its first swing (a swing right after switching sometimes
    // doesn't land for bots), and the look is sent before the attack.
    let held = -1
    const hold = async (slot, h = 1.0, who = target) => {
      if (held !== slot) { a.setQuickBarSlot(slot); held = slot; await sleep(1500) }
      await aim(h, who)
      await sleep(150)
    }
    // Swings `gap` ms apart until n hits landed (or 8 s ran out); returns the drops.
    const hitsOf = async (slot, n, gap, h = 1.0) => {
      await hold(slot, h)
      const end = Date.now() + 8000
      while (drops.length < n && Date.now() < end) {
        await aim(h)
        const t = target()
        if (t) a.attack(t)
        await sleep(gap)
      }
      await sleep(300)
      return drops.slice(0, n)
    }
    // Exactly n swings `gap` ms apart at who (the target bot by default); returns every drop of the target bot.
    const swing = async (slot, n, gap, h = 1.0, who = target) => {
      await hold(slot, h, who)
      for (let i = 0; i < n; i++) {
        await aim(h, who)
        const t = who()
        if (t) a.attack(t)
        await sleep(gap)
      }
      await sleep(400)
      return drops.slice()
    }
    // Past 3 blocks a real client sends no attack packet, only the swing: Paper's LEFT_CLICK_AIR, where
    // WeaponMechanics traces its own Melee_Range. One swing at the target `dist` blocks away (centre to centre).
    const swingOnly = async (slot, dist) => {
      await place(dist)
      await heal()
      await hold(slot)
      a.swingArm()
      await sleep(900)
      return drops.slice()
    }
    const flat = (p, q) => Math.hypot(p.x - q.x, p.z - q.z)
    const near = (l, v, tol = 0.06) => l.length > 0 && l.every(d => Math.abs(d - v) <= tol)
    const shots = d => Math.ceil(20 / d)
    const armor = async on => {
      await cmd(`minecraft:item replace entity ${B} armor.head with minecraft:${on ? 'diamond_helmet' : 'air'}`)
      await cmd(`minecraft:item replace entity ${B} armor.chest with minecraft:${on ? 'diamond_chestplate' : 'air'}`)
      await sleep(400)
    }

    // Thrown knives: item displays and the model they carry.
    const displayId = a.registry.entitiesByName.item_display.id
    const fakes = new Map()
    a._client.on('packet', (data, meta) => {
      if (meta.name === 'spawn_entity' && data.type === displayId) fakes.set(data.entityId, { model: null })
      const e = data && data.entityId !== undefined ? fakes.get(data.entityId) : null
      if (e && meta.name === 'entity_metadata') {
        const m = JSON.stringify(data.metadata).match(/custom_model_data[\s\S]{0,120}?(70\d\d)/)
        if (m) e.model = Number(m[1])
      }
    })
    const throwKnives = async (slot, n) => {
      a.setQuickBarSlot(slot)
      await sleep(1200)
      for (let i = 0; i < n; i++) {
        await aim(1.1)
        a.activateItem()
        await sleep(150)
        a.deactivateItem()
        await sleep(900) // Delay_Between_Shots 12 ticks, and the flight
      }
      await sleep(600)
      return drops.slice()
    }

    if (want('melee') || want('throw')) {
      await cmd(`minecraft:clear ${B}`)
      await give('Dagger', 1, 0)
      await give('Baseball_Bat', 1, 1)
      await give('Throwing_Knife', 6, 2)
    }
    for (const armored of [false, true]) {
      const tag = armored ? 'best gear' : 'no armor'
      const m = armored ? 0.34 : 1 // 1 + 11 × -6%
      const mb = armored ? 0.39 : 1.05 // ...and the Back +5% of a backstab
      if (want('melee')) {
        await armor(armored)
        await place()
        await heal()
        // 700 ms apart: the 12-tick limit is 600 ms.
        const kar = await hitsOf(0, 3, 700)
        check(`Karambit, ${tag}: ${(4 * m).toFixed(2)} a hit (${shots(4 * m)} hits), a hit every 12 ticks`, kar.length === 3 && near(kar, 4 * m), `drops ${kar.join(', ')}`)
        if (!armored) {
          await heal()
          // Swings every 250 ms (5 ticks): a 12-tick pace lands every 3rd (~750 ms apart), a 10-tick one every 2nd (~500).
          const fast = await swing(0, 8, 250)
          const gaps = dropAt.slice(1).map((t, i) => t - dropAt[i])
          check('...a hit every 12 ticks: of 8 swings 250 ms apart exactly 3 land, 580-900 ms apart', fast.length === 3 && near(fast, 4) && gaps.length === 2 && gaps.every(g => g >= 580 && g <= 900), `drops ${fast.join(', ')}; gaps ${gaps.join(', ')} ms`)
        }
        await place(3, true)
        await heal()
        const back = await hitsOf(0, 2, 700)
        check(`...from behind ${(5 * mb).toFixed(2)} (${shots(5 * mb)} hits): never more than an AK-48 shot in the back (5.78)`, back.length === 2 && near(back, 5 * mb), `drops ${back.join(', ')}`)
        await place()
        await heal()
        const before = b.entity.position.clone()
        const wr = await hitsOf(1, 1, 1600)
        const moved = b.entity.position.minus(before)
        const push = Math.sqrt(moved.x * moved.x + moved.z * moved.z)
        check(`Pipe Wrench, ${tag}: ${(5 * m).toFixed(2)} a hit (${shots(5 * m)} hits), knocked back 2.5-6 blocks`, wr.length === 1 && near(wr, 5 * m) && push >= 2.5 && push <= 6 && moved.x > 0, `drops ${wr.join(', ')}; pushed ${push.toFixed(2)} blocks (dx ${moved.x.toFixed(2)}, dy ${moved.y.toFixed(2)})`)
        if (!armored) {
          // A glass wall right behind the target keeps it in reach after the knockback.
          await cmd(`fill ${WALL} glass`)
          await place(2)
          await heal()
          const slow = await swing(1, 3, 800)
          await cmd(`fill ${WALL} air`)
          check('...one hit per 28 ticks (3 swings 800 ms apart: the 1st and the 3rd land)', slow.length === 2 && near(slow, 5), `drops ${slow.join(', ')}`)

          // A level swing usually lands at eye height: the head (config.yml's Head +15%).
          await place()
          await heal()
          const head = await hitsOf(1, 1, 1600, 1.6)
          check('...aimed at the eyes it\'s a head hit: 5.75 (still 4 hits)', head.length === 1 && near(head, 5.75), `drops ${head.join(', ')}`)

          // Reach on a swing alone (each swingOnly places the pair again: the miss delay, 28 ticks, is long over).
          const reach = await swingOnly(1, 3.6)
          check('...a swing alone (no attack packet, as a real client sends past 3 blocks) lands at 3.6 blocks: 5', reach.length === 1 && near(reach, 5), `drops ${reach.join(', ')}`)
          const far = await swingOnly(1, 4.5)
          check('...and nothing lands at 4.5 blocks (its range is 4)', far.length === 0, `drops ${far.join(', ')}`)

          // A passive player: no hit (pvp.sk cancels it), so no shove (items.sk only sees hits that land).
          await cmd(`zzpassive ${B} on`)
          await place()
          await heal()
          const p0 = b.entity.position.clone()
          const pas = await swing(1, 1, 1600)
          const pMoved = flat(b.entity.position, p0)
          await cmd(`zzpassive ${B} off`)
          check('...a passive player takes no hit and no shove', pas.length === 0 && pMoved < 0.3, `drops ${pas.join(', ')}; moved ${pMoved.toFixed(2)} blocks`)

          // A heist 2 blocks behind the target, along the shove (disabled: heistAt still sees its region).
          await cmd(`dheist delete ${HEIST} confirm`)
          await cmd(`zzregion heist_${HEIST} ${X0 + 15} ${Y - 1} ${Z0 + 2} ${X0 + 20} ${Y + 5} ${Z0 + 7}`)
          const made = await cmd(`dheist create ${HEIST} 1`)
          await place()
          await heal()
          const h0 = b.entity.position.clone()
          const hs = await hitsOf(1, 1, 1600)
          const hMoved = flat(b.entity.position, h0)
          await cmd(`dheist delete ${HEIST} confirm`)
          await cmd(`rg remove -w world heist_${HEIST}`)
          check('...never shoves anyone toward a heist: the hit lands (5) but no push with a heist 2 blocks behind the target', /created/.test(made) && hs.length === 1 && near(hs, 5) && hMoved < 0.3, `${made.trim()}; drops ${hs.join(', ')}; moved ${hMoved.toFixed(2)} blocks`)

          // A Citizens NPC (a cop or a hit target is one) in the target's spot: hit, never shoved.
          await cmd(`minecraft:tp ${B} ${X0 + 40.5} ${Y} ${Z0 + 0.5}`)
          const spot = new Vec3(AX + 3, Y, Z)
          const mark = fs.readFileSync(LOG, 'utf8').length
          await cmd(`zzconsole npc create ItmShove --at ${spot.x},${Y},${Z},world --type PLAYER`)
          await sleep(1500)
          const npcMade = fs.readFileSync(LOG, 'utf8').slice(mark).match(/ItmShove[^\n]*?ID (\d+)|ID (\d+)[^\n]*ItmShove/)
          shoveNpc = npcMade ? (npcMade[1] || npcMade[2]) : (((await cmd('zznpcs')).match(/id=(\d+) ItmShove /) || [])[1] || null)
          let nHp0 = NaN
          let nHp1 = NaN
          let nMoved = null
          if (shoveNpc) {
            await cmd(`zzconsole npc vulnerable --id ${shoveNpc}`)
            await cmd(`minecraft:tp ${A} ${AX} ${Y} ${Z} -90 0`)
            await sleep(3600) // pvp.sk's teleport immunity (3 s)
            await cmd(`zzshieldoff ${A}`)
            // Health in hearts (zznpcs). The hit takes 2.5 from a full 10; a fed NPC heals every 10 ticks (5/6, 4/6,
            // 3/6 ... HP) before the read, so the check asks for 1 heart: any drop at all means the hit landed.
            const npcHp = async () => Number(((await cmd('zznpcs')).match(new RegExp(`id=${shoveNpc} [^|]*hp=([\\d.]+)`)) || [])[1])
            const npcAt = () => Object.values(a.entities).find(e => e.type === 'player' && e.username !== A && e.username !== B && e.position.distanceTo(spot) < 8)
            const n0 = npcAt() ? npcAt().position.clone() : null
            nHp0 = await npcHp()
            await swing(1, 1, 300, 1.0, npcAt)
            nHp1 = await npcHp()
            const n1 = npcAt()
            nMoved = n0 && n1 ? flat(n1.position, n0) : null
            await cmd(`zzconsole npc remove ${shoveNpc}`)
            shoveNpc = null
          }
          check('...and never shoves a cop or another NPC: the hit lands on a Citizens NPC, which stays put', nHp0 - nHp1 >= 1.0 && nMoved !== null && nMoved < 0.3, `hp ${nHp0} -> ${nHp1} hearts (the hit 2.5, less up to ~1 of regeneration); moved ${nMoved === null ? '?' : nMoved.toFixed(2)} blocks`)
        }
      }
      if (want('throw')) {
        await armor(armored)
        await place(7)
        await heal()
        fakes.clear()
        const before = await countIn(2)
        const thrown = await throwKnives(2, 2)
        const after = await countIn(2)
        check(`Throwing Knife, ${tag}: ${(5 * m).toFixed(2)} a hit at 7 blocks (${shots(5 * m)} hits), one knife used per throw`, thrown.length === 2 && near(thrown, 5 * m) && after === before - 2, `drops ${thrown.join(', ')}; knives ${before} -> ${after}`)
        const models = [...fakes.values()].map(e => e.model)
        if (!armored) check('...each flies as an item display carrying custom model data 7004, and nothing lands on the ground', models.length === 2 && models.every(x => x === 7004) && !(await ground()), `displays ${models.join(', ')}`)
      }
    }
    await armor(false)

    // ---------- The Energy Drink ----------
    const effects = async () => (await cmd(`data get entity ${A} active_effects`)).trim()
    const speedOf = s => { const m = s.match(/\{[^{}]*id: "minecraft:speed"[^{}]*\}/); if (!m) return null; return { amp: Number((m[0].match(/amplifier: (\d+)b/) || [])[1]), dur: Number((m[0].match(/duration: (\d+)/) || [])[1]) } }
    const drink = async slot => {
      a.setQuickBarSlot(slot)
      held = slot
      await sleep(1200)
      a.activateItem()
      await sleep(150)
      a.deactivateItem()
      await sleep(500)
    }
    if (want('drink')) {
      await cmd(`minecraft:effect clear ${A}`)
      await give('Energy_Drink', 2, 3)
      await drink(3)
      const e = await effects()
      const sp = speedOf(e)
      check('Energy Drink: Speed II for 3 s (60 ticks), one can used, nothing left behind', sp && sp.amp === 1 && sp.dur > 30 && sp.dur <= 60 && (await countIn(3)) === 1 && !(await ground()), `${e}; ${await wm()}`)
      await sleep(3500)
      check('...and it wears off after 3 s', !speedOf(await effects()), await effects())
    }

    // ---------- The Bandage ----------
    if (want('bandage')) {
      await cmd(`minecraft:effect clear ${A}`)
      await give('Bandage', 2, 4)
      await cmd(`zzhp ${A} 8`) // 8 health (natural regeneration is off for this scenario)
      await sleep(500)
      const hp0 = a.health
      await drink(4)
      await sleep(5000)
      const hp1 = a.health
      check('Bandage: heals 6 (3 hearts) over 4 s, one used, nothing left behind', Math.abs(hp1 - hp0 - 6) <= 1 && (await countIn(4)) === 1 && !(await ground()), `health ${hp0} -> ${hp1}; ${await wm()}`)
    }

    // ---------- Speed: sprinting over 60 blocks, counted in the bot's physics ticks ----------
    let ticks = 0
    a.on('physicsTick', () => { ticks++ })
    const run = async (jump, speed3) => {
      await cmd(`minecraft:effect clear ${A}`)
      await cmd(`zzhp ${A} 20`) // food 10: enough to sprint
      await cmd(`minecraft:tp ${A} ${X0 + 2.5} ${Y} ${Z0 + 4.5} -90 0`)
      await cmd(`minecraft:tp ${B} ${X0 + 2.5} ${Y} ${Z0 + 0.5}`)
      await sleep(1500)
      if (speed3) {
        await give('Energy_Drink', 1, 3)
        await drink(3)
      }
      a.setQuickBarSlot(6) // empty hands: no weapon's movement_speed
      held = 6
      await sleep(400)
      // Mineflayer 4.39 files 1.21.11's attribute updates under the wrong names, so its physics always
      // walks at the base 0.1: give it the server's movement speed (Speed III included), which is what
      // the real client gets. Its physics adds sprinting (×1.3) itself.
      const ms = Number(((await cmd(`attribute ${A} minecraft:movement_speed get`)).match(/(\d+(?:\.\d+)?)\s*$/) || [])[1])
      if (!a.entity.attributes) a.entity.attributes = {}
      a.entity.attributes['minecraft:movement_speed'] = { value: ms, modifiers: [] }
      attrs.push(ms.toFixed(3))
      await a.lookAt(new Vec3(X0 + 100, Y + 1.62, Z0 + 4.5), true)
      a.setControlState('forward', true)
      a.setControlState('sprint', true)
      if (jump) a.setControlState('jump', true)
      let t1 = null
      let t2 = null
      const end = Date.now() + 20000
      while (Date.now() < end) {
        const x = a.entity.position.x
        if (t1 === null && x >= X0 + 20) t1 = ticks
        if (x >= X0 + 80) { t2 = ticks; break }
        await sleep(5)
      }
      a.clearControlStates()
      await sleep(500)
      return t1 !== null && t2 !== null ? 60 / ((t2 - t1) / 20) : null
    }
    const speeds = {}
    const attrs = []
    if (want('speed')) {
      speeds.sprint = await run(false, false)
      speeds.sprint3 = await run(false, true)
      speeds.jump = await run(true, false)
      speeds.jump3 = await run(true, true)
      const f = v => v ? v.toFixed(2) : '?'
      check('sprint speed with Speed II is about 1.4× (vanilla: 5.61 -> about 7.9 blocks/s)', speeds.sprint && speeds.sprint3 && Math.abs(speeds.sprint3 / speeds.sprint - 1.4) < 0.08,
        `movement_speed ${attrs.join('/')}; sprint ${f(speeds.sprint)} b/s, sprint + Speed II ${f(speeds.sprint3)} b/s; sprint-jumping ${f(speeds.jump)} b/s, with Speed II ${f(speeds.jump3)} b/s`)
      // A collapsing floor (traps.sk) cracks at the first touch (checked every 2 ticks) and drops 10 ticks
      // later (also on the 2-tick pass): 10-13 ticks. Crossing a floor L long means moving L + 0.6 (the
      // player's box, 0.3 each side) in that time, so the longest floor a straight run gets over is
      // v × t - 0.6.
      const fl = v => `${(v * 0.5 - 0.6).toFixed(1)}-${(v * 0.65 - 0.6).toFixed(1)}`
      const t6 = v => (6.6 / v).toFixed(2)
      check('collapsing floor (6 long, drops 0.5-0.65 s after the first touch): the time to get across 6.6 blocks',
        true, `sprint ${t6(speeds.sprint)} s (crossable floor ${fl(speeds.sprint)} blocks), Speed II sprint ${t6(speeds.sprint3)} s (${fl(speeds.sprint3)}), sprint-jump ${t6(speeds.jump)} s (${fl(speeds.jump)}), Speed II sprint-jump ${t6(speeds.jump3)} s (${fl(speeds.jump3)})`)
    }

    // ---------- A cop's pace: a Citizens NPC walking at speed 1.3 (cops.sk difficulty 4) ----------
    if (want('cop')) {
      const mark = fs.readFileSync(LOG, 'utf8').length
      await cmd(`minecraft:tp ${A} ${X0 + 2.5} ${Y} ${Z0 + 7.5} -90 0`)
      await cmd(`zzconsole npc create ItmPace --at ${X0 + 2.5},${Y},${Z0 + 2.5},world --type PLAYER`)
      await sleep(1500)
      const made = fs.readFileSync(LOG, 'utf8').slice(mark).match(/ItmPace[^\n]*?ID (\d+)|ID (\d+)[^\n]*ItmPace/)
      npc = made ? (made[1] || made[2]) : null
      let pace = null
      if (npc) {
        await cmd(`zzconsole npc speed 1.3 --id ${npc}`)
        await sleep(500)
        await cmd(`zzconsole npc pathto ${X0 + 95} ${Y} ${Z0 + 2.5} --id ${npc}`)
        const find = () => Object.values(a.entities).find(e => e.type === 'player' && e.username !== A && e.username !== B && Math.abs(e.position.z - (Z0 + 2.5)) < 1.5 && e.position.x > X0 && e.position.x < X0 + 100)
        let t1 = null
        let t2 = null
        const end = Date.now() + 30000
        while (Date.now() < end) {
          const e = find()
          if (e && t1 === null && e.position.x >= X0 + 20) t1 = Date.now()
          if (e && e.position.x >= X0 + 80) { t2 = Date.now(); break }
          await sleep(20)
        }
        if (t1 !== null && t2 !== null) pace = 60 / ((t2 - t1) / 1000)
      }
      speeds.cop = pace
      const gap = v => pace && v ? ((v - pace) * 3).toFixed(0) : '?'
      check('a Citizens NPC at speed 1.3 (the hardest cops) walks about 1.3 × 4.32 = 5.6 blocks/s', pace && pace > 4.5 && pace < 6.8,
        `NPC ${npc || 'not made'}: ${pace ? pace.toFixed(2) : '?'} b/s; 3 s of Speed II sprinting gains ${gap(speeds.sprint3)} blocks on it (plain sprinting ${gap(speeds.sprint)}; sprint-jumping ${gap(speeds.jump)}, with Speed II ${gap(speeds.jump3)})`)
    }
  } finally {
    await cmd('minecraft:gamerule natural_regeneration true').catch(() => {})
    if (npc) await cmd(`zzconsole npc remove ${npc}`).catch(() => {})
    if (shoveNpc) await cmd(`zzconsole npc remove ${shoveNpc}`).catch(() => {})
    // By name too: an NPC whose id was never found (Citizens spawns it late) is saved and would outlive the test.
    if (want('melee')) await cmd('zzconsole npc remove ItmShove').catch(() => {})
    if (want('cop')) await cmd('zzconsole npc remove ItmPace').catch(() => {})
    await cmd(`zzpassive ${B} off`).catch(() => {})
    await cmd(`dheist delete ${HEIST} confirm`).catch(() => {})
    await cmd(`rg remove -w world heist_${HEIST}`).catch(() => {})
    await cmd(`fill ${WALL} air`).catch(() => {})
    await cmd(`minecraft:clear ${A}`).catch(() => {})
    await cmd(`minecraft:clear ${B}`).catch(() => {})
    await cmd(`minecraft:effect clear ${A}`).catch(() => {})
    await cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    if (a) await quit(a)
    if (b) await quit(b)
    await cmd(`fill ${PLATFORM} air`).catch(() => {})
    rcon.close()
  }
}
