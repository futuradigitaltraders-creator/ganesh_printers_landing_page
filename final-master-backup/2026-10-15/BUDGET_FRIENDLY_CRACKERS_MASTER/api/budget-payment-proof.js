'use strict';
/* LOW PRICE CRACKERS: payment screenshot for a previously confirmed, saved Budget order.
   Same Google Sheet payment verification/tracking service and PDF layout as Quality.
   Budget rates are validated independently; Quality catalogue pricing is never used. */
const {validateBudgetOrder}=require('./budget-order-request');
const {buildInvoicePdf}=require('../lib/crackers-invoice');
const SHEETS_URL='https://script.google.com/macros/s/AKfycbx6mOgt3AvJ189x4Amiy80XU2ood4aa864e8MIEwFrkIswD2I1N6uKTfpzbM_LEDlFS3w/exec';
const ORIGINS=['https://futuraonlineprint.in','https://www.futuraonlineprint.in','https://ganesh-printers-landing-page.vercel.app'];
function checkedBody(data){
 if(!data||!/^[0-9]{4,12}$/.test(data.orderId||'')||
  !/^[A-Za-z0-9_-]{8,80}$/.test(data.proofId||'')||
  typeof data.imageBase64!=='string'||data.imageBase64.length>1800000||
  !/^[A-Za-z0-9+/]+={0,2}$/.test(data.imageBase64)||
  !['image/jpeg','image/png'].includes(data.mimeType))throw Error('Invalid proof');
 const image=Buffer.from(data.imageBase64,'base64');
 if(image.length<16||image.length>1200000)throw Error('Image too large');
 if(data.mimeType==='image/jpeg'&&!(image[0]===255&&image[1]===216))throw Error('Invalid JPEG');
 if(data.mimeType==='image/png'&&image.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG');
 const source=validateBudgetOrder(data);
 const invoice={
  orderId:data.orderId,
  requestKey:source.requestKey,
  customer:source.customer,
  items:source.items.map(p=>({serial:p.serial,companyCode:'BUDGET',name:p.name+' / '+p.tamil,
   qty:p.qty,price:p.price,subtotalCents:Math.round(p.price*100)*p.qty}))
 };
 return {invoice,image};
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('Referrer-Policy','no-referrer');
 if(req.headers?.origin&&!ORIGINS.includes(req.headers.origin))return res.status(403).json({ok:false,error:'Invalid origin.'});
 if(req.method==='GET'){
  try{
   const r=await fetch(SHEETS_URL,{signal:AbortSignal.timeout(25000)});
   const j=await r.json();
   return res.status(200).json({ok:true,available:r.ok&&j.ok===true&&j.paymentProofUpload===true,
     ownerScreenshotEmailAvailable:j.paymentScreenshotEmail===true});
  }catch(e){return res.status(503).json({ok:false,available:false});}
 }
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Use POST'});}
 let data,order;
 try{
  data=typeof req.body==='string'?JSON.parse(req.body):req.body;
  order=checkedBody(data).invoice;
 }catch(e){return res.status(400).json({ok:false,error:'Please use a saved Budget order and valid JPG/PNG payment screenshot.'});}
 let phase='invoice';
 try{
  // PDF calculation uses ONLY the approved and validated Budget prices.
  const invoice=await buildInvoicePdf(order);
  phase='proof';
  // The existing Apps Script checks that this secret requestKey owns the saved
  // Order Number and that the order is actually saved before accepting the image.
  const reply=await fetch(SHEETS_URL,{
   method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
   body:JSON.stringify({action:'paymentProof',orderId:order.orderId,
    proofId:data.proofId,imageBase64:data.imageBase64,mimeType:data.mimeType,
    requestKey:order.requestKey}),
   signal:AbortSignal.timeout(90000)
  });
  const saved=await reply.json();
  if(!reply.ok||saved.ok!==true||saved.proofSaved!==true||
     saved.orderId!==order.orderId||saved.proofId!==data.proofId)throw Error('Payment proof not acknowledged');
  return res.status(200).json({ok:true,orderId:order.orderId,proofId:data.proofId,
   status:'Pending verification',trackingToken:/^[a-f0-9]{64}$/.test(saved.trackingToken||'')?saved.trackingToken:undefined,
   invoiceBase64:invoice.toString('base64'),
   invoiceEmail:['sent','sending','failed','no_email'].includes(saved.invoiceEmail)?saved.invoiceEmail:'pending_setup',
   ownerScreenshotEmail:['sent','sending','failed','unverified'].includes(saved.ownerScreenshotEmail)?saved.ownerScreenshotEmail:'pending_setup'});
 }catch(e){
  console.warn('Budget payment proof request not confirmed',{phase,orderId:order.orderId,detail:e.message});
  return res.status(502).json({ok:false,error:phase==='invoice'
   ?'Invoice PDF preparation failed. Please retry without creating a new order.'
   :'Screenshot could not be confirmed. Retry upload with the same saved Order ID, or send it on WhatsApp.'});
 }
};
