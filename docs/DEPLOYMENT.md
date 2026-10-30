# 从 GitHub 部署网页与问卷邮件

更新：2026-10-29。当前还没有绑定 GitHub 仓库；邮件服务凭据尚未配置，未向真实邮箱发送测试邮件。

## 1. 创建 GitHub 仓库

建议名称 dental-guide-web。当前根目录已初始化 main 分支。将本目录的源码上传到你自己的仓库，必须包含 .github/workflows；不要上传 .dev.vars、qa、.env 或 .git。若使用提供的 source.zip，它已排除私有配置。

如用 Git 命令，先核对本机 Git 身份，再执行 git add .、git commit，随后为实际仓库设置 origin 并推送 main。不要将示例用户名直接用于远程地址。

GitHub 免费方案的 Pages 适用于公开仓库；私有仓库支持情况依套餐而定。启用 Pages 后网页的访问范围要以 GitHub 后台设置为准。

## 2. 先部署通知服务

GitHub Pages 是静态托管，不能在其中隐藏密钥或直接运行邮件接口。本项目另带 Cloudflare Worker：server/worker.mjs。

1. 准备 Cloudflare 账户，将 wrangler.toml 中 ALLOWED_ORIGINS 改为实际页面的来源，例如 https://你的用户名.github.io（不含仓库路径）。
2. 准备 Resend 邮件服务：测试发件身份/收件人限制按其后台提示完成；正式使用需验证自己的发件域名。163邮箱可以作为收件人，不能直接当作已验证的发件域名。
3. 在服务端设置以下 secrets，禁止写进代码或 PUBLIC_ 配置：

| Secret | 用途 |
|---|---|
| RESEND_API_KEY | Resend 发信权限，仅服务端使用 |
| EMAIL_FROM | 已验证的发件地址或平台允许的测试发件身份 |
| EMAIL_TO | 收件邮箱，当前测试地址只在本机私有文件保存 |
| IP_HASH_SALT | 随机长字符串，用于散列限流标识 |

本地可用 .dev.vars 配置，线上请通过 Cloudflare 控制台的 Worker Variables and Secrets，或 wrangler secret put 写入。线上密钥不会因 .dev.vars 存在而自动上传。

4. 首次部署会创建 DELIVERY Durable Object（SQLite后端，配置已包含迁移）。通知限流与重复提交状态使用它；不保存问卷、姓名和联系方式原文，仅存散列、发送状态和时间，24小时自动清理。邮件内容由接收平台按其规则保留。
5. 可在 Cloudflare 通过本 GitHub 仓库连接构建，或在 GitHub 配置 CLOUDFLARE_API_TOKEN、CLOUDFLARE_ACCOUNT_ID 后手动运行“Deploy notification API”工作流。Token应只授予必要部署范围，运行时邮件 secrets 仍只在 Worker 侧设置。
6. 获得实际 API 根地址，类似 https://dental-guide-notify.你的子域.workers.dev。

## 3. 配置 GitHub Pages

进入仓库 Settings → Secrets and variables → Actions → Variables，设置：

| Variable | 示例／说明 |
|---|---|
| PUBLIC_API_BASE_URL | 实际 Worker HTTPS 根地址，不能带 /api/submissions、密钥或其他路径 |
| PUBLIC_PRIVACY_CONTACT | 可公开的项目联系邮箱、联系网址或实际联系途径；与私有收件邮箱可不同 |
| PUBLIC_NOTIFICATION_LABEL | 例如“看牙有谱项目负责人（邮件）” |

PUBLIC_ 值会进入公开页面；不要把仅供收件的私人邮箱放入公开变量，除非你明确愿意公开。缺少 API 或项目联系信息时，前端会禁用发送而不假装成功。

仓库 Settings → Pages → Source 选择 GitHub Actions。推送 main 或手动运行“Deploy web to GitHub Pages”。工作流会测试、静态检查、构建并部署 dist/。部署网址以 Actions / Pages 后台的实际输出为准，不提前猜测上线成功。

所有资源使用相对路径，支持 https://用户名.github.io/dental-guide-web/ 这样的仓库子路径。页面采用 hash 路由，不依赖服务器路径重写。

## 4. 上线联调

- 手机微信内、手机浏览器各跑一次两条修复流程，检查选牙、评分与图片。
- 提交一份明显标注“上线测试”的问卷，手动确认收件箱/垃圾邮件箱收到内容、牙号、答案和排名。
- 模拟断网后重试，确认不展示假成功；API故障时填写内容留在当前页。
- 公开前核对信息用途说明、可公开联系途径、产品内容与实际接收邮箱。

## 5. 后续换邮箱

只更新 Worker 的 EMAIL_TO secret，再按平台要求应用变更；前端无需改动。若公开联系信息也变更，则另改 PUBLIC_PRIVACY_CONTACT 并重新部署前端。不要把邮箱密码放在任何地方，本方案不需要163邮箱密码。

## 验证限制

企业微信适配保留为可选后端能力，但本轮按用户选择使用邮件。企业微信在上游响应丢失后无法保证绝对不重复，邮件依靠服务端状态及 Resend 24小时幂等键。基础限流不能完全代替公开大流量场景的反滥用验证。未配置真实凭据前，不宣称真实收件或公开部署完成。

## 官方依据

- [GitHub Pages 的静态托管范围](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/get-started/)
- [Resend 发送邮件与幂等键](https://resend.com/docs/api-reference/emails/send-email)
