# v1.2 推荐卡片更新

更新日期：2026-11-02。

## 手动更新现有GitHub仓库

1. 解压 `dental-guide-web-material-cards-update-v1.2.zip`。
2. 打开现有 `Wdddddd67/dental-guide` 仓库的 Code 页面，选择 Add file → Upload files。
3. 将解压后的文件和文件夹上传至仓库根目录，保持 public、shared、docs 目录结构，不要套上ZIP文件名对应的外层文件夹。
4. 提交至 main，等待现有 Pages 工作流成功后刷新网页。浏览器如仍显示旧内容，可使用无痕窗口检查。

本次实际功能文件是 `public/app.mjs`、`public/app.css`、`shared/model.mjs` 和新增的 `shared/material-copy.mjs`。请一并上传，不能只更新旧模块。

更新包以v1.1为基准，不覆盖站点的 `public/config.mjs` 或GitHub变量。完整源码包适用于完整备份或首次部署；已有通知地址等配置时，请优先使用更新包。本轮没有开放提交服务。

## 内容

- 小卡片完整显示用户提供的核心特点；牙冠多条核心优点串接展示。
- 展开内容依次为图片、特点与适合人群、参考注释；强度及美塑一句话均保留。
- 钛合金一体冠未提供新文字，沿用原文案。
- 不修改推荐顺序、匹配度、选牙与问卷逻辑。

现有25项测试及120个排序组合通过，已观察手机与桌面长文排版。本更新未直接发布至GitHub。
