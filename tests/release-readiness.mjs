import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {resolve} from "node:path";

const root=resolve(import.meta.dirname,".."),read=path=>readFileSync(resolve(root,path),"utf8"),html=read("index.html"),manifest=JSON.parse(read("manifest.json")),readme=read("README.md"),audit=read("docs/AUDITORIA_V38.md"),workflow=read(".github/workflows/quality.yml");
for(const surface of [html,manifest.name,manifest.short_name,readme])assert(String(surface).includes("v3.8"),"Uma superfície atual não anuncia v3.8.");
for(const surface of [html,manifest.name,manifest.short_name,readme])assert.equal(String(surface).includes("v3.7"),false,"Uma superfície atual ainda anuncia v3.7.");
const requirements={operations:["assets/js/modules/obras.js","assets/js/modules/agenda.js","assets/js/modules/operacional.js","assets/js/modules/dossies.js","assets/js/modules/campo.js"],finance:["assets/js/modules/orcamentos.js","assets/js/modules/custos.js","assets/js/modules/pagamentos.js","assets/js/modules/previsoes.js","assets/js/modules/medicoes.js","assets/js/modules/compras.js"],team:["assets/js/modules/funcionarios.js","assets/js/core/workload-analysis.js"],pwa:["manifest.json","service-worker.js","assets/js/core/pwa.js"],intelligence:["assets/js/modules/inteligencia.js","assets/js/modules/assistant.js","assets/js/core/assistant-local.js"],security:["assets/js/core/auth.js","assets/js/core/recovery-rehearsal.js","docs/SEGURANCA_V37.md"],validation:["assets/js/core/human-validation.js","docs/VALIDACAO_PERFIS_V38.md"]};
for(const [area,paths] of Object.entries(requirements))for(const path of paths)assert(existsSync(resolve(root,path)),`${area}: falta ${path}`);
for(const view of ["dashboard","obras","operacional","agenda","dossies","orcamentos","compras","medicoes","custos","pagamentos","previsoes","inteligencia","funcionarios","relatorios","funcionario"])assert(html.includes(`id="view-${view}"`),`Vista obrigatória em falta: ${view}`);
for(const statement of ["Identidade visual aprovada","Administrador e Funcionário","Operação de obras","Finanças","Equipa","PWA móvel","Inteligência integrada","Testes abrangentes","Documentação e publicação","Aguardando execução real 4/4"])assert(audit.includes(statement),`Auditoria v3.8 incompleta: ${statement}`);
for(const pin of ["actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1","actions/setup-node@820762786026740c76f36085b0efc47a31fe5020"])assert(workflow.includes(pin),`Ação não fixada: ${pin}`);
assert.equal(workflow.includes("actions/checkout@v4"),false);assert.equal(workflow.includes("actions/setup-node@v4"),false);
assert.equal(manifest.start_url,"./");assert.equal(manifest.scope,"./");assert.equal(manifest.display,"standalone");
console.log("Prontidão de lançamento aprovada: v3.8 alinhada, requisitos mapeados, automação atualizada e validação humana 4/4 corretamente mantida como pendente.");
