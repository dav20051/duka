// Browser test with a fake in-memory backend: no real Supabase data is read or written.
// Run all tests with: npm test
const BASE=process.env.BASE_URL||'http://127.0.0.1:8765/';
// Browser test of the Duka UI against a fake in-memory backend (no real data is touched).
const { chromium } = require('playwright');
const OUT=process.env.OUT_DIR||require('os').tmpdir()+'/';
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', async (d) => { results.push(`      dialog: ${d.message().split('\n')[0]}`); await d.accept(d.type() === 'prompt' ? (globalThis.__promptAnswer ?? '') : undefined); });
  // Any real Supabase call is answered locally, so nothing leaves the machine.
  await page.route('**/*supabase.co/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.goto(BASE);
  await page.waitForSelector('#em');
  check('sign-in page shows benefits', await page.locator('text=Why shops use Duka').count() === 1);

  // Fake backend: products table in memory; sb.from / sb.rpc answer from it.
  await page.evaluate(() => {
    const db = { products: [], sales: [], moves: [] };
    window.__db = db;
    const q = (table) => {
      const st = { table, filters: [], op: 'select', payload: null };
      const api = {
        select() { return api; }, eq(c, v) { st.filters.push([c, v]); return api; }, gte() { return api; }, order() { return api; }, limit() { return api; },
        range() { return api; }, single() { return api; },
        insert(rows) { st.op = 'insert'; st.payload = [].concat(rows); return api; },
        update(u) { st.op = 'update'; st.payload = u; return api; },
        then(res, rej) {
          try {
            let data = [];
            if (st.op === 'insert') {
              if (table === 'products') st.payload.forEach((r) => db.products.push({ id: r.id || crypto.randomUUID(), active: true, low_stock_at: 5, category: null, variant: null, sku: null, expiry: null, ...r }));
              if (table === 'stock_movements') db.moves.push(...st.payload);
              if (table === 'sales') db.sales.push(...st.payload);
            } else if (st.op === 'update') {
              const id = (st.filters.find((f) => f[0] === 'id') || [])[1];
              const p = db.products.find((x) => x.id === id); if (p) Object.assign(p, st.payload);
            } else if (table === 'products') data = db.products.filter((p) => p.active);
            return Promise.resolve({ data, error: null }).then(res, rej);
          } catch (e) { return Promise.resolve({ data: null, error: { message: String(e) } }).then(res, rej); }
        },
      };
      return api;
    };
    sb.from = q;
    sb.rpc = async (fn, a) => {
      if (fn === 'restock_product') { const p = db.products.find((x) => x.id === a.p_product); p.stock_qty = +p.stock_qty + a.p_qty; if (a.p_buy != null) p.buy_price = a.p_buy; if (a.p_sell != null) p.sell_price = a.p_sell; return { data: p.stock_qty, error: null }; }
      if (fn === 'apply_stocktake') { let ch = 0, vm = 0; a.p_counts.forEach((c) => { const p = db.products.find((x) => x.id === c.id); const d = c.qty - p.stock_qty; if (d) { ch++; if (d < 0) vm += -d * p.buy_price; p.stock_qty = c.qty; } }); return { data: [{ changed: ch, value_missing: vm }], error: null }; }
      return { data: [], error: null };
    };
    S.uid = 'u1'; S.role = 'owner'; S.admin = false; S.settings = {};
    S.shop = {ui_mode:'full',  id: 'shop1', name: 'Test Duka', type: 'general', plan: 'trial', paid_until: '2099-01-01', referral_code: 'ABC123' };
    S.members = [{ role: 'owner', shops: S.shop }];
    S.tab = 'stock';
    return load().then(() => render());
  });

  // 1) Empty stock shows the Quick add prompt
  check('empty stock shows Quick add prompt', await page.locator('text=Add your stock the quick way').count() === 1);

  // 2) Pick common items: give 3 items a selling price, one also buy price + qty
  await page.click('button:has-text("⚡ Quick add")');
  await page.waitForSelector('#qal');
  const rowFor = (name) => page.locator('#qal .row', { hasText: name }).first();
  await rowFor('Sugar').locator('input[placeholder=Buy]').fill('150');
  await rowFor('Sugar').locator('input[placeholder=Sell]').fill('180');
  await rowFor('Sugar').locator('input[placeholder=Qty]').fill('50');
  await rowFor('Bread').locator('input[placeholder=Sell]').fill('60');
  await rowFor('Matches').locator('input[placeholder=Sell]').fill('5');
  check('save button counts filled items', (await page.locator('#qasave').innerText())==='Save 3 product(s)');
  await page.screenshot({ path: OUT + 'ui-1-pick.png' });
  await page.click('#qasave');
  await page.waitForTimeout(400);
  let names = await page.evaluate(() => __db.products.map((p) => `${p.name}:${p.sell_price}:${p.stock_qty}${p.unit}`).join(', '));
  check('pick common items saved 3 products', (await page.evaluate(() => __db.products.length)) === 3, names);

  // 3) Type a list
  await page.click('button:has-text("⚡ Quick add")');
  await page.click('button:has-text("Type a list")');
  await page.fill('#qat', 'Cooking oil 1L 280 320 24bottle\nSoap 45 50 12\nRice 120 140 50 kg\nnonsense line');
  await page.click('button:has-text("Check my list")');
  const preview = await page.locator('#qap').innerText();
  check('type-a-list preview shows 3 products', /Save 3 product/.test(preview));
  check('type-a-list flags bad line', /Line\(s\) 4/.test(preview));
  await page.screenshot({ path: OUT + 'ui-2-typelist.png' });
  await page.click('#qap button.p');
  await page.waitForTimeout(400);
  check('total products after list', (await page.evaluate(() => __db.products.length)) === 6);

  // 4) Stock list search + sort
  await page.fill('input[placeholder="Search stock"]', 'oil');
  check('stock search filters', (await page.locator('#stl .row').count()) === 1);
  await page.fill('input[placeholder="Search stock"]', '');
  await page.evaluate(() => { S.sq = ''; $('#stl').innerHTML = stockList(); });
  await page.selectOption('select:has(option[value=value])', 'value');
  const first = await page.locator('#stl .row').first().innerText();
  check('sort by stock value puts sugar (KES 7,500) first', /Sugar/.test(first), first.split('\n')[0]);

  // 5) Delivery with new buying price
  await page.locator('#stl .row', { hasText: 'Sugar' }).locator('button:has-text("+ Stock")').click();
  await page.fill('#rq', '10'); await page.fill('#rb', '160');
  const calc = await page.locator('#rm').innerText();
  check('delivery shows new stock and margin', /New stock: 60/.test(calc) && /margin/.test(calc), calc.replace(/\n/g, ' | '));
  await page.screenshot({ path: OUT + 'ui-3-delivery.png' });
  await page.click('button:has-text("Save delivery")');
  await page.waitForTimeout(400);
  const sugar = await page.evaluate(() => __db.products.find((p) => p.name === 'Sugar'));
  check('delivery saved', sugar.stock_qty === 60 && sugar.buy_price === 160, `qty ${sugar.stock_qty}, buy ${sugar.buy_price}`);

  // 6) Stock-take: sugar counted 57.5 (2.5 kg missing at 160 = KES 400)
  await page.click('button:has-text("📋 Stock-take")');
  await page.locator('#stk .row', { hasText: 'Sugar' }).locator('input').fill('57.5');
  await page.click('button:has-text("Review counts")');
  const review = await page.locator('#stk').innerText();
  check('review hides search and Review button', !(await page.locator('#stks').isVisible()) && !(await page.locator('#stkr').isVisible()));
  check('stock-take shows KES 400 missing', /KES 400/.test(review));
  await page.screenshot({ path: OUT + 'ui-4-stocktake.png' });
  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(400);
  check('stock-take applied', (await page.evaluate(() => __db.products.find((p) => p.name === 'Sugar').stock_qty)) === 57.5);

  // 7) Sell: tap to add, quick ½, by money, change
  await page.evaluate(() => go('sell'));
  await page.locator('#pl .row', { hasText: 'Sugar' }).click();
  check('tap row adds to cart', (await page.locator('#cart .row').count()) === 1);
  await page.click('#cart button:has-text("½")');
  check('½ kg sets quantity', /× ½ kg/.test(await page.locator('#cart').innerText()));
  await page.evaluate(() => { globalThis.__x = 1; });
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? '50' : undefined));
  await page.click('#cart button:has-text("By KES")');
  const cartTxt = await page.locator('#cart').innerText();
  check('by KES 50 charges KES 50', /Sell · KES 50\b/.test(cartTxt), cartTxt.match(/Sell · KES [\d,.]+/)?.[0]);
  await page.fill('#given', '100');
  check('change shows KES 50', /Change\s*KES 50/.test(await page.locator('#chg').innerText()));
  await page.screenshot({ path: OUT + 'ui-5-sell.png' });

  // 8) Kiswahili
  await page.evaluate(() => localStorage.setItem('lang', 'sw'));
  await page.reload(); await page.waitForSelector('#em');
  check('Kiswahili sign-in', await page.locator('text=Kwa nini maduka yanatumia Duka').count() === 1);
  await page.screenshot({ path: OUT + 'ui-6-swahili.png' });

  check('no JavaScript errors', errors.length === 0, errors.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
  if(results.some(l=>l.startsWith('FAIL')))process.exitCode=1;
})().catch((e) => { console.log(results.join('\n')); console.log('TEST CRASHED:', e.message); process.exit(1); });
