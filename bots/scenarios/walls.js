// Wall maps (DonatingPhone /dphone wall, 2026-09-29; the ideas list: "a big wall map at the base"): staff hang a grid of
// invisible, fixed glow frames on a wall, each with a map of its own, and together they show the whole city (the phone's
// city image, scaled to fit), every place named, and a "You are here" arrow at the wall. Checked: the frames, the
// picture against the city maps (2x2: pixel for pixel; 1x1: every other pixel), the icons, refusals, a reload, removing.
// Also (review fixes): the block behind a frame broken doesn't drop it, a killed frame comes back with /dphone wall repair,
// and the owner's city source (city.yml) is put back afterwards.
const fs = require('fs')
const path = require('path')
const nbt = require('prismarine-nbt')
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const P = 'WallBot'
const SERVER = path.join(__dirname, '..', '..', 'server')
const CITY_YML = path.join(SERVER, 'plugins', 'DonatingPhone', 'city.yml')
const WX = 100 // the wall's bottom-left block (the 2x2 wall: x 100-101, y 150-151; the 1x1 wall: x 97)
const WY = 150
const WZ = -600
const BACKGROUND = 119 // outside the city
const CHUNKS = `${WX - 8} ${WZ - 8} ${WX + 8} ${WZ + 12}`
const FRAME_ICON = 1 // the green arrow ("You are here")
const BANNER_ORANGE = 11 // a shop

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  let poiId = ''
  // The owner's choice of city (the scan or the maps): kept aside while the test uses the maps.
  const hadCityYml = fs.existsSync(CITY_YML)
  if (hadCityYml) fs.copyFileSync(CITY_YML, CITY_YML + '.testbak')
  try {
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const until = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(400) } return Boolean(await fn()) }
    const frames = async sel => Number(((await cmd(`execute if entity @e[${sel}]`)).match(/Count: (\d+)/) || [])[1] || 0)
    const idsOf = async name => ((await cmd('dphone wall list')).match(new RegExp(`WALL ${name} .* ids=([\\d,]+)`)) || [])[1]?.split(',').map(Number) || []

    // ---------- The city (the maps, as the other tests use it) ----------
    const config0 = fs.readFileSync(path.join(SERVER, 'plugins', 'DonatingPhone', 'config.yml'), 'utf8')
    if (!/^city-maps:\s*\[\[/m.test(config0)) { check('this test needs the local test city (city-maps in DonatingPhone\'s config.yml)', false, 'no city-maps'); return }
    await cmd('dphone city use maps')
    await cmd('dphone wall remove ztest')
    await cmd('dphone wall remove zsmall')
    await cmd('save-all flush')
    const config = fs.readFileSync(path.join(SERVER, 'plugins', 'DonatingPhone', 'config.yml'), 'utf8')
    const grid = JSON.parse((config.match(/^city-maps:\s*(\[.*\])\s*$/m) || [])[1] || '[]')
    const W = 128 * grid[0].length
    const H = 128 * grid.length
    const img = new Uint8Array(W * H)
    let x0 = 0, z0 = 0
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) {
      const t = nbt.simplify((await nbt.parse(fs.readFileSync(path.join(SERVER, 'world', 'data', 'minecraft', 'maps', `${grid[r][c]}.dat`)))).parsed).data
      if (r === 0 && c === 0) { x0 = t.xCenter - 64 * (1 << (t.scale || 0)); z0 = t.zCenter - 64 * (1 << (t.scale || 0)) }
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) img[(r * 128 + y) * W + c * 128 + x] = t.colors[y * 128 + x] & 255
    }
    const want = v => (v === 0 ? BACKGROUND : v)

    // ---------- The wall and a bot in front of it ----------
    await cmd(`forceload add ${CHUNKS}`)
    await sleep(1500)
    await cmd(`fill ${WX - 5} ${WY - 1} ${WZ - 1} ${WX + 6} ${WY + 3} ${WZ + 10} air`)
    await cmd(`fill ${WX} ${WY} ${WZ} ${WX + 1} ${WY + 1} ${WZ} stone`)
    await cmd(`setblock ${WX - 3} ${WY} ${WZ} stone`)
    await cmd(`fill ${WX - 5} ${WY - 1} ${WZ + 1} ${WX + 6} ${WY - 1} ${WZ + 10} glass`)
    bot = await join(P)
    const screens = {}
    const icons = {}
    bot._client.on('map', p => {
      if (p.icons) icons[p.itemDamage] = p.icons.map(i => ({ type: i.type, x: i.x, z: i.z, name: i.displayName ? JSON.stringify(i.displayName) : '' }))
      if (!p.columns) return
      const s = screens[p.itemDamage] || (screens[p.itemDamage] = new Uint8Array(128 * 128))
      for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.columns; c++) s[(p.y + r) * 128 + p.x + c] = p.data[r * p.columns + c]
    })
    await cmd(`gamemode survival ${P}`)
    await cmd(`zzclear ${P}`)
    await cmd(`lp user ${P} permission set donating.staff true`)
    await sleep(2500)
    // In front of the wall (tried again if something moved the bot, e.g. a join teleport right after a restart).
    const atWall = () => bot.entity && Math.abs(bot.entity.position.x - (WX + 0.5)) < 2 && Math.abs(bot.entity.position.y - WY) < 1.5 && Math.abs(bot.entity.position.z - (WZ + 5.5)) < 2
    for (let i = 0; i < 4 && (i === 0 || !atWall()); i++) {
      await cmd(`minecraft:tp ${P} ${WX + 0.5} ${WY} ${WZ + 5.5} 180 0`)
      await sleep(1500)
    }
    const where = () => bot.entity ? `${bot.entity.position.x.toFixed(1)},${bot.entity.position.y.toFixed(1)},${bot.entity.position.z.toFixed(1)}` : 'none'

    // ---------- Refusals ----------
    const noBack = await cmd(`dphone wall create zbad 2 1 world ${WX - 2} ${WY} ${WZ} south`)
    const up = await cmd(`dphone wall create zbad 1 1 world ${WX} ${WY} ${WZ} up`)
    const huge = await cmd(`dphone wall create zbad 9 1 world ${WX} ${WY} ${WZ} south`)
    check('refused: a frame with no solid block behind it, a floor or ceiling, more than 8 maps a side', /needs a solid block behind every frame/.test(noBack) && /only on a wall/.test(up) && /1-8 maps a side/.test(huge), `${noBack} | ${up} | ${huge}`)

    // ---------- A 2x2 wall ----------
    const made = await cmd(`dphone wall create ztest 2 2 world ${WX} ${WY} ${WZ} south`)
    const ids = await idsOf('ztest')
    const again = await cmd(`dphone wall create ztest 1 1 world ${WX - 3} ${WY} ${WZ} south`)
    check('/dphone wall create: 4 maps in 4 invisible, fixed glow frames on the wall (a name only once)',
      /WALL ztest 2x2 made/.test(made) && ids.length === 4 && await frames('type=glow_item_frame,tag=wall_ztest,nbt={Fixed:1b,Invisible:1b}') === 4 && /exists/.test(again), `${made} | ${ids} | ${again}`)
    const stacked = await cmd(`dphone wall create zstack 2 2 world ${WX} ${WY} ${WZ} south`)
    check('a second wall on the same spot is refused (the frames already there are seen)', /no room for a frame/.test(stacked) && await frames('tag=wall_zstack') === 0, stacked)
    const got = await until(async () => ids.every(id => screens[id]), 15000)
    await sleep(1500)
    // The top-left map is ids[0]; a 256x256 city on a 256x256 wall is pixel for pixel.
    let same = 0
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const s = screens[ids[(y >> 7) * 2 + (x >> 7)]]
      if (s && s[(y & 127) * 128 + (x & 127)] === want(img[y * W + x])) same++
    }
    check('the wall shows the whole city, pixel for pixel (a 256x256 city on 2x2 maps; outside the city dark)', got && same === 256 * 256, `${got} ${same}/${256 * 256} bot at ${where()} maps seen ${Object.keys(screens)}`)
    // "You are here": the green arrow on the map where the wall is (in front of block x 100, z -600: city pixel 164.5, 105.5 = the top-right map).
    const hereX = Math.round(((WX + 0.5 - x0) - 128 - 64) * 2)
    const hereZ = Math.round(((WZ + 1.5 - z0) - 64) * 2)
    const here = (icons[ids[1]] || []).find(i => i.type === FRAME_ICON)
    check('"You are here": a green arrow where the wall stands, with its name', here && Math.abs(here.x - hereX) <= 2 && Math.abs(here.z - hereZ) <= 2 && /You are here/.test(here.name), `${JSON.stringify(here)} want ${hereX},${hereZ}`)

    // ---------- A place shows, named ----------
    let t = Date.now()
    bot.chat('/dpoi add shop Wall Shop')
    await sleep(1000)
    poiId = (text(t).match(/POI (\d+) shop at/) || [])[1] || ''
    const named = await until(async () => (icons[ids[1]] || []).some(i => i.type === BANNER_ORANGE && /Wall Shop/.test(i.name)), 15000)
    check('a place (a POI) shows on the wall as its banner with its name (always, unlike the held phone)', poiId !== '' && named, JSON.stringify(icons[ids[1]]))
    bot.chat(`/dpoi remove ${poiId}`)
    const gone = await until(async () => !(icons[ids[1]] || []).some(i => i.type === BANNER_ORANGE), 15000)
    check('...and leaves it when it\'s removed', gone, JSON.stringify(icons[ids[1]]))
    poiId = ''

    // ---------- A 1x1 wall: the city shrunk to fit ----------
    const small = await cmd(`dphone wall create zsmall 1 1 world ${WX - 3} ${WY} ${WZ} south`)
    const sid = (await idsOf('zsmall'))[0]
    await until(async () => screens[sid], 8000)
    await sleep(1500)
    let sameSmall = 0
    const s1 = screens[sid] || new Uint8Array(0)
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) if (s1[y * 128 + x] === want(img[(2 * y + 1) * W + 2 * x + 1])) sameSmall++
    check('a 1x1 wall: the whole city shrunk to one map (every other pixel)', /zsmall 1x1 made/.test(small) && sameSmall === 128 * 128, `${small} ${sameSmall}/${128 * 128}`)

    // ---------- A reload keeps the walls ----------
    await cmd('dphone')
    const list = await cmd('dphone wall list')
    check('a reload keeps the walls (walls.yml)', /WALL ztest 2x2/.test(list) && /WALL zsmall 1x1/.test(list) && /2 wall\(s\)/.test(list), list)

    // ---------- Frames stay put; a lost one comes back ----------
    await cmd(`setblock ${WX} ${WY} ${WZ} air`)
    await sleep(6000) // a hanging entity checks what it hangs on every 100 ticks
    const kept = await frames('tag=wall_ztest')
    await cmd(`setblock ${WX} ${WY} ${WZ} stone`)
    check('breaking the block behind a frame doesn\'t drop it (only /dphone wall remove takes frames down)', kept === 4, `${kept} frames`)
    await cmd('minecraft:kill @e[tag=wall_ztest,limit=1]')
    await sleep(500)
    const listed = await cmd('dphone wall list')
    const repaired = await cmd('dphone wall repair ztest')
    await sleep(500)
    check('a killed frame: list says frames=3/4 and repair hangs it again with its own map', /ztest .*frames=3\/4 loaded \(missing/.test(listed) && /1 frame\(s\) hung again/.test(repaired) && await frames('tag=wall_ztest') === 4 && /ztest .*frames=4\/4 loaded$/m.test(await cmd('dphone wall list')), `${listed} | ${repaired}`)

    // ---------- Removing ----------
    const removed = await cmd('dphone wall remove ztest')
    check('/dphone wall remove: the frames go', /removed \(4 of 4 frames/.test(removed) && await frames('tag=wall_ztest') === 0 && !/ztest/.test(await cmd('dphone wall list')), removed)
    // Freed maps are used again (any freed ones, also an earlier run's walls: walls.yml keeps the free list), so every
    // map the new wall gets already had its file before (a new map would be a new id with no file yet).
    await cmd('save-all flush')
    // 26.x keeps maps as world\data\minecraft\maps\<id>.dat (last_id.dat holds the counter).
    const mapFiles = () => new Set(fs.readdirSync(path.join(SERVER, 'world', 'data', 'minecraft', 'maps')).map(f => (f.match(/^(\d+)\.dat$/) || [])[1]).filter(Boolean).map(Number))
    const before = mapFiles()
    await cmd(`dphone wall create ztest 2 1 world ${WX} ${WY} ${WZ} south`)
    const reused = await idsOf('ztest')
    check('a new wall uses removed walls\' maps again (no new map files)', reused.length === 2 && reused.every(id => before.has(id)), `${reused} from ${ids} (map files before: ${[...before].sort((a, b) => a - b).join(',')})`)
  } finally {
    if (poiId) await rcon.cmd(`zzconsole dpoi remove ${poiId}`).catch(() => {})
    await rcon.cmd('dphone wall remove ztest').catch(() => {})
    await rcon.cmd('dphone wall remove zsmall').catch(() => {})
    await rcon.cmd(`lp user ${P} permission unset donating.staff`).catch(() => {})
    await rcon.cmd(`fill ${WX - 5} ${WY - 1} ${WZ - 1} ${WX + 6} ${WY + 3} ${WZ + 10} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    try { fs.unlinkSync(CITY_YML) } catch (e) { }
    if (hadCityYml) fs.renameSync(CITY_YML + '.testbak', CITY_YML)
    await rcon.cmd('dphone').catch(() => {}) // the owner's city again
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
