// garage.sk and car-cleanup.sk (MTVehicles 2.5.9): the Car Dealer (level, price, confirm; several of a model since
// 2026-09-28, each its own plate and serial number),
// the garage (call a car next to you, one out at a time), getting in (only the owner drives; locked =
// nobody else, unlocked = passengers), the car key in slot 9 while driving (lock / unlock) and the phone
// back after, no cars in heists, stands that can't be broken, /vehicle for staff only, repainting (a new
// plate), crate cars (a car, or the dupe cash for a repeat), the doubled chase radius in a car, and the
// cleanup (idle, owner logs out). Driving itself is checked in the real client (PLAYTEST).
const { Vec3 } = require('vec3')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'GarageA'
const B = 'GarageB'
const Y = 200
const CHUNKS = '1195 1195 1245 1235'
const PLATFORM = `1195 ${Y - 1} 1195 1245 ${Y - 1} 1235`
const HID = 'zgar'
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  const plates = []
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const info = async name => cmd(`dgarage info ${name}`)
    // "PLATE=model(color,...)" per car (garage.sk /dgarage info): the first car of a model.
    const plateOf = async (name, id) => ((await info(name)).match(new RegExp(`([A-Z0-9-]+)=${id}\\(`)) || [])[1] || ''
    const platesOf = async name => [...(await info(name)).matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)].map(m => m[1])
    const takeAll = async name => { for (const p of await platesOf(name)) await cmd(`dgarage take ${name} ${p}`) }
    const car = async plate => cmd(`zzcarinfo ${plate}`)
    const stands = async plate => Number(((await car(plate)).match(/stands=(\d+)/) || [])[1] || 0)
    const seat = async name => cmd(`zzcarseat ${name}`)
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
    const click = async (name, slot, button = 0) => {
      const opened = windowOpen(bots[name])
      bots[name].clickWindow(slot, button, 0).catch(() => {})
      const w = await opened
      await sleep(300)
      return w
    }
    const itemText = i => (i ? JSON.stringify(i) : '')
    // The car's armor stand nearest a spot (MTVehicles stands are invisible, not markers).
    const standNear = (name, pos, maxD = 0.8) => {
      let best = null
      for (const e of Object.values(bots[name].entities)) {
        if (e.name !== 'armor_stand') continue
        const d = e.position.distanceTo(pos)
        if (d <= maxD && (!best || d < best.d)) best = { e, d }
      }
      return best && best.e
    }
    const getOut = async name => {
      bots[name].setControlState('sneak', true)
      await sleep(600)
      bots[name].setControlState('sneak', false)
      await sleep(700)
    }
    const standPos = async (kind, plate) => {
      const m = (await cmd(`data get entity @e[type=armor_stand,name="MTVEHICLES_${kind}_${plate}",limit=1] Pos`)).match(/\[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/)
      return m ? new Vec3(+m[1], +m[2], +m[3]) : null
    }
    // Right-click (interact_at) a car stand, like a player getting in.
    const enter = async (name, kind, plate) => {
      const pos = await standPos(kind, plate)
      if (!pos) return false
      const e = standNear(name, pos)
      if (!e) return false
      try { await bots[name].lookAt(pos.offset(0, 1, 0), true) } catch (err) {}
      try { await bots[name].activateEntityAt(e, pos.offset(0, 1, 0)) } catch (err) {}
      await sleep(900)
      return true
    }

    // ---------- Setup ----------
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    await cmd(`dheist delete ${HID} confirm`)
    await cmd(`rg remove -w world heist_${HID}`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`dlevel reset ${name}`)
      await cmd(`eco set ${name} 100000`)
      // Leftover cars from an earlier run.
      await takeAll(name)
    }
    await cmd(`zzheisttp ${A} 1210.5 ${Y} 1210.5`)
    await cmd(`zzheisttp ${B} 1210.5 ${Y} 1214.5`)
    await sleep(2500)

    // ---------- The Car Dealer ----------
    let w = await (async () => { const o = windowOpen(bots[A]); await cmd(`dshop open ${A} cars`); const r = await o; await sleep(300); return r })()
    check('the Car Dealer lists the cars for sale (not the crate cars), drawn as cars', w && /Car Dealer/.test(JSON.stringify(w.title)) && w.slots[10] && w.slots[10].name === 'diamond_hoe' && /Sedan/.test(itemText(w.slots[10])) && !/Vandal/.test(JSON.stringify(w.slots)), `${JSON.stringify(w && w.title)} ${itemText(w && w.slots[10]).slice(0, 200)}`)
    w = await click(A, 10)
    let t = Date.now()
    await click(A, 10)
    await sleep(500)
    check('a car above your level is refused (Sedan: level 20)', /needs level 20/.test(text(A, t)) && (await bal(A)) === 100000, text(A, t))
    await closeAll(A)
    await cmd(`dlevel set ${A} 20`)
    await sleep(1500)
    w = await (async () => { const o = windowOpen(bots[A]); await cmd(`dshop open ${A} cars`); const r = await o; await sleep(300); return r })()
    w = await click(A, 10)
    t = Date.now()
    await click(A, 10)
    await sleep(500)
    const armed = /Click again/.test(text(A, t)) && (await bal(A)) === 100000
    bots[A].clickWindow(10, 0, 0).catch(() => {})
    await sleep(1200)
    let plate = await plateOf(A, 'sedan')
    plates.push(plate)
    const vin1 = Number(((await info(A)).match(/vin=(\d+)/) || [])[1])
    check('buying needs a second click, then: charged $40,000, the car is yours (an MTVehicles plate) with a serial number', armed && (await bal(A)) === 60000 && plate !== '' && /exists=yes owner=GarageA/.test(await car(plate)) && vin1 > 0, `armed=${armed} bal=${await bal(A)} ${await info(A)} ${await car(plate)}`)
    await closeAll(A)
    t = Date.now()
    w = await (async () => { const o = windowOpen(bots[A]); await cmd(`dshop open ${A} cars`); const r = await o; await sleep(300); return r })()
    await click(A, 10)
    await click(A, 11)
    bots[A].clickWindow(11, 0, 0).catch(() => {})
    await sleep(1200)
    const two = await platesOf(A)
    const vins = [...(await info(A)).matchAll(/vin=(\d+)/g)].map(m => Number(m[1]))
    check('several of a model now: a second Sedan (Gray) is its own car, plate and the next serial number', two.length === 2 && (await bal(A)) === 20000 && vins.length === 2 && vins[0] !== vins[1] && /=sedan\(Gray,/.test(await info(A)), `${await info(A)} bal=${await bal(A)} ${text(A, t)}`)
    // One Sedan from here on (the rest of the test calls "the" car).
    for (const p of two) if (p !== plate) { await cmd(`dgarage take ${A} ${p}`); await cmd(`zzcardelete ${p}`) }
    await cmd(`eco set ${A} 60000`)
    await closeAll(A)

    // ---------- The garage: calling it ----------
    await cmd(`minecraft:tp ${A} 1210.5 ${Y} 1210.5 -90 0`) // facing east: the car comes 3.5 blocks ahead
    await sleep(600)
    t = Date.now()
    const opened = windowOpen(bots[A])
    bots[A].chat('/garage')
    w = await opened
    await sleep(300)
    check('/garage lists your cars', w && /Your garage/.test(JSON.stringify(w.title)) && /Sedan/.test(itemText(w.slots[9])) && /In the garage/.test(itemText(w.slots[9])), itemText(w && w.slots[9]).slice(0, 300))
    bots[A].clickWindow(9, 0, 0).catch(() => {})
    await sleep(1500)
    check('left-click calls it next to you (a spawned MTVehicles car: 3 stands)', /Sedan is here/.test(text(A, t)) && (await stands(plate)) === 3 && /=sedan\(Red,.*,out,/.test(await info(A)), `${text(A, t)} ${await car(plate)} ${await info(A)}`)

    // ---------- Getting in ----------
    t = Date.now()
    await enter(B, 'MAIN', plate)
    check('someone else can\'t drive it (locked)', !/driver:|passenger:/.test(await seat(B)), `${await seat(B)} ${text(B, t)}`)
    await enter(A, 'MAIN', plate)
    const sa = await seat(A)
    check('the owner gets in: the driver\'s seat, and slot 9 is the car key', new RegExp(`driver:${plate}`).test(sa) && /slot8=carkey:/.test(sa), sa)
    const keyDump = await cmd(`zzdump ${A}`)
    const phoneMap = ((await cmd(`dphone status ${A}`)).match(/map=(\d+)/) || [])[1]
    const keyMap = ((await cmd(`data get entity ${A} Inventory[{Slot:8b}].components."minecraft:map_id"`)).match(/data: (\d+)/) || [])[1]
    check('...and the key is the phone\'s map underneath (holding it while driving shows the GPS view)', /8=filled map x1 \[carkey:/.test(keyDump) && phoneMap && keyMap === phoneMap, `${keyDump.slice(0, 200)} phone=${phoneMap} key=${keyMap}`)
    t = Date.now()
    await enter(B, 'SEAT2', plate)
    check('a passenger seat while it\'s locked: refused', !/passenger:/.test(await seat(B)), `${await seat(B)} ${text(B, t)}`)
    // The key: right-click to unlock.
    bots[A].setQuickBarSlot(8)
    await sleep(300)
    t = Date.now()
    bots[A].activateItem()
    await sleep(700)
    bots[A].deactivateItem()
    check('the key unlocks it', /locked=false/.test(await info(A)) && /Unlocked/.test(text(A, t)), `${await info(A)} ${text(A, t)}`)
    await enter(B, 'SEAT2', plate)
    check('unlocked: someone else can ride along as a passenger', new RegExp(`passenger:${plate}`).test(await seat(B)), await seat(B))
    await sleep(600)
    bots[A].activateItem()
    await sleep(700)
    bots[A].deactivateItem()
    check('...and locks it again', /locked=true/.test(await info(A)), await info(A))
    await getOut(B)
    await enter(B, 'SEAT2', plate)
    check('locked again: the passenger who got out can\'t get back in', !/passenger:/.test(await seat(B)), await seat(B))
    await getOut(A)
    await sleep(500)
    const out = await seat(A)
    check('getting out: the phone is back in slot 9', !/driver:/.test(out) && /slot8=phone/.test(out), out)

    // ---------- Stands can't be broken; /vehicle is staff only ----------
    const mainPos = await standPos('MAIN', plate)
    const target = mainPos && standNear(B, mainPos)
    for (let i = 0; i < 4 && target; i++) { bots[B].attack(target); await sleep(250) }
    await sleep(500)
    check('hitting a car doesn\'t break it (still 3 stands)', Boolean(target) && (await stands(plate)) === 3, `${Boolean(target)} ${await car(plate)}`)
    t = Date.now()
    bots[B].chat('/vehicle help')
    await sleep(800)
    check('/vehicle (MTVehicles\' own command) is staff only', /Your cars: \/garage/.test(text(B, t)), text(B, t))

    // ---------- No cars in heists ----------
    await cmd(`zzregion heist_${HID} 1205 ${Y - 1} 1212 1219 ${Y + 6} 1224`)
    await cmd(`dheist create ${HID} 1`)
    await cmd(`dheist set ${HID} level 0`)
    await cmd(`dheist exit ${HID} 1200.5 ${Y} 1205.5`)
    await cmd(`dheist snapshot ${HID}`)
    await cmd(`dheist enable ${HID}`)
    await until(async () => /state=open/.test(await cmd(`zzheist ${HID}`)), 10000)
    // A stands inside the heist, the car just outside it (within reach).
    await cmd(`zzheisttp ${A} 1214.5 ${Y} 1213.5`)
    await sleep(2000)
    t = Date.now()
    await enter(A, 'MAIN', plate)
    check('no getting into a car from inside a heist', !/driver:/.test(await seat(A)) && /No cars in heists/.test(text(A, t)), `${await seat(A)} ${text(A, t)} ${await cmd(`zzheist ${HID}`)}`)
    await cmd(`zzheisttp ${A} 1210.5 ${Y} 1210.5`)
    await sleep(1500)
    // Driving into it: MTVehicles' region event throws the driver out.
    await enter(A, 'MAIN', plate)
    const drove = new RegExp(`driver:${plate}`).test(await seat(A))
    await cmd(`zzcartp ${plate} 1212.5 ${Y} 1218.5`)
    await sleep(1500)
    check('a car that ends up in a heist: the driver is thrown out and the car towed to the garage', drove && !/driver:/.test(await seat(A)) && (await stands(plate)) === 0 && !/,out,/.test(await info(A)), `drove=${drove} ${await seat(A)} ${await car(plate)} ${await info(A)}`)
    await cmd(`zzcarinfo ${plate}`)

    // ---------- The chase radius doubles in a car ----------
    await cmd(`dgarage store ${A}`)
    await sleep(500)
    await cmd(`zzheisttp ${A} 1360.5 ${Y} 1225.5`) // 150 blocks from the heist
    await cmd(`fill 1355 ${Y - 1} 1220 1368 ${Y - 1} 1232 glass`)
    await cmd(`forceload add 1355 1220 1368 1232`)
    await sleep(1500)
    await cmd(`zzhunt ${A} ${HID}`)
    const onFoot = await cmd(`zzinrange ${A} ${HID}`)
    await cmd(`zzcarspawn ${plate} 1364.5 ${Y} 1225.5`)
    await cmd(`zzcarmount ${A} ${plate}`)
    await sleep(800)
    const inCar = await cmd(`zzinrange ${A} ${HID}`)
    check('150 blocks away: the cops lose you on foot (100), not in a car (200)', /INRANGE \S+ \S+ false/.test(onFoot) && /INRANGE \S+ \S+ true/.test(inCar) && /driver:/.test(inCar), `${onFoot} / ${inCar}`)
    await getOut(A)
    const stepped = await cmd(`zzinrange ${A} ${HID}`)
    check('...and getting out doesn\'t lose them: the doubled radius lasts for that chase', /INRANGE \S+ \S+ true/.test(stepped) && !/driver:/.test(stepped), stepped)
    await cmd(`zzhunt ${A} ${HID} release`)
    await cmd(`zzcardelete ${plate}`)
    await cmd(`dgarage take ${A} ${plate}`)
    await cmd(`forceload remove 1355 1220 1368 1232`)
    await cmd(`dgarage give ${A} sedan Red`)
    plate = await plateOf(A, 'sedan')
    plates.push(plate)
    await cmd(`zzheisttp ${A} 1210.5 ${Y} 1210.5`)
    await sleep(1500)

    // ---------- Safe zones by car (combat-tagged) ----------
    await cmd(`rg remove -w world safe_zgar`)
    await cmd(`zzregion safe_zgar 1225 ${Y - 1} 1193 1240 ${Y + 6} 1206`)
    await cmd(`rg flag -w world safe_zgar passthrough allow`)
    await cmd('zzcfgtime car::call-cooldown 1 second')
    await cmd(`minecraft:tp ${A} 1229.5 ${Y} 1199.5 -90 0`)
    await sleep(1500)
    let og = windowOpen(bots[A])
    bots[A].chat('/garage')
    await og
    await sleep(300)
    bots[A].clickWindow(9, 0, 0).catch(() => {})
    await sleep(1500)
    const inZone = (await stands(plate)) === 3
    await cmd(`zztag ${A}`)
    t = Date.now()
    await enter(A, 'MAIN', plate)
    check('combat-tagged: no getting into a car parked in a safe zone', inZone && !/driver:/.test(await seat(A)) && /in a safe zone while in combat/.test(text(A, t)), `${inZone} ${await seat(A)} ${text(A, t)}`)
    await cmd(`zzcombatend ${A}`)
    await enter(A, 'MAIN', plate)
    const seated = /driver:/.test(await seat(A))
    await cmd(`zztag ${A}`)
    const kicked = await until(async () => !/driver:|passenger:/.test(await seat(A)), 4000)
    check('...and someone who gets combat-tagged while sitting in a car in a safe zone is put out', seated && kicked, `${seated} ${kicked} ${await seat(A)}`)
    await cmd(`zzcombatend ${A}`)
    // A stray copy (like one left in a chunk that was unloaded when the car was sent back) is swept away;
    // the real car stays.
    await cmd(`zzcarspawn ${plate} 1212.5 ${Y} 1200.5`)
    await sleep(500)
    const twice = await stands(plate)
    const swept = await until(async () => (await stands(plate)) === 3, 15000)
    check('a stray copy of a car is removed by the sweep, the car itself stays out', twice === 6 && swept && /,out,/.test(await info(A)), `${twice} ${await car(plate)} ${await info(A)}`)
    await cmd(`dgarage store ${A}`)
    await cmd(`rg remove -w world safe_zgar`)
    await sleep(500)

    // ---------- Cleanup: idle, and logging out ----------
    await cmd('zzcfgtime car::idle-despawn 3 seconds')
    await cmd('zzcfgtime car::call-cooldown 1 second')
    await cmd(`minecraft:tp ${A} 1210.5 ${Y} 1210.5 -90 0`)
    await sleep(500)
    let o2 = windowOpen(bots[A])
    bots[A].chat('/garage')
    await o2
    await sleep(300)
    bots[A].clickWindow(9, 0, 0).catch(() => {})
    await sleep(1500)
    const wasOut = (await stands(plate)) === 3
    // A parked car waits while its owner is within car::idle-near (citygarage.sk's rule): walk away first.
    await cmd(`minecraft:tp ${A} ${FAR}`)
    t = Date.now()
    const gone = await until(async () => (await stands(plate)) === 0 && !/,out,/.test(await info(A)), 25000)
    check('a car nobody uses goes back to the garage by itself (idle, once its owner is away), and its owner is told', wasOut && gone && /stood unused/.test(text(A, t)), `${wasOut} ${gone} ${text(A, t)} ${await info(A)}`)
    await cmd(`minecraft:tp ${A} 1210.5 ${Y} 1210.5 -90 0`)
    await sleep(800)
    await cmd('zzcfgtime car::idle-despawn 5 minutes')
    await sleep(1200)
    o2 = windowOpen(bots[A])
    bots[A].chat('/garage')
    await o2
    await sleep(300)
    bots[A].clickWindow(9, 0, 0).catch(() => {})
    await sleep(1500)
    const out2 = (await stands(plate)) === 3
    await quit(bots[A])
    await sleep(1500)
    check('the owner logs out: the car goes back to the garage', out2 && (await stands(plate)) === 0 && !/,out,/.test(await cmd(`dgarage info ${A}`)), `${out2} ${await car(plate)} ${await cmd(`dgarage info ${A}`)}`)
    bots[A] = await join(A)
    await cmd(`zzheisttp ${A} 1210.5 ${Y} 1210.5`)
    await sleep(2500)

    // ---------- Repainting ----------
    const vinOfPlate = Number(((await info(A)).match(/vin=(\d+)/) || [])[1])
    o2 = windowOpen(bots[A])
    bots[A].chat('/garage')
    await o2
    await sleep(300)
    w = await click(A, 9, 1) // right-click: the options
    w = await click(A, 12) // repaint
    t = Date.now()
    const before = await bal(A)
    await click(A, 11) // Gray: arms the confirm
    bots[A].clickWindow(11, 0, 0).catch(() => {})
    await sleep(1500)
    const newPlate = await plateOf(A, 'sedan')
    plates.push(newPlate)
    const vinAfter = Number(((await info(A)).match(/vin=(\d+)/) || [])[1])
    check('repainting: $2,500, a new plate in the new color, the old car deleted, the same serial number', newPlate !== '' && newPlate !== plate && /\(Gray,/.test(await info(A)) && before - (await bal(A)) === 2500 && /none/.test(await car(plate)) && vinAfter === vinOfPlate, `${text(A, t)} ${await info(A)} ${before}->${await bal(A)} old=${await car(plate)}`)
    await closeAll(A)

    // ---------- Crate cars ----------
    const g1 = await cmd(`zzcrategrant ${A} legendary 1|car|vandal|Vandal`)
    const vplate = await plateOf(A, 'vandal')
    plates.push(vplate)
    const g2 = await cmd(`zzcrategrant ${A} legendary 1|car|vandal|Vandal`)
    const vandals = [...(await info(A)).matchAll(/([A-Z0-9-]+)=vandal\([^)]*serial=(\d+)/g)]
    for (const m of vandals) plates.push(m[1])
    check('a crate car lands in your garage, locked as it came and numbered of its kind; a second one is another Vandal with the next number', /Vandal/.test(g1) && /garage/.test(g1) && vplate !== '' && vandals.length === 2 && Number(vandals[1][2]) === Number(vandals[0][2]) + 1 && /built=true/.test(await info(A)), `${g1} / ${g2} ${await info(A)}`)
    // A full garage pays the repeat value instead.
    await cmd(`zzcfgset car::garage-max 3`)
    const b1 = await bal(A)
    const g3 = await cmd(`zzcrategrant ${A} legendary 1|car|vandal|Vandal`)
    check('...with a full garage (the most cars one may own) the crate pays the Legendary repeat value ($5,000) instead', /no room in your garage/.test(g3) && (await bal(A)) - b1 === 5000 && (await platesOf(A)).length === 3, `${g3} ${await info(A)}`)
    await cmd('zzcfgreload')
    check('crate cars roll now (Legendary 1000 with its car)', /total=1000/.test(await cmd('zzcrateroll legendary 1')), await cmd('zzcrateroll legendary 1'))

    // ---------- Levels list the cars; staff only ----------
    t = Date.now()
    bots[A].chat('/levels')
    await sleep(800)
    check('/levels lists the cars each level unlocks', /the Sedan \(car\)/.test(text(A, t)) && /the SUV \(car\)/.test(text(A, t)), text(A, t).slice(0, 500))
    t = Date.now()
    bots[B].chat('/dgarage info GarageB')
    await sleep(800)
    check('/dgarage is staff only', /Staff only/.test(text(B, t)), text(B, t))
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    for (const p of plates) if (p) await rcon.cmd(`zzcardelete ${p}`).catch(() => {})
    for (const name of [A, B]) {
      for (const m of [...((await rcon.cmd(`dgarage info ${name}`).catch(() => '')) || '').matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)]) await rcon.cmd(`dgarage take ${name} ${m[1]}`).catch(() => {})
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    await rcon.cmd(`dheist delete ${HID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${HID}`).catch(() => {})
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`fill 1355 ${Y - 1} 1220 1368 ${Y - 1} 1232 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
