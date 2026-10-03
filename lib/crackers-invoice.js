const PDFDocument = require('pdfkit');
const path = require('path');
const {validateRequest} = require('../api/crackers-request-pdf');
const money = cents => (cents / 100).toLocaleString('en-IN', {minimumFractionDigits:2,maximumFractionDigits:2});

function validateInvoiceOrder(input) {
  const order = validateRequest(input);
  if (!/^[0-9]{4,12}$/.test(order.orderId)) throw Error('A saved website Order ID is required.');
  order.customer.email = String(input.customer?.email || '').trim();
  if (order.customer.email && (order.customer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customer.email))) throw Error('Please enter a valid email address.');
  return order;
}

function buildInvoicePdf(order) {
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:'A4',margin:0,bufferPages:true,info:{Title:'FUTURA Invoice - '+order.orderId,Author:'FUTURA TRADERS'}});
    const chunks=[];doc.on('data',x=>chunks.push(x));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
    const assets=path.join(process.cwd(),'assets/crackers/request-form');
    doc.registerFont('Body',path.join(assets,'NotoSansTamil-Regular.ttf'));doc.registerFont('Bold',path.join(assets,'NotoSansTamil-Bold.ttf'));
    const purple='#34136E',muted='#736B83',left=36,width=523;
    const text=(v,x,y,w,size=9,bold=false,color='#2E273F',align='left')=>doc.font(bold?'Bold':'Body').fontSize(size).fillColor(color).text(String(v),x,y,{width:w,align,lineGap:2});
    const box=(y,h,fill)=>doc.roundedRect(left,y,width,h,7).fill(fill);
    function header(){doc.rect(0,0,doc.page.width,78).fill(purple);text('FUTURA TRADERS',left,20,320,20,true,'white');text('Sivakasi Direct Crackers Dispatch',left,48,320,9,false,'white');text('9488917786',389,25,170,11,true,'white','right');text('www.futuraonlineprint.in',361,48,198,8,false,'white','right');text('INVOICE / ORDER CONFIRMATION',left,93,358,14,true,purple);text('ORDER ID: '+order.orderId,395,93,164,12,true,purple,'right');}
    header();
    const details=[['Client Name',order.customer.name],['Mobile',order.customer.mobile],['City',order.customer.city],['Address',order.customer.address],['Email',order.customer.email||'-']];
    let y=127;
    for(const [label,value] of details){doc.font('Body').fontSize(9);const h=Math.max(23,doc.heightOfString(value,{width:390,lineGap:2})+10);doc.rect(left,y,width,h).fill('#F7F3FC');text(label,50,y+5,100,8.5,true,muted);text(value,158,y+5,386,9);y+=h;}
    y+=13;box(y,51,'#FFF7D9');text('PAYMENT SCREENSHOT RECEIVED',50,y+7,495,11,true,purple);text('Payment verification pending. This is not a payment receipt.',50,y+28,495,9);y+=64;
    const xs=[36,67,129,368,404,477,559];
    function tableHeader(){doc.rect(left,y,width,26).fill(purple);['S.No','Code No','Product','Qty','Rate (₹)','Sub-Total (₹)'].forEach((label,i)=>text(label,xs[i]+3,y+6,xs[i+1]-xs[i]-6,8,true,'white',i>2?'right':'left'));y+=26;}
    tableHeader();
    for(const item of order.items){doc.font('Body').fontSize(8.5);const h=Math.max(27,doc.heightOfString(item.name,{width:232,lineGap:2})+12);if(y+h>740){doc.addPage();header();y=125;tableHeader();}doc.rect(left,y,width,h).fillAndStroke('#FFFFFF','#DBD2EA');[item.serial,item.companyCode||'-',item.name,item.qty,money(Math.round(item.price*100)),money(item.subtotalCents)].forEach((v,i)=>text(v,xs[i]+4,y+5,xs[i+1]-xs[i]-8,i===2?8.5:8,false,'#2E273F',i>2?'right':'left'));y+=h;}
    if(y+215>780){doc.addPage();header();y=130;}y+=17;
    const total=order.items.reduce((sum,p)=>sum+p.subtotalCents,0);box(y,77,'#FFF7D9');text('Product Total',50,y+8,300,10,true);text('₹'+money(total),389,y+8,154,10,true,purple,'right');text('₹300 Packing & Parcel Forwarding to Lorry Office',50,y+30,493,9,true);text('Grand Total',50,y+54,300,11,true);text('₹'+money(total+30000),389,y+54,154,11,true,purple,'right');y+=91;
    text('Transport: TOPAY — payable at destination.',50,y,493,9,true);y+=23;text('Stock replacement: If an ordered item is out of stock, it will be replaced with another item of the same value.',50,y,493,9);y+=39;text('Direct dispatch from Sivakasi; generally 3–5 days after payment confirmation.',50,y,493,8.5);
    const range=doc.bufferedPageRange();for(let i=0;i<range.count;i++){doc.switchToPage(i);doc.rect(0,813,doc.page.width,29).fill(purple);text('Order ID '+order.orderId+'  |  Payment verification pending',36,820,430,8,false,'white');text((i+1)+' / '+range.count,493,820,66,8,false,'white','right');}
    doc.end();
  });
}
module.exports={validateInvoiceOrder,buildInvoicePdf};
