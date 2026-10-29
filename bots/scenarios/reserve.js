// The Federal Reserve (tools/build/north/PLAN.md section 2, 2026-10-29): the heist is set up and open, every gate and pile
// is armed, the level lock holds, and a level-50 robber smashes the teller glass (G1) and takes a till into the bag;
// the security door (G2) and both vault doors get their hitboxes.
const fs = require('fs')
const path = require('path')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const P = 'ReserveBot'
const ID = 'reserve'
const LOG = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs', 'loot.log')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  const logLen = fs.existsSync(LOG) ? fs.statSync(LOG).size : 0
  const logged = () => fs.existsSync(LOG) ? fs.readFileSync(LOG).subarray(logLen).toString('utf8') : '' // bytes, not characters
  const until = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(500) } return Boolean(await fn()) }
  const spot = async n => ((await cmd(`zzloot ${ID}`)).match(new RegExp(`\\| ${n}:(\\w+):(\\w*):[^|]*hb=(\\d+)`)) || []).slice(1)
  const box = (x, y, z) => Object.values(bot.entities).filter(e => e.name === 'interaction').sort((a, b) => Math.hypot(a.position.x - x, a.position.y - y, a.position.z - z) - Math.hypot(b.position.x - x, b.position.y - y, b.position.z - z))[0]
  const hold = async (x, y, z, ms) => { const end = Date.now() + ms; while (Date.now() < end) { const e = box(x, y, z); if (e) bot.activateEntity(e).catch(() => {}); await sleep(200) } }
  try {
    check('the heist is open', await until(async () => /state=open/.test(await cmd(`zzheist ${ID}`)), 30000), await cmd(`zzheist ${ID}`))
    const zl = await cmd(`zzloot ${ID}`)
    check('every pile is armed and rolled', /armed=true/.test(zl) && /spots=10\/10/.test(zl), zl.slice(0, 160))

    bot = await join(P)
    await cmd(`zzclear ${P}`)
    await cmd(`zzbagclear ${P}`)
    await cmd(`gamemode survival ${P}`)
    await cmd(`zzpassive ${P} off`)
    await cmd(`zztestkit ${P}`)
    bot.setQuickBarSlot(0)

    // The level lock: level 49 walking in through the front door is kept out.
    await cmd(`dlevel set ${P} 49`)
    await cmd(`minecraft:tp ${P} 680.5 65 176.5 -90 0`)
    await sleep(2500)
    bot.setControlState('forward', true)
    await sleep(2500)
    bot.setControlState('forward', false)
    await sleep(1000)
    check('level 49 is kept out of the Reserve', !/ reserve/.test(await cmd(`zzinheist ${P}`)), await cmd(`zzinheist ${P}`))

    // Level 50: in the hall, then the teller glass.
    await cmd(`dlevel set ${P} 50`)
    await cmd(`zzheisttp ${P} 716.5 65 176.5`)
    await sleep(2500)
    await bot.look(-Math.PI / 2, 0, true) // facing east, at the counter
    check('level 50 is in the Reserve', / reserve/.test(await cmd(`zzinheist ${P}`)), await cmd(`zzinheist ${P}`))
    await hold(718.5, 66, 176.5, 2500)
    await sleep(500)
    const g1 = await spot(1)
    check('holding on the teller glass smashes G1', g1[1] === 'open' && /passed/i.test(await cmd('execute if block 718 66 176 minecraft:air')), g1.join(':'))

    // The till P2 (721, 65, 176) behind it.
    await cmd(`zzheisttp ${P} 720.5 65 176.5`)
    await sleep(2000)
    await hold(721.5, 66, 176.5, 6000)
    await sleep(500)
    const bag = await cmd(`zzbag ${P}`)
    check('a till pays into the bag as a reserve line', /reserve#\d+=\d+/.test(bag) && /take ReserveBot \S+ reserve-8 /.test(logged()), bag)

    // The locked gates further in have hitboxes once a robber is near.
    await cmd(`zzheisttp ${P} 725.5 65 176.5`)
    await sleep(3000)
    const g2 = await spot(2)
    check('the security door G2 has its hitboxes', Number(g2[2]) > 0, g2.join(':'))
    await cmd(`zzheisttp ${P} 714.5 53 170.5`)
    await sleep(3000)
    const g3 = await spot(3)
    check('vault door 1 (G3, a drill) has its hitboxes in the gallery', Number(g3[2]) > 0, g3.join(':'))
  } finally {
    if (bot) bot.clearControlStates()
    await rcon.cmd(`zzbagclear ${P}`).catch(() => {})
    await rcon.cmd(`zzheisttp ${P} 676.5 65 176.5`).catch(() => {})
    await sleep(1000)
    if (bot) await quit(bot).catch(() => {})
    // Back to a clean, open Reserve (the run above smashed G1 and took a till): end the run, then open it as soon as
    // its reset (during the cooldown) is done.
    await rcon.cmd(`dheist end ${ID}`).catch(() => {})
    await rcon.cmd(`dheist open ${ID}`).catch(() => {})
    rcon.close()
  }
}
