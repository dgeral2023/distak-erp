import {calculateWorkFinancialValuesFromRate,roundMoney} from "./work-finance.js";

export const WORK_VAT_REGIMES=Object.freeze(["tributado","autoliquidacao","isento","nao_sujeito","outro"]);
export const WORK_VAT_NON_TAXED=new Set(WORK_VAT_REGIMES.slice(1));

export function workVatPartValues(part={}){
  const base=roundMoney(part.valor_base),regime=WORK_VAT_REGIMES.includes(part.regime_iva)?part.regime_iva:"tributado";
  const rate=regime==="tributado"&&[6,23].includes(Number(part.taxa_iva))?Number(part.taxa_iva):0;
  const values=calculateWorkFinancialValuesFromRate(base,rate);
  return {...values,regime};
}

export function summarizeWorkVatParts(parts=[]){
  return parts.reduce((total,part)=>{
    const values=workVatPartValues(part);
    total.base=roundMoney(total.base+values.base);
    total.vat=roundMoney(total.vat+values.vat);
    total.total=roundMoney(total.total+values.total);
    return total;
  },{base:0,vat:0,total:0,rate:null});
}
