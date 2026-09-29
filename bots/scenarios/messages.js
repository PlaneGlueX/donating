// messages.sk: the phone's Messages app. Every text a contact sends (story.sk's storyText) lands in chat and in the
// player's inbox; the phone's apps show "Messages (N new)"; /messages lists one head per contact, the newest
// conversation first, with its unread count; a conversation shows its texts (the unread ones "new") and reading it
// clears them; ◀ Back to Messages, ◀ Phone to the phone; "Find <contact>" for contacts with a quest giver; only the
// newest 60 texts are kept; /messages <contact> opens one; a join says how many are unread; /messages tab-completes
// the contacts.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'MsgA'
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  try {
    const text = t => messagesSince(bot, t).map(m => m.text).join(' | ')
    const nbtText = nbt => {
      const out = []
      const walk = v => {
        if (!v || typeof v !== 'object') return
        if (v.text && v.text.type === 'string') out.push(v.text.value)
        for (const k of Object.keys(v)) if (k !== 'text') walk(v[k])
      }
      walk(nbt)
      return out.join('')
    }
    const title = w => (w ? (typeof w.title === 'string' ? w.title : nbtText(w.title)) : '')
    const comp = (i, type) => (i && i.components ? i.components.find(c => c.type === type) : null)
    const itemName = i => { const c = comp(i, 'custom_name'); return c ? nbtText(c.data) : '' }
    const itemLore = i => { const c = comp(i, 'lore'); return c ? c.data.map(nbtText).join(' / ') : '' }
    const at = n => (bot.currentWindow ? bot.currentWindow.slots[n] : null)
    const windowOpen = () => new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 4000)
      bot.once('windowOpen', w => { clearTimeout(timer); resolve(w) })
    })
    const closeAll = async () => { if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); await sleep(400) } }
    const opens = async fn => { const o = windowOpen(); await fn(); const w = await o; await sleep(400); return w }
    const chatOpen = async line => { await closeAll(); return opens(() => bot.chat(line)) }
    const click = async n => opens(() => { bot.clickWindow(n, 0, 0).catch(() => {}) })
    const say = async (from, line) => cmd(`zztext ${A} ${from} ${line}`)
    // The tab completion reply for a typed line (the transaction id matched, as tabcomplete.js does).
    const tab = line => new Promise(resolve => {
      const id = Math.floor(Math.random() * 30000) + 1
      const timer = setTimeout(() => resolve(null), 3000)
      const on = p => { if (p.transactionId === id) { clearTimeout(timer); bot._client.removeListener('tab_complete', on); resolve((p.matches || []).map(m => (typeof m === 'string' ? m : m.match))) } }
      bot._client.on('tab_complete', on)
      bot._client.write('tab_complete', { transactionId: id, text: line })
    })

    // ---------- Setup ----------
    bot = await join(A)
    await cmd(`zzinboxclear ${A}`)
    await cmd(`zzclear ${A}`)
    await sleep(1500)

    // ---------- Texts land in chat and in the inbox ----------
    let t = Date.now()
    await say('Mara', 'First job for you.')
    await sleep(200)
    await say('Mara', 'Meet me at the Safehouse.')
    await sleep(200)
    const r = await say('Vic', 'Fresh list. Don\'t make me wait.')
    await sleep(500)
    check('a contact\'s text shows in chat and is kept (3 texts, 3 unread)', /✉ Mara: First job for you/.test(text(t)) && /✉ Vic: Fresh list/.test(text(t)) && /n=3 unread=3/.test(r), `${r} | ${text(t).slice(0, 200)}`)

    // ---------- The phone's app ----------
    const phone = await opens(async () => { await cmd(`zzheisttp ${A} ${FAR}`); bot.setQuickBarSlot(8); await sleep(500); bot._client.write('block_dig', { status: 6, location: { x: 0, y: 0, z: 0 }, face: 0, sequence: 0 }) })
    check('the phone\'s apps show "✉ Messages (3 new)" in slot 0', phone && /Phone/.test(title(phone)) && /Messages \(3 new\)/.test(itemName(at(0))), `${title(phone)} ${itemName(at(0))}`)
    const list0 = await click(0)
    check('...which opens Messages', /Messages/.test(title(list0)), title(list0))

    // ---------- /messages ----------
    const list = await chatOpen('/messages')
    check('/messages: one head per contact with their skin, the newest conversation first (Vic, then Mara), with the unread count', /Messages/.test(title(list)) && at(10) && at(10).name === 'player_head' && /^Vic \(1 new\)/.test(itemName(at(10))) && /^Mara \(2 new\)/.test(itemName(at(11))) && /Meet me at the Safehouse/.test(itemLore(at(11))), `${at(10) && at(10).name} "${itemName(at(10))}" | "${itemName(at(11))}" (${itemLore(at(11))})`)
    check('...and ◀ Phone (slot 27)', at(27) && itemName(at(27)) === '◀ Phone', itemName(at(27)))
    const thread = await click(11)
    check('a conversation: its texts oldest first, the unread ones "new", and "Find Mara"', /Mara/.test(title(thread)) && /new/.test(itemName(at(0))) && /First job for you/.test(itemLore(at(0))) && /Meet me/.test(itemLore(at(1))) && !at(2) && /Find Mara/.test(itemName(at(49))), `${title(thread)} "${itemName(at(0))}" (${itemLore(at(0))}) "${itemName(at(1))}" ${itemName(at(49))}`)
    const back = await click(45)
    check('◀ Back goes to Messages, and reading Mara cleared her new ones (Vic\'s stay)', /Messages/.test(title(back)) && /^Mara$/.test(itemName(at(11))) && /^Vic \(1 new\)/.test(itemName(at(10))), `${title(back)} "${itemName(at(10))}" "${itemName(at(11))}"`)
    const toPhone = await click(27)
    check('◀ Phone opens the phone, now "Messages (1 new)"', /Phone/.test(title(toPhone)) && /Messages \(1 new\)/.test(itemName(at(0))), `${title(toPhone)} ${itemName(at(0))}`)

    // ---------- /messages <contact> ----------
    const vic = await chatOpen('/messages vic')
    check('/messages vic opens his conversation', /Vic/.test(title(vic)) && /Fresh list/.test(itemLore(at(0))), `${title(vic)} ${itemLore(at(0))}`)
    await closeAll()
    t = Date.now()
    bot.chat('/messages nobody')
    await sleep(800)
    check('/messages nobody: "No texts from nobody"', /No texts from nobody/.test(text(t)), text(t))
    const tc = await tab('/messages ')
    check('/messages tab-completes the contacts who texted', tc && tc.includes('Mara') && tc.includes('Vic'), JSON.stringify(tc))

    // ---------- Only the newest 60 are kept ----------
    for (let i = 1; i <= 60; i++) await say('Broker', `Tip number ${i}.`)
    const kept = await cmd(`zzdata ${A} inbox::3::text`)
    const gone = await cmd(`zzdata ${A} inbox::1::text`)
    const newest = await cmd(`zzdata ${A} inbox-n`)
    check('only the newest 60 texts are kept (63 sent: texts 1-3 gone, 4-63 kept)', /= <none>/.test(gone) && /= <none>/.test(kept) && /= 63/.test(newest) && /Tip number 1\./.test(await cmd(`zzdata ${A} inbox::4::text`)), `${gone} | ${kept} | ${newest}`)
    const broker = await chatOpen('/messages broker')
    check('a long conversation shows its newest 45 (Tip 16 to Tip 60)', /Tip number 16\./.test(itemLore(at(0))) && /Tip number 60\./.test(itemLore(at(44))), `${itemLore(at(0))} ... ${itemLore(at(44))}`)
    await closeAll()

    // ---------- A join says how many are unread ----------
    await say('Mara', 'One more thing.')
    await quit(bot)
    await sleep(1500)
    bot = await join(A)
    t = Date.now()
    await sleep(7500)
    check('a join says how many texts wait unread', /✉ 1 unread message\(s\)/.test(text(t)), text(t).slice(0, 300))
  } finally {
    await rcon.cmd(`zzinboxclear ${A}`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
