create table if not exists public.funcionarios (
  id uuid primary key default gen_random_uuid(), nome text not null, funcao text, telefone text, email text, nif text,
  data_entrada date, custo_hora numeric(10,2) not null default 0 check (custo_hora >= 0),
  estado text not null default 'Ativo' check (estado in ('Ativo','Inativo','Férias')),
  observacoes text, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create table if not exists public.funcionario_horas (
  id uuid primary key default gen_random_uuid(), funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  obra_id uuid references public.obras(id) on delete set null, data date not null default current_date,
  hora_entrada time, hora_saida time, pausa_minutos integer not null default 0 check (pausa_minutos between 0 and 1440),
  horas numeric(8,2) not null check (horas >= 0 and horas <= 24), observacoes text,
  criado_por uuid references public.profiles(id) default auth.uid(), criado_em timestamptz not null default now()
);
create index if not exists funcionario_horas_funcionario_data_idx on public.funcionario_horas(funcionario_id,data desc);
create index if not exists funcionario_horas_obra_data_idx on public.funcionario_horas(obra_id,data desc);
create index if not exists funcionario_horas_criado_por_idx on public.funcionario_horas(criado_por);
alter table public.funcionarios enable row level security;
alter table public.funcionario_horas enable row level security;
grant select,insert,update,delete on public.funcionarios,public.funcionario_horas to authenticated;
drop policy if exists funcionarios_shared_account on public.funcionarios;
drop policy if exists funcionario_horas_shared_account on public.funcionario_horas;
create policy funcionarios_shared_account on public.funcionarios for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy funcionario_horas_shared_account on public.funcionario_horas for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
