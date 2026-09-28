// Teleport immunity (owner, 2026-09-27: "3 seconds immunity (test out different scenarios to find points of abuse)"):
// for 3 s after a teleport a player can't hurt or be hurt by players (EssentialsX teleport-invulnerability 3). This
// probes where it could be abused: a pushback at a safe zone's edge while combat-tagged (spamming the edge must not
// give a shield), whether the protected player can hit others, and how long it lasts.
const conv = require('mineflayer/lib/conversions')
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'ImmA'
const B = 'ImmB'
const Y = 200
const PLATFORM = `3180 ${Y - 1} 3180 3200 ${Y - 1} 3190`
const CHUNKS = '3180 3180 3200 3190'
const ZONE = 'safe_zimm' // x 3190..3200: the east half
const EDGE = 3190

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    await cmd(`rg remove -w world ${ZONE}`)
    await cmd(`zzregion ${ZONE} ${EDGE} ${Y - 10} 3180 3200 ${Y + 20} 3190`)
    await cmd(`rg flag -w world ${ZONE} passthrough allow`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzpassive ${name} off`)
    }
    await sleep(7000) // bots can't be hurt until about 6 s after joining
    const health = async name => Number(((await cmd(`data get entity ${name} Health`)).match(/data: ([\d.]+)/) || [])[1])
    const posX = async name => Number(((await cmd(`data get entity ${name} Pos[0]`)).match(/data: (-?[\d.]+)/) || [])[1])
    const heal = async () => { for (const name of [A, B]) await cmd(`minecraft:effect give ${name} minecraft:instant_health 1 10 true`) }
    // Puts both bots in place and waits out every protection (the teleport's own immunity too).
    const place = async (ax, bx) => {
      await cmd(`minecraft:tp ${A} ${ax} ${Y} 3185.5 -90 0`)
      await cmd(`minecraft:tp ${B} ${bx} ${Y} 3185.5 90 0`)
      for (const name of [A, B]) { await cmd(`zzshieldoff ${name}`); await cmd(`zzcombatend ${name}`) }
      await heal()
      await sleep(4500)
    }
    const punch = async (from, to) => {
      const a = bots[from]
      const target = a.players[to] && a.players[to].entity
      if (!target) return { lost: -1 }
      const before = await health(to)
      await a.lookAt(target.position.offset(0, 1.4, 0), true)
      a.attack(target)
      await sleep(600)
      return { lost: before - (await health(to)) }
    }

    // ---------- Control ----------
    await place(3186.5, 3188.5)
    let r = await punch(A, B)
    check('control: a punch lands when nobody was just teleported', r.lost > 0, JSON.stringify(r))

    // ---------- A command teleport: 3 s of immunity both ways ----------
    await place(3186.5, 3188.5)
    await cmd(`minecraft:tp ${B} 3188.5 ${Y} 3185.5 90 0`)
    await sleep(700)
    r = await punch(A, B)
    const hitAfterTp = r.lost
    await sleep(300)
    r = await punch(B, A)
    const bHits = r.lost
    await sleep(2600)
    await heal()
    await sleep(300)
    r = await punch(A, B)
    check('teleported by a command: nobody hurts them for the first second, and they can\'t hurt anyone either', hitAfterTp === 0 && bHits === 0, `hurt ${hitAfterTp}, their hit ${bHits}`)
    check('...and after 3 s the punch lands (not 4)', r.lost > 0, JSON.stringify(r))

    // ---------- Abuse: a tagged player pushed back at a safe zone's edge gets no shield ----------
    await place(3187.6, 3188.5) // A stays within reach of the edge (x 3190)
    await punch(A, B) // tags both
    await sleep(700)
    const bot = bots[B]
    await bot.look(conv.fromNotchianYaw(-90), 0, true)
    bot.setControlState('forward', true)
    await sleep(1500)
    bot.setControlState('forward', false)
    const bx = await posX(B)
    await heal()
    await sleep(200)
    const ax = await posX(A)
    r = await punch(A, B)
    check('a combat-tagged player pushed back at a safe zone\'s edge gets no immunity (the punch right after lands)', bx < EDGE && r.lost > 0, `A x ${ax}, B x ${bx}, lost ${r.lost}`)

    // ---------- Thrown out of a heist at 0:00: protected at the exit (no camping it) ----------
    await cmd('dheist delete zimm confirm')
    await cmd('rg remove -w world heist_zimm')
    await cmd(`zzregion heist_zimm 3180 ${Y - 1} 3180 3184 ${Y + 4} 3184`)
    for (const c of ['dheist create zimm 1', 'dheist set zimm level 0', 'dheist set zimm cooldown 5', `dheist exit zimm 3186.5 ${Y} 3182.5 -90`, 'dheist snapshot zimm', 'dheist enable zimm']) await cmd(c)
    const opened = await (async () => { for (let i = 0; i < 40; i++) { if (/state=open/.test(await cmd('dheist info zimm'))) return true; await sleep(250) } return false })()
    await cmd(`zzheisttp ${A} 3182.5 ${Y} 3182.5`)
    await cmd(`minecraft:tp ${B} 3187.8 ${Y} 3182.5 90 0`)
    await sleep(4000)
    for (const name of [A, B]) { await cmd(`zzshieldoff ${name}`); await cmd(`zzcombatend ${name}`) }
    await heal()
    await cmd('dheist start zimm')
    await sleep(500)
    await cmd('dheist end zimm')
    await sleep(700)
    const evicted = await posX(A)
    r = await punch(B, A)
    const campHit = r.lost
    await sleep(300)
    r = await punch(A, B)
    const theirHit = r.lost
    check('thrown out of a heist at 0:00: nobody at the exit hurts them for 3 s, and they can\'t strike first either', opened && evicted > 3185 && campHit === 0 && theirHit === 0, `opened=${opened} x ${evicted}, camper's hit ${campHit}, theirs ${theirHit}`)
    await sleep(2600)
    await heal()
    await sleep(300)
    r = await punch(B, A)
    check('...and after 3 s the fight is on', r.lost > 0, JSON.stringify(r))
  } finally {
    await rcon.cmd('dheist delete zimm confirm').catch(() => {})
    await rcon.cmd('rg remove -w world heist_zimm').catch(() => {})
    await rcon.cmd('minecraft:kill @e[tag=poi_h_zimm]').catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`minecraft:tp ${name} 0.5 68 -656.5`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`rg remove -w world ${ZONE}`).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air replace glass`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
