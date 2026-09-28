// tutorial.sk, reworked 2026-09-27 (owner: the bag costs money and is earned; "do your realistic tutorial job"): a
// first join starts with money::start ($1,000) and nothing else, a welcome title and the first steps (Mara on the
// GPS), and Mara's chapter 1 starts at once; there's no spawn lock any more; no Gym Bag is free (with $0 it's refused,
// with enough money it's bought) and the first bag ends the tutorial ("done"). /tutorial shows the steps again.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const P = 'TutBot'
const Y = 200
const REGION = 'safe_spawn_zt'
const CHUNKS = '1095 1095 1125 1115'
const PLATFORM = `1095 ${Y - 1} 1095 1125 ${Y - 1} 1115`
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot
  try {
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const bal = async () => Number(((await cmd(`zzbal ${P}`)).match(/: (-?\d+)/) || [])[1])
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    await cmd(`rg remove -w world ${REGION}`)
    await cmd(`zzregion ${REGION} 1100 195 1100 1110 210 1110`)
    await cmd(`rg flag -w world ${REGION} passthrough allow`)
    // A first join: no data at all (the start money, the welcome, Mara's chapter 1).
    for (const k of ['tutorial', 'bag-best', 'bag-tier', 'first-join', 'story', 'story-prog']) await cmd(`zzdata ${P} ${k} none`)
    await cmd(`eco set ${P} 0`)
    let t = Date.now()
    bot = await join(P)
    await sleep(2500) // EssentialsX's newbie teleport on a first join
    await cmd(`zzheisttp ${P} 1105.5 ${Y} 1105.5`)
    check('a first join starts with $1,000 and nothing else', (await bal()) === 1000, `${await bal()}`)
    await sleep(4000)
    check('...a welcome title and the first steps: meet Mara (the GPS), the first car job, the hands, guns at level 5', messagesSince(bot, t).some(m => m.kind === 'title:title' && /WELCOME TO THE CITY/.test(m.text)) && /Meet Mara/.test(text(t)) && /first job/.test(text(t)) && /hands carry \$1,000/.test(text(t)) && /Guns need level 5/.test(text(t)) && /= welcomed$/m.test(await cmd(`zzdata ${P} tutorial`)), text(t).slice(0, 500))
    const story = await cmd(`dstory info ${P}`)
    check('Mara\'s chapter 1 starts at once (no waiting for a bag)', /c1_meet/.test(story), story)

    // No spawn lock: walking out works.
    await bot.look(-Math.PI / 2, 0, true) // facing +x
    bot.setControlState('forward', true)
    await sleep(3500)
    bot.setControlState('forward', false)
    await sleep(500)
    check('no spawn lock: walking out of spawn without a bag works', bot.entity.position.x > 1111.5, `x=${bot.entity.position.x.toFixed(2)}`)

    // No free Gym Bag: $0 is refused, enough money buys it.
    const shop = async () => {
      if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); await sleep(300) }
      const w = new Promise(resolve => { const timer = setTimeout(() => resolve(null), 3000); bot.once('windowOpen', win => { clearTimeout(timer); resolve(win) }) })
      await cmd(`dshop open ${P} bag`)
      await w
      await sleep(400)
    }
    await cmd(`eco set ${P} 0`)
    await shop()
    bot.clickWindow(11, 0, 0).catch(() => {}) // the Gym Bag (tier 1)
    await sleep(1200)
    check('no free bag: with $0 the Gym Bag is refused ("costs $2,400")', !/= 1(\.0)?$/m.test(await cmd(`zzdata ${P} bag-best`)) && /costs \$2,400/.test(await cmd(`zzshop ${P}`)), `${await cmd(`zzdata ${P} bag-best`)} ${await cmd(`zzshop ${P}`)}`)
    await cmd(`eco set ${P} 2500`)
    await shop()
    bot.clickWindow(11, 0, 0).catch(() => {})
    await sleep(900)
    if (/confirm=bag/.test(await cmd(`zzshop ${P}`))) { bot.clickWindow(11, 0, 0).catch(() => {}); await sleep(900) }
    if (bot.currentWindow) bot.closeWindow(bot.currentWindow)
    await sleep(1600)
    check('with $2,500 (the start money + the first car job) the Gym Bag is bought, and the tutorial is done', /= 1(\.0)?$/m.test(await cmd(`zzdata ${P} bag-best`)) && (await bal()) === 100 && /= done$/m.test(await cmd(`zzdata ${P} tutorial`)), `${await cmd(`zzdata ${P} bag-best`)} ${await bal()} ${await cmd(`zzdata ${P} tutorial`)} ${await cmd(`zzshop ${P}`)}`)
    t = Date.now()
    bot.chat('/tutorial')
    await sleep(800)
    check('/tutorial shows the first steps again', /Meet Mara/.test(text(t)), text(t))
  } finally {
    bot && bot.setControlState && bot.setControlState('forward', false)
    await rcon.cmd(`rg remove -w world ${REGION}`).catch(() => {})
    await rcon.cmd(`dtutorial ${P} done`).catch(() => {})
    await rcon.cmd(`zzheisttp ${P} ${FAR}`).catch(() => {})
    if (bot) await quit(bot)
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
