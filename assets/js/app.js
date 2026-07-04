/* DISTAK ERP - app.js v1.2
   Controlo de login, perfis e permissões com Supabase
   Perfis suportados: admin, administrador, escritorio, encarregado, funcionario, cliente
*/

(function () {
  'use strict';

  const cfg = window.DISTAK_CONFIG || {};
  const SUPABASE_URL = cfg.SUPABASE_URL;
  const SUPABASE_KEY = cfg.SUPABASE_KEY;

  let supabaseClient = null;
  let currentUser = null;
  let currentProfile = null;

  const ROLE_ALIASES = {
    admin: 'admin',
    administrador: 'admin',
    escritorio: 'escritorio',
    escritório: 'escritorio',
    encarregado: 'encarregado',
    funcionario: 'funcionario',
    funcionário: 'funcionario',
    cliente: 'cliente'
  };

  const ROLE_LABELS = {
    admin: 'Administrador',
    escritorio: 'Escritório',
    encarregado: 'Encarregado',
    funcionario: 'Funcionário',
    cliente: 'Cliente'
  };

  const PERMISSIONS = {
    admin: {
      modules: ['dashboard', 'clientes', 'obras', 'orcamentos', 'custos', 'pagamentos', 'funcionarios', 'documentos', 'relatorios', 'agenda', 'portal-cliente', 'administracao'],
      canSeeFinancial: true,
      canEdit: true,
      canAdmin: true
    },
    escritorio: {
      modules: ['dashboard', 'clientes', 'obras', 'orcamentos', 'custos', 'pagamentos', 'documentos', 'relatorios', 'agenda'],
      canSeeFinancial: true,
      canEdit: true,
      canAdmin: false
    },
    encarregado: {
      modules: ['dashboard', 'obras', 'documentos', 'relatorios', 'agenda'],
      canSeeFinancial: false,
      canEdit: true,
      canAdmin: false
    },
    funcionario: {
      modules: ['dashboard-funcionario', 'minhas-obras', 'tarefas', 'checkin', 'fotografias', 'materiais', 'documentos-autorizados', 'perfil'],
      canSeeFinancial: false,
      canEdit: false,
      canAdmin: false
    },
    cliente: {
      modules: ['portal-cliente', 'minhas-obras', 'fotografias', 'documentos-autorizados', 'perfil'],
      canSeeFinancial: false,
      canEdit: false,
      canAdmin: false
    }
  };

  const DEMO_DATA = {
    obras: [
      { id: 'O001', cliente: 'Condomínio Malveira', morada: 'Malveira', estado: 'Em curso', responsavel: 'José Filipe', funcionarioEmail: 'obras2015@distak.com', tarefa: 'Revisão de cobertura e recolha fotográfica' },
      { id: 'O002', cliente: 'Paço de Arcos', morada: 'Paço de Arcos', estado: 'Orçamento enviado', responsavel: 'José Filipe', funcionarioEmail: '', tarefa: 'Aguardar adjudicação' },
      { id: 'O003', cliente: 'Rua Veiga Beirão', morada: 'Almada', estado: 'Pagamento em atraso', responsavel: 'Escritório', funcionarioEmail: '', tarefa: 'Cobrança e acompanhamento' }
    ],
    clientes: [
      { nome: 'Condomínio Malveira', contacto: 'Administração', estado: 'Ativo' },
      { nome: 'José Manuel Rosado Gambôa', contacto: 'Cliente', estado: 'Em análise' }
    ],
    orcamentos: [
      { numero: '1996', cliente: 'Condomínio Malveira', valor: '4.800,00 €', estado: 'Aguarda sinal' },
      { numero: '2389', cliente: 'Condomínio Malveira', valor: '—', estado: 'Aceite' }
    ]
  };

  function normalizeRole(role) {
    if (!role) return 'funcionario';
    const key = String(role).trim().toLowerCase();
    return ROLE_ALIASES[key] || key;
  }

  function qs(selector) { return document.querySelector(selector); }
  function qsa(selector) { return Array.from(document.querySelectorAll(selector)); }

  function initSupabase() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      showMessage('Configuração Supabase em falta no ficheiro assets/js/config.js.', 'error');
      return false;
    }

    if (!window.supabase || !window.supabase.createClient) {
      showMessage('Biblioteca Supabase não carregada. Confirma o script no index.html.', 'error');
      return false;
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return true;
  }

  function showMessage(text, type = 'info') {
    let box = qs('#app-message');
    if (!box) {
      box = document.createElement('div');
      box.id = 'app-message';
      box.style.position = 'fixed';
      box.style.right = '20px';
      box.style.bottom = '20px';
      box.style.zIndex = '9999';
      box.style.padding = '14px 16px';
      box.style.borderRadius = '12px';
      box.style.boxShadow = '0 12px 35px rgba(0,0,0,.18)';
      box.style.fontWeight = '700';
      document.body.appendChild(box);
    }

    const colors = {
      info: ['#0f172a', '#fff'],
      success: ['#15803d', '#fff'],
      error: ['#b91c1c', '#fff'],
      warning: ['#ca8a04', '#111827']
    };
    const [bg, color] = colors[type] || colors.info;
    box.style.background = bg;
    box.style.color = color;
    box.textContent = text;
    box.hidden = false;
    clearTimeout(box._timer);
    box._timer = setTimeout(() => { box.hidden = true; }, 4500);
  }

  function getLoginFields() {
    return {
      email: qs('#email') || qs('input[type="email"]') || qs('input[name="email"]'),
      password: qs('#password') || qs('input[type="password"]') || qs('input[name="password"]'),
      form: qs('#login-form') || qs('form'),
      button: qs('#login-button') || qs('button[type="submit"]') || qs('button')
    };
  }

  async function login(email, password) {
    if (!supabaseClient && !initSupabase()) return;
    if (!email || !password) {
      showMessage('Insere email e palavra-passe.', 'warning');
      return;
    }

    setLoading(true);
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      showMessage('Login inválido: ' + error.message, 'error');
      return;
    }

    currentUser = data.user;
    await loadProfileAndRender();
  }

  async function logout() {
    if (supabaseClient) await supabaseClient.auth.signOut();
    currentUser = null;
    currentProfile = null;
    localStorage.removeItem('distak_current_role');
    renderLogin();
  }

  function setLoading(isLoading) {
    const { button } = getLoginFields();
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = isLoading ? 'A entrar...' : 'Entrar';
  }

  async function loadProfileAndRender() {
    if (!currentUser) return renderLogin();

    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (error) {
      showMessage('Erro ao carregar perfil: ' + error.message, 'error');
      return;
    }

    if (!profile) {
      showMessage('Perfil não encontrado na tabela profiles.', 'error');
      await supabaseClient.auth.signOut();
      return renderLogin();
    }

    const role = normalizeRole(profile.role || profile.papel || profile.tipo);
    currentProfile = { ...profile, role };
    localStorage.setItem('distak_current_role', role);
    renderApp(role);
  }

  function renderLogin() {
    const app = qs('#app') || document.body;
    app.innerHTML = `
      <main class="login-page">
        <section class="login-card">
          <div class="brand-row">
            <div class="logo-box small">D</div>
            <div>
              <h1>DISTAK ERP</h1>
              <p>Gestão profissional de obras</p>
            </div>
          </div>
          <form id="login-form" class="login-form">
            <h2>Entrar na aplicação</h2>
            <label>Email</label>
            <input id="email" type="email" placeholder="Digite o seu email" autocomplete="username" required>
            <label>Palavra-passe</label>
            <input id="password" type="password" placeholder="Digite a sua senha" autocomplete="current-password" required>
            <button id="login-button" type="submit">Entrar</button>
            <p class="muted">Perfis: Administrador · Escritório · Encarregado · Funcionário · Cliente</p>
          </form>
        </section>
      </main>`;
    bindLogin();
  }

  function bindLogin() {
    const { form, email, password } = getLoginFields();
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      login(email.value.trim(), password.value);
    });
  }

  function moduleLabel(module) {
    const labels = {
      dashboard: 'Dashboard',
      'dashboard-funcionario': 'Painel Funcionário',
      clientes: 'Clientes',
      obras: 'Obras',
      'minhas-obras': 'Minhas Obras',
      tarefas: 'Tarefas',
      checkin: 'Check-in / Check-out',
      fotografias: 'Fotografias',
      materiais: 'Materiais',
      orcamentos: 'Orçamentos',
      custos: 'Custos',
      pagamentos: 'Pagamentos',
      funcionarios: 'Funcionários',
      documentos: 'Documentos',
      'documentos-autorizados': 'Documentos',
      relatorios: 'Relatórios',
      agenda: 'Agenda',
      'portal-cliente': 'Portal Cliente',
      administracao: 'Administração',
      perfil: 'Perfil'
    };
    return labels[module] || module;
  }

  function renderApp(role) {
    const app = qs('#app') || document.body;
    const permissions = PERMISSIONS[role] || PERMISSIONS.funcionario;
    const name = currentProfile?.nome || currentUser?.email || 'Utilizador';

    app.innerHTML = `
      <div class="erp-shell">
        <aside class="sidebar">
          <div class="brand-row side-brand">
            <div class="logo-box small">D</div>
            <div><strong>DISTAK ERP</strong><span>${ROLE_LABELS[role] || role}</span></div>
          </div>
          <nav id="main-menu">
            ${permissions.modules.map((m, i) => `<button class="menu-item ${i === 0 ? 'active' : ''}" data-module="${m}">${moduleLabel(m)}</button>`).join('')}
          </nav>
          <button id="logout-button" class="logout-button">Sair</button>
        </aside>
        <main class="main-content">
          <header class="topbar">
            <div><h1 id="page-title">${moduleLabel(permissions.modules[0])}</h1><p>${name}</p></div>
            <span class="badge">${ROLE_LABELS[role] || role}</span>
          </header>
          <section id="module-content"></section>
        </main>
      </div>`;

    bindAppEvents();
    renderModule(permissions.modules[0], role);
  }

  function bindAppEvents() {
    qsa('.menu-item').forEach(btn => {
      btn.addEventListener('click', () => {
        qsa('.menu-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderModule(btn.dataset.module, currentProfile.role);
      });
    });
    const logoutBtn = qs('#logout-button');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
  }

  function renderModule(module, role) {
    const title = qs('#page-title');
    const content = qs('#module-content');
    if (!content) return;
    if (title) title.textContent = moduleLabel(module);

    if (role === 'funcionario') return renderFuncionarioModule(module, content);
    if (role === 'cliente') return renderClienteModule(module, content);
    return renderAdminModule(module, content, role);
  }

  function card(title, value, note = '') {
    return `<div class="card"><span>${title}</span><strong>${value}</strong><small>${note}</small></div>`;
  }

  function table(headers, rows) {
    return `<div class="panel"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function renderAdminModule(module, content, role) {
    if (module === 'dashboard') {
      content.innerHTML = `
        <div class="cards">
          ${card('Obras ativas', '7', 'em acompanhamento')}
          ${card('Faturação mensal', '21.447,62 €', 'valores registados')}
          ${card('Custos registados', '8.920,00 €', 'mês atual')}
          ${card('Lucro estimado', '12.527,62 €', 'margem protegida')}
        </div>
        ${table(['Obra', 'Cliente', 'Estado', 'Responsável'], DEMO_DATA.obras.map(o => [o.id, o.cliente, o.estado, o.responsavel]))}`;
      return;
    }

    if (module === 'clientes') {
      content.innerHTML = table(['Cliente', 'Contacto', 'Estado'], DEMO_DATA.clientes.map(c => [c.nome, c.contacto, c.estado]));
      return;
    }

    if (module === 'obras') {
      content.innerHTML = table(['ID', 'Cliente', 'Morada', 'Estado', 'Tarefa'], DEMO_DATA.obras.map(o => [o.id, o.cliente, o.morada, o.estado, o.tarefa]));
      return;
    }

    if (module === 'orcamentos') {
      content.innerHTML = table(['Nº', 'Cliente', 'Valor', 'Estado'], DEMO_DATA.orcamentos.map(o => [o.numero, o.cliente, o.valor, o.estado]));
      return;
    }

    if (['custos', 'pagamentos'].includes(module)) {
      content.innerHTML = `<div class="cards">${card('Total registado', module === 'custos' ? '8.920,00 €' : '2.560,44 €', 'Apenas perfis autorizados')}</div>`;
      return;
    }

    content.innerHTML = `<div class="panel"><h2>${moduleLabel(module)}</h2><p>Módulo disponível para ${ROLE_LABELS[role] || role}. Esta área será expandida com formulários, anexos, PDF e ligação total ao Supabase.</p></div>`;
  }

  function renderFuncionarioModule(module, content) {
    const email = currentProfile?.email || currentUser?.email;
    const obras = DEMO_DATA.obras.filter(o => !o.funcionarioEmail || o.funcionarioEmail === email || o.id === 'O001');

    if (module === 'dashboard-funcionario') {
      content.innerHTML = `
        <div class="cards">
          ${card('Minhas obras', obras.length, 'atribuídas')}
          ${card('Tarefas hoje', '3', 'pendentes')}
          ${card('Fotografias', '0', 'carregar hoje')}
          ${card('Estado', 'Ativo', 'sem acesso financeiro')}
        </div>
        <div class="panel warning"><strong>Área Funcionário:</strong> custos, faturação, pagamentos, clientes e administração estão bloqueados.</div>`;
      return;
    }

    if (module === 'minhas-obras') {
      content.innerHTML = table(['Obra', 'Morada', 'Estado', 'Tarefa'], obras.map(o => [o.id, o.morada, o.estado, o.tarefa]));
      return;
    }

    if (module === 'checkin') {
      content.innerHTML = `
        <div class="panel"><h2>Registo de jornada</h2>
          <button class="primary" onclick="alert('Check-in registado em modo demonstração')">Iniciar jornada</button>
          <button onclick="alert('Check-out registado em modo demonstração')">Terminar jornada</button>
          <p class="muted">Na próxima fase ligamos este registo à tabela de horas no Supabase.</p>
        </div>`;
      return;
    }

    if (module === 'fotografias') {
      content.innerHTML = `<div class="panel"><h2>Fotografias da obra</h2><input type="file" accept="image/*" multiple><p class="muted">Carregar fotos antes, durante e depois. Ligação ao Storage Supabase na próxima fase.</p></div>`;
      return;
    }

    if (module === 'materiais') {
      content.innerHTML = `<div class="panel"><h2>Pedido de material</h2><textarea placeholder="Escrever material necessário"></textarea><button class="primary">Enviar pedido</button></div>`;
      return;
    }

    content.innerHTML = `<div class="panel"><h2>${moduleLabel(module)}</h2><p>Área limitada ao funcionário. Sem dados financeiros ou administrativos.</p></div>`;
  }

  function renderClienteModule(module, content) {
    content.innerHTML = `<div class="panel"><h2>${moduleLabel(module)}</h2><p>Portal do cliente: acesso apenas à própria obra, documentos autorizados, fotografias, garantias e faturas.</p></div>`;
  }

  async function restoreSession() {
    if (!supabaseClient && !initSupabase()) return renderLogin();
    const { data } = await supabaseClient.auth.getSession();
    currentUser = data.session?.user || null;
    if (currentUser) return loadProfileAndRender();
    renderLogin();
  }

  document.addEventListener('DOMContentLoaded', restoreSession);
})();
