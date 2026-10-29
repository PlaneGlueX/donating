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
  },
  evidence: {
    level: 30, piles: 5,
    door: [1009.5, 65, 455.5], yaw: 0, inside: [1009.5, 65, 465.5],
    take: { stand: [1010.5, 65, 471.5], aim: [1010.5, 66, 470.5], pile: 3, name: 'the fines drawer (no gate)' },
    hitboxes: [{ stand: [980.5, 65, 510.5], gate: 1, name: "the sergeant's safe G1" }, { stand: [1010.5, 57, 474.5], gate: 2, name: 'the cage door G2' }]
  },
  mansion: {
    level: 60, piles: 13,
    door: [1250.5, 91, 616.5], yaw: 0, inside: [1250.5, 91, 625.5],
    take: { stand: [1276.5, 91, 631.5], aim: [1278.5, 92, 631.5], pile: 8, name: 'the silverware (no gate)' },
    hitboxes: [{ stand: [1229.5, 91, 649.5], gate: 1, name: 'the code door G1' }, { stand: [1230.5, 91, 657.5], gate: 2, name: 'the vault door G2' },
      { stand: [1275.5, 98, 640.5], gate: 7, name: 'the master safe G7' }]
  }
}

module.exports = run(HEISTS, 'IronBot')
