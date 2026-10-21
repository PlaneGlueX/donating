// bikes.sk (2026-10-21, town PLAN 15.3): written by a cloud session with no server, never run yet (the local session runs
// it first: handoff/2026-10-21/README.md). A bike spot (/dbike spotat) on a platform: a parked bike appears (an item
// display and an interaction box), right-clicking it opens "Hotwire the bike", 3 misses sound the alarm and lock that
// bike for the player for 15 s, 3 hits in a row steal it (the thief on a real MTVehicles bike, slowed to bike::stats,
// fuel between 40 and 100%), the spot empty until bike::respawn, getting off and leaving the bike scraps it after
// bike::abandon (both shortened here), and the spot gets a new bike. Until tools\make-car-wraps.js has made the
// Scrapper variants, /zzbikelook gives bikes.sk a stand-in look (the Viper's Black variant).
const { Vec3 } = require('vec3')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'BikeThief'
const Y = 200
const X0 = 7800, X1 = 7830, Z0 = 7820, Z1 = 7840
const CHUNKS = `${X0} ${Z0} ${X1} ${Z1}`
const SPOT = [7810.5, Y, 7830.5]

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null, spotN = '', plate = ''
  try {
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const state = async () => cmd(`zzbike ${A}`)
    const field = (s, k) => { const v = (s.match(new RegExp(`${k}=(\\S*)`)) || [])[1] || ''; return v === '<none>' ? '' : v }
    const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(250) } return Boolean(await fn()) }
    const near = (kind, pos, d = 0.8) => Object.values(bot.entities).filter(e => e.name === kind && e.position.distanceTo(pos) < d)
    const box = () => near('interaction', new Vec3(...SPOT))[0]
    const parked = () => near('item_display', new Vec3(SPOT[0], Y + 1.69, SPOT[2])).length === 1 && Boolean(box())
    const windowOpen = () => new Promise(resolve => { const timer = setTimeout(() => resolve(null), 4000); bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) }) })
    const clickBike = async () => { const b = box(); if (!b) return null; const o = windowOpen(); await bot.activateEntity(b).catch(() => {}); return o }
    const row = () => { const w = bot.currentWindow; if (!w) return []; return [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (w.slots[i] ? w.slots[i].name : '')) }
    const hitOnce = async () => {
      const end = Date.now() + 6000
      while (Date.now() < end && bot.currentWindow) {
        const i = row().indexOf('lime_concrete')
        if (i >= 0) { await bot.clickWindow(i, 0, 0); return true }
        await sleep(15)
      }
      return false
    }
    const missOnce = async () => {
      await until(async () => { const t = row(); const a = t.indexOf('lime_stained_glass_pane'); const b = t.indexOf('yellow_concrete'); return a >= 0 && b >= 0 && Math.abs(a - b) >= 3 }, 3000)
      await bot.clickWindow(22, 0, 0)
      await sleep(800)
    }

    // ---------- Setup ----------
    await cmd('zzcfgreload')
    const look = await cmd('zzbikelook set')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${X0} ${Y - 1} ${Z0} ${X1} ${Y + 4} ${Z1} air`)
    await cmd(`fill ${X0} ${Y - 1} ${Z0} ${X1} ${Y - 1} ${Z1} smooth_stone`)
    const added = await cmd(`dbike spotat world ${SPOT[0]} ${Y} ${SPOT[2]} 0`)
    spotN = (added.match(/BIKE spot (\d+)/) || [])[1] || ''
    check('/dbike spotat adds a spot (and a bike look exists)', spotN !== '' && /=/.test(look), `${added} | ${look}`)
    bot = await join(A)
    await cmd(`gamemode survival ${A}`)
    await cmd(`zzclear ${A}`)
    await cmd(`zzcombatend ${A}`)
    await cmd(`tag ${A} add donating_carcam_off`)
    await cmd(`zzheisttp ${A} ${SPOT[0] + 2} ${Y} ${SPOT[2]}`)
    await until(async () => parked(), 6000)
    check('a parked bike appears at the spot (an item display at the bay lift, an interaction box)', parked(), `displays=${near('item_display', new Vec3(SPOT[0], Y + 1.69, SPOT[2])).length} box=${Boolean(box())}`)

    // ---------- The alarm ----------
    let w = await clickBike()
    check('right-clicking it opens "Hotwire the bike"', w && /Hotwire the bike/.test(JSON.stringify(w.title)), JSON.stringify(w && w.title))
    let t = Date.now()
    await missOnce(); await missOnce(); await missOnce()
    await sleep(500)
    check('3 misses: the alarm goes off, the menu closes', !bot.currentWindow && /alarm went off/.test(text(t)), text(t))
    t = Date.now()
    await clickBike()
    await sleep(600)
    check('right after, that bike refuses ("The alarm\'s still going")', !bot.currentWindow && /alarm's still going/.test(text(t)), text(t))
    await sleep(15500)

    // ---------- Stealing it ----------
    await cmd('zzcfgtime bike::respawn 4 seconds')
    await cmd('zzcfgtime bike::abandon 4 seconds')
    w = await clickBike()
    await sleep(300)
    for (let i = 0; i < 3 && bot.currentWindow; i++) { await hitOnce(); await sleep(450) }
    await sleep(1200)
    const s = await state()
    plate = field(s, 'of')
    const seat = await cmd(`zzcarseat ${A}`)
    check('3 hits in a row: hotwired, the thief rides a real bike (MTVehicles) and the parked one is gone', plate !== '' && seat.includes(`driver:${plate}`) && !parked(), `${s} | ${seat}`)
    const stat = await cmd(`dphone carstat ${plate}`)
    check('the bike is slowed to bike::stats (top speed 0.62)', /max=0\.62/.test(stat), stat)
    const fuel = await cmd(`dfuel car ${plate}`)
    const lv = Number(field(fuel, 'level'))
    check('its tank is part full (40-100%) with the bike\'s usage (100 / (8 x 1200))', lv >= 40 && lv <= 100 && Math.abs(Number(field(fuel, 'usage')) - 0.01042) < 0.0001, fuel)

    // ---------- Leaving it ----------
    bot.setControlState('sneak', true)
    await sleep(600)
    bot.setControlState('sneak', false)
    await cmd(`zzheisttp ${A} ${SPOT[0] + 6} ${Y} ${SPOT[2]}`)
    t = Date.now()
    await until(async () => field(await state(), 'of') === '', 9000)
    const info = await cmd(`zzcarinfo ${plate}`)
    check('left with no rider for bike::abandon: the bike is scrapped (MTVehicles forgets it)', field(await state(), 'of') === '' && /none|exists=no/.test(info), `${await state()} | ${info}`)
    await until(async () => parked(), 8000)
    check('after bike::respawn the spot has a new bike', parked(), `parked=${parked()}`)
  } finally {
    await cmd(`minecraft:ride ${A} dismount`).catch(() => {})
    if (spotN) await cmd(`dbike remove ${spotN}`).catch(() => {})
    if (plate) await cmd(`zzcardelete ${plate}`).catch(() => {})
    await cmd('zzcfgreload').catch(() => {})
    await cmd('zzbikelook clear').catch(() => {})
    await cmd(`tag ${A} remove donating_carcam_off`).catch(() => {})
    await cmd(`zzheisttp ${A} 0.5 68 -656.5`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    await cmd(`fill ${X0} ${Y - 1} ${Z0} ${X1} ${Y + 4} ${Z1} air`).catch(() => {})
    await cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
