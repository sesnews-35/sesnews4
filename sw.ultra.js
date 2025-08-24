const CACHE = 'shesh-news-ultra-v1';
const ASSETS = [
  './','./index.html','./news.html','./assets/css/styles.css','./assets/css/print.css',
  './assets/js/app.ultra.js','./assets/js/config.js','./assets/js/detail.ultra.js','./assets/js/instant-nav.js',
  './assets/img/placeholder.jpg','./assets/img/icon-192.png','./assets/img/icon-512.png','./assets/img/og.jpg',
  './data/news.json','./manifest.webmanifest'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{ e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  if(url.pathname.endsWith('/data/news.json')){
    e.respondWith((async()=>{
      const c = await caches.open(CACHE);
      const cached = await c.match(e.request);
      const net = fetch(e.request).then(res=>{ if(res.ok) c.put(e.request, res.clone()); return res; }).catch(()=>cached);
      return cached || net;
    })());
  } else if(url.pathname.includes('/assets/img/')) {
    e.respondWith(caches.match(e.request).then(res=> res || fetch(e.request).then(r=>{
      return caches.open(CACHE).then(c=>{ c.put(e.request, r.clone()); return r; });
    })));
  } else {
    e.respondWith(caches.match(e.request).then(res=> res || fetch(e.request)));
  }
});

self.addEventListener('push', e=>{
  const data = e.data ? e.data.json() : {title:'শেষ নিউজ', body:'নতুন আপডেট এসেছে'};
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon:'./assets/img/icon-192.png' }));
});