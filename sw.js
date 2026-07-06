const CACHE = 'xposter-v10';

const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  '/manifest.json'
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// Network First Strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          return cachedResponse || caches.match('/index.html');
        });
      })
  );
});

// Notification Click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  // If user clicked Dismiss button, just return
  if (event.action === 'dismiss') {
    return;
  }

  const post = event.notification.data?.post || '';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // Navigate to the app with a param instead of directly to Twitter
      const appUrl = '/?pendingPost=' + encodeURIComponent(post);

      if (clientList.length > 0) {
        clientList[0].focus();
        return clientList[0].navigate(appUrl);
      }
      return clients.openWindow(appUrl);
    })
  );
});

// Alarm Check
self.addEventListener('message', event => {

  if (!event.data) return;
  
  if (event.data.type === 'TRIGGER_ALARM') {
    const alarm = event.data.alarm;
    if (!alarm || !alarm.post) return;
    self.registration.showNotification('⏰ Time to post on X!', {
      body: alarm.post.substring(0, 120) + (alarm.post.length > 120 ? '...' : ''),
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `post-${alarm.time}`,
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'post', title: '📤 Post Now', icon: '/icon-192.png' },
        { action: 'dismiss', title: '❌ Dismiss', icon: '/icon-192.png' }
      ],
      data: {
        post: alarm.post
      }
    });
    return;
  }

  if (event.data.type !== 'CHECK_ALARMS') {
    return;
  }

  const alarms = event.data.alarms || [];

  const now = new Date();

  const hhmm =
    String(now.getHours()).padStart(2, '0') +
    ':' +
    String(now.getMinutes()).padStart(2, '0');

  alarms.forEach(alarm => {

    if (
      alarm.time === hhmm &&
      alarm.post
    ) {

      self.registration.showNotification(
        '⏰ Time to post on X!',
        {
          body:
            alarm.post.substring(0, 120) +
            (alarm.post.length > 120 ? '...' : ''),

          icon: '/icon-192.png',
          badge: '/icon-192.png',

          tag: `post-${alarm.time}`,

          renotify: true,
          requireInteraction: true,

          data: {
            post: alarm.post
          }
        }
      );
    }

  });

});