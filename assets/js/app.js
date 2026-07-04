/* DISTAK ERP v1.2 - Dashboard, Clientes e Obras ligados ao Supabase */
(function () {
  'use strict';

  const cfg = window.DISTAK_CONFIG || {};
  const supabaseUrl = cfg.SUPABASE_URL;
  const supabaseKey = cfg.SUPABASE_KEY || cfg.SUPABASE_ANON_KEY;
  const hasConfig = !!(supabaseUrl && supabaseKey && window.supabase);
  const db = hasConfig ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

  let currentUser = null;
  let currentProfile = null;
  let clientesCache = [];
  let obrasCache = [];

  const $ = (id) => document.getElementById(id);
  const view = $('view');
  const loginScreen = $('loginScreen');
  const appScreen = $('appScreen');
  const loginForm = $('loginForm');
  const loginMessage = $('loginMessage');
  const menu = $('menu');
  const pageTitle = $('pageTitle');
  const pageSubtitle = $('pageSubtitle');
  const userInfo = $('userInfo');
  const userRole = $('userRole');
  const logoutBtn = $('logoutBtn');

  const roles = {
    admin: {
      label: 'Administrador',
      menus: ['dashboard', 'clientes', 'obras', 'orcamentos', 'custos', 'pagamentos', 'funcionarios', 'relatorios', 'agenda', 'documentos', 'administracao'],
    },
    funcionario: {
      label: 'Funcionário',
      menus: ['dashboardFuncionario', 'minhasObras', 'tarefas', 'fotografias', 'checkin', 'materiais', 'incidentes', 'meuPerfil'],
    },
    escritorio: {
      label: 'Escritório',
      menus: ['dashboard', 'clientes', 'obras', 'orcamentos', 'pagamentos', 'relatorios', 'agenda', 'documentos'],
    },
    encarregado: {
      label: 'Encarregado',
      menus: ['dashboardFuncionario', 'minhasObras', 'tarefas', 'fotografias', 'checkin', 'materiais', 'incidentes'],
    },
    cliente: {
      label: 'Cliente',
      menus: ['portalCliente', 'minhasObras', 'fotografias', 'documentos', 'meuPerfil'],
    },
  };

  const menuLabels = {
    dashboard: 'Dashboard',
    clientes: 'Clientes',
    obras: 'Obras',
    orcamentos: 'Orçamentos',
    custos: 'Custos',
    pagamentos: 'Pagamentos',
    funcionarios: 'Funcionários',
    relatorios: 'Relatórios',
    agenda: 'Agenda',
    documentos: 'Documentos',
    administracao: 'Administração',
    dashboardFuncionario: 'Painel Funcionário',
    minhasObras: 'Minhas Obras',
    tarefas: 'Tarefas',
    fotografias: 'Fotografias',
    checkin: 'Check-in / Check-out',
    materiais: 'Materiais',
    incidentes: 'Incidentes',
    meuPerfil: 'Meu Perfil',
    portalCliente: 'Portal Cliente',
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[c]));
  }

  function money(value) {
    const n = Number(value || 0);
    return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  }

  function setMessage(text, type = 'info') {
    if (!loginMessage) return;
    loginMessage.textContent = text || '';
    loginMessage.className = type ? `message ${type}` : 'message';
  }

  function setPage(title, subtitle) {
    if (pageTitle) pageTitle.textContent = title || '';
    if (pageSubtitle) pageSubtitle.textContent = subtitle || '';
  }

  async function loadProfile(user) {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Este utilizador não tem perfil configurado na tabela profiles.');
    if (data.ativo === false) throw new Error('Este utilizador está desativado.');
    return data;
  }

  async function signIn(email, password) {
    if (!db) throw new Error('Configuração Supabase em falta. Verifica assets/js/config.js.');
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    currentUser = data.user;
    currentProfile = await loadProfile(data.user);
    await showApp();
  }

  async function signOut() {
    if (db) await db.auth.signOut();
    currentUser = null;
    currentProfile = null;
    if (appScreen) appScreen.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'flex';
    setMessage('');
  }

  async function hydrateSession() {
    if (!db) return;
    const { data } = await db.auth.getSession();
    if (!data.session) return;
    currentUser = data.session.user;
    try {
      currentProfile = await loadProfile(currentUser);
      await showApp();
    } catch (err) {
      await db.auth.signOut();
      setMessage(err.message, 'error');
    }
  }

  async function showApp() {
    if (loginScreen) loginScreen.style.display = 'none';
    if (appScreen) appScreen.style.display = 'grid';
    const role = currentProfile?.role || 'funcionario';
    const roleConfig = roles[role] || roles.funcionario;

    if (userInfo) userInfo.textContent = currentProfile?.nome || currentUser?.email || '';
    if (userRole) userRole.textContent = roleConfig.label;

    renderMenu(roleConfig.menus);
    await loadBaseData();
    const firstPage = role === 'admin' || role === 'escritorio' ? 'dashboard' : 'dashboardFuncionario';
    renderPage(firstPage);
  }

  function renderMenu(items) {
    if (!menu) return;
    menu.innerHTML = '';
    items.forEach((key, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.page = key;
      btn.textContent = menuLabels[key] || key;
      if (index === 0) btn.classList.add('active');
      btn.addEventListener('click', () => {
        [...menu.querySelectorAll('button')].forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderPage(key);
      });
      menu.appendChild(btn);
    });
  }

  async function loadBaseData() {
    if (!db) return;
    const [clientesRes, obrasRes] = await Promise.all([
      db.from('clientes').select('*').order('nome', { ascending: true }),
      db.from('obras').select('*, clientes(nome)').order('nome', { ascending: true }),
    ]);
    if (!clientesRes.error) clientesCache = clientesRes.data || [];
    if (!obrasRes.error) obrasCache = obrasRes.data || [];
  }

  function countObrasByEstado(word) {
    return obrasCache.filter((o) => String(o.estado || '').toLowerCase().includes(word.toLowerCase())).length;
  }

  function renderPage(key) {
    switch (key) {
      case 'dashboard': return renderDashboard();
      case 'clientes': return renderClientes();
      case 'obras': return renderObras();
      case 'dashboardFuncionario': return renderFuncionarioDashboard();
      case 'minhasObras': return renderMinhasObras();
      case 'tarefas': return renderPlaceholder('Tarefas', 'Tarefas atribuídas ao utilizador.', 'As tarefas serão ligadas à tabela de tarefas na próxima fase.');
      case 'fotografias': return renderPlaceholder('Fotografias', 'Envio e consulta de fotografias por obra.', 'Na próxima fase vamos criar upload para Supabase Storage.');
      case 'checkin': return renderCheckin();
      case 'materiais': return renderPlaceholder('Materiais', 'Pedidos e registo de material usado.', 'Esta área será ligada ao módulo de materiais.');
      case 'incidentes': return renderPlaceholder('Incidentes', 'Comunicar avarias, riscos e ocorrências.', 'Esta área será ligada à tabela de incidentes.');
      case 'orcamentos': return renderPlaceholder('Orçamentos', 'Gestão de orçamentos.', 'Módulo reservado ao administrador.');
      case 'custos': return renderPlaceholder('Custos', 'Custos, compras e margens.', 'Módulo reservado ao administrador.');
      case 'pagamentos': return renderPlaceholder('Pagamentos', 'Pagamentos e faturação.', 'Módulo reservado ao administrador.');
      case 'funcionarios': return renderPlaceholder('Funcionários', 'Gestão de colaboradores.', 'Módulo reservado ao administrador.');
      case 'relatorios': return renderPlaceholder('Relatórios', 'Relatórios técnicos e financeiros.', 'Módulo de PDF será adicionado depois.');
      case 'agenda': return renderPlaceholder('Agenda', 'Agenda de obras e equipas.', 'Calendário será ativado na fase seguinte.');
      case 'documentos': return renderPlaceholder('Documentos', 'Contratos, garantias e ficheiros.', 'Upload de documentos será ligado ao Storage.');
      case 'administracao': return renderAdministracao();
      case 'portalCliente': return renderPlaceholder('Portal Cliente', 'Área do cliente.', 'O cliente verá apenas as suas obras e documentos.');
      case 'meuPerfil': return renderMeuPerfil();
      default: return renderDashboard();
    }
  }

  function renderDashboard() {
    setPage('Dashboard', 'Visão geral da DISTAK');
    const emOrcamento = countObrasByEstado('orçamento');
    const emAtraso = countObrasByEstado('atraso');
    const concluidas = countObrasByEstado('conclu');
    const execucao = obrasCache.length - emOrcamento - concluidas;
    view.innerHTML = `
      <div class="cards">
        ${card('Clientes', clientesCache.length)}
        ${card('Obras', obrasCache.length)}
        ${card('Em orçamento', emOrcamento)}
        ${card('Em atraso', emAtraso)}
      </div>
      <div class="panel">
        <h2>Obras recentes</h2>
        ${obrasTable(obrasCache)}
      </div>
      <div class="panel">
        <h2>Resumo operacional</h2>
        <div class="cards small">
          ${card('Em execução', execucao < 0 ? 0 : execucao)}
          ${card('Concluídas', concluidas)}
          ${card('Clientes ativos', clientesCache.length)}
          ${card('Última atualização', new Date().toLocaleDateString('pt-PT'))}
        </div>
      </div>`;
  }

  function renderClientes() {
    setPage('Clientes', 'Gestão de clientes');
    view.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <h2>Clientes</h2>
          <button class="primary" id="novoClienteBtn">Novo cliente</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>NIF</th><th>Morada</th><th>Email</th><th>Ações</th></tr></thead>
            <tbody>${clientesCache.map(clienteRow).join('') || '<tr><td colspan="5">Sem clientes.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
    $('novoClienteBtn')?.addEventListener('click', () => openClienteForm());
    view.querySelectorAll('[data-edit-cliente]').forEach((btn) => btn.addEventListener('click', () => openClienteForm(btn.dataset.editCliente)));
    view.querySelectorAll('[data-del-cliente]').forEach((btn) => btn.addEventListener('click', () => deleteCliente(btn.dataset.delCliente)));
  }

  function clienteRow(c) {
    return `<tr>
      <td>${escapeHtml(c.nome)}</td>
      <td>${escapeHtml(c.nif)}</td>
      <td>${escapeHtml(c.morada)}</td>
      <td>${escapeHtml(c.email)}</td>
      <td><button data-edit-cliente="${c.id}">Editar</button> <button class="danger" data-del-cliente="${c.id}">Apagar</button></td>
    </tr>`;
  }

  function renderObras() {
    setPage('Obras', 'Gestão de obras');
    view.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <h2>Obras</h2>
          <button class="primary" id="novaObraBtn">Nova obra</button>
        </div>
        ${obrasTable(obrasCache, true)}
      </div>`;
    $('novaObraBtn')?.addEventListener('click', () => openObraForm());
    view.querySelectorAll('[data-edit-obra]').forEach((btn) => btn.addEventListener('click', () => openObraForm(btn.dataset.editObra)));
    view.querySelectorAll('[data-del-obra]').forEach((btn) => btn.addEventListener('click', () => deleteObra(btn.dataset.delObra)));
  }

  function obrasTable(rows, actions = false) {
    return `<div class="table-wrap"><table>
      <thead><tr><th>Obra</th><th>Cliente</th><th>Morada</th><th>Estado</th>${actions ? '<th>Ações</th>' : ''}</tr></thead>
      <tbody>${rows.map((o) => `<tr>
        <td>${escapeHtml(o.nome)}</td>
        <td>${escapeHtml(o.clientes?.nome || clienteName(o.cliente_id))}</td>
        <td>${escapeHtml(o.morada)}</td>
        <td><span class="badge">${escapeHtml(o.estado)}</span></td>
        ${actions ? `<td><button data-edit-obra="${o.id}">Editar</button> <button class="danger" data-del-obra="${o.id}">Apagar</button></td>` : ''}
      </tr>`).join('') || `<tr><td colspan="${actions ? 5 : 4}">Sem obras.</td></tr>`}</tbody>
    </table></div>`;
  }

  function clienteName(id) {
    return clientesCache.find((c) => c.id === id)?.nome || '';
  }

  function renderFuncionarioDashboard() {
    setPage('Painel Funcionário', 'Área limitada ao funcionário');
    view.innerHTML = `
      <div class="cards">
        ${card('Minhas obras', obrasCache.length)}
        ${card('Tarefas hoje', 0)}
        ${card('Fotos enviadas', 0)}
        ${card('Estado', 'Ativo')}
      </div>
      <div class="panel">
        <h2>Acesso Funcionário</h2>
        <p>Este perfil não tem acesso a faturação, custos, lucros, clientes, pagamentos ou administração.</p>
        <div class="actions">
          <button class="primary" onclick="alert('Jornada iniciada. Na próxima fase será gravada no Supabase.')">Iniciar jornada</button>
          <button onclick="alert('Upload de fotografias será ativado na próxima fase.')">Enviar fotografia</button>
          <button onclick="alert('Pedido de material será ativado na próxima fase.')">Pedir material</button>
          <button class="danger" onclick="alert('Comunicação de incidente será ativada na próxima fase.')">Comunicar incidente</button>
        </div>
      </div>`;
  }

  function renderMinhasObras() {
    setPage('Minhas Obras', 'Obras atribuídas ao funcionário');
    view.innerHTML = `<div class="panel"><h2>Minhas obras</h2>${obrasTable(obrasCache)}</div>`;
  }

  function renderCheckin() {
    setPage('Check-in / Check-out', 'Registo de jornada');
    view.innerHTML = `<div class="panel">
      <h2>Registo de jornada</h2>
      <p>Regista entrada e saída do funcionário. A gravação em base de dados será ativada na fase de horários.</p>
      <div class="actions">
        <button class="primary" onclick="alert('Check-in registado localmente. Próxima fase: gravar no Supabase.')">Check-in</button>
        <button onclick="alert('Check-out registado localmente. Próxima fase: gravar no Supabase.')">Check-out</button>
      </div>
    </div>`;
  }

  function renderMeuPerfil() {
    setPage('Meu Perfil', 'Dados da conta');
    view.innerHTML = `<div class="panel">
      <h2>${escapeHtml(currentProfile?.nome)}</h2>
      <p><strong>Email:</strong> ${escapeHtml(currentProfile?.email || currentUser?.email)}</p>
      <p><strong>Perfil:</strong> ${escapeHtml(currentProfile?.role)}</p>
      <p><strong>Estado:</strong> ${currentProfile?.ativo ? 'Ativo' : 'Inativo'}</p>
    </div>`;
  }

  function renderAdministracao() {
    setPage('Administração', 'Configurações e utilizadores');
    view.innerHTML = `<div class="panel">
      <h2>Administração</h2>
      <p>Perfis ativos no Supabase:</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Ativo</th></tr></thead>
        <tbody><tr><td>${escapeHtml(currentProfile?.nome)}</td><td>${escapeHtml(currentProfile?.email)}</td><td>${escapeHtml(currentProfile?.role)}</td><td>${currentProfile?.ativo ? 'Sim' : 'Não'}</td></tr></tbody>
      </table></div>
      <p class="muted">Na próxima fase esta área permitirá criar utilizadores diretamente pelo ERP.</p>
    </div>`;
  }

  function renderPlaceholder(title, subtitle, text) {
    setPage(title, subtitle);
    view.innerHTML = `<div class="panel"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></div>`;
  }

  function card(label, value) {
    return `<div class="card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function modal(html) {
    const old = $('distakModal');
    if (old) old.remove();
    const div = document.createElement('div');
    div.id = 'distakModal';
    div.className = 'modal-backdrop';
    div.innerHTML = `<div class="modal">${html}</div>`;
    document.body.appendChild(div);
    div.addEventListener('click', (e) => { if (e.target === div) div.remove(); });
    return div;
  }

  function closeModal() {
    $('distakModal')?.remove();
  }

  function openClienteForm(id) {
    const c = clientesCache.find((x) => x.id === id) || {};
    modal(`<h2>${id ? 'Editar cliente' : 'Novo cliente'}</h2>
      <form id="clienteForm" class="grid-form">
        <label>Nome<input name="nome" required value="${escapeHtml(c.nome)}"></label>
        <label>NIF<input name="nif" value="${escapeHtml(c.nif)}"></label>
        <label>Morada<input name="morada" value="${escapeHtml(c.morada)}"></label>
        <label>Email<input name="email" type="email" value="${escapeHtml(c.email)}"></label>
        <div class="actions"><button type="button" onclick="document.getElementById('distakModal').remove()">Cancelar</button><button class="primary">Guardar</button></div>
      </form>`);
    $('clienteForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      const result = id ? await db.from('clientes').update(payload).eq('id', id) : await db.from('clientes').insert(payload);
      if (result.error) return alert(result.error.message);
      closeModal();
      await loadBaseData();
      renderClientes();
    });
  }

  async function deleteCliente(id) {
    if (!confirm('Apagar este cliente?')) return;
    const { error } = await db.from('clientes').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadBaseData();
    renderClientes();
  }

  function openObraForm(id) {
    const o = obrasCache.find((x) => x.id === id) || {};
    modal(`<h2>${id ? 'Editar obra' : 'Nova obra'}</h2>
      <form id="obraForm" class="grid-form">
        <label>Cliente<select name="cliente_id" required>${clientesCache.map((c) => `<option value="${c.id}" ${c.id === o.cliente_id ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('')}</select></label>
        <label>Nome da obra<input name="nome" required value="${escapeHtml(o.nome)}"></label>
        <label>Morada<input name="morada" value="${escapeHtml(o.morada)}"></label>
        <label>Estado<input name="estado" value="${escapeHtml(o.estado || 'Orçamento')}"></label>
        <div class="actions"><button type="button" onclick="document.getElementById('distakModal').remove()">Cancelar</button><button class="primary">Guardar</button></div>
      </form>`);
    $('obraForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      const result = id ? await db.from('obras').update(payload).eq('id', id) : await db.from('obras').insert(payload);
      if (result.error) return alert(result.error.message);
      closeModal();
      await loadBaseData();
      renderObras();
    });
  }

  async function deleteObra(id) {
    if (!confirm('Apagar esta obra?')) return;
    const { error } = await db.from('obras').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadBaseData();
    renderObras();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setMessage('A entrar...', 'info');
      const email = e.target.email?.value || e.target.querySelector('input[type="email"]')?.value;
      const password = e.target.password?.value || e.target.querySelector('input[type="password"]')?.value;
      try {
        await signIn(email, password);
      } catch (err) {
        setMessage(err.message || 'Erro ao iniciar sessão.', 'error');
      }
    });
  }

  if (logoutBtn) logoutBtn.addEventListener('click', signOut);

  document.addEventListener('DOMContentLoaded', hydrateSession);
})();
