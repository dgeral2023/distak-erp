import {store} from "../core/store.js";
import {$,esc,money,toast} from "../core/ui.js";
import {db,save,remove} from "../core/supabase.js";
import {renderObraFotografias} from "./fotografias.js";
import {renderObraDocumentos} from "./documentos.js";
import {renderObraDiario} from "./diario.js";

let obraFichaAtual=null;

export function fillObraSelects(){
  const c=store.clientes.map(x=>`<option value="${x.id}">${esc(x.nome)}</option>`).join("");
  obraClienteId.innerHTML='<option value="">Selecionar</option>'+c;
}

export function renderObras(rows=store.obras){
  const admin=store.profile?.role==="admin";
  $("obrasTable").innerHTML=rows.length?`<table><thead><tr>
    <th>Obra</th><th>Cliente</th><th>Estado</th>${admin?"<th>Valor</th><th>Custos</th><th>Recebido</th>":""}<th>Progresso</th><th>Ações</th>
  </tr></thead><tbody>${rows.map(o=>{
    const custos=totalCustos(o.id),recebido=totalRecebido(o.id);
    return `<tr>
      <td><button class="obra-link" data-view-obra="${o.id}">${esc(o.nome)}</button></td>
      <td>${esc(o.clientes?.nome||"")}</td>
      <td><span class="badge">${esc(o.estado||"")}</span></td>
      ${admin?`<td>${money(valorContratado(o))}</td><td>${money(custos)}</td><td>${money(recebido)}</td>`:""}
      <td><div class="progress-line"><span style="width:${Math.min(100,Math.max(0,Number(o.progresso||0)))}%"></span></div><small>${o.progresso||0}%</small></td>
      <td><button class="btn small primary" data-view-obra="${o.id}">Ficha</button>${admin?` <button class="btn small light" data-edit-obra="${o.id}">Editar</button> <button class="btn small danger" data-del-obra="${o.id}">Apagar</button>`:""}</td>
    </tr>`;
  }).join("")}</tbody></table>`:"<p>Sem obras.</p>";
}

export function openObra(o={}){
  fillObraSelects();
  obraId.value=o.id||"";
  obraClienteId.value=o.cliente_id||"";
  obraNome.value=o.nome||"";
  obraMorada.value=o.morada||"";
  obraEstado.value=o.estado||"Orçamento";
  obraValor.value=valorContratado(o)||"";
  obraProgresso.value=o.progresso||0;
  obraPrazo.value=o.prazo||"";
  obraResponsavel.value=o.responsavel||"";
  obraNotas.value=o.notas||"";
  obraDialog.showModal();
}

export async function submitObra(e,refresh){
  e.preventDefault();
  try{
    const valor=Number(obraValor.value||0);
    await save("obras",{
      cliente_id:obraClienteId.value,
      nome:obraNome.value.trim(),
      morada:obraMorada.value||null,
      estado:obraEstado.value,
      valor,
      valor_contratado:valor,
      progresso:Number(obraProgresso.value||0),
      prazo:obraPrazo.value||null,
      responsavel:obraResponsavel.value||null,
      notas:obraNotas.value||null
    },obraId.value||null);
    obraDialog.close();toast("Obra guardada.");await refresh();
  }catch(err){toast(err.message,"error")}
}

export async function deleteObra(id,refresh){
  if(!confirm("Confirmar eliminação?"))return;
  try{await remove("obras",id);toast("Obra apagada.");await refresh()}
  catch(err){toast(err.message,"error")}
}

export function openObraFicha(id){
  const obra=store.obras.find(x=>String(x.id)===String(id));
  if(!obra){toast("Obra não encontrada.","error");return}
  obraFichaAtual=obra;
  renderObraFicha(obra);
  obraFichaDialog.showModal();
}

function renderObraFicha(obra){
  const cliente=obra.clientes||{};
  const orcamentos=store.orcamentos.filter(x=>String(x.obra_id)===String(obra.id));
  const custos=store.custos.filter(x=>String(x.obra_id)===String(obra.id));
  const pagamentos=store.pagamentos.filter(x=>String(x.obra_id)===String(obra.id));

  const contratado=valorContratado(obra);
  const totalOrc=orcamentos.reduce((s,o)=>s+orcamentoTotal(o),0);
  const totalC=custos.reduce((s,c)=>s+Number(c.valor||c.valor_sem_iva||0),0);
  const totalP=pagamentos.reduce((s,p)=>s+Number(p.valor||0),0);
  const baseReceita=contratado||totalOrc;
  const porReceber=Math.max(0,baseReceita-totalP);
  const lucro=baseReceita-totalC;
  const margem=baseReceita>0?(lucro/baseReceita)*100:0;

  obraFichaNome.textContent=obra.nome;
  obraFichaMeta.textContent=[cliente.nome,obra.morada,obra.estado].filter(Boolean).join(" · ");
  obraFichaContratado.textContent=money(contratado);
  obraFichaOrcamento.textContent=money(totalOrc);
  obraFichaCustos.textContent=money(totalC);
  obraFichaRecebido.textContent=money(totalP);
  obraFichaPorReceber.textContent=money(porReceber);
  obraFichaLucro.textContent=money(lucro);
  obraFichaMargem.textContent=`${margem.toFixed(1)}%`;
  obraFichaProgresso.textContent=`${obra.progresso||0}%`;
  const mobileTitle=$("mobileWorkTitle");
  const mobileState=$("mobileWorkState");
  const mobileSync=$("mobileWorkSync");
  if(mobileTitle)mobileTitle.textContent=obra.nome||"Ações rápidas";
  if(mobileState)mobileState.textContent=obra.estado||"Em execução";
  if(mobileSync)mobileSync.textContent=`Atualizado ${new Date().toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"})}`;

  $("obra-tab-resumo").innerHTML=`<div class="obra-resumo-grid">
    ${field("Cliente",cliente.nome)}
    ${field("NIF do cliente",cliente.nif)}
    ${field("Contacto",cliente.telefone||cliente.email)}
    ${field("Morada da obra",obra.morada)}
    ${field("Estado",obra.estado)}
    ${field("Prazo",obra.prazo)}
    ${field("Responsável",obra.responsavel)}
    ${field("Data de criação",formatDate(obra.criado_em||obra.created_at))}
    <article class="obra-field full"><span>Notas</span><strong>${esc(obra.notas||"—")}</strong></article>
  </div>`;

  $("obra-tab-orcamentos").innerHTML=orcamentos.length?`<table><thead><tr><th>Número</th><th>Mão de obra</th><th>Materiais</th><th>Logística</th><th>IVA</th><th>Total base</th></tr></thead><tbody>${orcamentos.map(o=>`<tr><td>${esc(o.numero||"")}</td><td>${money(o.mao_obra)}</td><td>${money(o.materiais)}</td><td>${money(o.logistica)}</td><td>${Number(o.iva||0)}%</td><td>${money(orcamentoTotal(o))}</td></tr>`).join("")}</tbody></table>`:empty("Nenhum orçamento associado a esta obra.");

  $("obra-tab-custos").innerHTML=custos.length?`<table><thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Data</th></tr></thead><tbody>${custos.map(c=>`<tr><td>${esc(c.descricao||"")}</td><td>${esc(c.tipo||c.categoria||"")}</td><td>${money(c.valor||c.valor_sem_iva)}</td><td>${formatDate(c.data)}</td></tr>`).join("")}</tbody></table>`:empty("Nenhum custo associado a esta obra.");

  $("obra-tab-pagamentos").innerHTML=pagamentos.length?`<table><thead><tr><th>Valor</th><th>Data</th><th>Método</th><th>Observações</th></tr></thead><tbody>${pagamentos.map(p=>`<tr><td>${money(p.valor)}</td><td>${formatDate(p.data)}</td><td>${esc(p.metodo||"")}</td><td>${esc(p.observacoes||"")}</td></tr>`).join("")}</tbody></table>`:empty("Nenhum pagamento associado a esta obra.");

  renderObraFotografias(obra);
  renderObraDocumentos(obra);
  renderObraDiario(obra);
}

const field=(label,value)=>`<article class="obra-field"><span>${label}</span><strong>${esc(value||"—")}</strong></article>`;
const empty=text=>`<div class="obra-placeholder">${text}</div>`;
const formatDate=v=>v?new Date(v).toLocaleDateString("pt-PT"):"—";
const valorContratado=o=>Number(o.valor_contratado||o.valor||0);
const totalCustos=id=>store.custos.filter(x=>String(x.obra_id)===String(id)).reduce((s,x)=>s+Number(x.valor||x.valor_sem_iva||0),0);
const totalRecebido=id=>store.pagamentos.filter(x=>String(x.obra_id)===String(id)).reduce((s,x)=>s+Number(x.valor||0),0);
const orcamentoTotal=o=>{
  const componentes=Number(o.mao_obra||0)+Number(o.materiais||0)+Number(o.logistica||0);
  if(componentes)return componentes*(1+Number(o.iva||0)/100);
  if(Number(o.valor_sem_iva||0))return Number(o.valor_sem_iva)*(1+Number(o.iva||0)/100);
  return Number(o.total||0);
};



function activateObraTab(tab){
  document.querySelectorAll("[data-obra-tab]").forEach(b=>b.classList.toggle("active",b.dataset.obraTab===tab));
  document.querySelectorAll(".obra-tab-panel").forEach(p=>p.classList.add("hidden"));
  const panel=$(`obra-tab-${tab}`);
  if(panel)panel.classList.remove("hidden");
}

const operationalTables={
  team:{table:"obra_equipa_registos",name:"nome",detail:"funcao"},
  materials:{table:"obra_materiais",name:"material",detail:"quantidade"},
  hours:{table:"obra_horas",name:"funcionario_nome",detail:"horario"},
  occurrences:{table:"obra_ocorrencias",name:"tipo",detail:"descricao"}
};
const today=()=>new Date().toISOString().slice(0,10);
const formatWorkDate=value=>value?new Date(value).toLocaleString("pt-PT"):"—";

async function fetchWorkEntries(action){
  const config=operationalTables[action];
  if(!config)return [];
  const {data,error}=await db.from(config.table)
    .select("*")
    .eq("obra_id",obraFichaAtual.id)
    .order("criado_em",{ascending:false})
    .limit(50);
  if(error)throw error;
  return data||[];
}

async function renderWorkModule(action){
  if(!obraFichaAtual)return;
  activateObraTab("diario");
  const host=$("mobileWorkModule");
  const labels={checklist:["✅","Checklist diário","Verificações essenciais antes e no final do trabalho."],team:["👷","Equipa em obra","Registo rápido da equipa presente."],materials:["🧱","Materiais","Registe material utilizado ou em falta."],hours:["⏱️","Horas de trabalho","Guarde entrada, saída e observações."],reports:["📄","Relatórios","Acesso ao resumo e preparação do relatório da obra."],occurrences:["⚠️","Ocorrências","Registe problemas, atrasos ou situações de segurança."]};
  const [icon,title,desc]=labels[action]||["📌","Painel de obra","Registo operacional da obra."];
  const head=`<div class="work-module-head"><div><h3>${title}</h3><p>${desc}</p></div><span class="work-module-icon">${icon}</span></div>`;
  host.innerHTML=`<section class="work-module-card">${head}<p class="work-local-note">A carregar registos…</p></section>`;

  try{
    if(action==="checklist"){
      const items=["EPI verificado","Acesso seguro","Água disponível","Eletricidade disponível","Zona protegida","Cliente informado","Ferramentas verificadas","Limpeza final"];
      const {data,error}=await db.from("obra_checklists")
        .select("*")
        .eq("obra_id",obraFichaAtual.id)
        .eq("data",today())
        .maybeSingle();
      if(error)throw error;
      const record=data||null;
      const saved=record?.itens||{};
      host.innerHTML=`<section class="work-module-card">${head}<div class="daily-checklist">${items.map((x,i)=>`<label class="daily-check"><input type="checkbox" data-check-index="${i}" ${saved[i]?"checked":""}><span>${x}</span></label>`).join("")}</div><label>Observações<textarea data-check-observations rows="2">${esc(record?.observacoes||"")}</textarea></label><p class="work-local-note">Sincronizado com o Supabase para esta obra e data.</p></section>`;
      const persist=async()=>{
        const payload={obra_id:obraFichaAtual.id,data:today(),itens:saved,observacoes:host.querySelector("[data-check-observations]")?.value||null,atualizado_em:new Date().toISOString()};
        const {error:saveError}=await db.from("obra_checklists")
          .upsert(payload,{onConflict:"obra_id,data,criado_por"});
        if(saveError)throw saveError;
      };
      host.querySelectorAll("[data-check-index]").forEach(el=>el.addEventListener("change",async()=>{
        saved[el.dataset.checkIndex]=el.checked;
        try{await persist();toast("Checklist sincronizada.")}catch(err){toast(err.message,"error")}
      }));
      host.querySelector("[data-check-observations]")?.addEventListener("change",async()=>{
        try{await persist();toast("Observações sincronizadas.")}catch(err){toast(err.message,"error")}
      });
      return;
    }

    const fields={
      team:`<label>Nome do funcionário<input name="nome" required placeholder="Nome"></label><label>Função<input name="detalhe" placeholder="Ex.: Pintor, pedreiro"></label>`,
      materials:`<label>Material<input name="nome" required placeholder="Ex.: Primário"></label><label>Quantidade<input name="detalhe" placeholder="Ex.: 2 latas"></label>`,
      hours:`<label>Funcionário<input name="nome" required placeholder="Nome"></label><label>Horário<input name="detalhe" placeholder="Ex.: 08:30–17:30"></label>`,
      occurrences:`<label>Tipo<select name="nome"><option>Cliente</option><option>Material</option><option>Segurança</option><option>Tempo</option><option>Outro</option></select></label><label>Descrição<textarea name="detalhe" rows="4" required placeholder="Descreva a ocorrência"></textarea></label>`
    };
    if(action==="reports"){
      host.innerHTML=`<section class="work-module-card">${head}<div class="work-entry-list"><div class="work-entry"><strong>${esc(obraFichaAtual.nome)}</strong><small>Estado: ${esc(obraFichaAtual.estado||"—")} · Progresso: ${obraFichaAtual.progresso||0}%</small></div><div class="work-entry"><strong>Relatório fotográfico</strong><small>Abra Fotografias para consultar e organizar os registos.</small></div></div><div class="work-form-actions"><button class="btn primary" type="button" data-work-report-photos>Ver fotografias</button></div></section>`;
      host.querySelector("[data-work-report-photos]")?.addEventListener("click",()=>activateObraTab("fotografias"));
      return;
    }

    const entries=await fetchWorkEntries(action);
    const config=operationalTables[action];
    host.innerHTML=`<section class="work-module-card">${head}<form class="work-form" data-work-form="${action}">${fields[action]||""}<label>Observação opcional<textarea name="obs" rows="2"></textarea></label><div class="work-form-actions"><button class="btn primary" type="submit">Guardar e sincronizar</button></div></form><p class="work-local-note">Registos sincronizados com o Supabase.</p><div class="work-entry-list">${entries.map(e=>`<div class="work-entry"><strong>${esc(e[config.name]||title)}</strong><span>${esc(e[config.detail]||"")}${e.observacoes?` · ${esc(e.observacoes)}`:""}</span><small>${esc(formatWorkDate(e.criado_em))}</small></div>`).join("")}</div></section>`;
    host.querySelector("form")?.addEventListener("submit",async e=>{
      e.preventDefault();
      const button=e.currentTarget.querySelector("button[type=submit]");
      const fd=new FormData(e.currentTarget);
      const payload={obra_id:obraFichaAtual.id,observacoes:fd.get("obs")||null};
      payload[config.name]=fd.get("nome")||title;
      payload[config.detail]=fd.get("detalhe")||null;
      button.disabled=true;
      try{
        const {error}=await db.from(config.table).insert(payload);
        if(error)throw error;
        toast("Registo sincronizado.");
        await renderWorkModule(action);
      }catch(err){
        toast(err.message,"error");
        button.disabled=false;
      }
    });
  }catch(err){
    host.innerHTML=`<section class="work-module-card">${head}<p class="error">${esc(err.message)}</p><button class="btn light" type="button" data-work-retry>Voltar a tentar</button></section>`;
    host.querySelector("[data-work-retry]")?.addEventListener("click",()=>renderWorkModule(action));
  }
}

function handleWorkAction(action){
  if(action==="camera"||action==="gallery"){
    activateObraTab("fotografias");
    setTimeout(()=>{
      if(action==="camera")$("photoQuickCamera")?.click();
      else $("photoGallery")?.scrollIntoView({behavior:"smooth",block:"start"});
    },80);return;
  }
  if(action==="documents"){activateObraTab("documentos");return}
  const diarioFields={checklist:"diarioDescricao",team:"diarioEquipa",materials:"diarioMateriais",hours:"diarioHoras",reports:"diarioPesquisa",occurrences:"diarioOcorrencias"};
  if(diarioFields[action]){
    activateObraTab("diario");
    setTimeout(()=>$(diarioFields[action])?.focus(),80);
    return;
  }
  renderWorkModule(action);
}

document.addEventListener("click",e=>{
  const id=e.target.closest("[data-view-obra]")?.dataset.viewObra;
  if(id){openObraFicha(id);return}

  const action=e.target.closest("[data-work-action]")?.dataset.workAction;
  if(action){handleWorkAction(action);return}

  const tab=e.target.closest("[data-obra-tab]")?.dataset.obraTab;
  if(tab)activateObraTab(tab);
});

document.addEventListener("DOMContentLoaded",()=>{
  $("obraFichaEditar")?.addEventListener("click",()=>{
    if(!obraFichaAtual)return;
    obraFichaDialog.close();
    openObra(obraFichaAtual);
  });
});
