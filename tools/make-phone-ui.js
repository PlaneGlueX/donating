// The chest menus' art (2026-09-29; owner: "make a phone style apps menu (its very cluttered right now)", then "see if
// its possible to just have the phone on the screen (or just get rid of the blank sides)"):
//   - minecraft:textures/gui/container/generic_54.png, the chest menus' texture: its chest part (v 0-125) is
//     transparent and only the player-inventory part (v 126-221) is drawn (the vanilla look, drawn procedurally), so a
//     chest menu shows the world (dimmed by the client) wherever its title draws nothing.
//   - the menu backgrounds, drawn by a font glyph in the chest title (the 26.3 client draws a container's title after
//     its texture and before its items, so a 176-wide glyph shifted 8 pixels left covers the whole menu), all ascent
//     13 so the glyph's top meets the menu's top, and 176 wide with an opaque x 175 (advance 177):
//       U+E010 the phone's home screen, U+E011 a phone app page: 176x135, the phone alone plus the inventory panel's
//         top edge at y 122-125 (tools\phoneui\bg.js); the title is "&f" + space(-8) + glyph + space(-132) + status.
//       U+E020-E025 the classic chest panel for 1-6 rows: 176 x (18R+17) = 35, 53, 71, 89, 107, 125, pixel-identical
//         to the vanilla texture's top part; the title is "&f" + space(-8) + glyph + space(-169) + the old title
//         (-8 + 177 - 169 = 8, where vanilla draws the title). A player whose cached pack still has the vanilla
//         generic_54.png sees the same panel twice over (identical pixels).
//   - spaces: U+F801-F808 move -1, -2, -4 ... -128 pixels, U+F811-F818 +1 ... +128 (ui.sk's uiSpace builds titles).
//   - the app icons (16x16 tiles), items/light_gray_dye.json picking them by custom_model_data "donating:app_<name>".
// Art: tools\phoneui\bg.js (the phone backgrounds, the vanilla panel), icons-apps.js and icons-gps.js (icons),
// common.js (tile, palette).
//
// Usage: tools\node\node.exe tools\make-phone-ui.js                    writes the pack files
//        tools\node\node.exe tools\make-phone-ui.js --preview <dir>    also renders 3x previews of the menus there
//        (the screen as the client draws it: a world, dimmed like the client dims it, the menu texture, the title glyph)
const fs = require('fs')
const path = require('path')
const { canvas, paint, hex, over } = require('./phoneui/common.js')

const PACK = path.join(__dirname, '..', 'pack', 'assets')
const write = (rel, data) => {
  const f = path.join(PACK, rel)
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, Buffer.isBuffer(data) || typeof data === 'string' ? data : JSON.stringify(data, null, 2))
}
// A module that's missing or broken (being edited) is skipped with a warning, so the rest still builds.
const load = f => { try { return require(f) } catch (e) { console.warn(`(skipped ${f}: ${String(e.message).split('\n')[0]})`); return {} } }
// bg.js is required: it draws generic_54.png (see-through chest part) and the panel glyphs every chest menu needs.
const bg = require('./phoneui/bg.js')
const ICONS = { ...load('./phoneui/icons-apps.js'), ...load('./phoneui/icons-gps.js') }

const W = 176, H = 135
// The geometry phone.sk relies on (keep in step with it).
const LAYOUT = {
  // Slot n's item sits at (8 + 18 * (n % 9), 18 + 18 * floor(n / 9)); the phone's screen is columns 2-6.
  home: {
    2: 'crates', 3: 'cosmetics', 4: 'season', 5: 'bounties', 6: 'HEAD',
    11: 'passive_on', 12: 'help',
    38: 'messages', 39: 'gps', 40: 'missions', 41: 'garage', 42: 'bag',
    49: 'blank'
  },
  gps: { 2: 'back', 11: 'quests', 12: 'heists', 13: 'shops', 14: 'places', 15: 'car', 20: 'pin', 21: 'pin_clear', 49: 'blank' },
  list: { 2: 'back', 5: 'prev', 6: 'next', 11: 'heist_0', 12: 'heist_1', 13: 'heist_2', 14: 'heist_3', 15: 'heist_4', 20: 'base', 21: 'spawn', 22: 'landmark', 23: 'garagepl', 24: 'crate', 29: 'shop_gun', 30: 'shop_gear', 31: 'shop_bag', 32: 'shop_tools', 33: 'shop_cars', 38: 'shop_other', 49: 'blank' }
}

// ---------- Backgrounds, the chest texture and the font ----------
// The client's glyph width is the rightmost column with any alpha, plus 1 (advance = width + 1): every background
// must reach x 175 or ui.sk's space math breaks. Pixels with alpha 1-25 count for the width but never show.
const checkGlyph = (name, c) => {
  let right = -1, faint = 0
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { const a = c.get(x, y)[3]; if (a > 0) { right = Math.max(right, x); if (a < 26) faint++ } }
  if (right !== W - 1) throw new Error(`${name}: the glyph is ${right + 1} wide, it must be ${W} (an opaque pixel in column ${W - 1})`)
  if (faint) console.warn(`(${name}: ${faint} pixels with alpha under 26 never show)`)
}
const backgrounds = {}
for (const name of ['home', 'app']) {
  const c = canvas(W, H)
  if (bg[name]) { bg[name](c); checkGlyph(`phone_${name}`, c) }
  backgrounds[name] = c
  write(`donating/textures/font/phone_${name}.png`, c.png())
}
const texture = canvas(256, 256)
const panels = {}
if (bg.panelTexture) {
  bg.panelTexture(texture)
  write('minecraft/textures/gui/container/generic_54.png', texture.png())
  for (let R = 1; R <= 6; R++) {
    const c = canvas(W, 18 * R + 17)
    bg.panelTop(c, R)
    checkGlyph(`panel_${R}`, c)
    panels[R] = c
    write(`donating/textures/font/panel_${R}.png`, c.png())
  }
}
const adv = {}
;[1, 2, 4, 8, 16, 32, 64, 128].forEach((n, i) => { adv[String.fromCharCode(0xf801 + i)] = -n; adv[String.fromCharCode(0xf811 + i)] = n })
write('donating/font/phone_ui.json', {
  providers: [
    { type: 'space', advances: adv },
    { type: 'bitmap', file: 'donating:font/phone_home.png', ascent: 13, height: H, chars: [String.fromCharCode(0xe010)] },
    { type: 'bitmap', file: 'donating:font/phone_app.png', ascent: 13, height: H, chars: [String.fromCharCode(0xe011)] },
    // The classic chest panels for 1-6 rows (U+E020-E025): one provider each (a provider's chars share one cell size).
    ...Object.keys(panels).map(R => ({ type: 'bitmap', file: `donating:font/panel_${R}.png`, ascent: 13, height: panels[R].h, chars: [String.fromCharCode(0xe01f + Number(R))] }))
  ]
})
// Leftovers of the first experiment.
for (const f of ['donating/textures/font/phone_test.png']) { try { fs.unlinkSync(path.join(PACK, f)) } catch (e) { } }

// ---------- Icons ----------
const icons = {}
for (const [name, draw] of Object.entries(ICONS)) {
  const c = canvas(16, 16)
  draw(c)
  icons[name] = c
  write(`donating/textures/item/app/${name}.png`, c.png())
  write(`donating/models/item/app/${name}.json`, { parent: 'minecraft:item/generated', textures: { layer0: `donating:item/app/${name}` } })
}
write('minecraft/items/light_gray_dye.json', {
  model: {
    type: 'minecraft:select',
    property: 'minecraft:custom_model_data',
    index: 0,
    cases: Object.keys(icons).sort().map(name => ({ when: `donating:app_${name}`, model: { type: 'minecraft:model', model: `donating:item/app/${name}` } })),
    fallback: { type: 'minecraft:model', model: 'minecraft:item/light_gray_dye' }
  }
})
console.log(`chest UI: generic_54.png (chest part transparent), 2 phone backgrounds, ${Object.keys(panels).length} classic panels (U+E020-U+E025), ${Object.keys(icons).length} icons (${Object.keys(icons).sort().join(', ')})`)

// ---------- Previews ----------
const i = process.argv.indexOf('--preview')
if (i > 0) {
  const dir = process.argv[i + 1]
  fs.mkdirSync(dir, { recursive: true })
  // A 3x5 digit font for the status bar's clock (the game draws the real text; this only places it).
  const DIGITS = { 0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['###', '..#', '###', '#..', '###'], 3: ['###', '..#', '###', '..#', '###'], ':': ['...', '.#.', '...', '.#.', '...'] }
  const text = (c, s, x, y, col) => { for (const ch of s) { (DIGITS[ch] || ['###', '###', '###', '###', '###']).forEach((row, dy) => [...row].forEach((p, dx) => { if (p === '#') c.set(x + dx, y + dy, col) })); x += 4 } }
  // A label stand-in: n letter-sized blocks in the menu text color (0x404040) where the client draws the text.
  const label = (c, x, y, n) => { for (let k = 0; k < n; k++) for (let dy = 1; dy < 8; dy++) for (let dx = 0; dx < 5; dx++) if ((dx + dy + k) % 3) c.set(x + k * 6 + dx, y + dy, [64, 64, 64, 255]) }
  // A daytime street behind the menu: sky, a row of buildings with windows, a road, grass.
  const world = (w, h) => {
    const c = canvas(w, h)
    const horizon = Math.round(h * 0.62)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let col
        if (y < horizon) col = [Math.round(120 + 60 * y / horizon), Math.round(170 + 40 * y / horizon), 235, 255]
        else if (y < horizon + 6) col = [95, 150, 60, 255]
        else if (y < horizon + 30) col = (y - horizon) % 12 === 0 && x % 16 < 8 ? [230, 230, 230, 255] : [70, 70, 74, 255]
        else col = [110, 160, 70, 255]
        c.set(x, y, col)
      }
    }
    let x0 = 4, k = 0
    while (x0 < w) {
      const bw = 34 + (k * 17) % 26, bh = 50 + (k * 29) % 70, top = horizon - bh
      const wall = [[150, 110, 90, 255], [170, 170, 175, 255], [120, 125, 140, 255], [190, 175, 140, 255]][k % 4]
      for (let y = top; y < horizon; y++) {
        for (let x = x0; x < Math.min(w, x0 + bw); x++) {
          const win = (x - x0) % 8 >= 3 && (x - x0) % 8 <= 5 && (y - top) % 10 >= 4 && (y - top) % 10 <= 7 && x - x0 > 2 && x0 + bw - x > 3
          c.set(x, y, win ? ((x + y + k) % 5 ? [70, 110, 150, 255] : [250, 220, 120, 255]) : wall)
        }
      }
      x0 += bw + 6; k++
    }
    return c
  }
  // Screen.extractTransparentBackground: fillGradient(0, 0, w, h, 0xC0101010, 0xD0101010) over the world.
  const dim = c => {
    for (let y = 0; y < c.h; y++) {
      const a = Math.round(0xc0 + (0xd0 - 0xc0) * y / (c.h - 1))
      for (let x = 0; x < c.w; x++) c.set(x, y, over(c.get(x, y), [16, 16, 16, a]))
    }
  }
  // A 9xR chest menu as ContainerScreen draws it: the texture's top part (uv 0,0, 176 x 18R+17) and its inventory
  // part (uv 0,126, 176x96) under it, then the title glyph from (0, 0), the labels, the items.
  const render = (name, rows, glyph, layout, status) => {
    const scale = 3, M = 28
    const mh = 114 + rows * 18, top = 18 * rows + 17
    const screen = world(W + 2 * M, mh + 2 * M)
    dim(screen)
    const menu = canvas(W, mh)
    for (let y = 0; y < top; y++) for (let x = 0; x < W; x++) paint(menu, x, y, texture.get(x, y))
    for (let y = 0; y < 96; y++) for (let x = 0; x < W; x++) paint(menu, x, top + y, texture.get(x, 126 + y))
    if (glyph) for (let y = 0; y < glyph.h; y++) for (let x = 0; x < W; x++) paint(menu, x, y, glyph.get(x, y))
    if (status) text(menu, status, 45, 8, [255, 255, 255, 255])
    else label(menu, 8, 6, 8) // the chest's own title at (8, 6)
    label(menu, 8, rows * 18 + 20, 9) // "Inventory"
    for (const [slot, icon] of Object.entries(layout)) {
      const n = Number(slot), x = 8 + 18 * (n % 9), y = 18 + 18 * Math.floor(n / 9)
      const ic = icon === 'HEAD' ? null : icons[icon]
      if (icon === 'HEAD') { for (let dy = 2; dy < 14; dy++) for (let dx = 2; dx < 14; dx++) menu.set(x + dx, y + dy, dy < 6 ? [90, 60, 40, 255] : [200, 150, 110, 255]) }
      else if (ic) for (let dy = 0; dy < 16; dy++) for (let dx = 0; dx < 16; dx++) { const p = ic.get(dx, dy); if (p[3] > 0) paint(menu, x + dx, y + dy, p) }
      else for (let dy = 0; dy < 16; dy++) for (let dx = 0; dx < 16; dx++) if ((dx + dy) % 4 === 0) menu.set(x + dx, y + dy, [255, 0, 255, 255]) // missing icon
    }
    for (let y = 0; y < menu.h; y++) for (let x = 0; x < W; x++) paint(screen, M + x, M + y, menu.get(x, y))
    const out = canvas(screen.w * scale, screen.h * scale)
    for (let y = 0; y < screen.h; y++) for (let x = 0; x < screen.w; x++) { const p = screen.get(x, y); for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) out.set(x * scale + dx, y * scale + dy, p) }
    fs.writeFileSync(path.join(dir, `preview-${name}.png`), out.png())
  }
  render('home', 6, backgrounds.home, LAYOUT.home, '12:30')
  render('gps', 6, backgrounds.app, LAYOUT.gps, '12:30')
  render('list', 6, backgrounds.app, LAYOUT.list, '12:30')
  render('classic-3', 3, panels[3], { 10: 'bag', 11: 'crates', 13: 'car', 16: 'help' })
  render('classic-6', 6, panels[6], { 0: 'heist_1', 8: 'heist_4', 22: 'crate', 45: 'back', 53: 'next' })
  render('no-glyph-3', 3, null, { 10: 'bag', 11: 'crates' }) // a chest title with no panel glyph: see-through
  // Every icon on one sheet, 8x, with its name order printed to the console.
  const names = Object.keys(icons).sort()
  const cols = 8, s = 8
  const sheet = canvas(cols * 20 * s, Math.ceil(names.length / cols) * 20 * s)
  for (let y = 0; y < sheet.h; y++) for (let x = 0; x < sheet.w; x++) sheet.set(x, y, hex('#2C2C2E'))
  names.forEach((nm, k) => {
    const ox = (k % cols) * 20 + 2, oy = Math.floor(k / cols) * 20 + 2
    for (let dy = 0; dy < 16; dy++) for (let dx = 0; dx < 16; dx++) { const p = icons[nm].get(dx, dy); if (p[3] === 0) continue; for (let a = 0; a < s; a++) for (let q = 0; q < s; q++) paint(sheet, (ox + dx) * s + q, (oy + dy) * s + a, p) }
  })
  fs.writeFileSync(path.join(dir, 'preview-icons.png'), sheet.png())
  console.log('icon sheet order (rows of 8): ' + names.join(', '))
  console.log('previews in ' + dir)
}
module.exports = { LAYOUT }
