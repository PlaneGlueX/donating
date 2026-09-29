// DonatingPhone MenuPanels.java: the pack makes the chest part of generic_54.png see-through (the phone menus show the
// world around the phone), so every other 9xN chest menu gets vanilla's top panel back through its title: for a player
// whose pack is loaded, a white run [-8] [the panel for its rows: U+E020 + rows - 1] [-169] before the original title
// (which keeps its own color, vanilla's #404040 when it had none). A phone page (its title draws the phone, U+E010 /
// U+E011) gets nothing added. A player without the pack gets the plain title, and a phone page's title turns into its
// visible text only (the status bar's), in vanilla's title gray: no private-use characters (boxes without the pack).
// Covers Skript menus (a shop, /bag), world chests (a chest, a double chest) and the phone's home screen.
// Two bots: one that loads the pack (lib.js join pack 'loaded': accepted, downloaded, loaded; nothing is downloaded)
// and one that declines it (pack 'declined'). Runs on its own glass platform in the sky and removes what it placed.
const { Vec3 } = require('vec3')
const { join, sleep, quit, colorOf } = require('../lib')
const rconLib = require('../rcon')

const LOADED = 'PanelsLoaded'
const DECLINED = 'PanelsDeclined'
const Y = 200
const CHUNKS = '4250 4250 4270 4270'
const PLATFORM = `4252 ${Y - 1} 4252 4268 ${Y - 1} 4268`
const CHEST = [4258, Y, 4262]            // a single chest (3 rows)
// A double chest (6 rows), facing south: the left half at x, the right half at x - 1 (vanilla's ChestBlock: a left
// half connects clockwise of its facing, west for south).
const DOUBLE = [[4262, Y, 4262], [4261, Y, 4262]]
const SPOTS = { [LOADED]: [4258.5, Y, 4264.5], [DECLINED]: [4261.5, Y, 4264.5] }

const RUN_AFTER = String.fromCharCode(0xF808, 0xF806, 0xF804, 0xF801) // -169 (code points: editors drop private-use characters)
const panelRun = rows => String.fromCharCode(0xF804, 0xE020 + rows - 1) + RUN_AFTER
const range = (a, b) => new RegExp('[' + String.fromCharCode(a) + '-' + String.fromCharCode(b) + ']')
const PRIVATE = range(0xE000, 0xF8FF)
const PANEL_GLYPH = range(0xE020, 0xE02F)
const PHONE_GLYPH = range(0xE010, 0xE011)
// The color a translated part (a world chest's name) is drawn in: inherited from its parents only.
const translateColor = (json, key, inherited = null) => {
  if (json == null || typeof json !== 'object') return undefined
  const color = json.color || inherited
  if (json.translate === key) return color
  for (const child of [...(json.with || []), ...(json.extra || [])]) {
    const found = translateColor(child, key, color)
    if (found !== undefined) return found
  }
  return undefined
}
const hex = s => [...s].map(c => (c.charCodeAt(0) > 126 ? `\\u${c.charCodeAt(0).toString(16).toUpperCase()}` : c)).join('')

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  const bots = {}
  try {
    await cmd(`forceload add ${CHUNKS}`)
    await cmd(`fill ${PLATFORM} glass`)
    await cmd(`setblock ${CHEST.join(' ')} chest[facing=south]`)
    await cmd(`setblock ${DOUBLE[0].join(' ')} chest[facing=south,type=left]`)
    await cmd(`setblock ${DOUBLE[1].join(' ')} chest[facing=south,type=right]`)

    bots[LOADED] = await join(LOADED, { pack: 'loaded' })
    bots[DECLINED] = await join(DECLINED, { pack: 'declined' })
    const ChatMessage = require('prismarine-chat')(bots[LOADED].registry)
    for (const name of [LOADED, DECLINED]) {
      await cmd(`gamemode survival ${name}`)
      await cmd(`lp user ${name} permission unset donating.inventory.bypass`)
      await cmd(`zzclear ${name}`)
      await cmd(`minecraft:tp ${name} ${SPOTS[name].join(' ')} 180 20`)
    }
    // No pack in server.properties (nothing asked at login): send the local one in play; the bot says it loaded.
    if (bots[LOADED].packPrompts === 0) {
      await cmd(`zzpack ${LOADED}`)
      const start = Date.now()
      while (bots[LOADED].packPrompts === 0 && Date.now() - start < 5000) await sleep(100)
    }
    await sleep(2000)
    check('the loading bot was asked for the pack and said it loaded', bots[LOADED].packPrompts > 0, `prompts=${bots[LOADED].packPrompts}`)

    // A window's title: its text (translations resolved), the component tree, and the chest rows.
    const read = w => {
      if (!w) return null
      const msg = ChatMessage.fromNotch(w.title)
      return { text: msg.toString(), json: msg.json, rows: Math.round(w.inventoryStart / 9) }
    }
    const opened = (bot, waitMs = 3000) => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), waitMs)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const close = async bot => { if (bot.currentWindow) bot.closeWindow(bot.currentWindow); await sleep(400) }
    const openWith = async (name, how) => {
      const bot = bots[name]
      await close(bot)
      const w = opened(bot)
      await how(bot)
      const win = await w
      await sleep(300)
      return read(win)
    }
    const byCommand = (name, c) => openWith(name, bot => bot.chat(c))
    const byConsole = (name, c) => openWith(name, () => cmd(c))
    // F (swap hands) with the phone in hotbar 9: the phone's home screen (phone.sk).
    const phoneHome = name => openWith(name, async bot => {
      bot.setQuickBarSlot(8)
      await sleep(300)
      bot._client.write('block_dig', { status: 6, location: new Vec3(0, 0, 0), face: 0, sequence: 0 })
    })
    const chest = (name, pos) => openWith(name, async bot => {
      bot.setQuickBarSlot(0) // not the phone: it doesn't use blocks
      await sleep(300)
      const block = bot.blockAt(new Vec3(...pos))
      if (block) bot.activateBlock(block).catch(() => {})
    })

    // What a pack-loaded player must get: a phone page untouched (no panel), any other menu the panel for its rows,
    // then the original title.
    const loadedOk = t => {
      if (!t) return false
      if (PHONE_GLYPH.test(t.text)) return !PANEL_GLYPH.test(t.text)
      return t.text.startsWith(panelRun(t.rows)) && t.text.length > panelRun(t.rows).length &&
        !PANEL_GLYPH.test(t.text.slice(panelRun(t.rows).length)) && colorOf(t.json, panelRun(t.rows)) === 'white'
    }
    const show = t => (t ? `rows=${t.rows} "${hex(t.text)}"` : 'no window')

    // ---------- The pack loaded ----------
    let t = await byCommand(LOADED, '/bag')
    check('pack loaded: /bag gets the panel for its rows before its title, or nothing added if it\'s a phone page', loadedOk(t), show(t))
    t = await phoneHome(LOADED)
    check('pack loaded: the phone\'s home screen keeps its own glyph and gets no panel (no U+E02x)', Boolean(t) && PHONE_GLYPH.test(t.text) && !PANEL_GLYPH.test(t.text), show(t))
    t = await byConsole(LOADED, `dshop open ${LOADED} gun`)
    check('pack loaded: a shop (a Skript menu) gets the panel for its rows', loadedOk(t), show(t))
    if (t && !PHONE_GLYPH.test(t.text)) {
      const rest = t.text.slice(panelRun(t.rows).length)
      const word = rest.trim().split(' ')[0]
      check('...and its title keeps its own color (dark gray)', colorOf(t.json, word) === 'dark_gray', `${colorOf(t.json, word)} "${rest}"`)
    }
    t = await chest(LOADED, CHEST)
    check('pack loaded: a world chest (3 rows) gets U+F804 (-8) U+E022 and -169 before "Chest"', Boolean(t) && t.rows === 3 && t.text === panelRun(3) + 'Chest', show(t))
    const chestColor = t ? translateColor(t.json, 'container.chest') : undefined
    check('...and the untouched title part is vanilla\'s gray (#404040), not the glyph run\'s white', /^#404040$/i.test(chestColor || ''), `${chestColor} ${JSON.stringify(t && t.json)}`)
    t = await chest(LOADED, DOUBLE[1])
    check('pack loaded: a 6-row menu (a double chest) gets U+E025', Boolean(t) && t.rows === 6 && t.text.startsWith(panelRun(6)), show(t))
    await close(bots[LOADED])

    // ---------- The pack declined ----------
    t = await byCommand(DECLINED, '/bag')
    check('pack declined: /bag\'s title has no private-use characters (no boxes)', Boolean(t) && t.text.trim().length > 0 && !PRIVATE.test(t.text), show(t))
    t = await phoneHome(DECLINED)
    check('pack declined: the phone\'s title is only its status text (no glyphs, no pack spaces)', Boolean(t) && t.text.trim().length > 0 && !PRIVATE.test(t.text), show(t))
    if (t) check('...in a readable color (not white on the vanilla panel)', colorOf(t.json, t.text.trim()) !== 'white', `${colorOf(t.json, t.text.trim())} ${JSON.stringify(t.json)}`)
    t = await chest(DECLINED, CHEST)
    check('pack declined: a world chest keeps its plain title', Boolean(t) && t.text === 'Chest', show(t))
    t = await byConsole(DECLINED, `dshop open ${DECLINED} gun`)
    check('pack declined: a shop keeps its plain title', Boolean(t) && t.text.trim().length > 0 && !PRIVATE.test(t.text), show(t))
    await close(bots[DECLINED])
  } finally {
    for (const name of Object.keys(bots)) await quit(bots[name])
    await cmd(`setblock ${CHEST.join(' ')} air`).catch(() => {})
    for (const pos of DOUBLE) await cmd(`setblock ${pos.join(' ')} air`).catch(() => {})
    await cmd(`fill ${PLATFORM} air`).catch(() => {})
    await cmd(`forceload remove ${CHUNKS}`).catch(() => {})
    rcon.close()
  }
}
