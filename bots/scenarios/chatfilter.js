// chat-extras.sk's chat filter (2026-11-10): blocked words never reach anyone (also spaced out or with symbols), the sender is
// told, ordinary words that contain a short blocked word still go through, and /msg is filtered too (players can't /msg by default: Essentials denies it; staff can).
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')
const A = 'FilterA'
const B = 'FilterB'

module.exports = async ({ check }) => {
  let a, b
  try {
    a = await join(A)
    b = await join(B)
    const rcon = await rconLib.connect()
    for (const n of [A, B]) await rcon.cmd('zzjail ' + n + ' state out') // the course hides other players' chat
    await rcon.cmd('execute in minecraft:overworld run minecraft:tp ' + A + ' 0.5 120 0.5')
    await rcon.cmd('execute in minecraft:overworld run minecraft:tp ' + B + ' 2.5 120 0.5')
    await sleep(3000)
    const heard = (bot, since, re) => messagesSince(bot, since).some(m => re.test(m.text))
    const say = async (text, gap = 2600) => { const t = Date.now(); a.chat(text); await sleep(gap); return t }
    let t = await say('hello there class, nice grass and a good assistant')
    check('ordinary words pass (class, grass, assistant)', heard(b, t, /nice grass/), messagesSince(b, t).map(m => m.text).join(' | '))
    t = await say('what the fuck')
    check('ordinary swearing passes (owner: keep it light)', heard(b, t, /what the fuck/), messagesSince(b, t).map(m => m.text).join(' | '))
    t = await say('what the fuck')
    check('the same line again within 30 s is refused', !messagesSince(b, t).some(m => m.text.includes('what the fuck')) && heard(a, t, /You just said that/), messagesSince(a, t).map(m => m.text).join(' | '))
    for (const bad of ['you r3tard', 'go k i l l yourself', 'kys']) {
      t = await say(bad)
      check(`blocked: "${bad}" never reaches the other player, the sender is told`, !messagesSince(b, t).some(m => m.text.includes(bad)) && heard(a, t, /isn't allowed here/), messagesSince(b, t).map(m => m.text).join(' | ') + ' // ' + messagesSince(a, t).map(m => m.text).join(' | '))
    }
    t = Date.now()
    a.chat(`/msg ${B} kys`)
    await sleep(2000)
    check('a private message with a blocked word is stopped', !messagesSince(b, t).some(m => m.text.includes('kys')) && heard(a, t, /isn't allowed here/), messagesSince(a, t).map(m => m.text).join(' | '))
  } finally {
    for (const x of [a, b]) if (x) await quit(x).catch(() => {})
  }
}
