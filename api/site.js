const { request } = require('./request')
const { PATHS } = require('./config')

function getAbout() {
  return request({ url: PATHS.siteAbout, auth: false })
}

function getContact() {
  return request({ url: PATHS.siteContact, auth: false })
}

module.exports = {
  getAbout,
  getContact
}
