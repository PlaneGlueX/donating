// Tiny RCON client so test scenarios can run console commands and read server-side truth
// (e.g. "data get entity Bot Inventory"). Reads port/password from server/server.properties.
const fs = require('fs')
const net = require('net')
const path = require('path')

function readProps () {
  const file = path.join(__dirname, '..', 'server', 'server.properties')
  const props = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*)$/)
    if (m) props[m[1]] = m[2]
  }
  return props
}

function packet (id, type, body) {
  const bodyBuf = Buffer.from(body, 'utf8')
  const buf = Buffer.alloc(14 + bodyBuf.length)
  buf.writeInt32LE(10 + bodyBuf.length, 0)
  buf.writeInt32LE(id, 4)
  buf.writeInt32LE(type, 8)
  bodyBuf.copy(buf, 12)
  return buf
}

class Rcon {
  async connect () {
    const props = readProps()
    this.socket = net.connect(Number(props['rcon.port']), '127.0.0.1')
    this.buffer = Buffer.alloc(0)
    this.waiters = []
    this.socket.on('data', chunk => {
      this.buffer = Buffer.concat([this.buffer, chunk])
      while (this.buffer.length >= 4) {
        const len = this.buffer.readInt32LE(0)
        if (this.buffer.length < 4 + len) break
        const id = this.buffer.readInt32LE(4)
        const body = this.buffer.toString('utf8', 12, 4 + len - 2)
        this.buffer = this.buffer.subarray(4 + len)
        const waiter = this.waiters[0]
        if (waiter) waiter(id, body)
      }
    })
    await new Promise((resolve, reject) => {
      this.socket.once('connect', resolve)
      this.socket.once('error', reject)
    })
    this.nextId = 10
    const [id] = await this._send(1, 3, props['rcon.password'], 1)
    if (id === -1) throw new Error('RCON auth failed')
    return this
  }

  // Sends one packet and collects replies until the reply with id `endId` arrives.
  // `afterFirst` is written once the first reply arrives: the server reads exactly one packet
  // per socket read and drops the connection if two packets arrive together.
  _send (id, type, body, endId, afterFirst) {
    return new Promise(resolve => {
      const parts = []
      let first = true
      this.waiters.push((replyId, replyBody) => {
        if (replyId === endId || replyId === -1) {
          this.waiters.shift()
          resolve([replyId, parts.join('')])
          return
        }
        parts.push(replyBody)
        if (first && afterFirst) this.socket.write(afterFirst)
        first = false
      })
      this.socket.write(packet(id, type, body))
    })
  }

  // Runs a console command and returns its output with color codes stripped.
  async cmd (command) {
    const id = (this.nextId += 2)
    // An unknown packet type makes the server reply "Unknown request" after the command's
    // own (possibly multi-packet) reply, which marks the end of the output.
    const [, out] = await this._send(id, 2, command, id + 1, packet(id + 1, 0, ''))
    return out.replace(/§./g, '')
  }

  close () {
    this.socket.end()
  }
}

module.exports = { connect: () => new Rcon().connect() }
