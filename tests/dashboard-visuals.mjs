import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const root=resolve(import.meta.dirname,"..");
const html=readFileSync(resolve(root,"index.html"),"utf8");
const css=readFileSync(resolve(root,"assets/css/dashboard-executivo.css"),"utf8");
const dashboard=readFileSync(resolve(root,"assets/js/modules/dashboard.js"),"utf8");

assert.equal((html.match(/class="(?:blue|gold|green|red) kpi-line-icon"/g)||[]).length,4,"Os quatro KPIs devem usar ícones vetoriais consistentes.");
assert(html.includes('aria-hidden="true"><svg viewBox="0 0 24 24">'),"Os ícones decorativos devem ficar ocultos da tecnologia assistiva.");
for(const token of ["premium-chart-legend","createLinearGradient","bezierCurveTo","role=\"img\"","donut-shell","Total de obras"])assert(dashboard.includes(token),`Acabamento do gráfico em falta: ${token}`);
for(const token of [".kpi-line-icon svg",".premium-chart-legend",".donut-shell","prefers-reduced-motion"])assert(css.includes(token),`Estilo executivo em falta: ${token}`);

console.log("Dashboard premium aprovado: ícones vetoriais, gráficos enriquecidos, acessibilidade e redução de movimento validados.");
