// Browser test with a fake in-memory backend: no real Supabase data is read or written.
// Run all tests with: npm test
const BASE=process.env.BASE_URL||'http://127.0.0.1:8765/';
const { chromium } = require('playwright');
const OUT=process.env.OUT_DIR||require('os').tmpdir()+'/';
const R=[];const check=(n,ok,x='')=>R.push(`${ok?'PASS':'FAIL'}  ${n}${x?'  ('+x+')':''}`);
(async()=>{const b=await chromium.launch();const page=await b.newPage({viewport:{width:390,height:844}});const errs=[];
 page.on('pageerror',e=>errs.push(e.message));let answers=[];page.on('dialog',d=>{R.push('      dialog: '+d.message().split('\n')[0]);d.accept(d.type()==='prompt'?(answers.shift()??''):undefined)});
 await page.route('**/*supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.goto(BASE);await page.waitForSelector('#em');
 await page.evaluate(()=>{const d=n=>{const x=new Date(today()+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};const ago=n=>new Date(Date.now()-n*864e5).toISOString();
  const db={calls:[],settings:{mpesa_stk_enabled:false,sms_enabled:false,announcement:{active:false,message:'',level:'info'}},
   shops:[{id:'s1',name:'Mama Mboga',plan:'standard',paid_until:d(3),created_at:ago(60),owner_email:'mama@x.com',phone:'0711000001',type:'general',members:1,products:40,sales_30d:52000,last_sale:ago(0)},
          {id:'s2',name:'Kiprop Hardware',plan:'trial',paid_until:d(-2),created_at:ago(32),owner_email:'kip@x.com',phone:'0711000002',type:'hardware',members:1,products:12,sales_30d:0,last_sale:null},
          {id:'s3',name:'Baraka Agrovet',plan:'premium',paid_until:d(200),created_at:ago(90),owner_email:'baraka@x.com',phone:'0711000003',type:'agrovet',members:3,products:300,sales_30d:120000,last_sale:ago(12)},
          {id:'s4',name:'New Shop',plan:'trial',paid_until:d(25),created_at:ago(5),owner_email:'new@x.com',phone:null,type:'general',members:1,products:0,sales_30d:0,last_sale:null,deletion_requested_at:ago(1)}],
   pays:[{id:'p1',paid_on:ago(2),shop_id:'s1',shop_name:'Mama Mboga',plan:'standard',days:30,amount:1000,mpesa_code:'SKL1',source:'manual',recorded_by:'me@x.com'}],
   agents:[{code:'KIP01',name:'Kiprop',phone:'07',commission_pct:20,active:true,signups:3,paying:2,revenue:6000,commission:1200,paid_out:500,balance:700}]};window.__db=db;
  sb.rpc=async(fn,a)=>{db.calls.push([fn,a]);switch(fn){case'admin_list_shops':return{data:db.shops,error:null};case'admin_revenue':return{data:[{month:new Date().toISOString().slice(0,7),payments:1,amount:1000}],error:null};
   case'admin_list_agents':return{data:db.agents,error:null};case'app_settings':return{data:db.settings,error:null};case'admin_list_payments':return{data:db.pays.filter(p=>!a.p_search||p.mpesa_code.includes(a.p_search.toUpperCase())),error:null};
   case'admin_reverse_payment':db.pays[0].reversed_at=new Date().toISOString();db.pays[0].reverse_reason=a.p_reason;return{data:'2026-11-30',error:null};
   case'admin_gift_days':return{data:'2026-12-10',error:null};case'admin_pay_agent':db.agents[0].paid_out+=a.p_amount;db.agents[0].balance-=a.p_amount;return{data:null,error:null};
   case'admin_growth':return{data:[{month:'2026-10',new_shops:2,paying:1,lost:0,revenue:1000},{month:'2026-11',new_shops:3,paying:2,lost:1,revenue:3000}],error:null};
   case'admin_set_setting':if(a.p_key=='announcement')db.settings.announcement={...a.p_value,id:123};else db.settings[a.p_key]=a.p_value;return{data:null,error:null}}return{data:[],error:null}};
  S.uid='admin';S.admin=true;S.shop=null;return loadAdmin()});
 let m=await page.locator('main').innerText();
 const chips=await page.locator('.per').nth(1).innerText();check('filters with counts (expired shop not counted as not-selling)',/Ending in 7 days \(1\)/.test(chips)&&/Expired \(1\)/.test(chips)&&/Not selling 7\+ days \(1\)/.test(chips)&&/Delete requests \(1\)/.test(chips),chips.replace(/\n/g,' '));
 await page.click('button:has-text("Ending in 7 days")');m=await page.locator('#al').innerText();check('expiring filter',/Mama Mboga/.test(m)&&/Ends in 3 day/.test(m)&&!/Kiprop/.test(m));
 const wa=await page.locator('#al a').first().getAttribute('href');check('WhatsApp renewal message',/ends on/.test(decodeURIComponent(wa))&&/0701 252 785|0701%20252%20785|701/.test(decodeURIComponent(wa)),decodeURIComponent(wa).split('text=')[1].slice(0,80));
 await page.click('button:has-text("Expired")');const wa2=decodeURIComponent(await page.locator('#al a').first().getAttribute('href'));check('expired message',/ended on/.test(wa2)&&/records are safe/.test(wa2));
 await page.click('button:has-text("Not selling")');check('inactive filter',/Baraka/.test(await page.locator('#al').innerText()));
 await page.screenshot({path:OUT+'admin-1-shops.png'});
 answers=['7','Sorry for downtime'];await page.click('button:has-text("All (")');await page.locator('#al .row',{hasText:'Mama Mboga'}).locator('button:has-text("Days")').click();await page.waitForTimeout(300);
 check('gift days call',await page.evaluate(()=>__db.calls.some(c=>c[0]=='admin_gift_days'&&c[1].p_days==7&&c[1].p_reason=='Sorry for downtime')));
 // Payments
 await page.click('.per button:has-text("Payments")');await page.waitForTimeout(200);check('payments list',/SKL1/.test(await page.locator('main').innerText()));
 answers=['Wrong amount'];await page.click('button:has-text("Reverse")');await page.waitForTimeout(300);
 check('reversed shown',/REVERSED[\s\S]*Wrong amount/.test(await page.locator('main').innerText()));
 // Agents
 await page.click('.per button:has-text("Agents")');m=await page.locator('main').innerText();check('agent owed shown',/owed KES 700/.test(m));
 answers=['700','AGT9','Nov'];await page.locator('.qb button',{hasText:/^Pay$/}).click();await page.waitForTimeout(300);check('agent payout -> owed 0',/owed KES 0/.test(await page.locator('main').innerText()));
 // Growth
 await page.click('.per button:has-text("Growth")');await page.waitForTimeout(200);m=await page.locator('main').innerText();check('growth',/Revenue by month/.test(m)&&/1 stopped paying/.test(m));
 await page.screenshot({path:OUT+'admin-2-growth.png'});
 // Settings + announcement
 await page.click('.per button:has-text("Settings")');await page.fill('#ann','New: stock-take is here!');await page.check('#ana');await page.click('button:has-text("Save announcement")');await page.waitForTimeout(300);
 check('announcement saved',await page.evaluate(()=>__db.settings.announcement.message=='New: stock-take is here!'&&__db.settings.announcement.active));
 await page.locator('label.row',{hasText:'SMS debt'}).locator('input').check();await page.waitForTimeout(200);check('SMS switch saved',await page.evaluate(()=>__db.settings.sms_enabled===true));
 // Banner in a shop view
 await page.evaluate(()=>{S.shop={ui_mode:'full',id:'x',name:'X',type:'general',plan:'standard',paid_until:'2099-01-01'};S.role='owner';S.products=[];S.customers=[];S.sales=[];S.rep=null;S.tab='sell';render()});
 check('banner shows in app',/📢 New: stock-take is here!/.test(await page.locator('main').innerText()));
 await page.click('.ob button:has-text("✕")');check('banner can be closed',!/stock-take is here/.test(await page.locator('main').innerText()));
 check('no JavaScript errors',errs.length===0,errs.join(' | '));
 console.log(R.join('\n'));await b.close();if(R.some(l=>l.startsWith('FAIL')))process.exitCode=1})().catch(e=>{console.log(R.join('\n'));console.log('CRASH',e.message.split('\n')[0]);process.exit(1)});
