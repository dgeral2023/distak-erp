-- Impede clientes duplicados pelo mesmo NIF, ignorando espaços e pontuação.
-- Valores vazios continuam permitidos para contactos ainda sem identificação fiscal.
create unique index if not exists clientes_nif_normalizado_unique_idx
on public.clientes ((regexp_replace(nif, '\D', '', 'g')))
where nullif(regexp_replace(nif, '\D', '', 'g'), '') is not null;
