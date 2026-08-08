# Histórico de versões

## v3.8 — em desenvolvimento

- O escopo operacional desta fase passa a exigir somente Administrador e Funcionário; o perfil Cliente permanece suportado, mas a criação e validação de contas do portal foram adiadas e não bloqueiam a publicação.
- A base de produção foi conferida sem alterações: existe uma conta Administrador ativa, uma conta Funcionário ativa com obras atribuídas e nenhum acesso de Cliente ativo.
- A direção visual “Criativa avançada” foi escolhida e preparada com Anime.js 4.4.1 local para navegação, cartões, gráficos, alertas, modais e assistente.
- A camada pode ser desligada, respeita redução de movimento, alto contraste, poupança de dados e equipamentos lentos, e não anima valores ou ações críticas.

- O Centro de Relatórios passa a apresentar prontidão administrativa de ligação, sessão, módulos, PWA e atualidade da cópia local.
- A exportação guarda neste dispositivo apenas data, versão e contagem total; não transmite telemetria nem permite recuperação automática.

- Primeiro Centro de Acessos administrativo, somente de leitura, reúne contas, estados, perfis, atribuições por obra e vínculos do Portal do Cliente.
- Contas desativadas e perfis inválidos ficam visíveis como pontos de revisão, sem alterar permissões automaticamente.
- Filtros por nome, e-mail, perfil e estado ajudam a auditar o alcance de cada conta.
- Atalhos levam à revisão das obras atribuídas ou do Portal do Cliente sem executar mutações.
- Novo validador automatizado cobre estados, papéis, vínculos, filtros e ausência de mutações na análise.
- A saúde dos acessos sinaliza contas desativadas com vínculos ativos, perfis inválidos, equipa sem obra e clientes sem associação.
- Cada conta apresenta a atividade mais recente conhecida a partir do histórico autorizado do ERP.
- O administrador pode exportar uma auditoria local em JSON com contas, perfis, estados, obras atribuídas, vínculos de cliente, atividade recente e achados de segurança.
- O relatório não inclui dados financeiros e exige confirmação explícita antes do download; nenhum conteúdo é enviado para serviços externos.
- O orçamento automatizado de JavaScript da v3.8 passa de 310 KB para 315 KB para acomodar a auditoria, mantendo limite rígido e crescimento inferior a 2%.
- Inconsistências do Centro de Acessos passam a gerar notificações administrativas acionáveis, com destino direto à conta e sem exposição para equipa ou clientes.
- A entrada passa a oferecer recuperação segura de acesso iniciada pelo próprio utilizador, com resposta neutra para não revelar contas registadas.
- A nova palavra-passe segue as regras fortes do projeto (10 caracteres, minúscula, maiúscula, número e símbolo) e a sessão de recuperação é encerrada depois da alteração.
- O orçamento automatizado de JavaScript passa de 315 KB para 320 KB para acomodar a recuperação, mantendo o total real em 315,8 KB.
- Entradas, saídas e recuperações de acesso passam a ficar registadas no histórico protegido existente, sem tokens, palavras-passe, IP, navegador ou identificação do dispositivo.
- O Centro de Acessos apresenta ao administrador os eventos de autenticação dos últimos 30 dias e a auditoria local passa ao formato v2 com um resumo mínimo das sessões.
- A migração adiciona apenas três ações ao controlo existente e um índice parcial, preservando as políticas RLS e todos os registos anteriores.
- O Centro de Acessos passa a preparar alterações administrativas de perfil e estado para os cinco papéis válidos: Administrador, Escritório, Encarregado, Funcionário e Cliente.
- Cada alteração exige motivo, revisão e confirmação humana; o servidor impede autoalteração, administrador desativado, remoção do último administrador e transições incompatíveis com vínculos ativos.
- A tabela de perfis concede somente leitura ao papel autenticado; escritas diretas e o privilégio antigo de TRUNCATE são removidos, enquanto mudanças passam exclusivamente pela operação protegida e ficam registadas na auditoria.
- O Portal do Cliente passa a exigir perfil de cliente ativo mesmo quando existe uma sessão anterior, e clientes deixam de aparecer na atribuição operacional de obras.
- A API pública de gestão usa `SECURITY INVOKER`; a lógica privilegiada fica no esquema privado, removendo o novo aviso do advisor sem enfraquecer as validações.
- O orçamento automatizado de JavaScript passa de 320 KB para 325 KB, mantendo o total real em 322,2 KB.
- Os convites de Escritório, Encarregado, Funcionário e Cliente passam a usar um único fluxo administrativo protegido; convites de Administrador continuam proibidos.
- O formulário exige revisão explícita do e-mail, perfil e alcance, associa clientes ou obras no servidor e limita cada administrador a cinco convites por hora.
- Falhas na preparação do perfil, vínculos ou auditoria cancelam apenas a conta recém-criada no mesmo pedido, evitando acessos incompletos.
- O botão de convite do Portal do Cliente encaminha para o fluxo central; nenhuma chave privilegiada ou operação administrativa foi exposta no frontend.
- A publicação deste incremento não envia convites nem cria contas: a primeira validação real continua condicionada à autorização específica.
- A revisão de acessos da equipa por obra passa a ser uma operação atómica protegida no servidor, substituindo o antigo ciclo de apagar e recriar vínculos no navegador.
- A função aceita somente contas ativas de Escritório, Encarregado ou Funcionário, valida todas as obras, serializa alterações concorrentes e exige confirmação humana.
- Vínculos removidos são desativados em vez de eliminados; o histórico anterior, as adições, remoções e o alcance final ficam registados na auditoria.
- A migração foi aplicada sem alterar os seis vínculos ativos existentes, confirmados por contagem e assinatura antes/depois.
- O Portal do Cliente passa a apresentar contas por nome e e-mail, clientes associados e estado, substituindo a antiga lista de identificadores técnicos.
- Administradores podem preparar a revisão completa dos clientes associados a cada conta; contas inativas ficam visíveis, mas não podem receber alterações.
- A revisão é atómica, valida conta e clientes no servidor, preserva vínculos removidos como inativos e regista alcance anterior/final na auditoria.
- O orçamento de JavaScript passa de 325 KB para 330 KB para acomodar a gestão de vínculos, mantendo tamanho real de 327,6 KB e limite automatizado.
- A migração conservou zero vínculos antes e depois; nenhuma conta de cliente ou associação real foi criada durante a publicação.
- O Centro de Acessos passa a incluir uma matriz de validação por perfil, com seis cenários separados para Administrador, Equipa e Cliente no computador e telemóvel.
- A matriz calcula somente pré-condições a partir dos dados já autorizados, identifica pendências e mantém `realValidationPerformed=false` até à execução com contas separadas.
- O plano pode ser exportado localmente em JSON; não chama o banco de dados, não altera registos e não transmite informação a serviços externos.
- A produção atual apresenta Administrador e Equipa preparados, Cliente pendente e apenas as duas contas existentes; nenhum perfil foi declarado validado.
- O orçamento de JavaScript passa de 330 KB para 335 KB, mantendo total real de 333,7 KB e limite individual de 25 KB por módulo.
- O Portal do Cliente passa a gerir atualizações e documentos como rascunhos explícitos, sem publicação automática e sem opção de eliminação neste fluxo.
- A primeira publicação de obra, atualização ou documento exige confirmação humana e recorda a exclusão de custos, margens e informação interna.
- Fotografias já existentes na obra podem ser escolhidas como capa, evitando copiar endereços manualmente; URLs manuais continuam disponíveis apenas por HTTPS.
- Endereços com HTTP, protocolos executáveis, credenciais incorporadas ou mais de 2048 caracteres são rejeitados antes da gravação.
- O painel apresenta separadamente rascunhos e conteúdos publicados, com formulários responsivos para atualização e documento.
- A produção conserva zero obras, atualizações e documentos no portal; as cinco fotografias e sete documentos internos existentes não foram publicados nem alterados.
- Os limites passam para 112 KB de HTML, 152 KB de CSS e 345 KB de JavaScript, mantendo valores reais de 108,4 KB, 148,5 KB e 341,9 KB.

## v3.7 — publicada em 8 de agosto de 2026

- O Assistente DISTAK passa a responder no próprio dispositivo a perguntas sobre carga da equipa, qualidade dos dossiês e próximas ações recomendadas.
- As análises locais reutilizam os motores explicáveis do ERP, não enviam os dados dessas consultas ao backend e não executam alterações automaticamente.
- Consultas financeiras e restantes resumos continuam limitados ao backend DISTAK autenticado e somente de leitura.
- A interface identifica claramente quando a resposta foi processada localmente e oferece atalhos seguros apenas para navegação.
- A PWA passa a guardar todos os módulos necessários para funcionamento offline e apresenta um botão claro para aplicar novas versões.
- O carregamento de listas suporta paginação acima de mil registos, evitando truncamento silencioso à medida que o ERP cresce.
- Falhas em módulos opcionais passam a ser comunicadas ao utilizador, em vez de aparecerem como listas vazias sem explicação.
- A política de segurança deixa de permitir scripts inline e a versão é alinhada no site, manifesto, documentação e cache.

## v3.6 — publicada em 7 de agosto de 2026

- A inteligência interna passa a indicar a próxima melhor ação para cada obra, priorizando bloqueios, atrasos, faturas vencidas, margem, recebimentos e qualidade dos dados.
- Cada recomendação apresenta o motivo e abre apenas a área relevante; nenhuma alteração financeira ou operacional é executada automaticamente.
- A navegação móvel do cliente passa a mostrar somente os destinos permitidos, com “Minhas obras” como entrada principal e uma barra inferior adaptada ao perfil.
- A verificação de cópias passa a apresentar prontidão para recuperação, idade do ficheiro, identificadores duplicados e ligações quebradas, mantendo qualquer restauro automático desativado.
- A carga da equipa passa a ponderar prioridade, atraso, bloqueios, proximidade do prazo e horas do mês, indicando pressão e disponibilidade sem reatribuir tarefas automaticamente.
- O dossiê de cada obra passa a avaliar metadados, zonas fotografadas, atualidade do registo visual e identificação dos documentos, além da completude por fase.

## v3.5 — publicada em 7 de agosto de 2026

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
