const cfg = window.DISTAK_CONFIG || {};
const hasSupabaseConfig = cfg.supabaseUrl && !cfg.supabaseUrl.includes('COLE_AQUI') && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.includes('COLE_AQUI');
const supabaseClient = hasSupabaseConfig ? supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const menu = document.getElementById('menu');
const view = document.getElementById('view');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const userInfo = document.getElementById('userInfo');
const userRole = document.getElementById('userRole');
const logoutBtn = document.getElementById('logoutBtn');

let currentUser = null;
let currentProfile = null;

const menus = {
  admin: ['dashboard','clientes','obras','orcamentos','custos','pagamentos','funcionarios','relatorios','agenda','documentos','portal','administracao'],
  administrador: ['dashboard','clientes','obras','orcamentos','custos','pagamentos','funcionarios','relatorios','agenda','documentos','portal','administracao'],
  escritorio: ['dashboard','clientes','obras','orcamentos','pagamentos','relatorios','agenda','documentos'],
  encarregado: ['dashboard','obras','agenda','documentos','relatorios'],
  funcionario: ['dashboard-funcionario','minhas-obras','tarefas','fotografias','checkin','materiais','incidentes','perfil'],
  cliente: ['portal-cliente','fotografias','documentos','perfil']
};

const labels = {
  dashboard:'Dashboard', clientes:'Clientes', obras:'Obras', orcamentos:'Orçamentos', custos:'Custos', pagamentos:'Pagamentos', funcionarios:'Funcionários', relatorios:'Relatórios', agenda:'Agenda', documentos:'Documentos', portal:'Portal Cliente', administracao:'Administração',
  'dashboard-funcionario':'Painel Funcionário','minhas-obras':'Minhas Obras', tarefas:'Tarefas', fotografias:'Fotografias', checkin:'Check-in / Check-out', materiais:'Materiais', incidentes:'Incidentes', perfil:'Meu Perfil','portal-cliente':'Minha Obra'
};

const demoProfiles = {
  'geral@distaklda.com': { email:'geral@distaklda.com', nome:'José Filipe Alves Silva', role:'admin', ativo:true },
  'obras2015@distak.com': { email:'obras2015@distak.com', nome:'Funcionário Obras', role:'funcionario', ativo:true }
};

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMessage.textContent = '';
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      currentProfile = await loadProfile(currentUser.id, email);
    } else {
      currentUser = { email };
      currentProfile = demoProfiles[email] || { email, nome:'Utilizador Demo', role:'funcionario', ativo:true };
    }
    if (!currentProfile || currentProfile.ativo === false) throw new Error('Utilizador sem perfil ativo.');
    openApp();
  } catch (err) {
    loginMessage.textContent = 'Erro no login: ' + err.message;
  }
});

async function loadProfile(userId, email) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .or(`id.eq.${userId},email.eq.${email}`)
    .single();
  if (error) throw new Error('Perfil não encontrado na tabela profiles.');
  return data;
}

function roleOf(profile){ return (profile.role || profile.papel || 'funcionario').toLowerCase(); }

function openApp(){
  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  const role = roleOf(currentProfile);
  userRole.textContent = role;
  userInfo.innerHTML = `<strong>${currentProfile.nome || currentProfile.email}</strong><br>${currentProfile.email || currentUser.email}`;
  renderMenu(role);
  renderView((menus[role] || menus.funcionario)[0]);
}

function renderMenu(role){
  menu.innerHTML='';
  (menus[role] || menus.funcionario).forEach(key=>{
    const btn=document.createElement('button');
    btn.className='menu-btn';
    btn.textContent=labels[key] || key;
    btn.onclick=()=>renderView(key);
    menu.appendChild(btn);
  });
}

function renderView(key){
  document.querySelectorAll('.menu-btn').forEach(btn=>btn.classList.toggle('active', btn.textContent===labels[key]));
  pageTitle.textContent = labels[key] || 'Dashboard';
  pageSubtitle.textContent = subtitle(key);
  if(key==='dashboard') return adminDashboard();
  if(key==='dashboard-funcionario') return funcionarioDashboard();
  if(key==='clientes') return tableView('Clientes', ['Nome','NIF','Contacto','Email','Estado'], [['João Lerias','—','—','—','Ativo'],['Condomínio Malveira','—','—','—','Em curso']]);
  if(key==='obras') return tableView('Obras', ['Obra','Cliente','Morada','Estado','Responsável'], [['Telhado Malveira','Condomínio Malveira','Malveira','Em curso','Encarregado'],['Paço de Arcos','José Manuel','Travessa Forte São Pedro','Orçamento','José Filipe']]);
  if(key==='orcamentos') return tableView('Orçamentos', ['Nº','Cliente','Valor','Estado'], [['2389','Condomínio Malveira','4.800 €','Aceite'],['1996','Telhado Malveira','4.800 €','Aguarda sinal']]);
  if(key==='custos') return financeBlockedOrView('Custos');
  if(key==='pagamentos') return financeBlockedOrView('Pagamentos');
  if(key==='funcionarios') return tableView('Funcionários', ['Nome','Email','Perfil','Estado'], [['Funcionário Obras','obras2015@distak.com','funcionario','Ativo']]);
  if(key==='minhas-obras') return funcionarioObras();
  if(key==='tarefas') return tableView('Tarefas do Dia',['Obra','Tarefa','Prioridade'],[['Malveira','Verificar telhado e fotografar','Alta'],['Malveira','Limpeza e preparação','Normal']]);
  if(key==='fotografias') return uploadPanel('Fotografias da obra');
  if(key==='checkin') return checkinPanel();
  if(key==='materiais') return requestPanel('Pedido de material','Descreva o material necessário para a obra.');
  if(key==='incidentes') return requestPanel('Comunicar incidente / avaria','Descreva o problema, risco ou avaria encontrada.');
  if(key==='relatorios') return reportPanel();
  if(key==='agenda') return tableView('Agenda',['Data','Obra','Ação'],[['Hoje','Malveira','Equipa telhado'],['Amanhã','Paço de Arcos','Visita técnica']]);
  if(key==='documentos') return docsPanel();
  if(key==='portal' || key==='portal-cliente') return portalPanel();
  if(key==='administracao') return adminPanel();
  if(key==='perfil') return profilePanel();
}

function subtitle(key){ return key.includes('funcionario') || ['minhas-obras','tarefas','fotografias','checkin','materiais','incidentes','perfil'].includes(key) ? 'Área limitada ao funcionário' : 'Gestão da DISTAK Construção Civil'; }

function adminDashboard(){
  view.innerHTML = `<div class="grid"><div class="card"><h3>Obras ativas</h3><strong>7</strong></div><div class="card"><h3>Faturação mês</h3><strong>21.447 €</strong></div><div class="card"><h3>Custos</h3><strong>8.920 €</strong></div><div class="card"><h3>Lucro estimado</h3><strong>12.527 €</strong></div></div><div class="panel"><h3>Avisos</h3><p><span class="badge yellow">Ação</span> Telhado Malveira aguarda sinal.</p><p><span class="badge red">Urgente</span> Fatura M/59 em atraso.</p></div>`;
}
function funcionarioDashboard(){
  view.innerHTML = `<div class="grid"><div class="card"><h3>Minhas obras</h3><strong>2</strong></div><div class="card"><h3>Tarefas hoje</h3><strong>4</strong></div><div class="card"><h3>Fotos enviadas</h3><strong>12</strong></div><div class="card"><h3>Estado</h3><strong>Ativo</strong></div></div><div class="panel"><h3>Acesso Funcionário</h3><p>Este perfil não tem acesso a faturação, custos, lucros, clientes, pagamentos ou administração.</p><div class="actions"><button>Iniciar jornada</button><button class="ghost">Enviar fotografia</button><button class="ghost">Pedir material</button><button class="danger">Comunicar incidente</button></div></div>`;
}
function tableView(title, headers, rows){
  view.innerHTML = `<div class="panel"><h3>${title}</h3><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function funcionarioObras(){ tableView('Minhas Obras',['Obra','Morada','Tarefa','Contacto'],[['Telhado Malveira','Malveira','Fotografar avanço e limpar zona','Encarregado'],['Obra apoio','A definir','Aguardar instruções','Escritório']]); }
function financeBlockedOrView(title){ const role=roleOf(currentProfile); if(role==='funcionario') view.innerHTML='<div class="panel"><h3>Acesso negado</h3><p>O perfil funcionário não pode consultar dados financeiros.</p></div>'; else tableView(title,['Descrição','Valor','Estado'],[['Materiais','4.850 €','Registado'],['Mão de obra','8.500 €','Planeado']]); }
function uploadPanel(title){ view.innerHTML=`<div class="panel"><h3>${title}</h3><input type="file" multiple accept="image/*"><textarea placeholder="Observações da fotografia"></textarea><button>Guardar fotografia</button></div>`; }
function checkinPanel(){ view.innerHTML=`<div class="panel"><h3>Check-in / Check-out</h3><p>Registo simples para início e fim de jornada.</p><div class="actions"><button>Iniciar jornada</button><button class="ghost">Terminar jornada</button></div></div>`; }
function requestPanel(title, placeholder){ view.innerHTML=`<div class="panel"><h3>${title}</h3><textarea placeholder="${placeholder}"></textarea><button>Enviar pedido</button></div>`; }
function reportPanel(){ view.innerHTML=`<div class="panel"><h3>Relatórios</h3><p>Relatórios técnicos, fotografias e autos de trabalho.</p><button>Gerar relatório PDF</button></div>`; }
function docsPanel(){ view.innerHTML=`<div class="panel"><h3>Documentos</h3><p>Contratos, garantias, relatórios e documentos autorizados por obra.</p></div>`; }
function portalPanel(){ view.innerHTML=`<div class="panel"><h3>Portal Cliente</h3><p>Área para o cliente consultar a própria obra, fotos, relatórios, orçamentos e garantias.</p></div>`; }
function adminPanel(){ view.innerHTML=`<div class="panel"><h3>Administração</h3><p>Gestão de utilizadores, perfis, permissões e configurações.</p></div>`; }
function profilePanel(){ view.innerHTML=`<div class="panel"><h3>Meu Perfil</h3><p><strong>Nome:</strong> ${currentProfile.nome || ''}</p><p><strong>Email:</strong> ${currentProfile.email || currentUser.email}</p><p><strong>Perfil:</strong> ${roleOf(currentProfile)}</p></div>`; }

logoutBtn.addEventListener('click', async()=>{ if(supabaseClient) await supabaseClient.auth.signOut(); location.reload(); });
