import {store} from "../core/store.js";
import {$,esc,money,toast} from "../core/ui.js";
import {db,saveReturning,remove} from "../core/supabase.js";

const numberValue=value=>Number(value||0);
const sortedItems=o=>[...(o.orcamento_itens||[])].sort((a,b)=>numberValue(a.ordem)-numberValue(b.ordem));
const subtotal=o=>{
  const items=sortedItems(o);
  if(items.length)return items.reduce((sum,item)=>sum+numberValue(item.quantidade)*numberValue(item.preco_unitario),0);
  return numberValue(o.valor_sem_iva)||numberValue(o.mao_obra)+numberValue(o.materiais)+numberValue(o.logistica);
};
const totals=o=>{const base=Math.max(0,subtotal(o)-numberValue(o.desconto));const iva=base*numberValue(o.iva)/100;return {subtotal:subtotal(o),base,iva,total:base+iva}};
const isoDate=value=>value||new Date().toISOString().slice(0,10);
const statusClass=value=>`status-${String(value||"rascunho").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}`;

function fill(){
  $("orcamentoClienteId").innerHTML='<option value="">Selecionar</option>'+store.clientes.map(x=>`<option value="${x.id}">${esc(x.nome)}</option>`).join("");
  $("orcamentoObraId").innerHTML='<option value="">Sem obra associada</option>'+store.obras.map(x=>`<option value="${x.id}" data-cliente="${x.cliente_id||""}">${esc(x.nome)}</option>`).join("");
  const filter=$("orcamentoClienteFiltro");
  if(filter){const selected=filter.value;filter.innerHTML='<option value="">Todos os clientes</option>'+store.clientes.map(x=>`<option value="${x.id}">${esc(x.nome)}</option>`).join("");filter.value=selected}
}

export function filterOrcamentos(){
  const term=$("orcamentoSearch")?.value.trim().toLowerCase()||"";
  const estado=$("orcamentoEstadoFiltro")?.value||"";
  const cliente=$("orcamentoClienteFiltro")?.value||"";
  renderOrcamentos(store.orcamentos.filter(o=>(!estado||o.estado===estado)&&(!cliente||String(o.cliente_id)===cliente)&&(!term||[o.numero,o.descricao,o.referencia,o.clientes?.nome,o.obras?.nome].some(v=>String(v||"").toLowerCase().includes(term)))));
}

export function renderOrcamentos(rows=store.orcamentos){
  fill();
  const value=rows.reduce((sum,o)=>sum+totals(o).total,0);
  if(!rows.length){
    $("orcamentosTable").innerHTML='<div class="obra-placeholder"><strong>Sem orçamentos</strong><p>Crie a primeira proposta comercial.</p></div>';
    return;
  }
  const body=rows.map(o=>{
    const t=totals(o);
    const emission=new Date(`${isoDate(o.data_emissao)}T00:00:00`).toLocaleDateString("pt-PT");
    return `<tr><td><strong>${esc(o.numero||"—")}</strong><small>${esc(o.referencia||"")}</small></td><td>${emission}<small>${numberValue(o.validade_dias)||15} dias</small></td><td>${esc(o.clientes?.nome||"")}<small>${esc(o.obras?.nome||"Sem obra")}</small></td><td>${esc(o.descricao||"")}<small>${sortedItems(o).length} linha(s)</small></td><td><strong>${money(t.total)}</strong><small>Base ${money(t.base)}</small></td><td><span class="budget-status ${statusClass(o.estado)}">${esc(o.estado||"Rascunho")}</span></td><td><div class="budget-actions"><button class="btn small primary" data-print-orcamento="${o.id}">PDF / imprimir</button><button class="btn small light" data-edit-orcamento="${o.id}">Editar</button><button class="btn small light" data-duplicate-orcamento="${o.id}">Duplicar</button><button class="btn small danger" data-del-orcamento="${o.id}">Apagar</button></div></td></tr>`;
  }).join("");
  $("orcamentosTable").innerHTML=`<div class="orcamento-list-summary"><span>${rows.length} orçamento(s)</span><strong>${money(value)}</strong></div><div class="table-scroll"><table><thead><tr><th>Número</th><th>Emissão</th><th>Cliente / obra</th><th>Descrição</th><th>Total</th><th>Estado</th><th>Ações</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

function nextNumber(){
  const year=new Date().getFullYear();
  const values=store.orcamentos.map(o=>String(o.numero||"").match(new RegExp(`^ORC-${year}-(\\d+)$`))?.[1]).filter(Boolean).map(Number);
  return `ORC-${year}-${String((values.length?Math.max(...values):0)+1).padStart(3,"0")}`;
}

function itemRow(item={}){
  const row=document.createElement("div");
  row.className="orcamento-item-row";
  row.dataset.id=item.id||"";
  row.innerHTML=`<input class="budget-item-description" required placeholder="Descrição do trabalho ou material" value="${esc(item.descricao||"")}"><select class="budget-item-unit"><option>un</option><option>m</option><option>m²</option><option>m³</option><option>h</option><option>dia</option><option>lote</option></select><input class="budget-item-qty" type="number" min="0.001" step="0.001" value="${numberValue(item.quantidade)||1}" required><input class="budget-item-price" type="number" min="0" step="0.01" value="${numberValue(item.preco_unitario)}" required><strong class="budget-item-total">${money(numberValue(item.quantidade||1)*numberValue(item.preco_unitario))}</strong><button type="button" class="budget-item-remove" aria-label="Remover linha">×</button>`;
  row.querySelector(".budget-item-unit").value=item.unidade||"un";
  $("orcamentoItens").appendChild(row);
  updatePreview();
}

function currentItems(){return [...document.querySelectorAll(".orcamento-item-row")].map((row,index)=>({id:row.dataset.id||null,ordem:index,descricao:row.querySelector(".budget-item-description").value.trim(),unidade:row.querySelector(".budget-item-unit").value,quantidade:numberValue(row.querySelector(".budget-item-qty").value),preco_unitario:numberValue(row.querySelector(".budget-item-price").value)}))}

function updatePreview(){
  document.querySelectorAll(".orcamento-item-row").forEach(row=>row.querySelector(".budget-item-total").textContent=money(numberValue(row.querySelector(".budget-item-qty").value)*numberValue(row.querySelector(".budget-item-price").value)));
  const sub=currentItems().reduce((sum,item)=>sum+item.quantidade*item.preco_unitario,0);
  const discount=Math.min(sub,Math.max(0,numberValue($("orcamentoDesconto").value)));
  const base=sub-discount,iva=base*numberValue($("orcamentoIva").value)/100;
  $("orcamentoSubtotalPreview").textContent=money(sub);$("orcamentoDescontoPreview").textContent=money(discount);$("orcamentoIvaPreview").textContent=money(iva);$("orcamentoTotalPreview").textContent=money(base+iva);
}

export function openOrcamento(o={}){
  fill();
  $("orcamentoId").value=o.id||"";$("orcamentoClienteId").value=o.cliente_id||"";$("orcamentoObraId").value=o.obra_id||"";
  $("orcamentoNumero").value=o.numero||nextNumber();$("orcamentoReferencia").value=o.referencia||"";$("orcamentoDataEmissao").value=isoDate(o.data_emissao);$("orcamentoValidadeDias").value=o.validade_dias||15;
  $("orcamentoDescricao").value=o.descricao||"";$("orcamentoDesconto").value=numberValue(o.desconto);$("orcamentoIva").value=o.iva??23;$("orcamentoEstado").value=o.estado||"Rascunho";$("orcamentoCondicoes").value=o.condicoes||"Validade da proposta: 15 dias. Trabalhos adicionais serão orçamentados separadamente.";$("orcamentoNotas").value=o.notas||"";
  $("orcamentoItens").innerHTML="";
  const items=sortedItems(o);
  if(items.length)items.forEach(itemRow);else itemRow({descricao:o.descricao||"",quantidade:1,preco_unitario:numberValue(o.valor_sem_iva||o.total)});
  $("orcamentoDialog").showModal();updatePreview();
}

export async function submitOrcamento(event,refresh){
  event.preventDefault();
  const button=$("orcamentoSubmit"),items=currentItems();
  if(!items.length||items.some(i=>!i.descricao||i.quantidade<=0))return toast("Preencha pelo menos uma linha válida.","error");
  button.disabled=true;
  try{
    const subtotalValue=items.reduce((sum,item)=>sum+item.quantidade*item.preco_unitario,0);
    const discount=Math.min(subtotalValue,Math.max(0,numberValue($("orcamentoDesconto").value)));
    const id=$("orcamentoId").value||null;
    const budget=await saveReturning("orcamentos",{cliente_id:$("orcamentoClienteId").value,obra_id:$("orcamentoObraId").value||null,numero:$("orcamentoNumero").value.trim(),referencia:$("orcamentoReferencia").value.trim()||null,data_emissao:$("orcamentoDataEmissao").value,validade_dias:numberValue($("orcamentoValidadeDias").value)||15,descricao:$("orcamentoDescricao").value.trim(),valor_sem_iva:subtotalValue-discount,desconto:discount,iva:numberValue($("orcamentoIva").value),total:(subtotalValue-discount)*(1+numberValue($("orcamentoIva").value)/100),estado:$("orcamentoEstado").value,condicoes:$("orcamentoCondicoes").value.trim()||null,notas:$("orcamentoNotas").value.trim()||null,aprovado_em:$("orcamentoEstado").value==="Aprovado"?(id?store.orcamentos.find(o=>String(o.id)===id)?.aprovado_em:null)||new Date().toISOString():null},id);
    const existingIds=new Set(id?sortedItems(store.orcamentos.find(o=>String(o.id)===id)||{}).map(item=>String(item.id)):[]);
    const kept=[];
    for(const item of items){
      const payload={orcamento_id:budget.id,ordem:item.ordem,descricao:item.descricao,unidade:item.unidade,quantidade:item.quantidade,preco_unitario:item.preco_unitario,atualizado_em:new Date().toISOString()};
      const saved=await saveReturning("orcamento_itens",payload,item.id);kept.push(saved.id);
    }
    for(const removedId of [...existingIds].filter(itemId=>!kept.map(String).includes(itemId)))await remove("orcamento_itens",removedId);
    $("orcamentoDialog").close();toast("Orçamento guardado.");await refresh();
  }catch(err){toast(err.message,"error")}finally{button.disabled=false}
}
export async function deleteOrcamento(id,refresh){if(!confirm("Confirmar eliminação do orçamento?"))return;try{await remove("orcamentos",id);toast("Orçamento apagado.");await refresh()}catch(err){toast(err.message,"error")}}

function printBudget(id){
  const o=store.orcamentos.find(x=>String(x.id)===String(id));if(!o)return;
  const w=window.open("","_blank");if(!w)return toast("Autorize janelas pop-up para gerar o documento.","error");w.opener=null;
  const t=totals(o),client=o.clientes||{},items=sortedItems(o);const issue=isoDate(o.data_emissao);const valid=new Date(`${issue}T12:00:00`);valid.setDate(valid.getDate()+(numberValue(o.validade_dias)||15));
  const rows=(items.length?items:[{descricao:o.descricao,unidade:"un",quantidade:1,preco_unitario:numberValue(o.valor_sem_iva)}]).map(i=>`<tr><td>${esc(i.descricao)}</td><td>${esc(i.unidade||"un")}</td><td>${numberValue(i.quantidade).toLocaleString("pt-PT")}</td><td>${money(i.preco_unitario)}</td><td>${money(numberValue(i.quantidade)*numberValue(i.preco_unitario))}</td></tr>`).join("");
  w.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>${esc(o.numero||"Orçamento")}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:12px Arial;color:#172033;margin:0}.actions{position:fixed;right:12px;top:12px}.actions button{background:#172033;color:#fff;border:0;border-radius:8px;padding:10px 14px}.head{display:flex;justify-content:space-between;border-bottom:3px solid #c69a2b;padding-bottom:18px}.brand h1{margin:0;font-size:26px}.brand small{color:#c69a2b;font-weight:bold}.meta{text-align:right}.client{margin:22px 0;padding:14px;background:#f5f7fa;border-radius:8px}.client strong,.client span{display:block}.title h2{margin:0 0 5px}.title p{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{padding:9px;border-bottom:1px solid #dbe2ea;text-align:right}th:first-child,td:first-child{text-align:left}.totals{margin:18px 0 0 auto;width:280px}.totals div{display:flex;justify-content:space-between;padding:6px}.totals .grand{font-size:17px;font-weight:bold;border-top:2px solid #172033}.terms{margin-top:24px;white-space:pre-wrap;line-height:1.5}.footer{margin-top:35px;border-top:1px solid #dbe2ea;padding-top:8px;color:#64748b}@media print{.actions{display:none}}</style></head><body><div class="actions"><button onclick="window.print()">Imprimir / Guardar PDF</button></div><header class="head"><div class="brand"><small>DISTAK</small><h1>Orçamento</h1><span>Pinturas e remodelações</span></div><div class="meta"><strong>${esc(o.numero||"")}</strong><p>Emissão: ${new Date(`${issue}T00:00:00`).toLocaleDateString("pt-PT")}<br>Válido até: ${valid.toLocaleDateString("pt-PT")}</p></div></header><section class="client"><strong>${esc(client.nome||"Cliente")}</strong><span>${esc(client.nif?`NIF ${client.nif}`:"")}</span><span>${esc([client.morada,client.codigo_postal,client.localidade].filter(Boolean).join(" · "))}</span><span>${esc([client.email,client.telefone].filter(Boolean).join(" · "))}</span></section><section class="title"><h2>${esc(o.descricao||"Proposta comercial")}</h2>${o.referencia?`<p>Referência: ${esc(o.referencia)}</p>`:""}</section><table><thead><tr><th>Descrição</th><th>Un.</th><th>Qtd.</th><th>Preço</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div><span>Subtotal</span><strong>${money(t.subtotal)}</strong></div>${numberValue(o.desconto)?`<div><span>Desconto</span><strong>-${money(o.desconto)}</strong></div>`:""}<div><span>IVA (${numberValue(o.iva)}%)</span><strong>${money(t.iva)}</strong></div><div class="grand"><span>Total</span><strong>${money(t.total)}</strong></div></div>${o.condicoes?`<section class="terms"><strong>Condições comerciais</strong><p>${esc(o.condicoes)}</p></section>`:""}<footer class="footer">DISTAK · Documento gerado pelo DISTAK ERP</footer></body></html>`);w.document.close();
}

export function initOrcamentos(){
  $("orcamentoAddItem")?.addEventListener("click",()=>itemRow());
  $("orcamentoItens")?.addEventListener("input",updatePreview);$("orcamentoIva")?.addEventListener("change",updatePreview);$("orcamentoDesconto")?.addEventListener("input",updatePreview);
  $("orcamentoItens")?.addEventListener("click",event=>{const button=event.target.closest(".budget-item-remove");if(!button)return;const rows=document.querySelectorAll(".orcamento-item-row");if(rows.length===1)return toast("O orçamento precisa de pelo menos uma linha.","error");button.closest(".orcamento-item-row").remove();updatePreview()});
  $("orcamentoClienteId")?.addEventListener("change",()=>{const selected=$("orcamentoClienteId").value;[...$("orcamentoObraId").options].forEach(option=>{if(!option.value)return;option.hidden=Boolean(selected&&option.dataset.cliente!==selected)});if($("orcamentoObraId").selectedOptions[0]?.hidden)$("orcamentoObraId").value=""});
  $("orcamentoSearch")?.addEventListener("input",filterOrcamentos);$("orcamentoEstadoFiltro")?.addEventListener("change",filterOrcamentos);$("orcamentoClienteFiltro")?.addEventListener("change",filterOrcamentos);
  document.addEventListener("click",event=>{const print=event.target.closest("[data-print-orcamento]")?.dataset.printOrcamento;if(print)printBudget(print);const duplicate=event.target.closest("[data-duplicate-orcamento]")?.dataset.duplicateOrcamento;if(duplicate){const source=store.orcamentos.find(o=>String(o.id)===duplicate);if(source)openOrcamento({...source,id:null,numero:nextNumber(),estado:"Rascunho",aprovado_em:null})}});
}
