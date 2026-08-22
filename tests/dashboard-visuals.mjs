import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const root=resolve(import.meta.dirname,"..");
const html=readFileSync(resolve(root,"index.html"),"utf8");
const css=readFileSync(resolve(root,"assets/css/dashboard-executivo.css"),"utf8");
const dashboard=readFileSync(resolve(root,"assets/js/modules/dashboard.js"),"utf8");
const iconography=readFileSync(resolve(root,"assets/js/core/iconography.js"),"utf8");
const worker=readFileSync(resolve(root,"service-worker.js"),"utf8");

assert.equal((html.match(/class="(?:blue|gold|green|red) kpi-line-icon"/g)||[]).length,4,"Os quatro KPIs devem usar ícones vetoriais consistentes.");
assert(html.includes('aria-hidden="true"><svg viewBox="0 0 24 24">'),"Os ícones decorativos devem ficar ocultos da tecnologia assistiva.");
for(const token of ["premium-chart-legend","createLinearGradient","bezierCurveTo","role=\"img\"","donut-shell","Total de obras","renderVatChart","dashboardVatChart","const rows=[23,6,0].map","`IVA ${rate}%`"])assert(dashboard.includes(token),`Acabamento do gráfico em falta: ${token}`);
for(const token of [".kpi-line-icon svg",".premium-chart-legend",".donut-shell",".dashboard-vat-chart",".vat-rate-bars","prefers-reduced-motion"])assert(css.includes(token),`Estilo executivo em falta: ${token}`);
assert(html.includes('id="dashboardVatChart"'),"O dashboard deve incluir o gráfico de IVA das obras.");
assert((html.match(/data-erp-icon=/g)||[]).length>=23,"A navegação principal e móvel deve usar a iconografia aprovada.");
for(const token of ["client:","home:","works:","intelligence:","settings:","export function initIconography"])assert(iconography.includes(token),`Ícone DISTAK em falta: ${token}`);
assert(worker.includes("./assets/js/core/iconography.js"),"O PWA deve disponibilizar os ícones offline.");

console.log("Dashboard premium aprovado: ícones vetoriais, gráficos enriquecidos, acessibilidade e redução de movimento validados.");
