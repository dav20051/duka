// Duka · Getting-started checklist for new owners, shown on Today until done or hidden.
let installPrompt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
addEventListener('appinstalled', () => { lsSet('duka:installed', '1'); if (S.inApp) render(); });
const isInstalled = () => lsGet('duka:installed') === '1' || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function onboardingSteps() {
  const sold = (S.sales || []).length > 0 || (S.rep && +S.rep.sales_count > 0);
  return [
    { k: 'products', done: (S.products || []).length >= 5, t: 'Add at least 5 products', d: 'Pick common items or type a list. It takes a few minutes.', b: '⚡ Quick add', f: "go('stock');setTimeout(()=>quickAdd(),50)" },
    { k: 'sale', done: sold, t: 'Make your first sale', d: 'Tap a product on Sell, then Sell. You get a receipt.', b: 'Go to Sell', f: "go('sell')" },
    { k: 'pay', done: !!(S.shop && S.shop.pay_number), t: 'Set how customers pay you', d: 'Your Till or Paybill appears on receipts and debt reminders.', b: 'Set M-Pesa', f: 'shopForm()' },
    { k: 'customer', done: (S.customers || []).length > 0, t: 'Add a customer who buys on credit', d: 'Never forget who owes you again.', b: '+ Customer', f: "go('debts');setTimeout(()=>customerForm(),50)" },
    { k: 'install', done: isInstalled(), t: 'Put Duka on your home screen', d: 'Opens like an app and works without internet.', b: 'Install', f: 'installApp()' },
  ];
}
function onboardingCard() {
  if (S.role != 'owner' || S.demo || lsGet('duka:onb-hide:' + S.shop.id)) return '';
  const st = onboardingSteps(), n = st.filter((x) => x.done).length;
  if (n == st.length) {
    if (lsGet('duka:onb-done:' + S.shop.id)) return '';
    lsSet('duka:onb-done:' + S.shop.id, '1');
    return `<div class="card" style="margin-bottom:10px"><span class="pn">🎉 Your shop is all set up!</span><small>Tip: count the cash every evening and do a stock-take every week.</small></div>`;
  }
  return `<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center"><span class="pn">Get started · ${n} of ${st.length} done</span><button class="s" onclick="lsSet('duka:onb-hide:'+S.shop.id,'1');render()">Hide</button></div>
  <div class="mix" style="margin:8px 0"><i style="width:${Math.round(n / st.length * 100)}%;background:var(--accent)"></i></div>
  ${st.map((x) => `<div class="row" style="margin:4px 0;padding:8px 10px"><div>${x.done ? '✅' : '⬜'} ${x.t}${x.done ? '' : `<small>${x.d}</small>`}</div>${x.done ? '' : `<button class="s" onclick="${x.f}">${x.b}</button>`}</div>`).join('')}</div>`;
}
async function installApp() {
  if (installPrompt) { installPrompt.prompt(); const r = await installPrompt.userChoice.catch(() => null); installPrompt = null; if (r && r.outcome == 'accepted') { lsSet('duka:installed', '1'); render(); } return; }
  const ios = /iphone|ipad/i.test(navigator.userAgent);
  alert(ios ? 'On iPhone: tap the Share button at the bottom of Safari, then "Add to Home Screen".' : 'In Chrome: tap the ⋮ menu at the top right, then "Install app" or "Add to Home screen".');
}
