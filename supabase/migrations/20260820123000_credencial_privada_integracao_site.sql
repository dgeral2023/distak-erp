-- Credencial privada do site: apenas o hash é persistido no PostgreSQL.

create table if not exists private.integration_secret_hashes (
  name text primary key,
  secret_hash bytea not null,
  updated_at timestamptz not null default now()
);

alter table private.integration_secret_hashes enable row level security;
revoke all on private.integration_secret_hashes from public, anon, authenticated;

insert into private.integration_secret_hashes (name, secret_hash, updated_at)
values ('site_leads', decode('0dfd0ff5872188c832073d9bd176f3bffc01a4edc429251bafb5ea8402707fe3', 'hex'), now())
on conflict (name) do update
set secret_hash = excluded.secret_hash,
    updated_at = excluded.updated_at;

create or replace function public.verify_integration_secret(p_name text, p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    char_length(p_token) >= 43
    and exists (
      select 1
      from private.integration_secret_hashes s
      where s.name = p_name
        and s.secret_hash = sha256(convert_to(p_token, 'UTF8'))
    ),
    false
  );
$$;

revoke all on function public.verify_integration_secret(text, text) from public, anon, authenticated;
grant execute on function public.verify_integration_secret(text, text) to service_role;

