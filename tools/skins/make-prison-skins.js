// Draws the prison's NPC skins (owner, 2026-10-19: "give everyone skins"), in the standard 64x64 player skin
// layout (classic 4-pixel arms), in the style of tools\skins\make-givers-skins.js:
//   lefty     - Lefty (Hall B), the old-timer who knows the ropes: bald with a white fringe, a white walrus
//               mustache, half-moon reading glasses, a pencil behind the ear, a faded orange jumpsuit with the
//               sleeves rolled, a faded anchor tattoo, his watch on the right wrist
//   rusty     - Rusty (B1), the scruffy long-timer: shaggy rust-red hair and a scraggly beard going grey,
//               freckles, tired eyes, a grimy jumpsuit open over a yellowed undershirt, one sleeve torn,
//               a patched knee, a taped shoe
//   tank      - Tank (the Yard), the big guy: buzz cut, a thick black beard, a scar through his brow, the
//               jumpsuit's top tied round his waist over a white tank top, tattooed arms, taped wrists, boots
//   whisper   - Whisper (the Telephone Room), the slick fixer: slicked-back black hair with a side part,
//               gold aviators, a soul patch and a smirk, a pressed jumpsuit with a popped collar, a gold
//               chain, cigarettes in the pocket, a gold watch and ring, black loafers
//   jailguard - the prison guards (jailcops.sk) and the course's sleeping guard (jailcourse.sk): a
//               corrections officer in a steel-grey short-sleeve shirt, forest-green trousers, epaulettes and
//               ball cap (the city cops wear navy and a peaked cap), a star badge, a duty belt with keys and
//               a radio, black boots
//   jailshop  - the Prison Gun Shop's keeper (shop.sk, a gun keeper inside the walls): an inmate in a grey
//               canvas apron over the jumpsuit, a green eyeshade, sleeve garters, a screwdriver in the pocket
// Each skin goes to server\plugins\Citizens\skins\<id>.png and tools\skins\<id>.png, plus
// tools\skins\preview-<id>.png (front, back, both sides and the head's top at 8x, and a small 2x front), and
// tools\skins\preview-prison.png (all six from the front, side by side).
// Then: tools\node\node.exe tools\sign-skins.js lefty rusty tank whisper jailguard jailshop
// Usage: tools\node\node.exe tools\skins\make-prison-skins.js
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
    limb (part, g, over = false) { for (const f of Object.keys(g)) S.art(part, f, g[f], over) },
    // Copies the base pixels drawn with one of these letters onto the overlay (hair volume, a jacket).
    lift (part, faces, letters) {
      for (const f of faces) {
        const [bx, by, w, h] = faceRect(part, f, false)
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const ch = chars.get((by + y) * 64 + bx + x)
            if (ch && letters.includes(ch)) S.art(part, f, [ch], true, x, y)
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
const FRONT = [['head', 'front', 4, 0], ['rarm', 'front', 0, 8], ['body', 'front', 4, 8], ['larm', 'front', 12, 8], ['rleg', 'front', 4, 20], ['lleg', 'front', 8, 20]]
const PANELS = [
  { w: 16, items: FRONT },
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
  for (const [part, face, dx, dy] of FRONT) blit(p, c, part, face, x + dx * 2, gap + dy * 2, 2)
  return p
}
// All of them from the front, side by side (6x).
const lineup = list => {
  const s = 6
  const gap = 12
  const p = canvas(gap + list.length * (16 * s + gap), 32 * s + 2 * gap)
  p.fill(0, 0, p.w - 1, p.h - 1, BG)
  list.forEach((c, i) => { for (const [part, face, dx, dy] of FRONT) blit(p, c, part, face, gap + i * (16 * s + gap) + dx * s, gap + dy * s, s) })
  return p
}

// ---------- Shared colors ----------
const WHITE = [244, 244, 248, 255]
const ORANGE = [232, 112, 30, 255]
// The jumpsuit's colors: O base, o seams and shadow, q highlight (rolled cuffs, creases).
const suit = col => ({ O: col, o: shade(col, 0.76), q: shade(col, 1.16) })
// The inmate number patch on the chest (white, black figures) and the stencil on the back.
const PATCH = { W: [240, 238, 232, 255], k: [36, 34, 34, 255] }

// ---------- Lefty: the old-timer who knows the ropes ----------
const lefty = () => {
  const SKIN = [222, 178, 146, 255]
  const S = newSkin({
    S: SKIN, s: shade(SKIN, 0.88), t: shade(SKIN, 0.76), a: shade(SKIN, 0.82),
    H: [210, 208, 204, 255], h: [168, 166, 164, 255], w: [240, 240, 236, 255], M: [226, 224, 220, 255],
    E: WHITE, I: [86, 112, 142, 255], m: [140, 92, 80, 255],
    F: [70, 54, 40, 255], l: [198, 216, 228, 255], Y: [236, 196, 60, 255], p: [226, 128, 140, 255], g: [70, 70, 74, 255],
    ...suit([214, 122, 62, 255]), ...PATCH,
    U: [226, 222, 212, 255], b: [74, 108, 124, 255], R: [92, 62, 42, 255], G: [214, 186, 92, 255],
    n: [170, 168, 162, 255], N: [128, 126, 122, 255], X: [46, 42, 40, 255]
  })
  // Head: bald on top (an age spot or two), a white fringe round the back, white brows, the walrus mustache.
  S.art('head', 'top', [ // back (row 0) -> front (row 7)
    'HHHHHHHH',
    'HSSSSSSH',
    'HSSaSSSH',
    'SSSSSSSS',
    'SSSSSaSS',
    'SSSSSSSS',
    'SSSSSSSS',
    'SSSSSSSS'
  ])
  S.art('head', 'bottom', rep([8, 'ssssssss']))
  S.art('head', 'front', [
    'SSSSSSSS',
    'SSssssSS',
    'HSSSSSSH',
    'HwwSSwwH',
    'HEISSIEH',
    'SSSssSSS',
    'SMMMMMMS',
    'tSsmmsSt'
  ])
  const side = [ // back -> front
    'SSSSSSSS',
    'SSSSSSSS',
    'HHHHHSSS',
    'HHHHHHSS',
    'HHHHsSSS',
    'hHHHsSSS',
    'HHHSSSSS',
    'tSSSSSSt'
  ]
  S.art('head', 'right', side)
  S.art('head', 'left', flip(side))
  S.art('head', 'back', [
    'SSSSSSSS',
    'SSSSSSSS',
    'HHHHHHHH',
    'HhHHHHhH',
    'HHHHHHHH',
    'HHhHHhHH',
    'HHHHHHHH',
    'tttttttt'
  ])
  S.lift('head', ['right', 'left', 'back'], 'Hh')
  S.lift('head', ['front'], 'M')
  // Half-moon reading glasses low on the nose (he looks over them), the arms back to the ears; the pencil.
  S.art('head', 'front', ['FllFFllF'], true, 0, 5)
  S.art('head', 'right', ['....FFFF'], true, 0, 5)
  S.art('head', 'left', ['FFFF....'], true, 0, 5)
  S.art('head', 'right', ['..pYYYg.'], true, 0, 3)

  // Body: the faded jumpsuit, the undershirt at the collar, the number patch, a pocket flap, the waist seam.
  S.art('body', 'top', rep([4, 'OOOOOOOO']))
  S.art('body', 'bottom', rep([4, 'OOOOOOOO']))
  S.art('body', 'front', [
    'OqoUUoqO',
    'OOOooOOO',
    'OWWWoooO',
    'OWkkoOOO',
    'OOOOoOOO',
    'OOOOoOOO',
    'OOOOoOOO',
    'OOOOoOOO',
    'oooooooo',
    'OOOOoOOO',
    'OOOOOOOO',
    'OOOooOOO'
  ])
  const bside = rep([8, 'OOOO'], [1, 'oooo'], [3, 'OOOO'])
  S.art('body', 'right', bside)
  S.art('body', 'left', bside)
  S.art('body', 'back', [
    'OOOOOOOO',
    'OOOOOOOO',
    'OkkOkkkO',
    'OkOkOkOO',
    'OOOOOOOO',
    'OOOoOOOO',
    'OOOOOOOO',
    'OOOOOOOO',
    'oooooooo',
    'OOOOOOOO',
    'OOOOOOOO',
    'OOOooOOO'
  ])

  // Arms: sleeves rolled to the elbow, bare forearms; the anchor tattoo and the watch on the right.
  const arm = {
    top: rep([4, 'OOOO']),
    bottom: rep([4, 'ssss']),
    right: rep([5, 'OOOO'], [1, 'qqqq'], [5, 'SSSS'], [1, 'ssss']),
    front: rep([5, 'OOOO'], [1, 'qqqq'], [5, 'SSSS'], [1, 'ssss']),
    left: rep([5, 'OOOO'], [1, 'qqqq'], [5, 'SSSS'], [1, 'ssss']),
    back: rep([5, 'OOOO'], [1, 'qqqq'], [5, 'SSSS'], [1, 'ssss'])
  }
  S.limb('rarm', arm)
  S.limb('larm', mirrorLimb(arm))
  S.art('rarm', 'front', ['.b..', 'bbb.', '.b..'], false, 0, 6)
  for (const f of ['right', 'left', 'back']) S.art('rarm', f, ['RRRR'], false, 0, 9)
  S.art('rarm', 'front', ['RGRR'], false, 0, 9)
  S.lift('rarm', ['right', 'front', 'left', 'back'], 'q')
  S.lift('larm', ['right', 'front', 'left', 'back'], 'q')

  // Legs: the jumpsuit to the ankle, worn grey slip-ons.
  const leg = {
    top: rep([4, 'OOOO']),
    bottom: rep([4, 'XXXX']),
    right: rep([9, 'OOOO'], [1, 'oooo'], [1, 'nnnn'], [1, 'XXXX']),
    front: rep([4, 'OOOO'], [1, 'OoOO'], [4, 'OOOO'], [1, 'oooo'], [1, 'nNnn'], [1, 'XXXX']),
    left: rep([9, 'OOOO'], [1, 'oooo'], [1, 'nnnn'], [1, 'XXXX']),
    back: rep([9, 'OOOO'], [1, 'oooo'], [1, 'NNNN'], [1, 'XXXX'])
  }
  S.limb('rleg', leg)
  S.limb('lleg', mirrorLimb(leg))
  return S.c
}

// ---------- Rusty: the scruffy long-timer ----------
const rusty = () => {
  const SKIN = [228, 182, 148, 255]
  const S = newSkin({
    S: SKIN, s: shade(SKIN, 0.88), t: shade(SKIN, 0.76), f: [198, 130, 96, 255], d: [190, 138, 116, 255],
    H: [172, 82, 40, 255], r: [124, 56, 28, 255], y: [168, 160, 152, 255],
    Z: [190, 98, 50, 255], z: [134, 64, 32, 255],
    E: [232, 226, 214, 255], I: [110, 150, 170, 255], m: [120, 70, 60, 255],
    ...suit([224, 108, 34, 255]), ...PATCH, W: [222, 214, 194, 255],
    g: [150, 104, 66, 255], G: [116, 80, 50, 255], U: [210, 198, 154, 255], x: [168, 128, 102, 255],
    P: [136, 134, 128, 255], p: [74, 72, 68, 255], N: [88, 86, 84, 255], n: [118, 116, 112, 255], T: [188, 188, 184, 255],
    X: [36, 34, 32, 255]
  })
  // Head: shaggy rust hair everywhere with a grey streak, a strand over the forehead, freckles, bags under
  // the eyes, a scraggly beard.
  S.art('head', 'top', [
    'HHrHHHrH',
    'HHHHyHHH',
    'rHHHyHHr',
    'HHrHHHHH',
    'HHHHHrHH',
    'HrHHHHHH',
    'HHHHrHHH',
    'HHrHHHHr'
  ])
  S.art('head', 'bottom', rep([3, 'ZZZZZZZZ'], [5, 'ssssssss']))
  S.art('head', 'front', [
    'HHHHrHHH',
    'HrHHHHrH',
    'HHSSrSHH',
    'HrrSSrrH',
    'HEISSIEH',
    'ZdfssfdZ',
    'ZZZmmZZZ',
    'ZzZZZZzZ'
  ])
  const side = [ // back -> front: the hair down over the ears to the jaw, the beard along it
    'HHHHHHHH',
    'HrHHrHHH',
    'HHrHHHHH',
    'HHHHHHHH',
    'HrHHHHSS',
    'HHrHZZZZ',
    'HHHZZZZZ',
    'rHHZzZZZ'
  ]
  S.art('head', 'right', side)
  S.art('head', 'left', flip(side))
  S.art('head', 'back', [
    'HHrHHHrH',
    'HHHHyHHH',
    'HrHHyHrH',
    'HHHHHHHH',
    'HrHHHHrH',
    'HHHrHHHH',
    'HrHHHrHH',
    'rHHrHHrH'
  ])
  S.lift('head', FACES, 'HryZz')

  // Body: the jumpsuit open over a yellowed undershirt and chest hair, grime stains, a grubby patch.
  S.art('body', 'top', rep([4, 'OOOOOOOO']))
  S.art('body', 'bottom', rep([4, 'OOOOOOOO']))
  S.art('body', 'front', [
    'OoUHHUoO',
    'OOoUUoOO',
    'OWWWoOgO',
    'OWkkoOOO',
    'OgOOoOOO',
    'OOOOoOgO',
    'OOgGoOOO',
    'OOOOoOOO',
    'oooooooo',
    'OOOgOOOO',
    'OOOOOGOO',
    'OOOooOOO'
  ])
  S.art('body', 'right', rep([4, 'OOOO'], [1, 'OgOO'], [3, 'OOOO'], [1, 'oooo'], [3, 'OOOO']))
  S.art('body', 'left', rep([6, 'OOOO'], [1, 'OOgO'], [1, 'OOOO'], [1, 'oooo'], [3, 'OOOO']))
  S.art('body', 'back', [
    'OOOOOOOO',
    'OOOOOOOO',
    'OkkOkkkO',
    'OkOkOkOO',
    'OOOOOgOO',
    'OgOOOOOO',
    'OOOOOOOO',
    'OOOGOOOO',
    'oooooooo',
    'OOOOOOgO',
    'OOOOOOOO',
    'OOOooOOO'
  ])

  // Arms: the right sleeve shoved up (freckled forearm), the left one down, torn and frayed; grubby hands.
  S.limb('rarm', {
    top: rep([4, 'OOOO']),
    bottom: rep([4, 'xxxx']),
    right: ['OOOO', 'OOOO', 'OOOO', 'OOOO', 'OOOO', 'qqqq', 'SfSS', 'SSSS', 'SSfS', 'SSSS', 'xSxS', 'xxxx'],
    front: ['OOOO', 'OOOO', 'OOOO', 'OOOO', 'OOOO', 'qqqq', 'SSfS', 'SSSS', 'fSSS', 'SSSS', 'SxSS', 'xxSx'],
    left: ['OOOO', 'OOOO', 'OOOO', 'OOOO', 'OOOO', 'qqqq', 'SSSS', 'SSSS', 'SSSS', 'SSSS', 'SSSS', 'xxxx'],
    back: ['OOOO', 'OOOO', 'OOOO', 'OOOO', 'OOOO', 'qqqq', 'SSSS', 'SfSS', 'SSSS', 'SSSS', 'SSxS', 'xxxx']
  })
  S.limb('larm', mirrorLimb({
    top: rep([4, 'OOOO']),
    bottom: rep([4, 'xxxx']),
    right: rep([3, 'OOOO'], [1, 'OgOO'], [5, 'OOOO'], [1, 'oqoq'], [1, 'SSSS'], [1, 'xxxx']),
    front: rep([4, 'OOOO'], [1, 'OSoO'], [4, 'OOOO'], [1, 'qoqo'], [1, 'SxSS'], [1, 'xxxx']),
    left: rep([9, 'OOOO'], [1, 'oooo'], [1, 'SSSS'], [1, 'xxxx']),
    back: rep([2, 'OOOO'], [1, 'OOgO'], [6, 'OOOO'], [1, 'oqoq'], [1, 'SSSS'], [1, 'xxxx'])
  }))
  S.lift('rarm', ['right', 'front', 'left', 'back'], 'q')

  // Legs: a grey patch stitched over the right knee, grime, beat-up shoes, duct tape round the left one.
  S.limb('rleg', {
    top: rep([4, 'OOOO']),
    bottom: rep([4, 'XXXX']),
    right: rep([5, 'OOOO'], [1, 'OOgO'], [3, 'OOOO'], [1, 'oooo'], [1, 'NNNN'], [1, 'XXXX']),
    front: rep([3, 'OOOO'], [1, 'PpPP'], [1, 'PPpP'], [1, 'pPPp'], [3, 'OOOO'], [1, 'oooo'], [1, 'NnNN'], [1, 'XXXX']),
    left: rep([9, 'OOOO'], [1, 'oooo'], [1, 'NNNN'], [1, 'XXXX']),
    back: rep([2, 'OOOO'], [1, 'gOOO'], [6, 'OOOO'], [1, 'oooo'], [1, 'NNNN'], [1, 'XXXX'])
  })
  S.limb('lleg', mirrorLimb({
    top: rep([4, 'OOOO']),
    bottom: rep([4, 'XXXX']),
    right: rep([9, 'OOOO'], [1, 'oooo'], [1, 'NTTN'], [1, 'XXXX']),
    front: rep([1, 'OOOO'], [1, 'OgOO'], [1, 'OGgO'], [6, 'OOOO'], [1, 'oooo'], [1, 'TTNN'], [1, 'XXXX']),
    left: rep([9, 'OOOO'], [1, 'oooo'], [1, 'NNNN'], [1, 'XXXX']),
    back: rep([9, 'OOOO'], [1, 'oooo'], [1, 'NTNN'], [1, 'XXXX'])
  }))
  S.lift('rleg', ['front'], 'Pp')
  return S.c
}

// ---------- Tank: the big guy ----------
const tank = () => {
  const SKIN = [112, 74, 52, 255]
  const S = newSkin({
    S: SKIN, s: shade(SKIN, 0.86), t: shade(SKIN, 0.74), c: [160, 116, 94, 255],
    h: [58, 42, 32, 255], j: [44, 32, 24, 255], B: [30, 24, 20, 255], b: [56, 42, 34, 255],
    E: [224, 220, 212, 255], I: [40, 28, 20, 255], m: [74, 44, 36, 255],
    ...suit(ORANGE), ...PATCH,
    U: [238, 238, 232, 255], u: [204, 204, 198, 255], K: [36, 34, 32, 255], L: [78, 74, 70, 255], X: [20, 20, 20, 255],
    w: [226, 222, 210, 255], T: [36, 46, 70, 255], R: [158, 40, 42, 255], V: [226, 224, 218, 255]
  })
  // Head: a buzz cut, a thick beard, heavy brows with a scar through the left one, a thick neck.
  S.art('head', 'top', [
    'hjhhjhhj',
    'hhhjhhhh',
    'jhhhhhjh',
    'hhjhhhhh',
    'hhhhhjhh',
    'hjhhhhhh',
    'hhhhjhhj',
    'hhhhhhhh'
  ])
  S.art('head', 'bottom', rep([3, 'BBBBBBBB'], [5, 'ssssssss']))
  S.art('head', 'front', [
    'hhhhhhhh',
    'ShhhhhhS',
    'SSSSScSS',
    'SBBSScBS',
    'SEISSIES',
    'BSSssSSB',
    'BBBmmBBB',
    'BBBbBbBB'
  ])
  const side = [ // back -> front
    'hhhhhhhh',
    'hhhhhhhh',
    'hhhhhhSS',
    'hhhhhSSS',
    'hhhsSSSS',
    'SSSsSSBB',
    'SSSSBBBB',
    'tSSBBBBB'
  ]
  S.art('head', 'right', side)
  S.art('head', 'left', flip(side))
  S.art('head', 'back', [
    'hhhhhhhh',
    'hhjhhjhh',
    'hhhhhhhh',
    'hjhhhhjh',
    'hhhhhhhh',
    'hhhhhhhh',
    'SSSSSSSS',
    'tttttttt'
  ])
  S.lift('head', ['front', 'right', 'left'], 'Bb')

  // Body: a white tank top (the chest and abs shaded), the jumpsuit's sleeves knotted round the waist.
  S.art('body', 'top', rep([4, 'SSUUUUSS']))
  S.art('body', 'bottom', rep([4, 'OOOOOOOO']))
  S.art('body', 'front', [
    'SSUSSUSS',
    'SSUSSUSS',
    'SUUUUUUS',
    'UuUUUUuU',
    'UUuUUuUU',
    'UUUuuUUU',
    'UUUUUUUU',
    'UuUUUUuU',
    'OoOOOOoO',
    'qqqooqqq',
    'OOOooOOO',
    'OOOooOOO'
  ])
  const bside = rep([1, 'SSSS'], [7, 'UUUU'], [1, 'OOOO'], [1, 'qqqq'], [2, 'OOOO'])
  S.art('body', 'right', bside)
  S.art('body', 'left', bside)
  S.art('body', 'back', [
    'SUUUUUUS',
    'UUUUUUUU',
    'UUuUUuUU',
    'UUUUUUUU',
    'UUUUUUUU',
    'UuUUUUuU',
    'UUUUUUUU',
    'UUUUUUUU',
    'OOOOOOOO',
    'qqqqqqqq',
    'OOOOOOOO',
    'OOOooOOO'
  ])
  S.lift('body', ['front', 'right', 'left', 'back'], 'q')
  S.art('body', 'front', ['...oo...', '...oo...'], true, 0, 10) // the knot's ends hang out

  // Arms: big bare arms, a rose tattoo on the right, a skull on the left, taped wrists.
  const tape = rep([9, 'SSSS'], [1, 'wwww'], [1, 'SSSS'], [1, 'ssss'])
  S.limb('rarm', {
    top: rep([4, 'SSSS']),
    bottom: rep([4, 'ssss']),
    right: ['SSSS', 'STTS', 'TRRT', 'STTS', 'SSSS', 'STSS', 'SSSS', 'SSSS', 'SSSS', 'wwww', 'SSSS', 'ssss'],
    front: ['SSSS', 'SSTS', 'STTS', 'SSTS', 'SSSS', 'SSSS', 'SsSS', 'SSSS', 'SSSS', 'wwww', 'SSSS', 'sSsS'],
    left: tape,
    back: ['SSSS', 'TSST', 'STTS', 'TSST', 'SSSS', 'SSSS', 'SSSS', 'SSSS', 'SSSS', 'wwww', 'SSSS', 'ssss']
  })
  S.limb('larm', mirrorLimb({
    top: rep([4, 'SSSS']),
    bottom: rep([4, 'ssss']),
    right: ['SSSS', 'SVVS', 'VTTV', 'SVVS', 'STTS', 'SSSS', 'TSTT', 'SSSS', 'SSSS', 'wwww', 'SSSS', 'ssss'],
    front: ['SSSS', 'SVSS', 'VTSS', 'SVSS', 'SSSS', 'SSSS', 'SsSS', 'SSSS', 'SSSS', 'wwww', 'SSSS', 'sSsS'],
    left: tape,
    back: ['SSSS', 'SSVS', 'SSTV', 'SSVS', 'SSSS', 'SSSS', 'SSSS', 'SSSS', 'SSSS', 'wwww', 'SSSS', 'ssss']
  }))
  S.lift('rarm', ['right', 'front', 'left', 'back'], 'w')
  S.lift('larm', ['right', 'front', 'left', 'back'], 'w')

  // Legs: the jumpsuit (his number on the right thigh, since the top's tied off), heavy laced boots.
  const leg = {
    top: rep([4, 'OOOO']),
    bottom: rep([4, 'XXXX']),
    right: rep([8, 'OOOO'], [1, 'oooo'], [2, 'KKKK'], [1, 'XXXX']),
    front: rep([3, 'OOOO'], [1, 'OoOO'], [4, 'OOOO'], [1, 'oooo'], [1, 'KLLK'], [1, 'KKKK'], [1, 'XXXX']),
    left: rep([8, 'OOOO'], [1, 'oooo'], [2, 'KKKK'], [1, 'XXXX']),
    back: rep([8, 'OOOO'], [1, 'oooo'], [2, 'KKKK'], [1, 'XXXX'])
  }
  S.limb('rleg', leg)
  S.limb('lleg', mirrorLimb(leg))
  S.art('rleg', 'front', ['WWWO', 'WkkO'], false, 0, 1)
  return S.c
}

// ---------- Whisper: the slick fixer ----------
const whisper = () => {
  const SKIN = [206, 164, 126, 255]
  const S = newSkin({
    S: SKIN, s: shade(SKIN, 0.88), t: shade(SKIN, 0.76),
    H: [26, 24, 28, 255], g: [88, 94, 112, 255], h: [58, 56, 62, 255], B: [30, 26, 26, 255], k: [30, 26, 26, 255],
    E: WHITE, I: [60, 44, 30, 255], m: [142, 92, 78, 255],
    G: [236, 192, 70, 255], K: [24, 26, 34, 255], L: [96, 108, 132, 255],
    ...suit([240, 118, 34, 255]), W: [248, 248, 248, 255], n: [34, 34, 34, 255],
    R: [196, 40, 40, 255], w: [238, 238, 238, 255],
    D: [22, 22, 24, 255], d: [84, 84, 94, 255], Z: [12, 12, 12, 255]
  })
  // Head: black hair slicked straight back with a shine and a sharp part on the left, short at the back,
  // a soul patch, a smirk.
  S.art('head', 'top', [
    'HHgHHHgH',
    'HHgHHHgH',
    'HHgHHHHH',
    'HHgHHsHH',
    'HHgHHsHH',
    'HHgHHsHH',
    'HHgHHsHH',
    'HHgHHsHH'
  ])
  S.art('head', 'bottom', rep([8, 'ssssssss']))
  S.art('head', 'front', [
    'HHgHHsHH',
    'SHHHHHHS',
    'SSSSSSSS',
    'SBBSSBBS',
    'SEISSIES',
    'SSSssSSS',
    'SSSsmmmS',
    'tSSkkSSt'
  ])
  const side = [ // back -> front
    'HHHHHHHH',
    'HgHHgHHH',
    'HHHHHHHS',
    'hHHHHHSS',
    'hhHHsSSS',
    'hhhhsSSS',
    'SSSSSSSS',
    'tSSSSSSt'
  ]
  S.art('head', 'right', side)
  S.art('head', 'left', flip(side))
  S.art('head', 'back', [
    'HHHHHHHH',
    'HgHHHgHH',
    'HHgHHHgH',
    'HHHHHHHH',
    'hHHHHHHh',
    'hhhhhhhh',
    'SSSSSSSS',
    'tttttttt'
  ])
  S.lift('head', ['top', 'right', 'left', 'back'], 'Hg')
  // Gold aviators (dark lenses with a glint), the arms back to the ears.
  S.art('head', 'front', ['GKLGGKLG'], true, 0, 4)
  S.art('head', 'right', ['....GGGG'], true, 0, 4)
  S.art('head', 'left', ['GGGG....'], true, 0, 4)

  // Body: a pressed jumpsuit (creases), the collar popped, a gold chain, cigarettes in the pocket.
  S.art('body', 'top', rep([4, 'OOOOOOOO']))
  S.art('body', 'bottom', rep([4, 'OOOOOOOO']))
  S.art('body', 'front', [
    'OOoSSoOO',
    'OOoGGoOO',
    'OWWWqRwO',
    'OWnnqooO',
    'OOOOqOOO',
    'OOOOqOOO',
    'OOOOqOOO',
    'OOOOqOOO',
    'oooooooo',
    'OOqOOqOO',
    'OOqOOqOO',
    'OOOooOOO'
  ])
  const bside = rep([8, 'OOOO'], [1, 'oooo'], [3, 'OOOO'])
  S.art('body', 'right', bside)
  S.art('body', 'left', bside)
  S.art('body', 'back', [
    'OOOOOOOO',
    'OOOOOOOO',
    'OkkOkkkO',
    'OkOkOkOO',
    'OOOOOOOO',
    'OOOOOOOO',
    'OOOOOOOO',
    'OOOOOOOO',
    'oooooooo',
    'OOOOOOOO',
    'OOOOOOOO',
    'OOOooOOO'
  ])
  S.art('body', 'front', ['.qo..oq.'], true)
  S.art('body', 'right', ['qqqq'], true)
  S.art('body', 'left', ['qqqq'], true)
  S.art('body', 'back', ['qqqqqqqq'], true)

  // Arms: sleeves rolled twice, neatly; a gold ring on the right hand, a gold watch on the left wrist.
  const arm = (watch, ring) => ({
    top: rep([4, 'OOOO']),
    bottom: rep([4, 'ssss']),
    right: rep([6, 'OOOO'], [1, 'qqqq'], [2, 'SSSS'], [1, watch ? 'GGGG' : 'SSSS'], [1, 'SSSS'], [1, 'ssss']),
    front: rep([6, 'OqOO'], [1, 'qqqq'], [2, 'SSSS'], [1, watch ? 'GLGG' : 'SSSS'], [1, ring ? 'SSGS' : 'SSSS'], [1, 'ssss']),
    left: rep([6, 'OOOO'], [1, 'qqqq'], [2, 'SSSS'], [1, watch ? 'GGGG' : 'SSSS'], [1, 'SSSS'], [1, 'ssss']),
    back: rep([6, 'OOOO'], [1, 'qqqq'], [2, 'SSSS'], [1, watch ? 'GGGG' : 'SSSS'], [1, 'SSSS'], [1, 'ssss'])
  })
  S.limb('rarm', arm(false, true))
  S.limb('larm', mirrorLimb(arm(true, false)))
  S.lift('rarm', ['right', 'front', 'left', 'back'], 'q')
  S.lift('larm', ['right', 'front', 'left', 'back'], 'q')

  // Legs: a sharp crease, polished black loafers.
  const leg = {
    top: rep([4, 'OOOO']),
    bottom: rep([4, 'ZZZZ']),
    right: rep([10, 'OOOO'], [1, 'DDDD'], [1, 'ZZZZ']),
    front: rep([10, 'OqOO'], [1, 'DdDD'], [1, 'ZZZZ']),
    left: rep([10, 'OOOO'], [1, 'DDDD'], [1, 'ZZZZ']),
    back: rep([10, 'OOOO'], [1, 'DDDD'], [1, 'ZZZZ'])
  }
  S.limb('rleg', leg)
  S.limb('lleg', mirrorLimb(leg))
  return S.c
}

// ---------- The prison guard: a corrections officer ----------
const jailguard = () => {
  const SKIN = [214, 166, 126, 255]
  const SHIRT = [132, 138, 144, 255]
  const GREEN = [40, 64, 46, 255]
  const S = newSkin({
    S: SKIN, s: shade(SKIN, 0.87), t: shade(SKIN, 0.76),
    H: [70, 50, 34, 255], B: [58, 40, 28, 255], E: WHITE, I: [70, 92, 62, 255], m: [150, 96, 80, 255],
    A: SHIRT, a: shade(SHIRT, 0.8), b: shade(SHIRT, 1.18),
    V: [38, 66, 48, 255], D: GREEN, d: shade(GREEN, 0.72), C: [36, 62, 44, 255], c: [24, 42, 30, 255],
    K: [24, 24, 26, 255], k: [64, 64, 68, 255], Y: [196, 200, 208, 255], Q: [226, 182, 64, 255],
    N: [26, 26, 28, 255], n: [222, 222, 222, 255], R: [44, 44, 48, 255], X: [14, 14, 14, 255]
  })
  // Head: a short haircut under the cap, a stern face.
  S.art('head', 'top', rep([8, 'HHHHHHHH']))
  S.art('head', 'bottom', rep([8, 'ssssssss']))
  S.art('head', 'front', [
    'HHHHHHHH',
    'HHSSSSHH',
    'SSSSSSSS',
    'SBBSSBBS',
    'SEISSIES',
    'SSSssSSS',
    'SSmmmmSS',
    'tSSSSSSt'
  ])
  const side = [ // back -> front
    'HHHHHHHH',
    'HHHHHHHH',
    'HHHHHHSS',
    'HHHHHSSS',
    'HHHHsSSS',
    'HHHHsSSS',
    'SSSSSSSS',
    'tSSSSSSt'
  ]
  S.art('head', 'right', side)
  S.art('head', 'left', flip(side))
  S.art('head', 'back', rep([6, 'HHHHHHHH'], [1, 'SSSSSSSS'], [1, 'tttttttt']))
  // The green ball cap (hat layer): panel seams on top, a gold badge in front, the black brim, the strap.
  S.art('head', 'top', [
    'CCCCCCCC',
    'CcCCCCcC',
    'CCcCCcCC',
    'CCCccCCC',
    'CCCccCCC',
    'CCcCCcCC',
    'CcCCCCcC',
    'CCCCCCCC'
  ], true)
  S.art('head', 'front', ['CCCQQCCC', 'CCCCCCCC', 'KKKKKKKK'], true)
  S.art('head', 'right', ['CCCCCCCC', 'CCCCCCCC', '.....KKK'], true)
  S.art('head', 'left', ['CCCCCCCC', 'CCCCCCCC', 'KKK.....'], true)
  S.art('head', 'back', ['CCCCCCCC', 'CCCCCCCC', '.cccccc.'], true)

  // Body: the grey shirt (open collar, black crew neck under it), a name tag and the star badge, the
  // tucked shirt, the duty belt with its silver buckle, keys at the right hip, the radio at the left.
  S.art('body', 'top', ['AAAAAAAA', 'VVAKKAVV', 'VVAKKAVV', 'AAAAAAAA'])
  S.art('body', 'bottom', rep([4, 'DDDDDDDD']))
  S.art('body', 'front', [
    'AbAKKAbA',
    'AAaKKaAA',
    'AnNAaAQA',
    'AaaAaQQA',
    'AAAAaAAA',
    'AAAAaAAA',
    'AAAAaAAA',
    'AAAAaAAA',
    'aaaaaaaa',
    'KKKYYKRK',
    'DYDDdDRD',
    'DDDddDDD'
  ])
  S.art('body', 'right', rep([1, 'bbbb'], [7, 'AAAA'], [1, 'aaaa'], [1, 'KKKK'], [1, 'DYYD'], [1, 'DDDD']))
  S.art('body', 'left', rep([1, 'bbbb'], [7, 'AAAA'], [1, 'aaaa'], [1, 'KRKK'], [1, 'DRDD'], [1, 'DDDD']))
  S.art('body', 'back', [
    'bbbbbbbb',
    'aaaaaaaa',
    'AAAAAAAA',
    'AAAaaAAA',
    'AAAAAAAA',
    'AAAAAAAA',
    'AAAAAAAA',
    'AAAAAAAA',
    'aaaaaaaa',
    'KKKKKKKK',
    'DDDDDDDD',
    'DDDddDDD'
  ])
  S.lift('body', ['front', 'right', 'left', 'back'], 'KYR')

  // Arms: short sleeves with the green epaulettes and a shoulder patch, a black watch on the left wrist.
  const arm = watch => ({
    top: ['AAAA', 'VVVV', 'VVVV', 'AAAA'],
    bottom: rep([4, 'ssss']),
    right: ['AAAA', 'AVVA', 'VQQV', 'AVVA', 'aaaa', 'SSSS', 'SSSS', 'SSSS', 'SSSS', watch ? 'KKKK' : 'SSSS', 'SSSS', 'ssss'],
    front: rep([4, 'AAAA'], [1, 'aaaa'], [4, 'SSSS'], [1, watch ? 'KkKK' : 'SSSS'], [1, 'SSSS'], [1, 'ssss']),
    left: rep([4, 'AAAA'], [1, 'aaaa'], [4, 'SSSS'], [1, watch ? 'KKKK' : 'SSSS'], [1, 'SSSS'], [1, 'ssss']),
    back: rep([4, 'AAAA'], [1, 'aaaa'], [4, 'SSSS'], [1, watch ? 'KKKK' : 'SSSS'], [1, 'SSSS'], [1, 'ssss'])
  })
  S.limb('rarm', arm(false))
  S.limb('larm', mirrorLimb(arm(true)))
  S.lift('rarm', FACES, 'AaVQ')
  S.lift('larm', FACES, 'AaVQ')

  // Legs: forest-green trousers with a cargo pocket and a crease, boots with the trousers bloused over.
  const leg = {
    top: rep([4, 'DDDD']),
    bottom: rep([4, 'XXXX']),
    right: rep([3, 'DDDD'], [1, 'dddd'], [2, 'DdDD'], [3, 'DDDD'], [2, 'KKKK'], [1, 'XXXX']),
    front: rep([9, 'DdDD'], [1, 'KkKK'], [1, 'KKKK'], [1, 'XXXX']),
    left: rep([9, 'DDDD'], [2, 'KKKK'], [1, 'XXXX']),
    back: rep([9, 'DDDD'], [2, 'KKKK'], [1, 'XXXX'])
  }
  S.limb('rleg', leg)
  S.limb('lleg', mirrorLimb(leg))
  return S.c
}

// ---------- The Prison Gun Shop's keeper: the inmate who runs the yard's shop ----------
const jailshop = () => {
  const SKIN = [190, 140, 104, 255]
  const S = newSkin({
    S: SKIN, s: shade(SKIN, 0.87), t: shade(SKIN, 0.76), x: [150, 108, 80, 255],
    H: [92, 62, 40, 255], h: [64, 42, 28, 255], B: [70, 46, 30, 255], E: WHITE, I: [70, 50, 34, 255], m: [130, 84, 68, 255],
    ...suit(ORANGE), ...PATCH,
    P: [148, 144, 136, 255], p: [114, 110, 104, 255], r: [96, 92, 86, 255], Y: [192, 196, 204, 255], y: [196, 52, 44, 255],
    V: [74, 160, 96, 255], v: [44, 110, 62, 255], K: [30, 30, 30, 255],
    n: [72, 68, 64, 255], X: [30, 28, 26, 255]
  })
  // Head: short brown hair, stubble, the green eyeshade (hat layer).
  S.art('head', 'top', [
    'HHhHHHhH',
    'HHHHhHHH',
    'HhHHHHHH',
    'HHHHHhHH',
    'HHhHHHHH',
    'HHHHHHhH',
    'HhHHHHHH',
    'HHHHhHHH'
  ])
  S.art('head', 'bottom', rep([3, 'xxxxxxxx'], [5, 'ssssssss']))
  S.art('head', 'front', [
    'HHHHHHHH',
    'HhHHHHhH',
    'SSSSSSSS',
    'SBBSSBBS',
    'SEISSIES',
    'SSSssSSS',
    'SxSmmSxS',
    'txxxxxxt'
  ])
  const side = [ // back -> front
    'HHHHHHHH',
    'HHHHHHHH',
    'HHHHHHSS',
    'HHHHHSSS',
    'HHHHsSSS',
    'HHHHsSSS',
    'hHSSSSSx',
    'tSSSSSxt'
  ]
  S.art('head', 'right', side)
  S.art('head', 'left', flip(side))
  S.art('head', 'back', [
    'HHHHHHHH',
    'HhHHHHhH',
    'HHHHHHHH',
    'HHhHHhHH',
    'HHHHHHHH',
    'hHHHHHHh',
    'SSSSSSSS',
    'tttttttt'
  ])
  S.art('head', 'front', ['........', 'VVVVVVVV', 'vvvvvvvv'], true)
  S.art('head', 'right', ['........', 'VVVVVVVV', '.....vvv'], true)
  S.art('head', 'left', ['........', 'VVVVVVVV', 'vvv.....'], true)
  S.art('head', 'back', ['........', 'VVVVVVVV'], true)

  // Body: a grey canvas bib apron over the jumpsuit (straps to the neck, a screwdriver in the pocket, the
  // ties knotted at the back), his number on the back.
  S.art('body', 'top', rep([4, 'OOOOOOOO']))
  S.art('body', 'bottom', rep([4, 'OOOOOOOO']))
  S.art('body', 'front', [
    'OrOooOrO',
    'OPPPPPPO',
    'OPpYpPPO',
    'OPpypPPO',
    'OPPPPPPO',
    'OPPPPPPO',
    'OPPPPPPO',
    'rrrrrrrr',
    'PPPPPPPP',
    'PPPpPPPP',
    'PPPPPPPP',
    'pppppppp'
  ])
  S.art('body', 'right', rep([7, 'OOOO'], [1, 'rrrr'], [4, 'OOPP']))
  S.art('body', 'left', rep([7, 'OOOO'], [1, 'rrrr'], [4, 'PPOO']))
  S.art('body', 'back', [
    'OOOOOOOO',
    'OOOOOOOO',
    'OkkOkkkO',
    'OkOkOkOO',
    'OOOOOOOO',
    'OOOOOOOO',
    'OOOOOOOO',
    'rrrrrrrr',
    'OOOrrOOO',
    'OOrOOrOO',
    'OOOOOOOO',
    'OOOooOOO'
  ])
  S.lift('body', ['front', 'right', 'left'], 'PpYyr')

  // Arms: full sleeves with black garters on the upper arm, cuffs.
  const arm = {
    top: rep([4, 'OOOO']),
    bottom: rep([4, 'ssss']),
    right: rep([3, 'OOOO'], [1, 'KKKK'], [5, 'OOOO'], [1, 'oooo'], [1, 'SSSS'], [1, 'ssss']),
    front: rep([3, 'OOOO'], [1, 'KKKK'], [2, 'OOOO'], [1, 'OoOO'], [2, 'OOOO'], [1, 'oooo'], [1, 'SSSS'], [1, 'ssss']),
    left: rep([3, 'OOOO'], [1, 'KKKK'], [5, 'OOOO'], [1, 'oooo'], [1, 'SSSS'], [1, 'ssss']),
    back: rep([3, 'OOOO'], [1, 'KKKK'], [5, 'OOOO'], [1, 'oooo'], [1, 'SSSS'], [1, 'ssss'])
  }
  S.limb('rarm', arm)
  S.limb('larm', mirrorLimb(arm))
  S.lift('rarm', FACES, 'K')
  S.lift('larm', FACES, 'K')

  // Legs: the apron's skirt over the thighs, the jumpsuit below, dark slip-ons.
  const leg = {
    top: rep([4, 'OOOO']),
    bottom: rep([4, 'XXXX']),
    right: rep([4, 'OOOP'], [6, 'OOOO'], [1, 'nnnn'], [1, 'XXXX']),
    front: rep([3, 'PPPP'], [1, 'pppp'], [6, 'OOOO'], [1, 'nnnn'], [1, 'XXXX']),
    left: rep([4, 'POOO'], [6, 'OOOO'], [1, 'nnnn'], [1, 'XXXX']),
    back: rep([10, 'OOOO'], [1, 'nnnn'], [1, 'XXXX'])
  }
  S.limb('rleg', leg)
  S.limb('lleg', mirrorLimb(leg))
  S.lift('rleg', ['front'], 'Pp')
  S.lift('lleg', ['front'], 'Pp')
  return S.c
}

// ---------- Write ----------
const SKINS = { lefty, rusty, tank, whisper, jailguard, jailshop }
const citizens = path.join(__dirname, '..', '..', 'server', 'plugins', 'Citizens', 'skins')
fs.mkdirSync(citizens, { recursive: true })
const drawn = []
for (const [id, draw] of Object.entries(SKINS)) {
  const c = draw()
  checkBase(c, id)
  drawn.push(c)
  fs.writeFileSync(path.join(citizens, id + '.png'), c.png())
  fs.writeFileSync(path.join(__dirname, id + '.png'), c.png())
  fs.writeFileSync(path.join(__dirname, 'preview-' + id + '.png'), preview(c).png())
  console.log(`wrote ${id}.png (server\\plugins\\Citizens\\skins and tools\\skins) and tools\\skins\\preview-${id}.png`)
}
fs.writeFileSync(path.join(__dirname, 'preview-prison.png'), lineup(drawn).png())
console.log('wrote tools\\skins\\preview-prison.png')
