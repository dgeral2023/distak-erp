create table if not exists public.inteligencia_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  versao_motor text not null default 'distak-rules-v1',
  nivel_risco text not null check (nivel_risco in ('baixo','moderado','alto','critico')),
  pontuacao smallint not null check (pontuacao between 0 and 100),
  custo_final_previsto numeric(14,2) not null check (custo_final_previsto >= 0),
  margem_prevista numeric(14,2) not null,
  data_conclusao_prevista date,
  confianca text not null check (confianca in ('baixa','media','alta')),
  fundamentos jsonb not null default '{}'::jsonb,
  estado text not null default 'analisada' check (estado in ('analisada','confirmada','descartada')),
  criado_por uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  criado_em timestamptz not null default now(),
  revisto_por uuid references public.profiles(id) on delete set null,
  revisto_em timestamptz,
  nota_revisao text,
  check (
    (estado='analisada' and revisto_por is null and revisto_em is null)
    or (estado in ('confirmada','descartada') and revisto_por is not null and revisto_em is not null)
  )
);

alter table public.inteligencia_avaliacoes enable row level security;
revoke all on public.inteligencia_avaliacoes from anon, authenticated;
grant select,insert,update on public.inteligencia_avaliacoes to authenticated;

create index if not exists inteligencia_avaliacoes_obra_data_idx on public.inteligencia_avaliacoes(obra_id,criado_em desc);
create index if not exists inteligencia_avaliacoes_estado_idx on public.inteligencia_avaliacoes(estado,criado_em desc);
create index if not exists inteligencia_avaliacoes_criado_por_idx on public.inteligencia_avaliacoes(criado_por);
create index if not exists inteligencia_avaliacoes_revisto_por_idx on public.inteligencia_avaliacoes(revisto_por) where revisto_por is not null;

create policy inteligencia_avaliacoes_select_admin on public.inteligencia_avaliacoes
for select to authenticated using ((select public.is_admin()));
create policy inteligencia_avaliacoes_insert_admin on public.inteligencia_avaliacoes
for insert to authenticated with check ((select public.is_admin()) and criado_por=(select auth.uid()) and estado='analisada');
create policy inteligencia_avaliacoes_update_admin on public.inteligencia_avaliacoes
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

comment on table public.inteligencia_avaliacoes is 'Histórico das previsões determinísticas da gestão, sempre sujeito a confirmação humana.';
comment on column public.inteligencia_avaliacoes.fundamentos is 'Snapshot explicável dos dados usados; não representa decisão automática.';
