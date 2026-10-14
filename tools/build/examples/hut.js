// A tiny example build for tools/build/render.js and mcstruct.js: a brick hut with a door, windows and a stair roof.
const { Build } = require('../mcstruct')
module.exports.build = () => {
  const b = new Build()
  b.fill(0, 64, 0, 8, 64, 6, 'polished_andesite')
  b.walls(0, 65, 0, 8, 68, 6, 'bricks')
  b.fill(4, 65, 0, 4, 66, 0, 'air').set(4, 65, 0, 'oak_door[facing=south,half=lower]').set(4, 66, 0, 'oak_door[facing=south,half=upper]')
  b.set(2, 66, 0, 'glass_pane').set(6, 66, 0, 'glass_pane')
  for (let z = -1; z <= 7; z++) for (let i = 0; i <= 5; i++) { b.set(-1 + i, 69 + i, z, 'spruce_stairs[facing=east]'); b.set(9 - i, 69 + i, z, 'spruce_stairs[facing=west]') }
  return b
}
