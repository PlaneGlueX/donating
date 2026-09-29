// The chase camera (DonatingPhone CarCam.java + carcam.sk; owner, 2026-09-29: third person on getting into a car, first
// person on getting out). The driver's client is told to look through an invisible item display that only it is sent;
// every way out (getting out, /carcam off, a teleport, quitting) first points the camera back at the player's own entity,
// then removes the display. Health goes on the action bar (the client hides the hearts under another camera), and the
// seat stand's camera_distance makes F5 sit farther back for everyone (the cautious fallback).
// From the owner's client (2026-09-29): the view selects hotbar 9 (the car key's GPS map instead of a gun across the view)
// and puts the slot from before back on getting out; the driver gets a body in the seat (a mannequin with their skin,
// riding the seat) that only their client is sent, removed before the camera goes back.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const D = 'CamD' // the driver
const O = 'CamO' // someone standing next to the car
const Y = 200
const CHUNKS = '6400 6400 6440 6430'
const PLATFORM = `6400 ${Y - 1} 6400 6440 ${Y - 1} 6430`

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  let plate = null
  try {
    // ---------- Setup ----------
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} gray_concrete`)
    for (const name of [D, O]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`zzdata ${name} carcam none`)
      await cmd(`tag ${name} remove donating_carcam_off`)
      for (const m of [...String(await cmd(`dgarage info ${name}`)).matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)]) await cmd(`dgarage take ${name} ${m[1]}`)
    }
    await cmd(`dlevel set ${D} 150`)
    await cmd(`zzheisttp ${D} 6408.5 ${Y} 6410.5`)
    await cmd(`zzheisttp ${O} 6412.5 ${Y} 6406.5`)
    await sleep(2500)

    // What each client is sent: camera packets, entity spawns (with their type) and removals, the held slot the server
    // picks, and who rides what, in arrival order.
    const seen = { [D]: [], [O]: [] }
    for (const name of [D, O]) {
      const c = bots[name]._client
      c.on('camera', p => seen[name].push({ t: Date.now(), k: 'camera', id: p.cameraId }))
      c.on('spawn_entity', p => seen[name].push({ t: Date.now(), k: 'spawn', id: p.entityId, type: p.type }))
      c.on('entity_destroy', p => seen[name].push({ t: Date.now(), k: 'destroy', ids: p.entityIds }))
      c.on('held_item_slot', p => seen[name].push({ t: Date.now(), k: 'held', slot: p.slot }))
      c.on('set_passengers', p => seen[name].push({ t: Date.now(), k: 'passengers', id: p.entityId, list: p.passengers || [] }))
    }
    const displayType = bots[D].registry.entitiesByName.item_display.id
    const mannequinType = (bots[D].registry.entitiesByName.mannequin || {}).id
    const since = (name, t, k) => seen[name].filter(e => e.t >= t && e.k === k)
    const status = async () => cmd(`dphone cam ${D}`)
    const num = (s, re) => { const m = s.match(re); return m ? Number(m[1]) : NaN }
    const camOf = s => ({
      id: num(s, / id=(\d+)/),
      uuid: (s.match(/display=([0-9a-f-]+)/) || [])[1],
      plate: (s.match(/plate=(\S+)/) || [])[1],
      slot: num(s, / slot=(\d+)/),
      restore: num(s, / restore=(-?\d+)/),
      body: (s.match(/ body=([0-9a-f-]+)/) || [])[1],
      bodyId: num(s, / bodyid=(\d+)/),
      bodySeat: (s.match(/ bodyseat=(\S+)/) || [])[1]
    })
    const mount = async () => { await cmd(`zzcarmount ${D} ${plate}`); await sleep(1500) }
    const select = async slot => { bots[D].setQuickBarSlot(slot); await sleep(400) }
    // The way back: the body goes first (never a frame of first person inside its head), then a camera packet with the
    // driver's own entity id, then the display's removal.
    const resetAfter = (t, id, bodyId) => {
      const list = seen[D].filter(e => e.t >= t)
      const cam = list.findIndex(e => e.k === 'camera' && e.id === bots[D].entity.id)
      const gone = list.findIndex(e => e.k === 'destroy' && e.ids.includes(id))
      const body = bodyId >= 0 ? list.findIndex(e => e.k === 'destroy' && e.ids.includes(bodyId)) : -2
      const bodyOk = bodyId >= 0 ? body >= 0 && body < cam : true
      return { cam, gone, body, ok: cam >= 0 && gone >= 0 && cam < gone && bodyOk }
    }

    // ---------- Getting in: the camera moves to a display only the driver has ----------
    const gave = await cmd(`dgarage give ${D} sedan Red`)
    plate = (gave.match(/: ([A-Z0-9-]+) vin=/) || [])[1]
    await cmd(`zzcarspawn ${plate} 6410.5 ${Y} 6410.5`)
    await select(2) // a slot that isn't the key: the view should pick the key and put 2 back afterwards
    const before = await status()
    let t = Date.now()
    await mount()
    let st = await status()
    let cam = camOf(st)
    const spawned = since(D, t, 'spawn').find(e => e.id === cam.id)
    const camPk = since(D, t, 'camera').find(e => e.id === cam.id)
    check('getting into the driver\'s seat: the driver\'s client is sent an item display and a camera packet for it (the chase view)', plate && cam.plate === plate && spawned && spawned.type === displayType && camPk, `${gave} | ${st} | spawned=${JSON.stringify(spawned)} camera=${JSON.stringify(since(D, t, 'camera'))}`)
    check('nobody else is ever sent the camera display (the player standing next to the car)', !seen[O].some(e => e.k === 'spawn' && e.id === cam.id), JSON.stringify(seen[O].filter(e => e.k === 'spawn').slice(-10)))
    const pv = cam.uuid ? await cmd(`dphone pv ${cam.uuid}`) : ''
    check('...and the server tracks it for the driver only', /default=false/.test(pv) && / tracked=CamD( |$)/.test(pv), pv)

    // The car key in hand (the client draws the held item at the camera: a gun covered a third of the view).
    check('the chase view selects hotbar 9 (the car key, index 8): the server sends it to the driver and keeps slot 2 to put back', / slot=2/.test(before) && bots[D].quickBarSlot === 8 && cam.slot === 8 && cam.restore === 2 && since(D, t, 'held').some(e => e.slot === 8), `before: ${before} | now: ${st} | bot slot=${bots[D].quickBarSlot} held=${JSON.stringify(since(D, t, 'held'))}`)

    // The driver's own body (the client never draws its own player under another camera).
    const bodySpawn = since(D, t, 'spawn').find(e => e.id === cam.bodyId)
    const listD = seen[D].filter(e => e.t >= t)
    const camIdx = listD.findIndex(e => e.k === 'camera' && e.id === cam.id)
    const bodyIdx = listD.findIndex(e => e.k === 'spawn' && e.id === cam.bodyId)
    const rides = since(D, t, 'passengers').some(e => e.list.includes(cam.bodyId) && e.list.includes(bots[D].entity.id))
    check('the driver\'s body: a mannequin sent to the driver after the camera packet, riding the driver\'s own seat (the client sits it where the driver sits)', cam.body && bodySpawn && (mannequinType === undefined || bodySpawn.type === mannequinType) && camIdx >= 0 && bodyIdx > camIdx && cam.bodySeat === 'true' && rides, `${st} | spawn=${JSON.stringify(bodySpawn)} mannequin=${mannequinType} camIdx=${camIdx} bodyIdx=${bodyIdx} passengers=${JSON.stringify(since(D, t, 'passengers'))}`)
    const pvBody = cam.body ? await cmd(`dphone pv ${cam.body}`) : ''
    check('nobody else is ever sent the body (the player next to the car), and the server tracks it for the driver only', cam.body && !seen[O].some(e => e.k === 'spawn' && e.id === cam.bodyId) && /default=false/.test(pvBody) && / tracked=CamD( |$)/.test(pvBody), `${pvBody} | O spawns: ${JSON.stringify(seen[O].filter(e => e.k === 'spawn').slice(-10))}`)

    await sleep(1500)
    const bar = messagesSince(bots[D], t).filter(m => m.kind === 'game_info').map(m => m.text)
    check('while the chase view is on the action bar shows the driver\'s health and how to get out (the client hides the hearts)', bar.some(s => /❤ \d+(\.\d+)?\/\d+/.test(s) && /Sneak: get out/.test(s)), bar.slice(-5).join(' | '))
    const dist = await cmd(`execute as ${D} on vehicle run attribute @s minecraft:camera_distance base get`)
    check('the fallback for everyone: the driver\'s seat stand has camera_distance 7 (F5 in a car sits farther back)', /\s7(\.0+)?\s*$/.test(dist), dist)

    // ---------- Getting out: first person again ----------
    t = Date.now()
    await cmd(`minecraft:ride ${D} dismount`)
    await sleep(800)
    let r = resetAfter(t, cam.id, cam.bodyId)
    st = await status()
    check('getting out: the body goes, then the camera goes back to the driver\'s own entity, then the display is removed', r.ok && /none reason=not-driving/.test(st) && /none/.test(await cmd(`dphone pv ${cam.uuid}`)) && /none/.test(await cmd(`dphone pv ${cam.body}`)), `${JSON.stringify(r)} ${st} ${JSON.stringify(seen[D].filter(e => e.t >= t))}`)
    check('getting out puts back the slot from before (2): the server sends it, and the driver holds it', bots[D].quickBarSlot === 2 && / slot=2/.test(st) && since(D, t, 'held').some(e => e.slot === 2), `bot slot=${bots[D].quickBarSlot} | ${st} | held=${JSON.stringify(since(D, t, 'held'))}`)

    // ---------- A slot picked during the ride is the player's: nothing is put back ----------
    await mount()
    cam = camOf(await status())
    await select(4)
    const mid = await status()
    t = Date.now()
    await cmd(`minecraft:ride ${D} dismount`)
    await sleep(800)
    st = await status()
    check('a player who picks another slot while driving (4) keeps it on getting out (no slot sent back)', cam.slot === 8 && cam.restore === 2 && / restore=-1/.test(mid) && bots[D].quickBarSlot === 4 && / slot=4/.test(st) && !since(D, t, 'held').some(e => e.slot !== 4), `in: slot=${cam.slot} restore=${cam.restore} | mid: ${mid} | out: ${st} bot slot=${bots[D].quickBarSlot} held=${JSON.stringify(since(D, t, 'held'))}`)
    await select(2)

    // ---------- /carcam off stops it at once, and it stays off in the car ----------
    await mount()
    cam = camOf(await status())
    t = Date.now()
    bots[D].chat('/carcam off')
    await sleep(1200)
    r = resetAfter(t, cam.id, cam.bodyId)
    st = await status()
    const tagged = await cmd(`execute if entity @a[name=${D},tag=donating_carcam_off]`)
    const newCams = since(D, t + 400, 'camera').filter(e => e.id !== bots[D].entity.id)
    const newBodies = since(D, t + 400, 'spawn').filter(e => mannequinType !== undefined && e.type === mannequinType)
    check('/carcam off while driving: back to first person (the body, the reset, then the display goes), the opt-out tag set, and no new chase view or body', cam.id && r.ok && /none reason=off/.test(st) && /Test passed/.test(tagged) && newCams.length === 0 && newBodies.length === 0, `${JSON.stringify(r)} ${st} ${tagged} new=${JSON.stringify(newCams)} bodies=${JSON.stringify(newBodies)}`)
    check('...and the slot from before (2) comes back, since the driver was still on the key', bots[D].quickBarSlot === 2 && / slot=2/.test(st), `bot slot=${bots[D].quickBarSlot} | ${st}`)
    t = Date.now()
    bots[D].chat('/carcam on')
    await sleep(1200)
    st = await status()
    cam = camOf(st)
    check('/carcam on while driving: the chase view comes back, with the key and a new body', cam.id && since(D, t, 'camera').some(e => e.id === cam.id) && cam.slot === 8 && cam.restore === 2 && cam.body && since(D, t, 'spawn').some(e => e.id === cam.bodyId), st)

    // ---------- A teleport ends it (the driver is taken out of the car) ----------
    t = Date.now()
    await cmd(`minecraft:tp ${D} 6420.5 ${Y} 6420.5`)
    await sleep(800)
    r = resetAfter(t, cam.id, cam.bodyId)
    check('a teleport while driving: back to first person, the body and the display are gone, the slot is back', r.ok && !/plate=/.test(await status()) && bots[D].quickBarSlot === 2, `${JSON.stringify(r)} slot=${bots[D].quickBarSlot} ${JSON.stringify(seen[D].filter(e => e.t >= t))}`)

    // ---------- Quitting in the car leaves nothing behind ----------
    // (the teleport took the driver out; the car still stands where it was)
    await cmd(`zzheisttp ${D} 6408.5 ${Y} 6410.5`)
    await sleep(800)
    await mount()
    cam = camOf(await status())
    await quit(bots[D])
    delete bots[D]
    await sleep(800)
    check('quitting while driving: the camera display and the body are removed', cam.uuid && cam.body && /none/.test(await cmd(`dphone pv ${cam.uuid}`)) && /none/.test(await cmd(`dphone pv ${cam.body}`)), `${cam.uuid} ${cam.body}`)
  } finally {
    await rcon.cmd(`zzdata ${D} carcam none`).catch(() => {})
    await rcon.cmd(`tag ${D} remove donating_carcam_off`).catch(() => {})
    for (const name of [D, O]) {
      for (const m of [...String(await rcon.cmd(`dgarage info ${name}`).catch(() => '')).matchAll(/([A-Z0-9-]+)=[a-z]+\(/g)]) {
        await rcon.cmd(`dgarage take ${name} ${m[1]}`).catch(() => {})
        await rcon.cmd(`zzcardelete ${m[1]}`).catch(() => {})
      }
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} 0.5 68 -656.5`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
