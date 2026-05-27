// ── Versão do cache — atualize em CADA novo deploy ──────────────────────────
// Formato: YYYYMMDD-N  (N = número se houver mais de um deploy no mesmo dia)
const CACHE = 'panutrir-v20260527-1';

// Instala imediatamente, sem aguardar tabs antigas fecharem
self.addEventListener('install', () => self.skipWaiting());

// Ativa, apaga caches antigos e assume controle de todas as abas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // HTML (navegação): rede sempre — se offline, cache como fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Recursos externos (CDNs): rede direta, sem cache local
  if (url.origin !== location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  // Recursos próprios (logo, ícones): cache-first com atualização em background
  event.respondWith(
    caches.match(req).then(cached => {
      const fromNetwork = fetch(req).then(response => {
        if (response.ok) {
          caches.open(CACHE).then(c => c.put(req, response.clone()));
        }
        return response;
      });
      return cached || fromNetwork;
    })
  );
});
