import {$,toast} from "../core/ui.js";
import {store} from "../core/store.js";

const collections=["profiles","obraUtilizadores","clientes","obras","orcamentos","custos","pagamentos","fotografias","documentosObra","funcionarios","funcionarioHoras","atividades","agendaTarefas","previsoesFinanceiras","pedidosCompra","propostasCompra","autosMedicao","itensMedicao","campoRegistos","inteligenciaAvaliacoes","diariosObra","checklistsObra","materiaisObra","ocorrenciasObra","horasObra","equipaObra","clientePortalAcessos","clientePortalObras","clientePortalAtualizacoes","clientePortalFicheiros"];
const hex=buffer=>[...new Uint8Array(buffer)].map(value=>value.toString(16).padStart(2,"0")).join("");

export async function createSafetyBackup(){
  if(store.profile?.role!=="admin")throw new Error("Apenas um administrador pode exportar a cópia de segurança.");
  const data=Object.fromEntries(collections.map(key=>[key,Array.isArray(store[key])?store[key]:[]]));
  const payload={format:"distak-erp-backup",version:1,createdAt:new Date().toISOString(),source:"web-v3",recordCounts:Object.fromEntries(collections.map(key=>[key,data[key].length])),data};
  const canonical=JSON.stringify(payload),checksum=hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical)));
  return JSON.stringify({integrity:{algorithm:"SHA-256",checksum},payload},null,2);
}

async function download(){
  if(!confirm("Esta cópia contém dados comerciais, financeiros e operacionais. Guarde-a apenas num local seguro. Deseja continuar?"))return;
  try{const content=await createSafetyBackup(),blob=new Blob([content],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a"),stamp=new Date().toISOString().replaceAll(":","-").slice(0,19);link.href=url;link.download=`distak-erp-backup-${stamp}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Cópia de segurança exportada. Nenhum dado foi alterado.")}catch(error){toast(error.message||"Não foi possível exportar a cópia.","error")}
}

export function initBackup(){$("exportSafetyBackup")?.addEventListener("click",download)}
