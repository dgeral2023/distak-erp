begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.subempreitadas alter column taxa_iva drop not null;

create table if not exists public.subempreitada_iva_parcelas (
  id uuid primary key default gen_random_uuid(),
  subempreitada_id uuid not null references public.subempreitadas(id) on delete restrict,
  descricao text not null check (char_length(btrim(descricao)) between 2 and 120),
  valor_base numeric(14,2) not null check (valor_base > 0),
  regime_iva text not null check (regime_iva in ('tributado','outro')),
  taxa_iva numeric(5,2) not null default 0 check (taxa_iva in (0,6,23)),
  motivo_nao_liquidacao text,
  valor_iva numeric(14,2) generated always as (
    case when regime_iva = 'tributado' then round(valor_base * taxa_iva / 100, 2) else 0 end
  ) stored,
  total_com_iva numeric(14,2) generated always as (
    valor_base + case when regime_iva = 'tributado' then round(valor_base * taxa_iva / 100, 2) else 0 end
  ) stored,
  ordem integer not null default 0 check (ordem >= 0),
  criado_por uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  criado_em timestamptz not null default now(),
  unique (subempreitada_id,ordem),
  check (
    (regime_iva = 'tributado' and taxa_iva in (6,23) and motivo_nao_liquidacao is null)
    or
    (regime_iva = 'outro' and taxa_iva = 0 and (motivo_nao_liquidacao is null or char_length(btrim(motivo_nao_liquidacao)) between 5 and 240))
  )
);

create index if not exists subempreitada_iva_parcelas_contrato_idx on public.subempreitada_iva_parcelas (subempreitada_id,ordem);
create index if not exists subempreitada_iva_parcelas_criado_por_idx on public.subempreitada_iva_parcelas (criado_por);
alter table public.subempreitada_iva_parcelas enable row level security;

revoke all on public.subempreitada_iva_parcelas from public, anon, authenticated;
grant select,insert,update,delete on public.subempreitada_iva_parcelas to authenticated;

drop policy if exists subempreitada_iva_parcelas_select_admin on public.subempreitada_iva_parcelas;
drop policy if exists subempreitada_iva_parcelas_insert_admin on public.subempreitada_iva_parcelas;
drop policy if exists subempreitada_iva_parcelas_update_admin on public.subempreitada_iva_parcelas;
drop policy if exists subempreitada_iva_parcelas_delete_admin on public.subempreitada_iva_parcelas;

create policy subempreitada_iva_parcelas_select_admin on public.subempreitada_iva_parcelas
  for select to authenticated using ((select public.is_admin()));
create policy subempreitada_iva_parcelas_insert_admin on public.subempreitada_iva_parcelas
  for insert to authenticated with check ((select public.is_admin()) and criado_por=(select auth.uid()));
create policy subempreitada_iva_parcelas_update_admin on public.subempreitada_iva_parcelas
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy subempreitada_iva_parcelas_delete_admin on public.subempreitada_iva_parcelas
  for delete to authenticated using ((select public.is_admin()));

create or replace function public.guardar_subempreitada_com_iva_parcelas(
  p_subempreitada jsonb,
  p_parcelas jsonb,
  p_subempreitada_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_obra_id uuid;
  v_fornecedor_id uuid;
  v_objeto text;
  v_estado text;
  v_adjudicada_em date;
  v_inicio_previsto date;
  v_fim_previsto date;
  v_condicoes text;
  v_notas text;
  v_base numeric(14,2) := 0;
  v_taxa numeric(5,2);
  v_misto boolean;
  v_parcela jsonb;
  v_ordem bigint;
  v_descricao text;
  v_regime text;
  v_motivo text;
  v_parcela_base numeric(14,2);
  v_parcela_taxa numeric(5,2);
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'Apenas um administrador pode guardar contratos e parcelas de IVA.';
  end if;
  if p_subempreitada is null or jsonb_typeof(p_subempreitada) <> 'object'
     or p_parcelas is null or jsonb_typeof(p_parcelas) <> 'array' then
    raise exception using errcode = '22023', message = 'Dados do contrato ou das parcelas invalidos.';
  end if;

  v_obra_id := nullif(p_subempreitada->>'obra_id','')::uuid;
  v_fornecedor_id := nullif(p_subempreitada->>'fornecedor_id','')::uuid;
  v_objeto := btrim(coalesce(p_subempreitada->>'objeto',''));
  v_estado := coalesce(nullif(btrim(p_subempreitada->>'estado'),''),'proposta');
  v_adjudicada_em := nullif(p_subempreitada->>'adjudicada_em','')::date;
  v_inicio_previsto := nullif(p_subempreitada->>'inicio_previsto','')::date;
  v_fim_previsto := nullif(p_subempreitada->>'fim_previsto','')::date;
  v_condicoes := nullif(btrim(coalesce(p_subempreitada->>'condicoes_pagamento','')),'');
  v_notas := nullif(btrim(coalesce(p_subempreitada->>'notas','')),'');

  if v_obra_id is null or not exists (select 1 from public.obras o where o.id=v_obra_id) then
    raise exception using errcode = '23503', message = 'Selecione uma obra valida.';
  end if;
  if v_fornecedor_id is null or not exists (
    select 1 from public.fornecedores f where f.id=v_fornecedor_id and f.tipo='subempreiteiro'
  ) then
    raise exception using errcode = '23503', message = 'Selecione um subempreiteiro valido.';
  end if;
  if char_length(v_objeto) not between 2 and 240
     or v_estado not in ('proposta','adjudicada','em_execucao','suspensa','concluida','cancelada')
     or coalesce(char_length(v_condicoes),0) > 240
     or coalesce(char_length(v_notas),0) > 4000
     or (v_fim_previsto is not null and v_inicio_previsto is not null and v_fim_previsto < v_inicio_previsto) then
    raise exception using errcode = '22023', message = 'Um dos dados gerais do contrato e invalido.';
  end if;

  v_misto := jsonb_array_length(p_parcelas) > 0;
  if v_misto and jsonb_array_length(p_parcelas) not between 2 and 20 then
    raise exception using errcode = '22023', message = 'O IVA misto deve ter entre 2 e 20 parcelas.';
  end if;

  if v_misto then
    for v_parcela, v_ordem in
      select item.value,item.ordinality-1
      from jsonb_array_elements(p_parcelas) with ordinality as item(value,ordinality)
    loop
      v_descricao := btrim(coalesce(v_parcela->>'descricao',''));
      v_regime := coalesce(v_parcela->>'regime_iva','');
      v_motivo := nullif(btrim(coalesce(v_parcela->>'motivo_nao_liquidacao','')),'');
      if char_length(v_descricao) not between 2 and 120
         or coalesce(v_parcela->>'valor_base','') !~ '^[0-9]+([.][0-9]{1,2})?$' then
        raise exception using errcode = '22023', message = 'Descricao ou valor invalido numa parcela.';
      end if;
      v_parcela_base := (v_parcela->>'valor_base')::numeric;
      if v_parcela_base <= 0 or v_regime not in ('tributado','outro') then
        raise exception using errcode = '22023', message = 'Valor ou tratamento de IVA invalido numa parcela.';
      end if;
      if v_regime = 'tributado' then
        if coalesce(v_parcela->>'taxa_iva','') !~ '^(6|23)([.]0{1,2})?$' then
          raise exception using errcode = '22023', message = 'A taxa tributada deve ser 6% ou 23%.';
        end if;
        v_parcela_taxa := (v_parcela->>'taxa_iva')::numeric;
        v_motivo := null;
      else
        v_parcela_taxa := 0;
      end if;
      v_base := v_base + v_parcela_base;
    end loop;
    v_taxa := null;
  else
    if coalesce(p_subempreitada->>'valor_base','') !~ '^[0-9]+([.][0-9]{1,2})?$'
       or coalesce(p_subempreitada->>'taxa_iva','') !~ '^(0|6|23)([.]0{1,2})?$' then
      raise exception using errcode = '22023', message = 'Valor base ou taxa de IVA invalida.';
    end if;
    v_base := (p_subempreitada->>'valor_base')::numeric;
    v_taxa := (p_subempreitada->>'taxa_iva')::numeric;
    if v_base < 0 then
      raise exception using errcode = '22023', message = 'O valor base nao pode ser negativo.';
    end if;
  end if;

  v_base := round(v_base,2);

  if p_subempreitada_id is null then
    insert into public.subempreitadas (
      obra_id,fornecedor_id,objeto,valor_inicial,taxa_iva,estado,adjudicada_em,
      inicio_previsto,fim_previsto,condicoes_pagamento,notas
    ) values (
      v_obra_id,v_fornecedor_id,v_objeto,v_base,v_taxa,v_estado,v_adjudicada_em,
      v_inicio_previsto,v_fim_previsto,v_condicoes,v_notas
    ) returning id into v_id;
  else
    update public.subempreitadas s
    set obra_id=v_obra_id,fornecedor_id=v_fornecedor_id,objeto=v_objeto,
        valor_inicial=v_base,taxa_iva=v_taxa,estado=v_estado,adjudicada_em=v_adjudicada_em,
        inicio_previsto=v_inicio_previsto,fim_previsto=v_fim_previsto,
        condicoes_pagamento=v_condicoes,notas=v_notas,atualizado_em=now()
    where s.id=p_subempreitada_id
    returning s.id into v_id;
    if v_id is null then
      raise exception using errcode = 'P0002', message = 'O contrato ja nao existe ou nao pode ser alterado.';
    end if;
  end if;

  delete from public.subempreitada_iva_parcelas p where p.subempreitada_id=v_id;

  if v_misto then
    for v_parcela, v_ordem in
      select item.value,item.ordinality-1
      from jsonb_array_elements(p_parcelas) with ordinality as item(value,ordinality)
    loop
      v_regime := v_parcela->>'regime_iva';
      insert into public.subempreitada_iva_parcelas (
        subempreitada_id,descricao,valor_base,regime_iva,taxa_iva,motivo_nao_liquidacao,ordem
      ) values (
        v_id,
        btrim(v_parcela->>'descricao'),
        (v_parcela->>'valor_base')::numeric,
        v_regime,
        case when v_regime='tributado' then (v_parcela->>'taxa_iva')::numeric else 0 end,
        case when v_regime='tributado' then null else btrim(v_parcela->>'motivo_nao_liquidacao') end,
        v_ordem
      );
    end loop;
  end if;

  return v_id;
end;
$$;

revoke all on function public.guardar_subempreitada_com_iva_parcelas(jsonb,jsonb,uuid) from public, anon;
grant execute on function public.guardar_subempreitada_com_iva_parcelas(jsonb,jsonb,uuid) to authenticated;

comment on table public.subempreitada_iva_parcelas is
  'Parcelas fiscais do valor acordado de uma subempreitada com tratamentos de IVA diferentes.';
comment on column public.subempreitada_iva_parcelas.motivo_nao_liquidacao is
  'Fundamento fiscal opcional quando a parcela fica sem IVA.';

commit;
