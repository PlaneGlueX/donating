// Out of a car that sank (DonatingPhone CarSmooth.seaRescue; PLAYTEST 172: a car driven into deep water sinks with its
// riders in it, and the driver drowned unless they sneaked out). A bot drives a Sedan off a platform into a 4-deep
// pool and keeps the pedal down at the bottom: once its head is under water and its air below carsmooth.water-air
// (100 of 300) it's put out of the car, alive, and the server log says why; not before (driving through water is
// allowed: it's still in the car while its air is above that).
const fs = require('fs')
const path = require('path')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const D = 'WaterD'
const Y = 200
const X0 = 7600, X1 = 7640, Z0 = 7600, Z1 = 7612
const CHUNKS = `${X0} ${Z0} ${X1} ${Z1}`
const LOG = path.join(__dirname, '..', '..', 'server', 'logs', 'latest.log')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null, plate = null
  try {
    await cmd(`forceload add ${CHUNKS}`)
    // A platform x 7600-7624 at y 199, then a pool x 7625-7635 (stone walls and floor, water y 196-199).
    await cmd(`fill ${X0} ${Y - 1} ${Z0} ${X1} ${Y + 3} ${Z1} air`)
    await cmd(`fill ${X0} ${Y - 1} ${Z0} 7624 ${Y - 1} ${Z1} gray_concrete`)
    await cmd(`fill 7624 ${Y - 6} ${Z0} 7636 ${Y - 1} ${Z1} stone`)
    await cmd(`fill 7625 ${Y - 5} ${Z0 + 1} 7635 ${Y - 1} ${Z1 - 1} water`)
    bot = await join(D)
    await cmd(`gamemode survival ${D}`)
    await cmd(`zzclear ${D}`)
    await cmd(`zzcombatend ${D}`)
    await cmd(`tag ${D} add donating_carcam_off`)
    for (const m of [...String(await cmd(`dgarage info ${D}`)).matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)]) await cmd(`dgarage take ${D} ${m[1]}`)
    await cmd(`dlevel set ${D} 150`)
    const gave = await cmd(`dgarage give ${D} sedan Red`)
    plate = (gave.match(/: ([A-Z0-9-]+) vin=/) || [])[1]
    if (!plate) throw new Error(`no car: ${gave}`)
    await cmd(`zzcarspawn ${plate} 7612.5 ${Y} 7606.5`)
    await sleep(500)
    await cmd(`zzheisttp ${D} 7610.5 ${Y} 7606.5`)
    await cmd(`zzcarmount ${D} ${plate}`)
    await sleep(400)
    await cmd(`execute as @e[type=armor_stand,name=MTVEHICLES_MAIN_${plate}] at @s run minecraft:tp @s ~ ~ ~ -90 0`)
    await sleep(400)
    const seat0 = await cmd(`zzcarseat ${D}`)
    check('the bot drives the car (east, towards the pool)', seat0.includes(`driver:${plate}`), seat0)
    const keys = k => bot._client.write('player_input', { inputs: { forward: k.includes('w'), backward: false, left: false, right: false, jump: false, shift: false, sprint: false } })
    const air = async () => Number(((await cmd(`data get entity ${D} Air`)).match(/data: (-?\d+)s/) || [])[1])
    const logBefore = fs.readFileSync(LOG, 'utf8').length
    keys('w')
    // Into the water, down to the bottom, pedal held: in the car while the air lasts, out once it's below 100.
    let sawUnder = false, inWhileAir = false, outAt = -1, airAtOut = NaN
    for (let i = 0; i < 60; i++) {
      await sleep(500)
      const a = await air()
      const s = await cmd(`zzcarseat ${D}`)
      const riding = s.includes(`riding=${plate}`)
      if (a < 290) sawUnder = true
      if (riding && a >= 100 && a < 250) inWhileAir = true
      if (!riding && sawUnder) { outAt = i; airAtOut = a; break }
    }
    keys('')
    const dead = (await cmd(`data get entity ${D} Health`)).match(/data: ([\d.]+)f/)
    const log = fs.readFileSync(LOG, 'utf8').slice(logBefore)
    check('under water in the car, the bot stays in while it still has air (driving through water is allowed)', sawUnder && inWhileAir, `under=${sawUnder} inWhileAir=${inWhileAir}`)
    check('once its air is below 100 it is put out of the car, alive', outAt >= 0 && airAtOut < 100 && dead && Number(dead[1]) > 0, `outAt=${outAt} air=${airAtOut} health=${dead && dead[1]}`)
    check('the server log names it (carsmooth: ... was under water in MTVEHICLES_MAINSEAT_<plate>)', log.includes(`${D} was under water in MTVEHICLES_MAINSEAT_${plate}`), log.split('\n').filter(l => l.includes('under water')).join(' | ').slice(0, 300))
  } finally {
    if (bot) { try { bot._client.write('player_input', { inputs: { forward: false, backward: false, left: false, right: false, jump: false, shift: false, sprint: false } }) } catch (e) { } }
    await cmd(`minecraft:ride ${D} dismount`).catch(() => {})
    if (plate) { await cmd(`dgarage take ${D} ${plate}`).catch(() => {}); await cmd(`zzcardelete ${plate}`).catch(() => {}) }
    await cmd(`tag ${D} remove donating_carcam_off`).catch(() => {})
    await cmd(`dlevel reset ${D}`).catch(() => {})
    await cmd(`zzheisttp ${D} 0.5 68 -656.5`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    await cmd(`fill 7624 ${Y - 6} ${Z0} 7636 ${Y + 3} ${Z1} air`).catch(() => {})
    await cmd(`fill ${X0} ${Y - 1} ${Z0} 7624 ${Y - 1} ${Z1} air`).catch(() => {})
    await cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
