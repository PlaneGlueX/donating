// The sidebars' new lines (placeholders.sk: wanted, heist difficulty and robbers inside, heists open,
// the daily reward) and /bag, the bag contents menu (bag.sk; also the phone's Bag app).
const { Vec3 } = require('vec3')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'BoardA'
const Y = 200
const ID = 'zboard'
const REGION = 'heist_zboard'
const CHUNKS = '1000 1000 1030 1030'
const PLATFORM = `1000 ${Y - 1} 1000 1030 ${Y - 1} 1030`
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot
  try {
    const papi = async ph => ((await cmd(`zzpapi ${A} ${ph}`)).match(/= (.*)$/m) || [])[1] || ''
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const windowOpen = () => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const itemText = i => (i ? JSON.stringify(i) : '')

    await cmd(`dheist delete ${ID} confirm`)
    await cmd(`rg remove -w world ${REGION}`)
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    await cmd('zzcfgreload')
    await cmd('zzcfgtext heist::start-on enter')
    bot = await join(A)
    await cmd(`gamemode survival ${A}`)
    await cmd(`zzclear ${A}`)
    await cmd(`zzbagclear ${A}`)
    await cmd(`zzcombatend ${A}`)
    await cmd(`zzcratereset ${A}`)
    await cmd(`zzdata ${A} level none`)
    await cmd(`lp user ${A} permission unset donating.wanted`)
    await cmd(`zzheisttp ${A} 1002.5 ${Y} 1002.5`)
    await sleep(2000)

    // ---------- Placeholders ----------
    check('daily: "ready" until claimed, then the time left', /ready/.test(await papi('donating_daily')), await papi('donating_daily'))
    bot.chat('/daily')
    await sleep(1500)
    check('...and after /daily, the time left', /19h 59m|20h 0m/.test(await papi('donating_daily')), await papi('donating_daily'))
    check('not wanted: nothing', (await papi('donating_wanted')) === '(amp)r', await papi('donating_wanted'))
    await cmd(`lp user ${A} permission set donating.wanted true`)
    const wanted = await until(async () => /WANTED/.test(await papi('donating_wanted')), 4000)
    check('wanted: "WANTED · lose the cops"', wanted, await papi('donating_wanted'))
    await cmd(`lp user ${A} permission unset donating.wanted`)
    await until(async () => (await papi('donating_wanted')) === '(amp)r', 4000)

    await cmd(`zzregion ${REGION} 1010 199 1010 1020 205 1020`)
    await cmd(`dheist create ${ID} 2`)
    await cmd(`dheist set ${ID} name Board Bank`)
    await cmd(`dheist set ${ID} level 0`)
    await cmd(`dheist exit ${ID} 1005.5 ${Y} 1015.5`)
    await cmd(`dheist snapshot ${ID}`)
    const openBefore = Number(await papi('donating_heists_open'))
    await cmd(`dheist enable ${ID}`)
    await until(async () => /state=open/.test(await cmd(`zzheist ${ID}`)), 8000)
    const openAfter = await until(async () => Number(await papi('donating_heists_open')) === openBefore + 1, 3000)
    check('heists open: counts the new one', openAfter, `${openBefore} -> ${await papi('donating_heists_open')}`)
    await cmd(`zzheisttp ${A} 1015.5 ${Y} 1015.5`)
    const inside = await until(async () => /Medium/.test(await papi('donating_heist_diff')), 4000)
    check('inside a heist: its difficulty in its color, and the robbers inside', inside && (await papi('donating_heist_robbers')) === '1' && /\(amp\)e/.test(await papi('donating_heist_diff')), `${await papi('donating_heist_diff')} ${await papi('donating_heist_robbers')}`)

    // ---------- /bag ----------
    const run = Number(((await cmd(`zzheist ${ID}`)).match(/run=(\d+)/) || [])[1])
    await cmd(`zzbagadd ${A} ${ID}#${run} 1200`)
    await cmd(`zzbagadd ${A} oldheist#3 800`)
    let opened = windowOpen()
    bot.chat('/bag')
    let w = await opened
    await sleep(300)
    const lines = w ? [9, 10, 11].map(s => itemText(w.slots[s])) : []
    check('/bag lists each heist run in the bag with its value', w && /Your bag/.test(JSON.stringify(w.title)) && lines.some(l => /Board Bank/.test(l) && /1,200/.test(l)) && lines.some(l => /oldheist/.test(l) && /800/.test(l)), lines.join(' || ').slice(0, 500))
    check('...and marks the run you\'re robbing (lost at 0:00)', lines.some(l => /Board Bank/.test(l) && /get out before 0:00/.test(l)) && !lines.some(l => /oldheist/.test(l) && /0:00/.test(l)), lines.join(' || ').slice(0, 500))
    const before = JSON.stringify(bot.inventory.slots)
    bot.clickWindow(9, 0, 0).catch(() => {})
    await sleep(500)
    check('...looking only: a click takes nothing', JSON.stringify(bot.inventory.slots) === before && w && w.slots[9], '')
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
    await sleep(300)
    // The phone's Bag app (slot 25).
    bot.setQuickBarSlot(8)
    await sleep(400)
    opened = windowOpen()
    // F (swap hands) with the phone: the player-action packet a real client sends.
    bot._client.write('block_dig', { status: 6, location: new Vec3(0, 0, 0), face: 0, sequence: 0 })
    const phone = await opened
    await sleep(300)
    if (phone && /Phone/.test(JSON.stringify(phone.title))) {
      const bagOpen = windowOpen()
      bot.clickWindow(25, 0, 0).catch(() => {})
      const bw = await bagOpen
      check('the phone\'s Bag app opens /bag', bw && /Your bag/.test(JSON.stringify(bw.title)), bw ? JSON.stringify(bw.title) : 'no window')
    } else {
      check('the phone\'s Bag app opens /bag', false, `phone menu didn't open: ${phone ? JSON.stringify(phone.title) : 'none'}`)
    }
  } finally {
    if (bot && bot.currentWindow) bot.closeWindow(bot.currentWindow)
    await rcon.cmd(`dheist delete ${ID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world ${REGION}`).catch(() => {})
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd(`zzbagclear ${A}`).catch(() => {})
    await rcon.cmd(`zzcratereset ${A}`).catch(() => {})
    await rcon.cmd(`zzheisttp ${A} ${FAR}`).catch(() => {})
    if (bot) await quit(bot)
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
