// traps.sk: a test "Trap Hall" (x 768..782, z 768..794, difficulty 2) and an advanced "Camera Room"
// (x 788..804, difficulty 4) on a glass platform, set up with /dheist and /dtrap like staff would.
// Robbers walk east (+x) along lanes (z), from x 765.5 (outside) through the traps at x 771..773.
// Traps hurt (owner, 2026-09-25): D = max(1, round(d × 2 × m)) / 2 hearts, here m = 1.25 (difficulty 2)
// and 1.75 (difficulty 4). Checks: staff setup and refusals, laser displays, laser hits (the amount,
// through armor, the combat tag, again every second while standing in the beam), deaths when low
// (cause trap, the heist's p, no bounty, the death message), sneaking under a high laser, passive and
// creative players, dry mode, blinking lasers, pressure plates (once per step), collapsing floors (the
// fall puts you back on solid ground, strip, restore, restore 0 until the reset, disable), cameras
// (cone, wall, sneaking, creative, turret, alarm plate), damage settings, and the lifecycle (end,
// reload, dump round trip, remove, delete).
const fs = require('fs')
const path = require('path')
const conv = require('mineflayer/lib/conversions')
const { join, sleep, messagesSince, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'TrapA'
const B = 'TrapB'
const Y = 200
const CHUNKS = '760 764 805 796'
const FAR = '0.5 68 -656.5'
const LOG = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs', 'traps.log')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const bots = {}
  const cmd = async c => (await rcon.cmd(c)).trim()
  try {
    // ---------- Helpers ----------
    const member = async name => ((await cmd(`zzinheist ${name}`)).match(/INHEIST \S+ (\S+)/) || [])[1]
    const hunt = async name => ((await cmd(`zzinheist ${name}`)).match(/hunt=(\S+)/) || [])[1]
    const heistField = async (h, k) => ((await cmd(`zzheist ${h}`)).match(new RegExp(` ${k}=(\\S*)`)) || [])[1]
    const traps = async h => cmd(`zztrap ${h}`)
    const tfield = async (h, k) => ((await traps(h)).match(new RegExp(` ${k}=(\\S*)`)) || [])[1]
    const state = async id => cmd(`zztrapstate ${id}`)
    const displays = async tag => Number(((await cmd(`execute if entity @e[type=minecraft:block_display,tag=${tag}]`)).match(/Count: (\d+)/i) || [0, 0])[1])
    const hallDisplays = async () => Number(((await cmd('execute if entity @e[type=minecraft:block_display,tag=donating_trap,x=768,y=190,z=768,dx=14,dy=18,dz=26]')).match(/Count: (\d+)/i) || [0, 0])[1])
    const pos = async name => {
      const m = (await cmd(`data get entity ${name} Pos`)).match(/\[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/)
      return m ? m.slice(1).map(Number) : [NaN, NaN, NaN]
    }
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const data = async (name, key) => ((await cmd(`zzdata ${name} ${key}`)).match(/= (.*)$/m) || [])[1]
    const isBlock = async (x, y, z, b) => /passed/i.test(await cmd(`execute if block ${x} ${y} ${z} minecraft:${b}`))
    const logLines = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split(/\r?\n/).filter(l => l !== '') : [])
    let mark = 0
    const setMark = () => { mark = logLines().length }
    const logged = re => logLines().slice(mark).filter(l => re.test(l))
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const alive = async name => Number(((await cmd(`data get entity ${name} Health`)).match(/data: ([\d.]+)/) || [])[1]) > 0 && (await pos(name))[1] > 190
    // A death: the bot respawns at once, and Paper ignores all damage until the client says it has
    // loaded (Mineflayer never does; 60-tick fallback), so wait before the next trap test.
    const afterDeath = async () => { await sleep(4000) }
    const reset = async name => {
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`zzdata ${name} passive-switched none`)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzhp ${name} 20`)
    }
    const place = async (name, x, z, y = Y) => { await cmd(`zzheisttp ${name} ${x} ${y} ${z}`); await sleep(1300) }
    const walk = async (name, ms, sneak = false) => {
      const bot = bots[name]
      await bot.look(conv.fromNotchianYaw(-90), 0, true)
      if (sneak) bot.setControlState('sneak', true)
      bot.setControlState('forward', true)
      await sleep(ms)
      bot.setControlState('forward', false)
      bot.setControlState('sneak', false)
      await sleep(700)
    }
    // Walk a lane (z) from outside the hall at hp (20 = full, no regeneration: zzhp); returns the trap
    // log's hit lines, whether the bot died, and every line for the report.
    const lane = async (name, z, { ms = 2000, sneak = false, hp = 20 } = {}) => {
      await place(name, 765.5, z)
      await cmd(`zzhp ${name} ${hp}`)
      setMark()
      await walk(name, ms, sneak)
      return { hits: logged(new RegExp(`hit ${name} `)), died: logged(new RegExp(`kill ${name} `)).length > 0, lines: logLines().slice(mark).join(' / ') }
    }
    const tstate = async (id, k) => ((await state(id)).match(new RegExp(` ${k}=(\\S*)`)) || [])[1]

    // ---------- Build ----------
    for (const h of ['ztrap', 'ztrapa']) await cmd(`dheist delete ${h} confirm`)
    for (const r of ['heist_ztrap', 'heist_ztrapa']) await cmd(`rg remove -w world ${r}`)
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill 760 ${Y} 764 805 ${Y + 12} 796 air`)
    await cmd(`fill 760 ${Y - 1} 764 805 ${Y - 1} 796 glass`)
    await cmd(`fill 771 199 785 773 199 787 oak_planks`) // ztrap-6 floor, open sky below
    await cmd(`fill 771 199 789 771 199 791 oak_planks`) // ztrap-7 strip
    await cmd(`setblock 771 200 779 stone_pressure_plate`) // ztrap-4
    await cmd(`fill 798 200 781 798 202 783 stone`) // the camera room's wall
    await cmd(`setblock 792 200 790 stone_pressure_plate`) // ztrapa-2 (alarm plate)
    await cmd('zzcfgreload')
    await cmd('zzcfgtext heist::start-on enter') // the clock at the first entry: these heists have no loot
    await cmd('zzregion heist_ztrap 768 190 768 782 208 794')
    await cmd('zzregion heist_ztrapa 788 196 768 804 208 796')
    for (const c of ['dheist create ztrap 2', 'dheist set ztrap name Trap Hall', 'dheist set ztrap escape 600', 'dheist set ztrap cooldown 5', 'dheist exit ztrap 764.5 200 781.5 -90', 'dheist snapshot ztrap',
      'dheist create ztrapa 4', 'dheist set ztrapa name Camera Room', 'dheist set ztrapa escape 600', 'dheist set ztrapa cooldown 5', 'dheist exit ztrapa 785.5 200 780.5 -90', 'dheist snapshot ztrapa']) await cmd(c)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await reset(name)
      await cmd(`lp user ${name} permission unset donating.staff`)
    }
    await place(A, 764.5, 766.5)
    await place(B, 764.5, 767.5)
    await sleep(5000) // bots can't be hurt until about 6 s after joining

    // ---------- Staff setup ----------
    check('an unknown heist is refused', /unknown heist/.test(await cmd('dtrap add nosuch laser 1 2 3 4 5 6')))
    check('a laser end outside the heist is refused', /outside the heist/.test(await cmd('dtrap add ztrap laser 766 200.9 770 771.5 200.9 770')))
    check('a laser longer than 32 blocks is refused', /too long/.test(await cmd('dtrap add ztrap laser 771.5 200.9 769 771.5 200.9 810')))
    check('alarm traps need an advanced heist', /needs an advanced heist/.test(await cmd('dtrap add ztrap laser 771.5 200.9 769 771.5 200.9 772 effect=alarm')))
    const adds = [
      'dtrap add ztrap laser 771.5 200.9 769 771.5 200.9 772', // 1: lane 770.5, waist
      'dtrap add ztrap laser 771.5 201.65 772 771.5 201.65 775', // 2: lane 773.5, high (sneak under)
      'dtrap add ztrap laser 771.5 200.4 775 771.5 200.4 778', // 3: lane 776.5, low
      'dtrap add ztrap plate 771 200 779', // 4: lane 779.5
      'dtrap add ztrap laser 769.5 200.5 781 773.5 201.5 784', // 5: lane 782.5, sloped
      'dtrap add ztrap floor 771 199 785 773 199 787', // 6: lane 786.5
      'dtrap add ztrap floor 771 199 789 771 199 791', // 7: lane 790.5, 1-wide strip
      'dtrap add ztrap laser 771.5 200.9 792.2 771.5 200.9 794.8 blink=true', // 8: lane 793.5
      'dtrap add ztrapa camera 803.5 202.5 780.5 90 15', // ztrapa-1, facing west, 15° down
      'dtrap add ztrapa plate 792 200 790 effect=alarm' // ztrapa-2
    ]
    const replies = []
    for (const c of adds) replies.push(await cmd(c))
    const list = await cmd('dtrap list ztrap')
    check('10 traps added with ids <heist>-<n>', replies.every(r => /added/.test(r)) && /ztrap-8 laser/.test(list) && /ztrapa-2 added/.test(replies[9]) && /ztrap-1 laser .* len=3/.test(list), replies.join(' / '))
    let t = Date.now()
    bots[A].chat('/dtrap list ztrap')
    await sleep(800)
    check('/dtrap is staff only', /Staff only/.test(text(A, t)), text(A, t))
    check('no displays while the heist is disabled', (await displays('donating_trap')) === 0 && /armed=false/.test(await traps('ztrap')))
    await cmd('dheist enable ztrap')
    await cmd('dheist enable ztrapa')
    const armed = await until(async () => /armed=true/.test(await traps('ztrap')) && /armed=true/.test(await traps('ztrapa')), 6000)
    await sleep(1000)
    const scale1 = await cmd('data get entity @e[type=minecraft:block_display,tag=donating_trap,limit=1,sort=nearest,x=771.5,y=200.9,z=769] transformation.scale')
    const rot5 = await cmd('data get entity @e[type=minecraft:block_display,tag=donating_trap,limit=1,sort=nearest,x=769.5,y=200.5,z=781] Rotation')
    check('enabled: traps arm, one display per laser and camera (5 + 1)', armed && (await displays('donating_trap')) === 6, `${await traps('ztrap')} / ${await traps('ztrapa')} / ${await displays('donating_trap')}`)
    check('a laser display is a thin rod as long as the beam; a sloped one is turned to match', /\[0\.06f, 0\.06f, 3\.0f\]/.test(scale1) && /\[306\.8\d*f, -11\.3\d*f\]/.test(rot5), `${scale1} / ${rot5}`)
    await place(A, 772.5, 768.5) // inside, clear of every trap
    const addInside = await cmd('dtrap add ztrap laser 771.5 200.9 769 771.5 200.9 772')
    check('adding a trap while robbers are inside is refused', /robbers are inside/.test(addInside), addInside)
    await place(A, 764.5, 766.5)

    // ---------- Lasers ----------
    await cmd(`zztestkit ${A}`)
    await cmd(`eco set ${A} 100000`)
    let r = await lane(A, 770.5)
    check('walking into a laser hurts once: 3♥ × 1.25 = 8 HP (20 -> 12), and they keep going', r.hits.length === 1 && /ztrap-1 laser dmg=8 hp=20->12 /.test(r.hits[0]) && !r.died && (await member(A)) === 'ztrap' && (await pos(A))[0] > 772, r.lines)
    check('...the hit tags them in combat as a trap', /tagged=true .*cause=trap/.test(await cmd(`zzcombat ${A}`)), await cmd(`zzcombat ${A}`))
    await cmd(`item replace entity ${A} armor.chest with minecraft:diamond_chestplate`)
    r = await lane(A, 770.5)
    check('...a vest doesn\'t soften it (8 HP through diamond armor)', r.hits.length === 1 && /dmg=8 hp=20->12 /.test(r.hits[0]), r.lines)
    await cmd(`item replace entity ${A} armor.chest with minecraft:air`)
    // Standing in the beam: hurt again every second.
    await cmd(`zzhp ${A} 20`)
    setMark()
    await cmd(`zzheisttp ${A} 771.5 200 770.5`)
    await sleep(1600)
    await cmd(`zzheisttp ${A} 764.5 200 766.5`)
    const stayHits = logged(/hit TrapA \S+ ztrap-1 /)
    check('standing in a beam hurts again every second (2 hits in 1.6 s: 20 -> 12 -> 4)', stayHits.length === 2 && /hp=12->4 /.test(stayHits[1]), logLines().slice(mark).join(' / '))
    await sleep(1000)
    await cmd(`zzcombatend ${A}`)
    t = Date.now()
    r = await lane(A, 770.5, { hp: 6 })
    check('a robber with 3 hearts left dies to it', r.died && logged(/kill TrapA \S+ ztrap-1 laser dmg=8 /).length === 1 && (await member(A)) === 'none', r.lines)
    check('...a trap death at the heist\'s p: L = min(100,000 × 2%, min(6,000, 12,000)) = $2,000', (await bal(A)) === 98000 && (await data(A, 'last-death-cause')) === 'trap', `${await bal(A)} / ${await data(A, 'last-death-cause')}`)
    check('...and everyone reads which trap', /walked into a laser in the Trap Hall/.test(text(B, t)), text(B, t))
    await afterDeath()
    // A player's hit a moment before still counts as the trap (no bounty for the hitter).
    await reset(A)
    await place(A, 765.5, 770.5)
    await sleep(4200) // EssentialsX: no PvP right after a teleport
    await cmd(`zzbountyreset ${B}`)
    await cmd(`zzshieldoff ${A}`)
    await cmd(`zzhp ${A} 6`)
    await cmd(`damage ${A} 1 minecraft:player_attack by ${B}`)
    const hitLanded = / tagged=true .*cause=player:/.test(await cmd(`zzcombat ${A}`))
    setMark()
    await walk(A, 2000)
    check('shot by a player just before: still a trap death, no bounty for them', hitLanded && logged(/kill TrapA \S+ ztrap-1/).length === 1 && (await data(A, 'last-death-cause')) === 'trap' && Number(((await cmd(`zzbounty ${B}`)).match(/BOUNTY \S+ (\d+)/) || [])[1] || 0) === 0, `${await data(A, 'last-death-cause')} / ${await cmd(`zzbounty ${B}`)}`)
    await afterDeath()
    await reset(A)
    r = await lane(A, 773.5)
    check('a high laser hurts a robber walking upright', r.hits.length === 1 && /ztrap-2 laser/.test(r.hits[0]), r.lines)
    await place(A, 764.5, 766.5)
    r = await lane(A, 773.5, { ms: 6500, sneak: true })
    check('...and sneaking under it is safe', r.hits.length === 0 && !r.died && (await member(A)) === 'ztrap' && (await pos(A))[0] > 772, `${await pos(A)} ${r.lines}`)
    await place(A, 764.5, 766.5)
    r = await lane(A, 776.5)
    check('a low laser hurts a robber who walks into it', r.hits.length === 1 && /ztrap-3 laser/.test(r.hits[0]), r.lines)
    await place(A, 764.5, 766.5)
    const probes = [
      await cmd('zztrapprobe ztrap 771.5 200 776.5 stand'), await cmd('zztrapprobe ztrap 771.5 200.6 776.5 stand'),
      await cmd('zztrapprobe ztrap 771.5 200 770.5 sneak'), await cmd('zztrapprobe ztrap 771.5 200.95 770.5 stand'),
      await cmd('zztrapprobe ztrap 771.5 200 773.5 stand'), await cmd('zztrapprobe ztrap 771.5 200 773.5 sneak')]
    check('heights: a jump clears the low laser, the waist laser hits a sneaker but not a high jump, the high laser only standing', /PROBE 3/.test(probes[0]) && /none/.test(probes[1]) && /PROBE 1/.test(probes[2]) && /none/.test(probes[3]) && /PROBE 2/.test(probes[4]) && /none/.test(probes[5]), probes.join(' / '))
    await cmd(`zzpassive ${A} on`)
    r = await lane(A, 770.5)
    check('passive robbers get hurt by traps too', r.hits.length === 1, r.lines)
    await place(A, 764.5, 766.5)
    await reset(A)
    await cmd(`gamemode creative ${B}`)
    setMark()
    await place(B, 765.5, 770.5)
    await walk(B, 2000)
    check('creative staff walk through (not robbers)', logged(/(hit|kill) TrapB/).length === 0 && (await member(B)) === 'none')
    await cmd(`gamemode survival ${B}`)
    await place(B, 764.5, 767.5)
    // Sprinting through the sloped laser: sampling the path catches it.
    let sprintHits = 0
    for (let i = 0; i < 2; i++) {
      await place(A, 765.5, 782.5)
      await cmd(`zzhp ${A} 20`)
      setMark()
      bots[A].setControlState('sprint', true)
      await walk(A, 1600)
      bots[A].setControlState('sprint', false)
      if (logged(/hit TrapA \S+ ztrap-5/).length === 1) sprintHits++
    }
    check('sprinting through a sloped laser still hits (2/2)', sprintHits === 2, `${sprintHits}/2`)
    await place(A, 764.5, 766.5)
    await cmd(`dtrap dry ${A} on`)
    t = Date.now()
    r = await lane(A, 770.5)
    check('dry mode: a "DRY HIT" instead of the damage', r.hits.length === 0 && logged(/dry TrapA ztrap-1/).length >= 1 && (await member(A)) === 'ztrap', r.lines)
    await cmd(`dtrap dry ${A} off`)
    await place(A, 764.5, 766.5)

    // ---------- Blinking ----------
    let seenOn = false
    let seenOff = false
    for (let i = 0; i < 20 && !(seenOn && seenOff); i++) {
      const st = await state('ztrap-8')
      if (/vis=true/.test(st)) seenOn = true
      if (/vis=false/.test(st)) seenOff = true
      await sleep(300)
    }
    check('a blinking laser turns on and off', seenOn && seenOff)
    // Walk through right after it turns off (2 s off is plenty).
    await place(A, 769.5, 793.5) // 2 blocks before the beam line
    await until(async () => /vis=true/.test(await state('ztrap-8')), 5000)
    await until(async () => /vis=false/.test(await state('ztrap-8')), 5000)
    setMark()
    await walk(A, 900)
    check('walking through while it\'s off is safe', logged(/(hit|kill) TrapA/).length === 0 && (await pos(A))[0] > 772, `${await pos(A)}`)
    await until(async () => /vis=false/.test(await state('ztrap-8')), 5000)
    await cmd(`zzhp ${A} 20`)
    setMark()
    await place(A, 771.5, 793.5) // in the beam line while it's off
    const blinkHit = await until(async () => logged(/hit TrapA \S+ ztrap-8/).length >= 1, 5000)
    await place(A, 764.5, 766.5)
    const phase = Number(((logged(/hit TrapA \S+ ztrap-8/)[0] || '').match(/phase=(\d+)/) || [])[1])
    check('standing in the line when it comes back on hurts, only after the lead time', blinkHit && phase >= 4, logged(/ztrap-8/).join(' / '))
    await reset(A)

    // ---------- Plates ----------
    await cmd(`gamemode creative ${B}`)
    await place(B, 765.5, 779.5)
    await walk(B, 2000)
    const unpressed = await isBlock(771, 200, 779, 'stone_pressure_plate[powered=false]')
    await cmd(`gamemode survival ${B}`)
    await place(B, 764.5, 767.5)
    r = await lane(A, 779.5)
    check('a creative player walking over a trap plate doesn\'t press it (it still works after)', unpressed && r.hits.length >= 1, `unpressed ${unpressed}`)
    check('stepping on a pressure plate hurts once per step: 4♥ × 1.25 = 10 HP', r.hits.length === 1 && /ztrap-4 plate dmg=10 hp=20->10 /.test(r.hits[0]), r.lines)
    // Standing on it: no second hit. Off and back on: a new step.
    await cmd(`zzhp ${A} 20`)
    setMark()
    await cmd(`zzheisttp ${A} 771.5 200 779.5`)
    await sleep(1500)
    const standHits = logged(/hit TrapA \S+ ztrap-4/).length
    await cmd(`zzheisttp ${A} 769.5 200 779.5`)
    await sleep(600)
    await cmd(`zzhp ${A} 20`)
    await cmd(`zzheisttp ${A} 771.5 200 779.5`)
    await sleep(800)
    const againHits = logged(/hit TrapA \S+ ztrap-4/).length
    await place(A, 764.5, 766.5)
    check('standing on a plate doesn\'t hurt again; stepping off and back on does', standHits === 1 && againHits === 2, `${standHits} ${againHits} ${logLines().slice(mark).join(' / ')}`)
    await cmd(`zzcombatend ${A}`)
    t = Date.now()
    r = await lane(A, 779.5, { hp: 8 })
    check('...the plate never goes down, and a death on it says so', r.died && await isBlock(771, 200, 779, 'stone_pressure_plate[powered=false]') && /stepped on a trap/.test(text(B, t)), `${r.lines} | ${text(B, t)}`)
    await afterDeath()
    await reset(A)

    // ---------- Floors ----------
    r = await lane(A, 786.5, { ms: 1700 })
    await until(async () => logged(/hit TrapA \S+ ztrap-6 floor/).length >= 1, 3000)
    await sleep(300)
    const p6 = await pos(A)
    check('a collapsing floor drops the robber: 4♥ × 1.25 = 10 HP, and they\'re put back on the solid ground before it', logged(/collapse ztrap-6/).length === 1 && logged(/hit TrapA \S+ ztrap-6 floor dmg=10 hp=20->10 /).length === 1 && (await member(A)) === 'ztrap' && p6[0] > 768 && p6[0] < 770.8 && Math.abs(p6[1] - 200) < 0.01, `${p6} ${logLines().slice(mark).join(' / ')}`)
    await place(A, 764.5, 766.5)
    const gone = await isBlock(772, 199, 786, 'air')
    await place(B, 770.2, 786.5) // waiting on the west rim, next to the hole
    const back = await until(async () => isBlock(772, 199, 786, 'oak_planks'), 13000)
    check('...and comes back about 10 s later, even with a robber waiting on the rim', gone && back)
    await place(B, 764.5, 767.5)
    await reset(A)
    r = await lane(A, 790.5)
    const stripGone = await until(async () => isBlock(771, 199, 790, 'air'), 2000)
    check('walking over a 1-wide strip without stopping is safe (it falls behind you)', r.hits.length === 0 && !r.died && (await member(A)) === 'ztrap' && stripGone, `${await pos(A)} ${r.lines}`)
    await place(A, 764.5, 766.5)
    await cmd('dtrap set ztrap-6 delay 3')
    await place(B, 772.5, 786.5, 200)
    await until(async () => /floor=crack/.test(await state('ztrap-6')), 3000)
    const bBefore = await bal(B)
    await cmd(`zzcombatend ${B}`)
    await cmd(`eco set ${B} 100000`)
    await cmd(`zztestkit ${B}`)
    await until(async () => /floor=crack/.test(await state('ztrap-6')), 3000)
    // B is on a cracking floor (tagged "trap"): logging out now is a trap death.
    await sleep(300)
    await quit(bots[B])
    await sleep(1500)
    check('logging out on a cracking floor counts as a trap death', (await data(B, 'last-death-cause')) === 'trap' && (await bal(B)) === 98000, `${bBefore} -> ${await bal(B)}; ${await data(B, 'last-death-cause')}`)
    bots[B] = await join(B)
    await reset(B)
    await cmd('dtrap set ztrap-6 delay default')
    await until(async () => isBlock(772, 199, 786, 'oak_planks'), 13000)
    await cmd('dtrap set ztrap-6 restore 0')
    r = await lane(A, 786.5, { ms: 1700 })
    const fell = await until(async () => logged(/hit TrapA \S+ ztrap-6 floor/).length >= 1, 3000)
    await place(A, 764.5, 766.5)
    await sleep(12000)
    const stillGone = await isBlock(772, 199, 786, 'air')
    await cmd('dheist end ztrap')
    const resetBack = await until(async () => (await isBlock(772, 199, 786, 'oak_planks')) && /6:up/.test(await traps('ztrap')), 8000)
    check('restore 0: the floor stays down until the room reset', fell && stillGone && resetBack, `${fell} ${stillGone} ${resetBack} ${await traps('ztrap')}`)
    await cmd('dtrap set ztrap-6 restore default')
    await reset(A)
    check('after the cooldown the heist reopens with its traps armed again', await until(async () => /armed=true/.test(await traps('ztrap')) && (await tfield('ztrap', 'displays')) === '5', 12000), await traps('ztrap'))
    // Collapse a floor, then disable: it comes back at once, and nothing is left.
    await cmd('dtrap set ztrap-6 delay 0')
    await place(A, 772.5, 786.5, 200)
    await until(async () => isBlock(772, 199, 786, 'air'), 3000)
    await cmd('dheist disable ztrap')
    await sleep(1200)
    check('disable: collapsed floors come back at once, no displays left', (await isBlock(772, 199, 786, 'oak_planks')) && (await hallDisplays()) === 0 && /armed=false/.test(await traps('ztrap')), `${await traps('ztrap')} entities=${await hallDisplays()}`)
    await cmd('dtrap set ztrap-6 delay default')
    await place(A, 764.5, 766.5)
    await reset(A)
    // Damage settings: per trap (hearts before the heist's multiplier) and per heist.
    const d0 = await tstate('ztrap-1', 'dmg')
    await cmd('dtrap set ztrap-1 damage 5')
    const d1 = await tstate('ztrap-1', 'dmg')
    await cmd('dheist set ztrap trap-damage 2')
    const d2 = await tstate('ztrap-1', 'dmg')
    const d3 = await tstate('ztrap-4', 'dmg')
    const badDamage = await cmd('dtrap set ztrap-1 damage 0')
    await cmd('dtrap set ztrap-1 damage default')
    await cmd('dheist set ztrap trap-damage default')
    const d4 = await tstate('ztrap-1', 'dmg')
    check('damage settings: 3♥ × 1.25 = 4♥; damage=5 -> 6.5♥; trap-damage 2 -> 10♥ and the plate 8♥; 0 is refused; defaults back to 4♥', d0 === '4' && d1 === '6.5' && d2 === '10' && d3 === '8' && /bad value/.test(badDamage) && d4 === '4', `${d0} ${d1} ${d2} ${d3} ${d4} ${badDamage}`)
    await cmd('dheist enable ztrap')
    await until(async () => /armed=true/.test(await traps('ztrap')), 8000)

    // ---------- Cameras (ztrapa, advanced) ----------
    const watch = async (x, z, { sneak = false, ms = 3000 } = {}) => {
      if (sneak) { bots[A].setControlState('sneak', true); await sleep(300) } // sneaking before it's in view
      await place(A, x, z)
      const tripped = await until(async () => (await heistField('ztrapa', 'alarm')) !== 'none', ms)
      bots[A].setControlState('sneak', false)
      return tripped
    }
    check('outside the camera\'s cone: not seen', !(await watch(797.5, 788.5)))
    check('behind a wall: not seen', !(await watch(795.5, 782.5)))
    check('sneaking far away: not seen', !(await watch(795.5, 780.5, { sneak: true })))
    setMark()
    check('in the cone with a clear view: the alarm trips within a second or two', await watch(796.5, 780.5), await cmd('zzheist ztrapa'))
    check('...logged as the camera, and the robber is hunted', /source=camera:ztrapa-1/.test(fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs', 'heists.log'), 'utf8').split(/\r?\n/).filter(Boolean).slice(-40).join(' ')) && (await hunt(A)) === 'ztrapa')
    await cmd('dheist end ztrapa')
    await until(async () => (await heistField('ztrapa', 'state')) === 'open', 12000)
    check('sneaking close by: seen', await watch(799.5, 780.5, { sneak: true }), await cmd('zzheist ztrapa'))
    await cmd('dheist end ztrapa')
    await until(async () => (await heistField('ztrapa', 'state')) === 'open', 12000)
    await cmd(`gamemode creative ${B}`)
    await place(B, 796.5, 780.5)
    const staffSeen = await until(async () => (await heistField('ztrapa', 'alarm')) !== 'none', 3000)
    check('creative staff aren\'t seen', !staffSeen)
    await cmd(`gamemode survival ${B}`)
    await place(B, 764.5, 767.5)
    await place(A, 764.5, 766.5)
    // A turret: a camera that shoots (any heist).
    await cmd('dheist set ztrapa advanced false')
    const inert = /INERT/.test(await cmd('dtrap list ztrapa'))
    await cmd('dtrap set ztrapa-1 effect damage')
    await cmd(`zzhp ${A} 20`)
    setMark()
    await place(A, 796.5, 780.5)
    const turret = await until(async () => logged(/hit TrapA \S+ ztrapa-1 camera dmg=5 /).length >= 2, 5000)
    await place(A, 764.5, 766.5)
    check('an alarm camera in a heist that isn\'t advanced is marked INERT; effect=damage makes it a turret that keeps shooting while it sees you (1.5♥ × 1.75 = 5 HP a shot)', inert && turret, logLines().slice(mark).join(' / '))
    await cmd('dtrap set ztrapa-1 effect default')
    await cmd('dheist set ztrapa advanced default')
    await afterDeath()
    await reset(A)
    await until(async () => (await heistField('ztrapa', 'alarm')) === 'none', 3000)
    await place(A, 788.5, 790.5)
    setMark()
    await walk(A, 1500)
    const plateAlarm = await until(async () => (await heistField('ztrapa', 'alarm')) !== 'none', 3000)
    check('an alarm plate trips the alarm and doesn\'t hurt', plateAlarm && logged(/alarm TrapA ztrapa-2 tripped=true/).length === 1 && logged(/(hit|kill) TrapA/).length === 0 && (await hunt(A)) === 'ztrapa', logLines().slice(mark).join(' / '))
    await cmd('dheist end ztrapa')

    // ---------- Lifecycle ----------
    await place(A, 764.5, 766.5)
    await cmd('dheist start ztrap')
    await cmd('dheist end ztrap')
    check('a closed heist has no trap displays', await until(async () => (await hallDisplays()) === 0 && /armed=false/.test(await traps('ztrap')), 3000), `${await traps('ztrap')} entities=${await hallDisplays()}`)
    await until(async () => /armed=true/.test(await traps('ztrap')), 12000)
    await cmd('sk reload traps')
    await sleep(2500)
    check('/sk reload traps: displays come back once, no duplicates', (await displays('donating_trap')) === 6 && /displays=5/.test(await traps('ztrap')), `${await displays('donating_trap')} ${await traps('ztrap')}`)
    const dump = (await cmd('dtrap dump ztrap')).split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('dtrap add'))
    const before = (await cmd('dtrap list ztrap')).replace(/armed=\w+/, '')
    await cmd('dheist disable ztrap')
    await cmd('dtrap clear ztrap confirm')
    await cmd('dheist delete ztrap confirm') // also resets the numbering
    for (const c of ['dheist create ztrap 2', 'dheist set ztrap name Trap Hall']) await cmd(c)
    for (const line of dump) await cmd(line)
    const after = (await cmd('dtrap list ztrap')).replace(/armed=\w+/, '')
    check('dump round trip: replaying the dump recreates the same traps', dump.length === 8 && after === before, `${dump.length} lines; ${before === after}`)
    await cmd('dtrap remove ztrap-8')
    check('remove takes one trap away', !/ztrap-8/.test(await cmd('dtrap list ztrap')))
    await cmd('dheist delete ztrap confirm')
    check('deleting the heist deletes its traps', /unknown heist/.test(await cmd('dtrap list ztrap')) && /traps=0/.test(await traps('ztrap')))
    const bench = await cmd(`zztrapbench ${A} 200`)
    console.error(`bench: ${bench}`)
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`dtrap dry ${name} off`).catch(() => {})
      await rcon.cmd(`gamemode survival ${name}`).catch(() => {})
      await rcon.cmd(`zzpassive ${name} off`).catch(() => {})
      await rcon.cmd(`zzdata ${name} passive-switched none`).catch(() => {})
      await rcon.cmd(`zzcombatend ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot)
    for (const h of ['ztrap', 'ztrapa']) await rcon.cmd(`dheist delete ${h} confirm`).catch(() => {})
    for (const r of ['heist_ztrap', 'heist_ztrapa']) await rcon.cmd(`rg remove -w world ${r}`).catch(() => {})
    await rcon.cmd(`fill 760 ${Y} 764 805 ${Y + 12} 796 air`).catch(() => {})
    await rcon.cmd(`fill 760 ${Y - 1} 764 805 ${Y - 1} 796 air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
