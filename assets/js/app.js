import {$,setView,esc,toast} from "./core/ui.js";import {login,logout,session} from "./core/auth.js";import {store} from "./core/store.js";import {refreshData} from "./modules/data.js";import {renderDashboard} from "./modules/dashboard.js";import {renderLeads,initLeads} from "./modules/leads.js";import {renderObras,openObra,submitObra,deleteObra} from "./modules/obras.js";import {renderOrcamentos,openOrcamento,submitOrcamento,deleteOrcamento,initOrcamentos} from "./modules/orcamentos.js?v=20260803-login-fix";import {renderCustos,openCusto,submitCusto,deleteCusto,initCustos} from "./modules/custos.js";import {renderPagamentos,openPagamento,submitPagamento,deletePagamento} from "./modules/pagamentos.js";import {renderFuncionarios,initFuncionarios} from "./modules/funcionarios.js?v=20260803-login-fix";import {initFotografias} from "./modules/fotografias.js";import {initDocumentos} from "./modules/documentos.js";import {initDiario} from "./modules/diario.js";import {initV3,renderV3} from "./modules/v3.js";import {initHybridMenu,renderHybridMenu} from "./modules/hybrid-menu.js";
import {initAssistant,renderAssistantInsight} from "./modules/assistant.js";
import {requestPasswordRecovery,updateRecoveredPassword,onPasswordRecovery,passwordIssues} from "./core/auth.js";
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
import {initSystemHealth,renderSystemHealth} from "./modules/system-health.js";
import {initMotion} from "./modules/motion.js";
import {initIconography} from "./core/iconography.js";
let clientModulePromise;
const clientModule=()=>clientModulePromise||=import("./modules/clientes.js").then(module=>{module.initClientes(refresh);return module});
let lastDataWarning="";
let passwordRecoveryActive=location.hash.includes("type=recovery");
async function refresh(){await refreshData();const warning=(store.dataWarnings||[]).join(", ");if(warning&&warning!==lastDataWarning)toast(`Alguns módulos não foram carregados: ${warning}. Tente atualizar a página.`,"error");lastDataWarning=warning;if(store.profile?.role==="cliente"){renderClientePortal();renderHybridMenu();return}renderLeads();if(!$("view-clientes").classList.contains("hidden"))(await clientModule()).renderClientes();renderObras();renderOrcamentos();renderCustos();renderPagamentos();renderFuncionarios();renderDashboard();renderAgenda();renderPrevisoes();renderDossies();renderOperacional();renderCompras();renderMedicoes();renderInteligencia();renderClientePortalAdmin();renderV3();renderSystemHealth();renderHybridMenu();renderAssistantInsight();await renderCampo()}
function applyRole(){const admin=store.profile.role==="admin",client=store.profile.role==="cliente";if($("appView"))$("appView").dataset.role=store.profile.role;$("appView")?.classList.toggle("client-mode",client);document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",!admin));document.querySelectorAll(".funcionario-only").forEach(x=>x.classList.toggle("hidden",admin||client));document.querySelectorAll(".client-only").forEach(x=>x.classList.toggle("hidden",!client));document.querySelectorAll(".non-client-only").forEach(x=>x.classList.toggle("hidden",client));const home=$("mobileHome"),works=$("mobileWorks");if(home){home.dataset.mobileView=client?"cliente-portal":"dashboard";home.querySelector("span").textContent=client?"Minhas obras":"Início"}works?.classList.toggle("hidden",client)}
async function enter(s){store.profile=s.profile;$("userInfo").innerHTML=`<strong>${esc(s.profile.nome||s.user.email)}</strong><br><small>${esc(s.profile.role)}</small>`;applyRole();await refresh();$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");setView(s.profile.role==="cliente"?"cliente-portal":s.profile.role==="admin"?"dashboard":"funcionario")}
$("loginForm").onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button[type="submit"]');$("loginError").textContent="";button.disabled=true;button.textContent="A entrar…";try{await enter(await login($("loginEmail").value.trim(),$("loginPassword").value))}catch(err){$("loginError").textContent=err.message||"Não foi possível entrar. Tente novamente."}finally{button.disabled=false;button.textContent="Entrar"}}
$("forgotPasswordBtn").onclick=()=>{$("passwordRecoveryEmail").value=$("loginEmail").value.trim();$("passwordRecoveryRequestStatus").textContent="";$("passwordRecoveryRequestDialog").showModal();$("passwordRecoveryEmail").focus()};
$("passwordRecoveryRequestForm").onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button[type="submit"]'),status=$("passwordRecoveryRequestStatus");button.disabled=true;status.textContent="";try{await requestPasswordRecovery($("passwordRecoveryEmail").value.trim());$("passwordRecoveryRequestDialog").close();toast("Se existir uma conta com este e-mail, receberá uma ligação de recuperação.")}catch(err){status.textContent=err.message||"Não foi possível enviar a ligação. Tente novamente."}finally{button.disabled=false}};
$("passwordRecoveryUpdateForm").onsubmit=async e=>{e.preventDefault();const password=$("passwordRecoveryPassword").value,confirm=$("passwordRecoveryConfirm").value,status=$("passwordRecoveryUpdateStatus"),button=e.currentTarget.querySelector('button[type="submit"]'),issues=passwordIssues(password);status.textContent="";if(issues.length){status.textContent=`A palavra-passe precisa de ${issues.join(", ")}.`;return}if(password!==confirm){status.textContent="As palavras-passe não coincidem.";return}button.disabled=true;try{await updateRecoveredPassword(password);await logout();$("passwordRecoveryUpdateDialog").close();$("loginPassword").value="";toast("Palavra-passe atualizada. Entre novamente com a nova palavra-passe.");$("loginEmail").focus()}catch(err){status.textContent=err.message||"Não foi possível atualizar a palavra-passe."}finally{button.disabled=false}};
onPasswordRecovery(()=>{passwordRecoveryActive=true;$("loginView").classList.remove("hidden");$("appView").classList.add("hidden");$("passwordRecoveryUpdateStatus").textContent="";$("passwordRecoveryUpdateForm").reset();$("passwordRecoveryUpdateDialog").showModal();$("passwordRecoveryPassword").focus()});
$("logoutBtn").onclick=async()=>{await logout();location.reload()};$("mainNav").onclick=e=>{const b=e.target.closest("[data-view]");if(b)setView(b.dataset.view)}
$("novoClienteBtn").onclick=()=>clientModule().then(module=>module.openCliente());$("novaObraBtn").onclick=()=>openObra();$("novoOrcamentoBtn").onclick=()=>openOrcamento();$("novoCustoBtn").onclick=()=>openCusto();$("novoPagamentoBtn").onclick=()=>openPagamento()
$("obraForm").onsubmit=e=>submitObra(e,refresh);$("orcamentoForm").onsubmit=e=>submitOrcamento(e,refresh);$("custoForm").onsubmit=e=>submitCusto(e,refresh);$("pagamentoForm").onsubmit=e=>submitPagamento(e,refresh)
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close())
document.body.onclick=async e=>{
  const editCliente=e.target.closest("[data-edit-cliente]")?.dataset.editCliente;
  const delCliente=e.target.closest("[data-del-cliente]")?.dataset.delCliente;
  const deactivateClient=e.target.closest("[data-deactivate-cliente]")?.dataset.deactivateCliente;
  const editObra=e.target.closest("[data-edit-obra]")?.dataset.editObra;
  const delObra=e.target.closest("[data-del-obra]")?.dataset.delObra;
  const editOrc=e.target.closest("[data-edit-orcamento]")?.dataset.editOrcamento;
  const delOrc=e.target.closest("[data-del-orcamento]")?.dataset.delOrcamento;
  const editCusto=e.target.closest("[data-edit-custo]")?.dataset.editCusto;
  const delCusto=e.target.closest("[data-del-custo]")?.dataset.delCusto;
  const editPag=e.target.closest("[data-edit-pagamento]")?.dataset.editPagamento;
  const delPag=e.target.closest("[data-del-pagamento]")?.dataset.delPagamento;
  if(editCliente)(await clientModule()).openCliente(store.clientes.find(x=>String(x.id)===editCliente));
  if(delCliente)(await clientModule()).deleteCliente(delCliente,refresh);
  if(deactivateClient)(await clientModule()).deactivateCliente(deactivateClient,refresh);
  if(e.target.closest("[data-new-cliente]"))(await clientModule()).openCliente();
  if(e.target.closest("[data-clear-client-filters]")){$("clienteSearch").value="";$("clienteEstadoFiltro").value="";(await clientModule()).renderClientes()}
  if(editObra)openObra(store.obras.find(x=>String(x.id)===editObra));
  if(delObra)deleteObra(delObra,refresh);
  if(editOrc)openOrcamento(store.orcamentos.find(x=>String(x.id)===editOrc));
  if(delOrc)deleteOrcamento(delOrc,refresh);
  if(editCusto)openCusto(store.custos.find(x=>String(x.id)===editCusto));
  if(delCusto)deleteCusto(delCusto,refresh);
  if(editPag)openPagamento(store.pagamentos.find(x=>String(x.id)===editPag));
  if(delPag)deletePagamento(delPag,refresh);
}
$("obraSearch").oninput=e=>renderObras(store.obras.filter(x=>JSON.stringify(x).toLowerCase().includes(e.target.value.toLowerCase())));$("pagamentoSearch").oninput=e=>renderPagamentos(store.pagamentos.filter(x=>JSON.stringify(x).toLowerCase().includes(e.target.value.toLowerCase())))
document.addEventListener("distak:view-change",event=>{if(event.detail?.view==="clientes")clientModule().then(module=>module.renderClientes())});
initIconography();initAccessibility();initMotion();initBackup();initSystemHealth(refresh);initClientePortal(refresh);initLeads(refresh);initCustos(refresh);initOrcamentos();initFuncionarios(refresh);initFotografias();initDocumentos();initDiario();initAgenda(refresh);initPrevisoes(refresh);initDossies();initOperacional(refresh);initCompras(refresh);initMedicoes(refresh);initCampo(refresh);initInteligencia(refresh);initV3();initHybridMenu({openCliente:()=>clientModule().then(module=>module.openCliente()),openObra,openOrcamento,openCusto,openPagamento,openAgendaTask,openForecast,openOperationalQuick});initAssistant();initPwa();
session().then(s=>s&&!passwordRecoveryActive&&enter(s)).catch(err=>{$("loginError").textContent=err.message||"Não foi possível recuperar a sessão."})
