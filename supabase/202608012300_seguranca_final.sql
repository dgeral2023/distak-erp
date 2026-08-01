-- Endurecimento final sem alterar o acesso dos utilizadores autenticados.

alter view public.v_clientes_crm_resumo set (security_invoker = true);

revoke all privileges on table
  public.cliente_comunicacoes,
  public.cliente_contactos,
  public.cliente_documentos,
  public.cliente_moradas,
  public.cliente_notas,
  public.clientes,
  public.custo_pagamentos,
  public.custos,
  public.funcionario_horas,
  public.funcionarios,
  public.obra_checklists,
  public.obra_diarios,
  public.obra_documentos,
  public.obra_equipa_registos,
  public.obra_fotografias,
  public.obra_horas,
  public.obra_materiais,
  public.obra_ocorrencias,
  public.obra_utilizadores,
  public.obras,
  public.orcamento_itens,
  public.orcamentos,
  public.pagamentos,
  public.profiles,
  public.v_clientes_crm_resumo
from anon;

revoke all privileges on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;

grant select on table public.v_clientes_crm_resumo to authenticated;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;
