// crates.sk, cosmetics.sk and Heist Refresh (ranks.sk): /daily (a daily key, plus each rank's keys),
// keys given and taken back by the store (/dcrate), the odds, opening a crate from the /crates menu
// (the reward is given at once, the spin is only a picture), rewards that don't fit paying cash,
// repeats paying the dupe value, titles in chat and the tab list, kill effects, crate bag skins,
// retired cosmetics for Legends, crate stands, and Heist Refresh on a test heist.
const fs = require('fs')
const path = require('path')
const { Vec3 } = require('vec3')
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'CrateA'
const B = 'CrateB'
const Y = 200
const CHUNKS = '896 896 950 912'
const PLATFORM = `896 ${Y - 1} 896 950 ${Y - 1} 912`
const STAND = [900, Y, 910]
const HID = 'zref'
const FAR = '0.5 68 -656.5'
const LOGS = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const keys = async (name, crate) => Number(((await cmd(`dcrate info ${name}`)).match(new RegExp(`${crate}=(\\d+)`)) || [])[1])
    const cos = async name => cmd(`zzcos ${name}`)
    const papi = async (name, ph) => ((await cmd(`zzpapi ${name} ${ph}`)).match(/= (.*)$/m) || [])[1] || ''
    const log = name => { try { return fs.readFileSync(path.join(LOGS, `${name}.log`), 'utf8') } catch (e) { return '' } }
    const until = async (fn, ms = 5000) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(250) }
      return Boolean(await fn())
    }
    const windowOpen = bot => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const title = w => (w && w.title ? JSON.stringify(w.title) : '')
    const itemText = i => (i ? JSON.stringify(i) : '')
    // Opens /crates and clicks the crate's button (left = open one, right = see inside).
    const menu = async name => {
      const bot = bots[name]
      if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); await sleep(300) }
      const opened = windowOpen(bot)
      bot.chat('/crates')
      const w = await opened
      await sleep(300)
      return w
    }
    const slotOf = (w, crate) => {
      if (!w) return -1
      for (let s = 9; s < 18; s++) if (w.slots[s] && new RegExp(`${crate} Crate`, 'i').test(itemText(w.slots[s]))) return s
      return -1
    }
    // Opens one crate through the menu and waits for the result line in chat.
    const openCrate = async (name, crate, closeEarly = false) => {
      const bot = bots[name]
      const w = await menu(name)
      const s = slotOf(w, crate)
      const t = Date.now()
      const spin = windowOpen(bot)
      bot.clickWindow(s, 0, 0).catch(() => {})
      const sw = await spin
      if (closeEarly && bot.currentWindow) { await sleep(200); bot.closeWindow(bot.currentWindow) }
      await until(() => new RegExp(`${crate} Crate.*you got`, 'i').test(text(name, t)), 8000)
      await sleep(300)
      if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); await sleep(300) }
      return { spinTitle: title(sw), said: text(name, t) }
    }

    // ---------- Setup ----------
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    await cmd(`setblock ${STAND.join(' ')} ender_chest`)
    await cmd(`dheist delete ${HID} confirm`)
    await cmd(`rg remove -w world heist_${HID}`)
    for (const name of [A, B]) {
      bots[name] = await join(name)
      await cmd(`gamemode survival ${name}`)
      await cmd(`zzclear ${name}`)
      await cmd(`zzcratereset ${name}`)
      await cmd(`zzcombatend ${name}`)
      await cmd(`zzpassive ${name} off`)
      await cmd(`dranks give ${name} none`)
      await cmd(`dlevel reset ${name}`)
      await cmd(`lp user ${name} permission unset donating.store`)
      await cmd(`eco set ${name} 10000`)
    }
    await cmd(`zzheisttp ${A} 905.5 ${Y} 905.5`)
    await cmd(`zzheisttp ${B} 907.5 ${Y} 905.5`)
    await sleep(2500)

    // ---------- /daily ----------
    let t = Date.now()
    bots[A].chat('/daily')
    await sleep(800)
    check('/daily: a Daily key for everyone', (await keys(A, 'daily')) === 1 && (await keys(A, 'common')) === 0 && /Daily reward/.test(text(A, t)), `${text(A, t)} daily=${await keys(A, 'daily')}`)
    t = Date.now()
    bots[A].chat('/daily')
    await sleep(800)
    check('...once every 20 hours ("in 19h 59m")', (await keys(A, 'daily')) === 1 && /next daily reward is in 19h 59m/.test(text(A, t)), text(A, t))
    await cmd(`dranks give ${A} legend`)
    await cmd(`zzdata ${A} daily-at none`)
    await sleep(2000)
    t = Date.now()
    bots[A].chat('/daily')
    await sleep(800)
    check('a Legend\'s /daily adds Common, Uncommon and Rare keys', (await keys(A, 'daily')) === 2 && (await keys(A, 'common')) === 1 && (await keys(A, 'uncommon')) === 1 && (await keys(A, 'rare')) === 1, `${text(A, t)} / ${await cmd(`dcrate info ${A}`)}`)
    await cmd(`dranks give ${A} none`)
    await cmd(`dranks give ${B} vipplus`)
    await sleep(2000)
    bots[B].chat('/daily')
    await sleep(800)
    check('VIP+ adds a Common key; VIP+ gets no Uncommon', (await keys(B, 'daily')) === 1 && (await keys(B, 'common')) === 1 && (await keys(B, 'uncommon')) === 0, await cmd(`dcrate info ${B}`))
    await cmd(`dranks give ${B} none`)

    // ---------- The store: /dcrate ----------
    await cmd(`zzcratereset ${A}`)
    const gave = await cmd(`dcrate give ${A} rare 3`)
    const took = await cmd(`dcrate take ${A} rare 5`)
    check('dcrate give adds keys; take takes back only the unused ones', /\+3 rare \(now 3\)/.test(gave) && /-3 rare \(asked 5; 2 already opened; now 0\)/.test(took), `${gave} / ${took}`)
    const bad = [await cmd(`dcrate give ${A} mythic 1`), await cmd(`dcrate give ${A} rare 0`), await cmd(`dcrate give ${A} rare 10001`), await cmd(`dcrate give ${A} rare x`)]
    check('refused and logged: an unknown crate, a count of 0, over 10,000, not a number', /no crate mythic/.test(bad[0]) && bad.slice(1).every(r => /whole number/.test(r)) && (await keys(A, 'rare')) === 0 && /refused give CrateA rare 10001/.test(log('crates')), bad.join(' / '))
    t = Date.now()
    bots[A].chat('/dcrate give CrateA legendary 5')
    await sleep(800)
    check('/dcrate is the owner\'s and the store\'s only', /Only the owner and the store/.test(text(A, t)) && (await keys(A, 'legendary')) === 0, text(A, t))
    await cmd(`dcrate give ${A} hacked 1`)
    check('the keys placeholder (crate stand holograms)', (await papi(A, 'donating_keys_hacked')) === '1', await papi(A, 'donating_keys_hacked'))
    await cmd(`dcrate take ${A} hacked 1`)

    // ---------- The odds ----------
    const roll = await cmd('zzcrateroll common 3000')
    const count = line => Number((roll.match(new RegExp(`${line.replace(/\|/g, '\\|')}=(\\d+)`, 'i')) || [])[1] || 0)
    check('rolls follow the weights (19% $500, 1% Denim, over 3,000 rolls)', /total=100 lines=16/.test(roll) && Math.abs(count('19|money|500') - 570) < 90 && count('1|cos|denim') > 10 && count('1|cos|denim') < 60, roll)
    await cmd('zzcfgbool cos::denim::retired true')
    const roll2 = await cmd('zzcrateroll common 2000')
    check('a retired cosmetic is never rolled (and the odds leave it out)', /total=99 lines=15/.test(roll2) && !/denim/.test(roll2), roll2)

    // ---------- Retired cosmetics: Legends own them ----------
    check('without Legend, a retired cosmetic isn\'t yours', !/denim/.test(await cos(A)), await cos(A))
    await cmd(`dranks give ${A} legend`)
    await sleep(2000)
    check('a Legend owns every retired (and testing) cosmetic', /owned=[^ ]*denim/.test(await cos(A)), await cos(A))
    await cmd(`dranks give ${A} none`)
    await cmd('zzcfgbool cos::denim::retired false')
    await sleep(1500)

    // ---------- Opening from the menu ----------
    await cmd('zzcratelines common 1|money|777')
    await cmd(`dcrate give ${A} common 5`)
    let before = await bal(A)
    let w = await menu(A)
    check('/crates shows the crates with your keys', /Crates/.test(title(w)) && slotOf(w, 'Common') >= 0 && slotOf(w, 'Hacked') < 0, `${title(w)} common=${slotOf(w, 'Common')} hacked=${slotOf(w, 'Hacked')}`)
    // Right-click: what's inside, each line with its chance.
    const seeing = windowOpen(bots[A])
    bots[A].clickWindow(slotOf(w, 'Common'), 1, 0).catch(() => {})
    const pw = await seeing
    await sleep(300)
    check('right-click shows what\'s inside with the chance of each line', /what's inside/.test(title(pw)) && /Chance/.test(itemText(pw && pw.slots[0])) && /100/.test(itemText(pw && pw.slots[0])), `${title(pw)} ${itemText(pw && pw.slots[0]).slice(0, 300)}`)
    bots[A].closeWindow(bots[A].currentWindow)
    await sleep(300)
    let r = await openCrate(A, 'Common')
    check('left-click opens one: a spin, then the result in chat; one key used', /Common Crate/.test(r.spinTitle) && /you got .*\$777/.test(r.said) && (await keys(A, 'common')) === 4 && (await bal(A)) - before === 777, `${r.spinTitle} / ${r.said} / keys=${await keys(A, 'common')} +${(await bal(A)) - before}`)
    check('every opening is logged with what it paid', /open CrateA [0-9a-f-]+ common keys-left=4 line=1\|money\|777/.test(log('crates')))
    before = await bal(A)
    r = await openCrate(A, 'Common', true)
    check('closing the spin early still gives the reward and says so', /\$777/.test(r.said) && (await bal(A)) - before === 777 && (await keys(A, 'common')) === 3, `${r.said} +${(await bal(A)) - before}`)

    // Things that don't fit pay cash.
    await cmd('zzcratelines common 1|ammo|light|5000')
    before = await bal(A)
    r = await openCrate(A, 'Common')
    const ammo = Number(((await cmd(`zzwm ${A}`)).match(/ammo light=(\d+)/) || [])[1])
    check('ammo over the carry limit: the rest pays its shop price in cash', ammo === 256 && (await bal(A)) - before === 4744 && /no room/.test(r.said), `ammo=${ammo} +${(await bal(A)) - before} ${r.said}`)
    await cmd('zzcratelines common 1|con|Stim|5')
    before = await bal(A)
    r = await openCrate(A, 'Common')
    const wm = await cmd(`zzwm ${A}`)
    check('Stims over the carry limit (3): 3 in the hotbar, 2 paid in cash', /=Stim:\d+x3/.test(wm) && (await bal(A)) - before === 400, `${wm} +${(await bal(A)) - before} ${r.said}`)
    await cmd('zzcratelines common 1|tool|drill|1')
    before = await bal(A)
    r = await openCrate(A, 'Common')
    check('a tool above your level pays its price instead (Drill: level 2)', (await bal(A)) - before === 2500 && /needs level 2/.test(r.said) && !/tool:drill/.test(await cmd(`zzdump ${A}`)), `+${(await bal(A)) - before} ${r.said}`)

    // Blocked: in combat, no keys.
    await cmd(`dcrate give ${A} common 1`)
    await cmd(`zztag ${A}`)
    w = await menu(A)
    t = Date.now()
    bots[A].clickWindow(slotOf(w, 'Common'), 0, 0).catch(() => {})
    await sleep(900)
    const kept = await keys(A, 'common')
    check('no opening while in combat (the key stays)', /while in combat/.test(text(A, t)) && kept === 1, `${text(A, t)} keys=${kept}`)
    await cmd(`zzcombatend ${A}`)
    if (bots[A].currentWindow) bots[A].closeWindow(bots[A].currentWindow)
    await cmd(`dcrate take ${A} common 100`)
    w = await menu(A)
    t = Date.now()
    bots[A].clickWindow(slotOf(w, 'Common'), 0, 0).catch(() => {})
    await sleep(900)
    check('no keys: nothing opens, it points to the store', /no .*Common Crate.* keys.*\/store/.test(text(A, t)) && kept === 1, `${text(A, t)} kept=${kept}`)
    if (bots[A].currentWindow) bots[A].closeWindow(bots[A].currentWindow)

    // ---------- Cosmetics ----------
    await cmd('zzcratelines common 1|cos|ghost')
    await cmd(`dcrate give ${A} common 2`)
    r = await openCrate(A, 'Common')
    check('a cosmetic from a crate is yours', /owned=[^ ]*ghost/.test(await cos(A)) && /Ghost.*title/.test(r.said), `${await cos(A)} / ${r.said}`)
    before = await bal(A)
    r = await openCrate(A, 'Common')
    check('a repeat pays its rarity\'s dupe value (Uncommon $1,000)', (await bal(A)) - before === 1000 && /you have it/.test(r.said), `+${(await bal(A)) - before} ${r.said}`)
    t = Date.now()
    bots[A].chat('/title ghost')
    await sleep(1500)
    bots[A].chat('hello from the crate test')
    await sleep(1000)
    const seen = messagesSince(bots[B], t).map(m => m.text + ' ' + JSON.stringify(m.json || '')).join(' | ')
    check('the title shows after the name in chat', /CrateA.*«Ghost».*hello from the crate test/.test(seen), seen.slice(0, 400))
    const shown = bots[B].players[A] && bots[B].players[A].displayName ? bots[B].players[A].displayName.toString() : ''
    check('...and in the tab list', /CrateA.*«Ghost»/.test(shown), shown)
    t = Date.now()
    bots[A].chat('/title phantom')
    await sleep(800)
    check('a title you don\'t have is refused', /don't have/.test(text(A, t)) && /title=ghost/.test(await cos(A)), text(A, t))

    // Bag skins from crates work without a rank.
    await cmd('zzcratelines common 1|cos|tiger')
    await cmd(`dcrate give ${A} common 1`)
    await openCrate(A, 'Common')
    await cmd(`zzdata ${A} bag-tier 2`)
    await cmd(`zzbagapply ${A}`)
    bots[A].chat('/bagskin tiger')
    await sleep(1500)
    const off = itemText(bots[A].inventory.slots[45])
    check('a crate bag skin: /bagskin puts it on your bag (no rank needed)', /skinshown=tiger/.test(await cos(A)) && /bag_tiger/.test(off), `${await cos(A)} ${off.slice(0, 200)}`)

    // Kill effects: particles where the victim dies.
    await cmd('zzcratelines common 1|cos|fireworks')
    await cmd(`dcrate give ${A} common 1`)
    await openCrate(A, 'Common')
    bots[A].chat('/killeffect fireworks')
    await sleep(800)
    // One draw is one particle packet (60 particles); the fireworks effect draws once.
    let particles = 0
    let died = false
    bots[B].once('death', () => { died = true })
    const onPacket = (data, meta) => { if (meta.name === 'world_particles') particles++ }
    bots[A]._client.on('packet', onPacket)
    await sleep(12000) // the spawn shield and teleport protection
    const quiet = particles
    particles = 0
    const hpBefore = bots[B].health
    const posB = bots[B].entity.position.toString()
    const posA = bots[A].entity.position.toString()
    t = Date.now()
    // An empty hand: WeaponMechanics cancels melee hits made with its items (the Stim from above).
    bots[A].setQuickBarSlot(6)
    await sleep(500)
    const dmg = await cmd(`minecraft:damage ${B} 100 minecraft:player_attack by ${A}`)
    await sleep(1500)
    bots[A]._client.removeListener('packet', onPacket)
    check('a kill plays the killer\'s kill effect (particles at the victim)', died && /killfx=fireworks/.test(await cos(A)) && particles >= 1 && quiet === 0, `died=${died} particles=${particles} before=${quiet} ${await cos(A)} dmg=${dmg} hp=${hpBefore}->${bots[B].health} A=${posA} B=${posB} chatA=${text(A, t)} chatB=${text(B, t)} ${await cmd(`zzcombat ${B}`)} ${await cmd(`zzcombat ${A}`)}`)
    await sleep(1000)
    if (bots[B].isAlive === false || bots[B].health <= 0) { try { bots[B].respawn() } catch (e) {} }
    await cmd(`zzcombatend ${A}`)
    await cmd(`zzcombatend ${B}`)
    await sleep(3000)

    // ---------- Big pulls are announced ----------
    await cmd('zzcratelines legendary 1|cos|theboss')
    await cmd(`dcrate give ${A} legendary 1`)
    t = Date.now()
    await openCrate(A, 'Legendary')
    await sleep(500)
    check('a legendary cosmetic is announced to everyone', /CrateA unboxed The Boss from a Legendary Crate/.test(text(B, t)), text(B, t))

    // ---------- A crate stand ----------
    await cmd(`lp user ${A} permission set donating.store true`)
    await sleep(1500)
    await cmd(`dcrate remove`) // console: refused, in game only
    await cmd(`minecraft:tp ${A} 900.5 ${Y} 907.5 0 20`)
    await sleep(800)
    await bots[A].lookAt(new Vec3(STAND[0] + 0.5, STAND[1] + 0.5, STAND[2] + 0.5), true)
    await sleep(400)
    t = Date.now()
    bots[A].chat('/dcrate remove')
    await sleep(600)
    bots[A].chat('/dcrate place rare')
    await sleep(1200)
    const holos = fs.readdirSync(path.join(__dirname, '..', '..', 'server', 'plugins', 'DecentHolograms', 'holograms')).filter(f => /^crate_/.test(f))
    check('/dcrate place: the block is a crate, with a hologram', /placed rare/.test(text(A, t)) && holos.length > 0 && /rare at world:900:200:910/.test(await cmd('dcrate list')), `${text(A, t)} holos=${holos}`)
    await cmd(`lp user ${A} permission unset donating.store`)
    await sleep(1000)
    const standOpen = windowOpen(bots[A])
    try { await bots[A].activateBlock(bots[A].blockAt(new Vec3(...STAND))) } catch (e) {}
    const sw = await standOpen
    check('clicking the stand shows that crate (not the ender chest)', /Rare Crate: what's inside/.test(title(sw)), title(sw))
    if (bots[A].currentWindow) bots[A].closeWindow(bots[A].currentWindow)
    await cmd(`lp user ${A} permission set donating.store true`)
    await sleep(1500)
    bots[A].chat('/dcrate remove')
    await sleep(1000)
    await cmd(`lp user ${A} permission unset donating.store`)
    check('/dcrate remove takes it away', !/rare at world:900:200:910/.test(await cmd('dcrate list')))

    // ---------- Heist Refresh ----------
    await cmd(`zzregion heist_${HID} 940 199 900 946 204 906`)
    await cmd(`dheist create ${HID} 1`)
    await cmd(`dheist set ${HID} name Refresh Bank`)
    await cmd(`dheist set ${HID} cooldown 600`)
    await cmd(`dheist set ${HID} level 0`)
    await cmd(`dheist exit ${HID} 935.5 ${Y} 903.5`)
    await cmd(`dheist snapshot ${HID}`)
    await cmd(`dheist enable ${HID}`)
    await until(async () => /state=open/.test(await cmd(`zzheist ${HID}`)), 8000)
    await cmd(`dheist start ${HID}`)
    await cmd(`dheist end ${HID}`)
    const state = async () => ((await cmd(`zzheist ${HID}`)).match(/state=(\w+)/) || [])[1]
    t = Date.now()
    bots[A].chat(`/heistrefresh ${HID}`)
    await sleep(800)
    check('Heist Refresh is Elite and Legend only', /comes with/.test(text(A, t)) && (await state()) === 'cooldown', `${text(A, t)} ${await state()}`)
    await cmd(`dranks give ${A} elite`)
    await sleep(2000)
    await cmd(`zzdata ${A} level none`)
    await cmd(`dheist set ${HID} level 3`)
    t = Date.now()
    bots[A].chat('/heistrefresh refresh bank')
    await sleep(800)
    check('...only for a heist your level allows', /needs level 3/.test(text(A, t)) && (await state()) === 'cooldown', text(A, t))
    await cmd(`dheist set ${HID} level 0`)
    t = Date.now()
    bots[A].chat('/heistrefresh refresh bank')
    const opened = await until(async () => (await state()) === 'open', 6000)
    check('it reopens a cooling heist for everyone, announced with the name', opened && /CrateA refreshed the Refresh Bank/.test(text(B, t)) && /Refresh Bank is open/.test(text(B, t)), `${await state()} / ${text(B, t)}`)
    await cmd(`dheist start ${HID}`)
    await cmd(`dheist end ${HID}`)
    t = Date.now()
    bots[A].chat(`/heistrefresh ${HID}`)
    await sleep(800)
    check('Elite: the next one in 12 hours', /next Heist Refresh is in 11h 59m/.test(text(A, t)) && (await state()) === 'cooldown', text(A, t))
    await cmd(`dranks give ${A} legend`)
    await sleep(2000)
    t = Date.now()
    bots[A].chat(`/heistrefresh ${HID}`)
    await sleep(800)
    check('Legend: every 6 hours', /next Heist Refresh is in 5h 59m/.test(text(A, t)), text(A, t))
    const refreshAt = async name => /= \d/.test(await cmd(`zzdata ${name} refresh-at`))
    await cmd(`zzdata ${A} refresh-at none`)
    // Opening a heist ends its alarm's chase: no paid way to call off the cops (review, 2026-09-26).
    await cmd(`zzheistvar ${HID} alarm warning`)
    t = Date.now()
    bots[A].chat(`/heistrefresh ${HID}`)
    await sleep(800)
    await cmd(`zzheistvar ${HID} alarm none`)
    check('no refresh while the heist\'s alarm is still going (the refresh isn\'t used)', /alarm is still going/.test(text(A, t)) && (await state()) === 'cooldown' && !(await refreshAt(A)), text(A, t))
    await cmd(`zztag ${A}`)
    t = Date.now()
    bots[A].chat(`/heistrefresh ${HID}`)
    await sleep(800)
    await cmd(`zzcombatend ${A}`)
    check('no refresh while in combat', /while in combat/.test(text(A, t)) && (await state()) === 'cooldown', text(A, t))
    // Two refreshers at once: the second one's refresh isn't used up on a heist that's already reopening.
    await cmd(`dranks give ${B} elite`)
    await sleep(2000)
    await cmd(`zzdata ${B} refresh-at none`)
    t = Date.now()
    bots[A].chat(`/heistrefresh ${HID}`)
    await sleep(150)
    bots[B].chat(`/heistrefresh ${HID}`)
    await sleep(1500)
    check('a second refresh of a heist that\'s already reopening isn\'t used up', /CrateA refreshed the Refresh Bank/.test(text(B, t)) && !/CrateB refreshed/.test(text(B, t)) && /already reopening|isn't cooling down/.test(text(B, t)) && !(await refreshAt(B)) && (await refreshAt(A)), text(B, t))
    await cmd(`dranks give ${B} none`)
    await until(async () => (await state()) === 'open', 6000)
    await cmd(`zzdata ${A} refresh-at none`)
    await cmd(`dheist open ${HID}`)
    await until(async () => (await state()) === 'open', 6000)
    t = Date.now()
    bots[A].chat(`/heistrefresh ${HID}`)
    await sleep(800)
    check('an open heist can\'t be refreshed (the refresh isn\'t used)', /isn't cooling down/.test(text(A, t)) && !(await cmd(`zzdata ${A} refresh-at`)).match(/= \d/), text(A, t))
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd(`dheist delete ${HID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${HID}`).catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`dranks give ${name} none`).catch(() => {})
      await rcon.cmd(`lp user ${name} permission unset donating.store`).catch(() => {})
      await rcon.cmd(`zzcratereset ${name}`).catch(() => {})
      await rcon.cmd(`zzbountyreset ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot)
    await rcon.cmd(`setblock ${STAND.join(' ')} air`).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
