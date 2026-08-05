import {readFileSync} from "node:fs";
import {join,resolve} from "node:path";

const root=resolve(import.meta.dirname,".."),edge=readFileSync(join(root,"supabase","functions","convidar-cliente","index.ts"),"utf8"),frontend=readFileSync(join(root,"assets","js","modules","cliente-portal.js"),"utf8");
const failures=[];
for(const required of ["origins.has(origin)","authorization?.startsWith(\"Bearer \")","admin.auth.getUser","profile?.role!==\"admin\"","inviteUserByEmail","role:\"cliente\"","cliente_portal_acessos","onConflict:\"user_id,cliente_id\"","Cache-Control\":\"no-store\""])if(!edge.includes(required))failures.push(`Função de convite incompleta: ${required}`);
for(const required of ["db.functions.invoke(\"convidar-cliente\"","clientInviteClient","clientInviteEmail","button.disabled=true"])if(!frontend.includes(required))failures.push(`Interface de convite incompleta: ${required}`);
for(const forbidden of ["SUPABASE_SERVICE_ROLE_KEY","service_role","inviteUserByEmail"])if(frontend.includes(forbidden))failures.push(`Segredo ou operação administrativa exposta no frontend: ${forbidden}`);
if(failures.length){console.error(`Teste de convite falhou:\n- ${failures.join("\n- ")}`);process.exit(1)}
console.log("Convite aprovado: origem, sessão, papel administrativo, associação e isolamento server-side verificados.");
