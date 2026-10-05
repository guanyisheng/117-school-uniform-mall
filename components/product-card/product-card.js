const { formatPrice } = require('../../utils/util')

Component({
  properties: {
    product: {
      type: Object,
      value: {}
    }
  },

  data: {
    priceText: '0.00'
  },

  observers: {
    product(val) {
      if (val && val.price !== undefined) {
        const n = Number(val.price)
        this.setData({ priceText: n ? `¥${formatPrice(n)}` : '面议' })
      }
    }
  },

  methods: {
    onDetail() {
      const { id } = this.data.product
      if (id) {
        wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` })
      }
    }
  }
})
