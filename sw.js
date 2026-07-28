/* LES QUATRE CASES — service worker.
   Dépôt dédié : le cache garde tout de même un nom propre au jeu, et la purge ne
   touche que les caches commençant par ce préfixe. Bumper à chaque déploiement,
   EN MÊME TEMPS que BUILD_TAG dans index.html. */
const CACHE = 'les4cases-v103';
const PREFIXE = 'les4cases-';
const ASSETS = ['./','./index.html','./manifest.json',
  './icon-192.png','./icon-512.png','./icon-180.png','./icon-maskable-512.png','./favicon.ico'];

/* PAS de skipWaiting ici : la nouvelle version doit ATTENDRE, sinon elle s'active
   toute seule et la page ne peut jamais proposer « Mettre à jour ». C'est le bouton
   du joueur qui déclenche la bascule, via le message ci-dessous. */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('install', e => {
  // fichier par fichier : addAll rejette en bloc si un seul manque, et le cache reste vide
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(u => c.add(u).catch(()=>{})))).catch(()=>{}));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(
      ks.filter(k => k.startsWith(PREFIXE) && k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // laisse passer Google Fonts & co.
  const estHTML = req.mode === 'navigate' || url.pathname === '/' ||
                  url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (estHTML) {                                       // réseau d'abord : jamais bloqué sur une vieille version
    e.respondWith(
      fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)).catch(()=>{}); return res; })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(                                       // le reste : cache d'abord
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)).catch(()=>{}); return res;
    }).catch(() => caches.match('./index.html')))
  );
});
