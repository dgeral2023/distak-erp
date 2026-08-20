import {readFileSync,readdirSync} from "node:fs";
import {join,resolve} from "node:path";

const root=resolve(import.meta.dirname,".."),html=readFileSync(join(root,"index.html"),"utf8"),failures=[];
const js=readdirSync(join(root,"assets","js","modules"),{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith(".js"))
  .map(entry=>readFileSync(join(root,"assets","js","modules",entry.name),"utf8"))
  .join("\n")+readFileSync(join(root,"assets","js","app.js"),"utf8");

const buttons=[...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
const assistantStart=html.indexOf('id="aiAssistantSuggestions"'),assistantEnd=html.indexOf("</div>",assistantStart);
for(const match of buttons){
  const [,attributes,content]=match,index=match.index;
  if(/\btype=["']submit["']/i.test(attributes))continue;
  const insideForm=html.lastIndexOf("<form",index)>html.lastIndexOf("</form>",index);
  if(insideForm&&!/\btype=["']button["']/i.test(attributes))continue;
  if(/\bdata-[\w-]+/i.test(attributes))continue;
  if(/\bid=["']([^"']+)["']/i.test(attributes)){
    const id=attributes.match(/\bid=["']([^"']+)["']/i)[1];
    if(!js.includes(id))failures.push(`Botão #${id} não tem ligação no JavaScript.`);
    continue;
  }
  const label=content.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  if(index>assistantStart&&index<assistantEnd)continue;
  failures.push(`Botão sem identificador nem ação verificável: ${label||"sem texto"}.`);
}

if(failures.length){console.error(`Ligações de botões inválidas (${failures.length}):\n- ${failures.join("\n- ")}`);process.exit(1)}
console.log(`Ligações de botões verificadas: ${buttons.length} botões estáticos.`);
