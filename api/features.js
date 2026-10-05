const { request } = require('./request')
const { PATHS } = require('./config')

const DEFAULT_FEATURES = {
  enable_login: true,
  enable_shopping: true,
  enable_pay: true,
  enable_sms: true,
  enable_id_card: true,
  enable_password: false,
  notice: ''
}

function normalize(raw) {
  const d = raw || {}
  return {
    enable_login: d.enable_login !== false && d.enableLogin !== false,
    enable_shopping: d.enable_shopping !== false && d.enableShopping !== false,
    enable_pay: d.enable_pay !== false && d.enablePay !== false,
    enable_sms: d.enable_sms !== false && d.enableSms !== false,
    enable_id_card: d.enable_id_card !== false && d.enableIdCard !== false,
    enable_password: !!(d.enable_password || d.enablePassword),
    notice: d.notice || ''
  }
}

function getFeatures() {
  return request({ url: PATHS.siteFeatures, auth: false })
    .then(res => {
      if (res.code !== 0) return { ...DEFAULT_FEATURES }
      return normalize(res.data)
    })
    .catch(() => ({ ...DEFAULT_FEATURES }))
}

module.exports = {
  getFeatures,
  DEFAULT_FEATURES,
  normalize
}
