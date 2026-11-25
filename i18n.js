// Kiswahili / English. The app is written in English; when Kiswahili is chosen this file
// translates text on screen (including pop-ups) as it appears. Shop data (product, customer
// and shop names) is left alone because it only matches whole, known phrases.
(function () {
  const SW = {
    // Navigation & common
    'Sell': 'Uza', 'Stock': 'Stoo', 'Debts': 'Madeni', 'Today': 'Leo', 'Admin': 'Usimamizi',
    'Save': 'Hifadhi', 'Cancel': 'Ghairi', 'Close': 'Funga', 'Edit': 'Hariri', 'Remove': 'Ondoa',
    'Log out': 'Toka', 'Back': 'Rudi', 'Name': 'Jina', 'Price': 'Bei', 'Qty': 'Idadi', 'Receipt': 'Risiti',
    'Try again': 'Jaribu tena', 'Sync now': 'Tuma sasa', '💬 Help': '💬 Msaada',
    '🌗 Switch light / dark': '🌗 Badilisha mwanga / giza', '🖨 Print': '🖨 Chapisha',
    // Sign in & setup
    'Sales, stock and debts for your shop.': 'Mauzo, stoo na madeni ya duka lako.',
    'Email': 'Barua pepe', 'Password (8+ characters)': 'Nenosiri (herufi 8 au zaidi)', 'New password (8+ characters)': 'Nenosiri jipya (herufi 8 au zaidi)',
    'Use 8 or more characters': 'Tumia herufi 8 au zaidi',
    'That referral or agent code is not valid. It has been cleared: check it or tap Start to continue without a code.': 'Msimbo huo wa rufaa au wakala si sahihi. Umeondolewa: uhakikishe au bonyeza Anza kuendelea bila msimbo.',
    'Log in': 'Ingia', 'Create account': 'Fungua akaunti', 'Forgot password?': 'Umesahau nenosiri?',
    'Simple pricing': 'Bei rahisi', 'Most popular': 'Maarufu zaidi',
    'Set up your shop': 'Sajili duka lako', '30 days free.': 'Siku 30 bure.', 'Shop name': 'Jina la duka',
    'Shop phone (optional)': 'Simu ya duka (si lazima)', 'Start': 'Anza',
    'Referral or agent code (optional)': 'Msimbo wa rufaa au wakala (si lazima)',
    'New password': 'Nenosiri jipya', 'Save password': 'Hifadhi nenosiri',
    // Sell
    'Search product': 'Tafuta bidhaa', '+ Add': '+ Ongeza', 'Cart': 'Kikapu', 'Cash': 'Pesa taslimu',
    'M-Pesa': 'M-Pesa', 'Debt': 'Deni', 'Choose customer': 'Chagua mteja',
    'No products. Add some in Stock.': 'Hakuna bidhaa. Ongeza kwenye Stoo.',
    'Sale saved ✔': 'Mauzo yamehifadhiwa ✔', 'Sale saved on this phone ✔': 'Mauzo yamehifadhiwa kwenye simu hii ✔',
    'You are offline. It will sync automatically when you are back online.': 'Huna mtandao. Yatatumwa yenyewe mtandao ukirudi.',
    'WhatsApp': 'WhatsApp',
    // Stock
    'Add product': 'Ongeza bidhaa', 'Buy price': 'Bei ya kununua', 'Sell price': 'Bei ya kuuza',
    'Quantity in stock': 'Idadi iliyopo', 'Warn me when stock reaches': 'Nijulishe stoo ikifika',
    'Save product': 'Hifadhi bidhaa', '+ Stock': '+ Stoo', 'No products yet.': 'Bado hakuna bidhaa.',
    'Category (optional)': 'Aina (si lazima)', 'SKU / barcode (optional)': 'SKU / msimbo (si lazima)',
    'Expiry date (earliest on the shelf)': 'Tarehe ya mwisho wa matumizi', 'Edit product': 'Hariri bidhaa',
    'Stock quantity': 'Idadi ya stoo', 'Unit': 'Kipimo', 'Remove product': 'Ondoa bidhaa', 'Category': 'Aina',
    'SKU / barcode': 'SKU / msimbo',
    // Debts
    'Add customer': 'Ongeza mteja', 'Phone e.g. 0712345678': 'Simu mf. 0712345678', 'Save customer': 'Hifadhi mteja',
    'Paid': 'Amelipa', 'Remind': 'Kumbusha', 'SMS': 'SMS', 'No debts. 🎉': 'Hakuna madeni. 🎉',
    'No customers yet.': 'Bado hakuna wateja.',
    // Today
    'Sales': 'Mauzo', 'Cash in': 'Pesa iliyoingia', 'New debt': 'Deni jipya', 'Profit (est.)': 'Faida (makadirio)',
    'Total owed': 'Jumla ya madeni', 'Stock value': 'Thamani ya stoo', 'at cost price': 'kwa bei ya kununua',
    "📤 Send today's summary on WhatsApp": '📤 Tuma muhtasari wa leo WhatsApp', 'Today by payment': 'Leo kwa njia ya malipo',
    'Last 7 days': 'Siku 7 zilizopita', 'Top sellers (7 days)': 'Zinazouzwa zaidi (siku 7)', 'Recent sales': 'Mauzo ya karibuni',
    'Void': 'Batilisha', 'Running low': 'Zinakaribia kuisha', 'Nothing low.': 'Hakuna inayokaribia kuisha.',
    'Expiry watch (30 days)': 'Zinazokaribia kuisha muda (siku 30)', 'Nothing expiring soon.': 'Hakuna inayokaribia kuisha muda.',
    'Staff': 'Wafanyakazi', 'Staff email': 'Barua pepe ya mfanyakazi', 'Add staff': 'Ongeza mfanyakazi',
    'Active': 'Yuko hai', 'Waiting for them to sign up': 'Bado hajajisajili',
    'Download your data': 'Pakua data yako', 'Customers': 'Wateja', 'Plan': 'Mpango', 'Plans': 'Mipango',
    'Renew / upgrade': 'Lipia / panda daraja', 'Upgrade': 'Panda daraja', 'Shop details': 'Maelezo ya duka',
    'KRA PIN': 'PIN ya KRA', 'Not set. It is printed on receipts.': 'Haijawekwa. Huchapishwa kwenye risiti.',
    'Branches': 'Matawi', 'Add branch': 'Ongeza tawi', 'Shop': 'Duka',
    'Invite a shop, get a free month': 'Alika duka, upate mwezi bure', 'Share on WhatsApp': 'Shiriki WhatsApp',
    'See your profit, stock value and best sellers': 'Ona faida, thamani ya stoo na zinazouzwa zaidi',
    'Included in Standard and Premium.': 'Iko kwenye Standard na Premium.',
    // Plans & payment
    'How to pay': 'Jinsi ya kulipa', 'Send M-Pesa code on WhatsApp': 'Tuma msimbo wa M-Pesa WhatsApp',
    'Pay now with M-Pesa': 'Lipa sasa kwa M-Pesa', 'Or pay manually': 'Au lipa mwenyewe', 'Period': 'Muda',
    'M-Pesa phone number': 'Namba ya simu ya M-Pesa', 'Free trial ended': 'Muda wa majaribio umeisha',
    'Subscription ended': 'Usajili umeisha', 'Free trial': 'Majaribio ya bure',
    'You can still download your records:': 'Bado unaweza kupakua rekodi zako:',
    'Ask the shop owner to renew the subscription.': 'Mwambie mwenye duka alipie usajili.',
    'Sending request…': 'Inatuma ombi…', 'Check your phone and enter your M-Pesa PIN…': 'Angalia simu yako uweke PIN ya M-Pesa…',
    // Pop-ups
    'Enter a name': 'Weka jina', 'Enter the shop name': 'Weka jina la duka', 'Choose a customer': 'Chagua mteja',
    'Amount paid now (0 if none)': 'Kiasi kilicholipwa sasa (0 kama hakuna)', 'M-Pesa code (optional)': 'Msimbo wa M-Pesa (si lazima)',
    'Quantity added': 'Idadi iliyoongezwa', 'Name of the new branch': 'Jina la tawi jipya',
    'Send an SMS reminder to this customer?': 'Tuma ukumbusho kwa SMS kwa mteja huyu?', 'SMS sent ✔': 'SMS imetumwa ✔',
    'SMS reminders are part of the Premium plan.': 'Ukumbusho wa SMS uko kwenye mpango wa Premium.',
    'Enter your M-Pesa phone number': 'Weka namba yako ya M-Pesa',
    'You are offline. This needs internet. Selling still works offline.': 'Huna mtandao. Hii inahitaji intaneti. Kuuza bado kunawezekana bila mtandao.',
    'Void this sale? Stock is put back and any debt from it is cancelled.': 'Batilisha mauzo haya? Stoo itarudishwa na deni lake litafutwa.',
    'Remove this staff member?': 'Ondoa mfanyakazi huyu?', 'Password updated': 'Nenosiri limebadilishwa',
    'Check your email to confirm, then log in.': 'Angalia barua pepe yako uthibitishe, kisha uingie.',
    'Type your email first, then tap Forgot password': 'Andika barua pepe kwanza, kisha bonyeza Umesahau nenosiri',
  };
  const RX = [
    [/^Sell · (.+)$/, 'Uza · $1'],
    [/^(-?[\d.,]+) (.+) left$/, '$1 $2 zimebaki'],
    [/^Who owes you \((.+)\)$/, 'Wanaokudai ($1)'],
    [/^All customers \((\d+)\)$/, 'Wateja wote ($1)'],
    [/^(\d+) customer\(s\)$/, 'wateja $1'],
    [/^Paid until (.+)$/, 'Imelipwa hadi $1'],
    [/^· (\d+) item\(s\)$/, '· bidhaa $1'],
    [/^(\d+) item\(s\)$/, 'bidhaa $1'],
    [/^Pay (KES .+)$/, 'Lipa $1'],
    [/^Payment received ✔ Paid until (.+)$/, 'Malipo yamepokelewa ✔ Imelipwa hadi $1'],
    [/^Your code: (.+)$/, 'Msimbo wako: $1'],
  ];
  let lang = 'en';
  try { lang = localStorage.getItem('lang') || 'en'; } catch (e) { /* private mode */ }
  window.LANG = lang === 'sw' ? 'sw' : 'en';
  document.documentElement.lang = window.LANG;

  const tr = (s) => {
    if (window.LANG !== 'sw' || !s) return s;
    const k = String(s).trim();
    if (!k) return s;
    let out = SW[k];
    if (out === undefined) for (const [re, v] of RX) if (re.test(k)) { out = k.replace(re, v); break; }
    return out === undefined ? s : String(s).replace(k, out);
  };
  window.T = tr;

  function walk(n) {
    if (n.nodeType === 3) { const t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; return; }
    if (n.nodeType !== 1 || n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.hasAttribute('data-nt')) return;
    if (n.placeholder) { const t = tr(n.placeholder); if (t !== n.placeholder) n.placeholder = t; }
    for (const c of n.childNodes) walk(c);
  }
  if (window.LANG === 'sw') {
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) walk(n); })
      .observe(document.documentElement, { childList: true, subtree: true });
    for (const f of ['alert', 'confirm', 'prompt']) {
      const orig = window[f].bind(window);
      window[f] = (msg, ...rest) => orig(tr(String(msg ?? '')), ...rest);
    }
  }
  window.setLang = (l) => { try { localStorage.setItem('lang', l); } catch (e) { /* ignore */ } location.reload(); };
})();
