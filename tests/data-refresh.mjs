import assert from "node:assert/strict";

let active=0,maxActive=0;
const client={
  from:table=>({
    select(){return this},
    order(){return this},
    async range(){
      active++;maxActive=Math.max(maxActive,active);
      await new Promise(resolve=>setTimeout(resolve,4));
      active--;
      return {data:[],error:null};
    }
  }),
  storage:{from:()=>({async createSignedUrls(){return {data:[],error:null}}})}
};
globalThis.window={
  DISTAK_CONFIG:{SUPABASE_URL:"https://example.invalid",SUPABASE_KEY:"sb_publishable_test"},
  supabase:{createClient:()=>client}
};

const {store}=await import("../assets/js/core/store.js");
store.profile={id:"admin-test",role:"admin"};
const {refreshData}=await import("../assets/js/modules/data.js");
await refreshData();

assert.ok(maxActive>=5,`As consultas independentes devem correr em paralelo; concorrência observada: ${maxActive}.`);
for(const key of ["leads","profiles","clientes","obras","orcamentos","custos","pagamentos","funcionarios","agendaTarefas"])
  assert.ok(Array.isArray(store[key]),`${key} deve permanecer uma coleção.`);

console.log(`Atualização de dados aprovada: contratos preservados e consultas independentes em paralelo (${maxActive} simultâneas).`);
