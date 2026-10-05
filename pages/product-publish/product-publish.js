const schoolApi = require('../../api/school')
const productApi = require('../../api/product')
const publishApi = require('../../api/product-publish')
const { showToast, showLoading, hideLoading, sanitizeText, sanitizeName } = require('../../utils/util')
const { isLikelyImagePath, withSubmitLock } = require('../../utils/security')
const { SECURITY } = require('../../api/config')

Page({
  data: {
    productId: '',
    isEdit: false,
    name: '',
    price: '',
    intro: '',
    images: [],
    sizesText: 'S,M,L,XL',
    schoolIndex: -1,
    schools: [],
    schoolNames: []
  },

  onLoad(options) {
    const { requireAdminAsync, isSafeId } = require('../../utils/util')
    requireAdminAsync().then(ok => {
      if (!ok) {
        setTimeout(() => wx.navigateBack(), 500)
        return
      }
      const productId = options.id || ''
      if (productId && !isSafeId(productId)) {
        showToast('参数无效')
        setTimeout(() => wx.navigateBack(), 500)
        return
      }
      this.setData({ productId, isEdit: !!productId })
      if (productId) {
        wx.setNavigationBarTitle({ title: '编辑商品' })
      }

      schoolApi.getSchoolList().then(res => {
        if (res.code === 0) {
          this.setData({
            schools: res.data,
            schoolNames: res.data.map(s => s.name)
          })
          if (productId) this.loadProduct(productId)
        }
      })
    })
  },

  loadProduct(id) {
    showLoading()
    productApi.getProductDetail(id).then(res => {
      if (res.code !== 0 || !res.data) {
        showToast('商品不存在')
        return
      }
      const p = res.data
      const schoolIndex = this.data.schools.findIndex(s => String(s.id) === String(p.schoolId))
      this.setData({
        name: p.name,
        price: String(p.price || ''),
        intro: p.intro || '',
        images: p.images || [],
        sizesText: (p.sizes || []).join(',') || 'S,M,L,XL',
        schoolIndex: schoolIndex >= 0 ? schoolIndex : -1
      })
    }).finally(hideLoading)
  },

  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onPriceInput(e) { this.setData({ price: e.detail.value }) },
  onIntroInput(e) { this.setData({ intro: e.detail.value }) },
  onSizesInput(e) { this.setData({ sizesText: e.detail.value }) },
  onSchoolChange(e) { this.setData({ schoolIndex: Number(e.detail.value) }) },

  onChooseImage() {
    const remain = SECURITY.MAX_UPLOAD_COUNT - this.data.images.length
    if (remain <= 0) return
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const paths = res.tempFiles
          .filter(f => f.size <= 5 * 1024 * 1024)
          .map(f => f.tempFilePath)
          .filter(isLikelyImagePath)
        if (paths.length < res.tempFiles.length) {
          showToast('已过滤过大或无效图片')
        }
        this.setData({ images: this.data.images.concat(paths).slice(0, SECURITY.MAX_UPLOAD_COUNT) })
      }
    })
  },

  onRemoveImage(e) {
    const { index } = e.currentTarget.dataset
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  parseSizes() {
    return String(this.data.sizesText || '')
      .split(/[,，\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
  },

  onSubmit() {
    const { name, price, intro, images, schoolIndex, schools, isEdit, productId } = this.data
    const safeName = sanitizeName(name)
    const safeIntro = sanitizeText(intro, 1000)
    const numPrice = Number(price)

    if (!safeName) { showToast('请填写商品名称'); return }
    if (!numPrice || numPrice <= 0 || numPrice > 99999) { showToast('请填写合理价格'); return }
    if (!safeIntro) { showToast('请填写描述'); return }
    if (!images.length) { showToast('请上传图片'); return }
    if (schoolIndex < 0 || !schools[schoolIndex]) { showToast('请选择学校'); return }

    const school = schools[schoolIndex]
    const payload = {
      name: safeName,
      price: numPrice,
      originalPrice: numPrice,
      intro: safeIntro,
      images,
      sizes: this.parseSizes().slice(0, 20),
      schoolId: school.id,
      schoolName: school.name,
      sizeGuide: '请按身高体重参考尺码表，不确定可咨询客服。',
      afterSale: '支持换码，质量问题联系客服。'
    }

    withSubmitLock('publish', 2000, () => {
      showLoading(isEdit ? '保存中...' : '提交中...')
      const task = isEdit
        ? publishApi.updateProduct(productId, payload)
        : publishApi.publishProduct(payload)

      return task.then(res => {
        if (res.code === 0) {
          showToast(isEdit ? '保存成功' : '上架成功', 'success')
          setTimeout(() => wx.navigateBack(), 800)
        } else {
          showToast(res.message || '提交失败')
        }
      }).finally(hideLoading)
    })
  }
})
