const SHEET_ID = '1OEEocJY7Y6sDfaDy9-h481te6qOMfGNJ_jPA7lMxXbU';
const TAB_NAME = 'Website Orders 2026';

function jsonReply(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if(e && e.parameter && e.parameter.action==='trackOrder')return readOrderFollowup(e.parameter);
  return jsonReply({ok: true, service: 'Futura 2026 Crackers Orders', paymentProofUpload: true, customerDetails: true, sequentialOrderIds: true, nextOrderId: peekNextOrderId(), invoiceEmail: PropertiesService.getScriptProperties().getProperty('INVOICE_EMAIL_ENABLED') === 'true', orderTracking: true, paymentScreenshotEmail: PropertiesService.getScriptProperties().getProperty('INVOICE_EMAIL_ENABLED') === 'true', requestEmailPDF: PropertiesService.getScriptProperties().getProperty('INVOICE_EMAIL_ENABLED') === 'true', paymentConfirmation: PropertiesService.getScriptProperties().getProperty('PAYMENT_CONFIRMATION_ENABLED') === 'true', version: '2026-10-04-order-tracking'});
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'requestEmailPDF') return sendOwnerRequestPdf(data, lock);
    if (data.action === 'allocateOrderId') return allocateOrderId(data, lock);
    if (data.action === 'paymentProof') return savePaymentProof(data, lock);
    if (data.action === 'customerDetails') return saveCustomerDetails(data, lock);
    if (!/^(?:[0-9]{4,12}|[A-Za-z0-9_-]{8,80})$/.test(data.orderId || '') ||
        !Array.isArray(data.items) || !data.items.length ||
        data.items.length > 300) throw new Error('Invalid order');
    const now = new Date();
    const rows = data.items.map(item => {
      const serial = Number(item.serial);
      const qty = Number(item.qty);
      const price = Number(item.price);
      const name = String(item.name || '').trim();
      if (!Number.isInteger(serial) || serial < 1 || serial > 300 ||
          !Number.isInteger(qty) || qty < 1 || qty > 10000 ||
          !Number.isFinite(price) || price <= 0 || price > 1000000 ||
          !name || name.length > 250) throw new Error('Invalid item');
      const safeName = /^[=+@-]/.test(name) ? "'" + name : name;
      return [data.orderId, now, serial, safeName, qty, price,
              Math.round(qty * price * 100) / 100, 'Enquiry', safeSheetText(String(item.companyCode || '').slice(0,40))];
    });
    lock.waitLock(20000);
    const book = SpreadsheetApp.openById(SHEET_ID);
    const sheet = book.getSheetByName(TAB_NAME) || book.insertSheet(TAB_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Order ID', 'Date', 'S.No', 'Product',
                       'Qty', 'Unit Price', 'Amount', 'Status', 'Code No']);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    }
    if (sheet.getLastRow() > 1 &&
        sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
          .createTextFinder(data.orderId).matchEntireCell(true).findNext()) {
      return jsonReply({ok: true, orderId: data.orderId, duplicate: true});
    }
    const start = sheet.getLastRow() + 1;
    sheet.getRange(start, 1, rows.length, 1).setNumberFormat('@');
    sheet.getRange(1, 9).setValue('Code No');
    sheet.getRange(start, 1, rows.length, 9).setValues(rows);
    sheet.getRange(start, 2, rows.length, 1)
      .setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sheet.getRange(start, 6, rows.length, 2).setNumberFormat('0.00');
    return jsonReply({ok: true, orderId: data.orderId, items: rows.length});
  } catch (err) {
    return jsonReply({ok: false, error: 'Order could not be saved'});
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function savePaymentProof(data, lock) {
  if (!/^(?:[0-9]{4,12}|[A-Za-z0-9_-]{8,80})$/.test(data.orderId || '') ||
      !/^[A-Za-z0-9_-]{8,80}$/.test(data.proofId || '') ||
      typeof data.imageBase64 !== 'string' || data.imageBase64.length > 1800000 ||
      !['image/jpeg', 'image/png'].includes(data.mimeType)) throw new Error('Invalid proof');
  const bytes = Utilities.base64Decode(data.imageBase64);
  if (bytes.length < 16 || bytes.length > 1200000) throw new Error('Invalid image size');
  const signature = bytes.slice(0, 8).map(b => (b + 256) % 256);
  if (data.mimeType === 'image/jpeg' && (signature[0] !== 255 || signature[1] !== 216)) throw new Error('Invalid JPEG');
  if (data.mimeType === 'image/png' && signature.join(',') !== '137,80,78,71,13,10,26,10') throw new Error('Invalid PNG');
  lock.waitLock(20000);
  const book = SpreadsheetApp.openById(SHEET_ID);
  const orders = book.getSheetByName(TAB_NAME);
  if (!orders || orders.getLastRow() < 2 ||
      !orders.getRange(2, 1, orders.getLastRow() - 1, 1).createTextFinder(data.orderId).matchEntireCell(true).findNext()) throw new Error('Order not found');
  const sheet = book.getSheetByName('Payment Proofs 2026') || book.insertSheet('Payment Proofs 2026');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Proof ID', 'Order ID', 'Uploaded at', 'Status', 'Payment screenshot']);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    sheet.setColumnWidth(1, 330); sheet.setColumnWidth(2, 330);
    sheet.setColumnWidth(3, 170); sheet.setColumnWidth(4, 170); sheet.setColumnWidth(5, 240);
  }
  if (sheet.getLastRow() > 1 &&
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(data.proofId).matchEntireCell(true).findNext()) {
    const followup=ensureOrderFollowup(book,data.orderId);
    return jsonReply({ok: true, proofSaved: true, orderId: data.orderId, proofId: data.proofId, duplicate: true, trackingToken: ownsOrderReservation(book,data.orderId,data.requestKey)?followup.token:undefined, invoiceEmail: deliverOrderInvoice(data.orderId), ownerScreenshotEmail: deliverOwnerPaymentScreenshot(book,data,bytes)});
  }
  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 2).setNumberFormat('@');
  sheet.getRange(row, 1, 1, 5).setValues([[data.proofId, data.orderId, new Date(), 'Receiving', '']]);
  let picture;
  try {
    const blob = Utilities.newBlob(bytes, data.mimeType, data.orderId + '-payment.' + (data.mimeType === 'image/png' ? 'png' : 'jpg'));
    picture = sheet.insertImage(blob, 5, row);
    const ratio = Math.min(220 / picture.getWidth(), 280 / picture.getHeight(), 1);
    const height = Math.round(picture.getHeight() * ratio);
    picture.setWidth(Math.round(picture.getWidth() * ratio)).setHeight(height);
    picture.setAltTextTitle('Payment proof - ' + data.orderId);
    sheet.setRowHeight(row, Math.max(50, height + 12));
    sheet.getRange(row, 3).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sheet.getRange(row, 4).setValue('Pending verification');
    configurePaymentApprovalRow(sheet,row);
    const followup=ensureOrderFollowup(book,data.orderId);
    return jsonReply({ok: true, proofSaved: true, orderId: data.orderId, proofId: data.proofId, trackingToken: ownsOrderReservation(book,data.orderId,data.requestKey)?followup.token:undefined, invoiceEmail: deliverOrderInvoice(data.orderId), ownerScreenshotEmail: deliverOwnerPaymentScreenshot(book,data,bytes)});
  } catch (error) {
    if (picture) picture.remove();
    sheet.deleteRow(row);
    throw error;
  }
}


function safeSheetText(value) {
  const text = String(value || '').trim();
  return /^[=+@-]/.test(text) ? "'" + text : text;
}

function saveCustomerDetails(data, lock) {
  const orderId = String(data.orderId || '').trim();
  const name = String(data.name || '').trim();
  const mobile = String(data.mobile || '').trim();
  const address = String(data.address || '').trim();
  const city = String(data.city || '').trim();
  const email = String(data.email || '').trim();
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Invalid email');

  if (!/^(?:[0-9]{4,12}|[A-Za-z0-9_-]{8,80})$/.test(orderId) ||
      name.length < 2 || name.length > 100 ||
      !/^[0-9+()\-\s]{8,20}$/.test(mobile) ||
      address.length < 5 || address.length > 300 ||
      city.length < 2 || city.length > 100) {
    throw new Error('Invalid customer details');
  }

  lock.waitLock(20000);
  const book = SpreadsheetApp.openById(SHEET_ID);
  const orders = book.getSheetByName(TAB_NAME);
  if (!orders || orders.getLastRow() < 2 ||
      !orders.getRange(2, 1, orders.getLastRow() - 1, 1)
        .createTextFinder(orderId).matchEntireCell(true).findNext()) {
    throw new Error('Order not found');
  }

  const sheet = book.getSheetByName('Customer Details 2026') || book.insertSheet('Customer Details 2026');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Order ID', 'Saved at', 'Client Name', 'Mobile No.', 'Address', 'City', 'Status']);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    sheet.setColumnWidth(1, 330);
    sheet.setColumnWidth(2, 170);
    sheet.setColumnWidth(3, 190);
    sheet.setColumnWidth(4, 150);
    sheet.setColumnWidth(5, 360);
    sheet.setColumnWidth(6, 170);
    sheet.setColumnWidth(7, 180);
  }

  const rowData = [
    orderId,
    new Date(),
    safeSheetText(name),
    safeSheetText(mobile),
    safeSheetText(address),
    safeSheetText(city),
    'Booking Details Received',
    safeSheetText(email)
  ];

  let existing = null;
  if (sheet.getLastRow() > 1) {
    existing = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
      .createTextFinder(orderId).matchEntireCell(true).findNext();
  }

  const row = existing ? existing.getRow() : sheet.getLastRow() + 1;
  sheet.getRange(row, 1).setNumberFormat('@');
  if (sheet.getRange(1, 8).getValue() !== 'Email') sheet.getRange(1, 8).setValue('Email');
  sheet.getRange(row, 1, 1, 8).setValues([rowData]);
  sheet.getRange(row, 2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  sheet.getRange(row, 4).setNumberFormat('@');

  return jsonReply({ok: true, orderId: orderId, customerSaved: true, updated: !!existing});
}


// One shared sequence for all clients. Reservations are separate from orders.
const NUMBER_TAB_NAME = 'Order Numbers 2026';
function readOrderNumbers(book) {
  const sheet = book.getSheetByName(NUMBER_TAB_NAME);
  return sheet && sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues() : [];
}
function nextOrderNumber(rows) {
  return rows.reduce((max, row) => Math.max(max, Number(row[1]) || 0), 100) + 1;
}
function peekNextOrderId() {
  return String(nextOrderNumber(readOrderNumbers(SpreadsheetApp.openById(SHEET_ID)))).padStart(4, '0');
}
function allocateOrderId(data, lock) {
  const requestKey = String(data.requestKey || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(requestKey)) throw new Error('Invalid request key');
  lock.waitLock(20000);
  const book = SpreadsheetApp.openById(SHEET_ID);
  const rows = readOrderNumbers(book);
  const existing = rows.find(row => String(row[0]) === requestKey);
  if (existing) return jsonReply({ok: true, requestKey, orderId: String(existing[1]).padStart(4, '0'), duplicate: true});
  const orderId = String(nextOrderNumber(rows)).padStart(4, '0');
  const sheet = book.getSheetByName(NUMBER_TAB_NAME) || book.insertSheet(NUMBER_TAB_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Request Key', 'Order ID', 'Reserved at']);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  }
  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, 2).setNumberFormat('@');
  sheet.getRange(row, 1, 1, 3).setValues([[requestKey, orderId, new Date()]]);
  sheet.getRange(row, 3).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  SpreadsheetApp.flush();
  return jsonReply({ok: true, requestKey, orderId});
}
