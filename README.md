# 健身打卡 App

一个基于日历的健身打卡应用。数据通过 [Supabase](https://supabase.com)（免费额度）存到云端，**登录后自动跨设备同步**，无需自己搭建或维护数据库。

## 功能

- 日历视图，点击日期即可打卡 / 取消打卡
- 本月、年度打卡统计
- 固定用户密码登录，保留邮箱验证码登录切换入口
- 支持按邮箱把旧账号打卡数据迁移到当前账号
- 自动迁移浏览器本地（`localStorage`）里的旧打卡数据
- 响应式设计，手机 / 桌面均可使用

## 项目结构

```
fitness-checkin-web
├── src
│   ├── index.html          # 页面结构
│   ├── styles/style.css    # 样式
│   ├── scripts
│   │   ├── config.js       # ★ Supabase 配置（填你自己的 url + anonKey）
│   │   └── app.auth.js     # 逻辑：认证 + 云端同步 + 日历渲染
│   └── assets/             # 图片资源
├── supabase
│   └── schema.sql          # ★ 建表 + 行级安全（RLS）脚本
└── package.json
```

## 一次性配置 Supabase（约 5 分钟）

### 1. 创建项目

1. 打开 [supabase.com](https://supabase.com)，用 GitHub 账号登录。
2. 点 **New project**，填个名字，设一个数据库密码（自己记住即可），选一个就近的地区（如 `Southeast Asia`），创建。
3. 等 1~2 分钟项目初始化完成。

### 2. 建表 + 开启权限

1. 进入项目后，左侧菜单打开 **SQL Editor**。
2. 新建一个查询，把本仓库 [`supabase/schema.sql`](supabase/schema.sql) 的全部内容粘贴进去，点 **Run**。

这一步会创建 `checkins` 表、开启**行级安全（RLS）**，并创建账号迁移用的 `copy_checkins_between_emails` 函数。

账号迁移函数只能把数据迁移到当前已登录账号：页面上点击“数据迁移”，填写 Source 账号后，可以选择“增量复制”或“全量覆盖”。

### 3. 开启邮箱验证码（Email OTP）

1. 左侧菜单进入 **Authentication → Providers → Email**。
2. 打开 **Email OTP** 开关（这样邮件里会带上 6 位数字验证码）。
3. 建议把 **Confirm email** 关闭（否则首次登录还要点邮件里的确认链接）。

> 如果你没开启 Email OTP，用户收到的是「magic link」邮件，点链接同样能登录，不影响使用。

### 4. 配置站点地址

1. 左侧菜单进入 **Authentication → URL Configuration**。
2. **Site URL** 填你的 GitHub Pages 地址，例如：
   `https://<你的用户名>.github.io/fitness-checkin-web/`
3. **Redirect URLs** 也加上同一个地址（可以再 `Add URL` 加一条）。

### 5. 填入密钥

1. 左侧菜单进入 **Project Settings → API**。
2. 复制 **Project URL** 和 **anon public** 密钥。
3. 打开 [`src/scripts/config.js`](src/scripts/config.js)，替换两处占位符：

```js
const SUPABASE_CONFIG = {
    url: "https://xxxx.supabase.co",       // Project URL
    anonKey: "eyJhbGciOi...",              // anon public
    appUrl: "https://<你的用户名>.github.io/fitness-checkin-web/",
    fixedLoginEmail: "zxw@fitness.com",
};
```

> `anonKey` 是公开密钥，配合 RLS 使用是安全的，可以放在前端代码里。**不要**把 `service_role` 密钥放到前端。

## 本地运行

直接用浏览器打开 `src/index.html` 即可（无需安装依赖）。

## 部署到 GitHub Pages

```bash
npm install       # 只需一次，安装 gh-pages
npm run deploy    # 把 src 目录发布到 gh-pages 分支
```

部署后访问 `https://<你的用户名>.github.io/fitness-checkin-web/`。

## 数据说明

- 打卡数据存于 Supabase 的 `checkins` 表，按 `user_id + date` 唯一，一用户一天一条。
- 首次用某邮箱登录时，会自动把该浏览器 `localStorage` 里的旧打卡记录迁移到云端。
- 页面里的账号迁移默认不展示，登录后点击右上角“数据迁移”按钮打开弹窗。迁移目标固定为当前登录账号，支持两种模式：
  - **增量复制**：只把 Source 账号里 To 账号没有的日期复制过去，不删除 To 账号现有数据。
  - **全量覆盖**：先清空 To 账号现有数据，再复制 Source 账号数据。
- 换设备只需用同一邮箱登录，数据自动同步。

## License

MIT
