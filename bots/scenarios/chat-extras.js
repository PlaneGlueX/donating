// chat-extras.sk: chat cooldown, @mentions (lime + ping sound), staff chat, /broadcast, tips.
// LPC formats chat as "{prefix}{name}: {message}"; these bots have no prefix.
const { join, sleep, messagesSince, colorOf, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'ChatA'
const B = 'ChatB'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  let a = null
  let b = null
  const since = (bot, t) => messagesSince(bot, t)
  const texts = (bot, t) => since(bot, t).map(m => m.text)
  // Every sound a bot hears lands in bot.sounds.
  const listenSounds = bot => {
    bot.sounds = []
    bot.on('soundEffectHeard', name => bot.sounds.push({ t: Date.now(), name: String(name) }))
    bot.on('hardcodedSoundEffectHeard', id => bot.sounds.push({ t: Date.now(), name: `id:${id}` }))
  }
  const heard = (bot, t) => bot.sounds.filter(s => s.t >= t).map(s => s.name)

  try {
    await rcon.cmd(`lp user ${A} permission unset donating.staff`)
    await rcon.cmd(`lp user ${B} permission unset donating.staff`)
    const cdOut = await rcon.cmd('zzcfg chat::cooldown')
    const cdSeconds = Number((cdOut.match(/= ([\d.]+) seconds?/) || [])[1])
    check('cooldown setting readable', !Number.isNaN(cdSeconds), cdOut.trim())
    const waitCooldown = () => sleep((cdSeconds || 2) * 1000 + 500)

    a = await join(A)
    b = await join(B)
    listenSounds(a)
    listenSounds(b)
    await sleep(1500)

    // ---------- Cooldown ----------
    let t = Date.now()
    a.chat('first msg')
    await sleep(300)
    a.chat('second msg')
    await sleep(1200)
    check('first message goes through', texts(b, t).includes(`${A}: first msg`), texts(b, t).join(' | '))
    check('a message inside the cooldown is blocked', !texts(b, t).some(x => /second msg/.test(x)), texts(b, t).join(' | '))
    check('the sender is told to slow down', texts(a, t).some(x => /Slow down!/.test(x)), texts(a, t).join(' | '))
    await waitCooldown()
    t = Date.now()
    a.chat('third msg')
    await sleep(1000)
    check('chat works again after the cooldown', texts(b, t).includes(`${A}: third msg`), texts(b, t).join(' | '))

    // ---------- Mentions ----------
    await waitCooldown()
    t = Date.now()
    a.chat('hey @chatb, look')
    await sleep(1500)
    const mention = since(b, t).find(m => /hey @ChatB, look/.test(m.text))
    check('mention shows the real name', Boolean(mention), texts(b, t).join(' | '))
    const json = mention ? JSON.stringify(mention.json) : 'no line'
    check('mention is lime', mention && colorOf(mention.json, '@ChatB') === 'green', json)
    check('text after the mention is not lime', mention && colorOf(mention.json, ', look') !== 'green', json)
    check('the mentioned player hears a ping', heard(b, t).length > 0, JSON.stringify(heard(b, t)))
    check('the sender hears no ping', heard(a, t).length === 0, JSON.stringify(heard(a, t)))

    await waitCooldown()
    t = Date.now()
    a.chat('@ChatBx is not a player')
    await sleep(1500)
    const notMention = since(b, t).find(m => /is not a player/.test(m.text))
    check('"@ChatBx" does not mention ChatB', notMention && colorOf(notMention.json, '@ChatBx') !== 'green' && heard(b, t).length === 0, notMention ? `${JSON.stringify(notMention.json)} | sounds ${JSON.stringify(heard(b, t))}` : 'no line')

    await waitCooldown()
    t = Date.now()
    a.chat('&cred <bold>big</bold> @ChatB')
    await sleep(1500)
    const tricky = since(b, t).find(m => /big/.test(m.text))
    check('players still cannot color their text (with a mention)', tricky && /red <bold>big<\/bold> @ChatB/.test(tricky.text) && colorOf(tricky.json, 'red') !== 'red' && !/§l/.test(tricky.motd), tricky ? `${tricky.text} | ${JSON.stringify(tricky.json)}` : 'no line')

    // ---------- Staff chat ----------
    t = Date.now()
    b.chat('/sc hello')
    await sleep(1000)
    check('non-staff cannot use /sc', texts(b, t).some(x => /can't use staff chat/.test(x)), texts(b, t).join(' | '))

    await rcon.cmd(`lp user ${A} permission set donating.staff true`)
    await sleep(2000)
    t = Date.now()
    a.chat('/sc secret plan')
    await sleep(1000)
    check('staff see /sc messages', texts(a, t).includes(`[Staff] ${A}: secret plan`), texts(a, t).join(' | '))
    check('players do not see /sc messages', !texts(b, t).some(x => /secret plan/.test(x)), texts(b, t).join(' | '))

    t = Date.now()
    a.chat('/sc')
    await sleep(500)
    a.chat('hidden words')
    await sleep(1000)
    check('staff chat mode sends chat to staff only', texts(a, t).includes(`[Staff] ${A}: hidden words`) && !texts(b, t).some(x => /hidden words/.test(x)), `A: ${texts(a, t).join(' | ')} || B: ${texts(b, t).join(' | ')}`)
    a.chat('/sc')
    await sleep(500)
    t = Date.now()
    a.chat('fast one')
    await sleep(200)
    a.chat('fast two')
    await sleep(1200)
    check('staff mode off again, and staff skip the cooldown', texts(b, t).includes(`${A}: fast one`) && texts(b, t).includes(`${A}: fast two`), texts(b, t).join(' | '))

    // ---------- /broadcast ----------
    t = Date.now()
    b.chat('/broadcast nope')
    await sleep(1000)
    check('non-staff cannot broadcast', texts(b, t).some(x => /can't broadcast/.test(x)) && !texts(a, t).some(x => /nope/.test(x)), texts(b, t).join(' | '))
    t = Date.now()
    a.chat('/bc Heist opens soon')
    await sleep(1000)
    check('staff /bc reaches everyone with the prefix', texts(b, t).includes('DONATING » Heist opens soon'), texts(b, t).join(' | '))

    // ---------- Tips ----------
    t = Date.now()
    await rcon.cmd('zztip')
    await sleep(1000)
    check('a tip reaches players', texts(b, t).some(x => /^TIP » \S/.test(x)), texts(b, t).join(' | '))
  } finally {
    await rcon.cmd(`lp user ${A} permission unset donating.staff`).catch(() => {})
    await quit(a)
    await quit(b)
    rcon.close()
  }
}
