-- Guarda o auto e todas as linhas numa única transação. A função mantém RLS
-- e privilégios do chamador; apenas administradores ativos conseguem usá-la.
grant delete on public.medicoes_itens to authenticated;

drop policy if exists medicoes_itens_delete_admin on public.medicoes_itens;
create policy medicoes_itens_delete_admin
  on public.medicoes_itens
  for delete
  to authenticated
  using ((select public.is_admin()));

create or replace function public.guardar_auto_medicao_com_itens(
  p_auto jsonb,
  p_itens jsonb,
  p_auto_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_obra_id uuid;
  v_numero text;
  v_inicio date;
  v_fim date;
  v_estado text;
  v_retencao numeric;
  v_iva numeric;
  v_subtotal numeric := 0;
  v_total numeric;
  v_fatura_numero text;
  v_fatura_data date;
  v_vencimento date;
  v_observacoes text;
  v_item jsonb;
  v_ordem bigint;
  v_descricao text;
  v_unidade text;
  v_contratada numeric;
  v_anterior numeric;
  v_atual numeric;
  v_preco numeric;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'Apenas um administrador pode guardar autos de medição.';
  end if;

  if p_auto is null or jsonb_typeof(p_auto) <> 'object' then
    raise exception using errcode = '22023', message = 'Dados do auto de medição inválidos.';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) < 1 or jsonb_array_length(p_itens) > 200 then
    raise exception using errcode = '22023', message = 'O auto deve ter entre 1 e 200 linhas.';
  end if;

  v_obra_id := nullif(p_auto->>'obra_id', '')::uuid;
  v_numero := btrim(coalesce(p_auto->>'numero', ''));
  v_inicio := nullif(p_auto->>'periodo_inicio', '')::date;
  v_fim := nullif(p_auto->>'periodo_fim', '')::date;
  v_estado := coalesce(nullif(p_auto->>'estado', ''), 'rascunho');
  v_fatura_numero := nullif(btrim(coalesce(p_auto->>'fatura_numero', '')), '');
  v_fatura_data := nullif(p_auto->>'fatura_data', '')::date;
  v_vencimento := nullif(p_auto->>'vencimento', '')::date;
  v_observacoes := nullif(btrim(coalesce(p_auto->>'observacoes', '')), '');

  if v_obra_id is null or not exists (select 1 from public.obras o where o.id = v_obra_id) then
    raise exception using errcode = '23503', message = 'Selecione uma obra válida.';
  end if;
  if v_numero = '' or char_length(v_numero) > 40 then
    raise exception using errcode = '22023', message = 'O número do auto é obrigatório e não pode exceder 40 caracteres.';
  end if;
  if v_inicio is null or v_fim is null or v_fim < v_inicio then
    raise exception using errcode = '22023', message = 'O período final não pode ser anterior ao período inicial.';
  end if;
  if v_estado not in ('rascunho','submetido','aprovado','faturado','cancelado') then
    raise exception using errcode = '22023', message = 'Estado do auto de medição inválido.';
  end if;
  if coalesce(char_length(v_fatura_numero), 0) > 80
     or coalesce(char_length(v_observacoes), 0) > 2000 then
    raise exception using errcode = '22023', message = 'Um dos campos de texto excede o limite permitido.';
  end if;
  if v_estado = 'faturado' and (v_fatura_numero is null or v_fatura_data is null) then
    raise exception using errcode = '22023', message = 'Um auto faturado precisa do número e da data da fatura.';
  end if;
  if coalesce(p_auto->>'retencao_percentagem', '') !~ '^[0-9]+([.][0-9]{1,2})?$'
     or coalesce(p_auto->>'iva_percentagem', '') !~ '^[0-9]+([.][0-9]{1,2})?$' then
    raise exception using errcode = '22023', message = 'Retenção ou IVA inválido.';
  end if;
  v_retencao := (p_auto->>'retencao_percentagem')::numeric;
  v_iva := (p_auto->>'iva_percentagem')::numeric;
  if v_retencao not between 0 and 100 or v_iva not between 0 and 100 then
    raise exception using errcode = '22023', message = 'Retenção e IVA devem ficar entre 0 e 100%.';
  end if;

  for v_item, v_ordem in
    select item.value, item.ordinality - 1
    from jsonb_array_elements(p_itens) with ordinality as item(value, ordinality)
  loop
    v_descricao := btrim(coalesce(v_item->>'descricao', ''));
    v_unidade := btrim(coalesce(nullif(v_item->>'unidade', ''), 'un'));
    if char_length(v_descricao) not between 2 and 300 or char_length(v_unidade) > 20 then
      raise exception using errcode = '22023', message = 'Descrição ou unidade inválida numa linha de medição.';
    end if;
    if coalesce(v_item->>'quantidade_contratada', '') !~ '^[0-9]+([.][0-9]{1,3})?$'
       or coalesce(v_item->>'quantidade_anterior', '') !~ '^[0-9]+([.][0-9]{1,3})?$'
       or coalesce(v_item->>'quantidade_atual', '') !~ '^[0-9]+([.][0-9]{1,3})?$'
       or coalesce(v_item->>'preco_unitario', '') !~ '^[0-9]+([.][0-9]{1,2})?$' then
      raise exception using errcode = '22023', message = 'Quantidades ou preço inválido numa linha de medição.';
    end if;
    v_contratada := (v_item->>'quantidade_contratada')::numeric;
    v_anterior := (v_item->>'quantidade_anterior')::numeric;
    v_atual := (v_item->>'quantidade_atual')::numeric;
    v_preco := (v_item->>'preco_unitario')::numeric;
    if v_anterior + v_atual > v_contratada then
      raise exception using errcode = '22023', message = 'A medição acumulada ultrapassa a quantidade contratada.';
    end if;
    v_subtotal := v_subtotal + (v_atual * v_preco);
  end loop;

  v_subtotal := round(v_subtotal, 2);
  v_total := round((v_subtotal * (1 - v_retencao / 100)) * (1 + v_iva / 100), 2);

  if p_auto_id is null then
    insert into public.medicoes_autos (
      obra_id, numero, periodo_inicio, periodo_fim, estado, subtotal,
      retencao_percentagem, iva_percentagem, total, fatura_numero,
      fatura_data, vencimento, observacoes
    ) values (
      v_obra_id, v_numero, v_inicio, v_fim, v_estado, v_subtotal,
      v_retencao, v_iva, v_total, v_fatura_numero, v_fatura_data,
      v_vencimento, v_observacoes
    ) returning id into v_id;
  else
    update public.medicoes_autos a
    set obra_id = v_obra_id,
        numero = v_numero,
        periodo_inicio = v_inicio,
        periodo_fim = v_fim,
        estado = v_estado,
        subtotal = v_subtotal,
        retencao_percentagem = v_retencao,
        iva_percentagem = v_iva,
        total = v_total,
        fatura_numero = v_fatura_numero,
        fatura_data = v_fatura_data,
        vencimento = v_vencimento,
        observacoes = v_observacoes,
        atualizado_em = now()
    where a.id = p_auto_id
    returning a.id into v_id;
    if v_id is null then
      raise exception using errcode = 'P0002', message = 'O auto já não existe ou não pode ser alterado.';
    end if;
    delete from public.medicoes_itens i where i.auto_id = v_id;
  end if;

  for v_item, v_ordem in
    select item.value, item.ordinality - 1
    from jsonb_array_elements(p_itens) with ordinality as item(value, ordinality)
  loop
    insert into public.medicoes_itens (
      auto_id, descricao, unidade, quantidade_contratada,
      quantidade_anterior, quantidade_atual, preco_unitario, ordem
    ) values (
      v_id,
      btrim(v_item->>'descricao'),
      btrim(coalesce(nullif(v_item->>'unidade', ''), 'un')),
      (v_item->>'quantidade_contratada')::numeric,
      (v_item->>'quantidade_anterior')::numeric,
      (v_item->>'quantidade_atual')::numeric,
      (v_item->>'preco_unitario')::numeric,
      v_ordem
    );
  end loop;

  return v_id;
end;
$$;

revoke all on function public.guardar_auto_medicao_com_itens(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.guardar_auto_medicao_com_itens(jsonb, jsonb, uuid) to authenticated;
