// Browser test: demo shop, suppliers, getting-started checklist and error reporting.
// The demo runs fully in the browser; Supabase calls are answered locally, so no real data is touched.
// Run all tests with: npm test
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765/';
const { chromium } = require('playwright');
const R = []; const check = (n, ok, x = '') => R.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  (' + x + ')' : ''}`);
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message)); let answers = []; page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? (answers.shift() ?? '') : undefined));
  await page.route('**/*supabase.co/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.goto(BASE); await page.waitForSelector('#em');
  // Demo from the sign-in screen
  await page.click('button:has-text("Try a demo shop")'); await page.waitForSelector('nav');
  let m = await page.locator('main').innerText();
  check('demo opens on Today with banner', /Demo shop/.test(m) && /Habari, Mama Wanjiku Shop/.test(m));
  check('demo has sales and profit', /Sales\s*KES [1-9]/.test(m) && /Net profit/.test(m) && /You owe suppliers\s*KES 3,000/.test(m), (m.match(/Sales\s*KES [\d,]+/) || [])[0]);
  check('checklist hidden in demo', !/Get started/.test(m));
  // Sell in the demo
  await page.click('nav button:has-text("Sell")'); await page.locator('#pl .row', { hasText: 'Bread' }).click(); await page.click('button:has-text("Sell ·")');
  await page.waitForSelector('text=Sale saved'); check('demo sale makes a receipt', /Bread/.test(await page.locator('#rcpt').innerText()));
  await page.click('.sheet button.p:has-text("Close")');
  // Suppliers in Debts
  await page.click('nav button:has-text("Debts")'); await page.click('button:has-text("You owe suppliers")');
  m = await page.locator('main').innerText(); check('supplier list with amount owed', /Kabarnet Wholesalers[\s\S]*you owe KES 3,000/.test(m));
  await page.locator('#app .row', { hasText: 'Kabarnet' }).click(); await page.waitForSelector('text=History');
  check('supplier history', /Invoice 2041/.test(await page.locator('.sheet').innerText()));
  await page.click('.sheet button:has-text("Pay")'); await page.fill('#spa', '1000'); await page.click('.sheet button:has-text("Save payment")'); await page.waitForTimeout(300);
  check('pay supplier lowers what is owed', /you owe KES 2,000/.test(await page.locator('main').innerText()));
  // Delivery linked to a supplier, part paid
  await page.click('nav button:has-text("Stock")'); await page.locator('#stl .row', { hasText: 'Salt' }).locator('button:has-text("+ Stock")').click();
  await page.fill('#rq', '20'); await page.selectOption('#rsu', { label: 'Kabarnet Wholesalers' }); await page.fill('#rpa', '200');
  await page.click('button:has-text("Save delivery")'); await page.waitForTimeout(300);
  await page.click('nav button:has-text("Debts")'); await page.click('button:has-text("You owe suppliers")');
  check('delivery adds unpaid part to supplier (20 x 25 - 200 = 300)', /you owe KES 2,300/.test(await page.locator('main').innerText()));
  // Checklist (shown outside the demo)
  await page.evaluate(() => { S.demo = false; localStorage.clear(); go('today'); });
  m = await page.locator('main').innerText(); check('checklist shows progress', /Get started · 4 of 5 done/.test(m) && /Put Duka on your home screen/.test(m));
  await page.click('button:has-text("Hide")'); check('checklist can be hidden', !/Get started/.test(await page.locator('main').innerText()));
  // Error reporting: a real (non-demo) signed-in user reports a crash once
  const sent = await page.evaluate(async () => {
    const calls = []; sb.from = (t) => ({ insert: (r) => { calls.push([t, r]); return Promise.resolve({ data: null, error: null }); } });
    S.uid = 'u1'; S.demo = false;
    setTimeout(() => { throw new Error('Test crash'); }); setTimeout(() => { throw new Error('Test crash'); });
    await new Promise((r) => setTimeout(r, 200)); return calls;
  });
  check('crash reported once to client_errors', sent.length === 1 && sent[0][0] === 'client_errors' && sent[0][1].message.includes('Test crash'), JSON.stringify(sent.map((c) => c[1].message)));
  check('no JavaScript errors (other than the test crash)', errs.filter((e) => !/Test crash/.test(e)).length === 0, errs.join(' | '));
  console.log(R.join('\n')); await b.close(); if (R.some((l) => l.startsWith('FAIL'))) process.exitCode = 1;
})().catch((e) => { console.log(R.join('\n')); console.log('CRASH', e.message.split('\n')[0]); process.exit(1); });
