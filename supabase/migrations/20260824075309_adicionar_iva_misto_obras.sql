begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table if not exists public.obra_iva_parcelas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete restrict,
  descricao text not null check (char_length(btrim(descricao)) between 2 and 120),
  valor_base numeric(14,2) not null check (valor_base > 0),
  regime_iva text not null check (regime_iva in ('tributado','autoliquidacao','isento','nao_sujeito','outro')),
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
  unique (obra_id,ordem),
  check (
    (regime_iva = 'tributado' and taxa_iva in (6,23) and motivo_nao_liquidacao is null)
    or
    (regime_iva <> 'tributado' and taxa_iva = 0 and char_length(btrim(motivo_nao_liquidacao)) between 5 and 240)
  )
);

create index if not exists obra_iva_parcelas_obra_idx on public.obra_iva_parcelas (obra_id,ordem);
create index if not exists obra_iva_parcelas_criado_por_idx on public.obra_iva_parcelas (criado_por);
alter table public.obra_iva_parcelas enable row level security;

revoke all on public.obra_iva_parcelas from public, anon, authenticated;
grant select,insert,update,delete on public.obra_iva_parcelas to authenticated;

drop policy if exists obra_iva_parcelas_select_admin on public.obra_iva_parcelas;
drop policy if exists obra_iva_parcelas_insert_admin on public.obra_iva_parcelas;
drop policy if exists obra_iva_parcelas_update_admin on public.obra_iva_parcelas;
drop policy if exists obra_iva_parcelas_delete_admin on public.obra_iva_parcelas;

create policy obra_iva_parcelas_select_admin on public.obra_iva_parcelas
  for select to authenticated using ((select public.is_admin()));
create policy obra_iva_parcelas_insert_admin on public.obra_iva_parcelas
  for insert to authenticated with check ((select public.is_admin()) and criado_por=(select auth.uid()));
create policy obra_iva_parcelas_update_admin on public.obra_iva_parcelas
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy obra_iva_parcelas_delete_admin on public.obra_iva_parcelas
  for delete to authenticated using ((select public.is_admin()));

create or replace function public.guardar_obra_com_iva_parcelas(
  p_obra jsonb,
  p_parcelas jsonb,
  p_obra_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_cliente_id uuid;
  v_nome text;
  v_morada text;
  v_estado text;
  v_prazo text;
  v_responsavel text;
  v_notas text;
  v_progresso integer;
  v_base numeric(14,2) := 0;
  v_iva numeric(14,2) := 0;
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
    raise exception using errcode = '42501', message = 'Apenas um administrador pode guardar obras e parcelas de IVA.';
  end if;
  if p_obra is null or jsonb_typeof(p_obra) <> 'object'
     or p_parcelas is null or jsonb_typeof(p_parcelas) <> 'array' then
    raise exception using errcode = '22023', message = 'Dados da obra ou das parcelas inválidos.';
  end if;

  v_cliente_id := nullif(p_obra->>'cliente_id','')::uuid;
  v_nome := btrim(coalesce(p_obra->>'nome',''));
  v_morada := nullif(btrim(coalesce(p_obra->>'morada','')),'');
  v_estado := coalesce(nullif(btrim(p_obra->>'estado'),''),'Orçamento');
  v_prazo := nullif(btrim(coalesce(p_obra->>'prazo','')),'');
  v_responsavel := nullif(btrim(coalesce(p_obra->>'responsavel','')),'');
  v_notas := nullif(btrim(coalesce(p_obra->>'notas','')),'');
  if coalesce(p_obra->>'progresso','') !~ '^[0-9]{1,3}$' then
    raise exception using errcode = '22023', message = 'O progresso deve ficar entre 0 e 100%.';
  end if;
  v_progresso := (p_obra->>'progresso')::integer;

  if v_cliente_id is not null and not exists (select 1 from public.clientes c where c.id=v_cliente_id) then
    raise exception using errcode = '23503', message = 'Selecione um cliente válido.';
  end if;
  if char_length(v_nome) not between 2 and 180
     or coalesce(char_length(v_morada),0) > 500
     or coalesce(char_length(v_prazo),0) > 180
     or coalesce(char_length(v_responsavel),0) > 180
     or coalesce(char_length(v_notas),0) > 4000
     or v_progresso not between 0 and 100 then
    raise exception using errcode = '22023', message = 'Um dos dados gerais da obra é inválido.';
  end if;
  if v_estado not in ('Orçamento','Aguardando adjudicação','Adjudicada','Em preparação','Em execução','Suspensa','Pagamento em atraso','Concluída','Em garantia','Arquivada') then
    raise exception using errcode = '22023', message = 'Estado da obra inválido.';
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
        raise exception using errcode = '22023', message = 'Descrição ou valor inválido numa parcela.';
      end if;
      v_parcela_base := (v_parcela->>'valor_base')::numeric;
      if v_parcela_base <= 0 or v_regime not in ('tributado','autoliquidacao','isento','nao_sujeito','outro') then
        raise exception using errcode = '22023', message = 'Valor ou tratamento de IVA inválido numa parcela.';
      end if;
      if v_regime = 'tributado' then
        if coalesce(v_parcela->>'taxa_iva','') !~ '^(6|23)([.]0{1,2})?$' then
          raise exception using errcode = '22023', message = 'A taxa tributada deve ser 6% ou 23%.';
        end if;
        v_parcela_taxa := (v_parcela->>'taxa_iva')::numeric;
        v_motivo := null;
      else
        v_parcela_taxa := 0;
        if coalesce(char_length(v_motivo),0) not between 5 and 240 then
          raise exception using errcode = '22023', message = 'Indique o motivo fiscal da parcela sem IVA.';
        end if;
      end if;
      v_base := v_base + v_parcela_base;
      v_iva := v_iva + case when v_regime='tributado' then round(v_parcela_base*v_parcela_taxa/100,2) else 0 end;
    end loop;
    v_taxa := null;
  else
    if coalesce(p_obra->>'valor_base','') !~ '^[0-9]+([.][0-9]{1,2})?$'
       or coalesce(p_obra->>'taxa_iva','') !~ '^(0|6|23)([.]0{1,2})?$' then
      raise exception using errcode = '22023', message = 'Valor base ou taxa de IVA inválida.';
    end if;
    v_base := (p_obra->>'valor_base')::numeric;
    v_taxa := (p_obra->>'taxa_iva')::numeric;
    if v_base < 0 then
      raise exception using errcode = '22023', message = 'O valor base não pode ser negativo.';
    end if;
    v_iva := round(v_base*v_taxa/100,2);
  end if;

  v_base := round(v_base,2);
  v_iva := round(v_iva,2);

  if p_obra_id is null then
    insert into public.obras (
      cliente_id,nome,morada,estado,valor,valor_contratado,taxa_iva,valor_iva,
      progresso,prazo,responsavel,notas
    ) values (
      v_cliente_id,v_nome,v_morada,v_estado,v_base,v_base,v_taxa,v_iva,
      v_progresso,v_prazo,v_responsavel,v_notas
    ) returning id into v_id;
  else
    update public.obras o
    set cliente_id=v_cliente_id,nome=v_nome,morada=v_morada,estado=v_estado,
        valor=v_base,valor_contratado=v_base,taxa_iva=v_taxa,valor_iva=v_iva,
        progresso=v_progresso,prazo=v_prazo,responsavel=v_responsavel,notas=v_notas
    where o.id=p_obra_id
    returning o.id into v_id;
    if v_id is null then
      raise exception using errcode = 'P0002', message = 'A obra já não existe ou não pode ser alterada.';
    end if;
  end if;

  delete from public.obra_iva_parcelas p where p.obra_id=v_id;

  if v_misto then
    for v_parcela, v_ordem in
      select item.value,item.ordinality-1
      from jsonb_array_elements(p_parcelas) with ordinality as item(value,ordinality)
    loop
      v_regime := v_parcela->>'regime_iva';
      insert into public.obra_iva_parcelas (
        obra_id,descricao,valor_base,regime_iva,taxa_iva,motivo_nao_liquidacao,ordem
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

revoke all on function public.guardar_obra_com_iva_parcelas(jsonb,jsonb,uuid) from public, anon;
grant execute on function public.guardar_obra_com_iva_parcelas(jsonb,jsonb,uuid) to authenticated;

comment on table public.obra_iva_parcelas is
  'Parcelas fiscais do valor contratado de uma obra com tratamentos de IVA diferentes.';
comment on column public.obra_iva_parcelas.motivo_nao_liquidacao is
  'Fundamento fiscal obrigatório quando o IVA não é liquidado.';

commit;
