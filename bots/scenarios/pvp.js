// pvp.sk: passive players can't hurt or be hurt by other players (fists and WeaponMechanics guns),
// but other damage (traps) still hits them. Each blocked case has a positive control (both players
// non-passive: the same hit does damage), so the test can't pass just because hits never land.
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'PvpAttacker'
const B = 'PvpTarget'
const Y = 200
const PLATFORM = `500 ${Y - 1} 500 510 ${Y - 1} 510` // glass in the sky, away from spawn and the city
const CHUNKS = '500 500 510 510' // force-loaded during the test, or fill does nothing (nobody is near)

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bots = {}
  try {
    await rcon.cmd(`forceload add ${CHUNKS}`)
    const filled = await rcon.cmd(`fill ${PLATFORM} glass`)
    check('test platform built', /Successfully filled|No blocks were filled/.test(filled), filled.trim())
    bots[A] = await join(A)
    bots[B] = await join(B)
    const a = bots[A]
    for (const name of [A, B]) {
      await rcon.cmd(`gamemode survival ${name}`)
      await rcon.cmd(`zzclear ${name}`)
      await rcon.cmd(`zzpassive ${name} off`)
    }
    // New players can't be hurt until their client reports it has loaded; Mineflayer never does,
    // so the server waits for its timeout (hits start landing about 6 s after joining).
    await sleep(7000)
    const health = async name => Number(((await rcon.cmd(`data get entity ${name} Health`)).match(/data: ([\d.]+)/) || [])[1])
    // An AK-47 burst can kill outright and the target respawns at full health, so deaths count too.
    await rcon.cmd('scoreboard objectives add zzdeaths deathCount')
    const deaths = async name => Number(((await rcon.cmd(`scoreboard players get ${name} zzdeaths`)).match(/has (\d+)/) || [0, 0])[1])
    // Both players back in place and at full health; B faces A so the hits land from the front.
    const reset = async () => {
      await rcon.cmd(`minecraft:tp ${A} 502.5 ${Y} 505.5 -90 0`)
      await rcon.cmd(`minecraft:tp ${B} 505.5 ${Y} 505.5 90 0`)
      await rcon.cmd(`minecraft:effect give ${B} minecraft:instant_health 1 10 true`)
      await rcon.cmd(`minecraft:effect give ${A} minecraft:instant_health 1 10 true`)
      // EssentialsX teleport-invulnerability: 4 s after a command teleport nobody can hit or be hit.
      await sleep(5000)
    }
    const target = () => a.players[B] && a.players[B].entity
    const punch = async () => {
      if (!target()) return false
      await a.lookAt(target().position.offset(0, 1.4, 0), true)
      a.attack(target())
      await sleep(800)
      return true
    }
    const shoot = async () => {
      if (!target()) return false
      await a.lookAt(target().position.offset(0, 1.2, 0), true)
      a.activateItem()
      await sleep(400)
      a.deactivateItem()
      await sleep(800)
      return true
    }
    // Runs `hit` once with the given passive states and returns B's health change and A's action bars.
    const attempt = async (aPassive, bPassive, hit) => {
      await rcon.cmd(`zzpassive ${A} ${aPassive ? 'on' : 'off'}`)
      await rcon.cmd(`zzpassive ${B} ${bPassive ? 'on' : 'off'}`)
      await reset()
      const before = await health(B)
      const deathsBefore = await deaths(B)
      const t = Date.now()
      const landed = await hit()
      const after = await health(B)
      const died = (await deaths(B)) > deathsBefore
      const bars = messagesSince(a, t).filter(m => m.kind === 'game_info').map(m => m.text)
      return { landed, lost: died ? before : before - after, bars, detail: `health ${before} -> ${after}${died ? ' (died)' : ''}, bars ${JSON.stringify(bars)}` }
    }

    // ---------- Fists ----------
    let r = await attempt(false, false, punch)
    check('control: a punch hurts a non-passive player', r.landed && r.lost > 0, r.detail)
    r = await attempt(false, true, punch)
    check('a punch does nothing to a passive player', r.landed && r.lost === 0, r.detail)
    check('...and the attacker is told why', r.bars.some(b => /passive mode/.test(b)), r.detail)
    r = await attempt(true, false, punch)
    check('a passive player can\'t punch others', r.landed && r.lost === 0, r.detail)
    check('...and is told why', r.bars.some(b => /You're in passive mode/.test(b)), r.detail)

    // ---------- WeaponMechanics gun ----------
    await rcon.cmd(`wm give ${A} AK_47 1 {slot:0,ammo:30}`)
    a.setQuickBarSlot(0)
    await sleep(2500) // Weapon_Equip_Delay is 30 ticks
    r = await attempt(false, false, shoot)
    check('control: a gun hurts a non-passive player', r.landed && r.lost > 0, r.detail)
    r = await attempt(false, true, shoot)
    check('a gun does nothing to a passive player', r.landed && r.lost === 0, r.detail)
    r = await attempt(true, false, shoot)
    check('a passive player\'s gun does nothing', r.landed && r.lost === 0, r.detail)

    // ---------- Other damage still counts ----------
    await rcon.cmd(`zzpassive ${B} on`)
    await reset()
    const before = await health(B)
    await rcon.cmd(`minecraft:damage ${B} 4 minecraft:generic`)
    await sleep(500)
    const after = await health(B)
    check('a passive player still takes non-player damage (traps)', after < before, `health ${before} -> ${after}`)
  } finally {
    for (const name of [A, B]) {
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`zzdata ${name} passive-switched none`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`minecraft:tp ${name} 0.5 68 -656.5`).catch(() => {}) // solid ground near spawn
    }
    for (const bot of Object.values(bots)) await quit(bot)
    await rcon.cmd(`fill ${PLATFORM} air replace glass`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    await rcon.cmd('scoreboard objectives remove zzdeaths').catch(() => {})
    rcon.close()
  }
}
