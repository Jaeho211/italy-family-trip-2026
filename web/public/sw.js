/* React PWA at the project root. Generated at publish time from built Vite files.
   The separate /legacy/ MkDocs service worker maintains its own scope/cache. */
const VERSION = '__VERSION__';
const CACHE_NAME = 'italy-react-' + VERSION;
const PRECACHE = __PRECACHE__;
const ROOT = new URL('./', self.registration.scope).href;
const SCOPE_PATH = new URL(ROOT).pathname;

function isLegacyPath(path) {
  return path.startsWith(SCOPE_PATH + 'legacy/')
    || path.startsWith(SCOPE_PATH + 'preview/')
    || path.startsWith(SCOPE_PATH + 'assets/map/');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(
      PRECACHE.map((path) => new Request(new URL(path, ROOT).href, {cache: 'reload'}))
    ))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('italy-react-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_PATH)
      || isLegacyPath(url.pathname)) return;

  const path = url.pathname.slice(SCOPE_PATH.length);
  const isDocument = request.mode === 'navigate';
  const isTripData = path === 'data/trip-data.json';
  const normalized = new URL(request.url);
  normalized.search = '';
  normalized.hash = '';

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (isDocument || isTripData) {
      try {
        const response = await fetch(request);
        if (response.ok && !response.redirected && response.type === 'basic') {
          await cache.put(isDocument ? ROOT : normalized.href, response.clone());
        }
        return response;
      } catch {
        const fallback = await cache.match(isDocument ? ROOT : normalized.href);
        if (fallback) return fallback;
        return new Response('오프라인에서 아직 저장되지 않은 정보입니다.', {
          status: 503,
          headers: {'Content-Type': 'text/plain; charset=utf-8'}
        });
      }
    }

    const cached = await cache.match(normalized.href);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic' && !response.redirected) {
        await cache.put(normalized.href, response.clone());
      }
      return response;
    } catch {
      return new Response('오프라인에서 사용할 수 없는 파일입니다.', {status: 503});
    }
  })());
});
