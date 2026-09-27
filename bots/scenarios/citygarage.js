// citygarage.sk: the City Garage, stage 1 (owner, 2026-09-27). Staff lay out a site (a safe_garage_ region with exit
// and return spots, a garage POI); away from a garage /garage shows the cars and a Find button (the GPS leads there)
// and a car's click leads the GPS instead of calling it; at the site a car comes out in a free exit lane (a second
// one finds the lane full), goes back if nobody gets in (pickup-idle), and parks when driven into a return lane;
// Valet (Legend) calls a car anywhere; repaints only at a garage; no locking inside; a parked car waits while its
// owner is near and goes back once they're far. Without any site the old rule stays (garage.js).
const { Vec3 } = require('vec3')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'CgA'
const B = 'CgB'
const Y = 200
const CHUNKS = '1495 1495 1575 1565'
const SITE = 'zt'
const EXIT = [1508.5, Y, 1508.5]
const RET = [1508.5, Y, 1502.5]
const INSIDE = [1504.5, Y, 1513.5]
const AWAY = [1545.5, Y, 1545.5]
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  let poi = ''
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const windowOpen = bot => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const itemText = i => (i ? JSON.stringify(i) : '')
    const openGarage = async name => { const o = windowOpen(bots[name]); bots[name].chat('/garage'); const w = await o; await sleep(300); return w }
    const close = name => { if (bots[name].currentWindow) bots[name].closeWindow(bots[name].currentWindow) }
    const click = async (name, s, button = 0) => { if (bots[name].currentWindow) await bots[name].clickWindow(s, button, 0).catch(() => {}); await sleep(700) }
    const plateOf = async name => ((await cmd(`dgarage info ${name}`)).match(/sedan=([A-Z0-9-]+)\(/) || [])[1] || ''
    const stateOf = async name => ((await cmd(`dgarage info ${name}`)).match(/sedan=[A-Z0-9-]+\([^,]*,(\w+)/) || [])[1] || ''
    const standPos = async plate => {
      const m = (await cmd(`data get entity @e[type=armor_stand,name="MTVEHICLES_MAIN_${plate}",limit=1] Pos`)).match(/\[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/)
      return m ? new Vec3(+m[1], +m[2], +m[3]) : null
    }
    const tp = async (name, at, yaw = 0) => { await cmd(`minecraft:tp ${name} ${at[0]} ${at[1]} ${at[2]} ${yaw} 0`); await sleep(700) }

    // ---------- Setup: a site with one exit and one return, a garage POI ----------
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 1495 ${Y} 1495 1575 ${Y + 5} 1565 air`)
    await cmd(`fill 1495 ${Y - 1} 1495 1575 ${Y - 1} 1565 glass`)
    await cmd(`rg remove -w world safe_garage_${SITE}`)
    await cmd(`zzregion safe_garage_${SITE} 1500 195 1497 1516 210 1518`)
    await cmd(`rg flag -w world safe_garage_${SITE} passthrough allow`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`dlevel set ${name} 2`)
      await cmd(`eco set ${name} 100000`)
      await cmd(`dgarage take ${name} sedan`)
      await cmd(`dgarage give ${name} sedan`)
      await cmd(`dranks give ${name} none`)
    }
    await cmd(`lp user ${A} permission set donating.staff true`)
    await sleep(1500)
    let t = Date.now()
    await tp(A, AWAY)
    bots[A].chat('/dgaragesite exit add')
    await sleep(600)
    const outside = text(A, t)
    await tp(A, EXIT, -90)
    bots[A].chat('/dgaragesite exit add')
    await sleep(800)
    await tp(A, RET, 180)
    bots[A].chat('/dgaragesite return add')
    await sleep(800)
    await tp(A, INSIDE)
    t = Date.now()
    bots[A].chat('/dpoi add garage Test Garage')
    await sleep(800)
    poi = (text(A, t).match(/POI (\d+) garage/) || [])[1] || ''
    await cmd(`lp user ${A} permission unset donating.staff`)
    const list = await cmd('dgaragesite list')
    check('staff lay out a site: an exit and a return inside the safe_garage_ region (refused outside), and a garage POI', /stand inside/.test(outside) && new RegExp(`GSITE ${SITE} exit \\d+ = 1508\\.5\\|200\\|1508\\.5\\|`).test(list) && new RegExp(`GSITE ${SITE} return \\d+`).test(list) && poi !== '', `${outside} | ${list} | poi=${poi}`)
    await cmd(`dranks give ${B} legend`)
    await sleep(2000)

    // ---------- Away from a garage ----------
    await tp(A, AWAY)
    let w = await openGarage(A)
    const status = itemText(w && w.slots[4])
    const carLore = itemText(w && w.slots[9])
    await click(A, 9)
    const pin = await cmd(`dphone gps ${A}`)
    check('away from a garage: "Find a garage" (the nearest, its distance), and a car\'s click leads the GPS there (no car comes)', /Find a garage/.test(status) && /Test Garage/.test(status) && /GPS leads you to a garage/.test(carLore) && /active=pin/.test(pin) && /label=Test_Garage/.test(pin) && (await stateOf(A)) === 'garage', `${status.slice(0, 200)} | ${pin} | ${await stateOf(A)}`)
    close(A)
    bots[A].chat('/gps clear')
    await sleep(500)

    // ---------- At the garage: the exit lane ----------
    await tp(A, INSIDE)
    await tp(B, [INSIDE[0] + 2, Y, INSIDE[2]])
    t = Date.now()
    w = await openGarage(A)
    const here = itemText(w && w.slots[4])
    await click(A, 9)
    close(A)
    await sleep(800)
    const plateA = await plateOf(A)
    const at = await standPos(plateA)
    check('at the garage a car comes out in the exit lane ("waiting in the exit lane")', /Garage/.test(here) && at && at.distanceTo(new Vec3(EXIT[0], Y, EXIT[2])) < 1.5 && /waiting in the exit lane/.test(text(A, t)), `${here.slice(0, 150)} | ${at} | ${text(A, t).slice(0, 200)}`)
    t = Date.now()
    w = await openGarage(B)
    await click(B, 9)
    close(B)
    await sleep(600)
    check('...a second car finds the lane taken ("The exit lane is full")', /exit lane is full/.test(text(B, t)) && (await stateOf(B)) === 'garage', `${text(B, t).slice(0, 200)} | ${await stateOf(B)}`)
    // No locking inside a garage (a car spawn area): unlocking works, locking again doesn't.
    w = await openGarage(A)
    await click(A, 9, 1)
    await click(A, 11)
    t = Date.now()
    await click(A, 11)
    close(A)
    check('no locking cars inside a garage', /can't lock cars here/.test(text(A, t)), text(A, t).slice(0, 200))
    // Nobody gets in: it goes back and frees the lane.
    await cmd('zzcfgtime garage::pickup-idle 2 seconds')
    t = Date.now()
    await until(async () => (await stateOf(A)) === 'garage', 14000)
    check('a car nobody gets into goes back to the garage (pickup-idle) and frees the lane', (await stateOf(A)) === 'garage' && /Nobody picked up your Sedan/.test(text(A, t)), `${await stateOf(A)} | ${text(A, t).slice(0, 200)}`)
    await cmd('zzcfgreload')
    await sleep(5500) // the take-out cooldown
    t = Date.now()
    w = await openGarage(B)
    await click(B, 9)
    close(B)
    await sleep(800)
    check('...then the next car comes out there', (await stateOf(B)) === 'out' && /waiting in the exit lane/.test(text(B, t)), `${await stateOf(B)} | ${text(B, t).slice(0, 200)}`)

    // ---------- The return lane ----------
    const plateB = await plateOf(B)
    await cmd(`zzcarmount ${B} ${plateB}`)
    await sleep(500)
    const seated = await cmd(`zzcarseat ${B}`)
    await cmd('zzcfgset garage::return-radius 8')
    t = Date.now()
    await until(async () => (await stateOf(B)) === 'garage', 4000)
    await cmd('zzcfgreload')
    check('driving into a return lane parks the car (PARKED; back in the garage, the driver out)', /driver:/.test(seated) && (await stateOf(B)) === 'garage' && /PARKED/.test(text(B, t)) && !/driver:/.test(await cmd(`zzcarseat ${B}`)), `${seated} | ${await stateOf(B)} | ${text(B, t).slice(0, 200)}`)

    // ---------- Valet (Legend): anywhere ----------
    await tp(B, AWAY, -90)
    await sleep(22000) // the Valet call cooldown (20 s) since B's last call
    w = await openGarage(B)
    const valet = itemText(w && w.slots[4])
    t = Date.now()
    await click(B, 9)
    close(B)
    await sleep(800)
    const atB = await standPos(plateB)
    check('Valet (Elite, Legend): the car comes to you anywhere', /Valet/.test(valet) && (await stateOf(B)) === 'out' && atB && atB.distanceTo(bots[B].entity.position) < 6, `${valet.slice(0, 120)} | ${await stateOf(B)} | ${atB} | ${text(B, t).slice(0, 200)}`)
    // A parked car waits while its owner is near, and goes back once they're far.
    await cmd('zzcfgtime car::idle-despawn 2 seconds')
    await sleep(11000)
    const waited = await stateOf(B)
    await cmd(`minecraft:tp ${B} ${FAR}`)
    t = Date.now()
    await until(async () => (await stateOf(B)) === 'garage', 14000)
    await cmd('zzcfgreload')
    check('a parked car waits while its owner is near it, and goes back once they\'re far', waited === 'out' && (await stateOf(B)) === 'garage' && /stood unused/.test(text(B, t)), `${waited} -> ${await stateOf(B)} | ${text(B, t).slice(0, 200)}`)

    // ---------- Repaints only at a garage ----------
    await tp(A, AWAY)
    w = await openGarage(A)
    await click(A, 9, 1)
    await click(A, 13)
    t = Date.now()
    await click(A, 11)
    close(A)
    const pin2 = await cmd(`dphone gps ${A}`)
    check('repaints only at a garage (the GPS leads there)', /Repaint at a garage/.test(text(A, t)) && /label=Test_Garage/.test(pin2), `${text(A, t).slice(0, 200)} | ${pin2}`)
  } finally {
    for (const name of [A, B]) {
      await rcon.cmd(`dgarage take ${name} sedan`).catch(() => {})
      await rcon.cmd(`dranks give ${name} none`).catch(() => {})
      await rcon.cmd(`lp user ${name} permission unset donating.staff`).catch(() => {})
      await rcon.cmd(`dphone gps ${name} clear`).catch(() => {})
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
    }
    const list = await rcon.cmd('dgaragesite list').catch(() => '')
    for (const m of String(list).matchAll(new RegExp(`GSITE ${SITE} (exit|return) (\\d+)`, 'g'))) await rcon.cmd(`dgaragesite remove ${SITE} ${m[1]} ${m[2]}`).catch(() => {})
    if (poi) await rcon.cmd(`dpoi remove ${poi}`).catch(() => {})
    await rcon.cmd(`rg remove -w world safe_garage_${SITE}`).catch(() => {})
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill 1495 ${Y - 1} 1495 1575 ${Y + 5} 1565 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    await rcon.cmd('zzcfgreload').catch(() => {})
    rcon.close()
  }
}
