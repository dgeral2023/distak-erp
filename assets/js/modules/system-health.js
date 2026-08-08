import {$,esc,toast} from "../core/ui.js";
import {store} from "../core/store.js";
import {assessOperationalReadiness} from "../core/operational-readiness.js";
const BACKUP_KEY="distak-backup-metadata-v1";
const readBackup=()=>{try{return JSON.parse(localStorage.getItem(BACKUP_KEY)||"null")}catch{return null}};
export function renderSystemHealth(){
  const host=$("systemHealth");if(!host||store.profile?.role!=="admin")return;
  const result=assessOperationalReadiness({online:navigator.onLine,profile:store.profile,dataWarnings:store.dataWarnings||[],serviceWorker:"serviceWorker" in navigator&&Boolean(navigator.serviceWorker.controller),backup:readBackup()});
  const title=result.status==="ready"?"Operação preparada":result.status==="attention"?"Revisão recomendada":"Ação necessária";
  host.innerHTML=`<div class="health-summary ${result.status}"><div><small>ESTADO LOCAL E SEGURO</small><h3>${title}</h3><p>${result.critical} crítico(s) · ${result.warnings} aviso(s). Sem telemetria externa e sem recuperação automática.</p></div><button id="refreshSystemHealth" class="btn light" type="button">Atualizar diagnóstico</button></div><div class="health-checks">${result.checks.map(row=>`<article class="health-check ${row.status}"><span aria-hidden="true">${row.status==="ok"?"✓":row.status==="warning"?"!":"×"}</span><div><strong>${esc(row.label)}</strong><small>${esc(row.detail)}</small>${row.action?`<button type="button" data-health-action="${row.code}">${esc(row.action)}</button>`:""}</div></article>`).join("")}</div>`;
}
export function initSystemHealth(refresh){
  window.addEventListener("online",renderSystemHealth);window.addEventListener("offline",renderSystemHealth);window.addEventListener("distak:backup-exported",renderSystemHealth);
  navigator.serviceWorker?.addEventListener("controllerchange",renderSystemHealth);
  $("systemHealth")?.addEventListener("click",async event=>{const action=event.target.closest("[data-health-action]")?.dataset.healthAction;if(event.target.closest("#refreshSystemHealth")){await refresh();toast("Diagnóstico atualizado.");return}if(action==="backup")$("exportSafetyBackup")?.click();if(action==="data")await refresh();if(action==="connection")toast("Confirme a ligação Wi-Fi ou móvel e tente novamente.","error");if(action==="session")location.reload();if(action==="pwa")toast("Reabra o DISTAK ERP com ligação para ativar o modo offline.")});
}
