# 小程序 ↔ uniform-system-117 对接说明

后端仓库：`uniform-system-117/`（Express + MySQL）  
前端配置：`api/config.js`

## 已对齐项

| 能力 | 前端 | 后端 |
|------|------|------|
| 登录 | `POST /api/login/phone` | 手机号+验证码+身份证 → 学籍库 |
| 用户 | `GET/PUT /api/user/info` | 含 `role` / `school_name` |
| 微信绑定 | 支付前 `POST /api/user/wx-bind` | `wx.login` code 换 openid |
| 商品 | `cover_image` / `description` / `sizes` / `images[]` | 列表+详情+staff CRUD |
| 购物车 | `/api/cart` | 合并同尺码 |
| 订单 | 创建/列表/详情/取消/退款 | 金额服务端按商品价计算 |
| 支付 | prepay → `wx.requestPayment` | V3 JSAPI；HTTP 环境可回退 `/pay` |
| 收藏 | `/api/user/favorites` | 返回 `is_favorite` |
| 关于/客服 | `/api/site/about` `/api/site/contact` | 有则覆盖本地文案 |

## 响应约定

- 成功：`{ code: 200, message, data }`（前端转成内部 `code: 0`）
- 业务失败：HTTP 4xx + 同上 JSON（前端也会 resolve，由页面读 `message`）
- 字段：snake_case；前端 `utils/apiAdapter.js` 转 camelCase

## 联调注意

1. 学籍：后台「学籍名单」需先导入身份证，否则登录提示「未在学籍库」
2. 管理员：用户表 `role` 设为 `admin` 或 `merchant` 才能上架/管理商品
3. 真支付：配置微信商户 + 小程序 secret；支付前会自动 wx-bind
4. 改域名：只改小程序 `api/config.js` 的 `BASE_URL`（需与后端实际访问地址一致）
