-- Preparação para dados reais: integração idempotente, fotografias privadas e números de orçamento únicos.

alter table public.leads_site
  add column if not exists public_id uuid;

create unique index if not exists leads_site_public_id_unique_idx
  on public.leads_site(public_id)
  where public_id is not null;

revoke insert, truncate, references, trigger on public.leads_site from authenticated;
grant select, update, delete on public.leads_site to authenticated;

alter table public.cliente_portal_obras
  add column if not exists foto_path text;

update public.cliente_portal_obras
set foto_path = substring(foto_url from '/storage/v1/object/public/distak-obras/([^?]+)')
where foto_path is null
  and foto_url like '%/storage/v1/object/public/distak-obras/%';

alter table public.cliente_portal_obras
  drop constraint if exists cliente_portal_obras_foto_path_check;

alter table public.cliente_portal_obras
  add constraint cliente_portal_obras_foto_path_check
  check (
    foto_path is null
    or foto_path ~* '^obras/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/].+'
  );

drop policy if exists "Obras - leitura autenticada por obra" on storage.objects;
create policy "Obras - leitura autenticada por obra"
on storage.objects for select
to authenticated
using (
  bucket_id = 'distak-obras'
  and (storage.foldername(name))[1] = 'obras'
  and case
    when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (
      (select public.is_admin())
      or (select private.can_access_obra(((storage.foldername(name))[2])::uuid))
      or exists (
        select 1
        from public.cliente_portal_obras portal
        where portal.obra_id = ((storage.foldername(name))[2])::uuid
          and portal.publicado
          and (select private.can_access_cliente_portal(portal.cliente_id))
      )
    )
    else false
  end
);

create unique index if not exists orcamentos_numero_unique_idx
  on public.orcamentos(lower(btrim(numero)))
  where numero is not null and btrim(numero) <> '';

-- Replica no servidor os limites que a interface apresenta ao utilizador e
-- inclui os formatos HEIC/HEIF aceites pelos fluxos móveis.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
where id = 'distak-obras';

update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array[
      'application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif',
      'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
where id = 'distak-documentos';

-- Guarda o cabeçalho e todas as linhas na mesma transação. A função corre com
-- os privilégios do chamador, pelo que as políticas RLS de ambas as tabelas
-- continuam a exigir um administrador ativo.
create or replace function public.guardar_orcamento_com_itens(
  p_orcamento jsonb,
  p_itens jsonb,
  p_orcamento_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_cliente_id uuid;
  v_obra_id uuid;
  v_numero text;
  v_descricao text;
  v_referencia text;
  v_condicoes text;
  v_notas text;
  v_data_emissao date;
  v_validade_dias integer;
  v_estado text;
  v_iva numeric;
  v_desconto numeric;
  v_subtotal numeric := 0;
  v_total numeric;
  v_aprovado_em timestamptz;
  v_item jsonb;
  v_item_descricao text;
  v_unidade text;
  v_quantidade numeric;
  v_preco_unitario numeric;
  v_ordem bigint;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'Apenas um administrador pode guardar orçamentos.';
  end if;

  if p_orcamento is null or jsonb_typeof(p_orcamento) <> 'object' then
    raise exception using errcode = '22023', message = 'Dados do orçamento inválidos.';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) < 1 or jsonb_array_length(p_itens) > 200 then
    raise exception using errcode = '22023', message = 'O orçamento deve ter entre 1 e 200 linhas.';
  end if;

  v_cliente_id := nullif(p_orcamento->>'cliente_id', '')::uuid;
  v_obra_id := nullif(p_orcamento->>'obra_id', '')::uuid;
  v_numero := btrim(coalesce(p_orcamento->>'numero', ''));
  v_descricao := btrim(coalesce(p_orcamento->>'descricao', ''));
  v_referencia := nullif(btrim(coalesce(p_orcamento->>'referencia', '')), '');
  v_condicoes := nullif(btrim(coalesce(p_orcamento->>'condicoes', '')), '');
  v_notas := nullif(btrim(coalesce(p_orcamento->>'notas', '')), '');
  v_data_emissao := coalesce(nullif(p_orcamento->>'data_emissao', '')::date, current_date);
  v_validade_dias := coalesce(nullif(p_orcamento->>'validade_dias', '')::integer, 15);
  v_estado := coalesce(nullif(p_orcamento->>'estado', ''), 'Rascunho');

  if v_cliente_id is null then
    raise exception using errcode = '22023', message = 'Selecione um cliente válido.';
  end if;
  if v_numero = '' or char_length(v_numero) > 60 then
    raise exception using errcode = '22023', message = 'O número do orçamento é obrigatório e não pode exceder 60 caracteres.';
  end if;
  if v_descricao = '' or char_length(v_descricao) > 2000 then
    raise exception using errcode = '22023', message = 'A descrição do orçamento é obrigatória e não pode exceder 2000 caracteres.';
  end if;
  if coalesce(char_length(v_referencia), 0) > 300
     or coalesce(char_length(v_condicoes), 0) > 4000
     or coalesce(char_length(v_notas), 0) > 4000 then
    raise exception using errcode = '22023', message = 'Um dos campos de texto do orçamento excede o limite permitido.';
  end if;
  if v_validade_dias not between 1 and 365 then
    raise exception using errcode = '22023', message = 'A validade deve ficar entre 1 e 365 dias.';
  end if;
  if v_estado not in ('Rascunho', 'Enviado', 'Aprovado', 'Recusado') then
    raise exception using errcode = '22023', message = 'Estado do orçamento inválido.';
  end if;
  if v_obra_id is not null and not exists (
    select 1 from public.obras o where o.id = v_obra_id and o.cliente_id = v_cliente_id
  ) then
    raise exception using errcode = '23503', message = 'A obra selecionada não pertence ao cliente do orçamento.';
  end if;

  if coalesce(p_orcamento->>'iva', '') !~ '^(0|6|23)([.]0+)?$' then
    raise exception using errcode = '22023', message = 'Taxa de IVA inválida.';
  end if;
  v_iva := (p_orcamento->>'iva')::numeric;

  for v_item, v_ordem in
    select item.value, item.ordinality - 1
    from jsonb_array_elements(p_itens) with ordinality as item(value, ordinality)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception using errcode = '22023', message = 'Linha de orçamento inválida.';
    end if;
    v_item_descricao := btrim(coalesce(v_item->>'descricao', ''));
    v_unidade := coalesce(nullif(v_item->>'unidade', ''), 'un');
    if v_item_descricao = '' or char_length(v_item_descricao) > 500 then
      raise exception using errcode = '22023', message = 'Cada linha precisa de uma descrição até 500 caracteres.';
    end if;
    if v_unidade not in ('un', 'm', 'm²', 'm³', 'h', 'dia', 'lote') then
      raise exception using errcode = '22023', message = 'Unidade de orçamento inválida.';
    end if;
    if coalesce(v_item->>'quantidade', '') !~ '^[0-9]+([.][0-9]{1,3})?$'
       or coalesce(v_item->>'preco_unitario', '') !~ '^[0-9]+([.][0-9]{1,2})?$' then
      raise exception using errcode = '22023', message = 'Quantidade ou preço unitário inválido.';
    end if;
    v_quantidade := (v_item->>'quantidade')::numeric;
    v_preco_unitario := (v_item->>'preco_unitario')::numeric;
    if v_quantidade <= 0 or v_quantidade > 999999999.999 or v_preco_unitario < 0 or v_preco_unitario > 9999999999.99 then
      raise exception using errcode = '22023', message = 'Quantidade ou preço unitário fora do limite permitido.';
    end if;
    v_subtotal := v_subtotal + (v_quantidade * v_preco_unitario);
  end loop;

  v_subtotal := round(v_subtotal, 2);
  if coalesce(p_orcamento->>'desconto', '') !~ '^[0-9]+([.][0-9]{1,2})?$' then
    raise exception using errcode = '22023', message = 'Desconto inválido.';
  end if;
  v_desconto := (p_orcamento->>'desconto')::numeric;
  if v_desconto < 0 or v_desconto > v_subtotal then
    raise exception using errcode = '22023', message = 'O desconto não pode exceder o subtotal.';
  end if;
  v_total := round((v_subtotal - v_desconto) * (1 + v_iva / 100), 2);

  if p_orcamento_id is null then
    insert into public.orcamentos (
      cliente_id, obra_id, numero, referencia, data_emissao, validade_dias,
      descricao, valor_sem_iva, desconto, iva, total, estado, condicoes, notas, aprovado_em
    ) values (
      v_cliente_id, v_obra_id, v_numero, v_referencia, v_data_emissao, v_validade_dias,
      v_descricao, v_subtotal - v_desconto, v_desconto, v_iva, v_total, v_estado,
      v_condicoes, v_notas, case when v_estado = 'Aprovado' then now() else null end
    ) returning id into v_id;
  else
    select o.aprovado_em into v_aprovado_em
    from public.orcamentos o
    where o.id = p_orcamento_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'O orçamento já não existe ou não pode ser alterado.';
    end if;

    update public.orcamentos o
    set cliente_id = v_cliente_id,
        obra_id = v_obra_id,
        numero = v_numero,
        referencia = v_referencia,
        data_emissao = v_data_emissao,
        validade_dias = v_validade_dias,
        descricao = v_descricao,
        valor_sem_iva = v_subtotal - v_desconto,
        desconto = v_desconto,
        iva = v_iva,
        total = v_total,
        estado = v_estado,
        condicoes = v_condicoes,
        notas = v_notas,
        aprovado_em = case when v_estado = 'Aprovado' then coalesce(v_aprovado_em, now()) else null end
    where o.id = p_orcamento_id
    returning o.id into v_id;

    if v_id is null then
      raise exception using errcode = 'P0002', message = 'O orçamento já não existe ou não pode ser alterado.';
    end if;
    delete from public.orcamento_itens i where i.orcamento_id = v_id;
  end if;

  for v_item, v_ordem in
    select item.value, item.ordinality - 1
    from jsonb_array_elements(p_itens) with ordinality as item(value, ordinality)
  loop
    insert into public.orcamento_itens (
      orcamento_id, ordem, descricao, unidade, quantidade, preco_unitario
    ) values (
      v_id,
      v_ordem,
      btrim(v_item->>'descricao'),
      coalesce(nullif(v_item->>'unidade', ''), 'un'),
      (v_item->>'quantidade')::numeric,
      (v_item->>'preco_unitario')::numeric
    );
  end loop;

  return v_id;
end;
$$;

revoke all on function public.guardar_orcamento_com_itens(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.guardar_orcamento_com_itens(jsonb, jsonb, uuid) to authenticated;
