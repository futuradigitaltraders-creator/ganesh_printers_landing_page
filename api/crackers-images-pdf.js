const PDFDocument = require('pdfkit');
const cheerio = require('cheerio');

const SOURCE_URL = 'https://pyrobazaar.in/quickshopping';

const CATEGORIES = [
  { key: 'COMBO PACK', title: 'COMBO PACK' },
  { key: 'SINGLE / DOUBLE SOUND CRACKERS', title: 'SINGLE / DOUBLE SOUND CRACKERS' },
  { key: 'SPARKLERS', title: 'SPARKLERS' },
  { key: 'GROUND CHAKKARS', title: 'GROUND CHAKKARS' },
  { key: 'FLOWER POTS', title: 'FLOWER POTS' },
  { key: 'TWINKLING STARS, PENCILS & TORCHES', title: 'TWINKLING STARS, PENCILS & TORCHES' },
  { key: 'ROCKETS & MEGA ROCKETS', title: 'ROCKETS & MEGA ROCKETS' },
  { key: 'ATOM BOMBS', title: 'ATOM BOMBS' },
  { key: 'COLOUR FOG & CONFETTI', title: 'COLOUR FOG & CONFETTI' },
  { key: 'PREMIUM MAGIC CRACKERS', title: 'PREMIUM MAGIC CRACKERS' },
  { key: 'PREMIUM MAGIC FANCY CRACKERS', title: 'PREMIUM MAGIC FANCY CRACKERS' },
  { key: 'LOOSE CRACKERS', title: 'LOOSE CRACKERS' },
  { key: 'CHILDREN GROUND FUNCTIONS', title: 'CHILDREN GROUND FUNCTIONS' },
  { key: 'MINI SKY FUNCTION', title: 'MINI SKY FUNCTION' },
  { key: 'MULTIPLE SHOTS - 10 SHOTS TO 500 SHOTS', title: 'MULTIPLE SHOTS - 10 SHOTS TO 500 SHOTS' },
  { key: 'PREMIUM MULTIPLE SHOTS', title: 'PREMIUM MULTIPLE SHOTS 1.25", 2", 3"' },
  { key: 'AERIAL FANCY-1" TO 6"', title: 'AERIAL FANCY - 1" TO 6"' },
  { key: 'GIFT BOXES', title: 'GIFT BOXES' },
  { key: 'ROLL CAPS & TOY GUNS', title: 'ROLL CAPS & TOY GUNS' },
  { key: 'COLOUR MATCHES & SNAKE TABLETS', title: 'COLOUR MATCHES & SNAKE TABLETS' }
];

const EXPECTED_COUNTS = {
  'COMBO PACK': 5,
  'SINGLE / DOUBLE SOUND CRACKERS': 7,
  'SPARKLERS': 25,
  'GROUND CHAKKARS': 15,
  'FLOWER POTS': 21,
  'TWINKLING STARS, PENCILS & TORCHES': 6,
  'ROCKETS & MEGA ROCKETS': 5,
  'ATOM BOMBS': 5,
  'COLOUR FOG & CONFETTI': 8,
  'PREMIUM MAGIC CRACKERS': 6,
  'PREMIUM MAGIC FANCY CRACKERS': 10,
  'LOOSE CRACKERS': 3,
  'CHILDREN GROUND FUNCTIONS': 53,
  'MINI SKY FUNCTION': 16,
  'MULTIPLE SHOTS - 10 SHOTS TO 500 SHOTS': 26,
  'PREMIUM MULTIPLE SHOTS': 17,
  'AERIAL FANCY-1" TO 6"': 47,
  'GIFT BOXES': 12,
  'ROLL CAPS & TOY GUNS': 8,
  'COLOUR MATCHES & SNAKE TABLETS': 5
};

function cleanText(s) {
  return String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
function normalize(s) {
  return cleanText(s).toUpperCase();
}
function absUrl(u) {
  if (!u) return '';
  if (u.startsWith('//')) return 'https:' + u;
  if (u.startsWith('/')) return 'https://pyrobazaar.in' + u;
  return u;
}
function imageUrlFromRow($, tr) {
  let result = '';
  $(tr).find('img').each((_, img) => {
    const candidates = [
      $(img).attr('data-src'),
      $(img).attr('data-original'),
      $(img).attr('data-lazy'),
      $(img).attr('src')
    ].filter(Boolean).map(absUrl);
    const good = candidates.find(u =>
      /imgcdn\.iar\.net\.in|assetv2\.iar\.net\.in/i.test(u)
    );
    if (good) result = good;
  });
  if (result.includes('/fit/270/270/')) {
    result = result.replace('/fit/270/270/', '/fit/200/200/');
  }
  return result;
}
function productNameFromRow($, tr) {
  const tds = $(tr).find('td');
  if (!tds.length) return '';
  const texts = tds.map((_, td) => cleanText($(td).text())).get();
  if (texts.length >= 3) {
    const likely = texts[2];
    if (likely && !/^₹/.test(likely)) return likely;
  }
  const reject = /^(STANDARD|BUDGET|ELITE|WE TWO|₹|0$|[-+]?\d+(?:\.\d+)?)$/i;
  const candidates = texts.filter(t => t && !reject.test(t) && !/^[₹\d,.\s]+$/.test(t));
  return candidates.sort((a,b) => b.length - a.length)[0] || '';
}

async function fetchCatalogue() {
  const r = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FUTURA-Catalog-PDF/1.0)',
      'Accept': 'text/html,application/xhtml+xml'
    }
  });
  if (!r.ok) throw new Error('Supplier page returned HTTP ' + r.status);
  const html = await r.text();
  const $ = cheerio.load(html);
  const groups = [];
  const groupMap = new Map();
  for (const cat of CATEGORIES) {
    const g = { key: cat.key, title: cat.title, items: [] };
    groups.push(g);
    groupMap.set(cat.key, g);
  }

  let current = null;
  $('tr').each((_, tr) => {
    const rowText = cleanText($(tr).text());
    if (!rowText) return;
    const upper = rowText.toUpperCase();

    const cat = CATEGORIES.find(c => upper.startsWith(c.key));
    if (cat && !$(tr).find('img').length) {
      current = groupMap.get(cat.key);
      return;
    }

    const img = imageUrlFromRow($, tr);
    if (!img || !current) return;
    const name = productNameFromRow($, tr);
    if (!name) return;
    current.items.push({ name, image: img });
  });

  // Drop duplicate rows caused by hidden/responsive markup while preserving order.
  for (const g of groups) {
    const seen = new Set();
    g.items = g.items.filter(it => {
      const k = normalize(it.name) + '|' + it.image;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  return groups;
}

async function fetchImage(url) {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'image/jpeg,image/png,image/*;q=0.8'
      }
    });
    if (!r.ok) return null;
    const type = (r.headers.get('content-type') || '').toLowerCase();
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) return null;
    if (type.includes('jpeg') || type.includes('jpg') || type.includes('png')) return buf;
    // PDFKit can often determine JPEG/PNG by signature even if the header is generic.
    if (buf[0] === 0xff && buf[1] === 0xd8) return buf;
    if (buf.slice(1,4).toString() === 'PNG') return buf;
    return null;
  } catch {
    return null;
  }
}

async function fetchImages(groups) {
  const all = [];
  for (const g of groups) for (const item of g.items) all.push(item);

  const concurrency = 18;
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= all.length) return;
      all[i].buffer = await fetchImage(all[i].image);
    }
  }
  await Promise.all(Array.from({length: concurrency}, () => worker()));
}

function drawHeader(doc, title, pageNo) {
  const left = 36, right = 36;
  doc.save();
  doc.rect(0, 0, doc.page.width, 52).fill('#24105F');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(15)
    .text('FUTURA TRADERS - DEEPAVALI CRACKERS 2026', left, 16, { width: doc.page.width-left-right-70 });
  doc.fillColor('#FFD54A').fontSize(8).font('Helvetica-Bold')
    .text(title, left, 36, { width: doc.page.width-left-right-70 });
  doc.fillColor('#FFFFFF').font('Helvetica').fontSize(8)
    .text(String(pageNo), doc.page.width-right-30, 25, { width: 30, align: 'right' });
  doc.restore();
}
function drawPlaceholder(doc, x, y, w, h) {
  doc.save();
  doc.roundedRect(x, y, w, h, 8).fillAndStroke('#FFF7EF', '#E5D7C9');
  doc.fillColor('#8C1B0F').font('Helvetica-Bold').fontSize(9)
    .text('IMAGE', x, y + h/2 - 11, { width: w, align: 'center' });
  doc.fillColor('#6C4B3B').font('Helvetica').fontSize(7)
    .text('unavailable', x, y + h/2 + 2, { width: w, align: 'center' });
  doc.restore();
}
function fitImage(doc, buf, x, y, w, h) {
  if (!buf) return drawPlaceholder(doc, x, y, w, h);
  try {
    doc.image(buf, x, y, { fit: [w, h], align: 'center', valign: 'center' });
  } catch {
    drawPlaceholder(doc, x, y, w, h);
  }
}
function addCover(doc, total) {
  doc.rect(0,0,doc.page.width,doc.page.height).fill('#120A3E');
  doc.fillColor('#FFD54A').font('Helvetica-Bold').fontSize(25)
    .text('FUTURA TRADERS', 50, 145, {align:'center'});
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(28)
    .text('DEEPAVALI CRACKERS 2026', 50, 205, {align:'center'});
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18)
    .text('IMAGE CATALOGUE', 50, 255, {align:'center'});
  doc.fillColor('#DAD4FF').font('Helvetica').fontSize(12)
    .text(total + ' cracker product images arranged batch-wise in supplier order.', 70, 320, {align:'center'});
  doc.fillColor('#FFFFFF').fontSize(10)
    .text('Prepared for WhatsApp sharing', 70, 375, {align:'center'});
  doc.fillColor('#FFD54A').font('Helvetica-Bold').fontSize(11)
    .text('FUTURA - Sivakasi', 70, 430, {align:'center'});
}

function generatePdf(groups, res) {
  const total = groups.reduce((n,g)=>n+g.items.length,0);
  const doc = new PDFDocument({
    size:'A4',
    margin:0,
    info:{
      Title:'FUTURA Deepavali Crackers 2026 Image Catalogue',
      Author:'FUTURA TRADERS'
    },
    autoFirstPage:true,
    compress:true
  });
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition','attachment; filename="FUTURA_Deepavali_Crackers_2026_Image_Catalogue.pdf"');
  res.setHeader('Cache-Control','public, max-age=3600');
  doc.pipe(res);

  addCover(doc,total);

  let pageNo = 1;
  const cols = 2, rows = 3;
  const marginX = 36, gapX = 16, gapY = 16;
  const top = 70, bottom = 32;
  const usableW = doc.page.width - marginX*2;
  const usableH = doc.page.height - top - bottom;
  const cellW = (usableW - gapX) / 2;
  const cellH = (usableH - gapY*2) / 3;
  const imgH = cellH - 45;

  for (const group of groups) {
    if (!group.items.length) continue;
    let idx = 0;
    while (idx < group.items.length) {
      doc.addPage();
      pageNo++;
      drawHeader(doc, group.title, pageNo);
      for (let slot = 0; slot < cols*rows && idx < group.items.length; slot++, idx++) {
        const item = group.items[idx];
        const col = slot % cols;
        const row = Math.floor(slot / cols);
        const x = marginX + col * (cellW + gapX);
        const y = top + row * (cellH + gapY);

        doc.save();
        doc.roundedRect(x, y, cellW, cellH, 9).fillAndStroke('#FFFFFF','#E7DDD3');
        const pad = 10;
        fitImage(doc, item.buffer, x+pad, y+pad, cellW-pad*2, imgH-pad);
        doc.fillColor('#191126').font('Helvetica-Bold').fontSize(8.5)
          .text(item.name, x+10, y+imgH+8, { width:cellW-20, height:30, align:'center', ellipsis:true });
        doc.restore();
      }
    }
  }

  doc.end();
}

module.exports = async function handler(req, res) {
  try {
    const groups = await fetchCatalogue();
    const total = groups.reduce((n,g)=>n+g.items.length,0);

    // Keep the source order, but fail loudly if parsing collapses badly.
    if (total < 280) {
      return res.status(502).json({
        ok:false,
        error:'Supplier catalogue parser returned too few products',
        total,
        counts:Object.fromEntries(groups.map(g=>[g.key,g.items.length]))
      });
    }

    await fetchImages(groups);
    generatePdf(groups,res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ok:false,error:String(err && err.message || err)});
    } else {
      try { res.end(); } catch {}
    }
  }
};
