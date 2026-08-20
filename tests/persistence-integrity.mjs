import assert from "node:assert/strict";

const results=[
  {data:null,error:null},
  {data:null,error:null},
  {data:{id:"created-id"},error:null}
];
const builder=()=>({
  insert(){return this},
  update(){return this},
  delete(){return this},
  eq(){return this},
  select(){return this},
  async maybeSingle(){return results.shift()}
});
const client={
  from:()=>builder(),
  auth:{async getUser(){return {data:{user:null}}}},
  storage:{from:()=>({
    async createSignedUrls(paths){
      return {data:paths.map(path=>({path,signedUrl:"https://signed.invalid/"+encodeURIComponent(path)})),error:null};
    }
  })}
};
globalThis.window={
  DISTAK_CONFIG:{SUPABASE_URL:"https://example.invalid",SUPABASE_KEY:"sb_publishable_test"},
  supabase:{createClient:()=>client}
};
const {save,remove,signStorageRows}=await import("../assets/js/core/supabase.js");

await assert.rejects(
  ()=>save("clientes",{nome:"Sem efeito"},"missing"),
  /já não existe|não pode ser alterado/,
  "Uma atualização sem linha afetada não pode ser reportada como sucesso."
);
await assert.rejects(
  ()=>remove("clientes","missing"),
  /já não existe|não pode ser eliminado/,
  "Uma eliminação sem linha afetada não pode ser reportada como sucesso."
);
assert.deepEqual(await save("clientes",{nome:"Criado"}),{id:"created-id"});
const signed=await signStorageRows("distak-obras",[{id:1,ficheiro:"obras/a/foto.jpg"},{id:2,ficheiro:null}],"ficheiro");
assert.match(signed[0].url,/^https:\/\/signed\.invalid\//);
assert.equal(signed[1].url,null);
console.log("Persistência aprovada: escritas sem efeito falham e ficheiros privados recebem URLs temporários.");
