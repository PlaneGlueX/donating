// The casino's numbers, from the same tables the game uses. Fails (exit 1) if any game pays back 100% or more, or if the
// pictures and the settings disagree. Usage: tools\node\node.exe tools\casino-sim.js [hands, default 1000000]
//   Slots and the wheel: read from core.sk; roulette's red numbers and pocket order from casino.sk.
//   Blackjack: the exact return of the best play for casino.sk's rules on its endless shoe (every card drawn at random), then
//   a simulation of that play as a check. Rules: dealer stands on all 17s, 3:2, a peek for the dealer's blackjack, double on
//   any two cards, no split, a hit reaching 21 stands.
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const SCRIPTS = path.join(ROOT, 'server', 'plugins', 'Skript', 'scripts')
const core = fs.readFileSync(path.join(SCRIPTS, 'core.sk'), 'utf8')
const casino = fs.readFileSync(path.join(SCRIPTS, 'casino.sk'), 'utf8')
const art = fs.readFileSync(path.join(__dirname, 'casino-art.js'), 'utf8')

const problems = []
const need = (ok, what) => { if (!ok) problems.push(what) }
const pct = x => `${(x * 100).toFixed(3)}%`
const list = key => {
  const m = new RegExp(`\\{-cfg::casino::${key}::\\*\\} to (.*)`).exec(core)
  if (!m) throw new Error(`no casino::${key} in core.sk`)
  return [...m[1].matchAll(/"([^"]*)"/g)].map(x => x[1])
}

// ---- slots: RTP = sum(pays x chance)
const slots = list('slot-table').map(l => { const [name, pays, chance] = l.split('|'); return { name, pays: Number(pays), chance: Number(chance) } })
const slotRtp = slots.reduce((t, r) => t + r.pays * r.chance, 0)
const slotHit = slots.reduce((t, r) => t + r.chance, 0)
console.log(`slots: RTP ${pct(slotRtp)}, edge ${pct(1 - slotRtp)}; a win or the bet back ${pct(slotHit)} of spins`)
need(slotRtp < 1, `slots pay back ${pct(slotRtp)}`)
need(slotHit <= 1, `the slot chances add up to ${slotHit}`)

// ---- the wheel: free, so only what a spin is worth; the picture must show the settings' segments in order
const segments = list('wheel-segments')
const WORD = { '1K': 'chips|1000', '2.5K': 'chips|2500', '5K': 'chips|5000', '10K': 'chips|10000', '25K': 'chips|25000', KEY: 'key|common', XP: 'xp|500' }
const picture = [...(/const WHEEL = \[(.*?)\]/.exec(art) || [, ''])[1].matchAll(/'([^']*)'/g)].map(x => WORD[x[1]])
need(segments.length === 20, `${segments.length} wheel segments`)
need(JSON.stringify(picture) === JSON.stringify(segments), `the wheel's picture (casino-art.js) and casino::wheel-segments (core.sk) differ: ${picture.join(', ')}`)
const wheelChips = segments.reduce((t, s) => t + (s.startsWith('chips|') ? Number(s.split('|')[1]) : 0), 0) / segments.length
console.log(`wheel: ${wheelChips} chips a spin on average, plus XP and keys on ${segments.filter(s => !s.startsWith('chips|')).length} of ${segments.length} segments`)

// ---- roulette: 37 pockets
const redLine = /if \{_n\} is (1 or 3 [^:]*):/.exec(casino)
const red = new Set(redLine ? redLine[1].split(' or ').map(Number) : [])
const order = (/loop (0, 32, [^:]*):/.exec(casino) || [, ''])[1].split(/,| and /).map(Number)
const artOrder = (/const ORDER = \[(.*?)\]/.exec(art) || [, ''])[1].split(',').map(Number)
need(red.size === 18, `${red.size} red numbers in casino.sk`)
need(JSON.stringify(order) === JSON.stringify(artOrder), 'the pocket order in casino.sk and casino-art.js differ')
need(new Set(order).size === 37 && order.every(n => n >= 0 && n <= 36), 'the pocket order is not 0..36 once each')
const BETS = { number: [n => n === 7, 36], red: [n => red.has(n), 2], black: [n => n > 0 && !red.has(n), 2], odd: [n => n % 2 === 1, 2], even: [n => n > 0 && n % 2 === 0, 2], low: [n => n >= 1 && n <= 18, 2], high: [n => n >= 19, 2], dozen: [n => n >= 1 && n <= 12, 3], column: [n => n > 0 && n % 3 === 1, 3] }
for (const [name, [wins, pays]] of Object.entries(BETS)) {
  let rtp = 0
  for (let n = 0; n <= 36; n++) if (wins(n)) rtp += pays / 37
  need(rtp < 1, `roulette's ${name} bet pays back ${pct(rtp)}`)
  if (name === 'red') console.log(`roulette: RTP ${pct(rtp)} on every bet, edge ${pct(1 - rtp)}`)
}

// ---- the Inside Track: six weights 1..10, each horse 4%..40%, pays floor(10 x (1 - edge) / chance) / 10; casino.sk's trackRoll
const edge = Number((/\{-cfg::casino::track-edge\} to ([\d.]+)/.exec(core) || [])[1])
need(edge > 0 && edge < 1, `casino::track-edge is ${edge}`)
{
  let races = 0, sum = 0, worst = 0, longest = 0
  for (let i = 0; i < 20000; i++) {
    const w = Array.from({ length: 6 }, () => 1 + Math.random() * 9), total = w.reduce((a, b) => a + b, 0)
    const chance = w.map(v => v / total)
    if (chance.some(c => c < 0.04 || c > 0.4)) continue
    races++
    for (const c of chance) {
      const pays = Math.floor(10 * (1 - edge) / c) / 10, rtp = c * pays
      sum += rtp; worst = Math.max(worst, rtp); longest = Math.max(longest, pays)
    }
  }
  console.log(`inside track: RTP ${pct(sum / races / 6)} on average, ${pct(worst)} at most, the longest odds ${longest}x; ${pct(races / 20000)} of draws pass the 4%..40% rule`)
  need(worst < 1, `a horse pays back ${pct(worst)}`)
  need(races / 20000 > 0.1, 'too few draws pass the rule: trackRoll would often fall back to equal chances')
}

// ---- blackjack: exact for the endless shoe. A card is 1 (ace) to 10; a ten is 4 of 13.
const P = c => (c === 10 ? 4 : 1) / 13
const CARDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const add = (t, soft, c) => {
  let total = t, aces = soft ? 1 : 0
  if (c === 1) { total += 11; aces++ } else total += c
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return [total, aces > 0]
}
// The dealer's end totals from a hand. S17: any 17 or more stands.
const dealerMemo = new Map()
function dealerFrom (t, soft) {
  const k = `${t},${soft}`
  if (dealerMemo.has(k)) return dealerMemo.get(k)
  const out = { 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, bust: 0 }
  if (t >= 17) { out[t > 21 ? 'bust' : t] = 1; dealerMemo.set(k, out); return out }
  for (const c of CARDS) {
    const [nt, ns] = add(t, soft, c), r = dealerFrom(nt, ns)
    for (const e of Object.keys(out)) out[e] += P(c) * r[e]
  }
  dealerMemo.set(k, out)
  return out
}
// Given the upcard and no dealer blackjack (the deal has already peeked): the hole card's chances exclude the blackjack.
const dealerEnd = {}
const noBj = {}
for (const u of CARDS) {
  const bad = c => (u === 1 && c === 10) || (u === 10 && c === 1)
  const live = CARDS.reduce((t, c) => t + (bad(c) ? 0 : P(c)), 0)
  noBj[u] = live
  const out = { 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, bust: 0 }
  for (const c of CARDS) {
    if (bad(c)) continue
    const [t, s] = add(...add(0, false, u), c), r = dealerFrom(t, s)
    for (const e of Object.keys(out)) out[e] += P(c) / live * r[e]
  }
  dealerEnd[u] = out
}
const standEv = (you, u) => {
  const d = dealerEnd[u]
  let ev = d.bust
  for (const e of [17, 18, 19, 20, 21]) ev += d[e] * (you > e ? 1 : you === e ? 0 : -1)
  return ev
}
const memo = new Map()
// The value of a hand that may hit: the best of stand and hit. 21 and over are decided already.
function bestNoDouble (t, soft, u) {
  if (t > 21) return -1
  if (t === 21) return standEv(21, u)
  const k = `${t},${soft},${u}`
  if (memo.has(k)) return memo.get(k)
  let hit = 0
  for (const c of CARDS) { const [nt, ns] = add(t, soft, c); hit += P(c) * bestNoDouble(nt, ns, u) }
  const v = Math.max(standEv(t, u), hit)
  memo.set(k, v)
  return v
}
const hitEv = (t, soft, u) => { let ev = 0; for (const c of CARDS) { const [nt, ns] = add(t, soft, c); ev += P(c) * bestNoDouble(nt, ns, u) } return ev }
const doubleEv = (t, soft, u) => { let ev = 0; for (const c of CARDS) { const [nt] = add(t, soft, c); ev += P(c) * (nt > 21 ? -2 : 2 * standEv(nt, u)) } return ev }
const choice = (t, soft, u, first) => {
  const st = standEv(t, u), hi = hitEv(t, soft, u), du = first ? doubleEv(t, soft, u) : -9
  return du >= st && du >= hi ? 'double' : hi > st ? 'hit' : 'stand'
}
let bjEv = 0
for (const a of CARDS) for (const b of CARDS) for (const u of CARDS) {
  const [t, s] = add(...add(0, false, a), b)
  const natural = t === 21
  const pHand = P(a) * P(b) * P(u)
  const dealerBj = 1 - noBj[u]
  if (natural) { bjEv += pHand * (1 - dealerBj) * 1.5; continue } // a push against the dealer's blackjack
  bjEv += pHand * (dealerBj * -1 + noBj[u] * Math.max(standEv(t, u), hitEv(t, s, u), doubleEv(t, s, u)))
}
console.log(`blackjack: exact RTP ${pct(1 + bjEv)}, edge ${pct(-bjEv)} with the best play`)
need(1 + bjEv < 1, `blackjack pays back ${pct(1 + bjEv)}`)

// The same game played out, the same order the script deals in, as a check of the sums above.
const card = () => { const r = Math.floor(Math.random() * 13) + 1; return r > 10 ? 10 : r }
const HANDS = Number(process.argv[2]) || 1000000
let won = 0, staked = 0
for (let i = 0; i < HANDS; i++) {
  const c1 = card(), up = card(), c2 = card(), hole = card()
  let [t, s] = add(...add(0, false, c1), c2)
  const [dt0, ds0] = add(...add(0, false, up), hole)
  staked += 1
  if (t === 21) { won += dt0 === 21 ? 0 : 1.5; continue }
  if (dt0 === 21) { won -= 1; continue }
  let stake = 1, first = true
  for (;;) {
    if (t >= 21) break
    const c = choice(t, s, up, first)
    if (c === 'stand') break
    if (c === 'double') { stake = 2; staked += 1; [t, s] = add(t, s, card()); break }
    ;[t, s] = add(t, s, card())
    first = false
  }
  if (t > 21) { won -= stake; continue }
  let dt = dt0, ds = ds0
  while (dt < 17) [dt, ds] = add(dt, ds, card())
  won += stake * (dt > 21 || t > dt ? 1 : t === dt ? 0 : -1)
}
const perHand = won / HANDS
const seWide = 1.15 * 3 / Math.sqrt(HANDS) // about 3 standard errors of a hand's result
console.log(`blackjack: ${HANDS} hands played: ${pct(perHand)} of a first bet per hand (exact ${pct(bjEv)}), ${pct(won / staked)} of all chips staked`)
need(Math.abs(perHand - bjEv) < seWide, `the simulation (${pct(perHand)}) and the exact sum (${pct(bjEv)}) disagree`)

if (problems.length) {
  console.error(`FAILED:\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log('OK: every game keeps an edge, the wheel\'s picture and pockets match the game')
