const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx6mOgt3AvJ189x4Amiy80XU2ood4aa864e8MIEwFrkIswD2I1N6uKTfpzbM_LEDlFS3w/exec';
const origins = ['https://www.futuraonlineprint.in', 'https://futuraonlineprint.in', 'https://ganesh-printers-landing-page.vercel.app'];
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.headers.origin && !origins.includes(req.headers.origin)) return res.status(403).json({ok:false,error:'Invalid origin'});
  if (req.method === 'GET') {
    try {
      const reply = await fetch(SHEETS_URL,{signal:AbortSignal.timeout(20000)});
      const result = await reply.json();
      if (!reply.ok || result.sequentialOrderIds !== true) throw Error('Unavailable');
      return res.status(200).json({ok:true,sequentialOrderIds:true,nextOrderId:result.nextOrderId});
    } catch { return res.status(503).json({ok:false,error:'Order numbering unavailable'}); }
  }
  if (req.method !== 'POST') {res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Use POST'});}
  let data;
  try {
    data=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(data?.requestKey || '')) throw Error('Invalid key');
  } catch {return res.status(400).json({ok:false,error:'Invalid request'});}
  if(data.finalConfirmed !== true) return res.status(409).json({ok:false,error:'Please review your items and confirm the final order before creating an Order ID.'});
  // A retry with the same key returns the original number, even after a lost response.
  for(let attempt=0;attempt<2;attempt++) {
    try {
      const reply=await fetch(SHEETS_URL,{
        method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action:'allocateOrderId',requestKey:data.requestKey}),
        signal:AbortSignal.timeout(25000)
      });
      const result=await reply.json();
      if (!reply.ok || result.ok!==true || result.requestKey!==data.requestKey || !/^[0-9]{4,12}$/.test(result.orderId || '')) throw Error('Unconfirmed');
      return res.status(200).json({ok:true,requestKey:data.requestKey,orderId:result.orderId});
    } catch {}
  }
  return res.status(503).json({ok:false,error:'Order ID உருவாக்க முடியவில்லை. மீண்டும் முயற்சி செய்யுங்கள்.'});
};
