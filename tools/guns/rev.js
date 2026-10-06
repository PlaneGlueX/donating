// The revolver (WeaponMechanics weapons\pistols\357_Magnum.yml, title 357_Magnum, shown as "Old Revolver"; skins
// Default 8, Scope +1000, Sprint +2000, Reload +3000). Added 2026-10-06: a recreation of Pixel Gun 3D's Old Revolver
// (drawn by hand from the wiki's description: "a wooden grip, with a silver cylinder clip, frame, and barrel", six
// rounds, a cylinder that swings out to reload; nothing taken from the game): a western six-shooter, all silver but
// its dark-wood grip: a long octagonal barrel (a stepped octagon: two crossed boxes) with a blade front
// sight, a 12-sided fluted cylinder (six thin boxes turned 30 degrees apart, light and dark flats in turn), a frame
// with a top strap and a notch rear sight, a hammer cocked back, a round trigger guard and a plow-handle grip with a
// silver butt cap. Hidden until the reload: the six spent cases, six new rounds and the speedloader that holds them.
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
// cylinder swings out); the sight line is y = SY (the tops of the front blade and the rear notch).
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig, then } = pg
  const name = 'gun_rev'
  const SY = 13.0
  const BY = 11.0 // the barrel's axis
  const CY = 10.0 // the cylinder's axis (the top chamber lines up with the barrel: 1 unit above it)
  const XM = -2.6 // the muzzle
  const CX0 = 6.8; const CX1 = 10.95 // the cylinder's front and back
  const CR = 1.6 // the cylinder's flats' distance from its axis
  const CHR = 1.0 // the chambers' distance from it
  // The 12-gon: six boxes, each two flats (base T: flats facing +-z; U: facing +-y), turned within +-45 degrees,
  // light and dark in turn (the flutes). Their ends are staggered a hair (no coplanar faces where they overlap) and
  // share one color; no outlines (a flat is 2 texels wide).
  const r12 = CR * Math.tan(15 * Math.PI / 180)
  const cyl = [
    [0, 'T', 'cyl'], [30, 'T', 'cylDark'], [-30, 'T', 'cylDark'], [0, 'U', 'cylDark'], [-30, 'U', 'cyl'], [30, 'U', 'cyl']
  ].map(([a, kind, c], i) => {
    const [hy, hz] = kind === 'T' ? [r12, CR] : [CR, r12]
    const long = kind === 'T' ? ['north', 'south'] : ['up', 'down']
    return {
      from: [CX0 + 0.015 * i, CY - hy, 8 - hz], to: [CX1 - 0.015 * i, CY + hy, 8 + hz],
      c: { all: c, west: 'cylEnd', east: 'cylEnd' }, outline: false, dirs: [...long, 'west', 'east'],
      ...(a ? { rot: { angle: a, axis: 'x', origin: [8, CY, 8] } } : {})
    }
  })
  // The six chambers, the top one (k = 0) on the barrel's line.
  const chamber = k => { const a = (90 + 60 * k) * Math.PI / 180; return [CY + CHR * Math.sin(a), 8 + CHR * Math.cos(a)] }
  const square = ([y, z], h, x0, x1, more) => ({ from: [x0, y - h, z - h], to: [x1, y + h, z + h], ...more })
  const six = f => [0, 1, 2, 3, 4, 5].map(k => f(chamber(k), k))
  // The crane's hinge: below the cylinder on the left (it swings out to +z).
  const HINGE = [8, 8.4, 9.5]
  const TOP = 12.45 // the frame's top (the top strap)
  const COCK = 27 // degrees the cocked hammer leans back (a shot drops it forward by as much)
  const FRAME = { c: 'frame', ink: 'frameInk' }
  const gun = pgGun(name, {
    palette: {
      chrome: [224, 230, 240], chromeDark: [150, 160, 178], chromeInk: [78, 86, 104],
      frame: [176, 184, 200], frameDark: [116, 124, 140], frameInk: [50, 54, 68],
      cyl: [212, 218, 230], cylDark: [116, 124, 142], cylEnd: [156, 164, 180],
      wood: [128, 70, 32], woodDark: [66, 34, 12],
      steel: [92, 98, 112], sight: [34, 38, 48], bore: [14, 15, 20],
      brass: [228, 184, 78], brassDark: [160, 118, 40], tip: [196, 112, 62],
      loader: [44, 48, 58], loaderHi: [96, 102, 118],
      flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    parts: {
      body: [
        // The barrel: a stepped octagon (a tall box and a wide one), its edges a darker silver.
        { from: [XM, BY - 1.15, 7.4], to: [5.6, BY + 1.15, 8.6], c: { all: 'chrome', down: 'chromeDark' }, pat: 'chrome', ink: 'chromeInk' },
        { from: [XM + 0.05, BY - 0.6, 7.0], to: [5.6, BY + 0.6, 9.0], c: { all: 'chrome', down: 'chromeDark' }, pat: 'chrome', ink: 'chromeInk' },
        { from: [XM - 0.02, BY - 0.45, 7.55], to: [XM, BY + 0.45, 8.45], c: 'bore', dirs: ['west'], outline: false }, // the bore
        { from: [XM + 0.4, BY + 1.15, 7.7], to: [XM + 1.5, SY, 8.3], c: 'sight' }, // the front blade
        // The frame: its front (the barrel's shank), the top strap and the bottom strap around the cylinder, the
        // recoil shield behind it, the lower frame down to the trigger guard and the grip. The straps are 0.77 units
        // tall (2 texels: their sides are all outline), so they're outlined in the darker silver, not the ink; the
        // shield's back (what first person and the sights look at) is the frame's own silver.
        { from: [5.5, 7.9, 6.95], to: [CX0 - 0.1, TOP, 9.05], ...FRAME, c: { all: 'frame', down: 'frameDark' } },
        { from: [CX0 - 0.1, CY + CR + 0.08, 7.1], to: [11.0, TOP, 8.9], ...FRAME, ink: 'frameDark' },
        { from: [CX0 - 0.1, 7.55, 7.1], to: [11.0, CY - CR - 0.08, 8.9], ...FRAME, ink: 'frameDark' },
        { from: [11.0, 7.3, 6.75], to: [12.6, TOP, 9.25], ...FRAME },
        // Its back, a plain silver plate a hair behind it: beside the tang and the hammer only 1-texel strips of the
        // shield's back show (all outline), so the sights' view read black; the side views never see this face.
        { from: [12.6, 7.35, 6.8], to: [12.62, TOP - 0.05, 9.2], c: 'frame', dirs: ['east'], outline: false },
        { from: [12.6, 7.0, 7.15], to: [14.3, 10.9, 8.85], ...FRAME }, // the tang behind it (the hammer sits in it)
        { from: [8.0, 6.7, 7.05], to: [12.6, 7.6, 8.95], ...FRAME },
        // The rear notch: two posts at the back of the top strap.
        { from: [11.8, TOP, 7.2], to: [12.6, SY, 7.7], c: 'sight' },
        { from: [11.8, TOP, 8.3], to: [12.6, SY, 8.8], c: 'sight' },
        // The trigger guard (front, bottom, back) and the trigger.
        { from: [8.3, 5.1, 7.45], to: [8.9, 6.7, 8.55], ...FRAME },
        { from: [8.3, 4.6, 7.45], to: [11.5, 5.2, 8.55], ...FRAME },
        { from: [10.9, 5.1, 7.45], to: [11.5, 6.7, 8.55], ...FRAME },
        { from: [9.6, 5.5, 7.75], to: [10.1, 6.7, 8.25], c: 'steel', rot: { angle: 15, axis: 'z', origin: [9.85, 6.7, 8] } },
        // The plow-handle grip: two wood segments bending back, a silver butt cap.
        ...(() => {
          const seg = (top, len, half, a, z0, z1) => ({ from: [top[0] - half, top[1] - len, z0], to: [top[0] + half, top[1], z1], rot: { angle: a, axis: 'z', origin: [top[0], top[1], 8] } })
          const along = (p, a, l) => [p[0] + l * Math.sin(a * Math.PI / 180), p[1] - l * Math.cos(a * Math.PI / 180)]
          const P0 = [13.2, 7.2]
          const J1 = along(P0, 16, 3.3)
          const J2 = along(J1, 32, 2.7)
          return [
            { ...seg(P0, 3.7, 1.55, 16, 6.8, 9.2), c: 'wood', pat: 'grain', ink: 'woodDark' },
            { ...seg(J1, 3.0, 1.5, 32, 6.85, 9.15), c: 'wood', pat: 'grain', ink: 'woodDark' },
            { ...seg(J2, 0.8, 1.65, 42, 6.75, 9.25), ...FRAME }
          ]
        })()
      ],
      // The hammer, cocked (turned back about its pin); a shot drops it forward.
      hammer: [
        { from: [13.05, 10.5, 7.5], to: [14.0, 12.7, 8.5], c: 'frameDark', ink: 'sight', rot: { angle: -COCK, axis: 'z', origin: [13.5, 10.7, 8] } },
        { from: [13.5, 12.0, 7.4], to: [14.9, 12.8, 8.6], c: 'frameDark', pat: 'serr', ink: 'sight', rot: { angle: -COCK, axis: 'z', origin: [13.5, 10.7, 8] } }
      ],
      // The cylinder with its chambers' mouths (front and back): it turns a chamber each shot.
      cyl: [
        ...cyl,
        ...six(c => square(c, 0.3, CX0 - 0.03, CX0 - 0.01, { c: 'bore', dirs: ['west'], outline: false })),
        ...six(c => square(c, 0.3, CX1 + 0.01, CX1 + 0.03, { c: 'bore', dirs: ['east'], outline: false }))
      ],
      // The crane: the ejector rod under the barrel and the arm the cylinder swings out on (it doesn't turn with it).
      crane: [
        { from: [1.9, 9.15, 7.75], to: [CX0, 9.65, 8.25], c: 'steel' }, // the ejector rod
        { from: [1.3, 9.0, 7.6], to: [1.9, 9.8, 8.4], c: 'chromeDark', pat: 'serr' }, // its knob
        { from: [6.4, 8.4, 9.2], to: [6.7, 10.6, 9.8], c: 'frameDark', rot: { angle: -43, axis: 'x', origin: [6.55, 8.4, 9.5] } } // the crane
      ],
      // The spent cases (seen only when the cylinder is out; pushed out and dropped by the reload).
      shells: six(c => square(c, 0.33, 9.3, CX1 + 0.35, { c: { all: 'brass', east: 'brassDark' }, ink: 'brassDark' })),
      // Six new rounds (the brass and the bullets' tips) and the speedloader that brings them.
      rounds: [
        ...six(c => square(c, 0.33, 9.3, CX1 + 0.35, { c: { all: 'brass', east: 'brassDark' }, ink: 'brassDark' })),
        ...six(c => square(c, 0.25, 8.5, 9.3, { c: 'tip', outline: false }))
      ],
      loader: [
        { from: [CX1 + 0.35, CY - 1.4, 7.2], to: [CX1 + 0.85, CY + 1.4, 8.8], c: 'loader', ink: 'loaderHi' },
        { from: [CX1 + 0.36, CY - 0.8, 6.6], to: [CX1 + 0.84, CY + 0.8, 9.4], c: 'loader', ink: 'loaderHi' },
        { from: [CX1 + 0.85, CY - 0.5, 7.5], to: [CX1 + 2.0, CY + 0.5, 8.5], c: 'loaderHi', pat: 'serr', ink: 'loader' }
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
      gui: { rotation: [0, 180, -34], translation: [-0.2, 0.4, 0], scale: [0.76, 0.76, 0.76] },
      ground: { rotation: [0, 0, -45], translation: [0, 4, 0], scale: [0.62, 0.62, 0.62] },
      fixed: { rotation: [0, 0, -45], translation: [0.25, 1.5, -0.25], scale: [0.62, 0.62, 0.62] },
      head: { rotation: [0, -90, 0], translation: [0, 13, 7], scale: [1, 1, 1] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: 12.6, rearDepth: 1.7, scale: [1.6, 2.4, 2.4] }),
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
