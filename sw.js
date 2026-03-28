const CACHE = 'dayflow-v2';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
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
