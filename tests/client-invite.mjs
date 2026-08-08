import {readFileSync} from "node:fs";
import {join,resolve} from "node:path";

const root=resolve(import.meta.dirname,".."),edge=readFileSync(join(root,"supabase","functions","convidar-utilizador","index.ts"),"utf8"),team=readFileSync(join(root,"assets","js","modules","funcionarios.js"),"utf8"),portal=readFileSync(join(root,"assets","js","modules","cliente-portal.js"),"utf8"),html=readFileSync(join(root,"index.html"),"utf8");
const failures=[];
for(const required of ["origins.has(origin)","authorization?.startsWith(\"Bearer \")","admin.auth.getUser","profile?.role!==\"admin\"","teamRoles","role===\"cliente\"","inviteUserByEmail","recentInvites","cliente_portal_acessos","obra_utilizadores","entidade:\"convite\"","Cache-Control\":\"no-store\""])if(!edge.includes(required))failures.push(`Função central de convite incompleta: ${required}`);
for(const required of ["db.functions.invoke(\"convidar-utilizador\"","userInviteConfirm","button.disabled=true","confirm(`Enviar um convite real","obra_ids"])if(!team.includes(required))failures.push(`Interface central de convite incompleta: ${required}`);
for(const required of ["userInviteDialog","userInviteRole","userInviteClient","userInviteWorks","userInviteConfirm"])if(!html.includes(required))failures.push(`Formulário central de convite incompleto: ${required}`);
if(!portal.includes("distak:open-user-invite"))failures.push("Portal do cliente não encaminha para o convite central.");
if(portal.includes("convidar-cliente"))failures.push("Portal ainda invoca o endpoint legado de convite.");
for(const frontend of [team,portal,html])for(const forbidden of ["SUPABASE_SERVICE_ROLE_KEY","service_role","inviteUserByEmail"])if(frontend.includes(forbidden))failures.push(`Segredo ou operação administrativa exposta no frontend: ${forbidden}`);
if(/teamRoles[^\n]+admin/.test(edge)||/role===\"admin\"[^\n]+inviteUserByEmail/.test(edge))failures.push("O fluxo permite convite administrativo.");
if(failures.length){console.error(`Teste de convite falhou:\n- ${failures.join("\n- ")}`);process.exit(1)}
console.log("Convites centralizados aprovados: equipa/cliente, confirmação explícita, limite, vínculos e isolamento server-side verificados.");
