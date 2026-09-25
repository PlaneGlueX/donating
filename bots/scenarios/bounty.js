// bounty.sk: kills add to the killer's bounty (capped, not twice for the same victim within 15 min),
// robberies add 10% (never for passive players), placed bounties (not on yourself, not on or by
// passive players, at least $1,000, paid by the placer), the next player to kill you claims it all
// (also through a combat log), cop/trap deaths leave it, and no payout between same-IP alts.
// Kills use "/damage <victim> 1000 minecraft:player_attack by <killer>" (the same damage event as a hit).
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'BountyA'
const B = 'BountyB'
const C = 'BountyC'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bots = {}
  try {
    const setup = async name => {
      bots[name] = await join(name)
      await rcon.cmd(`gamemode survival ${name}`)
      await rcon.cmd(`zzclear ${name}`)
      await rcon.cmd(`zzpassive ${name} off`)
      await rcon.cmd(`zzbountyreset ${name}`)
      await rcon.cmd(`zzcombatend ${name}`)
    }
    for (const name of [A, B, C]) await setup(name)
    await rcon.cmd('zzbountyip off') // every local bot has the same IP
    await sleep(7000) // bots can't be hurt until about 6 s after joining
    const bounty = async name => Number(((await rcon.cmd(`zzbounty ${name}`)).match(/BOUNTY \S+ (\d+)/) || [])[1])
    const kills = async name => ((await rcon.cmd(`zzbounty ${name}`)).match(/kills=(\S+)/) || [])[1]
    const bal = async name => Number(((await rcon.cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const said = (name, t, re) => messagesSince(bots[name], t).some(m => re.test(m.text))
    const kill = async (victim, killer) => {
      await rcon.cmd(`zzshieldoff ${victim}`) // pvp.sk's spawn shield after the last respawn
      await rcon.cmd(`damage ${victim} 1000 minecraft:player_attack by ${killer}`)
      await sleep(1500)
    }

    // ---------- Kill bounty ----------
    let t = Date.now()
    await kill(B, A)
    check('a kill adds $250 to the killer\'s bounty', (await bounty(A)) === 250 && (await kills(A)) === '250' && said(A, t, /Your bounty is now \$250/), `${await bounty(A)} kills=${await kills(A)}; ${text(A, t)}`)
    check('...and nothing to the victim\'s', (await bounty(B)) === 0)
    await kill(B, A)
    check('killing the same player again within 15 min adds nothing', (await bounty(A)) === 250, `${await bounty(A)}`)

    // ---------- Claiming ----------
    await rcon.cmd(`eco set ${C} 1000`)
    t = Date.now()
    await kill(A, C)
    check('killing a player with a bounty pays the killer all of it', (await bal(C)) === 1250 && (await bounty(A)) === 0, `C balance ${await bal(C)}; A bounty ${await bounty(A)}`)
    check('...and everyone is told', said(B, t, new RegExp(`${C} claimed ${A}'s \\$250 bounty`)), text(B, t))
    check('...and the killer gets their own kill bounty', (await bounty(C)) === 250, `${await bounty(C)}`)

    // ---------- The kill cap ----------
    await rcon.cmd(`zzbounty ${C} 24650 kill`) // bounty from kills: 24,900 of 25,000
    await kill(B, C)
    check('bounty from kills stops at the cap ($25,000)', (await bounty(C)) === 25000 && (await kills(C)) === '25000', `${await bounty(C)} kills=${await kills(C)}`)

    // ---------- Robbery bounty and passive players ----------
    await rcon.cmd(`zzbounty ${B} 500 robbery`)
    check('a robbery adds to the bounty', (await bounty(B)) === 500, `${await bounty(B)}`)
    await rcon.cmd(`zzbountyreset ${B}`)
    await rcon.cmd(`zzpassive ${B} on`)
    await rcon.cmd(`zzbounty ${B} 500 robbery`)
    check('passive players gain no bounty', (await bounty(B)) === 0, `${await bounty(B)}`)
    await rcon.cmd(`zzpassive ${B} off`)

    // ---------- Placing bounties ----------
    await rcon.cmd(`eco set ${B} 5000`)
    const place = async (who, cmd) => {
      const t0 = Date.now()
      bots[who].chat(cmd)
      await sleep(900)
      return text(who, t0)
    }
    let out = await place(B, `/bounty ${A} 1000`)
    check('placing $1,000 on someone: paid by the placer, added to their bounty', (await bal(B)) === 4000 && (await bounty(A)) === 1000 && /Their bounty is now \$1,000/.test(out), `${await bal(B)}; ${await bounty(A)}; ${out}`)
    out = await place(B, `/bounty ${B} 1000`)
    check('not on yourself', /can't put a bounty on yourself/.test(out) && (await bal(B)) === 4000, out)
    out = await place(B, `/bounty ${A} 500`)
    check('not below $1,000', /at least \$1,000/.test(out) && (await bounty(A)) === 1000, out)
    await rcon.cmd(`eco set ${B} 100`)
    out = await place(B, `/bounty ${A} 1000`)
    check('not without the money', /don't have \$1,000/.test(out) && (await bounty(A)) === 1000 && (await bal(B)) === 100, out)
    await rcon.cmd(`eco set ${B} 5000`)
    await rcon.cmd(`zzpassive ${C} on`)
    out = await place(B, `/bounty ${C} 1000`)
    check('not on a passive player', /passive mode: no bounties/.test(out) && (await bal(B)) === 5000, out)
    await rcon.cmd(`zzpassive ${C} off`)
    await rcon.cmd(`zzpassive ${B} on`)
    out = await place(B, `/bounty ${A} 1000`)
    check('passive players can\'t place bounties', /Passive players can't place bounties/.test(out) && (await bal(B)) === 5000, out)
    await rcon.cmd(`zzpassive ${B} off`)
    out = await place(B, '/bounty')
    check('/bounty lists the biggest bounties online', /Bounties \(players online\)/.test(out) && new RegExp(`1\\. ${C} \\$25,000`).test(out) && new RegExp(`2\\. ${A} \\$1,000`).test(out), out)

    // ---------- Same IP, cop/trap deaths ----------
    await rcon.cmd('zzbountyip on')
    const bBefore = await bal(B)
    await kill(A, B)
    check('same IP (alts): no payout and no kill bounty', (await bounty(A)) === 1000 && (await bal(B)) === bBefore && (await bounty(B)) === 0, `A ${await bounty(A)}; B ${await bal(B)} / ${await bounty(B)}`)
    await rcon.cmd('zzbountyip off')
    await rcon.cmd(`zzshieldoff ${A}`)
    await rcon.cmd(`minecraft:kill ${A}`)
    await sleep(1500)
    check('a death that isn\'t a player kill leaves the bounty', (await bounty(A)) === 1000, `${await bounty(A)}`)

    // ---------- Claiming through a combat log ----------
    // A just respawned: EssentialsX's spawn-on-respawn is a teleport, and its teleport protection
    // blocks player hits for 4 s.
    await sleep(5000)
    await rcon.cmd(`zzshieldoff ${A}`)
    await rcon.cmd(`damage ${A} 1 minecraft:player_attack by ${B}`) // tags A, credited to B
    await sleep(500)
    const tagged = / tagged=true .*cause=player:/.test(await rcon.cmd(`zzcombat ${A}`))
    const before = await bal(B)
    await quit(bots[A])
    await sleep(1500)
    check('logging out in combat hands the bounty to the player who hit you', tagged && (await bal(B)) === before + 1000 && (await bounty(A)) === 0, `tagged ${tagged}; B ${before} -> ${await bal(B)}; A bounty ${await bounty(A)}`)
  } finally {
    await rcon.cmd('zzbountyip on').catch(() => {})
    for (const name of [A, B, C]) {
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`zzbountyreset ${name}`).catch(() => {})
      await rcon.cmd(`zzdata ${name} passive-switched none`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot)
    rcon.close()
  }
}
