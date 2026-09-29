// The car expansion (garage.sk, crates.sk, DonatingPhone CarStats; owner, 2026-09-28: extreme cars $1M+, wraps and mods,
// serial numbers for rarity, car crates, the value order base < bad wrap < bad wrap + mods = good wrap < ... ). Several
// cars of a model, each with its own serial number; grades; the tuning shop (dealer cars only: crate builds and extreme
// cars refuse); mods reaching MTVehicles when the owner drives; a car above your level stays in the garage; the car
// crates at a stand (a whole car, locked, numbered of its kind; a full garage refused before the key is used; big pulls
// announced).
const { Vec3 } = require('vec3')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'CarsA'
const B = 'CarsB'
const Y = 200
const CHUNKS = '4000 4000 4040 4030'
const PLATFORM = `4000 ${Y - 1} 4000 4040 ${Y - 1} 4030`
const SAFE = 'safe_cars_test'
const STAND = [4010, Y, 4020]

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const info = async name => cmd(`dgarage info ${name}`)
    const cars = async name => [...(await info(name)).matchAll(/([A-Z0-9-]+)=([a-z]+)\(([^)]*)\)/g)].map(m => ({ plate: m[1], model: m[2], f: Object.fromEntries(m[3].split(',').map(x => x.split('=')).filter(x => x.length === 2)), raw: m[3] }))
    const takeAll = async name => { for (const c of await cars(name)) await cmd(`dgarage take ${name} ${c.plate}`) }
    const windowOpen = bot => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const itemText = i => (i ? JSON.stringify(i) : '')
    const closeAll = async name => { if (bots[name].currentWindow) { bots[name].closeWindow(bots[name].currentWindow); await sleep(300) } }
    const click = async (name, slot, button = 0) => {
      const opened = windowOpen(bots[name])
      bots[name].clickWindow(slot, button, 0).catch(() => {})
      const w = await opened
      await sleep(300)
      return w
    }
    const garage = async name => { await closeAll(name); const o = windowOpen(bots[name]); bots[name].chat('/garage'); const w = await o; await sleep(300); return w }
    // The garage is a phone page (ui.sk): cars on the screen's 20 slots (columns 2-6 of rows 1-4).
    const SCREEN = [11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 29, 30, 31, 32, 33, 38, 39, 40, 41, 42]
    const slotOfPlate = (w, plate) => (w ? w.slots.findIndex((i, n) => SCREEN.includes(n) && i && itemText(i).includes(plate)) : -1)
    const keys = async (name, crate) => Number(((await cmd(`dcrate info ${name}`)).match(new RegExp(`${crate}=(\\d+)`)) || [])[1] || 0)

    // ---------- Setup ----------
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    await cmd(`setblock ${STAND.join(' ')} ender_chest`)
    await cmd(`rg remove -w world ${SAFE}`)
    await cmd(`zzregion ${SAFE} 4000 195 4000 4040 210 4030`)
    await cmd(`rg flag -w world ${SAFE} passthrough allow`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcratereset ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`dlevel reset ${name}`)
      await cmd(`eco set ${name} 1000000`)
      await takeAll(name)
    }
    await cmd(`dlevel set ${A} 150`)
    await cmd(`zzheisttp ${A} 4005.5 ${Y} 4005.5`)
    await cmd(`zzheisttp ${B} 4008.5 ${Y} 4005.5`)
    await sleep(2500)

    // ---------- Several of a model, serial numbers ----------
    await cmd(`dgarage give ${A} sedan Red`)
    await cmd(`dgarage give ${A} sedan Gray`)
    let cs = await cars(A)
    const sedans = cs.filter(c => c.model === 'sedan')
    check('two Sedans are two cars: two plates, two serial numbers, both Stock (grade 0)', sedans.length === 2 && sedans[0].plate !== sedans[1].plate && sedans[0].f.vin !== sedans[1].f.vin && sedans.every(c => c.f.grade === '0' && c.f.built === 'false'), await info(A))

    // ---------- The tuning shop ----------
    let w = await garage(A)
    const red = sedans.find(c => c.f && /Red/.test(c.raw)) || sedans[0]
    let s = slotOfPlate(w, red.plate)
    await click(A, s, 1) // options
    w = await click(A, 13) // tune
    const engineLore = itemText(w && w.slots[11])
    const before = await bal(A)
    let t = Date.now()
    // The first click arms it: the page comes back with that button as a green "Confirm purchase?" block.
    const armedW = await click(A, 11)
    const armedIcon = armedW && armedW.slots[11]
    const armed = Boolean(armedIcon) && armedIcon.name === 'lime_concrete' && /Confirm purchase/.test(itemText(armedIcon)) && /Engine I/.test(itemText(armedIcon)) && /5,000/.test(itemText(armedIcon)) && (await bal(A)) === before
    bots[A].clickWindow(11, 0, 0).catch(() => {})
    await sleep(900)
    cs = await cars(A)
    const tuned = cs.find(c => c.plate === red.plate)
    check('the tuning shop: Engine I for a Sedan costs $5,000 (8% of $40,000, at least $5,000), the first click arms a "Confirm purchase?" block, a second click fits it, the grade becomes Custom', /Engine I/.test(engineLore) && /5,000/.test(engineLore) && armed && before - (await bal(A)) === 5000 && tuned && tuned.f.mods === '100' && tuned.f.grade === '1', `${engineLore.slice(0, 200)} armed=${armed} ${itemText(armedIcon).slice(0, 200)} ${before}->${await bal(A)} ${tuned && tuned.raw}`)
    await closeAll(A)

    // ---------- Crate builds and extreme cars can't be tuned; a wrap makes the grade ----------
    await cmd(`dgarage build ${A} sports|Orange|hacker|2|0|0|cyan|-`)
    await cmd(`dgarage give ${A} apex Black`)
    cs = await cars(A)
    const mythic = cs.find(c => c.model === 'sports')
    const apex = cs.find(c => c.model === 'apex')
    check('a crate build with an Exotic wrap and mods is Mythic (grade 4), locked, #1 of its kind (Sports Car + H4CK3R)', mythic && mythic.f.grade === '4' && mythic.f.built === 'true' && mythic.f.wrap === 'hacker' && Number(mythic.f.serial) >= 1, mythic && mythic.raw)
    w = await garage(A)
    await click(A, slotOfPlate(w, mythic.plate), 1)
    const lockedTune = itemText(bots[A].currentWindow && bots[A].currentWindow.slots[13])
    const lockedPaint = itemText(bots[A].currentWindow && bots[A].currentWindow.slots[12])
    await closeAll(A)
    w = await garage(A)
    await click(A, slotOfPlate(w, apex.plate), 1)
    const extremeTune = itemText(bots[A].currentWindow && bots[A].currentWindow.slots[13])
    await closeAll(A)
    check('a crate car can\'t be tuned or repainted; an extreme car can\'t be tuned', /stay as they came/.test(lockedTune) && /keep their paint/.test(lockedPaint) && /Extreme cars can't be tuned/.test(extremeTune), `${lockedTune.slice(-200)} | ${lockedPaint.slice(-200)} | ${extremeTune.slice(-200)}`)

    // ---------- Mods reach MTVehicles when the owner drives ----------
    await cmd(`zzcarspawn ${red.plate} 4015.5 ${Y} 4005.5`)
    await cmd(`zzcarmount ${A} ${red.plate}`)
    await sleep(600)
    const statTuned = await cmd(`dphone carstat ${red.plate}`)
    const blue = sedans.find(c => c.plate !== red.plate)
    await cmd(`zzcarspawn ${blue.plate} 4015.5 ${Y} 4012.5`)
    await cmd(`zzcarmount ${B} ${blue.plate}`) // not B's: only the stats matter here (a stock car keeps MTVehicles' own)
    await sleep(300)
    const statStock = await cmd(`dphone carstat ${blue.plate}`)
    const maxOf = r => Number((r.match(/max=([\d.]+)/) || [])[1])
    check('driving the tuned Sedan: MTVehicles\' top speed for its plate is 0.65 x 1.05 = 0.6825 (engine I); a stock one\'s isn\'t changed', Math.abs(maxOf(statTuned) - 0.6825) < 0.0005 && !(Math.abs(maxOf(statStock) - 0.6825) < 0.0005), `${statTuned} | ${statStock}`)
    await cmd(`dgarage store ${A}`)
    await cmd(`zzcardelete ${blue.plate}`).catch(() => {})
    await sleep(500)

    // ---------- A car above your level waits in the garage ----------
    await cmd(`dgarage give ${B} apex Red`)
    await cmd(`zzheisttp ${B} 4008.5 ${Y} 4005.5`)
    await sleep(800)
    w = await garage(B)
    const bApex = (await cars(B)).find(c => c.model === 'apex')
    const lore = itemText(w && w.slots[slotOfPlate(w, bApex.plate)])
    t = Date.now()
    bots[B].clickWindow(slotOfPlate(w, bApex.plate), 0, 0).catch(() => {})
    await sleep(1200)
    check('a level-0 player\'s Apex stays in the garage ("needs level 150 to drive")', /Needs level 150 to drive/.test(lore) && /needs level 150/.test(text(B, t)) && !/,out,/.test(await info(B)), `${lore.slice(-300)} | ${text(B, t)}`)
    await closeAll(B)

    // ---------- Car crates at a stand ----------
    // The stand: the bot looks at the block and places it (in game only; the store permission for a moment).
    await cmd(`lp user ${A} permission set donating.store true`)
    await cmd(`minecraft:tp ${A} ${STAND[0] + 0.5} ${Y} ${STAND[2] - 2.5} 0 20`)
    await sleep(1200)
    await bots[A].lookAt(new Vec3(STAND[0] + 0.5, STAND[1] + 0.5, STAND[2] + 0.5), true)
    await sleep(300)
    bots[A].chat('/dcrate remove')
    await sleep(400)
    bots[A].chat('/dcrate place supercar')
    await sleep(900)
    await cmd(`lp user ${A} permission unset donating.store`)
    await cmd(`zzcarpool ztest 1000|apex 1000|3 1000|3 1 1`)
    await cmd(`zzcratelines supercar 1000|carroll|ztest`)
    await cmd(`zzdata ${A} keys::supercar 2`) // car crate keys are never given by command (game money only)
    const count0 = (await cars(A)).length
    await cmd(`zzheisttp ${A} 4010.5 ${Y} 4017.5`)
    await sleep(1000)
    await closeAll(A)
    const so = windowOpen(bots[A])
    try { await bots[A].activateBlock(bots[A].blockAt(new Vec3(...STAND))) } catch (e) {}
    const sw = await so
    await sleep(300)
    t = Date.now()
    const tB = Date.now()
    const spin = windowOpen(bots[A]) // the preview is a phone page (ui.sk): Open one is slot 4
    bots[A].clickWindow(4, 0, 0).catch(() => {})
    await spin
    const end = Date.now() + 9000
    while (Date.now() < end && !/you got/.test(text(A, t))) await sleep(300)
    await sleep(500)
    await closeAll(A)
    cs = await cars(A)
    const won = cs.filter(c => c.model === 'apex' && c.f.built === 'true')
    check('a Supercar key at its stand: a whole car rolled (here a test pool: an Apex with an Exotic wrap and stage III mods), locked, numbered, in the garage; the key used', Boolean(sw) && cs.length === count0 + 1 && won.length === 1 && won[0].f.grade === '4' && won[0].f.mods === '333' && Number(won[0].f.serial) >= 1 && (await keys(A, 'supercar')) === 1, `${text(A, t).slice(0, 300)} | ${await info(A)} keys=${await keys(A, 'supercar')}`)
    check('...and a Mythic pull is announced to everyone', /unboxed .*Apex.* from a Supercar Crate/.test(text(B, tB)), text(B, tB).slice(0, 300))
    // A full garage: refused before the key is used.
    await cmd(`zzcfgset car::garage-max ${cs.length}`)
    await closeAll(A)
    const so2 = windowOpen(bots[A])
    await sleep(400)
    try { await bots[A].activateBlock(bots[A].blockAt(new Vec3(...STAND))) } catch (e) {}
    await so2
    await sleep(300)
    t = Date.now()
    bots[A].clickWindow(4, 0, 0).catch(() => {})
    await sleep(1200)
    check('with a full garage the car crate refuses before the spin, and the key is safe', /garage is full/.test(text(A, t)) && (await keys(A, 'supercar')) === 1 && (await cars(A)).length === cs.length, `${text(A, t)} keys=${await keys(A, 'supercar')}`)
    await cmd('zzcfgreload')
    await closeAll(A)

    // ---------- Out of the water (owner, 2026-09-28: "make cars able to climb land 1 block tall") ----------
    // A pool 2 deep whose shore is one block above the water: the car sits on the bottom, 3 blocks below where it can
    // stand. MTVehicles never runs its drive-up check in water; garage.sk lifts a car whose driver holds forward
    // (zzcarclimb runs that check as if they did: bots can't hold a car's keys).
    await cmd(`fill 4025 ${Y} 4002 4038 ${Y + 2} 4014 stone`)
    await cmd(`fill 4025 ${Y + 3} 4002 4038 ${Y + 6} 4014 air`)
    await cmd(`fill 4026 ${Y} 4003 4031 ${Y + 1} 4011 water`)
    await cmd(`fill 4026 ${Y + 2} 4003 4031 ${Y + 2} 4011 air`)
    const gave = await cmd(`dgarage give ${A} sedan Red`)
    const wet = (gave.match(/: ([A-Z0-9-]+) vin=/) || [])[1]
    await cmd(`zzcarspawn ${wet} 4028.5 ${Y} 4011.0`)
    await cmd(`zzcarmount ${A} ${wet}`)
    await sleep(600)
    const up = await cmd(`zzcarclimb ${wet}`)
    const upY = Number((up.match(/y: (-?[\d.]+)/) || [])[1])
    check('in 2-deep water facing a shore one block above the surface, holding forward lifts the car onto it', upY === Y + 3, `${gave} ${up}`)
    await cmd(`zzcartp ${wet} 4028.5 ${Y} 4011.0`)
    await cmd(`fill 4025 ${Y + 3} 4012 4038 ${Y + 3} 4014 stone`) // the shore two blocks above the water now
    await sleep(600)
    const stay = await cmd(`zzcarclimb ${wet}`)
    const stayY = Number((stay.match(/y: (-?[\d.]+)/) || [])[1])
    check('...but not onto land two blocks above the water (a wall stays a wall)', stayY < Y + 1, stay)
    await cmd(`dgarage store ${A}`)
    await cmd(`fill 4025 ${Y} 4002 4038 ${Y + 6} 4014 air`)
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    for (const name of [A, B]) {
      for (const m of [...String(await rcon.cmd(`dgarage info ${name}`).catch(() => '')).matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)]) {
        await rcon.cmd(`dgarage take ${name} ${m[1]}`).catch(() => {})
        await rcon.cmd(`zzcardelete ${m[1]}`).catch(() => {})
      }
      await rcon.cmd(`zzcratereset ${name}`).catch(() => {})
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} 0.5 68 -656.5`).catch(() => {})
    }
    await rcon.cmd(`dcrate remove ${STAND.join(' ')} world`).catch(() => {})
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`rg remove -w world ${SAFE}`).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`setblock ${STAND.join(' ')} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
