// Draws the first group of hit targets' skins (hits.sk): Vinnie Marchetti (vinnie), Dmitri Volkov (dmitri)
// and Sal Esposito (sal), in the standard 64x64 player skin layout (wide 4-pixel arms), like make-cop-skin.js.
// Writes server\plugins\Citizens\skins\<id>.png and tools\skins\<id>.png, plus tools\skins\preview-<id>.png
// (front, back, right side, left side and head top at 8x, and a small front view to judge it from afar).
// Usage: tools\node\node.exe tools\skins\make-targets1-skins.js
const fs = require('fs')
const path = require('path')
const { canvas, shade } = require('../png')

const ROOT = path.join(__dirname, '..', '..')
const OUT = [path.join(ROOT, 'server', 'plugins', 'Citizens', 'skins'), __dirname]

// ---------- The skin layout ----------
// [u, v, w, h, d]: a box of w x h x d pixels whose unfolded faces start at (u, v).
const PARTS = {
  head: [0, 0, 8, 8, 8], hat: [32, 0, 8, 8, 8],
  body: [16, 16, 8, 12, 4], jacket: [16, 32, 8, 12, 4],
  rarm: [40, 16, 4, 12, 4], rsleeve: [40, 32, 4, 12, 4],
  larm: [32, 48, 4, 12, 4], lsleeve: [48, 48, 4, 12, 4],
  rleg: [0, 16, 4, 12, 4], rpants: [0, 32, 4, 12, 4],
  lleg: [16, 48, 4, 12, 4], lpants: [0, 48, 4, 12, 4]
}
const SIDES = ['right', 'front', 'left', 'back']
// A face's rectangle [x, y, w, h]. Front: x 0 = the character's right (the viewer's left).
// Right face: x 0 = the back edge; left face: x 0 = the front edge. Top: the last row is the front edge.
const rect = (part, f) => {
  const [u, v, w, h, d] = PARTS[part]
  switch (f) {
    case 'top': return [u + d, v, w, d]
    case 'bottom': return [u + d + w, v, w, d]
    case 'right': return [u, v + d, d, h]
    case 'front': return [u + d, v + d, w, h]
    case 'left': return [u + d + w, v + d, d, h]
    case 'back': return [u + 2 * d + w, v + d, w, h]
  }
  throw new Error('face ' + f)
}

function skin () {
  const c = canvas(64, 64)
  const k = {
    c,
    set (part, f, x, y, col) {
      const [fx, fy, w, h] = rect(part, f)
      if (x < 0 || y < 0 || x >= w || y >= h) return
      c.set(fx + x, fy + y, col)
    },
    fill (part, f, x0, y0, x1, y1, col) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) k.set(part, f, x, y, col) },
    face (part, f, col) { const [, , w, h] = rect(part, f); k.fill(part, f, 0, 0, w - 1, h - 1, col) },
    // Every face of a part: the four sides, then the top and the bottom.
    box (part, col, top = col, bottom = col) { for (const f of SIDES) k.face(part, f, col); k.face(part, 'top', top); k.face(part, 'bottom', bottom) },
    // Rows y0..y1 all the way round a part.
    ring (part, y0, y1, col) { for (const f of SIDES) { const [, , w] = rect(part, f); k.fill(part, f, 0, y0, w - 1, y1, col) } },
    // A pixel on a side face counted from its front edge (0 = next to the front face).
    side (part, which, fromFront, y, col) { const [, , w] = rect(part, which); k.set(part, which, which === 'right' ? w - 1 - fromFront : fromFront, y, col) },
    // Character rows onto a face; characters missing from the palette are left alone.
    grid (part, f, rows, pal) { rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) k.set(part, f, x, y, pal[ch]) })) },
    // The same rows on both side faces, column 0 = the front edge.
    sideGrid (part, rows, pal) {
      rows.forEach((row, y) => [...row].forEach((ch, i) => { if (pal[ch]) { k.side(part, 'right', i, y, pal[ch]); k.side(part, 'left', i, y, pal[ch]) } }))
    },
    // A limb's front face column counted from the body's side (0 = next to the body).
    inner (part, i) { return part.startsWith('r') ? 3 - i : i }
  }
  return k
}

const WHITE = [242, 242, 238, 255]
const rgb = (r, g, b) => [r, g, b, 255]

// ---------- Vinnie Marchetti: white suit, black shirt open at the collar, thick gold chain, slicked hair, shades ----------
function vinnie () {
  const k = skin()
  const SK = rgb(198, 146, 102); const SKD = shade(SK, 0.84); const SKL = shade(SK, 1.1)
  const HR = rgb(22, 20, 24); const HRM = rgb(46, 46, 56); const HRL = rgb(92, 100, 122)
  const W = rgb(236, 233, 222); const WF = shade(W, 0.92); const WD = shade(W, 0.85); const WDD = shade(W, 0.72); const WL = rgb(252, 252, 248)
  const B = rgb(26, 24, 30); const BL = rgb(62, 60, 70)
  const G = rgb(228, 176, 44); const GL = rgb(255, 226, 112); const GD = rgb(166, 118, 28)
  const LENS = rgb(12, 12, 16); const LENSL = rgb(54, 66, 88)
  const RED = rgb(186, 28, 40); const REDD = rgb(130, 18, 28)
  const LIP = rgb(128, 74, 58)
  const IRIS = rgb(74, 46, 26)
  const SHOE = rgb(24, 20, 20); const SHOEL = rgb(88, 80, 80); const SHOED = rgb(12, 10, 10)
  const P = { H: HR, M: HRM, L: HRL, S: SK, s: SKD, l: SKL, E: WHITE, I: IRIS, m: LIP, b: HRM }

  // Head: slicked-back black hair with a sheen running front to back, a widow's peak, a smirk.
  k.box('head', SK, HR, SKD)
  k.grid('head', 'top', [
    'HHHHHHHH',
    'HHHHHHHH',
    'HHMHHMHH',
    'HHLHHLHH',
    'HHLHHLHH',
    'HHLHHLHH',
    'HHMHHMHH',
    'HHHHHHHH'
  ], P)
  k.grid('head', 'front', [
    'HHHHHHHH',
    'HSSHHSSH',
    'SbbSSbbS',
    'SSSSSSSS',
    'SEISSIES',
    'SSSssSSS',
    'SSSmmmSS',
    'sSSSSSSs'
  ], P)
  k.sideGrid('head', [
    'HHHHHHHH',
    'HHHHHHHH',
    'SHHHHHHH',
    'SHSssHHH',
    'SSSssHHH',
    'SSSssMMM',
    'SSSSSSSS',
    'sSSSSSSS'
  ], P)
  k.grid('head', 'back', [
    'HHHHHHHH',
    'HHHHHHHH',
    'HHHHHHHH',
    'HHHHHHHH',
    'HHHHHHHH',
    'MMMMMMMM',
    'SSSSSSSS',
    'ssssssss'
  ], P)
  // Hat layer: the sunglasses (black lenses with a faint glint, a gold bridge and gold temples to the ears).
  const Q = { g: GD, K: LENS, k: LENSL }
  k.grid('hat', 'front', [
    '........',
    '........',
    '........',
    'gkKggkKg',
    '.KK..KK.'
  ], Q)
  k.sideGrid('hat', ['', '', '', 'ggg'], Q)

  // Body: the white jacket, the black shirt's open collar with the chain on the chest, a red pocket square.
  const PB = { W, f: WF, w: WD, v: WDD, l: WL, B, b: BL, S: SK, s: SKD, G, Y: GL, g: GD, R: RED, r: REDD, K: B }
  k.box('body', W, W, WDD)
  k.grid('body', 'front', [
    'WBBSSBBW',
    'WBYSsYBW',
    'WBGYYGBW',
    'WwBgGBwW',
    'WWwBBwRW',
    'WWWwBwrW',
    'WWWwWWWW',
    'WWWwKWWW',
    'WWWwWWWW',
    'WWWwWWWW',
    'fWWwKWWf',
    'vvvvvvvv'
  ], PB)
  k.grid('body', 'back', [
    'WBBBBBBW',
    'WffffffW',
    'WWWWWWWW',
    'WWWWWWWW',
    'WWWWWWWW',
    'WWWWWWWW',
    'WWWWWWWW',
    'WWWfWWWW',
    'WWWfWWWW',
    'WWWwWWWW',
    'fWWwWWWf',
    'vvvvvvvv'
  ], PB)
  for (const f of ['right', 'left']) k.grid('body', f, ['WWWW', 'WWWW', 'WWWW', 'WWWW', 'WWWW', 'WWWW', 'WWWW', 'WWWW', 'WWWW', 'WWWW', 'ffff', 'vvvv'], PB)
  k.grid('body', 'top', ['WWWWWWWW', 'WWBBBBWW', 'WBSSSSBW', 'WBYSSYBW'], PB)

  // Arms: white sleeves, black shirt cuffs, a gold ring (right hand) and a gold watch (left wrist).
  const arm = (part, outer) => {
    k.box(part, W, WL, SKD)
    k.ring(part, 7, 7, WF)
    k.ring(part, 8, 8, B)
    k.ring(part, 9, 11, SK)
    k.ring(part, 11, 11, SKD)
    k.set(part, 'front', k.inner(part, 0), 4, WF) // elbow crease
    k.fill(part, outer, 0, 1, 3, 1, WF) // shoulder seam
    k.set(part, 'front', k.inner(part, 3), 9, SKL) // knuckle light
  }
  arm('rarm', 'right')
  arm('larm', 'left')
  k.set('rarm', 'front', k.inner('rarm', 3), 10, G); k.side('rarm', 'right', 0, 10, GD) // pinky ring
  k.ring('larm', 8, 8, G) // gold watch over the cuff
  k.set('larm', 'front', 1, 8, GL); k.set('larm', 'front', 2, 8, GL)
  k.fill('larm', 'left', 0, 8, 3, 8, GD)

  // Legs: white trousers with a pressed crease, black shoes.
  const leg = (part) => {
    k.box(part, W, W, SHOED)
    k.ring(part, 9, 9, WD)
    k.ring(part, 10, 11, SHOE)
    k.ring(part, 11, 11, SHOED)
    k.fill(part, 'front', 1, 0, 2, 8, W)
    k.fill(part, 'front', k.inner(part, 0), 0, k.inner(part, 0), 9, WD) // inner shadow
    k.fill(part, 'front', k.inner(part, 2), 1, k.inner(part, 2), 8, WL) // crease
    k.fill(part, 'front', 1, 10, 2, 10, SHOEL) // toe shine
  }
  leg('rleg')
  leg('lleg')
  return k
}

// ---------- Dmitri Volkov: long black coat, shaved head, a scar across one eyebrow, black turtleneck, grey trousers ----------
function dmitri () {
  const k = skin()
  const SK = rgb(232, 198, 176); const SKD = shade(SK, 0.84); const SKL = rgb(248, 222, 204)
  const TOP = rgb(212, 182, 166) // the stubble of a shaved head
  const BROW = rgb(84, 62, 50)
  const SCAR = rgb(180, 96, 100); const SCARL = rgb(214, 150, 146)
  const IRIS = rgb(78, 120, 158)
  const LIP = rgb(150, 100, 94)
  const C = rgb(30, 29, 32); const CM = rgb(48, 47, 54); const CL = rgb(78, 78, 88); const CD = rgb(14, 14, 16)
  const T = rgb(46, 48, 58); const TR = rgb(34, 35, 42); const TU = rgb(70, 72, 86)
  const N = rgb(142, 144, 152)
  const TRS = rgb(116, 118, 126); const TRSD = rgb(88, 90, 98); const TRSL = rgb(146, 148, 156)
  const BOOT = rgb(22, 20, 20); const BOOTL = rgb(80, 74, 72); const BOOTD = rgb(10, 9, 9)
  const P = { S: SK, s: SKD, l: SKL, T: TOP, B: BROW, X: SCAR, x: SCARL, E: WHITE, I: IRIS, m: LIP }

  // Head: shaved (stubble on top, a shine), heavy brows, cold blue eyes, a scar through the left eyebrow.
  k.box('head', SK, TOP, SKD)
  k.grid('head', 'top', [
    'TTTTTTTT',
    'TTTTTTTT',
    'TTTTTTTT',
    'TTTTllTT',
    'TTTlllTT',
    'TTTllTTT',
    'TTTTTTTT',
    'TTTTTTTT'
  ], P)
  k.grid('head', 'front', [
    'TTTTTTTT',
    'SSSSSSxS',
    'SSSSSXSS',
    'SBBSSXBS',
    'SEISSIES',
    'SSSssxSS',
    'SSmmmmSS',
    'sSSSSSSs'
  ], P)
  k.sideGrid('head', [
    'TTTTTTTT',
    'STTTTTTT',
    'SSSSSTTT',
    'SSSssSSS',
    'SSSssSSS',
    'SSSssSSS',
    'SSSSSSSS',
    'sSSSSSSS'
  ], P)
  k.grid('head', 'back', [
    'TTTTTTTT',
    'TTTTTTTT',
    'TTTTTTTT',
    'SSSSSSSS',
    'SSSSSSSS',
    'SSSSSSSS',
    'SSSSSSSS',
    'ssssssss'
  ], P)
  // Hat layer: the coat's collar turned up behind the neck.
  const Q = { C, L: CL, D: CD }
  k.grid('hat', 'back', ['', '', '', '', '', '', 'LLLLLLLL', 'CCCCCCCC'], Q)
  k.sideGrid('hat', ['', '', '', '', '', '', '.....LLL', '...LCCCC'], Q)

  // Body: the long coat with wide lapels, the turtleneck in the V, double-breasted buttons.
  const PB = { C, c: CM, L: CL, D: CD, T, t: TR, U: TU, N }
  k.box('body', C, CM, C)
  k.grid('body', 'front', [
    'CLUUUULC',
    'CLTtTtLC',
    'DLLTtLLD',
    'CDLLLLDC',
    'CCDLLDCC',
    'CCCDDCCC',
    'CNCCDCNC',
    'CCCCDCCC',
    'CCCCDCCC',
    'CNCCDCNC',
    'cDDCDDDc',
    'CCCCDCCC'
  ], PB)
  k.grid('body', 'back', [
    'cLLLLLLc',
    'CccccccC',
    'CCCCCCCC',
    'CCCCCCCC',
    'CCCCCCCC',
    'CCCCCCCC',
    'CCCCCCCC',
    'CCCCCCCC',
    'DNDDDDND',
    'CCCCCCCC',
    'CCCCCCCC',
    'cCCCCCCc'
  ], PB)
  for (const f of ['right', 'left']) k.grid('body', f, ['cccc', 'CCCC', 'CCCC', 'CCCC', 'CCCC', 'CCCC', 'CCCC', 'CCCC', 'DDDD', 'CCCC', 'CCCC', 'CCCC'], PB)
  k.grid('body', 'top', ['cccccccc', 'cLTTTTLc', 'cLTTTTLc', 'cLUUUULc'], PB)
  // The coat also on the jacket layer, open where the turtleneck shows, so it stands off the body.
  for (const f of ['right', 'left', 'back']) { const [, , w, h] = rect('body', f); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) k.set('jacket', f, x, y, k.c.get(rect('body', f)[0] + x, rect('body', f)[1] + y)) }
  {
    const [bx, by] = rect('body', 'front')
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 8; x++) {
        const turtle = (y <= 1 && x >= 2 && x <= 5) || (y === 2 && x >= 3 && x <= 4)
        if (!turtle) k.set('jacket', 'front', x, y, k.c.get(bx + x, by + y))
      }
    }
  }

  // Arms: coat sleeves to the wrist, pale hands.
  const arm = (part, sleeve, outer) => {
    k.box(part, C, CM, SKD)
    k.fill(part, 'front', 0, 0, 3, 0, CM)
    k.set(part, 'front', k.inner(part, 0), 5, CD); k.set(part, 'front', k.inner(part, 1), 5, CD) // elbow fold
    k.fill(part, outer, 0, 2, 3, 2, CD) // shoulder seam
    k.ring(part, 8, 8, CL) // the sleeve's edge
    k.ring(part, 9, 11, SK)
    k.ring(part, 11, 11, SKD)
    k.set(part, 'front', k.inner(part, 3), 9, SKL)
    // The sleeve on the overlay too (rows 0-8).
    for (const f of SIDES) for (let y = 0; y <= 8; y++) for (let x = 0; x < 4; x++) { const [fx, fy] = rect(part, f); k.set(sleeve, f, x, y, k.c.get(fx + x, fy + y)) }
    { const [fx, fy] = rect(part, 'top'); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) k.set(sleeve, 'top', x, y, k.c.get(fx + x, fy + y)) }
  }
  arm('rarm', 'rsleeve', 'right')
  arm('larm', 'lsleeve', 'left')

  // Legs: the coat's skirt to the knee (base and overlay), grey trousers, black boots.
  const leg = (part, pants, back) => {
    k.box(part, C, C, BOOTD)
    k.ring(part, 6, 6, CD) // the hem's shadow
    k.ring(part, 7, 9, TRS)
    k.ring(part, 9, 9, TRSD)
    k.ring(part, 10, 11, BOOT)
    k.ring(part, 11, 11, BOOTD)
    k.fill(part, 'front', k.inner(part, 2), 7, k.inner(part, 2), 8, TRSL) // crease
    k.fill(part, 'front', 1, 10, 2, 10, BOOTL) // toe shine
    k.fill(part, 'front', k.inner(part, 0), 0, k.inner(part, 0), 5, part === 'rleg' ? CL : CD) // the coat's opening
    for (let i = 1; i <= 3; i++) k.set(part, 'front', k.inner(part, i), 2, CM) // pocket flap
    k.fill(part, 'back', back, 2, back, 5, CD) // the back vent
    for (const f of SIDES) for (let y = 0; y <= 6; y++) for (let x = 0; x < 4; x++) { const [fx, fy] = rect(part, f); k.set(pants, f, x, y, k.c.get(fx + x, fy + y)) }
  }
  leg('rleg', 'rpants', 0)
  leg('lleg', 'lpants', 3)
  return k
}

// ---------- Sal Esposito: brown leather jacket, grey flat cap, round glasses, a mustache, khaki trousers ----------
function sal () {
  const k = skin()
  const SK = rgb(156, 104, 70); const SKD = shade(SK, 0.84); const SKL = shade(SK, 1.14)
  const HR = rgb(40, 30, 26); const HG = rgb(142, 138, 134); const HS = rgb(88, 82, 78); const BR = rgb(62, 44, 34)
  const MU = rgb(52, 36, 28); const MUL = rgb(86, 64, 50)
  const IRIS = rgb(58, 38, 24)
  const LIP = rgb(104, 58, 44)
  const CAP = rgb(128, 128, 132); const CAPD = rgb(92, 92, 98); const CAPL = rgb(160, 160, 164); const CAPF = rgb(108, 106, 104)
  const FR = rgb(214, 172, 80)
  const J = rgb(112, 64, 36); const JD = rgb(82, 46, 26); const JL = rgb(150, 92, 54); const JDD = rgb(58, 32, 18)
  const SH = rgb(220, 210, 186); const SHD = shade(SH, 0.84)
  const BELT = rgb(40, 26, 18); const BUCKLE = rgb(196, 176, 110)
  const KH = rgb(184, 162, 114); const KHD = rgb(152, 132, 90); const KHL = rgb(206, 186, 140)
  const SHOE = rgb(84, 50, 30); const SHOEL = rgb(124, 80, 50); const SHOED = rgb(50, 30, 18)
  const INK = rgb(40, 50, 116)
  const P = { H: HR, G: HG, g: HS, B: BR, S: SK, s: SKD, l: SKL, E: WHITE, I: IRIS, m: LIP, M: MU, u: MUL }

  // Head: dark hair greying at the temples under the cap, a thick mustache.
  k.box('head', SK, HR, SKD)
  k.grid('head', 'front', [
    'HHHHHHHH',
    'HHHHHHHH',
    'GssssssG',
    'SBBSSBBS',
    'SEISSIES',
    'SSSssSSS',
    'SMMuMMMS',
    'sSsmmsSs'
  ], P)
  k.sideGrid('head', [
    'HHHHHHHH',
    'HHHHHHHH',
    'GGGHHHHH',
    'SGSssHHH',
    'SSSssHHH',
    'SSSssgHH',
    'SSSSSSHH',
    'sSSSSSSS'
  ], P)
  k.grid('head', 'back', [
    'HHHHHHHH',
    'HHHHHHHH',
    'HHHHHHHH',
    'HHHHHHHH',
    'HHHHHHHH',
    'HHHHHHHH',
    'SHHHHHHS',
    'ssssssss'
  ], P)
  // Hat layer: the flat cap (a woven grey), its short peak, round wire glasses.
  const cap = (f, x, y) => ((x + y) % 3 === 0 ? CAPF : CAP)
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) k.set('hat', 'top', x, y, cap('top', x, y))
  k.fill('hat', 'top', 0, 7, 7, 7, CAPD) // the peak's edge
  k.fill('hat', 'top', 3, 6, 4, 6, CAPD) // the snap
  for (const f of SIDES) for (let x = 0; x < 8; x++) { k.set('hat', f, x, 0, cap(f, x, 0)); k.set('hat', f, x, 1, cap(f, x, 1)) }
  k.fill('hat', 'front', 0, 0, 7, 0, CAPL)
  k.fill('hat', 'front', 0, 2, 7, 2, CAPD) // the peak, over the brows
  for (let x = 0; x < 8; x++) k.set('hat', 'back', x, 2, CAPD) // the back sits lower
  for (const w of ['right', 'left']) {
    for (let i = 0; i < 2; i++) k.side('hat', w, i, 2, CAPD) // the peak's sides
    for (let i = 5; i < 8; i++) k.side('hat', w, i, 2, CAPD)
  }
  // Round wire glasses: rims round the eyes (the brows close them on top), temples to the ears.
  const Q = { F: FR }
  k.grid('hat', 'front', ['', '', '', '', 'F..FF..F', '.FF..FF.'], Q)
  k.sideGrid('hat', ['', '', '', '', 'FFF'], Q)

  // Body: an open leather jacket (a darker collar, shine, pocket flaps, waistband) over a cream shirt, a belt.
  const PB = { J, j: JD, h: JL, k: JDD, W: SH, w: SHD, S: SK, s: SKD, B: BELT, Y: BUCKLE, z: JDD }
  k.box('body', J, J, BELT)
  k.grid('body', 'front', [
    'JkWSSWkJ',
    'JkkWWkkJ',
    'hJkWwkJh',
    'hJJzWzJJ',
    'JJJzwzJJ',
    'JJJzWzJJ',
    'JJJzWzJJ',
    'JjjzwzjJ',
    'JJJzWzJJ',
    'jjjzWzjj',
    'jjjzwzjj',
    'BBBYYBBB'
  ], PB)
  k.grid('body', 'back', [
    'kkkkkkkk',
    'JhhhhhhJ',
    'jjjjjjjj',
    'JJJJJJJJ',
    'JJJJJJJJ',
    'JJJJJJJJ',
    'JJJJJJJJ',
    'JJJJJJJJ',
    'JJJJJJJJ',
    'jjjjjjjj',
    'jjjjjjjj',
    'BBBBBBBB'
  ], PB)
  for (const f of ['right', 'left']) k.grid('body', f, ['kkkk', 'JJJJ', 'jjjj', 'JJJJ', 'JJJJ', 'JJJJ', 'JJJJ', 'JJJJ', 'JJJJ', 'jjjj', 'jjjj', 'BBBB'], PB)
  k.grid('body', 'top', ['JJJJJJJJ', 'JkkkkkkJ', 'JkSSSSkJ', 'JkWSSWkJ'], PB)

  // Arms: leather sleeves with a shine and a knit cuff; an ink stain on the right hand's fingers.
  const arm = (part, outer) => {
    k.box(part, J, JL, SKD)
    k.fill(part, 'front', k.inner(part, 2), 1, k.inner(part, 2), 4, JL) // shine
    k.set(part, 'front', k.inner(part, 1), 5, JD); k.set(part, 'front', k.inner(part, 2), 5, JD) // elbow fold
    k.fill(part, outer, 0, 2, 3, 2, JD) // shoulder seam
    k.ring(part, 8, 8, JDD) // cuff
    k.ring(part, 9, 11, SK)
    k.ring(part, 11, 11, SKD)
    k.set(part, 'front', k.inner(part, 3), 9, SKL)
  }
  arm('rarm', 'right')
  arm('larm', 'left')
  k.set('rarm', 'front', 2, 11, INK)

  // Legs: khaki trousers with a crease and turn-ups, brown shoes.
  const leg = (part) => {
    k.box(part, KH, KH, SHOED)
    k.fill(part, 'front', k.inner(part, 0), 0, k.inner(part, 0), 8, KHD) // inner shadow
    k.fill(part, 'front', k.inner(part, 2), 1, k.inner(part, 2), 8, KHL) // crease
    k.ring(part, 9, 9, KHD) // turn-up
    k.ring(part, 10, 11, SHOE)
    k.ring(part, 11, 11, SHOED)
    k.fill(part, 'front', 1, 10, 2, 10, SHOEL)
  }
  leg('rleg')
  leg('lleg')
  return k
}

// ---------- Preview: the faces put together like the model, scaled up ----------
const VIEWS = [
  // [x offset, parts: [part, face, x, y]]
  [0, [['head', 'front', 4, 0], ['hat', 'front', 4, 0], ['body', 'front', 4, 8], ['jacket', 'front', 4, 8],
    ['rarm', 'front', 0, 8], ['rsleeve', 'front', 0, 8], ['larm', 'front', 12, 8], ['lsleeve', 'front', 12, 8],
    ['rleg', 'front', 4, 20], ['rpants', 'front', 4, 20], ['lleg', 'front', 8, 20], ['lpants', 'front', 8, 20]]],
  [18, [['head', 'back', 4, 0], ['hat', 'back', 4, 0], ['body', 'back', 4, 8], ['jacket', 'back', 4, 8],
    ['larm', 'back', 0, 8], ['lsleeve', 'back', 0, 8], ['rarm', 'back', 12, 8], ['rsleeve', 'back', 12, 8],
    ['lleg', 'back', 4, 20], ['lpants', 'back', 4, 20], ['rleg', 'back', 8, 20], ['rpants', 'back', 8, 20]]],
  [36, [['head', 'right', 0, 0], ['hat', 'right', 0, 0], ['body', 'right', 2, 8], ['jacket', 'right', 2, 8],
    ['rleg', 'right', 2, 20], ['rpants', 'right', 2, 20], ['rarm', 'right', 2, 8], ['rsleeve', 'right', 2, 8]]],
  [46, [['head', 'left', 0, 0], ['hat', 'left', 0, 0], ['body', 'left', 2, 8], ['jacket', 'left', 2, 8],
    ['lleg', 'left', 2, 20], ['lpants', 'left', 2, 20], ['larm', 'left', 2, 8], ['lsleeve', 'left', 2, 8]]],
  [56, [['head', 'top', 0, 0], ['hat', 'top', 0, 0]]]
]
function preview (k) {
  const FW = 64; const FH = 32
  const fig = canvas(FW, FH)
  for (const [ox, parts] of VIEWS) {
    for (const [part, f, x0, y0] of parts) {
      const [sx, sy, w, h] = rect(part, f)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const px = k.c.get(sx + x, sy + y); if (px[3] > 0) fig.set(ox + x0 + x, y0 + y, px) }
    }
  }
  const S = 8; const M = 8; const SMALL = 2
  const W = M + FW * S + M + 16 * SMALL + M; const H = M + FH * S + M
  const out = canvas(W, H)
  out.fill(0, 0, W - 1, H - 1, [124, 134, 146, 255])
  const put = (sx, sy, sw, sh, scale, dx, dy) => {
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const px = fig.get(sx + x, sy + y)
        if (px[3] > 0) out.fill(dx + x * scale, dy + y * scale, dx + x * scale + scale - 1, dy + y * scale + scale - 1, px)
      }
    }
  }
  put(0, 0, FW, FH, S, M, M)
  put(0, 0, 16, FH, SMALL, M + FW * S + M, H - M - FH * SMALL)
  return out.png()
}

const CAST = { vinnie, dmitri, sal }
for (const dir of OUT) fs.mkdirSync(dir, { recursive: true })
for (const [id, draw] of Object.entries(CAST)) {
  const k = draw()
  const png = k.c.png()
  for (const dir of OUT) fs.writeFileSync(path.join(dir, id + '.png'), png)
  fs.writeFileSync(path.join(__dirname, 'preview-' + id + '.png'), preview(k))
  console.log('wrote ' + id + '.png (server\\plugins\\Citizens\\skins and tools\\skins) and tools\\skins\\preview-' + id + '.png')
}
