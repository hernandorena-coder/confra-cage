-- Row Level Security: única fonte de verdade de controle de acesso.
-- Toda policy chama tem_permissao(), que lê usuarios_papeis + permissoes_papel.
-- Evoluir/criar um novo perfil (ex.: "visualização administrativa") é inserir linhas
-- nessas tabelas, nunca reescrever policy.

create or replace function tem_permissao(
  p_evento_id uuid,
  p_modulo text,
  p_escrita boolean,
  p_pessoa_id uuid default null,
  p_grupo text default null
) returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from usuarios_papeis up
    join permissoes_papel pp on pp.papel_id = up.papel_id
    where up.usuario_id = auth.uid()
      and up.evento_id = p_evento_id
      and pp.modulo = p_modulo
      and (case when p_escrita then pp.pode_escrever else pp.pode_ler end)
      and (
        pp.escopo = 'todos'
        or (
          pp.escopo = 'proprio' and (
            (p_pessoa_id is not null and up.pessoa_id = p_pessoa_id)
            or (p_grupo is not null and up.grupo_responsavel = p_grupo)
          )
        )
      )
  );
$$;

-- habilita RLS em todas as tabelas de conteúdo
alter table eventos enable row level security;
alter table categorias_contribuicao enable row level security;
alter table pessoas enable row level security;
alter table papeis enable row level security;
alter table permissoes_papel enable row level security;
alter table usuarios_papeis enable row level security;
alter table presencas enable row level security;
alter table pagamentos enable row level security;
alter table comprovantes_pagamento enable row level security;
alter table categorias_orcamento enable row level security;
alter table despesas enable row level security;
alter table comprovantes_despesa enable row level security;
alter table itens_consumo enable row level security;
alter table patrocinadores enable row level security;
alter table historico_patrocinio enable row level security;
alter table tarefas enable row level security;
alter table log_auditoria enable row level security;
alter table log_acessos enable row level security;

-- ---------------------------------------------------------
-- eventos / categorias_contribuicao / papeis / permissoes_papel:
-- leitura liberada a qualquer usuário autenticado (são parâmetros públicos
-- dentro da organização, não dados pessoais); escrita só quem tem 'administracao_usuarios'
-- ou módulo correspondente com pode_escrever.
-- ---------------------------------------------------------

create policy eventos_leitura on eventos for select
  using (auth.uid() is not null);

create policy eventos_escrita on eventos for all
  using (tem_permissao(id, 'pessoas', true)) -- admin_edicao é quem ajusta parâmetros do evento
  with check (tem_permissao(id, 'pessoas', true));

create policy categorias_contrib_leitura on categorias_contribuicao for select
  using (auth.uid() is not null);

create policy categorias_contrib_escrita on categorias_contribuicao for all
  using (tem_permissao(evento_id, 'pessoas', true))
  with check (tem_permissao(evento_id, 'pessoas', true));

-- usuarios_papeis / permissoes_papel / papeis: cada usuário lê seu próprio vínculo
-- (para a UI saber o que mostrar); gestão completa fica restrita a quem edita 'pessoas'.
create policy papeis_leitura on papeis for select using (auth.uid() is not null);

create policy permissoes_papel_leitura on permissoes_papel for select using (auth.uid() is not null);

create policy usuarios_papeis_leitura_propria on usuarios_papeis for select
  using (usuario_id = auth.uid() or tem_permissao(evento_id, 'pessoas', false));

create policy usuarios_papeis_escrita on usuarios_papeis for all
  using (tem_permissao(evento_id, 'pessoas', true))
  with check (tem_permissao(evento_id, 'pessoas', true));

-- ---------------------------------------------------------
-- pessoas
-- ---------------------------------------------------------

create policy pessoas_leitura on pessoas for select
  using (
    tem_permissao(evento_id, 'pessoas', false)
    or user_id = auth.uid()
  );

create policy pessoas_escrita on pessoas for all
  using (tem_permissao(evento_id, 'pessoas', true))
  with check (tem_permissao(evento_id, 'pessoas', true));

-- ---------------------------------------------------------
-- presencas: colega confirma a própria presença; administração/tesouraria veem todas
-- ---------------------------------------------------------

create policy presencas_leitura on presencas for select
  using (
    tem_permissao(evento_id, 'presenca', false, pessoa_id)
  );

create policy presencas_escrita on presencas for all
  using (tem_permissao(evento_id, 'presenca', true, pessoa_id))
  with check (tem_permissao(evento_id, 'presenca', true, pessoa_id));

-- ---------------------------------------------------------
-- pagamentos: colega vê só o próprio; tesouraria/comprovantes/admin veem conforme permissao
-- ---------------------------------------------------------

create policy pagamentos_leitura on pagamentos for select
  using (tem_permissao(evento_id, 'pagamentos', false, pessoa_id));

create policy pagamentos_escrita on pagamentos for all
  using (tem_permissao(evento_id, 'pagamentos', true, pessoa_id))
  with check (tem_permissao(evento_id, 'pagamentos', true, pessoa_id));

create policy comprovantes_pagamento_leitura on comprovantes_pagamento for select
  using (
    exists (
      select 1 from pagamentos p
      where p.id = pagamento_id
        and tem_permissao(p.evento_id, 'comprovantes_pagamento', false, p.pessoa_id)
    )
  );

create policy comprovantes_pagamento_escrita on comprovantes_pagamento for all
  using (
    exists (
      select 1 from pagamentos p
      where p.id = pagamento_id
        and tem_permissao(p.evento_id, 'comprovantes_pagamento', true, p.pessoa_id)
    )
  )
  with check (
    exists (
      select 1 from pagamentos p
      where p.id = pagamento_id
        and tem_permissao(p.evento_id, 'comprovantes_pagamento', true, p.pessoa_id)
    )
  );

-- ---------------------------------------------------------
-- categorias_orcamento / itens_consumo: módulo 'orcamento'
-- ---------------------------------------------------------

create policy categorias_orcamento_leitura on categorias_orcamento for select
  using (tem_permissao(evento_id, 'orcamento', false));

create policy categorias_orcamento_escrita on categorias_orcamento for all
  using (tem_permissao(evento_id, 'orcamento', true))
  with check (tem_permissao(evento_id, 'orcamento', true));

create policy itens_consumo_leitura on itens_consumo for select
  using (tem_permissao(evento_id, 'orcamento', false));

create policy itens_consumo_escrita on itens_consumo for all
  using (tem_permissao(evento_id, 'orcamento', true))
  with check (tem_permissao(evento_id, 'orcamento', true));

-- ---------------------------------------------------------
-- despesas: responsável de frente só vê/edita as do próprio grupo
-- ---------------------------------------------------------

create policy despesas_leitura on despesas for select
  using (tem_permissao(evento_id, 'despesas', false, null, grupo_responsavel));

create policy despesas_escrita on despesas for all
  using (tem_permissao(evento_id, 'despesas', true, null, grupo_responsavel))
  with check (tem_permissao(evento_id, 'despesas', true, null, grupo_responsavel));

create policy comprovantes_despesa_leitura on comprovantes_despesa for select
  using (
    exists (
      select 1 from despesas d
      where d.id = despesa_id
        and tem_permissao(d.evento_id, 'comprovantes_despesa', false, null, d.grupo_responsavel)
    )
  );

create policy comprovantes_despesa_escrita on comprovantes_despesa for all
  using (
    exists (
      select 1 from despesas d
      where d.id = despesa_id
        and tem_permissao(d.evento_id, 'comprovantes_despesa', true, null, d.grupo_responsavel)
    )
  )
  with check (
    exists (
      select 1 from despesas d
      where d.id = despesa_id
        and tem_permissao(d.evento_id, 'comprovantes_despesa', true, null, d.grupo_responsavel)
    )
  );

-- ---------------------------------------------------------
-- patrocinadores: valor fica no módulo separado 'valores_patrocinio'
-- (Comprovantes/Audrey não deve ver valor, mas pode ver que o patrocinador existe)
-- ---------------------------------------------------------

create policy patrocinadores_leitura on patrocinadores for select
  using (tem_permissao(evento_id, 'patrocinadores', false));

create policy patrocinadores_escrita on patrocinadores for all
  using (tem_permissao(evento_id, 'patrocinadores', true))
  with check (tem_permissao(evento_id, 'patrocinadores', true));

create policy historico_patrocinio_leitura on historico_patrocinio for select
  using (
    exists (
      select 1 from patrocinadores p
      where p.id = patrocinador_id
        and tem_permissao(p.evento_id, 'patrocinadores', false)
    )
  );

create policy historico_patrocinio_escrita on historico_patrocinio for all
  using (
    exists (
      select 1 from patrocinadores p
      where p.id = patrocinador_id
        and tem_permissao(p.evento_id, 'patrocinadores', true)
    )
  )
  with check (
    exists (
      select 1 from patrocinadores p
      where p.id = patrocinador_id
        and tem_permissao(p.evento_id, 'patrocinadores', true)
    )
  );

-- Observação: o valor do patrocínio (coluna patrocinadores.valor) deve ser ocultado
-- na camada de aplicação para quem tem acesso a 'patrocinadores' mas não a
-- 'valores_patrocinio' (ver lib/permissoes). RLS de linha não esconde coluna;
-- quem precisar disso de forma estrita deve consultar uma view sem a coluna valor.

-- ---------------------------------------------------------
-- tarefas: responsável de frente só vê/edita as do próprio grupo
-- ---------------------------------------------------------

create policy tarefas_leitura on tarefas for select
  using (tem_permissao(evento_id, 'tarefas', false, null, grupo));

create policy tarefas_escrita on tarefas for all
  using (tem_permissao(evento_id, 'tarefas', true, null, grupo))
  with check (tem_permissao(evento_id, 'tarefas', true, null, grupo));

-- ---------------------------------------------------------
-- log_auditoria / log_acessos: só leitura por quem tem 'pessoas' (admin); escrita só via trigger/service role
-- ---------------------------------------------------------

create policy log_auditoria_leitura on log_auditoria for select
  using (evento_id is null or tem_permissao(evento_id, 'pessoas', false));

create policy log_acessos_leitura on log_acessos for select
  using (usuario_id = auth.uid());

-- log_acessos: cada usuário autenticado só registra acesso em nome dele mesmo
-- (ex.: ao abrir a URL assinada de um comprovante).
create policy log_acessos_insercao on log_acessos for insert
  with check (usuario_id = auth.uid());

-- log_auditoria: nenhuma policy de INSERT/UPDATE/DELETE — só a trigger
-- registrar_auditoria() (security definer) grava nessa tabela.
