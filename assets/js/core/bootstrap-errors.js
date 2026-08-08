window.addEventListener("error",event=>{
  const target=document.getElementById("loginError");
  if(target&&!document.getElementById("loginView")?.classList.contains("hidden"))target.textContent=`Erro ao iniciar: ${event.message} (${event.filename||"ficheiro desconhecido"}:${event.lineno||0}:${event.colno||0})`;
});
window.addEventListener("unhandledrejection",event=>{
  const target=document.getElementById("loginError");
  if(target&&!document.getElementById("loginView")?.classList.contains("hidden"))target.textContent=`Erro ao iniciar: ${event.reason?.message||event.reason}`;
});
