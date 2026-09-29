// grapple.sk: the Grappler (owner, 2026-09-28: "grappler (not sure on this one, might be too overpowered)"). A hook
// per pull: right-click pulls you to the block you aim at (24 blocks). The guards against abuse: never onto or near a
// heist building (6 blocks), never into a heist mid-pull, never from inside one, no-grapple regions, a cooldown, no fall
// damage right after a pull, getting hurt ends it.
const { Vec3 } = require('vec3')
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'GrapA'
const Y = 200
const CHUNKS = '3690 3690 3760 3730'
const PLATFORM = `3690 ${Y - 1} 3690 3760 ${Y - 1} 3730`
const HID = 'zgrap'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  try {
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const pos = async () => {
      const m = (await cmd(`data get entity ${A} Pos`)).match(/\[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/)
      return m ? new Vec3(+m[1], +m[2], +m[3]) : null
    }
    const hooks = async () => Number(((await cmd(`zzdump ${A}`)).match(/x(\d+) \[tool:grappler\]/) || [])[1] || 0)
    const health = async () => Number(((await cmd(`data get entity ${A} Health`)).match(/data: ([\d.]+)/) || [])[1])
    const place = async (x, z) => {
      await cmd(`minecraft:tp ${A} ${x} ${Y} ${z} -90 0`)
      await sleep(3500) // the command teleport's immunity and the landing
    }
    // Aims at a block's face center (the bot's head turns; the server reads it) and uses the held item.
    const fire = async target => {
      await bot.lookAt(target, true)
      await sleep(250)
      bot.activateItem()
      await sleep(100)
      bot.deactivateItem()
    }

    // ---------- Setup ----------
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} stone`)
    // Clear the air above in slices (a fill changes 32,768 blocks at most).
    for (let x = 3690; x <= 3760; x += 20) await cmd(`fill ${x} ${Y} 3690 ${Math.min(3760, x + 19)} ${Y + 30} 3730 air`)
    // A wall 14 blocks east of the start, a pillar with a high ledge, and a heist building further east.
    await cmd(`fill 3714 ${Y} 3700 3714 ${Y + 4} 3706 stone`)
    await cmd(`fill 3704 ${Y} 3716 3705 ${Y + 11} 3717 stone`)
    await cmd(`dheist delete ${HID} confirm`)
    await cmd(`rg remove -w world heist_${HID}`)
    await cmd(`rg remove -w world nograpple_zg`)
    bot = await join(A)
    // Mineflayer 4.39 divides a 1.21.11 velocity packet by 8000 (the old unit): it's in blocks per tick now, so a
    // pull would barely move the bot. Apply the bot's own ones as sent (only here: other tests rely on no knockback).
    bot._client.on('entity_velocity', p => { if (bot.entity && p.entityId === bot.entity.id) bot.entity.velocity.set(p.velocity.x, p.velocity.y, p.velocity.z) })
    await cmd(`gamemode survival ${A}`)
    await cmd(`zzclear ${A}`)
    await cmd(`zzcombatend ${A}`)
    await cmd(`dlevel set ${A} 30`)
    await cmd(`zztool ${A} grappler 5 2`)
    await cmd('zzcfgreload')
    bot.setQuickBarSlot(2)
    await sleep(6500) // bots can't be hurt for ~6 s after joining (the fall-damage check needs that)

    // ---------- A pull ----------
    await place(3700.5, 3703.5)
    let p0 = await pos()
    let t = Date.now()
    await fire(new Vec3(3714, Y + 2.5, 3703.5))
    await sleep(1600)
    let p1 = await pos()
    check('right-click at a wall 14 blocks away pulls you to it (and uses one hook of 5)', p1 && p1.x > 3710 && p1.x < 3714 && (await hooks()) === 4, `${p0} -> ${p1} hooks=${await hooks()} ${text(t)}`)

    // ---------- Cooldown ----------
    await place(3700.5, 3703.5)
    await fire(new Vec3(3714, Y + 2.5, 3703.5))
    await sleep(150)
    t = Date.now()
    const before = await hooks()
    await fire(new Vec3(3714, Y + 2.5, 3703.5))
    await sleep(500)
    check('a second pull right away is refused (the cooldown), and no hook is used', /winding back|One pull at a time/.test(text(t)) && (await hooks()) === before, `${text(t)} ${before} -> ${await hooks()}`)
    await sleep(3500)

    // ---------- No fall damage right after ----------
    await place(3700.5, 3716.5)
    const h0 = await health()
    await fire(new Vec3(3704, Y + 11.5, 3716.5)) // the pillar's side, 11 up
    let high = null
    for (let i = 0; i < 12; i++) { const q = await pos(); if (q && (!high || q.y > high.y)) high = q; await sleep(120) }
    await sleep(2500) // the fall
    const h1 = await health()
    check('up a pillar and a fall of ~10 blocks: no fall damage just after a pull', high && high.y > Y + 6 && h1 === h0, `peak ${high} health ${h0} -> ${h1}`)

    // ---------- Nothing to hook ----------
    await place(3700.5, 3703.5)
    await sleep(500)
    t = Date.now()
    const n0 = await hooks()
    await fire(new Vec3(3700.5, Y + 60, 3703.5)) // straight up: sky
    await sleep(600)
    check('aiming at the sky: nothing to hook onto, no hook used', /Nothing to hook onto/.test(text(t)) && (await hooks()) === n0, `${text(t)} ${n0} -> ${await hooks()}`)

    // ---------- Heists ----------
    await cmd(`zzregion heist_${HID} 3730 ${Y - 1} 3700 3740 ${Y + 8} 3710`)
    await cmd(`fill 3730 ${Y} 3700 3730 ${Y + 4} 3710 stone`) // its west wall
    for (const c of [`dheist create ${HID} 1`, `dheist set ${HID} level 0`, `dheist exit ${HID} 3725.5 ${Y} 3714.5 -90`, `dheist snapshot ${HID}`, `dheist enable ${HID}`]) await cmd(c)
    await sleep(2500)
    // Its wall (3730) from 3718: the anchor is on a heist building.
    await place(3718.5, 3705.5)
    t = Date.now()
    const h2 = await hooks()
    await fire(new Vec3(3730, Y + 2.5, 3705.5))
    await sleep(700)
    check('onto a heist building: refused ("can\'t grapple onto a heist building"), no hook used', /onto a heist building/.test(text(t)) && (await hooks()) === h2, `${text(t)} ${h2} -> ${await hooks()}`)
    // A block standing 4 blocks outside the heist (within the 6-block gap).
    await cmd(`fill 3726 ${Y} 3712 3726 ${Y + 3} 3712 stone`)
    await place(3712.5, 3712.5)
    t = Date.now()
    await fire(new Vec3(3726, Y + 1.5, 3712.5))
    await sleep(700)
    check('...and onto anything within 6 blocks of one', /onto a heist building/.test(text(t)), text(t))
    // From inside a heist.
    await cmd(`zzheisttp ${A} 3735.5 ${Y} 3705.5`)
    await sleep(1500)
    t = Date.now()
    await fire(new Vec3(3714, Y + 2.5, 3703.5))
    await sleep(600)
    check('inside a heist: no grappling', /No grappling inside a heist/.test(text(t)), text(t))
    await cmd(`zzheisttp ${A} 3700.5 ${Y} 3703.5`)
    await sleep(1500)

    // ---------- No-grapple regions ----------
    await cmd(`zzregion nograpple_zg 3713 ${Y - 1} 3699 3716 ${Y + 6} 3708`)
    await place(3700.5, 3703.5)
    t = Date.now()
    await fire(new Vec3(3714, Y + 2.5, 3703.5))
    await sleep(700)
    check('a no-grapple region (nograpple_*) is off limits', /can't grapple there/.test(text(t)), text(t))
    await cmd('rg remove -w world nograpple_zg')

    // ---------- Getting hurt ends a pull ----------
    await sleep(3500)
    await place(3700.5, 3703.5)
    await fire(new Vec3(3714, Y + 2.5, 3703.5))
    await sleep(150)
    await cmd(`damage ${A} 1 minecraft:generic`)
    await sleep(1500)
    const p3 = await pos()
    const ended = /end GrapA why=hurt/.test(require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs', 'grapple.log'), 'utf8').split(/\r?\n/).slice(-4).join('\n'))
    check('getting hurt mid-pull ends it (the log says why=hurt)', ended, `${p3}`)
  } finally {
    await rcon.cmd(`dheist delete ${HID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${HID}`).catch(() => {})
    await rcon.cmd('rg remove -w world nograpple_zg').catch(() => {})
    await rcon.cmd(`minecraft:kill @e[tag=poi_h_${HID}]`).catch(() => {})
    await rcon.cmd(`zzclear ${A}`).catch(() => {})
    await rcon.cmd(`dlevel reset ${A}`).catch(() => {})
    await rcon.cmd(`minecraft:tp ${A} 0.5 68 -656.5`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    for (let x = 3690; x <= 3760; x += 20) await rcon.cmd(`fill ${x} ${Y} 3690 ${Math.min(3760, x + 19)} ${Y + 30} 3730 air`).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
