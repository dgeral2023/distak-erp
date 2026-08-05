# Histórico de versões

## v3.4 — candidata, ainda não publicada

- Portal do Cliente responsivo com obras, fotografias, progresso, etapas, datas, atualizações e documentos explicitamente publicados.
- Pedidos formais de aprovação com respostas limitadas a aprovar ou pedir revisão, sem efeitos financeiros ou operacionais automáticos.
- Painel administrativo para preparar conteúdos, gerir acessos e convidar clientes através de função server-side.
- Isolamento de dados internos com tabelas próprias, RLS, vínculo por cliente e bloqueio da navegação interna.
- Exportação administrativa de segurança com contagens e checksum SHA-256; sem restauração automática.
- Melhorias de teclado, leitores de ecrã, movimento reduzido, impressão e foco visível.
- Orçamento automático de desempenho, cobertura do shell PWA, CSP e auditoria preventiva no GitHub Actions.

### Ativação pendente

A migração `202608052000_portal_cliente.sql` e a função `convidar-cliente` não foram aplicadas em produção. Nenhum perfil, acesso ou convite de cliente foi criado.

## v3.3 — publicada

- Inteligência de gestão interna e explicável para custo final, margem, prazo e risco de cobrança.
- Cenários com reserva, confiança dos dados e confirmação humana.

## v3.2 — publicada

- Portal da equipa em campo, registos móveis e fila offline.
- Revisão administrativa e acesso operacional por obra.
