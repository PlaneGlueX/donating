// The phone-style menus' art (2026-09-29, owner: "make a phone style apps menu (its very cluttered right now)"):
//   - two menu backgrounds drawn by a font glyph in the chest title (the 26.3 client draws a container's title after
//     its texture and before its items, so a 176-wide glyph shifted 8 pixels left covers the whole menu):
//     U+E010 the home screen, U+E011 an app page. Both 176x135 GUI pixels (a 6-row chest's top part, 125, plus the
//     10-pixel gap above the player inventory), ascent 13 so the glyph's top meets the menu's top.
//   - spaces: U+F801-F808 move -1, -2, -4 ... -128 pixels, U+F811-F818 +1 ... +128 (phone.sk builds titles with them).
//   - the app icons (16x16 tiles), items/light_gray_dye.json picking them by custom_model_data "donating:app_<name>".
// Art: tools\phoneui\bg.js (backgrounds), icons-apps.js and icons-gps.js (icons), common.js (tile, palette).
//
// Usage: tools\node\node.exe tools\make-phone-ui.js                    writes the pack files
//        tools\node\node.exe tools\make-phone-ui.js --preview <dir>    also renders 4x previews of the menus there
const fs = require('fs')
const path = require('path')
const { canvas, paint, hex } = require('./phoneui/common.js')

const PACK = path.join(__dirname, '..', 'pack', 'assets')
const write = (rel, data) => {
  const f = path.join(PACK, rel)
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, Buffer.isBuffer(data) || typeof data === 'string' ? data : JSON.stringify(data, null, 2))
}
// A module that's missing or broken (being edited) is skipped with a warning, so the rest still builds.
const load = f => { try { return require(f) } catch (e) { console.warn(`(skipped ${f}: ${String(e.message).split('\n')[0]})`); return {} } }
const bg = load('./phoneui/bg.js')
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

// ---------- Backgrounds and the font ----------
const backgrounds = {}
for (const [name, cp] of [['home', 0xe010], ['app', 0xe011]]) {
  const c = canvas(W, H)
  if (bg[name]) bg[name](c)
  backgrounds[name] = c
  write(`donating/textures/font/phone_${name}.png`, c.png())
}
const adv = {}
;[1, 2, 4, 8, 16, 32, 64, 128].forEach((n, i) => { adv[String.fromCharCode(0xf801 + i)] = -n; adv[String.fromCharCode(0xf811 + i)] = n })
write('donating/font/phone_ui.json', {
  providers: [
    { type: 'space', advances: adv },
    { type: 'bitmap', file: 'donating:font/phone_home.png', ascent: 13, height: H, chars: [''] },
    { type: 'bitmap', file: 'donating:font/phone_app.png', ascent: 13, height: H, chars: [''] }
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
console.log(`phone UI: 2 backgrounds, ${Object.keys(icons).length} icons (${Object.keys(icons).sort().join(', ')})`)

// ---------- Previews ----------
const i = process.argv.indexOf('--preview')
if (i > 0) {
  const dir = process.argv[i + 1]
  fs.mkdirSync(dir, { recursive: true })
  // A 3x5 digit font for the status bar's clock (the game draws the real text; this only places it).
  const DIGITS = { 0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['###', '..#', '###', '#..', '###'], 3: ['###', '..#', '###', '..#', '###'], ':': ['...', '.#.', '...', '.#.', '...'] }
  const text = (c, s, x, y, col) => { for (const ch of s) { (DIGITS[ch] || ['###', '###', '###', '###', '###']).forEach((row, dy) => [...row].forEach((p, dx) => { if (p === '#') c.set(x + dx, y + dy, col) })); x += 4 } }
  const render = (name, bgName, layout, label) => {
    const scale = 4
    const out = canvas((W + 16) * scale, (H + 100) * scale)
    // The game world behind the menu (a dim gray) and the vanilla player inventory panel below the phone.
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.set(x, y, [60, 64, 70, 255])
    const menu = canvas(W, H + 96)
    for (let y = 125; y < H + 96; y++) for (let x = 0; x < W; x++) menu.set(x, y, x === 0 || x === W - 1 ? [0, 0, 0, 255] : x < 3 ? [255, 255, 255, 255] : x > W - 4 ? [85, 85, 85, 255] : [198, 198, 198, 255])
    for (let r = 0; r < 4; r++) for (let col = 0; col < 9; col++) { const x0 = 7 + col * 18, y0 = 139 + r * 18 + (r === 3 ? 4 : 0); for (let dy = 0; dy < 18; dy++) for (let dx = 0; dx < 18; dx++) menu.set(x0 + dx, y0 + dy, dx === 0 || dy === 0 ? [55, 55, 55, 255] : dx === 17 || dy === 17 ? [255, 255, 255, 255] : [139, 139, 139, 255]) }
    const b = backgrounds[bgName]
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = b.get(x, y); if (p[3] > 0) paint(menu, x, y, p) }
    for (const [slot, icon] of Object.entries(layout)) {
      const n = Number(slot), x = 8 + 18 * (n % 9), y = 18 + 18 * Math.floor(n / 9)
      const ic = icon === 'HEAD' ? null : icons[icon]
      if (icon === 'HEAD') { for (let dy = 2; dy < 14; dy++) for (let dx = 2; dx < 14; dx++) menu.set(x + dx, y + dy, dy < 6 ? [90, 60, 40, 255] : [200, 150, 110, 255]) }
      else if (ic) for (let dy = 0; dy < 16; dy++) for (let dx = 0; dx < 16; dx++) { const p = ic.get(dx, dy); if (p[3] > 0) paint(menu, x + dx, y + dy, p) }
      else for (let dy = 0; dy < 16; dy++) for (let dx = 0; dx < 16; dx++) if ((dx + dy) % 4 === 0) menu.set(x + dx, y + dy, [255, 0, 255, 255]) // missing icon
    }
    if (label) text(menu, label, 45, 8, [255, 255, 255, 255])
    for (let y = 0; y < menu.h; y++) for (let x = 0; x < menu.w; x++) { const p = menu.get(x, y); if (p[3] === 0) continue; for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) out.set((x + 8) * scale + dx, (y + 8) * scale + dy, p) }
    fs.writeFileSync(path.join(dir, `preview-${name}.png`), out.png())
  }
  render('home', 'home', LAYOUT.home, '12:30')
  render('gps', 'app', LAYOUT.gps, '12:30')
  render('list', 'app', LAYOUT.list, '12:30')
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
