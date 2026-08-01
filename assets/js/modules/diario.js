import {db} from "../core/supabase.js";
import {$,esc,toast} from "../core/ui.js";

let obraAtual=null;
let diarios=[];
let fotografias=[];
let documentos=[];

const today=()=>new Date().toISOString().slice(0,10);
const selectedValues=id=>[...$(id).selectedOptions].map(option=>String(option.value));
const formatDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString("pt-PT"):"—";
const textBlock=(label,value)=>value?`<div class="diario-detail"><span>${label}</span><strong>${esc(value)}</strong></div>`:"";

function resetForm(){
  const form=$("diarioForm");
  if(!form)return;
  form.reset();
  $("diarioId").value="";
  $("diarioData").value=today();
  $("diarioFormTitle").textContent="Novo registo diário";
  $("diarioSubmit").textContent="Guardar registo";
  $("diarioCancelar").classList.add("hidden");
}

function renderAttachmentOptions(){
  $("diarioFotografias").innerHTML=fotografias.length?fotografias.map(photo=>`<option value="${photo.id}">${esc([photo.titulo||photo.zona||"Fotografia",formatDate(photo.data_foto)].join(" · "))}</option>`).join(""):'<option disabled>Sem fotografias nesta obra</option>';
  $("diarioDocumentos").innerHTML=documentos.length?documentos.map(doc=>`<option value="${doc.id}">${esc(`${doc.nome} · ${doc.categoria||"Outro"}`)}</option>`).join(""):'<option disabled>Sem documentos nesta obra</option>';
}

function renderList(rows=diarios){
  const host=$("diarioLista");
  if(!host)return;
  host.innerHTML=rows.length?rows.map(row=>{
    const photoCount=Array.isArray(row.fotografia_ids)?row.fotografia_ids.length:0;
    const documentCount=Array.isArray(row.documento_ids)?row.documento_ids.length:0;
    return `<article class="diario-card">
      <header class="diario-card-head"><div><time>${formatDate(row.data)} · ${esc(row.profiles?.nome||"Equipa DISTAK")}</time><h4>${esc(row.titulo)}</h4></div><span class="diario-badge">${Number(row.horas||0).toFixed(1)} h</span></header>
      <p class="diario-description">${esc(row.descricao)}</p>
      <div class="diario-badges">${row.clima?`<span class="diario-badge">☀ ${esc(row.clima)}</span>`:""}${photoCount?`<span class="diario-badge">📷 ${photoCount}</span>`:""}${documentCount?`<span class="diario-badge">📄 ${documentCount}</span>`:""}</div>
      <div class="diario-details">${textBlock("Equipa",row.equipa)}${textBlock("Materiais",row.materiais)}${textBlock("Ocorrências",row.ocorrencias)}</div>
      <div class="diario-card-actions"><div class="diario-attachments">${photoCount?'<button class="btn light small" type="button" data-diario-tab="fotografias">Ver fotografias</button>':""}${documentCount?'<button class="btn light small" type="button" data-diario-tab="documentos">Ver documentos</button>':""}</div><div><button class="btn light small" type="button" data-diario-edit="${row.id}">Editar</button> <button class="btn danger small" type="button" data-diario-delete="${row.id}">Eliminar</button></div></div>
    </article>`;
  }).join(""):'<div class="diario-empty"><strong>Sem registos no diário</strong><p>Crie o primeiro registo diário desta obra.</p></div>';
}

async function load(){
  if(!obraAtual)return;
  $("diarioLista").innerHTML="<p>A carregar diário…</p>";
  const [diaryResult,photoResult,documentResult]=await Promise.all([
    db.from("obra_diarios").select("*,profiles(nome)").eq("obra_id",obraAtual.id).order("data",{ascending:false}).order("criado_em",{ascending:false}),
    db.from("obra_fotografias").select("id,titulo,zona,data_foto").eq("obra_id",obraAtual.id).order("created_at",{ascending:false}),
    db.from("obra_documentos").select("id,nome,categoria").eq("obra_id",obraAtual.id).order("criado_em",{ascending:false})
  ]);
  if(diaryResult.error)throw diaryResult.error;
  if(photoResult.error)throw photoResult.error;
  if(documentResult.error)throw documentResult.error;
  diarios=diaryResult.data||[];
  fotografias=photoResult.data||[];
  documentos=documentResult.data||[];
  renderAttachmentOptions();
  renderList();
}

export async function renderObraDiario(obra){
  obraAtual=obra;
  resetForm();
  try{await load()}catch(err){$("diarioLista").innerHTML=`<p class="error">${esc(err.message)}</p>`}
}

function editEntry(id){
  const row=diarios.find(item=>String(item.id)===String(id));
  if(!row)return;
  $("diarioId").value=row.id;
  $("diarioData").value=row.data||today();
  $("diarioTitulo").value=row.titulo||"";
  $("diarioClima").value=row.clima||"";
  $("diarioHoras").value=row.horas??"";
  $("diarioDescricao").value=row.descricao||"";
  $("diarioEquipa").value=row.equipa||"";
  $("diarioMateriais").value=row.materiais||"";
  $("diarioOcorrencias").value=row.ocorrencias||"";
  const photoIds=new Set((row.fotografia_ids||[]).map(String));
  const documentIds=new Set((row.documento_ids||[]).map(String));
  [...$("diarioFotografias").options].forEach(option=>option.selected=photoIds.has(String(option.value)));
  [...$("diarioDocumentos").options].forEach(option=>option.selected=documentIds.has(String(option.value)));
  $("diarioFormTitle").textContent="Editar registo diário";
  $("diarioSubmit").textContent="Guardar alterações";
  $("diarioCancelar").classList.remove("hidden");
  $("diarioForm").scrollIntoView({behavior:"smooth",block:"start"});
}

async function deleteEntry(id){
  const row=diarios.find(item=>String(item.id)===String(id));
  if(!row||!confirm(`Eliminar o registo "${row.titulo}"?`))return;
  try{
    const {error}=await db.from("obra_diarios").delete().eq("id",row.id);
    if(error)throw error;
    toast("Registo do diário eliminado.");
    await load();
  }catch(err){toast(err.message,"error")}
}

async function submitEntry(event){
  event.preventDefault();
  if(!obraAtual)return;
  const form=event.currentTarget;
  const button=$("diarioSubmit");
  const id=$("diarioId").value;
  const payload={
    obra_id:obraAtual.id,
    data:$("diarioData").value,
    titulo:$("diarioTitulo").value.trim(),
    descricao:$("diarioDescricao").value.trim(),
    clima:$("diarioClima").value||null,
    equipa:$("diarioEquipa").value.trim()||null,
    horas:$("diarioHoras").value===""?null:Number($("diarioHoras").value),
    materiais:$("diarioMateriais").value.trim()||null,
    ocorrencias:$("diarioOcorrencias").value.trim()||null,
    fotografia_ids:selectedValues("diarioFotografias"),
    documento_ids:selectedValues("diarioDocumentos"),
    atualizado_em:new Date().toISOString()
  };
  button.disabled=true;
  try{
    const {data:{user},error:userError}=await db.auth.getUser();
    if(userError)throw userError;
    if(!id)payload.created_by=user.id;
    const query=id?db.from("obra_diarios").update(payload).eq("id",id):db.from("obra_diarios").insert(payload);
    const {error}=await query;
    if(error)throw error;
    resetForm();
    await load();
    toast(id?"Registo do diário atualizado.":"Registo adicionado ao diário.");
  }catch(err){toast(err.message,"error")}
  finally{if(form.isConnected)button.disabled=false}
}

export function initDiario(){
  $("diarioForm")?.addEventListener("submit",submitEntry);
  $("diarioNovo")?.addEventListener("click",()=>{resetForm();$("diarioForm").scrollIntoView({behavior:"smooth",block:"start"})});
  $("diarioCancelar")?.addEventListener("click",resetForm);
  $("diarioPesquisa")?.addEventListener("input",event=>{
    const term=event.target.value.trim().toLowerCase();
    renderList(!term?diarios:diarios.filter(row=>[row.titulo,row.descricao,row.clima,row.equipa,row.materiais,row.ocorrencias,row.profiles?.nome].some(value=>String(value||"").toLowerCase().includes(term))));
  });
  document.addEventListener("click",event=>{
    const edit=event.target.closest("[data-diario-edit]")?.dataset.diarioEdit;
    const remove=event.target.closest("[data-diario-delete]")?.dataset.diarioDelete;
    const tab=event.target.closest("[data-diario-tab]")?.dataset.diarioTab;
    if(edit){editEntry(edit);return}
    if(remove){deleteEntry(remove);return}
    if(tab)document.querySelector(`[data-obra-tab="${tab}"]`)?.click();
  });
}
