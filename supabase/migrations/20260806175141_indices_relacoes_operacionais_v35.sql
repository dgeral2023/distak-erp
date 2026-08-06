create index if not exists compras_pedidos_criado_por_idx
  on public.compras_pedidos (criado_por);

create index if not exists compras_propostas_criado_por_idx
  on public.compras_propostas (criado_por);

create index if not exists medicoes_autos_criado_por_idx
  on public.medicoes_autos (criado_por);
