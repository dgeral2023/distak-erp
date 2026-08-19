-- DISTAK ERP v3.8: gestão administrativa de perfis por operação protegida.
-- Nenhuma conta é alterada ao aplicar esta migração.

drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_delete on public.profiles;
revoke insert, update, delete on public.profiles from authenticated;

create or replace function private.can_access_cliente_portal(p_cliente_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select (select public.is_admin()) or exists (
    select 1
    from public.profiles p
    join public.cliente_portal_acessos a on a.user_id=p.id
    where p.id=(select auth.uid())
      and p.ativo=true
      and p.role='cliente'
      and a.cliente_id=p_cliente_id
      and a.ativo=true
  );
$$;
revoke all on function private.can_access_cliente_portal(uuid) from public, anon;
grant execute on function private.can_access_cliente_portal(uuid) to authenticated;

create or replace function public.gerir_utilizador(
  p_user_id uuid,
  p_role public.user_role,
  p_ativo boolean,
  p_motivo text
)
returns public.profiles
language plpgsql
security definer
set search_path=''
as $$
declare
  atual public.profiles;
  resultado public.profiles;
  motivo text:=btrim(coalesce(p_motivo,''));
begin
  if not exists (
    select 1 from public.profiles
    where id=(select auth.uid()) and role='admin' and ativo=true
  ) then
    raise exception 'Acesso reservado ao administrador' using errcode='42501';
  end if;

  if p_user_id=(select auth.uid()) then
    raise exception 'A sua própria conta não pode ser alterada por este fluxo';
  end if;

  select * into atual from public.profiles where id=p_user_id for update;
  if atual.id is null then raise exception 'Conta não encontrada'; end if;
  if char_length(motivo)<10 or char_length(motivo)>500 then
    raise exception 'Indique um motivo entre 10 e 500 caracteres';
  end if;
  if p_role='admin' and p_ativo=false then
    raise exception 'Um perfil administrador não pode ficar desativado';
  end if;
  if atual.role='admin' and atual.ativo=true and (p_role<>'admin' or p_ativo=false)
    and (select count(*) from public.profiles where role='admin' and ativo=true)<=1 then
    raise exception 'O último administrador ativo não pode ser removido';
  end if;
  if p_role='cliente' and exists (
    select 1 from public.obra_utilizadores where user_id=p_user_id and ativo=true
  ) then
    raise exception 'Remova primeiro as atribuições operacionais desta conta';
  end if;
  if p_role<>'cliente' and exists (
    select 1 from public.cliente_portal_acessos where user_id=p_user_id and ativo=true
  ) then
    raise exception 'Desative primeiro os vínculos ativos do Portal do Cliente';
  end if;
  if atual.role=p_role and coalesce(atual.ativo,true)=p_ativo then
    raise exception 'Não existem alterações para guardar';
  end if;

  update public.profiles set role=p_role,ativo=p_ativo where id=p_user_id returning * into resultado;
  insert into public.atividades_sistema(utilizador_id,entidade,entidade_id,acao,resumo,metadados)
  values ((select auth.uid()),'perfil',p_user_id,'atualizou','Perfil de acesso revisto',jsonb_build_object(
    'origem','web-v3.8','motivo',motivo,'role_anterior',atual.role,'role_novo',p_role,
    'ativo_anterior',coalesce(atual.ativo,true),'ativo_novo',p_ativo
  ));
  return resultado;
end;
$$;

revoke all on function public.gerir_utilizador(uuid,public.user_role,boolean,text) from public, anon;
grant execute on function public.gerir_utilizador(uuid,public.user_role,boolean,text) to authenticated;
