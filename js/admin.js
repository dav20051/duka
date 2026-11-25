// Duka · Platform admin (only for accounts in private.admins).
// Plain browser script: loaded in order by index.html and shares the page's global scope.
// ---------- Platform admin (only for accounts in private.admins) ----------
async function loadAdmin(){const [l,rv,ag,st]=await Promise.all([sb.rpc('admin_list_shops'),sb.rpc('admin_revenue'),sb.rpc('admin_list_agents'),sb.rpc('app_settings')]);
 if(l.error)return alert(l.error.message);S.adm=l.data||[];S.rev=rv.data||[];S.agents=ag.data||[];S.settings=st.data||S.settings||{};S.adt=S.adt||'shops';
 if(S.adt=='payments')await loadPayments();if(S.adt=='growth')await loadGrowth();adminRender()}
function adminRender(){const locked=!S.shop||(S.shop.paid_until&&S.shop.paid_until<today());
 if(locked){S.inApp=false;app.innerHTML=`<main>${VIEWS.admin()}<p>${S.shop?'<button onclick="boot()">Back</button> ':''}<button onclick="logout()">Log out</button></p></main>`}
 else{S.tab='admin';render()}}
async function adminTab(t){S.adt=t;if(t=='payments')await loadPayments();if(t=='growth')await loadGrowth();adminRender()}
const daysTo=d=>d?Math.round((new Date(d+'T00:00:00Z')-new Date(today()+'T00:00:00Z'))/864e5):null;
function shopStatus(s){const td=today(),d=daysTo(s.paid_until),last=s.last_sale?String(s.last_sale).slice(0,10):null,age=Math.round((Date.now()-new Date(s.created_at))/864e5);
 return{expired:!s.parent_id&&s.paid_until&&s.paid_until<td,expiring:!s.parent_id&&d!==null&&d>=0&&d<=7,trial:!s.parent_id&&s.plan=='trial'&&!(s.paid_until&&s.paid_until<td),
  inactive:!(s.paid_until&&s.paid_until<td)&&(last?daysTo(last)<-7:age>7),del:!!s.deletion_requested_at,days:d,last}}
VIEWS.admin=()=>{const td=today(),main=S.adm.filter(s=>!s.parent_id),live=main.filter(s=>!s.paid_until||s.paid_until>=td);
 const n=k=>live.filter(s=>s.plan==k).length,mrr=['basic','standard','premium'].reduce((a,k)=>a+n(k)*PLANS[k].m,0);
 const mo=td.slice(0,7),thisMonth=(S.rev.find(r=>r.month==mo)||{}).amount||0,T=S.adt||'shops';
 return`<h3>Admin</h3><div class="g"><div class="card">Paying shops<b>${n('basic')+n('standard')+n('premium')}</b><small>${n('basic')} Basic · ${n('standard')} Standard · ${n('premium')} Premium</small></div>
 <div class="card">On trial<b>${n('trial')}</b><small>${main.length-live.length} expired · ${S.adm.length-main.length} branch(es)</small></div>
 <div class="card">Monthly value<b>${kes(mrr)}</b><small>active plans at monthly price</small></div>
 <div class="card">Collected ${mo}<b>${kes(thisMonth)}</b><small>${S.rev.slice(1,4).map(r=>esc(r.month)+': '+kes(r.amount)).join('<br>')||'no earlier months'}</small></div></div>
 <div class="chips per">${[['shops','Shops'],['payments','Payments'],['agents','Agents'],['growth','Growth'],['settings','Settings']].map(([k,l])=>`<button class="s${T==k?' on':''}" onclick="adminTab('${k}')">${l}</button>`).join('')}</div>
 ${T=='payments'?adminPayments():T=='agents'?adminAgents():T=='growth'?adminGrowth():T=='settings'?adminSettings():adminShops()}`};
// --- Shops with follow-up filters
const AF=[['all','All'],['expiring','Ending in 7 days'],['expired','Expired'],['trial','On trial'],['inactive','Not selling 7+ days'],['del','Delete requests']];
function adminShops(){const f=S.af||'all',cnt=k=>k=='all'?S.adm.length:S.adm.filter(s=>shopStatus(s)[k]).length;
 return`<div class="chips per">${AF.map(([k,l])=>`<button class="s${f==k?' on':''}" onclick="S.af='${k}';adminRender()">${l} (${cnt(k)})</button>`).join('')}</div>
 <input placeholder="Search shop, owner email, phone or agent" value="${esc(S.aq||'')}" oninput="S.aq=this.value;$('#al').innerHTML=adminList()"><div id="al">${adminList()}</div>`}
function adminList(){const q=(S.aq||'').toLowerCase(),f=S.af||'all',typ=t=>(TYPES.find(x=>x[0]==t)||[0,t])[1];
 const L=S.adm.filter(s=>(f=='all'||shopStatus(s)[f])&&[s.name,s.owner_email,s.phone,s.agent_code,s.referred_by].join(' ').toLowerCase().includes(q));
 if(f=='expiring'||f=='expired')L.sort((a,b)=>(a.paid_until||'')<(b.paid_until||'')?-1:1);
 return L.map(s=>{const st=shopStatus(s),par=s.parent_id&&S.adm.find(x=>x.id==s.parent_id);
  return`<div class="row"><div>${esc(s.name)} · <b>${esc(planName(s.plan))}</b><small>${esc(s.owner_email||'no owner')}${s.phone?' · '+esc(s.phone):''} · ${esc(typ(s.type))} · ${s.members} user(s) · ${s.products} products</small>
  ${par||s.agent_code||s.referred_by?`<small>${par?'Branch of '+esc(par.name):''}${s.agent_code?' Agent '+esc(s.agent_code):''}${s.referred_by?' Referred by '+esc(s.referred_by):''}</small>`:''}
  <small><span class="${st.expired?'low':st.expiring?'ex':''}">${st.expired?'EXPIRED '+esc(s.paid_until):st.expiring?`Ends in ${st.days} day(s): ${esc(s.paid_until)}`:'Paid until '+esc(s.paid_until||'-')}</span> · 30 days: ${kes(s.sales_30d)}${st.last?' · last sale '+esc(st.last):' · no sales yet'}${st.inactive&&!st.expired?' · <span class="ex">not selling</span>':''}</small>
  ${s.deletion_requested_at?`<small class="low">Owner asked to delete this shop on ${esc(String(s.deletion_requested_at).slice(0,10))}</small>`:''}</div>
  <div class="qb">${s.parent_id?'':`<button class="s" onclick="adminPay('${s.id}')">+ Payment</button><button class="s" onclick="adminGift('${s.id}')">🎁 Days</button>`}${s.phone?`<a href="${esc(ownerWa(s))}" target="_blank" rel="noopener"><button class="s">💬</button></a>`:''}<button class="s" onclick="adminType('${s.id}')">Type</button>${s.deletion_requested_at?`<button class="s" onclick="adminDelete('${s.id}')">Delete</button>`:''}</div></div>`}).join('')||'<p>No shops match.</p>'}
// WhatsApp the shop owner with a message that fits their situation
function ownerWa(s){const st=shopStatus(s),price=kes(PLANS[PLANS[s.plan]?s.plan:'standard'].m),pay=`Pay ${price} by M-Pesa to ${PAY_TO} and send us the code. Asante!`;
 const m=st.expired?`Habari! Your Duka subscription for ${s.name} ended on ${s.paid_until}. Your records are safe. ${pay}`
  :st.trial&&st.expiring?`Habari! Your free Duka trial for ${s.name} ends on ${s.paid_until}. Plans start at KES 500/month (Standard ${kes(PLANS.standard.m)}). ${pay}`
  :st.expiring?`Habari! Your Duka subscription for ${s.name} ends on ${s.paid_until}. ${pay}`
  :st.inactive?`Habari! This is Duka support. We noticed ${s.name} has not recorded sales ${st.last?'since '+st.last:'yet'}. Can we help you set up or answer any questions?`
  :`Habari! This is Duka support for ${s.name}.`;
 return`https://wa.me/${waNum(s.phone)}?text=${encodeURIComponent(m)}`}
async function adminGift(id){const s=S.adm.find(x=>x.id==id);const d=parseInt(prompt(`Give ${s.name} free days (not counted as revenue). How many days?`,'7'),10);if(!(d>0))return;
 const why=prompt('Reason (for your records), e.g. "Sorry for downtime"','');if(!why||!why.trim())return alert('A reason is needed');
 const {data,error}=await sb.rpc('admin_gift_days',{p_shop:id,p_days:d,p_reason:why.trim()});if(error)return alert(error.message);alert(`${s.name} is now paid until ${data}`);loadAdmin()}
// --- All payments, search and reverse
async function loadPayments(){const {data,error}=await sb.rpc('admin_list_payments',{p_search:S.pq||null,p_limit:200});if(error)return alert(error.message);S.pays=data||[]}
function adminPayments(){const src={manual:'recorded',mpesa_stk:'M-Pesa auto',gift:'🎁 gift'};
 return`<div class="ib"><input id="pqs" placeholder="Search M-Pesa code or shop" value="${esc(S.pq||'')}" onkeydown="if(event.key=='Enter'){S.pq=this.value;adminTab('payments')}"><button class="s" onclick="S.pq=$('#pqs').value;adminTab('payments')">Search</button></div>
 ${(S.pays||[]).map(p=>`<div class="row"><div>${esc(p.shop_name)} · ${esc(planName(p.plan||''))}<small>${dLabel(String(p.paid_on).slice(0,10))} ${hm(p.paid_on)} · ${p.days} days · ${src[p.source]||esc(p.source)}${p.mpesa_code?' · '+esc(p.mpesa_code):''}${p.note?' · '+esc(p.note):''} · by ${esc(p.recorded_by||'-')}</small>
  ${p.reversed_at?`<small class="low">REVERSED ${esc(String(p.reversed_at).slice(0,10))}: ${esc(p.reverse_reason||'')}</small>`:''}</div>
  <div><b class="${p.reversed_at?'':''}">${p.reversed_at?'<s>':''}${kes(p.amount||0)}${p.reversed_at?'</s>':''}</b>${p.reversed_at?'':` <button class="s" onclick="adminReverse('${p.id}')">Reverse</button>`}</div></div>`).join('')||'<p>No payments found.</p>'}`}
async function adminReverse(id){const p=S.pays.find(x=>x.id==id);
 if(!confirm(`Reverse ${kes(p.amount||0)} for ${p.shop_name} (${p.mpesa_code||'no code'})?\n\nThis removes ${p.days} days from the shop. A free month already given to a referrer is NOT taken back.`))return;
 const why=prompt('Reason (for your records), e.g. "Wrong shop" or "Wrong amount"','');if(!why||!why.trim())return alert('A reason is needed');
 const {data,error}=await sb.rpc('admin_reverse_payment',{p_payment:id,p_reason:why.trim()});if(error)return alert(error.message);
 alert(`Reversed. ${p.shop_name} is now paid until ${data}. You can now record the correct payment, with the same M-Pesa code if needed.`);loadAdmin()}
// --- Agents with payouts
function adminAgents(){return`<p class="lb">Agents sign up shops with their code. Commission is worked out from what their shops have paid (gifts and reversed payments do not count).</p>
 ${S.agents.map(a=>`<div class="row"><div>${esc(a.name)} · <b>${esc(a.code)}</b>${a.active?'':' (inactive)'}<small>${esc(a.phone||'')} · ${a.signups} signed up · ${a.paying} paying · revenue ${kes(a.revenue)}</small>
  <small>Commission ${+a.commission_pct}%: ${kes(a.commission)} · paid ${kes(a.paid_out)} · <b class="${+a.balance>0?'ex':''}">owed ${kes(a.balance)}</b></small></div>
  <div class="qb"><button class="s" onclick="adminPayAgent('${esc(a.code)}')">Pay</button><button class="s" onclick="adminPayouts('${esc(a.code)}')">History</button><button class="s" onclick="adminAgent('${esc(a.code)}')">Edit</button></div></div>`).join('')||'<p>No agents yet.</p>'}
 <button class="p" onclick="adminAgent()">+ Add agent</button>`}
async function adminAgent(code){const a=S.agents.find(x=>x.code==code)||{commission_pct:20,active:true};
 const c=code||(prompt('Agent code (letters/numbers, e.g. KIP01). Shops type this when signing up.')||'').trim().toUpperCase();if(!c)return;
 if(!/^[A-Z0-9]{3,12}$/.test(c))return alert('Use 3 to 12 letters or numbers');
 const name=prompt('Agent name',a.name||'');if(!name)return;const phone=prompt('Agent phone',a.phone||'');if(phone===null)return;
 const pct=prompt('Commission % of what their shops pay',a.commission_pct);if(pct===null)return;
 const active=code?confirm('Keep this agent active? (OK = active, Cancel = inactive)'):true;
 const {error}=await sb.rpc('admin_save_agent',{p_code:c,p_name:name.trim(),p_phone:phone.trim()||null,p_commission:+pct||0,p_active:active});
 if(error)return alert(error.message);loadAdmin()}
async function adminPayAgent(code){const a=S.agents.find(x=>x.code==code);const amt=parseFloat(prompt(`Pay ${a.name}. Amount (KES). Owed: ${kes(a.balance)}`,Math.max(0,+a.balance)||''));if(!(amt>0))return;
 const mc=prompt('M-Pesa code of the payment to the agent (optional)','');if(mc===null)return;const note=prompt('Note (optional), e.g. "November commission"','');if(note===null)return;
 const {error}=await sb.rpc('admin_pay_agent',{p_code:code,p_amount:amt,p_mpesa_code:mc.trim()||null,p_note:note.trim()||null});if(error)return alert(error.message);toast('✓ Payout recorded');loadAdmin()}
async function adminPayouts(code){const {data,error}=await sb.rpc('admin_agent_payouts',{p_code:code});if(error)return alert(error.message);closeEdit();
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>Payouts · ${esc(code)}</h3>
 ${(data||[]).map(p=>`<div class="row"><div>${dLabel(String(p.paid_on).slice(0,10))}<small>${esc(p.mpesa_code||'')}${p.note?' · '+esc(p.note):''}</small></div><b>${kes(p.amount)}</b></div>`).join('')||'<p>No payouts yet.</p>'}
 <p><button onclick="closeEdit()" style="width:100%">Close</button></p></div></div>`)}
// --- Growth by month
async function loadGrowth(){const {data,error}=await sb.rpc('admin_growth');if(error)return alert(error.message);S.growth=data||[]}
function adminGrowth(){const G=S.growth||[];if(!G.length)return'<p>No data yet.</p>';const mx=Math.max(1,...G.map(g=>+g.revenue)),mn=m=>new Date(m+'-15T12:00:00Z').toLocaleDateString('en-KE',{month:'short'});
 return`<h3>Revenue by month</h3><div class="bars">${G.map(g=>`<div class="bar"><small>${+g.revenue?(+g.revenue>=1000?(g.revenue/1000).toFixed(1)+'k':Math.round(g.revenue)):''}</small><i style="height:${Math.max(3,Math.round(g.revenue/mx*56))}px"></i><small>${mn(g.month)}</small></div>`).join('')}</div>
 <h3>Shops by month</h3>${[...G].reverse().map(g=>`<div class="row"><div>${esc(g.month)}<small>${g.new_shops} new · ${g.paying} paying at month end · <span class="${+g.lost?'low':''}">${g.lost} stopped paying</span></small></div><b>${kes(g.revenue)}</b></div>`).join('')}
 <p class="lb">"Stopped paying" = paying at the end of the previous month but not at the end of this one. Gifts and reversed payments are left out.</p>`}
// --- Settings: switches and announcement
function adminSettings(){const st=S.settings||{},an=st.announcement||{};
 return`<h3>Switches</h3>
 <label class="row" style="cursor:pointer"><div>Pay now with M-Pesa (STK Push)<small>Turn on only after the Daraja keys are saved in Supabase (see SETUP.md).</small></div><input type="checkbox" style="width:22px;height:22px;margin:0" ${st.mpesa_stk_enabled?'checked':''} onchange="adminSwitch('mpesa_stk_enabled',this)"></label>
 <label class="row" style="cursor:pointer"><div>SMS debt reminders (Premium)<small>Turn on only after the Africa's Talking keys are saved in Supabase.</small></div><input type="checkbox" style="width:22px;height:22px;margin:0" ${st.sms_enabled?'checked':''} onchange="adminSwitch('sms_enabled',this)"></label>
 <h3>Announcement to all shops</h3><p class="lb">Shown at the top of the app for everyone who logs in, until they close it.</p>
 <textarea id="ann" rows="3" maxlength="300" style="width:100%;padding:12px;border:1px solid var(--line);border-radius:10px;font:inherit;background:var(--card);color:var(--tx)" placeholder="e.g. New: stock-take is here! Count your shelves from Stock → Stock-take.">${esc(an.message||'')}</textarea>
 <div class="g"><select id="anl"><option value="info" ${an.level!='warning'?'selected':''}>Information</option><option value="warning" ${an.level=='warning'?'selected':''}>Warning (e.g. maintenance)</option></select>
 <label class="row" style="margin:5px 0"><span>Show it</span><input id="ana" type="checkbox" style="width:22px;height:22px;margin:0" ${an.active?'checked':''}></label></div>
 <button class="p" style="width:100%" onclick="adminSaveAnn(this)">Save announcement</button>`}
async function adminSwitch(k,el){if(el.checked&&!confirm('Have the keys been added in Supabase? If not, customers will see errors.')){el.checked=false;return}
 const {error}=await sb.rpc('admin_set_setting',{p_key:k,p_value:el.checked});if(error){el.checked=!el.checked;return alert(error.message)}S.settings[k]=el.checked;toast('✓ Saved')}
async function adminSaveAnn(btn){const v={message:$('#ann').value.trim(),level:$('#anl').value,active:$('#ana').checked};if(v.active&&!v.message)return alert('Write the message first');
 btn.disabled=true;const {error}=await sb.rpc('admin_set_setting',{p_key:'announcement',p_value:v});btn.disabled=false;if(error)return alert(error.message);toast('✓ Announcement saved');loadAdmin()}
// Announcement banner for everyone (closed per message on this phone)
function annBar(){const a=S.settings&&S.settings.announcement;if(!a||!a.active||!a.message||lsGet('duka:ann')==String(a.id))return'';
 return`<div class="ob${a.level=='warning'?' err':''}"><span>📢 ${esc(a.message)}</span><button class="s" onclick="lsSet('duka:ann','${esc(String(a.id))}');render()">✕</button></div>`}
function adminPay(id){const s=S.adm.find(x=>x.id==id),cur=PLANS[s.plan]?s.plan:'standard';
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet">
 <h3>Record payment · ${esc(s.name)}</h3><p class="lb">Now: ${esc(planName(s.plan))}, paid until ${esc(s.paid_until||'-')}</p>
 <label class="lb">Plan</label><select id="ap" onchange="apCalc()">${Object.entries(PLANS).map(([k,p])=>`<option value="${k}" ${k==cur?'selected':''}>${p.name} · ${kes(p.m)}/month</option>`).join('')}</select>
 <label class="lb">Period</label><select id="ad" onchange="apCalc()">${PERIODS.map(([mo,,,l])=>`<option value="${mo}">${l}</option>`).join('')}</select>
 <label class="lb">Amount received (KES)</label><input id="aa" type="number" step="any"><small class="lb" id="ah"></small>
 <label class="lb">M-Pesa code</label><input id="ac" placeholder="e.g. SKL2ABC123" style="text-transform:uppercase">
 <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="adminPaySave('${s.id}',this)">Save payment</button></div></div></div>`);apCalc()}
function apCalc(){const p=$('#ap').value,mo=+$('#ad').value,v=planPrice(p,mo);$('#aa').value=v;
 $('#ah').textContent=mo>1?`List price ${kes(v)} (normally ${kes(PLANS[p].m*mo)})`:''}
async function adminPaySave(id,btn){const mo=+$('#ad').value,code=$('#ac').value.trim(),amt=+$('#aa').value;
 if(!code&&!confirm('No M-Pesa code entered. Save anyway?'))return;btn.disabled=true;
 const {data,error}=await sb.rpc('admin_extend_shop',{p_shop:id,p_days:PERIODS.find(x=>x[0]==mo)[1],p_amount:amt>0?amt:null,p_mpesa_code:code||null,p_plan:$('#ap').value});
 if(error){btn.disabled=false;return alert(error.message)}closeEdit();alert('Saved. Paid until '+data);loadAdmin()}
async function adminType(id){const s=S.adm.find(x=>x.id==id);
 const t=prompt('Shop type: '+TYPES.map(x=>x[0]).join(', '),s.type);if(t===null||t.trim()==s.type)return;
 const {error}=await sb.rpc('admin_set_shop_type',{p_shop:id,p_type:t.trim().toLowerCase()});if(error)return alert(error.message);loadAdmin()}

