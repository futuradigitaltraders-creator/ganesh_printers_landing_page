const saveOrder = require('./crackers-orders');

const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx6mOgt3AvJ189x4Amiy80XU2ood4aa864e8MIEwFrkIswD2I1N6uKTfpzbM_LEDlFS3w/exec';
const allowedOrigins = ['https://www.futuraonlineprint.in', 'https://futuraonlineprint.in', 'https://ganesh-printers-landing-page.vercel.app'];

function clean(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

async function bookingServerReady() {
  const reply = await fetch(SHEETS_URL,{signal:AbortSignal.timeout(15000)});
  const result = await reply.json();
  return reply.ok && result.ok===true && result.customerDetails===true;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    let products;
    try {
      products = saveOrder.getCatalogue().size;
    } catch (error) {
      console.error('Booking catalogue unavailable', {message:error.message});
      return res.status(503).json({ok:false,catalogueReady:false,error:'Please refresh the catalogue and retry.'});
    }
    let ready=false;
    try {ready=await bookingServerReady();} catch {}
    return res.status(ready?200:503).json({ok:ready,catalogueReady:true,products,customerDetailsAvailable:ready});
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ok:false,error:'Use POST'});
  }
  if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) {
    return res.status(403).json({ok:false,error:'Invalid origin'});
  }

  let data;
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!data || !/^(?:[0-9]{4,12}|[A-Za-z0-9_-]{8,80})$/.test(data.orderId || '') || !Array.isArray(data.items) || !data.items.length) {
      throw new Error('Invalid order');
    }
    data = {
      orderId:data.orderId,
      requestKey:clean(data.requestKey,80),
      items:data.items,
      name:clean(data.name,100),
      mobile:clean(data.mobile,20),
      address:clean(data.address,300),
      city:clean(data.city,100),
      email:clean(data.email,254)
    };
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(data.requestKey)) throw Error('Order verification required');
    const digits=data.mobile.replace(/\D/g,'');
    if(data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw Error('Invalid email');
    if (data.name.length < 2 ||
        !/^[0-9+()\-\s]{8,20}$/.test(data.mobile) || digits.length < 10 || digits.length > 15 ||
        data.address.length < 5 ||
        data.city.length < 2) throw new Error('Invalid customer details');
  } catch (e) {
    return res.status(400).json({ok:false,error:'Please enter valid Name, Mobile, Address and City.'});
  }

  try {
    if (!await bookingServerReady()) {
      return res.status(503).json({ok:false,error:'Booking save தற்போது கிடைக்கவில்லை. உங்கள் விவரங்களுடன் WhatsApp request அனுப்புங்கள்.'});
    }
    const orderResult = {setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
    await saveOrder({method:'POST',headers:req.headers,body:{orderId:data.orderId,items:data.items,requestKey:data.requestKey}},orderResult);
    if (orderResult.code !== 200 || orderResult.body?.ok !== true) {
      return res.status(orderResult.code || 502).json({ok:false,error:orderResult.code===400?'Catalogue மாறியுள்ளது. Page refresh செய்து மீண்டும் முயற்சி செய்யுங்கள்.':'Order சேமிக்க முடியவில்லை. மீண்டும் முயற்சி செய்யுங்கள்.'});
    }

    const reply = await fetch(SHEETS_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({
        action:'customerDetails',
        orderId:data.orderId,
        requestKey:data.requestKey,
        name:data.name,
        mobile:data.mobile,
        address:data.address,
        city:data.city,
        email:data.email
      }),
      signal:AbortSignal.timeout(25000)
    });
    const result = await reply.json();
    if (!reply.ok || result.ok !== true || result.customerSaved !== true || result.orderId !== data.orderId) {
      throw new Error('Customer details unconfirmed');
    }
    return res.status(200).json({ok:true,orderId:data.orderId,customerSaved:true,updated:!!result.updated});
  } catch (e) {
    console.warn('Booking details saving unconfirmed', {orderId:data.orderId,message:e.message});
    return res.status(502).json({ok:false,error:'Booking details could not be saved. Please retry.'});
  }
};


