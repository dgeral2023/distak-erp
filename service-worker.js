const CACHE='distak-shell-v3.6';
const SHELL=['./','./index.html','./manifest.json','./icon.svg','./assets/css/style.css','./assets/css/obra-ficha.css','./assets/css/dashboard-executivo.css','./assets/css/fotografias.css','./assets/css/diario.css','./assets/css/distak-ios.css','./assets/css/v3.css','./assets/css/hybrid-menu.css','./assets/css/assistant.css','./assets/css/agenda.css','./assets/css/previsoes.css','./assets/css/dossies.css','./assets/css/operacional.css','./assets/css/compras.css','./assets/css/medicoes.css','./assets/css/campo.css','./assets/css/inteligencia.css','./assets/css/cliente-portal.css','./assets/css/cliente-role.css','./assets/css/cliente-approvals.css','./assets/css/accessibility.css','./assets/css/backup.css','./assets/js/config.js','./assets/js/app.js','./assets/js/core/accessibility.js','./assets/js/core/backup-readiness.js','./assets/js/core/dossier-quality.js','./assets/js/core/field-queue.js','./assets/js/core/intelligence-actions.js','./assets/js/core/workload-analysis.js','./assets/js/modules/backup.js','./assets/js/modules/campo.js','./assets/js/modules/inteligencia.js','./assets/js/modules/cliente-portal.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));return response}).catch(()=>caches.match('./index.html')));
    return;
  }
  if(!['style','script','image','font','manifest'].includes(request.destination))return;
  event.respondWith(caches.match(request,{ignoreSearch:true}).then(cached=>cached||fetch(request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response})));
});
