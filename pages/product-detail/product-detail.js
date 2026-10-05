const productApi = require('../../api/product')
const userApi = require('../../api/user')
const cartApi = require('../../api/cart')
const { formatPrice, showLoading, hideLoading, showToast, requireLogin, checkLogin, clampQuantity, MAX_QTY, ensureMpFeatures, requireFeature } = require('../../utils/util')

Page({
  data: {
    product: null,
    priceText: '0.00',
    isFavorite: false,
    activeTab: 'intro',
    selectedSize: '',
    quantity: 1,
    enableShopping: true
  },

  onLoad(options) {
    const { id } = options
    ensureMpFeatures().then(f => {
      this.setData({ enableShopping: f.enable_shopping !== false })
    })
    if (id) {
      this.loadProduct(id)
      // 未登录不请求收藏，避免 401 打断浏览
      if (checkLogin()) {
        userApi.checkFavorite(id).then(isFavorite => {
          this.setData({ isFavorite })
        }).catch(() => {
          // token 失效时静默忽略，不影响商品浏览
        })
      }
    }
  },

  loadProduct(id) {
    showLoading()
    productApi.getProductDetail(id).then(res => {
      hideLoading()
      if (res.code === 0 && res.data) {
        const price = Number(res.data.price)
        const sizes = res.data.sizes || []
        this.setData({
          product: res.data,
          priceText: price ? `¥${formatPrice(price)}` : '面议',
          selectedSize: sizes.length === 1 ? sizes[0] : ''
        })
        wx.setNavigationBarTitle({ title: res.data.schoolName })
      } else {
        showToast('商品不存在')
        setTimeout(() => wx.navigateBack(), 1500)
      }
    }).catch(() => showToast('加载失败'))
  },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  onSelectSize(e) {
    const size = e.currentTarget.dataset.size
    const sizes = (this.data.product && this.data.product.sizes) || []
    if (sizes.indexOf(size) === -1) return
    this.setData({ selectedSize: size })
  },

  onQtyMinus() {
    if (this.data.quantity <= 1) return
    this.setData({ quantity: this.data.quantity - 1 })
  },

  onQtyPlus() {
    if (this.data.quantity >= MAX_QTY) {
      showToast(`最多购买${MAX_QTY}件`)
      return
    }
    this.setData({ quantity: this.data.quantity + 1 })
  },

  ensureSku() {
    const { product, selectedSize } = this.data
    if (product.sizes && product.sizes.length && !selectedSize) {
      showToast('请选择尺码')
      this.setData({ activeTab: 'size' })
      return false
    }
    return true
  },

  onFavorite() {
    if (!requireLogin()) return
    const { product, isFavorite } = this.data
    if (!product) return
    userApi.toggleFavorite(product.id).then(res => {
      if (res.code === 0) {
        const next = res.data && res.data.isFavorite != null
          ? res.data.isFavorite
          : !isFavorite
        this.setData({ isFavorite: next })
        showToast(next ? '已收藏' : '已取消收藏')
      }
    })
  },

  onContact() {
    wx.showModal({
      title: '联系客服',
      content: '电话：13312542331\n工作时间：9:00-18:00',
      showCancel: false,
      confirmColor: '#1565FF'
    })
  },

  onAddCart() {
    if (!requireFeature('shopping')) return
    if (!requireLogin()) return
    if (!this.ensureSku()) return
    const { product, selectedSize, quantity } = this.data
    showLoading('加入中...')
    cartApi.addToCart({
      productId: product.id,
      size: selectedSize,
      quantity: clampQuantity(quantity)
    }).then(res => {
      if (res.code === 0) {
        showToast('已加入购物车', 'success')
      } else {
        showToast(res.message || '加入失败')
      }
    }).catch(() => showToast('加入失败，请确认后端购物车接口'))
  },

  onBook() {
    if (!requireFeature('shopping')) return
    const { product, selectedSize, quantity } = this.data
    if (!product) return
    if (!this.ensureSku()) return
    const q = [
      `productId=${product.id}`,
      `size=${encodeURIComponent(selectedSize || '')}`,
      `quantity=${clampQuantity(quantity)}`
    ].join('&')
    const url = `/pages/order-confirm/order-confirm?${q}`
    if (!requireLogin(url)) return
    wx.navigateTo({ url })
  }
})
