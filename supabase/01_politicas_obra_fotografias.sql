-- DISTAK ERP v2.4 — Fotografias
-- Executar uma vez no SQL Editor. É idempotente.

alter table public.obra_fotografias enable row level security;

create index if not exists obra_fotografias_obra_idx
on public.obra_fotografias(obra_id);

create index if not exists obra_fotografias_categoria_idx
on public.obra_fotografias(categoria);

drop policy if exists "Fotografias - leitura autenticada" on public.obra_fotografias;
drop policy if exists "Fotografias - inserir autenticado" on public.obra_fotografias;
drop policy if exists "Fotografias - atualizar autenticado" on public.obra_fotografias;
drop policy if exists "Fotografias - eliminar autenticado" on public.obra_fotografias;

create policy "Fotografias - leitura autenticada"
on public.obra_fotografias
for select to authenticated
using (true);

create policy "Fotografias - inserir autenticado"
on public.obra_fotografias
for insert to authenticated
with check (auth.uid() is not null);

create policy "Fotografias - atualizar autenticado"
on public.obra_fotografias
for update to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "Fotografias - eliminar autenticado"
on public.obra_fotografias
for delete to authenticated
using (auth.uid() is not null);

-- Verificação final
select policyname, cmd, roles
from pg_policies
where schemaname='public' and tablename='obra_fotografias'
order by cmd, policyname;
