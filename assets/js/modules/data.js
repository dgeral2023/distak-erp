import {query} from "../core/supabase.js";
import {store} from "../core/store.js";

export async function refreshData(){
  const isAdmin=store.profile?.role==="admin";
  const isClient=store.profile?.role==="cliente";
  if(isClient){
    store.profiles=[store.profile];
    store.clientePortalAcessos=await query("cliente_portal_acessos");
    store.clientePortalObras=await query("cliente_portal_obras");
    store.clientePortalAtualizacoes=await query("cliente_portal_atualizacoes");
    store.clientePortalFicheiros=await query("cliente_portal_ficheiros");
    ["obraUtilizadores","clientes","obras","orcamentos","custos","pagamentos","fotografias","documentosObra","funcionarios","funcionarioHoras","atividades","agendaTarefas","previsoesFinanceiras","pedidosCompra","propostasCompra","autosMedicao","itensMedicao","campoRegistos","inteligenciaAvaliacoes","diariosObra","checklistsObra","materiaisObra","ocorrenciasObra","horasObra","equipaObra"].forEach(key=>store[key]=[]);
    return;
  }
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
  try{store.campoRegistos=await query("campo_registos")}catch(err){console.error("Não foi possível carregar os registos de campo:",err);store.campoRegistos=[]}
  store.previsoesFinanceiras = isAdmin ? await query("financeiro_previsoes") : [];
  if(isAdmin){try{[store.pedidosCompra,store.propostasCompra]=await Promise.all([query("compras_pedidos"),query("compras_propostas")])}catch(err){console.error("Não foi possível carregar as compras:",err);store.pedidosCompra=[];store.propostasCompra=[]}}else{store.pedidosCompra=[];store.propostasCompra=[]}
  if(isAdmin){try{[store.autosMedicao,store.itensMedicao]=await Promise.all([query("medicoes_autos"),query("medicoes_itens")])}catch(err){console.error("Não foi possível carregar as medições:",err);store.autosMedicao=[];store.itensMedicao=[]}}else{store.autosMedicao=[];store.itensMedicao=[]}
  if(isAdmin){try{store.inteligenciaAvaliacoes=await query("inteligencia_avaliacoes","*,obras(nome)")}catch(err){console.error("Não foi possível carregar as análises de gestão:",err);store.inteligenciaAvaliacoes=[]}}else{store.inteligenciaAvaliacoes=[]}
  try{store.atividades=await query("atividades_sistema","*,profiles(nome)")}catch{store.atividades=[]}

  // Uma falha no módulo de fotografias não deve bloquear os restantes dados do ERP.
  try{
    store.fotografias = await query("obra_fotografias");
  }catch(err){
    console.error("Não foi possível carregar as fotografias:", err);
    store.fotografias = [];
  }
  try{store.documentosObra=await query("obra_documentos")}catch(err){console.error("Não foi possível carregar o inventário documental:",err);store.documentosObra=[]}
  try{
    const operational=await Promise.all([query("obra_diarios"),query("obra_checklists"),query("obra_materiais"),query("obra_ocorrencias"),query("obra_horas"),query("obra_equipa_registos")]);
    [store.diariosObra,store.checklistsObra,store.materiaisObra,store.ocorrenciasObra,store.horasObra,store.equipaObra]=operational;
  }catch(err){
    console.error("Não foi possível carregar o centro operacional:",err);
    [store.diariosObra,store.checklistsObra,store.materiaisObra,store.ocorrenciasObra,store.horasObra,store.equipaObra]=[[],[],[],[],[],[]];
  }
  if(isAdmin){
    try{[store.clientePortalAcessos,store.clientePortalObras,store.clientePortalAtualizacoes,store.clientePortalFicheiros]=await Promise.all([query("cliente_portal_acessos"),query("cliente_portal_obras"),query("cliente_portal_atualizacoes"),query("cliente_portal_ficheiros")])}catch(err){console.error("Não foi possível carregar a gestão do portal do cliente:",err);store.clientePortalAcessos=[];store.clientePortalObras=[];store.clientePortalAtualizacoes=[];store.clientePortalFicheiros=[]}
  }
}
