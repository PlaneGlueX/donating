// The gun kit (2026-10-05; the owner: the four sold guns remade as Pixel Gun 3D's, with first-person animations).
// PG3D's guns are a few dozen boxes with pixel-art faces: every face a flat color in two or three tones with a dark
// outline, a few patterns (chrome bands, leather specks, wood grain, serrations, stripes) and bright accents. So a
// gun here is a list of boxes, each named by a palette color and a pattern; the kit paints every face into one
// texture per gun (2 texels per model unit), splits the gun into parts the item definition can move (the body, a
// slide or pump, the magazine, the muzzle flash...), and builds the frames.
//
// Models (1 unit = 1/16 block; built along x with the muzzle toward -x and the sight line on z = 8, like every gun
// before): donating:item/<name>_base holds the texture and the display transforms; <name>_<part> each part's boxes;
// <name>_full every part but the flash (third person, the ground, item frames, the inventory icon); state children
// (<name>_<part>_<state>, <name>_full_<state>) only change first person (the aim and the sprint).
//
// Frames: the 26.1+ item definition's per-model "transformation" (the client applies it after the display
// transform, in the model's own space in blocks from its corner: checked in the 26.3 client, ItemTransform.apply then
// LayerRenderState's localTransform), so a moving part is the same model with another transform and frames cost no
// model files. The clocks: minecraft:cooldown (the item's cooldown group, which DonatingPhone's GunFx starts when
// WeaponMechanics reloads, shoots or draws; 1 -> 0, a step a tick), minecraft:keybind_down key.use (fire held, first
// person only) and minecraft:time random (flicker).
module.exports = ({ write, canvas, shade, display, both }) => {
  const round = v => Math.round(v * 10000) / 10000
  // A seeded random (mulberry32), so a pack build is byte-identical.
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  const hash = s => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261)
  const rgba = c => c.length === 4 ? c : [...c, 255]
  const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)).concat([255])

  // ---------- quaternions and rigid transforms (blocks) ----------
  const qAxis = (axis, deg) => {
    const a = deg * Math.PI / 360
    const n = Math.hypot(...axis) || 1
    return [axis[0] / n * Math.sin(a), axis[1] / n * Math.sin(a), axis[2] / n * Math.sin(a), Math.cos(a)]
  }
  const qMul = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
  ]
  const qRot = (q, v) => {
    const p = qMul(qMul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]])
    return [p[0], p[1], p[2]]
  }
  const ID = { t: [0, 0, 0], q: [0, 0, 0, 1] }
  // A rigid transform: translate by t (model units) after turning by rotations [axis, degrees] about the pivot
  // (model units). T(p + t) R T(-p) = T(p + t - R p) R.
  const rig = ({ t = [0, 0, 0], rot = [], pivot = [8, 8, 8] } = {}) => {
    let q = [0, 0, 0, 1]
    for (const [axis, deg] of rot) q = qMul(qAxis(axis, deg), q)
    const rp = qRot(q, pivot)
    return { t: [pivot[0] + t[0] - rp[0], pivot[1] + t[1] - rp[1], pivot[2] + t[2] - rp[2]], q }
  }
  // a then b: (b ∘ a)(v) = b(a(v)).
  const then = (a, b) => ({ t: qRot(b.q, a.t).map((v, i) => v + b.t[i]), q: qMul(b.q, a.q) })
  const isId = m => m.t.every(v => Math.abs(v) < 1e-6) && Math.abs(Math.abs(m.q[3]) - 1) < 1e-9
  const json = m => ({ translation: m.t.map(v => round(v / 16)), left_rotation: m.q.map(round), scale: [1, 1, 1], right_rotation: [0, 0, 0, 1] })

  // ---------- the painter ----------
  // Patterns paint a face tile (x0, y0, w, h texels; dir = the face) over its base tone.
  const PATTERNS = {
    flat: () => {},
    // Chrome: a bright band near the top, darker toward the bottom, and diagonal glints on the sides.
    chrome: (c, x0, y0, w, h, dir, col) => {
      for (let y = 0; y < h; y++) {
        const f = dir === 'up' ? 1.12 : dir === 'down' ? 0.7 : 1.18 - 0.45 * (y / Math.max(1, h - 1))
        for (let x = 0; x < w; x++) c.set(x0 + x, y0 + y, shade(col, f))
      }
      if (dir === 'north' || dir === 'south') for (let x = 2; x < w - 1; x += 7) for (let k = 0; k < Math.min(h - 1, 4); k++) c.set(x0 + x + k, y0 + 1 + k, shade(col, 1.32))
    },
    // Leather: specks of the darker and the lighter tone.
    speck: (c, x0, y0, w, h, dir, col, r) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = r()
        if (v < 0.12) c.set(x0 + x, y0 + y, shade(col, 0.72)); else if (v > 0.93) c.set(x0 + x, y0 + y, shade(col, 1.45))
      }
    },
    // Wood: streaks along the longer side.
    grain: (c, x0, y0, w, h, dir, col, r) => {
      const along = w >= h
      for (let i = 0; i < (along ? h : w); i++) {
        if (r() < 0.45) continue
        const f = r() < 0.5 ? 0.82 : 1.12
        for (let j = 0; j < (along ? w : h); j++) if (r() < 0.8) c.set(x0 + (along ? j : i), y0 + (along ? i : j), shade(col, f))
      }
    },
    // Serrations: dark vertical lines every 2 texels on the sides.
    serr: (c, x0, y0, w, h, dir, col) => {
      if (dir === 'up' || dir === 'down') return
      for (let x = 1; x < w; x += 2) for (let y = 1; y < h - 1; y++) c.set(x0 + x, y0 + y, shade(col, 0.6))
    },
    // Grooves: dark lines across, every 3 texels (a pump's grip).
    groove: (c, x0, y0, w, h, dir, col) => {
      for (let x = 2; x < w - 1; x += 3) for (let y = 0; y < h; y++) c.set(x0 + x, y0 + y, shade(col, 0.62))
    },
    // A checker grip.
    check: (c, x0, y0, w, h, dir, col) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x + y) % 2 === 0) c.set(x0 + x, y0 + y, shade(col, 1.35))
    },
    // ---------- skin patterns (tools\\guns\\skins.js themes) ----------
    // Camo: blotches of the theme's camo colors over the base.
    camo: (c, x0, y0, w, h, dir, col, r, ctx = {}) => {
      const cols = (ctx.theme && ctx.theme.camo) || [[60, 70, 40], [110, 100, 70], [40, 40, 30]]
      const s = ctx.scale || 1
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const X = (x0 + x) / s; const Y = (y0 + y) / s
        const v = Math.sin(X * 0.9 + Y * 0.35) + Math.sin(X * 0.27 - Y * 1.1 + 2) + r() * 0.5
        if (v > 0.9) c.set(x0 + x, y0 + y, rgba(cols[0])); else if (v < -0.9) c.set(x0 + x, y0 + y, rgba(cols[1])); else if (v > 0.2 && v < 0.45) c.set(x0 + x, y0 + y, rgba(cols[2]))
      }
    },
    // Diagonal stripes in the theme's stripe color.
    stripe: (c, x0, y0, w, h, dir, col, r, ctx = {}) => {
      const sc = rgba((ctx.theme && ctx.theme.stripe) || [20, 20, 20])
      const s = ctx.scale || 1
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.floor(((x0 + x) + (y0 + y)) / s) % 6 < 2) c.set(x0 + x, y0 + y, sc)
    },
    // Carbon weave: a 2x2 checker of two shades.
    carbon: (c, x0, y0, w, h, dir, col) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((Math.floor((x0 + x) / 2) + Math.floor((y0 + y) / 2)) % 2 === 0) c.set(x0 + x, y0 + y, shade(col, 1.35))
    },
    // Gold: a bright band and scattered sparkles (from the face's own color, so a skin recolors them too).
    gold: (c, x0, y0, w, h, dir, col, r) => {
      const spark = mixc(shade(col, 1.5), [255, 250, 210], 0.7)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const f = 1.15 - 0.35 * (y / Math.max(1, h - 1))
        c.set(x0 + x, y0 + y, shade(col, f))
        if (r() < 0.05) c.set(x0 + x, y0 + y, spark)
      }
    },
    // Falling green code (animated: the columns slide down a texel a frame).
    code: (c, x0, y0, w, h, dir, col, r, ctx = {}) => {
      const fr = ctx.frame || 0
      for (let x = 0; x < w; x++) {
        const phase = Math.floor(r() * 16)
        for (let y = 0; y < h; y++) {
          const k = (y - fr - phase + 64) % 8
          if (k === 0) c.set(x0 + x, y0 + y, [190, 255, 190, 255]); else if (k < 3) c.set(x0 + x, y0 + y, [40, 200, 70, 255])
        }
      }
    },
    // Lava cracks (animated: they pulse).
    lava: (c, x0, y0, w, h, dir, col, r, ctx = {}) => {
      const glow = 0.6 + 0.4 * Math.sin(((ctx.frame || 0) / Math.max(1, ctx.frames || 1)) * Math.PI * 2)
      const s = ctx.scale || 1
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = Math.abs(Math.sin((x0 + x) / s * 0.7 + Math.sin((y0 + y) / s * 0.5) * 2))
        if (v < 0.18) c.set(x0 + x, y0 + y, mix([255, 120, 20], [255, 230, 120], glow * (0.18 - v) / 0.18))
      }
    },
    // Glitch (animated): bands shifted magenta and cyan, a different band each frame.
    glitch: (c, x0, y0, w, h, dir, col, r, ctx = {}) => {
      const fr = ctx.frame || 0
      for (let y = 0; y < h; y++) {
        const band = ((y0 + y) + fr * 3) % 7
        for (let x = 0; x < w; x++) if (band === 0) c.set(x0 + x, y0 + y, [255, 40, 200, 255]); else if (band === 1) c.set(x0 + x, y0 + y, [40, 240, 255, 255])
      }
    },
    // A glowing part: bright core, no outline (set glow too).
    glow: (c, x0, y0, w, h, dir, col) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const edge = Math.min(x, y, w - 1 - x, h - 1 - y)
        c.set(x0 + x, y0 + y, edge === 0 ? rgba(col) : mix(col, [255, 255, 240], 0.55))
      }
    }
  }


  // ======================================================================================================
  // PROTOTYPE (style analyst, 2026-10-06): the PG3D painter, opt-in per gun with spec.style: 'pg'. Without it
  // nothing below runs and every texture and model stays byte-identical (checked: the nine guns and 18 skins).
  // ======================================================================================================
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)))
  const mixc = (a, b, t) => [0, 1, 2].map(i => clamp(a[i] + (b[i] - a[i]) * t)).concat([255])
  // Materials: how one base color becomes its ramp (hi/lo/deep/glint), and what a face of it gets by default.
  // Ramp numbers measured on the Photon Shotgun's gallery picture (texel-sharp): hi = base x 1.42 then 16% toward a
  // warm light (red (152,42,16) -> (222,85,47); measured (229,88,44)); lo = base x 0.68 (measured 0.65); deep 0.42.
  const PAINT = { hi: 1.42, hiTint: [255, 214, 170], hiMix: 0.16, lo: 0.68, loTint: [24, 18, 40], loMix: 0.08, deep: 0.42, glint: 1.85, glintMix: 0.35, grain: 0.04, step: 0.08, cells: false, bands: true, bevel: 1, corner: false, pat: 'flat', ink: true }
  const METAL = { ...PAINT, hi: 1.38, hiTint: [214, 226, 255], hiMix: 0.14, lo: 0.7, loTint: [16, 20, 40], loMix: 0.12, deep: 0.45, glint: 1.9, glintMix: 0.45, grain: 0.18, step: 0.2, cells: true, corner: true }
  const MAT = {
    paint: PAINT,
    metal: METAL,
    // Near-black parts: the ramp lifts toward a cool grey (a multiply does nothing to black).
    dark: { ...METAL, hi: 1.5, hiTint: [112, 120, 138], hiMix: 0.28, lo: 0.6, loMix: 0, deep: 0.35, glint: 2, glintMix: 0.5, grain: 0.14, step: 'tone' },
    chrome: { ...METAL, grain: 0.05, bands: false, pat: 'chrome2' },
    wood: { ...PAINT, hiTint: [255, 222, 170], grain: 0, pat: 'grain' },
    rubber: { ...PAINT, hi: 1.25, grain: 0.08, bands: false, pat: 'knurl' },
    gold: { ...METAL, hiTint: [255, 244, 200], hiMix: 0.2, grain: 0, bands: false, pat: 'gold' },
    glow: { ...PAINT, grain: 0, bands: false, bevel: 0, pat: 'rings', ink: false },
    glass: { ...PAINT, grain: 0, bands: false, bevel: 0, pat: 'lens' },
    flat: { ...PAINT, grain: 0, bands: false, bevel: 0 }
  }
  const tone = (col, k, m) => k === 0 ? rgba(col)
    : k >= 2 ? mixc(shade(col, m.glint), [255, 255, 255], m.glintMix)
      : k > 0 ? mixc(shade(col, m.hi), m.hiTint, m.hiMix)
        : k <= -2 ? mixc(shade(col, m.deep), m.loTint, m.loMix)
          : mixc(shade(col, m.lo), m.loTint, m.loMix)
  // A palette value is [r, g, b] or a tone derived from another key, { of: 'recv', k: -1 } (a ramp step of that key's
  // material) or { of: 'recv', f: 0.8 } (a multiply): a skin that recolors 'recv' recolors what derives from it too.
  const resolveCol = (pal, key, mats = {}, depth = 0) => {
    const v = pal[key]
    if (Array.isArray(v)) return rgba(v)
    if (!v || typeof v !== 'object' || !v.of || depth > 8) throw new Error('palette key ' + key + '?')
    const base = resolveCol(pal, v.of, mats, depth + 1)
    return v.k !== undefined ? tone(base, v.k, MAT[v.mat || mats[v.of]] || PAINT) : shade(base, v.f === undefined ? 1 : v.f)
  }
  // The hot core of a glowing color: brighter and shifted toward yellow-white (orange (233,116,7) -> (255,204,64);
  // measured core (231,196,83)).
  const hot = col => mixc([clamp(col[0] * 1.05 + 20), clamp(col[1] * 1.35 + 40), clamp(col[2] * 1.2 + 30)], [255, 255, 255], 0.12)
  // New patterns (also usable by skins: theme.pat).
  Object.assign(PATTERNS, {
    // A glowing window: rings from a darker, redder edge to a hot core (4 tones).
    rings: (c, x0, y0, w, h, dir, col) => {
      const edge = mixc(shade(col, 0.74), [col[0], col[1] * 0.55, col[2] * 0.45], 0.3)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const d = Math.min(x, y, w - 1 - x, h - 1 - y)
        c.set(x0 + x, y0 + y, d === 0 && w > 2 && h > 2 ? edge : d <= 1 ? rgba(col) : d === 2 ? mixc(col, hot(col), 0.5) : hot(col))
      }
    },
    // A lens: darker toward the lower right, a 2x2 white glint top-left, a rim light bottom-right.
    lens: (c, x0, y0, w, h, dir, col) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const d = Math.min(x, y, w - 1 - x, h - 1 - y)
        c.set(x0 + x, y0 + y, d === 0 ? shade(col, 0.62) : (x / w + y / h > 1.1 ? shade(col, 0.82) : rgba(col)))
      }
      const g = (x, y, t) => { if (x < w - 1 && y < h - 1) c.set(x0 + x, y0 + y, mixc(col, [255, 255, 255], t)) }
      g(1, 1, 0.8); g(2, 1, 0.55); g(1, 2, 0.55); g(2, 2, 0.35); g(w - 2, h - 2, 0.3)
    },
    // Knurling / a rubber grip: diagonal cross-hatch one step darker.
    knurl: (c, x0, y0, w, h, dir, col) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x + y) % 3 === 0 || (x - y + 300) % 3 === 0) c.set(x0 + x, y0 + y, shade(col, 0.8))
    },
    // An energy cell (the Ultimatum's): diagonal stripes, hot / base / dark.
    cells: (c, x0, y0, w, h, dir, col) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (x + y) % 3; c.set(x0 + x, y0 + y, k === 0 ? hot(col) : k === 1 ? rgba(col) : shade(col, 0.72)) }
    },
    // A neon tube along the longer side: hot centre line, base, darker rims.
    neon: (c, x0, y0, w, h, dir, col) => {
      const along = w >= h; const n = along ? h : w
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = along ? y : x; const d = Math.min(i, n - 1 - i)
        c.set(x0 + x, y0 + y, n >= 3 && d >= Math.floor((n - 1) / 2) ? hot(col) : d === 0 && n >= 3 ? shade(col, 0.8) : rgba(col))
      }
    },
    // Dark metal plates (the Photon Shotgun's grey parts): rows of 2-texel bars, 3-7 long, in 3 tones (x0.72, x1,
    // x1.3, or a lift toward grey on near-black), a dark gap row (x0.4) under each row and now and then a dark texel between two bars.
    plates: (c, x0, y0, w, h, dir, col, r) => {
      for (let y = 1; y < h - 1; y += 3) {
        let x = 1
        while (x < w - 1) {
          const len = 3 + Math.floor(r() * 5); const k = r()
          // near-black lifts toward a cool grey instead of multiplying (x1.3 of black is still black)
          const tc = k < 0.3 ? shade(col, 0.72) : k < 0.82 ? rgba(col) : col[0] + col[1] + col[2] < 150 ? mixc(col, [120, 128, 146], 0.3) : shade(col, 1.3)
          for (let xx = x; xx < Math.min(w - 1, x + len); xx++) for (let yy = y; yy < Math.min(h - 1, y + 2); yy++) c.set(x0 + xx, y0 + yy, tc)
          x += len
          if (r() < 0.5 && x < w - 1) { for (let yy = y; yy < Math.min(h - 1, y + 2); yy++) c.set(x0 + x, y0 + yy, shade(col, 0.4)); x++ }
        }
        if (y + 2 < h - 1) for (let xx = 1; xx < w - 1; xx++) c.set(x0 + xx, y0 + y + 2, shade(col, 0.4))
      }
    },
    // PG3D chrome (the Classic Pistol's slide, the Old Revolver's barrel): quantised bands, cool white on top. Side
    // faces: 25% glint (40% toward a blue-white), 25% hi (x1.25), 30% base, 20% lo (x0.7); up faces hi with a glint row
    // at their far edge; down faces lo.
    // Lighter tones mix toward a cool white instead of multiplying (x1.3 clipped green and blue at 255 on a pale
    // chrome: a near-white cyan band; gs50's fixer, 2026-10-06), and two rows at x0.8 sit above the bottom band.
    chrome2: (c, x0, y0, w, h, dir, col) => {
      const glint = mixc(col, [236, 246, 255], 0.6); const hi = mixc(col, [236, 244, 252], 0.3); const mid = shade(col, 0.8); const lo = shade(col, 0.7)
      const loRows = Math.max(1, Math.round(h * 0.2))
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const f = y / Math.max(1, h)
        const t = dir === 'up' ? (y === 1 ? glint : hi) : dir === 'down' ? lo : f < 0.25 ? glint : f < 0.5 ? hi : y >= h - loRows ? lo : y >= h - loRows - 2 ? mid : rgba(col)
        c.set(x0 + x, y0 + y, t)
      }
    },
    // An LED patch: top half hot, bottom half the color.
    led: (c, x0, y0, w, h, dir, col) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) c.set(x0 + x, y0 + y, y < h / 2 ? hot(col) : rgba(col))
    }
  })
  // A face's plane axes (the model axes of the tile's u and v), and a model point -> tile texels (floats). The
  // orientation is Minecraft's (FaceInfo + BlockElement's default uv): south u = x - from.x, north u = to.x - x,
  // west u = z - from.z, east u = to.z - z, v = to.y - y on the sides; up (u, v) = (x - from.x, z - from.z), down
  // (x - from.x, to.z - z).
  const AX = { north: [0, 1], south: [0, 1], east: [2, 1], west: [2, 1], up: [0, 2], down: [0, 2] }
  const lohi = b => ({ f: [0, 1, 2].map(i => Math.min(b.from[i], b.to[i])), t: [0, 1, 2].map(i => Math.max(b.from[i], b.to[i])) })
  const texOf = (b, dir, w, h, a, bb) => {
    const { f, t } = lohi(b)
    const [ua, va] = AX[dir]
    const su = w / Math.max(1e-6, t[ua] - f[ua]); const sv = h / Math.max(1e-6, t[va] - f[va])
    const u = { south: a - f[0], north: t[0] - a, west: a - f[2], east: t[2] - a, up: a - f[0], down: a - f[0] }[dir] * su
    const v = { south: t[1] - bb, north: t[1] - bb, west: t[1] - bb, east: t[1] - bb, up: bb - f[2], down: t[2] - bb }[dir] * sv
    return [u, v]
  }
  const FACESETS = { sides: ['north', 'south'], all: ['north', 'south', 'east', 'west', 'up', 'down'], ends: ['east', 'west'], flats: ['up', 'down'] }
  const facesOf = f => f === undefined ? FACESETS.sides : Array.isArray(f) ? f : FACESETS[f] || [f]
  // A box's decals for one face, in tile texels: [{ ...d, rect: [x0, y0, x1, y1] }] (inclusive). d.at / d.to are model
  // coordinates in the face's plane: [x, y] on north/south, [z, y] on east/west, [x, z] on up/down.
  const decalsFor = (b, dir, w, h) => (b.deco || []).filter(d => facesOf(d.face).includes(dir)).map(d => {
    const A = texOf(b, dir, w, h, d.at[0], d.at[1]); const B = texOf(b, dir, w, h, d.to[0], d.to[1])
    const x0 = Math.round(Math.min(A[0], B[0])); const x1 = Math.round(Math.max(A[0], B[0])) - 1
    const y0 = Math.round(Math.min(A[1], B[1])); const y1 = Math.round(Math.max(A[1], B[1])) - 1
    return { ...d, rect: [x0, y0, x1, y1] }
  }).filter(d => d.rect[2] >= d.rect[0] && d.rect[3] >= d.rect[1])
  // Panel lines: split planes { x: [..], y: [..], z: [..] } (model units) -> the tile's ink columns and rows.
  const splitsFor = (b, dir, w, h) => {
    const s = b.split || {}; const { f, t } = lohi(b); const [ua, va] = AX[dir]; const nm = 'xyz'
    const cols = (s[nm[ua]] || []).filter(c => c > f[ua] && c < t[ua]).map(c => Math.round(texOf(b, dir, w, h, c, (f[va] + t[va]) / 2)[0]))
    const rows = (s[nm[va]] || []).filter(c => c > f[va] && c < t[va]).map(c => Math.round(texOf(b, dir, w, h, (f[ua] + t[ua]) / 2, c)[1]))
    return { cols: cols.filter(x => x > 0 && x < w - 1), rows: rows.filter(y => y > 0 && y < h - 1) }
  }

  // Paints one PG-style tile at (t.x, oy) with the palette pal (the gun's, or a skin's).
  const paintPg = (tex, t, pal, ctx, oy, ink) => {
    const m = MAT[t.mat] || PAINT
    const col = resolveCol(pal, t.key, t.mats)
    const r = rng(t.seed)
    const X = t.x; const Y = oy; const w = t.w; const h = t.h
    const get = (x, y) => tex.get(X + x, Y + y)
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) tex.set(X + x, Y + y, c) }
    const side = t.dir !== 'up' && t.dir !== 'down'
    const base = t.mat === 'glow' || t.glow ? col : shade(col, TONE[t.dir])
    const iw = t.inkOn ? t.inkW : 0 // the outline's width (painted last)
    // 1. base
    tex.fill(X, Y, X + w - 1, Y + h - 1, base)
    // 2. bands: side faces lit from above (measured: the top rows hi, the bottom rows lo on a 13-row body)
    const ih = h - 2 * iw
    // A skin's pattern on a key also covers the tones derived from it ({ of: key }), as its color does.
    let pat = t.pat
    if (ctx.theme && ctx.theme.pat) {
      for (let k = t.key, n = 0; k && n < 8; k = pal[k] && pal[k].of, n++) if (ctx.theme.pat[k]) { pat = ctx.theme.pat[k]; break }
    }
    const bands = t.bands !== undefined ? t.bands : m.bands
    if (bands && side && ih >= 5 && !['chrome', 'chrome2', 'gold', 'rings', 'lens', 'cells', 'code', 'glitch', 'neon', 'led'].includes(pat)) {
      const bt = Math.max(1, Math.round(ih * 0.16)); const bb = Math.max(1, Math.round(ih * 0.2))
      for (let y = iw; y < iw + bt; y++) for (let x = 0; x < w; x++) set(x, y, tone(base, 1, m))
      for (let y = h - iw - bb; y < h - iw; y++) for (let x = 0; x < w; x++) set(x, y, tone(base, -1, m))
    }
    // 3. the pattern (the skin patterns' sizes are in texels at density 2: scaled so they keep their size in units)
    PATTERNS[pat](tex, X, Y, w, h, t.dir, base, r, { ...ctx, scale: (t.d || 2) / 2 })
    // 4. grain: blocky voxel jitter (metals: cells 1x1 55%, 2x1 30%, 1x2 10%, 2x2 5%; the rest 1x1)
    const p = t.grain !== undefined ? t.grain : m.grain
    if (p > 0) {
      const done = new Set()
      for (let y = iw; y < h - iw; y++) for (let x = iw; x < w - iw; x++) {
        if (done.has(y * w + x)) continue
        const roll = r(); const v = r(); const up = r() < 0.4
        if (roll >= p) continue
        const [cw, ch] = !m.cells ? [1, 1] : v < 0.55 ? [1, 1] : v < 0.85 ? [2, 1] : v < 0.95 ? [1, 2] : [2, 2]
        for (let yy = y; yy < Math.min(h - iw, y + ch); yy++) for (let xx = x; xx < Math.min(w - iw, x + cw); xx++) {
          done.add(yy * w + xx)
          const cur = get(xx, yy)
          set(xx, yy, m.step === 'tone' ? tone(cur, up ? 1 : -1, m) : shade(cur, up ? 1 + m.step : 1 - m.step))
        }
      }
    }
    // 5. panel lines (ink); 6. a bevel per panel: top row hi, bottom lo, left/right half a step, a glint corner
    const cols = [iw - 1, ...t.cols, w - iw].sort((a, b) => a - b)
    const rows = [iw - 1, ...t.rows, h - iw].sort((a, b) => a - b)
    for (const x of t.cols) for (let y = iw; y < h - iw; y++) set(x, y, ink)
    for (const y of t.rows) for (let x = iw; x < w - iw; x++) set(x, y, ink)
    const bev = t.bevel !== undefined ? t.bevel : m.bevel
    if (bev > 0) {
      for (let i = 0; i + 1 < cols.length; i++) for (let j = 0; j + 1 < rows.length; j++) {
        const px0 = cols[i] + 1; const px1 = cols[i + 1] - 1; const py0 = rows[j] + 1; const py1 = rows[j + 1] - 1
        if (px1 - px0 < 2 || py1 - py0 < 1) continue
        for (let x = px0; x <= px1; x++) { set(x, py0, tone(base, 1, m)); if (py1 - py0 >= 2) set(x, py1, tone(base, -1, m)) }
        if (py1 - py0 >= 2) for (let y = py0 + 1; y < py1; y++) { set(px0, y, mixc(get(px0, y), tone(base, 1, m), 0.5)); set(px1, y, mixc(get(px1, y), tone(base, -1, m), 0.5)) }
        if (m.corner && px1 - px0 >= 3 && py1 - py0 >= 2) set(px0, py0, tone(base, 2, m))
      }
    }
    // 7. decals
    const holes = new Set()
    const hole = (x, y) => { if (x >= iw && y >= iw && x < w - iw && y < h - iw) { set(x, y, ink); holes.add(y * w + x) } }
    const kc = k => resolveCol(pal, k, t.mats)
    for (const d of t.decals) {
      const [x0, y0, x1, y1] = d.rect; const dw = x1 - x0 + 1; const dh = y1 - y0 + 1
      const dc = d.c ? kc(d.c) : base
      const dm = MAT[d.mat || (d.c && t.mats[d.c]) || t.mat] || m
      if (d.k === 'slots') { // grooves: an ink line, the inner wall one step darker after it
        const n = d.n || 1; const vert = d.dir === 'v'; const len = vert ? dw : dh
        for (let i = 0; i < n; i++) {
          const o = Math.floor((i + 0.5) * len / n - 0.5)
          if (vert) for (let y = y0; y <= y1; y++) { hole(x0 + o, y); set(x0 + o + 1, y, tone(base, -1, m)) } else for (let x = x0; x <= x1; x++) { hole(x, y0 + o); set(x, y0 + o + 1, tone(base, -1, m)) }
        }
      } else if (d.k === 'vent') { // a black recess with fins (top texel hi, bottom lo); zig: every other fin a step lower
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ink)
        const fw = d.fin || 1; const gap = d.gap || 1
        for (let x = x0 + gap, i = 0; x + fw - 1 <= x1 - gap; x += fw + gap, i++) {
          const top = y0 + 1 + (d.zig && i % 2 ? 1 : 0); const bot = y1 - 1
          for (let y = top; y <= bot; y++) for (let k = 0; k < fw; k++) set(x + k, y, y === top ? tone(dc, 1, dm) : y === bot ? tone(dc, -1, dm) : dc)
        }
      } else if (d.k === 'holes') { // a grid of 1-texel holes with a lit rim below-right
        const px = d.pitch ? d.pitch[0] : 2; const py = d.pitch ? d.pitch[1] : 2
        for (let y = y0; y <= y1; y += py) for (let x = x0; x <= x1; x += px) { hole(x, y); set(x + 1, y + 1, tone(base, 1, m)) }
      } else if (d.k === 'rivets') { // n studs along the rect's long side: 1x1 hi, or 2x2 glint/base/base/lo
        const n = d.n || 2; const s = d.size || 1; const along = dw >= dh
        for (let i = 0; i < n; i++) {
          const f = n === 1 ? 0.5 : i / (n - 1)
          const x = along ? Math.round(x0 + f * (dw - s)) : Math.round(x0 + (dw - s) / 2); const y = along ? Math.round(y0 + (dh - s) / 2) : Math.round(y0 + f * (dh - s))
          if (s === 1) set(x, y, tone(dc, 1, dm)); else { set(x, y, tone(dc, 2, dm)); set(x + 1, y, dc); set(x, y + 1, dc); set(x + 1, y + 1, tone(dc, -1, dm)) }
        }
      } else if (d.k === 'leds') { // n lights (1x2 by default) in ink slots: hot top, the color below; a housing texel under
        const n = d.n || 1; const [lw, lh] = d.size || [1, 2]; const along = dw >= dh
        for (let i = 0; i < n; i++) {
          const f = n === 1 ? 0.5 : i / (n - 1)
          const x = along ? Math.round(x0 + 1 + f * (dw - lw - 2)) : Math.round(x0 + (dw - lw) / 2); const y = along ? Math.round(y0 + (dh - lh) / 2) : Math.round(y0 + 1 + f * (dh - lh - 2))
          for (let yy = y - 1; yy <= y + lh; yy++) for (let xx = x - 1; xx <= x + lw; xx++) hole(xx, yy)
          for (let yy = y; yy < y + lh; yy++) for (let xx = x; xx < x + lw; xx++) set(xx, yy, yy < y + lh / 2 ? hot(dc) : dc)
          if (d.housing) set(x, y + lh, kc(d.housing))
        }
      } else if (d.k === 'glow') { // a glowing window in an ink frame
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ink)
        if (dw > 2 && dh > 2) PATTERNS.rings(tex, X + x0 + 1, Y + y0 + 1, dw - 2, dh - 2, t.dir, dc)
      } else if (d.k === 'band') { // a stripe of another color with its own rim
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, dh >= 3 && y === y0 ? tone(dc, 1, dm) : dh >= 3 && y === y1 ? tone(dc, -1, dm) : dc)
      } else if (d.k === 'rail') { // a Picatinny-style rail: a lit top row, then teeth every 2 texels
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, y === y0 ? tone(dc, 1, dm) : (x - x0) % 2 === 0 ? dc : tone(dc, -2, dm))
      } else if (d.k === 'ribs') { // slats (1 wide by default) between ink gaps, lit on top
        const sw = d.fin || 1
        for (let x = x0; x <= x1; x++) {
          const onSlat = (x - x0) % (sw + 1) < sw
          for (let y = y0; y <= y1; y++) set(x, y, !onSlat ? ink : y === y0 ? tone(dc, 1, dm) : y === y1 ? tone(dc, -1, dm) : dc)
        }
      } else if (d.k === 'inset') { // a recessed window: ink frame, shadow under the lip, the floor a step darker
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const edge = x === x0 || x === x1 || y === y0 || y === y1
          set(x, y, edge ? ink : y === y0 + 1 ? tone(dc, -2, dm) : x === x1 - 1 || y === y1 - 1 ? tone(dc, 0, dm) : tone(dc, -1, dm))
        }
      } else if (d.k === 'cells') { // an energy cell: ink frame, diagonal stripes
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ink)
        if (dw > 2 && dh > 2) PATTERNS.cells(tex, X + x0 + 1, Y + y0 + 1, dw - 2, dh - 2, t.dir, dc)
      } else if (d.k === 'stamp') { // pixel art: rows of characters -> keys ('#' ink, '+' hi, '-' lo of the face)
        d.rows.forEach((row, yy) => [...row].forEach((ch, xx) => {
          const c = ch === '#' ? ink : ch === '+' ? tone(base, 1, m) : ch === '-' ? tone(base, -1, m) : d.keys && d.keys[ch] ? kc(d.keys[ch]) : null
          if (c) set(x0 + xx, y0 + yy, c)
        }))
      } else throw new Error(`deco kind ${d.k}?`)
    }
    // 8. ambient occlusion around holes: the texels beside a hole a step darker (below/right 75%, above/left 40%)
    if ((t.ao !== undefined ? t.ao : true) && holes.size) {
      const lo = tone(base, -1, m)
      for (const hk of holes) {
        const hx = hk % w; const hy = Math.floor(hk / w)
        for (const [dx, dy, full] of [[0, 1, 1], [1, 0, 1], [0, -1, 0], [-1, 0, 0]]) {
          const x = hx + dx; const y = hy + dy
          if (x < iw || y < iw || x >= w - iw || y >= h - iw || holes.has(y * w + x)) continue
          const cur = get(x, y)
          if (cur[0] + cur[1] + cur[2] < 60) continue // ink or near it
          set(x, y, mixc(cur, lo, full ? 0.75 : 0.4))
        }
      }
    }
    // 9. the outline
    for (let k = 0; k < iw; k++) {
      for (let x = 0; x < w; x++) { set(x, k, ink); set(x, h - 1 - k, ink) }
      for (let y = 0; y < h; y++) { set(k, y, ink); set(w - 1 - k, y, ink) }
    }
  }
  // What material a key means when a gun opts in without naming it (the module's mats win).
  const guessMat = (key, pat, glow, col) => glow ? 'glow' : pat === 'chrome' ? 'chrome' : pat === 'grain' ? 'wood' : (pat === 'check' || pat === 'speck') ? 'rubber' : pat === 'gold' ? 'gold' : /^lens/i.test(key) ? 'glass' : /bore|post|sight|bead|^dot|reticle/.test(key) ? 'flat' : (col[0] + col[1] + col[2] < 150 ? 'dark' : 'paint')


  // pgGun(name, spec) -> the kit for one gun. spec:
  //   palette: { key: [r, g, b] }
  //   parts: { part: [box, ...] }  box: { from, to, c: key | { all, up, down, north, south, east, west },
  //     pat: pattern (or per face like c), glow: true (light_emission 15, unshaded, no outline), rot (an element
  //     rotation), dirs (the faces it has; default all six), outline: false, ink: an outline color key }
  //   display: display({...}) (both hands), states: { ads: firstperson transform, sprint: ... }
  //   noFull: parts left out of the _full model (the flash)
  //   density: texels per model unit (default 2)
  // Base tones by face (the client shades items too, more lightly: up 1, down 0.5, N/S 0.8, E/W 0.6 in the gui).
  const TONE = { up: 1.1, down: 0.78, north: 1, south: 1, east: 0.9, west: 0.9 }
  // What each gun was painted with (paintSkin repaints it): name -> { tiles, W, H, pal, ink, models }.
  const made = {}
  const pgGun = (name, spec) => {
    const PG = spec.style === 'pg'
    const D = spec.density || (PG ? 4 : 2)
    const r = rng(hash(name))
    const pal = spec.palette
    const ink = rgba(spec.ink || (PG ? [10, 10, 12] : [16, 18, 24]))
    // Every face gets a tile: w x h texels (its size in units x D, at least 2), packed in shelves into the smallest
    // square texture that holds them (a square: the renderer and the atlas take any sprite, but square is safe).
    const tiles = []
    const faceSize = (b, dir) => {
      const dx = Math.abs(b.to[0] - b.from[0]); const dy = Math.abs(b.to[1] - b.from[1]); const dz = Math.abs(b.to[2] - b.from[2])
      const [u, v] = dir === 'north' || dir === 'south' ? [dx, dy] : dir === 'east' || dir === 'west' ? [dz, dy] : [dx, dz]
      return [Math.max(2, Math.ceil(u * D - 1e-6)), Math.max(2, Math.ceil(v * D - 1e-6))]
    }
    let W = 64
    let sx = 0; let sy = 0; let shelf = 0
    const place = (w, h) => {
      if (sx + w > W) { sx = 0; sy += shelf; shelf = 0 }
      const at = [sx, sy]; sx += w; shelf = Math.max(shelf, h)
      return at
    }
    const pick = (v, dir) => v === undefined ? undefined : (typeof v === 'object' && !Array.isArray(v)) ? (v[dir] !== undefined ? v[dir] : v.all) : v
    const elementsOf = {}
    // PG: a face's recipe (material, splits, decals, seed) kept on its tile, so a skin repaints the same details.
    const pgTile = (b, dir, w, h, key, idx) => {
      const mats = spec.mats || {}
      const legacyPat = pick(b.pat, dir)
      const mat = b.pgPatch ? 'glow' : pick(b.mat, dir) || mats[key] || (pal[key].of && mats[pal[key].of]) || guessMat(key, legacyPat, !!b.glow, resolveCol(pal, key, mats))
      const M = MAT[mat]
      const { cols, rows } = splitsFor(b, dir, w, h)
      return { pg: true, d: D, mat, mats, patSet: !!(b.pgPatch || legacyPat), pat: b.pgPatch || legacyPat || M.pat, inkOn: b.outline !== false && !b.glow && M.ink, inkW: b.inkW || spec.inkW || 1, inkCol: b.ink ? resolveCol(pal, b.ink, mats) : null, bands: b.bands, bevel: b.bevel, grain: b.grain, ao: b.ao, cols, rows, decals: b.pgPatch ? [] : decalsFor(b, dir, w, h), seed: hash(name + '#' + idx) }
    }
    // PG: emissive decals (emit: true) get a glowing patch 0.02 in front of their face (light is per element).
    const ALL6 = ['north', 'south', 'east', 'west', 'up', 'down']
    const fromTex = (b, dir, w, h, u, v) => {
      const { f, t } = lohi(b); const [ua, va] = AX[dir]
      const su = w / (t[ua] - f[ua]); const sv = h / (t[va] - f[va]); const du = u / su; const dv = v / sv
      return { south: [f[0] + du, t[1] - dv], north: [t[0] - du, t[1] - dv], west: [f[2] + du, t[1] - dv], east: [t[2] - du, t[1] - dv], up: [f[0] + du, f[2] + dv], down: [f[0] + du, t[2] - dv] }[dir]
    }
    const patchBox = (b, dir, c, pat, a0, a1) => {
      const { f, t } = lohi(b); const E = 0.02
      const lo = [Math.min(a0[0], a1[0]), Math.min(a0[1], a1[1])]; const hi = [Math.max(a0[0], a1[0]), Math.max(a0[1], a1[1])]
      const box = { south: [[lo[0], lo[1], t[2]], [hi[0], hi[1], t[2] + E]], north: [[lo[0], lo[1], f[2] - E], [hi[0], hi[1], f[2]]], west: [[f[0] - E, lo[1], lo[0]], [f[0], hi[1], hi[0]]], east: [[t[0], lo[1], lo[0]], [t[0] + E, hi[1], hi[0]]], up: [[lo[0], t[1], lo[1]], [hi[0], t[1] + E, hi[1]]], down: [[lo[0], f[1] - E, lo[1]], [hi[0], f[1], hi[1]]] }[dir]
      return { from: box[0], to: box[1], c, glow: true, dirs: [dir], pgPatch: pat, ...(b.rot ? { rot: b.rot } : {}) }
    }
    const patchesOf = b => (b.deco || []).filter(d => d.emit).flatMap(d => facesOf(d.face).filter(dir => (b.dirs || ALL6).includes(dir)).flatMap(dir => {
      const [w, h] = faceSize(b, dir)
      const dd = decalsFor({ ...b, deco: [d] }, dir, w, h)[0]
      if (!dd) return []
      const [x0, y0, x1, y1] = dd.rect; const dw = x1 - x0 + 1; const dh = y1 - y0 + 1
      const key = d.c || pick(b.c, dir)
      if (d.k === 'glow') return dw > 2 && dh > 2 ? [patchBox(b, dir, key, 'rings', fromTex(b, dir, w, h, x0 + 1, y0 + 1), fromTex(b, dir, w, h, x1, y1))] : []
      if (d.k === 'leds') {
        const n = d.n || 1; const [lw, lh] = d.size || [1, 2]; const along = dw >= dh; const out = []
        for (let i = 0; i < n; i++) {
          const fq = n === 1 ? 0.5 : i / (n - 1)
          const x = along ? Math.round(x0 + 1 + fq * (dw - lw - 2)) : Math.round(x0 + (dw - lw) / 2); const y = along ? Math.round(y0 + (dh - lh) / 2) : Math.round(y0 + 1 + fq * (dh - lh - 2))
          out.push(patchBox(b, dir, key, 'led', fromTex(b, dir, w, h, x, y), fromTex(b, dir, w, h, x + lw, y + lh)))
        }
        return out
      }
      return []
    }))
    const partsIn = PG ? Object.fromEntries(Object.entries(spec.parts).map(([p, boxes]) => [p, boxes.flatMap(b => [b, ...patchesOf(b)])])) : spec.parts
    for (const [part, boxes] of Object.entries(partsIn)) {
      elementsOf[part] = boxes.map(b => {
        const faces = {}
        for (const dir of b.dirs || ['north', 'south', 'east', 'west', 'up', 'down']) {
          const key = pick(b.c, dir)
          if (!pal[key]) throw new Error(`${name}: no palette color ${key}`)
          const [w, h] = faceSize(b, dir)
          const tile = { x: 0, y: 0, w, h, dir, key, col: PG ? resolveCol(pal, key, spec.mats || {}) : rgba(pal[key]), pat: pick(b.pat, dir) || 'flat', glow: b.glow, outline: b.outline !== false && !b.glow, inkKey: b.ink || null, ink: b.ink ? (PG ? resolveCol(pal, b.ink, spec.mats || {}) : rgba(pal[b.ink])) : null }
          if (PG) Object.assign(tile, pgTile(b, dir, w, h, key, tiles.length))
          tiles.push(tile)
          faces[dir] = { tile: tiles.length - 1, ...(b.rotUV ? { rotation: b.rotUV } : {}) }
        }
        const e = { from: b.from, to: b.to, faces }
        if (b.rot) e.rotation = b.rot
        if (b.glow) { e.light_emission = 15; e.shade = false }
        return e
      })
    }
    // Shelves first; when they don't fit a size, a skyline (each tile at the lowest spot along the top edge of what's
    // placed: it fills the gaps under short tiles) before doubling it. Every gun shelves fit kept its layout; the
    // minigun's 57K texels fit 256 only this way (shelves need 272 rows).
    const skyline = (list, W) => {
      let line = [{ x: 0, y: 0, w: W }]
      for (const t of list) {
        let best = null
        for (let i = 0; i < line.length && line[i].x + t.w <= W; i++) {
          let y = 0; let left = t.w
          for (let j = i; left > 0; j++) { y = Math.max(y, line[j].y); left -= line[j].w }
          if (!best || y + t.h < best.top) best = { x: line[i].x, y, top: y + t.h }
        }
        if (!best) return false;
        [t.x, t.y] = [best.x, best.y]
        const a = best.x; const b = best.x + t.w; const next = []
        for (const s of line) {
          if (s.x + s.w <= a || s.x >= b) { next.push(s); continue }
          if (s.x < a) next.push({ x: s.x, y: s.y, w: a - s.x })
          if (s.x + s.w > b) next.push({ x: b, y: s.y, w: s.x + s.w - b })
        }
        next.push({ x: a, y: best.top, w: t.w }); next.sort((u, v) => u.x - v.x)
        line = []
        for (const s of next) { const l = line[line.length - 1]; if (l && l.y === s.y) l.w += s.w; else line.push({ ...s }) }
      }
      return Math.max(...line.map(s => s.y)) <= W
    }
    for (W = 64; ; W *= 2) {
      sx = 0; sy = 0; shelf = 0
      const order = PG ? [...tiles].sort((a, b) => b.h - a.h || b.w - a.w) : tiles
      for (const t of order) [t.x, t.y] = place(t.w, t.h)
      if (sy + shelf <= W) break
      if (PG && skyline(order, W)) break
    }
    const H = W
    const tex = canvas(W, H)
    // Base tones by face (the client shades items too, more lightly: up 1, down 0.5, N/S 0.8, E/W 0.6 in the gui).
    for (const t of tiles) {
      if (t.pg) { paintPg(tex, t, pal, { frame: 0, frames: 1 }, t.y, t.inkCol || ink); continue }
      const base = t.glow ? t.col : shade(t.col, TONE[t.dir])
      tex.fill(t.x, t.y, t.x + t.w - 1, t.y + t.h - 1, base)
      PATTERNS[t.pat](tex, t.x, t.y, t.w, t.h, t.dir, base, r)
      if (t.outline) {
        const o = t.ink || ink
        for (let x = 0; x < t.w; x++) { tex.set(t.x + x, t.y, o); tex.set(t.x + x, t.y + t.h - 1, o) }
        for (let y = 0; y < t.h; y++) { tex.set(t.x, t.y + y, o); tex.set(t.x + t.w - 1, t.y + y, o) }
      }
    }
    const texId = `donating:item/${name}_tex`
    write(`donating/textures/item/${name}_tex.png`, tex.png())
    const uvOf = t => [round(t.x * 16 / W), round(t.y * 16 / H), round((t.x + t.w) * 16 / W), round((t.y + t.h) * 16 / H)]
    // Every box (and a rotation's origin) inside the item model limits, -16..32 (the client rejects the model otherwise).
    const inLimits = v => v.every(n => n >= -16 && n <= 32)
    for (const [part, els] of Object.entries(elementsOf)) els.forEach((e, i) => {
      if (!inLimits(e.from) || !inLimits(e.to) || (e.rotation && e.rotation.origin && !inLimits(e.rotation.origin))) throw new Error(`${name}: part ${part} box ${i} is outside -16..32 (${JSON.stringify([e.from, e.to])})`)
    })
    const toModel = els => els.map(e => {
      const faces = {}
      for (const [dir, f] of Object.entries(e.faces)) faces[dir] = { uv: uvOf(tiles[f.tile]), texture: '#t', ...(f.rotation ? { rotation: f.rotation } : {}) }
      const out = { from: e.from.map(round), to: e.to.map(round), faces }
      if (e.rotation) out.rotation = e.rotation
      if (e.light_emission) { out.light_emission = e.light_emission; out.shade = false }
      return out
    })
    const id = (part, state) => `donating:item/${name}_${part}${state ? '_' + state : ''}`
    const models = []
    const writeModel = (rest, data) => { write(`donating/models/item/${name}_${rest}.json`, data); models.push(`donating:item/${name}_${rest}`) }
    write(`donating/models/item/${name}_base.json`, { textures: { t: texId, particle: texId }, display: spec.display })
    const parts = Object.keys(spec.parts)
    for (const part of parts) writeModel(part, { parent: `donating:item/${name}_base`, elements: toModel(elementsOf[part]) })
    const fullParts = parts.filter(p => !(spec.noFull || []).includes(p))
    writeModel('full', { parent: `donating:item/${name}_base`, elements: toModel(fullParts.flatMap(p => elementsOf[p])) })
    const states = Object.keys(spec.states || {})
    for (const st of states) {
      const fp = both('firstperson', spec.states[st])
      for (const part of [...parts, 'full']) writeModel(`${part}_${st}`, { parent: `donating:item/${name}_${part}`, display: fp })
    }

    made[name] = { tiles, W, H, pal, ink, models, ...(PG ? { keep: spec.keep || [] } : {}) }
    // ---------- the hands (spec.hands) ----------
    // spec.hands = { right: { at: rig }, left: { at: rig, shown: false } }: the shared first-person hands (buildHands)
    // placed in this gun's space by `at` (a hand model's coordinates -> this gun's model units, at rest). A pose moves a
    // hand with pose.<rhand|lhand> (a gun-space rig on top of the placement: the left hand following the magazine is
    // pose.lhand = the magazine's own rig) and with pose.gun like every part. A hand with shown: false (the left, while
    // the bag fills the left hand on screen) is drawn only by poses that list it in show; the right hides with hide.
    // Each hand's sleeve is aimed every frame from the glove's wrist at an elbow point off the screen's bottom edge (in
    // the camera's space: HANDS.<hand>.elbow, or the hand's own elbow), so the arm always runs out of the bottom edge,
    // whatever the gun does and whatever the screen's shape: it never shows a cut end.
    // Per gun only small children of the shared models that carry this gun's display (donating:item/hands/<gun>_<model>
    // and one per state, like the parts), so the hands get the gun's first-person transforms. Only the first-person
    // composites draw them (never the _full model: third person, the ground, frames and icons have no hands).
    const gunKey = name.replace(/^gun_/, '')
    const handList = spec.hands ? [['rhand', spec.hands.right], ['lhand', spec.hands.left]].filter(([, v]) => v) : []
    const handId = (what, state) => `donating:item/hands/${gunKey}_${what}${state ? '_' + state : ''}`
    if (handList.length) {
      buildHands()
      for (const k of [...handList.map(([h]) => HANDS[h].model), 'arm']) {
        write(`donating/models/item/hands/${gunKey}_${k}.json`, { parent: `donating:item/hands_${k}`, display: spec.display })
        for (const st of states) write(`donating/models/item/hands/${gunKey}_${k}_${st}.json`, { parent: handId(k), display: both('firstperson', spec.states[st]) })
      }
    }
    const fpDisplay = (state, left) => state ? both('firstperson', spec.states[state])[left ? 'firstperson_lefthand' : 'firstperson_righthand'] : spec.display[left ? 'firstperson_lefthand' : 'firstperson_righthand']
    // An arm's transformation toward its elbow (the right-hand context's; left: the left-hand context's, with the
    // elbows mirrored: a left-handed player holds the gun in the left hand, so its grip hand's elbow is bottom left).
    // The elbow is lowered step by step (HANDS.elbowTries) until the sleeve's far end is off the screen in every view
    // that draws this tree (both hands' when they share it: spec.hands.leftTree false), at every screen shape up to 21:9.
    const armTo = (wrist, state, cam, left, alsoOther) => {
      let best
      for (const off of HANDS.elbowTries) {
        const c = cam.map((x, i) => x + off[i])
        const elbow = handAnchor(fpDisplay(state, left), left ? [-c[0], c[1], c[2]] : c, left)
        const q = fromTo([1, 0, 0], norm3(elbow.map((x, i) => x - wrist[i])))
        const pv = qRot(q, HANDS.armPivot)
        best = { t: wrist.map((x, i) => x - pv[i]), q }
        const ends = HANDS.armEnd.map(p => qRot(q, p).map((x, i) => x + best.t[i]))
        if ([left, ...(alsoOther ? [!left] : [])].every(lf => ends.every(p => !onScreen(handWorld(fpDisplay(state, lf), p, lf))))) break
      }
      return json(best)
    }
    const handModels = (state, pose) => handList.flatMap(([h, v]) => {
      if (v.shown === false ? !(pose.show || []).includes(h) : (pose.hide || []).includes(h)) return []
      const HH = HANDS[h]
      const m = then(then(v.at, pose[h] || ID), pose.gun || ID)
      const glove = { type: 'minecraft:model', model: handId(HH.model, state), ...(isId(m) ? {} : { transformation: json(m) }) }
      if (v.arm === false) return [glove]
      const wrist = qRot(m.q, HH.wrist).map((x, i) => x + m.t[i])
      const cam = (pose.elbow && pose.elbow[h]) || v.elbow || HH.elbow
      const shared = spec.hands.leftTree === false
      const arm = { type: 'minecraft:model', model: handId('arm', state), transformation: armTo(wrist, state, cam, false, shared) }
      if (!shared) leftArm.set(arm, { ...arm, transformation: armTo(wrist, state, cam, true, false) })
      return [glove, arm]
    })
    // The left-hand context's copy of a first-person tree: the same, with each arm aimed for the left hand (byContext).
    const leftArm = new WeakMap()
    const forLeft = m => Array.isArray(m) ? m.map(forLeft) : m && typeof m === 'object' ? (leftArm.get(m) || Object.fromEntries(Object.entries(m).map(([k, v]) => [k, forLeft(v)]))) : m

    // ---------- frames ----------
    // A pose: { gun: rig (the whole gun), <part>: rig (on top of the gun's), hide: [parts], show: [parts] }.
    // Parts in spec.hidden (the flash) only show when a pose lists them in show.
    const hidden = new Set(spec.hidden || [])
    const composite = (state, pose = {}) => ({
      type: 'minecraft:composite',
      models: parts.filter(p => (hidden.has(p) ? (pose.show || []).includes(p) : !(pose.hide || []).includes(p))).map(p => {
        const m = then(pose[p] || ID, pose.gun || ID)
        return { type: 'minecraft:model', model: id(p, state), ...(isId(m) ? {} : { transformation: json(m) }) }
      }).concat(handModels(state, pose))
    })
    // A cooldown animation over n frames: poseAt(p) for p = 0 (start) .. 1 (end); with no cooldown the rest pose.
    // minecraft:cooldown is the share of the cooldown left: 1 at the start, 0 at the end.
    const cooldown = (state, n, poseAt, rest = {}) => ({
      type: 'minecraft:range_dispatch',
      property: 'minecraft:cooldown',
      entries: Array.from({ length: n }, (_, k) => ({ threshold: round(k / n + 1e-4), model: composite(state, poseAt(1 - (k + 0.5) / n)) })),
      fallback: composite(state, rest)
    })
    // Firing (first person only): while the gun really fires (custom_model_data flag 0: DonatingPhone's GunFx sets it
    // on each shot and clears it a few ticks after the last) and fire is held (keybind_down reads the local key, whoever
    // holds the item, so letting go stops it at once), a pose picked at random every frame from poses (a flicker),
    // else the rest pose. The key alone isn't enough: holding right-click on loot, or with an empty gun, fires nothing.
    // wobble false: the 26.3 client's default (true) runs the random through a damped needle that holds a pose ~5 ticks
    // and wanders; off, it's a fresh random each frame, so the poses should differ in the flash and only a little in
    // the kick (or the gun shakes).
    const firing = (state, poses, rest = {}) => ({
      type: 'minecraft:condition',
      property: 'minecraft:custom_model_data',
      index: 0,
      on_true: {
        type: 'minecraft:condition',
        property: 'minecraft:keybind_down',
        keybind: 'key.use',
        on_true: {
          type: 'minecraft:range_dispatch',
          property: 'minecraft:time',
          source: 'random',
          wobble: false,
          entries: poses.map((p, k) => ({ threshold: round(k / poses.length), model: composite(state, p) })),
          fallback: composite(state, poses[0])
        },
        on_false: composite(state, rest)
      },
      on_false: composite(state, rest)
    })
    // In first person the animated model, elsewhere the static full model (and the icon in the gui).
    const byContext = (state, fp) => ({
      type: 'minecraft:select',
      property: 'minecraft:display_context',
      cases: handList.length && spec.hands.leftTree !== false ? [{ when: ['firstperson_righthand'], model: fp }, { when: ['firstperson_lefthand'], model: forLeft(fp) }] : [{ when: ['firstperson_righthand', 'firstperson_lefthand'], model: fp }],
      fallback: { type: 'minecraft:model', model: id('full', state) }
    })
    // A custom_model_data flag GunFx sets (DonatingPhone GunFx.java): 0 firing (the automatic guns), 1 a firearm action
    // without a shot (a pump or bolt worked alone), 2 a draw on a gun that also has a shot clock (both read the Default
    // state's clock). on_true while the flag is set.
    const flag = (index, on_true, on_false) => ({ type: 'minecraft:condition', property: 'minecraft:custom_model_data', index, on_true, on_false })
    return { id, parts, composite, cooldown, firing, byContext, rig, then, flag }
  }
  // ---------- the shared first-person hands (2026-10-12; handoff/2026-10-12/hands/PLAN.md) ----------
  // The client draws no arm while a hand holds an item (26.3 FirstPersonHandsAndItemsRenderer.submitArmWithItem: the
  // player's own arm only for an empty main hand; an empty offhand draws nothing), and an item model can't use the
  // player's skin, so the hands are geometry of our own in the gun's first-person composites: coyote-tan tactical gloves
  // (dark rubber knuckle pads, a stitched dark cuff) and navy jacket sleeves with a gold stripe, PG3D-chunky. One texture and
  // three models for every gun (donating:item/hands_tex, hands_rglove, hands_lglove, hands_arm), painted once; a gun
  // only places them (spec.hands). Gun skins never touch them (their own texture; paintSkin passes their ids through),
  // so a gun's future skins need nothing for the hands; a glove cosmetic would recolor exactly the hands' palette keys
  // (glove, gloveK, stitch, cuff, sleeve, trim). The glove is light against every gun's dark metal (charcoal gloves were
  // tried and disappeared into the black guns).
  // The right glove is built round a pistol grip in grip coordinates g (the grip's top centre at 0, the grip running
  // down -y, its front (the trigger side) -x, 2.25 deep and 2 wide; +z the gun's left, the side first person sees): the
  // fingers wrap the front and their tips show on +z, the thumb lies along the top of the +z side, the trigger finger
  // reaches forward, a wrist stub leaves the back. Model = g + OR. A gun's `at` for it: its grip's top centre and rake.
  // The left glove is a C round an upright object in its own coordinates o (a magazine: 3 deep, 2 wide, centred at 0):
  // the back of the hand on +z, the fingers round the front onto -z, the thumb on the back, a wrist stub down from the
  // palm. Model = o + OL. The arm (one model, used by both hands) runs along +x from its wrist pivot: the glove's dark
  // cuff, a hem, then the sleeve, 30 units long (up to the -16..32 limit); the kit turns it at the wrist toward the
  // elbow every frame (handModels), and its far end lies past the screen's edge.
  const HOR = [-8, 16, 8]
  const HOL = [8, 12, 8]
  const HAP = [0, 8, 8]
  const hat = (o, p) => p.map((v, i) => v + o[i])
  const HANDS = {
    rhand: { model: 'rglove', wrist: hat(HOR, [3.25, -1.9, 0.05]), elbow: [0.42, -0.62, -0.22] },
    lhand: { model: 'lglove', wrist: hat(HOL, [0.05, -2.8, 1.6]), elbow: [-0.4, -0.62, -0.22] },
    armPivot: HAP,
    armEnd: [[30, 6, 6], [30, 10, 6], [30, 6, 10], [30, 10, 10]].map(p => p.map((v, i) => v - HAP[i]).map((v, i) => v + HAP[i])),
    // offsets tried on an elbow (blocks, camera space), lowest last
    elbowTries: [[0, 0, 0], [0, -0.25, 0.04], [0, -0.55, 0.08], [0, -1.0, 0.1], [0.15, -1.6, 0.12]],
    OR: HOR,
    OL: HOL
  }
  const handsSpec = () => {
    const r = (f, t, m = {}) => ({ from: hat(HOR, f), to: hat(HOR, t), ...m })
    const l = (f, t, m = {}) => ({ from: hat(HOL, f), to: hat(HOL, t), ...m })
    const a = (f, t, m = {}) => ({ from: hat(HAP, f), to: hat(HAP, t), ...m })
    // a decal's corners in a face's plane, from hand coordinates (south/north [x, y], east/west [z, y], up/down [x, z])
    const d2 = o => (u, v, face) => face === 'east' || face === 'west' ? [u + o[2], v + o[1]] : face === 'up' || face === 'down' ? [u + o[0], v + o[2]] : [u + o[0], v + o[1]]
    const R2 = d2(HOR); const L2 = d2(HOL); const A2 = d2(HAP)
    const G = { c: { all: 'glove', up: 'gloveL' } }
    return {
      style: 'pg',
      density: 4,
      // the hands' own keys (a glove cosmetic recolors these; gun skins can't reach them): the glove, its knuckle pads
      // and fingertip ridges, the cuff's stitching, the cuff, the jacket sleeve, the stripe near its end; derived tones
      palette: {
        glove: [182, 146, 98], gloveK: [92, 80, 64], stitch: [232, 218, 186], cuff: [52, 54, 62], sleeve: [62, 80, 118], trim: [214, 170, 72],
        gloveL: { of: 'glove', f: 1.18 }, gloveD: { of: 'glove', f: 0.72 }, sleeveD: { of: 'sleeve', f: 0.72 }
      },
      mats: { glove: 'paint', gloveL: 'paint', gloveD: 'paint', gloveK: 'rubber', stitch: 'flat', cuff: 'dark', sleeve: 'paint', sleeveD: 'paint', trim: 'paint' },
      parts: {
        rglove: [
          // the fist round the grip: four fingertips on +z (grooves between them), the knuckles round the front, a
          // rubber knuckle pad on the back (-z)
          r([-1.75, -3.9, -1.5], [1.25, -0.4, 1.6], {
            ...G,
            deco: [
              { k: 'slots', face: 'south', at: R2(-1.75, -0.4), to: R2(0.25, -3.9), n: 3 },
              { k: 'slots', face: 'west', at: R2(-1.5, -0.4, 'west'), to: R2(1.6, -3.9, 'west'), n: 3 },
              { k: 'band', face: 'north', at: R2(-1.5, -0.6), to: R2(1.0, -1.4), c: 'gloveK' },
              { k: 'band', face: 'south', at: R2(0.5, -0.6), to: R2(1.0, -3.7), c: 'gloveK' }
            ]
          }),
          r([-3.0, -0.95, -0.35], [-1.75, -0.2, 0.55], G), // the trigger finger, forward along the guard
          r([-1.6, -0.9, 1.1], [1.0, 0.1, 2.05], { ...G, deco: [{ k: 'band', face: 'south', at: R2(-1.5, 0.0), to: R2(-0.75, -0.8), c: 'gloveD' }] }), // the thumb (its tip darker)
          r([1.25, -3.6, -1.35], [2.75, -0.2, 1.45], G), // the heel of the hand behind the grip
          r([2.75, -3.2, -1.15], [4.25, -0.6, 1.25], { c: 'cuff', deco: [{ k: 'band', face: 'sides', at: R2(3.0, -0.85), to: R2(4.0, -1.05), c: 'stitch' }] }) // the cuff, into the arm's band
        ],
        lglove: [
          // the back of the hand on +z (the palm against the magazine), a rubber pad over the knuckles
          l([-1.6, -1.8, 1.05], [1.6, 1.5, 2.15], { ...G, deco: [{ k: 'band', face: 'south', at: L2(-1.4, 1.3), to: L2(-0.6, -1.6), c: 'gloveK' }] }),
          // the fingers round the front (grooves between them) and their tips on -z
          l([-2.45, -1.8, -1.3], [-1.55, 1.5, 2.15], { ...G, deco: [{ k: 'slots', face: 'west', at: L2(-1.3, 1.5, 'west'), to: L2(2.15, -1.8, 'west'), n: 3 }, { k: 'slots', face: 'south', at: L2(-2.45, 1.5), to: L2(-1.55, -1.8), n: 3 }] }),
          l([-1.6, -1.7, -1.55], [-0.5, 1.4, -1.0], G),
          l([1.5, -0.1, -0.7], [2.4, 1.4, 2.0], { ...G, deco: [{ k: 'band', face: 'east', at: L2(-0.6, 1.3, 'east'), to: L2(0.4, 0.5, 'east'), c: 'gloveD' }] }), // the thumb on the back
          l([-1.2, -3.6, 0.95], [1.3, -1.8, 2.25], { c: 'cuff', deco: [{ k: 'band', face: 'sides', at: L2(-1.0, -2.0), to: L2(1.1, -2.2), c: 'stitch' }] }) // the cuff, into the arm's band
        ],
        arm: [
          a([-0.6, -1.75, -1.75], [0.9, 1.75, 1.75], { c: 'cuff' }), // the glove's cuff under the sleeve
          a([0.9, -2.25, -2.25], [2.1, 2.25, 2.25], { c: 'sleeveD' }), // the hem
          // the sleeve: a gold stripe round it near the hem, a seam along its sides, panel splits
          a([2.1, -2.1, -2.1], [30, 2.1, 2.1], { c: 'sleeve', split: { x: [hat(HAP, [12, 0, 0])[0], hat(HAP, [22, 0, 0])[0]] }, deco: [{ k: 'band', face: 'sides', at: A2(2.1, -1.5), to: A2(30, -1.1), c: 'sleeveD' }, { k: 'band', face: 'sides', at: A2(3.0, 2.1), to: A2(4.0, -2.1), c: 'trim' }, { k: 'band', face: 'flats', at: A2(3.0, -2.1), to: A2(4.0, 2.1), c: 'trim' }] })
        ]
      },
      noFull: ['rglove', 'lglove', 'arm']
    }
  }
  let handsBuilt = false
  const buildHands = () => { if (!handsBuilt) { handsBuilt = true; pgGun('hands', handsSpec()) } }
  // An elbow point in the camera's space (blocks; the client's first-person item sits at (0.56, -0.52, -0.72) from the
  // eye before its display transform: applyItemArmTransform) -> the gun's model units under display d (its
  // firstperson_righthand, or a state's): the inverse of render-item.js's itemMatrix (translation clamped at 80).
  const RADH = Math.PI / 180
  const rotXYZ3 = ([x, y, z]) => {
    const m3 = (a, b) => a.map(row => [0, 1, 2].map(j => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]))
    const [a, b, c] = [x || 0, y || 0, z || 0].map(v => v * RADH)
    return m3(m3([[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]], [[Math.cos(b), 0, Math.sin(b)], [0, 1, 0], [-Math.sin(b), 0, Math.cos(b)]]), [[Math.cos(c), -Math.sin(c), 0], [Math.sin(c), Math.cos(c), 0], [0, 0, 1]])
  }
  // (left: the client applies a left hand's display with (-tx, ty, tz) and (rx, -ry, -rz), its item at -0.56.)
  const handAnchor = (d, cam, left = false) => {
    const tr = (d.translation || [0, 0, 0]).map(v => Math.max(-80, Math.min(80, v)) / 16)
    if (left) tr[0] = -tr[0]
    const ro = d.rotation || [0, 0, 0]
    const R = rotXYZ3(left ? [ro[0], -ro[1], -ro[2]] : ro); const S = d.scale || [1, 1, 1]
    const v = [cam[0] - (left ? -0.56 : 0.56) - tr[0], cam[1] + 0.52 - tr[1], cam[2] + 0.72 - tr[2]]
    const r = [0, 1, 2].map(i => R[0][i] * v[0] + R[1][i] * v[1] + R[2][i] * v[2]) // R^T v
    return r.map((x, i) => (x / S[i] + 0.5) * 16)
  }
  // A model point (units) -> the camera's space (blocks) under display d, like the client (render-item.js itemMatrix,
  // left: (-tx, ty, tz), (rx, -ry, -rz), the item at -0.56), and whether a camera-space point shows on a screen up to
  // 21:9 (70 degrees high; the near plane at 0.05).
  const handWorld = (d, p, left = false) => {
    const tr = (d.translation || [0, 0, 0]).map(v => Math.max(-80, Math.min(80, v)) / 16)
    if (left) tr[0] = -tr[0]
    const ro = d.rotation || [0, 0, 0]
    const R = rotXYZ3(left ? [ro[0], -ro[1], -ro[2]] : ro); const S = d.scale || [1, 1, 1]
    const u = p.map((v, i) => (v / 16 - 0.5) * S[i])
    return [0, 1, 2].map(i => R[i][0] * u[0] + R[i][1] * u[1] + R[i][2] * u[2] + tr[i] + [left ? -0.56 : 0.56, -0.52, -0.72][i])
  }
  const T35 = Math.tan(35 * RADH)
  const onScreen = w => w[2] < -0.05 && Math.abs(w[1] / -w[2]) <= T35 && Math.abs(w[0] / -w[2]) <= T35 * 21 / 9
  const norm3 = v => { const n = Math.hypot(...v) || 1; return v.map(x => x / n) }
  // The shortest turn taking unit vector a to unit vector b.
  const fromTo = (a, b) => {
    const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    if (d < -0.999999) return [0, 0, 1, 0] // half a turn about z (a is x here)
    const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
    const q = [c[0], c[1], c[2], 1 + d]; const n = Math.hypot(...q)
    return q.map(x => x / n)
  }
  // For the gun modules' hand poses (pg.hands): a rig's inverse; a blend of two rigs (k 0..1: the translation lerped,
  // the turn nlerped); a hand's pose from an absolute placement (a hand model's coordinates -> the gun's units, at the
  // gun's rest: pose.<hand> = hands.pose(at, place), since the kit applies pose.<hand> on top of the hand's at).
  const rigInv = m => { const q = [-m.q[0], -m.q[1], -m.q[2], m.q[3]]; return { t: qRot(q, m.t).map(v => -v), q } }
  const nlerp = (a, b, k) => { const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; const sg = d < 0 ? -1 : 1; const q = a.map((v, i) => v + (sg * b[i] - v) * k); const n = Math.hypot(...q); return q.map(v => v / n) }
  const mixRig = (A, B, k) => ({ t: A.t.map((v, i) => v + (B.t[i] - v) * k), q: nlerp(A.q, B.q, k) })
  const hands = { inv: rigInv, mix: mixRig, pose: (at, place) => then(rigInv(at), place), OR: HOR, OL: HOL, HANDS }

  // Ease curves for frames.
  const ease = {
    out: p => 1 - (1 - p) * (1 - p),
    inOut: p => p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p),
    // 0 -> 1 -> 0 over the window [a, b] of p (a bump), with a held top between c and d.
    bump: (p, a, b, c = (a + b) / 2, d = c) => p <= a || p >= b ? 0 : p < c ? (p - a) / (c - a) : p <= d ? 1 : (b - p) / (b - d),
    // 0 before a, 1 after b, a smooth ramp between.
    ramp: (p, a, b) => p <= a ? 0 : p >= b ? 1 : (t => t * t * (3 - 2 * t))((p - a) / (b - a))
  }
  // A skin (tools\\guns\\skins.js): the gun's tiles repainted with theme.palette (key -> color), theme.pat (key -> a
  // pattern above), theme.ink (the outline), theme.frames (animated: stacked frames, theme.frametime ticks each, never
  // interpolated). Keys aimed through (the flash, the lens, the beam, the bore) are never recolored. Writes the texture
  // gunskin/<gun>/<look> and, for every model the gun wrote, a child that keeps its geometry and swaps the texture
  // (donating:item/gunskin/<gun>/<look>/<rest>); returns the id map (a gun model id -> its skin's).
  const KEEP = ['flash', 'flashCore', 'flash2', 'beam', 'lens', 'lensB', 'bore', 'scope', 'scopeT', 'scopeIn', 'glass', 'glassB', 'reticle', 'dot', 'post', 'sight', 'bead', 'beadHi']
  const paintSkin = (name, look, theme = {}) => {
    const g = made[name]
    if (!g) throw new Error(`paintSkin: ${name} wasn't built`)
    if (!/^[a-z0-9]+$/.test(look)) throw new Error(`paintSkin: look ${look} must be [a-z0-9]+`)
    for (const k of Object.keys(theme.palette || {})) {
      if (!g.pal[k]) throw new Error(`${name} skin ${look}: no palette key ${k}`)
      if (KEEP.includes(k) || (g.keep || []).includes(k)) throw new Error(`${name} skin ${look}: ${k} is aimed through, never recolored`)
    }
    for (const [k, p] of Object.entries(theme.pat || {})) if (!g.pal[k] || !PATTERNS[p]) throw new Error(`${name} skin ${look}: pat ${k}=${p}`)
    for (const [k, m] of Object.entries(theme.mats || {})) if (!g.pal[k] || !MAT[m] || !g.tiles.some(t => t.pg)) throw new Error(`${name} skin ${look}: mats ${k}=${m} (a key of a PG-style gun, a material)`)
    const gun = name.replace(/^gun_/, '')
    const pal = { ...g.pal, ...(theme.palette || {}) }
    const frames = theme.frames || 1
    const tex = canvas(g.W, g.H * frames)
    for (let fr = 0; fr < frames; fr++) {
      const r = rng(hash(name)) // the gun's own seed: static patterns land where they did
      for (const t of g.tiles) {
        if (t.pg) { const mat = (theme.mats && theme.mats[t.key]) || t.mat; paintPg(tex, mat === t.mat ? t : { ...t, mat, pat: t.patSet ? t.pat : MAT[mat].pat }, pal, { frame: fr, frames, theme }, t.y + fr * g.H, t.inkKey ? resolveCol(pal, t.inkKey, t.mats) : theme.ink ? rgba(theme.ink) : g.ink); continue }
        const col = rgba(pal[t.key])
        const base = t.glow ? col : shade(col, TONE[t.dir])
        const y0 = t.y + fr * g.H
        tex.fill(t.x, y0, t.x + t.w - 1, y0 + t.h - 1, base)
        const pat = (theme.pat && theme.pat[t.key]) || t.pat
        PATTERNS[pat](tex, t.x, y0, t.w, t.h, t.dir, base, r, { frame: fr, frames, theme })
        if (t.outline) {
          const o = t.inkKey ? rgba(pal[t.inkKey]) : theme.ink ? rgba(theme.ink) : g.ink
          for (let x = 0; x < t.w; x++) { tex.set(t.x + x, y0, o); tex.set(t.x + x, y0 + t.h - 1, o) }
          for (let y = 0; y < t.h; y++) { tex.set(t.x, y0 + y, o); tex.set(t.x + t.w - 1, y0 + y, o) }
        }
      }
    }
    const texId = `donating:item/gunskin/${gun}/${look}`
    write(`donating/textures/item/gunskin/${gun}/${look}.png`, tex.png())
    if (frames > 1) write(`donating/textures/item/gunskin/${gun}/${look}.png.mcmeta`, { animation: { frametime: theme.frametime || 3, interpolate: false } })
    const prefix = `donating:item/${name}_`
    const map = id => {
      if (id.startsWith('donating:item/hands/')) return id // the hands look the same on every skin (their own texture)
      if (!id.startsWith(prefix)) throw new Error(`${name} skin ${look}: ${id} isn't one of the gun's models`)
      return `donating:item/gunskin/${gun}/${look}/${id.slice(prefix.length)}`
    }
    for (const id of g.models) write(`donating/models/item/gunskin/${gun}/${look}/${id.slice(prefix.length)}.json`, { parent: id, textures: { t: texId, particle: texId } })
    return map
  }
  return { pgGun, ease, rig, then, display, paintSkin, made, MAT, tone, hot, HANDS, hands }
}
