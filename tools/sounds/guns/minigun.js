// The Hand Minigun's sounds (2026-10-12; weapons\assault_rifles\FN_FAL.yml, tools\guns\minigun.js, DonatingPhone
// GunSpin): a four-barrel microgun on a rifle frame in Pixel Gun 3D's punchy arcade style, synthesized from scratch like
// the rest (make-gun-sounds.js: seeded noise, filters, swept thumps, clicks, metal rings, a small room); no recording is
// sampled. Everything that turns (the spin-up, the spin-down, the draw's test whir, the reload's ratchet) comes from one
// rotation: its angle is the integral of the speed, so the gear clicks and the barrels' whoosh speed up and slow down
// with the barrels, on the frames' own curves (spin-up: the speed rises linearly, 360 p^2; spin-down: it falls
// linearly, 360 (2p - p^2)).
//   shoot     3 variants, 90 ms: a short punchy "dut", lighter than the AK-48's (a small thump, a tight crack) with a
//             thin metallic tail; at 16 a second WeaponMechanics fires four rounds a tick (50 ms) apart, then skips a
//             tick, so each has died ~17 dB by the next
//   spinup    (GunSpin at each burst's start from under fire-at (s < 0.3), volume 1, pitch 0.85 + 0.3 s: 0.85 from
//             cold; stopped on release)
//             1.3 s: the motor engaging (a clunk), its whine rising from 0.4 to the top, the gear clatter speeding up
//             into a buzz and the barrels' whoosh beating faster; timed for pitch 0.85, where it plays 1.18 times as
//             long: the speed rises linearly like GunSpin's spin s (1/24 a tick) to the top at 1.2 s heard (the
//             24-tick clock), so the whine at spin s is 442 (0.4 + 0.6 s) Hz; it recedes from there, as the shots
//             take over
//   spindown  (GunSpin on release from s >= fire-at 0.3 only, volume s; played at pitch 0.4 + 0.6 s it starts on the
//             spin-up's whine at s) 1.5 s:
//             the whine falling and fading from the spin-up's top as heard from cold (442 Hz at pitch 1), the clicks
//             slowing down to a stop, the barrels settling with a soft knock at 1.38 s
//   draw      (on equip, 40 ticks = 2.0 s) the heavy gun lifted (0-0.3 s: a cloth and sling whoosh), its weight
//             settling at 0.8 s (a dull thunk, the belt's rounds), turned to its side at 1.05 s (a light click), the
//             test whir 1.0-1.92 s (p 0.5-0.96: the motor's relay clicks, the barrels given a full-turn test spin that
//             speeds up and eases out like the frames' (a smoothstep), a clack as they stop)
//   mag_out   (reload tick 13, p 0.144) the catch clicks, the box slides down out of the well, comes free at 0.13 s (a
//             clunk, the hollow box rings) and the belt's rounds rattle as it drops away
//   mag_in    (reload tick 54, p 0.6) the box's front hooks in and latches at once (a light clack, then a solid clack
//             and a thump: the seat's jolt), the palm slap 0.18 s later (p 0.64), the rounds settle
//   ratchet   (reload ticks 67 and 74: two quarter turns by hand, p 0.744-0.8 and 0.822-0.878; the frames then let
//             the cluster coast a half turn as the gun levels, p 0.87-0.98, with no sound of its own) a heavy click, the
//             cluster swung a quarter turn (a short whir and the pawl's clicks over 0.24 s, the frames' 5 ticks), the
//             detent's clack as it lands
// The spin sounds are played by GunSpin, not WeaponMechanics, so build-pack.js doesn't lower them: they are set here to
// their final loudness (SPIN_RMS, SPIN_PEAK below). The rest are played by FN_FAL.yml and lowered with every gun sound.
module.exports = ({ SR, buf, add, biquad, noise, env, sweep, ring, click, reverb, softclip, master, shot }) => {
  // The spin sounds' final level (GunSpin plays them at volume 1; nothing lowers them): a whine is steady, so it's set by
  // its RMS over its loudest 0.3 s, not by its peak: SPIN_RMS dBFS, about 8 dB under the 16-a-second shot train's
  // (-15 dBFS at the 0.65 every gun sound ends at), and its peak under SPIN_PEAK so a shot (0.6) on top stays under 1.
  const SPIN_RMS = -22
  const SPIN_PEAK = -9.5
  const level = (b, rms, peakDb) => {
    const W = Math.round(0.3 * SR)
    let best = 0
    for (let i = 0; i + W <= b.length; i += Math.round(0.01 * SR)) { let s = 0; for (let j = i; j < i + W; j++) s += b[j] * b[j]; best = Math.max(best, s / W) }
    let peak = 0
    for (const v of b) peak = Math.max(peak, Math.abs(v))
    const g = Math.min(Math.pow(10, rms / 20) / Math.sqrt(best), Math.pow(10, peakDb / 20) / peak)
    const fade = Math.round(0.005 * SR)
    for (let i = 0; i < b.length; i++) b[i] *= g * Math.min(1, (b.length - 1 - i) / fade)
    return b
  }
  // A rattle: n tiny clicks spread over [t0, t1] s (the belt's rounds shifting in the box).
  const rattle = (b, r, t0, t1, n, gain, hp = 2500) => {
    for (let k = 0; k < n; k++) {
      const t = t0 + (t1 - t0) * (k + r()) / n
      add(b, click(r, 1 + r() * 1.5, hp + r() * 2500), t, gain * (0.5 + r() * 0.5))
    }
  }
  // A scrape: band-passed noise sweeping from f0 to f1 over len seconds.
  const scrape = (r, len, f0, f1, tau, q = 1.3) => env(biquad(noise(len, r), 'bandpass', t => f0 + (f1 - f0) * Math.min(1, t / len), q), tau, 0.008)
  // A knock: a low padded thud (the weight settling, a palm, the barrels stopping).
  const knock = (b, r, at, gain, f0 = 120, f1 = 70) => {
    add(b, env(biquad(noise(0.12, r), 'lowpass', 900), 0.022, 0.002), at, 0.8 * gain)
    add(b, env(sweep(0.16, f0, f1, 0.03), 0.04), at, gain)
  }
  // A clack: a bright click, a metal ring and a little body (a latch, a detent).
  const clack = (b, r, at, gain, hp = 1700, ringHz = [1300, 2800, 4500]) => {
    add(b, click(r, 3, hp), at, gain)
    add(b, env(ring(0.2, ringHz, 0.035, r), 0.045), at, 0.35 * gain)
    add(b, env(sweep(0.14, 160, 95, 0.03), 0.035), at, 0.55 * gain)
  }
  // The rotation: len seconds of the cluster turning at v(t) (0..1 of full spin; the barrels' speed is v x REV turns a
  // second) and loud g(t) (0..1). Three layers:
  //   the motor's whine: a buzzy tone (6 harmonics) at w(t) x TOP Hz with an inharmonic gear tone (x 2.62) over it;
  //   the gear clatter: a click each time a gear tooth passes (TEETH a turn), quieter as they crowd into a buzz;
  //   the barrels' whoosh: band-passed noise (brighter as it speeds up) beating once per barrel passing (4 a turn).
  // The angle is integrated from v, so the clicks and the beat follow the speed exactly.
  const TOP = 520
  const REV = 11
  const TEETH = 6
  const spin = (r, len, v, w, g, mix = {}) => {
    const { whine = 1, gear = 1, clat = 1, air = 1, floor = 0.35 } = mix
    const n = Math.ceil(len * SR)
    const out = buf(len)
    // the whine: additive (no aliasing), phase from w(t)
    let ph = 0
    for (let i = 0; i < n; i++) {
      const t = i / SR
      ph += 2 * Math.PI * w(t) * TOP / SR
      let s = 0
      for (let k = 1; k <= 6; k++) s += Math.sin(k * ph + k * 0.7) / Math.pow(k, 1.15)
      s = s * 0.55 + Math.sin(2.62 * ph) * 0.18 * gear
      out[i] = s * whine * 0.5 * g(t) * (floor + (1 - floor) * v(t))
    }
    // the barrels' whoosh: noise through a band that rises with the speed, beating at the barrels' passes
    const nz = noise(len, r)
    const band = biquad(nz, 'bandpass', t => 500 + 2000 * v(t), 0.8)
    let ang = 0
    const clicks = []
    let nextTooth = 1 / TEETH
    for (let i = 0; i < n; i++) {
      const t = i / SR
      ang += v(t) * REV / SR // in turns
      const beat = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * 4 * ang), 2)
      out[i] += band[i] * air * 0.9 * g(t) * v(t) * (0.35 + 0.65 * beat)
      if (ang >= nextTooth) { clicks.push(t); nextTooth += 1 / TEETH }
    }
    // the gear clatter: one click a tooth, quieter as they crowd (rate = v x REV x TEETH a second)
    for (const t of clicks) {
      const rate = Math.max(1, v(t) * REV * TEETH)
      const crowd = Math.min(1, 14 / rate)
      add(out, click(r, 1 + r(), 2200 + r() * 1800), t, clat * g(t) * (0.25 + 0.75 * crowd) * (0.7 + r() * 0.3))
    }
    return out
  }
  const sounds = {
    minigun_shoot: {
      len: 0.09,
      make: shot({
        len: 0.09,
        crack: [1100, 7000, 0.009],
        thump: [215, 100, 0.018, 0.85],
        extra: (b, r) => {
          // the metallic tail: a thin high ring off the barrel cluster, and a small square blip (the arcade "dut")
          add(b, env(ring(0.09, [2900 + r() * 250, 4400, 6300], 0.024, r), 0.026), 0.003, 0.2)
          add(b, env(biquad(sweep(0.04, 900, 420, 0.012, 'square'), 'lowpass', 2600), 0.011), 0, 0.16)
        },
        tail: 0.022,
        room: 0.3,
        mix: 0.09,
        drive: 1.7
      })
    },
    minigun_spinup: {
      len: 1.3,
      make: r => {
        const T = 1.2 * 0.85 // full spin: GunSpin's 24-tick clock as heard at its from-cold pitch 0.85
        const v = t => Math.min(1, t / T) // speed: linear, like GunSpin's s
        const w = t => 0.4 + 0.6 * v(t)
        const g = t => Math.min(1, t / 0.03) * (t > T ? Math.exp(-(t - T) / 0.11) : 1)
        const b = spin(r, 1.3, v, w, g, { floor: 0.6 })
        // the motor engaging: a clunk and a relay click
        add(b, click(r, 2, 1500), 0, 0.3)
        add(b, env(sweep(0.12, 140, 80, 0.03), 0.035), 0, 0.3)
        return level(reverb(b, 0.45, 0.5, 0.1), SPIN_RMS, SPIN_PEAK)
      }
    },
    minigun_spindown: {
      len: 1.5,
      make: r => {
        const T = 1.4 // stopped
        const v = t => Math.max(0, 1 - t / T)
        // the whine starts at 442 Hz: the spin-up's top as GunSpin plays it from cold (pitch 0.85)
        const w = t => 0.85 * (0.25 + 0.75 * v(t))
        const g = t => Math.min(1, t / 0.01) * Math.pow(v(t), 0.6)
        // the motor is off: its whine falls and fades faster than the barrels slow, the clicks go on to the stop
        const b = spin(r, 1.5, v, w, g, { clat: 1.3 })
        knock(b, r, 1.38, 0.12, 110, 70) // the barrels settle
        return level(reverb(b, 0.45, 0.5, 0.1), SPIN_RMS + 1, SPIN_PEAK)
      }
    },
    minigun_draw: {
      len: 2.2,
      make: r => {
        const b = buf(2.2)
        add(b, env(biquad(noise(0.45, r), 'bandpass', t => 450 + 2400 * Math.min(1, t / 0.4), 0.8), 0.12, 0.06), 0, 0.7) // lifted
        add(b, click(r, 2, 2800), 0.26, 0.3) // a sling swivel
        knock(b, r, 0.8, 0.85) // the weight settles
        rattle(b, r, 0.81, 0.95, 5, 0.3, 1800) // the belt's rounds
        add(b, click(r, 2, 2400), 1.05, 0.45) // turned to its side
        add(b, env(ring(0.12, [1900, 3900], 0.02, r), 0.025), 1.05, 0.15)
        // the test whir (p 0.5-0.96): the motor's relay clicks at 1.0 s, the barrels' full-turn test spin speeds up and
        // eases out (the frames' smoothstep: its speed is a bell, 6u (1 - u)) and stops at 1.92 s
        const L = 0.92
        const v = t => { const u = Math.min(1, Math.max(0, t / L)); return 0.6 * 4 * u * (1 - u) }
        const w = t => 0.3 + 0.8 * v(t)
        const g = t => Math.min(1, t / 0.01) * Math.min(1, Math.max(0, (L - t) / 0.03))
        add(b, spin(r, L, v, w, g, { whine: 0.6, clat: 1.2, air: 0.8 }), 1.0, 0.9)
        add(b, click(r, 2, 1500), 1.0, 0.5) // the motor's relay
        clack(b, r, 1.92, 0.5, 1500, [1100, 2400, 3900]) // the barrels stop
        return master(reverb(b, 0.45, 0.5, 0.12), -4)
      }
    },
    minigun_mag_out: {
      len: 0.5,
      make: r => {
        const b = buf(0.5)
        add(b, click(r, 3, 1800), 0, 1) // the catch
        add(b, env(ring(0.15, [1450, 3000], 0.025, r), 0.03), 0, 0.3)
        add(b, scrape(r, 0.12, 2000, 900, 0.05, 1.1), 0.025, 0.5) // the box slides down out of the well
        add(b, click(r, 2, 1200), 0.13, 0.65) // it comes free
        add(b, env(sweep(0.16, 130, 85, 0.03), 0.035), 0.13, 0.45)
        add(b, env(ring(0.3, [480, 1180, 2400], 0.08, r), 0.09), 0.13, 0.4) // the hollow box rings
        rattle(b, r, 0.15, 0.38, 8, 0.45) // the belt's rounds as it drops away
        return master(reverb(b, 0.45, 0.5, 0.14), -3)
      }
    },
    minigun_mag_in: {
      len: 0.6,
      make: r => {
        const b = buf(0.6)
        add(b, scrape(r, 0.03, 3000, 1800, 0.012), 0, 0.3)
        add(b, click(r, 2, 2400), 0.004, 0.7) // the front hooks in
        add(b, env(ring(0.15, [1650, 3400], 0.025, r), 0.03), 0.004, 0.2)
        clack(b, r, 0.025, 1, 1700, [560, 1350, 2700, 4200]) // latched: the seat's jolt (reload p 0.6 = tick 54)
        rattle(b, r, 0.03, 0.12, 3, 0.25)
        knock(b, r, 0.18, 1, 115, 68) // the palm slap on the box (p 0.64, 3.6 ticks after the seat)
        rattle(b, r, 0.19, 0.3, 4, 0.2)
        return master(reverb(b, 0.45, 0.5, 0.12), -2)
      }
    },
    minigun_ratchet: {
      len: 0.45,
      make: r => {
        const b = buf(0.45)
        // the pawl: a heavy click
        add(b, click(r, 3, 1400), 0, 1)
        add(b, env(sweep(0.12, 150, 90, 0.025), 0.03), 0, 0.7)
        // a quarter turn in 0.24 s (the frames' 5 ticks: it speeds up, then eases into the detent)
        const L = 0.235
        const v = t => 0.55 * Math.sin(Math.PI * Math.min(1, t / L))
        const w = t => 0.3 + 0.5 * v(t)
        const g = t => Math.min(1, t / 0.01)
        add(b, spin(r, L, v, w, g, { whine: 0.25, clat: 1.4, air: 1 }), 0.005, 0.8)
        clack(b, r, 0.24, 0.85, 1600, [1200, 2600, 4300]) // the detent (the frame that lands it: 5 ticks in)
        return master(reverb(b, 0.4, 0.5, 0.12), -2)
      }
    }
  }
  const events = {
    'minigun.shoot': ['minigun_shoot', 3],
    'minigun.spinup': ['minigun_spinup'],
    'minigun.spindown': ['minigun_spindown'],
    'minigun.draw': ['minigun_draw'],
    'minigun.mag_out': ['minigun_mag_out'],
    'minigun.mag_in': ['minigun_mag_in'],
    'minigun.ratchet': ['minigun_ratchet']
  }
  return { sounds, events }
}
