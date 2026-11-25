// Browser test with a fake in-memory backend: no real Supabase data is read or written.
// Run all tests with: npm test
const BASE=process.env.BASE_URL||'http://127.0.0.1:8765/';
const { chromium } = require('playwright');
const OUT=process.env.OUT_DIR||require('os').tmpdir()+'/';
const R=[];const check=(n,ok,x='')=>R.push(`${ok?'PASS':'FAIL'}  ${n}${x?'  ('+x+')':''}`);
(async()=>{const b=await chromium.launch();const page=await b.newPage({viewport:{width:390,height:844}});const errs=[];
 page.on('pageerror',e=>errs.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('**/*supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.goto(BASE);await page.waitForSelector('#em');
 await page.evaluate(()=>{
  const db={exps:[],counts:[],rpcCalls:[]};window.__db=db;
  const rep=(f,t)=>({from:f,to:t,sales_total:f==t&&t==today()?1080:900,sales_count:3,cash_sales:460,mpesa_sales:180,new_debt:440,debt_cash:200,debt_mpesa:0,
   expenses:db.exps.filter(e=>e.spent_on>=f&&e.spent_on<=t).reduce((a,e)=>a+e.amount,0),expenses_cash:db.exps.filter(e=>e.paid_from=='cash'&&e.spent_on>=f&&e.spent_on<=t).reduce((a,e)=>a+e.amount,0),
   gross_profit:180,voided_count:1,voided_total:180,by_day:[{day:f,sales:1080}],by_staff:[{user:'u1',sales:700,count:2},{user:'u2',sales:380,count:1}],
   top_items:[{name:'Sugar',qty:6,revenue:1080,profit:180}],expense_by_cat:[]});
  sb.rpc=async(fn,a)=>{db.rpcCalls.push(fn);if(fn=='shop_report')return{data:rep(a.p_from,a.p_to),error:null};
   if(fn=='shop_team')return{data:[{user_id:'u1',email:'owner@x.com',role:'owner'},{user_id:'u2',email:'mary@x.com',role:'staff'}],error:null};return{data:[],error:null}};
  sb.from=t=>{const st={op:'select',p:null,f:[]};const api={select(){return api},eq(c,v){st.f.push([c,v]);return api},gte(){return api},lte(){return api},order(){return api},limit(){return api},range(){return api},
   insert(r){st.op='insert';st.p=[].concat(r);return api},delete(){st.op='delete';return api},update(){return api},
   then(res,rej){let data=[];
    if(st.op=='insert'&&t=='expenses')st.p.forEach(x=>db.exps.push({id:'e'+db.exps.length,created_at:new Date().toISOString(),...x}));
    if(st.op=='insert'&&t=='cash_counts')st.p.forEach(x=>db.counts.unshift({id:'k'+db.counts.length,created_at:new Date().toISOString(),counted_by:'u1',difference:x.counted-x.expected,...x}));
    if(st.op=='delete'&&t=='expenses'){const id=(st.f.find(f=>f[0]=='id')||[])[1];db.exps=db.exps.filter(e=>e.id!=id)}
    if(st.op=='select'){if(t=='expenses')data=db.exps;if(t=='cash_counts')data=db.counts;
     if(t=='products')data=[{id:'p1',name:'Sugar',unit:'kg',stock_qty:3,low_stock_at:10,buy_price:150,sell_price:180,active:true},{id:'p2',name:'Oil',variant:'1L',unit:'bottle',stock_qty:2,low_stock_at:6,buy_price:280,sell_price:320,active:true}];
     if(t=='customer_balances')data=[{customer_id:'c1',name:'Jane',balance:440,active:true}]}
    return Promise.resolve({data,error:null}).then(res,rej)}};return api};
  S.uid='u1';S.role='owner';S.settings={};S.shop={ui_mode:'full',id:'shop1',name:'Test Duka',type:'general',plan:'standard',paid_until:'2099-01-01',referral_code:'ABC123'};S.members=[{role:'owner',shops:S.shop}];S.tab='today';
  return load().then(()=>render())});
 let m=await page.locator('main').innerText();
 check('Today: sales with comparison',/Sales\s*KES 1,080[\s\S]*↑ 20% vs last/.test(m));
 check('Money in includes debt collected (840)',/Money in\s*KES 840/.test(m)&&/Cash KES 660 · M-Pesa KES 180/.test(m));
 check('Debt collected card',/Debt collected\s*KES 200/.test(m));
 check('Gross + net profit',/Gross profit\s*KES 180/.test(m)&&/Net profit\s*KES 180/.test(m));
 check('voided note',/1 voided sale/.test(m));
 check('sales by staff shows names',/Sales by staff[\s\S]*You[\s\S]*mary@x.com/.test(m));
 check('Order list button',await page.locator('button:has-text("📦 Order list")').count()===1);
 // Expense
 await page.click('button:has-text("+ Expense")');await page.click('#xc button:has-text("Transport")');await page.fill('#xa','150');
 await page.click('button:has-text("Save expense")');await page.waitForTimeout(300);
 m=await page.locator('main').innerText();
 check('expense saved and net profit drops to 30',/Expenses\s*KES 150/.test(m)&&/Net profit\s*KES 30/.test(m));
 check('expense listed',/Transport[\s\S]*cash drawer/.test(m));
 // Cash count: float 1000 + 460 + 200 - 150 = 1510; count 1450 -> short 60
 await page.click('button:has-text("Count the cash")');await page.waitForSelector('#ccc');
 await page.fill('#ccf','1000');await page.fill('#ccc','1450');
 const cc=await page.locator('#ccr').innerText();check('cash check: expected 1,510, short 60',/KES 1,510/.test(cc)&&/Short by KES 60/.test(cc),cc.replace(/\n/g,' '));
 await page.screenshot({path:OUT+'today-2-cash.png'});
 await page.click('button:has-text("Save count")');await page.waitForTimeout(300);
 check('cash card shows the count',/short KES 60/.test(await page.locator('main').innerText()));
 // Period switch
 await page.click('.per button:has-text("This month")');await page.waitForTimeout(300);
 m=await page.locator('main').innerText();check('This month: range label + comparison',/Nov – /.test(m)&&/vs same days last month/.test(m)&&!/Count the cash/.test(m));
 await page.click('.per button:has-text("Today")');await page.waitForTimeout(200);
 await page.screenshot({path:OUT+'today-1.png',fullPage:false});
 // Summary
 const sum=await page.evaluate(()=>summaryText());check('WhatsApp summary has net profit + cash count',/Net profit: KES 30/.test(sum)&&/Cash count: short KES 60/.test(sum),sum.split('\n').slice(0,2).join(' / '));
 // Order list
 await page.click('button:has-text("📦 Order list")');const ol=await page.locator('#olt').inputValue();
 check('order list suggests amounts',/Sugar: 17 kg/.test(ol)&&/Oil 1L: 10 bottle/.test(ol),ol.replace(/\n/g,' | '));
 await page.click('.sheet button:has-text("Close")');
 // More tab
 await page.click('nav button:has-text("More")');m=await page.locator('main').innerText();
 check('More tab: plan, staff, cash counts, downloads, settings',/Plan/.test(m)&&/Staff/.test(m)&&/Cash counts/.test(m)&&/Download your data/.test(m)&&/Log out/.test(m));
 await page.screenshot({path:OUT+'today-3-more.png'});
 check('no JavaScript errors',errs.length===0,errs.join(' | '));
 console.log(R.join('\n'));await b.close();if(R.some(l=>l.startsWith('FAIL')))process.exitCode=1})().catch(e=>{console.log(R.join('\n'));console.log('CRASH',e.message.split('\n')[0]);process.exit(1)});
