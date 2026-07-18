import {store} from "../core/store.js";
import {$,esc,toast} from "../core/ui.js";
import {db,query,saveReturning,remove,uploadStorage,publicStorageUrl,removeStorage} from "../core/supabase.js";

const BUCKET="distak-obras";
let obraAtual=null;
let filtroAtual="Todas";
let lightboxRows=[];
let lightboxIndex=0;
let uploading=false;

const byId=id=>store.fotografias.find(x=>String(x.id)===String(id));
const cleanName=name=>name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").toLowerCase();
const slug=value=>cleanName(value||"outros").replace(/\.[^.]+$/,"");
const formatDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString("pt-PT"):"Sem data";
const isAdmin=()=>store.profile?.role==="admin";
const canUpload=()=>["admin","funcionario"].includes(store.profile?.role);

function photoRows(){
  return store.fotografias
    .filter(x=>String(x.obra_id)===String(obraAtual?.id))
    .sort((a,b)=>new Date(b.data_foto||b.created_at)-new Date(a.data_foto||a.created_at));
}

export function renderObraFotografias(obra){
  obraAtual=obra;
  filtroAtual="Todas";
  $("photoSearch").value="";
  renderCounts();
  renderGallery();
  resetUploadForm();
  const uploadButton=$("photoUploadToggle");
  if(uploadButton)uploadButton.classList.toggle("hidden",!canUpload());
}

function renderCounts(){
  const rows=photoRows();
  const categories=["Antes","Durante","Depois","Patologias","Outros"];
  $("photoCountTodas").textContent=rows.length;
  categories.forEach(c=>{
    const el=$(`photoCount${c}`);
    if(el)el.textContent=rows.filter(x=>(x.categoria||"Outros")===c).length;
  });
}

function filteredRows(){
  const term=$("photoSearch").value.trim().toLowerCase();
  return photoRows().filter(photo=>{
    const cat=photo.categoria||"Outros";
    if(filtroAtual!=="Todas"&&cat!==filtroAtual)return false;
    if(!term)return true;
    return [photo.titulo,photo.zona,photo.descricao,photo.categoria]
      .some(v=>String(v||"").toLowerCase().includes(term));
  });
}

function renderGallery(){
  const rows=filteredRows();
  lightboxRows=rows;
  $("photoGallery").innerHTML=rows.length?rows.map(photo=>`
    <article class="photo-card">
      <button type="button" class="photo-preview" data-photo-open="${photo.id}">
        <img src="${esc(photo.url)}" alt="${esc(photo.titulo||photo.categoria||"Fotografia da obra")}" loading="lazy">
        <span class="photo-category category-${slug(photo.categoria)}">${esc(photo.categoria||"Outros")}</span>
      </button>
      <div class="photo-card-body">
        <div class="photo-card-title">
          <strong>${esc(photo.titulo||photo.zona||"Fotografia da obra")}</strong>
          <small>${formatDate(photo.data_foto)}</small>
        </div>
        <p>${esc(photo.descricao||"Sem descrição.")}</p>
        <div class="photo-card-meta">
          <span>${esc(photo.zona||"Zona não indicada")}</span>
          ${isAdmin()?`<div>
            <button type="button" class="photo-action" data-photo-edit="${photo.id}">Editar</button>
            <button type="button" class="photo-action danger" data-photo-delete="${photo.id}">Eliminar</button>
          </div>`:""}
        </div>
      </div>
    </article>`).join(""):`<div class="photo-empty">
      <strong>${photoRows().length?"Nenhuma fotografia corresponde ao filtro.":"Ainda não existem fotografias nesta obra."}</strong>
      <p>${canUpload()?"Clique em “Adicionar fotografias” para começar o registo fotográfico.":"As fotografias carregadas pela equipa aparecerão aqui."}</p>
    </div>`;
}

function toggleUpload(show){
  $("photoUploadForm").classList.toggle("hidden",!show);
  $("photoUploadToggle").textContent=show?"Fechar formulário":"Adicionar fotografias";
  if(show)$("photoCategoria").focus();
}

function resetUploadForm(){
  $("photoUploadForm").reset();
  $("photoCategoria").value="Durante";
  $("photoData").value=new Date().toISOString().slice(0,10);
  $("photoSelectionSummary").textContent="Nenhum ficheiro selecionado.";
  $("photoUploadProgress").classList.add("hidden");
  $("photoUploadProgressBar").style.width="0%";
  $("photoUploadProgressText").textContent="A preparar...";
}

function selectedSummary(){
  const files=[...$("photoFiles").files];
  if(!files.length){
    $("photoSelectionSummary").textContent="Nenhum ficheiro selecionado.";
    return;
  }
  const size=files.reduce((s,f)=>s+f.size,0)/1024/1024;
  $("photoSelectionSummary").textContent=`${files.length} ficheiro(s) selecionado(s) · ${size.toFixed(1)} MB`;
}

function validateFiles(files){
  const allowed=["image/jpeg","image/png","image/webp","image/heic","image/heif"];
  for(const file of files){
    if(!allowed.includes(file.type)&&!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)){
      throw new Error(`Formato não permitido: ${file.name}`);
    }
    if(file.size>50*1024*1024)throw new Error(`${file.name} ultrapassa o limite de 50 MB.`);
  }
}

async function uploadPhotos(event){
  event.preventDefault();
  if(uploading||!obraAtual)return;
  const files=[...$("photoFiles").files];
  try{
    validateFiles(files);
    if(!files.length)throw new Error("Selecione pelo menos uma fotografia.");
    uploading=true;
    $("photoUploadSubmit").disabled=true;
    $("photoUploadProgress").classList.remove("hidden");

    let completed=0;
    for(const file of files){
      const unique=`${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`;
      const path=`obras/${obraAtual.id}/${slug($("photoCategoria").value)}/${unique}-${cleanName(file.name)}`;

      $("photoUploadProgressText").textContent=`A carregar ${completed+1} de ${files.length}: ${file.name}`;
      await uploadStorage(BUCKET,path,file);
      const url=publicStorageUrl(BUCKET,path);

      try{
        await saveReturning("obra_fotografias",{
          obra_id:obraAtual.id,
          categoria:$("photoCategoria").value,
          titulo:$("photoTitulo").value.trim()||file.name.replace(/\.[^.]+$/,""),
          descricao:$("photoDescricao").value.trim()||null,
          zona:$("photoZona").value.trim()||null,
          ficheiro:path,
          url,
          data_foto:$("photoData").value||null,
          created_by:store.profile?.id||null
        });
      }catch(err){
        await removeStorage(BUCKET,path).catch(()=>{});
        throw err;
      }

      completed++;
      const percent=Math.round(completed/files.length*100);
      $("photoUploadProgressBar").style.width=`${percent}%`;
      $("photoUploadProgressText").textContent=`${completed} de ${files.length} fotografias carregadas`;
    }

    store.fotografias=await query("obra_fotografias");
    renderCounts();
    renderGallery();
    resetUploadForm();
    toggleUpload(false);
    toast(`${completed} fotografia(s) carregada(s).`);
  }catch(err){
    toast(err.message||"Não foi possível carregar as fotografias.","error");
  }finally{
    uploading=false;
    $("photoUploadSubmit").disabled=false;
  }
}

function openEdit(id){
  const photo=byId(id);
  if(!photo)return;
  $("photoEditId").value=photo.id;
  $("photoEditCategoria").value=photo.categoria||"Outros";
  $("photoEditZona").value=photo.zona||"";
  $("photoEditData").value=photo.data_foto||"";
  $("photoEditTitulo").value=photo.titulo||"";
  $("photoEditDescricao").value=photo.descricao||"";
  $("photoEditDialog").showModal();
}

async function saveEdit(event){
  event.preventDefault();
  try{
    const id=$("photoEditId").value;
    const {error}=await db.from("obra_fotografias").update({
      categoria:$("photoEditCategoria").value,
      zona:$("photoEditZona").value.trim()||null,
      data_foto:$("photoEditData").value||null,
      titulo:$("photoEditTitulo").value.trim()||null,
      descricao:$("photoEditDescricao").value.trim()||null
    }).eq("id",id);
    if(error)throw error;
    store.fotografias=await query("obra_fotografias");
    $("photoEditDialog").close();
    renderCounts();renderGallery();
    toast("Fotografia atualizada.");
  }catch(err){toast(err.message,"error")}
}

async function deletePhoto(id){
  const photo=byId(id);
  if(!photo||!confirm("Eliminar esta fotografia definitivamente?"))return;
  try{
    await removeStorage(BUCKET,photo.ficheiro);
    await remove("obra_fotografias",id);
    store.fotografias=store.fotografias.filter(x=>String(x.id)!==String(id));
    renderCounts();renderGallery();
    toast("Fotografia eliminada.");
  }catch(err){
    toast(err.message||"Não foi possível eliminar a fotografia.","error");
  }
}

function showLightbox(id){
  lightboxRows=filteredRows();
  lightboxIndex=Math.max(0,lightboxRows.findIndex(x=>String(x.id)===String(id)));
  renderLightbox();
  $("photoLightbox").showModal();
}

function renderLightbox(){
  const photo=lightboxRows[lightboxIndex];
  if(!photo)return;
  $("photoLightboxImage").src=photo.url;
  $("photoLightboxImage").alt=photo.titulo||"Fotografia da obra";
  $("photoLightboxTitle").textContent=photo.titulo||"Fotografia da obra";
  $("photoLightboxMeta").textContent=[photo.categoria,photo.zona,formatDate(photo.data_foto)].filter(Boolean).join(" · ");
  $("photoLightboxDescription").textContent=photo.descricao||"";
  $("photoLightboxPrev").disabled=lightboxRows.length<2;
  $("photoLightboxNext").disabled=lightboxRows.length<2;
}
function moveLightbox(step){
  if(!lightboxRows.length)return;
  lightboxIndex=(lightboxIndex+step+lightboxRows.length)%lightboxRows.length;
  renderLightbox();
}

export function initFotografias(){
  $("photoUploadToggle")?.addEventListener("click",()=>toggleUpload($("photoUploadForm").classList.contains("hidden")));
  $("photoUploadCancel")?.addEventListener("click",()=>{resetUploadForm();toggleUpload(false)});
  $("photoUploadForm")?.addEventListener("submit",uploadPhotos);
  $("photoEditForm")?.addEventListener("submit",saveEdit);
  $("photoFiles")?.addEventListener("change",selectedSummary);
  $("photoSearch")?.addEventListener("input",renderGallery);
  $("photoLightboxPrev")?.addEventListener("click",()=>moveLightbox(-1));
  $("photoLightboxNext")?.addEventListener("click",()=>moveLightbox(1));

  const drop=$("photoDropZone");
  ["dragenter","dragover"].forEach(type=>drop?.addEventListener(type,e=>{e.preventDefault();drop.classList.add("dragging")}));
  ["dragleave","drop"].forEach(type=>drop?.addEventListener(type,e=>{e.preventDefault();drop.classList.remove("dragging")}));
  drop?.addEventListener("drop",e=>{
    if(e.dataTransfer.files?.length){
      $("photoFiles").files=e.dataTransfer.files;
      selectedSummary();
    }
  });

  document.addEventListener("click",e=>{
    const filter=e.target.closest("[data-photo-filter]")?.dataset.photoFilter;
    if(filter){
      filtroAtual=filter;
      document.querySelectorAll("[data-photo-filter]").forEach(b=>b.classList.toggle("active",b.dataset.photoFilter===filter));
      renderGallery();
      return;
    }
    const open=e.target.closest("[data-photo-open]")?.dataset.photoOpen;
    if(open){showLightbox(open);return}
    const edit=e.target.closest("[data-photo-edit]")?.dataset.photoEdit;
    if(edit){openEdit(edit);return}
    const del=e.target.closest("[data-photo-delete]")?.dataset.photoDelete;
    if(del){deletePhoto(del);return}
  });

  document.addEventListener("keydown",e=>{
    if(!$("photoLightbox")?.open)return;
    if(e.key==="ArrowLeft")moveLightbox(-1);
    if(e.key==="ArrowRight")moveLightbox(1);
  });
}
