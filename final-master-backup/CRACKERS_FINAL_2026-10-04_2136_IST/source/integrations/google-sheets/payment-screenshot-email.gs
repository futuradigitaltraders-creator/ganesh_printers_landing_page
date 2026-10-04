// Owner receives the uploaded screenshot. This is never a payment receipt.
function deliverOwnerPaymentScreenshot(book,data,bytes) {
  try {
    if(PropertiesService.getScriptProperties().getProperty('INVOICE_EMAIL_ENABLED')!=='true')return 'pending_setup';
    if(!ownsOrderReservation(book,String(data.orderId),data.requestKey))return 'unverified';
    const proofs=book.getSheetByName('Payment Proofs 2026'),clients=book.getSheetByName('Customer Details 2026');
    const proof=proofs&&proofs.getLastRow()>1?proofs.getRange(2,1,proofs.getLastRow()-1,4).getDisplayValues().find(row=>row[0]===data.proofId&&row[1]===String(data.orderId)):null;
    const client=clients&&clients.getLastRow()>1?clients.getRange(2,1,clients.getLastRow()-1,8).getDisplayValues().find(row=>row[0]===String(data.orderId)):null;
    if(!proof||!client||proof[3]==='Receiving')return 'failed';
    const owner='ganeshprint.kodai1976@gmail.com',ledger=book.getSheetByName('Payment Screenshot Emails 2026')||book.insertSheet('Payment Screenshot Emails 2026');
    if(ledger.getLastRow()===0){ledger.appendRow(['Proof ID','Order ID','Recipient','Status','Updated at']);ledger.setFrozenRows(1);}
    const previous=ledger.getLastRow()>1?ledger.getRange(2,1,ledger.getLastRow()-1,5).getDisplayValues():[];
    const found=previous.findIndex(row=>row[0]===data.proofId&&row[1]===String(data.orderId));
    if(found>=0&&['Sent','Sending'].includes(previous[found][3]))return previous[found][3].toLowerCase();
    const today=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
    if(previous.filter(row=>row[4].startsWith(today)&&['Sent','Sending'].includes(row[3])).length>=50||MailApp.getRemainingDailyQuota()<1)return 'failed';
    const row=found>=0?found+2:ledger.getLastRow()+1;
    ledger.getRange(row,2).setNumberFormat('@');
    ledger.getRange(row,1,1,5).setValues([[data.proofId,String(data.orderId),owner,'Sending',Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm:ss')]]);
    SpreadsheetApp.flush();
    const clean=value=>String(value||'').replace(/^'/,'').trim(),email=clean(client[7]);
    const message={to:owner,name:'FUTURA WEBSITE',subject:'FUTURA — Payment Screenshot | Order '+data.orderId+' | '+clean(client[2]),
      body:'PAYMENT SCREENSHOT SUBMITTED\n\nOrder ID: '+data.orderId+'\nClient: '+clean(client[2])+'\nClient Email: '+(email||'Not provided')+'\nMobile: '+clean(client[3])+'\nCity & Pincode: '+clean(client[5])+'\n\nThe payment screenshot is attached for verification. This email does not confirm that money was received. Check the bank/GPay credit, then mark Payment Received in the order sheet.\n\nProof ID: '+data.proofId,
      attachments:[Utilities.newBlob(bytes,data.mimeType,'FUTURA_Payment_Screenshot_'+data.orderId+(data.mimeType==='image/png'?'.png':'.jpg'))]};
    if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))message.replyTo=email;
    try {MailApp.sendEmail(message);ledger.getRange(row,4).setValue('Sent');return 'sent';}
    catch(error){return 'sending';} // Uncertain acceptance: do not duplicate mail.
  }catch(error){return 'failed';} // Saving the screenshot succeeds independently.
}
