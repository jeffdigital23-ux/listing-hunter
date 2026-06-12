# Jeff 下一步：你只需要先做 1 件事

这份文件是给 Jeff 用的 **超简单版**。

## 先讲清楚现在的状态

我已经把 **Listing Hunter Agent v1 的代码** 做好了。

但是我还没有办法直接在你的 Google Drive 里面创建 Sheet，也还没有把你的 Dropbox files 搬进去，因为这个 Codex 环境没有你的 Google Drive / Dropbox 登录权限。

所以现在不是你做错，而是还差一个 **安装到你 Google Drive 的步骤**。

## 你现在只需要做 Step 1

### Step 1：在 Google Drive 建一个 folder

名字：

```text
Jeff Listing Hunter
```

然后先把 **1 个 Excel 测试文件** 放进去，例如：

```text
The Cruise Residence Bandar Puteri Puchong 320 contacts 2023.xlsx
```

先不要搬全部。先用一个公寓测试成功就好。

## 接下来的 Step 2 到 Step 5 不是叫你自己研究

你刚才说 Step 2 到 Step 5 不明白，这个很正常。

那些是 **技术安装步骤**，不是每天业务操作。你不需要自己研究 Apps Script 是什么。

更简单地说：

| 步骤 | 谁处理比较适合 |
|---|---|
| Step 1：Google Drive 建 folder，放 1 个 Excel | Jeff 可以做 |
| Step 2：建 Google Sheet | 我可以一步一步指导你，或技术人员帮你做 |
| Step 3：贴 Apps Script code | 我可以一步一步指导你，或技术人员帮你做 |
| Step 4：跑 setup / 授权 | 需要你在自己 Google account 按允许 |
| Step 5：测试 daily email / 开启每天自动跑 | 我可以指导，或技术人员帮你做 |

## 你现在可以直接回复我什么？

你做完 Step 1 后，直接回复：

```text
我已经在 Google Drive 建好 Jeff Listing Hunter folder，也放了 The Cruise Excel。
```

然后我下一步只会教你 **一个动作**，不会一次给你 5 个步骤。

## 如果你要最省事

你可以找一个会用 Google Sheet 的人帮你做技术安装。你只需要给他这句话：

```text
请帮我在 Google Sheet 安装 Listing Hunter Agent。代码在 apps-script/Code.js，安装步骤在 docs/SETUP.md。先用 The Cruise Residence 那个 Excel 测试，成功后每天 9am email report 给 Jeff。
```

## 如果 Apps Script 打开变成 Page not found

如果你从 `Extensions -> Apps Script` 点进去还是 Page not found，不要一直重复点。

最简单 workaround：

1. 留在 Google Sheet 页面。
2. 从 browser 地址栏复制 `/d/` 后面、`/edit` 前面的那一串 Spreadsheet ID。
3. 打开这个网址，把最后的 `SPREADSHEET_ID` 换成你的 ID：

```text
https://script.google.com/home/projects/create?type=bound&parentId=SPREADSHEET_ID
```

如果你不确定哪一串是 Spreadsheet ID，把 Google Sheet 的网址贴给我，我可以帮你指出应该复制哪一段。

## 如果 Apps Script 进去了，但是 Google account 不对

如果 Apps Script 右上角显示的是 `jeffchang2304`，但你的 Google Sheet 是在 `jeffdigital23` 创建的，先不要贴代码，也不要 Run。

最简单方法：

1. 打开新的 Private / Incognito window。
2. 只登录 `jeffdigital23`。
3. 打开那个 Google Sheet。
4. 再点 `Extensions -> Apps Script`。

如果不用 private window，也可以在 Sheet URL 后面加：

```text
?authuser=jeffdigital23@gmail.com
```

重点：Apps Script 和 Google Sheet 要用同一个 Google account，否则之后授权、每天 email、trigger 可能会乱。

## 如果找不到 importRawContactsToOwnerDatabase

如果 dropdown 找不到 `importRawContactsToOwnerDatabase`，不是你不会用，是因为你现在 Apps Script 里面还是旧版 code。

最新 code 会有两个特征：

1. Apps Script 里面会看到 `importRawContactsToOwnerDatabase`。
2. 回到 Google Sheet refresh 后，上方会出现 `Listing Hunter` menu。

以后不要找 dropdown，可以直接用：

```text
Listing Hunter -> 2. Import raw contacts
```

如果没有这个 menu，就代表要先把最新 `apps-script/Code.js` 整个重新贴进去，Save，然后 refresh Google Sheet。

## 如果 Excel import 后电话号码没有 0

不用怕。很多 Excel 电话号码会把前面的 `0` 吃掉，例如：

```text
129409838
```

系统会把它变成 WhatsApp 可用格式：

```text
60129409838
```

Malaysia WhatsApp link 本来就是用 `60`，不用前面的 `0`。

如果 import 后出现 `SEND` / `SMS Blasting Format` 这种 raw sheet，下一步是在 Apps Script 运行：

```text
importRawContactsToOwnerDatabase
```

它会把 raw contact 自动整理进 `OWNER_DATABASE`。

## V1.1 Mudah Lead Recovery 要怎样用？

V1.1 的目的：不要再让 Mudah leads 永远 0。系统会保留 commercial / industrial 的 low-confidence candidates，让 Jeff 自己人工筛选。

建议在 `SETTINGS` 里面加入 / 确认：

```text
MUDAH_TARGET_AREAS
Puchong
Taman Kinrara
Bukit Jalil
Subang Jaya
USJ

MUDAH_TARGET_TYPES
Commercial
Industrial
Factory
Warehouse
Shop
Shop lot
Office

MUDAH_MAX_DAILY_LEADS = 30
MUDAH_DETAIL_CHECK_ENABLED = TRUE
MUDAH_REQUIRE_PRIVATE_ADVERTISER = TRUE
MUDAH_DETAIL_CHECK_LIMIT = 40
```

然后在 `MUDAH_SEARCH_URLS` 放你手动从 Mudah copy 的 search URLs。先放 commercial / industrial，不要一次放太多住宅 URL。

跑：

```text
Listing Hunter -> 3. Run daily report now
```

然后看：

```text
MUDAH_LEADS
```

V1.2 之后，如果 `MUDAH_REQUIRE_PRIVATE_ADVERTISER = TRUE`，系统会先打开 listing detail page 检查。看到 `Property agent` / `REN` / company signal 会直接 reject，不会写进 `MUDAH_LEADS`。看到 `Private advertiser` / owner signal，且价格符合 `MUDAH_MIN_RENT` 或 `MUDAH_MIN_SALE`，才会保存。

如果你要 sale leads，`MUDAH_SEARCH_URLS` 一定要放 `for sale` 的 Mudah search URL；如果只放 rent URL，系统只会找到 rent listing。


## Diagnose Mudah scan before changing scraper logic

If `TODAY_QUEUE` and email are working but `Mudah Leads Found = 0`, run the diagnostic before changing scraper logic:

```text
Listing Hunter -> Diagnose Mudah scan
```

This creates/appends to `MUDAH_DIAGNOSTICS` and records:

- Mudah URL tested
- HTTP status returned to Apps Script
- HTML/content length
- page title
- whether JSON-LD exists
- whether private advertiser / property agent text appears
- candidate count
- kept vs skipped count
- sample candidate titles
- response preview
- error message, if any

How to read the result:

| Diagnostic result | Likely meaning |
|---|---|
| `HTTP Status` is `403`, `429`, or other 4xx/5xx | Mudah is likely blocking Apps Script fetch. |
| `HTTP Status` is `200` but `Content Length` is very small | Apps Script may be receiving a redirect, consent page, or bot page. |
| `HTTP Status` is `200`, content is large, but `Candidate Count = 0` | Parser cannot read Mudah's current HTML / page is dynamic. |
| `Candidate Count > 0` but `Kept Count = 0` | Scoring is too strict or all results look like agents / irrelevant listings. |
| `Sample Candidate Titles` has real listings | Scanner can see listings; next fix should focus on scoring/filtering. |

Do not rely on the browser result alone. Jeff's browser may open Mudah normally, while Google Apps Script may receive different HTML or be blocked.

## 完成安装后，每天会怎样？

安装成功后，你每天不需要打 prompt。

系统每天会自动：

1. 从 owner database 选最多 30 个 owner。
2. 生成 WhatsApp message。
3. 生成 WhatsApp click-to-send link。
4. 检查 Mudah 有没有新 possible owner leads。
5. Email report 给你。

## 你每天只需要做什么？

每天收到 email 后：

1. 打开 email。
2. 点 WhatsApp link。
3. 看一下 message。
4. 按 Send。

如果 owner 回复 No / Not interested / Wrong number，才需要标记 Do Not Contact。

## 如果你问“Codex 不是可以直接帮我安装吗？”

Codex 可以帮你把系统代码、表格结构、自动化逻辑、message templates 做出来。这个已经做好。

但 Codex 现在没有你的 Google 授权，所以不能直接进入你的 Google Drive 创建文件，也不能替你按 Google 的 Allow 授权按钮。

最接近你要的“我帮你做完整套”是：我继续一步一步带你点，直到 Google 要授权时你自己按 Allow。授权完成后，系统才可以每天自动跑。

更详细解释在 `docs/CODEX_INSTALL_LIMITS.md`。

## 为什么我不能现在直接帮你做完 Google Drive？

因为我现在是在这个 repo 里面写代码，不是在你的 Google account 里面操作。

我不能直接进入你的 Google Drive，也不应该叫你给我 password。

第一次安装一定需要你在自己的 Google account 里面授权。授权完成后，系统才可以每天自动跑。

## Mobile Action Dashboard 怎样用？

这个 dashboard 是给 Jeff 手机用的，不是 App Store app。它是一个 Apps Script Web App link，可以加到手机 Home Screen。

### 目的

Jeff 不需要每天打开 Google Sheet 更新 status。每天 email 里面会有一个按钮：

```text
Open Today Action Dashboard
```

打开后可以：

- 看今天 WhatsApp queue
- 点 `Open WhatsApp`
- 点 `Mark Sent`
- 记录 `Replied`
- 记录 `Not Interested`
- 记录 `Do Not Contact`
- 写一句 owner reply note

### Jeff 需要做的设置

在 `SETTINGS` 确认：

```text
DASHBOARD_ENABLED = TRUE
ACTION_DASHBOARD_URL = 你的 Web App URL
MUDAH_SCAN_ENABLED = FALSE
```

如果 `ACTION_DASHBOARD_URL` 还没有，就先在 Apps Script 里面 Deploy as Web App，然后把 URL paste 回来。

### 每天流程

1. 收 email。
2. 点 `Open Today Action Dashboard`。
3. 对每一个 owner 点 `Open WhatsApp`。
4. 发出后点 `Mark Sent`。
5. 有回复就点 `Replied`，写一句 note。
6. 不要再联系就点 `Do Not Contact`。

---

## V1.2：现在 Jeff 要怎样用

### 1. 先关掉 Mudah

在 `SETTINGS`：

```text
MUDAH_SCAN_ENABLED = FALSE
```

Mudah code 先放着，不删除，不继续 debug。

### 2. 选择现在要做的 listing / project

打开：

```text
TARGET_LISTINGS
```

只把你现在要做的项目设成：

```text
Status = Active
```

其他项目可以放：

```text
Waiting / Paused / Completed
```

要换下一个 listing，就把旧的 `Active` 改掉，再把新的 target 改成 `Active`。

### 3. 建立每天三批 trigger

在 Google Sheet menu 点：

```text
Listing Hunter -> 4. Create 9am/3pm/5pm/9pm triggers
```

系统会安排：

- 9am：25 contacts
- 3pm：25 contacts
- 5pm：25 contacts
- 9pm：summary report

数量可以在 `SETTINGS` 改。

### 4. 每次发完一定要记录

不要只从 email 点 WhatsApp link。

正确流程：

```text
Email -> Open Today Action Dashboard -> Open WhatsApp -> Send -> Mark Sent
```

如果 owner 回复，就在 dashboard 选 `Replied`，写一句 note。

### 5. Office / house number 会被过滤

系统只会给 Malaysia mobile 号码生成 WhatsApp link。Office / house / invalid number 会被标记，不会浪费 queue。

### 6. 如果按 Run daily report 测试

现在安全了：如果今天已经有 queue，它不会清空，只会重发 existing report。

只有你自己点：

```text
Reset today queue (careful)
```

才会清空今天 queue。

### 如果 Dashboard 只有蓝色 header / 空白

新版 dashboard 会先显示 server-side fallback。更新 code 后一定要：

```text
Deploy -> Manage deployments -> Edit -> Version: New version -> Deploy
```

如果没有 queue，也应该看到 `No queue yet`，不会再只有空白页面。
