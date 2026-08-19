import {toast} from "./ui.js";

function showUpdateNotice(){
  if(document.querySelector(".pwa-update-notice"))return;
  const notice=document.createElement("aside");
  notice.className="pwa-update-notice";
  notice.setAttribute("role","status");
  notice.innerHTML='<div><strong>Nova versão preparada</strong><small>Atualize para receber as correções mais recentes.</small></div><button type="button">Atualizar agora</button>';
  notice.querySelector("button").onclick=()=>location.reload();
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
