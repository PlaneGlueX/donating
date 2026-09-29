// districts.sk: district names. A WorldGuard region district_<id> is a district; entering it shows its name on the action
// bar ("— Test Town —", the staff-given name, else the id made readable), not again within 30 s; the sidebar's Area line
// (%donating_district%) is the smallest district you're in, else "the outskirts"; /ddistrict is staff only.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'DistrictA'
const Y = 200
const CHUNKS = '3790 3790 3830 3830'
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  try {
    const bar = t => messagesSince(bot, t).filter(m => m.kind === 'game_info').map(m => m.text).join(' | ')
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const papi = async ph => ((await cmd(`zzpapi ${A} ${ph}`)).match(/= (.*)$/m) || [])[1] || ''
    const tp = async (x, z) => { await cmd(`zzheisttp ${A} ${x} ${Y} ${z}`); await sleep(1600) }

    // ---------- Setup: a town, and a square inside it ----------
    await cmd('rg remove -w world district_ztown')
    await cmd('rg remove -w world district_zold_square')
    await cmd('ddistrict name ztown default')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 3790 ${Y - 1} 3790 3830 ${Y - 1} 3830 glass`)
    await cmd(`zzregion district_ztown 3800 ${Y - 5} 3800 3820 ${Y + 20} 3820`)
    await cmd(`zzregion district_zold_square 3808 ${Y - 5} 3808 3812 ${Y + 20} 3812`)
    bot = await join(A)
    await cmd(`zzclear ${A}`)
    await cmd(`lp user ${A} permission unset donating.staff`)
    await sleep(2500)
    await tp(3795.5, 3795.5)

    // ---------- Names ----------
    const named = await cmd('ddistrict name ztown Test Town')
    check('staff name a district (/ddistrict name <id> <name>)', /DISTRICT ztown = Test Town/.test(named), named)
    let t = Date.now()
    await tp(3802.5, 3802.5)
    check('entering it shows its name on the action bar', /— Test Town —/.test(bar(t)), bar(t))
    check('...and the sidebar\'s Area line says where you are', /Test Town/.test(await papi('donating_district')), await papi('donating_district'))
    t = Date.now()
    await tp(3795.5, 3795.5)
    check('outside every district: "the outskirts"', /the outskirts/.test(await papi('donating_district')), await papi('donating_district'))
    await tp(3802.5, 3802.5)
    check('back in within 30 s: no second time (no spam when crossing back and forth)', !/Test Town/.test(bar(t)), bar(t))
    t = Date.now()
    await tp(3810.5, 3810.5)
    check('a district inside it: its own name, the id made readable ("zold_square" -> "Zold Square")', /— Zold Square —/.test(bar(t)) && /Zold Square/.test(await papi('donating_district')), `${bar(t)} | ${await papi('donating_district')}`)

    // ---------- Staff only ----------
    t = Date.now()
    bot.chat('/ddistrict list')
    await sleep(800)
    check('/ddistrict is staff only', /Staff only/.test(text(t)), text(t))
    const list = await cmd('ddistrict list')
    check('/ddistrict list (console) shows both with their names', /ztown: Test Town/.test(list) && /zold_square: Zold Square/.test(list), list)
  } finally {
    await rcon.cmd('ddistrict name ztown default').catch(() => {})
    await rcon.cmd('rg remove -w world district_ztown').catch(() => {})
    await rcon.cmd('rg remove -w world district_zold_square').catch(() => {})
    await rcon.cmd(`fill 3790 ${Y - 1} 3790 3830 ${Y - 1} 3830 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    await rcon.cmd(`zzheisttp ${A} ${FAR}`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
