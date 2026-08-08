import {$,esc,toast} from "../core/ui.js";
import {store} from "../core/store.js";
import {buildRoleValidationPlan} from "../core/role-validation.js";

const currentPlan=()=>buildRoleValidationPlan({profiles:store.profiles,assignments:store.obraUtilizadores,clientAccess:store.clientePortalAcessos,works:store.obras,clients:store.clientes,portalWorks:store.clientePortalObras});
function openPlan(){
  const plan=currentPlan(),ready=plan.roles.filter(row=>row.ready).length,scenarios=plan.roles.reduce((sum,row)=>sum+row.scenarios.length,0);
  $("roleValidationSummary").innerHTML=`<article class="${plan.ready?"ready":""}"><span>Perfis preparados</span><strong>${ready}/3</strong><small>${plan.ready?"Pré-condições completas":"Ainda existem pendências"}</small></article><article><span>Cenários definidos</span><strong>${scenarios}</strong><small>Computador e telemóvel</small></article><article><span>Validação real</span><strong>Pendente</strong><small>Exige autorização específica</small></article>`;
  $("roleValidationRoles").innerHTML=plan.roles.map(row=>`<section class="validation-role ${row.ready?"ready":""}"><header><div><strong>${esc(row.label)}</strong><small>${row.scenarios.length} cenário(s) preparado(s)</small></div><span>${row.ready?"Pré-condições prontas":"Preparação pendente"}</span></header>${row.reasons.length?`<p>${esc(row.reasons.join(" "))}</p>`:""}<div class="validation-scenarios">${row.scenarios.map(scenario=>`<article><small>${esc(scenario.device)}</small><strong>${esc(scenario.title)}</strong><ul>${scenario.checks.map(check=>`<li>${esc(check)}</li>`).join("")}</ul></article>`).join("")}</div></section>`).join("");
  $("roleValidationDialog").showModal();
}
function exportPlan(){
  const content=JSON.stringify(currentPlan(),null,2),blob=new Blob([content],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`distak-plano-validacao-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Plano exportado localmente. Nenhuma validação real foi executada.");
}
export function initRoleValidation(){$("openRoleValidation")?.addEventListener("click",openPlan);$("exportRoleValidation")?.addEventListener("click",exportPlan)}
