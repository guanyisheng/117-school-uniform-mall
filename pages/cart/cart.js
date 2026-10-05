const cartApi = require('../../api/cart')
const { formatPrice, showLoading, hideLoading, showToast, requireLogin, ensureMpFeatures, requireFeature } = require('../../utils/util')

Page({
  data: {
    items: [],
    loading: true,
    allSelected: true,
    selectedCount: 0,
    totalText: '¥0.00'
  },

  onShow() {
    ensureMpFeatures().then(() => {
      if (!requireFeature('shopping')) {
        setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/profile/profile' }) }), 800)
        return
      }
      if (requireLogin()) this.loadCart()
    })
  },

  loadCart() {
    showLoading()
    cartApi.getCartList().then(res => {
      hideLoading()
      if (res.code === 0) {
        const items = (res.data || []).map(i => ({ ...i, selected: i.selected !== false }))
        this.setData({ items, loading: false })
        this.recalc()
      } else {
        showToast(res.message || '加载失败')
        this.setData({ loading: false, items: [] })
      }
    }).catch(() => {
      showToast('购物车接口未就绪')
      this.setData({ loading: false, items: [] })
    })
  },

  recalc() {
    const { items } = this.data
    const selected = items.filter(i => i.selected)
    const total = selected.reduce((s, i) => s + Number(i.price) * Number(i.quantity || 1), 0)
    this.setData({
      selectedCount: selected.length,
      allSelected: items.length > 0 && selected.length === items.length,
      totalText: `¥${formatPrice(total)}`
    })
  },

  onToggleItem(e) {
    const { id } = e.currentTarget.dataset
    const items = this.data.items.map(i =>
      String(i.id) === String(id) ? { ...i, selected: !i.selected } : i
    )
    this.setData({ items })
    this.recalc()
  },

  onToggleAll() {
    const next = !this.data.allSelected
    const items = this.data.items.map(i => ({ ...i, selected: next }))
    this.setData({ items })
    this.recalc()
  },

  onQtyMinus(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.items.find(i => String(i.id) === String(id))
    if (!item || item.quantity <= 1) return
    this.updateQty(item, item.quantity - 1)
  },

  updateQty(item, quantity) {
    const { clampQuantity } = require('../../utils/util')
    const qty = clampQuantity(quantity)
    cartApi.updateCartItem(item.id, { quantity: qty, size: item.size }).then(res => {
      if (res.code === 0) {
        const items = this.data.items.map(i =>
          String(i.id) === String(item.id) ? { ...i, quantity: qty } : i
        )
        this.setData({ items })
        this.recalc()
      } else {
        showToast(res.message || '更新失败')
      }
    })
  },

  onQtyPlus(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.items.find(i => String(i.id) === String(id))
    if (!item) return
    const { MAX_QTY } = require('../../utils/util')
    if (item.quantity >= MAX_QTY) {
      showToast(`最多购买${MAX_QTY}件`)
      return
    }
    this.updateQty(item, item.quantity + 1)
  },

  onRemove(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '提示',
      content: '确定删除该商品？',
      confirmColor: '#1565FF',
      success: (res) => {
        if (!res.confirm) return
        cartApi.removeCartItem(id).then(r => {
          if (r.code === 0 || r.code === 200) {
            showToast('已删除')
            this.loadCart()
          } else {
            showToast(r.message || '删除失败')
          }
        })
      }
    })
  },

  onCheckout() {
    const selected = this.data.items.filter(i => i.selected)
    if (!selected.length) {
      showToast('请选择商品')
      return
    }
    const cartIds = selected.map(i => i.id).filter(Boolean).join(',')
    const url = `/pages/order-confirm/order-confirm?from=cart&cartIds=${cartIds}`
    if (!requireLogin(url)) return
    wx.navigateTo({ url })
  }
})
