-- Auditoria geral DISTAK ERP v2.8.
-- Restringe dados operacionais sensíveis e corrige índices indicados pelos advisors.

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (id=(select auth.uid()) or (select public.is_admin()));

-- Informação comercial e financeira é exclusiva da administração.
drop policy if exists clientes_select on public.clientes;
create policy clientes_select_admin on public.clientes for select to authenticated
using ((select public.is_admin()));
drop policy if exists orcamentos_select on public.orcamentos;
create policy orcamentos_select_admin on public.orcamentos for select to authenticated
using ((select public.is_admin()));
drop policy if exists custos_select on public.custos;
create policy custos_select_admin on public.custos for select to authenticated
using ((select public.is_admin()));
drop policy if exists pagamentos_select on public.pagamentos;
create policy pagamentos_select_admin on public.pagamentos for select to authenticated
using ((select public.is_admin()));

-- Funcionários veem apenas as obras que lhes foram atribuídas.
drop policy if exists obras_select on public.obras;
create policy obras_select_admin_ou_atribuido on public.obras for select to authenticated
using (
  (select public.is_admin()) or exists (
    select 1 from public.obra_utilizadores ou
    where ou.obra_id=obras.id and ou.user_id=(select auth.uid())
  )
);

drop policy if exists funcionarios_shared_account on public.funcionarios;
create policy funcionarios_select_admin on public.funcionarios for select to authenticated using ((select public.is_admin()));
create policy funcionarios_insert_admin on public.funcionarios for insert to authenticated with check ((select public.is_admin()));
create policy funcionarios_update_admin on public.funcionarios for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy funcionarios_delete_admin on public.funcionarios for delete to authenticated using ((select public.is_admin()));

drop policy if exists funcionario_horas_shared_account on public.funcionario_horas;
create policy funcionario_horas_select_admin on public.funcionario_horas for select to authenticated using ((select public.is_admin()));
create policy funcionario_horas_insert_admin on public.funcionario_horas for insert to authenticated with check ((select public.is_admin()));
create policy funcionario_horas_update_admin on public.funcionario_horas for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy funcionario_horas_delete_admin on public.funcionario_horas for delete to authenticated using ((select public.is_admin()));

drop policy if exists "Fotografias - leitura autenticada" on public.obra_fotografias;
drop policy if exists "Fotografias - inserir autenticado" on public.obra_fotografias;
drop policy if exists "Fotografias - atualizar autenticado" on public.obra_fotografias;
drop policy if exists "Fotografias - eliminar autenticado" on public.obra_fotografias;

create policy "Fotografias - leitura operacional" on public.obra_fotografias for select to authenticated
using (
  (select public.is_admin()) or exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.ativo=true
      and p.role in ('escritorio','encarregado','funcionario')
  )
);
create policy "Fotografias - inserir operacional" on public.obra_fotografias for insert to authenticated
with check (
  created_by=(select auth.uid()) and (
    (select public.is_admin()) or exists (
      select 1 from public.profiles p
      where p.id=(select auth.uid()) and p.ativo=true
        and p.role in ('escritorio','encarregado','funcionario')
    )
  )
);
create policy "Fotografias - atualizar proprio ou admin" on public.obra_fotografias for update to authenticated
using ((select public.is_admin()) or created_by=(select auth.uid()))
with check ((select public.is_admin()) or created_by=(select auth.uid()));
create policy "Fotografias - eliminar admin" on public.obra_fotografias for delete to authenticated
using ((select public.is_admin()));

drop policy if exists "Authenticated Upload 1k9yu2c_0" on storage.objects;
drop policy if exists "Authenticated Update 1k9yu2c_0" on storage.objects;
drop policy if exists "Authenticated Delete 1k9yu2c_0" on storage.objects;

create policy "Obras - upload operacional" on storage.objects for insert to authenticated
with check (
  bucket_id='distak-obras' and owner_id=((select auth.uid()))::text and (
    (select public.is_admin()) or exists (
      select 1 from public.profiles p
      where p.id=(select auth.uid()) and p.ativo=true
        and p.role in ('escritorio','encarregado','funcionario')
    )
  )
);
create policy "Obras - atualizar proprio ou admin" on storage.objects for update to authenticated
using (bucket_id='distak-obras' and ((select public.is_admin()) or owner_id=((select auth.uid()))::text))
with check (bucket_id='distak-obras' and ((select public.is_admin()) or owner_id=((select auth.uid()))::text));
create policy "Obras - eliminar admin" on storage.objects for delete to authenticated
using (bucket_id='distak-obras' and (select public.is_admin()));

create index if not exists cliente_comunicacoes_autor_id_idx on public.cliente_comunicacoes(autor_id);
create index if not exists cliente_documentos_inserido_por_idx on public.cliente_documentos(inserido_por);
create index if not exists cliente_notas_autor_id_idx on public.cliente_notas(autor_id);
create index if not exists obra_checklists_criado_por_idx on public.obra_checklists(criado_por);
create index if not exists obra_diarios_created_by_idx on public.obra_diarios(created_by);
create index if not exists obra_documentos_inserido_por_idx on public.obra_documentos(inserido_por);
create index if not exists obra_equipa_registos_criado_por_idx on public.obra_equipa_registos(criado_por);
create index if not exists obra_fotografias_created_by_idx on public.obra_fotografias(created_by);
create index if not exists obra_horas_criado_por_idx on public.obra_horas(criado_por);
create index if not exists obra_materiais_criado_por_idx on public.obra_materiais(criado_por);
create index if not exists obra_ocorrencias_criado_por_idx on public.obra_ocorrencias(criado_por);
create index if not exists obra_utilizadores_atribuido_por_idx on public.obra_utilizadores(atribuido_por);
create index if not exists obras_cliente_id_idx on public.obras(cliente_id);
create index if not exists orcamentos_cliente_id_idx on public.orcamentos(cliente_id);
create index if not exists orcamentos_obra_id_idx on public.orcamentos(obra_id);
create index if not exists pagamentos_obra_id_idx on public.pagamentos(obra_id);

-- Remove políticas ALL redundantes: as políticas específicas já cobrem as
-- quatro operações e evitam avaliações duplicadas por pedido.
drop policy if exists custos_admin on public.custos;
drop policy if exists orcamentos_admin on public.orcamentos;
drop policy if exists pagamentos_admin on public.pagamentos;

-- Mantém apenas um dos dois índices idênticos do contacto do cliente.
drop index if exists public.idx_cliente_contactos_cliente;
