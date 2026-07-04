-- DISTAK ERP - base inicial de perfis e permissões
create type if not exists user_role as enum ('admin','administrador','escritorio','encarregado','funcionario','cliente');

create table if not exists public.profiles (
  id uuid primary key,
  email text unique not null,
  nome text,
  role user_role not null default 'funcionario',
  ativo boolean default true,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy if not exists "perfil pode ver o proprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy if not exists "admin pode ver todos os perfis"
  on public.profiles for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','administrador')));
