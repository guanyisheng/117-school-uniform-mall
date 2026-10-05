# 117 校服商城

云南壹壹柒制衣有限公司校服在线服务微信小程序。家长可按学校浏览正装/运动装等校服商品，完成登录、加购、下单与订单管理。

本仓库以 **MIT License** 开源，版权归 **云南壹壹柒制衣有限公司（2026）** 所有，详见 [LICENSE](LICENSE)。

## 功能概览

- **按学校选购**：学校分类与学校商品列表，覆盖校服目录浏览、详情、尺码与收藏
- **账号与资料**：手机号登录、完善学生信息、收货地址管理
- **购物闭环**：购物车、确认订单、订单列表与订单详情
- **个人中心**：资料、收藏、客服、关于 117、意见反馈
- **运营能力**：商品发布与管理（需后台授予相应角色）
- **云控开关**：管理后台可远程控制小程序能力开关，包括 `login`、`sms`、`password`、`id_card`、`shopping`、`pay`

## 技术说明

- 运行环境：微信小程序（见 `app.json` 窗口标题「117 校服商城」）
- 接口配置：`api/config.js`（默认 `https://api.117uniform.store`）
- 请求封装：`api/` 目录；字段适配见 `utils/apiAdapter.js`
- 前后端对齐说明：[`docs/FRONTEND_BACKEND_MATCH.md`](docs/FRONTEND_BACKEND_MATCH.md)

登录、购物、支付以及短信、密码、身份证相关校验，均可由管理端「小程序开关」统一配置，无需改客户端代码即可调整上线策略。

## 本地运行

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入本项目目录
3. 填写小程序 AppID（或使用测试号）
4. 在「详情 → 本地设置」中配置合法请求域名（开发阶段可按工具提示处理域名校验）
5. 编译预览

修改后端地址时，只改 `api/config.js` 中的 `BASE_URL` / `PATHS`。

## 项目结构

```
117-school-uniform-mall/
├── api/                  # 接口封装与配置
├── pages/                # 页面
│   ├── index/            # 首页
│   ├── school/           # 学校分类
│   ├── school-products/  # 学校商品
│   ├── product-detail/   # 商品详情
│   ├── login/            # 登录
│   ├── cart/             # 购物车
│   ├── order-confirm/    # 确认订单
│   ├── order-list/       # 订单列表
│   ├── order-detail/     # 订单详情
│   ├── profile/          # 我的
│   ├── address/          # 地址
│   └── ...
├── components/           # 公共组件
├── custom-tab-bar/       # 自定义 TabBar
├── utils/                # 工具与适配
└── docs/                 # 对接说明
```

## 页面对照

| 页面 | 功能 |
|------|------|
| 首页 | 轮播、快捷入口、商品推荐 |
| 学校 | 按学校浏览校服目录 |
| 商品详情 | 介绍、尺码、收藏、预订 |
| 登录 | 账号登录与学生信息 |
| 购物车 / 订单 | 加购、结算、订单查询 |
| 我的 | 地址、收藏、关于、反馈 |

## 许可证

MIT License © 2026 云南壹壹柒制衣有限公司
