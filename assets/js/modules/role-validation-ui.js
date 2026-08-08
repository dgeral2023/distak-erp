import {$,esc,toast} from "../core/ui.js";
import {store} from "../core/store.js";
import {buildRoleValidationPlan,validationScenarios} from "../core/role-validation.js";
import {buildValidationEvidence,createValidationRecord,scenarioForSession,validationDevice,validationStatus} from "../core/human-validation.js";

const STORAGE="distak-human-validation-v1";
const records=()=>{try{const value=JSON.parse(localStorage.getItem(STORAGE)||"[]");return Array.isArray(value)?value:[]}catch{return []}};
const saveRecords=value=>localStorage.setItem(STORAGE,JSON.stringify(value));
const currentPlan=()=>buildRoleValidationPlan({profiles:store.profiles,assignments:store.obraUtilizadores,clientAccess:store.clientePortalAcessos,works:store.obras,clients:store.clientes,portalWorks:store.clientePortalObras});
const download=(content,name)=>{const blob=new Blob([JSON.stringify(content,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};

function openPlan(){
  const plan=currentPlan(),scoped=plan.roles.filter(row=>row.inScope),ready=scoped.filter(row=>row.ready).length,scenarios=scoped.flatMap(row=>row.scenarios),status=validationStatus(records(),validationScenarios);
  $("roleValidationSummary").innerHTML=`<article class="${plan.ready?"ready":""}"><span>Perfis preparados</span><strong>${ready}/${scoped.length}</strong><small>${plan.ready?"Pré-condições completas":"Ainda existem pendências"}</small></article><article><span>Cenários desta fase</span><strong>${scenarios.length}</strong><small>Computador e telemóvel</small></article><article class="${status.complete?"ready":""}"><span>Validações neste dispositivo</span><strong>${status.completed}/${status.total}</strong><small>${status.complete?"Evidências locais completas":"Continuar em cada conta e dispositivo"}</small></article>`;
  $("roleValidationRoles").innerHTML=plan.roles.map(row=>`<section class="validation-role ${row.ready&&row.inScope?"ready":""}"><header><div><strong>${esc(row.label)}</strong><small>${row.inScope?`${row.scenarios.length} cenário(s) preparado(s)`:"Fora do escopo desta fase"}</small></div><span>${row.inScope?(row.ready?"Pré-condições prontas":"Preparação pendente"):"Adiado"}</span></header>${row.inScope&&row.reasons.length?`<p>${esc(row.reasons.join(" "))}</p>`:""}${row.inScope?`<div class="validation-scenarios">${row.scenarios.map(scenario=>`<article class="${status.passed.includes(scenario.id)?"passed":""}"><small>${esc(scenario.device)}</small><strong>${esc(scenario.title)}</strong><ul>${scenario.checks.map(check=>`<li>${esc(check)}</li>`).join("")}</ul><em>${status.passed.includes(scenario.id)?"✓ Evidência guardada neste dispositivo":"Pendente neste dispositivo"}</em></article>`).join("")}</div>`:""}</section>`).join("");
  $("roleValidationDialog").showModal();
}

function openDeviceValidation(){
  const device=validationDevice(),scenario=scenarioForSession(validationScenarios,store.profile?.role,device);if(!scenario){toast("Este perfil está fora do escopo de validação atual.","error");return}
  const previous=records().find(row=>row.scenarioId===scenario.id),passed=Boolean(previous?.attested);
  $("deviceValidationLead").textContent=`${scenario.title} · ${device}`;
  $("deviceValidationStatus").innerHTML=passed?`<strong>✓ Validação já confirmada</strong><small>Registada em ${new Date(previous.completedAt).toLocaleString("pt-PT")}. Pode repetir para atualizar a evidência.</small>`:`<strong>Validação pendente</strong><small>Execute e confirme cada ponto abaixo.</small>`;
  $("deviceValidationChecks").innerHTML=scenario.checks.map((check,index)=>`<label><input type="checkbox" data-human-check value="${index}"> <span>${esc(check)}</span></label>`).join("");
  $("deviceValidationAttestation").checked=false;$("deviceValidationForm").dataset.scenario=scenario.id;$("deviceValidationDialog").showModal();
}

function complete(event){
  event.preventDefault();const scenario=validationScenarios.find(row=>row.id===event.currentTarget.dataset.scenario),checked=[...document.querySelectorAll("[data-human-check]:checked")].map(input=>scenario.checks[Number(input.value)]);
  try{const record=createValidationRecord({scenario,checked,attested:$("deviceValidationAttestation").checked}),current=records().filter(row=>row.scenarioId!==scenario.id);saveRecords([...current,record]);toast("Validação humana guardada apenas neste dispositivo.");$("deviceValidationDialog").close()}catch(error){toast(error.message,"error")}
}

function exportPlan(){download(currentPlan(),`distak-plano-validacao-${new Date().toISOString().slice(0,10)}.json`);toast("Plano exportado localmente.")}
function exportEvidence(){const evidence=buildValidationEvidence(records());if(!evidence.results.length){toast("Ainda não existe uma validação concluída neste dispositivo.","error");return}download(evidence,`distak-evidencia-validacao-${new Date().toISOString().slice(0,10)}.json`);toast("Evidência local exportada sem dados pessoais ou operacionais.")}
export function initRoleValidation(){$("openRoleValidation")?.addEventListener("click",openPlan);$("openDeviceValidation")?.addEventListener("click",openDeviceValidation);$("exportRoleValidation")?.addEventListener("click",exportPlan);$("exportDeviceValidation")?.addEventListener("click",exportEvidence);$("deviceValidationForm")?.addEventListener("submit",complete)}
