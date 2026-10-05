const userApi = require('../../api/user')
const { showToast, showLoading, sanitizeText, requireLogin } = require('../../utils/util')
const { withSubmitLock } = require('../../utils/security')

Page({
  data: {
    content: '',
    contact: '',
    types: ['功能建议', '商品问题', '物流问题', '其他'],
    typeIndex: 0
  },

  onShow() {
    requireLogin()
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value })
  },

  onTypeChange(e) {
    this.setData({ typeIndex: Number(e.detail.value) })
  },

  onSubmit() {
    const { content, contact, types, typeIndex } = this.data
    const text = sanitizeText(content, 500)
    const contactText = sanitizeText(contact, 50)
    if (!text) {
      showToast('请输入反馈内容')
      return
    }
    withSubmitLock('feedback', 2000, () => {
      showLoading('提交中...')
      return userApi.submitFeedback({
        type: types[typeIndex],
        content: text,
        contact: contactText
      }).then(res => {
        if (res.code === 0) {
          showToast('感谢您的反馈', 'success')
          setTimeout(() => wx.navigateBack(), 1000)
        } else {
          showToast(res.message || '提交失败')
        }
      }).catch(() => showToast('提交失败'))
    })
  }
})
