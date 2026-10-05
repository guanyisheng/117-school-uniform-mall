const orderApi = require('../../api/order')
const { showLoading, hideLoading, showToast, requireLogin, formatPrice, ensureMpFeatures, requireFeature } = require('../../utils/util')

const TABS = [
  { key: '', name: '全部' },
  { key: 'pending_pay', name: '待支付' },
  { key: 'paid', name: '已支付' },
  { key: 'refunding', name: '退款中' }
]

Page({
  data: {
    tabs: TABS,
    activeTab: '',
    list: [],
    loading: true
  },

  onShow() {
    ensureMpFeatures().then(() => {
      if (!requireFeature('shopping')) {
        setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/profile/profile' }) }), 800)
        return
      }
      if (requireLogin()) this.loadList()
    })
  },

  onTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.key })
    this.loadList()
  },

  loadList() {
    showLoading()
    const status = this.data.activeTab
    orderApi.getOrderList(status ? { status } : {}).then(res => {
      hideLoading()
      if (res.code === 0) {
        const list = (res.data.list || []).map(o => ({
          ...o,
          amountText: `¥${formatPrice(o.amount)}`
        }))
        this.setData({ list, loading: false })
      } else {
        showToast(res.message || '加载失败')
        this.setData({ list: [], loading: false })
      }
    }).catch(() => {
      showToast('订单接口未就绪')
      this.setData({ list: [], loading: false })
    })
  },

  onDetail(e) {
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${e.currentTarget.dataset.id}`
    })
  },

  onPay(e) {
    const { id } = e.currentTarget.dataset
    showLoading('唤起支付...')
    orderApi.payOrderWithWechat(id).then(res => {
      if (res.code === 'USER_CANCEL') {
        showToast('已取消支付')
        return
      }
      if (res.code === 0) {
        showToast('支付成功', 'success')
        this.loadList()
      }
    }).catch(err => orderApi.handlePayError(err))
  },

  onCancel(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '取消订单',
      content: '确定取消该订单？',
      confirmColor: '#1565FF',
      success: (res) => {
        if (!res.confirm) return
        orderApi.cancelOrder(id).then(r => {
          if (r.code === 0) {
            showToast('已取消')
            this.loadList()
          } else {
            showToast(r.message || '取消失败')
          }
        })
      }
    })
  }
})
