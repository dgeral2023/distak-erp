# DISTAK ERP v1.1 - Perfis e Permissões

Esta versão liga o login ao Supabase e lê o campo `role` da tabela `profiles`.

Perfis principais:
- admin / administrador: acesso total
- escritorio: gestão operacional
- encarregado: obras e equipas
- funcionario: acesso limitado, sem dados financeiros
- cliente: portal cliente

Configuração obrigatória:
1. Abrir `assets/js/config.js`
2. Colocar `supabaseUrl`
3. Colocar `supabaseAnonKey`
4. Fazer commit e push

Tabela esperada no Supabase: `public.profiles`
Colunas esperadas: `id`, `email`, `nome`, `role`, `ativo`.
