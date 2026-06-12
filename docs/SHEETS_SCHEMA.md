# Google Sheet Schema

## OWNER_DATABASE

One owner/contact per row.

| Column | Purpose |
|---|---|
| Owner ID | Auto-filled if blank. |
| Owner Name | Optional. |
| Phone | Original phone number. |
| WhatsApp Phone | Auto-normalized to Malaysia format such as `60126600613`. |
| Property Name | Condo/building/shop/factory name. |
| Area | Puchong, Bandar Puteri, IOI, Kinrara, etc. |
| Property Type | Condo, Commercial, Industrial. |
| Source | Dropbox, Google Drive, Mudah, referral, etc. |
| Contact Status | Not Contacted, Sent, Replied, Not Interested, Do Not Contact, Wrong Number. |
| Last Contact Date | Date Jeff actually sent WhatsApp. |
| Last Queued Date | Date the agent selected this owner. |
| Next Follow Up Date | Optional future follow-up date. |
| Do Not Contact | `Yes` means skip permanently. |
| Owner Reply | Copy/paste short reply notes if available. |
| Interest | Want Rent, Want Sell, Maybe, No. |
| Asking Price | Sale asking price. |
| Asking Rent | Rental asking price. |
| Can Advertise | Yes, No, Pending. |
| Dropbox/Drive Folder Link | Folder for photos/docs. |
| Notes | Free notes. |

## TODAY_QUEUE

Generated fresh each daily run.

| Column | Purpose |
|---|---|
| Queue Date | Date generated. |
| No | Daily running number. |
| Owner ID | Link back to owner row. |
| Owner Name | Optional. |
| Phone | Original phone. |
| Property Name | Building/property name. |
| Property Type | Condo/Commercial/Industrial. |
| Message | Approved WhatsApp message. |
| WhatsApp Link | Click-to-send link. |
| Queue Status | To Send, Sent, Skipped. |
| Reason | Why this owner was selected. |

## MUDAH_LEADS

New possible landlord/owner listings from Mudah.

| Column | Purpose |
|---|---|
| Date Found | Date detected. |
| Source | Mudah. |
| Title | Listing title. |
| Area | Detected/target area. |
| Property Type | Detected type if available. |
| Price/Rent | Detected price if available. |
| Poster Type | Private advertiser / agent signal if available. |
| Owner Score | Heuristic score. |
| Owner Category | High Chance Owner, Possible Owner, Need Manual Check, Low Confidence, Agent - Reject (rejected leads are not saved). |
| URL | Mudah listing/search link. |
| Suggested Message | Mudah inbox message draft. |
| Status | New, Checked, Inbox Sent, Rejected. |
| Notes | Reason and extra notes. |

## ACTIVE_LISTINGS

Listings that have owner reply and can become ads.

## AD_COPY

Draft iProperty, Facebook, and 小红书 copy generated from `ACTIVE_LISTINGS`.

## MUDAH_DIAGNOSTICS

Diagnostic sheet used only when `Mudah Leads Found = 0` and Jeff needs to understand why Mudah scanning is not producing leads.

| Column | Purpose |
|---|---|
| Run Time | Diagnostic run time. |
| URL | Mudah URL tested. |
| HTTP Status | HTTP status returned to Apps Script. |
| Content Length | Length of HTML/text returned to Apps Script. |
| Page Title | `<title>` extracted from returned HTML. |
| Has JSON-LD | Whether `application/ld+json` exists in returned HTML. |
| Has Private Advertiser Text | Whether owner/private text appears in returned HTML. |
| Has Property Agent Text | Whether agent/REN text appears in returned HTML. |
| Candidate Count | Number of candidate listings extracted before scoring. |
| Kept Count | Number of candidates not scored as `Skip`. |
| Skipped Count | Number of candidates scored as `Skip`. |
| Sample Candidate Titles | Up to five extracted candidate titles. |
| Response Preview | First readable part of returned HTML/text. |
| Error | Fetch or diagnostic error, if any. |


## V1.1 Mudah lead categories

| Category | Purpose |
|---|---|
| High Chance Owner | Strongest lead signal. |
| Possible Owner | Good lead but still needs manual review. |
| Need Manual Check | Useful target-area / commercial-industrial candidate. |
| Low Confidence | Preserved for review only when private-only mode is disabled. |
| Agent - Reject | Detail page shows Property agent / REN / company signal; not written to `MUDAH_LEADS`. |
| Skip | Not written to `MUDAH_LEADS`. |

## Mobile Action Dashboard

The dashboard is not a separate sheet. It is a Web App view on top of existing sheets:

- Reads `TODAY_QUEUE` for today's owner action list.
- Updates `TODAY_QUEUE.Queue Status` after Jeff taps dashboard buttons.
- Updates matching `OWNER_DATABASE` rows by `Owner ID`.

Dashboard actions update these fields:

| Action | OWNER_DATABASE updates | TODAY_QUEUE updates |
|---|---|---|
| Mark Sent | `Contact Status = Sent`, `Last Contact Date = today` | `Queue Status = Sent` |
| Replied | `Contact Status = Replied`, `Owner Reply`, `Interest`, `Last Contact Date = today` | `Queue Status = Replied` |
| No Reply | `Contact Status = No Reply`, `Last Contact Date = today` | `Queue Status = No Reply` |
| Not Interested | `Contact Status = Not Interested`, `Interest = No` | `Queue Status = Not Interested` |
| Do Not Contact | `Contact Status = Do Not Contact`, `Do Not Contact = Yes`, `Interest = No` | `Queue Status = Do Not Contact` |

---

## V1.2 additions

### `TARGET_LISTINGS`

Controls which owner list / property project the backend should work on.

| Column | Purpose |
|---|---|
| Target ID | Stable ID generated from the target name. |
| Priority | Jeff can reorder projects by priority. |
| Target Name | Property / project name, e.g. The Cruise Residence, Skyport, Kinrara Shoplot. |
| Area | Target area. |
| Property Type | Condo / Commercial / Industrial etc. |
| Status | `Active`, `Waiting`, `Paused`, or `Completed`. Only `Active` targets are queued. |
| Daily Limit | Optional future per-target limit. |
| Total Contacts | Summary count from `OWNER_DATABASE`. |
| Queued | Owners with a Last Queued Date. |
| Sent | Owners marked Sent. |
| Replied | Owners marked Replied. |
| Do Not Contact | DNC count. |
| Remaining | Contacts not yet worked. |
| Notes | Free notes. |

### `TODAY_QUEUE` V1.2 columns

`TODAY_QUEUE` now keeps rows for the day instead of being destructively rebuilt by every manual report run.

New important columns:

- `Batch`: `Morning`, `Afternoon`, `Evening`, or `Manual`.
- `WhatsApp Phone`: normalized mobile number used in the `wa.me` link.
- `Generated At`: when the queue row was created.
- `Action Updated At`: when Jeff last marked Sent / Replied / DNC in the dashboard.

### `OWNER_DATABASE` V1.2 phone quality columns

- `Phone Type`: `Mobile`, `Landline/Office`, `Need Review`, or `Invalid`.
- `Phone Valid For WhatsApp`: `Yes` / `No`.
- `Phone Notes`: explains repairs or why the number was skipped.
