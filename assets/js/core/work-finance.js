const amount=value=>{
  const parsed=Number(value??0);
  return Number.isFinite(parsed)?Math.max(0,parsed):0;
};

export const roundMoney=value=>Math.round((amount(value)+Number.EPSILON)*100)/100;
export const WORK_VAT_RATES=Object.freeze([0,6,23]);

export function normalizeWorkVatRate(value){
  const rate=Number(value);
  return WORK_VAT_RATES.includes(rate)?rate:null;
}

export function calculateWorkFinancialValues(baseValue,vatValue){
  const base=roundMoney(baseValue),vat=roundMoney(vatValue);
  return {base,vat,total:roundMoney(base+vat)};
}

export function calculateWorkFinancialValuesFromRate(baseValue,rateValue){
  const base=roundMoney(baseValue),rate=normalizeWorkVatRate(rateValue);
  const vat=rate===null?0:roundMoney(base*rate/100);
  return {base,rate,vat,total:roundMoney(base+vat)};
}

export function workFinancialValues(work={}){
  const contracted=amount(work.valor_contratado);
  const base=contracted>0?contracted:work.valor,rate=normalizeWorkVatRate(work.taxa_iva);
  const values=rate===null
    ?{...calculateWorkFinancialValues(base,work.valor_iva),rate:null}
    :calculateWorkFinancialValuesFromRate(base,rate);
  const hasStoredTotal=work.valor_total_com_iva!==null&&work.valor_total_com_iva!==undefined&&work.valor_total_com_iva!=="";
  return {...values,total:rate===null&&hasStoredTotal?roundMoney(work.valor_total_com_iva):values.total};
}
