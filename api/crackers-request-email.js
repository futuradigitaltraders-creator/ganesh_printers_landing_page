const {validateRequest, loadImages, buildPdf} = require('./crackers-request-pdf');
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx6mOgt3AvJ189x4Amiy80XU2ood4aa864e8MIEwFrkIswD2I1N6uKTfpzbM_LEDlFS3w/exec';
const OWNER_EMAIL = 'ganeshprint.kodai1976@gmail.com';
const allowedOrigins = ['https://www.futuraonlineprint.in', 'https://futuraonlineprint.in', 'https://ganesh-printers-landing-page.vercel.app'];

async function google(payload) {
  const reply = await fetch(SHEETS_URL, payload ? {
    method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify(payload), signal:AbortSignal.timeout(60000)
  } : {signal:AbortSignal.timeout(20000)});
  const result = await reply.json();
  if (!reply.ok || result.ok !== true) throw Error(result.error || 'Email delivery unavailable');
  return result;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) return res.status(403).json({ok:false,error:'Invalid origin'});
  if (!['GET','POST'].includes(req.method)) {res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Use POST'});}
  let data, order;
  if (req.method === 'POST') {
    try {
      data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!/^[0-9]{4,12}$/.test(data?.orderId || '') || !/^[A-Za-z0-9_-]{20,80}$/.test(data?.requestKey || '')) throw Error('Please reopen your saved confirmed order.');
      // Recipient and PDF rates/images are fixed on the server.
      order = validateRequest({...data,items:data.items.map(({imageUrl,...item})=>item)});
    } catch(e) {return res.status(400).json({ok:false,error:e.message});}
  }
  try {
    const health = await google();
    const available = health.requestEmailPDF === true;
    if (req.method === 'GET') return res.status(200).json({ok:true,available,recipient:OWNER_EMAIL});
    if (!available) return res.status(503).json({ok:false,error:'PDF email is not active yet. Please use WhatsApp 9488917786.'});
    const payload = {action:'requestEmailPDF',orderId:order.orderId,requestKey:data.requestKey,customer:order.customer,
      items:order.items.map(p=>({serial:p.serial,qty:p.qty,price:p.price}))};
    // Check saved order ownership/content before expensive PDF work or sending.
    const checked = await google({...payload,checkOnly:true});
    if (checked.orderId !== order.orderId || checked.requestEmailVerified !== true) throw Error('Saved order could not be verified');
    if (checked.emailStatus === 'sent') return res.status(200).json({ok:true,orderId:order.orderId,emailStatus:'sent',duplicate:true,recipient:OWNER_EMAIL});
    if (checked.emailStatus === 'sending') return res.status(202).json({ok:true,orderId:order.orderId,emailStatus:'sending',recipient:OWNER_EMAIL});
    await loadImages(order.items);
    const pdf = await buildPdf(order);
    if (pdf.length > 3000000) throw Error('Request PDF is too large to email. Please use WhatsApp.');
    const sent = await google({...payload,pdfBase64:pdf.toString('base64')});
    if (sent.orderId !== order.orderId || !['sent','sending'].includes(sent.emailStatus)) throw Error('Email sending could not be confirmed');
    return res.status(sent.emailStatus === 'sent'?200:202).json({ok:true,orderId:order.orderId,emailStatus:sent.emailStatus,duplicate:!!sent.duplicate,recipient:OWNER_EMAIL});
  } catch(e) {
    console.warn('Order request email unconfirmed',{orderId:order?.orderId,message:e.message});
    return res.status(502).json({ok:false,error:'PDF email could not be confirmed. Retry the same order or use WhatsApp 9488917786.'});
  }
};
