// The prison's escape data (ESCAPE-SPEC 3.5, revision 3; data only, no blocks): the outlines, the zones, the breaches
// and the doors that `node tools/build/jail.js points` turns into jailpoints.sk and tools/build/jail-escape-check.js
// tests. Coordinates are the jailbreak world's; boxes are [x1, y1, z1, x2, y2, z2], corners inclusive.

// The outline (Appendix A): the outer perimeter on W1..W7, F1, F2 round the gatehouse booth's south half, F3, the back
// gate and F5. Inside = ray casting on x + 0.5, z + 0.5 (any y). Leaving it = escaped. The front gate row is z 396: past
// its middle (z 396.5) outside the booth's footprint is out.
// Moved from Appendix A by the WP-BUILD review (2026-10-14): Skript tests a player's exact position, so no edge may run
// through a block someone can stand in (the checker's step 12). Max Security's front: z 78.5 ran through the lattice in
// front of it, and a prisoner pressed into a gap there was out (z 78.3): now z 77.5, through the solid wall behind it.
// The main building's north and east faces: z 45.5 and x 128.5 ran through the outer layer's window recesses (a free
// player who stepped in was "inside"): now the inner layer (z 46.5, x 127.5), like its west face (x 42.5). W1's south
// end: the corner (8.5, 214.5) was the open ground just past the wall's end: now (9.5, 213.5) / (8.5, 213.5).
const WALL = [
  [8.5, 73.5], [40.5, 73.5], [42.5, 73.5], [42.5, 46.5], [127.5, 46.5], [127.5, 72.5], [182.5, 72.5], [182.5, 77.5],
  [238.5, 77.5], [238.5, 72.5], [279.5, 72.5], [279.5, 235.5], [381.5, 235.5], [381.5, 396.5], [276.5, 396.5],
  [276.5, 399.5], [268.5, 399.5], [268.5, 396.5], [110.5, 396.5], [110.5, 292.5], [71.5, 292.5], [71.5, 289.5],
  [9.5, 214.5], [9.5, 213.5], [8.5, 213.5]
]

// The inner outline (Appendix A2): between the yard and the lot, on every inner barrier (the police station, the inner
// vehicle gate, the annex's south fence, F4 and the Visitors Building). In the lot = inside WALL and outside INNER.
// Moved from Appendix A2 by the same review: the shared part as in WALL; the police station's south faces (z 322.5 ran
// through the outer layer's window recesses and the garage bays' recess: a prisoner in the lot pressed into one was in
// the yard) now run on the inner layer (z 321.5), from x 195.5 (the station's south-west corner) to F7 (x 339.5); the
// Visitors Building's east face (x 160.5 ran through its window recesses on the plaza: a prisoner pressed into one was in
// the lot) now x 159.5, its inner layer.
const INNER = [
  [8.5, 73.5], [40.5, 73.5], [42.5, 73.5], [42.5, 46.5], [127.5, 46.5], [127.5, 72.5], [182.5, 72.5], [182.5, 77.5],
  [238.5, 77.5], [238.5, 72.5], [279.5, 72.5], [279.5, 235.5], [381.5, 235.5], [381.5, 349.5], [339.5, 349.5],
  [339.5, 321.5], [301.5, 321.5], [301.5, 318.5], [298.5, 318.5], [283.5, 333.5], [268.5, 333.5], [254.5, 319.5],
  [251.5, 319.5], [251.5, 321.5], [195.5, 321.5], [195.5, 322.5], [162.5, 322.5], [162.5, 320.5], [159.5, 320.5],
  [159.5, 298.5], [118.5, 298.5], [118.5, 292.5], [71.5, 292.5], [71.5, 289.5], [9.5, 214.5], [9.5, 213.5], [8.5, 213.5]
]

// Zones (Appendix C). The cell zones cell_n<x0> / cell_s<x0> come from cellblock's cell lists (jail.js points); the
// zone "lot" has no boxes (prison.sk answers it from the two outlines).
const ZONES = {
  b1: [[43, 50, 47, 126, 63, 113]],
  halla: [[79, 64, 192, 127, 72, 204]],
  cross: [[45, 57, 56, 123, 62, 63]],
  sneak: [[81, 57, 48, 87, 62, 55]],
  ventchamber: [[77, 58, 84, 78, 59, 84]],
  crawl: [[61, 57, 84, 76, 59, 84], [61, 57, 82, 61, 59, 83]],
  boiler: [[45, 57, 74, 72, 62, 81]],
  rustycell: [[75, 57, 76, 78, 61, 79]],
  rustydoor: [[77, 57, 76, 78, 60, 79]], // the cell's front half: the door opens from inside (jailcourse.sk)
  ladder: [[64, 58, 88, 64, 64, 88]],
  soup: [[64, 64, 88, 78, 72, 112]],
  hallcend: [[74, 64, 115, 78, 68, 119]],
  hallb: [[80, 64, 113, 88, 72, 192]],
  hallbsouth: [[80, 64, 114, 88, 72, 130]],
  pushback: [[80, 56, 100, 88, 64, 112]],
  stairup: [[80, 56, 100, 88, 67, 112]],
  stairhall: [[80, 63, 114, 88, 67, 116]],
  police: [[195, 63, 285, 338, 85, 322], [252, 63, 286, 300, 85, 334]],
  annex: [[340, 63, 237, 380, 95, 348]],
  staff: [[43, 64, 88, 78, 72, 119]],
  punchbox: [[334, 65, 252, 334, 67, 256]],
  punchapp: [[336, 64, 262, 338, 68, 267]],
  punchhole: [[338, 64, 262, 340, 71, 267]],
  parkour: [[344, 64, 327, 368, 80, 354]],
  plantgate: [[174, 64, 317, 182, 68, 321]],
  gatehole: [[176, 64, 321, 180, 71, 323]],
  polnout: [[209, 64, 282, 212, 68, 284]],
  polnin: [[209, 64, 287, 212, 68, 288]],
  polin: [[209, 64, 318, 212, 68, 320]],
  polexit: [[209, 64, 321, 212, 68, 323]],
  booth: [[270, 64, 393, 274, 69, 397]],
  boothin: [[270, 64, 393, 274, 68, 394]],
  boothapp: [[270, 64, 388, 274, 68, 391]],
  fusebox: [[267, 65, 395, 267, 66, 395]],
  fronthole: [[253, 64, 395, 267, 71, 397], [277, 64, 395, 291, 71, 397]],
  chalk: [[277, 64, 128, 277, 72, 162]],
  // The keycard-only Prison Gun Shop (2026-10-20): its inside (inside the 2-thick walls; the punch box at x 334 and
  // PUNCH_STAND stay outside) is restricted; the door opens for a keycard walking up (gunshopapp) and from inside for
  // anyone (gunshopin).
  gunshop: [[292, 64, 239, 331, 72, 257]],
  gunshopapp: [[314, 64, 259, 318, 68, 262]],
  gunshopin: [[314, 64, 255, 318, 68, 257]]
}

// Breaches (3.5): Skript turns their boxes to air (a blast, the punch box, the console) and puts the stored blocks back.
// The rubble a blast leaves: walkable slabs (and one bar) on air cells with ground under them, so it never blocks the hole.
const BREACHES = {
  gate: [[176, 65, 322, 180, 71, 322]], // the inner vehicle gate between the plaza and the lot (the C4 target)
  punch: [[339, 65, 263, 339, 70, 266]], // F7's punch gate by the Gun Shop (the parkour's way in)
  front: [[253, 65, 396, 267, 71, 396], [277, 65, 396, 291, 71, 396]] // the front gate's two panels (the y 64 track stays)
}
const RUBBLE = {
  gate: [
    [174, 65, 323, 'polished_andesite_slab[type=bottom]'], [176, 65, 324, 'polished_andesite_slab[type=bottom]'],
    [179, 65, 323, 'polished_andesite_slab[type=bottom]'], [181, 65, 324, 'polished_andesite_slab[type=bottom]'],
    [177, 65, 321, 'polished_andesite_slab[type=bottom]'], [178, 65, 324, 'iron_bars']
  ]
}

// Doors (3.5): name -> the lower block of each iron door, or each trapdoor. The cell doors (cell_n<x0>, cell_s<x0>)
// come from cellblock's cell lists (jail.js adds them: (x0 + 2, 58, 55) north row, (x0 + 2, 58, 64) south row).
const DOORS = {
  vent: [[79, 58, 84]],
  ventlids: [[77, 59, 84], [78, 59, 84]],
  rusty: [[79, 58, 78]],
  sogate: [[79, 58, 93], [79, 58, 94]],
  sohatch: [[64, 64, 88]],
  security: [[79, 65, 117]],
  stairgate: [[84, 65, 113], [85, 65, 113]],
  poln: [[210, 65, 286], [211, 65, 286]],
  pols: [[210, 65, 321], [211, 65, 321]],
  booth: [[272, 65, 392]],
  gunshop: [[316, 65, 258]]
}

module.exports = { WALL, INNER, ZONES, BREACHES, RUBBLE, DOORS }
