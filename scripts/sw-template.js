const CACHE = 'italy-journey-__VERSION__';
const PRECACHE = __PRECACHE__;
const scoped = (path) => new URL(path, self.registration.scope).href;
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((path) => new Request(scoped(path), {cache:'reload'})))));
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('italy-journey-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const normalized = new URL(url);
    normalized.search = '';
    if (normalized.pathname.endsWith('/')) normalized.pathname += 'index.html';
    const cached = await cache.match(normalized.href);
    const network = fetch(event.request).then(async (response) => {
      if (response.ok && PRECACHE.map(scoped).includes(normalized.href)) await cache.put(normalized.href, response.clone());
      return response;
    });
    try {
      if (!cached) return await network;
      return await Promise.race([network, new Promise((resolve) => setTimeout(() => resolve(cached), 2500))]);
    } catch {
      if (cached) return cached;
      return new Response('오프라인에서 아직 열 수 없는 화면입니다. 연결 후 다시 열어주세요.', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
    }
  })());
});
