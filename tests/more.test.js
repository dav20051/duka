// Browser test with a fake in-memory backend: no real Supabase data is read or written.
// Run all tests with: npm test
const BASE=process.env.BASE_URL||'http://127.0.0.1:8765/';
const { chromium } = require('playwright');
const OUT=process.env.OUT_DIR||require('os').tmpdir()+'/';
const R=[];const check=(n,ok,x='')=>R.push(`${ok?'PASS':'FAIL'}  ${n}${x?'  ('+x+')':''}`);
(async()=>{const b=await chromium.launch();const page=await b.newPage({viewport:{width:390,height:844}});const errs=[];
 page.on('pageerror',e=>errs.push(e.message));let answer='';page.on('dialog',d=>{R.push('      dialog: '+d.message().split('\n')[0]);d.accept(d.type()==='prompt'?answer:undefined)});
 await page.route('**/*supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.goto(BASE);await page.waitForSelector('#em');
 await page.evaluate(()=>{const db={shopUpd:null,inv:[{id:'i1',shop_id:'shop1',email:'mary@x.com',user_id:'u2',perms:{credit:true,void:true,expenses:true,discount:false}}],pw:null};window.__db=db;
  sb.rpc=async(fn,a)=>{if(fn=='shop_report')return{data:{sales_total:0,sales_count:0,cash_sales:0,mpesa_sales:0,new_debt:0,debt_cash:0,debt_mpesa:0,expenses:0,expenses_cash:0,gross_profit:0,voided_count:0,by_day:[],by_staff:[],top_items:[]},error:null};
   if(fn=='my_subscription_payments')return{data:[{paid_on:'2026-11-20T10:00:00Z',plan:'standard',days:182,amount:5400,mpesa_code:'SKL2ABC',paid_until:'2027-05-21',source:'manual'}],error:null};
   if(fn=='request_shop_deletion')return{data:a.p_cancel?null:new Date().toISOString(),error:null};return{data:[],error:null}};
  sb.auth.signInWithPassword=async({password})=>password=='oldpass123'?{data:{},error:null}:{data:null,error:{message:'bad'}};
  sb.auth.updateUser=async({password})=>{db.pw=password;return{data:{},error:null}};
  sb.from=t=>{const st={op:'select',p:null,f:[]};const api={select(){return api},eq(c,v){st.f.push([c,v]);return api},gte(){return api},lte(){return api},order(){return api},limit(){return api},range(){return api},single(){return api},
   insert(r){st.op='insert';st.p=r;return api},update(u){st.op='update';st.p=u;return api},delete(){st.op='delete';return api},
   then(res,rej){let data=[];if(st.op=='update'&&t=='shops')db.shopUpd=st.p;if(st.op=='update'&&t=='staff_invites')db.inv[0].perms=st.p.perms;
    if(st.op=='select'&&t=='staff_invites')data=db.inv;return Promise.resolve({data,error:null}).then(res,rej)}};return api};
  S.uid='u1';S.email='owner@x.com';S.role='owner';S.settings={};S.shop={id:'shop1',name:'Test Duka',type:'general',plan:'standard',paid_until:'2099-01-01',referral_code:'ABC123'};S.members=[{role:'owner',shops:S.shop}];S.tab='more';
  return load().then(()=>render())});
 let m=await page.locator('main').innerText();
 check('More shows shop details, payments, account, delete',/How customers pay you/.test(m)&&/Subscription payments/.test(m)&&/owner@x.com/.test(m)&&/Delete my shop/.test(m));
 // Edit shop: till + footer
 await page.locator('.row',{hasText:'How customers pay you'}).locator('button').click();
 await page.selectOption('#sft','till');await page.fill('#sfm','123456');await page.fill('#sff','Karibu tena!');await page.fill('#sfn','Mama Mboga Shop');
 await page.click('.sheet button:has-text("Save")');await page.waitForTimeout(200);
 const up=await page.evaluate(()=>__db.shopUpd);check('shop saved',up.pay_type=='till'&&up.pay_number=='123456'&&up.receipt_footer=='Karibu tena!'&&up.name=='Mama Mboga Shop');
 check('pay line shown',/Pay via M-Pesa: Till 123456/.test(await page.locator('main').innerText()));
 // Test print receipt
 await page.evaluate(()=>{window.print=()=>{window.__printed=true}});
 await page.click('button:has-text("Print a test receipt")');await page.waitForTimeout(500);
 const rc=await page.locator('#rcpt').innerText();check('test receipt has till + footer',/Till 123456/.test(rc)&&/Karibu tena!/.test(rc)&&/Mama Mboga Shop/.test(rc));
 check('print triggered',await page.evaluate(()=>!!window.__printed));
 await page.screenshot({path:OUT+'more-1-receipt.png'});await page.click('.sheet button.p:has-text("Close")');
 // Reminder text includes till
 const w=await page.evaluate(()=>decodeURIComponent(wa({name:'Jane',phone:'0712345678',balance:500}).split('text=')[1]));check('debt reminder includes till',/Till 123456/.test(w),w);
 // Staff permissions
 await page.click('button:has-text("Permissions")');await page.uncheck('#pm_credit');await page.check('#pm_discount');await page.click('.sheet button:has-text("Save")');await page.waitForTimeout(300);
 const pr=await page.evaluate(()=>__db.inv[0].perms);check('permissions saved',pr.credit===false&&pr.discount===true&&pr.void===true);
 // Payment history
 await page.click('.row:has-text("Subscription payments") button');const ph=await page.locator('.sheet').innerText();check('payment history',/SKL2ABC/.test(ph)&&/KES 5,400/.test(ph));
 await page.click('.sheet button:has-text("Close")');
 // Change password: wrong then right
 await page.click('button:has-text("Change password")');await page.fill('#pw0','wrong');await page.fill('#pw1','newpass123');await page.fill('#pw2','newpass123');
 await page.click('.sheet button:has-text("Save password")');await page.waitForTimeout(200);check('wrong current password rejected',R.some(l=>/current password is not correct/.test(l)));
 await page.fill('#pw0','oldpass123');await page.click('.sheet button:has-text("Save password")');await page.waitForTimeout(200);
 check('password changed',await page.evaluate(()=>__db.pw)==='newpass123');
 // Delete request with wrong then right name
 answer='nope';await page.click('button:has-text("Ask to delete my shop")');await page.waitForTimeout(200);
 check('delete needs exact shop name',!/Deletion requested/.test(await page.locator('main').innerText()));
 answer='mama mboga shop';await page.click('button:has-text("Ask to delete my shop")');await page.waitForTimeout(300);
 check('delete request shown with cancel',/Deletion requested on/.test(await page.locator('main').innerText())&&await page.locator('button:has-text("Cancel the request")').count()===1);
 await page.screenshot({path:OUT+'more-2.png',fullPage:true});
 // Staff view of Sell: no Debt button, Price shown only with discount perm
 await page.evaluate(()=>{S.role='staff';S.perms={credit:false,void:false,expenses:false,discount:true};S.products=[{id:'p1',name:'Sugar',unit:'kg',stock_qty:5,low_stock_at:1,buy_price:150,sell_price:180,active:true}];S.cart={p1:1};go('sell')});
 const cart=await page.locator('#cart').innerText();check('staff without credit: no Debt button; with discount: Price button',!/Debt/.test(cart)&&/Price/.test(cart));
 await page.evaluate(()=>go('today'));check('staff without expenses: no + Expense',await page.locator('button:has-text("+ Expense")').count()===0);
 check('no JavaScript errors',errs.length===0,errs.join(' | '));
 console.log(R.join('\n'));await b.close();if(R.some(l=>l.startsWith('FAIL')))process.exitCode=1})().catch(e=>{console.log(R.join('\n'));console.log('CRASH',e.message.split('\n')[0]);process.exit(1)});
