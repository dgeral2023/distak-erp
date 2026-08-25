import assert from "node:assert/strict";
import {findInvoiceConflicts,invoiceConflictKind,normalizeInvoiceKey,normalizeSupplierKey,resolveCostSupplier} from "../assets/js/core/cost-suppliers.js";

assert.equal(normalizeSupplierKey("  Prádil, Lda. "),"pradil lda");
assert.equal(normalizeInvoiceKey(" PRA / 66008 "),"pra66008");

const suppliers=[{id:"pradil",nome:"Pradil, Lda."},{id:"leroy",nome:"Leroy Merlin"}];
assert.equal(resolveCostSupplier(suppliers,{nomeEmpresa:"PRADIL, LDA"})?.id,"pradil");

const costs=[
  {id:"a",obra_id:"obra-1",fornecedor_id:"pradil",nome_empresa:"Pradil, Lda.",numero_fatura:"PRA/66008"},
  {id:"b",obra_id:"obra-2",fornecedor_id:"leroy",nome_empresa:"Leroy Merlin",numero_fatura:"PRA/66008"},
  {id:"c",obra_id:"obra-2",fornecedor_id:null,nome_empresa:"PRADIL, LDA.",numero_fatura:"PRA 66008"}
];

let conflicts=findInvoiceConflicts(costs,{obraId:"obra-3",fornecedorId:"pradil",nomeEmpresa:"Pradil, Lda.",numeroFatura:"PRA-66008"});
assert.deepEqual(conflicts.map(row=>row.id),["a","c"]);
assert.equal(invoiceConflictKind(conflicts,"obra-3"),"cross_work");
assert.equal(invoiceConflictKind(conflicts,"obra-2"),"same_work");
assert.equal(findInvoiceConflicts(costs,{id:"a",obraId:"obra-1",fornecedorId:"pradil",nomeEmpresa:"Pradil, Lda.",numeroFatura:"PRA/66008"}).some(row=>row.id==="a"),false);
assert.equal(findInvoiceConflicts(costs,{obraId:"obra-3",fornecedorId:"leroy",nomeEmpresa:"Leroy Merlin",numeroFatura:"PRA/66008"}).length,1);
assert.equal(findInvoiceConflicts(costs,{obraId:"obra-3",fornecedorId:"pradil",nomeEmpresa:"Pradil, Lda.",numeroFatura:""}).length,0);

console.log("Fornecedores de custos: normalização, duplicados e rateios validados.");
