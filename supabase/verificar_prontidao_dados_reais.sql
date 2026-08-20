-- Verificação somente de leitura para executar depois da implantação completa.
-- Todas as colunas da única linha devolvida devem ser true ou zero, conforme o nome.

select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leads_site' and column_name = 'public_id'
  ) as leads_public_id_instalado,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cliente_portal_obras' and column_name = 'foto_path'
  ) as portal_foto_path_instalado,
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'leads_site_public_id_unique_idx'
  ) as leads_idempotencia_instalada,
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'orcamentos_numero_unique_idx'
  ) as numeros_orcamento_unicos,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'guardar_orcamento_com_itens'
      and not p.prosecdef
      and not has_function_privilege('anon', p.oid, 'execute')
      and has_function_privilege('authenticated', p.oid, 'execute')
  ) as rpc_orcamento_invoker_restrito,
  exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Obras - leitura autenticada por obra'
      and cmd = 'SELECT'
  ) as fotografias_rls_instalada,
  coalesce((select not public from storage.buckets where id = 'distak-obras'), false) as fotografias_bucket_privado,
  coalesce((
    select file_size_limit = 52428800 and 'image/heif' = any(allowed_mime_types)
    from storage.buckets where id = 'distak-obras'
  ), false) as fotografias_limites_ativos,
  coalesce((
    select file_size_limit = 26214400 and 'image/heic' = any(allowed_mime_types)
    from storage.buckets where id = 'distak-documentos'
  ), false) as documentos_limites_ativos,
  (select count(*) from (
    select lower(btrim(numero))
    from public.orcamentos
    where numero is not null and btrim(numero) <> ''
    group by 1 having count(*) > 1
  ) duplicados) as numeros_orcamento_duplicados,
  (select count(*) from public.cliente_portal_obras
    where foto_path is null and foto_url like '%/storage/v1/object/public/distak-obras/%'
  ) as fotografias_portal_sem_caminho,
  not has_table_privilege('anon', 'public.leads_site', 'select')
    and not has_table_privilege('anon', 'public.leads_site', 'insert')
    and not has_table_privilege('anon', 'public.leads_site', 'update')
    and not has_table_privilege('anon', 'public.leads_site', 'delete') as leads_sem_acesso_anonimo;
