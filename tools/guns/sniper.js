// The sniper slot (WeaponMechanics weapons\sniper_rifles\AX_50.yml, title AX_50, shown as "Sniper Rifle"; skins
// Default 13, Scope +1000, Sprint +2000, Reload +3000). 2026-10-06, remade the same day at the Photon level of detail
// (the kit's PG painter: style 'pg', density 4): a recreation of Pixel Gun 3D's default "Sniper Rifle" as its wiki
// Appearance shows it today (drawn by hand from the wiki's pictures, nothing taken from the game): a long wooden
// M40-style rifle in saturated orange wood (a tall forend whose underside steps up toward a dark end-grain tip, a
// routed slot and dark grain dashes, a straight wrist and a belly stepping down to a tall butt with a raised comb, a
// light steel spacer and a dark ribbed pad), a heavy square blue-steel barrel with one long glint and a muzzle block
// with a hollow square face and a front-sight post, a blue-steel receiver with panel seams and screws, a big blue-steel
// scope (a black-rimmed objective bell around a recessed blue lens, dark rings with clamp screws on top, a ribbed
// turret, a steel eyepiece with a black rubber eye cup and a checkered blue glass), a big blue-steel box magazine with a
// light band, and the bolt on the LEFT (+z: the side first person sees; PG3D's rifle is a left-handed bolt action): an
// L-shaped silver handle with a square knob. A brass case only shows when it flies out.
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
//     black funnel, a thin blue ring at the objective and a window about 55% of the screen's height with duplex posts
//     (thick outside, thin toward the crosshair; the centre left open) and three ranging ticks on the lower thin post.
//     No overlay: the world shows through the window and at the screen's sides, with or without the FOV-effects
//     slider (the first-person item is drawn at a fixed 70 degrees; zoom never scales it). The lens has no face toward
//     the eye (culled from inside), and the part noads (the eyepiece's glass, which faces the eye, and the right-hand
//     windage turret, which stuck into the view at the right edge on 16:10 and wider screens) is hidden while aiming.
//     Every face seen through the scope (the funnel's insides, the corner slabs, the bell's insides, the lens) is flat:
//     no bands, bevels or glints in the view. The Scope state never draws the bolt: the kick only (translations: the
//     state's scale is 10x deeper than wide, so a turn would be amplified), and nothing for the draw or action clocks.
// Built along x, muzzle toward -x, centred on z = 8; the sight line is the scope's axis, y = SY. Every box stays
// within the client's element bounds, -16..32 on each axis (a model with one box outside fails to load: the missing-
// model cube): the rifle is exactly 48 units long, muzzle face at x = -16, butt pad at 32, and the muzzle flash is
// drawn 9 units back inside the bounds and moved out to the muzzle by its frame's transformation. Boxes sit on the
// 1/4 grid (density 4: square texels, seams that line up) except the scope's, which are measured from its axis
// (SY, HI: the aimed view depends on them).
// ADS limits (d(x) = 0.45 + 0.0256 (16.8 - x) blocks from the eye): in front of the lens nothing rises above the
// window's lower edge y = SY - 1.476 d (10.90 at x -16: the front-sight blade stops at 10.75); in front of the
// eyepiece nothing within |y - SY| < 2.8 d reaches |z - 8| > 3.9 d (the side edges of 16:9 and wider screens: the
// ring screws sit on top, the windage turret is in noads); behind the eyepiece nothing rises above SY - 2.8 d (11.96
// at x 22.6: the comb stops at 11.5).
module.exports = ({ pg, aim, display }) => {
  const { pgGun, ease, rig, then } = pg
  const name = 'gun_sniper'
  const SY = 12.8 // the scope's axis (aim(), the posts, the ADS window)
  const HI = 1.2 // the scope's inner half-size (the view through it: a window ~55% of the screen's height)
  const BORE = 8.5 // the barrel's axis (the flash is drawn around it)
  // The colour of a box's faces: c (a key or { all, up, ... }), with the face toward the scope's axis set to inner.
  const faces = (c, face, inner) => {
    const base = typeof c === 'string' ? { all: c } : { ...c }
    if (inner) base[face] = inner
    return base
  }
  // A hollow square tube along x around the scope's axis: walls from the inner half-size hi to the outer ho. The face
  // toward the axis is always flat (material and pattern): it's what the eye sees through the scope. more.top: decals
  // on the top wall only; more.pat / more.mat: a key or { all, ... } for the outward faces; more.ink, more.grain: on
  // every wall; more.deco: the side walls' outward faces only.
  const INNER = ['north', 'south', 'down', 'up']
  const tube = (x0, x1, ho, hi, c, inner, more = {}) => [
    { from: [x0, SY - ho, 8 + hi], to: [x1, SY + ho, 8 + ho], c: faces(c, 'north', inner) }, // left (+z)
    { from: [x0, SY - ho, 8 - ho], to: [x1, SY + ho, 8 - hi], c: faces(c, 'south', inner) }, // right (-z)
    { from: [x0, SY + hi, 8 - hi], to: [x1, SY + ho, 8 + hi], c: faces(c, 'down', inner), ...(more.top ? { deco: more.top } : {}) }, // top
    { from: [x0, SY - ho, 8 - hi], to: [x1, SY - hi, 8 + hi], c: faces(c, 'up', inner) } // bottom
  ].map((b, i) => {
    const o = { ...b, ...(more.ink ? { ink: more.ink } : {}), ...(more.grain != null ? { grain: more.grain } : {}) }
    const per = v => typeof v === 'string' ? { all: v } : { ...v }
    if (more.mat) o.mat = { ...per(more.mat), [INNER[i]]: 'flat' }
    if (more.pat) o.pat = { ...per(more.pat), [INNER[i]]: 'flat' }
    if (inner && !more.mat) o.mat = { all: undefined, [INNER[i]]: 'flat' }
    if (inner && !more.pat) o.pat = { [INNER[i]]: 'flat' }
    if (more.deco && i < 2) o.deco = more.deco.map(d => ({ ...d, face: i === 0 ? 'south' : 'north' })) // the side walls' outward faces only
    return o
  })
  // The corners of the opening cut off (an octagon, rounder through the scope): a slab at the inner half-size,
  // turned 45 degrees about the axis, in each corner. Flat, no outline (seen through the scope).
  const W8 = HI * Math.tan(Math.PI / 8) + 0.03
  const T8 = HI * (Math.SQRT2 - 1) + 0.08
  const corners = (x0, x1, inner) => [45, -45].flatMap(angle => [
    { from: [x0, SY + HI, 8 - W8], to: [x1, SY + HI + T8, 8 + W8], c: { all: 'scopeIn', down: inner }, mat: 'flat', outline: false, rot: { angle, axis: 'x', origin: [x0, SY, 8] } },
    { from: [x0, SY - HI - T8, 8 - W8], to: [x1, SY - HI, 8 + W8], c: { all: 'scopeIn', up: inner }, mat: 'flat', outline: false, rot: { angle, axis: 'x', origin: [x0, SY, 8] } }
  ])
  // Duplex posts at the objective's inner end (facing the eye only): thick from the wall to 0.45 of the opening,
  // thin from there to 0.12 (the crosshair's gap); three ranging ticks across the lower thin post (PG3D's ladder).
  const XP = [2.75, 2.85]
  const post = (y0, y1, z0, z1) => ({ from: [XP[0], y0, z0], to: [XP[1], y1, z1], c: 'reticle', mat: 'flat', outline: false, dirs: ['east'] })
  const TK = 0.035; const TN = 0.013 // half-thicknesses
  const R1 = 0.45 * HI; const R0 = 0.12 * HI
  const posts = [
    post(SY + R1, SY + HI, 8 - TK, 8 + TK), post(SY - HI, SY - R1, 8 - TK, 8 + TK),
    post(SY - TK, SY + TK, 8 + R1, 8 + HI), post(SY - TK, SY + TK, 8 - HI, 8 - R1),
    post(SY + R0, SY + R1, 8 - TN, 8 + TN), post(SY - R1, SY - R0, 8 - TN, 8 + TN),
    post(SY - TN, SY + TN, 8 + R0, 8 + R1), post(SY - TN, SY + TN, 8 - R1, 8 - R0),
    ...[0.24, 0.34, 0.44].map(k => post(SY - k * HI - TN, SY - k * HI + TN, 8 - 0.06, 8 + 0.06))
  ]
  const SCOPE = { all: 'scope', up: 'scopeT' } // KEEP keys only: the scope stays steel-blue under every skin
  const BELL = { all: 'scope', up: 'scopeT', west: 'scopeIn' } // the objective's thick black front rim
  const FLASH_BACK = 9 // the flash is drawn this far back (+x) inside the bounds and moved out by its frame
  const W = { all: 'wood', up: 'woodL', down: 'woodD' } // a wood box: lit top, dark underside
  const WI = { ink: 'woodDD' } // wood outlines in dark brown (softer seams between the stepped boxes)
  // Dark grain dashes (PG3D's wood: short blocky marks along the grain): pixel art from the rect's corner, on both
  // sides (mirrored on the right). d = the darkest wood, - = the face's lo tone.
  const DASH = [
    ['dd--......', '.......-dd', '...d......'],
    ['-dd....', '...--dd', '.......'],
    ['..dd-.....-d', 'd.......dd..'],
    ['d-......', '..--dd..', '.....-..']
  ]
  const dash = (x, y, i) => ({ k: 'stamp', face: 'sides', at: [x, y], to: [x + 3, y - 0.75], keys: { d: 'woodDD' }, rows: DASH[i % DASH.length] })
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
    style: 'pg',
    density: 4,
    palette: {
      wood: [196, 104, 34], woodL: [226, 134, 52], woodD: [128, 62, 20], woodDD: [70, 36, 14], woodC: { of: 'wood', f: 0.84 },
      gun: [92, 118, 142], gunL: [150, 180, 204], gunD: [40, 52, 66],
      chrome: [184, 204, 220], chromeD: [120, 142, 164],
      scope: [62, 90, 122], scopeT: [108, 144, 180], scopeIn: [10, 12, 16], rubber: [26, 30, 36],
      lens: [84, 140, 196], lensB: [200, 230, 250], glass: [20, 76, 124], glassB: [100, 160, 200],
      pad: [44, 30, 22], spacer: [176, 196, 212],
      brass: [228, 184, 78], brassD: [168, 124, 44],
      bore: [8, 8, 10], reticle: [6, 6, 8],
      flash: [255, 196, 64], flashCore: [255, 248, 210]
    },
    mats: { wood: 'wood', woodL: 'wood', woodD: 'wood', woodDD: 'wood', woodC: 'wood', gun: 'metal', gunL: 'metal', gunD: 'dark', chrome: 'chrome', chromeD: 'chrome', scope: 'metal', scopeT: 'metal', scopeIn: 'flat', rubber: 'rubber', lens: 'glass', lensB: 'flat', glass: 'glass', glassB: 'flat', pad: 'rubber', spacer: 'chrome', brass: 'metal', brassD: 'metal', bore: 'flat', reticle: 'flat', flash: 'glow', flashCore: 'glow' },
    parts: {
      body: [
        // ---- the barrel: a heavy square barrel (2.0) in lit steel (gunL: the Appearance's brightest part), one long
        // glint (no bands), a step collar, the muzzle block (bigger, dark) with a hollow square face (ink frame, a grey
        // ring, the black bore), a front-sight post on top (a 3-texel light blade with no outline, so it doesn't read
        // as an ink blob; under the ADS window's lower edge: 10.90 there).
        { from: [-14.25, BORE - 1.0, 7.0], to: [6.0, BORE + 1.0, 9.0], c: { all: 'gunL', down: 'gunD' }, pat: 'chrome2', mat: 'chrome' },
        { from: [-14.75, BORE - 1.25, 6.75], to: [-14.25, BORE + 1.25, 9.25], c: { all: 'gunD', up: 'gun' } },
        { from: [-15.98, BORE - 1.5, 6.5], to: [-14.75, BORE + 1.5, 9.5], c: { all: 'gunD', up: 'gun' }, deco: [{ k: 'inset', face: 'west', at: [6.75, BORE + 1.25], to: [9.25, BORE - 1.25], c: 'gun' }, { k: 'slots', face: 'sides', n: 1, at: [-15.75, BORE + 0.75], to: [-15.0, BORE - 0.75], dir: 'v' }] },
        { from: [-16.0, BORE - 0.5, 7.5], to: [-15.98, BORE + 0.5, 8.5], c: 'bore', dirs: ['west'], outline: false },
        { from: [-15.5, BORE + 1.5, 7.5], to: [-14.75, BORE + 1.75, 8.5], c: 'gunD' },
        { from: [-15.5, BORE + 1.75, 7.625], to: [-14.75, BORE + 2.25, 8.375], c: { all: 'gunL', up: 'chrome' }, outline: false },
        // ---- the forend: the barrel enclosed (top 10), the underside stepping up toward the tip (two dark-seamed
        // steps), a dark end-grain tip cap, a routed slot near the top of each side, grain dashes.
        { from: [-2.0, 7.0, 6.75], to: [6.5, 10.0, 9.25], c: W, ...WI, deco: [{ k: 'inset', at: [1.0, 9.5], to: [6.0, 8.75], c: 'woodD' }, dash(-1.5, 8.25, 0), dash(2.5, 8.0, 1)] },
        { from: [1.0, 6.5, 6.75], to: [6.5, 7.0, 9.25], c: W, ink: 'woodD' },
        { from: [3.75, 6.0, 6.75], to: [6.5, 6.5, 9.25], c: W, ink: 'woodD' },
        { from: [-3.25, 7.25, 7.0], to: [-2.0, 9.75, 9.0], c: { all: 'woodDD', west: 'woodD' }, ...WI, pat: 'grain', deco: [{ k: 'stamp', face: 'west', at: [7.0, 9.75], to: [9.0, 7.25], keys: { d: 'woodDD', l: 'woodD' }, rows: ['........', '.l..dd..', '.ll.d.l.', '..l...l.', '.dd..ll.', '.d...l..', '..ll..d.', '...l.dd.', '.d......', '.dd.l...'] }] },
        // ---- the bed under the action (top 8.5: the port above it stays visible), dashes in front of the magazine
        { from: [6.5, 5.5, 6.75], to: [18.5, 8.5, 9.25], c: W, ...WI, deco: [dash(7.0, 7.25, 2), dash(7.5, 6.5, 3)] },
        // ---- the wrist (straight: PG3D's rifle has no pistol grip) with low-contrast checkering, the belly stepping
        // down to a tall butt with a routed slot, the comb on top
        { from: [18.5, 5.5, 6.75], to: [21.25, 9.25, 9.25], c: W, ...WI, deco: [{ k: 'stamp', face: 'sides', at: [18.75, 8.75], to: [21.0, 6.0], keys: { d: 'woodC' }, rows: ['d.d.d.d.d', '.d.d.d.d.', 'd.d.d.d.d', '.d.d.d.d.', 'd.d.d.d.d', '.d.d.d.d.', 'd.d.d.d.d', '.d.d.d.d.', 'd.d.d.d.d', '.d.d.d.d.', 'd.d.d.d.d'] }] },
        { from: [21.25, 5.0, 6.75], to: [30.75, 10.5, 9.25], c: W, ...WI, deco: [{ k: 'inset', at: [25.5, 10.0], to: [30.25, 9.25], c: 'woodD' }, dash(22.0, 7.5, 0), dash(26.5, 6.75, 2), dash(23.5, 9.25, 3)] },
        { from: [24.5, 4.25, 6.75], to: [30.75, 5.0, 9.25], c: W, ink: 'woodD' },
        { from: [27.75, 3.5, 6.75], to: [30.75, 4.25, 9.25], c: W, ink: 'woodD' },
        { from: [22.5, 10.5, 7.0], to: [29.5, 11.5, 9.0], c: W, ...WI, deco: [{ k: 'stamp', face: 'sides', at: [23.0, 11.25], to: [28.5, 10.75], keys: { d: 'woodDD' }, rows: ['', '.-dd.......--d'] }] },
        // ---- the butt: a light steel spacer line and a dark ribbed rubber pad
        { from: [30.75, 3.5, 6.75], to: [31.0, 10.5, 9.25], c: 'spacer', outline: false },
        { from: [31.0, 3.25, 6.5], to: [32.0, 10.75, 9.5], c: 'pad', deco: [{ k: 'slots', face: 'east', n: 7, at: [6.75, 10.5], to: [9.25, 3.5] }, { k: 'slots', face: 'sides', n: 1, dir: 'v', at: [31.25, 10.5], to: [31.75, 3.5] }] },
        // ---- sling studs (silver, dark ink: light ink made the small silver bits float as grey smudges)
        { from: [0.0, 6.25, 7.5], to: [0.75, 7.0, 8.5], c: 'chrome', ink: 'gunD' },
        { from: [28.25, 2.75, 7.5], to: [29.0, 3.5, 8.5], c: 'chrome', ink: 'gunD' },
        // ---- the receiver (blue steel, a panel seam each side of the port, action screws), the chunky recoil-lug block
        // in front (it hides the step from the forend's top down to the bed), the ejection port and the bolt's track on
        // the left, the ribbed bolt shroud at the back.
        { from: [6.5, 8.25, 7.0], to: [17.5, 10.5, 9.0], c: { all: 'gun', up: 'gunL', down: 'gunD' }, grain: 0.07, split: { x: [10.0, 14.0] }, deco: [{ k: 'rivets', face: 'sides', n: 1, size: 2, at: [7.25, 9.75], to: [8.25, 8.75] }, { k: 'rivets', face: 'sides', n: 1, size: 2, at: [15.0, 10.5], to: [16.0, 9.75] }, { k: 'slots', face: 'up', n: 1, at: [10.25, 7.25], to: [13.75, 8.75] }] },
        { from: [5.5, 8.0, 6.75], to: [6.75, 11.0, 9.25], c: { all: 'gunD', up: 'gun' }, deco: [{ k: 'rivets', face: 'sides', n: 2, size: 1, at: [5.75, 10.75], to: [6.5, 8.25] }] },
        { from: [10.0, 8.75, 9.0], to: [14.0, 10.0, 9.02], c: 'bore', ink: 'gunD', dirs: ['south'] },
        { from: [14.0, 9.0, 9.0], to: [17.5, 9.25, 9.02], c: 'bore', outline: false, dirs: ['south'] },
        { from: [17.5, 8.5, 7.25], to: [18.5, 10.0, 8.75], c: 'gunD', deco: [{ k: 'ribs', face: 'sides', at: [17.5, 10.0], to: [18.5, 8.5], c: 'gun' }] },
        // ---- the trigger guard (a dark loop just behind the magazine) and a silver trigger
        { from: [14.75, 4.25, 7.5], to: [18.5, 4.75, 8.5], c: 'gunD' },
        { from: [14.75, 4.75, 7.5], to: [15.25, 5.5, 8.5], c: 'gunD' },
        { from: [18.0, 4.75, 7.5], to: [18.5, 5.5, 8.5], c: 'gunD' },
        { from: [16.25, 4.75, 7.75], to: [16.75, 5.5, 8.25], c: 'chrome', ink: 'gunD', rot: { angle: 22.5, axis: 'z', origin: [16.5, 5.5, 8] } },
        // ---- the scope: ring bases on the receiver, dark rings with clamp screws on top (never on the sides: the
        // side-edge rule), the big objective bell (a thick black front rim around the recessed blue lens, a seam), a lit
        // ring and a step down to the main tube, the elevation turret (ribbed cap), a steel collar, the steel eyepiece
        // with a seam and a black rubber eye cup; inside the octagonal funnel and the posts (seen through in ADS).
        { from: [7.0, 10.5, 7.25], to: [8.5, 11.25, 8.75], c: 'gunD' },
        { from: [12.25, 10.5, 7.25], to: [13.75, 11.25, 8.75], c: 'gunD' },
        ...tube(7.0, 8.5, 1.75, 1.5, { all: 'gunD', up: 'gun' }, null, { grain: 0.06, top: [{ k: 'rivets', face: 'up', n: 2, size: 2, at: [7.25, 6.75], to: [8.25, 9.25] }] }),
        ...tube(12.25, 13.75, 1.75, 1.5, { all: 'gunD', up: 'gun' }, null, { grain: 0.06, top: [{ k: 'rivets', face: 'up', n: 2, size: 2, at: [12.5, 6.75], to: [13.5, 9.25] }] }),
        ...tube(2.0, 5.0, 2.25, HI, BELL, 'lens', { pat: { all: 'chrome2', west: 'flat' }, mat: { all: 'chrome', west: 'dark' }, deco: [{ k: 'slots', face: 'sides', n: 1, dir: 'v', at: [3.75, SY + 2.25], to: [4.25, SY - 2.25] }] }),
        ...tube(5.0, 5.5, 2.0, HI, { all: 'scopeT', down: 'scope' }, 'scopeIn'),
        ...tube(5.5, 5.75, 1.75, HI, SCOPE, 'scopeIn'),
        ...tube(5.75, 14.25, 1.5, HI, SCOPE, 'scopeIn', { pat: 'chrome2', mat: 'chrome' }),
        ...tube(14.25, 15.0, 1.75, HI, { all: 'gunD', up: 'gun' }, 'scopeIn'),
        ...tube(15.0, 16.25, 1.8, HI, SCOPE, 'scopeIn', { pat: 'chrome2', mat: 'chrome' }),
        ...tube(16.25, 16.8, 1.8, HI, 'rubber', 'scopeIn', { pat: 'flat' }),
        ...corners(2.0, 5.0, 'lens'),
        ...corners(5.0, 16.8, 'scopeIn'),
        { from: [9.25, SY + 1.5, 7.25], to: [10.5, SY + 2.0, 8.75], c: 'gunD' },
        { from: [9.0, SY + 2.0, 7.0], to: [10.75, SY + 2.75, 9.0], c: { all: 'gunD', up: 'gun' }, deco: [{ k: 'ribs', face: 'sides', at: [9.0, SY + 2.5], to: [10.75, SY + 2.25], c: 'gun' }, { k: 'ribs', face: 'ends', at: [7.0, SY + 2.5], to: [9.0, SY + 2.25], c: 'gun' }, { k: 'stamp', face: 'up', at: [9.75, 7.75], to: [10.0, 8.25], keys: { w: 'chrome' }, rows: ['w', 'w'] }] },
        // the lens (glows; the glass pattern: darker lower right, a glint top left), recessed in the bell (its sides
        // hidden in the walls; the octagon corners round its face from the front), and an extra glint chip in front
        { from: [2.25, SY - HI - 0.15, 8 - HI - 0.15], to: [2.5, SY + HI + 0.15, 8 + HI + 0.15], c: 'lens', glow: true, mat: 'glass', dirs: ['west', 'north', 'south', 'up', 'down'] },
        { from: [2.23, SY + 0.25, 8 + 0.2], to: [2.25, SY + 0.75, 8 + 0.7], c: 'lensB', glow: true, dirs: ['west'] },
        ...posts
      ],
      // Hidden while aiming: the eyepiece's glass (PG3D's dark blue 3x3 checker in an ink rim, a glint: it faces the
      // eye) and the windage turret on the right (-z; through the scope it stood at the right edge of 16:10 and wider
      // screens).
      noads: [
        { from: [16.75, SY - HI, 8 - HI], to: [16.8, SY + HI, 8 + HI], c: 'glass', ink: 'scopeIn', dirs: ['east'], deco: [{ k: 'stamp', face: 'east', at: [8 + HI, SY + HI], to: [8 - HI, SY - HI], keys: { a: 'glass', b: 'glassB' }, rows: ['..........', '.aaabbbaaa', '.aaabbbaaa', '.aaabbbaaa', '.bbbaaabbb', '.bbbaaabbb', '.bbbaaabbb', '.aaabbbaaa', '.aaabbbaaa', '.aaabbbaaa'] }] },
        { from: [16.8, SY + 0.2, 8 + 0.15], to: [16.82, SY + 0.7, 8 + 0.65], c: 'glassB', outline: false, dirs: ['east'] },
        { from: [9.25, SY - 0.75, 6.0], to: [10.5, SY + 0.75, 6.5], c: 'gunD' },
        { from: [9.0, SY - 1.0, 5.25], to: [10.75, SY + 1.0, 6.0], c: { all: 'gunD', north: 'gun' }, deco: [{ k: 'ribs', face: 'ends', at: [5.25, SY + 0.75], to: [6.0, SY - 0.75], c: 'gun' }, { k: 'ribs', face: 'flats', at: [9.0, 5.25], to: [10.75, 6.0], c: 'gun' }] }
      ],
      // The bolt: its chrome body (seen in the port), a PG3D L-shaped handle (out of the receiver's left side, then
      // straight down over the wood, a square knob) with no droop: turned 62 degrees about BOLT it stays under the
      // eyepiece (boltcheck), and at rest the knob stands just outside the wood's side. Lifted about the bolt's axis,
      // pulled back +x.
      bolt: [
        { from: [10.25, 9.0, 9.0], to: [13.75, 9.75, 9.04], c: 'chrome', ink: 'chromeD', dirs: ['south', 'east', 'west', 'up', 'down'] },
        { from: [15.25, 8.75, 8.75], to: [16.0, 9.25, 9.75], c: 'chrome', ink: 'chromeD' },
        { from: [15.25, 7.25, 9.25], to: [16.0, 9.25, 9.75], c: 'chrome', ink: 'chromeD' },
        { from: [15.0, 6.25, 9.25], to: [16.25, 7.25, 10.5], c: 'chrome', ink: 'chromeD', deco: [{ k: 'slots', face: 'sides', n: 1, at: [15.0, 6.75], to: [16.25, 6.5] }] }
      ],
      // The box magazine (big, blue steel, a light band and a seam; its top hidden in the stock), a silver floor plate.
      mag: [
        { from: [11.0, 3.75, 7.0], to: [14.5, 7.75, 9.0], c: { all: 'gun', down: 'gunD' }, deco: [{ k: 'band', face: 'sides', at: [11.0, 5.5], to: [14.5, 5.0], c: 'gunL' }, { k: 'slots', face: 'sides', n: 1, at: [11.0, 4.5], to: [14.5, 4.0] }] },
        { from: [10.75, 3.0, 6.75], to: [14.75, 3.75, 9.25], c: 'chrome', ink: 'gunD' }
      ],
      // A spent case (brass, a darker neck), in the chamber: shown only while it flies out.
      case: [
        { from: [11.0, 9.0, 7.75], to: [13.5, 9.75, 8.25], c: { all: 'brass', down: 'brassD' }, ink: 'brassD' },
        { from: [10.25, 9.25, 7.75], to: [11.0, 9.5, 8.25], c: 'brassD', ink: 'brassD' }
      ],
      // The muzzle flash, drawn FLASH_BACK units back from where it shows (the bounds stop at x = -16; the frame's
      // transformation moves it out to the muzzle): a core on the muzzle face (bigger than the
      // muzzle block, 3.0 square, so it shows round it from behind), a long tongue, a star of short rays.
      flash: [
        { from: [-18.8, BORE - 1.95, 6.05], to: [-16.0, BORE + 1.95, 9.95], c: 'flashCore', glow: true },
        { from: [-24.4, BORE - 0.6, 7.4], to: [-18.8, BORE + 0.6, 8.6], c: 'flash', glow: true },
        { from: [-18.2, BORE + 1.95, 7.5], to: [-16.8, BORE + 4.4, 8.5], c: 'flash', glow: true },
        { from: [-18.2, BORE - 4.4, 7.5], to: [-16.8, BORE - 1.95, 8.5], c: 'flash', glow: true },
        { from: [-18.2, BORE - 0.5, 3.6], to: [-16.8, BORE + 0.5, 6.05], c: 'flash', glow: true },
        { from: [-18.2, BORE - 0.5, 9.95], to: [-16.8, BORE + 0.5, 12.4], c: 'flash', glow: true },
        { from: [-18.0, BORE - 0.45, 3.9], to: [-17.0, BORE + 0.45, 12.1], c: 'flash', glow: true, rot: { angle: 45, axis: 'x', origin: [-17.5, BORE, 8] } },
        { from: [-18.0, BORE - 0.45, 3.9], to: [-17.0, BORE + 0.45, 12.1], c: 'flash', glow: true, rot: { angle: -45, axis: 'x', origin: [-17.5, BORE, 8] } }
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

  const SHOULDER = [20, 7.0, 8] // the wrist's top: kicks turn the muzzle up about it
  const BOLT = [15.6, 9.2, 8] // the bolt's axis
  const CANT = [12, 9, 8]
  const MAGP = [12.75, 5.5, 8] // the magazine's centre where it enters the stock
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
      mag: rig({ t: [0.6 * drop, -12 * drop, 0], rot: [[[0, 0, 1], 8 * drop]], pivot: MAGP }),
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
