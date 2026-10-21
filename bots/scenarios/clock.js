// clock.sk (owner, 2026-10-21: "add a 12 hour clock system for the server (1min = 1sec irl) make sure the day/night
// time cycle in game follows it"): game minutes G = floor((unix + offset) × rate), shown as a 12-hour clock; every
// world's sky follows it (the world's clock runs at the game clock's pace: time rate 0.833333; set again when it drifts).
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'ClockA'

// "3:45 PM" for a time of day in game minutes, like clock.sk's clockText.
const clockText = m => {
  m = ((Math.floor(m) % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h % 12 === 0 ? 12 : h % 12}:${String(mm).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
const wrap = d => ((d % 1440) + 2160) % 1440 - 720 // a gap in game minutes, -720..720

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot
  let off0 = null
  try {
    const field = (s, k) => (s.match(new RegExp(` ${k}=(\\S*)`)) || [])[1]
    const state = async () => cmd('zzclock')
    const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(250) } return Boolean(await fn()) }
    const info = await cmd('dclock info')
    off0 = Number((info.match(/offset=(-?[\d.]+)/) || [])[1])

    // ---------- The clock follows the real time ----------
    const unix = Math.floor(Date.now() / 1000)
    let s = await state()
    const min = Number(field(s, 'min'))
    const ofday = Number(field(s, 'ofday'))
    check('game minutes = unix + offset (a game minute a real second), the time of day G mod 1440', Math.abs(min - (unix + off0)) <= 2 && ofday === ((min % 1440) + 1440) % 1440, `${s} unix=${unix} off=${off0}`)
    check('...shown as a 12-hour clock ("3:45 PM")', (s.match(/text=(\S+ (?:AM|PM))/) || [])[1] === clockText(ofday), s)

    // ---------- /dclock set moves the clock and the sky follows ----------
    const set = await cmd('dclock set 7:30 pm')
    await sleep(2500) // the next pass sends the world's speed and time again
    s = await state()
    check('/dclock set 7:30 pm: the clock says 7:30-7:33 PM', /CLOCK now 7:3\d PM/.test(set) && Number(field(s, 'ofday')) >= 1170 && Number(field(s, 'ofday')) <= 1173, `${set} | ${s}`)
    check('...and the world\'s time follows it within the drift (3 game minutes)', Math.abs(wrap(Number(field(s, 'minute')) - Number(field(s, 'ofday')))) <= 3, s)
    const m1 = Number(field(s, 'minute'))
    await sleep(10000)
    s = await state()
    const m2 = Number(field(s, 'minute'))
    check('the sky runs at the clock\'s pace: 10 real seconds = 9-11 game minutes', wrap(m2 - m1) >= 9 && wrap(m2 - m1) <= 11 && Math.abs(wrap(m2 - Number(field(s, 'ofday')))) <= 3, `${m1} -> ${m2} | ${s}`)
    check('the sidebar\'s clock: the night icon and "7:4x PM" (7 PM is night)', /☾/.test(s) && /7:4\d/.test(s), s)

    // ---------- /clock ----------
    bot = await join(A)
    await sleep(1500)
    const t = Date.now()
    bot.chat('/clock')
    await sleep(1200)
    const said = messagesSince(bot, t).map(m => m.text).join(' | ')
    check('/clock: the time, the day and how long until dawn', /It's 7:\d\d PM on (Mon|Tue|Wed|Thu|Fri|Sat|Sun)/.test(said) && /Dawn in/.test(said), said)
  } finally {
    if (off0 !== null && !Number.isNaN(off0)) await rcon.cmd(`dclock offset ${off0}`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
