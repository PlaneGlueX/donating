// A preview of a car model, for checking wraps without the game: loads the model, its parents and textures
// (our pack\ first, then MTVehicles' pack) and draws two 3/4 views side by side (front-left from above,
// rear-right from above), textured, with Minecraft's face shading and a depth buffer. Animated textures
// show their first frame; textures that aren't in either pack (vanilla glass) are drawn light gray.
//
// Usage: tools\node\node.exe tools\render-car.js <model id> <out.png> [size]
//   e.g. tools\node\node.exe tools\render-car.js custom/wraps/sedan_camo tools\wraps\preview-sedan_camo.png
// Previews go to tools\wraps\preview-*.png (gitignored).
const fs = require('fs')
const path = require('path')
const { encode } = require('./png')
const { openAssets, resolveModel, corners, cornerUv } = require('./make-car-wraps')

// Minecraft's item shading per face direction.
const SHADE = { up: 1, down: 0.5, north: 0.8, south: 0.8, east: 0.6, west: 0.6 }
const NORMAL = { up: [0, 1, 0], down: [0, -1, 0], north: [0, 0, -1], south: [0, 0, 1], west: [-1, 0, 0], east: [1, 0, 0] }

const render = (A, id, size = 360) => {
  const m = resolveModel(A, id)
  const views = [{ yaw: 35, pitch: 28 }, { yaw: 215, pitch: 28 }]
  const W = size * 2
  const H = Math.round(size * 0.8)
  const img = Buffer.alloc(W * H * 4)
  for (let i = 0; i < W * H; i++) img.set([38, 42, 48, 255], i * 4)
  // The model's bounds, for fitting both views.
  const lo = [Infinity, Infinity, Infinity]
  const hi = [-Infinity, -Infinity, -Infinity]
  for (const e of m.elements) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], e.from[k]); hi[k] = Math.max(hi[k], e.to[k]) }
  const mid = lo.map((v, k) => (v + hi[k]) / 2)
  const span = Math.max(...hi.map((v, k) => v - lo[k]))
  const scale = size * 0.78 / span
  views.forEach((v, vi) => {
    const ya = v.yaw * Math.PI / 180
    const pa = v.pitch * Math.PI / 180
    const rot = p => {
      const x = p[0] - mid[0], y = p[1] - mid[1], z = p[2] - mid[2]
      const x1 = x * Math.cos(ya) - z * Math.sin(ya)
      const z1 = x * Math.sin(ya) + z * Math.cos(ya)
      const y2 = y * Math.cos(pa) + z1 * Math.sin(pa)
      const z2 = z1 * Math.cos(pa) - y * Math.sin(pa)
      return [x1, y2, z2]
    }
    const ox = vi * size + size / 2
    const oy = H / 2
    const depth = new Float32Array(size * H).fill(Infinity)
    for (const e of m.elements) {
      const glow = (e.light_emission || 0) > 0
      for (const [dir, f] of Object.entries(e.faces || {})) {
        const n = rot(NORMAL[dir].map((k, i) => k + mid[i]))
        if (n[2] > 0) continue // faces away from the camera
        const tid = m.tex(f.texture)
        const t = tid ? A.texture(tid) : null
        const c3 = corners(e.from, e.to, dir).map(p => { const r = rot(p); return [ox + r[0] * scale, oy - r[1] * scale, r[2]] })
        const uvs = [0, 1, 2, 3].map(i => cornerUv(f.uv || [0, 0, 16, 16], f.rotation, i))
        const sh = glow ? 1 : SHADE[dir]
        for (const tri of [[0, 1, 2], [0, 2, 3]]) {
          const [a, b, c] = tri.map(i => c3[i])
          const [ua, ub, uc] = tri.map(i => uvs[i])
          const x0 = Math.max(vi * size, Math.floor(Math.min(a[0], b[0], c[0])))
          const x1 = Math.min(vi * size + size - 1, Math.ceil(Math.max(a[0], b[0], c[0])))
          const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])))
          const y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])))
          const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
          if (Math.abs(den) < 1e-9) continue
          for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
              const px = x + 0.5, py = y + 0.5
              const wa = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / den
              const wb = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / den
              const wc = 1 - wa - wb
              if (wa < -1e-6 || wb < -1e-6 || wc < -1e-6) continue
              const z = wa * a[2] + wb * b[2] + wc * c[2]
              const di = y * size + (x - vi * size)
              if (z >= depth[di]) continue
              let col = [200, 204, 210, 255]
              if (t) {
                const u = wa * ua[0] + wb * ub[0] + wc * uc[0]
                const vv = wa * ua[1] + wb * ub[1] + wc * uc[1]
                const tx = Math.min(t.w - 1, Math.max(0, Math.floor(u / 16 * t.w)))
                const ty = Math.min(t.w - 1, Math.max(0, Math.floor(vv / 16 * t.w))) // first frame of an animation
                const i = (ty * t.w + tx) * 4
                col = [t.px[i], t.px[i + 1], t.px[i + 2], t.px[i + 3]]
              }
              if (col[3] < 26) continue
              depth[di] = z
              img.set([col[0] * sh, col[1] * sh, col[2] * sh].map(Math.round).concat(255), (y * W + x) * 4)
            }
          }
        }
      }
    }
  })
  return encode(W, H, img)
}

module.exports = { render }

if (require.main === module) {
  const [id, out, size] = process.argv.slice(2)
  if (!id || !out) { console.log('usage: render-car.js <model id> <out.png> [size]'); process.exit(1) }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
  fs.writeFileSync(out, render(openAssets(), id, +size || 360))
  console.log(`wrote ${out}`)
}
