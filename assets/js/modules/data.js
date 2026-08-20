import {query,signStorageRows} from "../core/supabase.js";
import {store} from "../core/store.js";

export async function refreshData(){
  store.dataWarnings=[];
  const warn=label=>{if(!store.dataWarnings.includes(label))store.dataWarnings.push(label)};
  const isAdmin=store.profile?.role==="admin";
  const isClient=store.profile?.role==="cliente";
  if(isClient){
    store.profiles=[store.profile];
    store.clientePortalAcessos=await query("cliente_portal_acessos");
    store.clientePortalObras=await signStorageRows("distak-obras",await query("cliente_portal_obras"),"foto_path","foto_signed_url");
    store.clientePortalAtualizacoes=await query("cliente_portal_atualizacoes");
    store.clientePortalFicheiros=await query("cliente_portal_ficheiros");
    store.clientePortalAprovacoes=await query("cliente_portal_aprovacoes");
    ["obraUtilizadores","leads","clientes","clienteContactos","clienteMoradas","clienteNotas","clienteComunicacoes","clienteDocumentos","obras","orcamentos","custos","pagamentos","fotografias","documentosObra","funcionarios","funcionarioHoras","atividades","agendaTarefas","previsoesFinanceiras","pedidosCompra","propostasCompra","autosMedicao","itensMedicao","campoRegistos","inteligenciaAvaliacoes","diariosObra","checklistsObra","materiaisObra","ocorrenciasObra","horasObra","equipaObra"].forEach(key=>store[key]=[]);
    return;
  }
  store.leads = isAdmin ? await query("leads_site") : [];
  store.profiles = isAdmin ? await query("profiles") : [store.profile];
  store.obraUtilizadores = await query("obra_utilizadores");
  store.clientes = await query("clientes");
  store.obras = await query("obras", "*,clientes(nome)");

  store.orcamentos = await query("orcamentos", "*,obras(nome),clientes(nome,nif,email,telefone,morada,codigo_postal,localidade),orcamento_itens(*)");

  store.custos = await query("custos", "*,obras(nome),custo_pagamentos(*)");
  if(isAdmin){try{[store.clienteContactos,store.clienteMoradas,store.clienteNotas,store.clienteComunicacoes,store.clienteDocumentos]=await Promise.all([query("cliente_contactos"),query("cliente_moradas"),query("cliente_notas"),query("cliente_comunicacoes"),query("cliente_documentos")])}catch(err){console.error("Não foi possível carregar o CRM para a cópia de segurança:",err);warn("CRM de clientes");store.clienteContactos=[];store.clienteMoradas=[];store.clienteNotas=[];store.clienteComunicacoes=[];store.clienteDocumentos=[]}}
  else{store.clienteContactos=[];store.clienteMoradas=[];store.clienteNotas=[];store.clienteComunicacoes=[];store.clienteDocumentos=[]}
  store.pagamentos = await query("pagamentos", "*,obras(nome)");
  store.funcionarios = await query("funcionarios");
  store.funcionarioHoras = await query("funcionario_horas", "*,funcionarios(nome,funcao,custo_hora),obras(nome)");
  store.agendaTarefas = await query("agenda_tarefas");
  try{store.campoRegistos=await signStorageRows("distak-obras",await query("campo_registos"),"foto_path","foto_url")}catch(err){console.error("Não foi possível carregar os registos de campo:",err);warn("registos de campo");store.campoRegistos=[]}
  store.previsoesFinanceiras = isAdmin ? await query("financeiro_previsoes") : [];
  if(isAdmin){try{[store.pedidosCompra,store.propostasCompra]=await Promise.all([query("compras_pedidos"),query("compras_propostas")])}catch(err){console.error("Não foi possível carregar as compras:",err);warn("compras");store.pedidosCompra=[];store.propostasCompra=[]}}else{store.pedidosCompra=[];store.propostasCompra=[]}
  if(isAdmin){try{[store.autosMedicao,store.itensMedicao]=await Promise.all([query("medicoes_autos"),query("medicoes_itens")])}catch(err){console.error("Não foi possível carregar as medições:",err);warn("medições");store.autosMedicao=[];store.itensMedicao=[]}}else{store.autosMedicao=[];store.itensMedicao=[]}
  if(isAdmin){try{store.inteligenciaAvaliacoes=await query("inteligencia_avaliacoes","*,obras(nome)")}catch(err){console.error("Não foi possível carregar as análises de gestão:",err);warn("inteligência de gestão");store.inteligenciaAvaliacoes=[]}}else{store.inteligenciaAvaliacoes=[]}
  try{store.atividades=await query("atividades_sistema","*,profiles(nome)")}catch{warn("atividade recente");store.atividades=[]}

  // Uma falha no módulo de fotografias não deve bloquear os restantes dados do ERP.
  try{
    store.fotografias = await signStorageRows("distak-obras",await query("obra_fotografias"),"ficheiro","url");
  }catch(err){
    console.error("Não foi possível carregar as fotografias:", err);
    warn("fotografias");
    store.fotografias = [];
  }
  try{store.documentosObra=await query("obra_documentos")}catch(err){console.error("Não foi possível carregar o inventário documental:",err);warn("documentos");store.documentosObra=[]}
  try{
    const operational=await Promise.all([query("obra_diarios"),query("obra_checklists"),query("obra_materiais"),query("obra_ocorrencias"),query("obra_horas"),query("obra_equipa_registos")]);
    [store.diariosObra,store.checklistsObra,store.materiaisObra,store.ocorrenciasObra,store.horasObra,store.equipaObra]=operational;
  }catch(err){
    console.error("Não foi possível carregar o centro operacional:",err);
    warn("centro operacional");
    [store.diariosObra,store.checklistsObra,store.materiaisObra,store.ocorrenciasObra,store.horasObra,store.equipaObra]=[[],[],[],[],[],[]];
  }
  if(isAdmin){
    try{[store.clientePortalAcessos,store.clientePortalObras,store.clientePortalAtualizacoes,store.clientePortalFicheiros,store.clientePortalAprovacoes]=await Promise.all([query("cliente_portal_acessos"),query("cliente_portal_obras").then(rows=>signStorageRows("distak-obras",rows,"foto_path","foto_signed_url")),query("cliente_portal_atualizacoes"),query("cliente_portal_ficheiros"),query("cliente_portal_aprovacoes")])}catch(err){console.error("Não foi possível carregar a gestão do portal do cliente:",err);warn("portal do cliente");store.clientePortalAcessos=[];store.clientePortalObras=[];store.clientePortalAtualizacoes=[];store.clientePortalFicheiros=[];store.clientePortalAprovacoes=[]}
  }
}
