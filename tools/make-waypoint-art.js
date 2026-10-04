// Locator-bar icons (2026-10-03; the idea "a GPS dot icon of our own"): a waypoint style per kind of place, so the bar
// shows a house for the base, a bag for a shop, a safe for a heist ... instead of the same dot for everything.
// Checked in the 26.3 client jar: a style is assets/<ns>/waypoint_style/<id>.json ({"near_distance", "far_distance",
// "sprites": [...]}, the sprite picked by distance, near first), each sprite assets/<ns>/textures/gui/sprites/hud/
// locator_bar_dot/<id>.png in the GUI atlas (vanilla's are 9x9: a light fill with a dark 4-neighbour outline, and the
// waypoint's color tints the light pixels). The server picks one with `waypoint modify <entity> style set donating:<id>`
// (nav.sk for the POIs, DonatingPhone for the GPS dot and the hunter's mark). Drawn here pixel by pixel (no vanilla
// texture copied): a light icon with the outline added around it, and a small dot for far away (near 96 blocks, far 332:
// the bar's own size cue, like vanilla's shrinking dots; past 332 the server sends a waypoint as a direction only, at
// an infinite distance for the client, so far_distance can't be further: review fix).
// Usage: tools\node\node.exe tools\make-waypoint-art.js   (writes into pack\; then tools\build-pack.js)
const fs = require('fs')
const path = require('path')
const { encode } = require('./png')

const OUT = path.join(__dirname, '..', 'pack', 'assets', 'donating')
const SPRITES = path.join(OUT, 'textures', 'gui', 'sprites', 'hud', 'locator_bar_dot')
const STYLES = path.join(OUT, 'waypoint_style')

// '#' full light, '+' a little darker (shading), '.' empty; the outline is added around them.
const ICONS = {
  base: [ // a house
    '.........',
    '....#....',
    '...###...',
    '..#####..',
    '.#######.',
    '..##+##..',
    '..##+##..',
    '.........',
    '.........'],
  shop: [ // a shopping bag with its handle
    '.........',
    '...###...',
    '...#.#...',
    '.#######.',
    '.#######.',
    '.##+++##.',
    '.#######.',
    '.........',
    '.........'],
  spawn: [ // a star
    '.........',
    '....#....',
    '....#....',
    '.#######.',
    '..#####..',
    '...#.#...',
    '..#...#..',
    '.........',
    '.........'],
  landmark: [ // a diamond
    '.........',
    '....#....',
    '...###...',
    '..##+##..',
    '...###...',
    '....#....',
    '.........',
    '.........',
    '.........'],
  garage: [ // a parking P (a 9-pixel car read as a face)
    '.........',
    '..####...',
    '..##.##..',
    '..##.##..',
    '..####...',
    '..##.....',
    '..##.....',
    '.........',
    '.........'],
  quest: [ // an exclamation mark
    '.........',
    '...###...',
    '...###...',
    '....#....',
    '....#....',
    '.........',
    '....#....',
    '.........',
    '.........'],
  heist: [ // a safe with its dial
    '.........',
    '.#######.',
    '.#+++++#.',
    '.#++#++#.',
    '.#+###+#.',
    '.#++#++#.',
    '.#######.',
    '.........',
    '.........'],
  gps: [ // a map pin
    '.........',
    '..#####..',
    '.###+###.',
    '.##+++##.',
    '.###+###.',
    '..#####..',
    '...###...',
    '....#....',
    '.........'],
  target: [ // a target ring (the hunter's mark on a wanted target)
    '.........',
    '...###...',
    '..#...#..',
    '.#..#..#.',
    '.#.###.#.',
    '.#..#..#.',
    '..#...#..',
    '...###...',
    '.........']
}

// The far sprite: the icon's middle 5x5 scaled into a small 5x5 blob? Too blurry at 5 px; vanilla's far dots are
// plain. Far away every kind shows the same small rounded dot, still in its own color.
const FAR = [
  '.........',
  '.........',
  '.........',
  '...###...',
  '...###...',
  '...###...',
  '.........',
  '.........',
  '.........']

const LIGHT = [255, 255, 255, 255]
const SHADE = [200, 200, 200, 255]
const EDGE = [34, 34, 34, 255]

function draw (rows) {
  if (rows.length !== 9 || rows.some(r => r.length !== 9)) throw new Error('icons are 9x9')
  const px = Buffer.alloc(9 * 9 * 4)
  const at = (x, y) => (x < 0 || y < 0 || x > 8 || y > 8) ? '.' : rows[y][x]
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const c = rows[y][x]
      let col = null
      if (c === '#') col = LIGHT
      else if (c === '+') col = SHADE
      else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) !== '.')) col = EDGE
      if (col) px.set(col, (y * 9 + x) * 4)
    }
  }
  // The outline must stay inside the 9x9 (an icon pixel on the border would lose its edge).
  for (let i = 0; i < 9; i++) for (const [x, y] of [[i, 0], [i, 8], [0, i], [8, i]]) {
    if (rows[y][x] !== '.') throw new Error(`a lit pixel on the border at ${x},${y}`)
  }
  return encode(9, 9, px)
}

fs.mkdirSync(SPRITES, { recursive: true })
fs.mkdirSync(STYLES, { recursive: true })
fs.writeFileSync(path.join(SPRITES, 'far.png'), draw(FAR))
for (const [id, rows] of Object.entries(ICONS)) {
  fs.writeFileSync(path.join(SPRITES, `${id}.png`), draw(rows))
  const style = { near_distance: 96, far_distance: 332, sprites: [`donating:${id}`, `donating:${id}`, 'donating:far'] }
  fs.writeFileSync(path.join(STYLES, `${id}.json`), JSON.stringify(style, null, 2) + '\n')
}
console.log(`waypoint styles: ${Object.keys(ICONS).join(', ')} (+ far) -> ${path.relative(process.cwd(), OUT)}`)
