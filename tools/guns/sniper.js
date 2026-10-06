// The sniper slot (WeaponMechanics weapons\sniper_rifles\AX_50.yml, title AX_50, shown as "Sniper Rifle"; skins
// Default 13, Scope +1000, Sprint +2000, Reload +3000). 2026-10-06: a recreation of Pixel Gun 3D's default "Sniper
// Rifle" (drawn by hand from the wiki's description and pictures, nothing taken from the game): a long wooden
// M40-style rifle, almost all brown wood (a forend with a dark tip, a sporting stock with a pistol grip, a raised
// cheek rest, a white spacer and a black rubber butt pad), a dark metal barrel with chrome bands, a big black scope
// with chrome rings, turrets and a cyan lens, and the bolt on the LEFT (+z: the side first person sees; PG3D's rifle
// is a left-handed bolt action), a box magazine and a brass case that only shows when it flies out.
// Frames (DonatingPhone GunFx: AX_50 shot 20, draw 40, alone 6, action 16; WeaponMechanics' LEVER action after every
// shot with rounds left: Open 8 ticks, then Close 8, its sounds at ticks 6 and 12):
//   - a shot: the flash (2 ticks), a big kick (3 back, 14 degrees muzzle up) spent by tick 6, then the bolt in ticks
//     after the shot: up 6-7.6, back 7.6-9.6 (the case flips out of the port), forward 10.4-12, down 12-13.6, the gun
//     canted a little toward the eye meanwhile, at rest by tick 17. The last round works no bolt: GunFx cuts the clock
//     at tick 6 (alone), where the kick is spent and the bolt hasn't moved.
//   - flag 1 (GunFx's action clock, 16 ticks): a bolt WeaponMechanics works without a shot (after a weapon swap
//     mid-cycle): the same bolt at the same ticks, with no kick and no flash.
//   - flag 2 (the draw, 40 ticks): the rifle swings up from below (by tick 14), then the bolt is checked (up, back,
//     forward, down at ticks 20-27.6, no case); the draw sound carries the bolt's clicks at 1.0 and 1.3 s.
//   - Reload (60 ticks with rounds left; 76 from empty, when WeaponMechanics opens the bolt first and closes it last):
//     the gun cants its belly toward the eye, the bolt opens (a case flips out), the magazine drops out along its own
//     axis, a new one rises and seats with a jolt, the bolt closes, the gun rolls back.
//   - Scope: aim() on the scope's axis, a long hollow tube (scale [0.41, 4, 4]): a black eyepiece rim, an octagonal
//     black funnel, a thin cyan ring at the objective and a window about 55% of the screen's height with duplex
//     posts (thick outside, thin toward the crosshair; the centre left open). No overlay: the world shows through the
//     window and at the screen's sides, with or without the FOV-effects slider (the first-person item is drawn at a
//     fixed 70 degrees; zoom never scales it). The lens has no face toward the eye (culled from inside), and the part
//     noads (the eyepiece's glass, which faces the eye, and the right-hand windage turret, which stuck into the view
//     at the right edge on 16:10 and wider screens) is hidden while aiming. The Scope state never draws the bolt: the
//     kick only (translations: the state's scale is 10x deeper than wide, so a turn would be amplified), and nothing
//     for the draw or action clocks.
// Built along x, muzzle toward -x, centred on z = 8; the sight line is the scope's axis, y = SY. Every box stays
// within the client's element bounds, -16..32 on each axis (a model with one box outside fails to load: the missing-
// model cube): the rifle is exactly 48 units long, muzzle face at x = -16, butt pad at 32, and the muzzle flash is
// drawn 9 units back inside the bounds and moved out to the muzzle by its frame's transformation.
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig, then } = pg
  const name = 'gun_sniper'
  const SY = 12.8 // the scope's axis
  const HI = 1.2 // the scope's inner half-size (the view through it)
  const BORE = 8.6
  // The colour of a box's faces: c (a key or { all, up, ... }), with the face toward the scope's axis set to inner.
  const faces = (c, face, inner) => {
    const base = typeof c === 'string' ? { all: c } : { ...c }
    if (inner) base[face] = inner
    return base
  }
  // A hollow square tube along x around the scope's axis: walls from the inner half-size hi to the outer ho.
  const tube = (x0, x1, ho, hi, c, inner, more = {}) => [
    { from: [x0, SY - ho, 8 + hi], to: [x1, SY + ho, 8 + ho], c: faces(c, 'north', inner), ...more }, // left (+z)
    { from: [x0, SY - ho, 8 - ho], to: [x1, SY + ho, 8 - hi], c: faces(c, 'south', inner), ...more }, // right (-z)
    { from: [x0, SY + hi, 8 - hi], to: [x1, SY + ho, 8 + hi], c: faces(c, 'down', inner), ...more }, // top
    { from: [x0, SY - ho, 8 - hi], to: [x1, SY - hi, 8 + hi], c: faces(c, 'up', inner), ...more } // bottom
  ]
  // The corners of the opening cut off (an octagon, rounder through the scope): a slab at the inner half-size,
  // turned 45 degrees about the axis, in each corner.
  const W8 = HI * Math.tan(Math.PI / 8) + 0.03
  const T8 = HI * (Math.SQRT2 - 1) + 0.08
  const corners = (x0, x1, inner) => [45, -45].flatMap(angle => [
    { from: [x0, SY + HI, 8 - W8], to: [x1, SY + HI + T8, 8 + W8], c: { all: 'scopeIn', down: inner }, outline: false, rot: { angle, axis: 'x', origin: [x0, SY, 8] } },
    { from: [x0, SY - HI - T8, 8 - W8], to: [x1, SY - HI, 8 + W8], c: { all: 'scopeIn', up: inner }, outline: false, rot: { angle, axis: 'x', origin: [x0, SY, 8] } }
  ])
  // Duplex posts at the objective's inner end (facing the eye only): thick from the wall to 0.45 of the opening,
  // thin from there to 0.12 (the crosshair's gap).
  const XP = [2.75, 2.85]
  const post = (y0, y1, z0, z1) => ({ from: [XP[0], y0, z0], to: [XP[1], y1, z1], c: 'reticle', outline: false, dirs: ['east'] })
  const TK = 0.035; const TN = 0.013 // half-thicknesses
  const R1 = 0.45 * HI; const R0 = 0.12 * HI
  const posts = [
    post(SY + R1, SY + HI, 8 - TK, 8 + TK), post(SY - HI, SY - R1, 8 - TK, 8 + TK),
    post(SY - TK, SY + TK, 8 + R1, 8 + HI), post(SY - TK, SY + TK, 8 - HI, 8 - R1),
    post(SY + R0, SY + R1, 8 - TN, 8 + TN), post(SY - R1, SY - R0, 8 - TN, 8 + TN),
    post(SY - TN, SY + TN, 8 + R0, 8 + R1), post(SY - TN, SY + TN, 8 - R1, 8 - R0)
  ]
  const SCOPE = { all: 'scope', up: 'scopeT' }
  // The bolt handle droops a little (turned 22.5 degrees down about the bolt's axis).
  const HANDLE = { angle: 22.5, axis: 'x', origin: [15.6, 9.2, 8] }
  const FLASH_BACK = 9 // the flash is drawn this far back (+x) inside the bounds and moved out by its frame
  // The client's element bounds: every from, to and rotation origin within -16..32 (CuboidModelElement's
  // deserializer throws outside it, and the whole model file fails to load). Checked before anything is written.
  const inBounds = spec => {
    for (const [part, boxes] of Object.entries(spec.parts)) {
      boxes.forEach((b, i) => {
        for (const [what, v] of [['from', b.from], ['to', b.to], ['origin', b.rot && b.rot.origin]]) {
          if (v && v.some(c => !(c >= -16 - 1e-9 && c <= 32 + 1e-9))) throw new Error(`sniper.js: ${part} box ${i} ${what} [${v.join(', ')}] is outside the client's -16..32`)
        }
      })
    }
    return spec
  }
  const gun = pgGun(name, inBounds({
    palette: {
      wood: [150, 84, 38], woodL: [192, 118, 58], woodD: [104, 54, 22], woodDD: [70, 36, 14],
      gun: [70, 74, 86], gunL: [112, 118, 132], gunD: [40, 42, 50],
      chrome: [214, 222, 234], chromeD: [150, 160, 176],
      scope: [30, 32, 38], scopeT: [56, 60, 70], scopeIn: [12, 13, 16], rubber: [22, 22, 26],
      lens: [64, 220, 236], lensB: [200, 252, 255], glass: [22, 70, 86], glassB: [110, 214, 232],
      pad: [34, 32, 34], spacer: [232, 228, 216],
      brass: [228, 184, 78], brassD: [168, 124, 44],
      bore: [12, 12, 14], reticle: [6, 6, 8],
      flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    parts: {
      body: [
        // The barrel: dark metal, a muzzle cap with the bore (its face at x = -16, the bounds' edge), three chrome
        // bands.
        { from: [-14.8, BORE - 0.7, 7.3], to: [6.4, BORE + 0.7, 8.7], c: { all: 'gun', up: 'gunL' }, pat: 'chrome' },
        { from: [-15.98, BORE - 0.85, 7.15], to: [-14.58, BORE + 0.85, 8.85], c: { all: 'gunD', up: 'gun' } },
        { from: [-16.0, BORE - 0.4, 7.6], to: [-15.98, BORE + 0.4, 8.4], c: 'bore', dirs: ['west'], outline: false },
        { from: [-13.8, BORE - 0.85, 7.15], to: [-13.0, BORE + 0.85, 8.85], c: 'chrome', pat: 'chrome', ink: 'chromeD' },
        { from: [-9.0, BORE - 0.85, 7.15], to: [-8.2, BORE + 0.85, 8.85], c: 'chrome', pat: 'chrome', ink: 'chromeD' },
        { from: [-4.4, BORE - 0.85, 7.15], to: [-3.6, BORE + 0.85, 8.85], c: 'chrome', pat: 'chrome', ink: 'chromeD' },
        // The stock: a dark forend tip, the forend (the barrel half sunk in it), the bedding under the action, the
        // wrist, a pistol grip raked back, the butt with a lower heel, the cheek rest, a white spacer, the rubber pad.
        { from: [-3.4, 6.5, 6.95], to: [-2.2, 8.5, 9.05], c: 'woodDD', ink: 'woodDD' },
        { from: [-2.2, 6.1, 6.85], to: [6.6, 8.5, 9.15], c: { all: 'wood', up: 'woodL' }, pat: 'grain', ink: 'woodDD' },
        { from: [6.6, 5.6, 6.8], to: [17.0, 8.3, 9.2], c: { all: 'wood', up: 'woodL' }, pat: 'grain', ink: 'woodDD' },
        { from: [17.0, 5.4, 6.85], to: [21.6, 9.3, 9.15], c: { all: 'wood', up: 'woodL' }, pat: 'grain', ink: 'woodDD' },
        { from: [17.6, 2.6, 6.95], to: [20.6, 5.8, 9.05], c: 'wood', pat: 'grain', ink: 'woodDD', rot: { angle: 22.5, axis: 'z', origin: [19.1, 5.6, 8] } },
        { from: [17.2, 2.5, 6.9], to: [20.9, 3.1, 9.1], c: 'woodDD', ink: 'woodDD', rot: { angle: 22.5, axis: 'z', origin: [19.1, 5.6, 8] } },
        { from: [21.6, 4.4, 6.8], to: [31.0, 9.7, 9.2], c: { all: 'wood', up: 'woodL' }, pat: 'grain', ink: 'woodDD' },
        { from: [23.6, 3.4, 6.85], to: [31.0, 4.4, 9.15], c: 'wood', pat: 'grain', ink: 'woodDD' },
        { from: [22.6, 9.7, 7.05], to: [29.6, 10.6, 8.95], c: { all: 'woodL', up: 'woodL' }, pat: 'grain', ink: 'woodD' },
        { from: [30.85, 3.3, 6.75], to: [31.15, 10.0, 9.25], c: 'spacer', outline: false },
        { from: [31.15, 3.1, 6.65], to: [32.0, 10.2, 9.35], c: 'pad', pat: 'speck' },
        // Sling studs under the forend and the butt.
        { from: [0.4, 5.6, 7.6], to: [1.2, 6.1, 8.4], c: 'chrome', ink: 'chromeD' },
        { from: [27.6, 2.9, 7.6], to: [28.4, 3.4, 8.4], c: 'chrome', ink: 'chromeD' },
        // The receiver: gunmetal, the front ring, the ejection port and the bolt's track on the left (+z), the
        // bolt shroud at the back.
        { from: [6.4, 8.3, 7.05], to: [16.6, 10.4, 8.95], c: { all: 'gun', up: 'gunL' }, pat: 'chrome' },
        { from: [6.0, 8.1, 6.95], to: [6.9, 10.6, 9.05], c: 'gunD', ink: 'gun' },
        { from: [10.0, 8.85, 8.95], to: [14.0, 9.95, 9.0], c: 'bore', ink: 'gunD', dirs: ['south'] },
        { from: [14.0, 9.1, 8.95], to: [17.4, 9.4, 9.0], c: 'bore', outline: false, dirs: ['south'] },
        { from: [16.6, 8.6, 7.35], to: [17.6, 9.9, 8.65], c: 'gunD', ink: 'gun' },
        // The trigger guard (gunmetal), the trigger.
        { from: [13.0, 4.5, 7.5], to: [17.2, 5.0, 8.5], c: 'gunD', ink: 'gun' },
        { from: [13.0, 5.0, 7.5], to: [13.5, 5.6, 8.5], c: 'gunD', ink: 'gun' },
        { from: [14.8, 5.0, 7.75], to: [15.3, 5.6, 8.25], c: 'chrome', ink: 'chromeD', rot: { angle: 22.5, axis: 'z', origin: [15.05, 5.6, 8] } },
        // The scope: two mounts and chrome rings, the objective bell (its inside faintly cyan: a glass rim seen
        // through the scope), a step, the main tube, the rubber eyepiece; turrets on top and on the right; the cyan
        // lens standing out in front (outward faces only: the view through the scope never sees it); inside an
        // octagonal black funnel and the duplex posts.
        { from: [7.2, 10.4, 7.45], to: [8.2, SY - 1.45, 8.55], c: 'gunD', ink: 'gun' },
        { from: [12.4, 10.4, 7.45], to: [13.4, SY - 1.45, 8.55], c: 'gunD', ink: 'gun' },
        ...tube(7.0, 8.4, 1.75, 1.5, 'chrome', null, { pat: 'chrome', ink: 'chromeD' }),
        ...tube(12.2, 13.6, 1.75, 1.5, 'chrome', null, { pat: 'chrome', ink: 'chromeD' }),
        ...tube(2.6, 5.0, 1.95, HI, SCOPE, 'lens', { pat: 'chrome' }),
        ...tube(5.0, 5.8, 1.75, HI, SCOPE, 'scopeIn', { pat: 'chrome' }),
        ...tube(5.8, 14.2, 1.5, HI, SCOPE, 'scopeIn', { pat: 'chrome' }),
        ...tube(14.2, 16.8, 1.7, HI, 'rubber', 'scopeIn'),
        ...corners(2.6, 5.0, 'lens'),
        ...corners(5.0, 16.8, 'scopeIn'),
        { from: [9.2, SY + 1.5, 7.3], to: [10.6, SY + 2.0, 8.7], c: 'gunD', ink: 'gun' },
        { from: [9.0, SY + 2.0, 7.1], to: [10.8, SY + 2.6, 8.9], c: 'chrome', pat: 'chrome', ink: 'chromeD' },
        { from: [1.8, SY - HI - 0.15, 8 - HI - 0.15], to: [2.6, SY + HI + 0.15, 8 + HI + 0.15], c: 'lens', glow: true, dirs: ['west', 'north', 'south', 'up', 'down'] },
        { from: [1.78, SY + 0.25, 8 + 0.2], to: [1.8, SY + 0.75, 8 + 0.7], c: 'lensB', glow: true, dirs: ['west'] },
        ...posts
      ],
      // Hidden while aiming: the eyepiece's glass (dark teal with a glint: it faces the eye) and the windage turret
      // on the right (-z; through the scope it stood at the right edge of 16:10 and wider screens).
      noads: [
        { from: [16.75, SY - HI, 8 - HI], to: [16.8, SY + HI, 8 + HI], c: 'glass', ink: 'scopeIn', dirs: ['east'] },
        { from: [16.8, SY + 0.2, 8 + 0.15], to: [16.82, SY + 0.7, 8 + 0.65], c: 'glassB', outline: false, dirs: ['east'] },
        { from: [9.2, SY - 0.7, 6.0], to: [10.6, SY + 0.7, 6.5], c: 'gunD', ink: 'gun' },
        { from: [9.0, SY - 0.9, 5.4], to: [10.8, SY + 0.9, 6.0], c: 'chrome', pat: 'chrome', ink: 'chromeD' }
      ],
      // The bolt: its body (chrome, seen in the port), the handle out to the left (+z), hanging back a little, and
      // its chrome knob. Lifted about the bolt's axis, pulled back +x.
      bolt: [
        { from: [10.3, 9.05, 8.98], to: [13.7, 9.75, 9.03], c: 'chrome', ink: 'chromeD', dirs: ['south', 'east', 'west', 'up', 'down'] },
        { from: [15.2, 8.95, 8.6], to: [16.0, 9.45, 11.0], c: 'chrome', pat: 'chrome', ink: 'chromeD', rot: HANDLE },
        { from: [14.85, 8.5, 10.6], to: [16.35, 9.9, 12.1], c: 'chrome', pat: 'chrome', ink: 'chromeD', rot: HANDLE }
      ],
      // The box magazine (its top hidden in the stock), a chrome floor plate.
      mag: [
        { from: [9.4, 3.9, 7.25], to: [12.4, 7.8, 8.75], c: 'gunD', ink: 'gun' },
        { from: [9.2, 3.5, 7.15], to: [12.6, 3.9, 8.85], c: 'chrome', ink: 'chromeD' }
      ],
      // A spent case (brass, a darker neck), in the chamber: shown only while it flies out.
      case: [
        { from: [11.0, 8.95, 7.65], to: [13.4, 9.7, 8.35], c: { all: 'brass', down: 'brassD' }, ink: 'brassD' },
        { from: [10.3, 9.1, 7.8], to: [11.0, 9.55, 8.2], c: 'brassD', ink: 'brassD' }
      ],
      // The muzzle flash, drawn FLASH_BACK units back from where it shows (the bounds stop at x = -16; the frame's
      // transformation moves it out to the muzzle): a core on the muzzle face, a long tongue, a star of short rays.
      flash: [
        { from: [-18.8, BORE - 1.3, 6.7], to: [-16.0, BORE + 1.3, 9.3], c: 'flashCore', glow: true },
        { from: [-24.4, BORE - 0.5, 7.5], to: [-18.8, BORE + 0.5, 8.5], c: 'flash', glow: true },
        { from: [-18.2, BORE + 1.3, 7.5], to: [-16.8, BORE + 4.0, 8.5], c: 'flash', glow: true },
        { from: [-18.2, BORE - 4.0, 7.5], to: [-16.8, BORE - 1.3, 8.5], c: 'flash', glow: true },
        { from: [-18.2, BORE - 0.5, 4.0], to: [-16.8, BORE + 0.5, 6.7], c: 'flash', glow: true },
        { from: [-18.2, BORE - 0.5, 9.3], to: [-16.8, BORE + 0.5, 12.0], c: 'flash', glow: true },
        { from: [-18.0, BORE - 0.45, 4.8], to: [-17.0, BORE + 0.45, 11.2], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [-17.5, BORE, 8] } },
        { from: [-18.0, BORE - 0.45, 4.8], to: [-17.0, BORE + 0.45, 11.2], c: 'flash', glow: true, rot: { angle: -45, axis: 'x', origin: [-17.5, BORE, 8] } }
      ].map(b => ({ ...b, from: [b.from[0] + FLASH_BACK, b.from[1], b.from[2]], to: [b.to[0] + FLASH_BACK, b.to[1], b.to[2]], ...(b.rot ? { rot: { ...b.rot, origin: [b.rot.origin[0] + FLASH_BACK, b.rot.origin[1], b.rot.origin[2]] } } : {}) }))
    },
    hidden: ['flash', 'case'],
    noFull: ['flash', 'case'],
    display: display({
      firstperson: { rotation: [-6, -78, 0], translation: [-5.4, 2.8, -1.6], scale: [0.58, 0.58, 0.58] },
      thirdperson: { rotation: [0, -90, 0], translation: [0, 1.4, -5.6], scale: [0.66, 0.66, 0.66] },
      gui: { rotation: [0, 180, -42], translation: [-0.5, 0.4, 0], scale: [0.41, 0.41, 0.41] },
      ground: { rotation: [0, 0, -45], translation: [-1, 7, 0], scale: [0.7, 0.7, 0.7] },
      fixed: { rotation: [0, 0, -45], translation: [-0.75, 0.75, -1], scale: [0.7, 0.7, 0.7] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: 16.8, rearDepth: 0.45, scale: [0.41, 4, 4] }),
      sprint: { rotation: [-20, -25, 0], translation: [-9.5, 2.4, 1.4], scale: [0.5, 0.5, 0.5] }
    }
  }))

  const SHOULDER = [20, 7.0, 8] // the grip's top: kicks turn the muzzle up about it
  const BOLT = [15.6, 9.2, 8] // the bolt's axis
  const CANT = [12, 9, 8]
  const TRAVEL = 3.2 // how far the bolt comes back (units)
  const LIFT = 62 // how far the handle turns up (degrees)
  // The bolt by ticks after WeaponMechanics starts the action (Open at tick 0, its sound at 6; Close at 8, its sound
  // at 12, when the bolt is forward and turning down).
  const boltAt = t => ({
    lift: ease.ramp(t, 6.0, 7.6) - ease.ramp(t, 12.0, 13.6),
    back: ease.ramp(t, 7.6, 9.6) - ease.ramp(t, 10.4, 12.0)
  })
  const boltRig = ({ lift, back }) => rig({ t: [TRAVEL * back, 0, 0], rot: [[[1, 0, 0], -LIFT * lift]], pivot: BOLT })
  // The cant while the bolt is worked: the left side (the bolt) a little up toward the eye, a nod at the lock.
  const cantRig = (roll, nod = 0) => rig({ t: [0.3 * roll, -0.5 * roll + 0.25 * nod, 0.4 * roll], rot: [[[1, 0, 0], -11 * roll], [[0, 1, 0], 5 * roll], [[0, 0, 1], 1.5 * nod]], pivot: CANT })
  // The case out of the port (s 0 -> 1): out to the left, up 2.5 (at s 0.3), tumbling, then falling out of the view.
  const caseRig = s => rig({ t: [1.0 * s, 16.7 * s - 27.8 * s * s, 0.9 + 5 * s], rot: [[[0, 1, 0], 70 * s], [[0, 0, 1], -330 * s]], pivot: [12, 9.3, 8] })
  // The bolt cycle in ticks (shared by the shot and the action alone), with the case and the cant (back by tick end).
  const cycle = (t, rollIn, pose, end) => {
    const b = boltAt(t)
    pose.bolt = boltRig(b)
    const roll = rollIn * (1 - ease.ramp(t, 13.6, end))
    const nod = ease.bump(t, 12.8, 15.2, 13.6)
    pose.gun = pose.gun ? then(pose.gun, cantRig(roll, nod)) : cantRig(roll, nod)
    if (t > 8.4 && t < 14.8) {
      pose.show.push('case')
      pose.case = caseRig((t - 8.4) / 6.4)
    }
    return pose
  }
  // A shot (GunFx: 20 ticks): the flash for 2 ticks, the kick spent by tick 6 (where GunFx cuts the last round's
  // clock), then the bolt.
  const shot = p => {
    const t = 20 * p
    const kv = p < 0.3 ? Math.pow(1 - p / 0.3, 2) : 0
    const pose = {
      show: p < 0.1 ? ['flash'] : [],
      gun: rig({ t: [3.0 * kv, 0.5 * kv, 0], rot: [[[0, 0, 1], -14 * kv]], pivot: SHOULDER })
    }
    if (p < 0.1) pose.flash = rig({ t: [-FLASH_BACK, 0, 0] }) // out to the muzzle (it's drawn FLASH_BACK back)
    return cycle(t, ease.ramp(t, 6, 8), pose, 17)
  }
  // The bolt alone (flag 1, 16 ticks): the gun cants in over the first ticks, the same bolt at the same ticks.
  const action = p => {
    const t = 16 * p
    return cycle(t, ease.ramp(t, 0.5, 5), { show: [] }, 15.6)
  }
  // The draw (flag 2, 40 ticks): up from below (muzzle down, rolled out) by tick 14 with a small settle, then the
  // bolt checked: the same bolt 14 ticks later (up 20-21.6, back 21.6-23.6, forward 24.4-26, down 26-27.6), no case.
  const draw = p => {
    const t = 40 * p
    const k = 1 - ease.out(Math.min(1, t / 14))
    const settle = ease.bump(t, 13, 19, 15)
    const roll = ease.ramp(t, 17, 20) * (1 - ease.ramp(t, 27.6, 32))
    const nod = ease.bump(t, 26.8, 29.2, 27.6)
    return {
      gun: then(rig({ t: [2.5 * k, -11 * k - 0.4 * settle, 0], rot: [[[0, 0, 1], 32 * k + 2 * settle], [[1, 0, 0], -18 * k]], pivot: SHOULDER }), cantRig(roll, nod)),
      bolt: boltRig(boltAt(t - 14))
    }
  }
  // The reload (GunFx: 60 ticks; 76 from empty, WeaponMechanics' bolt Open 8 first and Close 8 last). The gun cants
  // its belly toward the eye (0-0.07), the bolt opens (up 0.06-0.10, back 0.10-0.15; from empty WeaponMechanics' open
  // sound comes at tick 6 of 76) and a case flips out, the magazine drops out (0.18-0.32), is gone, a new one rises
  // (0.44-0.58) and seats with a jolt (0.6), the bolt closes (forward 0.885-0.94, down 0.94-0.97; from empty the close
  // sound comes at tick 72 of 76 = 0.947), the gun rolls back (0.93-1). The magazine sounds (AX_50.yml Start_Mechanics:
  // ticks after the reload starts, 8 later from empty) split the two lengths: delay = 68p - 4.
  const MAGPOSE = { t: [0.0, 3.2, 0.8], x: -34, y: 20, z: -8 }
  const reload = p => {
    const a = ease.ramp(p, 0, 0.07) * (1 - ease.ramp(p, 0.9, 1))
    const seat = ease.bump(p, 0.57, 0.66, 0.6)
    const lock = ease.bump(p, 0.94, 0.995, 0.965)
    let drop = 0
    if (p < 0.32) drop = ease.ramp(p, 0.18, 0.32); else if (p < 0.44) drop = 1; else drop = 1 - ease.ramp(p, 0.44, 0.58)
    const lift = ease.ramp(p, 0.06, 0.10) - ease.ramp(p, 0.94, 0.97)
    const back = ease.ramp(p, 0.10, 0.15) - ease.ramp(p, 0.885, 0.94)
    const pose = {
      show: [],
      gun: rig({
        t: [MAGPOSE.t[0] * a, MAGPOSE.t[1] * a + 0.4 * seat - 0.2 * lock, MAGPOSE.t[2] * a],
        rot: [[[1, 0, 0], MAGPOSE.x * a], [[0, 1, 0], MAGPOSE.y * a], [[0, 0, 1], MAGPOSE.z * a - 3 * seat + 1.5 * lock]],
        pivot: CANT
      }),
      bolt: boltRig({ lift, back }),
      mag: rig({ t: [0.6 * drop, -12 * drop, 0], rot: [[[0, 0, 1], 8 * drop]], pivot: [10.9, 5.6, 8] }),
      hide: p > 0.32 && p < 0.44 ? ['mag'] : []
    }
    // The case flies out while the bolt comes back (0.12-0.2), landing with the shell sound WeaponMechanics' Open plays
    // from empty (tick 15 of 76 = 0.197).
    if (p > 0.12 && p < 0.2) {
      pose.show.push('case')
      pose.case = caseRig((p - 0.12) / 0.08)
    }
    return pose
  }
  // Aiming: the kick only, as translations (back toward the eye, the view jolting up a little); nothing for the draw
  // or the bolt alone; the part noads (the eyepiece's glass, the right turret) hidden.
  const ADS_REST = { hide: ['noads'] }
  const shotAds = p => {
    const kv = p < 0.3 ? Math.pow(1 - p / 0.3, 2) : 0
    return { hide: ['noads'], gun: rig({ t: [1.6 * kv, 0.12 * kv, 0] }) }
  }
  const adsRest = gun.composite('ads', ADS_REST)
  return {
    13: gun.byContext('', gun.flag(2, gun.cooldown('', 40, draw), gun.flag(1, gun.cooldown('', 16, action), gun.cooldown('', 20, shot)))),
    1013: gun.byContext('ads', gun.flag(2, adsRest, gun.flag(1, adsRest, gun.cooldown('ads', 20, shotAds, ADS_REST)))),
    2013: gun.byContext('sprint', gun.composite('sprint')),
    3013: gun.byContext('', gun.cooldown('', 60, reload))
  }
}
