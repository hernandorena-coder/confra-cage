-- As tabelas foram criadas sem herdar os GRANTs padrão do Supabase para
-- anon/authenticated (só o superuser tinha acesso). RLS só é avaliada DEPOIS
-- do GRANT de tabela permitir a operação — sem isso, toda query falhava com
-- "permission denied" antes mesmo de checar as policies.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

-- garante que tabelas futuras (ex.: em 2027) já nasçam com o mesmo acesso
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
