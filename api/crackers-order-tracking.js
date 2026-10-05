const SHEETS_URL='https://script.google.com/macros/s/AKfycbx6mOgt3AvJ189x4Amiy80XU2ood4aa864e8MIEwFrkIswD2I1N6uKTfpzbM_LEDlFS3w/exec';
const origins=['https://www.futuraonlineprint.in','https://futuraonlineprint.in','https://ganesh-printers-landing-page.vercel.app'];
function normalizeMobile(value){
  if(typeof value!=='string'||value.length>20||!/^[+0-9()\-\s]+$/.test(value))return '';
  let digits=value.replace(/\D/g,'');
  if(digits.length===12&&digits.startsWith('91'))digits=digits.slice(2);
  if(digits.length===11&&digits.startsWith('0'))digits=digits.slice(1);
  return /^[6-9][0-9]{9}$/.test(digits)?digits:'';
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('Referrer-Policy','no-referrer');
  if(req.method==='GET'){
    try{const reply=await fetch(SHEETS_URL,{signal:AbortSignal.timeout(15000)}),health=await reply.json();return res.status(200).json({ok:true,mobileOrderAccessAvailable:reply.ok&&health.mobileOrderAccess===true});}
    catch(e){return res.status(503).json({ok:false,mobileOrderAccessAvailable:false});}
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Use POST'});}
  if(req.headers?.origin&&!origins.includes(req.headers.origin))return res.status(403).json({ok:false,error:'Invalid origin'});
  let data;try{data=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch(e){}
  const raw=typeof data?.orderId==='string'?data.orderId.trim():'',mobile=normalizeMobile(data?.mobile);
  if(!/^[0-9]{1,12}$/.test(raw)||Number(raw)<101||!mobile)return res.status(400).json({ok:false,error:'Enter your Order ID and the mobile number registered for that order.'});
  const orderId=String(Number(raw)).padStart(4,'0');
  try{
    const reply=await fetch(SHEETS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'trackOrder',orderId,mobile}),signal:AbortSignal.timeout(25000)}),result=await reply.json();
    if(!reply.ok||result.accessVersion!=='mobile-v1')return res.status(503).json({ok:false,error:'Order access is temporarily unavailable. Please retry shortly.'});
    if(result.ok!==true||result.mobileVerified!==true)return res.status(401).json({ok:false,error:'Order ID and registered mobile number do not match, or access is temporarily locked. Please check and retry.'});
    if(result.orderId!==orderId||typeof result.paymentConfirmed!=='boolean'||!Array.isArray(result.items)||result.items.length>300)throw Error('Invalid order');
    const output={ok:true,mobileVerified:true,orderId,paymentConfirmed:result.paymentConfirmed};
    if(result.paymentConfirmed){if(!Number.isFinite(result.receivedAmount)||result.receivedAmount<=0)throw Error('Invalid payment');output.receivedAmount=result.receivedAmount;}
    for(const key of ['orderValue','productTotal'])if(Number.isFinite(result[key]))output[key]=result[key];
    for(const key of ['clientName','city','maskedMobile','paymentMode','receiverName','paymentConfirmedAt','status','dispatchDate','transportName','parcelNumber','deliveredDate','updatedAt'])output[key]=String(result[key]||'').slice(0,160);
    output.items=result.items.map(item=>{
      if(!Number.isInteger(item.serial)||item.serial<1||item.serial>300||!Number.isInteger(item.qty)||item.qty<1||item.qty>10000||!Number.isFinite(item.price)||item.price<=0||item.price>1000000)throw Error('Invalid item');
      return {serial:item.serial,name:String(item.name||'').slice(0,250),companyCode:String(item.companyCode||'').slice(0,40),qty:item.qty,price:item.price,subtotal:Math.round(item.qty*Math.round(item.price*100))/100};
    });return res.status(200).json(output);
  }catch(e){return res.status(503).json({ok:false,error:'Order access is temporarily unavailable. Please retry.'});}
};
module.exports.normalizeMobile=normalizeMobile;
