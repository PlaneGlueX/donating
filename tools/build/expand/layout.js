'use strict'
// The expansion's layout preview (tools/build/expand/PLAN.md section 1), top view only:
//   tools/node/node.exe tools/build/render.js tools/build/expand/layout.js tools/build/expand/layout --views top
// Streets black, sidewalks light gray, each new building's box in its own wool color, the built Rising City and the
// prison's edge gray, the Mansion's hill green, ATMs gold.
const { Build } = require('../mcstruct')

const rect = (x1, z1, x2, z2, fn) => { for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) fn(x, z) }

const STREETS = [ // [x1, z1, x2, z2, walk along: 'x' = the road runs along x (walks on its z edges), 'z' = along z]
  [640, 0, 663, 229, 'z'],    // Bank Street North
  [481, 110, 930, 125, 'x'],  // Gallery Row
  [831, 416, 1300, 444, 'x'], // Main Avenue East
  [1240, 445, 1251, 594, 'z']  // Hill Drive
]
const BUILDINGS = [
  [670, 132, 800, 222, 'yellow_wool'],   // Federal Reserve
  [556, 132, 636, 222, 'magenta_wool'],  // Art Gallery
  [668, 228, 740, 278, 'purple_wool'],   // Nightclub
  [600, 66, 636, 106, 'orange_wool'],    // Lucky Pawn
  [490, 132, 550, 200, 'light_blue_wool'], // Car Wash
  [960, 280, 1110, 405, 'red_wool'],     // Power Plant
  [960, 450, 1060, 545, 'blue_wool'],    // Police HQ
  [1205, 595, 1295, 685, 'white_wool']   // the Mansion
]
const ATMS = [[666, 180], [700, 109], [639, 60], [1000, 415], [1180, 415]]

module.exports.build = () => {
  const b = new Build()
  const P = (x, z, s) => b.set(x, 64, z, s)
  rect(-40, 0, 1500, 800, (x, z) => P(x, z, 'grass_block'))
  rect(-40, 0, 480, 470, (x, z) => P(x, z, 'gray_concrete'))        // the prison (not drawn in detail)
  rect(481, 226, 940, 470, (x, z) => P(x, z, 'light_gray_concrete')) // Rising City, built
  rect(-40, 419, 830, 441, (x, z) => P(x, z, 'black_concrete'))     // the highway and Main Avenue (built)
  rect(640, 230, 663, 418, (x, z) => P(x, z, 'black_concrete'))     // Bank Street (built)
  // the Mansion's hill: a disc of radius 75 round (1250, 640)
  rect(1170, 560, 1330, 720, (x, z) => { if (Math.hypot(x - 1250, z - 640) <= 75) P(x, z, 'moss_block') })
  for (const [x1, z1, x2, z2, along] of STREETS) rect(x1, z1, x2, z2, (x, z) => {
    const edge = along === 'x' ? (z - z1 < 3 || z2 - z < 3) : (x - x1 < 3 || x2 - x < 3)
    P(x, z, edge ? 'smooth_stone' : 'black_concrete')
  })
  for (const [x1, z1, x2, z2, s] of BUILDINGS) rect(x1, z1, x2, z2, (x, z) => P(x, z, s))
  for (const [x, z] of ATMS) rect(x - 2, z - 2, x + 2, z + 2, (xx, zz) => P(xx, zz, 'gold_block'))
  return b
}
