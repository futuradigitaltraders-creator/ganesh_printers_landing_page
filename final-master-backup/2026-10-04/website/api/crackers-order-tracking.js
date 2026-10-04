const SHEETS_URL='https://script.google.com/macros/s/AKfycbx6mOgt3AvJ189x4Amiy80XU2ood4aa864e8MIEwFrkIswD2I1N6uKTfpzbM_LEDlFS3w/exec';
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Use POST'});}
  let data;
  try{data=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch(e){}
  if(!data || !/^[0-9]{4,12}$/.test(data.orderId||'') || !/^[a-f0-9]{64}$/.test(data.token||''))return res.status(400).json({ok:false,error:'Please use the tracking link in your confirmation email.'});
  try{
    const url=new URL(SHEETS_URL);url.searchParams.set('action','trackOrder');url.searchParams.set('orderId',data.orderId);url.searchParams.set('token',data.token);
    const reply=await fetch(url,{signal:AbortSignal.timeout(25000)}),result=await reply.json();
    // Reject older deployments rather than accidentally treating their health
    // response as order data. Only selected client-facing fields are returned.
    if(!reply.ok || result.orderId!==data.orderId || typeof result.paymentConfirmed!=='boolean')return res.status(result.ok===false?404:503).json({ok:false,error:result.ok===false?'Order not found. Please check your email link.':'Tracking updates are temporarily unavailable. Please retry.'});
    if(!result.paymentConfirmed)return res.status(200).json({ok:true,orderId:data.orderId,paymentConfirmed:false});
    if(!Number.isFinite(result.receivedAmount) || result.receivedAmount<=0)return res.status(503).json({ok:false,error:'Tracking updates are temporarily unavailable.'});
    const output={ok:true,orderId:data.orderId,paymentConfirmed:true,receivedAmount:result.receivedAmount};
    if(Number.isFinite(result.orderValue))output.orderValue=result.orderValue;
    for(const key of ['clientName','city','maskedMobile','paymentMode','receiverName','paymentConfirmedAt','status','dispatchDate','transportName','parcelNumber','deliveredDate','updatedAt'])output[key]=String(result[key]||'').slice(0,160);
    return res.status(200).json(output);
  }catch(e){return res.status(503).json({ok:false,error:'Tracking updates are temporarily unavailable. Please retry.'});}
};
