// The Old Revolver's sounds (WeaponMechanics 357_Magnum; 2026-10-06), in the same arcade style as the first four
// guns (tools\sounds\make-gun-sounds.js): synthesized from seeded noise, filters, sweeps, clicks and metal rings;
// nothing recorded. Events donating.gun.rev.<what>, played by weapons\pistols\357_Magnum.yml:
//   shoot (2 variants): a big western bang: a bright crack, a deep thump, the cylinder gap's metal ring, a long room;
//   cock: the hammer drawn back after each shot (Shoot.Mechanics, 4 ticks after it): a ratchet click and a clack;
//   open: the crane unlatched and swung out (reload, tick 4): a latch click and a swish of the cylinder;
//   eject: the ejector rod pushed (tick 11): a slide and a clunk, then six cases tinkling on the ground;
//   load: the speedloader (tick 22): the rounds sliding in and the knob twisted (a click);
//   close: the cylinder snapped shut (tick 30): a hard snap, then the cylinder's ratchet spinning down;
//   spin: the draw's twirl (Weapon_Equip_Mechanics): a whoosh round and round, caught with a click.
module.exports = ({ SR, buf, add, biquad, noise, env, sweep, ring, click, reverb, softclip, master, shot }) => {
  // A spinning whoosh: band-passed noise whose loudness rises and falls once per turn.
  const whoosh = (len, turns, r, lo = 700, hi = 2600) => {
    const b = biquad(noise(len, r), 'bandpass', t => lo + (hi - lo) * (0.5 + 0.5 * Math.sin(2 * Math.PI * turns * t / len)), 0.9)
    for (let i = 0; i < b.length; i++) {
      const t = i / SR
      const turn = Math.pow(0.5 - 0.5 * Math.cos(2 * Math.PI * turns * t / len), 2)
      b[i] *= turn * Math.min(1, t / 0.03) * Math.min(1, (len - t) / 0.05)
    }
    return b
  }
  // A brass case hitting the ground: a short bright ring with a tick.
  const tink = (r, f) => {
    const b = buf(0.18)
    add(b, click(r, 1, 3500), 0, 0.6)
    add(b, env(ring(0.18, [f, f * 2.76, f * 5.4], 0.035, r), 0.05), 0, 0.7)
    return b
  }
  // A ratchet: n clicks, each a little further apart and quieter (the cylinder spinning down).
  const ratchet = (b, r, at, n, gap0, grow, gain) => {
    let t = at
    let g = gain
    for (let k = 0; k < n; k++) {
      add(b, click(r, 1.5, 2400), t, g)
      add(b, env(ring(0.06, [2300 + 300 * r(), 4700], 0.012, r), 0.015), t, g * 0.35)
      t += gap0 * Math.pow(grow, k)
      g *= 0.86
    }
    return b
  }
  return {
    sounds: {
      // The bang: the crack and a deep thump (deeper and longer than the Classic Pistol's), a ringing "tang" of the
      // cylinder gap, a short square chirp for the arcade feel, a long tail.
      rev_shoot: {
        len: 0.85,
        make: shot({
          len: 0.85, crack: [900, 6500, 0.035], thump: [180, 48, 0.065, 1.05], tail: 0.3, room: 0.9, mix: 0.27, drive: 2.0,
          extra: (b, r) => {
            add(b, env(ring(0.5, [1650, 2480, 3900, 5300], 0.09, r), 0.11, 0.002), 0.003, 0.16)
            add(b, env(biquad(sweep(0.1, 900, 260, 0.03, 'square'), 'lowpass', 2400), 0.035), 0, 0.14)
          }
        })
      },
      // The hammer: a light click as the thumb starts, the cylinder's ratchet, the sear's clack at full cock.
      rev_cock: {
        len: 0.28,
        make: r => {
          const b = buf(0.28)
          add(b, click(r, 1.5, 3000), 0, 0.45)
          add(b, click(r, 1.5, 2600), 0.035, 0.35)
          add(b, click(r, 2.5, 1600), 0.085, 1)
          add(b, env(ring(0.2, [1900, 3400, 5600], 0.03, r), 0.04), 0.085, 0.45)
          add(b, env(sweep(0.08, 260, 180, 0.02), 0.02), 0.085, 0.3)
          return master(reverb(b, 0.35, 0.5, 0.1), -3)
        }
      },
      // The crane: the latch clicks, the cylinder swings out (a swish) and stops (a soft knock).
      rev_open: {
        len: 0.36,
        make: r => {
          const b = buf(0.36)
          add(b, click(r, 2, 2200), 0, 1)
          add(b, env(ring(0.15, [2100, 4200], 0.025, r), 0.03), 0, 0.3)
          add(b, env(biquad(noise(0.2, r), 'bandpass', t => 1200 + 9000 * t, 1.1), 0.05, 0.03), 0.03, 0.4)
          add(b, env(sweep(0.12, 190, 120, 0.03), 0.03), 0.13, 0.5)
          add(b, click(r, 2, 1500), 0.13, 0.6)
          return master(reverb(b, 0.4, 0.5, 0.12), -3)
        }
      },
      // The ejector: a short slide and a clunk, then the six cases land one after another.
      rev_eject: {
        len: 0.95,
        make: r => {
          const b = buf(0.95)
          add(b, env(biquad(noise(0.1, r), 'bandpass', t => 2500 + 12000 * t, 1.3), 0.03, 0.01), 0, 0.5)
          add(b, click(r, 2, 1800), 0.05, 1)
          add(b, env(ring(0.2, [1400, 3100], 0.03, r), 0.04), 0.05, 0.35)
          for (let k = 0; k < 6; k++) add(b, tink(r, 3600 + 1800 * r()), 0.32 + 0.07 * k + 0.04 * r(), 0.55 - 0.04 * k)
          return master(reverb(b, 0.5, 0.45, 0.16), -3)
        }
      },
      // The speedloader: the rounds slide into the chambers (a rough metal slide), a seat, the knob's twist click.
      rev_load: {
        len: 0.4,
        make: r => {
          const b = buf(0.4)
          add(b, env(biquad(noise(0.12, r), 'bandpass', t => 5000 - 20000 * t, 1.2), 0.035, 0.015), 0, 0.5)
          add(b, env(sweep(0.15, 150, 95, 0.04), 0.04), 0.08, 0.8)
          add(b, click(r, 2.5, 1500), 0.08, 0.9)
          add(b, env(ring(0.2, [1200, 2700, 4400], 0.04, r), 0.05), 0.08, 0.35)
          add(b, click(r, 1.5, 3200), 0.2, 0.55)
          add(b, env(ring(0.1, [3600, 6100], 0.015, r), 0.02), 0.2, 0.25)
          return master(reverb(b, 0.4, 0.5, 0.12), -2)
        }
      },
      // The snap: the cylinder slammed home (a hard click and a thump), then its ratchet spinning down.
      rev_close: {
        len: 0.6,
        make: r => {
          const b = buf(0.6)
          add(b, click(r, 2.5, 1700), 0, 1)
          add(b, env(sweep(0.18, 210, 110, 0.035), 0.045), 0, 0.85)
          add(b, env(ring(0.3, [1300, 2900, 4800], 0.06, r), 0.07), 0, 0.45)
          ratchet(b, r, 0.07, 9, 0.022, 1.18, 0.45)
          return master(softclip(reverb(b, 0.45, 0.5, 0.14), 1.2), -1)
        }
      },
      // The twirl: one fast turn of air (one turn in 8 ticks), then the catch (a click and a light knock).
      rev_spin: {
        len: 0.62,
        make: r => {
          const b = buf(0.62)
          add(b, whoosh(0.42, 1, r, 600, 2400), 0, 0.7)
          add(b, whoosh(0.42, 2, r, 1500, 4200), 0, 0.18)
          add(b, click(r, 2, 2200), 0.43, 0.8)
          add(b, env(sweep(0.1, 170, 120, 0.03), 0.025), 0.43, 0.45)
          add(b, env(ring(0.15, [1800, 3700], 0.03, r), 0.035), 0.43, 0.3)
          return master(reverb(b, 0.4, 0.5, 0.12), -4)
        }
      }
    },
    events: {
      'rev.shoot': ['rev_shoot', 2], 'rev.cock': ['rev_cock'], 'rev.open': ['rev_open'], 'rev.eject': ['rev_eject'],
      'rev.load': ['rev_load'], 'rev.close': ['rev_close'], 'rev.spin': ['rev_spin']
    }
  }
}
