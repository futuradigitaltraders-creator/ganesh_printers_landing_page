// Run setupInvoiceEmail once in the existing owner's Apps Script project.
// No public endpoint accepts an email body or an attachment. Invoices are
// built from the saved order and emailed only to its saved customer address.
function setupInvoiceEmail() {
  const quota=MailApp.getRemainingDailyQuota();
  PropertiesService.getScriptProperties().setProperty('INVOICE_EMAIL_ENABLED','true');
  Logger.log('Invoice email enabled. Remaining recipient quota: '+quota);
}

function invoiceEscape(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function invoiceMoney(cents) { return '₹'+(cents/100).toFixed(2); }

function deliverOrderInvoice(orderId) {
  try {
    if(PropertiesService.getScriptProperties().getProperty('INVOICE_EMAIL_ENABLED')!=='true')return 'pending_setup';
    const book=SpreadsheetApp.openById(SHEET_ID),customerSheet=book.getSheetByName('Customer Details 2026'),orderSheet=book.getSheetByName(TAB_NAME);
    if(!customerSheet||customerSheet.getLastRow()<2||!orderSheet||orderSheet.getLastRow()<2)return 'failed';
    const client=customerSheet.getRange(2,1,customerSheet.getLastRow()-1,8).getDisplayValues().find(row=>row[0]===String(orderId));
    const email=client&&client[7].replace(/^'/,'').trim();
    if(!email)return 'no_email';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return 'failed';
    const ledger=book.getSheetByName('Invoice Emails 2026')||book.insertSheet('Invoice Emails 2026');
    if(ledger.getLastRow()===0){ledger.appendRow(['Order ID','Email','Status','Updated at']);ledger.setFrozenRows(1);ledger.getRange(1,1,1,4).setFontWeight('bold');}
    const previous=ledger.getLastRow()>1?ledger.getRange(2,1,ledger.getLastRow()-1,4).getDisplayValues():[];
    const found=previous.findIndex(row=>row[0]===String(orderId));
    if(found>=0&&previous[found][2]==='Sent')return previous[found][1].toLowerCase()===email.toLowerCase()?'sent':'failed';
    if(found>=0&&previous[found][2]==='Sending')return 'sending';
    // Limit automated dispatch to 50 recipients a day and 2 orders per address.
    const today=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
    const attempts=previous.filter(row=>row[3].startsWith(today)&&['Sent','Sending'].includes(row[2]));
    if(attempts.length>=50||attempts.filter(row=>row[1].toLowerCase()===email.toLowerCase()).length>=2||MailApp.getRemainingDailyQuota()<1)return 'failed';
    const rows=orderSheet.getRange(2,1,orderSheet.getLastRow()-1,9).getValues().filter(row=>String(row[0])===String(orderId));
    if(!rows.length)return 'failed';
    const products=rows.map(row=>({serial:row[2],code:String(row[8]||'').replace(/^'/,''),name:String(row[3]).replace(/^'/,''),qty:Number(row[4]),cents:Math.round(Number(row[5])*100)}));
    if(products.some(p=>!Number.isInteger(p.qty)||p.qty<1||!Number.isFinite(p.cents)||p.cents<1))return 'failed';
    const total=products.reduce((sum,p)=>sum+p.qty*p.cents,0);
    const esc=invoiceEscape;
    const lines=products.map(p=>'<tr><td>'+esc(p.serial)+'</td><td>'+esc(p.code||'-')+'</td><td>'+esc(p.name)+'</td><td>'+p.qty+'</td><td>'+invoiceMoney(p.cents)+'</td><td>'+invoiceMoney(p.qty*p.cents)+'</td></tr>').join('');
    const html='<!doctype html><html><head><meta charset="UTF-8"><style>@page{size:A4;margin:20mm 12mm}body{font:11px Arial,sans-serif;color:#2e273f}h1{font-size:23px;margin:0}h2{font-size:16px;color:#34136e}.head{background:#34136e;color:white;padding:20px}.details{background:#f7f3fc;padding:14px;line-height:1.8}.pending,.total,.note{background:#fff7d9;padding:12px;margin:14px 0}table{width:100%;border-collapse:collapse}th{background:#34136e;color:white}td,th{padding:7px;border:1px solid #dbd2ea;text-align:left}tr{page-break-inside:avoid}.total{text-align:right}.foot{background:#34136e;color:white;padding:10px;margin-top:18px}</style></head><body><div class="head"><h1>FUTURA TRADERS</h1>Sivakasi Direct Crackers Dispatch<br>9488917786 | www.futuraonlineprint.in</div><h2>INVOICE / ORDER CONFIRMATION &nbsp; Order ID: '+esc(orderId)+'</h2><div class="details"><b>Client Name:</b> '+esc(client[2].replace(/^'/,''))+'<br><b>Mobile:</b> '+esc(client[3].replace(/^'/,''))+'<br><b>City:</b> '+esc(client[5].replace(/^'/,''))+'<br><b>Address:</b> '+esc(client[4].replace(/^'/,''))+'<br><b>Email:</b> '+esc(email)+'</div><div class="pending"><b>PAYMENT SCREENSHOT RECEIVED</b><br>Payment verification pending. This is not a payment receipt.</div><table><thead><tr><th>S.No</th><th>Code No</th><th>Product</th><th>Qty</th><th>Rate</th><th>Sub-Total</th></tr></thead><tbody>'+lines+'</tbody></table><div class="total">Product Total: '+invoiceMoney(total)+'<br>₹300 Packing &amp; Parcel Forwarding to Lorry Office<br><b>Grand Total: '+invoiceMoney(total+30000)+'</b></div><p><b>Transport:</b> TOPAY — payable at destination.</p><div class="note"><b>Stock replacement:</b> If an ordered item is out of stock, it will be replaced with another item of the same value.</div><p>Direct dispatch from Sivakasi; generally 3–5 days after payment confirmation.</p><div class="foot">Order ID '+esc(orderId)+' | Payment verification pending</div></body></html>';
    const pdf=Utilities.newBlob(html,'text/html','Invoice.html').getAs('application/pdf').setName('FUTURA_Invoice_'+orderId+'.pdf');
    const ledgerRow=found>=0?found+2:ledger.getLastRow()+1;
    const timestamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm:ss');
    ledger.getRange(ledgerRow,1).setNumberFormat('@');ledger.getRange(ledgerRow,1,1,4).setValues([[String(orderId),email,'Sending',timestamp]]);SpreadsheetApp.flush();
    try {
      MailApp.sendEmail({to:email,subject:'FUTURA — Order '+orderId+' | Invoice',body:'Dear '+client[2].replace(/^'/,'')+',\n\nYour payment screenshot for Order '+orderId+' has been received. Payment verification is pending. Your order confirmation invoice is attached.\n\nPacking & Parcel Forwarding to Lorry Office: ₹300. Transport: TOPAY.\n\nFUTURA TRADERS\n9488917786',attachments:[pdf],name:'FUTURA TRADERS'});
      ledger.getRange(ledgerRow,3).setValue('Sent');return 'sent';
    } catch(error) {ledger.getRange(ledgerRow,3).setValue('Failed');return 'failed';}
  } catch(error) {return 'failed';}
}
