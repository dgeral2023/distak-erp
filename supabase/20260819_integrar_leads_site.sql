-- Pedidos comerciais recebidos pelo formulário público do portfólio.
create table if not exists public.leads_site (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 100),
  telefone text not null check (char_length(telefone) between 5 and 30),
  email text not null check (char_length(email) between 5 and 160),
  localidade text not null check (char_length(localidade) between 2 and 100),
  servico text not null check (char_length(servico) between 2 and 100),
  prazo text not null default 'A combinar' check (char_length(prazo) between 2 and 80),
  mensagem text not null check (char_length(mensagem) between 3 and 2000),
  origem text not null default 'Site Distak',
  estado text not null default 'Novo' check (estado in ('Novo','Contactado','Qualificado','Convertido','Arquivado')),
  consentido_em timestamptz not null default now(),
  recebido_em timestamptz not null default now(),
  contactado_em timestamptz,
  convertido_em timestamptz,
  cliente_id uuid references public.clientes(id) on delete set null,
  responsavel_id uuid references public.profiles(id) on delete set null,
  notas_internas text check (notas_internas is null or char_length(notas_internas) <= 2000),
  ip_hash text
);

create index if not exists leads_site_estado_recebido_idx on public.leads_site(estado, recebido_em desc);
create index if not exists leads_site_email_idx on public.leads_site(lower(email));
create index if not exists leads_site_telefone_idx on public.leads_site(telefone);
create index if not exists leads_site_cliente_id_idx on public.leads_site(cliente_id);
create index if not exists leads_site_responsavel_id_idx on public.leads_site(responsavel_id);

alter table public.leads_site enable row level security;
revoke all on public.leads_site from anon;
grant select, update, delete on public.leads_site to authenticated;

drop policy if exists leads_site_select_admin on public.leads_site;
drop policy if exists leads_site_update_admin on public.leads_site;
drop policy if exists leads_site_delete_admin on public.leads_site;
create policy leads_site_select_admin on public.leads_site for select to authenticated using (public.is_admin());
create policy leads_site_update_admin on public.leads_site for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy leads_site_delete_admin on public.leads_site for delete to authenticated using (public.is_admin());

create or replace function public.converter_lead_site(p_lead_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_lead public.leads_site%rowtype;
  v_cliente_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Sem autorização';
  end if;

  select * into v_lead from public.leads_site where id = p_lead_id for update;
  if not found then raise exception 'Lead não encontrado'; end if;
  if v_lead.cliente_id is not null then return v_lead.cliente_id; end if;

  select id into v_cliente_id
  from public.clientes
  where (v_lead.email <> '' and lower(email) = lower(v_lead.email))
     or (v_lead.telefone <> '' and telefone = v_lead.telefone)
  order by criado_em asc nulls last
  limit 1;

  if v_cliente_id is null then
    insert into public.clientes(nome,email,telefone,localidade,tipo,estado,observacoes)
    values (v_lead.nome,lower(v_lead.email),v_lead.telefone,v_lead.localidade,'Particular','Potencial',
      concat('Origem: Site Distak. Serviço: ',v_lead.servico,'. Prazo: ',v_lead.prazo,'. Pedido: ',v_lead.mensagem))
    returning id into v_cliente_id;
  end if;

  update public.leads_site
  set estado='Convertido', cliente_id=v_cliente_id, convertido_em=now()
  where id=p_lead_id;
  return v_cliente_id;
end;
$$;

revoke all on function public.converter_lead_site(uuid) from public, anon;
grant execute on function public.converter_lead_site(uuid) to authenticated;

