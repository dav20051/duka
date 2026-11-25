// Duka · CSV downloads for owners.
// Plain browser script: loaded in order by index.html and shares the page's global scope.
// ---------- CSV export (owners) ----------
// Prefix cells that Excel would treat as formulas (CSV injection), then quote when needed.
const csvCell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return/[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
function download(name,rows){
 const blob=new Blob(['﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
async function fetchAll(build){const out=[];
 for(let from=0;;from+=1000){const {data,error}=await build().range(from,from+999);if(error)throw error;out.push(...data);if(data.length<1000)return out}}
function exportButtons(){return`<div class="m"><button class="s" onclick="exportData('sales',this)">Sales</button><button class="s" onclick="exportData('stock',this)">Stock</button><button class="s" onclick="exportData('customers',this)">Customers</button></div>`}
async function exportData(kind,btn){
 const label=btn.textContent;btn.disabled=true;btn.textContent='…';
 try{
  const sid=S.shop.id,file=`${S.shop.name.replace(/[^\w-]+/g,'_')}-${kind}-${today()}.csv`;
  const dt=t=>new Date(t).toLocaleString('en-CA',{timeZone:'Africa/Nairobi',hour12:false}).replace(',','');
  if(kind=='sales'){
   const [sales,custs]=await Promise.all([
    fetchAll(()=>sb.from('sales').select('id,created_at,total,paid,method,mpesa_code,voided,customer_id,sale_items(name,qty,unit_price,unit_cost)').eq('shop_id',sid).order('created_at')),
    fetchAll(()=>sb.from('customer_balances').select('customer_id,name').eq('shop_id',sid))]);
   const cn=Object.fromEntries(custs.map(c=>[c.customer_id,c.name]));
   download(file,[['Date & time','Item','Qty','Unit price','Line total','Unit cost','Payment','M-Pesa code','Customer','Sale total','Paid','Voided'],
    ...sales.flatMap(s=>(s.sale_items.length?s.sale_items:[{}]).map(i=>[dt(s.created_at),i.name,i.qty,i.unit_price,i.qty*i.unit_price||'',i.unit_cost,s.method,s.mpesa_code,cn[s.customer_id]||'',s.total,s.paid,s.voided?'yes':'']))]);
  }else if(kind=='stock'){
   const p=await fetchAll(()=>sb.from('products').select('name,variant,category,sku,unit,buy_price,sell_price,stock_qty,low_stock_at,expiry,active').eq('shop_id',sid).order('name'));
   download(file,[['Name','Variant','Category','SKU','Unit','Buy price','Sell price','In stock','Reorder at','Expiry','Active'],
    ...p.map(x=>[x.name,x.variant,x.category,x.sku,x.unit,x.buy_price,x.sell_price,x.stock_qty,x.low_stock_at,x.expiry,x.active?'yes':'no'])]);
  }else{
   const c=await fetchAll(()=>sb.from('customer_balances').select('name,phone,balance,credit_limit,oldest_unpaid_at,last_payment_at,active').eq('shop_id',sid).order('name'));
   const dd=t=>t?new Date(t).toLocaleDateString('en-CA',{timeZone:'Africa/Nairobi'}):'';
   download(file,[['Name','Phone','Balance owed','Credit limit','Owing since','Last payment','Active'],...c.map(x=>[x.name,x.phone,x.balance,x.credit_limit,+x.balance>0?dd(x.oldest_unpaid_at):'',dd(x.last_payment_at),x.active===false?'no':'yes'])]);
  }
 }catch(e){alert('Download failed: '+(e.message||e))}
 finally{btn.disabled=false;btn.textContent=label}}

