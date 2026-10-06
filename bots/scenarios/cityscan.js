// The city scan (DonatingPhone's /dphone city, 2026-09-29): the phone's city image drawn from the world the way vanilla
// fills a map, so nobody flies over the city holding maps. Checked: a scan of the city-maps' own box against those vanilla
// maps pixel by pixel; exact pixels on a test build (colors, a glass roof, a flower, water depth in a checker, shading
// at a step, the most common color at scale 1); the phone draws the scan; refusals; switching back to the maps.
// A scan the owner made (city.bin, city.yml) is put aside first and put back afterwards (review fix, 2026-09-29).
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const nbt = require('prismarine-nbt')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const P = 'CityBot'
const SERVER = path.join(__dirname, '..', '..', 'server')
const DATA = path.join(SERVER, 'plugins', 'DonatingPhone')
const B = 6000 // the test build: blocks B..B+31 on both axes
const Y = 199  // its top
const CHUNKS = `${B} ${B} ${B + 31} ${B + 31}`

// Vanilla map color ids (MapColor): the pixel byte is id * 4 + shade (0 dark, 1 normal, 2 bright).
const RED = 28 // red concrete: COLOR_RED
const LIME = 19 // lime wool: COLOR_LIGHT_GREEN
const WATER = 12
const PLANT = 7 // a poppy
const STONE = 11 // smooth stone

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  // The owner's own scan, if any: kept aside while the test runs.
  const saved = []
  for (const name of ['city.bin', 'city.yml']) {
    const file = path.join(DATA, name)
    if (fs.existsSync(file)) { fs.copyFileSync(file, file + '.testbak'); saved.push(name) }
  }
  try {
    const info = async () => cmd('dphone city info')
    const until = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(500) } return Boolean(await fn()) }
    const scanDone = async ms => until(async () => !/scanning=/.test(await info()), ms)
    const readBin = () => {
      const b = zlib.gunzipSync(fs.readFileSync(path.join(DATA, 'city.bin')))
      let o = 4
      const n = b.readUInt16BE(o); o += 2
      const world = b.toString('utf8', o, o + n); o += n
      const x0 = b.readInt32BE(o), z0 = b.readInt32BE(o + 4), bpp = b.readInt32BE(o + 8), w = b.readInt32BE(o + 12), h = b.readInt32BE(o + 16)
      o += 28
      return { world, x0, z0, bpp, w, h, px: b.subarray(o, o + w * h) }
    }
    const pixel = async (x, z) => {
      const m = (await cmd(`dphone city pixel ${x} ${z}`)).match(/= (\d+) color=(\d+) shade=(\d+)/)
      return m ? { b: Number(m[1]), color: Number(m[2]), shade: Number(m[3]) } : { b: -1, color: -1, shade: -1 }
    }

    // ---------- The vanilla city maps (config.yml's city-maps) ----------
    await cmd('dphone city use maps')
    await cmd('save-all flush')
    const config = fs.readFileSync(path.join(DATA, 'config.yml'), 'utf8')
    const grid = JSON.parse((config.match(/^city-maps:\s*(\[.*\])\s*$/m) || [])[1] || '[]')
    if (!grid.length) { check('this test needs the local test city (city-maps in DonatingPhone\'s config.yml)', false, 'no city-maps'); return }
    const tiles = []
    for (const row of grid) {
      const r = []
      for (const id of row) r.push(nbt.simplify((await nbt.parse(fs.readFileSync(path.join(SERVER, 'world', 'data', 'minecraft', 'maps', `${id}.dat`)))).parsed).data)
      tiles.push(r)
    }
    const first = tiles[0][0]
    const unit = 1 << (first.scale || 0)
    const W = 128 * grid[0].length
    const H = 128 * grid.length
    const mx0 = first.xCenter - 64 * unit
    const mz0 = first.zCenter - 64 * unit
    check('the phones start on the city maps (source=maps)', /source=maps/.test(await info()), await info())

    // ---------- Scan the maps' own box, compare with vanilla ----------
    const started = await cmd('dphone city scan')
    const done1 = await scanDone(120000)
    const bin1 = readBin()
    check('/dphone city scan (no box): the city maps\' box at their scale, then the phones use it', done1 && /CITY scanning/.test(started) && bin1.x0 === mx0 && bin1.z0 === mz0 && bin1.w === W && bin1.h === H && bin1.bpp === unit && /source=scan/.test(await info()),
      `${started} | ${JSON.stringify({ x0: bin1.x0, z0: bin1.z0, w: bin1.w, h: bin1.h, bpp: bin1.bpp })} vs ${mx0},${mz0} ${W}x${H} | ${await info()}`)
    // Every pixel the vanilla maps drew (0 = never explored), the first row left out (vanilla shades it from the row north).
    let same = 0, sameColor = 0, n = 0
    tiles.forEach((row, r) => row.forEach((t, c) => {
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
        const v = t.colors[y * 128 + x] & 255
        if (v < 4) continue
        const iy = r * 128 + y
        if (iy === 0) continue
        const s = bin1.px[iy * W + c * 128 + x]
        n++
        if (s === v) same++
        if (s >> 2 === v >> 2) sameColor++
      }
    }))
    const pSame = n ? same / n : 0
    const pColor = n ? sameColor / n : 0
    check('the scan matches the vanilla maps (same color on 99.5%+ of the pixels they drew, the same shade too on 99%+)', n > 10000 && pColor >= 0.995 && pSame >= 0.99,
      `${n} pixels: ${(pColor * 100).toFixed(2)}% same color, ${(pSame * 100).toFixed(2)}% same byte`)

    // ---------- A test build with known pixels ----------
    await cmd(`forceload add ${CHUNKS}`)
    await sleep(1500)
    await cmd(`fill ${B} ${Y - 9} ${B} ${B + 31} ${Y} ${B + 31} smooth_stone`)
    await cmd(`fill ${B} ${Y + 1} ${B} ${B + 31} ${Y + 6} ${B + 31} air`)
    await cmd(`fill ${B + 4} ${Y} ${B + 4} ${B + 7} ${Y} ${B + 7} red_concrete`)
    await cmd(`setblock ${B + 10} ${Y} ${B + 10} lime_wool`)
    await cmd(`setblock ${B + 10} ${Y + 1} ${B + 10} glass`)
    await cmd(`setblock ${B + 12} ${Y + 1} ${B + 20} poppy`)
    await cmd(`fill ${B + 16} ${Y - 2} ${B + 16} ${B + 19} ${Y} ${B + 19} water`)
    await cmd(`fill ${B + 24} ${Y + 1} ${B + 4} ${B + 27} ${Y + 1} ${B + 4} stone`)
    // Scale 1: a 2x2 pixel of 3 red and 1 lime is red.
    await cmd(`fill ${B + 28} ${Y} ${B + 28} ${B + 29} ${Y} ${B + 29} red_concrete`)
    await cmd(`setblock ${B + 29} ${Y} ${B + 29} lime_wool`)

    const busy1 = await cmd(`dphone city scan ${B} ${B} ${B + 31} ${B + 31} 0`)
    const busy2 = await cmd(`dphone city scan ${B} ${B} ${B + 31} ${B + 31} 0`)
    check('one scan at a time ("a scan is running")', /CITY scanning/.test(busy1) && /a scan is running/.test(busy2), `${busy1} | ${busy2}`)
    const done2 = await scanDone(60000)
    const red = await pixel(B + 5, B + 5)
    const lime = await pixel(B + 10, B + 10)
    const poppy = await pixel(B + 12, B + 20)
    const stone = await pixel(B + 1, B + 1)
    check('each pixel is its top block\'s map color: red concrete, lime wool under glass (glass has none), a poppy on the stone, smooth stone',
      done2 && red.color === RED && lime.color === LIME && poppy.color === PLANT && stone.color === STONE, JSON.stringify({ red, lime, poppy, stone }))
    const flat = await pixel(B + 5, B + 6)
    check('flat ground is the normal shade (1)', red.shade === 1 && flat.shade === 1 && stone.shade === 1, JSON.stringify({ red, flat, stone }))
    const w0 = await pixel(B + 17, B + 17)
    const w1 = await pixel(B + 17, B + 18)
    check('water 3 deep: bright and normal in a checker (vanilla: 3 x 0.1 + 0.2 on odd pixels)', w0.color === WATER && w1.color === WATER && w0.shade === 2 && w1.shade === 1, JSON.stringify({ w0, w1 }))
    const up = await pixel(B + 25, B + 4) // a block higher than the pixel north of it (x + z odd: bright)
    const down = await pixel(B + 25, B + 5) // a block lower than the one north of it (x + z even: dark)
    check('a step: the higher side bright, the pixel after it dark (vanilla\'s height shading)', up.shade === 2 && down.shade === 0, JSON.stringify({ up, down }))

    // ---------- The phone shows the scan ----------
    bot = await join(P)
    // Every map's screen (the phone may be out before the test knows its map id).
    const screens = {}
    bot._client.on('map', p => {
      if (!p.columns) return
      const screen = screens[p.itemDamage] || (screens[p.itemDamage] = new Uint8Array(128 * 128))
      for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.columns; c++) screen[(p.y + r) * 128 + p.x + c] = p.data[r * p.columns + c]
    })
    await cmd(`gamemode survival ${P}`)
    await cmd(`zzclear ${P}`)
    await sleep(2500)
    await cmd(`minecraft:tp ${P} ${B + 8.5} ${Y + 1} ${B + 8.5} 0 0`)
    await sleep(1500)
    const st = await cmd(`dphone status ${P}`)
    const mapId = Number((st.match(/map=(\d+)/) || [])[1])
    bot.setQuickBarSlot(0)
    await sleep(800)
    bot.setQuickBarSlot(8)
    await sleep(2500)
    const screen = screens[mapId] || new Uint8Array(128 * 128)
    const count = ids => screen.reduce((a, v) => a + (ids.includes(v >> 2) ? 1 : 0), 0)
    check('holding the phone on the build: its screen shows the scan (the red square, the stone, the water)', /city=scan/.test(st) && count([RED]) >= 32 && count([STONE]) >= 200 && count([WATER]) >= 16,
      `${st} red=${count([RED])} stone=${count([STONE])} water=${count([WATER])}`)

    // ---------- Scale 1 ----------
    await cmd(`dphone city scan ${B} ${B} ${B + 31} ${B + 31} 1`)
    const done3 = await scanDone(60000)
    const bin3 = readBin()
    const mixed = await pixel(B + 28, B + 28)
    check('scale 1: 2 blocks a pixel (16x16), the most common color wins (3 red + 1 lime = red)', done3 && bin3.bpp === 2 && bin3.w === 16 && bin3.h === 16 && mixed.color === RED, `${JSON.stringify({ bpp: bin3.bpp, w: bin3.w, h: bin3.h })} ${JSON.stringify(mixed)}`)

    // ---------- Refusals ----------
    const big = await cmd('dphone city scan 0 0 100000 100000 0')
    const scale9 = await cmd(`dphone city scan ${B} ${B} ${B + 31} ${B + 31} 9`)
    check('refused: an image over 2048 pixels a side, a scale over 4', /too big/.test(big) && /scale is 0-4/.test(scale9), `${big} | ${scale9}`)
    const budget = await cmd('dphone city scan 0 0 7999 7999 2')
    check('a box over 40,000 chunks needs "confirm" at the end (a typo can\'t queue millions)', /chunks .*add confirm at the end/.test(budget) && !/scanning/.test(await info()), budget)
    // 4,096 blocks from x 1: 2,049 pixels at scale 1 once lined up, so the automatic scale must be 2 (it was refused before).
    const auto = await cmd('dphone city scan 1 0 4096 100')
    const binBefore = fs.statSync(path.join(DATA, 'city.bin')).mtimeMs
    const cancel = await cmd('dphone city cancel')
    await sleep(1500)
    check('no scale given: the smallest that fits once the pixels line up (scale 2 here); cancel keeps the city', /at scale 2/.test(auto) && /scan cancelled/.test(cancel) && fs.statSync(path.join(DATA, 'city.bin')).mtimeMs === binBefore && !/scanning/.test(await info()),
      `${auto} | ${cancel}`)

    // ---------- Back to the maps ----------
    const back = await cmd('dphone city use maps')
    const st2 = await cmd(`dphone status ${P}`)
    const roads = await cmd('dphone roads info')
    check('/dphone city use maps: the phones show the city maps again, and the GPS road grid fits again', /the city-maps/.test(back) && /city=maps/.test(st2) && /source=maps/.test(await info()) && !/another city/.test(roads), `${back} | ${st2} | ${roads}`)
  } finally {
    await rcon.cmd('dphone city cancel').catch(() => {})
    await rcon.cmd('dphone city use maps').catch(() => {})
    for (const name of ['city.bin', 'city.yml']) {
      const file = path.join(DATA, name)
      try { fs.unlinkSync(file) } catch (e) { }
      if (saved.includes(name)) fs.renameSync(file + '.testbak', file)
    }
    await rcon.cmd('dphone').catch(() => {}) // the owner's city again (and roads.bin with it)
    await rcon.cmd(`fill ${B} ${Y - 9} ${B} ${B + 31} ${Y + 6} ${B + 31} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
