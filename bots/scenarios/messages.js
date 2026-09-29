// messages.sk: the phone's Messages app. Every text a contact sends (story.sk's storyText) lands in chat and in the
// player's inbox; the phone's Messages app shows "N new"; /messages lists one head per contact, the newest
// conversation first, with its unread count; a conversation shows its texts (the unread ones "new") and reading it
// clears them; ◀ Messages back to the list, ◀ Phone to the phone; "Find <contact>" when the map has that contact's quest
// giver (else "<contact> isn't in town yet"); only the newest 60 texts are kept, 20 a page (Older / Newer); /messages <contact> opens one; a join says how many are unread; /messages tab-completes
// the contacts.
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'MsgA'
const FAR = '0.5 68 -656.5'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  let mara = ''
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
    // Mara stands in town (a story giver); Vic (fence) doesn't.
    mara = ((await cmd('dquest addat story 30.5 68 -656.5 90 Test Safehouse')).match(/giver (\d+) \(story\) added/) || [])[1] || ''
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
    // The home screen's dock: Messages at 38 (phone.sk openPhone), the unread count as its lore and its stack size.
    const isHome = () => itemName(at(39)) === 'GPS' && itemName(at(49)) === 'Close'
    check('the phone\'s Messages app (slot 38) shows "3 new"', phone && isHome() && itemName(at(38)) === 'Messages' && /3 new/.test(itemLore(at(38))) && at(38).count === 3, `${title(phone)} "${itemName(at(38))}" (${itemLore(at(38))}) x${at(38) && at(38).count}`)
    const list0 = await click(38)
    check('...which opens Messages', /Messages/.test(title(list0)), title(list0))

    // ---------- /messages ----------
    // Phone pages (ui.sk): ◀ Phone / ◀ Messages at 2, the contacts from 11, a conversation's texts from 11 (20 a page),
    // Find <contact> at 4, Older / Newer at 5 / 6.
    const list = await chatOpen('/messages')
    check('/messages: one head per contact with their skin, the newest conversation first (Vic, then Mara), with the unread count', /Messages$/.test(title(list)) && at(11) && at(11).name === 'player_head' && /^Vic \(1 new\)/.test(itemName(at(11))) && /^Mara \(2 new\)/.test(itemName(at(12))) && /Meet me at the Safehouse/.test(itemLore(at(12))), `${at(11) && at(11).name} "${itemName(at(11))}" | "${itemName(at(12))}" (${itemLore(at(12))})`)
    check('...and ◀ Phone (slot 2)', at(2) && itemName(at(2)) === '◀ Phone', itemName(at(2)))
    const thread = await click(12)
    check('a conversation: its texts oldest first, the unread ones "new", and "Find Mara"', /Mara$/.test(title(thread)) && /new/.test(itemName(at(11))) && /First job for you/.test(itemLore(at(11))) && /Meet me/.test(itemLore(at(12))) && !at(13) && /Find Mara/.test(itemName(at(4))), `${title(thread)} "${itemName(at(11))}" (${itemLore(at(11))}) "${itemName(at(12))}" ${itemName(at(4))}`)
    const back = await click(2)
    check('◀ Messages goes back to Messages, and reading Mara cleared her new ones (Vic\'s stay)', /Messages$/.test(title(back)) && /^Mara$/.test(itemName(at(12))) && /^Vic \(1 new\)/.test(itemName(at(11))), `${title(back)} "${itemName(at(11))}" "${itemName(at(12))}"`)
    const toPhone = await click(2)
    check('◀ Phone opens the phone, now "1 new" on Messages', toPhone && isHome() && /1 new/.test(itemLore(at(38))), `${title(toPhone)} "${itemName(at(38))}" (${itemLore(at(38))})`)

    // ---------- /messages <contact> ----------
    const vic = await chatOpen('/messages vic')
    check('/messages vic opens his conversation; no Vic on the map: "Vic isn\'t in town yet" instead of Find', /Vic$/.test(title(vic)) && /Fresh list/.test(itemLore(at(11))) && /Vic isn't in town yet/.test(itemName(at(4))), `${title(vic)} ${itemLore(at(11))} ${itemName(at(4))}`)

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
    // 20 a page, page 1 the newest 20 (oldest first within it): all 60 kept texts can be read with Older / Newer.
    const pg = () => `${itemLore(at(11))} ... ${itemLore(at(42))} older=${itemName(at(5))} newer=${itemName(at(6))}`
    const p1 = /Tip number 41\./.test(itemLore(at(11))) && /Tip number 60\./.test(itemLore(at(42))) && itemName(at(5)) === 'Older' && !at(6)
    const d1 = pg()
    await click(5)
    const p2 = /Tip number 21\./.test(itemLore(at(11))) && /Tip number 40\./.test(itemLore(at(42))) && itemName(at(5)) === 'Older' && itemName(at(6)) === 'Newer'
    const d2 = pg()
    await click(5)
    const p3 = /Tip number 1\./.test(itemLore(at(11))) && /Tip number 20\./.test(itemLore(at(42))) && !at(5) && itemName(at(6)) === 'Newer'
    const d3 = pg()
    await click(6)
    const p4 = /Tip number 21\./.test(itemLore(at(11)))
    check('a long conversation: 20 a page (Tip 41-60, Older: 21-40, Older: 1-20, Newer: 21-40 again)', broker && p1 && p2 && p3 && p4, `${d1} | ${d2} | ${d3} | newer: ${itemLore(at(11))}`)

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
    if (mara) await rcon.cmd(`zzconsole dquest remove ${mara}`).catch(() => {})
    await rcon.cmd(`zzinboxclear ${A}`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
