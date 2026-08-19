import assert from "node:assert/strict";

const rows=Array.from({length:1002},(_,id)=>({id:id+1})),ranges=[];
const client={
  from:()=>({
    select(){return this},
    order(){return this},
    async range(from,to){ranges.push([from,to]);return {data:rows.slice(from,to+1),error:null}}
  })
};
globalThis.window={DISTAK_CONFIG:{SUPABASE_URL:"https://example.invalid",SUPABASE_KEY:"sb_publishable_test"},supabase:{createClient:()=>client}};
const {query}=await import("../assets/js/core/supabase.js");
const result=await query("obras");

assert.equal(result.length,1002,"A consulta deve devolver registos além do limite padrão de mil linhas.");
assert.deepEqual(ranges,[[0,999],[1000,1999]],"A paginação deve avançar em blocos estáveis de mil registos.");
assert.equal(result[1001].id,1002,"A ordem dos dados paginados deve ser preservada.");
console.log("Acesso a dados aprovado: paginação completa acima de mil registos sem truncamento silencioso.");
