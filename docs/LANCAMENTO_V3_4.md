# Checklist de lançamento — DISTAK ERP v3.4

## Autorizações obrigatórias

- [ ] Autorização explícita para criar o papel e as permissões do Portal do Cliente.
- [ ] Autorização explícita para implantar a função de convites e enviar um convite de teste.
- [ ] Confirmação de que nenhum serviço generativo externo será ativado nesta versão.

## Antes da implantação

- [ ] Executar `node tests/preflight.mjs` e guardar o resultado.
- [ ] Exportar uma cópia administrativa de segurança e guardá-la em local privado.
- [ ] Confirmar projeto Supabase, branch Git e commit candidato.
- [ ] Rever a migração e confirmar que não contém `DELETE`, pagamentos ou alterações de custos.

## Implantação controlada

- [ ] Aplicar somente `202608052000_portal_cliente.sql`.
- [ ] Verificar RLS, grants e políticas das cinco tabelas do portal.
- [ ] Implantar `convidar-cliente` com verificação JWT ativa.
- [ ] Criar primeiro um acesso de teste, sem associar dados de outro cliente.
- [ ] Publicar uma obra de teste sem custos, margens ou informação interna.
- [ ] Validar computador e telemóvel com contas de administrador e cliente.
- [ ] Só depois abrir pull request, aguardar GitHub Actions e publicar o frontend.

## Validação após publicação

- [ ] Login administrativo e módulos existentes continuam funcionais.
- [ ] Cliente vê somente obras explicitamente publicadas para o seu vínculo.
- [ ] Fotografias e documentos usam HTTPS e pertencem ao conteúdo autorizado.
- [ ] Aprovar ou pedir revisão não altera obra, prazo, custo, orçamento ou pagamento.
- [ ] PWA instala e abre o shell após atualização do cache.

## Reversão sem perda de dados

- Reverter o frontend para o commit anterior publicado.
- Desativar os vínculos em `cliente_portal_acessos`; não eliminar contas ou registos.
- Manter tabelas, respostas e logs para auditoria.
- Não remover migrações aplicadas nem apagar dados para “voltar atrás”.
