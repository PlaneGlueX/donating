// The Veteran (WeaponMechanics weapons\light_machine_guns\MG34.yml, title MG34, shown as "Veteran"; skins Default 11,
// Scope +1000, Sprint +2000, Reload +3000; 2026-10-06). A recreation of Pixel Gun 3D's WWII light machine gun, the
// "Veteran" (drawn by hand from public descriptions and pictures, nothing taken from the game): a Bren-style LMG, a grey
// receiver, a light grey curved magazine standing up out of its top (leaning forward as it rises), a grey barrel with a
// conical flash hider, the front sight on a bracket off to the left with two protective ears, a range drum and aperture
// on the left of the receiver (a Bren's sights are offset left of the magazine, so the sight line is z = SZ, not 8), the
// folded bipod's legs along the gas tube under the barrel, a carrying handle folded to the right, a cocking handle on
// the left side in a slot, a wooden pistol grip, and a brown wooden stock with a blue band around its end and a white
// star on each side. Full-auto, 9 rounds a second: fire held flickers a star-shaped flash out of the cone over a heavy,
// steady kick, the magazine trembling. The Default state's cooldown is the draw (GunFx: 40 ticks when it's equipped).
// Built along x, muzzle toward -x, centred on z = 8 (+z is the gun's left: the side first person sees). Every box stays
// within -16..32: the gun runs from the flash hider's mouth at x = -14.25 to the butt plate at 29.8, and the muzzle
// flash is drawn FX units back inside the bounds and moved out to the muzzle by its frame's transformation.
module.exports = ({ pg, aim, display, write, mirror }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_lmg'
  const SY = 10.7 // the sight line's height
  const SZ = 10.1 // the sight line's side offset (left of the magazine)
  // The aim (Scope). aim() centres z = 8 on the screen; the sights are SZ - 8 to the gun's left, and after aim's -90
  // degree turn (scale z 2.4) that is (SZ - 8) x 2.4 = 5.04 toward the screen's left in BOTH hands (the client applies
  // the left hand's stored [0, 90, 0] as -90, the same turn), while it negates the left hand's translation x. So each
  // hand gets its own: the right hand moves the gun right, tx = -8.96 + 5.04 = -3.92; the left hand needs the applied
  // tx = 8.96 + 5.04, stored -14.0 (= the right's - 10.08). pgGun's states mirror one transform for both hands (which
  // put the left hand's sights 10.08 units off the crosshair), so the ads models are written again below.
  const r3 = v => Math.round(v * 1000) / 1000
  const SIGHT_SHIFT = (SZ - 8) * 2.4
  const ADS = (a => ({ ...a, translation: [r3(a.translation[0] + SIGHT_SHIFT), a.translation[1], a.translation[2]] }))(aim({ sightY: SY, rearX: 14.5, rearDepth: 1.6, scale: [1.6, 2.4, 2.4] }))
  const ADS_L = { ...mirror(ADS), translation: [r3(ADS.translation[0] - 2 * SIGHT_SHIFT), ADS.translation[1], ADS.translation[2]] }
  const BORE_Y = 8.0
  const MUZZLE = -14.25
  const FX = 8 // the flash is drawn this far back (+x) and moved out in its frames
  const GRIP = { angle: 15, axis: 'z', origin: [14.3, 5.3, 8] }
  // The magazine curves forward as it rises in three steps; each step turns about the back corner of the one below it
  // (the back of the curve stays closed, the fronts overlap). seg(k) = the k-th box, its back-bottom corner on the
  // pivot, turned by its angle about it.
  const MAG = { x1: 9.8, y0: 10.5, steps: [[4.0, 2.3, 4], [3.9, 2.1, 15], [3.75, 1.9, 27]], z0: 7.15, z1: 8.85 }
  const magSegs = (() => {
    const out = []
    let px = MAG.x1; let py = MAG.y0
    for (const [w, h, a] of MAG.steps) {
      out.push({ px, py, w, h, a })
      const r = a * Math.PI / 180
      px = px - h * Math.sin(r); py = py + h * Math.cos(r)
    }
    return out
  })()
  const segRot = s => ({ angle: s.a, axis: 'z', origin: [s.px, s.py, 8] })
  // A 7x7 pixel star (rows top to bottom) of cells c units, centred on (cx, cy), flush on the stock's side at z.
  const star = (cx, cy, c, z0, z1, dir) => {
    const rows = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.']
    const out = []
    rows.forEach((row, r) => {
      // Runs of # in the row: one box each.
      for (let i = 0; i < 7;) {
        if (row[i] !== '#') { i++; continue }
        let j = i
        while (j < 7 && row[j] === '#') j++
        const x0 = cx + (i - 3.5) * c; const x1 = cx + (j - 3.5) * c
        const y1 = cy + (3.5 - r) * c; const y0 = y1 - c
        out.push({ from: [x0, y0, z0], to: [x1, y1, z1], c: 'star', outline: false, dirs: [dir] })
        i = j
      }
    })
    return out
  }
  const gun = pgGun(name, {
    palette: {
      metal: [104, 108, 116], metalL: [156, 160, 168], metalD: [62, 64, 72], dark: [28, 29, 34],
      // The aimed-through parts have keys of their own (skins never recolor them): the front blade and the aperture.
      post: [26, 27, 32], sight: [62, 64, 72],
      mag: [198, 202, 208], magL: [228, 230, 234], magD: [104, 108, 116], magS: [170, 174, 180],
      wood: [150, 92, 52], woodL: [196, 136, 84], woodD: [118, 68, 40],
      blue: [40, 92, 200], blueL: [96, 146, 236], star: [244, 244, 238],
      bore: [10, 10, 12], flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    parts: {
      body: [
        // The conical flash hider: three steps widening toward the mouth, the hollow inside, a light rim.
        { from: [-12.0, BORE_Y - 0.85, 7.15], to: [-11.0, BORE_Y + 0.85, 8.85], c: { all: 'metalD', up: 'metal' } },
        { from: [-13.1, BORE_Y - 1.02, 6.98], to: [-12.0, BORE_Y + 1.02, 9.02], c: { all: 'metalD', up: 'metal' } },
        { from: [MUZZLE, BORE_Y - 1.2, 6.8], to: [-13.1, BORE_Y + 1.2, 9.2], c: { all: 'metal', up: 'metalL' }, ink: 'dark' },
        { from: [MUZZLE - 0.02, BORE_Y - 0.82, 7.18], to: [MUZZLE, BORE_Y + 0.82, 8.82], c: 'bore', dirs: ['west'], outline: false },
        // The front sight: a bracket off the barrel's left, the blade on it (its tip on the sight line), two ears.
        { from: [-11.0, 8.3, 8.6], to: [-10.2, 9.0, SZ + 0.85], c: { all: 'metalD', up: 'metal' }, ink: 'dark' },
        { from: [-10.82, 9.0, SZ - 0.2], to: [-10.38, SY, SZ + 0.2], c: 'post' },
        { from: [-10.85, 9.0, SZ + 0.48], to: [-10.35, SY - 0.45, SZ + 0.78], c: 'metalD', outline: false },
        { from: [-10.85, 9.0, SZ - 0.78], to: [-10.35, SY - 0.45, SZ - 0.48], c: 'metalD', outline: false },
        // The barrel, the gas regulator joining it to the gas tube under it, the gas tube back to the receiver.
        // (The barrel is 1.4 units, 3 texels tall: its outline in metalD, not dark, or the whole face reads black.)
        { from: [-11.0, BORE_Y - 0.7, 7.3], to: [1.4, BORE_Y + 0.7, 8.7], c: 'metal', pat: 'chrome', ink: 'metalD' },
        { from: [-10.2, 5.6, 7.2], to: [-9.2, BORE_Y + 0.4, 8.8], c: { all: 'metalD', up: 'metal' }, ink: 'dark' },
        { from: [-9.2, 5.9, 7.4], to: [2.6, BORE_Y - 0.65, 8.6], c: 'metalD', ink: 'dark' },
        // The bipod folded: its clamp on the gas tube, the two legs back along it (a thicker upper and a thinner lower
        // tube each), the spade feet tucked under the receiver's front.
        { from: [-8.6, 5.4, 6.6], to: [-7.4, 7.4, 9.4], c: { all: 'metalD', up: 'metal' }, ink: 'dark' },
        { from: [-7.6, 5.55, 9.0], to: [0.4, 6.25, 9.6], c: { all: 'metalD', up: 'metal' }, ink: 'dark' },
        { from: [0.4, 5.65, 9.05], to: [2.8, 6.15, 9.55], c: 'metal', outline: false },
        { from: [-7.6, 5.55, 6.4], to: [0.4, 6.25, 7.0], c: { all: 'metalD', up: 'metal' }, ink: 'dark' },
        { from: [0.4, 5.65, 6.45], to: [2.8, 6.15, 6.95], c: 'metal', outline: false },
        { from: [2.6, 4.9, 8.95], to: [3.7, 6.35, 9.85], c: { all: 'metalD', up: 'metal' }, ink: 'dark' },
        { from: [2.6, 4.9, 6.15], to: [3.7, 6.35, 7.05], c: { all: 'metalD', up: 'metal' }, ink: 'dark' },
        // The carrying handle, folded down on the right: two arms off the barrel nut, the grip bar along the barrel.
        { from: [0.2, 8.0, 6.0], to: [1.0, 8.7, 7.45], c: 'metalD', ink: 'dark' },
        { from: [-3.4, 7.9, 5.4], to: [1.0, 8.8, 6.0], c: { all: 'woodD', up: 'wood' } },
        // The barrel nut and the receiver: grey with a light line along the top of each side and a darker band along
        // the bottom, the cocking handle's slot on the left, the magazine well and catch on top.
        { from: [1.0, 6.5, 6.8], to: [3.0, 9.6, 9.2], c: { all: 'metalD', up: 'metal' }, ink: 'dark' },
        { from: [2.6, 6.4, 7.0], to: [16.4, 10.0, 9.0], c: { all: 'metal', up: 'metalL' } },
        { from: [3.0, 9.55, 6.96], to: [16.2, 9.85, 9.04], c: 'metalL', outline: false, dirs: ['north', 'south'] },
        { from: [3.0, 6.55, 6.96], to: [16.2, 7.0, 9.04], c: 'metalD', outline: false, dirs: ['north', 'south'] },
        { from: [3.4, 7.1, 9.0], to: [9.4, 7.5, 9.04], c: 'bore', outline: false, dirs: ['south'] },
        { from: [5.4, 10.0, 6.95], to: [10.0, 10.5, 9.05], c: { all: 'metalD', up: 'dark' }, ink: 'dark' },
        { from: [10.0, 10.0, 7.5], to: [10.7, 11.0, 8.5], c: 'metalD', ink: 'dark' },
        // The rear sight: the range drum on the left, the aperture ring on it around the sight line.
        { from: [13.4, 7.6, 9.0], to: [15.4, 9.9, 10.5], c: { all: 'metalD', up: 'metal' }, ink: 'dark' },
        { from: [14.0, 9.9, SZ - 0.85], to: [14.5, SY - 0.5, SZ + 0.85], c: 'sight', outline: false },
        { from: [14.0, SY - 0.5, SZ - 0.85], to: [14.5, SY + 0.5, SZ - 0.45], c: 'sight', outline: false },
        { from: [14.0, SY - 0.5, SZ + 0.45], to: [14.5, SY + 0.5, SZ + 0.85], c: 'sight', outline: false },
        { from: [14.0, SY + 0.5, SZ - 0.85], to: [14.5, SY + 0.85, SZ + 0.85], c: 'sight', outline: false },
        // The trigger housing under the receiver, the guard and the trigger.
        { from: [10.4, 5.3, 7.15], to: [16.4, 6.4, 8.85], c: 'metalD' },
        { from: [10.6, 4.1, 7.5], to: [13.6, 4.6, 8.5], c: 'metal' },
        { from: [10.6, 4.6, 7.5], to: [11.1, 5.3, 8.5], c: 'metal' },
        { from: [11.9, 4.5, 7.75], to: [12.4, 5.3, 8.25], c: 'metalL' },
        // The wooden pistol grip, raked back, with a dark cap.
        { from: [13.0, 0.9, 7.0], to: [15.6, 5.3, 9.0], c: 'wood', pat: { north: 'grain', south: 'grain', all: 'flat' }, rot: GRIP },
        { from: [12.9, 0.5, 6.95], to: [15.7, 0.9, 9.05], c: 'woodD', rot: GRIP }
      ],
      // The stock (its own part: hidden while aiming, where it would sit against the cheek): a wooden neck, the butt
      // stepping down to its end (PG3D's pixel staircase, dark underneath), a light streak along the top, the blue band
      // around the end, a white star on each side, a dark butt plate.
      stock: [
        { from: [16.4, 6.6, 7.15], to: [19.8, 9.5, 8.85], c: { all: 'metalD', up: 'metal' }, ink: 'dark' },
        { from: [19.6, 5.4, 7.0], to: [28.8, 9.6, 9.0], c: 'wood', pat: 'grain' },
        { from: [19.8, 9.0, 6.96], to: [28.6, 9.4, 9.04], c: 'woodL', outline: false, dirs: ['north', 'south'] },
        { from: [22.2, 4.4, 7.02], to: [28.8, 5.4, 8.98], c: 'woodD' },
        { from: [25.2, 3.4, 7.04], to: [28.8, 4.4, 8.96], c: 'woodD' },
        { from: [26.0, 3.2, 6.9], to: [27.2, 9.8, 9.1], c: { all: 'blue', up: 'blueL' }, ink: 'dark' },
        ...star(23.3, 7.45, 0.42, 9.0, 9.03, 'south'),
        ...star(23.3, 7.45, 0.42, 6.97, 7.0, 'north'),
        { from: [28.8, 2.9, 6.9], to: [29.8, 9.9, 9.1], c: 'dark', ink: 'metalD' }
      ],
      // The cocking handle on the left, at the front of its slot (racked back +x along it).
      bolt: [
        { from: [3.75, 7.05, 9.0], to: [4.35, 7.55, 9.85], c: 'metalL', outline: false },
        { from: [3.3, 6.7, 9.85], to: [4.8, 7.9, 10.75], c: { all: 'metal', south: 'metalL', up: 'metalL' }, outline: false }
      ],
      // The magazine: three light grey steps curving forward, a dark floor plate on top, a dark lip where it sits in
      // the well.
      mag: [
        { from: [5.9, 10.3, 7.05], to: [9.9, 10.7, 8.95], c: 'magD', ink: 'dark' },
        ...magSegs.map(s => ({ from: [s.px - s.w, s.py - 0.05, MAG.z0], to: [s.px, s.py + s.h, MAG.z1], c: { all: 'mag', up: 'magL' }, ink: 'magS', rot: segRot(s) })),
        // Dark front and back edges down each side (the curve's outline; the steps' own seams stay faint).
        ...magSegs.flatMap(s => [[s.px - s.w, s.px - s.w + 0.4], [s.px - 0.4, s.px]].map(([x0, x1]) => ({ from: [x0, s.py - 0.05, MAG.z0 - 0.02], to: [x1, s.py + s.h, MAG.z1 + 0.02], c: 'magD', outline: false, dirs: ['north', 'south'], rot: segRot(s) }))),
        ...(s => [{ from: [s.px - s.w - 0.1, s.py + s.h, MAG.z0 - 0.08], to: [s.px + 0.1, s.py + s.h + 0.45, MAG.z1 + 0.08], c: 'magD', ink: 'dark', rot: segRot(s) }])(magSegs[magSegs.length - 1])
      ],
      // The flash (drawn FX back; its frames move it out): a hot core at the cone's mouth, a jet forward, and a star of
      // spikes out of the cone (a cross and an X).
      flash: [
        { from: [MUZZLE - 3.0 + FX, BORE_Y - 1.7, 6.3], to: [MUZZLE + FX, BORE_Y + 1.7, 9.7], c: 'flashCore', glow: true },
        { from: [MUZZLE - 7.5 + FX, BORE_Y - 0.6, 7.4], to: [MUZZLE - 3.0 + FX, BORE_Y + 0.6, 8.6], c: 'flash', glow: true },
        { from: [MUZZLE - 2.2 + FX, BORE_Y - 4.4, 7.45], to: [MUZZLE - 1.0 + FX, BORE_Y + 4.4, 8.55], c: 'flash', glow: true },
        { from: [MUZZLE - 2.2 + FX, BORE_Y - 0.55, 3.6], to: [MUZZLE - 1.0 + FX, BORE_Y + 0.55, 12.4], c: 'flash', glow: true },
        { from: [MUZZLE - 2.0 + FX, BORE_Y - 3.6, 7.5], to: [MUZZLE - 1.2 + FX, BORE_Y + 3.6, 8.5], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZZLE - 1.6 + FX, BORE_Y, 8] } },
        { from: [MUZZLE - 2.0 + FX, BORE_Y - 0.5, 4.4], to: [MUZZLE - 1.2 + FX, BORE_Y + 0.5, 11.6], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZZLE - 1.6 + FX, BORE_Y, 8] } }
      ],
      // A smaller flash (the flicker's second size, and the only one aiming shows: an X under and right of the sight
      // line and a plume up out of the cone, which is what shows over the rear sight's drum while aiming).
      flash2: [
        { from: [MUZZLE - 2.2 + FX, BORE_Y - 1.2, 6.8], to: [MUZZLE + FX, BORE_Y + 1.2, 9.2], c: 'flashCore', glow: true },
        { from: [MUZZLE - 5.0 + FX, BORE_Y - 0.45, 7.55], to: [MUZZLE - 2.2 + FX, BORE_Y + 0.45, 8.45], c: 'flash', glow: true },
        { from: [MUZZLE - 1.7 + FX, BORE_Y - 2.2, 7.6], to: [MUZZLE - 0.9 + FX, BORE_Y + 2.6, 8.4], c: 'flash', glow: true },
        { from: [MUZZLE - 1.6 + FX, BORE_Y - 2.6, 7.65], to: [MUZZLE - 1.0 + FX, BORE_Y + 2.6, 8.35], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZZLE - 1.3 + FX, BORE_Y, 8] } },
        { from: [MUZZLE - 1.6 + FX, BORE_Y - 0.35, 5.4], to: [MUZZLE - 1.0 + FX, BORE_Y + 0.35, 10.6], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [MUZZLE - 1.3 + FX, BORE_Y, 8] } }
      ]
    },
    hidden: ['flash', 'flash2'],
    noFull: ['flash', 'flash2'],
    display: display({
      firstperson: { rotation: [0, -76, 0], translation: [-4.2, 4.5, -1.6], scale: [0.56, 0.56, 0.56] },
      thirdperson: { rotation: [0, -90, 0], translation: [0, 1.5, -5.6], scale: [0.72, 0.72, 0.72] },
      gui: { rotation: [0, 180, -30], translation: [0.4, 0.3, 0], scale: [0.4, 0.4, 0.4] },
      ground: { rotation: [0, 0, -45], translation: [-1, 7.5, 0], scale: [0.75, 0.75, 0.75] },
      fixed: { rotation: [0, 0, -45], translation: [-0.75, 0.75, -1], scale: [0.75, 0.75, 0.75] }
    }),
    states: {
      ads: ADS, // the right hand's (the left hand's is written below)
      sprint: { rotation: [-10, -46, 16], translation: [-4.4, 2.6, -2.6], scale: [0.52, 0.52, 0.52] }
    }
  })
  // The aim's models again, each hand its own translation (see ADS above): every part's and the full model's.
  for (const p of [...gun.parts, 'full']) write(`donating/models/item/${name}_${p}_ads.json`, { parent: `donating:item/${name}_${p}`, display: { firstperson_righthand: ADS, firstperson_lefthand: ADS_L } })
  // The shoulder pivot (the grip's top, behind the trigger): kicks turn the muzzle up about it.
  const SHOULDER = [14.3, 5.6, 8]
  const OUT = rig({ t: [-FX, 0, 0] }) // the flash moved out to the muzzle
  // Fire held (full-auto, 9 shots a second: one every 2-3 ticks, so the frames flicker at random each tick): a pose is
  // picked afresh every frame (pg.js firing: wobble off), so they share one heavy, steady kick (1.0 back, 2.0 degrees
  // up: a heavy gun climbs less than the Patriot) with a small jitter, and the flash (one of two sizes, or none for a
  // frame) is what flickers; the magazine trembles on top. k scales the kick (the aim's is smaller); aiming the magazine
  // stays still and only the small flash shows.
  const fire = (k, also = {}) => {
    const aimed = k < 1
    const big = aimed ? 'flash2' : 'flash'
    const shake = (dx, dy) => aimed ? {} : { mag: rig({ t: [dx, dy, 0] }) }
    const kick = (dx, up, yaw) => rig({ t: [(1.0 + dx) * k, 0.1 * k, 0], rot: [[[0, 0, 1], -(2.0 + up) * k], [[0, 1, 0], yaw * k]], pivot: SHOULDER })
    return [
      { ...also, show: [big], flash: OUT, flash2: OUT, gun: kick(0.08, 0.3, 0.25), ...shake(0.06, 0.05) },
      { ...also, show: ['flash2'], flash: OUT, flash2: OUT, gun: kick(-0.06, -0.25, -0.3), ...shake(-0.04, -0.03) },
      { ...also, show: [big], flash: OUT, flash2: OUT, gun: kick(0.1, 0.35, -0.15), ...shake(0.03, 0.06) },
      { ...also, flash: OUT, flash2: OUT, gun: kick(-0.08, -0.3, 0.1), ...shake(-0.05, 0) }
    ]
  }
  // The draw (GunFx: 40 ticks when it's equipped; MG34.yml Weapon_Equip_Delay 40): the heavy gun swings up from below
  // the screen, muzzle down and rolled out, arrives at p 0.4 and dips under its weight (0.38-0.54); it rolls its top
  // toward you (0.48-0.58) and the magazine is checked: lifted a hair (0.55-0.6) and pressed home (a jolt at 0.645);
  // then it turns its left side to you (0.64-0.7) and the cocking handle is racked: back 0.70-0.76, held, let go
  // 0.80-0.815 (a snap); level again by 0.95. The draw sound follows it (tools\sounds\guns\lmg.js: the settle 0.84 s,
  // the magazine 1.2 s and 1.29 s, the handle 1.4 s, 1.52 s and 1.62 s).
  const draw = p => {
    const e = 1 - ease.out(Math.min(1, p / 0.4))
    const sag = ease.bump(p, 0.38, 0.54, 0.44)
    const top = ease.ramp(p, 0.48, 0.58) * (1 - ease.ramp(p, 0.64, 0.7)) // its top toward you: the magazine checked
    const side = ease.ramp(p, 0.64, 0.7) * (1 - ease.ramp(p, 0.84, 0.95)) // its left side toward you: the handle racked
    const lift = ease.bump(p, 0.55, 0.64, 0.6)
    const seat = ease.bump(p, 0.63, 0.7, 0.645)
    const pull = p < 0.8 ? ease.ramp(p, 0.7, 0.76) : 1 - ease.ramp(p, 0.8, 0.815)
    const snap = ease.bump(p, 0.81, 0.9, 0.83)
    return {
      gun: rig({
        t: [2.2 * e + 0.4 * snap, -11 * e - 0.6 * sag - 0.3 * seat + 0.8 * top + 0.6 * side, 0.7 * top + 0.5 * side],
        rot: [[[1, 0, 0], -16 * e + 15 * top - 14 * side], [[0, 1, 0], 7 * top + 10 * side], [[0, 0, 1], 30 * e - 1.6 * sag - 0.8 * seat + 1.2 * snap]],
        pivot: SHOULDER
      }),
      mag: rig({ t: [0, 0.9 * lift - 0.15 * seat, 0], rot: [[[0, 0, 1], 6 * lift]], pivot: [5.9, 10.5, 8] }),
      bolt: rig({ t: [4.4 * pull, 0, 0] })
    }
  }
  // The reload (GunFx: a cooldown as long as WeaponMechanics' reload: 80 ticks with rounds left, 96 from empty, when the
  // silent Firearm_Action's 8 + 8 come around it). The sounds are timed to it in MG34.yml (Start_Mechanics,
  // delayBeforePlay = 88p - 4, splitting the two clocks): mag_out 10 (p 0.16), mag_in 45 (p 0.555: the hook; its latch
  // 0.2 s and its slap 0.37 s later), charge 59 (p 0.72: caught at the back 0.22 s later, let go 0.4 s later). The gun
  // comes down a little and rolls its top toward you (0-0.1); the magazine's catch is pressed (a tug, 0.1-0.16), the
  // magazine tips forward off its front lip and is lifted up and away toward you (0.16-0.34); gone (0.34-0.44); a new
  // one comes back the same way tipped forward (0.44-0.55), hooks its front lip and rocks back into the well (0.55-0.6,
  // a jolt), slapped down (0.62-0.68); the gun turns its left side to you (0.64-0.72) and the cocking handle is racked:
  // back 0.72-0.77, held, let go 0.80-0.815 (a snap); level again by 0.96.
  const MAG_LIP = [5.9, 10.5, 8] // the magazine's front lip in the well: it tips about it
  const reload = p => {
    const a = ease.ramp(p, 0, 0.1) * (1 - ease.ramp(p, 0.62, 0.68)) // its top toward you: the magazine changed
    const b = ease.ramp(p, 0.64, 0.72) * (1 - ease.ramp(p, 0.86, 0.96)) // its left side toward you: the handle racked
    const tug = ease.bump(p, 0.1, 0.16, 0.13)
    const seat = ease.bump(p, 0.58, 0.66, 0.6)
    const slap = ease.bump(p, 0.62, 0.68, 0.64)
    let tip = 0
    let up = 0
    if (p < 0.4) { tip = ease.ramp(p, 0.16, 0.24); up = ease.ramp(p, 0.2, 0.34) } else { up = 1 - ease.ramp(p, 0.44, 0.55); tip = 1 - ease.ramp(p, 0.54, 0.6) }
    const pull = p < 0.8 ? ease.ramp(p, 0.72, 0.77) : 1 - ease.ramp(p, 0.8, 0.815)
    const snap = ease.bump(p, 0.81, 0.9, 0.83)
    return {
      gun: rig({
        t: [0.3 * tug + 0.4 * snap, -0.8 * a + 0.8 * b - 0.4 * seat - 0.3 * slap, 1.4 * a + 0.6 * b],
        rot: [[[1, 0, 0], 20 * a - 16 * b - 2 * slap], [[0, 1, 0], 10 * a + 12 * b], [[0, 0, 1], -6 * a - 2 * b - 1.5 * seat - 1 * slap + 1.5 * snap]],
        pivot: [9, 6, 8]
      }),
      mag: rig({ t: [-3 * up, 9 * up - 0.15 * slap, 7 * up], rot: [[[0, 0, 1], 24 * tip - 4 * tug], [[1, 0, 0], 30 * up]], pivot: MAG_LIP }),
      bolt: rig({ t: [4.4 * pull, 0, 0] }),
      hide: p > 0.34 && p < 0.44 ? ['mag'] : []
    }
  }
  const AIMED = { hide: ['stock'] }
  // Default: the draw while its cooldown runs, else fire held / the rest pose.
  const drawn = gun.cooldown('', 40, draw)
  drawn.fallback = gun.firing('', fire(1))
  return {
    11: gun.byContext('', drawn),
    1011: gun.byContext('ads', gun.firing('ads', fire(0.45, AIMED), AIMED)),
    2011: gun.byContext('sprint', gun.composite('sprint')),
    3011: gun.byContext('', gun.cooldown('', 96, reload))
  }
}
