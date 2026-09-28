// Draws the shopkeepers' skins (group "keepers"): gun, gear, bag, tools, cars, garage.
// Standard 64x64 player skin layout (classic, 4-pixel arms), like tools\make-cop-skin.js.
// Each skin goes to server\plugins\Citizens\skins\<id>.png and tools\skins\<id>.png, and a preview
// (front, back, both sides, the top of the head, the raw sheet) to tools\skins\preview-<id>.png.
// Usage: tools\node\node.exe tools\skins\make-keepers-skins.js
const fs = require('fs')
const path = require('path')
const { canvas, shade } = require('../png')

const ROOT = path.join(__dirname, '..', '..')
const OUTS = [path.join(ROOT, 'server', 'plugins', 'Citizens', 'skins'), __dirname]

// ---------- The skin layout ----------
const R = (x, y, w, h) => ({ x, y, w, h })
const shift = (part, dx, dy) => Object.fromEntries(Object.entries(part).map(([k, r]) => [k, R(r.x + dx, r.y + dy, r.w, r.h)]))
const HEAD = { top: R(8, 0, 8, 8), bottom: R(16, 0, 8, 8), right: R(0, 8, 8, 8), front: R(8, 8, 8, 8), left: R(16, 8, 8, 8), back: R(24, 8, 8, 8) }
const HAT = shift(HEAD, 32, 0)
const BODY = { top: R(20, 16, 8, 4), bottom: R(28, 16, 8, 4), right: R(16, 20, 4, 12), front: R(20, 20, 8, 12), left: R(28, 20, 4, 12), back: R(32, 20, 8, 12) }
const JACKET = shift(BODY, 0, 16)
const RARM = { top: R(44, 16, 4, 4), bottom: R(48, 16, 4, 4), right: R(40, 20, 4, 12), front: R(44, 20, 4, 12), left: R(48, 20, 4, 12), back: R(52, 20, 4, 12) }
const RSLEEVE = shift(RARM, 0, 16)
const LARM = { top: R(36, 48, 4, 4), bottom: R(40, 48, 4, 4), right: R(32, 52, 4, 12), front: R(36, 52, 4, 12), left: R(40, 52, 4, 12), back: R(44, 52, 4, 12) }
const LSLEEVE = shift(LARM, 16, 0)
const RLEG = { top: R(4, 16, 4, 4), bottom: R(8, 16, 4, 4), right: R(0, 20, 4, 12), front: R(4, 20, 4, 12), left: R(8, 20, 4, 12), back: R(12, 20, 4, 12) }
const RPANTS = shift(RLEG, 0, 16)
const LLEG = { top: R(20, 48, 4, 4), bottom: R(24, 48, 4, 4), right: R(16, 52, 4, 12), front: R(20, 52, 4, 12), left: R(24, 52, 4, 12), back: R(28, 52, 4, 12) }
const LPANTS = shift(LLEG, -16, 0)
const BASE = [HEAD, BODY, RARM, LARM, RLEG, LLEG]

// ---------- Art helpers ----------
// Faces are rows of palette letters ('.' = leave transparent). Conventions:
// - Box parts (head, hat, body, jacket): `side` is the character's right side with x0 = back edge and the last
//   column = front edge; the left side is `sideL` (same convention, default = side) drawn mirrored.
// - Limbs are described as the RIGHT arm/leg: `outer` x0 = back edge, x3 = front edge; `front` x0 = outer edge;
//   `inner` x0 = front edge; `back` x0 = inner edge. The left limb is the same description mirrored
//   (or `armL` / `legL`, also written as if it were a right limb).
const rep = (w, s) => [...s].map(ch => ch.repeat(w)) // one row per letter, each letter repeated w times
const put = (rows, x, y, s) => rows.map((r, i) => i === y ? r.slice(0, x) + s + r.slice(x + s.length) : r)
const puts = (rows, edits) => edits.reduce((r, [x, y, s]) => put(r, x, y, s), rows)
const flip = rows => rows && rows.map(r => [...r].reverse().join(''))
const rows = (n, s) => Array(n).fill(s) // n identical rows

function paint (c, rect, rows, pal, where) {
  if (!rows) return
  if (rows.length !== rect.h) throw new Error(`${where}: ${rows.length} rows, want ${rect.h}`)
  rows.forEach((row, y) => {
    if (row.length !== rect.w) throw new Error(`${where} row ${y}: "${row}" is ${row.length} wide, want ${rect.w}`)
    ;[...row].forEach((ch, x) => {
      if (ch === '.') return
      const col = pal[ch]
      if (!col) throw new Error(`${where}: no color for '${ch}'`)
      c.set(rect.x + x, rect.y + y, typeof col === 'function' ? col(x, y, where) : col)
    })
  })
}
function box (c, L, f, pal, name) {
  if (!f) return
  for (const k of ['top', 'bottom', 'front', 'back']) paint(c, L[k], f[k], pal, `${name}.${k}`)
  paint(c, L.right, f.side, pal, `${name}.side`)
  paint(c, L.left, flip(f.sideL || f.side), pal, `${name}.sideL`)
}
function limb (c, L, f, pal, name, mirror) {
  if (!f) return
  const m = mirror ? flip : r => r
  for (const k of ['top', 'bottom', 'front', 'back']) paint(c, L[k], m(f[k]), pal, `${name}.${k}`)
  paint(c, mirror ? L.left : L.right, m(f.outer), pal, `${name}.outer`)
  paint(c, mirror ? L.right : L.left, m(f.inner), pal, `${name}.inner`)
}
function render (ch) {
  const c = canvas(64, 64)
  const p = ch.pal
  box(c, HEAD, ch.head, p, 'head'); box(c, HAT, ch.hat, p, 'hat')
  box(c, BODY, ch.body, p, 'body'); box(c, JACKET, ch.jacket, p, 'jacket')
  limb(c, RARM, ch.arm, p, 'arm', false); limb(c, LARM, ch.armL || ch.arm, p, 'armL', true)
  limb(c, RSLEEVE, ch.sleeve, p, 'sleeve', false); limb(c, LSLEEVE, ch.sleeveL || ch.sleeve, p, 'sleeveL', true)
  limb(c, RLEG, ch.leg, p, 'leg', false); limb(c, LLEG, ch.legL || ch.leg, p, 'legL', true)
  limb(c, RPANTS, ch.pants, p, 'pants', false); limb(c, LPANTS, ch.pantsL || ch.pants, p, 'pantsL', true)
  // The base layer must have no holes (they show as see-through gaps in game).
  for (const part of BASE) {
    for (const [k, r] of Object.entries(part)) {
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { if (c.get(x, y)[3] !== 255) throw new Error(`${ch.id}: hole at ${x},${y} (${k})`) }
    }
  }
  return c
}

// ---------- Preview: front, back, right side, left side, head top (8x), the raw sheet (4x) ----------
function preview (c) {
  const S = 8
  const W = 8 + 128 + 16 + 128 + 16 + 64 + 16 + 64 + 16 + 64 + 16 + 256 + 8
  const H = 8 + 256 + 8
  const p = canvas(W, H)
  p.fill(0, 0, W - 1, H - 1, [92, 100, 112, 255])
  const bg = (x, y, s) => (((x / s) | 0) + ((y / s) | 0)) % 2 ? [124, 136, 146, 255] : [110, 122, 132, 255]
  const view = (ox, oy, w, h, parts) => {
    for (let y = 0; y < h * S; y++) for (let x = 0; x < w * S; x++) p.set(ox + x, oy + y, bg(x, y, S))
    for (const [base, over, dx, dy] of parts) {
      for (let y = 0; y < base.h; y++) {
        for (let x = 0; x < base.w; x++) {
          const o = over ? c.get(over.x + x, over.y + y) : [0, 0, 0, 0]
          const b = c.get(base.x + x, base.y + y)
          const col = o[3] > 0 ? o : b[3] > 0 ? b : null
          if (col) p.fill(ox + (dx + x) * S, oy + (dy + y) * S, ox + (dx + x) * S + S - 1, oy + (dy + y) * S + S - 1, col)
        }
      }
    }
  }
  let x = 8
  view(x, 8, 16, 32, [[HEAD.front, HAT.front, 4, 0], [BODY.front, JACKET.front, 4, 8], [RARM.front, RSLEEVE.front, 0, 8], [LARM.front, LSLEEVE.front, 12, 8], [RLEG.front, RPANTS.front, 4, 20], [LLEG.front, LPANTS.front, 8, 20]]); x += 128 + 16
  view(x, 8, 16, 32, [[HEAD.back, HAT.back, 4, 0], [BODY.back, JACKET.back, 4, 8], [LARM.back, LSLEEVE.back, 0, 8], [RARM.back, RSLEEVE.back, 12, 8], [LLEG.back, LPANTS.back, 4, 20], [RLEG.back, RPANTS.back, 8, 20]]); x += 128 + 16
  view(x, 8, 8, 32, [[HEAD.right, HAT.right, 0, 0], [BODY.right, JACKET.right, 2, 8], [RARM.right, RSLEEVE.right, 2, 8], [RLEG.right, RPANTS.right, 2, 20]]); x += 64 + 16
  view(x, 8, 8, 32, [[HEAD.left, HAT.left, 0, 0], [BODY.left, JACKET.left, 2, 8], [LARM.left, LSLEEVE.left, 2, 8], [LLEG.left, LPANTS.left, 2, 20]]); x += 64 + 16
  view(x, 8, 8, 8, [[HEAD.top, HAT.top, 0, 0]])
  view(x, 8 + 80, 8, 4, [[BODY.top, JACKET.top, 0, 0]])
  view(x, 8 + 128, 8, 8, [[HEAD.bottom, null, 0, 0]]); x += 64 + 16
  for (let y = 0; y < 256; y++) for (let xx = 0; xx < 256; xx++) { const col = c.get(xx >> 2, y >> 2); p.set(x + xx, 8 + y, col[3] > 0 ? col : bg(xx, y, 4)) }
  return p
}

// ---------- Shared colors ----------
const WHITE = [238, 238, 236, 255]
const hex = (r, g, b) => [r, g, b, 255]

// ============================================================ gun: the Gun Shop dealer
// Olive tactical shirt, desert-tan ammo vest with rifle mag pouches, black cap, short beard, fingerless gloves.
const gun = (() => {
  const S = hex(172, 120, 84); const O = hex(98, 104, 60); const T = hex(198, 170, 118); const P = hex(158, 126, 82)
  const D = hex(72, 70, 64); const Rb = hex(146, 116, 78)
  const pal = {
    S, s: shade(S, 0.86), n: shade(S, 0.74),
    H: hex(44, 30, 22), h: hex(72, 52, 38), B: hex(60, 41, 28), b: hex(32, 22, 16),
    W: WHITE, i: hex(92, 60, 34), m: hex(124, 66, 54),
    K: hex(30, 30, 34), k: hex(62, 62, 70), v: hex(14, 14, 16),
    O, o: shade(O, 0.8), l: shade(O, 1.2),
    T, t: shade(T, 0.8), F: shade(T, 1.14), P, p: shade(P, 0.8),
    M: hex(40, 40, 44), q: hex(104, 104, 112),
    G: hex(30, 30, 32), g: hex(66, 66, 72),
    D, d: shade(D, 0.78), e: shade(D, 1.16),
    R: Rb, r: shade(Rb, 0.78), X: hex(44, 36, 28),
    Y: hex(34, 32, 30), Z: hex(170, 170, 176)
  }
  return {
    id: 'gun',
    look: 'olive shirt under a desert-tan chest rig with three rifle mags, black cap, short dark beard, black fingerless gloves, charcoal pants, tan boots',
    pal,
    head: {
      top: ['HHHHHHHH', 'HHhHHHHH', 'HHHHHhHH', 'HHHHHHHH', 'HhHHHHHH', 'HHHHHHhH', 'HHHHHHHH', 'HHHHHHHH'],
      bottom: rep(8, 'BBBBSSSS'),
      front: ['HHHHHHHH', 'HSSSSSSH', 'SSSSSSSS', 'SbbSSbbS', 'SWiSSiWS', 'BsSnnSsB', 'BBBmmBBB', 'BBBBBBBB'],
      side: ['HHHHHHHH', 'HHHHHHHH', 'HHHHHHHS', 'HHHssHSS', 'HHHsnHSS', 'HHSSSBBB', 'SSSBBBBB', 'sSSBBBBB'],
      back: ['HHHHHHHH', 'HHHHHHHH', 'HHHHhHHH', 'HHHHHHHH', 'HHhHHHHH', 'HHHHHHHH', 'SSSSSSSS', 'ssssssss']
    },
    hat: { // the black cap
      top: ['KKKKKKKK', 'KKKKKKKK', 'KKKKKKKK', 'KKKkkKKK', 'KKKkkKKK', 'KKKKKKKK', 'KKKKKKKK', 'kkkkkkkk'],
      front: ['KkkkkkkK', 'KKKKKKKK', 'vvvvvvvv', '........', '........', '........', '........', '........'],
      side: ['KKKKKKKK', 'KKKKKKKK', 'KKKKKKvv', '........', '........', '........', '........', '........'],
      back: ['KKKKKKKK', 'KKK..KKK', 'KKKKKKKK', '........', '........', '........', '........', '........']
    },
    body: {
      top: rep(8, 'Olll'), bottom: rep(8, 'DDDD'),
      front: ['OOlSSlOO', 'OOOllOOO', ...rep(8, 'OOOOOOO'), 'oooooooo', 'YYYZZYYY', 'DDDDDDDD'],
      back: [...rep(8, 'OOOOOOOOO'), 'oooooooo', 'YYYYYYYY', 'DDDDDDDD'],
      side: rep(4, 'OOOOOOOOOoYD')
    },
    jacket: { // the chest rig
      top: rows(4, '.FF..FF.'),
      front: ['.FF..FF.', 'TTT..TTT', 'MMTMMTMM', 'FFTFFTFF', 'PPTPPTPP', 'PPTPPTPP', 'ppTppTpp', 'TTTTTTTT', 'TtTTTTtT', 'tttttttt', '........', '........'],
      back: ['.FF..FF.', 'TTTFFTTT', 'TTTTTTTT', 'TttttttT', 'TTTTTTTT', 'TttttttT', 'TTTTTTTT', 'TttttttT', 'TTTTTTTT', 'tttttttt', '........', '........'],
      side: ['....', 'TTTT', 'TTTT', 'TttT', 'TTTT', 'TttT', 'TTTT', 'TttT', 'TTTT', 'tttt', '....', '....']
    },
    arm: {
      top: rep(4, 'llOO'), bottom: rep(4, 'SSSS'),
      outer: puts(rep(4, 'OOOOOOOOoGGS'), [[1, 2, 'tt'], [1, 3, 'tt'], [0, 6, 'o'], [3, 6, 'o'], [1, 10, 'g']]),
      front: puts(rep(4, 'OOOOOOOOoGGS'), [[0, 0, 'l'], [1, 6, 'oo'], [2, 10, 'g']]),
      inner: puts(rep(4, 'oOOOOOOOoGGS'), [[1, 6, 'oo']]),
      back: puts(rep(4, 'OOOOOOOOoGGS'), [[0, 6, 'o'], [3, 6, 'o']])
    },
    leg: {
      top: rep(4, 'DDDD'), bottom: rep(4, 'XXXX'),
      outer: puts(rep(4, 'DDDDDDDDdRRX'), [[1, 3, 'dd'], [1, 4, 'ee'], [1, 5, 'ee'], [1, 6, 'dd'], [1, 9, 'rr']]),
      front: puts(rep(4, 'DDDDDDDDdRRX'), [[0, 5, 'd'], [3, 5, 'd'], [1, 9, 'rr']]),
      inner: puts(rep(4, 'dDDDDDDDdRRX'), []),
      back: puts(rep(4, 'DDDDDDDDdRRX'), [[0, 6, 'd'], [3, 6, 'd']])
    },
    pants: { // a tan drop-leg holster with a black pistol grip on the right thigh
      outer: ['..t.', '.MM.', '.TTT', 'tTTT', '.TTT', '..t.', ...rows(6, '....')],
      front: ['....', '....', 'T...', 'Tttt', 'T...', ...rows(7, '....')],
      inner: ['....', '....', '....', 'tttt', ...rows(8, '....')],
      back: ['....', '....', '....', 'tttt', ...rows(8, '....')]
    },
    pantsL: {}
  }
})()

// ============================================================ gear: the Gear Shop keeper (helmets and vests)
// Grey plate carrier, grey helmet with goggles on top, navy shirt, knee pads.
const gear = (() => {
  const S = hex(120, 80, 56); const N = hex(38, 50, 90); const G = hex(122, 126, 130); const V = hex(106, 110, 114)
  const C = hex(138, 120, 86)
  const pal = {
    S, s: shade(S, 0.86), n: shade(S, 0.74),
    H: hex(22, 18, 16), b: hex(20, 16, 14), W: WHITE, i: hex(56, 36, 24), m: hex(96, 56, 46),
    G, g: shade(G, 0.76), j: shade(G, 1.2), f: hex(24, 24, 26), L: hex(236, 156, 48), l: hex(255, 220, 150),
    N, a: shade(N, 0.76), A: shade(N, 1.25),
    V, v: shade(V, 0.78), w: shade(V, 1.18), k: hex(150, 154, 158), P: hex(84, 88, 92), p: shade(hex(84, 88, 92), 0.8), F: hex(98, 102, 106),
    C, c: shade(C, 0.8), e: shade(C, 1.12),
    K: hex(28, 28, 30), q: hex(66, 66, 72),
    X: hex(36, 32, 30), x: hex(18, 16, 16), Y: hex(28, 28, 30), Z: hex(150, 150, 156)
  }
  return {
    id: 'gear',
    look: 'grey plate carrier with a blank velcro panel and pouches over a navy shirt, grey helmet with amber goggles pushed up on it and a chin strap, khaki pants with black knee pads',
    pal,
    head: {
      top: rep(8, 'HHHHHHHH'), bottom: rep(8, 'SSSSSSSS'),
      front: ['HHHHHHHH', 'HSSSSSSH', 'SSSSSSSS', 'SbbSSbbS', 'SWiSSiWS', 'SSSnnSSS', 'SSSmmSSS', 'sSSSSSSs'],
      side: ['HHHHHHHH', 'HHHHHHHH', 'HHHHHHHS', 'HHHssSSS', 'HHHsnSSS', 'HHSSSSSS', 'SSSSSSSS', 'ssssssss'],
      back: [...rep(8, 'HHHHHH'), 'SSSSSSSS', 'ssssssss']
    },
    hat: { // the helmet, the goggles on it, the chin strap
      top: ['GGGGGGGG', 'GjjGGGGG', 'GjGGGGGG', 'GGGGGGGG', 'GGGggGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGjjjjGG'],
      front: ['GGjjjjGG', 'flLfflLf', 'fLLffLLf', 'gggggggg', '........', '........', '........', '........'],
      side: ['GGGGGGGG', 'ffffffff', 'GGGggGGG', 'GGGGGfgg', 'gggggf..', '.....f..', '.....f..', '.....f..'],
      back: ['GGGGGGGG', 'ffffffff', 'GGggggGG', 'GGggggGG', 'gggggggg', '........', '........', '........']
    },
    body: {
      top: rep(8, 'NNNN'), bottom: rep(8, 'CCCC'),
      front: ['NNaSSaNN', 'NNNaaNNN', ...rep(8, 'NNNNNNN'), 'aaaaaaaa', 'YYYZZYYY', 'CCCCCCCC'],
      back: [...rep(8, 'NNNNNNNNN'), 'aaaaaaaa', 'YYYYYYYY', 'CCCCCCCC'],
      side: rep(4, 'NNNNNNNNNaYC')
    },
    jacket: { // the plate carrier
      top: rows(4, '.ww..ww.'),
      front: ['.VV..VV.', 'VVV..VVV', 'VkkkkkkV', 'VkkkkkkV', 'VVVVVVVV', 'VVVVVVVV', 'FFvFFvFF', 'PPvPPvPP', 'ppvppvpp', 'vvvvvvvv', '........', '........'],
      back: ['.VV..VV.', 'VVVwwVVV', 'VVVVVVVV', 'VvvvvvvV', 'VVVVVVVV', 'VvvvvvvV', 'VVVVVVVV', 'VvvvvvvV', 'VVVVVVVV', 'vvvvvvvv', '........', '........'],
      side: ['....', 'VVVV', 'VVVV', 'VvvV', 'VVVV', 'VvvV', 'VVVV', 'VvvV', 'VVVV', 'vvvv', '....', '....']
    },
    arm: {
      top: rep(4, 'AANN'), bottom: rep(4, 'SSSS'),
      outer: puts(rep(4, 'NNNNNNNNaSSS'), [[1, 2, 'kk'], [1, 3, 'kk'], [0, 6, 'a'], [3, 6, 'a'], [0, 11, 's']]),
      front: puts(rep(4, 'NNNNNNNNaSSS'), [[0, 0, 'A'], [1, 6, 'aa'], [3, 11, 's']]),
      inner: puts(rep(4, 'aNNNNNNNaSSS'), [[1, 6, 'aa']]),
      back: puts(rep(4, 'NNNNNNNNaSSS'), [[0, 6, 'a'], [3, 6, 'a']])
    },
    leg: {
      top: rep(4, 'CCCC'), bottom: rep(4, 'xxxx'),
      outer: puts(rep(4, 'CCCCCCCCcXXx'), [[1, 2, 'e'], [1, 8, 'cc']]),
      front: puts(rep(4, 'CCCCCCCCcXXx'), [[1, 1, 'e'], [1, 9, 'xx']]),
      inner: rep(4, 'cCCCCCCCcXXx'),
      back: puts(rep(4, 'CCCCCCCCcXXx'), [[0, 7, 'c'], [3, 7, 'c']])
    },
    pants: { // knee pads
      front: [...rows(5, '....'), 'KKKK', 'KqqK', 'KKKK', ...rows(4, '....')],
      outer: [...rows(5, '....'), '..KK', 'KKKK', '..KK', ...rows(4, '....')],
      inner: [...rows(5, '....'), 'KK..', 'KKKK', 'KK..', ...rows(4, '....')],
      back: [...rows(6, '....'), 'KKKK', ...rows(5, '....')]
    }
  }
})()

// ============================================================ bag: the Bag Shop keeper
// A young woman: canvas messenger bag strap across the chest, mustard sweater, brown hair in a bun, jeans.
const bag = (() => {
  const S = hex(226, 178, 142); const H = hex(104, 64, 36); const Y = hex(214, 160, 48); const J = hex(66, 96, 150)
  const pal = {
    S, s: shade(S, 0.88), n: shade(S, 0.78),
    H, h: shade(H, 1.32), u: shade(H, 1.6), d: shade(H, 0.66), b: hex(80, 46, 26),
    W: WHITE, i: hex(66, 124, 72), L: hex(190, 90, 92), c: hex(236, 150, 134), g: hex(236, 196, 72),
    Z: hex(222, 170, 56),
    Y, y: shade(Y, 0.82), U: shade(Y, 1.14), r: shade(Y, 0.68),
    Q: hex(104, 90, 60), q: hex(128, 112, 76),
    F: hex(158, 140, 96), C: hex(138, 120, 80), E: hex(112, 96, 64), k: hex(206, 166, 76),
    J, j: shade(J, 0.78), e: shade(J, 1.16),
    w: hex(238, 238, 234), o: hex(172, 172, 170), t: hex(196, 196, 196)
  }
  return {
    id: 'bag',
    look: 'young woman, brown hair in a high bun with a red scrunchie, mustard sweater, canvas messenger bag strap across the chest to a satchel on her left hip, jeans, white sneakers',
    pal,
    head: {
      top: ['HHHHHHHH', 'HhHHHHhH', 'HHHhhHHH', 'HHHHHHHH', 'HHhHHhHH', 'HHHHHHHH', 'HhHHHHhH', 'HHHHHHHH'],
      bottom: rep(8, 'SSSSSSSS'),
      front: ['HHHHHHHH', 'HHhHHHHH', 'HSSSSSSH', 'HbbSSbbH', 'dWiSSiWd', 'ScSnnScS', 'SSSLLSSS', 'sSSSSSSs'],
      side: ['HHHHHHHH', 'HHHHHHHH', 'HHHHHHHH', 'HHHSSSSH', 'HHHnSSSd', 'HHHngSSS', 'dHSSSSSS', 'sSSSSSSS'],
      back: ['HHHHHHHH', 'HhHHHHhH', 'HHhHHhHH', 'HHHhhHHH', 'HHHHHHHH', 'HHHHHHHH', 'SHHHHHHS', 'ssssssss']
    },
    hat: { // the bun (top and back), a loose strand
      top: ['..dddd..', '.dhhhhd.', '.dhuhhd.', '..dddd..', '........', '........', '........', '........'],
      front: ['........', '.h......', '........', '........', '........', '........', '........', '........'],
      back: ['..dddd..', '.dhuhhd.', '.dhhhhd.', '..dddd..', '........', '........', '........', '........']
    },
    body: {
      top: rep(8, 'YYYY'), bottom: rep(8, 'JJJJ'),
      front: ['YrrSSrrY', 'YYrrrrYY', 'YYYYYYYY', 'YYYYYYYY', 'YYYYYYYY', 'YyYYYYyY', 'YYYYYYYY', 'yYYYYYYy', 'yYYYYYYy', 'ryryryry', 'JJJJJJJJ', 'JJJJJJJJ'],
      back: ['YrrrrrrY', 'YYYYYYYY', 'YYYYYYYY', 'YYYYYYYY', 'YYYYYYYY', 'YYYYYYYY', 'YYYYYYYY', 'yYYYYYYy', 'yYYYYYYy', 'ryryryry', 'JJJJJJJJ', 'JJJJJJJJ'],
      side: rep(4, 'YYYYYYYyyrJJ').map((r, i) => i === 9 ? 'ryry' : r)
    },
    jacket: { // the strap (right shoulder to left hip) and the satchel on the left hip
      top: rows(4, 'QQ......'),
      front: ['QQ......', 'qQQ.....', '.qQQ....', '..qQQ...', '...qQQ..', '....qQQ.', '.....qQQ', '....FFFF', '....FFFF', '....FFkF', '....CCCC', '....EEEE'],
      back: ['......QQ', '.....QQ.', '....QQ..', '...QQ...', '..QQ....', '.QQ.....', 'QQ......', 'FF......', 'FF......', 'CC......', 'CC......', 'EE......'],
      sideL: ['....', '....', '....', '....', '....', '....', '....', 'FFFF', 'FFFF', 'CCCC', 'CCCC', 'EEEE']
    },
    arm: {
      top: rep(4, 'UUYY'), bottom: rep(4, 'SSSS'),
      outer: puts(rep(4, 'YYYYYYYYrSSS'), [[0, 5, 'y'], [3, 5, 'y'], [1, 8, 'y'], [3, 8, 'y'], [0, 11, 's']]),
      front: puts(rep(4, 'YYYYYYYYrSSS'), [[1, 5, 'yy'], [1, 8, 'y'], [3, 8, 'y'], [3, 11, 's']]),
      inner: puts(rep(4, 'yYYYYYYYrSSS'), [[1, 5, 'yy'], [1, 8, 'y'], [3, 8, 'y']]),
      back: puts(rep(4, 'YYYYYYYYrSSS'), [[0, 5, 'y'], [3, 5, 'y'], [1, 8, 'y'], [3, 8, 'y']])
    },
    leg: {
      top: rep(4, 'JJJJ'), bottom: rep(4, 'oooo'),
      outer: puts(rep(4, 'JJJJJJJJJewo'), [[3, 0, 'j'], [3, 1, 'j'], [3, 2, 'j'], [1, 5, 'e'], [2, 6, 'e']]),
      front: puts(rep(4, 'JJJJJJJJJewo'), [[1, 5, 'ee'], [1, 6, 'e'], [0, 2, 'j'], [1, 10, 'tt']]),
      inner: puts(rep(4, 'jJJJJJJJJewo'), [[2, 3, 'j'], [2, 4, 'j'], [2, 5, 'j'], [2, 6, 'j'], [2, 7, 'j']]),
      back: puts(rep(4, 'JJJJJJJJJewo'), [[0, 0, 'j'], [3, 0, 'j'], [1, 6, 'jj']])
    }
  }
})()

// ============================================================ tools: the Heist Tools seller
// Tool belt with a hammer and a drill, safety goggles pushed up on the forehead, red-and-black flannel, messy red hair.
const tools = (() => {
  const S = hex(244, 210, 186); const Rh = hex(196, 88, 38); const T = hex(152, 98, 54); const D = hex(62, 66, 82)
  const RED = hex(180, 38, 36); const DRED = hex(120, 26, 26); const BLK = hex(34, 26, 26)
  // Buffalo check: 2-pixel squares, black where the stripes cross.
  const plaid = (x, y) => { const bx = (x >> 1) & 1; const by = (y >> 1) & 1; return bx && by ? BLK : bx || by ? DRED : RED }
  const pal = {
    S, s: shade(S, 0.88), n: shade(S, 0.8), f: hex(214, 146, 106),
    R: Rh, r: shade(Rh, 0.76), h: shade(Rh, 1.14), b: hex(158, 66, 28),
    W: WHITE, i: hex(60, 112, 156), m: hex(150, 72, 64),
    G: hex(60, 62, 68), L: hex(176, 218, 230), l: hex(240, 252, 255), k: hex(30, 30, 32),
    P: plaid, c: DRED, B: hex(226, 214, 190),
    T, t: shade(T, 0.76), u: shade(T, 1.18), Z: hex(210, 172, 80),
    I: hex(172, 176, 182), j: hex(120, 124, 130), O: hex(184, 134, 80), o: hex(132, 92, 54),
    Y: hex(250, 200, 40), y: hex(214, 154, 18), K: hex(40, 40, 44), g: hex(150, 154, 160),
    D, d: shade(D, 0.8), e: shade(D, 1.16),
    X: hex(96, 62, 38), x: hex(42, 30, 20)
  }
  const shirt = (w, h) => Array.from({ length: h }, () => 'P'.repeat(w))
  return {
    id: 'tools',
    look: 'messy red hair, pale and freckled, clear safety goggles pushed up on the forehead, red-and-black buffalo-check flannel with rolled sleeves, leather tool belt with a hammer on the right hip and a yellow drill on the left, charcoal jeans, brown boots',
    pal,
    head: {
      top: ['RRRRRRRR', 'RRrRRRRR', 'RRRRRrRR', 'RhRRRRRR', 'RRRRhRRR', 'RRrRRRRR', 'RRRRRRrR', 'RRRRRRRR'],
      bottom: rep(8, 'SSSSSSSS'),
      front: ['RRRRRRRR', 'RRSSSSRR', 'RSSSSSSR', 'SbbSSbbS', 'SWiSSiWS', 'SfSnnSfS', 'SSmmmmSS', 'sSSSSSSs'],
      side: ['RRRRRRRR', 'RRRRRRRR', 'RRRRRRRS', 'RRRssSSS', 'RRRsnSSS', 'RRSSSSSS', 'RSSSSSSS', 'sSSSSSSS'],
      back: ['RRRRRRRR', 'RRhRRRRR', 'RRRRRhRR', 'RRRRRRRR', 'RhRRRRRR', 'RRRRRRRR', 'RRrRRrRR', 'ssssssss']
    },
    hat: { // messy tufts and the goggles
      top: ['RR.RRr.R', 'Rr.RRR.R', '.RRr.RRr', 'RRR.RhR.', 'r.RRr.RR', 'RR.RRR.R', '.RhR.RRr', 'RR.RR.RR'],
      front: ['RRhRRRhR', 'RGLlLLGR', 'RGLLLLGR', 'R......R', '........', '........', '........', '........'],
      side: ['RR.RRhRR', 'kkkkkkkR', 'RR.RRRRR', 'R.RR..RR', 'r.R.....', '........', '........', '........'],
      back: ['RRRRhRRR', 'kkkkkkkk', 'RRrRRRRR', 'R.RR.RRR', '.R..R..R', '........', '........', '........']
    },
    body: {
      top: shirt(8, 4), bottom: rep(8, 'DDDD'),
      front: ['PPcSScPP', 'PPPccPPP', 'PPPPBPPP', 'PPPPcPPP', 'PPPPcPPP', 'PPPPBPPP', 'PPPPcPPP', 'PPPPcPPP', 'PPPPBPPP', 'PPPPcPPP', 'DDDDDDDD', 'DDDDDDDD'],
      back: [...shirt(8, 10), 'DDDDDDDD', 'DDDDDDDD'],
      side: [...shirt(4, 10), 'DDDD', 'DDDD']
    },
    jacket: { // the tool belt: hammer on the right hip, pouch, drill on the left hip
      front: [...rows(9, '........'), 'TTTZZTTT', 'IItuu.YY', 'jOuuu.gy'],
      back: [...rows(9, '........'), 'TTTTTTTT', '..tuut..', '..tuut..'],
      side: [...rows(9, '....'), 'TTTT', '..II', '...O'],
      sideL: [...rows(9, '....'), 'TTTT', '.YYY', '.yyK']
    },
    arm: { // rolled-up sleeves, freckled forearms
      top: shirt(4, 4), bottom: rep(4, 'SSSS'),
      outer: puts([...shirt(4, 6), 'cccc', ...rep(4, 'SSSSS')], [[1, 8, 'f'], [2, 10, 'f'], [0, 11, 's']]),
      front: puts([...shirt(4, 6), 'cccc', ...rep(4, 'SSSSS')], [[2, 7, 'f'], [3, 11, 's']]),
      inner: [...shirt(4, 6), 'cccc', 'ssss', ...rep(4, 'SSSS')],
      back: puts([...shirt(4, 6), 'cccc', ...rep(4, 'SSSSS')], [[1, 9, 'f']])
    },
    leg: { // the hammer's handle hangs down the right leg
      top: rep(4, 'DDDD'), bottom: rep(4, 'xxxx'),
      outer: puts(rep(4, 'DDDDDDDDdXXx'), [[1, 5, 'dd']]),
      front: puts(rep(4, 'DDDDDDDDdXXx'), [[1, 5, 'dd'], [1, 9, 'xx'], [3, 2, 'e'], [3, 3, 'e']]),
      inner: rep(4, 'dDDDDDDDdXXx'),
      back: puts(rep(4, 'DDDDDDDDdXXx'), [[1, 6, 'dd']])
    },
    pants: {
      front: ['O...', 'O...', 'O...', 'o...', ...rows(8, '....')],
      outer: ['...O', '...O', '...O', '...o', ...rows(8, '....')]
    },
    pantsL: { // the drill's grip and battery down the left leg
      front: ['K...', 'K...', 'Y...', ...rows(9, '....')],
      outer: ['..KK', '..KK', '..YY', ...rows(9, '....')]
    }
  }
})()

// ============================================================ cars: the Car Dealer
// Sharp light-grey suit, teal tie, slicked-back hair, big smile, polished shoes.
const cars = (() => {
  const S = hex(232, 190, 150); const G = hex(184, 188, 194); const T = hex(22, 152, 150)
  const pal = {
    S, s: shade(S, 0.88), n: shade(S, 0.8),
    H: hex(22, 20, 24), h: hex(70, 70, 84), b: hex(26, 22, 22),
    W: WHITE, i: hex(64, 42, 26), d: hex(116, 50, 46), t: hex(250, 246, 238),
    G, g: shade(G, 0.78), j: shade(G, 1.14), w: hex(246, 246, 242),
    L: hex(196, 116, 104), T, U: shade(T, 0.72), q: shade(T, 1.3), Y: hex(222, 186, 70), B: hex(96, 100, 108),
    K: hex(22, 20, 22), o: hex(120, 120, 132), x: hex(8, 8, 10)
  }
  return {
    id: 'cars',
    look: 'slicked-back glossy black hair, wide toothy smile, light-grey suit with a teal tie and teal pocket square, white shirt cuffs, gold watch, black polished shoes',
    pal,
    head: {
      top: rep(8, 'HHHHHHHH'),
      bottom: rep(8, 'SSSSSSSS'),
      front: ['HHHHHHHH', 'HSSSSSSH', 'SbbSSbbS', 'SSSSSSSS', 'SWiSSiWS', 'SSSnnSSS', 'SdttttdS', 'sSLLLLSs'],
      side: ['HHHHHHHH', 'HhhhhHHH', 'HHHHHHHS', 'HHHssSSS', 'HHHsnSSS', 'HHSSSSSS', 'SSSSSSSS', 'ssssssss'],
      back: ['HHHHHHHH', 'HHHhHHHH', 'HHHhHHHH', 'HHHHhHHH', 'HHHHhHHH', 'HHHHHHHH', 'SSSSSSSS', 'ssssssss']
    },
    hat: { // the gloss of the slicked hair
      top: ['.....h..', '.....h..', '..h..h..', '..h..h..', '..h..h..', '..h..h..', '..h.....', '..h.....'],
      front: ['..hh....', '........', '........', '........', '........', '........', '........', '........'],
      side: ['........', '.hhhh...', '........', '........', '........', '........', '........', '........']
    },
    body: {
      top: rep(8, 'jGGG'), bottom: rep(8, 'GGGG'),
      front: ['jGwUUwGj', 'GgwTTwgG', 'GGgTTgGG', 'GGgTTgqG', 'GGGUUGGG', 'GGGgBGGG', 'GGGgGGGG', 'GGGgGGGG', 'ggGgGGgg', 'GGGggGGG', 'GGgGGgGG', 'GGGGGGGG'],
      back: ['jggggggj', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'gGGGGGGg', 'GGGgGGGG', 'GGGgGGGG', 'GGGGGGGG'],
      side: puts(rep(4, 'GGGGGGGGGGGG'), [[0, 0, 'jjjj'], [2, 8, 'gg']])
    },
    arm: {
      top: rep(4, 'jjGG'), bottom: rep(4, 'SSSS'),
      outer: puts(rep(4, 'GGGGGGGGwSSS'), [[0, 0, 'jj'], [0, 5, 'g'], [3, 5, 'g'], [2, 8, 'T'], [0, 11, 's']]),
      front: puts(rep(4, 'GGGGGGGGwSSS'), [[0, 0, 'j'], [1, 5, 'gg'], [3, 11, 's']]),
      inner: puts(rep(4, 'gGGGGGGGwSSS'), [[1, 5, 'gg']]),
      back: puts(rep(4, 'GGGGGGGGwSSS'), [[0, 5, 'g'], [3, 5, 'g']])
    },
    armL: { // the gold watch on the left wrist
      top: rep(4, 'jjGG'), bottom: rep(4, 'SSSS'),
      outer: puts(rep(4, 'GGGGGGGGwSSS'), [[0, 0, 'jj'], [0, 5, 'g'], [3, 5, 'g'], [0, 9, 'YYYY'], [0, 11, 's']]),
      front: puts(rep(4, 'GGGGGGGGwSSS'), [[0, 0, 'j'], [1, 5, 'gg'], [0, 9, 'YY'], [3, 11, 's']]),
      inner: puts(rep(4, 'gGGGGGGGwSSS'), [[1, 5, 'gg'], [0, 9, 'YYYY']]),
      back: puts(rep(4, 'GGGGGGGGwSSS'), [[0, 5, 'g'], [3, 5, 'g'], [2, 9, 'YY']])
    },
    leg: { // pressed trousers (a crease) and polished shoes
      top: rep(4, 'GGGG'), bottom: rep(4, 'xxxx'),
      outer: puts(rep(4, 'GGGGGGGGGgKK'), [[0, 11, 'xxxx'], [2, 10, 'o']]),
      front: puts(rep(4, 'GGGGGGGGGgKK'), [[1, 0, 'j'], [1, 1, 'j'], [1, 2, 'j'], [1, 3, 'j'], [1, 4, 'j'], [1, 5, 'j'], [1, 6, 'j'], [1, 7, 'j'], [1, 10, 'o'], [0, 11, 'KKKK']]),
      inner: puts(rep(4, 'gGGGGGGGGgKK'), [[0, 11, 'xxxx']]),
      back: puts(rep(4, 'GGGGGGGGGgKK'), [[0, 11, 'xxxx'], [1, 6, 'gg']])
    }
  }
})()

// ============================================================ garage: the City Garage attendant
// Navy coveralls with a light-blue name patch, navy cap with a small white badge, a key ring on the belt, work gloves.
const garage = (() => {
  const S = hex(96, 62, 44); const N = hex(42, 58, 104); const Kc = hex(34, 48, 92); const L = hex(196, 164, 108)
  const pal = {
    S, s: shade(S, 0.84), n: shade(S, 0.72),
    H: hex(18, 14, 12), b: hex(16, 12, 10), W: WHITE, i: hex(46, 30, 20), m: hex(132, 76, 64),
    K: Kc, k: shade(Kc, 1.35), v: shade(Kc, 0.62), w: hex(240, 240, 240),
    N, a: shade(N, 0.76), A: shade(N, 1.24), z: hex(132, 140, 156),
    Q: hex(150, 198, 234), q: hex(70, 110, 160),
    Y: hex(26, 26, 28), Z: hex(190, 194, 202), I: hex(206, 210, 216), y: hex(218, 184, 80),
    L, l: shade(L, 0.78), u: shade(L, 1.12),
    X: hex(30, 28, 28), x: hex(14, 12, 12)
  }
  return {
    id: 'garage',
    look: 'navy coveralls with a zipper, a light-blue name patch and a chest pocket, black belt with a silver key ring and keys on the right hip, navy cap with a small white badge, tan work gloves, black boots',
    pal,
    head: {
      top: rep(8, 'HHHHHHHH'), bottom: rep(8, 'SSSSSSSS'),
      front: ['HHHHHHHH', 'HSSSSSSH', 'SSSSSSSS', 'SbbSSbbS', 'SWiSSiWS', 'SSSnnSSS', 'SmSSSSmS', 'sSmmmmSs'],
      side: ['HHHHHHHH', 'HHHHHHHH', 'HHHHHHHS', 'HHHssSSS', 'HHHsnSSS', 'HHSSSSSS', 'SSSSSSSS', 'ssssssss'],
      back: [...rep(8, 'HHHHH'), 'SSSSSSSS', 'SSSSSSSS', 'ssssssss']
    },
    hat: { // the navy cap and its badge
      top: ['KKKKKKKK', 'KKKKKKKK', 'KKKKKKKK', 'KKKkkKKK', 'KKKkkKKK', 'KKKKKKKK', 'KKKKKKKK', 'kkkkkkkk'],
      front: ['KkkkkkkK', 'KKKwwKKK', 'vvvvvvvv', '........', '........', '........', '........', '........'],
      side: ['KKKKKKKK', 'KKKKKKKK', 'KKKKKKvv', '........', '........', '........', '........', '........'],
      back: ['KKKKKKKK', 'KKK..KKK', 'KKKKKKKK', '........', '........', '........', '........', '........']
    },
    body: {
      top: rep(8, 'ANNN'), bottom: rep(8, 'NNNN'),
      front: ['NNaSSaNN', 'NNNazNNN', 'NaaNzQQQ', 'NNNNzqqQ', 'NaaNzNNN', 'NNNNzNNN', 'NNNNzNNN', 'NNNNzNNN', 'YYYZZYYY', 'NIaNzNNN', 'yIyNzNNN', 'NNNNzNNN'],
      back: ['NaaaaaaN', 'NNNNNNNN', 'aaaaaaaa', 'NNNNNNNN', 'NNNNNNNN', 'NNNNNNNN', 'NNNNNNNN', 'NNNNNNNN', 'YYYYYYYY', 'NNNNNNNN', 'NNNNNNNN', 'NNNaaNNN'],
      side: puts(rep(4, 'NNNNNNNNYNNN'), [[0, 5, 'aa']]),
      sideL: rep(4, 'NNNNNNNNYNNN')
    },
    arm: {
      top: rep(4, 'AANN'), bottom: rep(4, 'LLLL'),
      outer: puts(rep(4, 'NNNNNNNNuLLL'), [[1, 1, 'aa'], [0, 5, 'a'], [3, 5, 'a'], [1, 10, 'l'], [0, 11, 'lLlL']]),
      front: puts(rep(4, 'NNNNNNNNuLLL'), [[0, 0, 'A'], [1, 5, 'aa'], [0, 11, 'LlLl']]),
      inner: puts(rep(4, 'aNNNNNNNuLLL'), [[1, 5, 'aa'], [0, 10, 'llll']]),
      back: puts(rep(4, 'NNNNNNNNuLLL'), [[0, 5, 'a'], [3, 5, 'a'], [0, 11, 'lLlL']])
    },
    leg: {
      top: rep(4, 'NNNN'), bottom: rep(4, 'xxxx'),
      outer: puts(rep(4, 'NNNNNNNNNaXx'), [[0, 3, 'aaaa'], [1, 10, 'X']]),
      front: puts(rep(4, 'NNNNNNNNNaXx'), [[0, 6, 'a'], [3, 6, 'a'], [1, 10, 'XX']]),
      inner: rep(4, 'aNNNNNNNNaXx'),
      back: puts(rep(4, 'NNNNNNNNNaXx'), [[1, 7, 'aa']])
    }
  }
})()

// ---------- Write everything ----------
const cast = [gun, gear, bag, tools, cars, garage]
for (const dir of OUTS) fs.mkdirSync(dir, { recursive: true })
for (const ch of cast) {
  const c = render(ch)
  const png = c.png()
  for (const dir of OUTS) fs.writeFileSync(path.join(dir, `${ch.id}.png`), png)
  fs.writeFileSync(path.join(__dirname, `preview-${ch.id}.png`), preview(c).png())
  console.log(`${ch.id}: ${ch.look}`)
}
console.log(`wrote ${cast.length} skins to server\\plugins\\Citizens\\skins and tools\\skins (previews: tools\\skins\\preview-<id>.png)`)
