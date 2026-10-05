const siteApi = require('../../api/site')

Page({
  data: {
    company: '云南壹壹柒制衣有限公司',
    version: '1.0.0',
    phone: '13312542331',
    address: '云南省昆明市五华区',
    workTime: '周一至周五 9:00-18:00',
    logoMeaning:
      '深蓝圆标代表中国国学智慧和流通，宁静致远，契合教育理念；金色呼应校服的品质感和荣誉感；金色丝带代表有祖国教育的托举、学子们未来一路顺畅。',
    intro:
      '云南壹壹柒制衣有限公司扎根云南本土，是集原创设计、开发、生产、销售、全流程服务于一体的综合型制衣企业。已取得 ISO9001 质量管理体系认证、AAA 信誉等级认证、环境管理体系认证。团队 60 余名专职、兼职从业人员，年服装产能超 9 万件，为省内二十余所幼儿园、中小学、高校及多家政企单位定制校服、工装。',
    sections: [
      {
        title: '品牌缘起',
        content:
          '品牌名「117」藏着三层经营初心：第一个「1」代表立身，第二个「1」代表立志，「7」代表谦卑。立身，坚守衣物品质底线；立志，依托服装传递正向精气神；7 为谦卑自省，始终倾听学生与企事业单位真实需求。公司初创于 2010 年 6 月，从版型剪裁、车缝走线到纽扣辅料，每一处细节都手工把控，赋予衣物温度与人情。'
      },
      {
        title: '全场景业务覆盖',
        content:
          '服务人群跨度 3 岁幼儿至职场从业人员。校园品类包含幼儿园园服、中小学生校服（均具备安全反光标识）、运动套装、军训服；政企工装涵盖写字楼工作服、车间劳保工装、反光安全工装；同步配套床上用品、餐具等，一站式满足校园、单位集体采购需求。'
      },
      {
        title: '标准化全链路服务',
        content:
          '搭建专属智能体型管理系统，建立客户独立档案，高矮胖瘦均可匹配合身服饰。售前一对一需求沟通、现场量体；生产全程进度精细跟进；交付后售后问题快速响应。'
      },
      {
        title: '品牌核心文化',
        content:
          '核心理念：一针一线织就成长底色，一裁一缝赋能职业光芒。\n\n立身——坚守品质底线，采用合规可溯源面料，保障衣物安全、舒适、耐穿。\n\n立志——传递正向精神，引导青少年不攀比、重内在，塑造阳光向上的成长价值观。\n\n弯得下腰——保持谦卑初心，主动下沉对接客户需求，用专业、贴心的服务陪伴成长与奋斗。'
      },
      {
        title: '品牌愿景',
        content:
          '深耕西南本土，以服饰为载体，让校服记录少年青春成长，让工装见证职场奋斗高光。做西南地区兼具专业硬实力与人文温度的长期服饰合作伙伴。'
      }
    ],
    features: [
      '专业校服定制与生产',
      '与多所学校、企事业单位合作',
      '品质保障，售后无忧',
      '7天无理由退换货',
      '在线预订，方便快捷'
    ],
    serviceScope: '全云南省 · 昆明市和各地州县级城市'
  },

  onLoad() {
    siteApi.getContact().then(res => {
      if (res.code !== 0 || !res.data) return
      const d = res.data
      this.setData({
        phone: d.phone || this.data.phone,
        workTime: d.workTime || d.work_time || this.data.workTime
      })
    }).catch(() => {})

    siteApi.getAbout().then(res => {
      if (res.code !== 0 || !res.data) return
      const d = res.data
      const patch = {}
      if (d.intro || d.description) patch.intro = d.intro || d.description
      if (d.company || d.name) patch.company = d.company || d.name
      if (Array.isArray(d.sections) && d.sections.length) patch.sections = d.sections
      if (Array.isArray(d.features) && d.features.length) patch.features = d.features
      if (Object.keys(patch).length) this.setData(patch)
    }).catch(() => {})
  },

  onCall() {
    wx.makePhoneCall({ phoneNumber: this.data.phone })
  }
})
