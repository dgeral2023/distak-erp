-- DISTAK ERP v3: histórico automático dos registos feitos em obra.
create or replace function private.registar_atividade_operacional()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  registo jsonb:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  autor uuid:=coalesce(
    nullif(registo->>'criado_por','')::uuid,
    nullif(registo->>'created_by','')::uuid,
    nullif(registo->>'inserido_por','')::uuid,
    (select auth.uid())
  );
  acao_pt text:=case tg_op when 'INSERT' then 'criou' when 'UPDATE' then 'atualizou' else 'eliminou' end;
begin
  if autor is not null then
    insert into public.atividades_sistema(utilizador_id,obra_id,entidade,entidade_id,acao,resumo,metadados)
    values (
      autor,
      nullif(registo->>'obra_id','')::uuid,
      tg_table_name,
      nullif(registo->>'id','')::uuid,
      acao_pt,
      initcap(replace(tg_table_name,'_',' '))||' '||acao_pt,
      jsonb_build_object('origem','operacao-v3')
    );
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

revoke all on function private.registar_atividade_operacional() from public,anon,authenticated;

do $$
declare tabela text;
begin
  foreach tabela in array array[
    'obra_checklists','obra_equipa_registos','obra_materiais','obra_horas',
    'obra_ocorrencias','obra_diarios','obra_documentos','obra_fotografias'
  ] loop
    execute format('drop trigger if exists registar_atividade_v3 on public.%I',tabela);
    execute format('create trigger registar_atividade_v3 after insert or update or delete on public.%I for each row execute function private.registar_atividade_operacional()',tabela);
  end loop;
end $$;
