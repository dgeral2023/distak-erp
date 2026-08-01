import {store} from "../core/store.js";
import {$,esc,money} from "../core/ui.js";

const num=v=>Number(v||0);
const norm=v=>String(v||"").trim().toLowerCase();
const fmtDate=v=>v?new Date(v).toLocaleDateString("pt-PT"):"—";

function obraValor(o){return num(o.valor_contratado||o.valor)}
function orcamentoTotal(o){
  const componentes=num(o.mao_obra)+num(o.materiais)+num(o.logistica);
  if(componentes)return componentes*(1+num(o.iva)/100);
  if(num(o.valor_sem_iva))return num(o.valor_sem_iva)*(1+num(o.iva)/100);
  return num(o.total);
}
function isActive(o){
  const s=norm(o.estado);
  return ["adjudicada","em preparação","em execucao","em execução","em garantia"].includes(s);
}
function isBudget(o){
  const s=norm(o.estado);
  return ["orçamento","orcamento","aguardando adjudicação","aguardando adjudicacao"].includes(s);
}
function isCompleted(o){return ["concluída","concluida","arquivada"].includes(norm(o.estado))}
function isAlert(o){
  const s=norm(o.estado);
  return s.includes("suspens")||s.includes("atras");
}
function monthKey(v){
  const d=new Date(v);
  if(Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function lastMonths(n=6){
  const list=[],d=new Date();
  d.setDate(1);
  for(let i=n-1;i>=0;i--){
    const m=new Date(d.getFullYear(),d.getMonth()-i,1);
    list.push({
      key:`${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`,
      label:m.toLocaleDateString("pt-PT",{month:"short"}).replace(".","")
    });
  }
  return list;
}

export function renderDashboard(){
  const clientes=store.clientes||[];
  const obras=store.obras||[];
  const orcamentos=store.orcamentos||[];
  const custos=store.custos||[];
  const pagamentos=store.pagamentos||[];

  const contratado=obras.reduce((s,o)=>s+obraValor(o),0);
  const totalCustos=custos.reduce((s,c)=>s+num(c.valor||c.valor_sem_iva),0);
  const recebido=pagamentos.reduce((s,p)=>s+num(p.valor),0);
  const porReceber=Math.max(0,contratado-recebido);
  const lucro=contratado-totalCustos;
  const margem=contratado>0?lucro/contratado*100:0;
  const clientesAtivos=clientes.filter(c=>norm(c.estado)==="ativo").length;

  $("statValorContratado").textContent=money(contratado);
  $("statPagamentos").textContent=money(recebido);
  $("statPorReceber").textContent=money(porReceber);
  $("statCustos").textContent=money(totalCustos);
  $("statLucro").textContent=money(lucro);
  $("statMargem").textContent=`Margem de ${margem.toFixed(1)}%`;
  $("statTaxaRecebida").textContent=`${contratado?((recebido/contratado)*100).toFixed(1):0}% do contratado`;
  $("statTaxaCustos").textContent=`${contratado?((totalCustos/contratado)*100).toFixed(1):0}% do contratado`;
  $("statClientes").textContent=clientes.length;
  $("statClientesAtivos").textContent=`${clientesAtivos} clientes ativos`;
  $("statTotalObras").textContent=`${obras.length} obras registadas`;
  $("statObrasAtivas").textContent=obras.filter(isActive).length;
  $("statObrasOrcamento").textContent=obras.filter(isBudget).length;
  $("statObrasConcluidas").textContent=obras.filter(isCompleted).length;
  $("statObrasAlerta").textContent=obras.filter(isAlert).length;
  $("statOrcamentos").textContent=orcamentos.length;
  $("statMargemMedia").textContent=`${margem.toFixed(1)}%`;
  $("dashboardUpdatedAt").textContent=new Date().toLocaleString("pt-PT",{dateStyle:"short",timeStyle:"short"});

  renderFinanceChart(custos,pagamentos);
  renderStatusChart(obras);
  renderTopWorks(obras,custos,pagamentos);
  renderAlerts(obras,orcamentos,pagamentos);
  renderCategories(custos);
  renderMovements(custos,pagamentos);
}

function renderFinanceChart(custos,pagamentos){
  const months=lastMonths();
  const rows=months.map(m=>({
    ...m,
    custos:custos.filter(x=>monthKey(x.data||x.created_at)===m.key).reduce((s,x)=>s+num(x.valor||x.valor_sem_iva),0),
    pagamentos:pagamentos.filter(x=>monthKey(x.data||x.created_at)===m.key).reduce((s,x)=>s+num(x.valor),0)
  }));
  const max=Math.max(1,...rows.flatMap(x=>[x.custos,x.pagamentos]));
  $("dashboardFinanceChart").innerHTML=`
    <div class="chart-legend"><span><i class="legend-received"></i>Recebimentos</span><span><i class="legend-cost"></i>Custos</span></div>
    <div class="finance-bars">${rows.map(r=>`<div class="finance-month">
      <div class="finance-columns">
        <span class="bar-received" style="height:${Math.max(3,r.pagamentos/max*100)}%" title="Recebido: ${money(r.pagamentos)}"></span>
        <span class="bar-cost" style="height:${Math.max(3,r.custos/max*100)}%" title="Custos: ${money(r.custos)}"></span>
      </div>
      <small>${esc(r.label)}</small>
    </div>`).join("")}</div>`;
}

function renderStatusChart(obras){
  const groups=[
    ["Ativas",obras.filter(isActive).length],
    ["Orçamento",obras.filter(isBudget).length],
    ["Concluídas",obras.filter(isCompleted).length],
    ["Alerta",obras.filter(isAlert).length],
    ["Outras",obras.filter(o=>!isActive(o)&&!isBudget(o)&&!isCompleted(o)&&!isAlert(o)).length]
  ];
  const max=Math.max(1,...groups.map(x=>x[1]));
  $("dashboardStatusChart").innerHTML=groups.map(([label,value])=>`<div class="status-row">
    <div><span>${label}</span><strong>${value}</strong></div>
    <div class="status-track"><span style="width:${value/max*100}%"></span></div>
  </div>`).join("");
}

function renderTopWorks(obras,custos,pagamentos){
  const top=[...obras].sort((a,b)=>obraValor(b)-obraValor(a)).slice(0,6);
  $("dashboardObras").innerHTML=top.length?`<table class="dashboard-table"><thead><tr><th>Obra</th><th>Estado</th><th>Valor</th><th>Recebido</th><th>Margem</th></tr></thead><tbody>${top.map(o=>{
    const c=custos.filter(x=>String(x.obra_id)===String(o.id)).reduce((s,x)=>s+num(x.valor||x.valor_sem_iva),0);
    const p=pagamentos.filter(x=>String(x.obra_id)===String(o.id)).reduce((s,x)=>s+num(x.valor),0);
    const v=obraValor(o);
    const m=v?((v-c)/v*100):0;
    return `<tr>
      <td><button class="obra-link" data-view-obra="${o.id}">${esc(o.nome)}</button><small>${esc(o.clientes?.nome||"")}</small></td>
      <td><span class="badge">${esc(o.estado||"")}</span></td>
      <td>${money(v)}</td><td>${money(p)}</td><td>${m.toFixed(1)}%</td>
    </tr>`;
  }).join("")}</tbody></table>`:'<div class="dashboard-empty">Ainda não existem obras registadas.</div>';
}

function renderAlerts(obras,orcamentos,pagamentos){
  const alerts=[];
  obras.filter(isAlert).forEach(o=>alerts.push({level:"danger",title:o.nome,text:`Estado: ${o.estado}`}));
  obras.filter(o=>obraValor(o)>0&&!pagamentos.some(p=>String(p.obra_id)===String(o.id))).forEach(o=>alerts.push({level:"warning",title:o.nome,text:"Obra com valor contratado e sem pagamentos registados."}));
  obras.filter(o=>num(o.progresso)>=100&&!isCompleted(o)).forEach(o=>alerts.push({level:"warning",title:o.nome,text:"Progresso a 100%, mas o estado ainda não está concluído."}));
  if(!orcamentos.length) alerts.push({level:"info",title:"Orçamentos",text:"Ainda não existem orçamentos registados."});
  $("dashboardAlerts").innerHTML=alerts.length?alerts.slice(0,8).map(a=>`<article class="dashboard-alert ${a.level}">
    <span class="alert-dot"></span><div><strong>${esc(a.title)}</strong><p>${esc(a.text)}</p></div>
  </article>`).join(""):'<div class="dashboard-success">Sem alertas críticos neste momento.</div>';
}

function renderCategories(custos){
  const map={};
  custos.forEach(c=>{
    const name=c.tipo||c.categoria||"Outro";
    map[name]=(map[name]||0)+num(c.valor||c.valor_sem_iva);
  });
  const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  const total=rows.reduce((s,x)=>s+x[1],0);
  $("dashboardCostCategories").innerHTML=rows.length?rows.slice(0,7).map(([name,value])=>`<div class="category-row">
    <div><span>${esc(name)}</span><strong>${money(value)}</strong></div>
    <div class="category-track"><span style="width:${total?value/total*100:0}%"></span></div>
  </div>`).join(""):'<div class="dashboard-empty">Sem custos registados.</div>';
}

function renderMovements(custos,pagamentos){
  const rows=[
    ...custos.map(x=>({type:"Custo",description:x.descricao||x.tipo||"Custo",value:-num(x.valor||x.valor_sem_iva),date:x.data||x.created_at})),
    ...pagamentos.map(x=>({type:"Recebimento",description:x.observacoes||x.metodo||"Pagamento",value:num(x.valor),date:x.data||x.created_at}))
  ].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);

  $("dashboardMovements").innerHTML=rows.length?`<div class="movement-list">${rows.map(r=>`<article>
    <span class="movement-icon ${r.value>=0?"income":"expense"}">${r.value>=0?"↑":"↓"}</span>
    <div><strong>${esc(r.description)}</strong><small>${esc(r.type)} · ${fmtDate(r.date)}</small></div>
    <b class="${r.value>=0?"positive":"negative"}">${r.value>=0?"+":""}${money(r.value)}</b>
  </article>`).join("")}</div>`:'<div class="dashboard-empty">Sem movimentos registados.</div>';
}

document.addEventListener("click",e=>{
  const view=e.target.closest("[data-dashboard-view]")?.dataset.dashboardView;
  if(view){
    document.querySelector(`[data-view="${view}"]`)?.click();
  }
});
