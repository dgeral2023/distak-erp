import {$,setView} from "../core/ui.js";
import {store} from "../core/store.js";

const meta={dashboard:["⌂","Início"],leads:["◎","Pedidos do site"],"portal-admin":["◉","Portal do cliente"],empresa:["⚙","Empresa"],clientes:["♙","Clientes"],obras:["▥","Obras"],operacional:["◉","Operacional"],agenda:["◫","Agenda"],dossies:["▧","Dossiês"],orcamentos:["▤","Orçamentos"],compras:["▦","Compras"],subempreiteiros:["♜","Subempreiteiros"],medicoes:["％","Medições"],custos:["↘","Custos"],pagamentos:["€","Recebimentos"],previsoes:["↗","Previsões"],inteligencia:["◆","Inteligência"],funcionarios:["♟","Equipa"],relatorios:["▥","Relatórios"],funcionario:["✓","Portal de campo"]};
const adminViews=["leads","portal-admin","clientes","orcamentos","compras","subempreiteiros","medicoes","custos","pagamentos","previsoes","inteligencia","relatorios","funcionarios","empresa"];
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
function closeSheets(){[$("mobileMoreSheet"),$("mobileRegisterSheet")].forEach(node=>{node?.classList.add("hidden");node?.setAttribute("aria-hidden","true")});$("mobileSheetBackdrop")?.classList.add("hidden")}
function openSheet(id){closeSheets();const sheet=$(id);sheet?.classList.remove("hidden");sheet?.setAttribute("aria-hidden","false");$("mobileSheetBackdrop")?.classList.remove("hidden");setTimeout(()=>sheet?.querySelector("button")?.focus(),0)}
function syncMobileActive(view){
  const active=document.querySelector(`#mobileNav [data-mobile-view="${view}"]`)||$("mobileMore");document.querySelectorAll("#mobileNav button").forEach(button=>{const current=button===active;button.classList.toggle("active",current);button.setAttribute("aria-current",current?"page":"false")});
}
function navigate(view){setView(view);saveRecent(view);syncMobileActive(view);closeSheets()}

function renderMore(){
  const motion=`<button data-motion-toggle type="button" aria-pressed="true"><i>✦</i><strong>Movimento</strong><small data-motion-state>Criativa avançada</small></button>`;
  if(store.profile?.role==="cliente"){$("mobileMoreLinks").innerHTML=`<button data-mobile-view="cliente-portal"><i>◎</i><strong>Minhas obras</strong></button>${motion}`;document.dispatchEvent(new CustomEvent("distak:motion-controls"));return}
  const views=store.profile?.role==="admin"?["leads","clientes","orcamentos","portal-admin","inteligencia","funcionario","operacional","agenda","dossies","compras","subempreiteiros","medicoes","custos","pagamentos","previsoes","funcionarios","relatorios","empresa"]:["operacional","agenda","dossies","funcionario"];
  $("mobileMoreLinks").innerHTML=views.map(view=>`<button data-mobile-view="${view}"><i>${meta[view][0]}</i><strong>${meta[view][1]}</strong></button>`).join("")+motion;
  document.dispatchEvent(new CustomEvent("distak:motion-controls"));
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
  document.addEventListener("distak:view-change",event=>{if(event.detail?.view)syncMobileActive(event.detail.view)});
  document.addEventListener("click",event=>{
    const group=event.target.closest("[data-toggle-menu-group]")?.dataset.toggleMenuGroup;
    if(group){const node=document.querySelector(`[data-menu-group="${group}"]`)||event.target.closest(".nav-group");node?.classList.toggle("group-collapsed");const states=JSON.parse(localStorage.getItem("distakMenuGroups")||"{}");states[group]=node?.classList.contains("group-collapsed");localStorage.setItem("distakMenuGroups",JSON.stringify(states));return}
    const mobileView=event.target.closest("[data-mobile-view]")?.dataset.mobileView;
    const regularView=event.target.closest("#mainNav [data-view]")?.dataset.view;
    if(mobileView){navigate(mobileView);return}
    if(regularView)saveRecent(regularView);
    if(event.target.closest("#mobileRegister")){openSheet("mobileRegisterSheet");return}
    if(event.target.closest("#mobileMore")){openSheet("mobileMoreSheet");return}
    if(event.target.closest("#mobileAlerts")){closeSheets();$("notificationBtn")?.click();return}
    if(event.target.closest("#topUserMenu")){const panel=$("accountPanel"),open=panel.classList.contains("hidden");panel.classList.toggle("hidden",!open);panel.setAttribute("aria-hidden",String(!open));$("topUserMenu").setAttribute("aria-expanded",String(open));if(open)setTimeout(()=>$("motionToggle")?.focus(),0);return}
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
    if(quick==="operacional"){
      if(store.profile?.role==="admin")actions.openOperationalQuick?.();
      else{navigate("funcionario");setTimeout(()=>$("fieldNewRecord")?.click(),0)}
    }
    if(quick==="diario")navigate(store.profile?.role==="admin"?"obras":"funcionario");
  });
  let groupStates={};try{groupStates=JSON.parse(localStorage.getItem("distakMenuGroups")||"{}")}catch{}
  Object.entries(groupStates).forEach(([group,closed])=>{if(closed)(document.querySelector(`[data-menu-group="${group}"]`)||document.querySelector(`[data-toggle-menu-group="${group}"]`)?.closest(".nav-group"))?.classList.add("group-collapsed")});
}
