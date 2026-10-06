// Gun damage (owner, 2026-09-26): the strongest gun kills an unarmored player in 4 shots and one in the
// strongest gear (Tactical Helmet 3 + Heavy Vest 8 = 11 armor points) in 10-12. WeaponMechanics skips
// vanilla armor: a hit does base × (1 + Per_Armor_Point × armor points), Per_Armor_Point -6%.
// A shooter bot fires at a target bot 4 blocks away (standing still, body shots) and every health drop
// is one hit. Shots to kill = ceil(20 / drop).
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')
const fs = require('fs')
const path = require('path')

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
    // Where on the target (feet up): 1.0 body; 1.6 head; 0.45 legs (WeaponMechanics' player hitbox:
    // head 25%, body 37.5%, legs 25%, feet 12.5% of 1.8).
    let height = 1.0
    const aim = async () => {
      const t = a.players[TARGET] && a.players[TARGET].entity
      if (t) await a.lookAt(t.position.offset(0, height, 0), true)
    }
    // A fresh gun (a full magazine) in the slot, then fires until `n` hits landed; returns the drops.
    const give = async (w, slot) => {
      await cmd(`minecraft:item replace entity ${SHOOTER} hotbar.${slot} with minecraft:air`)
      await cmd(`wm give ${SHOOTER} ${w} 1 {slot:${slot}}`)
    }
    const fire = async (slot, n, ms = 12000) => fireW(slot === 0 ? 'AK_47' : 'R9_0', slot, n, ms)
    // Any gun: a fresh one in the slot, clicks every gap ms until n hits landed (the equip delay first).
    const fireW = async (w, slot, n, ms = 12000, gap = 450, equip = 300) => {
      await give(w, slot)
      a.setQuickBarSlot(slot)
      await sleep(equip)
      const end = Date.now() + ms
      while (drops.length < n && Date.now() < end) {
        await aim()
        a.activateItem()
        await sleep(120)
        a.deactivateItem()
        await sleep(gap)
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
    check('R9-0, no armor: a blast at 4 blocks does 3-6 (10 pellets × 0.6, most of them hit), so it takes 4 or more', sg.length === 1 && sg[0] <= 6.05 && sg[0] >= 3, `drops ${sg.join(', ')}`)

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

    // The PG3D guns added 2026-10-06 (the owner's rule: no non-sniper kills an unarmored player in fewer than 4 body
    // shots, the AK-48 stays the strongest automatic; the sniper takes 2, never 1).
    await heal()
    const rev = await fireW('357_Magnum', 3, 3, 12000, 700, 900)
    check('Old Revolver, no armor: 5.3 a body shot (4 shots)', rev.length === 3 && Math.abs(avg(rev) - 5.3) < 0.3 && shots(avg(rev)) === 4, `drops ${rev.join(', ')}`)
    await heal()
    const pat = await fireW('STG44', 4, 3, 12000, 450, 1400)
    check('Brave Patriot, no armor: 5.1 a body shot (4 shots), under the AK-48', pat.length === 3 && Math.abs(avg(pat) - 5.1) < 0.3 && shots(avg(pat)) === 4 && avg(pat) < 5.5, `drops ${pat.join(', ')}`)
    // One trigger pull of the Combat Rifle is a 3-round burst; a burst never kills (3 x 4.9 = 14.7 < 20, and its worst
    // stack, three head shots at x1.15, is 16.9). The rounds fired are counted from the magazine (a missed round would
    // otherwise hide a burst of 2 or 4), and all 3 must land at 4 blocks.
    const ammoLeft = async slot => {
      const out = await cmd(`data get entity ${SHOOTER} Inventory[{Slot:${slot}b}].components."minecraft:custom_data".PublicBukkitValues."weaponmechanics:ammo-left"`)
      const m = out.match(/data: (-?\d+)/)
      return m ? Number(m[1]) : NaN
    }
    await heal()
    await give('M4A1', 5)
    a.setQuickBarSlot(5)
    await sleep(1600)
    const before = await ammoLeft(5)
    await aim()
    a.activateItem()
    await sleep(60)
    a.deactivateItem()
    await sleep(1200)
    const fired = before - (await ammoLeft(5))
    const burst = drops.slice()
    const sum = burst.reduce((x, y) => x + y, 0)
    const yml = fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'plugins', 'WeaponMechanics', 'weapons', 'assault_rifles', 'M4A1.yml'), 'utf8')
    const base = Number((yml.match(/Base_Damage: ([\d.]+)/) || [])[1])
    check('Combat Rifle: one trigger pull fires exactly 3 rounds, all 3 land at 4.9 (5 shots kill), and a burst never kills (even 3 head shots: 3 x base x 1.15 < 20)', fired === 3 && burst.length === 3 && burst.every(d => Math.abs(d - 4.9) < 0.3) && sum < 20 && b.health > 0 && 3 * base * 1.15 < 20, `fired ${fired} (${before} left before), drops ${burst.join(', ')} (sum ${sum.toFixed(1)}), health ${b.health}, base ${base}`)
    await heal()
    // The target is fed and saturated (heal()): it heals 1 HP every half second, so the second of the sniper's slow shots
    // can read 1 lower; the first is exact.
    const sn = await fireW('AX_50', 6, 2, 16000, 1300, 2400)
    check('Sniper Rifle, no armor: 12 a body shot, so 2 shots kill and never 1', sn.length === 2 && Math.abs(sn[0] - 12) < 0.3 && sn[1] > 10.9 && sn[1] < 12.3 && shots(12) === 2, `drops ${sn.join(', ')}`)
    await heal()
    height = 1.62
    // Through the scope (the hip spread is wide on purpose; zoomed it's 8% of it).
    await give('AX_50', 6)
    a.setQuickBarSlot(6)
    await sleep(2400)
    await aim()
    a.swingArm('right')
    await sleep(600)
    const hEnd = Date.now() + 8000
    while (drops.length < 1 && Date.now() < hEnd) { await aim(); a.activateItem(); await sleep(120); a.deactivateItem(); await sleep(1300) }
    const snHead = drops.slice(0, 1)
    height = 1.0
    check('...a head shot is 13.8 (12 + 15%): still not a one-shot', snHead.length === 1 && Math.abs(snHead[0] - 13.8) < 0.4 && snHead[0] < 20, `drops ${snHead.join(', ')}`)

    // ---------- The strongest gear: 11 armor points ----------
    await cmd(`minecraft:item replace entity ${TARGET} armor.head with minecraft:diamond_helmet`)
    await cmd(`minecraft:item replace entity ${TARGET} armor.chest with minecraft:diamond_chestplate`)
    await sleep(500)
    await heal()
    const akA = await fire(0, 3)
    const akAHit = avg(akA)
    const n = shots(akAHit)
    check('AK-47 against a Tactical Helmet + Heavy Vest: 10-12 shots to kill (5.5 × 0.34 = 1.87 a shot: 11)', akA.length === 3 && n >= 10 && n <= 12, `drops ${akA.join(', ')} -> ${n} shots`)
    // Hit spots are small modifiers now (review, 2026-09-26): the head +15% (0.49: 2.70, 8 shots), legs 0%.
    await heal()
    height = 1.62
    const head = await fire(0, 3)
    check('...a head shot through the best gear: 2.70 (8 shots), not a one-shot and not nothing', head.length === 3 && head.some(d => Math.abs(d - 2.7) < 0.1) && head.every(d => d >= 1.5), `drops ${head.join(', ')}`)
    await heal()
    height = 0.45
    const legs = await fire(0, 3)
    check('...leg shots through the best gear still count (1.87, 11 shots; no hit spot does nothing)', legs.length === 3 && legs.every(d => d >= 1.5 && d <= 2.0), `drops ${legs.join(', ')}`)
    height = 1.0
    await heal()
    const snA = await fireW('AX_50', 6, 2, 16000, 1300, 2400)
    check('Sniper Rifle against the best gear: 4.08 a body shot (12 x 0.34: 5 shots)', snA.length === 2 && Math.abs(snA[0] - 4.08) < 0.2 && snA[1] > 2.9 && snA[1] < 4.3, `drops ${snA.join(', ')}`)
    await heal()
    const revA = await fireW('357_Magnum', 3, 2, 12000, 700, 900)
    check('Old Revolver against the best gear: 1.80 a body shot (12 shots)', revA.length === 2 && revA.every(d => Math.abs(d - 1.8) < 0.15), `drops ${revA.join(', ')}`)
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
