# Implantação controlada para dados reais — DISTAK ERP

Este roteiro transforma o pacote local auditado numa implantação verificável. Não iniciar carga real enquanto uma etapa P0 estiver pendente.

## Pré-condições

- Registar o commit exato, a hora de início, o responsável e o projeto Supabase `distak-erp` (`usaaiubvynxyfviwgogs`).
- Confirmar uma cópia lógica recente pelo ERP e a política de backup/Storage do projeto. Guardar a cópia fora da pasta pública do site.
- Gerar um segredo longo e aleatório para `ERP_LEADS_TOKEN`; configurar o mesmo valor no backend do site e nos segredos da Edge Function. Nunca colocar o valor no frontend, no Git, em capturas de ecrã ou neste documento.
- Confirmar que o formulário do site envia `Authorization: Bearer …`, `Content-Type: application/json` e o mesmo UUID em `x-idempotency-key` e `public_id`.
- Ter contas de teste de administrador, funcionário atribuído e cliente com publicação autorizada, além de uma obra sem dados pessoais reais.

## Ordem obrigatória

1. Executar `node tests/preflight.mjs` e guardar o resultado de 31 validadores.
2. Aplicar `supabase/migrations/20260820120000_preparar_dados_reais.sql`.
3. Confirmar que o RPC `guardar_orcamento_com_itens` é `SECURITY INVOKER`, não é executável por `anon` e é executável por `authenticated`.
4. Publicar `supabase/functions/receber-lead-site/index.ts` com `verify_jwt=false`; a autenticação pública é o Bearer próprio validado pela função.
5. Publicar o frontend completo desta revisão. Não publicar apenas ficheiros isolados, porque Storage, portal, campo e service worker mudam em conjunto.
6. Testar um lead válido, a repetição idempotente do mesmo lead, token inválido, JSON inválido e corpo acima de 20 KB. Confirmar códigos 201, 200, 401, 400 e 413, respetivamente.
7. Testar criação e edição de um orçamento com duas linhas; provocar um número duplicado e confirmar que nenhum cabeçalho ou linha parcial fica gravado.
8. Ainda com o bucket público, testar fotografias como administrador, funcionário atribuído e cliente autorizado. Confirmar que o portal guarda `foto_path`, não um URL temporário.
9. Aplicar `supabase/migrations/20260820121500_tornar_fotografias_obras_privadas.sql`.
10. Repetir os testes de fotografia e confirmar que o URL público antigo deixa de servir o ficheiro e que os URLs assinados expiram.
11. Ativar **Leaked password protection** em Supabase Auth.
12. Executar `supabase/verificar_prontidao_dados_reais.sql`: todos os booleanos devem ser `true` e todas as contagens devem ser `0`.
13. Executar e exportar os quatro cenários humanos: administrador e funcionário, em computador e telemóvel.
14. Realizar um restauro de ensaio fora de produção e registar RPO, RTO, resultado e responsável.

## Pontos de paragem e reversão

- Se a primeira migração falhar, não publicar a função nem o frontend. Guardar o erro e rever a migração; não repetir às cegas.
- Se a Edge Function falhar, manter o formulário do site sem envio e não remover a autenticação Bearer para contornar o problema.
- Depois de o bucket ficar privado, não reverter o frontend para uma versão que usa URLs públicas. Repor temporariamente o bucket como público é uma exceção de incidente que reduz a privacidade e exige autorização explícita.
- Uma falha de teste após qualquer etapa bloqueia as etapas seguintes. Não carregar dados reais para “experimentar”.

## Critério final

A implantação só fica autorizada para um piloto controlado quando: verificações SQL normais, advisors revistos, proteção de palavras-passe ativa, cinco testes do endpoint concluídos, orçamento atómico confirmado, três perfis de fotografia aprovados, quatro cenários humanos exportados e restauro de ensaio documentado.
