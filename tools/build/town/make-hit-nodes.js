'use strict'
// Hit contracts' street nodes (hits.sk /dhit node) from the town's GPS street graph (town-gps-paths.txt): the town's nodes
// (z >= 729, past the bridge: not the prison approach or the tunnel) and the links between them. hits.sk refuses a node
// within 6 blocks of a heist or a safe zone, so each node's number is read back from its reply before linking; a link
// whose end was refused is joined across it (a -> refused -> b becomes a -> b) so streets don't break at a shop.
// Usage (over RCON, the server running): tools/node/node.exe tools/build/town/make-hit-nodes.js [--clear]
const fs = require('fs'), path = require('path')
const rcon = require('../../../bots/rcon.js')
const TOWN_Z = 729
const lines = fs.readFileSync(path.join(__dirname, 'town-gps-paths.txt'), 'utf8').split('\n')
const nodes = new Map(), links = []
for (const l of lines) {
  let m = l.match(/^dphone path addat \S+ ([-\d.]+) ([-\d.]+) ([-\d.]+) id=(\d+)/)
  if (m) { if (+m[3] >= TOWN_Z) nodes.set(m[4], [m[1], m[2], m[3]]); continue }
  m = l.match(/^dphone path link (\d+) (\d+)/)
  if (m) links.push([m[1], m[2]])
}
;(async () => {
  const r = await rcon.connect()
  if (process.argv.includes('--clear')) console.log(await r.cmd('dhit node clear'))
  const num = new Map(), refused = new Set()
  for (const [id, [x, y, z]] of nodes) {
    const out = await r.cmd(`dhit node addat ${x} ${y} ${z}`)
    const m = out.match(/HIT node (\d+) added/)
    if (m) num.set(id, m[1]); else refused.add(id)
    console.log(id, out.trim())
  }
  // Adjacency over the town's nodes, then each kept node links to the kept nodes reached through refused ones.
  const adj = new Map()
  for (const [a, b] of links) {
    if (!nodes.has(a) || !nodes.has(b)) continue
    for (const [p, q] of [[a, b], [b, a]]) { if (!adj.has(p)) adj.set(p, []); adj.get(p).push(q) }
  }
  const done = new Set()
  for (const a of num.keys()) {
    const seen = new Set([a]), stack = [...(adj.get(a) || [])]
    while (stack.length) {
      const b = stack.pop()
      if (seen.has(b)) continue
      seen.add(b)
      if (refused.has(b)) { stack.push(...(adj.get(b) || [])); continue }
      const key = [a, b].sort().join('-')
      if (done.has(key)) continue
      done.add(key)
      console.log(await r.cmd(`dhit node link ${num.get(a)} ${num.get(b)}`).then(s => s.trim()))
    }
  }
  console.log(`nodes ${num.size} (refused ${refused.size}: ${[...refused].join(' ')}), links ${done.size}`)
  r.close ? r.close() : process.exit(0)
  process.exit(0)
})().catch(e => { console.error(e); process.exit(1) })
