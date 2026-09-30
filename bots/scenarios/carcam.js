// The chase camera (DonatingPhone CarCam.java + carcam.sk; owner, 2026-09-29: third person on getting into a car, first
// person on getting out). The driver's client is told to look through an invisible camera that only it is sent; every
// way out (getting out, /carcam off, a teleport, quitting) first points the camera back at the player's own entity, then
// removes the camera. Health goes on the action bar (the client hides the hearts under another camera), and the seat
// stand's camera_distance makes F5 sit farther back for everyone (the cautious fallback).
// From the owner's client (2026-09-29): the view selects hotbar 9 (the car key) and puts the slot from before back on
// getting out; the driver gets a body in the seat (a mannequin with their skin, riding the seat) that only their client
// is sent, removed before the camera goes back.
// The rebuild (2026-09-29, "make it more like 3rd person f5 mode ... and also get rid of the hands"): the camera is a
// marker armor stand (smoothed on the client like the car's stands, resynced together with them: CarSmooth.likeCar),
// placed like F5 (carcam.distance back from the driver's eye along the view, pulled in before a wall), the mouse orbits
// it and it eases back behind the car after 1.5 s, and the key in hotbar 9 is a tripwire hook without a map_id while the
// view is on (the client draws arms with anything that has a map_id), a map again after.
// The minimap and the turning (2026-09-29, "keep the key/minimap on screen ... fix the raggedy feel of turning the
// camera"): with something in the offhand the key stays a map and only the driver's own client is told the driver is
// invisible (flags 0x20 on its own entity; the bystander never sees it), the hook only with an empty offhand; the
// camera's view yaw goes out as one head packet a tick from the plugin (carcam.head: filtered for this native bot,
// exact checked by replaying the bytes through the 26.3 client's head step).
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const D = 'CamD' // the driver
const O = 'CamO' // someone standing near the car
const Y = 200
const CHUNKS = '6400 6400 6440 6430'
const PLATFORM = `6400 ${Y - 1} 6400 6440 ${Y - 1} 6430`
const CAR = [6415.5, Y, 6415.5]

// Vanilla's look vector for a yaw and pitch in degrees (Location#getDirection).
const dir = (yaw, pitch) => {
  const y = yaw * Math.PI / 180, p = pitch * Math.PI / 180
  return [-Math.cos(p) * Math.sin(y), -Math.sin(p), Math.cos(p) * Math.cos(y)]
}
const wrap = a => { a %= 360; if (a >= 180) a -= 360; if (a < -180) a += 360; return a }

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  let plate = null
  let box = null
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
    // A bag in the offhand (the minimap is drawn one-handed only next to something in the offhand).
    await cmd(`zzdata ${D} bag-tier 1`)
    await cmd(`zzbagapply ${D}`)
    await cmd(`dphone cam tune head auto`)
    await cmd(`dphone cam tune minimap true`)
    await cmd(`zzheisttp ${D} ${CAR[0] - 2} ${Y} ${CAR[2]}`)
    await cmd(`zzheisttp ${O} 6432.5 ${Y} 6426.5`) // 16 blocks off: in tracking range, clear of the camera and the wall
    await sleep(2500)

    // What each client is sent: camera packets, entity spawns (with their type) and removals, the held slot the server
    // picks, who rides what, and position resyncs, in arrival order.
    const seen = { [D]: [], [O]: [] }
    const MOVES = new Set(['rel_entity_move', 'entity_move_look', 'sync_entity_position', 'entity_teleport'])
    for (const name of [D, O]) {
      const c = bots[name]._client
      c.on('camera', p => seen[name].push({ t: Date.now(), k: 'camera', id: p.cameraId }))
      c.on('spawn_entity', p => seen[name].push({ t: Date.now(), k: 'spawn', id: p.entityId, type: p.type, head: p.headPitch }))
      // The shared flags byte (entity data 0) of any entity, and head turns (the camera's view yaw).
      c.on('entity_metadata', p => {
        const f = (p.metadata || []).find(m => m.key === 0)
        if (f && typeof f.value === 'number') seen[name].push({ t: Date.now(), k: 'flags', id: p.entityId, v: f.value & 0xff })
      })
      c.on('entity_head_rotation', p => seen[name].push({ t: Date.now(), k: 'head', id: p.entityId, b: p.headYaw }))
      c.on('entity_destroy', p => seen[name].push({ t: Date.now(), k: 'destroy', ids: p.entityIds }))
      c.on('held_item_slot', p => seen[name].push({ t: Date.now(), k: 'held', slot: p.slot }))
      c.on('set_passengers', p => seen[name].push({ t: Date.now(), k: 'passengers', id: p.entityId, list: p.passengers || [] }))
      c.on('packet', (d, meta) => { if (d && MOVES.has(meta.name) && d.entityId !== undefined) seen[name].push({ t: Date.now(), k: meta.name === 'sync_entity_position' ? 'sync' : 'move', id: d.entityId }) })
    }
    const standType = bots[D].registry.entitiesByName.armor_stand.id
    const mannequinType = (bots[D].registry.entitiesByName.mannequin || {}).id
    const since = (name, t, k) => seen[name].filter(e => e.t >= t && e.k === k)
    const status = async () => cmd(`dphone cam ${D}`)
    const num = (s, re) => { const m = s.match(re); return m ? Number(m[1]) : NaN }
    const vec = (s, k) => { const m = s.match(new RegExp(` ${k}=(-?[\\d.]+),(-?[\\d.]+)(?:,(-?[\\d.]+))?`)); return m ? m.slice(1).filter(x => x !== undefined).map(Number) : [] }
    const camOf = s => ({
      id: num(s, / id=(\d+)/),
      uuid: (s.match(/ cam=([0-9a-f-]+)/) || [])[1],
      type: (s.match(/ type=(\w+)/) || [])[1],
      marker: (s.match(/ marker=(\S+)/) || [])[1],
      plate: (s.match(/plate=(\S+)/) || [])[1],
      at: vec(s, 'at'), eye: vec(s, 'eye'), view: vec(s, 'view'), look: vec(s, 'look'), orbit: vec(s, 'orbit'),
      yaw: num(s, / yaw=(-?[\d.]+)/), pitch: num(s, / pitch=(-?[\d.]+)/),
      dist: num(s, / dist=(-?[\d.]+)/), want: num(s, / want=(-?[\d.]+)/),
      caryaw: num(s, / caryaw=(-?[\d.]+)/), eased: num(s, / eased=(-?[\d.]+)/),
      slot: num(s, / slot=(\d+)/),
      restore: num(s, / restore=(-?\d+)/),
      body: (s.match(/ body=([0-9a-f-]+)/) || [])[1],
      bodyId: num(s, / bodyid=(\d+)/),
      bodySeat: (s.match(/ bodyseat=(\S+)/) || [])[1],
      key: (s.match(/ key=(\S+)/) || [])[1],
      keymap: (s.match(/ keymap=(\S+)/) || [])[1],
      self: (s.match(/ self=(\S+)/) || [])[1],
      rewrites: num(s, / rewrites=(\d+)/),
      hook: (s.match(/ hook=(\S+)/) || [])[1],
      head: (s.match(/ head=(\w+)/) || [])[1],
      headyaw: num(s, / headyaw=(-?[\d.]+)/),
      heads: num(s, / heads=(\d+)/),
      sentyaw: num(s, / sentyaw=(-?[\d.]+)/),
      shownlag: num(s, / shownlag=(-?[\d.]+)/),
      watch: ((s.match(/ watch=(\d+)\/(\d+)\/(\d+)/) || []).slice(1)).map(Number)
    })
    const mount = async () => { await cmd(`zzcarmount ${D} ${plate}`); await sleep(1500) }
    const select = async slot => { bots[D].setQuickBarSlot(slot); await sleep(400) }
    // The way back: the body goes first (never a frame of first person inside its head), then a camera packet with the
    // driver's own entity id, then the camera's removal.
    const resetAfter = (t, id, bodyId) => {
      const list = seen[D].filter(e => e.t >= t)
      const cam = list.findIndex(e => e.k === 'camera' && e.id === bots[D].entity.id)
      const gone = list.findIndex(e => e.k === 'destroy' && e.ids.includes(id))
      const body = bodyId >= 0 ? list.findIndex(e => e.k === 'destroy' && e.ids.includes(bodyId)) : -2
      const bodyOk = bodyId >= 0 ? body >= 0 && body < cam : true
      return { cam, gone, body, ok: cam >= 0 && gone >= 0 && cam < gone && bodyOk }
    }
    // Where F5 would put the camera: the eye, back along the view by dist.
    const expectAt = c => { const v = dir(c.view[0], c.view[1]); return c.eye.map((x, i) => x - v[i] * c.dist) }
    const off3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
    const dump = async () => cmd(`zzdump ${D}`)
    const slot8 = s => ((s.match(/ 8=([^|]*)\|/) || [])[1] || '').trim()
    const botKey = () => bots[D].inventory.slots[44]
    // The driver's own flags as each client was told (the driver's client about itself; the bystander's about the driver).
    const flagsOf = (name, t0) => seen[name].filter(e => e.k === 'flags' && e.t >= t0 && e.id === bots[D].entity.id).map(e => e.v)
    const INVIS = 0x20
    const hasMapId = it => !!(it && it.componentMap && it.componentMap.has('map_id'))
    const lockedOf = async () => ((await cmd(`dgarage info ${D}`)).match(new RegExp(`${plate}=[^)]*locked=(true|false)`)) || [])[1]

    // ---------- Getting in: the camera moves to a marker armor stand only the driver has ----------
    const gave = await cmd(`dgarage give ${D} sedan Red`)
    plate = (gave.match(/: ([A-Z0-9-]+) vin=/) || [])[1]
    await cmd(`zzcarspawn ${plate} ${CAR.join(' ')}`)
    await select(2) // a slot that isn't the key: the view should pick the key and put 2 back afterwards
    const before = await status()
    let t = Date.now()
    await mount()
    let st = await status()
    let cam = camOf(st)
    const spawned = since(D, t, 'spawn').find(e => e.id === cam.id)
    const camPk = since(D, t, 'camera').find(e => e.id === cam.id)
    check('getting into the driver\'s seat: the driver\'s client is sent a marker armor stand and a camera packet for it (the chase view)', plate && cam.plate === plate && cam.type === 'stand' && cam.marker === 'true' && spawned && spawned.type === standType && camPk, `${gave} | ${st} | spawned=${JSON.stringify(spawned)} camera=${JSON.stringify(since(D, t, 'camera'))}`)
    check('nobody else is ever sent the camera (the player standing near the car)', !seen[O].some(e => e.k === 'spawn' && e.id === cam.id), JSON.stringify(seen[O].filter(e => e.k === 'spawn').slice(-10)))
    const pv = cam.uuid ? await cmd(`dphone pv ${cam.uuid}`) : ''
    check('...and the server tracks it for the driver only', /default=false/.test(pv) && / tracked=CamD( |$)/.test(pv), pv)

    // The camera's first resync (the driver starting to track it) brings the car along in the same tick (CarSmooth.likeCar).
    const probeIds = async () => {
      await cmd(`dphone carprobe ${plate} 1`)
      await sleep(250)
      return Object.fromEntries((((await cmd(`dphone carprobe ${plate}`)).match(/ids=(\S+)/) || [])[1] || '').split(',').filter(Boolean).map(x => x.split(':')).map(([k, v]) => [k, Number(v)]))
    }
    const ids = await probeIds()
    const camSync = since(D, t, 'sync').find(e => e.id === cam.id)
    const near = (id, at) => seen[D].some(e => e.k === 'sync' && e.id === id && Math.abs(e.t - at) <= 20)
    check('the camera\'s first position resync reaches the driver in the same tick as a resync of the car\'s model (SKIN) and seat (MAINSEAT): no car sliding against the camera (a 26.3 client through ViaVersion keeps a resynced entity 2 ticks behind)',
      camSync && ids.SKIN && ids.MAINSEAT && near(ids.SKIN, camSync.t) && near(ids.MAINSEAT, camSync.t),
      `ids=${JSON.stringify(ids)} camSync=${JSON.stringify(camSync)} syncs=${JSON.stringify(since(D, t, 'sync').slice(0, 12))}`)

    // The car key in hand (the client draws the held item at the camera).
    check('the chase view selects hotbar 9 (the car key, index 8): the server sends it to the driver and keeps slot 2 to put back', / slot=2/.test(before) && bots[D].quickBarSlot === 8 && cam.slot === 8 && cam.restore === 2 && since(D, t, 'held').some(e => e.slot === 8), `before: ${before} | now: ${st} | bot slot=${bots[D].quickBarSlot} held=${JSON.stringify(since(D, t, 'held'))}`)
    let dmp = await dump()
    st = await status()
    cam = camOf(st)
    const offhand = bots[D].inventory.slots[45]
    const keyMapNow = ((await cmd(`data get entity ${D} Inventory[{Slot:8b}].components."minecraft:map_id"`)).match(/data: (\d+)/) || [])[1]
    check('the GPS minimap stays: with a bag in the offhand the car key in hotbar 9 is still a filled map with the phone\'s map_id while the view is on, on the server and in the driver\'s client',
      offhand && cam.key === 'key-map' && cam.hook === 'false' && keyMapNow && cam.keymap === keyMapNow && /^filled map x1 \[carkey:/.test(slot8(dmp)) && botKey() && botKey().name === 'filled_map' && hasMapId(botKey()),
      `offhand=${offhand && offhand.name} | ${st} | ${dmp} | map_id=${keyMapNow} | bot: ${botKey() && botKey().name}`)
    const ownFlags = flagsOf(D, t)
    check('...with no arms: the driver\'s own client is told the driver is invisible (shared flags 0x20 on its own entity) once the view starts',
      ownFlags.length > 0 && (ownFlags[ownFlags.length - 1] & INVIS) !== 0 && /^on$/.test(cam.self) && cam.rewrites > 0,
      `own flags ${JSON.stringify(ownFlags)} | ${st}`)
    // A real change of the driver's flags (glowing, bit 0x40) goes to everyone tracking them: the bystander gets the real
    // byte, the driver's own client the same with 0x20.
    let tg = Date.now()
    await cmd(`effect give ${D} minecraft:glowing 3 0 true`)
    await sleep(700)
    const glowD = flagsOf(D, tg), glowO = flagsOf(O, tg)
    check('...and only the driver\'s own client: when the driver starts glowing the bystander gets the driver\'s flags with 0x40 and never 0x20, the driver\'s client with both',
      glowO.length > 0 && glowO.some(v => (v & 0x40) !== 0) && glowO.every(v => (v & INVIS) === 0) && glowD.some(v => (v & 0x40) !== 0 && (v & INVIS) !== 0) && glowD.every(v => (v & INVIS) !== 0),
      `driver saw ${JSON.stringify(glowD)} | bystander saw ${JSON.stringify(glowO)}`)
    await cmd(`effect clear ${D} minecraft:glowing`)
    await sleep(300)
    st = await status()
    const headsNow = camOf(st).heads
    const headPk = seen[D].filter(e => e.k === 'head' && e.id === cam.id).length
    check('the camera\'s view yaw for this client: auto picks "filtered" for a native 1.21.11 client (it eases positions by 1/3 a tick, like the head); one head packet a tick from the plugin and none from the tracker (the client got as many as the plugin sent)',
      camOf(st).head === 'filtered' && headsNow > 20 && Math.abs(headPk - headsNow) <= 3,
      `client got ${headPk} head packets | ${st}`)

    // The driver's own body (the client never draws its own player under another camera).
    const bodySpawn = since(D, t, 'spawn').find(e => e.id === cam.bodyId)
    const listD = seen[D].filter(e => e.t >= t)
    const camIdx = listD.findIndex(e => e.k === 'camera' && e.id === cam.id)
    const bodyIdx = listD.findIndex(e => e.k === 'spawn' && e.id === cam.bodyId)
    const rides = since(D, t, 'passengers').some(e => e.list.includes(cam.bodyId) && e.list.includes(bots[D].entity.id))
    check('the driver\'s body: a mannequin sent to the driver after the camera packet, riding the driver\'s own seat (the client sits it where the driver sits)', cam.body && bodySpawn && (mannequinType === undefined || bodySpawn.type === mannequinType) && camIdx >= 0 && bodyIdx > camIdx && cam.bodySeat === 'true' && rides, `${st} | spawn=${JSON.stringify(bodySpawn)} mannequin=${mannequinType} camIdx=${camIdx} bodyIdx=${bodyIdx} passengers=${JSON.stringify(since(D, t, 'passengers'))}`)
    const pvBody = cam.body ? await cmd(`dphone pv ${cam.body}`) : ''
    check('nobody else is ever sent the body (the player near the car), and the server tracks it for the driver only', cam.body && !seen[O].some(e => e.k === 'spawn' && e.id === cam.bodyId) && /default=false/.test(pvBody) && / tracked=CamD( |$)/.test(pvBody), `${pvBody} | O spawns: ${JSON.stringify(seen[O].filter(e => e.k === 'spawn').slice(-10))}`)

    await sleep(1500)
    const bar = messagesSince(bots[D], t).filter(m => m.kind === 'game_info').map(m => m.text)
    check('while the chase view is on the action bar shows the driver\'s health and how to get out (the client hides the hearts)', bar.some(s => /❤ \d+(\.\d+)?\/\d+/.test(s) && /Sneak: get out/.test(s)), bar.slice(-5).join(' | '))
    const dist = await cmd(`execute as ${D} on vehicle run attribute @s minecraft:camera_distance base get`)
    check('the fallback for everyone: the driver\'s seat stand has camera_distance 7 (F5 in a car sits farther back)', /\s7(\.0+)?\s*$/.test(dist), dist)

    // ---------- F5's geometry: behind the driver's eye, pulled in before a wall ----------
    st = await status()
    cam = camOf(st)
    const want = expectAt(cam)
    const back = [cam.eye[0] - cam.at[0], cam.eye[2] - cam.at[2]] // from the camera to the eye, flat
    const facing = wrap(Math.atan2(-back[0], back[1]) * 180 / Math.PI) // the yaw that looks from the camera at the eye
    check('the camera sits where F5 would: carcam.distance back from the driver\'s eye along the view (open ground: the full distance), looking at the eye',
      cam.at.length === 3 && cam.eye.length === 3 && off3(cam.at, want) < 0.05 && Math.abs(cam.dist - cam.want) < 0.01 && Math.abs(cam.pitch - cam.view[1]) < 0.01,
      `${st} | expected ${want.map(x => x.toFixed(3)).join(',')}`)
    check('...and behind the car: with the car standing and the mouse still, the view is the car\'s heading (the camera looks along it at the driver)',
      Math.abs(wrap(cam.view[0] - cam.caryaw)) < 3 && Math.abs(wrap(facing - cam.caryaw)) < 3 && Math.abs(cam.orbit[0]) < 0.5,
      `view ${cam.view[0]} car ${cam.caryaw} camera->eye ${facing.toFixed(2)} orbit ${cam.orbit}`)
    // A 3x3x3 stone box on the camera's line, about 4 blocks back: the camera comes in front of it, never inside.
    const v = dir(cam.view[0], cam.view[1])
    const P = cam.eye.map((x, i) => Math.floor(x - v[i] * 4))
    box = `${P[0] - 1} ${P[1] - 1} ${P[2] - 1} ${P[0] + 1} ${P[1] + 1} ${P[2] + 1}`
    await cmd(`fill ${box} stone`)
    await sleep(500)
    st = await status()
    const walled = camOf(st)
    const camBlock = walled.at.map(Math.floor)
    const air = await cmd(`execute if block ${camBlock.join(' ')} minecraft:air`)
    check('a wall behind the car pulls the camera in (shorter than carcam.distance, still on the F5 line) and never into the wall (no x-ray)',
      walled.dist < walled.want - 1 && walled.dist > 0.5 && off3(walled.at, expectAt(walled)) < 0.05 && /Test passed/.test(air),
      `${st} | box ${box} | camera block ${camBlock.join(' ')}: ${air}`)
    await cmd(`fill ${box} air`)
    box = null
    await sleep(500)
    st = await status()
    check('...and back to the full distance once the wall is gone', Math.abs(camOf(st).dist - camOf(st).want) < 0.01, st)

    // ---------- The mouse orbits it (like F5), and it comes back behind the car ----------
    const look = async (yaw, pitch) => {
      // Mineflayer's own movement packets carry its yaw too, so its idea of the look moves with ours (radians, its own convention).
      await bots[D].look(Math.PI - yaw * Math.PI / 180, -pitch * Math.PI / 180, true)
      bots[D]._client.write('look', { yaw, pitch, flags: { onGround: false, hasHorizontalCollision: false } })
    }
    cam = camOf(await status())
    const y0 = cam.look[0], p0 = cam.look[1]
    await look(y0 + 40, p0)
    await sleep(350)
    st = await status()
    const turned = camOf(st)
    check('turning the mouse 40° to the right swings the camera 40° around the car (the orbit follows the player\'s own look, next tick)',
      Math.abs(turned.orbit[0] - 40) < 1.5 && Math.abs(wrap(turned.view[0] - (turned.eased + turned.orbit[0]))) < 0.1 && off3(turned.at, expectAt(turned)) < 0.05,
      `look ${y0} -> ${turned.look[0]} | ${st}`)
    let backAgain = null
    const tb = Date.now()
    for (let i = 0; i < 30 && !backAgain; i++) {
      await sleep(200)
      const c = camOf(await status())
      if (Math.abs(c.orbit[0]) < 1) backAgain = { c, after: Date.now() - tb }
    }
    check('...and with the mouse still it eases back behind the car (not before carcam.orbit-return, 1.5 s, and within about 3.5 s)',
      backAgain && backAgain.after >= 1300 && backAgain.after <= 4500 && Math.abs(wrap(backAgain.c.view[0] - backAgain.c.eased)) < 1,
      backAgain ? `${backAgain.after} ms: ${JSON.stringify(backAgain.c.orbit)}` : 'never came back')
    // Right after mounting nothing turned, so the count check above can't tell whether the tracker would send heads too;
    // after the swing round and back it can (the tracker sends one whenever the stand's head byte changes).
    const stF = await status()
    const cF = camOf(stF)
    const pkF = seen[D].filter(e => e.k === 'head' && e.id === cF.id).length
    check('...and all the way round and back only the plugin sent the camera\'s head: the client got as many head packets as the plugin sent (tracker heads would fight the plugin\'s in every turn)',
      cF.id === cam.id && cF.head === 'filtered' && cF.heads > 40 && Math.abs(pkF - cF.heads) <= 3,
      `client got ${pkF} head packets | ${stF}`)

    // ---------- The exact head (26.3 clients): the head lands on the view in the tick it arrives ----------
    // Forced for this 1.21.11 bot (auto would pick filtered): the camera is remade, and replaying the head bytes the bot
    // got through the 26.3 client's head step (a third of the way to each target, a packet a tick, from the spawn
    // packet's head) must give the plugin's modelled head: no packet missing, none extra from the tracker. (That the
    // model lands on a moving view in the tick is the plugin's arithmetic, checked offline: within 0.23°.)
    await cmd('dphone cam tune head exact')
    await sleep(800)
    cam = camOf(await status())
    const exactId = cam.id
    await look(camOf(await status()).look[0] + 30, p0)
    await sleep(900) // the orbit has settled and hasn't started back yet (orbit-return 1.5 s)
    st = await status()
    const ex = camOf(st)
    const spawnHead = seen[D].find(e => e.k === 'spawn' && e.id === exactId)
    let h = spawnHead && typeof spawnHead.head === 'number' ? spawnHead.head * 360 / 256 : NaN
    const exHeads = seen[D].filter(e => e.k === 'head' && e.id === exactId)
    for (const e of exHeads) h = h + wrap(e.b * 360 / 256 - h) / 3
    check('carcam.head exact: the camera is remade with one head packet a tick; replaying the bytes the client got like the 26.3 client (1/3 to each target) gives exactly the head the plugin models (so a moving view lands where it wants in the tick it arrives: the view and the camera\'s spot turn together), and at rest it sits on the byte nearest the wanted view yaw',
      ex.head === 'exact' && ex.id === exactId && exHeads.length > 20 && Math.abs(ex.orbit[0] - 30) < 2 && Math.abs(wrap(h - ex.headyaw)) < 0.1 && Math.abs(wrap(ex.headyaw - ex.sentyaw)) < 0.75 && Math.abs(exHeads.length - ex.heads) <= 3,
      `replayed ${h.toFixed(2)} from ${exHeads.length} packets, plugin sent ${ex.heads} (spawn head ${spawnHead && spawnHead.head}) | ${st}`)
    // The model of the 26.3 client's movement queue: fed by what the server really sent the driver for the camera.
    const exSyncs = seen[D].filter(e => e.k === 'sync' && e.id === exactId).length
    const exMoves = seen[D].filter(e => e.k === 'move' && e.id === exactId).length
    check('...and its model of the client\'s movement queue is fed by what the driver was really sent for the camera: the resyncs (its first, when the driver started tracking it) and the moves (the orbit), counted on the driver\'s own channel',
      ex.watch.length === 3 && ex.watch[0] >= 1 && ex.watch[0] === exSyncs && Math.abs(ex.watch[1] - exMoves) <= 2 && exMoves > 0 && ex.shownlag >= 0 && ex.shownlag <= 40, // at rest the client shows the last spot it was sent: the lag is the ticks since the camera last moved
      `watch=${ex.watch} | client: ${exSyncs} resyncs, ${exMoves} moves | shownlag ${ex.shownlag}`)
    // A fast flick: 150° to the left in one look packet. The orbit's spring moves the view ~85° in its first tick; a
    // tripled correction past 180° would wrap in the client and turn the head the wrong way (then stay ~120° off while
    // anything kept turning). The replayed head must only ever step left, end up 150° round, and land on the view.
    const tf = Date.now()
    await look(ex.look[0] - 150, p0)
    await sleep(600)
    const stFl = await status()
    const fl = camOf(stFl)
    const flHeads = seen[D].filter(e => e.k === 'head' && e.id === exactId)
    let hf = spawnHead && typeof spawnHead.head === 'number' ? spawnHead.head * 360 / 256 : NaN
    let maxWrong = 0, turnedBy = 0
    for (const e of flHeads) {
      const step = wrap(e.b * 360 / 256 - hf) / 3
      hf = hf + step
      if (e.t >= tf) { maxWrong = Math.max(maxWrong, step); turnedBy += step }
    }
    check('...and a fast 150° flick: the head only ever turns the way the view does (no wrap in the client), goes the whole 150° round and lands on the view within 0.75° (the correction is capped at 59° a tick and caught up over the next ticks)',
      fl.id === exactId && Math.abs(fl.orbit[0] - (ex.orbit[0] - 150)) < 3 && maxWrong < 1 && Math.abs(turnedBy + 150) < 6 && Math.abs(wrap(hf - fl.headyaw)) < 0.1 && Math.abs(wrap(fl.headyaw - fl.sentyaw)) < 0.75,
      `worst step the wrong way ${maxWrong.toFixed(2)}°, turned ${turnedBy.toFixed(1)}° | replayed ${hf.toFixed(2)} | ${stFl}`)
    await cmd('dphone cam tune head auto')
    await sleep(800)
    cam = camOf(await status())
    for (let i = 0; i < 20 && Math.abs(cam.orbit[0]) >= 1; i++) { await sleep(200); cam = camOf(await status()) } // back behind the car

    // ---------- Locking and unlocking with the key (a map: the minimap) ----------
    const lock0 = await lockedOf()
    t = Date.now()
    bots[D].activateItem()
    await sleep(150)
    bots[D].deactivateItem()
    await sleep(600)
    const lock1 = await lockedOf()
    st = await status()
    dmp = await dump()
    const lockBar = messagesSince(bots[D], t).filter(m => m.kind === 'game_info').map(m => m.text)
    check('right-clicking the key locks or unlocks the car (garage.sk matches the key by its id), and the refreshed key is still the map (carKey builds the hook only while donating_carcam_hook is set)',
      lock0 && lock1 && lock0 !== lock1 && lockBar.some(s => /Locked|Unlocked/.test(s)) && camOf(st).key === 'key-map' && /^filled map x1 \[carkey:/.test(slot8(dmp)),
      `locked ${lock0} -> ${lock1} | bar ${lockBar.slice(-3).join(' | ')} | ${st} | ${dmp}`)

    // ---------- Nothing in the offhand: the key is the hook (a held map would be drawn big in the middle) ----------
    await cmd(`zzdata ${D} bag-tier none`)
    await cmd(`zzbagapply ${D}`)
    await sleep(500)
    st = await status()
    dmp = await dump()
    check('a driver with an empty offhand: the key in hotbar 9 becomes a tripwire hook without a map_id (still carkey:<plate>), on the server and in the driver\'s client',
      !bots[D].inventory.slots[45] && camOf(st).key === 'key-hook' && camOf(st).hook === 'true' && camOf(st).keymap === 'none' && /^tripwire hook x1 \[carkey:/.test(slot8(dmp)) && botKey() && botKey().name === 'tripwire_hook' && !hasMapId(botKey()),
      `offhand=${JSON.stringify(bots[D].inventory.slots[45])} | ${st} | ${dmp} | bot: ${botKey() && botKey().name}`)
    const lock2 = await lockedOf()
    t = Date.now()
    bots[D].activateItem()
    await sleep(150)
    bots[D].deactivateItem()
    await sleep(600)
    const lock3 = await lockedOf()
    st = await status()
    dmp = await dump()
    check('...right-clicking the hook key locks or unlocks the car, and the refreshed key is still the hook (carKey builds it while donating_carcam_hook is set)',
      lock2 && lock3 && lock2 !== lock3 && camOf(st).key === 'key-hook' && /^tripwire hook x1 \[carkey:/.test(slot8(dmp)),
      `locked ${lock2} -> ${lock3} | ${st} | ${dmp}`)
    await cmd(`zzdata ${D} bag-tier 1`)
    await cmd(`zzbagapply ${D}`)
    await sleep(500)
    st = await status()
    check('...and with the bag back in the offhand the key is the map again (the minimap)', camOf(st).key === 'key-map' && camOf(st).hook === 'false' && botKey() && botKey().name === 'filled_map' && hasMapId(botKey()), st)

    // ---------- Getting out: first person again ----------
    t = Date.now()
    await cmd(`minecraft:ride ${D} dismount`)
    await sleep(800)
    let r = resetAfter(t, cam.id, cam.bodyId)
    st = await status()
    check('getting out: the body goes, then the camera goes back to the driver\'s own entity, then the camera stand is removed', r.ok && /none reason=not-driving/.test(st) && /none/.test(await cmd(`dphone pv ${cam.uuid}`)) && /none/.test(await cmd(`dphone pv ${cam.body}`)), `${JSON.stringify(r)} ${st} ${JSON.stringify(seen[D].filter(e => e.t >= t && e.k !== 'move' && e.k !== 'sync'))}`)
    const outFlags = flagsOf(D, t)
    check('...and the driver\'s own client gets its real flags again (no 0x20: arms back in first person)', outFlags.length > 0 && (outFlags[outFlags.length - 1] & INVIS) === 0 && / self=off/.test(st), `own flags since getting out ${JSON.stringify(outFlags)} | ${st}`)
    check('getting out puts back the slot from before (2): the server sends it, and the driver holds it', bots[D].quickBarSlot === 2 && / slot=2/.test(st) && since(D, t, 'held').some(e => e.slot === 2), `bot slot=${bots[D].quickBarSlot} | ${st} | held=${JSON.stringify(since(D, t, 'held'))}`)
    dmp = await dump()
    // (the key turns back into the map at once; garage.sk then swaps the phone back in within a second)
    check('...and hotbar 9 is a map again (the key or already the phone, with its map_id)', /^filled map x1 \[(phone|carkey:[^\]]+)\]/.test(slot8(dmp)) && / key=(phone|key)-map keymap=\d+/.test(st), `${dmp} | ${st}`)

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
    check('/carcam off while driving: back to first person (the body, the reset, then the camera goes), the opt-out tag set, and no new chase view or body', cam.id && r.ok && /none reason=off/.test(st) && /Test passed/.test(tagged) && newCams.length === 0 && newBodies.length === 0, `${JSON.stringify(r)} ${st} ${tagged} new=${JSON.stringify(newCams)} bodies=${JSON.stringify(newBodies)}`)
    check('...and the slot from before (2) comes back, since the driver was still on the key', bots[D].quickBarSlot === 2 && / slot=2/.test(st), `bot slot=${bots[D].quickBarSlot} | ${st}`)
    dmp = await dump()
    const mapId = ((await cmd(`data get entity ${D} Inventory[{Slot:8b}].components."minecraft:map_id"`)).match(/data: (\d+)/) || [])[1]
    check('...and the car key is a map again while still driving (the phone\'s map id: the GPS view), in the driver\'s client too',
      /^filled map x1 \[carkey:/.test(slot8(dmp)) && / key=key-map /.test(st) && mapId && st.includes(` keymap=${mapId}`) && botKey() && botKey().name === 'filled_map' && hasMapId(botKey()),
      `${dmp} | ${st} | map_id=${mapId} | bot: ${botKey() && botKey().name}`)
    t = Date.now()
    bots[D].chat('/carcam on')
    await sleep(1200)
    st = await status()
    cam = camOf(st)
    check('/carcam on while driving: the chase view comes back, with the key (still the map: the minimap) and a new body', cam.id && since(D, t, 'camera').some(e => e.id === cam.id) && cam.slot === 8 && cam.restore === 2 && cam.body && since(D, t, 'spawn').some(e => e.id === cam.bodyId) && cam.key === 'key-map' && cam.hook === 'false', st)

    // ---------- A teleport ends it (the driver is taken out of the car) ----------
    t = Date.now()
    await cmd(`minecraft:tp ${D} 6425.5 ${Y} 6405.5`)
    await sleep(800)
    r = resetAfter(t, cam.id, cam.bodyId)
    check('a teleport while driving: back to first person, the body and the camera are gone, the slot is back', r.ok && !/plate=/.test(await status()) && bots[D].quickBarSlot === 2, `${JSON.stringify(r)} slot=${bots[D].quickBarSlot} ${JSON.stringify(seen[D].filter(e => e.t >= t && e.k !== 'move' && e.k !== 'sync'))}`)

    // ---------- Quitting in the car leaves nothing behind ----------
    // (the teleport took the driver out; the car still stands where it was)
    await cmd(`zzheisttp ${D} ${CAR[0] - 2} ${Y} ${CAR[2]}`)
    await sleep(800)
    await mount()
    cam = camOf(await status())
    await quit(bots[D])
    delete bots[D]
    await sleep(800)
    check('quitting while driving: the camera and the body are removed', cam.uuid && cam.body && /none/.test(await cmd(`dphone pv ${cam.uuid}`)) && /none/.test(await cmd(`dphone pv ${cam.body}`)), `${cam.uuid} ${cam.body}`)
  } finally {
    if (box) await rcon.cmd(`fill ${box} air`).catch(() => {})
    await rcon.cmd(`zzdata ${D} carcam none`).catch(() => {})
    await rcon.cmd(`dphone cam tune head auto`).catch(() => {})
    await rcon.cmd(`effect clear ${D} minecraft:glowing`).catch(() => {})
    await rcon.cmd(`zzdata ${D} bag-tier none`).catch(() => {})
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
