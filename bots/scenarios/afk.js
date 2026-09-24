// afk.sk: AFK after no activity, /afk toggles, and looking around, movement keys, chat and commands
// end AFK. Idle position packets (and being pushed) must not.
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const NAME = 'AfkBot'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  let bot = null
  const state = async () => /AFK \S+: true/.test(await rcon.cmd(`zzafkstate ${NAME}`))
  const texts = t => messagesSince(bot, t).map(m => m.text)
  // Runs /afk and checks the bot is AFK afterwards.
  const goAfk = async () => {
    bot.chat('/afk')
    await sleep(800)
    return state()
  }

  try {
    bot = await join(NAME)
    await sleep(1500)
    check('not AFK after joining', await state() === false, await rcon.cmd(`zzafkstate ${NAME}`))

    // ---------- Timeout ----------
    let t = Date.now()
    await rcon.cmd(`zzafk ${NAME}`)
    let afk = false
    for (let i = 0; i < 26 && !afk; i++) { // the check runs every 10 seconds
      await sleep(500)
      afk = await state()
    }
    check('AFK after the timeout', afk, texts(t).join(' | '))
    check('told about going AFK', texts(t).some(x => /You're now AFK/.test(x)), texts(t).join(' | '))

    t = Date.now()
    await sleep(3000)
    check('idle packets do not end AFK', await state() === true, texts(t).join(' | '))

    // ---------- What ends AFK ----------
    t = Date.now()
    await bot.look(bot.entity.yaw + 0.6, bot.entity.pitch, true)
    await sleep(800)
    check('looking around ends AFK', await state() === false && texts(t).some(x => /Welcome back!/.test(x)), texts(t).join(' | '))

    check('/afk turns AFK on', await goAfk() === true)
    bot.chat('/afk')
    await sleep(800)
    check('/afk again turns it off', await state() === false)

    await goAfk()
    bot.chat('back now')
    await sleep(800)
    check('chatting ends AFK', await state() === false)

    await goAfk()
    bot.chat('/help')
    await sleep(800)
    check('a command ends AFK', await state() === false)

    const wasAfk = await goAfk()
    bot.setControlState('forward', true)
    await sleep(400)
    bot.setControlState('forward', false)
    await sleep(800)
    check('pressing a movement key ends AFK', wasAfk && await state() === false)
  } finally {
    await quit(bot)
    rcon.close()
  }
}
