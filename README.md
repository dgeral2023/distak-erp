# DISTAK ERP v2.4 — Gestão de Fotografias

## Antes de publicar
Execute no Supabase SQL Editor:

`supabase/01_politicas_obra_fotografias.sql`

Este ficheiro garante os índices, ativa o RLS e cria as quatro políticas da tabela `obra_fotografias`.

## Substituir
- `index.html`
- `assets/js/app.js`
- `assets/js/core/store.js`
- `assets/js/core/supabase.js`
- `assets/js/modules/data.js`
- `assets/js/modules/obras.js`

## Adicionar
- `assets/js/modules/fotografias.js`
- `assets/css/fotografias.css`

## Funcionalidades
- Upload múltiplo para o bucket `distak-obras`
- Drag & drop
- Categorias Antes, Durante, Depois, Patologias e Outros
- Zona, título, descrição e data
- Galeria por obra
- Pesquisa e filtros
- Ampliação em lightbox
- Edição de metadados
- Eliminação do ficheiro no Storage e do registo na base de dados
- Compatível com a ficha profissional da obra

## Teste
1. Publicar os ficheiros.
2. Fazer Ctrl+F5.
3. Abrir Obras.
4. Abrir a Ficha de uma obra.
5. Selecionar Fotografias.
6. Carregar duas imagens de teste.

Commit sugerido:
`DISTAK ERP v2.4 - Gestão profissional de fotografias`
