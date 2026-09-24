// Smoke test: a bot joins, sees the world, runs a harmless command, and leaves.
const { join, sleep, messagesSince, inventorySnapshot, quit } = require('../lib')

module.exports = async ({ check, args }) => {
  const bot = await join(args[0] || 'TestBot1')
  try {
    check('bot spawned', bot.entity && bot.entity.position, `pos ${bot.entity.position}`)
    check('game mode reported', bot.game && bot.game.gameMode, `mode ${bot.game.gameMode}`)

    const before = Date.now()
    bot.chat('/list')
    await sleep(1500)
    const replies = messagesSince(bot, before).map(m => m.text)
    check('server replies to /list', replies.length > 0, replies.join(' | '))

    check('inventory readable', typeof inventorySnapshot(bot) === 'object', JSON.stringify(inventorySnapshot(bot)))
  } finally {
    await quit(bot)
  }
}
