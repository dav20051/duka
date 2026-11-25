// Duka · Excel/CSV import, quick add, stock-take, camera barcode scanning.
// Plain browser script: loaded in order by index.html and shares the page's global scope.
// ---------- Import products from Excel (.xlsx) or CSV ----------
// Minimal .xlsx reader (zip + XML) using the browser's own decompression; reads the first sheet.
async function readXlsx(buf){const dv=new DataView(buf),u8=new Uint8Array(buf),td=new TextDecoder();
 let e=u8.length-22;while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;if(e<0)throw new Error('This is not an Excel (.xlsx) file');
 const files={};let p=dv.getUint32(e+16,true);
 for(let i=0,n=dv.getUint16(e+10,true);i<n&&dv.getUint32(p,true)===0x02014b50;i++){const nl=dv.getUint16(p+28,true);
  files[td.decode(u8.subarray(p+46,p+46+nl))]={m:dv.getUint16(p+10,true),cs:dv.getUint32(p+20,true),off:dv.getUint32(p+42,true)};p+=46+nl+dv.getUint16(p+30,true)+dv.getUint16(p+32,true)}
 const get=async n=>{const f=files[n];if(!f)return null;const s=f.off+30+dv.getUint16(f.off+26,true)+dv.getUint16(f.off+28,true),d=u8.subarray(s,s+f.cs);
  if(f.m===0)return td.decode(d);if(typeof DecompressionStream=='undefined')throw new Error('This browser cannot open Excel files. Save the sheet as CSV and import that.');
  return new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()};
 const xml=s=>new DOMParser().parseFromString(s,'application/xml'),tags=(n,t)=>[...n.getElementsByTagName(t)];
 const ss=[],sx=await get('xl/sharedStrings.xml');if(sx)tags(xml(sx),'si').forEach(si=>ss.push(tags(si,'t').map(t=>t.textContent).join('')));
 const sheet=files['xl/worksheets/sheet1.xml']?'xl/worksheets/sheet1.xml':Object.keys(files).find(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k));
 if(!sheet)throw new Error('No sheet found in this file');
 const col=r=>[...r.replace(/\d+/g,'')].reduce((a,ch)=>a*26+ch.charCodeAt(0)-64,0)-1;
 return tags(xml(await get(sheet)),'row').map(r=>{const row=[];tags(r,'c').forEach(c=>{const t=c.getAttribute('t'),v=tags(c,'v')[0];
  row[col(c.getAttribute('r')||'A')]=t=='s'?ss[+(v&&v.textContent)]:t=='inlineStr'?tags(c,'t').map(x=>x.textContent).join(''):(v?v.textContent:'')});
  return Array.from(row,x=>x??'')})}
function readCsv(text){text=text.replace(/^﻿/,'');const first=text.split(/\r?\n/)[0]||'',d=(first.split(';').length>first.split(',').length)?';':',';
 const rows=[];let row=[],f='',q=false;
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(q){if(ch=='"'){if(text[i+1]=='"'){f+='"';i++}else q=false}else f+=ch}
  else if(ch=='"')q=true;else if(ch==d){row.push(f);f=''}else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&text[i+1]=='\n')i++;row.push(f);rows.push(row);row=[];f=''}else f+=ch}
 if(f||row.length){row.push(f);rows.push(row)}return rows}
const IMPORT_COLS={name:['name','product','productname','item','itemname','description','jina','bidhaa'],
 variant:['variant','size','sizevariant','spec','strength','packsize','colour','color'],category:['category','aina','group','department'],
 sku:['sku','barcode','skubarcode','code','itemcode','msimbo'],unit:['unit','units','uom','kipimo'],
 buy:['buyprice','buyingprice','cost','costprice','purchaseprice','beiyakununua'],sell:['sellprice','sellingprice','price','retailprice','beiyakuuza','bei'],
 qty:['quantity','qty','stock','instock','stockqty','quantityinstock','idadi'],reorder:['reorderat','reorder','reorderlevel','lowstock','minstock','warnat','warnmewhenstockreaches'],
 expiry:['expiry','expirydate','exp','expires','bestbefore']};
const num=v=>{const n=parseFloat(String(v).replace(/[^\d.\-]/g,''));return isFinite(n)?n:null};
function excelDate(v){v=String(v||'').trim();if(!v)return null;if(/^\d{4}-\d{2}-\d{2}/.test(v))return v.slice(0,10);
 if(/^\d{5}(\.\d+)?$/.test(v))return new Date(Date.UTC(1899,11,30)+(+v)*864e5).toISOString().slice(0,10);
 const m=v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null}
function showImport(){document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet">
 <h3>Import products</h3><p class="lb">Choose an Excel (.xlsx) or CSV file. The first row must be column names, such as <b>Name, Buy price, Sell price, Quantity, Unit</b>. Optional: Size, Category, Barcode, Reorder at, Expiry.<br>Products already in your list (same barcode, or same name and size) are updated; the rest are added.</p>
 <p><button class="s" onclick="importTemplate()">⬇ Download a template</button></p>
 <input type="file" id="imf" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onchange="parseImport(this.files[0])">
 <div id="imp"></div><p><button onclick="closeEdit()" style="width:100%">Close</button></p></div></div>`)}
function importTemplate(){download('duka-products-template.csv',[['Name','Size','Category','Barcode','Unit','Buy price','Sell price','Quantity','Reorder at','Expiry'],
 ['Sugar','','Food','','kg',150,180,50,10,''],['Cooking oil','1 L','Food','','bottle',280,320,24,6,'']])}
async function parseImport(file){const out=$('#imp');if(!file)return;out.innerHTML='<p class="lb">Reading file…</p>';
 try{const rows=/\.xlsx$/i.test(file.name)?await readXlsx(await file.arrayBuffer()):readCsv(await file.text());
  const hi=rows.findIndex(r=>r.some(c=>String(c).trim()));if(hi<0)throw new Error('The file is empty');
  const head=rows[hi].map(h=>String(h).toLowerCase().replace(/[^a-z]/g,'')),ix={};
  for(const[k,names]of Object.entries(IMPORT_COLS)){const i=head.findIndex(h=>names.includes(h));if(i>=0)ix[k]=i}
  if(ix.name==null)throw new Error('No "Name" column found. The first row must have column names.');
  const units=unitsFor(),cell=(r,k)=>ix[k]==null?'':String(r[ix[k]]??'').trim(),errs=[],items=[],seen=new Set();
  rows.slice(hi+1).forEach((r,n)=>{const name=cell(r,'name');if(!name)return;const line=hi+n+2;
   const it={name:name.slice(0,120),variant:cell(r,'variant')||null,category:cell(r,'category')||null,sku:cell(r,'sku')||null,
    unit:cell(r,'unit')||null,buy:num(cell(r,'buy')),sell:num(cell(r,'sell')),qty:num(cell(r,'qty')),reorder:num(cell(r,'reorder')),expiry:excelDate(cell(r,'expiry'))};
   if(it.qty!=null&&it.qty<0||it.buy!=null&&it.buy<0||it.sell!=null&&it.sell<0)return errs.push(`Row ${line}: negative number`);
   const key=it.sku?'s:'+it.sku.toLowerCase():'n:'+(it.name+'|'+(it.variant||'')).toLowerCase();if(seen.has(key))return errs.push(`Row ${line}: ${name} appears twice`);seen.add(key);
   it.match=S.products.find(p=>it.sku&&p.sku&&p.sku.toLowerCase()==it.sku.toLowerCase())||S.products.find(p=>(p.name+'|'+(p.variant||'')).toLowerCase()==(it.name+'|'+(it.variant||'')).toLowerCase());
   if(it.unit&&!it.match&&!units.includes(it.unit)){const u=units.find(x=>x.toLowerCase()==it.unit.toLowerCase());if(u)it.unit=u}
   if(it.unit&&!/^[\p{L}\p{N} .\/-]{1,15}$/u.test(it.unit))it.unit=null;
   items.push(it)});
  if(!items.length)throw new Error('No products found under the column names');
  const add=items.filter(i=>!i.match),upd=items.filter(i=>i.match);
  if(S.shop.plan=='basic'&&S.products.length+add.length>300)throw new Error(`Your Basic plan allows 300 products. This file would bring you to ${S.products.length+add.length}. Upgrade to Standard for unlimited products.`);
  S.imp=items;
  out.innerHTML=`<div class="card"><span class="pn">${add.length} new · ${upd.length} to update</span><small>${ix.qty==null?'No quantity column: stock levels stay as they are.':'Quantities in the file become the stock level (changes are logged).'}</small>
   ${errs.length?`<small class="low">${errs.length} row(s) skipped: ${esc(errs.slice(0,5).join('; '))}${errs.length>5?'…':''}</small>`:''}</div>
   ${items.slice(0,8).map(i=>`<div class="row"><div>${esc(i.name)}${i.variant?' · '+esc(i.variant):''}<small>${i.match?'update':'new'} · ${i.sell!=null?kes(i.sell):'no price'}${i.qty!=null?' · '+i.qty+' '+esc(i.unit||(i.match&&i.match.unit)||'pc'):''}</small></div></div>`).join('')}
   ${items.length>8?`<p class="lb">…and ${items.length-8} more</p>`:''}<button class="p" style="width:100%" onclick="runImport(this)">Import ${items.length} product(s)</button>`}
 catch(e){S.imp=null;out.innerHTML=`<p class="low">${esc(e.message||e)}</p>`}}
async function runImport(btn){const items=S.imp;if(!items)return;btn.disabled=true;btn.textContent='Importing…';const sid=S.shop.id,moves=[];
 try{const add=items.filter(i=>!i.match).map(i=>({shop_id:sid,name:i.name,variant:i.variant,category:i.category,sku:i.sku,unit:i.unit||'pc',
   buy_price:i.buy||0,sell_price:i.sell||0,stock_qty:i.qty||0,low_stock_at:i.reorder??5,expiry:i.expiry}));
  for(let k=0;k<add.length;k+=200){const {error}=await sb.from('products').insert(add.slice(k,k+200));
   if(error)throw new Error(/products_shop_sku/.test(error.message)?'A barcode in the file is already used by another product':error.message)}
  const upd=items.filter(i=>i.match);
  for(let k=0;k<upd.length;k+=10)await Promise.all(upd.slice(k,k+10).map(async i=>{const p=i.match,u={};
   if(i.category)u.category=i.category;if(i.sku)u.sku=i.sku;if(i.unit)u.unit=i.unit;if(i.buy!=null)u.buy_price=i.buy;if(i.sell!=null)u.sell_price=i.sell;
   if(i.reorder!=null)u.low_stock_at=i.reorder;if(i.expiry)u.expiry=i.expiry;if(i.qty!=null&&i.qty!=+p.stock_qty){u.stock_qty=i.qty;moves.push({shop_id:sid,product_id:p.id,change:rq(i.qty-p.stock_qty),reason:'import'})}
   if(!Object.keys(u).length)return;const {error}=await sb.from('products').update(u).eq('id',p.id);if(error)throw new Error(i.name+': '+error.message)}));
  if(moves.length){const {error}=await sb.from('stock_movements').insert(moves);if(error)console.warn(error)}
  closeEdit();await load();saveCache();render();alert(`Imported ✔ ${add.length} added, ${upd.length} updated.`)}
 catch(e){btn.disabled=false;btn.textContent='Try again';alert('Import stopped: '+(e.message||e)+'\nProducts saved before the error are kept.');await load();render()}}

// ---------- Quick add: for owners who do not use Excel ----------
// Common items per shop type: [name, size, unit, category]. Owners type only prices and quantity.
const CATALOG={
 general:[['Sugar','','kg','Food'],['Maize flour (unga wa ugali)','2kg','pkt','Food'],['Wheat flour (unga wa ngano)','2kg','pkt','Food'],['Rice','','kg','Food'],['Cooking oil','1L','bottle','Food'],['Cooking fat','500g','pc','Food'],['Salt','1kg','pkt','Food'],['Tea leaves','100g','pkt','Food'],['Milk','500ml','pkt','Food'],['Bread','400g','pc','Food'],['Eggs','','pc','Food'],['Margarine','250g','pc','Food'],['Beans','','kg','Food'],['Green grams (ndengu)','','kg','Food'],['Maize','','kg','Food'],['Tomatoes','','kg','Food'],['Onions','','kg','Food'],['Spaghetti','400g','pkt','Food'],['Soup / beef cubes','','pkt','Food'],['Biscuits','','pkt','Snacks'],['Sweets','','pc','Snacks'],['Soda','500ml','bottle','Drinks'],['Drinking water','500ml','bottle','Drinks'],['Juice','500ml','bottle','Drinks'],['Bar soap','','pc','Household'],['Washing powder','500g','pkt','Household'],['Toilet paper','','pc','Household'],['Matches','','pkt','Household'],['Candles','','pc','Household'],['Paraffin','','L','Household'],['Toothpaste','','pc','Personal care'],['Bathing soap','','pc','Personal care'],['Body lotion','','bottle','Personal care'],['Sanitary pads','','pkt','Personal care'],['Diapers','','pkt','Personal care'],['Razor blades','','pkt','Personal care']],
 hardware:[['Cement','50kg','bag','Building'],['Nails','3 inch','kg','Fasteners'],['Nails','4 inch','kg','Fasteners'],['Roofing nails','','kg','Fasteners'],['Wood screws','','pkt','Fasteners'],['Binding wire','','kg','Building'],['Iron sheet','gauge 30','sheet','Roofing'],['Ridge cap','','pc','Roofing'],['Timber','2x4','m','Timber'],['Timber','2x2','m','Timber'],['Paint','4L','pc','Paint'],['Paint','1L','pc','Paint'],['Paint brush','3 inch','pc','Paint'],['Sand paper','','sheet','Paint'],['PVC pipe','1/2 inch','length','Plumbing'],['PVC pipe','4 inch','length','Plumbing'],['Tap','1/2 inch','pc','Plumbing'],['Electric cable','1.5mm','m','Electrical'],['Electric cable','2.5mm','m','Electrical'],['Socket','','pc','Electrical'],['Switch','','pc','Electrical'],['Bulb','','pc','Electrical'],['Padlock','','pc','Security'],['Door hinges','','pc','Fittings'],['Wheelbarrow','','pc','Tools'],['Jembe','','pc','Tools'],['Panga','','pc','Tools'],['Spade','','pc','Tools']],
 pharmacy:[['Paracetamol','500mg','strip','Pain relief'],['Ibuprofen','400mg','strip','Pain relief'],['Amoxicillin','500mg','strip','Antibiotics'],['Cetirizine','10mg','strip','Allergy'],['Antacid tablets','','strip','Stomach'],['ORS sachets','','pkt','Stomach'],['Zinc tablets','20mg','strip','Stomach'],['Cough syrup','100ml','bottle','Cough & cold'],['Multivitamin','','box','Vitamins'],['Folic acid','','strip','Vitamins'],['Dewormer tablets','','pc','Dewormers'],['Antiseptic liquid','100ml','bottle','First aid'],['Bandage','','pc','First aid'],['Cotton wool','','pkt','First aid'],['Plasters','','box','First aid'],['Gloves','','box','First aid'],['Pregnancy test','','pc','Tests'],['Condoms','','pkt','Family planning'],['Sanitary pads','','pkt','Personal care'],['Diapers','','pkt','Personal care'],['Glucose','','pkt','Other'],['Thermometer','','pc','Equipment']],
 agrovet:[['DAP fertiliser','50kg','bag','Fertiliser'],['CAN fertiliser','50kg','bag','Fertiliser'],['NPK fertiliser','50kg','bag','Fertiliser'],['Urea','50kg','bag','Fertiliser'],['Maize seed','2kg','pkt','Seeds'],['Bean seed','2kg','pkt','Seeds'],['Vegetable seeds','','pkt','Seeds'],['Dairy meal','70kg','bag','Feeds'],['Layers mash','70kg','bag','Feeds'],['Chick mash','70kg','bag','Feeds'],['Growers mash','70kg','bag','Feeds'],['Mineral salt','','kg','Feeds'],['Dewormer','','bottle','Animal health'],['Acaricide (tick dip)','100ml','bottle','Animal health'],['Antibiotic injection','','bottle','Animal health'],['Pesticide','','bottle','Crop protection'],['Herbicide','1L','bottle','Crop protection'],['Fungicide','','pkt','Crop protection'],['Knapsack sprayer','','pc','Equipment'],['Day-old chicks','','pc','Livestock']],
 boutique:[['T-shirt','','pc','Tops'],['Shirt','','pc','Tops'],['Blouse','','pc','Tops'],['Sweater','','pc','Tops'],['Jacket','','pc','Tops'],['Trousers','','pc','Bottoms'],['Jeans','','pc','Bottoms'],['Skirt','','pc','Bottoms'],['Dress','','pc','Dresses'],['Shoes','','pair','Shoes'],['Sandals','','pair','Shoes'],['Socks','','pair','Accessories'],['Underwear','','pc','Accessories'],['Belt','','pc','Accessories'],['Handbag','','pc','Accessories'],['School uniform','','set','Uniforms']]};
const catalog=()=>CATALOG[S.shop.type]||CATALOG.general;
function quickAdd(tab){closeEdit();S.qaTab=tab||S.qaTab||'pick';S.qa=S.qa||{};
 document.body.insertAdjacentHTML('beforeend',`<div class="modal"><div class="sheet" style="max-height:96vh"><h3>Quick add products</h3>
 <div class="m"><button class="${S.qaTab=='pick'?'on':''}" onclick="quickAdd('pick')">Pick common items</button><button class="${S.qaTab=='type'?'on':''}" onclick="quickAdd('type')">Type a list</button></div>
 <div id="qa">${S.qaTab=='pick'?qaPick():qaType()}</div><p><button onclick="closeEdit()" style="width:100%">Close</button></p></div></div>`)}
// 1) Pick common items
function qaPick(){const have=new Set(S.products.map(p=>(p.name+'|'+(p.variant||'')).toLowerCase()));
 const L=catalog().filter(([n,v])=>!have.has((n+'|'+v).toLowerCase()));
 return`<p class="lb">Type the <b>selling price</b> for each item you sell. Buying price and quantity are optional but give you profit and stock alerts. Items without a selling price are skipped.</p>
 <input placeholder="Search" oninput="const q=this.value.toLowerCase();document.querySelectorAll('#qal .row').forEach(r=>r.style.display=r.dataset.n.includes(q)?'':'none')">
 <div id="qal">${L.map(([n,v,u],i)=>{const k=n+'|'+v,x=S.qa[k]||{};return`<div class="row" data-n="${esc((n+' '+v).toLowerCase())}"><div style="flex:1">${esc(n)}${v?' · '+esc(v):''}<small>per ${esc(u)}</small></div>
  <div class="qa3"><input type="number" step="any" inputmode="decimal" placeholder="Buy" value="${x.b??''}" oninput="qaSet('${esc(k)}','b',this.value)"><input type="number" step="any" inputmode="decimal" placeholder="Sell" value="${x.s??''}" oninput="qaSet('${esc(k)}','s',this.value)"><input type="number" step="any" inputmode="decimal" placeholder="Qty" value="${x.q??''}" oninput="qaSet('${esc(k)}','q',this.value)"></div></div>`}).join('')||'<p>You already have all the common items. Use "Type a list" for others.</p>'}</div>
 <p class="lb">Missing something? Use <a href="#" onclick="quickAdd('type');return false">Type a list</a>.</p>
 <button class="p sticky" id="qasave" style="width:100%" onclick="qaPickSave(this)">${qaLabel()}</button>`}
function qaSet(k,f,v){S.qa[k]=S.qa[k]||{};S.qa[k][f]=v;const b=$('#qasave');if(b)b.textContent=qaLabel()}
const qaLabel=()=>{const n=Object.values(S.qa||{}).filter(x=>+x.s>0).length;return n?`Save ${n} product(s)`:'Save products'}
function qaPickSave(btn){const items=[];
 for(const[n,v,u,c]of catalog()){const x=S.qa[n+'|'+v];if(!x||!(+x.s>0))continue;
  items.push({name:n,variant:v||null,category:c,sku:null,unit:unitsFor().includes(u)?u:unitsFor()[0],buy:+x.b>0?+x.b:null,sell:+x.s,qty:+x.q>0?+x.q:null,reorder:null,expiry:null,match:null})}
 if(!items.length)return alert('Type a selling price for at least one item');
 if(planFull(items.length))return;S.imp=items;S.qa={};runImport(btn)}
// 2) Type or paste a list, one product per line, e.g. "Sugar 150 180 50kg"
const UNIT_WORDS={kg:'kg',kgs:'kg',kilo:'kg',kilos:'kg',g:'g',gm:'g',gms:'g',l:'L',ltr:'L',ltrs:'L',litre:'L',litres:'L',liter:'L',ml:'ml',m:'m',metre:'m',meter:'m',metres:'m',
 pc:'pc',pcs:'pc',piece:'pc',pieces:'pc',pkt:'pkt',pkts:'pkt',packet:'pkt',packets:'pkt',bag:'bag',bags:'bag',box:'box',boxes:'box',bottle:'bottle',bottles:'bottle',btl:'bottle',
 dozen:'dozen',doz:'dozen',tray:'tray',trays:'tray',roll:'roll',rolls:'roll',sheet:'sheet',sheets:'sheet',pair:'pair',pairs:'pair',set:'set',sets:'set',strip:'strip',strips:'strip',length:'length',lengths:'length'};
function parseLine(line){let t=line.replace(/\b(ksh|kshs|kes|sh|shs|bob)\.?\b/gi,' ').replace(/\/=/g,' ').replace(/[@x×]\s*(?=\d)/gi,' ').trim();if(!t)return null;
 let parts;const commas=t.split(',').map(x=>x.trim());
 if(commas.length>=2&&commas.slice(1).every(x=>/^[\d.]+\s*[a-z]*$/i.test(x)||!x))parts=[commas[0],...commas.slice(1).filter(Boolean)];
 else parts=t.replace(/(\d),(\d{3})\b/g,'$1$2').split(/[\s,;]+/).filter(Boolean);
 // "50 kg" -> "50kg"
 for(let i=parts.length-1;i>0;i--)if(UNIT_WORDS[parts[i].toLowerCase()]&&/^\d+(\.\d+)?$/.test(parts[i-1])){parts[i-1]+=parts[i];parts.splice(i,1)}
 const tail=[];
 while(parts.length>1&&tail.length<3){const m=parts[parts.length-1].match(/^(\d+(?:\.\d+)?)\s*([a-z]*)$/i);if(!m)break;
  const u=m[2]?UNIT_WORDS[m[2].toLowerCase()]:null;if(m[2]&&!u)break;tail.unshift({n:+m[1],u});parts.pop()}
 const name=(parts.length?parts.join(' '):'').replace(/\s+/g,' ').replace(/^(?:[-*•]|\d+[.)])\s+/,'').trim();if(!name)return null;
 let buy=null,sell=null,qty=null,unit=null;const uq=tail.findIndex(x=>x.u);
 if(uq>=0){qty=tail[uq].n;unit=tail[uq].u;const rest=tail.filter((_,i)=>i!=uq);if(rest.length>=2){buy=rest[0].n;sell=rest[1].n}else if(rest.length==1)sell=rest[0].n}
 else if(tail.length==3){buy=tail[0].n;sell=tail[1].n;qty=tail[2].n}else if(tail.length==2){sell=tail[0].n;qty=tail[1].n}else if(tail.length==1)sell=tail[0].n;
 return{name:name.slice(0,120),buy,sell,qty,unit}}
function qaType(){return`<p class="lb">Write one product per line: <b>name, buying price, selling price, quantity</b>. Like an SMS. You can also paste a list from WhatsApp.</p>
 <div class="card"><small>Sugar 150 180 50kg<br>Bread 55 60 20<br>Omo 500g 120 140 24pkt<br>Matches 3 5</small><small>3 numbers = buy, sell, quantity · 2 numbers = sell, quantity · 1 number = sell</small></div>
 <textarea id="qat" rows="8" style="width:100%;padding:12px;margin:8px 0;border:1px solid var(--line);border-radius:10px;font:inherit;background:var(--card);color:var(--tx)" placeholder="Sugar 150 180 50kg" oninput="lsSet('duka:qat',this.value)">${esc(lsGet('duka:qat')||'')}</textarea>
 <button class="p" style="width:100%" onclick="qaCheck()">Check my list</button><div id="qap"></div>`}
function qaCheck(){const lines=$('#qat').value.split(/\r?\n/),items=[],bad=[],units=unitsFor();
 lines.forEach((l,i)=>{if(!l.trim())return;const r=parseLine(l);if(!r||r.sell==null)return bad.push(i+1);
  const unit=r.unit&&units.includes(r.unit)?r.unit:(r.unit||null);
  const match=S.products.find(p=>p.name.toLowerCase()==r.name.toLowerCase()&&!p.variant);
  items.push({name:r.name,variant:null,category:null,sku:null,unit,buy:r.buy,sell:r.sell,qty:r.qty,reorder:null,expiry:null,match})});
 if(!items.length)return $('#qap').innerHTML='<p class="low">No products found. Each line needs a name and at least a selling price, e.g. "Bread 60".</p>';
 S.imp=items;
 $('#qap').innerHTML=`${bad.length?`<p class="low">Line(s) ${bad.join(', ')} need a selling price and were skipped.</p>`:''}
  ${items.map(i=>`<div class="row"><div>${esc(i.name)}<small>${i.match?'update · ':''}buy ${i.buy!=null?kes(i.buy):'-'} · sell ${kes(i.sell)} · qty ${i.qty!=null?i.qty+' '+esc(i.unit||(i.match&&i.match.unit)||'pc'):'-'}</small></div></div>`).join('')}
  <p class="lb">Check the numbers. If something is wrong, fix the line above and tap Check again.</p>
  <button class="p" style="width:100%" onclick="if(!planFull(S.imp.filter(i=>!i.match).length)){lsSet('duka:qat','');runImport(this)}">Save ${items.length} product(s)</button>`}
function planFull(n){if(S.shop.plan=='basic'&&S.products.length+n>300){alert(`Your Basic plan allows 300 products. This would bring you to ${S.products.length+n}. Upgrade to Standard for unlimited products.`);return true}return false}
// 3) Scan to add: unknown barcodes open a short "new product" form
function stockScanned(code){const p=S.products.find(x=>x.sku&&x.sku.toLowerCase()==code.toLowerCase());
 if(p){S.sq=code;render();return}newFromBarcode(code)}
function newFromBarcode(code){closeEdit();document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target==this)closeEdit()"><div class="sheet">
 <h3>New product</h3><p class="lb">Barcode ${esc(code)} is not in your shop yet.</p>
 <input id="nbn" placeholder="Name"><div class="g"><input id="nbb" type="number" step="any" inputmode="decimal" placeholder="Buy price"><input id="nbs" type="number" step="any" inputmode="decimal" placeholder="Sell price"></div>
 <div class="g"><input id="nbq" type="number" step="any" inputmode="decimal" placeholder="Quantity in stock"><select id="nbu">${unitsFor().map(u=>`<option>${u}</option>`).join('')}</select></div>
 <div class="m"><button onclick="closeEdit()">Cancel</button><button class="p" onclick="saveFromBarcode('${esc(code)}',this,false)">Save</button><button class="p" onclick="saveFromBarcode('${esc(code)}',this,true)">Save & scan next</button></div></div></div>`);
 setTimeout(()=>$('#nbn')&&$('#nbn').focus(),50)}
async function saveFromBarcode(code,btn,next){const n=$('#nbn').value.trim();if(!n)return alert('Enter a name');if(!(+$('#nbs').value>0))return alert('Enter the selling price');
 if(planFull(1))return;btn.disabled=true;
 const {error}=await sb.from('products').insert({shop_id:S.shop.id,name:n.slice(0,120),sku:code,buy_price:+$('#nbb').value||0,sell_price:+$('#nbs').value,stock_qty:+$('#nbq').value||0,unit:$('#nbu').value,low_stock_at:5});
 if(error){btn.disabled=false;return alert(/products_shop_sku/.test(error.message)?'That barcode is already used by another product':error.message)}
 closeEdit();await load();saveCache();render();toast('✓ '+n+' added');if(next)scanInto(null,stockScanned)}

// ---------- Stock-take: count the shelf, see what is missing ----------
const STK=()=>'duka:stocktake:'+S.shop.id;
function stocktake(){if(!S.products.length)return alert('Add products first');S.stc=lsGet(STK(),true)||{};S.stq='';
 document.body.insertAdjacentHTML('beforeend',`<div class="modal"><div class="sheet" style="max-height:96vh">
 <h3>Stock-take</h3><p class="lb">Count what is on the shelf and type the number. Leave blank anything you did not count. Your counts are saved on this phone until you apply them.</p>
 <input id="stks" placeholder="Search" oninput="S.stq=this.value;$('#stk').innerHTML=stkList()"><div id="stk">${stkList()}</div>
 <div class="m"><button onclick="closeEdit()">Close</button><button class="p" id="stkr" onclick="stkReview()">Review counts</button></div></div></div>`)}
function stkMode(review){const a=$('#stks'),b=$('#stkr');if(a)a.style.display=review?'none':'';if(b)b.style.display=review?'none':''}
function stkList(){const q=(S.stq||'').toLowerCase();
 return S.products.filter(p=>!q||[p.name,p.variant,p.category,p.sku].join(' ').toLowerCase().includes(q)).sort((a,b)=>(a.category||'').localeCompare(b.category||'')||a.name.localeCompare(b.name))
  .map(p=>`<div class="row"><div>${pn(p)}<small>System: ${fq(p.stock_qty)} ${esc(p.unit)}${p.category?' · '+esc(p.category):''}</small></div><input style="width:96px;margin:0" type="number" step="any" inputmode="decimal" placeholder="Count" value="${S.stc[p.id]??''}" oninput="stkSet('${p.id}',this.value)"></div>`).join('')||'<p>No products match.</p>'}
function stkSet(id,v){if(v==='')delete S.stc[id];else S.stc[id]=v;lsSet(STK(),S.stc)}
function stkReview(){const L=Object.entries(S.stc).map(([id,v])=>{const p=S.products.find(x=>x.id==id);return p&&{p,c:+v,d:rq(+v-p.stock_qty)}}).filter(x=>x&&x.c>=0&&isFinite(x.c));
 if(!L.length)return alert('Type at least one count');const ch=L.filter(x=>x.d);stkMode(true);
 const miss=ch.filter(x=>x.d<0),extra=ch.filter(x=>x.d>0),vm=r2(miss.reduce((a,x)=>a-x.d*x.p.buy_price,0)),ve=r2(extra.reduce((a,x)=>a+x.d*x.p.buy_price,0));
 $('#stk').innerHTML=`<div class="g"><div class="card">Counted<b>${L.length}</b><small>${L.length-ch.length} match the system</small></div><div class="card">Missing<b class="${vm?'low':''}">${kes(vm)}</b><small>${miss.length} product(s), at buying price</small></div></div>
  ${extra.length?`<p class="lb">Extra found: ${kes(ve)} in ${extra.length} product(s).</p>`:''}
  ${ch.sort((a,b)=>a.d*a.p.buy_price-b.d*b.p.buy_price).map(x=>`<div class="row"><div>${pn(x.p)}<small>System ${fq(x.p.stock_qty)} → counted ${fq(x.c)} ${esc(x.p.unit)}</small></div><b class="${x.d<0?'low':''}">${x.d>0?'+':''}${fq(x.d)} · ${kes(r2(x.d*x.p.buy_price))}</b></div>`).join('')||'<p>Everything you counted matches. 🎉</p>'}
  ${ch.length?`<button class="p" style="width:100%" onclick="stkApply(this)">Apply ${ch.length} correction(s)</button>`:''}<p><button class="s" onclick="stkMode(false);$('#stk').innerHTML=stkList()">← Back to counting</button></p>`}
async function stkApply(btn){btn.disabled=true;const counts=Object.entries(S.stc).filter(([,v])=>v!==''&&+v>=0).map(([id,v])=>({id,qty:+v}));
 const {data,error}=await sb.rpc('apply_stocktake',{p_shop:S.shop.id,p_counts:counts});if(error){btn.disabled=false;return alert(error.message)}
 const r=data&&data[0]||{};lsSet(STK(),'');S.stc={};closeEdit();await load();saveCache();render();
 alert(`Stock-take saved ✔ ${r.changed||0} product(s) corrected.${+r.value_missing?' Missing: '+kes(r.value_missing)+'.':''}`)}

// ---------- Camera barcode scanning (Android Chrome; other phones can use a scanner or type) ----------
async function scanInto(inputId,cb){
 if(!('BarcodeDetector' in window)||!navigator.mediaDevices)return alert('This browser cannot scan with the camera. Use Chrome on Android, a barcode scanner, or type the code.');
 let det;try{det=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']})}catch(e){det=new BarcodeDetector()}
 document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="scanm"><div class="sheet"><h3>Point the camera at the barcode</h3>
  <video id="scv" playsinline muted style="width:100%;border-radius:12px;background:#000;max-height:60vh"></video><p><button style="width:100%" onclick="stopScan()">Cancel</button></p></div></div>`);
 try{S.scs=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})}catch(e){stopScan();return alert('Camera not allowed. Allow camera access for this site and try again.')}
 const v=$('#scv');v.srcObject=S.scs;await v.play().catch(()=>{});
 const tick=async()=>{if(!S.scs)return;try{const r=await det.detect(v);if(r&&r.length){const code=r[0].rawValue;stopScan();try{navigator.vibrate&&navigator.vibrate(60)}catch(e){}
   if(inputId){const el=$('#'+inputId);if(el)el.value=code}if(cb)cb(code);return}}catch(e){}setTimeout(tick,250)};tick()}
function stopScan(){if(S.scs){S.scs.getTracks().forEach(t=>t.stop());S.scs=null}const m=$('#scanm');if(m)m.remove()}
function sellScanned(code){const p=S.products.find(x=>x.sku&&x.sku.toLowerCase()==code.toLowerCase());
 if(p)return add(p.id);
 if(S.role=='owner'&&confirm('No product has barcode '+code+'. Add it to your stock now?'))return newFromBarcode(code);
 alert('No product has barcode '+code+'. Ask the owner to add it in Stock.')}

