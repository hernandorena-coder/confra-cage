-- Guarda se a prestação de contas do evento já foi fechada, para a tela
-- de Prestação de Contas poder travar/destravar o fechamento.
alter table eventos add column prestacao_contas_fechada boolean not null default false;
alter table eventos add column prestacao_contas_fechada_em timestamptz;
alter table eventos add column prestacao_contas_fechada_por uuid references auth.users(id);
