import {store} from "../core/store.js";
import {$,esc,toast,money} from "../core/ui.js";
import {save,remove,db} from "../core/supabase.js";

let crmClienteId=null;
let crmData={};

export function renderClientes(rows=store.clientes){
  $("clientesTable").innerHTML=rows.length?`<table><thead><tr><th>Nome</th><th>NIF</th><th>Email</th><th>Telefone</th><th>Tipo</th><th>Estado</th><th>Ações</th></tr></thead><tbody>${rows.map(c=>`<tr><td><button class="crm-client-link" data-view-cliente="${c.id}">${esc(c.nome)}</button></td><td>${esc(c.nif||"")}</td><td>${esc(c.email||"")}</td><td>${esc(c.telefone||"")}</td><td>${esc(c.tipo||"")}</td><td><span class="badge">${esc(c.estado||"Ativo")}</span></td><td><button class="btn small primary" data-view-cliente="${c.id}">Ficha</button> <button class="btn small light" data-edit-cliente="${c.id}">Editar</button> <button class="btn small danger" data-del-cliente="${c.id}">Apagar</button></td></tr>`).join("")}</tbody></table>`:"<p>Sem clientes.</p>";
}

export function openCliente(c={}){
  clienteId.value=c.id||"";
  clienteNome.value=c.nome||"";
  clienteNif.value=c.nif||"";
  clienteMorada.value=c.morada||"";
  clienteEmail.value=c.email||"";
  clienteTelefone.value=c.telefone||"";
  clienteTipo.value=c.tipo||"Particular";
  clienteEstado.value=c.estado||"Ativo";
  clienteTelefoneAlternativo.value=c.telefone_alternativo||"";
  clienteWebsite.value=c.website||"";
  clienteCae.value=c.cae||"";
  clienteCodigoPostal.value=c.codigo_postal||"";
  clienteLocalidade.value=c.localidade||"";
  clientePais.value=c.pais||"Portugal";
  clienteCondicoesPagamento.value=c.condicoes_pagamento||"";
  clienteLimiteCredito.value=c.limite_credito||0;
  clienteObservacoes.value=c.observacoes||"";
  clienteDialog.showModal();
}

export async function submitCliente(e,refresh){
  e.preventDefault();
  try{
    await save("clientes",{
      nome:clienteNome.value.trim(),
      nif:clienteNif.value||null,
      morada:clienteMorada.value||null,
      email:clienteEmail.value||null,
      telefone:clienteTelefone.value||null,
      tipo:clienteTipo.value,
      estado:clienteEstado.value,
      telefone_alternativo:clienteTelefoneAlternativo.value||null,
      website:clienteWebsite.value||null,
      cae:clienteCae.value||null,
      codigo_postal:clienteCodigoPostal.value||null,
      localidade:clienteLocalidade.value||null,
      pais:clientePais.value||"Portugal",
      condicoes_pagamento:clienteCondicoesPagamento.value||null,
      limite_credito:Number(clienteLimiteCredito.value||0),
      observacoes:clienteObservacoes.value||null
    },clienteId.value||null);
    clienteDialog.close();toast("Cliente guardado.");await refresh();
  }catch(err){toast(err.message,"error")}
}

export async function deleteCliente(id,refresh){
  if(!confirm("Confirmar eliminação?"))return;
  try{await remove("clientes",id);toast("Cliente apagado.");await refresh()}
  catch(err){toast(err.message,"error")}
}

async function selectRows(table,foreignKey,id,select="*"){
  const {data,error}=await db.from(table).select(select).eq(foreignKey,id).order("criado_em",{ascending:false});
  if(error)throw error;
  return data||[];
}

async function loadCrm(id){
  crmClienteId=id;
  const cliente=store.clientes.find(c=>String(c.id)===String(id));
  if(!cliente)throw new Error("Cliente não encontrado.");

  const [
    resumoResult,contactos,moradas,notas,comunicacoes,documentos,
    obrasResult
  ]=await Promise.all([
    db.from("v_clientes_crm_resumo").select("*").eq("id",id).single(),
    selectRows("cliente_contactos","cliente_id",id),
    selectRows("cliente_moradas","cliente_id",id),
    selectRows("cliente_notas","cliente_id",id),
    selectRows("cliente_comunicacoes","cliente_id",id),
    selectRows("cliente_documentos","cliente_id",id),
    db.from("obras").select("*").eq("cliente_id",id).order("id",{ascending:false})
  ]);

  if(resumoResult.error)throw resumoResult.error;
  if(obrasResult.error)throw obrasResult.error;

  const obras=obrasResult.data||[];
  const obraIds=obras.map(o=>o.id);
  let orcamentos=[],pagamentos=[];
  if(obraIds.length){
    const [o,p]=await Promise.all([
      db.from("orcamentos").select("*").in("obra_id",obraIds).order("id",{ascending:false}),
      db.from("pagamentos").select("*").in("obra_id",obraIds).order("id",{ascending:false})
    ]);
    if(o.error)throw o.error;if(p.error)throw p.error;
    orcamentos=o.data||[];pagamentos=p.data||[];
  }

  crmData={cliente,resumo:resumoResult.data,contactos,moradas,notas,comunicacoes,documentos,obras,orcamentos,pagamentos};
  renderCrm();
}

function renderCrm(){
  const {cliente,resumo,contactos,moradas,notas,comunicacoes,documentos,obras,orcamentos,pagamentos}=crmData;
  crmClienteNome.textContent=cliente.nome;
  crmClienteMeta.textContent=[cliente.tipo,cliente.nif,cliente.estado].filter(Boolean).join(" · ");
  crmTotalObras.textContent=resumo.total_obras||0;
  crmTotalOrcamentos.textContent=resumo.total_orcamentos||0;
  crmTotalRecebido.textContent=money(resumo.total_recebido||0);
  crmTotalContactos.textContent=resumo.total_contactos||0;
  crmTotalDocumentos.textContent=resumo.total_documentos||0;
  crmUltimaComunicacao.textContent=resumo.ultima_comunicacao?new Date(resumo.ultima_comunicacao).toLocaleDateString("pt-PT"):"—";

  $("crm-tab-dados").innerHTML=`<div class="crm-data-grid">
    ${field("Nome",cliente.nome)}${field("Tipo",cliente.tipo)}${field("Estado",cliente.estado)}
    ${field("NIF",cliente.nif)}${field("CAE",cliente.cae)}${field("Email",cliente.email)}
    ${field("Telefone",cliente.telefone)}${field("Telefone alternativo",cliente.telefone_alternativo)}
    ${field("Website",cliente.website)}${field("Morada",cliente.morada)}
    ${field("Código postal",cliente.codigo_postal)}${field("Localidade",cliente.localidade)}
    ${field("País",cliente.pais)}${field("Condições de pagamento",cliente.condicoes_pagamento)}
    ${field("Limite de crédito",money(cliente.limite_credito||0))}
    <article class="crm-field full"><span>Observações</span><strong>${esc(cliente.observacoes||"—")}</strong></article>
  </div>`;

  $("crmContactosLista").innerHTML=contactos.length?cards(contactos,c=>`${esc(c.nome)}${c.principal?' <span class="badge">Principal</span>':''}`,`${esc(c.cargo||"")} · ${esc(c.telefone||"")} · ${esc(c.email||"")}`,"contacto",c.id):empty("Sem contactos adicionais.");
  $("crmMoradasLista").innerHTML=moradas.length?cards(moradas,m=>`${esc(m.tipo)}${m.principal?' <span class="badge">Principal</span>':''}`,`${esc(m.morada)} · ${esc(m.codigo_postal||"")} ${esc(m.localidade||"")}`,"morada",m.id):empty("Sem moradas adicionais.");
  $("crmObrasLista").innerHTML=obras.length?simpleTable(["Obra","Estado","Valor","Progresso"],obras.map(o=>[o.nome,o.estado,money(o.valor_contratado||0),`${o.progresso||0}%`])):empty("Sem obras.");
  $("crmOrcamentosLista").innerHTML=orcamentos.length?simpleTable(["Número","Descrição","Estado"],orcamentos.map(o=>[o.numero,o.descricao,o.estado])):empty("Sem orçamentos.");
  $("crmPagamentosLista").innerHTML=pagamentos.length?simpleTable(["Descrição","Valor","Estado"],pagamentos.map(p=>[p.descricao,money(p.valor),p.estado])):empty("Sem pagamentos.");
  $("crmNotasLista").innerHTML=notas.length?cards(notas,n=>`${n.importante?'<span class="badge crm-important">Importante</span> ':''}${new Date(n.criado_em).toLocaleDateString("pt-PT")}`,esc(n.nota),"nota",n.id):empty("Sem notas.");
  $("crmComunicacoesLista").innerHTML=comunicacoes.length?cards(comunicacoes,c=>`${esc(c.tipo)} · ${new Date(c.data_comunicacao).toLocaleString("pt-PT")}`,`${esc(c.assunto||"")} — ${esc(c.descricao)}`,"comunicacao",c.id):empty("Sem comunicações.");
  $("crmDocumentosLista").innerHTML=documentos.length?cards(documentos,d=>esc(d.nome),`${esc(d.categoria)} · ${esc(d.mime_type||"")}`,"documento",d.id,false):empty("Sem documentos.");
}

const field=(label,value)=>`<article class="crm-field"><span>${label}</span><strong>${esc(value||"—")}</strong></article>`;
const empty=text=>`<div class="crm-empty">${text}</div>`;
const cards=(rows,title,subtitle,type,id,allowDelete=true)=>rows.map(r=>`<article class="crm-list-card"><div><strong>${title(r)}</strong><p>${subtitle(r)}</p></div>${allowDelete?`<button class="btn small danger" data-crm-delete="${type}:${id(r)}">Apagar</button>`:""}</article>`).join("");
const simpleTable=(headers,rows)=>`<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v||"")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

async function addContact(e){
  e.preventDefault();
  const form=e.currentTarget;
  const button=form.querySelector("button[type=submit]");
  if(button)button.disabled=true;
  try{
    await save("cliente_contactos",{
      cliente_id:crmClienteId,nome:crmContactoNome.value.trim(),
      cargo:crmContactoCargo.value||null,telefone:crmContactoTelefone.value||null,
      email:crmContactoEmail.value||null,principal:crmContactoPrincipal.checked
    },crmContactoId.value||null);
    form.reset();crmContactoId.value="";toast("Contacto guardado.");await loadCrm(crmClienteId);
  }catch(err){toast(err.message,"error")}
  finally{if(button?.isConnected)button.disabled=false}
}

async function addMorada(e){
  e.preventDefault();
  const form=e.currentTarget;
  const button=form.querySelector("button[type=submit]");
  if(button)button.disabled=true;
  try{
    await save("cliente_moradas",{
      cliente_id:crmClienteId,tipo:crmMoradaTipo.value,morada:crmMoradaTexto.value.trim(),
      codigo_postal:crmMoradaCodigoPostal.value||null,localidade:crmMoradaLocalidade.value||null,
      pais:"Portugal",principal:crmMoradaPrincipal.checked
    },crmMoradaId.value||null);
    form.reset();crmMoradaId.value="";toast("Morada guardada.");await loadCrm(crmClienteId);
  }catch(err){toast(err.message,"error")}
  finally{if(button?.isConnected)button.disabled=false}
}

async function addNota(e){
  e.preventDefault();
  const form=e.currentTarget;
  const button=form.querySelector("button[type=submit]");
  if(button)button.disabled=true;
  try{
    const {data:{user}}=await db.auth.getUser();
    await save("cliente_notas",{cliente_id:crmClienteId,autor_id:user?.id||null,nota:crmNotaTexto.value.trim(),importante:crmNotaImportante.checked});
    form.reset();toast("Nota adicionada.");await loadCrm(crmClienteId);
  }catch(err){toast(err.message,"error")}
  finally{if(button?.isConnected)button.disabled=false}
}

async function addComunicacao(e){
  e.preventDefault();
  const form=e.currentTarget;
  const button=form.querySelector("button[type=submit]");
  if(button)button.disabled=true;
  try{
    const {data:{user}}=await db.auth.getUser();
    await save("cliente_comunicacoes",{
      cliente_id:crmClienteId,autor_id:user?.id||null,tipo:crmComunicacaoTipo.value,
      assunto:crmComunicacaoAssunto.value||null,descricao:crmComunicacaoDescricao.value.trim(),
      data_comunicacao:crmComunicacaoData.value?new Date(crmComunicacaoData.value).toISOString():new Date().toISOString()
    });
    form.reset();toast("Comunicação registada.");await loadCrm(crmClienteId);
  }catch(err){toast(err.message,"error")}
  finally{if(button?.isConnected)button.disabled=false}
}

async function deleteCrmRecord(value){
  const [type,id]=value.split(":");
  const tables={contacto:"cliente_contactos",morada:"cliente_moradas",nota:"cliente_notas",comunicacao:"cliente_comunicacoes"};
  if(!tables[type]||!confirm("Confirmar eliminação?"))return;
  try{await remove(tables[type],id);toast("Registo apagado.");await loadCrm(crmClienteId)}
  catch(err){toast(err.message,"error")}
}

document.addEventListener("click",async e=>{
  const view=e.target.closest("[data-view-cliente]")?.dataset.viewCliente;
  if(view){
    try{await loadCrm(view);clienteCrmDialog.showModal()}
    catch(err){toast(err.message,"error")}
    return;
  }

  const tab=e.target.closest("[data-crm-tab]")?.dataset.crmTab;
  if(tab){
    document.querySelectorAll("[data-crm-tab]").forEach(b=>b.classList.toggle("active",b.dataset.crmTab===tab));
    document.querySelectorAll(".crm-tab-panel").forEach(p=>p.classList.add("hidden"));
    $(`crm-tab-${tab}`).classList.remove("hidden");
  }

  const del=e.target.closest("[data-crm-delete]")?.dataset.crmDelete;
  if(del)deleteCrmRecord(del);
});

document.addEventListener("DOMContentLoaded",()=>{
  $("crmContactoForm")?.addEventListener("submit",addContact);
  $("crmMoradaForm")?.addEventListener("submit",addMorada);
  $("crmNotaForm")?.addEventListener("submit",addNota);
  $("crmComunicacaoForm")?.addEventListener("submit",addComunicacao);
});
