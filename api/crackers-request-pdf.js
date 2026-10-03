const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');

const SITE_URL = 'https://www.futuraonlineprint.in/';
const ASSETS = path.join(process.cwd(), 'assets/crackers/request-form');
const imageCache = new Map();
let catalogue;

function getCatalogue() {
  if (catalogue) return catalogue;
  const $ = cheerio.load(fs.readFileSync(path.join(process.cwd(), 'deepavali-crackers-2026.html'), 'utf8'));
  catalogue = new Map();
  $('.product-row').each((index, row) => {
    const element = $(row);
    const picture = element.find('img').first();
    catalogue.set(index + 1, {
      serial: index + 1,
      name: element.find('.product-name').text().trim(),
      companyCode: element.attr('data-company-code') || '',
      price: Number(element.find('.our-price').text().replace(/[^0-9.]/g, '')),
      imageUrl: new URL(picture.attr('data-full') || picture.attr('src'), SITE_URL).href
    });
  });
  return catalogue;
}

function clean(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function validateRequest(input) {
  if (!input || !/^[A-Za-z0-9_-]{8,80}$/.test(input.orderId || '') ||
      !Array.isArray(input.items) || !input.items.length || input.items.length > 300) {
    throw new Error('Please select products and retry.');
  }
  const customer = {
    name: clean(input.customer?.name, 100),
    mobile: clean(input.customer?.mobile, 20),
    city: clean(input.customer?.city, 100),
    address: clean(input.customer?.address, 300)
  };
  const digits = customer.mobile.replace(/\D/g, '');
  if (customer.name.length < 2 || digits.length < 10 || digits.length > 15 ||
      customer.city.length < 2 || customer.address.length < 5) {
    throw new Error('Please enter Name, Mobile, Address and City.');
  }
  const seen = new Set();
  const products = getCatalogue();
  const items = input.items.map(item => {
    const serial = Number(item.serial), qty = Number(item.qty);
    const product = products.get(serial);
    if (!product || seen.has(serial) || !Number.isInteger(qty) || qty < 1 || qty > 10000 ||
        !Number.isFinite(Number(item.price)) || Math.abs(Number(item.price) - product.price) > 0.001) {
      throw new Error('Please refresh the catalogue and retry.');
    }
    seen.add(serial);
    // Use the image currently visible in the catalogue after image hydration.
    // Supplier codes and rates always come from the website's reviewed data.
    let imageUrl = product.imageUrl;
    try {
      const candidate = new URL(item.imageUrl || '', SITE_URL);
      const host = candidate.hostname;
      if (candidate.protocol === 'https:' && (
        ((host === 'www.futuraonlineprint.in' || host === 'futuraonlineprint.in') && candidate.pathname.startsWith('/images/crackers/')) ||
        host === 'imgcdn.iar.net.in' || host === 'assetv2.iar.net.in'
      )) imageUrl = candidate.href;
    } catch {}
    return {...product, qty, imageUrl, subtotalCents: Math.round(product.price * 100) * qty};
  }).sort((a, b) => a.serial - b.serial);
  return {orderId: input.orderId, customer, items};
}

async function getImage(url) {
  const cached = imageCache.get(url);
  if (cached && Date.now() - cached.time < 600000) return cached.bytes;
  try {
    const reply = await fetch(url, {signal: AbortSignal.timeout(15000), headers: {'Accept': 'image/jpeg,image/png'}});
    if (!reply.ok) return null;
    if (Number(reply.headers.get('content-length')) > 5000000) return null;
    const bytes = Buffer.from(await reply.arrayBuffer());
    if (bytes.length > 5000000 || !bytes.length) return null;
    if (!(bytes[0] === 0xff && bytes[1] === 0xd8) && bytes.slice(1, 4).toString() !== 'PNG') return null;
    if (imageCache.size >= 100) imageCache.delete(imageCache.keys().next().value);
    let thumbnail = await sharp(bytes, {limitInputPixels: 25000000}).rotate()
      .resize(240, 240, {fit: 'inside', withoutEnlargement: true})
      .flatten({background: '#FFFFFF'}).jpeg({quality: 82}).toBuffer();
    if (thumbnail.length > 12000) thumbnail = await sharp(thumbnail)
      .resize(160, 160, {fit: 'inside'}).jpeg({quality: 65}).toBuffer();
    imageCache.set(url, {bytes: thumbnail, time: Date.now()});
    return thumbnail;
  } catch { return null; }
}

async function loadImages(items, imageLoader = getImage) {
  let next = 0;
  await Promise.all(Array.from({length: Math.min(32, items.length)}, async () => {
    while (next < items.length) {
      const item = items[next++];
      item.image = await imageLoader(item.imageUrl);
    }
  }));
}

const money = cents => (cents / 100).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});

function buildPdf(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({size: 'A4', margin: 0, bufferPages: true, compress: true,
      info: {Title: 'FUTURA Client WhatsApp Request - ' + order.orderId, Author: 'FUTURA - Sivakasi'}});
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.registerFont('Body', path.join(ASSETS, 'NotoSansTamil-Regular.ttf'));
    doc.registerFont('Bold', path.join(ASSETS, 'NotoSansTamil-Bold.ttf'));
    const left = 25, width = doc.page.width - 50, bottom = doc.page.height - 42;
    const columns = [30, 66, 60, 162, 59, 77, width - 454];
    const edges = [left];
    columns.forEach(column => edges.push(edges.at(-1) + column));

    function text(value, x, y, w, size = 10.5, bold = false, color = '#141414', align = 'left') {
      doc.font(bold ? 'Bold' : 'Body').fontSize(size).fillColor(color)
        .text(String(value), x, y, {width: w, align, lineGap: 2});
    }
    function number(value, x, y, w, bold = false, color = '#141414', initialSize = 10.5) {
      let size = initialSize;
      doc.font(bold ? 'Bold' : 'Body');
      while (size > 7.5 && doc.fontSize(size).widthOfString(String(value)) > w) size -= 0.25;
      text(value, x, y, w, size, bold, color, 'right');
    }
    function header(first) {
      doc.roundedRect(left, 20, width, 53, 9).fill('#087DCF');
      text('1. CLIENT WHATSAPP ORDER FORM', left + 9, 28, width - 18, 19, true, '#FFFFFF', 'center');
      text('(Only Selected Products & Client Details)', left + 9, 53, width - 18, 11, true, '#FFFFFF', 'center');
      doc.image(path.join(ASSETS, 'header.png'), left, 79, {width, height: 85});
      text('Order ID: ' + order.orderId, left + 4, 172, width - 8, 9, false, '#35116B');
      return first ? 197 : 195;
    }
    function details(y) {
      doc.roundedRect(left, y, width, 25, 5).fill('#E6F4FC');
      text('Client Details / வாடிக்கையாளர் விவரம்', left + 9, y + 4, width - 18, 12, true, '#101B47');
      y += 25;
      const fields = [
        ['Name / பெயர்', order.customer.name],
        ['Mobile No. / மொபைல் எண்', order.customer.mobile],
        ['City / நகரம்', order.customer.city],
        ['Delivery Address / முகவரி', order.customer.address]
      ];
      for (const [label, value] of fields) {
        const labelWidth = 190;
        doc.font('Body').fontSize(10.5);
        const valueHeight = doc.heightOfString(': ' + value, {width: width - labelWidth - 14, lineGap: 2});
        doc.fontSize(9.5);
        const labelHeight = doc.heightOfString(label, {width: labelWidth - 14, lineGap: 2});
        const height = Math.max(25, valueHeight + 12, labelHeight + 10);
        doc.rect(left, y, labelWidth, height).fill('#EAF5FC');
        doc.rect(left, y, width, height).lineWidth(0.4).stroke('#B8C1CC');
        text(label, left + 9, y + 5, labelWidth - 14, 9.5);
        text(': ' + value, left + labelWidth + 6, y + 5, width - labelWidth - 14, 10.5);
        y += height;
      }
      return y + 12;
    }
    function tableHeader(y) {
      doc.rect(left, y, width, 43).fill('#35116B');
      const labels = [['S.No.', 'எண்'], ['Code No.', 'குறியீடு'], ['Product Image', 'படம்'],
        ['Product Name', 'பொருள் பெயர்'], ['Qty', 'எண்ணிக்கை'], ['Rate (₹)', 'விலை'], ['Sub-Total (₹)', 'தொகை']];
      labels.forEach(([english, tamil], index) => {
        let size = 9.5;
        doc.font('Bold');
        while (size > 7 && doc.fontSize(size).widthOfString(english) > columns[index] - 8) size -= 0.25;
        text(english, edges[index] + 3, y + 7, columns[index] - 6, size, true, '#FFFFFF', 'center');
        let tamilSize = 8.5;
        while (tamilSize > 6 && doc.fontSize(tamilSize).widthOfString(tamil) > columns[index] - 6) tamilSize -= 0.25;
        text(tamil, edges[index] + 3, y + 25, columns[index] - 6, tamilSize, true, '#FFFFFF', 'center');
      });
      return y + 43;
    }
    let y = tableHeader(details(header(true)));
    order.items.forEach((item, index) => {
      doc.font('Body').fontSize(10.5);
      const height = Math.max(62, doc.heightOfString(item.name, {width: columns[3] - 14, lineGap: 2}) + 18);
      if (y + height > bottom - 12) { doc.addPage(); y = tableHeader(header(false)); }
      doc.rect(left, y, width, height).fill(index % 2 ? '#FAFBFD' : '#FFFFFF');
      doc.lineWidth(0.5).strokeColor('#AAB3C0');
      edges.forEach(edge => doc.moveTo(edge, y).lineTo(edge, y + height).stroke());
      doc.moveTo(left, y + height).lineTo(left + width, y + height).stroke();
      text(index + 1, edges[0] + 3, y + (height - 15) / 2, columns[0] - 6, 10.5, false, '#141414', 'center');
      text(item.companyCode || 'PENDING', edges[1] + 3, y + (height - 15) / 2, columns[1] - 6, item.companyCode ? 11 : 9,
        true, '#35116B', 'center');
      try {
        if (!item.image) throw new Error('No image');
        doc.image(item.image, edges[2] + 5, y + 6, {fit: [columns[2] - 10, height - 12], align: 'center', valign: 'center'});
      } catch {
        text('Image\nunavailable', edges[2] + 4, y + (height - 25) / 2, columns[2] - 8, 8, false, '#697386', 'center');
      }
      doc.font('Body').fontSize(10.5);
      const nameHeight = doc.heightOfString(item.name, {width: columns[3] - 14, lineGap: 2});
      text(item.name, edges[3] + 7, y + (height - nameHeight) / 2, columns[3] - 14, 10.5);
      text(item.qty, edges[4] + 3, y + (height - 15) / 2, columns[4] - 6, 10.5, false, '#141414', 'center');
      number(money(Math.round(item.price * 100)), edges[5] + 4, y + (height - 15) / 2, columns[5] - 10);
      number(money(item.subtotalCents), edges[6] + 4, y + (height - 15) / 2, columns[6] - 10);
      y += height;
    });
    const pending = order.items.filter(item => !item.companyCode);
    const pendingText = pending.length ? 'Company code confirmation pending: ' + pending.map(item => item.name).join('; ') : '';
    doc.font('Body').fontSize(9);
    const pendingHeight = pendingText ? doc.heightOfString(pendingText, {width: width - 16, lineGap: 2}) + 14 : 0;
    if (y + 66 + pendingHeight > bottom) { doc.addPage(); y = header(false); }
    y += 10;
    doc.roundedRect(left, y, width, 52, 7).fill('#FFF3CA');
    text('Selected Products: ' + order.items.length + ' Items', left + 11, y + 8, width * 0.55 - 22, 11, true);
    text('தேர்ந்தெடுக்கப்பட்ட பொருட்கள்: ' + order.items.length, left + 11, y + 29, width * 0.55 - 22, 9);
    const totalX = left + width * 0.55;
    doc.roundedRect(totalX, y, width * 0.45, 52, 7).fill('#FFE13D');
    text('NET TOTAL (₹)', totalX + 10, y + 5, width * 0.45 - 20, 11, true);
    const total = order.items.reduce((sum, item) => sum + item.subtotalCents, 0);
    number(money(total), totalX + 10, y + 23, width * 0.45 - 20, true, '#E32119', 18);
    if (pendingText) text(pendingText, left + 8, y + 62, width - 16, 9, false, '#784B05');
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      text('Client request / ஆர்டர் கோரிக்கை', left, doc.page.height - 25, width - 60, 8, false, '#617083');
      text((i + 1) + ' / ' + pages.count, left + width - 55, doc.page.height - 25, 55, 8, false, '#617083', 'right');
    }
    doc.end();
  });
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ok: false, error: 'Use POST'}); }
  let order;
  try { order = validateRequest(typeof req.body === 'string' ? JSON.parse(req.body) : req.body); }
  catch (error) { return res.status(400).json({ok: false, error: error.message}); }
  try {
    await loadImages(order.items);
    const bytes = await buildPdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="FUTURA_Request_' + order.orderId + '.pdf"');
    res.setHeader('Content-Length', bytes.length);
    return res.status(200).send(bytes);
  } catch (error) {
    console.error('Client request PDF failed', {orderId: order.orderId, message: error.message});
    return res.status(500).json({ok: false, error: 'Request PDF could not be created. Please retry.'});
  }
}

module.exports = handler;
module.exports.validateRequest = validateRequest;
module.exports.loadImages = loadImages;
module.exports.buildPdf = buildPdf;
module.exports.getCatalogue = getCatalogue;
