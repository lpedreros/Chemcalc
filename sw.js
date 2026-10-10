// ChemCalc service worker — RETIRED (Phase 1, ChemCalc_FullSite_Blueprint.md).
// This is a kill-switch, not a cache. It exists only so browsers that already
// have the old caching worker installed get it cleanly uninstalled:
//   1. skipWaiting() on install — don't wait for old tabs to close, take over now.
//   2. On activate: delete every cache this origin owns, unregister this worker,
//      then force-reload any pages it still controls so they go back to
//      fetching straight from the network.
// index.html no longer calls navigator.serviceWorker.register("/sw.js"), so no
// new visitor ever installs this in the first place — this file only runs for
// browsers that registered the old caching version before this change shipped.
// Safe to delete this file entirely in a later phase, once it's confirmed the
// installed base has cycled through this kill-switch at least once.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        clients.forEach(client => client.navigate(client.url));
      })
  );
});
