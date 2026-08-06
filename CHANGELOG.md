# Histórico de versões

## v3.6 — preparada sobre a v3.5

- A inteligência interna passa a indicar a próxima melhor ação para cada obra, priorizando bloqueios, atrasos, faturas vencidas, margem, recebimentos e qualidade dos dados.
- Cada recomendação apresenta o motivo e abre apenas a área relevante; nenhuma alteração financeira ou operacional é executada automaticamente.

## v3.5 — em desenvolvimento

- Novo Comando do Dia na Agenda, com prioridades explicáveis calculadas por atraso, bloqueio, urgência e proximidade do prazo.
- Visão de carga da equipa, incluindo tarefas abertas, atrasadas e sem responsável.
- Acesso rápido da prioridade recomendada à edição da respetiva etapa.
- Filtros rápidos para hoje, atrasos, bloqueios e tarefas sem responsável.
- Carga da equipa interativa para localizar e redistribuir trabalho com menos passos.
- Alerta consolidado para tarefas urgentes ou de prioridade alta ainda sem responsável.
- Índices de apoio adicionados às relações de autoria de compras, propostas e autos de medição.
- Bloqueios da agenda passam a registar motivo, momento do bloqueio e previsão não vinculativa de resolução.
- Centro de notificações acionável, com alertas críticos primeiro, remoção de duplicados e acesso direto à tarefa, obra ou distribuição de carga.
- Verificação administrativa de cópias de segurança, com validação de formato, versão, contagens e checksum, sem restaurar ou alterar dados.
- Dossiê documental adaptativo à fase da obra, com pontuação coerente, pendências prioritárias e acesso direto ao local de correção.
- Foco restaurado após fechar diálogos, rótulos automáticos, estados acessíveis nos painéis, alvos táteis e suporte a alto contraste.
- Primeira fase construída apenas com dados já autorizados no ERP, sem serviços externos ou alterações financeiras.

## v3.4 — publicada em 5 de agosto de 2026

- Portal do Cliente responsivo com obras, fotografias, progresso, etapas, datas, atualizações e documentos explicitamente publicados.
- Pedidos formais de aprovação com respostas limitadas a aprovar ou pedir revisão, sem efeitos financeiros ou operacionais automáticos.
- Painel administrativo para preparar conteúdos, gerir acessos e convidar clientes através de função server-side.
- Isolamento de dados internos com tabelas próprias, RLS, vínculo por cliente e bloqueio da navegação interna.
- Exportação administrativa de segurança com contagens e checksum SHA-256; sem restauração automática.
- Melhorias de teclado, leitores de ecrã, movimento reduzido, impressão e foco visível.
- Orçamento automático de desempenho, cobertura do shell PWA, CSP e auditoria preventiva no GitHub Actions.

As tabelas protegidas do Portal do Cliente e a função autenticada `convidar-cliente` foram ativadas. Nenhum convite ou acesso de cliente foi criado durante a publicação.

## v3.3 — publicada

- Inteligência de gestão interna e explicável para custo final, margem, prazo e risco de cobrança.
- Cenários com reserva, confiança dos dados e confirmação humana.

## v3.2 — publicada

- Portal da equipa em campo, registos móveis e fila offline.
- Revisão administrativa e acesso operacional por obra.
