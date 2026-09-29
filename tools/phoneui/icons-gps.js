// The GPS app's icons (phone.sk's GPS pages): the category buttons (quests, heists, shops, places), your pin and
// clearing it, your car, and the list entries (heists by difficulty, the kinds of places, the kinds of shops).
// Each is a 16x16 app tile (common.js tile) with a symbol drawn by glyph(): white on colored tiles, dark ink on
// the light ones (spawn, the gray, lime and yellow heists, the crate stand), gold on the black heist tile.
// Your car, the crate stand and the bag shop reuse the home screen's garage, crates and bag drawings
// (icons-apps.js) row for row.
const { canvas, tile, glyph, paint, inRound, shade, hex, PAL } = require('./common.js')

const W = PAL.white, K = PAL.ink
const GLASS = [255, 255, 255, 130] // a window: white over the tile, so a lighter tint of it
const GOLD = hex('#F5C518')
const DARK_HINGE = hex('#48484A') // hinges on a dark-ink safe
const RIM = [99, 99, 102, 255] // a neutral 1-texel edge for dark tiles on the dark phone screen
// A symbol on a tile of `color`; `map` adds colors for the other characters (W, K and S are always there).
const icon = (color, rows, map = {}, opts = {}) => c => { tile(c, color); glyph(c, rows, { W, K, S: GLASS, ...map }, opts) }
// Rows of characters from a function over a w x h grid (x, y = the cell's center, 0 at the grid's center).
const shape = (w, h, fn) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => fn(x + 0.5 - w / 2, y + 0.5 - h / 2) || '.').join(''))

// ---------- Shapes ----------
// A swallowtail flag on a pole (the pole shows above it): your pin (the GPS target you set).
const FLAG = [
  'WW..........',
  'WWWWWWWWWWWW',
  'WWWWWWWWWWW.',
  'WWWWWWWWWW..',
  'WWWWWWWWWWW.',
  'WWWWWWWWWWWW',
  'WW..........',
  'WW..........',
  'WW..........',
  'WW..........',
  'WW..........'
]
// A folded paper map (three panels, the middle one in shadow) with a pin on it: every place in the city.
const MAP = (() => {
  const rows = shape(12, 11, (x, y) => {
    x += 6; y += 5.5
    const panel = Math.floor(x / 4), fx = x - panel * 4
    const top = panel % 2 === 0 ? 1 - fx / 4 : fx / 4
    if (y < top + 0.3 || y > top + 10) return ''
    return panel === 1 ? 'G' : 'W'
  }).map(r => r.split(''))
  ;['.PPP.', 'PPPPP', 'PP.PP', 'PPPPP', '.PPP.', '..P..'].forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (ch === 'P') rows[2 + dy][3 + dx] = 'P'
  }))
  return rows.map(r => r.join(''))
})()
// A safe: hinges on the left, a dial (a knob inside a ring), a handle, feet. The heists' list entries.
const SAFE = [
  '.XXXXXXXXXX.',
  'XXXXXXXXXXXX',
  'XXXX....XXXX',
  'XXX.XXXX.XXX',
  'XHX.XXXX.XXX',
  'XXX.XXXX.X.X',
  'XXX.XXXX.X.X',
  'XHXX....XXXX',
  'XXXXXXXXXXXX',
  '.XXXXXXXXXX.',
  '.XX......XX.'
]
// `hinge`: the hinges' metal; `rim`: a 1-texel outline along the tile's edge (a dark tile would vanish on the
// dark phone screen).
const safe = (color, ink, hinge, rim) => c => {
  tile(c, color)
  if (rim) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (!inRound(x, y, 16, 16, 2)) continue
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const a = x + dx, b = y + dy; return a < 0 || b < 0 || a > 15 || b > 15 || !inRound(a, b, 16, 16, 2) })
      if (edge) paint(c, x, y, rim)
    }
  }
  glyph(c, SAFE, { X: ink, H: hinge })
}
// A wrench, lying from bottom left to top right, open jaws at both ends (hand-drawn: a computed one came out lumpy).
const WRENCH = [
  '........WWW.',
  '.......WWW..',
  '.......WW..W',
  '.......WWWWW',
  '......WWWWW.',
  '.....WWW....',
  '....WWW.....',
  '.WWWWW......',
  'WWWWW.......',
  'W..WW.......',
  '..WWW.......',
  '.WWW........'
]
// The home screen's car (icons-apps.js garage), the same rows and colors: the GPS's "your car" is that car.
const CAR = [
  '...WWWWWW...',
  '..WggWgggW..',
  '.WgggWggggW.',
  'WWWWWWWWWWWW',
  'WWWWWWWWWWWW',
  'WWWWWWWWWWWW',
  'WkkkWWWWkkkW',
  '.kwk....kwk.',
  '..k......k..'
]
const CAR_COLORS = { g: [255, 255, 255, 110], k: PAL.ink, w: shade(W, 0.8) }

module.exports = {
  // ---------- Categories (the GPS app's first page) ----------
  // Quests: a speech bubble with "!" (someone has a job for you).
  quests: icon(PAL.quests, [
    '.WWWWWWWWWW.',
    'WWWWWOOWWWWW',
    'WWWWWOOWWWWW',
    'WWWWWOOWWWWW',
    'WWWWWOOWWWWW',
    'WWWWWWWWWWWW',
    'WWWWWOOWWWWW',
    '.WWWWOOWWWW.',
    '..WWWWWWWW..',
    '..WWW.......',
    '..WW........'
  ], { O: shade(PAL.quests, 0.95) }),
  // Heists: a money bag with $ (the safes are the heists' list entries).
  heists: icon(PAL.heists, [
    '...W...W...',
    '....WWW....',
    '...TTTTT...',
    '..WWWWWWW..',
    '.WWWWGWWWW.',
    '.WWWGGGGWW.',
    'WWWGWGWWWWW',
    'WWWWGGGWWWW',
    'WWWWWGWGWWW',
    'WWWGGGGWWWW',
    '.WWWWGWWWW.',
    '..WWWWWWW..'
  ], { G: shade(PAL.heists, 0.95), T: hex('#E8C872') }),
  // Shops: a storefront under a striped awning.
  shops: icon(PAL.shops, [
    '.WWWWWWWWWW.',
    'WSSWWSSWWSSW',
    'WSSWWSSWWSSW',
    'WSSWWSSWWSSW',
    '.W..W..W..W.',
    '............',
    '.WWWWWWWWWW.',
    '.W....W..WW.',
    '.W....W..WW.',
    '.WWWWWW..WW.',
    '.WWWWWW..WW.'
  ], { S: [255, 255, 255, 55] }),
  // Places: a folded map with a pin.
  places: icon(PAL.places, MAP, { G: hex('#FFD1DA'), P: shade(PAL.places, 0.95) }),
  // Your pin: a flag.
  pin: icon(PAL.pin, FLAG),
  // Remove the pin: the flag with a red "x" badge (the tile shows through a ring around the badge).
  pin_clear: c => {
    const gray = hex('#636366')
    tile(c, gray)
    glyph(c, FLAG, { W }, { x: 2, y: 2 })
    const t = canvas(16, 16)
    tile(t, gray)
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x + 0.5 - 9.5, y + 0.5 - 9.5) <= 5.6) c.set(x, y, t.get(x, y))
    glyph(c, [
      '..RRRRR..',
      '.RRRRRRR.',
      'RRWRRRWRR',
      'RRRWRWRRR',
      'RRRRWRRRR',
      'RRRWRWRRR',
      'RRWRRRWRR',
      '.RRRRRRR.',
      '..RRRRR..'
    ], { W, R: hex('#FF3B30') }, { x: 5, y: 5, shadowAlpha: 60 })
  },
  // Your car (from the side, like the garage app's).
  car: icon(PAL.garage, CAR, CAR_COLORS),

  // ---------- List entries ----------
  // Heists by difficulty, in the phone map's banner colors: a store gray, then lime, yellow, red, black.
  // Dark ink on the light tiles (gray, lime, yellow), white on red, gold on black.
  heist_0: safe(PAL.heist0, K, DARK_HINGE),
  heist_1: safe(PAL.heist1, K, DARK_HINGE),
  heist_2: safe(PAL.heist2, K, DARK_HINGE),
  heist_3: safe(PAL.heist3, W, shade(W, 0.7)),
  heist_4: safe(PAL.heist4, GOLD, hex('#9C7A0C'), RIM),
  // The base: a house.
  base: icon(PAL.base, [
    '.....WW.....',
    '....WWWW....',
    '...WWWWWW...',
    '..WWWWWWWW..',
    '.WWWWWWWWWW.',
    'WWWWWWWWWWWW',
    '.WWWWWWWWWW.',
    '.WWWW..WWWW.',
    '.WWWW..WWWW.',
    '.WWWW..WWWW.',
    '.WWWW..WWWW.'
  ]),
  // Spawn: a bed (where you wake up).
  spawn: icon(PAL.spawn, [
    'K...........',
    'K...........',
    'K.KKK.......',
    'K.KPK.......',
    'KKKKKRRRRRRR',
    'KKKKKRRRRRRR',
    'KKKKKKKKKKKK',
    'K..........K',
    'K..........K'
  ], { P: W, R: hex('#D33B3B') }),
  // A landmark: a camera (the map symbol for sights; columns would read as the Bank heist).
  landmark: icon(PAL.landmark, [
    '...WWW......',
    '..WWWWW.....',
    'WWWWWWWWWWWW',
    'WWWW....WWWW',
    'WWW......WWW',
    'WWW..WW..WWW',
    'WWW..WW..WWW',
    'WWW......WWW',
    'WWWW....WWWW',
    'WWWWWWWWWWWW'
  ]),
  // A garage: a low wide roof over a full-width roll-up door (the base's house has a steep roof and a small door).
  garagepl: icon(PAL.garage, [
    '....WWWW....',
    '..WWWWWWWW..',
    'WWWWWWWWWWWW',
    'WW........WW',
    'WW.WWWWWW.WW',
    'WW........WW',
    'WW.WWWWWW.WW',
    'WW........WW',
    'WW.WWWWWW.WW',
    'WW........WW'
  ]),
  // A crate stand: the crates app's chest (dark ink on gold, a white lock).
  crate: icon(PAL.crate, [
    '.CCCCCCCCCC.',
    'CCCCCCCCCCCC',
    'CCCCCCCCCCCC',
    '............',
    'CCCCCLLCCCCC',
    'CCCCCLLCCCCC',
    'CCCCCCCCCCCC',
    'CCCCCCCCCCCC',
    'CCCCCCCCCCCC'
  ], { C: hex('#5A3A12'), L: W }, { shadowAlpha: 40 }),
  // Shops by kind: guns (a pistol), gear (a tactical helmet with goggles), bags (a duffel), heist tools (a wrench),
  // cars (a car from the front), anything else (a shopping cart).
  // The gun shop's tile a step lighter than PAL.shopGun, which vanished on the dark phone screen.
  shop_gun: icon(hex('#48484A'), [
    '.W........W.',
    'WWWWWWWWWWWW',
    'WWWWWWWWWWWW',
    'WWWWWWWWWWWW',
    '.....WWWWWWW',
    '.....W.WWWW.',
    '.....W.WWWW.',
    '......WWWWW.',
    '.......WWWWW',
    '.......WWWWW',
    '........WWWW'
  ]),
  shop_gear: icon(PAL.shopGear, [
    '....WWWW....',
    '..WWWWWWWW..',
    '.WWWWWWWWWW.',
    'WWWWWWWWWWWW',
    'WKKKKKKKKKKW',
    'WKLLLKKLLLKW',
    'WKLLLKKLLLKW',
    'WWKKKWWKKKWW',
    'WW........WW',
    'WW........WW'
  ], { L: hex('#8FD3FF') }),
  // The bag app's duffel (icons-apps.js bag), the same rows and colors.
  shop_bag: icon(PAL.shopBag, [
    '.....WWWW.....',
    '....WW..WW....',
    '....W....W....',
    '..WWWWWWWWWW..',
    '.WWszzzzzzsWW.',
    'WWWsWWWWWWsWWW',
    'WWWsWWWWWWsWWW',
    '.WWsWWWWWWsWW.',
    '..WWWWWWWWWW..'
  ], { z: shade(PAL.shopBag, 0.62), s: shade(W, 0.72) }),
  // Heist tools: a wrench on hardware orange (no other list tile is orange; gray sat too close to the store's safe).
  shop_tools: icon(hex('#D9731A'), WRENCH),
  shop_cars: icon(PAL.shopCars, [
    '...WWWWWW...',
    '..WSSSSSSW..',
    '.WSSSSSSSSW.',
    'WWWWWWWWWWWW',
    'WYYWWWWWWYYW',
    'WWWDDDDDDWWW',
    'WWWWWWWWWWWW',
    '.KK......KK.'
  ], { Y: hex('#FFE27A'), D: shade(PAL.shopCars, 0.8) }),
  shop_other: icon(PAL.shopOther, [
    'WWW.........',
    '..W.........',
    '..WWWWWWWWWW',
    '..WWWWWWWWWW',
    '...WWWWWWWWW',
    '...WWWWWWWW.',
    '....W.......',
    '....WWWWWWW.',
    '.....WW..WW.',
    '.....WW..WW.'
  ])
}
