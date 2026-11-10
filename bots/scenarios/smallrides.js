// Scooters and skateboards (bikes.sk spot kinds, 2026-11-10; owner: "low level scooters and skateboards outside the
// prison ... same way jailbreak uses the default camaro"). Two spots on a platform: a skateboard (no hotwiring: a
// right-click rides it, no fuel tank, skateboard stats) and a scooter ("Hotwire the scooter", 2 hits, scooter stats,
// a part-full tank), and a bicycle ("Hotwire the bicycle", 1 hit, bicycle stats, no tank). A wrong kind is refused; /dbike list
// names each spot's kind.
const { Vec3 } = require('vec3')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'RideThief'
const Y = 200
const X0 = 7900, X1 = 7930, Z0 = 7820, Z1 = 7840
const CHUNKS = `${X0} ${Z0} ${X1} ${Z1}`
const SKATE = [7908.5, Y, 7830.5]
const SCOOT = [7918.5, Y, 7830.5]
const BICY = [7926.5, Y, 7830.5]

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  const spots = []
  const plates = []
  try {
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const state = async () => cmd(`zzbike ${A}`)
    const field = (s, k) => { const v = (s.match(new RegExp(`${k}=(\\S*)`)) || [])[1] || ''; return v === '<none>' ? '' : v }
    const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(250) } return Boolean(await fn()) }
    const near = (kind, pos, d = 0.8) => Object.values(bot.entities).filter(e => e.name === kind && e.position.distanceTo(pos) < d)
    const box = s => near('interaction', new Vec3(...s))[0]
    const parked = s => near('item_display', new Vec3(s[0], Y + 1.69, s[2])).length === 1 && Boolean(box(s))
    const windowOpen = () => new Promise(resolve => { const timer = setTimeout(() => resolve(null), 3000); bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) }) })
    const click = async s => { const b = box(s); if (!b) return null; const o = windowOpen(); await bot.activateEntity(b).catch(() => {}); return o }
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
    const getOff = async () => {
      bot.setControlState('sneak', true)
      await sleep(600)
      bot.setControlState('sneak', false)
      await cmd(`minecraft:ride ${A} dismount`).catch(() => {})
    }

    // ---------- Setup ----------
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${X0} ${Y - 1} ${Z0} ${X1} ${Y + 4} ${Z1} air`)
    await cmd(`fill ${X0} ${Y - 1} ${Z0} ${X1} ${Y - 1} ${Z1} smooth_stone`)
    const bad = await cmd(`dbike spotat world ${SKATE[0]} ${Y} ${SKATE[2]} 0 hoverboard`)
    check('a kind that doesn\'t exist is refused', /no kind hoverboard/.test(bad), bad)
    for (const [s, k] of [[SKATE, 'skateboard'], [SCOOT, 'scooter'], [BICY, 'bicycle']]) {
      const r = await cmd(`dbike spotat world ${s[0]} ${Y} ${s[2]} 0 ${k}`)
      const n = (r.match(/BIKE spot (\d+)/) || [])[1]
      if (n) spots.push(n)
      check(`/dbike spotat ... ${k} adds a ${k} spot`, Boolean(n) && r.includes(k), r)
    }
    const list = await cmd('dbike list')
    check('/dbike list names the kinds', spots.length === 3 && new RegExp(`${spots[2]}: .* bicycle`).test(list) && new RegExp(`${spots[0]}: .* skateboard`).test(list) && new RegExp(`${spots[1]}: .* scooter`).test(list), list.slice(-400))
    bot = await join(A)
    await cmd(`gamemode survival ${A}`)
    await cmd(`zzclear ${A}`)
    await cmd(`zzdata ${A} level 1`) // the skateboard needs no level; the bicycle 2, the scooter 5
    await cmd(`zzcombatend ${A}`)
    await cmd(`tag ${A} add donating_carcam_off`)
    await cmd(`zzheisttp ${A} ${SKATE[0] + 2} ${Y} ${SKATE[2] - 2}`)
    await until(async () => parked(SKATE) && parked(SCOOT) && parked(BICY), 6000)
    check('all three are parked (an item display and an interaction box each)', parked(SKATE) && parked(SCOOT) && parked(BICY), `skate=${parked(SKATE)} scooter=${parked(SCOOT)} bicycle=${parked(BICY)}`)

    // ---------- The skateboard: no hotwiring ----------
    let t = Date.now()
    const w0 = await click(SKATE)
    await sleep(1200)
    let s = await state()
    let plate = field(s, 'of')
    if (plate) plates.push(plate)
    let seat = await cmd(`zzcarseat ${A}`)
    check('a right-click on the skateboard rides it at once (no minigame)', !w0 && plate !== '' && seat.includes(`driver:${plate}`) && !parked(SKATE), `${s} | ${seat} | ${text(t)}`)
    let stat = await cmd(`dphone carstat ${plate}`)
    check('the skateboard has its own stats (top speed 0.4)', /max=0\.4\b/.test(stat), stat)
    const fuel0 = await cmd(`dfuel car ${plate}`)
    check('the skateboard has no fuel tank (fuel off for it)', /enabled=false/.test(fuel0), fuel0)
    await getOff()

    // ---------- The scooter: a 2-hit hotwire (level 5) ----------
    await cmd(`zzheisttp ${A} ${SCOOT[0] + 2} ${Y} ${SCOOT[2] - 2}`)
    await sleep(800)
    t = Date.now()
    const wl = await click(SCOOT)
    await sleep(500)
    check('below level 5 the scooter is refused, with the level it needs', !wl && /Level 5 to take a scooter/.test(text(t)), text(t))
    await cmd(`zzdata ${A} level 5`)
    await sleep(400)
    const w = await click(SCOOT)
    check('right-clicking the scooter opens "Hotwire the scooter"', w && /Hotwire the scooter/.test(JSON.stringify(w.title)), JSON.stringify(w && w.title))
    await sleep(300)
    for (let i = 0; i < 2 && bot.currentWindow; i++) { await hitOnce(); await sleep(450) }
    await sleep(1200)
    s = await state()
    plate = field(s, 'of')
    if (plate) plates.push(plate)
    seat = await cmd(`zzcarseat ${A}`)
    check('2 hits in a row: the thief rides the scooter, and the skateboard (one ride at a time) is scrapped', plate !== '' && plate !== plates[0] && seat.includes(`driver:${plate}`), `${s} | ${seat}`)
    stat = await cmd(`dphone carstat ${plate}`)
    check('the scooter has its own stats (top speed 0.48)', /max=0\.48/.test(stat), stat)
    const fuel = await cmd(`dfuel car ${plate}`)
    const lv = Number(field(fuel, 'level'))
    check('the scooter has a part-full tank (40-100%)', lv >= 40 && lv <= 100 && /enabled=true/.test(fuel), fuel)
    await getOff()

    // ---------- The bicycle: a 1-hit lock, no tank ----------
    await cmd(`zzheisttp ${A} ${BICY[0] + 2} ${Y} ${BICY[2] - 2}`)
    await sleep(800)
    const wb = await click(BICY)
    check('right-clicking the bicycle opens "Hotwire the bicycle"', wb && /Hotwire the bicycle/.test(JSON.stringify(wb.title)), JSON.stringify(wb && wb.title))
    await sleep(300)
    if (bot.currentWindow) await hitOnce()
    await sleep(1200)
    s = await state()
    plate = field(s, 'of')
    if (plate) plates.push(plate)
    seat = await cmd(`zzcarseat ${A}`)
    check('1 hit: the thief rides the bicycle', plate !== '' && plate !== plates[1] && seat.includes(`driver:${plate}`), `${s} | ${seat}`)
    stat = await cmd(`dphone carstat ${plate}`)
    check('the bicycle has its own stats (top speed 0.44)', /max=0.44/.test(stat), stat)
    const fuelB = await cmd(`dfuel car ${plate}`)
    check('the bicycle has no fuel tank (pedalled)', /enabled=false/.test(fuelB), fuelB)
  } finally {
    await cmd(`minecraft:ride ${A} dismount`).catch(() => {})
    for (const n of spots) await cmd(`dbike remove ${n}`).catch(() => {})
    for (const p of plates) await cmd(`zzcardelete ${p}`).catch(() => {})
    await cmd('zzcfgreload').catch(() => {})
    await cmd(`tag ${A} remove donating_carcam_off`).catch(() => {})
    await cmd(`zzheisttp ${A} 0.5 68 -656.5`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    await cmd(`fill ${X0} ${Y - 1} ${Z0} ${X1} ${Y + 4} ${Z1} air`).catch(() => {})
    await cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
