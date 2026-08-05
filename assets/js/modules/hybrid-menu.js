import {$,setView} from "../core/ui.js";
import {store} from "../core/store.js";

const meta={dashboard:["⌂","Início"],empresa:["⚙","Empresa"],clientes:["♙","Clientes"],obras:["▥","Obras"],operacional:["◉","Operacional"],agenda:["◫","Agenda"],dossies:["▧","Dossiês"],orcamentos:["▤","Orçamentos"],custos:["↘","Custos"],pagamentos:["€","Pagamentos"],previsoes:["↗","Previsões"],funcionarios:["♟","Equipa"],relatorios:["▥","Relatórios"],funcionario:["✓","Meu painel"]};
const adminViews=["clientes","orcamentos","custos","pagamentos","previsoes","relatorios","funcionarios","empresa"];
let actions={};

function recentViews(){try{return JSON.parse(localStorage.getItem("distakRecentViews")||"[]")}catch{return []}}
function saveRecent(view){if(!meta[view]||view==="dashboard")return;const rows=[view,...recentViews().filter(item=>item!==view)].slice(0,3);localStorage.setItem("distakRecentViews",JSON.stringify(rows));renderRecent()}
function renderRecent(){
  const host=$("recentNav");if(!host)return;
  const allowed=recentViews().filter(view=>store.profile?.role==="admin"||!adminViews.includes(view));
  $("recentNavGroup")?.classList.toggle("hidden",!allowed.length);
  host.innerHTML=allowed.map(view=>`<button class="nav recent-nav" data-view="${view}"><i>${meta[view][0]}</i><span>${meta[view][1]}</span></button>`).join("");
}
function favoriteViews(){try{return JSON.parse(localStorage.getItem("distakFavoriteViews")||"null")||["obras","relatorios"]}catch{return ["obras","relatorios"]}}
function renderFavorites(){
  const host=$("favoriteNav");if(!host)return;
  const allowed=favoriteViews().filter(view=>meta[view]&&(store.profile?.role==="admin"||!adminViews.includes(view)));
  $("favoriteNavGroup")?.classList.toggle("hidden",!allowed.length);
  host.innerHTML=allowed.map(view=>`<button class="nav favorite-nav" data-view="${view}"><i>${meta[view][0]}</i><span>${meta[view][1]}</span></button>`).join("");
}
function closeSheets(){[$("mobileMoreSheet"),$("mobileRegisterSheet"),$("mobileSheetBackdrop")].forEach(node=>node?.classList.add("hidden"))}
function openSheet(id){closeSheets();$(id)?.classList.remove("hidden");$("mobileSheetBackdrop")?.classList.remove("hidden")}
function navigate(view){setView(view);saveRecent(view);document.querySelectorAll("[data-mobile-view]").forEach(button=>button.classList.toggle("active",button.dataset.mobileView===view));closeSheets()}

function renderMore(){
  const views=store.profile?.role==="admin"?["operacional","agenda","dossies","clientes","orcamentos","custos","pagamentos","previsoes","funcionarios","relatorios","empresa"]:["operacional","agenda","dossies","funcionario"];
  $("mobileMoreLinks").innerHTML=views.map(view=>`<button data-mobile-view="${view}"><i>${meta[view][0]}</i><strong>${meta[view][1]}</strong></button>`).join("");
}

export function renderHybridMenu(){
  $("navWorkCount").textContent=store.obras.length;
  const count=Number($("notificationCount")?.textContent||0);
  $("mobileAlertCount").textContent=count;
  $("mobileAlertCount").classList.toggle("hidden",!count);
  const name=store.profile?.nome||store.profile?.email||"D";
  $("topUserInitial").textContent=name.trim().charAt(0).toUpperCase();
  $("accountPanelUser").innerHTML=`<strong>${name}</strong><small>${store.profile?.role||""}</small>`;
  renderMore();renderFavorites();renderRecent();
}

export function initHybridMenu(handlers){
  actions=handlers;
  const collapsed=localStorage.getItem("distakSidebarCollapsed")==="true";
  $("appView")?.classList.toggle("sidebar-collapsed",collapsed);
  $("sidebarToggle").textContent=collapsed?"›":"‹";
  $("sidebarToggle")?.addEventListener("click",()=>{
    const next=!$("appView").classList.contains("sidebar-collapsed");
    $("appView").classList.toggle("sidebar-collapsed",next);
    $("sidebarToggle").textContent=next?"›":"‹";
    $("sidebarToggle").setAttribute("aria-label",next?"Expandir menu":"Recolher menu");
    localStorage.setItem("distakSidebarCollapsed",String(next));
  });
  document.addEventListener("keydown",event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();$("globalSearch")?.focus();$("globalSearch")?.select()}});
  document.addEventListener("click",event=>{
    const group=event.target.closest("[data-toggle-menu-group]")?.dataset.toggleMenuGroup;
    if(group){const node=document.querySelector(`[data-menu-group="${group}"]`)||event.target.closest(".nav-group");node?.classList.toggle("group-collapsed");const states=JSON.parse(localStorage.getItem("distakMenuGroups")||"{}");states[group]=node?.classList.contains("group-collapsed");localStorage.setItem("distakMenuGroups",JSON.stringify(states));return}
    const mobileView=event.target.closest("[data-mobile-view]")?.dataset.mobileView;
    const regularView=event.target.closest("#mainNav [data-view]")?.dataset.view;
    if(mobileView){navigate(mobileView);return}
    if(regularView)saveRecent(regularView);
    if(event.target.closest("#mobileRegister")){openSheet("mobileRegisterSheet");return}
    if(event.target.closest("#mobileMore")){openSheet("mobileMoreSheet");return}
    if(event.target.closest("#mobileAlerts")){closeSheets();$("notificationPanel")?.classList.remove("hidden");return}
    if(event.target.closest("#topUserMenu")){$("accountPanel")?.classList.toggle("hidden");return}
    if(event.target.closest("#accountLogout")){$("logoutBtn")?.click();return}
    if(event.target.closest("[data-close-mobile-sheet]")||event.target.id==="mobileSheetBackdrop"){closeSheets();return}
    const quick=event.target.closest("[data-quick-action]")?.dataset.quickAction;
    if(!quick)return;
    closeSheets();
    if(quick==="cliente")actions.openCliente?.();
    if(quick==="obra")actions.openObra?.();
    if(quick==="orcamento")actions.openOrcamento?.();
    if(quick==="custo")actions.openCusto?.();
    if(quick==="pagamento")actions.openPagamento?.();
    if(quick==="previsao")actions.openForecast?.();
    if(quick==="tarefa")actions.openAgendaTask?.();
    if(quick==="operacional")actions.openOperationalQuick?.();
    if(quick==="diario")navigate(store.profile?.role==="admin"?"obras":"funcionario");
  });
  let groupStates={};try{groupStates=JSON.parse(localStorage.getItem("distakMenuGroups")||"{}")}catch{}
  Object.entries(groupStates).forEach(([group,closed])=>{if(closed)(document.querySelector(`[data-menu-group="${group}"]`)||document.querySelector(`[data-toggle-menu-group="${group}"]`)?.closest(".nav-group"))?.classList.add("group-collapsed")});
}
