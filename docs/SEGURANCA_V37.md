# Reforco de seguranca — DISTAK ERP v3.7

Data: 8 de agosto de 2026

## Evolucao v3.8 — historico de autenticacao

- O ERP regista somente entrada, saida e recuperacao de acesso, com utilizador e data gerados pelo banco de dados.
- Tokens, palavras-passe, IP, user-agent e identificadores do dispositivo nao sao guardados.
- As politicas RLS permanecem inalteradas: o administrador consulta o historico global e cada conta apenas os seus proprios eventos.
- O frontend nao determina nem envia a hora do evento; `criado_em` continua a usar `now()` no PostgreSQL.
- O indice parcial `atividades_sistema_sessao_data_idx` acelera a consulta administrativa sem alterar dados anteriores.

## Evolucao v3.8 — gestao de contas

- O papel autenticado conserva somente `SELECT` em `profiles`; INSERT, UPDATE, DELETE e TRUNCATE ficam removidos.
- A funcao `gerir_utilizador` valida no servidor o administrador ativo, o motivo e os vinculos antes de efetuar uma alteracao.
- A API publica usa `SECURITY INVOKER`; a implementacao privilegiada fica no esquema `private`, fora dos esquemas expostos pelo PostgREST.
- Autoalteracao, administrador desativado e remocao do ultimo administrador ativo sao bloqueados.
- Uma conta nao pode mudar entre Cliente e Equipa enquanto mantiver vinculos incompatíveis ativos.
- O Portal do Cliente confirma `profiles.ativo=true` e `role='cliente'` em cada consulta protegida.
- Aplicar a migracao e publicar o frontend nao altera nenhuma conta existente; uma mudanca exige acao e confirmacao posterior do administrador.

## Evolucao v3.8 — convites centralizados

- Apenas um administrador autenticado e ativo pode preparar convites de Escritorio, Encarregado, Funcionario ou Cliente; o fluxo não permite criar outro Administrador.
- O servidor valida origem, sessão, perfil, cliente, obras e o limite de cinco convites por administrador a cada hora.
- A interface exige confirmação explícita do e-mail, perfil e alcance antes de chamar a função protegida.
- Vínculos iniciais de cliente ou obra são criados no servidor e registados na auditoria sem guardar o endereço de e-mail nos metadados.
- Se perfil, vínculos ou auditoria falharem, somente a conta recém-criada naquele pedido é cancelada para evitar um acesso parcial.
- A implantação da função e da interface não envia convite nem cria conta; isso ocorre apenas após uma ação administrativa confirmada.

## Evolucao v3.8 — acessos atomicos por obra

- A interface não apaga nem insere diretamente em `obra_utilizadores`; envia a seleção completa para uma operação transacional no servidor.
- Somente um administrador ativo pode rever uma conta ativa de Escritorio, Encarregado ou Funcionario.
- Todas as obras são validadas antes da escrita e um bloqueio transacional impede revisões concorrentes da mesma conta.
- Atribuições removidas ficam inativas para preservar o histórico; atribuições novas ou reativadas usam a restrição única obra/conta.
- A auditoria regista o motivo, alcance anterior e final, adições e remoções, sem dados financeiros.
- `anon` não executa a API; a superfície pública usa `SECURITY INVOKER` e delega para a implementação protegida no esquema privado.
- A aplicação da migração conservou os seis vínculos ativos e a mesma assinatura de conteúdo antes e depois.

## Chaves do frontend

- O navegador recebe somente a chave Supabase `sb_publishable_...`, apropriada para componentes publicos.
- Nenhuma chave `sb_secret_...`, `service_role` ou OpenAI foi encontrada no frontend, na publicacao ou no historico Git.
- A protecao dos dados permanece baseada em autenticacao e Row Level Security (RLS).

## Permissoes reforcadas

- A leitura de uma obra atribuida exige `obra_utilizadores.ativo = true`.
- `public.is_admin()` revoga execucao para `public` e `anon`, mantendo somente o papel autenticado necessario as politicas.
- `public.responder_cliente_portal_aprovacao(uuid, text)` revoga execucao para `public` e `anon`, mantendo o fluxo autenticado e validado do cliente.

## Configuracao de autenticacao

- O cadastro publico de utilizadores esta desativado; novas contas entram apenas pelos fluxos administrativos de convite.
- Login anonimo e vinculacao manual permanecem desativados.
- A confirmacao de e-mail permanece obrigatoria.
- As palavras-passe novas ou alteradas exigem no minimo 10 caracteres, com minusculas, maiusculas, digitos e simbolos.
- A alteracao de palavra-passe exige autenticacao recente e a palavra-passe atual.
- O codigo OTP de e-mail usa 8 digitos e expira em 600 segundos.
- A verificacao de palavras-passe comprometidas nao esta disponivel no plano gratuito. O aviso do Security Advisor e conhecido e fica como melhoria futura caso o projeto migre para Pro.

