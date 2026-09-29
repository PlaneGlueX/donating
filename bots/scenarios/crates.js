// crates.sk, cosmetics.sk and Heist Refresh (ranks.sk): /daily (a daily key, plus each rank's keys),
// keys given and taken back by the store (/dcrate), the odds, /crates (odds and keys only: nothing opens
// there), opening at a crate stand in a safe zone (the reward comes when the spin stops, or at once when
// the menu closes; a logout mid-spin gives it at the next join), rewards that don't fit paying half their
// shop price, repeats paying the dupe value, only Legendary and Hacked pulls announced, titles in chat and
// the tab list and taking them off (/cosmetics), kill effects, crate bag skins, retired cosmetics for
// Legends, the Hacked crate's animated name, and Heist Refresh on a test heist.
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
// Crate stands (inside the safe zone below): common, legendary, and a spare block for /dcrate place.
const STANDS = { Common: [900, Y, 910], Legendary: [902, Y, 910] }
const SPARE = [904, Y, 910]
const SAFE = 'safe_crates_test'
const HID = 'zref'
const FAR = '0.5 68 -656.5'
const LOGS = path.join(__dirname, '..', '..', 'server', 'plugins', 'Skript', 'logs')
const HOLOS = path.join(__dirname, '..', '..', 'server', 'plugins', 'DecentHolograms', 'holograms')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  const placed = []
  try {
    const text = (name, t) => messagesSince(bots[name], t).map(m => m.text).join(' | ')
    const bal = async name => Number(((await cmd(`zzbal ${name}`)).match(/: (-?\d+)/) || [])[1])
    const keys = async (name, crate) => Number(((await cmd(`dcrate info ${name}`)).match(new RegExp(`${crate}=(\\d+)`)) || [])[1])
    const pending = async name => ((await cmd(`dcrate info ${name}`)).match(/pending=(.*)$/) || [])[1] || ''
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
    const closeAll = async name => { if (bots[name].currentWindow) { bots[name].closeWindow(bots[name].currentWindow); await sleep(300) } }
    // /crates
    const menu = async name => {
      await closeAll(name)
      const opened = windowOpen(bots[name])
      bots[name].chat('/crates')
      const w = await opened
      await sleep(300)
      return w
    }
    const slotOf = (w, crate) => {
      if (!w) return -1
      for (let s = 9; s < 18; s++) if (w.slots[s] && new RegExp(`${crate} Crate`, 'i').test(itemText(w.slots[s]))) return s
      return -1
    }
    // Clicks a crate stand: its "what's inside" menu with the Open button.
    const stand = async (name, crate) => {
      await closeAll(name)
      await sleep(300) // the stand's click cooldown
      const opened = windowOpen(bots[name])
      try { await bots[name].activateBlock(bots[name].blockAt(new Vec3(...STANDS[crate]))) } catch (e) {}
      const w = await opened
      await sleep(300)
      return w
    }
    // Opens one crate at its stand and waits for the result line. mid: called once the spin shows.
    const openCrate = async (name, crate, { closeEarly = false, mid = null } = {}) => {
      const bot = bots[name]
      const w = await stand(name, crate)
      const t = Date.now()
      const spin = windowOpen(bot)
      bot.clickWindow(49, 0, 0).catch(() => {})
      const sw = await spin
      let during = null
      if (mid) during = await mid()
      if (closeEarly && bot.currentWindow) { await sleep(200); bot.closeWindow(bot.currentWindow) }
      await until(() => new RegExp(`${crate} Crate.*you got`, 'i').test(text(name, t)), 9000)
      const ms = Date.now() - t
      await sleep(300)
      await closeAll(name)
      return { standTitle: title(w), spinTitle: title(sw), said: text(name, t), during, ms }
    }

    // ---------- Setup ----------
    await cmd('zzcfgreload')
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    for (const s of [...Object.values(STANDS), SPARE]) await cmd(`setblock ${s.join(' ')} ender_chest`)
    await cmd(`dheist delete ${HID} confirm`)
    await cmd(`rg remove -w world heist_${HID}`)
    await cmd(`rg remove -w world ${SAFE}`)
    await cmd(`zzregion ${SAFE} 896 195 896 930 210 912`)
    await cmd(`rg flag -w world ${SAFE} passthrough allow`)
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
    await cmd(`zzheisttp ${A} 901.5 ${Y} 907.5`)
    await cmd(`zzheisttp ${B} 907.5 ${Y} 905.5`)
    await sleep(2500)
    // The stands: A places them (in game only: the block you look at).
    await cmd(`lp user ${A} permission set donating.store true`)
    await sleep(1500)
    for (const [crate, s] of Object.entries(STANDS)) {
      await cmd(`minecraft:tp ${A} ${s[0] + 0.5} ${Y} ${s[2] - 2.5} 0 20`)
      await sleep(600)
      await bots[A].lookAt(new Vec3(s[0] + 0.5, s[1] + 0.5, s[2] + 0.5), true)
      await sleep(300)
      bots[A].chat('/dcrate remove')
      await sleep(400)
      bots[A].chat(`/dcrate place ${crate.toLowerCase()}`)
      await sleep(900)
      placed.push(s)
    }
    await cmd(`lp user ${A} permission unset donating.store`)
    await cmd(`minecraft:tp ${A} 901.5 ${Y} 907.5 0 20`)
    await sleep(1500)
    check('/dcrate place: two crate stands, with holograms', /common at world:900:200:910/.test(await cmd('dcrate list')) && /legendary at world:902:200:910/.test(await cmd('dcrate list')), await cmd('dcrate list'))

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
    // Log checks only read what was written after this point (the log keeps earlier runs).
    let mark = log('crates').length
    const bad = [await cmd(`dcrate give ${A} mythic 1`), await cmd(`dcrate give ${A} rare 0`), await cmd(`dcrate give ${A} rare 10001`), await cmd(`dcrate give ${A} rare x`)]
    check('refused and logged: an unknown crate, a count of 0, over 10,000, not a number', /no crate mythic/.test(bad[0]) && bad.slice(1).every(r => /whole number/.test(r)) && (await keys(A, 'rare')) === 0 && /refused give CrateA rare 10001/.test(log('crates').slice(mark)), bad.join(' / '))
    t = Date.now()
    bots[A].chat('/dcrate give CrateA legendary 5')
    await sleep(800)
    check('/dcrate is the owner\'s and the store\'s only', /Only the owner and the store/.test(text(A, t)) && (await keys(A, 'legendary')) === 0, text(A, t))
    await cmd(`dcrate give ${A} hacked 1`)
    check('the keys placeholder (crate stand holograms)', (await papi(A, 'donating_keys_hacked')) === '1', await papi(A, 'donating_keys_hacked'))
    await cmd(`dcrate take ${A} hacked 1`)

    // ---------- The odds (owner, 2026-09-26: more money, cosmetics 3% in Common) ----------
    const roll = await cmd('zzcrateroll common 3000')
    const count = line => Number((roll.match(new RegExp(`${line.replace(/\|/g, '\\|')}=(\\d+)`, 'i')) || [])[1] || 0)
    check('rolls follow the weights (Common: 28% $200, 0.6% Desert, over 3,000 rolls)', /total=1000 lines=13/.test(roll) && Math.abs(count('280|money|200') - 840) < 110 && count('6|cos|sand') > 3 && count('6|cos|sand') < 45, roll)
    const sum = async crate => {
      const r = await cmd(`zzcrateroll ${crate} 1`)
      return r
    }
    check('every crate\'s weights add up to 1000 (weight 30 = 3%), the crate cars included', /total=1000/.test(await sum('common')) && /total=1000/.test(await sum('uncommon')) && /total=1000/.test(await sum('rare')) && /total=1000/.test(await sum('epic')) && /total=1000/.test(await sum('legendary')) && /total=1000/.test(await sum('hacked')), [await sum('legendary'), await sum('hacked')].join(' '))
    await cmd('zzcfgbool cos::sand::retired true')
    const roll2 = await cmd('zzcrateroll common 2000')
    check('a retired cosmetic is never rolled (and the odds leave it out)', /total=994 lines=12/.test(roll2) && !/sand/.test(roll2), roll2)

    // ---------- Retired cosmetics: Legends own them ----------
    check('without Legend, a retired cosmetic isn\'t yours', !/sand/.test(await cos(A)), await cos(A))
    await cmd(`dranks give ${A} legend`)
    await sleep(2000)
    check('a Legend owns every retired (and testing) cosmetic', /owned=[^ ]*sand/.test(await cos(A)), await cos(A))
    await cmd(`dranks give ${A} none`)
    await cmd('zzcfgbool cos::sand::retired false')
    await sleep(1500)

    // ---------- /crates: odds and keys, nothing opens there ----------
    await cmd('zzcratelines common 1|money|777')
    await cmd(`dcrate give ${A} common 5`)
    let before = await bal(A)
    let w = await menu(A)
    const hackedShown = w && w.slots.some(i => i && i.name === 'sculk_shrieker')
    check('/crates shows every crate with your keys, Hacked too', /Crates/.test(title(w)) && slotOf(w, 'Common') >= 0 && hackedShown, `${title(w)} common=${slotOf(w, 'Common')} hacked=${hackedShown}`)
    // The Hacked name is animated: reads of its placeholder over one 4.4 s loop differ, some obfuscated
    // (&k), one fully revealed.
    const frames = []
    for (let i = 0; i < 12; i++) { frames.push(await papi(A, 'donating_hacked_crate')); await sleep(400) }
    const distinct = new Set(frames).size
    const hidden = frames.some(f => /(§|&|\(amp\))k/.test(f))
    const shownAll = frames.some(f => !/(§|&|\(amp\))k/.test(f) && /H.*A.*C.*K.*E.*D/.test(f))
    check('the Hacked crate\'s name is animated (obfuscated letters reveal HACKED)', distinct >= 3 && hidden && shownAll && frames.every(f => /Crate/.test(f)), `${distinct} different: ${frames.slice(0, 4).join(' / ')}`)
    const seeing = windowOpen(bots[A])
    bots[A].clickWindow(slotOf(w, 'Common'), 0, 0).catch(() => {})
    const pw = await seeing
    await sleep(300)
    check('clicking a crate in /crates shows what\'s inside with each chance, and says to open it at a stand', /what's inside/.test(title(pw)) && /Chance/.test(itemText(pw && pw.slots[0])) && /100/.test(itemText(pw && pw.slots[0])) && /crate stand/.test(itemText(pw && pw.slots[49])) && !/Open one/.test(itemText(pw && pw.slots[49])), `${title(pw)} ${itemText(pw && pw.slots[49]).slice(0, 300)}`)
    // A set shows its most visible part (found in the client: both Hacked sets were name tags, so the
    // spin looked frozen): H4CK3R + Matrix is the Matrix bag, Zero Day + Glitch the kill effect.
    w = await menu(A)
    const hs = w ? w.slots.findIndex((i, n) => n >= 9 && n < 27 && i && i.name === 'sculk_shrieker') : -1
    const hackedPage = windowOpen(bots[A])
    bots[A].clickWindow(hs, 0, 0).catch(() => {})
    const hw = await hackedPage
    await sleep(300)
    const hs5 = hw ? hw.slots.slice(0, 5) : []
    check('a cosmetic set shows its bag skin or kill effect, not the title (the Hacked spin moves); the crate cars show as cars', hs5.some(i => i && i.name === 'leather' && /bag_matrix/.test(itemText(i))) && hs5.some(i => i && i.name === 'blaze_powder') && hs5.filter(i => i && i.name === 'diamond_hoe').length === 3, hs5.map(i => i && i.name).join(' '))
    await closeAll(A)
    check('...and nothing was opened (no key used)', (await keys(A, 'common')) === 5 && (await bal(A)) === before, `keys=${await keys(A, 'common')}`)

    // ---------- Opening at a stand ----------
    mark = log('crates').length
    let r = await openCrate(A, 'Common', { mid: async () => { await sleep(300); return { bal: await bal(A), keys: await keys(A, 'common'), pending: await pending(A) } } })
    check('a stand shows the crate with an Open button; the key is used when the spin starts', /Common Crate: what's inside/.test(r.standTitle) && /Common Crate/.test(r.spinTitle) && r.during && r.during.keys === 4 && /money\|777/.test(r.during.pending), JSON.stringify(r.during))
    check('...and the reward comes when the spin stops, not before', r.during && r.during.bal === before && /you got .*\$777/.test(r.said) && (await bal(A)) - before === 777 && r.ms > 1500 && (await pending(A)) === 'none', `during=${JSON.stringify(r.during)} after +${(await bal(A)) - before} in ${r.ms} ms / ${r.said}`)
    check('every opening and grant is logged', /open CrateA [0-9a-f-]+ common keys-left=4 line=1\|money\|777/.test(log('crates').slice(mark)) && /grant CrateA [0-9a-f-]+ common line=1\|money\|777/.test(log('crates').slice(mark)))
    before = await bal(A)
    r = await openCrate(A, 'Common', { closeEarly: true })
    check('closing the spin ends it early and gives the reward at once', /\$777/.test(r.said) && (await bal(A)) - before === 777 && (await keys(A, 'common')) === 3 && r.ms < 2500, `${r.said} +${(await bal(A)) - before} in ${r.ms} ms`)
    // A logout mid-spin: the reward is given once, at the latest at the next join.
    before = await bal(A)
    {
      const bot = bots[A]
      await stand(A, 'Common')
      const spin = windowOpen(bot)
      bot.clickWindow(49, 0, 0).catch(() => {})
      await spin
      await sleep(200)
      await quit(bot)
      await sleep(1500)
      bots[A] = await join(A)
      await sleep(4000)
      check('logging out mid-spin: the reward is given once (at the quit or the next join), nothing left pending', (await bal(A)) - before === 777 && (await pending(A)) === 'none' && (await keys(A, 'common')) === 2, `+${(await bal(A)) - before} pending=${await pending(A)} keys=${await keys(A, 'common')}`)
      await cmd(`zzheisttp ${A} 901.5 ${Y} 907.5`)
      await sleep(5500)
    }

    // Things that don't fit pay half their shop price (owner, 2026-09-26). Level 5: the .50 GS (light rounds) can be
    // owned, so light rounds are given (a gun above the level pays cash: checked below).
    await cmd(`dlevel set ${A} 5`)
    await cmd(`dcrate give ${A} common 1`)
    await cmd('zzcratelines common 1|ammo|light|5000')
    before = await bal(A)
    r = await openCrate(A, 'Common')
    const ammo = Number(((await cmd(`zzwm ${A}`)).match(/ammo light=(\d+)/) || [])[1])
    check('ammo over the carry limit: the rest pays half its shop price in cash', ammo === 256 && (await bal(A)) - before === 2372 && /no room/.test(r.said), `ammo=${ammo} +${(await bal(A)) - before} ${r.said}`)
    await cmd('zzcratelines common 1|con|Stim|5')
    before = await bal(A)
    r = await openCrate(A, 'Common')
    const wm = await cmd(`zzwm ${A}`)
    check('Stims over the carry limit (3): 3 in the hotbar, 2 paid at half price ($200 each: Stims cost $400 now)', /=Stim:\d+x3/.test(wm) && (await bal(A)) - before === 400, `${wm} +${(await bal(A)) - before} ${r.said}`)
    await cmd('zzcratelines common 1|tool|drill|1')
    before = await bal(A)
    r = await openCrate(A, 'Common')
    check('a tool above your level pays half its price instead (Drill: level 15)', (await bal(A)) - before === 1250 && /needs level 15/.test(r.said) && !/tool:drill/.test(await cmd(`zzdump ${A}`)), `+${(await bal(A)) - before} ${r.said}`)
    // Rounds for a gun the player can't own yet (review fix, 2026-09-27): all of it as cash.
    await cmd(`dlevel reset ${A}`)
    await cmd(`dcrate give ${A} common 1`)
    await cmd('zzcratelines common 1|ammo|rifle|90')
    const rifle0 = Number(((await cmd(`zzwm ${A}`)).match(/ammo rifle=(\d+)/) || [])[1])
    before = await bal(A)
    r = await openCrate(A, 'Common')
    const rifle1 = Number(((await cmd(`zzwm ${A}`)).match(/ammo rifle=(\d+)/) || [])[1])
    check('rounds for a gun above your level (rifle: the AK-47 at 50) pay half their price in cash, no rounds', rifle1 === rifle0 && (await bal(A)) - before === 135 && /no gun for them at your level yet/.test(r.said), `rifle ${rifle0}->${rifle1} +${(await bal(A)) - before} ${r.said}`)

    // Blocked: in combat, outside a safe zone, no keys.
    await cmd(`dcrate give ${A} common 1`)
    await cmd(`zztag ${A}`)
    await stand(A, 'Common')
    t = Date.now()
    bots[A].clickWindow(49, 0, 0).catch(() => {})
    await sleep(900)
    check('no opening while in combat (the key stays)', /while in combat/.test(text(A, t)) && (await keys(A, 'common')) === 1, `${text(A, t)} keys=${await keys(A, 'common')}`)
    await cmd(`zzcombatend ${A}`)
    await closeAll(A)
    await cmd(`rg remove -w world ${SAFE}`)
    await stand(A, 'Common')
    t = Date.now()
    bots[A].clickWindow(49, 0, 0).catch(() => {})
    await sleep(900)
    check('crates open only in safe zones (the key stays)', /only in safe zones/.test(text(A, t)) && (await keys(A, 'common')) === 1, `${text(A, t)} keys=${await keys(A, 'common')}`)
    await closeAll(A)
    await cmd(`zzregion ${SAFE} 896 195 896 930 210 912`)
    await cmd(`rg flag -w world ${SAFE} passthrough allow`)
    await cmd(`dcrate take ${A} common 100`)
    w = await stand(A, 'Common')
    check('no keys: the stand has no Open button, it points to the store', /No keys/.test(itemText(w && w.slots[49])) && /\/store/.test(itemText(w && w.slots[49])), itemText(w && w.slots[49]).slice(0, 300))
    await closeAll(A)

    // ---------- Cosmetics ----------
    await cmd('zzcratelines common 1|cos|ghost')
    await cmd(`dcrate give ${A} common 2`)
    r = await openCrate(A, 'Common')
    check('a cosmetic from a crate is yours', /owned=[^ ]*ghost/.test(await cos(A)) && /Ghost.*title/.test(r.said), `${await cos(A)} / ${r.said}`)
    before = await bal(A)
    r = await openCrate(A, 'Common')
    check('a repeat pays its rarity\'s dupe value (Uncommon $500)', (await bal(A)) - before === 500 && /you have it/.test(r.said), `+${(await bal(A)) - before} ${r.said}`)
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
    // Taking it off in the wardrobe (owner, 2026-09-26: people can unequip titles).
    await closeAll(A)
    let opened = windowOpen(bots[A])
    bots[A].chat('/cosmetics')
    const ww = await opened
    await sleep(300)
    opened = windowOpen(bots[A])
    bots[A].clickWindow(11, 0, 0).catch(() => {})
    const tw = await opened
    await sleep(300)
    const worn = itemText(tw && tw.slots[0])
    opened = windowOpen(bots[A])
    bots[A].clickWindow(49, 0, 0).catch(() => {})
    await opened
    await sleep(500)
    await closeAll(A)
    await sleep(1500)
    const shownAfter = bots[B].players[A] && bots[B].players[A].displayName ? bots[B].players[A].displayName.toString() : ''
    check('/cosmetics: the Titles page shows the worn one; "Take it off" removes it (chat and tab list)', /Your cosmetics/.test(title(ww)) && /Wearing it/.test(worn) && /title=<none>|title= /.test(await cos(A) + ' ') && !/«Ghost»/.test(shownAfter), `${title(ww)} ${worn.slice(0, 160)} ${await cos(A)} tab=${shownAfter}`)
    // Owner, 2026-09-26: /titles, /bagskins and /killeffects open their page of the wardrobe.
    const pages = []
    for (const c of ['titles', 'bagskins', 'killeffects']) {
      await closeAll(A)
      opened = windowOpen(bots[A])
      bots[A].chat('/' + c)
      pages.push(title(await opened))
      await sleep(300)
    }
    await closeAll(A)
    check('/titles, /bagskins and /killeffects open their page of the wardrobe', /Your titles/.test(pages[0]) && /Your bag skins/.test(pages[1]) && /Your kill effects/.test(pages[2]), pages.join(' | '))

    // Bag skins from crates work without a rank. Tiger is Epic: not announced (only Legendary and Hacked).
    await cmd('zzcratelines common 1|cos|tiger')
    await cmd(`dcrate give ${A} common 1`)
    t = Date.now()
    await openCrate(A, 'Common')
    check('an Epic cosmetic isn\'t announced to everyone', !/unboxed/.test(text(B, t)), text(B, t))
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
    // Kill effects are for kills outside safe zones: take the safe zone away for this.
    await cmd(`rg remove -w world ${SAFE}`)
    await sleep(12000) // the spawn shield and teleport protection
    const quiet = particles
    particles = 0
    t = Date.now()
    // An empty hand: WeaponMechanics cancels melee hits made with its items (the Stim from above).
    bots[A].setQuickBarSlot(6)
    await sleep(500)
    const dmg = await cmd(`minecraft:damage ${B} 100 minecraft:player_attack by ${A}`)
    await sleep(1500)
    bots[A]._client.removeListener('packet', onPacket)
    check('a kill plays the killer\'s kill effect (particles at the victim)', died && /killfx=fireworks/.test(await cos(A)) && particles >= 1 && quiet === 0, `died=${died} particles=${particles} before=${quiet} ${await cos(A)} dmg=${dmg}`)
    await sleep(1000)
    if (bots[B].isAlive === false || bots[B].health <= 0) { try { bots[B].respawn() } catch (e) {} }
    await cmd(`zzcombatend ${A}`)
    await cmd(`zzcombatend ${B}`)
    await cmd(`zzregion ${SAFE} 896 195 896 930 210 912`)
    await cmd(`rg flag -w world ${SAFE} passthrough allow`)
    await cmd(`zzheisttp ${B} 907.5 ${Y} 905.5`)
    await sleep(3000)

    // ---------- Big pulls are announced (Legendary and Hacked only) ----------
    await cmd('zzcratelines legendary 1|cos|theboss')
    await cmd(`dcrate give ${A} legendary 1`)
    t = Date.now()
    await openCrate(A, 'Legendary')
    await sleep(500)
    check('a legendary cosmetic is announced to everyone', /CrateA unboxed The Boss #\d+\/\d+ title from a Legendary Crate/.test(text(B, t)), text(B, t))
    // Owner, 2026-09-27: rare items are numbered (#N/M: the Nth copy of M so far), also in the announcement.
    const own = Number(((await cmd(`zzdata ${A} cosserial::theboss`)).match(/= (\d+)/) || [])[1])
    const ann = text(B, t).match(/The Boss #(\d+)\/(\d+) title/)
    check('...numbered: the newest copy, #N of N, in the announcement and the player\'s own line', own > 0 && ann && Number(ann[1]) === own && Number(ann[2]) === own && new RegExp(`The Boss #${own}/${own}`).test(text(A, t)), `serial=${own} ${text(A, t).slice(0, 200)}`)

    // ---------- A Hacked stand: the animated hologram ----------
    await cmd(`lp user ${A} permission set donating.store true`)
    await sleep(1500)
    await cmd(`minecraft:tp ${A} ${SPARE[0] + 0.5} ${Y} ${SPARE[2] - 2.5} 0 20`)
    await sleep(600)
    await bots[A].lookAt(new Vec3(SPARE[0] + 0.5, SPARE[1] + 0.5, SPARE[2] + 0.5), true)
    await sleep(300)
    t = Date.now()
    bots[A].chat('/dcrate place hacked')
    await sleep(1200)
    placed.push(SPARE)
    const holoName = ((text(A, t).match(/hologram (crate_\d+)/) || [])[1]) || ''
    let holo = ''
    try { holo = fs.readFileSync(path.join(HOLOS, `${holoName}.yml`), 'utf8') } catch (e) {}
    check('a Hacked stand\'s hologram shows the animated name, refreshed every 2 ticks', /placed hacked/.test(text(A, t)) && /donating_hacked_crate/.test(holo) && /update-interval: 2\b/.test(holo), `${text(A, t)} ${holo.slice(0, 300)}`)
    bots[A].chat('/dcrate remove')
    await sleep(800)
    placed.pop()
    await cmd(`lp user ${A} permission unset donating.store`)
    await cmd(`minecraft:tp ${A} 901.5 ${Y} 907.5 0 20`)
    check('/dcrate remove takes it away', !/hacked at world:904:200:910/.test(await cmd('dcrate list')))

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
    const reopened = await until(async () => (await state()) === 'open', 6000)
    check('it reopens a cooling heist for everyone, announced with the name', reopened && /CrateA refreshed the Refresh Bank/.test(text(B, t)) && /Refresh Bank is open/.test(text(B, t)), `${await state()} / ${text(B, t)}`)
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

    // ---------- Car crate keys for game money (owner, 2026-09-28: "only purchasable with in game money ($1M+)") ----------
    const storeGive = await cmd(`zzconsole dcrate give ${A} supercar 1`)
    await sleep(300)
    check('the store command never gives car crate keys (game money only)', (await keys(A, 'supercar')) === 0 && /refused .*supercar keys are never given by command/.test(log('crates')), `${storeGive} keys=${await keys(A, 'supercar')}`)
    await cmd(`zzcombatend ${A}`)
    await cmd(`eco set ${A} 900000`)
    const k0 = await keys(A, 'supercar')
    const cw = await menu(A)
    const sc = slotOf(cw, 'Supercar')
    let po = windowOpen(bots[A])
    bots[A].clickWindow(sc, 0, 0).catch(() => {})
    let pv = await po
    await sleep(300)
    check('a car crate\'s preview sells a key for game money ($1,000,000); its keys aren\'t in the store', /Buy a key/.test(itemText(pv && pv.slots[51])) && /1,000,000/.test(itemText(pv && pv.slots[51])) && /never sold in the store/.test(itemText(pv && pv.slots[51])), `${sc} ${itemText(pv && pv.slots[51]).slice(0, 300)}`)
    t = Date.now()
    bots[A].clickWindow(51, 0, 0).catch(() => {})
    await sleep(900)
    check('too little money ($900,000): refused on the first click, no confirm, no key', /costs \$1,000,000/.test(text(A, t)) && (await keys(A, 'supercar')) === k0 && (await bal(A)) === 900000, `${text(A, t)} keys=${await keys(A, 'supercar')}`)
    await cmd(`eco set ${A} 1500000`)
    po = windowOpen(bots[A])
    bots[A].clickWindow(51, 0, 0).catch(() => {})
    pv = await po
    await sleep(300)
    const armed = itemText(pv && pv.slots[51])
    const before2 = await keys(A, 'supercar')
    po = windowOpen(bots[A])
    t = Date.now()
    bots[A].clickWindow(51, 0, 0).catch(() => {})
    await po
    await sleep(500)
    check('the first click arms it ("Confirm purchase?"), the second buys one key for $1,000,000 (logged)', /Confirm purchase/.test(armed) && before2 === k0 && (await keys(A, 'supercar')) === k0 + 1 && (await bal(A)) === 500000 && /buy CrateA \S+ supercar price=1000000/.test(log('crates')), `${armed.slice(0, 200)} keys=${await keys(A, 'supercar')} bal=${await bal(A)} ${text(A, t)}`)
    await closeAll(A)
  } finally {
    await rcon.cmd('zzcfgreload').catch(() => {})
    await rcon.cmd(`dheist delete ${HID} confirm`).catch(() => {})
    await rcon.cmd(`rg remove -w world heist_${HID}`).catch(() => {})
    // Stands left over: remove them as a player (in game only) if A is still here.
    if (bots[A] && placed.length) {
      await rcon.cmd(`lp user ${A} permission set donating.store true`).catch(() => {})
      await sleep(1500)
      for (const s of placed) {
        await rcon.cmd(`minecraft:tp ${A} ${s[0] + 0.5} ${Y} ${s[2] - 2.5} 0 20`).catch(() => {})
        await sleep(600)
        try { await bots[A].lookAt(new Vec3(s[0] + 0.5, s[1] + 0.5, s[2] + 0.5), true) } catch (e) {}
        await sleep(300)
        try { bots[A].chat('/dcrate remove') } catch (e) {}
        await sleep(700)
      }
    }
    await rcon.cmd(`rg remove -w world ${SAFE}`).catch(() => {})
    for (const name of [A, B]) {
      await rcon.cmd(`dranks give ${name} none`).catch(() => {})
      await rcon.cmd(`lp user ${name} permission unset donating.store`).catch(() => {})
      await rcon.cmd(`zzcratereset ${name}`).catch(() => {})
      await rcon.cmd(`zzbountyreset ${name}`).catch(() => {})
      await rcon.cmd(`zzclear ${name}`).catch(() => {})
      await rcon.cmd(`zzheisttp ${name} ${FAR}`).catch(() => {})
    }
    for (const bot of Object.values(bots)) await quit(bot)
    for (const s of [...Object.values(STANDS), SPARE]) await rcon.cmd(`setblock ${s.join(' ')} air`).catch(() => {})
    await rcon.cmd(`fill ${PLATFORM} air`).catch(() => {})
    await rcon.cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
