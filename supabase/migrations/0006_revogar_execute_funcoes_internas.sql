-- registrar_auditoria() é chamada só pelo mecanismo de trigger (NEW/OLD),
-- nunca precisa ser chamada diretamente via RPC — revogar o EXECUTE público
-- não quebra os triggers (trigger não depende de grant de EXECUTE do papel).
revoke execute on function registrar_auditoria() from public, anon, authenticated;

-- tem_permissao() PRECISA continuar executável por authenticated/anon, porque
-- é chamada dentro das próprias policies de RLS (a checagem roda com o papel
-- de quem fez a consulta). Não dá para revogar sem quebrar o controle de acesso.
-- Fica como aviso aceito no Supabase Security Advisor (WARN, não é uma falha
-- real: para 'anon', auth.uid() é sempre nulo, então a função sempre retorna
-- falso; a função nunca retorna dados, só um booleano de permissão).
