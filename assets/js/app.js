import {$,setView,esc} from "./core/ui.js";import {login,logout,session} from "./core/auth.js";import {store} from "./core/store.js";import {refreshData} from "./modules/data.js";import {renderDashboard} from "./modules/dashboard.js";import {renderClientes,openCliente,submitCliente,deleteCliente} from "./modules/clientes.js";import {renderObras,openObra,submitObra,deleteObra} from "./modules/obras.js";import {renderOrcamentos,openOrcamento,submitOrcamento,deleteOrcamento,initOrcamentos} from "./modules/orcamentos.js?v=20260803-login-fix";import {renderCustos,openCusto,submitCusto,deleteCusto,initCustos} from "./modules/custos.js";import {renderPagamentos,openPagamento,submitPagamento,deletePagamento} from "./modules/pagamentos.js";import {renderFuncionarios,initFuncionarios} from "./modules/funcionarios.js?v=20260803-login-fix";import {initFotografias} from "./modules/fotografias.js";import {initDocumentos} from "./modules/documentos.js";import {initDiario} from "./modules/diario.js";import {initV3,renderV3} from "./modules/v3.js";import {initHybridMenu,renderHybridMenu} from "./modules/hybrid-menu.js";
import {initAssistant,renderAssistantInsight} from "./modules/assistant.js";
import {initPwa} from "./core/pwa.js";
import {initAccessibility} from "./core/accessibility.js";
import {initAgenda,renderAgenda,openAgendaTask} from "./modules/agenda.js";
import {initPrevisoes,renderPrevisoes,openForecast} from "./modules/previsoes.js";
import {initDossies,renderDossies} from "./modules/dossies.js";
import {initOperacional,renderOperacional,openOperationalQuick} from "./modules/operacional.js";
import {initCompras,renderCompras} from "./modules/compras.js";
import {initMedicoes,renderMedicoes} from "./modules/medicoes.js";
import {initCampo,renderCampo} from "./modules/campo.js";
import {initInteligencia,renderInteligencia} from "./modules/inteligencia.js";
import {initClientePortal,renderClientePortal,renderClientePortalAdmin} from "./modules/cliente-portal.js";
import {initBackup} from "./modules/backup.js";
async function refresh(){await refreshData();if(store.profile?.role==="cliente"){renderClientePortal();renderHybridMenu();return}renderClientes();renderObras();renderOrcamentos();renderCustos();renderPagamentos();renderFuncionarios();renderDashboard();renderAgenda();renderPrevisoes();renderDossies();renderOperacional();renderCompras();renderMedicoes();renderInteligencia();renderClientePortalAdmin();renderV3();renderHybridMenu();renderAssistantInsight();await renderCampo()}
function applyRole(){const admin=store.profile.role==="admin",client=store.profile.role==="cliente";if($("appView"))$("appView").dataset.role=store.profile.role;$("appView")?.classList.toggle("client-mode",client);document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",!admin));document.querySelectorAll(".funcionario-only").forEach(x=>x.classList.toggle("hidden",admin||client));document.querySelectorAll(".client-only").forEach(x=>x.classList.toggle("hidden",!client));document.querySelectorAll(".non-client-only").forEach(x=>x.classList.toggle("hidden",client));const home=document.querySelector('[data-mobile-view="dashboard"]');if(home&&client){home.dataset.mobileView="cliente-portal";home.querySelector("span").textContent="Início"}}
async function enter(s){store.profile=s.profile;$("userInfo").innerHTML=`<strong>${esc(s.profile.nome||s.user.email)}</strong><br><small>${esc(s.profile.role)}</small>`;applyRole();await refresh();$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");setView(s.profile.role==="cliente"?"cliente-portal":s.profile.role==="admin"?"dashboard":"funcionario")}
$("loginForm").onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button[type="submit"]');$("loginError").textContent="";button.disabled=true;button.textContent="A entrar…";try{await enter(await login($("loginEmail").value.trim(),$("loginPassword").value))}catch(err){$("loginError").textContent=err.message||"Não foi possível entrar. Tente novamente."}finally{button.disabled=false;button.textContent="Entrar"}}
$("logoutBtn").onclick=async()=>{await logout();location.reload()};$("mainNav").onclick=e=>{const b=e.target.closest("[data-view]");if(b)setView(b.dataset.view)}
$("novoClienteBtn").onclick=()=>openCliente();$("novaObraBtn").onclick=()=>openObra();$("novoOrcamentoBtn").onclick=()=>openOrcamento();$("novoCustoBtn").onclick=()=>openCusto();$("novoPagamentoBtn").onclick=()=>openPagamento()
$("clienteForm").onsubmit=e=>submitCliente(e,refresh);$("obraForm").onsubmit=e=>submitObra(e,refresh);$("orcamentoForm").onsubmit=e=>submitOrcamento(e,refresh);$("custoForm").onsubmit=e=>submitCusto(e,refresh);$("pagamentoForm").onsubmit=e=>submitPagamento(e,refresh)
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close())
document.body.onclick=e=>{
  const editCliente=e.target.closest("[data-edit-cliente]")?.dataset.editCliente;
  const delCliente=e.target.closest("[data-del-cliente]")?.dataset.delCliente;
  const editObra=e.target.closest("[data-edit-obra]")?.dataset.editObra;
  const delObra=e.target.closest("[data-del-obra]")?.dataset.delObra;
  const editOrc=e.target.closest("[data-edit-orcamento]")?.dataset.editOrcamento;
  const delOrc=e.target.closest("[data-del-orcamento]")?.dataset.delOrcamento;
  const editCusto=e.target.closest("[data-edit-custo]")?.dataset.editCusto;
  const delCusto=e.target.closest("[data-del-custo]")?.dataset.delCusto;
  const editPag=e.target.closest("[data-edit-pagamento]")?.dataset.editPagamento;
  const delPag=e.target.closest("[data-del-pagamento]")?.dataset.delPagamento;
  if(editCliente)openCliente(store.clientes.find(x=>String(x.id)===editCliente));
  if(delCliente)deleteCliente(delCliente,refresh);
  if(editObra)openObra(store.obras.find(x=>String(x.id)===editObra));
  if(delObra)deleteObra(delObra,refresh);
  if(editOrc)openOrcamento(store.orcamentos.find(x=>String(x.id)===editOrc));
  if(delOrc)deleteOrcamento(delOrc,refresh);
  if(editCusto)openCusto(store.custos.find(x=>String(x.id)===editCusto));
  if(delCusto)deleteCusto(delCusto,refresh);
  if(editPag)openPagamento(store.pagamentos.find(x=>String(x.id)===editPag));
  if(delPag)deletePagamento(delPag,refresh);
}
$("clienteSearch").oninput=e=>renderClientes(store.clientes.filter(x=>JSON.stringify(x).toLowerCase().includes(e.target.value.toLowerCase())));$("obraSearch").oninput=e=>renderObras(store.obras.filter(x=>JSON.stringify(x).toLowerCase().includes(e.target.value.toLowerCase())));$("pagamentoSearch").oninput=e=>renderPagamentos(store.pagamentos.filter(x=>JSON.stringify(x).toLowerCase().includes(e.target.value.toLowerCase())))
initAccessibility();initBackup();initClientePortal(refresh);initCustos(refresh);initOrcamentos();initFuncionarios(refresh);initFotografias();initDocumentos();initDiario();initAgenda(refresh);initPrevisoes(refresh);initDossies();initOperacional(refresh);initCompras(refresh);initMedicoes(refresh);initCampo(refresh);initInteligencia(refresh);initV3();initHybridMenu({openCliente,openObra,openOrcamento,openCusto,openPagamento,openAgendaTask,openForecast,openOperationalQuick});initAssistant();initPwa();
session().then(s=>s&&enter(s)).catch(err=>{$("loginError").textContent=err.message||"Não foi possível recuperar a sessão."})
