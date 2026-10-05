const { request } = require('./request')
const { PATHS } = require('./config')
const { mapSchool } = require('../utils/apiAdapter')

function getSchoolList() {
  return request({ url: PATHS.schools, auth: false }).then(res => {
    if (res.code !== 0) return res
    return {
      ...res,
      data: (res.data || []).map(mapSchool)
    }
  })
}

function getSchoolDetail(schoolId) {
  return request({ url: PATHS.schoolDetail(schoolId), auth: false })
    .then(res => {
      if (res.code !== 0) return res
      return { ...res, data: mapSchool(res.data) }
    })
    .catch(() =>
      getSchoolList().then(res => {
        if (res.code !== 0) return res
        const school = (res.data || []).find(s => String(s.id) === String(schoolId))
        return {
          code: school ? 0 : 404,
          message: school ? 'success' : '学校不存在',
          data: school || null
        }
      })
    )
}

module.exports = {
  getSchoolList,
  getSchoolDetail
}
