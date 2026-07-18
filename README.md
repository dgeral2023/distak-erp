# DISTAK ERP v2.4.1 — Gestão de Fotografias (correção)

## Correção principal

A consulta da tabela `orcamentos` foi corrigida.

A estrutura real do Supabase possui:

- `orcamentos.obra_id -> obras.id`
- não possui ligação direta `orcamentos -> clientes`

Por isso, a consulta correta é:

```javascript
store.orcamentos = await query("orcamentos", "*,obras(nome)");
```

A consulta anterior tentava usar `clientes(nome)` diretamente e provocava um erro 400, interrompendo o carregamento dos dados do ERP.

## Substituir

- `index.html`
- `assets/js/app.js`
- `assets/js/core/store.js`
- `assets/js/core/supabase.js`
- `assets/js/modules/data.js`
- `assets/js/modules/obras.js`

## Adicionar ou substituir

- `assets/js/modules/fotografias.js`
- `assets/css/fotografias.css`

## Supabase

Não é necessário voltar a criar a tabela, o bucket ou as políticas. A infraestrutura já foi confirmada:

- tabela `obra_fotografias`
- chaves estrangeiras
- índices
- RLS
- quatro políticas da tabela
- bucket `distak-obras`
- quatro políticas do Storage

## Teste

1. Publicar todos os ficheiros deste pacote.
2. Fazer `Ctrl + F5`.
3. Confirmar que Clientes, Obras, Custos e Pagamentos voltaram a aparecer.
4. Abrir uma obra.
5. Abrir o separador Fotografias.
6. Carregar uma fotografia pequena de teste.

Commit sugerido:

`DISTAK ERP v2.4.1 - Corrige carregamento de dados e fotografias`
