// setup.sk: /dsetup, the launch checklist (2026-09-29). One line per thing DEPLOY.md asks for, "✔" done, "✘" missing
// with the command that fixes it, "!" worth a look; a section at a time; DonatingPhone's city and roads lines; staff only.
// Also (review fixes): a region without passthrough, an exit spot in a safe zone, the room snapshot saved on this
// server, Mara's missions checked at the level they start at, the plugins and the paid-rank groups, a mistyped section.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'SetupBot'
const HID = 'zsetup'
const X = 5200 // the test heist's box
const Y = 150
const Z = 5200

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  // Color codes stripped: the lines start with their mark.
  const cmd = async c => (await rcon.cmd(c)).replace(/§./g, '').trim()
  let bot = null
  let poiId = ''
  try {
    const text = t => messagesSince(bot, t).map(m => m.text).join('\n')
    const line = (out, re) => out.split('\n').find(l => re.test(l)) || ''

    // ---------- A new heist: every missing step named ----------
    await cmd(`dheist delete ${HID} confirm`)
    await cmd(`rg remove -w world heist_${HID}`)
    await cmd(`forceload add ${X} ${Z} ${X + 10} ${Z + 10}`)
    await cmd(`zzregion heist_${HID} ${X} ${Y} ${Z} ${X + 10} ${Y + 6} ${Z + 10}`)
    await cmd(`dheist create ${HID} 1`)
    await cmd(`dheist set ${HID} name Setup Bank`)
    const fresh = line(await cmd('dsetup heists'), /Setup Bank/)
    check('a new heist: ✘ with every missing step and its command (exit, snapshot, hologram, loot piles, disabled)',
      /^✘/.test(fresh) && /no exit spot \(\/dheist exit zsetup\)/.test(fresh) && /no room snapshot/.test(fresh) && /no hologram \(\/dheist holo zsetup\)/.test(fresh) && /no loot piles/.test(fresh) && /disabled \(\/dheist enable zsetup/.test(fresh), fresh)
    await cmd(`dheist exit ${HID} ${X - 5.5} ${Y} ${Z - 5.5}`)
    await cmd(`dheist holo ${HID} ${X - 3} ${Y} ${Z - 3}`)
    await cmd(`dheist snapshot ${HID}`)
    const after = line(await cmd('dsetup heists'), /Setup Bank/)
    check('...and a step done leaves the list (the exit spot, the hologram, the room snapshot)', /Setup Bank/.test(after) && !/no exit spot/.test(after) && !/no hologram/.test(after) && !/no room snapshot/.test(after) && /no loot piles/.test(after), after)
    // A safe zone drawn over the exit spot later: tagged robbers couldn't be moved out at 0:00.
    await cmd(`zzregion safe_zsetup ${X - 8} ${Y - 2} ${Z - 8} ${X - 2} ${Y + 4} ${Z - 2}`)
    await cmd('rg flag -w world safe_zsetup passthrough allow')
    const inSafe = line(await cmd('dsetup heists'), /Setup Bank/)
    check('an exit spot inside a safe zone is flagged (/dheist exit, outside it)', /exit spot is inside a safe zone/.test(inSafe), inSafe)

    // ---------- WorldGuard flags: a region without passthrough protects everything in it ----------
    await cmd(`zzregion district_zsetup ${X + 20} ${Y} ${Z + 20} ${X + 25} ${Y + 5} ${Z + 25}`)
    const flags = await cmd('dsetup flags')
    check('a region without passthrough: ✘ with the /rg flag command (the heist region has it, set by /dheist create)', /✘ district_zsetup protects everything inside .*passthrough allow/.test(flags) && !/heist_zsetup protects/.test(flags), flags)
    await cmd('rg flag -w world district_zsetup passthrough allow')
    const flags2 = await cmd('dsetup flags')
    check('...set: no ✘ for it (safe zones without weapon-shoot deny are only worth a look)', !/district_zsetup protects/.test(flags2) && /safe_zsetup: guns fire in this safe zone/.test(flags2), flags2)

    // ---------- Mara's missions at the level they start at ----------
    const story = await cmd('dsetup story')
    check('a mission the map can\'t host is named with what it needs at its level (no heist with a safe: "Crack a safe", level 5)', /Mara's mission "Crack a safe" would be skipped for good: it needs an enabled heist with a safe that a level-5 robber can enter/.test(story), story.slice(0, 600))

    // ---------- Places: a POI counted ----------
    bot = await join(A)
    await cmd(`zzclear ${A}`)
    await cmd(`lp user ${A} permission set donating.staff true`)
    await sleep(2500)
    const before = line(await cmd('dsetup places'), /shop POI/)
    let t = Date.now()
    bot.chat('/dpoi add shop Setup Shop')
    await sleep(1000)
    poiId = (text(t).match(/POI (\d+) shop at/) || [])[1] || ''
    const nowPoi = line(await cmd('dsetup places'), /shop POI/)
    const n0 = Number((before.match(/(\d+) shop POI/) || [0, 0])[1])
    check('POIs are counted (one more shop POI: "✔ N shop POI(s)")', poiId !== '' && /^✔ \d+ shop POI/.test(nowPoi) && Number((nowPoi.match(/(\d+) shop POI/) || [])[1]) === n0 + 1, `${before} -> ${nowPoi}`)

    // ---------- One section at a time, the server lines, the summary ----------
    const crates = await cmd('dsetup crates')
    check('/dsetup crates: only that section (a stand per sold crate; Hacked only worth a look)', /Crate stands/.test(crates) && !/Heists/.test(crates) && /(✔ \d+ stand\(s\) for daily keys|✘ no stand for daily keys in a safe zone: they can't be opened \(\/dcrate place daily)/.test(crates) && /(Hacked stand|for hacked keys)/.test(crates), crates)
    const all = await cmd('dsetup')
    check('/dsetup: every section, the test helpers warned about, a summary with the counts',
      ['Heists', "Mara's and Vic's missions", 'Places', 'WorldGuard flags', 'Shopkeepers', 'Quest givers', 'Car jobs and hits', 'Crate stands', 'Garages', 'Server', "The phone's city"].every(h => all.includes(h)) && /zz-\*\.sk\) are loaded: never upload them/.test(all) && /SETUP \d+ missing, \d+ to look at/.test(all), all.slice(0, 400))
    check('the plugins and the paid ranks\' LuckPerms groups are checked', /✔ every plugin is running/.test(all) && /✔ the paid ranks' groups exist/.test(all), line(all, /plugin/) + ' | ' + line(all, /paid ranks/))
    const phone = await cmd('dsetup phone')
    check('the phone\'s city and GPS roads as ✔/✘ lines (DonatingPhone\'s state on the main world)', /✔ the phones show the city: /.test(phone) && /(✔ the GPS follows the roads|✘ the GPS points straight at targets)/.test(phone), phone)
    const bogus = await cmd('dsetup heist')
    check('a mistyped section prints the usage, not an empty all-clear', /\/dsetup \[heists \| story/.test(bogus) && !/SETUP/.test(bogus), bogus)

    // ---------- Staff only ----------
    await cmd(`lp user ${A} permission unset donating.staff`)
    await sleep(800)
    t = Date.now()
    bot.chat('/dsetup')
    await sleep(800)
    check('/dsetup is staff only', /Staff only/.test(text(t)), text(t))
  } finally {
    if (poiId) await rcon.cmd(`zzconsole dpoi remove ${poiId}`).catch(() => {})
    await rcon.cmd(`dheist delete ${HID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${HID}`).catch(() => {})
    await rcon.cmd('rg remove -w world safe_zsetup').catch(() => {})
    await rcon.cmd('rg remove -w world district_zsetup').catch(() => {})
    await rcon.cmd(`forceload remove ${X} ${Z} ${X + 10} ${Z + 10}`).catch(() => {})
    await rcon.cmd(`lp user ${A} permission unset donating.staff`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
