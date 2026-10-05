const schoolApi = require('../../api/school')
const { showLoading, hideLoading, showToast } = require('../../utils/util')
const { setTabBarSelected } = require('../../utils/tabBar')

Page({
  data: {
    schools: [],
    loading: true
  },

  onShow() {
    setTabBarSelected(this, 1)
  },

  onLoad() {
    this.loadSchools()
  },

  onPullDownRefresh() {
    this.loadSchools().then(() => wx.stopPullDownRefresh())
  },

  loadSchools() {
    showLoading()
    return schoolApi.getSchoolList().then(res => {
      hideLoading()
      if (res.code === 0) {
        this.setData({ schools: res.data })
      }
    }).catch(() => {
      showToast('加载失败')
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  onSchoolTap(e) {
    const { id, name } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/school-products/school-products?schoolId=${id}&schoolName=${encodeURIComponent(name || '')}`
    })
  }
})
