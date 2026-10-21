-- A lista de tarefas sugeridas de 2025 tem responsáveis em texto livre, às vezes
-- mais de uma pessoa (ex.: "Marcio / Laecio") ou nome incompleto — não dá pra
-- vincular com segurança a uma única pessoa cadastrada sem arriscar erro.
-- Guardamos o texto original e deixamos o vínculo a uma pessoa (responsavel_pessoa_id)
-- como campo à parte, preenchido manualmente quando for o caso.
alter table tarefas add column responsavel_texto text;
