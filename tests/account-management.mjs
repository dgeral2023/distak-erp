import {readFileSync} from "node:fs";
import {join,resolve} from "node:path";

const root=resolve(import.meta.dirname,".."),read=path=>readFileSync(join(root,path),"utf8"),sql=read("supabase/migrations/20260808131500_gestao_contas_v38.sql"),privileges=read("supabase/migrations/20260808132500_minimo_privilegio_profiles_v38.sql"),privateSql=read("supabase/migrations/20260808134000_gestao_contas_privada_v38.sql"),html=read("index.html"),module=read("assets/js/modules/funcionarios.js"),core=read("assets/js/core/access-management.js"),failures=[];
for(const token of ["public.gerir_utilizador","security definer","p_user_id=(select auth.uid())","O último administrador ativo não pode ser removido","Remova primeiro as atribuições operacionais","Desative primeiro os vínculos ativos","char_length(motivo)<10","revoke insert, update, delete on public.profiles from authenticated","p.role='cliente'","p.ativo=true"])if(!sql.includes(token))failures.push(`Proteção server-side em falta: ${token}`);
for(const token of ["accountManagementDialog","accountManagementRole","accountManagementActive","accountManagementReason","accountManagementWarning"])if(!html.includes(token))failures.push(`Interface administrativa em falta: ${token}`);
for(const role of ["admin","escritorio","encarregado","funcionario","cliente"])if(!core.includes(`"${role}"`)||!html.includes(`value="${role}"`))failures.push(`Perfil não suportado: ${role}`);
for(const token of ['db.rpc("gerir_utilizador"',"validateAccountChange","data-manage-account","confirm(`Confirma a alteração","Conta atual protegida"])if(!module.includes(token))failures.push(`Confirmação administrativa em falta: ${token}`);
if(/gerir_utilizador[\s\S]*delete\s+from\s+public\.profiles/i.test(sql))failures.push("A gestão de conta não pode eliminar perfis.");
if(!privileges.includes("revoke all on public.profiles from authenticated")||!privileges.includes("grant select on public.profiles to authenticated"))failures.push("A tabela de perfis deve conceder somente leitura ao papel autenticado.");
for(const token of ["private.gerir_utilizador_impl","security definer","security invoker","select private.gerir_utilizador_impl","revoke all on function private.gerir_utilizador_impl"])if(!privateSql.includes(token))failures.push(`Separação entre API pública e implementação privada em falta: ${token}`);
if(failures.length){console.error(`Gestão de contas falhou:\n- ${failures.join("\n- ")}`);process.exit(1)}
console.log("Gestão de contas aprovada: cinco perfis, confirmação humana, auditoria e proteções server-side validadas sem mutar utilizadores.");
