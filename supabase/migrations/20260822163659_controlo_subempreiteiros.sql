create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'subempreiteiro' check (tipo in ('subempreiteiro','fornecedor','prestador_servicos')),
  nome text not null check (char_length(trim(nome)) between 2 and 180),
  nif text,
  email text,
  telefone text,
  morada text,
  especialidade text,
  iban text,
  condicoes_pagamento text,
  seguro_apolice text,
  seguro_validade date,
  estado text not null default 'ativo' check (estado in ('ativo','inativo')),
  notas text,
  criado_por uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index fornecedores_nif_unico_idx on public.fornecedores (nif) where nullif(trim(nif),'') is not null;
create index fornecedores_tipo_estado_idx on public.fornecedores (tipo,estado,nome);
create index fornecedores_criado_por_idx on public.fornecedores (criado_por);

create table public.subempreitadas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete restrict,
  fornecedor_id uuid not null references public.fornecedores(id) on delete restrict,
  objeto text not null check (char_length(trim(objeto)) between 2 and 240),
  valor_inicial numeric(14,2) not null default 0 check (valor_inicial >= 0),
  taxa_iva numeric(5,2) not null default 23 check (taxa_iva in (0,6,23)),
  estado text not null default 'proposta' check (estado in ('proposta','adjudicada','em_execucao','suspensa','concluida','cancelada')),
  adjudicada_em date,
  inicio_previsto date,
  fim_previsto date,
  condicoes_pagamento text,
  notas text,
  criado_por uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id,obra_id),
  check (fim_previsto is null or inicio_previsto is null or fim_previsto >= inicio_previsto)
);

create index subempreitadas_obra_estado_idx on public.subempreitadas (obra_id,estado);
create index subempreitadas_fornecedor_estado_idx on public.subempreitadas (fornecedor_id,estado);
create index subempreitadas_criado_por_idx on public.subempreitadas (criado_por);

create table public.subempreitada_alteracoes (
  id uuid primary key default gen_random_uuid(),
  subempreitada_id uuid not null references public.subempreitadas(id) on delete restrict,
  descricao text not null check (char_length(trim(descricao)) between 2 and 240),
  valor_delta numeric(14,2) not null check (valor_delta <> 0),
  estado text not null default 'rascunho' check (estado in ('rascunho','aprovada','recusada')),
  data date not null default current_date,
  notas text,
  criado_por uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index subempreitada_alteracoes_contrato_idx on public.subempreitada_alteracoes (subempreitada_id,estado,data);
create index subempreitada_alteracoes_criado_por_idx on public.subempreitada_alteracoes (criado_por);

alter table public.custos add column fornecedor_id uuid references public.fornecedores(id) on delete restrict;
alter table public.custos add column subempreitada_id uuid;
alter table public.custos add constraint custos_subempreitada_mesma_obra_fk
  foreign key (subempreitada_id,obra_id)
  references public.subempreitadas(id,obra_id)
  on delete restrict;
create index custos_fornecedor_idx on public.custos (fornecedor_id);
create index custos_subempreitada_idx on public.custos (subempreitada_id);

alter table public.fornecedores enable row level security;
alter table public.subempreitadas enable row level security;
alter table public.subempreitada_alteracoes enable row level security;

revoke all on public.fornecedores, public.subempreitadas, public.subempreitada_alteracoes from anon, authenticated;
grant select,insert,update on public.fornecedores, public.subempreitadas, public.subempreitada_alteracoes to authenticated;

create policy fornecedores_select_admin on public.fornecedores for select to authenticated using ((select public.is_admin()));
create policy fornecedores_insert_admin on public.fornecedores for insert to authenticated with check ((select public.is_admin()) and criado_por=(select auth.uid()));
create policy fornecedores_update_admin on public.fornecedores for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy subempreitadas_select_admin on public.subempreitadas for select to authenticated using ((select public.is_admin()));
create policy subempreitadas_insert_admin on public.subempreitadas for insert to authenticated with check ((select public.is_admin()) and criado_por=(select auth.uid()));
create policy subempreitadas_update_admin on public.subempreitadas for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy subempreitada_alteracoes_select_admin on public.subempreitada_alteracoes for select to authenticated using ((select public.is_admin()));
create policy subempreitada_alteracoes_insert_admin on public.subempreitada_alteracoes for insert to authenticated with check ((select public.is_admin()) and criado_por=(select auth.uid()));
create policy subempreitada_alteracoes_update_admin on public.subempreitada_alteracoes for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

comment on table public.fornecedores is 'Cadastro administrativo de subempreiteiros, fornecedores e prestadores de serviços.';
comment on table public.subempreitadas is 'Compromissos comerciais com subempreiteiros; não representam faturas nem pagamentos.';
comment on table public.subempreitada_alteracoes is 'Trabalhos a mais ou a menos; apenas alterações aprovadas afetam o compromisso.';
comment on column public.custos.subempreitada_id is 'Ligação opcional da fatura ao compromisso de subempreitada da mesma obra.';
