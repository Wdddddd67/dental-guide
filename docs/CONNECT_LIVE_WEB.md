# 连接网页，保持个人联系方式私有

2026-11-02，v1.4.1。后台和所有微信的虚构联调已成功，项目负责人确认所有人收到且详情正常。网页最终提交仍需完成下面设置。

1. 解压 `dental-guide-web-private-contact-update-v1.4.1.zip`，将文件按原目录上传现有GitHub仓库并提交。这次小更新允许不公开个人联系方式时提交。
2. 在仓库 Settings → Secrets and variables → Actions → Variables 中，找到下方的 **Repository variables**，点击绿色 **New repository variable**，分别添加：

| Name | Value |
| --- | --- |
| PUBLIC_API_BASE_URL | https://dental-guide-notify.wdz1367.workers.dev |
| PUBLIC_NOTIFICATION_LABEL | 看牙有谱项目负责团队 |

3. `PUBLIC_PRIVACY_CONTACT` 不添加，保持空白。不把SendKey、微信号或私人收件邮箱填到这些公开变量。
4. 添加变量本身不会自动重新生成网页。进入Actions，选择 **Deploy web to GitHub Pages** → **Run workflow**，选择main并运行；成功后刷新网页。若先完成变量设置再上传代码，也可由上传提交自动触发Pages构建。
5. 实际网页验证：完成两题后进入信息问卷，阅读用途说明并勾选同意，再提交一份明确写“上线联调测试（虚构）”的虚构数据，核对回执和各接收微信。

Cloudflare的运行Secret继续保存密钥，GitHub这两项只用于把网页连接到接口。公开联系方式不是必填项，不会自动公开此前提供的邮箱或微信号。用途说明不承诺已经实现在线删除功能，只提示保存回执供后续与项目团队核对。
