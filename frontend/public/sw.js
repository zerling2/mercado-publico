self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch {}

  const title = data.title ?? 'Mercado Público';
  const options = {
    body:  data.body  ?? '',
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
    data:  { url: data.url ?? '/' },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const win = list.find(c => c.url === url && 'focus' in c);
      if (win) return win.focus();
      return clients.openWindow(url);
    })
  );
});
