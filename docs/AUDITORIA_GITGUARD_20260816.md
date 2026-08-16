# Auditoria GitGuard — 16 de agosto de 2026

## Resultado analisado

O scan manual do commit `6dd6f7d746e2` apresentou quatro alertas: um segredo genérico de severidade alta e três alertas SAST de severidade média.

## Classificação e tratamento

| Alerta | Classificação | Tratamento |
| --- | --- | --- |
| Generic API Key | Falso positivo controlado | O único valor público é uma chave Supabase `sb_publishable_`, própria para aplicações web. O teste de segurança rejeita `sb_secret_`, `service_role`, chaves OpenAI e outros padrões secretos. A proteção dos dados continua dependente de autenticação, RLS e privilégios mínimos. |
| Timing attack | Corrigido | A comparação do checksum SHA-256 no navegador passou a acumular diferenças em tempo constante; o teste Node usa `timingSafeEqual`. |
| Insecure random generator | Corrigido | Os nomes de fotografias deixaram de usar `Math.random` como fallback e passam a usar exclusivamente Web Crypto. |
| Missing integrity | Corrigido | O recurso Supabase externo, fixado numa versão exata, recebeu SRI SHA-384 e `crossorigin="anonymous"`. |

## Regressão automatizada

O teste `tests/security.mjs` verifica agora que:

- somente chaves Supabase publicáveis podem existir no frontend;
- nenhum código próprio utiliza `Math.random`;
- recursos JavaScript externos possuem SRI SHA-384;
- a verificação de backup utiliza a comparação endurecida;
- CSP, RLS e proibições de credenciais privilegiadas continuam ativas.

Bibliotecas de terceiros versionadas são auditadas como dependências. Usos internos de aleatoriedade apenas visual por essas bibliotecas não devem ser confundidos com geração de tokens, identificadores ou credenciais do ERP.
