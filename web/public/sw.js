/* Migration service worker. The old root site registered /sw.js with the
   entire GitHub Pages project scope. Replace that worker without registering
   a new offline worker for the React site. The archived /legacy/sw.js keeps
   its separate /legacy/ scope. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.unregister());
});
