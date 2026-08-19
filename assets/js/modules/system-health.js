import {$,esc,toast} from "../core/ui.js";
import {store} from "../core/store.js";
import {assessOperationalReadiness} from "../core/operational-readiness.js";
import {buildSupportDiagnostic} from "../core/support-diagnostics.js";
const BACKUP_KEY="distak-backup-metadata-v1";
const readBackup=()=>{try{return JSON.parse(localStorage.getItem(BACKUP_KEY)||"null")}catch{return null}};
export function renderSystemHealth(){
  const host=$("systemHealth");if(!host||store.profile?.role!=="admin")return;
  const result=assessOperationalReadiness({online:navigator.onLine,profile:store.profile,dataWarnings:store.dataWarnings||[],serviceWorker:"serviceWorker" in navigator&&Boolean(navigator.serviceWorker.controller),backup:readBackup()});
  const title=result.status==="ready"?"Operação preparada":result.status==="attention"?"Revisão recomendada":"Ação necessária";
  host.dataset.readiness=JSON.stringify(result);
  host.innerHTML=`<div class="health-summary ${result.status}"><div><small>ESTADO LOCAL E SEGURO</small><h3>${title}</h3><p>${result.critical} crítico(s) · ${result.warnings} aviso(s). Sem telemetria externa e sem recuperação automática.</p></div><button id="refreshSystemHealth" class="btn light" type="button">Atualizar diagnóstico</button></div><div class="health-checks">${result.checks.map(row=>`<article class="health-check ${row.status}"><span aria-hidden="true">${row.status==="ok"?"✓":row.status==="warning"?"!":"×"}</span><div><strong>${esc(row.label)}</strong><small>${esc(row.detail)}</small>${row.action?`<button type="button" data-health-action="${row.code}">${esc(row.action)}</button>`:""}</div></article>`).join("")}</div><aside class="health-support"><div><small>SUPORTE OPERACIONAL</small><h3>Preparar pedido de assistência</h3><p>Exporte um diagnóstico técnico sem nomes, e-mails, valores, credenciais ou conteúdo das obras.</p></div><div><span>P1 · segurança, dados ou operação financeira</span><span>P2 · utilizador bloqueado ou serviço degradado</span><span>P3 · dúvida ou melhoria sem bloqueio</span></div><button id="exportSupportDiagnostic" class="btn light" type="button">Exportar diagnóstico seguro</button></aside>`;
}
function exportDiagnostic(){
  const host=$("systemHealth");if(store.profile?.role!=="admin"||!host)return;
  let readiness;try{readiness=JSON.parse(host.dataset.readiness||"null")}catch{return toast("Atualize o diagnóstico antes de exportar.","error")}
  const diagnostic=buildSupportDiagnostic({readiness,role:store.profile.role}),blob=new Blob([JSON.stringify(diagnostic,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=`distak-diagnostico-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Diagnóstico seguro exportado. Nenhum dado foi enviado.");
}
export function initSystemHealth(refresh){
  window.addEventListener("online",renderSystemHealth);window.addEventListener("offline",renderSystemHealth);window.addEventListener("distak:backup-exported",renderSystemHealth);
  navigator.serviceWorker?.addEventListener("controllerchange",renderSystemHealth);
  $("systemHealth")?.addEventListener("click",async event=>{const action=event.target.closest("[data-health-action]")?.dataset.healthAction;if(event.target.closest("#exportSupportDiagnostic")){exportDiagnostic();return}if(event.target.closest("#refreshSystemHealth")){await refresh();toast("Diagnóstico atualizado.");return}if(action==="backup")$("exportSafetyBackup")?.click();if(action==="data")await refresh();if(action==="connection")toast("Confirme a ligação Wi-Fi ou móvel e tente novamente.","error");if(action==="session")location.reload();if(action==="pwa")toast("Reabra o DISTAK ERP com ligação para ativar o modo offline.")});
}
