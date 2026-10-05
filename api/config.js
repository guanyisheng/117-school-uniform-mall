/**
 * API 配置中心 — 与 uniform-system-117/backend 路由对齐
 * 改域名只改 BASE_URL；改路径只改 PATHS
 */
const BASE_URL = 'https://api.117uniform.store'

/**
 * 安全开关
 * - ALLOW_MOCK_PAY：HTTP 开发环境允许回退 /pay；HTTPS 正式环境关闭
 */
const SECURITY = {
  ALLOW_MOCK_PAY: BASE_URL.indexOf('https://') !== 0,
  REQUEST_TIMEOUT_MS: 20000,
  MAX_UPLOAD_COUNT: 9
}

const PATHS = {
  // 登录 / 用户（后端 login 带 phone 时等同 login/phone）
  loginSms: '/api/login/sms',
  /** 与后端双路径兼容：/api/login 带 phone 即手机号登录 */
  login: '/api/login',
  loginPhone: '/api/login/phone',
  loginWx: '/api/login',
  userInfo: '/api/user/info',
  userWxBind: '/api/user/wx-bind',
  userAddresses: '/api/user/addresses',
  userAddressDetail: id => `/api/user/addresses/${id}`,
  userFavorites: '/api/user/favorites',
  userFavoriteDetail: id => `/api/user/favorites/${id}`,
  userFeedback: '/api/user/feedback',

  // 学校 / 轮播 / 站点 / 上传
  schools: '/api/schools',
  schoolDetail: id => `/api/schools/${id}`,
  banners: '/api/banner',
  siteAbout: '/api/site/about',
  siteContact: '/api/site/contact',
  siteFeatures: '/api/site/features',
  categories: '/api/categories',
  upload: '/api/upload',

  // 商品（staff: admin|merchant）
  products: '/api/products',
  productDetail: id => `/api/products/${id}`,
  adminProducts: '/api/admin/products',
  productOffShelf: id => `/api/products/${id}/off-shelf`,

  // 购物车
  cart: '/api/cart',
  cartItem: id => `/api/cart/${id}`,
  cartClear: '/api/cart/clear',

  // 订单 / 支付
  orders: '/api/orders',
  orderDetail: id => `/api/orders/${id}`,
  orderCancel: id => `/api/orders/${id}/cancel`,
  orderRefund: id => `/api/orders/${id}/refund`,
  orderPrepay: id => `/api/orders/${id}/prepay`,
  orderPay: id => `/api/orders/${id}/pay`,
  orderPayStatus: id => `/api/orders/${id}/pay-status`
}

module.exports = {
  BASE_URL,
  PATHS,
  SECURITY
}
