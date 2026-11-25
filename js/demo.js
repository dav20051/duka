// Duka · Demo shop: a full sample shop that runs only in this browser tab.
// Nothing is sent to the database and nothing is saved; closing the page ends the demo.
const DEMO_SHOP_ID = 'demo-shop';
const nbDate = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));

function demoData() {
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const now = Date.now(), sid = DEMO_SHOP_ID, ago = (d, h = 0) => new Date(now - d * 864e5 - h * 36e5).toISOString();
  const P = [['Sugar', '', 'kg', 150, 180, 80], ['Maize flour (unga)', '2kg', 'pkt', 140, 165, 60], ['Cooking oil', '1L', 'bottle', 280, 320, 40], ['Rice', '', 'kg', 120, 150, 70],
    ['Bread', '400g', 'pc', 55, 65, 30], ['Milk', '500ml', 'pkt', 50, 60, 40], ['Tea leaves', '100g', 'pkt', 45, 55, 35], ['Salt', '1kg', 'pkt', 25, 30, 4],
    ['Bar soap', '', 'pc', 90, 110, 30], ['Washing powder', '500g', 'pkt', 120, 140, 25], ['Matches', '', 'pkt', 3, 5, 100], ['Eggs', '', 'pc', 13, 16, 90],
    ['Soda', '500ml', 'bottle', 50, 60, 48], ['Toothpaste', '', 'pc', 85, 100, 3], ['Candles', '', 'pc', 15, 20, 50], ['Margarine', '250g', 'pc', 95, 115, 20]];
  const products = P.map(([name, variant, unit, b, s, q]) => ({ id: uid(), shop_id: sid, name, variant: variant || null, unit, buy_price: b, sell_price: s, stock_qty: q + 40, low_stock_at: 8, active: true, category: null, sku: null, expiry: null, created_at: ago(20) }));
  const customers = [['Jane Wanjiku', '0712345678', 3000], ['Kiprop', '0722000111', null], ['Achieng', '0733444555', 1500], ['Mzee Rotich', '0711222333', null]]
    .map(([name, phone, lim], i) => ({ id: uid(), shop_id: sid, name, phone, credit_limit: lim, active: true, created_at: ago(30 - i) }));
  const sales = [], sale_items = [], debt_payments = [], expenses = [], stock_movements = [];
  for (let d = 13; d >= 0; d--) {
    const hoursNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })).getHours();
    const n = 6 + Math.floor(rnd() * 8);
    for (let k = 0; k < n; k++) {
      const hour = 8 + Math.floor(rnd() * 12); if (d === 0 && hour >= hoursNow) continue;
      const at = new Date(new Date(nbDate(ago(d)) + 'T00:00:00+03:00').getTime() + hour * 36e5 + Math.floor(rnd() * 3600e3)).toISOString();
      const id = uid(), lines = 1 + Math.floor(rnd() * 3); let total = 0; const its = [];
      for (let l = 0; l < lines; l++) {
        const p = pick(products), qty = p.unit == 'kg' ? pick([0.5, 1, 1, 2]) : 1 + Math.floor(rnd() * 3);
        its.push({ id: uid(), sale_id: id, shop_id: sid, product_id: p.id, name: p.name + (p.variant ? ' · ' + p.variant : ''), qty, unit_price: p.sell_price, unit_cost: p.buy_price });
        total += qty * p.sell_price; p.stock_qty = Math.max(0, p.stock_qty - qty);
      }
      const r = rnd(), method = r < 0.55 ? 'cash' : r < 0.88 ? 'mpesa' : 'debt';
      const cust = method == 'debt' ? pick(customers) : null;
      sales.push({ id, shop_id: sid, customer_id: cust ? cust.id : null, total, paid: method == 'debt' ? 0 : total, method, mpesa_code: method == 'mpesa' ? 'S' + Math.random().toString(36).slice(2, 11).toUpperCase() : null, created_by: 'demo', created_at: at, voided: false });
      sale_items.push(...its);
    }
    if (d % 3 === 0) expenses.push({ id: uid(), shop_id: sid, category: 'Transport', label: 'Boda to wholesaler', amount: 200, paid_from: 'cash', spent_on: nbDate(ago(d)), created_at: ago(d) });
  }
  // Products the demo shows as running low
  products.find((p) => p.name == 'Salt').stock_qty = 4; products.find((p) => p.name == 'Toothpaste').stock_qty = 3;
  expenses.push({ id: uid(), shop_id: sid, category: 'Electricity', label: 'Tokens', amount: 1000, paid_from: 'mpesa', spent_on: nbDate(ago(6)), created_at: ago(6) });
  const jane = customers[0];
  debt_payments.push({ id: uid(), shop_id: sid, customer_id: jane.id, amount: 300, method: 'mpesa', mpesa_code: 'SKL2DEMO1', created_at: ago(2) });
  const supplier = { id: uid(), shop_id: sid, name: 'Kabarnet Wholesalers', phone: '0722000000', active: true, created_at: ago(15) };
  return {
    products, customers, sales, sale_items, debt_payments, expenses, stock_movements,
    cash_counts: [{ id: uid(), shop_id: sid, day: nbDate(ago(1)), opening_float: 1000, expected: 6250, counted: 6200, difference: -50, note: null, counted_by: 'demo', created_at: ago(1, -8) }],
    staff_invites: [{ id: uid(), shop_id: sid, email: 'mary@example.com', user_id: 'demo-staff', perms: { credit: true, void: true, expenses: true, discount: false }, created_at: ago(10) }],
    suppliers: [supplier],
    purchases: [{ id: uid(), shop_id: sid, supplier_id: supplier.id, product_id: null, description: 'Invoice 2041, mixed goods', qty: null, total: 15000, paid: 10000, paid_from: 'mpesa', created_at: ago(10) }],
    supplier_payments: [{ id: uid(), shop_id: sid, supplier_id: supplier.id, amount: 2000, method: 'cash', mpesa_code: null, note: null, created_at: ago(4) }],
  };
}

function demoBackend(db) {
  const balance = (c) => {
    const s = db.sales.filter((x) => x.customer_id == c.id && !x.voided), pd = db.debt_payments.filter((p) => p.customer_id == c.id).reduce((a, p) => a + +p.amount, 0);
    let cum = 0, oldest = null; for (const x of [...s].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))) { if (x.total <= x.paid) continue; cum += x.total - x.paid; if (cum > pd && !oldest) oldest = x.created_at; }
    const lp = db.debt_payments.filter((p) => p.customer_id == c.id).map((p) => p.created_at).sort().pop() || null;
    return { customer_id: c.id, shop_id: c.shop_id, name: c.name, phone: c.phone, balance: r2(s.reduce((a, x) => a + x.total - x.paid, 0) - pd), credit_limit: c.credit_limit, active: c.active, created_at: c.created_at, oldest_unpaid_at: oldest, last_payment_at: lp };
  };
  const views = {
    customer_balances: () => db.customers.map(balance),
    supplier_balances: () => db.suppliers.map((x) => ({ supplier_id: x.id, shop_id: x.shop_id, name: x.name, phone: x.phone, active: x.active, created_at: x.created_at,
      owed: r2(db.purchases.filter((p) => p.supplier_id == x.id).reduce((a, p) => a + p.total - p.paid, 0) - db.supplier_payments.filter((p) => p.supplier_id == x.id).reduce((a, p) => a + +p.amount, 0)),
      last_purchase_at: db.purchases.filter((p) => p.supplier_id == x.id).map((p) => p.created_at).sort().pop() || null })),
    daily_summary: () => {
      const m = {}; db.sales.filter((s) => !s.voided).forEach((s) => {
        const day = nbDate(s.created_at), x = (m[day] = m[day] || { shop_id: DEMO_SHOP_ID, day, sales_total: 0, cash_in: 0, new_debt: 0, profit_estimate: 0 });
        x.sales_total += +s.total; x.cash_in += +s.paid; x.new_debt += s.total - s.paid;
        db.sale_items.filter((i) => i.sale_id == s.id).forEach((i) => (x.profit_estimate += i.qty * (i.unit_price - i.unit_cost)));
      }); return Object.values(m);
    },
  };
  const DEFAULTS = { products: { active: true, low_stock_at: 5, category: null, variant: null, sku: null, expiry: null }, customers: { active: true, credit_limit: null },
    suppliers: { active: true }, sales: { voided: false }, expenses: { paid_from: 'cash' }, staff_invites: { user_id: null, perms: { credit: true, void: true, expenses: true, discount: false } } };
  function query(table) {
    const st = { op: 'select', f: [], ord: [], lim: null, rng: null, single: false, sel: '', p: null };
    const api = {
      select(c) { if (st.op == 'select') st.sel = c || ''; return api; },
      eq(c, v) { st.f.push((r) => r[c] == v); return api; }, gte(c, v) { st.f.push((r) => String(r[c]) >= v); return api; }, lte(c, v) { st.f.push((r) => String(r[c]) <= v); return api; },
      order(c, o) { st.ord.push([c, !o || o.ascending !== false]); return api; }, limit(n) { st.lim = n; return api; }, range(a, b) { st.rng = [a, b]; return api; }, single() { st.single = true; return api; },
      insert(r) { st.op = 'insert'; st.p = [].concat(r); return api; }, update(u) { st.op = 'update'; st.p = u; return api; }, delete() { st.op = 'delete'; return api; },
      then(res, rej) { return Promise.resolve().then(() => run(table, st)).then(res, rej); },
    };
    return api;
  }
  function run(table, st) {
    const ok = (data) => ({ data, error: null }), match = (r) => st.f.every((fn) => fn(r));
    if (st.op == 'insert') {
      const rows = st.p.map((r) => ({ id: uid(), created_at: new Date().toISOString(), ...(DEFAULTS[table] || {}), ...r }));
      if (table == 'products' && rows.some((r) => r.sku && db.products.some((p) => p.active && p.sku && p.sku.toLowerCase() == r.sku.toLowerCase()))) return { data: null, error: { message: 'duplicate key value violates unique constraint "products_shop_sku"' } };
      if (table == 'sales' && rows.some((r) => db.sales.some((s) => s.id == r.id))) return { data: null, error: { code: '23505', message: 'duplicate' } };
      if (table == 'cash_counts') rows.forEach((r) => (r.difference = r2(r.counted - r.expected)));
      (db[table] = db[table] || []).push(...rows);
      if (table == 'sale_items') rows.forEach((i) => { const p = db.products.find((x) => x.id == i.product_id); if (p) p.stock_qty = rq(p.stock_qty - i.qty); });
      return ok(st.single ? rows[0] : rows);
    }
    if (st.op == 'update') { (db[table] || []).filter(match).forEach((r) => Object.assign(r, st.p)); return ok(null); }
    if (st.op == 'delete') { db[table] = (db[table] || []).filter((r) => !match(r)); return ok(null); }
    let L = (views[table] ? views[table]() : (db[table] || []).map((r) => ({ ...r }))).filter(match);
    if (table == 'sales' && /sale_items/.test(st.sel)) L.forEach((s) => (s.sale_items = db.sale_items.filter((i) => i.sale_id == s.id)));
    for (const [c, asc] of [...st.ord].reverse()) L.sort((a, b) => ((a[c] ?? '') < (b[c] ?? '') ? (asc ? -1 : 1) : (a[c] ?? '') > (b[c] ?? '') ? (asc ? 1 : -1) : 0));
    if (st.rng) L = L.slice(st.rng[0], st.rng[1] + 1);
    if (st.lim != null) L = L.slice(0, st.lim);
    return ok(st.single ? L[0] || null : L);
  }
  function report(from, to) {
    const inR = (t) => { const d = nbDate(t); return d >= from && d <= to; };
    const s = db.sales.filter((x) => !x.voided && inR(x.created_at)), v = db.sales.filter((x) => x.voided && inR(x.created_at));
    const items = db.sale_items.filter((i) => s.some((x) => x.id == i.sale_id)), d = db.debt_payments.filter((x) => inR(x.created_at));
    const e = db.expenses.filter((x) => x.spent_on >= from && x.spent_on <= to), pu = db.purchases.filter((x) => inR(x.created_at)), sp = db.supplier_payments.filter((x) => inR(x.created_at));
    const sum = (a, f) => r2(a.reduce((t, x) => t + +f(x), 0)), days = {}, staff = {}, top = {};
    s.forEach((x) => { const k = nbDate(x.created_at); days[k] = (days[k] || 0) + +x.total; staff[x.created_by] = staff[x.created_by] || { user: x.created_by, sales: 0, count: 0 }; staff[x.created_by].sales += +x.total; staff[x.created_by].count++; });
    items.forEach((i) => { const t = (top[i.name] = top[i.name] || { name: i.name, qty: 0, revenue: 0, profit: 0 }); t.qty += +i.qty; t.revenue += i.qty * i.unit_price; t.profit += i.qty * (i.unit_price - i.unit_cost); });
    return { from, to, sales_total: sum(s, (x) => x.total), sales_count: s.length, cash_sales: sum(s.filter((x) => x.method != 'mpesa'), (x) => x.paid), mpesa_sales: sum(s.filter((x) => x.method == 'mpesa'), (x) => x.paid),
      new_debt: sum(s, (x) => x.total - x.paid), debt_cash: sum(d.filter((x) => x.method != 'mpesa'), (x) => x.amount), debt_mpesa: sum(d.filter((x) => x.method == 'mpesa'), (x) => x.amount),
      expenses: sum(e, (x) => x.amount), expenses_cash: sum(e.filter((x) => x.paid_from == 'cash'), (x) => x.amount), purchases: sum(pu, (x) => x.total),
      supplier_paid: r2(sum(pu, (x) => x.paid) + sum(sp, (x) => x.amount)), supplier_cash: r2(sum(pu.filter((x) => x.paid_from == 'cash'), (x) => x.paid) + sum(sp.filter((x) => x.method == 'cash'), (x) => x.amount)),
      gross_profit: sum(items, (i) => i.qty * (i.unit_price - i.unit_cost)), voided_count: v.length, voided_total: sum(v, (x) => x.total),
      by_day: Object.entries(days).sort().map(([day, sales]) => ({ day, sales })), by_staff: Object.values(staff).sort((a, b) => b.sales - a.sales),
      top_items: Object.values(top).sort((a, b) => b.revenue - a.revenue).slice(0, 10), expense_by_cat: [] };
  }
  const notInDemo = { data: null, error: { message: 'Not available in the demo. Create your free shop to use this.' } };
  async function rpc(fn, a) {
    switch (fn) {
      case 'shop_report': return { data: report(a.p_from, a.p_to), error: null };
      case 'restock_product': {
        const p = db.products.find((x) => x.id == a.p_product); p.stock_qty = rq(+p.stock_qty + +a.p_qty);
        if (a.p_buy != null) p.buy_price = a.p_buy; if (a.p_sell != null) p.sell_price = a.p_sell; if (a.p_expiry) p.expiry = a.p_expiry;
        if (a.p_supplier) { const t = r2(a.p_qty * p.buy_price); db.purchases.push({ id: uid(), shop_id: DEMO_SHOP_ID, supplier_id: a.p_supplier, product_id: p.id, description: p.name, qty: a.p_qty, total: t, paid: Math.min(t, a.p_paid == null ? t : a.p_paid), paid_from: a.p_paid_from || 'cash', created_at: new Date().toISOString() }); }
        return { data: p.stock_qty, error: null };
      }
      case 'apply_stocktake': { let changed = 0, vm = 0; a.p_counts.forEach((c) => { const p = db.products.find((x) => x.id == c.id); const d = c.qty - p.stock_qty; if (d) { changed++; if (d < 0) vm -= d * p.buy_price; p.stock_qty = c.qty; } }); return { data: [{ changed, value_missing: r2(vm), value_extra: 0 }], error: null }; }
      case 'void_sale': { const s = db.sales.find((x) => x.id == a.p_sale); s.voided = true; db.sale_items.filter((i) => i.sale_id == s.id).forEach((i) => { const p = db.products.find((x) => x.id == i.product_id); if (p) p.stock_qty = rq(+p.stock_qty + +i.qty); }); return { data: null, error: null }; }
      case 'remove_staff': db.staff_invites = db.staff_invites.filter((i) => i.id != a.p_invite); return { data: null, error: null };
      case 'my_referrals': return { data: [{ signed_up: 2, rewarded: 1 }], error: null };
      case 'shop_team': return { data: [{ user_id: 'demo', email: 'you', role: 'owner' }, { user_id: 'demo-staff', email: 'mary@example.com', role: 'staff' }], error: null };
      case 'app_settings': return { data: {}, error: null };
      case 'my_subscription_payments': case 'request_shop_deletion': case 'create_shop': return notInDemo;
      default: return { data: [], error: null };
    }
  }
  return { query, rpc, notInDemo };
}

function startDemo() {
  const be = demoBackend(demoData());
  S.demo = true; S.uid = 'demo'; S.email = 'demo@duka'; S.role = 'owner'; S.admin = false; S.settings = {}; S.perms = null;
  sb.from = be.query; sb.rpc = be.rpc;
  sb.functions.invoke = async () => ({ error: { message: be.notInDemo.error.message, context: { json: async () => ({ error: be.notInDemo.error.message }) } } });
  sb.auth.signOut = async () => exitDemo();
  sb.auth.updateUser = async () => be.notInDemo; sb.auth.signInWithPassword = async () => be.notInDemo;
  S.shop = { id: DEMO_SHOP_ID, name: 'Mama Wanjiku Shop', phone: '0712000000', type: 'general', plan: 'standard', paid_until: '2099-12-31', referral_code: 'DEMO01', pay_type: 'till', pay_number: '123456', receipt_footer: 'Karibu tena!', kra_pin: null, ui_mode: 'simple' };
  S.members = [{ role: 'owner', shops: S.shop }]; S.tab = 'today';
  return load().then(() => render());
}
function exitDemo(signup) { location.href = location.pathname + (signup ? '#signup' : ''); }
function demoBar() {
  return `<div class="ob"><span>👀 <b>Demo shop.</b> Try anything: nothing is saved.</span><button class="s p" onclick="exitDemo(true)">Create my free shop</button></div>`;
}
