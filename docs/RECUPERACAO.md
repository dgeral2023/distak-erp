# Recuperação segura do DISTAK ERP

## Objetivo

A exportação administrativa cria um ficheiro JSON local, somente de leitura, com os registos que o utilizador administrador já pode consultar. A exportação não elimina, altera, paga, restaura ou transmite dados.

## Antes de uma alteração importante

1. Abrir **Relatórios e exportações** com uma conta administradora.
2. Selecionar **Exportar cópia de segurança** e confirmar o aviso de confidencialidade.
3. Guardar o ficheiro num local privado e protegido. Não enviar por correio eletrónico nem colocar em serviços externos sem autorização específica.
4. Confirmar que o ficheiro contém `format: distak-erp-backup`, `version`, contagens e a verificação `SHA-256`.
5. Usar **Verificar cópia** e confirmar a prontidão, a idade, os identificadores duplicados e as ligações entre os registos.
6. Se surgir **revisão necessária**, corrigir ou documentar cada aviso antes de preparar uma recuperação.
7. Manter também o identificador do commit Git e o número da migração Supabase associados à versão.

## Limites da exportação

- O ficheiro representa os dados carregados e autorizados na sessão administrativa.
- Ficheiros binários do Storage, palavras-passe, sessões e chaves não são incluídos.
- A exportação não substitui os backups geridos da base de dados e do Storage.
- A presença do checksum deteta alterações acidentais; não encripta o conteúdo.
- O estado **preparada** é uma verificação estrutural de prontidão, não uma autorização para restaurar nem uma garantia sobre ficheiros binários externos.

## Recuperação

Uma recuperação deve ser preparada primeiro num ambiente de teste e executada apenas após autorização explícita. Não existe importação automática no frontend. Antes de qualquer escrita, devem ser confirmados o projeto Supabase, a versão do esquema, as contagens, as chaves estrangeiras, a prontidão e o checksum. Nunca restaurar sobre produção sem uma cópia atual e um plano de reversão.

## Incidente

Se houver perda, acesso indevido ou corrupção: interromper novas alterações, preservar logs e exportações, registar hora e utilizadores afetados, validar o alcance e só depois preparar a recuperação. Não apagar evidências nem reutilizar chaves potencialmente comprometidas.
