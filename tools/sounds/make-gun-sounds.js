// The guns' sounds (2026-10-05; the owner: "get new ones, try to replicate the ones from pg3d"): every shot, reload,
// slide, pump, bolt and draw sound of the four sold guns, synthesized here from scratch (seeded noise, filters,
// pitch-swept thumps, clicks, metal rings, a small reverb) in Pixel Gun 3D's punchy arcade style; no recording is
// sampled. Written as mono Ogg Vorbis (the client only decodes Vorbis: 26.3 JOrbisAudioStream) into
// pack\assets\minecraft\sounds\donating\gun\ with their events in pack\assets\minecraft\sounds.json
// ("donating.gun.<gun>.<what>"), which build-pack.js merges with WeaponMechanics' and lowers like every gun sound
// (GUN_SOUND_VOLUME: the weapon files play shots at volume 6). Same seed, same samples (the encoder gives each Ogg
// stream a random serial number, so the files' bytes still change from run to run: rebuild only when a sound changes).
//
// Usage: tools\node\node.exe tools\sounds\make-gun-sounds.js [--wav <dir>]   (--wav also writes WAV previews)
// The encoder is wasm-media-encoders 0.7.0 (libvorbis in WASM, MIT/BSD): tools\sounds\npm install (package.json).
const fs = require('fs')
const path = require('path')
const { createOggEncoder } = require(path.join(__dirname, 'node_modules', 'wasm-media-encoders'))

const SR = 48000
const OUT = path.join(__dirname, '..', '..', 'pack', 'assets', 'minecraft')
const wavDir = process.argv.includes('--wav') ? process.argv[process.argv.indexOf('--wav') + 1] : null

// ---------- DSP ----------
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
const buf = sec => new Float32Array(Math.ceil(sec * SR))
const add = (dst, src, at = 0, gain = 1) => { const o = Math.round(at * SR); for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * gain; return dst }
// RBJ biquad (lowpass | highpass | bandpass), q = resonance; f may be a function of time (a sweep).
const biquad = (x, type, f, q = 0.707) => {
  const y = new Float32Array(x.length)
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0
  for (let i = 0; i < x.length; i++) {
    const fc = Math.min(SR * 0.45, typeof f === 'function' ? f(i / SR) : f)
    const w = 2 * Math.PI * fc / SR; const a = Math.sin(w) / (2 * q); const c = Math.cos(w)
    let b0, b1, b2
    if (type === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2 } else if (type === 'highpass') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2 } else { b0 = a; b1 = 0; b2 = -a }
    const a0 = 1 + a; const a1 = -2 * c; const a2 = 1 - a
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v
  }
  return y
}
const noise = (sec, r) => { const b = buf(sec); for (let i = 0; i < b.length; i++) b[i] = r() * 2 - 1; return b }
// Envelope: a short attack, then an exponential decay with time constant tau (s).
const env = (b, tau, attack = 0.0005) => { for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] *= Math.min(1, t / attack) * Math.exp(-t / tau) } return b }
// An oscillator swept from f0 to f1 with time constant tau: sine | square | saw.
const sweep = (sec, f0, f1, tau, shape = 'sine') => {
  const b = buf(sec); let ph = 0
  for (let i = 0; i < b.length; i++) {
    const t = i / SR; const f = f1 + (f0 - f1) * Math.exp(-t / tau)
    ph += 2 * Math.PI * f / SR
    const s = Math.sin(ph)
    b[i] = shape === 'square' ? Math.sign(s) * 0.6 : shape === 'saw' ? ((ph / Math.PI) % 2) - 1 : s
  }
  return b
}
// A metallic ring: inharmonic partials (Hz), each decaying with tau.
const ring = (sec, freqs, tau, r) => { const b = buf(sec); for (const f of freqs) { const ph = r() * 6.28; for (let i = 0; i < b.length; i++) b[i] += Math.sin(ph + 2 * Math.PI * f * i / SR) * Math.exp(-i / SR / tau) / freqs.length } return b }
// A click: a 1-3 ms high-passed burst.
const click = (r, ms = 2, hp = 2500) => env(biquad(noise(ms / 1000 + 0.01, r), 'highpass', hp), ms / 1000 / 2.5)
// A small Schroeder reverb (4 combs, 2 allpasses): the room tail.
const reverb = (x, size = 1, damp = 0.4, mix = 0.25) => {
  const y = new Float32Array(x.length)
  for (const d of [1557, 1617, 1491, 1422]) {
    const n = Math.round(d * size * SR / 44100); const line = new Float32Array(n); let k = 0; let lp = 0
    for (let i = 0; i < x.length; i++) { const o = line[k]; lp = o * (1 - damp) + lp * damp; line[k] = x[i] + lp * 0.78; k = (k + 1) % n; y[i] += o / 4 }
  }
  for (const d of [225, 556]) {
    const n = Math.round(d * SR / 44100); const line = new Float32Array(n); let k = 0
    for (let i = 0; i < y.length; i++) { const o = line[k]; const v = y[i] + o * 0.5; line[k] = v; k = (k + 1) % n; y[i] = o - v * 0.5 }
  }
  const out = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) out[i] = x[i] * (1 - mix) + y[i] * mix
  return out
}
const softclip = (b, k = 1.5) => { for (let i = 0; i < b.length; i++) b[i] = Math.tanh(k * b[i]) / Math.tanh(k); return b }
// Peak to -1 dBFS (or gain dB lower), a 5 ms fade at the end.
const master = (b, gain = -1) => {
  let peak = 0; for (const v of b) peak = Math.max(peak, Math.abs(v))
  const g = peak ? Math.pow(10, gain / 20) / peak : 1
  const fade = Math.round(0.005 * SR)
  for (let i = 0; i < b.length; i++) b[i] *= g * Math.min(1, (b.length - 1 - i) / fade)
  return b
}

// ---------- the sounds ----------
// Shots: a click, a band of noise (the crack), a pitch-swept thump (the body), extras, a short room.
const shot = ({ len, crack: [lo, hi, ctau], thump: [f0, f1, ttau, tgain = 0.9], extra, tail = 0.15, room = 0.6, mix = 0.22, drive = 1.6 }) => r => {
  const b = buf(len)
  add(b, click(r, 2, 3000), 0, 0.8)
  add(b, env(biquad(biquad(noise(len, r), 'highpass', lo), 'lowpass', hi), ctau), 0, 0.9)
  add(b, env(sweep(len, f0 * (0.96 + r() * 0.08), f1, ttau / 2), ttau), 0, tgain)
  if (extra) extra(b, r)
  add(b, env(biquad(noise(len, r), 'lowpass', 900), tail, 0.004), 0.004, 0.35)
  return master(softclip(reverb(b, room, 0.45, mix), drive))
}
const SOUNDS = {
  // The Pixel Gun's iconic arcade shot: a bright crack, a round thump and a quiet "pew" chirp.
  pistol_shoot: { variants: 2, len: 0.48, make: shot({ len: 0.48, crack: [1500, 7000, 0.025], thump: [220, 60, 0.04], extra: (b, r) => add(b, env(biquad(sweep(0.08, 1400, 500, 0.03, 'square'), 'lowpass', 3000), 0.03), 0, 0.12), tail: 0.18 }) },
  // The Machine Gun: short and tight so 11 shots a second don't smear.
  smg_shoot: { variants: 3, len: 0.28, make: shot({ len: 0.28, crack: [800, 5000, 0.018], thump: [160, 70, 0.025], tail: 0.09, room: 0.5, mix: 0.16 }) },
  // The Shotgun: a deep boom and a long tail.
  shotgun_shoot: { variants: 2, len: 0.78, make: shot({ len: 0.78, crack: [200, 4000, 0.06], thump: [90, 40, 0.08, 1.1], tail: 0.35, room: 0.9, mix: 0.3, drive: 2.2 }) },
  // The AK-48: a crack, a thump and a square "bark".
  ak_shoot: { variants: 3, len: 0.5, make: shot({ len: 0.5, crack: [600, 6000, 0.03], thump: [130, 55, 0.05], extra: (b, r) => add(b, env(biquad(sweep(0.12, 300, 150, 0.05, 'square'), 'lowpass', 2000), 0.03), 0, 0.3), tail: 0.25, room: 0.7, mix: 0.24, drive: 1.9 }) },
  // Mechanics.
  mag_out: { len: 0.32, make: r => { const b = buf(0.32); add(b, click(r, 3, 1800), 0, 0.9); add(b, env(biquad(noise(0.3, r), 'bandpass', t => 2000 + 4000 * t, 1.2), 0.07, 0.03), 0.02, 0.5); add(b, env(ring(0.25, [1200, 2900, 4700], 0.04, r), 0.05), 0.005, 0.25); return master(reverb(b, 0.4, 0.5, 0.12), -3) } },
  mag_in: { len: 0.3, make: r => { const b = buf(0.3); add(b, env(sweep(0.2, 140, 100, 0.05), 0.04), 0, 0.8); add(b, click(r, 2, 2000), 0, 1); add(b, click(r, 2, 3500), 0.045, 0.7); add(b, env(ring(0.25, [1500, 3300, 5200], 0.05, r), 0.06), 0.045, 0.3); return master(reverb(b, 0.4, 0.5, 0.12), -2) } },
  slide_back: { len: 0.22, make: r => { const b = buf(0.22); add(b, click(r, 2, 2500), 0, 1); add(b, env(biquad(noise(0.2, r), 'bandpass', 3500, 1.5), 0.03), 0.004, 0.4); add(b, env(ring(0.2, [1800, 3900], 0.03, r), 0.04), 0, 0.3); return master(b, -3) } },
  slide_fwd: { len: 0.25, make: r => { const b = buf(0.25); add(b, click(r, 2, 2000), 0, 1); add(b, env(ring(0.24, [1300, 2700, 4400], 0.06, r), 0.07), 0, 0.5); return master(reverb(b, 0.4, 0.5, 0.1), -2) } },
  pump_back: { len: 0.25, make: r => { const b = buf(0.25); add(b, env(biquad(noise(0.24, r), 'bandpass', t => 1500 + 3000 * t, 1.3), 0.05, 0.01), 0, 0.7); add(b, click(r, 3, 1500), 0.06, 1); add(b, env(ring(0.2, [900, 2100, 3600], 0.04, r), 0.05), 0.06, 0.35); return master(b, -2) } },
  pump_fwd: { len: 0.3, make: r => { const b = buf(0.3); add(b, env(biquad(noise(0.2, r), 'bandpass', t => 4500 - 3000 * t, 1.3), 0.04, 0.01), 0, 0.6); add(b, env(sweep(0.2, 160, 90, 0.04), 0.05), 0.05, 0.6); add(b, click(r, 3, 1800), 0.05, 1); add(b, env(ring(0.25, [1100, 2500, 4100], 0.06, r), 0.07), 0.05, 0.4); return master(reverb(b, 0.4, 0.5, 0.12), -1) } },
  shell: { len: 0.2, make: r => { const b = buf(0.2); add(b, env(biquad(noise(0.15, r), 'bandpass', 2800, 1.2), 0.03, 0.01), 0, 0.5); add(b, click(r, 2, 1200), 0.05, 0.9); add(b, env(sweep(0.1, 200, 140, 0.03), 0.025), 0.05, 0.35); return master(b, -4) } },
  bolt: { len: 0.35, make: r => { const b = buf(0.35); add(b, click(r, 2, 2200), 0, 1); add(b, env(ring(0.15, [1600, 3500], 0.03, r), 0.04), 0, 0.3); add(b, click(r, 3, 1800), 0.13, 1); add(b, env(ring(0.2, [1200, 2600, 4300], 0.05, r), 0.06), 0.13, 0.45); return master(reverb(b, 0.4, 0.5, 0.1), -2) } },
  draw: { len: 0.35, make: r => { const b = buf(0.35); add(b, env(biquad(noise(0.3, r), 'bandpass', t => 900 + 2500 * t, 0.9), 0.08, 0.03), 0, 0.6); add(b, click(r, 2, 2600), 0.2, 0.7); add(b, env(ring(0.15, [2000, 4100], 0.04, r), 0.04), 0.2, 0.3); return master(b, -5) } },
  empty: { len: 0.12, make: r => { const b = buf(0.12); add(b, click(r, 3, 1500), 0, 1); add(b, env(ring(0.1, [2400, 5100], 0.015, r), 0.02), 0, 0.2); return master(b, -6) } }
}
// Events: donating.gun.<gun>.<what> -> files. Each gun its own shot; the mechanics are shared where one gun's sound
// would do for another (each event its own seed, so two guns' events differ a little).
const EVENTS = {
  'pistol.shoot': ['pistol_shoot', 2], 'pistol.mag_out': ['mag_out'], 'pistol.mag_in': ['mag_in'], 'pistol.slide_back': ['slide_back'], 'pistol.slide_fwd': ['slide_fwd'],
  'smg.shoot': ['smg_shoot', 3], 'smg.mag_out': ['mag_out'], 'smg.mag_in': ['mag_in'], 'smg.bolt': ['bolt'], 'smg.draw': ['draw'],
  'shotgun.shoot': ['shotgun_shoot', 2], 'shotgun.shell': ['shell'], 'shotgun.pump_back': ['pump_back'], 'shotgun.pump_fwd': ['pump_fwd'], 'shotgun.draw': ['draw'],
  'ak.shoot': ['ak_shoot', 3], 'ak.mag_out': ['mag_out'], 'ak.mag_in': ['mag_in'], 'ak.bolt': ['bolt'], 'ak.draw': ['draw'],
  empty: ['empty']
}
const hash = s => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261)

const wav = b => {
  const d = Buffer.alloc(44 + b.length * 2)
  d.write('RIFF', 0); d.writeUInt32LE(36 + b.length * 2, 4); d.write('WAVEfmt ', 8); d.writeUInt32LE(16, 16); d.writeUInt16LE(1, 20); d.writeUInt16LE(1, 22)
  d.writeUInt32LE(SR, 24); d.writeUInt32LE(SR * 2, 28); d.writeUInt16LE(2, 32); d.writeUInt16LE(16, 34); d.write('data', 36); d.writeUInt32LE(b.length * 2, 40)
  for (let i = 0; i < b.length; i++) d.writeInt16LE(Math.round(Math.max(-1, Math.min(1, b[i])) * 32767), 44 + i * 2)
  return d
}

;(async () => {
  const enc = await createOggEncoder()
  const ogg = b => {
    enc.configure({ channels: 1, sampleRate: SR, vbrQuality: 5 })
    const parts = [Buffer.from(enc.encode([b]))]
    parts.push(Buffer.from(enc.finalize()))
    const out = Buffer.concat(parts)
    // What the client checks first: an Ogg page and a Vorbis identification packet, one channel.
    if (out.toString('latin1', 0, 4) !== 'OggS' || out.toString('latin1', 29, 35) !== 'vorbis' || out[39] !== 1) throw new Error('not a mono Ogg Vorbis file')
    return out
  }
  const dir = path.join(OUT, 'sounds', 'donating', 'gun')
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  if (wavDir) fs.mkdirSync(wavDir, { recursive: true })
  const json = {}
  let bytes = 0
  for (const [ev, [kind, n = 1]] of Object.entries(EVENTS)) {
    const files = []
    for (let k = 1; k <= n; k++) {
      const file = `${ev.replace(/\./g, '_')}${n > 1 ? '_' + k : ''}`
      const b = SOUNDS[kind].make(rng(hash(`${ev}#${k}`)))
      const o = ogg(b)
      fs.writeFileSync(path.join(dir, `${file}.ogg`), o)
      if (wavDir) fs.writeFileSync(path.join(wavDir, `${file}.wav`), wav(b))
      bytes += o.length
      files.push({ name: `donating/gun/${file}` })
    }
    json[`donating.gun.${ev}`] = { sounds: files }
  }
  fs.writeFileSync(path.join(OUT, 'sounds.json'), JSON.stringify(json, null, 2) + '\n')
  console.log(`wrote ${Object.keys(json).length} gun sound events, ${Object.values(json).reduce((a, e) => a + e.sounds.length, 0)} files, ${Math.round(bytes / 1024)} KB`)
})().catch(e => { console.error(e); process.exit(1) })
