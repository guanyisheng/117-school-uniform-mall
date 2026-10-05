/**
 * 远程 API 响应适配 — 对齐 uniform-system-117
 * 后端成功码 code:200 → 小程序内部 0；snake_case → camelCase
 */

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function keysToCamel(obj) {
  if (obj == null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(keysToCamel)
  return Object.keys(obj).reduce((acc, key) => {
    acc[snakeToCamel(key)] = keysToCamel(obj[key])
    return acc
  }, {})
}

function normalizeResponse(res) {
  if (!res || typeof res !== 'object') return res
  const code = res.code === 200 ? 0 : res.code
  return { ...res, code }
}

const CAMEL_TO_SNAKE = {
  childName: 'child_name',
  idCard: 'id_card',
  schoolId: 'school_id',
  className: 'class_name',
  isDefault: 'is_default',
  productId: 'product_id',
  productName: 'product_name',
  coverImage: 'cover_image',
  cartItemIds: 'cart_item_ids',
  addressId: 'address_id',
  categoryId: 'category_id'
}

function toSnakePayload(data) {
  const out = {}
  Object.keys(data || {}).forEach(key => {
    const v = data[key]
    // 0 / false 要保留；仅跳过 undefined 与空字符串
    if (v === undefined || v === '') return
    const snakeKey = CAMEL_TO_SNAKE[key] || key
    if (key === 'schoolId' || key === 'addressId' || key === 'categoryId') {
      out[snakeKey] = Number(v) || v
    } else if (key === 'address' && typeof v === 'object') {
      out.address = toSnakePayload(v)
    } else if (key === 'items' && Array.isArray(v)) {
      out.items = v.map(item => toSnakePayload(item))
    } else if (key === 'sizes' && Array.isArray(v)) {
      out.sizes = v
    } else if (key === 'images' && Array.isArray(v)) {
      out.images = v
    } else if (key === 'cartItemIds' && Array.isArray(v)) {
      out[snakeKey] = v
    } else if (key === 'isDefault') {
      out[snakeKey] = v ? 1 : 0
    } else {
      out[snakeKey] = v
    }
  })
  return out
}

function normalizeImageList(images, cover) {
  const list = []
  if (Array.isArray(images)) {
    images.forEach(img => {
      if (!img) return
      if (typeof img === 'string') {
        list.push(ensureHttps(img))
        return
      }
      const url = img.imageUrl || img.image_url || img.url || img.cover || ''
      if (url) list.push(ensureHttps(url))
    })
  }
  if (!list.length && cover) list.push(ensureHttps(cover))
  return list
}

/** 小程序要求业务图走 https；相对路径补全为当前 API 域名 */
function ensureHttps(url) {
  if (!url || typeof url !== 'string') return ''
  let u = url.trim()
  if (!u) return ''

  // 相对路径 /uploads/xxx → 拼到 BASE_URL
  if (u.startsWith('//')) {
    u = 'https:' + u
  } else if (u.startsWith('/')) {
    try {
      const { BASE_URL } = require('../api/config')
      u = String(BASE_URL || '').replace(/\/$/, '') + u
    } catch (e) { /* ignore */ }
  } else if (!/^https?:\/\//i.test(u) && (u.indexOf('uploads/') === 0 || /^[\w-]+\.(png|jpe?g|gif|webp)$/i.test(u))) {
    try {
      const { BASE_URL } = require('../api/config')
      const base = String(BASE_URL || '').replace(/\/$/, '')
      u = base + '/uploads/' + u.replace(/^\/?uploads\//, '')
    } catch (e) { /* ignore */ }
  }

  if (/^http:\/\//i.test(u) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(u)) {
    return 'https://' + u.slice(7)
  }
  return u
}

function mapSchool(raw) {
  const s = keysToCamel(raw)
  return {
    id: s.id,
    name: s.name || '',
    logo: ensureHttps(s.logo) || '/images/icons/school.svg',
    description: s.description || '',
    productCount: s.productCount || 0,
    sortOrder: s.sortOrder
  }
}

function mapBanner(raw) {
  const b = keysToCamel(raw)
  return {
    id: b.id,
    image: ensureHttps(b.imageUrl || b.image || b.url || ''),
    link: b.link || b.linkUrl || '',
    title: b.title || ''
  }
}

function mapProduct(raw) {
  const p = keysToCamel(raw)
  const schoolId = p.schoolId != null ? p.schoolId : ''
  const cover = p.coverImage || p.cover || p.image || ''
  const images = normalizeImageList(p.images, cover)
  // 后端：status 0/1 + shelf_status on|off
  let shelf = p.shelfStatus
  if (!shelf) {
    if (p.status === 0 || p.status === '0' || p.status === 'off') shelf = 'off'
    else if (p.status === 1 || p.status === '1' || p.status === 'on') shelf = 'on'
    else shelf = 'on'
  }
  return {
    id: p.id,
    name: p.name || '',
    schoolId,
    schoolName: p.schoolName || '',
    price: p.price != null ? Number(p.price) : 0,
    originalPrice: p.originalPrice != null ? Number(p.originalPrice) : 0,
    cover: ensureHttps(cover || images[0] || ''),
    images,
    detailImages: images,
    category: p.categoryName || p.category || '',
    categoryId: p.categoryId || '',
    tags: p.tags || [],
    isNew: !!(p.isNew),
    sales: p.sales || 0,
    intro: p.description || p.intro || '',
    sizeGuide: p.sizeGuide || '',
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    afterSale: p.afterSale || '',
    status: shelf,
    isOnSale: shelf === 'on'
  }
}

function mapUser(raw) {
  const u = keysToCamel(raw)
  const role = u.role || 'parent'
  const rawIdCard = u.idCard || ''
  const { maskIdCard, maskPhone } = require('./security')
  return {
    id: u.id,
    phone: maskPhone(u.phone || ''),
    phoneMasked: true,
    nickname: u.nickname || (u.childName ? u.childName + '家长' : '117家长'),
    avatar: ensureHttps(u.avatar) || '/images/icons/avatar.svg',
    childName: u.childName || '',
    idCard: rawIdCard ? maskIdCard(rawIdCard) : '',
    idCardMasked: !!rawIdCard,
    school: u.schoolName || u.school || '',
    schoolId: u.schoolId != null ? u.schoolId : '',
    className: u.className || u.grade || '',
    role,
    isAdmin: role === 'admin' || role === 'merchant' || !!u.isAdmin,
    idCardVerified: !!(u.idCardVerified || u.idCardVerifiedAt || rawIdCard),
    // 占位 openid（phone_ / wx_）视为未绑定真实微信
    needWxBind: !u.openid || String(u.openid).indexOf('phone_') === 0 || String(u.openid).indexOf('wx_') === 0
  }
}

function mapAddress(raw) {
  const a = keysToCamel(raw)
  return {
    id: a.id,
    name: a.name || a.receiverName || '',
    phone: a.phone || '',
    province: a.province || '',
    city: a.city || '',
    district: a.district || '',
    detail: a.detail || '',
    isDefault: !!(a.isDefault === true || a.isDefault === 1 || a.isDefault === '1')
  }
}

const ORDER_STATUS_TEXT = {
  pending: '待支付',
  unpaid: '待支付',
  pending_pay: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
  canceled: '已取消',
  refunding: '退款中',
  refunded: '已退款'
}

function mapOrderItem(raw) {
  const i = keysToCamel(raw)
  return {
    id: i.id,
    productId: i.productId,
    productName: i.productName || i.name || '',
    cover: ensureHttps(i.cover || i.image || ''),
    price: i.price != null ? Number(i.price) : 0,
    size: i.size || '',
    quantity: i.quantity != null ? Number(i.quantity) : 1
  }
}

function mapOrder(raw) {
  const o = keysToCamel(raw)
  const status = o.status === 'pending' ? 'pending_pay' : (o.status || 'pending_pay')
  const items = (o.items || []).map(mapOrderItem)
  if (!items.length && (o.productId || o.productName)) {
    items.push({
      id: o.id,
      productId: o.productId,
      productName: o.productName,
      cover: o.cover || o.image || '',
      price: o.amount,
      size: o.size || '',
      quantity: o.quantity != null ? o.quantity : 1
    })
  }
  return {
    id: o.id,
    orderNo: o.orderNo || '',
    productId: o.productId,
    productName: o.productName || (items[0] && items[0].productName) || '',
    cover: ensureHttps(o.cover || (items[0] && items[0].cover) || ''),
    amount: o.amount != null ? Number(o.amount) : 0,
    size: o.size || (items[0] && items[0].size) || '',
    quantity: o.quantity != null ? o.quantity : (items[0] && items[0].quantity) || 1,
    items,
    status,
    statusText: o.statusText || ORDER_STATUS_TEXT[status] || status,
    address: o.address ? mapAddress(o.address) : o.address,
    createTime: o.createTime || o.createdAt || '',
    payTime: o.payTime || o.paidAt || '',
    refundReason: o.refundReason || '',
    canPay: ['pending', 'unpaid', 'pending_pay'].indexOf(status) !== -1,
    canCancel: ['pending', 'unpaid', 'pending_pay'].indexOf(status) !== -1,
    canRefund: ['paid', 'shipped'].indexOf(status) !== -1
  }
}

function mapCartItem(raw) {
  const c = keysToCamel(raw)
  return {
    id: c.id,
    productId: c.productId,
    productName: c.productName || '',
    cover: ensureHttps(c.cover || c.coverImage || ''),
    schoolName: c.schoolName || '',
    price: c.price != null ? Number(c.price) : 0,
    size: c.size || '',
    quantity: c.quantity != null ? Number(c.quantity) : 1,
    selected: c.selected !== false,
    sizes: Array.isArray(c.sizes) ? c.sizes : []
  }
}

function mapPayParams(raw) {
  const p = keysToCamel(raw || {})
  // 后端可能把 pay_params 与顶层字段一起返回
  const nested = p.payParams ? keysToCamel(p.payParams) : null
  const src = nested || p
  return {
    timeStamp: src.timeStamp || src.timestamp || '',
    nonceStr: src.nonceStr || src.noncestr || '',
    package: src.package || src.packageValue || '',
    signType: src.signType || 'RSA',
    paySign: src.paySign || src.paysign || ''
  }
}

function toQueryParams(params = {}) {
  const q = {}
  if (params.schoolId != null) q.school_id = params.schoolId
  if (params.categoryId != null) q.category_id = params.categoryId
  if (params.isNew) q.is_new = 1
  if (params.keyword) q.keyword = params.keyword
  if (params.status) q.status = params.status
  if (params.page) q.page = params.page
  if (params.pageSize) q.pageSize = params.pageSize
  return q
}

module.exports = {
  normalizeResponse,
  mapSchool,
  mapBanner,
  mapProduct,
  mapUser,
  mapAddress,
  mapOrder,
  mapOrderItem,
  mapCartItem,
  mapPayParams,
  toSnakePayload,
  toQueryParams,
  ORDER_STATUS_TEXT
}
