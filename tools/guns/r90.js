// The shotgun slot (WeaponMechanics weapons\shotguns\R9_0.yml, "Shotgun"; skins Default 14, Scope +1000, Sprint
// +2000, Reload +3000). A recreation of Pixel Gun 3D's default pump "Shotgun" in its current look (the owner,
// 2026-10-05: the sold guns remade as PG3D's; 2026-10-06: at the Photon Shotgun's level of detail), drawn by hand from
// the wiki's picture (nothing taken from the game): a short pump gun with no stock, a gunmetal barrel stacked over a
// gunmetal magazine tube, each with a chrome stripe and dim reflections, a black muzzle block (taller than the barrel,
// vent slots, the bore a lit square in a black frame) with a red fiber-optic bead, a silver clamp where the tubes
// meet, a ribbed walnut pump just ahead of the receiver, a dark receiver frame with a bright silver side plate (a
// black-framed ejection port with the silver bolt inside, two pins, a roll mark), a stepped rear into the grip, a
// chunky black trigger guard and a raked black grip (two walnut strips on each side, dark blotches) with a black butt.
// The port is on both sides: with the muzzle toward -x the gun's right is -z (the inventory icon, the side view and
// the ground), first person and the front-left third-person view see +z.
// PG style (tools\guns\pg.js style 'pg', density 4): every face has its material's tones, bevels and grain; the
// details are decals (deco) and seams (split) on the faces, so most of them cost no elements.
// Frames (GunFx: R9_0 shot 15 ticks, alone 5, action 15 with flag 1; each shell its own 4-tick reload clock): a shot
// flashes, kicks the gun back and its muzzle up, then the pump is racked back (the bolt slides across the port under
// the plate and a red shell pops out) and forward. Reloading, the gun is canted to show the loading port under the
// receiver and each shell (red, brass base) is pushed up into it; the cant is held between shells, so a row of shells
// doesn't wobble. A pump WeaponMechanics works without a shot (after a reload from empty) is the pump alone (flag 1).
// Built along x, muzzle toward -x, centred on z = 8; the sight line is the tops of the bead and the rear notch, y = SY.
// Every outlined box sits on the 0.25 grid (one texel).
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig } = pg
  const name = 'gun_r90'
  const SY = 12
  // The pistol grip: segments turned about their top (raked back: +angle about z), so the grip bends back as it goes
  // down. P0 = where it meets the receiver; the joints are kept on the 0.25 grid (J1 ~3.25 down the first segment at
  // 22 degrees, J2 ~2.75 down the second at 34).
  const seg = (top, len, half, a, z0, z1) => ({ from: [top[0] - half, top[1] - len, z0], to: [top[0] + half, top[1], z1], rot: { angle: a, axis: 'z', origin: [top[0], top[1], 8] } })
  const P0 = [17.5, 7]
  const J1 = [18.75, 4]
  const J2 = [20.25, 1.75]
  // A thin side detail on both sides: the +z copy (faces dirsS) and its mirror about z = 8 (faces dirsN).
  const sides = (x0, y0, x1, y1, zOut, th, props, dirsS = ['south'], dirsN = ['north']) => [
    { from: [x0, y0, zOut], to: [x1, y1, zOut + th], dirs: dirsS, ...props },
    { from: [x0, y0, 16 - zOut - th], to: [x1, y1, 16 - zOut], dirs: dirsN, ...props }
  ]
  const EDGES_S = ['south', 'up', 'down', 'east', 'west']
  const EDGES_N = ['north', 'up', 'down', 'east', 'west']
  // The silver side plate (0.5 proud of the frame: z 9.5..10 and mirrored) in pieces round the ejection port window
  // (x 13.25..17, y 8.75..10.5), so the bolt can slide under it; no outline and no bevel of its own (the receiver's dark
  // frame shows round it; the pieces read as one plate): a lit top band, a black ring round the window with a lit lip
  // under it, a darker bottom row, two pins (screw heads) and a roll mark (lines only, never letters).
  const plate = (x0, y0, x1, y1, props) => sides(x0, y0, x1, y1, 9.5, 0.5, { c: 'silver', mat: 'metal', outline: false, bevel: 0, bands: false, grain: 0.04, ...props }, EDGES_S, EDGES_N)
  const PLATE = [
    ...plate(11.75, 10.5, 18, 11, { pat: 'chrome2', deco: [{ k: 'band', at: [13, 10.75], to: [17.25, 10.5], c: 'port' }] }),
    ...plate(11.75, 7, 18.75, 8.75, {
      deco: [
        { k: 'band', at: [13, 8.75], to: [17.25, 8.5], c: 'port' },
        { k: 'band', at: [13.25, 8.5], to: [17, 8.25], c: 'silverHi' },
        { k: 'band', at: [11.75, 7.25], to: [18.75, 7], c: 'silverMid' },
        { k: 'rivets', at: [15.25, 8], to: [18.25, 7.5], n: 2, size: 2, c: 'gmDark' },
        { k: 'band', at: [12.5, 8.25], to: [14.5, 8], c: 'silverDark' }, { k: 'band', at: [12.5, 7.75], to: [13.75, 7.5], c: 'silverDark' }
      ]
    }),
    ...plate(11.75, 8.75, 13.25, 10.5, { deco: [{ k: 'band', at: [13, 10.5], to: [13.25, 8.75], c: 'port' }, { k: 'band', at: [11.75, 10.5], to: [12, 8.75], c: 'silverHi' }] }),
    // the rear one reaches back to the frame's end (18.75): a racked bolt hides under it
    ...plate(17, 8.75, 18.75, 10.5, { deco: [{ k: 'band', at: [17, 10.5], to: [17.25, 8.75], c: 'port' }, { k: 'band', at: [18.5, 10.5], to: [18.75, 8.75], c: 'silverMid' }] })
  ]
  // ---------- the hands (pg.js spec.hands; handoff/2026-10-12/hands/PLAN.md) ----------
  // The right glove on the grip (its top where it meets the receiver, raked 22 degrees; 3 deep and 2.5 wide: 1.3 times
  // the shared glove); the left hand (only while shells load) under the shell, its C turned along it, the thumb behind
  // the brass: it lifts each shell into the loading port and thumbs it forward into the tube.
  const { then, hands } = pg
  const { OR, OL } = hands
  const RH = rig({ t: [P0[0] - OR[0], P0[1] - OR[1], 8 - OR[2]], rot: [[[0, 0, 1], 22]], pivot: OR })
  const LH = rig({ t: [14.9 - OL[0], 9.8 - 1.3 - OL[1], 9.2 - OL[2]], rot: [[[0, 0, 1], 90]], pivot: OL })
  const gun = pgGun(name, {
    hands: { right: { at: RH, scale: 1.3, armScale: 0.9 }, left: { at: LH, shown: false, armScale: 0.9 }, leftTree: false },
    style: 'pg',
    density: 4,
    palette: {
      // silver: the side plate, the chrome stripes and lines, the clamp, the bolt (every skin themes these)
      silverHi: [242, 244, 247], silver: [204, 208, 215], silverMid: [160, 165, 174], silverDark: [104, 109, 118],
      // gunmetal: the receiver frame, the tubes, the muzzle block, the guard, the butt (tones derive from gm)
      gm: [44, 47, 54], gmHi: { of: 'gm', k: 1 }, gmMid: { of: 'gm', f: 0.82 }, gmDark: { of: 'gm', k: -1 },
      port: [16, 17, 21],
      // walnut: the pump and the grip
      wood: [122, 76, 46], woodLight: [156, 104, 66], woodDark: [86, 52, 31], woodDeep: { of: 'wood', k: -2 },
      grip: [104, 64, 40], gripDark: [66, 38, 22],
      // aimed through or fixed (never recolored by a skin): the rear notch, the bore, the bead
      post: [40, 42, 48], bore: [14, 15, 19], bead: [232, 56, 40], beadHi: [255, 120, 96],
      steel: [150, 156, 166],
      hull: [204, 44, 36], hullDark: [140, 26, 22], brass: [226, 182, 76], brassDark: [168, 124, 44],
      flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    mats: {
      silverHi: 'chrome', silver: 'chrome', silverMid: 'metal', silverDark: 'metal',
      gm: 'metal', port: 'flat',
      wood: 'wood', woodLight: 'wood', woodDark: 'wood', grip: 'wood', gripDark: 'wood',
      post: 'flat', bore: 'flat', bead: 'glow', beadHi: 'glow', steel: 'metal',
      hull: 'paint', hullDark: 'paint', brass: 'metal', brassDark: 'metal', flash: 'glow', flashCore: 'glow'
    },
    parts: {
      body: [
        // ---------- the receiver: a dark frame (the plate covers most of its sides) ----------
        {
          from: [11.5, 6.5, 6.5], to: [18.75, 11.5, 9.5], c: { all: 'gm', north: 'gmDark', south: 'gmDark', down: 'gmMid' },
          split: { y: [8.75] }, // the window's lower edge (and a seam on the ends)
          deco: [
            // on top: chrome edge lines and a rib groove down the middle (texture only: the sight corridor stays clear)
            { k: 'band', face: 'up', at: [11.75, 6.75], to: [17.75, 7], c: 'silverMid' },
            { k: 'band', face: 'up', at: [11.75, 9], to: [17.75, 9.25], c: 'silverMid' },
            { k: 'slots', face: 'up', at: [12, 7.75], to: [17.5, 8.25], n: 1 },
            // the rear face's serrations above the step (the aim view)
            { k: 'slots', face: 'east', at: [9, 11.25], to: [7, 10.75], n: 2 },
            { k: 'rivets', face: 'west', at: [9.25, 7.5], to: [6.75, 7], n: 2, size: 2, c: 'gmHi' },
            // underneath: the loading port (the reload frames push shells into it)
            { k: 'inset', face: 'down', at: [11.75, 7.25], to: [14.5, 8.75], c: 'gm' }
          ]
        },
        // the rear steps down into the grip (a staircase); its rear faces (what aiming sees): an inset, grooves, a tang screw
        { from: [18.75, 8.25, 6.75], to: [19.25, 10.75, 9.25], c: { all: 'gm', up: 'gmHi', east: 'gmHi' }, deco: [{ k: 'inset', face: 'east', at: [9, 10.5], to: [7, 8.5], c: 'gm' }, { k: 'slots', face: 'east', at: [8.75, 10], to: [7.25, 9], n: 2 }] },
        { from: [19.25, 7, 7], to: [19.75, 9, 9], c: { all: 'gm', up: 'gmHi', east: 'gmHi' }, deco: [{ k: 'rivets', face: 'east', at: [8.5, 8.5], to: [7.5, 7.5], n: 1, size: 2, c: 'silverMid' }] },
        // the barrel nut ring (a step where the barrel enters)
        { from: [11, 8.75, 6.5], to: [11.5, 11.25, 9.5], c: { all: 'gm', up: 'gmHi' } },
        // the rear notch (KEEP 'post')
        { from: [18, 11.5, 7.25], to: [18.75, SY, 7.75], c: 'post' },
        { from: [18, 11.5, 8.25], to: [18.75, SY, 8.75], c: 'post' },
        ...PLATE,
        // ---------- the trigger group: housing, a chunky black guard, a steel trigger ----------
        { from: [14.5, 6, 7], to: [18.75, 6.5, 9], c: 'gmMid' },
        { from: [14.75, 4.25, 7.25], to: [17.5, 5, 8.75], c: { all: 'gm', up: 'gmHi' } },
        { from: [14.75, 5, 7.25], to: [15.5, 6, 8.75], c: { all: 'gm', west: 'gmHi' } },
        { from: [15.75, 5, 7.75], to: [16.25, 6, 8.25], c: 'steel', rot: { angle: 12, axis: 'z', origin: [16, 6, 8] } },
        // ---------- the grip: black, two walnut strips a side (a black line between, dark blotches), a screw, a black butt ----------
        // (the lower segment is a texel thinner each side, so where they overlap the upper one's faces win)
        { ...seg(P0, 3.75, 1.5, 22, 6.75, 9.25), c: { all: 'gm', north: 'grip', south: 'grip' }, deco: [{ k: 'band', at: [17.25, 7], to: [17.75, 3.25], c: 'port' }, { k: 'stamp', at: [16.5, 5.5], to: [17, 5], rows: ['dd', 'd'], keys: { d: 'gripDark' } }, { k: 'stamp', at: [18.25, 4.75], to: [18.5, 4.25], rows: ['d', 'd'], keys: { d: 'gripDark' } }, { k: 'rivets', at: [16.5, 6.5], to: [17, 6], n: 1, size: 2, c: 'silverMid' }] },
        { ...seg(J1, 3, 1.5, 34, 7, 9), c: { all: 'gm', north: 'grip', south: 'grip' }, deco: [{ k: 'band', at: [18.5, 4], to: [19, 1], c: 'port' }, { k: 'stamp', at: [19.25, 2.75], to: [19.5, 2.25], rows: ['dd', 'd'], keys: { d: 'gripDark' } }] },
        { ...seg(J2, 0.75, 1.75, 40, 6.5, 9.5), c: { all: 'gm', down: 'gmDark' }, split: { x: [20.25] }, deco: [{ k: 'rivets', face: 'flats', at: [19, 7.75], to: [19.5, 8.25], n: 1, size: 2, c: 'gmHi' }, { k: 'rivets', face: 'flats', at: [21, 7.75], to: [21.5, 8.25], n: 1, size: 2, c: 'gmHi' }] },
        // ---------- the barrel: gunmetal, a chrome line on top toward the bead, a chrome stripe, dim reflections ----------
        {
          from: [-0.5, 8.75, 6.75], to: [11, 11, 9.25], c: { all: 'gm', down: 'gmMid' }, dirs: ['north', 'south', 'up', 'down'],
          deco: [
            { k: 'band', face: 'up', at: [-0.25, 7.75], to: [10.75, 8.25], c: 'silver' },
            { k: 'band', at: [-0.25, 10.75], to: [10.75, 10], c: 'silver' },
            { k: 'band', at: [0.25, 9.25], to: [2.75, 9], c: 'gmHi' },
            { k: 'band', at: [5.25, 9.25], to: [7.5, 9], c: 'gmHi' },
            { k: 'band', face: 'down', at: [0, 7.25], to: [2.5, 7.5], c: 'gmHi' }
          ]
        },
        // the silver clamp where the tubes meet (the barrel's top chrome line runs on over it), a screw each side
        { from: [3, 7.5, 6.5], to: [4, 10, 9.5], c: { all: 'silver', down: 'silverMid' }, deco: [{ k: 'rivets', at: [3.25, 9], to: [3.75, 8.5], n: 1, size: 2, c: 'silverDark' }] },
        // ---------- the magazine tube: gunmetal, a chrome stripe, ends short of the muzzle with a cap ----------
        {
          from: [-1, 6.75, 7], to: [11.5, 8.75, 9], c: { all: 'gm', down: 'gmMid' }, dirs: ['north', 'south', 'down'],
          deco: [
            { k: 'band', at: [-0.75, 8.5], to: [3, 7.75], c: 'silver' },
            { k: 'band', at: [-0.75, 8.5], to: [0.25, 7.75], c: 'silverHi' },
            { k: 'band', at: [9, 8.5], to: [11.25, 7.75], c: 'silverMid' },
            { k: 'band', at: [0.5, 7.25], to: [2.5, 7], c: 'gmHi' },
            { k: 'band', face: 'down', at: [-0.5, 7.75], to: [2.75, 8.25], c: 'gmHi' }
          ]
        },
        { from: [-1.5, 6.5, 6.75], to: [-1, 8.75, 9.25], c: { all: 'gm', up: 'gmHi', west: 'gmMid' }, deco: [{ k: 'inset', face: 'west', at: [7.25, 8.25], to: [8.75, 7], c: 'silverMid' }] },
        // ---------- the muzzle block: taller than the barrel, vent slots, the bore, the bead ----------
        {
          from: [-3, 8.5, 6.75], to: [-0.5, 11.25, 9.25], c: { all: 'gm', up: 'gmHi', down: 'gmMid' },
          deco: [
            { k: 'slots', at: [-2.5, 10.75], to: [-1, 9.75], n: 2 },
            { k: 'inset', face: 'west', at: [7.25, 10.75], to: [8.75, 9], c: 'silverMid' },
            { k: 'stamp', face: 'west', at: [7.75, 10.25], to: [8.25, 9.75], rows: ['bb', 'bb'], keys: { b: 'bore' } }
          ]
        },
        { from: [-2.75, 11.25, 7.625], to: [-1.75, SY, 8.375], c: { all: 'bead', up: 'beadHi', east: 'beadHi' }, glow: true }
      ],
      pump: [
        // the walnut pump: five ribs (a lengthwise groove low down, ribbed on top too), dark brown grooves and edges; the action
        // bars into the receiver; the bolt on the receiver's side under the plate (it closes the front of the window
        // at rest, racked +2.4 it shows at the window's rear and the rest slides under the plate)
        {
          from: [4.5, 6, 6.5], to: [8.75, 8.75, 9.5], c: { all: 'wood', up: 'woodLight', down: 'woodDark' }, ink: 'woodDeep',
          deco: [
            { k: 'ribs', at: [4.75, 8.5], to: [8.5, 6.25], c: 'wood', fin: 2 },
            { k: 'band', at: [4.75, 7], to: [8.5, 6.75], c: 'woodDeep' },
            { k: 'ribs', face: 'up', at: [4.75, 6.75], to: [8.5, 9.25], c: 'woodLight', fin: 2 }
          ]
        },
        { from: [8.75, 7.25, 6.75], to: [12.25, 8, 7], c: 'gmDark' },
        { from: [8.75, 7.25, 9], to: [12.25, 8, 9.25], c: 'gmDark' },
        ...sides(13.25, 9, 16.25, 10.25, 9.5, 0.25, { c: { all: 'silver', up: 'silverHi' }, ink: 'silverDark', deco: [{ k: 'band', at: [13.25, 9.5], to: [13.5, 9.25], c: 'port' }] }, EDGES_S, EDGES_N)
      ],
      shell: [
        // A spent (or a new) shell: red hull, brass base, a primer. Shown only by the frames.
        { from: [13.5, 9.25, 8.5], to: [15.25, 10.5, 9.75], c: { all: 'hull', down: 'hullDark' }, ink: 'hullDark' },
        { from: [15.25, 9.25, 8.5], to: [16, 10.5, 9.75], c: { all: 'brass', down: 'brassDark' }, ink: 'brassDark', deco: [{ k: 'rivets', face: 'east', at: [8.75, 10.25], to: [9.5, 9.5], n: 1, size: 2, c: 'silverMid' }] }
      ],
      flash: [
        { from: [-4.75, 8.625, 6.75], to: [-3, 11.125, 9.25], c: 'flashCore', glow: true },
        { from: [-8.5, 9.375, 7.5], to: [-4.75, 10.375, 8.5], c: 'flash', glow: true },
        { from: [-5.5, 11.125, 7.5], to: [-4.25, 13.375, 8.5], c: 'flash', glow: true },
        { from: [-5.5, 6.375, 7.5], to: [-4.25, 8.625, 8.5], c: 'flash', glow: true },
        { from: [-5.5, 9.375, 4.5], to: [-4.25, 10.375, 6.75], c: 'flash', glow: true },
        { from: [-5.5, 9.375, 9.25], to: [-4.25, 10.375, 11.5], c: 'flash', glow: true },
        { from: [-5.5, 9.375, 5.5], to: [-4.5, 10.375, 10.5], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [-5, 9.875, 8] } },
        { from: [-5.5, 9.375, 5.5], to: [-4.5, 10.375, 10.5], c: 'flash', glow: true, rot: { angle: -45, axis: 'x', origin: [-5, 9.875, 8] } }
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
      ads: aim({ sightY: SY, rearX: 18.75, rearDepth: 1.3, scale: [1.6, 2.4, 2.4] }),
      sprint: { rotation: [19.88, -26.19, 4.92], translation: [-6.28, 4.19, 2.95], scale: [0.72, 0.72, 0.72] }
    }
  })
  const GRIP = [17.6, 6.5, 8] // the hand
  const AXIS = [12, 9.4, 8] // the bore line through the receiver (the cant turns about it)
  const SHELL = [14.7, 9.8, 9.2] // the shell's centre
  const TRAVEL = 2.4 // how far the pump racks back (model units): its rear (8.75) stops short of the receiver (11.5)
  // A shot (GunFx: 15 ticks): the flash for the first ~15%, a big kick (back and muzzle up) gone by ~35%, the pump
  // racked back (35-55%) and forward (60-85%) with a small cant toward the eye, and a spent shell thrown out of the
  // +z port while it's back, arcing up and back over the receiver (not across the barrel toward the sight). k scales
  // the kick and the cant (aiming: smaller). WeaponMechanics works the pump after every second shot (R9_0.yml
  // Firearm_Action_Frequency 2: Open 7 + Close 7 ticks inside this 15-tick clock; its sounds are delayed to match:
  // pump_back at tick 5, pump_fwd at tick 9); after the other shots GunFx ends the clock at tick 5 (gunfx alone 5),
  // where the kick is spent and the pump hasn't moved yet.
  // fired false: the same pump with no kick and no flash (a pump WeaponMechanics works without a shot, below).
  const shot = (k = 1, fired = true) => p => {
    const kick = fired ? Math.pow(1 - Math.min(1, p / 0.35), 2) : 0
    const pump = ease.ramp(p, 0.35, 0.55) - ease.ramp(p, 0.6, 0.85)
    const rack = ease.bump(p, 0.33, 0.9, 0.5, 0.62)
    const pose = {
      show: fired && p < 0.15 ? ['flash'] : [],
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
  // 10° yaw; at 30° the port was still edge-on from the first-person camera) and the lift (4.5 up, 1.5 toward the
  // middle; 2.2 and 0.8 before the left hand: its thumb on the shell sat under the screen's edge) is what brings the loading port into view (with 18° and no lift the shell never showed above the screen's
  // bottom edge). GunFx gives a shell exactly WeaponMechanics' 4-tick reload task (getReloadTime: for a pump gun loading
  // one shell at a time WeaponMechanics never chains the Open/Close times its reload event reports into the reload).
  // The left hand (2026-10-12) brings each shell up from below and thumbs it in: four frames a shell, the same loop
  // for every shell (the timing is WeaponMechanics': 4 ticks a shell).
  // c: how far into the pose (0 at rest, 1 in it): the first shell eases in, the exit eases out (ShellLoad, below).
  const canted = (nod = 0, c = 1) => rig({ t: [0, (4.5 + 0.35 * nod) * c, 1.5 * c], rot: [[[1, 0, 0], -24 * c], [[0, 1, 0], 10 * c], [[0, 0, 1], (-6 - 2 * nod) * c]], pivot: AXIS })
  // From the shell's own spot at the ejection port: under the loading port, half into it, pushed forward into the
  // magazine tube (hidden in it). The receiver's bottom (the port) and the tube sit 0.5 lower than before the remake.
  const LOAD_START = [-1.45, -4.9, 0.4]
  const LOAD_PORT = [-1.8, -3.1, -1.2]
  const LOAD_IN = [-4.4, -1.85, -1.2]
  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
  // The left hand holds the shell from below (its rig is the shell's) and thumbs it in; on the last frame (the shell in
  // the tube) it slides off and drops a little for the next one, which is where it waits between shells.
  const shellRig = p => {
    const up = ease.ramp(p, 0.05, 0.55)
    const push = ease.ramp(p, 0.5, 0.95)
    const at = p < 0.5 ? lerp(LOAD_START, LOAD_PORT, up) : lerp(LOAD_PORT, LOAD_IN, push)
    const tilt = -25 * (1 - up) - 8 * (1 - push) * up
    return rig({ t: at, rot: [[[0, 0, 1], tilt]], pivot: SHELL })
  }
  const WAIT = then(then(LH, shellRig(0)), rig({ t: [0.5, -1.5, 0] }))
  const reload = p => {
    const off = ease.ramp(p, 0.8, 1) // the thumb slides off the pushed shell
    const place = then(then(LH, shellRig(p)), rig({ t: [1.2 * off, -1.0 * off, 0] }))
    return {
      show: p < 0.95 ? ['shell', 'lhand'] : ['lhand'],
      gun: canted(ease.bump(p, 0.35, 0.95, 0.6)),
      shell: shellRig(p),
      lhand: hands.pose(LH, place)
    }
  }
  const CANTED = { gun: canted(0), lhand: hands.pose(LH, WAIT), show: ['lhand'] }
  // The ends of the chain (DonatingPhone ShellLoad, 2026-10-13; the owner: "a reload animation like the other guns'").
  // WeaponMechanics times every shell alike, so the ends are its named skins: Shell_In (+10000) on the chain's first
  // shell, Shell_Out (+20000) for GunFx's 6-tick exit clock after the last (gunfx R9_0 exit 6), and through the pump
  // WeaponMechanics works right after a reload from empty (the 15-tick action clock, flag 1).
  // The first shell: the same shell, while the gun eases into the pose and the hand comes up from under the screen.
  const DOWN = (d, x = 0.5) => rig({ t: [x * d, -9 * d, 0] }) // the left hand dropped away under the screen's edge
  const reloadIn = p => {
    const r = reload(p)
    const rise = DOWN(1 - ease.ramp(p, 0, 0.45), 0)
    const off = ease.ramp(p, 0.8, 1)
    return {
      ...r,
      gun: canted(ease.bump(p, 0.35, 0.95, 0.6), ease.ramp(p, -0.1, 0.55)),
      shell: then(shellRig(p), rise),
      lhand: hands.pose(LH, then(then(then(LH, shellRig(p)), rig({ t: [1.2 * off, -1.0 * off, 0] })), rise))
    }
  }
  // After the last shell (6 ticks): the hand drops away and the gun rolls back to rest.
  const reloadOut = p => {
    const d = ease.ramp(p, 0, 0.6)
    return { gun: canted(0, 1 - ease.ramp(p, 0.05, 0.85)), lhand: hands.pose(LH, then(WAIT, DOWN(d))), show: p < 0.75 ? ['lhand'] : [] }
  }
  // After a reload from empty (15 ticks, WeaponMechanics' Open 7 + Close 7 and their sounds at ticks 5 and 9, like a
  // shot's pump): the gun rolls back while the left hand slides forward onto the pump, racks it back and forward, and
  // drops away (the tube was empty, so nothing is thrown out). LP: the hand under the pump (its C round the walnut, the thumb on the near side).
  const LP = rig({ t: [6.6 - OL[0], 6.0 - 0.9 - OL[1], 8.6 - OL[2]], rot: [[[0, 0, 1], 90]], pivot: OL })
  const pumpOut = p => {
    const s = shot(1, false)(p)
    const pump = ease.ramp(p, 0.35, 0.55) - ease.ramp(p, 0.6, 0.85)
    const onto = hands.mix(then(WAIT, DOWN(0.25)), then(LP, rig({ t: [0, -0.4, 0] })), ease.ramp(p, 0.04, 0.3))
    const held = then(then(LP, rig({ t: [TRAVEL * pump, 0, 0] })), DOWN(ease.ramp(p, 0.86, 0.98)))
    return {
      ...s,
      gun: then(s.gun, canted(0, 1 - ease.ramp(p, 0, 0.33))),
      lhand: hands.pose(LH, p < 0.32 ? onto : held),
      show: [...s.show.filter(x => x !== 'shell'), 'lhand'] // nothing spent in the chamber: no shell flies out
    }
  }
  // A pump WeaponMechanics works without a shot (the first click after a reload from empty leaves the pump open; an
  // interrupted pump): GunFx marks it with custom_model_data flag 1 and starts the same 15-tick clock (gunfx action 15;
  // WeaponMechanics' Open 7 + Close 7 and their delayed sounds line up with the shot's pump frames), so the pump racks
  // with no kick and no flash.
  const worked = (state, k) => ({
    type: 'minecraft:condition',
    property: 'minecraft:custom_model_data',
    index: 1,
    on_true: gun.cooldown(state, 15, shot(k, false)),
    on_false: gun.cooldown(state, 15, shot(k))
  })
  // The named skins with WeaponMechanics' other states (Scope +1000, Sprint +2000, Reload +3000) draw those states.
  const states = {
    14: gun.byContext('', worked('', 1)),
    1014: gun.byContext('ads', worked('ads', 0.4)),
    2014: gun.byContext('sprint', gun.composite('sprint')),
    3014: gun.byContext('', gun.cooldown('', 4, reload, CANTED))
  }
  return {
    ...states,
    10014: states[14],
    11014: states[1014],
    12014: states[2014],
    13014: gun.byContext('', gun.cooldown('', 4, reloadIn, CANTED)),
    20014: gun.byContext('', gun.flag(1, gun.cooldown('', 15, pumpOut), gun.cooldown('', 6, reloadOut))),
    21014: states[1014],
    22014: states[2014],
    23014: states[3014]
  }
}
