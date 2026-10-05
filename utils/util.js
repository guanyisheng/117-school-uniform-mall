const {
  isValidPhone,
  isValidIdCard,
  maskIdCard,
  maskPhone,
  clampQuantity,
  sanitizeText,
  sanitizeName,
  safeNavigateTo,
  isSafeId,
  MAX_QTY
} = require('./security')

function formatPrice(price) {
  const n = Number(price)
  if (!n && n !== 0) return '面议'
  if (!Number.isFinite(n) || n < 0) return '面议'
  return n.toFixed(2)
}

function showToast(title, icon = 'none') {
  const t = String(title || '').slice(0, 40)
  if (!t) return
  // 先关 loading，否则 hideLoading 会把 toast 一起清掉
  try { wx.hideLoading() } catch (e) { /* ignore */ }
  wx.showToast({ title: t, icon, duration: 2500 })
}

function showLoading(title = '加载中...') {
  wx.showLoading({ title: String(title).slice(0, 12), mask: true })
}

function hideLoading() {
  try { wx.hideLoading() } catch (e) { /* ignore */ }
}

function navigateTo(url) {
  safeNavigateTo(url)
}

function checkLogin() {
  const token = wx.getStorageSync('token')
  return !!token
}

function getMpFeatures() {
  try {
    const app = getApp()
    if (app && app.getFeatures) return app.getFeatures()
  } catch (e) { /* ignore */ }
  return wx.getStorageSync('mp_features') || {
    enable_login: true,
    enable_shopping: true,
    enable_pay: true,
    enable_sms: true,
    enable_id_card: true,
    enable_password: false,
    notice: ''
  }
}

function featureNotice(fallback) {
  const f = getMpFeatures()
  return (f && f.notice) || fallback
}

function ensureMpFeatures() {
  try {
    const app = getApp()
    if (app && app.ensureFeatures) return app.ensureFeatures()
  } catch (e) { /* ignore */ }
  return Promise.resolve(getMpFeatures())
}

function isLoginEnabled() {
  return getMpFeatures().enable_login !== false
}

function isShoppingEnabled() {
  return getMpFeatures().enable_shopping !== false
}

function isPayEnabled() {
  return getMpFeatures().enable_pay !== false
}

function requireFeature(kind) {
  const map = {
    login: { ok: isLoginEnabled, msg: '登录功能暂未开放' },
    shopping: { ok: isShoppingEnabled, msg: '购物下单暂未开放' },
    pay: { ok: isPayEnabled, msg: '支付功能暂未开放' }
  }
  const item = map[kind]
  if (!item) return true
  if (item.ok()) return true
  showToast(featureNotice(item.msg))
  return false
}

function requireLogin(returnUrl) {
  if (!isLoginEnabled()) {
    showToast(featureNotice('登录功能暂未开放'))
    return false
  }
  if (!checkLogin()) {
    let url = '/pages/login/login'
    if (returnUrl) {
      url += `?returnUrl=${encodeURIComponent(returnUrl)}`
    }
    wx.navigateTo({ url })
    return false
  }
  return true
}

function getAvatarText(userInfo) {
  if (!userInfo) return ''
  const name = String(userInfo.nickname || userInfo.childName || '').trim()
  if (!name || name === '未登录') return ''
  return name.charAt(0)
}

function isAdminUser(userInfo) {
  const info = userInfo || wx.getStorageSync('userInfo') || {}
  // 仅信任服务端下发的 role / isAdmin，不接受本地随意篡改字段名之外的来源
  return !!(info.isAdmin === true || info.role === 'admin' || info.role === 'merchant')
}

function requireAdmin() {
  if (!requireLogin()) return false
  if (!isAdminUser()) {
    showToast('需要管理员权限')
    return false
  }
  return true
}

/**
 * 从服务器刷新用户信息后再校验管理员（防本地伪造 role）
 */
function requireAdminAsync() {
  if (!requireLogin()) return Promise.resolve(false)
  const userApi = require('../api/user')
  return userApi.getUserInfo().then(res => {
    if (res.code !== 0 || !res.data) {
      showToast('无法验证权限')
      return false
    }
    if (!isAdminUser(res.data)) {
      showToast('需要管理员权限')
      return false
    }
    return true
  }).catch(() => {
    showToast('无法验证权限')
    return false
  })
}

module.exports = {
  formatPrice,
  showToast,
  showLoading,
  hideLoading,
  navigateTo,
  checkLogin,
  requireLogin,
  getMpFeatures,
  ensureMpFeatures,
  isLoginEnabled,
  isShoppingEnabled,
  isPayEnabled,
  requireFeature,
  featureNotice,
  getAvatarText,
  isAdminUser,
  requireAdmin,
  requireAdminAsync,
  isValidPhone,
  isValidIdCard,
  maskIdCard,
  maskPhone,
  clampQuantity,
  sanitizeText,
  sanitizeName,
  isSafeId,
  MAX_QTY
}
