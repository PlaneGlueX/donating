// clock.sk (owner, 2026-10-21; rebuilt the same day on Minecraft's own day/night cycle: "the clock time is making the server
// lag"): the clock reads the play world's time of day (vanilla speed, 1.2 game minutes a real second) and counts the
// days itself when the time of day wraps; it never sets the sky by itself.
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
  let day0 = null
  try {
    const field = (s, k) => (s.match(new RegExp(` ${k}=(\\S*)`)) || [])[1]
    const state = async () => cmd('zzclock')
    day0 = Number((await cmd('zzweek')).match(/ day=(\d+)/)[1])

    // ---------- The clock is the play world's time ----------
    let s = await state()
    const ofday = Number(field(s, 'ofday'))
    check('the clock is the play world\'s time of day, and game minutes = day × 1440 + it', Math.abs(wrap(Number(field(s, 'minute')) - ofday)) <= 2 && Number(field(s, 'min')) === day0 * 1440 + ofday, s)
    check('...shown as a 12-hour clock ("3:45 PM")', (s.match(/text=(\S+ (?:AM|PM))/) || [])[1] === clockText(ofday), s)

    // ---------- /dclock set sets the world's time; the sky runs at vanilla speed ----------
    const set = await cmd('dclock set 7:30 pm')
    await sleep(1200)
    s = await state()
    check('/dclock set 7:30 pm: the world and the clock say 7:30-7:33 PM', /CLOCK now 7:3\d PM/.test(set) && Number(field(s, 'ofday')) >= 1170 && Number(field(s, 'ofday')) <= 1173, `${set} | ${s}`)
    const m1 = Number(field(s, 'ofday'))
    await sleep(10000)
    s = await state()
    const m2 = Number(field(s, 'ofday'))
    check('the sky runs at vanilla speed: 10 real seconds = 11-13 game minutes', wrap(m2 - m1) >= 11 && wrap(m2 - m1) <= 13, `${m1} -> ${m2} | ${s}`)
    check('the sidebar\'s clock: the night icon and "7:4x PM" (7 PM is night)', /☾/.test(s) && /7:4\d/.test(s), s)

    // ---------- Midnight is a new day ----------
    const dBefore = Number((await cmd('zzweek')).match(/ day=(\d+)/)[1]) // an earlier time set above is a new day too
    await cmd('dclock set 11:58 pm')
    await sleep(4000)
    s = await state()
    const d1 = Number((await cmd('zzweek')).match(/ day=(\d+)/)[1])
    check('past midnight the day count goes up by one', d1 === dBefore + 1 && Number(field(s, 'ofday')) < 60 && Number(field(s, 'min')) === d1 * 1440 + Number(field(s, 'ofday')), `day ${dBefore} -> ${d1} | ${s}`)
    await cmd(`dclock day ${day0}`)
    await cmd('dclock set 7:30 pm')

    // ---------- /clock ----------
    bot = await join(A)
    await sleep(3000)
    const t = Date.now()
    bot.chat('/clock')
    await sleep(1200)
    const said = messagesSince(bot, t).map(m => m.text).join(' | ')
    check('/clock: the time, the day and how long until dawn', /It's 7:\d\d PM on (Mon|Tue|Wed|Thu|Fri|Sat|Sun)/.test(said) && /Dawn in/.test(said), said)
  } finally {
    if (day0 !== null && !Number.isNaN(day0)) await rcon.cmd(`dclock day ${day0}`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
