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
- Segurança pós-v3.7 concluída: cadastro público e login anónimo desativados, palavras-passe fortes, OTP reduzido, atribuições inativas bloqueadas e funções privilegiadas endurecidas.

## v3.8 — Utilizadores, validação real e evolução visual

Progresso: Centro de Acessos administrativo de leitura concluído, com inventário de contas, estados, perfis, obras atribuídas e vínculos de clientes. Operações de convite ou mudança de permissão permanecem condicionadas à autorização específica.

1. Gestão completa de utilizadores, convites, estados, perfis e acessos por obra.
2. Validar os fluxos com contas reais separadas de administrador, equipa e cliente, somente após autorização específica para criar ou convidar esses utilizadores.
3. Confirmar isolamento de dados, navegação, notificações e ações permitidas para cada perfil.
4. Melhorar recuperação de acesso, histórico de sessões e registos administrativos.
5. Evoluir notificações acionáveis, fotografias, documentos e relatórios.

## v3.8 — Fase visual Anime.js

Esta fase começa somente depois da validação funcional dos perfis. Antes de integrar a biblioteca, serão apresentados exemplos visuais comparáveis para aprovação do estilo.

1. Criar demonstrações do menu híbrido, cartões do dashboard, gráficos, notificações, modais e assistente DISTAK.
2. Apresentar pelo menos três intensidades: discreta e profissional, dinâmica equilibrada e criativa avançada.
3. Escolher com o proprietário quais efeitos entram no computador e no telemóvel.
4. Integrar Anime.js v4 como dependência local, versionada e incluída no cache offline.
5. Animar somente `transform` e `opacity` sempre que possível, evitando alterações de layout e perda de desempenho.
6. Respeitar `prefers-reduced-motion`, modo de alto contraste, navegação por teclado e dispositivos mais lentos.
7. Manter valores financeiros, formulários e ações críticas estáveis e legíveis durante qualquer movimento.
8. Medir desempenho e permitir desativar ou reverter toda a camada visual sem afetar os módulos do ERP.

## Fases seguintes

1. Continuar qualidade, escala, observabilidade e recuperação controlada.
2. Evoluir o assistente operacional e preparar uma integração generativa externa somente após autorização específica própria.
3. Preparar monitorização, suporte e critérios para utilização comercial controlada.

## Regras permanentes

- Preservar todos os dados de produção e a arquitetura existente.
- Não efetuar pagamentos, alterar permissões críticas ou transmitir dados a serviços externos sem autorização explícita.
- Validar segurança, funcionamento no computador e telemóvel antes de cada publicação.
- Mostrar exemplos e obter aprovação visual antes de introduzir uma nova linguagem de animação ou interação.
- Publicar por GitHub com histórico claro e possibilidade de reversão.
