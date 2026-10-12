// Reference pictures of Pixel Gun 3D guns from the fan wiki (pixelgun.fandom.com), for drawing our own versions by
// hand. For each page: its wikitext (refs/<slug>/page.txt), the infobox gallery images (Appearance etc.) and the
// page's gallery images (in use, in gallery), saved as refs/<slug>/<n>-<file>. Nothing goes into the repo.
// usage: node fetch-refs.js "<page title>" ...   |   node fetch-refs.js --search <words>
const fs = require('fs')
const path = require('path')
const https = require('https')
const OUT = path.join(__dirname, 'refs')
const UA = { 'User-Agent': 'DonatingResearch/1.0 (fan reference for hand-drawn models)', Referer: 'https://pixelgun.fandom.com/' }
const get = (u, bin) => new Promise((res, rej) => {
  https.get(u, { headers: UA }, r => {
    if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return get(new URL(r.headers.location, u).href, bin).then(res, rej)
    const chunks = []
    r.on('data', d => chunks.push(d))
    r.on('end', () => { const b = Buffer.concat(chunks); r.statusCode === 200 ? res(bin ? b : b.toString('utf8')) : rej(new Error(`${r.statusCode} ${u}`)) })
  }).on('error', rej)
})
const API = 'https://pixelgun.fandom.com/api.php?format=json&'
const slug = t => t.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')
;(async () => {
  const args = process.argv.slice(2)
  if (args[0] === '--search') {
    const j = JSON.parse(await get(API + 'action=query&list=search&srlimit=20&srsearch=' + encodeURIComponent(args.slice(1).join(' '))))
    for (const s of j.query.search) console.log(s.title)
    return
  }
  for (const title of args) {
    try {
      const j = JSON.parse(await get(API + 'action=parse&redirects=1&prop=wikitext|images&page=' + encodeURIComponent(title)))
      if (!j.parse) { console.log(title, 'MISSING'); continue }
      const dir = path.join(OUT, slug(j.parse.title))
      fs.mkdirSync(dir, { recursive: true })
      const wt = j.parse.wikitext['*']
      fs.writeFileSync(path.join(dir, 'page.txt'), wt)
      // Infobox gallery lines ("File.png|Caption") and <gallery> blocks anywhere on the page.
      const files = []
      for (const block of wt.matchAll(/<gallery[^>]*>([\s\S]*?)<\/gallery>/gi)) {
        for (const line of block[1].split('\n')) {
          const m = line.trim().match(/^(?:File:|Image:)?([^|]+\.(?:png|jpg|jpeg|gif|webp))\s*(?:\|(.*))?$/i)
          if (m) files.push({ file: m[1].trim(), caption: (m[2] || '').trim() })
        }
      }
      for (const m of wt.matchAll(/\[\[(?:File|Image):([^|\]]+\.(?:png|jpg|jpeg|gif|webp))/gi)) files.push({ file: m[1].trim(), caption: 'inline' })
      const seen = new Set()
      const keep = files.filter(f => !/killicon|kill icon|_icon\.|chaticon/i.test(f.file + f.caption) && !seen.has(f.file) && seen.add(f.file)).slice(0, 12)
      const list = []
      for (let i = 0; i < keep.length; i++) {
        const f = keep[i]
        try {
          const q = JSON.parse(await get(API + 'action=query&prop=imageinfo&iiprop=url|size&titles=' + encodeURIComponent('File:' + f.file)))
          const page = Object.values(q.query.pages)[0]
          const ii = page.imageinfo && page.imageinfo[0]
          if (!ii) { list.push(`${f.file} (missing)`); continue }
          const buf = await get(ii.url, true)
          const name = `${String(i + 1).padStart(2, '0')}-${slug(f.file.replace(/\.[a-z]+$/i, ''))}${path.extname(f.file).toLowerCase()}`
          fs.writeFileSync(path.join(dir, name), buf)
          list.push(`${name}  ${ii.width}x${ii.height}  "${f.caption}"`)
        } catch (e) { list.push(`${f.file} ERR ${e.message}`) }
      }
      fs.writeFileSync(path.join(dir, 'images.txt'), list.join('\n') + '\n')
      console.log(`${j.parse.title}: ${list.length} images -> ${dir}`)
    } catch (e) { console.log(title, 'ERR', e.message) }
  }
})()
