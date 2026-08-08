# Operação e suporte — DISTAK ERP v3.8

## Antes de abrir um pedido

1. No perfil Administrador, abrir **Relatórios**.
2. Atualizar o diagnóstico de prontidão.
3. Não repetir pagamentos, mudanças de acesso ou eliminações quando existir estado crítico.
4. Exportar o diagnóstico seguro e registar a hora, a área e a ação que apresentou o problema.
5. Não enviar cópias de segurança por canais não autorizados.

## Prioridade

- **P1:** suspeita de segurança, perda/corrupção de dados, operação financeira bloqueada ou mais de um utilizador impedido de trabalhar.
- **P2:** um utilizador bloqueado, módulo indisponível ou funcionamento degradado sem perda de dados.
- **P3:** dúvida, melhoria visual ou problema sem bloqueio operacional.

## Ensaio de recuperação isolado

1. Exportar uma cópia administrativa e confirmar o checksum SHA-256.
2. Usar a reconstrução descartável em memória apresentada pela verificação; nunca a produção.
3. Confirmar contagens, relações entre obras e documentos e preparação de Administrador/Funcionário.
4. Registar data, responsável, duração, resultado e diferenças encontradas.
5. A simulação não escreve dados e não ativa reposição automática. Uma recuperação real continua dependente de autorização específica e de um projeto Supabase isolado.

## Critérios para piloto comercial controlado

- zero achados críticos de segurança;
- diagnóstico local em estado preparado;
- cópia administrativa íntegra com menos de sete dias;
- ensaio de reconstrução local isolada aprovado; recuperação real autorizada separadamente quando necessária;
- validação real de Administrador e Funcionário em computador e telemóvel;
- procedimento P1/P2/P3 conhecido pelo responsável;
- publicação aprovada e reversível no GitHub.
