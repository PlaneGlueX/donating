// fuel.sk (2026-10-21, town PLAN 15.2): written by a cloud session with no server, never run yet (the local session runs
// it first: handoff/2026-10-21/README.md). A pump registered with /dfuel pumpat (a 3-high box), a bot's Sedan parked
// next to it with 20% fuel (10 of 50 L): the pump gives the nozzle in hotbar 9, the nozzle on the car fills it at
// 4 L a second, paid as it flows ($25 a liter), up to full (40 L = $1,000), the meter over the pump, the receipt and the
// phone back on hanging up, the nozzle going back by itself (walking off), the money running out, the refusals (combat),
// driving: the model's usage and the switch on, the level going down with the pedal, and the garage's Refuel button.
// 2026-10-21: burns 2-4x slower (the Sedan 48 minutes a tank, was 12) and the Fuel Tank upgrade on the Tune page
// (stage I: tank x 1.2, 10% less fuel a minute: 60 L, 64 minutes, the liters kept). Untested (cloud).
const { Vec3 } = require('vec3')
const fs = require('fs')
const path = require('path')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'Fueler'
const Y = 200
const X0 = 7800, X1 = 7830, Z0 = 7800, Z1 = 7815
const CHUNKS = `${X0} ${Z0} ${X1} ${Z1}`
const PUMP = [7810, Y, 7808] // the box 7810 200 7808 .. 7810 202 7808
const CAR = [7813.5, Y, 7808.5]
const LOG = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs', 'fuel.log')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null, plate = null, pumpN = ''
  const logText = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8') : '')
  const logMark = logText().length
  try {
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const bal = async () => Number(((await cmd(`zzbal ${A}`)).match(/: (-?\d+)/) || [])[1])
    const state = async () => cmd(`zzfuel ${A}`)
    const field = (s, k) => { const v = (s.match(new RegExp(`${k}=(\\S*)`)) || [])[1] || ''; return v === '<none>' ? '' : v }
    const fuelOf = async () => cmd(`dfuel car ${plate}`)
    const level = async () => Number(field(await fuelOf(), 'level'))
    const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(250) } return Boolean(await fn()) }
    const standNear = (pos, maxD = 0.9) => {
      let best = null
      for (const e of Object.values(bot.entities)) {
        if (e.name !== 'armor_stand') continue
        const d = e.position.distanceTo(pos)
        if (d <= maxD && (!best || d < best.d)) best = { e, d }
      }
      return best && best.e
    }
    const standPos = async kind => {
      const m = (await cmd(`data get entity @e[type=armor_stand,name="MTVEHICLES_${kind}_${plate}",limit=1] Pos`)).match(/\[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/)
      return m ? new Vec3(+m[1], +m[2], +m[3]) : null
    }
    const clickCar = async () => {
      const pos = await standPos('MAINSEAT') || await standPos('MAIN')
      const e = pos && standNear(pos)
      if (!e) return false
      try { await bot.lookAt(pos.offset(0, 1, 0), true) } catch (err) {}
      try { await bot.activateEntityAt(e, pos.offset(0, 1, 0)) } catch (err) {}
      await sleep(700)
      return true
    }
    const clickPump = async () => {
      const b = bot.blockAt(new Vec3(PUMP[0], PUMP[1] + 1, PUMP[2]))
      try { await bot.lookAt(new Vec3(PUMP[0] + 0.5, PUMP[1] + 1.5, PUMP[2] + 0.5), true) } catch (err) {}
      try { await bot.activateBlock(b) } catch (err) {}
      await sleep(700)
    }
    const tp = async (x, z) => { await cmd(`zzheisttp ${A} ${x} ${Y} ${z}`); await sleep(600) }

    // ---------- Setup ----------
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${X0} ${Y - 1} ${Z0} ${X1} ${Y + 4} ${Z1} air`)
    await cmd(`fill ${X0} ${Y - 1} ${Z0} ${X1} ${Y - 1} ${Z1} smooth_stone`)
    await cmd(`fill ${PUMP[0]} ${Y} ${PUMP[2]} ${PUMP[0]} ${Y + 2} ${PUMP[2]} iron_block`)
    const added = await cmd(`dfuel pumpat world ${PUMP[0]} ${Y} ${PUMP[2]} ${PUMP[0]} ${Y + 2} ${PUMP[2]} T1`)
    pumpN = (added.match(/FUEL pump (\d+)/) || [])[1] || ''
    check('/dfuel pumpat registers a pump', pumpN !== '', added)
    bot = await join(A)
    await cmd(`gamemode survival ${A}`)
    await cmd(`zzclear ${A}`)
    await cmd(`zzcombatend ${A}`)
    await cmd(`tag ${A} add donating_carcam_off`)
    for (const m of [...String(await cmd(`dgarage info ${A}`)).matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)]) await cmd(`dgarage take ${A} ${m[1]}`)
    await cmd(`dlevel set ${A} 150`)
    const gave = await cmd(`dgarage give ${A} sedan Red`)
    plate = (gave.match(/: ([A-Z0-9-]+) vin=/) || [])[1]
    if (!plate) throw new Error(`no car: ${gave}`)
    await cmd(`zzcarspawn ${plate} ${CAR[0]} ${Y} ${CAR[2]}`)
    await sleep(500)
    await cmd(`dfuel car ${plate} 20`)
    const f0 = await fuelOf()
    check('a car takes fuel: /dfuel car turns it on with the Sedan\'s usage (100 / (48 x 1200)) and sets 20%', field(f0, 'enabled') === 'true' && Math.abs(Number(field(f0, 'level')) - 20) < 0.01 && Math.abs(Number(field(f0, 'usage')) - 0.0017361) < 0.00002, f0)
    await cmd(`eco set ${A} 5000`)
    await tp(7811.5, 7806.5)

    // ---------- The nozzle ----------
    let t = Date.now()
    await clickPump()
    let s = await state()
    check('right-clicking the pump puts its nozzle in hotbar 9, selected', field(s, 'hold') === pumpN && field(s, 'slot8') === `nozzle:${pumpN}` && field(s, 'held') === '8', `${s} | ${text(t)}`)
    t = Date.now()
    await clickCar()
    await sleep(2300)
    s = await state()
    const mid = await level()
    check('the nozzle on the car fills it (4 L a second, $25 a liter, paid as it flows), not getting in', field(s, 'fill') === plate && mid > 20 && (await bal()) < 5000 && !/driver/.test(await cmd(`zzcarseat ${A}`)), `${s} level=${mid} bal=${await bal()}`)
    check('a meter floats over the pump', /Count: 1/i.test(await cmd(`execute if entity @e[type=minecraft:text_display,tag=donating_fuel]`)), await cmd(`execute if entity @e[type=minecraft:text_display,tag=donating_fuel]`))
    await until(async () => field(await state(), 'fill') === '', 15000)
    const full = await level()
    check('it clicks off when full: 100%, $1,000 paid for 40 L (FULL)', Math.abs(full - 100) < 0.05 && (await bal()) === 4000 && /FULL/.test(text(t)), `level=${full} bal=${await bal()} ${text(t).slice(0, 200)}`)
    t = Date.now()
    await clickPump()
    s = await state()
    check('right-clicking the pump hangs up: the phone back in hotbar 9, the receipt in chat, a log line', field(s, 'hold') === '' && field(s, 'slot8') === 'phone' && /Pump T1: 40 L/.test(text(t)) && /hangup Fueler/.test(logText().slice(logMark)), `${s} | ${text(t)}`)

    // ---------- Going back by itself ----------
    await clickPump()
    await tp(7825.5, 7808.5)
    await sleep(1500)
    s = await state()
    check('walking off with the nozzle: it goes back by itself (the phone back)', field(s, 'hold') === '' && field(s, 'slot8') === 'phone', s)
    await tp(7811.5, 7806.5)
    await cmd(`zztag ${A}`)
    t = Date.now()
    await clickPump()
    s = await state()
    check('combat-tagged: the pump refuses ("Not in a fight")', field(s, 'hold') === '' && /Not in a fight/.test(text(t)), `${s} | ${text(t)}`)
    await cmd(`zzcombatend ${A}`)

    // ---------- The money running out ----------
    await cmd(`dfuel car ${plate} 0`)
    await cmd(`eco set ${A} 150`)
    await clickPump()
    t = Date.now()
    await clickCar()
    await sleep(3500)
    s = await state()
    check('the money runs out: $100 paid for the first 4 L, then "Out of money" and the pump stops', (await bal()) === 50 && /Out of money/.test(text(t)) && field(s, 'fill') === '' && Math.abs(Number(field(s, 'liters')) - 4) < 0.01, `${s} bal=${await bal()} ${text(t)}`)
    await clickPump()

    // ---------- Driving: the pedal burns it ----------
    await cmd(`eco set ${A} 5000`)
    await cmd(`dfuel car ${plate} 50`)
    await cmd(`zzcarmount ${A} ${plate}`)
    await sleep(2200)
    const keys = k => bot._client.write('player_input', { inputs: { forward: k, backward: false, left: false, right: false, jump: false, shift: false, sprint: false } })
    const before = await level()
    keys(true)
    await sleep(3000)
    keys(false)
    await sleep(500)
    const after = await level()
    s = await state()
    check('driving: the level goes down while the pedal is held (about 0.035% a second for a Sedan), and fuel.sk knows it (pct)', after < before && before - after < 0.5 && field(s, 'pct') !== '', `before=${before} after=${after} ${s}`)
    t = Date.now()
    await cmd(`dfuel car ${plate} 10`)
    await sleep(2200)
    check('under 15%: a "Low fuel" warning once a ride', /Low fuel/.test(text(t)), text(t))
    bot.setControlState('sneak', true)
    await sleep(600)
    bot.setControlState('sneak', false)
    await sleep(600)

    // ---------- The garage's Refuel button ----------
    await cmd(`dgarage store ${A}`)
    await sleep(1000)
    await cmd(`dfuel car ${plate} 50`)
    const price = 25 * 25 * 2 // 25 L at $25, x2
    const opened = new Promise(resolve => { const timer = setTimeout(() => resolve(null), 4000); bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) }) })
    bot.chat('/garage')
    let w = await opened
    await sleep(300)
    const carSlot = w ? w.slots.findIndex(i => i && i.name === 'diamond_hoe') : -1
    let opts = null
    if (carSlot >= 0) {
      const o2 = new Promise(resolve => { const timer = setTimeout(() => resolve(null), 4000); bot.once('windowOpen', x => { clearTimeout(timer); resolve(x) }) })
      bot.clickWindow(carSlot, 1, 0).catch(() => {})
      opts = await o2
      await sleep(300)
    }
    const btn = opts && opts.slots[15]
    const btnText = btn ? JSON.stringify(btn) : ''
    check(`the garage's options page has "Refuel" with the price (${price})`, Boolean(btn) && /Refuel/.test(btnText) && /1,250/.test(btnText), btnText.slice(0, 300))
    if (opts) {
      bot.clickWindow(15, 0, 0).catch(() => {})
      await sleep(700)
      const armed = bot.currentWindow && bot.currentWindow.slots[15] && bot.currentWindow.slots[15].name === 'lime_concrete'
      bot.clickWindow(15, 0, 0).catch(() => {})
      await sleep(900)
      check('Refuel needs a second click from $1,000 up, then the tank is full and $1,250 paid', armed && Math.abs((await level()) - 100) < 0.05 && (await bal()) === 5000 - price, `armed=${armed} level=${await level()} bal=${await bal()}`)

      // ---------- The Fuel Tank upgrade (Tune, slot 14): $2,000 for stage I (the minimum) ----------
      const balBefore = await bal()
      const tuneOpen = new Promise(resolve => { const timer = setTimeout(() => resolve(null), 4000); bot.once('windowOpen', x => { clearTimeout(timer); resolve(x) }) })
      bot.clickWindow(13, 0, 0).catch(() => {})
      const tune = await tuneOpen
      await sleep(300)
      const tb = tune && tune.slots[14]
      const tbText = tb ? JSON.stringify(tb) : ''
      check('the Tune page has the Fuel Tank I at slot 14 for $2,000', Boolean(tb) && /Fuel Tank I/.test(tbText) && /2,000/.test(tbText), tbText.slice(0, 300))
      if (tune) {
        bot.clickWindow(14, 0, 0).catch(() => {})
        await sleep(700)
        const armedT = bot.currentWindow && bot.currentWindow.slots[14] && bot.currentWindow.slots[14].name === 'lime_concrete'
        bot.clickWindow(14, 0, 0).catch(() => {})
        await sleep(900)
        const f1 = await fuelOf()
        check('Fuel Tank I: a second click, $2,000 paid, 60 L and 64 minutes a tank, the 50 L kept (83.33%)', armedT && (await bal()) === balBefore - 2000 && /tank=60(\.0+)?L/.test(f1) && /burn=64(\.0+)?min/.test(f1) && Math.abs(Number(field(f1, 'level')) - 83.33) < 0.1 && Math.abs(Number(field(f1, 'usage')) - 100 / (64 * 1200)) < 0.00002, `armed=${armedT} bal=${await bal()} ${f1}`)
      }
    }
  } finally {
    if (bot) { try { bot._client.write('player_input', { inputs: { forward: false, backward: false, left: false, right: false, jump: false, shift: false, sprint: false } }) } catch (e) { } }
    if (pumpN) await cmd(`dfuel remove ${pumpN}`).catch(() => {})
    await cmd(`minecraft:ride ${A} dismount`).catch(() => {})
    if (plate) { await cmd(`dgarage take ${A} ${plate}`).catch(() => {}); await cmd(`zzcardelete ${plate}`).catch(() => {}) }
    await cmd(`tag ${A} remove donating_carcam_off`).catch(() => {})
    await cmd(`dlevel reset ${A}`).catch(() => {})
    await cmd(`zzheisttp ${A} 0.5 68 -656.5`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    await cmd(`fill ${X0} ${Y - 1} ${Z0} ${X1} ${Y + 4} ${Z1} air`).catch(() => {})
    await cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
