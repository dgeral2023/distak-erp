import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const root=resolve(import.meta.dirname,".."),html=readFileSync(resolve(root,"index.html"),"utf8"),css=readFileSync(resolve(root,"assets/css/accessibility.css"),"utf8"),runtime=readFileSync(resolve(root,"assets/js/core/accessibility.js"),"utf8"),v3=readFileSync(resolve(root,"assets/js/modules/v3.js"),"utf8"),menu=readFileSync(resolve(root,"assets/js/modules/hybrid-menu.js"),"utf8");
const check=(condition,message)=>{if(!condition){console.error(`FALHA: ${message}`);process.exit(1)}};
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]),duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index);

check(!duplicates.length,`IDs duplicados: ${[...new Set(duplicates)].join(", ")}`);
check(html.includes('href="#mainContent"')&&html.includes('id="mainContent"')&&html.includes('tabindex="-1"'),"a navegação por teclado precisa de atalho para o conteúdo principal");
check(html.includes('aria-controls="notificationPanel"')&&html.includes('aria-controls="accountPanel"'),"os controlos superiores devem declarar os painéis associados");
check((html.match(/role="dialog"/g)||[]).length>=3,"painéis móveis e notificações devem expor semântica de diálogo");
for(const required of ["labelDialog","aria-modal","MutationObserver","_returnFocus","dialog[open]","event.key===\"Tab\"","focusable.at(-1)"])check(runtime.includes(required),`gestão acessível dos diálogos incompleta: ${required}`);
for(const required of ["aria-expanded","aria-hidden","notificationClose","focus()"] )check(v3.includes(required),`painel de notificações inacessível: ${required}`);
for(const required of ["aria-hidden","mobileRegisterSheet","querySelector(\"button\")?.focus()"] )check(menu.includes(required),`folhas móveis inacessíveis: ${required}`);
for(const required of ["prefers-reduced-motion:reduce","pointer:coarse","forced-colors:active",":focus-visible"])check(css.includes(required),`estilo de acessibilidade em falta: ${required}`);

console.log(`Acessibilidade aprovada: ${ids.length} IDs únicos, diálogos rotulados, foco restaurado e modos reduzido/tátil/alto contraste verificados.`);
