let lastTrigger=null;

const controlLabels={agendaStateFilter:"Filtrar agenda por estado",agendaPriorityFilter:"Filtrar agenda por prioridade",operationalStateFilter:"Filtrar obras por estado",purchaseWorkFilter:"Filtrar compras por obra",purchaseStateFilter:"Filtrar compras por estado",measurementWorkFilter:"Filtrar autos por obra",measurementStateFilter:"Filtrar autos por estado",dossierStatusFilter:"Filtrar dossiês por qualidade",forecastTypeFilter:"Filtrar previsões por tipo",forecastStateFilter:"Filtrar previsões por estado",funcionarioEstadoFiltro:"Filtrar funcionários por estado",safetyBackupFile:"Selecionar cópia de segurança para verificar",crmMoradaTipo:"Tipo de morada",crmComunicacaoTipo:"Tipo de comunicação",crmComunicacaoData:"Data da comunicação",crmDocumentoCategoria:"Categoria do documento",crmDocumentoFicheiro:"Selecionar documento do cliente"};

function labelControls(){
  document.querySelectorAll("input:not([type='hidden']),select,textarea").forEach(control=>{
    const id=control.id,hasLabel=control.hasAttribute("aria-label")||control.hasAttribute("aria-labelledby")||control.closest("label")||(id&&document.querySelector(`label[for="${id}"]`));
    if(hasLabel)return;
    const placeholder=control.getAttribute("placeholder")?.replace(/[…]+$/g,"").trim();
    control.setAttribute("aria-label",controlLabels[id]||placeholder||"Campo do formulário");
  });
}

function labelDialog(dialog,index){
  dialog.setAttribute("aria-modal","true");
  if(dialog.hasAttribute("aria-label")||dialog.hasAttribute("aria-labelledby"))return;
  const title=dialog.querySelector("h1,h2,h3");
  if(title){title.id||=`dialog-title-${index+1}`;dialog.setAttribute("aria-labelledby",title.id)}
  else dialog.setAttribute("aria-label","Janela do DISTAK ERP");
}

export function initAccessibility(){
  labelControls();
  document.addEventListener("pointerdown",event=>{const trigger=event.target.closest("button,a,[role='button']");if(trigger)lastTrigger=trigger},true);
  document.addEventListener("click",event=>{const trigger=event.target.closest("button,a,[role='button']");if(trigger)lastTrigger=trigger},true);
  document.querySelectorAll("dialog").forEach((dialog,index)=>{
    labelDialog(dialog,index);
    const observer=new MutationObserver(()=>{if(dialog.open)dialog._returnFocus=lastTrigger||document.activeElement});
    observer.observe(dialog,{attributes:true,attributeFilter:["open"]});
    dialog.addEventListener("close",()=>{const target=dialog._returnFocus;if(target?.isConnected&&!target.disabled)setTimeout(()=>target.focus(),0)});
  });
  document.querySelectorAll('[role="dialog"]:not(dialog)').forEach(panel=>{let wasOpen=panel.getAttribute("aria-hidden")==="false";const observer=new MutationObserver(()=>{const open=panel.getAttribute("aria-hidden")==="false"&&!panel.classList.contains("hidden");if(open&&!wasOpen)panel._returnFocus=lastTrigger;if(!open&&wasOpen){const target=panel._returnFocus;if(target?.isConnected&&!target.disabled)setTimeout(()=>target.focus(),0)}wasOpen=open});observer.observe(panel,{attributes:true,attributeFilter:["aria-hidden","class"]})});
  document.addEventListener("keydown",event=>{
    const modal=[...document.querySelectorAll('[role="dialog"][aria-modal="true"]:not(dialog)')].find(node=>node.getAttribute("aria-hidden")==="false"&&!node.classList.contains("hidden"));
    if(event.key==="Tab"&&modal){const focusable=[...modal.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(node=>node.offsetParent!==null);if(focusable.length){const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){last.focus();event.preventDefault()}else if(!event.shiftKey&&document.activeElement===last){first.focus();event.preventDefault()}}return}
    if(event.key!=="Escape"||document.querySelector("dialog[open]"))return;
    if(modal){modal.querySelector("[data-close-mobile-sheet],[aria-label^='Fechar']")?.click();event.preventDefault();return}
    for(const [panel,button] of [["notificationPanel","notificationBtn"],["accountPanel","topUserMenu"]]){const node=document.getElementById(panel);if(node&&!node.classList.contains("hidden")){node.classList.add("hidden");node.setAttribute("aria-hidden","true");const trigger=document.getElementById(button);trigger?.setAttribute("aria-expanded","false");trigger?.focus();event.preventDefault();break}}
  });
}
