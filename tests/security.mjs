import {readFileSync,readdirSync} from "node:fs";
import {join,resolve} from "node:path";

const root=resolve(import.meta.dirname,"..");
const walk=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(directory,entry.name)):[join(directory,entry.name)]);
const frontend=[join(root,"index.html"),...walk(join(root,"assets","js")).filter(path=>path.endsWith(".js")&&!path.includes(`${join("assets","assets")}`)),...walk(join(root,"assets","vendor")).filter(path=>path.endsWith(".js"))];
const failures=[];
const forbidden=[/\bservice_role\b/i,/\bsb_secret_[A-Za-z0-9_-]+/i,/SUPABASE_SERVICE_ROLE/i,/OPENAI_API_KEY/i,/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/];
for(const path of frontend){const source=readFileSync(path,"utf8");for(const pattern of forbidden)if(pattern.test(source))failures.push(`${path.slice(root.length+1)} contém padrão secreto ${pattern}`)}
const config=readFileSync(join(root,"assets","js","config.js"),"utf8");
if(!/SUPABASE_KEY:\s*"sb_publishable_[A-Za-z0-9_-]+"/.test(config))failures.push("O frontend deve usar somente uma chave Supabase publicável.");
const rlsSecurity=readFileSync(join(root,"supabase","migrations","20260808083000_reforco_seguranca_rls_v37.sql"),"utf8");
if(!/ou\.ativo\s*=\s*true/i.test(rlsSecurity))failures.push("A politica de obras deve ignorar atribuicoes inativas.");
if(!/revoke all on function public\.is_admin\(\) from public, anon/i.test(rlsSecurity))failures.push("A funcao administrativa deve revogar execucao publica e anonima.");
if(!/revoke all on function public\.responder_cliente_portal_aprovacao\(uuid, text\) from public, anon/i.test(rlsSecurity))failures.push("A funcao do portal deve revogar execucao publica e anonima.");
const html=readFileSync(join(root,"index.html"),"utf8");
for(const src of [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match=>match[1])){
  if(src.startsWith("http")&&!/^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@\d+\.\d+\.\d+$/.test(src))failures.push(`Dependência externa não autorizada ou sem versão fixa: ${src}`);
}
for(const required of ["Content-Security-Policy","object-src 'none'","base-uri 'self'","form-action 'self'","strict-origin-when-cross-origin"])if(!html.includes(required))failures.push(`Proteção HTML em falta: ${required}`);
const scriptPolicy=html.match(/script-src ([^;]+)/)?.[1]||"";
if(scriptPolicy.includes("'unsafe-inline'"))failures.push("A política de scripts não deve permitir execução inline.");
if(/<script(?![^>]*src=)[^>]*>/i.test(html))failures.push("O HTML não deve conter scripts inline.");
if(!html.includes('src="assets/js/core/bootstrap-errors.js"'))failures.push("O tratamento inicial de erros deve usar um ficheiro sujeito à CSP.");
const recentSql=walk(join(root,"supabase")).filter(path=>/2026080[56]\d+_.*\.sql$/.test(path));
for(const path of recentSql){const sql=readFileSync(path,"utf8");if(/grant\s+[^;]+\s+to\s+anon\b/i.test(sql))failures.push(`${path.slice(root.length+1)} concede privilégios ao papel anon`);if(/grant\s+delete\b/i.test(sql))failures.push(`${path.slice(root.length+1)} concede DELETE sem revisão explícita`)}
const portalSql=readFileSync(join(root,"supabase","202608052000_portal_cliente.sql"),"utf8");
for(const table of ["cliente_portal_acessos","cliente_portal_obras","cliente_portal_atualizacoes","cliente_portal_ficheiros","cliente_portal_aprovacoes"])if(!portalSql.includes(`alter table public.${table} enable row level security`))failures.push(`RLS em falta: ${table}`);
if(failures.length){console.error(`Auditoria de segurança falhou:\n- ${failures.join("\n- ")}`);process.exit(1)}
console.log(`Segurança aprovada: ${frontend.length} ficheiros frontend, ${recentSql.length} migrações recentes, chave publicável, CSP e dependência fixa.`);
