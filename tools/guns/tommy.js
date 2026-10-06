// The Brave Patriot (WeaponMechanics weapons\assault_rifles\STG44.yml, title STG44, shown as "Brave Patriot"; skins
// Default 15, Scope +1000, Sprint +2000, Reload +3000; 2026-10-06). A recreation of Pixel Gun 3D's WWII tommy gun, the
// "Brave Patriot" (drawn by hand from the wiki's pictures, nothing taken from the game), with a round drum instead of
// its stick magazine (the plan's "trap purchase" fix: 50 rounds): mid-grey metal with light top edges, a Cutts
// compensator slotted on top, a finned barrel, a long horizontal orange-wood foregrip under it, a brass cocking knob on
// top of the receiver with its slot, an aperture rear sight and a blade front sight, two levers on the left, the drum
// (a stepped round disc: a dark rim, a grey face, a brass winding key) on a rail under the receiver, a wooden pistol
// grip and a stepped wooden stock (orange over a dark red-brown underside, a light streak along the top, a black butt
// plate). Full-auto, 9 rounds a second: fire held flickers the flash (out of the muzzle and up out of the compensator's
// slots) over a steady kick, the knob cycling. The Default state's cooldown is the draw (GunFx: 22 ticks when it's
// equipped). Hit-contract bodyguards hold it (third person matters).
// Built along x, muzzle toward -x, centred on z = 8 (+z is the gun's left: the side first person sees); the sight line
// is y = SY, through the rear aperture to the front blade's tip.
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_tommy'
  const SY = 11.2
  const BORE_Y = 8.0
  // The drum: a stepped round disc about (DX, DY) in the x-y plane, z from 6.5 to 9.5. A dark back disc (its rim, and
  // the outline the round face can't have: the kit outlines each box, which would draw lines across the face) and a grey
  // face disc a little smaller and a hair proud on both sides, each a pixel circle of four boxes (each a hair thinner in
  // z than the one before: no coplanar faces where they overlap).
  const DX = 7.4
  const DY = 2.7
  const GRIP = { angle: 15, axis: 'z', origin: [14.1, 5.4, 8] }
  const disc = (r, z0, z1, c, more = {}) => [[1, 0.44], [0.86, 0.72], [0.72, 0.86], [0.44, 1]].map(([hx, hy], k) =>
    ({ from: [DX - r * hx, DY - r * hy, z0 + 0.025 * k], to: [DX + r * hx, DY + r * hy, z1 - 0.025 * k], c, outline: false, ...more }))
  const gun = pgGun(name, {
    palette: {
      metal: [92, 94, 102], metalL: [146, 148, 156], metalD: [56, 58, 64], dark: [28, 29, 34],
      // The front sight blade has its own key (the color of dark): it sits on the crosshair, so a skin that repaints the
      // dark parts (the butt plate, the port) leaves it alone unless it names it.
      post: [28, 29, 34],
      // The wood a little browner than the shop icon's bright orange (PG3D darkened it after its first versions).
      wood: [208, 86, 36], woodD: [144, 42, 34], woodL: [236, 154, 102],
      brass: [232, 184, 74], brassD: [158, 112, 36],
      drum: [80, 82, 90], drumD: [24, 25, 29],
      bore: [10, 10, 12], flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    parts: {
      body: [
        // The Cutts compensator: a block on the muzzle, three slots across its top (the flash jets out of them), the bore.
        { from: [-8.6, 7.0, 7.0], to: [-6.2, 9.0, 9.0], c: { all: 'metal', up: 'metalL' } },
        { from: [-8.25, 9.0, 7.4], to: [-7.9, 9.02, 8.6], c: 'bore', dirs: ['up'], outline: false },
        { from: [-7.6, 9.0, 7.4], to: [-7.25, 9.02, 8.6], c: 'bore', dirs: ['up'], outline: false },
        { from: [-6.95, 9.0, 7.4], to: [-6.6, 9.02, 8.6], c: 'bore', dirs: ['up'], outline: false },
        { from: [-8.65, BORE_Y - 0.5, 7.5], to: [-8.6, BORE_Y + 0.5, 8.5], c: 'bore', dirs: ['west'], outline: false },
        // The barrel: a plain front, the blade front sight on its base, then the cooling fins (grooves across a thicker
        // tube) back into the receiver.
        { from: [-6.2, 7.3, 7.3], to: [-3.0, 8.7, 8.7], c: 'metal', pat: 'chrome' },
        { from: [-6.3, 8.7, 7.45], to: [-5.1, 9.15, 8.55], c: 'metalD', ink: 'dark' },
        { from: [-5.95, 9.15, 7.78], to: [-5.45, SY, 8.22], c: 'post' },
        { from: [-3.0, 7.0, 7.0], to: [2.8, 9.0, 9.0], c: { all: 'metal', up: 'metalL' }, pat: { all: 'groove', east: 'flat', west: 'flat' } },
        // The long horizontal foregrip: orange wood with a light top, over a dark red-brown underside, a metal cap at its
        // front.
        { from: [-2.6, 5.6, 6.8], to: [2.6, 7.3, 9.2], c: { all: 'wood', up: 'woodL' }, pat: 'grain' },
        { from: [-2.5, 5.0, 6.84], to: [2.6, 5.6, 9.16], c: 'woodD' },
        { from: [-3.0, 5.3, 7.0], to: [-2.6, 7.2, 9.0], c: 'metalD', ink: 'dark' },
        // The receiver: grey with a light top, a light line along the top of each side and a darker band along the
        // bottom, a darker ring at its front where the barrel goes in, the knob's slot on top, the ejection port on the
        // right, two levers on the left above the grip.
        { from: [2.6, 6.4, 7.0], to: [15.0, 9.4, 9.0], c: { all: 'metal', up: 'metalL' } },
        { from: [2.8, 8.95, 6.96], to: [14.8, 9.25, 9.04], c: 'metalL', outline: false, dirs: ['north', 'south'] },
        { from: [2.8, 6.55, 6.96], to: [14.8, 7.15, 9.04], c: 'metalD', outline: false, dirs: ['north', 'south'] },
        { from: [2.4, 6.6, 6.9], to: [3.2, 9.3, 9.1], c: 'metalD', ink: 'dark' },
        { from: [4.4, 9.4, 7.82], to: [9.8, 9.42, 8.18], c: 'bore', dirs: ['up'], outline: false },
        { from: [6.0, 7.3, 6.94], to: [9.2, 8.7, 7.0], c: 'dark', ink: 'metalD', dirs: ['north'] },
        { from: [11.2, 7.3, 9.0], to: [12.1, 7.75, 9.2], c: 'metalL', outline: false },
        { from: [13.0, 7.3, 9.0], to: [13.9, 7.75, 9.2], c: 'metalL', outline: false },
        // The drum's rail under the receiver (wider than it: the drum slides in from the side).
        { from: [3.8, 6.0, 6.6], to: [11.0, 6.4, 9.4], c: 'metalD', ink: 'dark' },
        // The aperture rear sight: a base and a ring around the sight line.
        { from: [12.0, 9.4, 7.3], to: [13.2, 9.9, 8.7], c: 'metal' },
        { from: [12.3, 9.9, 7.35], to: [12.9, SY - 0.5, 8.65], c: { all: 'metalD', up: 'metal' }, outline: false },
        { from: [12.3, SY - 0.5, 7.35], to: [12.9, SY + 0.5, 7.65], c: { all: 'metalD', up: 'metal' }, outline: false },
        { from: [12.3, SY - 0.5, 8.35], to: [12.9, SY + 0.5, 8.65], c: { all: 'metalD', up: 'metal' }, outline: false },
        { from: [12.3, SY + 0.5, 7.35], to: [12.9, SY + 0.8, 8.65], c: { all: 'metalD', up: 'metal' }, outline: false },
        // The trigger frame, the guard and the trigger.
        { from: [10.2, 5.4, 7.1], to: [15.0, 6.4, 8.9], c: 'metalD' },
        { from: [10.8, 4.3, 7.5], to: [13.8, 4.8, 8.5], c: 'metal' },
        { from: [10.8, 4.8, 7.5], to: [11.3, 5.4, 8.5], c: 'metal' },
        { from: [12.0, 4.6, 7.75], to: [12.5, 5.4, 8.25], c: 'metalL' },
        // The wooden pistol grip, raked back, with a dark cap.
        { from: [12.8, 0.8, 7.0], to: [15.4, 5.4, 9.0], c: 'wood', pat: { north: 'grain', south: 'grain', all: 'flat' }, rot: GRIP },
        { from: [12.7, 0.4, 6.95], to: [15.5, 0.8, 9.05], c: 'woodD', rot: GRIP },
        // The receiver's back end (the stock's mount).
        { from: [15.0, 6.0, 7.1], to: [16.0, 9.4, 8.9], c: { all: 'metalD', up: 'metal' }, outline: false }
      ],
      // The stock (its own part: hidden while aiming, where it would sit against the cheek): a long orange slab with a
      // light streak along its top, the underside stepping down to the butt in dark red-brown (PG3D's pixel staircase),
      // a black butt plate.
      stock: [
        { from: [15.8, 5.4, 7.0], to: [27.6, 9.1, 9.0], c: 'wood', pat: 'grain' },
        { from: [16.0, 8.4, 6.96], to: [27.4, 8.8, 9.04], c: 'woodL', outline: false, dirs: ['north', 'south'] },
        { from: [19.0, 4.4, 7.02], to: [27.6, 5.4, 8.98], c: 'woodD' },
        { from: [22.2, 3.4, 7.04], to: [27.6, 4.4, 8.96], c: 'woodD' },
        { from: [25.0, 2.6, 7.06], to: [27.6, 3.4, 8.94], c: 'woodD' },
        { from: [27.6, 2.2, 6.9], to: [28.4, 9.3, 9.1], c: 'dark', ink: 'metalD' }
      ],
      // The brass cocking knob on top (racked back +x along its slot).
      bolt: [
        { from: [5.2, 9.4, 7.8], to: [6.0, 9.65, 8.2], c: 'brassD', outline: false },
        { from: [4.9, 9.65, 7.45], to: [6.3, 10.1, 8.55], c: 'brass', ink: 'brassD' }
      ],
      // The drum: a feed tab up into the rail, the rim and the face discs, the winding key on each side.
      mag: [
        { from: [DX - 1.4, 6.0, 7.2], to: [DX + 1.4, 6.45, 8.8], c: 'metalD', ink: 'dark' },
        ...disc(3.6, 6.5, 9.5, 'drumD'),
        ...disc(3.15, 6.42, 9.58, 'drum', { dirs: ['north', 'south'], pat: 'chrome' }),
        { from: [DX - 0.7, DY - 0.7, 9.5], to: [DX + 0.7, DY + 0.7, 9.85], c: 'brass', ink: 'brassD' },
        { from: [DX - 1.4, DY - 0.3, 9.85], to: [DX + 1.4, DY + 0.3, 10.1], c: 'brass', outline: false },
        { from: [DX - 0.7, DY - 0.7, 6.15], to: [DX + 0.7, DY + 0.7, 6.5], c: 'brass', ink: 'brassD' }
      ],
      // The flash: a burst out of the muzzle and two jets up out of the compensator's slots.
      flash: [
        { from: [-11.2, BORE_Y - 1.2, 6.8], to: [-8.7, BORE_Y + 1.2, 9.2], c: 'flashCore', glow: true },
        { from: [-15.0, BORE_Y - 0.5, 7.5], to: [-11.2, BORE_Y + 0.5, 8.5], c: 'flash', glow: true },
        { from: [-10.4, BORE_Y - 0.4, 4.8], to: [-9.6, BORE_Y + 0.4, 6.8], c: 'flash', glow: true },
        { from: [-10.4, BORE_Y - 0.4, 9.2], to: [-9.6, BORE_Y + 0.4, 11.2], c: 'flash', glow: true },
        { from: [-8.25, 9.02, 7.55], to: [-7.9, 11.6, 8.45], c: 'flash', glow: true },
        { from: [-7.6, 9.02, 7.55], to: [-7.25, 11.0, 8.45], c: 'flash', glow: true }
      ],
      // A smaller flash (the flicker's second size; the one aiming shows: its jets stay under the sight line).
      flash2: [
        { from: [-10.4, BORE_Y - 0.9, 7.1], to: [-8.7, BORE_Y + 0.9, 8.9], c: 'flashCore', glow: true },
        { from: [-13.0, BORE_Y - 0.4, 7.6], to: [-10.4, BORE_Y + 0.4, 8.4], c: 'flash', glow: true },
        { from: [-8.25, 9.02, 7.65], to: [-7.9, 10.3, 8.35], c: 'flash', glow: true },
        { from: [-6.95, 9.02, 7.65], to: [-6.6, 10.0, 8.35], c: 'flash', glow: true }
      ]
    },
    hidden: ['flash', 'flash2'],
    noFull: ['flash', 'flash2'],
    display: display({
      firstperson: { rotation: [0, -76, 0], translation: [-4.4, 4.6, -1.6], scale: [0.62, 0.62, 0.62] },
      thirdperson: { rotation: [0, -90, 0], translation: [0, 1.5, -5.5], scale: [0.8, 0.8, 0.8] },
      gui: { rotation: [0, 180, -45], translation: [0.6, 0.6, 0], scale: [0.5, 0.5, 0.5] },
      ground: { rotation: [0, 0, -45], translation: [-1, 8.25, 0], scale: [0.85, 0.85, 0.85] },
      fixed: { rotation: [0, 0, -45], translation: [-0.5, 1, -1], scale: [0.85, 0.85, 0.85] }
    }),
    states: {
      ads: aim({ sightY: SY, rearX: 12.9, rearDepth: 1.0, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [-8, -48, 18], translation: [-4.2, 3.4, -2.4], scale: [0.58, 0.58, 0.58] }
    }
  })
  // The shoulder pivot (the grip's top, behind the trigger): kicks turn the muzzle up about it.
  const SHOULDER = [14.1, 5.6, 8]
  // Fire held (full-auto, 9 shots a second: one every 2-3 ticks, so the frames flicker at random each tick): a pose is
  // picked afresh every frame (pg.js firing: wobble off), so they share one kick (0.8 back, 2.6 degrees up) with a
  // small jitter, and the flash (one of two sizes, or none for a frame) is what flickers; the knob cycles. k scales
  // the kick (the aim's is smaller); aiming the knob stays put (it would flicker just under the sights) and only the
  // small flash shows (its jets stay under the sight line).
  const fire = (k, also = {}) => {
    const aimed = k < 1
    const cycle = v => aimed ? {} : { bolt: rig({ t: [v, 0, 0] }) }
    const big = aimed ? 'flash2' : 'flash'
    const kick = (dx, up, yaw) => rig({ t: [(0.8 + dx) * k, 0.12 * k, 0], rot: [[[0, 0, 1], -(2.6 + up) * k], [[0, 1, 0], yaw * k]], pivot: SHOULDER })
    return [
      { ...also, show: [big], gun: kick(0.08, 0.4, 0.3), ...cycle(2.8) },
      { ...also, show: ['flash2'], gun: kick(-0.06, -0.3, -0.4), ...cycle(1.6) },
      { ...also, show: [big], gun: kick(0.1, 0.5, -0.2), ...cycle(3.0) },
      { ...also, gun: kick(-0.1, -0.4, 0.1), ...cycle(0.8) }
    ]
  }
  // The draw (GunFx: 22 ticks when it's equipped; STG44.yml Weapon_Equip_Delay 22): the gun comes up from below the
  // screen, muzzle down and rolled out, levelling out by half way; then (p 0.55-0.8) it rolls its top toward you and the
  // knob is racked: back at 0.55-0.62 (held), let go at 0.72-0.75 (a jolt), the roll back by 0.92. The draw sound's two
  // clicks follow it (tools\sounds\guns\tommy.js: 0.66 s and 0.82 s).
  const draw = p => {
    const e = 1 - ease.out(Math.min(1, p / 0.5))
    const roll = ease.ramp(p, 0.48, 0.58) * (1 - ease.ramp(p, 0.8, 0.92))
    const pull = p < 0.72 ? ease.ramp(p, 0.55, 0.62) : 1 - ease.ramp(p, 0.72, 0.75)
    const snap = ease.bump(p, 0.73, 0.86, 0.76)
    return {
      gun: rig({ t: [1.8 * e + 0.4 * snap, -9 * e + 0.8 * roll, 0.6 * roll], rot: [[[1, 0, 0], -18 * e + 14 * roll], [[0, 1, 0], 6 * roll], [[0, 0, 1], 26 * e + 1.5 * snap]], pivot: SHOULDER }),
      bolt: rig({ t: [3.4 * pull, 0, 0] })
    }
  }
  // The reload (GunFx: a cooldown as long as WeaponMechanics' reload: 50 ticks with rounds left, 60 from empty, when the
  // silent Firearm_Action's 5 + 5 come around it). The sounds are timed to it in STG44.yml (Start_Mechanics,
  // delayBeforePlay = 55p - 2.5, splitting the two clocks): mag_out 6 (p 0.155), mag_in 28 (p 0.555), bolt 38 (p 0.736,
  // its second click 2.6 ticks later). The gun comes up and rolls its underside toward you (0-0.1); the drum is tugged
  // (0.1-0.155), unlatches and slides out sideways along its rail (+z, toward you), then drops away (0.155-0.32); gone
  // (0.32-0.4); a new one rises and slides in (0.4-0.555), seats and is slapped home from the side (0.555-0.62, a jolt);
  // the gun rolls its top toward you (0.6-0.7) and the knob is racked: back 0.70-0.736, held, let go 0.77-0.785 (a
  // snap); the gun settles back level by 0.96.
  const SLIDE = 6.5 // how far the drum slides out along the rail before it drops
  const reload = p => {
    const a = ease.ramp(p, 0, 0.1) * (1 - ease.ramp(p, 0.6, 0.7)) // the drum pose
    const b = ease.ramp(p, 0.6, 0.7) * (1 - ease.ramp(p, 0.86, 0.96)) // the knob pose
    const tug = ease.bump(p, 0.1, 0.16, 0.135)
    const slap = ease.bump(p, 0.555, 0.63, 0.575)
    let side = 0
    let drop = 0
    if (p < 0.4) { side = ease.ramp(p, 0.155, 0.23); drop = ease.ramp(p, 0.22, 0.32) } else { drop = 1 - ease.ramp(p, 0.4, 0.47); side = 1 - ease.ramp(p, 0.46, 0.545) }
    const pull = p < 0.77 ? ease.ramp(p, 0.70, 0.736) : 1 - ease.ramp(p, 0.77, 0.785)
    const snap = ease.bump(p, 0.78, 0.86, 0.8)
    return {
      gun: rig({
        t: [0.3 * tug + 0.4 * snap, 1.2 * a + 1.0 * b + 0.3 * slap, 1.6 * a + 0.8 * b - 0.4 * slap],
        rot: [[[1, 0, 0], -26 * a + 30 * b + 4 * slap], [[0, 1, 0], 12 * a + 14 * b], [[0, 0, 1], 3 * a - 2 * b - 2 * slap + 1.5 * snap]],
        pivot: [9, 6, 8]
      }),
      mag: rig({ t: [0, -12 * drop - 0.3 * tug, SLIDE * side - 0.25 * slap] }),
      bolt: rig({ t: [3.4 * pull, 0, 0] }),
      hide: p > 0.32 && p < 0.4 ? ['mag'] : []
    }
  }
  const AIMED = { hide: ['stock'] }
  // Default: the draw while its cooldown runs, else fire held / the rest pose.
  const drawn = gun.cooldown('', 22, draw)
  drawn.fallback = gun.firing('', fire(1))
  return {
    15: gun.byContext('', drawn),
    1015: gun.byContext('ads', gun.firing('ads', fire(0.45, AIMED), AIMED)),
    2015: gun.byContext('sprint', gun.composite('sprint')),
    3015: gun.byContext('', gun.cooldown('', 60, reload))
  }
}
