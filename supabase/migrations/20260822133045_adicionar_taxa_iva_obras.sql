begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.obras
  add column if not exists taxa_iva numeric(5,2);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'obras_taxa_iva_permitida'
      and conrelid = 'public.obras'::regclass
  ) then
    alter table public.obras
      add constraint obras_taxa_iva_permitida
      check (taxa_iva is null or taxa_iva in (6, 23)) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'obras_iva_calculado_consistente'
      and conrelid = 'public.obras'::regclass
  ) then
    alter table public.obras
      add constraint obras_iva_calculado_consistente
      check (
        taxa_iva is null
        or valor_iva = round(
          coalesce(nullif(valor_contratado, 0), valor, 0)::numeric * taxa_iva / 100,
          2
        )
      ) not valid;
  end if;
end
$$;

alter table public.obras validate constraint obras_taxa_iva_permitida;
alter table public.obras validate constraint obras_iva_calculado_consistente;

comment on column public.obras.taxa_iva is
  'Taxa de IVA contratada da obra. Valores permitidos: 6% ou 23%; nulo preserva registos anteriores.';

commit;
