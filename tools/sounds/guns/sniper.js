// The Sniper Rifle's sounds (WeaponMechanics AX_50, 2026-10-06), synthesized like the first four guns' (seeded noise,
// filters, sweeps; nothing recorded or sampled), in Pixel Gun 3D's punchy arcade style. Events donating.gun.sniper.*:
//   shoot       a loud crack, a deep boom, a supersonic whip and a long rolling echo (2 variants; AX_50.yml plays it
//               at volume 8, heard 128 blocks away)
//   bolt_open   the Firearm_Action's Open, 6 ticks after it starts (tools\guns\sniper.js: the handle turns up at
//               ticks 6-7.6, the bolt slides back 7.6-9.6): a turn click, a slide, the stop clack at 0.18 s
//   bolt_close  the Close, 4 ticks after it starts (tick 12: the bolt has just come forward; it turns down by 13.6):
//               the forward clack, then the lock click at 0.075 s
//   shell       the spent case landing (Open + 15 ticks): a brass tinkle with two bounces
//   mag_out     the magazine unlatched and pulled out (Reload Start_Mechanics)
//   mag_in      the new one seated: a thump and a double click
//   draw        the rifle shouldered (a rustle), then the bolt checked: open at 1.0 s and close at 1.3 s (the draw's
//               frames work the bolt at ticks 20 and 26)
module.exports = ({ SR, buf, add, biquad, noise, env, sweep, ring, click, reverb, softclip, master, shot }) => {
  // A band of noise swept from f0 to f1 over its length (a slide), with an attack and a decay.
  const slide = (r, len, f0, f1, q = 1.4, tau = 0.08, attack = 0.02) => env(biquad(noise(len, r), 'bandpass', t => f0 + (f1 - f0) * Math.min(1, t / len), q), tau, attack)
  // The bolt's parts, so the draw can reuse them.
  const boltOpen = r => {
    const b = buf(0.42)
    add(b, click(r, 2, 2600), 0.02, 0.8) // the handle turns up
    add(b, env(ring(0.12, [1900, 4200], 0.025, r), 0.03), 0.02, 0.25)
    add(b, slide(r, 0.12, 1600, 4200, 1.3, 0.09, 0.03), 0.07, 0.55) // back along the receiver
    add(b, click(r, 3, 1500), 0.18, 1) // the stop
    add(b, env(sweep(0.12, 170, 110, 0.03), 0.035), 0.18, 0.5)
    add(b, env(ring(0.22, [1250, 2750, 4500], 0.05, r), 0.06), 0.18, 0.4)
    return b
  }
  const boltClose = r => {
    const b = buf(0.4)
    add(b, slide(r, 0.04, 4200, 2000, 1.3, 0.03, 0.01), 0, 0.45) // the last of the push
    add(b, click(r, 3, 1700), 0.015, 1) // forward
    add(b, env(sweep(0.12, 150, 95, 0.03), 0.035), 0.015, 0.55)
    add(b, env(ring(0.2, [1150, 2600, 4300], 0.05, r), 0.06), 0.015, 0.35)
    add(b, click(r, 2, 3000), 0.075, 0.85) // the handle turns down and locks
    add(b, env(ring(0.18, [2100, 3900, 6100], 0.035, r), 0.045), 0.075, 0.3)
    return b
  }
  const sounds = {
    sniper_shoot: {
      len: 1.4,
      make: shot({
        len: 1.4,
        crack: [700, 9000, 0.045],
        thump: [120, 38, 0.11, 1.2],
        extra: (b, r) => {
          // The whip: a short bright square chirp falling fast (the "pew" of PG3D's rifles, sharper).
          add(b, env(biquad(sweep(0.07, 4200, 1100, 0.018, 'square'), 'lowpass', 6500), 0.016), 0, 0.22)
          // A second, lower boom a moment later, and a long echo off far walls.
          add(b, env(sweep(0.4, 70, 34, 0.12), 0.14, 0.01), 0.012, 0.55)
          add(b, env(biquad(biquad(noise(1.2, r), 'lowpass', 900), 'highpass', 90), 0.32, 0.03), 0.16, 0.32)
          add(b, env(biquad(noise(1.0, r), 'lowpass', 500), 0.4, 0.05), 0.38, 0.18)
        },
        tail: 0.5,
        room: 1.25,
        mix: 0.3,
        drive: 2.4
      })
    },
    sniper_bolt_open: { len: 0.42, make: r => master(reverb(boltOpen(r), 0.4, 0.5, 0.1), -2) },
    sniper_bolt_close: { len: 0.4, make: r => master(reverb(boltClose(r), 0.4, 0.5, 0.1), -1.5) },
    sniper_shell: {
      len: 0.45,
      make: r => {
        const b = buf(0.45)
        // Bounces: each a click and a bright brass ring, softer each time.
        ;[[0, 1], [0.13, 0.55], [0.21, 0.3], [0.26, 0.15]].forEach(([at, g]) => {
          add(b, click(r, 1.5, 3500), at, 0.7 * g)
          add(b, env(ring(0.12, [3100 + 200 * r(), 4900, 7300], 0.03, r), 0.035), at, 0.8 * g)
        })
        return master(reverb(b, 0.35, 0.5, 0.08), -5)
      }
    },
    sniper_mag_out: {
      len: 0.36,
      make: r => {
        const b = buf(0.36)
        add(b, click(r, 3, 1600), 0, 1) // the latch
        add(b, env(ring(0.12, [1700, 3300], 0.03, r), 0.035), 0, 0.3)
        add(b, slide(r, 0.2, 2400, 5200, 1.2, 0.08, 0.03), 0.03, 0.5) // drawn out
        add(b, env(ring(0.25, [1000, 2300, 3900], 0.045, r), 0.055), 0.16, 0.25)
        return master(reverb(b, 0.4, 0.5, 0.12), -3)
      }
    },
    sniper_mag_in: {
      len: 0.34,
      make: r => {
        const b = buf(0.34)
        add(b, slide(r, 0.06, 4000, 2200, 1.2, 0.04, 0.015), 0, 0.35)
        add(b, env(sweep(0.2, 150, 95, 0.05), 0.045), 0.05, 0.85) // seated
        add(b, click(r, 2, 1900), 0.05, 1)
        add(b, click(r, 2, 3400), 0.1, 0.75) // the latch catches
        add(b, env(ring(0.22, [1400, 3100, 5000], 0.05, r), 0.06), 0.1, 0.3)
        return master(reverb(b, 0.4, 0.5, 0.12), -2)
      }
    },
    sniper_draw: {
      len: 1.65,
      make: r => {
        const b = buf(1.65)
        // Shouldered: a cloth-and-wood rustle, a light knock as the stock meets the shoulder.
        add(b, env(biquad(noise(0.4, r), 'bandpass', t => 700 + 2200 * t, 0.8), 0.1, 0.05), 0, 0.5)
        add(b, env(sweep(0.15, 120, 80, 0.04), 0.04), 0.62, 0.35)
        add(b, click(r, 3, 900), 0.62, 0.3)
        // The bolt checked.
        add(b, boltOpen(r), 1.0, 0.8)
        add(b, boltClose(r), 1.3, 0.8)
        return master(reverb(b, 0.4, 0.5, 0.1), -4)
      }
    }
  }
  const events = {
    'sniper.shoot': ['sniper_shoot', 2],
    'sniper.bolt_open': ['sniper_bolt_open'],
    'sniper.bolt_close': ['sniper_bolt_close'],
    'sniper.shell': ['sniper_shell'],
    'sniper.mag_out': ['sniper_mag_out'],
    'sniper.mag_in': ['sniper_mag_in'],
    'sniper.draw': ['sniper_draw']
  }
  return { sounds, events }
}
