import {readFileSync} from "node:fs";
import {join,resolve} from "node:path";

const root=resolve(import.meta.dirname,".."),sql=readFileSync(join(root,"supabase","migrations","20260808154000_atribuicoes_atomicas_v38.sql"),"utf8"),frontend=readFileSync(join(root,"assets","js","modules","funcionarios.js"),"utf8"),failures=[];
for(const token of ["private.gerir_atribuicoes_obras_impl","security definer","pg_advisory_xact_lock","role not in ('escritorio','encarregado','funcionario')","cardinality(coalesce(p_obra_ids","on conflict (obra_id,user_id) do update","set ativo=false","'atribuicao_obra',p_user_id","'anteriores',anteriores","security invoker","revoke all on function public.gerir_atribuicoes_obras"])if(!sql.toLowerCase().includes(token.toLowerCase()))failures.push(`Proteção atómica em falta: ${token}`);
for(const token of ['db.rpc("gerir_atribuicoes_obras"','confirm(`Rever os acessos por obra','p_obra_ids:selected','button.disabled=true','data.adicionadas','data.removidas'])if(!frontend.includes(token))failures.push(`Confirmação administrativa em falta: ${token}`);
for(const forbidden of ['db.from("obra_utilizadores").delete()','db.from("obra_utilizadores").insert('])if(frontend.includes(forbidden))failures.push(`Mutação direta ainda presente no frontend: ${forbidden}`);
if(/delete\s+from\s+public\.obra_utilizadores/i.test(sql))failures.push("A função não deve apagar o histórico de atribuições.");
if(failures.length){console.error(`Gestão de acessos por obra falhou:\n- ${failures.join("\n- ")}`);process.exit(1)}
console.log("Acessos por obra aprovados: operação atómica, confirmação, histórico, perfis e auditoria verificados sem mutações reais.");
