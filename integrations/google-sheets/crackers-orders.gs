const SHEET_ID = '1OEEocJY7Y6sDfaDy9-h481te6qOMfGNJ_jPA7lMxXbU';
const TAB_NAME = 'Website Orders 2026';

function jsonReply(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonReply({ok: true, service: 'Futura 2026 Crackers Orders'});
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = JSON.parse(e.postData.contents);
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(data.orderId || '') ||
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
              Math.round(qty * price * 100) / 100, 'Enquiry'];
    });
    lock.waitLock(20000);
    const book = SpreadsheetApp.openById(SHEET_ID);
    const sheet = book.getSheetByName(TAB_NAME) || book.insertSheet(TAB_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Order ID', 'Date', 'S.No', 'Product',
                       'Qty', 'Unit Price', 'Amount', 'Status']);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    }
    if (sheet.getLastRow() > 1 &&
        sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
          .createTextFinder(data.orderId).matchEntireCell(true).findNext()) {
      return jsonReply({ok: true, orderId: data.orderId, duplicate: true});
    }
    const start = sheet.getLastRow() + 1;
    sheet.getRange(start, 1, rows.length, 8).setValues(rows);
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
