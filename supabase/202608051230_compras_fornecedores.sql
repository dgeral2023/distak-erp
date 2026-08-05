create table if not exists public.compras_pedidos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete restrict,
  numero text not null unique,
  titulo text not null check (char_length(titulo) between 2 and 180),
  categoria text not null default 'Materiais',
  quantidade numeric(14,3) not null default 1 check (quantidade > 0),
  unidade text not null default 'un',
  data_necessaria date not null,
  estado text not null default 'rascunho' check (estado in ('rascunho','cotacao','aprovado','encomendado','parcial','recebido','cancelado')),
  valor_orcamentado numeric(14,2) check (valor_orcamentado is null or valor_orcamentado >= 0),
  fornecedor_selecionado text,
  valor_adjudicado numeric(14,2) check (valor_adjudicado is null or valor_adjudicado >= 0),
  entrega_prevista date,
  recebido_em date,
  notas text,
  criado_por uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.compras_propostas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.compras_pedidos(id) on delete cascade,
  fornecedor text not null check (char_length(fornecedor) between 2 and 180),
  nif text,
  contacto text,
  valor numeric(14,2) not null check (valor >= 0),
  prazo_dias integer check (prazo_dias is null or prazo_dias >= 0),
  validade date,
  condicoes text,
  selecionada boolean not null default false,
  criado_por uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.compras_pedidos enable row level security;
alter table public.compras_propostas enable row level security;
revoke all on public.compras_pedidos, public.compras_propostas from anon, authenticated;
grant select,insert,update on public.compras_pedidos, public.compras_propostas to authenticated;

create index if not exists compras_pedidos_obra_estado_idx on public.compras_pedidos(obra_id,estado,data_necessaria);
create index if not exists compras_pedidos_entrega_idx on public.compras_pedidos(entrega_prevista) where estado in ('encomendado','parcial');
create index if not exists compras_propostas_pedido_valor_idx on public.compras_propostas(pedido_id,valor);

create policy compras_pedidos_select_admin on public.compras_pedidos for select to authenticated using ((select public.is_admin()));
create policy compras_pedidos_insert_admin on public.compras_pedidos for insert to authenticated with check ((select public.is_admin()) and criado_por=(select auth.uid()));
create policy compras_pedidos_update_admin on public.compras_pedidos for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy compras_propostas_select_admin on public.compras_propostas for select to authenticated using ((select public.is_admin()));
create policy compras_propostas_insert_admin on public.compras_propostas for insert to authenticated with check ((select public.is_admin()) and criado_por=(select auth.uid()));
create policy compras_propostas_update_admin on public.compras_propostas for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

comment on table public.compras_pedidos is 'Pedidos de compra e acompanhamento de entregas, sem criação automática de custos ou pagamentos.';
comment on table public.compras_propostas is 'Propostas de fornecedores comparadas por pedido de compra.';
