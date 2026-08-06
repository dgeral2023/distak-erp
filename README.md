# DISTAK ERP v3.5

Aplicação web de gestão comercial, financeira e operacional da DISTAK, otimizada para computador e telemóvel.

## Funcionalidades

- Dashboard executivo com indicadores financeiros, obras, equipa e orçamentos.
- Gestão de clientes, contactos, moradas, notas, comunicações e documentos.
- Obras com resumo financeiro, fotografias, documentos, diário e registos operacionais.
- Orçamentos com itens, estados e conversão em obra.
- Custos, faturas, pagamentos e anexos ligados automaticamente à obra.
- Funcionários, horas trabalhadas e custo operacional por obra.
- Autenticação, dados e ficheiros sincronizados através do Supabase.
- Pesquisa global, centro de alertas e relatórios executivos imprimíveis.
- Rentabilidade prevista versus real, vencimentos e cobranças por obra.
- Histórico central de alterações com identificação do utilizador.
- Menu híbrido inteligente: lateral recolhível por áreas no computador e barra inferior no telemóvel.
- Atalhos recentes, pesquisa por `Ctrl + K` e painel de registo rápido.

## Segurança

- A chave presente no frontend é apenas a chave pública/publishable do Supabase.
- As tabelas usam Row Level Security (RLS) e políticas para utilizadores autenticados.
- O papel anónimo não possui privilégios sobre os dados da aplicação.
- A biblioteca `supabase-js` é fixada numa versão exata.

## Verificação local

Execute os testes estáticos com:

```powershell
node tests/smoke.mjs
Get-ChildItem assets/js -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

## Publicação

A versão de produção é publicada pelo GitHub Pages a partir do branch `main`:

https://dgeral2023.github.io/distak-erp/
