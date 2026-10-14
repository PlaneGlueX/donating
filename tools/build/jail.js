// The Jailbreak prison (2026-10-14): the five modules in tools/build/jail/ run into one Build, M1 first (jail-spec 9.1).
//   node tools/build/jail.js            -> counts only
//   node tools/build/jail.js paste      -> pastes it into the jailbreak world
// Also a build.js for tools/build/render.js. Later modules win where two set the same block (none should).
const { Build, place } = require('./mcstruct')
const MODULES = ['outdoors', 'mainbuilding', 'cellblock', 'mainrooms', 'buildings']

function build () {
  const b = new Build()
  for (const m of MODULES) require(`./jail/${m}.js`)(b)
  return b
}
const labels = () => MODULES.flatMap(m => require(`./jail/${m}.js`).labels || [])
const points = () => Object.assign({}, ...MODULES.map(m => require(`./jail/${m}.js`).points || {}))

module.exports = { build, labels, points }

if (require.main === module) {
  const b = build()
  console.log(`${b.blocks.size} blocks`, JSON.stringify(b.bounds()))
  if (process.argv[2] === 'paste') place(b, { name: 'jail' }).catch(e => { console.error(e.message); process.exit(1) })
}
