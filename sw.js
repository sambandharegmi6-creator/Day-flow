const CACHE = 'dayflow-v3';
const BASE = self.registration.scope; // e.g. https://user.github.io/dayflow/
const ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
  BASE + 'sw.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      // Add each asset individually so one failure doesn't block the rest
      return Promise.allSettled(ASSETS.map(url => c.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always serve index.html for navigation requests (handles offline app open)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match(BASE + 'index.html').then(cached => {
        return cached || fetch(e.request).catch(() => caches.match(BASE + 'index.html'));
      })
    );
    return;
  }
  // Cache-first for all other assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        // Cache new successful responses
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(BASE + 'index.html'));
    })
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('./');
    })
  );
});

// ── SCHEDULED CHECK MESSAGE ───────────────────────────────
// The main page sends a 'scheduleCheck' message with habit data.
// The SW fires the notification if it's 8 PM and there are uncompleted habits.
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'NOTIFY_NOW') {
    const { pending, total } = e.data;
    if (pending <= 0) return;
    const body = pending === total
      ? `You haven't started yet! ${total} habit${total > 1 ? 's' : ''} waiting for you. 🌿`
      : `${pending} of ${total} habit${total > 1 ? 's' : ''} still left — finish strong! ☀️`;
    self.registration.showNotification('DayFlow — Evening Check-in 🌙', {
      body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'dayflow-evening',
      renotify: false,
      requireInteraction: false,
    });
  }
});
