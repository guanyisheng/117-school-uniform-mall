const orderApi = require('../../api/order')
const { showLoading, hideLoading, showToast, requireLogin, formatPrice } = require('../../utils/util')

Page({
  data: {
    order: null,
    amountText: '',
    loading: true
  },

  onLoad(options) {
    const returnUrl = options.id
      ? `/pages/order-detail/order-detail?id=${encodeURIComponent(options.id)}`
      : '/pages/order-list/order-list'
    if (!requireLogin(returnUrl)) return
    this.orderId = options.id
    this.loadDetail()
  },

  loadDetail() {
    showLoading()
    orderApi.getOrderDetail(this.orderId).then(res => {
      hideLoading()
      if (res.code === 0 && res.data) {
        this.setData({
          order: res.data,
          amountText: `¥${formatPrice(res.data.amount)}`,
          loading: false
        })
      } else {
        showToast(res.message || '订单不存在')
        this.setData({ loading: false })
      }
    }).catch(() => {
      showToast('加载失败')
      this.setData({ loading: false })
    })
  },

  onPay() {
    showLoading('唤起支付...')
    orderApi.payOrderWithWechat(this.orderId).then(res => {
      if (res.code === 'USER_CANCEL') {
        showToast('已取消支付')
        return
      }
      if (res.code === 0) {
        showToast('支付成功', 'success')
        this.loadDetail()
      }
    }).catch(err => orderApi.handlePayError(err))
  },

  onCancel() {
    wx.showModal({
      title: '取消订单',
      content: '确定取消该订单？',
      confirmColor: '#1565FF',
      success: (res) => {
        if (!res.confirm) return
        orderApi.cancelOrder(this.orderId).then(r => {
          if (r.code === 0) {
            showToast('已取消')
            this.loadDetail()
          } else {
            showToast(r.message || '取消失败')
          }
        })
      }
    })
  },

  onRefund() {
    wx.showModal({
      title: '申请退款',
      editable: true,
      placeholderText: '请填写退款原因',
      confirmColor: '#1565FF',
      success: (res) => {
        if (!res.confirm) return
        const reason = (res.content || '').trim() || '家长申请退款'
        showLoading('提交中...')
        orderApi.refundOrder(this.orderId, reason).then(r => {
          if (r.code === 0) {
            showToast('已提交退款申请')
            this.loadDetail()
          } else {
            showToast(r.message || '申请失败')
          }
        }).catch(() => showToast('申请失败'))
      }
    })
  }
})
