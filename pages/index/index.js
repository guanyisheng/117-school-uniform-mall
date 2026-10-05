const bannerApi = require('../../api/banner')
const productApi = require('../../api/product')
const categoryApi = require('../../api/category')
const { showLoading, hideLoading, showToast } = require('../../utils/util')
const { setTabBarSelected } = require('../../utils/tabBar')

const FILTER_LABELS = {
  spring_summer: '春夏装',
  autumn_winter: '秋冬装',
  new: '新品'
}

const CATEGORY_KEYWORDS = {
  spring_summer: ['春夏', '夏装', '短袖'],
  autumn_winter: ['秋冬', '冬装', '长袖', '棉']
}

Page({
  data: {
    pageHeight: 600,
    heroHeight: 500,
    menuBarHeight: 100,
    panelIndex: 0,
    banners: [],
    current: 0,
    products: [],
    productsLoading: true,
    filterLabel: '',
    filterKey: '',
    quickEntries: [
      { id: 'spring_summer', name: '春夏装', icon: 'shirt' },
      { id: 'autumn_winter', name: '秋冬装', icon: 'coat' },
      { id: 'new', name: '新品', icon: 'tag' },
      { id: 'service', name: '售后', icon: 'service' }
    ],
    loading: true
  },

  _categories: null,

  onShow() {
    const app = getApp()
    const panelIndex = app.globalData.homePanelIndex === 1 ? 1 : 0
    setTabBarSelected(this, 0)
    this.setData({ panelIndex })
    if (panelIndex === 0) {
      this.startAutoplay()
    } else {
      this.stopAutoplay()
      this.applyPendingFilter()
    }
  },

  onHide() {
    this.stopAutoplay()
  },

  onUnload() {
    this.stopAutoplay()
  },

  onLoad() {
    this.calcLayout()
    this.loadData()
  },

  calcLayout() {
    const sys = wx.getSystemInfoSync()
    const rpx = sys.windowWidth / 750
    const safeBottom = sys.screenHeight - (sys.safeArea ? sys.safeArea.bottom : sys.screenHeight)
    const tabBarPx = Math.round(100 * rpx + safeBottom)
    const menuBarPx = Math.round(260 * rpx)
    const pageHeight = sys.windowHeight
    const heroHeight = pageHeight - tabBarPx - menuBarPx

    this.setData({
      pageHeight,
      heroHeight,
      menuBarHeight: menuBarPx
    })
  },

  ensureCategories() {
    if (this._categories) return Promise.resolve(this._categories)
    return categoryApi.getCategoryList().then(res => {
      this._categories = res.code === 0 ? (res.data || []) : []
      return this._categories
    }).catch(() => {
      this._categories = []
      return this._categories
    })
  },

  resolveCategoryId(slug) {
    const keywords = CATEGORY_KEYWORDS[slug] || []
    if (!keywords.length) return null
    const list = this._categories || []
    const hit = list.find(c => keywords.some(k => String(c.name || '').indexOf(k) !== -1))
    return hit ? hit.id : null
  },

  filterByCategorySlug(list, slug) {
    const keywords = CATEGORY_KEYWORDS[slug] || []
    if (!keywords.length) return list
    return list.filter(p => {
      const text = `${p.category || ''}${p.name || ''}`
      return keywords.some(k => text.indexOf(k) !== -1)
    })
  },

  loadData() {
    showLoading()
    return Promise.all([
      bannerApi.getBannerList(),
      productApi.getProductList(),
      this.ensureCategories()
    ]).then(([bannerRes, productRes]) => {
      hideLoading()
      if (bannerRes.code === 0) {
        this.setData({ banners: bannerRes.data, current: 0 }, () => {
          if (this.data.panelIndex === 0) this.startAutoplay()
        })
      }
      if (productRes.code === 0) {
        this.setData({
          products: productRes.data.list,
          filterKey: '{}',
          productsLoading: false
        })
      }
    }).catch(() => {
      showToast('加载失败')
    }).finally(() => {
      this.setData({ loading: false, productsLoading: false })
    })
  },

  onPanelChange(e) {
    const panelIndex = e.detail.current
    const app = getApp()
    app.globalData.homePanelIndex = panelIndex
    setTabBarSelected(this, 0)
    this.setData({ panelIndex })

    if (panelIndex === 0) {
      this.startAutoplay()
    } else {
      this.stopAutoplay()
      this.applyPendingFilter()
    }
  },

  getCurrentFilter() {
    const app = getApp()
    return (app && app.globalData.productFilter) || {}
  },

  applyPendingFilter() {
    const filter = this.getCurrentFilter()
    const filterKey = JSON.stringify(filter || {})
    if (filterKey === this.data.filterKey && this.data.products.length) return
    this.loadProducts(filter)
  },

  loadProducts(filter) {
    filter = filter || {}
    let filterLabel = ''
    if (filter.isNew) filterLabel = FILTER_LABELS.new
    else if (filter.category) filterLabel = FILTER_LABELS[filter.category] || ''

    this.setData({ productsLoading: true })
    return this.ensureCategories().then(() => {
      const params = {}
      if (filter.isNew) params.isNew = true
      if (filter.category) {
        const categoryId = this.resolveCategoryId(filter.category)
        if (categoryId) params.categoryId = categoryId
      }
      return productApi.getProductList(params).then(res => {
        if (res.code !== 0) {
          showToast(res.message || '加载失败')
          return
        }
        let list = res.data.list || []
        // 分类库无匹配时，按名称做本地兜底筛选
        if (filter.category && !params.categoryId) {
          list = this.filterByCategorySlug(list, filter.category)
        }
        this.setData({
          products: list,
          filterLabel,
          filterKey: JSON.stringify(filter)
        })
      })
    }).catch(() => showToast('加载失败')).finally(() => {
      this.setData({ productsLoading: false })
    })
  },

  onReset() {
    const app = getApp()
    if (app) app.globalData.productFilter = null
    this.loadProducts({})
  },

  goToProductsPanel(filter) {
    const app = getApp()
    app.globalData.productFilter = filter
    app.globalData.homePanelIndex = 1
    setTabBarSelected(this, 0)
    this.setData({ panelIndex: 1 })
    this.stopAutoplay()
    this.loadProducts(filter)
  },

  onQuickEntry(e) {
    const { id } = e.currentTarget.dataset
    if (id === 'service') {
      wx.showModal({
        title: '售后说明',
        content: '电话：13312542331\n周一至周五 9:00-18:00',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#1565FF'
      })
      return
    }

    if (id === 'new') {
      this.goToProductsPanel({ isNew: true })
    } else {
      this.goToProductsPanel({ category: id })
    }
  },

  startAutoplay() {
    this.stopAutoplay()
    const { banners } = this.data
    if (!banners || banners.length <= 1) return
    this._autoplayTimer = setInterval(() => {
      const next = (this.data.current + 1) % banners.length
      this.setData({ current: next })
    }, 3000)
  },

  stopAutoplay() {
    if (this._autoplayTimer) {
      clearInterval(this._autoplayTimer)
      this._autoplayTimer = null
    }
  },

  onDotTap(e) {
    const { index } = e.currentTarget.dataset
    if (index === this.data.current) return
    this.setData({ current: index })
    this.startAutoplay()
  }
})
