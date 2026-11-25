// Browser test with a fake in-memory backend: no real Supabase data is read or written.
// Run all tests with: npm test
const BASE=process.env.BASE_URL||'http://127.0.0.1:8765/';
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const page=await b.newPage();const R=[];
 await page.route('**/*supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.goto(BASE);await page.waitForSelector('#em');
 // A tab that was showing a staff shop, then the login changes to another account
 await page.evaluate(()=>{S.uid='staff-user';S.shop={id:'x',name:'admin shop'};S.role='staff';window.__marker=1;
  sb.auth.getSession=async()=>({data:{session:{user:{id:'admin-user',email:'a@x.com'}}}})});
 const nav=page.waitForNavigation({timeout:5000}).then(()=>true).catch(()=>false);
 await page.evaluate(()=>{boot()});
 const reloaded=await nav;const marker=await page.evaluate(()=>window.__marker);
 R.push(`${reloaded&&marker===undefined?'PASS':'FAIL'}  account changed -> page reloads cleanly (no mixing)`);
 // Same account calling boot again must NOT reload
 await page.waitForSelector('#em');
 await page.evaluate(()=>{S.uid='u1';window.__marker=2;sb.auth.getSession=async()=>({data:{session:{user:{id:'u1',email:'a@x.com'}}}});sb.rpc=async()=>({data:[],error:null});sb.from=()=>{const a={select(){return a},eq(){return a},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return a}});
 await page.evaluate(()=>boot());await page.waitForTimeout(500);
 R.push(`${await page.evaluate(()=>window.__marker)===2?'PASS':'FAIL'}  same account -> no reload`);
 console.log(R.join('\n'));await b.close();if(R.some(l=>l.startsWith('FAIL')))process.exitCode=1})();
