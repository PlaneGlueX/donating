// Draws the quest givers' skins (quests.sk NPCs): Mara (Safehouse), the Scrap Yard Boss, Vic the Fence
// (Pawn Shop) and the Broker (Pool Hall), in the standard 64x64 player skin layout (classic 4-pixel arms),
// like tools\make-cop-skin.js. Writes server\plugins\Citizens\skins\<id>.png and tools\skins\<id>.png, plus
// tools\skins\preview-<id>.png (front, back, both sides and the head's top at 8x, and a small 2x front to
// judge it from a distance).
// Usage: tools\node\node.exe tools\skins\make-givers-skins.js
const fs = require('fs')
const path = require('path')
const { canvas, shade } = require('../png')

// ---------- Skin layout ----------
// Each box: base texture origin (u, v), overlay origin (ou, ov), width, height, depth.
const BOX = {
  head: { u: 0, v: 0, ou: 32, ov: 0, w: 8, h: 8, d: 8 },
  body: { u: 16, v: 16, ou: 16, ov: 32, w: 8, h: 12, d: 4 },
  rarm: { u: 40, v: 16, ou: 40, ov: 32, w: 4, h: 12, d: 4 },
  larm: { u: 32, v: 48, ou: 48, ov: 48, w: 4, h: 12, d: 4 },
  rleg: { u: 0, v: 16, ou: 0, ov: 32, w: 4, h: 12, d: 4 },
  lleg: { u: 16, v: 48, ou: 0, ov: 48, w: 4, h: 12, d: 4 }
}
const FACES = ['top', 'bottom', 'right', 'front', 'left', 'back']
const SIDES = ['right', 'front', 'left', 'back']
// [x, y, w, h] of one face. Orientation: "right" runs back -> front, "left" front -> back, "front" and
// "top" start at the character's right side, "back" starts at the character's left side (as seen from behind).
const faceRect = (part, face, over) => {
  const b = BOX[part]
  const u = over ? b.ou : b.u
  const v = over ? b.ov : b.v
  return {
    top: [u + b.d, v, b.w, b.d],
    bottom: [u + b.d + b.w, v, b.w, b.d],
    right: [u, v + b.d, b.d, b.h],
    front: [u + b.d, v + b.d, b.w, b.h],
    left: [u + b.d + b.w, v + b.d, b.d, b.h],
    back: [u + 2 * b.d + b.w, v + b.d, b.w, b.h]
  }[face]
}

// n copies of each row: rep([9, 'KkKK'], [1, 'jjjj'])
const rep = (...pairs) => pairs.flatMap(([n, r]) => Array(n).fill(r))
const flip = rows => rows.map(r => [...r.replace(/ /g, '')].reverse().join(''))
// A right-hand limb's faces -> the matching left-hand limb (outer and inner sides swap, all mirrored).
const mirrorLimb = g => ({ top: flip(g.top), bottom: flip(g.bottom), right: flip(g.left), front: flip(g.front), left: flip(g.right), back: flip(g.back) })

// A skin being drawn: character art on faces, with a palette of one-letter colors ('.' = leave alone).
const newSkin = pal => {
  const c = canvas(64, 64)
  const chars = new Map() // which palette letter each pixel was drawn with (for lift)
  const S = {
    c,
    pal,
    art (part, face, rows, over = false, ox = 0, oy = 0) {
      const [fx, fy, fw, fh] = faceRect(part, face, over)
      if (rows.length + oy > fh) throw new Error(`${part} ${face}: ${rows.length} rows, the face has ${fh}`)
      rows.forEach((row, y) => {
        const cells = [...row.replace(/ /g, '')]
        if (cells.length + ox > fw) throw new Error(`${part} ${face} row ${y}: '${row}' is wider than ${fw}`)
        cells.forEach((ch, x) => {
          if (ch === '.') return
          if (!pal[ch]) throw new Error(`no color '${ch}' (${part} ${face})`)
          c.set(fx + ox + x, fy + oy + y, pal[ch])
          chars.set((fy + oy + y) * 64 + fx + ox + x, ch)
        })
      })
    },
    px (part, face, x, y, ch, over = false) { S.art(part, face, [ch], over, x, y) },
    fill (part, face, ch, over = false) {
      const [, , w, h] = faceRect(part, face, over)
      S.art(part, face, Array(h).fill(ch.repeat(w)), over)
    },
    limb (part, g, over = false) { for (const f of Object.keys(g)) S.art(part, f, g[f], over) },
    // Copies the base pixels drawn with one of these letters onto the overlay (hair volume, a jacket).
    lift (part, faces, letters) {
      for (const f of faces) {
        const [bx, by, w, h] = faceRect(part, f, false)
        const [ox, oy] = faceRect(part, f, true)
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const ch = chars.get((by + y) * 64 + bx + x)
            if (ch && letters.includes(ch)) S.art(part, f, [ch], true, x, y)
          }
        }
      }
    },
    // Recolors pixels of one letter to another where test(texX, texY) holds (pinstripes).
    pattern (parts, from, to, test, over = false) {
      for (const part of parts) {
        for (const f of FACES) {
          const [fx, fy, w, h] = faceRect(part, f, over)
          for (let y = fy; y < fy + h; y++) {
            for (let x = fx; x < fx + w; x++) {
              if (chars.get(y * 64 + x) === from && test(x - fx, y - fy, f, part)) { c.set(x, y, pal[to]); chars.set(y * 64 + x, to) }
            }
          }
        }
      }
    }
  }
  return S
}

// Every base face must be fully opaque (a transparent base pixel is a hole in game).
const checkBase = (c, id) => {
  for (const part of Object.keys(BOX)) {
    for (const f of FACES) {
      const [x0, y0, w, h] = faceRect(part, f, false)
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (c.get(x, y)[3] !== 255) throw new Error(`${id}: hole in ${part} ${f} at ${x},${y}`)
    }
  }
}

// ---------- Preview ----------
const BG = [156, 172, 190, 255]
const blit = (dst, c, part, face, dx, dy, s) => {
  const [bx, by, w, h] = faceRect(part, face, false)
  const [ox, oy] = faceRect(part, face, true)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = c.get(ox + x, oy + y)
      const col = o[3] > 0 ? o : c.get(bx + x, by + y)
      dst.fill(dx + x * s, dy + y * s, dx + (x + 1) * s - 1, dy + (y + 1) * s - 1, col)
    }
  }
}
const PANELS = [
  { w: 16, items: [['head', 'front', 4, 0], ['rarm', 'front', 0, 8], ['body', 'front', 4, 8], ['larm', 'front', 12, 8], ['rleg', 'front', 4, 20], ['lleg', 'front', 8, 20]] },
  { w: 16, items: [['head', 'back', 4, 0], ['larm', 'back', 0, 8], ['body', 'back', 4, 8], ['rarm', 'back', 12, 8], ['lleg', 'back', 4, 20], ['rleg', 'back', 8, 20]] },
  { w: 8, items: [['head', 'right', 0, 0], ['rarm', 'right', 2, 8], ['rleg', 'right', 2, 20]] },
  { w: 8, items: [['head', 'left', 0, 0], ['larm', 'left', 2, 8], ['lleg', 'left', 2, 20]] },
  { w: 8, items: [['head', 'top', 0, 0]] }
]
const preview = c => {
  const s = 8
  const gap = 16
  const W = gap + PANELS.reduce((n, p) => n + p.w * s + gap, 0) + 16 * 2 + gap
  const H = 32 * s + 2 * gap
  const p = canvas(W, H)
  p.fill(0, 0, W - 1, H - 1, BG)
  let x = gap
  for (const panel of PANELS) {
    for (const [part, face, dx, dy] of panel.items) blit(p, c, part, face, x + dx * s, gap + dy * s, s)
    x += panel.w * s + gap
  }
  for (const [part, face, dx, dy] of PANELS[0].items) blit(p, c, part, face, x + dx * 2, gap + dy * 2, 2)
  return p
}

// ---------- Shared colors ----------
const WHITE = [244, 244, 248, 255]

// ---------- Mara: the fixer at the Safehouse ----------
// Dark bob with a purple streak, black leather jacket over a deep purple top, dark jeans, boots, a silver earring.
const mara = () => {
  const SKIN = [232, 190, 158, 255]
  const TOP = [104, 42, 138, 255]
  const JEANS = [50, 66, 110, 255]
  const S = newSkin({
    S: SKIN, s: shade(SKIN, 0.87), t: shade(SKIN, 0.76),
    H: [40, 32, 46, 255], G: [80, 66, 94, 255], D: [24, 18, 30, 255],
    P: [176, 92, 236, 255], p: [126, 60, 184, 255],
    W: WHITE, I: [52, 140, 100, 255], B: [40, 28, 38, 255],
    L: [192, 84, 116, 255], l: [146, 56, 86, 255],
    E: [226, 230, 240, 255], e: [150, 156, 172, 255],
    K: [38, 38, 44, 255], k: [84, 84, 98, 255], j: [20, 20, 24, 255],
    U: TOP, u: shade(TOP, 0.76), v: shade(TOP, 1.25),
    N: JEANS, n: shade(JEANS, 0.78), M: shade(JEANS, 1.22),
    R: [70, 46, 34, 255], Z: [200, 204, 214, 255],
    O: [46, 36, 32, 255], o: [92, 76, 68, 255], X: [22, 18, 18, 255]
  })
  // Head: a bob that frames the face, a side fringe with the purple streak over her right brow.
  S.art('head', 'top', [ // back (row 0) -> front (row 7); a part on her left, the streak on her right
    'HHHHHHHH',
    'HHHHHHHH',
    'HHGGHHHH',
    'HHHHHDHH',
    'HGGHHDHH',
    'HHPpHDHH',
    'HHPpHDHH',
    'HHpPHDHH'
  ])
  S.art('head', 'bottom', rep([8, 'ssssssss']))
  S.art('head', 'front', [
    'HHpPHHHH',
    'HpPHHHHH',
    'HPpHSSSH',
    'HBBSSBBH',
    'HWISSIWH',
    'HSSssSSH',
    'DSSLLsSD',
    'tSSSSSSt'
  ])
  S.art('head', 'right', [ // back -> front; the hair tucked behind the ear, the silver earring
    'HHHHHHHH',
    'HHHHHHHH',
    'GGGHHHpP',
    'HHHHHHHP',
    'HHHHsSSH',
    'HHHHsSSH',
    'DDDHESSD',
    'tssseSst'
  ])
  S.art('head', 'left', [ // front -> back
    'HHHHHHHH',
    'HHHHHHHH',
    'HHHHHGGG',
    'HHHHHHHH',
    'HHHHHHHH',
    'HHHHHHHH',
    'DDDDDDDD',
    'tsssssss'
  ])
  S.art('head', 'back', [
    'HHHHHHHH',
    'HHHHHHHH',
    'GGGHHGGG',
    'HHHGGHHH',
    'HHHHHHHH',
    'HHHHHHHH',
    'DDDDDDDD',
    'ssssssss'
  ])
  S.lift('head', FACES, 'HGDPp')

  // Body: the jacket open over the purple top, a belt, jeans at the hips.
  S.art('body', 'top', ['KKKKKKKK', 'KkkkkkkK', 'KKKKKKKK', 'KKKKKKKK'])
  S.art('body', 'bottom', rep([4, 'NNNNNNNN']))
  S.art('body', 'front', [
    'KkkSSkkK',
    'KKkUUkKK',
    'KKkUUkKK',
    'KkUvUUkK',
    'KkUUUUkK',
    'KkUUUUkK',
    'KkUUUuZK',
    'KkuUUukK',
    'KkUuuUkK',
    'KkRZZRkK',
    'jjNNNNjj',
    'NNNNNNNN'
  ])
  const side = rep([3, 'KKKK'], [6, 'KKkK'], [1, 'KKKK'], [1, 'jjjj'], [1, 'NNNN'])
  S.art('body', 'right', side)
  S.art('body', 'left', flip(side))
  S.art('body', 'back', [
    'kkkkkkkk',
    'KKKKKKKK',
    'KKKKKKKK',
    'jjjjjjjj',
    'KkKKKKkK',
    'KkKKKKkK',
    'KkKKKKkK',
    'KKKKKKKK',
    'KKKKKKKK',
    'KKKKKKKK',
    'jjjjjjjj',
    'NNNNNNNN'
  ])
  S.lift('body', FACES, 'KkjZ')

  // Arms: leather sleeves with a sheen and an elbow crease, a dark zip cuff, hands.
  const arm = {
    top: rep([4, 'KKKK']),
    bottom: rep([4, 'ssss']),
    right: rep([9, 'KKkK'], [1, 'jjZj'], [1, 'SSSS'], [1, 'ssss']),
    front: rep([4, 'KkKK'], [1, 'jjjK'], [4, 'KkKK'], [1, 'jjjj'], [1, 'SSSS'], [1, 'ssss']),
    left: rep([9, 'KKKK'], [1, 'jjjj'], [1, 'SSSS'], [1, 'ssss']),
    back: rep([4, 'KKKK'], [1, 'KjjK'], [4, 'KKKK'], [1, 'jjjj'], [1, 'SSSS'], [1, 'ssss'])
  }
  S.limb('rarm', arm)
  S.limb('larm', mirrorLimb(arm))
  S.lift('rarm', FACES, 'KkjZ')
  S.lift('larm', FACES, 'KkjZ')

  // Legs: dark jeans (worn lighter at the thigh), ankle boots with a toe shine.
  const leg = {
    top: rep([4, 'NNNN']),
    bottom: rep([4, 'XXXX']),
    right: rep([8, 'NNNn'], [1, 'oooo'], [2, 'OOOO'], [1, 'XXXX']),
    front: rep([1, 'NNNN'], [3, 'NMMN'], [1, 'NNNN'], [3, 'NNNN'], [1, 'oooo'], [1, 'OOOO'], [1, 'OooO'], [1, 'XXXX']),
    left: rep([8, 'nNNN'], [1, 'oooo'], [2, 'OOOO'], [1, 'XXXX']),
    back: rep([1, 'NNNN'], [2, 'NnnN'], [5, 'NNNN'], [1, 'oooo'], [2, 'OOOO'], [1, 'XXXX'])
  }
  S.limb('rleg', leg)
  S.limb('lleg', mirrorLimb(leg))
  return S.c
}

// ---------- The Scrap Yard Boss ----------
// A burly mechanic in his 50s: grey stubbly beard, orange cap on backwards, oil-stained blue coveralls with
// rolled sleeves, a red rag in the chest pocket, heavy work boots, grease on his hands and face.
const boss = () => {
  const SKIN = [196, 136, 100, 255]
  const CAP = [236, 122, 30, 255]
  const COV = [54, 94, 160, 255]
  const BOOT = [112, 72, 42, 255]
  const S = newSkin({
    S: SKIN, s: shade(SKIN, 0.87), t: shade(SKIN, 0.75),
    Y: [136, 134, 134, 255], F: [158, 156, 154, 255], f: [118, 116, 116, 255], g: [196, 194, 192, 255],
    B: [96, 94, 94, 255], W: WHITE, I: [60, 104, 166, 255], M: [112, 64, 54, 255],
    O: CAP, o: shade(CAP, 0.74), q: shade(CAP, 1.15),
    C: COV, c: shade(COV, 0.76), V: shade(COV, 1.22), z: [36, 54, 88, 255],
    A: [232, 232, 226, 255], R: [206, 42, 38, 255], r: [150, 28, 26, 255], Z: [176, 182, 194, 255],
    x: [46, 42, 42, 255], y: [88, 80, 76, 255],
    K: BOOT, k: shade(BOOT, 0.72), L: shade(BOOT, 1.25), l: [206, 186, 146, 255], X: [36, 30, 26, 255]
  })
  // Head: grey hair under the cap, thick grey brows, a short grey beard, a grease smear on the forehead.
  S.art('head', 'top', rep([8, 'YYYYYYYY']))
  S.art('head', 'bottom', rep([3, 'ffffffff'], [5, 'ssssssss']))
  S.art('head', 'front', [
    'YYYYYYYY',
    'YYYYYYYY',
    'YSSSSyxY',
    'YBBSSBBY',
    'FWISSIWF',
    'FSSttSSF',
    'FFfMMfFF',
    'fFFFFFFf'
  ])
  const bSide = [ // back -> front: short grey hair, the ear, the beard along the jaw
    'YYYYYYYY',
    'YYYYYYYY',
    'YYYYYYYY',
    'YYYYYYYY',
    'YYYssYYF',
    'tYYssYFF',
    'SSSSFFFF',
    'tSSSfFFF'
  ]
  S.art('head', 'right', bSide)
  S.art('head', 'left', flip(bSide))
  S.art('head', 'back', [
    'YYYYYYYY',
    'YYYYYYYY',
    'YYYYYYYY',
    'YYYYYYYY',
    'YYYYYYYY',
    'fYYYYYYf',
    'SSSSSSSS',
    'tttttttt'
  ])
  // The cap (hat layer), worn backwards: the strap opening in front, the visor at the back.
  S.art('head', 'top', [
    'qqqqqqqq',
    'oooooooo',
    'OOOOOOOO',
    'OOOqOOOO',
    'OOOooOOO',
    'OOOOqOOO',
    'OOOOOOOO',
    'OOOOOOOO'
  ], true)
  S.art('head', 'front', ['OOOOOOOO', 'OOo..oOO'], true)
  S.art('head', 'right', ['OOOOOOOO', 'OOOOOOOO', 'ooo.....'], true)
  S.art('head', 'left', ['OOOOOOOO', 'OOOOOOOO', '.....ooo'], true)
  S.art('head', 'back', ['OOOOOOOO', 'OOOOOOOO', 'qqqqqqqq', '.oooooo.'], true)

  // Body: coveralls with a zip, a name patch, the red rag in the chest pocket, oil stains, a waistband.
  S.art('body', 'top', ['CCCCCCCC', 'CCVVVVCC', 'CCVVVVCC', 'CCCCCCCC'])
  S.art('body', 'bottom', rep([4, 'CCCCCCCC']))
  S.art('body', 'front', [
    'CVVSSVVC',
    'CCVSSVCC',
    'CCCCZRrC',
    'CAACZRcC',
    'CCCCZccC',
    'CCCCZccC',
    'CzCCZCCC',
    'CCzCZCCC',
    'cccccccc',
    'CCCCZCzC',
    'CCCCCzCC',
    'CCCcCCCC'
  ])
  const side = rep([7, 'CCCC'], [1, 'cccc'], [1, 'CCCC'], [1, 'CzCC'], [2, 'CCCC'])
  S.art('body', 'right', side)
  S.art('body', 'left', flip(side))
  S.art('body', 'back', [
    'VVVVVVVV',
    'CCCCCCCC',
    'cccccccc',
    'CCCCCCCC',
    'CCCzCCCC',
    'CCCCzCCC',
    'CCCCCCCC',
    'CCCCCCCC',
    'cccccccc',
    'CCCCCCCC',
    'CCCCCCzC',
    'CCCcCCCC'
  ])
  S.lift('body', FACES, 'CcVzARrZ')

  // Arms: short blue sleeves rolled at the elbow, bare forearms, greasy hands.
  const arm = {
    top: rep([4, 'CCCC']),
    bottom: rep([4, 'xsxs']),
    right: rep([4, 'CCCC'], [1, 'VVVV'], [1, 'cVcV'], [3, 'SSSS'], [1, 'ssss'], [1, 'SxSS'], [1, 'xSxx']),
    front: rep([4, 'CCCC'], [1, 'VVVV'], [1, 'VcVc'], [1, 'SSSS'], [1, 'SySS'], [1, 'SSyS'], [1, 'ssss'], [1, 'SSxS'], [1, 'xxSx']),
    left: rep([4, 'CCCC'], [1, 'VVVV'], [1, 'cVcV'], [3, 'SSSS'], [1, 'ssss'], [1, 'SSSS'], [1, 'SxSS']),
    back: rep([4, 'CCCC'], [1, 'VVVV'], [1, 'cVcV'], [2, 'SSSS'], [1, 'SSyS'], [1, 'ssss'], [1, 'SSSS'], [1, 'SSxS'])
  }
  S.limb('rarm', arm)
  S.limb('larm', mirrorLimb(arm))
  S.lift('rarm', FACES, 'CVc')
  S.lift('larm', FACES, 'CVc')

  // Legs: coveralls with a stained knee, heavy laced work boots.
  const leg = {
    top: rep([4, 'CCCC']),
    bottom: rep([4, 'XXXX']),
    right: rep([7, 'CCCC'], [1, 'cccc'], [1, 'kKKK'], [2, 'KKKK'], [1, 'XXXX']),
    front: rep([4, 'CCCC'], [1, 'CzCC'], [1, 'CCzC'], [1, 'CCCC'], [1, 'cccc'], [1, 'kKKk'], [1, 'KllK'], [1, 'LKKL'], [1, 'XXXX']),
    left: rep([7, 'CCCC'], [1, 'cccc'], [1, 'KKKk'], [2, 'KKKK'], [1, 'XXXX']),
    back: rep([2, 'CCCC'], [1, 'CzCC'], [4, 'CCCC'], [1, 'cccc'], [1, 'kkkk'], [2, 'KKKK'], [1, 'XXXX'])
  }
  S.limb('rleg', leg)
  S.limb('lleg', mirrorLimb(leg))
  S.lift('rleg', FACES, 'Ccz')
  S.lift('lleg', FACES, 'Ccz')
  return S.c
}

// ---------- Vic the Fence ----------
// A thin man in his 60s: slicked grey hair, small round tinted glasses, a brown vest over a cream shirt with
// rolled sleeves, a gold chain and rings, a jeweler's loupe on a cord.
const vic = () => {
  const SKIN = [214, 176, 140, 255]
  const SHIRT = [236, 226, 196, 255]
  const VEST = [116, 74, 42, 255]
  const TROU = [74, 72, 80, 255]
  const S = newSkin({
    S: SKIN, s: shade(SKIN, 0.88), t: shade(SKIN, 0.76),
    H: [168, 168, 174, 255], h: [200, 200, 206, 255], d: [128, 128, 136, 255],
    B: [118, 116, 120, 255], W: WHITE, I: [96, 70, 50, 255], M: [150, 96, 84, 255],
    Q: [178, 138, 50, 255], T: [222, 166, 116, 255], U: [92, 52, 40, 255],
    C: SHIRT, c: shade(SHIRT, 0.84),
    V: VEST, v: shade(VEST, 0.76), w: shade(VEST, 1.2),
    G: [240, 196, 64, 255], g: [180, 134, 36, 255],
    K: [28, 26, 26, 255], L: [52, 52, 58, 255], l: [182, 214, 232, 255],
    R: [56, 36, 26, 255],
    N: TROU, n: shade(TROU, 0.78), m: shade(TROU, 1.2),
    O: [92, 52, 32, 255], o: [140, 88, 58, 255], X: [30, 24, 22, 255]
  })
  // Head: grey hair combed straight back, receding at the temples, deep lines in a thin face.
  S.art('head', 'top', rep([8, 'HdhHHhdH']))
  S.art('head', 'bottom', rep([8, 'ssssssss']))
  S.art('head', 'front', [
    'HHhHHhHH',
    'SSHHHHSS',
    'SSSSSSSS',
    'SBBSSBBS',
    'SWISSIWS',
    'sSSssSSs',
    'sSsMMsSs',
    'ssSSSSss'
  ])
  const vSide = [ // back -> front: combed straight back
    'HHHHHHHH',
    'hhhhhhhH',
    'HHHHHHSS',
    'dddddSSS',
    'HHHssSSS',
    'dHHssSSs',
    'SSSSSSSs',
    'sSSSSSss'
  ]
  S.art('head', 'right', vSide)
  S.art('head', 'left', flip(vSide))
  S.art('head', 'back', [
    'HHhHHhHH',
    'HHhHdhHH',
    'HdhHdhdH',
    'HdhHdhdH',
    'HHHHHHHH',
    'dHHHHHHd',
    'SSSSSSSS',
    'sSSSSSSs'
  ])
  S.lift('head', ['top', 'back', 'right', 'left'], 'Hhd')
  // The glasses (hat layer): gold wire, amber lenses, the arms back to the ears.
  S.art('head', 'front', ['........', '........', '........', '........', 'QTUQQUTQ'], true)
  S.art('head', 'right', ['....QQQQ'], true, 0, 4)
  S.art('head', 'left', ['QQQQ....'], true, 0, 4)

  // Body: the brown vest over the cream shirt, open collar, gold chain, the loupe on its cord, a belt.
  S.art('body', 'top', ['VVCCCCVV', 'VVCCCCVV', 'VVCCCCVV', 'VVCCCCVV'])
  S.art('body', 'bottom', rep([4, 'NNNNNNNN']))
  S.art('body', 'front', [
    'VwCSSCwV',
    'VwCGGCwV',
    'VVKCCCVV',
    'VVKCCVVV',
    'VVLvGVVV',
    'VVLvVVVV',
    'VVlvGVVV',
    'VVVvVVVV',
    'VVVvGVVV',
    'VVVvVVVV',
    'RRRGRRRR',
    'NNNNNNNN'
  ])
  const side = rep([2, 'CCCC'], [8, 'vvVV'], [1, 'RRRR'], [1, 'NNNN'])
  S.art('body', 'right', side)
  S.art('body', 'left', flip(side))
  S.art('body', 'back', [
    'CCCCCCCC',
    'vvvvvvvv',
    'vvvvvvvv',
    'vvvvvvvv',
    'vvvvvvvv',
    'vvvvvvvv',
    'vvRgRRvv',
    'vvvvvvvv',
    'vvvvvvvv',
    'vvvvvvvv',
    'RRRRRRRR',
    'NNNNNNNN'
  ])

  // Arms: cream sleeves rolled to the elbow, thin forearms, gold rings.
  const arm = {
    top: rep([4, 'CCCC']),
    bottom: rep([4, 'ssss']),
    right: rep([5, 'CCCC'], [1, 'cccc'], [1, 'CCCC'], [1, 'cccc'], [2, 'SSSS'], [1, 'SSSS'], [1, 'ssss']),
    front: rep([2, 'CCCC'], [1, 'CcCC'], [2, 'CCCC'], [1, 'cccc'], [1, 'CCCC'], [1, 'cccc'], [2, 'SSSS'], [1, 'SGSS'], [1, 'ssss']),
    left: rep([5, 'CCCC'], [1, 'cccc'], [1, 'CCCC'], [1, 'cccc'], [2, 'SSSS'], [1, 'SSSS'], [1, 'ssss']),
    back: rep([5, 'CCCC'], [1, 'cccc'], [1, 'CCCC'], [1, 'cccc'], [2, 'SSSS'], [1, 'SSSS'], [1, 'ssss'])
  }
  S.limb('rarm', arm)
  S.limb('larm', mirrorLimb(arm))
  S.px('larm', 'left', 1, 10, 'G') // a second ring on the left hand

  // Legs: charcoal trousers with a crease, polished brown shoes.
  const leg = {
    top: rep([4, 'NNNN']),
    bottom: rep([4, 'XXXX']),
    right: rep([9, 'NNNN'], [1, 'nnnn'], [1, 'OOOO'], [1, 'XXXX']),
    front: rep([9, 'NmNN'], [1, 'nnnn'], [1, 'OoOO'], [1, 'XXXX']),
    left: rep([9, 'NNNN'], [1, 'nnnn'], [1, 'OOOO'], [1, 'XXXX']),
    back: rep([9, 'NNNN'], [1, 'nnnn'], [1, 'OOOO'], [1, 'XXXX'])
  }
  S.limb('rleg', leg)
  S.limb('lleg', mirrorLimb(leg))
  return S.c
}

// ---------- The Broker ----------
// A heavy-set man: black fedora with a red band, dark pinstripe suit, red tie, pencil mustache, a gold
// pocket-watch chain.
const broker = () => {
  const SKIN = [124, 82, 56, 255]
  const SUIT = [40, 40, 50, 255]
  const S = newSkin({
    S: SKIN, s: shade(SKIN, 0.86), t: shade(SKIN, 0.74),
    A: [22, 18, 16, 255], B: [24, 16, 12, 255], W: [238, 234, 228, 255], I: [58, 36, 22, 255],
    m: [34, 20, 16, 255], M: [160, 96, 84, 255],
    K: [26, 26, 30, 255], k: [52, 52, 60, 255], j: [12, 12, 14, 255], R: [184, 30, 38, 255], r: [126, 20, 26, 255],
    D: SUIT, P: [74, 74, 90, 255], d: shade(SUIT, 0.75), e: [66, 66, 82, 255],
    C: [236, 236, 238, 255], T: [194, 30, 40, 255], Y: [138, 20, 28, 255],
    G: [240, 196, 64, 255], g: [180, 134, 36, 255],
    O: [20, 20, 22, 255], o: [96, 96, 106, 255]
  })
  // Head: short black hair under the hat, heavy brows, the pencil mustache, full cheeks.
  S.art('head', 'top', rep([8, 'AAAAAAAA']))
  S.art('head', 'bottom', rep([2, 'tttttttt'], [6, 'ssssssss']))
  S.art('head', 'front', [
    'AAAAAAAA',
    'AAAAAAAA',
    'AAAAAAAA',
    'SSSSSSSS',
    'SBBSSBBS',
    'SWIssIWS',
    'sSmmmmSs',
    'tSsMMsSt'
  ])
  const bSide = [ // back -> front
    'AAAAAAAA',
    'AAAAAAAA',
    'AAAAAAAA',
    'AAAAAASS',
    'AAASsASS',
    'AAASsSSS',
    'SSSSSSSs',
    'ttssssst'
  ]
  S.art('head', 'right', bSide)
  S.art('head', 'left', flip(bSide))
  S.art('head', 'back', [
    'AAAAAAAA',
    'AAAAAAAA',
    'AAAAAAAA',
    'AAAAAAAA',
    'AAAAAAAA',
    'AAAAAAAA',
    'SSSSSSSS',
    'tttttttt'
  ])
  // The fedora (hat layer): crown with its pinch, the red band (a bow on the left), the brim.
  S.art('head', 'top', [
    'KKKKKKKK',
    'KkKKKKkK',
    'KkKjjKkK',
    'KkKjjKkK',
    'KkKjjKkK',
    'KkKjjKkK',
    'KkKKKKkK',
    'KKKKKKKK'
  ], true)
  S.art('head', 'front', ['KKKkkKKK', 'KKKjjKKK', 'RRRRRRRR', 'kkkkkkkk'], true)
  S.art('head', 'right', ['KKKKKKKK', 'KKKKKKKK', 'RRRRRRRR', 'kkkkkkkk'], true)
  S.art('head', 'left', ['KKKKKKKK', 'KKKKKKKK', 'RRRrrRRR', 'kkkkkkkk'], true)
  S.art('head', 'back', ['KKKKKKKK', 'KKKKKKKK', 'RRRRRRRR', 'kkkkkkkk'], true)

  // Body: the suit jacket (buttoned, lapels, a red pocket square), white collar, red tie, the watch chain.
  S.art('body', 'top', rep([4, 'DDDDDDDD']))
  S.art('body', 'bottom', rep([4, 'DDDDDDDD']))
  S.art('body', 'front', [
    'DeCTTCeD',
    'DDeTTeDD',
    'DDeTYeRD',
    'DDDeYeDD',
    'DDDeYeDD',
    'DDDDeDDD',
    'DgDDGDDD',
    'DDGGDDDD',
    'DDDDDDDD',
    'DDDDdDDD',
    'DDDdDdDD',
    'dddDDddd'
  ])
  const side = rep([11, 'DDDD'], [1, 'dddd'])
  S.art('body', 'right', side)
  S.art('body', 'left', side)
  S.art('body', 'back', [
    'eeeeeeee',
    'DDDDDDDD',
    'DDDDDDDD',
    'DDDDDDDD',
    'DDDDDDDD',
    'DDDDDDDD',
    'DDDDDDDD',
    'DDDDDDDD',
    'DDDDDDDD',
    'DDDddDDD',
    'DDDddDDD',
    'ddddDddd'
  ])

  // Arms: suit sleeves, white cuffs, a gold ring.
  const arm = {
    top: rep([4, 'DDDD']),
    bottom: rep([4, 'ssss']),
    right: rep([9, 'DDDD'], [1, 'CCCC'], [1, 'SSSS'], [1, 'ssss']),
    front: rep([9, 'DDDD'], [1, 'CCCC'], [1, 'SSGS'], [1, 'ssss']),
    left: rep([9, 'DDDD'], [1, 'CCCC'], [1, 'SSSS'], [1, 'ssss']),
    back: rep([9, 'DDDD'], [1, 'CCCC'], [1, 'SSSS'], [1, 'ssss'])
  }
  S.limb('rarm', arm)
  S.limb('larm', mirrorLimb(arm))

  // Legs: pinstripe trousers, shiny black shoes.
  const leg = {
    top: rep([4, 'DDDD']),
    bottom: rep([4, 'OOOO']),
    right: rep([10, 'DDDD'], [1, 'OOOO'], [1, 'OOOO']),
    front: rep([10, 'DDDD'], [1, 'OooO'], [1, 'OOOO']),
    left: rep([10, 'DDDD'], [1, 'OOOO'], [1, 'OOOO']),
    back: rep([10, 'DDDD'], [1, 'OOOO'], [1, 'OOOO'])
  }
  S.limb('rleg', leg)
  S.limb('lleg', mirrorLimb(leg))
  // Pinstripes on every second column of the suit.
  S.pattern(['body', 'rarm', 'larm', 'rleg', 'lleg'], 'D', 'P', (x, y, f) => f !== 'top' && f !== 'bottom' && x % 2 === 1)
  // The jacket and sleeves stand out a little (overlay), the tie and shirt stay under them.
  S.lift('body', FACES, 'DPdeGgR')
  S.lift('rarm', FACES, 'DPd')
  S.lift('larm', FACES, 'DPd')
  return S.c
}

// ---------- Write ----------
const SKINS = { mara, boss, vic, broker }
const citizens = path.join(__dirname, '..', '..', 'server', 'plugins', 'Citizens', 'skins')
fs.mkdirSync(citizens, { recursive: true })
fs.mkdirSync(__dirname, { recursive: true })
for (const [id, draw] of Object.entries(SKINS)) {
  const c = draw()
  checkBase(c, id)
  fs.writeFileSync(path.join(citizens, id + '.png'), c.png())
  fs.writeFileSync(path.join(__dirname, id + '.png'), c.png())
  fs.writeFileSync(path.join(__dirname, 'preview-' + id + '.png'), preview(c).png())
  console.log(`wrote ${id}.png (server\\plugins\\Citizens\\skins and tools\\skins) and tools\\skins\\preview-${id}.png`)
}
