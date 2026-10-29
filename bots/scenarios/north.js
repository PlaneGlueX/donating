// Rising City North's heists (tools/build/north/PLAN.md, 2026-10-29), one at a time: `bots/run.js north <heist>`
// (default: every heist in HEISTS). For each: it's open and every pile is armed, a robber one level short is kept out at
// the front door, one at the level gets in, smashes a gate and takes from the pile behind it into the bag, takes from an
// open pile if the heist has one, and the locked gates further in get their hitboxes. A store (clerk: true): a hit on the clerk
// opens it first (no level check at level 1: everyone has it). After, the run is ended and the
// heist reopens as soon as its room reset is done.
const fs = require('fs')
const path = require('path')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const P = 'NorthBot'
const LOG = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs', 'loot.log')
// [x, y, z] spots: `door` = where the short robber starts, walking in along `yaw`; `inside` = a spot in the heist;
// smash: stand, aim (the glass), the gate's number; take: stand, aim (the loot), the pile's number; hitboxes: stand, gate.
const HEISTS = {
  reserve: {
    level: 50, piles: 10,
    door: [680.5, 65, 176.5], yaw: -90, inside: [716.5, 65, 176.5],
    smash: { stand: [716.5, 65, 176.5], aim: [718.5, 66, 176.5], gate: 1 },
    take: { stand: [720.5, 65, 176.5], aim: [721.5, 66, 176.5], pile: 8 },
    hitboxes: [{ stand: [725.5, 65, 176.5], gate: 2, name: 'the security door G2' }, { stand: [714.5, 53, 170.5], gate: 3, name: 'vault door 1 (G3)' }]
  },
  gallery: {
    level: 12, piles: 7,
    door: [595.5, 65, 137.5], yaw: 0, inside: [610.5, 65, 165.5],
    smash: { stand: [603.5, 65, 162.5], aim: [603.5, 66, 161.5], gate: 1 },
    take: { stand: [603.5, 65, 162.5], aim: [603.5, 66, 160.5], pile: 5 },
    open: { stand: [570.5, 65, 167.5], aim: [570.5, 66, 166.5], pile: 9, name: 'a sculpture (no gate)' },
    hitboxes: []
  },
  club: {
    level: 10, piles: 7,
    door: [666.5, 65, 262.5], yaw: -90, inside: [676.5, 65, 262.5],
    smash: { stand: [701.5, 65, 247.5], aim: [701.5, 66, 246.5], gate: 1 },
    take: { stand: [702.5, 65, 244.5], aim: [702.5, 66, 242.5], pile: 4 },
    open: { stand: [727.5, 65, 247.5], aim: [729.5, 66, 247.5], pile: 7, name: 'a VIP table (no gate)' },
    hitboxes: [{ stand: [732.5, 65, 270.5], gate: 2, name: 'the office safe G2' }]
  },
  pawn: {
    level: 1, piles: 2, clerk: true,
    door: [618.5, 65, 107.5], yaw: 180, inside: [618.5, 65, 98.5],
    smash: { stand: [624.5, 65, 82.5], aim: [625.5, 66, 82.5], gate: 1 },
    take: { stand: [627.5, 65, 82.5], aim: [629.5, 66, 82.5], pile: 3 },
    open: { stand: [618.5, 65, 92.5], aim: [618.5, 66, 91.5], pile: 2, name: 'the register' },
    hitboxes: []
  }
}

module.exports = async ({ check, args }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  const logLen = fs.existsSync(LOG) ? fs.statSync(LOG).size : 0
  const logged = () => fs.existsSync(LOG) ? fs.readFileSync(LOG).subarray(logLen).toString('utf8') : '' // bytes, not characters
  const until = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(500) } return Boolean(await fn()) }
  // the nearest hitbox to the spot; at a tie the newest (a respawned spot can leave the old box in the bot's list)
  const box = (x, y, z) => Object.values(bot.entities).filter(e => e.name === 'interaction').map(e => [Math.round(Math.hypot(e.position.x - x, e.position.y - y, e.position.z - z) * 100), e]).sort((a, b) => a[0] - b[0] || b[1].id - a[1].id)[0]?.[1]
  const hold = async ([x, y, z], ms) => { const end = Date.now() + ms; while (Date.now() < end) { const e = box(x, y, z); if (e) bot.activateEntity(e).catch(() => {}); await sleep(200) } }
  const tp = async ([x, y, z]) => { await cmd(`zzheisttp ${P} ${x} ${y} ${z}`); await sleep(2500) }
  const ids = args.length ? args : Object.keys(HEISTS)
  let id = null
  try {
    bot = await join(P)
    for (id of ids) {
      const H = HEISTS[id]
      if (!H) { check(`${id}: a heist this scenario knows`, false, Object.keys(HEISTS).join(' ')); continue }
      const spot = async n => ((await cmd(`zzloot ${id}`)).match(new RegExp(`\\| ${n}:(\\w+):(\\w*):[^|]*hb=(\\d+)`)) || []).slice(1)
      check(`${id}: open`, await until(async () => /state=open/.test(await cmd(`zzheist ${id}`)), 60000), await cmd(`zzheist ${id}`))
      const zl = await cmd(`zzloot ${id}`)
      check(`${id}: every pile armed and rolled`, /armed=true/.test(zl) && new RegExp(`spots=${H.piles}/${H.piles}`).test(zl), zl.slice(0, 160))

      await cmd(`zzclear ${P}`)
      await cmd(`zzbagclear ${P}`)
      await cmd(`gamemode survival ${P}`)
      await cmd(`zzpassive ${P} off`)
      await cmd(`zztestkit ${P}`)
      bot.setQuickBarSlot(0)

      // One level short, walking in through the front door: kept out.
      if (H.level > 1) {
        await cmd(`dlevel set ${P} ${H.level - 1}`)
        await cmd(`minecraft:tp ${P} ${H.door.join(' ')} ${H.yaw} 0`)
        await sleep(2500)
        bot.setControlState('forward', true)
        await sleep(3000)
        bot.setControlState('forward', false)
        await sleep(1000)
        check(`${id}: level ${H.level - 1} is kept out`, !new RegExp(` ${id} `).test(await cmd(`zzinheist ${P}`)), await cmd(`zzinheist ${P}`))
      }

      await cmd(`dlevel set ${P} ${H.level}`)
      await tp(H.inside)
      const inside = await until(async () => new RegExp(` ${id} `).test(await cmd(`zzinheist ${P}`)), 8000) // heists.sk's reconcile decides
      check(`${id}: level ${H.level} is in`, inside, await cmd(`zzinheist ${P}`))

      if (H.clerk) {
        const shut = /:pile:shut:/.test(await cmd(`zzloot ${id}`))
        await cmd(`zzclerkhit ${id} ${P}`)
        const hit = await until(async () => !/ hit=<none> /.test(await cmd(`dclerk ${id} info`)), 3000)
        check(`${id}: shut until a hit on the clerk opens it`, shut && hit && /state=active/.test(await cmd(`zzheist ${id}`)), (await cmd(`dclerk ${id} info`)).slice(0, 160))
      }

      await tp(H.smash.stand)
      // hold until it breaks, 10 s at most. A store's clerk throws things (a hit starts the hold over): hit them first, as a
      // player would, so they duck for clerk::stun.
      for (let end = Date.now() + 10000; Date.now() < end && (await spot(H.smash.gate))[1] !== 'open';) {
        if (H.clerk) await cmd(`zzclerkhit ${id} ${P}`)
        await hold(H.smash.aim, 2000)
      }
      const g = await spot(H.smash.gate)
      const [ax, ay, az] = H.smash.aim.map(Math.floor)
      check(`${id}: holding on the glass smashes G${H.smash.gate}`, g[1] === 'open' && /passed/i.test(await cmd(`execute if block ${ax} ${ay} ${az} minecraft:air`)), g.join(':'))

      for (const T of [H.take, H.open].filter(Boolean)) {
        await tp(T.stand)
        await hold(T.aim, 6000)
        await sleep(500)
        const bag = await cmd(`zzbag ${P}`)
        check(`${id}: ${T.name || `the pile behind G${H.smash.gate}`} pays into the bag`, new RegExp(`${id}#\\d+=\\d+`).test(bag) && new RegExp(`take ${P} \\S+ ${id}-${T.pile} `).test(logged()), bag)
      }

      for (const Hb of H.hitboxes) {
        await tp(Hb.stand)
        await sleep(500)
        const s = await spot(Hb.gate)
        check(`${id}: ${Hb.name} has its hitboxes`, Number(s[2]) > 0, s.join(':'))
      }

      // Out, and the heist back to clean and open.
      await cmd(`zzbagclear ${P}`)
      await cmd(`minecraft:tp ${P} ${H.door.join(' ')}`)
      await sleep(1500)
      await cmd(`dheist end ${id}`)
      await cmd(`dheist open ${id}`)
    }
  } finally {
    if (bot) bot.clearControlStates()
    await rcon.cmd(`zzbagclear ${P}`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    if (id) { await rcon.cmd(`dheist end ${id}`).catch(() => {}); await rcon.cmd(`dheist open ${id}`).catch(() => {}) }
    rcon.close()
  }
}
