import {readFileSync,readdirSync} from "node:fs";
import {join,resolve} from "node:path";

const root=resolve(import.meta.dirname,"..");
const walk=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(directory,entry.name)):[join(directory,entry.name)]);
const frontend=[join(root,"index.html"),...walk(join(root,"assets","js")).filter(path=>path.endsWith(".js")&&!path.includes(`${join("assets","assets")}`))];
const failures=[];
const forbidden=[/\bservice_role\b/i,/\bsb_secret_[A-Za-z0-9_-]+/i,/SUPABASE_SERVICE_ROLE/i,/OPENAI_API_KEY/i,/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/];
for(const path of frontend){const source=readFileSync(path,"utf8");for(const pattern of forbidden)if(pattern.test(source))failures.push(`${path.slice(root.length+1)} contém padrão secreto ${pattern}`)}
const config=readFileSync(join(root,"assets","js","config.js"),"utf8");
if(!/SUPABASE_KEY:\s*"sb_publishable_[A-Za-z0-9_-]+"/.test(config))failures.push("O frontend deve usar somente uma chave Supabase publicável.");
const html=readFileSync(join(root,"index.html"),"utf8");
for(const src of [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match=>match[1])){
  if(src.startsWith("http")&&!/^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@\d+\.\d+\.\d+$/.test(src))failures.push(`Dependência externa não autorizada ou sem versão fixa: ${src}`);
}
for(const required of ["Content-Security-Policy","object-src 'none'","base-uri 'self'","form-action 'self'","strict-origin-when-cross-origin"])if(!html.includes(required))failures.push(`Proteção HTML em falta: ${required}`);
const recentSql=walk(join(root,"supabase")).filter(path=>/20260805\d+_.*\.sql$/.test(path));
for(const path of recentSql){const sql=readFileSync(path,"utf8");if(/grant\s+[^;]+\s+to\s+anon\b/i.test(sql))failures.push(`${path.slice(root.length+1)} concede privilégios ao papel anon`);if(/grant\s+delete\b/i.test(sql))failures.push(`${path.slice(root.length+1)} concede DELETE sem revisão explícita`)}
const portalSql=readFileSync(join(root,"supabase","202608052000_portal_cliente.sql"),"utf8");
for(const table of ["cliente_portal_acessos","cliente_portal_obras","cliente_portal_atualizacoes","cliente_portal_ficheiros"])if(!portalSql.includes(`alter table public.${table} enable row level security`))failures.push(`RLS em falta: ${table}`);
if(failures.length){console.error(`Auditoria de segurança falhou:\n- ${failures.join("\n- ")}`);process.exit(1)}
console.log(`Segurança aprovada: ${frontend.length} ficheiros frontend, ${recentSql.length} migrações recentes, chave publicável, CSP e dependência fixa.`);
