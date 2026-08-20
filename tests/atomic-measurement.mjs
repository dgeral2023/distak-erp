import {readFileSync} from "node:fs";
import {join,resolve} from "node:path";

const root=resolve(import.meta.dirname,".."),failures=[];
const api=readFileSync(join(root,"assets","js","core","supabase.js"),"utf8");
const ui=readFileSync(join(root,"assets","js","modules","medicoes.js"),"utf8");
const migration=readFileSync(join(root,"supabase","migrations","20260820170000_medicoes_guardar_atomicamente.sql"),"utf8");
for(const token of ["saveMeasurementWithItems",'db.rpc("guardar_auto_medicao_com_itens"',"p_auto_id:id||null"])
  if(!api.includes(token))failures.push(`Cliente transacional incompleto: ${token}`);
for(const token of ["saveMeasurementWithItems(payload", "data-remove-measurement-item", "Adicione pelo menos uma linha", "button.disabled=true"])
  if(!ui.includes(token))failures.push(`Interface de medições incompleta: ${token}`);
for(const token of ["security invoker", "medicoes_itens_delete_admin", "delete from public.medicoes_itens", "jsonb_array_length(p_itens) < 1", "grant execute"])
  if(!migration.includes(token))failures.push(`Migração transacional incompleta: ${token}`);
if(failures.length){console.error(`Persistência atómica de medições falhou (${failures.length}):\n- ${failures.join("\n- ")}`);process.exit(1)}
console.log("Persistência atómica de medições verificada.");
