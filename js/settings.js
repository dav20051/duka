// Duka · More tab, permissions, account; offline guards; start-up.
// Plain browser script: loaded in order by index.html and shares the page's global scope.
// ---------- More tab: shop settings, permissions, account ----------
const can=k=>S.role=='owner'||(S.perms?!!S.perms[k]:k!='discount');
const footer=()=>S.shop&&S.shop.receipt_footer||'Asante! Thank you.';
function payLine(){const h=S.shop||{};if(!h.pay_number)return'';
 return h.pay_type=='till'?`Pay via M-Pesa: Till ${h.pay_number}`:h.pay_type=='paybill'?`Pay via M-Pesa: Paybill ${h.pay_number}${h.pay_account?', Account '+h.pay_account:''}`:`Pay via M-Pesa: send to ${h.pay_number}`}
function shopForm(){const h=S.shop;closeEdit();document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>Shop details</h3>
 <label class="lb">Shop name</label><input id="sfn" value="${esc(h.name)}" maxlength="120"><label class="lb">Shop phone</label><input id="sfp" type="tel" value="${esc(h.phone||'')}" maxlength="30">
 <label class="lb">How customers pay you by M-Pesa</label><select id="sft" onchange="$('#sfa').style.display=this.value=='paybill'?'':'none';$('#sfnw').style.display=this.value?'':'none'">
  <option value="">Not set</option><option value="till" ${h.pay_type=='till'?'selected':''}>Till number (Buy Goods)</option><option value="paybill" ${h.pay_type=='paybill'?'selected':''}>Paybill</option><option value="phone" ${h.pay_type=='phone'?'selected':''}>Send Money to a phone</option></select>
 <div id="sfnw" style="${h.pay_type?'':'display:none'}"><input id="sfm" inputmode="numeric" placeholder="Number" value="${esc(h.pay_number||'')}"><input id="sfa" placeholder="Account number (Paybill)" value="${esc(h.pay_account||'')}" style="${h.pay_type=='paybill'?'':'display:none'}"></div>
 <label class="lb">Message at the bottom of receipts</label><input id="sff" maxlength="200" placeholder="Asante! Thank you." value="${esc(h.receipt_footer||'')}">
 <label class="lb">KRA PIN (printed on receipts)</label><input id="sfk" placeholder="P051234567X" value="${esc(h.kra_pin||'')}" style="text-transform:uppercase">
 <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="saveShop(this)">Save</button></div></div></div>`)}
async function saveShop(btn){const n=$('#sfn').value.trim(),t=$('#sft').value,num=$('#sfm').value.replace(/\D/g,''),k=$('#sfk').value.trim().toUpperCase();
 if(!n)return alert('Enter the shop name');if(t&&!/^\d{5,12}$/.test(num))return alert('Enter the M-Pesa number (5 to 12 digits)');
 if(k&&!/^[A-Z]\d{9}[A-Z]$/.test(k))return alert('A KRA PIN looks like P051234567X');
 const u={name:n,phone:$('#sfp').value.trim()||null,pay_type:t||null,pay_number:t?num:null,pay_account:t=='paybill'?($('#sfa').value.trim()||null):null,receipt_footer:$('#sff').value.trim()||null,kra_pin:k||null};
 btn.disabled=true;const {error}=await sb.from('shops').update(u).eq('id',S.shop.id);if(error){btn.disabled=false;return alert(error.message)}
 Object.assign(S.shop,u);const m=(S.members||[]).find(x=>x.shops.id==S.shop.id);if(m)Object.assign(m.shops,u);saveCache();closeEdit();render();toast('✓ Saved')}
function testPrint(){showReceipt({id:'TEST0000-0000',test:true,created_at:new Date().toISOString(),total:360,paid:360,method:'cash',
 sale_items:[{name:'Sugar',qty:1,unit_price:180},{name:'Bread',qty:3,unit_price:60}]});setTimeout(()=>window.print(),300)}
const PERMS=[['credit','Sell on credit (debt)'],['void','Void sales from the last 30 minutes'],['expenses','Record expenses'],['discount','Change prices / give discounts']];
const permSummary=p=>{p=p||{};const on=PERMS.filter(([k])=>p[k]!==undefined?p[k]:k!='discount').length;return on==PERMS.length?'full access':on+' of '+PERMS.length+' permissions'};
function permForm(id){const i=S.invites.find(x=>x.id==id),p=i.perms||{};closeEdit();
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>Permissions · ${esc(i.email)}</h3>
 <p class="lb">Every staff member can sell for cash or M-Pesa, record debt payments and count the cash. They never see profit or change products.</p>
 ${PERMS.map(([k,l])=>`<label class="row" style="cursor:pointer"><span>${l}</span><input type="checkbox" id="pm_${k}" style="width:22px;height:22px;margin:0" ${(p[k]!==undefined?p[k]:k!='discount')?'checked':''}></label>`).join('')}
 <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="savePerms('${id}',this)">Save</button></div></div></div>`)}
async function savePerms(id,btn){const perms={};PERMS.forEach(([k])=>perms[k]=$('#pm_'+k).checked);btn.disabled=true;
 const {error}=await sb.from('staff_invites').update({perms}).eq('id',id);if(error){btn.disabled=false;return alert(error.message)}closeEdit();await load();saveCache();render();toast('✓ Permissions saved')}
function pwForm(){closeEdit();document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>Change password</h3>
 <input id="pw0" type="password" placeholder="Current password" autocomplete="current-password"><input id="pw1" type="password" placeholder="New password (8+ characters)" autocomplete="new-password"><input id="pw2" type="password" placeholder="Repeat new password" autocomplete="new-password">
 <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="savePw(this)">Save password</button></div></div></div>`)}
async function savePw(btn){const a=$('#pw0').value,b=$('#pw1').value;if(b.length<8)return alert('Use 8 or more characters');if(b!==$('#pw2').value)return alert('The new passwords do not match');
 btn.disabled=true;const chk=await sb.auth.signInWithPassword({email:S.email,password:a});if(chk.error){btn.disabled=false;return alert('Your current password is not correct')}
 const {error}=await sb.auth.updateUser({password:b});btn.disabled=false;if(error)return alert(error.message);closeEdit();alert('Password changed ✔')}
async function payHistory(){const {data,error}=await sb.rpc('my_subscription_payments',{p_shop:S.shop.id});if(error)return alert(error.message);closeEdit();
 const src={manual:'recorded by Duka',mpesa_stk:'M-Pesa (automatic)'};
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>Subscription payments</h3>
 ${(data||[]).map(p=>`<div class="row"><div>${dLabel(String(p.paid_on).slice(0,10))} · ${esc(planName(p.plan))}<small>${p.days} days${p.mpesa_code?' · '+esc(p.mpesa_code):''} · ${src[p.source]||esc(p.source)} · paid until ${esc(p.paid_until)}</small></div><b>${p.amount!=null?kes(p.amount):''}</b></div>`).join('')||'<p>No payments yet.</p>'}
 <p><button onclick="closeEdit()" style="width:100%">Close</button></p></div></div>`)}
function deleteZone(){const d=S.shop.deletion_requested_at;
 return`<h3>Delete my shop</h3><div class="card">${d?`<span class="pn">Deletion requested on ${dLabel(String(d).slice(0,10))}</span><small>We will delete your shop and all its data within 30 days. Changed your mind?</small><p><button class="s" onclick="reqDelete(true)">Cancel the request</button></p>`
 :`<small>Ask us to permanently delete this shop and all its records (sales, stock, customers, debts). Download your data first: this cannot be undone.</small><p><button class="s" style="color:var(--rose);border-color:var(--rose)" onclick="reqDelete(false)">Ask to delete my shop</button></p>`}</div>`}
async function reqDelete(cancel){if(!cancel){const t=prompt(`To confirm, type the shop name: ${S.shop.name}`);if(t===null)return;if(t.trim().toLowerCase()!=S.shop.name.trim().toLowerCase())return alert('The name does not match. Nothing was changed.')}
 const {data,error}=await sb.rpc('request_shop_deletion',{p_shop:S.shop.id,p_cancel:!!cancel});if(error)return alert(error.message);
 S.shop.deletion_requested_at=data;saveCache();render();alert(cancel?'Request cancelled. Your shop stays.':'Request sent. We will delete your shop within 30 days. You can cancel before then.')}
async function adminDelete(id){const s=S.adm.find(x=>x.id==id);if(prompt(`Permanently delete "${s.name}" and ALL its data? Type DELETE to confirm.`)!=='DELETE')return;
 const {error}=await sb.rpc('admin_delete_shop',{p_shop:id});if(error)return alert(error.message);alert('Shop deleted.');loadAdmin()}

// Actions that change records other than sales need the internet; sales work offline.
['saveSupplier','saveSupplierPay','savePurchase','supplierPage','removeSupplier','adminGift','adminReverse','adminPayAgent','adminSwitch','adminSaveAnn','adminTab','saveShop','savePerms','savePw','payHistory','reqDelete','adminDelete','saveExpense','deleteExpense','saveCount','cashCount','addProduct','restock','saveRestock','showImport','runImport','stkApply','saveCustomer','savePayment','customerView','removeCustomer','saveEdit','removeProduct','invite','rmStaff','voidSale','createShop','editKra','addBranch','sendSms','payStk','exportData','loadAdmin','showPlans']
 .forEach(n=>{const f=window[n];if(typeof f!='function')return;window[n]=function(...a){if(!navigator.onLine)return alert('You are offline. This needs internet. Selling still works offline.');return f.apply(this,a)}});
if('serviceWorker' in navigator){
 addEventListener('load',()=>navigator.serviceWorker.register('sw.js').then(reg=>setInterval(()=>reg.update().catch(()=>{}),30*60e3)).catch(()=>{}));
 let hadController=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!hadController){hadController=true;return}
  const busy=Object.keys(S.cart||{}).length||document.querySelector('.modal');
  if(!busy)location.reload();else S.updateReady=true})}
setInterval(()=>{if(S.updateReady&&!Object.keys(S.cart||{}).length&&!document.querySelector('.modal'))location.reload()},15000);

boot();
