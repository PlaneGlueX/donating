// contracts.sk: car-theft contracts. Jobs come from a contract giver (quests.sk; one stands next to the
// thief here, the giver itself is bots\scenarios\quests.js). Staff spots and chop shops (/dcontract), the menu (offers by level,
// lockpicks for sale with a confirm over $1,000), taking a job (the car appears at its spot, the boss bar
// and a gold locator-bar dot only the thief gets), nobody else gets in, the lockpick needs to be held,
// the lock-picking minigame (a hurt closes it, misses count per job, 3 misses break the lockpick, 3 hits
// open the car and use the lockpick), driving it to a chop shop (cash, XP, the robbery bounty, the car
// scrapped), the cooldown, time running out, logging out, dropping the job, the passive pay, lockpicks
// kept on death; the tutorial's first job (owner, 2026-09-27: level 0, once, in place of the Street job, Mara's
// lockpick never breaks, no bounty, not counted as a contract). Driving itself is checked in the real client (PLAYTEST).
const { Vec3 } = require('vec3')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'ThiefA'
const B = 'ThiefB'
const Y = 200
const CHUNKS = '1395 1395 1475 1435'
const PLATFORM = `1395 ${Y - 1} 1395 1475 ${Y - 1} 1435`
const FAR = '0.5 68 -656.5'
const SPOT = [1420.5, Y, 1410.5]
const CHOP = [1472.5, Y, 1410.5] // 52 blocks from the spot (contract::min-distance 50)
const HID = 'zctr'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  let spotN = ''
  let chopN = ''
  let giverN = ''
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const state = async name => cmd(`zzctstate ${name}`)
    const field = (s, k) => (s.match(new RegExp(`${k}=(\\S*)`)) || [])[1] || ''
    const car = async plate => cmd(`zzcarinfo ${plate}`)
    const stands = async plate => Number(((await car(plate)).match(/stands=(\d+)/) || [])[1] || 0)
    const dump = async name => cmd(`zzdump ${name}`)
    const picks = async (name, tier) => Number(((await cmd(`zzpick ${name} ${tier} -1`)).match(/ (\d+) slot/) || [])[1] || 0)
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const windowOpen = bot => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const closeAll = async name => { if (bots[name].currentWindow) { bots[name].closeWindow(bots[name].currentWindow); await sleep(300) } }
    const menu = async name => {
      await closeAll(name)
      const o = windowOpen(bots[name])
      bots[name].chat('/contracts')
      const w = await o
      await sleep(300)
      return w
    }
    const click = async (name, slot) => {
      const opened = windowOpen(bots[name])
      bots[name].clickWindow(slot, 0, 0).catch(() => {})
      const w = await opened
      await sleep(300)
      return w
    }
    const itemText = i => (i ? JSON.stringify(i) : '')
    const standNear = (name, pos, maxD = 0.8) => {
      let best = null
      for (const e of Object.values(bots[name].entities)) {
        if (e.name !== 'armor_stand') continue
        const d = e.position.distanceTo(pos)
        if (d <= maxD && (!best || d < best.d)) best = { e, d }
      }
      return best && best.e
    }
    const standPos = async (kind, plate) => {
      const m = (await cmd(`data get entity @e[type=armor_stand,name="MTVEHICLES_${kind}_${plate}",limit=1] Pos`)).match(/\[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/)
      return m ? new Vec3(+m[1], +m[2], +m[3]) : null
    }
    // Right-click (interact_at) a car stand, like a player getting in.
    const rightClickCar = async (name, plate) => {
      const pos = await standPos('MAINSEAT', plate) || await standPos('MAIN', plate)
      if (!pos) return false
      const e = standNear(name, pos)
      if (!e) return false
      try { await bots[name].lookAt(pos.offset(0, 1, 0), true) } catch (err) {}
      try { await bots[name].activateEntityAt(e, pos.offset(0, 1, 0)) } catch (err) {}
      await sleep(900)
      return true
    }
    const getOut = async name => {
      bots[name].setControlState('sneak', true)
      await sleep(600)
      bots[name].setControlState('sneak', false)
      await sleep(700)
    }
    const uuidOf = async sel => {
      const m = (await cmd(`data get entity ${sel} UUID`)).match(/\[I; (-?\d+), (-?\d+), (-?\d+), (-?\d+)\]/)
      if (!m) return ''
      const hex = m.slice(1).map(n => (Number(n) >>> 0).toString(16).padStart(8, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
    const LOG = require('path').join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs', 'contracts.log')
    const log = () => (require('fs').existsSync(LOG) ? require('fs').readFileSync(LOG, 'utf8') : '')
    const logMark = log().length
    const logged = re => log().slice(logMark).split('\n').filter(l => re.test(l))
    // The lock-picking window: the top row, the hits shown, the lever's lore.
    const row = name => { const w = bots[name].currentWindow; if (!w) return []; return [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (w.slots[i] ? w.slots[i].name : '')) }
    const hitsShown = name => { const w = bots[name].currentWindow; if (!w) return -1; return [12, 13, 14].filter(i => w.slots[i] && w.slots[i].name === 'green_concrete').length }
    const hitOnce = async name => {
      const end = Date.now() + 6000
      while (Date.now() < end && bots[name].currentWindow) {
        const i = row(name).indexOf('lime_concrete')
        if (i >= 0) { await bots[name].clickWindow(i, 0, 0); return true }
        await sleep(15)
      }
      return false
    }
    const missOnce = async name => {
      await until(async () => { const t = row(name); const a = t.indexOf('lime_stained_glass_pane'); const b = t.indexOf('yellow_concrete'); return a >= 0 && b >= 0 && Math.abs(a - b) >= 3 }, 3000)
      await bots[name].clickWindow(22, 0, 0)
      await sleep(800)
    }

    // ---------- Setup ----------
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`zzbountyreset ${name}`)
      await cmd(`dlevel reset ${name}`)
      await cmd(`eco set ${name} 100000`)
      await cmd(`zzctreset ${name}`)
      // The tutorial's first job is tested at the end (B); here the regular Street jobs.
      await cmd(`zzdatatext ${name} ct-starter done`)
      for (const t of ['basic', 'pro', 'master']) await cmd(`zzpick ${name} ${t} 0`)
    }
    // Boss bars and waypoints as A's client sees them.
    const bars = new Map()
    bots[A]._client.on('boss_bar', p => {
      if (p.action === 1) { bars.delete(p.entityUUID); return }
      const b = bars.get(p.entityUUID) || {}
      if (p.title !== undefined) b.title = require('prismarine-chat')(bots[A].registry).fromNotch(p.title).toString()
      bars.set(p.entityUUID, b)
    })
    const barText = () => JSON.stringify([...bars.values()])
    const waypointsA = []
    const waypointsB = []
    bots[A]._client.on('tracked_waypoint', p => waypointsA.push(p))
    bots[B]._client.on('tracked_waypoint', p => waypointsB.push(p))
    await sleep(2500)
    await cmd(`zzheisttp ${A} 1410.5 ${Y} 1410.5`)
    await cmd(`zzheisttp ${B} 1410.5 ${Y} 1416.5`)
    // A contract giver next to the thief (jobs and lockpicks only there).
    giverN = ((await cmd(`dquest addat contracts 1407.5 ${Y} 1410.5 -90 Test Yard`)).match(/giver (\d+) \(contracts\) added/) || [])[1] || ''
    await sleep(1500)

    // ---------- Staff: spots and chop shops ----------
    let r = await cmd(`dcontract spot addat ${SPOT.join(' ')} 90`)
    spotN = (r.match(/spot (\d+) added/) || [])[1] || ''
    r = await cmd(`dcontract chop addat ${CHOP.join(' ')}`)
    chopN = (r.match(/chop (\d+) added/) || [])[1] || ''
    const refused = await cmd(`dcontract spot addat 1430.5 ${Y + 40} 1410.5`)
    check('staff add car spots and chop shops; a spot with no ground under it is refused', spotN !== '' && chopN !== '' && /refused: no room/.test(refused), `${spotN} ${chopN} ${refused}`)
    const nearChop = await cmd(`dcontract spot addat ${CHOP[0] - 10} ${Y} ${CHOP[2]} 90`)
    const nearSpot = await cmd(`dcontract chop addat ${SPOT[0] + 10} ${Y} ${SPOT[2]}`)
    check('a car spot and a chop shop closer than 50 blocks are refused (no pay for no driving)', /refused: less than 50 blocks from chop shop/.test(nearChop) && /refused: less than 50 blocks from car spot/.test(nearSpot), `${nearChop} | ${nearSpot}`)
    let t = Date.now()
    bots[B].chat('/dcontract spot list')
    await sleep(800)
    check('/dcontract is staff only', /Staff only/.test(text(B, t)), text(B, t))

    // ---------- The menu ----------
    let w = await menu(A)
    check('/contracts opens the menu: three offers (cars), three lockpicks', w && /Car contracts/.test(JSON.stringify(w.title)) && [11, 13, 15].every(s => w.slots[s] && ['diamond_hoe', 'gray_dye'].includes(w.slots[s].name)) && [20, 22, 24].every(s => w.slots[s] && w.slots[s].name === 'flint'), `${JSON.stringify(w && w.title)} ${w && [11, 13, 15, 20, 22, 24].map(s => w.slots[s] && w.slots[s].name)}`)
    check('level 0: the Street job needs level 5', /Needs level 5/.test(itemText(w && w.slots[11])), itemText(w && w.slots[11]).slice(0, 400))
    await closeAll(A)
    t = Date.now()
    await cmd(`zzcttake ${A} basic`)
    await until(async () => /need level 5/.test(text(A, t)), 3000)
    check('taking it anyway is refused', /need level 5/.test(text(A, t)) && field(await state(A), 'job') === '<none>', text(A, t))
    await cmd(`dlevel set ${A} 5`)
    await cmd(`zzctoffer ${A} basic sedan Red ${spotN}`)
    await sleep(1200)
    w = await menu(A)
    check('level 5: the offer shows the car, where, the pay ($1,500: contracts halved) and "Click: take this job"', /Red Sedan/.test(itemText(w && w.slots[11])) && /\$1,500/.test(itemText(w && w.slots[11])) && /\+30 XP/.test(itemText(w && w.slots[11])) && /Click: take this job/.test(itemText(w && w.slots[11])) && /1\dm (E|NE|SE)/.test(itemText(w && w.slots[11])), itemText(w && w.slots[11]).slice(0, 600))
    // Lockpicks: Basic ($250, no confirm), Pro (level 30), Master ($2,000, confirm).
    await click(A, 20)
    await sleep(500)
    check('a Basic Lockpick costs $250 and lands in hotbar 6 (a quest item)', (await bal(A)) === 99750 && /5=flint x1 \[lockpick:basic\]/.test(await dump(A)), `${await bal(A)} ${await dump(A)}`)
    await click(A, 22)
    await sleep(500)
    check('a Pro Lockpick needs level 30', (await bal(A)) === 99750 && (await picks(A, 'pro')) === 0, `${await bal(A)}`)
    await closeAll(A)
    await cmd(`dlevel set ${A} 60`)
    await sleep(1200)
    w = await menu(A)
    w = await click(A, 24)
    const armed = w && w.slots[24] && w.slots[24].name === 'lime_concrete' && /Confirm purchase/.test(itemText(w.slots[24])) && (await bal(A)) === 99750
    await click(A, 24)
    await sleep(500)
    check('a Master Lockpick ($2,000) needs a second click (a green confirm button)', armed && (await bal(A)) === 97750 && (await picks(A, 'master')) === 1, `armed=${armed} ${await bal(A)} ${await dump(A)}`)
    await closeAll(A)
    await cmd(`zzpick ${A} master 0`)
    await cmd(`dlevel set ${A} 5`)
    await sleep(1200)

    // ---------- Taking the job ----------
    await cmd(`zzctoffer ${A} basic sedan Red ${spotN}`)
    w = await menu(A)
    t = Date.now()
    bots[A].clickWindow(11, 0, 0).catch(() => {})
    await sleep(1500)
    let s = await state(A)
    const plate = field(s, 'plate')
    check('taking the job: the menu closes, the car is at its spot (a new MTVehicles car), stage "find"', !bots[A].currentWindow && field(s, 'job') === 'basic' && field(s, 'stage') === 'find' && plate !== '' && (await stands(plate)) >= 1 && /steal the Red Sedan/.test(text(A, t)), `${s} ${await car(plate)} ${text(A, t)}`)
    check('it isn\'t a garage car: MTVehicles owner is the thief, but /garage doesn\'t list it', /owner=ThiefA/.test(await car(plate)) && !/sedan=/.test(await cmd(`dgarage info ${A}`)), `${await car(plate)} ${await cmd(`dgarage info ${A}`)}`)
    await until(async () => /CONTRACT/.test(barText()), 3000)
    check('the boss bar points the way: "CONTRACT · Steal the Sedan <arrow> <n>m · 9:5x"', /CONTRACT.*Steal the Sedan . \d+m .*9:5\d/.test(barText()), barText())
    await sleep(1500)
    const markId = await uuidOf('@e[tag=donating_gps,limit=1]') // the phone plugin's GPS dot (gps.sk)
    const markA = waypointsA.some(p => (p.operation === 'track' || p.operation === 'update') && p.waypoint && p.waypoint.uuid === markId && p.waypoint.icon && p.waypoint.icon.color && p.waypoint.icon.color.red === 255 && p.waypoint.icon.color.green === 90 && p.waypoint.icon.color.blue === 31)
    const markB = waypointsB.some(p => p.waypoint && p.waypoint.uuid === markId)
    check('the car is an orange GPS dot on the thief\'s locator bar, and not on anyone else\'s', markId !== '' && markA && !markB, `${markId} A=${markA} B=${markB} ${JSON.stringify(waypointsA.slice(-2)).slice(0, 300)}`)

    // ---------- Getting in: the lock ----------
    await cmd(`zzheisttp ${A} ${SPOT[0] - 2.5} ${Y} ${SPOT[2]}`)
    await cmd(`zzheisttp ${B} ${SPOT[0] + 2.5} ${Y} ${SPOT[2]}`)
    await sleep(4500) // EssentialsX's teleport protection (4 s) would block the hurt test below
    t = Date.now()
    await rightClickCar(B, plate)
    check('someone else can\'t get in (or pick it)', /Someone else has the contract/.test(text(B, t)) && !/:/.test((await cmd(`zzcarseat ${B}`)).split(' ')[2] || '') && !bots[B].currentWindow, `${text(B, t)} ${await cmd(`zzcarseat ${B}`)}`)
    bots[A].setQuickBarSlot(0)
    await sleep(300)
    t = Date.now()
    await rightClickCar(A, plate)
    check('the thief has to hold the lockpick', /Hold your Basic Lockpick/.test(text(A, t)) && !bots[A].currentWindow && field(await state(A), 'stage') === 'find', text(A, t))
    bots[A].setQuickBarSlot(5)
    await sleep(300)
    let o = windowOpen(bots[A])
    await rightClickCar(A, plate)
    w = await o
    check('holding it, a right-click opens "Pick the lock"', w && /Pick the lock/.test(JSON.stringify(w.title)), JSON.stringify(w && w.title))
    check('no switching passive mode during a job', /Finish or drop your car contract first/.test(await cmd(`zzpassivewhy ${A}`)), await cmd(`zzpassivewhy ${A}`))
    // A passive player's punch is cancelled (pvp.sk): it must not close the minigame.
    await cmd(`zzpassive ${B} on`)
    await sleep(300)
    const aEnt = bots[B].players[A] && bots[B].players[A].entity
    if (aEnt) { try { await bots[B].lookAt(aEnt.position.offset(0, 1.5, 0), true) } catch (err) {} bots[B].attack(aEnt) }
    await sleep(700)
    check("a punch that does no damage (a passive player's) doesn't close it", Boolean(aEnt) && Boolean(bots[A].currentWindow) && !/qte=<none>/.test(await state(A)), `ent=${Boolean(aEnt)} ${await state(A)}`)
    await cmd(`zzpassive ${B} off`)
    await hitOnce(A)
    await sleep(500)
    const oneHit = hitsShown(A)
    t = Date.now()
    await cmd(`minecraft:damage ${A} 1`)
    await sleep(600)
    check('a hit counts; getting hurt closes it ("the pick slipped")', oneHit === 1 && !bots[A].currentWindow && /pick slipped/.test(text(A, t)), `${oneHit} ${text(A, t)}`)
    await sleep(600)
    o = windowOpen(bots[A])
    await rightClickCar(A, plate)
    await o
    await sleep(300)
    await missOnce(A)
    await missOnce(A)
    const lore = itemText(bots[A].currentWindow && bots[A].currentWindow.slots[22])
    await closeAll(A)
    o = windowOpen(bots[A])
    await rightClickCar(A, plate)
    await o
    await sleep(300)
    check('two misses show "Misses: 2/3", and closing the menu doesn\'t reset them', /"Misses: "/.test(lore) && /"2\/3"/.test(lore) && field(await state(A), 'fails') === '2', `${lore.slice(Math.max(0, lore.indexOf('Misses') - 80), lore.indexOf('Misses') + 400)} ${await state(A)}`)
    t = Date.now()
    await missOnce(A)
    await sleep(300)
    s = await state(A)
    check('a third miss breaks the lockpick (the menu closes, the misses start over)', !bots[A].currentWindow && (await picks(A, 'basic')) === 0 && /lockpick broke/.test(text(A, t)) && field(s, 'fails') === '0' && logged(/lockpick-broke ThiefA/).length === 1, `${text(A, t)} ${s}`)
    t = Date.now()
    await rightClickCar(A, plate)
    check('without a lockpick: "You need a Basic Lockpick"', /You need a Basic Lockpick/.test(text(A, t)) && !bots[A].currentWindow, text(A, t))
    await cmd(`zzpick ${A} basic 2`)
    bots[A].setQuickBarSlot(5)
    await sleep(300)
    o = windowOpen(bots[A])
    await rightClickCar(A, plate)
    await o
    await sleep(300)
    for (let i = 0; i < 3 && bots[A].currentWindow; i++) { await hitOnce(A); await sleep(450) }
    await sleep(500)
    s = await state(A)
    check('3 hits in a row open the car: the menu closes, one lockpick is used, stage "open"', !bots[A].currentWindow && field(s, 'stage') === 'open' && (await picks(A, 'basic')) === 1 && logged(/picked ThiefA/).length === 1, `${s} picks=${await picks(A, 'basic')}`)
    t = Date.now()
    await rightClickCar(B, plate)
    check('still nobody else gets in', !/driver|passenger/.test(await cmd(`zzcarseat ${B}`)), await cmd(`zzcarseat ${B}`))
    await rightClickCar(A, plate)
    await sleep(500)
    check('the thief gets in the driver\'s seat, and the boss bar says to drive it to a chop shop', (await cmd(`zzcarseat ${A}`)).includes(`driver:${plate}`) && (await until(async () => /Drive it to a chop shop . \d+m/.test(barText()), 2000)), `${await cmd(`zzcarseat ${A}`)} ${barText()}`)
    await getOut(A)
    check('out of the car: the boss bar points back to it', await until(async () => /Back to the Sedan/.test(barText()), 2000), barText())

    // ---------- A stolen car can't end up in a heist ----------
    await cmd(`zzregion heist_${HID} 1436 ${Y - 1} 1404 1446 ${Y + 6} 1417`)
    await cmd(`dheist create ${HID} 1`)
    await cmd(`dheist set ${HID} level 0`)
    await cmd(`dheist exit ${HID} 1430.5 ${Y} 1400.5`)
    await cmd(`dheist snapshot ${HID}`)
    await cmd(`dheist enable ${HID}`)
    await until(async () => /state=open/.test(await cmd(`zzheist ${HID}`)), 10000)
    await rightClickCar(A, plate)
    await sleep(500)
    const inCar = (await cmd(`zzcarseat ${A}`)).includes(`driver:${plate}`)
    t = Date.now()
    await cmd(`zzcartp ${plate} 1441.5 ${Y} ${SPOT[2]}`)
    await sleep(1500)
    const mainAt = await standPos('MAIN', plate)
    check('a stolen car that ends up in a heist: the thief is out, the car back outside, the job still on', inCar && !/driver:/.test(await cmd(`zzcarseat ${A}`)) && mainAt && mainAt.x < 1436 && field(await state(A), 'stage') === 'open' && /back outside/.test(text(A, t)), `inCar=${inCar} ${await cmd(`zzcarseat ${A}`)} main=${mainAt} ${await state(A)} ${text(A, t)}`)
    await cmd(`dheist delete ${HID} confirm`)
    await cmd(`rg remove -w world heist_${HID}`)
    await cmd(`zzheisttp ${A} ${SPOT[0] - 2.5} ${Y} ${SPOT[2]}`)
    await sleep(1000)

    // ---------- The chop shop ----------
    await cmd(`zzcartp ${plate} ${CHOP[0] - 2} ${Y} ${CHOP[2]}`)
    await cmd(`zzheisttp ${A} ${CHOP[0] - 4.5} ${Y} ${CHOP[2]}`)
    await sleep(1200)
    const bal0 = await bal(A)
    const xpOf = async () => Number(((await cmd(`dlevel info ${A}`)).match(/xp=(\d+)/) || [])[1] || -1)
    const xp0 = await xpOf()
    t = Date.now()
    await rightClickCar(A, plate)
    await sleep(800)
    s = await state(A)
    const lvl = (await xpOf()) - xp0
    check('driving into a chop shop: $1,500 and 30 XP, the job ends, the car is scrapped', (await bal(A)) - bal0 === 1500 && lvl === 30 && field(s, 'job') === '<none>' && !/exists=yes/.test(await car(plate)) && /CAR DELIVERED|chop shop took/.test(text(A, t)) && logged(/deliver ThiefA .* pay=1500 xp=30/).length === 1, `${(await bal(A)) - bal0} ${lvl} ${s} ${await car(plate)} ${text(A, t)}`)
    check('...the robbery bounty adds 10% ($150), and the thief is out of the car', /BOUNTY ThiefA 150/.test(await cmd(`zzbounty ${A}`)) && !/driver/.test(await cmd(`zzcarseat ${A}`)), `${await cmd(`zzbounty ${A}`)} ${await cmd(`zzcarseat ${A}`)}`)
    await sleep(2500)
    check('the GPS dot is gone, and so is the boss bar', !/CONTRACT/.test(barText()) && !/Test passed/.test(await cmd('execute if entity @e[tag=donating_gps]')), `${barText()} ${await cmd('execute if entity @e[tag=donating_gps]')}`)
    t = Date.now()
    await cmd(`zzcttake ${A} basic`)
    await sleep(500)
    check('the next job waits for the cooldown (3:00)', /next job is ready in 2:5\d|next job is ready in 3:00/.test(text(A, t)), text(A, t))

    // ---------- Time runs out; logging out; dropping it ----------
    await cmd(`zzheisttp ${A} 1410.5 ${Y} 1410.5`) // back at the contract giver
    await cmd(`zzctreset ${A}`)
    await cmd(`zzctoffer ${A} basic sedan Red ${spotN}`)
    await cmd(`zzcttake ${A} basic`)
    let p2 = field(await state(A), 'plate')
    await cmd(`zzcttime ${A} 1`)
    t = Date.now()
    await sleep(2500)
    check('time runs out: the job is off and the car is gone', field(await state(A), 'job') === '<none>' && !/exists=yes/.test(await car(p2)) && /Time's up/.test(text(A, t)) && Number(field(await state(A), 'cd')) > 150, `${await state(A)} ${await car(p2)} ${text(A, t)}`)
    await cmd(`zzctreset ${A}`)
    await cmd(`zzctoffer ${A} basic sedan Red ${spotN}`)
    await cmd(`zzcttake ${A} basic`)
    p2 = field(await state(A), 'plate')
    w = await menu(A)
    check('the menu shows the job (the car, time left) and a drop button', w && /Red Sedan/.test(itemText(w.slots[13])) && /Time left/.test(itemText(w.slots[13])) && w.slots[15] && w.slots[15].name === 'red_dye', `${itemText(w && w.slots[13]).slice(0, 300)} ${w && w.slots[15] && w.slots[15].name}`)
    w = await click(A, 15)
    const dropArmed = w && w.slots[15] && w.slots[15].name === 'red_concrete' && field(await state(A), 'job') === 'basic'
    t = Date.now()
    bots[A].clickWindow(15, 0, 0).catch(() => {})
    await sleep(1200)
    check('dropping the job takes a second click; the car is gone', dropArmed && field(await state(A), 'job') === '<none>' && !/exists=yes/.test(await car(p2)) && /dropped the Red Sedan job/.test(text(A, t)), `armed=${dropArmed} ${await state(A)} ${text(A, t)}`)
    await cmd(`zzctreset ${A}`)
    await cmd(`zzctoffer ${A} basic sedan Red ${spotN}`)
    await cmd(`zzcttake ${A} basic`)
    p2 = field(await state(A), 'plate')
    await quit(bots[A])
    await sleep(1500)
    check('logging out ends the job: the car is gone', !/exists=yes/.test(await car(p2)) && logged(/end ThiefA .* why=quit/).length === 1, `${await car(p2)}`)
    bots[A] = await join(A)
    await sleep(2500)

    // ---------- Passive pay, death, levels ----------
    await cmd(`zzctreset ${A}`)
    await cmd(`zzpassive ${A} on`)
    await cmd(`zzctoffer ${A} basic sedan Red ${spotN}`)
    w = await menu(A)
    check('a passive player\'s job pays 75% ($1,125)', /\$1,125/.test(itemText(w && w.slots[11])), itemText(w && w.slots[11]).slice(0, 400))
    await closeAll(A)
    await cmd(`zzpassive ${A} off`)
    await cmd(`minecraft:kill ${A}`)
    await sleep(1500)
    try { bots[A].respawn() } catch (err) {}
    await sleep(2500)
    check('lockpicks are kept when you die', (await picks(A, 'basic')) === 1, await dump(A))
    t = Date.now()
    bots[A].chat('/levels')
    await sleep(800)
    check('/levels lists the contract tiers', /Street job car contracts/.test(text(A, t)) && /Master job car contracts/.test(text(A, t)), text(A, t).slice(0, 600))

    // ---------- The tutorial's first job (owner, 2026-09-27) ----------
    await cmd(`zzctreset ${B}`)
    await cmd(`zzdata ${B} ct-starter none`)
    await cmd(`zzdata ${B} contracts-done none`)
    await cmd(`dlevel reset ${B}`)
    await cmd(`zzbountyreset ${B}`)
    await cmd(`eco set ${B} 1000`)
    await cmd(`zzpick ${B} basic 1`)
    await cmd(`zzheisttp ${B} 1410.5 ${Y} 1412.5`)
    await sleep(1500)
    await cmd(`zzctoffer ${B} starter sedan Gray ${spotN}`)
    w = await menu(B)
    check('level 0: "First job" is offered in place of the Street job ($1,500, 40 XP, the Basic Lockpick that never breaks on it)', /First job/.test(itemText(w && w.slots[11])) && /\$1,500/.test(itemText(w && w.slots[11])) && /\+40 XP/.test(itemText(w && w.slots[11])) && /never breaks/.test(itemText(w && w.slots[11])) && /Click: take this job/.test(itemText(w && w.slots[11])), itemText(w && w.slots[11]).slice(0, 700))
    t = Date.now()
    bots[B].clickWindow(11, 0, 0).catch(() => {})
    await sleep(1500)
    s = await state(B)
    const p3 = field(s, 'plate')
    check('taking it: job "starter", the car at its spot', field(s, 'job') === 'starter' && p3 !== '' && (await stands(p3)) >= 1, s)
    await cmd(`zzheisttp ${B} ${SPOT[0] - 2.5} ${Y} ${SPOT[2]}`)
    await sleep(1500)
    bots[B].setQuickBarSlot(5)
    await sleep(300)
    o = windowOpen(bots[B])
    await rightClickCar(B, p3)
    await o
    await sleep(300)
    t = Date.now()
    for (let i = 0; i < 3 && bots[B].currentWindow; i++) await missOnce(B)
    check('three misses on the first job don\'t break Mara\'s lockpick (the game goes on)', (await picks(B, 'basic')) === 1 && Boolean(bots[B].currentWindow) && !/lockpick broke/.test(text(B, t)), `picks=${await picks(B, 'basic')} window=${Boolean(bots[B].currentWindow)} ${text(B, t)}`)
    for (let i = 0; i < 3 && bots[B].currentWindow; i++) { await hitOnce(B); await sleep(450) }
    await sleep(500)
    check('2 hits in a row open it (the first job is easier), and Mara\'s lockpick stays until the delivery', field(await state(B), 'stage') === 'open' && (await picks(B, 'basic')) === 1, await state(B))
    await cmd(`zzcartp ${p3} ${CHOP[0] - 2} ${Y} ${CHOP[2]}`)
    await cmd(`zzheisttp ${B} ${CHOP[0] - 4.5} ${Y} ${CHOP[2]}`)
    await sleep(1200)
    const balB = await bal(B)
    t = Date.now()
    await rightClickCar(B, p3)
    await sleep(900)
    const xpB = Number(((await cmd(`dlevel info ${B}`)).match(/xp=(\d+)/) || [])[1] || -1)
    const doneB = await cmd(`zzdata ${B} contracts-done`)
    check('delivered: $1,500 and 40 XP (level 1), no bounty, Mara\'s lockpick used up now, and it doesn\'t count as a delivered contract', (await picks(B, 'basic')) === 0 && (await bal(B)) - balB === 1500 && xpB === 40 && /BOUNTY StarterB 0|BOUNTY ThiefB 0/.test(await cmd(`zzbounty ${B}`)) && !/= \d/.test(doneB) && /= done/.test(await cmd(`zzdata ${B} ct-starter`)), `+${(await bal(B)) - balB} xp=${xpB} ${await cmd(`zzbounty ${B}`)} ${doneB}`)
    await cmd(`zzctreset ${B}`)
    await cmd(`zzheisttp ${B} 1410.5 ${Y} 1412.5`)
    await sleep(1200)
    w = await menu(B)
    check('once done, the Street job is back in its place (level 5)', /Street job/.test(itemText(w && w.slots[11])) && /Needs level 5/.test(itemText(w && w.slots[11])), itemText(w && w.slots[11]).slice(0, 400))
    await closeAll(B)
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`zzctreset ${name}`).catch(() => {})
      await rcon.cmd(`zzdatatext ${name} ct-starter done`).catch(() => {})
      for (const t of ['basic', 'pro', 'master']) await rcon.cmd(`zzpick ${name} ${t} 0`).catch(() => {})
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`zzbountyreset ${name}`).catch(() => {})
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    if (spotN) await rcon.cmd(`dcontract spot remove ${spotN}`).catch(() => {})
    if (chopN) await rcon.cmd(`dcontract chop remove ${chopN}`).catch(() => {})
    if (giverN) await rcon.cmd(`dquest remove ${giverN}`).catch(() => {})
    await rcon.cmd(`dheist delete ${HID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${HID}`).catch(() => {})
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
