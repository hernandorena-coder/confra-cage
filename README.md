# Plataforma de Gestão — Confraternização CAGE 2026

Plataforma com controle de acesso por perfil para organizar presença, pagamentos,
despesas, patrocínios e tarefas da confraternização de fim de ano da CAGE (RS).
Substitui planilhas, e-mails e formulário do Google.

Veja o plano completo e as decisões de arquitetura em `docs/decisoes.md`. Esta
pasta **não tem relação de dados** com `pacote/` (pasta de referência, com os
CSVs reais de 2025 e o protótipo HTML) — aquela pasta não deve ser copiada aqui.

## Stack

Next.js (App Router) + TypeScript, Supabase (Postgres + Auth + Storage) com
Row Level Security como mecanismo central de controle de acesso. Veja
`docs/decisoes.md` para a justificativa.

## Configuração

1. Crie um projeto no [Supabase](https://supabase.com) (ou use um já existente,
   após confirmação de TI/jurídico da SEFAZ sobre hospedagem em nuvem).
2. Copie `.env.local.example` para `.env.local` e preencha com as chaves do
   projeto (Project Settings → API). **Nunca** comite `.env.local` (já está no
   `.gitignore`).
3. Rode as migrations em `supabase/migrations/` em ordem, pelo SQL Editor do
   Supabase ou pela Supabase CLI (`supabase db push`). Elas criam o schema,
   as policies de RLS, os triggers de auditoria, o bucket de storage e os
   dados de parâmetro (papéis, permissões, evento 2026, categorias de
   contribuição) — nenhum dado pessoal real é inserido por migration.
4. Instale as dependências e rode local:

   ```bash
   npm install
   npm run dev
   ```

5. Abra [http://localhost:3000](http://localhost:3000).

## Primeiros usuários (admin)

Crie os usuários da Helena e da Mariana no Supabase Auth (Authentication →
Users → Add user, com e-mail/senha) e depois insira o vínculo de papel:

```sql
insert into usuarios_papeis (usuario_id, evento_id, papel_id)
select '<uuid do usuário em auth.users>', e.id, p.id
from eventos e, papeis p
where e.ano = 2026 and p.codigo = 'admin_edicao';
```

## Dados de teste

`supabase/seed/pessoas_ficticias.csv` tem 5 pessoas fictícias (nomes como
"Ana Teste", "Bruno Exemplo") no formato aceito pela importação da tela
Pessoas: `nome;area;categoria;email`, onde `categoria` é `AUDITOR`, `DEMAIS`
ou `ISENTO`. **Nunca** use os CSVs reais de `pacote/data/` em ambiente de
teste ou desenvolvimento.

## Estrutura

- `src/app/login` — autenticação (e-mail/senha).
- `src/app/colega` — visão do colega: própria presença, situação de pagamento,
  envio do comprovante do PIX.
- `src/app/(admin)/pessoas` — cadastro e importação de pessoas (Administração).
- `src/app/(admin)/pagamentos` — conferência de pagamentos e comprovantes
  (Administração, Tesouraria, Comprovantes).
- `src/lib/supabase` — clients Supabase (browser, servidor, admin/service_role,
  middleware de sessão).
- `src/lib/permissoes` — tipos e leitura da sessão/papéis (só para a UI decidir
  o que mostrar; a barreira real é a RLS no banco).
- `src/lib/orcamento/estimativa.ts` — fórmula de projeção de consumo (fator de
  pessoas × folga × reajuste), replicando a lógica do protótipo HTML.
- `supabase/migrations` — schema, RLS, triggers de auditoria, storage, seed de
  parâmetros.
- `supabase/seed` — dados fictícios para teste.

## O que ainda falta (ver `docs/decisoes.md`)

Despesas/notas fiscais, orçamento e consumo (painel), patrocinadores, tarefas,
prestação de contas, exportações/backup, tela de auditoria e rotina de
expurgo de dados — previstos nas Fases 2 a 6 do plano.
