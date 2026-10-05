const productApi = require('../../api/product')
const userApi = require('../../api/user')
const cartApi = require('../../api/cart')
const orderApi = require('../../api/order')
const { formatPrice, showLoading, hideLoading, showToast, requireLogin, clampQuantity, isSafeId, requireFeature, ensureMpFeatures } = require('../../utils/util')
const { handlePayError } = require('../../utils/pay')
const { safeRedirectTo, withSubmitLock } = require('../../utils/security')

Page({
  data: {
    mode: 'buy', // buy | cart
    product: null,
    items: [],
    priceText: '面议',
    totalAmount: 0,
    size: '',
    quantity: 1,
    addresses: [],
    selectedAddrId: '',
    selectedAddr: null,
    cartItemIds: [],
    paying: false
  },

  _bootOptions: null,

  onLoad(options) {
    this._bootOptions = options || {}
    ensureMpFeatures().then(() => {
      if (!requireFeature('shopping')) {
        setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }), 800)
        return
      }
      const returnUrl = this.buildReturnUrl(options)
      if (!requireLogin(returnUrl)) return
      this.bootstrap(options)
    })
  },

  onShow() {
    // 从登录页返回后补载；从地址编辑返回时刷新地址
    if (!requireFeature('shopping')) return
    if (!requireLogin(this.buildReturnUrl(this._bootOptions || {}))) return
    if (!this.data.items.length && this._bootOptions) {
      this.bootstrap(this._bootOptions)
    }
    this.loadAddresses()
  },

  buildReturnUrl(options) {
    options = options || {}
    const parts = []
    if (options.from === 'cart' && options.cartIds) {
      parts.push(`from=cart`, `cartIds=${encodeURIComponent(options.cartIds)}`)
    } else if (options.productId) {
      parts.push(`productId=${encodeURIComponent(options.productId)}`)
      if (options.size) parts.push(`size=${encodeURIComponent(options.size)}`)
      if (options.quantity) parts.push(`quantity=${encodeURIComponent(options.quantity)}`)
    }
    return parts.length
      ? `/pages/order-confirm/order-confirm?${parts.join('&')}`
      : '/pages/order-confirm/order-confirm'
  },

  bootstrap(options) {
    if (options.from === 'cart') {
      const cartIds = String(options.cartIds || '')
        .split(',')
        .map(s => s.trim())
        .filter(isSafeId)
      if (!cartIds.length) {
        showToast('请选择购物车商品')
        return
      }
      this.setData({ mode: 'cart', cartItemIds: cartIds })
      this.loadCartItems(cartIds)
    } else if (options.productId && isSafeId(options.productId)) {
      const size = options.size ? decodeURIComponent(options.size).slice(0, 20) : ''
      const quantity = clampQuantity(options.quantity)
      this.setData({ size, quantity, mode: 'buy' })
      this.loadProduct(options.productId)
    } else {
      showToast('参数无效')
    }
    this.loadAddresses()
  },

  loadCartItems(cartIds) {
    showLoading()
    cartApi.getCartList().then(res => {
      hideLoading()
      if (res.code !== 0) {
        showToast(res.message || '购物车加载失败')
        return
      }
      const idSet = {}
      cartIds.forEach(id => { idSet[String(id)] = true })
      const items = (res.data || [])
        .filter(i => idSet[String(i.id)])
        .map(i => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          cover: i.cover,
          price: Number(i.price) || 0,
          size: i.size || '',
          quantity: clampQuantity(i.quantity)
        }))
      if (!items.length) {
        showToast('选中商品已失效')
        return
      }
      const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0)
      this.setData({
        items,
        cartItemIds: items.map(i => i.id),
        totalAmount,
        priceText: totalAmount ? `¥${formatPrice(totalAmount)}` : '面议'
      })
    }).catch(() => showToast('购物车加载失败'))
  },

  loadProduct(id) {
    showLoading()
    productApi.getProductDetail(id).then(res => {
      hideLoading()
      if (res.code === 0 && res.data) {
        const price = Number(res.data.price) || 0
        const { quantity, size } = this.data
        const sizes = res.data.sizes || []
        const safeSize = !sizes.length || sizes.indexOf(size) !== -1 ? size : ''
        if (sizes.length && !safeSize) {
          showToast('请重新选择尺码')
        }
        const totalAmount = price * quantity
        this.setData({
          product: res.data,
          size: safeSize,
          totalAmount,
          priceText: totalAmount ? `¥${formatPrice(totalAmount)}` : '面议',
          items: [{
            productId: res.data.id,
            productName: res.data.name,
            cover: res.data.cover,
            price,
            size: safeSize,
            quantity
          }]
        })
      } else {
        showToast((res && res.message) || '商品不存在')
      }
    }).catch(() => showToast('商品加载失败'))
  },

  loadAddresses() {
    userApi.getAddressList().then(res => {
      if (res.code === 0) {
        const list = res.data || []
        const defaultAddr = list.find(a => a.isDefault) || list[0]
        this.setData({
          addresses: list,
          selectedAddrId: defaultAddr ? String(defaultAddr.id) : '',
          selectedAddr: defaultAddr || null
        })
      }
    }).catch(() => {
      showToast('地址加载失败')
    })
  },

  onSelectAddr(e) {
    const { id } = e.currentTarget.dataset
    const addr = this.data.addresses.find(a => String(a.id) === String(id))
    if (addr) this.setData({ selectedAddrId: String(id), selectedAddr: addr })
  },

  onAddAddress() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' })
  },

  onPay() {
    const { items, selectedAddr, cartItemIds, paying, size, product } = this.data
    if (paying) return
    if (!items.length) {
      showToast('没有可结算商品')
      return
    }
    if (!selectedAddr || !selectedAddr.id) {
      showToast('请先添加收货地址')
      return
    }
    if (product && (product.sizes || []).length && !size) {
      showToast('请选择尺码')
      return
    }

    withSubmitLock('pay', 2000, () => {
      this.setData({ paying: true })
      showLoading('提交订单...')

      const orderItems = items.map(i => ({
        productId: i.productId,
        size: i.size || '',
        quantity: clampQuantity(i.quantity)
      }))

      const payload = {
        addressId: selectedAddr.id,
        items: orderItems,
        cartItemIds: cartItemIds.filter(isSafeId)
      }

      if (orderItems.length === 1) {
        payload.productId = orderItems[0].productId
        payload.size = orderItems[0].size
        payload.quantity = orderItems[0].quantity
      }

      return orderApi.createOrder(payload).then(res => {
        if (res.code !== 0) {
          showToast(res.message || '下单失败')
          return null
        }
        hideLoading()
        if (!requireFeature('pay')) {
          showToast('订单已提交，支付暂未开放')
          setTimeout(() => safeRedirectTo('/pages/order-list/order-list'), 800)
          return null
        }
        showLoading('唤起支付...')
        return orderApi.payOrderWithWechat(res.data.id)
      }).then(res => {
        if (!res) return
        if (res.code === 'USER_CANCEL') {
          showToast('已取消支付，可在订单中继续支付')
          setTimeout(() => safeRedirectTo('/pages/order-list/order-list'), 800)
          return
        }
        if (res.code === 0) {
          const tip = res.data && res.data.mock
            ? '订单已提交（开发环境模拟支付）'
            : '支付成功，请等待发货'
          wx.showModal({
            title: '下单成功',
            content: tip,
            showCancel: false,
            success: () => safeRedirectTo('/pages/order-list/order-list')
          })
        }
      }).catch(err => {
        handlePayError(err)
      }).finally(() => {
        hideLoading()
        this.setData({ paying: false })
      })
    })
  }
})
