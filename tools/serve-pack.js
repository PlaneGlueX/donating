// Serves a resource pack zip to the local test client, so server.properties can point at it.
// LOCAL ONLY: listens on 127.0.0.1. Minehut uses the pack set in its dashboard instead.
//
// Usage: tools\node\node.exe tools\serve-pack.js <pack.zip> [port]
// Then in server.properties:
//   resource-pack=http://127.0.0.1:<port>/pack.zip
//   resource-pack-sha1=<printed below>
// The file is re-read on every request, so a rebuilt pack only needs a new sha1 and a rejoin.
const http = require('http')
const fs = require('fs')
const crypto = require('crypto')

const file = process.argv[2]
const port = Number(process.argv[3] || 8765)
if (!file || !fs.existsSync(file)) {
  console.error(`pack not found: ${file}`)
  process.exit(1)
}

const sha1 = crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex')
console.log(`serving ${file} at http://127.0.0.1:${port}/pack.zip sha1=${sha1}`)

http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`)
  if (req.url !== '/pack.zip') {
    res.writeHead(404).end()
    return
  }
  const data = fs.readFileSync(file)
  res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Length': data.length })
  res.end(data)
}).listen(port, '127.0.0.1')
