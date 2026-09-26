// Gun damage (owner, 2026-09-26): the strongest gun kills an unarmored player in 4 shots and one in the
// strongest gear (Tactical Helmet 3 + Heavy Vest 8 = 11 armor points) in 10-12. WeaponMechanics skips
// vanilla armor: a hit does base × (1 + Per_Armor_Point × armor points), Per_Armor_Point -6%.
// A shooter bot fires at a target bot 4 blocks away (standing still, body shots) and every health drop
// is one hit. Shots to kill = ceil(20 / drop).
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const SHOOTER = 'DmgShooter'
const TARGET = 'DmgTarget'
const Y = 200
const PLATFORM = `700 ${Y - 1} 698 704 ${Y - 1} 708`
const CHUNKS = '700 698 704 708'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = c => rcon.cmd(c)
  let a = null
  let b = null
  try {
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    a = await join(SHOOTER)
    b = await join(TARGET)
    await sleep(6500) // a new player can't be hurt until its client says it has loaded (bots never do)
    // Every health drop of the target, in order.
    let drops = []
    let last = null
    b.on('health', () => {
      if (last !== null && b.health < last - 0.01) drops.push(+(last - b.health).toFixed(2))
      last = b.health
    })
    const place = async () => {
      await cmd(`minecraft:tp ${SHOOTER} 702.5 ${Y} 700.5 0 0`)
      await cmd(`minecraft:tp ${TARGET} 702.5 ${Y} 704.5 180 0`) // facing the shooter: no backstab
      await sleep(5200) // EssentialsX's teleport protection (4 s)
      await cmd(`zzshieldoff ${SHOOTER}`)
      await cmd(`zzshieldoff ${TARGET}`)
    }
    // 40 health (health boost: it doesn't change the damage), so shots still in flight after a series
    // can't kill the target; the checks use the drops.
    const heal = async () => {
      await sleep(800)
      await cmd(`minecraft:effect give ${TARGET} minecraft:health_boost 600 4 true`)
      await cmd(`minecraft:effect give ${TARGET} minecraft:instant_health 1 10 true`)
      await cmd(`minecraft:effect give ${TARGET} minecraft:saturation 1 10 true`)
      await sleep(400)
      last = b.health
      drops = []
    }
    const aim = async () => {
      const t = a.players[TARGET] && a.players[TARGET].entity
      if (t) await a.lookAt(t.position.offset(0, 1.0, 0), true)
    }
    // A fresh gun (a full magazine) in the slot, then fires until `n` hits landed; returns the drops.
    const give = async (w, slot) => {
      await cmd(`minecraft:item replace entity ${SHOOTER} hotbar.${slot} with minecraft:air`)
      await cmd(`wm give ${SHOOTER} ${w} 1 {slot:${slot}}`)
    }
    const fire = async (slot, n, ms = 12000) => {
      await give(slot === 0 ? 'AK_47' : 'R9_0', slot)
      a.setQuickBarSlot(slot)
      await sleep(300)
      const end = Date.now() + ms
      while (drops.length < n && Date.now() < end) {
        await aim()
        a.activateItem()
        await sleep(120)
        a.deactivateItem()
        await sleep(450)
      }
      return drops.slice(0, n)
    }
    const shots = d => Math.ceil(20 / d)
    const avg = l => l.reduce((s, x) => s + x, 0) / (l.length || 1)

    await cmd(`wm give ${SHOOTER} AK_47 1 {slot:0}`)
    await cmd(`wm give ${SHOOTER} R9_0 1 {slot:1}`)
    await cmd(`wm give ${SHOOTER} Combat_Knife 1 {slot:2}`)
    await cmd(`minecraft:clear ${TARGET}`)
    await place()

    // ---------- Unarmored ----------
    await heal()
    const ak = await fire(0, 3)
    const akHit = avg(ak)
    check('AK-47, no armor: 5.5 a body shot, so 4 shots kill', ak.length === 3 && Math.abs(akHit - 5.5) < 0.3 && shots(akHit) === 4, `drops ${ak.join(', ')}`)

    await heal()
    const sg = await fire(1, 1)
    // All pellets of one blast arrive in the same tick: one drop.
    check('R9-0, no armor: a point-blank blast does at most 6 (10 pellets × 0.6), so it takes 4 or more', sg.length === 1 && sg[0] <= 6.05 && sg[0] > 0, `drops ${sg.join(', ')}`)

    await heal()
    a.setQuickBarSlot(2)
    await sleep(300)
    const kEnd = Date.now() + 8000
    while (drops.length < 2 && Date.now() < kEnd) {
      await aim()
      const t = a.players[TARGET] && a.players[TARGET].entity
      if (t) a.attack(t)
      await sleep(1100) // the knife's hit delay is 20 ticks
    }
    const knife = drops.slice(0, 2)
    check('Combat Knife, no armor: 5 a hit, so 4 hits kill', knife.length === 2 && Math.abs(avg(knife) - 5) < 0.3, `drops ${knife.join(', ')}`)

    // ---------- The strongest gear: 11 armor points ----------
    await cmd(`minecraft:item replace entity ${TARGET} armor.head with minecraft:diamond_helmet`)
    await cmd(`minecraft:item replace entity ${TARGET} armor.chest with minecraft:diamond_chestplate`)
    await sleep(500)
    await heal()
    const akA = await fire(0, 3)
    const akAHit = avg(akA)
    const n = shots(akAHit)
    check('AK-47 against a Tactical Helmet + Heavy Vest: 10-12 shots to kill (5.5 × 0.34 = 1.87 a shot: 11)', akA.length === 3 && n >= 10 && n <= 12, `drops ${akA.join(', ')} -> ${n} shots`)
  } finally {
    await cmd(`minecraft:clear ${TARGET}`).catch(() => {})
    await cmd(`minecraft:clear ${SHOOTER}`).catch(() => {})
    await cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    if (a) await quit(a)
    if (b) await quit(b)
    await cmd(`fill ${PLATFORM} air`).catch(() => {})
    rcon.close()
  }
}
