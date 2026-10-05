const loginApi = require('../../api/login')
const schoolApi = require('../../api/school')
const {
  showToast,
  showLoading,
  isValidIdCard,
  isValidPhone,
  sanitizeName,
  sanitizeText,
  ensureMpFeatures,
  isLoginEnabled,
  featureNotice,
  getMpFeatures
} = require('../../utils/util')

Page({
  data: {
    step: 1,
    countdown: 0,
    schoolIndex: -1,
    schools: [],
    schoolNames: [],
    isSubmitting: false,
    loginMode: 'sms',
    enableSms: true,
    enablePassword: false,
    enableIdCard: true,
    loginSub: '请登录后继续'
  },

  _phone: '',
  _code: '',
  _password: '',
  _idCard: '',
  _childName: '',
  _className: '',
  _returnUrl: '',

  onLoad(options) {
    ensureMpFeatures().then((f) => {
      if (!isLoginEnabled()) {
        showToast(featureNotice('登录功能暂未开放'))
        setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }), 1200)
        return
      }
      this.applyFeatureUi(f || getMpFeatures())
    })
    if (options && options.returnUrl) {
      try {
        this._returnUrl = decodeURIComponent(options.returnUrl)
      } catch (e) {
        this._returnUrl = ''
      }
    }
    schoolApi.getSchoolList().then(res => {
      if (res.code === 0) {
        this.setData({
          schools: res.data || [],
          schoolNames: (res.data || []).map(s => s.name)
        })
      }
    }).catch(() => {})
  },

  applyFeatureUi(f) {
    const enableSms = f.enable_sms !== false
    const enablePassword = !!f.enable_password
    const enableIdCard = f.enable_id_card !== false
    let loginMode = 'sms'
    if (enableSms) loginMode = 'sms'
    else if (enablePassword) loginMode = 'password'

    let loginSub = '请登录后继续'
    if (enableIdCard && enableSms) loginSub = '手机号登录，并校验孩子学籍'
    else if (enableIdCard && enablePassword) loginSub = '手机号密码登录，并校验孩子学籍'
    else if (enableSms) loginSub = '手机号验证码登录'
    else if (enablePassword) loginSub = '手机号密码登录'

    this.setData({ enableSms, enablePassword, enableIdCard, loginMode, loginSub })
  },

  onModeChange(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === 'sms' && !this.data.enableSms) return
    if (mode === 'password' && !this.data.enablePassword) return
    this.setData({ loginMode: mode })
  },

  onPhoneInput(e) {
    this._phone = String(e.detail.value || '').replace(/\D/g, '').slice(0, 11)
  },

  onCodeInput(e) {
    this._code = String(e.detail.value || '').replace(/\D/g, '').slice(0, 6)
  },

  onPasswordInput(e) {
    this._password = String(e.detail.value || '')
  },

  onIdCardInput(e) {
    this._idCard = String(e.detail.value || '').replace(/[^0-9Xx]/g, '').toUpperCase().slice(0, 18)
  },

  onChildNameInput(e) {
    this._childName = e.detail.value || ''
  },

  onClassInput(e) {
    this._className = e.detail.value || ''
  },

  onSchoolChange(e) {
    this.setData({ schoolIndex: Number(e.detail.value) })
  },

  leaveAfterLogin() {
    const returnUrl = this._returnUrl
    setTimeout(() => {
      if (returnUrl && returnUrl.indexOf('/pages/') === 0 && returnUrl.indexOf('/pages/login/') !== 0) {
        if (/^\/pages\/(index|school|profile)\//.test(returnUrl)) {
          wx.switchTab({ url: returnUrl.split('?')[0] })
        } else {
          wx.redirectTo({
            url: returnUrl,
            fail: () => wx.switchTab({ url: '/pages/index/index' })
          })
        }
        return
      }
      wx.switchTab({ url: '/pages/index/index' })
    }, 500)
  },

  onSendCode() {
    if (!this.data.enableSms) {
      showToast('验证码登录暂未开放')
      return
    }
    const phone = this._phone
    if (this.data.countdown > 0) return
    if (!isValidPhone(phone)) {
      showToast('请输入正确的手机号')
      return
    }
    showLoading('发送中...')
    loginApi.sendSmsCode(phone).then(res => {
      if (res.code === 0) {
        showToast('验证码已发送')
        this.startCountdown()
      } else {
        showToast(res.message || '发送失败')
      }
    }).catch(err => {
      showToast((err && err.message) || '发送失败')
    })
  },

  startCountdown() {
    if (this.timer) clearInterval(this.timer)
    this.setData({ countdown: 60 })
    this.timer = setInterval(() => {
      const c = this.data.countdown - 1
      if (c <= 0) {
        clearInterval(this.timer)
        this.timer = null
        this.setData({ countdown: 0 })
      } else {
        this.setData({ countdown: c })
      }
    }, 1000)
  },

  onLogin() {
    if (this.data.isSubmitting) return

    const phone = this._phone
    const code = this._code
    const password = this._password
    const idCard = (this._idCard || '').trim().toUpperCase()
    const { loginMode, enableSms, enablePassword, enableIdCard } = this.data

    if (!isValidPhone(phone)) {
      showToast('请输入正确的手机号')
      return
    }

    if (loginMode === 'sms') {
      if (!enableSms) {
        showToast('验证码登录暂未开放')
        return
      }
      if (!code) {
        showToast('请输入验证码')
        return
      }
    } else {
      if (!enablePassword) {
        showToast('密码登录暂未开放')
        return
      }
      if (!password || password.length < 6) {
        showToast('请输入至少6位密码')
        return
      }
    }

    if (enableIdCard && !isValidIdCard(idCard)) {
      showToast('请输入正确的身份证号')
      return
    }

    this.setData({ isSubmitting: true })
    showLoading('登录中...')

    const req = loginMode === 'password'
      ? loginApi.loginByPassword(phone, password, enableIdCard ? idCard : '')
      : loginApi.loginByPhone(phone, code, enableIdCard ? idCard : '')

    req.then(res => {
      if (!res || res.code !== 0) {
        showToast((res && res.message) || '登录失败')
        return
      }
      if (res.data && res.data.isFirstLogin) {
        this.setData({ step: 2 })
        showToast('请完善学校与年级')
      } else {
        this._phone = ''
        this._code = ''
        this._password = ''
        this._idCard = ''
        showToast('登录成功', 'success')
        this.leaveAfterLogin()
      }
    }).catch(err => {
      showToast((err && err.message) || '网络超时，请稍后重试')
    }).finally(() => {
      this.setData({ isSubmitting: false })
    })
  },

  onCompleteProfile() {
    if (this.data.isSubmitting) return

    const name = sanitizeName(this._childName)
    const grade = sanitizeText(this._className, 20)
    const idCard = (this._idCard || '').trim().toUpperCase()
    const { schoolIndex, schools, enableIdCard } = this.data

    if (!name) {
      showToast('请输入孩子姓名')
      return
    }
    if (schoolIndex < 0 || !schools[schoolIndex]) {
      showToast('请选择学校')
      return
    }
    if (!grade) {
      showToast('请输入年级')
      return
    }
    if (enableIdCard && idCard && !isValidIdCard(idCard)) {
      showToast('身份证信息异常，请返回重新登录')
      return
    }

    const school = schools[schoolIndex]
    this.setData({ isSubmitting: true })
    showLoading('提交中...')

    const payload = {
      childName: name,
      schoolId: school.id,
      className: grade,
      nickname: name + '家长'
    }
    if (enableIdCard && idCard) payload.idCard = idCard

    loginApi.completeProfile(payload).then(res => {
      if (res.code === 0) {
        this._idCard = ''
        this._code = ''
        this._phone = ''
        this._password = ''
        showToast('信息完善成功', 'success')
        this.leaveAfterLogin()
      } else {
        showToast(res.message || '提交失败')
      }
    }).catch(err => {
      showToast((err && err.message) || '提交失败')
    }).finally(() => {
      this.setData({ isSubmitting: false })
    })
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
  }
})
