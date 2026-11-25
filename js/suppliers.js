// Duka · Suppliers (owner only): what the shop owes its wholesalers.
// Deliveries can be linked to a supplier with what was paid on the spot; the rest is owed.
const activeSuppliers = () => (S.suppliers || []).filter((x) => x.active !== false).sort((a, b) => a.name.localeCompare(b.name));
const supplierOwed = () => r2((S.suppliers || []).reduce((a, x) => a + Math.max(0, +x.owed), 0));

function supplierView() {
  const L = (S.suppliers || []).filter((x) => x.active !== false || +x.owed > 0).sort((a, b) => b.owed - a.owed || a.name.localeCompare(b.name));
  return `<div class="tools"><button class="p" onclick="supplierForm()">+ Add supplier</button></div>
  <div class="card"><span>You owe suppliers</span><b>${kes(supplierOwed())}</b><small>${L.filter((x) => +x.owed > 0).length} supplier(s)</small></div>
  <p class="lb">Link deliveries to a supplier in Stock → + Stock, or record a purchase here. Pay suppliers from here.</p>
  ${L.map((x) => `<div class="row tap" onclick="supplierPage('${x.supplier_id}')"><div>${esc(x.name)}<small>${+x.owed > 0 ? 'you owe ' + kes(x.owed) : +x.owed < 0 ? 'paid ahead ' + kes(-x.owed) : 'nothing owed'}${x.phone ? ' · ' + esc(x.phone) : ''}${x.last_purchase_at ? ' · last delivery ' + dLabel(String(x.last_purchase_at).slice(0, 10)) : ''}</small></div>
   <div onclick="event.stopPropagation()">${+x.owed > 0 ? `<button class="s" onclick="paySupplier('${x.supplier_id}')">Pay</button>` : ''}</div></div>`).join('') || '<p>No suppliers yet.</p>'}`;
}

function supplierForm(id, cb) {
  const x = id ? S.suppliers.find((s) => s.supplier_id == id) : null; S.sfcb = cb || null; closeEdit();
  document.body.insertAdjacentHTML('beforeend', `<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>${x ? 'Edit supplier' : 'New supplier'}</h3>
  <input id="spn" placeholder="Supplier name, e.g. Kabarnet Wholesalers" maxlength="120" value="${esc(x ? x.name : '')}"><input id="spp" type="tel" placeholder="Phone (optional)" value="${esc((x && x.phone) || '')}">
  <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="saveSupplier(${x ? `'${x.supplier_id}'` : 'null'},this)">Save</button></div></div></div>`);
  setTimeout(() => $('#spn') && $('#spn').focus(), 50);
}
async function saveSupplier(id, btn) {
  const n = $('#spn').value.trim(); if (!n) return alert('Enter the supplier name');
  const row = { name: n, phone: $('#spp').value.trim() || null }; btn.disabled = true; let newId = id;
  if (id) { const { error } = await sb.from('suppliers').update(row).eq('id', id); if (error) { btn.disabled = false; return alert(error.message); } }
  else { const { data, error } = await sb.from('suppliers').insert({ ...row, shop_id: S.shop.id }).select('id').single(); if (error) { btn.disabled = false; return alert(error.message); } newId = data.id; }
  const cb = S.sfcb; S.sfcb = null; closeEdit(); await load(); saveCache(); if (cb) cb(newId); else render();
}
async function removeSupplier(id) {
  const x = S.suppliers.find((s) => s.supplier_id == id);
  if (+x.owed > 0) return alert(`You still owe ${x.name} ${kes(x.owed)}. Record the payment first.`);
  if (!confirm(`Remove ${x.name} from your list? Their history is kept.`)) return;
  const { error } = await sb.from('suppliers').update({ active: false }).eq('id', id); if (error) return alert(error.message);
  closeEdit(); await load(); saveCache(); render();
}

function paySupplier(id) {
  const x = S.suppliers.find((s) => s.supplier_id == id); S.spm = 'cash'; closeEdit();
  document.body.insertAdjacentHTML('beforeend', `<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>Pay · ${esc(x.name)}</h3><p class="lb">You owe ${kes(x.owed)}</p>
  <label class="lb">Amount paid</label><div class="ib"><input id="spa" type="number" inputmode="numeric" step="any">${+x.owed > 0 ? `<button class="s" onclick="$('#spa').value=${+x.owed}">All ${kes(x.owed)}</button>` : ''}</div>
  <label class="lb">Paid from</label><select id="spf" onchange="$('#spc').style.display=this.value=='mpesa'?'':'none'"><option value="cash">Cash drawer</option><option value="mpesa">M-Pesa</option><option value="bank">Bank</option><option value="other">Other / own pocket</option></select>
  <input id="spc" placeholder="M-Pesa code (optional)" style="display:none;text-transform:uppercase"><input id="spt" placeholder="Note (optional)">
  <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="saveSupplierPay('${id}',this)">Save payment</button></div></div></div>`);
}
async function saveSupplierPay(id, btn) {
  const a = +$('#spa').value; if (!(a > 0)) return alert('Enter the amount paid'); btn.disabled = true;
  const m = $('#spf').value;
  const { error } = await sb.from('supplier_payments').insert({ shop_id: S.shop.id, supplier_id: id, amount: a, method: m, mpesa_code: m == 'mpesa' ? ($('#spc').value.trim().toUpperCase() || null) : null, note: $('#spt').value.trim() || null });
  if (error) { btn.disabled = false; return alert(error.message); }
  closeEdit(); await load(); saveCache(); render(); toast('✓ Payment saved');
}

// A purchase that is not linked to one product (e.g. a mixed invoice)
function purchaseForm(id) {
  const x = S.suppliers.find((s) => s.supplier_id == id); closeEdit();
  document.body.insertAdjacentHTML('beforeend', `<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet"><h3>Purchase · ${esc(x.name)}</h3>
  <p class="lb">For goods bought on one invoice. To add stock to a product, use Stock → + Stock instead.</p>
  <input id="pud" placeholder="What did you buy? e.g. Invoice 123, mixed goods" maxlength="200"><input id="put" type="number" inputmode="numeric" step="any" placeholder="Total cost (KES)">
  <input id="pup" type="number" inputmode="numeric" step="any" placeholder="Paid now (KES), 0 if nothing">
  <label class="lb">Paid from</label><select id="puf"><option value="cash">Cash drawer</option><option value="mpesa">M-Pesa</option><option value="bank">Bank</option><option value="other">Other / own pocket</option></select>
  <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="savePurchase('${id}',this)">Save purchase</button></div></div></div>`);
}
async function savePurchase(id, btn) {
  const t = +$('#put').value, p = Math.min(t, Math.max(0, +$('#pup').value || 0)), d = $('#pud').value.trim();
  if (!d) return alert('Write what you bought'); if (!(t > 0)) return alert('Enter the total cost');
  btn.disabled = true;
  const { error } = await sb.from('purchases').insert({ shop_id: S.shop.id, supplier_id: id, description: d, total: t, paid: p, paid_from: $('#puf').value });
  if (error) { btn.disabled = false; return alert(error.message); }
  closeEdit(); await load(); saveCache(); render(); toast('✓ Purchase saved');
}

async function supplierPage(id) {
  const x = S.suppliers.find((s) => s.supplier_id == id); if (!x) return;
  const [p, q] = await Promise.all([
    sb.from('purchases').select('id,created_at,description,qty,total,paid,paid_from').eq('supplier_id', id).order('created_at', { ascending: false }).limit(200),
    sb.from('supplier_payments').select('id,created_at,amount,method,mpesa_code,note').eq('supplier_id', id).order('created_at', { ascending: false }).limit(200)]);
  if (p.error || q.error) return alert((p.error || q.error).message);
  const H = [...(p.data || []).map((v) => ({ t: v.created_at, k: 'buy', v })), ...(q.data || []).map((v) => ({ t: v.created_at, k: 'pay', v }))].sort((a, b) => (a.t < b.t ? -1 : 1));
  let bal = 0; H.forEach((h) => { bal += h.k == 'buy' ? +h.v.total - +h.v.paid : -h.v.amount; h.bal = r2(bal); });
  const d = (t) => dLabel(new Date(t).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }));
  closeEdit();
  document.body.insertAdjacentHTML('beforeend', `<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet" style="max-height:96vh">
  <h3>${esc(x.name)}</h3><p class="lb">${x.phone ? `<a href="tel:${esc(x.phone)}">${esc(x.phone)}</a>` : 'No phone'}</p>
  <div class="card"><span>${+x.owed < 0 ? 'Paid ahead' : 'You owe'}</span><b>${kes(Math.abs(x.owed))}</b></div>
  <div class="tools">${+x.owed > 0 ? `<button class="p" onclick="paySupplier('${id}')">💵 Pay</button>` : ''}<button class="s" onclick="purchaseForm('${id}')">+ Purchase</button>${x.phone ? `<a href="https://wa.me/${waNum(x.phone)}" target="_blank" rel="noopener"><button class="s">💬 WhatsApp</button></a>` : ''}<button class="s" onclick="supplierForm('${id}')">✏️ Edit</button><button class="s" onclick="removeSupplier('${id}')">Remove</button></div>
  <h3>History</h3>${H.length ? [...H].reverse().map((h) => h.k == 'buy'
    ? `<div class="row"><div>${d(h.t)} · ${esc(h.v.description || 'Purchase')}${h.v.qty ? ' ×' + fq(h.v.qty) : ''}<small>Bought ${kes(h.v.total)}${+h.v.paid ? ` · paid ${kes(h.v.paid)} now` : ''}</small></div><small>owed ${kes(h.bal)}</small></div>`
    : `<div class="row"><div>${d(h.t)} · Paid <b>${kes(h.v.amount)}</b><small>${esc({ cash: 'Cash', mpesa: 'M-Pesa', bank: 'Bank', other: 'Other' }[h.v.method] || h.v.method)}${h.v.mpesa_code ? ' ' + esc(h.v.mpesa_code) : ''}${h.v.note ? ' · ' + esc(h.v.note) : ''}</small></div><small>owed ${kes(h.bal)}</small></div>`).join('') : '<p>No history yet.</p>'}
  <p><button onclick="closeEdit()" style="width:100%">Close</button></p></div></div>`);
}

// Delivery form: optional supplier and what was paid now
function deliverySupplierFields() {
  if (S.role != 'owner' || isSimple()) return '';
  return `<label class="lb">Supplier (optional)</label><select id="rsu" onchange="if(this.value=='__new'){this.value='';supplierForm(null,id=>{const p=S.rsp;restock(p.id);setTimeout(()=>{$('#rsu').value=id;rsSup()},60)})}else rsSup()">
   <option value="">No supplier</option><option value="__new">+ New supplier</option>${activeSuppliers().map((x) => `<option value="${x.supplier_id}">${esc(x.name)}</option>`).join('')}</select>
  <div id="rsp" style="display:none"><div class="g"><div><label class="lb">Paid now (KES)</label><input id="rpa" type="number" inputmode="numeric" step="any" placeholder="All of it"></div>
   <div><label class="lb">Paid from</label><select id="rpf"><option value="cash">Cash drawer</option><option value="mpesa">M-Pesa</option><option value="bank">Bank</option><option value="other">Other / own pocket</option></select></div></div>
   <p class="lb">Leave "Paid now" empty if you paid in full. Anything not paid is added to what you owe this supplier.</p></div>`;
}
function rsSup() { const v = $('#rsu') && $('#rsu').value; const b = $('#rsp'); if (b) b.style.display = v ? '' : 'none'; }
