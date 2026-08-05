create index if not exists cliente_portal_acessos_cliente_idx on public.cliente_portal_acessos(cliente_id);
create index if not exists cliente_portal_acessos_criado_por_idx on public.cliente_portal_acessos(criado_por);
create index if not exists cliente_portal_obras_obra_idx on public.cliente_portal_obras(obra_id);
create index if not exists cliente_portal_obras_atualizado_por_idx on public.cliente_portal_obras(atualizado_por);
create index if not exists cliente_portal_atualizacoes_criado_por_idx on public.cliente_portal_atualizacoes(criado_por);
create index if not exists cliente_portal_ficheiros_criado_por_idx on public.cliente_portal_ficheiros(criado_por);
create index if not exists cliente_portal_aprovacoes_criado_por_idx on public.cliente_portal_aprovacoes(criado_por);
create index if not exists cliente_portal_aprovacoes_respondido_por_idx on public.cliente_portal_aprovacoes(respondido_por) where respondido_por is not null;
