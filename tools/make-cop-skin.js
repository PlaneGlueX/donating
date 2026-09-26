// Draws the cops' skin (cops.sk): a police officer in a navy uniform and peaked cap with a gold badge,
// in the standard 64x64 player skin layout (wide arms). Writes server\plugins\Citizens\skins\police.png;
// Citizens uploads it to MineSkin once (/npc skin --file police.png) for a signed texture, and cops.sk
// reuses that texture for every cop (core.sk cop::skin-texture / cop::skin-signature).
// Usage: tools\node\node.exe tools\make-cop-skin.js
const fs = require('fs')
const path = require('path')
const { canvas, shade } = require('./png')

const c = canvas(64, 64)
const SKIN = [196, 146, 108, 255]
const SKIN_D = shade(SKIN, 0.86)
const HAIR = [58, 40, 28, 255]
const NAVY = [30, 44, 88, 255]
const NAVY_L = shade(NAVY, 1.25)
const NAVY_D = shade(NAVY, 0.75)
const PANTS = [22, 26, 40, 255]
const PANTS_D = shade(PANTS, 0.8)
const BLACK = [16, 16, 18, 255]
const GOLD = [226, 182, 64, 255]
const WHITE = [236, 236, 240, 255]
const EYE = [40, 70, 110, 255]
const MOUTH = [150, 96, 78, 255]
const TIE = [14, 18, 32, 255]
const RADIO = [34, 34, 38, 255]

// A box face: fill, then shade its bottom row a little.
const face = (x0, y0, w, h, col, dark) => { c.fill(x0, y0, x0 + w - 1, y0 + h - 1, col); if (dark) c.fill(x0, y0 + h - 1, x0 + w - 1, y0 + h - 1, dark) }

// ---------- Head (8x8x8) ----------
face(8, 0, 8, 8, HAIR) // top
face(16, 0, 8, 8, SKIN_D) // bottom (chin)
for (const [x0] of [[0], [8], [16], [24]]) face(x0, 8, 8, 8, SKIN) // right, front, left, back
// Hair on the sides and back, sideburns.
c.fill(0, 8, 7, 9, HAIR); c.fill(16, 8, 23, 9, HAIR); c.fill(24, 8, 31, 11, HAIR)
c.fill(0, 10, 1, 11, HAIR); c.fill(22, 10, 23, 11, HAIR)
c.fill(8, 8, 15, 9, HAIR) // front hairline
// Face: eyes, brows, nose, mouth.
c.set(9, 11, HAIR); c.set(10, 11, HAIR); c.set(13, 11, HAIR); c.set(14, 11, HAIR)
c.set(9, 12, WHITE); c.set(10, 12, EYE); c.set(13, 12, EYE); c.set(14, 12, WHITE)
c.set(11, 13, SKIN_D); c.set(12, 13, SKIN_D)
c.fill(10, 14, 13, 14, MOUTH)

// ---------- Hat layer: the police cap ----------
face(40, 0, 8, 8, NAVY) // cap top
for (let x = 40; x < 48; x++) c.set(x, 0, NAVY_L)
// Band around the head (rows 8-10 of the hat layer), the gold badge in front, the black visor.
for (const x0 of [32, 40, 48, 56]) c.fill(x0, 8, x0 + 7, 10, NAVY)
for (const x0 of [32, 40, 48, 56]) c.fill(x0, 10, x0 + 7, 10, BLACK) // the band's black stripe
c.fill(43, 8, 44, 9, GOLD)
c.fill(40, 11, 47, 11, BLACK) // visor (front only)

// ---------- Body (8x12x4) ----------
face(20, 16, 8, 4, NAVY_L) // top (shoulders)
face(28, 16, 8, 4, PANTS) // bottom
face(16, 20, 4, 12, NAVY) // right side
face(28, 20, 4, 12, NAVY) // left side
face(20, 20, 8, 12, NAVY) // front
face(32, 20, 8, 12, NAVY) // back
// Front: collar, tie, badge, pocket flaps, radio, belt with a buckle.
c.fill(21, 20, 26, 20, NAVY_L); c.set(23, 20, WHITE); c.set(24, 20, WHITE)
c.fill(23, 21, 24, 27, TIE)
c.fill(21, 22, 22, 23, GOLD) // badge (their left chest)
c.fill(25, 22, 26, 22, NAVY_D) // pocket flap
c.fill(21, 24, 22, 24, NAVY_D)
c.set(26, 23, RADIO); c.set(26, 24, RADIO)
c.fill(20, 29, 27, 30, BLACK) // belt
c.fill(23, 29, 24, 30, GOLD) // buckle
c.fill(20, 31, 27, 31, PANTS)
// Back and sides: the belt all the way round.
c.fill(32, 29, 39, 30, BLACK); c.fill(16, 29, 19, 30, BLACK); c.fill(28, 29, 31, 30, BLACK)
c.fill(32, 31, 39, 31, PANTS); c.fill(16, 31, 19, 31, PANTS); c.fill(28, 31, 31, 31, PANTS)
c.fill(34, 21, 37, 21, NAVY_L) // back yoke

// ---------- Arms (4x12x4): navy sleeves, cuff, hands ----------
const arm = (x0, y0) => {
  face(x0 + 4, y0, 4, 4, NAVY_L) // top
  face(x0 + 8, y0, 4, 4, SKIN_D) // bottom (the hand's palm end)
  for (const dx of [0, 4, 8, 12]) {
    face(x0 + dx, y0 + 4, 4, 12, NAVY)
    c.fill(x0 + dx, y0 + 12, x0 + dx + 3, y0 + 12, NAVY_D) // cuff
    c.fill(x0 + dx, y0 + 13, x0 + dx + 3, y0 + 15, SKIN) // hand
  }
  c.fill(x0 + 4, y0 + 5, x0 + 7, y0 + 5, GOLD) // shoulder patch stripe (front)
}
arm(40, 16) // right arm
arm(32, 48) // left arm

// ---------- Legs (4x12x4): dark trousers, black shoes ----------
const leg = (x0, y0) => {
  face(x0 + 4, y0, 4, 4, PANTS) // top
  face(x0 + 8, y0, 4, 4, BLACK) // sole
  for (const dx of [0, 4, 8, 12]) {
    face(x0 + dx, y0 + 4, 4, 12, PANTS)
    c.fill(x0 + dx, y0 + 12, x0 + dx + 3, y0 + 12, PANTS_D)
    c.fill(x0 + dx, y0 + 13, x0 + dx + 3, y0 + 15, BLACK)
  }
}
leg(0, 16) // right leg
leg(16, 48) // left leg

const out = path.join(__dirname, '..', 'server', 'plugins', 'Citizens', 'skins')
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'police.png'), c.png())
fs.mkdirSync(path.join(__dirname, 'skins'), { recursive: true })
fs.writeFileSync(path.join(__dirname, 'skins', 'police.png'), c.png())
console.log('wrote server\\plugins\\Citizens\\skins\\police.png (and tools\\skins\\police.png)')
