// Offline copy of the guide: network first with a 3-second fallback to the cached page, so weak signal never hangs.
const CACHE = 'dc-nov-v2';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.mode !== 'navigate') {
    e.respondWith(caches.match(r, {ignoreSearch: true}).then(hit => hit || fetch(r)));
    return;
  }
  e.respondWith(new Promise(ok => {
    let done = false;
    const finish = res => { if (!done && res) { done = true; ok(res); } };
    const t = setTimeout(() => caches.match('index.html').then(finish), 3000);
    fetch(r).then(n => {
      clearTimeout(t);
      const copy = n.clone();
      caches.open(CACHE).then(c => c.put('index.html', copy));
      finish(n);
    }).catch(() => {
      clearTimeout(t);
      caches.match('index.html').then(h => finish(h || Response.error()));
    });
  }));
});
