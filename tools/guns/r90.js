// The shotgun slot (WeaponMechanics weapons\shotguns\R9_0.yml, "Shotgun"; skins Default 14, Scope +1000, Sprint
// +2000, Reload +3000, No_Ammo +4000). Since 2026-10-05 a recreation of Pixel Gun 3D's default pump "Shotgun" (the
// owner: the sold guns remade as PG3D's; drawn by hand from the wiki's picture, nothing taken from the game): a short
// pump gun with no stock, two stacked bright tubes (the barrel over the magazine tube) with open square bores, a
// silver receiver with a big dark ejection port, a grooved dark-wood pump, a red bead at the tip, a dark trigger
// guard and a curved wooden pistol grip raked back. The port is on both sides: with the muzzle toward -x the gun's
// right is -z (the side the inventory icon, the side view and the ground show), while first person and the front-left
// third-person view see +z; PG3D's port is the clearest tell of the gun, so every view gets one.
// Frames (GunFx: R9_0 shot 15 ticks; each shell its own 4-tick reload clock): a shot flashes, kicks the gun back
// and its muzzle up, then the pump is racked back (the bolt slides across the port and a red shell pops out) and
// forward. Reloading, the gun is canted to show the loading port under the receiver and each shell (red, brass base)
// is pushed up into it; the cant is held between shells, so a row of shells doesn't wobble. Empty: the rest pose.
// Built along x, muzzle toward -x, centred on z = 8; the sight line is the tops of the bead and the rear notch, y = SY.
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_r90'
  const SY = 11.9
  // The pistol grip: two segments and a butt cap, each turned about its top (raked back: +angle about z), so the
  // grip bends back as it goes down. P0 = where it meets the receiver; d = (sin a, -cos a).
  const seg = (top, len, half, a, z0, z1) => ({ from: [top[0] - half, top[1] - len, z0], to: [top[0] + half, top[1], z1], rot: { angle: a, axis: 'z', origin: [top[0], top[1], 8] } })
  const along = (p, a, l) => [p[0] + l * Math.sin(a * Math.PI / 180), p[1] - l * Math.cos(a * Math.PI / 180)]
  const P0 = [17.6, 7.4]
  const J1 = along(P0, 18, 3.0) // the bend
  const J2 = along(J1, 30, 2.8) // the butt
  const gun = pgGun(name, {
    palette: {
      silverHi: [250, 250, 250], silver: [220, 223, 228], silverMid: [169, 174, 182], silverDark: [110, 115, 124],
      port: [58, 61, 68], portEdge: [138, 142, 150], bore: [20, 22, 28],
      wood: [138, 74, 32], woodLight: [184, 102, 46], woodDark: [90, 46, 18],
      grip: [154, 82, 38], gripDark: [106, 52, 22],
      guard: [58, 58, 64], steel: [120, 128, 142], bead: [232, 56, 40], beadHi: [255, 120, 96],
      hull: [204, 44, 36], hullDark: [140, 26, 22], brass: [226, 182, 76], brassDark: [168, 124, 44],
      flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    parts: {
      body: [
        // The barrel and the magazine tube under it (no end face: the muzzle faces below are the open bores).
        { from: [-3, 9.2, 7.0], to: [11.5, 11.2, 9.0], c: { all: 'silver', down: 'silverDark' }, pat: 'chrome', dirs: ['north', 'south', 'up', 'down'] },
        { from: [-3, 7.7, 7.25], to: [11.5, 9.2, 8.75], c: { all: 'silverMid', down: 'silverDark' }, pat: 'chrome', dirs: ['north', 'south', 'up', 'down'] },
        // The open square bores: a dark hole with a metal rim (the outline drawn in silver).
        { from: [-3.0, 9.2, 7.0], to: [-2.98, 11.2, 9.0], c: 'bore', ink: 'silverHi', dirs: ['west'] },
        { from: [-3.0, 7.7, 7.25], to: [-2.98, 9.2, 8.75], c: 'bore', ink: 'silverMid', dirs: ['west'] },
        // The band holding the two tubes together, and the bead (red, no outline: at 2 texels a side an outlined
        // bead would be all ink, a black dot between the rear posts when aiming).
        { from: [-1.5, 7.5, 6.8], to: [-0.6, 11.4, 9.2], c: { all: 'silverMid', up: 'silver' } },
        { from: [-2.7, 11.2, 7.55], to: [-1.8, SY, 8.45], c: { all: 'bead', up: 'beadHi', east: 'beadHi' }, outline: false },
        // The receiver.
        { from: [11.5, 7.0, 6.6], to: [19.4, 11.4, 9.4], c: { all: 'silver', down: 'silverMid', east: 'silverMid' }, pat: 'chrome' },
        // The ejection port, both sides (+z for first person, -z for the icon): a light edge around a dark recess.
        { from: [12.9, 8.7, 9.4], to: [17.0, 10.9, 9.45], c: 'portEdge', dirs: ['south', 'up', 'down', 'east', 'west'] },
        { from: [13.15, 8.95, 9.45], to: [16.75, 10.65, 9.47], c: 'port', outline: false, dirs: ['south'] },
        { from: [12.9, 8.7, 6.55], to: [17.0, 10.9, 6.6], c: 'portEdge', dirs: ['north', 'up', 'down', 'east', 'west'] },
        { from: [13.15, 8.95, 6.53], to: [16.75, 10.65, 6.55], c: 'port', outline: false, dirs: ['north'] },
        // The loading port under the receiver.
        { from: [11.9, 6.95, 7.15], to: [14.5, 7.0, 8.85], c: 'port', ink: 'portEdge', dirs: ['down'] },
        // Pins (trigger group) on both sides.
        { from: [17.7, 8.1, 9.4], to: [18.3, 8.7, 9.5], c: 'silverDark', dirs: ['south', 'up', 'down', 'east', 'west'] },
        { from: [17.7, 8.1, 6.5], to: [18.3, 8.7, 6.6], c: 'silverDark', dirs: ['north', 'up', 'down', 'east', 'west'] },
        { from: [13.2, 8.1, 6.5], to: [13.8, 8.7, 6.6], c: 'silverDark', dirs: ['north', 'up', 'down', 'east', 'west'] },
        // The rear notch: two posts at the back of the receiver (the bead shows between them).
        { from: [18.0, 11.4, 7.15], to: [18.8, SY, 7.7], c: 'guard' },
        { from: [18.0, 11.4, 8.3], to: [18.8, SY, 8.85], c: 'guard' },
        // The tang at the back of the receiver (what the eye sees under the notch when aiming).
        { from: [19.4, 8.4, 7.4], to: [19.9, 10.9, 8.6], c: 'guard' },
        // The trigger housing under the receiver, the trigger guard and the trigger.
        { from: [14.4, 6.6, 7.1], to: [19.0, 7.0, 8.9], c: 'guard' },
        { from: [14.6, 5.0, 7.45], to: [17.1, 5.5, 8.55], c: 'guard' },
        { from: [14.6, 5.5, 7.45], to: [15.1, 7.0, 8.55], c: 'guard' },
        { from: [15.85, 5.75, 7.75], to: [16.35, 7.0, 8.25], c: 'steel', rot: { angle: 12, axis: 'z', origin: [16.1, 7.0, 8] } },
        // The pistol grip: wood, bending back, with a dark butt cap.
        { ...seg(P0, 3.4, 1.45, 18, 6.9, 9.1), c: 'grip', pat: 'grain' },
        { ...seg(J1, 3.0, 1.4, 30, 6.85, 9.15), c: 'grip', pat: 'grain' },
        { ...seg(J2, 0.8, 1.6, 36, 6.75, 9.25), c: 'gripDark' }
      ],
      pump: [
        // The wooden pump around the magazine tube, with its grooves, darker end rings, the action bars into the
        // receiver and the bolt that shows in the ejection port (they all ride back with the pump).
        { from: [1.6, 6.8, 6.7], to: [7.4, 9.2, 9.3], c: { all: 'wood', up: 'woodLight' }, pat: { all: 'groove', east: 'flat', west: 'flat' } },
        { from: [1.8, 7.85, 9.3], to: [7.2, 8.15, 9.33], c: 'woodDark', outline: false, dirs: ['south'] },
        { from: [1.8, 7.85, 6.67], to: [7.2, 8.15, 6.7], c: 'woodDark', outline: false, dirs: ['north'] },
        { from: [1.2, 6.65, 6.55], to: [1.8, 9.2, 9.45], c: 'woodDark' },
        { from: [7.2, 6.65, 6.55], to: [7.8, 9.2, 9.45], c: 'woodDark' },
        { from: [7.8, 7.75, 6.95], to: [12.2, 8.3, 7.25], c: 'guard' },
        { from: [7.8, 7.75, 8.75], to: [12.2, 8.3, 9.05], c: 'guard' },
        { from: [13.15, 9.1, 9.47], to: [13.95, 10.5, 9.55], c: 'silver', ink: 'silverMid', dirs: ['south', 'up', 'down', 'east', 'west'] },
        { from: [13.15, 9.1, 6.45], to: [13.95, 10.5, 6.53], c: 'silver', ink: 'silverMid', dirs: ['north', 'up', 'down', 'east', 'west'] }
      ],
      shell: [
        // A spent (or a new) shell: red hull, brass base with its rim. Shown only by the frames.
        { from: [13.4, 9.3, 8.7], to: [15.4, 10.3, 9.7], c: { all: 'hull', down: 'hullDark' }, ink: 'hullDark' },
        { from: [15.4, 9.22, 8.62], to: [16.0, 10.38, 9.78], c: { all: 'brass', down: 'brassDark' }, ink: 'brassDark' }
      ],
      flash: [
        { from: [-4.8, 9.0, 6.8], to: [-3.0, 11.4, 9.2], c: 'flashCore', glow: true },
        { from: [-8.6, 9.6, 7.4], to: [-4.8, 10.8, 8.6], c: 'flash', glow: true },
        { from: [-5.6, 11.4, 7.4], to: [-4.2, 13.6, 8.6], c: 'flash', glow: true },
        { from: [-5.6, 6.8, 7.4], to: [-4.2, 9.0, 8.6], c: 'flash', glow: true },
        { from: [-5.6, 9.6, 4.6], to: [-4.2, 10.8, 6.8], c: 'flash', glow: true },
        { from: [-5.6, 9.6, 9.2], to: [-4.2, 10.8, 11.4], c: 'flash', glow: true },
        { from: [-5.4, 9.7, 5.4], to: [-4.4, 10.7, 10.6], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [-4.9, 10.2, 8] } },
        { from: [-5.4, 9.7, 5.4], to: [-4.4, 10.7, 10.6], c: 'flash', glow: true, rot: { angle: -45, axis: 'x', origin: [-4.9, 10.2, 8] } }
      ]
    },
    hidden: ['flash', 'shell'],
    noFull: ['flash', 'shell'],
    display: display({
      firstperson: { rotation: [0, -84, 0], translation: [-4.3, 3.3, -1.12], scale: [0.72, 0.72, 0.72] },
      thirdperson: { rotation: [0, -90, -80], translation: [0, 8.3, 1.8], scale: [0.75, 0.75, 0.75] },
      gui: { rotation: [0, 180, -38], translation: [0.6, 1.2, 0], scale: [0.62, 0.62, 0.62] },
      ground: { rotation: [0, 0, -45], translation: [0.75, 7.75, 0], scale: [0.9, 0.9, 0.9] },
      fixed: { rotation: [0, 0, -45], translation: [0.5, 0.75, -1.25], scale: [0.9, 0.9, 0.9] },
      head: { rotation: [0, -90, 0], translation: [0, 13, 7], scale: [1, 1, 1] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: 18.8, rearDepth: 1.3, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [19.88, -26.19, 4.92], translation: [-6.28, 4.19, 2.95], scale: [0.72, 0.72, 0.72] }
    }
  })
  const GRIP = [17.6, 6.5, 8] // the hand
  const AXIS = [12, 9.4, 8] // the bore line through the receiver (the cant turns about it)
  const SHELL = [14.7, 9.8, 9.2] // the shell's centre
  const TRAVEL = 2.9 // how far the pump racks back (model units)
  // A shot (GunFx: 15 ticks): the flash for the first ~15%, a big kick (back and muzzle up) gone by ~35%, the pump
  // racked back (35-55%) and forward (60-85%) with a small cant toward the eye, and a spent shell thrown out of the
  // +z port while it's back, arcing up and back over the receiver (not across the barrel toward the sight). k scales
  // the kick and the cant (aiming: smaller). WeaponMechanics works the pump after every second shot (R9_0.yml
  // Firearm_Action_Frequency 2: Open 7 + Close 7 ticks inside this 15-tick clock; its sounds are delayed to match:
  // pump_back at tick 5, pump_fwd at tick 9); after the other shots GunFx ends the clock at tick 5 (gunfx alone 5),
  // where the kick is spent and the pump hasn't moved yet.
  const shot = (k = 1) => p => {
    const kick = Math.pow(1 - Math.min(1, p / 0.35), 2)
    const pump = ease.ramp(p, 0.35, 0.55) - ease.ramp(p, 0.6, 0.85)
    const rack = ease.bump(p, 0.33, 0.9, 0.5, 0.62)
    const pose = {
      show: p < 0.15 ? ['flash'] : [],
      gun: rig({ t: [2.0 * k * kick + 0.4 * k * rack, 0.4 * k * kick - 0.2 * k * rack, 0], rot: [[[0, 0, 1], -12 * k * kick - 3 * k * rack], [[1, 0, 0], -10 * k * rack], [[0, 1, 0], 10 * k * rack]], pivot: GRIP }),
      pump: rig({ t: [TRAVEL * pump, 0, 0] })
    }
    if (p > 0.44 && p < 0.8) {
      const s = (p - 0.44) / 0.36
      pose.show.push('shell')
      // From the hip the +z port faces the screen's centre, so the shell pops up and tumbles back over the top of the
      // receiver past the shooter's shoulder (out of the top right); aiming, the gun is centred and +z is the screen's
      // left, so it flies out low to the left, clear of the sight line.
      const t = k < 1 ? [1.0 * s, 2.2 * s - 1.4 * s * s, 0.5 + 4.0 * s] : [3.5 * s, 6.5 * s - 3 * s * s, 0.5 - 0.5 * s]
      pose.shell = rig({ t, rot: [[[0, 1, 0], 60 * s], [[0, 0, 1], -280 * s]], pivot: SHELL })
    }
    return pose
  }
  // Reloading, each shell is its own 4-tick clock (GunFx: one WeaponMechanics reload per shell), seen at p = 1/8,
  // 3/8, 5/8, 7/8: the gun is lifted toward the middle of the screen and canted a little (the loading port toward the
  // eye), the shell comes from below, nose up, into the loading port and is pushed forward into the tube while the gun
  // nods with the push. Between shells (no clock) the same pose, so consecutive shells don't wobble. Every shell's
  // clock is the same, so the pose snaps on at the first shell and off after the last: the cant stays moderate (24°,
  // 10° yaw; at 30° the port was still edge-on from the first-person camera) and the lift (2.2 up, 0.8 toward the
  // middle) is what brings the loading port into view (with 18° and no lift the shell never showed above the screen's
  // bottom edge). GunFx gives a shell exactly WeaponMechanics' 4-tick reload task (getReloadTime: for a pump gun loading
  // one shell at a time WeaponMechanics never chains the Open/Close times its reload event reports into the reload).
  const canted = (nod = 0) => rig({ t: [0, 2.2 + 0.35 * nod, 0.8], rot: [[[1, 0, 0], -24], [[0, 1, 0], 10], [[0, 0, 1], -6 - 2 * nod]], pivot: AXIS })
  const LOAD_START = [-1.2, -4.4, 0.4] // under the loading port (from the shell's own spot at the ejection port)
  const LOAD_PORT = [-1.55, -2.6, -1.2] // half into the port
  const LOAD_IN = [-4.4, -1.35, -1.2] // pushed forward into the magazine tube (hidden in it)
  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
  const reload = p => {
    const up = ease.ramp(p, 0.05, 0.55)
    const push = ease.ramp(p, 0.5, 0.95)
    const at = p < 0.5 ? lerp(LOAD_START, LOAD_PORT, up) : lerp(LOAD_PORT, LOAD_IN, push)
    const tilt = -25 * (1 - up) - 8 * (1 - push) * up
    return {
      show: p < 0.95 ? ['shell'] : [],
      gun: canted(ease.bump(p, 0.35, 0.95, 0.6)),
      shell: rig({ t: at, rot: [[[0, 0, 1], tilt]], pivot: SHELL })
    }
  }
  const CANTED = { gun: canted(0) }
  return {
    14: gun.byContext('', gun.cooldown('', 15, shot(1))),
    1014: gun.byContext('ads', gun.cooldown('ads', 15, shot(0.4))),
    2014: gun.byContext('sprint', gun.composite('sprint')),
    3014: gun.byContext('', gun.cooldown('', 4, reload, CANTED)),
    4014: gun.byContext('', gun.composite(''))
  }
}
