// Duka · Today: reports for any period, expenses, cash check, order list.
// Plain browser script: loaded in order by index.html and shares the page's global scope.
// ---------- Today: reports for any period ----------
const dAdd=(d,n)=>{const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
const dSpan=(a,b)=>Math.round((new Date(b+'T00:00:00Z')-new Date(a+'T00:00:00Z'))/864e5)+1;
const dLabel=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-KE',{day:'numeric',month:'short'});
const wkday=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-KE',{weekday:'short'});
function periodRange(){const t=today(),k=S.per||'today';
 if(k=='yesterday')return[dAdd(t,-1),dAdd(t,-1)];
 if(k=='week'){const dow=(new Date(t+'T12:00:00Z').getUTCDay()+6)%7;return[dAdd(t,-dow),t]}
 if(k=='month')return[t.slice(0,8)+'01',t];
 if(k=='lastmonth'){const f=dAdd(t.slice(0,8)+'01',-1).slice(0,8)+'01';return[f,dAdd(t.slice(0,8)+'01',-1)]}
 if(k=='custom'&&S.pf&&S.pt)return S.pf<=S.pt?[S.pf,S.pt]:[S.pt,S.pf];
 return[t,t]}
// The period we compare with: same weekday last week for one day; the previous week/month otherwise.
function prevRange(){const[f,t]=periodRange(),k=S.per||'today',n=dSpan(f,t);
 if(n==1)return[dAdd(f,-7),dAdd(t,-7),'last '+wkday(f)];
 if(k=='month'||k=='lastmonth'){const pf=dAdd(f,-1).slice(0,8)+'01';const pt=k=='month'?dAdd(pf,n-1):dAdd(f,-1);return[pf,pt,k=='month'?'same days last month':'the month before']}
 if(k=='week')return[dAdd(f,-7),dAdd(t,-7),'last week'];
 return[dAdd(f,-n),dAdd(f,-1),'the previous '+n+' days']}
const isTodayRange=()=>{const[f,t]=periodRange();return f==t&&t==today()};
function periodPicker(){const k=S.per||'today',[f,t]=periodRange();
 const opts=[['today','Today'],['yesterday','Yesterday'],['week','This week'],['month','This month'],['lastmonth','Last month'],['custom','Pick dates']];
 return`<div class="chips per">${opts.map(([v,l])=>`<button class="s${k==v?' on':''}" onclick="setPeriod('${v}')">${l}</button>`).join('')}</div>
 ${k=='custom'?`<div class="g"><input type="date" value="${S.pf||f}" max="${today()}" onchange="S.pf=this.value;refreshReport()"><input type="date" value="${S.pt||t}" max="${today()}" onchange="S.pt=this.value;refreshReport()"></div>`:''}
 ${f!=t?`<p class="lb">${dLabel(f)} – ${dLabel(t)}</p>`:(k!='today'?`<p class="lb">${dLabel(f)}</p>`:'')}`}
function setPeriod(k){S.per=k;if(k=='custom'&&!S.pf){S.pf=dAdd(today(),-6);S.pt=today()}refreshReport()}
async function refreshReport(){S.rep=null;render();try{await loadReport()}catch(e){if(!isNet(e))alert(e.message||e)}render()}
async function loadReport(){if(!S.shop)return;const sid=S.shop.id,[f,t]=periodRange(),[pf,pt]=prevRange(),own=S.role=='owner';
 const [a,b,e,c,tm]=await Promise.all([sb.rpc('shop_report',{p_shop:sid,p_from:f,p_to:t}),sb.rpc('shop_report',{p_shop:sid,p_from:pf,p_to:pt}),
  sb.from('expenses').select('id,label,category,amount,paid_from,spent_on,created_at').eq('shop_id',sid).gte('spent_on',f).lte('spent_on',t).order('spent_on',{ascending:false}).limit(200),
  sb.from('cash_counts').select('*').eq('shop_id',sid).order('created_at',{ascending:false}).limit(20),
  own&&!S.team?sb.rpc('shop_team',{p_shop:sid}):Promise.resolve({data:S.team||null})]);
 const err=[a,b,e,c].find(r=>r.error);if(err)throw err.error;
 S.rep=a.data;S.repPrev=b.data;S.exps=e.data||[];S.counts=c.data||[];if(tm&&tm.data)S.team=tm.data}
const pct=(a,b)=>!(+b)?null:Math.round((a-b)/b*100);
function delta(a,b,label){const p=pct(+a,+b);if(p===null)return'';return`<small class="${p<0?'low':''}">${p>0?'↑':p<0?'↓':'='} ${Math.abs(p)}% vs ${label}</small>`}
function reportCards(R,P){const[, ,lbl]=prevRange(),own=S.role=='owner',rp=reports()&&own;
 const moneyIn=r2(+R.cash_sales+ +R.mpesa_sales+ +R.debt_cash+ +R.debt_mpesa),coll=r2(+R.debt_cash+ +R.debt_mpesa),net=r2(+R.gross_profit- +R.expenses);
 return`<div class="g">
 <div class="card">Sales<b>${kes(R.sales_total)}</b><small>${R.sales_count} sale(s)</small>${P?delta(R.sales_total,P.sales_total,lbl):''}</div>
 <div class="card">Money in<b>${kes(moneyIn)}</b><small>Cash ${kes(r2(+R.cash_sales+ +R.debt_cash))} · M-Pesa ${kes(r2(+R.mpesa_sales+ +R.debt_mpesa))}</small></div>
 <div class="card">New debt<b>${kes(R.new_debt)}</b><small>given on credit</small></div>
 <div class="card">Debt collected<b>${kes(coll)}</b><small>paid back by customers</small></div>
 <div class="card">Expenses<b>${kes(R.expenses)}</b><small>${S.exps&&S.exps.length?S.exps.length+' item(s)':'none recorded'}</small></div>
 ${rp?`<div class="card">Gross profit<b>${kes(r2(R.gross_profit))}</b><small>sales minus buying price</small>${P?delta(R.gross_profit,P.gross_profit,lbl):''}</div>
 <div class="card">Net profit<b class="${net<0?'low':''}">${kes(net)}</b><small>after expenses</small></div>`:''}
 <div class="card">Total owed<b>${kes(owed())}</b><small>${debtors()} customer(s)</small></div>
 ${rp?`<div class="card">Stock value<b>${kes(r2(stockVal()))}</b><small>at cost price</small></div>`:''}</div>
 ${+R.voided_count?`<p class="lb">${R.voided_count} voided sale(s) worth ${kes(R.voided_total)} are not counted.</p>`:''}`}
function payMixR(R){const x={cash:+R.cash_sales,mpesa:+R.mpesa_sales,debt:+R.new_debt},T=x.cash+x.mpesa+x.debt;if(!T)return'';const pc=k=>Math.round(x[k]/T*100);
 return`<h3>Sales by payment</h3><div class="mix"><i style="width:${pc('cash')}%;background:var(--accent)"></i><i style="width:${pc('mpesa')}%;background:#8fb996"></i><i style="width:${pc('debt')}%;background:var(--rose)"></i></div><p class="lb">Cash ${kes(x.cash)} · M-Pesa ${kes(x.mpesa)} · Debt ${kes(x.debt)}</p>`}
function trendChart(R){const[f,t]=periodRange(),n=dSpan(f,t);if(n==1)return chart7();if(n>62)return'';
 const m={};(R.by_day||[]).forEach(d=>m[d.day]=+d.sales);const days=[];for(let i=0;i<n;i++)days.push(dAdd(f,i));
 const v=days.map(d=>m[d]||0),mx=Math.max(1,...v),lab=x=>x?(x>=1000?(x/1000).toFixed(1)+'k':Math.round(x)):'';
 return`<h3>Sales by day</h3><div class="bars">${days.map((d,i)=>`<div class="bar">${n<=10?`<small>${lab(v[i])}</small>`:''}<i style="height:${Math.max(3,Math.round(v[i]/mx*56))}px"></i><small>${n<=8?wkday(d):d.slice(8)}</small></div>`).join('')}</div>`}
function topItems(R){const t=(R.top_items||[]).slice(0,5);if(!t.length)return'';
 return`<h3>Top sellers</h3>${t.map((x,i)=>`<div class="row"><div>${i+1}. ${esc(x.name)}<small>${fq(x.qty)} sold · profit ${kes(r2(x.profit))}</small></div><b>${kes(r2(x.revenue))}</b></div>`).join('')}`}
function staffSales(R){if(S.role!='owner'||!(R.by_staff||[]).length)return'';const nm=u=>u==S.uid?'You':((S.team||[]).find(x=>x.user_id==u)||{}).email||'Staff';
 if(R.by_staff.length<2&&R.by_staff[0].user==S.uid&&!(S.team||[]).some(x=>x.role=='staff'))return'';
 return`<h3>Sales by staff</h3>${R.by_staff.map(x=>`<div class="row"><div>${esc(nm(x.user))}<small>${x.count} sale(s)</small></div><b>${kes(x.sales)}</b></div>`).join('')}`}
// Expenses
const EXP_CATS=['Rent','Transport','Electricity','Water','Wages','Airtime & data','Repairs','Licence & taxes','Food','Other'];
function expenseForm(){closeEdit();document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>New expense</h3>
 <label class="lb">What for?</label><div class="chips" id="xc">${EXP_CATS.map(c=>`<button class="s" onclick="S.xcat='${c}';document.querySelectorAll('#xc button').forEach(b=>b.classList.toggle('on',b.textContent==S.xcat))">${c}</button>`).join('')}</div>
 <input id="xl" placeholder="Details (optional), e.g. boda to wholesaler"><input id="xa" type="number" inputmode="numeric" step="any" placeholder="Amount (KES)">
 <label class="lb">Paid from</label><select id="xp"><option value="cash">Cash drawer</option><option value="mpesa">M-Pesa</option><option value="bank">Bank</option><option value="other">Other / own pocket</option></select>
 <label class="lb">Date</label><input id="xd" type="date" value="${today()}" max="${today()}">
 <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="saveExpense(this)">Save expense</button></div></div></div>`);S.xcat=null}
async function saveExpense(btn){const a=+$('#xa').value,l=$('#xl').value.trim();if(!S.xcat&&!l)return alert('Choose what the expense was for');if(!(a>0))return alert('Enter the amount');
 btn.disabled=true;const {error}=await sb.from('expenses').insert({shop_id:S.shop.id,category:S.xcat||'Other',label:(l||S.xcat).slice(0,200),amount:a,paid_from:$('#xp').value,spent_on:$('#xd').value||today()});
 if(error){btn.disabled=false;return alert(error.message)}closeEdit();await loadReport().catch(()=>{});saveCache();render();toast('✓ Expense saved')}
async function deleteExpense(id){if(!confirm('Delete this expense?'))return;const {error}=await sb.from('expenses').delete().eq('id',id);if(error)return alert(error.message);await loadReport().catch(()=>{});render()}
function expenseList(){const L=S.exps||[];if(!L.length)return'';const pf={cash:'cash drawer',mpesa:'M-Pesa',bank:'bank',other:'other'};
 return`<h3>Expenses</h3>${L.map(x=>`<div class="row"><div>${esc(x.category||'Other')}${x.label&&x.label!=x.category?' · '+esc(x.label):''}<small>${dLabel(x.spent_on)} · ${pf[x.paid_from]||x.paid_from}</small></div><div><b>${kes(x.amount)}</b>${S.role=='owner'?` <button class="s" onclick="deleteExpense('${x.id}')">✕</button>`:''}</div></div>`).join('')}`}
// End-of-day cash check: what should be in the drawer vs what is there.
const floatKey=()=>'duka:float:'+S.shop.id;
const expectedCash=(R,fl)=>r2(+fl+ +R.cash_sales+ +R.debt_cash- +R.expenses_cash);
function cashCheckCard(R){const fl=+(lsGet(floatKey())||0),last=(S.counts||[]).find(c=>c.day==today());
 return`<div class="card" style="margin-top:8px"><span class="pn">💰 Cash in the drawer</span><small>Expected now: <b>${kes(expectedCash(R,fl))}</b>${fl?` (includes ${kes(fl)} starting cash)`:''}</small>
 ${last?`<small>Counted at ${hm(last.created_at)}: ${kes(last.counted)} · <span class="${+last.difference<0?'low':''}">${+last.difference==0?'exact ✔':(+last.difference<0?'short ':'over ')+kes(Math.abs(last.difference))}</span></small>`:''}
 <p><button class="s" onclick="cashCount()">Count the cash</button></p></div>`}
async function cashCount(){try{await loadReport()}catch(e){}const R=S.rep,fl=lsGet(floatKey())||'';closeEdit();
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>Count the cash</h3>
 <p class="lb">Cash sales ${kes(R.cash_sales)} + debt paid in cash ${kes(R.debt_cash)} − expenses from the drawer ${kes(R.expenses_cash)}</p>
 <label class="lb">Starting cash in the morning (float)</label><input id="ccf" type="number" inputmode="numeric" value="${fl}" placeholder="0" oninput="ccCalc()">
 <label class="lb">Cash counted in the drawer now</label><input id="ccc" type="number" inputmode="numeric" step="any" oninput="ccCalc()">
 <input id="ccn" placeholder="Note (optional)"><div class="card" id="ccr"></div>
 <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="saveCount(this)">Save count</button></div></div></div>`);ccCalc();setTimeout(()=>$('#ccc')&&$('#ccc').focus(),50)}
function ccCalc(){const e=expectedCash(S.rep,+$('#ccf').value||0),c=$('#ccc').value;
 $('#ccr').innerHTML=`<small>Expected</small><b>${kes(e)}</b>${c===''?'':(()=>{const d=r2(+c-e);return`<small class="${d<0?'low':''}">${d==0?'Exact ✔':(d<0?'Short by ':'Over by ')+kes(Math.abs(d))}</small>`})()}`}
async function saveCount(btn){const c=$('#ccc').value,fl=+$('#ccf').value||0;if(c===''||+c<0)return alert('Enter the cash you counted');
 btn.disabled=true;lsSet(floatKey(),String(fl));
 const {error}=await sb.from('cash_counts').insert({shop_id:S.shop.id,day:today(),opening_float:fl,expected:expectedCash(S.rep,fl),counted:+c,note:$('#ccn').value.trim()||null});
 if(error){btn.disabled=false;return alert(error.message)}closeEdit();await loadReport().catch(()=>{});saveCache();render();toast('✓ Cash count saved')}
function cashCountHistory(){const L=(S.counts||[]).slice(0,10);if(!L.length)return'';const nm=u=>u==S.uid?'you':((S.team||[]).find(x=>x.user_id==u)||{}).email||'staff';
 return`<h3>Cash counts</h3>${L.map(c=>`<div class="row"><div>${dLabel(c.day)} ${hm(c.created_at)}<small>expected ${kes(c.expected)} · counted ${kes(c.counted)} · by ${esc(nm(c.counted_by))}${c.note?' · '+esc(c.note):''}</small></div><b class="${+c.difference<0?'low':''}">${+c.difference==0?'✔':(+c.difference>0?'+':'')+kes(c.difference)}</b></div>`).join('')}`}
// Order list for the supplier from "Running low"
function orderList(){const low=S.products.filter(p=>p.stock_qty<=p.low_stock_at).sort((a,b)=>a.name.localeCompare(b.name));
 const qty=p=>Math.max(Math.ceil(+p.low_stock_at*2- +p.stock_qty),Math.ceil(+p.low_stock_at)||1);
 const txt=`Hello, please bring for ${S.shop.name}:\n`+low.map(p=>`- ${p.name}${p.variant?' '+p.variant:''}: ${qty(p)} ${p.unit}`).join('\n')+`\nThank you.`;closeEdit();
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>Order list</h3>
 <p class="lb">Suggested amounts bring each item back to about twice its reorder level. Change anything before sending.</p>
 <textarea id="olt" rows="10" style="width:100%;padding:12px;border:1px solid var(--line);border-radius:10px;font:inherit;background:var(--card);color:var(--tx)">${esc(txt)}</textarea>
 <label class="lb">Supplier's WhatsApp number (optional)</label><input id="oln" type="tel" placeholder="0712345678" value="${esc(lsGet('duka:supplier:'+S.shop.id)||'')}">
 <div class="m"><button onclick="closeEdit()">Close</button><button class="p" onclick="lsSet('duka:supplier:'+S.shop.id,$('#oln').value.trim());window.open('https://wa.me/'+waNum($('#oln').value)+'?text='+encodeURIComponent($('#olt').value),'_blank')">Send on WhatsApp</button></div></div></div>`)}

