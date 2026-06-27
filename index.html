<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DISTAK ERP | Gestão de Obras</title>
  <meta name="description" content="DISTAK ERP - gestão de obras, clientes, orçamentos, custos, faturação, documentos e relatórios técnicos." />
  <link rel="stylesheet" href="assets/styles.css" />
</head>
<body>
  <section id="login" class="login-page">
    <div class="brand-panel">
      <div class="brand-mark">DISTAK</div>
      <h1>ERP profissional para construção civil</h1>
      <p>Obras, orçamentos, custos, faturação, documentos, fotografias, equipas e área de cliente num só painel.</p>
      <div class="company-card">
        <strong>Distak Construção Civil Unipessoal, Lda</strong>
        <span>Alvará 116681-PAR · Seguro RC 1.000.000 €</span>
        <span>Administrador: José Filipe Alves Silva</span>
      </div>
    </div>
    <form class="login-card" onsubmit="event.preventDefault(); DISTAK.login();">
      <h2>Entrar na aplicação</h2>
      <label>Email</label>
      <input id="email" type="email" value="d.geral2023@gmail.com" required />
      <label>Password</label>
      <input id="password" type="password" value="123456" required />
      <button class="btn primary" type="submit">Entrar</button>
      <small>Perfis: Administrador · Escritório · Encarregado · Funcionário · Cliente</small>
    </form>
  </section>

  <section id="app" class="app-shell" hidden>
    <header class="topbar">
      <div>
        <h1>DISTAK ERP 2.0</h1>
        <span>Gestão de obras, orçamentos, custos e faturação</span>
      </div>
      <div class="user-box">
        <strong>José Filipe Alves Silva</strong>
        <button class="btn ghost" onclick="DISTAK.logout()">Sair</button>
      </div>
    </header>

    <div class="layout">
      <aside class="sidebar">
        <button class="nav active" data-page="dashboard">📊 Dashboard</button>
        <button class="nav" data-page="clientes">👥 Clientes</button>
        <button class="nav" data-page="obras">🏗️ Obras</button>
        <button class="nav" data-page="orcamentos">🧾 Orçamentos</button>
        <button class="nav" data-page="custos">📉 Custos</button>
        <button class="nav" data-page="faturacao">💶 Faturação</button>
        <button class="nav" data-page="documentos">📂 Documentos</button>
        <button class="nav" data-page="relatorios">📑 Relatórios</button>
        <button class="nav" data-page="mobile">📱 Mobile</button>
      </aside>

      <main class="content">
        <section id="dashboard" class="page active-page">
          <div class="page-head">
            <h2>Painel Principal</h2>
            <div class="actions">
              <button class="btn primary" onclick="DISTAK.showPage('obras')">+ Nova obra</button>
              <button class="btn dark" onclick="DISTAK.showPage('orcamentos')">Gerar orçamento</button>
              <button class="btn light" onclick="DISTAK.showPage('faturacao')">Aviso pagamento</button>
            </div>
          </div>
          <div class="kpis" id="kpis"></div>
          <div class="grid two">
            <article class="panel">
              <h3>Obras principais</h3>
              <div class="table-wrap"><table id="dashboard-obras"></table></div>
            </article>
            <article class="panel alerts">
              <h3>Alertas automáticos</h3>
              <p><span class="badge red">Urgente</span> Fatura M/59 em atraso: 2.560,44 €.</p>
              <p><span class="badge yellow">Obra suspensa</span> Telhado Malveira aguarda sinal.</p>
              <p><span class="badge blue">Margem</span> Obras grandes com contingência protegida.</p>
            </article>
          </div>
        </section>

        <section id="clientes" class="page">
          <div class="page-head"><h2>Clientes</h2><button class="btn primary">+ Novo cliente</button></div>
          <article class="panel"><div class="table-wrap"><table id="clientes-table"></table></div></article>
        </section>

        <section id="obras" class="page">
          <div class="page-head"><h2>Obras</h2><button class="btn primary">Guardar obra</button></div>
          <article class="panel form-panel">
            <h3>Criar / editar obra</h3>
            <div class="form-grid">
              <input placeholder="Nome do cliente"><input placeholder="NIF"><input placeholder="Morada da obra"><input placeholder="N.º orçamento">
              <input placeholder="Mão de obra €"><input placeholder="Materiais €"><input placeholder="Subempreiteiros €"><input placeholder="Logística / máquinas €">
              <select><option>Estado</option><option>Orçamento</option><option>Aprovado</option><option>Em execução</option><option>Concluído</option><option>Em atraso</option></select>
              <select><option>Margem segurança 15%</option><option>5%</option><option>10%</option><option>20%</option><option>25%</option><option>30%</option></select>
            </div>
            <textarea placeholder="Notas técnicas, cláusulas, observações, prazos e garantia."></textarea>
          </article>
          <article class="panel"><div class="table-wrap"><table id="obras-table"></table></div></article>
        </section>

        <section id="orcamentos" class="page">
          <div class="page-head"><h2>Orçamentos automáticos</h2><button class="btn dark" onclick="DISTAK.printPage()">Exportar PDF</button></div>
          <article class="panel">
            <div class="tabs"><span>Remodelação</span><span>Telhado</span><span>Fachada</span><span>Construção</span><span>Legalização</span></div>
            <div class="form-grid">
              <input placeholder="N.º orçamento"><input placeholder="Data"><input placeholder="Cliente"><input placeholder="NIF"><input placeholder="Morada da obra"><input placeholder="Prazo execução"><input placeholder="Validade 60 dias"><input placeholder="Responsável">
            </div>
            <div class="table-wrap"><table id="orcamento-table"></table></div>
            <textarea placeholder="Descrição técnica dos trabalhos"></textarea>
            <textarea placeholder="Condições comerciais: sinal, pagamentos, suspensão por falta de pagamento"></textarea>
            <textarea placeholder="Garantias, exclusões e trabalhos não incluídos"></textarea>
          </article>
        </section>

        <section id="custos" class="page">
          <div class="page-head"><h2>Custos por obra</h2><button class="btn primary">Adicionar despesa</button></div>
          <article class="panel"><div class="table-wrap"><table id="custos-table"></table></div></article>
        </section>

        <section id="faturacao" class="page">
          <div class="page-head"><h2>Faturação e pagamentos</h2><button class="btn primary">Nova fatura</button></div>
          <article class="panel"><div class="table-wrap"><table id="faturas-table"></table></div></article>
        </section>

        <section id="documentos" class="page">
          <div class="page-head"><h2>Documentos e fotografias</h2><button class="btn primary">Anexar ficheiro</button></div>
          <div class="modules">
            <div class="module"><h4>Relatórios técnicos</h4><p>Obra concluída, patologias resolvidas, relatórios para cliente, seguro ou tribunal.</p></div>
            <div class="module"><h4>Fotografias</h4><p>Antes, durante e depois da obra, organizadas por cliente e morada.</p></div>
            <div class="module"><h4>Contratos e garantias</h4><p>Contratos, autos, garantias, comunicações e comprovativos.</p></div>
          </div>
        </section>

        <section id="relatorios" class="page">
          <div class="page-head"><h2>Relatórios</h2><button class="btn dark" onclick="DISTAK.printPage()">Imprimir / PDF</button></div>
          <div class="modules">
            <div class="module"><h4>Lucro por obra</h4><p>Compara orçamento, despesas reais, margem protegida e lucro final.</p></div>
            <div class="module"><h4>Faturação mensal</h4><p>Valores faturados, recebidos, vencidos e em atraso.</p></div>
            <div class="module"><h4>IVA e contabilidade</h4><p>Resumo de IVA, despesas, comprovativos e documentos para contabilidade.</p></div>
          </div>
        </section>

        <section id="mobile" class="page">
          <div class="page-head"><h2>Aplicação móvel</h2></div>
          <article class="phone"><div class="screen"><h3>Distak Mobile</h3><div class="mobile-card">Check-in / Check-out<br><small>Horas por funcionário e obra</small></div><div class="mobile-card">Fotos automáticas<br><small>Antes · durante · depois</small></div><div class="mobile-card">Faturas de material<br><small>Fotografar e anexar</small></div><div class="mobile-card">Assinatura cliente<br><small>Aprovação no ecrã</small></div></div></article>
        </section>
      </main>
    </div>
  </section>

  <script src="data/sample-data.js"></script>
  <script src="assets/app.js"></script>
</body>
</html>
