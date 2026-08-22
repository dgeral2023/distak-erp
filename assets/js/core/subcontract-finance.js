const amount=value=>Number.isFinite(Number(value))?Number(value):0;
const same=(left,right)=>String(left)===String(right);
const committedContract=contract=>!['proposta','cancelada'].includes(contract?.estado);

export function subcontractContractValue(contract,changes=[]){
  if(contract?.estado==="cancelada")return 0;
  return amount(contract?.valor_inicial)+changes
    .filter(change=>same(change.subempreitada_id,contract?.id)&&change.estado==="aprovada")
    .reduce((sum,change)=>sum+amount(change.valor_delta),0);
}

export function subcontractCommittedValue(contract,changes=[]){
  return committedContract(contract)?subcontractContractValue(contract,changes):0;
}

export function subcontractCostTotal(cost){
  return amount(cost?.valor_sem_iva??cost?.valor);
}

export function subcontractCostPaid(cost){
  return (cost?.custo_pagamentos||[]).reduce((sum,payment)=>sum+amount(payment.valor),0);
}

export function workSubcontractSummary(workId,{contracts=[],changes=[],costs=[],clientBase=0}={}){
  const workContracts=contracts.filter(contract=>same(contract.obra_id,workId));
  const workCosts=costs.filter(cost=>same(cost.obra_id,workId));
  const committed=workContracts.reduce((sum,contract)=>sum+subcontractCommittedValue(contract,changes),0);
  const subcontractCosts=workCosts.filter(cost=>cost.subempreitada_id);
  const invoiced=subcontractCosts.reduce((sum,cost)=>sum+subcontractCostTotal(cost),0);
  const paid=subcontractCosts.reduce((sum,cost)=>sum+subcontractCostPaid(cost),0);
  const otherCosts=workCosts.filter(cost=>!cost.subempreitada_id).reduce((sum,cost)=>sum+subcontractCostTotal(cost),0);
  const recordedCosts=workCosts.reduce((sum,cost)=>sum+subcontractCostTotal(cost),0);
  const plannedSubcontractCost=workContracts.reduce((sum,contract)=>{
    const contractInvoiced=subcontractCosts.filter(cost=>same(cost.subempreitada_id,contract.id)).reduce((total,cost)=>total+subcontractCostTotal(cost),0);
    return sum+Math.max(subcontractCommittedValue(contract,changes),contractInvoiced);
  },0)+subcontractCosts.filter(cost=>!workContracts.some(contract=>same(contract.id,cost.subempreitada_id))).reduce((sum,cost)=>sum+subcontractCostTotal(cost),0);
  const plannedResult=amount(clientBase)-plannedSubcontractCost-otherCosts;
  const recordedResult=amount(clientBase)-recordedCosts;
  return {
    contracts:workContracts,
    committed,
    invoiced,
    paid,
    plannedSubcontractCost,
    otherCosts,
    recordedCosts,
    remainingToInvoice:Math.max(0,committed-invoiced),
    plannedResult,
    recordedResult,
    plannedMargin:amount(clientBase)>0?plannedResult/amount(clientBase)*100:0
  };
}
