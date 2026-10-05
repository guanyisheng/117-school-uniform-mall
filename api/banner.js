const { request } = require('./request')
const { PATHS } = require('./config')
const { mapBanner } = require('../utils/apiAdapter')

function getBannerList() {
  return request({ url: PATHS.banners, auth: false }).then(res => {
    if (res.code !== 0) return res
    return {
      ...res,
      data: (res.data || []).map(mapBanner)
    }
  })
}

module.exports = {
  getBannerList
}
