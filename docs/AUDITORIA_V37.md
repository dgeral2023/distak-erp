# Auditoria completa — DISTAK ERP v3.7

Data: 8 de agosto de 2026

## Estado geral

A aplicação está funcional, com separação por papéis, RLS ativa em todas as tabelas públicas, funções de servidor com JWT obrigatório, chave publicável no frontend e validação automatizada. A auditoria ampliou a cobertura para 14 validadores e corrigiu problemas confirmados no frontend, PWA, acessibilidade e acesso a dados.

## Correções realizadas

- Versão alinhada como v3.7 no título, menu, manifesto, documentação e cache.
- Scripts inline removidos; a CSP já não precisa de `unsafe-inline` em `script-src`.
- PWA passa a guardar todos os ficheiros JavaScript e CSS necessários para uso offline.
- Atualizações da PWA passam a mostrar uma ação clara “Atualizar agora”.
- Consultas ao Supabase passam a paginar acima de mil registos, evitando truncamento silencioso.
- Falhas de módulos opcionais passam a ser comunicadas ao utilizador.
- Todos os campos de formulário passam a ter nome acessível; o botão de entrada cumpre 44 px no telemóvel.
- Documentação e roteiro atualizados para refletir v3.5, v3.6 e v3.7.

## Evidências verificadas

- 38 tabelas públicas identificadas, todas com RLS ativa.
- Funções `assistente-distak` e `convidar-cliente` ativas com verificação JWT.
- Assistente operacional local não envia carga, qualidade dos dossiês ou próximas ações ao backend.
- Teste real em 390 px e 1036 px sem deslocamento horizontal, IDs duplicados ou erros de consola.
- Nenhum campo sem rótulo acessível após a correção.
- 14 validadores locais concluídos, incluindo segurança, desempenho, PWA, papéis, acessibilidade, backups e paginação.

## Estado das melhorias de segurança

1. Concluído: a política de leitura de `obras` exige agora `obra_utilizadores.ativo = true`.
2. Concluído: as funções privilegiadas revogam execução para `public` e `anon`, mantendo apenas os papéis internos e autenticados necessários.
3. Concluído com as opções do plano gratuito: cadastro público e login anónimo desativados, confirmação de e-mail obrigatória, palavra-passe forte e OTP de 10 minutos.
4. Limitação conhecida: a verificação contra palavras-passe comprometidas exige o plano Pro e permanece como melhoria futura.
5. Pendente de contas de teste: validar os fluxos completos de administrador, equipa e cliente.

Os avisos de índices não utilizados são apenas informativos neste momento. Não foram removidos porque a base é recente e a ausência de utilização ainda não prova que sejam desnecessários.
