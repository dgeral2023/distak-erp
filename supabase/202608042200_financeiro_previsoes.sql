create table if not exists public.financeiro_previsoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras(id) on delete set null,
  tipo text not null check (tipo in ('recebimento','despesa')),
  descricao text not null check (char_length(trim(descricao)) between 2 and 180),
  valor numeric(14,2) not null check (valor > 0),
  data_prevista date not null,
  probabilidade integer not null default 80 check (probabilidade between 0 and 100),
  estado text not null default 'previsto' check (estado in ('previsto','confirmado','realizado','cancelado')),
  observacoes text check (observacoes is null or char_length(observacoes) <= 2000),
  criado_por uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.financeiro_previsoes enable row level security;

drop policy if exists financeiro_previsoes_select_admin on public.financeiro_previsoes;
create policy financeiro_previsoes_select_admin on public.financeiro_previsoes
for select to authenticated using ((select public.is_admin()));

drop policy if exists financeiro_previsoes_insert_admin on public.financeiro_previsoes;
create policy financeiro_previsoes_insert_admin on public.financeiro_previsoes
for insert to authenticated with check ((select public.is_admin()) and criado_por = (select auth.uid()));

drop policy if exists financeiro_previsoes_update_admin on public.financeiro_previsoes;
create policy financeiro_previsoes_update_admin on public.financeiro_previsoes
for update to authenticated using ((select public.is_admin()))
with check ((select public.is_admin()) and criado_por is not null);

revoke all on public.financeiro_previsoes from anon;
revoke all on public.financeiro_previsoes from authenticated;
grant select, insert, update on public.financeiro_previsoes to authenticated;

create index if not exists financeiro_previsoes_obra_id_idx on public.financeiro_previsoes(obra_id);
create index if not exists financeiro_previsoes_criado_por_idx on public.financeiro_previsoes(criado_por);
create index if not exists financeiro_previsoes_data_estado_idx on public.financeiro_previsoes(data_prevista, estado);
create index if not exists financeiro_previsoes_tipo_data_idx on public.financeiro_previsoes(tipo, data_prevista);

comment on table public.financeiro_previsoes is 'Movimentos financeiros previstos; não representa pagamentos ou custos efetivamente realizados.';
