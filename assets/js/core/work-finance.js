const amount=value=>{
  const parsed=Number(value??0);
  return Number.isFinite(parsed)?Math.max(0,parsed):0;
};

export const roundMoney=value=>Math.round((amount(value)+Number.EPSILON)*100)/100;

export function calculateWorkFinancialValues(baseValue,vatValue){
  const base=roundMoney(baseValue),vat=roundMoney(vatValue);
  return {base,vat,total:roundMoney(base+vat)};
}

export function workFinancialValues(work={}){
  const contracted=amount(work.valor_contratado);
  const values=calculateWorkFinancialValues(contracted>0?contracted:work.valor,work.valor_iva);
  const hasStoredTotal=work.valor_total_com_iva!==null&&work.valor_total_com_iva!==undefined&&work.valor_total_com_iva!=="";
  return {...values,total:hasStoredTotal?roundMoney(work.valor_total_com_iva):values.total};
}
