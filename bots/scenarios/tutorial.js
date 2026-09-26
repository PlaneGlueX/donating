// tutorial.sk: a player who has never had a bag can't leave the spawn safe zone (a region whose id starts
// with "safe_spawn") until they buy one; walking and teleporting out are both stopped; buying the bag
// ends the tutorial with the next steps, and then they can leave. A player who already had a bag skips it.
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
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    await cmd(`rg remove -w world ${REGION}`)
    await cmd(`zzregion ${REGION} 1100 195 1100 1110 210 1110`)
    await cmd(`rg flag -w world ${REGION} passthrough allow`)
    await cmd(`dtutorial ${P} reset`)
    await cmd(`zzdata ${P} bag-best none`)
    await cmd(`zzdata ${P} bag-tier none`)
    let t = Date.now()
    bot = await join(P)
    await cmd(`zzclear ${P}`)
    await sleep(2500) // EssentialsX's newbie teleport on a first join
    await cmd(`zzheisttp ${P} 1105.5 ${Y} 1105.5`)
    await sleep(5500)
    check('a player with no bag gets the bag intro', /First things first: a bag/.test(text(t)) && /Bag Shop/.test(text(t)), text(t).slice(0, 300))

    // Walking out (+x) is stopped at the edge.
    t = Date.now()
    await bot.look(-Math.PI / 2, 0, true) // facing +x
    bot.setControlState('forward', true)
    await sleep(3500)
    bot.setControlState('forward', false)
    await sleep(500)
    const x = bot.entity.position.x
    check('walking out of spawn without a bag is stopped', x < 1111.5, `x=${x.toFixed(2)}`)
    // Teleporting out too.
    await cmd(`minecraft:tp ${P} 1118.5 ${Y} 1105.5`)
    await sleep(800)
    const x2 = bot.entity.position.x
    check('...and so is a teleport out', x2 < 1111.5, `x=${x2.toFixed(2)}`)
    check('...with the BUY YOUR BAG title', /BUY YOUR BAG/.test(text(t)), text(t).slice(0, 300))

    // Buying the bag ends it.
    t = Date.now()
    await cmd(`zzdata ${P} bag-best 1`)
    await sleep(1800)
    check('buying a bag ends the tutorial with the next steps', /You've got a bag/.test(text(t)) && /heists/.test(text(t)) && /done/.test(await cmd(`zzdata ${P} tutorial`)), `${text(t).slice(0, 300)} / ${await cmd(`zzdata ${P} tutorial`)}`)
    await cmd(`minecraft:tp ${P} 1118.5 ${Y} 1105.5`)
    await sleep(800)
    check('...and then you can leave spawn', bot.entity.position.x > 1115, `x=${bot.entity.position.x.toFixed(2)}`)
    t = Date.now()
    bot.chat('/tutorial')
    await sleep(800)
    check('/tutorial shows the steps again', /What's next/.test(text(t)), text(t))

    // A player who already has a bag skips it.
    await cmd(`zzdata ${P} tutorial none`)
    await quit(bot)
    await sleep(1000)
    bot = await join(P)
    await sleep(1500)
    check('a player who already had a bag skips it (done at join)', /done/.test(await cmd(`zzdata ${P} tutorial`)), await cmd(`zzdata ${P} tutorial`))
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
