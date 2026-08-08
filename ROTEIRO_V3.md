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

Progresso: Centro de Acessos administrativo concluído com inventário, estados, cinco perfis suportados, obras atribuídas, vínculos de clientes, atividade recente, diagnóstico, notificações, relatório local e alteração protegida de perfil/estado com confirmação e auditoria. Recuperação segura de palavra-passe e histórico mínimo de entradas, saídas e recuperações concluídos. O fluxo central de convites está preparado, mas nenhum convite real foi enviado. Para a versão atual, o escopo operacional aprovado é de uma conta Administrador e uma conta Funcionário. O perfil Cliente e a criação de contas para o portal ficam adiados, sem remover a funcionalidade já preparada. A execução real no computador e telemóvel continua registada separadamente da verificação automática.

1. Gestão completa de utilizadores, convites, estados, perfis e acessos por obra.
2. Validar os fluxos com as contas reais existentes de Administrador e Funcionário; não criar nem convidar contas adicionais nesta fase.
3. Confirmar isolamento de dados, navegação, notificações e ações permitidas para Administrador e Funcionário. A validação do Cliente fica para uma fase futura.
4. Melhorar recuperação de acesso, histórico de sessões e registos administrativos.
5. Evoluir notificações acionáveis, fotografias, documentos e relatórios.

## v3.8 — Fase visual Anime.js

Esta fase começa depois da confirmação das pré-condições dos perfis incluídos no escopo atual: Administrador e Funcionário. Antes de integrar a biblioteca, foram apresentados exemplos visuais comparáveis para aprovação do estilo.

Progresso: as três intensidades foram apresentadas e o proprietário escolheu **Criativa avançada**. A implementação técnica local e reversível está preparada. O gate desta fase considera somente Administrador e Funcionário; Cliente foi adiado por decisão do proprietário e não bloqueia a publicação.

1. Criar demonstrações do menu híbrido, cartões do dashboard, gráficos, notificações, modais e assistente DISTAK.
2. Apresentar pelo menos três intensidades: discreta e profissional, dinâmica equilibrada e criativa avançada.
3. Escolher com o proprietário quais efeitos entram no computador e no telemóvel.
4. Integrar Anime.js v4 como dependência local, versionada e incluída no cache offline.
5. Animar somente `transform` e `opacity` sempre que possível, evitando alterações de layout e perda de desempenho.
6. Respeitar `prefers-reduced-motion`, modo de alto contraste, navegação por teclado e dispositivos mais lentos.
7. Manter valores financeiros, formulários e ações críticas estáveis e legíveis durante qualquer movimento.
8. Medir desempenho e permitir desativar ou reverter toda a camada visual sem afetar os módulos do ERP.

## Fases seguintes

1. Continuar qualidade e escala; diagnóstico local de prontidão e recuperação controlada concluído, faltando ensaio de recuperação fora de produção.
2. Evoluir o assistente operacional e preparar uma integração generativa externa somente após autorização específica própria.
3. Preparar monitorização, suporte e critérios para utilização comercial controlada.

## Regras permanentes

- Preservar todos os dados de produção e a arquitetura existente.
- Não efetuar pagamentos, alterar permissões críticas ou transmitir dados a serviços externos sem autorização explícita.
- Validar segurança, funcionamento no computador e telemóvel antes de cada publicação.
- Mostrar exemplos e obter aprovação visual antes de introduzir uma nova linguagem de animação ou interação.
- Publicar por GitHub com histórico claro e possibilidade de reversão.
