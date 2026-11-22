/**
 * Murtuza & Zahabiya — Wedding RSVP endpoint
 *
 * Deploy as a Google Apps Script Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Script Property:
 *   RSVP_SPREADSHEET_ID = <Google Sheet ID>
 */

const RSVP_SHEET_NAME = 'RSVPs';
const RSVP_HEADERS = [
  'Name',
  'WhatsApp Number',
  'Arrival Date',
  'Departure Date',
  'Number of Guests',
  'Transport Mode',
  'Submitted At',
  'Last Updated'
];

function doGet() {
  return HtmlService.createHtmlOutput(
    '<p>Murtuza &amp; Zahabiya RSVP endpoint is running.</p>'
  );
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  const nonce = String(params.nonce || '');

  try {
    if (String(params.website || '').trim()) {
      throw new Error('Invalid submission.');
    }

    const record = validateAndNormalise_(params);
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);

    let result;
    try {
      const spreadsheetId = PropertiesService.getScriptProperties()
        .getProperty('RSVP_SPREADSHEET_ID');
      if (!spreadsheetId) {
        throw new Error('The RSVP spreadsheet has not been configured.');
      }

      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      // Reuse either tab name used by the earlier drafts; never silently
      // create a second RSVP tab when one already contains guest records.
      const existingSheets = ['RSVPs', 'RSVP Responses']
        .map(name => spreadsheet.getSheetByName(name))
        .filter(Boolean)
        .sort((a, b) => b.getLastRow() - a.getLastRow());
      let sheet = existingSheets[0];
      if (!sheet) sheet = spreadsheet.insertSheet(RSVP_SHEET_NAME);

      ensureHeaders_(sheet);
      result = upsertRsvp_(sheet, record);
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    return responsePage_({
      ok: true,
      action: result.action,
      message: result.action === 'updated'
        ? 'Your previous RSVP has been updated.'
        : 'Your RSVP has been saved.',
      nonce: nonce
    });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return responsePage_({
      ok: false,
      message: error && error.message
        ? error.message
        : 'We could not save your response. Please try again.',
      nonce: nonce
    });
  }
}

function validateAndNormalise_(p) {
  const name = String(p.guestName || '').trim();
  const rawPhone = normalisePhoneForMatch_(p.whatsappNumber);
  const arrivalDate = String(p.arrivalDate || '').trim();
  const departureDate = String(p.departureDate || '').trim();
  const guestCount = Number(p.guestCount);
  const transportMode = String(p.transportMode || '').trim();

  if (name.length < 2 || name.length > 100) {
    throw new Error('Please enter a valid name.');
  }
  if (!/^\d{10}$/.test(rawPhone)) {
    throw new Error('Please enter a valid 10-digit WhatsApp number.');
  }
  if (!isIsoDate_(arrivalDate) || !isIsoDate_(departureDate)) {
    throw new Error('Please enter valid arrival and departure dates.');
  }
  if (departureDate < arrivalDate) {
    throw new Error('Departure date must be on or after the arrival date.');
  }
  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 30) {
    throw new Error('Guest count must be between 1 and 30.');
  }
  if (!transportMode || transportMode.length > 100) {
    throw new Error('Please enter a valid mode of transport.');
  }

  return {
    name: name,
    phone: rawPhone,
    arrivalDate: arrivalDate,
    departureDate: departureDate,
    guestCount: guestCount,
    transportMode: transportMode
  };
}

function isIsoDate_(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, RSVP_HEADERS.length).setValues([RSVP_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, RSVP_HEADERS.length).setFontWeight('bold');
  } else {
    const currentWidth = Math.max(sheet.getLastColumn(), RSVP_HEADERS.length);
    const existing = sheet.getRange(1, 1, 1, currentWidth).getDisplayValues()[0]
      .map(value => String(value).trim());

    // Migrate the earlier draft's schema by removing its unnecessary ID column.
    if (existing[0] === 'Submission ID' &&
        RSVP_HEADERS.every((header, index) => existing[index + 1] === header)) {
      sheet.deleteColumn(1);
    }

    const actual = sheet.getRange(1, 1, 1, RSVP_HEADERS.length).getDisplayValues()[0]
      .map(value => String(value).trim());
    const matches = RSVP_HEADERS.every((header, index) => actual[index] === header);
    if (!matches) {
      throw new Error(
        'The RSVP tab must have these columns in order: ' + RSVP_HEADERS.join(', ')
      );
    }
  }

  // Keep WhatsApp values as text (and without a country code).
  sheet.getRange('B:B').setNumberFormat('@');
}

function normalisePhoneForMatch_(value) {
  let digits = String(value == null ? '' : value).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

function upsertRsvp_(sheet, record) {
  const lastRow = sheet.getLastRow();
  const target = normalisePhoneForMatch_(record.phone);
  const matchingRows = [];

  if (lastRow >= 2) {
    const phones = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues();
    for (let i = 0; i < phones.length; i++) {
      if (normalisePhoneForMatch_(phones[i][0]) === target) {
        matchingRows.push(i + 2);
      }
    }
  }

  const now = new Date();
  if (matchingRows.length) {
    // Keep the last matching row, remove all earlier duplicates, then update it.
    const keepRow = matchingRows[matchingRows.length - 1];
    const originalSubmittedAt = sheet.getRange(keepRow, 7).getValue() || now;
    matchingRows.slice(0, -1).sort((a, b) => b - a).forEach(row => sheet.deleteRow(row));

    // Recalculate the kept row after deleting rows above it.
    const adjustedRow = keepRow - (matchingRows.length - 1);
    sheet.getRange(adjustedRow, 1, 1, RSVP_HEADERS.length).setValues([[
      record.name,
      record.phone,
      record.arrivalDate,
      record.departureDate,
      record.guestCount,
      record.transportMode,
      originalSubmittedAt,
      now
    ]]);
    return { action: 'updated', row: adjustedRow };
  }

  sheet.appendRow([
    record.name,
    record.phone,
    record.arrivalDate,
    record.departureDate,
    record.guestCount,
    record.transportMode,
    now,
    now
  ]);
  return { action: 'created', row: sheet.getLastRow() };
}

function responsePage_(payload) {
  const safePayload = JSON.stringify(payload).replace(/</g, '\\u003c');
  const message = safePayload.replace(/^\{/, '{"type":"wedding-rsvp-result",');
  const html = [
    '<!doctype html><html><head><meta charset="utf-8"></head><body>',
    '<script>',
    // Apps Script HtmlService can wrap the response in its own iframe.
    // Posting to top avoids sending the result only to Google's wrapper frame.
    'window.top.postMessage(' + message + ', "*");',
    '</script>',
    '<p>RSVP submission processed. You may close this window.</p>',
    '</body></html>'
  ].join('');

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
