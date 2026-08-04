import {$,esc} from "../core/ui.js";
import {db} from "../core/supabase.js";

const history=[];
let busy=false;

function addMessage(role,text,mode){
  const message={role,text:String(text||"")};
  history.push(message);
  if(history.length>12)history.splice(0,history.length-12);
  const article=document.createElement("article");
  article.className=`ai-message ${role}`;
  article.innerHTML=`${esc(message.text)}${mode?`<small class="ai-message-meta">${mode==="openai"?"Resposta com IA":"Análise automática dos dados atuais"}</small>`:""}`;
  $("aiAssistantMessages").appendChild(article);
  $("aiAssistantMessages").scrollTop=$("aiAssistantMessages").scrollHeight;
  return article;
}

function openAssistant(){
  $("aiAssistantPanel").classList.remove("hidden");
  $("aiAssistantBackdrop").classList.remove("hidden");
  $("aiAssistantPanel").setAttribute("aria-hidden","false");
  $("aiAssistantButton").setAttribute("aria-expanded","true");
  setTimeout(()=>$("aiAssistantInput").focus(),50);
}
function closeAssistant(){
  $("aiAssistantPanel").classList.add("hidden");
  $("aiAssistantBackdrop").classList.add("hidden");
  $("aiAssistantPanel").setAttribute("aria-hidden","true");
  $("aiAssistantButton").setAttribute("aria-expanded","false");
}

async function ask(message){
  if(busy||!message.trim())return;
  busy=true;addMessage("user",message.trim());
  const loading=addMessage("assistant","A analisar os dados permitidos da DISTAK…");
  loading.classList.add("loading");
  $("aiAssistantSend").disabled=true;
  try{
    const conversation=history.slice(0,-1).filter(x=>!x.text.includes("A analisar os dados")).slice(-6);
    const {data,error}=await db.functions.invoke("assistente-distak",{body:{message:message.trim(),history:conversation}});
    if(error)throw error;
    loading.remove();
    addMessage("assistant",data?.answer||"Não foi possível gerar uma resposta.",data?.mode);
  }catch(err){
    loading.remove();
    addMessage("assistant",err?.message?.includes("401")?"A sessão expirou. Entre novamente para consultar o assistente.":"O assistente está temporariamente indisponível. Os restantes módulos do ERP continuam a funcionar normalmente.");
  }finally{busy=false;$("aiAssistantSend").disabled=false}
}

export function initAssistant(){
  $("aiAssistantButton").onclick=openAssistant;
  $("aiAssistantClose").onclick=closeAssistant;
  $("aiAssistantBackdrop").onclick=closeAssistant;
  $("aiAssistantForm").onsubmit=e=>{e.preventDefault();const input=$("aiAssistantInput"),value=input.value;input.value="";ask(value)};
  $("aiAssistantInput").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("aiAssistantForm").requestSubmit()}};
  $("aiAssistantSuggestions").onclick=e=>{const button=e.target.closest("button");if(button){openAssistant();ask(button.textContent)}};
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("aiAssistantPanel").classList.contains("hidden"))closeAssistant()});
  addMessage("assistant","Olá! Sou o Assistente DISTAK. Posso resumir obras, recebimentos, custos e alertas usando apenas os dados a que tem acesso.");
}
