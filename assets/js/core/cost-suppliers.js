const normalized=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-PT").trim();

export function normalizeSupplierKey(value){
  return normalized(value).replace(/&/g," e ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}

export function normalizeInvoiceKey(value){
  return normalized(value).replace(/[^a-z0-9]+/g,"");
}

export function supplierTypeLabel(value){
  return ({fornecedor:"Fornecedor",subempreiteiro:"Subempreiteiro",prestador_servicos:"Prestador de serviços"})[value]||"Fornecedor";
}

export function resolveCostSupplier(suppliers,{fornecedorId="",nomeEmpresa=""}={}){
  const byId=suppliers.find(row=>String(row.id)===String(fornecedorId));
  if(byId)return byId;
  const name=normalizeSupplierKey(nomeEmpresa);
  return name?suppliers.find(row=>normalizeSupplierKey(row.nome)===name)||null:null;
}

function sameSupplier(row,candidate){
  const rowId=row.fornecedor_id,candidateId=candidate.fornecedorId;
  if(rowId&&candidateId)return String(rowId)===String(candidateId);
  const rowName=normalizeSupplierKey(row.nome_empresa),candidateName=normalizeSupplierKey(candidate.nomeEmpresa);
  return Boolean(rowName&&candidateName&&rowName===candidateName);
}

export function findInvoiceConflicts(costs,candidate={}){
  const invoice=normalizeInvoiceKey(candidate.numeroFatura);
  if(!invoice)return [];
  return costs.filter(row=>String(row.id)!==String(candidate.id||"")&&normalizeInvoiceKey(row.numero_fatura)===invoice&&sameSupplier(row,candidate));
}

export function invoiceConflictKind(conflicts,obraId){
  if(!conflicts.length)return "";
  return conflicts.some(row=>String(row.obra_id)===String(obraId))?"same_work":"cross_work";
}
