import {readFileSync} from "node:fs";
import {join,resolve} from "node:path";
const root=resolve(import.meta.dirname,".."),sql=readFileSync(join(root,"supabase","migrations","20260808155000_vinculos_cliente_atomicos_v38.sql"),"utf8"),frontend=readFileSync(join(root,"assets","js","modules","cliente-portal.js"),"utf8"),failures=[];
for(const token of ["private.gerir_vinculos_cliente_impl","security definer","pg_advisory_xact_lock","alvo.role<>'cliente'","cardinality(coalesce(p_cliente_ids","on conflict (user_id,cliente_id) do update","set ativo=false","'vinculo_cliente',p_user_id","'anteriores',anteriores","security invoker","revoke all on function public.gerir_vinculos_cliente"])if(!sql.toLowerCase().includes(token.toLowerCase()))failures.push(`Proteção de vínculo em falta: ${token}`);
for(const token of ['db.rpc("gerir_vinculos_cliente"','confirm(`Rever os vínculos do Portal do Cliente','p_cliente_ids:selected','data-client-access-user','data-save-client-access','profile.email','client.nome','button.disabled=true'])if(!frontend.includes(token))failures.push(`Gestão legível de vínculos em falta: ${token}`);
if(/delete\s+from\s+public\.cliente_portal_acessos/i.test(sql))failures.push("A função não deve apagar o histórico de vínculos.");
if(/db\.from\(["']cliente_portal_acessos["']\)\.(insert|update|delete)/.test(frontend))failures.push("O frontend não deve mutar vínculos diretamente.");
if(failures.length){console.error(`Gestão de vínculos do cliente falhou:\n- ${failures.join("\n- ")}`);process.exit(1)}
console.log("Vínculos do cliente aprovados: contas legíveis, operação atómica, histórico, confirmação e auditoria verificados sem mutações reais.");
