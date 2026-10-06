// The Combat Rifle's sounds (2026-10-06; M4A1.yml, tools\guns\m16.js): synthesized in Pixel Gun 3D's punchy arcade
// style like the first four guns' (tools\sounds\make-gun-sounds.js), no recording sampled.
//   shoot    3 very short variants: the rounds of a burst come 2 ticks (0.1 s) apart, so each is a tight crack, a
//            small round thump and a bright metallic snap that has died away before the next round
//   mag_out  the release button's click, the magazine sliding out (Start_Mechanics, tick 6)
//   mag_in   the magazine scraping in, the latch's double click, then the palm slap 0.075 s later (tick 26)
//   charge   the T-handle pulled (a click and a short scrape), let go 0.125 s later (2.5 ticks): the bolt slamming home
//            (tick 35 of the reload, tick 16 of the draw)
//   assist   the forward assist's knock (tick 44)
//   draw     a rustle and a light clink as the gun comes up (the charge follows at tick 16)
module.exports = ({ buf, add, biquad, noise, env, sweep, ring, click, reverb, softclip, master, shot }) => {
  // A scrape: band-passed noise sweeping from f0 to f1 over len seconds.
  const scrape = (r, len, f0, f1, tau, q = 1.3) => env(biquad(noise(len, r), 'bandpass', t => f0 + (f1 - f0) * Math.min(1, t / len), q), tau, 0.008)
  const sounds = {
    m16_shoot: {
      variants: 3,
      len: 0.24,
      make: shot({
        len: 0.24,
        crack: [1000, 6200, 0.015],
        thump: [175, 65, 0.026, 1.0],
        extra: (b, r) => {
          // the snap: a short high ring and a square blip falling 1100 -> 450 Hz (the arcade "tak")
          add(b, env(ring(0.06, [2700 + r() * 200, 4300, 6100], 0.012, r), 0.012), 0, 0.18)
          add(b, env(biquad(sweep(0.05, 1100, 450, 0.015, 'square'), 'lowpass', 3500), 0.014), 0.002, 0.14)
        },
        tail: 0.06,
        room: 0.45,
        mix: 0.12,
        drive: 1.8
      })
    },
    m16_mag_out: {
      len: 0.34,
      make: r => {
        const b = buf(0.34)
        add(b, click(r, 2, 2400), 0, 0.9) // the release button
        add(b, env(ring(0.12, [1900, 3700], 0.02, r), 0.025), 0, 0.2)
        add(b, scrape(r, 0.16, 1800, 4200, 0.06), 0.03, 0.55) // sliding out of the well
        add(b, click(r, 3, 1500), 0.12, 0.5) // it clears the well
        add(b, env(ring(0.2, [1100, 2600, 4400], 0.045, r), 0.05), 0.12, 0.2)
        return master(reverb(b, 0.4, 0.5, 0.12), -3)
      }
    },
    m16_mag_in: {
      len: 0.38,
      make: r => {
        const b = buf(0.38)
        add(b, scrape(r, 0.05, 3500, 1800, 0.02), 0, 0.4) // the last of the slide in
        add(b, click(r, 2, 2000), 0.02, 1) // the latch: two quick clicks
        add(b, click(r, 2, 3600), 0.045, 0.75)
        add(b, env(ring(0.2, [1500, 3200, 5300], 0.05, r), 0.06), 0.045, 0.3)
        add(b, env(sweep(0.16, 150, 95, 0.04), 0.035), 0.075, 0.85) // the palm slap: a dull thump
        add(b, env(biquad(noise(0.08, r), 'lowpass', 1400), 0.015), 0.075, 0.45)
        return master(reverb(b, 0.4, 0.5, 0.12), -2)
      }
    },
    m16_charge: {
      len: 0.46,
      make: r => {
        const b = buf(0.46)
        add(b, click(r, 3, 2200), 0, 1.4) // the T-handle unlatched and pulled
        add(b, scrape(r, 0.07, 2500, 5200, 0.03, 1.6), 0.005, 0.8)
        add(b, click(r, 2, 1800), 0.06, 0.9) // at the back
        add(b, env(ring(0.12, [1700, 3500], 0.02, r), 0.03), 0.06, 0.2)
        // let go at 0.125 s: the bolt slams home, a bright clack, a ring and a little body
        add(b, click(r, 3, 1600), 0.125, 1)
        add(b, env(ring(0.3, [1250, 2650, 4350, 5900], 0.07, r), 0.08), 0.125, 0.5)
        add(b, env(sweep(0.15, 210, 120, 0.03), 0.035), 0.125, 0.8)
        return master(reverb(b, 0.45, 0.5, 0.14), -1)
      }
    },
    m16_assist: {
      len: 0.24,
      make: r => {
        const b = buf(0.24)
        add(b, env(sweep(0.14, 320, 160, 0.03), 0.03), 0, 0.8) // a knock: wood on metal
        add(b, click(r, 3, 900), 0, 0.8)
        add(b, click(r, 2, 2400), 0.012, 0.5)
        add(b, env(ring(0.15, [900, 2100, 3300], 0.03, r), 0.035), 0.004, 0.25)
        return master(reverb(b, 0.35, 0.5, 0.1), -3)
      }
    },
    m16_draw: {
      len: 0.4,
      make: r => {
        const b = buf(0.4)
        add(b, env(biquad(noise(0.34, r), 'bandpass', t => 700 + 2600 * t / 0.34, 0.9), 0.09, 0.04), 0, 0.6) // the rustle
        add(b, click(r, 2, 2800), 0.18, 0.6) // a sling swivel's clink
        add(b, env(ring(0.18, [2300, 4600], 0.035, r), 0.04), 0.18, 0.3)
        add(b, click(r, 2, 2000), 0.26, 0.35)
        return master(b, -5)
      }
    }
  }
  const events = {
    'm16.shoot': ['m16_shoot', 3],
    'm16.mag_out': ['m16_mag_out'],
    'm16.mag_in': ['m16_mag_in'],
    'm16.charge': ['m16_charge'],
    'm16.assist': ['m16_assist'],
    'm16.draw': ['m16_draw']
  }
  return { sounds, events }
}
