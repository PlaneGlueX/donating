// The mock's choreography per gun (gun-space anchors; p = the reload clock's share done). See CHOREO.md.
const { place } = require('./wrap.js').util
const X = [1, 0, 0]; const Z = [0, 0, 1]
const between = (p, a, b) => p !== null && p >= a && p < b
const ramp = (p, a, b) => p <= a ? 0 : p >= b ? 1 : (t => t * t * (3 - 2 * t))((p - a) / (b - a))
module.exports = {
  ak47: {
    G: [17.6, 5.0, 8], rake: 20, armR: [0.5, -0.6, -0.62], grip: { f: -1.1, b: 1.15, hz: 1.0 },
    // the magazine pose 6 higher and 2 toward the middle than the module's (its swap was under the screen's edge)
    lift: p => place([0, 3 * ramp(p, 0, 0.1) * (1 - ramp(p, 0.58, 0.72)) + 2 * ramp(p, 0.58, 0.72) * (1 - ramp(p, 0.86, 0.98)), 0.5 * ramp(p, 0, 0.1) * (1 - ramp(p, 0.58, 0.72))]),
    left: (p, reload) => {
      if (!reload || p === null) return null
      // under the magazine's floor (palm up, thumb up its left side): pulls it out, brings the new one, slaps it
      if (between(p, 0.08, 0.32) || between(p, 0.40, 0.62)) return { follow: 'mag', at: place([12.5, -3.4, 8], [[X, 90], [Z, -18]]) }
      // on the charging handle (the gun rolled so the right side faces you): pull and let go
      if (between(p, 0.70, 0.80)) return { follow: 'bolt', at: place([13.1, 9.0, 5.6], [[X, -90]]) }
      return null
    }
  },
  gs50: {
    G: [12.3, 7.4, 8], rake: 15, armR: [0.5, -0.6, -0.62], grip: { f: -2.05, b: 1.7, hz: 1.25 },
    // the reload brings the gun up 4.5 so the grip's bottom (and the hand) are on the screen
    lift: p => place([0, 7 * ramp(p, 0, 0.12) * (1 - ramp(p, 0.82, 1)), 1.5 * ramp(p, 0, 0.12) * (1 - ramp(p, 0.82, 1))]),
    left: (p, reload) => {
      if (!reload || p === null) return null
      if (between(p, 0.46, 0.82)) return { follow: 'mag', at: place([14.0, -0.3, 8.0], [[X, 90], [Z, 15]]) }
      return null
    }
  },
  r90: {
    G: [17.5, 7.0, 8], rake: 22, armR: [0.5, -0.6, -0.62], grip: { f: -1.5, b: 1.5, hz: 1.25 },
    // the shell pose 4 higher and 1.5 toward the middle (the hand under the port was under the screen's edge)
    lift: p => place([0, 4, 1.5]),
    left: (p, reload, num) => {
      // the thumb behind the shell's brass base, pushing it up into the loading port
      if (reload) return p === null ? null : { follow: 'shell', at: place([19.0, 8.25, 9.1], [[X, 90]]) }
      // the reload's closing pump (the shot frames' pump stand in for it in the mock): palm up under the pump
      if (p !== null && num === 14 && between(p, 0.3, 0.9)) return { follow: 'pump', at: place([6.6, 5.25, 8], [[X, 90]]) }
      return null
    }
  }
}
