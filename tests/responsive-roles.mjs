import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const root=resolve(import.meta.dirname,"..");
const read=file=>readFileSync(resolve(root,file),"utf8");
const html=read("index.html"),app=read("assets/js/app.js"),menu=read("assets/js/modules/hybrid-menu.js");
const roleCss=read("assets/css/cliente-role.css"),shellCss=read("assets/css/hybrid-menu.css");
const dashboardCss=read("assets/css/dashboard-executivo.css"),fieldCss=read("assets/css/campo.css"),clientCss=read("assets/css/cliente-portal.css"),intelligenceCss=read("assets/css/inteligencia.css");
const baseCss=read("assets/css/style.css"),dashboardModule=read("assets/js/modules/dashboard.js"),budgetModule=read("assets/js/modules/orcamentos.js");
const check=(condition,message)=>{if(!condition){console.error(`FALHA: ${message}`);process.exit(1)}};

for(const id of ["mobileNav","mobileHome","mobileWorks","mobileRegister","mobileAlerts","mobileMore","mobileMoreSheet","mobileRegisterSheet"]){
  check(html.includes(`id="${id}"`),`controlo móvel ausente: ${id}`);
}
check(app.includes('client?"cliente-portal":"dashboard"')&&app.includes('client?"Minhas obras":"Início"'),"o início móvel deve adaptar o destino e o nome ao perfil cliente");
check(app.includes('works?.classList.toggle("hidden",client)'),"o cliente não deve ver um atalho de obras administrativas bloqueado");
check(roleCss.includes(".client-mode .mobile-nav")&&roleCss.includes("repeat(2,minmax(0,1fr))"),"a barra do cliente deve reorganizar os dois destinos permitidos");
check(roleCss.includes("#mobileRegister")&&roleCss.includes("#mobileAlerts"),"registo rápido e alertas internos devem ficar ocultos ao cliente");
check(menu.includes('store.profile?.role==="cliente"')&&menu.includes('data-mobile-view="cliente-portal"'),"o menu Mais deve respeitar o portal do cliente");
for(const required of ["@media(max-width:850px)","env(safe-area-inset-bottom)","grid-template-columns:repeat(5,1fr)","min-height:70px"]){
  check(shellCss.includes(required),`estrutura móvel principal incompleta: ${required}`);
}
for(const [name,css,breakpoint] of [["dashboard",dashboardCss,"@media(max-width:650px)"],["portal de campo",fieldCss,"@media(max-width:560px)"],["portal do cliente",clientCss,"@media(max-width:700px)"],["inteligência",intelligenceCss,"@media(max-width:700px)"]]){
  check(css.includes(breakpoint),`${name} sem adaptação para telemóvel em ${breakpoint}`);
}
check(baseCss.includes(".table-scroll")&&baseCss.includes("overflow:auto"),"as tabelas largas devem ter deslocamento horizontal global");
check(dashboardModule.includes('class="table-scroll"')&&budgetModule.includes('class="table-scroll"'),"dashboard e orçamentos devem aplicar o contentor responsivo às tabelas largas");

console.log("Responsividade por papel aprovada: administrador, equipa e cliente têm navegação e áreas móveis protegidas.");
