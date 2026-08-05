create table if not exists public.campo_registos (
  id uuid primary key default gen_random_uuid(),
  referencia_local uuid not null default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  tipo text not null check (tipo in ('diario','horas','material','ocorrencia','fotografia')),
  data date not null default current_date,
  titulo text not null check (char_length(titulo) between 2 and 180),
  detalhe text not null check (char_length(detalhe) between 1 and 3000),
  observacoes text check (observacoes is null or char_length(observacoes) <= 1500),
  horas numeric(5,2) check (horas is null or (horas > 0 and horas <= 24)),
  foto_path text,
  estado text not null default 'pendente' check (estado in ('pendente','aprovado','rejeitado')),
  criado_por uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  revisto_por uuid references public.profiles(id) on delete set null,
  revisto_em timestamptz,
  motivo_revisao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (criado_por, referencia_local),
  check (
    (estado='pendente' and revisto_por is null and revisto_em is null)
    or (estado in ('aprovado','rejeitado') and revisto_por is not null and revisto_em is not null)
  ),
  check (foto_path is null or foto_path like ('obras/' || obra_id::text || '/%'))
);

alter table public.campo_registos enable row level security;
revoke all on public.campo_registos from anon, authenticated;
grant select,insert,update on public.campo_registos to authenticated;

create index if not exists campo_registos_obra_data_idx on public.campo_registos(obra_id,data desc);
create index if not exists campo_registos_criador_data_idx on public.campo_registos(criado_por,data desc);
create index if not exists campo_registos_estado_data_idx on public.campo_registos(estado,data desc);

create policy campo_registos_select on public.campo_registos
for select to authenticated
using (
  (select public.is_admin())
  or (criado_por=(select auth.uid()) and (select private.can_access_obra(obra_id)))
);

create policy campo_registos_insert on public.campo_registos
for insert to authenticated
with check (
  criado_por=(select auth.uid())
  and estado='pendente'
  and revisto_por is null
  and revisto_em is null
  and (select private.can_access_obra(obra_id))
);

create policy campo_registos_update on public.campo_registos
for update to authenticated
using (
  (select public.is_admin())
  or (
    criado_por=(select auth.uid())
    and estado='pendente'
    and (select private.can_access_obra(obra_id))
  )
)
with check (
  (select public.is_admin())
  or (
    criado_por=(select auth.uid())
    and estado='pendente'
    and revisto_por is null
    and revisto_em is null
    and (select private.can_access_obra(obra_id))
  )
);

-- O caminho das fotografias segue obras/<uuid-da-obra>/<categoria>/<ficheiro>.
-- A equipa só pode carregar/alterar ficheiros das obras que lhe foram atribuídas.
drop policy if exists "Obras - upload operacional" on storage.objects;
drop policy if exists "Obras - atualizar proprio ou admin" on storage.objects;

create policy "Obras - upload por obra atribuida" on storage.objects
for insert to authenticated
with check (
  bucket_id='distak-obras'
  and owner_id=((select auth.uid()))::text
  and (storage.foldername(name))[1]='obras'
  and case
    when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (select private.can_access_obra(((storage.foldername(name))[2])::uuid))
    else false
  end
);

create policy "Obras - atualizar por obra atribuida" on storage.objects
for update to authenticated
using (
  bucket_id='distak-obras'
  and (
    (select public.is_admin())
    or (
      owner_id=((select auth.uid()))::text
      and (storage.foldername(name))[1]='obras'
      and case
        when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (select private.can_access_obra(((storage.foldername(name))[2])::uuid))
        else false
      end
    )
  )
)
with check (
  bucket_id='distak-obras'
  and (
    (select public.is_admin())
    or (
      owner_id=((select auth.uid()))::text
      and (storage.foldername(name))[1]='obras'
      and case
        when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (select private.can_access_obra(((storage.foldername(name))[2])::uuid))
        else false
      end
    )
  )
);

comment on table public.campo_registos is 'Registos móveis da equipa em campo, com sincronização idempotente e revisão administrativa.';
comment on column public.campo_registos.referencia_local is 'Identificador criado no dispositivo para impedir duplicados após reconexão.';
