const userApi = require('../../api/user')
const { showLoading, hideLoading, showToast, isValidPhone, sanitizeName, sanitizeText } = require('../../utils/util')
const { withSubmitLock } = require('../../utils/security')

Page({
  data: {
    id: '',
    isEdit: false,
    name: '',
    phone: '',
    province: '云南省',
    city: '昭通市',
    district: '鲁甸县',
    detail: '',
    isDefault: false,
    region: ['云南省', '昭通市', '鲁甸县']
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑地址' })
      this.loadAddress(options.id)
    }
  },

  loadAddress(id) {
    showLoading()
    userApi.getAddressList().then(res => {
      hideLoading()
      if (res.code === 0) {
        const addr = res.data.find(a => String(a.id) === String(id))
        if (addr) {
          this.setData({
            name: addr.name,
            phone: addr.phone,
            province: addr.province,
            city: addr.city,
            district: addr.district,
            detail: addr.detail,
            isDefault: addr.isDefault,
            region: [addr.province, addr.city, addr.district]
          })
        }
      }
    }).catch(() => showToast('地址加载失败'))
  },

  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onPhoneInput(e) {
    this.setData({ phone: String(e.detail.value || '').replace(/\D/g, '').slice(0, 11) })
  },
  onDetailInput(e) { this.setData({ detail: e.detail.value }) },
  onDefaultChange(e) {
    this.setData({ isDefault: !!e.detail.value })
  },

  onRegionChange(e) {
    const region = e.detail.value
    this.setData({
      region,
      province: region[0],
      city: region[1],
      district: region[2]
    })
  },

  onSave() {
    const { id, isEdit, name, phone, province, city, district, detail, isDefault } = this.data
    const safeName = sanitizeName(name)
    const safeDetail = sanitizeText(detail, 120)

    if (!safeName) { showToast('请输入收货人'); return }
    if (!isValidPhone(phone)) { showToast('请输入正确的手机号'); return }
    if (!safeDetail) { showToast('请输入详细地址'); return }

    const data = {
      name: safeName,
      phone,
      province,
      city,
      district,
      detail: safeDetail,
      isDefault
    }

    withSubmitLock('address', 1500, () => {
      showLoading('保存中...')
      const promise = isEdit
        ? userApi.updateAddress(id, data)
        : userApi.addAddress(data)

      return promise.then(res => {
        if (res.code === 0) {
          showToast('保存成功', 'success')
          setTimeout(() => wx.navigateBack(), 800)
        } else {
          showToast(res.message || '保存失败')
        }
      }).catch(() => showToast('保存失败'))
    })
  }
})
