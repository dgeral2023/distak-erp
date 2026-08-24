import {toast} from "./ui.js";

function showUpdateNotice(){
  if(document.querySelector(".pwa-update-notice"))return;
  const notice=document.createElement("aside");
  notice.className="pwa-update-notice";
  notice.setAttribute("role","status");
  notice.innerHTML='<div><strong>Nova versão</strong><small>Atualize após guardar</small></div><button type="button">Atualizar</button><button class="pwa-update-dismiss" type="button" aria-label="Fechar aviso">×</button>';
  notice.querySelector("button").onclick=()=>location.reload();
  notice.querySelector(".pwa-update-dismiss").onclick=()=>notice.remove();
  document.body.appendChild(notice);
}

export function initPwa(){
  if(!("serviceWorker" in navigator))return;
  window.addEventListener("load",async()=>{
    try{
      const registration=await navigator.serviceWorker.register("./service-worker.js",{scope:"./"});
      registration.addEventListener("updatefound",()=>{
        const worker=registration.installing;
        worker?.addEventListener("statechange",()=>{
          if(worker.state==="installed"&&navigator.serviceWorker.controller){toast("Nova versão do DISTAK preparada.");showUpdateNotice()}
        });
      });
    }catch(error){console.warn("Aplicação instalável indisponível:",error?.message||error)}
  });
}
