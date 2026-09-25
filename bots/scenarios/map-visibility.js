// nav.sk: every phone is the same vanilla map. Non-passive players wear the map cloak (boots slot):
// other players' maps leave them out, but they still see themselves. Passive players show up for
// everyone. Each bot's own map packets are the truth: they list the arrows that bot's client draws.
// Also checks the passive messages, the locator-bar range, that the cloak can't be taken off or
// lost on death, and the banner lock (a phone click on a banner would add a label to everyone's map).
const fs = require('fs')
const path = require('path')
const nbt = require('prismarine-nbt')
const { Vec3 } = require('vec3')
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const VIEW = 'NavViewer'
const A = 'NavAlpha'
const B = 'NavBravo'
const PLAYER_ICON = 0 // minecraft:player in the map_decoration_type registry
const Y = 150 // glass platform in the sky, inside the map

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bots = {}
  let platform = null // the glass platform's corners, removed again at the end
  try {
    // The map every phone shows, and where it sits in the world.
    const mapId = Number(((await rcon.cmd('zzcfg nav::map-id')).match(/= (\d+)/) || [])[1])
    await rcon.cmd('save-all flush')
    const file = path.join(__dirname, '..', '..', 'server', 'world', 'data', `map_${mapId}.dat`)
    const map = nbt.simplify((await nbt.parse(fs.readFileSync(file))).parsed).data
    // Fields at their default value are left out of the file (scale 0 has no "scale" key).
    const scale = map.scale || 0
    check('the phone map exists', map && map.xCenter !== undefined, `map_${mapId}: center ${map && map.xCenter},${map && map.zCenter} scale ${scale}`)
    const cx = map.xCenter
    const cz = map.zCenter
    const unit = 1 << scale
    // Where vanilla draws a marker for world position (x, z), in map icon units.
    const iconAt = (x, z) => [Math.trunc(((x - cx) / unit) * 2 + 0.5), Math.trunc(((z - cz) / unit) * 2 + 0.5)]
    const spot = { [VIEW]: [cx + 10.5, cz + 10.5], [A]: [cx + 20.5, cz + 10.5], [B]: [cx + 10.5, cz + 20.5] }

    // Every map packet with icons, per bot: [{ t, icons: [{ type, x, z }] }].
    const packets = {}
    for (const name of [VIEW, A, B]) {
      bots[name] = await join(name)
      packets[name] = []
      bots[name]._client.on('map', p => {
        if (p.itemDamage === mapId && p.icons) packets[name].push({ t: Date.now(), icons: p.icons.map(i => ({ type: i.type, x: i.x, z: i.z })) })
      })
    }
    platform = `${cx + 8} ${Y - 1} ${cz + 8} ${cx + 23} ${Y - 1} ${cz + 23}`
    await rcon.cmd(`fill ${platform} glass`)
    for (const name of [VIEW, A, B]) {
      await rcon.cmd(`gamemode survival ${name}`)
      await rcon.cmd(`minecraft:tp ${name} ${spot[name][0]} ${Y} ${spot[name][1]}`)
      await rcon.cmd(`zzclear ${name}`)
    }

    // Arrows `viewer` saw for `target` in each packet of a window: true/false per packet.
    const near = (icon, [x, z]) => icon.type === PLAYER_ICON && Math.abs(icon.x - x) <= 1 && Math.abs(icon.z - z) <= 1
    const window = async ms => {
      for (const name of [VIEW, A, B]) packets[name] = []
      await sleep(ms)
      const saw = (viewer, target) => packets[viewer].map(p => p.icons.some(i => near(i, iconAt(...spot[target]))))
      return { saw, count: viewer => packets[viewer].length }
    }
    const always = list => list.length > 0 && list.every(Boolean)
    const never = list => list.length > 0 && list.every(v => !v)
    const show = list => `${list.filter(Boolean).length}/${list.length} packets`

    // ---------- Round 1: A and VIEW non-passive, B passive ----------
    let t = Date.now()
    await rcon.cmd(`zzpassive ${VIEW} off`)
    await rcon.cmd(`zzpassive ${A} off`)
    await rcon.cmd(`zzpassive ${B} on`)
    await sleep(1500)
    check('passive on tells the player they show on maps', messagesSince(bots[B], t).some(m => /Passive mode on\. Other players can now see you on their map/.test(m.text)), messagesSince(bots[B], t).map(m => m.text).join(' | '))
    check('passive off tells the player they are hidden', messagesSince(bots[A], t).some(m => /Passive mode off\. You're hidden from other players' maps/.test(m.text)), messagesSince(bots[A], t).map(m => m.text).join(' | '))
    let w = await window(3000)
    // Arrows only get re-sent when something on the map changes, so "never" and "always" are
    // checked over every packet in the window, and the window must have packets.
    check('viewer always sees itself (non-passive)', always(w.saw(VIEW, VIEW)), show(w.saw(VIEW, VIEW)))
    check('viewer sees the passive player', always(w.saw(VIEW, B)), show(w.saw(VIEW, B)))
    check('viewer never sees the non-passive player', never(w.saw(VIEW, A)), show(w.saw(VIEW, A)))
    check('non-passive player sees itself', always(w.saw(A, A)), show(w.saw(A, A)))
    check('non-passive player sees the passive one', always(w.saw(A, B)), show(w.saw(A, B)))
    check('non-passive player never sees the other non-passive one', never(w.saw(A, VIEW)), show(w.saw(A, VIEW)))
    check('passive player sees itself', always(w.saw(B, B)), show(w.saw(B, B)))
    check('passive player never sees non-passive players', never(w.saw(B, A)) && never(w.saw(B, VIEW)), `A: ${show(w.saw(B, A))}, viewer: ${show(w.saw(B, VIEW))}`)

    const range = async name => Number(((await rcon.cmd(`attribute ${name} minecraft:waypoint_transmit_range get`)).match(/is ([\d.E+-]+)/) || [])[1])
    check('locator bar: passive player sends a waypoint', (await range(B)) > 0, `range ${await range(B)}`)
    check('locator bar: non-passive player sends none', (await range(A)) === 0, `range ${await range(A)}`)

    // ---------- Round 2: flip them ----------
    await rcon.cmd(`zzpassive ${A} on`)
    await rcon.cmd(`zzpassive ${B} off`)
    await sleep(1500)
    w = await window(3000)
    check('after switching, viewer sees the new passive player', always(w.saw(VIEW, A)), show(w.saw(VIEW, A)))
    check('after switching, viewer no longer sees the old one', never(w.saw(VIEW, B)), show(w.saw(VIEW, B)))

    // ---------- The cloak stays on ----------
    const dump = async name => (await rcon.cmd(`zzdump ${name}`)).trim()
    const CLOAK = /(^|\| )36=structure void x1 \[map-cloak\]/
    check('non-passive player wears the map cloak', CLOAK.test(await dump(B)), await dump(B))
    check('passive player wears no cloak', !/36=/.test(await dump(A)), await dump(A))
    const before = await dump(B)
    for (const [label, mode] of [['click', 0], ['shift-click', 1]]) {
      try { await bots[B].clickWindow(8, 0, mode) } catch (err) { /* the server refuses; checked below */ }
      await sleep(600)
      check(`${label} on the boots slot leaves the cloak`, (await dump(B)) === before, await dump(B))
    }
    await rcon.cmd(`minecraft:kill ${B}`)
    await sleep(2500)
    check('the cloak is still there after death', CLOAK.test(await dump(B)), await dump(B))
    await rcon.cmd(`minecraft:tp ${B} ${spot[B][0]} ${Y} ${spot[B][1]}`)
    check('the phone is the map', /(^| )8=filled map x1 \[phone\]/.test(await dump(B)), await dump(B))

    // ---------- Banner lock ----------
    // Right-clicking a banner with a map adds (or removes) its label on everyone's copy.
    const bannerPos = new Vec3(Math.floor(spot[B][0]) + 1, Y, Math.floor(spot[B][1]) + 1)
    const bannerIcon = iconAt(bannerPos.x + 0.5, bannerPos.z + 0.5)
    // Whether the viewer's latest map packet (it always lists every marker) has a label at the banner.
    let nudge = 0
    const label = async () => {
      packets[VIEW] = []
      // Moving the viewer's own arrow makes the server send it a fresh map packet.
      nudge = 1 - nudge
      await rcon.cmd(`minecraft:tp ${VIEW} ${spot[VIEW][0]} ${Y} ${spot[VIEW][1] + nudge}`)
      await sleep(1500)
      const last = packets[VIEW][packets[VIEW].length - 1]
      const shown = Boolean(last) && last.icons.some(i => i.type !== PLAYER_ICON && Math.abs(i.x - bannerIcon[0]) <= 1 && Math.abs(i.z - bannerIcon[1]) <= 1)
      return { got: packets[VIEW].length, shown }
    }
    await rcon.cmd(`setblock ${bannerPos.x} ${bannerPos.y} ${bannerPos.z} red_banner{CustomName:'Zz'}`)
    await sleep(500)
    const clickBanner = async () => {
      bots[B].setQuickBarSlot(8)
      await sleep(300)
      try { await bots[B].activateBlock(bots[B].blockAt(bannerPos)) } catch (err) { /* checked below */ }
      await sleep(800)
    }
    await clickBanner()
    let l = await label()
    check('a phone click on a banner adds no map label', l.got > 0 && !l.shown, `${l.got} packets, label ${l.shown}`)
    await rcon.cmd(`lp user ${B} permission set donating.inventory.bypass true`)
    await sleep(1500)
    await clickBanner()
    l = await label()
    check('control (bypass): the same click adds the label', l.shown, `${l.got} packets, label ${l.shown}`)
    await clickBanner() // toggles the label off again
    await rcon.cmd(`lp user ${B} permission unset donating.inventory.bypass`)
    await rcon.cmd(`setblock ${bannerPos.x} ${bannerPos.y} ${bannerPos.z} air`)
  } finally {
    await rcon.cmd(`lp user ${B} permission unset donating.inventory.bypass`).catch(() => {})
    for (const name of [VIEW, A, B]) await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
    for (const bot of Object.values(bots)) await quit(bot)
    if (platform) await rcon.cmd(`fill ${platform} air replace glass`).catch(() => {})
    rcon.close()
  }
}
