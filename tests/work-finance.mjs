import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {calculateWorkFinancialValues,calculateWorkFinancialValuesFromRate,normalizeWorkVatRate,workFinancialValues} from "../assets/js/core/work-finance.js";
import {summarizeWorkVatParts,workVatPartValues} from "../assets/js/core/work-vat-parts.js";

assert.deepEqual(workFinancialValues({valor_contratado:5822.15}),{base:5822.15,vat:0,total:5822.15,rate:null});
assert.deepEqual(workFinancialValues({valor_contratado:0,valor:5822.15}),{base:5822.15,vat:0,total:5822.15,rate:null});
assert.deepEqual(workFinancialValues({valor_contratado:5822.15,valor_iva:1339.09}),{base:5822.15,vat:1339.09,total:7161.24,rate:null});
assert.deepEqual(workFinancialValues({valor_contratado:5822.15,valor_iva:1339.09,valor_total_com_iva:7161.24}),{base:5822.15,vat:1339.09,total:7161.24,rate:null});
assert.deepEqual(workFinancialValues({valor_contratado:5822.15,taxa_iva:23,valor_iva:0,valor_total_com_iva:5822.15}),{base:5822.15,rate:23,vat:1339.09,total:7161.24});
assert.deepEqual(workFinancialValues({valor_contratado:5822.15,taxa_iva:0,valor_iva:0,valor_total_com_iva:5822.15}),{base:5822.15,rate:0,vat:0,total:5822.15});
assert.deepEqual(calculateWorkFinancialValues(10.005,2.005),{base:10.01,vat:2.01,total:12.02});
assert.deepEqual(calculateWorkFinancialValuesFromRate(5822.15,23),{base:5822.15,rate:23,vat:1339.09,total:7161.24});
assert.deepEqual(calculateWorkFinancialValuesFromRate(5822.15,6),{base:5822.15,rate:6,vat:349.33,total:6171.48});
assert.deepEqual(calculateWorkFinancialValuesFromRate(5822.15,0),{base:5822.15,rate:0,vat:0,total:5822.15});
assert.equal(normalizeWorkVatRate("23"),23);
assert.equal(normalizeWorkVatRate(6),6);
assert.equal(normalizeWorkVatRate(0),0);

const taxedPart={descricao:"Trabalhos faturados",valor_base:5000,regime_iva:"tributado",taxa_iva:23};
assert.deepEqual(workVatPartValues(taxedPart),{base:5000,rate:23,vat:1150,total:6150,regime:"tributado"});
const untaxedPart={descricao:"Trabalhos sem liquidação",valor_base:5000,regime_iva:"autoliquidacao",taxa_iva:0,motivo_nao_liquidacao:"IVA — autoliquidação"};
assert.deepEqual(workVatPartValues(untaxedPart),{base:5000,rate:0,vat:0,total:5000,regime:"autoliquidacao"});
assert.deepEqual(summarizeWorkVatParts([taxedPart,untaxedPart]),{base:10000,vat:1150,total:11150,rate:null});

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

const zeroRateSql=readFileSync(resolve(root,"supabase/migrations/20260822151315_permitir_taxa_iva_zero_obras.sql"),"utf8");
for(const required of ["drop constraint if exists obras_taxa_iva_permitida","taxa_iva in (0, 6, 23)","not valid","validate constraint obras_taxa_iva_permitida","lock_timeout","statement_timeout"]){
  assert(zeroRateSql.includes(required),`Migration da taxa 0% incompleta: ${required}`);
}
for(const forbidden of ["drop column","disable row level security","update public.obras"]){
  assert.equal(zeroRateSql.includes(forbidden),false,`Migration da taxa 0% não pode executar: ${forbidden}`);
}

const mixedVatSql=readFileSync(resolve(root,"supabase/migrations/20260824075309_adicionar_iva_misto_obras.sql"),"utf8").toLowerCase();
for(const required of [
  "create table if not exists public.obra_iva_parcelas","enable row level security",
  "revoke all on public.obra_iva_parcelas","grant select,insert,update,delete","obra_iva_parcelas_criado_por_idx",
  "security invoker","set search_path = ''","guardar_obra_com_iva_parcelas",
  "jsonb_array_length(p_parcelas) not between 2 and 20","motivo_nao_liquidacao"
]){
  assert(mixedVatSql.includes(required),`Migration de IVA misto incompleta: ${required}`);
}
for(const forbidden of ["disable row level security","security definer","drop table"]){
  assert.equal(mixedVatSql.includes(forbidden),false,`Migration de IVA misto não pode executar: ${forbidden}`);
}

console.log("Valores das obras aprovados: taxas únicas e parcelas com tratamentos de IVA diferentes calculam automaticamente base, IVA e total.");
