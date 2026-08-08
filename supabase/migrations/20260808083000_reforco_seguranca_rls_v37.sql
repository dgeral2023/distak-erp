-- DISTAK ERP v3.7: revoga acessos implicitos e corrige atribuicoes inativas.

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.responder_cliente_portal_aprovacao(uuid, text) from public, anon;
grant execute on function public.responder_cliente_portal_aprovacao(uuid, text) to authenticated;

drop policy if exists obras_select_admin_ou_atribuido on public.obras;
create policy obras_select_admin_ou_atribuido
on public.obras
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.obra_utilizadores ou
    where ou.obra_id = obras.id
      and ou.user_id = (select auth.uid())
      and ou.ativo = true
  )
);

