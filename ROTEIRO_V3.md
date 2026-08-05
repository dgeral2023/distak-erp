# Roteiro de evolução — DISTAK ERP v3

Este documento mantém o plano de produção contínua do DISTAK ERP. Cada fase deve ser pequena, reversível, validada e publicada sem eliminar dados de produção.

## Concluído

- Base segura: autenticação, perfis, permissões por obra e políticas RLS.
- Frontend v3 responsivo: menu híbrido, navegação móvel, pesquisa, notificações e PWA.
- Dashboard executivo e dashboard de obras com gráficos, indicadores, fotografias e alertas.
- Clientes, obras, propostas/orçamentos, custos, pagamentos, equipa e relatórios.
- Agenda e tarefas operacionais.
- Previsões financeiras, cobranças e atrasos.
- Dossiê digital por obra com fotografias e documentos.
- Assistente DISTAK interno, limitado aos dados autorizados do utilizador.
- Centro Operacional para diários, checklists, equipa, materiais, horas e ocorrências.

## Próximas fases

1. Planeamento avançado de obras: etapas, prazos, dependências e calendário visual.
2. Compras e fornecedores: pedidos, comparação de propostas, entregas e controlo de desvios.
3. Medições e faturação: autos de medição, marcos contratuais e reconciliação de recebimentos.
4. Portal de equipa em campo: experiência móvel simplificada, trabalho offline e sincronização segura.
5. Inteligência de gestão: previsões de atraso, custo final e risco de cobrança, sempre com confirmação humana.
6. Portal do cliente: progresso autorizado, fotografias, documentos e aprovações.
7. Qualidade e escala: acessibilidade, desempenho, testes automatizados, auditoria e recuperação.

## Regras permanentes

- Preservar todos os dados de produção e a arquitetura existente.
- Não efetuar pagamentos, alterar permissões críticas ou transmitir dados a serviços externos sem autorização explícita.
- Validar segurança, funcionamento no computador e telemóvel antes de cada publicação.
- Publicar por GitHub com histórico claro e possibilidade de reversão.
