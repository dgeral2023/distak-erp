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

