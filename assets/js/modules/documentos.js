import {db} from "../core/supabase.js";
import {$,esc,toast} from "../core/ui.js";
import {store} from "../core/store.js";

const BUCKET="distak-documentos";
let obraAtual=null;
let documentos=[];
const bytes=n=>Number(n||0)<1048576?`${(Number(n||0)/1024).toFixed(1)} KB`:`${(Number(n||0)/1048576).toFixed(1)} MB`;
const safe=n=>n.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"-");

function filteredDocuments(){
  const term=$("workDocumentSearch")?.value.trim().toLowerCase()||"";
  const category=$("workDocumentFilter")?.value||"Todas";
  return documentos.filter(d=>(category==="Todas"||d.categoria===category)&&(!term||[d.nome,d.categoria].some(v=>String(v||"").toLowerCase().includes(term))));
}

function draw(){
  const h=$("workDocumentList");
  if(!h)return;
  const rows=filteredDocuments();
  const counter=$("workDocumentCount");
  if(counter)counter.textContent=`${rows.length} de ${documentos.length} documento(s)`;
  h.innerHTML=rows.length?rows.map(d=>`<article class="work-document-item"><span class="work-document-icon">📄</span><div><strong>${esc(d.nome)}</strong><small>${esc(d.categoria)} · ${esc(bytes(d.tamanho_bytes))} · ${new Date(d.criado_em).toLocaleDateString("pt-PT")}${d.custo_id?" · Fatura de custo":""}</small></div><div class="work-document-actions"><button class="btn small primary" type="button" data-doc-open="${d.id}">Abrir</button>${d.custo_id?"":`<button class="btn small light" type="button" data-doc-edit="${d.id}">Editar</button>`}<button class="btn small danger" type="button" data-doc-delete="${d.id}">Eliminar</button></div></article>`).join(""):`<div class="obra-placeholder"><strong>${documentos.length?"Nenhum documento corresponde ao filtro.":"Sem documentos"}</strong><p>${documentos.length?"Altere a pesquisa ou a categoria.":"Carregue o primeiro documento desta obra."}</p></div>`;
}

export async function renderObraDocumentos(obra){
  obraAtual=obra;
  const h=$("workDocumentList");
  if(!h)return;
  h.innerHTML="<p>A carregar documentos…</p>";
  const {data,error}=await db.from("obra_documentos").select("*").eq("obra_id",obra.id).order("criado_em",{ascending:false});
  if(error){h.innerHTML=`<p class="error">${esc(error.message)}</p>`;return}
  documentos=data||[];
  store.documentosObra=[...(store.documentosObra||[]).filter(row=>String(row.obra_id)!==String(obra.id)),...documentos];
  draw();
}

async function openDoc(id){
  const d=documentos.find(x=>String(x.id)===String(id));
  if(!d)return;
  const {data,error}=await db.storage.from(BUCKET).createSignedUrl(d.storage_path,60);
  if(error)return toast(error.message,"error");
  const a=document.createElement("a");a.href=data.signedUrl;a.target="_blank";a.rel="noopener";a.click();
}

function openEdit(id){
  const d=documentos.find(x=>String(x.id)===String(id));
  if(!d||d.custo_id)return;
  $("workDocumentEditId").value=d.id;
  $("workDocumentEditName").value=d.nome||"";
  $("workDocumentEditCategory").value=d.categoria||"Outro";
  $("workDocumentEditDialog").showModal();
}

async function saveEdit(event){
  event.preventDefault();
  const id=$("workDocumentEditId").value;
  try{
    const {error}=await db.from("obra_documentos").update({nome:$("workDocumentEditName").value.trim(),categoria:$("workDocumentEditCategory").value}).eq("id",id);
    if(error)throw error;
    $("workDocumentEditDialog").close();
    await renderObraDocumentos(obraAtual);
    toast("Documento atualizado.");
  }catch(err){toast(err.message,"error")}
}

async function deleteDoc(id){
  const d=documentos.find(x=>String(x.id)===String(id));
  if(!d||!confirm(`Eliminar "${d.nome}"?`))return;
  try{
    if(d.custo_id){
      const {error}=await db.from("custos").update({anexo_path:null,anexo_nome:null,anexo_mime_type:null,anexo_tamanho_bytes:null}).eq("id",d.custo_id);
      if(error)throw error;
      const {error:s}=await db.storage.from(BUCKET).remove([d.storage_path]);if(s)throw s;
      toast("Fatura removida do custo e dos documentos.");
    }else{
      const {error:s}=await db.storage.from(BUCKET).remove([d.storage_path]);if(s)throw s;
      const {error}=await db.from("obra_documentos").delete().eq("id",d.id);if(error)throw error;
      toast("Documento eliminado.");
    }
    await renderObraDocumentos(obraAtual);
  }catch(e){toast(e.message,"error")}
}

export function initDocumentos(){
  $("workDocumentForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    if(!obraAtual)return;
    const form=e.currentTarget;
    const file=$("workDocumentFile").files?.[0];
    if(!file)return;
    if(file.size>25*1048576)return toast("O ficheiro excede 25 MB.","error");
    const b=$("workDocumentSubmit"),nome=$("workDocumentName").value.trim(),categoria=$("workDocumentCategory").value;
    b.disabled=true;
    const path=`${obraAtual.id}/${crypto.randomUUID()}-${safe(file.name)}`;
    try{
      const {error:u}=await db.storage.from(BUCKET).upload(path,file,{contentType:file.type||undefined});if(u)throw u;
      const {error}=await db.from("obra_documentos").insert({obra_id:obraAtual.id,nome,categoria,storage_path:path,mime_type:file.type||null,tamanho_bytes:file.size});
      if(error){await db.storage.from(BUCKET).remove([path]);throw error}
      form.reset();await renderObraDocumentos(obraAtual);toast("Documento carregado.");
    }catch(err){toast(err.message,"error")}finally{if(b.isConnected)b.disabled=false}
  });
  $("workDocumentSearch")?.addEventListener("input",draw);
  $("workDocumentFilter")?.addEventListener("change",draw);
  $("workDocumentEditForm")?.addEventListener("submit",saveEdit);
  document.addEventListener("click",e=>{
    const o=e.target.closest("[data-doc-open]")?.dataset.docOpen;
    const d=e.target.closest("[data-doc-delete]")?.dataset.docDelete;
    const edit=e.target.closest("[data-doc-edit]")?.dataset.docEdit;
    if(o)openDoc(o);if(d)deleteDoc(d);if(edit)openEdit(edit);
  });
}
