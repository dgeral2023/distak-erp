import {toast} from "./ui.js";

export function initPwa(){
  if(!("serviceWorker" in navigator))return;
  window.addEventListener("load",async()=>{
    try{
      const registration=await navigator.serviceWorker.register("./service-worker.js",{scope:"./"});
      registration.addEventListener("updatefound",()=>{
        const worker=registration.installing;
        worker?.addEventListener("statechange",()=>{
          if(worker.state==="installed"&&navigator.serviceWorker.controller)toast("Nova versão do DISTAK preparada. Será aplicada ao reabrir.");
        });
      });
    }catch(error){console.warn("Aplicação instalável indisponível:",error?.message||error)}
  });
}
