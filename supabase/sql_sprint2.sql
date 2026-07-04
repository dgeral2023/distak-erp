-- DISTAK ERP Sprint 2 - Estrutura e permissões

-- Extensão para UUID se necessário
create extension if not exists "pgcrypto";

-- Garantir colunas em clientes
alter table public.clientes add column if not exists telefone text;
alter table public.clientes add column if not exists criado_em timestamptz default now();

-- Garantir colunas em obras
alter table public.obras add column if not exists progresso integer default 0;
alter table public.obras add column if not exists responsavel text;
alter table public.obras add column if not exists criado_em timestamptz default now();

-- Criar tabela orcamentos se não existir
create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  numero text,
  descricao text,
  valor numeric default 0,
  estado text default 'Rascunho',
  criado_em timestamptz default now()
);

-- Criar tabela custos se não existir
create table if not exists public.custos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras(id) on delete set null,
  categoria text,
  descricao text,
  valor numeric default 0,
  data date default current_date,
  criado_em timestamptz default now()
);

-- Criar tabela pagamentos se não existir
create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  descricao text,
  valor numeric default 0,
  metodo text,
  data date default current_date,
  criado_em timestamptz default now()
);

-- RLS
alter table public.clientes enable row level security;
alter table public.obras enable row level security;
alter table public.orcamentos enable row level security;
alter table public.custos enable row level security;
alter table public.pagamentos enable row level security;

-- CLIENTES
DROP POLICY IF EXISTS clientes_select ON public.clientes;
DROP POLICY IF EXISTS clientes_insert_admin ON public.clientes;
DROP POLICY IF EXISTS clientes_update_admin ON public.clientes;
DROP POLICY IF EXISTS clientes_delete_admin ON public.clientes;
CREATE POLICY clientes_select ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY clientes_insert_admin ON public.clientes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY clientes_update_admin ON public.clientes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY clientes_delete_admin ON public.clientes FOR DELETE TO authenticated USING (public.is_admin());

-- OBRAS
DROP POLICY IF EXISTS obras_select ON public.obras;
DROP POLICY IF EXISTS obras_insert_admin ON public.obras;
DROP POLICY IF EXISTS obras_update_admin ON public.obras;
DROP POLICY IF EXISTS obras_delete_admin ON public.obras;
CREATE POLICY obras_select ON public.obras FOR SELECT TO authenticated USING (true);
CREATE POLICY obras_insert_admin ON public.obras FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY obras_update_admin ON public.obras FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY obras_delete_admin ON public.obras FOR DELETE TO authenticated USING (public.is_admin());

-- ORCAMENTOS
DROP POLICY IF EXISTS orcamentos_select ON public.orcamentos;
DROP POLICY IF EXISTS orcamentos_insert_admin ON public.orcamentos;
DROP POLICY IF EXISTS orcamentos_update_admin ON public.orcamentos;
DROP POLICY IF EXISTS orcamentos_delete_admin ON public.orcamentos;
CREATE POLICY orcamentos_select ON public.orcamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY orcamentos_insert_admin ON public.orcamentos FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY orcamentos_update_admin ON public.orcamentos FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY orcamentos_delete_admin ON public.orcamentos FOR DELETE TO authenticated USING (public.is_admin());

-- CUSTOS
DROP POLICY IF EXISTS custos_select ON public.custos;
DROP POLICY IF EXISTS custos_insert_admin ON public.custos;
DROP POLICY IF EXISTS custos_update_admin ON public.custos;
DROP POLICY IF EXISTS custos_delete_admin ON public.custos;
CREATE POLICY custos_select ON public.custos FOR SELECT TO authenticated USING (true);
CREATE POLICY custos_insert_admin ON public.custos FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY custos_update_admin ON public.custos FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY custos_delete_admin ON public.custos FOR DELETE TO authenticated USING (public.is_admin());

-- PAGAMENTOS
DROP POLICY IF EXISTS pagamentos_select ON public.pagamentos;
DROP POLICY IF EXISTS pagamentos_insert_admin ON public.pagamentos;
DROP POLICY IF EXISTS pagamentos_update_admin ON public.pagamentos;
DROP POLICY IF EXISTS pagamentos_delete_admin ON public.pagamentos;
CREATE POLICY pagamentos_select ON public.pagamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY pagamentos_insert_admin ON public.pagamentos FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY pagamentos_update_admin ON public.pagamentos FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY pagamentos_delete_admin ON public.pagamentos FOR DELETE TO authenticated USING (public.is_admin());
