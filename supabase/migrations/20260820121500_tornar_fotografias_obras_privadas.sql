-- Aplicar apenas depois de publicar o frontend que usa URLs assinados.

update storage.buckets
set public = false
where id = 'distak-obras';

-- A política SELECT autenticada foi criada na migração anterior.
