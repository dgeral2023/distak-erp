-- DISTAK ERP v2.8: acesso operacional limitado às obras atribuídas.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.can_access_obra(p_obra_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id=(select auth.uid())
      and p.ativo=true
      and (
        p.role='admin'
        or exists (
          select 1 from public.obra_utilizadores ou
          where ou.obra_id=p_obra_id
            and ou.user_id=p.id
            and ou.ativo=true
        )
      )
  );
$$;

revoke all on function private.can_access_obra(uuid) from public, anon;
grant execute on function private.can_access_obra(uuid) to authenticated;

-- Retira as políticas anteriores destas tabelas antes de instalar uma matriz
-- única e coerente de leitura, criação, edição e eliminação.
do $$
declare policy_row record;
begin
  for policy_row in
    select tablename,policyname from pg_policies
    where schemaname='public'
      and tablename=any(array[
        'obra_checklists','obra_equipa_registos','obra_materiais',
        'obra_horas','obra_ocorrencias','obra_diarios','obra_documentos',
        'obra_fotografias'
      ])
  loop
    execute format('drop policy if exists %I on public.%I',policy_row.policyname,policy_row.tablename);
  end loop;
end $$;

create policy obra_checklists_select on public.obra_checklists for select to authenticated using ((select private.can_access_obra(obra_id)));
create policy obra_checklists_insert on public.obra_checklists for insert to authenticated with check (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id)));
create policy obra_checklists_update on public.obra_checklists for update to authenticated using ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id)))) with check ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id))));
create policy obra_checklists_delete on public.obra_checklists for delete to authenticated using ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id))));

create policy obra_equipa_select on public.obra_equipa_registos for select to authenticated using ((select private.can_access_obra(obra_id)));
create policy obra_equipa_insert on public.obra_equipa_registos for insert to authenticated with check (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id)));
create policy obra_equipa_update on public.obra_equipa_registos for update to authenticated using ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id)))) with check ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id))));
create policy obra_equipa_delete on public.obra_equipa_registos for delete to authenticated using ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id))));

create policy obra_materiais_select on public.obra_materiais for select to authenticated using ((select private.can_access_obra(obra_id)));
create policy obra_materiais_insert on public.obra_materiais for insert to authenticated with check (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id)));
create policy obra_materiais_update on public.obra_materiais for update to authenticated using ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id)))) with check ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id))));
create policy obra_materiais_delete on public.obra_materiais for delete to authenticated using ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id))));

create policy obra_horas_select on public.obra_horas for select to authenticated using ((select private.can_access_obra(obra_id)));
create policy obra_horas_insert on public.obra_horas for insert to authenticated with check (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id)));
create policy obra_horas_update on public.obra_horas for update to authenticated using ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id)))) with check ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id))));
create policy obra_horas_delete on public.obra_horas for delete to authenticated using ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id))));

create policy obra_ocorrencias_select on public.obra_ocorrencias for select to authenticated using ((select private.can_access_obra(obra_id)));
create policy obra_ocorrencias_insert on public.obra_ocorrencias for insert to authenticated with check (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id)));
create policy obra_ocorrencias_update on public.obra_ocorrencias for update to authenticated using ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id)))) with check ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id))));
create policy obra_ocorrencias_delete on public.obra_ocorrencias for delete to authenticated using ((select public.is_admin()) or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id))));

create policy obra_diarios_select on public.obra_diarios for select to authenticated using ((select private.can_access_obra(obra_id)));
create policy obra_diarios_insert on public.obra_diarios for insert to authenticated with check (created_by=(select auth.uid()) and (select private.can_access_obra(obra_id)));
create policy obra_diarios_update on public.obra_diarios for update to authenticated using ((select public.is_admin()) or (created_by=(select auth.uid()) and (select private.can_access_obra(obra_id)))) with check ((select public.is_admin()) or (created_by=(select auth.uid()) and (select private.can_access_obra(obra_id))));
create policy obra_diarios_delete on public.obra_diarios for delete to authenticated using ((select public.is_admin()) or (created_by=(select auth.uid()) and (select private.can_access_obra(obra_id))));

create policy obra_documentos_select on public.obra_documentos for select to authenticated using ((select private.can_access_obra(obra_id)));
create policy obra_documentos_insert on public.obra_documentos for insert to authenticated with check (inserido_por=(select auth.uid()) and (select private.can_access_obra(obra_id)));
create policy obra_documentos_update on public.obra_documentos for update to authenticated using ((select public.is_admin()) or (inserido_por=(select auth.uid()) and (select private.can_access_obra(obra_id)))) with check ((select public.is_admin()) or (inserido_por=(select auth.uid()) and (select private.can_access_obra(obra_id))));
create policy obra_documentos_delete on public.obra_documentos for delete to authenticated using ((select public.is_admin()) or (inserido_por=(select auth.uid()) and (select private.can_access_obra(obra_id))));

create policy obra_fotografias_select on public.obra_fotografias for select to authenticated using ((select private.can_access_obra(obra_id)));
create policy obra_fotografias_insert on public.obra_fotografias for insert to authenticated with check (created_by=(select auth.uid()) and (select private.can_access_obra(obra_id)));
create policy obra_fotografias_update on public.obra_fotografias for update to authenticated using ((select public.is_admin()) or (created_by=(select auth.uid()) and (select private.can_access_obra(obra_id)))) with check ((select public.is_admin()) or (created_by=(select auth.uid()) and (select private.can_access_obra(obra_id))));
create policy obra_fotografias_delete on public.obra_fotografias for delete to authenticated using ((select public.is_admin()));
