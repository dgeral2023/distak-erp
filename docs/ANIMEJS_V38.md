# Camada visual Anime.js — v3.8

Direção aprovada: **Criativa avançada**, com contenção profissional nas áreas críticas.

## Implementação

- Anime.js 4.4.1, bundle ESM oficial, guardado localmente e fixado por SHA-256.
- Licença MIT incluída no repositório.
- Entrada sequencial de cartões e painéis, alertas, navegação, modais e assistente.
- Somente transformações, opacidade e realces visuais; valores e regras do ERP não são interpolados.
- Sem animações contínuas, sem dependência de CDN e disponível no cache offline.

## Segurança, acesso e desempenho

- `prefers-reduced-motion: reduce` desativa a camada automaticamente.
- Alto contraste, poupança de dados e equipamentos com até quatro núcleos usam modo desligado ou leve.
- Formulários, botões críticos, valores financeiros, autenticação e operações no banco não são alvos.
- O utilizador pode desligar tudo em **Perfil → Movimento criativo**.
- A desativação remove estilos inline aplicados e mantém o ERP funcional.

## Reversão

Remover a inicialização de `motion.js`, a folha `motion.css` e os eventos `distak:*` devolve a apresentação anterior sem alterar dados, esquema ou funcionalidades.
