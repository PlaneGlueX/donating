// ATMs (atm.sk, 2026-10-29; tools/build/expand/PLAN.md section 4): an ATM's click box and screen appear, a 6 s hold
// cracks it into the bag as its own line, it's out of order after, a pause starts the hold over, and the refusals
// (level, a safe zone, a full bag, the phone).
const fs = require('fs')
const path = require('path')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const P = 'AtmBot'
const X = 2000
const Y = 150
const Z = 2000
const LOG = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs', 'atm.log')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  let id = ''
  const platform = `${X - 4} ${Y - 1} ${Z - 4} ${X + 4} ${Y - 1} ${Z + 4}`
  const logLen = fs.existsSync(LOG) ? fs.statSync(LOG).size : 0
  const logged = () => fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').slice(logLen) : ''
  try {
    await cmd(`forceload add ${X - 4} ${Z - 4} ${X + 4} ${Z + 4}`)
    await sleep(1500)
    await cmd(`fill ${platform} stone`)
    await cmd(`fill ${X} ${Y} ${Z + 2} ${X} ${Y + 1} ${Z + 2} iron_block`)
    id = ((await cmd(`datm add ${X} ${Y} ${Z + 2}`)).match(/ATM (\d+) at/) || [])[1] || ''
    check('/datm add makes an ATM', id !== '', id)

    bot = await join(P)
    await cmd(`zzclear ${P}`)
    await cmd(`gamemode survival ${P}`)
    await cmd(`zzpassive ${P} off`)
    await cmd(`zztestkit ${P}`)
    await cmd(`dlevel set ${P} 5`)
    await cmd(`minecraft:tp ${P} ${X + 0.5} ${Y} ${Z + 0.5} 0 0`)
    bot.setQuickBarSlot(0)
    await sleep(4000)
    const box = () => Object.values(bot.entities).find(e => e.name === 'interaction' && Math.hypot(e.position.x - (X + 0.5), e.position.z - (Z + 2.5)) < 0.6)
    const screen = () => Object.values(bot.entities).find(e => e.name === 'text_display' && Math.hypot(e.position.x - (X + 0.5), e.position.z - (Z + 2.5)) < 0.6)
    check('the ATM has its click box and screen', Boolean(box()) && Boolean(screen()))
    const hold = async (ms, every = 200) => { const end = Date.now() + ms; while (Date.now() < end) { const e = box(); if (e) bot.activateEntity(e).catch(() => {}); await sleep(every) } }
    const bag = async () => cmd(`zzbag ${P}`)

    // A pause over a second starts the hold over: 4 s, a 1.5 s pause, 4 s again pays nothing.
    await hold(4000)
    await sleep(1500)
    await hold(4000)
    check('a hold with a pause in it pays nothing', !/crack AtmBot/.test(logged()), await bag())
    await sleep(1500)

    // Level: below atm::level (1) nothing happens.
    await cmd(`dlevel set ${P} 0`)
    await hold(7000)
    check('below the ATM level nothing pays', !/crack AtmBot/.test(logged()))
    await cmd(`dlevel set ${P} 5`)
    await sleep(1500)

    // The crack.
    await hold(7000)
    const line = (logged().match(/crack AtmBot \S+ atm=\d+ rolled=(\d+) got=(\d+)/) || [])
    const b = await bag()
    check('a 6 s hold cracks it: $300-700 into the bag as an atm# line', line[2] && +line[2] >= 300 && +line[2] <= 700 && /atm#\d+=/.test(b), `${line[0]} ${b}`)
    check('...and it is out of order after', /left=[1-9]\d*/.test(await cmd('datm list')), await cmd('datm list'))
    await sleep(2500)
    const s = screen()
    check('the screen says OUT OF ORDER', s && /OUT OF ORDER/.test(JSON.stringify(s.metadata)), s && JSON.stringify(s.metadata).slice(0, 200))
    await hold(7000)
    check('an ATM out of order pays nothing', (logged().match(/crack AtmBot/g) || []).length === 1)

    // A safe zone.
    await cmd(`datm ready ${id}`)
    await cmd(`zzregion safe_base_atmtest ${X - 4} ${Y - 2} ${Z - 4} ${X + 4} ${Y + 4} ${Z + 4}`)
    await sleep(500)
    await hold(7000)
    check('not in a safe zone', (logged().match(/crack AtmBot/g) || []).length === 1)
    await cmd('rg remove -w world safe_base_atmtest')

    // A full bag.
    await cmd(`zzbagadd ${P} test#1 100000`)
    await hold(7000)
    check('a full bag takes nothing', (logged().match(/crack AtmBot/g) || []).length === 1, await bag())
  } finally {
    await rcon.cmd('rg remove -w world safe_base_atmtest').catch(() => {})
    if (id) await rcon.cmd(`datm remove ${id}`).catch(() => {})
    await rcon.cmd(`zzbagclear ${P}`).catch(() => {})
    await rcon.cmd(`fill ${X - 4} ${Y - 1} ${Z - 4} ${X + 4} ${Y + 2} ${Z + 4} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${X - 4} ${Z - 4} ${X + 4} ${Z + 4}`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
