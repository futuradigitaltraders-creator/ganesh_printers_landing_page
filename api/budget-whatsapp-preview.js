'use strict';
const sharp = require('sharp');
const path = require('path');

module.exports = async function budgetWhatsappPreview(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  try {
    const posterPath = path.join(process.cwd(), 'images', 'crackers', 'budget-friendly-crackers-hero.png');
    const poster = await sharp(posterPath)
      .resize(540, 630, { fit: 'contain', background: '#16042d' })
      .png()
      .toBuffer();
    const panel = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#180435"/>
          <stop offset="0.55" stop-color="#640036"/>
          <stop offset="1" stop-color="#b11d0f"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#background)"/>
      <rect x="24" y="24" width="1152" height="582" rx="25" fill="none" stroke="#ffdc5a" stroke-width="8"/>
      <text x="68" y="113" fill="#fff3b4" font-size="48" font-family="Arial,sans-serif" font-weight="900">FUTURA TRADERS</text>
      <text x="68" y="192" fill="#ffffff" font-size="54" font-family="Arial,sans-serif" font-weight="900">LOW BUDGET</text>
      <text x="68" y="258" fill="#ffffff" font-size="54" font-family="Arial,sans-serif" font-weight="900">CRACKERS 2026</text>
      <text x="66" y="445" fill="#ffdf4b" font-size="190" font-family="Arial,sans-serif" font-weight="900">80%</text>
      <text x="75" y="519" fill="#ffffff" font-size="60" font-family="Arial,sans-serif" font-weight="900">DISCOUNT</text>
      <text x="77" y="574" fill="#ffe9a0" font-size="28" font-family="Arial,sans-serif" font-weight="900">OCT 15-20  |  LIMITED STOCK</text>
    </svg>`;
    const image = await sharp(Buffer.from(panel))
      .composite([{input:poster, left:645, top:0}])
      .jpeg({quality:65, mozjpeg:true})
      .toBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Length', String(image.length));
    res.setHeader('X-Content-Type-Options','nosniff');
    res.statusCode=200;
    return res.end(req.method==='HEAD' ? undefined : image);
  } catch (e) {
    console.error('budget preview image failed:',e);
    return res.status(500).send('Preview image unavailable');
  }
};