-- Seed de parâmetros reais (não são dados pessoais): papéis, permissões por módulo,
-- evento 2026 e categorias de contribuição. Valores vêm de CLAUDE.md / REQUISITOS.md
-- do pacote de referência; nada aqui é inventado.

insert into eventos (ano, nome, data_evento, local, pessoas_ano_anterior, pessoas_novas_estimadas, ativo)
values (2026, 'Confraternização CAGE 2026', '2026-12-15',
        'Sede campestre da AFOCEFE, Av. Guaíba, nº 11.978', 145, 30, true);

insert into categorias_contribuicao (evento_id, codigo, nome, valor)
select id, 'AUDITOR', 'Auditor', 40.00 from eventos where ano = 2026
union all
select id, 'DEMAIS', 'Analistas Tributários, Analistas da SPGG, Consultores, CCs e Ex-CEE', 25.00 from eventos where ano = 2026
union all
select id, 'ISENTO', 'Contratados e estagiários', 0.00 from eventos where ano = 2026;

insert into papeis (codigo, nome_exibicao) values
  ('admin_edicao', 'Administração'),
  ('admin_leitura', 'Visualização administrativa'),
  ('tesouraria', 'Tesouraria'),
  ('comprovantes', 'Comprovantes'),
  ('responsavel_frente', 'Responsável de frente'),
  ('colega', 'Colega');

-- admin_edicao: tudo, leitura e escrita, em todos os módulos
insert into permissoes_papel (papel_id, modulo, pode_ler, pode_escrever, escopo)
select id, modulo, true, true, 'todos'
from papeis, unnest(array[
  'pessoas','presenca','pagamentos','comprovantes_pagamento','despesas','comprovantes_despesa',
  'orcamento','patrocinadores','valores_patrocinio','tarefas','prestacao_contas','exportacoes'
]) as modulo
where codigo = 'admin_edicao';

-- admin_leitura: vê tudo, não edita nada
insert into permissoes_papel (papel_id, modulo, pode_ler, pode_escrever, escopo)
select id, modulo, true, false, 'todos'
from papeis, unnest(array[
  'pessoas','presenca','pagamentos','comprovantes_pagamento','despesas','comprovantes_despesa',
  'orcamento','patrocinadores','valores_patrocinio','tarefas','prestacao_contas','exportacoes'
]) as modulo
where codigo = 'admin_leitura';

-- tesouraria: registra/confere pagamentos, vê patrocínios recebidos (com valor)
insert into permissoes_papel (papel_id, modulo, pode_ler, pode_escrever, escopo)
select id, modulo, pode_ler, pode_escrever, 'todos'
from papeis, (values
  ('pessoas', true, false),
  ('pagamentos', true, true),
  ('comprovantes_pagamento', true, true),
  ('patrocinadores', true, false),
  ('valores_patrocinio', true, false),
  ('exportacoes', true, false)
) as m(modulo, pode_ler, pode_escrever)
where codigo = 'tesouraria';

-- comprovantes (Audrey): anexa/confere comprovantes de pagamento e nota fiscal;
-- SEM acesso a valores de patrocínio (nem leitura do módulo 'patrocinadores' em si,
-- por ora — pode ser ajustado depois se precisar ver que o patrocinador existe).
insert into permissoes_papel (papel_id, modulo, pode_ler, pode_escrever, escopo)
select id, modulo, pode_ler, pode_escrever, 'todos'
from papeis, (values
  ('pessoas', true, false),
  ('pagamentos', true, false),
  ('comprovantes_pagamento', true, true),
  ('despesas', true, false),
  ('comprovantes_despesa', true, true)
) as m(modulo, pode_ler, pode_escrever)
where codigo = 'comprovantes';

-- responsavel_frente: só o próprio grupo (tarefas/despesas), escopo 'proprio'
insert into permissoes_papel (papel_id, modulo, pode_ler, pode_escrever, escopo)
select id, modulo, true, true, 'proprio'
from papeis, unnest(array['tarefas','despesas','comprovantes_despesa']) as modulo
where codigo = 'responsavel_frente';

-- colega: só a própria situação, escopo 'proprio'
insert into permissoes_papel (papel_id, modulo, pode_ler, pode_escrever, escopo)
select id, modulo, pode_ler, pode_escrever, 'proprio'
from papeis, (values
  ('presenca', true, true),
  ('pagamentos', true, false),
  ('comprovantes_pagamento', true, true) -- anexa o próprio comprovante
) as m(modulo, pode_ler, pode_escrever)
where codigo = 'colega';
