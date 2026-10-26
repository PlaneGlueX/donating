// clerk.sk (owner, 2026-10-21: Payday's stores): a store with a clerk keeps its register shut until someone hits the
// clerk; the hit starts the robbery (the register opens, the run starts) and the clerk runs to the shelves to throw
// things at the robbers; another hit makes them duck. The clerk is never hurt. When the robbery ends the store stays
// open as a shop (owner, 2026-10-21: "keep stores open even when heist is on cooldown, just disable the robbing
// mechanics"): customers walk in without joining a run, the calm clerk sells food and consumables on a right-click.
// Stores have no police by default (owner, the same day: "for low tier stores like donut shop and grocery store, no
// need for police"): nobody is wanted. With /dheist set <store> police true the clerk hits the panic button (the
// robbers inside are wanted, the store's police come after its response time, in assaults).
const fs = require('fs')
const path = require('path')
const conv = require('mineflayer/lib/conversions')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')
const LOGS = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs')
const readLog = name => { try { return fs.readFileSync(path.join(LOGS, `${name}.log`), 'utf8') } catch (e) { return '' } }

const A = 'ClerkA'
const B = 'ClerkB'
const Y = 200
const ID = 'zclerk'
const CHUNKS = '4390 4390 4440 4445'
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  const log0 = readLog('clerk').length // this run's lines only
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(200) } return Boolean(await fn()) }
    const field = (s, k) => (s.match(new RegExp(` ${k}=(\\S*)`)) || [])[1]
    const info = async () => cmd(`dclerk ${ID} info`)
    const heist = async () => cmd(`zzheist ${ID}`)
    const alarm = async () => cmd(`zzalarm ${ID}`)
    const bag = async name => Number(((await cmd(`zzbag ${name}`)).match(/total=([\d.]+)/) || [])[1])
    const combat = async name => cmd(`zzcombat ${name}`)
    const place = async (name, x, z, yaw = 0) => { await cmd(`zzheisttp ${name} ${x} ${Y} ${z}`); await sleep(1000); await bots[name].look(conv.fromNotchianYaw(yaw), 0, true) }
    const box = (bot, x, y, z) => {
      let best = null
      let bd = 1.6
      for (const e of Object.values(bot.entities)) {
        if (e.name !== 'interaction') continue
        const d = Math.hypot(e.position.x - x, e.position.y - y, e.position.z - z)
        if (d < bd) { bd = d; best = e }
      }
      return best
    }
    const hold = async (name, x, y, z, ms) => {
      const end = Date.now() + ms
      while (Date.now() < end) { const e = box(bots[name], x, y, z); if (e) bots[name].activateEntity(e).catch(() => {}); await sleep(200) }
    }
    // The clerk as A's client sees it (a player entity named Clerk).
    const clerkEntity = bot => Object.values(bot.entities).find(e => e.type === 'player' && e.username === 'Clerk')

    // ---------- Build: a store (x 4400..4414, z 4400..4414), the counter at z 4406, the clerk behind it ----------
    await cmd(`dheist delete ${ID} confirm`)
    await cmd(`rg remove -w world heist_${ID}`)
    await cmd('zzcfgreload')
    // Short timings for the test: the police 12 s out (time for the throws first), a short assault, a fast clerk.
    await cmd('zzcfgtime difficulty::0::alarm::warning 12 seconds')
    await cmd('zzcfgset difficulty::0::alarm::pool 2')
    await cmd('zzcfgset difficulty::0::alarm::assault-time 30')
    await cmd('zzcfgtime clerk::every 1 seconds')
    await cmd('zzcfgset clerk::spread 0')
    await cmd('zzcfgset clerk::armed-chance 0') // an unarmed clerk until the armed part below
    await cmd('zzcfgset clerk::effect-chance 100') // every prop that lands gives the bad effect, so the check is sure
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 4390 ${Y} 4390 4440 ${Y + 8} 4445 air`)
    await cmd(`fill 4390 ${Y - 1} 4390 4440 ${Y - 1} 4445 glass`)
    await cmd(`fill 4406 ${Y} 4406 4407 ${Y} 4406 stone`) // the counter with the register
    await cmd(`zzregion heist_${ID} 4400 ${Y - 1} 4400 4414 ${Y + 6} 4414`)
    const created = await cmd(`dheist create ${ID} 0`)
    for (const c of [`dheist set ${ID} name Test Mart`, `dheist exit ${ID} 4407.5 ${Y} 4419.5 180`, `dheist snapshot ${ID}`]) await cmd(c)
    const pile = await cmd(`dloot add ${ID} pile 4406 ${Y} 4406 4407 ${Y} 4406 value=1500 style=register take=0.2`)
    const outside = await cmd(`dclerk ${ID} setat 4406.5 ${Y} 4420.5 0`)
    const set = await cmd(`dclerk ${ID} setat 4406.5 ${Y} 4403.5 0`)
    const shelf = await cmd(`dclerk ${ID} shelfat 4402.5 ${Y} 4402.5`)
    await cmd(`dcops ${ID} add 4407.5 ${Y} 4424.5`)
    check('staff set a store\'s clerk behind its register and a shelf (refused outside the store)', /created/.test(created) && /added/.test(pile) && /must be inside/.test(outside) && /the clerk stands at/.test(set) && /shelf 1 at/.test(shelf), `${created} | ${outside} | ${set} | ${shelf}`)
    const dump = await cmd(`dheist dump ${ID}`)
    check('/dheist dump has the clerk\'s lines', /dclerk zclerk setat 4406\.5 200 4403\.5 0/.test(dump) && /dclerk zclerk shelfat 4402\.5 200 4402\.5/.test(dump), dump)

    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzbagclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`eco set ${name} 1000`)
      await cmd(`minecraft:effect give ${name} minecraft:saturation 1 20 true`)
    }
    await place(B, 4430.5, 4430.5)
    await place(A, 4407.5, 4419.5, 180)

    let t = Date.now()
    await cmd(`dheist enable ${ID}`)
    const opened = await until(async () => field(await heist(), 'state') === 'open', 10000)
    const spawned = await until(async () => /id=\d+/.test(await info()), 8000)
    await sleep(1500) // Citizens puts the skin on (a new entity)
    let i = await info()
    check('the store opens with its clerk at the register (a Citizens NPC), the register shut', opened && spawned && field(i, 'st') === 'idle' && field(i, 'shut') === 'true', i)
    // The register (loot.sk lootRegSpawn): a body, a drawer that slides 0.5 blocks out toward the clerk (-z here:
    // the clerk at z 4403.5), bundles of bills in it once it's open.
    const sel = m => `@e[type=item_display,x=4407,y=${Y},z=4406.5,distance=..2,nbt={item:{components:{"minecraft:custom_model_data":{strings:["donating:${m}"]}}}}]`
    const regCount = async m => Number(((await cmd(`execute if entity ${sel(m)}`)).match(/Count: (\d+)/i) || [0, 0])[1])
    const drawerZ = async () => Number(((await cmd(`data get entity ${sel('register_drawer').replace('[type=', '[limit=1,type=')} Pos[2]`)).match(/(-?[\d.]+)d/) || [])[1])
    let reg = [await regCount('register_body'), await regCount('register_drawer'), await regCount('register_bills'), await drawerZ()]
    check('...a real register on the counter, its drawer shut and no cash in sight', reg[0] === 1 && reg[1] === 1 && reg[2] === 0 && Math.abs(reg[3] - 4406.5) < 0.05, JSON.stringify(reg))
    check('...a store has no police by default', /police=false/.test(await cmd(`dheist info ${ID}`)), await cmd(`dheist info ${ID}`))

    // ---------- Before the hit: the register is shut ----------
    await sleep(5000) // bots can be hurt about 6 s after joining
    t = Date.now()
    await place(A, 4407.5, 4408.5, 180) // in front of the counter, facing it (north)
    check('entering: hit the clerk, then dodge what they throw (no word of cops)', /dodge what they throw/.test(text(A, t)) && !/call the cops/.test(text(A, t)), text(A, t).slice(0, 300))
    t = Date.now()
    await hold(A, 4407, Y + 1, 4406.5, 2000)
    await sleep(600)
    check('the shut register gives nothing, and the prompt says to hit the clerk', (await bag(A)) === 0 && /Hit the clerk/.test(text(A, t)), `${await bag(A)} | ${text(A, t).slice(0, 300)}`)
    check('...the store is still open (no run yet)', field(await heist(), 'state') === 'open', await heist())

    // ---------- The hit ----------
    t = Date.now()
    const hp0 = bots[A].health
    const ce = clerkEntity(bots[A])
    if (ce) {
      await bots[A].lookAt(ce.position.offset(0, 1.5, 0), true)
      bots[A].attack(ce)
    }
    let hit = await until(async () => field(await info(), 'hit') !== '<none>', 2000)
    if (!hit) { await cmd(`zzclerkhit ${ID} ${A}`); hit = await until(async () => field(await info(), 'hit') !== '<none>', 2000) }
    i = await info()
    check('a punch on the clerk (by the bot, else by /zzclerkhit) starts the robbery: the run, the clerk panics', Boolean(ce) && hit && field(await heist(), 'state') === 'active' && field(i, 'st') !== 'idle', `${Boolean(ce)} ${i} | ${await heist()}`)
    check('...no police: nobody wanted, no alarm, "the register\'s open"', /wanted=false/.test(await combat(A)) && field(await alarm(), 'stage') === 'none' && /register's open/.test(text(A, t)) && !/panic button/.test(text(A, t)), `${await combat(A)} | ${await alarm()} | ${text(A, t).slice(0, 300)}`)
    const staffAlarm = await cmd(`dheist alarm ${ID}`)
    check('...and staff can\'t trip its alarm either', /police are off/.test(staffAlarm) && field(await alarm(), 'stage') === 'none', `${staffAlarm} | ${await alarm()}`)
    check('...the clerk isn\'t hurt (still there, same NPC)', /id=\d+/.test(await info()) && clerkEntity(bots[A]) !== undefined, await info())
    await sleep(500) // the drawer slides out (2 ticks, then a 3-tick teleport)
    reg = [await regCount('register_bills'), await drawerZ()]
    check('...the drawer slides out toward the clerk with the cash in it', reg[0] >= 15 && Math.abs(reg[1] - 4406) < 0.05, JSON.stringify(reg))
    await hold(A, 4407, Y + 1, 4406.5, 2500)
    await sleep(500)
    check('the register opens: the robber grabs from it', (await bag(A)) > 0, String(await bag(A)))

    // ---------- The clerk throws things ----------
    await cmd(`minecraft:effect give ${A} minecraft:instant_health 1 5 true`)
    await sleep(600)
    const hp1 = bots[A].health
    const thrownAt = await until(() => bots[A].health < hp1, 9000)
    check('the clerk runs for something and throws it at the robber in sight (hurt before the cops come)', (thrownAt || /hurt zclerk ClerkA/.test(readLog('clerk').slice(log0))) && (await cmd(`zzcops ${ID}`)).includes('alive=0') && /throw zclerk at ClerkA/.test(readLog('clerk').slice(log0)), `hp ${hp1} -> ${bots[A].health} | ${await cmd(`zzcops ${ID}`)} | hp0 ${hp0}`)
    const fx = await until(() => /effect zclerk ClerkA/.test(readLog('clerk').slice(log0)), 6000)
    const pots = Object.keys(bots[A].entity.effects || {}).map(Number)
    check('...a prop pushes and sometimes blinds or slows (the effect here: chance 100)', fx && pots.some(id => id === 2 || id === 15 || id === 1 || id === 14), `${fx} effects=${JSON.stringify(pots)}`)
    // Another hit: they duck.
    await cmd(`zzclerkhit ${ID} ${A}`)
    check('another hit makes the clerk duck (stunned)', field(await info(), 'st') === 'stunned', await info())
    const back = await until(async () => field(await info(), 'st') !== 'stunned', 5000)
    check('...for a moment, then back to it', back, await info())

    // ---------- A store with its police on (/dheist set <store> police true) ----------
    await cmd(`dheist end ${ID}`)
    const id0 = field(await info(), 'id')
    const calm = await until(async () => field(await info(), 'st') === 'idle', 8000)
    check('the robbery ends: the clerk calms down and stays (same NPC)', calm && field(await info(), 'id') === id0, await info())
    // ---------- The store as a shop while it cools down ----------
    const balOf = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    await cmd(`zzcombatend ${A}`)
    await place(A, 4407.5, 4408.5, 180)
    await sleep(1500)
    check('a customer in the cooling-down store is no robber', field(await heist(), 'state') === 'cooldown' && !/zclerk/.test(await cmd(`zzinheist ${A}`)), `${await heist()} | ${await cmd(`zzinheist ${A}`)}`)
    await sleep(1500) // Citizens' skin swap (a new entity)
    const ce2 = clerkEntity(bots[A])
    let win = null
    if (ce2) {
      const opened2 = new Promise(resolve => { const tm = setTimeout(() => resolve(null), 4000); bots[A].once('windowOpen', w => { clearTimeout(tm); resolve(w) }) })
      bots[A].activateEntity(ce2).catch(() => {})
      win = await opened2
    }
    check("right-click the calm clerk: the store's shop opens", Boolean(win) && /Store/.test(JSON.stringify(win.title)), win ? JSON.stringify(win.title) : 'no window')
    if (win) {
      const bal0 = await balOf(A)
      await bots[A].clickWindow(10, 0, 0).catch(() => {})
      const paid = await until(async () => (await balOf(A)) === bal0 - 40, 3000)
      check('...buying a Donut costs $40 and puts it in the hotbar', paid && /donut/i.test(await cmd(`zzdump ${A}`)), `${bal0} -> ${await balOf(A)} | ${(await cmd(`zzdump ${A}`)).slice(0, 300)}`)
      bots[A].closeWindow(win)
    }
    t = Date.now()
    await cmd(`zzclerkhit ${ID} ${A}`)
    await sleep(400)
    check("a hit while it cools down: the clerk ducks, \"the register's empty\", no new run", field(await info(), 'st') === 'stunned' && /register's empty/.test(text(A, t)) && field(await heist(), 'state') === 'cooldown', `${await info()} | ${await heist()} | ${text(A, t).slice(0, 200)}`)
    await until(async () => field(await info(), 'st') === 'idle', 6000)
    await place(A, 4407.5, 4419.5, 180)
    const pol = await cmd(`dheist set ${ID} police true`)
    await cmd(`dheist open ${ID}`)
    const again = await until(async () => /id=\d+/.test(await info()) && field(await info(), 'shut') === 'true', 15000)
    check('it reopens with the clerk back at the register and the register shut again', again, await info())
    await sleep(1500) // Citizens puts the skin on (a new entity)
    await cmd(`zzcombatend ${A}`) // the props tagged combat
    t = Date.now()
    await place(A, 4407.5, 4408.5, 180)
    check('police on (/dheist set police true): entering says the clerk will call the cops', /police = true/.test(pol) && /call the cops/.test(text(A, t)), `${pol} | ${text(A, t).slice(0, 300)}`)
    t = Date.now()
    await cmd(`zzclerkhit ${ID} ${A}`)
    await until(async () => field(await alarm(), 'stage') === 'warning', 2000)
    check('...the hit: the panic button, the robber inside is wanted, the cops are coming (the store\'s response time)', /wanted=true/.test(await combat(A)) && field(await alarm(), 'stage') === 'warning' && /panic button/.test(text(A, t)), `${await combat(A)} | ${await alarm()} | ${text(A, t).slice(0, 300)}`)
    check('...and the bystander outside isn\'t', /wanted=false/.test(await combat(B)), await combat(B))

    // ---------- The store's police ----------
    await cmd(`minecraft:effect give ${A} minecraft:resistance 60 4 true`)
    await cmd(`minecraft:effect give ${A} minecraft:regeneration 60 4 true`)
    const assault = await until(async () => field(await alarm(), 'stage') === 'assault', 14000)
    const cops = await until(async () => Number(field(await alarm(), 'alive')) >= 1, 6000)
    const a = await alarm()
    check('after the response time the store\'s police assault: at most its cap (3), from its pool (2)', assault && cops && Number(field(a, 'alive')) <= 3 && Number(field(a, 'pool')) <= 1 && field(a, 'assault') === '1', a)
    // The store's chase radius is shorter (60): 70 blocks away loses them.
    t = Date.now()
    await cmd(`zzheisttp ${A} 4407.5 ${Y} 4490.5`)
    const lost = await until(async () => /wanted=false/.test(await combat(A)), 8000)
    check('the store\'s chase radius is 60: 70 blocks away the cops lose you', lost && /lost the cops/.test(text(A, t)), `${await combat(A)} | ${text(A, t).slice(0, 200)}`)
    const ended = await until(async () => field(await alarm(), 'stage') === 'none', 4000)
    check('...the alarm ends and its cops go', ended && (await cmd(`zzcops ${ID}`)).includes('alive=0'), `${await alarm()} | ${await cmd(`zzcops ${ID}`)}`)

    // ---------- The armed clerk (owner: 10% of openings; melee 75%, else a gun; more cash in the register) ----------
    const reopenArmed = async melee => {
      await cmd(`zzcfgset clerk::armed-melee ${melee}`)
      await cmd(`zzbagclear ${A}`)
      await cmd(`zzcombatend ${A}`)
      await place(A, 4407.5, 4419.5, 180)
      await cmd(`dheist end ${ID}`)
      await cmd(`dheist open ${ID}`)
      const ok = await until(async () => field(await info(), 'shut') === 'true' && field(await info(), 'weapon') !== '<none>', 15000)
      await sleep(1500) // Citizens puts the skin on (a new entity)
      await place(A, 4407.5, 4408.5, 180)
      return ok
    }
    await cmd(`dheist set ${ID} police false`)
    await cmd('zzcfgset clerk::armed-chance 100')
    await cmd(`minecraft:effect give ${A} minecraft:resistance 120 4 true`)
    let la = readLog('clerk').length
    const armedM = await reopenArmed(100)
    i = await info()
    check('armed (chance 100, melee 100): the clerk holds a melee weapon at the register, the cash x3', armedM && field(i, 'weapon') === 'melee' && field(i, 'mult') === '3' && /amethyst_shard/.test(field(i, 'holding') || '') && /armed zclerk melee mult=3/.test(readLog('clerk').slice(la)), i)
    t = Date.now()
    await cmd(`zzclerkhit ${ID} ${A}`)
    await until(async () => field(await info(), 'st') === 'fight', 2000)
    check('...the hit: "the clerk\'s armed", the clerk fights', field(await info(), 'st') === 'fight' && /clerk's armed/.test(text(A, t)), `${await info()} | ${text(A, t).slice(0, 300)}`)
    await hold(A, 4407, Y + 1, 4406.5, 700)
    const b3 = await bag(A)
    check('...every bill in the register is worth 3x ($300; the hands hold $1,000)', b3 > 0 && (b3 % 300 === 0 || b3 === 1000), String(b3))
    const struck = await until(() => /melee zclerk ClerkA/.test(readLog('clerk').slice(la)), 12000)
    check('...the clerk walks up and hits the robber with it', struck, readLog('clerk').slice(la).slice(-400))
    await cmd('zzcfgset clerk::gun-aim 100')
    la = readLog('clerk').length
    const armedG = await reopenArmed(0)
    i = await info()
    check('armed with a gun (melee 0): the Classic Pistol in hand, the cash x3.5', armedG && field(i, 'weapon') === 'gun' && field(i, 'mult') === '3.5' && /feather/.test(field(i, 'holding') || ''), i)
    await cmd(`zzclerkhit ${ID} ${A}`)
    const shot = await until(() => /gun zclerk ClerkA/.test(readLog('clerk').slice(la)), 10000)
    check('...the clerk shoots the robber in sight', shot, readLog('clerk').slice(la).slice(-400))
    await cmd(`dheist end ${ID}`)
    const unarmed = await until(async () => field(await info(), 'st') === 'idle' && field(await info(), 'weapon') === '<none>', 8000)
    check('...the run ends: weapon and bonus gone, the clerk calm', unarmed && field(await info(), 'mult') === '<none>', await info())
    await cmd('zzcfgset clerk::armed-chance 0')
    // ---------- No clerk: the register is open to anyone ----------
    await cmd(`dheist end ${ID}`)
    await cmd(`dheist open ${ID}`)
    await until(async () => field(await heist(), 'state') === 'open', 15000)
    const removed = await cmd(`dclerk ${ID} remove`)
    i = await info()
    check('/dclerk remove: no clerk, the register open', /no clerk any more/.test(removed) && field(i, 'shut') === 'false' && !/id=\d+/.test(i), `${removed} | ${i}`)
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd(`dheist delete ${ID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${ID}`).catch(() => {})
    await rcon.cmd(`minecraft:kill @e[tag=poi_h_${ID}]`).catch(() => {})
    await rcon.cmd('minecraft:kill @e[type=snowball,x=4385,y=190,z=4385,dx=60,dy=30,dz=60]').catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`zzbagclear ${name}`).catch(() => {})
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill 4390 ${Y - 1} 4390 4440 ${Y + 8} 4445 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
