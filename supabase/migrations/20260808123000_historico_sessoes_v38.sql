-- DISTAK ERP v3.8: eventos mínimos de autenticação no histórico protegido existente.
-- Não são guardados tokens, palavras-passe, IP, user-agent ou identificadores do dispositivo.
alter table public.atividades_sistema
  drop constraint if exists atividades_sistema_acao_check;

alter table public.atividades_sistema
  add constraint atividades_sistema_acao_check
  check (acao in ('criou','atualizou','eliminou','atribuiu','concluiu','entrou','saiu','recuperou_acesso'));

create index if not exists atividades_sistema_sessao_data_idx
  on public.atividades_sistema(criado_em desc)
  where entidade = 'sessao';

comment on index public.atividades_sistema_sessao_data_idx is
  'Apoia a consulta administrativa do histórico de autenticação sem guardar dados do dispositivo.';
