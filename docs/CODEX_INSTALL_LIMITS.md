# 为什么 Codex 不能直接安装到 Jeff 的 Google Drive？

Jeff 的目标是对的：用 Codex 做一个 AI agent 助理，而不是每天自己重复做 prompt。

但是要分清楚两个权限：

## Codex 现在可以做什么

Codex 在这个 repo 里面有权限做这些事：

- 写 agent 代码。
- 修改 README 和 setup docs。
- 建 Google Apps Script 文件。
- 建表格 schema。
- 建 WhatsApp message templates。
- 建 Mudah lead scoring logic。
- commit 代码。
- 准备一个可以安装到 Google Sheet 的系统。

## Codex 现在不能直接做什么

Codex 现在没有 Jeff 的 Google account OAuth 授权，所以不能直接：

- 打开 Jeff 的 Google Drive。
- 在 Jeff 的 Google Drive 创建 Google Sheet。
- 把 Jeff 的 Dropbox files 搬去 Google Drive。
- 代表 Jeff 点击 Google 授权按钮。
- 代表 Jeff 允许 Apps Script 读取 Sheet、发送 email、每天自动运行。
- 进入 Jeff 的 WhatsApp / Mudah / Dropbox account。

这不是因为系统不想帮 Jeff，而是因为 Google / Dropbox / WhatsApp 都需要账号拥有者授权。Codex 不能也不应该拿 Jeff 的 password。

## 最接近“我帮你做完整套”的安全方式

### 方式 A：Jeff 只做授权，我一步一步带

1. Jeff 打开 Google Drive。
2. Jeff 建 `Jeff Listing Hunter` folder。
3. Jeff 建 Google Sheet。
4. 我一步一步告诉 Jeff 点哪里。
5. 到 Google ask permission 的时候，Jeff 自己按 Allow。
6. 授权后，系统每天自动跑。

这个方式不需要 Jeff 懂 programming，但需要 Jeff 跟着点几次。

### 方式 B：让一个技术人员帮 Jeff 安装

Jeff 可以找一个会 Google Sheet / Apps Script 的人。

给他这句话：

```text
请帮我安装 Listing Hunter Agent。代码在 apps-script/Code.js，manifest 在 apps-script/appsscript.json，步骤在 docs/SETUP.md。请安装到我的 Google Sheet，先用 The Cruise Residence Excel 测试，成功后每天 9am email report 给 Jeff。
```

Jeff 还是需要在自己的 Google account 按授权，但技术人员可以处理复制代码、建 sheet、测试 trigger。

### 方式 C：未来做成正式 Web App / SaaS

如果 Jeff 以后要更完整：

- 一键连接 Google Drive。
- 一键连接 Google Sheet。
- Dashboard 管 owner database。
- 每天自动 report。
- Search engine。

那就不是简单 Apps Script 了，需要做一个正式 web app，有 OAuth login、database、server、billing/hosting。这个可以是后续版本。

## 目前 v1 的实际状态

现在 repo 已经准备好可安装版本：

- `apps-script/Code.js`：主要 agent 代码。
- `apps-script/appsscript.json`：Apps Script manifest 和权限 scopes。
- `docs/SETUP.md`：技术安装步骤。
- `docs/JEFF_NEXT_STEPS.md`：Jeff 简单下一步。

下一步不是重新写 prompt，而是把这套代码安装到 Jeff 的 Google Sheet。
