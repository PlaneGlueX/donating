// DonatingPhone's GunFx (the guns' first-person animations, 2026-10-05): the clocks it starts (vanilla item cooldowns on
// each gun's own group, seen as set_cooldown packets) and the review's fixes: no clock for a reload WeaponMechanics
// refuses for want of ammo, the shotgun's kick-only shot when it doesn't pump, the firing flag of the automatic guns,
// a click on a block still firing while a clock runs, and aiming during a reload ending its clock. Also the Hand Minigun's
// spin-up (GunSpin, 2026-10-12): no round until the barrels are spun up, the spin-up and spin-down flags and clocks, a
// burst started while they still turn firing at once, a reload or a slot change stopping them, and its slower walk.
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
      /R9_0\{donating:gun\/r9_0 shot=15 draw=0 alone=5 fire=0 action=15\}/.test(status) && /Uzi\{donating:gun\/uzi shot=0 draw=20 alone=0 fire=5 action=0\}/.test(status) && /AK_47\{[^}]*fire=5 action=0\}/.test(status) && /STG44\{donating:gun\/stg44 shot=0 draw=22 alone=0 fire=5 action=0\}/.test(status) && /AX_50\{donating:gun\/ax_50 shot=20 draw=40 alone=6 fire=0 action=16 glint=10\}/.test(status) && /MG34\{donating:gun\/mg34 shot=0 draw=40 alone=0 fire=5 action=0\}/.test(status), status)
    check('/dphone gunfx: the Hand Minigun\'s clocks and its spin (up 24, down 30, fire-at 0.3, min-rate 5), the spin-up on (WeaponMechanics\' full-auto task reachable)',
      /FN_FAL\{donating:gun\/fn_fal shot=0 draw=40 alone=0 fire=4 action=0[^}]*spin=24\/30\/0\.30?\/5[^}]*\}/.test(status) && /spinup=on/.test(status), status)

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

    // The draw flag (2026-10-06): a gun with both a draw and a shot clock (the Combat Rifle: draw 26, shot 4) is marked
    // drawing (flag 2) for its draw, so the pack shows the draw's frames and not a shot's; gone when the clock ends.
    // Left-clicking mid-draw is the scope: either WeaponMechanics refuses it (the equip delay) and the draw goes on, or it
    // aims and GunFx ends the draw (no draw frames in the sights); never the flag on with the clock ended.
    await rcon.cmd(`zzclear ${NAME}`)
    await rcon.cmd(`wm give ${NAME} M4A1 1 {slot:4,ammo:30}`)
    bot.setQuickBarSlot(0)
    await sleep(500)
    t = Date.now()
    bot.setQuickBarSlot(4)
    await sleep(300)
    const drawing = await cmd(4)
    const drawClock = since(t, 'donating:gun/m4a1').some(c => c.ticks === 26)
    await sleep(1400)
    const drawn = await cmd(4)
    check('the Combat Rifle\'s draw: its 26-tick clock and flag 2 while it lasts, gone after', drawClock && /flags: \[0b, 0b, 1b\]/.test(drawing) && !/1b\]/.test(drawn),
      `${JSON.stringify(since(t, 'donating:gun/m4a1').map(c => [c.ticks, c.t - t]))}; during ${drawing}; after ${drawn}`)
    bot.setQuickBarSlot(0)
    await sleep(500)
    t = Date.now()
    bot.setQuickBarSlot(4)
    await sleep(250)
    bot.swingArm('right') // left click into the air = the scope
    await sleep(250)
    const midAim = await cmd(4)
    const ended = since(t, 'donating:gun/m4a1').some(c => c.ticks === 0)
    check('...left-clicking mid-draw: the flag and the draw\'s clock end together, or both go on (the scope refused)', /1b\]/.test(midAim) ? !ended : ended,
      `${JSON.stringify(since(t, 'donating:gun/m4a1').map(c => [c.ticks, c.t - t]))}; ${midAim}`)
    bot.swingArm('right')
    await sleep(1600)

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

    // The Hand Minigun's spin-up (DonatingPhone GunSpin, 2026-10-12): every burst starts at 0 rounds a second while the
    // barrels spin up (flag 3 and the spin-up clock), fires from fire-at 0.3 (about 8 ticks into a held trigger from
    // cold) and ramps to the file's 16 a second; letting go spins them down over 1.5 s (flag 4 and the spin-down clock),
    // and a burst started meanwhile fires at once; a reload stops them. A held trigger is one use_item every 100 ms (the
    // client repeats it every 4 ticks; WeaponMechanics lets go 215 ms after the last). /dphone gunfx spin answers
    // "GUNSPIN <player> s=<0-1> held=<true|false> rate=<a second now> max=<the file's>", or "none".
    {
      const SLOT = 3
      const flagsOf = text => ((text.match(/flags: \[([^\]]*)\]/) || [])[1] || '').split(',').map(f => f.trim() === '1b')
      const spinLine = async () => (await rcon.cmd(`dphone gunfx spin ${NAME}`)).trim()
      const spinOf = line => { const m = line.match(/s=([\d.]+) held=(true|false) rate=(\d+) max=(\d+)/); return m ? { s: Number(m[1]), held: m[2] === 'true', rate: Number(m[3]), max: Number(m[4]) } : null }
      const clocks = from => since(from, 'donating:gun/fn_fal').filter(c => c.ticks > 0).map(c => c.ticks)
      // The spin sounds GunSpin plays on the shooter (heard by them too) and stops: { t, kind (the packet), what }.
      const sounds = []
      bot._client.on('packet', (data, meta) => {
        if (!/sound/.test(meta.name)) return
        let text = ''
        try { text = JSON.stringify(data) } catch (e) { return }
        const m = text.match(/minigun\.(spinup|spindown)/)
        if (m) sounds.push({ t: Date.now(), kind: meta.name, what: m[1] })
      })
      const heard = (from, what, stop = false) => sounds.some(x => x.t >= from && x.what === what && (x.kind === 'stop_sound') === stop)
      const speed = async () => Number(((await rcon.cmd(`attribute ${NAME} minecraft:movement_speed get`)).match(/is (-?[\d.]+(?:E-?\d+)?)/) || [])[1])
      let holding = null
      const press = () => { if (holding) return; bot.activateItem(); holding = setInterval(() => bot.activateItem(), 100) }
      const release = () => { if (!holding) return; clearInterval(holding); holding = null; bot.deactivateItem() }
      try {
        await rcon.cmd(`zzclear ${NAME}`)
        await bot.look(0, Math.PI / 4, true)
        await rcon.cmd(`wm give ${NAME} FN_FAL 1 {slot:${SLOT},ammo:100}`)
        bot.setQuickBarSlot(0)
        await sleep(500)
        // The draw: GunFx's 40-tick clock and flag 2 (a spin gun is drawn like a gun with a shot clock).
        t = Date.now()
        bot.setQuickBarSlot(SLOT)
        await sleep(300)
        const drawing = await cmd(SLOT)
        const drawClock = since(t, 'donating:gun/fn_fal').some(c => c.ticks === 40)
        await sleep(2000) // the 40-tick equip delay and draw
        const drawn = await cmd(SLOT)
        check('the Hand Minigun\'s draw: its 40-tick clock and flag 2 while it lasts, gone after', drawClock && flagsOf(drawing)[2] && !flagsOf(drawn)[2],
          `${JSON.stringify(since(t, 'donating:gun/fn_fal').map(c => [c.ticks, c.t - t]))}; during ${drawing}; after ${drawn}`)
        // Its item attribute (FN_FAL.yml movement_speed -0.03): walking 30% slower while it's in hand.
        const heldSpeed = await speed()
        check('the Hand Minigun in hand: walking speed 0.07 (0.1 - 0.03, 30% slower)', Math.abs(heldSpeed - 0.07) < 1e-4, `movement_speed ${heldSpeed}`)

        // Held from cold: spinning up at once (flag 3, the 24-tick clock, the whine), nothing fired ~4 ticks in.
        const idle = await spinLine()
        const full = await ammo(SLOT)
        t = Date.now()
        press()
        await sleep(200)
        const early = spinOf(await spinLine())
        const earlyAmmo = await ammo(SLOT)
        const earlyItem = await cmd(SLOT)
        check('a held trigger from cold: no spin state before; then held and spinning up (flag 3, its 24-tick clock, the whine) at rate 0, no round fired yet',
          /GUNSPIN \S+ none/.test(idle) && full === 100 && earlyAmmo === 100 && !!early && early.held && early.rate === 0 && early.s > 0 && early.s < 0.3 && early.max === 16 &&
          flagsOf(earlyItem)[3] && clocks(t).includes(24) && heard(t, 'spinup'),
          `before ${idle}; ammo ${full} -> ${earlyAmmo}; ${JSON.stringify(early)}; ${earlyItem}; clocks ${clocks(t).join(' ')}; whine ${heard(t, 'spinup')}`)
        await sleep(2800)
        const spun = spinOf(await spinLine())
        const spunItem = await cmd(SLOT)
        const used = full - (await ammo(SLOT))
        const heldMs = Date.now() - t
        release()
        // WeaponMechanics' AUTO table from cold (spec 5.3): 30 rounds by 2.5 s, 38 by 3 s, then 16 a second. The reads land
        // 3.0-3.3 s in (each RCON command waits for a tick), so the most allowed follows the time held, with 3 to spare.
        const most = 38 + Math.ceil(16 * Math.max(0, heldMs - 3000) / 1000) + 3
        check('...held 3 s: fully spun up (s 1, 16 a second), firing (flag 0; flag 3 gone with its clock), about 38 rounds (30 up to 41 + 16 a second past 3 s)',
          !!spun && spun.held && spun.s >= 0.99 && spun.rate === 16 && spun.max === 16 && flagsOf(spunItem)[0] && !flagsOf(spunItem)[3] && used >= 30 && used <= most,
          `${JSON.stringify(spun)}; ${spunItem}; ${used} rounds in ${heldMs} ms (at most ${most})`)

        // Let go: spinning down (flag 4, the 30-tick clock, s falling), the whine stopped, the wind-down heard.
        const let0 = Date.now()
        await sleep(450) // WeaponMechanics lets go 215 ms after the last click; GunSpin sees the task gone a tick later
        const down1 = spinOf(await spinLine())
        const downItem = await cmd(SLOT)
        const warm = await ammo(SLOT) // nothing fires while they spin down
        await sleep(150)
        const down2 = spinOf(await spinLine())
        check('let go: spinning down (flag 4, not 3; its 30-tick clock; s falling, nothing held), the whine stopped and the wind-down heard',
          !!down1 && !!down2 && !down1.held && !down2.held && down1.s > 0.5 && down1.s < 1 && down2.s < down1.s &&
          flagsOf(downItem)[4] && !flagsOf(downItem)[3] && clocks(let0).some(n => n >= 25 && n <= 30) && heard(let0, 'spinup', true) && heard(let0, 'spindown'),
          `${JSON.stringify(down1)} -> ${JSON.stringify(down2)}; ${downItem}; clocks ${clocks(let0).join(' ')}; stop ${heard(let0, 'spinup', true)}; wind-down ${heard(let0, 'spindown')}`)

        // Pressed again while they still turn (s about 0.6, past fire-at 0.3, which the spool passes about 1.1 s after
        // they start spinning down: the press comes about 0.5 s in): it fires at once, with no spin-up clock (a short one
        // would turn the drawn barrels faster than reads right); the spin-down's clock and flag 4 end, flag 0 draws the full
        // spin.
        const tWarm = Date.now()
        press()
        await sleep(200)
        const warmUsed = warm - (await ammo(SLOT))
        const warmItem = await cmd(SLOT)
        release()
        const warmCuts = since(tWarm, 'donating:gun/fn_fal').filter(c => c.ticks === 0).length
        check('...pressed again while they still turn: it fires within about 4 ticks (from cold about 8); no spin-up clock, the spin-down\'s ended (flag 4 off), firing (flag 0)',
          warmUsed >= 1 && clocks(tWarm).length === 0 && warmCuts >= 1 && !flagsOf(warmItem)[4] && !flagsOf(warmItem)[3] && flagsOf(warmItem)[0],
          `s ${down2 && down2.s} just before; ${warmUsed} rounds in 200 ms; clocks ${clocks(tWarm).join(' ') || 'none'}, cut ${warmCuts}; ${warmItem}`)
        await sleep(3400) // the spin-down clock: at most 60 ticks (GunSpin's downTicks), after WeaponMechanics lets go
        const stopped = await spinLine()
        const stoppedItem = await cmd(SLOT)
        check('...and once they stop: no spin state, flags 3 and 4 off', /GUNSPIN \S+ none/.test(stopped) && !flagsOf(stoppedItem)[3] && !flagsOf(stoppedItem)[4], `${stopped}; ${stoppedItem}`)

        // A reload stops them at once: no spin state, no spin flags; the reload's clock (90 ticks) instead.
        await rcon.cmd(`zzammo ${NAME} rifle 200`)
        press()
        await sleep(1200)
        release()
        await sleep(350)
        const winding = spinOf(await spinLine())
        const tQ = Date.now()
        dig(4) // Q
        await sleep(400)
        const afterQ = await spinLine()
        const afterQItem = await cmd(SLOT)
        check('a reload stops the barrels: no spin state, flags 3 and 4 off, the reload\'s 90-tick clock',
          !!winding && winding.s > 0 && /GUNSPIN \S+ none/.test(afterQ) && !flagsOf(afterQItem)[3] && !flagsOf(afterQItem)[4] && clocks(tQ).some(n => n >= 90),
          `before Q ${JSON.stringify(winding)}; after ${afterQ}; ${afterQItem}; clocks ${clocks(tQ).join(' ')}`)

        // Switching to another slot mid-spin (spec 5.2) stops them at once too: no spin state, flags 3 and 4 off on the gun,
        // its clock cut and the whine stopped; and the walking speed is back to 0.1 with the gun out of hand.
        await sleep(4700) // the 90-tick reload
        press()
        await sleep(600)
        const spinning = spinOf(await spinLine())
        const tSw = Date.now()
        bot.setQuickBarSlot(0)
        release()
        await sleep(250)
        const sw = await spinLine()
        const swItem = await cmd(SLOT)
        const awaySpeed = await speed()
        check('switching away mid-spin: no spin state, flags 3 and 4 off, its clock cut, the whine stopped; walking speed back to 0.1',
          !!spinning && spinning.held && spinning.s > 0 && /GUNSPIN \S+ none/.test(sw) && !flagsOf(swItem)[3] && !flagsOf(swItem)[4] &&
          since(tSw, 'donating:gun/fn_fal').some(c => c.ticks === 0) && heard(tSw, 'spinup', true) && Math.abs(awaySpeed - 0.1) < 1e-4,
          `before ${JSON.stringify(spinning)}; after ${sw}; ${swItem}; clocks ${JSON.stringify(since(tSw, 'donating:gun/fn_fal').map(c => c.ticks))}; stop ${heard(tSw, 'spinup', true)}; movement_speed ${awaySpeed}`)
      } finally {
        release()
      }
    }
  } finally {
    await rcon.cmd(`zzclear ${NAME}`).catch(() => {})
    await quit(bot)
    await rcon.cmd(`fill ${X - 4} ${Y - 1} ${Z - 4} ${X + 4} ${Y + 2} ${Z + 4} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
