// Duka · Tab screens, selling and checkout, receipts, stock list, deliveries.
// Plain browser script: loaded in order by index.html and shares the page's global scope.
const VIEWS={
 sell:()=>`<div class="ib"><input placeholder="Search product" value="${esc(S.q)}" oninput="S.q=this.value;$('#pl').innerHTML=plist()" onkeydown="if(event.key=='Enter')scanAdd(this)"><button class="s" onclick="scanInto(null,sellScanned)">📷</button></div><div id="pl">${plist()}</div><div id="cart">${cartView()}</div>`,
 stock:()=>`<div class="tools"><button class="p" onclick="quickAdd()">⚡ Quick add</button><button class="s" onclick="scanInto(null,stockScanned)">📷 Scan to add</button><button class="s" onclick="stocktake()">📋 Stock-take</button><button class="s" onclick="showImport()">📥 Excel</button>${S.products.length?`<button class="s" onclick="exportData('stock',this)">📤 Download</button>`:''}</div>
  <h3>Add product</h3><input id="pn" placeholder="Name">${cfg().sku?`<div class="ib"><input id="sk" placeholder="SKU / barcode (optional)"><button class="s" onclick="scanInto('sk')">📷</button></div>`:''}${cfg().cat||cfg().var?`<div class="g">${cfg().cat?'<input id="pc" placeholder="Category (optional)">':''}${cfg().var?`<input id="pv" placeholder="${cfg().varph}">`:''}</div>`:''}<div class="g"><input id="pb" type="number" placeholder="Buy price"><input id="ps" type="number" placeholder="Sell price"></div>
  <div class="g"><input id="pq" type="number" step="any" placeholder="Quantity in stock"><select id="pu">${unitsFor().map(u=>`<option>${u}</option>`).join('')}</select></div><label class="lb">Warn me when stock reaches</label><input id="pr" type="number" step="any" value="5">${cfg().exp?'<label class="lb">Expiry date (earliest on the shelf)</label><input id="px" type="date">':''}<button class="p" onclick="addProduct()">Save product</button>
  <h3>Stock (${S.products.length})</h3>${S.products.length?`<div class="ib"><input placeholder="Search stock" value="${esc(S.sq||'')}" oninput="S.sq=this.value;$('#stl').innerHTML=stockList()"><button class="s" onclick="scanInto(null,stockScanned)">📷</button></div>
  <div class="g"><select onchange="S.ss=this.value;$('#stl').innerHTML=stockList()">${[['name','A to Z'],['low','Running low first'],['qty','Least stock first'],['value','Highest stock value'],...(cfg().exp?[['exp','Expiring soonest']]:[])].map(([v,l])=>`<option value="${v}" ${(S.ss||'name')==v?'selected':''}>${l}</option>`).join('')}</select>
  ${cats().length?`<select onchange="S.sc=this.value;$('#stl').innerHTML=stockList()"><option value="">All categories</option>${cats().map(c=>`<option ${S.sc==c?'selected':''}>${esc(c)}</option>`).join('')}</select>`:''}</div>`:''}
  <div id="stl">${stockList()}</div>`,
 debts:()=>{if(S.role=='owner'&&S.dmode=='sup')return debtSwitch()+supplierView();const d=S.customers.filter(c=>+c.balance>0),tot=d.reduce((a,c)=>a+ +c.balance,0),od=d.filter(c=>ageDays(c)>30),odv=od.reduce((a,c)=>a+ +c.balance,0),all=S.df=='all';
  return`${debtSwitch()}<div class="tools"><button class="p" onclick="customerForm()">+ Add customer</button></div>
  <div class="g"><div class="card">Total owed<b>${kes(r2(tot))}</b><small>${d.length} customer(s)</small></div><div class="card">Over 30 days<b class="${odv?'low':''}">${kes(r2(odv))}</b><small>${od.length} customer(s)</small></div></div>
  <div class="m"><button class="${all?'':'on'}" onclick="S.df='owe';render()">Who owes you</button><button class="${all?'on':''}" onclick="S.df='all';render()">All customers</button></div>
  ${S.customers.length?`<input placeholder="Search customers" value="${esc(S.dq||'')}" oninput="S.dq=this.value;$('#dl').innerHTML=debtList()">`:''}<div id="dl">${debtList()}</div>`},
 today:()=>{const R=S.rep,low=S.products.filter(p=>p.stock_qty<=p.low_stock_at),own=S.role=='owner';
  return`${S.members&&S.members.length>1?shopSwitcher():''}<div class="hero"><small>${new Date().toLocaleDateString('en-KE',{weekday:'long',day:'numeric',month:'long',timeZone:'Africa/Nairobi'})}</small><h2>Habari, ${esc(S.shop.name)} 👋</h2></div>
  ${onboardingCard()}${periodPicker()}${R?reportCards(R,S.repPrev):'<p class="lb">Loading…</p>'}
  ${R&&isTodayRange()?cashCheckCard(R):''}
  <div class="tools">${can('expenses')?'<button class="p" onclick="expenseForm()">+ Expense</button>':''}<button class="s" onclick="shareSummary()">📤 Send summary on WhatsApp</button></div>
  ${R?payMixR(R):''}
  ${reports()?(R?trendChart(R)+topItems(R)+staffSales(R):''):(own?`<div class="card" style="margin-top:12px"><span class="pn">See your profit, stock value and best sellers</span><small>Included in Standard and Premium.</small><p><button class="s" onclick="showPlans()">Upgrade</button></p></div>`:'')}
  ${expenseList()}${isTodayRange()?recent():''}
  <h3 style="display:flex;justify-content:space-between;align-items:center">Running low ${low.length&&own?'<button class="s" onclick="orderList()">📦 Order list</button>':''}</h3>${low.map(p=>`<div class="row">${pn(p)}<span class="low">${fq(p.stock_qty)} ${esc(p.unit)} left</span></div>`).join('')||'<p>Nothing low.</p>'}
  ${cfg().exp&&S.products.some(p=>p.expiry)?`<h3>Expiry watch (30 days)</h3>${S.products.filter(p=>p.expiry&&p.expiry<=soon(30)).sort((a,b)=>a.expiry<b.expiry?-1:1).map(p=>`<div class="row">${pn(p)}<span class="ex">${p.expiry<=today()?'EXPIRED ':''}${p.expiry}</span></div>`).join('')||'<p>Nothing expiring soon.</p>'}`:''}`},
 more:()=>{const own=S.role=='owner';return`<h2 style="margin:4px 0 12px">${esc(S.shop.name)}</h2>
  ${S.members&&S.members.length>1?shopSwitcher():''}
  ${own?`<h3>Plan</h3><div class="row"><div>${esc(planName(S.shop.plan))}${S.shop.is_branch?' (from main shop)':''}<small class="${S.shop.paid_until&&S.shop.paid_until<=soon(5)?'low':''}">Paid until ${esc(S.shop.paid_until||'-')}</small></div>${S.shop.is_branch?'':'<button class="s" onclick="showPlans()">Renew / upgrade</button>'}</div>`:`<p><small>Paid until ${esc(S.shop.paid_until||'-')}</small></p>`}
  ${staffView()}${cashCountHistory()}${referralCard()}${own?'<h3>Download your data</h3>'+exportButtons():''}
  ${own?`<h3>Shop details</h3>
  <div class="row"><div>${esc(S.shop.name)}<small>${esc(S.shop.phone||'No phone')} · KRA PIN ${esc(S.shop.kra_pin||'not set')}</small></div><button class="s" onclick="shopForm()">Edit</button></div>
  <div class="row"><div>How customers pay you<small>${payLine()?esc(payLine()):'Not set. Shown on receipts and debt reminders.'}</small></div><button class="s" onclick="shopForm()">Edit</button></div>
  <div class="row"><div>Receipt message<small>${esc(footer())}</small></div><button class="s" onclick="shopForm()">Edit</button></div>
  <p><button class="s" onclick="testPrint()">🖨 Print a test receipt</button></p>
  ${S.shop.plan=='premium'&&!S.shop.is_branch?`<div class="row"><div>Branches<small>${S.shop.branches||0} of 2 extra shops used</small></div>${(S.shop.branches||0)<2?'<button class="s" onclick="addBranch()">Add branch</button>':''}</div>`:''}`:''}
  ${own&&!S.shop.is_branch?`<div class="row"><div>Subscription payments<small>What you have paid for Duka</small></div><button class="s" onclick="payHistory()">View</button></div>`:''}
  <h3>Account</h3><div class="row"><div>${esc(S.email||'')}<small>${own?'Owner':'Staff'}</small></div><button class="s" onclick="pwForm()">Change password</button></div>
  <p><small>Shop type: ${esc((TYPES.find(t=>t[0]==S.shop.type)||[0,S.shop.type])[1])}</small></p>
  <h3>Settings</h3><div class="tools"><button class="s" onclick="toggleTheme()">🌗 Switch light / dark</button><button class="s" onclick="setLang(LANG=='sw'?'en':'sw')">🌐 ${LANG=='sw'?'English':'Kiswahili'}</button><a href="https://wa.me/${SUPPORT_PHONE}" target="_blank" rel="noopener"><button class="s">💬 Help</button></a></div>
  <button onclick="logout()">Log out</button>${own&&!S.shop.is_branch?deleteZone():''}`}};

// Tap anywhere on a product to add it.
function plist(){const q=S.q.toLowerCase();return S.products.filter(p=>(p.name+' '+(p.variant||'')+' '+(p.category||'')+' '+(p.sku||'')).toLowerCase().includes(q)).map(p=>
 `<div class="row tap" onclick="add('${p.id}')"><div>${pn(p)}<small>${kes(p.sell_price)}/${esc(p.unit)} · ${fq(p.stock_qty)} ${esc(p.unit)} left</small></div><button class="s">+ Add</button></div>`).join('')||'<p>No products. Add some in Stock.</p>'}
// Loose goods sold by weight, volume or length get quick amounts and "sell by money".
const LOOSE={kg:[.25,.5,1,2],L:[.25,.5,1,2],m:[.5,1,2,5],g:[100,250,500,1000],ml:[100,250,500,1000]};
const rq=n=>Math.round(n*1e4)/1e4, r2=n=>Math.round(n*100)/100;
const fq=n=>{n=+n;return{0.25:'¼',0.5:'½',0.75:'¾'}[n]||String(rq(n))};
const total=()=>r2(Object.entries(S.cart).reduce((a,[id,q])=>a+q*price(S.products.find(p=>p.id==id)),0));
function cartView(){const e=Object.entries(S.cart);if(!e.length)return'';const t=total();
 return`<h3 style="display:flex;justify-content:space-between;align-items:center">Cart <button class="s" onclick="clearCart()">Clear cart</button></h3>${e.map(([id,q])=>{const p=S.products.find(x=>x.id==id),qs=LOOSE[p.unit];return`<div class="row"><div>${pn(p)} × ${fq(q)} ${esc(p.unit)}<small>${kes(r2(q*price(p)))}${q>p.stock_qty?` · <span class="low">only ${fq(p.stock_qty)} in stock</span>`:''}</small>
  ${qs?`<div class="chips">${qs.map(v=>`<button class="s${+q==v?' on':''}" onclick="setQ('${id}',${v})">${fq(v)}</button>`).join('')}<button class="s" onclick="byMoney('${id}')">By KES</button></div>`:''}</div>
  <div class="qb"><button class="s" onclick="dec('${id}')">−</button><button class="s" onclick="add('${id}',true)">+</button><button class="s" onclick="setQty('${id}')">Qty</button>${can('discount')?`<button class="s" onclick="setPrice('${id}')">Price</button>`:''}</div></div>`}).join('')}
 <div class="m">${['cash','mpesa',...(can('credit')?['debt']:[])].map(m=>`<button class="${S.method==m?'on':''}" onclick="S.method='${m}';$('#cart').innerHTML=cartView()">${m=='mpesa'?'M-Pesa':m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div>
 ${S.method=='debt'?`<select onchange="if(this.value=='__new'){this.value='';customerForm(null,id=>{S.cust=id;render()})}else{S.cust=this.value;$('#cart').innerHTML=cartView()}"><option value="">Choose customer</option><option value="__new">+ New customer</option>${activeCustomers().map(c=>`<option value="${c.customer_id}" ${S.cust==c.customer_id?'selected':''}>${esc(c.name)}${+c.balance>0?' · owes '+kes(c.balance):''}</option>`).join('')}</select>${custLine()}`:''}
 ${S.method=='cash'?`<div class="g"><input id="given" type="number" inputmode="numeric" placeholder="Customer gave (optional)" value="${S.given||''}" oninput="S.given=this.value;$('#chg').innerHTML=changeText()"><div class="card" id="chg" style="padding:10px 12px">${changeText()}</div></div>`:''}
 <button class="p" style="width:100%" onclick="checkout()">Sell · ${kes(t)}</button>`}
function changeText(){const g=+S.given,t=total();if(!g)return'<small>Change</small>';
 return g<t?`<small class="low">Short by ${kes(r2(t-g))}</small>`:`<small>Change</small><b style="font-size:18px">${kes(r2(g-t))}</b>`}
function toast(m){const d=document.createElement('div');d.className='toast';d.textContent=m;d.setAttribute('data-nt','');document.body.appendChild(d);setTimeout(()=>d.remove(),1100)}
function add(id,inCart){const p=S.products.find(x=>x.id==id),step=p.unit=='g'||p.unit=='ml'?100:1;
 S.cart[id]=rq((S.cart[id]||0)+step);$('#cart').innerHTML=cartView();
 if(!inCart){toast('✓ '+p.name+' · '+fq(S.cart[id])+' '+p.unit);try{navigator.vibrate&&navigator.vibrate(15)}catch(e){}}}
function dec(id){const p=S.products.find(x=>x.id==id),step=p.unit=='g'||p.unit=='ml'?100:1;
 S.cart[id]=rq(S.cart[id]-Math.min(step,S.cart[id]>=step?step:S.cart[id]));if(S.cart[id]<=0)delete S.cart[id];$('#cart').innerHTML=cartView()}
function setQ(id,v){S.cart[id]=v;$('#cart').innerHTML=cartView()}
// "Nipe sugar ya 50": work out the weight from the money.
function byMoney(id){const p=S.products.find(x=>x.id==id),pr=price(p);if(!(pr>0))return alert('Set a selling price for this product first');
 const a=parseFloat(prompt(`How much money? (KES)\n${p.name}: ${kes(pr)} per ${p.unit}`,''));if(!(a>0))return;
 S.cart[id]=rq(a/pr);$('#cart').innerHTML=cartView()}
function clearCart(){if(Object.keys(S.cart).length>1&&!confirm('Clear the cart?'))return;S.cart={};S.pr={};S.given='';$('#cart').innerHTML=''}
async function checkout(){
 const items=Object.entries(S.cart).map(([id,q])=>({p:S.products.find(x=>x.id==id),q}));
 const over=items.filter(({p,q})=>q>p.stock_qty);if(over.length&&!confirm('Not enough stock: '+over.map(({p})=>p.name+' ('+p.stock_qty+' left)').join(', ')+'. Sell anyway?'))return;
 if(S.method=='debt'&&!can('credit'))S.method='cash';
 const t=total();let paid=t,code=null;
 if(S.method=='debt'){if(!S.cust)return alert('Choose a customer');
  const a=prompt('Amount paid now (0 if none)','0');if(a===null)return;paid=Math.min(t,Math.max(0,+a||0));
  const c=S.customers.find(x=>x.customer_id==S.cust),nb=r2(+(c&&c.balance||0)+t-paid);
  if(c&&c.credit_limit!=null&&nb>+c.credit_limit){const msg=`This sale takes ${c.name} to ${kes(nb)}, over the credit limit of ${kes(c.credit_limit)}.`;
   if(S.role!='owner')return alert(msg+' Ask the owner.');if(!confirm(msg+' Sell anyway?'))return}}
 if(S.method=='mpesa')code=(prompt('M-Pesa code (optional)')||'').toUpperCase()||null;
 const sid=crypto.randomUUID();
 const sale={id:sid,shop_id:S.shop.id,customer_id:S.method=='debt'?S.cust:null,total:t,paid,method:S.method,mpesa_code:code,created_by:S.uid,created_at:new Date().toISOString()};
 const rows=items.map(({p,q})=>({id:crypto.randomUUID(),sale_id:sid,shop_id:S.shop.id,product_id:p.id,name:p.name+(p.variant?' · '+p.variant:''),qty:q,unit_price:price(p),unit_cost:p.buy_price}));
 const x={sale,items:rows};let queued=false;
 try{if(!navigator.onLine)throw new Error('offline');await pushSale(x)}
 catch(e){if(!isNet(e))return alert(e.message||e);setQueue([...queue(),x]);queued=true;S.offline=!navigator.onLine}
 S.cart={};S.pr={};S.cust='';S.q='';S.given='';
 if(queued){items.forEach(({p,q})=>p.stock_qty=+p.stock_qty-q);S.sales.unshift({...sale,voided:false,sale_items:rows,pending:true});saveCache()}
 else{try{await load();saveCache()}catch(e){}}
 render();showReceipt({...sale,voided:false,sale_items:rows,pending:queued})}

// ---------- Receipts ----------
function receiptLines(s){const c=s.customer_id&&S.customers.find(x=>x.customer_id==s.customer_id),d=new Date(s.created_at);
 return{c,no:String(s.id).slice(0,8).toUpperCase(),when:d.toLocaleString('en-KE',{timeZone:'Africa/Nairobi',dateStyle:'medium',timeStyle:'short'}),items:s.sale_items||[]}}
function receiptText(s){const r=receiptLines(s),L=[S.shop.name,S.shop.kra_pin?'KRA PIN: '+S.shop.kra_pin:'',r.when+' · Receipt '+r.no,'----'];
 r.items.forEach(i=>L.push(`${i.name} x${+i.qty} @ ${kes(i.unit_price)} = ${kes(i.qty*i.unit_price)}`));
 L.push('----','TOTAL: '+kes(s.total),'Paid: '+kes(s.paid)+' ('+(s.method=='mpesa'?'M-Pesa':s.method)+')');
 if(+s.total>+s.paid)L.push('Balance: '+kes(s.total-s.paid));if(s.mpesa_code)L.push('M-Pesa: '+s.mpesa_code);if(s.voided)L.push('*** VOIDED ***');
 if(payLine())L.push('',payLine());L.push('',footer());return L.filter((x,i)=>x!==''||i>3).join('\n')}
function showReceipt(s){const r=receiptLines(s),ph=r.c&&r.c.phone?(r.c.phone.replace(/\D/g,'').replace(/^0/,'254')):'';
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet">
 <h3>${s.test?'Test receipt':s.pending?'Sale saved on this phone ✔':'Sale saved ✔'}</h3>${s.pending?'<p class="lb">You are offline. It will sync automatically when you are back online.</p>':''}
 <div class="rc" id="rcpt" data-nt><h4>${esc(S.shop.name)}</h4>${S.shop.phone?`<div class="c">${esc(S.shop.phone)}</div>`:''}${S.shop.kra_pin?`<div class="c">KRA PIN: ${esc(S.shop.kra_pin)}</div>`:''}
 <div class="c">${esc(r.when)} · No. ${esc(r.no)}</div><hr>
 ${r.items.map(i=>`<div>${esc(i.name)}</div><div class="l"><span>${+i.qty} × ${kes(i.unit_price)}</span><span>${kes(i.qty*i.unit_price)}</span></div>`).join('')}<hr>
 <div class="l t"><span>TOTAL</span><span>${kes(s.total)}</span></div><div class="l"><span>Paid (${s.method=='mpesa'?'M-Pesa':esc(s.method)})</span><span>${kes(s.paid)}</span></div>
 ${+s.total>+s.paid?`<div class="l"><span>Balance</span><span>${kes(s.total-s.paid)}</span></div>`:''}${s.mpesa_code?`<div class="l"><span>M-Pesa code</span><span>${esc(s.mpesa_code)}</span></div>`:''}
 ${r.c?`<div class="l"><span>Customer</span><span>${esc(r.c.name)}</span></div>`:''}${s.voided?'<div class="c t">*** VOIDED ***</div>':''}<hr>${payLine()?`<div class="c">${esc(payLine())}</div>`:''}<div class="c">${esc(footer())}</div></div>
 <div class="m"><button onclick="window.print()">🖨 Print</button><a style="flex:1" href="https://wa.me/${ph}?text=${encodeURIComponent(receiptText(s))}" target="_blank" rel="noopener"><button style="width:100%">WhatsApp</button></a><button class="p" onclick="closeEdit()">Close</button></div></div></div>`)}
async function sendSms(id,btn){if(S.shop.plan!='premium'){alert('SMS reminders are part of the Premium plan.');return showPlans()}
 if(!confirm('Send an SMS reminder to this customer?'))return;btn.disabled=true;
 const {error}=await sb.functions.invoke('send-sms',{body:{shop_id:S.shop.id,customer_id:id}});btn.disabled=false;
 if(error){let m=error.message;try{m=(await error.context.json()).error||m}catch(e){}return alert(m)}alert('SMS sent ✔')}

async function addProduct(){const v=i=>{const e=$('#'+i);return e?e.value.trim():''};if(!v('pn'))return alert('Enter a name');
 const {error}=await sb.from('products').insert({shop_id:S.shop.id,name:v('pn'),buy_price:+v('pb')||0,sell_price:+v('ps')||0,stock_qty:+v('pq')||0,unit:v('pu'),category:v('pc')||null,variant:v('pv')||null,sku:v('sk')||null,expiry:v('px')||null,low_stock_at:v('pr')===''?5:(+v('pr')||0)});
 if(error)return alert(/products_shop_sku/.test(error.message)?'That barcode is already used by another product':error.message);await load();render()}

// ---------- Stock list: search, sort, category ----------
const cats=()=>[...new Set(S.products.map(p=>p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
function stockList(){const q=(S.sq||'').toLowerCase().trim(),c=S.sc||'',srt=S.ss||'name';
 let L=S.products.filter(p=>(!c||p.category==c)&&(!q||[p.name,p.variant,p.category,p.sku].join(' ').toLowerCase().includes(q)));
 const by={name:(a,b)=>a.name.localeCompare(b.name),
  low:(a,b)=>((b.stock_qty<=b.low_stock_at)-(a.stock_qty<=a.low_stock_at))||(a.stock_qty/(a.low_stock_at||1))-(b.stock_qty/(b.low_stock_at||1)),
  qty:(a,b)=>a.stock_qty-b.stock_qty, value:(a,b)=>b.stock_qty*b.buy_price-a.stock_qty*a.buy_price,
  exp:(a,b)=>(a.expiry||'9999')<(b.expiry||'9999')?-1:1};
 L=L.sort(by[srt]||by.name);
 if(!L.length)return S.products.length?'<p>No products match.</p>':`<div class="card"><span class="pn">Add your stock the quick way</span><small>Pick from common items, type a list like an SMS, or scan barcodes.</small><p><button class="p" onclick="quickAdd()">⚡ Quick add</button></p></div>`;
 return L.map(p=>`<div class="row"><div>${pn(p)}<small>${kes(p.sell_price)}/${esc(p.unit)} · <span class="${p.stock_qty<=p.low_stock_at?'low':''}">${fq(p.stock_qty)} ${esc(p.unit)} left</span> · reorder at ${p.low_stock_at}${meta(p)}${srt=='value'?' · value '+kes(r2(p.stock_qty*p.buy_price)):''}</small></div><div><button class="s" onclick="restock('${p.id}')">+ Stock</button> <button class="s" onclick="editProduct('${p.id}')">Edit</button></div></div>`).join('')}

// ---------- Delivery (restock) with current buying price ----------
function debtSwitch(){if(S.role!='owner')return'';const sup=S.dmode=='sup';
 return`<div class="m" style="margin-top:0"><button class="${sup?'':'on'}" onclick="S.dmode='cust';render()">Customers owe you</button><button class="${sup?'on':''}" onclick="S.dmode='sup';render()">You owe suppliers${supplierOwed()?' · '+kes(supplierOwed()):''}</button></div>`}
function restock(id){const p=S.products.find(x=>x.id==id),c=cfg();
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet">
 <h3>Delivery · ${pn(p)}</h3><p class="lb">Now ${fq(p.stock_qty)} ${esc(p.unit)} in stock.</p>
 <label class="lb">Quantity received (${esc(p.unit)})</label><input id="rq" type="number" step="any" inputmode="decimal" oninput="rsCalc()">
 <div class="g"><div><label class="lb">Buying price per ${esc(p.unit)}</label><input id="rb" type="number" step="any" value="${p.buy_price}" oninput="rsCalc()"></div>
 <div><label class="lb">Selling price per ${esc(p.unit)}</label><input id="rs" type="number" step="any" value="${p.sell_price}" oninput="rsCalc()"></div></div>
 ${c.exp?`<label class="lb">Earliest expiry on the shelf now</label><input id="rx" type="date" value="${p.expiry||''}">`:''}
 ${deliverySupplierFields()}<p class="lb" id="rm"></p>
 <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="saveRestock('${p.id}',this)">Save delivery</button></div></div></div>`);
 S.rsp=p;rsCalc();setTimeout(()=>$('#rq')&&$('#rq').focus(),50)}
function rsCalc(){const p=S.rsp,b=+$('#rb').value,s=+$('#rs').value,q=+$('#rq').value,m=$('#rm');if(!m)return;
 const L=[];if(q>0)L.push(`New stock: ${fq(rq(+p.stock_qty+q))} ${p.unit}. Cost of this delivery: ${kes(r2(q*b))}.`);
 if(b>0&&s>0)L.push(s<b?`<span class="low">Selling price is below buying price.</span>`:`Profit ${kes(r2(s-b))} per ${p.unit} (${Math.round((s-b)/s*100)}% margin).`);
 if(b!=+p.buy_price)L.push(`Buying price changes from ${kes(p.buy_price)} to ${kes(b)}.`);
 m.innerHTML=L.join('<br>')}
async function saveRestock(id,btn){const q=+$('#rq').value,b=$('#rb').value,s=$('#rs').value,x=$('#rx');
 if(!(q>0))return alert('Enter the quantity received');if(+s<+b&&!confirm('The selling price is below the buying price. Save anyway?'))return;
 btn.disabled=true;
 const su=$('#rsu')&&$('#rsu').value||null,pa=$('#rpa')?$('#rpa').value:'';
 const {error}=await sb.rpc('restock_product',{p_product:id,p_qty:q,p_buy:b===''?null:+b,p_sell:s===''?null:+s,p_expiry:x&&x.value||null,p_supplier:su,p_paid:su&&pa!==''?Math.max(0,+pa):null,p_paid_from:su?$('#rpf').value:'cash'});
 if(error){btn.disabled=false;return alert(error.message)}closeEdit();await load();saveCache();render();toast('✓ Delivery saved')}
