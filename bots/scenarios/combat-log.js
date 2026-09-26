// combat-log.sk: combat tags and combat logging. Hitting or being hit by a player tags both (not when
// pvp.sk cancels the hit); tagged players can't use teleport commands or switch passive mode; the tag
// runs out with a message; logging out while tagged kills you and credits the death (the player who
// hit you in the last 5 s, else the cops if you're wanted, else what hurt you last); a kick or an
// untagged logout doesn't; dying clears the tag. Each blocked case has a positive control.
const { Vec3 } = require('vec3')
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'CombatA'
const B = 'CombatB'
const C = 'CombatWatch'
const Y = 200
const PLATFORM = `560 ${Y - 1} 560 570 ${Y - 1} 570` // glass in the sky, away from spawn and the city
const CHUNKS = '560 560 570 570'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bots = {}
  try {
    await rcon.cmd(`forceload add ${CHUNKS}`)
    await rcon.cmd(`fill ${PLATFORM} glass`)
    await rcon.cmd('scoreboard objectives add zzcombatdeaths deathCount')
    const deaths = async name => Number(((await rcon.cmd(`scoreboard players get ${name} zzcombatdeaths`)).match(/has (\d+)/) || [0, 0])[1])
    const combat = async name => (await rcon.cmd(`zzcombat ${name}`)).trim()
    const data = async (name, key) => ((await rcon.cmd(`zzdata ${name} ${key}`)).match(/= (.*)$/m) || [])[1]
    const perm = async (name, node, want) => {
      let out = ''
      for (let i = 0; i < 12 && !out.includes(`: ${want}`); i++) {
        await sleep(500)
        out = await rcon.cmd(`zzperm ${name} ${node}`)
      }
      return out.includes(`: ${want}`)
    }
    const setup = async name => {
      bots[name] = await join(name)
      await rcon.cmd(`gamemode survival ${name}`)
      await rcon.cmd(`zzclear ${name}`)
      await rcon.cmd(`zzpassive ${name} off`)
      await rcon.cmd(`zzdata ${name} passive-switched none`)
    }
    for (const name of [A, B, C]) await setup(name)
    await rcon.cmd(`minecraft:tp ${C} 568.5 ${Y} 568.5`)
    const uuidA = await (async () => {
      const out = await rcon.cmd(`data get entity ${A} UUID`)
      const n = (out.match(/\[I; (-?\d+), (-?\d+), (-?\d+), (-?\d+)\]/) || []).slice(1).map(Number)
      const hex = n.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    })()
    // New players can't be hurt until their client reports it has loaded (about 6 s for bots).
    await sleep(7000)
    // Both in place; EssentialsX's teleport protection blocks hits for 4 s after a teleport.
    const reset = async () => {
      await rcon.cmd(`minecraft:tp ${A} 562.5 ${Y} 565.5 -90 0`)
      await rcon.cmd(`minecraft:tp ${B} 565.5 ${Y} 565.5 90 0`)
      // pvp.sk's spawn shield (10 s after joining or respawning) isn't what this test is about.
      for (const name of [A, B]) await rcon.cmd(`zzshieldoff ${name}`)
      for (const name of [A, B]) await rcon.cmd(`minecraft:effect give ${name} minecraft:instant_health 1 10 true`)
      await sleep(5000)
    }
    const punch = async () => {
      const a = bots[A]
      const target = a.players[B] && a.players[B].entity
      if (!target) return false
      await a.lookAt(target.position.offset(0, 1.4, 0), true)
      a.attack(target)
      await sleep(800)
      return true
    }
    const rejoin = async name => {
      await setup(name)
      await sleep(7000)
    }
    const said = (name, t, re) => messagesSince(bots[name], t).some(m => re.test(m.text))
    const text = (name, t) => messagesSince(bots[name], t).map(m => `${m.kind}: ${m.text}`).join(' | ')

    // ---------- Tagging ----------
    await reset()
    check('nobody is tagged at the start', / tagged=false /.test(await combat(A)) && / tagged=false /.test(await combat(B)), `${await combat(A)} / ${await combat(B)}`)
    let t = Date.now()
    const landed = await punch()
    await sleep(300)
    check('a punch tags the victim, credited to the attacker', landed && (await combat(B)).includes(` tagged=true wanted=false cause=player:${uuidA}`), `${await combat(B)} (attacker ${uuidA})`)
    check('...and tags the attacker too', / tagged=true /.test(await combat(A)), await combat(A))
    check('both get the combat warning', said(B, t, /In combat! Logging out now kills you/) && said(A, t, /In combat!/), `${text(B, t)} // ${text(A, t)}`)

    // ---------- While tagged ----------
    const posB = () => bots[B].entity.position.clone()
    let before = posB()
    t = Date.now()
    bots[B].chat('/spawn')
    await sleep(1200)
    check('/spawn is blocked in combat', said(B, t, /can't use \/spawn while in combat/) && posB().distanceTo(before) < 1, text(B, t))
    t = Date.now()
    bots[B].setQuickBarSlot(8)
    await sleep(300)
    const opened = new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 3000)
      bots[B].once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    bots[B]._client.write('block_dig', { status: 6, location: new Vec3(0, 0, 0), face: 0, sequence: 0 }) // F: the phone's apps
    const menu = await opened
    if (menu) { try { await bots[B].clickWindow(13, 0, 0) } catch (err) { /* checked below */ } }
    await sleep(1000)
    check('no switching passive mode in combat', Boolean(menu) && said(B, t, /can't switch passive mode while in combat/) && (await data(B, 'passive')) !== 'true', `${menu ? 'menu' : 'no menu'}; ${text(B, t)}`)
    if (bots[B].currentWindow) bots[B].closeWindow(bots[B].currentWindow)

    // ---------- The tag runs out ----------
    t = Date.now()
    await rcon.cmd(`zzcombatend ${B}`)
    await sleep(2000)
    check('when the tag runs out the player is told', said(B, t, /You're out of combat/) && / tagged=false /.test(await combat(B)), `${text(B, t)}; ${await combat(B)}`)
    t = Date.now()
    bots[B].chat('/spawn')
    await sleep(1200)
    check('control: /spawn isn\'t blocked out of combat', !said(B, t, /while in combat/), text(B, t))
    await rcon.cmd(`zzcombatend ${A}`)

    // ---------- What doesn't tag ----------
    await rcon.cmd(`zzpassive ${B} on`)
    await reset()
    await punch()
    check('a hit that pvp.sk cancels (passive target) tags nobody', / tagged=false /.test(await combat(A)) && / tagged=false /.test(await combat(B)), `${await combat(A)} / ${await combat(B)}`)
    await rcon.cmd(`zzpassive ${B} off`)

    await reset()
    await punch()
    const tagged = / tagged=true /.test(await combat(B))
    await rcon.cmd(`minecraft:kill ${B}`)
    await sleep(1500)
    check('dying clears the tag', tagged && / tagged=false /.test(await combat(B)), `before death ${tagged}; ${await combat(B)}`)
    await rcon.cmd(`zzcombatend ${A}`)

    // ---------- Wanted ----------
    await rcon.cmd(`lp user ${B} permission set donating.wanted true`)
    const wanted = await perm(B, 'donating.wanted', 'true')
    check('wanted players count as tagged, credited to the cops', wanted && (await combat(B)).includes(' tagged=true wanted=true cause=cop'), await combat(B))
    await reset()
    await punch()
    check('...unless a player hit them in the last 5 s', (await combat(B)).includes(`cause=player:${uuidA}`), await combat(B))
    await sleep(5500)
    const deathsBefore = await deaths(B)
    t = Date.now()
    const causeNow = await combat(B)
    await quit(bots[B])
    await sleep(1500)
    check('a wanted player logging out dies, credited to the cops (player hit > 5 s ago)', causeNow.includes('cause=cop') && (await deaths(B)) === deathsBefore + 1 && (await data(B, 'last-combat-log')) === 'cop', `${causeNow}; deaths ${deathsBefore} -> ${await deaths(B)}; saved ${await data(B, 'last-combat-log')}`)
    await rcon.cmd(`lp user ${B} permission unset donating.wanted`)
    await perm(B, 'donating.wanted', 'false')
    await rejoin(B)
    await rcon.cmd(`zzcombatend ${A}`)

    // ---------- Combat logging ----------
    await reset()
    await punch()
    let d0 = await deaths(B)
    t = Date.now()
    await quit(bots[B])
    await sleep(1500)
    check('logging out in combat kills you, credited to the player who hit you', (await deaths(B)) === d0 + 1 && (await data(B, 'last-combat-log')) === `player:${uuidA}`, `deaths ${d0} -> ${await deaths(B)}; saved ${await data(B, 'last-combat-log')}`)
    check('everyone is told', said(C, t, new RegExp(`${B} logged out in combat and died`)), text(C, t))
    await rejoin(B)
    const dump = (await rcon.cmd(`zzdump ${B}`)).trim()
    check('after coming back: respawned, untagged, phone in place', bots[B].health > 0 && / tagged=false /.test(await combat(B)) && /(^| )8=filled map x1 \[phone\]/.test(dump), `health ${bots[B].health}; ${await combat(B)}; ${dump}`)
    await rcon.cmd(`zzcombatend ${A}`)

    // ---------- Not combat logs ----------
    await reset()
    await punch()
    d0 = await deaths(B)
    t = Date.now()
    const tagBeforeKick = / tagged=true /.test(await combat(B))
    await rcon.cmd(`zzkick ${B}`) // a staff kick (RCON commands don't fire Skript's command event)
    await sleep(1500)
    check('a kick while tagged isn\'t a combat log', tagBeforeKick && (await deaths(B)) === d0 && !said(C, t, /logged out in combat/), `tagged ${tagBeforeKick}; deaths ${d0} -> ${await deaths(B)}; ${text(C, t)}`)
    await rejoin(B)

    d0 = await deaths(B)
    t = Date.now()
    const untagged = / tagged=false /.test(await combat(B))
    await quit(bots[B])
    await sleep(1500)
    check('control: logging out untagged is safe', untagged && (await deaths(B)) === d0 && !said(C, t, /logged out in combat/), `untagged ${untagged}; deaths ${d0} -> ${await deaths(B)}`)
  } finally {
    await rcon.cmd(`lp user ${B} permission unset donating.wanted`).catch(() => {})
    for (const name of [A, B, C]) {
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`zzdata ${name} passive-switched none`).catch(() => {})
      await rcon.cmd(`minecraft:tp ${name} 0.5 68 -656.5`).catch(() => {}) // solid ground near spawn
    }
    for (const bot of Object.values(bots)) await quit(bot)
    await rcon.cmd('scoreboard objectives remove zzcombatdeaths').catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air replace glass`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
