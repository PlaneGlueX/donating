// Draws the "targets2" NPC skins for hits.sk (hit targets and their bodyguards), in the standard
// 64x64 player skin layout (classic 4-pixel arms), like tools\make-cop-skin.js:
//   rico  - Rico Vance, a hijacker: red hoodie (hood down, drawstrings), black joggers, white sneakers, short dreads
//   pike  - Officer Pike, a crooked cop: light-blue short-sleeve uniform shirt, badge, name tag, aviators,
//           a horseshoe mustache, a duty belt with a holster, navy trousers
//   lena  - Lena Kross, a double-crosser: dark green bomber jacket (open), black tank top, blonde ponytail,
//           grey cargo pants, combat boots
//   guard - the "Hired Gun" bodyguard: all-black tactical outfit, charcoal plate carrier with pouches,
//           black balaclava (only the eyes show), gloves, black boots
// Each skin goes to server\plugins\Citizens\skins\<id>.png and tools\skins\<id>.png, plus a front/back
// preview tools\skins\preview-<id>.png (8x).
// Usage: tools\node\node.exe tools\skins\make-targets2-skins.js
const fs = require('fs')
const path = require('path')
const { canvas } = require('../png')

// ---------- The skin layout ----------
// Each part is a box of w x h x d; u,v = its base layer's corner, ou,ov = its overlay's corner.
const LAYOUT = {
  head: { u: 0, v: 0, ou: 32, ov: 0, w: 8, h: 8, d: 8 },
  body: { u: 16, v: 16, ou: 16, ov: 32, w: 8, h: 12, d: 4 },
  rarm: { u: 40, v: 16, ou: 40, ov: 32, w: 4, h: 12, d: 4 },
  larm: { u: 32, v: 48, ou: 48, ov: 48, w: 4, h: 12, d: 4 },
  rleg: { u: 0, v: 16, ou: 0, ov: 32, w: 4, h: 12, d: 4 },
  lleg: { u: 16, v: 48, ou: 0, ov: 48, w: 4, h: 12, d: 4 }
}
const FACES = ['top', 'bottom', 'right', 'front', 'left', 'back']
// [x, y, w, h] of a face. Top: row 0 = back, x 0 = the part's right side. Sides: right runs back->front,
// front runs right->left, left runs front->back, back (seen from behind) runs left->right.
function faceRect (part, face, over) {
  const p = LAYOUT[part]
  const u = over ? p.ou : p.u
  const v = over ? p.ov : p.v
  switch (face) {
    case 'top': return [u + p.d, v, p.w, p.d]
    case 'bottom': return [u + p.d + p.w, v, p.w, p.d]
    case 'right': return [u, v + p.d, p.d, p.h]
    case 'front': return [u + p.d, v + p.d, p.w, p.h]
    case 'left': return [u + p.d + p.w, v + p.d, p.d, p.h]
    case 'back': return [u + 2 * p.d + p.w, v + p.d, p.w, p.h]
  }
  throw new Error('face ' + face)
}

// Mirrors a limb's unwrapped row (outer, front, inner, back) for the other side of the body:
// reversing it and rotating by the back face's width swaps outer and inner and flips front and back.
const mirrorRow = (row, backW) => { const r = [...row].reverse().join(''); return r.slice(backW) + r.slice(0, backW) }
const flipRows = rows => rows.map(r => [...r].reverse().join(''))

function makeSkin (id, pal) {
  const c = canvas(64, 64)
  const color = ch => {
    if (ch === '.' || ch === ' ') return null
    const v = pal[ch]
    if (!v) throw new Error(id + ': no color for "' + ch + '"')
    return v.length === 3 ? [...v, 255] : v
  }
  const S = {
    id, c, pal,
    // Paints one face from rows of palette characters ('.' leaves a pixel alone).
    face (part, face, rows, over = false) {
      const [x0, y0, w, h] = faceRect(part, face, over)
      if (rows.length !== h) throw new Error(`${id} ${part}.${face}: ${rows.length} rows, want ${h}`)
      rows.forEach((row, y) => {
        if (row.length !== w) throw new Error(`${id} ${part}.${face} row ${y}: "${row}" is ${row.length} wide, want ${w}`)
        ;[...row].forEach((ch, x) => { const v = color(ch); if (v) c.set(x0 + x, y0 + y, v) })
      })
    },
    // One face's pixel in face coordinates.
    px (part, face, x, y, ch, over = false) {
      const [x0, y0] = faceRect(part, face, over)
      const v = color(ch); if (v) c.set(x0 + x, y0 + y, v)
    },
    // Paints the four sides from unwrapped rows (spaces allowed between faces): right, front, left, back.
    sides (part, rows, over = false) {
      const p = LAYOUT[part]
      const clean = rows.map(r => r.replace(/ /g, ''))
      const widths = [p.d, p.w, p.d, p.w]
      const names = ['right', 'front', 'left', 'back']
      let x = 0
      names.forEach((n, i) => {
        S.face(part, n, clean.map(r => {
          if (r.length !== 2 * p.d + 2 * p.w) throw new Error(`${id} ${part} sides: "${r}" is ${r.length} wide`)
          return r.slice(x, x + widths[i])
        }), over)
        x += widths[i]
      })
    },
    // A limb pair: rows written for the right one (outer, front, inner, back), mirrored for the left.
    limbs (right, left, spec, over = false) {
      if (spec.sides) { S.sides(right, spec.sides, over); S.sides(left, spec.sides.map(r => mirrorRow(r.replace(/ /g, ''), 4)), over) }
      if (spec.top) { S.face(right, 'top', spec.top, over); S.face(left, 'top', flipRows(spec.top), over) }
      if (spec.bottom) { S.face(right, 'bottom', spec.bottom, over); S.face(left, 'bottom', flipRows(spec.bottom), over) }
    },
    // The base layer must be solid everywhere (a transparent base pixel is a hole in game).
    check () {
      for (const part of Object.keys(LAYOUT)) {
        for (const f of FACES) {
          const [x0, y0, w, h] = faceRect(part, f, false)
          for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (c.get(x, y)[3] !== 255) throw new Error(`${id}: hole in ${part}.${f} at ${x},${y}`)
        }
      }
    }
  }
  return S
}

// A face of the finished skin as seen in game: the overlay where it has a pixel, else the base.
function seen (c, part, face, x, y) {
  const [ox, oy] = faceRect(part, face, true)
  const o = c.get(ox + x, oy + y)
  if (o[3] > 0) return o
  const [bx, by] = faceRect(part, face, false)
  return c.get(bx + x, by + y)
}

// Front and back views next to each other, 8x, on a grey background.
function preview (c) {
  const k = 8
  const W = 1 + 16 + 2 + 16 + 1
  const H = 1 + 32 + 1
  const out = canvas(W * k, H * k)
  out.fill(0, 0, W * k - 1, H * k - 1, [158, 164, 172, 255])
  const blit = (part, face, dx, dy) => {
    const [, , w, h] = faceRect(part, face, false)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.fill((dx + x) * k, (dy + y) * k, (dx + x) * k + k - 1, (dy + y) * k + k - 1, seen(c, part, face, x, y))
  }
  const view = (ox, back) => {
    blit('head', back ? 'back' : 'front', ox + 4, 1)
    blit('body', back ? 'back' : 'front', ox + 4, 9)
    blit(back ? 'larm' : 'rarm', back ? 'back' : 'front', ox, 9)
    blit(back ? 'rarm' : 'larm', back ? 'back' : 'front', ox + 12, 9)
    blit(back ? 'lleg' : 'rleg', back ? 'back' : 'front', ox + 4, 21)
    blit(back ? 'rleg' : 'lleg', back ? 'back' : 'front', ox + 8, 21)
  }
  view(1, false)
  view(1 + 16 + 2, true)
  return out.png()
}

// ---------- Rico Vance ----------
function rico () {
  const S = makeSkin('rico', {
    H: [34, 26, 22], h: [54, 40, 32], D: [38, 29, 24], d: [66, 50, 39], t: [98, 74, 56],
    K: [124, 84, 58], k: [102, 66, 44], s: [148, 104, 74], E: [90, 56, 38],
    W: [238, 236, 230], I: [60, 38, 26], B: [24, 17, 13], M: [74, 38, 32], m: [104, 62, 48],
    R: [180, 36, 40], r: [142, 26, 32], q: [106, 18, 24], S: [212, 66, 62], b: [150, 28, 34],
    C: [240, 240, 240], c: [168, 168, 176],
    P: [38, 38, 44], p: [24, 24, 28], e: [62, 62, 72], n: [50, 50, 58],
    v: [206, 206, 212], l: [172, 172, 182], g: [150, 150, 158], G: [92, 92, 100]
  })
  // Head: short hair under the dreads, a goatee.
  S.sides('head', [
    'HHHHHHHH HHHHHHHH HHHHHHHH HHHHHHHH',
    'HHHHHHHH HhKKKKhH HHHHHHHH HHHHHHHH',
    'HHHHHHHH HKKsKKKH HHHHHHHH HHHHHHHH',
    'HHHHKKKK KBBKKBBK KKKKHHHH HHHHHHHH',
    'HHHEKKKK KWIKKIWK KKKKEHHH HHHHHHHH',
    'HHHEEKKK KKKkkKKK KKKEEHHH hHHhhHHh',
    'KKKKKKKK KKkMMkKK KKKKKKKK KKKKKKKK',
    'kkkkkkkk KKKkkKKK kkkkkkkk kkkkkkkk'
  ])
  S.face('head', 'top', Array(8).fill('HHHHHHHH'))
  S.face('head', 'bottom', Array(8).fill('kkkkkkkk'))
  // Hat layer: the dreads, rope-like strands of two tones with lighter tips, short at the face.
  const dread = (face, lengths) => {
    const rows = []
    for (let y = 0; y < 8; y++) {
      rows.push(lengths.map((L, x) => {
        if (y >= L) return '.'
        if (y === L - 1 && L > 1) return 't'
        if ((y + x) % 3 === 2) return x % 2 ? 't' : 'd'
        return x % 2 ? 'd' : 'D'
      }).join(''))
    }
    S.face('head', face, rows, true)
  }
  dread('right', [6, 7, 6, 3, 3, 4, 3, 2])
  dread('front', [5, 3, 2, 3, 2, 2, 3, 5])
  dread('left', [2, 3, 4, 3, 3, 6, 7, 6])
  dread('back', [6, 7, 6, 7, 7, 6, 7, 6])
  S.face('head', 'top', [
    'DdDtDdDt',
    'dDtDdDtD',
    'DtDdDtDd',
    'dDdDtDdD',
    'DdtDdDtD',
    'tDdDdtDd',
    'DdDtDdDt',
    'dtDdDtDd'
  ], true)
  // Body: the red hoodie, drawstrings, kangaroo pocket, ribbed hem; the hood hangs down the back.
  S.sides('body', [
    'RRRS RRrKKrRR SRRR qRSSSSRq',
    'RRRR RRCrrCRR RRRR qRRSSRRq',
    'RRRR RSCRRCSR RRRR RqRRRRqR',
    'RRRR RRcRRcRR RRRR RRqRRqRR',
    'rRRR RRRRRRRR RRRr RRRqqRRR',
    'RRRR RrRRRRrR RRRR RRRRRRRR',
    'RRRR RRqqqqRR RRRR RrRRRRrR',
    'RRRr RqrrrrqR rRRR RRRRRRRR',
    'RRRR qrrrrrrq RRRR RRRrrRRR',
    'RrRR RrrrrrrR RRrR RRRRRRRR',
    'bbbb bbbbbbbb bbbb bbbbbbbb',
    'brbr brbrbrbr brbr brbrbrbr'
  ])
  S.face('body', 'top', ['RRRRRRRR', 'RRRRRRRR', 'SRRRRRRS', 'SSRRRRSS'])
  S.face('body', 'bottom', Array(4).fill('bbbbbbbb'))
  // Jacket layer: the hood stands out from the back.
  S.face('body', 'back', [
    'qRSSSSRq',
    'qRRSSRRq',
    '.qRRRRq.',
    '..qRRq..',
    '...qq...',
    '........', '........', '........', '........', '........', '........', '........'
  ], true)
  // Arms: hoodie sleeves with a ribbed cuff, hands.
  S.limbs('rarm', 'larm', {
    sides: [
      'SRRR SSRR RRRR RRRS',
      'RRRR RSRR RRRR RRRR',
      'RRRR RRRR RRRR RRRR',
      'RRRR RRRR rRRR RRRR',
      'RRRR RRRR RRRR RRRR',
      'RrRR RRrR RqRR RRRr',
      'RRRR RRRR RRRR RRRR',
      'RRRR RRRR RRRR RRRR',
      'RRrR RrRR RRRR rRRR',
      'bbbb bbbb bbbb bbbb',
      'KKKK KKKK KKKK KKKK',
      'kKKk KKKK kkkk KKKK'
    ],
    top: ['RRRR', 'SRRR', 'SSRR', 'SSRR'],
    bottom: Array(4).fill('kkkk')
  })
  // Legs: black joggers gathered at the ankle, white sneakers with a red heel tab.
  S.limbs('rleg', 'lleg', {
    sides: [
      'PPPP PPPP PPPP PPPP',
      'PPPP PPPP PPPP PPPP',
      'pPPP PPPp PPPP PPPP',
      'PPPP PPPP PPPP PPPP',
      'PPPP PePP PPPP PPPP',
      'PPPp PePP pPPP PPpP',
      'PPPP PPPP PPPP PPPP',
      'PpPP PPpP PPPP PpPP',
      'pnpn pnpn pnpn pnpn',
      'WWWW WllW WWWW RRRR',
      'WvWW WWWW WWvW WRRW',
      'gggg gggg gggg gggg'
    ],
    top: Array(4).fill('PPPP'),
    bottom: Array(4).fill('GGGG')
  })
  return S
}

// ---------- Officer Pike ----------
function pike () {
  const S = makeSkin('pike', {
    H: [100, 72, 48], h: [78, 54, 34], g: [156, 146, 134],
    K: [222, 162, 130], k: [192, 134, 104], s: [238, 186, 156], r: [208, 128, 108], E: [182, 118, 92],
    B: [84, 58, 38], W: [238, 236, 230], I: [72, 112, 152], T: [90, 60, 38], M: [132, 66, 60],
    G: [218, 178, 78], L: [32, 34, 42], R: [160, 184, 208], j: [60, 66, 84],
    A: [150, 190, 226], a: [118, 156, 196], d: [92, 128, 168], o: [184, 216, 242], w: [238, 240, 244],
    Y: [232, 188, 66], y: [170, 128, 40], X: [22, 22, 26], U: [32, 42, 78],
    N: [36, 46, 84], n: [24, 30, 58], e: [60, 74, 120], z: [26, 26, 28], V: [206, 206, 214], Q: [72, 72, 80],
    O: [28, 28, 30], J: [92, 92, 102], F: [12, 12, 14]
  })
  // Head: a greying crew cut, a horseshoe mustache, ruddy cheeks.
  S.sides('head', [
    'HHHHHHHH HHHHHHHH HHHHHHHH HHHHHHHH',
    'HHHHHHgH HKKKKKKH HgHHHHHH HHHHHHHH',
    'HHHHHggK KBBKKBBK KggHHHHH HHHHHHHH',
    'HhKKKKKK KKKKKKKK KKKKKKhH hHHHHHHh',
    'hKKEEKKK KWIKKIWK KKKEEKKh hhhhhhhh',
    'KKKEEKKr KrKkkKrK rKKEEKKK KKKKKKKK',
    'KKKKKKKK KTTTTTTK KKKKKKKK KkKKKKkK',
    'kkkkkkkk KTkMMkTK kkkkkkkk kkkkkkkk'
  ])
  S.face('head', 'top', ['HHHHHHHH', 'HHhHHhHH', 'HHHHHHHH', 'HhHHHHhH', 'HHHHHHHH', 'HHHhHHHH', 'HHHHHHHH', 'HHHHHHHH'])
  S.face('head', 'bottom', Array(8).fill('kkkkkkkk'))
  // Hat layer: gold-framed aviators with dark lenses and a glint, temples back to the ears.
  S.sides('head', [
    '........ ........ ........ ........',
    '........ ........ ........ ........',
    '........ ........ ........ ........',
    '........ .GGGGGG. ........ ........',
    '...GGGGG GRLLRLLG GGGGG... ........',
    '........ .jj..jj. ........ ........',
    '........ ........ ........ ........',
    '........ ........ ........ ........'
  ], true)
  // Body: light-blue uniform shirt (badge, name tag, pocket flaps, buttons), duty belt, holster on the right hip.
  S.sides('body', [
    'AAAo AodwwdoA oAAA oaaaaaao',
    'AAAA AAodAoAA AAAA AAAAAAAA',
    'AAAA AAAaAYYA AAAA aaaaaaaa',
    'AaAA AXXaAyyA AAaA AAAAAAAA',
    'AAAA AaaoAaaA AAAA AAAddAAA',
    'AAAA AAAaAAAA AAAA AAAAAAAA',
    'AAaA AaAoAAaA AaAA AaAAAAaA',
    'AAAA AAAaAAAA AAAA AAAAAAAA',
    'aQQa aaaaaaaa aaaa aaaaaaaa',
    'zXXz zzzVVzzz zzzz zzzzzzzz',
    'NXXN NNNnNNNN NNNN NNNNNNNN',
    'NXXN NNNnNNNN NNNN NnnNNnnN'
  ])
  S.face('body', 'top', ['AAAAAAAA', 'UAAAAAAU', 'UAAAAAAU', 'AAAAAAAA'])
  S.face('body', 'bottom', Array(4).fill('NNNNNNNN'))
  // Jacket layer: the collar and the badge stand out.
  S.sides('body', [
    '.... .od..do. .... oaaaaaao',
    '.... ........ .... ........',
    '.... .....YY. .... ........',
    '.... .....yy. .... ........',
    '.... ........ .... ........', '.... ........ .... ........', '.... ........ .... ........', '.... ........ .... ........',
    '.... ........ .... ........', '.... ........ .... ........', '.... ........ .... ........', '.... ........ .... ........'
  ], true)
  // Arms: short sleeves with a shoulder patch, bare forearms.
  const armRows = [
    'oAAA ooAA AAAA AAAo',
    'AUUA AAAA AAAA AAAA',
    'AUYA AAAA AaAA AAAA',
    'dddd dddd dddd dddd',
    'KKKK KKKK kKKK KKKK',
    'KKKK KsKK KKKK KKKK',
    'KKKK KKKK KKKK KKKK',
    'KKKK KKKK KKKk KKKK',
    'KKKK KKKK KKKK KKKK',
    'KKKK KKKK KKKK KKKK',
    'KKKK KKKK KKKK KKKK',
    'kKKk kkkk kkkk kkkk'
  ]
  S.limbs('rarm', 'larm', { sides: armRows, top: ['AAAA', 'UUUU', 'UUUU', 'AAAA'], bottom: Array(4).fill('kkkk') })
  // Sleeve layer: the short sleeves stand out.
  S.limbs('rarm', 'larm', { sides: armRows.map((r, y) => y < 4 ? r : r.replace(/[^ ]/g, '.')) }, true)
  // A black wristwatch on the left wrist, the face on the outside.
  const wrist = row => Array(12).fill('....').map((r, y) => y === 8 ? row : r)
  for (const f of ['right', 'front', 'back']) S.face('larm', f, wrist('XXXX'))
  S.face('larm', 'left', wrist('XVVX'))
  // Legs: pressed navy trousers with a crease, polished black shoes.
  S.limbs('rleg', 'lleg', {
    sides: [
      'NNNN NNNN NNNN NNNN',
      'NNNN NeNN NNNN NNNN',
      'NNNN NeNN NNNN NNNN',
      'nNNN NeNN NNNn NNNN',
      'NNNN NeNN NNNN NNNN',
      'NNNn NenN nNNN NnNN',
      'NNNN NeNN NNNN NNNN',
      'NNNN NeNN NNNN NNNN',
      'NNNN NeNN NNNN NNNN',
      'nnnn nnnn nnnn nnnn',
      'OOOO OJOO OOOO OOOO',
      'FFFF FFFF FFFF FFFF'
    ],
    top: Array(4).fill('NNNN'),
    bottom: Array(4).fill('FFFF')
  })
  // The holster carries on down the right thigh.
  S.face('rleg', 'right', ['NXXN', 'NXXN', 'NXXN', 'nXXn', 'NNNN', 'NNNn', 'NNNN', 'NNNN', 'NNNN', 'nnnn', 'OOOO', 'FFFF'])
  return S
}

// ---------- Lena Kross ----------
function lena () {
  const S = makeSkin('lena', {
    Y: [228, 192, 110], y: [190, 150, 74], z: [248, 226, 162], o: [58, 36, 60],
    K: [238, 200, 168], k: [214, 170, 138], p: [232, 166, 150], E: [204, 154, 124],
    B: [140, 96, 54], W: [240, 238, 234], I: [52, 124, 80], L: [184, 78, 88], R: [236, 192, 66],
    J: [58, 84, 54], j: [44, 66, 42], i: [32, 48, 30], g: [84, 114, 76], r: [36, 40, 34], Z: [176, 176, 182],
    T: [28, 28, 30], t: [52, 52, 58], O: [96, 64, 40], V: [206, 206, 212],
    C: [126, 126, 122], c: [100, 100, 96], e: [152, 152, 148], x: [84, 84, 80],
    b: [38, 34, 32], n: [66, 60, 56], a: [128, 122, 114], h: [62, 56, 52], s: [16, 16, 16]
  })
  // Head: hair pulled back into a ponytail, a side part, one raised brow, a smirk, a gold earring.
  S.sides('head', [
    'YYYYYYYY YzzYYYYY YYYYYYYY YYYYYYYY',
    'YzYYYYzY YYYyKKKY YzYYYYzY YzYYYYzY',
    'YYYYYYYY YBBKKKKY YYYYYYYY YYzYYzYY',
    'yYYKKKKK KKKKKBBK KKKKKYYy YYYooYYY',
    'yYYEKKKK KWIKKIWK KKKKEYYy yYYYYYYy',
    'yYYEEKKK KpKkkKpK KKKEEYYy yYYYYYYy',
    'yYYRKKKK KKKLLkKK KKKKRYYy yyYYYYyy',
    'yyKKKKKK KKKKKKKK KKKKKKyy KKyyyyKK'
  ])
  S.face('head', 'top', ['YYYzYYYY', 'YYzYYYzY', 'YzYYYzYY', 'YYYYzYYY', 'YzYYYYzY', 'YYzYYzYY', 'zYYYyYYz', 'YYYyYYYY'])
  S.face('head', 'bottom', ['yyyyyyyy', 'yyyyyyyy', 'yyyyyyyy', 'kkkkkkkk', 'kkkkkkkk', 'KKKKKKKK', 'KKKKKKKK', 'KKKKKKKK'])
  // Hat layer: the ponytail, tied at the back and hanging down.
  S.face('head', 'back', [
    '........',
    '........',
    '...zz...',
    '...oo...',
    '..yzzy..',
    '..yzYy..',
    '..yYzy..',
    '...zY...'
  ], true)
  // Body: the open bomber (ribbed collar and hem), a black tank top, a brown belt, grey cargo pants.
  const body = [
    'rrrr JrKKKKrJ rrrr rrrrrrrr',
    'JJgg gjTKKTjg ggJJ JJJJJJJJ',
    'JJJg gjTTTTjg gJJJ gJJJJJJg',
    'JJJJ JjTTTTjJ JJJJ JJJJJJJJ',
    'JJJJ JjTTTTjJ JJJJ JJjjjjJJ',
    'jjJJ JjTTTTjJ JJjj JJJJJJJJ',
    'JJJJ jjTTTTjj JJJJ JJJJJJJJ',
    'JJJJ JjTTTTjJ JJJJ JjJJJJjJ',
    'jjjj jjTTTTjj jjjj jjjjjjjj',
    'rrrr rrTTTTrr rrrr rrrrrrrr',
    'rrrr rrOVVOrr rrrr rrrrrrrr',
    'CCCC CCCcCCCC CCCC CCCCCCCC'
  ]
  S.sides('body', body)
  S.face('body', 'top', ['rrrrrrrr', 'JJJJJJJJ', 'gJJJJJJg', 'gJrKKrJg'])
  S.face('body', 'bottom', Array(4).fill('CCCCCCCC'))
  // Jacket layer: the whole jacket stands out (the tank top shows through the open front), the ponytail's tip.
  S.sides('body', body.map((r, y) => {
    if (y >= 11) return r.replace(/[^ ]/g, '.')
    const [rs, fr, ls, bk] = r.split(' ')
    return [rs, fr.slice(0, 2) + '....' + fr.slice(6), ls, bk].join(' ')
  }), true)
  S.face('body', 'back', ['...yz...', '...yY...', '...y....'].concat(Array(9).fill('........')), true)
  // Arms: bomber sleeves with ribbed cuffs.
  const armRows = [
    'gggJ ggJJ JJJJ JJgg',
    'gJJJ gJJJ JJJJ JJJg',
    'JJJJ JJJJ JJJJ JJJJ',
    'JJJJ JJJJ JJJJ JJJJ',
    'JJJJ JJJJ jJJJ JJJJ',
    'jjJJ JJjj jjjJ JJjj',
    'JJJJ JJJJ JJJJ JJJJ',
    'JJJJ JJJJ JJJJ JJJJ',
    'jjjj jjjj jjjj jjjj',
    'rrrr rrrr rrrr rrrr',
    'KKKK KKKK KKKK KKKK',
    'kKKk KKKK kkkk KKKK'
  ]
  S.limbs('rarm', 'larm', { sides: armRows, top: ['JJJJ', 'gJJJ', 'ggJJ', 'gJJJ'], bottom: Array(4).fill('kkkk') })
  S.limbs('rarm', 'larm', { sides: armRows.map((r, y) => y < 10 ? r : r.replace(/[^ ]/g, '.')) }, true)
  // The bomber's zip pocket on the left sleeve (base and sleeve layer).
  for (const over of [false, true]) S.face('larm', 'left', ['JJJg', 'iiiJ', 'jZjJ', 'jjjJ'].concat(Array(8).fill('....')), over)
  // Legs: grey cargo pants with thigh pockets, tucked into black combat boots.
  S.limbs('rleg', 'lleg', {
    sides: [
      'CCCC CCCC CCCC CCCC',
      'CCCC CeCC CCCC CCCC',
      'CCCC CeCC CCCC CCCC',
      'xxxx CCCC CCCC CCCC',
      'eeee cCCC CCCC CCCC',
      'xCCx cCCC CCCC CCCC',
      'xCCx cccC CCCC CccC',
      'xxxx CCCC CCCC CCCC',
      'nnnn nnnn nnnn nnnn',
      'bbbb baab bbbb bbbb',
      'bhbb baab bbhb bbbb',
      'ssss ssss ssss ssss'
    ],
    top: Array(4).fill('CCCC'),
    bottom: Array(4).fill('ssss')
  })
  return S
}

// ---------- The Hired Gun (bodyguard) ----------
function guard () {
  const S = makeSkin('guard', {
    X: [28, 28, 32], x: [33, 33, 38], q: [14, 14, 17], m: [16, 16, 19],
    K: [170, 120, 88], k: [140, 96, 68], B: [50, 32, 22], W: [230, 228, 222], I: [96, 122, 136],
    V: [68, 70, 72], v: [50, 52, 54], w: [42, 44, 46], P: [84, 86, 88], p: [104, 106, 108], Q: [58, 60, 62],
    y: [48, 49, 55], z: [20, 20, 23],
    L: [42, 42, 45], H: [120, 122, 124],
    T: [32, 33, 37], t: [22, 22, 26], u: [50, 51, 57],
    G: [18, 18, 20], g: [42, 42, 46], n: [62, 62, 66],
    O: [12, 12, 14], Y: [74, 74, 80],
    b: [20, 20, 22], N: [44, 44, 48], l: [78, 78, 84], s: [10, 10, 12]
  })
  // Head: a knit balaclava with one eye slit (brows, eyes), the mouth a crease under the fabric.
  S.sides('head', [
    'XxXxXxXx XxXxXxXx xXxXxXxX XxXxXxXx',
    'XxXxXxXx XxXxXxXx xXxXxXxX XxXxXxXx',
    'XxXxXxXx XqqqqqqX xXxXxXxX XxXxXxXx',
    'XxXxXxXq qBBKKBBq qXxXxXxX XxXxXxXx',
    'XxXxXxXq qWIkkIWq qXxXxXxX XxXxXxXx',
    'XxXxXxXx XxXxxXxX xXxXxXxX XxXxXxXx',
    'XxXxXxXx XxXmmXxX xXxXxXxX XxXxXxXx',
    'XxXxXxXx XxXxXxXx xXxXxXxX XxXxXxXx'
  ])
  S.face('head', 'top', Array(8).fill('XxXxXxXx'))
  S.face('head', 'bottom', Array(8).fill('XXXXXXXX'))
  // Body: black combat shirt under a charcoal plate carrier (webbing, three mag pouches), a battle belt.
  const body = [
    'XXXX XVXXXXVX XXXX XVXXXXVX',
    'yXXX XVVVVVVX XXXy XVVVVVVX',
    'XXXX VwwwwwwV XXXX VVVwwVVV',
    'XXXX VVVVVVVV XXXX VwwwwwwV',
    'VVVV VwwwwwwV VVVV VVVVVVVV',
    'wwww VpQpQpQV wwww VwwwwwwV',
    'VVVV VPQPQPQV VVVV VVVVVVVV',
    'wwww VPQPQPQV wwww VwwwwwwV',
    'vvvv vvvvvvvv vvvv vvvvvvvv',
    'XXXX XzXXXXzX XXXX XXXXXXXX',
    'LPPL LLLHHLLL LLLL LLLLLLLL',
    'TTTT TTTtTTTT TTTT TTTTTTTT'
  ]
  S.sides('body', body)
  S.face('body', 'top', ['XVXXXXVX', 'XVXXXXVX', 'XVXXXXVX', 'XVXXXXVX'])
  S.face('body', 'bottom', Array(4).fill('TTTTTTTT'))
  // Jacket layer: the plate carrier stands out.
  S.sides('body', body.map(r => r.replace(/[^VvwpPQ ]/g, '.')), true)
  // Arms: black sleeves with a plain shoulder pocket, tactical gloves with knuckle pads.
  S.limbs('rarm', 'larm', {
    sides: [
      'yXXX yXXX XXXX XXXy',
      'XyyX XXXX XXXX XXXX',
      'XyyX XXXX zXXX XXXX',
      'XyyX XXXX XXXX XXXX',
      'XXXX XXXX XXXX XXXX',
      'XzXX XXzX XzXX XXXz',
      'XXXX XXXX XXXX XXXX',
      'XXXX XXXX XXXX zXXX',
      'zzzz zzzz zzzz zzzz',
      'gggg gggg gggg gggg',
      'GnnG GGGG GGGG GGGG',
      'GGGG GGGG GGGG GGGG'
    ],
    top: ['XXXX', 'yXXX', 'yyXX', 'yXXX'],
    bottom: Array(4).fill('GGGG')
  })
  // Legs: black cargo pants with knee pads, black boots.
  S.limbs('rleg', 'lleg', {
    sides: [
      'TTTT TTTT TTTT TTTT',
      'TTTT TuTT TTTT TTTT',
      'tTTT TTTT TTTt TTTT',
      'TTTT TTTT TTTT TTTT',
      'TTTT vVVv TTTT TTTT',
      'wwww VppV wwww wwww',
      'TTTT vVVv TTTT TTTT',
      'TTTT TtTT TTTT TTTT',
      'tTTT TTTT TTTt TtTT',
      'NNNN NNNN NNNN NNNN',
      'bbbb blbb bbbb bbbb',
      'ssss ssss ssss ssss'
    ],
    top: Array(4).fill('TTTT'),
    bottom: Array(4).fill('ssss')
  })
  // Knee pads stand out a little.
  S.limbs('rleg', 'lleg', {
    sides: Array(12).fill('.... .... .... ....').map((r, y) => y === 4 ? '.... vVVv .... ....' : y === 5 ? '.... VppV .... ....' : y === 6 ? '.... vVVv .... ....' : r)
  }, true)
  // A drop-leg holster on the right thigh.
  S.face('rleg', 'right', ['TYYT', 'TOOT', 'TOOT', 'wOOw', 'TOOT', 'wwww', 'TTTT', 'TTTT', 'tTTT', 'NNNN', 'bbbb', 'ssss'])
  S.face('rleg', 'right', ['.YY.', '.OO.', '.OO.', '.OO.', '.OO.', '....', '....', '....', '....', '....', '....', '....'], true)
  return S
}

// ---------- Write ----------
const root = path.join(__dirname, '..', '..')
const citizens = path.join(root, 'server', 'plugins', 'Citizens', 'skins')
const tools = path.join(root, 'tools', 'skins')
fs.mkdirSync(citizens, { recursive: true })
fs.mkdirSync(tools, { recursive: true })
for (const make of [rico, pike, lena, guard]) {
  const S = make()
  S.check()
  const png = S.c.png()
  fs.writeFileSync(path.join(citizens, S.id + '.png'), png)
  fs.writeFileSync(path.join(tools, S.id + '.png'), png)
  fs.writeFileSync(path.join(tools, 'preview-' + S.id + '.png'), preview(S.c))
  console.log('wrote ' + S.id + '.png (Citizens\\skins and tools\\skins) and preview-' + S.id + '.png')
}
