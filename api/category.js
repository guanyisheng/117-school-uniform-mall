const { request } = require('./request')
const { PATHS } = require('./config')

function getCategoryList() {
  return request({ url: PATHS.categories, auth: false }).then(res => {
    if (res.code !== 0) return res
    const list = (res.data || []).map(c => ({
      id: c.id,
      name: c.name || '',
      sortOrder: c.sort_order != null ? c.sort_order : c.sortOrder
    }))
    return { ...res, data: list }
  })
}

module.exports = {
  getCategoryList
}
