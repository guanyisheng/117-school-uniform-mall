App({
  globalData: {
    userInfo: null,
    token: '',
    isLogin: false,
    productFilter: null,
    homePanelIndex: 0,
    features: {
      enable_login: true,
      enable_shopping: true,
      enable_pay: true,
      enable_sms: true,
      enable_id_card: true,
      enable_password: false,
      notice: ''
    },
    featuresReady: false
  },

  onLaunch() {
    this.loadFeatures()
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    if (token && userInfo) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
      this.globalData.isLogin = true
      this.refreshSession()
    }
  },

  loadFeatures() {
    const featuresApi = require('./api/features')
    return featuresApi.getFeatures().then(features => {
      this.globalData.features = features
      this.globalData.featuresReady = true
      try {
        wx.setStorageSync('mp_features', features)
      } catch (e) { /* ignore */ }
      return features
    }).catch(() => {
      const cached = wx.getStorageSync('mp_features')
      if (cached) this.globalData.features = cached
      this.globalData.featuresReady = true
      return this.globalData.features
    })
  },

  ensureFeatures() {
    if (this.globalData.featuresReady) {
      return Promise.resolve(this.globalData.features)
    }
    return this.loadFeatures()
  },

  getFeatures() {
    return this.globalData.features || {
      enable_login: true,
      enable_shopping: true,
      enable_pay: true,
      notice: ''
    }
  },

  refreshSession() {
    const userApi = require('./api/user')
    userApi.getUserInfo().then(res => {
      if (res.code === 0 && res.data) {
        this.setUserInfo(res.data)
      }
    }).catch(() => {})
  },

  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    this.globalData.isLogin = true
    wx.setStorageSync('userInfo', userInfo)
  },

  setToken(token) {
    const t = String(token || '').trim()
    this.globalData.token = t
    wx.setStorageSync('token', t)
  },

  logout() {
    this.globalData.userInfo = null
    this.globalData.token = ''
    this.globalData.isLogin = false
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
  }
})
