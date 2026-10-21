# Plataforma de Gestão — Confraternização CAGE 2026

## Contexto

Hoje a confraternização da CAGE é organizada por planilhas, e-mails, PIX e um formulário do Google. Isso dificulta o controle de acesso (todo mundo que recebe a planilha vê tudo) e já gerou problemas em 2025: quadro de prestação de contas corrigido depois de enviado (R$ 10.607,60 → R$ 12.178,97 por comprovante faltante), diferença não explicada de R$ 4.408,73 entre receitas e despesas, e comprovantes/notas sem padrão de conferência.

O objetivo é uma plataforma nova (greenfield, pasta própria, fora de repositório público) que: (1) cada perfil vê só o que lhe cabe — especialmente o colega, que não deve ver a lista dos outros; (2) pagamento só é dado como conferido com comprovante anexado e revisão humana; (3) a prestação de contas só é fechada quando não faltar comprovante (ou com confirmação explícita registrada); (4) nenhum dado é inventado — campo sem informação real fica vazio e sinalizado.

Toda a lógica de referência (cálculo de estimativa de consumo, estrutura de pagamentos/despesas/patrocínios/tarefas) já existe no protótipo HTML (`prototipo/Coordenacao_Confraternizacao_CAGE_2026.html`) e nos CSVs de 2025 em `pacote/data/`. Esses arquivos **não serão alterados** — servem só de referência e de fonte para dados fictícios de teste.

## Decisões já confirmadas pela Helena

- **Hospedagem:** pode seguir com nuvem (Supabase). Confirmação formal de TI/jurídico da SEFAZ fica como pendência paralela, não bloqueia o desenho.
- **Login:** e-mail e senha (sem link mágico, sem SSO).
- **Conferência de pagamento:** manual, por comprovante (Tesouraria/Comprovantes conferem visualmente). Sem importação de extrato bancário por ora.
- **Perfis de administração plena:** Helena e Mariana.
- **Novo perfil necessário:** "visualização administrativa" — vê quase tudo que a Administração vê, mas não edita. Quem terá esse perfil ainda não foi decidido; o desenho do banco já precisa suportar essa distinção desde o início.

## Arquitetura recomendada

- **Frontend:** Next.js (App Router) + TypeScript, estilos inline, mobile-first (maioria acessa pelo celular).
- **Backend:** server actions/rotas do próprio Next.js (sem backend separado) para operações que exigem `service_role` (importação de CSV, geração de prestação de contas, expurgo de dados).
- **Banco:** Postgres via Supabase, com **Row Level Security (RLS)** como mecanismo central de controle de acesso — não `if` espalhado no frontend.
- **Auth:** Supabase Auth, e-mail/senha.
- **Storage:** Supabase Storage (buckets privados) para comprovantes, com signed URLs de curta duração — nunca URL pública permanente.
- **Hospedagem:** Vercel (app) + Supabase Cloud (banco/auth/storage).

Por quê: RLS resolve de forma real (não só visual) os 6 perfis de acesso, incluindo a separação "ver que o patrocinador existe" vs. "ver o valor do patrocínio" (Audrey/Comprovantes não deve ver valor de patrocínio). Essa mesma stack (Next.js + Vercel + Supabase, TypeScript, estilos inline) já é a que a Helena está adotando no projeto ROTA, o que reduz atrito — mas é avaliação técnica própria, não só familiaridade: para este porte (dezenas de usuários, necessidade de relatórios/somas por categoria), Postgres relacional com RLS é mais direto que Firestore, e um backend separado (NestJS/Express) duplicaria auth sem ganho real.

## Modelo de permissões (o ponto crítico)

Em vez de perfis fixos no código, usar **papéis como dados**:

- `papeis` (admin_edicao, admin_leitura, tesouraria, comprovantes, responsavel_frente, colega)
- `permissoes_papel`: por papel × módulo (pessoas, presenca, pagamentos, comprovantes_pagamento, despesas, orcamento, patrocinadores, **valores_patrocinio** separado de patrocinadores, tarefas, prestacao_contas, exportacoes) → `pode_ler`, `pode_escrever`, `escopo` (`todos`/`proprio`)
- `usuarios_papeis`: liga `auth.users` → papel → evento → (opcional) `pessoa_id` ou grupo de responsabilidade

As policies RLS consultam essas tabelas, não o nome do papel. Isso faz o perfil "visualização administrativa" ser só uma linha nova em `papeis` com `pode_ler=true`/`pode_escrever=false`, sem reescrever política alguma — e permite adicionar perfis no futuro (ex.: 2027) do mesmo jeito.

## Modelo de dados (tabelas principais)

Tudo com `evento_id` (FK para `eventos`) para reaproveitar a estrutura em 2027.

- `eventos` — parâmetros por ano (data, prazos, fator de pessoas anterior, pessoas novas estimadas)
- `categorias_contribuicao` — Auditor/Demais/Isento + valor (parametrizável, não fixo no código)
- `pessoas` — nome, área, categoria, e-mail, `user_id` (nullable até criar login), origem (CSV/manual). **Sem CPF, sem PIX de terceiros.**
- `presencas` — confirmação pela própria pessoa, RLS restringe escrita à própria linha
- `pagamentos` + `comprovantes_pagamento` — valor devido (congelado no momento), valor recebido, status, quem conferiu, arquivo em Storage
- `despesas` + `comprovantes_despesa` — categoria, tipo de documento, nº documento, status do comprovante (recebido/pendente/fora do quadro/não fiscal), campo de divergência observada
- `categorias_orcamento` — agrupamento para o quadro-resumo
- `itens_consumo` + parâmetros de projeção (pessoas ano anterior/atual, folga %, reajuste %) — replica exatamente a fórmula do protótipo (fator × folga × reajuste, arredondamento por unidade) como função pura testável no backend
- `patrocinadores` + `historico_patrocinio` — status, valor, recibo, prestação de contas enviada
- `tarefas` — grupo, responsável (nullable — várias ainda "a definir"), prazo, atraso calculado
- `log_auditoria` — por trigger de banco (não lógica de app) nas tabelas sensíveis
- `log_acessos` — registro de acesso a comprovantes/dados sensíveis (LGPD)

CPF completo nunca é campo estruturado; se aparecer em comprovante anexado, fica só sinalizado (`contem_dado_sensivel`), nunca digitado em campo de texto monitorado.

## Plano de entrega

**Fase 0 — Fundação:** projeto Supabase, Auth e-mail/senha, schema inicial (`eventos`, `papeis`, `permissoes_papel`, `usuarios_papeis`, `pessoas`), evento 2026 e categorias R$40/25/isento cadastrados, deploy de teste na Vercel.

**Fase 1 — MVP (o que você pediu):**
1. Login e-mail/senha; Helena e Mariana como admin_edicao.
2. Cadastro de pessoas com importação de CSV (formato de `pagantes_2025.csv`), com tela de revisão antes de confirmar (alerta de possível duplicata, ex.: o caso "Fernanda Mallmann Paganin"/"Fernanda Mallmann" de 2025).
3. Pagamentos com upload de comprovante (Storage + RLS), marcação de status.
4. Painel da Administração: pessoas, status de pagamento, presença em tempo real.
5. Visão do Colega: "minha situação" (presença, valor devido, pago/pendente), programação, regras.
6. Estrutura do papel "visualização administrativa" já criada no banco, mesmo sem ninguém atribuído ainda.

**Fase 2 — Despesas, orçamento e consumo:** lançamento de despesas com anexo e sinalização de pendências; motor de estimativa de consumo (fórmula do protótipo) e painel de orçamento.

**Fase 3 — Patrocinadores e tarefas:** status/histórico de patrocinadores com separação de acesso a valor; tarefas por grupo/responsável/prazo, seed a partir de `tarefas_sugeridas.csv`.

**Fase 4 — Prestação de contas e exportações:** quadro-resumo por categoria + planilha + pacote de comprovantes, com bloqueio de fechamento se houver comprovante pendente (ou confirmação explícita registrada em auditoria); exportação CSV e backup completo.

**Fase 5 — Auditoria, LGPD, expurgo:** tela de trilha de auditoria; rotina de expurgo de dados/comprovantes após prazo configurável (confirmação manual, nunca automática); log de acessos.

**Fase 6 — Fechamento e preparação 2027:** rotina de "encerrar evento / criar próximo ano" clonando parâmetros sem copiar dados pessoais/pagamentos.

## Estrutura de pastas

Nova pasta própria, fora de `agu/ROTA` e fora de qualquer repositório público:
`...\Eventos\plataforma_confraternizacao_cage\` com `app/` (grupos de rota por perfil), `lib/supabase`, `lib/orcamento` (fórmula pura), `lib/permissoes`, `supabase/migrations` (SQL + RLS versionado), `supabase/seed` (dados fictícios, nunca os CSVs reais), `.gitignore` cobrindo `.env*`, `*.csv`, `comprovantes/`. Os arquivos em `pacote/` continuam intactos e não são copiados para dentro do projeto novo.

## Pendências a reabrir com você (não bloqueiam o início, mas precisam de resposta antes das fases correspondentes)

- Confirmação de TI/jurídico da SEFAZ sobre nuvem e dados pessoais (antes de produção).
- Quem terá o perfil de "visualização administrativa".
- Prazos finais de 2026 (formulário e pagamento, hoje "a confirmar").
- Origem da diferença de R$ 4.408,73 em 2025 (não será inventada).
- Responsáveis ainda "a definir" (vegetariano/vegano, videokê, vôlei).
- Prazo de retenção/expurgo de dados após a prestação de contas.
- Quantas pessoas realmente compareceram em 2025 (hoje só há pagantes, 145), para calibrar o fator de pessoas de 2026.
- Se todos os colegas (incluindo contratados/estagiários isentos) têm e-mail cadastrável para o login.

## Verificação

- Fase 0/1: testar login com 2-3 contas fictícias (um admin, um colega) e confirmar via RLS que o colega não consegue ler a linha de pagamento de outra pessoa (tentar via SQL direto no Supabase, não só pela tela).
- Importação de CSV: rodar com uma cópia fictícia (nomes trocados) de `pagantes_2025.csv` e confirmar que duplicatas são sinaladas, não gravadas direto.
- Upload de comprovante: confirmar que o arquivo não fica acessível por URL pública e que perfis sem permissão recebem 403/linha vazia.
- Nenhum dado real de 2025 (nomes, valores, comprovantes) deve aparecer em ambiente de teste — só fixtures fictícias.
