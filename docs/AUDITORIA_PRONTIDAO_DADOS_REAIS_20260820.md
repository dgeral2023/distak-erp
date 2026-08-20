# Auditoria de prontidão para dados reais — DISTAK ERP

Data: 20 de agosto de 2026  
Escopo: frontend ERP v3.8, PWA, integração do formulário do site, Supabase (base de dados, RLS, Storage, Auth, Edge Function, advisors e logs) e processo de cópia de segurança.

## Conclusão executiva

O código local ficou substancialmente mais seguro e os 31 validadores automáticos passam. A produção atual, porém, ainda não deve receber dados reais: as correções precisam de ser publicadas numa ordem controlada, a proteção contra palavras-passe comprometidas precisa de ser ativada e os quatro testes humanos continuam pendentes.

Estado recomendado: **apto para implantação e piloto controlado depois da checklist P0; ainda não apto para carga real em produção hoje**.

Uma auditoria extensa reduz o risco, mas não prova ausência absoluta de bugs. A validação humana com os perfis reais e uma rotina de backup restaurável continuam obrigatórias.

## Evidência recolhida

- Produção responde por HTTPS com HTTP 200, título DISTAK ERP v3.8 e Content Security Policy.
- As tabelas públicas têm RLS ativo; o papel anónimo não tem privilégios nas tabelas do ERP.
- A única vista pública usa security_invoker.
- Não existem constraints pendentes de validação nem números de orçamento duplicados no conjunto atual.
- O projeto Supabase está operacional em PostgreSQL 17.
- Logs das últimas 24 horas: pedidos de lead concluídos com 201; sem erro de aplicação relevante em Auth, Storage ou Edge Functions. O PostgreSQL registou apenas atividade normal e uma ligação interrompida pelo cliente.
- Advisors de segurança: duas funções SECURITY DEFINER deliberadamente expostas apenas a utilizadores autenticados e com validação interna; proteção contra palavras-passe comprometidas desativada.
- Advisors de desempenho: apenas índices ainda não utilizados num conjunto de dados de teste pequeno; não foram removidos.
- O bucket distak-documentos já é privado. O bucket distak-obras continua público em produção e é o principal bloqueio de privacidade.

## Bugs corrigidos no código local

### 1. Fotografias de obras publicamente acessíveis — crítico

Problema: distak-obras é um bucket público e o frontend criava URLs públicas. Em Supabase, uma leitura pública do bucket não passa pelas políticas RLS de Storage.

Correção preparada:

- frontend passou a guardar caminhos estáveis e a pedir URLs assinados temporários;
- campo, galeria e portal do cliente usam os URLs assinados;
- publicação no portal guarda foto_path, não um URL temporário;
- política SELECT limita a fotografia ao administrador, utilizador atribuído à obra ou cliente com publicação autorizada;
- migração final torna o bucket privado.

Implantação foi dividida em duas migrações para evitar que a versão antiga perca fotografias durante a publicação.

### 2. Endpoint público de leads sem autenticação efetiva — crítico

Problema: a função aceitava chamadas anónimas com service role, ignorava ERP_LEADS_TOKEN e a chave de idempotência. O limite pelo IP do Worker podia bloquear todos os visitantes depois de cinco pedidos.

Correção preparada:

- segredo Bearer obrigatório e comparação em tempo constante;
- content-type e limite real de 20 KB;
- UUID público e x-idempotency-key obrigatoriamente iguais;
- índice único para deduplicação, incluindo corrida concorrente;
- limite por email, em vez do IP partilhado do Worker;
- erros de JSON, método e tamanho têm respostas próprias;
- versão supabase-js atualizada e fixa.

### 3. Escritas sem efeito reportadas como sucesso — alto

Problema: atualizar ou eliminar uma linha inexistente, ou invisível por RLS, podia regressar sem erro e produzir uma mensagem/auditoria enganadora.

Correção: save e remove exigem agora a devolução do ID afetado e falham explicitamente quando nenhuma linha é alterada.

### 4. Cópia de segurança incompleta — alto

Problema: leads e cinco áreas do CRM não eram exportados; além disso, uma falha no carregamento de um módulo ainda permitia criar uma cópia aparentemente completa.

Correção:

- incluídos leads, contactos, moradas, notas, comunicações e metadados documentais de clientes;
- relações CRM-cliente verificadas no ensaio;
- exportação bloqueada enquanto existirem avisos de carregamento incompleto;
- teste automático cobre contagens, checksum, duplicados, relações, antiguidade, acesso administrativo e ausência de escrita.

Limite consciente: os ficheiros binários de Storage não fazem parte do JSON. O JSON é uma cópia lógica; a recuperação completa depende também do backup do Supabase/Storage.

### 5. Cache PWA podia guardar uma página de erro — médio

Problema: navegações sem sucesso também podiam substituir o index offline, e as escritas na cache não eram aguardadas.

Correção: apenas respostas OK entram na cache e cache.put é aguardado pelo fluxo.

### 6. Números de orçamento sujeitos a corrida — médio

Problema: dois utilizadores podiam calcular o mesmo próximo número no frontend.

Correção preparada: índice único normalizado para números de orçamento não vazios. A interface passará a mostrar o conflito em vez de guardar duplicados.

### 7. Orçamento e linhas sujeitos a gravação parcial — alto

Problema: o cabeçalho, cada linha e as eliminações eram escritos em pedidos separados. Uma falha intermédia podia deixar o orçamento incompleto.

Correção preparada: um RPC PostgreSQL `SECURITY INVOKER` valida os campos e as linhas, recalcula os totais no servidor e grava o conjunto numa única transação sujeita a RLS. Qualquer erro reverte toda a operação.

## Riscos ainda não eliminados

### P0 — concluir antes de dados reais

1. Definir o mesmo ERP_LEADS_TOKEN no ambiente do site e nos segredos da Edge Function.
2. Aplicar a primeira migração de preparação.
3. Publicar a nova Edge Function e o frontend.
4. Validar fotografias com administrador, funcionário atribuído e cliente.
5. Aplicar a segunda migração, que torna distak-obras privado.
6. Ativar a proteção contra palavras-passe comprometidas no Supabase Auth.
7. Executar os quatro cenários humanos pendentes: administrador em computador/telemóvel e funcionário em computador/telemóvel.
8. Confirmar política de backup do projeto e realizar um restauro de ensaio fora de produção.

### P1 — fazer antes de utilização financeira intensiva

- Definir política formal de retenção, RPO/RTO, responsável por recuperação e periodicidade do ensaio.
- Os limites e tipos MIME ficam impostos também nos buckets; definir uma solução de antivírus antes de aceitar anexos externos em escala.
- Adicionar monitorização e alerta para falhas 4xx/5xx repetidas na Edge Function e falhas de autenticação anormais.

### P2 — evolução do produto

- Dashboard de qualidade dos dados: NIF duplicado, contactos incompletos, obras sem responsável, documentos em falta e orçamentos vencidos.
- Importador CSV/XLSX com pré-visualização, validação e modo de simulação antes da escrita.
- Registo de consentimento e política de retenção por tipo de dado pessoal.
- Paginação/consulta por área para grandes volumes, reduzindo o carregamento integral do ERP.
- Ambiente de staging com dados fictícios e teste end-to-end automático.

## Ordem segura de implantação

1. Criar/confirmar segredos, sem alterar o tráfego.
2. Aplicar supabase/migrations/20260820120000_preparar_dados_reais.sql.
3. Publicar supabase/functions/receber-lead-site/index.ts.
4. Publicar o frontend desta branch.
5. Fazer smoke test autenticado e teste do formulário do site.
6. Aplicar supabase/migrations/20260820121500_tornar_fotografias_obras_privadas.sql.
7. Repetir os testes de fotografia e portal.
8. Ativar a proteção de palavras-passe comprometidas.

O roteiro executável, os pontos de paragem e os critérios de aceitação estão em `docs/IMPLANTACAO_DADOS_REAIS_20260820.md`. A consulta pós-implantação somente de leitura está em `supabase/verificar_prontidao_dados_reais.sql`.
