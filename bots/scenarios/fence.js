// Vic the Fence (owner, 2026-09-27: "Vic the Fence"): story.sk's second chain and fence.sk's weekly Wanted List.
// His arc starts at level 3 (not before, not while no Vic stands on the map), runs next to Mara's, counts only what
// each mission asks (difficulty 2+ sales, Pro jobs, a difficulty 3+ safe, a drill and a getaway in one run), ends with
// a bound title, a Season key and the first list. The list (rolled for everyone each week: the least robbed heist,
// never a difficulty 1 one) pays its premium only on loot you robbed yourself, after pickup, up to each order's cap,
// each dollar once, 75% for passive players; the car order pays once; a new week needs a new pickup; staff only.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')
const { Vec3 } = require('vec3')

const A = 'VicA'
const B = 'VicB'
const Y = 200
const CHUNKS = '2790 2795 2865 2845'
const VIC = [2845.5, Y, 2822.5]
const BOSS = [2852.5, Y, 2822.5]
const HERE = [2840.5, Y, 2800.5]
const FAR = '0.5 68 -656.5'
const HEISTS = ['fv1', 'fv2', 'fv3']

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  let vic = ''
  let boss = ''
  let spot = ''
  let chop = ''
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const field = (s, k) => (s.match(new RegExp(`${k}=(\\S*)`)) || [])[1] || ''
    const vid = async name => field(await cmd(`dstory info ${name} vic`), ' id')
    const vicId = async name => ((await cmd(`dstory info ${name} vic`)).match(/ id=(\S*)/) || [])[1] || ''
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const run = async h => ((await cmd(`dheist info ${h}`)).match(/ run=(\S*)/) || [])[1] || ''
    const npcAt = (name, at) => Object.values(bots[name].entities).find(x => x.name === 'mannequin' && x.position.distanceTo(new Vec3(...at)) < 1)
    const talk = async (name, at) => { const e = npcAt(name, at); if (e) { try { await bots[name].lookAt(e.position.offset(0, 1.5, 0), true) } catch (err) {} await bots[name].activateEntity(e).catch(() => {}) } }
    const onMission = async (name, id, ms = 6000) => until(async () => (await vicId(name)) === id, ms)
    void vid

    // ---------- Setup: heists of difficulty 1, 2 and 3 (advanced, a safe and a vault), givers, a car spot ----------
    for (const h of HEISTS) { await cmd(`dloot clear ${h} confirm`); await cmd(`dheist delete ${h} confirm`); await cmd(`rg remove -w world heist_${h}`) }
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 2792 ${Y} 2798 2862 ${Y + 6} 2842 air`)
    await cmd(`fill 2792 ${Y - 1} 2798 2862 ${Y - 1} 2842 glass`)
    await cmd('zzregion heist_fv1 2795 190 2805 2803 208 2813')
    await cmd('zzregion heist_fv2 2810 190 2805 2818 208 2813')
    await cmd('zzregion heist_fv3 2825 190 2805 2835 208 2817')
    await cmd('fill 2798 200 2809 2799 200 2809 stone')
    await cmd('fill 2813 200 2809 2814 200 2809 stone')
    await cmd('fill 2829 200 2809 2830 200 2809 stone')
    await cmd('setblock 2832 201 2811 iron_block')
    await cmd('fill 2827 201 2814 2828 202 2814 iron_block')
    const setup = [
      ['fv1', 1, 'Vic Corner Store', '2791.5 200 2809.5'], ['fv2', 2, 'Vic Bank', '2806.5 200 2809.5'], ['fv3', 3, 'Vic Vault', '2822.5 200 2810.5']
    ]
    for (const [h, d, name, exit] of setup) {
      for (const c of [`dheist create ${h} ${d}`, `dheist set ${h} level 0`, `dheist set ${h} name ${name}`, `dheist set ${h} escape 600`, `dheist set ${h} cooldown 5`, `dheist exit ${h} ${exit} -90`]) await cmd(c)
    }
    await cmd('dheist set fv3 advanced true')
    await cmd('dloot add fv1 pile 2798 200 2809 2799 200 2809 value=500')
    await cmd('dloot add fv2 pile 2813 200 2809 2814 200 2809 value=500')
    await cmd('dloot add fv3 pile 2829 200 2809 2830 200 2809 value=500')
    await cmd('dloot add fv3 safe 2832 201 2811 2832 201 2811')
    await cmd('dloot add fv3 drill 2827 201 2814 2828 202 2814')
    for (const h of HEISTS) { await cmd(`dheist snapshot ${h}`); await cmd(`dheist enable ${h}`) }
    boss = ((await cmd(`dquest addat contracts ${BOSS.join(' ')} 180 Test Yard`)).match(/giver (\d+) \(contracts\) added/) || [])[1] || ''
    spot = ((await cmd(`dcontract spot addat 2855.5 ${Y} 2838.5 90`)).match(/spot (\d+) added/) || [])[1] || ''
    chop = ((await cmd(`dcontract chop addat 2797.5 ${Y} 2838.5`)).match(/chop (\d+) added/) || [])[1] || ''
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`dfence reset ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`eco set ${name} 10000`)
      await cmd(`minecraft:tp ${name} ${HERE[0]} ${Y} ${HERE[2]}`)
    }
    await sleep(6000)

    // ---------- Starting ----------
    await cmd(`dlevel set ${A} 3`)
    await cmd(`zzdata ${A} vic none`)
    await sleep(3000)
    const noGiver = await vicId(A)
    let t = Date.now()
    vic = ((await cmd(`dquest addat fence ${VIC.join(' ')} 180 Pawn Shop`)).match(/giver (\d+) \(fence\) added/) || [])[1] || ''
    await onMission(A, 'v1_meet')
    await until(async () => /✉ Vic/.test(text(A, t)), 3000)
    check('Vic\'s arc waits for a Vic on the map, then starts at level 3 with his text', noGiver === '' && (await vicId(A)) === 'v1_meet' && /✉ Vic: Mara says/.test(text(A, t)), `${noGiver} | ${await cmd(`dstory info ${A} vic`)} | ${text(A, t).slice(0, 200)}`)
    await cmd(`dlevel set ${B} 2`)
    await cmd(`zzdata ${B} vic none`)
    await sleep(3000)
    check('...but not below level 3', (await vicId(B)) === '', await cmd(`dstory info ${B} vic`))
    const g = await cmd(`dphone gps ${A}`)
    check('the GPS leads to Vic (the newest objective)', /active=quest/.test(g) && /label=Meet_Vic/.test(g), g)

    // ---------- The arc ----------
    await cmd(`minecraft:tp ${A} ${VIC[0]} ${Y} ${VIC[2] - 2}`)
    await sleep(1500)
    t = Date.now()
    await talk(A, VIC)
    await onMission(A, 'v2_appraisal', 12000)
    check('talking to Vic plays his lines, then the next mission; Mara\'s chain isn\'t touched', /So you're Mara's kid/.test(text(A, t)) && (await vicId(A)) === 'v2_appraisal' && / id=done/.test(await cmd(`dstory info ${A}`)), `${text(A, t).slice(0, 300)} | ${await cmd(`dstory info ${A}`)}`)
    // A wrong event must leave the progress where it was, right away (storyEvent runs inside zzprog / zzctdeliver;
    // reading the mission id later can't tell: nothing advances within 3 s of the last mission anyway).
    const prog = async () => field(await cmd(`dstory info ${A} vic`), ' prog')
    const none = p => /^(0|<none>|)$/.test(p)
    await cmd(`zzprog ${A} sell 4000 fv1#${await run('fv1')}`)
    const p2 = await prog()
    const still = await vicId(A)
    await cmd(`zzprog ${A} sell 4000 fv2#${await run('fv2')}`)
    await onMission(A, 'v3_wheels')
    check('"Sell $4,000 from difficulty 2+ heists" ignores a difficulty 1 heist\'s loot', still === 'v2_appraisal' && none(p2) && (await vicId(A)) === 'v3_wheels', `${still} prog=${p2} -> ${await vicId(A)}`)
    await cmd(`zzctdeliver ${A} basic sedan 100 0`)
    const p3 = await prog()
    const still3 = await vicId(A)
    await cmd(`zzctdeliver ${A} pro jeep 100 0`)
    await onMission(A, 'v4_collector')
    check('"Deliver a Pro car job" ignores a Street job', still3 === 'v3_wheels' && none(p3) && (await vicId(A)) === 'v4_collector', `${still3} prog=${p3} -> ${await vicId(A)}`)
    await cmd(`zzprog ${A} crack 1 fv2`)
    const p4 = await prog()
    const still4 = await vicId(A)
    await cmd(`zzprog ${A} crack 1 fv3`)
    await onMission(A, 'v5_auction')
    check('"Crack a safe in a difficulty 3+ heist" ignores an easier heist\'s safe', still4 === 'v4_collector' && none(p4) && (await vicId(A)) === 'v5_auction', `${still4} prog=${p4} -> ${await vicId(A)}`)
    const r3 = await run('fv3')
    await cmd(`zzprog ${A} drill 1 fv3`)
    await cmd('zzheistwave fv3 1')
    await cmd(`zzbagadd ${A} fv3#${r3} 500`)
    await cmd(`zzprog ${A} getaway 1 fv3`)
    await onMission(A, 'v6_end')
    await cmd(`zzbagadd ${A} fv3#${r3} 0`)
    await cmd('zzheistwave fv3 0')
    check('"Drill a vault and lose the cops, in one run": a drill and a getaway with loot after a wave', (await vicId(A)) === 'v6_end', await cmd(`dstory info ${A} vic`))
    const keys0 = await cmd(`dcrate info ${A}`)
    t = Date.now()
    await talk(A, VIC)
    await until(async () => (await vicId(A)) === 'done', 12000)
    await sleep(1500)
    const cos = await cmd(`zzcos ${A}`)
    const keys1 = await cmd(`dcrate info ${A}`)
    const fi = await cmd(`dfence info ${A}`)
    const sk = s => Number(((s.match(/season=(\d+)/) || [])[1]) || 0)
    check('the end: the bound title «Vic\'s Guy», a Season key, and his first Wanted List', /vic_guy/.test(cos) && sk(keys1) === sk(keys0) + 1 && field(fi, ' took') === field(fi, ' week') && field(fi, ' took') !== '<none>', `${cos} | ${keys0} -> ${keys1} | ${fi}`)

    // ---------- The list ----------
    const W = Number(field(fi, ' week'))
    await cmd(`zzheat fv2 ${W - 1} 5`)
    // fv3 above fv1's 0, so a missing difficulty filter always picks fv1; every other heist on the server loses too.
    await cmd(`zzheat fv3 ${W - 1} 1`)
    for (const m of (await cmd('dheist list')).matchAll(/^HEIST (\S+)/gm)) if (!['fv1', 'fv2', 'fv3'].includes(m[1])) await cmd(`zzheat ${m[1]} ${W - 1} 9`)
    const rolled = await cmd(`dfence roll ${W}`)
    const o1 = field(rolled, ' o1')
    const o2 = field(rolled, ' o2')
    const o3 = field(rolled, ' o3')
    check('the week\'s list: the least robbed heist (fv3, never the difficulty 1 one), a difficulty, a car', /^heist\|fv3\|/.test(o1) && /^diff\|\d\|/.test(o2) && /^car\|\w+\|(basic|pro)\|\d+/.test(o3), rolled)
    const r3b = await run('fv3')
    let b0 = await bal(A)
    await cmd(`zzprog ${A} rob 2000 fv3#${r3b}`)
    await cmd(`zzprog ${A} sell 2000 fv3#${r3b}`)
    await cmd(`zzfencepay ${A}`)
    check('own loot from the ordered heist pays +30% ($600 on $2,000)', (await bal(A)) - b0 === 600, `+${(await bal(A)) - b0}`)
    // Near the heist order's cap: the rest goes to the difficulty order (if this heist fits it), each dollar once.
    const cap1 = Number(o1.split('|')[3])
    const dstar = Number(o2.split('|')[1])
    await cmd(`zzdata ${A} fence::used::1 ${cap1 - 500}`)
    await cmd(`zzprog ${A} rob 2000 fv3#${r3b}`)
    b0 = await bal(A)
    await cmd(`zzprog ${A} sell 2000 fv3#${r3b}`)
    await cmd(`zzfencepay ${A}`)
    const expect = Math.floor(0.3 * 500 + (3 >= dstar ? 0.15 * 1500 : 0))
    check('at the cap the heist order pays only up to it; the rest counts for the difficulty order, never twice', (await bal(A)) - b0 === expect, `+${(await bal(A)) - b0} expected ${expect} (d*=${dstar})`)
    b0 = await bal(A)
    await cmd(`zzprog ${A} sell 1000 fv3#9999`)
    await cmd(`zzfencepay ${A}`)
    check('loot the player didn\'t rob (a duffel) pays no premium', (await bal(A)) === b0, `+${(await bal(A)) - b0}`)
    await cmd(`zzdata ${A} fence::used::1 0`)
    await cmd(`zzpassive ${A} on`)
    await cmd(`zzprog ${A} rob 1000 fv3#${r3b}`)
    b0 = await bal(A)
    await cmd(`zzprog ${A} sell 1000 fv3#${r3b}`)
    await cmd(`zzfencepay ${A}`)
    await cmd(`zzpassive ${A} off`)
    check('passive players get 75% of the premium ($225 on $1,000)', (await bal(A)) - b0 === 225, `+${(await bal(A)) - b0}`)
    const [, model, tier, pay] = o3.split('|')
    b0 = await bal(A)
    await cmd(`zzctdeliver ${A} ${tier} ${model} 100 0`)
    const once = (await bal(A)) - b0
    b0 = await bal(A)
    await cmd(`zzctdeliver ${A} ${tier} ${model} 100 0`)
    check('the car order pays once a week', once === Number(pay) && (await bal(A)) === b0, `first +${once} (pay ${pay}), second +${(await bal(A)) - b0}`)
    // A new week: nothing until the list is picked up again at the Pawn Shop.
    await cmd(`zzweek ${W + 1}`)
    await cmd(`dfence roll ${W + 1}`)
    await cmd(`zzprog ${A} rob 1000 fv3#${r3b}`)
    b0 = await bal(A)
    await cmd(`zzprog ${A} sell 1000 fv3#${r3b}`)
    await cmd(`zzfencepay ${A}`)
    const before = (await bal(A)) - b0
    t = Date.now()
    await talk(A, VIC)
    await sleep(1500)
    const fi2 = await cmd(`dfence info ${A}`)
    await cmd('zzweek off')
    check('a new week pays nothing until the new list is picked up in person ("Fresh list")', before === 0 && field(fi2, ' took') === String(W + 1) && /Fresh list/.test(text(A, t)), `+${before} | ${fi2} | ${text(A, t).slice(0, 200)}`)
    t = Date.now()
    bots[B].chat('/dfence list')
    await sleep(800)
    check('/dfence is staff only', /Staff only/.test(text(B, t)), text(B, t))
  } finally {
    await rcon.cmd('zzweek off').catch(() => {})
    if (vic) await rcon.cmd(`dquest remove ${vic}`).catch(() => {})
    if (boss) await rcon.cmd(`dquest remove ${boss}`).catch(() => {})
    if (spot) await rcon.cmd(`dcontract spot remove ${spot}`).catch(() => {})
    if (chop) await rcon.cmd(`dcontract chop remove ${chop}`).catch(() => {})
    for (const h of HEISTS) {
      await rcon.cmd(`dloot clear ${h} confirm`).catch(() => {})
      await rcon.cmd(`dheist delete ${h} confirm`).catch(() => {})
      await rcon.cmd(`rg remove -w world heist_${h}`).catch(() => {})
      await rcon.cmd(`minecraft:kill @e[tag=poi_h_${h}]`).catch(() => {})
    }
    await rcon.cmd(`dfence roll`).catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`dfence reset ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`dlevel reset ${name}`).catch(() => {})
      await rcon.cmd(`minecraft:tp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill 2792 ${Y - 1} 2798 2862 ${Y + 6} 2842 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    await rcon.cmd('zzcfgreload').catch(() => {})
    rcon.close()
  }
}
