create table if not exists clientes (id uuid primary key default gen_random_uuid(), nome text, nif text, telefone text, email text, morada text, created_at timestamp default now());
create table if not exists obras (id uuid primary key default gen_random_uuid(), cliente_id uuid, nome text, morada text, estado text, valor numeric, created_at timestamp default now());
create table if not exists orcamentos (id uuid primary key default gen_random_uuid(), obra_id uuid, numero text, descricao text, valor numeric, iva numeric, created_at timestamp default now());
create table if not exists funcionarios (id uuid primary key default gen_random_uuid(), nome text, contacto text, seguro text, salario_dia numeric, created_at timestamp default now());
