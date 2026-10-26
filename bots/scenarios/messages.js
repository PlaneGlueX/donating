// messages.sk: the phone's Messages app (reworked 2026-10-19: the owner's "theres alot of spam when the quest messages
// get put into the phone messages"). Away from a contact, their lines are a text: one contact's lines within a second
// are ONE text (one unread, one short chat notice "✉ Mara: <first words>… · /messages"); the same text again within
// 30 minutes isn't kept again; standing with the contact (10 blocks of their quest giver) a line is said in chat and
// never kept; a mission's brief ("keep") said in person is kept as read (new when an older text from them is still
// unread: it can't mark only itself read); "say" lines are never kept. The phone's
// Messages app shows "N new"; /messages lists one head per contact, the newest conversation first, with its unread
// count; a conversation shows its texts (the unread ones "new") and reading it clears them; ◀ Messages back to the list,
// ◀ Phone to the phone; "Find <contact>" when the map has that contact's quest giver (else "<contact> isn't in town
// yet"); only the newest 60 texts are kept, 20 a page (Older / Newer); /messages <contact> opens one; /messages
// tab-completes the contacts; an old inbox (every line kept) is tidied once at a join; a join says how many are unread;
// a text or a whole conversation deleted on a second click (2026-10-21).
const { join, sleep, quit, messagesSince } = require('../lib')
const rconLib = require('../rcon')

const A = 'MsgA'
const FAR = '0.5 68 -656.5'
// On the ground (y 72 is the hill's top: at y 68 the bot suffocated), 5.4 blocks from Mara.
const NEAR = '32.5 73 -656.5'
const LONG = 'Listen carefully, because I only say this once: the vault on Fifth opens at noon and the guards swap at ten past.'
const LEFTY_BRIEF = 'New fish? Come sit with me in Hall B. Free advice.'

module.exports = async ({ check }) => {
  const rcon = await rconLib.connect()
  const cmd = async c => (await rcon.cmd(c)).trim()
  let bot = null
  let mara = ''
  try {
    const lines = t => messagesSince(bot, t).map(m => m.text)
    const text = t => lines(t).join(' | ')
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
    const post = async (kind, from, line) => cmd(`zzmsg ${A} ${kind} ${from} ${line}`)
    // The inbox after the pending bursts are kept: n, unread, v, the newest text.
    const inbox = async () => cmd(`zzinbox ${A}`)
    const inboxN = s => Number((s.match(/ n=(\d+)/) || [])[1])
    const unread = s => Number((s.match(/unread=(\d+)/) || [])[1])
    const notices = (t, from) => lines(t).filter(l => l.startsWith(`✉ ${from}: `))
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
    // Mara stands in town (a story giver); Vic (fence) doesn't. The bot waits 30 blocks from her.
    mara = ((await cmd('dquest addat story 30.5 68 -656.5 90 Test Safehouse')).match(/giver (\d+) \(story\) added/) || [])[1] || ''
    await cmd(`zzheisttp ${A} ${FAR}`)
    await sleep(1500)

    // ---------- Away: a burst is one text, one notice ----------
    let t = Date.now()
    const r0 = await say('Mara', 'First job for you.')
    await sleep(150)
    await say('Mara', 'Meet me at the Safehouse.')
    await sleep(1600)
    let ib = await inbox()
    const maraNotes = notices(t, 'Mara')
    check('away, two lines from Mara within a second: ONE text (1 unread) and ONE chat notice with both, nothing kept before the second is up', /n=0 unread=0/.test(r0) && inboxN(ib) === 1 && unread(ib) === 1 && /last=Mara\|First job for you\. Meet me at the Safehouse\./.test(ib) && maraNotes.length === 1 && /✉ Mara: First job for you\. Meet me at the Safehouse\. · \/messages/.test(maraNotes[0]) && !lines(t).some(l => /^Mara: /.test(l)), `${r0} | ${ib} | ${text(t).slice(0, 300)}`)

    t = Date.now()
    await say('Mara', LONG)
    await sleep(1600)
    ib = await inbox()
    const longNote = notices(t, 'Mara')[0] || ''
    check('a long text: the chat notice is its first words ("…", at most 60 characters), the whole text in the inbox', inboxN(ib) === 2 && ib.includes(LONG) && /^✉ Mara: Listen carefully, .*… · \/messages$/.test(longNote) && longNote.length < LONG.length, `${ib} | ${longNote}`)

    t = Date.now()
    await say('Vic', 'Fresh list. Don\'t make me wait.')
    await sleep(1600)
    ib = await inbox()
    check('Vic\'s text: kept (3 texts, 3 unread), his notice', inboxN(ib) === 3 && unread(ib) === 3 && notices(t, 'Vic').length === 1, `${ib} | ${text(t).slice(0, 200)}`)

    // ---------- The same text again isn't kept again ----------
    t = Date.now()
    await say('Mara', 'First job for you.')
    await sleep(150)
    await say('Mara', 'Meet me at the Safehouse.')
    await sleep(150)
    await say('Mara', 'Meet me at the Safehouse.')
    await sleep(1600)
    ib = await inbox()
    check('the same text from Mara again within 30 minutes (a repeated line left out too): not kept again (still 3, 3 unread), its notice shows', inboxN(ib) === 3 && unread(ib) === 3 && notices(t, 'Mara').length === 1, `${ib} | ${text(t).slice(0, 200)}`)

    // ---------- The phone's app ----------
    const phone = await opens(async () => { bot.setQuickBarSlot(8); await sleep(500); bot._client.write('block_dig', { status: 6, location: { x: 0, y: 0, z: 0 }, face: 0, sequence: 0 }) })
    // The home screen's dock: Messages at 38 (phone.sk openPhone), the unread count as its lore and its stack size.
    const isHome = () => itemName(at(39)) === 'GPS' && itemName(at(49)) === 'Close'
    check('the phone\'s Messages app (slot 38) shows "3 new": one per text, not per line', phone && isHome() && itemName(at(38)) === 'Messages' && /3 new/.test(itemLore(at(38))) && at(38).count === 3, `${title(phone)} "${itemName(at(38))}" (${itemLore(at(38))}) x${at(38) && at(38).count}`)
    const list0 = await click(38)
    check('...which opens Messages', /Messages/.test(title(list0)), title(list0))

    // ---------- /messages ----------
    // Phone pages (ui.sk): ◀ Phone / ◀ Messages at 2, the contacts from 11, a conversation's texts from 11 (20 a page),
    // Find <contact> at 4, Older / Newer at 5 / 6.
    const list = await chatOpen('/messages')
    check('/messages: one head per contact with their skin, the newest conversation first (Vic, then Mara), with the unread count', /Messages$/.test(title(list)) && at(11) && at(11).name === 'player_head' && /^Vic \(1 new\)/.test(itemName(at(11))) && /^Mara \(2 new\)/.test(itemName(at(12))) && /Listen carefully/.test(itemLore(at(12))), `${at(11) && at(11).name} "${itemName(at(11))}" | "${itemName(at(12))}" (${itemLore(at(12))})`)
    check('...and ◀ Phone (slot 2)', at(2) && itemName(at(2)) === '◀ Phone', itemName(at(2)))
    const thread = await click(12)
    check('a conversation: its texts oldest first (the burst as one), the unread ones "new", and "Find Mara"', /Mara$/.test(title(thread)) && /new/.test(itemName(at(11))) && /First job for you\. Meet me at the Safehouse\./.test(itemLore(at(11)).replace(/ \/ /g, ' ')) && /Listen carefully/.test(itemLore(at(12))) && !at(13) && /Find Mara/.test(itemName(at(4))), `${title(thread)} "${itemName(at(11))}" (${itemLore(at(11))}) "${itemName(at(12))}" ${itemName(at(4))}`)
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

    // ---------- In person ----------
    await cmd(`zzheisttp ${A} ${NEAR}`)
    await sleep(1200)
    t = Date.now()
    await say('Mara', 'Right here, kid.')
    await sleep(1600)
    ib = await inbox()
    check('standing with Mara (2 blocks): her line is said in chat ("Mara: ..."), no notice, nothing kept', inboxN(ib) === 3 && lines(t).some(l => l === 'Mara: Right here, kid.') && notices(t, 'Mara').length === 0, `${ib} | ${text(t).slice(0, 200)}`)
    t = Date.now()
    await post('keep', 'Mara', 'Next: rob a store near the Safehouse.')
    await sleep(1600)
    ib = await inbox()
    check('a mission brief said in person: said in chat, and kept on the phone as read (4 texts, 0 unread)', inboxN(ib) === 4 && unread(ib) === 0 && /last=Mara\|Next: rob a store/.test(ib) && lines(t).some(l => /^Mara: Next: rob a store/.test(l)) && notices(t, 'Mara').length === 0, `${ib} | ${text(t).slice(0, 200)}`)
    t = Date.now()
    await post('say', 'Vic', 'Psst. Over here.')
    await sleep(1600)
    ib = await inbox()
    check('a "say" line (an inmate, the course, a talk) away from the contact: chat only, never kept', inboxN(ib) === 4 && lines(t).some(l => l === 'Vic: Psst. Over here.') && notices(t, 'Vic').length === 0, `${ib} | ${text(t).slice(0, 200)}`)
    await cmd(`zzheisttp ${A} ${FAR}`)

    // ---------- Only the newest 60 are kept ----------
    for (let i = 1; i <= 60; i++) await cmd(`zzinboxraw ${A} 0 Broker Tip number ${i}.`)
    const kept = await cmd(`zzdata ${A} inbox::4::text`)
    const gone = await cmd(`zzdata ${A} inbox::1::text`)
    const newest = await cmd(`zzdata ${A} inbox-n`)
    check('only the newest 60 texts are kept (64: texts 1-4 gone, 5-64 kept)', /= <none>/.test(gone) && /= <none>/.test(kept) && /= 64/.test(newest) && /Tip number 1\./.test(await cmd(`zzdata ${A} inbox::5::text`)), `${gone} | ${kept} | ${newest}`)
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

    // ---------- A brief said in person while an older text waits unread: it doesn't mark that one read ----------
    await cmd(`zzinboxclear ${A}`)
    await say('Mara', 'Swing by when you can.')
    await sleep(1600)
    await cmd(`zzheisttp ${A} ${NEAR}`)
    await sleep(1200)
    t = Date.now()
    await post('keep', 'Mara', 'Next: crack a safe.')
    await sleep(1600)
    ib = await inbox()
    check('a brief said in person while an older Mara text is unread: kept, and the older one stays new (2 texts, 2 unread)', inboxN(ib) === 2 && unread(ib) === 2 && /last=Mara\|Next: crack a safe\./.test(ib) && lines(t).some(l => /^Mara: Next: crack a safe/.test(l)), `${ib} | ${text(t).slice(0, 200)}`)
    await cmd(`zzheisttp ${A} ${FAR}`)

    // ---------- Deleting (2026-10-21; untested (cloud)): a text, then a whole conversation, each on a second click ----------
    await cmd(`zzinboxclear ${A}`)
    await cmd(`zzinboxraw ${A} 0 Mara Delete me.`)
    await cmd(`zzinboxraw ${A} 0 Mara Keep me.`)
    await cmd(`zzinboxraw ${A} 0 Vic Stay.`)
    const conv = await chatOpen('/messages mara')
    check('a conversation has "Clear chat" (slot 3) and each text says "Click twice: delete"', /Mara$/.test(title(conv)) && /Clear chat/.test(itemName(at(3))) && /Click twice: delete/.test(itemLore(at(11))), `"${itemName(at(3))}" (${itemLore(at(11))})`)
    await click(11)
    const armedText = at(11) && at(11).name === 'red_concrete' && /Delete\?/.test(itemName(at(11)))
    const dataBefore = await cmd(`zzdata ${A} inbox::1::text`)
    await click(11)
    const gone1 = await cmd(`zzdata ${A} inbox::1::text`)
    check('a click arms the text (a red "Delete?"), a second click deletes it: only "Keep me." is left', armedText && /Delete me\./.test(dataBefore) && /= <none>/.test(gone1) && /Keep me\./.test(itemLore(at(11))) && !at(12), `armed=${armedText} | ${gone1} | ${itemLore(at(11))}`)
    await click(3)
    const armedClear = at(3) && at(3).name === 'red_concrete'
    const listAfter = await click(3)
    check('"Clear chat" twice: every Mara text goes, back to Messages with only Vic', armedClear && /Messages$/.test(title(listAfter)) && /^Vic/.test(itemName(at(11))) && !at(12) && /= <none>/.test(await cmd(`zzdata ${A} inbox::2::text`)) && /Stay\./.test(await cmd(`zzdata ${A} inbox::3::text`)), `armed=${armedClear} ${title(listAfter)} "${itemName(at(11))}" "${itemName(at(12))}"`)
    await chatOpen('/messages vic')
    await click(11)
    await sleep(5600)
    check('an armed delete turns back after 5 s and deletes nothing', at(11) && at(11).name === 'paper' && /Stay\./.test(await cmd(`zzdata ${A} inbox::3::text`)), `${at(11) && at(11).name}`)
    await closeAll()

    // ---------- An old inbox is tidied once at a join; a join says how many are unread ----------
    await cmd(`zzinboxclear ${A}`)
    const raw = [
      [100, 'Rusty', 'Took you long enough. Name\'s Rusty.'],
      [90, 'Mara', 'So you\'re the new face.'],
      [88, 'Mara', 'No bag, no gun, no ride. Let\'s fix that.'],
      [80, 'Mara', 'Nice work out there.'],
      [79, 'Mara', 'Next: buy a bag.'],
      [70, 'Boss', 'One for you. Check /jobs.'],
      [60, 'Broker', 'Vinnie is in town.'],
      [30, 'Broker', 'Vinnie is in town.'],
      [20, 'Lefty', 'Mm, chocolate.'],
      [20, 'Lefty', LEFTY_BRIEF]
    ]
    for (const [ago, from, line] of raw) await cmd(`zzinboxraw ${A} ${ago} ${from} ${line}`)
    await cmd(`zzdata ${A} inbox-v 1`)
    await quit(bot)
    await sleep(1500)
    bot = await join(A)
    t = Date.now()
    await sleep(7500)
    ib = await inbox()
    const tx = async n => ((await cmd(`zzdata ${A} inbox::${n}::text`)).match(/= (.*)$/) || [])[1] || ''
    const t1 = await tx(1)
    const t2 = await tx(2)
    const t3 = await tx(3)
    const t4 = await tx(4)
    check('an old inbox at a join: the in-person lines go (Rusty, Mara\'s talk, "One for you", Lefty\'s chat), Mara\'s burst is one text, the Broker\'s repeat goes, Lefty\'s mission text stays (10 -> 3, v=2)', inboxN(ib) === 3 && /v=2/.test(ib) && t1 === 'Nice work out there. Next: buy a bag.' && t2 === 'Vinnie is in town.' && t3 === LEFTY_BRIEF && t4 === '<none>', `${ib} | 1=${t1} | 2=${t2} | 3=${t3} | 4=${t4}`)
    check('a join says how many texts wait unread', /✉ 3 unread message\(s\)/.test(text(t)), text(t).slice(0, 300))

    // ---------- About the quest you're on: the whole line in chat, kept as read ----------
    await cmd(`zzinboxclear ${A}`)
    t = Date.now()
    await post('quest', 'Mara', LONG)
    await sleep(1600)
    ib = await inbox()
    check('a quest line away from Mara (owner: "display the full message in chat and not as a notification"): the whole line in chat, no ✉ notice, kept on the phone as read', lines(t).some(l => l === `Mara: ${LONG}`) && notices(t, 'Mara').length === 0 && inboxN(ib) === 1 && unread(ib) === 0, `${ib} | ${text(t).slice(0, 300)}`)
  } finally {
    if (mara) await rcon.cmd(`zzconsole dquest remove ${mara}`).catch(() => {})
    await rcon.cmd(`zzinboxclear ${A}`).catch(() => {})
    if (bot) await quit(bot).catch(() => {})
    rcon.close()
  }
}
