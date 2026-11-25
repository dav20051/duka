// Duka · Customers and debts, product editing, charts, staff, password reset, daily summary.
// Plain browser script: loaded in order by index.html and shares the page's global scope.
// ---------- Customers & debts ----------
const activeCustomers=()=>S.customers.filter(c=>c.active!==false).sort((a,b)=>a.name.localeCompare(b.name));
const ageDays=c=>c.oldest_unpaid_at&&+c.balance>0?Math.max(0,Math.floor((Date.now()-new Date(c.oldest_unpaid_at))/864e5)):0;
function ageBadge(c){if(!(+c.balance>0))return'';const n=ageDays(c);
 return`<span class="${n>30?'low':n>=7?'ex':''}">${n>30?'⚠ ':''}${n==0?'today':n==1?'1 day':n+' days'}</span>`}
const overLimit=c=>c.credit_limit!=null&&+c.balance>+c.credit_limit;
function custLine(){const c=S.customers.find(x=>x.customer_id==S.cust);if(!c)return'';
 return`<p class="lb">${esc(c.name)} owes ${kes(c.balance)}${c.credit_limit!=null?` · limit ${kes(c.credit_limit)}`:''}${overLimit(c)?' · <span class="low">over limit</span>':''}</p>`}
function debtList(){const q=(S.dq||'').toLowerCase().trim(),all=S.df=='all';
 let L=(all?S.customers.filter(c=>c.active!==false||+c.balance>0):S.customers.filter(c=>+c.balance>0)).filter(c=>!q||[c.name,c.phone].join(' ').toLowerCase().includes(q));
 L=all?L.sort((a,b)=>a.name.localeCompare(b.name)):L.sort((a,b)=>ageDays(b)-ageDays(a)||b.balance-a.balance);
 if(!L.length)return q?'<p>No customers match.</p>':all?'<p>No customers yet.</p>':'<p>No debts. 🎉</p>';
 return L.map(c=>`<div class="row tap" onclick="customerView('${c.customer_id}')"><div>${esc(c.name)}<small>${+c.balance>0?`${kes(c.balance)} · ${ageBadge(c)}`:(+c.balance<0?`credit ${kes(-c.balance)}`:'owes nothing')}${c.credit_limit!=null?` · limit ${kes(c.credit_limit)}`:''}${overLimit(c)?' · <span class="low">over limit</span>':''}${c.phone?' · '+esc(c.phone):''}</small></div>
  <div onclick="event.stopPropagation()">${+c.balance>0?`<button class="s" onclick="payDebt('${c.customer_id}')">Paid</button>`:''} ${c.phone&&+c.balance>0?`<a href="${esc(wa(c))}" target="_blank" rel="noopener"><button class="s">Remind</button></a>`:''}</div></div>`).join('')}
// New / edit customer (also used from the Sell screen)
function customerForm(id,cb){const c=id?S.customers.find(x=>x.customer_id==id):null;S.cfcb=cb||null;closeEdit();
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>${c?'Edit customer':'New customer'}</h3>
 <input id="cfn" placeholder="Name" value="${esc(c?c.name:'')}"><input id="cfp" type="tel" placeholder="Phone e.g. 0712345678" value="${esc(c&&c.phone||'')}">
 ${S.role=='owner'?`<label class="lb">Credit limit (optional): the most this customer may owe</label><input id="cfl" type="number" inputmode="numeric" placeholder="No limit" value="${c&&c.credit_limit!=null?c.credit_limit:''}">`:''}
 <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="saveCustomer(${c?`'${c.customer_id}'`:'null'},this)">Save</button></div></div></div>`);
 setTimeout(()=>$('#cfn')&&$('#cfn').focus(),50)}
async function saveCustomer(id,btn){const n=$('#cfn').value.trim(),ph=$('#cfp').value.trim();if(!n)return alert('Enter a name');
 const dg=ph.replace(/\D/g,'');if(ph&&!/^(0|254)?[17]\d{8}$/.test(dg)&&!confirm('This does not look like a Kenyan mobile number. Save anyway?'))return;
 if(ph&&S.customers.some(c=>c.customer_id!=id&&c.active!==false&&c.phone&&c.phone.replace(/\D/g,'').slice(-9)==dg.slice(-9)))return alert('A customer with this phone number already exists');
 const row={name:n.slice(0,120),phone:ph||null};const l=$('#cfl');if(l)row.credit_limit=l.value===''?null:Math.max(0,+l.value);
 btn.disabled=true;let newId=id;
 if(id){const {error}=await sb.from('customers').update(row).eq('id',id);if(error){btn.disabled=false;return alert(error.message)}}
 else{const {data,error}=await sb.from('customers').insert({...row,shop_id:S.shop.id}).select('id').single();if(error){btn.disabled=false;return alert(error.message)}newId=data.id}
 const cb=S.cfcb;S.cfcb=null;closeEdit();await load();saveCache();if(cb)cb(newId);else render()}
async function removeCustomer(id){const c=S.customers.find(x=>x.customer_id==id);
 if(+c.balance>0)return alert(`${c.name} still owes ${kes(c.balance)}. Record the payment first.`);
 if(!confirm(`Remove ${c.name} from your customer list? Their history is kept.`))return;
 const {error}=await sb.from('customers').update({active:false}).eq('id',id);if(error)return alert(error.message);closeEdit();await load();saveCache();render()}
// Record a payment
function payDebt(id){const c=S.customers.find(x=>x.customer_id==id);S.pm='cash';closeEdit();
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>Payment · ${esc(c.name)}</h3><p class="lb">Owes ${kes(c.balance)}</p>
 <label class="lb">Amount received</label><div class="ib"><input id="pa" type="number" inputmode="numeric" step="any" oninput="pdCalc('${id}')">${+c.balance>0?`<button class="s" onclick="$('#pa').value=${+c.balance};pdCalc('${id}')">All ${kes(c.balance)}</button>`:''}</div>
 <div class="m"><button id="pmc" class="on" onclick="pdMethod('cash')">Cash</button><button id="pmm" onclick="pdMethod('mpesa')">M-Pesa</button></div>
 <input id="pcode" placeholder="M-Pesa code (optional)" style="display:none;text-transform:uppercase"><p class="lb" id="pd"></p>
 <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="savePayment('${id}',this)">Save payment</button></div></div></div>`);
 setTimeout(()=>$('#pa')&&$('#pa').focus(),50)}
function pdMethod(m){S.pm=m;$('#pmc').className=m=='cash'?'on':'';$('#pmm').className=m=='mpesa'?'on':'';$('#pcode').style.display=m=='mpesa'?'':'none'}
function pdCalc(id){const c=S.customers.find(x=>x.customer_id==id),a=+$('#pa').value,nb=r2(c.balance-a);
 $('#pd').innerHTML=a>0?(nb>0?`New balance: <b>${kes(nb)}</b>`:nb==0?'Fully paid ✔':`Paid in full, with <b>${kes(-nb)}</b> extra kept as credit`):''}
async function savePayment(id,btn){const c=S.customers.find(x=>x.customer_id==id),a=+$('#pa').value;if(!(a>0))return alert('Enter the amount received');
 const code=S.pm=='mpesa'?($('#pcode').value.trim().toUpperCase()||null):null;btn.disabled=true;
 const {error}=await sb.from('debt_payments').insert({shop_id:S.shop.id,customer_id:id,amount:a,method:S.pm,mpesa_code:code});
 if(error){btn.disabled=false;return alert(error.message)}
 const nb=r2(c.balance-a),when=new Date().toLocaleString('en-KE',{timeZone:'Africa/Nairobi',dateStyle:'medium',timeStyle:'short'});
 const txt=`${S.shop.name}\nPayment received: ${kes(a)} (${S.pm=='mpesa'?'M-Pesa'+(code?' '+code:''):'Cash'})\nFrom: ${c.name}\n${when}\n${nb>0?'Balance remaining: '+kes(nb):nb<0?'Credit: '+kes(-nb):'Fully paid. Thank you!'}\nAsante!`;
 closeEdit();await load();saveCache();render();
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>Payment saved ✔</h3>
 <div class="rc" data-nt style="white-space:pre-line">${esc(txt)}</div>
 <div class="m"><a style="flex:1" href="https://wa.me/${waNum(c.phone)}?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener"><button style="width:100%">Send on WhatsApp</button></a><button class="p" onclick="closeEdit()">Close</button></div></div></div>`)}
const waNum=ph=>{let p=(ph||'').replace(/\D/g,'');if(p.startsWith('0'))p='254'+p.slice(1);else if(/^[17]\d{8}$/.test(p))p='254'+p;return p};
// Customer page: history, statement, actions
async function customerView(id){const c=S.customers.find(x=>x.customer_id==id);if(!c)return;
 const [s,p]=await Promise.all([
  sb.from('sales').select('id,created_at,total,paid,method,mpesa_code,voided,sale_items(name,qty,unit_price)').eq('customer_id',id).order('created_at',{ascending:false}).limit(200),
  sb.from('debt_payments').select('id,created_at,amount,method,mpesa_code').eq('customer_id',id).order('created_at',{ascending:false}).limit(200)]);
 if(s.error||p.error)return alert((s.error||p.error).message);
 const H=[...(s.data||[]).map(x=>({t:x.created_at,k:'sale',x})),...(p.data||[]).map(x=>({t:x.created_at,k:'pay',x}))].sort((a,b)=>a.t<b.t?-1:1);
 let bal=0;H.forEach(h=>{if(h.k=='sale'){if(!h.x.voided)bal+= +h.x.total- +h.x.paid}else bal-= +h.x.amount;h.bal=r2(bal)});
 S.cv={c,H};closeEdit();const d=t=>new Date(t).toLocaleDateString('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short'});
 const items=x=>(x.sale_items||[]).map(i=>`${i.name} ×${fq(i.qty)}`).join(', ')||'Sale';
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet" style="max-height:96vh">
 <h3>${esc(c.name)}</h3><p class="lb">${c.phone?`<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a> · `:''}customer since ${d(c.created_at)}</p>
 <div class="g"><div class="card">${+c.balance<0?'Credit':'Owes'}<b class="${overLimit(c)?'low':''}">${kes(Math.abs(c.balance))}</b><small>${+c.balance>0?'oldest unpaid: '+ageBadge(c):'all paid'}</small></div>
 <div class="card">Credit limit<b>${c.credit_limit!=null?kes(c.credit_limit):'None'}</b><small>${c.last_payment_at?'last paid '+d(c.last_payment_at):'no payments yet'}</small></div></div>
 <div class="tools">${+c.balance>0?`<button class="p" onclick="payDebt('${id}')">💵 Record payment</button>`:''}<a href="https://wa.me/${waNum(c.phone)}?text=${encodeURIComponent(statementText())}" target="_blank" rel="noopener"><button class="s">📤 Statement</button></a>
 ${c.phone&&+c.balance>0&&S.settings&&S.settings.sms_enabled?`<button class="s" onclick="sendSms('${id}',this)">💬 SMS</button>`:''}<button class="s" onclick="customerForm('${id}')">✏️ Edit</button>${S.role=='owner'?`<button class="s" onclick="removeCustomer('${id}')">Remove</button>`:''}</div>
 <h3>History</h3>${H.length?[...H].reverse().map(h=>h.k=='sale'?`<div class="row"><div>${d(h.t)} · ${esc(items(h.x))}<small>${h.x.voided?'<s>':''}Bought ${kes(h.x.total)}${+h.x.paid?` · paid ${kes(h.x.paid)}`:''}${h.x.voided?'</s> · VOIDED':''}</small></div><small>bal ${kes(h.bal)}</small></div>`
  :`<div class="row"><div>${d(h.t)} · Paid <b>${kes(h.x.amount)}</b><small>${h.x.method=='mpesa'?'M-Pesa'+(h.x.mpesa_code?' '+esc(h.x.mpesa_code):''):'Cash'}</small></div><small>bal ${kes(h.bal)}</small></div>`).join(''):'<p>No history yet.</p>'}
 <p><button onclick="closeEdit()" style="width:100%">Close</button></p></div></div>`)}
function statementText(){const {c,H}=S.cv,d=t=>new Date(t).toLocaleDateString('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short'});
 const L=[`*${S.shop.name}*`,`Statement for ${c.name}`,''];const recent=H.filter(h=>!(h.k=='sale'&&h.x.voided)).slice(-15);
 if(H.length>recent.length)L.push('…earlier entries not shown');
 recent.forEach(h=>L.push(h.k=='sale'?`${d(h.t)}: ${(h.x.sale_items||[]).map(i=>`${i.name} x${fq(i.qty)}`).join(', ')||'Goods'} = ${kes(h.x.total)}${+h.x.paid?` (paid ${kes(h.x.paid)})`:''}`
  :`${d(h.t)}: Paid ${kes(h.x.amount)}${h.x.method=='mpesa'?' M-Pesa':''}`));
 if(+c.balance>0&&payLine())L.push('',payLine());
 L.push('',+c.balance>0?`*Balance: ${kes(c.balance)}*`:+c.balance<0?`Credit: ${kes(-c.balance)}`:'Balance: KES 0. Thank you!','Asante!');return L.join('\n')}
function wa(c){let p=(c.phone||'').replace(/\D/g,'');if(p.startsWith('0'))p='254'+p.slice(1);
 return`https://wa.me/${p}?text=`+encodeURIComponent(`Hello ${c.name}, a friendly reminder that your balance at ${S.shop.name} is ${kes(c.balance)}.${payLine()?' '+payLine()+'.':''} Thank you!`)}

const UNITS=['pc','kg','g','L','ml','m','pkt','dozen','bag','box','bottle','tray'];
function setQty(id){const u=S.products.find(p=>p.id==id).unit,q=parseFloat(prompt('Quantity in '+u+' (e.g. 0.5)',S.cart[id]));if(q>0){S.cart[id]=q;$('#cart').innerHTML=cartView()}}
async function editProduct(id){const p=S.products.find(x=>x.id==id);
 const sp=prompt('Selling price per '+p.unit,p.sell_price);if(sp===null)return;
 const bp=prompt('Buying price per '+p.unit,p.buy_price);if(bp===null)return;
 const lo=prompt('Reorder at (warn when stock reaches this)',p.low_stock_at);if(lo===null)return;
 const un=prompt('Unit: '+unitsFor().join(', '),p.unit);if(un===null)return;
 const sk=cfg().sku?prompt('SKU / barcode (empty = none)',p.sku||''):(p.sku||'');if(sk===null)return;
 const ex=cfg().exp?prompt('Earliest expiry YYYY-MM-DD (empty = none)',p.expiry||''):(p.expiry||'');if(ex===null)return;
 if(ex.trim()&&!/^\d{4}-\d{2}-\d{2}$/.test(ex.trim()))return alert('Use the format YYYY-MM-DD');
 const {error}=await sb.from('products').update({sell_price:+sp||0,buy_price:+bp||0,low_stock_at:+lo||0,unit:un.trim()||p.unit,sku:sk.trim()||null,expiry:ex.trim()||null}).eq('id',id);
 if(error)return alert(error.message);await load();render()}

const pn=p=>esc(p.name)+(p.variant?' · '+esc(p.variant):'');
const TYPES=[['general','General shop / duka'],['hardware','Hardware'],['boutique','Boutique / clothes'],['pharmacy','Pharmacy / chemist'],['agrovet','Agrovet'],['other','Other']];
const VARPH={boutique:'Size / colour e.g. M, Black',hardware:'Size / spec e.g. 1/2 inch',pharmacy:'Strength e.g. 500mg',agrovet:'Pack size e.g. 1kg'};
const TOP={hardware:['pc','m','kg','bag','L','roll','length','sheet','box'],boutique:['pc','pair','set','m'],pharmacy:['pc','pkt','box','bottle','ml','g'],agrovet:['kg','bag','pc','L','ml','g','pkt']};
function unitsFor(){return cfg().units}
S.pr={};
const price=p=>S.pr[p.id]??p.sell_price;
function setPrice(id){const p=S.products.find(x=>x.id==id),v=parseFloat(prompt('Price per '+p.unit+' for this sale (normal: '+p.sell_price+')',price(p)));
 if(!(v>=0))return;if(v<p.buy_price&&!confirm('Below your buying price ('+p.buy_price+'). Sell at a loss?'))return;
 S.pr[p.id]=v;$('#cart').innerHTML=cartView()}

const soon=d=>new Date(Date.now()+d*864e5).toLocaleDateString('en-CA',{timeZone:'Africa/Nairobi'});
const meta=p=>(cfg().sku&&p.sku?' · '+esc(p.sku):'')+(cfg().exp&&p.expiry?` · <span class="${p.expiry<=soon(30)?'ex':''}">exp ${p.expiry}</span>`:'');
function scanAdd(el){const c=el.value.trim().toLowerCase(),p=S.products.find(x=>x.sku&&x.sku.toLowerCase()==c);
 if(!p)return;add(p.id);S.q='';el.value='';$('#pl').innerHTML=plist()}
function askExp(p){if(!cfg().exp)return{};
 const e=(prompt('Earliest expiry date on the shelf now, YYYY-MM-DD (empty = keep)',p.expiry||'')||'').trim();
 if(!e)return{};if(!/^\d{4}-\d{2}-\d{2}$/.test(e)){alert('Use the format YYYY-MM-DD');return{}}return{expiry:e}}

const U1=['pc','kg','g','L','ml','pkt','dozen','bag','box','bottle','tray'];
const CFG={
 general:{cat:0,var:0,sku:0,exp:0,varph:'',units:U1},
 other:{cat:0,var:0,sku:0,exp:0,varph:'',units:[...U1,'m','pair','set']},
 hardware:{cat:1,var:1,sku:1,exp:0,varph:'Size / spec e.g. 1/2 inch',units:['pc','m','kg','bag','L','roll','length','sheet','box','pkt']},
 boutique:{cat:1,var:1,sku:1,exp:0,varph:'Size / colour e.g. M, Black',units:['pc','pair','set','m']},
 pharmacy:{cat:1,var:1,sku:1,exp:1,varph:'Strength e.g. 500mg',units:['pc','pkt','strip','box','bottle','ml','g']},
 agrovet:{cat:1,var:1,sku:1,exp:1,varph:'Pack size e.g. 1kg',units:['kg','bag','pc','L','ml','g','pkt','bottle']}};
const cfg=()=>CFG[S.shop.type]||CFG.general;

S.sales=[];
try{document.documentElement.dataset.theme=localStorage.getItem('th')||'dark'}catch(e){}
function toggleTheme(){const t=document.documentElement.dataset.theme=='light'?'dark':'light';document.documentElement.dataset.theme=t;try{localStorage.setItem('th',t)}catch(e){}}
const owed=()=>S.customers.reduce((a,c)=>a+Math.max(0,+c.balance),0);
const debtors=()=>S.customers.filter(c=>c.balance>0).length;
const stockVal=()=>S.products.reduce((a,p)=>a+p.stock_qty*p.buy_price,0);
const hm=t=>new Date(t).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Nairobi'});
function chart(){const d=[...S.days].reverse(),m=Math.max(1,...d.map(x=>+x.sales_total));
 return d.length?`<h3>Last 7 days</h3><div class="bars">${d.map(x=>`<div class="bar"><i style="height:${Math.max(4,Math.round(x.sales_total/m*80))}px"></i><small>${x.day.slice(8)}</small></div>`).join('')}</div><p class="lb">Week: sales ${kes(d.reduce((a,x)=>a+ +x.sales_total,0))} · profit ${kes(d.reduce((a,x)=>a+ +x.profit_estimate,0))}</p>`:''}
function topSellers(){const m={};S.sales.filter(s=>!s.voided).forEach(s=>(s.sale_items||[]).forEach(i=>{m[i.name]=m[i.name]||{q:0,r:0};m[i.name].q+=+i.qty;m[i.name].r+=i.qty*i.unit_price}));
 const t=Object.entries(m).sort((a,b)=>b[1].r-a[1].r).slice(0,5);
 return t.length?`<h3>Top sellers (7 days)</h3>${t.map(([n,v],i)=>`<div class="row"><div>${i+1}. ${esc(n)}<small>${v.q} sold</small></div><b>${kes(v.r)}</b></div>`).join('')}`:''}
function payMix(){const td=today(),x={cash:0,mpesa:0,debt:0};
 S.sales.filter(s=>!s.voided&&new Date(s.created_at).toLocaleDateString('en-CA',{timeZone:'Africa/Nairobi'})==td).forEach(s=>{if(s.method in x)x[s.method]+= +s.total});
 const T=x.cash+x.mpesa+x.debt;if(!T)return'';const pc=k=>Math.round(x[k]/T*100);
 return`<h3>Today by payment</h3><div class="mix"><i style="width:${pc('cash')}%;background:var(--accent)"></i><i style="width:${pc('mpesa')}%;background:#8fb996"></i><i style="width:${pc('debt')}%;background:var(--rose)"></i></div><p class="lb">Cash ${kes(x.cash)} · M-Pesa ${kes(x.mpesa)} · Debt ${kes(x.debt)}</p>`}
function recent(){return S.sales.length?`<h3>Recent sales</h3>${S.sales.slice(0,8).map(s=>`<div class="row"><div>${hm(s.created_at)} · ${(s.sale_items||[]).length} item(s)<small>${s.method}${s.voided?' · VOIDED':''}${s.pending?' · <span class="pend">waiting to sync</span>':''}</small></div><div><b>${s.voided?'<s>'+kes(s.total)+'</s>':kes(s.total)}</b> <button class="s" onclick="showReceipt(S.sales.find(x=>x.id=='${s.id}'))">Receipt</button>${s.voided||s.pending||!can('void')?'':` <button class="s" onclick="voidSale('${s.id}')">Void</button>`}</div></div>`).join('')}`:''}

function editProduct(id){
 const p=S.products.find(x=>x.id==id),c=cfg();
 const f=(l,i)=>`<label class="lb">${l}</label>${i}`;
 const units=[...new Set([...unitsFor(),p.unit])].map(u=>`<option ${u==p.unit?'selected':''}>${esc(u)}</option>`).join('');
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet">
 <h3>Edit product</h3>
 ${f('Name',`<input id="en" value="${esc(p.name)}">`)}
 ${c.cat?f('Category',`<input id="ec" value="${esc(p.category||'')}">`):''}
 ${c.var?f(c.varph||'Size / variant',`<input id="ev" value="${esc(p.variant||'')}">`):''}
 ${c.sku?f('SKU / barcode',`<input id="ek" value="${esc(p.sku||'')}">`):''}
 <div class="g">${f('Buy price',`<input id="eb" type="number" step="any" value="${p.buy_price}">`)}${f('Sell price',`<input id="es" type="number" step="any" value="${p.sell_price}">`)}</div>
 <div class="g">${f('Stock quantity',`<input id="eq" type="number" step="any" value="${p.stock_qty}">`)}${f('Unit',`<select id="eu">${units}</select>`)}</div>
 ${f('Warn me when stock reaches',`<input id="er" type="number" step="any" value="${p.low_stock_at}">`)}
 ${c.exp?f('Expiry date (earliest on the shelf)',`<input id="ex" type="date" value="${p.expiry||''}">`):''}
 <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="saveEdit('${p.id}')">Save</button></div>
 <button class="s" style="color:var(--rose);border-color:var(--rose)" onclick="removeProduct('${p.id}')">Remove product</button>
 </div></div>`)}
function closeEdit(){const m=document.querySelector('.modal');if(m)m.remove()}
async function saveEdit(id){
 const p=S.products.find(x=>x.id==id),g=i=>{const e=$('#'+i);return e?e.value.trim():null};
 const name=g('en');if(!name)return alert('Enter a name');
 const q=+g('eq');if(isNaN(q)||q<0)return alert('Enter a valid stock quantity');
 const u={name,buy_price:+g('eb')||0,sell_price:+g('es')||0,stock_qty:q,unit:g('eu')||p.unit,low_stock_at:+g('er')||0};
 if(g('ec')!==null)u.category=g('ec')||null;
 if(g('ev')!==null)u.variant=g('ev')||null;
 if(g('ek')!==null)u.sku=g('ek')||null;
 if(g('ex')!==null)u.expiry=g('ex')||null;
 const {error}=await sb.from('products').update(u).eq('id',id);
 if(error)return alert(error.message.includes('products_shop_sku')?'That SKU is already used by another product':error.message);
 if(q!==+p.stock_qty)await sb.from('stock_movements').insert({shop_id:S.shop.id,product_id:id,change:q-p.stock_qty,reason:'adjustment'});
 closeEdit();await load();render()}
async function removeProduct(id){if(!confirm('Remove this product from your list? Past sales are kept.'))return;
 const {error}=await sb.from('products').update({active:false,sku:null}).eq('id',id);
 if(error)return alert(error.message);closeEdit();await load();render()}

S.invites=[];
function staffView(){if(S.role!='owner')return'';
 return`<h3>Staff</h3><input id="se" type="email" placeholder="Staff email"><button class="p" onclick="invite()">Add staff</button>
 ${S.invites.map(i=>`<div class="row"><div>${esc(i.email)}<small>${i.user_id?'Active':'Waiting for them to sign up'} · ${permSummary(i.perms)}</small></div><div><button class="s" onclick="permForm('${i.id}')">Permissions</button> <button class="s" onclick="rmStaff('${i.id}')">Remove</button></div></div>`).join('')}
 <p class="lb">Staff create their own account with this email, then log in. They never see profit, stock value or change products. Choose what else each person may do with Permissions.</p>`}
async function invite(){const e=$('#se').value.trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(e))return alert('Enter a valid email');
 const {error}=await sb.from('staff_invites').insert({shop_id:S.shop.id,email:e});if(error)return alert(error.message);await load();render()}
async function rmStaff(id){if(!confirm('Remove this staff member?'))return;
 const {error}=await sb.rpc('remove_staff',{p_invite:id});if(error)return alert(error.message);await load();render()}
async function voidSale(id){if(!confirm('Void this sale? Stock is put back and any debt from it is cancelled.'))return;
 const {error}=await sb.rpc('void_sale',{p_sale:id});if(error)return alert(error.message);await load();render()}
async function forgot(){const e=$('#em').value.trim();if(!e)return alert('Type your email first, then tap Forgot password');
 const {error}=await sb.auth.resetPasswordForEmail(e,{redirectTo:location.origin+location.pathname});
 alert(error?error.message:'If that email has an account, a reset link is on its way. Check your inbox and spam.')}
function recoverView(){app.innerHTML=`<main class="c"><h1>New password</h1><input id="np" type="password" placeholder="New password (8+ characters)"><button class="p" onclick="setPw()">Save password</button></main>`}
async function setPw(){const v=$('#np').value;if(v.length<8)return alert('Use 8 or more characters');
 const {error}=await sb.auth.updateUser({password:v});if(error)return alert(error.message);
 S.rec=false;alert('Password updated');history.replaceState(null,'',location.pathname);boot()}
sb.auth.onAuthStateChange((ev,session)=>{if(ev=='PASSWORD_RECOVERY'){S.rec=true;recoverView();return}
 // Signed out, or a different account signed in from another tab: reload so this tab never shows one account's shop with another's login.
 if(S.uid&&(ev=='SIGNED_OUT'||(session&&session.user&&session.user.id!==S.uid)))location.reload()});

function chart7(){const days=[];for(let i=6;i>=0;i--)days.push(soon(-i));
 const m0={};S.days.forEach(d=>m0[d.day]=d);
 const v=days.map(d=>+(m0[d]&&m0[d].sales_total)||0),mx=Math.max(1,...v);
 const wd=d=>new Date(d+'T12:00:00').toLocaleDateString('en-KE',{weekday:'short'});
 const lab=n=>n?(n>=1000?(n/1000).toFixed(1)+'k':Math.round(n)):'';
 return`<h3>Last 7 days</h3><div class="bars">${days.map((d,i)=>`<div class="bar"><small>${lab(v[i])}</small><i style="height:${Math.max(3,Math.round(v[i]/mx*56))}px;${d==today()?'':'opacity:.6'}"></i><small>${wd(d)}</small></div>`).join('')}</div><p class="lb">Week: sales ${kes(v.reduce((a,b)=>a+b,0))} · profit ${kes(S.days.reduce((a,x)=>a+ +x.profit_estimate,0))}</p>`}
function summaryText(){const R=S.rep||{},[f,t]=periodRange(),P=S.repPrev,[, ,lbl]=prevRange();
 const when=f==t?dLabel(f):dLabel(f)+' – '+dLabel(t),p=pct(+R.sales_total,P&&+P.sales_total);
 const L=[`*${S.shop.name} · ${when}*`,`Sales: ${kes(R.sales_total)} (${R.sales_count||0} sales)${p!==null?` ${p>=0?'↑':'↓'}${Math.abs(p)}% vs ${lbl}`:''}`,
  `Cash ${kes(R.cash_sales)} | M-Pesa ${kes(R.mpesa_sales)} | Debt ${kes(R.new_debt)}`];
 if(+R.debt_cash+ +R.debt_mpesa)L.push(`Debt collected: ${kes(r2(+R.debt_cash+ +R.debt_mpesa))}`);
 if(+R.expenses)L.push(`Expenses: ${kes(R.expenses)}`);
 if(reports()){L.push(`Gross profit: ${kes(r2(R.gross_profit))}`);L.push(`Net profit: ${kes(r2(+R.gross_profit- +R.expenses))}`)}
 const top=(R.top_items||[]).slice(0,3).map(x=>`${x.name} x${fq(x.qty)}`).join(', ');if(top)L.push('Top: '+top);
 const last=f==t&&t==today()&&(S.counts||[]).find(c=>c.day==t);if(last)L.push(`Cash count: ${+last.difference==0?'exact':(+last.difference<0?'short '+kes(-last.difference):'over '+kes(last.difference))}`);
 L.push(`Owed to you: ${kes(owed())} (${debtors()} customers)`);
 const low=S.products.filter(p=>p.stock_qty<=p.low_stock_at).map(p=>p.name+' ('+fq(p.stock_qty)+')');if(low.length)L.push('Running low: '+low.slice(0,8).join(', '));
 return L.join('\n')}
function shareSummary(){window.open('https://wa.me/?text='+encodeURIComponent(summaryText()),'_blank')}

