# Prontidão operacional — v3.8

O painel administrativo em **Relatórios e exportações** reúne cinco sinais locais: ligação, sessão/perfil, carregamento dos módulos, suporte PWA e idade da última cópia administrativa confirmada neste dispositivo.

## Limites de segurança

- Não envia telemetria, dados financeiros ou operacionais a serviços externos.
- Não restaura, elimina ou altera registos.
- A marca da última exportação guarda localmente apenas data, versão e contagem total; não guarda conteúdo nem checksum.
- Uma cópia com mais de 7 dias gera aviso; com mais de 30 dias gera estado crítico.
- A ausência do service worker é informativa: pode depender do primeiro carregamento ou do navegador.

**Operação preparada** significa que os cinco sinais disponíveis estão normais. **Revisão recomendada** indica uma limitação não bloqueante. **Ação necessária** indica perda de ligação, sessão incompleta ou cópia com mais de 30 dias. O diagnóstico não substitui backups geridos do Supabase nem recuperação ensaiada fora de produção.
