// MediTrack Service Worker - Cloud Web Push & Mobile Notification Handler
// Version: 1.0.0

const CACHE_NAME = 'meditrack-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notification from server
self.addEventListener('push', (event) => {
  let data = {
    title: 'MediTrack Reminder',
    body: 'আপনার স্বাস্থ্য রিমাইন্ডার চেক করুন।',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'meditrack-reminder',
    url: '/',
    actions: []
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  // Ensure default interactive actions for medicine reminders if none provided
  const actions = (data.actions && data.actions.length > 0) ? data.actions : [
    { action: 'take', title: '✓ ঔষধ খেয়েছি' },
    { action: 'dismiss', title: 'বন্ধ করুন' }
  ];

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'meditrack-reminder',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      id: data.id,
      doseIndex: data.doseIndex,
      type: data.type || 'general'
    },
    actions: actions
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// Handle notification interaction (tap or action button click)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';

  // Broadcast action to active clients (e.g. to mark dose taken directly)
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Notify active client if window is open
      for (const client of clientList) {
        if ('postMessage' in client) {
          client.postMessage({
            type: 'NOTIFICATION_ACTION_CLICK',
            action: action || 'open',
            data: notificationData
          });
        }
      }

      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }

      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Listen for messages from frontend
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_LOCAL_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
