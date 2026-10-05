const productApi = require('../../api/product')
const { showLoading, hideLoading, showToast } = require('../../utils/util')

Page({
  data: {
    schoolId: '',
    schoolName: '',
    products: [],
    loading: true
  },

  onLoad(options) {
    const schoolId = options.schoolId || ''
    let schoolName = options.schoolName || ''
    try {
      schoolName = decodeURIComponent(schoolName)
    } catch (e) { /* keep raw */ }
    this.setData({ schoolId, schoolName })
    wx.setNavigationBarTitle({ title: schoolName || '学校商品' })
    this.loadProducts(schoolId)
  },

  loadProducts(schoolId) {
    showLoading()
    return productApi.getProductList({ schoolId }).then(res => {
      hideLoading()
      if (res.code === 0) {
        this.setData({ products: res.data.list })
      }
    }).catch(() => {
      showToast('加载失败')
    }).finally(() => {
      this.setData({ loading: false })
    })
  }
})
