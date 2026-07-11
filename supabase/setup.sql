-- Execute no SQL Editor como postgres
create or replace function public.is_admin()
returns boolean language sql security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and ativo=true); $$;
alter table public.clientes enable row level security;
alter table public.obras enable row level security;
drop policy if exists clientes_select on public.clientes;
drop policy if exists clientes_insert_admin on public.clientes;
drop policy if exists clientes_update_admin on public.clientes;
drop policy if exists clientes_delete_admin on public.clientes;
create policy clientes_select on public.clientes for select to authenticated using (true);
create policy clientes_insert_admin on public.clientes for insert to authenticated with check (public.is_admin());
create policy clientes_update_admin on public.clientes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy clientes_delete_admin on public.clientes for delete to authenticated using (public.is_admin());
drop policy if exists obras_select on public.obras;
drop policy if exists obras_insert_admin on public.obras;
drop policy if exists obras_update_admin on public.obras;
drop policy if exists obras_delete_admin on public.obras;
create policy obras_select on public.obras for select to authenticated using (true);
create policy obras_insert_admin on public.obras for insert to authenticated with check (public.is_admin());
create policy obras_update_admin on public.obras for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy obras_delete_admin on public.obras for delete to authenticated using (public.is_admin());