import {$,esc,toast} from "../core/ui.js";
import {db,save} from "../core/supabase.js";
import {store} from "../core/store.js";
import {listQueuedFieldRecords,queueFieldRecord,removeQueuedFieldRecord} from "../core/field-queue.js";

const BUCKET="distak-obras";
const today=()=>new Date().toISOString().slice(0,10);
const isAdmin=()=>store.profile?.role==="admin";
const workName=id=>(store.obras||[]).find(row=>String(row.id)===String(id))?.nome||"Obra";
const typeLabel=value=>({diario:"Diário",horas:"Horas",material:"Material",ocorrencia:"Ocorrência",fotografia:"Fotografia"}[value]||value);
const stateLabel=value=>({pendente:"A aguardar revisão",aprovado:"Aprovado",rejeitado:"Rejeitado"}[value]||value);
const formatDate=value=>new Date(`${value}T12:00:00`).toLocaleDateString("pt-PT");
let refreshApp=async()=>{};
let syncing=false;
let offlineStorageAvailable=true;

async function readQueue(){
  try{const rows=await listQueuedFieldRecords();offlineStorageAvailable=true;return rows}
  catch(error){offlineStorageAvailable=false;console.warn("Fila offline indisponível:",error);return []}
}

function safeFileName(name="foto.jpg"){
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"-").toLowerCase();
}

function renderWorks(){
  const selected=$("fieldWork").value;
  $("fieldWork").innerHTML=`<option value="">Selecionar obra</option>${(store.obras||[]).map(work=>`<option value="${work.id}">${esc(work.nome)}</option>`).join("")}`;
  $("fieldWork").value=selected;
}

function renderSummary(queued=[]){
  const records=store.campoRegistos||[],current=today();
  const openTasks=(store.agendaTarefas||[]).filter(task=>task.estado!=="concluida"&&(!task.responsavel_id||String(task.responsavel_id)===String(store.profile?.id)));
  $("fieldSummary").innerHTML=`
    <article><span>Obras atribuídas</span><strong>${store.obras.length}</strong><small>Acessos ativos</small></article>
    <article><span>Tarefas abertas</span><strong>${openTasks.length}</strong><small>${openTasks.filter(task=>task.prazo<current).length} em atraso</small></article>
    <article><span>Registos hoje</span><strong>${records.filter(row=>row.data===current).length}</strong><small>Enviados para revisão</small></article>
    <article class="${queued.length?"warning":""}"><span>Por sincronizar</span><strong>${queued.length}</strong><small>${navigator.onLine?"Ligação disponível":"Sem ligação"}</small></article>`;
}

function renderTasks(){
  const rows=(store.agendaTarefas||[]).filter(task=>task.estado!=="concluida"&&(!task.responsavel_id||String(task.responsavel_id)===String(store.profile?.id))).sort((a,b)=>String(a.prazo).localeCompare(String(b.prazo))).slice(0,8);
  $("fieldTasks").innerHTML=rows.length?rows.map(task=>{const canComplete=isAdmin()||String(task.responsavel_id)===String(store.profile?.id)||String(task.criado_por)===String(store.profile?.id);return `<article class="field-task ${task.prioridade}"><div><strong>${esc(task.titulo)}</strong><small>${esc(workName(task.obra_id))} · ${formatDate(task.prazo)}</small></div><span>${esc(task.progresso||0)}%</span><button type="button" data-field-task-done="${task.id}" ${canComplete?"":"disabled"}>Concluir</button></article>`}).join(""):'<div class="field-empty">Não existem tarefas abertas atribuídas a si.</div>';
}

function renderRecords(queued=[]){
  const rows=[...(store.campoRegistos||[])].sort((a,b)=>String(b.criado_em).localeCompare(String(a.criado_em)));
  const pending=queued.map(row=>({id:row.reference,referencia_local:row.reference,...row.payload,estado:"local",criado_em:new Date(row.createdAt).toISOString()}));
  const all=[...pending,...rows];
  $("fieldRecordCount").textContent=`${all.length} registo(s)`;
  $("fieldRecords").innerHTML=all.length?all.map(row=>{const photo=row.foto_url||null;return `<article class="field-record ${esc(row.estado)}"><div class="field-record-icon">${row.tipo==="fotografia"?"▣":row.tipo==="ocorrencia"?"!":row.tipo==="horas"?"◷":"✓"}</div><div><strong>${esc(row.titulo)}</strong><small>${esc(typeLabel(row.tipo))} · ${esc(workName(row.obra_id))} · ${formatDate(row.data)}</small><p>${esc(row.detalhe)}</p>${photo?`<a class="field-photo-link" href="${esc(photo)}" target="_blank" rel="noopener">Ver fotografia</a>`:""}${row.motivo_revisao?`<em>${esc(row.motivo_revisao)}</em>`:""}</div><div class="field-record-state"><span>${row.estado==="local"?"No dispositivo":esc(stateLabel(row.estado))}</span>${isAdmin()&&row.estado==="pendente"?`<div><button type="button" data-field-review="${row.id}" data-state="aprovado">Aprovar</button><button type="button" class="reject" data-field-review="${row.id}" data-state="rejeitado">Rejeitar</button></div>`:""}</div></article>`}).join(""):'<div class="field-empty">O primeiro registo de campo aparecerá aqui.</div>';
}

async function renderQueue(){
  const queued=await readQueue();
  $("fieldOfflineState").className=`field-connectivity ${navigator.onLine?"online":"offline"}`;
  $("fieldOfflineState").innerHTML=`<i></i><span>${navigator.onLine?"Ligado":"Modo offline"}</span><small>${offlineStorageAvailable?(queued.length?`${queued.length} por sincronizar`:"Tudo sincronizado"):"Armazenamento offline indisponível"}</small>`;
  $("fieldSyncNow").disabled=!navigator.onLine||!queued.length||syncing;
  renderSummary(queued);renderRecords(queued);
}

export async function renderCampo(){
  renderWorks();renderTasks();
  $("fieldPortalTitle").textContent=isAdmin()?"Revisão dos registos de campo":"O meu dia em obra";
  $("fieldPortalSubtitle").textContent=isAdmin()?"Aprove ou rejeite os registos enviados pela equipa.":"Registe progresso, horas, materiais, ocorrências e fotografias.";
  $("fieldNewRecord").classList.toggle("hidden",isAdmin());
  await renderQueue();
}

function updateForm(){
  const type=$("fieldType").value;
  $("fieldHoursLabel").classList.toggle("hidden",type!=="horas");
  $("fieldPhotoLabel").classList.toggle("hidden",type!=="fotografia");
  const text={diario:["Resumo do dia","Descreva o trabalho executado, progresso e equipa presente"],horas:["Atividade realizada","Indique o horário ou detalhe das horas"],material:["Material","Indique quantidade utilizada, recebida ou em falta"],ocorrencia:["Ocorrência","Descreva o bloqueio, risco ou problema encontrado"],fotografia:["Descrição da fotografia","Indique o local, fase ou trabalho fotografado"]}[type];
  $("fieldTitleText").textContent=text[0];$("fieldDetail").placeholder=text[1];
}

function openForm(){
  renderWorks();$("fieldRecordForm").reset();$("fieldDate").value=today();$("fieldType").value="diario";updateForm();$("fieldRecordDialog").showModal();
}

async function compressImage(file){
  if(!file||!file.type.startsWith("image/")||file.size<2.5*1024*1024||/heic|heif/i.test(file.type))return file||null;
  try{
    const bitmap=await createImageBitmap(file),scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement("canvas");
    canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.82));bitmap.close?.();
    return blob&&blob.size<file.size?new File([blob],file.name.replace(/\.[^.]+$/,".jpg"),{type:"image/jpeg",lastModified:Date.now()}):file;
  }catch(error){console.warn("Fotografia mantida no formato original:",error);return file}
}

async function submitRecord(event){
  event.preventDefault();const reference=crypto.randomUUID(),type=$("fieldType").value,file=await compressImage($("fieldPhoto").files?.[0]);
  if(type==="fotografia"&&!file){toast("Selecione uma fotografia.","error");return}
  if(file&&!['image/jpeg','image/png','image/webp','image/heic'].includes(file.type)){toast("Utilize uma fotografia JPEG, PNG, WebP ou HEIC.","error");return}
  if(file&&file.size>50*1024*1024){toast("A fotografia não pode ultrapassar 50 MB.","error");return}
  const payload={referencia_local:reference,obra_id:$("fieldWork").value,tipo:type,data:$("fieldDate").value,titulo:$("fieldTitle").value.trim(),detalhe:$("fieldDetail").value.trim(),observacoes:$("fieldNotes").value.trim()||null,horas:type==="horas"?Number($("fieldHours").value||0):null,criado_por:store.profile.id};
  const button=$("fieldRecordSave");button.disabled=true;
  try{
    await queueFieldRecord({reference,payload,file:file||null,createdAt:Date.now()});$("fieldRecordDialog").close();await renderQueue();
    if(navigator.onLine)await syncQueue();else toast("Registo guardado no dispositivo. Será sincronizado quando houver ligação.");
  }catch(error){toast(error.message||"Não foi possível guardar o registo.","error")}finally{button.disabled=false}
}

async function uploadQueuedPhoto(row){
  if(!row.file)return null;
  const path=`obras/${row.payload.obra_id}/campo/${row.reference}-${safeFileName(row.file.name)}`;
  const {error}=await db.storage.from(BUCKET).upload(path,row.file,{contentType:row.file.type||"image/jpeg",upsert:false});
  if(error&&!/already exists|duplicate/i.test(error.message||""))throw error;
  return path;
}

async function syncQueue(){
  if(syncing||!navigator.onLine)return;syncing=true;await renderQueue();
  let sent=0;
  try{
    for(const row of await readQueue()){
      try{
        const foto_path=await uploadQueuedPhoto(row);const {error}=await db.from("campo_registos").insert({...row.payload,foto_path});
        if(error&&!/duplicate key/i.test(error.message||""))throw error;
        await removeQueuedFieldRecord(row.reference);sent++;
      }catch(error){console.error("Sincronização de campo interrompida:",error);toast("Um registo continua guardado no dispositivo para nova tentativa.","error");break}
    }
    if(sent){await refreshApp();toast(`${sent} registo(s) sincronizado(s).`)}
  }finally{syncing=false;await renderQueue()}
}

async function completeTask(id){
  const task=store.agendaTarefas.find(row=>String(row.id)===String(id));if(!task)return;
  try{await save("agenda_tarefas",{estado:"concluida",progresso:100,concluida_em:new Date().toISOString(),atualizado_em:new Date().toISOString()},id);await refreshApp();toast("Tarefa concluída.")}catch(error){toast(error.message||"Não foi possível concluir a tarefa.","error")}
}

async function reviewRecord(id,state){
  const reason=state==="rejeitado"?prompt("Indique o motivo da rejeição:",""):null;if(state==="rejeitado"&&!reason)return;
  try{await save("campo_registos",{estado:state,revisto_por:store.profile.id,revisto_em:new Date().toISOString(),motivo_revisao:reason||null,atualizado_em:new Date().toISOString()},id);await refreshApp();toast(state==="aprovado"?"Registo aprovado.":"Registo devolvido à equipa.")}catch(error){toast(error.message||"Não foi possível rever o registo.","error")}
}

export function initCampo(refresh){
  refreshApp=refresh;$("fieldNewRecord").onclick=openForm;$("fieldType").onchange=updateForm;$("fieldRecordForm").onsubmit=submitRecord;$("fieldSyncNow").onclick=syncQueue;
  addEventListener("online",()=>{renderQueue();syncQueue()});addEventListener("offline",renderQueue);
  document.body.addEventListener("click",event=>{const task=event.target.closest("[data-field-task-done]")?.dataset.fieldTaskDone;if(task)completeTask(task);const review=event.target.closest("[data-field-review]");if(review)reviewRecord(review.dataset.fieldReview,review.dataset.state)});
}
