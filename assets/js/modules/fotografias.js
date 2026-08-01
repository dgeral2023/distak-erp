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
const canDelete=()=>store.profile?.role==="admin";

async function compressImage(file){
  if(!file.type.startsWith("image/") || /heic|heif/i.test(file.type)) return file;
  if(file.size < 2.5 * 1024 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const maxDimension = 2200;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.82));
  bitmap.close?.();
  if(!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type:"image/jpeg",
    lastModified:Date.now()
  });
}

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
          <div>
            <a class="photo-action" href="${esc(photo.url)}" download target="_blank" rel="noopener">Descarregar</a>
            ${canUpload()?`<button type="button" class="photo-action" data-photo-edit="${photo.id}">Editar</button>`:""}
            ${canDelete()?`<button type="button" class="photo-action danger" data-photo-delete="${photo.id}">Eliminar</button>`:""}
          </div>
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
  $("photoLatitude").value="";
  $("photoLongitude").value="";
  $("photoCapturedAt").value=new Date().toISOString();
  $("photoGpsStatus").textContent="Localização não registada";
  $("photoGpsStatus").classList.remove("active");
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
    for(const originalFile of files){
      const file=await compressImage(originalFile);
      const unique=`${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`;
      const path=`obras/${obraAtual.id}/${slug($("photoCategoria").value)}/${unique}-${cleanName(file.name)}`;

      $("photoUploadProgressText").textContent=`A carregar ${completed+1} de ${files.length}: ${originalFile.name}`;
      await uploadStorage(BUCKET,path,file);
      const url=publicStorageUrl(BUCKET,path);

      const lat=$("photoLatitude").value;
      const lng=$("photoLongitude").value;
      const capturedAt=$("photoCapturedAt").value;
      const gpsText=lat&&lng?`Localização: ${lat}, ${lng}`:"";
      const captureText=capturedAt?`Registada em: ${new Date(capturedAt).toLocaleString("pt-PT")}`:"";
      const baseDescription=$("photoDescricao").value.trim();
      const fullDescription=[baseDescription,gpsText,captureText].filter(Boolean).join(" | ");

      try{
        await saveReturning("obra_fotografias",{
          obra_id:obraAtual.id,
          categoria:$("photoCategoria").value,
          titulo:$("photoTitulo").value.trim()||originalFile.name.replace(/\.[^.]+$/,""),
          descricao:fullDescription||null,
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

function openMobileCamera(){
  toggleUpload(true);
  setTimeout(()=>$("photoCamera")?.click(),80);
}

function scrollToGallery(){
  $("photoGallery")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function openPhotoData(){
  toggleUpload(true);
  setTimeout(()=>$("photoCategoria")?.focus(),120);
}

function createPhotoReport(){
  const rows=filteredRows();
  if(!rows.length)return toast("Não existem fotografias no filtro atual.","error");
  const reportWindow=window.open("","_blank");
  if(!reportWindow)return toast("O navegador bloqueou o relatório. Autorize janelas pop-up e tente novamente.","error");
  reportWindow.opener=null;
  const obraName=obraAtual?.nome||obraAtual?.descricao||"Obra";
  const generatedAt=new Date().toLocaleString("pt-PT");
  const cards=rows.map((photo,index)=>`<article><img src="${esc(photo.url)}" alt="${esc(photo.titulo||"Fotografia da obra")}"><div class="body"><span class="number">${index+1}</span><h2>${esc(photo.titulo||photo.zona||"Fotografia da obra")}</h2><p class="meta">${[photo.categoria,photo.zona,formatDate(photo.data_foto)].filter(Boolean).map(esc).join(" · ")}</p>${photo.descricao?`<p>${esc(photo.descricao)}</p>`:""}</div></article>`).join("");
  reportWindow.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Relatório fotográfico - ${esc(obraName)}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#172033;font:12px Arial,sans-serif}.cover{border-bottom:3px solid #c69a2b;padding:8px 0 16px;margin-bottom:18px}.cover small{color:#64748b;text-transform:uppercase;letter-spacing:.12em}.cover h1{font-size:25px;margin:5px 0}.cover p{color:#64748b;margin:4px 0}.actions{position:fixed;right:12px;top:12px}.actions button{border:0;border-radius:8px;background:#172033;color:white;padding:10px 15px;font-weight:bold;cursor:pointer}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}article{border:1px solid #dbe2ea;border-radius:8px;overflow:hidden;break-inside:avoid;page-break-inside:avoid}article img{display:block;width:100%;height:230px;object-fit:contain;background:#f1f5f9}.body{position:relative;padding:10px 12px}.number{position:absolute;right:10px;top:10px;border-radius:999px;background:#172033;color:#fff;width:23px;height:23px;display:grid;place-items:center}.body h2{font-size:14px;margin:0 30px 5px 0}.body p{line-height:1.45;margin:6px 0}.meta{color:#64748b}.footer{margin-top:18px;padding-top:8px;border-top:1px solid #dbe2ea;color:#64748b}@media print{.actions{display:none}}@media(max-width:700px){.grid{grid-template-columns:1fr}}</style></head><body><div class="actions"><button onclick="window.print()">Imprimir / Guardar PDF</button></div><header class="cover"><small>DISTAK ERP · Relatório fotográfico</small><h1>${esc(obraName)}</h1><p>${rows.length} fotografia(s) · Filtro: ${esc(filtroAtual)}</p><p>Gerado em ${esc(generatedAt)}</p></header><main class="grid">${cards}</main><footer class="footer">Relatório gerado pelo DISTAK ERP.</footer></body></html>`);
  reportWindow.document.close();
}

export function initFotografias(){
  $("photoUploadToggle")?.addEventListener("click",()=>toggleUpload($("photoUploadForm").classList.contains("hidden")));
  $("photoQuickCamera")?.addEventListener("click",openMobileCamera);
  $("photoBottomCamera")?.addEventListener("click",openMobileCamera);
  $("photoQuickGallery")?.addEventListener("click",scrollToGallery);
  $("photoBottomGallery")?.addEventListener("click",scrollToGallery);
  $("photoBottomAdd")?.addEventListener("click",openPhotoData);
  $("photoQuickReport")?.addEventListener("click",createPhotoReport);
  $("photoReportBtn")?.addEventListener("click",createPhotoReport);
  $("photoUploadCancel")?.addEventListener("click",()=>{resetUploadForm();toggleUpload(false)});
  $("photoUploadForm")?.addEventListener("submit",uploadPhotos);
  $("photoEditForm")?.addEventListener("submit",saveEdit);
  $("photoFiles")?.addEventListener("change",selectedSummary);

  $("photoCamera")?.addEventListener("change",event=>{
    const cameraFile=event.target.files?.[0];
    if(!cameraFile)return;
    const dt=new DataTransfer();
    dt.items.add(cameraFile);
    $("photoFiles").files=dt.files;
    $("photoCapturedAt").value=new Date().toISOString();
    if(!$("photoData").value)$("photoData").value=new Date().toISOString().slice(0,10);
    selectedSummary();
    toggleUpload(true);
  });

  $("photoGpsBtn")?.addEventListener("click",()=>{
    if(!navigator.geolocation){
      toast("Este dispositivo não permite obter a localização.","error");
      return;
    }
    $("photoGpsStatus").textContent="A obter localização...";
    navigator.geolocation.getCurrentPosition(
      position=>{
        $("photoLatitude").value=position.coords.latitude.toFixed(6);
        $("photoLongitude").value=position.coords.longitude.toFixed(6);
        $("photoGpsStatus").textContent=`Localização registada (${position.coords.accuracy.toFixed(0)} m)`;
        $("photoGpsStatus").classList.add("active");
        toast("Localização adicionada.");
      },
      error=>{
        $("photoGpsStatus").textContent="Não foi possível obter a localização";
        toast(error.message||"Localização não autorizada.","error");
      },
      {enableHighAccuracy:true,timeout:12000,maximumAge:60000}
    );
  });

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
