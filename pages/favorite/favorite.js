const userApi = require('../../api/user')
const { showLoading, hideLoading, showToast, requireLogin } = require('../../utils/util')

Page({
  data: {
    products: [],
    loading: true
  },

  onShow() {
    if (requireLogin()) {
      this.loadFavorites()
    }
  },

  loadFavorites() {
    showLoading()
    return userApi.getFavoriteList().then(res => {
      hideLoading()
      if (res.code === 0) {
        this.setData({ products: res.data })
      }
    }).catch(() => {
      showToast('加载失败')
    }).finally(() => {
      this.setData({ loading: false })
    })
  }
})
