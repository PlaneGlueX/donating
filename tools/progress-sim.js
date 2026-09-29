// Progression simulator: how long a player takes to reach each level and buy each upgrade, with the numbers in
// core.sk (it reads them, so a change there shows here). A model, not a measurement: the ASSUME block below is what
// it guesses about the map and the players (how many heists, how much of a pool one robber gets, walking time,
// deaths). Change those when the map exists and the beta gives real numbers.
//
// Usage: tools\node\node.exe tools\progress-sim.js [--profile casual|median|grinder] [--days 30] [--runs 40]
//        [--curve current|core] [--solve 150@60] [--json]
//   --curve current  the old T(n) = 6.5 × n × (n + 5) (for comparison)
//   --solve L@H      finds level::first so the median player is level L after H hours played (prints it)
const fs = require('fs')
const path = require('path')

const CORE = path.join(__dirname, '..', 'server', 'plugins', 'Skript', 'scripts', 'core.sk')

// ---------- core.sk's settings ----------
const parseValue = raw => {
  raw = raw.trim()
  const span = raw.match(/^(-?\d+(?:\.\d+)?) (tick|second|minute|hour|day)s?$/)
  if (span) return Number(span[1]) * { tick: 0.05, second: 1, minute: 60, hour: 3600, day: 86400 }[span[2]]
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw.startsWith('"')) {
    const items = [...raw.matchAll(/"((?:[^"]|"")*)"/g)].map(m => m[1])
    return items.length > 1 ? items : items[0]
  }
  if (/^-?\d+(\.\d+)?(, -?\d+(\.\d+)?)*( and -?\d+(\.\d+)?)?$/.test(raw)) return raw.split(/, | and /).map(Number)
  return raw
}
const readCore = () => {
  const cfg = {}
  for (const line of fs.readFileSync(CORE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*set \{-cfg::([^}%]+)\} to (.+?)(\s+#.*)?$/)
    if (m) cfg[m[1].replace(/::\*$/, '')] = parseValue(m[2])
  }
  return cfg
}
const cfg = readCore()
const num = (k, d) => (typeof cfg[k] === 'number' ? cfg[k] : d)
const list = k => (Array.isArray(cfg[k]) ? cfg[k] : cfg[k] === undefined ? [] : [cfg[k]])

// ---------- Assumptions (the model's guesses, not settings) ----------
const PROFILES = {
  // hours a day; how much of an opened heist's pool this robber gets (competition); how quick they are.
  casual: { hours: 1, share: 0.8, speed: 0.85, risk: 1.3, catch: 0.6 },
  median: { hours: 2, share: 1.0, speed: 1.0, risk: 1.0, catch: 0.75 },
  grinder: { hours: 4, share: 1.1, speed: 1.1, risk: 0.8, catch: 0.85 },
}
const ASSUME = {
  // Heists on the map per difficulty (stores = 0). The owner builds the map: change these to match it.
  heists: { 0: 2, 1: 3, 2: 3, 3: 2, 4: 2 },
  // The share of a pool one robber takes from a run they're in (the rest goes to others), before the profile.
  share: { 0: 0.8, 1: 0.5, 2: 0.45, 3: 0.4, 4: 0.35 },
  // Loot $ per second of holding right-click (the mix of pile styles each difficulty uses).
  rate: { 0: 125, 1: 150, 2: 225, 3: 300, 4: 420 },
  // Seconds per trip besides holding: walking in, around, out, to the base and selling (a car saves carSave of it).
  overhead: { 0: 80, 1: 120, 2: 150, 3: 190, 4: 260 },
  carSave: 0.25,
  // Opening safes and vault doors (seconds per trip, and the tool used up per trip on average).
  gate: { 0: 0, 1: 0, 2: 35, 3: 80, 4: 95 },
  // Without the Safe Kit (d2+) or the Drill (d3+) only this much of a pool can be reached.
  noKit: 0.6, noDrill: 0.55,
  // The run's clock ends early (everything robbed) at about this share of the escape time.
  runShare: 0.6,
  // Chance to die on a trip (loot lost, the balance loss, a new bag and gear).
  death: { 0: 0.02, 1: 0.03, 2: 0.05, 3: 0.08, 4: 0.12 },
  // A car contract takes this long (find the car, pick it, drive it to a chop shop), and succeeds this often.
  contractTime: 360, contractOk: 0.9,
  // Contact jobs: a waiting job gets done on a matching trip this often.
  jobMara: 0.5, jobBoss: 0.8,
  // A hit contract a week at the best tier the level allows, this long.
  hitTime: 1200,
  // Buying: keep this much of a price in reserve after a buy (bag losses, gear, ammo).
  reserve: 0.25,
  // Gear and guns bought as the heists need them.
  gearD3: 3500, gearD4: 15000,
}

// ---------- The level curve ----------
// "core": core.sk's level::first and level::growth-* (need(n) = need(n-1) × (1 + g(n)), g easing from growth-start to
// growth-end by level growth-until). "current": the old k × n × (n + 5).
const makeCurve = (mode, over = {}) => {
  const max = num('level::max', 500)
  const T = [0]
  if (mode === 'current') {
    const k = over.k || 6.5
    for (let n = 1; n <= max; n++) T.push(Math.round(k * n * (n + 5)))
  } else {
    const first = over.first || num('level::first', 40)
    const g0 = over.g0 ?? num('level::growth-start', 0.12)
    const g1 = over.g1 ?? num('level::growth-end', 0.02)
    const until = over.until || num('level::growth-until', 60)
    // The same table as levels.sk levelTable: the exact running sum, rounded.
    let need = first
    let total = 0
    for (let n = 1; n <= max; n++) {
      if (n > 1) {
        const f = Math.min(1, (n - 2) / Math.max(1, until - 2))
        need = need * (1 + g0 + (g1 - g0) * f)
      }
      total += need
      T.push(Math.round(total))
    }
  }
  const levelFor = xp => { let lo = 0, hi = T.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (T[m] <= xp) lo = m; else hi = m - 1 } return lo }
  return { T, levelFor }
}

// ---------- Randomness (seeded, so runs repeat) ----------
const rng = seed => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }

// ---------- One player's month ----------
const simulate = (profileName, days, seed, curve) => {
  const P = PROFILES[profileName]
  const rand = rng(seed)
  const bags = [1, 2, 3, 4, 5].map(t => ({ t, cap: num(`bag::${t}::capacity`), price: num(`bag::${t}::price`), level: num(`bag::${t}::level`, 0), replace: num(`bag::${t}::replace`) }))
  const hands = num('bag::hands::capacity', 1000)
  const D = [0, 1, 2, 3, 4]
  const pool = d => num(`difficulty::${d}::loot-pool`)
  const escape = d => num(`difficulty::${d}::escape`, 0)
  const cooldown = d => num(`difficulty::${d}::cooldown`)
  const dLevel = d => num(`difficulty::${d}::level`, 0)
  const dMax = d => num(`difficulty::${d}::max-level`, 0)
  const pDeath = d => num(`difficulty::${d}::p`, 0.01)
  const tiers = list('contract::tiers')
  const tier = t => ({ t, level: num(`contract::${t}::level`), pay: num(`contract::${t}::pay`), xp: num(`contract::${t}::xp`), pick: num(`lockpick::${t}::price`, 0), cd: num(`contract::${t}::cooldown`, num('contract::cooldown', 180)) })
  const weapons = list('shop::weapons').map(w => ({ w, price: num(`wpn::${w}::price`), level: num(`wpn::${w}::level`, 0) }))
  const cars = list('cars').filter(c => cfg[`car::${c}::crate`] !== true && cfg[`car::${c}::price`] !== undefined)
    .map(c => ({ c, name: cfg[`car::${c}::name`] || c, price: num(`car::${c}::price`), level: num(`car::${c}::level`, 0) }))
    .sort((a, b) => a.price - b.price)

  // Heist instances: a periodic opening schedule each (someone always robs them; the player catches some openings).
  const inst = []
  for (const d of D) for (let i = 0; i < ASSUME.heists[d]; i++) {
    const run = d === 0 ? 240 : escape(d) * ASSUME.runShare
    const cycle = run + cooldown(d)
    inst.push({ d, run, cycle, phase: rand() * cycle, done: -1 })
  }
  const S = { t: 0, play: 0, money: num('money::start', 1000), xp: 0, level: 0, bagBest: 0, bag: 0, guns: new Set(), cars: new Set(), gear: 0,
    cd: {}, jobs: { mara: 0, boss: 0 }, jobsAt: { mara: 0, boss: 0 }, contracts: 0, story: new Set(), log: [], levelAt: {}, idle: 0,
    earned: { heist: 0, contract: 0, job: 0, hit: 0, story: 0 }, spent: { bag: 0, gun: 0, gear: 0, car: 0, tuning: 0, tools: 0, death: 0, picks: 0 }, tune: {}, deaths: 0 }
  const note = what => S.log.push({ h: +(S.play / 3600).toFixed(2), day: Math.floor(S.t / 86400) + 1, level: S.level, what })
  const addXp = x => {
    S.xp += Math.floor(x)
    const n = curve.levelFor(S.xp)
    if (n > S.level) {
      for (let l = S.level + 1; l <= n; l++) if (S.levelAt[l] === undefined) S.levelAt[l] = S.play / 3600
      S.level = n
      storyRewards()
    }
  }
  const cap = () => (S.bag ? bags[S.bag - 1].cap : hands)
  // Mara's chapter ends (money, XP) at their level objectives, and Vic's arc from his level (core.sk's rewards).
  const storyRewards = () => {
    const ends = [['c1', 'c1_level', 'c1_end'], ['c2', 'c2_level', 'c2_end'], ['c3', 'c3_level', 'c3_end'], ['c4', 'c4_level', 'c4_end'], ['c5', 'c5_level', 'c5_end']]
    for (const [c, lv, end] of ends) {
      const m = String(cfg[`story::${lv}::obj`] || '').match(/level\|(\d+)/)
      if (!m || S.story.has(c) || S.level < Number(m[1])) continue
      S.story.add(c)
      for (const r of list(`story::${end}::rewards`)) {
        const [k, v] = r.split('|')
        if (k === 'money') { S.money += Number(v); S.earned.story += Number(v) }
        if (k === 'xp') S.xp += Number(v)
      }
    }
    const vic = String(cfg['chain::vic::start'] || '').match(/level\|(\d+)/)
    if (vic && !S.story.has('vic') && S.level >= Number(vic[1])) {
      S.story.add('vic')
      for (const id of list('chain::vic::missions')) for (const r of list(`story::${id}::rewards`)) {
        const [k, v] = r.split('|')
        if (k === 'money') { S.money += Number(v); S.earned.story += Number(v) }
        if (k === 'xp') S.xp += Number(v)
      }
    }
  }
  const buy = (price, kind, what) => { S.money -= price; S.spent[kind] += price; note(`buy ${what} ${fmt(price)}`) }
  const shopping = () => {
    // Bags first (they raise income), then gear for the heists in reach, then guns, then cars.
    for (const b of bags) {
      if (b.t <= S.bagBest || S.level < b.level) continue
      if (b.t === S.bagBest + 1 && S.money >= b.price * (1 + (b.t > 1 ? ASSUME.reserve : 0))) { buy(b.price, 'bag', b.t === 1 ? 'Gym Bag' : `bag tier ${b.t}`); S.bagBest = b.t; S.bag = b.t }
    }
    if (S.bag < S.bagBest && S.money >= bags[S.bagBest - 1].replace) { S.money -= bags[S.bagBest - 1].replace; S.spent.bag += bags[S.bagBest - 1].replace; S.bag = S.bagBest }
    if (S.gear < 1 && S.level >= dLevel(3) && S.money >= ASSUME.gearD3 * 2) { buy(ASSUME.gearD3, 'gear', 'light gear'); S.gear = 1 }
    if (S.gear < 2 && S.level >= dLevel(4) && S.money >= ASSUME.gearD4 * 2) { buy(ASSUME.gearD4, 'gear', 'heavy gear'); S.gear = 2 }
    for (const w of weapons) if (!S.guns.has(w.w) && S.level >= w.level && S.money >= w.price * 2) { buy(w.price, 'gun', w.w); S.guns.add(w.w) }
    if (S.bagBest >= 3) for (const c of cars) if (!S.cars.has(c.c) && S.level >= c.level && S.money >= c.price * 1.5) { buy(c.price, 'car', c.name); S.cars.add(c.c) }
    // Tuning (the garage's shop: dealer cars below extreme, stages 1-3 of 3 parts) once the money piles up: a sink.
    for (const c of cars) if (S.cars.has(c.c) && cfg['car::' + c.c + '::extreme'] !== true) for (const part of list('carmod::parts')) {
      const k = c.c + ':' + part
      const st = S.tune[k] || 0
      if (st >= 3) continue
      const price = Math.max(num('carmod::min::' + (st + 1), 0), Math.floor(c.price * num('carmod::share::' + (st + 1), 0)))
      if (price > 0 && S.money >= price * 4) { S.money -= price; S.spent.tuning += price; S.tune[k] = st + 1; if (st === 0 && part === 'engine') note('tune ' + c.name) }
    }
  }
  const access = d => (d >= 3 ? (S.level >= num('tool::drill::level', 15) ? 1 : ASSUME.noDrill) : d >= 2 ? (S.level >= num('tool::safe-kit::level', 5) ? 1 : ASSUME.noKit) : 1)
  const canRob = d => S.level >= dLevel(d) && (!dMax(d) || S.level <= dMax(d))
  const tripValue = (x, now) => {
    const d = x.d
    if (!canRob(d)) return null
    const k = Math.floor((now - x.phase) / x.cycle)
    const openAt = x.phase + k * x.cycle
    if (now - openAt > x.run || x.done === k) return null
    const loot = Math.floor(Math.min(cap(), pool(d) * ASSUME.share[d] * P.share * access(d)))
    const overhead = ASSUME.overhead[d] * (S.cars.size ? 1 - ASSUME.carSave : 1)
    const time = (overhead + loot / ASSUME.rate[d] + (access(d) === 1 ? ASSUME.gate[d] : 0)) / P.speed
    const risk = Math.min(0.5, ASSUME.death[d] * P.risk * (d >= 3 && S.gear < d - 2 ? 1.6 : 1) * (d === 4 && S.guns.size === 0 ? 1.5 : 1))
    const tools = d >= 3 ? num('tool::drill::price', 2500) * 0.5 + num('tool::safe-kit::price', 400) * 0.5 : d === 2 ? num('tool::safe-kit::price', 400) * 0.5 : 0
    return { x, k, d, loot, time, risk, tools, rate: (loot * (1 - risk) - tools) / time }
  }
  const doTrip = v => {
    v.x.done = v.k
    S.t += v.time; S.play += v.time
    S.money -= v.tools; S.spent.tools += v.tools
    if (rand() < v.risk) {
      const C = Math.min(cap(), pool(v.d))
      const L = Math.min(S.money * pDeath(v.d), C)
      S.money -= L; S.spent.death += L; S.deaths++
      S.bag = 0
      if (v.d >= 3) S.gear = Math.min(S.gear, 0)
      return
    }
    S.money += v.loot; S.earned.heist += v.loot
    addXp(v.loot / num('level::xp-per-dollars', 100) + num('level::xp-per-haul', 10))
    // A waiting Mara job this trip matched (her board opens when her story is done).
    if (S.story.has('c5') && S.jobs.mara > 0 && rand() < ASSUME.jobMara) {
      S.jobs.mara--
      const N = Math.max(num('jobs::min-goal', 1000), Math.floor(Math.min(num(`jobs::run::${Math.max(1, v.d)}`, 2000), 0.6 * bags[S.bagBest - 1].cap, 0.25 * pool(v.d)) / 100) * 100)
      const R = Math.max(500, Math.floor(0.28 * N / 50) * 50)
      S.money += R; S.earned.job += R; addXp(160)
    }
  }
  const doContract = t => {
    S.t += ASSUME.contractTime; S.play += ASSUME.contractTime
    S.money -= t.pick; S.spent.picks += t.pick
    S.cd[t.t] = S.t + t.cd
    if (rand() > ASSUME.contractOk) { S.cd[t.t] = S.t + num('contract::cooldown', 180); return }
    S.money += t.pay; S.earned.contract += t.pay; S.contracts++
    addXp(t.xp)
    if (S.jobs.boss > 0 && rand() < ASSUME.jobBoss) {
      S.jobs.boss--
      const R = Math.max(500, Math.floor(0.2 * t.pay / 50) * 50)
      S.money += R; S.earned.job += R; addXp(45)
    }
  }
  const hitTiers = ['easy', 'medium', 'hard'].map(h => ({ h, level: num(`hit::${h}::level`), pay: num(`hit::${h}::pay`), xp: num(`hit::${h}::xp`) }))
  let week = -1
  // The tutorial's first job at level 0.
  const starter = { t: 'starter', level: 0, pay: num('contract::starter::pay', 1500), xp: num('contract::starter::xp', 40), pick: 0, cd: 0 }
  let starterDone = false

  for (let day = 0; day < days; day++) {
    const start = day * 86400 + 19 * 3600
    // Jobs arrive every jobs::hours while offline too (the board holds jobs::slots).
    const hrs = num('jobs::hours', 6) * 3600
    for (const c of ['mara', 'boss']) {
      while (S.jobsAt[c] + hrs <= start) { S.jobsAt[c] += hrs; S.jobs[c] = Math.min(num('jobs::slots', 3), S.jobs[c] + (c === 'boss' && S.contracts === 0 ? 0 : 1)) }
    }
    S.t = Math.max(S.t, start)
    const end = start + P.hours * 3600
    if (Math.floor(day / 7) !== week) {
      week = Math.floor(day / 7)
      const h = [...hitTiers].reverse().find(x => S.level >= x.level)
      if (h) { S.t += ASSUME.hitTime; S.play += ASSUME.hitTime; S.money += h.pay; S.earned.hit += h.pay; addXp(h.xp) }
    }
    while (S.t < end) {
      shopping()
      if (!starterDone) { doContract(starter); starterDone = true; shopping(); continue }
      // A car job whose cooldown is over comes first (it pays for the wait).
      const ct = tiers.map(tier).filter(t => S.level >= t.level && (S.cd[t.t] || 0) <= S.t && S.money >= t.pick).sort((a, b) => b.pay - a.pay)[0]
      const vs = inst.map(x => tripValue(x, S.t)).filter(Boolean).filter(() => rand() < P.catch).sort((a, b) => b.rate - a.rate)
      const heistRate = vs.length ? vs[0].rate : 0
      if (ct && (ct.pay - ct.pick) / ASSUME.contractTime > heistRate * 0.8) { doContract(ct); continue }
      if (vs.length) { doTrip(vs[0]); continue }
      const wait = 30
      S.t += wait; S.play += wait; S.idle += wait
    }
    S.t = end
  }
  return S
}

const fmt = n => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${Math.round(n)}`)
const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))] }

// ---------- Main ----------
const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d }
const profile = opt('profile', 'median')
const days = Number(opt('days', 30))
const runs = Number(opt('runs', 40))
let curveMode = opt('curve', cfg['level::first'] !== undefined ? 'core' : 'current')
let over = {}
const solve = opt('solve', null)
const runAll = (c) => Array.from({ length: runs }, (_, i) => simulate(profile, days, 1000 + i, c))

if (solve) {
  // Find level::first so the median player reaches level L after H hours played.
  const [L, H] = solve.split('@').map(Number)
  let lo = 1, hi = 5000
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    const c = makeCurve('core', { first: mid })
    const at = runAll(c).map(s => (s.levelAt[L] === undefined ? Infinity : s.levelAt[L]))
    if (median(at) < H) lo = mid; else hi = mid
  }
  over = { first: Math.round((lo + hi) / 2) }
  curveMode = 'core'
  console.log(`solve: level::first = ${over.first} puts the median ${profile} player at level ${L} after ${H} h`)
}
const curve = makeCurve(curveMode, over)
const sims = runAll(curve)
const P = PROFILES[profile]
if (args.includes('--json')) { console.log(JSON.stringify(sims.map(s => ({ levelAt: s.levelAt, log: s.log })), null, 1)); process.exit(0) }

console.log(`Profile ${profile}: ${P.hours} h/day for ${days} days (${P.hours * days} h), ${runs} runs, curve=${curveMode}${over.first ? ' first=' + over.first : ''}`)
console.log(`Map assumed: heists ${JSON.stringify(ASSUME.heists)} (stores = 0)`)
const milestones = [1, 5, 10, 15, 20, 25, 30, 45, 50, 60, 75, 100, 125, 150, 175, 200].filter(l => l < curve.T.length)
console.log('\nLevel  XP total   hours (p10 / median / p90)   day   time for that level alone')
for (const l of milestones) {
  const at = sims.map(s => s.levelAt[l]).filter(x => x !== undefined)
  if (!at.length) { console.log(`${String(l).padStart(5)}  ${String(curve.T[l]).padStart(8)}   not reached`); continue }
  const prev = sims.map(s => s.levelAt[l - 1]).filter(x => x !== undefined)
  const alone = at.length && prev.length ? (median(at) - median(prev)) * 60 : 0
  const reached = at.length < sims.length ? ` (${at.length}/${sims.length} reach it)` : ''
  console.log(`${String(l).padStart(5)}  ${String(curve.T[l]).padStart(8)}   ${pct(at, 0.1).toFixed(1).padStart(5)} / ${median(at).toFixed(1).padStart(5)} / ${pct(at, 0.9).toFixed(1).padStart(5)}   ${String(Math.ceil(median(at) / P.hours)).padStart(3)}   ${alone.toFixed(1)} min${reached}`)
}
// Purchases: the median time each first happens.
const firsts = {}
for (const s of sims) for (const e of s.log) { const k = e.what.replace(/ \$[\d.]+[KM]?$/, ''); if (!(k in firsts)) firsts[k] = []; if (!firsts[k].includes(s)) { firsts[k].push(s); (firsts[k].h = firsts[k].h || []).push(e.h) } }
console.log('\nFirst buy                      hours (median)   runs that got there')
for (const [k, v] of Object.entries(firsts).sort((a, b) => median(a[1].h) - median(b[1].h))) console.log(`${k.padEnd(30)} ${median(v.h).toFixed(1).padStart(6)}   ${v.h.length}/${sims.length}`)
const endS = sims.map(s => s)
console.log(`\nAfter ${P.hours * days} h: level ${median(endS.map(s => s.level))} (p10 ${pct(endS.map(s => s.level), 0.1)}, p90 ${pct(endS.map(s => s.level), 0.9)}), balance ${fmt(median(endS.map(s => s.money)))}, deaths ${median(endS.map(s => s.deaths))}, idle ${(median(endS.map(s => s.idle)) / 3600).toFixed(1)} h`)
const sum = o => Object.values(o).reduce((a, b) => a + b, 0)
for (const k of ['earned', 'spent']) {
  const parts = Object.keys(sims[0][k]).map(x => `${x} ${fmt(median(sims.map(s => s[k][x])))}`).join(', ')
  console.log(`${k}: ${parts} (total ${fmt(median(sims.map(s => sum(s[k]))))})`)
}
// Income per hour played, by stage.
const byStage = [[0, 5], [5, 20], [20, 45], [45, 60], [60, 100], [100, 150]]
console.log('\nXP per hour by level range (median): ' + byStage.map(([a, b]) => {
  const r = sims.map(s => (s.levelAt[b] !== undefined && s.levelAt[a] !== undefined ? (curve.T[b] - curve.T[a]) / Math.max(0.01, s.levelAt[b] - (s.levelAt[a] || 0)) : null)).filter(x => x !== null)
  return `${a}-${b}: ${r.length ? Math.round(median(r)) : '-'}`
}).join(', '))
if (args.includes('--rates')) {
  // XP per hour played around each level (median over the runs): what a curve has to be built against.
  const out = []
  for (let l = 0; l + 5 < curve.T.length && l <= 200; l += 5) {
    const r = sims.map(s => (s.levelAt[l + 5] !== undefined && (l === 0 || s.levelAt[l] !== undefined) ? (curve.T[l + 5] - curve.T[l]) / Math.max(0.01, s.levelAt[l + 5] - (l ? s.levelAt[l] : 0)) : null)).filter(x => x !== null)
    if (r.length) out.push(`${l}:${Math.round(median(r))}`)
  }
  console.log('RATES ' + out.join(' '))
}
