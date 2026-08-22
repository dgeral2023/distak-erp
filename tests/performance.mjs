import {readFileSync,readdirSync,statSync} from "node:fs";
import {dirname,join,resolve} from "node:path";

const root=resolve(import.meta.dirname,"..");
const files=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(directory,entry.name)):[join(directory,entry.name)]);
const css=files(join(root,"assets","css")).filter(path=>path.endsWith(".css"));
const js=files(join(root,"assets","js")).filter(path=>path.endsWith(".js")&&!path.includes(`${join("assets","assets")}`));
const vendorJs=files(join(root,"assets","vendor")).filter(path=>path.endsWith(".js"));
const size=paths=>paths.reduce((sum,path)=>sum+statSync(path).size,0);
const staticGraph=(entry,seen=new Set())=>{
  const clean=entry.split(/[?#]/,1)[0];
  if(seen.has(clean))return seen;
  seen.add(clean);
  const source=readFileSync(clean,"utf8");
  for(const match of source.matchAll(/\bimport\s+(?:[^"'()]*?\s+from\s+)?["'](\.[^"']+)["']/g))staticGraph(resolve(dirname(clean),match[1]),seen);
  return seen;
};
const eagerJs=[join(root,"assets","js","config.js"),join(root,"assets","js","core","bootstrap-errors.js"),...staticGraph(join(root,"assets","js","app.js"))].filter(path=>path.startsWith(join(root,"assets","js")));
const indexSize=statSync(join(root,"index.html")).size,cssSize=size(css),jsSize=size(js),eagerJsSize=size([...new Set(eagerJs)]),vendorSize=size(vendorJs);
const budgets={index:115_000,css:165_000,js:400_000,eagerJs:385_000,vendor:120_000,single:25_000};
const failures=[];
const relationIndexes=readFileSync(join(root,"supabase","migrations","20260806175141_indices_relacoes_operacionais_v35.sql"),"utf8");
for(const required of ["compras_pedidos_criado_por_idx","compras_propostas_criado_por_idx","medicoes_autos_criado_por_idx"])if(!relationIndexes.includes(required))failures.push(`Índice operacional em falta: ${required}`);
if(eagerJs.some(path=>path.endsWith(join("modules","clientes.js"))))failures.push("O módulo de clientes deve carregar apenas quando a respetiva área for aberta.");
if(indexSize>budgets.index)failures.push(`HTML ${indexSize} > ${budgets.index} bytes`);
if(cssSize>budgets.css)failures.push(`CSS ${cssSize} > ${budgets.css} bytes`);
if(jsSize>budgets.js)failures.push(`JavaScript ${jsSize} > ${budgets.js} bytes`);
if(eagerJsSize>budgets.eagerJs)failures.push(`JavaScript inicial ${eagerJsSize} > ${budgets.eagerJs} bytes`);
if(vendorSize>budgets.vendor)failures.push(`Dependências locais ${vendorSize} > ${budgets.vendor} bytes`);
for(const path of [...css,...js])if(statSync(path).size>budgets.single)failures.push(`${path.slice(root.length+1)} excede ${budgets.single} bytes`);
for(const path of vendorJs)if(statSync(path).size>budgets.vendor)failures.push(`${path.slice(root.length+1)} excede ${budgets.vendor} bytes`);
const html=readFileSync(join(root,"index.html"),"utf8"),worker=readFileSync(join(root,"service-worker.js"),"utf8");
const localStyles=[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"?]+)(?:\?[^" ]*)?"/g)].map(match=>match[1]);
for(const path of localStyles)if(!worker.includes(`'./${path}'`))failures.push(`PWA não pré-carrega ${path}`);
for(const path of js.map(path=>path.slice(root.length+1).replaceAll("\\","/")))if(!worker.includes(`'./${path}'`))failures.push(`PWA não pré-carrega ${path}`);
for(const path of vendorJs.map(path=>path.slice(root.length+1).replaceAll("\\","/")))if(!worker.includes(`'./${path}'`))failures.push(`PWA não pré-carrega ${path}`);
for(const required of ["'./assets/fragments/cliente-dialog.html'","clientFragment","'./assets/js/config.js'","'./assets/js/app.js'","'./assets/js/core/bootstrap-errors.js'","ignoreSearch:true"])if(!worker.includes(required))failures.push(`PWA incompleto: ${required}`);
if(failures.length){console.error(`Orçamento de desempenho falhou:\n- ${failures.join("\n- ")}`);process.exit(1)}
console.log(`Desempenho aprovado: HTML inicial ${indexSize} B · CSS ${cssSize} B · JS inicial ${eagerJsSize} B / total ${jsSize} B · dependência local ${vendorSize} B · ${localStyles.length} estilos no shell PWA.`);
