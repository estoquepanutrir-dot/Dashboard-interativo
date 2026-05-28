// ═══════════════════════════════════════════════════════════════════════════
//  SERVICE WORKER AGRESSIVO — força atualização do HTML em todos os aparelhos
//  Atualize BUILD a cada deploy (ex: data + hora). É o que dispara a renovação.
// ═══════════════════════════════════════════════════════════════════════════
const BUILD = '20260528-1';
const CACHE = 'panutrir-' + BUILD;

// Instala já, sem esperar abas antigas
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Ao ativar: apaga TODOS os caches antigos e assume controle imediato
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)));
    await self.clients.claim();
    // Avisa todas as abas abertas que há versão nova → elas recarregam
    const clientsList = await self.clients.matchAll({ type: 'window' });
    for (const client of clientsList) {
      client.postMessage({ type: 'SW_UPDATED', build: BUILD });
    }
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // ── HTML / navegação: SEMPRE rede, nunca cache (impede versão velha) ──
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => caches.match(req))
    );
    return;
  }

  // ── Pantry / APIs externas: nunca cacheia (dados vivos) ──
  if (url.hostname === 'getpantry.cloud' || url.origin !== location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  // ── Recursos próprios (ícones, logo): cache-first, atualiza em background ──
  event.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(resp => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || net;
    })
  );
});

// Permite que a página mande "pula a espera" para ativar a versão nova na hora
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
