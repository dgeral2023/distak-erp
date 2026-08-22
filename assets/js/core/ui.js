export const $=id=>document.getElementById(id);
export const esc=(v="")=>String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
export const money=n=>new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(Number(n||0));
let toastTimer;
export function toast(m,t=""){
  const e=$("toast"),error=t==="error";
  clearTimeout(toastTimer);e.textContent=m;e.className=`toast show${error?" error":""}`;e.setAttribute("role",error?"alert":"status");
  toastTimer=setTimeout(()=>e.className="toast",error?6000:4000);
}
export function friendlyError(error,fallback="Não foi possível concluir a operação."){
  if(error?.code==="23503")return "Este registo tem informação associada e não pode ser apagado. Remova primeiro os registos dependentes ou altere o estado para Arquivada.";
  if(error?.code==="23505")return "Já existe um registo com estes dados únicos. Confirme o número, NIF ou referência.";
  if(error?.code==="42501"||error?.code==="PGRST301")return "A sua conta não tem permissão para concluir esta operação.";
  return fallback;
}
const viewMeta={dashboard:["Dashboard","Visão geral comercial, financeira e operacional"],empresa:["Empresa","Dados institucionais e regras internas"],leads:["Pedidos do site","Novos contactos e oportunidades comerciais"],clientes:["Clientes","Contactos, histórico e documentos"],obras:["Obras","Acompanhamento técnico e operacional"],operacional:["Centro Operacional","Diários, ocorrências, materiais e horas das obras"],agenda:["Agenda e cronograma","Etapas, dependências, responsáveis e prazos"],dossies:["Dossiê digital","Documentos, fotografias e pendências por obra"],orcamentos:["Orçamentos","Propostas comerciais e aprovações"],compras:["Compras e fornecedores","Pedidos, propostas, entregas e desvios"],medicoes:["Medições e faturação","Autos, aprovações e marcos de faturação"],custos:["Custos","Compras, faturas e pagamentos a fornecedores"],pagamentos:["Recebimentos","Entradas de clientes associadas às obras"],previsoes:["Previsões e cobranças","Planeamento financeiro futuro e riscos por obra"],inteligencia:["Inteligência de gestão","Custo final, margem, prazo e risco de cobrança"],funcionarios:["Funcionários","Equipa, horas e custos de mão de obra"],relatorios:["Relatórios","Rentabilidade, vencimentos e documentação"],funcionario:["Portal de campo","Tarefas, registos móveis e sincronização da equipa"]};
const teamViews=new Set(["dashboard","obras","operacional","agenda","dossies","funcionario"]);
export function canAccessView(role,view){if(role==="admin")return true;if(role==="cliente")return view==="cliente-portal";return teamViews.has(view)}
export function setView(v){const role=$("appView")?.dataset.role;if(role&&!canAccessView(role,v))return;const target=$(`view-${v}`);if(!target)return;document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));target.classList.remove("hidden");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===v));const [title,subtitle]=v==="portal-admin"?["Portal do Cliente","Acessos e conteúdos publicados"]:v==="cliente-portal"?["Minhas obras","Progresso e documentos partilhados pela DISTAK"]:(viewMeta[v]||[v[0].toUpperCase()+v.slice(1),""]);$("pageTitle").textContent=title;$("pageSubtitle").textContent=subtitle;document.querySelector(".content")?.scrollTo({top:0,behavior:"smooth"});if(innerWidth<851)document.querySelector(`[data-view="${v}"]`)?.scrollIntoView({inline:"center",block:"nearest"});document.dispatchEvent(new CustomEvent("distak:view-change",{detail:{view:v}}))}
