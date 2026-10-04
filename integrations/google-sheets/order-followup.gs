// Owner-only payment approval lives in the private spreadsheet. No public
// doPost action can mark a payment received or dispatch a confirmation email.
const FOLLOWUP_TAB = 'Order Followup 2026';
const FOLLOWUP_STATUSES = ['Awaiting payment confirmation','Payment Received','Packing','Dispatched','Delivered'];

function ownsOrderReservation(book,orderId,requestKey){
  if(typeof requestKey!=='string' || requestKey.length<20)return false;
  return readOrderNumbers(book).some(row=>String(row[0])===requestKey && String(row[1]).padStart(4,'0')===String(orderId));
}

function configurePaymentApprovalRow(sheet,row) {
  sheet.getRange(1,6,1,3).setValues([['Received Amount (Rs.)','Payment Received','Confirmation Email']]).setFontWeight('bold');
  sheet.getRange(row,6).setNumberFormat('0.00').setNote('Enter the amount actually credited to your bank/GPay, then tick Payment Received.');
  sheet.getRange(row,7).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  if(sheet.getRange(row,7).getValue()==='')sheet.getRange(row,7).setValue(false);
  sheet.setColumnWidth(6,170);sheet.setColumnWidth(7,160);sheet.setColumnWidth(8,260);
}

function followupSheet(book) {
  const sheet=book.getSheetByName(FOLLOWUP_TAB)||book.insertSheet(FOLLOWUP_TAB);
  if(sheet.getLastRow()===0){
    sheet.appendRow(['Order ID','Private Tracking Token','Received Amount (Rs.)','Payment Confirmed at','Order Status','Dispatch Date','Transport Name','LR / Parcel No.','Delivered Date','Updated at','Confirmation Email','Receipt Email','Payment Mode','Receiver Name']);
    sheet.setFrozenRows(1);sheet.getRange(1,1,1,12).setFontWeight('bold').setBackground('#34136e').setFontColor('#ffffff');
    sheet.setColumnWidth(1,120);sheet.setColumnWidth(3,170);sheet.setColumnWidth(4,180);sheet.setColumnWidth(5,230);sheet.setColumnWidth(7,220);sheet.setColumnWidth(11,200);
    sheet.hideColumns(2);sheet.hideColumns(12);
  }
  return sheet;
}

function ensureOrderFollowup(book,orderId) {
  const sheet=followupSheet(book);
  const rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,12).getValues():[];
  const index=rows.findIndex(row=>String(row[0])===String(orderId));
  const row=index<0?sheet.getLastRow()+1:index+2;
  if(index<0){
    const token=(Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,'').toLowerCase();
    sheet.getRange(row,1,1,2).setNumberFormat('@');
    sheet.getRange(row,1,1,12).setValues([[String(orderId),token,'','','Awaiting payment confirmation','','','','',new Date(),'','']]);
    sheet.getRange(row,3).setNumberFormat('0.00');
    sheet.getRange(row,5).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(FOLLOWUP_STATUSES,true).setAllowInvalid(false).build());
    [4,6,9,10].forEach(col=>sheet.getRange(row,col).setNumberFormat('dd/MM/yyyy HH:mm:ss'));
    sheet.getRange(row,8).setNumberFormat('@');
    return {sheet,row,token};
  }
  return {sheet,row,token:String(rows[index][1])};
}

function setupPaymentConfirmation() {
  setupInvoiceEmail();
  const book=SpreadsheetApp.openById(SHEET_ID);
  followupSheet(book);
  const proof=book.getSheetByName('Payment Proofs 2026');
  if(proof && proof.getLastRow()>1){
    const ids=proof.getRange(2,2,proof.getLastRow()-1,1).getDisplayValues();
    ids.forEach((values,index)=>{configurePaymentApprovalRow(proof,index+2);ensureOrderFollowup(book,values[0]);});
  }
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='handlePaymentReceived')){
    ScriptApp.newTrigger('handlePaymentReceived').forSpreadsheet(SHEET_ID).onEdit().create();
  }
  PropertiesService.getScriptProperties().setProperty('PAYMENT_CONFIRMATION_ENABLED','true');
  Logger.log('Ready: Payment Proofs 2026 — enter Received Amount, tick Payment Received. Update dispatch details in Order Followup 2026.');
}

function handlePaymentReceived(e) {
  if(!e || !e.range || !e.source || e.source.getId()!==SHEET_ID || !e.triggerUid)return;
  const range=e.range,sheet=range.getSheet();
  if(range.getNumRows()!==1 || range.getNumColumns()!==1 || range.getRow()<2)return;
  if(sheet.getName()===FOLLOWUP_TAB && ((range.getColumn()>=5 && range.getColumn()<=9) || range.getColumn()===13 || range.getColumn()===14)){
    sheet.getRange(range.getRow(),10).setValue(new Date());return;
  }
  if(sheet.getName()!=='Payment Proofs 2026' || range.getColumn()!==7 || e.value!=='TRUE')return;
  const lock=LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const row=range.getRow(),values=sheet.getRange(row,1,1,8).getValues();
    const orderId=String(values[0][1]),raw=values[0][5],amount=Number(raw);
    if(values[0][3]==='Receiving' || typeof raw!=='number' || !Number.isFinite(amount) || amount<=0 || amount>10000000){
      range.setValue(false);sheet.getRange(row,8).setValue('Enter the actual received amount first.');return;
    }
    const book=e.source,followup=ensureOrderFollowup(book,orderId);
    const previous=followup.sheet.getRange(followup.row,1,1,12).getValues()[0];
    if(!previous[3]){
      followup.sheet.getRange(followup.row,3,1,3).setValues([[Math.round(amount*100)/100,new Date(),'Payment Received']]);
      followup.sheet.getRange(followup.row,10).setValue(new Date());
    }else sheet.getRange(row,6).setValue(previous[2]);
    sheet.getRange(row,4).setValue('Payment Received');
    const orders=book.getSheetByName(TAB_NAME);
    if(orders && orders.getLastRow()>1){
      orders.getRange(2,1,orders.getLastRow()-1,1).getDisplayValues().forEach((r,i)=>{if(r[0]===orderId)orders.getRange(i+2,8).setValue('Payment Received');});
    }
    SpreadsheetApp.flush();
    sheet.getRange(row,8).setValue(sendPaymentConfirmation(book,followup));
  }catch(error){range.getSheet().getRange(range.getRow(),8).setValue('Confirmation could not be completed. Check Order Followup.');}
  finally{if(lock.hasLock())lock.releaseLock();}
}

function followupTrackingUrl(orderId,token) {
  return 'https://www.futuraonlineprint.in/crackers-order-tracking.html#order='+encodeURIComponent(orderId)+'&token='+encodeURIComponent(token);
}

function sendPaymentConfirmation(book,followup) {
  const sheet=followup.sheet,row=followup.row,record=sheet.getRange(row,1,1,12).getValues()[0];
  if(!record[3] || !(Number(record[2])>0))return 'Not confirmed';
  if(record[10]==='Sent')return 'Sent';
  if(record[10]==='Sending')return 'Sending - check before retry';
  const clients=book.getSheetByName('Customer Details 2026');
  const client=clients && clients.getLastRow()>1?clients.getRange(2,1,clients.getLastRow()-1,8).getDisplayValues().find(r=>r[0]===String(record[0])):null;
  const email=client && client[7].replace(/^'/,'').trim();
  if(!email){sheet.getRange(row,11).setValue('No email');return 'No email - client can track on website';}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){sheet.getRange(row,11).setValue('Invalid email');return 'Invalid email';}
  if(PropertiesService.getScriptProperties().getProperty('INVOICE_EMAIL_ENABLED')!=='true')return 'Email setup pending';
  if(MailApp.getRemainingDailyQuota()<1){sheet.getRange(row,11).setValue('Quota exceeded');return 'Quota exceeded - retry later';}
  const url=followupTrackingUrl(String(record[0]),String(record[1])),amount=invoiceMoney(Math.round(Number(record[2])*100)),esc=invoiceEscape;
  const text='Dear '+client[2].replace(/^'/,'')+',\n\nYour payment of '+amount+' has been received. Thank you.\nOrder ID: '+record[0]+'\n\nTRACK YOUR ORDER HERE\n'+url+'\n\nFUTURA TRADERS\n9488917786';
  const html='<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#2e273f"><div style="background:#34136e;color:white;padding:24px"><h1 style="font-size:24px;margin:0">FUTURA TRADERS</h1></div><div style="padding:24px"><h2>PAYMENT RECEIVED</h2><p>Dear '+esc(client[2].replace(/^'/,''))+',</p><p>Your payment of <b>'+amount+'</b> has been received. Thank you.</p><p><b>Order ID: '+esc(record[0])+'</b></p><p style="margin:28px 0"><a href="'+esc(url)+'" style="display:inline-block;background:#34136e;color:white;padding:16px 22px;border-radius:8px;text-decoration:none;font-weight:bold">TRACK YOUR ORDER HERE</a></p><p>Check payment confirmation, dispatch and delivery updates on our website.</p><p>FUTURA TRADERS<br>9488917786</p></div></div>';
  sheet.getRange(row,11,1,2).setValues([['Sending',email]]);SpreadsheetApp.flush();
  try{MailApp.sendEmail({to:email,subject:'FUTURA - Order '+record[0]+' | Payment received & tracking',body:text,htmlBody:html,name:'FUTURA TRADERS'});sheet.getRange(row,11).setValue('Sent');return 'Sent';}
  catch(error){sheet.getRange(row,11).setValue('Sending');return 'Send uncertain - check Gmail before retry';}
}

function readOrderFollowup(params) {
  const orderId=String(params.orderId||''),token=String(params.token||'');
  if(!/^[0-9]{4,12}$/.test(orderId) || !/^[a-f0-9]{64}$/.test(token))return jsonReply({ok:false,error:'Order not found'});
  const sheet=SpreadsheetApp.openById(SHEET_ID).getSheetByName(FOLLOWUP_TAB);
  const record=sheet && sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,14).getValues().find(r=>String(r[0])===orderId && String(r[1])===token):null;
  if(!record)return jsonReply({ok:false,error:'Order not found'});
  const confirmed=!!record[3] && Number(record[2])>0;
  if(!confirmed)return jsonReply({ok:true,orderId,paymentConfirmed:false});
  const date=value=>value instanceof Date?Utilities.formatDate(value,Session.getScriptTimeZone(),'dd MMM yyyy HH:mm'):String(value||'').replace(/^'/,'').slice(0,120);
  const book=SpreadsheetApp.openById(SHEET_ID),clients=book.getSheetByName('Customer Details 2026'),orders=book.getSheetByName(TAB_NAME);
  const client=clients && clients.getLastRow()>1?clients.getRange(2,1,clients.getLastRow()-1,8).getDisplayValues().find(r=>r[0]===orderId):null;
  const items=orders && orders.getLastRow()>1?orders.getRange(2,1,orders.getLastRow()-1,9).getValues().filter(r=>String(r[0])===orderId):[];
  const clean=value=>String(value||'').replace(/^'/,'').slice(0,160);
  const orderValue=Math.round(items.reduce((sum,r)=>sum+Number(r[4])*Math.round(Number(r[5])*100),0)+30000)/100;
  return jsonReply({ok:true,orderId,paymentConfirmed:true,receivedAmount:Number(record[2]),paymentConfirmedAt:date(record[3]),clientName:clean(client && client[2]),city:clean(client && client[5]),maskedMobile:client?'******'+clean(client[3]).replace(/\D/g,'').slice(-4):'',orderValue:Number.isFinite(orderValue)?orderValue:null,paymentMode:clean(record[12]),receiverName:clean(record[13]),status:FOLLOWUP_STATUSES.includes(record[4]) && record[4]!=='Awaiting payment confirmation'?record[4]:'Payment Received',dispatchDate:date(record[5]),transportName:clean(record[6]),parcelNumber:clean(record[7]),deliveredDate:date(record[8]),updatedAt:date(record[9])});
}
