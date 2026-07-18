import {query} from "../core/supabase.js";
import {store} from "../core/store.js";

export async function refreshData(){
  store.clientes = await query("clientes");
  store.obras = await query("obras", "*,clientes(nome)");

  // A tabela orcamentos está ligada diretamente apenas a obras.
  // Não existe uma chave estrangeira direta orcamentos -> clientes.
  store.orcamentos = await query("orcamentos", "*,obras(nome)");

  store.custos = await query("custos", "*,obras(nome)");
  store.pagamentos = await query("pagamentos", "*,obras(nome)");

  // Uma falha no módulo de fotografias não deve bloquear os restantes dados do ERP.
  try{
    store.fotografias = await query("obra_fotografias");
  }catch(err){
    console.error("Não foi possível carregar as fotografias:", err);
    store.fotografias = [];
  }
}
