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
function phaseLabel(value){return {preparacao:"Preparação",demolicao:"Demolição",estrutura:"Estrutura",instalacoes:"Instalações",acabamentos:"Acabamentos",entrega:"Entrega",execucao:"Execução geral"}[value]||value}
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
  renderDailyCommand(open);renderPlanning();renderWeek(filteredTasks());renderTaskList(filteredTasks());
}

function taskScore(task,current){
  const days=Math.round((parseDate(task.prazo)-parseDate(current))/86400000);
  return (days<0?120+Math.min(30,Math.abs(days)*4):Math.max(0,35-days*5))+(task.estado==="bloqueada"?55:0)+({urgente:45,alta:28,media:12,baixa:0}[task.prioridade]||0)+(task.depende_de?8:0);
}

function renderDailyCommand(open){
  const current=today(),ranked=[...open].sort((a,b)=>taskScore(b,current)-taskScore(a,current)||String(a.prazo).localeCompare(String(b.prazo)));
  const focus=ranked.slice(0,5);
  $("agendaFocusList").innerHTML=focus.length?focus.map((task,index)=>{const late=task.prazo<current,blocked=task.estado==="bloqueada";return `<button type="button" class="agenda-focus-item ${late||blocked?"risk":""}" data-edit-task="${task.id}"><b>${index+1}</b><span><strong>${esc(task.titulo)}</strong><small>${esc(workName(task.obra_id))} · ${late?`atrasada desde ${parseDate(task.prazo).toLocaleDateString("pt-PT")}`:blocked?"etapa bloqueada":`prazo ${parseDate(task.prazo).toLocaleDateString("pt-PT")}`}</small></span><em>${esc(priorityLabel(task.prioridade))}</em></button>`}).join(""):'<div class="agenda-empty compact">Sem tarefas pendentes. O planeamento está em dia.</div>';
  const groups=new Map();open.forEach(task=>{const key=task.responsavel_id||task.funcionario_id||"unassigned",name=task.responsavel_id?profileName(task.responsavel_id):task.funcionario_id?employeeName(task.funcionario_id):"Sem responsável",row=groups.get(key)||{name,total:0,late:0};row.total++;if(task.prazo<current)row.late++;groups.set(key,row)});
  const workload=[...groups.values()].sort((a,b)=>b.total-a.total),maximum=Math.max(1,...workload.map(row=>row.total));
  const unassigned=groups.get("unassigned")?.total||0;$("agendaUnassignedCount").textContent=`${unassigned} sem responsável`;
  $("agendaWorkload").innerHTML=workload.length?workload.slice(0,6).map(row=>`<article><div><strong>${esc(row.name)}</strong><span>${row.total} aberta(s)${row.late?` · ${row.late} atrasada(s)`:""}</span></div><i><em style="width:${Math.max(8,row.total/maximum*100)}%"></em></i></article>`).join(""):'<div class="agenda-empty compact">Sem carga pendente para a equipa.</div>';
}

function renderPlanning(){
  const filter=$("planningWorkFilter"),currentFilter=filter.value;filter.innerHTML=`<option value="">Todas as obras</option>${(store.obras||[]).map(work=>`<option value="${work.id}">${esc(work.nome)}</option>`).join("")}`;filter.value=currentFilter;
  const workFilter=filter.value,tasks=(store.agendaTarefas||[]).filter(task=>!workFilter||String(task.obra_id)===String(workFilter));
  const open=tasks.filter(task=>task.estado!=="concluida"),blocked=open.filter(task=>task.estado==="bloqueada"),late=open.filter(task=>task.prazo<today()),dependencies=open.filter(task=>task.depende_de&&store.agendaTarefas.find(row=>String(row.id)===String(task.depende_de))?.estado!=="concluida");
  $("planningHealth").innerHTML=`<article class="${late.length?"risk":""}"><strong>${late.length}</strong><span>etapas atrasadas</span></article><article class="${blocked.length?"risk":""}"><strong>${blocked.length}</strong><span>bloqueadas</span></article><article class="${dependencies.length?"warning":""}"><strong>${dependencies.length}</strong><span>aguardam dependência</span></article><article><strong>${tasks.length?Math.round(tasks.reduce((sum,row)=>sum+Number(row.progresso||0),0)/tasks.length):0}%</strong><span>avanço planeado</span></article>`;
  if(!tasks.length){$("planningTimeline").innerHTML='<div class="agenda-empty">Adicione etapas para construir o cronograma das obras.</div>';return}
  const starts=tasks.map(row=>parseDate(row.inicio).getTime()),ends=tasks.map(row=>parseDate(row.prazo).getTime()),minimum=Math.min(...starts),maximum=Math.max(...ends,minimum+86400000),span=Math.max(1,Math.round((maximum-minimum)/86400000)+1);
  const grouped=[...new Set(tasks.map(row=>row.obra_id))].map(id=>({id,name:workName(id),rows:tasks.filter(row=>String(row.obra_id)===String(id)).sort((a,b)=>String(a.inicio).localeCompare(String(b.inicio)))}));
  $("planningTimeline").innerHTML=`<div class="planning-scale"><span>${new Date(minimum).toLocaleDateString("pt-PT")}</span><span>${span} dias planeados</span><span>${new Date(maximum).toLocaleDateString("pt-PT")}</span></div>${grouped.map(group=>`<section><header><strong>${esc(group.name)}</strong><small>${group.rows.length} etapa(s)</small></header>${group.rows.map(task=>{const start=Math.max(0,Math.round((parseDate(task.inicio).getTime()-minimum)/86400000)),duration=Math.max(1,Math.round((parseDate(task.prazo).getTime()-parseDate(task.inicio).getTime())/86400000)+1),left=start/span*100,width=Math.max(task.marco?1.8:4,duration/span*100),dependency=task.depende_de?store.agendaTarefas.find(row=>String(row.id)===String(task.depende_de)):null;return `<button type="button" class="planning-row ${esc(task.estado)} ${task.marco?"milestone":""}" data-edit-task="${task.id}"><span class="planning-row-label"><b>${esc(task.titulo)}</b><small>${esc(phaseLabel(task.fase))}${dependency?` · após ${esc(dependency.titulo)}`:""}</small></span><span class="planning-track"><i style="left:${left}%;width:${width}%"><em style="width:${Number(task.progresso||0)}%"></em></i></span><strong>${Number(task.progresso||0)}%</strong></button>`}).join("")}</section>`).join("")}`;
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
function fillDependencies(selected=""){const currentId=$("agendaTaskId").value,workId=$("agendaTaskWork").value;$("agendaTaskDependency").innerHTML=`<option value="">Sem dependência</option>${(store.agendaTarefas||[]).filter(task=>String(task.id)!==String(currentId)&&String(task.obra_id)===String(workId)).map(task=>`<option value="${task.id}">${esc(task.titulo)}</option>`).join("")}`;$("agendaTaskDependency").value=selected||""}

function openTask(task={}){
  $("agendaTaskId").value=task.id||"";fillOptions();const current=today();
  $("agendaTaskDialogTitle").textContent=task.id?"Editar etapa":"Nova etapa";$("agendaTaskTitle").value=task.titulo||"";$("agendaTaskWork").value=task.obra_id||"";fillDependencies(task.depende_de);$("agendaTaskPriority").value=task.prioridade||"media";$("agendaTaskStart").value=task.inicio||current;$("agendaTaskDue").value=task.prazo||current;$("agendaTaskTime").value=task.hora?.slice(0,5)||"";$("agendaTaskState").value=task.estado||"pendente";$("agendaTaskPhase").value=task.fase||"execucao";$("agendaTaskProgress").value=Number(task.progresso||0);$("agendaTaskMilestone").checked=Boolean(task.marco);$("agendaTaskResponsible").value=task.responsavel_id||store.profile?.id||"";$("agendaTaskEmployee").value=task.funcionario_id||"";$("agendaTaskDescription").value=task.descricao||"";
  $("agendaTaskDialog").showModal();
}

export function openAgendaTask(task={}){openTask(task)}

async function submitTask(event){
  event.preventDefault();const id=$("agendaTaskId").value,state=$("agendaTaskState").value;
  const payload={obra_id:$("agendaTaskWork").value,titulo:$("agendaTaskTitle").value.trim(),descricao:$("agendaTaskDescription").value.trim()||null,responsavel_id:$("agendaTaskResponsible").value||null,funcionario_id:$("agendaTaskEmployee").value||null,inicio:$("agendaTaskStart").value,prazo:$("agendaTaskDue").value,hora:$("agendaTaskTime").value||null,prioridade:$("agendaTaskPriority").value,estado:state,fase:$("agendaTaskPhase").value,progresso:state==="concluida"?100:Number($("agendaTaskProgress").value||0),marco:$("agendaTaskMilestone").checked,depende_de:$("agendaTaskDependency").value||null,atualizado_em:new Date().toISOString(),concluida_em:state==="concluida"?new Date().toISOString():null};
  if(payload.prazo<payload.inicio){toast("O prazo não pode ser anterior ao início.","error");return}
  const button=$("agendaTaskSave");button.disabled=true;
  try{await save("agenda_tarefas",payload,id||null);$("agendaTaskDialog").close();await refreshApp();toast(id?"Tarefa atualizada.":"Tarefa criada.")}catch(error){toast(error.message||"Não foi possível guardar a tarefa.","error")}finally{button.disabled=false}
}

async function toggleTask(task){
  const done=task.estado==="concluida";
  try{await save("agenda_tarefas",{estado:done?"pendente":"concluida",progresso:done?0:100,concluida_em:done?null:new Date().toISOString(),atualizado_em:new Date().toISOString()},task.id);await refreshApp();toast(done?"Etapa reaberta.":"Etapa concluída.")}catch(error){toast(error.message||"Não foi possível atualizar a etapa.","error")}
}

export function initAgenda(refresh){
  refreshApp=refresh;$("novaTarefaBtn").onclick=()=>openTask();$("agendaTaskForm").onsubmit=submitTask;
  $("agendaTaskWork").onchange=()=>fillDependencies();
  $("agendaFocusAll").onclick=()=>{$("agendaSearch").value="";$("agendaStateFilter").value="";$("agendaPriorityFilter").value="";$("agendaTaskList").scrollIntoView({behavior:"smooth",block:"start"})};
  $("planningWorkFilter").onchange=renderPlanning;$("planningToday").onclick=()=>{weekStart=startOfWeek(new Date());renderAgenda()};
  $("agendaPrevWeek").onclick=()=>{weekStart=addDays(weekStart,-7);renderAgenda()};$("agendaNextWeek").onclick=()=>{weekStart=addDays(weekStart,7);renderAgenda()};$("agendaCurrentWeek").onclick=()=>{weekStart=startOfWeek(new Date());renderAgenda()};
  ["agendaSearch","agendaStateFilter","agendaPriorityFilter"].forEach(id=>$(id).addEventListener(id==="agendaSearch"?"input":"change",renderAgenda));
  document.body.addEventListener("click",event=>{const edit=event.target.closest("[data-edit-task]")?.dataset.editTask,toggle=event.target.closest("[data-task-toggle]")?.dataset.taskToggle;if(edit){const task=(store.agendaTarefas||[]).find(item=>String(item.id)===String(edit));if(task&&canEdit(task))openTask(task)}if(toggle){const task=(store.agendaTarefas||[]).find(item=>String(item.id)===String(toggle));if(task&&canEdit(task))toggleTask(task)}});
}
