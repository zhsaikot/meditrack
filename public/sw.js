// MediTrack Service Worker - Cloud Web Push & Mobile Notification Handler
// Version: 1.2.0

const CACHE_NAME = 'meditrack-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function getDefaultActions(type, language) {
  const isEn = language === 'en';
  if (type === 'water') {
    return [
      { action: 'water', title: isEn ? '💧 Drank Water' : '💧 পানি খেয়েছি' },
      { action: 'dismiss', title: isEn ? 'Dismiss' : 'বন্ধ করুন' }
    ];
  }
  if (type === 'appointment') {
    return [
      { action: 'view_appt', title: isEn ? '📋 View Details' : '📋 বিস্তারিত দেখুন' },
      { action: 'dismiss', title: isEn ? 'Dismiss' : 'বন্ধ করুন' }
    ];
  }
  return [
    { action: 'take', title: isEn ? '✓ Took Medicine' : '✓ ঔষধ খেয়েছি' },
    { action: 'dismiss', title: isEn ? 'Dismiss' : 'বন্ধ করুন' }
  ];
}

// Handle incoming Web Push notification from server
self.addEventListener('push', (event) => {
  let data = {
    title: 'MediTrack Reminder',
    body: 'Time for your health reminder.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'meditrack-reminder',
    url: '/',
    language: 'en',
    type: 'general',
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

  // Ensure contextual actions based on type and language if none provided
  const actions = (data.actions && data.actions.length > 0)
    ? data.actions
    : getDefaultActions(data.type, data.language);

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
      type: data.type || 'general',
      language: data.language || 'en'
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
  let targetUrl = notificationData.url || '/';

  if (action === 'dismiss') {
    return;
  }

  // If user clicked specific action and URL does not already have action query param, append it
  if (action === 'water' && !targetUrl.includes('action=')) {
    targetUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'action=water';
  } else if (action === 'take' && notificationData.id && !targetUrl.includes('action=')) {
    targetUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + `action=take&id=${encodeURIComponent(notificationData.id)}&dose=${notificationData.doseIndex ?? 0}`;
  } else if (action === 'view_appt') {
    targetUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + `action=view_appt&id=${encodeURIComponent(notificationData.id || '')}`;
  }

  // Broadcast action to active clients (e.g. to mark dose taken or water drank directly)
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

      // If a window is already open, focus it without hard reloading
      for (const client of clientList) {
        if ('focus' in client) {
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
