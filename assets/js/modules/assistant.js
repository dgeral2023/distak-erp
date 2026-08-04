import {$,esc,setView} from "../core/ui.js";
import {db} from "../core/supabase.js";
import {store} from "../core/store.js";

const history=[];
let busy=false;

function addMessage(role,text,mode,actions=[]){
  const message={role,text:String(text||"")};
  history.push(message);
  if(history.length>12)history.splice(0,history.length-12);
  const article=document.createElement("article");
  article.className=`ai-message ${role}`;
  article.innerHTML=`${esc(message.text)}${mode?`<small class="ai-message-meta">${mode==="openai"?"Resposta com IA":"Análise automática dos dados atuais"}</small>`:""}${actions.length?`<div class="ai-message-actions">${actions.map((action,index)=>`<button type="button" data-assistant-action="${index}" data-view="${esc(action.view||"")}" data-work="${esc(action.work_id||"")}">${esc(action.label)}</button>`).join("")}</div>`:""}`;
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
    addMessage("assistant",data?.answer||"Não foi possível gerar uma resposta.",data?.mode,data?.actions||[]);
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
  $("aiAssistantMessages").onclick=e=>{const button=e.target.closest("[data-assistant-action]");if(!button)return;closeAssistant();if(button.dataset.view)setView(button.dataset.view);if(button.dataset.work)setTimeout(()=>document.querySelector(`[data-view-obra="${button.dataset.work}"]`)?.click(),80)};
  $("aiPriorityAction").onclick=()=>{openAssistant();ask("Quais são as prioridades de gestão neste momento?")};
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("aiAssistantPanel").classList.contains("hidden"))closeAssistant()});
  addMessage("assistant","Olá! Sou o Assistente DISTAK. Posso resumir obras, previsões, cobranças, custos e alertas usando apenas os dados a que tem acesso.");
}

const num=value=>Number(value||0)||0;
const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const workValue=work=>num(work.valor_contratado||work.valor_total||work.valor);

export function renderAssistantInsight(){
  if(!$("aiPrioritySummary"))return;
  const now=new Date();
  const overdue=(store.custos||[]).filter(cost=>norm(cost.estado_pagamento)!=="pago"&&cost.data_vencimento&&new Date(`${cost.data_vencimento}T23:59:59`)<now);
  const risky=(store.obras||[]).filter(work=>norm(work.estado).includes("atras")||norm(work.estado).includes("suspens"));
  const noIncome=(store.obras||[]).filter(work=>workValue(work)>0&&!(store.pagamentos||[]).some(payment=>String(payment.obra_id)===String(work.id)));
  const localNow=new Date();localNow.setMinutes(localNow.getMinutes()-localNow.getTimezoneOffset());const today=localNow.toISOString().slice(0,10),lateTasks=(store.agendaTarefas||[]).filter(task=>task.estado!=="concluida"&&task.prazo<today),todayTasks=(store.agendaTarefas||[]).filter(task=>task.estado!=="concluida"&&task.prazo===today);
  const lateForecasts=(store.previsoesFinanceiras||[]).filter(row=>!["realizado","cancelado"].includes(row.estado)&&row.data_prevista<today);
  const parts=[];
  if(risky.length)parts.push(`<strong>${risky.length}</strong> obra(s) em atraso ou suspensas`);
  if(overdue.length)parts.push(`<strong>${overdue.length}</strong> custo(s) vencido(s)`);
  if(noIncome.length)parts.push(`<strong>${noIncome.length}</strong> obra(s) sem recebimentos`);
  if(lateTasks.length)parts.push(`<strong>${lateTasks.length}</strong> tarefa(s) atrasada(s)`);
  if(todayTasks.length)parts.push(`<strong>${todayTasks.length}</strong> tarefa(s) para hoje`);
  if(lateForecasts.length)parts.push(`<strong>${lateForecasts.length}</strong> previsão(ões) vencida(s)`);
  $("aiPrioritySummary").innerHTML=parts.length?`Recomendo atenção a ${parts.join(" · ")}.`:`Sem alertas críticos. Pode concentrar-se no acompanhamento das obras e nas próximas cobranças.`;
  $("aiPriorityCard").classList.toggle("all-clear",!parts.length);
}
