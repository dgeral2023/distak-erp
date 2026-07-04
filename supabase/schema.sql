-- DISTAK ERP schema base
create table if not exists public.profiles (
  id uuid primary key,
  email text unique,
  nome text,
  role text default 'funcionario',
  ativo boolean default true,
  created_at timestamptz default now()
);
create table if not exists public.obras (
  id bigserial primary key,
  cliente text,
  morada text,
  estado text,
  responsavel text,
  valor numeric default 0,
  created_at timestamptz default now()
);
