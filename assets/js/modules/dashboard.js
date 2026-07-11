import {store} from "../core/store.js";import {$,money,esc} from "../core/ui.js";
export function renderDashboard(){
  $("statClientes").textContent=store.clientes.length;$("statObras").textContent=store.obras.length;$("statOrcamentos").textContent=store.orcamentos.length;
  const custos=store.custos.reduce((s,x)=>s+Number(x.valor_sem_iva||0)*(1+Number(x.iva||0)/100),0);
  const recebido=store.pagamentos.filter(x=>x.estado==="Recebido").reduce((s,x)=>s+Number(x.valor||0),0);
  const contratado=store.obras.reduce((s,x)=>s+Number(x.valor_contratado||0),0);
  $("statCustos").textContent=money(custos);$("statPagamentos").textContent=money(recebido);$("statSaldo").textContent=money(contratado-custos);
  $("dashboardObras").innerHTML=store.obras.length?`<table><thead><tr><th>Obra</th><th>Cliente</th><th>Estado</th></tr></thead><tbody>${store.obras.slice(0,6).map(o=>`<tr><td>${esc(o.nome)}</td><td>${esc(o.clientes?.nome||"")}</td><td>${esc(o.estado||"")}</td></tr>`).join("")}</tbody></table>`:"<p>Sem obras.</p>";
  $("dashboardOrcamentos").innerHTML=store.orcamentos.length?`<table><thead><tr><th>Número</th><th>Descrição</th><th>Estado</th></tr></thead><tbody>${store.orcamentos.slice(0,6).map(o=>`<tr><td>${esc(o.numero)}</td><td>${esc(o.descricao)}</td><td>${esc(o.estado)}</td></tr>`).join("")}</tbody></table>`:"<p>Sem orçamentos.</p>";
}
