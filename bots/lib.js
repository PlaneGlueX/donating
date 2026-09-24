// Shared helpers for Mineflayer test bots. LOCAL test server only (offline mode).
const mineflayer = require('mineflayer')

const HOST = process.env.MC_HOST || '127.0.0.1'
const PORT = Number(process.env.MC_PORT || 25565)
const VERSION = process.env.MC_VERSION || '1.21.11'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Joins the server and resolves once the bot has spawned.
// Every chat/system/action-bar line and every title lands in bot.log for later checks.
// `motd` keeps the formatting as § codes (e.g. "§6§lDONATING§r"), `json` the component tree
// (see colorOf), for color checks.
function join (username, { timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const bot = mineflayer.createBot({ host: HOST, port: PORT, username, version: VERSION, auth: 'offline' })
    bot.log = []
    const record = (kind, text, motd = '', json = null) => {
      bot.log.push({ t: Date.now(), kind, text, motd, json })
      if (process.env.BOT_VERBOSE) console.error(`[${username}] ${kind}: ${text}`)
    }
    // Player chat: when a plugin changes the message (LPC's format, mentions), the server sends the
    // result as unsigned content, which is what the real client shows. Mineflayer keeps it in
    // msg.unsigned and the typed text in msg itself.
    bot.on('message', (msg, position) => {
      const shown = msg.unsigned || msg
      record(position, shown.toString(), shown.toMotd(), shown.json)
    })
    // Mineflayer's own 'title' event passes 1.21's NBT titles on as raw objects ("[object Object]"),
    // so the title packets are decoded here the same way chat messages are.
    const title = (type, raw) => {
      const msg = require('prismarine-chat')(bot.registry).fromNotch(raw)
      record(`title:${type}`, msg.toString(), msg.toMotd(), msg.json)
    }
    bot._client.on('set_title_text', packet => title('title', packet.text))
    bot._client.on('set_title_subtitle', packet => title('subtitle', packet.text))
    bot.on('kicked', reason => record('kicked', typeof reason === 'string' ? reason : JSON.stringify(reason)))
    bot.on('error', err => record('error', err.message))

    const timer = setTimeout(() => reject(new Error(`${username} did not spawn within ${timeoutMs} ms`)), timeoutMs)
    bot.once('spawn', () => { clearTimeout(timer); resolve(bot) })
    bot.once('end', reason => { clearTimeout(timer); reject(new Error(`${username} disconnected before spawn: ${reason}`)) })
  })
}

// Messages seen since `since` (ms timestamp), optionally filtered by a regex.
function messagesSince (bot, since, pattern) {
  return bot.log.filter(m => m.t >= since && (!pattern || pattern.test(m.text)))
}

// Waits until a message matching `pattern` arrives, or throws after timeoutMs.
async function waitForMessage (bot, pattern, timeoutMs = 5000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const hit = messagesSince(bot, start - 50, pattern)[0]
    if (hit) return hit
    await sleep(100)
  }
  throw new Error(`no message matching ${pattern} within ${timeoutMs} ms`)
}

// Color of the text containing `needle` in a message's component tree, as the client shows it
// (a color is inherited from parents only, never from earlier siblings). null = default color.
function colorOf (json, needle, inherited = null) {
  if (json == null) return undefined
  if (typeof json === 'string') return json.includes(needle) ? inherited : undefined
  const color = json.color || inherited
  // Text from NBT components can arrive under an empty key instead of "text".
  const text = typeof json.text === 'string' ? json.text : json['']
  if (typeof text === 'string' && text.includes(needle)) return color
  // `with` holds a translation's arguments: player chat is a translate "%s" with the message inside.
  for (const child of [...(json.with || []), ...(json.extra || [])]) {
    const found = colorOf(child, needle, color)
    if (found !== undefined) return found
  }
  return undefined
}

// Compact snapshot of the player inventory: slot -> "name xcount".
// Slots: 5-8 armor, 9-35 upper inventory, 36-44 hotbar (1-9), 45 offhand.
function inventorySnapshot (bot) {
  const out = {}
  bot.inventory.slots.forEach((item, slot) => {
    if (item) out[slot] = `${item.name} x${item.count}`
  })
  return out
}

function quit (bot) {
  return new Promise(resolve => {
    if (!bot || !bot._client || bot._client.ended) return resolve()
    bot.once('end', () => resolve())
    bot.quit()
    setTimeout(resolve, 3000)
  })
}

module.exports = { join, sleep, messagesSince, waitForMessage, colorOf, inventorySnapshot, quit, HOST, PORT, VERSION }
