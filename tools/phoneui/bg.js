// The chest menus' art (tools\make-phone-ui.js):
//   - home(c) = the phone's home screen (U+E010), app(c) = an app page (U+E011): a 176x135 canvas with the phone and
//     nothing else around it. The pack's generic_54.png has a transparent chest part (panelTexture), so the world
//     (dimmed by the client) shows around the phone. Outside the phone only the player-inventory panel's top edge is
//     drawn (y 122-125 = the vanilla panel's top rows v0-v3), so the inventory panel below reads as a finished panel;
//     x 175 of y 125 is opaque (the edge's black), so the glyph is 176 wide and advances 177 (ui.sk's -132 relies on it).
//   - panelTop(c, R) = the vanilla chest panel's top part for R rows (176 x 18R+17): the classic panel glyphs
//     U+E020-E025 every other chest menu puts under its title (the texture's own chest part is transparent).
//   - panelTexture(c) = the whole 256x256 generic_54.png: v0-v125 transparent, v126-v221 the vanilla
//     player-inventory part, the rest transparent.
// The vanilla panel is drawn procedurally from its measured layout (checked against 26.3's generic_54.png pixel by
// pixel: 0 mismatches); no Mojang pixels are copied.
// Geometry (GUI pixels, inclusive), shared with phone.sk's slots: slot n's item is the 16x16 box at
// (8 + 18 * (n % 9), 18 + 18 * floor(n / 9)); the screen holds columns 2-6, rows 0-4; slot 49 is the home button.
const { hex, over, mix, inRound } = require('./common.js')

const W = 176, H = 135
const C = {
  // The vanilla panel's colors, and the phone's drop shadow: black at 44/255 (the gray panel under it looks #A4A4A4,
  // the old shadow; over the world a faint shade; the client's text shader drops alpha under 26).
  black: hex('#000000'), white: hex('#FFFFFF'), panel: hex('#C6C6C6'), panelShadow: hex('#555555'),
  slotDark: hex('#373737'), slotMid: hex('#8B8B8B'), dropShadow: [0, 0, 0, 44],
  body: hex('#1C1C1E'), rimLit: hex('#58585E'), rimDark: hex('#2A2A2D'), glass: hex('#0A0A0B'),
  bevel: hex('#26262A'),
  btnLit: hex('#6A6A70'), btnMid: hex('#46464B'), btnDark: hex('#232326'),
  homeRing: hex('#3A3A3C'), homeRingLow: hex('#48484B'), homeCenter: hex('#141416'), homeMark: hex('#2C2C2F'),
  // Home screen wallpaper: deep navy at the top to a dark purple at the bottom, two soft glows.
  wallTop: hex('#0B1026'), wallBottom: hex('#2A1B4A'), glowA: hex('#26407E'), glowB: hex('#5A2C72'),
  // App page: a plain dark screen with a lighter toolbar (status bar + row 0).
  appTop: hex('#1C1C1E'), appBottom: hex('#141416'), toolbar: hex('#2C2C2E'), toolbarLine: hex('#3A3A3C'),
  status: hex('#FFFFFF'), statusDim: hex('#FFFFFF', 110)
}
// The phone ends at y 126 (not 133): the client draws the player inventory's "Inventory" label at x 8-56, y 128-135
// on top of the background, and "tory" would sit on the phone's bezel; this also centers the home button in the bezel.
// Everything is centered on x 87.5, like the vanilla panel and the slot grid (columns 2-6's items: x 44-131), so the
// icons sit 3 texels from both sides of the screen.
const PHONE = { x0: 37, y0: 3, x1: 138, y1: 126, r: 8 }
const SCREEN = { x0: 41, y0: 5, x1: 134, y1: 106, r: 3 }
// The dock: a full-width frosted band along the bottom of the screen (the screen's rounded corners clip it), behind
// row 4 (items y 90-105), with a brighter hairline at its top.
const DOCK = { x0: SCREEN.x0, y0: 88, x1: SCREEN.x1, y1: SCREEN.y1, r: 0 }
const HOME = { x0: 82, y0: 110, x1: 93, y1: 121, r: 5 } // 12x12, centered on slot 49's item box (80-95, 108-123)
// The app page's toolbar: row 0's buttons sit at y 18-33; it runs up behind the status bar (y 5-15) like an iOS
// navigation bar, so the clock and the page's buttons share one bar, and a hairline closes it at y 34 (row 1's
// items start at y 36, so a dark texel keeps the first row off the toolbar).
const TOOLBAR = { y1: 33, line: 34 }

const inBox = b => (x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 &&
  inRound(x - b.x0, y - b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1, b.r)
// A pixel of the shape with a 4-neighbour outside it: a thin (8-connected) 1-texel outline.
const onEdge = (inside, x, y) => inside(x, y) && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1))
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const smooth = t => t * t * (3 - 2 * t)

// ---------- The vanilla container panel (generic_54.png's layout) ----------
// Row v (0-3) of the panel's top edge at canvas row y; v 3 is the first body row with its extra white texel at x 3.
// (The top right corner steps one pixel further than the top left, like the texture.)
function vEdge (c, y, v) {
  for (let x = 0; x < W; x++) {
    let col = null
    if (v === 0) col = x >= 2 && x <= 172 ? C.black : null
    else if (v === 1) col = x === 1 || x === 173 ? C.black : x >= 2 && x <= 172 ? C.white : null
    else if (v === 2) col = x === 0 || x === 174 ? C.black : x >= 1 && x <= 172 ? C.white : x === 173 ? C.panel : null
    else col = x === 0 || x === 175 ? C.black : x <= 3 ? C.white : x >= 173 ? C.panelShadow : C.panel
    if (col) c.set(x, y, col)
  }
}
// A plain body row: black, two white, gray ..., two dark gray, black.
function vBody (c, y) {
  for (let x = 0; x < W; x++) c.set(x, y, x === 0 || x === 175 ? C.black : x <= 2 ? C.white : x >= 173 ? C.panelShadow : C.panel)
}
// An 18x18 slot cell with its top-left corner at (x0, y0): dark top and left, light bottom and right.
function vCell (c, x0, y0) {
  for (let dy = 0; dy < 18; dy++) {
    for (let dx = 0; dx < 18; dx++) {
      let col
      if (dy === 0) col = dx === 17 ? C.slotMid : C.slotDark
      else if (dy === 17) col = dx === 0 ? C.slotMid : C.white
      else col = dx === 0 ? C.slotDark : dx === 17 ? C.white : C.slotMid
      c.set(x0 + dx, y0 + dy, col)
    }
  }
}
// The chest part for R rows (176 x 18R+17, texture v 0 .. 18R+16): the top edge, the body, R rows of 9 cells from (7, 17).
function panelTop (c, R, y0 = 0) {
  const h = 18 * R + 17
  for (let y = 0; y < h; y++) { if (y <= 3) vEdge(c, y0 + y, y); else vBody(c, y0 + y) }
  for (let r = 0; r < R; r++) for (let col = 0; col < 9; col++) vCell(c, 7 + 18 * col, y0 + 17 + 18 * r)
}
// The player-inventory part (96 rows, texture v 126-221) from canvas row y0: no top edge of its own, 3 rows of cells
// from y0 + 13, the hotbar from y0 + 71, the rounded bottom edge in its last 3 rows.
function panelBottom (c, y0) {
  for (let i = 0; i < 93; i++) vBody(c, y0 + i)
  for (let r = 0; r < 3; r++) for (let col = 0; col < 9; col++) vCell(c, 7 + 18 * col, y0 + 13 + 18 * r)
  for (let col = 0; col < 9; col++) vCell(c, 7 + 18 * col, y0 + 71)
  c.set(172, y0 + 92, C.panelShadow)
  const a = y0 + 93, b = y0 + 94, e = y0 + 95
  c.set(1, a, C.black); c.set(2, a, C.panel); for (let x = 3; x <= 174; x++) c.set(x, a, C.panelShadow); c.set(175, a, C.black)
  c.set(2, b, C.black); for (let x = 3; x <= 173; x++) c.set(x, b, C.panelShadow); c.set(174, b, C.black)
  for (let x = 3; x <= 173; x++) c.set(x, e, C.black)
}
// generic_54.png (a 256x256 canvas): the chest part (v 0-125) transparent, the player inventory at v 126-221, nothing else.
function panelTexture (c) { panelBottom(c, 126) }

// The player-inventory panel's top edge under a phone menu: the vanilla rows v0-v3 at y 122-125 (y 125 paints over the
// inventory part's first body row, which has no edge of its own). The "Inventory" label (y 128) then sits 6 pixels
// under the edge, like a title under a panel's edge. The phone is drawn over its middle afterwards.
function invHeader (c) { for (let v = 0; v <= 3; v++) vEdge(c, 122 + v, v) }

// A 1-texel drop shadow down and to the right of the phone, blended over whatever is under it (the world, the edge).
function dropShadow (c) {
  const inP = inBox(PHONE)
  for (let y = PHONE.y0; y <= PHONE.y1 + 1; y++) for (let x = PHONE.x0; x <= PHONE.x1 + 1; x++) if (inP(x - 1, y - 1) && !inP(x, y)) c.set(x, y, over(c.get(x, y), C.dropShadow))
}

// Side buttons: 2-texel bumps on the frame, lit from the top left like the rim.
function buttons (c) {
  const bump = (xs, y0, y1) => {
    for (let y = y0; y <= y1; y++) {
      xs.forEach((x, i) => {
        let col = i === 0 ? C.btnMid : C.btnDark // i 0 = against the frame
        if (y === y0) col = C.btnLit
        else if (y === y1) col = C.btnDark
        c.set(x, y, col)
      })
    }
  }
  bump([36, 35], 20, 23) // the mute switch
  bump([36, 35], 28, 35) // volume up
  bump([36, 35], 38, 45) // volume down
  bump([139, 140], 32, 43) // power
}

function frame (c) {
  const inP = inBox(PHONE), inS = inBox(SCREEN)
  const cx0 = PHONE.x0 + PHONE.r, cx1 = PHONE.x1 + 1 - PHONE.r, cy0 = PHONE.y0 + PHONE.r, cy1 = PHONE.y1 + 1 - PHONE.r
  for (let y = PHONE.y0; y <= PHONE.y1; y++) {
    for (let x = PHONE.x0; x <= PHONE.x1; x++) {
      if (!inP(x, y)) continue
      let col = C.body
      if (onEdge(inP, x, y)) {
        // The rim's outward normal (from the rounded rectangle's inner box) against a light from the top left.
        const nx = x + 0.5 - clamp(x + 0.5, cx0, cx1), ny = y + 0.5 - clamp(y + 0.5, cy0, cy1)
        const len = Math.hypot(nx, ny) || 1
        const lit = (-(nx + ny) / len) / Math.SQRT2 // -1 .. 1
        col = mix(C.rimDark, C.rimLit, smooth((lit + 1) / 2))
      }
      c.set(x, y, col)
    }
  }
  // A faint bevel just inside the rim along the top-left corner.
  for (let y = PHONE.y0; y <= PHONE.y0 + 14; y++) {
    for (let x = PHONE.x0; x <= PHONE.x0 + 14; x++) {
      if (!inP(x, y) || onEdge(inP, x, y) || inS(x, y)) continue
      const n = [[x - 1, y], [x, y - 1]].some(([a, b]) => onEdge(inP, a, b))
      if (n && x + y - PHONE.x0 - PHONE.y0 < 14) c.set(x, y, C.bevel)
    }
  }
  // The screen's glass edge: the body pixels touching the screen (8 neighbours).
  for (let y = SCREEN.y0 - 1; y <= SCREEN.y1 + 1; y++) {
    for (let x = SCREEN.x0 - 1; x <= SCREEN.x1 + 1; x++) {
      if (inS(x, y) || !inP(x, y)) continue
      let near = false
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (inS(x + dx, y + dy)) { near = true; break }
      if (near) c.set(x, y, C.glass)
    }
  }
  homeButton(c)
}

function homeButton (c) {
  const inH = inBox(HOME)
  const mark = inBox({ x0: 86, y0: 114, x1: 89, y1: 117, r: 1 }) // the small rounded square in the middle
  for (let y = HOME.y0; y <= HOME.y1; y++) {
    for (let x = HOME.x0; x <= HOME.x1; x++) {
      if (!inH(x, y)) continue
      let col = C.homeCenter
      if (onEdge(inH, x, y)) col = y > (HOME.y0 + HOME.y1) / 2 + 1 ? C.homeRingLow : C.homeRing
      else if (onEdge(mark, x, y)) col = C.homeMark
      c.set(x, y, col)
    }
  }
}

// Fills the screen with fill(x, y) -> RGBA.
function screen (c, fill) {
  const inS = inBox(SCREEN)
  for (let y = SCREEN.y0; y <= SCREEN.y1; y++) for (let x = SCREEN.x0; x <= SCREEN.x1; x++) if (inS(x, y)) c.set(x, y, fill(x, y))
}

// Signal bars and a battery at the right of the status bar (the game draws the clock at the left). No camera pill in
// the middle: an app page's status text ("GPS · Quests", from x 45) runs to about x 111, across the centre.
function statusIcons (c) {
  const put = (x, y, col) => c.set(x, y, over(c.get(x, y), col))
  ;[2, 3, 4, 5].forEach((h, i) => { for (let y = 13 - h; y <= 12; y++) put(115 + i * 2, y, C.status) })
  // Battery: an 8x5 outline, 5 of its 6 inner columns full, a nub on the right.
  for (let x = 124; x <= 131; x++) { put(x, 8, C.statusDim); put(x, 12, C.statusDim) }
  for (let y = 9; y <= 11; y++) { put(124, y, C.statusDim); put(131, y, C.statusDim) }
  for (let y = 9; y <= 11; y++) for (let x = 125; x <= 129; x++) put(x, y, C.status)
  put(132, 10, C.statusDim)
}

function wallpaper (x, y) {
  const t = (y - SCREEN.y0) / (SCREEN.y1 - SCREEN.y0)
  let col = mix(C.wallTop, C.wallBottom, smooth(t))
  const glow = (gx, gy, r, color, k) => {
    const d = Math.hypot((x - gx) * 0.9, y - gy) / r
    if (d < 1) col = mix(col, color, k * (1 - d) * (1 - d))
  }
  glow(124, 26, 70, C.glowA, 0.55)
  glow(48, 96, 64, C.glowB, 0.45)
  return col
}

function home (c) {
  invHeader(c)
  dropShadow(c)
  buttons(c)
  frame(c)
  const inD = inBox(DOCK)
  screen(c, (x, y) => {
    const w = wallpaper(x, y)
    if (!inD(x, y)) return w
    // The dock: the wallpaper lightened like frosted glass, a brighter hairline along its top.
    return over(w, [255, 255, 255, y === DOCK.y0 ? 70 : 40])
  })
  statusIcons(c)
}

function app (c) {
  invHeader(c)
  dropShadow(c)
  buttons(c)
  frame(c)
  screen(c, (x, y) => {
    if (y <= TOOLBAR.y1) return C.toolbar
    if (y === TOOLBAR.line) return C.toolbarLine
    return mix(C.appTop, C.appBottom, (y - TOOLBAR.line) / (SCREEN.y1 - TOOLBAR.line))
  })
  statusIcons(c)
}

module.exports = { home, app, panelTop, panelBottom, panelTexture }
