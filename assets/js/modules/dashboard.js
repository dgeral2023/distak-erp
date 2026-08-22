import {store} from "../core/store.js";
import {$,esc,money} from "../core/ui.js";
import {workFinancialValues} from "../core/work-finance.js";

const num=v=>Number(v||0);
const norm=v=>String(v||"").trim().toLowerCase();
const fmtDate=v=>v?new Date(v).toLocaleDateString("pt-PT"):"—";
const detailPreference="distakDashboardDetailed";

function applyDashboardPreference(){
  const detailed=localStorage.getItem(detailPreference)==="true",view=$("view-dashboard"),button=$("dashboardCustomize");
  view?.classList.toggle("dashboard-detailed",detailed);
  if(button){button.setAttribute("aria-pressed",String(detailed));button.textContent=detailed?"⚙ Vista resumida":"⚙ Vista detalhada"}
}

function obraValor(o){return workFinancialValues(o).total}
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
  const funcionarios=store.funcionarios||[];
  const funcionarioHoras=store.funcionarioHoras||[];

  const baseContratada=obras.reduce((sum,obra)=>sum+workFinancialValues(obra).base,0);
  const ivaContratado=obras.reduce((sum,obra)=>sum+workFinancialValues(obra).vat,0);
  const contratado=obras.reduce((sum,obra)=>sum+workFinancialValues(obra).total,0);
  const totalCustos=custos.reduce((s,c)=>s+num(c.valor||c.valor_sem_iva),0);
  const recebido=pagamentos.reduce((s,p)=>s+num(p.valor),0);
  const porReceber=Math.max(0,contratado-recebido);
  const lucro=baseContratada-totalCustos;
  const margem=baseContratada>0?lucro/baseContratada*100:0;
  const clientesAtivos=clientes.filter(c=>norm(c.estado)==="ativo").length;
  const thisMonth=new Date().toISOString().slice(0,7);
  const monthHours=funcionarioHoras.filter(row=>String(row.data||"").startsWith(thisMonth));
  const totalTeamHours=monthHours.reduce((sum,row)=>sum+num(row.horas),0);
  const teamCost=monthHours.reduce((sum,row)=>sum+num(row.horas)*num(row.funcionarios?.custo_hora),0);
  const overdueCosts=custos.filter(c=>c.estado_pagamento!=="pago"&&c.data_vencimento&&new Date(`${c.data_vencimento}T23:59:59`)<new Date());
  const todayLocal=new Date();todayLocal.setMinutes(todayLocal.getMinutes()-todayLocal.getTimezoneOffset());const todayKey=todayLocal.toISOString().slice(0,10);
  const overdueTasks=(store.agendaTarefas||[]).filter(task=>task.estado!=="concluida"&&task.prazo<todayKey);

  $("statValorContratado").textContent=money(contratado);
  $("statValorSemIva").textContent=money(baseContratada);
  $("statValorIva").textContent=money(ivaContratado);
  $("statPagamentos").textContent=money(recebido);
  $("statPorReceber").textContent=money(porReceber);
  $("statCustos").textContent=money(totalCustos);
  $("statLucro").textContent=money(lucro);
  $("statMargem").textContent=`Margem de ${margem.toFixed(1)}%`;
  $("statTaxaRecebida").textContent=`${contratado?((recebido/contratado)*100).toFixed(1):0}% do contratado`;
  $("statTaxaCustos").textContent=`${baseContratada?((totalCustos/baseContratada)*100).toFixed(1):0}% da base sem IVA`;
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
  $("statEquipaAtiva").textContent=funcionarios.filter(f=>norm(f.estado)==="ativo").length;
  $("statHorasMes").textContent=`${totalTeamHours.toFixed(1)} h`;
  $("statCustoEquipaMes").textContent=money(teamCost);
  $("statCustosVencidos").textContent=money(overdueCosts.reduce((sum,c)=>sum+num(c.valor||c.valor_sem_iva),0));
  $("statCustosVencidosQtd").textContent=`${overdueCosts.length} documento(s)`;
  $("option5ActiveWorks").textContent=obras.filter(isActive).length;
  $("option5ExecutionValue").textContent=money(contratado);
  $("option5Income").textContent=money(recebido);
  $("option5Alerts").textContent=obras.filter(isAlert).length+overdueCosts.length+overdueTasks.length;
  $("option5ActiveTrend").textContent=`${obras.length} obras registadas`;
  $("option5ExecutionTrend").textContent=`Sem IVA ${money(baseContratada)} · IVA ${money(ivaContratado)}`;
  $("option5IncomeTrend").textContent=`${contratado?((recebido/contratado)*100).toFixed(1):0}% do contratado`;
  $("option5AlertTrend").textContent=overdueTasks.length?`${overdueTasks.length} tarefa(s) atrasada(s)`:overdueCosts.length?`${overdueCosts.length} custo(s) vencido(s)`:"Sem alertas vencidos";

  renderFinanceChart(custos,pagamentos);
  renderVatChart(obras);
  renderStatusChart(obras);
  renderTopWorks(obras,custos,pagamentos);
  renderAlerts(obras,orcamentos,pagamentos,overdueCosts);
  renderCategories(custos);
  renderMovements(custos,pagamentos);
  renderPipeline(orcamentos);
  renderTeam(funcionarios,monthHours);
}

function renderVatChart(obras){
  const financial=obras.map(workFinancialValues);
  const rows=[23,6,0].map(rate=>{
    const items=financial.filter(item=>item.rate===rate);
    return {label:`IVA ${rate}%`,rate,count:items.length,base:items.reduce((sum,item)=>sum+item.base,0),vat:items.reduce((sum,item)=>sum+item.vat,0)};
  });
  const withoutRate=financial.filter(item=>item.rate===null&&item.vat>0);
  if(withoutRate.length)rows.push({label:"Taxa não registada",rate:null,count:withoutRate.length,base:withoutRate.reduce((sum,item)=>sum+item.base,0),vat:withoutRate.reduce((sum,item)=>sum+item.vat,0)});
  const totalVat=rows.reduce((sum,row)=>sum+row.vat,0),maxVat=Math.max(1,...rows.map(row=>row.vat));
  const colors={23:"#dfa91f",6:"#315b91",0:"#59b99d",legacy:"#94a3b8"};
  $("dashboardVatChart").innerHTML=`<div class="vat-chart-total"><span>IVA contratado</span><strong>${money(totalVat)}</strong><small>${rows.reduce((sum,row)=>sum+row.count,0)} obra(s) com taxa registada ou IVA legado</small></div><div class="vat-rate-bars" role="img" aria-label="IVA contratado por taxa. ${rows.map(row=>`${row.label}: ${money(row.vat)}`).join(". ")}">${rows.map(row=>`<article><div><span>${esc(row.label)}</span><strong>${money(row.vat)}</strong></div><div class="vat-rate-track"><span style="width:${row.vat/maxVat*100}%;background:${colors[row.rate]||colors.legacy}"></span></div><small>${row.count} obra(s) · Base ${money(row.base)}</small></article>`).join("")}</div>`;
}

function renderFinanceChart(custos,pagamentos){
  const months=lastMonths();
  const rows=months.map(m=>({
    ...m,
    custos:custos.filter(x=>monthKey(x.data||x.created_at)===m.key).reduce((s,x)=>s+num(x.valor||x.valor_sem_iva),0),
    pagamentos:pagamentos.filter(x=>monthKey(x.data||x.created_at)===m.key).reduce((s,x)=>s+num(x.valor),0)
  }));
  const host=$("dashboardFinanceChart");
  const totalCosts=rows.reduce((sum,row)=>sum+row.custos,0),totalIncome=rows.reduce((sum,row)=>sum+row.pagamentos,0);
  host.innerHTML=`<div class="chart-legend premium-chart-legend"><span><i class="legend-received"></i>Recebimentos <b>${money(totalIncome)}</b></span><span><i class="legend-cost"></i>Custos <b>${money(totalCosts)}</b></span></div><canvas class="finance-line-chart" width="900" height="250" role="img" aria-label="Evolução financeira dos últimos seis meses. Recebimentos: ${money(totalIncome)}. Custos: ${money(totalCosts)}."></canvas><div class="line-chart-labels">${rows.map(r=>`<span>${esc(r.label)}</span>`).join("")}</div>`;
  const canvas=host.querySelector("canvas"),ctx=canvas.getContext("2d"),width=900,height=250,max=Math.max(1,...rows.flatMap(row=>[row.custos,row.pagamentos])),left=72,right=880,top=25,bottom=218;
  const short=value=>value>=1e6?`${(value/1e6).toFixed(value%1e6?1:0)}M €`:value>=1e3?`${Math.round(value/1e3)}k €`:`${Math.round(value)} €`;
  ctx.clearRect(0,0,width,height);ctx.font="11px system-ui, sans-serif";ctx.textAlign="right";ctx.textBaseline="middle";
  for(let i=0;i<5;i++){const y=top+i*((bottom-top)/4),value=max*(1-i/4);ctx.strokeStyle=i===4?"#cbd5e1":"#e8edf4";ctx.lineWidth=1;ctx.setLineDash(i===4?[]:[3,4]);ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.fillStyle="#718096";ctx.fillText(short(value),left-12,y)}
  ctx.setLineDash([]);
  const points=values=>values.map((value,index)=>({x:left+index*((right-left)/(values.length-1)),y:bottom-(value/max)*(bottom-top)}));
  const curve=pts=>{ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=0;i<pts.length-1;i++){const current=pts[i],next=pts[i+1],mid=(current.x+next.x)/2;ctx.bezierCurveTo(mid,current.y,mid,next.y,next.x,next.y)}};
  const costs=points(rows.map(row=>row.custos)),income=points(rows.map(row=>row.pagamentos)),fill=ctx.createLinearGradient(0,top,0,bottom);fill.addColorStop(0,"rgba(49,91,145,.24)");fill.addColorStop(1,"rgba(49,91,145,.015)");curve(costs);ctx.lineTo(costs.at(-1).x,bottom);ctx.lineTo(costs[0].x,bottom);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  const draw=(pts,color,dashed=false)=>{curve(pts);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.setLineDash(dashed?[7,6]:[]);ctx.stroke();ctx.setLineDash([]);pts.forEach((point,index)=>{ctx.fillStyle="#fff";ctx.strokeStyle=color;ctx.lineWidth=index===pts.length-1?3:2;ctx.beginPath();ctx.arc(point.x,point.y,index===pts.length-1?5:3.5,0,Math.PI*2);ctx.fill();ctx.stroke()})};
  draw(costs,"#294e7f",true);draw(income,"#dfa91f");
}

function renderStatusChart(obras){
  const groups=[
    ["Ativas",obras.filter(isActive).length],
    ["Orçamento",obras.filter(isBudget).length],
    ["Concluídas",obras.filter(isCompleted).length],
    ["Alerta",obras.filter(isAlert).length],
    ["Outras",obras.filter(o=>!isActive(o)&&!isBudget(o)&&!isCompleted(o)&&!isAlert(o)).length]
  ];
  const total=Math.max(1,groups.reduce((sum,row)=>sum+row[1],0)),colors=["#315b91","#59b99d","#93a8c4","#e1ad38","#e5eaf1"];
  let cursor=0;const stops=groups.map((row,index)=>{const start=cursor;cursor+=row[1]/total*100;return `${colors[index]} ${start}% ${cursor}%`}).join(",");
  $("dashboardStatusChart").innerHTML=`<div class="donut-shell"><div class="donut-chart" role="img" aria-label="Distribuição de ${groups.reduce((sum,row)=>sum+row[1],0)} obras por estado" style="background:conic-gradient(${stops})"><div><strong>${groups.reduce((sum,row)=>sum+row[1],0)}</strong><span>Total de obras</span></div></div></div><div class="donut-legend">${groups.map(([label,value],index)=>`<div><i style="background:${colors[index]}"></i><span>${esc(label)}</span><strong>${value} <small>${(value/total*100).toFixed(0)}%</small></strong></div>`).join("")}</div>`;
}

function renderTopWorks(obras,custos,pagamentos){
  const top=[...obras].sort((a,b)=>obraValor(b)-obraValor(a)).slice(0,6);
  $("dashboardObras").innerHTML=top.length?`<div class="table-scroll"><table class="dashboard-table option5-work-table"><thead><tr><th>Obra</th><th>Estado</th><th>Progresso</th><th>Valor em execução</th><th>Recebido</th><th></th></tr></thead><tbody>${top.map(o=>{
    const c=custos.filter(x=>String(x.obra_id)===String(o.id)).reduce((s,x)=>s+num(x.valor||x.valor_sem_iva),0);
    const p=pagamentos.filter(x=>String(x.obra_id)===String(o.id)).reduce((s,x)=>s+num(x.valor),0);
    const values=workFinancialValues(o),v=values.total;
    const m=values.base?((values.base-c)/values.base*100):0;
    const photo=store.fotografias.find(item=>String(item.obra_id)===String(o.id)&&item.url);
    const image=photo?`<img src="${esc(photo.url)}" alt="Fotografia de ${esc(o.nome)}" loading="lazy">`:`<span class="work-photo-fallback">▥</span>`;
    return `<tr>
      <td><div class="work-identity">${image}<div><button class="obra-link" data-view-obra="${o.id}">${esc(o.nome)}</button><small>${esc(o.clientes?.nome||o.morada||"")}</small></div></div></td>
      <td><span class="badge">${esc(o.estado||"")}</span></td>
      <td><div class="table-progress"><span><i style="width:${Math.min(100,Math.max(0,num(o.progresso)))}%"></i></span><strong>${num(o.progresso).toFixed(0)}%</strong></div></td>
      <td>${money(v)}<small>Base ${money(values.base)} · IVA ${money(values.vat)} · Margem ${m.toFixed(1)}%</small></td><td>${money(p)}</td><td><button class="table-more" data-view-obra="${o.id}" aria-label="Abrir obra">⋮</button></td>
    </tr>`;
  }).join("")}</tbody></table></div>`:'<div class="dashboard-empty">Ainda não existem obras registadas.</div>';
}

function renderAlerts(obras,orcamentos,pagamentos,overdueCosts=[]){
  const alerts=[];
  obras.filter(isAlert).forEach(o=>alerts.push({level:"danger",title:o.nome,text:`Estado: ${o.estado}`}));
  obras.filter(o=>obraValor(o)>0&&!pagamentos.some(p=>String(p.obra_id)===String(o.id))).forEach(o=>alerts.push({level:"warning",title:o.nome,text:"Obra com valor contratado e sem pagamentos registados."}));
  obras.filter(o=>num(o.progresso)>=100&&!isCompleted(o)).forEach(o=>alerts.push({level:"warning",title:o.nome,text:"Progresso a 100%, mas o estado ainda não está concluído."}));
  overdueCosts.forEach(c=>alerts.push({level:"danger",title:c.nome_empresa||c.descricao||"Custo vencido",text:`Pagamento vencido em ${fmtDate(c.data_vencimento)} · ${money(c.valor||c.valor_sem_iva)}`}));
  const today=new Date().toISOString().slice(0,10);
  (store.agendaTarefas||[]).filter(task=>task.estado!=="concluida"&&task.prazo<today).forEach(task=>alerts.push({level:"danger",title:task.titulo,text:`Tarefa em atraso desde ${fmtDate(task.prazo)}`}));
  (store.agendaTarefas||[]).filter(task=>task.estado!=="concluida"&&task.prazo===today).forEach(task=>alerts.push({level:"warning",title:task.titulo,text:"Tarefa com prazo hoje."}));
  if(!orcamentos.length) alerts.push({level:"info",title:"Orçamentos",text:"Ainda não existem orçamentos registados."});
  $("dashboardAlerts").innerHTML=alerts.length?alerts.slice(0,8).map(a=>`<article class="dashboard-alert ${a.level}">
    <span class="alert-dot"></span><div><strong>${esc(a.title)}</strong><p>${esc(a.text)}</p></div>
  </article>`).join(""):'<div class="dashboard-success">Sem alertas críticos neste momento.</div>';
}

function renderPipeline(orcamentos){
  const states=["Rascunho","Enviado","Aprovado","Recusado"];
  const rows=states.map(state=>{const items=orcamentos.filter(o=>norm(o.estado)===norm(state));return {state,count:items.length,value:items.reduce((sum,o)=>sum+orcamentoTotal(o),0)}});
  const max=Math.max(1,...rows.map(row=>row.value));
  $("dashboardBudgetPipeline").innerHTML=rows.map(row=>`<article><div><span>${esc(row.state)}</span><strong>${money(row.value)}</strong><small>${row.count} orçamento(s)</small></div><div class="pipeline-track"><span class="pipeline-${norm(row.state)}" style="width:${row.value/max*100}%"></span></div></article>`).join("");
}

function renderTeam(funcionarios,hours){
  const rows=funcionarios.filter(f=>norm(f.estado)!=="inativo").map(f=>{const employeeHours=hours.filter(row=>String(row.funcionario_id)===String(f.id)).reduce((sum,row)=>sum+num(row.horas),0);return {...f,employeeHours,cost:employeeHours*num(f.custo_hora)}}).sort((a,b)=>b.employeeHours-a.employeeHours).slice(0,7);
  $("dashboardTeam").innerHTML=rows.length?rows.map(row=>`<article><div class="team-avatar">${esc(row.nome?.[0]||"F")}</div><div><strong>${esc(row.nome)}</strong><small>${esc(row.funcao||"Sem função")}</small></div><div class="team-hours"><strong>${row.employeeHours.toFixed(1)} h</strong><small>${money(row.cost)}</small></div></article>`).join(""):'<div class="dashboard-empty">Adicione funcionários para acompanhar a equipa.</div>';
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
  if(e.target.closest("#dashboardCustomize")){
    localStorage.setItem(detailPreference,String(!$("view-dashboard")?.classList.contains("dashboard-detailed")));
    applyDashboardPreference();
    return;
  }
  const view=e.target.closest("[data-dashboard-view]")?.dataset.dashboardView;
  if(view){
    document.querySelector(`[data-view="${view}"]`)?.click();
  }
});

applyDashboardPreference();
