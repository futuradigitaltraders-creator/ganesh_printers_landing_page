const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const PDFDocument = require('pdfkit');

let catalogue;
function getCatalogue() {
  if (catalogue) return catalogue;
  const $ = cheerio.load(fs.readFileSync(path.join(process.cwd(), 'deepavali-crackers-2026.html'), 'utf8'));
  catalogue = new Map();
  $('.product-row').each((index, row) => {
    const serial = index + 1;
    const name = $(row).find('.product-name').text().trim();
    const price = Number($(row).find('.our-price').text().replace(/[^0-9.]/g, ''));
    const mrpText = $(row).find('.mrp-price').text();
    const mrp = mrpText ? Number(mrpText.replace(/[^0-9.]/g, '')) : null;
    if (name && Number.isFinite(price) && price > 0) catalogue.set(serial, {serial, name, price, mrp:Number.isFinite(mrp) && mrp > 0 ? mrp : null});
  });
  return catalogue;
}

function generateEstimate(orderId, items) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({size:'A4', margin:36, bufferPages:true, info:{Title:'FUTURA Crackers 2026 - Estimate', Author:'FUTURA TRADERS'}});
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const left=36, width=doc.page.width-72, bottom=doc.page.height-60;
    const widths=[32,217,32,74,80,88];
    const money=n=>n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
    const headers=['S.No','Product','Qty','MRP Rate','80% Discount\nRate / Special','Subtotal'];
    let y;
    const drawCells=(values, height, header=false)=>{
      let x=left;
      doc.lineWidth(0.5);
      values.forEach((value,i)=>{
        doc.rect(x,y,widths[i],height).fillAndStroke(header?'#391864':'#FFFFFF',header?'#391864':'#CAC3D5');
        doc.fillColor(header?'#FFFFFF':'#222222').font(header?'Helvetica-Bold':'Helvetica').fontSize(header?8:8.5)
          .text(String(value),x+5,y+7,{width:widths[i]-10,align:i>=2?'right':'left',lineGap:2});
        x+=widths[i];
      });
      y+=height;
    };
    const pageHeader=(withTable=true)=>{
      doc.fillColor('#391864').font('Helvetica-Bold').fontSize(18).text('FUTURA TRADERS',left,36);
      doc.fillColor('#444444').font('Helvetica').fontSize(9).text('Sri Ganesh Printers | WhatsApp: +91 94889 17786',left,61);
      doc.text('www.futuraonlineprint.in | Direct dispatch from Sivakasi',left,76);
      doc.fillColor('#391864').font('Helvetica-Bold').fontSize(13).text('DEEPAVALI CRACKERS 2026 - ESTIMATE',left,100);
      doc.fillColor('#444444').font('Helvetica').fontSize(8).text('Estimate / Order ID: '+orderId,left,122,{width});
      doc.text('Issued: '+new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}).format(new Date())+' IST',left,138);
      doc.font('Helvetica-Bold').text('Payment pending | Subject to stock availability',left,154);
      y=177;if(withTable) drawCells(headers,36,true);
    };
    const nextPage=(withTable=true)=>{doc.addPage();pageHeader(withTable);};
    pageHeader();
    let total=0,totalQty=0,saved=0;
    items.forEach(item=>{
      doc.font('Helvetica').fontSize(8.5);
      const height=Math.max(34,doc.heightOfString(item.name,{width:widths[1]-10,lineGap:2})+15);
      if(y+height>bottom) nextPage();
      const amount=Math.round(item.qty*item.price*100)/100;
      drawCells([item.serial,item.name,item.qty,item.mrp===null?'-':money(item.mrp),money(item.price)+(item.mrp===null?'\nSpecial':''),money(amount)],height);
      total+=amount;totalQty+=item.qty;
      if(item.mrp!==null) saved+=Math.max(0,item.mrp-item.price)*item.qty;
    });
    if(y+154>bottom) nextPage(false);
    y+=12;
    doc.rect(left,y,width,31).fill('#FFF1C7');
    doc.fillColor('#391864').font('Helvetica-Bold').fontSize(12).text('NET PRODUCT TOTAL: Rs '+money(total),left+10,y+9,{width:width-20,align:'right'});
    y+=44;
    doc.font('Helvetica').fontSize(9).fillColor('#333333').text('Products: '+items.length+' | Total quantity: '+totalQty+' | You save: Rs '+money(saved),left,y,{width});
    y+=19;
    doc.text('Packing & shipping charges extra. Discounted rate is the final unit rate.',left,y,{width});
    y+=19;
    doc.text('Combo packs use special rates; no additional 80% discount applies.',left,y,{width});
    y+=19;
    doc.font('Helvetica-Bold').text('ESTIMATE ONLY - This document is not a payment receipt or tax invoice.',left,y,{width});
    y+=19;
    doc.font('Helvetica').text('Please confirm availability and payment details on WhatsApp. Orders are confirmed after payment.',left,y,{width});
    const pages=doc.bufferedPageRange();
    for(let i=0;i<pages.count;i++){
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(8).fillColor('#666666').text('FUTURA - Crackers 2026 | Page '+(i+1)+' of '+pages.count,left,doc.page.height-52,{width,align:'center',lineBreak:false});
    }
    doc.end();
  });
}

module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Use POST'});}
  if(req.headers.origin && !['https://www.futuraonlineprint.in','https://futuraonlineprint.in','https://ganesh-printers-landing-page.vercel.app'].includes(req.headers.origin)) return res.status(403).json({ok:false,error:'Invalid origin'});
  let data,items;
  try{
    data=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(!data || !/^[A-Za-z0-9_-]{8,80}$/.test(data.orderId||'') || !Array.isArray(data.items) || !data.items.length || data.items.length>300) throw Error('Invalid order');
    const products=getCatalogue(),seen=new Set();
    items=data.items.map(item=>{
      const serial=Number(item.serial),qty=Number(item.qty),product=products.get(serial);
      if(!product || seen.has(serial) || !Number.isInteger(qty) || qty<1 || qty>10000 || !Number.isFinite(Number(item.price)) || Math.abs(Number(item.price)-product.price)>0.001) throw Error('Invalid item');
      seen.add(serial);return {...product,qty};
    }).sort((a,b)=>a.serial-b.serial);
  }catch(e){return res.status(400).json({ok:false,error:'Please refresh the catalogue and retry.'});}
  try{
    const pdf=await generateEstimate(data.orderId,items);
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename="'+data.orderId+'-Estimate.pdf"');
    return res.status(200).send(pdf);
  }catch(e){return res.status(500).json({ok:false,error:'Estimate could not be generated. Please retry.'});}
};
