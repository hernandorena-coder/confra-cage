-- Schema inicial: plataforma de gestão da Confraternização CAGE
-- Convenção: tabelas de conteúdo do evento levam evento_id para permitir reaproveitar
-- a estrutura em anos seguintes (ver CLAUDE.md do pacote de referência, seção "Decisões em aberto").

create extension if not exists "pgcrypto";

-- =========================================================
-- Evento e parâmetros (parametrizável por ano)
-- =========================================================

create table eventos (
  id uuid primary key default gen_random_uuid(),
  ano int not null unique,
  nome text not null,
  data_evento date,
  local text,
  prazo_presenca date,
  prazo_pagamento date,
  pessoas_ano_anterior int, -- base para o fator de projeção de consumo (ex.: 145 em 2025)
  pessoas_novas_estimadas int, -- ex.: 30 auditores novos em 2026
  folga_pct numeric default 0, -- folga de orçamento, em %
  reajuste_pct numeric default 0, -- reajuste geral de preços, em %
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table categorias_contribuicao (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  codigo text not null, -- 'AUDITOR' | 'DEMAIS' | 'ISENTO'
  nome text not null,
  valor numeric not null default 0,
  unique (evento_id, codigo)
);

-- =========================================================
-- Pessoas
-- =========================================================

create table pessoas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  nome text not null,
  area text,
  categoria_id uuid references categorias_contribuicao(id),
  email text,
  user_id uuid references auth.users(id), -- preenchido quando a pessoa cria login
  origem_cadastro text not null default 'manual', -- 'importado_csv' | 'manual'
  possivel_duplicata_de uuid references pessoas(id), -- sinalização, nunca resolvida automaticamente
  observacao text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now()
);

create index idx_pessoas_evento on pessoas(evento_id);
create index idx_pessoas_user on pessoas(user_id);

-- =========================================================
-- Papéis e permissões (perfis como dados, não hardcoded)
-- =========================================================

create table papeis (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique, -- admin_edicao | admin_leitura | tesouraria | comprovantes | responsavel_frente | colega
  nome_exibicao text not null
);

create table permissoes_papel (
  id uuid primary key default gen_random_uuid(),
  papel_id uuid not null references papeis(id) on delete cascade,
  modulo text not null, -- pessoas | presenca | pagamentos | comprovantes_pagamento | despesas | comprovantes_despesa
                         -- | orcamento | patrocinadores | valores_patrocinio | tarefas | prestacao_contas | exportacoes
  pode_ler boolean not null default false,
  pode_escrever boolean not null default false,
  escopo text not null default 'todos', -- 'todos' | 'proprio'
  unique (papel_id, modulo)
);

create table usuarios_papeis (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  evento_id uuid not null references eventos(id) on delete cascade,
  papel_id uuid not null references papeis(id),
  pessoa_id uuid references pessoas(id), -- liga ao próprio cadastro (colega / responsável de frente)
  grupo_responsavel text, -- ex.: 'Churrasco', para responsavel_frente filtrar suas tarefas/despesas
  criado_em timestamptz not null default now(),
  unique (usuario_id, evento_id, papel_id)
);

create index idx_usuarios_papeis_usuario on usuarios_papeis(usuario_id);

-- =========================================================
-- Presença
-- =========================================================

create table presencas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  confirmado boolean not null default false,
  confirmado_em timestamptz,
  origem text not null default 'autoconfirmacao', -- 'autoconfirmacao' | 'admin'
  unique (evento_id, pessoa_id)
);

-- =========================================================
-- Pagamentos e comprovantes
-- =========================================================

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  valor_devido numeric not null default 0, -- congelado no momento (categoria pode mudar depois)
  valor_recebido numeric,
  status text not null default 'pendente', -- 'pendente' | 'pago' | 'isento'
  data_pagamento date,
  conferido_por uuid references auth.users(id),
  conferido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (evento_id, pessoa_id)
);

create table comprovantes_pagamento (
  id uuid primary key default gen_random_uuid(),
  pagamento_id uuid not null references pagamentos(id) on delete cascade,
  storage_path text not null,
  tipo_arquivo text,
  contem_dado_sensivel boolean not null default false, -- flag manual (ex.: CPF visível no print do PIX)
  enviado_por uuid references auth.users(id),
  enviado_em timestamptz not null default now()
);

-- =========================================================
-- Despesas e comprovantes
-- =========================================================

create table categorias_orcamento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  nome text not null, -- ex.: 'Alimentos e bebidas', 'Premiação atividades esportivas e jogos'
  unique (evento_id, nome)
);

create table despesas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  item text not null,
  valor numeric not null default 0,
  categoria_orcamento_id uuid references categorias_orcamento(id),
  grupo_responsavel text, -- ex.: 'Churrasco' — permite ao responsável de frente ver/editar só suas compras
  tipo_documento text, -- 'DANFE' | 'Cupom fiscal' | 'NFC-e' | 'não fiscal' | ...
  numero_documento text,
  pago_por_pessoa_id uuid references pessoas(id),
  pago_por_texto text, -- quando quem pagou não está cadastrado como pessoa
  status_comprovante text not null default 'pendente', -- 'recebido' | 'pendente' | 'fora_do_quadro' | 'nao_fiscal'
  divergencia_observada text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create table comprovantes_despesa (
  id uuid primary key default gen_random_uuid(),
  despesa_id uuid not null references despesas(id) on delete cascade,
  storage_path text not null,
  enviado_por uuid references auth.users(id),
  enviado_em timestamptz not null default now()
);

-- =========================================================
-- Consumo / estimativa de orçamento (lógica do protótipo)
-- =========================================================

create table itens_consumo (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  grupo text not null, -- ex.: 'Carnes e proteínas'
  item text not null,
  quantidade_referencia numeric,
  unidade text, -- 'kg' | 'L' | 'un' | 'm'
  valor_referencia numeric,
  categoria_orcamento_id uuid references categorias_orcamento(id),
  escala_com_pessoas boolean not null default true,
  fora_do_quadro boolean not null default false,
  sem_nota boolean not null default false,
  fonte text
);

-- =========================================================
-- Patrocinadores
-- =========================================================

create table patrocinadores (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  nome text not null,
  contato text,
  status text not null default 'a_solicitar', -- a_solicitar | solicitado | confirmado | recebido | recusado
  valor numeric,
  recibo_emitido boolean not null default false,
  recibo_emitido_em date,
  prestacao_contas_enviada boolean not null default false,
  prestacao_contas_enviada_em date,
  observacao text
);

create table historico_patrocinio (
  id uuid primary key default gen_random_uuid(),
  patrocinador_id uuid not null references patrocinadores(id) on delete cascade,
  data timestamptz not null default now(),
  descricao text not null,
  registrado_por uuid references auth.users(id)
);

-- =========================================================
-- Tarefas
-- =========================================================

create table tarefas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  grupo text not null, -- ex.: 'Patrocínios', 'Churrasco', 'Bingo'
  tarefa text not null,
  responsavel_pessoa_id uuid references pessoas(id),
  prazo date,
  status text not null default 'pendente' -- 'pendente' | 'em_andamento' | 'concluida'
);

-- =========================================================
-- Auditoria e acesso (LGPD)
-- =========================================================

create table log_auditoria (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references eventos(id) on delete cascade,
  tabela_afetada text not null,
  registro_id uuid not null,
  acao text not null, -- 'insert' | 'update' | 'delete'
  campo_alterado text,
  valor_anterior text,
  valor_novo text,
  usuario_id uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create table log_acessos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id),
  recurso_acessado text not null, -- ex.: 'comprovante_pagamento:<id>'
  criado_em timestamptz not null default now()
);
