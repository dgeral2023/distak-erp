-- Portal do Cliente: camada de publicação isolada dos dados internos do ERP.
-- Requer autorização explícita antes de aplicar em produção porque introduz o perfil "cliente".

create table if not exists public.cliente_portal_acessos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id bigint not null references public.clientes(id) on delete cascade,
  ativo boolean not null default true,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz not null default now(),
  unique(user_id,cliente_id)
);

create table if not exists public.cliente_portal_obras (
  id uuid primary key default gen_random_uuid(),
  cliente_id bigint not null references public.clientes(id) on delete cascade,
  obra_id bigint not null references public.obras(id) on delete cascade,
  nome text not null,
  localidade text,
  estado text not null default 'Em acompanhamento',
  progresso numeric(5,2) not null default 0 check (progresso between 0 and 100),
  resumo text,
  proxima_etapa text,
  data_prevista date,
  foto_url text,
  publicado boolean not null default false,
  atualizado_por uuid not null references auth.users(id),
  atualizado_em timestamptz not null default now(),
  unique(cliente_id,obra_id)
);

create table if not exists public.cliente_portal_atualizacoes (
  id uuid primary key default gen_random_uuid(),
  portal_obra_id uuid not null references public.cliente_portal_obras(id) on delete cascade,
  titulo text not null,
  mensagem text,
  data_publicacao date not null default current_date,
  publicado boolean not null default false,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.cliente_portal_ficheiros (
  id uuid primary key default gen_random_uuid(),
  portal_obra_id uuid not null references public.cliente_portal_obras(id) on delete cascade,
  nome text not null,
  categoria text,
  url text not null,
  publicado boolean not null default false,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz not null default now()
);

alter table public.cliente_portal_acessos enable row level security;
alter table public.cliente_portal_obras enable row level security;
alter table public.cliente_portal_atualizacoes enable row level security;
alter table public.cliente_portal_ficheiros enable row level security;

revoke all on public.cliente_portal_acessos, public.cliente_portal_obras, public.cliente_portal_atualizacoes, public.cliente_portal_ficheiros from anon, authenticated;
grant select,insert,update on public.cliente_portal_acessos, public.cliente_portal_obras, public.cliente_portal_atualizacoes, public.cliente_portal_ficheiros to authenticated;

create index if not exists cliente_portal_acessos_user_idx on public.cliente_portal_acessos(user_id) where ativo;
create index if not exists cliente_portal_obras_cliente_idx on public.cliente_portal_obras(cliente_id) where publicado;
create index if not exists cliente_portal_atualizacoes_obra_idx on public.cliente_portal_atualizacoes(portal_obra_id,data_publicacao desc) where publicado;
create index if not exists cliente_portal_ficheiros_obra_idx on public.cliente_portal_ficheiros(portal_obra_id) where publicado;

create or replace function private.can_access_cliente_portal(p_cliente_id bigint)
returns boolean language sql stable security definer set search_path='' as $$
  select (select public.is_admin()) or exists (
    select 1 from public.cliente_portal_acessos a
    where a.cliente_id=p_cliente_id and a.user_id=(select auth.uid()) and a.ativo
  );
$$;
revoke all on function private.can_access_cliente_portal(bigint) from public, anon;
grant execute on function private.can_access_cliente_portal(bigint) to authenticated;

create policy cliente_portal_acessos_select on public.cliente_portal_acessos for select to authenticated
using ((select public.is_admin()) or (user_id=(select auth.uid()) and ativo));
create policy cliente_portal_acessos_insert_admin on public.cliente_portal_acessos for insert to authenticated
with check ((select public.is_admin()) and criado_por=(select auth.uid()));
create policy cliente_portal_acessos_update_admin on public.cliente_portal_acessos for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

create policy cliente_portal_obras_select on public.cliente_portal_obras for select to authenticated
using ((select public.is_admin()) or (publicado and (select private.can_access_cliente_portal(cliente_id))));
create policy cliente_portal_obras_insert_admin on public.cliente_portal_obras for insert to authenticated
with check ((select public.is_admin()) and atualizado_por=(select auth.uid()));
create policy cliente_portal_obras_update_admin on public.cliente_portal_obras for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

create policy cliente_portal_atualizacoes_select on public.cliente_portal_atualizacoes for select to authenticated
using ((select public.is_admin()) or (publicado and exists (select 1 from public.cliente_portal_obras o where o.id=portal_obra_id and o.publicado and (select private.can_access_cliente_portal(o.cliente_id)))));
create policy cliente_portal_atualizacoes_insert_admin on public.cliente_portal_atualizacoes for insert to authenticated
with check ((select public.is_admin()) and criado_por=(select auth.uid()));
create policy cliente_portal_atualizacoes_update_admin on public.cliente_portal_atualizacoes for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

create policy cliente_portal_ficheiros_select on public.cliente_portal_ficheiros for select to authenticated
using ((select public.is_admin()) or (publicado and exists (select 1 from public.cliente_portal_obras o where o.id=portal_obra_id and o.publicado and (select private.can_access_cliente_portal(o.cliente_id)))));
create policy cliente_portal_ficheiros_insert_admin on public.cliente_portal_ficheiros for insert to authenticated
with check ((select public.is_admin()) and criado_por=(select auth.uid()));
create policy cliente_portal_ficheiros_update_admin on public.cliente_portal_ficheiros for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

comment on table public.cliente_portal_obras is 'Resumo explicitamente publicado ao cliente; não expõe custos, margens ou dados operacionais internos.';

create table if not exists public.cliente_portal_aprovacoes (
  id uuid primary key default gen_random_uuid(), portal_obra_id uuid not null references public.cliente_portal_obras(id) on delete cascade,
  titulo text not null, descricao text, data_limite date,
  estado text not null default 'pendente' check (estado in ('pendente','aprovado','revisao')),
  respondido_em timestamptz, respondido_por uuid references auth.users(id),
  criado_por uuid not null references auth.users(id), criado_em timestamptz not null default now()
);
alter table public.cliente_portal_aprovacoes enable row level security;
revoke all on public.cliente_portal_aprovacoes from anon, authenticated;
grant select,insert,update on public.cliente_portal_aprovacoes to authenticated;
create index if not exists cliente_portal_aprovacoes_obra_idx on public.cliente_portal_aprovacoes(portal_obra_id,estado,data_limite);
create policy cliente_portal_aprovacoes_select on public.cliente_portal_aprovacoes for select to authenticated using ((select public.is_admin()) or exists (select 1 from public.cliente_portal_obras o where o.id=portal_obra_id and o.publicado and (select private.can_access_cliente_portal(o.cliente_id))));
create policy cliente_portal_aprovacoes_insert_admin on public.cliente_portal_aprovacoes for insert to authenticated with check ((select public.is_admin()) and criado_por=(select auth.uid()));
create policy cliente_portal_aprovacoes_update_admin on public.cliente_portal_aprovacoes for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.responder_cliente_portal_aprovacao(p_aprovacao_id uuid,p_decisao text)
returns public.cliente_portal_aprovacoes language plpgsql security definer set search_path='' as $$
declare resultado public.cliente_portal_aprovacoes;
begin
  if p_decisao not in ('aprovado','revisao') then raise exception 'Decisão inválida'; end if;
  update public.cliente_portal_aprovacoes a set estado=p_decisao,respondido_em=now(),respondido_por=(select auth.uid())
  where a.id=p_aprovacao_id and a.estado='pendente' and exists (select 1 from public.cliente_portal_obras o where o.id=a.portal_obra_id and o.publicado and (select private.can_access_cliente_portal(o.cliente_id))) returning a.* into resultado;
  if resultado.id is null then raise exception 'Pedido indisponível ou já respondido'; end if;
  return resultado;
end;
$$;
revoke all on function public.responder_cliente_portal_aprovacao(uuid,text) from public, anon;
grant execute on function public.responder_cliente_portal_aprovacao(uuid,text) to authenticated;
comment on table public.cliente_portal_aprovacoes is 'Pedidos formais ao cliente; respostas não criam pagamentos, custos ou alterações automáticas na obra.';
