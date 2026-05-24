const CACHE = 'panutrir-cache-v1';

// Instala imediatamente, sem esperar tabs antigas fecharem
self.addEventListener('install', () => self.skipWaiting());

// Ativa, limpa caches antigos e assume controle de todas as abas abertas
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

  // HTML (navegação): sempre busca na rede — nunca serve cache do index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // CDN externas (jsPDF, ExcelJS, Chart.js etc): rede direta, sem cache local
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
