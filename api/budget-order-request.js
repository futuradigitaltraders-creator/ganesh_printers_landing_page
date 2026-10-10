'use strict';
/* Budget-friendly order: verified 232-item PDF rates, shared order-number
   ledger + customer sheet, and existing owner-only PDF email workflow. */
const fs=require('fs');
const path=require('path');
const PDFDocument=require('pdfkit');
const SHEETS_URL='https://script.google.com/macros/s/AKfycbx6mOgt3AvJ189x4Amiy80XU2ood4aa864e8MIEwFrkIswD2I1N6uKTfpzbM_LEDlFS3w/exec';
const OWNER_EMAIL='ganeshprint.kodai1976@gmail.com';
const ORIGINS=new Set(['https://futuraonlineprint.in','https://www.futuraonlineprint.in','https://ganesh-printers-landing-page.vercel.app']);
const FONT_DIR=path.join(process.cwd(),'assets/crackers/request-form');
let products;

function serverCatalogue(){
 if(products)return products;
 const html=fs.readFileSync(path.join(process.cwd(),'budget-friendly-crackers-2026.html'),'utf8');
 const match=html.match(/const budgetProducts=(\[[^\n]*\]);/);
 if(!match)throw Error('Budget price catalogue unavailable.');
 const parsed=JSON.parse(match[1]);
 if(parsed.length!==234 || parsed.some((p,i)=>p.id!==i+1 ||
     !Number.isFinite(p.rate)||p.rate<=0||!p.name||!p.tamil ||
     (p.discount && (!Number.isFinite(p.list)||Math.abs(p.list-5*p.rate)>0.001)) ||
     (!p.discount && p.list!==null)))throw Error('Budget price catalogue validation failed.');
 products=new Map(parsed.map(p=>[p.id,p]));
 return products;
}
const safe=(s,max=250)=>String(s??'').trim().slice(0,max);
function check(input){
 if(!input||!Array.isArray(input.items)||!input.items.length||input.items.length>234||
    !/^[A-Za-z0-9_-]{20,80}$/.test(input.requestKey||''))throw Error('Invalid order request.');
 const name=safe(input.customer?.name,100),mobile=safe(input.customer?.mobile,20),
       city=safe(input.customer?.city,100),address=safe(input.customer?.address,300),
       lorry=safe(input.customer?.lorry,100),email=safe(input.customer?.email,254);
 const digits=mobile.replace(/\D/g,'');
 if(name.length<2||digits.length<10||digits.length>15||city.length<2||address.length<5)
   throw Error('Name, valid Mobile, City & Pincode and full Address are required.');
 if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a valid email address.');
 const catalogue=serverCatalogue(),seen=new Set();
 const items=input.items.map(item=>{
   const serial=Number(item.serial),qty=Number(item.qty),product=catalogue.get(serial);
   if(!product||product.inStock===false||seen.has(serial)||!Number.isInteger(qty)||qty<1||qty>999||
      !Number.isFinite(Number(item.price))||Math.abs(Number(item.price)-product.rate)>0.001)
     throw Error('Products/prices have changed. Please refresh the catalogue.');
   seen.add(serial);
   return {serial,name:product.name,tamil:product.tamil,qty,price:product.rate,
     mrp:product.list,category:product.category,unit:product.unit,companyCode:'BUDGET'};
 }).sort((a,b)=>a.serial-b.serial);
 const total=items.reduce((n,p)=>n+p.price*p.qty,0),
       mrp=items.reduce((n,p)=>n+(p.mrp||0)*p.qty,0),
       saving=items.reduce((n,p)=>n+((p.mrp||p.price)-p.price)*p.qty,0);
 if(total<3000)throw Error('Minimum order product total is Rs. 3,000.');
 return {items,total,mrp,saving,customer:{name,mobile,city,address,lorry,email},requestKey:input.requestKey};
}
async function google(payload,timeout=35000){
 const options=payload?{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
     body:JSON.stringify(payload),signal:AbortSignal.timeout(timeout)}:
     {signal:AbortSignal.timeout(timeout)};
 const reply=await fetch(SHEETS_URL,options);
 const text=await reply.text();
 let result;
 try{result=JSON.parse(text)}catch{throw Error('Order service returned an invalid response.');}
 if(!reply.ok||result.ok!==true)throw Error(result.error||'Order service not available.');
 return result;
}
const money=n=>'Rs. '+Number(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
function pdfForOrder(o){
 return new Promise((resolve,reject)=>{
  const doc=new PDFDocument({size:'A4',margin:30,bufferPages:true,compress:true,
     info:{Title:'FUTURA Budget Friendly Order Request '+o.orderId,Author:'FUTURA TRADERS'}});
  const chunks=[];
  doc.on('data',b=>chunks.push(b));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
  doc.registerFont('Tamil',path.join(FONT_DIR,'NotoSansTamil-Regular.ttf'));
  doc.registerFont('TamilBold',path.join(FONT_DIR,'NotoSansTamil-Bold.ttf'));
  const left=30,w=doc.page.width-60,limit=doc.page.height-48;
  const text=(value,x,y,width,size=10,bold=false,color='#231630',align='left')=>{
    doc.font(bold?'TamilBold':'Tamil').fontSize(size).fillColor(color);
    doc.text(String(value),x,y,{width,align,lineGap:2});
  };
  const heading=(other=false)=>{
    doc.roundedRect(left,25,w,63,8).fill('#310E71');
    text('FUTURA TRADERS - BUDGET FRIENDLY CRACKERS',left+8,32,w-16,15,true,'#FFFFFF','center');
    text('CLIENT ORDER REQUEST / வாடிக்கையாளர் ஆர்டர் கோரிக்கை',left+8,57,w-16,10,true,'#FFE060','center');
    text('ORDER: '+o.orderId+'    |    NOT A PAID INVOICE',left+3,94,w-6,10,true,'#A51634');
    return other?121:127;
  };
  let y=heading();
  const rows=[['Name / பெயர்',o.customer.name],['Mobile / மொபைல்',o.customer.mobile],
    ['City & Pincode / நகரம்',o.customer.city],['Address / முகவரி',o.customer.address],
    ['Preferred Lorry / போக்குவரத்து',o.customer.lorry||'-']];
  for(const [label,value] of rows){
    doc.font('Tamil').fontSize(9);
    const h=Math.max(25,doc.heightOfString(value,{width:w-177,lineGap:2})+12);
    doc.rect(left,y,w,h).fill('#F6F1FA');doc.rect(left,y,w,h).lineWidth(.5).stroke('#C8B6D6');
    text(label,left+7,y+6,160,8.7,true,'#3B166E');
    text(value,left+173,y+6,w-181,9);
    y+=h;
  }
  y+=14;
  const widths=[30,224,33,74,74,w-435];let coords=[left];
  widths.forEach(v=>coords.push(coords.at(-1)+v));
  function tableHeader(){
    doc.rect(left,y,w,39).fill('#F9D658');
    const labels=['S.No.','Product / பொருள்','Qty','MRP','Net Rate','Sub Total'];
    labels.forEach((label,i)=>text(label,coords[i]+2,y+7,widths[i]-4,i===1?9:8,true,'#3D1D50',i===1?'left':'center'));
    y+=39;
  }
  tableHeader();
  o.items.forEach((p,i)=>{
    doc.font('Tamil').fontSize(9.2);
    const name=p.name+'\n'+p.tamil;
    const h=Math.max(48,doc.heightOfString(name,{width:widths[1]-12,lineGap:1})+13);
    if(y+h>limit-112){doc.addPage();y=heading(true)+5;tableHeader();}
    doc.rect(left,y,w,h).fill(i%2?'#F3EFF8':'#FFFFFF');
    doc.lineWidth(.5).strokeColor('#B5A4C2');
    coords.forEach(x=>doc.moveTo(x,y).lineTo(x,y+h).stroke());
    doc.moveTo(left,y+h).lineTo(left+w,y+h).stroke();
    text(p.serial,coords[0]+2,y+12,widths[0]-4,9,false,'#2E1953','center');
    text(name,coords[1]+6,y+5,widths[1]-12,9.2,true);
    text(p.qty,coords[2]+2,y+12,widths[2]-4,9,false,'#221336','center');
    text(p.mrp===null?'-':money(p.mrp),coords[3]+2,y+10,widths[3]-4,8,false,'#69421B','right');
    text(money(p.price),coords[4]+2,y+10,widths[4]-4,8,true,'#B80058','right');
    text(money(p.qty*p.price),coords[5]+2,y+10,widths[5]-4,8.1,true,'#126A4E','right');
    y+=h;
  });
  if(y+120>limit){doc.addPage();y=heading(true)+10;}
  y+=12;
  doc.roundedRect(left,y,w,92,7).fill('#FFF3C6');
  text('Selected products: '+o.items.length+'     Total pieces: '+o.items.reduce((s,p)=>s+p.qty,0),left+10,y+7,w-20,10,true);
  text('MRP (applicable items only): '+money(o.mrp),left+10,y+28,w-20,9);
  text('You Save (80% offer items): '+money(o.saving),left+10,y+46,w-20,9);
  text('FINAL PRODUCT TOTAL: '+money(o.total),left+10,y+65,w-20,12,true,'#B00042');
  y+=102;
  if(y+70>limit){doc.addPage();y=heading(true)+10;}
  text('Packing & Forwarding: Rs. 300 extra. Transport: TOPAY.',left,y,w,9.5,true,'#693D1D');
  text('Stock subject to confirmation. Payment details will be sent separately. This is NOT an invoice.',left,y+19,w,9,false,'#5C4767');
  const pages=doc.bufferedPageRange();
  for(let j=0;j<pages.count;j++){
    doc.switchToPage(j);
    text('FUTURA TRADERS  •  94889 17786',left,doc.page.height-23,w-65,8,false,'#786988');
    text((j+1)+' / '+pages.count,left+w-55,doc.page.height-23,55,8,false,'#786988','right');
  }
  doc.end();
 });
}
async function deliverPdf(order){
 const state=await google(undefined,20000);
 if(state.requestEmailPDF!==true)return {status:'unavailable',message:'PDF email service is not active.'};
 const payload={action:'requestEmailPDF',orderId:order.orderId,requestKey:order.requestKey,
   customer:{name:order.customer.name,mobile:order.customer.mobile,
       city:order.customer.city,address:order.customer.address,email:order.customer.email},
   items:order.items.map(p=>({serial:p.serial,qty:p.qty,price:p.price}))};
 const checked=await google({...payload,checkOnly:true},30000);
 if(checked.orderId!==order.orderId||checked.requestEmailVerified!==true)throw Error('Saved order/email verification unsuccessful.');
 if(['sent','sending'].includes(checked.emailStatus))return {status:checked.emailStatus,duplicate:true};
 const pdf=await pdfForOrder(order);
 if(pdf.length>3000000)throw Error('PDF exceeds email attachment limit.');
 const sent=await google({...payload,pdfBase64:pdf.toString('base64')},65000);
 if(sent.orderId!==order.orderId||!['sent','sending'].includes(sent.emailStatus))throw Error('PDF email delivery not confirmed.');
 return {status:sent.emailStatus,duplicate:!!sent.duplicate};
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.headers.origin&&!ORIGINS.has(req.headers.origin))
   return res.status(403).json({ok:false,error:'Invalid origin.'});
 if(req.method==='GET'){
   try{const state=await google(undefined,20000);return res.status(200).json({ok:true,emailAvailable:state.requestEmailPDF===true,recipient:OWNER_EMAIL});}
   catch{return res.status(503).json({ok:false,emailAvailable:false,error:'Service unavailable.'});}
 }
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Use POST'});}
 let order;
 try{order=check(typeof req.body==='string'?JSON.parse(req.body):req.body);}
 catch(e){return res.status(400).json({ok:false,error:e.message});}
 // Verify the owner Gmail PDF delivery flag BEFORE reserving an Order ID.
 // A disabled Gmail/Apps Script integration must never create an orphaned test booking.
 try{
   const emailHealth=await google(undefined,20000);
   if(emailHealth.requestEmailPDF!==true){
     return res.status(503).json({ok:false,emailAvailable:false,error:'PDF email is not active. Owner: enable invoice email in the existing Google Apps Script, authorize permissions, and deploy the latest web app version before testing.'});
   }
 }catch(e){
   console.warn('Budget request email preflight unavailable',{message:e.message});
   return res.status(503).json({ok:false,emailAvailable:false,error:'Cannot verify PDF email service now. No order number was created; please check Gmail/Apps Script setup before retrying.'});
 }
 try{
   const reserve=await google({action:'allocateOrderId',requestKey:order.requestKey},30000);
   if(reserve.requestKey!==order.requestKey||!/^[0-9]{4,12}$/.test(reserve.orderId||''))throw Error('Order number reservation failed.');
   order.orderId=reserve.orderId;
   const saved=await google({orderId:order.orderId,requestKey:order.requestKey,
     items:order.items.map(p=>({serial:p.serial,name:p.name,qty:p.qty,price:p.price,companyCode:'BUDGET'}))},40000);
   if(saved.orderId!==order.orderId)throw Error('Order save could not be confirmed.');
   const customer=await google({action:'customerDetails',orderId:order.orderId,requestKey:order.requestKey,
     name:order.customer.name,mobile:order.customer.mobile,city:order.customer.city,
     address:order.customer.address,email:order.customer.email},35000);
   if(customer.orderId!==order.orderId||customer.customerSaved!==true)throw Error('Customer details not confirmed.');
 }catch(e){
   console.warn('Budget order save issue',{orderId:order.orderId,message:e.message});
   return res.status(502).json({ok:false,error:'Order save could not be confirmed. Retry safely with the same selection.'});
 }
 let emailStatus='failed',emailError='';
 try{const x=await deliverPdf(order);emailStatus=x.status;}
 catch(e){emailError='PDF email could not be confirmed. You may retry without creating another order.';console.warn('Budget PDF email issue',{orderId:order.orderId,message:e.message});}
 return res.status(200).json({ok:true,orderId:order.orderId,orderSaved:true,
   emailStatus,emailError,recipient:OWNER_EMAIL,items:order.items.length,total:order.total,
   mrp:order.mrp,saving:order.saving});
};
