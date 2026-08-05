create index if not exists campo_registos_revisto_por_idx
  on public.campo_registos(revisto_por)
  where revisto_por is not null;

comment on index public.campo_registos_revisto_por_idx is 'Acelera auditorias por administrador revisor.';
