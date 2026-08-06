import {store} from "../core/store.js";
import {$,esc,money,setView} from "../core/ui.js";

const num=value=>Number(value||0);
const norm=value=>String(value||"").trim().toLowerCase();
const date=value=>value?new Date(value).toLocaleDateString("pt-PT"):"—";
const workName=id=>store.obras.find(row=>String(row.id)===String(id))?.nome||"Sem obra";
const workValue=work=>num(work.valor_contratado||work.valor);
const workCosts=id=>store.custos.filter(row=>String(row.obra_id)===String(id)).reduce((sum,row)=>sum+num(row.valor||row.valor_sem_iva),0);
const workIncome=id=>store.pagamentos.filter(row=>String(row.obra_id)===String(id)&&norm(row.estado)!=="pendente").reduce((sum,row)=>sum+num(row.valor),0);

export function buildAlerts(){
  const now=new Date();
  const rows=[];
  store.custos.filter(row=>row.estado_pagamento!=="pago"&&row.data_vencimento&&new Date(`${row.data_vencimento}T23:59:59`)<now).forEach(row=>rows.push({level:"danger",title:"Custo vencido",text:`${row.nome_empresa||row.descricao||"Fornecedor"} · ${money(row.valor||row.valor_sem_iva)}`,view:"custos"}));
  store.obras.filter(row=>norm(row.estado).includes("atras")||norm(row.estado).includes("suspens")).forEach(row=>rows.push({level:"danger",title:row.nome,text:`Obra em ${row.estado}`,view:"obras",kind:"work",id:row.id,action:"Abrir obra"}));
  store.obras.filter(row=>num(row.progresso)>=100&&!norm(row.estado).includes("conclu")).forEach(row=>rows.push({level:"warning",title:row.nome,text:"Progresso completo; falta encerrar a obra.",view:"obras",kind:"work",id:row.id,action:"Abrir obra"}));
  store.orcamentos.filter(row=>norm(row.estado)==="enviado"&&row.data_emissao&&Date.now()-new Date(row.data_emissao).getTime()>15*86400000).forEach(row=>rows.push({level:"warning",title:`Orçamento ${row.numero||""}`,text:"Enviado há mais de 15 dias; confirmar resposta.",view:"orcamentos"}));
  const nowLocal=new Date();nowLocal.setMinutes(nowLocal.getMinutes()-nowLocal.getTimezoneOffset());const today=nowLocal.toISOString().slice(0,10);
  store.agendaTarefas.filter(row=>row.estado!=="concluida").forEach(row=>{const blocked=row.estado==="bloqueada",late=row.prazo<today,dueToday=row.prazo===today;if(!blocked&&!late&&!dueToday)return;rows.push({level:blocked||late?"danger":"warning",title:row.titulo,text:blocked?`Etapa bloqueada · ${workName(row.obra_id)}`:late?`Tarefa em atraso · ${row.prazo}`:"Tarefa com prazo hoje",view:"agenda",kind:"task",id:row.id,action:"Abrir tarefa"})});
  const unassigned=store.agendaTarefas.filter(row=>row.estado!=="concluida"&&!row.responsavel_id&&!row.funcionario_id&&["urgente","alta"].includes(row.prioridade));if(unassigned.length)rows.push({level:"warning",title:`${unassigned.length} tarefa(s) prioritária(s) sem responsável`,text:"Distribuir a carga no Comando do Dia.",view:"agenda",filter:"unassigned",action:"Distribuir tarefas"});
  store.previsoesFinanceiras.filter(row=>!["realizado","cancelado"].includes(row.estado)&&row.data_prevista<today).forEach(row=>rows.push({level:"danger",title:row.descricao,text:`Previsão vencida · ${money(row.valor)}`,view:"previsoes"}));
  store.obras.filter(work=>num(work.progresso)>=80&&!store.documentosObra.some(doc=>String(doc.obra_id)===String(work.id)&&norm(doc.categoria)==="contrato")).forEach(work=>rows.push({level:"warning",title:work.nome,text:"Dossiê sem contrato e obra próxima da conclusão",view:"dossies"}));
  store.ocorrenciasObra.filter(row=>row.data===today).forEach(row=>rows.push({level:"warning",title:row.tipo||"Ocorrência em obra",text:`${workName(row.obra_id)} · ${row.descricao||"Consultar registo"}`,view:"operacional"}));
  store.pedidosCompra.filter(row=>["encomendado","parcial"].includes(row.estado)&&row.entrega_prevista&&row.entrega_prevista<today).forEach(row=>rows.push({level:"danger",title:row.titulo,text:`Entrega atrasada · ${row.fornecedor_selecionado||workName(row.obra_id)}`,view:"compras"}));
  store.autosMedicao.filter(row=>row.estado==="faturado"&&row.vencimento&&row.vencimento<today).forEach(row=>rows.push({level:"danger",title:`Auto ${row.numero}`,text:`Fatura vencida, recebimento não confirmado · ${money(row.total)}`,view:"medicoes"}));
  store.campoRegistos.filter(row=>row.estado==="pendente").forEach(row=>rows.push({level:"warning",title:row.titulo,text:`Registo de campo por rever · ${workName(row.obra_id)}`,view:"funcionario"}));
  return rows.map((row,index)=>({...row,action:row.action||"Abrir área",order:index})).sort((a,b)=>(a.level==="danger"?0:1)-(b.level==="danger"?0:1)||a.order-b.order);
}

function renderNotifications(){
  const rows=buildAlerts();
  $("notificationCount").textContent=rows.length;
  $("notificationCount").classList.toggle("empty",!rows.length);
  $("notificationList").innerHTML=rows.length?rows.map(row=>`<button class="notification-item ${row.level}" data-alert-view="${row.view}"${row.kind?` data-alert-kind="${row.kind}"`:""}${row.id?` data-alert-id="${esc(row.id)}"`:""}${row.filter?` data-alert-filter="${row.filter}"`:""} aria-label="${esc(`${row.title}. ${row.action}`)}"><strong>${esc(row.title)}</strong><span>${esc(row.text)}</span><small>${esc(row.action)} <b aria-hidden="true">→</b></small></button>`).join(""):'<div class="v3-empty"><strong>Tudo controlado</strong><p>Não existem alertas críticos neste momento.</p></div>';
}

function renderReports(){
  if(!$("profitabilityReport"))return;
  const contracted=store.obras.reduce((sum,row)=>sum+workValue(row),0);
  const costs=store.custos.reduce((sum,row)=>sum+num(row.valor||row.valor_sem_iva),0);
  const income=store.pagamentos.reduce((sum,row)=>sum+num(row.valor),0);
  const margin=contracted?((contracted-costs)/contracted*100):0;
  $("reportKpis").innerHTML=`<article><span>Contratado</span><strong>${money(contracted)}</strong></article><article><span>Custos reais</span><strong>${money(costs)}</strong></article><article><span>Recebido</span><strong>${money(income)}</strong></article><article><span>Margem global</span><strong>${margin.toFixed(1)}%</strong></article>`;
  const works=[...store.obras].map(work=>{const value=workValue(work),cost=workCosts(work.id),received=workIncome(work.id);return {work,value,cost,received,margin:value?(value-cost)/value*100:0}}).sort((a,b)=>b.value-a.value);
  $("profitabilityReport").innerHTML=works.length?`<div class="table-scroll"><table><thead><tr><th>Obra</th><th>Contratado</th><th>Custo</th><th>Margem</th><th>Recebido</th></tr></thead><tbody>${works.map(row=>`<tr><td><button class="obra-link" data-view-obra="${row.work.id}">${esc(row.work.nome)}</button></td><td>${money(row.value)}</td><td>${money(row.cost)}</td><td><span class="margin-pill ${row.margin<15?"risk":""}">${row.margin.toFixed(1)}%</span></td><td>${money(row.received)}</td></tr>`).join("")}</tbody></table></div>`:'<div class="v3-empty">Sem obras para analisar.</div>';
  const maturities=store.custos.filter(row=>row.estado_pagamento!=="pago").sort((a,b)=>String(a.data_vencimento||"9999").localeCompare(String(b.data_vencimento||"9999")));
  $("maturityReport").innerHTML=maturities.length?maturities.slice(0,12).map(row=>`<article class="maturity-row"><div><strong>${esc(row.nome_empresa||row.descricao||"Custo")}</strong><span>${esc(row.obras?.nome||"Sem obra")}</span></div><div><strong>${money(row.valor||row.valor_sem_iva)}</strong><span>${date(row.data_vencimento)}</span></div></article>`).join(""):'<div class="v3-empty">Sem pagamentos pendentes.</div>';
}

function search(term){
  const query=norm(term),host=$("globalSearchResults");
  if(query.length<2){host.classList.add("hidden");return}
  const sources=[
    ["Cliente","clientes",store.clientes,row=>row.nome,row=>row.email||row.telefone],
    ["Obra","obras",store.obras,row=>row.nome,row=>row.estado],
    ["Orçamento","orcamentos",store.orcamentos,row=>row.numero||row.descricao,row=>row.estado],
    ["Custo","custos",store.custos,row=>row.nome_empresa||row.descricao,row=>money(row.valor||row.valor_sem_iva)],
    ["Pagamento","pagamentos",store.pagamentos,row=>row.descricao||"Pagamento",row=>money(row.valor)],
    ["Funcionário","funcionarios",store.funcionarios,row=>row.nome,row=>row.funcao],
    ["Tarefa","agenda",store.agendaTarefas,row=>row.titulo,row=>`${row.prazo} · ${row.estado}`],
    ["Previsão","previsoes",store.previsoesFinanceiras,row=>row.descricao,row=>`${row.data_prevista} · ${money(row.valor)}`],
    ["Documento","dossies",store.documentosObra,row=>row.nome,row=>row.categoria||"Documento de obra"],
    ["Fotografia","dossies",store.fotografias,row=>row.titulo||row.categoria,row=>row.zona||row.categoria],
    ["Diário","operacional",store.diariosObra,row=>row.titulo,row=>`${workName(row.obra_id)} · ${row.data}`],
    ["Ocorrência","operacional",store.ocorrenciasObra,row=>row.tipo,row=>`${workName(row.obra_id)} · ${row.data}`],
    ["Material","operacional",store.materiaisObra,row=>row.material,row=>`${workName(row.obra_id)} · ${row.quantidade||""}`],
    ["Horas","operacional",store.horasObra,row=>row.funcionario_nome,row=>`${workName(row.obra_id)} · ${row.horario||""}`]
    ,["Pedido de compra","compras",store.pedidosCompra,row=>row.titulo,row=>`${row.numero} · ${row.fornecedor_selecionado||row.estado}`]
    ,["Proposta de fornecedor","compras",store.propostasCompra,row=>row.fornecedor,row=>money(row.valor)]
    ,["Auto de medição","medicoes",store.autosMedicao,row=>row.numero,row=>`${workName(row.obra_id)} · ${money(row.total)}`]
    ,["Registo de campo","funcionario",store.campoRegistos,row=>row.titulo,row=>`${workName(row.obra_id)} · ${row.tipo}`]
  ];
  const results=sources.flatMap(([type,view,rows,title,meta])=>rows.filter(row=>norm(JSON.stringify(row)).includes(query)).slice(0,5).map(row=>({type,view,row,title:title(row),meta:meta(row)}))).slice(0,18);
  host.innerHTML=results.length?results.map(result=>`<button data-search-view="${result.view}" ${result.type==="Obra"?`data-search-work="${result.row.id}"`:""}><span>${esc(result.type)}</span><strong>${esc(result.title||"Sem título")}</strong><small>${esc(result.meta||"")}</small></button>`).join(""):'<div class="v3-empty">Nenhum resultado encontrado.</div>';
  host.classList.remove("hidden");
}

function renderActivity(){
  const host=$("activityTimeline");if(!host)return;
  const rows=(store.atividades||[]).slice(0,12);
  host.innerHTML=rows.length?`<div class="activity-timeline">${rows.map(row=>`<article><span class="activity-dot"></span><div><strong>${esc(row.resumo)}</strong><small>${esc(row.profiles?.nome||"Utilizador")} · ${new Date(row.criado_em).toLocaleString("pt-PT")}</small></div></article>`).join("")}</div>`:'<div class="v3-empty"><strong>Histórico preparado</strong><p>As próximas alterações importantes ficarão registadas aqui.</p></div>';
}

function printExecutive(){
  document.body.classList.add("printing-report");
  setView("relatorios");
  setTimeout(()=>{window.print();document.body.classList.remove("printing-report")},120);
}

export function renderV3(){renderNotifications();renderReports();renderActivity()}

export function initV3(){
  $("globalSearch")?.addEventListener("input",event=>search(event.target.value));
  $("globalSearch")?.addEventListener("keydown",event=>{if(event.key==="Escape")$("globalSearchResults").classList.add("hidden")});
  $("notificationBtn")?.addEventListener("click",()=>$("notificationPanel").classList.toggle("hidden"));
  $("notificationClose")?.addEventListener("click",()=>$("notificationPanel").classList.add("hidden"));
  $("printExecutiveReport")?.addEventListener("click",printExecutive);
  document.addEventListener("click",event=>{
    const alert=event.target.closest("[data-alert-view]"),alertView=alert?.dataset.alertView;
    const searchResult=event.target.closest("[data-search-view]");
    if(alertView){setView(alertView);$("notificationPanel").classList.add("hidden");if(alert.dataset.alertFilter)setTimeout(()=>document.querySelector(`[data-agenda-quick="${alert.dataset.alertFilter}"]`)?.click(),50);if(alert.dataset.alertKind==="task"&&alert.dataset.alertId)setTimeout(()=>document.querySelector(`[data-edit-task="${alert.dataset.alertId}"]`)?.click(),80);if(alert.dataset.alertKind==="work"&&alert.dataset.alertId)setTimeout(()=>document.querySelector(`[data-view-obra="${alert.dataset.alertId}"]`)?.click(),80)}
    if(searchResult){setView(searchResult.dataset.searchView);$("globalSearchResults").classList.add("hidden");$("globalSearch").value="";const id=searchResult.dataset.searchWork;if(id)setTimeout(()=>document.querySelector(`[data-view-obra="${id}"]`)?.click(),50)}
    if(event.target.closest("[data-report-open-works]"))setView("obras");
  });
}
