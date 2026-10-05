const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

const outTab = path.join(__dirname, '../images/tab')
const outImg = path.join(__dirname, '../images')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
    }
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function createCirclePNG(size, r, g, b) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.38
  let offset = 0
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5
      const dy = y - cy + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= radius) {
        raw[offset++] = r
        raw[offset++] = g
        raw[offset++] = b
        raw[offset++] = 255
      } else {
        raw[offset++] = 0
        raw[offset++] = 0
        raw[offset++] = 0
        raw[offset++] = 0
      }
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function createSquarePNG(size, r, g, b, text) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  let offset = 0
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0
    for (let x = 0; x < size; x++) {
      raw[offset++] = r
      raw[offset++] = g
      raw[offset++] = b
      raw[offset++] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

fs.mkdirSync(outTab, { recursive: true })
fs.mkdirSync(outImg, { recursive: true })

const gray = [153, 153, 153]
const blue = [21, 101, 255]

const icons = [
  ['home.png', gray],
  ['home-active.png', blue],
  ['school.png', gray],
  ['school-active.png', blue],
  ['profile.png', gray],
  ['profile-active.png', blue]
]

icons.forEach(([name, [r, g, b]]) => {
  fs.writeFileSync(path.join(outTab, name), createCirclePNG(81, r, g, b))
})

fs.writeFileSync(path.join(outImg, 'default-avatar.png'), createSquarePNG(200, 21, 101, 255))
console.log('Icons generated successfully')
