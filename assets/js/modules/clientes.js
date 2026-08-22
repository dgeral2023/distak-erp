import {store} from "../core/store.js";
import {$,esc,toast,money,friendlyError} from "../core/ui.js";
import {save,remove,db} from "../core/supabase.js";
import {findDuplicateClient,normalizeEmail,normalizeNif,normalizePostalCode,validateClientData} from "../core/data-quality.js";

let crmClienteId=null;
let crmData={};
let refreshClientes=async()=>{},clientUiReady=false;
let clienteForm,clienteDialog,clienteId,clienteNome,clienteNif,clienteMorada,clienteEmail,clienteTelefone,clienteTipo,clienteEstado,clienteTelefoneAlternativo,clienteWebsite,clienteCae,clienteCodigoPostal,clienteLocalidade,clientePais,clienteCondicoesPagamento,clienteLimiteCredito,clienteObservacoes,clienteDialogTitle,clienteCommercialDetails;
const CLIENT_DOCUMENT_BUCKET="distak-documentos";
const safeFileName=name=>name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"-");
const fileSize=value=>Number(value||0)<1048576?`${(Number(value||0)/1024).toFixed(1)} KB`:`${(Number(value||0)/1048576).toFixed(1)} MB`;

export function renderClientes(rows=store.clientes){
  const query=$("clienteSearch")?.value.trim().toLowerCase()||"",state=$("clienteEstadoFiltro")?.value||"";
  const filtered=(rows||[]).filter(client=>(!state||(client.estado||"Ativo")===state)&&(!query||[client.nome,client.nif,client.email,client.telefone,client.localidade].some(value=>String(value||"").toLowerCase().includes(query))));
  if($("clienteResultCount"))$("clienteResultCount").textContent=`${filtered.length} ${filtered.length===1?"cliente":"clientes"}`;
  $("clientesTable").innerHTML=filtered.length?`<div class="table-scroll client-table-scroll"><table class="client-table"><caption class="sr-only">Lista de clientes</caption><thead><tr><th>Nome</th><th>NIF</th><th>Email</th><th>Telefone</th><th>Tipo</th><th>Estado</th><th>Ações</th></tr></thead><tbody>${filtered.map(c=>{const name=esc(c.nome),inactive=(c.estado||"Ativo")==="Inativo";return `<tr class="${inactive?"is-inactive":""}"><td data-label="Nome"><button class="crm-client-link" type="button" data-view-cliente="${c.id}">${name}</button></td><td data-label="NIF">${esc(c.nif||"—")}</td><td data-label="Email">${esc(c.email||"—")}</td><td data-label="Telefone">${esc(c.telefone||"—")}</td><td data-label="Tipo">${esc(c.tipo||"—")}</td><td data-label="Estado"><span class="badge client-state-${String(c.estado||"Ativo").toLowerCase()}">${esc(c.estado||"Ativo")}</span></td><td data-label="Ações"><div class="row-actions"><button class="btn small primary" type="button" data-view-cliente="${c.id}" aria-label="Abrir ficha de ${name}">Ficha</button><button class="btn small light" type="button" data-edit-cliente="${c.id}" aria-label="Editar ${name}">Editar</button>${inactive?`<button class="btn small danger" type="button" data-del-cliente="${c.id}" aria-label="Apagar definitivamente ${name}">Apagar definitivamente</button>`:`<button class="btn small light" type="button" data-deactivate-cliente="${c.id}" aria-label="Desativar ${name}">Desativar</button>`}</div></td></tr>`}).join("")}</tbody></table></div>`:`<div class="client-empty"><strong>${query||state?"Nenhum cliente corresponde aos filtros.":"Ainda não existem clientes."}</strong><p>${query||state?"Altere ou limpe os filtros para voltar a ver a lista.":"Registe o primeiro cliente para depois criar obras e orçamentos associados."}</p>${query||state?`<button class="btn light" type="button" data-clear-client-filters>Limpar filtros</button>`:`<button class="btn primary" type="button" data-new-cliente>Novo cliente</button>`}</div>`;
}

async function ensureClientDialog(){
  if(clientUiReady)return true;
  try{
    const response=await fetch("assets/fragments/cliente-dialog.html");
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    $("clienteDialogHost").innerHTML=await response.text();
    [clienteForm,clienteDialog,clienteId,clienteNome,clienteNif,clienteMorada,clienteEmail,clienteTelefone,clienteTipo,clienteEstado,clienteTelefoneAlternativo,clienteWebsite,clienteCae,clienteCodigoPostal,clienteLocalidade,clientePais,clienteCondicoesPagamento,clienteLimiteCredito,clienteObservacoes,clienteDialogTitle,clienteCommercialDetails]=["clienteForm","clienteDialog","clienteId","clienteNome","clienteNif","clienteMorada","clienteEmail","clienteTelefone","clienteTipo","clienteEstado","clienteTelefoneAlternativo","clienteWebsite","clienteCae","clienteCodigoPostal","clienteLocalidade","clientePais","clienteCondicoesPagamento","clienteLimiteCredito","clienteObservacoes","clienteDialogTitle","clienteCommercialDetails"].map($);
    $("clienteForm").onsubmit=e=>submitCliente(e,refreshClientes);
    document.querySelectorAll("#clienteDialog [data-close]").forEach(button=>button.onclick=()=>$(button.dataset.close).close());
    $("clienteTipo").onchange=()=>{if($("clienteTipo").value!=="Particular")$("clienteCommercialDetails").open=true};
    $("clienteNif").oninput=()=>{$("clienteNif").value=normalizeNif($("clienteNif").value);$("clienteNif").removeAttribute("aria-invalid");$("clienteNif").setCustomValidity("")};
    $("clienteCodigoPostal").onblur=()=>{$("clienteCodigoPostal").value=normalizePostalCode($("clienteCodigoPostal").value)};
    clientUiReady=true;
    return true;
  }catch(err){toast("Não foi possível abrir o formulário de cliente. Atualize a página e tente novamente.","error");console.error("Formulário de cliente indisponível:",err);return false}
}

export async function openCliente(c={}){
  if(!await ensureClientDialog())return;
  clienteForm.reset();
  clearClientErrors();
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
  clienteDialogTitle.textContent=c.id?"Editar cliente":"Novo cliente";
  clienteCommercialDetails.open=c.tipo==="Empresa"||c.tipo==="Condomínio"||[c.website,c.cae,c.condicoes_pagamento,c.limite_credito,c.observacoes].some(Boolean);
  clienteDialog.showModal();
  clienteNome.focus();
}

const clientFieldIds={nome:"clienteNome",nif:"clienteNif",email:"clienteEmail",telefone:"clienteTelefone",telefone_alternativo:"clienteTelefoneAlternativo",codigo_postal:"clienteCodigoPostal",limite_credito:"clienteLimiteCredito"};
function clearClientErrors(){
  if($("clienteFormStatus"))$("clienteFormStatus").textContent="";
  Object.values(clientFieldIds).forEach(id=>{const field=$(id);field?.removeAttribute("aria-invalid");field?.setCustomValidity("")});
}
function showClientErrors(errors){
  clearClientErrors();
  const entries=Object.entries(errors);
  entries.forEach(([key,message])=>{const field=$(clientFieldIds[key]);field?.setAttribute("aria-invalid","true");field?.setCustomValidity(message)});
  if(entries.length){
    $("clienteFormStatus").textContent=entries[0][1];
    $(clientFieldIds[entries[0][0]])?.focus();
    $(clientFieldIds[entries[0][0]])?.reportValidity();
  }
  return !entries.length;
}

export function initClientes(refresh){
  refreshClientes=refresh||refreshClientes;
  $("clienteSearch").oninput=()=>renderClientes();
  $("clienteEstadoFiltro").onchange=()=>renderClientes();
  $("clienteLimparFiltros").onclick=()=>{$("clienteSearch").value="";$("clienteEstadoFiltro").value="";renderClientes()};
}

export async function submitCliente(e,refresh){
  e.preventDefault();
  const button=$("clienteGuardarBtn");
  clearClientErrors();
  try{
    const nif=normalizeNif(clienteNif.value);
    const email=normalizeEmail(clienteEmail.value);
    const candidate={nome:clienteNome.value,nif,email,telefone:clienteTelefone.value,telefone_alternativo:clienteTelefoneAlternativo.value,codigo_postal:normalizePostalCode(clienteCodigoPostal.value),pais:clientePais.value,limite_credito:clienteLimiteCredito.value};
    if(!showClientErrors(validateClientData(candidate)))return;
    if(!clienteForm.checkValidity()){clienteForm.reportValidity();return}
    const duplicate=findDuplicateClient(store.clientes,{nif,email},clienteId.value||null);
    if(duplicate){
      const key=nif&&normalizeNif(duplicate.nif)===nif?"nif":"email";
      if(key==="nif")showClientErrors({nif:`Já existe um cliente com este NIF: ${duplicate.nome}.`});
      else{$("clienteEmail").setAttribute("aria-invalid","true");$("clienteEmail").setCustomValidity(`Já existe um cliente com este e-mail: ${duplicate.nome}.`);$("clienteFormStatus").textContent=$("clienteEmail").validationMessage;$("clienteEmail").focus();$("clienteEmail").reportValidity()}
      return;
    }
    button.disabled=true;button.textContent="A guardar…";
    await save("clientes",{
      nome:clienteNome.value.trim(),
      nif:nif||null,
      morada:clienteMorada.value||null,
      email:email||null,
      telefone:clienteTelefone.value.trim()||null,
      tipo:clienteTipo.value,
      estado:clienteEstado.value,
      telefone_alternativo:clienteTelefoneAlternativo.value.trim()||null,
      website:clienteWebsite.value||null,
      cae:clienteCae.value||null,
      codigo_postal:candidate.codigo_postal||null,
      localidade:clienteLocalidade.value||null,
      pais:clientePais.value||"Portugal",
      condicoes_pagamento:clienteCondicoesPagamento.value||null,
      limite_credito:Number(clienteLimiteCredito.value||0),
      observacoes:clienteObservacoes.value||null
    },clienteId.value||null);
    clienteDialog.close();toast("Cliente guardado. Já pode associar obras, orçamentos e contactos.");await refresh();
  }catch(err){$("clienteFormStatus").textContent=err.code==="23505"?"Já existe um cliente com este NIF.":err.message||"Não foi possível guardar o cliente.";toast($("clienteFormStatus").textContent,"error")}
  finally{button.disabled=false;button.textContent="Guardar cliente"}
}

export async function deactivateCliente(id,refresh){
  const client=store.clientes.find(item=>String(item.id)===String(id));
  if(!client||!confirm(`Desativar ${client.nome}? O cliente continuará guardado e poderá ser reativado através de Editar.`))return;
  try{await save("clientes",{estado:"Inativo"},id);toast("Cliente desativado e preservado no histórico.");await refresh()}
  catch(err){toast(friendlyError(err,"Não foi possível desativar o cliente."),"error")}
}

export async function deleteCliente(id,refresh){
  const client=store.clientes.find(item=>String(item.id)===String(id));
  if(client?.estado!=="Inativo")return toast("Desative primeiro o cliente antes de o apagar definitivamente.","error");
  if(!confirm(`Apagar definitivamente ${client?.nome||"este cliente"}? Esta ação não pode ser anulada.`))return;
  try{await remove("clientes",id);toast("Cliente apagado definitivamente.");await refresh()}
  catch(err){toast(friendlyError(err,"Não foi possível apagar o cliente."),"error")}
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
  store.clienteMoradas=[...store.clienteMoradas.filter(row=>String(row.cliente_id)!==String(id)),...moradas];
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
  $("crmDocumentosLista").innerHTML=documentos.length?documentos.map(d=>`<article class="crm-list-card"><div><strong>${esc(d.nome)}</strong><p>${esc(d.categoria)} · ${esc(fileSize(d.tamanho_bytes))} · ${new Date(d.criado_em).toLocaleDateString("pt-PT")}</p></div><div class="crm-document-actions"><button class="btn small primary" data-crm-document-open="${d.id}">Abrir</button><button class="btn small danger" data-crm-document-delete="${d.id}">Apagar</button></div></article>`).join(""):empty("Sem documentos.");
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

async function addDocument(event){
  event.preventDefault();
  if(!crmClienteId)return;
  const file=$("crmDocumentoFicheiro").files?.[0];
  if(!file)return;
  if(file.size>25*1048576)return toast("O ficheiro excede 25 MB.","error");
  const button=$("crmDocumentoSubmit");button.disabled=true;
  const path=`clientes/${crmClienteId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  try{
    const {data:{user}}=await db.auth.getUser();
    const {error:uploadError}=await db.storage.from(CLIENT_DOCUMENT_BUCKET).upload(path,file,{contentType:file.type||undefined});
    if(uploadError)throw uploadError;
    const {error}=await db.from("cliente_documentos").insert({cliente_id:crmClienteId,nome:$("crmDocumentoNome").value.trim(),categoria:$("crmDocumentoCategoria").value,storage_path:path,mime_type:file.type||null,tamanho_bytes:file.size,inserido_por:user?.id||null});
    if(error){await db.storage.from(CLIENT_DOCUMENT_BUCKET).remove([path]);throw error}
    event.currentTarget.reset();toast("Documento do cliente carregado.");await loadCrm(crmClienteId);
  }catch(err){toast(err.message,"error")}finally{button.disabled=false}
}

async function openClientDocument(id){
  const documentRow=crmData.documentos?.find(d=>String(d.id)===String(id));if(!documentRow)return;
  const {data,error}=await db.storage.from(CLIENT_DOCUMENT_BUCKET).createSignedUrl(documentRow.storage_path,60);
  if(error)return toast(error.message,"error");
  const link=document.createElement("a");link.href=data.signedUrl;link.target="_blank";link.rel="noopener";link.click();
}

async function deleteClientDocument(id){
  const documentRow=crmData.documentos?.find(d=>String(d.id)===String(id));
  if(!documentRow||!confirm(`Apagar o documento "${documentRow.nome}"?`))return;
  try{
    const {error:storageError}=await db.storage.from(CLIENT_DOCUMENT_BUCKET).remove([documentRow.storage_path]);if(storageError)throw storageError;
    const {error}=await db.from("cliente_documentos").delete().eq("id",id);if(error)throw error;
    toast("Documento apagado.");await loadCrm(crmClienteId);
  }catch(err){toast(err.message,"error")}
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
  const openDocument=e.target.closest("[data-crm-document-open]")?.dataset.crmDocumentOpen;
  if(openDocument)openClientDocument(openDocument);
  const deleteDocument=e.target.closest("[data-crm-document-delete]")?.dataset.crmDocumentDelete;
  if(deleteDocument)deleteClientDocument(deleteDocument);
});

document.addEventListener("DOMContentLoaded",()=>{
  $("crmContactoForm")?.addEventListener("submit",addContact);
  $("crmMoradaForm")?.addEventListener("submit",addMorada);
  $("crmNotaForm")?.addEventListener("submit",addNota);
  $("crmComunicacaoForm")?.addEventListener("submit",addComunicacao);
  $("crmDocumentoForm")?.addEventListener("submit",addDocument);
});
