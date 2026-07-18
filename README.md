# DISTAK ERP v2.4.2 — Fotografias para funcionários e administradores

## Correção

O botão **Adicionar fotografias** estava marcado com a classe `admin-only`.
Por isso desaparecia quando a conta tinha o perfil `funcionario`.

Agora:

- Administrador pode adicionar fotografias.
- Funcionário pode adicionar fotografias.
- Administrador continua a poder editar e eliminar fotografias.
- Funcionário pode visualizar e carregar fotografias, mas não eliminar registos.

As políticas já configuradas no Supabase permitem INSERT para qualquer utilizador autenticado, portanto não é necessária nova alteração no Supabase.

## Substituir

Para uma atualização mínima:

- `index.html`
- `assets/js/modules/fotografias.js`

Também pode substituir todos os ficheiros do pacote para garantir que fica na versão completa v2.4.2.

## Teste

1. Publicar os ficheiros.
2. Fazer `Ctrl + F5`.
3. Entrar com a conta do funcionário.
4. Abrir Obras → Ficha → Fotografias.
5. Confirmar o botão **Adicionar fotografias**.
6. Carregar uma fotografia pequena de teste.

Commit sugerido:

`DISTAK ERP v2.4.2 - Funcionários podem adicionar fotografias`
