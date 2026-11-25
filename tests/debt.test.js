// Browser test with a fake in-memory backend: no real Supabase data is read or written.
// Run all tests with: npm test
const BASE=process.env.BASE_URL||'http://127.0.0.1:8765/';
const { chromium } = require('playwright');
const OUT=process.env.OUT_DIR||require('os').tmpdir()+'/';
const R=[];const check=(n,ok,x='')=>R.push(`${ok?'PASS':'FAIL'}  ${n}${x?'  ('+x+')':''}`);
(async()=>{const b=await chromium.launch();const page=await b.newPage({viewport:{width:390,height:844}});const errs=[];
 page.on('pageerror',e=>errs.push(e.message));
 let promptAnswer='0';page.on('dialog',d=>{R.push('      dialog: '+d.message().split('\n')[0]);d.accept(d.type()==='prompt'?promptAnswer:undefined)});
 await page.route('**/*supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.goto(BASE);await page.waitForSelector('#em');
 await page.evaluate(()=>{
  const day=n=>new Date(Date.now()-n*864e5).toISOString();
  const db={customers:[{id:'c1',name:'Jane Wanjiku',phone:'0712345678',credit_limit:1000,active:true,created_at:day(60)},{id:'c2',name:'Kiprop',phone:'0722000111',credit_limit:null,active:true,created_at:day(20)}],
   sales:[{id:'s1',customer_id:'c1',created_at:day(40),total:600,paid:0,method:'debt',voided:false,sale_items:[{name:'Sugar',qty:2,unit_price:180},{name:'Bread',qty:4,unit_price:60}]},
          {id:'s2',customer_id:'c1',created_at:day(5),total:300,paid:100,method:'debt',voided:false,sale_items:[{name:'Oil',qty:1,unit_price:300}]},
          {id:'s3',customer_id:'c2',created_at:day(3),total:150,paid:0,method:'debt',voided:false,sale_items:[{name:'Soap',qty:3,unit_price:50}]}],
   pays:[],products:[{id:'p1',name:'Sugar',unit:'kg',stock_qty:50,low_stock_at:5,buy_price:150,sell_price:180,active:true}]};
  window.__db=db;
  const bal=c=>{const s=db.sales.filter(x=>x.customer_id==c.id&&!x.voided);const owed=s.reduce((a,x)=>a+x.total-x.paid,0),pd=db.pays.filter(p=>p.customer_id==c.id).reduce((a,p)=>a+p.amount,0);
   let cum=0,oldest=null;for(const x of [...s].sort((a,b)=>a.created_at<b.created_at?-1:1)){if(x.total<=x.paid)continue;cum+=x.total-x.paid;if(cum>pd&&!oldest)oldest=x.created_at}
   const lp=db.pays.filter(p=>p.customer_id==c.id).map(p=>p.created_at).sort().pop()||null;
   return{customer_id:c.id,shop_id:'shop1',name:c.name,phone:c.phone,balance:owed-pd,credit_limit:c.credit_limit,active:c.active,created_at:c.created_at,oldest_unpaid_at:oldest,last_payment_at:lp}};
  sb.from=t=>{const st={f:[],op:'select',p:null};const api={select(){return api},eq(c,v){st.f.push([c,v]);return api},gte(){return api},order(){return api},limit(){return api},range(){return api},
   single(){st.single=true;return api},insert(r){st.op='insert';st.p=[].concat(r);return api},update(u){st.op='update';st.p=u;return api},
   then(res,rej){let data=[];const fv=c=>(st.f.find(f=>f[0]==c)||[])[1];
    if(st.op=='insert'){if(t=='customers'){const r={id:'c'+(db.customers.length+1),active:true,created_at:new Date().toISOString(),credit_limit:null,...st.p[0]};db.customers.push(r);data=st.single?{id:r.id}:[r]}
     if(t=='debt_payments')st.p.forEach(p=>db.pays.push({id:'d'+db.pays.length,created_at:new Date().toISOString(),...p}));
     if(t=='sales')db.sales.push(...st.p.map(x=>({...x,voided:false,sale_items:[]})));}
    else if(st.op=='update'){const c=db.customers.find(x=>x.id==fv('id'));if(c)Object.assign(c,st.p)}
    else if(t=='customer_balances')data=db.customers.map(bal);
    else if(t=='products')data=db.products;
    else if(t=='sales')data=fv('customer_id')?db.sales.filter(x=>x.customer_id==fv('customer_id')):db.sales;
    else if(t=='debt_payments')data=db.pays.filter(x=>x.customer_id==fv('customer_id'));
    return Promise.resolve({data,error:null}).then(res,rej)}};return api};
  sb.rpc=async()=>({data:[],error:null});
  S.uid='u1';S.role='owner';S.settings={};S.shop={id:'shop1',name:'Test Duka',type:'general',plan:'trial',paid_until:'2099-01-01'};S.members=[{role:'owner',shops:S.shop}];S.tab='debts';
  return load().then(()=>render())});
 // Debts overview
 const main=await page.locator('main').innerText();
 check('total owed KES 950',/Total owed\s*KES 950/.test(main));
 check('over 30 days KES 800 (Jane)',/Over 30 days\s*KES 800/.test(main));
 const first=await page.locator('#dl .row').first().innerText();
 check('oldest debt listed first with age',/Jane/.test(first)&&/40 days/.test(first),first.replace(/\n/g,' | '));
 check('KES 800 with KES 1,000 limit is not over limit',!/over limit/.test(first));
 await page.fill('input[placeholder="Search customers"]','kip');
 check('search customers',(await page.locator('#dl .row').count())===1);
 await page.fill('input[placeholder="Search customers"]','');await page.evaluate(()=>{S.dq='';$('#dl').innerHTML=debtList()});
 await page.screenshot({path:OUT+'debt-1-list.png'});
 // Customer page + history + statement
 await page.locator('#dl .row',{hasText:'Jane'}).click();await page.waitForSelector('text=History');
 const cv=await page.locator('.sheet').innerText();
 check('customer page shows history with items',/Sugar ×2, Bread ×4/.test(cv)&&/Oil ×1/.test(cv));
 const stmt=await page.evaluate(()=>statementText());
 check('statement text',/Statement for Jane Wanjiku/.test(stmt)&&/Balance: KES 800/.test(stmt),stmt.split('\n').slice(3,6).join(' / '));
 await page.screenshot({path:OUT+'debt-2-customer.png'});
 // Record payment via form
 await page.click('button:has-text("Record payment")');
 await page.fill('#pa','500');await page.click('#pmm');await page.fill('#pcode','qwe123');
 check('payment preview new balance',/New balance:\s*KES 300/.test(await page.locator('#pd').innerText()));
 await page.screenshot({path:OUT+'debt-3-payment.png'});
 await page.click('button:has-text("Save payment")');await page.waitForSelector('text=Payment saved');
 const rc=await page.locator('.rc').innerText();
 check('payment receipt',/KES 500 \(M-Pesa QWE123\)/.test(rc)&&/Balance remaining: KES 300/.test(rc));
 const pay=await page.evaluate(()=>__db.pays[0]);check('payment saved with method and code',pay.method==='mpesa'&&pay.mpesa_code==='QWE123'&&pay.amount===500);
 await page.click('.sheet button:has-text("Close")');
 const after=await page.locator('main').innerText();
 const dl=await page.locator('#dl').innerText();check('after paying 500 of the 600 debt: KES 300 left, still 40 days old',/Jane[^\n]*\n?KES 300 · ⚠ 40 days/.test(dl),dl.split('\n').slice(0,2).join(' | '));
 // Sell: new customer from cart + credit limit
 await page.evaluate(()=>go('sell'));await page.locator('#pl .row',{hasText:'Sugar'}).click();
 await page.click('button:has-text("Debt")');
 await page.selectOption('#cart select','__new');await page.waitForSelector('#cfn');
 await page.fill('#cfn','Achieng');await page.fill('#cfp','0733444555');await page.fill('#cfl','100');
 await page.click('.sheet button:has-text("Save")');await page.waitForTimeout(300);
 const sel=await page.evaluate(()=>({cust:S.cust,name:(S.customers.find(c=>c.customer_id==S.cust)||{}).name}));
 check('new customer created from Sell and selected',sel.name==='Achieng',JSON.stringify(sel));
 check('cart kept after adding customer',(await page.locator('#cart .row').count())===1);
 await page.click('button:has-text("Sell ·")');await page.waitForTimeout(300);
 check('credit limit warning shown',R.some(l=>/over the credit limit of KES 100/.test(l)));
 await page.screenshot({path:OUT+'debt-4-sell.png'});
 check('no JavaScript errors',errs.length===0,errs.join(' | '));
 console.log(R.join('\n'));await b.close();if(R.some(l=>l.startsWith('FAIL')))process.exitCode=1})().catch(e=>{console.log(R.join('\n'));console.log('CRASH',e.message.split('\n')[0]);process.exit(1)});
