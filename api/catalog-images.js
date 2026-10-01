function decodeHtml(s){
  return String(s||'')
    .replace(/&quot;/gi,'"')
    .replace(/&#0?39;|&apos;/gi,"'")
    .replace(/&amp;/gi,'&')
    .replace(/&nbsp;/gi,' ')
    .replace(/&#(\d+);/g,function(_,n){return String.fromCharCode(Number(n));});
}
function normalize(s){
  return decodeHtml(String(s||'').replace(/<[^>]*>/g,' '))
    .toUpperCase().replace(/[“”]/g,'"').replace(/[’]/g,"'")
    .replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function attr(tag,name){
  var re=new RegExp('\\b'+name+'\\s*=\\s*(["\\\'])([\\s\\S]*?)\\1','i');
  var m=tag.match(re);
  return m?decodeHtml(m[2]).trim():'';
}
function absoluteUrl(u){
  if(!u) return '';
  if(u.indexOf('//')===0) return 'https:'+u;
  if(u.indexOf('/')===0) return 'https://pyrobazaar.in'+u;
  return u;
}
module.exports=async function handler(req,res){
  try{
    var upstream=await fetch('https://pyrobazaar.in/quickshopping',{
      headers:{'User-Agent':'Mozilla/5.0 (compatible; FUTURA-Catalog/1.0)','Accept':'text/html,application/xhtml+xml'}
    });
    if(!upstream.ok) throw new Error('upstream '+upstream.status);
    var page=await upstream.text();
    var items=[];
    var rowRe=/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi,m;
    while((m=rowRe.exec(page))){
      var body=m[1];
      var tags=body.match(/<img\b[^>]*>/gi)||[];
      var src='',bestScore=-999;
      for(var i=0;i<tags.length;i++){
        var tag=tags[i];
        var alt=normalize(attr(tag,'alt'));
        var title=normalize(attr(tag,'title'));
        var cls=normalize(attr(tag,'class'));
        var candidates=[attr(tag,'data-src'),attr(tag,'data-original'),attr(tag,'src')].map(absoluteUrl).filter(Boolean);

        for(var j=0;j<candidates.length;j++){
          var u=candidates[j];
          if(!(/imgcdn\.iar\.net\.in|assetv2\.iar\.net\.in/i.test(u))) continue;
          if(/placeholder\.png/i.test(u)) continue;

          var meta=(u+' '+alt+' '+title+' '+cls).toUpperCase();

          // Never use website/brand UI artwork as a product photo.
          if(/PYRO\s*BAZAAR|PYROBAZAAR|LOGO|WISHLIST|COMPARE|REVIEW|RATING|ICON|BADGE/.test(meta)) continue;

          var score=0;
          if(alt && alt.length>5 && normalize(body).indexOf(alt)!==-1) score+=8;
          if(title && title.length>5 && normalize(body).indexOf(title)!==-1) score+=4;
          if(/\.(JPE?G|PNG|WEBP)(\?|$)/i.test(u)) score+=2;
          if(/PRODUCT|CRACKER|SPARKLER|SHOT|POT|CHAKKAR|ROCKET|BOMB|FOUNTAIN|FANCY|GIFT/i.test(meta)) score+=2;

          // Prefer the first equally good product image instead of the last image in the row.
          if(score>bestScore){
            bestScore=score;
            src=u;
          }
        }
      }
      if(!src) continue;
      var key=normalize(body);
      if(key) items.push({key:key,src:src});
    }
    res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.status(200).end(JSON.stringify({ok:true,count:items.length,items:items}));
  }catch(err){
    res.setHeader('Cache-Control','no-store');
    res.status(502).json({ok:false,error:String(err&&err.message||err)});
  }
};