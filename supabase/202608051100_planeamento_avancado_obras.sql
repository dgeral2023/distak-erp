alter table public.agenda_tarefas
  add column if not exists fase text not null default 'execucao'
    check (fase in ('preparacao','demolicao','estrutura','instalacoes','acabamentos','entrega','execucao')),
  add column if not exists progresso smallint not null default 0
    check (progresso between 0 and 100),
  add column if not exists marco boolean not null default false,
  add column if not exists depende_de uuid references public.agenda_tarefas(id) on delete set null;

create index if not exists agenda_tarefas_fase_idx on public.agenda_tarefas(obra_id,fase,prazo);
create index if not exists agenda_tarefas_depende_de_idx on public.agenda_tarefas(depende_de) where depende_de is not null;

comment on column public.agenda_tarefas.fase is 'Fase construtiva para organização do cronograma.';
comment on column public.agenda_tarefas.progresso is 'Percentagem de execução confirmada da tarefa.';
comment on column public.agenda_tarefas.marco is 'Indica um marco contratual ou operacional sem duração visual.';
comment on column public.agenda_tarefas.depende_de is 'Tarefa predecessora que deve ser concluída antes desta.';
