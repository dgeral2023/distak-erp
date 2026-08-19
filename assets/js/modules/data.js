import {query} from "../core/supabase.js";
import {store} from "../core/store.js";

export async function refreshData(){
  store.leads = store.profile?.role === "admin" ? await query("leads_site") : [];
  store.clientes = await query("clientes");
  store.obras = await query("obras", "*,clientes(nome)");

  store.orcamentos = await query("orcamentos", "*,obras(nome),clientes(nome,nif,email,telefone,morada,codigo_postal,localidade),orcamento_itens(*)");

  store.custos = await query("custos", "*,obras(nome),custo_pagamentos(*)");
  store.pagamentos = await query("pagamentos", "*,obras(nome)");
  store.funcionarios = await query("funcionarios");
  store.funcionarioHoras = await query("funcionario_horas", "*,funcionarios(nome,funcao,custo_hora),obras(nome)");

  // Uma falha no módulo de fotografias não deve bloquear os restantes dados do ERP.
  try{
    store.fotografias = await query("obra_fotografias");
  }catch(err){
    console.error("Não foi possível carregar as fotografias:", err);
    store.fotografias = [];
  }
}
