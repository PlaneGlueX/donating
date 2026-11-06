// The Casino's art (casino.sk, tools/build/city/design/casino-games.md), all drawn here from scratch.
//   icons: the menus' chips (donating:chip_<n>, donating:chips), cards (donating:card_<rank><suit>, donating:card_back)
//          and slot symbols (donating:slot_<symbol>). Called from make-item-art.js.
//   furniture: slot cabinets, blackjack and roulette tables, the Lucky Wheel, the cashier's chip rack (donating:furn_*).
//          Called from furniture-art.js; casino.js puts them on the floor over barriers.
const RED = [206, 38, 44, 255], BLACK = [26, 26, 32, 255], WHITE = [246, 244, 236, 255], GOLD = [240, 198, 70, 255], GOLD_D = [168, 124, 34, 255], GREEN = [26, 132, 70, 255]
const hex = c => c.length === 4 ? c : [...c, 255]

// A 3x5 font (M and W 5x5; the rows are bitmaps).
const FONT = Object.fromEntries(Object.entries({
  A: '010/101/111/101/101', B: '110/101/110/101/110', C: '011/100/100/100/011', D: '110/101/101/101/110', E: '111/100/110/100/111',
  G: '011/100/101/101/011', H: '101/101/111/101/101', I: '111/010/010/010/111', J: '001/001/001/101/010', K: '101/101/110/101/101',
  F: '111/100/110/100/100', V: '101/101/101/101/010', L: '100/100/100/100/111', M: '10001/11011/10101/10001/10001', N: '101/111/111/111/101', O: '010/101/101/101/010', P: '110/101/110/100/100', Q: '010/101/101/110/011',
  R: '110/101/110/101/101', S: '011/100/010/001/110', T: '111/010/010/010/010', U: '101/101/101/101/111', W: '10001/10001/10101/11011/10001',
  X: '101/101/010/101/101', Y: '101/101/010/010/010', 0: '111/101/101/101/111', 1: '010/110/010/010/111', 2: '110/001/010/100/111',
  3: '110/001/010/001/110', 4: '101/101/111/001/001', 5: '111/100/110/001/110', 6: '011/100/111/101/111', 7: '111/001/010/010/010',
  8: '111/101/111/101/111', 9: '111/101/111/001/110', '.': '0/0/0/0/1', ' ': '00/00/00/00/00'
}).map(([k, v]) => [k, v.split('/')]))
const textWidth = (s, k = 1) => [...s].reduce((w, ch) => w + (FONT[ch][0].length + 1) * k, -k)
const text = (c, s, x, y, col, k = 1) => {
  for (const ch of s) {
    FONT[ch].forEach((row, dy) => [...row].forEach((b, dx) => { if (b === '1') c.fill(x + dx * k, y + dy * k, x + dx * k + k - 1, y + dy * k + k - 1, col) }))
    x += (FONT[ch][0].length + 1) * k
  }
}
const textC = (c, s, cx, y, col, k = 1) => text(c, s, Math.round(cx - textWidth(s, k) / 2), y, col, k)

// ---------- The slot symbols (also on the cabinets' screens) ----------
const SYMBOLS = {
  diamonds: {
    colors: { k: [18, 66, 120, 255], w: [224, 248, 255, 255], l: [132, 220, 248, 255], b: [58, 170, 226, 255], d: [28, 112, 178, 255] },
    rows: ['................', '................', '...kkkkkkkkkk...', '..kwwlllllbbbk..', '.kwwllllllbbbbk.', 'kkkkkkkkkkkkkkkk', 'klllbbbbbbddddbk', '.klllbbbbddddbk.', '..klllbbbddddk..', '...kllbbbdddk...', '....klbbbddk....', '.....klbbdk.....', '......klbk......', '.......kk.......', '................', '................']
  },
  sevens: {
    colors: { k: [80, 8, 14, 255], r: [226, 40, 44, 255], l: [255, 120, 104, 255], d: [158, 22, 30, 255] },
    rows: ['................', '.kkkkkkkkkkkkkk.', '.kllllllllllllk.', '.klrrrrrrrrrrrk.', '.krrrrrrrrrrddk.', '.kddkkkkkrrrddk.', '.kkk....krrrdk..', '.......krrrdk...', '......krrrdk....', '.....krrrdk.....', '....krrrdk......', '....krrrdk......', '...krrrdk.......', '...krrrdk.......', '...kkkkkk.......', '................']
  },
  bars: {
    colors: { k: [14, 14, 18, 255], b: [36, 36, 44, 255], l: [76, 76, 88, 255], w: [244, 240, 226, 255], g: [228, 186, 66, 255] },
    rows: ['................', '................', '................', 'gggggggggggggggg', 'gkkkkkkkkkkkkkkg', 'gkllllllllllllkg', 'gkbwwbbwbbwwbbkg', 'gkbwbwwbwbwbwbkg', 'gkbwwbwbwbwwbbkg', 'gkbwbwwwwbwbwbkg', 'gkbwwbwbwbwbwbkg', 'gkbbbbbbbbbbbbkg', 'gkkkkkkkkkkkkkkg', 'gggggggggggggggg', '................', '................']
  },
  bells: {
    colors: { k: [96, 58, 10, 255], y: [246, 202, 62, 255], l: [255, 240, 150, 255], d: [204, 142, 30, 255], c: [120, 72, 16, 255] },
    rows: ['................', '.......kk.......', '......kyyk......', '.....kkkkkk.....', '....klyyyydk....', '...klyyyyyydk...', '...klyyyyyydk...', '...klyyyyyydk...', '...klyyyyyydk...', '..klyyyyyyyydk..', '..klyyyyyyyydk..', '.kyyyyyyyyyyddk.', '.kkkkkkkkkkkkkk.', '......kcck......', '.......kk.......', '................']
  },
  cherries: {
    colors: { k: [90, 6, 24, 255], r: [222, 28, 56, 255], l: [255, 130, 140, 255], d: [158, 14, 40, 255], g: [52, 132, 48, 255], h: [98, 188, 72, 255], s: [70, 96, 36, 255] },
    rows: ['................', '.........gghh...', '........sgghhhh.', '.......ss.gghh..', '......s.s.......', '.....s...s......', '....s....s......', '...s.....s......', '.kkkk...kkkk....', 'krlrrk.krlrrk...', 'klrrrk.klrrrk...', 'krrrdk.krrrdk...', 'krrddk.krrddk...', '.kkkk...kkkk....', '................', '................']
  }
}
const drawSymbol = (c, name, x, y) => c.draw(SYMBOLS[name].rows, SYMBOLS[name].colors, x, y)

// ---------- Chips ----------
const CHIPS = { 10: [228, 228, 232], 50: [206, 40, 44], 100: [44, 170, 200], 250: [36, 140, 74], 500: [232, 128, 40], 10000: [222, 88, 150], 1000: [32, 32, 38], 5000: [116, 56, 176], 25000: [36, 86, 196], 100000: [226, 172, 44] }
const chipIcon = (c, col, x = 0, y = 0) => {
  const body = hex(col), dark = hex(col.map(v => Math.round(v * 0.65))), edge = col[0] > 200 && col[1] > 200 ? hex([190, 40, 44]) : hex([244, 244, 240])
  for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) {
    const dx = px - 7.5, dy = py - 7.5, r = Math.hypot(dx, dy)
    if (r > 7.6) continue
    let k = body
    if (r > 6.7) k = dark
    else if (r > 4.8) k = Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 4)) % 2 ? edge : body
    else if (r > 3.9) k = dark
    c.set(x + px, y + py, k)
  }
}

// ---------- Cards ----------
const SUITS = {
  S: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '.X.X.X.', '..XXX..'],
  H: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...', '.......'],
  D: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  C: ['..XXX..', '..XXX..', 'XX.X.XX', 'XXXXXXX', 'XX.X.XX', '...X...', '..XXX..']
}
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const cardBase = (c, face, edge) => {
  c.fill(3, 0, 12, 15, edge); c.fill(2, 1, 13, 14, edge)
  c.fill(3, 1, 12, 14, face)
}
const cardFace = (c, rank, suit) => {
  const ink = suit === 'H' || suit === 'D' ? RED : BLACK
  cardBase(c, WHITE, [120, 120, 128, 255])
  if (rank === '10') { c.fill(3, 2, 3, 6, ink); text(c, '0', 5, 2, ink) } else text(c, rank, 4, 2, ink)
  c.draw(SUITS[suit], { X: ink }, 6, 8)
}

// ---------- The Inside Track's runners ----------
const TRACK_COLORS = [[226, 52, 52], [58, 120, 236], [246, 206, 56], [60, 190, 90], [240, 240, 240], [176, 84, 220]]
const HORSE = ['................', '.......JJ.......', '......JJJJ......', '.......jj.......', '.....jjjjj......', '..bb..jjjj......', '.bbb..bbbbbbb...', 'bbbbbbbbbbbbbbt.',
  'b.bbbbbbbbbbbbtt', '...bbbbbbbbbbb.t', '....bbbbbbbbb..t', '....b.b...b.b...', '...b..b...b..b..', '...b..b...b..b..', '...k..k...k..k..', '................']

function icons ({ sprite, addCase, canvas }) {
  const icon = (base, name, draw) => {
    const c = canvas(16, 16)
    draw(c)
    sprite(name, c.png())
    addCase(base, `donating:${name}`, `donating:item/${name}`)
  }
  for (const [n, col] of Object.entries(CHIPS)) icon('gold_nugget', `chip_${n}`, c => chipIcon(c, col))
  // The chip menu's buttons: a band across the chip with the value, as colour alone doesn't say what a chip's worth.
  const chipButton = (name, col, label, ink = WHITE) => icon('gold_nugget', `chipbtn_${name}`, c => {
    chipIcon(c, col)
    c.fill(1, 4, 14, 10, BLACK)
    textC(c, label, 8, 5, ink)
  })
  for (const n of Object.keys(CHIPS).filter(n => n <= 10000)) chipButton(n, CHIPS[n], n >= 1000 ? `${n / 1000}K` : n)
  chipButton('min', [90, 200, 100], 'MIN', [150, 240, 150, 255])
  chipButton('max', [240, 198, 70], 'MAX', GOLD)
  // A horse side on, the jockey in the lane's colors: the menu's buttons and the displays on the screen.
  TRACK_COLORS.forEach((col, i) => icon('paper', `track_horse_${i + 1}`, c => c.draw(HORSE, { j: hex(col), J: hex(col.map(v => Math.round(v * 0.7))), b: [126, 78, 42, 255], t: [52, 32, 20, 255], k: [26, 26, 32, 255] })))
  // The balance: a small stack of chips.
  icon('gold_ingot', 'chips', c => {
    const stack = (x, y, col, h) => {
      const body = hex(col), dark = hex(col.map(v => Math.round(v * 0.62))), lite = hex(col.map(v => Math.min(255, v + 60)))
      for (let i = 0; i < h; i++) { const yy = y - i * 2; c.fill(x + 1, yy, x + 5, yy, dark); c.fill(x, yy - 1, x + 6, yy - 1, i % 2 ? lite : body) }
      c.fill(x + 1, y - h * 2, x + 5, y - h * 2, lite)
    }
    stack(1, 14, CHIPS[50], 4); stack(9, 14, CHIPS[250], 3); stack(5, 15, CHIPS[1000], 2)
  })
  // A reel on a cabinet in use: the symbol on white, to cover what's painted on the idle screen.
  for (const name of Object.keys(SYMBOLS)) {
    const c = canvas(16, 16)
    c.fill(0, 0, 15, 15, WHITE); drawSymbol(c, name, 0, 0)
    sprite(`reel_${name}`, c.png())
    addCase('paper', `donating:reel_${name[0].toUpperCase()}${name.slice(1)}`, `donating:item/reel_${name}`)
  }
  for (const suit of Object.keys(SUITS)) for (const rank of RANKS) {
    const c = canvas(16, 16)
    cardFace(c, rank, suit)
    const name = `card_${rank}${suit}`
    sprite(name.toLowerCase(), c.png()) // resource paths are lower case; the custom model data string isn't
    addCase('paper', `donating:${name}`, `donating:item/${name.toLowerCase()}`)
  }
  icon('paper', 'card_back', c => {
    cardBase(c, [120, 22, 44, 255], [60, 8, 22, 255])
    for (let y = 2; y < 14; y++) for (let x = 4; x < 12; x++) if ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) c.set(x, y, [214, 92, 110, 255])
    c.fill(6, 6, 9, 9, GOLD); c.fill(7, 7, 8, 8, [120, 22, 44, 255])
  })
}

// ---------- Furniture ----------
function furniture ({ model, box, mix, rgba }) {
  // A paint for an up face, drawn as the player in front sees it (row 0 = the far side). The model's -z faces the player
  // and the texture's top is -z, so the picture is turned a half circle.
  const turned = draw => c => {
    draw(c)
    const n = c.w, px = Buffer.from(c.px)
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) px.copy(c.px, ((n - 1 - y) * n + (n - 1 - x)) * 4, (y * n + x) * 4, (y * n + x) * 4 + 4)
  }
  // Fills a circle's rings outward from the centre: col(r, angle) = a color or null (see-through).
  const disc = (c, cx, cy, col) => {
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy
      const k = col(Math.hypot(dx, dy), (Math.atan2(dy, dx) + Math.PI * 2.5) % (Math.PI * 2))
      if (k) c.set(x, y, rgba(k))
    }
  }

  // ---- A slot cabinet, three blocks tall (the display in the middle block): a lit marquee, the screen with its three
  // reels, a button deck, a coin tray, a pull handle on the side. One color a row.
  const CABINETS = { red: [170, 30, 40], blue: [30, 70, 170], gold: [176, 128, 36], violet: [96, 44, 150] }
  const LINES = { red: ['sevens', 'sevens', 'sevens'], blue: ['diamonds', 'bells', 'diamonds'], gold: ['bars', 'bars', 'cherries'], violet: ['cherries', 'sevens', 'bells'] }
  for (const [kind, col] of Object.entries(CABINETS)) {
    const light = mix(col, [255, 255, 255], 0.3), dark = mix(col, [0, 0, 0], 0.4)
    const pal = [col, light, dark, [24, 24, 30], [200, 204, 214], [240, 198, 70], [226, 40, 44], [70, 200, 90], [250, 236, 180], [110, 112, 122]]
    // 0 body, 1 light, 2 dark, 3 black, 4 chrome, 5 gold, 6 red, 7 green, 8 bulb, 9 steel
    const parts = [
      box(1, -16, 2, 15, -4, 15, { all: 0, down: 2 }), // the lower cabinet
      box(1, -16, 1.6, 15, -14, 2, 3, { dirs: ['north'] }),
      box(2.5, -12.5, 1.9, 13.5, -6.5, 2, 0, { dirs: ['north'], p: { north: ['belly', 0, 0, 44, 24] } }),
      box(3, -6, 0.6, 13, -5, 2, 9), // the coin tray
      box(1, -4, 0, 15, -2, 12, { all: 2, up: 3 }), // the button deck
      box(3, -2, 1, 5.5, -1.4, 3, 6, { glow: 15 }), box(6.75, -2, 1, 9.25, -1.4, 3, 7, { glow: 15 }), box(10.5, -2, 1, 13, -1.4, 3, 5, { glow: 15 }),
      box(1, -2, 4, 15, 15, 15, { all: 0, north: 2 }), // the screen's housing
      box(2, -0.5, 3.9, 14, 13.5, 4, 3, { dirs: ['north'], p: { north: ['screen', 0, 0, 56, 56] }, glow: 15 }),
      box(1, 15, 3, 15, 16.5, 15, { all: 4 }), // a chrome ledge
      box(1, 16.5, 5, 15, 27, 15, { all: 0, north: 2 }), // the marquee
      box(1.5, 17.5, 4.9, 14.5, 26, 5, 3, { dirs: ['north'], p: { north: ['top', 0, 0, 52, 34] }, glow: 15 }),
      box(1, 27, 5, 15, 29, 15, { all: 1 }),
      box(3, 29, 7, 13, 31, 13, { all: 5 }, { glow: 12 }), // the crown light
      box(15, -1, 7, 16.2, 2, 10, 9), // the handle
      box(15.3, 2, 8, 15.9, 11, 9, 4),
      box(14.9, 11, 7.6, 16.3, 13, 9.4, 6, { glow: 6 })
    ]
    model(`slot_${kind}`, pal, parts, {
      screen: {
        w: 56,
        h: 56,
        draw: c => {
          c.fill(0, 0, 55, 55, BLACK); c.fill(1, 1, 54, 54, rgba(mix(col, [0, 0, 0], 0.55)))
          textC(c, kind === 'blue' ? 'DIAMOND' : kind === 'gold' ? 'BAR' : kind === 'violet' ? 'CHERRY' : 'TRIPLE 7', 28, 4, GOLD)
          c.fill(2, 13, 53, 38, GOLD_D)
          LINES[kind].forEach((sym, i) => { c.fill(3 + i * 17, 14, 18 + i * 17, 37, WHITE); drawSymbol(c, sym, 3 + i * 17, 18) })
          c.fill(2, 25, 53, 25, [226, 40, 44, 255]) // the pay line
          c.fill(6, 43, 49, 51, BLACK) // the read-out: casino.sk's label, while someone's at it
        }
      },
      top: {
        w: 52,
        h: 52,
        draw: c => {
          c.fill(0, 0, 51, 33, GOLD_D); c.fill(1, 1, 50, 32, rgba(col))
          for (let x = 2; x < 50; x += 4) { c.fill(x, 2, x + 1, 3, [255, 244, 190, 255]); c.fill(x, 29, x + 1, 30, [255, 244, 190, 255]) }
          textC(c, 'LUCKY', 26, 7, WHITE, 2); textC(c, 'SPIN', 26, 20, GOLD)
        }
      },
      belly: {
        w: 44,
        h: 44,
        draw: c => {
          c.fill(0, 0, 43, 23, rgba(dark))
          for (let x = -24; x < 44; x += 8) for (let y = 0; y < 24; y++) { c.fill(x + y, y, x + y + 2, y, rgba(light)) }
        }
      }
    })
  }

  // ---- A blackjack table, three blocks square at the display (the middle block): the curved side (stepped) faces the
  // players, the dealer stands behind the straight side with the chip tray and the shoe.
  const LEATHER = [44, 26, 20], FELT = [18, 106, 62], WOOD = [74, 44, 26]
  const TOP = [[-16, 4, 32, 32], [-12, -8, 28, 4], [-4, -16, 20, -8]] // x0, z0, x1, z1
  const inTop = (x, z, m) => TOP.some(([x0, z0, x1, z1]) => x >= x0 + m && x < x1 - m && z >= z0 + m && z < z1 - m)
  const bjPaint = turned(c => {
    const unit = u => (95 - u) / 2 - 16 // a texture pixel in model units (96 px over 48 units, turned)
    for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
      const mx = unit(x), mz = unit(y)
      if (!inTop(mx, mz, 0)) continue
      // 2 units of padded rail wherever the rim is near (the steps stay padded too).
      const rim = [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [2, -2], [-2, 2]].some(([dx, dz]) => !inTop(mx + dx, mz + dz, 0))
      c.set(x, y, rgba(rim ? LEATHER : mix(FELT, [0, 0, 0], ((x * 7 + y * 13) % 5) * 0.02)))
    }
    const G = [226, 196, 96, 255]
    for (const x of [37, 50]) { c.fill(x, 17, x + 8, 28, G); c.fill(x + 1, 18, x + 7, 27, rgba(FELT)) } // the dealer's cards
    textC(c, 'BLACKJACK', 48, 31, G, 2)
    textC(c, 'PAYS 3 TO 2', 48, 44, G)
    for (const cx of [20, 39, 57, 76]) {
      const cy = Math.abs(cx - 48) > 20 ? 60 : 66
      disc(c, cx, cy, r => r > 5.2 && r < 6.3 ? G : null)
    }
  })
  model('bjtable', [WOOD, mix(WOOD, [255, 255, 255], 0.14), mix(WOOD, [0, 0, 0], 0.3), LEATHER, FELT, [206, 40, 44], [36, 140, 74], [32, 32, 38], [228, 228, 232], [24, 24, 30], [240, 198, 70]], [
    box(-8, 0, -6, 24, 2, 26, { all: 2 }), // the plinth
    box(-5, 2, -3, 21, 11, 24, { all: 0, up: 2 }), // the body
    ...TOP.map(([x0, z0, x1, z1]) => box(x0, 11, z0, x1, 14, z1, { all: 3 }, { p: { up: ['felt', (x0 + 16) * 2, (z0 + 16) * 2, (x1 + 16) * 2, (z1 + 16) * 2] } })),
    box(-2, 14, 25, 18, 15, 31, 2), // the chip tray and its stacks
    box(-1, 15, 26, 3, 17, 30, 5), box(3.5, 15, 26, 7.5, 16.5, 30, 6), box(8, 15, 26, 12, 17.5, 30, 7), box(12.5, 15, 26, 16.5, 16, 30, 8),
    box(22, 14, 22, 28, 19, 30, { all: 9, up: 10 }) // the card shoe
  ], { felt: { w: 96, h: 96, draw: bjPaint } })

  // ---- Roulette, two models. The wheel (three blocks square at the display): a wooden bowl with the numbered wheel on
  // top. The layout (x -16..16, the next two blocks east at yaw 0): the betting grid, three columns of twelve.
  const RED_N = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
  const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
  const numberColor = n => n === 0 ? GREEN : RED_N.has(n) ? RED : BLACK
  model('roulette_wheel', [WOOD, mix(WOOD, [255, 255, 255], 0.14), mix(WOOD, [0, 0, 0], 0.3), LEATHER, FELT, [240, 198, 70], [200, 204, 214]], [
    box(-8, 0, -8, 24, 2, 24, { all: 2 }),
    box(-5, 2, -5, 21, 11, 21, { all: 0, up: 2 }),
    box(-16, 11, -16, 32, 14, 32, { all: 3, up: 4 }), // the table's top
    box(-14, 14, -14, 30, 15.5, 30, { all: 1, up: 2 }) // the bowl's wooden rim
  ])
  // The numbered wheel and the ball turn on their own displays (casino.sk), each model centred on its display. The disc's
  // texture top is -z, the side the player sees (see turned()); pocket i of ORDER is (i + 0.5) / 37 of a turn clockwise from it.
  model('roulette_disc', [WOOD, mix(WOOD, [255, 255, 255], 0.14), mix(WOOD, [0, 0, 0], 0.3), LEATHER, FELT, [240, 198, 70], [200, 204, 214]], [
    box(-14, 8, -14, 30, 8.02, 30, 0, { dirs: ['up'], p: { up: ['wheel', 0, 0, 512, 512] } }),
    box(6.5, 8, 6.5, 9.5, 9.5, 9.5, 5), // the turret
    box(7.3, 9.5, 7.3, 8.7, 12.5, 8.7, 6), box(3, 10.5, 7.5, 13, 11.3, 8.5, 6), box(7.5, 10.5, 3, 8.5, 11.3, 13, 6), box(7.1, 12.5, 7.1, 8.9, 13.5, 8.9, 5)
  ], {
    wheel: {
      w: 512,
      h: 512,
      draw: c => disc(c, 256, 256, (R, a) => {
        const r = R / 4 // 4 px to the old unit, so the pockets' numbers are sharp
        if (r > 63) return null
        if (r > 58) return mix(WOOD, [255, 255, 255], 0.25)
        if (r > 49) return [214, 200, 170] // the ball track
        if (r > 34) { // the pockets
          const i = Math.floor(a / (Math.PI * 2) * 37)
          const edge = (a / (Math.PI * 2) * 37) % 1 < 0.08
          if (edge) return GOLD
          // The number, its top to the rim: 3 px a font pixel, from 1 unit inside the pocket's outer edge.
          const label = [...String(ORDER[i])]
          const gx = Math.floor(((a - (i + 0.5) / 37 * Math.PI * 2) * R + (label.length * 4 - 1) * 1.5) / 3)
          const gy = Math.floor((48 - r) * 4 / 3)
          const ch = label[Math.floor(gx / 4)]
          if (gx >= 0 && gy >= 0 && gy < 5 && gx % 4 < 3 && ch && FONT[ch][gy][gx % 4] === '1') return WHITE
          return numberColor(ORDER[i])
        }
        if (r > 31) return GOLD
        if (r > 12) return Math.floor(a / (Math.PI / 4)) % 2 ? [150, 96, 50] : [112, 70, 36]
        return GOLD_D
      })
    }
  })
  model('roulette_ball', [[246, 244, 236]], [box(7.4, 8.02, -6.9, 8.6, 9.2, -5.7, 0)]) // in the pockets' ring on the disc's -z side
  // 96 px over 48 units; the layout's 64 px wide (model x -16..16) sit at the texture's right once turned: 32 px a block from x 885,
  // z 356. casino.sk's rlSpotAim and rlSpotLoc read these same rows and columns.
  const layoutPaint = turned(c => {
    c.fill(0, 0, 63, 95, rgba(LEATHER))
    c.fill(2, 2, 61, 93, rgba(FELT))
    const cell = (x0, y0, x1, y1, col, label, ink = WHITE) => { c.fill(x0, y0, x1, y1, col); if (label) textC(c, label, (x0 + x1 + 1) / 2, Math.round((y0 + y1) / 2) - 2, ink) }
    const SIDE = [226, 216, 180, 255]
    cell(26, 3, 60, 8, GREEN, '0')
    for (let n = 1; n <= 36; n++) { const x = 26 + (n - 1) % 3 * 12, y = 10 + Math.floor((n - 1) / 3) * 6; cell(x, y, x + 10, y + 4, numberColor(n), String(n)) }
    for (let i = 0; i < 3; i++) {
      cell(26 + i * 12, 82, 36 + i * 12, 87, SIDE, `C${i + 1}`, BLACK)
      const y = 10 + i * 24
      c.fill(18, y, 24, y + 22, SIDE)
      ;[...['1ST', '2ND', '3RD'][i]].forEach((ch, j) => textC(c, ch, 21.5, y + 3 + j * 6, BLACK))
    }
    ;[['LOW', SIDE, BLACK], ['EVEN', SIDE, BLACK], ['', RED], ['', BLACK], ['ODD', SIDE, BLACK], ['HIGH', SIDE, BLACK]].forEach(([label, col, ink], j) => cell(3, 10 + j * 12, 16, 20 + j * 12, col, label, ink))
  })
  model('roulette_felt', [WOOD, mix(WOOD, [255, 255, 255], 0.14), mix(WOOD, [0, 0, 0], 0.3), LEATHER, FELT], [
    box(-12, 0, -8, 12, 2, 24, { all: 2 }),
    box(-10, 2, -5, 10, 11, 21, { all: 0, up: 2 }),
    box(-16, 11, -16, 16, 14, 32, { all: 3 }, { p: { up: ['grid', 32, 0, 96, 96] } })
  ], { grid: { w: 96, h: 96, draw: layoutPaint } })

  // ---- The Lucky Wheel: a flat disc centred on the display, so a spin only turns the display (casino.sk). Scale 4/3 makes it
  // four blocks across. Twenty segments clockwise from the top, the same order as core.sk's casino::wheel-segments
  // (tools/casino-sim.js checks it).
  const WHEEL = ['1K', '2.5K', '5K', 'KEY', '1K', '2.5K', 'XP', '5K', '2.5K', '10K', '1K', '2.5K', 'KEY', '5K', '2.5K', '25K', '1K', '2.5K', 'XP', '2.5K']
  const WCOL = { '1K': [40, 110, 210], '2.5K': [36, 150, 86], '5K': [150, 60, 190], '10K': [226, 60, 50], '25K': [246, 190, 40], XP: [240, 120, 40], KEY: [34, 34, 42] }
  const wheelFace = c => {
    disc(c, 64, 64, (r, a) => {
      if (r > 63.5) return null
      if (r > 59) return Math.floor(a / (Math.PI / 10)) % 2 ? GOLD : GOLD_D
      if (r < 11) return r < 8 ? WHITE : GOLD
      const f = a / (Math.PI * 2) * 20, i = Math.floor(f)
      if (f % 1 < 0.04 || f % 1 > 0.96) return WHITE
      return mix(WCOL[WHEEL[i]], [0, 0, 0], r < 30 ? 0.18 : 0)
    })
    WHEEL.forEach((s, i) => {
      const a = (i + 0.5) / 20 * Math.PI * 2 - Math.PI / 2
      const x = 64 + Math.cos(a) * 44, y = 64 + Math.sin(a) * 44
      textC(c, s, x, Math.round(y - 2), s === '25K' ? BLACK : WHITE)
    })
  }
  const ring = c => disc(c, 64, 64, r => r <= 63.5 && r > 58 ? GOLD_D : null)
  model('wheel', [[240, 198, 70], [168, 124, 34], [246, 244, 236]], [
    box(-16, -16, 6, 32, 32, 6.02, 0, { dirs: ['north'], p: { north: ['face', 0, 0, 128, 128] }, glow: 8 }),
    box(-16, -16, 9.98, 32, 32, 10, 0, { dirs: ['south'], p: { south: ['face', 0, 0, 128, 128] } }),
    box(-16, -16, 7, 32, 32, 7.02, 0, { dirs: ['north', 'south'], p: { north: ['ring', 0, 0, 128, 128], south: ['ring', 0, 0, 128, 128] } }),
    box(-16, -16, 8, 32, 32, 8.02, 0, { dirs: ['north', 'south'], p: { north: ['ring', 0, 0, 128, 128], south: ['ring', 0, 0, 128, 128] } }),
    box(-16, -16, 9, 32, 32, 9.02, 0, { dirs: ['north', 'south'], p: { north: ['ring', 0, 0, 128, 128], south: ['ring', 0, 0, 128, 128] } }),
    box(5.5, 5.5, 4.5, 10.5, 10.5, 11.5, { all: 0, north: 2 }) // the hub
  ], { face: { w: 128, h: 128, draw: wheelFace }, ring: { w: 128, h: 128, draw: ring } })
  // What the prize stops under: a gold arrow at the top of the disc, on its own display so it stays still.
  model('wheel_pointer', [[240, 198, 70], [168, 124, 34]], [
    box(4, 11, 7, 12, 13, 9, { all: 1, north: 0 }), box(5, 9, 7, 11, 11, 9, { all: 1, north: 0 }), box(6, 7, 7, 10, 9, 9, { all: 1, north: 0 }), box(7, 5, 7, 9, 7, 9, { all: 1, north: 0 })
  ])

  // ---- The Inside Track's screen: a plane centred on its display, eleven blocks by five at scale 11/3 (x 894.97, z 334..345,
  // y 76..81 on the east wall). A band with the title over the board's line, six lanes, the gate on the left, the finish, and a
  // column for what each horse pays (casino.sk's labels), as the seats see it. Lane rows and the runners' y: tools/build/city/casino.js.
  const lane = i => 16 + Math.round(i * 64 / 6)
  const trackFace = c => {
    c.fill(0, 0, 175, 79, [14, 16, 26, 255])
    for (let i = 0; i < 6; i++) {
      const y0 = lane(i), y1 = lane(i + 1) - 1
      c.fill(0, y0, 175, y1, i % 2 ? [46, 112, 58, 255] : [54, 128, 66, 255])
      c.fill(0, y0, 175, y0, [226, 232, 220, 255]) // the rail
      c.fill(0, y0 + 1, 11, y1, hex(TRACK_COLORS[i]))
      textC(c, String(i + 1), 6, Math.round((y0 + y1) / 2) - 2, i === 4 || i === 2 ? BLACK : WHITE)
      for (let y = y0 + 1; y <= y1; y++) for (let x = 146; x < 150; x++) c.set(x, y, (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? WHITE : BLACK) // the finish
      c.fill(150, y0 + 1, 175, y1, [14, 16, 26, 255])
    }
    c.fill(12, 16, 13, 79, WHITE) // the gate
    textC(c, 'INSIDE TRACK', 88, 2, GOLD)
  }
  model('track_screen', [[14, 16, 26]], [
    box(-16, -2.91, 8, 32, 18.91, 8.02, 0, { dirs: ['north'], p: { north: ['face', 0, 0, 176, 80] } })
  ], { face: { w: 176, h: 80, draw: trackFace } })

  // A seat's betting pad, on the ledge before it: a button for each horse in its lane's color, 1 2 3 far and 4 5 6 near (casino.sk's trackClick).
  const padPaint = turned(c => {
    c.fill(0, 0, 47, 47, [30, 30, 38, 255])
    TRACK_COLORS.forEach((col, i) => { const x = 2 + (i % 3) * 15, y = 3 + Math.floor(i / 3) * 22; c.fill(x, y, x + 13, y + 19, hex(col)); textC(c, String(i + 1), x + 7, y + 5, i === 2 || i === 4 ? BLACK : WHITE, 2) })
  })
  model('track_pad', [[30, 30, 38]], [box(0, 0, 0, 16, 0.3, 16, 0, { dirs: ['up'], p: { up: ['face', 0, 0, 48, 48] }, glow: 10 })], { face: { w: 48, h: 48, draw: padPaint } })

  // ---- The cashier's rack on the counter: a tray with stacks of every color and a brass bell.
  const stacks = [CHIPS[10], CHIPS[50], CHIPS[250], CHIPS[1000], CHIPS[5000], CHIPS[25000], CHIPS[100000]]
  model('cashier', [[60, 36, 22], [86, 54, 32], [240, 198, 70], [168, 124, 34], ...stacks], [
    box(-8, 0, 3, 24, 1, 13, { all: 0, up: 1 }),
    ...stacks.map((_, i) => box(-6.5 + i * 3.5, 1, 4.5, -3.8 + i * 3.5, 3 + (i % 3) * 1.4, 7.5, 4 + i)),
    ...stacks.map((_, i) => box(-6.5 + i * 3.5, 1, 8.5, -3.8 + i * 3.5, 4.6 - (i % 3) * 1.1, 11.5, 4 + (i + 3) % stacks.length)),
    box(20, 1, 6, 23, 3, 9, 3), box(20.5, 3, 6.5, 22.5, 4.2, 8.5, 2), box(21.1, 4.2, 7.1, 21.9, 5, 7.9, 2)
  ])
}

module.exports = { icons, furniture }
