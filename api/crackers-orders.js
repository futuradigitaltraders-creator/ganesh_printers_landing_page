const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx6mOgt3AvJ189x4Amiy80XU2ood4aa864e8MIEwFrkIswD2I1N6uKTfpzbM_LEDlFS3w/exec';
let catalogue;
function getCatalogue() {
  if (catalogue) return catalogue;
  const $ = cheerio.load(fs.readFileSync(path.join(process.cwd(), 'deepavali-crackers-2026.html'), 'utf8'));
  catalogue = new Map();
  $('.product-row').each((index, row) => {
    const serial = index + 1;
    const name = $(row).find('.product-name').text().trim();
    const price = Number($(row).find('.our-price').text().replace(/[^0-9.]/g, ''));
    if (name && Number.isFinite(price) && price > 0) catalogue.set(serial, {serial, name, price});
  });
  return catalogue;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ok:false, error:'Use POST'});
  }
  if (req.headers.origin && !['https://www.futuraonlineprint.in', 'https://futuraonlineprint.in', 'https://ganesh-printers-landing-page.vercel.app'].includes(req.headers.origin)) {
    return res.status(403).json({ok:false, error:'Invalid origin'});
  }
  let data, items;
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!data || !/^[A-Za-z0-9_-]{8,80}$/.test(data.orderId || '') || !Array.isArray(data.items) || !data.items.length || data.items.length > 300) throw new Error('Invalid order');
    const products = getCatalogue();
    const seen = new Set();
    items = data.items.map(item => {
      const serial = Number(item.serial), qty = Number(item.qty);
      const product = products.get(serial);
      if (!product || seen.has(serial) || !Number.isInteger(qty) || qty < 1 || qty > 10000 || Math.abs(Number(item.price) - product.price) > 0.001 || !Number.isFinite(Number(item.price))) throw new Error('Invalid item');
      seen.add(serial);
      return {...product, qty};
    }).sort((a,b) => a.serial - b.serial);
  } catch (error) {
    return res.status(400).json({ok:false, error:'Please refresh the catalogue and retry.'});
  }
  try {
    const reply = await fetch(SHEETS_URL, {
      method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({orderId:data.orderId, items}),
      signal:AbortSignal.timeout(45000)
    });
    if (!reply.ok) throw new Error('Sheets request failed');
    const result = await reply.json();
    if (result.ok !== true || result.orderId !== data.orderId) throw new Error('Sheets did not confirm saving');
    return res.status(200).json({ok:true, orderId:data.orderId, items:items.length, duplicate:!!result.duplicate});
  } catch (error) {
    return res.status(502).json({ok:false, error:'Could not confirm saving. Retry with the same Order ID.'});
  }
};
