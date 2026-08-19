-- DISTAK ERP v3.8: revisão atómica e auditável dos acessos operacionais por obra.
-- A publicação desta migração não altera atribuições; a função só atua quando chamada e confirmada no ERP.

create or replace function private.gerir_atribuicoes_obras_impl(
  p_user_id uuid,
  p_obra_ids uuid[],
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  alvo public.profiles;
  motivo text:=btrim(coalesce(p_motivo,''));
  novas uuid[];
  anteriores uuid[];
  adicionadas uuid[];
  removidas uuid[];
begin
  if not exists (select 1 from public.profiles where id=(select auth.uid()) and role='admin' and ativo=true) then
    raise exception 'Acesso reservado ao administrador' using errcode='42501';
  end if;
  if p_user_id is null or cardinality(coalesce(p_obra_ids,'{}'::uuid[]))>500 then
    raise exception 'Pedido de atribuições inválido';
  end if;
  if char_length(motivo)<10 or char_length(motivo)>500 then
    raise exception 'Indique um motivo entre 10 e 500 caracteres';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,20260808));
  select * into alvo from public.profiles where id=p_user_id for update;
  if alvo.id is null then raise exception 'Conta não encontrada'; end if;
  if alvo.ativo=false or alvo.role not in ('escritorio','encarregado','funcionario') then
    raise exception 'Apenas uma conta de equipa ativa pode receber obras';
  end if;

  select coalesce(array_agg(distinct value order by value),'{}'::uuid[])
    into novas from unnest(coalesce(p_obra_ids,'{}'::uuid[])) value;
  if exists (select 1 from unnest(novas) id left join public.obras o on o.id=id where o.id is null) then
    raise exception 'Uma ou mais obras não foram encontradas';
  end if;
  select coalesce(array_agg(obra_id order by obra_id),'{}'::uuid[])
    into anteriores from public.obra_utilizadores where user_id=p_user_id and ativo=true;
  if anteriores=novas then raise exception 'Não existem alterações para guardar'; end if;

  select coalesce(array_agg(id order by id),'{}'::uuid[]) into adicionadas
    from unnest(novas) id where not (id=any(anteriores));
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into removidas
    from unnest(anteriores) id where not (id=any(novas));

  update public.obra_utilizadores
    set ativo=false,atribuido_por=(select auth.uid())
    where user_id=p_user_id and ativo=true and not (obra_id=any(novas));
  insert into public.obra_utilizadores(obra_id,user_id,atribuido_por,ativo)
    select id,p_user_id,(select auth.uid()),true from unnest(novas) id
    on conflict (obra_id,user_id) do update
      set ativo=true,atribuido_por=excluded.atribuido_por;

  insert into public.atividades_sistema(utilizador_id,entidade,entidade_id,acao,resumo,metadados)
  values ((select auth.uid()),'atribuicao_obra',p_user_id,'atribuiu','Acessos por obra revistos',jsonb_build_object(
    'origem','web-v3.8','motivo',motivo,'anteriores',anteriores,'novas',novas,
    'adicionadas',adicionadas,'removidas',removidas
  ));
  return jsonb_build_object('ok',true,'total',cardinality(novas),'adicionadas',cardinality(adicionadas),'removidas',cardinality(removidas));
end;
$$;
revoke all on function private.gerir_atribuicoes_obras_impl(uuid,uuid[],text) from public, anon;
grant execute on function private.gerir_atribuicoes_obras_impl(uuid,uuid[],text) to authenticated;

create or replace function public.gerir_atribuicoes_obras(
  p_user_id uuid,
  p_obra_ids uuid[],
  p_motivo text
)
returns jsonb
language sql
volatile
security invoker
set search_path=''
as $$
  select private.gerir_atribuicoes_obras_impl(p_user_id,p_obra_ids,p_motivo);
$$;
revoke all on function public.gerir_atribuicoes_obras(uuid,uuid[],text) from public, anon;
grant execute on function public.gerir_atribuicoes_obras(uuid,uuid[],text) to authenticated;

comment on function public.gerir_atribuicoes_obras(uuid,uuid[],text) is
  'Revê atomicamente os acessos por obra de uma conta de equipa ativa, com validação administrativa e auditoria.';
