// DonatingPhone plugin + phone.sk + nav.sk: the phone's screen. Each bot's own map packets are the
// truth: they hold the pixels and the icons (arrows, labels) that bot's client draws.
//   - Every player has their own phone map id (a pool in the plugin), carried by the slot-8 phone.
//   - The city is one map or a grid of maps (plugins\DonatingPhone\config.yml, city-maps). The held
//     phone is a GPS view of it that follows you; the big map shrinks the whole city to fit. Both
//     are compared pixel by pixel with the map files.
//   - Passive players show on everyone's phone as a green arrow; nobody else does. Names only on the
//     big map, while the cursor (moved by turning your head) is on the arrow. The big map uses
//     smaller arrows (the resource pack draws them).
//   - Right-click: the big map, bag out of the offhand, camera tilted once; every way of leaving it
//     (right-click, slot change, F, death, reconnect) puts the bag back.
//   - Banner labels on the city map show on every phone; the banner lock still stops players adding them.
// Also: the locator-bar range, and that an old map cloak (before the plugin) is taken off.
const fs = require('fs')
const path = require('path')
const nbt = require('prismarine-nbt')
const { Vec3 } = require('vec3')
const conv = require('mineflayer/lib/conversions')
const { join, sleep, messagesSince, colorOf, quit } = require('../lib')
const rconLib = require('../rcon')

const VIEW = 'NavViewer'
const A = 'NavAlpha'
const B = 'NavBravo'
// map_decoration_type registry ids
const PLAYER_ICON = 0
const FRAME_ICON = 1 // the green arrow
const SMALL_SELF = 32 // jungle_temple, drawn by the pack as a small white arrow
const SMALL_PASSIVE = 33 // swamp_hut, drawn by the pack as a small green arrow
const isBanner = i => i.type >= 10 && i.type <= 25
const Y = 150 // glass platform in the sky, inside the first city map
const SERVER = path.join(__dirname, '..', '..', 'server')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bots = {}
  let platform = null // the glass platform's corners, removed again at the end
  let bannerPos = null
  try {
    const status = async name => (await rcon.cmd(`dphone status ${name}`)).trim()
    const zz = async name => (await rcon.cmd(`zzphone ${name}`)).trim()

    // ---------- The city, from the plugin config and the map files ----------
    await rcon.cmd('dphone')
    await rcon.cmd('save-all flush')
    const config = fs.readFileSync(path.join(SERVER, 'plugins', 'DonatingPhone', 'config.yml'), 'utf8')
    const grid = JSON.parse((config.match(/^city-maps:\s*(\[.*\])\s*$/m) || [])[1] || '[]')
    const tiles = []
    for (const row of grid) {
      const r = []
      for (const id of row) r.push({ id, ...nbt.simplify((await nbt.parse(fs.readFileSync(path.join(SERVER, 'world', 'data', `map_${id}.dat`)))).parsed).data })
      tiles.push(r)
    }
    const first = tiles[0] && tiles[0][0]
    const scale = (first && first.scale) || 0 // fields at their default are left out of the file
    const unit = 1 << scale
    const W = 128 * grid[0].length
    const H = 128 * grid.length
    const x0 = first.xCenter - 64 * unit
    const z0 = first.zCenter - 64 * unit
    const aligned = tiles.every((row, r) => row.every((t, c) => (t.scale || 0) === scale && t.xCenter === first.xCenter + c * 128 * unit && t.zCenter === first.zCenter + r * 128 * unit))
    check('the city maps sit side by side', aligned, `${JSON.stringify(grid)}: ${W * unit}x${H * unit} blocks, scale ${scale}`)
    const img = new Uint8Array(W * H)
    tiles.forEach((row, r) => row.forEach((t, c) => {
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) img[(r * 128 + y) * W + c * 128 + x] = t.colors[y * 128 + x] & 255
    }))
    const zoom = 2 // config: zoom
    const f = Math.max(1, Math.max(W, H) / 128) // big map: city pixels per screen pixel
    // The plugin's view: screen pixel -> city pixel, for a center (cx, cz) and scale s.
    const expected = (cx, cz, s, rows = 128) => {
      const out = new Uint8Array(128 * 128)
      for (let y = 0; y < rows; y++) {
        const iz = Math.floor(cz + (y - 64 + 0.5) * s)
        for (let x = 0; x < 128; x++) {
          const ix = Math.floor(cx + (x - 64 + 0.5) * s)
          out[y * 128 + x] = ix >= 0 && iz >= 0 && ix < W && iz < H ? img[iz * W + ix] : 0
        }
      }
      return out
    }
    const bigAt = (x, z) => [Math.round(((x - x0) / unit - W / 2) / f * 2), Math.round(((z - z0) / unit - H / 2) / f * 2)] // big-map icon units
    const bigPixel = (x, z) => [((x - x0) / unit - W / 2) / f + 64, ((z - z0) / unit - H / 2) / f + 64] // big-map screen pixel
    const cx = first.xCenter
    const cz = first.zCenter
    const spot = { [VIEW]: [cx + 10.5, cz + 10.5], [A]: [cx + 20.5, cz + 10.5], [B]: [cx + 10.5, cz + 20.5] }

    // Every map packet per bot, for its own phone map, and the screen those packets add up to.
    const packets = {}
    const screen = {}
    const faced = {}
    const mapOf = {}
    const listen = name => {
      packets[name] = []
      screen[name] = new Uint8Array(128 * 128)
      faced[name] = 0
      bots[name]._client.on('map', p => {
        if (p.itemDamage !== mapOf[name]) return
        if (p.columns) {
          for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.columns; c++) screen[name][(p.y + r) * 128 + p.x + c] = p.data[r * p.columns + c]
        }
        packets[name].push({ t: Date.now(), icons: p.icons && p.icons.map(i => ({ type: i.type, x: i.x, z: i.z, name: i.displayName })), cols: p.columns, rows: p.rows, data: p.data })
      })
      // The look-at packet (camera tilt when the big map opens): turn like a real client does.
      bots[name]._client.on('face_player', p => { faced[name]++; bots[name].lookAt(new Vec3(p.x, p.y, p.z), true) })
    }
    // Share of screen pixels (rows 0..rows-1, minus a square around `skip`) equal to `want`.
    const match = (name, want, rows = 128, skip = null) => {
      let same = 0
      let n = 0
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < 128; x++) {
          if (skip && Math.abs(x - skip[0]) <= 4 && Math.abs(y - skip[1]) <= 4) continue
          n++
          if (screen[name][y * 128 + x] === want[y * 128 + x]) same++
        }
      }
      return same / n
    }
    const readIds = async () => {
      for (const name of [VIEW, A, B]) mapOf[name] = Number(((await status(name)).match(/map=(\d+)/) || [])[1])
    }
    // The checks count green arrows, so nobody else online may be passive.
    const passiveOnline = (await rcon.cmd('execute if entity @a[tag=donating_passive]')).trim()
    check('no other passive players are online (the checks count green arrows)', /Test failed/.test(passiveOnline), passiveOnline)
    for (const name of [VIEW, A, B]) {
      bots[name] = await join(name)
      listen(name)
    }
    platform = `${cx + 8} ${Y - 1} ${cz + 8} ${cx + 35} ${Y - 1} ${cz + 23}` // A walks east to x+30
    await rcon.cmd(`fill ${platform} glass`)
    for (const name of [VIEW, A, B]) {
      await rcon.cmd(`gamemode survival ${name}`)
      await rcon.cmd(`minecraft:tp ${name} ${spot[name][0]} ${Y} ${spot[name][1]} 0 0`)
      await rcon.cmd(`zzclear ${name}`)
      await rcon.cmd(`zzpassive ${name} off`)
    }
    await rcon.cmd(`zztestkit ${VIEW}`) // VIEW carries a bag (offhand), the others don't
    await readIds()

    // ---------- One phone map per player ----------
    const poolFile = fs.readFileSync(path.join(SERVER, 'plugins', 'DonatingPhone', 'pool.yml'), 'utf8')
    const poolIds = ((poolFile.match(/^pool:\n((?:- \d+\n?)+)/m) || [])[1] || '').match(/\d+/g) || []
    const ids = [VIEW, A, B].map(n => mapOf[n])
    const cityIds = grid.flat()
    check('every player gets their own phone map', new Set(ids).size === 3 && ids.every(id => poolIds.includes(String(id)) && !cityIds.includes(id)), `ids ${ids}, pool ${poolIds}`)
    const zzs = [] // one RCON command at a time: the server drops the connection otherwise
    for (const name of [VIEW, A, B]) zzs.push(await zz(name))
    check('the slot-8 phone carries that map id', [VIEW, A, B].every((n, i) => zzs[i].includes(` meta=${mapOf[n]} slot8=${mapOf[n]} `)), zzs.join(' | '))

    // ---------- Held screen ----------
    const bot = bots[VIEW]
    bot.setQuickBarSlot(8) // the held view is drawn somewhere else first
    await rcon.cmd(`minecraft:tp ${VIEW} ${spot[VIEW][0]} ${Y} ${spot[VIEW][1] + 10} 0 0`)
    await sleep(800)
    bot.setQuickBarSlot(0)
    await sleep(800)
    packets[VIEW] = []
    // Pocketed, VIEW moves 10 blocks (several re-centers of a held view): nothing may be drawn.
    await rcon.cmd(`minecraft:tp ${VIEW} ${spot[VIEW][0]} ${Y} ${spot[VIEW][1]} 0 0`)
    await sleep(1500)
    check('no pixels are sent while the phone is in the pocket (even when you move)', packets[VIEW].length > 0 && packets[VIEW].every(p => !p.cols), `${packets[VIEW].filter(p => p.cols).length} pixel packets of ${packets[VIEW].length}`)
    packets[VIEW] = []
    let t = Date.now()
    bot.setQuickBarSlot(8)
    await sleep(400)
    let full = packets[VIEW].find(p => p.cols === 128 && p.rows === 128)
    check('taking the phone out sends the whole screen at once', full && full.t - t < 400, full ? `${full.t - t} ms` : `${packets[VIEW].length} packets, none full`)
    const row = (y) => [...new Set(screen[VIEW].slice(y * 128, (y + 1) * 128))]
    check('the held screen has the hint strip', row(119).join() === '119' && row(124).includes(34), `row 119 ${row(119)}, row 124 ${row(124)}`)
    const heldCenter = ([x, z]) => [Math.round((x - x0) / unit * zoom) / zoom, Math.round((z - z0) / unit * zoom) / zoom]
    let share = match(VIEW, expected(...heldCenter(spot[VIEW]), 1 / zoom, 119), 119)
    check('the held screen is the city around you, zoomed in', share > 0.98, `${(share * 100).toFixed(1)}% of pixels match the map files`)

    for (const name of [A, B]) bots[name].setQuickBarSlot(8)
    await sleep(1000)

    // Icons per packet in a window, per bot.
    const window = async ms => {
      for (const name of [VIEW, A, B]) packets[name] = []
      await sleep(ms)
      return { of: name => packets[name].filter(p => p.icons) }
    }
    const own = p => p.icons.filter(i => i.type === PLAYER_ICON)
    const others = p => p.icons.filter(i => i.type !== PLAYER_ICON)
    const iconName = i => i.name ? require('prismarine-chat')(bot.registry).fromNotch(i.name) : null
    const all = (list, fn) => list.length > 0 && list.every(fn)
    const centered = p => own(p).length === 1 && Math.abs(own(p)[0].x) <= 8 && Math.abs(own(p)[0].z) <= 8
    // One green arrow, offset (dx, dz) blocks from the viewer, in held-view icon units.
    const greenAt = (p, dx, dz) => others(p).length === 1 && others(p)[0].type === FRAME_ICON &&
      Math.abs(others(p)[0].x - own(p)[0].x - dx / unit * zoom * 2) <= 2 && Math.abs(others(p)[0].z - own(p)[0].z - dz / unit * zoom * 2) <= 2

    // ---------- Round 1: VIEW and A non-passive, B passive ----------
    t = Date.now()
    await rcon.cmd(`zzpassive ${A} off`)
    await rcon.cmd(`zzpassive ${B} on`)
    await sleep(1500)
    check('passive on tells the player they show on maps', messagesSince(bots[B], t).some(m => /Passive mode on\. Other players can now see you on their map/.test(m.text)), messagesSince(bots[B], t).map(m => m.text).join(' | '))
    check('passive off tells the player they are hidden', messagesSince(bots[A], t).some(m => /Passive mode off\. You're hidden from other players' maps/.test(m.text)), messagesSince(bots[A], t).map(m => m.text).join(' | '))
    let w = await window(3000)
    const vp = w.of(VIEW)
    const lastIcons = list => JSON.stringify(list.slice(-1)[0] && list.slice(-1)[0].icons)
    check('held view: you are in the middle', all(vp, centered), lastIcons(vp))
    // B stands 10 blocks south of VIEW.
    check('viewer sees only the passive player (one green arrow, in the right place), never the non-passive one', all(vp, p => centered(p) && greenAt(p, 0, 10)), `${vp.filter(p => centered(p) && greenAt(p, 0, 10)).length}/${vp.length} packets; last ${lastIcons(vp)}`)
    check('the held phone shows no names', all(vp, p => p.icons.every(i => !i.name)), lastIcons(vp))
    const ap = w.of(A)
    // B is 10 blocks west and 10 south of A.
    check('non-passive player sees itself and the passive one, never the other non-passive one', all(ap, p => centered(p) && greenAt(p, -10, 10)), `${ap.filter(p => centered(p) && greenAt(p, -10, 10)).length}/${ap.length} packets`)
    const bp = w.of(B)
    check('passive player never sees non-passive players', all(bp, p => centered(p) && others(p).length === 0), `${bp.filter(p => others(p).length === 0).length}/${bp.length} packets`)

    const range = async name => Number(((await rcon.cmd(`attribute ${name} minecraft:waypoint_transmit_range get`)).match(/is ([\d.E+-]+)/) || [])[1])
    check('locator bar: passive player sends a waypoint', (await range(B)) > 0, `range ${await range(B)}`)
    check('locator bar: non-passive player sends none', (await range(A)) === 0, `range ${await range(A)}`)

    // Vanished staff (Player#canSee): hidden players stay off the map.
    await rcon.cmd(`zzhide ${VIEW} donating_passive`)
    w = await window(2000)
    check('a passive player the viewer can\'t see stays off the map', all(w.of(VIEW), p => others(p).length === 0), `${w.of(VIEW).filter(p => others(p).length).length}/${w.of(VIEW).length} packets with others`)
    await rcon.cmd(`zzshow ${VIEW} donating_passive`)

    // ---------- Round 2: flip them ----------
    await rcon.cmd(`zzpassive ${A} on`)
    await rcon.cmd(`zzpassive ${B} off`)
    await sleep(1500)
    w = await window(3000)
    // A stands 10 blocks east of VIEW.
    check('after switching, viewer sees only the new passive player', all(w.of(VIEW), p => greenAt(p, 10, 0)), `${w.of(VIEW).filter(p => greenAt(p, 10, 0)).length}/${w.of(VIEW).length} packets; last ${lastIcons(w.of(VIEW))}`)

    // ---------- Moving ----------
    // A walks 20 blocks east in 1-block steps: its view re-centers every few blocks (not every
    // step), its arrow stays near the middle, and nobody else gets pixels from it.
    for (const name of [VIEW, A, B]) packets[name] = []
    for (let i = 1; i <= 20; i++) {
      await rcon.cmd(`minecraft:tp ${A} ${spot[A][0] - 10 + i} ${Y} ${spot[A][1]}`)
      await sleep(100)
    }
    await sleep(600)
    const step = 4 / zoom * unit // blocks between re-centers (follow-step 4 screen pixels)
    const patches = packets[A].filter(p => p.cols).length
    check('the held map follows you in steps, not every move', patches >= 20 / step / 2 && patches <= 20 / step * 1.5 + 1, `${patches} pixel packets for 20 blocks (step ${step})`)
    check('...and your arrow stays near the middle', all(packets[A].filter(p => p.icons), centered), JSON.stringify(packets[A].filter(p => p.icons).map(p => own(p)[0]).slice(-3)))
    check('other players moving sends you no pixels', packets[VIEW].every(p => !p.cols), `${packets[VIEW].filter(p => p.cols).length} pixel packets`)

    // ---------- Big map ----------
    const bag = async name => ((await zz(name)).match(/offhand=(.*)$/) || [])[1]
    const isOpen = async name => / open=true/.test(await zz(name))
    const cursorOf = async name => ((await status(name)).match(/cursor=(-?\d+),(-?\d+)/) || []).slice(1).map(Number)
    const bagBefore = await bag(VIEW)
    check('the viewer has a bag in the offhand', bagBefore === 'leather', bagBefore)
    const rightClick = async () => { bot.activateItem(); await sleep(700) }
    packets[VIEW] = []
    faced[VIEW] = 0
    await rightClick()
    check('right-click opens the big map and takes the bag out of the offhand', (await isOpen(VIEW)) && (await bag(VIEW)) === 'air', await zz(VIEW))
    check('the camera tilts down once', faced[VIEW] === 1, `${faced[VIEW]} look-at packets`)
    await sleep(1500)
    check('the camera is tilted down', Math.abs(conv.toNotchianPitch(bot.entity.pitch) - 70) <= 2, `pitch ${conv.toNotchianPitch(bot.entity.pitch).toFixed(1)}`)
    let cur = await cursorOf(VIEW)
    check('the cursor starts in the middle', cur[0] === 64 && cur[1] === 64 && screen[VIEW][64 * 128 + 64] === 34, `cursor ${cur}, pixel ${screen[VIEW][64 * 128 + 64]}`)
    share = match(VIEW, expected(W / 2, H / 2, f), 128, [64, 64])
    check('the big map shows the whole city, shrunk to fit', share > 0.98, `${(share * 100).toFixed(1)}% of pixels match (${W * unit}x${H * unit} blocks, ${f} city pixels per screen pixel)`)
    let big = packets[VIEW].filter(p => p.icons).slice(-1)[0]
    const me = big && big.icons.find(i => i.type === SMALL_SELF)
    const want = bigAt(...spot[VIEW])
    check('your arrow is the small one, at your real spot', me && Math.abs(me.x - want[0]) <= 1 && Math.abs(me.z - want[1]) <= 1, `${JSON.stringify(me)}, expected ${want}; ${JSON.stringify(big && big.icons)}`)
    const aPos = [spot[A][0] + 10, spot[A][1]] // where A's walk ended
    const aWant = bigAt(...aPos)
    const aIcon = big && big.icons.find(i => i.type === SMALL_PASSIVE)
    check('the passive player is a small green arrow at their spot (it scales with the zoom)', aIcon && Math.abs(aIcon.x - aWant[0]) <= 1 && Math.abs(aIcon.z - aWant[1]) <= 1, `${JSON.stringify(aIcon)}, expected ${aWant}`)
    check('no names while the cursor is elsewhere', big && big.icons.every(i => !i.name), JSON.stringify(big && big.icons))

    // Hover: turning the head moves the cursor (cursor-speed 3 pixels per degree).
    const yaw0 = conv.toNotchianYaw(bot.entity.yaw)
    const pitch0 = conv.toNotchianPitch(bot.entity.pitch)
    const aim = async ([x, y]) => {
      await bot.look(conv.fromNotchianYaw(yaw0 + (x - 64) / 3), conv.fromNotchianPitch(pitch0 + (y - 64) / 3), true)
      await sleep(900)
    }
    const aScreen = bigPixel(...aPos)
    packets[VIEW] = []
    await aim(aScreen)
    cur = await cursorOf(VIEW)
    const onA = Math.abs(cur[0] - aScreen[0]) <= 1.5 && Math.abs(cur[1] - aScreen[1]) <= 1.5
    check('turning the head moves the cursor', onA && screen[VIEW][cur[1] * 128 + cur[0]] === 34 && screen[VIEW][64 * 128 + 64] === expected(W / 2, H / 2, f)[64 * 128 + 64], `cursor ${cur}, target ${aScreen.map(v => v.toFixed(1))}`)
    big = packets[VIEW].filter(p => p.icons).slice(-1)[0]
    const hovered = big && big.icons.find(i => i.type === SMALL_PASSIVE)
    const hName = hovered && iconName(hovered)
    check('the cursor on a passive arrow shows their name in green', hName && hName.toString() === A && colorOf(hName.json, A) === 'green', hName ? `${hName} (${colorOf(hName.json, A)})` : JSON.stringify(big && big.icons))
    packets[VIEW] = []
    await aim([100, 100])
    big = packets[VIEW].filter(p => p.icons).slice(-1)[0]
    check('moving the cursor away hides the name again', big && big.icons.every(i => !i.name), JSON.stringify(big && big.icons))

    packets[VIEW] = []
    await rightClick()
    check('right-click again closes it and puts the bag back', !(await isOpen(VIEW)) && (await bag(VIEW)) === 'leather', await zz(VIEW))
    await sleep(300)
    check('...and the held screen comes back', row(119).join() === '119' && match(VIEW, expected(...heldCenter(spot[VIEW]), 1 / zoom, 119), 119) > 0.98, `row 119 ${row(119)}`)

    // Every other way out of the big map.
    const closesOn = async (label, how, after = async () => {}) => {
      await sleep(400)
      await rightClick()
      const opened = await isOpen(VIEW)
      await how()
      await after()
      check(`${label} closes the big map and puts the bag back`, opened && !(await isOpen(VIEW)) && (await bag(VIEW)) === 'leather', `${opened ? 'opened' : 'did not open'}; ${await zz(VIEW)}`)
    }
    await closesOn('switching slots', async () => { bot.setQuickBarSlot(0); await sleep(700) }, async () => { bot.setQuickBarSlot(8); await sleep(300) })
    await closesOn('F (apps menu)', async () => {
      bot._client.write('block_dig', { status: 6, location: new Vec3(0, 0, 0), face: 0, sequence: 0 })
      await sleep(900)
    }, async () => { if (bot.currentWindow) bot.closeWindow(bot.currentWindow); await sleep(300) })
    await closesOn('dying', async () => {
      await rcon.cmd(`minecraft:kill ${VIEW}`)
      await sleep(2500)
    }, async () => {
      await rcon.cmd(`minecraft:tp ${VIEW} ${spot[VIEW][0]} ${Y} ${spot[VIEW][1]} 0 0`)
      bot.setQuickBarSlot(8)
      await sleep(300)
    })
    await sleep(400)
    await rightClick()
    const openBefore = await isOpen(VIEW)
    await quit(bot)
    await sleep(1000)
    bots[VIEW] = await join(VIEW)
    listen(VIEW)
    await sleep(1500)
    await readIds()
    const again = await zz(VIEW)
    check('leaving and coming back closes it and puts the bag back', openBefore && / open=false/.test(again) && / offhand=leather/.test(again) && again.includes(` meta=${mapOf[VIEW]} slot8=${mapOf[VIEW]} `), `${openBefore ? 'opened' : 'did not open'}; ${again}`)
    await rcon.cmd(`minecraft:tp ${VIEW} ${spot[VIEW][0]} ${Y} ${spot[VIEW][1]} 0 0`)
    const viewer = bots[VIEW]
    viewer.setQuickBarSlot(8)
    await sleep(500)

    // ---------- Banner labels ----------
    // Staff label the city map by right-clicking named banners with a plain copy of it (bypass);
    // /dphone re-reads it. Players can't: the phone click toggles the map, the lock stops copies.
    bannerPos = new Vec3(Math.floor(spot[B][0]) + 1, Y, Math.floor(spot[B][1]) + 1)
    const bannerWant = bigAt(bannerPos.x + 0.5, bannerPos.z + 0.5)
    // The plugin re-reads the city map on the next render after /dphone (VIEW holds its phone).
    const pois = async () => {
      await rcon.cmd('dphone')
      for (let i = 0; i < 30; i++) {
        const st = await status(VIEW)
        if (/cityRead=true/.test(st)) return Number((st.match(/pois=(\d+)/) || [])[1])
        await sleep(100)
      }
      return -1
    }
    await rcon.cmd(`setblock ${bannerPos.x} ${bannerPos.y} ${bannerPos.z} red_banner{CustomName:'Zz'}`)
    await sleep(500)
    await rcon.cmd(`minecraft:item replace entity ${B} hotbar.0 with filled_map[map_id=${first.id}]`)
    const clickBanner = async hotbar => {
      bots[B].setQuickBarSlot(hotbar)
      await sleep(300)
      try { await bots[B].activateBlock(bots[B].blockAt(bannerPos)) } catch (err) { /* checked below */ }
      await sleep(800)
      if (bots[B].currentWindow) bots[B].closeWindow(bots[B].currentWindow)
    }
    await clickBanner(8)
    // The phone's own map (a pool map) must not get the banner either.
    await rcon.cmd('save-all flush')
    const phoneMap = nbt.simplify((await nbt.parse(fs.readFileSync(path.join(SERVER, 'world', 'data', `map_${mapOf[B]}.dat`)))).parsed).data
    const phoneBanners = (phoneMap.banners || []).length
    check('a phone click on a banner toggles the map and adds no label anywhere', phoneBanners === 0 && (await pois()) === 0 && (await isOpen(B)), `${phoneBanners} banners on the phone's map ${mapOf[B]}; ${await pois()} city labels; ${await zz(B)}`)
    await clickBanner(0) // also switches slots, which closes B's big map
    check('a plain map copy adds no label either (banner lock)', (await pois()) === 0, `${await pois()} labels`)
    await rcon.cmd(`lp user ${B} permission set donating.inventory.bypass true`)
    await sleep(1500)
    await clickBanner(0)
    check('control (bypass, plain map copy): the click adds the label', (await pois()) === 1, `${await pois()} labels`)
    packets[VIEW] = []
    await sleep(1500)
    let bp2 = packets[VIEW].filter(p => p.icons).slice(-1)[0]
    let banner = bp2 && bp2.icons.find(isBanner)
    const bname = banner && iconName(banner)
    const bRel = [(bannerPos.x + 0.5 - spot[VIEW][0]) / unit * zoom * 2, (bannerPos.z + 0.5 - spot[VIEW][1]) / unit * zoom * 2]
    check('labels show on the held phone', banner && bname && bname.toString() === 'Zz' && Math.abs(banner.x - own(bp2)[0].x - bRel[0]) <= 3 && Math.abs(banner.z - own(bp2)[0].z - bRel[1]) <= 3, banner ? `${bname} at ${banner.x - own(bp2)[0].x},${banner.z - own(bp2)[0].z}, expected ${bRel}` : JSON.stringify(bp2 && bp2.icons))
    viewer.activateItem()
    await sleep(1500)
    bp2 = packets[VIEW].filter(p => p.icons).slice(-1)[0]
    banner = bp2 && bp2.icons.find(isBanner)
    check('...and on the big map, where the banner is', banner && Math.abs(banner.x - bannerWant[0]) <= 1 && Math.abs(banner.z - bannerWant[1]) <= 1, banner ? `${banner.x},${banner.z}, expected ${bannerWant}` : 'no label')
    viewer.activateItem()
    await clickBanner(0) // toggles the label off again
    await rcon.cmd(`lp user ${B} permission unset donating.inventory.bypass`)
    await rcon.cmd(`setblock ${bannerPos.x} ${bannerPos.y} ${bannerPos.z} air`)
    check('removing the label takes it off the phones', (await pois()) === 0, `${await pois()} labels`)

    // ---------- Old map cloak ----------
    await rcon.cmd(`minecraft:item replace entity ${B} armor.feet with structure_void[custom_data={donating_id:'map-cloak'},equippable={slot:'feet'}]`)
    const hadCloak = /36=structure void x1 \[map-cloak\]/.test(await rcon.cmd(`zzdump ${B}`))
    await rcon.cmd(`zzpassive ${B} off`)
    const dump = await rcon.cmd(`zzdump ${B}`)
    check('an old map cloak is taken off', hadCloak && !/36=/.test(dump), `${hadCloak ? 'had it' : 'setup failed'}; ${dump.trim()}`)
  } finally {
    await rcon.cmd(`lp user ${B} permission unset donating.inventory.bypass`).catch(() => {})
    if (bannerPos) await rcon.cmd(`setblock ${bannerPos.x} ${bannerPos.y} ${bannerPos.z} air`).catch(() => {})
    for (const name of [VIEW, A, B]) {
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`minecraft:tp ${name} 0.5 68 -656.5`).catch(() => {}) // solid ground near spawn
    }
    for (const b of Object.values(bots)) await quit(b)
    if (platform) await rcon.cmd(`fill ${platform} air replace glass`).catch(() => {})
    await rcon.cmd('dphone').catch(() => {})
    rcon.close()
  }
}
