// setup.sk: /dsetup, the launch checklist (2026-09-29). One line per thing DEPLOY.md asks for, "✔" done, "✘" missing
// with the command that fixes it, "!" worth a look; a section at a time; DonatingPhone's city and roads lines; staff only.
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
    const after = line(await cmd('dsetup heists'), /Setup Bank/)
    check('...and a step done leaves the list (the exit spot, the hologram)', /Setup Bank/.test(after) && !/no exit spot/.test(after) && !/no hologram/.test(after) && /no loot piles/.test(after), after)

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
    check('/dsetup crates: only that section (a stand per sold crate; Hacked only worth a look)', /Crate stands/.test(crates) && !/Heists/.test(crates) && /(✔ \d+ stand\(s\) for daily keys|✘ no stand for daily keys: they can't be opened \(\/dcrate place daily)/.test(crates) && /(Hacked stand|for hacked keys)/.test(crates), crates)
    const all = await cmd('dsetup')
    check('/dsetup: every section, the test helpers warned about, a summary with the counts',
      ['Heists', 'Places', 'Shopkeepers', 'Quest givers', 'Car jobs and hits', 'Crate stands', 'Garages', 'Server'].every(h => all.includes(h)) && /zz-\*\.sk\) are loaded: never upload them/.test(all) && /SETUP \d+ missing, \d+ to look at/.test(all), all.slice(0, 400))
    const phone = await cmd('dsetup phone')
    check('...and DonatingPhone\'s own lines for the city and the GPS roads come back to the sender', /CITY source=/.test(phone) && /ROADS /.test(phone), phone)

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
    await rcon.cmd(`forceload remove ${X} ${Z} ${X + 10} ${Z + 10}`).catch(() => {})
    await rcon.cmd(`lp user ${A} permission unset donating.staff`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
