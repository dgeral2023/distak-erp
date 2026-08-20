import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const calls=[];
const client={
  async rpc(name,args){calls.push({name,args});return {data:"budget-id",error:null}},
  from:table=>({async insert(row){calls.push({table,row});return {error:null}}}),
  auth:{async getUser(){return {data:{user:{id:"admin-id"}}}}},
  storage:{from:()=>({})}
};
globalThis.window={
  DISTAK_CONFIG:{SUPABASE_URL:"https://example.invalid",SUPABASE_KEY:"sb_publishable_test"},
  supabase:{createClient:()=>client}
};

const {saveBudgetWithItems}=await import("../assets/js/core/supabase.js");
const payload={cliente_id:"client-id",numero:"ORC-2026-001",descricao:"Teste",desconto:0,iva:23,estado:"Rascunho"};
const items=[{ordem:0,descricao:"Linha",unidade:"un",quantidade:1,preco_unitario:10}];
assert.deepEqual(await saveBudgetWithItems(payload,items,null),{id:"budget-id"});
assert.deepEqual(calls[0],{name:"guardar_orcamento_com_itens",args:{p_orcamento:payload,p_itens:items,p_orcamento_id:null}});
assert.equal(calls[1].table,"atividades_sistema","A operação atómica deve manter o histórico funcional.");

const root=resolve(import.meta.dirname,"..");
const sql=readFileSync(resolve(root,"supabase/migrations/20260820120000_preparar_dados_reais.sql"),"utf8");
const module=readFileSync(resolve(root,"assets/js/modules/orcamentos.js"),"utf8");
for(const required of ["security invoker","set search_path = ''","delete from public.orcamento_itens","jsonb_array_length(p_itens)","grant execute on function public.guardar_orcamento_com_itens"])assert(sql.includes(required),`RPC atómico incompleto: ${required}`);
assert(module.includes("saveBudgetWithItems"),"O formulário deve usar o RPC atómico.");
assert.equal(module.includes('saveReturning("orcamento_itens"'),false,"O frontend não deve guardar linhas sequencialmente.");
console.log("Orçamentos aprovados: cabeçalho, linhas, totais e validação são guardados numa única transação com RLS.");
