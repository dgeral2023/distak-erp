import {$,esc,money,toast,parseEuroValue} from "../core/ui.js";
import {store} from "../core/store.js";
import {save} from "../core/supabase.js";
import {workFinancialValues} from "../core/work-finance.js";
import {subcontractCommittedValue,subcontractContractValue,workSubcontractSummary} from "../core/subcontract-finance.js";
import {supplierTypeLabel} from "../core/cost-suppliers.js";
import {createVatPartsForm} from "./obra-iva-misto.js";

const vat=createVatPartsForm({i:["subcontractVatMode","subcontractVatSingleFields","subcontractValue","subcontractVat","subcontractVatPartsSection","subcontractVatParts","subcontractVatSplit","subcontractVatAdd","subcontractVatValuePreview","subcontractTotalPreview","subcontractVatSummary"],t:"subempreitada_iva_parcelas",k:"subempreitada_id",r:"guardar_subempreitada_com_iva_parcelas",p:"p_subempreitada",d:"p_subempreitada_id",a:"subempreitadas",z:1});
async function saveVat(payload,id){const {finance,parts}=vat.read();return vat.save({...payload,valor_base:finance.base,taxa_iva:finance.rate},parts,id)}

let refreshApp=null;
const today=()=>new Date().toISOString().slice(0,10);
const supplier=id=>store.fornecedores.find(row=>String(row.id)===String(id));
const work=id=>store.obras.find(row=>String(row.id)===String(id));
const contract=id=>store.subempreitadas.find(row=>String(row.id)===String(id));
const stateLabel=value=>({proposta:"Proposta",adjudicada:"Adjudicada",em_execucao:"Em execução",suspensa:"Suspensa",concluida:"Concluída",cancelada:"Cancelada"}[value]||value||"—");
const contractChanges=id=>store.subempreitadaAlteracoes.filter(row=>String(row.subempreitada_id)===String(id));
const contractCosts=id=>store.custos.filter(row=>String(row.subempreitada_id)===String(id));
const invoiced=id=>contractCosts(id).reduce((sum,row)=>sum+Number(row.valor_sem_iva||row.valor||0),0);
const paid=id=>contractCosts(id).flatMap(row=>row.custo_pagamentos||[]).reduce((sum,row)=>sum+Number(row.valor||0),0);

function fillFilters(){
  const workOptions=store.obras.map(row=>`<option value="${row.id}">${esc(row.nome)}</option>`).join("");
  const supplierOptions=store.fornecedores.filter(row=>row.tipo==="subempreiteiro"&&row.estado!=="inativo").map(row=>`<option value="${row.id}">${esc(row.nome)}</option>`).join("");
  const filter=$("subcontractWorkFilter"),selected=filter?.value||"";
  if(filter){filter.innerHTML='<option value="">Todas as obras</option>'+workOptions;filter.value=selected}
  $("subcontractWork").innerHTML='<option value="">Selecionar obra</option>'+workOptions;
  $("subcontractSupplier").innerHTML='<option value="">Selecionar subempreiteiro</option>'+supplierOptions;
  $("subcontractChangeContract").innerHTML='<option value="">Selecionar contrato</option>'+store.subempreitadas.filter(row=>row.estado!=="cancelada").map(row=>`<option value="${row.id}">${esc(work(row.obra_id)?.nome||"")} · ${esc(supplier(row.fornecedor_id)?.nome||"")} · ${esc(row.objeto)}</option>`).join("");
}

function filteredContracts(){
  const text=$("subcontractSearch").value.trim().toLowerCase(),workId=$("subcontractWorkFilter").value,state=$("subcontractStateFilter").value;
  return store.subempreitadas.filter(row=>(!workId||String(row.obra_id)===workId)&&(!state||row.estado===state)&&(!text||[row.objeto,work(row.obra_id)?.nome,supplier(row.fornecedor_id)?.nome].join(" ").toLowerCase().includes(text)));
}

export function renderSubempreiteiros(){
  if(store.profile?.role!=="admin")return;
  fillFilters();
  const rows=filteredContracts(),active=rows.filter(row=>row.estado!=="cancelada"),committed=active.reduce((sum,row)=>sum+subcontractCommittedValue(row,store.subempreitadaAlteracoes),0),totalInvoiced=active.reduce((sum,row)=>sum+invoiced(row.id),0),totalPaid=active.reduce((sum,row)=>sum+paid(row.id),0);
  $("subcontractKpis").innerHTML=`<article><span>Subempreiteiros ativos</span><strong>${store.fornecedores.filter(row=>row.tipo==="subempreiteiro"&&row.estado==="ativo").length}</strong><small>Cadastro disponível</small></article><article><span>Compromissos sem IVA</span><strong>${money(committed)}</strong><small>${active.length} contrato(s) em carteira</small></article><article><span>Faturado sem IVA</span><strong>${money(totalInvoiced)}</strong><small>${money(Math.max(0,committed-totalInvoiced))} por faturar</small></article><article><span>Pago com IVA</span><strong>${money(totalPaid)}</strong><small>Conforme pagamentos de faturas</small></article>`;
  $("subcontractList").innerHTML=rows.length?rows.map(row=>{
    const value=subcontractContractValue(row,store.subempreitadaAlteracoes),billed=invoiced(row.id),settled=paid(row.id),percentage=value>0?Math.min(100,billed/value*100):0;
    return `<article class="subcontract-card ${row.estado}"><header><div><span>${esc(work(row.obra_id)?.nome||"Obra")}</span><h3>${esc(row.objeto)}</h3><p>${esc(supplier(row.fornecedor_id)?.nome||"Subempreiteiro")}</p></div><b class="subcontract-state">${esc(stateLabel(row.estado))}</b></header><div class="subcontract-values"><span>Compromisso<strong>${money(value)}</strong></span><span>Faturado<strong>${money(billed)}</strong></span><span>Pago c/ IVA<strong>${money(settled)}</strong></span><span>Por faturar<strong>${money(Math.max(0,value-billed))}</strong></span></div><div class="subcontract-progress"><span style="width:${percentage}%"></span></div><footer><button class="btn small light" type="button" data-edit-subcontract="${row.id}">Editar contrato</button><button class="btn small primary" type="button" data-new-subcontract-change="${row.id}">Trabalho +/-</button>${row.estado!=="cancelada"?`<button class="btn small danger" type="button" data-cancel-subcontract="${row.id}">Cancelar</button>`:""}</footer></article>`;
  }).join(""):'<div class="subcontract-empty">Ainda não existem contratos de subempreitada para estes filtros.</div>';
  const suppliers=[...store.fornecedores].sort((a,b)=>String(a.nome).localeCompare(String(b.nome),"pt-PT"));
  $("subcontractSuppliers").innerHTML=suppliers.length?`<table><thead><tr><th>Nome</th><th>Tipo</th><th>NIF</th><th>Especialidade</th><th>Contacto</th><th>Estado</th><th>Ações</th></tr></thead><tbody>${suppliers.map(row=>`<tr><td><strong>${esc(row.nome)}</strong></td><td>${esc(supplierTypeLabel(row.tipo))}</td><td>${esc(row.nif||"—")}</td><td>${esc(row.especialidade||"—")}</td><td>${esc(row.telefone||row.email||"—")}</td><td><span class="badge">${row.estado==="ativo"?"Ativo":"Inativo"}</span></td><td><button class="btn small light" type="button" data-edit-supplier="${row.id}">Editar</button>${row.estado==="ativo"?` <button class="btn small danger" type="button" data-deactivate-supplier="${row.id}">Desativar</button>`:""}</td></tr>`).join("")}</tbody></table>`:'<p>Adicione o primeiro fornecedor ou subempreiteiro.</p>';
}

export function openSupplier(row={}){
  $("supplierForm").reset();$("supplierId").value=row.id||"";$("supplierType").value=row.tipo||"fornecedor";$("supplierName").value=row.nome||"";$("supplierNif").value=row.nif||"";$("supplierEmail").value=row.email||"";$("supplierPhone").value=row.telefone||"";$("supplierAddress").value=row.morada||"";$("supplierSpecialty").value=row.especialidade||"";$("supplierIban").value=row.iban||"";$("supplierTerms").value=row.condicoes_pagamento||"";$("supplierInsurance").value=row.seguro_apolice||"";$("supplierInsuranceDate").value=row.seguro_validade||"";$("supplierState").value=row.estado||"ativo";$("supplierNotes").value=row.notas||"";$("supplierDialog").showModal();
}

async function submitSupplier(event){
  event.preventDefault();const id=$("supplierId").value||null;
  try{await save("fornecedores",{tipo:$("supplierType").value,nome:$("supplierName").value.trim(),nif:$("supplierNif").value.trim()||null,email:$("supplierEmail").value.trim()||null,telefone:$("supplierPhone").value.trim()||null,morada:$("supplierAddress").value.trim()||null,especialidade:$("supplierSpecialty").value.trim()||null,iban:$("supplierIban").value.trim()||null,condicoes_pagamento:$("supplierTerms").value.trim()||null,seguro_apolice:$("supplierInsurance").value.trim()||null,seguro_validade:$("supplierInsuranceDate").value||null,estado:$("supplierState").value,notas:$("supplierNotes").value.trim()||null,atualizado_em:new Date().toISOString()},id);$("supplierDialog").close();toast("Fornecedor guardado.");await refreshApp()}catch(error){toast(error.message,"error")}
}

export function openSubcontract(row={}){
  if(!store.fornecedores.some(item=>item.tipo==="subempreiteiro"&&item.estado==="ativo")){toast("Adicione primeiro um subempreiteiro ativo.","error");openSupplier({tipo:"subempreiteiro"});return}
  fillFilters();$("subcontractForm").reset();$("subcontractId").value=row.id||"";$("subcontractWork").value=row.obra_id||"";$("subcontractSupplier").value=row.fornecedor_id||"";$("subcontractObject").value=row.objeto||"";$("subcontractValue").value=row.valor_inicial??"";$("subcontractVat").value=row.taxa_iva??23;$("subcontractState").value=row.estado||"proposta";$("subcontractAwardDate").value=row.adjudicada_em||"";$("subcontractStart").value=row.inicio_previsto||"";$("subcontractEnd").value=row.fim_previsto||"";$("subcontractTerms").value=row.condicoes_pagamento||"";$("subcontractNotes").value=row.notas||"";$("subcontractDialog").showModal();
  vat.open(row).catch(error=>toast(error.message,"error"));
}

async function submitSubcontract(event){
  event.preventDefault();const id=$("subcontractId").value||null,value=parseEuroValue($("subcontractValue").value);
  if(!Number.isFinite(value)||value<0)return toast("Introduza um valor válido sem IVA.","error");
  try{await saveVat({obra_id:$("subcontractWork").value,fornecedor_id:$("subcontractSupplier").value,objeto:$("subcontractObject").value.trim(),estado:$("subcontractState").value,adjudicada_em:$("subcontractAwardDate").value||null,inicio_previsto:$("subcontractStart").value||null,fim_previsto:$("subcontractEnd").value||null,condicoes_pagamento:$("subcontractTerms").value.trim()||null,notas:$("subcontractNotes").value.trim()||null,atualizado_em:new Date().toISOString()},id);$("subcontractDialog").close();toast("Contrato de subempreitada guardado.");await refreshApp()}catch(error){toast(error.message,"error")}
}

function openChange(row={},contractId=""){
  fillFilters();$("subcontractChangeForm").reset();$("subcontractChangeId").value=row.id||"";$("subcontractChangeContract").value=row.subempreitada_id||contractId;$("subcontractChangeDescription").value=row.descricao||"";$("subcontractChangeValue").value=row.valor_delta??"";$("subcontractChangeState").value=row.estado||"rascunho";$("subcontractChangeDate").value=row.data||today();$("subcontractChangeNotes").value=row.notas||"";$("subcontractChangeDialog").showModal();
}

async function submitChange(event){
  event.preventDefault();const id=$("subcontractChangeId").value||null,value=parseEuroValue($("subcontractChangeValue").value);
  if(!Number.isFinite(value)||value===0)return toast("O trabalho a mais ou a menos tem de ter um valor diferente de zero.","error");
  try{await save("subempreitada_alteracoes",{subempreitada_id:$("subcontractChangeContract").value,descricao:$("subcontractChangeDescription").value.trim(),valor_delta:value,estado:$("subcontractChangeState").value,data:$("subcontractChangeDate").value,notas:$("subcontractChangeNotes").value.trim()||null,atualizado_em:new Date().toISOString()},id);$("subcontractChangeDialog").close();toast("Alteração contratual guardada.");await refreshApp()}catch(error){toast(error.message,"error")}
}

export function renderWorkSubcontracts(obra){
  const host=$("obra-tab-subempreitadas");if(!host||store.profile?.role!=="admin")return;
  const finance=workFinancialValues(obra),summary=workSubcontractSummary(obra.id,{contracts:store.subempreitadas,changes:store.subempreitadaAlteracoes,costs:store.custos,clientBase:finance.base});
  host.innerHTML=`<section class="work-subcontract-summary"><article><span>Cliente sem IVA</span><strong>${money(finance.base)}</strong></article><article><span>Comprometido</span><strong>${money(summary.committed)}</strong></article><article><span>Outros custos</span><strong>${money(summary.otherCosts)}</strong></article><article><span>Resultado planeado</span><strong>${money(summary.plannedResult)}</strong><small>${summary.plannedMargin.toFixed(1)}% de margem</small></article></section>${summary.contracts.length?summary.contracts.map(row=>{const value=subcontractContractValue(row,store.subempreitadaAlteracoes),billed=invoiced(row.id);return `<article class="work-subcontract-row"><header><div><strong>${esc(row.objeto)}</strong><small>${esc(supplier(row.fornecedor_id)?.nome||"Subempreiteiro")} · ${esc(stateLabel(row.estado))}</small></div><b>${money(value)}</b></header><div><span>Faturado sem IVA <strong>${money(billed)}</strong></span><span>Por faturar <strong>${money(Math.max(0,value-billed))}</strong></span><span>Pago com IVA <strong>${money(paid(row.id))}</strong></span></div>${contractChanges(row.id).length?`<details><summary>${contractChanges(row.id).length} trabalho(s) a mais/menos</summary>${contractChanges(row.id).map(change=>`<p>${esc(change.descricao)} · ${money(change.valor_delta)} · ${esc(change.estado)}</p>`).join("")}</details>`:""}</article>`}).join(""):'<div class="subcontract-empty">Sem subempreitadas associadas a esta obra.</div>'}`;
}

export function initSubempreiteiros(refresh){
  refreshApp=refresh;$("subcontractSearch").addEventListener("input",renderSubempreiteiros);$("subcontractWorkFilter").addEventListener("change",renderSubempreiteiros);$("subcontractStateFilter").addEventListener("change",renderSubempreiteiros);$("newSupplierBtn").onclick=()=>openSupplier();$("newSubcontractBtn").onclick=()=>openSubcontract();$("supplierForm").addEventListener("submit",submitSupplier);$("subcontractForm").addEventListener("submit",submitSubcontract);$("subcontractChangeForm").addEventListener("submit",submitChange);
  document.addEventListener("click",async event=>{const editSupplier=event.target.closest("[data-edit-supplier]")?.dataset.editSupplier,deactivate=event.target.closest("[data-deactivate-supplier]")?.dataset.deactivateSupplier,editContract=event.target.closest("[data-edit-subcontract]")?.dataset.editSubcontract,newChange=event.target.closest("[data-new-subcontract-change]")?.dataset.newSubcontractChange,cancel=event.target.closest("[data-cancel-subcontract]")?.dataset.cancelSubcontract;if(editSupplier)openSupplier(supplier(editSupplier));if(deactivate&&confirm("Desativar este fornecedor? Os contratos e faturas existentes serão mantidos.")){await save("fornecedores",{estado:"inativo",atualizado_em:new Date().toISOString()},deactivate);await refreshApp();toast("Fornecedor desativado.")}if(editContract)openSubcontract(contract(editContract));if(newChange)openChange({},newChange);if(cancel&&confirm("Cancelar este contrato? As faturas já registadas serão mantidas.")){await save("subempreitadas",{estado:"cancelada",atualizado_em:new Date().toISOString()},cancel);await refreshApp();toast("Contrato cancelado.")}});
  document.addEventListener("distak:obra-ficha-render",event=>renderWorkSubcontracts(event.detail?.obra));
}
