alter table public.orcamentos
  add column if not exists data_emissao date default current_date,
  add column if not exists validade_dias integer default 15,
  add column if not exists referencia text,
  add column if not exists desconto numeric(12,2) default 0,
  add column if not exists notas text,
  add column if not exists aprovado_em timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='orcamentos_validade_dias_check') then
    alter table public.orcamentos add constraint orcamentos_validade_dias_check check (validade_dias between 1 and 365);
  end if;
  if not exists (select 1 from pg_constraint where conname='orcamentos_desconto_check') then
    alter table public.orcamentos add constraint orcamentos_desconto_check check (desconto >= 0);
  end if;
end $$;

create table if not exists public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  ordem integer not null default 0,
  descricao text not null,
  unidade text not null default 'un',
  quantidade numeric(12,3) not null default 1 check (quantidade > 0),
  preco_unitario numeric(12,2) not null default 0 check (preco_unitario >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists orcamento_itens_orcamento_id_idx on public.orcamento_itens(orcamento_id);
alter table public.orcamento_itens enable row level security;
grant select,insert,update,delete on public.orcamento_itens to authenticated;

drop policy if exists orcamento_itens_select on public.orcamento_itens;
drop policy if exists orcamento_itens_insert_admin on public.orcamento_itens;
drop policy if exists orcamento_itens_update_admin on public.orcamento_itens;
drop policy if exists orcamento_itens_delete_admin on public.orcamento_itens;
create policy orcamento_itens_select on public.orcamento_itens for select to authenticated using (public.is_admin());
create policy orcamento_itens_insert_admin on public.orcamento_itens for insert to authenticated with check (public.is_admin());
create policy orcamento_itens_update_admin on public.orcamento_itens for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy orcamento_itens_delete_admin on public.orcamento_itens for delete to authenticated using (public.is_admin());
