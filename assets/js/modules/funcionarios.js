import {store} from "../core/store.js";
import {$,esc,money,toast} from "../core/ui.js";
import {db,save,remove} from "../core/supabase.js";

const currentMonth=()=>new Date().toISOString().slice(0,7);
const hoursForMonth=(month=$("funcionarioMesFiltro")?.value||currentMonth())=>store.funcionarioHoras.filter(row=>String(row.data||"").startsWith(month));
const formatDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString("pt-PT"):"—";
const badge=value=>`<span class="badge employee-${String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}">${esc(value)}</span>`;

function fillSelectors(){
  const employee=$("funcionarioHorasFuncionario"),work=$("funcionarioHorasObra");if(!employee||!work)return;
  const selectedEmployee=employee.value,selectedWork=work.value;
  employee.innerHTML='<option value="">Selecionar</option>'+store.funcionarios.filter(f=>f.estado!=="Inativo").map(f=>`<option value="${f.id}">${esc(f.nome)} · ${esc(f.funcao||"Sem função")}</option>`).join("");
  work.innerHTML='<option value="">Sem obra associada</option>'+store.obras.map(o=>`<option value="${o.id}">${esc(o.nome)}</option>`).join("");
  employee.value=selectedEmployee;work.value=selectedWork;
}

function renderAssignments(){
  const host=$("obraAssignments");if(!host)return;
  const users=store.profiles.filter(p=>p.ativo!==false&&p.role!=="admin");
  const active=store.obraUtilizadores.filter(row=>row.ativo!==false);
  $("assignmentSummary").textContent=`${active.length} atribuição(ões)`;
  host.innerHTML=users.length?users.map(user=>{
    const assigned=new Set(active.filter(row=>String(row.user_id)===String(user.id)).map(row=>String(row.obra_id)));
    const checks=store.obras.map(obra=>`<label class="assignment-work"><input type="checkbox" value="${obra.id}" ${assigned.has(String(obra.id))?"checked":""}><span><strong>${esc(obra.nome)}</strong><small>${esc(obra.estado||"")}</small></span></label>`).join("");
    return `<article class="assignment-card" data-assignment-user="${user.id}"><header><div><strong>${esc(user.nome||user.email)}</strong><small>${esc(user.email||"")} · ${esc(user.role)}</small></div><span>${assigned.size} obra(s)</span></header><div class="assignment-works">${checks||'<p class="crm-empty">Crie uma obra antes de atribuir acessos.</p>'}</div><button class="btn primary" type="button" data-save-assignment="${user.id}">Guardar atribuições</button></article>`;
  }).join(""):'<div class="crm-empty">Não existem utilizadores operacionais ativos.</div>';
}

async function saveAssignments(userId,refresh){
  const card=document.querySelector(`[data-assignment-user="${userId}"]`);if(!card)return;
  const selected=[...card.querySelectorAll('input[type="checkbox"]:checked')].map(input=>input.value);
  const previous=store.obraUtilizadores.filter(row=>String(row.user_id)===String(userId));
  const {error:deleteError}=await db.from("obra_utilizadores").delete().eq("user_id",userId);if(deleteError)throw deleteError;
  if(selected.length){
    const payload=selected.map(obraId=>({obra_id:obraId,user_id:userId,atribuido_por:store.profile.id,ativo:true}));
    const {error:insertError}=await db.from("obra_utilizadores").insert(payload);
    if(insertError){
      if(previous.length)await db.from("obra_utilizadores").insert(previous.map(({obra_id,user_id,atribuido_por,ativo})=>({obra_id,user_id,atribuido_por,ativo})));
      throw insertError;
    }
  }
  toast("Atribuições atualizadas.");await refresh();
}

export function renderFuncionarios(){
  const month=$("funcionarioMesFiltro")?.value||currentMonth();
  if($("funcionarioMesFiltro")&&!$("funcionarioMesFiltro").value) $("funcionarioMesFiltro").value=month;
  const term=$("funcionarioSearch")?.value.trim().toLowerCase()||"";
  const state=$("funcionarioEstadoFiltro")?.value||"";
  const rows=store.funcionarios.filter(f=>(!state||f.estado===state)&&(!term||[f.nome,f.funcao,f.telefone,f.email,f.nif].some(v=>String(v||"").toLowerCase().includes(term))));
  const monthHours=hoursForMonth(month);
  const totalHours=monthHours.reduce((s,r)=>s+Number(r.horas||0),0);
  const totalCost=monthHours.reduce((s,r)=>s+Number(r.horas||0)*Number(r.funcionarios?.custo_hora||0),0);
  $("funcionariosResumo").innerHTML=`<article><span>Equipa ativa</span><strong>${store.funcionarios.filter(f=>f.estado==="Ativo").length}</strong></article><article><span>Horas no mês</span><strong>${totalHours.toFixed(1)} h</strong></article><article><span>Custo estimado</span><strong>${money(totalCost)}</strong></article><article><span>Registos no mês</span><strong>${monthHours.length}</strong></article>`;
  const employeeBody=rows.map(f=>{
    const employeeHours=monthHours.filter(r=>String(r.funcionario_id)===String(f.id)).reduce((s,r)=>s+Number(r.horas||0),0);
    return `<tr><td><strong>${esc(f.nome)}</strong><small>${esc(f.funcao||"Sem função definida")}</small></td><td>${esc(f.telefone||"—")}<small>${esc(f.email||"")}</small></td><td>${formatDate(f.data_entrada)}</td><td>${money(f.custo_hora)}</td><td><strong>${employeeHours.toFixed(1)} h</strong><small>${money(employeeHours*Number(f.custo_hora||0))}</small></td><td>${badge(f.estado)}</td><td><div class="row-actions"><button class="btn small primary" data-employee-hours="${f.id}">Horas</button><button class="btn small light" data-edit-employee="${f.id}">Editar</button><button class="btn small danger" data-delete-employee="${f.id}">Apagar</button></div></td></tr>`;
  }).join("");
  $("funcionariosTable").innerHTML=rows.length?`<div class="table-scroll"><table><thead><tr><th>Funcionário</th><th>Contacto</th><th>Entrada</th><th>Custo/hora</th><th>Horas no mês</th><th>Estado</th><th>Ações</th></tr></thead><tbody>${employeeBody}</tbody></table></div>`:'<div class="crm-empty">Sem funcionários para apresentar.</div>';
  const hoursBody=monthHours.map(r=>`<tr><td>${formatDate(r.data)}</td><td>${esc(r.funcionarios?.nome||"")}</td><td>${esc(r.obras?.nome||"Sem obra")}</td><td>${esc([r.hora_entrada,r.hora_saida].filter(Boolean).join("–")||"—")}</td><td>${Number(r.horas||0).toFixed(2)} h</td><td>${money(Number(r.horas||0)*Number(r.funcionarios?.custo_hora||0))}</td><td><button class="btn small danger" data-delete-employee-hours="${r.id}">Apagar</button></td></tr>`).join("");
  $("funcionarioHorasTable").innerHTML=monthHours.length?`<div class="table-scroll"><table><thead><tr><th>Data</th><th>Funcionário</th><th>Obra</th><th>Horário</th><th>Horas</th><th>Custo</th><th>Ações</th></tr></thead><tbody>${hoursBody}</tbody></table></div>`:'<div class="crm-empty">Sem horas registadas neste mês.</div>';
  fillSelectors();renderAssignments();
}

function openEmployee(row={}){$("funcionarioId").value=row.id||"";$("funcionarioNome").value=row.nome||"";$("funcionarioFuncao").value=row.funcao||"";$("funcionarioTelefone").value=row.telefone||"";$("funcionarioEmail").value=row.email||"";$("funcionarioNif").value=row.nif||"";$("funcionarioDataEntrada").value=row.data_entrada||"";$("funcionarioCustoHora").value=Number(row.custo_hora||0);$("funcionarioEstado").value=row.estado||"Ativo";$("funcionarioObservacoes").value=row.observacoes||"";$("funcionarioDialog").showModal()}
function openHours(employeeId=""){fillSelectors();$("funcionarioHorasId").value="";$("funcionarioHorasFuncionario").value=employeeId;$("funcionarioHorasObra").value="";$("funcionarioHorasData").value=new Date().toISOString().slice(0,10);$("funcionarioHorasEntrada").value="08:00";$("funcionarioHorasSaida").value="17:00";$("funcionarioHorasPausa").value=60;$("funcionarioHorasTotal").value=8;$("funcionarioHorasObservacoes").value="";$("funcionarioHorasDialog").showModal()}
function calculateHours(){const start=$("funcionarioHorasEntrada").value,end=$("funcionarioHorasSaida").value;if(!start||!end)return;const [sh,sm]=start.split(":").map(Number),[eh,em]=end.split(":").map(Number);let minutes=(eh*60+em)-(sh*60+sm)-Number($("funcionarioHorasPausa").value||0);if(minutes<0)minutes+=1440;$("funcionarioHorasTotal").value=Math.max(0,minutes/60).toFixed(2)}

export function initFuncionarios(refresh){
  document.addEventListener("click",async event=>{const userId=event.target.closest("[data-save-assignment]")?.dataset.saveAssignment;if(!userId)return;try{await saveAssignments(userId,refresh)}catch(err){toast(err.message,"error")}});
  $("novoFuncionarioBtn")?.addEventListener("click",()=>openEmployee());$("novoRegistoHorasBtn")?.addEventListener("click",()=>openHours());
  ["funcionarioSearch","funcionarioEstadoFiltro","funcionarioMesFiltro"].forEach(id=>$(id)?.addEventListener(id==="funcionarioSearch"?"input":"change",renderFuncionarios));
  ["funcionarioHorasEntrada","funcionarioHorasSaida","funcionarioHorasPausa"].forEach(id=>$(id)?.addEventListener("change",calculateHours));
  $("funcionarioForm")?.addEventListener("submit",async event=>{event.preventDefault();try{await save("funcionarios",{nome:$("funcionarioNome").value.trim(),funcao:$("funcionarioFuncao").value.trim()||null,telefone:$("funcionarioTelefone").value.trim()||null,email:$("funcionarioEmail").value.trim()||null,nif:$("funcionarioNif").value.trim()||null,data_entrada:$("funcionarioDataEntrada").value||null,custo_hora:Number($("funcionarioCustoHora").value||0),estado:$("funcionarioEstado").value,observacoes:$("funcionarioObservacoes").value.trim()||null,atualizado_em:new Date().toISOString()},$("funcionarioId").value||null);$("funcionarioDialog").close();toast("Funcionário guardado.");await refresh()}catch(err){toast(err.message,"error")}});
  $("funcionarioHorasForm")?.addEventListener("submit",async event=>{event.preventDefault();try{await save("funcionario_horas",{funcionario_id:$("funcionarioHorasFuncionario").value,obra_id:$("funcionarioHorasObra").value||null,data:$("funcionarioHorasData").value,hora_entrada:$("funcionarioHorasEntrada").value||null,hora_saida:$("funcionarioHorasSaida").value||null,pausa_minutos:Number($("funcionarioHorasPausa").value||0),horas:Number($("funcionarioHorasTotal").value||0),observacoes:$("funcionarioHorasObservacoes").value.trim()||null});$("funcionarioHorasDialog").close();toast("Horas registadas.");await refresh()}catch(err){toast(err.message,"error")}});
  document.addEventListener("click",async event=>{const edit=event.target.closest("[data-edit-employee]")?.dataset.editEmployee;if(edit)openEmployee(store.funcionarios.find(f=>String(f.id)===edit));const hours=event.target.closest("[data-employee-hours]")?.dataset.employeeHours;if(hours)openHours(hours);const del=event.target.closest("[data-delete-employee]")?.dataset.deleteEmployee;if(del&&confirm("Apagar este funcionário e todos os seus registos de horas?")){try{await remove("funcionarios",del);toast("Funcionário apagado.");await refresh()}catch(err){toast(err.message,"error")}}const delHours=event.target.closest("[data-delete-employee-hours]")?.dataset.deleteEmployeeHours;if(delHours&&confirm("Apagar este registo de horas?")){try{await remove("funcionario_horas",delHours);toast("Registo apagado.");await refresh()}catch(err){toast(err.message,"error")}}});
}
