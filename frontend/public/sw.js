self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const payload = event.data.json();
      
      const title = payload.title || 'Alerte Minecraft';
      const options = {
        body: payload.body || 'Changement détecté',
        icon: payload.icon || '/logo.png',
        badge: payload.badge || '/logo.png',
        data: {
          url: payload.url || '/'
        }
      };

      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (e) {
      console.error('Error parsing push payload:', e);
      // Fallback for raw text payloads
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Alerte Minecraft', {
          body: text,
          icon: '/logo.png'
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Focus if window already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
