import {$,esc,toast} from "../core/ui.js";
import {save} from "../core/supabase.js";
import {store} from "../core/store.js";

let weekStart=startOfWeek(new Date());
let refreshApp=async()=>{};

const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const iso=date=>{const d=new Date(date);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
const parseDate=value=>new Date(`${value}T12:00:00`);
const today=()=>iso(new Date());
function startOfWeek(value){const date=new Date(value),day=(date.getDay()+6)%7;date.setHours(12,0,0,0);date.setDate(date.getDate()-day);return date}
function addDays(value,days){const date=new Date(value);date.setDate(date.getDate()+days);return date}
function profileName(id){const row=(store.profiles||[]).find(item=>String(item.id)===String(id));return row?.nome||row?.email||"Sem responsável"}
function employeeName(id){return (store.funcionarios||[]).find(item=>String(item.id)===String(id))?.nome||""}
function workName(id){return (store.obras||[]).find(item=>String(item.id)===String(id))?.nome||"Obra"}
function stateLabel(value){return {pendente:"Pendente",em_curso:"Em curso",bloqueada:"Bloqueada",concluida:"Concluída"}[value]||value}
function priorityLabel(value){return {baixa:"Baixa",media:"Média",alta:"Alta",urgente:"Urgente"}[value]||value}
function canEdit(task){return store.profile?.role==="admin"||String(task.criado_por)===String(store.profile?.id)||String(task.responsavel_id)===String(store.profile?.id)}

function filteredTasks(){
  const search=norm($("agendaSearch").value),state=$("agendaStateFilter").value,priority=$("agendaPriorityFilter").value;
  return (store.agendaTarefas||[]).filter(task=>(!state||task.estado===state)&&(!priority||task.prioridade===priority)&&(!search||norm(`${task.titulo} ${task.descricao} ${workName(task.obra_id)} ${profileName(task.responsavel_id)}`).includes(search)));
}

export function renderAgenda(){
  const tasks=store.agendaTarefas||[],current=today(),weekLimit=iso(addDays(new Date(),7));
  const open=tasks.filter(task=>task.estado!=="concluida");
  const overdue=open.filter(task=>task.prazo<current),dueToday=open.filter(task=>task.prazo===current),next=open.filter(task=>task.prazo>current&&task.prazo<=weekLimit);
  $("agendaTodayCount").textContent=dueToday.length;$("agendaOverdueCount").textContent=overdue.length;$("agendaWeekCount").textContent=next.length;
  const done=tasks.filter(task=>task.estado==="concluida").length;$("agendaDoneCount").textContent=done;$("agendaDoneRate").textContent=`${tasks.length?Math.round(done/tasks.length*100):0}% do total`;
  $("navTaskCount").textContent=overdue.length+dueToday.length;$("navTaskCount").classList.toggle("hidden",!overdue.length&&!dueToday.length);
  renderWeek(filteredTasks());renderTaskList(filteredTasks());
}

function renderWeek(tasks){
  const end=addDays(weekStart,6);
  $("agendaWeekLabel").textContent=`${weekStart.toLocaleDateString("pt-PT",{day:"2-digit",month:"short"})} — ${end.toLocaleDateString("pt-PT",{day:"2-digit",month:"short",year:"numeric"})}`;
  $("agendaWeekGrid").innerHTML=Array.from({length:7},(_,index)=>{
    const date=addDays(weekStart,index),key=iso(date),rows=tasks.filter(task=>task.prazo===key).sort((a,b)=>String(a.hora||"").localeCompare(String(b.hora||"")));
    return `<article class="agenda-day ${key===today()?"today":""}"><header><span>${esc(date.toLocaleDateString("pt-PT",{weekday:"short"}))}</span><strong>${date.getDate()}</strong></header>${rows.slice(0,4).map(task=>`<button class="agenda-day-task ${esc(task.prioridade)} ${esc(task.estado)}" type="button" data-edit-task="${task.id}"><strong>${esc(task.titulo)}</strong><small>${esc(task.hora?.slice(0,5)||"")} ${esc(workName(task.obra_id))}</small></button>`).join("")}${rows.length>4?`<span class="agenda-more">+${rows.length-4} tarefa(s)</span>`:""}</article>`;
  }).join("");
}

function renderTaskList(tasks){
  const priorityOrder={urgente:0,alta:1,media:2,baixa:3};
  const rows=[...tasks].sort((a,b)=>(a.estado==="concluida"?1:0)-(b.estado==="concluida"?1:0)||String(a.prazo).localeCompare(String(b.prazo))||(priorityOrder[a.prioridade]??9)-(priorityOrder[b.prioridade]??9));
  $("agendaResultCount").textContent=`${rows.length} tarefa(s)`;
  $("agendaTaskList").innerHTML=rows.length?rows.map(task=>`<article class="agenda-task"><button class="agenda-task-check ${task.estado==="concluida"?"done":""}" type="button" data-task-toggle="${task.id}" aria-label="${task.estado==="concluida"?"Reabrir":"Concluir"} tarefa">${task.estado==="concluida"?"✓":""}</button><div class="agenda-task-main"><strong>${esc(task.titulo)}</strong><small>${esc(workName(task.obra_id))}${task.descricao?` · ${esc(task.descricao)}`:""}</small></div><div class="agenda-task-meta"><span>Prazo</span><strong>${parseDate(task.prazo).toLocaleDateString("pt-PT")}${task.hora?` · ${esc(task.hora.slice(0,5))}`:""}</strong></div><div class="agenda-task-meta secondary"><span>Responsável</span><strong>${esc(employeeName(task.funcionario_id)||profileName(task.responsavel_id))}</strong></div><div><span class="agenda-priority ${esc(task.prioridade)}">${esc(priorityLabel(task.prioridade))}</span> <span class="agenda-state ${esc(task.estado)}">${esc(stateLabel(task.estado))}</span></div>${canEdit(task)?`<div class="agenda-task-actions"><button type="button" data-edit-task="${task.id}" aria-label="Editar tarefa">✎</button></div>`:""}</article>`).join(""):'<div class="agenda-empty">Ainda não existem tarefas com estes filtros.</div>';
}

function fillOptions(){
  $("agendaTaskWork").innerHTML=`<option value="">Selecionar obra</option>${(store.obras||[]).map(work=>`<option value="${work.id}">${esc(work.nome)}</option>`).join("")}`;
  $("agendaTaskResponsible").innerHTML=`<option value="">Sem responsável no ERP</option>${(store.profiles||[]).filter(profile=>profile.ativo!==false).map(profile=>`<option value="${profile.id}">${esc(profile.nome||profile.email)}</option>`).join("")}`;
  $("agendaTaskEmployee").innerHTML=`<option value="">Sem funcionário associado</option>${(store.funcionarios||[]).filter(employee=>norm(employee.estado)!=="inativo").map(employee=>`<option value="${employee.id}">${esc(employee.nome)}</option>`).join("")}`;
}

function openTask(task={}){
  fillOptions();const current=today();
  $("agendaTaskDialogTitle").textContent=task.id?"Editar tarefa":"Nova tarefa";$("agendaTaskId").value=task.id||"";$("agendaTaskTitle").value=task.titulo||"";$("agendaTaskWork").value=task.obra_id||"";$("agendaTaskPriority").value=task.prioridade||"media";$("agendaTaskStart").value=task.inicio||current;$("agendaTaskDue").value=task.prazo||current;$("agendaTaskTime").value=task.hora?.slice(0,5)||"";$("agendaTaskState").value=task.estado||"pendente";$("agendaTaskResponsible").value=task.responsavel_id||store.profile?.id||"";$("agendaTaskEmployee").value=task.funcionario_id||"";$("agendaTaskDescription").value=task.descricao||"";
  $("agendaTaskDialog").showModal();
}

export function openAgendaTask(task={}){openTask(task)}

async function submitTask(event){
  event.preventDefault();const id=$("agendaTaskId").value,state=$("agendaTaskState").value;
  const payload={obra_id:$("agendaTaskWork").value,titulo:$("agendaTaskTitle").value.trim(),descricao:$("agendaTaskDescription").value.trim()||null,responsavel_id:$("agendaTaskResponsible").value||null,funcionario_id:$("agendaTaskEmployee").value||null,inicio:$("agendaTaskStart").value,prazo:$("agendaTaskDue").value,hora:$("agendaTaskTime").value||null,prioridade:$("agendaTaskPriority").value,estado:state,atualizado_em:new Date().toISOString(),concluida_em:state==="concluida"?new Date().toISOString():null};
  if(payload.prazo<payload.inicio){toast("O prazo não pode ser anterior ao início.","error");return}
  const button=$("agendaTaskSave");button.disabled=true;
  try{await save("agenda_tarefas",payload,id||null);$("agendaTaskDialog").close();await refreshApp();toast(id?"Tarefa atualizada.":"Tarefa criada.")}catch(error){toast(error.message||"Não foi possível guardar a tarefa.","error")}finally{button.disabled=false}
}

async function toggleTask(task){
  const done=task.estado==="concluida";
  try{await save("agenda_tarefas",{estado:done?"pendente":"concluida",concluida_em:done?null:new Date().toISOString(),atualizado_em:new Date().toISOString()},task.id);await refreshApp();toast(done?"Tarefa reaberta.":"Tarefa concluída.")}catch(error){toast(error.message||"Não foi possível atualizar a tarefa.","error")}
}

export function initAgenda(refresh){
  refreshApp=refresh;$("novaTarefaBtn").onclick=()=>openTask();$("agendaTaskForm").onsubmit=submitTask;
  $("agendaPrevWeek").onclick=()=>{weekStart=addDays(weekStart,-7);renderAgenda()};$("agendaNextWeek").onclick=()=>{weekStart=addDays(weekStart,7);renderAgenda()};$("agendaCurrentWeek").onclick=()=>{weekStart=startOfWeek(new Date());renderAgenda()};
  ["agendaSearch","agendaStateFilter","agendaPriorityFilter"].forEach(id=>$(id).addEventListener(id==="agendaSearch"?"input":"change",renderAgenda));
  document.body.addEventListener("click",event=>{const edit=event.target.closest("[data-edit-task]")?.dataset.editTask,toggle=event.target.closest("[data-task-toggle]")?.dataset.taskToggle;if(edit){const task=(store.agendaTarefas||[]).find(item=>String(item.id)===String(edit));if(task&&canEdit(task))openTask(task)}if(toggle){const task=(store.agendaTarefas||[]).find(item=>String(item.id)===String(toggle));if(task&&canEdit(task))toggleTask(task)}});
}
