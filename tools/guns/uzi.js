// The SMG slot (WeaponMechanics weapons\sub_machine_guns\Uzi.yml, title Uzi, shown as "Machine Gun"; skins Default 1,
// Scope +1000, Sprint +2000, Reload +3000, No_Ammo +4000). Since 2026-10-05 a recreation of Pixel Gun 3D's default
// primary, the "Machine Gun" (the owner: the sold guns remade as PG3D's; drawn by hand from the wiki's pictures,
// nothing taken from the game): an MP5-style SMG with a long slate-navy receiver and a ribbed top, a thick handguard
// with a short barrel stub, a hooded front sight and a rear drum sight, the charging handle on the left of the front
// tube, the red fire selector above the grip, a curved steel magazine, a black grip and an angular retractable stock.
// Full-auto: fire held flickers the flash over a steady kick (first person); the Default state's cooldown is the draw
// (GunFx: 20 ticks when it's equipped); the reload follows WeaponMechanics' empty reload (Firearm_Action Open, the
// reload, Close: the charging handle is pulled back and locked first, the curved magazine is swapped along its own
// axis, the handle is slapped home last). Empty, it rests as usual (an MP5's bolt doesn't lock back), so the reload's
// first frame follows on from it. Cops of difficulty 3 hold it.
// Built along x, muzzle toward -x, centred on z = 8 (+z is the gun's left: the side first person sees); the sight
// line is y = SY.
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_uzi'
  const SY = 11.8
  // The curved magazine: three segments, each turned a bit further forward, chained top to bottom.
  const MAG_TOP = [6.6, 6.4]
  const MAG_SEG = [[-5, 2.0], [-15, 1.8], [-26, 1.8]] // [angle about z (negative: the bottom forward), length]
  const magBoxes = []
  {
    let [cx, cy] = MAG_TOP
    MAG_SEG.forEach(([a, len], k) => {
      const z0 = 7.25 + 0.04 * k; const z1 = 8.75 - 0.04 * k // a hair narrower each step: no coplanar faces where they overlap
      const rot = { angle: a, axis: 'z', origin: [cx, cy, 8] }
      const top = cy + (k ? 0.35 : 0) // overlap the segment above (no gap on the outside of the bend)
      magBoxes.push({ from: [cx - 1.2, cy - len, z0], to: [cx - 0.65, top, z1], c: 'magHi', rot, outline: false }) // the light front edge
      magBoxes.push({ from: [cx - 0.65, cy - len, z0 + 0.02], to: [cx + 1.2, top, z1 - 0.02], c: 'mag', ink: 'magDark', rot })
      const r = a * Math.PI / 180
      cx += len * Math.sin(r); cy -= len * Math.cos(r)
      if (k === MAG_SEG.length - 1) magBoxes.push({ from: [cx - 1.35, cy - 0.45, 7.1], to: [cx + 1.35, cy + 0.05, 8.9], c: 'magDark', ink: 'mag', rot: { angle: a, axis: 'z', origin: [cx, cy, 8] } }) // the floor plate
    })
  }
  const BORE_Y = 8.4
  const gun = pgGun(name, {
    palette: {
      body: [44, 49, 66], bodyLight: [107, 117, 144], bodyHi: [154, 164, 188], dark: [22, 25, 34],
      grip: [35, 39, 51], stock: [30, 34, 46], mag: [94, 101, 120], magHi: [160, 168, 186], magDark: [62, 68, 84],
      red: [216, 40, 40], redHi: [255, 80, 80], steel: [120, 128, 142], bore: [10, 11, 15],
      flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    parts: {
      body: [
        // The receiver: a long slate tube, a lighter top edge, a ribbed top.
        { from: [-1.6, 8.0, 6.85], to: [15.6, 10.0, 9.15], c: 'body', ink: 'bodyLight' },
        { from: [-1.6, 10.0, 6.85], to: [15.6, 10.45, 9.15], c: 'bodyLight' },
        { from: [-1.65, 9.85, 6.8], to: [15.65, 10.0, 9.2], c: 'bodyHi', outline: false, dirs: ['north', 'south', 'west', 'east'] }, // a highlight line
        { from: [0.9, 10.45, 7.35], to: [12.4, 10.85, 8.65], c: 'body', pat: 'groove', ink: 'bodyLight' }, // the ribs
        { from: [6.0, 8.6, 6.8], to: [9.2, 9.6, 6.85], c: 'dark', dirs: ['north'] }, // the ejection port (right)
        // The trigger housing and the magazine well.
        { from: [8.2, 6.4, 6.95], to: [15.6, 8.0, 9.05], c: 'body', ink: 'bodyLight' },
        { from: [5.0, 5.8, 6.9], to: [8.2, 8.0, 9.1], c: 'body', ink: 'bodyLight' },
        { from: [5.0, 5.8, 6.85], to: [8.2, 6.2, 9.15], c: 'bodyLight' }, // the well's lip
        // The thick handguard, a lighter top edge, a bevel under it.
        { from: [-1.2, 5.6, 6.55], to: [5.0, 8.4, 9.45], c: 'body', pat: { north: 'groove', south: 'groove', all: 'flat' }, ink: 'bodyLight' },
        { from: [-1.2, 8.4, 6.55], to: [5.0, 8.75, 9.45], c: 'bodyLight' },
        { from: [-1.0, 5.15, 7.0], to: [4.8, 5.6, 9.0], c: 'dark' },
        // The barrel stub out of the front, with a lug ring and a square bore.
        { from: [-4.2, BORE_Y - 0.6, 7.4], to: [-1.2, BORE_Y + 0.6, 8.6], c: 'dark' },
        { from: [-3.1, BORE_Y - 0.85, 7.15], to: [-2.3, BORE_Y + 0.85, 8.85], c: 'body', ink: 'bodyLight' },
        { from: [-4.25, BORE_Y - 0.35, 7.65], to: [-4.2, BORE_Y + 0.35, 8.35], c: 'bore', dirs: ['west'], outline: false },
        // The front sight: a base and a hood (a ring) around the post.
        { from: [-1.6, 10.45, 7.0], to: [0.4, 10.9, 9.0], c: 'body', ink: 'bodyLight' },
        { from: [-1.4, 10.9, 7.0], to: [0.2, 12.6, 7.45], c: 'bodyLight' },
        { from: [-1.4, 10.9, 8.55], to: [0.2, 12.6, 9.0], c: 'bodyLight' },
        { from: [-1.4, 12.6, 7.0], to: [0.2, 13.05, 9.0], c: 'bodyLight' },
        { from: [-0.9, 10.9, 7.75], to: [-0.3, SY, 8.25], c: 'dark' }, // the post
        // The rear drum sight: a ring around the aperture on the sight line.
        { from: [12.8, 10.45, 7.05], to: [14.4, SY - 0.6, 8.95], c: 'body', ink: 'bodyLight' },
        { from: [12.8, SY - 0.6, 7.05], to: [14.4, SY + 0.6, 7.4], c: 'bodyLight' },
        { from: [12.8, SY - 0.6, 8.6], to: [14.4, SY + 0.6, 8.95], c: 'bodyLight' },
        { from: [12.8, SY + 0.6, 7.05], to: [14.4, SY + 0.95, 8.95], c: 'bodyLight' },
        { from: [13.0, SY - 0.4, 6.85], to: [14.2, SY + 0.6, 7.05], c: 'dark' }, // the drum's knob, right
        // The charging handle's tube on the left of the front.
        { from: [-1.2, 9.3, 9.15], to: [5.6, 10.3, 9.6], c: 'body', ink: 'bodyLight' },
        { from: [0.0, 9.6, 9.6], to: [4.8, 10.0, 9.65], c: 'dark', dirs: ['south'] }, // its slot
        // The trigger guard and the trigger.
        { from: [8.2, 4.9, 7.4], to: [11.3, 5.4, 8.6], c: 'body', ink: 'bodyLight' },
        { from: [8.2, 5.4, 7.4], to: [8.7, 6.4, 8.6], c: 'body', ink: 'bodyLight' },
        { from: [9.3, 5.5, 7.75], to: [9.8, 6.4, 8.25], c: 'steel' },
        // The black grip, raked back.
        { from: [10.6, 2.0, 7.0], to: [13.2, 6.4, 9.0], c: 'grip', pat: { north: 'check', south: 'check', all: 'flat' }, rot: { angle: 15, axis: 'z', origin: [11.9, 6.4, 8] } },
        { from: [10.4, 1.5, 6.9], to: [13.4, 2.0, 9.1], c: 'stock', rot: { angle: 15, axis: 'z', origin: [11.9, 6.4, 8] } },
        // The red fire selector above the grip, both sides, with one bright pixel (no outline: on faces this small
        // the ink would paint it all).
        { from: [10.8, 6.55, 9.05], to: [12.9, 7.55, 9.3], c: 'red', outline: false },
        { from: [11.05, 6.8, 9.3], to: [11.55, 7.3, 9.35], c: 'redHi', dirs: ['south'], outline: false },
        { from: [10.8, 6.55, 6.7], to: [12.9, 7.55, 6.95], c: 'red', outline: false },
        { from: [11.05, 6.8, 6.65], to: [11.55, 7.3, 6.7], c: 'redHi', dirs: ['north'], outline: false },
        // The receiver's end cap (the stock's mount).
        { from: [15.6, 7.0, 6.95], to: [16.6, 10.45, 9.05], c: 'stock', ink: 'body' }
      ],
      // The retractable stock (its own part: hidden while aiming, where it would sit against the cheek).
      stock: [
        // Two rails each side down to an angular butt plate.
        { from: [16.6, 9.1, 6.9], to: [21.2, 9.7, 7.5], c: 'stock' },
        { from: [16.6, 9.1, 8.5], to: [21.2, 9.7, 9.1], c: 'stock' },
        { from: [16.2, 6.9, 6.9], to: [21.8, 7.5, 7.5], c: 'stock', rot: { angle: -21, axis: 'z', origin: [16.2, 7.2, 8] } },
        { from: [16.2, 6.9, 8.5], to: [21.8, 7.5, 9.1], c: 'stock', rot: { angle: -21, axis: 'z', origin: [16.2, 7.2, 8] } },
        { from: [21.0, 4.6, 6.8], to: [22.0, 10.1, 9.2], c: 'stock' },
        { from: [22.0, 4.3, 6.9], to: [22.6, 10.3, 9.1], c: 'dark' } // the pad
      ],
      bolt: [
        // The charging handle: a stem out of the tube's slot and a knob.
        { from: [0.3, 9.55, 9.6], to: [0.9, 10.05, 10.6], c: 'steel' },
        { from: [-0.3, 9.15, 10.6], to: [1.5, 10.45, 11.7], c: 'steel', ink: 'bodyHi' }
      ],
      mag: magBoxes,
      flash: [
        { from: [-7.4, BORE_Y - 1.4, 6.6], to: [-4.3, BORE_Y + 1.4, 9.4], c: 'flashCore', glow: true },
        { from: [-11.4, BORE_Y - 0.6, 7.4], to: [-7.4, BORE_Y + 0.6, 8.6], c: 'flash', glow: true },
        { from: [-6.5, BORE_Y + 1.4, 7.4], to: [-5.3, BORE_Y + 4.0, 8.6], c: 'flash', glow: true },
        { from: [-6.5, BORE_Y - 4.0, 7.4], to: [-5.3, BORE_Y - 1.4, 8.6], c: 'flash', glow: true },
        { from: [-6.5, BORE_Y - 0.6, 4.0], to: [-5.3, BORE_Y + 0.6, 6.6], c: 'flash', glow: true },
        { from: [-6.5, BORE_Y - 0.6, 9.4], to: [-5.3, BORE_Y + 0.6, 12.0], c: 'flash', glow: true }
      ],
      // A smaller flash (the flicker's second size).
      flash2: [
        { from: [-6.5, BORE_Y - 1.0, 7.0], to: [-4.3, BORE_Y + 1.0, 9.0], c: 'flashCore', glow: true },
        { from: [-9.3, BORE_Y - 0.45, 7.55], to: [-6.5, BORE_Y + 0.45, 8.45], c: 'flash', glow: true },
        { from: [-5.9, BORE_Y + 1.0, 7.55], to: [-5.0, BORE_Y + 2.8, 8.45], c: 'flash', glow: true },
        { from: [-5.9, BORE_Y - 2.8, 7.55], to: [-5.0, BORE_Y - 1.0, 8.45], c: 'flash', glow: true }
      ]
    },
    hidden: ['flash', 'flash2'],
    noFull: ['flash', 'flash2'],
    display: display({
      firstperson: { rotation: [0, -78, 0], translation: [-4.6, 3.1, -0.8], scale: [0.52, 0.52, 0.52] },
      thirdperson: { rotation: [0, -90, -80], translation: [0, 3, 3], scale: [0.66, 0.66, 0.66] },
      gui: { rotation: [0, 180, -35], translation: [0.8, 0.6, 0], scale: [0.64, 0.64, 0.64] },
      ground: { rotation: [0, 0, -45], translation: [0, 4, 0], scale: [0.6, 0.6, 0.6] },
      fixed: { rotation: [0, 0, -45], translation: [0, 1, 0], scale: [0.6, 0.6, 0.6] },
      head: { rotation: [0, -90, 0], translation: [0, 13, 7], scale: [1, 1, 1] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: 14.4, rearDepth: 1.1, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [-15, -40, 20], translation: [-4.0, 2.0, -1.6], scale: [0.52, 0.52, 0.52] }
    }
  })
  const GRIP = [12, 5.5, 8]
  const MUZZLE = [-5.5, BORE_Y, 8]
  // Fire held (full-auto, 11 shots a second): the gun sits kicked back (k scales it: aiming, less) and each rendered
  // frame shows one of these at random: the flash in two sizes and two turns, or none, over a small jitter. The
  // client re-rolls a non-wobbling random every frame, so the kick is the same in each and only the jitter and the
  // flash change (a whole kick re-rolled every frame would shake).
  const fire = (k, also = {}) => {
    const kick = (dx, dz, up, yaw) => rig({ t: [(0.45 + dx) * k, 0.1 * k, dz * k], rot: [[[0, 0, 1], -(2.8 + up) * k], [[0, 1, 0], yaw * k]], pivot: GRIP })
    return [
      { ...also, show: ['flash'], gun: kick(0.08, 0.05, 0.4, 0.3) },
      { ...also, show: ['flash2'], gun: kick(-0.06, -0.06, -0.3, -0.4), flash2: rig({ rot: [[[1, 0, 0], 45]], pivot: MUZZLE }) },
      { ...also, show: ['flash'], gun: kick(0.1, 0.02, 0.6, -0.2), flash: rig({ rot: [[[1, 0, 0], 45]], pivot: MUZZLE }) },
      { ...also, gun: kick(-0.12, 0, -0.5, 0.1) }
    ]
  }
  // The draw (GunFx: 20 ticks when it's equipped): the gun comes up from below the screen, muzzle down and canted,
  // and levels out.
  const draw = p => {
    const e = 1 - ease.out(Math.min(1, p / 0.9))
    return { gun: rig({ t: [1.5 * e, -8 * e, 0], rot: [[[1, 0, 0], -14 * e], [[0, 0, 1], 30 * e]], pivot: GRIP }) }
  }
  // The reload (GunFx: a cooldown as long as WeaponMechanics' whole reload: 41 ticks empty = Firearm_Action Open 5,
  // the reload 31, Close 5; 31 ticks with rounds left). Timed to the empty one and its sounds (Uzi.yml): p = 0 Open
  // (the handle back and locked, two clicks), 5/41 = 0.12 mag_out, 32/41 = 0.78 mag_in (Start_Mechanics, 27 ticks
  // late), 36/41 = 0.88 Close (the handle slapped home): the gun cants (its top to the right, the magazine side toward
  // the player) and turns to the handle, which is pulled back and held; the curved magazine slides out along its own
  // axis, a new one slides in and is slapped home, the handle is let go (a jolt), the gun comes back level by p = 0.96
  // (the last frame is sampled at 0.99). With rounds left the same moves run in 31 ticks: mag_out at 0, the click 3
  // ticks after the seat, the handle silent.
  const MAG_DIR = (a => [Math.sin(a), -Math.cos(a)])(-5 * Math.PI / 180) // the well's axis (the top segment's): down, a bit forward
  const reload = p => {
    const cant = ease.ramp(p, 0, 0.1) * (1 - ease.ramp(p, 0.86, 0.96))
    const pull = ease.ramp(p, 0.01, 0.07) * (1 - ease.ramp(p, 0.88, 0.92))
    const tug = ease.bump(p, 0.02, 0.12, 0.06)
    const look = ease.bump(p, 0.01, 0.17, 0.05, 0.1) + ease.bump(p, 0.84, 0.95, 0.87, 0.9) // a look at the handle
    const out = ease.ramp(p, 0.12, 0.3)
    const back = ease.ramp(p, 0.5, 0.78)
    const slap = ease.bump(p, 0.78, 0.85, 0.8)
    const kick = ease.bump(p, 0.89, 0.95, 0.905)
    const d = p < 0.5 ? 11 * out : 11 * (1 - back)
    return {
      gun: rig({ t: [0.4 * tug + 0.6 * kick, 1.2 * cant + 0.5 * slap, 0], rot: [[[1, 0, 0], -22 * cant], [[0, 1, 0], 9 * cant + 8 * look], [[0, 0, 1], -3 * slap - 2.5 * kick + 1.5 * tug]], pivot: GRIP }),
      mag: rig({ t: [d * MAG_DIR[0], d * MAG_DIR[1], 0] }),
      bolt: rig({ t: [3.8 * pull, 0, 0] }),
      hide: p > 0.3 && p < 0.5 ? ['mag'] : []
    }
  }
  const AIMED = { hide: ['stock'] }
  // Default: the draw while its cooldown runs, else fire held / the rest pose.
  const drawn = gun.cooldown('', 20, draw)
  drawn.fallback = gun.firing('', fire(1))
  return {
    1: gun.byContext('', drawn),
    1001: gun.byContext('ads', gun.firing('ads', fire(0.45, AIMED), AIMED)),
    2001: gun.byContext('sprint', gun.composite('sprint')),
    3001: gun.byContext('', gun.cooldown('', 41, reload)),
    4001: gun.byContext('', gun.composite(''))
  }
}
