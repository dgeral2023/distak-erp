begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.obras
  drop constraint if exists obras_taxa_iva_permitida;

alter table public.obras
  add constraint obras_taxa_iva_permitida
  check (taxa_iva is null or taxa_iva in (0, 6, 23)) not valid;

alter table public.obras validate constraint obras_taxa_iva_permitida;

comment on column public.obras.taxa_iva is
  'Taxa de IVA contratada da obra. Valores permitidos: 0%, 6% ou 23%; nulo preserva registos anteriores.';

commit;
