const saveOrder = require('./crackers-orders');
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx6mOgt3AvJ189x4Amiy80XU2ood4aa864e8MIEwFrkIswD2I1N6uKTfpzbM_LEDlFS3w/exec';
const allowedOrigins = ['https://www.futuraonlineprint.in', 'https://futuraonlineprint.in', 'https://ganesh-printers-landing-page.vercel.app'];

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) return res.status(403).json({ok:false,error:'Invalid origin'});
  if (req.method === 'GET') {
    try {
      const reply = await fetch(SHEETS_URL, {signal:AbortSignal.timeout(25000)});
      const result = await reply.json();
      return res.status(200).json({ok:true,available:result.ok===true && result.paymentProofUpload===true});
    } catch(e) {return res.status(503).json({ok:false,available:false});}
  }
  if (req.method !== 'POST') {res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Use POST'});}
  let data, image;
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!data || !/^[A-Za-z0-9_-]{8,80}$/.test(data.proofId||'') || typeof data.imageBase64!=='string' || data.imageBase64.length>1800000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.imageBase64) || !['image/jpeg','image/png'].includes(data.mimeType)) throw Error('Invalid proof');
    image=Buffer.from(data.imageBase64,'base64');
    if(image.length<16 || image.length>1200000) throw Error('Image too large');
    if(data.mimeType==='image/jpeg' && !(image[0]===255 && image[1]===216)) throw Error('Invalid JPEG');
    if(data.mimeType==='image/png' && image.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw Error('Invalid PNG');
  } catch(e) {return res.status(400).json({ok:false,error:'Please select a JPG or PNG payment screenshot.'});}
  try {
    // Save and validate the selected order before accepting its payment proof.
    const result = {setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
    await saveOrder({method:'POST',headers:req.headers,body:{orderId:data.orderId,items:data.items}},result);
    if(result.code!==200 || result.body?.ok!==true) return res.status(result.code||502).json({ok:false,error:'Order saving could not be confirmed. Please retry.'});
    const reply=await fetch(SHEETS_URL,{
      method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action:'paymentProof',orderId:data.orderId,proofId:data.proofId,imageBase64:data.imageBase64,mimeType:data.mimeType}),
      signal:AbortSignal.timeout(25000)
    });
    const saved=await reply.json();
    if(!reply.ok || saved.ok!==true || saved.proofSaved!==true || saved.orderId!==data.orderId || saved.proofId!==data.proofId) throw Error('Proof unconfirmed');
    return res.status(200).json({ok:true,orderId:data.orderId,proofId:data.proofId,status:'Pending verification'});
  } catch(e) {return res.status(502).json({ok:false,error:'Screenshot saving could not be confirmed. Please retry or send it on WhatsApp.'});}
};
