// cops.sk (Citizens + Sentinel): an advanced heist's alarm brings waves of NPC cops that shoot only the
// players it hunts. Checks: wanted while hunted, waves at the cop spot up to the cap, only hunted players
// get shot, a dead cop is removed and the next wave refills, getting away ends the alarm and removes the
// cops, a cop kill counts as a cop death, passive players can shoot cops, cops left by a restart are
// cleaned up, and cop deaths don't touch economy or bounties.
// The heist is x 960..970, y 199..205, z 960..970 on a glass platform; the cop spot is at x 945.
const fs = require('fs')
const path = require('path')
const { join, sleep, quit, messagesSince } = require('../lib')
const copLog = () => { try { return fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs', 'cops.log'), 'utf8') } catch (e) { return '' } }
const rconLib = require('../rcon')

const A = 'CopRobber'
const B = 'CopBystander'
const Y = 200
const ID = 'zcop'
const REGION = 'heist_zcop'
const CHUNKS = '930 950 990 980'
const PLATFORM = `930 ${Y - 1} 950 990 ${Y - 1} 980`
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const cops = async () => cmd(`zzcops ${ID}`)
    const alive = async () => Number(((await cops()).match(/alive=(\d+)/) || [])[1])
    const npcs = async () => cmd('zznpcs')
    const combat = async name => cmd(`zzcombat ${name}`)
    const heist = async () => cmd(`zzheist ${ID}`)
    const field = async k => ((await heist()).match(new RegExp(`${k}=(\\S+)`)) || [])[1]
    const place = async (name, x, z) => { await cmd(`zzheisttp ${name} ${x} ${Y} ${z}`); await sleep(1300) }

    // ---------- Setup: a test advanced heist ----------
    await cmd(`dheist delete ${ID} confirm`)
    await cmd(`rg remove -w world ${REGION}`)
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    await cmd('zzcfgreload')
    await cmd('zzcfgtext heist::start-on enter')
    await cmd('zzcfgtime alarm::warning 3 seconds')
    await cmd('zzcfgtime alarm::wave-interval 4 seconds')
    await cmd('zzcfgset alarm::max-cops 3')
    await cmd('zzcfgset cop::per-wave 2')
    await cmd(`zzregion ${REGION} 960 199 960 970 205 970`)
    await cmd(`dheist create ${ID} 4`)
    await cmd(`dheist set ${ID} name Cop Bank`)
    await cmd(`dheist set ${ID} level 0`)
    await cmd(`dheist set ${ID} escape 300`)
    await cmd(`dheist set ${ID} cooldown 30`)
    await cmd(`dheist exit ${ID} 950.5 ${Y} 965.5`)
    await cmd(`dheist snapshot ${ID}`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`zzdata ${name} passive-switched none`)
      await cmd(`zzdata ${name} level none`)
      await cmd(`zzbountyreset ${name}`)
      await cmd(`lp user ${name} permission unset donating.wanted`)
      await cmd(`lp user ${name} permission unset donating.staff`)
      await cmd(`eco set ${name} 10000`)
    }
    await place(A, 952.5, 965.5)
    await place(B, 952.5, 975.5)

    // ---------- Staff: cop spots ----------
    const inside = await cmd(`dcops ${ID} add 965.5 ${Y} 965.5`)
    const added = await cmd(`dcops ${ID} add 940.5 ${Y} 965.5`)
    check('/dcops add: a cop spot outside the heist (refused inside it)', /not inside a heist/.test(inside) && /spot 1 at 940\.5/.test(added), `${inside} / ${added}`)
    let t = Date.now()
    bots[B].chat(`/dcops ${ID} list`)
    await sleep(700)
    check('/dcops is staff only', /Staff only/.test(text(B, t)), text(B, t))

    await cmd(`dheist enable ${ID}`)
    await until(async () => (await field('state')) === 'open', 8000)
    await sleep(5000) // bots can be hurt about 6 s after joining
    await place(A, 965.5, 965.5)
    await until(async () => /state=active/.test(await heist()), 4000)

    // ---------- The alarm ----------
    t = Date.now()
    await cmd(`dheist alarm ${ID}`)
    await sleep(600)
    let c = await combat(A)
    check('the alarm hunts the robber inside: wanted and combat-tagged', /tagged=true wanted=true/.test(c) && /wanted=false/.test(await combat(B)), `${c} / ${await combat(B)}`)
    check('no cops during the warning', (await alive()) === 0, await cops())
    const waveOne = await until(async () => (await alive()) === 2, 6000)
    await sleep(1500) // Citizens respawns a new NPC once to put its skin on
    const list = await npcs()
    const copIds = (((await cops()).match(/ids=([\d,]+)/) || [])[1] || '').split(',')
    const copLines = list.split(' | ').filter(l => copIds.some(i => l.includes(`id=${i} `)))
    // Where they appeared (they start chasing at once, so their position now says little).
    const spawned = copIds.map(i => (copLog().match(new RegExp(`spawn zcop id=${i} at (\\d+) 200 (\\d+)`)) || []).slice(1).map(Number))
    const atSpot = spawned.every(p => p.length === 2 && Math.abs(p[0] - 940) <= 2 && Math.abs(p[1] - 965) <= 2)
    check('wave 1: two cops at the cop spot, holding the gun (a feather with the model)', waveOne && copLines.length === 2 && atSpot && copLines.every(l => /tool=feather/.test(l)), `${JSON.stringify(spawned)} ${await cops()} ${list}`)

    // Only the hunted robber gets shot.
    const hpA = bots[A].health
    const hpB = bots[B].health
    const shot = await until(() => bots[A].health < hpA, 15000)
    check('cops shoot the hunted robber', shot, `hp ${hpA} -> ${bots[A].health}`)
    check('...and not the bystander next to them', bots[B].health === hpB, `hp ${hpB} -> ${bots[B].health}`)
    await cmd(`minecraft:effect give ${A} minecraft:resistance 60 4 true`) // keep the robber alive for the next checks
    await cmd(`minecraft:effect give ${A} minecraft:regeneration 60 4 true`)

    // Waves refill up to the cap (3 here).
    const capped = await until(async () => (await alive()) === 3, 8000)
    await sleep(4500)
    check('waves refill up to the heist\'s cap and never past it', capped && (await alive()) === 3, await cops())

    // A dead cop is removed; the next wave replaces it.
    // Right after a wave, so the next one (4 s) doesn't refill before we look.
    await until(async () => /want=/.test(copLog().split('\n').slice(-2).join(' ')), 6000)
    const ids = ((await cops()).match(/ids=([\d,]+)/) || [])[1] || ''
    const killOut = await cmd(`minecraft:kill @e[tag=CITIZENS_NPC,limit=1,sort=nearest,x=965,y=200,z=965]`)
    await sleep(600)
    const deadId = ([...copLog().matchAll(/died id=(\d+)/g)].pop() || [])[1] || ''
    const savedNow = (((await cops()).match(/saved=([\d,]*)/) || [])[1] || '').split(',')
    const inWorld = ((await npcs()).match(/id=(\d+)/g) || []).map(x => x.slice(3))
    check('a dead cop is removed a tick later: off the list, out of the world, no respawn', /Killed/.test(killOut) && ids.split(',').includes(deadId) && !savedNow.includes(deadId) && !inWorld.includes(deadId) && (await alive()) === 2, `${killOut} died=${deadId} before=${ids} saved=${savedNow} world=${inWorld}`)
    const refilled = await until(async () => (await alive()) === 3, 6000)
    check('the next wave replaces it', refilled, await cops())

    // Passive players can shoot cops; cops don't shoot passive bystanders.
    await cmd(`zzpassive ${B} on`)
    const dmg = await cmd(`minecraft:damage @e[tag=CITIZENS_NPC,limit=1,sort=nearest,x=952,y=200,z=975] 2 minecraft:player_attack by ${B}`)
    await sleep(400)
    const afterHit = await npcs()
    const hpMin = Math.min(...[...afterHit.matchAll(/hp=([\d.]+)/g)].map(m => Number(m[1])))
    check('a passive player can hurt a cop (cops aren\'t players)', /Applied 2/.test(dmg) && hpMin < 10, `${dmg} -> ${afterHit}`)
    await sleep(2500)
    check('...and the cops don\'t turn on them (they only shoot hunted players)', bots[B].health === hpB, `hp ${hpB} -> ${bots[B].health}`)
    await cmd(`zzpassive ${B} off`)

    // ---------- Getting away ends the alarm ----------
    t = Date.now()
    await place(A, 965.5, 1090.5) // 125 blocks from the heist's centre (chase radius 100)
    await cmd(`forceload add 960 1080 970 1100`)
    const gone = await until(async () => (await alive()) === 0 && /total=0/.test(await cops()), 6000)
    c = await combat(A)
    check('getting away: the alarm ends, every cop is removed, no longer wanted', gone && /wanted=false/.test(c) && /alarm=none/.test(await heist()), `${await cops()} / ${c} / ${await heist()}`)
    check('...and no cop NPC is left in the world', /NPCS 0/.test(await npcs()), await npcs())
    await cmd(`forceload remove 960 1080 970 1100`)

    // ---------- Killed by a cop = a cop death ----------
    await cmd(`minecraft:effect clear ${A}`)
    await place(A, 952.5, 965.5)
    await cmd(`dheist end ${ID}`)
    await cmd(`dheist open ${ID}`)
    await until(async () => (await field('state')) === 'open', 8000)
    await place(A, 965.5, 965.5)
    await until(async () => /state=active/.test(await heist()), 4000)
    await cmd('zzcfgset cop::damage 60')
    await cmd(`dheist alarm ${ID}`)
    const before = Number(((await cmd(`zzbal ${A}`)).match(/: (-?\d+)/) || [])[1])
    let died = false
    bots[A].once('death', () => { died = true })
    await until(() => died, 15000)
    await sleep(800)
    const cause = await cmd(`zzdata ${A} last-death-cause`)
    const loss = await cmd(`zzdata ${A} last-death-loss`)
    check('a robber shot dead by a cop: a cop death (cop-p of the balance: 10% of $10,000 at difficulty 4, capped by the bag)', died && /= cop$/m.test(cause), `${died} ${cause} ${loss} bal before ${before}`)
    const ended = await until(async () => (await alive()) === 0 && /alarm=none/.test(await heist()), 6000)
    check('the only hunted robber died: the alarm ends and the cops go', ended, `${await cops()} ${await heist()}`)
    await cmd('zzcfgset cop::damage 3')
    await sleep(3000)

    // ---------- Cops left by a restart ----------
    // A "Cop" NPC nobody tracks (like one Citizens brings back after a crash) is removed by the sweep.
    await cmd(`fill 944 ${Y - 1} 969 946 ${Y - 1} 971 glass`)
    await cmd(`zzconsole npc create Cop --at 945.5,${Y},970.5,world --type PLAYER --trait sentinel --nameplate false`)
    await sleep(300)
    const serverLog = fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'logs', 'latest.log'), 'utf8')
    const stray = ([...serverLog.matchAll(/Created Cop \(ID (\d+)\)/g)].pop() || [])[1]
    await cmd('zzcopforget')
    await cmd('sk reload cops')
    const cleaned = await until(async () => new RegExp(`sweep id=${stray}\\b`).test(copLog()) && !new RegExp(`id=${stray} `).test(await npcs()), 14000)
    check('a "Cop" NPC that isn\'t a known cop (left from before a restart) is swept away', Boolean(stray) && cleaned, `stray=${stray} ${await npcs()}`)
  } finally {
    await rcon.cmd(`dcops ${ID} removeall`).catch(() => {})
    await rcon.cmd(`dheist delete ${ID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world ${REGION}`).catch(() => {})
    await rcon.cmd('zzcfgreload').catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`minecraft:effect clear ${name}`).catch(() => {})
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot)
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
