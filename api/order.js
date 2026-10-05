const { request, resourcePath } = require('./request')
const { PATHS, SECURITY } = require('./config')
const { mapOrder, mapPayParams, toSnakePayload, toQueryParams } = require('../utils/apiAdapter')
const { requestWechatPay, handlePayError } = require('../utils/pay')
const { isSafeId } = require('../utils/security')

function createOrder(data) {
  return request({
    url: PATHS.orders,
    method: 'POST',
    data: toSnakePayload(data)
  }).then(res => {
    if (res.code !== 0) return res
    return { ...res, data: mapOrder(res.data) }
  })
}

function getOrderList(params = {}) {
  return request({
    url: PATHS.orders,
    data: toQueryParams(params)
  }).then(res => {
    if (res.code !== 0) return res
    const list = (res.data.list || res.data || []).map(mapOrder)
    return {
      ...res,
      data: {
        list,
        total: res.data.total != null ? res.data.total : list.length
      }
    }
  })
}

function getOrderDetail(orderId) {
  if (!isSafeId(orderId)) {
    return Promise.resolve({ code: 400, message: '无效订单', data: null })
  }
  return request({ url: resourcePath(PATHS.orderDetail, orderId) }).then(res => {
    if (res.code !== 0) return res
    return { ...res, data: mapOrder(res.data) }
  })
}

function cancelOrder(orderId, reason) {
  if (!isSafeId(orderId)) {
    return Promise.resolve({ code: 400, message: '无效订单', data: null })
  }
  return request({
    url: resourcePath(PATHS.orderCancel, orderId),
    method: 'POST',
    data: reason ? { reason: String(reason).slice(0, 200) } : {}
  }).then(res => {
    if (res.code !== 0) return res
    return { ...res, data: mapOrder(res.data) }
  })
}

function refundOrder(orderId, reason) {
  if (!isSafeId(orderId)) {
    return Promise.resolve({ code: 400, message: '无效订单', data: null })
  }
  return request({
    url: resourcePath(PATHS.orderRefund, orderId),
    method: 'POST',
    data: { reason: String(reason || '').slice(0, 200) }
  }).then(res => {
    if (res.code !== 0) return res
    return { ...res, data: mapOrder(res.data) }
  })
}

function prepayOrder(orderId) {
  if (!isSafeId(orderId)) {
    return Promise.resolve({ code: 400, message: '无效订单', data: null })
  }
  return request({
    url: resourcePath(PATHS.orderPrepay, orderId),
    method: 'POST'
  }).then(res => {
    if (res.code !== 0) return res
    return {
      ...res,
      data: {
        order: res.data && res.data.order ? mapOrder(res.data.order) : null,
        payParams: mapPayParams(res.data)
      }
    }
  })
}

function ensureWxBound() {
  const loginApi = require('./login')
  const user = wx.getStorageSync('userInfo') || {}
  if (user.needWxBind === false) {
    return Promise.resolve()
  }
  return loginApi.bindWechat().catch(err => {
    // 开发环境可继续走模拟支付；正式环境 prepay 会再报错
    if (SECURITY.ALLOW_MOCK_PAY) return null
    return Promise.reject(err)
  })
}

/**
 * 绑定 openid → 预下单 → wx.requestPayment
 * HTTP 开发环境 prepay 失败时可回退 /pay
 */
function payOrderWithWechat(orderId) {
  return ensureWxBound()
    .then(() => prepayOrder(orderId))
    .then(res => {
      if (res.code !== 0) {
        const needBind = (res.message || '').indexOf('openid') !== -1 || (res.message || '').indexOf('wx-bind') !== -1
        if (needBind && !SECURITY.ALLOW_MOCK_PAY) {
          return Promise.reject(new Error(res.message || '请先绑定微信后再支付'))
        }
        if (!SECURITY.ALLOW_MOCK_PAY) {
          return Promise.reject(new Error(res.message || '预下单失败，请稍后重试'))
        }
        return request({
          url: resourcePath(PATHS.orderPay, orderId),
          method: 'POST'
        }).then(legacy => {
          if (legacy.code !== 0) {
            return Promise.reject(new Error(res.message || legacy.message || '预下单失败'))
          }
          const orderRaw = legacy.data && legacy.data.order ? legacy.data.order : legacy.data
          return { code: 0, data: { order: mapOrder(orderRaw), mock: true } }
        })
      }
      return requestWechatPay(res.data.payParams).then(() => ({
        code: 0,
        data: { order: res.data.order, mock: false }
      }))
    })
    .catch(err => {
      if (err && err.code === 'USER_CANCEL') {
        return { code: 'USER_CANCEL', message: '用户取消支付', data: null }
      }
      return Promise.reject(err)
    })
}

function payOrder(orderId) {
  return payOrderWithWechat(orderId)
}

module.exports = {
  createOrder,
  getOrderList,
  getOrderDetail,
  cancelOrder,
  refundOrder,
  prepayOrder,
  payOrderWithWechat,
  payOrder,
  handlePayError
}
