(() => {
  const cfg = window.DISTAK_CONFIG || {};
  const hasConfig = cfg.SUPABASE_URL && cfg.SUPABASE_KEY;
  const client = hasConfig && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY) : null;

  const $ = (id) => document.getElementById(id);
  const loginScreen = $('loginScreen');
  const appScreen = $('appScreen');
  const loginForm = $('loginForm');
  const loginMessage = $('loginMessage');
  const menu = $('menu');
  const view = $('view');
  const pageTitle = $('pageTitle');
  const pageSubtitle = $('pageSubtitle');
  const roleBadge = $('roleBadge');
  const userName = $('userName');
  const userEmail = $('userEmail');
  const logoutBtn = $('logoutBtn');

  let currentUser = null;
  let currentProfile = null;

  const labels = {
    admin:'Administrador', administrador:'Administrador', escritorio:'Escritório', encarregado:'Encarregado', funcionario:'Funcionário', cliente:'Cliente'
  };

  const permissions = {
    admin:['dashboard','clientes','obras','orcamentos','custos','pagamentos','funcionarios','documentos','relatorios','agenda','portal','administracao'],
    administrador:['dashboard','clientes','obras','orcamentos','custos','pagamentos','funcionarios','documentos','relatorios','agenda','portal','administracao'],
    escritorio:['dashboard','clientes','obras','orcamentos','pagamentos','documentos','relatorios','agenda'],
    encarregado:['dashboard','obras','tarefas','fotografias','materiais','incidentes','documentos','agenda'],
    funcionario:['painel-funcionario','minhas-obras','tarefas','fotografias','checkin','materiais','incidentes','perfil'],
    cliente:['portal','minhas-obras','fotografias','documentos','perfil']
  };

  const menuLabels = {
    dashboard:'Dashboard', clientes:'Clientes', obras:'Obras', orcamentos:'Orçamentos', custos:'Custos', pagamentos:'Pagamentos', funcionarios:'Funcionários', documentos:'Documentos', relatorios:'Relatórios', agenda:'Agenda', portal:'Portal Cliente', administracao:'Administração',
    'painel-funcionario':'Painel Funcionário', 'minhas-obras':'Minhas Obras', tarefas:'Tarefas', fotografias:'Fotografias', checkin:'Check-in / Check-out', materiais:'Materiais', incidentes:'Incidentes', perfil:'Meu Perfil'
  };

  function normalizeRole(role){ return String(role || 'funcionario').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
  function money(v){ return Number(v||0).toLocaleString('pt-PT',{style:'currency',currency:'EUR'}); }
  function setPage(title, subtitle){ pageTitle.textContent = title; pageSubtitle.textContent = subtitle || ''; }

  function showLogin(){ loginScreen.classList.remove('hidden'); appScreen.classList.add('hidden'); }
  function showApp(){ loginScreen.classList.add('hidden'); appScreen.classList.remove('hidden'); }

  async function getProfile(user){
    if(!client || !user) return demoProfile(user?.email || 'demo@distaklda.com');
    const { data, error } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if(data) return data;
    const byEmail = await client.from('profiles').select('*').eq('email', user.email).maybeSingle();
    if(byEmail.data) return byEmail.data;
    throw new Error(error?.message || byEmail.error?.message || 'Perfil não encontrado na tabela profiles.');
  }

  function demoProfile(email){
    return email === 'obras2015@distak.com'
      ? {email,nome:'Funcionário Obras',role:'funcionario',ativo:true}
      : {email,nome:'José Filipe Alves Silva',role:'admin',ativo:true};
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); loginMessage.textContent = 'A entrar...';
    const email = $('email').value.trim(); const password = $('password').value;
    try{
      let user;
      if(client){
        const { data, error } = await client.auth.signInWithPassword({email,password});
        if(error) throw error;
        user = data.user;
      } else { user = { email, id:'demo' }; }
      currentUser = user; currentProfile = await getProfile(user);
      if(currentProfile.ativo === false) throw new Error('Utilizador inativo.');
      renderApp();
    }catch(err){ loginMessage.textContent = err.message || 'Erro ao iniciar sessão.'; }
  });

  logoutBtn.addEventListener('click', async () => { if(client) await client.auth.signOut(); currentUser=null; currentProfile=null; showLogin(); });

  async function boot(){
    if(client){
      const { data } = await client.auth.getSession();
      if(data.session?.user){
        try{ currentUser=data.session.user; currentProfile=await getProfile(currentUser); renderApp(); return; }catch(e){ console.warn(e); }
      }
    }
    showLogin();
  }

  function renderApp(){
    const role = normalizeRole(currentProfile.role || currentProfile.papel);
    const available = permissions[role] || permissions.funcionario;
    roleBadge.textContent = labels[role] || role;
    userName.textContent = currentProfile.nome || currentProfile.name || currentUser.email;
    userEmail.textContent = currentProfile.email || currentUser.email;
    menu.innerHTML = '';
    available.forEach((key, idx) => {
      const btn = document.createElement('button'); btn.textContent = menuLabels[key] || key; btn.onclick = () => renderView(key); menu.appendChild(btn); if(idx===0) btn.classList.add('active');
    });
    showApp(); renderView(available[0]);
  }

  function activate(key){ [...menu.children].forEach(b=>b.classList.toggle('active', b.textContent === (menuLabels[key]||key))); }

  function renderView(key){ activate(key); view.innerHTML=''; const role = normalizeRole(currentProfile.role || currentProfile.papel);
    if(role === 'funcionario' && ['clientes','custos','pagamentos','funcionarios','administracao','orcamentos'].includes(key)) return renderBlocked();
    const routes = {dashboard,clientes,obras,orcamentos,custos,pagamentos,funcionarios,documentos,relatorios,agenda,portal,administracao,
      'painel-funcionario':funcPainel,'minhas-obras':minhasObras,tarefas,fotografias,checkin,materiais,incidentes,perfil};
    (routes[key] || dashboard)();
  }

  function dashboard(){ setPage('Dashboard','Visão geral da empresa'); view.innerHTML = `
    <div class="cards"><div class="card"><span>Obras ativas</span><strong>7</strong></div><div class="card"><span>Faturação mês</span><strong>${money(21447.62)}</strong></div><div class="card"><span>Custos registados</span><strong>${money(8920)}</strong></div><div class="card"><span>Lucro estimado</span><strong>${money(12527.62)}</strong></div></div>
    <div class="grid"><div class="panel"><h2>Obras principais</h2>${obrasTable(true)}</div><div class="panel"><h2>Avisos</h2><p class="notice">Funcionários não têm acesso a custos, pagamentos, lucros ou administração.</p><p class="notice">Fatura M/59 em atraso: 2.560,44 €.</p></div></div>`; }
  function funcPainel(){ setPage('Painel Funcionário','Área limitada ao funcionário'); view.innerHTML = `<div class="cards"><div class="card"><span>Minhas obras</span><strong>2</strong></div><div class="card"><span>Tarefas hoje</span><strong>4</strong></div><div class="card"><span>Fotos enviadas</span><strong>12</strong></div><div class="card"><span>Estado</span><strong>Ativo</strong></div></div><div class="panel"><h2>Acesso Funcionário</h2><p>Este perfil não tem acesso a faturação, custos, lucros, clientes, pagamentos ou administração.</p><div class="actions"><button class="btn">Iniciar jornada</button><button class="btn secondary">Enviar fotografia</button><button class="btn secondary">Pedir material</button><button class="btn danger">Comunicar incidente</button></div></div>`; }
  function obrasTable(values){ const rows=window.DISTAK_SAMPLE.obras.map(o=>`<tr><td>${o.id}</td><td>${o.cliente}</td><td>${o.morada}</td><td><span class="tag gold">${o.estado}</span></td>${values?`<td>${money(o.valor)}</td>`:''}</tr>`).join(''); return `<table><tr><th>Nº</th><th>Cliente</th><th>Morada</th><th>Estado</th>${values?'<th>Valor</th>':''}</tr>${rows}</table>`; }
  function clientes(){ setPage('Clientes','Gestão de clientes'); view.innerHTML=`<div class="panel"><h2>Clientes</h2><div class="form-grid"><input placeholder="Nome"><input placeholder="NIF"><input placeholder="Email"><input placeholder="Telefone"><textarea placeholder="Morada / Observações"></textarea></div><br><button class="btn">Guardar cliente</button><table><tr><th>Cliente</th><th>NIF</th><th>Contacto</th></tr><tr><td>Condomínio Malveira</td><td>—</td><td>Administração</td></tr></table></div>`; }
  function obras(){ setPage('Obras','Gestão operacional'); view.innerHTML=`<div class="panel"><h2>Obras</h2>${obrasTable(true)}</div>`; }
  function orcamentos(){ setPage('Orçamentos','Criação e aprovação'); view.innerHTML=`<div class="panel"><h2>Novo orçamento</h2><div class="form-grid"><input placeholder="Cliente"><input placeholder="Morada da obra"><input placeholder="Valor sem IVA"><textarea placeholder="Descrição técnica dos trabalhos"></textarea></div><br><button class="btn">Gerar orçamento</button></div>`; }
  function custos(){ setPage('Custos','Materiais, subempreiteiros e logística'); view.innerHTML=`<div class="panel"><h2>Registo de custos</h2><div class="form-grid"><input placeholder="Obra"><input placeholder="Categoria"><input placeholder="Valor"><textarea placeholder="Observação"></textarea></div><br><button class="btn">Guardar custo</button></div>`; }
  function pagamentos(){ setPage('Pagamentos','Controlo financeiro'); view.innerHTML=`<div class="panel"><h2>Pagamentos e faturas</h2><table><tr><th>Fatura</th><th>Cliente</th><th>Total</th><th>Estado</th></tr><tr><td>M/59</td><td>Rua Veiga Beirão</td><td>${money(2560.44)}</td><td><span class="tag red">Em atraso</span></td></tr></table></div>`; }
  function funcionarios(){ setPage('Funcionários','Equipa e permissões'); view.innerHTML=`<div class="panel"><h2>Funcionários</h2><table><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Estado</th></tr><tr><td>Funcionário Obras</td><td>obras2015@distak.com</td><td>funcionario</td><td><span class="tag green">Ativo</span></td></tr></table></div>`; }
  function documentos(){ setPage('Documentos','Contratos, garantias e relatórios'); view.innerHTML=`<div class="panel"><h2>Documentos</h2><p>Área para anexar contratos, garantias, fotos antes/depois e relatórios técnicos.</p><button class="btn secondary">Anexar documento</button></div>`; }
  function relatorios(){ setPage('Relatórios','Relatórios técnicos e PDF'); view.innerHTML=`<div class="panel"><h2>Relatório técnico</h2><textarea style="width:100%;min-height:150px;border:1px solid #dbe3ef;border-radius:12px;padding:12px" placeholder="Descrição técnica, patologias, trabalhos executados e conclusão..."></textarea><br><br><button class="btn">Gerar PDF</button></div>`; }
  function agenda(){ setPage('Agenda','Calendário de obras'); view.innerHTML=`<div class="panel"><h2>Agenda</h2><table><tr><th>Dia</th><th>Obra</th><th>Equipa</th></tr><tr><td>Hoje</td><td>Malveira</td><td>Funcionário Obras</td></tr></table></div>`; }
  function portal(){ setPage('Portal Cliente','Área reservada ao cliente'); view.innerHTML=`<div class="panel"><h2>Portal Cliente</h2><p>Cliente vê apenas a sua obra, fotografias, orçamento, faturas, garantias e relatórios autorizados.</p></div>`; }
  function administracao(){ setPage('Administração','Utilizadores e configurações'); view.innerHTML=`<div class="panel"><h2>Administração</h2><p>Gestão de perfis, permissões, empresa, backups e configurações do ERP.</p></div>`; }
  function minhasObras(){ setPage('Minhas Obras','Obras atribuídas ao funcionário'); view.innerHTML=`<div class="panel"><h2>Minhas obras</h2>${obrasTable(false)}</div>`; }
  function tarefas(){ setPage('Tarefas','Tarefas do dia'); view.innerHTML=`<div class="panel"><h2>Tarefas de hoje</h2><ul>${window.DISTAK_SAMPLE.tarefas.map(t=>`<li>${t}</li>`).join('')}</ul></div>`; }
  function fotografias(){ setPage('Fotografias','Registo fotográfico da obra'); view.innerHTML=`<div class="panel"><h2>Enviar fotografias</h2><input type="file" multiple accept="image/*"><p>As fotografias serão associadas à obra selecionada.</p></div>`; }
  function checkin(){ setPage('Check-in / Check-out','Registo de jornada'); view.innerHTML=`<div class="panel"><h2>Registo de presença</h2><div class="actions"><button class="btn">Iniciar jornada</button><button class="btn secondary">Terminar jornada</button></div></div>`; }
  function materiais(){ setPage('Materiais','Pedidos e materiais atribuídos'); view.innerHTML=`<div class="panel"><h2>Pedir material</h2><div class="form-grid"><input placeholder="Obra"><input placeholder="Material"><input placeholder="Quantidade"><textarea placeholder="Observação"></textarea></div><br><button class="btn">Enviar pedido</button></div>`; }
  function incidentes(){ setPage('Incidentes','Comunicar avarias ou problemas'); view.innerHTML=`<div class="panel"><h2>Comunicar incidente</h2><div class="form-grid"><input placeholder="Obra"><input placeholder="Tipo de incidente"><textarea placeholder="Descreva o problema"></textarea></div><br><button class="btn danger">Comunicar</button></div>`; }
  function perfil(){ setPage('Meu Perfil','Dados do utilizador'); view.innerHTML=`<div class="panel"><h2>${currentProfile.nome||'Utilizador'}</h2><p>Email: ${currentProfile.email||currentUser.email}</p><p>Perfil: ${labels[normalizeRole(currentProfile.role || currentProfile.papel)]}</p></div>`; }
  function renderBlocked(){ setPage('Acesso bloqueado','Permissão insuficiente'); view.innerHTML=`<div class="panel"><h2>Acesso bloqueado</h2><p>O seu perfil não tem autorização para ver esta área.</p></div>`; }
  boot();
})();
