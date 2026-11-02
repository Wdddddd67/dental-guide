# 个人微信通知配置

更新：2026-11-02。用户已明确选择“个人微信替代邮件”，继续推进接入；接收服务尚未注册或绑定，测试邮箱仍不公开。

## 当前实现

v1.4新增：现已支持所有配置微信同时接收。推荐在Cloudflare Worker运行Secret中设置 `SERVERCHAN_SENDKEYS`，一行一个实际SCT密钥，最多10个不同密钥；非空时替代原 `SERVERCHAN_SENDKEY`。未填写多人值时继续兼容单人配置。操作步骤、补发规则与验证范围见 [MULTI_WECHAT.md](MULTI_WECHAT.md)。

通知默认走 Server酱 Turbo，环境变量通道名为 `serverchan`。邮件和企业微信群接口仍保留，可以日后改回。仅知道普通微信号无法直接推送；需要在通知服务中绑定实际接收的个人微信。

当前版本只适配 Turbo 的 `SCT` 开头 SendKey，不接受 Server酱³ 的 `sctp` 开头 Key。后者是另一套接入方式，不能直接混用。

卡片摘要固定为“收到一份新的修复需求问卷，请点击查看。”，不把称呼、联系方式或牙位放在该摘要中。点击后的详细内容包含问卷编号、牙位、评分、重算后的材料顺序、选填信息和用途同意版本。第三方平台如何最终展示通知，仍以其实际通道为准。

## 1. 本地准备

项目根目录已有 Git 忽略的 `.dev.vars`。其中已保留测试收件配置、切换个人微信默认通道，并生成本地限流散列盐；不将这些私有值打包或上传。

需要自行填入的主要字段：

```dotenv
NOTIFICATION_CHANNELS=serverchan
ALLOWED_ORIGINS=https://wdddddd67.github.io
SERVERCHAN_SENDKEY=你的SCT开头SendKey
IP_HASH_SALT=本地生成的长随机值
```

请将真实 SendKey 直接填进本机 `.dev.vars`，不要粘贴到聊天、GitHub 文件或浏览器端配置。编辑时保留已有随机盐，不必重新生成。

执行以下命令只检查字段是否就绪，不发送请求，也不显示收件人或密钥：

```sh
npm run notify:check
```

缺少真实 SendKey 时显示缺失项并以非零状态结束，这是预期的未配置状态，不是发送成功。

2026-11-02后续：接收密钥已由本人提供并仅写入本机私有配置，配置检查现在通过。未在源码、文档或上传包中记录实际值。这仍不表示微信已实际收件或网站提交已开通。

接收通道测试命令：`npm run notify:test` 默认只显示虚构问卷预览，不读取密钥、不发送。本人明确确认发送后，执行 `npm run notify:test -- --send` 才向当前配置的全部接收微信分别发送一条虚构联调问卷。不会自动重试；接口确认后仍须本人核对微信实际收件。该测试只验证接收通道，不验证Cloudflare或网页提交链路。

可选的真实本地 Worker 平台检查需先安装开发依赖，再执行 `npm run notify:verify`。该命令只打包、启动本机平台并读取状态，不提交问卷、不部署、不访问推送接口。当前已固定官方 Wrangler 4.156.0；本机下载其 Windows workerd 组件时失败，故此项未验证通过，不能用Node测试桩结果代替原生平台验收。常规 `npm test` 与 `npm run check` 不依赖 Wrangler 安装。

## 2. 绑定接收微信

打开 [Server酱 Turbo](https://sct.ftqq.com/)，由账户持有人登录并按其页面提示启用个人微信接收通道，取得对应 SendKey。实际可用通道、额度和费用以账户后台为准，本项目不自动购买套餐。

个人微信绑定与账户授权需要由本人完成。不要把 SendKey 当作公开的普通网址：得到它的人可能消耗你的推送额度。

## 3. 以后启用线上服务时

目前按用户要求只做本地配置，不发布通知服务，不公开测试邮箱。

以后准备启用时，将以下字段配置到 Cloudflare Worker：

| 位置 | 名称 | 内容 |
|---|---|---|
| 普通变量 | NOTIFICATION_CHANNELS | serverchan |
| 普通变量 | ALLOWED_ORIGINS | https://wdddddd67.github.io |
| Secret | SERVERCHAN_SENDKEY | 实际SCT SendKey |
| Secret | IP_HASH_SALT | 长随机字符串 |

Wrangler 的 `DELIVERY` 绑定与 `v1` SQLite Durable Object 迁移必须保留，用来限流、去重和处理重试。把 `.dev.vars` 放在电脑上不会自动设置线上 Secret。

可以通过 GitHub 中的 `Deploy notification API` 工作流部署；所需 Cloudflare 账户及部署授权届时再配置。前端仍由现有 GitHub Pages 提供。

### 本轮准备的GitHub部署入口

2026-11-02核对当前公开仓库发现：网页v1.2已经发布，但仓库中通知模块仍是旧版，且没有 `.github/workflows/notify.yml`。只更新网页卡片不会自动增加微信服务。

新版接入更新包包含个人微信接口、状态检查、测试和手动部署工作流。上传后不会自动部署通知服务，需在 Actions 中手动运行。先不要运行未配置的通知工作流。

准备启用时，在仓库 Settings → Secrets and variables → Actions → Secrets 添加：

- `CLOUDFLARE_API_TOKEN`：授权部署到本人Cloudflare账户的令牌。
- `CLOUDFLARE_ACCOUNT_ID`：本人Cloudflare账户ID。
- `SERVERCHAN_SENDKEY`：绑定接收微信后取得的SCT密钥。
- `IP_HASH_SALT`：本地已有长随机值；不能公开。

这些值都只填到Secrets，不能写入仓库文件。工作流会先验证微信配置，再将两项运行密钥安全同步至Worker；本轮只是准备入口，未执行部署。若网页上传遗漏隐藏的 `.github` 目录，可通过仓库 Add file → Create new file 创建 `.github/workflows/notify.yml`，粘贴更新包中同名文件的完整内容。

仓库GitHub环境 `notification-production` 如另有本人配置的保护规则，运行时按规则处理，不自动改动保护设置。

部署后先访问 `https://实际通知服务/api/health`。返回 `ready:true` 只说明配置字段与绑定已就绪，不代表已经推送到微信。

## 4. 前端连接与用途说明

以后启用前，在仓库的 Actions Variables 设置：

- `PUBLIC_API_BASE_URL`：实际通知服务的 HTTPS 根地址。
- `PUBLIC_NOTIFICATION_LABEL`：例如“看牙有谱项目负责人（个人微信，经 Server酱通知服务）”。
- `PUBLIC_PRIVACY_CONTACT`：用户同意公开的真实联系途径；当前尚未提供，保持空白，不擅自公开测试邮箱。

没有上述 API 和公开联系途径时，网页保留“提交服务尚未开通”的状态。仅查看测试结果不会发送通知。

## 5. 真实收件验收

配置齐全并允许上线后，再提交一份清楚标记“上线联调”的虚构问卷，在个人微信中核对标题、详情、牙位、两项答案和五材料顺序。未完成这一步前，不宣称实际微信收件通过。

已收到上游确认的重复请求会被本项目跳过；Server酱接口没有本项目可使用的官方幂等键，如果上游实际接收但响应在网络中丢失，重试可能产生重复通知，不能承诺绝对只出现一次。

## 邮件以后如何恢复

把 `NOTIFICATION_CHANNELS` 改为 `email`，配置 `RESEND_API_KEY`、`EMAIL_FROM`、`EMAIL_TO`。使用 `email,serverchan` 时要求两个渠道都获得确认才显示提交成功；重试只补发未确认的渠道。当前仅使用个人微信，不需要注册 Resend，也不需要邮箱密码。

## 官方接口依据

- [Server酱官方调用示例](https://github.com/easychen/serverchan-demo/blob/master/nodejs/send.js)
- [官方SDK参数及返回值](https://github.com/easychen/serverchan-sdk)：`title`、`desp`、`short`、`noip`，`code:0` 表示接口确认。
- [Server酱 Turbo 入口](https://sct.ftqq.com/)
