Component({
  properties: {
    name: {
      type: String,
      value: ''
    },
    active: {
      type: Boolean,
      value: false
    },
    size: {
      type: Number,
      value: 40
    }
  },

  data: {
    src: ''
  },

  observers: {
    'name, active'(name, active) {
      if (!name) return
      const file = active && name !== 'arrow' ? `${name}-active` : name
      this.setData({ src: `/images/icons/${file}.svg` })
    }
  }
})
