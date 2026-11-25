// Duka · Simple mode, the Simple/Full switch and the "How do I…?" help.
// Simple mode keeps only the everyday screens; nothing is deleted, Full mode shows every tool again.

// Today in Simple mode: four big numbers.
function simpleCards(R) {
  const moneyIn = r2(+R.cash_sales + +R.mpesa_sales + +R.debt_cash + +R.debt_mpesa);
  const profitCard = reports() && S.role == 'owner'
    ? `<div class="card">Profit today<b>${kes(r2(R.gross_profit))}</b><small>sales minus buying price</small></div>`
    : `<div class="card">New debt<b>${kes(R.new_debt)}</b><small>given on credit today</small></div>`;
  return `<div class="big4">
  <div class="card">Sales today<b>${kes(R.sales_total)}</b><small>${R.sales_count} sale(s)</small></div>
  <div class="card">Money in<b>${kes(moneyIn)}</b><small>cash and M-Pesa</small></div>
  <div class="card">Owed to you<b>${kes(owed())}</b><small>${debtors()} customer(s)</small></div>
  ${profitCard}</div>`;
}

// Owner's switch in More → Settings
function modeRow() {
  const simple = isSimple();
  return `<div class="row"><div>${simple ? 'Simple mode' : 'Full mode'}<small>${simple
    ? 'Only the everyday screens. Switch to Full for expenses, cash check, stock-take, suppliers, Excel and reports by week or month.'
    : 'Every tool is shown. Switch to Simple to keep only selling, stock and debts.'}</small></div>
  <button class="s" onclick="setMode('${simple ? 'full' : 'simple'}')">${simple ? 'Show all tools' : 'Make it simple'}</button></div>`;
}
async function setMode(m) {
  if (S.role != 'owner') return;
  const { error } = await sb.from('shops').update({ ui_mode: m }).eq('id', S.shop.id);
  if (error) return alert(error.message);
  S.shop.ui_mode = m; const mm = (S.members || []).find((x) => x.shops.id == S.shop.id); if (mm) mm.shops.ui_mode = m;
  if (m == 'simple') { S.per = 'today'; S.dmode = 'cust'; }
  try { await loadReport(); } catch (e) { /* offline: keep what we have */ }
  saveCache(); render(); toast(m == 'simple' ? '✓ Simple mode' : '✓ All tools shown');
}

// "How do I…?" — short answers with a button that opens the right screen
const HELP = [
  ['How do I sell something?', 'Go to Sell, tap the product, then tap the big Sell button. A receipt appears.', 'Go to Sell', "go('sell')"],
  ['How do I sell on credit (debt)?', 'On Sell, choose Debt under the cart, pick the customer (or + New customer), then Sell. Type what they paid now, or 0.', 'Go to Sell', "go('sell')"],
  ['A customer paid their debt. What do I do?', 'Go to Debts, find the customer, tap Paid and enter the amount. You can send them a receipt on WhatsApp.', 'Go to Debts', "go('debts')"],
  ['How do I add my products?', 'Go to Stock and tap ⚡ Quick add. Pick common items and type the selling price, or type a list like an SMS.', 'Quick add', "go('stock');setTimeout(()=>quickAdd(),50)"],
  ['New goods arrived. How do I add them?', 'Go to Stock, find the product and tap + Stock. Type how many came and the new buying price if it changed.', 'Go to Stock', "go('stock')"],
  ['How do I send a receipt?', 'After every sale a receipt appears with a WhatsApp button. For older sales, go to Today, Recent sales, and tap Receipt.', 'Go to Today', "go('today')"],
  ['I made a mistake on a sale.', 'Go to Today, Recent sales, and tap Void on that sale. The stock goes back. Then sell again correctly.', 'Go to Today', "go('today')"],
  ['How do I add a staff member?', 'Owners: in More, under Staff, type their email and tap Add staff. They create their own account with that email.', '', ''],
  ['Does it work without internet?', 'Yes. Keep selling; sales are saved on the phone and sent when the network comes back.', '', ''],
  ['How do I pay for Duka?', 'In More, tap Renew / upgrade, choose a plan and follow the M-Pesa steps.', 'See plans', 'showPlans()'],
];
function helpSection() {
  return `<h3>How do I…?</h3>${HELP.map(([q, a, b, f]) => `<details class="card" style="margin:6px 0"><summary>${q}</summary><p class="lb" style="margin:8px 0 0">${a}</p>${b && (S.role == 'owner' || !/stock|showPlans/i.test(f)) ? `<p style="margin:8px 0 0"><button class="s" onclick="${f}">${b}</button></p>` : ''}</details>`).join('')}
  <p><a href="https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent('Hello Duka, I need help with: ')}" target="_blank" rel="noopener"><button class="s">💬 Ask us on WhatsApp</button></a></p>`;
}
