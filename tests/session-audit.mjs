import {readFileSync} from "node:fs";
import {join,resolve} from "node:path";

const root=resolve(import.meta.dirname,".."),read=path=>readFileSync(join(root,path),"utf8"),auth=read("assets/js/core/auth.js"),sql=read("supabase/migrations/20260808123000_historico_sessoes_v38.sql"),html=read("index.html"),module=read("assets/js/modules/funcionarios.js"),failures=[];
for(const action of ["entrou","saiu","recuperou_acesso"])if(!sql.includes(`'${action}'`))failures.push(`Ação SQL em falta: ${action}`);
for(const forbidden of ["access_token","refresh_token","user-agent","ip_address","password:"])if(auth.toLowerCase().includes(forbidden))failures.push(`O histórico de sessões contém dado proibido: ${forbidden}`);
for(const token of ['entidade:"sessao"','contexto:"autenticacao"','recordAuthActivity("entrou"','recordAuthActivity("saiu"','recordAuthActivity("recuperou_acesso"'])if(!auth.includes(token))failures.push(`Registo de autenticação incompleto: ${token}`);
if(!html.includes("sessionHistoryTitle"))failures.push("O histórico de sessões deve ter um título acessível.");
for(const token of ["sessionSummary","sessionHistory"])if(!html.includes(token)||!module.includes(token))failures.push(`Histórico administrativo incompleto: ${token}`);
if(!module.includes('store.profile?.role!=="admin"'))failures.push("A vista de sessões deve ser exclusivamente administrativa.");
if(!sql.includes("where entidade = 'sessao'"))failures.push("O índice parcial do histórico de sessões está em falta.");
if(failures.length){console.error(`Auditoria de sessões falhou:\n- ${failures.join("\n- ")}`);process.exit(1)}
console.log("Sessões aprovadas: eventos mínimos, histórico administrativo e ausência de credenciais ou identificação do dispositivo verificados.");
