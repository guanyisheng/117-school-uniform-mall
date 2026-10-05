const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

const root = path.join(__dirname, '..')
const imagesRoot = path.join(root, 'images')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
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

function createPNG(width, height, drawPixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  let offset = 0
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = drawPixel(x, y, width, height)
      raw[offset++] = r
      raw[offset++] = g
      raw[offset++] = b
      raw[offset++] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function solid(w, h, r, g, b) {
  return createPNG(w, h, () => [r, g, b, 255])
}

function gradient(w, h, c1, c2) {
  return createPNG(w, h, (x, y, width, height) => {
    const t = (x + y) / (width + height)
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t),
      255
    ]
  })
}

function circle(w, h, r, g, b) {
  const cx = w / 2
  const cy = h / 2
  const radius = Math.min(w, h) * 0.38
  return createPNG(w, h, (x, y) => {
    const dx = x - cx + 0.5
    const dy = y - cy + 0.5
    return Math.sqrt(dx * dx + dy * dy) <= radius ? [r, g, b, 255] : [0, 0, 0, 0]
  })
}

function uniformCard(w, h, primary, secondary) {
  return createPNG(w, h, (x, y, width, height) => {
    const bg = [245, 247, 250]
    if (y > height * 0.15 && y < height * 0.85 && x > width * 0.2 && x < width * 0.8) {
      const stripe = Math.floor((y - height * 0.15) / (height * 0.08)) % 2
      return stripe ? [...primary, 255] : [...secondary, 255]
    }
    return [...bg, 255]
  })
}

const schoolColors = {
  school_1: [[21, 101, 255], [66, 165, 255]],
  school_2: [[46, 125, 50], [102, 187, 106]],
  school_3: [[230, 81, 0], [255, 167, 38]],
  school_4: [[236, 64, 122], [240, 98, 146]]
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

ensureDir(path.join(imagesRoot, 'tab'))
ensureDir(path.join(imagesRoot, 'schools'))
ensureDir(path.join(imagesRoot, 'banners'))
ensureDir(path.join(imagesRoot, 'products'))

const gray = [153, 153, 153]
const blue = [21, 101, 255]
;[
  ['home.png', gray], ['home-active.png', blue],
  ['school.png', gray], ['school-active.png', blue],
  ['profile.png', gray], ['profile-active.png', blue]
].forEach(([name, [r, g, b]]) => {
  fs.writeFileSync(path.join(imagesRoot, 'tab', name), circle(81, 81, r, g, b))
})

fs.writeFileSync(path.join(imagesRoot, 'default-avatar.png'), solid(200, 200, 21, 101, 255))

Object.entries(schoolColors).forEach(([id, [c1]]) => {
  fs.writeFileSync(path.join(imagesRoot, 'schools', `${id}.png`), circle(120, 120, ...c1))
})

;[
  ['banner_1', [21, 101, 255], [66, 165, 255]],
  ['banner_2', [46, 125, 50], [102, 187, 106]],
  ['banner_3', [21, 101, 255], [100, 181, 246]]
].forEach(([name, c1, c2]) => {
  fs.writeFileSync(path.join(imagesRoot, 'banners', `${name}.png`), gradient(750, 360, c1, c2))
})

const products = require(path.join(root, 'mock/products.js'))
products.forEach(p => {
  const [c1, c2] = schoolColors[p.schoolId] || [[21, 101, 255], [66, 165, 255]]
  const coverPath = `/images/products/${p.id}_cover.png`
  const detailPath = `/images/products/${p.id}_detail.png`
  fs.writeFileSync(path.join(imagesRoot, 'products', `${p.id}_cover.png`), uniformCard(400, 400, c1, c2))
  fs.writeFileSync(path.join(imagesRoot, 'products', `${p.id}_detail.png`), uniformCard(750, 1000, c1, c2))
  p.cover = coverPath
  p.images = [coverPath, `/images/products/${p.id}_detail.png`]
  p.detailImages = [detailPath]
})
function writeMock(name, data) {
  const content = 'module.exports = ' + JSON.stringify(data, null, 2) + '\n'
  fs.writeFileSync(path.join(root, 'mock', `${name}.js`), content)
  fs.writeFileSync(path.join(root, 'mock', `${name}.json`), JSON.stringify(data, null, 2) + '\n')
}

writeMock('products', products)

const schools = require(path.join(root, 'mock/schools.js'))
schools.forEach(s => {
  s.logo = `/images/schools/${s.id}.png`
})
writeMock('schools', schools)

const banners = [
  { id: 1, image: '/images/banners/banner_1.png', link: '/pages/index/index', title: '2026 春夏校服上新' },
  { id: 2, image: '/images/banners/banner_2.png', link: '', title: '鲁甸二中专属定制' },
  { id: 3, image: '/images/banners/banner_3.png', link: '', title: '品质保障 售后无忧' }
]
writeMock('banners', banners)

const userMock = require(path.join(root, 'mock/user.js'))
userMock.userInfo.avatar = '/images/default-avatar.png'
writeMock('user', userMock)

console.log('All local preview assets generated.')
console.log('Schools:', schools.map(s => s.name).join('、'))
