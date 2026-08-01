import {$,setView,esc} from "./core/ui.js";import {login,logout,session} from "./core/auth.js";import {store} from "./core/store.js";import {refreshData} from "./modules/data.js";import {renderDashboard} from "./modules/dashboard.js";import {renderClientes,openCliente,submitCliente,deleteCliente} from "./modules/clientes.js";import {renderObras,openObra,submitObra,deleteObra} from "./modules/obras.js";import {renderOrcamentos,openOrcamento,submitOrcamento,deleteOrcamento} from "./modules/orcamentos.js";import {renderCustos,openCusto,submitCusto,deleteCusto,initCustos} from "./modules/custos.js";import {renderPagamentos,openPagamento,submitPagamento,deletePagamento} from "./modules/pagamentos.js";import {initFotografias} from "./modules/fotografias.js";import {initDocumentos} from "./modules/documentos.js";import {initDiario} from "./modules/diario.js";
async function refresh(){await refreshData();renderClientes();renderObras();renderOrcamentos();renderCustos();renderPagamentos();renderDashboard();if(store.profile?.role==="funcionario")$("funcionarioObras").innerHTML=$("obrasTable").innerHTML}
function applyRole(){document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",store.profile.role!=="admin"));document.querySelectorAll(".funcionario-only").forEach(x=>x.classList.toggle("hidden",store.profile.role!=="funcionario"))}
async function enter(s){store.profile=s.profile;$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");$("userInfo").innerHTML=`<strong>${esc(s.profile.nome||s.user.email)}</strong><br><small>${esc(s.profile.role)}</small>`;applyRole();await refresh();setView(s.profile.role==="funcionario"?"funcionario":"dashboard")}
$("loginForm").onsubmit=async e=>{e.preventDefault();try{await enter(await login($("loginEmail").value.trim(),$("loginPassword").value))}catch(err){$("loginError").textContent=err.message}}
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
$("clienteSearch").oninput=e=>renderClientes(store.clientes.filter(x=>JSON.stringify(x).toLowerCase().includes(e.target.value.toLowerCase())));$("obraSearch").oninput=e=>renderObras(store.obras.filter(x=>JSON.stringify(x).toLowerCase().includes(e.target.value.toLowerCase())));$("orcamentoSearch").oninput=e=>renderOrcamentos(store.orcamentos.filter(x=>JSON.stringify(x).toLowerCase().includes(e.target.value.toLowerCase())));$("pagamentoSearch").oninput=e=>renderPagamentos(store.pagamentos.filter(x=>JSON.stringify(x).toLowerCase().includes(e.target.value.toLowerCase())))
initCustos();initFotografias();initDocumentos();initDiario();
session().then(s=>s&&enter(s))
