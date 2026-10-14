'use strict';
const sharp=require('sharp');
const path=require('path');
const fontkit=require('fontkit');

// Create native vector outlines. Vercel/WhatsApp thumbnails must NOT depend on
// system fonts or on SVG <text> rendering (those showed blank squares).
const FONT_FILE=require.resolve('@fontsource/inter/files/inter-latin-800-normal.woff');
let titleFont;
function drawText(value,left,baseline,fontSize,color,maxWidth){
  if(!titleFont)titleFont=fontkit.openSync(FONT_FILE);
  const shaped=titleFont.layout(value);
  let width=0;
  const glyphPaths=shaped.glyphs.map((glyph,i)=>{
    const pos=shaped.positions[i];
    if(!glyph.id)throw new Error('Missing preview glyph: '+value[i]);
    const node='<path transform="translate('+(width+pos.xOffset)+' '+pos.yOffset+')" d="'+glyph.path.toSVG()+'"/>';
    width+=pos.xAdvance;
    return node;
  }).join('');
  const scale=Math.min(fontSize/titleFont.unitsPerEm,maxWidth/Math.max(1,width));
  return '<g fill="'+color+'" transform="translate('+left+' '+baseline+') scale('+scale+' '+(-scale)+')">'+glyphPaths+'</g>';
}
module.exports=async function budgetWhatsappPreview(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.setHeader('Allow','GET, HEAD');return res.status(405).end();
  }
  try{
    const posterPath=path.join(process.cwd(),'images','crackers','budget-friendly-crackers-hero.png');
    const poster=await sharp(posterPath).resize(536,618,{fit:'contain',background:'#1c082b'}).png().toBuffer();
    const letters=[
      drawText('FUTURA TRADERS',69,113,49,'#ffe6a3',525),
      drawText('LOW BUDGET',68,200,63,'#ffffff',525),
      drawText('CRACKERS 2026',68,268,57,'#ffffff',525),
      drawText('80%',65,460,210,'#ffdd40',525),
      drawText('DISCOUNT',75,524,59,'#ffffff',520),
      drawText('OCT 15-20  |  LIMITED STOCK',78,575,28,'#ffe9a0',490)
    ].join('');
    const panel='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">'+
      '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'+
      '<stop offset="0" stop-color="#17042d"/>'+
      '<stop offset=".52" stop-color="#5e032c"/>'+
      '<stop offset="1" stop-color="#9d1a13"/></linearGradient>'+
      '<linearGradient id="line" x1="0" x2="1"><stop stop-color="#fff1aa"/><stop offset=".5" stop-color="#ffb62b"/><stop offset="1" stop-color="#fff1aa"/></linearGradient></defs>'+
      '<rect width="1200" height="630" fill="url(#bg)"/>'+
      '<circle cx="70" cy="45" r="120" fill="#c52935" opacity=".12"/>'+
      '<circle cx="510" cy="570" r="140" fill="#ff930b" opacity=".08"/>'+
      '<rect x="24" y="23" width="1152" height="583" rx="23" fill="none" stroke="url(#line)" stroke-width="6"/>'+
      '<path d="M65 293H594" stroke="#f2b13d" stroke-width="3" opacity=".85"/>'+
      '<path d="M68 545H592" stroke="#f2b13d" stroke-width="2" opacity=".65"/>'+
      letters+
      '</svg>';
    const image=await sharp(Buffer.from(panel))
      .composite([{input:poster,left:640,top:6}])
      .jpeg({quality:80,mozjpeg:true})
      .toBuffer();
    res.setHeader('Content-Type','image/jpeg');
    res.setHeader('Cache-Control','public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Length',String(image.length));
    res.setHeader('X-Content-Type-Options','nosniff');
    res.statusCode=200;
    return res.end(req.method==='HEAD'?undefined:image);
  }catch(e){
    console.error('budget preview image failed:',e);
    return res.status(500).send('Preview image unavailable');
  }
};
