import {$,esc,toast} from "../core/ui.js";
import {store} from "../core/store.js";
import {db,saveReturning} from "../core/supabase.js";

const pct=value=>`${Math.max(0,Math.min(100,Number(value||0)))}%`;
const date=value=>value?new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString("pt-PT"):"A definir";
const safeUrl=value=>{try{const url=new URL(String(value||""));return url.protocol==="https:"?url.href:""}catch{return ""}};

export function renderClientePortal(){
  const host=$("clientPortalContent");if(!host)return;
  const works=store.clientePortalObras||[],updates=store.clientePortalAtualizacoes||[],files=store.clientePortalFicheiros||[];
  $("clientPortalWorkCount").textContent=works.length;
  $("clientPortalProgress").textContent=works.length?`${Math.round(works.reduce((sum,row)=>sum+Number(row.progresso||0),0)/works.length)}%`:"0%";
  $("clientPortalUpdateCount").textContent=updates.length;
  host.innerHTML=works.length?works.map(work=>{
    const workUpdates=updates.filter(row=>String(row.portal_obra_id)===String(work.id));
    const workFiles=files.filter(row=>String(row.portal_obra_id)===String(work.id)&&safeUrl(row.url));
    const photo=safeUrl(work.foto_url);
    return `<article class="client-work-card"><header>${photo?`<img src="${esc(photo)}" alt="Fotografia de ${esc(work.nome)}" loading="lazy">`:`<span class="client-work-placeholder">D</span>`}<div><small>${esc(work.estado||"Em acompanhamento")}</small><h2>${esc(work.nome)}</h2><p>${esc(work.localidade||"")}</p></div></header><div class="client-progress"><span><b>Progresso comunicado</b><strong>${pct(work.progresso)}</strong></span><i><b style="width:${pct(work.progresso)}"></b></i></div><dl><div><dt>Próxima etapa</dt><dd>${esc(work.proxima_etapa||"A definir")}</dd></div><div><dt>Data prevista</dt><dd>${date(work.data_prevista)}</dd></div></dl>${work.resumo?`<p class="client-summary">${esc(work.resumo)}</p>`:""}<section><h3>Atualizações</h3>${workUpdates.length?workUpdates.map(row=>`<div class="client-update"><time>${date(row.data_publicacao)}</time><div><strong>${esc(row.titulo)}</strong><p>${esc(row.mensagem||"")}</p></div></div>`).join(""):'<p class="client-empty">Ainda não existem atualizações publicadas.</p>'}</section><section><h3>Documentos partilhados</h3>${workFiles.length?workFiles.map(row=>`<a class="client-file" href="${esc(safeUrl(row.url))}" target="_blank" rel="noopener"><span>▧</span><div><strong>${esc(row.nome)}</strong><small>${esc(row.categoria||"Documento")}</small></div><b>Abrir</b></a>`).join(""):'<p class="client-empty">Ainda não existem documentos partilhados.</p>'}</section></article>`;
  }).join(""):'<div class="client-portal-empty"><span>D</span><h2>Bem-vindo ao Portal do Cliente</h2><p>O seu acesso está ativo, mas ainda não existe nenhuma obra publicada para consulta.</p></div>';
}

export function renderClientePortalAdmin(){
  const worksHost=$("clientAdminWorks"),accessHost=$("clientAdminAccess");if(!worksHost||store.profile?.role!=="admin")return;
  const rows=store.clientePortalObras||[],access=store.clientePortalAcessos||[];
  worksHost.innerHTML=rows.length?rows.map(row=>`<div class="client-admin-row"><div><strong>${esc(row.nome)}</strong> <span class="client-admin-status ${row.publicado?"live":""}">${row.publicado?"Publicado":"Rascunho"}</span><small>${esc(row.estado||"")} · ${pct(row.progresso)} · ${esc(row.proxima_etapa||"Sem próxima etapa")}</small></div><button class="btn small light" type="button" data-client-publish-edit="${row.id}">Editar</button></div>`).join(""):'<p class="client-empty">Nenhuma obra foi preparada para o portal.</p>';
  accessHost.innerHTML=access.length?access.map(row=>`<div class="client-admin-row"><div><strong>${esc(row.user_id)}</strong><small>Cliente ${esc(row.cliente_id)} · ${row.ativo?"Ativo":"Suspenso"}</small></div></div>`).join(""):'<p class="client-empty">Ainda não existem contas de cliente associadas.</p>';
}

function openPublication(row){
  const work=row?store.obras.find(item=>String(item.id)===String(row.obra_id)):null;
  $("clientPublishWork").innerHTML=`<option value="">Selecionar obra</option>${store.obras.map(item=>`<option value="${item.id}">${esc(item.nome||`Obra ${item.id}`)}</option>`).join("")}`;
  $("clientPublishId").value=row?.id||"";$("clientPublishWork").value=row?.obra_id||"";$("clientPublishName").value=row?.nome||work?.nome||"";$("clientPublishLocation").value=row?.localidade||work?.localidade||"";$("clientPublishState").value=row?.estado||"Em acompanhamento";$("clientPublishProgress").value=Number(row?.progresso||0);$("clientPublishSummary").value=row?.resumo||"";$("clientPublishNext").value=row?.proxima_etapa||"";$("clientPublishDate").value=row?.data_prevista||"";$("clientPublishPhoto").value=row?.foto_url||"";$("clientPublishVisible").checked=Boolean(row?.publicado);$("clientPublishWork").disabled=Boolean(row);$("clientPublishDialog").showModal();
}

export function initClientePortal(refresh){
  $("clientPublishNew")?.addEventListener("click",()=>openPublication());
  $("clientPublishWork")?.addEventListener("change",event=>{const work=store.obras.find(item=>String(item.id)===event.target.value);if(work){$("clientPublishName").value=work.nome||"";$("clientPublishLocation").value=work.localidade||""}});
  $("clientPublishForm")?.addEventListener("submit",async event=>{event.preventDefault();const work=store.obras.find(item=>String(item.id)===String($("clientPublishWork").value));if(!work)return toast("Selecione uma obra.","error");const {data:{user}}=await db.auth.getUser();const payload={cliente_id:work.cliente_id,obra_id:work.id,nome:$("clientPublishName").value.trim(),localidade:$("clientPublishLocation").value.trim()||null,estado:$("clientPublishState").value.trim()||"Em acompanhamento",progresso:Number($("clientPublishProgress").value||0),resumo:$("clientPublishSummary").value.trim()||null,proxima_etapa:$("clientPublishNext").value.trim()||null,data_prevista:$("clientPublishDate").value||null,foto_url:$("clientPublishPhoto").value.trim()||null,publicado:$("clientPublishVisible").checked,atualizado_por:user.id,atualizado_em:new Date().toISOString()};try{await saveReturning("cliente_portal_obras",payload,$("clientPublishId").value||null);$("clientPublishDialog").close();await refresh();toast(payload.publicado?"Obra publicada no portal.":"Rascunho do portal guardado.")}catch(error){toast(error.message||"Não foi possível guardar a publicação.","error")}});
  document.addEventListener("click",event=>{const id=event.target.closest("[data-client-publish-edit]")?.dataset.clientPublishEdit;if(id)openPublication(store.clientePortalObras.find(row=>String(row.id)===id))});
}
