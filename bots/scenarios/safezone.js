// pvp.sk: safe zones (WorldGuard regions named safe...) and the spawn shield.
//   - No PvP when either player is inside a safe zone; a punch between two players outside hurts.
//   - Combat-tagged players can't walk or teleport into a safe zone; untagged players can.
//   - For 10 s after respawning (or joining) other players can't hurt you; attacking ends your own shield.
// Runs on its own glass platform; the east half is the test safe zone "safe_ztest" (passthrough allow,
// like every Donating region). Hits must show pvp.sk's message, not WorldGuard's.
const conv = require('mineflayer/lib/conversions')
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'ZoneA'
const B = 'ZoneB'
const Y = 200
const PLATFORM = `580 ${Y - 1} 580 600 ${Y - 1} 590`
const CHUNKS = '580 580 600 590'
const ZONE = 'safe_ztest' // x 590..600: the east half of the platform
const EDGE = 590

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bots = {}
  try {
    await rcon.cmd(`forceload add ${CHUNKS}`)
    await rcon.cmd(`fill ${PLATFORM} glass`)
    await rcon.cmd(`rg remove -w world ${ZONE}`)
    const made = await rcon.cmd(`zzregion ${ZONE} ${EDGE} ${Y - 10} 580 600 ${Y + 20} 590`)
    // Every Donating region is passthrough: otherwise WorldGuard itself blocks PvP (and doors, NPC
    // clicks) for non-members inside it, and Skript owns the rules.
    await rcon.cmd(`rg flag -w world ${ZONE} passthrough allow`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await rcon.cmd(`gamemode survival ${name}`)
      await rcon.cmd(`zzclear ${name}`)
      await rcon.cmd(`zzpassive ${name} off`)
    }
    await rcon.cmd('scoreboard objectives add zzzonedeaths deathCount')
    await sleep(7000) // bots can't be hurt until about 6 s after joining
    const health = async name => Number(((await rcon.cmd(`data get entity ${name} Health`)).match(/data: ([\d.]+)/) || [])[1])
    const posX = async name => Number(((await rcon.cmd(`data get entity ${name} Pos[0]`)).match(/data: (-?[\d.]+)/) || [])[1])
    const shield = async name => (await rcon.cmd(`zzshield ${name}`)).trim()
    const place = async (ax, bx, shieldOff = true) => {
      await rcon.cmd(`minecraft:tp ${A} ${ax} ${Y} 585.5 -90 0`)
      await rcon.cmd(`minecraft:tp ${B} ${bx} ${Y} 585.5 90 0`)
      if (shieldOff) for (const name of [A, B]) await rcon.cmd(`zzshieldoff ${name}`)
      for (const name of [A, B]) await rcon.cmd(`minecraft:effect give ${name} minecraft:instant_health 1 10 true`)
      await sleep(5000) // EssentialsX: no PvP for 4 s after a teleport
    }
    const punch = async (from = A, to = B) => {
      const a = bots[from]
      const target = a.players[to] && a.players[to].entity
      if (!target) return { landed: false, lost: 0, bars: [] }
      const before = await health(to)
      const t = Date.now()
      await a.lookAt(target.position.offset(0, 1.4, 0), true)
      a.attack(target)
      await sleep(800)
      const bars = messagesSince(a, t).map(m => m.text)
      return { landed: true, lost: before - (await health(to)), bars }
    }
    const show = r => `lost ${r.lost}, bars ${JSON.stringify(r.bars)}`

    // ---------- Safe zones ----------
    await place(586.5, 588.5)
    check('the test safe zone exists', /made/.test(made) && /safe=false/.test(await shield(B)), `${made.trim()}; ${await shield(B)}`)
    await rcon.cmd(`zzcombatend ${A}`)
    let r = await punch()
    check('control: a punch outside safe zones hurts', r.landed && r.lost > 0, show(r))
    await rcon.cmd(`zzcombatend ${A}`)
    await rcon.cmd(`zzcombatend ${B}`)

    await place(589.2, 591.2)
    check('...(target stands in the zone)', /safe=true/.test(await shield(B)), await shield(B))
    r = await punch()
    check('no hurting a player inside a safe zone', r.landed && r.lost === 0 && r.bars.some(b => /No fighting in safe zones/.test(b)), show(r))
    await place(591.2, 589.2)
    r = await punch()
    check('no hurting anyone from inside a safe zone', r.landed && r.lost === 0 && r.bars.some(b => /No fighting in safe zones/.test(b)), show(r))
    check('cancelled hits tag nobody', / tagged=false /.test(await rcon.cmd(`zzcombat ${A}`)) && / tagged=false /.test(await rcon.cmd(`zzcombat ${B}`)), 'A and B untagged')

    // Walking east into the zone: tagged players are pushed back.
    const walkEast = async name => {
      const bot = bots[name]
      await bot.look(conv.fromNotchianYaw(-90), 0, true)
      const t = Date.now()
      bot.setControlState('forward', true)
      await sleep(2000)
      bot.setControlState('forward', false)
      await sleep(500)
      return { x: await posX(name), bars: messagesSince(bot, t).filter(m => m.kind === 'game_info').map(m => m.text) }
    }
    await place(586.5, 588.5)
    r = await punch() // tags both
    const taggedB = / tagged=true /.test(await rcon.cmd(`zzcombat ${B}`))
    let w = await walkEast(B)
    check('a combat-tagged player can\'t walk into a safe zone', taggedB && w.x < EDGE && w.bars.some(b => /can't enter a safe zone while in combat/.test(b)), `tagged ${taggedB}; x ${w.x}; bars ${JSON.stringify(w.bars)}`)
    await rcon.cmd(`minecraft:tp ${B} 595.5 ${Y} 585.5`)
    await sleep(500)
    const tpX = await posX(B)
    check('...or teleport into one', tpX < EDGE, `x ${tpX}`)
    await rcon.cmd(`zzcombatend ${B}`)
    await rcon.cmd(`zzcombatend ${A}`)
    await sleep(1500)
    await rcon.cmd(`minecraft:tp ${B} 588.5 ${Y} 585.5`)
    await sleep(500)
    w = await walkEast(B)
    check('control: an untagged player walks in', w.x > EDGE, `x ${w.x}`)

    // ---------- Spawn shield ----------
    await rcon.cmd(`minecraft:kill ${B}`)
    await sleep(1500) // the bot respawns at once
    await place(586.5, 588.5, false)
    check('a respawned player is shielded', /SHIELD \S+ true/.test(await shield(B)), await shield(B))
    r = await punch()
    check('no hurting a player who just respawned', r.landed && r.lost === 0 && r.bars.some(b => /just spawned/.test(b)), show(r))
    await sleep(5500) // the shield (10 s) runs out
    r = await punch()
    check('control: after 10 s the hit lands', r.landed && r.lost > 0, show(r))
    await rcon.cmd(`zzcombatend ${A}`)
    await rcon.cmd(`zzcombatend ${B}`)

    await rcon.cmd(`minecraft:kill ${A}`)
    await sleep(1500)
    await place(586.5, 588.5, false)
    const aShielded = /SHIELD \S+ true/.test(await shield(A))
    r = await punch()
    check('attacking ends your own shield (and the hit lands)', aShielded && r.landed && r.lost > 0 && /SHIELD \S+ false/.test(await shield(A)), `${aShielded ? 'shielded' : 'not shielded'} before; ${show(r)}; ${await shield(A)}`)
    r = await punch(B, A)
    check('...so the other player can hit back', r.landed && r.lost > 0, show(r))
  } finally {
    for (const name of [A, B]) {
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`minecraft:tp ${name} 0.5 68 -656.5`).catch(() => {}) // solid ground near spawn
    }
    for (const bot of Object.values(bots)) await quit(bot)
    await rcon.cmd(`rg remove -w world ${ZONE}`).catch(() => {})
    await rcon.cmd('scoreboard objectives remove zzzonedeaths').catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air replace glass`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
