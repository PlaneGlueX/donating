// GPS paths and the big map's zoom (DonatingPhone 2026-10-14: Paths.java, /dphone path, /dphone zoom; the owner, playtesting
// the prison: "have a way to set paths that the GPS follows (so then it doesnt go through walls)" and "load the whole island
// then allow the player to zoom in on their location").
//   - Staff paths: addat with ids, link, list, dump (the lines and paths-dump.txt), saved in paths.yml.
//   - The way goes along the path, through the wall's gap and up the stairs, never straight through the wall: the dot
//     (the next corner) stays on the player's side; a link just behind the wall (shorter, but hidden) isn't taken.
//   - Up the stairs: "up" as the turn; the dot at the path's height; under the target's floor isn't "arrived", on it is.
//   - The trail for that player only; the way in doesn't flicker standing still; far from every link: a straight line.
//   - The big map's zoom (sneak, or /dphone zoom): around the player, never past the city's edge; a pin dropped on the
//     zoomed map lands where the cursor is (near the player), not in the city's middle.
//   - Another world's own city (/dphone city scan ... <world>): players there see it, the main city stays for the rest.
// The test platform is in the main world's sky at x 7898-7972, z 7898-7932 (y 179-190); the zoom spot in the local test
// city's south-east corner (x 183-188, z -458..-452, y 199); the other world's city a 64x64 box of the jailbreak world at
// x/z 600-663 (its cities/jailbreak.bin is put aside and back).
const fs = require('fs')
const path = require('path')
const { join, sleep, quit } = require('../lib')
const rconLib = require('../rcon')

const A = 'PathA'
const B = 'PathB'
const W = 'world'
const Y = 180
const BOX = '7898 179 7898 7972 190 7932'
const CHUNKS = '7898 7898 7972 7932'
// Path nodes (ids 9001-9008, so the owner's graph never collides).
const N = {
  1: [7905.5, 180, 7915.5], // west room
  2: [7916.5, 180, 7927.5], // the gap, west side
  3: [7924.5, 180, 7927.5], // the gap, east side
  4: [7930.5, 180, 7917.5], // the stairs' foot
  5: [7930.5, 185, 7909.5], // the stairs' top (the mezzanine)
  6: [7935.5, 185, 7905.5], // on the mezzanine
  7: [7922.5, 180, 7905.5], // a decoy link just behind the wall (under the mezzanine)...
  8: [7922.5, 180, 7914.5] //  ...joined to the stairs' foot
}
const ID = k => 9000 + Number(k)
const LINKS = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [7, 8], [8, 4]]
const TARGET = [7936.5, 185, 7903.5]
const START = [7908.5, 180, 7905.5]
// The zoom spot: the test city (maps 0/20/23/24: x -64..191, z -704..-449, 1 block a pixel) near its south-east corner.
const ZOOM_AT = [185.5, 200, -455.5]
const FAR = '0.5 68 -656.5'
const DP = path.join(__dirname, '..', '..', 'server', 'plugins', 'DonatingPhone')
const OWN = path.join(DP, 'cities', 'jailbreak.bin')
const OWN_BAK = OWN + '.gpspaths-bak'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  let ownMoved = false
  try {
    const field = (s, k) => (s.match(new RegExp(`${k}=(\\S*)`)) || [])[1] || ''
    const num = (s, k) => Number(field(s, k))
    const xyz = (s, k) => field(s, k).split(',').map(Number)
    const gps = async () => cmd(`dphone gps ${A}`)
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(200) }
      return Boolean(await fn())
    }
    const tp = async (p, w = 'overworld') => { await cmd(`execute in minecraft:${w} run minecraft:tp ${A} ${p.join(' ')}`); await sleep(700) }

    // ---------- Setup: two rooms, a wall with a gap, stairs up to a mezzanine ----------
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${BOX} air`)
    await cmd('fill 7898 179 7898 7972 179 7932 smooth_stone')
    await cmd('fill 7920 180 7898 7920 184 7932 stone') // the wall...
    await cmd('fill 7920 180 7927 7920 181 7928 air') // ...its gap
    await cmd('fill 7922 184 7898 7940 184 7910 stone') // the mezzanine (stand at y 185)
    for (let i = 0; i < 5; i++) await cmd(`setblock 7930 ${180 + i} ${7915 - i} stone_brick_stairs[facing=north]`)
    for (const k of Object.keys(N)) await cmd(`dphone path remove ${ID(k)}`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
    }
    const particles = { [A]: 0, [B]: 0 }
    for (const name of [A, B]) bots[name]._client.on('world_particles', () => { particles[name]++ })
    let mapPackets = 0
    bots[A]._client.on('map', p => { if (p.columns) mapPackets++ })
    await sleep(2500) // gps.sk's first push (clear, active none) has gone out
    await tp(START)
    await cmd(`execute in minecraft:overworld run minecraft:tp ${B} 7910.5 180 7910.5`)
    await cmd(`dphone gps ${A} clear`)

    // ---------- Staff paths ----------
    const added = []
    for (const [k, p] of Object.entries(N)) added.push(await cmd(`dphone path addat ${W} ${p.join(' ')} id=${ID(k)} nolink ${k === '5' ? 'Stairs top' : ''}`.trim()))
    for (const [a, b] of LINKS) await cmd(`dphone path link ${ID(a)} ${ID(b)}`)
    const list = await cmd(`dphone path list ${W}`)
    check('/dphone path addat (with ids) and link: the nodes and links are there', added.every(r => /PATH added #9\d{3}/.test(r)) && /#9005@7930\.5,185\.0,7909\.5\(Stairs top\)->9004,9006/.test(list) && /#9004@\S*->9003,9005,9008/.test(list), `${added.join(' | ')} || ${list.slice(0, 400)}`)
    await sleep(1600) // the save is queued (once a second at most)
    const yml = fs.existsSync(path.join(DP, 'paths.yml')) ? fs.readFileSync(path.join(DP, 'paths.yml'), 'utf8') : ''
    check('...saved in paths.yml', /9005'?: ['"]?world\|7930\.5\|185\.0\|7909\.5\|Stairs top/.test(yml) && /9004-9005/.test(yml), yml.slice(0, 300))

    // ---------- The way along the path ----------
    await cmd(`dphone gps ${A} set quest ${W} 3 ${TARGET.join(',')} Mezzanine`)
    await cmd(`dphone gps ${A} active quest`)
    let s = ''
    await until(async () => { s = await gps(); return /way=path/.test(s) }, 4000)
    const via = field(s, 'via').split(',').map(Number)
    const straight = Math.hypot(TARGET[0] - START[0], TARGET[1] - START[1], TARGET[2] - START[2])
    check('in a world with paths the way goes along them: through the gap and up the stairs', /way=path/.test(s) && /state=route/.test(s) && via[0] === ID(1) && via.includes(ID(2)) && via.includes(ID(3)) && via.includes(ID(5)) && num(s, 'left') > straight * 1.6, `${s} (straight ${straight.toFixed(1)})`)
    check('...never through the wall: the first point and the dot (the next corner) are on the player\'s side', xyz(s, 'first')[0] < 7920 && xyz(s, 'next')[0] < 7920, s)
    check('...and a link just behind the wall (shorter, but hidden) isn\'t taken', !via.includes(ID(7)) && !via.includes(ID(8)) && field(s, 'pick') !== '', s)
    const picks = []
    for (let i = 0; i < 5; i++) { picks.push(field(await gps(), 'pick')); await sleep(300) }
    check('standing still the way in doesn\'t change (no flicker)', picks.every(p => p === picks[0] && p !== ''), picks.join(' '))
    particles[A] = particles[B] = 0
    await sleep(1600)
    check('the dust trail along the path: for the player only', particles[A] >= 4 && particles[B] === 0, `A=${particles[A]} B=${particles[B]}`)

    // In front of the stairs: "up" next.
    await tp([7928.5, 180, 7921.5])
    await until(async () => { s = await gps(); return /turn=up@/.test(s) }, 3000)
    const next = xyz(s, 'next')
    check('in front of the stairs: the next corner is their foot, and the turn there is "up"', /turn=up@/.test(s) && field(s, 'via').split(',')[0] === String(ID(4)) && Math.abs(next[0] - 7930.5) < 1 && Math.abs(next[2] - 7917.5) < 1, s)
    check('...the dot at the path\'s own height (not on the roof)', next[1] > 180 && next[1] < 183, s)

    // Under the target's floor: not there yet (the old 12-block rule said "arrived"); on it: arrived.
    await tp([TARGET[0], 180, TARGET[2]])
    await sleep(600)
    s = await gps()
    check('right under the target, a floor down: not arrived, and the way goes back up the stairs', /state=route/.test(s) && field(s, 'via').split(',').includes(String(ID(5))), s)
    await tp(TARGET)
    const arrived = await until(async () => /state=arrived/.test(await gps()), 3000)
    check('...on its floor: arrived', arrived, await gps())

    // Far from every link (and from the target): a straight line, as before.
    await tp([7965.5, 180, 7905.5])
    await until(async () => { s = await gps(); return /way=direct/.test(s) && /state=direct/.test(s) }, 4000)
    check('more than paths.range blocks from every link: no path, the old straight line', /way=direct/.test(s) && /state=direct/.test(s), s)

    // Dump: the lines that make it again.
    const dump = await cmd(`dphone path dump ${W}`)
    const dumpFile = fs.existsSync(path.join(DP, 'paths-dump.txt')) ? fs.readFileSync(path.join(DP, 'paths-dump.txt'), 'utf8') : ''
    check('/dphone path dump: clear, every node with its id, then the links (also in paths-dump.txt)', /dphone path addat world 7930\.5 185\.0 7909\.5 id=9005 nolink Stairs top/.test(dumpFile) && /dphone path link 9004 9005/.test(dumpFile) && /dphone path clear world confirm/.test(dumpFile) && /paths-dump\.txt/.test(dump), dumpFile.slice(0, 300))
    await cmd(`dphone gps ${A} clear`)

    // ---------- The big map's zoom ----------
    await cmd('fill 183 199 -458 188 199 -452 smooth_stone')
    await tp(ZOOM_AT)
    const status = async () => cmd(`dphone status ${A}`)
    bots[A].setQuickBarSlot(8)
    await sleep(800)
    bots[A].activateItem()
    await sleep(100)
    bots[A].deactivateItem()
    let st = ''
    const opened = await until(async () => { st = await status(); return /open=true/.test(st) && !/cursor=-1/.test(st) && /,big/.test(st) }, 5000)
    const view = () => field(st, 'view').split(',')
    check('the big map opens on the whole city (zoom 1: the middle, 2 city pixels a screen pixel)', opened && /zoom=1/.test(st) && view()[0] === '128.0' && view()[1] === '128.0' && view()[2] === '2.0', st)
    await cmd(`dphone zoom ${A} 4`)
    await until(async () => { st = await status(); return view()[2] === '0.5' }, 3000)
    check('zoomed in x4: around the player, but never past the city\'s edge (the corner clamps it)', /zoom=4/.test(st) && view()[0] === '224.0' && view()[1] === '224.0' && view()[2] === '0.5', st)
    // A left-click drops the pin where the cursor is: the zoomed view's middle, near the player (not the city's middle).
    await sleep(1200)
    const below = bots[A].entity.position.floored().offset(0, -1, 0)
    bots[A]._client.write('block_dig', { status: 0, location: below, face: 1, sequence: 0 })
    let pin = ''
    await until(async () => { pin = await gps(); return /slots=\S*pin/.test(pin) }, 3000)
    const pt = xyz(pin, 'target')
    check('a pin on the zoomed map lands where the cursor is (near the player), not in the city\'s middle', Math.abs(pt[0] - 160.3) < 3 && Math.abs(pt[2] + 479.8) < 3, pin)
    await cmd(`dphone gps ${A} clear`)
    bots[A].chat('/gps clear')
    // Sneak: the next level, round to the whole city again.
    mapPackets = 0
    bots[A].setControlState('sneak', true)
    await sleep(500)
    bots[A].setControlState('sneak', false)
    await until(async () => { st = await status(); return /zoom=8/.test(st) }, 2000)
    const z8 = st
    bots[A].setControlState('sneak', true)
    await sleep(500)
    bots[A].setControlState('sneak', false)
    await until(async () => { st = await status(); return /zoom=1 /.test(st) }, 2000)
    check('sneaking with the big map open: the next zoom level (x8), then the whole city again; the map is sent again', /zoom=8/.test(z8) && field(z8, 'view').split(',')[2] === '0.25' && /zoom=1 /.test(st) && mapPackets > 0, `${z8} | ${st} | maps=${mapPackets}`)
    const levels = await cmd(`dphone zoom ${A}`)
    check('/dphone zoom: the levels this city has', /levels=\[1, 2, 4, 8\]/.test(levels), levels)
    bots[A].activateItem()
    await sleep(100)
    bots[A].deactivateItem()
    await sleep(500)
    bots[A].setQuickBarSlot(0)

    // ---------- Another world's own city ----------
    if (fs.existsSync(OWN)) { fs.renameSync(OWN, OWN_BAK); ownMoved = true; await cmd('dphone reload') }
    await tp([630.5, 65, 630.5], 'jailbreak')
    await sleep(2500) // the land around is made
    const scan = await cmd('dphone city scan 600 600 663 663 0 jailbreak')
    const scanned = await until(async () => /others=jailbreak:600,600,663,663@0/.test(await cmd('dphone city info')) && !/scanning=/.test(await cmd('dphone city info')), 30000)
    const inOwn = await status()
    await tp(ZOOM_AT)
    const inMain = await status()
    check('a scan of another world (named at the end) is that world\'s own city: players there see it, the main city stays', /own city/.test(scan) && scanned && /shown=own:jailbreak/.test(inOwn) && /shown=main:world/.test(inMain) && /city=maps/.test(inMain), `${scan} | ${inOwn} | ${inMain}`)
    const removed = await cmd('dphone city remove jailbreak')
    check('/dphone city remove <world>: back to the main city there', /removed jailbreak/.test(removed) && !/others=jailbreak/.test(await cmd('dphone city info')), removed)
  } finally {
    if (ownMoved) { try { fs.renameSync(OWN_BAK, OWN) } catch (e) {} await rcon.cmd('dphone reload').catch(() => {}) }
    for (const k of Object.keys(N)) await rcon.cmd(`dphone path remove ${ID(k)}`).catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`dphone gps ${name} clear`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot).catch(() => {})
    await rcon.cmd(`fill ${BOX} air`).catch(() => {})
    await rcon.cmd('fill 183 199 -458 188 199 -452 air').catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
