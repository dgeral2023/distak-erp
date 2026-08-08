-- DISTAK ERP v3.8: mínimo privilégio na tabela de perfis.
-- Remove inclusive TRUNCATE herdado; a leitura continua protegida por RLS.
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
