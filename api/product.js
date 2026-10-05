const { request } = require('./request')
const { PATHS } = require('./config')
const { mapProduct, toQueryParams } = require('../utils/apiAdapter')

function getProductList(params = {}) {
  return request({ url: PATHS.products, data: toQueryParams(params), auth: false }).then(res => {
    if (res.code !== 0) return res
    const list = (res.data.list || res.data || []).map(mapProduct)
    // 列表常不带 cover/images：缺封面时补拉详情，否则预览页空白
    const needCover = list.filter(p => p && p.id && !p.cover)
    if (!needCover.length) {
      return {
        ...res,
        data: {
          list,
          total: res.data.total != null ? res.data.total : list.length
        }
      }
    }
    return Promise.all(
      needCover.map(p =>
        getProductDetail(p.id)
          .then(detail => {
            if (detail.code === 0 && detail.data) {
              p.cover = detail.data.cover || (detail.data.images && detail.data.images[0]) || ''
              p.images = detail.data.images || []
              p.detailImages = detail.data.detailImages || p.images
            }
            return p
          })
          .catch(() => p)
      )
    ).then(() => ({
      ...res,
      data: {
        list,
        total: res.data.total != null ? res.data.total : list.length
      }
    }))
  })
}

function getProductDetail(productId) {
  return request({ url: PATHS.productDetail(productId), auth: false }).then(res => {
    if (res.code !== 0) return res
    return { ...res, data: mapProduct(res.data) }
  })
}

/** 管理员商品列表 */
function getAdminProductList(params = {}) {
  return request({ url: PATHS.adminProducts, data: toQueryParams(params) }).then(res => {
    if (res.code !== 0) return res
    const list = (res.data.list || res.data || []).map(mapProduct)
    return {
      ...res,
      data: {
        list,
        total: res.data.total != null ? res.data.total : list.length
      }
    }
  })
}

function updateProduct(productId, data) {
  return request({
    url: PATHS.productDetail(productId),
    method: 'PUT',
    data
  }).then(res => {
    if (res.code !== 0) return res
    return { ...res, data: mapProduct(res.data) }
  })
}

function offShelfProduct(productId) {
  return request({
    url: PATHS.productOffShelf(productId),
    method: 'POST'
  }).then(res => {
    if (res.code !== 0) return res
    return { ...res, data: res.data ? mapProduct(res.data) : null }
  })
}

function deleteProduct(productId) {
  return request({
    url: PATHS.productDetail(productId),
    method: 'DELETE'
  })
}

module.exports = {
  getProductList,
  getProductDetail,
  getAdminProductList,
  updateProduct,
  offShelfProduct,
  deleteProduct
}
