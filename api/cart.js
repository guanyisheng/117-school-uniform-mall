const { request } = require('./request')
const { PATHS } = require('./config')
const { mapCartItem, toSnakePayload } = require('../utils/apiAdapter')

function getCartList() {
  return request({ url: PATHS.cart }).then(res => {
    if (res.code !== 0) return res
    const list = (res.data.list || res.data || []).map(mapCartItem)
    return { ...res, data: list }
  })
}

function addToCart(data) {
  return request({
    url: PATHS.cart,
    method: 'POST',
    data: toSnakePayload(data)
  }).then(res => {
    if (res.code !== 0) return res
    return { ...res, data: mapCartItem(res.data) }
  })
}

function updateCartItem(id, data) {
  return request({
    url: PATHS.cartItem(id),
    method: 'PUT',
    data: toSnakePayload(data)
  }).then(res => {
    if (res.code !== 0) return res
    return { ...res, data: mapCartItem(res.data) }
  })
}

function removeCartItem(id) {
  return request({ url: PATHS.cartItem(id), method: 'DELETE' })
}

function clearCart() {
  return request({ url: PATHS.cartClear, method: 'POST' })
}

module.exports = {
  getCartList,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
}
