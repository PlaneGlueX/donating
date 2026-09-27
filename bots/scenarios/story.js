// story.sk: the personal questline (owner, 2026-09-27: "a personal questline that helps the player do stuff instead
// of just spam robberies (like gta)"). A player's first mission comes after the tutorial (texts from Mara, the sidebar
// line, the GPS leading to Mara, a pin set meanwhile staying in front); talking to her in person plays her lines
// and completes it; a state mission (a gun) completes as soon as it's true, with the MISSION PASSED title even
// without a reward; selling the first loot gives the Daily key; event missions count only while active (money sold,
// distinct heists, contract tiers); a mission the map can't do is skipped with one line, and one whose content goes
// missing only after a grace period; a mission already done is skipped (veterans); a chapter's end pays money, XP and
// a tool (cash when the level is too low); without Mara on the map a talk mission waits for a call from /missions;
// /missions shows it; staff only.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'StoryA'
const B = 'StoryB'
const Y = 200
const CHUNKS = '2190 2190 2295 2220'
const PLATFORM = `2190 ${Y - 1} 2190 2220 ${Y - 1} 2220`
const FAR = '0.5 68 -656.5'
const MARA = [2205.5, Y, 2205.5]

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  let giverN = ''
  let ctGiver = ''
  let spotN = ''
  let chopN = ''
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const field = (s, k) => (s.match(new RegExp(`${k}=(\\S*)`)) || [])[1] || ''
    const info = async name => cmd(`dstory info ${name}`)
    const id = async name => field(await info(name), 'id')
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const papi = async (name, ph) => ((await cmd(`zzpapi ${name} ${ph}`)).match(/= (.*)$/m) || [])[1] || ''
    const ev = async (name, e, n, d) => cmd(`zzprog ${name} ${e} ${n} ${d}`)
    const windowOpen = bot => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const itemText = i => (i ? JSON.stringify(i) : '')
    const set = async (name, m) => { await cmd(`dstory set ${name} ${m}`); await sleep(300) }

    // ---------- Setup ----------
    await cmd('zzcfgreload')
    await cmd('zzcfgtext story::c2_bank::needs story')
    await cmd('zzcfgtext story::c3_spread::needs story')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`dlevel reset ${name}`)
      await cmd(`eco set ${name} 10000`)
      await cmd(`zzdata ${name} keys::daily none`)
      for (const w of ['Combat_Knife', '50_GS', 'Uzi', 'R9_0', 'AK_47']) await cmd(`dshop lock ${name} ${w}`)
    }
    await cmd(`zzheisttp ${A} ${MARA[0] + 2} ${Y} ${MARA[2]}`)
    await cmd(`zzheisttp ${B} ${MARA[0] + 2} ${Y} ${MARA[2] + 3}`)
    const r = await cmd(`dquest addat story ${MARA.join(' ')} 90 Safehouse`)
    giverN = (r.match(/giver (\d+) \(story\) added/) || [])[1] || ''
    // Car contracts on the map (the Scrap Yard missions need a giver, a car spot and a chop shop).
    ctGiver = ((await cmd(`dquest addat contracts 2195.5 ${Y} 2195.5 0 Test Yard`)).match(/giver (\d+) \(contracts\) added/) || [])[1] || ''
    spotN = ((await cmd(`dcontract spot addat 2215.5 ${Y} 2215.5 90`)).match(/spot (\d+) added/) || [])[1] || ''
    chopN = ((await cmd(`dcontract chop addat 2290.5 ${Y} 2215.5`)).match(/chop (\d+) added/) || [])[1] || ''
    await sleep(1500)

    // ---------- The first mission ----------
    let t = Date.now()
    await cmd(`zzdata ${A} story none`)
    await until(async () => (await id(A)) === 'c1_meet', 8000)
    await until(async () => /New in town/.test(text(A, t)), 3000)
    check('after the tutorial the first mission starts: a text from Mara, the sidebar line', (await id(A)) === 'c1_meet' && /✉ Mara: New in town/.test(text(A, t)) && /Meet Mara at the Safehouse/.test(await papi(A, 'donating_mission')), `${await info(A)} | ${text(A, t).slice(0, 200)} | ${await papi(A, 'donating_mission')}`)
    await until(async () => /active=quest/.test(await cmd(`dphone gps ${A}`)), 4000)
    const g = await cmd(`dphone gps ${A}`)
    check('the GPS leads to Mara', /active=quest/.test(g) && /label=Meet_Mara/.test(g) && /target=2205\.5,200/.test(g), g)
    await cmd(`gpspick ${A} 2212 2190 2`)
    await sleep(500)
    const pinned = await cmd(`dphone gps ${A}`)
    t = Date.now()
    await cmd(`zzbagadd ${A} zh#9 500`)
    await sleep(1600)
    await cmd(`zzbagadd ${A} zh#9 0`)
    await sleep(1600)
    const back = await cmd(`dphone gps ${A}`)
    check('a pin set meanwhile stays in front when the mission\'s target comes back (after carrying loot)', /active=pin/.test(pinned) && /active=pin/.test(back) && !/New objective/.test(text(A, t)), `${pinned} | ${back} | ${text(A, t).slice(0, 200)}`)
    bots[A].chat('/gps clear')
    await sleep(600)
    // Talking to her in person: her lines, 2 s apart, then the mission is done.
    const e = Object.values(bots[A].entities).find(x => x.name === 'mannequin' && x.position.distanceTo(new (require('vec3').Vec3)(...MARA)) < 1)
    t = Date.now()
    if (e) { try { await bots[A].lookAt(e.position.offset(0, 1.5, 0), true) } catch (err) {} await bots[A].activateEntity(e).catch(() => {}) }
    await sleep(1500)
    const early = await id(A)
    await until(async () => (await id(A)) !== 'c1_meet', 9000)
    const lines = text(A, t)
    check('talking to Mara in person plays her lines (not all at once), then the mission is done (no "<none>")', early === 'c1_meet' && /So you're the new face/.test(lines) && /First, get yourself armed/.test(lines) && /Mission passed: Meet Mara/.test(lines) && !/<none>/.test(lines), `early=${early} ${lines.slice(0, 500)}`)
    check('the next mission arrives as a text (Buy a gun)', (await id(A)) === 'c1_gun' && /Gun Shop/.test(text(A, t)), `${await info(A)} ${text(A, t).slice(-200)}`)
    t = Date.now()
    await cmd(`dshop unlock ${A} 50_GS`)
    await until(async () => (await id(A)) !== 'c1_gun', 4000)
    check('a state mission (own a gun) completes as soon as it\'s true', (await id(A)) !== 'c1_gun' && /Mission passed: Buy a gun/.test(text(A, t)), `${await info(A)} ${text(A, t).slice(0, 300)}`)
    await until(async () => /MISSION PASSED/.test(text(A, t)), 3000)
    check('...with the MISSION PASSED title although it has no reward (and no "<none>")', /MISSION PASSED/.test(text(A, t)) && !/<none>/.test(text(A, t)), text(A, t).slice(0, 400))
    await set(A, 'c1_sell')
    const k0 = await cmd(`dcrate info ${A}`)
    t = Date.now()
    await ev(A, 'sell', 500, 'zh#3')
    await until(async () => (await id(A)) !== 'c1_sell', 4000)
    const k1 = await cmd(`dcrate info ${A}`)
    check('selling the first loot gives the Daily key (for the crate mission right after)', !/daily=1/.test(k0) && /daily=1/.test(k1) && /Mission passed: Sell your loot/.test(text(A, t)), `${k0} | ${k1} | ${text(A, t).slice(0, 300)}`)

    // ---------- Counting ----------
    await set(A, 'c2_bank')
    await ev(A, 'sell', 4000, 'zh#1')
    await sleep(1200)
    const mid = await papi(A, 'donating_mission')
    t = Date.now()
    await ev(A, 'sell', 6000, 'zh#2')
    await until(async () => (await id(A)) !== 'c2_bank', 4000)
    check('an event mission counts while active ($4,000/$10,000 shown), and completes at $10,000', /\$4,000\/\$10,000/.test(mid) && (await id(A)) === 'c2_level' && /Mission passed: Sell \$10,000/.test(text(A, t)), `${mid} | ${await info(A)}`)
    await set(A, 'c3_spread')
    await ev(A, 'rob', 100, 'h1#1')
    await ev(A, 'rob', 100, 'h1#2')
    await ev(A, 'rob', 100, 'h2#1')
    await sleep(600)
    const two = field(await info(A), 'prog')
    await ev(A, 'rob', 100, 'h3#1')
    await until(async () => (await id(A)) !== 'c3_spread', 4000)
    check('"Rob 3 different heists" counts heists, not pieces', two === '2' && (await id(A)) !== 'c3_spread', `two=${two} ${await info(A)}`)
    await set(A, 'c4_pro')
    await ev(A, 'contract', 3000, 'basic')
    await sleep(1200)
    const still = await id(A)
    await ev(A, 'contract', 9000, 'pro')
    await until(async () => (await id(A)) !== 'c4_pro', 4000)
    check('"Deliver a Pro job" ignores a Street job, counts a Pro one', still === 'c4_pro' && (await id(A)) !== 'c4_pro', `${still} ${await info(A)}`)

    // ---------- Skips ----------
    t = Date.now()
    await set(A, 'c5_finale')
    const afterFinale = await id(A)
    check('a mission the map can\'t do (no advanced difficulty-4 heist with a safe and a vault) is skipped with one line', afterFinale !== 'c5_finale' && /That job fell through/.test(text(A, t)), `${afterFinale} ${text(A, t)}`)
    await set(A, 'c2_bank')
    await cmd('zzcfgset story::needs-check 1')
    await cmd('zzcfgset story::needs-grace 4')
    await cmd('zzcfgtext story::c2_bank::needs finale')
    t = Date.now()
    await sleep(2500)
    const waiting = await id(A)
    await until(async () => (await id(A)) !== 'c2_bank', 9000)
    const gone = Date.now() - t
    check('a mission whose content goes missing waits out the grace period, then is skipped', waiting === 'c2_bank' && (await id(A)) !== 'c2_bank' && gone >= 3500 && /That job fell through/.test(text(A, t)), `waiting=${waiting} after=${gone}ms ${await info(A)}`)
    await cmd('zzcfgset story::needs-check 30')
    await cmd('zzcfgset story::needs-grace 900')
    await cmd('zzcfgtext story::c2_bank::needs story')
    t = Date.now()
    await set(A, 'c1_gun')
    const vet = await id(A)
    check('a mission already done (owns a gun) is skipped at once, with a "skipping ahead" line, no reward', vet !== 'c1_gun' && /Skipping ahead/.test(text(A, t)) && !/Mission passed: Buy a gun/.test(text(A, t)), `${vet} ${text(A, t).slice(0, 300)}`)

    // ---------- A chapter's end: rewards ----------
    await set(A, 'c1_end')
    const b0 = await bal(A)
    const xp0 = Number(((await cmd(`dlevel info ${A}`)).match(/xp=(\d+)/) || [])[1])
    t = Date.now()
    const e2 = Object.values(bots[A].entities).find(x => x.name === 'mannequin' && x.position.distanceTo(new (require('vec3').Vec3)(...MARA)) < 1)
    if (e2) await bots[A].activateEntity(e2).catch(() => {})
    await until(async () => (await id(A)) !== 'c1_end', 9000)
    await sleep(500)
    const xp1 = Number(((await cmd(`dlevel info ${A}`)).match(/xp=(\d+)/) || [])[1])
    // Level 0 can't carry a Safe Kit (level 1): its half price comes as cash instead ($200).
    check('Report to Mara: $1,000, 25 XP and the Safe Kit (as cash below its level), MISSION PASSED', (await bal(A)) - b0 === 1200 && xp1 - xp0 === 25 && /Mission passed: Report to Mara/.test(text(A, t)), `+${(await bal(A)) - b0} xp+${xp1 - xp0} ${text(A, t).slice(0, 400)}`)
    await until(async () => /MISSION PASSED/.test(text(A, t)), 3000)
    check('...and the MISSION PASSED title a moment later', /MISSION PASSED/.test(text(A, t)), text(A, t).slice(-300))

    // ---------- /missions, staff, the tutorial ----------
    await set(A, 'c2_bank')
    let o = windowOpen(bots[A])
    bots[A].chat('/missions')
    const w = await o
    await sleep(300)
    check('/missions shows the mission, its chapter and progress, and the five chapters', w && /Sell \$10,000/.test(itemText(w.slots[13])) && /Tools of the Trade/.test(itemText(w.slots[13])) && [29, 30, 31, 32, 33].every(i => w.slots[i]), itemText(w && w.slots[13]).slice(0, 300))
    if (bots[A].currentWindow) bots[A].closeWindow(bots[A].currentWindow)
    t = Date.now()
    bots[B].chat(`/dstory info ${A}`)
    await sleep(800)
    check('/dstory is staff only', /Staff only/.test(text(B, t)), text(B, t))
    await cmd(`dquest remove ${giverN}`)
    giverN = ''
    t = Date.now()
    await set(A, 'c2_end')
    await sleep(1500)
    o = windowOpen(bots[A])
    bots[A].chat('/missions')
    const w2 = await o
    await sleep(300)
    check('without Mara on the map a talk mission stays (not skipped), says how to call her, and /missions has Call Mara', (await id(A)) === 'c2_end' && /call from/.test(text(A, t)) && w2 && /Call Mara/.test(itemText(w2.slots[22])), `${await info(A)} ${text(A, t).slice(0, 300)} | ${itemText(w2 && w2.slots[22]).slice(0, 120)}`)
    if (bots[A].currentWindow) bots[A].closeWindow(bots[A].currentWindow)
    await cmd(`zzdatatext ${B} tutorial bag`)
    await cmd(`zzdata ${B} story none`)
    await sleep(7000)
    check('no story while the tutorial still runs (no bag yet)', (await id(B)) === '' || (await id(B)) === '<none>', await info(B))
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    if (giverN) await rcon.cmd(`dquest remove ${giverN}`).catch(() => {})
    if (ctGiver) await rcon.cmd(`dquest remove ${ctGiver}`).catch(() => {})
    if (spotN) await rcon.cmd(`dcontract spot remove ${spotN}`).catch(() => {})
    if (chopN) await rcon.cmd(`dcontract chop remove ${chopN}`).catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzdata ${name} keys::daily none`).catch(() => {})
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
