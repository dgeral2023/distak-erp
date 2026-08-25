const CACHE='distak-shell-v3.8-canonical-suppliers-20260825-v1';
const SHELL=[
  './','./index.html','./manifest.json','./icon.svg',
  './assets/fragments/cliente-dialog.html',
  './assets/css/accessibility.css','./assets/css/agenda.css','./assets/css/assistant.css','./assets/css/backup.css','./assets/css/campo.css','./assets/css/client-access-management.css','./assets/css/cliente-approvals.css','./assets/css/cliente-portal.css','./assets/css/cliente-role.css','./assets/css/compras.css','./assets/css/dashboard-executivo.css','./assets/css/diario.css','./assets/css/distak-ios.css','./assets/css/dossies.css','./assets/css/fotografias.css','./assets/css/hybrid-menu.css','./assets/css/inteligencia.css','./assets/css/medicoes.css','./assets/css/motion.css','./assets/css/obra-ficha.css','./assets/css/operacional.css','./assets/css/password-recovery.css','./assets/css/portal-content-management.css','./assets/css/previsoes.css','./assets/css/role-validation.css','./assets/css/style.css','./assets/css/subempreiteiros.css','./assets/css/user-management.css','./assets/css/v3.css','./assets/css/system-health.css',
  './assets/js/app.js','./assets/js/config.js','./assets/js/data.js',
  './assets/js/core/access-management.js','./assets/js/core/accessibility.js','./assets/js/core/assistant-local.js','./assets/js/core/auth.js','./assets/js/core/backup-readiness.js','./assets/js/core/bootstrap-errors.js','./assets/js/core/client-addresses.js','./assets/js/core/cost-suppliers.js','./assets/js/core/data-quality.js','./assets/js/core/dossier-quality.js','./assets/js/core/field-queue.js','./assets/js/core/human-validation.js','./assets/js/core/iconography.js','./assets/js/core/intelligence-actions.js','./assets/js/core/motion-policy.js','./assets/js/core/portal-publication.js','./assets/js/core/pwa.js','./assets/js/core/recovery-rehearsal.js','./assets/js/core/role-validation.js','./assets/js/core/store.js','./assets/js/core/subcontract-finance.js','./assets/js/core/supabase.js','./assets/js/core/support-diagnostics.js','./assets/js/core/ui.js','./assets/js/core/work-finance.js','./assets/js/core/work-vat-parts.js','./assets/js/core/workload-analysis.js','./assets/js/core/operational-readiness.js',
  './assets/js/modules/agenda.js','./assets/js/modules/assistant.js','./assets/js/modules/backup.js','./assets/js/modules/campo.js','./assets/js/modules/cliente-portal.js','./assets/js/modules/clientes.js','./assets/js/modules/compras.js','./assets/js/modules/custos.js','./assets/js/modules/dashboard.js','./assets/js/modules/data.js','./assets/js/modules/diario.js','./assets/js/modules/documentos.js','./assets/js/modules/dossies.js','./assets/js/modules/fotografias.js','./assets/js/modules/funcionarios.js','./assets/js/modules/hybrid-menu.js','./assets/js/modules/inteligencia.js','./assets/js/modules/leads.js','./assets/js/modules/medicoes.js','./assets/js/modules/motion.js','./assets/js/modules/obra-iva-misto.js','./assets/js/modules/obras.js','./assets/js/modules/operacional.js','./assets/js/modules/orcamentos.js','./assets/js/modules/pagamentos.js','./assets/js/modules/portal-content-admin.js','./assets/js/modules/previsoes.js','./assets/js/modules/role-validation-ui.js','./assets/js/modules/subempreiteiros.js','./assets/js/modules/v3.js','./assets/js/modules/system-health.js','./assets/vendor/animejs/anime.esm.min.js','./assets/vendor/animejs/LICENSE.md',
];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.all(SHELL.map(async path=>{
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok)throw new Error(`Falha ao preparar ${path}: ${response.status}`);
    await cache.put(path,response);
  }));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put('./index.html',response.clone())}return response}).catch(()=>caches.match('./index.html')));
    return;
  }
  const clientFragment=url.pathname.endsWith('/assets/fragments/cliente-dialog.html');
  if(!clientFragment&&!['style','script','image','font','manifest'].includes(request.destination))return;
  const updateCache=async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone())}return response};
  if(clientFragment||['style','script','manifest'].includes(request.destination)){
    event.respondWith(fetch(request,{cache:'no-store'}).then(updateCache).catch(()=>caches.match(request,{ignoreSearch:true})));
    return;
  }
  event.respondWith(caches.match(request,{ignoreSearch:true}).then(cached=>cached||fetch(request).then(updateCache)));
});
