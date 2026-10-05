const { request } = require('./request')
const { PATHS } = require('./config')
const { mapUser, mapAddress, mapProduct, toSnakePayload } = require('../utils/apiAdapter')

function getUserInfo() {
  return request({ url: PATHS.userInfo }).then(res => {
    if (res.code !== 0) return res
    const userInfo = mapUser(res.data)
    wx.setStorageSync('userInfo', userInfo)
    const app = getApp()
    if (app) app.setUserInfo(userInfo)
    return { ...res, data: userInfo }
  })
}

function updateUserInfo(data) {
  return request({
    url: PATHS.userInfo,
    method: 'PUT',
    data: toSnakePayload(data)
  }).then(res => {
    if (res.code !== 0) return res
    const userInfo = mapUser(res.data)
    wx.setStorageSync('userInfo', userInfo)
    return { ...res, data: userInfo }
  })
}

function getAddressList() {
  return request({ url: PATHS.userAddresses }).then(res => {
    if (res.code !== 0) return res
    return {
      ...res,
      data: (res.data || []).map(mapAddress)
    }
  })
}

function addAddress(data) {
  return request({
    url: PATHS.userAddresses,
    method: 'POST',
    data: toSnakePayload(data)
  }).then(res => {
    if (res.code !== 0) return res
    return { ...res, data: mapAddress(res.data) }
  })
}

function updateAddress(id, data) {
  return request({
    url: PATHS.userAddressDetail(id),
    method: 'PUT',
    data: toSnakePayload(data)
  }).then(res => {
    if (res.code !== 0) return res
    return { ...res, data: mapAddress(res.data) }
  })
}

function deleteAddress(id) {
  return request({ url: PATHS.userAddressDetail(id), method: 'DELETE' })
}

function getFavoriteList() {
  return request({ url: PATHS.userFavorites }).then(res => {
    if (res.code !== 0) return res
    const list = Array.isArray(res.data)
      ? res.data.map(item => mapProduct({
          ...item,
          id: item.product_id || item.productId || item.id,
          cover_image: item.cover_image || item.coverImage,
          name: item.name
        }))
      : []
    return { ...res, data: list }
  })
}

function toggleFavorite(productId) {
  return request({
    url: PATHS.userFavoriteDetail(productId),
    method: 'POST'
  }).then(res => {
    if (res.code !== 0) return res
    const fav = res.data || {}
    const isFavorite = fav.is_favorite != null ? !!fav.is_favorite : !!fav.isFavorite
    return { ...res, data: { isFavorite } }
  })
}

function checkFavorite(productId) {
  return getFavoriteList().then(res => {
    if (res.code !== 0) return false
    return (res.data || []).some(p => String(p.id) === String(productId))
  })
}

function submitFeedback(data) {
  return request({ url: PATHS.userFeedback, method: 'POST', data })
}

module.exports = {
  getUserInfo,
  updateUserInfo,
  getAddressList,
  addAddress,
  updateAddress,
  deleteAddress,
  getFavoriteList,
  toggleFavorite,
  checkFavorite,
  submitFeedback
}
