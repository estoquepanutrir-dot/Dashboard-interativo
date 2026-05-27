// ============================================================
// SERVICE WORKER — MODO AGRESSIVO (sempre busca na rede)
// Versão: v3
// Mude a versão abaixo sempre que subir alterações no GitHub
// para forçar todos os dispositivos a atualizar na hora.
// ============================================================
const CACHE_VERSION = 'panutrir-v3';

// 1. Instalação: novo SW assume controle imediatamente, sem esperar abas fecharem
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Ativação: destrói TODOS os caches antigos e toma controle de todas as abas abertas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Destruindo cache antigo:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[SW] Controle assumido — versão:', CACHE_VERSION);
      return self.clients.claim();
    })
  );
});

// 3. Interceptação: SEMPRE busca na rede, sem cache
// Se estiver offline, retorna uma página de aviso em vez de silêncio
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET (POST para API, etc.)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .catch(() => {
        // Offline: retorna aviso apenas para navegação (HTML), não para assets
        if (event.request.mode === 'navigate') {
          return new Response(
            `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sem conexão</title>
<style>
  body{font-family:'Google Sans',sans-serif;display:flex;align-items:center;justify-content:center;
       min-height:100vh;margin:0;background:#1a1a2e;color:#fff;text-align:center;padding:24px;}
  .box{max-width:360px;}
  h2{font-size:22px;margin-bottom:8px;}
  p{color:#aaa;font-size:14px;line-height:1.6;}
  button{margin-top:24px;padding:12px 28px;background:#6d4aff;color:#fff;border:none;
         border-radius:24px;font-size:15px;cursor:pointer;}
</style>
</head>
<body>
  <div class="box">
    <div style="font-size:48px;margin-bottom:16px;">📡</div>
    <h2>Sem conexão</h2>
    <p>O Sistema Panutrir precisa de internet para funcionar.<br>
       Verifique sua conexão e tente novamente.</p>
    <button onclick="window.location.reload()">Tentar novamente</button>
  </div>
</body>
</html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })
  );
});
