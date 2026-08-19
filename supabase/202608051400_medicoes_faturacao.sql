create table if not exists public.medicoes_autos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete restrict,
  numero text not null unique,
  periodo_inicio date not null,
  periodo_fim date not null,
  estado text not null default 'rascunho' check (estado in ('rascunho','submetido','aprovado','faturado','cancelado')),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  retencao_percentagem numeric(5,2) not null default 0 check (retencao_percentagem between 0 and 100),
  iva_percentagem numeric(5,2) not null default 23 check (iva_percentagem between 0 and 100),
  total numeric(14,2) not null default 0 check (total >= 0),
  fatura_numero text,
  fatura_data date,
  vencimento date,
  observacoes text,
  criado_por uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (periodo_fim >= periodo_inicio),
  check (estado <> 'faturado' or (fatura_numero is not null and fatura_data is not null))
);

create table if not exists public.medicoes_itens (
  id uuid primary key default gen_random_uuid(),
  auto_id uuid not null references public.medicoes_autos(id) on delete cascade,
  descricao text not null check (char_length(descricao) between 2 and 300),
  unidade text not null default 'un',
  quantidade_contratada numeric(14,3) not null check (quantidade_contratada >= 0),
  quantidade_anterior numeric(14,3) not null default 0 check (quantidade_anterior >= 0),
  quantidade_atual numeric(14,3) not null default 0 check (quantidade_atual >= 0),
  preco_unitario numeric(14,2) not null check (preco_unitario >= 0),
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (quantidade_anterior + quantidade_atual <= quantidade_contratada)
);

alter table public.medicoes_autos enable row level security;
alter table public.medicoes_itens enable row level security;
revoke all on public.medicoes_autos, public.medicoes_itens from anon, authenticated;
grant select,insert,update on public.medicoes_autos, public.medicoes_itens to authenticated;
create index if not exists medicoes_autos_obra_estado_idx on public.medicoes_autos(obra_id,estado,periodo_fim);
create index if not exists medicoes_autos_vencimento_idx on public.medicoes_autos(vencimento) where estado='faturado';
create index if not exists medicoes_itens_auto_ordem_idx on public.medicoes_itens(auto_id,ordem);

create policy medicoes_autos_select_admin on public.medicoes_autos for select to authenticated using ((select public.is_admin()));
create policy medicoes_autos_insert_admin on public.medicoes_autos for insert to authenticated with check ((select public.is_admin()) and criado_por=(select auth.uid()));
create policy medicoes_autos_update_admin on public.medicoes_autos for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy medicoes_itens_select_admin on public.medicoes_itens for select to authenticated using ((select public.is_admin()));
create policy medicoes_itens_insert_admin on public.medicoes_itens for insert to authenticated with check ((select public.is_admin()));
create policy medicoes_itens_update_admin on public.medicoes_itens for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

comment on table public.medicoes_autos is 'Autos de medição e referências de faturação; não representam recebimentos.';
