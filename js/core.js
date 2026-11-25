// Duka · Config, pricing, helpers, start-up, offline sales queue, branches.
// Plain browser script: loaded in order by index.html and shares the page's global scope.
const SUPABASE_URL='https://tlcoxnnliwrvmnezsiqh.supabase.co', SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsY294bm5saXdydm1uZXpzaXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMzY1MDUsImV4cCI6MjEwNjcxMjUwNX0.KpGzlT0Uplk1gWxBgByTBXkSF693zfo0bRjYilrU2Qc';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s), app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kes=n=>'KES '+Number(n||0).toLocaleString('en-KE');
// ---------- Business & pricing ----------
const BUSINESS='JOEDFRAME TECHNOLOGIES', SUPPORT_PHONE='254701252785', PAY_TO='0701 252 785';
// Display only: limits are enforced in the database (private.plan_limit).
const PLANS={
 basic:{name:'Basic',m:500,f:['1 staff account','Up to 300 products','Sell, stock & debts','WhatsApp debt reminders','Daily WhatsApp summary','Download your data']},
 standard:{name:'Standard',m:1000,f:['Up to 5 staff accounts','Unlimited products','Everything in Basic','Profit & stock value','7-day chart & top sellers']},
 premium:{name:'Premium',m:2000,f:['Unlimited staff accounts','Unlimited products','Everything in Standard','Priority WhatsApp support','We load your stock list for you']}};
// [months, days added, price factor, label]
const PERIODS=[[1,30,1,'1 month'],[6,182,.9,'6 months · save 10%'],[12,365,10/12,'1 year · 2 months free']];
const planPrice=(p,mo)=>Math.round(PLANS[p].m*mo*PERIODS.find(x=>x[0]==mo)[2]);
const planName=p=>p=='trial'?'Free trial':(PLANS[p]||{name:p}).name;
const reports=()=>S.role!='staff'&&S.shop.plan!='basic';
function pricingHTML(cur){return`<div class="plans">${Object.entries(PLANS).map(([k,p])=>`<div class="card plan${k==cur?' cur':''}${k=='standard'?' pop':''}">
 ${k=='standard'?'<em>Most popular</em>':''}<span class="pn">${p.name}</span><b>${kes(p.m)}<small>/month</small></b>
 <small>6 months ${kes(planPrice(k,6))} · 1 year ${kes(planPrice(k,12))}</small><ul>${p.f.map(x=>`<li>${x}</li>`).join('')}</ul></div>`).join('')}</div>`}
function payHTML(){const msg=encodeURIComponent(`Hello ${BUSINESS}, I have paid for Duka.\nShop: ${S.shop?S.shop.name:''}\nPlan (Basic/Standard/Premium): \nPeriod (1 month/6 months/1 year): \nM-Pesa code: `);
 const stk=S.settings&&S.settings.mpesa_stk_enabled&&S.role=='owner',cur=PLANS[S.shop&&S.shop.plan]?S.shop.plan:'standard';
 return`${stk?`<div class="card"><span class="pn">Pay now with M-Pesa</span><small>You get a prompt on your phone. Enter your M-Pesa PIN and your shop is activated straight away.</small>
 <label class="lb">Plan</label><select id="kp" onchange="stkCalc()">${Object.entries(PLANS).map(([k,p])=>`<option value="${k}" ${k==cur?'selected':''}>${p.name}</option>`).join('')}</select>
 <label class="lb">Period</label><select id="km" onchange="stkCalc()">${PERIODS.map(([mo,,,l])=>`<option value="${mo}">${l}</option>`).join('')}</select>
 <label class="lb">M-Pesa phone number</label><input id="kn" type="tel" placeholder="0712345678" value="${esc(S.shop&&S.shop.phone||'')}">
 <p><button class="p" style="width:100%" id="kb" onclick="payStk(this)">Pay</button></p></div><h3>Or pay manually</h3>`:''}
 <div class="card"><span class="pn">How to pay</span><small>1. M-Pesa <b>Send Money</b> to <b>${PAY_TO}</b> (${BUSINESS}).<br>2. Send us the M-Pesa code on WhatsApp. We activate your shop within the hour.</small>
 <p><a href="https://wa.me/${SUPPORT_PHONE}?text=${msg}" target="_blank" rel="noopener"><button class="p" style="width:100%">Send M-Pesa code on WhatsApp</button></a></p></div>`}
function stkCalc(){const b=$('#kb');if(b)b.textContent=`Pay ${kes(planPrice($('#kp').value,+$('#km').value))}`}
async function payStk(btn){const phone=$('#kn').value.trim();if(!phone)return alert('Enter your M-Pesa phone number');
 btn.disabled=true;const old=btn.textContent;btn.textContent='Sending request…';
 const {data,error}=await sb.functions.invoke('mpesa-stk',{body:{shop_id:S.shop.id,plan:$('#kp').value,months:+$('#km').value,phone}});
 if(error){btn.disabled=false;btn.textContent=old;let m=error.message;try{m=(await error.context.json()).error||m}catch(e){}return alert(m)}
 btn.textContent='Check your phone and enter your M-Pesa PIN…';
 for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,3000));
  const {data:st}=await sb.rpc('my_mpesa_status',{p_checkout:data.checkout_request_id});const s=st&&st[0];
  if(s&&s.status=='paid'){alert(`Payment received ✔ Paid until ${s.paid_until}`);closeEdit();return boot()}
  if(s&&s.status=='failed'){btn.disabled=false;btn.textContent=old;return alert('Payment not completed: '+(s.result_desc||'cancelled'))}}
 btn.disabled=false;btn.textContent=old;alert('We have not received confirmation yet. If you paid, your shop will be activated shortly.')}
function showPlans(){document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>Plans</h3>
 <p class="lb">You are on <b>${esc(planName(S.shop.plan))}</b>, paid until ${esc(S.shop.paid_until||'-')}. Paying early adds to your remaining days.</p>${pricingHTML(S.shop.plan)}${payHTML()}<p><button onclick="closeEdit()" style="width:100%">Close</button></p></div></div>`);stkCalc()}
// ---------- Local storage helpers (never required for correctness) ----------
function lsGet(k,json){try{const v=localStorage.getItem(k);return json?JSON.parse(v):v}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,typeof v=='string'?v:JSON.stringify(v))}catch(e){}}
const isNet=e=>!navigator.onLine||/offline|fetch|network|load failed|timed? ?out/i.test(String(e&&e.message||e));
// Invite codes: remembered for 30 days after opening an invite link; the banner shows only on that visit.
let REF_FROM_LINK=null;
try{const r=new URLSearchParams(location.search).get('ref');if(r&&/^[A-Za-z0-9]{3,12}$/.test(r)){REF_FROM_LINK=r.toUpperCase();lsSet('duka:ref',{code:REF_FROM_LINK,at:Date.now()})}}catch(e){}
function savedRef(){const v=lsGet('duka:ref',true);if(!v||typeof v!='object'||!v.code||Date.now()-v.at>30*864e5){lsSet('duka:ref','');return''}return v.code}
const S={tab:'sell',cart:{},method:'cash',cust:'',q:'',products:[],customers:[],days:[]};
// Simple mode (default): only the everyday screens. Full mode shows every tool. Chosen by the owner, per shop.
const isSimple=()=>!S.shop||S.shop.ui_mode!=='full';
// App shortcuts and links can open a tab directly, e.g. ./#debts
try{const h=location.hash.slice(1);if(['sell','stock','debts','today','more'].includes(h))S.tab=h}catch(e){}
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Nairobi'});

function authView(){S.inApp=false;const ref=REF_FROM_LINK;app.innerHTML=`<main class="c"><h1>Duka</h1><p>Sales, stock and debts for your shop.</p>
${ref?`<div class="ob">Invited with code ${esc(ref)}: create an account to start your 30 days free.</div>`:''}
<p><button class="p" style="width:100%" onclick="startDemo()">👀 Try a demo shop (no sign-up)</button></p>
<p><button class="s" onclick="setLang(LANG=='sw'?'en':'sw')">🌐 ${LANG=='sw'?'English':'Kiswahili'}</button> <a href="home.html">What is Duka?</a></p>
<input id="em" type="email" placeholder="Email"><input id="pw" type="password" placeholder="Password (8+ characters)">
<button class="p" onclick="auth('in')">Log in</button> <button onclick="auth('up')">Create account</button><p><a href="#" onclick="forgot();return false">Forgot password?</a></p>
<p class="lb">By creating an account you agree to our <a href="terms.html">Terms</a> and <a href="privacy.html">Privacy Policy</a>.</p>
<h3>Why shops use Duka</h3><div class="why">
<div class="card"><span class="pn">🔍 See what is missing from your shelves</span><small>Count your stock and Duka shows, in shillings, what has disappeared: theft, mistakes or damage. Many shops save more than the monthly fee.</small></div>
<div class="card"><span class="pn">⚡ Your whole shop ready in minutes</span><small>Load your stock list in one go instead of typing item by item. On Premium, we load it for you.</small></div>
<div class="card"><span class="pn">📒 Never forget who owes you</span><small>Every debt recorded, with reminders on WhatsApp or SMS.</small></div>
<div class="card"><span class="pn">📴 Works without internet</span><small>Keep selling when the network is down. Receipts by WhatsApp or printer.</small></div></div>
<h3>Simple pricing</h3><p class="lb">Start with 30 days free, with all Standard features. Pay by M-Pesa. Save up to 2 months when you pay yearly.</p>${pricingHTML()}
<p class="lb">Questions? <a href="https://wa.me/${SUPPORT_PHONE}" target="_blank" rel="noopener">WhatsApp ${PAY_TO}</a></p></main>`}
async function auth(m){const e=$('#em').value.trim(),p=$('#pw').value;
 const r=m=='in'?await sb.auth.signInWithPassword({email:e,password:p}):await sb.auth.signUp({email:e,password:p});
 if(r.error)return alert(r.error.message);
 if(!r.data.session)return alert('Check your email to confirm, then log in.');boot()}
function setupView(){S.inApp=false;app.innerHTML=`<main class="c"><h1>Set up your shop</h1><p>30 days free.</p>
<input id="sn" placeholder="Shop name"><input id="sp" placeholder="Shop phone (optional)"><select id="st">${TYPES.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select><p><small>Choose carefully: this decides which fields your shop sees, and only we can change it later.</small></p>
<label class="lb">Referral or agent code (optional)</label><input id="sr" value="${esc(savedRef())}" style="text-transform:uppercase">
<button class="p" onclick="createShop()">Start</button> <button onclick="logout()">Log out</button></main>`}
async function createShop(){const n=$('#sn').value.trim();if(!n)return alert('Enter the shop name');
 const {error}=await sb.rpc('create_shop',{p_name:n,p_phone:$('#sp').value.trim()||null,p_type:$('#st').value,p_ref:$('#sr').value.trim()||null});
 if(error&&/code was not found/i.test(error.message)){lsSet('duka:ref','');$('#sr').value='';
  return alert('That referral or agent code is not valid. It has been cleared: check it or tap Start to continue without a code.')}
 if(error)return alert(error.message);lsSet('duka:ref','');boot()}
function lockedView(){S.inApp=false;
 app.innerHTML=`<main class="c"><h1>${S.shop.plan=='trial'?'Free trial ended':'Subscription ended'}</h1><p>Choose a plan to keep using Duka for <b>${esc(S.shop.name)}</b>. Your records are safe and nothing has been deleted.</p>
 ${S.role=='owner'?pricingHTML(S.shop.plan)+payHTML():'<p>Ask the shop owner to renew the subscription.</p>'}
 <p class="lb">You can still download your records:</p>${S.role=='owner'?exportButtons():''}
 ${S.members&&S.members.length>1?shopSwitcher():''}
 <p>${S.admin?'<button onclick="loadAdmin()">Admin</button> ':''}<button onclick="logout()">Log out</button></p></main>`}
async function logout(){await sb.auth.signOut();S.uid=null;location.reload()}

// ---------- Start-up: works online, and offline from the last saved copy ----------
const CACHE_KEYS=['members','shop','role','admin','settings','products','customers','days','sales','invites','refs','rep','repPrev','exps','counts','team','perms','email','suppliers'];
function saveCache(){if(!S.uid||S.demo)return;const c={};CACHE_KEYS.forEach(k=>c[k]=S[k]);lsSet('duka:cache:'+S.uid,c)}
async function boot(){
 if(S.demo)return render();
 if(/[?&]demo\b/.test(location.search))return startDemo();
 const {data:{session}}=await sb.auth.getSession();
 if(!session)return authView();
 if(S.rec)return recoverView();
 if(S.uid&&S.uid!==session.user.id)return location.reload();
 S.uid=session.user.id;S.email=session.user.email;
 // Every start-up begins from a clean shop state, so nothing from an earlier shop or account leaks in.
 S.shop=null;S.members=null;S.role=null;S.perms=null;S.team=null;S.rep=null;S.repPrev=null;S.exps=null;S.counts=null;S.adm=null;
 try{
  if(!navigator.onLine)throw new Error('offline');
  await sb.rpc('claim_invites');
  const [ad,st,mb]=await Promise.all([sb.rpc('am_i_admin'),sb.rpc('app_settings'),
   sb.from('shop_members').select('role,shops(id,name,phone,paid_until,type,plan,parent_id,referral_code,kra_pin,pay_type,pay_number,pay_account,receipt_footer,deletion_requested_at,ui_mode)').eq('user_id',S.uid)]);
  if(mb.error)throw mb.error;
  S.admin=ad.data===true;S.settings=st.data||{};
  S.members=(mb.data||[]).filter(m=>m.shops).sort((a,b)=>(a.shops.parent_id?1:0)-(b.shops.parent_id?1:0)||a.shops.name.localeCompare(b.shops.name));
  if(!S.members.length)return S.admin?loadAdmin():setupView();
  const want=lsGet('duka:shop:'+S.uid),m=S.members.find(x=>x.shops.id==want)||S.members[0];
  S.shop={...m.shops};S.role=m.role;
  const {data:b,error:be}=await sb.rpc('shop_billing',{p_shop:S.shop.id});if(be)throw be;
  if(b&&b[0])Object.assign(S.shop,{plan:b[0].plan,paid_until:b[0].paid_until,is_branch:b[0].is_branch,main_shop:b[0].main_shop,branches:+b[0].branches});
  if(S.role!='owner'){const {data:pm}=await sb.rpc('my_permissions',{p_shop:S.shop.id});S.perms=pm||null}else S.perms=null;
  if(S.shop.paid_until&&S.shop.paid_until<today())return lockedView();
  await load();S.offline=false;saveCache();
  if(S.admin&&!S.adminShown){S.adminShown=true;return loadAdmin()} // platform admins land on Admin first
 }catch(e){
  const c=lsGet('duka:cache:'+S.uid,true);
  if(!isNet(e))return alert(e.message||e);
  if(!c||!c.shop){S.inApp=false;app.innerHTML=`<main class="c"><h1>Duka</h1><p>You are offline. Connect to the internet once to load your shop, then Duka keeps working offline.</p><button class="p" onclick="boot()">Try again</button></main>`;return}
  CACHE_KEYS.forEach(k=>S[k]=c[k]);S.offline=true;
 }
 render();syncQueue()}
async function load(){const sid=S.shop.id;if(isSimple())S.per='today';
 const [p,c,d,sl,si]=await Promise.all([
  sb.from('products').select('*').eq('shop_id',sid).eq('active',true).order('name'),
  sb.from('customer_balances').select('*').eq('shop_id',sid).order('name'),
  sb.from('daily_summary').select('*').eq('shop_id',sid).order('day',{ascending:false}).limit(7),
  sb.from('sales').select('id,created_at,total,paid,method,mpesa_code,customer_id,voided,sale_items(id,name,qty,unit_price,unit_cost)').eq('shop_id',sid).gte('created_at',new Date(Date.now()-7*864e5).toISOString()).order('created_at',{ascending:false}).limit(300),
  S.role=='owner'?sb.from('staff_invites').select('*').eq('shop_id',sid).order('created_at'):Promise.resolve({data:[]})]);
 const err=[p,c,d,sl,si].find(r=>r.error);if(err)throw err.error;
 S.products=p.data||[];S.customers=c.data||[];S.days=d.data||[];S.sales=sl.data||[];S.invites=si.data||[];
 if(S.role=='owner'&&!S.shop.is_branch){const {data:r}=await sb.rpc('my_referrals',{p_shop:sid});S.refs=r&&r[0]||{signed_up:0,rewarded:0}}
 if(S.role=='owner'){const {data:sp}=await sb.from('supplier_balances').select('*').eq('shop_id',sid).order('name');S.suppliers=sp||[]}else S.suppliers=[];
 try{await loadReport()}catch(e){if(!isNet(e))console.warn(e)}
 // Show sales still waiting to sync so the shop sees what it sold offline.
 const pend=queue().filter(x=>x.sale.shop_id==sid&&!S.sales.some(s=>s.id==x.sale.id));
 S.sales=[...pend.map(x=>({...x.sale,voided:false,sale_items:x.items,pending:true})),...S.sales]}

// ---------- Offline sales queue ----------
const QK=()=>'duka:queue:'+S.uid;
const queue=()=>lsGet(QK(),true)||[];
const setQueue=q=>lsSet(QK(),q);
// Ids are created on the phone, so retrying after a dropped connection never makes a duplicate.
async function pushSale(x){let r=await sb.from('sales').insert(x.sale);if(r.error&&r.error.code!='23505')throw r.error;
 r=await sb.from('sale_items').insert(x.items);if(r.error&&r.error.code!='23505')throw r.error}
let syncing=false;
async function syncQueue(){if(syncing||!navigator.onLine||!S.uid)return;let q=queue();if(!q.length)return;syncing=true;let sent=0;
 try{while(q.length){try{await pushSale(q[0])}catch(e){if(!isNet(e)){q[0].error=String(e.message||e);setQueue(q)}break}
  q.shift();setQueue(q);sent++}}
 finally{syncing=false}
 if(sent&&S.inApp&&S.shop){try{await load();S.offline=false;saveCache()}catch(e){}render()}else if(S.inApp)render()}
addEventListener('online',()=>{S.offline=false;syncQueue();if(S.inApp)boot()});
addEventListener('offline',()=>{S.offline=true;if(S.inApp)render()});
setInterval(syncQueue,60000);
function statusBar(){const q=queue(),err=q.find(x=>x.error);if(!S.offline&&!q.length)return'';
 return`<div class="ob${err?' err':''}"><span>${S.offline?'📴 Offline. Sales are saved on this phone.':'Online'}${q.length?` · ${q.length} sale(s) waiting to sync`:''}${err?`<br><small>Sync problem: ${esc(err.error)}</small>`:''}</span>${q.length&&navigator.onLine?'<button class="s" onclick="syncQueue()">Sync now</button>':''}</div>`}

// ---------- Branches (Premium) ----------
function shopSwitcher(){return`<label class="lb">Shop</label><select onchange="switchShop(this.value)">${S.members.map(m=>`<option value="${m.shops.id}" ${m.shops.id==S.shop.id?'selected':''}>${esc(m.shops.name)}${m.shops.parent_id?' (branch)':''}</option>`).join('')}</select>`}
function switchShop(id){lsSet('duka:shop:'+S.uid,id);S.tab='sell';S.cart={};S.team=null;S.rep=null;S.per='today';boot()}
async function addBranch(){const n=(prompt('Name of the new branch')||'').trim();if(!n)return;
 const {data,error}=await sb.rpc('create_shop',{p_name:n,p_type:S.shop.type,p_parent:S.shop.id});
 if(error)return alert(error.message);switchShop(data)}
async function editKra(){const v=prompt('KRA PIN (e.g. P051234567X). Leave empty to remove.',S.shop.kra_pin||'');if(v===null)return;
 const pin=v.trim().toUpperCase();if(pin&&!/^[A-Z]\d{9}[A-Z]$/.test(pin))return alert('A KRA PIN looks like P051234567X');
 const {error}=await sb.from('shops').update({kra_pin:pin||null}).eq('id',S.shop.id);if(error)return alert(error.message);
 S.shop.kra_pin=pin||null;const m=S.members.find(x=>x.shops.id==S.shop.id);if(m)m.shops.kra_pin=S.shop.kra_pin;saveCache();render()}
function referralCard(){if(S.role!='owner'||S.shop.is_branch||!S.shop.referral_code)return'';const code=S.shop.referral_code,r=S.refs||{};
 const link=location.origin+location.pathname+'?ref='+code;
 const msg=encodeURIComponent(`I use Duka to track sales, stock and debts in my shop. Try it free for 30 days: ${link} (code ${code})`);
 return`<h3>Invite a shop, get a free month</h3><div class="card"><span class="pn">Your code: ${esc(code)}</span><small>When a shop you invite pays for the first time, you get 1 month free. ${r.signed_up||0} joined · ${r.rewarded||0} free month(s) earned.</small>
 <p><a href="https://wa.me/?text=${msg}" target="_blank" rel="noopener"><button class="s">Share on WhatsApp</button></a></p></div>`}

const TABS={sell:'Sell',stock:'Stock',debts:'Debts',today:'Today',more:'More'};
function go(t){if(t=='admin')return loadAdmin();S.tab=t;render()}
function render(){S.inApp=true;if(S.tab=='admin'&&!S.adm)S.tab='today';
 const tabs=Object.keys(TABS).filter(t=>!(S.role=='staff'&&t=='stock')).concat(S.admin&&!S.offline?['admin']:[]);
 app.innerHTML=`<main>${S.demo?demoBar():''}${statusBar()}${annBar()}${VIEWS[S.tab]()}</main><nav>${tabs.map(t=>`<button class="${S.tab==t?'on':''}" onclick="go('${t}')">${TABS[t]||'Admin'}</button>`).join('')}</nav>`}
