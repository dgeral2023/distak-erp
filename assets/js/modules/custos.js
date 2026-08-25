import {db,remove,saveReturning} from "../core/supabase.js";
import {$,esc,money,setView,toast} from "../core/ui.js";
import {store} from "../core/store.js";
import {findInvoiceConflicts,invoiceConflictKind,resolveCostSupplier,supplierTypeLabel} from "../core/cost-suppliers.js";

const BUCKET="distak-documentos";
const today=()=>new Date().toISOString().slice(0,10);
const safe=name=>name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"-");
const total=c=>Number(c.valor_sem_iva||0)*(1+Number(c.iva||0)/100);
const paid=c=>(c.custo_pagamentos||[]).reduce((sum,p)=>sum+Number(p.valor||0),0);
const balance=c=>Math.max(0,total(c)-paid(c));
let refreshApp=null;

function fillObras(){
  const options=store.obras.map(x=>`<option value="${x.id}">${esc(x.nome)}</option>`).join("");
  $("custoObraId").innerHTML='<option value="">Selecionar</option>'+options;
  const filter=$("custoObraFiltro"),selected=filter.value;
  filter.innerHTML='<option value="">Todas as obras</option>'+options;
  filter.value=selected;
}

function fillSubcontracts(selected=""){
  const workId=$("custoObraId").value;
  const rows=store.subempreitadas.filter(row=>String(row.obra_id)===String(workId)&&row.estado!=="cancelada");
  $("custoSubempreitadaId").innerHTML='<option value="">Sem contrato associado</option>'+rows.map(row=>{const provider=store.fornecedores.find(item=>String(item.id)===String(row.fornecedor_id));return `<option value="${row.id}">${esc(provider?.nome||"Subempreiteiro")} · ${esc(row.objeto)}</option>`}).join("");
  $("custoSubempreitadaId").value=rows.some(row=>String(row.id)===String(selected))?String(selected):"";
}

function fillSuppliers(selected="",legacyName=""){
  const resolved=resolveCostSupplier(store.fornecedores,{fornecedorId:selected,nomeEmpresa:legacyName});
  const rows=store.fornecedores.filter(row=>row.estado!=="inativo"||String(row.id)===String(resolved?.id)).sort((a,b)=>String(a.nome).localeCompare(String(b.nome),"pt-PT"));
  $("custoFornecedorId").innerHTML='<option value="">Outro / não cadastrado</option>'+rows.map(row=>`<option value="${row.id}">${esc(row.nome)} · ${esc(supplierTypeLabel(row.tipo))}${row.estado==="inativo"?" · Inativo":""}</option>`).join("");
  $("custoFornecedorId").value=resolved?.id||"";
}

function applySupplier(){
  const provider=store.fornecedores.find(row=>String(row.id)===String($("custoFornecedorId").value));
  if(provider)$("custoNomeEmpresa").value=provider.nome;
  updateDuplicateWarning();
}

function applySubcontract(){
  const row=store.subempreitadas.find(item=>String(item.id)===String($("custoSubempreitadaId").value));
  if(!row)return;
  const provider=store.fornecedores.find(item=>String(item.id)===String(row.fornecedor_id));
  $("custoCategoria").value="Subempreiteiros";
  if(provider){$("custoFornecedorId").value=provider.id;$("custoNomeEmpresa").value=provider.nome}
  updateDuplicateWarning();
}

function filteredRows(){
  const text=$("custoSearch").value.trim().toLowerCase();
  const obra=$("custoObraFiltro").value;
  const estado=$("custoEstadoFiltro").value;
  const inicio=$("custoDataInicioFiltro").value;
  const fim=$("custoDataFimFiltro").value;
  return store.custos.filter(c=>(!text||JSON.stringify(c).toLowerCase().includes(text))&&(!obra||String(c.obra_id)===obra)&&(!estado||(c.estado_pagamento||"pendente")===estado)&&(!inicio||c.data>=inicio)&&(!fim||c.data<=fim));
}

function status(c){
  if(paid(c)>0&&balance(c)>0)return {label:"Parcial",className:"status-parcial"};
  if(balance(c)<=0||(c.estado_pagamento||"pendente")==="pago")return {label:"Pago",className:"status-pago"};
  if(c.data_vencimento&&c.data_vencimento<today())return {label:"Em atraso",className:"status-atrasado"};
  return {label:"Pendente",className:"status-pendente"};
}

export function renderCustos(rows){
  fillObras();
  rows=rows||filteredRows();
  const subtotal=rows.reduce((sum,c)=>sum+Number(c.valor_sem_iva||0),0);
  const totalIva=rows.reduce((sum,c)=>sum+total(c),0),totalPago=rows.reduce((sum,c)=>sum+paid(c),0);
  $("custosTable").innerHTML=`<div class="custo-summary"><span>${rows.length} registo(s)</span><span>Total: <strong>${money(totalIva)}</strong></span><span>Pago: <strong>${money(totalPago)}</strong></span><span>Por pagar: <strong>${money(Math.max(0,totalIva-totalPago))}</strong></span></div>`+(rows.length?`<table><thead><tr><th>Obra</th><th>Empresa</th><th>Nº fatura</th><th>Total</th><th>Pago</th><th>Saldo</th><th>Estado</th><th>Vencimento</th><th>Fatura</th><th>Ações</th></tr></thead><tbody>${rows.map(c=>{const s=status(c);return `<tr><td>${esc(c.obras?.nome||"")}</td><td>${esc(c.nome_empresa||"")}</td><td>${esc(c.numero_fatura||"")}</td><td>${money(total(c))}</td><td>${money(paid(c))}</td><td>${money(balance(c))}</td><td><span class="badge ${s.className}">${s.label}</span></td><td>${esc(c.data_vencimento||"")}</td><td>${c.anexo_path?`<button class="btn small light" type="button" data-custo-open="${c.id}">Abrir</button>`:"—"}</td><td><button class="btn small primary" type="button" data-custo-pay="${c.id}">Pagamentos</button> <button class="btn small light" data-edit-custo="${c.id}">Editar</button> <button class="btn small danger" data-del-custo="${c.id}">Apagar</button></td></tr>`}).join("")}</tbody></table>`:"<p>Sem custos para os filtros selecionados.</p>");
  const suppliers=new Map();rows.forEach(c=>{const key=c.nome_empresa||"Sem fornecedor";const current=suppliers.get(key)||{count:0,total:0,paid:0};current.count++;current.total+=total(c);current.paid+=paid(c);suppliers.set(key,current)});
  $("custoSupplierReport").innerHTML=suppliers.size?`<table><thead><tr><th>Fornecedor</th><th>Faturas</th><th>Total</th><th>Pago</th><th>Por pagar</th></tr></thead><tbody>${[...suppliers.entries()].sort((a,b)=>b[1].total-a[1].total).map(([name,v])=>`<tr><td>${esc(name)}</td><td>${v.count}</td><td>${money(v.total)}</td><td>${money(v.paid)}</td><td>${money(Math.max(0,v.total-v.paid))}</td></tr>`).join("")}</tbody></table>`:"<p>Sem dados de fornecedores.</p>";
}

function drawPayments(c){
  $("custoPagamentoResumo").innerHTML=`<span>${esc(c.numero_fatura||c.descricao||"Custo")} · ${esc(c.nome_empresa||"")}</span><strong>${money(balance(c))} por pagar</strong>`;
  const rows=[...(c.custo_pagamentos||[])].sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  $("custoPagamentoLista").innerHTML=rows.length?`<div class="custo-payment-list"><strong>Histórico</strong>${rows.map(p=>`<div class="custo-payment-row"><span>${money(p.valor)}</span><span>${esc(p.data||"")}</span><small>${esc(p.metodo||"")}${p.referencia?` · ${esc(p.referencia)}`:""}</small><button class="btn small danger" type="button" data-custo-payment-delete="${p.id}">Eliminar</button></div>`).join("")}</div>`:"<p>Sem pagamentos registados.</p>";
}

function openCostPayments(id){
  const c=store.custos.find(x=>String(x.id)===String(id));if(!c)return;
  $("custoPagamentoForm").reset();$("custoPagamentoCustoId").value=c.id;$("custoPagamentoData").value=today();
  $("custoPagamentoValor").value=balance(c)>0?balance(c).toFixed(2):"";drawPayments(c);if(!$("custoPagamentoDialog").open)$("custoPagamentoDialog").showModal();
}

async function submitCostPayment(e){
  e.preventDefault();const custoId=$("custoPagamentoCustoId").value,c=store.custos.find(x=>String(x.id)===String(custoId)),value=Number($("custoPagamentoValor").value);
  if(!c||value<=0||value>balance(c)+0.005)return toast("O valor deve ser positivo e não pode ultrapassar o saldo por pagar.","error");
  try{const {error}=await db.from("custo_pagamentos").insert({custo_id:custoId,valor:value,data:$("custoPagamentoData").value,metodo:$("custoPagamentoMetodo").value,referencia:$("custoPagamentoReferencia").value.trim()||null,observacoes:$("custoPagamentoObservacoes").value.trim()||null});if(error)throw error;await refreshApp();toast("Pagamento ao fornecedor registado.");openCostPayments(custoId)}catch(err){toast(err.message,"error")}
}

async function deleteCostPayment(id){
  if(!confirm("Eliminar este pagamento?"))return;const custoId=$("custoPagamentoCustoId").value;
  try{const {error}=await db.from("custo_pagamentos").delete().eq("id",id);if(error)throw error;await refreshApp();toast("Pagamento eliminado.");openCostPayments(custoId)}catch(err){toast(err.message,"error")}
}

function updatePreview(){
  $("custoTotalPreview").textContent=money(Number($("custoValor").value||0)*(1+Number($("custoIva").value||0)/100));
}

function currentConflict(){
  const supplier=store.fornecedores.find(row=>String(row.id)===String($("custoFornecedorId").value));
  const candidate={id:$("custoId").value,obraId:$("custoObraId").value,fornecedorId:supplier?.id||"",nomeEmpresa:supplier?.nome||$("custoNomeEmpresa").value,numeroFatura:$("custoNumeroFatura").value};
  const conflicts=findInvoiceConflicts(store.custos,candidate);
  return {conflicts,kind:invoiceConflictKind(conflicts,candidate.obraId)};
}

function updateDuplicateWarning(){
  const warning=$("custoDuplicateWarning"),{conflicts,kind}=currentConflict();
  warning.classList.toggle("hidden",!conflicts.length);
  if(!conflicts.length){warning.textContent="";return}
  const works=[...new Set(conflicts.map(row=>row.obras?.nome||store.obras.find(work=>String(work.id)===String(row.obra_id))?.nome||"outra obra"))].join(", ");
  warning.innerHTML=kind==="same_work"?`<strong>Possível duplicado:</strong> esta fatura já está registada nesta obra. Confirme antes de guardar.`:`<strong>Possível rateio:</strong> esta fatura já tem valor atribuído a ${esc(works)}. Pode guardar outra parcela se a compra foi dividida entre obras.`;
}

export function openCusto(c={}){
  fillObras();
  $("custoForm").reset();
  $("custoId").value=c.id||"";
  $("custoObraId").value=c.obra_id||"";
  fillSubcontracts(c.subempreitada_id||"");
  $("custoCategoria").value=c.categoria||"Materiais";
  fillSuppliers(c.fornecedor_id||"",c.nome_empresa||"");
  $("custoNomeEmpresa").value=c.nome_empresa||"";
  $("custoNumeroFatura").value=c.numero_fatura||"";
  $("custoDescricao").value=c.descricao||"";
  $("custoValor").value=c.valor_sem_iva||"";
  $("custoIva").value=c.iva??23;
  $("custoData").value=c.data||today();
  $("custoEstadoPagamento").value=c.estado_pagamento||"pendente";
  $("custoDataVencimento").value=c.data_vencimento||"";
  const attachment=$("custoAnexoAtual");
  attachment.classList.toggle("hidden",!c.anexo_path);
  attachment.innerHTML=c.anexo_path?`<span><strong>Fatura atual:</strong> ${esc(c.anexo_nome||"Anexo")}</span><label class="crm-check"><input id="custoRemoverAnexo" type="checkbox"> Remover ao guardar</label>`:"";
  updatePreview();
  updateDuplicateWarning();
  $("custoDialog").showModal();
}

export async function submitCusto(e,refresh){
  e.preventDefault();
  const id=$("custoId").value||null;
  const previous=id?store.custos.find(x=>String(x.id)===String(id)):null;
  const file=$("custoAnexo").files?.[0];
  if(file&&file.size>25*1048576)return toast("A fatura excede 25 MB.","error");
  const allowed=["application/pdf","image/jpeg","image/png","image/webp","image/heic"];
  if(file&&file.type&&!allowed.includes(file.type))return toast("Use uma fatura em PDF, JPG, PNG, WEBP ou HEIC.","error");
  const subcontract=store.subempreitadas.find(row=>String(row.id)===String($("custoSubempreitadaId").value));
  const selectedSupplier=store.fornecedores.find(row=>String(row.id)===String($("custoFornecedorId").value));
  const provider=store.fornecedores.find(row=>String(row.id)===String(subcontract?.fornecedor_id))||selectedSupplier;
  const payload={obra_id:$("custoObraId").value,fornecedor_id:provider?.id||null,subempreitada_id:subcontract?.id||null,categoria:$("custoCategoria").value,nome_empresa:provider?.nome||$("custoNomeEmpresa").value.trim()||null,numero_fatura:$("custoNumeroFatura").value.trim()||null,descricao:$("custoDescricao").value.trim(),valor_sem_iva:Number($("custoValor").value||0),iva:Number($("custoIva").value||0),data:$("custoData").value||null,estado_pagamento:$("custoEstadoPagamento").value,data_vencimento:$("custoDataVencimento").value||null};
  const conflicts=findInvoiceConflicts(store.custos,{id,obraId:payload.obra_id,fornecedorId:payload.fornecedor_id,nomeEmpresa:payload.nome_empresa,numeroFatura:payload.numero_fatura});
  const conflictKind=invoiceConflictKind(conflicts,payload.obra_id);
  if(conflictKind==="same_work"&&!confirm("Esta fatura já está registada para este fornecedor nesta obra. Quer guardar mesmo assim?"))return;
  if(conflictKind==="cross_work"&&!confirm("Esta fatura já foi parcialmente atribuída a outra obra. Quer guardar esta parcela como rateio entre obras?"))return;
  let row,newPath=null;
  try{
    row=await saveReturning("custos",payload,id);
    if(file){
      newPath=`${row.obra_id}/custos/${row.id}/${crypto.randomUUID()}-${safe(file.name)}`;
      const {error}=await db.storage.from(BUCKET).upload(newPath,file,{contentType:file.type||undefined});
      if(error)throw error;
      await saveReturning("custos",{anexo_path:newPath,anexo_nome:file.name,anexo_mime_type:file.type||null,anexo_tamanho_bytes:file.size},row.id);
      if(previous?.anexo_path)await db.storage.from(BUCKET).remove([previous.anexo_path]);
    }else if(previous?.anexo_path&&$("custoRemoverAnexo")?.checked){
      await saveReturning("custos",{anexo_path:null,anexo_nome:null,anexo_mime_type:null,anexo_tamanho_bytes:null},row.id);
      await db.storage.from(BUCKET).remove([previous.anexo_path]);
    }
    $("custoDialog").close();
    toast("Custo guardado.");
    await refresh();
  }catch(err){
    if(newPath)await db.storage.from(BUCKET).remove([newPath]);
    if(!id&&row?.id)await remove("custos",row.id);
    toast(err.message,"error");
  }
}

async function openAttachment(id){
  const c=store.custos.find(x=>String(x.id)===String(id));
  if(!c?.anexo_path)return;
  const {data,error}=await db.storage.from(BUCKET).createSignedUrl(c.anexo_path,60);
  if(error)return toast(error.message,"error");
  const a=document.createElement("a");a.href=data.signedUrl;a.target="_blank";a.rel="noopener";a.click();
}

export async function deleteCusto(id,refresh){
  if(!confirm("Confirmar eliminação?"))return;
  const c=store.custos.find(x=>String(x.id)===String(id));
  try{
    await remove("custos",id);
    if(c?.anexo_path)await db.storage.from(BUCKET).remove([c.anexo_path]);
    toast("Custo apagado.");
    await refresh();
  }catch(err){toast(err.message,"error")}
}

export function initCustos(refresh){
  refreshApp=refresh;
  ["custoSearch","custoObraFiltro","custoEstadoFiltro","custoDataInicioFiltro","custoDataFimFiltro"].forEach(id=>$(id).addEventListener("input",()=>renderCustos()));
  $("custoLimparFiltros").onclick=()=>{["custoSearch","custoObraFiltro","custoEstadoFiltro","custoDataInicioFiltro","custoDataFimFiltro"].forEach(id=>$(id).value="");renderCustos()};
  $("custoValor").addEventListener("input",updatePreview);$("custoIva").addEventListener("change",updatePreview);
  $("custoObraId").addEventListener("change",()=>{fillSubcontracts();updateDuplicateWarning()});$("custoSubempreitadaId").addEventListener("change",applySubcontract);
  $("custoFornecedorId").addEventListener("change",applySupplier);$("custoNomeEmpresa").addEventListener("input",updateDuplicateWarning);$("custoNumeroFatura").addEventListener("input",updateDuplicateWarning);
  $("custoGerirFornecedores").onclick=()=>{$("custoDialog").close();setView("subempreiteiros")};
  $("custoPagamentoForm").addEventListener("submit",submitCostPayment);
  document.addEventListener("click",e=>{const id=e.target.closest("[data-custo-open]")?.dataset.custoOpen,pay=e.target.closest("[data-custo-pay]")?.dataset.custoPay,del=e.target.closest("[data-custo-payment-delete]")?.dataset.custoPaymentDelete;if(id)openAttachment(id);if(pay)openCostPayments(pay);if(del)deleteCostPayment(del)});
}
