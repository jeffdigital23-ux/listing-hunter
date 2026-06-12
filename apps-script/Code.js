/**
 * Jeff Listing Hunter Agent v1
 * Google Apps Script for Google Sheet + daily email workflow.
 *
 * Main functions:
 * - setupListingHunterSpreadsheet(): create required sheets and default settings.
 * - runDailyListingHunterAgent(): generate Today 30 queue, scan Mudah links, email report.
 */

const SHEETS = {
  settings: 'SETTINGS',
  owners: 'OWNER_DATABASE',
  queue: 'TODAY_QUEUE',
  mudah: 'MUDAH_LEADS',
  active: 'ACTIVE_LISTINGS',
  copy: 'AD_COPY',
  log: 'RUN_LOG',
  diagnostics: 'MUDAH_DIAGNOSTICS',
  targets: 'TARGET_LISTINGS',
};

const HEADERS = {
  SETTINGS: ['Key', 'Value', 'Notes'],
  OWNER_DATABASE: [
    'Owner ID', 'Owner Name', 'Phone', 'WhatsApp Phone', 'Property Name', 'Area',
    'Property Type', 'Source', 'Contact Status', 'Last Contact Date', 'Last Queued Date',
    'Next Follow Up Date', 'Do Not Contact', 'Owner Reply', 'Interest', 'Asking Price',
    'Asking Rent', 'Can Advertise', 'Dropbox/Drive Folder Link', 'Notes',
    'Phone Type', 'Phone Valid For WhatsApp', 'Phone Notes'
  ],
  TODAY_QUEUE: [
    'Queue Date', 'Batch', 'No', 'Owner ID', 'Owner Name', 'Phone', 'WhatsApp Phone',
    'Property Name', 'Property Type', 'Message', 'WhatsApp Link', 'Queue Status',
    'Reason', 'Generated At', 'Action Updated At'
  ],
  MUDAH_LEADS: [
    'Date Found', 'Source', 'Title', 'Area', 'Property Type', 'Price/Rent', 'Poster Type',
    'Owner Score', 'Owner Category', 'URL', 'Suggested Message', 'Status', 'Notes'
  ],
  ACTIVE_LISTINGS: [
    'Created Date', 'Property Name', 'Area', 'Property Type', 'For Rent/Sale', 'Asking Price',
    'Asking Rent', 'Owner Name', 'Phone', 'Listing Status', 'Can Advertise', 'Photos Received',
    'Next Action', 'Next Follow Up Date', 'Folder Link', 'Notes'
  ],
  AD_COPY: [
    'Created Date', 'Property Name', 'Platform', 'Language', 'Title', 'Copy', 'CTA', 'Status'
  ],
  RUN_LOG: ['Run Time', 'Queue Count', 'Mudah Leads Found', 'Email Sent To', 'Notes'],
  TARGET_LISTINGS: [
    'Target ID', 'Priority', 'Target Name', 'Area', 'Property Type', 'Status', 'Daily Limit',
    'Total Contacts', 'Queued', 'Sent', 'Replied', 'Do Not Contact', 'Remaining', 'Notes'
  ],
  MUDAH_DIAGNOSTICS: [
    'Run Time', 'URL', 'HTTP Status', 'Content Length', 'Page Title', 'Has JSON-LD',
    'Has Private Advertiser Text', 'Has Property Agent Text', 'Candidate Count', 'Kept Count',
    'Skipped Count', 'Sample Candidate Titles', 'Response Preview', 'Error'
  ],
};

const DEFAULT_SETTINGS = [
  ['AGENT_ENABLED', 'TRUE', 'Set FALSE to stop daily reports without deleting triggers.'],
  ['OWNER_DAILY_LIMIT', '30', 'Fallback maximum owner WhatsApp links for manual runs.'],
  ['MORNING_QUEUE_LIMIT', '25', '9:00 AM owner contacts.'],
  ['AFTERNOON_QUEUE_LIMIT', '25', '3:00 PM owner contacts.'],
  ['EVENING_QUEUE_LIMIT', '25', '5:00 PM owner contacts.'],
  ['DAILY_MAX_CONTACTS', '75', 'Maximum queued contacts per day across all batches.'],
  ['MAX_PER_PROPERTY', '30', 'Allow up to 30 contacts from one building when testing with a single condo list. Lower this when multiple projects are loaded.'],
  ['MIN_DAYS_BETWEEN_CONTACT', '14', 'Skip owners contacted/queued too recently.'],
  ['REPORT_EMAIL', '', 'Jeff email address for daily report. Required before scheduling.'],
  ['JEFF_NAME', 'Jeff', 'Sender name used in messages.'],
  ['JEFF_COMPANY', 'Showcase Properties S/B', 'Company name used in messages.'],
  ['JEFF_PHONE', '012-6600613', 'Shown in ad copy and reports.'],
  ['TARGET_AREA', 'Puchong', 'Primary focus area.'],
  ['MUDAH_SEARCH_URLS', 'https://www.mudah.my/selangor-puchong/properties-for-rent\nhttps://www.mudah.my/selangor-puchong/properties-for-sale', 'One public Mudah search URL per line.'],
  ['MUDAH_SCAN_ENABLED', 'FALSE', 'Mudah is paused by default. Set TRUE only if you intentionally want to test Mudah scanning.'],
  ['MUDAH_TARGET_AREAS', 'Puchong\nTaman Kinrara\nBukit Jalil\nSubang Jaya\nUSJ', 'Areas to keep for Mudah leads. One per line or comma separated.'],
  ['MUDAH_TARGET_TYPES', 'Commercial\nIndustrial\nFactory\nWarehouse\nShop\nShop lot\nOffice', 'Property types/keywords to keep for Mudah leads. One per line or comma separated.'],
  ['MUDAH_MIN_RENT', '1500', 'Minimum rental lead value.'],
  ['MUDAH_MIN_SALE', '1000000', 'Minimum sale lead value.'],
  ['MUDAH_MAX_DAILY_LEADS', '30', 'Maximum new Mudah leads to add per run.'],
  ['MUDAH_DETAIL_CHECK_ENABLED', 'TRUE', 'Open each Mudah listing page to verify Private advertiser / agent signals before saving.'],
  ['MUDAH_REQUIRE_PRIVATE_ADVERTISER', 'TRUE', 'Only save Mudah leads with Private advertiser / owner signal.'],
  ['MUDAH_DETAIL_CHECK_LIMIT', '40', 'Maximum Mudah listing detail pages to check per run.'],
  ['ACTION_DASHBOARD_URL', '', 'Paste deployed Apps Script Web App URL here so daily emails can link to the mobile action dashboard.'],
  ['DASHBOARD_ENABLED', 'TRUE', 'Set FALSE to temporarily hide the mobile action dashboard.'],
];


function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Listing Hunter')
    .addItem('1. Setup sheets', 'setupListingHunterSpreadsheet')
    .addItem('2. Import raw contacts', 'importRawContactsToOwnerDatabase')
    .addItem('3. Run daily report now', 'runDailyListingHunterAgent')
    .addItem('4. Create 9am/3pm/5pm/9pm triggers', 'createDailyBatchTriggers')
    .addItem('Run morning batch now', 'runMorningOwnerQueue')
    .addItem('Run afternoon batch now', 'runAfternoonOwnerQueue')
    .addItem('Run evening batch now', 'runEveningOwnerQueue')
    .addItem('Send 9pm summary now', 'sendNightlySummaryReport')
    .addItem('Sync target listings', 'syncTargetListingsFromOwnerDatabase')
    .addItem('Reset today queue (careful)', 'resetTodayQueue')
    .addItem('Show dashboard setup note', 'showDashboardSetupNote')
    .addItem('Diagnose Mudah scan', 'diagnoseMudahScan')
    .addItem('Generate ad copy drafts', 'generateAdCopyForActiveListings')
    .addToUi();
}

function setupListingHunterSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach((sheetName) => {
    const sheet = getOrCreateSheet_(ss, sheetName);
    ensureHeaders_(sheet, HEADERS[sheetName]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, HEADERS[sheetName].length);
  });

  const settingsSheet = ss.getSheetByName(SHEETS.settings);
  ensureDefaultSettings_(settingsSheet);
  syncTargetListingsFromOwnerDatabase_(ss);

  logRun_(0, 0, '', 'Setup completed. Fill OWNER_DATABASE and REPORT_EMAIL, then run runDailyListingHunterAgent().');
}

function runDailyListingHunterAgent() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupRequiredSheets_(ss);
  const settings = getSettings_(ss);

  if (String(settings.AGENT_ENABLED).toUpperCase() !== 'TRUE') {
    logRun_(0, 0, settings.REPORT_EMAIL || '', 'Agent disabled in SETTINGS.');
    return;
  }

  let queueRows = getTodayQueueRows_(ss).map((item) => item.row);
  let note = 'Manual report resent existing queue without rebuilding.';
  if (!queueRows.length) {
    queueRows = appendOwnerQueueBatch_(ss, settings, 'Manual', Number(settings.OWNER_DAILY_LIMIT || 30));
    note = `Manual report generated ${queueRows.length} contacts.`;
  }
  const mudahRows = String(settings.MUDAH_SCAN_ENABLED).toUpperCase() === 'TRUE'
    ? scanMudahLeads_(ss, settings)
    : [];

  sendDailyReport_(settings, queueRows, mudahRows, 'Manual Daily Report', note);
  logRun_(queueRows.length, mudahRows.length, settings.REPORT_EMAIL || '', note);
}

function runMorningOwnerQueue() {
  return runOwnerQueueBatch_('Morning', 'MORNING_QUEUE_LIMIT');
}

function runAfternoonOwnerQueue() {
  return runOwnerQueueBatch_('Afternoon', 'AFTERNOON_QUEUE_LIMIT');
}

function runEveningOwnerQueue() {
  return runOwnerQueueBatch_('Evening', 'EVENING_QUEUE_LIMIT');
}

function runOwnerQueueBatch_(batchName, limitSettingKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupRequiredSheets_(ss);
  const settings = getSettings_(ss);
  if (String(settings.AGENT_ENABLED).toUpperCase() !== 'TRUE') {
    logRun_(0, 0, settings.REPORT_EMAIL || '', `Agent disabled. ${batchName} batch not generated.`);
    return [];
  }
  const existingBatchRows = getTodayQueueRows_(ss, batchName).map((item) => item.row);
  const limit = Number(settings[limitSettingKey] || 25);
  const batchRows = existingBatchRows.length ? existingBatchRows : appendOwnerQueueBatch_(ss, settings, batchName, limit);
  const note = existingBatchRows.length
    ? `${batchName} batch already existed; report resent without rebuilding.`
    : `${batchName} batch generated ${batchRows.length} contacts.`;
  sendDailyReport_(settings, batchRows, [], `${batchName} Owner Queue`, note);
  logRun_(batchRows.length, 0, settings.REPORT_EMAIL || '', note);
  return batchRows;
}

function createDailyTrigger() {
  createDailyBatchTriggers();
}

function createDailyBatchTriggers() {
  const managedFunctions = ['runDailyListingHunterAgent', 'runMorningOwnerQueue', 'runAfternoonOwnerQueue', 'runEveningOwnerQueue', 'sendNightlySummaryReport'];
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (managedFunctions.indexOf(trigger.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(trigger);
  });
  [
    ['runMorningOwnerQueue', 9],
    ['runAfternoonOwnerQueue', 15],
    ['runEveningOwnerQueue', 17],
    ['sendNightlySummaryReport', 21],
  ].forEach(([fn, hour]) => {
    ScriptApp.newTrigger(fn).timeBased().everyDays(1).atHour(hour).create();
  });
  logRun_(0, 0, getSettings_(SpreadsheetApp.getActiveSpreadsheet()).REPORT_EMAIL || '', 'Created 9am, 3pm, 5pm queue triggers and 9pm summary trigger.');
}

function importRawContactsToOwnerDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupRequiredSheets_(ss);
  const ownersSheet = ss.getSheetByName(SHEETS.owners);
  const ownerHeaders = HEADERS.OWNER_DATABASE;
  const existingPhones = getExistingValues_(ownersSheet, 'WhatsApp Phone');
  const importedRows = [];

  ss.getSheets().forEach((sheet) => {
    const sheetName = sheet.getName();
    if (Object.values(SHEETS).indexOf(sheetName) >= 0) return;
    const values = sheet.getDataRange().getValues();
    const parsed = parseRawContactSheet_(values, sheetName);
    importedRows.push(...parsed.filter((row) => {
      const whatsappPhone = row[3];
      if (!whatsappPhone || existingPhones[whatsappPhone]) return false;
      existingPhones[whatsappPhone] = true;
      return true;
    }));
  });

  if (importedRows.length) {
    ownersSheet.getRange(ownersSheet.getLastRow() + 1, 1, importedRows.length, ownerHeaders.length).setValues(importedRows);
  }
  logRun_(0, 0, '', `Imported ${importedRows.length} raw contacts into OWNER_DATABASE.`);
}

function parseRawContactSheet_(values, sheetName) {
  const rows = [];
  let headerRowIndex = -1;
  let nameCol = -1;
  let addressCol = -1;
  let phoneCol = -1;

  values.forEach((row, index) => {
    if (headerRowIndex >= 0) return;
    const normalized = row.map((cell) => String(cell || '').trim().toLowerCase());
    nameCol = normalized.indexOf('name');
    addressCol = normalized.indexOf('address');
    phoneCol = normalized.indexOf('telephone');
    if (nameCol >= 0 && phoneCol >= 0) headerRowIndex = index;
  });

  if (headerRowIndex < 0) return rows;
  const propertyName = detectPropertyName_(values, sheetName);

  values.slice(headerRowIndex + 1).forEach((row, index) => {
    const ownerName = cleanText_(row[nameCol]);
    const phone = cleanText_(row[phoneCol]);
    const phoneInfo = analyzeMalaysiaPhone_(phone);
    const whatsappPhone = phoneInfo.normalized;
    if (!ownerName && !phone) return;
    const address = addressCol >= 0 ? cleanText_(row[addressCol]) : '';
    const ownerId = `${propertyName.replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toUpperCase()}-${index + 1}`;
    rows.push([
      ownerId, ownerName, phone, whatsappPhone, propertyName, 'Puchong',
      'Condo', `Imported: ${sheetName}`, 'Not Contacted', '', '', '', '', '', '', '',
      '', 'Pending', '', address, phoneInfo.type, phoneInfo.valid ? 'Yes' : 'No', phoneInfo.notes,
    ]);
  });

  return rows;
}

function detectPropertyName_(values, fallback) {
  for (let i = 0; i < Math.min(values.length, 5); i += 1) {
    for (let j = 0; j < values[i].length; j += 1) {
      const text = cleanText_(values[i][j]);
      if (/cruise residence/i.test(text)) return 'The Cruise Residence';
      if (text && /residence|condo|apartment|pavilion|skypod|setiawalk/i.test(text)) return text;
    }
  }
  return fallback || 'Unknown Property';
}


function showDashboardSetupNote() {
  SpreadsheetApp.getUi().alert('Dashboard setup', 'Deploy this Apps Script as a Web App, then paste the Web App URL into SETTINGS → ACTION_DASHBOARD_URL. After that, the daily email will include an Open Today Action Dashboard button.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupRequiredSheets_(ss);
  const settings = getSettings_(ss);
  if (String(settings.DASHBOARD_ENABLED || 'TRUE').toUpperCase() !== 'TRUE') {
    return HtmlService.createHtmlOutput('<h2>Jeff Action Dashboard is disabled</h2><p>Set DASHBOARD_ENABLED = TRUE in SETTINGS to enable it.</p>')
      .setTitle('Jeff Action Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  let initialData;
  try {
    initialData = getActionDashboardData();
  } catch (err) {
    initialData = {
      ok: false,
      generatedAt: new Date().toISOString(),
      queue: [],
      summary: {total: 0, sent: 0, replied: 0, pending: 0, dnc: 0},
      health: {
        spreadsheetName: ss.getName(),
        serverTime: new Date().toISOString(),
        todayQueueCount: 0,
        activeTargetCount: 0,
        dashboardEnabled: settings.DASHBOARD_ENABLED || 'TRUE',
      },
      error: err && err.message ? err.message : String(err),
    };
  }

  return HtmlService.createHtmlOutput(buildActionDashboardHtml_(initialData))
    .setTitle('Jeff Action Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getActionDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupRequiredSheets_(ss);
  const settings = getSettings_(ss);
  const queueSheet = ss.getSheetByName(SHEETS.queue);
  const values = queueSheet.getDataRange().getValues();
  if (values.length < 2) {
    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      queue: [],
      summary: getDashboardSummary_(ss),
      settings,
      health: getDashboardHealth_(ss, 0, settings),
    };
  }
  const headers = values[0];
  const todayKey = dateKey_(new Date());
  const queue = values.slice(1)
    .map((row, index) => ({row, rowNumber: index + 2}))
    .filter((item) => item.row.join('') && dateKey_(item.row[headers.indexOf('Queue Date')]) === todayKey)
    .map((entry, index) => {
    const item = rowToObject_(headers, entry.row);
    return {
      rowNumber: entry.rowNumber,
      queueDate: formatDashboardDate_(item['Queue Date']),
      batch: item.Batch || '',
      no: item.No || index + 1,
      ownerId: item['Owner ID'] || '',
      ownerName: item['Owner Name'] || '',
      phone: item.Phone || '',
      whatsappPhone: item['WhatsApp Phone'] || '',
      propertyName: item['Property Name'] || '',
      propertyType: item['Property Type'] || '',
      message: item.Message || '',
      whatsappLink: item['WhatsApp Link'] || '',
      queueStatus: item['Queue Status'] || 'To Send',
      reason: item.Reason || '',
    };
  });
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    queue,
    summary: getDashboardSummary_(ss),
    settings,
    health: getDashboardHealth_(ss, queue.length, settings),
  };
}

function getDashboardHealth_(ss, todayQueueCount, settings) {
  let activeTargetCount = 0;
  try {
    const targets = getActiveTargets_(ss);
    activeTargetCount = targets ? targets.length : 0;
  } catch (err) {
    activeTargetCount = 0;
  }
  return {
    spreadsheetName: ss.getName(),
    serverTime: new Date().toISOString(),
    todayQueueCount: todayQueueCount || 0,
    activeTargetCount,
    dashboardEnabled: settings && settings.DASHBOARD_ENABLED || 'TRUE',
  };
}

function updateDashboardAction(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupRequiredSheets_(ss);
  const action = String(payload && payload.action || '').trim();
  const ownerId = String(payload && payload.ownerId || '').trim();
  const queueRowNumber = Number(payload && payload.queueRowNumber || 0);
  const note = cleanText_(payload && payload.note || '');
  const interest = cleanText_(payload && payload.interest || '');
  if (!action || !ownerId) return {ok: false, message: 'Missing action or owner ID.'};

  const ssLock = LockService.getDocumentLock();
  ssLock.waitLock(10000);
  try {
    const ownersSheet = ss.getSheetByName(SHEETS.owners);
    const queueSheet = ss.getSheetByName(SHEETS.queue);
    const ownerValues = ownersSheet.getDataRange().getValues();
    const ownerHeaders = ownerValues[0];
    const ownerRowIndex = ownerValues.findIndex((row, index) => index > 0 && String(row[ownerHeaders.indexOf('Owner ID')] || '') === ownerId);
    if (ownerRowIndex < 1) return {ok: false, message: `Owner not found: ${ownerId}`};

    const ownerRowNumber = ownerRowIndex + 1;
    const today = new Date();
    const updates = getDashboardOwnerUpdates_(action, note, interest, today);
    Object.keys(updates).forEach((header) => setCellByHeader_(ownersSheet, ownerHeaders, ownerRowNumber, header, updates[header]));

    if (queueRowNumber > 1) {
      const queueHeaders = queueSheet.getRange(1, 1, 1, HEADERS.TODAY_QUEUE.length).getValues()[0];
      setCellByHeader_(queueSheet, queueHeaders, queueRowNumber, 'Queue Status', getDashboardQueueStatus_(action));
      setCellByHeader_(queueSheet, queueHeaders, queueRowNumber, 'Reason', note ? `${getDashboardQueueStatus_(action)}: ${note}` : getDashboardQueueStatus_(action));
      setCellByHeader_(queueSheet, queueHeaders, queueRowNumber, 'Action Updated At', today);
    }
    updateTargetListingSummaries_(ss);

    return {ok: true, message: `Updated ${ownerId} as ${getDashboardQueueStatus_(action)}.`};
  } finally {
    ssLock.releaseLock();
  }
}

function getDashboardOwnerUpdates_(action, note, interest, date) {
  const updates = {'Last Contact Date': date};
  if (note) updates['Owner Reply'] = note;
  if (interest) updates.Interest = interest;
  if (action === 'sent') updates['Contact Status'] = 'Sent';
  else if (action === 'replied') updates['Contact Status'] = 'Replied';
  else if (action === 'no_reply') updates['Contact Status'] = 'No Reply';
  else if (action === 'not_interested') {
    updates['Contact Status'] = 'Not Interested';
    updates.Interest = 'No';
  } else if (action === 'do_not_contact') {
    updates['Contact Status'] = 'Do Not Contact';
    updates['Do Not Contact'] = 'Yes';
    updates.Interest = 'No';
  } else {
    updates['Contact Status'] = action;
  }
  return updates;
}

function getDashboardQueueStatus_(action) {
  const labels = {
    sent: 'Sent',
    replied: 'Replied',
    no_reply: 'No Reply',
    not_interested: 'Not Interested',
    do_not_contact: 'Do Not Contact',
  };
  return labels[action] || action;
}

function getDashboardSummary_(ss) {
  const queueSheet = ss.getSheetByName(SHEETS.queue);
  const values = queueSheet.getDataRange().getValues();
  if (values.length < 2) return {total: 0, sent: 0, replied: 0, pending: 0, dnc: 0};
  const headers = values[0];
  const statusCol = headers.indexOf('Queue Status');
  const queueDateCol = headers.indexOf('Queue Date');
  const todayKey = dateKey_(new Date());
  const todayRows = values.slice(1).filter((row) => row.join('') && dateKey_(row[queueDateCol]) === todayKey);
  const statuses = todayRows.map((row) => String(row[statusCol] || 'To Send').toLowerCase());
  const batchCol = headers.indexOf('Batch');
  const batches = {};
  todayRows.forEach((row) => {
    const batch = batchCol >= 0 ? String(row[batchCol] || 'Manual') : 'Manual';
    batches[batch] = (batches[batch] || 0) + 1;
  });
  return {
    total: statuses.length,
    sent: statuses.filter((status) => status === 'sent').length,
    replied: statuses.filter((status) => status === 'replied').length,
    pending: statuses.filter((status) => status === 'to send').length,
    dnc: statuses.filter((status) => status === 'do not contact').length,
    batches,
  };
}

function setCellByHeader_(sheet, headers, rowNumber, headerName, value) {
  const col = headers.indexOf(headerName) + 1;
  if (col > 0) sheet.getRange(rowNumber, col).setValue(value);
}

function formatDashboardDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !Number.isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value || '');
}

function buildActionDashboardHtml_(initialData) {
  const data = initialData || {ok: false, error: 'Dashboard data was not prepared.'};
  const initialJson = dashboardJson_(data);
  const generatedText = data && data.generatedAt ? `Updated ${data.generatedAt}` : 'Dashboard loaded from server';
  const debugHtml = buildDashboardHealthHtml_(data);
  const summaryHtml = buildDashboardSummaryHtml_(data);
  const queueHtml = buildDashboardQueueHtml_(data);
  return `
<!doctype html>
<html>
<head>
  <base target="_top">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{font-family:Arial,sans-serif;margin:0;background:#f6f8fb;color:#1f1f1f}header{position:sticky;top:0;background:#0b57d0;color:#fff;padding:14px 16px;z-index:2}h1{font-size:20px;margin:0}.wrap{padding:14px}.summary{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px}.tile{background:#fff;border-radius:12px;padding:12px;box-shadow:0 1px 4px #d7dce5}.tile b{font-size:22px}.card{background:#fff;border-radius:14px;padding:14px;margin-bottom:12px;box-shadow:0 1px 5px #d7dce5}.muted{color:#666;font-size:13px}.property{font-weight:bold;font-size:16px}.msg{white-space:pre-wrap;background:#f1f4f9;border-radius:10px;padding:10px;margin:10px 0;font-size:13px}.btn{display:inline-block;border:0;border-radius:10px;padding:10px 12px;margin:4px 3px;background:#e8eefc;color:#0b57d0;font-weight:bold;text-decoration:none}.btn.primary{background:#0b57d0;color:#fff}.btn.warn{background:#fde8e8;color:#b42318}.btn.ok{background:#e7f6ec;color:#067647}.controls{margin-top:8px}textarea,select{width:100%;box-sizing:border-box;border:1px solid #ccd3df;border-radius:10px;padding:10px;margin-top:8px}.status{font-size:12px;border-radius:999px;padding:4px 8px;background:#eef2f7;display:inline-block}.toast{position:fixed;left:12px;right:12px;bottom:12px;background:#202124;color:#fff;border-radius:10px;padding:12px;display:none}.error{background:#fff1f0;color:#b42318;border:1px solid #fecdca}.debug{font-size:12px;color:#555;background:#eef2f7;border-radius:10px;padding:10px;margin-bottom:12px}button:disabled{opacity:.5}
  </style>
</head>
<body>
  <header><h1>Jeff Action Dashboard</h1><div id="generated" class="muted" style="color:#dbe7ff">${escapeHtmlServer_(generatedText)}</div></header>
  <div class="wrap">
    <div id="debug" class="debug">${debugHtml}</div>
    <div id="summary" class="summary">${summaryHtml}</div>
    <div id="queue">${queueHtml}</div>
  </div>
  <div id="toast" class="toast"></div>
<script>
const INITIAL_DASHBOARD_DATA=${initialJson};
const actionLabels={sent:'Mark Sent',replied:'Replied',no_reply:'No Reply',not_interested:'Not Interested',do_not_contact:'Do Not Contact'};
function init(){
  setTimeout(refreshData, 250);
}
function refreshData(){
  if(typeof google==='undefined'||!google.script||!google.script.run){
    setConnectionNote('Server-rendered data is showing. Live refresh is not available in this browser session.');
    return;
  }
  google.script.run.withSuccessHandler(render).withFailureHandler(showError).getActionDashboardData();
}
function setConnectionNote(note){
  const debug=document.getElementById('debug');
  if(debug && note){debug.innerHTML=debug.innerHTML+'<br>'+escapeHtml(note);}
}
function render(data){
  if(!data||!data.ok){showError(data&&data.error?data.error:'Unable to load dashboard data');return;}
  document.getElementById('generated').textContent='Updated '+new Date(data.generatedAt).toLocaleString();
  renderHealth(data.health||{}, data.queue||[]);
  const s=data.summary||{};
  document.getElementById('summary').innerHTML=[['Total',s.total||0],['Pending',s.pending||0],['Sent',s.sent||0],['Replied',s.replied||0]].map(([k,v])=>'<div class="tile"><div class="muted">'+k+'</div><b>'+v+'</b></div>').join('');
  const queue=data.queue||[];
  document.getElementById('queue').innerHTML=queue.length?queue.map(cardHtml).join(''):'<div class="card"><b>No queue yet.</b><br><span class="muted">Run: Listing Hunter → Run morning batch now. If it still shows 0, check TARGET_LISTINGS Active status and phone validity.</span></div>';
}
function renderHealth(h, queue){
  document.getElementById('debug').innerHTML='Sheet: '+escapeHtml(h.spreadsheetName||'')+'<br>Server time: '+escapeHtml(h.serverTime||'')+'<br>Today queue rows: '+escapeHtml(h.todayQueueCount==null?queue.length:h.todayQueueCount)+'<br>Active targets: '+escapeHtml(h.activeTargetCount==null?'':h.activeTargetCount)+'<br>Dashboard enabled: '+escapeHtml(h.dashboardEnabled||'TRUE');
}
function cardHtml(item){
  const safeId=String(item.ownerId||'').replace(/[^A-Za-z0-9_-]/g,'_');
  return '<div class="card" id="card-'+safeId+'">'
    +'<div><span class="status">'+escapeHtml(item.queueStatus||'To Send')+'</span> <span class="muted">'+escapeHtml(item.batch||'Manual')+' #'+escapeHtml(item.no)+'</span></div>'
    +'<div class="property">'+escapeHtml(item.propertyName||'Unknown property')+'</div>'
    +'<div class="muted">'+escapeHtml(item.ownerName||'Owner')+' · '+escapeHtml(item.phone||'')+' → '+escapeHtml(item.whatsappPhone||'')+' · '+escapeHtml(item.propertyType||'')+'</div>'
    +'<div class="msg">'+escapeHtml(item.message||'')+'</div>'
    +'<a class="btn primary" href="'+escapeAttr(item.whatsappLink||'#')+'" target="_blank">Open WhatsApp</a>'
    +'<div class="controls">'
      +'<select id="interest-'+safeId+'"><option value="">Interest / Reply Type</option><option>Want Rent</option><option>Want Sell</option><option>Maybe</option><option>No</option></select>'
      +'<textarea id="note-'+safeId+'" rows="2" placeholder="Short note, e.g. owner wants rent RM1800"></textarea>'
      +Object.keys(actionLabels).map(action=>'<button class="btn '+(action==='do_not_contact'||action==='not_interested'?'warn':action==='replied'?'ok':'')+'" onclick="updateAction(\''+safeId+'\',\''+escapeJs(item.ownerId)+'\','+Number(item.rowNumber)+',\''+action+'\')">'+actionLabels[action]+'</button>').join('')
    +'</div></div>';
}
function updateAction(safeId,ownerId,rowNumber,action){
  if(typeof google==='undefined'||!google.script||!google.script.run){showError('Cannot update from this browser session because google.script.run is unavailable. Open the dashboard while signed in to the same Google account.');return;}
  const note=document.getElementById('note-'+safeId).value;
  const interest=document.getElementById('interest-'+safeId).value;
  showToast('Updating...');
  google.script.run.withSuccessHandler(res=>{if(!res.ok){showError(res.message);return;}showToast('Updated');refreshData();}).withFailureHandler(showError).updateDashboardAction({ownerId,rowNumber,action,note,interest});
}
function showError(err){
  const msg=err&&err.message?err.message:String(err||'Unknown dashboard error');
  document.getElementById('queue').innerHTML='<div class="card error"><b>Dashboard data connection failed</b><br>'+escapeHtml(msg)+'</div>'+document.getElementById('queue').innerHTML;
  document.getElementById('debug').innerHTML='Error shown at '+new Date().toLocaleString();
  showToast(msg);
}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',3500);}
function escapeHtml(v){return String(v||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function escapeAttr(v){return escapeHtml(v);}
function escapeJs(v){return String(v||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
init();
</script>
</body>
</html>`;
}

function buildDashboardSummaryHtml_(data) {
  if (!data || !data.ok) return '<div class="tile"><div class="muted">Error</div><b>!</b></div>';
  const summary = data.summary || {};
  return [
    ['Total', summary.total || 0],
    ['Pending', summary.pending || 0],
    ['Sent', summary.sent || 0],
    ['Replied', summary.replied || 0],
  ].map(([label, value]) => `<div class="tile"><div class="muted">${escapeHtmlServer_(label)}</div><b>${escapeHtmlServer_(value)}</b></div>`).join('');
}

function buildDashboardHealthHtml_(data) {
  const health = data && data.health || {};
  if (!data || !data.ok) {
    return `Dashboard error: ${escapeHtmlServer_(data && data.error || 'Unknown error')}<br>Server time: ${escapeHtmlServer_(health.serverTime || new Date().toISOString())}`;
  }
  return `Sheet: ${escapeHtmlServer_(health.spreadsheetName || '')}<br>Server time: ${escapeHtmlServer_(health.serverTime || '')}<br>Today queue rows: ${escapeHtmlServer_(health.todayQueueCount == null ? (data.queue || []).length : health.todayQueueCount)}<br>Active targets: ${escapeHtmlServer_(health.activeTargetCount == null ? '' : health.activeTargetCount)}<br>Dashboard enabled: ${escapeHtmlServer_(health.dashboardEnabled || 'TRUE')}<br><span class="muted">Initial data is rendered by the server. Buttons use live Google Apps Script connection.</span>`;
}

function buildDashboardQueueHtml_(data) {
  if (!data || !data.ok) {
    return `<div class="card error"><b>Dashboard data connection failed</b><br>${escapeHtmlServer_(data && data.error || 'Unknown dashboard error')}</div>`;
  }
  const queue = data.queue || [];
  if (!queue.length) {
    return '<div class="card"><b>No queue yet.</b><br><span class="muted">Run: Listing Hunter → Run morning batch now. If it still shows 0, check TARGET_LISTINGS Active status and phone validity.</span></div>';
  }
  return queue.map(buildDashboardQueueCardHtml_).join('');
}

function buildDashboardQueueCardHtml_(item) {
  const safeId = String(item.ownerId || '').replace(/[^A-Za-z0-9_-]/g, '_');
  const buttonHtml = [
    ['sent', 'Mark Sent', ''],
    ['replied', 'Replied', 'ok'],
    ['no_reply', 'No Reply', ''],
    ['not_interested', 'Not Interested', 'warn'],
    ['do_not_contact', 'Do Not Contact', 'warn'],
  ].map(([action, label, tone]) => {
    return `<button class="btn ${tone}" onclick="updateAction('${escapeJsStringServer_(safeId)}','${escapeJsStringServer_(item.ownerId)}',${Number(item.rowNumber || 0)},'${action}')">${escapeHtmlServer_(label)}</button>`;
  }).join('');
  return `<div class="card" id="card-${escapeAttrServer_(safeId)}">
    <div><span class="status">${escapeHtmlServer_(item.queueStatus || 'To Send')}</span> <span class="muted">${escapeHtmlServer_(item.batch || 'Manual')} #${escapeHtmlServer_(item.no || '')}</span></div>
    <div class="property">${escapeHtmlServer_(item.propertyName || 'Unknown property')}</div>
    <div class="muted">${escapeHtmlServer_(item.ownerName || 'Owner')} · ${escapeHtmlServer_(item.phone || '')} → ${escapeHtmlServer_(item.whatsappPhone || '')} · ${escapeHtmlServer_(item.propertyType || '')}</div>
    <div class="msg">${escapeHtmlServer_(item.message || '')}</div>
    <a class="btn primary" href="${escapeAttrServer_(item.whatsappLink || '#')}" target="_blank">Open WhatsApp</a>
    <div class="controls">
      <select id="interest-${escapeAttrServer_(safeId)}"><option value="">Interest / Reply Type</option><option>Want Rent</option><option>Want Sell</option><option>Maybe</option><option>No</option></select>
      <textarea id="note-${escapeAttrServer_(safeId)}" rows="2" placeholder="Short note, e.g. owner wants rent RM1800"></textarea>
      ${buttonHtml}
    </div>
  </div>`;
}

function escapeHtmlServer_(value) {
  return String(value == null ? '' : value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

function escapeAttrServer_(value) {
  return escapeHtmlServer_(value);
}

function escapeJsStringServer_(value) {
  return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function dashboardJson_(data) {
  return JSON.stringify(data || {}).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}


function generateAdCopyForActiveListings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupRequiredSheets_(ss);
  const activeSheet = ss.getSheetByName(SHEETS.active);
  const copySheet = ss.getSheetByName(SHEETS.copy);
  const values = activeSheet.getDataRange().getValues();
  if (values.length < 2) return;

  const headers = values[0];
  const rows = values.slice(1).filter((row) => String(row[9] || '').toLowerCase() !== 'closed');
  const output = [];
  rows.forEach((row) => {
    const item = rowToObject_(headers, row);
    if (!item['Property Name']) return;
    output.push(...buildAdCopyRows_(item));
  });

  if (output.length) {
    copySheet.getRange(copySheet.getLastRow() + 1, 1, output.length, HEADERS.AD_COPY.length).setValues(output);
  }
}

function generateTodayOwnerQueue_(ss, settings) {
  const existingRows = getTodayQueueRows_(ss).map((item) => item.row);
  if (existingRows.length) return existingRows;
  return appendOwnerQueueBatch_(ss, settings, 'Manual', Number(settings.OWNER_DAILY_LIMIT || 30));
}

function appendOwnerQueueBatch_(ss, settings, batchName, batchLimit) {
  syncTargetListingsFromOwnerDatabase_(ss);
  const ownersSheet = ss.getSheetByName(SHEETS.owners);
  const queueSheet = ss.getSheetByName(SHEETS.queue);
  const values = ownersSheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  const today = startOfDay_(new Date());
  const todayRows = getTodayQueueRows_(ss);
  const dailyMax = Number(settings.DAILY_MAX_CONTACTS || settings.OWNER_DAILY_LIMIT || 75);
  const remainingDailySlots = Math.max(0, dailyMax - todayRows.length);
  const limit = Math.min(Number(batchLimit || 25), remainingDailySlots);
  if (limit <= 0) return [];

  const maxPerProperty = Number(settings.MAX_PER_PROPERTY || 30);
  const minDays = Number(settings.MIN_DAYS_BETWEEN_CONTACT || 14);
  const selected = [];
  const propertyCounts = getTodayPropertyCounts_(todayRows);
  const queuedOwnerIds = getTodayQueuedOwnerIds_(todayRows);
  const activeTargets = getActiveTargets_(ss);
  const generatedAt = new Date();

  values.slice(1).forEach((row, index) => {
    if (selected.length >= limit) return;
    const owner = rowToObject_(headers, row);
    const rowNumber = index + 2;
    const eligibility = getOwnerEligibility_(owner, today, minDays, propertyCounts, maxPerProperty, queuedOwnerIds, activeTargets);
    updateOwnerPhoneQuality_(ownersSheet, headers, rowNumber, eligibility.phoneInfo);
    if (!eligibility.ok) return;

    const message = buildOwnerMessage_(owner, settings);
    const whatsappPhone = eligibility.phoneInfo.normalized;
    const link = buildWhatsAppLink_(whatsappPhone, message);
    const ownerId = owner['Owner ID'] || `OWNER-${rowNumber}`;
    const no = todayRows.length + selected.length + 1;

    selected.push([
      today, batchName, no, ownerId, owner['Owner Name'] || '', owner.Phone || '', whatsappPhone,
      owner['Property Name'] || '', owner['Property Type'] || '', message, link,
      'To Send', eligibility.reason, generatedAt, '',
    ]);

    const propertyKey = getPropertyKey_(owner['Property Name']);
    propertyCounts[propertyKey] = (propertyCounts[propertyKey] || 0) + 1;
    queuedOwnerIds[ownerId] = true;
    updateOwnerQueuedDate_(ownersSheet, headers, rowNumber, today, whatsappPhone, ownerId);
  });

  if (selected.length) {
    queueSheet.getRange(queueSheet.getLastRow() + 1, 1, selected.length, HEADERS.TODAY_QUEUE.length).setValues(selected);
  }
  updateTargetListingSummaries_(ss);
  return selected;
}

function getTodayQueueRows_(ss, batchName) {
  const queueSheet = ss.getSheetByName(SHEETS.queue);
  const values = queueSheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const queueDateCol = headers.indexOf('Queue Date');
  const batchCol = headers.indexOf('Batch');
  const todayKey = dateKey_(new Date());
  return values.slice(1)
    .map((row, index) => ({row, rowNumber: index + 2, item: rowToObject_(headers, row)}))
    .filter((entry) => entry.row.join('') && dateKey_(entry.row[queueDateCol]) === todayKey)
    .filter((entry) => !batchName || String(batchCol >= 0 ? entry.row[batchCol] : '').toLowerCase() === String(batchName).toLowerCase());
}

function getTodayPropertyCounts_(todayRows) {
  return todayRows.reduce((acc, entry) => {
    const item = entry.item || {};
    const key = getPropertyKey_(item['Property Name']);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function getTodayQueuedOwnerIds_(todayRows) {
  return todayRows.reduce((acc, entry) => {
    const item = entry.item || {};
    if (item['Owner ID']) acc[String(item['Owner ID'])] = true;
    return acc;
  }, {});
}

function getPropertyKey_(propertyName) {
  return String(propertyName || 'Unknown').trim().toLowerCase();
}

function resetTodayQueue() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Reset today queue?', 'This will delete today\'s queue rows and clear Last Queued Date for those owners if it is today. Use only when you intentionally want to rebuild today\'s queue.', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupRequiredSheets_(ss);
  const queueSheet = ss.getSheetByName(SHEETS.queue);
  const ownersSheet = ss.getSheetByName(SHEETS.owners);
  const queueValues = queueSheet.getDataRange().getValues();
  if (queueValues.length < 2) return;
  const qHeaders = queueValues[0];
  const todayKey = dateKey_(new Date());
  const ownerIds = {};
  for (let i = queueValues.length - 1; i >= 1; i -= 1) {
    const item = rowToObject_(qHeaders, queueValues[i]);
    if (dateKey_(item['Queue Date']) === todayKey) {
      if (item['Owner ID']) ownerIds[String(item['Owner ID'])] = true;
      queueSheet.deleteRow(i + 1);
    }
  }
  const ownerValues = ownersSheet.getDataRange().getValues();
  const oHeaders = ownerValues[0];
  const ownerIdCol = oHeaders.indexOf('Owner ID');
  const lastQueuedCol = oHeaders.indexOf('Last Queued Date') + 1;
  if (ownerIdCol >= 0 && lastQueuedCol > 0) {
    ownerValues.slice(1).forEach((row, index) => {
      const ownerId = String(row[ownerIdCol] || '');
      if (ownerIds[ownerId] && dateKey_(row[lastQueuedCol - 1]) === todayKey) ownersSheet.getRange(index + 2, lastQueuedCol).clearContent();
    });
  }
  logRun_(0, 0, getSettings_(ss).REPORT_EMAIL || '', 'Today queue reset manually.');
}


function diagnoseMudahScan() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupRequiredSheets_(ss);
  const settings = getSettings_(ss);
  const diagnosticsSheet = ss.getSheetByName(SHEETS.diagnostics);
  const urls = String(settings.MUDAH_SEARCH_URLS || '').split('\n').map((url) => url.trim()).filter(Boolean);
  const rows = [];

  if (!urls.length) {
    rows.push([new Date(), '', 'NO_URLS', 0, '', false, false, false, 0, 0, 0, '', '', 'MUDAH_SEARCH_URLS is empty in SETTINGS.']);
  }

  urls.forEach((url) => {
    const now = new Date();
    try {
      const response = fetchMudahUrl_(url);
      const status = response.getResponseCode();
      const html = response.getContentText() || '';
      const candidates = extractMudahCandidates_(html, url, settings);
      let keptCount = 0;
      let skippedCount = 0;
      const sampleTitles = [];

      candidates.forEach((candidate) => {
        const scored = scoreMudahCandidate_(candidate, settings);
        if (isRecoverableMudahCandidate_(candidate, scored, settings)) keptCount += 1;
        else skippedCount += 1;
        if (sampleTitles.length < 5 && candidate.title) sampleTitles.push(candidate.title);
      });

      rows.push([
        now,
        url,
        status,
        html.length,
        extractHtmlTitle_(html),
        /application\/ld\+json/i.test(html),
        /private advertiser|direct owner|owner|landlord/i.test(html),
        /property agent|ren\s?\d+|negotiator|agency/i.test(html),
        candidates.length,
        keptCount,
        skippedCount,
        sampleTitles.join(' | '),
        cleanText_(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).slice(0, 500),
        status >= 400 ? `HTTP ${status}: Mudah may be blocking Apps Script fetch.` : '',
      ]);
    } catch (err) {
      rows.push([now, url, 'ERROR', 0, '', false, false, false, 0, 0, 0, '', '', err.message]);
    }
  });

  if (rows.length) {
    diagnosticsSheet.getRange(diagnosticsSheet.getLastRow() + 1, 1, rows.length, HEADERS.MUDAH_DIAGNOSTICS.length).setValues(rows);
  }
  logRun_(0, rows.length, settings.REPORT_EMAIL || '', `Mudah diagnostic completed for ${rows.length} URL(s).`);
}

function scanMudahLeads_(ss, settings) {
  const mudahSheet = ss.getSheetByName(SHEETS.mudah);
  const urls = String(settings.MUDAH_SEARCH_URLS || '').split('\n').map((url) => url.trim()).filter(Boolean);
  const existingUrls = getExistingValues_(mudahSheet, 'URL');
  const foundRows = [];
  const maxLeads = Number(settings.MUDAH_MAX_DAILY_LEADS || 30);
  const detailLimit = Number(settings.MUDAH_DETAIL_CHECK_LIMIT || 40);
  let detailChecks = 0;

  urls.forEach((url) => {
    try {
      const response = fetchMudahUrl_(url);
      if (response.getResponseCode() >= 400) return;
      const html = response.getContentText();
      const candidates = extractMudahCandidates_(html, url, settings);
      candidates.forEach((candidate) => {
        if (foundRows.length >= maxLeads) return;
        if (!candidate.url || existingUrls[candidate.url]) return;

        let enriched = candidate;
        if (shouldCheckMudahDetail_(settings) && detailChecks < detailLimit) {
          enriched = enrichMudahCandidateFromDetail_(candidate, settings);
          detailChecks += 1;
        }

        const scored = scoreMudahCandidate_(enriched, settings);
        if (!isRecoverableMudahCandidate_(enriched, scored, settings)) return;
        if (!passesMudahPriceFilter_(enriched, settings)) return;
        const area = inferMudahArea_(enriched, settings);
        const propertyType = inferMudahPropertyType_(enriched, settings);
        const row = [
          new Date(), 'Mudah', enriched.title, area,
          propertyType, enriched.price || '', enriched.posterType || '', scored.score,
          scored.category, enriched.url, buildMudahSuggestedMessage_(enriched, settings), 'New', scored.reason,
        ];
        foundRows.push(row);
        existingUrls[enriched.url] = true;
      });
    } catch (err) {
      logRun_(0, 0, settings.REPORT_EMAIL || '', `Mudah scan error for ${url}: ${err.message}`);
    }
  });

  if (foundRows.length) {
    mudahSheet.getRange(mudahSheet.getLastRow() + 1, 1, foundRows.length, HEADERS.MUDAH_LEADS.length).setValues(foundRows);
  }
  return foundRows;
}

function extractMudahCandidates_(html, fallbackUrl, settings) {
  const candidates = [];
  const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  jsonLdMatches.forEach((script) => {
    const jsonText = script.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
    try {
      const data = JSON.parse(jsonText);
      const items = Array.isArray(data) ? data : [data];
      flattenJsonLd_(items).forEach((item) => {
        if (!item || !item.name) return;
        candidates.push({
          title: cleanText_(item.name),
          url: absolutizeUrl_(item.url || fallbackUrl),
          price: cleanText_(item.offers && (item.offers.price || item.offers.priceSpecification && item.offers.priceSpecification.price) || ''),
          area: cleanText_(item.address && (item.address.addressLocality || item.address.addressRegion) || ''),
          propertyType: cleanText_(item['@type'] || ''),
          posterType: cleanText_(item.seller && item.seller['@type'] || ''),
        });
      });
    } catch (err) {
      // Ignore invalid JSON-LD blocks.
    }
  });

  if (candidates.length) return dedupeCandidates_(candidates).filter((candidate) => isMudahListingLikeCandidate_(candidate, settings));

  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = cleanText_(match[2].replace(/<[^>]+>/g, ' '));
    const candidate = {title: text.slice(0, 220), url: absolutizeUrl_(href), price: extractPrice_(text), area: '', propertyType: '', posterType: ''};
    if (!isMudahListingLikeCandidate_(candidate, settings)) continue;
    candidates.push(candidate);
  }
  return dedupeCandidates_(candidates).slice(0, 80);
}

function scoreMudahCandidate_(candidate, settings) {
  const text = getMudahCandidateText_(candidate);
  let score = 0;
  const reasons = [];
  const privateSignal = hasMudahPrivateSignal_(text);
  const agentSignal = hasMudahAgentSignal_(text);

  if (privateSignal) { score += 80; reasons.push('private advertiser / owner signal'); }
  if (agentSignal) { score -= 120; reasons.push('agent / REN / company signal'); }
  if (matchesAnyTerm_(text, getSettingList_(settings, 'MUDAH_TARGET_AREAS', ['Puchong', 'Taman Kinrara', 'Bukit Jalil', 'Subang Jaya', 'USJ']))) { score += 15; reasons.push('target area'); }
  if (matchesAnyTerm_(text, getSettingList_(settings, 'MUDAH_TARGET_TYPES', ['Commercial', 'Industrial', 'Factory', 'Warehouse', 'Shop', 'Shop lot', 'Office']))) { score += 20; reasons.push('target commercial/industrial type'); }
  if (/rm\s?[0-9,]+|per month|sq\.?ft|for rent|for sale/.test(text)) { score += 10; reasons.push('listing-like details'); }
  if (passesMudahPriceFilter_(candidate, settings)) { score += 10; reasons.push('price qualifies'); }
  if (isGenericMudahCandidate_(candidate)) { score -= 60; reasons.push('generic/category link'); }
  if (/room|bilik/.test(text)) { score -= 60; reasons.push('room rental'); }

  let category = 'Low Confidence';
  if (agentSignal) category = 'Agent - Reject';
  else if (privateSignal && score >= 90) category = 'High Chance Owner';
  else if (privateSignal) category = 'Possible Owner';
  else if (score >= 25) category = 'Need Manual Check';
  else if (score < 0) category = 'Skip';

  return {score, category, reason: reasons.join(', ')};
}

function isRecoverableMudahCandidate_(candidate, scored, settings) {
  if (!candidate.url || scored.category === 'Skip' || scored.category === 'Agent - Reject') return false;
  if (isGenericMudahCandidate_(candidate)) return false;
  const text = getMudahCandidateText_(candidate);
  if (String(settings.MUDAH_REQUIRE_PRIVATE_ADVERTISER || 'TRUE').toUpperCase() === 'TRUE' && !hasMudahPrivateSignal_(text)) return false;
  const targetTypes = getSettingList_(settings, 'MUDAH_TARGET_TYPES', ['Commercial', 'Industrial', 'Factory', 'Warehouse', 'Shop', 'Shop lot', 'Office']);
  return matchesAnyTerm_(text, targetTypes) || scored.score >= 25;
}

function isMudahListingLikeCandidate_(candidate, settings) {
  if (!candidate.url || isGenericMudahCandidate_(candidate)) return false;
  const text = getMudahCandidateText_(candidate);
  const targetAreas = getSettingList_(settings, 'MUDAH_TARGET_AREAS', ['Puchong', 'Taman Kinrara', 'Bukit Jalil', 'Subang Jaya', 'USJ']);
  const targetTypes = getSettingList_(settings, 'MUDAH_TARGET_TYPES', ['Commercial', 'Industrial', 'Factory', 'Warehouse', 'Shop', 'Shop lot', 'Office']);
  const hasListingDetails = /rm\s?[0-9,]+|per month|sq\.?ft|for rent|for sale/.test(text);
  const hasArea = matchesAnyTerm_(text, targetAreas);
  const hasType = matchesAnyTerm_(text, targetTypes);
  return hasListingDetails && (hasArea || hasType);
}

function isGenericMudahCandidate_(candidate) {
  const title = cleanText_(candidate.title || '').toLowerCase();
  if (title.length < 18) return true;
  return /^(properties|property|properties for rent|properties for sale|all properties|commercial properties|apartments|houses|show more|save search|contact|contact seller|entire malaysia|selangor)$/i.test(title);
}

function getMudahCandidateText_(candidate) {
  return `${candidate.title || ''} ${candidate.url || ''} ${candidate.area || ''} ${candidate.propertyType || ''} ${candidate.posterType || ''} ${candidate.detailText || ''}`.toLowerCase();
}

function inferMudahArea_(candidate, settings) {
  const text = getMudahCandidateText_(candidate);
  const areas = getSettingList_(settings, 'MUDAH_TARGET_AREAS', ['Puchong', 'Taman Kinrara', 'Bukit Jalil', 'Subang Jaya', 'USJ']);
  return areas.find((area) => text.indexOf(area.toLowerCase()) >= 0) || candidate.area || settings.TARGET_AREA || 'Puchong';
}

function inferMudahPropertyType_(candidate, settings) {
  const text = getMudahCandidateText_(candidate);
  const types = getSettingList_(settings, 'MUDAH_TARGET_TYPES', ['Commercial', 'Industrial', 'Factory', 'Warehouse', 'Shop', 'Shop lot', 'Office']);
  return types.find((type) => text.indexOf(type.toLowerCase()) >= 0) || candidate.propertyType || '';
}

function syncTargetListingsFromOwnerDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupRequiredSheets_(ss);
  syncTargetListingsFromOwnerDatabase_(ss);
}

function syncTargetListingsFromOwnerDatabase_(ss) {
  const ownersSheet = ss.getSheetByName(SHEETS.owners);
  const targetSheet = ss.getSheetByName(SHEETS.targets);
  const ownerValues = ownersSheet.getDataRange().getValues();
  if (ownerValues.length < 2) return;
  const ownerHeaders = ownerValues[0];
  const existingTargets = getExistingTargetNames_(targetSheet);
  const newTargets = [];
  ownerValues.slice(1).forEach((row) => {
    const owner = rowToObject_(ownerHeaders, row);
    const targetName = cleanText_(owner['Property Name']);
    if (!targetName || existingTargets[getPropertyKey_(targetName)]) return;
    existingTargets[getPropertyKey_(targetName)] = true;
    newTargets.push([
      makeTargetId_(targetName), Object.keys(existingTargets).length, targetName, owner.Area || '', owner['Property Type'] || '',
      targetSheet.getLastRow() < 2 && !newTargets.length ? 'Active' : 'Waiting', '', '', '', '', '', '', '', 'Auto-created from OWNER_DATABASE.',
    ]);
  });
  if (newTargets.length) targetSheet.getRange(targetSheet.getLastRow() + 1, 1, newTargets.length, HEADERS.TARGET_LISTINGS.length).setValues(newTargets);
  updateTargetListingSummaries_(ss);
}

function getExistingTargetNames_(targetSheet) {
  const values = targetSheet.getDataRange().getValues();
  if (values.length < 2) return {};
  const headers = values[0];
  const targetCol = headers.indexOf('Target Name');
  return values.slice(1).reduce((acc, row) => {
    if (row[targetCol]) acc[getPropertyKey_(row[targetCol])] = true;
    return acc;
  }, {});
}

function makeTargetId_(targetName) {
  return `TARGET-${String(targetName || 'UNKNOWN').replace(/[^A-Za-z0-9]/g, '').slice(0, 16).toUpperCase()}`;
}

function getActiveTargets_(ss) {
  const targetSheet = ss.getSheetByName(SHEETS.targets);
  const values = targetSheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0];
  const targets = values.slice(1).map((row) => rowToObject_(headers, row)).filter((target) => String(target.Status || '').toLowerCase() === 'active');
  return targets.sort((a, b) => Number(a.Priority || 999) - Number(b.Priority || 999));
}

function getOwnerTargetEligibility_(owner, activeTargets) {
  if (activeTargets === null) return {ok: true, reason: 'No target list yet'};
  if (!activeTargets.length) return {ok: false, reason: 'No active target selected'};
  const propertyKey = getPropertyKey_(owner['Property Name']);
  const match = activeTargets.some((target) => getPropertyKey_(target['Target Name']) === propertyKey);
  return match ? {ok: true, reason: 'Active target'} : {ok: false, reason: 'Not in active target'};
}

function updateTargetListingSummaries_(ss) {
  const targetSheet = ss.getSheetByName(SHEETS.targets);
  const ownersSheet = ss.getSheetByName(SHEETS.owners);
  const targetValues = targetSheet.getDataRange().getValues();
  const ownerValues = ownersSheet.getDataRange().getValues();
  if (targetValues.length < 2 || ownerValues.length < 2) return;
  const targetHeaders = targetValues[0];
  const ownerHeaders = ownerValues[0];
  const ownerRows = ownerValues.slice(1).map((row) => rowToObject_(ownerHeaders, row));
  targetValues.slice(1).forEach((row, index) => {
    const target = rowToObject_(targetHeaders, row);
    const rows = ownerRows.filter((owner) => getPropertyKey_(owner['Property Name']) === getPropertyKey_(target['Target Name']));
    const summary = summarizeOwnerRows_(rows);
    const rowNumber = index + 2;
    ['Total Contacts', 'Queued', 'Sent', 'Replied', 'Do Not Contact', 'Remaining'].forEach((header) => {
      setCellByHeader_(targetSheet, targetHeaders, rowNumber, header, summary[header]);
    });
  });
}

function summarizeOwnerRows_(rows) {
  const total = rows.length;
  const queued = rows.filter((owner) => owner['Last Queued Date']).length;
  const sent = rows.filter((owner) => String(owner['Contact Status'] || '').toLowerCase() === 'sent').length;
  const replied = rows.filter((owner) => String(owner['Contact Status'] || '').toLowerCase() === 'replied').length;
  const dnc = rows.filter((owner) => String(owner['Do Not Contact'] || '').toLowerCase() === 'yes' || String(owner['Contact Status'] || '').toLowerCase().includes('do not contact')).length;
  const remaining = rows.filter((owner) => !owner['Last Queued Date'] && !String(owner['Contact Status'] || '').toLowerCase().match(/sent|replied|not interested|wrong number|do not contact/)).length;
  return {'Total Contacts': total, Queued: queued, Sent: sent, Replied: replied, 'Do Not Contact': dnc, Remaining: remaining};
}

function getSettingList_(settings, key, fallback) {
  const raw = String(settings[key] || '').trim();
  const source = raw ? raw : (fallback || []).join('\n');
  return source.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function matchesAnyTerm_(text, terms) {
  return terms.some((term) => text.indexOf(String(term).toLowerCase()) >= 0);
}

function shouldCheckMudahDetail_(settings) {
  return String(settings.MUDAH_DETAIL_CHECK_ENABLED || 'TRUE').toUpperCase() === 'TRUE';
}

function fetchMudahUrl_(url) {
  return UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {'User-Agent': 'Mozilla/5.0 ListingHunter/1.1'},
  });
}

function enrichMudahCandidateFromDetail_(candidate, settings) {
  if (!/mudah\.my\//i.test(candidate.url || '') || !/\.htm(?:$|\?)/i.test(candidate.url || '')) return candidate;
  try {
    const response = fetchMudahUrl_(candidate.url);
    if (response.getResponseCode() >= 400) return candidate;
    const html = response.getContentText() || '';
    const detailText = cleanMudahHtmlText_(html);
    const title = extractMudahDetailTitle_(html) || candidate.title;
    const price = extractPrice_(detailText) || candidate.price;
    return Object.assign({}, candidate, {
      title,
      price,
      posterType: inferMudahPosterType_(detailText),
      detailText: detailText.slice(0, 6000),
    });
  } catch (err) {
    return candidate;
  }
}

function cleanMudahHtmlText_(html) {
  return cleanText_(String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '));
}

function extractMudahDetailTitle_(html) {
  const heading = String(html || '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (heading) return cleanText_(heading[1].replace(/<[^>]+>/g, ' '));
  const title = extractHtmlTitle_(html).replace(/\s*\|\s*Mudah\.my.*$/i, '');
  return cleanText_(title);
}

function inferMudahPosterType_(text) {
  if (hasMudahAgentSignal_(text)) return 'Property agent';
  if (hasMudahPrivateSignal_(text)) return 'Private advertiser';
  return '';
}

function hasMudahPrivateSignal_(text) {
  return /private advertiser|contact owner|direct owner|\bi am owner\b|\bi'm owner\b|hi i am owner|owner\s+(mr|ms|mrs|madam|puan|encik)|landlord|tanpa ejen|no agent/i.test(String(text || ''));
}

function hasMudahAgentSignal_(text) {
  return /property agent|contact agent|\bren\s?\d+\b|negotiator|firm\s*:|realty|realtors|properties\s+s\/?b|estate agent|agency|all ads from this advertiser/i.test(String(text || ''));
}

function passesMudahPriceFilter_(candidate, settings) {
  const price = parseMudahPrice_(candidate.price || candidate.detailText || candidate.title);
  if (!price) return false;
  const mode = getMudahListingMode_(candidate);
  const minRent = Number(settings.MUDAH_MIN_RENT || 1500);
  const minSale = Number(settings.MUDAH_MIN_SALE || 1000000);
  if (mode === 'sale') return price >= minSale;
  if (mode === 'rent') return price >= minRent;
  return price >= minSale || price >= minRent;
}

function parseMudahPrice_(value) {
  const match = String(value || '').match(/RM\s?([0-9,]+(?:\.[0-9]+)?)/i);
  if (!match) return 0;
  return Number(match[1].replace(/,/g, '')) || 0;
}

function getMudahListingMode_(candidate) {
  const text = getMudahCandidateText_(candidate);
  if (/for sale|properties-for-sale|untuk dijual/i.test(text)) return 'sale';
  if (/for rent|properties-for-rent|per month|rental|sewa/i.test(text)) return 'rent';
  const price = parseMudahPrice_(candidate.price || candidate.detailText || candidate.title);
  return price >= 1000000 ? 'sale' : 'rent';
}

function getOwnerEligibility_(owner, today, minDays, propertyCounts, maxPerProperty, queuedOwnerIds, activeTargets) {
  const ownerId = String(owner['Owner ID'] || '');
  if (ownerId && queuedOwnerIds && queuedOwnerIds[ownerId]) return {ok: false, reason: 'Already queued today', phoneInfo: analyzeMalaysiaPhone_(owner['WhatsApp Phone'] || owner.Phone)};

  const targetCheck = getOwnerTargetEligibility_(owner, activeTargets);
  if (!targetCheck.ok) return {ok: false, reason: targetCheck.reason, phoneInfo: analyzeMalaysiaPhone_(owner['WhatsApp Phone'] || owner.Phone)};

  const status = String(owner['Contact Status'] || '').toLowerCase();
  const dnc = String(owner['Do Not Contact'] || '').toLowerCase();
  const phoneInfo = analyzeMalaysiaPhone_(owner['WhatsApp Phone'] || owner.Phone);
  if (dnc === 'yes' || dnc === 'true' || status.includes('do not contact')) return {ok: false, reason: 'Do Not Contact', phoneInfo};
  if (status.includes('not interested') || status.includes('wrong number')) return {ok: false, reason: 'Rejected status', phoneInfo};
  if (!phoneInfo.valid) return {ok: false, reason: phoneInfo.notes || 'Invalid WhatsApp mobile', phoneInfo};

  const propertyKey = getPropertyKey_(owner['Property Name']);
  if ((propertyCounts[propertyKey] || 0) >= maxPerProperty) return {ok: false, reason: 'Property daily cap reached', phoneInfo};

  const nextFollowUp = parseDate_(owner['Next Follow Up Date']);
  if (nextFollowUp && nextFollowUp > today) {
    return {ok: false, reason: 'Follow-up date not due yet', phoneInfo};
  }

  const recentDates = [owner['Last Contact Date'], owner['Last Queued Date']].filter(Boolean);
  for (let i = 0; i < recentDates.length; i += 1) {
    const date = parseDate_(recentDates[i]);
    if (!date) continue;
    const days = daysBetween_(date, today);
    if (days >= 0 && days < minDays) return {ok: false, reason: `Contacted/queued ${days} days ago`, phoneInfo};
  }
  return {ok: true, reason: status ? `Status: ${owner['Contact Status']}` : 'Not contacted', phoneInfo};
}

function buildOwnerMessage_(owner, settings) {
  const name = settings.JEFF_NAME || 'Jeff';
  const company = settings.JEFF_COMPANY || 'Showcase Properties S/B';
  const property = owner['Property Name'] || 'your property';
  const type = String(owner['Property Type'] || '').toLowerCase();

  if (/commercial|shop|office/.test(type)) {
    return `Hi, ${name} here from ${company}. I focus on commercial properties around Puchong. May I know if your unit/shoplot at ${property} is available for rent or sale, or should I update my record as not available? If not relevant, just reply No and I won't disturb again. Thanks.`;
  }
  if (/industrial|factory|warehouse/.test(type)) {
    return `Hi, ${name} here from ${company}. I focus on Puchong industrial properties. Just checking if your factory/warehouse at ${property} is available for rent/sale, or if you may consider in future? If not relevant, just reply No and I won't disturb again. Thanks.`;
  }
  return `Hi, ${name} here from ${company}. I focus on Puchong properties. Just checking if your unit at ${property} is available for rent/sale, or should I mark it as not available? If you prefer not to receive messages, just reply No. Thanks.`;
}

function buildMudahSuggestedMessage_(candidate, settings) {
  const name = settings.JEFF_NAME || 'Jeff';
  const company = settings.JEFF_COMPANY || 'Showcase Properties S/B';
  const title = candidate.title || 'this property';
  return `Hi, ${name} here from ${company}. I focus on Puchong properties. May I know if you are the owner for ${title}, and whether you are open for agent assistance to rent/sell it? Thanks.`;
}

function buildAdCopyRows_(listing) {
  const now = new Date();
  const property = listing['Property Name'];
  const area = listing.Area || 'Puchong';
  const type = listing['Property Type'] || 'Property';
  const mode = listing['For Rent/Sale'] || 'For Rent / Sale';
  const rent = listing['Asking Rent'] ? `Rent: RM${listing['Asking Rent']}` : '';
  const price = listing['Asking Price'] ? `Price: RM${listing['Asking Price']}` : '';
  const details = [type, area, mode, rent, price].filter(Boolean).join(' | ');

  return [
    [now, property, 'iProperty', 'English', `${property} ${mode} in ${area}`, `${details}\n\nWell located property in ${area}. Suitable for buyers/tenants looking for a practical Puchong location. Contact Jeff for details and viewing arrangement.`, 'WhatsApp Jeff 012-6600613', 'Draft'],
    [now, property, 'Facebook', 'English', `${property} ${mode}`, `🔥 ${property}, ${area}\n${details}\n\nPM / WhatsApp Jeff for viewing.`, 'WhatsApp Jeff 012-6600613', 'Draft'],
    [now, property, 'Xiaohongshu', 'Chinese', `${area}好盘｜${property}`, `${property}｜${area}\n${details}\n\n适合正在找Puchong产业的买家/租客。想了解详情或安排看房，可以WhatsApp Jeff。\n#Puchong #蒲种 #MalaysiaProperty #租房 #买房`, 'WhatsApp Jeff 012-6600613', 'Draft'],
  ];
}

function sendNightlySummaryReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupRequiredSheets_(ss);
  const settings = getSettings_(ss);
  const email = settings.REPORT_EMAIL;
  if (!email) return;
  updateTargetListingSummaries_(ss);
  const summary = buildNightlySummary_(ss);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  MailApp.sendEmail({
    to: email,
    subject: `Jeff 9PM Outreach Summary - ${today}`,
    htmlBody: summary,
  });
  logRun_(0, 0, email, '9PM outreach summary sent.');
}

function buildNightlySummary_(ss) {
  const dashboard = getDashboardSummary_(ss);
  const owners = getOwnerDatabaseSummary_(ss);
  const targets = getTargetSummaryRows_(ss);
  const targetHtml = tableHtml_(['Priority', 'Target', 'Status', 'Total', 'Queued', 'Sent', 'Replied', 'DNC', 'Remaining'], targets);
  return `
    <h2>Jeff 9PM Outreach Summary</h2>
    <h3>Today Outreach</h3>
    <ul>
      <li><b>Queued today:</b> ${dashboard.total || 0}</li>
      <li><b>Marked Sent:</b> ${dashboard.sent || 0}</li>
      <li><b>Replied:</b> ${dashboard.replied || 0}</li>
      <li><b>Do Not Contact:</b> ${dashboard.dnc || 0}</li>
      <li><b>Still To Send:</b> ${dashboard.pending || 0}</li>
    </ul>
    <h3>Owner Database</h3>
    <ul>
      <li><b>Total contacts:</b> ${owners.total}</li>
      <li><b>Valid mobile contacts:</b> ${owners.validMobile}</li>
      <li><b>Landline / office skipped:</b> ${owners.landline}</li>
      <li><b>Invalid / need review:</b> ${owners.invalid}</li>
      <li><b>Not contacted / remaining:</b> ${owners.notContacted}</li>
    </ul>
    <h3>Target Listing Progress</h3>
    ${targetHtml || '<p>No target listings yet. Run Sync target listings.</p>'}
    <p style="color:#666">Use the dashboard to mark Sent / Replied / Do Not Contact so this summary stays accurate.</p>
  `;
}

function getOwnerDatabaseSummary_(ss) {
  const sheet = ss.getSheetByName(SHEETS.owners);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return {total: 0, validMobile: 0, landline: 0, invalid: 0, notContacted: 0};
  const headers = values[0];
  const rows = values.slice(1).filter((row) => row.join('')).map((row) => rowToObject_(headers, row));
  return {
    total: rows.length,
    validMobile: rows.filter((owner) => analyzeMalaysiaPhone_(owner['WhatsApp Phone'] || owner.Phone).valid).length,
    landline: rows.filter((owner) => analyzeMalaysiaPhone_(owner['WhatsApp Phone'] || owner.Phone).type === 'Landline/Office').length,
    invalid: rows.filter((owner) => {
      const info = analyzeMalaysiaPhone_(owner['WhatsApp Phone'] || owner.Phone);
      return !info.valid && info.type !== 'Landline/Office';
    }).length,
    notContacted: rows.filter((owner) => !String(owner['Contact Status'] || '').toLowerCase().match(/sent|replied|not interested|wrong number|do not contact/)).length,
  };
}

function getTargetSummaryRows_(ss) {
  const sheet = ss.getSheetByName(SHEETS.targets);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter((row) => row.join('')).map((row) => {
    const target = rowToObject_(headers, row);
    return [target.Priority, target['Target Name'], target.Status, target['Total Contacts'], target.Queued, target.Sent, target.Replied, target['Do Not Contact'], target.Remaining];
  });
}

function sendDailyReport_(settings, queueRows, mudahRows, reportTitle, note) {
  const email = settings.REPORT_EMAIL;
  if (!email) return;
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const subject = `Jeff Listing Hunter ${reportTitle || 'Daily Report'} - ${today}`;
  const body = buildDailyReportBody_(settings, queueRows, mudahRows, reportTitle || 'Daily Report', note || '');
  MailApp.sendEmail({to: email, subject, htmlBody: body});
}

function buildDailyReportBody_(settings, queueRows, mudahRows, reportTitle, note) {
  const queueObjects = rowsToObjects_(HEADERS.TODAY_QUEUE, queueRows);
  const queueHtml = tableHtml_(['Batch', 'No', 'Property', 'Phone', 'Status', 'Message', 'WhatsApp Link'], queueObjects.map((row) => [row.Batch, row.No, row['Property Name'], row['WhatsApp Phone'] || row.Phone, row['Queue Status'], row.Message, `<a href="${row['WhatsApp Link']}">Open WhatsApp</a>`]));
  const mudahHtml = tableHtml_(['Title', 'Price/Rent', 'Owner Score', 'Category', 'Link'], mudahRows.map((row) => [row[2], row[5], row[7], row[8], `<a href="${row[9]}">Open Mudah</a>`]));
  const dashboardHtml = settings.ACTION_DASHBOARD_URL
    ? `<p><a href="${settings.ACTION_DASHBOARD_URL}" style="display:inline-block;background:#0b57d0;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Open Today Action Dashboard</a></p>`
    : '<p style="color:#666">Dashboard URL not set yet. Deploy the Web App, then paste the URL into ACTION_DASHBOARD_URL.</p>';
  const mudahSection = String(settings.MUDAH_SCAN_ENABLED).toUpperCase() === 'TRUE'
    ? `<hr><p><b>New Mudah Owner Leads:</b> ${mudahRows.length}</p>${mudahHtml || '<p>No new Mudah leads found today.</p>'}`
    : '<hr><p style="color:#666"><b>Mudah scanning:</b> disabled.</p>';
  return `
    <h2>Jeff Listing Hunter ${reportTitle || 'Daily Report'}</h2>
    ${note ? `<p><b>Note:</b> ${note}</p>` : ''}
    ${dashboardHtml}
    <p><b>Today WhatsApp Queue:</b> ${queueRows.length}</p>
    ${queueHtml || '<p>No owners selected today. Check OWNER_DATABASE status/dates.</p>'}
    ${mudahSection}
    <p style="color:#666">Reminder: This system prepares links and messages only. Please review and send manually to reduce WhatsApp block risk.</p>
  `;
}

function rowsToObjects_(headers, rows) {
  return (rows || []).map((row) => rowToObject_(headers, row));
}

function setupRequiredSheets_(ss) {
  Object.keys(HEADERS).forEach((sheetName) => ensureHeaders_(getOrCreateSheet_(ss, sheetName), HEADERS[sheetName]));
  ensureDefaultSettings_(ss.getSheetByName(SHEETS.settings));
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeaders_(sheet, headers) {
  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (existing.join('') !== headers.join('')) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function ensureDefaultSettings_(settingsSheet) {
  const values = settingsSheet.getDataRange().getValues();
  const existingKeys = values.slice(1).reduce((acc, row) => {
    if (row[0]) acc[String(row[0])] = true;
    return acc;
  }, {});
  const missing = DEFAULT_SETTINGS.filter((row) => !existingKeys[row[0]]);
  if (settingsSheet.getLastRow() < 2) {
    settingsSheet.getRange(2, 1, DEFAULT_SETTINGS.length, 3).setValues(DEFAULT_SETTINGS);
  } else if (missing.length) {
    settingsSheet.getRange(settingsSheet.getLastRow() + 1, 1, missing.length, 3).setValues(missing);
  }
}

function getSettings_(ss) {
  const sheet = ss.getSheetByName(SHEETS.settings);
  const values = sheet.getDataRange().getValues().slice(1);
  return values.reduce((acc, row) => {
    if (row[0]) acc[row[0]] = row[1];
    return acc;
  }, {});
}

function clearTodayQueue_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, HEADERS.TODAY_QUEUE.length).clearContent();
}

function updateOwnerQueuedDate_(sheet, headers, rowNumber, today, whatsappPhone, ownerId) {
  const lastQueuedCol = headers.indexOf('Last Queued Date') + 1;
  const whatsappCol = headers.indexOf('WhatsApp Phone') + 1;
  const ownerIdCol = headers.indexOf('Owner ID') + 1;
  if (lastQueuedCol) sheet.getRange(rowNumber, lastQueuedCol).setValue(today);
  if (whatsappCol && whatsappPhone) sheet.getRange(rowNumber, whatsappCol).setValue(whatsappPhone);
  if (ownerIdCol && !sheet.getRange(rowNumber, ownerIdCol).getValue()) sheet.getRange(rowNumber, ownerIdCol).setValue(ownerId);
}

function getExistingValues_(sheet, headerName) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return {};
  const col = values[0].indexOf(headerName);
  if (col < 0) return {};
  return values.slice(1).reduce((acc, row) => {
    if (row[col]) acc[row[col]] = true;
    return acc;
  }, {});
}

function rowToObject_(headers, row) {
  return headers.reduce((acc, header, index) => {
    acc[header] = row[index];
    return acc;
  }, {});
}

function normalizeMalaysiaPhone_(phone) {
  return analyzeMalaysiaPhone_(phone).normalized;
}

function analyzeMalaysiaPhone_(phone) {
  const raw = String(phone || '').trim();
  let digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return {normalized: '', type: 'Invalid', valid: false, notes: 'Missing phone'};

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `6${digits}`;
  else if (/^1[1-9][0-9]{7,8}$/.test(digits)) digits = `60${digits}`;
  else if (!digits.startsWith('60')) digits = `60${digits}`;

  if (/^60[3-9]/.test(digits)) return {normalized: digits, type: 'Landline/Office', valid: false, notes: 'Landline or office number skipped'};
  if (/^601[1-9][0-9]{7,8}$/.test(digits)) return {normalized: digits, type: 'Mobile', valid: true, notes: raw.startsWith('0') || raw.startsWith('60') ? 'Valid Malaysia mobile' : 'Valid mobile; leading zero/country code repaired'};
  if (/^601/.test(digits)) return {normalized: digits, type: 'Need Review', valid: false, notes: 'Possible mobile but invalid length'};
  return {normalized: digits, type: 'Invalid', valid: false, notes: 'Not a Malaysia mobile number'};
}

function updateOwnerPhoneQuality_(sheet, headers, rowNumber, phoneInfo) {
  if (!phoneInfo) return;
  setCellByHeader_(sheet, headers, rowNumber, 'WhatsApp Phone', phoneInfo.normalized || '');
  setCellByHeader_(sheet, headers, rowNumber, 'Phone Type', phoneInfo.type || '');
  setCellByHeader_(sheet, headers, rowNumber, 'Phone Valid For WhatsApp', phoneInfo.valid ? 'Yes' : 'No');
  setCellByHeader_(sheet, headers, rowNumber, 'Phone Notes', phoneInfo.notes || '');
}

function buildWhatsAppLink_(phone, message) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function parseDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !Number.isNaN(value.getTime())) return startOfDay_(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay_(date);
}

function startOfDay_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween_(dateA, dateB) {
  return Math.floor((startOfDay_(dateB) - startOfDay_(dateA)) / (24 * 60 * 60 * 1000));
}

function dateKey_(value) {
  const date = parseDate_(value);
  if (!date) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}


function extractHtmlTitle_(html) {
  const match = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanText_(match[1]) : '';
}

function cleanText_(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function extractPrice_(text) {
  const match = String(text || '').match(/RM\s?[0-9,]+(?:\.[0-9]+)?/i);
  return match ? match[0].toUpperCase() : '';
}

function absolutizeUrl_(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `https://www.mudah.my${url}`;
  return url;
}

function dedupeCandidates_(candidates) {
  const seen = {};
  return candidates.filter((candidate) => {
    const key = candidate.url || candidate.title;
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function flattenJsonLd_(items) {
  const output = [];
  items.forEach((item) => {
    if (!item) return;
    if (Array.isArray(item)) output.push(...flattenJsonLd_(item));
    else if (item.itemListElement) output.push(...flattenJsonLd_(item.itemListElement.map((el) => el.item || el)));
    else output.push(item);
  });
  return output;
}

function tableHtml_(headers, rows) {
  if (!rows.length) return '';
  const head = headers.map((header) => `<th style="text-align:left;border:1px solid #ddd;padding:6px">${header}</th>`).join('');
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td style="border:1px solid #ddd;padding:6px;vertical-align:top">${cell || ''}</td>`).join('')}</tr>`).join('');
  return `<table style="border-collapse:collapse;width:100%"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function logRun_(queueCount, mudahCount, email, notes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = getOrCreateSheet_(ss, SHEETS.log);
  ensureHeaders_(logSheet, HEADERS.RUN_LOG);
  logSheet.appendRow([new Date(), queueCount, mudahCount, email, notes]);
}
