/**
 * 微信支付封装
 * 后端 prepay 接口需返回微信 JSAPI 调起参数
 */
const { showToast } = require('./util')

const ALLOWED_SIGN_TYPES = { RSA: 1, MD5: 1, HMAC_SHA256: 1 }

/**
 * @param {object} payParams
 * @param {string} payParams.timeStamp
 * @param {string} payParams.nonceStr
 * @param {string} payParams.package  形如 prepay_id=xxx
 * @param {string} [payParams.signType]  默认 RSA（V3）或 MD5（V2）
 * @param {string} payParams.paySign
 */
function requestWechatPay(payParams) {
  if (!payParams || !payParams.timeStamp || !payParams.nonceStr || !payParams.package || !payParams.paySign) {
    return Promise.reject(new Error('支付参数不完整，请检查后端 prepay 接口'))
  }

  const pkg = String(payParams.package)
  if (pkg.indexOf('prepay_id=') !== 0) {
    return Promise.reject(new Error('支付 package 非法'))
  }

  const signType = String(payParams.signType || 'RSA')
  if (!ALLOWED_SIGN_TYPES[signType]) {
    return Promise.reject(new Error('不支持的支付签名类型'))
  }

  return new Promise((resolve, reject) => {
    wx.requestPayment({
      timeStamp: String(payParams.timeStamp),
      nonceStr: String(payParams.nonceStr),
      package: pkg,
      signType,
      paySign: String(payParams.paySign),
      success(res) {
        resolve(res)
      },
      fail(err) {
        if (err && (err.errMsg || '').indexOf('cancel') !== -1) {
          const cancelErr = new Error('用户取消支付')
          cancelErr.code = 'USER_CANCEL'
          reject(cancelErr)
          return
        }
        reject(new Error('支付未完成'))
      }
    })
  })
}

function handlePayError(err) {
  if (err && err.code === 'USER_CANCEL') {
    showToast('已取消支付')
    return
  }
  showToast((err && err.message) || '支付失败')
}

module.exports = {
  requestWechatPay,
  handlePayError
}
