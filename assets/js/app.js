
const cfg=window.DISTAK_CONFIG;
const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_KEY);
let profile=null,clientes=[],obras=[];

const $=id=>document.getElementById(id);
function toast(msg,type="ok"){const t=$("toast");t.textContent=msg;t.className="toast show"+(type==="error"?" error":"");setTimeout(()=>t.className="toast",2500)}
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function setView(id){document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));$(id).classList.remove("hidden");document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===id));$("pageTitle").textContent=id.charAt(0).toUpperCase()+id.slice(1)}
function applyRole(){document.querySelectorAll(".admin-only").forEach(e=>e.classList.toggle("hidden",profile.role!=="admin"));document.querySelectorAll(".funcionario-only").forEach(e=>e.classList.toggle("hidden",profile.role!=="funcionario"))}
async function getProfile(uid){const {data,error}=await db.from("profiles").select("*").eq("id",uid).single();if(error)throw error;return data}

async function loadClientes(){
 const {data,error}=await db.from("clientes").select("*").order("nome");if(error)throw error;clientes=data||[];renderClientes(clientes)
}
function renderClientes(rows){
 $("clientesTable").innerHTML=rows.length?`<table><thead><tr><th>Nome</th><th>NIF</th><th>Email</th><th>Morada</th><th>Ações</th></tr></thead><tbody>${rows.map(c=>`<tr><td>${esc(c.nome)}</td><td>${esc(c.nif||"")}</td><td>${esc(c.email||"")}</td><td>${esc(c.morada||"")}</td><td><div class="row-actions"><button class="btn small light" data-edit-cliente="${c.id}">Editar</button><button class="btn small danger" data-del-cliente="${c.id}">Apagar</button></div></td></tr>`).join("")}</tbody></table>`:"<p>Sem clientes.</p>"
}
function openCliente(c=null){$("clienteId").value=c?.id||"";$("clienteNome").value=c?.nome||"";$("clienteNif").value=c?.nif||"";$("clienteMorada").value=c?.morada||"";$("clienteEmail").value=c?.email||"";$("clienteTitle").textContent=c?"Editar cliente":"Novo cliente";$("clienteDialog").showModal()}
async function saveCliente(e){e.preventDefault();const id=$("clienteId").value;const payload={nome:$("clienteNome").value.trim(),nif:$("clienteNif").value.trim()||null,morada:$("clienteMorada").value.trim()||null,email:$("clienteEmail").value.trim()||null};const q=id?db.from("clientes").update(payload).eq("id",id):db.from("clientes").insert(payload);const {error}=await q;if(error)return toast(error.message,"error");$("clienteDialog").close();toast("Cliente guardado.");await refresh()}
async function deleteCliente(id){if(!confirm("Apagar este cliente?"))return;const {error}=await db.from("clientes").delete().eq("id",id);if(error)return toast("Não foi possível apagar. Pode ter obras associadas.","error");toast("Cliente apagado.");await refresh()}

async function loadObras(){
 const {data,error}=await db.from("obras").select("*,clientes(nome)").order("nome");if(error)throw error;obras=data||[];renderObras(obras)
}
function renderObras(rows){
 $("obrasTable").innerHTML=rows.length?`<table><thead><tr><th>Obra</th><th>Cliente</th><th>Morada</th><th>Estado</th><th>Ações</th></tr></thead><tbody>${rows.map(o=>`<tr><td>${esc(o.nome)}</td><td>${esc(o.clientes?.nome||"")}</td><td>${esc(o.morada||"")}</td><td><span class="badge">${esc(o.estado||"")}</span></td><td><div class="row-actions"><button class="btn small light" data-edit-obra="${o.id}">Editar</button><button class="btn small danger" data-del-obra="${o.id}">Apagar</button></div></td></tr>`).join("")}</tbody></table>`:"<p>Sem obras.</p>"
}
function openObra(o=null){$("obraId").value=o?.id||"";$("obraClienteId").innerHTML='<option value="">Selecionar cliente</option>'+clientes.map(c=>`<option value="${c.id}" ${String(c.id)===String(o?.cliente_id)?"selected":""}>${esc(c.nome)}</option>`).join("");$("obraNome").value=o?.nome||"";$("obraMorada").value=o?.morada||"";$("obraEstado").value=o?.estado||"Orçamento";$("obraTitle").textContent=o?"Editar obra":"Nova obra";$("obraDialog").showModal()}
async function saveObra(e){e.preventDefault();const id=$("obraId").value;const payload={cliente_id:$("obraClienteId").value,nome:$("obraNome").value.trim(),morada:$("obraMorada").value.trim()||null,estado:$("obraEstado").value};const q=id?db.from("obras").update(payload).eq("id",id):db.from("obras").insert(payload);const {error}=await q;if(error)return toast(error.message,"error");$("obraDialog").close();toast("Obra guardada.");await refresh()}
async function deleteObra(id){if(!confirm("Apagar esta obra?"))return;const {error}=await db.from("obras").delete().eq("id",id);if(error)return toast(error.message,"error");toast("Obra apagada.");await refresh()}

function renderDashboard(){
 $("statClientes").textContent=clientes.length;$("statObras").textContent=obras.length;$("statExecucao").textContent=obras.filter(o=>(o.estado||"").toLowerCase().includes("execu")).length;$("statConcluidas").textContent=obras.filter(o=>(o.estado||"").toLowerCase().includes("conclu")).length;
 $("dashboardObras").innerHTML=obras.length?`<table><thead><tr><th>Obra</th><th>Cliente</th><th>Estado</th></tr></thead><tbody>${obras.slice(0,8).map(o=>`<tr><td>${esc(o.nome)}</td><td>${esc(o.clientes?.nome||"")}</td><td>${esc(o.estado||"")}</td></tr>`).join("")}</tbody></table>`:"<p>Sem obras.</p>"
}
async function refresh(){await loadClientes();await loadObras();renderDashboard();if(profile.role==="funcionario")$("funcionarioObras").innerHTML=$("obrasTable").innerHTML}

async function enter(user){profile=await getProfile(user.id);if(!profile.ativo)throw new Error("Utilizador inativo");$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");$("userInfo").innerHTML=`<strong>${esc(profile.nome||user.email)}</strong><br><small>${esc(profile.role)}</small>`;applyRole();await refresh();setView(profile.role==="funcionario"?"funcionario":"dashboard")}

$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginError").textContent="";const {data,error}=await db.auth.signInWithPassword({email:$("loginEmail").value.trim(),password:$("loginPassword").value});if(error)return $("loginError").textContent=error.message;try{await enter(data.user)}catch(err){$("loginError").textContent=err.message}})
$("logoutBtn").addEventListener("click",async()=>{await db.auth.signOut();location.reload()})
document.querySelector("nav").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)setView(b.dataset.view)})
$("novoClienteBtn").addEventListener("click",()=>openCliente())
$("novaObraBtn").addEventListener("click",()=>openObra())
$("clienteForm").addEventListener("submit",saveCliente)
$("obraForm").addEventListener("submit",saveObra)
$("clienteSearch").addEventListener("input",e=>{const q=e.target.value.toLowerCase();renderClientes(clientes.filter(c=>[c.nome,c.nif,c.email,c.morada].some(v=>String(v||"").toLowerCase().includes(q))))})
$("obraSearch").addEventListener("input",e=>{const q=e.target.value.toLowerCase();renderObras(obras.filter(o=>[o.nome,o.morada,o.estado,o.clientes?.nome].some(v=>String(v||"").toLowerCase().includes(q))))})
$("clientesTable").addEventListener("click",e=>{if(e.target.dataset.editCliente)openCliente(clientes.find(c=>String(c.id)===e.target.dataset.editCliente));if(e.target.dataset.delCliente)deleteCliente(e.target.dataset.delCliente)})
$("obrasTable").addEventListener("click",e=>{if(e.target.dataset.editObra)openObra(obras.find(o=>String(o.id)===e.target.dataset.editObra));if(e.target.dataset.delObra)deleteObra(e.target.dataset.delObra)})
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).close()))

db.auth.getSession().then(async({data})=>{if(data.session)try{await enter(data.session.user)}catch(e){console.error(e)}})
