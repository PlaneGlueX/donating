// The pistol slot (WeaponMechanics weapons\pistols\50_GS.yml; skins Default 9, Scope +1000, Sprint +2000, Reload
// +3000). Since 2026-10-05 a recreation of Pixel Gun 3D's starting pistol (the owner: the sold guns
// remade as PG3D's; drawn by hand from the wiki's pictures, nothing taken from the game): a chunky chrome slide with
// serrations at the back and a stepped rear sight, a dark frame with a rail, a red leather grip raked back. Its
// reload doesn't pull the slide (the magazine drops out of the grip and a new one goes in, like PG3D's); each shot
// kicks the gun up and cycles the slide; empty, the slide stays back.
// Built along x, muzzle toward -x, centred on z = 8; the sight line is y = SY.
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_gs50'
  const SY = 13.2
  const gun = pgGun(name, {
    palette: {
      chrome: [214, 224, 238], chromeDark: [150, 164, 186], frame: [52, 60, 78], frameLight: [90, 104, 128],
      leather: [176, 56, 26], leatherDark: [120, 34, 14], steel: [120, 128, 142], bore: [16, 18, 24],
      sight: [40, 44, 54], flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    parts: {
      body: [
        { from: [2.5, 7.4, 6.9], to: [13.6, 9.2, 9.1], c: 'frame' }, // the frame under the slide
        { from: [2.6, 6.5, 7.2], to: [7.2, 7.4, 8.8], c: 'frameLight', pat: 'serr' }, // the accessory rail
        { from: [6.6, 5.0, 7.3], to: [10.4, 5.7, 8.7], c: 'frame' }, // trigger guard: bottom
        { from: [6.6, 5.7, 7.3], to: [7.3, 7.4, 8.7], c: 'frame' }, // its front
        { from: [8.4, 5.9, 7.7], to: [9.0, 7.4, 8.3], c: 'steel' }, // the trigger
        { from: [10.2, 1.0, 6.8], to: [14.4, 7.6, 9.2], c: 'leather', pat: 'speck', rot: { angle: 15, axis: 'z', origin: [12.3, 7.4, 8] } }, // the grip
        { from: [10.0, 0.2, 6.7], to: [14.6, 1.0, 9.3], c: 'leatherDark', rot: { angle: 15, axis: 'z', origin: [12.3, 7.4, 8] } }, // its base
        { from: [15.0, 8.8, 7.4], to: [15.9, 10.8, 8.6], c: 'frame' } // the hammer
      ],
      slide: [
        { from: [2.0, 9.2, 6.75], to: [15.2, 12.6, 9.25], c: { all: 'chrome', down: 'chromeDark' }, pat: { all: 'chrome', north: 'chrome', south: 'chrome' } },
        { from: [11.6, 9.4, 6.65], to: [15.0, 12.4, 6.75], c: 'chrome', pat: 'serr', dirs: ['north'] }, // serrations, left
        { from: [11.6, 9.4, 9.25], to: [15.0, 12.4, 9.35], c: 'chrome', pat: 'serr', dirs: ['south'] }, // and right
        { from: [5.4, 11.3, 6.65], to: [8.8, 12.1, 6.75], c: 'sight', dirs: ['north'] }, // the ejection port, left
        { from: [1.9, 9.9, 7.4], to: [2.0, 11.9, 8.6], c: 'bore', dirs: ['west'], outline: false }, // the bore
        { from: [2.6, 12.6, 7.6], to: [3.6, SY, 8.4], c: 'sight' }, // front sight
        { from: [13.4, 12.6, 6.9], to: [14.6, SY + 0.3, 7.6], c: 'sight' }, // rear sight, two posts
        { from: [13.4, 12.6, 8.4], to: [14.6, SY + 0.3, 9.1], c: 'sight' }
      ],
      mag: [
        // In the grip (hidden inside it) until a reload drops it out.
        { from: [10.8, 1.2, 7.3], to: [13.6, 7.0, 8.7], c: 'steel', rot: { angle: 15, axis: 'z', origin: [12.3, 7.4, 8] } },
        { from: [10.6, 0.25, 7.2], to: [13.8, 1.2, 8.8], c: 'leatherDark', rot: { angle: 15, axis: 'z', origin: [12.3, 7.4, 8] } }
      ],
      flash: [
        { from: [-0.6, 9.9, 7.1], to: [1.8, 11.9, 8.9], c: 'flashCore', glow: true },
        { from: [-3.2, 10.4, 7.6], to: [-0.6, 11.4, 8.4], c: 'flash', glow: true },
        { from: [-0.1, 12.0, 7.6], to: [0.9, 13.6, 8.4], c: 'flash', glow: true },
        { from: [-0.1, 8.2, 7.6], to: [0.9, 9.8, 8.4], c: 'flash', glow: true },
        { from: [-0.1, 10.4, 5.4], to: [0.9, 11.4, 7.0], c: 'flash', glow: true },
        { from: [-0.1, 10.4, 9.0], to: [0.9, 11.4, 10.6], c: 'flash', glow: true }
      ]
    },
    hidden: ['flash'],
    noFull: ['flash'],
    display: display({
      firstperson: { rotation: [0, -80, 0], translation: [-5.35, 4.44, -1.13], scale: [0.56, 0.56, 0.56] },
      thirdperson: { rotation: [0, -90, -80], translation: [0, 3, 3], scale: [0.7, 0.7, 0.7] },
      gui: { rotation: [0, 180, -32], translation: [0, 0.5, 0], scale: [0.66, 0.66, 0.66] },
      ground: { rotation: [0, 0, -45], translation: [0, 4, 0], scale: [0.7, 0.7, 0.7] },
      fixed: { rotation: [0, 0, -45], translation: [0.25, 1.75, -0.25], scale: [0.7, 0.7, 0.7] },
      head: { rotation: [0, -90, 0], translation: [0, 13, 7], scale: [1, 1, 1] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: 14, rearDepth: 2, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [-25, -60, 0], translation: [-6.56, 2.09, -1.96], scale: [0.56, 0.56, 0.56] }
    }
  })
  const GRIP = [12, 6, 8]
  // A shot (GunFx: a 6-tick cooldown after each shot): the flash for the first third, the gun kicks back and its
  // muzzle up, the slide snaps back and returns.
  const shot = (k = 1) => p => {
    const back = 1 - ease.out(Math.min(1, p / 0.85))
    return {
      show: p < 0.34 ? ['flash'] : [],
      gun: rig({ t: [1.1 * k * back, 0.2 * k * back, 0], rot: [[[0, 0, 1], -9 * k * back]], pivot: GRIP }),
      slide: rig({ t: [1.8 * ease.bump(p, 0, 0.75, 0.12), 0, 0] })
    }
  }
  // The reload (GunFx: a cooldown as long as WeaponMechanics' reload): the gun rolls to show its side and dips,
  // the magazine drops out of the grip, a new one rises in, a palm slap, the gun rolls back. No slide pull.
  const reload = p => {
    const roll = ease.ramp(p, 0, 0.12) * (1 - ease.ramp(p, 0.8, 1))
    const out = ease.ramp(p, 0.12, 0.32)
    const back = ease.ramp(p, 0.46, 0.7)
    const slap = ease.bump(p, 0.7, 0.8, 0.73)
    const drop = p < 0.46 ? -10 * out : -10 * (1 - back)
    return {
      gun: rig({ t: [0, -1.4 * roll + 0.5 * slap, 0], rot: [[[1, 0, 0], 26 * roll], [[0, 0, 1], -4 * slap]], pivot: [8, 8, 8] }),
      mag: rig({ t: [-drop * Math.sin(15 * Math.PI / 180), drop, 0] }),
      hide: p > 0.4 && p < 0.46 ? ['mag'] : []
    }
  }
  return {
    9: gun.byContext('', gun.cooldown('', 6, shot(1))),
    1009: gun.byContext('ads', gun.cooldown('ads', 6, shot(0.55))),
    2009: gun.byContext('sprint', gun.composite('sprint')),
    3009: gun.byContext('', gun.cooldown('', 32, reload)),
  }
}
