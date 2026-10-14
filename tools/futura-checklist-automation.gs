/**
 * FUTURA 2026 DEEPAVALI CRACKERS CHECKLIST AUTOMATION
 * Standalone Google Apps Script. No external API or website customer endpoint.
 * Create a time-based trigger by running setupChecklistAutomation() once.
 * Supplier emails processed ONLY where a verified mapping exists.
 */
const FUTURA_CONFIG = {
  spreadsheetName: 'FUTURA 2026 Supplier Order Checklist Mapping',
  folderName: 'FUTURA 2026 DEEPAVALI CHECKLISTS',
  supplierSender: 'noreply@iamretailer.com',
  supplierSubject: 'KUMAR FIREWORKS AGENCIES - Pyro Bazaar - Standard Crackers - Order ',
  emailQuery: 'in:anywhere from:noreply@iamretailer.com subject:"KUMAR FIREWORKS AGENCIES" after:2026/10/01',
  mappingHeaders: ['Supplier Order No','FUTURA Order No','Customer Name','Customer Mobile','Status','Generated PDF URL','Email Message ID','Last Checked'],
};
function checklistProperties_(){return PropertiesService.getScriptProperties();}
function folder_() {
  const props=checklistProperties_(), id=props.getProperty('CHECKLIST_FOLDER_ID');
  if(id) return DriveApp.getFolderById(id);
  const folder=DriveApp.createFolder(FUTURA_CONFIG.folderName);
  props.setProperty('CHECKLIST_FOLDER_ID',folder.getId());return folder;
}
function sheet_() {
  const props=checklistProperties_(), id=props.getProperty('CHECKLIST_SHEET_ID');
  if(id)return SpreadsheetApp.openById(id).getSheets()[0];
  const book=SpreadsheetApp.create(FUTURA_CONFIG.spreadsheetName);
  const sh=book.getSheets()[0];sh.setName('Order Mapping');
  sh.appendRow(FUTURA_CONFIG.mappingHeaders);
  sh.appendRow(['7697','0108','Meenakshi Sundaram','9842141265','PENDING','','','']);
  sh.setFrozenRows(1);
  sh.getRange('A:B').setNumberFormat('@');
  sh.getRange('D:D').setNumberFormat('@');
  sh.autoResizeColumns(1,8);
  props.setProperty('CHECKLIST_SHEET_ID',book.getId());
  return sh;
}
function setupChecklistAutomation() {
  sheet_();folder_();
  const exists=ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='checkSupplierOrderEmails');
  if(!exists) ScriptApp.newTrigger('checkSupplierOrderEmails').timeBased().everyMinutes(15).create();
  Logger.log('Mapping Sheet: '+sheet_().getParent().getUrl());
  Logger.log('PDF Folder: '+folder_().getUrl());
}
function parseSupplierEmail_(body, html){
  function decode(value){
    return String(value).replace(/<br\s*\/?>/gi,' ').replace(/<[^>]*>/g,' ')
      .replace(/&nbsp;|&#160;/gi,' ').replace(/&quot;/gi,'"')
      .replace(/&amp;/gi,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))
      .replace(/\s+/g,' ').trim();
  }
  let rows=[];
  // Prefer the real HTML table cells: supplier emails may wrap plain text at arbitrary widths.
  const htmlRows=String(html||'').match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[];
  for(const tr of htmlRows){
    const cells=[...tr.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>decode(m[1]));
    if(cells.length<7)continue;
    const no=Number(cells[0]), code=cells[1], hsn=cells[2], qty=Number(cells[4]);
    if(Number.isInteger(no)&&no>0&&/^[A-Z]{2,5}\s*\d{2,4}$/.test(code)&&/^\d{8}$/.test(hsn)
       &&cells[3]&&Number.isInteger(qty)&&qty>0){
      rows.push({number:no,name:cells[3],qty});
    }
  }
  if(!rows.length){
    // Gmail plain body fallback: spaces/newlines and currency glyphs vary by message.
    const normalized=String(body||'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ')
      .replace(/\r/g,'').replace(/\n(?!(?:\d{1,3})\s+[A-Z]{2,5}\s+\d{2,4}\s+\d{8}\b)/g,' ');
    const pattern=/(?:^|\n)\s*(\d{1,3})\s+([A-Z]{2,5})\s+(\d{2,4})\s+(\d{8})\s+(.+?)\s+(\d{1,5})\s+[₹Rs.\s]*([\d,]+\.\d{2})\s+[₹Rs.\s]*([\d,]+\.\d{2})(?=\s|$)/g;
    let m;
    while((m=pattern.exec(normalized))!==null)
      rows.push({number:Number(m[1]),name:m[5].trim(),qty:Number(m[6])});
  }
  if(!rows.length||rows.length>300||rows.some((r,i)=>r.number!==i+1||!r.name||r.qty<1))
    throw Error('Email product rows could not be verified');
  return rows;
}
function pdfFromRows_(futura,supplier,name,mobile,items){
  const filename='2026_Deepavali_Checklist_FUTURA_'+futura+'_Supplier_'+supplier;
  const tmp=DocumentApp.create(filename);
  try{
    const body=tmp.getBody();
    const title=body.appendParagraph('2026 DEEPAVALI CRACKERS CHECKLIST');
    title.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    title.editAsText().setFontSize(12);
    const subtitle=body.appendParagraph('Customer: '+name+'   |   Mobile: '+mobile+'   |   FUTURA Order: '+futura+'   |   Supplier Order: '+supplier);
    subtitle.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    subtitle.editAsText().setFontSize(8);
    const data=[['S.No.','Product Name','Qty']];
    items.forEach((item,i)=>data.push([String(i+1),item.name,String(item.qty)]));
    const table=body.appendTable(data);
    table.setBorderWidth(0.5);
    for(let i=0;i<table.getNumRows();i++) {
      for(let j=0;j<3;j++)table.getCell(i,j).editAsText().setFontSize(9);
    }
    const total=items.reduce((sum,item)=>sum+item.qty,0);
    body.appendParagraph('Total Products: '+items.length+'    |    Total Qty: '+total).editAsText().setFontSize(9);
    tmp.saveAndClose();
    const blob=DriveApp.getFileById(tmp.getId()).getAs(MimeType.PDF).setName(filename+'.pdf');
    return folder_().createFile(blob);
  } finally {
    DriveApp.getFileById(tmp.getId()).setTrashed(true);
  }
}
function checkSupplierOrderEmails() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))return;
  try{
    const sh=sheet_(), values=sh.getDataRange().getDisplayValues(), messages=new Map();
    const threads=GmailApp.search(FUTURA_CONFIG.emailQuery,0,100);
    for(const thread of threads)for(const msg of thread.getMessages()){
      const subject=msg.getSubject();
      if(!subject.startsWith(FUTURA_CONFIG.supplierSubject))continue;
      const match=subject.match(/ - Order (\d+)\s*$/);
      if(!match)continue;
      // Ignore supplier "Order Update" notices; only full confirmation messages.
      messages.set(match[1],msg);
    }
    for(let i=1;i<values.length;i++){
      const [supplierRaw,futuraRaw,nameRaw,mobileRaw,status,url]=values[i];
      const supplier=String(supplierRaw).trim(),futura=String(futuraRaw).trim();
      const name=String(nameRaw).trim(),mobile=String(mobileRaw).replace(/\D/g,'');
      const row=i+1;
      if(!supplier||!futura||!name||!mobile||url||status==='DONE')continue;
      if(!/^\d{3,12}$/.test(supplier)||!/^\d{3,12}$/.test(futura)||mobile.length!==10){
        sh.getRange(row,5).setValue('INVALID MAPPING');continue;
      }
      const msg=messages.get(supplier);
      if(!msg){sh.getRange(row,5).setValue('AWAITING SUPPLIER EMAIL');continue;}
      try{
        const text=msg.getPlainBody();
        const embedded=text.match(/Your Order\s+(\d+)\s+placed/i);
        if(!embedded||embedded[1]!==supplier)throw Error('Supplier order mismatch');
        const rows=parseSupplierEmail_(text,msg.getBody());
        const pdf=pdfFromRows_(futura,supplier,name,mobile,rows);
        sh.getRange(row,5,1,4).setValues([['DONE',pdf.getUrl(),msg.getId(),new Date()]]);
      }catch(e){sh.getRange(row,5).setValue('ERROR: '+String(e.message).slice(0,100));}
    }
  }finally{lock.releaseLock();}
}
