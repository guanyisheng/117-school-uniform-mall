const { request, uploadFile } = require('./request')
const { PATHS } = require('./config')
const { mapProduct } = require('../utils/apiAdapter')

function uploadImages(paths) {
  const remote = []
  const local = []
  ;(paths || []).forEach(p => {
    if (/^https?:\/\//.test(p)) remote.push(p)
    else local.push(p)
  })

  return local
    .reduce(
      (chain, filePath) =>
        chain.then(urls =>
          uploadFile(filePath).then(res => {
            if (res.code !== 0) {
              return Promise.reject(new Error(res.message || '图片上传失败'))
            }
            const url = (res.data && (res.data.url || res.data)) || ''
            return urls.concat(url)
          })
        ),
      Promise.resolve([])
    )
    .then(uploaded => remote.concat(uploaded))
}

/**
 * 对齐后端 publishProduct / updateProduct：
 * cover_image, description, school_id, sizes, images[]
 */
function buildProductBody(data, images) {
  const cover = (images && images[0]) || data.coverImage || ''
  return {
    name: data.name,
    price: data.price,
    school_id: Number(data.schoolId) || data.schoolId,
    category_id: data.categoryId ? Number(data.categoryId) : undefined,
    description: data.intro || data.description || '',
    cover_image: cover,
    images: images || [],
    sizes: data.sizes || [],
    stock: data.stock != null ? data.stock : 999
  }
}

function publishProduct(data) {
  const paths = data.images || []
  return uploadImages(paths)
    .then(images =>
      request({
        url: PATHS.products,
        method: 'POST',
        data: buildProductBody(data, images)
      })
    )
    .then(res => {
      if (res.code !== 0) return res
      return { ...res, data: mapProduct(res.data) }
    })
    .catch(err => ({
      code: 500,
      message: err.message || '提交失败',
      data: null
    }))
}

function updateProduct(productId, data) {
  const paths = data.images || []
  return uploadImages(paths)
    .then(images =>
      request({
        url: PATHS.productDetail(productId),
        method: 'PUT',
        data: buildProductBody(data, images)
      })
    )
    .then(res => {
      if (res.code !== 0) return res
      return { ...res, data: mapProduct(res.data) }
    })
    .catch(err => ({
      code: 500,
      message: err.message || '保存失败',
      data: null
    }))
}

module.exports = { publishProduct, updateProduct, uploadImages }
