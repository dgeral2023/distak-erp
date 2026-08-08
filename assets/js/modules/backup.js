import {$,toast} from "../core/ui.js";
import {store} from "../core/store.js";
import {assessRecoveryReadiness} from "../core/backup-readiness.js";
import {rehearseRecoveryInMemory} from "../core/recovery-rehearsal.js";

const collections=["profiles","obraUtilizadores","clientes","obras","orcamentos","custos","pagamentos","fotografias","documentosObra","funcionarios","funcionarioHoras","atividades","agendaTarefas","previsoesFinanceiras","pedidosCompra","propostasCompra","autosMedicao","itensMedicao","campoRegistos","inteligenciaAvaliacoes","diariosObra","checklistsObra","materiaisObra","ocorrenciasObra","horasObra","equipaObra","clientePortalAcessos","clientePortalObras","clientePortalAtualizacoes","clientePortalFicheiros","clientePortalAprovacoes"];
const hex=buffer=>[...new Uint8Array(buffer)].map(value=>value.toString(16).padStart(2,"0")).join("");
const fail=message=>{throw new Error(message)};

export async function createSafetyBackup(){
  if(store.profile?.role!=="admin")throw new Error("Apenas um administrador pode exportar a cópia de segurança.");
  const data=Object.fromEntries(collections.map(key=>[key,Array.isArray(store[key])?store[key]:[]]));
  const payload={format:"distak-erp-backup",version:1,createdAt:new Date().toISOString(),source:"web-v3",recordCounts:Object.fromEntries(collections.map(key=>[key,data[key].length])),data};
  const canonical=JSON.stringify(payload),checksum=hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical)));
  return JSON.stringify({integrity:{algorithm:"SHA-256",checksum},payload},null,2);
}

export async function inspectSafetyBackup(content){
  if(store.profile?.role!=="admin")fail("Apenas um administrador pode verificar uma cópia de segurança.");
  let envelope;try{envelope=JSON.parse(content)}catch{fail("O ficheiro não contém JSON válido.")}
  const {integrity,payload}=envelope||{};
  if(!payload||payload.format!=="distak-erp-backup"||payload.version!==1)fail("Formato ou versão da cópia incompatível.");
  if(integrity?.algorithm!=="SHA-256"||typeof integrity.checksum!=="string"||!/^[a-f0-9]{64}$/i.test(integrity.checksum))fail("Informação de integridade inválida.");
  if(!payload.data||typeof payload.data!=="object"||Array.isArray(payload.data)||!payload.recordCounts||typeof payload.recordCounts!=="object")fail("Estrutura de dados incompleta.");
  if(!Number.isFinite(Date.parse(payload.createdAt)))fail("Data de criação inválida.");
  const unexpected=Object.keys(payload.data).filter(key=>!collections.includes(key));if(unexpected.length)fail("A cópia contém coleções desconhecidas.");
  const counts={};for(const key of collections){const rows=payload.data[key];if(!Array.isArray(rows))fail(`Coleção inválida: ${key}.`);counts[key]=rows.length;if(payload.recordCounts[key]!==rows.length)fail(`Contagem inconsistente: ${key}.`)}
  const checksum=hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(payload))));
  if(checksum.toLowerCase()!==integrity.checksum.toLowerCase())fail("A cópia foi alterada ou está danificada.");
  const readiness=assessRecoveryReadiness(payload);
  return {valid:true,version:payload.version,createdAt:payload.createdAt,source:payload.source||"desconhecida",checksum,totalRecords:Object.values(counts).reduce((sum,value)=>sum+value,0),counts,readiness};
}

async function download(){
  if(!confirm("Esta cópia contém dados comerciais, financeiros e operacionais. Guarde-a apenas num local seguro. Deseja continuar?"))return;
  try{const content=await createSafetyBackup(),envelope=JSON.parse(content),blob=new Blob([content],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a"),stamp=new Date().toISOString().replaceAll(":","-").slice(0,19);link.href=url;link.download=`distak-erp-backup-${stamp}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);const totalRecords=Object.values(envelope.payload.recordCounts).reduce((sum,value)=>sum+Number(value||0),0);localStorage.setItem("distak-backup-metadata-v1",JSON.stringify({createdAt:envelope.payload.createdAt,totalRecords,version:envelope.payload.version}));window.dispatchEvent(new CustomEvent("distak:backup-exported"));toast("Cópia de segurança exportada. Nenhum dado foi alterado.")}catch(error){toast(error.message||"Não foi possível exportar a cópia.","error")}
}

async function inspectFile(event){
  const input=event.currentTarget,file=input.files?.[0];input.value="";if(!file)return;
  if(file.size>25*1024*1024){toast("A cópia excede o limite de verificação de 25 MB.","error");return}
  try{const content=await file.text(),result=await inspectSafetyBackup(content),rehearsal=rehearseRecoveryInMemory(JSON.parse(content).payload),nonEmpty=Object.entries(result.counts).filter(([,count])=>count),ready=result.readiness.status==="ready"&&rehearsal.status==="passed";$("safetyBackupSummary").innerHTML=`<div class="backup-inspection-status ${ready?"":"review"}"><b>${ready?"✓ Cópia íntegra e ensaio isolado aprovado":"⚠ Cópia íntegra; revisão necessária"}</b><span>Versão ${result.version} · ${result.totalRecords} registo(s) · ${result.readiness.ageDays} dia(s)</span><small>Criada em ${new Date(result.createdAt).toLocaleString("pt-PT")} · SHA-256 confirmado · zero escritas em produção</small></div><div class="backup-readiness-checks">${result.readiness.checks.map(item=>`<span>✓ ${item}</span>`).join("")}${rehearsal.status==="passed"?`<span>✓ Reconstrução descartável: ${rehearsal.recoveredTotal} registo(s) em ${rehearsal.collections} coleção(ões)</span><span>✓ Acessos de Administrador e Funcionário preparados</span>`:rehearsal.issues.map(item=>`<strong>⚠ Ensaio: ${item.code}</strong>`).join("")}${result.readiness.issues.map(item=>`<strong>⚠ ${item.message}</strong>`).join("")}</div><div class="backup-inspection-counts">${nonEmpty.length?nonEmpty.map(([name,count])=>`<span><b>${count}</b> ${name}</span>`).join(""):"<span>A cópia não contém registos.</span>"}</div>`;$("safetyBackupDialog").showModal()}catch(error){toast(error.message||"Não foi possível verificar a cópia.","error")}
}

export function initBackup(){$("exportSafetyBackup")?.addEventListener("click",download);$("inspectSafetyBackup")?.addEventListener("click",()=>$("safetyBackupFile").click());$("safetyBackupFile")?.addEventListener("change",inspectFile)}
