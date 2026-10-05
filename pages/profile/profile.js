const userApi = require('../../api/user')
const {
  checkLogin,
  showToast,
  getAvatarText,
  isAdminUser,
  ensureMpFeatures,
  isLoginEnabled,
  isShoppingEnabled,
  featureNotice
} = require('../../utils/util')
const { setTabBarSelected } = require('../../utils/tabBar')

Page({
  data: {
    isLogin: false,
    isAdmin: false,
    enableLogin: true,
    avatarText: '',
    userInfo: {
      nickname: '未登录',
      avatar: '',
      school: '',
      childName: ''
    },
    menuList: []
  },

  onShow() {
    setTabBarSelected(this, 2)
    ensureMpFeatures().then(() => {
      this.loadUserInfo()
    })
  },

  buildMenu(isAdmin) {
    const list = []
    if (isShoppingEnabled()) {
      list.push(
        { id: 'orders', name: '我的订单', icon: 'tag', url: '/pages/order-list/order-list', needLogin: true },
        { id: 'cart', name: '购物车', icon: 'shirt', url: '/pages/cart/cart', needLogin: true }
      )
    }
    list.push(
      { id: 'favorite', name: '我的收藏', icon: 'heart', url: '/pages/favorite/favorite', needLogin: true },
      { id: 'address', name: '收货地址', icon: 'location', url: '/pages/address/address', needLogin: true }
    )
    if (isAdmin) {
      list.push({ id: 'manage', name: '商品管理', icon: 'tag', url: '/pages/product-manage/product-manage', needLogin: true, needAdmin: true })
      list.push({ id: 'publish', name: '上架商品', icon: 'tag', url: '/pages/product-publish/product-publish', needLogin: true, needAdmin: true })
    }
    list.push(
      { id: 'service', name: '联系客服', icon: 'phone', action: 'service' },
      { id: 'about', name: '关于我们', icon: 'info', url: '/pages/about/about' },
      { id: 'feedback', name: '意见反馈', icon: 'message', url: '/pages/feedback/feedback' }
    )
    return list
  },

  setLoggedOut() {
    this.setData({
      isLogin: false,
      isAdmin: false,
      enableLogin: isLoginEnabled(),
      avatarText: '',
      userInfo: {
        nickname: isLoginEnabled() ? '未登录' : '游客浏览',
        avatar: '',
        school: '',
        childName: ''
      },
      menuList: this.buildMenu(false)
    })
  },

  loadUserInfo() {
    this.setData({ enableLogin: isLoginEnabled() })
    if (!checkLogin()) {
      this.setLoggedOut()
      return
    }

    userApi.getUserInfo().then(res => {
      if (res.code === 0 && res.data) {
        if (isLoginEnabled() && (!res.data.childName || !res.data.schoolId)) {
          wx.navigateTo({ url: '/pages/login/login' })
        }
        const isAdmin = isAdminUser(res.data)
        this.setData({
          isLogin: true,
          isAdmin,
          enableLogin: isLoginEnabled(),
          userInfo: res.data,
          avatarText: getAvatarText(res.data),
          menuList: this.buildMenu(isAdmin)
        })
        return
      }
      if (!checkLogin()) this.setLoggedOut()
    }).catch(() => {
      if (!checkLogin()) {
        this.setLoggedOut()
        return
      }
      const cached = wx.getStorageSync('userInfo') || {}
      const isAdmin = isAdminUser(cached)
      this.setData({
        isLogin: true,
        isAdmin,
        enableLogin: isLoginEnabled(),
        userInfo: cached,
        avatarText: getAvatarText(cached),
        menuList: this.buildMenu(isAdmin)
      })
    })
  },

  onLoginTap() {
    if (this.data.isLogin) return
    if (!isLoginEnabled()) {
      showToast(featureNotice('登录功能暂未开放'))
      return
    }
    wx.navigateTo({ url: '/pages/login/login' })
  },

  onMenuTap(e) {
    const item = e.currentTarget.dataset.item
    if (item.needLogin && !checkLogin()) {
      if (!isLoginEnabled()) {
        showToast(featureNotice('登录功能暂未开放'))
        return
      }
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    if (item.needAdmin && !isAdminUser()) {
      showToast('需要管理员权限')
      return
    }
    if (item.action === 'service') {
      wx.showModal({
        title: '联系客服',
        content: '电话：13312542331\n工作时间：9:00-18:00',
        showCancel: false,
        confirmColor: '#1565FF'
      })
      return
    }
    if (item.url) {
      const { safeNavigateTo } = require('../../utils/security')
      if (!safeNavigateTo(item.url)) {
        showToast('无效页面')
      }
    }
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录吗？',
      confirmColor: '#1565FF',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          if (app) app.logout()
          this.setLoggedOut()
          showToast('已退出登录')
        }
      }
    })
  }
})
