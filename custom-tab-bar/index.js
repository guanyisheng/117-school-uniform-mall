Component({
  data: {
    selected: 0,
    color: '#999999',
    selectedColor: '#1565FF',
    list: [
      { pagePath: '/pages/index/index', text: '首页', icon: 'home' },
      { pagePath: '/pages/school/school', text: '学校', icon: 'school' },
      { pagePath: '/pages/profile/profile', text: '我的', icon: 'profile' }
    ]
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index
      const item = this.data.list[index]

      if (index === 0) {
        getApp().globalData.homePanelIndex = 0
      }

      wx.switchTab({ url: item.pagePath })
      this.setData({ selected: index })
    }
  }
})
