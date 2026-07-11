export const $=id=>document.getElementById(id);
export const esc=(v="")=>String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
export const money=n=>new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(Number(n||0));
export function toast(m,t=""){const e=$("toast");e.textContent=m;e.className="toast show"+(t==="error"?" error":"");setTimeout(()=>e.className="toast",2500)}
export function setView(v){document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));$(`view-${v}`).classList.remove("hidden");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===v));$("pageTitle").textContent=v[0].toUpperCase()+v.slice(1)}
