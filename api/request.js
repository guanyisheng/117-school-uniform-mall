/**
 * 统一请求封装 — 鉴权、超时、401 清会话
 */
const { normalizeResponse } = require('../utils/apiAdapter')
const { BASE_URL, PATHS, SECURITY } = require('./config')
const { isSafeId } = require('../utils/security')

let _handlingAuth = false

function getToken() {
  return wx.getStorageSync('token') || ''
}

function getAuthHeader() {
  const token = getToken()
  if (!token) return ''
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`
}

function clearSession() {
  try {
    const app = getApp()
    if (app && typeof app.logout === 'function') {
      app.logout()
      return
    }
  } catch (e) { /* app 未就绪 */ }
  wx.removeStorageSync('token')
  wx.removeStorageSync('userInfo')
}

function handleUnauthorized() {
  if (_handlingAuth) return
  // 无 token 的访客请求失败，不强制跳登录
  if (!getToken()) return
  _handlingAuth = true
  clearSession()
  wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 })
  setTimeout(() => {
    _handlingAuth = false
    const pages = getCurrentPages()
    const cur = pages[pages.length - 1]
    const route = cur ? '/' + cur.route : ''
    if (route.indexOf('/pages/login/login') === -1) {
      wx.navigateTo({ url: '/pages/login/login' })
    }
  }, 400)
}

function assertSafeUrlPath(url) {
  if (typeof url !== 'string' || !url.startsWith('/api/')) {
    throw new Error('非法请求路径')
  }
  if (url.indexOf('..') !== -1) {
    throw new Error('非法请求路径')
  }
}

function friendlyHttpError(res) {
  const status = res && res.statusCode
  if (status === 401 || status === 403) {
    return { statusCode: status, message: status === 401 ? '请重新登录' : '没有权限' }
  }
  if (status >= 500) return { statusCode: status, message: '服务暂时不可用，请稍后再试' }
  if (status === 404) return { statusCode: status, message: '接口不存在' }
  const msg = (res && res.data && (res.data.message || res.data.msg)) || '请求失败'
  return { statusCode: status, message: String(msg).slice(0, 80) }
}

function request(options) {
  const { url, method = 'GET', data = {}, header = {}, auth = true } = options

  try {
    assertSafeUrlPath(url)
  } catch (e) {
    return Promise.reject({ message: e.message })
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method,
      data,
      timeout: SECURITY.REQUEST_TIMEOUT_MS,
      header: {
        'Content-Type': 'application/json',
        ...(auth && getToken() ? { Authorization: getAuthHeader() } : {}),
        ...header
      },
      success(res) {
        if (res.statusCode === 401) {
          handleUnauthorized()
          reject(friendlyHttpError(res))
          return
        }
        if (res.statusCode === 403) {
          // 后端业务 403 也可能带 message（如账号禁用）
          const body403 = res.data && typeof res.data === 'object' ? normalizeResponse(res.data) : null
          if (body403 && body403.message) {
            reject({ code: 403, message: body403.message })
          } else {
            reject(friendlyHttpError(res))
          }
          return
        }
        // 后端 error()：HTTP 4xx + { code, message } —— 交给业务层判断 code
        if (res.data && typeof res.data === 'object' && res.data.code != null) {
          const body = normalizeResponse(res.data)
          if (body.code === 401 || body.code === 40100) {
            handleUnauthorized()
            reject({ message: body.message || '请重新登录', code: 401 })
            return
          }
          resolve(body)
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(normalizeResponse(res.data))
        } else {
          reject(friendlyHttpError(res))
        }
      },
      fail(err) {
        const msg = (err && err.errMsg) || ''
        if (msg.indexOf('timeout') !== -1) {
          reject({ message: '网络超时，请稍后重试' })
        } else {
          reject({ message: '网络异常，请检查网络' })
        }
      }
    })
  })
}

function uploadFile(filePath) {
  if (!filePath) {
    return Promise.reject({ message: '无效的文件' })
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: BASE_URL + PATHS.upload,
      filePath,
      name: 'file',
      timeout: SECURITY.REQUEST_TIMEOUT_MS,
      header: {
        Authorization: getAuthHeader()
      },
      success(res) {
        if (res.statusCode === 401) {
          handleUnauthorized()
          reject({ message: '请重新登录' })
          return
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject({ message: '上传失败' })
          return
        }
        try {
          resolve(normalizeResponse(JSON.parse(res.data)))
        } catch (e) {
          reject({ message: '上传响应无效' })
        }
      },
      fail() {
        reject({ message: '上传失败，请检查网络' })
      }
    })
  })
}

/** 生成带 id 校验的资源路径，避免异常拼接 */
function resourcePath(factory, id) {
  if (!isSafeId(id)) {
    throw new Error('无效的资源 ID')
  }
  return factory(id)
}

module.exports = {
  BASE_URL,
  PATHS,
  SECURITY,
  request,
  uploadFile,
  getToken,
  clearSession,
  resourcePath,
  handleUnauthorized
}
