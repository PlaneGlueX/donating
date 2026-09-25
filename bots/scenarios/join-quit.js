// join-quit.sk: join/quit messages with the rank prefix, the first join (start money, welcome), /help.
// Also checks core.sk's msg(): & codes become colors and the prefix's bold doesn't leak.
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const WATCHER = 'JqWatcher'
const NEWBIE = 'JqNewbie'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  let watcher = null
  let newbie = null
  const lines = (bot, since) => messagesSince(bot, since).map(m => m.text)
  const balance = async () => {
    const out = (await rcon.cmd(`zzbal ${NEWBIE}`)).trim()
    const m = out.match(/BAL \S+: (-?\d+)/)
    return m ? Number(m[1]) : out
  }
  // Codes right before `word` in a message's § formatting, e.g. "§7" (or "§7§l" if bold leaked).
  const codesBefore = (entry, word) => {
    const m = entry && entry.motd.match(new RegExp(`((?:§.)*)${word}`))
    return m ? m[1] : null
  }

  try {
    await rcon.cmd(`lp user ${NEWBIE} meta removeprefix 100`)
    const forget = await rcon.cmd(`zzforget ${NEWBIE}`)
    const cfgOut = await rcon.cmd('zzcfg money::start')
    const start = Number((cfgOut.match(/= (-?[\d.]+)/) || [])[1])
    check('test helpers ready', /FORGET/.test(forget) && !Number.isNaN(start), `${forget.trim()} | ${cfgOut.trim()}`)

    watcher = await join(WATCHER)
    await sleep(1000)

    // ---------- First join ----------
    let since = Date.now()
    newbie = await join(NEWBIE)
    await sleep(3000) // the welcome waits 1 second after joining
    let seen = lines(watcher, since)
    const firstJoin = seen.find(t => t.includes(NEWBIE))
    check('watcher sees the first-join message', /^\[\+\] JqNewbie joined for the first time \(#\d+\)$/.test(firstJoin || ''), seen.join(' | '))
    check('no vanilla "joined the game" message', !seen.some(t => /joined the game/i.test(t)), seen.join(' | '))

    const own = messagesSince(newbie, since)
    const titles = own.filter(m => m.kind.startsWith('title')).map(m => m.text)
    check('newbie gets the welcome title', titles.some(t => /DONATING/.test(t)), JSON.stringify(titles))
    const welcome = own.find(m => /Welcome to Donating!/.test(m.text))
    check('newbie gets the welcome message with the prefix', welcome && /^DONATING » Welcome to Donating!/.test(welcome.text), own.map(m => m.text).join(' | '))
    check('newbie is pointed to /help', own.some(m => /Type \/help to learn how heists work\./.test(m.text)), own.map(m => m.text).join(' | '))
    const bold = codesBefore(welcome, 'Welcome')
    check("the prefix's bold doesn't leak into the message", bold !== null && !bold.includes('§l'), welcome ? welcome.motd : 'no welcome message')
    check('newbie got the start money once', await balance() === start, `balance ${await balance()}, expected ${start}`)

    // ---------- Quit ----------
    since = Date.now()
    await quit(newbie)
    newbie = null
    await sleep(1500)
    seen = lines(watcher, since)
    check('watcher sees the quit message', seen.includes(`[-] ${NEWBIE}`), seen.join(' | '))
    check('no vanilla "left the game" message', !seen.some(t => /left the game/i.test(t)), seen.join(' | '))

    // ---------- Rejoin with a rank prefix ----------
    // LuckPerms runs commands async: give it time before the rejoin.
    await rcon.cmd(`lp user ${NEWBIE} meta setprefix 100 &b[Test]`)
    await sleep(2000)
    since = Date.now()
    newbie = await join(NEWBIE)
    await sleep(2500)
    seen = lines(watcher, since)
    const rejoin = seen.find(t => t.includes(NEWBIE))
    check('rejoin shows the rank prefix, not "first time"', rejoin === `[+] [Test] ${NEWBIE}`, seen.join(' | '))
    check('no welcome or start money on a rejoin', !lines(newbie, since).some(t => /Welcome to Donating/.test(t)) && await balance() === start, `balance ${await balance()}`)

    // ---------- /help ----------
    since = Date.now()
    newbie.chat('/help')
    await sleep(1500)
    const help = lines(newbie, since)
    check('/help shows the how-to-play page', /^DONATING » How to play$/.test(help[0] || '') && help.some(t => /^• Heists: /.test(t)) && help.length >= 8, help.join(' | '))
    since = Date.now()
    newbie.chat('/help 2')
    await sleep(1000)
    check('/help with extra words still shows the page', lines(newbie, since).some(t => /How to play/.test(t)), lines(newbie, since).join(' | '))

    // No raw color codes or MiniMessage tags anywhere: everything was turned into formatting.
    const all = [...watcher.log, ...newbie.log].map(m => m.text)
    const raw = all.filter(t => /&[0-9a-fk-or]|<\/?[a-z_]+>/i.test(t))
    check('no raw &-codes or <tags> in any message', raw.length === 0, raw.join(' | '))
  } finally {
    await rcon.cmd(`lp user ${NEWBIE} meta removeprefix 100`).catch(() => {})
    await quit(newbie)
    await quit(watcher)
    rcon.close()
  }
}
