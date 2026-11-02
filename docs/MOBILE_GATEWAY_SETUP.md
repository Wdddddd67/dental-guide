# v1.5 手机提交入口

用户已确认原网络能打开Supabase项目根域名并显示 `requested path is invalid`，说明到该域名的连接成功；这不代表Edge Function或微信推送已经部署。本方案复用现有Cloudflare通知后台，不迁移数据库，不在Supabase保存微信SendKey。

## 1. 更新GitHub与Cloudflare

解压 `dental-guide-web-mobile-gateway-update-v1.5.zip`，将内容按原目录上传现有仓库并提交。Cloudflare继续通过同一仓库构建部署 `dental-guide-notify`；原电脑入口保持兼容。等待最新构建成功。

在Cloudflare Worker运行的Variables and Secrets中新增Secret：

| 名称 | 值 |
| --- | --- |
| DENTAL_GATEWAY_SECRET | 本地私有 `.dev.vars` 中同名字段等号后的完整随机值 |

已有SERVERCHAN_SENDKEYS和IP_HASH_SALT保持原配置，不复制到Supabase或GitHub源码。共享密钥已在本地生成，不包含在更新包中；本人直接从本地文件复制。

## 2. 创建Supabase函数

在已创建的免费项目中：

1. 进入 **Edge Functions** → **Deploy a new function** → **Via Editor**。
2. 函数名填 **dental-gateway**。
3. 将本地 `supabase/functions/dental-gateway/index.ts` 的完整内容复制到编辑器的index.ts。它是独立完整文件，不需要额外包或数据库密钥。
4. 把这一个新函数的 **Verify JWT / Verify JWT with legacy secret** 设置为关闭，使匿名问卷可以调用。范围只限dental-gateway，不改其他功能或数据库权限；请求的正文/同意校验仍在原后台执行。
5. 添加Supabase运行Secret **DENTAL_GATEWAY_SECRET**，值与Cloudflare中完全相同，然后部署函数。创建/配置入口以实际控制台为准。

这个函数不需要SUPABASE_SERVICE_ROLE_KEY、数据库密码、微信SendKey或邮箱配置；代码只读取DENTAL_GATEWAY_SECRET。平台自带凭据不会被转发给Cloudflare。

## 3. 切换前先检测

新入口根地址：

```text
https://czszufrhouyjuzrhvgjg.supabase.co/functions/v1/dental-gateway
```

手机和电脑分别打开：

```text
https://czszufrhouyjuzrhvgjg.supabase.co/functions/v1/dental-gateway/api/health
```

期望200并显示 `service: dental-mobile-gateway`、`reachable: true`、`ready: true`。GET不会推送微信；它会同时核对转发函数、签名密钥、Cloudflare新代码与通知配置。只看到Supabase项目根目录的404，或者401身份验证错误，还不等于这个入口已就绪。

如果 `ready:false`，检查Cloudflare是否部署v1.5、两处共享密钥是否相同、函数是否部署。旧Worker不具备签名确认标记，不能被新入口误报成就绪。不要为了排查把密钥粘贴到聊天或代码。

## 4. 验收后连接网页

先明确授权提交一份虚构联调问卷，核对手机请求、网页回执和全部微信收件，之后再修改GitHub Repository variable **PUBLIC_API_BASE_URL** 为上面的新入口根地址（不加/api/health或/api/submissions）。

PUBLIC_NOTIFICATION_LABEL继续为项目团队名称，PUBLIC_PRIVACY_CONTACT继续留空。新构建支持函数路径，并清理此前变量首尾的隐藏空白。重新运行 **Deploy web to GitHub Pages**，再做正式网页手机验收。

没有通过手机验收前，保持现有电脑端地址不变。若需要回退，将该公开变量改回 `https://dental-guide-notify.wdz1367.workers.dev` 并重新运行Pages工作流。

## 实现与限制

- Supabase只向代码中固定的本项目Cloudflare后台转发，不能由请求指定其他目标。签名绑定方法、路径、正文和两分钟时间窗口；共享密钥不出现在网页、响应或持久记录中。
- 限制12KB正文，只接受现有GitHub Pages来源，POST仍由原后台校验字段、同意版本和推荐规则；重试仍使用原回执编号、多接收人进度。
- 不假定Supabase的转发IP头具有可验证的来源，故手机入口使用单独的全局100次/10分钟限流；原电脑直连仍为每IP 10次/10分钟。请求超限返回429，不自动重复推送。
- 此接入服务会处理转发的问卷正文，但代码不保存正文或输出日志；通知平台及托管平台的处理规则仍适用。Supabase免费项目有闲置暂停和额度限制，不承诺长期免费额度不变或所有网络永远可达。
- 本地模拟验证通过不等于Supabase平台已部署。当前无新接口真实通知验收。

## 官方依据

- [Supabase控制台创建函数](https://supabase.com/docs/guides/functions/quickstart-dashboard)
- [函数运行密钥](https://supabase.com/docs/guides/functions/secrets)
- [函数鉴权与verify_jwt](https://supabase.com/docs/guides/functions/auth)
- [免费套餐与闲置暂停](https://supabase.com/pricing)
