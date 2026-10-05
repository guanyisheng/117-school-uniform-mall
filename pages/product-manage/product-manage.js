const productApi = require('../../api/product')
const { showLoading, hideLoading, showToast, requireAdminAsync, formatPrice, isSafeId } = require('../../utils/util')

Page({
  data: {
    list: [],
    loading: true
  },

  onShow() {
    requireAdminAsync().then(ok => {
      if (!ok) {
        setTimeout(() => wx.navigateBack(), 500)
        return
      }
      this.loadList()
    })
  },

  loadList() {
    showLoading()
    productApi.getAdminProductList().then(res => {
      if (res.code === 0) {
        const list = (res.data.list || []).map(p => ({
          ...p,
          priceText: `¥${formatPrice(p.price)}`,
          statusText: p.isOnSale ? '在售' : '已下架'
        }))
        this.setData({ list, loading: false })
      } else {
        showToast(res.message || '加载失败')
        this.setData({ list: [], loading: false })
      }
    }).catch(() => {
      showToast('管理接口未就绪或无权限')
      this.setData({ loading: false, list: [] })
    }).finally(hideLoading)
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/product-publish/product-publish' })
  },

  onEdit(e) {
    const { id } = e.currentTarget.dataset
    if (!isSafeId(id)) return
    wx.navigateTo({ url: `/pages/product-publish/product-publish?id=${id}` })
  },

  onOffShelf(e) {
    const { id } = e.currentTarget.dataset
    if (!isSafeId(id)) return
    wx.showModal({
      title: '下架商品',
      content: '确定下架该商品？下架后用户不可购买。',
      confirmColor: '#1565FF',
      success: (res) => {
        if (!res.confirm) return
        productApi.offShelfProduct(id).then(r => {
          if (r.code === 0) {
            showToast('已下架')
            this.loadList()
          } else {
            showToast(r.message || '操作失败')
          }
        })
      }
    })
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset
    if (!isSafeId(id)) return
    wx.showModal({
      title: '删除商品',
      content: '确定删除？此操作不可恢复。',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (!res.confirm) return
        productApi.deleteProduct(id).then(r => {
          if (r.code === 0 || r.code === 200) {
            showToast('已删除')
            this.loadList()
          } else {
            showToast(r.message || '删除失败')
          }
        })
      }
    })
  }
})
