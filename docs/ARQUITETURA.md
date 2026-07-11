# Arquitetura DISTAK ERP v2.0

assets/js/core
- auth.js: sessão e autenticação
- supabase.js: acesso à base de dados
- store.js: estado da aplicação
- ui.js: funções visuais

assets/js/modules
- dashboard.js
- clientes.js
- obras.js
- orcamentos.js
- custos.js
- pagamentos.js
- data.js

Novos módulos devem ser adicionados em assets/js/modules sem concentrar tudo no app.js.
