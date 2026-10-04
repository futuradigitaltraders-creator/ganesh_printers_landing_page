// Email one confirmed order PDF to the fixed business owner. Does not allocate
// an ID, change payment status, or send a customer confirmation.
function sendOwnerRequestPdf(data,lock) {
  const owner='ganeshprint.kodai1976@gmail.com',orderId=String(data.orderId||'');
  if(!/^[0-9]{4,12}$/.test(orderId)||!Array.isArray(data.items)||!data.customer)throw Error('Invalid request');
  lock.waitLock(20000);
  const book=SpreadsheetApp.openById(SHEET_ID);
  if(!ownsOrderReservation(book,orderId,data.requestKey))throw Error('Order not verified');
  const orders=book.getSheetByName(TAB_NAME),customers=book.getSheetByName('Customer Details 2026');
  if(!orders||orders.getLastRow()<2||!customers||customers.getLastRow()<2)throw Error('Order not found');
  const rows=orders.getRange(2,1,orders.getLastRow()-1,9).getValues().filter(row=>String(row[0])===orderId);
  const client=customers.getRange(2,1,customers.getLastRow()-1,8).getDisplayValues().find(row=>row[0]===orderId);
  const clean=value=>String(value||'').replace(/^'/,'').trim();
  if(!client||['name','mobile','address','city'].some((key,i)=>clean(data.customer[key])!==clean(client[[2,3,4,5][i]]))||rows.length!==data.items.length)throw Error('Saved details changed');
  const seen={};
  for(const item of data.items){
    const row=rows.find(row=>Number(row[2])===Number(item.serial));
    if(!row||seen[item.serial]||Number(row[4])!==Number(item.qty)||Math.abs(Number(row[5])-Number(item.price))>0.001)throw Error('Saved items changed');
    seen[item.serial]=true;
  }
  const ledger=book.getSheetByName('Order Request Emails 2026')||book.insertSheet('Order Request Emails 2026');
  if(ledger.getLastRow()===0){ledger.appendRow(['Order ID','Recipient','Status','Updated at']);ledger.setFrozenRows(1);}
  const previous=ledger.getLastRow()>1?ledger.getRange(2,1,ledger.getLastRow()-1,4).getDisplayValues():[];
  const found=previous.findIndex(row=>row[0]===orderId),status=found>=0?previous[found][2]:'';
  if(['Sent','Sending'].includes(status))return jsonReply({ok:true,requestEmailVerified:true,orderId,emailStatus:status.toLowerCase(),duplicate:true});
  if(data.checkOnly)return jsonReply({ok:true,requestEmailVerified:true,orderId,emailStatus:'ready'});
  if(PropertiesService.getScriptProperties().getProperty('INVOICE_EMAIL_ENABLED')!=='true')throw Error('Email setup required');
  if(typeof data.pdfBase64!=='string'||data.pdfBase64.length>4000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(data.pdfBase64))throw Error('Invalid PDF');
  const bytes=Utilities.base64Decode(data.pdfBase64);
  if(bytes.length<20||bytes.length>3000000||bytes.slice(0,5).map(b=>String.fromCharCode((b+256)%256)).join('')!=='%PDF-')throw Error('Invalid PDF');
  const today=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  if(previous.filter(row=>row[3].startsWith(today)&&['Sent','Sending'].includes(row[2])).length>=50||MailApp.getRemainingDailyQuota()<1)throw Error('Daily email limit reached');
  const ledgerRow=found>=0?found+2:ledger.getLastRow()+1;
  ledger.getRange(ledgerRow,1).setNumberFormat('@');
  ledger.getRange(ledgerRow,1,1,4).setValues([[orderId,owner,'Sending',Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm:ss')]]);
  SpreadsheetApp.flush();
  // Keep Sending on an ambiguous mail failure. Retrying must not send a second
  // copy after a crash between MailApp acceptance and the ledger acknowledgement.
  const clientEmail=clean(client[7]);
  const message={to:owner,name:'FUTURA WEBSITE',subject:'FUTURA — Client Order Request '+orderId+' | '+clean(client[2]),
    body:'Client order request\n\nOrder ID: '+orderId+'\nClient: '+clean(client[2])+'\nClient Email: '+(clientEmail||'Not provided')+'\nMobile: '+clean(client[3])+'\nCity & Pincode: '+clean(client[5])+'\nAddress: '+clean(client[4])+'\n\nSelected products, quantities and rates are attached as a PDF.\n\nI am ready to make payment. Please check stock availability and send me the payment details.\n\nThis is an order request. Payment has not been confirmed.',
    attachments:[Utilities.newBlob(bytes,'application/pdf','FUTURA_Request_'+orderId+'.pdf')]};
  if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail))message.replyTo=clientEmail;
  MailApp.sendEmail(message);
  ledger.getRange(ledgerRow,3).setValue('Sent');
  return jsonReply({ok:true,requestEmailVerified:true,orderId,emailStatus:'sent'});
}
