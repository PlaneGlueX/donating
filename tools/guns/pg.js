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
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = Math.sin((x0 + x) * 0.9 + (y0 + y) * 0.35) + Math.sin((x0 + x) * 0.27 - (y0 + y) * 1.1 + 2) + r() * 0.5
        if (v > 0.9) c.set(x0 + x, y0 + y, rgba(cols[0])); else if (v < -0.9) c.set(x0 + x, y0 + y, rgba(cols[1])); else if (v > 0.2 && v < 0.45) c.set(x0 + x, y0 + y, rgba(cols[2]))
      }
    },
    // Diagonal stripes in the theme's stripe color.
    stripe: (c, x0, y0, w, h, dir, col, r, ctx = {}) => {
      const sc = rgba((ctx.theme && ctx.theme.stripe) || [20, 20, 20])
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (((x0 + x) + (y0 + y)) % 6 < 2) c.set(x0 + x, y0 + y, sc)
    },
    // Carbon weave: a 2x2 checker of two shades.
    carbon: (c, x0, y0, w, h, dir, col) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((Math.floor((x0 + x) / 2) + Math.floor((y0 + y) / 2)) % 2 === 0) c.set(x0 + x, y0 + y, shade(col, 1.35))
    },
    // Gold: a bright band and scattered sparkles.
    gold: (c, x0, y0, w, h, dir, col, r) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const f = 1.15 - 0.35 * (y / Math.max(1, h - 1))
        c.set(x0 + x, y0 + y, shade(col, f))
        if (r() < 0.05) c.set(x0 + x, y0 + y, [255, 250, 210, 255])
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
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = Math.abs(Math.sin((x0 + x) * 0.7 + Math.sin((y0 + y) * 0.5) * 2))
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
    const D = spec.density || 2
    const r = rng(hash(name))
    const pal = spec.palette
    const ink = rgba(spec.ink || [16, 18, 24])
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
    for (const [part, boxes] of Object.entries(spec.parts)) {
      elementsOf[part] = boxes.map(b => {
        const faces = {}
        for (const dir of b.dirs || ['north', 'south', 'east', 'west', 'up', 'down']) {
          const key = pick(b.c, dir)
          if (!pal[key]) throw new Error(`${name}: no palette color ${key}`)
          const [w, h] = faceSize(b, dir)
          tiles.push({ x: 0, y: 0, w, h, dir, key, col: rgba(pal[key]), pat: pick(b.pat, dir) || 'flat', glow: b.glow, outline: b.outline !== false && !b.glow, inkKey: b.ink || null, ink: b.ink ? rgba(pal[b.ink]) : null })
          faces[dir] = { tile: tiles.length - 1, ...(b.rotUV ? { rotation: b.rotUV } : {}) }
        }
        const e = { from: b.from, to: b.to, faces }
        if (b.rot) e.rotation = b.rot
        if (b.glow) { e.light_emission = 15; e.shade = false }
        return e
      })
    }
    for (W = 64; ; W *= 2) {
      sx = 0; sy = 0; shelf = 0
      for (const t of tiles) [t.x, t.y] = place(t.w, t.h)
      if (sy + shelf <= W) break
    }
    const H = W
    const tex = canvas(W, H)
    // Base tones by face (the client shades items too, more lightly: up 1, down 0.5, N/S 0.8, E/W 0.6 in the gui).
    for (const t of tiles) {
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

    made[name] = { tiles, W, H, pal, ink, models }

    // ---------- frames ----------
    // A pose: { gun: rig (the whole gun), <part>: rig (on top of the gun's), hide: [parts], show: [parts] }.
    // Parts in spec.hidden (the flash) only show when a pose lists them in show.
    const hidden = new Set(spec.hidden || [])
    const composite = (state, pose = {}) => ({
      type: 'minecraft:composite',
      models: parts.filter(p => (hidden.has(p) ? (pose.show || []).includes(p) : !(pose.hide || []).includes(p))).map(p => {
        const m = then(pose[p] || ID, pose.gun || ID)
        return { type: 'minecraft:model', model: id(p, state), ...(isId(m) ? {} : { transformation: json(m) }) }
      })
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
      cases: [{ when: ['firstperson_righthand', 'firstperson_lefthand'], model: fp }],
      fallback: { type: 'minecraft:model', model: id('full', state) }
    })
    // A custom_model_data flag GunFx sets (DonatingPhone GunFx.java): 0 firing (the automatic guns), 1 a firearm action
    // without a shot (a pump or bolt worked alone), 2 a draw on a gun that also has a shot clock (both read the Default
    // state's clock). on_true while the flag is set.
    const flag = (index, on_true, on_false) => ({ type: 'minecraft:condition', property: 'minecraft:custom_model_data', index, on_true, on_false })
    return { id, parts, composite, cooldown, firing, byContext, rig, then, flag }
  }
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
      if (KEEP.includes(k)) throw new Error(`${name} skin ${look}: ${k} is aimed through, never recolored`)
    }
    for (const [k, p] of Object.entries(theme.pat || {})) if (!g.pal[k] || !PATTERNS[p]) throw new Error(`${name} skin ${look}: pat ${k}=${p}`)
    const gun = name.replace(/^gun_/, '')
    const pal = { ...g.pal, ...(theme.palette || {}) }
    const frames = theme.frames || 1
    const tex = canvas(g.W, g.H * frames)
    for (let fr = 0; fr < frames; fr++) {
      const r = rng(hash(name)) // the gun's own seed: static patterns land where they did
      for (const t of g.tiles) {
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
      if (!id.startsWith(prefix)) throw new Error(`${name} skin ${look}: ${id} isn't one of the gun's models`)
      return `donating:item/gunskin/${gun}/${look}/${id.slice(prefix.length)}`
    }
    for (const id of g.models) write(`donating/models/item/gunskin/${gun}/${look}/${id.slice(prefix.length)}.json`, { parent: id, textures: { t: texId, particle: texId } })
    return map
  }
  return { pgGun, ease, rig, then, display, paintSkin, made }
}
