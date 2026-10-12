// The revolver (WeaponMechanics weapons\pistols\357_Magnum.yml, title 357_Magnum, shown as "Old Revolver"; skins
// Default 8, Scope +1000, Sprint +2000, Reload +3000). Remade 2026-10-06 at the Photon Shotgun's level of detail (the
// kit's PG painter, style 'pg', density 4): a recreation of Pixel Gun 3D's Old Revolver drawn by hand from the wiki's
// pictures (its Appearance icon and the "in use" screenshot; nothing taken from the game): a Model 29-style six-shooter
// in bright neutral silver with a red-orange wooden target grip. A long square barrel (two thirds of the gun) in
// chrome bands with a white top over a greyer lower plate (a seam between), a stamped roll mark and a crowned muzzle;
// a chunky black front sight with a glowing red insert (the gun's one lit part); an ejector shroud under the barrel's
// back half with the rod's knurled tip poking out of its stepped front; a boxy frame that reads as the reference's
// dark window (the bright shank and inner post in front, dark straps with white tops, the recoil shield's dark sides)
// around a polished 12-sided cylinder (light and dark flats in turn, a ratchet); a cylinder latch, a low black stepped
// hammer cocked back (it stays under the rear notch aimed), two chunky black rear posts with a white outline around
// the notch, a dark rounded trigger guard and a wide trigger; a nearly straight square-butt target stock with a
// stair-stepped back, a front swell under the guard, a metal backstrap and two silver escutcheons toward its back.
// Hidden until the reload: the six spent cases, six new rounds and the speedloader that holds them.
// Frames (GunFx: 357_Magnum shot 8, draw 12; the draw is flag 2, both read the Default state's clock):
//   draw (12 ticks): a gunslinger's twirl about the trigger finger in 8 ticks, then it settles;
//   shot (8 ticks): the hammer falls, the flash for two frames, a big kick, then the hammer is cocked back as the
//     cylinder turns a chamber (60 degrees: the 12-gon looks the same after it);
//   reload (40 ticks, one speedloader: no Firearm_Action, so the clock is the same full or empty): the gun lifts and
//     rolls its left side up, the cylinder swings out on its crane, the muzzle tips up and the six cases are pushed
//     out and fall, the muzzle tips down, the speedloader brings six rounds up behind the cylinder and pushes them in,
//     twists off and drops away, a flick of the wrist snaps the cylinder shut (it spins half a turn), the gun rolls
//     back;
//   aimed: the same shot with a smaller kick and an X flash (no spike over the crosshair); still while the draw's
//     clock runs (flag 2: aiming in during the draw); sprinting: held low and canted.
// Built along x, muzzle toward -x, centred on z = 8 (+z is the gun's left: the side first person sees, where the
// cylinder swings out); the sight line is y = SY (the tops of the front blade and the rear posts).
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig, then } = pg
  const name = 'gun_rev'
  const SY = 13.0
  const BY = 11.0 // the barrel's axis (the bore)
  const CY = 10.0 // the cylinder's axis (the top chamber lines up with the barrel: 1 unit above it)
  const XM = -6.0 // the muzzle
  const CX0 = 6.8; const CX1 = 10.95 // the cylinder's front and back
  const CR = 1.45 // the cylinder's flats' distance from its axis (it sits just inside the frame's window, z 6.5-9.5)
  const CHR = 1.0 // the chambers' distance from it
  // The 12-gon: six boxes, each two flats (base T: flats facing +-z; U: facing +-y), turned within +-45 degrees,
  // light and dark in turn (the flutes). Their ends are staggered a hair (no coplanar faces where they overlap) and
  // share one color; no outlines (a flat is 4 texels wide: the light/dark turn and each flat's bevel draw the edges)
  // and no grain (polished: clean flats read as a cylinder in the icon). The T box's back end carries the ratchet.
  const r12 = CR * Math.tan(15 * Math.PI / 180)
  const cyl = [
    [0, 'T', 'cyl'], [30, 'T', 'cylDark'], [-30, 'T', 'cylDark'], [0, 'U', 'cylDark'], [-30, 'U', 'cyl'], [30, 'U', 'cyl']
  ].map(([a, kind, c], i) => {
    const [hy, hz] = kind === 'T' ? [r12, CR] : [CR, r12]
    const long = kind === 'T' ? ['north', 'south'] : ['up', 'down']
    const x0 = CX0 + 0.015 * i; const x1 = CX1 - 0.015 * i
    const deco = []
    // the ratchet on the back end (the T box's back is the one furthest back: it covers the middle; seen in the reload)
    if (kind === 'T' && i === 0) deco.push({ k: 'stamp', face: 'east', at: [8.4, CY + 0.2], to: [7.6, CY - 0.2], rows: ['s##s', 's##s'], keys: { s: 'steel' } })
    return {
      from: [x0, CY - hy, 8 - hz], to: [x1, CY + hy, 8 + hz],
      c: { all: c, west: 'cylEnd', east: 'cylEnd' }, outline: false, grain: 0, dirs: [...long, 'west', 'east'], deco,
      ...(a ? { rot: { angle: a, axis: 'x', origin: [8, CY, 8] } } : {})
    }
  })
  // The six chambers, the top one (k = 0) on the barrel's line.
  const chamber = k => { const a = (90 + 60 * k) * Math.PI / 180; return [CY + CHR * Math.sin(a), 8 + CHR * Math.cos(a)] }
  const square = ([y, z], h, x0, x1, more) => ({ from: [x0, y - h, z - h], to: [x1, y + h, z + h], ...more })
  const six = f => [0, 1, 2, 3, 4, 5].map(k => f(chamber(k), k))
  // The crane's hinge: below the cylinder on the left (it swings out to +z).
  const HINGE = [8, 8.4, 9.5]
  const TOP = 12.5 // the frame's top (the top strap); the barrel's top is 0.5 under it
  const COCK = 27 // degrees the cocked hammer leans back (a shot drops it forward by as much)
  // The frame's sides (z 6.5-9.5: the window around the cylinder); the barrel is narrower (z 7.25-8.75).
  const FZ0 = 6.5; const FZ1 = 9.5
  const HROT = { angle: -COCK, axis: 'z', origin: [13.5, 10.7, 8] }
  // A screw head (a 2x2 stud: glint, base, base, lo) on a box's side faces, centred at (x, y).
  const screw = (x, y, face = 'sides') => ({ k: 'rivets', face, at: [x - 0.25, y + 0.25], to: [x + 0.25, y - 0.25], n: 1, size: 2, c: 'screw' })
  // An escutcheon on the grip: a 2x3 stud (glint, base / base, base / base, shade), centred at (x, y).
  const escutcheon = (x, y) => ({ k: 'stamp', face: 'sides', at: [x - 0.25, y + 0.375], to: [x + 0.25, y - 0.375], rows: ['hs', 'ss', 'sl'], keys: { h: 'screwHi', s: 'screw', l: 'screwLo' } })
  // The silver is polished: clean chrome bands, no grain (the reference's barrel and frame have none).
  const CLEAN = { grain: 0 }
  const gun = pgGun(name, {
    style: 'pg',
    density: 4,
    ink: [8, 8, 10],
    palette: {
      // The silver: neutral, the barrel and the frame alike (the reference has no blue and no darker frame).
      chrome: [236, 236, 236], chromeDark: [162, 162, 162], chromeInk: [72, 72, 76],
      chromeHi: { of: 'chrome', f: 1.06 }, // the window's bright inner post (a gilded skin's gold follows chrome)
      chromeMid: { of: 'chrome', f: 0.8 }, // the barrel's lower plate (the reference's white-over-grey side)
      frame: [226, 226, 226], frameDark: [131, 131, 131], frameInk: [48, 48, 52],
      frameRear: { of: 'frame', f: 0.72 }, // the tang and the backstrap: the reference's light-grey frame rear (#999)
      frameSide: { of: 'frame', f: 0.32 }, // the window's straps, the recoil shield's sides, the guard: dark (gilded: bronze)
      cyl: [222, 222, 222], cylDark: [150, 150, 150], cylEnd: [176, 176, 176],
      // The red-orange target stock (#a93d14); its shade and ink follow it (a skin's wood recolors them too).
      wood: [169, 61, 20], woodDark: [136, 33, 33], woodDeep: { of: 'wood', k: -2 },
      steel: [44, 44, 48], steelHi: [84, 84, 88], // the hammer, the trigger, the latch, the rod's tip
      screw: { of: 'frame', f: 0.9 }, // escutcheons and frame screws (follow the frame's metal)
      screwHi: { of: 'screw', k: 2 }, screwLo: { of: 'screw', k: -1 }, // the escutcheons' glint and shade
      sight: [20, 20, 24], bore: [10, 10, 12], // aimed through: never recolored
      bead: [235, 32, 32], post: [242, 242, 242], // the front sight's glowing insert, the rear notch's white outline
      brass: [228, 184, 78], brassDark: [160, 118, 40], tip: [196, 112, 62],
      loader: [40, 40, 44], loaderHi: [96, 96, 100],
      flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    mats: {
      chrome: 'chrome', chromeHi: 'flat', chromeMid: 'metal', chromeDark: 'metal', chromeInk: 'dark',
      frame: 'chrome', frameDark: 'metal', frameInk: 'dark', frameRear: 'metal', frameSide: 'metal',
      cyl: 'chrome', cylDark: 'metal', cylEnd: 'metal',
      wood: 'wood', woodDark: 'wood', woodDeep: 'dark',
      steel: 'dark', steelHi: 'dark', screw: 'metal', screwHi: 'metal', screwLo: 'metal',
      sight: 'flat', bore: 'flat', bead: 'glow', post: 'flat',
      brass: 'metal', brassDark: 'metal', tip: 'metal', loader: 'dark', loaderHi: 'metal',
      flash: 'glow', flashCore: 'glow'
    },
    parts: {
      body: [
        // ---- the barrel: one square box in chrome bands (the top face white), a seam splitting its sides into the
        // bright upper plate and the greyer lower one (a chromeMid band: the reference's white-over-grey side), a
        // roll mark stamped on the lower plate's left (+z: the side first person sees; the icon's side stays clean),
        // the crown and the bore on its face.
        { from: [XM, 9.5, 7.25], to: [5.25, 12.0, 8.75], c: 'chrome', ...CLEAN, dirs: ['north', 'south', 'up', 'down', 'west'], split: { y: [10.75] },
          deco: [
            { k: 'band', face: 'sides', at: [XM, 10.5], to: [5.25, 9.75], c: 'chromeMid' },
            { k: 'stamp', face: 'south', at: [-3.25, 10.25], to: [2.25, 9.75], rows: ['-.--.-.---..-.--.--.-'] },
            { k: 'stamp', face: 'west', at: [7.5, 11.5], to: [8.5, 10.5], rows: ['cccc', 'cbbc', 'cbbc', 'cccc'], keys: { c: 'chromeDark', b: 'bore' } }
          ] },
        // the collar where it enters the frame (a step in the silhouette)
        { from: [5.25, 9.25, 7.0], to: [5.5, 12.25, 9.0], c: 'chromeDark', ink: 'chromeInk' },
        // the front sight: a chunky black block (a wide foot and the blade), its glowing red insert a texel under the
        // blade's top (0.02 proud of its sides and back, so the eye sees a red bar right under the crosshair)
        { from: [XM + 0.25, 12.0, 7.5], to: [XM + 2.5, 12.5, 8.5], c: 'sight', dirs: ['north', 'south', 'up', 'west', 'east'] },
        { from: [XM + 0.5, 12.25, 7.75], to: [XM + 2.25, SY, 8.25], c: 'sight', dirs: ['north', 'south', 'up', 'west', 'east'] },
        { from: [XM + 0.75, 12.5, 7.73], to: [XM + 2.27, 12.75, 8.27], c: 'bead', glow: true, dirs: ['south', 'east'] },
        // the ejector shroud under the barrel's back half, its stepped front (the rod's knurled tip pokes out of it:
        // the crane) and a pin
        { from: [1.25, 8.5, 7.25], to: [5.5, 9.5, 8.75], c: { all: 'frameDark', down: 'chromeInk' }, dirs: ['north', 'south', 'down', 'west'],
          deco: [screw(4.5, 9.0)] },
        { from: [0.75, 8.75, 7.5], to: [1.25, 9.5, 8.5], c: 'frameDark', dirs: ['north', 'south', 'down', 'west'] },
        // ---- the frame: the shank (a yoke screw), the window's bright inner post, the top strap (a sight channel on
        // top), the bottom strap and the recoil shield (wider than the straps; the cylinder latch and two screws on
        // its left). The window reads like the reference's: dark straps and shield sides (frameSide) with white tops,
        // the bright shank and inner post at its front.
        { from: [5.5, 7.5, FZ0], to: [6.5, TOP, FZ1], c: { all: 'frame', down: 'frameDark' }, ...CLEAN, deco: [screw(6.0, 8.25)] },
        { from: [6.5, 8.5, 6.75], to: [6.75, 11.5, 9.25], c: 'chromeHi', outline: false, dirs: ['north', 'south'] },
        { from: [6.5, 11.5, FZ0], to: [11.0, TOP, FZ1], c: { all: 'frameSide', up: 'frame' }, ...CLEAN, dirs: ['north', 'south', 'up', 'down'],
          deco: [{ k: 'slots', face: 'up', at: [7.0, 7.75], to: [11.0, 8.25] }, { k: 'slots', face: 'down', at: [7.0, 7.75], to: [10.5, 8.25] }] },
        { from: [6.5, 7.5, FZ0], to: [11.0, 8.5, FZ1], c: 'frameSide', ...CLEAN, dirs: ['north', 'south', 'up', 'down'],
          deco: [{ k: 'slots', face: 'down', at: [7.0, 7.75], to: [10.5, 8.25] }, { k: 'slots', face: 'up', at: [7.25, 7.75], to: [10.75, 8.25] }] }, // the bolt's slot under the cylinder
        { from: [11.0, 7.25, FZ0 - 0.25], to: [12.5, TOP, FZ1 + 0.25], c: { all: 'frame', north: 'frameSide', south: 'frameSide', down: 'frameDark' }, ...CLEAN,
          deco: [screw(11.75, 11.75), screw(11.75, 7.75)] },
        { from: [11.25, 9.0, FZ1 + 0.25], to: [12.25, 9.75, FZ1 + 0.5], c: 'steel', pat: 'knurl', dirs: ['north', 'south', 'up', 'down', 'west', 'east'] }, // the latch (+z)
        // the rear sight: a black base on the strap and two chunky posts (the notch between them, z 7.75-8.25), a
        // white outline around the notch on their backs (what the eye sees aiming)
        { from: [11.0, TOP, 7.0], to: [12.5, 12.75, 9.0], c: 'sight' },
        { from: [11.75, 12.75, 7.0], to: [12.5, SY, 7.75], c: 'sight' },
        { from: [11.75, 12.75, 8.25], to: [12.5, SY, 9.0], c: 'sight' },
        { from: [12.5, 12.75, 7.5], to: [12.52, SY, 7.75], c: 'post', outline: false, dirs: ['east'] },
        { from: [12.5, 12.75, 8.25], to: [12.52, SY, 8.5], c: 'post', outline: false, dirs: ['east'] },
        { from: [12.5, 12.5, 7.5], to: [12.52, 12.75, 8.5], c: 'post', outline: false, dirs: ['east'] },
        // the tang behind the shield (the hammer sits in it), the side plate's line and a screw; the lower frame down to the guard
        { from: [12.5, 7.0, 7.0], to: [14.25, 11.0, 9.0], c: 'frameRear', ...CLEAN, deco: [{ k: 'slots', face: 'sides', at: [12.5, 9.5], to: [14.25, 9.0] }, screw(13.5, 8.0)] },
        { from: [8.0, 6.75, 7.0], to: [12.5, 7.5, 9.0], c: { all: 'frame', down: 'frameDark' }, ...CLEAN, deco: [{ k: 'rivets', at: [8.5, 7.25], to: [12.0, 7.0], n: 3 }] },
        // the trigger guard (a rounded square loop: three bars and two inner corners) and a wide target trigger
        { from: [8.25, 5.0, 7.5], to: [8.75, 6.75, 8.5], c: 'frameSide' },
        { from: [8.25, 4.5, 7.5], to: [11.5, 5.0, 8.5], c: 'frameSide' },
        { from: [11.0, 5.0, 7.5], to: [11.5, 6.75, 8.5], c: 'frameSide' },
        { from: [8.75, 5.0, 7.75], to: [9.0, 5.25, 8.25], c: 'frameSide', outline: false },
        { from: [10.75, 5.0, 7.75], to: [11.0, 5.25, 8.25], c: 'frameSide', outline: false },
        { from: [9.5, 5.5, 7.75], to: [10.25, 6.75, 8.25], c: 'steelHi', pat: { all: 'flat', north: 'groove', south: 'groove' }, rot: { angle: 15, axis: 'z', origin: [9.875, 6.75, 8] } },
        // ---- the target stock: one wood panel with two silver escutcheons, its back stair-stepped by two narrow
        // steps (all ink from the side: the reference's black stepped edge), a metal backstrap above them, the front
        // swell under the guard (its outline against the stock is the dark groove); the butt is the wood's dark end,
        // no metal cap.
        { from: [12.25, 1.5, 6.75], to: [14.25, 7.0, 9.25], c: { all: 'wood', up: 'woodDark', down: 'woodDeep' }, ink: 'woodDeep', deco: [escutcheon(13.75, 5.625), escutcheon(13.75, 2.875)] },
        { from: [14.25, 1.5, 6.75], to: [14.75, 4.75, 9.25], c: { all: 'wood', east: 'woodDark', down: 'woodDeep' }, ink: 'woodDeep', dirs: ['north', 'south', 'east', 'up', 'down'] },
        { from: [14.75, 1.5, 6.75], to: [15.25, 2.75, 9.25], c: { all: 'wood', east: 'woodDark', down: 'woodDeep' }, ink: 'woodDeep', dirs: ['north', 'south', 'east', 'up', 'down'] },
        { from: [14.25, 4.75, 7.25], to: [14.75, 7.0, 8.75], c: 'frameRear', ...CLEAN, dirs: ['north', 'south', 'east', 'up'] },
        { from: [11.25, 1.75, 7.0], to: [12.25, 4.5, 9.0], c: { all: 'wood', west: 'woodDark', down: 'woodDeep' }, ink: 'woodDeep', dirs: ['north', 'south', 'west', 'down', 'up'] }
      ],
      // The hammer, cocked (turned back about its pin); a shot drops it forward. A black stepped block (the body a
      // step under the wider spur) with a serrated spur. Aimed, the eye (x ~29.6 on the sight line) must see all of it
      // under the rear notch's white U (y 12.5 at x 12.5): every point, cocked or down, has 13 - y >= 0.0292 (29.6 - x).
      hammer: [
        { from: [13.0, 10.25, 7.5], to: [14.0, 12.25, 8.5], c: 'steel', rot: HROT },
        { from: [13.5, 11.75, 7.25], to: [14.75, 12.5, 8.75], c: 'steel', pat: { all: 'serr', down: 'flat' }, rot: HROT }
      ],
      // The cylinder with its chambers' mouths (front and back): it turns a chamber each shot.
      cyl: [
        ...cyl,
        ...six(c => square(c, 0.3, CX0 - 0.03, CX0 - 0.01, { c: 'bore', dirs: ['west'], outline: false })),
        ...six(c => square(c, 0.3, CX1 + 0.01, CX1 + 0.03, { c: 'bore', dirs: ['east'], outline: false }))
      ],
      // The crane: the ejector rod (inside the shroud while shut) with its knurled tip, and the arm the cylinder swings
      // out on (it doesn't turn with it).
      crane: [
        { from: [0.75, 8.875, 7.875], to: [CX0, 9.125, 8.125], c: 'steel', outline: false }, // the ejector rod
        { from: [0.25, 8.75, 7.75], to: [0.75, 9.25, 8.25], c: 'steelHi', outline: false, pat: 'knurl' }, // its tip
        { from: [6.5, 8.5, 9.0], to: [6.75, 10.5, 9.5], c: 'frameDark', outline: false, rot: { angle: -43, axis: 'x', origin: [6.625, 8.5, 9.25] } } // the crane (inside the frame while shut; no ink: through the window's corner it reads as metal, not a black wedge)
      ],
      // The spent cases (seen only when the cylinder is out; pushed out and dropped by the reload).
      shells: six(c => square(c, 0.33, 9.3, CX1 + 0.35, { c: { all: 'brass', east: 'brassDark' }, outline: false })),
      // Six new rounds (the brass and the bullets' tips) and the speedloader that brings them.
      rounds: [
        ...six(c => square(c, 0.33, 9.3, CX1 + 0.35, { c: { all: 'brass', east: 'brassDark' }, outline: false })),
        ...six(c => square(c, 0.25, 8.5, 9.3, { c: 'tip', outline: false }))
      ],
      loader: [
        // a plus-shaped plate (a middle bar and two arms, on the 1/4 grid) and the knurled knob
        { from: [11.25, CY - 1.5, 7.25], to: [11.75, CY + 1.5, 8.75], c: 'loader', ink: 'loaderHi' },
        { from: [11.25, CY - 0.75, 6.5], to: [11.75, CY + 0.75, 7.25], c: 'loader', ink: 'loaderHi', dirs: ['north', 'east', 'west', 'up', 'down'] },
        { from: [11.25, CY - 0.75, 8.75], to: [11.75, CY + 0.75, 9.5], c: 'loader', ink: 'loaderHi', dirs: ['south', 'east', 'west', 'up', 'down'] },
        { from: [11.75, CY - 0.5, 7.5], to: [13.0, CY + 0.5, 8.5], c: 'loaderHi', pat: 'knurl', ink: 'loader' }
      ],
      flash: [
        { from: [XM - 2.2, BY - 1.2, 6.8], to: [XM, BY + 1.2, 9.2], c: 'flashCore', glow: true },
        { from: [XM - 5.6, BY - 0.5, 7.5], to: [XM - 2.2, BY + 0.5, 8.5], c: 'flash', glow: true },
        { from: [XM - 1.7, BY + 1.2, 7.5], to: [XM - 0.6, BY + 3.0, 8.5], c: 'flash', glow: true },
        { from: [XM - 1.7, BY - 3.0, 7.5], to: [XM - 0.6, BY - 1.2, 8.5], c: 'flash', glow: true },
        { from: [XM - 1.7, BY - 0.5, 5.0], to: [XM - 0.6, BY + 0.5, 6.8], c: 'flash', glow: true },
        { from: [XM - 1.7, BY - 0.5, 9.2], to: [XM - 0.6, BY + 0.5, 11.0], c: 'flash', glow: true }
      ],
      // The aimed flash: an X (the star's top spike would cross the crosshair over the sights, like the AK-48's).
      flashads: [
        { from: [XM - 2.0, BY - 1.0, 7.0], to: [XM, BY + 1.0, 9.0], c: 'flashCore', glow: true },
        { from: [XM - 5.0, BY - 0.45, 7.55], to: [XM - 2.0, BY + 0.45, 8.45], c: 'flash', glow: true },
        { from: [XM - 1.6, BY - 0.4, 4.6], to: [XM - 0.7, BY + 0.4, 11.4], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [XM - 1.15, BY, 8] } },
        { from: [XM - 1.6, BY - 3.4, 7.6], to: [XM - 0.7, BY + 3.4, 8.4], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [XM - 1.15, BY, 8] } }
      ]
    },
    hidden: ['flash', 'flashads', 'shells', 'rounds', 'loader'],
    noFull: ['flash', 'flashads', 'shells', 'rounds', 'loader'],
    display: display({
      firstperson: { rotation: [0, -73, 0], translation: [-4.2, 3.6, -2.4], scale: [0.6, 0.6, 0.6] },
      thirdperson: { rotation: [0, -90, -80], translation: [0, 4.2, 2.6], scale: [0.72, 0.72, 0.72] },
      gui: { rotation: [0, 180, -34], translation: [-0.7, -0.9, 0], scale: [0.66, 0.66, 0.66] },
      ground: { rotation: [0, 0, -45], translation: [0, 4, 0], scale: [0.62, 0.62, 0.62] },
      fixed: { rotation: [0, 0, -45], translation: [0.25, 1.5, -0.25], scale: [0.62, 0.62, 0.62] },
      head: { rotation: [0, -90, 0], translation: [0, 13, 7], scale: [1, 1, 1] }
    }),
    states: {
      // The rear posts' back face is x 12.5 (on the 1/4 grid); rearDepth 1.71 with it gives exactly the old aim
      // transform (rearX 12.6, rearDepth 1.7): 1.71 + 1.6 x 4.5 / 16 = 1.7 + 1.6 x 4.6 / 16.
      ads: aim({ sightY: SY, rearX: 12.5, rearDepth: 1.71, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [-28, -55, 12], translation: [-5.2, 1.4, -2.0], scale: [0.6, 0.6, 0.6] }
    }
  })
  const GRIP = [13.0, 6.4, 8] // the hand
  const FINGER = [10.0, 6.0, 8] // the trigger finger (the twirl's axis)
  const HAMMER = [13.5, 10.7, 8] // the hammer's pin
  const CAXIS = [8.9, CY, 8] // the cylinder's axis
  const turn = deg => rig({ rot: [[[1, 0, 0], deg]], pivot: CAXIS })
  const crane = a => rig({ rot: [[[1, 0, 0], 88 * a]], pivot: HINGE })

  // A shot (GunFx: 8 ticks; frames at p = 1/16, 3/16 ...): the hammer is down, the flash for two frames, the kick
  // (back and muzzle up, k scales it: aiming, smaller), then the hammer is cocked back (from p 0.45) as the cylinder
  // turns a chamber. fl: which flash (aimed, the X: nothing crosses the crosshair).
  const shot = (k = 1, fl = 'flash') => p => {
    const back = 1 - ease.out(Math.min(1, p / 0.8))
    const cock = ease.ramp(p, 0.45, 0.8)
    return {
      show: p < 0.25 ? [fl] : [],
      gun: rig({ t: [1.2 * k * back, 0.35 * k * back, 0], rot: [[[0, 0, 1], -12 * k * back]], pivot: GRIP }),
      hammer: rig({ rot: [[[0, 0, 1], COCK * (1 - cock)]], pivot: HAMMER }),
      cyl: turn(-60 * cock)
    }
  }
  // The draw (GunFx: 12 ticks, flag 2): it comes up from below spinning about the trigger finger (muzzle down
  // first, one turn in 8 ticks, slowing), held a little further out while it spins (the muzzle sweeps back past the
  // hand, not into the camera), then settles.
  const draw = p => {
    const spin = ease.out(Math.min(1, p / 0.67))
    const rise = 1 - ease.out(Math.min(1, p / 0.5))
    const out = ease.bump(p, 0, 0.72, 0.3, 0.38)
    const settle = ease.bump(p, 0.67, 1, 0.78)
    return { gun: rig({ t: [-10 * out, -6 * rise - 4 * out - 0.4 * settle, -2 * out], rot: [[[0, 0, 1], 360 * spin + 3 * settle]], pivot: FINGER }) }
  }
  // The reload (GunFx: 40 ticks, full or empty: no Firearm_Action; frames at p = (k + 0.5) / 40). The gun comes up
  // toward the middle of the screen, rolled so its left side (the cylinder's side) faces up; the cylinder swings out
  // on its crane (p 0.1-0.19); the muzzle tips up and the ejector pushes the six cases out the back (0.27-0.31), they
  // tumble away; the muzzle tips down a little, the speedloader brings six rounds up from below and behind
  // (0.44-0.55), lines them up behind the cylinder and pushes them in (0.55-0.59), twists (0.59-0.63) and drops away;
  // a flick of the wrist snaps the cylinder shut (0.72-0.76), which spins half a turn as the gun settles back.
  // The sounds (357_Magnum.yml Start_Mechanics, ticks after the reload starts; the frame at tick t shows
  // p = (t + 0.5) / 40): open 4 (p 0.11: the latch as the cylinder starts to swing, its stop knock ~2.6 ticks later
  // when it is fully out), eject 11 (0.29: the clunk as the push ends), load 22 (0.56: the rounds seat), close 30
  // (0.76: the snap as it shuts).
  const AXIS = [9, 9.5, 8]
  const LOADER_FROM = [6, -7, 2.5] // where the speedloader comes from (gun space: behind, below, a little left)
  const LOADER_BEHIND = [1.4, 0, 0] // lined up behind the open cylinder
  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
  const move = t => rig({ t })
  const reload = p => {
    const lift = ease.ramp(p, 0, 0.12) * (1 - ease.ramp(p, 0.8, 0.96))
    const open = ease.ramp(p, 0.1, 0.19) * (1 - ease.ramp(p, 0.72, 0.76))
    const up = ease.ramp(p, 0.19, 0.27) * (1 - ease.ramp(p, 0.4, 0.5))
    const down = ease.ramp(p, 0.44, 0.52) * (1 - ease.ramp(p, 0.76, 0.86))
    const flick = ease.bump(p, 0.7, 0.84, 0.745)
    const push = ease.ramp(p, 0.27, 0.31) // the ejector pushes the cases out
    const fall = ease.ramp(p, 0.31, 0.45)
    const spin = ease.ramp(p, 0.76, 0.86) // after the snap: half a turn
    const C = crane(open)
    const pose = {
      gun: rig({
        t: [-1.5 * lift + 0.4 * flick, 2.8 * lift, 2.4 * lift],
        rot: [[[1, 0, 0], -32 * lift + 16 * flick], [[0, 1, 0], 16 * lift], [[0, 0, 1], -40 * up + 12 * down - 5 * flick]],
        pivot: AXIS
      }),
      cyl: then(turn(-180 * spin), C),
      crane: C,
      show: []
    }
    // The spent cases: in the open cylinder, pushed out the back (+x: down, with the muzzle up), then tumbling away.
    if (p > 0.1 && p < 0.45) {
      pose.show.push('shells')
      pose.shells = then(rig({ t: [1.7 * push + 10 * fall * fall, -2 * fall, 0.6 * fall], rot: [[[0, 1, 0], 60 * fall], [[0, 0, 1], -150 * fall]], pivot: [10.5, CY, 8] }), C)
    }
    // The new rounds in the speedloader: up from below and behind, lined up, pushed in (gun space, after the crane:
    // the open cylinder's axis still runs along x); the loader twists off and drops away; the rounds stay in the
    // cylinder until it's shut.
    if (p > 0.44 && p < 0.76) {
      pose.show.push('rounds')
      const come = ease.ramp(p, 0.44, 0.55)
      const seat = ease.ramp(p, 0.55, 0.59)
      const at = come < 1 ? lerp(LOADER_FROM, LOADER_BEHIND, ease.out(come)) : lerp(LOADER_BEHIND, [0, 0, 0], seat)
      pose.rounds = then(C, move(at))
      if (p < 0.71) {
        pose.show.push('loader')
        const twist = ease.ramp(p, 0.59, 0.63)
        const off = ease.ramp(p, 0.63, 0.71)
        pose.loader = then(then(turn(40 * twist), C), move([at[0] + 3.5 * off, at[1] - 5 * off * off, at[2] + 1.5 * off]))
      }
    }
    return pose
  }
  const drawn = gun.flag(2, gun.cooldown('', 12, draw), gun.cooldown('', 8, shot(1)))
  return {
    8: gun.byContext('', drawn),
    // Aimed: WeaponMechanics lets a player aim during the draw (only shooting waits for the equip delay), so while
    // the draw's clock runs (flag 2) the sights hold still; only a shot's clock plays the kick (with the X flash).
    1008: gun.byContext('ads', gun.flag(2, gun.composite('ads'), gun.cooldown('ads', 8, shot(0.45, 'flashads')))),
    2008: gun.byContext('sprint', gun.composite('sprint')),
    3008: gun.byContext('', gun.cooldown('', 40, reload))
  }
}
