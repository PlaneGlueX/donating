// Rising City's three heists (tools/build/city/PLAN.md, 2026-11-04), one at a time: `bots/run.js city <heist>`, with
// north.js's runner. Covers PLAN section 12's tests: (a) a smash gate with no pile behind it as the entry (jewelry G1),
// (b) register piles in a non-store heist (bank tills), (c) iron bars as a safe gate (bank and casino G6), and the
// staff stair stopping a robber under the level at y 71.
const { run } = require('./north')

const HEISTS = {
  jewelry: {
    level: 5, piles: 13,
    door: [608.5, 65, 417.5], yaw: 180, inside: [608.5, 65, 400.5],
    entry: { stand: [606.5, 65, 413.5], aim: [606.5, 66, 411.5], gate: 1 },
    smash: { stand: [608.5, 65, 384.5], aim: [608.5, 66, 383.5], gate: 2 },
    take: { stand: [608.5, 65, 384.5], aim: [608.5, 65.5, 382.5], pile: 11 },
    open: { stand: [613.5, 73, 407.5], aim: [615.5, 73.5, 407.5], pile: 18, name: 'the loose gems (no gate)' },
    hitboxes: [{ stand: [615.5, 58, 406.5], gate: 9, name: 'the workshop safe G9' }, { stand: [615.5, 87, 403.5], gate: 10, name: 'the office safe G10' }]
  },
  bank: {
    level: 20, piles: 12,
    door: [637.5, 65, 299.5], yaw: 90, inside: [620.5, 65, 299.5],
    smash: { stand: [605.5, 65, 299.5], aim: [603.5, 66, 299.5], gate: 1 },
    take: { stand: [602.5, 65, 298.5], aim: [600.5, 65.5, 298.5], pile: 8, name: 'a register till behind the screen' },
    hitboxes: [{ stand: [601.5, 70, 286.5], gate: 2, name: "the manager's safe G2" }, { stand: [600.5, 65, 314.5], gate: 3, name: 'the security gate G3' },
      { stand: [612.5, 49, 300.5], gate: 4, name: 'the vault door G4' }, { stand: [623.5, 49, 305.5], gate: 5, name: 'Box 167 G5' },
      { stand: [624.5, 49, 301.5], gate: 6, name: 'the iron-bar Reserve cage G6' }, { stand: [597.5, 49, 299.5], gate: 7, name: 'the alternate exit G7' }]
  },
  casino: {
    level: 45, piles: 13,
    door: [845.5, 73, 345.5], yaw: 180, inside: [845.5, 65, 335.5],
    smash: { stand: [870.5, 65, 341.5], aim: [870.5, 66, 343.5], gate: 2 },
    take: { stand: [868.5, 65, 344.5], aim: [868.5, 65.5, 346.5], pile: 9, name: 'a cash cart behind the glass' },
    open: { stand: [856.5, 65, 344.5], aim: [856.5, 65.5, 346.5], pile: 8, name: 'the seized cash (no gate)' },
    hitboxes: [{ stand: [846.5, 65, 334.5], gate: 1, name: 'the staff door G1' }, { stand: [889.5, 65, 348.5], gate: 3, name: "the manager's safe G3" },
      { stand: [869.5, 57, 350.5], gate: 4, name: 'the deposit shutter G4' }, { stand: [863.5, 57, 354.5], gate: 5, name: 'the vault door G5' },
      { stand: [869.5, 57, 358.5], gate: 6, name: 'the iron-bar daily cage G6' }, { stand: [868.5, 65, 332.5], gate: 7, name: 'the drain hatch G7' }]
  }
}

module.exports = run(HEISTS, 'CityBot')
