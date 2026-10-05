const { request } = require('./request')
const { PATHS } = require('./config')
const { mapUser, toSnakePayload } = require('../utils/apiAdapter')

function sendSmsCode(phone) {
  return request({ url: PATHS.loginSms, method: 'POST', data: { phone }, auth: false })
}

function applySession(token, userRaw, phoneFallback) {
  const userInfo = mapUser({
    ...userRaw,
    phone: (userRaw && userRaw.phone) || phoneFallback
  })
  wx.setStorageSync('token', token)
  wx.setStorageSync('userInfo', userInfo)
  const app = getApp()
  if (app) {
    app.setToken(token)
    app.setUserInfo(userInfo)
  }
  return userInfo
}

function finishLogin(res, phone) {
  if (res.code !== 0) return Promise.resolve(res)
  const token = res.data.token
  const loginUser = res.data.user || {}
  const flagFirst = res.data.isFirstLogin != null
    ? !!res.data.isFirstLogin
    : !!res.data.is_first_login

  return request({
    url: PATHS.userInfo,
    header: { Authorization: `Bearer ${token}` }
  }).then(infoRes => {
    const raw = infoRes.code === 0 && infoRes.data ? infoRes.data : loginUser
    const userInfo = applySession(token, raw, phone)
    const isFirstLogin = flagFirst || !userInfo.childName || !userInfo.schoolId
    return {
      code: 0,
      message: res.message || '登录成功',
      data: { token, userInfo, isFirstLogin }
    }
  }).catch(() => {
    const userInfo = applySession(token, loginUser, phone)
    return {
      code: 0,
      message: res.message || '登录成功',
      data: { token, userInfo, isFirstLogin: flagFirst || !userInfo.childName }
    }
  })
}

/** 验证码登录（身份证按云控可选） */
function loginByPhone(phone, code, idCard) {
  const data = { phone, code }
  if (idCard) data.idCard = idCard
  return request({
    url: PATHS.login,
    method: 'POST',
    data: toSnakePayload(data),
    auth: false
  }).then(res => finishLogin(res, phone))
}

/** 密码登录（身份证按云控可选） */
function loginByPassword(phone, password, idCard) {
  const data = { phone, password }
  if (idCard) data.idCard = idCard
  return request({
    url: PATHS.login,
    method: 'POST',
    data: toSnakePayload(data),
    auth: false
  }).then(res => finishLogin(res, phone))
}

function completeProfile(data) {
  const payload = {
    childName: data.childName,
    schoolId: data.schoolId,
    className: data.className,
    nickname: data.nickname
  }
  if (data.idCard) payload.idCard = data.idCard
  return request({
    url: PATHS.userInfo,
    method: 'PUT',
    data: toSnakePayload(payload)
  }).then(res => {
    if (res.code !== 0) return res
    const userInfo = mapUser(res.data)
    wx.setStorageSync('userInfo', userInfo)
    const app = getApp()
    if (app) app.setUserInfo(userInfo)
    return { code: 0, message: '信息完善成功', data: userInfo }
  })
}

function bindWechat() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(loginRes) {
        if (!loginRes.code) {
          reject(new Error('获取微信登录码失败'))
          return
        }
        request({
          url: PATHS.userWxBind,
          method: 'POST',
          data: { code: loginRes.code }
        }).then(res => {
          if (res.code !== 0) {
            reject(new Error(res.message || '微信绑定失败'))
            return
          }
          if (res.data) {
            const userInfo = mapUser(res.data)
            wx.setStorageSync('userInfo', userInfo)
            const app = getApp()
            if (app) app.setUserInfo(userInfo)
          }
          resolve(res)
        }).catch(err => reject(err))
      },
      fail() {
        reject(new Error('微信登录失败'))
      }
    })
  })
}

module.exports = {
  sendSmsCode,
  loginByPhone,
  loginByPassword,
  completeProfile,
  bindWechat
}
