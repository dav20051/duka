// Offline support: keeps the app itself on the phone. Shop data and the offline sales
// queue live in the page (localStorage); this worker never caches Supabase API calls.
const VERSION = 'duka-v10';
const SHELL = [
  './', 'index.html', 'i18n.js', 'manifest.webmanifest',
  'vendor/supabase-js-2.45.4.js', 'vendor/591.supabase.js',
  'icons/icon-192.png', 'icons/icon-512.png',
  'privacy.html', 'terms.html', 'legal.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Pages: try the network first so updates arrive, fall back to the saved copy.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req)
      .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('./', copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./'))));
    return;
  }
  // Files: serve the saved copy at once and refresh it in the background.
  e.respondWith(caches.match(req).then((cached) => {
    const fresh = fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
