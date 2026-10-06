// The Brave Patriot's sounds (2026-10-06; weapons\assault_rifles\STG44.yml, tools\guns\tommy.js): a drum-fed tommy gun
// in Pixel Gun 3D's punchy arcade style, synthesized from scratch like the rest (make-gun-sounds.js: seeded noise,
// filters, swept thumps, clicks, metal rings, a small room); no recording is sampled. Each sound is timed to the
// frames it goes with (the weapon file's delayBeforePlay puts its start on the frame: see each line).
module.exports = ({ buf, add, biquad, noise, env, sweep, ring, click, reverb, softclip, master, shot }) => {
  // A rattle: n tiny clicks spread over [t0, t1] s (the rounds shifting in the drum).
  const rattle = (b, r, t0, t1, n, gain) => {
    for (let k = 0; k < n; k++) {
      const t = t0 + (t1 - t0) * (k + r()) / n
      add(b, click(r, 1 + r() * 1.5, 2500 + r() * 2500), t, gain * (0.5 + r() * 0.5))
    }
  }
  const sounds = {
    // The shot: a chunky low "thock" (a .45 at 9 rounds a second, a beat slower than the Machine Gun's): a crack, a
    // round thump, a square chug under it and the bolt's clack a hair after; short and tight (0.3 s) so the shots
    // don't smear at 111 ms apart.
    tommy_shoot: {
      len: 0.3,
      make: shot({
        len: 0.3,
        crack: [700, 4600, 0.02],
        thump: [150, 55, 0.035, 1.0],
        extra: (b, r) => {
          add(b, env(biquad(sweep(0.09, 240, 115, 0.03, 'square'), 'lowpass', 1300), 0.026), 0, 0.22)
          add(b, env(ring(0.1, [2300, 3700, 5200], 0.012, r), 0.014), 0.012, 0.22)
        },
        tail: 0.08,
        room: 0.5,
        mix: 0.16,
        drive: 1.6
      })
    },
    // The drum comes out (reload p 0.155): the latch clicks, the drum slides out along its rail (a scrape falling in
    // pitch over ~0.2 s), the hollow can rings and the rounds rattle as it leaves the rail.
    tommy_mag_out: {
      len: 0.48,
      make: r => {
        const b = buf(0.48)
        add(b, click(r, 3, 1800), 0, 1)
        add(b, env(ring(0.2, [1500, 3100], 0.025, r), 0.03), 0, 0.3)
        add(b, env(biquad(noise(0.3, r), 'bandpass', t => 3600 - 6000 * t, 1.4), 0.12, 0.02), 0.02, 0.55)
        add(b, env(ring(0.35, [420, 1150, 2350], 0.09, r), 0.1), 0.19, 0.45)
        add(b, click(r, 3, 1200), 0.19, 0.7)
        rattle(b, r, 0.2, 0.36, 6, 0.35)
        return master(reverb(b, 0.4, 0.5, 0.14), -3)
      }
    },
    // The new drum (reload p 0.555, where it seats): a short slide, the solid clack of the seat, the palm slap a beat
    // later (a dull thud: the frames' slap peaks 1 tick after the seat) and the can ringing.
    tommy_mag_in: {
      len: 0.42,
      make: r => {
        const b = buf(0.42)
        add(b, env(biquad(noise(0.08, r), 'bandpass', t => 1800 + 20000 * t, 1.3), 0.025, 0.01), 0, 0.35)
        add(b, click(r, 2, 2000), 0.02, 1)
        add(b, env(sweep(0.2, 150, 100, 0.04), 0.035), 0.02, 0.7)
        add(b, env(ring(0.3, [460, 1300, 2600, 4100], 0.07, r), 0.08), 0.02, 0.35)
        // The slap: a palm on the drum's side, low and padded.
        add(b, env(biquad(noise(0.12, r), 'lowpass', 900), 0.025, 0.002), 0.07, 0.9)
        add(b, env(sweep(0.15, 120, 70, 0.03), 0.04), 0.07, 0.8)
        rattle(b, r, 0.075, 0.16, 3, 0.25)
        return master(reverb(b, 0.4, 0.5, 0.12), -2)
      }
    },
    // The top knob racked (reload p 0.736; the draw has its own copy): pulled back (a scrape and a click as it catches)
    // and let go 0.13 s later (a heavy clunk with a ring: the frames' release at p 0.77-0.785).
    tommy_bolt: {
      len: 0.4,
      make: r => {
        const b = buf(0.4)
        add(b, env(biquad(noise(0.06, r), 'bandpass', 3000, 1.5), 0.02, 0.01), 0, 0.4)
        add(b, click(r, 2, 2400), 0.03, 1)
        add(b, env(ring(0.15, [1700, 3600], 0.025, r), 0.03), 0.03, 0.3)
        add(b, click(r, 3, 1500), 0.13, 1)
        add(b, env(sweep(0.15, 180, 110, 0.03), 0.03), 0.13, 0.6)
        add(b, env(ring(0.25, [1100, 2450, 4000], 0.05, r), 0.06), 0.13, 0.45)
        return master(reverb(b, 0.4, 0.5, 0.1), -2)
      }
    },
    // The draw (on equip; tools\guns\tommy.js draws it over 22 ticks = 1.1 s): the gun swung up (a cloth whoosh), a
    // handling tap as it levels (0.26 s), then the knob racked with the frames: back against its stop at 0.66 s (the
    // pull, p 0.55-0.62), let go and home at 0.82 s (p 0.72-0.75).
    tommy_draw: {
      len: 1.05,
      make: r => {
        const b = buf(1.05)
        add(b, env(biquad(noise(0.35, r), 'bandpass', t => 700 + 3000 * t, 0.9), 0.09, 0.04), 0, 0.6)
        add(b, env(biquad(noise(0.1, r), 'lowpass', 700), 0.03, 0.004), 0.26, 0.45)
        add(b, click(r, 2, 2600), 0.27, 0.35)
        add(b, env(biquad(noise(0.06, r), 'bandpass', 3000, 1.5), 0.02, 0.01), 0.62, 0.35)
        add(b, click(r, 2, 2400), 0.66, 0.9)
        add(b, env(ring(0.15, [1700, 3600], 0.025, r), 0.03), 0.66, 0.25)
        add(b, click(r, 3, 1500), 0.82, 0.95)
        add(b, env(sweep(0.15, 180, 110, 0.03), 0.03), 0.82, 0.5)
        add(b, env(ring(0.22, [1100, 2450, 4000], 0.05, r), 0.06), 0.82, 0.4)
        return master(reverb(b, 0.4, 0.5, 0.1), -4)
      }
    }
  }
  const events = {
    'tommy.shoot': ['tommy_shoot', 3],
    'tommy.mag_out': ['tommy_mag_out'],
    'tommy.mag_in': ['tommy_mag_in'],
    'tommy.bolt': ['tommy_bolt'],
    'tommy.draw': ['tommy_draw']
  }
  return { sounds, events }
}
