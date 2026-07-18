import {store} from "../core/store.js";
import {$,esc,money,toast} from "../core/ui.js";
import {save,remove} from "../core/supabase.js";
import {renderObraFotografias} from "./fotografias.js";

let obraFichaAtual=null;

export function fillObraSelects(){
  const c=store.clientes.map(x=>`<option value="${x.id}">${esc(x.nome)}</option>`).join("");
  obraClienteId.innerHTML='<option value="">Selecionar</option>'+c;
}

export function renderObras(rows=store.obras){
  $("obrasTable").innerHTML=rows.length?`<table><thead><tr>
    <th>Obra</th><th>Cliente</th><th>Estado</th><th>Valor</th><th>Custos</th><th>Recebido</th><th>Progresso</th><th>Ações</th>
  </tr></thead><tbody>${rows.map(o=>{
    const custos=totalCustos(o.id),recebido=totalRecebido(o.id);
    return `<tr>
      <td><button class="obra-link" data-view-obra="${o.id}">${esc(o.nome)}</button></td>
      <td>${esc(o.clientes?.nome||"")}</td>
      <td><span class="badge">${esc(o.estado||"")}</span></td>
      <td>${money(valorContratado(o))}</td>
      <td>${money(custos)}</td>
      <td>${money(recebido)}</td>
      <td><div class="progress-line"><span style="width:${Math.min(100,Math.max(0,Number(o.progresso||0)))}%"></span></div><small>${o.progresso||0}%</small></td>
      <td><button class="btn small primary" data-view-obra="${o.id}">Ficha</button> <button class="btn small light" data-edit-obra="${o.id}">Editar</button> <button class="btn small danger" data-del-obra="${o.id}">Apagar</button></td>
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
}

const field=(label,value)=>`<article class="obra-field"><span>${label}</span><strong>${esc(value||"—")}</strong></article>`;
const empty=text=>`<div class="obra-placeholder">${text}</div>`;
const formatDate=v=>v?new Date(v).toLocaleDateString("pt-PT"):"—";
const valorContratado=o=>Number(o.valor_contratado||o.valor||0);
const totalCustos=id=>store.custos.filter(x=>String(x.obra_id)===String(id)).reduce((s,x)=>s+Number(x.valor||x.valor_sem_iva||0),0);
const totalRecebido=id=>store.pagamentos.filter(x=>String(x.obra_id)===String(id)).reduce((s,x)=>s+Number(x.valor||0),0);
const orcamentoTotal=o=>{
  const base=Number(o.mao_obra||0)+Number(o.materiais||0)+Number(o.logistica||0);
  return base*(1+Number(o.iva||0)/100);
};

document.addEventListener("click",e=>{
  const id=e.target.closest("[data-view-obra]")?.dataset.viewObra;
  if(id){openObraFicha(id);return}

  const tab=e.target.closest("[data-obra-tab]")?.dataset.obraTab;
  if(tab){
    document.querySelectorAll("[data-obra-tab]").forEach(b=>b.classList.toggle("active",b.dataset.obraTab===tab));
    document.querySelectorAll(".obra-tab-panel").forEach(p=>p.classList.add("hidden"));
    $(`obra-tab-${tab}`).classList.remove("hidden");
  }
});

document.addEventListener("DOMContentLoaded",()=>{
  $("obraFichaEditar")?.addEventListener("click",()=>{
    if(!obraFichaAtual)return;
    obraFichaDialog.close();
    openObra(obraFichaAtual);
  });
});
