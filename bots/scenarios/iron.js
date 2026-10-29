// Ironvale's heists (tools/build/iron/PLAN.md, 2026-10-29), one at a time: `bots/run.js iron <heist>`, with north.js's
// runner (open and armed, the level lock at the front door, in, the open piles into the bag, the gates' hitboxes).
const { run } = require('./north')

const HEISTS = {
  power: {
    level: 25, piles: 6,
    door: [1054.5, 65, 374.5], yaw: 180, inside: [1055.5, 65, 364.5],
    take: { stand: [1061.5, 65, 363.5], aim: [1061.5, 66, 362.5], pile: 6, name: 'the petty cash (no gate)' },
    open: { stand: [1023.5, 65, 324.5], aim: [1022.5, 66, 324.5], pile: 7, name: 'a copper wire reel (no gate)' },
    hitboxes: [{ stand: [1025.5, 65, 363.5], gate: 1, name: 'the payroll safe G1' }, { stand: [1055.5, 65, 329.5], gate: 2, name: 'the cage door G2' }]
  }
}

module.exports = run(HEISTS, 'IronBot')
