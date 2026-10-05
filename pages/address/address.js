const userApi = require('../../api/user')
const { showLoading, hideLoading, showToast, requireLogin } = require('../../utils/util')

Page({
  data: {
    addresses: [],
    loading: true
  },

  onShow() {
    if (requireLogin()) {
      this.loadAddresses()
    }
  },

  loadAddresses() {
    showLoading()
    return userApi.getAddressList().then(res => {
      hideLoading()
      if (res.code === 0) {
        this.setData({ addresses: res.data })
      }
    }).catch(() => {
      showToast('加载失败')
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' })
  },

  onEdit(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/address-edit/address-edit?id=${id}` })
  },

  onSetDefault(e) {
    const { id } = e.currentTarget.dataset
    userApi.updateAddress(id, { isDefault: true }).then(res => {
      if (res.code === 0) {
        showToast('已设为默认')
        this.loadAddresses()
      }
    })
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除地址',
      content: '确定删除该地址吗？',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          userApi.deleteAddress(id).then(r => {
            if (r.code === 0) {
              showToast('已删除')
              this.loadAddresses()
            }
          })
        }
      }
    })
  }
})
