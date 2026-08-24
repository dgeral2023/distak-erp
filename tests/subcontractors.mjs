import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {subcontractCommittedValue,subcontractContractValue,workSubcontractSummary} from "../assets/js/core/subcontract-finance.js";

const contracts=[
  {id:"draft",obra_id:"work-1",estado:"proposta",valor_inicial:3000},
  {id:"active",obra_id:"work-1",estado:"adjudicada",valor_inicial:20000,taxa_iva:23},
  {id:"other",obra_id:"work-2",estado:"adjudicada",valor_inicial:9000}
];
const changes=[
  {subempreitada_id:"active",estado:"aprovada",valor_delta:2500},
  {subempreitada_id:"active",estado:"rascunho",valor_delta:800},
  {subempreitada_id:"active",estado:"aprovada",valor_delta:-500}
];
const costs=[
  {obra_id:"work-1",subempreitada_id:"active",valor_sem_iva:6000,custo_pagamentos:[{valor:4000}]},
  {obra_id:"work-1",subempreitada_id:null,valor_sem_iva:1500,custo_pagamentos:[]},
  {obra_id:"work-2",subempreitada_id:"other",valor_sem_iva:1000,custo_pagamentos:[]}
];

assert.equal(subcontractContractValue(contracts[0],changes),3000,"Uma proposta deve manter o valor visível.");
assert.equal(subcontractCommittedValue(contracts[0],changes),0,"Uma proposta ainda não deve ser compromisso adjudicado.");
assert.equal(subcontractCommittedValue(contracts[1],changes),22000,"Só alterações aprovadas devem ajustar o compromisso.");
const summary=workSubcontractSummary("work-1",{contracts,changes,costs,clientBase:50000});
assert.deepEqual({committed:summary.committed,invoiced:summary.invoiced,paid:summary.paid,otherCosts:summary.otherCosts,remainingToInvoice:summary.remainingToInvoice,plannedResult:summary.plannedResult,recordedResult:summary.recordedResult},{committed:22000,invoiced:6000,paid:4000,otherCosts:1500,remainingToInvoice:16000,plannedResult:26500,recordedResult:42500});
assert.equal(summary.plannedMargin,53);
const overrun=workSubcontractSummary("work-3",{contracts:[{id:"cancelled",obra_id:"work-3",estado:"cancelada",valor_inicial:5000}],changes:[],costs:[{obra_id:"work-3",subempreitada_id:"cancelled",valor_sem_iva:7000}],clientBase:10000});
assert.equal(overrun.plannedSubcontractCost,7000,"Faturas reais não podem desaparecer da previsão quando excedem ou substituem o compromisso.");
assert.equal(overrun.plannedResult,3000);

const root=resolve(import.meta.dirname,".."),migration=readFileSync(resolve(root,"supabase/migrations/20260822163659_controlo_subempreiteiros.sql"),"utf8").toLowerCase();
for(const required of ["create table public.fornecedores","create table public.subempreitadas","create table public.subempreitada_alteracoes","custos_subempreitada_mesma_obra_fk","enable row level security","to authenticated","public.is_admin()","on delete restrict"]){assert.ok(migration.includes(required),`Migration incompleta: ${required}`)}
assert.ok(!migration.includes("grant delete"),"A migration não deve conceder eliminação destes registos financeiros.");
assert.ok(!migration.includes("service_role"),"A migration não deve incluir segredos ou privilégios de service role.");
const indexMigration=readFileSync(resolve(root,"supabase/migrations/20260822163756_indexar_custos_subempreitada_obra.sql"),"utf8").toLowerCase();
assert.ok(indexMigration.includes("custos_subempreitada_obra_idx")&&indexMigration.includes("subempreitada_id,obra_id"),"A relação composta de custos deve ter um índice de cobertura.");

const mixedVatMigration=readFileSync(resolve(root,"supabase/migrations/20260824115934_adicionar_iva_misto_subempreitadas.sql"),"utf8").toLowerCase();
for(const required of [
  "alter table public.subempreitadas alter column taxa_iva drop not null",
  "create table if not exists public.subempreitada_iva_parcelas","enable row level security",
  "grant select,insert,update,delete","subempreitada_iva_parcelas_criado_por_idx",
  "security invoker","set search_path = ''","guardar_subempreitada_com_iva_parcelas",
  "jsonb_array_length(p_parcelas) not between 2 and 20","motivo_nao_liquidacao"
]){
  assert.ok(mixedVatMigration.includes(required),`Migration de IVA misto das subempreitadas incompleta: ${required}`);
}
assert.ok(mixedVatMigration.includes("motivo_nao_liquidacao is null or"),"Parcelas sem IVA não devem exigir motivo fiscal.");
for(const forbidden of ["disable row level security","security definer","drop table"]){
  assert.equal(mixedVatMigration.includes(forbidden),false,`Migration de IVA misto nao pode executar: ${forbidden}`);
}
console.log("Subempreitadas aprovadas: compromisso, trabalhos +/- e faturas reais permanecem separados por obra.");
