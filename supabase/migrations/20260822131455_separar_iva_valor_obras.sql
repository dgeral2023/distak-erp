begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.obras
  add column if not exists valor_iva numeric(14,2) not null default 0,
  add column if not exists valor_total_com_iva numeric generated always as (
    round(coalesce(nullif(valor_contratado, 0), valor, 0)::numeric + coalesce(valor_iva, 0)::numeric, 2)
  ) stored;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'obras_valor_iva_nao_negativo'
      and conrelid = 'public.obras'::regclass
  ) then
    alter table public.obras
      add constraint obras_valor_iva_nao_negativo
      check (valor_iva >= 0) not valid;
  end if;
end
$$;

alter table public.obras
  validate constraint obras_valor_iva_nao_negativo;

comment on column public.obras.valor_contratado is
  'Valor base contratado da obra, sem IVA.';
comment on column public.obras.valor_iva is
  'Montante de IVA contratado, separado do valor base.';
comment on column public.obras.valor_total_com_iva is
  'Total calculado da obra: valor contratado sem IVA mais IVA.';

commit;
