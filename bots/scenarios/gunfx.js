// DonatingPhone's GunFx (the guns' first-person animations, 2026-10-05): the clocks it starts (vanilla item cooldowns on
// each gun's own group, seen as set_cooldown packets) and the review's fixes: no clock for a reload WeaponMechanics
// refuses for want of ammo, the shotgun's kick-only shot when it doesn't pump, the firing flag of the automatic guns,
// a click on a block still firing while a clock runs, and aiming during a reload ending its clock.
const { Vec3 } = require('vec3')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const NAME = 'FxBot'
const X = 7720; const Y = 160; const Z = 7720
const CHUNKS = `${X - 8} ${Z - 8} ${X + 8} ${Z + 8}`
const PILLAR = new Vec3(X, Y, Z + 2) // a stone block in reach to click on

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  let bot = null
  const cds = [] // { t, group, ticks }
  const since = (t, group) => cds.filter(c => c.t >= t && c.group === group)
  const ammo = async slot => {
    const out = await rcon.cmd(`data get entity ${NAME} Inventory[{Slot:${slot}b}].components."minecraft:custom_data".PublicBukkitValues."weaponmechanics:ammo-left"`)
    const m = out.match(/data: (-?\d+)/)
    return m ? Number(m[1]) : out.trim()
  }
  const cmd = async slot => (await rcon.cmd(`data get entity ${NAME} Inventory[{Slot:${slot}b}].components."minecraft:custom_model_data"`)).trim()
  const dig = status => bot._client.write('block_dig', { status, location: new Vec3(0, 0, 0), face: 0, sequence: 0 })
  const give = async (w, slot, rounds) => {
    await rcon.cmd(`wm give ${NAME} ${w} 1 {slot:${slot},ammo:${rounds}}`)
    bot.setQuickBarSlot(slot)
    await sleep(1600) // the equip delays (20 ticks at most) and the draw clocks (30 at most)
  }
  try {
    await rcon.cmd(`forceload add ${CHUNKS}`)
    await rcon.cmd(`fill ${X - 4} ${Y - 1} ${Z - 4} ${X + 4} ${Y - 1} ${Z + 4} glass`)
    await rcon.cmd(`setblock ${PILLAR.x} ${PILLAR.y} ${PILLAR.z} stone`)
    await rcon.cmd(`setblock ${PILLAR.x} ${PILLAR.y + 1} ${PILLAR.z} stone`)
    bot = await join(NAME)
    bot._client.on('set_cooldown', p => cds.push({ t: Date.now(), group: p.cooldownGroup, ticks: p.cooldownTicks }))
    await sleep(1000)
    await rcon.cmd(`zzclear ${NAME}`)
    await rcon.cmd(`gamemode survival ${NAME}`)
    await rcon.cmd(`zzheisttp ${NAME} ${X + 0.5} ${Y} ${Z + 0.5}`)
    await rcon.cmd(`minecraft:effect give ${NAME} minecraft:instant_health 1 5 true`)
    await sleep(1500)
    await bot.look(0, Math.PI / 4, true) // up into the sky (pitch up, yaw south-ish is irrelevant)

    const status = await rcon.cmd('dphone gunfx')
    check('/dphone gunfx: the four guns, the shotgun\'s kick-only shot and the automatic guns\' firing flag',
      /R9_0\{donating:gun\/r9_0 shot=15 draw=0 alone=5 fire=0 action=15\}/.test(status) && /Uzi\{donating:gun\/uzi shot=0 draw=20 alone=0 fire=5 action=0\}/.test(status) && /AK_47\{[^}]*fire=5 action=0\}/.test(status) && /STG44\{donating:gun\/stg44 shot=0 draw=22 alone=0 fire=5 action=0\}/.test(status) && /AX_50\{donating:gun\/ax_50 shot=20 draw=40 alone=6 fire=0 action=16 glint=10\}/.test(status), status)

    // A reload with spare rounds: a clock as long as the reload (32 ticks for the Classic Pistol).
    await give('50_GS', 0, 2)
    await rcon.cmd(`zzammo ${NAME} light 64`)
    let t = Date.now()
    dig(4) // Q
    await sleep(700)
    let seen = since(t, 'donating:gun/50_gs')
    check('a reload starts the gun\'s clock (its own cooldown group, as long as the reload)', seen.some(c => c.ticks >= 30), JSON.stringify(seen))
    await sleep(2200)
    check('...and the reload fills the magazine', (await ammo(0)) === 7, `ammo ${await ammo(0)}`)

    // No spare rounds: WeaponMechanics fires its reload event, then refuses; no clock.
    await rcon.cmd(`zzclear ${NAME}`)
    await give('50_GS', 0, 2)
    t = Date.now()
    dig(4)
    await sleep(900)
    seen = since(t, 'donating:gun/50_gs')
    check('Q with no spare rounds starts no clock (no reload animation for nothing)', !seen.some(c => c.ticks > 0) && (await ammo(0)) === 2, `${JSON.stringify(seen)} ammo ${await ammo(0)}`)

    // The shotgun pumps after every second shot: 6 -> 5 rounds left (odd) is no pump, so the clock is cut after the kick.
    await rcon.cmd(`zzclear ${NAME}`)
    await give('R9_0', 1, 6)
    t = Date.now()
    bot.activateItem()
    await sleep(100)
    bot.deactivateItem()
    await sleep(700)
    seen = since(t, 'donating:gun/r9_0')
    // The cut comes after 5 ticks (~250 ms); the clock's natural end (vanilla sends a 0 when a cooldown runs out) after 15.
    const cut = seen.some(c => c.ticks === 15) && seen.some(c => c.ticks === 0 && c.t - t < 500)
    check('a shotgun shot that works no pump: the 15-tick shot clock, cut after its kick (5 ticks)', cut && (await ammo(1)) === 5, `${JSON.stringify(seen.map(c => [c.ticks, c.t - t]))} ammo ${await ammo(1)}`)
    await sleep(600)
    t = Date.now()
    bot.activateItem()
    await sleep(100)
    bot.deactivateItem()
    await sleep(600)
    seen = since(t, 'donating:gun/r9_0')
    check('...the next shot (4 left) pumps: the whole 15 ticks, no cut', seen.some(c => c.ticks === 15) && !seen.some(c => c.ticks === 0 && c.t - t < 550) && (await ammo(1)) === 4, `${JSON.stringify(seen.map(c => [c.ticks, c.t - t]))} ammo ${await ammo(1)}`)

    // Clocks are numbered per gun: another gun's clock right after a kick-only shot doesn't keep the shotgun's cut from
    // coming (it did when the numbers were per player).
    await rcon.cmd(`zzclear ${NAME}`)
    await rcon.cmd(`wm give ${NAME} 50_GS 1 {slot:0,ammo:2}`)
    await rcon.cmd(`zzammo ${NAME} light 64`)
    await give('R9_0', 1, 6)
    t = Date.now()
    bot.activateItem()
    await sleep(60)
    bot.deactivateItem()
    bot.setQuickBarSlot(0)
    await sleep(60)
    dig(4) // the pistol's reload clock, inside the shotgun's 5 ticks
    await sleep(700)
    seen = since(t, 'donating:gun/r9_0')
    const pistol = since(t, 'donating:gun/50_gs').some(c => c.ticks >= 30)
    check('...another gun\'s clock inside those 5 ticks doesn\'t stop the shotgun\'s cut (clocks are numbered per gun)', pistol && seen.some(c => c.ticks === 0 && c.t - t < 500), `pistol clock ${pistol}; shotgun ${JSON.stringify(seen.map(c => [c.ticks, c.t - t]))}`)
    await sleep(1800)

    // A pump WeaponMechanics works without a shot: the pumping shot, then a slot switch at once leaves the pump open
    // (firearm state OPEN), and the next click works it without shooting. GunFx: one action clock (15 ticks) and
    // flag 1 (the pack draws the pump alone: no kick, no flash). WeaponMechanics reports the close half as OPEN again:
    // still one clock. (A reload from empty closes the pump itself: no stray pump there, checked 2026-10-06.)
    await rcon.cmd(`zzclear ${NAME}`)
    await give('R9_0', 1, 6)
    bot.activateItem(); await sleep(60); bot.deactivateItem()
    await sleep(800)
    bot.activateItem(); await sleep(60); bot.deactivateItem() // 5 -> 4 left: pumps
    await sleep(50)
    bot.setQuickBarSlot(2)
    await sleep(700)
    bot.setQuickBarSlot(1)
    await sleep(1500)
    t = Date.now()
    bot.activateItem(); await sleep(60); bot.deactivateItem()
    await sleep(200)
    const pumpFlag = await cmd(1)
    await sleep(500)
    seen = since(t, 'donating:gun/r9_0')
    check('a pump worked without a shot (interrupted, then clicked) gets one action clock and flag 1, the round count untouched',
      seen.filter(c => c.ticks === 15).length === 1 && /flags: \[0b, 1b\]/.test(pumpFlag) && (await ammo(1)) === 4,
      `${JSON.stringify(seen.map(c => [c.ticks, c.t - t]))}; ${pumpFlag}; ammo ${await ammo(1)}`)
    await sleep(600)
    check('...and flag 1 is gone once the pump is done', !/1b]/.test(await cmd(1)), await cmd(1))

    // Aiming during the AK-48's reload doesn't end its clock (its aimed frames don't read the clock; the reload's frames
    // go on when the sight comes down).
    await rcon.cmd(`zzclear ${NAME}`)
    await give('AK_47', 3, 5)
    await rcon.cmd(`zzammo ${NAME} rifle 64`)
    dig(4)
    await sleep(400)
    t = Date.now()
    bot.swingArm('right')
    await sleep(500)
    seen = since(t, 'donating:gun/ak_47')
    check('aiming during the AK-48\'s reload keeps its clock', !seen.some(c => c.ticks === 0), JSON.stringify(seen.map(c => [c.ticks, c.t - t])))
    bot.swingArm('right')
    await sleep(3200)

    // The Sniper Rifle's scope glint (2026-10-06): while its holder looks through the scope, everyone else within 128
    // blocks gets an end-rod glint at their eye every 10 ticks (forced: seen far away); the holder gets none.
    {
      const other = await join('FxBot2')
      await sleep(800)
      await rcon.cmd(`zzheisttp FxBot2 ${X + 0.5} ${Y} ${Z - 3.5}`)
      await sleep(600)
      const glints = { [NAME]: 0, FxBot2: 0 }
      const rod = bot.registry.particlesByName.end_rod.id
      const count = (b, n) => b._client.on('world_particles', p => { if (p.particle && (p.particle.type === 'end_rod' || p.particle.type === rod || p.particle.particleId === rod)) glints[n]++ })
      count(bot, NAME)
      count(other, 'FxBot2')
      await rcon.cmd(`zzclear ${NAME}`)
      await give('AX_50', 0, 5)
      await sleep(1000) // the 40-tick equip delay
      await bot.look(0, 0, true)
      bot.swingArm('right') // the scope
      await sleep(1600)
      const seen2 = glints.FxBot2
      const seen1 = glints[NAME]
      bot.setQuickBarSlot(1) // the gun away (a second click would zoom further in: Zoom_Stacking)
      await sleep(800)
      const after = glints.FxBot2
      await sleep(1000)
      check('the Sniper Rifle\'s scope glints for others (end rod, every 10 ticks), not for the shooter, and stops when the gun is put away', seen2 >= 2 && seen1 === 0 && glints.FxBot2 === after,
        `other ${seen2} -> ${glints.FxBot2} after unscoping; shooter ${seen1}; ${await rcon.cmd('dphone gunfx')}`.slice(0, 400))
      await quit(other)
    }

    // The firing flag: an automatic gun is marked firing (custom_model_data flag 0) while it shoots, and not after.
    await rcon.cmd(`zzclear ${NAME}`)
    await give('Uzi', 2, 30)
    const before = await cmd(2)
    bot.activateItem()
    await sleep(150)
    const during = await cmd(2)
    bot.deactivateItem()
    await sleep(900)
    const after = await cmd(2)
    check('the Machine Gun is marked firing while it shoots (flag 0), its skin number kept', /flags: \[1b\]/.test(during) && /floats: \[1\.0f\]/.test(during), `before ${before} | during ${during}`)
    check('...and not a moment after the last shot (no flicker on a held key that fires nothing)', !/flags: \[1b\]/.test(after) && /floats: \[1\.0f\]/.test(after), after)

    // A click on a block in reach while the gun's clock runs still fires (Paper marks it DENY on cooldown; GunFx
    // turns it back). The reload's clock runs; a shot with rounds left stops the reload.
    await rcon.cmd(`zzclear ${NAME}`)
    await give('50_GS', 0, 3)
    await rcon.cmd(`zzammo ${NAME} light 64`)
    dig(4)
    await sleep(400)
    const cooling = since(Date.now() - 500, 'donating:gun/50_gs').some(c => c.ticks >= 30)
    try { await bot.activateBlock(bot.blockAt(PILLAR)) } catch (e) { }
    await sleep(400)
    check('a click on a block in reach fires while the gun\'s clock runs (it used to be ignored)', cooling && (await ammo(0)) === 2, `clock ${cooling} ammo ${await ammo(0)}`)

    // Aiming during a reload ends the reload's clock (the aimed frames are the shot's, muzzle flash included).
    await rcon.cmd(`zzclear ${NAME}`)
    await give('50_GS', 0, 3)
    await rcon.cmd(`zzammo ${NAME} light 64`)
    await bot.look(0, Math.PI / 3, true)
    dig(4)
    await sleep(400)
    t = Date.now()
    bot.swingArm('right') // left click into the air = the scope
    await sleep(500)
    seen = since(t, 'donating:gun/50_gs')
    const skin = await cmd(0)
    check('aiming during a reload ends its clock (no muzzle flash in the sights)', seen.some(c => c.ticks === 0), `${JSON.stringify(seen.map(c => c.ticks))} skin ${skin}`)
  } finally {
    await rcon.cmd(`zzclear ${NAME}`).catch(() => {})
    await quit(bot)
    await rcon.cmd(`fill ${X - 4} ${Y - 1} ${Z - 4} ${X + 4} ${Y + 2} ${Z + 4} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
