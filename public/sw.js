self.addEventListener('push', function(event) {
  let title = 'Faculty Club Notification';
  let body = 'You have a new announcement.';

  if (event.data) {
    const data = event.data.json();
    title = data.title || title;
    body = data.message || body;
  }

  const options = {
    body: body,
    icon: '/vite.svg',
    tag: 'faculty-club-announcement-' + Date.now(),
    vibrate: [200, 100, 200, 100, 200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
