import {query} from "../core/supabase.js";
import {store} from "../core/store.js";

export async function refreshData(){
  const isAdmin=store.profile?.role==="admin";
  store.profiles = isAdmin ? await query("profiles") : [store.profile];
  store.obraUtilizadores = await query("obra_utilizadores");
  store.clientes = await query("clientes");
  store.obras = await query("obras", "*,clientes(nome)");

  store.orcamentos = await query("orcamentos", "*,obras(nome),clientes(nome,nif,email,telefone,morada,codigo_postal,localidade),orcamento_itens(*)");

  store.custos = await query("custos", "*,obras(nome),custo_pagamentos(*)");
  store.pagamentos = await query("pagamentos", "*,obras(nome)");
  store.funcionarios = await query("funcionarios");
  store.funcionarioHoras = await query("funcionario_horas", "*,funcionarios(nome,funcao,custo_hora),obras(nome)");
  store.agendaTarefas = await query("agenda_tarefas");
  try{store.atividades=await query("atividades_sistema","*,profiles(nome)")}catch{store.atividades=[]}

  // Uma falha no módulo de fotografias não deve bloquear os restantes dados do ERP.
  try{
    store.fotografias = await query("obra_fotografias");
  }catch(err){
    console.error("Não foi possível carregar as fotografias:", err);
    store.fotografias = [];
  }
}
