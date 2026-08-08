-- DISTAK ERP v3.8: revisão atómica e auditável dos vínculos do Portal do Cliente.
-- Criar a função não altera vínculos. A execução depende de confirmação posterior no ERP.
create or replace function private.gerir_vinculos_cliente_impl(p_user_id uuid,p_cliente_ids uuid[],p_motivo text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  alvo public.profiles; motivo text:=btrim(coalesce(p_motivo,''));
  novos uuid[]; anteriores uuid[]; adicionados uuid[]; removidos uuid[];
begin
  if not exists (select 1 from public.profiles where id=(select auth.uid()) and role='admin' and ativo=true) then raise exception 'Acesso reservado ao administrador' using errcode='42501'; end if;
  if p_user_id is null or cardinality(coalesce(p_cliente_ids,'{}'::uuid[]))>500 then raise exception 'Pedido de vínculos inválido'; end if;
  if char_length(motivo)<10 or char_length(motivo)>500 then raise exception 'Indique um motivo entre 10 e 500 caracteres'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,20260809));
  select * into alvo from public.profiles where id=p_user_id for update;
  if alvo.id is null then raise exception 'Conta não encontrada'; end if;
  if alvo.ativo=false or alvo.role<>'cliente' then raise exception 'Apenas uma conta de cliente ativa pode receber vínculos do portal'; end if;
  select coalesce(array_agg(distinct value order by value),'{}'::uuid[]) into novos from unnest(coalesce(p_cliente_ids,'{}'::uuid[])) value;
  if exists (select 1 from unnest(novos) id left join public.clientes c on c.id=id where c.id is null) then raise exception 'Um ou mais clientes não foram encontrados'; end if;
  select coalesce(array_agg(cliente_id order by cliente_id),'{}'::uuid[]) into anteriores from public.cliente_portal_acessos where user_id=p_user_id and ativo=true;
  if anteriores=novos then raise exception 'Não existem alterações para guardar'; end if;
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into adicionados from unnest(novos) id where not (id=any(anteriores));
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into removidos from unnest(anteriores) id where not (id=any(novos));
  update public.cliente_portal_acessos set ativo=false,criado_por=(select auth.uid()) where user_id=p_user_id and ativo=true and not (cliente_id=any(novos));
  insert into public.cliente_portal_acessos(user_id,cliente_id,ativo,criado_por) select p_user_id,id,true,(select auth.uid()) from unnest(novos) id
    on conflict (user_id,cliente_id) do update set ativo=true,criado_por=excluded.criado_por;
  insert into public.atividades_sistema(utilizador_id,entidade,entidade_id,acao,resumo,metadados)
  values ((select auth.uid()),'vinculo_cliente',p_user_id,'atribuiu','Vínculos do Portal do Cliente revistos',jsonb_build_object('origem','web-v3.8','motivo',motivo,'anteriores',anteriores,'novos',novos,'adicionados',adicionados,'removidos',removidos));
  return jsonb_build_object('ok',true,'total',cardinality(novos),'adicionados',cardinality(adicionados),'removidos',cardinality(removidos));
end;
$$;
revoke all on function private.gerir_vinculos_cliente_impl(uuid,uuid[],text) from public, anon;
grant execute on function private.gerir_vinculos_cliente_impl(uuid,uuid[],text) to authenticated;
create or replace function public.gerir_vinculos_cliente(p_user_id uuid,p_cliente_ids uuid[],p_motivo text)
returns jsonb language sql volatile security invoker set search_path='' as $$ select private.gerir_vinculos_cliente_impl(p_user_id,p_cliente_ids,p_motivo); $$;
revoke all on function public.gerir_vinculos_cliente(uuid,uuid[],text) from public, anon;
grant execute on function public.gerir_vinculos_cliente(uuid,uuid[],text) to authenticated;
comment on function public.gerir_vinculos_cliente(uuid,uuid[],text) is 'Revê atomicamente os clientes associados a uma conta de cliente ativa, com validação administrativa e auditoria.';
