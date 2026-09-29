// The phone's home-screen app icons and the header arrows (tools\make-phone-ui.js loads this).
// Each entry draws on a 16x16 canvas: a tile (common.js) with a white symbol, or, for the arrows, the symbol alone.
const { tile, glyph, shade, hex, PAL } = require('./common.js')

const W = PAL.white
const GLASS = [255, 255, 255, 110] // car windows
const PASSIVE_ON = hex('#1F9D55') // deeper than PAL.messages' green, which sits on the same screen
const HELP = hex('#5E5CE6') // indigo: no other home-screen tile uses it (the old dark gray sat next to passive_off's gray)
const STATS = hex('#4F6D8A') // the Profile / stats app, slate blue (a flat icon: a player head renders as a 3D skull)

// The garage car, the crates chest and the bag's duffel below are the reference art: icons-gps.js copies
// those rows verbatim for its car, crate and bag-shop icons (exports here must stay draw functions).

// A white symbol on a tile; `extra` maps more characters to colors.
const app = (color, rows, extra = {}, opts = {}) => c => {
  tile(c, color)
  glyph(c, rows, { '#': W, ...extra }, opts)
}

// The passive shield (10 x 12), flat-topped (a pointed top made the hollow one read as a guitar pick); passive_off draws it hollow.
const SHIELD = [
  '.########.',
  '##########',
  '##########',
  '##########',
  '##########',
  '##########',
  '##########',
  '.########.',
  '.########.',
  '..######..',
  '...####...',
  '....##....'
]

module.exports = {
  // A speech bubble with its tail at the bottom left.
  messages: app(PAL.messages, [
    '..########..',
    '.##########.',
    '############',
    '############',
    '############',
    '############',
    '.##########.',
    '.#########..',
    '.##.........',
    '##..........'
  ]),

  // A map pin with a hole.
  gps: app(PAL.gps, [
    '...####...',
    '.########.',
    '.###..###.',
    '###....###',
    '###....###',
    '.###..###.',
    '.########.',
    '..######..',
    '...####...',
    '....##....',
    '....##....'
  ]),

  // A bold five-point star.
  missions: app(PAL.missions, [
    '.....##.....',
    '.....##.....',
    '....####....',
    '....####....',
    '############',
    '.##########.',
    '..########..',
    '...######...',
    '...######...',
    '..###..###..',
    '..##....##..',
    '.##......##.'
  ]),

  // A car from the side: white body, glassy windows, dark wheels with a white hub.
  garage: app(PAL.garage, [
    '...######...',
    '..#gg#ggg#..',
    '.#ggg#gggg#.',
    '############',
    '############',
    '############',
    '#kkk####kkk#',
    '.kwk....kwk.',
    '..k......k..'
  ], { g: GLASS, k: PAL.ink, w: shade(W, 0.8) }),

  // A duffel bag like the game's own bag item: a wide handle, brown straps running down the body.
  bag: app(PAL.bag, [
    '...######...',
    '..##....##..',
    '..#......#..',
    '.##########.',
    '###s####s###',
    '###s####s###',
    '###s####s###',
    '###s####s###',
    '.##########.'
  ], { s: shade(PAL.bag, 0.72) }),

  // A treasure chest in dark ink (white doesn't read on gold), a white lock.
  crates: app(PAL.crates, [
    '.##########.',
    '############',
    '############',
    '............',
    '#####ll#####',
    '#####ll#####',
    '############',
    '############',
    '############'
  ], { '#': hex('#5A3A12'), l: W }, { shadowAlpha: 40 }),

  // A t-shirt: sloped shoulders, a collar notch, short sleeves.
  cosmetics: app(PAL.cosmetics, [
    '...##..##...',
    '..###..###..',
    '.##########.',
    '############',
    '##.######.##',
    '...######...',
    '...######...',
    '...######...',
    '...######...',
    '...######...'
  ]),

  // A trophy: a cup with closed handle loops, a stem and a base.
  season: app(PAL.season, [
    '..########..',
    '############',
    '#.########.#',
    '#.########.#',
    '.##########.',
    '...######...',
    '....####....',
    '.....##.....',
    '.....##.....',
    '....####....',
    '...######...'
  ]),

  // A skull (the tab list's bounty glyph is a skull too).
  bounties: app(PAL.bounties, [
    '..######..',
    '.########.',
    '##########',
    '##########',
    '#..####..#',
    '#..####..#',
    '####..####',
    '.########.',
    '..#.##.#..',
    '..######..'
  ]),

  // Passive on: a white shield with a green check, on a deeper green than Messages (both are on the home screen).
  passive_on: c => {
    tile(c, PASSIVE_ON)
    glyph(c, SHIELD, { '#': W })
    glyph(c, [
      '.......k',
      '......kk',
      'k....kk.',
      'kk..kk..',
      '.kkkk...',
      '..kk....'
    ], { k: shade(PASSIVE_ON, 0.75) }, { x: 4, y: 5, shadow: false })
  },

  // Passive off: the same shield, hollow (off, like an empty toggle).
  passive_off: app(PAL.passiveOff, [
    '.########.',
    '##########',
    '##......##',
    '##......##',
    '##......##',
    '##......##',
    '###....###',
    '.##....##.',
    '.###..###.',
    '..######..',
    '...####...',
    '....##....'
  ]),

  // Stats (the Profile app, if phone.sk uses a flat icon instead of the player's head): a rising bar chart.
  stats: app(STATS, [
    '.........##.',
    '.........##.',
    '......##.##.',
    '......##.##.',
    '...##.##.##.',
    '...##.##.##.',
    '##.##.##.##.',
    '##.##.##.##.',
    '##.##.##.##.',
    '............',
    '############'
  ]),

  // A bold question mark, its stem and dot centred under the arc.
  help: app(HELP, [
    '..######..',
    '.########.',
    '.###..###.',
    '......###.',
    '.....###..',
    '....###...',
    '....##....',
    '....##....',
    '..........',
    '....##....',
    '....##....'
  ]),

  // The home button's clickable item: nothing (the button is drawn in the background).
  blank: c => { },

  // An empty page's note ("No messages yet", ui.sk phoneEmptyIcon): a dim empty tray, no tile, so it reads as "nothing
  // here" and its name shows on hover (a see-through icon left empty pages looking broken).
  empty: c => glyph(c, [
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '####....####',
    '#..######..#',
    '#..........#',
    '############'
  ], { '#': [142, 142, 147, 255] }),

  // Header arrows: no tile, a white symbol with a soft shadow.
  back: c => glyph(c, [
    '....##',
    '...###',
    '..###.',
    '.###..',
    '###...',
    '.###..',
    '..###.',
    '...###',
    '....##'
  ], { '#': W }, { shadowAlpha: 110 }),
  // Page arrows: solid triangles, 6 wide so they sit dead centre (5 texels each side).
  prev: c => glyph(c, [
    '....##',
    '...###',
    '..####',
    '.#####',
    '######',
    '.#####',
    '..####',
    '...###',
    '....##'
  ], { '#': W }, { shadowAlpha: 110 }),
  next: c => glyph(c, [
    '##....',
    '###...',
    '####..',
    '#####.',
    '######',
    '#####.',
    '####..',
    '###...',
    '##....'
  ], { '#': W }, { shadowAlpha: 110 })
}
