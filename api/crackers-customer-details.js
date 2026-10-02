const saveOrder = require('./crackers-orders');

const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx6mOgt3AvJ189x4Amiy80XU2ood4aa864e8MIEwFrkIswD2I1N6uKTfpzbM_LEDlFS3w/exec';
const allowedOrigins = ['https://www.futuraonlineprint.in', 'https://futuraonlineprint.in', 'https://ganesh-printers-landing-page.vercel.app'];

function clean(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ok:false,error:'Use POST'});
  }
  if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) {
    return res.status(403).json({ok:false,error:'Invalid origin'});
  }

  let data;
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!data || !/^[A-Za-z0-9_-]{8,80}$/.test(data.orderId || '') || !Array.isArray(data.items) || !data.items.length) {
      throw new Error('Invalid order');
    }
    data = {
      orderId:data.orderId,
      items:data.items,
      name:clean(data.name,100),
      mobile:clean(data.mobile,20),
      address:clean(data.address,300),
      city:clean(data.city,100)
    };
    if (data.name.length < 2 ||
        !/^[0-9+()\-\s]{8,20}$/.test(data.mobile) ||
        data.address.length < 5 ||
        data.city.length < 2) throw new Error('Invalid customer details');
  } catch (e) {
    return res.status(400).json({ok:false,error:'Please enter valid Name, Mobile, Address and City.'});
  }

  try {
    const orderResult = {setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
    await saveOrder({method:'POST',headers:req.headers,body:{orderId:data.orderId,items:data.items}},orderResult);
    if (orderResult.code !== 200 || orderResult.body?.ok !== true) {
      return res.status(orderResult.code || 502).json({ok:false,error:'Order saving could not be confirmed.'});
    }

    const reply = await fetch(SHEETS_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({
        action:'customerDetails',
        orderId:data.orderId,
        name:data.name,
        mobile:data.mobile,
        address:data.address,
        city:data.city
      }),
      signal:AbortSignal.timeout(25000)
    });
    const result = await reply.json();
    if (!reply.ok || result.ok !== true || result.customerSaved !== true || result.orderId !== data.orderId) {
      throw new Error('Customer details unconfirmed');
    }
    return res.status(200).json({ok:true,orderId:data.orderId,customerSaved:true,updated:!!result.updated});
  } catch (e) {
    return res.status(502).json({ok:false,error:'Booking details could not be saved. Please retry.'});
  }
};
