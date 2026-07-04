(() => {
  'use strict';

  const cfg = window.DISTAK_CONFIG || {};
  const supabaseClient = (cfg.SUPABASE_URL && cfg.SUPABASE_KEY && window.supabase)
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY)
    : null;

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
  let currentRoute = 'dashboard';
  const state = { clientes: [], obras: [], loading: false };

  const labels = {
    admin: 'Administrador', administrador: 'Administrador', escritorio: 'Escritório',
    encarregado: 'Encarregado', funcionario: 'Funcionário', cliente: 'Cliente'
  };

  const permissions = {
    admin: ['dashboard','clientes','obras','orcamentos','custos','pagamentos','funcionarios','documentos','relatorios','agenda','portal','administracao'],
    administrador: ['dashboard','clientes','obras','orcamentos','custos','pagamentos','funcionarios','documentos','relatorios','agenda','portal','administracao'],
    escritorio: ['dashboard','clientes','obras','orcamentos','pagamentos','documentos','relatorios','agenda'],
    encarregado: ['dashboard','obras','tarefas','fotografias','materiais','incidentes','documentos','agenda'],
    funcionario: ['painel-funcionario','minhas-obras','tarefas','fotografias','checkin','materiais','incidentes','perfil'],
    cliente: ['portal','minhas-obras','fotografias','documentos','perfil']
  };

  const menuLabels = {
    dashboard:'Dashboard', clientes:'Clientes', obras:'Obras', orcamentos:'Orçamentos', custos:'Custos', pagamentos:'Pagamentos', funcionarios:'Funcionários', documentos:'Documentos', relatorios:'Relatórios', agenda:'Agenda', portal:'Portal Cliente', administracao:'Administração',
    'painel-funcionario':'Painel Funcionário', 'minhas-obras':'Minhas Obras', tarefas:'Tarefas', fotografias:'Fotografias', checkin:'Check-in / Check-out', materiais:'Materiais', incidentes:'Incidentes', perfil:'Meu Perfil'
  };

  const html = (s) => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const role = () => normalizeRole(currentProfile?.role || currentProfile?.papel || 'funcionario');
  const isAdmin = () => ['admin', 'administrador'].includes(role());
  const money = (v) => Number(v || 0).toLocaleString('pt-PT', {style:'currency', currency:'EUR'});
  function normalizeRole(value){ return String(value || 'funcionario').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
  function setPage(title, subtitle){ pageTitle.textContent = title; pageSubtitle.textContent = subtitle || ''; }
  function showLogin(){ loginScreen.classList.remove('hidden'); appScreen.classList.add('hidden'); }
  function showApp(){ loginScreen.classList.add('hidden'); appScreen.classList.remove('hidden'); }

  function toast(message, type = 'ok') {
    let el = $('distakToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'distakToast';
      el.style.cssText = 'position:fixed;right:22px;bottom:22px;z-index:9999;max-width:420px;padding:14px 18px;border-radius:14px;box-shadow:0 12px 35px #0003;font-weight:800;transition:.2s;';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.background = type === 'error' ? '#fee2e2' : type === 'warn' ? '#fef3c7' : '#dcfce7';
    el.style.color = type === 'error' ? '#991b1b' : type === 'warn' ? '#92400e' : '#166534';
    clearTimeout(el._t);
    el._t = setTimeout(() => el.remove(), 3500);
  }

  function injectModalStyles(){
    if ($('distakCrudStyles')) return;
    const st = document.createElement('style');
    st.id = 'distakCrudStyles';
    st.textContent = `
      .distak-modal{position:fixed;inset:0;background:#02061799;display:grid;place-items:center;z-index:9998;padding:18px}.distak-modal-card{background:#fff;border-radius:22px;width:min(760px,96vw);max-height:92vh;overflow:auto;padding:24px;box-shadow:0 28px 90px #0008}.distak-modal-head{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:16px}.distak-modal-head h2{margin:0}.distak-close{border:0;background:#e5e7eb;border-radius:10px;padding:9px 12px;font-weight:900;cursor:pointer}.distak-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.btn.small{padding:8px 11px;font-size:13px}.btn.red{background:#fee2e2;color:#991b1b}.btn.green{background:#dcfce7;color:#166534}.input-error{border-color:#dc2626!important;background:#fef2f2}.empty-box{border:1px dashed #cbd5e1;border-radius:16px;padding:22px;color:#64748b;background:#f8fafc}.toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.toolbar input{padding:12px;border:1px solid #dbe3ef;border-radius:12px;min-width:260px}.status-line{font-size:13px;color:#64748b;margin-top:8px}.clickable{cursor:pointer}`;
    document.head.appendChild(st);
  }

  async function getProfile(user){
    if (!supabaseClient || !user) return demoProfile(user?.email || 'demo@distaklda.com');
    const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (data) return data;
    const byEmail = await supabaseClient.from('profiles').select('*').eq('email', user.email).maybeSingle();
    if (byEmail.data) return byEmail.data;
    throw new Error(error?.message || byEmail.error?.message || 'Perfil não encontrado na tabela profiles.');
  }

  function demoProfile(email){
    return /obras/i.test(email)
      ? { email, nome:'Funcionário Obras', role:'funcionario', ativo:true }
      : { email, nome:'Administrador Principal', role:'admin', ativo:true };
  }

  async function loadCoreData(){
    if (!supabaseClient) {
      state.clientes = [{id:'demo1', nome:'Condomínio Malveira', nif:'', morada:'Malveira', email:'admin@condominio.pt'}];
      state.obras = [{id:'obra1', cliente_id:'demo1', nome:'Telhado / Beirado Malveira', morada:'Malveira', estado:'Em curso'}];
      return;
    }
    const [clientesRes, obrasRes] = await Promise.all([
      supabaseClient.from('clientes').select('*').order('nome', { ascending: true }),
      supabaseClient.from('obras').select('*, clientes(nome,email,nif)').order('nome', { ascending: true })
    ]);
    if (clientesRes.error) throw clientesRes.error;
    if (obrasRes.error) throw obrasRes.error;
    state.clientes = clientesRes.data || [];
    state.obras = obrasRes.data || [];
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMessage.textContent = 'A entrar...';
    const email = $('email').value.trim();
    const password = $('password').value;
    try {
      let user;
      if (supabaseClient) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        user = data.user;
      } else user = { email, id:'demo' };
      currentUser = user;
      currentProfile = await getProfile(user);
      if (currentProfile.ativo === false) throw new Error('Utilizador inativo.');
      await loadCoreData();
      renderApp();
    } catch (err) {
      loginMessage.textContent = err.message || 'Erro ao iniciar sessão.';
    }
  });

  logoutBtn.addEventListener('click', async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    currentUser = null; currentProfile = null; state.clientes = []; state.obras = [];
    showLogin();
  });

  async function boot(){
    injectModalStyles();
    if (supabaseClient) {
      const { data } = await supabaseClient.auth.getSession();
      if (data.session?.user) {
        try {
          currentUser = data.session.user;
          currentProfile = await getProfile(currentUser);
          await loadCoreData();
          renderApp();
          return;
        } catch (e) { console.warn(e); }
      }
    }
    showLogin();
  }

  function renderApp(){
    const r = role();
    const available = permissions[r] || permissions.funcionario;
    roleBadge.textContent = labels[r] || r;
    userName.textContent = currentProfile.nome || currentProfile.name || currentUser.email;
    userEmail.textContent = currentProfile.email || currentUser.email;
    menu.innerHTML = '';
    available.forEach((key, idx) => {
      const btn = document.createElement('button');
      btn.textContent = menuLabels[key] || key;
      btn.dataset.route = key;
      btn.onclick = () => renderView(key);
      menu.appendChild(btn);
      if (idx === 0) btn.classList.add('active');
    });
    showApp();
    renderView(available.includes(currentRoute) ? currentRoute : available[0]);
  }

  function activate(key){ [...menu.children].forEach(b => b.classList.toggle('active', b.dataset.route === key)); }

  function renderView(key){
    currentRoute = key;
    activate(key);
    view.innerHTML = '';
    if (role() === 'funcionario' && ['clientes','custos','pagamentos','funcionarios','administracao','orcamentos'].includes(key)) return renderBlocked();
    const routes = { dashboard, clientes, obras, orcamentos, custos, pagamentos, funcionarios, documentos, relatorios, agenda, portal, administracao,
      'painel-funcionario': funcPainel, 'minhas-obras': minhasObras, tarefas, fotografias, checkin, materiais, incidentes, perfil };
    (routes[key] || dashboard)();
  }

  async function refreshAndRender(route = currentRoute){
    try { await loadCoreData(); renderView(route); }
    catch (err) { toast(err.message || 'Erro ao atualizar dados.', 'error'); }
  }

  function dashboard(){
    setPage('Dashboard','Resumo operacional em tempo real');
    const totalClientes = state.clientes.length;
    const totalObras = state.obras.length;
    const emCurso = state.obras.filter(o => String(o.estado || '').toLowerCase().includes('curso')).length;
    const concluidas = state.obras.filter(o => String(o.estado || '').toLowerCase().includes('concl')).length;
    view.innerHTML = `
      <div class="cards">
        <div class="card"><span>Clientes</span><strong>${totalClientes}</strong></div>
        <div class="card"><span>Obras</span><strong>${totalObras}</strong></div>
        <div class="card"><span>Em curso</span><strong>${emCurso}</strong></div>
        <div class="card"><span>Concluídas</span><strong>${concluidas}</strong></div>
      </div>
      <div class="grid">
        <div class="panel"><div class="toolbar"><h2>Últimas obras</h2>${isAdmin()?'<button class="btn" data-action="nova-obra">+ Nova obra</button>':''}</div>${obrasTable(isAdmin())}</div>
        <div class="panel"><h2>Ações rápidas</h2><div class="distak-actions">${isAdmin()?'<button class="btn" data-action="novo-cliente">+ Cliente</button><button class="btn secondary" data-action="nova-obra">+ Obra</button>':''}<button class="btn secondary" data-action="recarregar">Recarregar dados</button></div><p class="notice">Funcionários não têm acesso a custos, pagamentos, lucros ou administração.</p></div>
      </div>`;
  }

  function clientes(){
    setPage('Clientes','Adicionar, editar e consultar clientes');
    if (!isAdmin()) return renderBlocked();
    view.innerHTML = `
      <div class="panel">
        <div class="toolbar"><h2>Clientes</h2><button class="btn" data-action="novo-cliente">+ Adicionar cliente</button></div>
        <input id="clientSearch" placeholder="Pesquisar cliente, NIF ou email..." />
        <div id="clientesList">${clientesTable(state.clientes)}</div>
      </div>`;
    $('clientSearch').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = state.clientes.filter(c => [c.nome,c.nif,c.email,c.morada].some(v => String(v || '').toLowerCase().includes(q)));
      $('clientesList').innerHTML = clientesTable(filtered);
    });
  }

  function obras(){
    setPage('Obras','Criar, editar e acompanhar obras');
    view.innerHTML = `
      <div class="panel">
        <div class="toolbar"><h2>Obras</h2>${isAdmin()?'<button class="btn" data-action="nova-obra">+ Adicionar obra</button>':''}</div>
        ${obrasTable(isAdmin())}
      </div>`;
  }

  function clientesTable(list){
    if (!list.length) return '<div class="empty-box">Ainda não existem clientes. Clique em “Adicionar cliente”.</div>';
    return `<table><tr><th>Nome</th><th>NIF</th><th>Email</th><th>Morada</th><th>Ações</th></tr>${list.map(c => `
      <tr>
        <td>${html(c.nome)}</td><td>${html(c.nif)}</td><td>${html(c.email)}</td><td>${html(c.morada)}</td>
        <td><button class="btn small secondary" data-action="editar-cliente" data-id="${html(c.id)}">Editar</button> <button class="btn small red" data-action="apagar-cliente" data-id="${html(c.id)}">Apagar</button></td>
      </tr>`).join('')}</table>`;
  }

  function obrasTable(showActions){
    if (!state.obras.length) return '<div class="empty-box">Ainda não existem obras registadas.</div>';
    return `<table><tr><th>Obra</th><th>Cliente</th><th>Morada</th><th>Estado</th>${showActions?'<th>Ações</th>':''}</tr>${state.obras.map(o => `
      <tr>
        <td>${html(o.nome)}</td><td>${html(o.clientes?.nome || clienteNome(o.cliente_id) || '—')}</td><td>${html(o.morada)}</td><td><span class="tag gold">${html(o.estado || '—')}</span></td>
        ${showActions?`<td><button class="btn small secondary" data-action="editar-obra" data-id="${html(o.id)}">Editar</button> <button class="btn small red" data-action="apagar-obra" data-id="${html(o.id)}">Apagar</button></td>`:''}
      </tr>`).join('')}</table>`;
  }

  function clienteNome(id){ return state.clientes.find(c => String(c.id) === String(id))?.nome; }

  function openModal(title, body, onSubmit){
    const wrap = document.createElement('div');
    wrap.className = 'distak-modal';
    wrap.innerHTML = `<div class="distak-modal-card"><div class="distak-modal-head"><h2>${html(title)}</h2><button class="distak-close" type="button">Fechar</button></div><form id="distakModalForm">${body}<div class="distak-actions"><button class="btn" type="submit">Guardar</button><button class="btn secondary" type="button" data-close="1">Cancelar</button></div><p class="status-line" id="modalStatus"></p></form></div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.querySelector('.distak-close').onclick = close;
    wrap.querySelector('[data-close]').onclick = close;
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    wrap.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = wrap.querySelector('#modalStatus');
      status.textContent = 'A guardar...';
      try { await onSubmit(new FormData(e.currentTarget)); close(); }
      catch (err) { status.textContent = err.message || 'Erro ao guardar.'; status.style.color = '#dc2626'; }
    });
  }

  function clienteForm(c = {}){
    openModal(c.id ? 'Editar cliente' : 'Adicionar cliente', `
      <div class="form-grid">
        <input name="nome" placeholder="Nome do cliente" value="${html(c.nome)}" required>
        <input name="nif" placeholder="NIF" value="${html(c.nif)}">
        <input name="email" type="email" placeholder="Email" value="${html(c.email)}">
        <textarea name="morada" placeholder="Morada">${html(c.morada)}</textarea>
      </div>`, async (fd) => {
        const payload = { nome: fd.get('nome')?.trim(), nif: fd.get('nif')?.trim() || null, email: fd.get('email')?.trim() || null, morada: fd.get('morada')?.trim() || null };
        if (!payload.nome) throw new Error('O nome é obrigatório.');
        if (!supabaseClient) { toast('Modo demonstração: cliente guardado visualmente.'); return; }
        const res = c.id
          ? await supabaseClient.from('clientes').update(payload).eq('id', c.id)
          : await supabaseClient.from('clientes').insert(payload);
        if (res.error) throw res.error;
        toast(c.id ? 'Cliente atualizado.' : 'Cliente criado.');
        await refreshAndRender('clientes');
      });
  }

  function obraForm(o = {}){
    const opts = state.clientes.map(c => `<option value="${html(c.id)}" ${String(c.id)===String(o.cliente_id)?'selected':''}>${html(c.nome)}</option>`).join('');
    openModal(o.id ? 'Editar obra' : 'Adicionar obra', `
      <div class="form-grid">
        <select name="cliente_id" required><option value="">Escolha o cliente</option>${opts}</select>
        <input name="nome" placeholder="Nome da obra" value="${html(o.nome)}" required>
        <input name="estado" placeholder="Estado" value="${html(o.estado || 'Em curso')}">
        <textarea name="morada" placeholder="Morada da obra">${html(o.morada)}</textarea>
      </div>`, async (fd) => {
        const payload = { cliente_id: fd.get('cliente_id'), nome: fd.get('nome')?.trim(), morada: fd.get('morada')?.trim() || null, estado: fd.get('estado')?.trim() || 'Em curso' };
        if (!payload.cliente_id) throw new Error('Escolha um cliente.');
        if (!payload.nome) throw new Error('O nome da obra é obrigatório.');
        if (!supabaseClient) { toast('Modo demonstração: obra guardada visualmente.'); return; }
        const res = o.id
          ? await supabaseClient.from('obras').update(payload).eq('id', o.id)
          : await supabaseClient.from('obras').insert(payload);
        if (res.error) throw res.error;
        toast(o.id ? 'Obra atualizada.' : 'Obra criada.');
        await refreshAndRender('obras');
      });
  }

  async function deleteCliente(id){
    const c = state.clientes.find(x => String(x.id) === String(id));
    if (!c || !confirm(`Apagar cliente “${c.nome}”?`)) return;
    if (!supabaseClient) return toast('Modo demonstração.');
    const { error } = await supabaseClient.from('clientes').delete().eq('id', id);
    if (error) return toast(error.message, 'error');
    toast('Cliente apagado.');
    await refreshAndRender('clientes');
  }

  async function deleteObra(id){
    const o = state.obras.find(x => String(x.id) === String(id));
    if (!o || !confirm(`Apagar obra “${o.nome}”?`)) return;
    if (!supabaseClient) return toast('Modo demonstração.');
    const { error } = await supabaseClient.from('obras').delete().eq('id', id);
    if (error) return toast(error.message, 'error');
    toast('Obra apagada.');
    await refreshAndRender('obras');
  }

  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const id = el.dataset.id;
    if (action === 'novo-cliente') return clienteForm();
    if (action === 'editar-cliente') return clienteForm(state.clientes.find(c => String(c.id) === String(id)) || {});
    if (action === 'apagar-cliente') return deleteCliente(id);
    if (action === 'nova-obra') return obraForm();
    if (action === 'editar-obra') return obraForm(state.obras.find(o => String(o.id) === String(id)) || {});
    if (action === 'apagar-obra') return deleteObra(id);
    if (action === 'recarregar') return refreshAndRender(currentRoute);
  });

  function funcPainel(){ setPage('Painel Funcionário','Área limitada ao funcionário'); view.innerHTML = `<div class="cards"><div class="card"><span>Minhas obras</span><strong>${state.obras.length}</strong></div><div class="card"><span>Tarefas hoje</span><strong>4</strong></div><div class="card"><span>Fotos enviadas</span><strong>0</strong></div><div class="card"><span>Estado</span><strong>Ativo</strong></div></div><div class="panel"><h2>Acesso Funcionário</h2><p>Este perfil não tem acesso a faturação, custos, lucros, clientes, pagamentos ou administração.</p><div class="actions"><button class="btn" onclick="alert('Check-in registado em modo inicial.')">Iniciar jornada</button><button class="btn secondary" onclick="alert('Módulo de fotografias será ligado ao Storage.')">Enviar fotografia</button><button class="btn secondary" onclick="alert('Pedido de material registado em modo inicial.')">Pedir material</button><button class="btn danger" onclick="alert('Incidente registado em modo inicial.')">Comunicar incidente</button></div></div>`; }
  function orcamentos(){ setPage('Orçamentos','Criação e aprovação'); view.innerHTML=`<div class="panel"><h2>Novo orçamento</h2><div class="form-grid"><input placeholder="Cliente"><input placeholder="Morada da obra"><input placeholder="Valor sem IVA"><textarea placeholder="Descrição técnica dos trabalhos"></textarea></div><br><button class="btn" onclick="alert('Módulo de orçamentos será ligado na próxima fase.')">Gerar orçamento</button></div>`; }
  function custos(){ setPage('Custos','Materiais, subempreiteiros e logística'); view.innerHTML=`<div class="panel"><h2>Registo de custos</h2><div class="form-grid"><input placeholder="Obra"><input placeholder="Categoria"><input placeholder="Valor"><textarea placeholder="Observação"></textarea></div><br><button class="btn" onclick="alert('Módulo de custos será ligado na próxima fase.')">Guardar custo</button></div>`; }
  function pagamentos(){ setPage('Pagamentos','Controlo financeiro'); view.innerHTML=`<div class="panel"><h2>Pagamentos e faturas</h2><table><tr><th>Fatura</th><th>Cliente</th><th>Total</th><th>Estado</th></tr><tr><td>M/59</td><td>Rua Veiga Beirão</td><td>${money(2560.44)}</td><td><span class="tag red">Em atraso</span></td></tr></table></div>`; }
  function funcionarios(){ setPage('Funcionários','Equipa e permissões'); view.innerHTML=`<div class="panel"><h2>Funcionários</h2><table><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Estado</th></tr><tr><td>Funcionário</td><td>obras@distak.com</td><td>funcionario</td><td><span class="tag green">Ativo</span></td></tr></table></div>`; }
  function documentos(){ setPage('Documentos','Contratos, garantias e relatórios'); view.innerHTML=`<div class="panel"><h2>Documentos</h2><p>Área para anexar contratos, garantias, fotos antes/depois e relatórios técnicos.</p><button class="btn secondary" onclick="alert('Upload de documentos será ligado ao Supabase Storage.')">Anexar documento</button></div>`; }
  function relatorios(){ setPage('Relatórios','Relatórios técnicos e PDF'); view.innerHTML=`<div class="panel"><h2>Relatório técnico</h2><textarea style="width:100%;min-height:150px;border:1px solid #dbe3ef;border-radius:12px;padding:12px" placeholder="Descrição técnica, patologias, trabalhos executados e conclusão..."></textarea><br><br><button class="btn" onclick="alert('PDF será ativado na fase de relatórios.')">Gerar PDF</button></div>`; }
  function agenda(){ setPage('Agenda','Calendário de obras'); view.innerHTML=`<div class="panel"><h2>Agenda</h2><table><tr><th>Dia</th><th>Obra</th><th>Equipa</th></tr><tr><td>Hoje</td><td>${html(state.obras[0]?.nome || 'Sem obra')}</td><td>Funcionário</td></tr></table></div>`; }
  function portal(){ setPage('Portal Cliente','Área reservada ao cliente'); view.innerHTML=`<div class="panel"><h2>Portal Cliente</h2><p>Cliente vê apenas a sua obra, fotografias, orçamento, faturas, garantias e relatórios autorizados.</p></div>`; }
  function administracao(){ setPage('Administração','Utilizadores e configurações'); view.innerHTML=`<div class="panel"><h2>Administração</h2><p>Gestão de perfis, permissões, empresa, backups e configurações do ERP.</p><button class="btn" onclick="alert('Gestão de utilizadores será criada na próxima fase.')">Gestão de utilizadores</button></div>`; }
  function minhasObras(){ setPage('Minhas Obras','Obras atribuídas ao funcionário'); view.innerHTML=`<div class="panel"><h2>Minhas obras</h2>${obrasTable(false)}</div>`; }
  function tarefas(){ setPage('Tarefas','Tarefas do dia'); view.innerHTML=`<div class="panel"><h2>Tarefas de hoje</h2><ul><li>Verificar obra atribuída</li><li>Enviar fotografias antes/durante/depois</li><li>Confirmar materiais necessários</li><li>Comunicar incidente ou avaria</li></ul></div>`; }
  function fotografias(){ setPage('Fotografias','Registo fotográfico da obra'); view.innerHTML=`<div class="panel"><h2>Enviar fotografias</h2><input type="file" multiple accept="image/*"><p>As fotografias serão associadas à obra selecionada quando ligarmos o Storage.</p></div>`; }
  function checkin(){ setPage('Check-in / Check-out','Registo de jornada'); view.innerHTML=`<div class="panel"><h2>Registo de presença</h2><div class="actions"><button class="btn" onclick="alert('Check-in registado em modo inicial.')">Iniciar jornada</button><button class="btn secondary" onclick="alert('Check-out registado em modo inicial.')">Terminar jornada</button></div></div>`; }
  function materiais(){ setPage('Materiais','Pedidos e materiais atribuídos'); view.innerHTML=`<div class="panel"><h2>Pedir material</h2><div class="form-grid"><input placeholder="Obra"><input placeholder="Material"><input placeholder="Quantidade"><textarea placeholder="Observação"></textarea></div><br><button class="btn" onclick="alert('Pedido de material registado em modo inicial.')">Enviar pedido</button></div>`; }
  function incidentes(){ setPage('Incidentes','Comunicar avarias ou problemas'); view.innerHTML=`<div class="panel"><h2>Comunicar incidente</h2><div class="form-grid"><input placeholder="Obra"><input placeholder="Tipo de incidente"><textarea placeholder="Descreva o problema"></textarea></div><br><button class="btn danger" onclick="alert('Incidente registado em modo inicial.')">Comunicar</button></div>`; }
  function perfil(){ setPage('Meu Perfil','Dados do utilizador'); view.innerHTML=`<div class="panel"><h2>${html(currentProfile.nome || 'Utilizador')}</h2><p>Email: ${html(currentProfile.email || currentUser.email)}</p><p>Perfil: ${html(labels[role()] || role())}</p></div>`; }
  function renderBlocked(){ setPage('Acesso bloqueado','Permissão insuficiente'); view.innerHTML=`<div class="panel"><h2>Acesso bloqueado</h2><p>O seu perfil não tem autorização para ver esta área.</p></div>`; }

  boot();
})();
