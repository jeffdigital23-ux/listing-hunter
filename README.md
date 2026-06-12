# Listing Hunter

Listing Hunter is Jeff's real estate AI assistant workflow for getting more Puchong property listings with the lowest practical amount of manual work.

## Current Direction

Listing Hunter is now positioned as Jeff's **Listing / Owner Acquisition Backend** inside the larger Jeff AI Real Estate Operating System.

Current priority is no longer Mudah scraping. Mudah scanning should stay disabled unless Jeff intentionally tests it again. The valuable workflow is:

1. Store owner contacts in `OWNER_DATABASE`.
2. Control which property/project is active in `TARGET_LISTINGS`.
3. Generate safe WhatsApp click-to-send queues in 9am / 3pm / 5pm batches.
4. Let Jeff use the mobile dashboard to open WhatsApp and mark Sent / Replied / Do Not Contact.
5. Send a 9pm summary showing total queued, sent, replied, still-to-send, phone quality, and active target progress.

## v1.2 Goals

1. Stop manual report tests from deleting today's queue.
2. Add separate Morning / Afternoon / Evening owner outreach batches.
3. Keep contact-level records: queued vs actually sent vs replied vs DNC.
4. Add target listing control so Jeff can choose which property list is active next.
5. Filter office / house / invalid numbers so only Malaysia mobile numbers receive WhatsApp links.
6. Keep Mudah paused by default.

## v1 Safety Boundaries

This first version intentionally does **not**:

- Auto-send WhatsApp messages.
- Login to Mudah.
- Read WhatsApp replies.
- Bypass WhatsApp or Mudah platform limits.

The agent prepares the daily work; Jeff reviews and sends manually.

## Jeff: What To Do Next

If you are not sure whether the Google Drive setup is already done: it is **not done yet** in Jeff's personal Google Drive. This repository contains the code and setup instructions only.

Use `docs/JEFF_NEXT_STEPS.md` for the simple non-programmer checklist. Jeff only needs to start by creating a Google Drive folder and moving one test Excel file; the remaining Google Sheet / Apps Script setup is a guided technical installation step.

## Main Files

- `apps-script/Code.js` - Google Apps Script implementation for the daily agent.
- `apps-script/appsscript.json` - Apps Script manifest with runtime, timezone, and required Google scopes.
- `docs/SETUP.md` - Step-by-step setup guide.
- `docs/CODEX_INSTALL_LIMITS.md` - Plain-language explanation of what Codex can build here and what still requires Jeff's Google authorization.
- `docs/SHEETS_SCHEMA.md` - Google Sheet tabs and columns.
- `docs/MESSAGE_TEMPLATES.md` - Approved owner outreach templates.


## Mobile Action Dashboard

The v2 direction adds a lightweight Apps Script Web App dashboard on top of the existing Sheet. Jeff can open it from the daily email, tap WhatsApp links, and mark each owner as Sent, Replied, Not Interested, or Do Not Contact without opening Google Sheets.

## Recommended Workflow

1. Create a Google Sheet named `Jeff Listing Hunter`.
2. Paste `apps-script/Code.js` into Google Apps Script.
3. Run `setupListingHunterSpreadsheet`.
4. Import owner lists into `OWNER_DATABASE`.
5. Set Jeff's email in `SETTINGS`.
6. Run `runDailyListingHunterAgent` once for testing.
7. Run `createDailyBatchTriggers` to schedule 9am, 3pm, 5pm queue emails and the 9pm summary.

See `docs/SETUP.md` for detailed setup.
