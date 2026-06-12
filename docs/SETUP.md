# Jeff Listing Hunter Agent v1 Setup

This setup is designed for Jeff's preferred workflow:

- Google Sheet stores owner database and lead status.
- Google Apps Script runs every morning in the cloud.
- Daily email sends Jeff today's 30 WhatsApp links and new Mudah leads.
- Jeff manually reviews and sends WhatsApp messages to reduce block risk.

## 0. What files to copy

When installing into Apps Script, copy both files from `apps-script/`:

- `Code.js` into Apps Script as `Code.gs`
- `appsscript.json` into Apps Script project settings / manifest if you are using the Apps Script editor manifest view or `clasp`

The manifest sets Malaysia timezone and the Google permission scopes needed for spreadsheet access, email sending, URL fetching, and daily triggers.

## 1. Create the Google Sheet

1. Go to Google Drive.
2. Create a Google Sheet named `Jeff Listing Hunter`.
3. Open `Extensions -> Apps Script`.
4. Paste the contents of `apps-script/Code.js` into `Code.gs`.
5. Save the script.

## Apps Script opens as “Page not found”

If `Extensions -> Apps Script` opens a Google Drive page saying it cannot open the file, try this simpler direct method:

1. Stay on the Google Sheet tab.
2. Look at the browser address bar. Copy the long spreadsheet ID between `/d/` and `/edit`.
   - Example URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0`
3. Open this URL in a new tab after replacing `SPREADSHEET_ID`:

```text
https://script.google.com/home/projects/create?type=bound&parentId=SPREADSHEET_ID
```

4. If Google asks which account to use, choose the same Google account that owns the Sheet.
5. If it still fails, go back to the Sheet, reload the page, wait until it fully loads, then try `Extensions -> Apps Script` again.

Common causes:

- The Apps Script page opened with the wrong Google account.
- Google Sheets was still loading when Apps Script was clicked.
- The browser reused an old or broken `script.google.com` tab.
- Third-party cookies / old cache caused Google account routing issues.

For Jeff, the fastest workaround is usually: close the broken `Page not found` tab, return to the Sheet tab, copy the spreadsheet ID, and open the direct bound-script URL above.

## Apps Script opens with the wrong Google account

If Apps Script opens but the top-right Google account is not the same account that owns the Google Sheet, do not paste or run the code yet.

Use one of these fixes:

### Fix A: Open the Sheet using the correct account URL

1. Go back to the Google Sheet tab.
2. Confirm the Sheet owner/account is the correct Google account.
3. In the Sheet URL, add the correct Google account selector if needed:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit?authuser=CORRECT_EMAIL
```

Example:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit?authuser=jeffdigital23@gmail.com
```

4. After the Sheet is open under the correct account, click `Extensions -> Apps Script` again.

### Fix B: Use a private/incognito window

1. Open a private/incognito browser window.
2. Login only to the correct Google account.
3. Open the Google Sheet link.
4. Click `Extensions -> Apps Script`.

This is often the easiest fix when Google keeps forcing the wrong account.

### Fix C: Sign out of the wrong account temporarily

1. Click the Google profile icon.
2. Sign out of the wrong account or switch profile.
3. Open the Sheet using the correct account.
4. Try `Extensions -> Apps Script` again.

Important: the Apps Script project should be created and authorized by the same account that owns or controls the Google Sheet. Otherwise the daily trigger and email report may run under the wrong account.

## 2. Create the sheets and default settings

In Apps Script, run:

```text
setupListingHunterSpreadsheet
```

Google will ask for permission. Approve it using Jeff's Google account.

This creates these tabs:

- `SETTINGS`
- `OWNER_DATABASE`
- `TODAY_QUEUE`
- `MUDAH_LEADS`
- `ACTIVE_LISTINGS`
- `AD_COPY`
- `RUN_LOG`

## 3. Fill the settings

Open the `SETTINGS` tab and update:

| Key | What to fill |
|---|---|
| `REPORT_EMAIL` | Jeff's email address |
| `JEFF_PHONE` | Jeff's WhatsApp/phone number |
| `MUDAH_SEARCH_URLS` | One Mudah search URL per line |
| `MUDAH_TARGET_AREAS` | Areas to keep, e.g. Puchong, Taman Kinrara, Bukit Jalil, Subang Jaya, USJ |
| `MUDAH_TARGET_TYPES` | Commercial/industrial keywords to keep, e.g. Commercial, Industrial, Factory, Warehouse, Shop, Office |
| `MUDAH_MAX_DAILY_LEADS` | Maximum new Mudah leads to save per run |
| `MUDAH_DETAIL_CHECK_ENABLED` | `TRUE` to open each Mudah detail page before saving a lead |
| `MUDAH_REQUIRE_PRIVATE_ADVERTISER` | `TRUE` to save only leads with Private advertiser / owner signal |
| `MUDAH_DETAIL_CHECK_LIMIT` | Maximum Mudah detail pages to verify per run |

Keep the safety settings first:

- `OWNER_DAILY_LIMIT = 30`
- `MAX_PER_PROPERTY = 30`
- `MIN_DAYS_BETWEEN_CONTACT = 14`

## 4. Add owner database

Paste imported contacts into `OWNER_DATABASE`.

Minimum required columns:

- `Phone`
- `Property Name`
- `Property Type`
- `Contact Status`
- `Do Not Contact`

Recommended values:

- `Contact Status`: `Not Contacted`, `Sent`, `Replied`, `Not Interested`, `Do Not Contact`, `Wrong Number`
- `Do Not Contact`: `Yes` or blank
- `Property Type`: `Condo`, `Commercial`, `Industrial`

## If a function is missing from the dropdown

If the Apps Script dropdown does not show `importRawContactsToOwnerDatabase`, the pasted code is an older copy.

Quick check: near the top of `Code.gs`, `importRawContactsToOwnerDatabase` should appear before `generateAdCopyForActiveListings`. If it is missing, replace the whole `Code.gs` content with the latest `apps-script/Code.js`, save, and refresh the Google Sheet.

The latest script also adds a Google Sheet menu named `Listing Hunter` after refresh. Use:

```text
Listing Hunter -> 2. Import raw contacts
```

instead of hunting for the Apps Script function dropdown.

## Import raw Excel contacts after Google Drive import

If Jeff imports an Excel file and it appears as raw tabs like `SEND` / `SMS Blasting Format` with columns such as `Name`, `Address`, and `Telephone`, run this function once before generating the daily queue:

```text
importRawContactsToOwnerDatabase
```

What it does:

- Scans non-system tabs for `Name` and `Telephone` columns.
- Copies contacts into the proper `OWNER_DATABASE` tab.
- Adds `Property Name = The Cruise Residence` when detected from the sheet title/header.
- Adds `Property Type = Condo` and `Area = Puchong`.
- Converts phone numbers like `129409838` into WhatsApp format `60129409838`.

Phone numbers in imported Excel files often lose the leading `0`. That is OK for WhatsApp links because Malaysia WhatsApp links should use country code `60` without the first `0`.

## V1.1 Mudah Lead Recovery settings

V1.1 keeps useful low-confidence Mudah candidates instead of dropping every low score result. This prevents `Mudah Leads Found = 0` when Apps Script can see listings but the first scoring pass is too strict. V1.2 then opens each listing detail page to reject obvious agents and keep only Private advertiser / owner signals when `MUDAH_REQUIRE_PRIVATE_ADVERTISER = TRUE`.

Recommended settings for Jeff's commercial / industrial focus:

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

How V1.1 classifies Mudah leads:

| Category | Meaning |
|---|---|
| `High Chance Owner` | Detail page shows Private advertiser / owner signal, target area/type, and price qualifies. |
| `Possible Owner` | Detail page shows private/owner signal but still needs manual check. |
| `Need Manual Check` | Useful commercial/industrial candidate when private-only mode is disabled. |
| `Low Confidence` | Useful enough to review only when private-only mode is disabled. |
| `Agent - Reject` | Detail page shows Property agent / REN / company signal; not written to `MUDAH_LEADS`. |
| `Skip` | Junk/generic/room rental/irrelevant or below price threshold; not written to `MUDAH_LEADS`. |

For best results, use manually copied Mudah search URLs for each area/type combination rather than asking the script to build URLs automatically.

Example search URL plan:

- Puchong commercial rent/sale
- Puchong industrial rent/sale
- Bukit Jalil commercial rent/sale
- Taman Kinrara commercial rent/sale
- Subang Jaya / USJ commercial rent/sale


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

## 5. Test one daily report manually

Run:

```text
runDailyListingHunterAgent
```

Expected result:

- `TODAY_QUEUE` is filled with up to 30 WhatsApp links.
- `MUDAH_LEADS` receives new possible owner listing links if Mudah allows fetching.
- Jeff receives an email report if `REPORT_EMAIL` is set.

## 6. Schedule the daily agent

Run:

```text
createDailyTrigger
```

The script will run every day around 9am in the spreadsheet timezone.

## Important safety notes

- This v1 does **not** auto-send WhatsApp messages.
- This v1 does **not** login to Mudah.
- This v1 does **not** read WhatsApp replies.
- It prepares links, messages, owner leads, and reports only.
- If an owner says no, mark `Do Not Contact = Yes` immediately.


## V1.2 Private advertiser recovery patch

Jeff reported that some V1.1 `High Chance Owner` leads were actually agents. The cause was that the search-result page often has only title/price/type text; the clear `Property agent`, `REN`, company name, or `Private advertiser` label appears on the listing detail page.

V1.2 changes the rule:

1. The scanner opens each candidate detail page when `MUDAH_DETAIL_CHECK_ENABLED = TRUE`.
2. If the detail page shows `Property agent`, `Contact Agent`, `REN`, company / firm / agency signals, the lead becomes `Agent - Reject` and is not saved.
3. If `MUDAH_REQUIRE_PRIVATE_ADVERTISER = TRUE`, the lead must show `Private advertiser` / owner signal before it can be saved.
4. Rent leads must meet `MUDAH_MIN_RENT` and sale leads must meet `MUDAH_MIN_SALE` before saving.
5. If you want sale leads, paste at least one Mudah `for sale` search URL into `MUDAH_SEARCH_URLS`; rent URLs only produce rent leads.

## Mobile Action Dashboard MVP

The Mobile Action Dashboard is a simple Apps Script Web App for Jeff's phone. It uses the existing `TODAY_QUEUE` and `OWNER_DATABASE` sheets, so Jeff can process today's WhatsApp queue without opening Google Sheets.

### What it does

- Shows today's queued owners and WhatsApp click-to-send links.
- Lets Jeff mark a contact as `Sent`, `Replied`, `No Reply`, `Not Interested`, or `Do Not Contact`.
- Lets Jeff add a short reply note and interest type.
- Updates `TODAY_QUEUE.Queue Status` and the matching `OWNER_DATABASE` row.
- Adds an `Open Today Action Dashboard` button to the daily email after the Web App URL is saved in `ACTION_DASHBOARD_URL`.

### Settings

Add or confirm these settings:

| Key | Value |
|---|---|
| `ACTION_DASHBOARD_URL` | Paste the deployed Web App URL here. |
| `DASHBOARD_ENABLED` | `TRUE` |
| `MUDAH_SCAN_ENABLED` | `FALSE` if Jeff is pausing Mudah. |

### Deploy as Web App

1. Open the Apps Script project.
2. Click **Deploy** → **New deployment**.
3. Select **Web app**.
4. Description: `Jeff Action Dashboard`.
5. Execute as: **Me**.
6. Who has access: choose the safest option available for Jeff's Google account. If available, use **Only myself**. If not available, use **Anyone with Google account** and do not share the link publicly.
7. Click **Deploy** and authorize if Google asks.
8. Copy the Web App URL.
9. Paste it into `SETTINGS` → `ACTION_DASHBOARD_URL`.
10. Run `runDailyListingHunterAgent` or wait for the next daily trigger.

### Daily use

1. Open the daily email.
2. Tap **Open Today Action Dashboard**.
3. Tap **Open WhatsApp** for each owner.
4. After sending, tap **Mark Sent**.
5. If the owner replies, choose an interest type, add a short note, then tap **Replied**.
6. If the owner says no or asks not to be contacted, tap **Not Interested** or **Do Not Contact**.

The dashboard still follows Jeff's safety rule: it prepares and records work only. Jeff manually reviews and sends WhatsApp messages.

---

## V1.2 Queue Safety + Batch + Record setup

V1.2 changes the owner outreach system so testing does not destroy the queue.

### Important behavior

- `Run daily report now` no longer clears today’s queue if rows already exist.
- Morning / Afternoon / Evening batches append rows for today.
- `Reset today queue (careful)` is the only menu item intended to clear today’s queue.
- The mobile dashboard is the source of truth for marking `Sent`, `Replied`, `No Reply`, `Not Interested`, and `Do Not Contact`.
- `Last Queued Date` means the system prepared the contact.
- `Last Contact Date` means Jeff marked the contact as actually sent/contacted.

### Required settings

Confirm these rows exist in `SETTINGS` after pasting the latest code and running setup:

```text
MUDAH_SCAN_ENABLED = FALSE
MORNING_QUEUE_LIMIT = 25
AFTERNOON_QUEUE_LIMIT = 25
EVENING_QUEUE_LIMIT = 25
DAILY_MAX_CONTACTS = 75
MIN_DAYS_BETWEEN_CONTACT = 14
MAX_PER_PROPERTY = 30
```

### Create the automatic schedule

Use the Google Sheet menu:

```text
Listing Hunter -> 4. Create 9am/3pm/5pm/9pm triggers
```

This replaces the old single 9am trigger and creates:

- 9am: Morning owner queue
- 3pm: Afternoon owner queue
- 5pm: Evening owner queue
- 9pm: summary report

### Target listing control

The new `TARGET_LISTINGS` sheet controls which property list is active.

- `Active`: system can queue owners for this target.
- `Waiting`: saved for later.
- `Paused`: temporarily skip.
- `Completed`: finished for now.

To switch projects, change the current active row to `Completed` or `Paused`, then set the next row to `Active`.

### Phone filtering

The system only creates WhatsApp links for Malaysia mobile numbers that normalize to:

```text
6011, 6012, 6013, 6014, 6016, 6017, 6018, 6019
```

Landline / office numbers such as `603...` are skipped and marked in `OWNER_DATABASE` with:

- `Phone Type`
- `Phone Valid For WhatsApp`
- `Phone Notes`

### Daily usage

1. Open the email report.
2. Tap `Open Today Action Dashboard`.
3. Tap `Open WhatsApp` for each contact.
4. After sending, return to the dashboard and tap `Mark Sent`.
5. If the owner replies, mark `Replied` and add a short note.
6. At 9pm, read the summary report to see how many were queued, sent, replied, still not sent, and how many contacts remain.

### Dashboard blank screen fix behavior

V1.2 dashboard now renders server-side data first. If the browser cannot refresh with `google.script.run`, Jeff should still see one of these visible states instead of a blank page:

- summary tiles and queue cards,
- `No queue yet` with instructions,
- or `Dashboard data connection failed` with the error text.

After pasting this version, deploy the Web App as a **New version** again.
