import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {calculateWorkFinancialValues,calculateWorkFinancialValuesFromRate,normalizeWorkVatRate,workFinancialValues} from "../assets/js/core/work-finance.js";

assert.deepEqual(workFinancialValues({valor_contratado:5822.15}),{base:5822.15,vat:0,total:5822.15,rate:null});
assert.deepEqual(workFinancialValues({valor_contratado:0,valor:5822.15}),{base:5822.15,vat:0,total:5822.15,rate:null});
assert.deepEqual(workFinancialValues({valor_contratado:5822.15,valor_iva:1339.09}),{base:5822.15,vat:1339.09,total:7161.24,rate:null});
assert.deepEqual(workFinancialValues({valor_contratado:5822.15,valor_iva:1339.09,valor_total_com_iva:7161.24}),{base:5822.15,vat:1339.09,total:7161.24,rate:null});
assert.deepEqual(workFinancialValues({valor_contratado:5822.15,taxa_iva:23,valor_iva:0,valor_total_com_iva:5822.15}),{base:5822.15,rate:23,vat:1339.09,total:7161.24});
assert.deepEqual(calculateWorkFinancialValues(10.005,2.005),{base:10.01,vat:2.01,total:12.02});
assert.deepEqual(calculateWorkFinancialValuesFromRate(5822.15,23),{base:5822.15,rate:23,vat:1339.09,total:7161.24});
assert.deepEqual(calculateWorkFinancialValuesFromRate(5822.15,6),{base:5822.15,rate:6,vat:349.33,total:6171.48});
assert.equal(normalizeWorkVatRate("23"),23);
assert.equal(normalizeWorkVatRate(6),6);
assert.equal(normalizeWorkVatRate(0),null);

const root=resolve(import.meta.dirname,"..");
const sql=readFileSync(resolve(root,"supabase/migrations/20260822131455_separar_iva_valor_obras.sql"),"utf8");
for(const required of ["add column if not exists valor_iva numeric(14,2)","valor_total_com_iva numeric generated always as","obras_valor_iva_nao_negativo","lock_timeout","statement_timeout"]){
  assert(sql.includes(required),`Migration de IVA incompleta: ${required}`);
}
for(const forbidden of ["drop column","disable row level security","update public.obras"]){
  assert.equal(sql.includes(forbidden),false,`Migration de IVA não pode executar: ${forbidden}`);
}

const rateSql=readFileSync(resolve(root,"supabase/migrations/20260822133045_adicionar_taxa_iva_obras.sql"),"utf8");
for(const required of ["add column if not exists taxa_iva numeric(5,2)","taxa_iva in (6, 23)","obras_iva_calculado_consistente","validate constraint","lock_timeout","statement_timeout"]){
  assert(rateSql.includes(required),`Migration da taxa de IVA incompleta: ${required}`);
}
for(const forbidden of ["drop column","disable row level security","update public.obras"]){
  assert.equal(rateSql.includes(forbidden),false,`Migration da taxa de IVA não pode executar: ${forbidden}`);
}

console.log("Valores das obras aprovados: taxas de 23% e 6% calculam automaticamente IVA e total com compatibilidade.");
