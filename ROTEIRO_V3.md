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
- Planeamento avançado com cronograma visual, fases, progresso, marcos e dependências.
- Central de compras com pedidos, propostas de fornecedores, adjudicações, entregas e desvios.
- Autos de medição com linhas executadas, retenções, IVA, aprovações e referências de faturação.
- Portal da equipa em campo com tarefas, registos móveis, fotografias, fila offline, sincronização segura e revisão administrativa.
- Inteligência de gestão interna e explicável para prever custo final, margem, prazo e risco de cobrança, com cenários e confirmação humana.
- v3.4 publicada: Portal do Cliente isolado, publicações autorizadas, aprovações, convites server-side, recuperação, acessibilidade, desempenho e auditoria automatizada.
- v3.5 publicada: comando diário, distribuição de carga, agenda executável, prioridades, alertas explicáveis e bloqueios com motivo e previsão de resolução.
- v3.6 publicada: próximas ações explicáveis, carga ponderada, dossiês com qualidade documental, recuperação e navegação móvel por perfil.
- v3.7 publicada: assistente operacional local no dispositivo, PWA offline completo, paginação de dados e diagnóstico visível de módulos indisponíveis.

## Próximas fases

1. Validar os fluxos com contas reais separadas de administrador, equipa e cliente, somente após autorização específica para criar ou convidar esses utilizadores.
2. Corrigir avisos de segurança do Supabase que dependem de alteração explícita de permissões ou configuração de autenticação.
3. Evoluir notificações acionáveis, gestão de fotografias e documentos, relatórios e recuperação controlada.
4. Continuar qualidade, escala e observabilidade; integração generativa externa permanece fora do âmbito até autorização específica própria.

## Regras permanentes

- Preservar todos os dados de produção e a arquitetura existente.
- Não efetuar pagamentos, alterar permissões críticas ou transmitir dados a serviços externos sem autorização explícita.
- Validar segurança, funcionamento no computador e telemóvel antes de cada publicação.
- Publicar por GitHub com histórico claro e possibilidade de reversão.
