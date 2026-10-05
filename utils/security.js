/**
 * 前端安全工具：校验、脱敏、限流辅助
 * 注意：权限与金额最终以后端为准，此处只做客户端防护与体验优化
 */

const MAX_QTY = 99
const MAX_TEXT_LEN = 500
const MAX_NAME_LEN = 40
const INTERNAL_PAGES = /^\/pages\/[a-z0-9\-_/]+(\?.*)?$/i

/** 手机号 */
function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || '').trim())
}

/** 身份证：格式 + 18 位校验码 */
function isValidIdCard(idCard) {
  const s = String(idCard || '').trim().toUpperCase()
  if (!/(^\d{15}$)|(^\d{17}[\dX]$)/.test(s)) return false
  if (s.length === 15) return true

  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  let sum = 0
  for (let i = 0; i < 17; i++) sum += Number(s[i]) * weights[i]
  return codes[sum % 11] === s[17]
}

/** 脱敏身份证：110***********1234 */
function maskIdCard(idCard) {
  const s = String(idCard || '').trim()
  if (s.length < 8) return s ? '****' : ''
  return s.slice(0, 3) + '*'.repeat(Math.max(0, s.length - 7)) + s.slice(-4)
}

/** 脱敏手机：138****8000 */
function maskPhone(phone) {
  const s = String(phone || '').trim()
  if (!/^1\d{10}$/.test(s)) return s
  return s.slice(0, 3) + '****' + s.slice(-4)
}

function clampQuantity(n, min = 1, max = MAX_QTY) {
  const v = parseInt(n, 10)
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

/** 去掉控制字符、限制长度 */
function sanitizeText(input, maxLen = MAX_TEXT_LEN) {
  return String(input == null ? '' : input)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen)
}

function sanitizeName(input) {
  return sanitizeText(input, MAX_NAME_LEN)
}

/** 仅允许本小程序 pages 路径，防止恶意跳转 */
function isSafeInternalUrl(url) {
  return INTERNAL_PAGES.test(String(url || ''))
}

function safeNavigateTo(url) {
  if (!isSafeInternalUrl(url)) return false
  wx.navigateTo({ url })
  return true
}

function safeRedirectTo(url) {
  if (!isSafeInternalUrl(url)) return false
  wx.redirectTo({ url })
  return true
}

/** 资源 ID：数字或安全字符串 */
function isSafeId(id) {
  const s = String(id == null ? '' : id)
  return /^[a-zA-Z0-9_-]{1,64}$/.test(s)
}

/** 本地上传临时路径校验 */
function isLikelyImagePath(path) {
  const s = String(path || '')
  if (!s) return false
  // 已上传的远程图
  if (/^https?:\/\//i.test(s)) return true
  return /\.(jpe?g|png|gif|webp)$/i.test(s) || /^wxfile:\/\//i.test(s) || /^http:\/\/tmp\//i.test(s)
}

/** 简单防抖：同一 key 在 ms 内只允许一次 */
const _locks = Object.create(null)
function withSubmitLock(key, ms, fn) {
  const now = Date.now()
  if (_locks[key] && now - _locks[key] < ms) return Promise.resolve(null)
  _locks[key] = now
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      // 锁在 ms 后自动释放由时间判断，无需清理
    })
}

module.exports = {
  MAX_QTY,
  isValidPhone,
  isValidIdCard,
  maskIdCard,
  maskPhone,
  clampQuantity,
  sanitizeText,
  sanitizeName,
  isSafeInternalUrl,
  safeNavigateTo,
  safeRedirectTo,
  isSafeId,
  isLikelyImagePath,
  withSubmitLock
}
