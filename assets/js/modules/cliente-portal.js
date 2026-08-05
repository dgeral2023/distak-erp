import {$,esc} from "../core/ui.js";
import {store} from "../core/store.js";

const pct=value=>`${Math.max(0,Math.min(100,Number(value||0)))}%`;
const date=value=>value?new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString("pt-PT"):"A definir";

export function renderClientePortal(){
  const host=$("clientPortalContent");if(!host)return;
  const works=store.clientePortalObras||[],updates=store.clientePortalAtualizacoes||[],files=store.clientePortalFicheiros||[];
  $("clientPortalWorkCount").textContent=works.length;
  $("clientPortalProgress").textContent=works.length?`${Math.round(works.reduce((sum,row)=>sum+Number(row.progresso||0),0)/works.length)}%`:"0%";
  $("clientPortalUpdateCount").textContent=updates.length;
  host.innerHTML=works.length?works.map(work=>{
    const workUpdates=updates.filter(row=>String(row.portal_obra_id)===String(work.id));
    const workFiles=files.filter(row=>String(row.portal_obra_id)===String(work.id));
    return `<article class="client-work-card"><header>${work.foto_url?`<img src="${esc(work.foto_url)}" alt="Fotografia de ${esc(work.nome)}" loading="lazy">`:`<span class="client-work-placeholder">D</span>`}<div><small>${esc(work.estado||"Em acompanhamento")}</small><h2>${esc(work.nome)}</h2><p>${esc(work.localidade||"")}</p></div></header><div class="client-progress"><span><b>Progresso comunicado</b><strong>${pct(work.progresso)}</strong></span><i><b style="width:${pct(work.progresso)}"></b></i></div><dl><div><dt>Próxima etapa</dt><dd>${esc(work.proxima_etapa||"A definir")}</dd></div><div><dt>Data prevista</dt><dd>${date(work.data_prevista)}</dd></div></dl>${work.resumo?`<p class="client-summary">${esc(work.resumo)}</p>`:""}<section><h3>Atualizações</h3>${workUpdates.length?workUpdates.map(row=>`<div class="client-update"><time>${date(row.data_publicacao)}</time><div><strong>${esc(row.titulo)}</strong><p>${esc(row.mensagem||"")}</p></div></div>`).join(""):'<p class="client-empty">Ainda não existem atualizações publicadas.</p>'}</section><section><h3>Documentos partilhados</h3>${workFiles.length?workFiles.map(row=>`<a class="client-file" href="${esc(row.url)}" target="_blank" rel="noopener"><span>▧</span><div><strong>${esc(row.nome)}</strong><small>${esc(row.categoria||"Documento")}</small></div><b>Abrir</b></a>`).join(""):'<p class="client-empty">Ainda não existem documentos partilhados.</p>'}</section></article>`;
  }).join(""):'<div class="client-portal-empty"><span>D</span><h2>Bem-vindo ao Portal do Cliente</h2><p>O seu acesso está ativo, mas ainda não existe nenhuma obra publicada para consulta.</p></div>';
}

export function initClientePortal(){}
