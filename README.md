# DISTAK ERP v2.2 — Ficha profissional da obra

Substituir:
- `index.html`
- `assets/js/app.js`
- `assets/js/modules/data.js`
- `assets/js/modules/obras.js`

Adicionar:
- `assets/css/obra-ficha.css`

Commit sugerido:
`DISTAK ERP v2.2 - Ficha profissional das obras`

Esta versão usa a estrutura real do Supabase:
- obras: valor, valor_contratado, prazo, notas, progresso, responsável
- orçamentos: obra_id, número, mão de obra, materiais, logística, IVA
- custos: obra_id, descrição, tipo, valor, data
- pagamentos: obra_id, valor, data, método, observações

Nenhum valor é inventado. Só aparecem dados efetivamente associados a cada obra.
