/**
 * 绑定 img/ 照片到商品
 * 规则：每个文件夹里有几张图，该商品就展示几张（全部进轮播+详情）
 *
 * 目录示例：
 *   img/鲁甸二中/               → 1 个商品，展示文件夹内全部图片
 *   img/鲁甸二中/春夏套装/       → 1 个商品「春夏套装」，展示该子文件夹内全部图片
 *
 * 运行: node scripts/bind-real-images.js
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const imgRoot = path.join(root, 'img')
const outRoot = path.join(root, 'images', 'real')

const SCHOOL_MAP = {
  '鲁甸二中': { id: 'school_1', desc: '鲁甸县第二中学' },
  '鲁甸四小': { id: 'school_2', desc: '鲁甸县第四小学' },
  '鲁甸镇中': { id: 'school_3', desc: '鲁甸县镇中学' },
  '昭通育苗幼儿园': { id: 'school_4', desc: '昭通育苗幼儿园' }
}

const DEFAULT_INTRO = '本校合作款校服，按学校统一款式生产。'
const DEFAULT_SIZE = '可选尺码：120 / 130 / 140 / 150 / 160 / 170 / 175\n建议按身高选码，不确定请联系客服'
const DEFAULT_SIZES = ['120', '130', '140', '150', '160', '170', '175']
const DEFAULT_AFTER = '支持换码，质量问题联系客服处理。电话：0870-8888117'

let productSeq = 1

function isImage(name) {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(name)
}

function getImagesInDir(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(isImage)
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
    .map(f => path.join(dir, f))
}

function copyImage(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

function toWebPath(absPath) {
  return '/' + path.relative(root, absPath).replace(/\\/g, '/')
}

function writeMock(name, data) {
  fs.writeFileSync(
    path.join(root, 'mock', `${name}.js`),
    'module.exports = ' + JSON.stringify(data, null, 2) + '\n'
  )
}

/** 扫描学校目录：有子文件夹则每个子文件夹=1商品；否则整个学校文件夹=1商品 */
function scanSchoolProducts(schoolDir, schoolName) {
  const entries = fs.readdirSync(schoolDir, { withFileTypes: true })
  const subdirs = entries
    .filter(e => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

  if (subdirs.length > 0) {
    return subdirs
      .map(dir => {
        const files = getImagesInDir(path.join(schoolDir, dir.name))
        return files.length ? { name: dir.name, files } : null
      })
      .filter(Boolean)
  }

  const files = getImagesInDir(schoolDir)
  if (files.length) {
    return [{ name: '校服', files }]
  }
  return []
}

function buildProduct(schoolName, schoolId, category, index) {
  const id = `p${String(productSeq++).padStart(3, '0')}`
  const paths = category.files.map((src, n) => {
    const ext = path.extname(src).toLowerCase()
    const fileName = n === 0 ? `${id}${ext}` : `${id}_${n + 1}${ext}`
    const dest = path.join(outRoot, fileName)
    copyImage(src, dest)
    return toWebPath(dest)
  })

  return {
    id,
    name: category.name === '校服' ? `${schoolName}校服` : `${schoolName} ${category.name}`,
    schoolId,
    schoolName,
    price: 0,
    originalPrice: 0,
    cover: paths[0],
    images: paths,
    detailImages: paths,
    imageCount: paths.length,
    category: index % 2 === 0 ? 'spring_summer' : 'autumn_winter',
    tags: [],
    isNew: false,
    sales: 0,
    intro: DEFAULT_INTRO,
    sizeGuide: DEFAULT_SIZE,
    sizes: DEFAULT_SIZES,
    afterSale: DEFAULT_AFTER
  }
}

if (fs.existsSync(outRoot)) {
  fs.rmSync(outRoot, { recursive: true, force: true })
}
fs.mkdirSync(outRoot, { recursive: true })

const products = []
const schools = []

Object.entries(SCHOOL_MAP).forEach(([folderName, school]) => {
  const schoolDir = path.join(imgRoot, folderName)
  if (!fs.existsSync(schoolDir)) {
    console.warn('缺少目录:', folderName)
    return
  }

  const categories = scanSchoolProducts(schoolDir, folderName)
  const schoolProducts = categories.map((cat, i) =>
    buildProduct(folderName, school.id, cat, i)
  )
  products.push(...schoolProducts)

  let logo = `/images/schools/${school.id}.png`
  const firstFile = categories[0] && categories[0].files[0]
  if (firstFile) {
    const ext = path.extname(firstFile).toLowerCase()
    const logoDest = path.join(outRoot, `${school.id}_logo${ext}`)
    copyImage(firstFile, logoDest)
    logo = toWebPath(logoDest)
  }

  schools.push({
    id: school.id,
    name: folderName,
    logo,
    description: school.desc,
    productCount: schoolProducts.length
  })

  categories.forEach(cat => {
    console.log(`${folderName}/${cat.name}: ${cat.files.length} 张 → 全部展示`)
  })
})

const bannerFolders = ['鲁甸二中', '鲁甸四小', '昭通育苗幼儿园']
const banners = bannerFolders.map((folder, i) => {
  const schoolDir = path.join(imgRoot, folder)
  let image = `/images/banners/banner_${i + 1}.png`
  let title = `${folder} 校服定制`
  if (fs.existsSync(schoolDir)) {
    const cats = scanSchoolProducts(schoolDir, folder)
    const first = cats[0] && cats[0].files[0]
    if (first) {
      const ext = path.extname(first).toLowerCase()
      const dest = path.join(outRoot, `banner_${i + 1}${ext}`)
      copyImage(first, dest)
      image = toWebPath(dest)
    }
  }
  if (i === 0) title = '117 校服商城'
  if (i === 2) title = '昭通育苗幼儿园'
  return { id: i + 1, image, link: i === 0 ? '/pages/index/index' : '', title }
})

writeMock('products', products)
writeMock('schools', schools)
writeMock('banners', banners)

const userMock = require(path.join(root, 'mock/user.js'))
userMock.favorites = products.slice(0, 3).map(p => p.id)
writeMock('user', userMock)

console.log(`\n共 ${products.length} 个商品（按文件夹划分，文件夹内几张图就展示几张）`)
