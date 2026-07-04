(() => {
  const cfg = window.DISTAK_CONFIG || {};
  const client = window.supabase?.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);

  const $ = (id) => document.getElementById(id);
  const el = {
    loginScreen: $('loginScreen'), appScreen: $('appScreen'), loginForm: $('loginForm'), loginMessage: $('loginMessage'),
    menu: $('menu'), view: $('view'), pageTitle: $('pageTitle'), pageSubtitle: $('pageSubtitle'), roleBadge: $('roleBadge'),
    userName: $('userName'), userEmail: $('userEmail'), logoutBtn: $('logoutBtn'), toast: $('toast')
  };

  let currentUser = null;
  let currentProfile = null;
  let clientesCache = [];
  let obrasCache = [];
  let activeView = 'dashboard';

  const ROLE_LABEL = { admin:'Administrador', administrador:'Administrador', funcionario:'Funcionário', cliente:'Cliente', escritorio:'Escritório', encarregado:'Encarregado' };
  const MENUS = {
    admin: [
      ['dashboard','🏠 Dashboard'], ['clientes','👥 Clientes'], ['obras','🏗 Obras'], ['orcamentos','💰 Orçamentos'],
      ['custos','💳 Custos'], ['pagamentos','💵 Pagamentos'], ['funcionarios','👷 Funcionários'], ['agenda','📅 Agenda'],
      ['fotografias','📷 Fotografias'], ['documentos','📄 Documentos'], ['relatorios','📊 Relatórios'], ['administracao','⚙ Administração']
    ],
    administrador: null,
    funcionario: [
      ['painelFuncionario','🏠 Painel'], ['minhasObras','🏗 Minhas Obras'], ['checkin','⏱ Check-in'], ['fotografias','📷 Fotografias'],
      ['materiais','📦 Pedir Material'], ['incidentes','⚠ Incidentes'], ['perfil','👤 Perfil']
    ],
    cliente: [['portal','🏠 Portal Cliente'], ['minhasObras','🏗 Minha Obra'], ['documentos','📄 Documentos'], ['perfil','👤 Perfil']]
  };
  MENUS.administrador = MENUS.admin;

  function normalizeRole(role){ return String(role || 'funcionario').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
  function isAdmin(){ return ['admin','administrador'].includes(normalizeRole(currentProfile?.role || currentProfile?.papel)); }
  function setPage(title, subtitle=''){ el.pageTitle.textContent = title; el.pageSubtitle.textContent = subtitle; }
  function toast(msg, error=false){ el.toast.textContent = msg; el.toast.className = 'toast' + (error ? ' error' : ''); setTimeout(()=>el.toast.classList.add('hidden'), 3200); }
  function showLogin(){ el.loginScreen.classList.remove('hidden'); el.appScreen.classList.add('hidden'); }
  function showApp(){ el.loginScreen.classList.add('hidden'); el.appScreen.classList.remove('hidden'); }
  function escapeHtml(value){ return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function estadoTag(estado){
    const e = String(estado || 'sem estado').toLowerCase();
    const cls = e.includes('concl') ? 'green' : e.includes('atras') ? 'red' : e.includes('exec') ? 'blue' : 'gold';
    return `<span class="tag ${cls}">${escapeHtml(estado || '—')}</span>`;
  }

  async function supa(query, fallbackMsg){
    const { data, error } = await query;
    if(error) throw new Error(error.message || fallbackMsg || 'Erro Supabase');
    return data;
  }

  async function getProfile(user){
    let profile = await supa(client.from('profiles').select('*').eq('id', user.id).maybeSingle(), 'Perfil não encontrado');
    if(!profile) profile = await supa(client.from('profiles').select('*').eq('email', user.email).maybeSingle(), 'Perfil não encontrado');
    if(!profile) throw new Error('Perfil não encontrado na tabela profiles.');
    return profile;
  }

  async function loadData(){
    clientesCache = await supa(client.from('clientes').select('*').order('nome', { ascending:true }), 'Erro ao carregar clientes');
    obrasCache = await supa(client.from('obras').select('*, clientes(nome)').order('nome', { ascending:true }), 'Erro ao carregar obras');
  }

  el.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.loginMessage.textContent = 'A entrar...';
    try{
      const email = $('email').value.trim();
      const password = $('password').value;
      const { data, error } = await client.auth.signInWithPassword({email, password});
      if(error) throw error;
      currentUser = data.user;
      currentProfile = await getProfile(currentUser);
      if(currentProfile.ativo === false) throw new Error('Utilizador inativo.');
      await loadData();
      renderShell();
      toast('Sessão iniciada com sucesso.');
    }catch(err){ el.loginMessage.textContent = err.message || 'Erro ao iniciar sessão.'; }
  });

  el.logoutBtn.addEventListener('click', async () => { await client.auth.signOut(); currentUser=null; currentProfile=null; showLogin(); });

  async function boot(){
    if(!client){ el.loginMessage.textContent = 'Supabase não configurado.'; showLogin(); return; }
    const { data } = await client.auth.getSession();
    if(data.session?.user){
      try{ currentUser = data.session.user; currentProfile = await getProfile(currentUser); await loadData(); renderShell(); return; }
      catch(e){ console.warn(e); }
    }
    showLogin();
  }

  function renderShell(){
    const role = normalizeRole(currentProfile.role || currentProfile.papel);
    const menuItems = MENUS[role] || MENUS.funcionario;
    el.roleBadge.textContent = ROLE_LABEL[role] || role;
    el.userName.textContent = currentProfile.nome || currentProfile.name || currentUser.email;
    el.userEmail.textContent = currentProfile.email || currentUser.email;
    el.menu.innerHTML = menuItems.map(([key,label]) => `<button data-view="${key}">${label}</button>`).join('');
    el.menu.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => renderView(btn.dataset.view)));
    showApp();
    renderView(menuItems[0][0]);
  }

  function activate(key){ el.menu.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.view === key)); }
  function renderView(key){
    activeView = key; activate(key);
    const routes = { dashboard, clientes, obras, orcamentos, custos, pagamentos, funcionarios, agenda, fotografias, documentos, relatorios, administracao, painelFuncionario, minhasObras, checkin, materiais, incidentes, perfil, portal };
    if(!isAdmin() && ['clientes','orcamentos','custos','pagamentos','funcionarios','administracao'].includes(key)) return blocked();
    (routes[key] || dashboard)();
  }

  function dashboard(){
    setPage('Dashboard', 'Resumo em tempo real');
    const total = obrasCache.length;
    const exec = obrasCache.filter(o => String(o.estado||'').toLowerCase().includes('exec')).length;
    const concl = obrasCache.filter(o => String(o.estado||'').toLowerCase().includes('concl')).length;
    const orc = obrasCache.filter(o => String(o.estado||'').toLowerCase().includes('orc')).length;
    el.view.innerHTML = `
      <div class="cards">
        <div class="card"><span>Clientes</span><strong>${clientesCache.length}</strong></div>
        <div class="card"><span>Obras</span><strong>${total}</strong></div>
        <div class="card"><span>Em execução</span><strong>${exec}</strong></div>
        <div class="card"><span>Concluídas</span><strong>${concl}</strong></div>
      </div>
      <div class="grid">
        <div class="panel"><h2>Obras recentes</h2>${obrasTable(obrasCache.slice(0,8), false)}</div>
        <div class="panel"><h2>Avisos</h2><p class="notice">Admin pode criar, editar e apagar clientes e obras.</p><p class="notice">Funcionário não vê custos, pagamentos ou administração.</p><p class="notice">Obras em orçamento: <strong>${orc}</strong></p></div>
      </div>`;
  }

  function clientes(){
    setPage('Clientes', 'Criar, editar, apagar e pesquisar clientes');
    el.view.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <input id="clienteSearch" class="search" placeholder="Pesquisar cliente, NIF ou email...">
          <div class="actions"><button id="novoClienteBtn" class="btn">+ Novo cliente</button><button id="refreshClientesBtn" class="btn secondary">Atualizar</button></div>
        </div>
        <div id="clienteFormWrap" class="hidden"></div>
        <div id="clientesTable"></div>
      </div>`;
    $('novoClienteBtn').onclick = () => showClienteForm();
    $('refreshClientesBtn').onclick = refresh;
    $('clienteSearch').oninput = renderClientesTable;
    renderClientesTable();
  }

  function showClienteForm(cliente={}){
    if(!isAdmin()) return blocked();
    $('clienteFormWrap').classList.remove('hidden');
    $('clienteFormWrap').innerHTML = `
      <h2>${cliente.id ? 'Editar cliente' : 'Novo cliente'}</h2>
      <form id="clienteForm" class="form-grid">
        <input id="clienteNome" placeholder="Nome" value="${escapeHtml(cliente.nome)}" required>
        <input id="clienteNif" placeholder="NIF" value="${escapeHtml(cliente.nif)}">
        <input id="clienteEmail" placeholder="Email" value="${escapeHtml(cliente.email)}">
        <textarea id="clienteMorada" placeholder="Morada / observações">${escapeHtml(cliente.morada)}</textarea>
        <div class="actions"><button class="btn" type="submit">Guardar cliente</button><button id="cancelClienteBtn" class="btn secondary" type="button">Cancelar</button></div>
      </form>`;
    $('cancelClienteBtn').onclick = () => $('clienteFormWrap').classList.add('hidden');
    $('clienteForm').onsubmit = async (e) => {
      e.preventDefault();
      const payload = { nome:$('clienteNome').value.trim(), nif:$('clienteNif').value.trim(), email:$('clienteEmail').value.trim(), morada:$('clienteMorada').value.trim() };
      if(!payload.nome) return toast('Indique o nome do cliente.', true);
      try{
        if(cliente.id) await supa(client.from('clientes').update(payload).eq('id', cliente.id).select(), 'Erro ao editar cliente');
        else await supa(client.from('clientes').insert(payload).select(), 'Erro ao criar cliente');
        toast(cliente.id ? 'Cliente atualizado.' : 'Cliente criado.');
        $('clienteFormWrap').classList.add('hidden');
        await refresh('clientes');
      }catch(err){ toast(err.message, true); }
    };
  }

  function renderClientesTable(){
    const q = ($('clienteSearch')?.value || '').toLowerCase();
    const rows = clientesCache.filter(c => [c.nome,c.nif,c.email,c.morada].join(' ').toLowerCase().includes(q));
    $('clientesTable').innerHTML = rows.length ? `<table><tr><th>Nome</th><th>NIF</th><th>Email</th><th>Morada</th><th>Ações</th></tr>${rows.map(c=>`
      <tr><td>${escapeHtml(c.nome)}</td><td>${escapeHtml(c.nif)}</td><td>${escapeHtml(c.email)}</td><td>${escapeHtml(c.morada)}</td><td class="actions"><button class="btn small secondary" data-edit-cliente="${c.id}">Editar</button><button class="btn small danger" data-del-cliente="${c.id}">Apagar</button></td></tr>`).join('')}</table>` : '<div class="empty">Nenhum cliente encontrado.</div>';
    document.querySelectorAll('[data-edit-cliente]').forEach(b => b.onclick = () => showClienteForm(clientesCache.find(c => String(c.id) === b.dataset.editCliente)));
    document.querySelectorAll('[data-del-cliente]').forEach(b => b.onclick = () => deleteCliente(b.dataset.delCliente));
  }

  async function deleteCliente(id){
    if(!isAdmin()) return blocked();
    const c = clientesCache.find(x => String(x.id) === String(id));
    if(!confirm(`Apagar cliente "${c?.nome || id}"?`)) return;
    try{ await supa(client.from('clientes').delete().eq('id', id), 'Erro ao apagar cliente'); toast('Cliente apagado.'); await refresh('clientes'); }
    catch(err){ toast(err.message, true); }
  }

  function obras(){
    setPage('Obras', 'Criar, editar, apagar e acompanhar obras');
    el.view.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <input id="obraSearch" class="search" placeholder="Pesquisar obra, cliente, morada ou estado...">
          <div class="actions"><button id="novaObraBtn" class="btn">+ Nova obra</button><button id="refreshObrasBtn" class="btn secondary">Atualizar</button></div>
        </div>
        <div id="obraFormWrap" class="hidden"></div>
        <div id="obrasTable"></div>
      </div>`;
    $('novaObraBtn').onclick = () => showObraForm();
    $('refreshObrasBtn').onclick = refresh;
    $('obraSearch').oninput = renderObrasTable;
    renderObrasTable();
  }

  function showObraForm(obra={}){
    if(!isAdmin()) return blocked();
    $('obraFormWrap').classList.remove('hidden');
    const options = clientesCache.map(c => `<option value="${c.id}" ${String(c.id)===String(obra.cliente_id)?'selected':''}>${escapeHtml(c.nome)}</option>`).join('');
    $('obraFormWrap').innerHTML = `
      <h2>${obra.id ? 'Editar obra' : 'Nova obra'}</h2>
      <form id="obraForm" class="form-grid">
        <select id="obraCliente" required><option value="">Selecionar cliente</option>${options}</select>
        <input id="obraNome" placeholder="Nome da obra" value="${escapeHtml(obra.nome)}" required>
        <input id="obraEstado" placeholder="Estado" value="${escapeHtml(obra.estado || 'Orçamento')}">
        <textarea id="obraMorada" placeholder="Morada da obra">${escapeHtml(obra.morada)}</textarea>
        <div class="actions"><button class="btn" type="submit">Guardar obra</button><button id="cancelObraBtn" class="btn secondary" type="button">Cancelar</button></div>
      </form>`;
    $('cancelObraBtn').onclick = () => $('obraFormWrap').classList.add('hidden');
    $('obraForm').onsubmit = async (e) => {
      e.preventDefault();
      const payload = { cliente_id:$('obraCliente').value, nome:$('obraNome').value.trim(), morada:$('obraMorada').value.trim(), estado:$('obraEstado').value.trim() || 'Orçamento' };
      if(!payload.cliente_id || !payload.nome) return toast('Indique cliente e nome da obra.', true);
      try{
        if(obra.id) await supa(client.from('obras').update(payload).eq('id', obra.id).select(), 'Erro ao editar obra');
        else await supa(client.from('obras').insert(payload).select(), 'Erro ao criar obra');
        toast(obra.id ? 'Obra atualizada.' : 'Obra criada.');
        $('obraFormWrap').classList.add('hidden');
        await refresh('obras');
      }catch(err){ toast(err.message, true); }
    };
  }

  function renderObrasTable(){
    const q = ($('obraSearch')?.value || '').toLowerCase();
    const rows = obrasCache.filter(o => [o.nome,o.morada,o.estado,o.clientes?.nome].join(' ').toLowerCase().includes(q));
    $('obrasTable').innerHTML = obrasTable(rows, true);
    document.querySelectorAll('[data-edit-obra]').forEach(b => b.onclick = () => showObraForm(obrasCache.find(o => String(o.id) === b.dataset.editObra)));
    document.querySelectorAll('[data-del-obra]').forEach(b => b.onclick = () => deleteObra(b.dataset.delObra));
  }

  function obrasTable(rows, actions){
    return rows.length ? `<table><tr><th>Obra</th><th>Cliente</th><th>Morada</th><th>Estado</th>${actions?'<th>Ações</th>':''}</tr>${rows.map(o=>`
      <tr><td>${escapeHtml(o.nome)}</td><td>${escapeHtml(o.clientes?.nome || clienteNome(o.cliente_id) || '—')}</td><td>${escapeHtml(o.morada)}</td><td>${estadoTag(o.estado)}</td>${actions?`<td class="actions"><button class="btn small secondary" data-edit-obra="${o.id}">Editar</button><button class="btn small danger" data-del-obra="${o.id}">Apagar</button></td>`:''}</tr>`).join('')}</table>` : '<div class="empty">Nenhuma obra encontrada.</div>';
  }
  function clienteNome(id){ return clientesCache.find(c => String(c.id) === String(id))?.nome; }

  async function deleteObra(id){
    if(!isAdmin()) return blocked();
    const o = obrasCache.find(x => String(x.id) === String(id));
    if(!confirm(`Apagar obra "${o?.nome || id}"?`)) return;
    try{ await supa(client.from('obras').delete().eq('id', id), 'Erro ao apagar obra'); toast('Obra apagada.'); await refresh('obras'); }
    catch(err){ toast(err.message, true); }
  }

  async function refresh(next=activeView){
    try{ await loadData(); renderView(next); toast('Dados atualizados.'); }
    catch(err){ toast(err.message, true); }
  }

  function painelFuncionario(){ setPage('Painel Funcionário','Área limitada'); el.view.innerHTML = `<div class="cards"><div class="card"><span>Minhas obras</span><strong>${obrasCache.length}</strong></div><div class="card"><span>Tarefas</span><strong>0</strong></div><div class="card"><span>Fotos</span><strong>0</strong></div><div class="card"><span>Estado</span><strong>Ativo</strong></div></div><div class="panel"><h2>Acesso Funcionário</h2><p>Sem acesso a clientes, custos, pagamentos, orçamentos, funcionários ou administração.</p></div>`; }
  function minhasObras(){ setPage('Minhas Obras','Obras disponíveis para consulta'); el.view.innerHTML = `<div class="panel"><h2>Obras</h2>${obrasTable(obrasCache, false)}</div>`; }
  function checkin(){ setPage('Check-in / Check-out','Registo de jornada'); el.view.innerHTML = `<div class="panel"><div class="actions"><button class="btn">Iniciar jornada</button><button class="btn secondary">Terminar jornada</button></div><p class="muted">Este módulo será ligado ao GPS na próxima fase.</p></div>`; }
  function fotografias(){ setPage('Fotografias','Registo fotográfico'); el.view.innerHTML = `<div class="panel"><input type="file" multiple accept="image/*"><p class="muted">Upload real será ligado ao Supabase Storage na fase de documentos.</p></div>`; }
  function materiais(){ setPage('Materiais','Pedidos de material'); el.view.innerHTML = `<div class="panel"><div class="form-grid"><input placeholder="Material"><input placeholder="Quantidade"><textarea placeholder="Observações"></textarea></div><br><button class="btn">Enviar pedido</button></div>`; }
  function incidentes(){ setPage('Incidentes','Comunicar problemas'); el.view.innerHTML = `<div class="panel"><div class="form-grid"><input placeholder="Tipo"><textarea placeholder="Descreva o incidente"></textarea></div><br><button class="btn danger">Comunicar</button></div>`; }
  function perfil(){ setPage('Perfil','Dados do utilizador'); el.view.innerHTML = `<div class="panel"><h2>${escapeHtml(currentProfile.nome || 'Utilizador')}</h2><p>Email: ${escapeHtml(currentProfile.email || currentUser.email)}</p><p>Perfil: ${escapeHtml(ROLE_LABEL[normalizeRole(currentProfile.role || currentProfile.papel)] || currentProfile.role)}</p></div>`; }
  function portal(){ setPage('Portal Cliente','Área do cliente'); el.view.innerHTML = `<div class="panel"><p>O cliente verá apenas obras, documentos e fotografias autorizados.</p></div>`; }
  function orcamentos(){ setPage('Orçamentos','Próxima fase'); placeholder('Módulo de orçamentos será ligado após Clientes e Obras ficarem 100% concluídos.'); }
  function custos(){ setPage('Custos','Próxima fase'); placeholder('Aqui serão registados materiais, subempreiteiros, logística e mão de obra.'); }
  function pagamentos(){ setPage('Pagamentos','Próxima fase'); placeholder('Aqui ficará o controlo de faturas, recebimentos e valores em atraso.'); }
  function funcionarios(){ setPage('Funcionários','Próxima fase'); placeholder('Aqui poderás gerir funcionários, perfis, horários e permissões.'); }
  function agenda(){ setPage('Agenda','Próxima fase'); placeholder('Calendário de obras, visitas, tarefas e equipas.'); }
  function documentos(){ setPage('Documentos','Próxima fase'); placeholder('Contratos, garantias, relatórios e fotografias serão anexados por obra.'); }
  function relatorios(){ setPage('Relatórios','Próxima fase'); placeholder('Relatórios técnicos e PDFs automáticos.'); }
  function administracao(){ setPage('Administração','Próxima fase'); placeholder('Gestão de utilizadores, permissões e configurações do ERP.'); }
  function placeholder(txt){ el.view.innerHTML = `<div class="panel"><h2>Em desenvolvimento</h2><p>${escapeHtml(txt)}</p></div>`; }
  function blocked(){ setPage('Acesso bloqueado','Permissão insuficiente'); el.view.innerHTML = `<div class="panel"><h2>Acesso bloqueado</h2><p>O seu perfil não tem autorização para ver esta área.</p></div>`; }

  boot();
})();
