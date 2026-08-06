alter table public.agenda_tarefas
  add column if not exists bloqueio_motivo text
    check (bloqueio_motivo is null or char_length(bloqueio_motivo) <= 1000),
  add column if not exists bloqueado_em timestamptz,
  add column if not exists resolucao_prevista date;

create index if not exists agenda_tarefas_bloqueios_idx
  on public.agenda_tarefas (resolucao_prevista)
  where estado = 'bloqueada';

comment on column public.agenda_tarefas.bloqueio_motivo is 'Motivo operacional informado pelo utilizador quando a etapa fica bloqueada.';
comment on column public.agenda_tarefas.bloqueado_em is 'Momento em que o bloqueio atual foi registado.';
comment on column public.agenda_tarefas.resolucao_prevista is 'Data estimada e não vinculativa para remover o bloqueio.';
