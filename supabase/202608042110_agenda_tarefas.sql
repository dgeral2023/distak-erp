create table if not exists public.agenda_tarefas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 2 and 180),
  descricao text,
  responsavel_id uuid references public.profiles(id) on delete set null,
  funcionario_id uuid references public.funcionarios(id) on delete set null,
  inicio date not null default current_date,
  prazo date not null,
  hora time,
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta','urgente')),
  estado text not null default 'pendente' check (estado in ('pendente','em_curso','concluida','bloqueada')),
  criado_por uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  concluida_em timestamptz,
  check (prazo >= inicio)
);

alter table public.agenda_tarefas enable row level security;
grant select,insert,update on public.agenda_tarefas to authenticated;
revoke all on public.agenda_tarefas from anon;

create index if not exists agenda_tarefas_obra_idx on public.agenda_tarefas(obra_id);
create index if not exists agenda_tarefas_prazo_estado_idx on public.agenda_tarefas(prazo,estado);
create index if not exists agenda_tarefas_responsavel_idx on public.agenda_tarefas(responsavel_id);
create index if not exists agenda_tarefas_funcionario_idx on public.agenda_tarefas(funcionario_id);
create index if not exists agenda_tarefas_criado_por_idx on public.agenda_tarefas(criado_por);

drop policy if exists agenda_tarefas_select on public.agenda_tarefas;
drop policy if exists agenda_tarefas_insert on public.agenda_tarefas;
drop policy if exists agenda_tarefas_update on public.agenda_tarefas;

create policy agenda_tarefas_select on public.agenda_tarefas
for select to authenticated
using ((select private.can_access_obra(obra_id)));

create policy agenda_tarefas_insert on public.agenda_tarefas
for insert to authenticated
with check (
  (select private.can_access_obra(obra_id))
  and (
    (select public.is_admin())
    or (criado_por=(select auth.uid()) and (responsavel_id is null or responsavel_id=(select auth.uid())))
  )
);

create policy agenda_tarefas_update on public.agenda_tarefas
for update to authenticated
using (
  (select private.can_access_obra(obra_id))
  and ((select public.is_admin()) or criado_por=(select auth.uid()) or responsavel_id=(select auth.uid()))
)
with check (
  (select private.can_access_obra(obra_id))
  and ((select public.is_admin()) or criado_por=(select auth.uid()) or responsavel_id=(select auth.uid()))
);

comment on table public.agenda_tarefas is 'Agenda operacional e tarefas ligadas às obras da DISTAK.';
