// Melee weapons and consumables (owner, 2026-09-28: "more melee weapons/consumables (dagger,
// throwable knife, grappler ..., energy drink (15 seconds speed 3, test this one out to balance it)"; 2026-10-13:
// "get some melee ideas from pg3d and replace some of the melees we have now", then "add 3, 7, and replace karambit
// with 4. make sure to have swing animations if applicable").
// The damage rule (owner, 2026-09-26): the strongest gun (AK-48, 5.5 a body shot) kills an unarmored
// player in 4 hits and one in the best gear (Tactical Helmet 3 + Heavy Vest 8 = 11 armor points: -66%
// at Per_Armor_Point -6%) in 10-12, and nothing is stronger; every melee does base + bonus <= 5.0 (2026-10-13).
// An attacker bot hits a target bot 3 blocks away (each health drop is one hit): the Katana (title Dagger) 5 every 16
// ticks, 5.25 from behind (config.yml's Back +5%), reach 4.5, a 10-tick whack (DonatingPhone's MeleeFx); the Brass
// Knuckles 3.5 every 12 ticks, reach 3.3, punch frames on a 6-tick clock (donating:melee/brass_knuckles) and no client
// swing (it would bend the glove's sleeve onto the screen); the Gold Nunchucks 3 every 9 ticks, reach 3.5, no client
// swing (a whack hid the twirl below the screen), the chain's 12-tick clock (donating:melee/gold_nunchucks), and a gold burst on hits that land (items.sk);
// the Pipe Wrench (title Baseball_Bat) 5 with knockback, a hit every 28 ticks, a 14-tick whack, 5.75 at the eyes (the
// Head +15%), landing past 3 blocks on a swing alone (WeaponMechanics' own 4-block reach), and never shoving a passive
// player, an NPC or anyone toward a heist; a Throwing Knife 5 (one used per throw, flying as an item display with
// custom model data 7004), then the same through the best gear. The pack draws the melees and consumables 3D in the
// shop too (no 2D icons); the knuckles' and the nunchucks' first person are frames on their clocks. The Energy Drink
// gives Speed II for 3 s (owner, 2026-09-28, after Speed III for 15 s was tested), the Bandage heals 6 over 4 s, and
// both are used up with nothing left behind.
// Balance numbers for the drink: sprint speed over 60 blocks with and without Speed III (and sprint
// jumping), a Citizens NPC walking at the cops' 1.3 speed, and what those mean for a collapsing floor
// and a chase (printed in the check details).
// Usage: bots/run.js wm-melee [static] [melee] [fx] [throw] [drink] [bandage] [speed] [cop]  (default: all)
//   fx = MeleeFx: the swing and chain components on the items, the chain clocks, /dphone melee
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
const PHONE_CONFIG = path.join(__dirname, '..', '..', 'plugin', 'resources', 'config.yml')
const LOG = path.join(__dirname, '..', '..', 'server', 'logs', 'latest.log')
// model = the pack's donating:item/<model> that draws it outside first person (3D everywhere, the shop and hotbar too);
// fp = what its first person adds (hands: our glove and sleeve; chain: the nunchucks' twirl); chain = its MeleeFx
// clock's ticks (= the number of first-person frames).
const ITEMS = [
  { w: 'Dagger', file: 'weapons/melee/Dagger.yml', cmd: 1, model: 'melee_katana_full' },
  { w: 'Baseball_Bat', file: 'weapons/melee/Baseball_Bat.yml', cmd: 2, model: 'pipe_wrench' },
  { w: 'Throwing_Knife', file: 'weapons/consumables/Throwing_Knife.yml', cmd: 3, model: 'throwing_knife', consumable: true },
  { w: 'Energy_Drink', file: 'weapons/consumables/Energy_Drink.yml', cmd: 4, model: 'energy_drink', consumable: true },
  { w: 'Bandage', file: 'weapons/consumables/Bandage.yml', cmd: 5, model: 'bandage', consumable: true },
  { w: 'Brass_Knuckles', file: 'weapons/melee/Brass_Knuckles.yml', cmd: 6, model: 'melee_knuckles_full', fp: 'hands', chain: 6 },
  { w: 'Gold_Nunchucks', file: 'weapons/melee/Gold_Nunchucks.yml', cmd: 7, model: 'melee_nunchucks_full', fp: 'chain', chain: 12 }
]
const PLAIN_SHARD = 8 // the threshold after ours: the plain amethyst shard
const MELEE = ['Combat_Knife', 'Baseball_Bat', 'Brass_Knuckles', 'Dagger', 'Gold_Nunchucks']
// Reach, hit delay and miss delay of the melees of 2026-10-13.
const PACE = { Brass_Knuckles: [3.3, 12, 12], Gold_Nunchucks: [3.5, 9, 9], Dagger: [4.5, 16, 16] }
// DonatingPhone's meleefx list (plugin/resources/config.yml).
const SWINGS = {
  Baseball_Bat: { swing: 'whack', ticks: '14' },
  Brass_Knuckles: { swing: 'none', chain: '6' },
  Gold_Nunchucks: { swing: 'none', chain: '12' },
  Dagger: { swing: 'whack', ticks: '10' }
}
const KNUCKLE_HANDS = ['donating:item/hands/melee_knuckles_rglove', 'donating:item/hands/melee_knuckles_arm']
const GOLD = [[255, 212, 64], [214, 158, 30]] // items.sk's two gold dusts
const HEIST = 'zshove' // a disabled heist 2 blocks behind the wrench's target (never shoved toward it)
const WALL = `${X0 + 13} ${Y} ${Z0 + 3} ${X0 + 13} ${Y + 2} ${Z0 + 6}` // glass right behind the target

module.exports = async ({ check, args = [] }) => {
  const want = s => args.length === 0 || args.includes(s)
  const read = f => fs.readFileSync(path.join(WM, f), 'utf8')
  const strip = f => read(f).split(/\r?\n/).filter(l => !l.trim().startsWith('#')).join('\n')

  // ---------- The files and the pack ----------
  if (want('static')) {
    const bad = ITEMS.filter(it => {
      const t = strip(it.file)
      return !/Drop_Item: true/.test(t) || !/Swap_Hands: true/.test(t) || !/Deny_Use_In_Crafting: true/.test(t) ||
        /Dual_Wielding|FEATHER|Arm_Swing_Animation/.test(t) || !/Type: "AMETHYST_SHARD"/.test(t) || !new RegExp(`Custom_Model_Data: ${it.cmd}\\b`).test(t) ||
        (it.consumable && !/Consume_Item_On_Shoot: true/.test(t))
    })
    check('each new item cancels Q and F, never crafts, has no Dual_Wielding or Arm_Swing_Animation rule, is an amethyst shard with its model number, and consumables are used up', bad.length === 0, bad.map(i => i.w).join(', '))
    // The melee rule (2026-10-13): Base_Damage + any bonus <= 5.0 (the AK-48 does 5.5), and no keys WeaponMechanics
    // 4.3.1 never reads (Damage.Victim_Mechanics left the knife's hits silent; Show_Time is the paid Cosmetics add-on's),
    // nor Info.Cancel.Arm_Swing_Animation (it would also hide the swing from DonatingPhone's MeleeFx).
    const melee = MELEE.map(w => {
      const t = strip(`weapons/melee/${w}.yml`)
      const num = re => Number((t.match(re) || [])[1])
      const bonus = [...t.matchAll(/Bonus_Damage: ([\d.]+)/g)].reduce((s, x) => s + Number(x[1]), 0) // WeaponMechanics adds them together
      return {
        w,
        t,
        top: num(/Base_Damage: ([\d.]+)/) + bonus,
        dead: /Victim_Mechanics|Show_Time|Arm_Swing_Animation/.test(t),
        range: num(/Melee_Range: ([\d.]+)/),
        hit: num(/Melee_Hit_Delay: (\d+)/),
        miss: num(/Melee_Miss_Delay: (\d+)/),
        speed: num(/"attack_speed (-?[\d.]+)"/)
      }
    })
    check('every melee does at most 5.0 a hit with its bonuses, and keeps no keys WeaponMechanics never reads (nor Arm_Swing_Animation)', melee.every(x => x.top <= 5 && !x.dead), melee.map(x => `${x.w} ${x.top}${x.dead ? ' (dead keys)' : ''}`).join(', '))
    check('the new melees\' reach and pace: Brass Knuckles 3.3 blocks / 12 ticks, Gold Nunchucks 3.5 / 9, Katana (Dagger) 4.5 / 16 (the miss delay the same)',
      Object.entries(PACE).every(([w, [r, h, m]]) => { const x = melee.find(y => y.w === w); return x && x.range === r && x.hit === h && x.miss === m }),
      melee.map(x => `${x.w} ${x.range}/${x.hit}/${x.miss}`).join(', '))
    check('each melee\'s attack_speed matches its pace (4 + attack_speed = 20 / Melee_Hit_Delay hits a second, within 0.02)', melee.every(x => Math.abs(4 + x.speed - 20 / x.hit) <= 0.02),
      melee.map(x => `${x.w} ${(4 + x.speed).toFixed(2)} vs ${(20 / x.hit).toFixed(3)}`).join(', '))
    check('every melee reaches at least 3.3 blocks (3.0 exactly turns lag-edge hits into misses with a full miss lockout)', melee.every(x => x.range >= 3.3), melee.map(x => `${x.w} ${x.range}`).join(', '))
    const nun = melee.find(x => x.w === 'Gold_Nunchucks')
    const nunHit = ((nun ? nun.t : '').match(/^ {2}Damage:\n[\s\S]*?^ {4}Mechanics:\n((?: +- .*(?:\n|$))+)/m) || [])[1] || ''
    check('the Gold Nunchucks ring the till on a hit that lands (Damage.Mechanics: experience_orb.pickup, delayed)', /experience_orb\.pickup[^"\n]*delayBeforePlay=\d+/.test(nunHit), nunHit.trim() || 'no Damage.Mechanics')

    const shard = JSON.parse(fs.readFileSync(path.join(PACK, 'minecraft', 'items', 'amethyst_shard.json'), 'utf8'))
    const entries = (shard.model && shard.model.entries) || []
    const entryOf = it => entries.find(x => x.threshold === it.cmd)
    const modelJson = name => { try { return JSON.parse(fs.readFileSync(path.join(PACK, 'donating', 'models', 'item', `${name}.json`), 'utf8')) } catch (err) { return null } }
    // A 3D model that sets its own shop and hotbar view (display.gui), like the Drill and the Safe Kit: its elements and
    // its gui display may come from a parent (donating: models only).
    const has3dGui = name => {
      let els = false
      let gui = false
      for (let n = name, k = 0; n && k < 8; k++) {
        const m = modelJson(n)
        if (!m) return false
        if (Array.isArray(m.elements) && m.elements.length > 0) els = true
        if (m.display && m.display.gui) gui = true
        const parent = typeof m.parent === 'string' && m.parent.match(/^donating:item\/(.+)$/)
        n = parent ? parent[1] : null
      }
      return els && gui
    }
    // The model an entry draws outside first person: a plain model (1-5), or a select's fallback (6, 7: first person
    // is its own case).
    const isType = (m, t) => !!m && typeof m.type === 'string' && new RegExp(`(^|:)${t}$`).test(m.type)
    const outside = e => {
      if (!e || !e.model) return null
      if (isType(e.model, 'model')) return e.model.model
      if (isType(e.model, 'select') && isType(e.model.fallback, 'model')) return e.model.fallback.model
      return null
    }
    const drawn = ITEMS.filter(it => outside(entryOf(it)) === `donating:item/${it.model}` && has3dGui(it.model))
    const after = entries.find(e => e.threshold === PLAIN_SHARD)
    check('...and the pack draws each one by its number as its 3D model, 3D everywhere, the shop too (its own display.gui), a plain shard from 8 on', drawn.length === ITEMS.length && after && /minecraft:item\/amethyst_shard/.test(JSON.stringify(after.model)) && shard.hand_animation_on_swap === false,
      `3D: ${drawn.map(i => i.model).join(' ')}; not: ${ITEMS.filter(i => !drawn.includes(i)).map(i => `${i.model} (${JSON.stringify((entryOf(i) || {}).model || null).slice(0, 120)})`).join(' ') || 'none'}`)
    // First person (the right hand's case): the frames on the item cooldown that MeleeFx's chain clock starts.
    const firstPerson = e => {
      const m = e && e.model
      if (!isType(m, 'select')) return null
      const c = (m.cases || []).find(x => [].concat(x.when).includes('firstperson_righthand'))
      return c ? c.model : null
    }
    const isClock = m => isType(m, 'range_dispatch') && /(^|:)cooldown$/.test(m.property || '') && Array.isArray(m.entries)
    const frames = it => { const fp = firstPerson(entryOf(it)); return isClock(fp) ? fp.entries.length : 0 }
    const draws = (m, id) => JSON.stringify(m || null).includes(`"${id}`)
    const knuckles = ITEMS.find(i => i.w === 'Brass_Knuckles')
    const kEntry = entryOf(knuckles)
    const kfp = firstPerson(kEntry)
    const kAll = isClock(kfp) ? [...kfp.entries.map(x => x.model), kfp.fallback] : []
    check('the Brass Knuckles\' first person is 6 punch frames on the item cooldown, every frame and the rest pose with our glove and sleeve; outside first person no hands',
      isClock(kfp) && kfp.entries.length === 6 && kAll.every(m => KNUCKLE_HANDS.every(h => draws(m, h))) && !draws(kEntry && kEntry.model && kEntry.model.fallback, 'donating:item/hands/') && !draws(modelJson(knuckles.model), 'donating:item/hands/'),
      `frames ${frames(knuckles)}; with hands ${kAll.filter(m => KNUCKLE_HANDS.every(h => draws(m, h))).length}/${kAll.length}`)
    const nunchucks = ITEMS.find(i => i.w === 'Gold_Nunchucks')
    check('the Gold Nunchucks\' first person is 12 twirl frames on the item cooldown', frames(nunchucks) === 12, `frames ${frames(nunchucks)}; ${JSON.stringify(firstPerson(entryOf(nunchucks)) || null).slice(0, 160)}`)

    // DonatingPhone's meleefx list: each melee's swing, and the chain clocks as long as their frames.
    const fx = {}
    {
      let inFx = false
      let inMelee = false
      for (const l of fs.readFileSync(PHONE_CONFIG, 'utf8').split(/\r?\n/)) {
        if (/^\s*(#.*)?$/.test(l)) continue
        if (/^\S/.test(l)) { inFx = /^meleefx:/.test(l); inMelee = false; continue }
        if (!inFx) continue
        if (/^ {2}\S/.test(l)) { inMelee = /^ {2}melee:/.test(l); continue }
        const m = inMelee && l.match(/^ {4}([A-Za-z0-9_]+):\s*\{(.*)\}\s*(#.*)?$/)
        if (m) fx[m[1]] = Object.fromEntries(m[2].split(',').map(x => x.split(':').map(y => y.trim())).filter(x => x[0]))
      }
    }
    check('DonatingPhone\'s meleefx (the jar\'s config.yml): the Pipe Wrench a 14-tick whack, the Brass Knuckles none with a 6-tick chain, the Gold Nunchucks none with a 12-tick chain, the Katana a 10-tick whack',
      Object.keys(fx).sort().join() === Object.keys(SWINGS).sort().join() && Object.entries(SWINGS).every(([w, s]) => Object.entries(s).every(([k, v]) => fx[w][k] === v) && (s.chain || !fx[w].chain || fx[w].chain === '0')), JSON.stringify(fx))
    const chained = ITEMS.filter(i => i.chain)
    check('...each chain as long as its first-person frames', chained.every(i => fx[i.w] && Number(fx[i.w].chain) === frames(i) && frames(i) === i.chain), chained.map(i => `${i.w} chain ${fx[i.w] && fx[i.w].chain} frames ${frames(i)}`).join(', '))
    const gloved = ITEMS.filter(i => draws(firstPerson(entryOf(i)), 'donating:item/hands/'))
    check('...and a melee drawn with our gloves never gets the client\'s swing (swing: none: it would turn the whole item, sleeve included)', gloved.length > 0 && gloved.every(i => fx[i.w] && fx[i.w].swing === 'none'), gloved.map(i => `${i.w} ${fx[i.w] && fx[i.w].swing}`).join(', '))

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
  if (!['melee', 'fx', 'throw', 'drink', 'bandage', 'speed', 'cop'].some(want)) return

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
    // The attacker's item cooldowns (MeleeFx's chain clocks; an ended one arrives with 0 ticks).
    const cds = []
    a._client.on('set_cooldown', p => cds.push({ t: Date.now(), group: p.cooldownGroup, ticks: p.cooldownTicks }))
    const clocksSince = (t0, group) => cds.filter(c => c.t >= t0 && c.ticks > 0 && (group instanceof RegExp ? group.test(c.group) : c.group === group))
    // Gold dust near the target (items.sk's burst on a Gold Nunchucks hit): only dust in items.sk's two golds (±2 a channel).
    const gold = []
    const dustId = a.registry.particlesByName.dust ? a.registry.particlesByName.dust.id : -1
    a._client.on('world_particles', p => {
      const q = p.particle
      if (!q || (q.type !== 'dust' && q.type !== dustId && q.particleId !== dustId) || !q.data || q.data.color === undefined) return
      const c = q.data.color & 0xFFFFFF
      const rgb = [(c >> 16) & 255, (c >> 8) & 255, c & 255]
      if (!GOLD.some(g => g.every((v, i) => Math.abs(v - rgb[i]) <= 2))) return
      gold.push({ t: Date.now(), rgb, pos: new Vec3(p.x, p.y, p.z) })
    })
    // Gold dust within 2 blocks of `at` (the target bot by default) since t0.
    const goldSince = (t0, at = b.entity && b.entity.position) => gold.filter(g => g.t >= t0 && at && g.pos.distanceTo(at) <= 2)
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

    if (want('melee') || want('throw') || want('fx')) {
      await cmd(`minecraft:clear ${B}`)
      await give('Dagger', 1, 0)
      await give('Baseball_Bat', 1, 1)
      await give('Throwing_Knife', 6, 2)
      await give('Brass_Knuckles', 1, 3)
      await give('Gold_Nunchucks', 1, 4)
      await sleep(500)
    }

    // ---------- MeleeFx (DonatingPhone): the client's swing and the chain clock's group on each melee ----------
    const comp = async (slot, c) => (await cmd(`data get entity ${A} Inventory[{Slot:${slot}b}].components."minecraft:${c}"`)).trim()
    // swing_animation as the server saves it: type and duration are left out when they're the defaults (whack, 6).
    const swingOf = async slot => {
      const raw = await comp(slot, 'swing_animation')
      if (!/following entity data/.test(raw)) return { raw, type: null, ticks: null }
      return { raw, type: ((raw.match(/type: "(?:minecraft:)?([a-z_]+)"/) || [])[1]) || 'whack', ticks: Number((raw.match(/duration: (\d+)/) || [])[1] || 6) }
    }
    const groupOf = async slot => ((await comp(slot, 'use_cooldown')).match(/cooldown_group: "([^"]+)"/) || [])[1] || null
    const knucklesFx = async () => {
      const s = await swingOf(3)
      const g = await groupOf(3)
      return { ok: s.type === 'none' && g === 'donating:melee/brass_knuckles', info: `swing ${s.raw}; group ${g}` }
    }
    if (want('fx')) {
      const st = (await cmd('dphone melee')).trim()
      check('/dphone melee: on, with the four melees (the wrench a 14-tick whack, the knuckles none with a 6-tick chain, the nunchucks none with a 12-tick chain, the Katana a 10-tick whack)',
        /enabled=true/.test(st) && /Baseball_Bat\{whack 14\}/.test(st) && /Brass_Knuckles\{none 6 chain 6 donating:melee\/brass_knuckles\}/.test(st) && /Gold_Nunchucks\{none 6 chain 12 donating:melee\/gold_nunchucks\}/.test(st) && /Dagger\{whack 10\}/.test(st), st)
      const k = await knucklesFx()
      check('the Brass Knuckles carry no client swing (swing_animation none) and their chain\'s cooldown group (donating:melee/brass_knuckles)', k.ok, k.info)
      const ns = await swingOf(4)
      const ng = await groupOf(4)
      check('the Gold Nunchucks no client swing (their twirl frames are the strike) and their group (donating:melee/gold_nunchucks)', ns.type === 'none' && ng === 'donating:melee/gold_nunchucks', `swing ${ns.raw}; group ${ng}`)
      const ks = await swingOf(0)
      const ws = await swingOf(1)
      check('the Katana a 10-tick whack and the Pipe Wrench a 14-tick one', ks.type === 'whack' && ks.ticks === 10 && ws.type === 'whack' && ws.ticks === 14, `katana ${ks.raw}; wrench ${ws.raw}`)
    }
    for (const armored of [false, true]) {
      const tag = armored ? 'best gear' : 'no armor'
      const m = armored ? 0.34 : 1 // 1 + 11 × -6%
      const mb = armored ? 0.39 : 1.05 // ...and the Back +5% of a backstab
      if (want('melee')) {
        await armor(armored)
        const gapsOf = () => dropAt.slice(1).map((t, i) => t - dropAt[i])

        // ---------- The Katana (title Dagger): 5 every 16 ticks, reach 4.5 ----------
        await place()
        await heal()
        // 900 ms apart: the 16-tick limit is 800 ms.
        const kat = await hitsOf(0, 3, 900)
        check(`Katana (title Dagger), ${tag}: ${(5 * m).toFixed(2)} a hit (${shots(5 * m)} hits), a hit every 16 ticks`, kat.length === 3 && near(kat, 5 * m), `drops ${kat.join(', ')}`)
        if (!armored) {
          await heal()
          // Swings every 300 ms (6 ticks): a 16-tick pace lands every 3rd (~900 ms apart).
          const katPace = await swing(0, 7, 300)
          const katGaps = gapsOf()
          check('...a hit every 16 ticks: of 7 swings 300 ms apart exactly 3 land, 780-1050 ms apart', katPace.length === 3 && near(katPace, 5) && katGaps.length === 2 && katGaps.every(g => g >= 780 && g <= 1050), `drops ${katPace.join(', ')}; gaps ${katGaps.join(', ')} ms`)
          // Reach on a swing alone (Paper sends WeaponMechanics a swing only when its own 3.0 ray finds nothing nearer).
          const katReach = await swingOnly(0, 4.6)
          check('...a swing alone lands at 4.6 blocks (its reach is 4.5, the longest of any melee): 5', katReach.length === 1 && near(katReach, 5), `drops ${katReach.join(', ')}`)
          const katFar = await swingOnly(0, 5.1)
          check('...and nothing lands at 5.1 blocks', katFar.length === 0, `drops ${katFar.join(', ')}`)
        }
        await place(3, true)
        await heal()
        const back = await hitsOf(0, 2, 900)
        check(`...from behind ${(5 * mb).toFixed(2)} (${shots(5 * mb)} hits): never more than an AK-48 shot in the back (5.78)`, back.length === 2 && near(back, 5 * mb), `drops ${back.join(', ')}`)

        // ---------- The Brass Knuckles: 3.5 every 12 ticks, reach 3.3 ----------
        await place()
        await heal()
        // 700 ms apart: the 12-tick limit is 600 ms.
        const kn = await hitsOf(3, 3, 700)
        check(`Brass Knuckles, ${tag}: ${(3.5 * m).toFixed(2)} a hit (${shots(3.5 * m)} hits), a hit every 12 ticks`, kn.length === 3 && near(kn, 3.5 * m), `drops ${kn.join(', ')}`)
        if (!armored) {
          await heal()
          // Swings every 250 ms (5 ticks): a 12-tick pace lands every 3rd (~750 ms apart).
          const knPace = await swing(3, 8, 250)
          const knGaps = gapsOf()
          check('...a hit every 12 ticks: of 8 swings 250 ms apart exactly 3 land, 580-900 ms apart', knPace.length === 3 && near(knPace, 3.5) && knGaps.length === 2 && knGaps.every(g => g >= 580 && g <= 900), `drops ${knPace.join(', ')}; gaps ${knGaps.join(', ')} ms`)
          // 3.45 blocks apart: Paper's ray (3.0) finds nothing, WeaponMechanics' (about 3.2 long) reaches.
          const knReach = await swingOnly(3, 3.45)
          check('...a swing alone lands at 3.45 blocks (its reach is 3.3, past the client\'s 3.0): 3.5', knReach.length === 1 && near(knReach, 3.5), `drops ${knReach.join(', ')}`)
          const knFar = await swingOnly(3, 3.9)
          check('...and nothing lands at 3.9 blocks', knFar.length === 0, `drops ${knFar.join(', ')}`)
        }

        // ---------- The Gold Nunchucks: 3 every 9 ticks, reach 3.5, a gold burst on a hit that lands ----------
        await place()
        await heal()
        // 600 ms apart: the 9-tick limit is 450 ms.
        const nu = await hitsOf(4, 3, 600)
        check(`Gold Nunchucks, ${tag}: ${(3 * m).toFixed(2)} a hit (${shots(3 * m)} hits), a hit every 9 ticks`, nu.length === 3 && near(nu, 3 * m), `drops ${nu.join(', ')}`)
        if (!armored) {
          await heal()
          // Swings every 250 ms (5 ticks): a 9-tick pace lands every 2nd (~500 ms apart).
          // 300 ms apart: the swings 600 ms after a hit land (150 ms past the 450 ms gate), those 300 ms after are refused.
          const nuPace = await swing(4, 7, 300)
          const nuGaps = gapsOf()
          check('...a hit every 9 ticks: of 7 swings 300 ms apart exactly 4 land, 520-720 ms apart', nuPace.length === 4 && near(nuPace, 3) && nuGaps.length === 3 && nuGaps.every(g => g >= 520 && g <= 720), `drops ${nuPace.join(', ')}; gaps ${nuGaps.join(', ')} ms`)
          const nuReach = await swingOnly(4, 3.6)
          check('...a swing alone lands at 3.6 blocks (its reach is 3.5): 3', nuReach.length === 1 && near(nuReach, 3), `drops ${nuReach.join(', ')}`)
          const nuFar = await swingOnly(4, 4.1)
          check('...and nothing lands at 4.1 blocks', nuFar.length === 0, `drops ${nuFar.join(', ')}`)

          // The gold burst (items.sk): only on hits that land, only with the nunchucks.
          await place()
          await heal()
          let g0 = Date.now()
          const gh = await hitsOf(4, 1, 600)
          await sleep(300)
          const gHit = goldSince(g0)
          check('...a hit that lands bursts gold dust at the target (items.sk), within 600 ms of it', gh.length === 1 && gHit.length >= 1 && dropAt.length >= 1 && Math.abs(gHit[0].t - dropAt[0]) <= 600, `drops ${gh.join(', ')}; gold ${gHit.map(g => `${g.rgb.join('/')} +${dropAt.length ? g.t - dropAt[0] : '?'}ms`).join(', ') || 'none'}`)
          await cmd(`zzpassive ${B} on`)
          await place()
          await heal()
          g0 = Date.now()
          const gp = await swing(4, 1, 600)
          await sleep(300)
          const gPassive = goldSince(g0)
          await cmd(`zzpassive ${B} off`)
          check('...a passive player takes no hit and gets no gold burst', gp.length === 0 && gPassive.length === 0, `drops ${gp.join(', ')}; gold ${gPassive.length}`)
          await place()
          await heal()
          g0 = Date.now()
          const gk = await hitsOf(0, 1, 900)
          await sleep(300)
          const gKatana = goldSince(g0)
          check('...and a Katana hit makes no gold dust', gk.length === 1 && gKatana.length === 0, `drops ${gk.join(', ')}; gold ${gKatana.length}`)
        }

        // ---------- The Pipe Wrench (title Baseball_Bat): 5 with knockback every 28 ticks ----------
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
          let gHp0 = NaN
          let gHp1 = NaN
          let gNpc = null
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
            // A Gold Nunchucks hit on the NPC lands but bursts no gold (a hit target is seen by its hunter alone).
            const gn0 = Date.now()
            gHp0 = await npcHp()
            await swing(4, 1, 600, 1.0, npcAt)
            await sleep(300)
            gHp1 = await npcHp()
            gNpc = goldSince(gn0, spot).length
            await cmd(`zzconsole npc remove ${shoveNpc}`)
            shoveNpc = null
          }
          check('...and never shoves a cop or another NPC: the hit lands on a Citizens NPC, which stays put', nHp0 - nHp1 >= 1.0 && nMoved !== null && nMoved < 0.3, `hp ${nHp0} -> ${nHp1} hearts (the hit 2.5, less up to ~1 of regeneration); moved ${nMoved === null ? '?' : nMoved.toFixed(2)} blocks`)
          check('...and a Gold Nunchucks hit on a Citizens NPC lands but bursts no gold (a hit target is seen by its hunter alone)', gHp0 - gHp1 > 0 && gNpc === 0, `hp ${gHp0} -> ${gHp1} hearts; gold near it ${gNpc}`)
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

    // ---------- MeleeFx's chain clocks: a swing starts one, a swing in its first half doesn't start it again ----------
    if (want('fx')) {
      await cmd(`minecraft:tp ${A} ${AX} ${Y} ${Z} -90 0`)
      await cmd(`minecraft:tp ${B} ${AX + 6} ${Y} ${Z} 90 0`)
      // Swings into the sky (nothing in reach, so nothing is hit; Paper still fires the arm swing).
      const holdUp = async slot => {
        a.setQuickBarSlot(slot)
        held = slot
        await sleep(1500)
        await a.look(0, Math.PI / 2.2, true)
        await sleep(300)
      }
      await holdUp(4)
      let c0 = Date.now()
      a.swingArm()
      await sleep(100)
      a.swingArm()
      await sleep(600)
      const n1 = clocksSince(c0, 'donating:melee/gold_nunchucks')
      c0 = Date.now()
      a.swingArm()
      await sleep(400)
      a.swingArm()
      await sleep(300)
      const n2 = clocksSince(c0, 'donating:melee/gold_nunchucks')
      check('the Gold Nunchucks\' chain clock: a swing starts a 12-tick cooldown on donating:melee/gold_nunchucks (the twirl frames); a swing 100 ms later doesn\'t start it again, one 400 ms later (past half) does',
        n1.length === 1 && n1[0].ticks === 12 && n2.length === 2 && n2.every(c => c.ticks === 12), `100 ms: ${JSON.stringify(n1)}; 400 ms: ${JSON.stringify(n2)}`)
      await holdUp(3)
      c0 = Date.now()
      // 50 ms: two swings a tick or so apart (100 ms could land 3 ticks apart, past half of 6).
      a.swingArm()
      await sleep(50)
      a.swingArm()
      await sleep(500)
      const k1 = clocksSince(c0, 'donating:melee/brass_knuckles')
      c0 = Date.now()
      a.swingArm()
      await sleep(250)
      a.swingArm()
      await sleep(300)
      const k2 = clocksSince(c0, 'donating:melee/brass_knuckles')
      check('the Brass Knuckles\' punch clock: 6 ticks on donating:melee/brass_knuckles; two swings 50 ms apart start one, 250 ms apart (past half) two',
        k1.length === 1 && k1[0].ticks === 6 && k2.length === 2 && k2.every(c => c.ticks === 6), `50 ms: ${JSON.stringify(k1)}; 250 ms: ${JSON.stringify(k2)}`)
      // Swinging every tick (holding left-click on a block): each clock runs out before the next starts, so the frames
      // loop whole (the half rule alone would restart the 12-tick twirl every 7 ticks).
      await holdUp(4)
      c0 = Date.now()
      for (let i = 0; i < 40; i++) { a.swingArm(); await sleep(30) }
      await sleep(300)
      const nm = clocksSince(c0, 'donating:melee/gold_nunchucks')
      check('...swinging every tick (mining) lets each 12-tick twirl finish: 2-3 clocks in ~1.25 s (the half rule alone: 4)', nm.length >= 2 && nm.length <= 3 && nm.every(c => c.ticks === 12), JSON.stringify(nm))
      c0 = Date.now()
      for (const slot of [0, 1]) {
        await holdUp(slot)
        a.swingArm()
        await sleep(400)
      }
      const plain = clocksSince(c0, /^donating:melee\//)
      check('the Katana and the Pipe Wrench start no chain clock (a whack only)', plain.length === 0, JSON.stringify(plain))
      const k = await knucklesFx()
      check('...and after the fights the Brass Knuckles still carry no client swing and their group', k.ok, k.info)
    }

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
