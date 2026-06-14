/* Race-Tracker Service Worker
 * Zweck: lokale Benachrichtigungen anzeigen (registration.showNotification),
 * da new Notification() auf Android-Chrome verboten ist ("Illegal constructor").
 * Kein Push-Backend nötig – die Meldungen werden von der offenen Seite ausgelöst.
 */
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Klick auf eine Meldung: vorhandenen Tab fokussieren oder neuen öffnen
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      for (const c of cls) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
