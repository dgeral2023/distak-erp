# DISTAK ERP v2.7 — Painel Mobile de Obra

Atualização mobile-first baseada na v2.6.

## Novidades
- Painel móvel dentro da ficha de cada obra.
- Acesso rápido à câmara e galeria.
- Checklist diária funcional.
- Registos rápidos de equipa, materiais, horas e ocorrências.
- Atalhos para relatórios e documentos.
- Dados operacionais provisórios guardados localmente no dispositivo.
- Interface pensada para utilização com uma mão no telemóvel.

## Ficheiros a substituir
- `index.html`
- `assets/js/modules/obras.js`
- `assets/css/fotografias.css`

Os restantes ficheiros incluídos mantêm a integração da v2.6.

## Nota técnica
Checklist e registos operacionais usam `localStorage` nesta versão. A sincronização com Supabase deve ser feita numa etapa posterior, após criação das tabelas e políticas RLS.

## Commit sugerido
`DISTAK ERP v2.7 - Painel mobile de obra`
