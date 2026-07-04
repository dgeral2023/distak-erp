(() => {
  'use strict';

  const cfg = window.DISTAK_CONFIG || {};
  const SUPABASE_URL = cfg.SUPABASE_URL;
  const SUPABASE_KEY = cfg.SUPABASE_KEY;
  const db = (window.supabase && SUPABASE_URL && SUPABASE_KEY)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  const state = {
    user: null,
    profile: null,
    page: 'dashboard',
    clientes: [],
    obras: [],
    orcamentos: [],
    custos: [],
    pagamentos: [],
    filtro: ''
  };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = (v) => new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(Number(v || 0));
  const uid = () => (crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);

  function toast(msg, type='ok') {
    let box = $('toastBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toastBox';
      box.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:9999;display:grid;gap:10px';
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `padding:12px 16px;border-radius:12px;font-weight:700;box-shadow:0 10px 30px #0002;background:${type==='erro'?'#fee2e2':'#dcfce7'};color:${type==='erro'?'#991b1b':'#166534'}`;
    box.appendChild(t);
    setTimeout(()=>t.remove(), 3500);
  }

  function appRoot() {
    let root = $('distakApp');
    if (!root) {
      root = document.createElement('div');
      root.id = 'distakApp';
      document.body.innerHTML = '';
      document.body.appendChild(root);
    }
    return root;
  }

  function injectCss() {
    if ($('distakSprintCss')) return;
    const s = document.createElement('style');
    s.id = 'distakSprintCss';
    s.textContent = `
      :root{--dark:#071120;--dark2:#101d33;--gold:#f5a400;--bg:#f3f6fb;--card:#fff;--muted:#64748b;--line:#e2e8f0;--red:#dc2626;--green:#16a34a}
      *{box-sizing:border-box} body{margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;background:var(--bg);color:#0f172a}
      .login-wrap{min-height:100vh;background:linear-gradient(135deg,#071120,#14213d);display:grid;place-items:center;padding:20px}.login-card{width:min(520px,94vw);background:#fff;border-radius:26px;padding:34px;box-shadow:0 30px 90px #0005}.brand{display:flex;gap:18px;align-items:center}.logo{width:58px;height:58px;border:3px solid var(--gold);border-radius:16px;display:grid;place-items:center;background:#071120;color:var(--gold);font-size:34px;font-weight:900}.brand h1{margin:0;font-size:34px}.brand p{margin:3px 0;color:var(--muted)} label{font-weight:800;display:block;margin:14px 0 8px} input,select,textarea{width:100%;padding:13px 14px;border:1px solid #cbd5e1;border-radius:12px;font:inherit;background:white} textarea{min-height:92px} button{border:0;border-radius:12px;padding:12px 16px;font-weight:900;cursor:pointer}.btn{background:var(--gold);color:#111827}.btn2{background:#e2e8f0;color:#0f172a}.btn-danger{background:#fee2e2;color:#991b1b}.msg{color:#64748b;margin-top:10px}.app{display:grid;grid-template-columns:280px 1fr;min-height:100vh}.side{background:#071120;color:white;padding:24px;display:flex;flex-direction:column;gap:14px}.role{border:1px solid #9a6b00;background:#2b220d;color:#ffd166;border-radius:14px;padding:14px;font-weight:900;text-transform:uppercase}.nav{display:grid;gap:8px}.nav button{text-align:left;background:transparent;color:#e5e7eb;padding:13px 14px}.nav button.active,.nav button:hover{background:#1d2d4a;border-radius:12px}.logout{margin-top:auto;background:#233149;color:white}.main{padding:28px}.top{background:#fff;border-radius:24px;padding:24px 28px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 12px 30px #0f172a0d}.top h1{margin:0;font-size:32px}.top p{margin:4px 0 0;color:#64748b}.card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:22px;margin-bottom:18px;box-shadow:0 12px 30px #0f172a0d}.cards{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:16px}.kpi b{font-size:30px;display:block;margin-top:8px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.actions{display:flex;gap:8px;flex-wrap:wrap}.table{width:100%;border-collapse:collapse;margin-top:14px}.table th{text-align:left;color:#64748b;font-size:13px;text-transform:uppercase;border-bottom:1px solid var(--line);padding:12px}.table td{border-bottom:1px solid var(--line);padding:12px}.small{font-size:13px;color:#64748b}.toolbar{display:flex;gap:10px;justify-content:space-between;align-items:center;margin-bottom:14px}.search{max-width:360px}.hide{display:none!important}.modal-back{position:fixed;inset:0;background:#0006;display:grid;place-items:center;z-index:9998}.modal{background:#fff;border-radius:20px;padding:24px;width:min(720px,94vw);max-height:92vh;overflow:auto}.modal h2{margin-top:0}.form2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.form-full{grid-column:1/-1}@media(max-width:900px){.app{grid-template-columns:1fr}.side{position:relative}.cards,.grid,.form2{grid-template-columns:1fr}.top{display:block}}`;
    document.head.appendChild(s);
  }

  function loginUI() {
    injectCss();
    appRoot().innerHTML = `
      <div class="login-wrap"><form class="login-card" id="loginForm">
        <div class="brand"><div class="logo">D</div><div><h1>DISTAK ERP</h1><p>Gestão profissional de obras</p></div></div>
        <h2>Entrar na aplicação</h2>
        <label>Email</label><input id="loginEmail" type="email" autocomplete="username" placeholder="Digite o seu email" required>
        <label>Palavra-passe</label><input id="loginPassword" type="password" autocomplete="current-password" placeholder="Digite a sua senha" required>
        <div style="margin-top:18px"><button class="btn" type="submit">Entrar</button></div>
        <div id="loginMsg" class="msg">Perfis: Administrador · Funcionário</div>
      </form></div>`;
    $('loginForm').addEventListener('submit', login);
  }

  async function login(e) {
    e.preventDefault();
    if (!db) return $('loginMsg').textContent = 'Configuração Supabase em falta.';
    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value;
    $('loginMsg').textContent = 'A entrar...';
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) { $('loginMsg').textContent = error.message; return; }
    state.user = data.user;
    await loadProfile();
    await loadAll();
    renderApp();
  }

  async function loadProfile() {
    const { data, error } = await db.from('profiles').select('*').eq('id', state.user.id).single();
    if (error || !data) throw new Error('Perfil não encontrado no Supabase.');
    state.profile = data;
  }

  async function loadAll() {
    const [clientes, obras, orcamentos, custos, pagamentos] = await Promise.all([
      db.from('clientes').select('*').order('nome', { ascending: true }),
      db.from('obras').select('*').order('nome', { ascending: true }),
      db.from('orcamentos').select('*').order('criado_em', { ascending: false }),
      db.from('custos').select('*').order('criado_em', { ascending: false }),
      db.from('pagamentos').select('*').order('criado_em', { ascending: false })
    ]);
    state.clientes = clientes.data || [];
    state.obras = obras.data || [];
    state.orcamentos = orcamentos.data || [];
    state.custos = custos.data || [];
    state.pagamentos = pagamentos.data || [];
  }

  function menus() {
    if (state.profile.role === 'funcionario') return [
      ['dashboard','Painel Funcionário'],['obras','Minhas Obras'],['fotografias','Fotografias'],['checkin','Check-in / Check-out'],['incidentes','Incidentes']
    ];
    return [
      ['dashboard','Dashboard'],['clientes','Clientes'],['obras','Obras'],['orcamentos','Orçamentos'],['custos','Custos'],['pagamentos','Pagamentos'],['funcionarios','Funcionários'],['agenda','Agenda'],['relatorios','Relatórios'],['administracao','Administração']
    ];
  }

  function renderApp() {
    injectCss();
    const role = state.profile.role || 'utilizador';
    appRoot().innerHTML = `<div class="app"><aside class="side"><div class="brand"><div class="logo">D</div><div><h2>DISTAK ERP</h2></div></div><div class="role">${esc(role)}</div><div class="nav" id="nav"></div><button class="logout" id="logoutBtn">Sair</button></aside><main class="main"><div id="view"></div></main></div>`;
    $('logoutBtn').onclick = logout;
    renderNav();
    renderPage(state.page);
  }

  function renderNav() {
    $('nav').innerHTML = menus().map(([id,label])=>`<button class="${state.page===id?'active':''}" data-page="${id}">${label}</button>`).join('');
    $('nav').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;renderNav();renderPage(state.page);});
  }

  async function logout() { await db.auth.signOut(); state.user=null; state.profile=null; loginUI(); }

  function header(title, sub='') {
    return `<div class="top"><div><h1>${title}</h1><p>${sub}</p></div><div style="text-align:right"><b>${esc(state.profile.nome || '')}</b><br><span class="small">${esc(state.profile.email || state.user.email)}</span></div></div>`;
  }

  function renderPage(page) {
    if (page === 'dashboard') return renderDashboard();
    if (page === 'clientes') return renderClientes();
    if (page === 'obras') return renderObras();
    if (page === 'orcamentos') return renderOrcamentos();
    if (page === 'custos') return renderCustos();
    if (page === 'pagamentos') return renderPagamentos();
    $('view').innerHTML = header(page, 'Módulo em preparação') + `<div class="card"><h2>${page}</h2><p>Este módulo será desenvolvido na próxima sprint.</p></div>`;
  }

  function renderDashboard() {
    const totalOrc = state.orcamentos.reduce((s,o)=>s+Number(o.valor||0),0);
    const totalCustos = state.custos.reduce((s,c)=>s+Number(c.valor||0),0);
    const totalPag = state.pagamentos.reduce((s,p)=>s+Number(p.valor||0),0);
    $('view').innerHTML = header('Dashboard', 'Visão geral da DISTAK') + `
      <div class="cards">
        <div class="card kpi">Clientes<b>${state.clientes.length}</b></div>
        <div class="card kpi">Obras<b>${state.obras.length}</b></div>
        <div class="card kpi">Orçamentos<b>${money(totalOrc)}</b></div>
        <div class="card kpi">Custos<b>${money(totalCustos)}</b></div>
      </div>
      <div class="cards">
        <div class="card kpi">Pagamentos recebidos<b>${money(totalPag)}</b></div>
        <div class="card kpi">Margem estimada<b>${money(totalOrc-totalCustos)}</b></div>
        <div class="card kpi">Obras em orçamento<b>${state.obras.filter(o=>(o.estado||'').toLowerCase().includes('orçamento')).length}</b></div>
        <div class="card kpi">Obras em atraso<b>${state.obras.filter(o=>(o.estado||'').toLowerCase().includes('atras')).length}</b></div>
      </div>`;
  }

  function filterRows(rows, keys) {
    const f = (state.filtro||'').toLowerCase();
    if (!f) return rows;
    return rows.filter(r => keys.some(k => String(r[k] || '').toLowerCase().includes(f)));
  }

  function renderClientes() {
    const rows = filterRows(state.clientes, ['nome','nif','email','morada','telefone']);
    $('view').innerHTML = header('Clientes','Gestão de clientes') + `
      <div class="card"><div class="toolbar"><h2>Clientes</h2><div class="actions"><input class="search" id="search" placeholder="Pesquisar cliente"><button class="btn" id="novoCliente">Novo cliente</button></div></div>
      <table class="table"><thead><tr><th>Cliente</th><th>NIF</th><th>Email</th><th>Morada</th><th>Ações</th></tr></thead><tbody>${rows.map(c=>`<tr><td><b>${esc(c.nome)}</b></td><td>${esc(c.nif||'—')}</td><td>${esc(c.email||'—')}</td><td>${esc(c.morada||'—')}</td><td class="actions"><button class="btn2" data-edit-cliente="${c.id}">Editar</button><button class="btn-danger" data-del-cliente="${c.id}">Apagar</button></td></tr>`).join('') || '<tr><td colspan="5">Sem clientes.</td></tr>'}</tbody></table></div>`;
    $('search').value = state.filtro; $('search').oninput = e => { state.filtro=e.target.value; renderClientes(); };
    $('novoCliente').onclick = () => clienteModal();
    document.querySelectorAll('[data-edit-cliente]').forEach(b=>b.onclick=()=>clienteModal(state.clientes.find(c=>c.id===b.dataset.editCliente)));
    document.querySelectorAll('[data-del-cliente]').forEach(b=>b.onclick=()=>deleteRow('clientes', b.dataset.delCliente, 'Cliente apagado'));
  }

  function clienteModal(c={}) {
    modal(`Cliente`, `<div class="form2">
      <div><label>Nome</label><input id="m_nome" value="${esc(c.nome||'')}"></div>
      <div><label>NIF</label><input id="m_nif" value="${esc(c.nif||'')}"></div>
      <div><label>Email</label><input id="m_email" value="${esc(c.email||'')}"></div>
      <div><label>Telefone</label><input id="m_telefone" value="${esc(c.telefone||'')}"></div>
      <div class="form-full"><label>Morada / Observações</label><textarea id="m_morada">${esc(c.morada||'')}</textarea></div>
    </div>`, async()=>{
      const payload = { nome:$('m_nome').value.trim(), nif:$('m_nif').value.trim()||null, email:$('m_email').value.trim()||null, telefone:$('m_telefone').value.trim()||null, morada:$('m_morada').value.trim()||null };
      if (!payload.nome) return toast('Indica o nome do cliente.','erro');
      const q = c.id ? db.from('clientes').update(payload).eq('id', c.id) : db.from('clientes').insert(payload);
      const { error } = await q; if (error) return toast(error.message,'erro');
      closeModal(); await loadAll(); renderClientes(); toast(c.id?'Cliente atualizado':'Cliente criado');
    });
  }

  function renderObras() {
    const rows = filterRows(state.obras, ['nome','morada','estado','responsavel']);
    $('view').innerHTML = header('Obras','Gestão de obras') + `
      <div class="card"><div class="toolbar"><h2>Obras</h2><div class="actions"><input class="search" id="search" placeholder="Pesquisar obra"><button class="btn" id="novaObra">Nova obra</button></div></div>
      <table class="table"><thead><tr><th>Obra</th><th>Cliente</th><th>Estado</th><th>Progresso</th><th>Ações</th></tr></thead><tbody>${rows.map(o=>`<tr><td><b>${esc(o.nome)}</b><br><span class="small">${esc(o.morada||'')}</span></td><td>${esc(clienteNome(o.cliente_id))}</td><td>${esc(o.estado||'—')}</td><td>${Number(o.progresso||0)}%</td><td class="actions"><button class="btn2" data-edit-obra="${o.id}">Editar</button><button class="btn-danger" data-del-obra="${o.id}">Apagar</button></td></tr>`).join('') || '<tr><td colspan="5">Sem obras.</td></tr>'}</tbody></table></div>`;
    $('search').value = state.filtro; $('search').oninput = e => { state.filtro=e.target.value; renderObras(); };
    $('novaObra').onclick = () => obraModal();
    document.querySelectorAll('[data-edit-obra]').forEach(b=>b.onclick=()=>obraModal(state.obras.find(o=>o.id===b.dataset.editObra)));
    document.querySelectorAll('[data-del-obra]').forEach(b=>b.onclick=()=>deleteRow('obras', b.dataset.delObra, 'Obra apagada'));
  }

  function clienteNome(id) { return (state.clientes.find(c=>c.id===id)||{}).nome || '—'; }
  function obraNome(id) { return (state.obras.find(o=>o.id===id)||{}).nome || '—'; }

  function obraModal(o={}) {
    modal('Obra', `<div class="form2">
      <div><label>Nome da obra</label><input id="m_nome" value="${esc(o.nome||'')}"></div>
      <div><label>Cliente</label><select id="m_cliente"><option value="">Selecionar</option>${state.clientes.map(c=>`<option value="${c.id}" ${o.cliente_id===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}</select></div>
      <div><label>Estado</label><select id="m_estado">${['Orçamento','Em execução','Pagamento em atraso','Concluída','Suspensa'].map(s=>`<option ${o.estado===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div><label>Progresso %</label><input id="m_progresso" type="number" min="0" max="100" value="${esc(o.progresso||0)}"></div>
      <div class="form-full"><label>Morada</label><textarea id="m_morada">${esc(o.morada||'')}</textarea></div>
    </div>`, async()=>{
      const payload = { nome:$('m_nome').value.trim(), cliente_id:$('m_cliente').value || null, estado:$('m_estado').value, progresso:Number($('m_progresso').value||0), morada:$('m_morada').value.trim()||null };
      if (!payload.nome) return toast('Indica o nome da obra.','erro');
      const q = o.id ? db.from('obras').update(payload).eq('id', o.id) : db.from('obras').insert(payload);
      const { error } = await q; if (error) return toast(error.message,'erro');
      closeModal(); await loadAll(); renderObras(); toast(o.id?'Obra atualizada':'Obra criada');
    });
  }

  function renderOrcamentos() { renderFinanceModule('orcamentos','Orçamentos','Novo orçamento',['numero','descricao','valor','estado']); }
  function renderCustos() { renderFinanceModule('custos','Custos','Novo custo',['categoria','descricao','valor','data']); }
  function renderPagamentos() { renderFinanceModule('pagamentos','Pagamentos','Novo pagamento',['descricao','valor','metodo','data']); }

  function renderFinanceModule(table, title, btnText, cols) {
    const rows = state[table] || [];
    $('view').innerHTML = header(title, `Gestão de ${title.toLowerCase()}`) + `<div class="card"><div class="toolbar"><h2>${title}</h2><button class="btn" id="newFin">${btnText}</button></div><table class="table"><thead><tr><th>Obra</th>${cols.map(c=>`<th>${c}</th>`).join('')}<th>Ações</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(obraNome(r.obra_id))}</td>${cols.map(c=>`<td>${c==='valor'?money(r[c]):esc(r[c]||'—')}</td>`).join('')}<td><button class="btn-danger" data-del="${r.id}">Apagar</button></td></tr>`).join('') || `<tr><td colspan="${cols.length+2}">Sem registos.</td></tr>`}</tbody></table></div>`;
    $('newFin').onclick = () => financeModal(table, title);
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>deleteRow(table, b.dataset.del, `${title} apagado`));
  }

  function financeModal(table, title) {
    const isOrc = table==='orcamentos', isCusto=table==='custos', isPag=table==='pagamentos';
    modal(title, `<div class="form2">
      <div><label>Obra</label><select id="m_obra"><option value="">Selecionar</option>${state.obras.map(o=>`<option value="${o.id}">${esc(o.nome)}</option>`).join('')}</select></div>
      ${isOrc?'<div><label>Número</label><input id="m_numero" placeholder="ORC-001"></div>':''}
      ${isCusto?'<div><label>Categoria</label><input id="m_categoria" placeholder="Materiais"></div>':''}
      ${isPag?'<div><label>Método</label><input id="m_metodo" placeholder="Transferência"></div>':''}
      <div><label>Valor</label><input id="m_valor" type="number" step="0.01" value="0"></div>
      ${isOrc?'<div><label>Estado</label><select id="m_estado"><option>Rascunho</option><option>Enviado</option><option>Aprovado</option><option>Recusado</option></select></div>':''}
      ${!isOrc?'<div><label>Data</label><input id="m_data" type="date"></div>':''}
      <div class="form-full"><label>Descrição</label><textarea id="m_descricao"></textarea></div>
    </div>`, async()=>{
      const obra_id = $('m_obra').value || null;
      const obra = state.obras.find(o=>o.id===obra_id);
      const payload = { obra_id, valor:Number($('m_valor').value||0), descricao:$('m_descricao').value.trim()||null };
      if (obra?.cliente_id) payload.cliente_id = obra.cliente_id;
      if (isOrc) { payload.numero=$('m_numero').value.trim()||null; payload.estado=$('m_estado').value; }
      if (isCusto) { payload.categoria=$('m_categoria').value.trim()||null; payload.data=$('m_data').value||null; }
      if (isPag) { payload.metodo=$('m_metodo').value.trim()||null; payload.data=$('m_data').value||null; }
      const { error } = await db.from(table).insert(payload); if (error) return toast(error.message,'erro');
      closeModal(); await loadAll(); renderPage(table); toast(`${title} criado`);
    });
  }

  async function deleteRow(table, id, msg) {
    if (!confirm('Tem a certeza que quer apagar este registo?')) return;
    const { error } = await db.from(table).delete().eq('id', id);
    if (error) return toast(error.message,'erro');
    await loadAll(); renderPage(state.page); toast(msg);
  }

  function modal(title, body, onSave) {
    const back = document.createElement('div'); back.className='modal-back'; back.id='modalBack';
    back.innerHTML = `<div class="modal"><h2>${title}</h2>${body}<div class="actions" style="margin-top:18px"><button class="btn" id="modalSave">Guardar</button><button class="btn2" id="modalCancel">Cancelar</button></div></div>`;
    document.body.appendChild(back); $('modalCancel').onclick=closeModal; $('modalSave').onclick=onSave;
  }
  function closeModal(){ const m=$('modalBack'); if(m)m.remove(); }

  async function boot() {
    injectCss();
    if (!db) { loginUI(); const msg=$('loginMsg'); if(msg) msg.textContent='Falta configurar o Supabase em assets/js/config.js'; return; }
    const { data } = await db.auth.getSession();
    if (data.session?.user) {
      try { state.user=data.session.user; await loadProfile(); await loadAll(); renderApp(); }
      catch(e){ console.error(e); await db.auth.signOut(); loginUI(); $('loginMsg').textContent=e.message; }
    } else loginUI();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
