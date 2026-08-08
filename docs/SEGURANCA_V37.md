# Reforco de seguranca — DISTAK ERP v3.7

Data: 8 de agosto de 2026

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

