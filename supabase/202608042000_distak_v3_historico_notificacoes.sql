-- DISTAK ERP v3: histórico central e base segura para notificações.
create table if not exists public.atividades_sistema (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  obra_id uuid references public.obras(id) on delete cascade,
  entidade text not null,
  entidade_id uuid,
  acao text not null check (acao in ('criou','atualizou','eliminou','atribuiu','concluiu')),
  resumo text not null,
  metadados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
alter table public.atividades_sistema enable row level security;
create index if not exists atividades_sistema_obra_data_idx on public.atividades_sistema(obra_id,criado_em desc);
create index if not exists atividades_sistema_utilizador_data_idx on public.atividades_sistema(utilizador_id,criado_em desc);
drop policy if exists atividades_sistema_select on public.atividades_sistema;
drop policy if exists atividades_sistema_insert on public.atividades_sistema;
create policy atividades_sistema_select on public.atividades_sistema for select to authenticated using ((select public.is_admin()) or utilizador_id=(select auth.uid()) or (obra_id is not null and (select private.can_access_obra(obra_id))));
create policy atividades_sistema_insert on public.atividades_sistema for insert to authenticated with check (utilizador_id=(select auth.uid()) and (obra_id is null or (select private.can_access_obra(obra_id))));
revoke all on public.atividades_sistema from anon;
grant select,insert on public.atividades_sistema to authenticated;
