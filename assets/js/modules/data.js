import {query} from "../core/supabase.js";
import {store} from "../core/store.js";

export async function refreshData(){
  store.clientes=await query("clientes");
  store.obras=await query("obras","*,clientes(nome)");
  store.orcamentos=await query("orcamentos","*,clientes(nome),obras(nome)");
  store.custos=await query("custos","*,obras(nome)");
  store.pagamentos=await query("pagamentos","*,obras(nome)");
  try{
    store.fotografias=await query("obra_fotografias");
  }catch(err){
    console.error("Não foi possível carregar as fotografias:",err);
    store.fotografias=[];
  }
}
