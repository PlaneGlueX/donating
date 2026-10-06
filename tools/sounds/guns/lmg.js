// The Veteran's sounds (2026-10-06; weapons\light_machine_guns\MG34.yml, tools\guns\lmg.js): a Bren-style light machine
// gun in Pixel Gun 3D's punchy arcade style, synthesized from scratch like the rest (make-gun-sounds.js: seeded noise,
// filters, swept thumps, clicks, metal rings, a small room); no recording is sampled. Each sound is timed to the frames
// it goes with (the weapon file's delayBeforePlay puts its start on the frame; the frames' clock is 80 ticks with rounds
// left and 96 from empty, so the gaps inside a sound are set for the 88 in between: see each line).
//   shoot    3 variants: heavier and deeper than the Brave Patriot's (a .303 at 9 rounds a second): a crack, a low
//            round boom, a square bark under it, the action's clank a hair after and a short room; 0.34 s, so 111 ms
//            apart the next shot lands on the tail, not the body
//   mag_out  (reload p 0.13) the catch clicks, the magazine rocks forward off its front lip (a creak and a scrape; it
//            comes free 0.13 s later: p 0.16) and is lifted away (the rounds rattle, the hollow box rings)
//   mag_in   (reload p 0.555) the front lip hooks into the well (a light clack), the magazine rocks back and latches
//            0.2 s later (a solid clack and a thump: p 0.6), the palm slap on top 0.37 s after the start (p 0.64)
//   charge   (reload p 0.72; the draw's own copy is inside draw) the cocking handle pulled back (a click and a scrape,
//            catching at the back 0.22 s later: p 0.77), let go 0.40 s after the start (p 0.81): the heavy bolt slams home
//   draw     (on equip; tools\guns\lmg.js draws it over 40 ticks = 2.0 s) the heavy gun swung up (a cloth and sling
//            whoosh), its weight settling at 0.84 s (p 0.42: a dull thunk and the bipod legs' rattle), the magazine lifted
//            a hair at 1.2 s and pressed home at 1.29 s (p 0.6, 0.645), the handle unlatched at 1.4 s, caught at the back
//            at 1.52 s and let go at 1.62 s (p 0.7, 0.76, 0.81)
module.exports = ({ buf, add, biquad, noise, env, sweep, ring, click, reverb, softclip, master, shot }) => {
  // A rattle: n tiny clicks spread over [t0, t1] s (the rounds shifting in the box, the bipod's legs).
  const rattle = (b, r, t0, t1, n, gain, hp = 2500) => {
    for (let k = 0; k < n; k++) {
      const t = t0 + (t1 - t0) * (k + r()) / n
      add(b, click(r, 1 + r() * 1.5, hp + r() * 2500), t, gain * (0.5 + r() * 0.5))
    }
  }
  // A scrape: band-passed noise sweeping from f0 to f1 over len seconds.
  const scrape = (r, len, f0, f1, tau, q = 1.3) => env(biquad(noise(len, r), 'bandpass', t => f0 + (f1 - f0) * Math.min(1, t / len), q), tau, 0.008)
  // The heavy bolt slamming home: a bright clack, a ring and some body.
  const slam = (b, r, at, gain = 1) => {
    add(b, click(r, 3, 1400), at, gain)
    add(b, env(ring(0.3, [980, 2150, 3700, 5200], 0.07, r), 0.08), at, 0.5 * gain)
    add(b, env(sweep(0.18, 170, 90, 0.035), 0.04), at, 0.9 * gain)
  }
  const sounds = {
    lmg_shoot: {
      len: 0.34,
      make: shot({
        len: 0.34,
        crack: [450, 4000, 0.024],
        thump: [112, 40, 0.05, 1.08],
        extra: (b, r) => {
          add(b, env(biquad(sweep(0.12, 190, 88, 0.04, 'square'), 'lowpass', 1000), 0.032), 0, 0.3)
          add(b, env(ring(0.12, [1700, 2900, 4300], 0.014, r), 0.016), 0.016, 0.2)
          add(b, click(r, 2, 1600), 0.018, 0.35)
        },
        tail: 0.12,
        room: 0.6,
        mix: 0.18,
        drive: 1.8
      })
    },
    lmg_mag_out: {
      len: 0.55,
      make: r => {
        const b = buf(0.55)
        add(b, click(r, 3, 1800), 0, 1) // the catch
        add(b, env(ring(0.15, [1400, 2900], 0.025, r), 0.03), 0, 0.3)
        add(b, scrape(r, 0.14, 2200, 900, 0.06, 1.1), 0.03, 0.5) // rocking forward off the lip
        add(b, click(r, 2, 1200), 0.13, 0.6) // it comes free
        add(b, env(ring(0.35, [520, 1240, 2480], 0.08, r), 0.09), 0.13, 0.4) // the hollow box rings
        add(b, scrape(r, 0.18, 1500, 4200, 0.07), 0.16, 0.35) // lifted up and away
        rattle(b, r, 0.16, 0.4, 7, 0.32)
        return master(reverb(b, 0.45, 0.5, 0.14), -3)
      }
    },
    lmg_mag_in: {
      len: 0.62,
      make: r => {
        const b = buf(0.62)
        add(b, scrape(r, 0.06, 3200, 1800, 0.025), 0, 0.35)
        add(b, click(r, 2, 2400), 0.02, 0.7) // the front lip hooks
        add(b, env(ring(0.15, [1600, 3300], 0.025, r), 0.03), 0.02, 0.2)
        add(b, scrape(r, 0.12, 1200, 2600, 0.05, 1.1), 0.07, 0.3) // rocked back
        add(b, click(r, 3, 1700), 0.2, 1) // latched
        add(b, env(sweep(0.2, 140, 90, 0.04), 0.04), 0.2, 0.85)
        add(b, env(ring(0.3, [540, 1300, 2600, 4100], 0.07, r), 0.08), 0.2, 0.35)
        rattle(b, r, 0.205, 0.3, 3, 0.25)
        // The slap: a palm on the magazine's top, low and padded.
        add(b, env(biquad(noise(0.12, r), 'lowpass', 900), 0.025, 0.002), 0.37, 0.9)
        add(b, env(sweep(0.15, 115, 68, 0.03), 0.04), 0.37, 0.8)
        return master(reverb(b, 0.45, 0.5, 0.12), -2)
      }
    },
    lmg_charge: {
      len: 0.7,
      make: r => {
        const b = buf(0.7)
        add(b, click(r, 3, 2000), 0, 1.2) // the handle unlatched
        add(b, scrape(r, 0.2, 1800, 4400, 0.08, 1.4), 0.01, 0.75) // pulled back along the slot
        add(b, click(r, 2, 1600), 0.22, 0.9) // caught at the back
        add(b, env(ring(0.15, [1500, 3200], 0.025, r), 0.03), 0.22, 0.25)
        slam(b, r, 0.4) // let go: the bolt slams home
        return master(reverb(b, 0.45, 0.5, 0.14), -1)
      }
    },
    lmg_draw: {
      len: 1.85,
      make: r => {
        const b = buf(1.85)
        add(b, env(biquad(noise(0.7, r), 'bandpass', t => 500 + 2600 * Math.min(1, t / 0.7), 0.8), 0.18, 0.08), 0, 0.65) // the swing up
        add(b, click(r, 2, 2800), 0.3, 0.3) // a sling swivel
        add(b, env(biquad(noise(0.14, r), 'lowpass', 600), 0.04, 0.004), 0.84, 0.7) // the weight settles
        add(b, env(sweep(0.2, 120, 70, 0.04), 0.05), 0.84, 0.6)
        rattle(b, r, 0.85, 0.98, 4, 0.3, 1800) // the bipod's legs
        add(b, click(r, 2, 2200), 1.2, 0.45) // the magazine lifted a hair
        add(b, click(r, 3, 1700), 1.29, 0.9) // and pressed home
        add(b, env(ring(0.2, [540, 1300, 2600], 0.05, r), 0.06), 1.29, 0.3)
        add(b, click(r, 3, 2000), 1.4, 0.9) // the handle unlatched
        add(b, scrape(r, 0.08, 1800, 4400, 0.03, 1.4), 1.4, 0.6) // pulled back
        add(b, click(r, 2, 1600), 1.52, 0.8) // caught at the back
        slam(b, r, 1.62, 0.9) // let go
        return master(reverb(b, 0.45, 0.5, 0.12), -4)
      }
    }
  }
  const events = {
    'lmg.shoot': ['lmg_shoot', 3],
    'lmg.mag_out': ['lmg_mag_out'],
    'lmg.mag_in': ['lmg_mag_in'],
    'lmg.charge': ['lmg_charge'],
    'lmg.draw': ['lmg_draw']
  }
  return { sounds, events }
}
