import {animate,stagger} from "../../vendor/animejs/anime.esm.min.js";
import {$,toast} from "../core/ui.js";
import {motionPreference,resolveMotionMode} from "../core/motion-policy.js";

const KEY="distak-motion-preference-v1";
let mode="off";
const preference=()=>motionPreference(localStorage.getItem(KEY)||"creative");
const currentMode=()=>resolveMotionMode({preference:preference(),reduced:matchMedia("(prefers-reduced-motion: reduce)").matches,forcedColors:matchMedia("(forced-colors: active)").matches,saveData:Boolean(navigator.connection?.saveData),hardwareConcurrency:navigator.hardwareConcurrency||8});
const targets=(root,selector,limit=20)=>[...root.querySelectorAll(selector)].filter(node=>!node.closest(".hidden")&&!node.classList.contains("hidden")).slice(0,limit);
const clean=()=>document.querySelectorAll("[data-motion-touched]").forEach(node=>{node.style.removeProperty("opacity");node.style.removeProperty("transform");node.style.removeProperty("filter");node.style.removeProperty("box-shadow");node.removeAttribute("data-motion-touched")});
const run=(nodes,options)=>{if(mode==="off"||!nodes?.length)return;nodes.forEach(node=>node.dataset.motionTouched="");animate(nodes,{...options,duration:Math.round((options.duration||500)*(mode==="lite"?.65:1))})};

function sync(){
  mode=currentMode();document.documentElement.dataset.motion=mode;document.body.classList.toggle("motion-creative",mode==="creative");
  const forced=matchMedia("(prefers-reduced-motion: reduce)").matches,label=forced?"Reduzido pelo sistema":mode==="off"?"Desativado":mode==="lite"?"Modo leve":"Criativa avançada";document.querySelectorAll("[data-motion-toggle]").forEach(button=>{button.setAttribute("aria-pressed",String(preference()!=="off"));const state=button.querySelector("[data-motion-state]");if(state)state.textContent=label});
  if(mode==="off")clean();return mode;
}

function animateDashboard(root){
  run(targets(root,".option5-dashboard-head,.ai-priority-card",4),{opacity:[0,1],y:[18,0],scale:[.985,1],delay:stagger(90),duration:650,ease:"out(3)"});
  run(targets(root,".option5-kpis article",8),{opacity:[0,1],y:[22,0],scale:[.94,1],delay:stagger(70),duration:720,ease:"out(4)"});
  run(targets(root,".executive-main-grid>.panel,.v3-activity-panel",8),{opacity:[0,1],y:[26,0],delay:stagger(85),duration:760,ease:"out(3)"});
  run(targets(root,".donut-chart",1),{opacity:[0,1],scale:[.72,1],rotate:[-12,0],duration:900,ease:"outElastic(1, .7)"});
  run(targets(root,".dashboard-alert.danger,.dashboard-alert.warning",4),{x:[-5,0],scale:[.985,1],delay:stagger(100),duration:520,ease:"out(4)"});
}

function animateView(view){
  if(sync()==="off")return;const root=$(`view-${view}`);if(!root||root.classList.contains("hidden"))return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(view==="dashboard")animateDashboard(root);else run(targets(root,":scope > *",12),{opacity:[0,1],y:[14,0],delay:stagger(45),duration:480,ease:"out(3)"});const active=document.querySelectorAll(`.nav.active,[data-mobile-view="${view}"].active`);run([...active],{scale:[.94,1],duration:380,ease:"outElastic(1, .8)"})}));
}

function animateDialog(dialog){if(sync()==="off"||!dialog.open)return;run([dialog],{opacity:[0,1],y:[18,0],scale:[.97,1],duration:420,ease:"out(4)"})}
function animateAssistant(){if(sync()==="off")return;const panel=$("aiAssistantPanel");run([panel],{opacity:[0,1],x:[45,0],scale:[.98,1],duration:560,ease:"out(4)"});run(targets(panel,"header,.ai-assistant-suggestions,.ai-assistant-form",5),{opacity:[0,1],y:[12,0],delay:stagger(70),duration:460,ease:"out(3)"})}
function animateMessage(node){if(sync()==="off"||!node)return;run([node],{opacity:[0,1],y:[12,0],scale:[.97,1],duration:400,ease:"out(4)"})}

export function initMotion(){
  sync();
  document.addEventListener("click",event=>{if(!event.target.closest("[data-motion-toggle]"))return;const next=preference()==="off"?"creative":"off";localStorage.setItem(KEY,next);sync();if(next!=="off"){animateView(document.querySelector(".view:not(.hidden)")?.id.replace("view-","")||"dashboard");toast("Movimento criativo ativado.")}else toast("Movimento criativo desativado.")});
  document.addEventListener("distak:motion-controls",sync);
  document.addEventListener("distak:view-change",event=>animateView(event.detail?.view));
  document.addEventListener("distak:assistant-open",animateAssistant);
  document.addEventListener("distak:assistant-message",event=>animateMessage(event.detail?.node));
  new MutationObserver(entries=>entries.forEach(entry=>entry.target.open&&animateDialog(entry.target))).observe(document.body,{subtree:true,attributes:true,attributeFilter:["open"]});
  for(const query of ["(prefers-reduced-motion: reduce)","(forced-colors: active)"])matchMedia(query).addEventListener?.("change",()=>{sync();animateView(document.querySelector(".view:not(.hidden)")?.id.replace("view-","")||"dashboard")});
}
