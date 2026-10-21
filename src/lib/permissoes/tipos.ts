// Espelha as tabelas papeis / permissoes_papel do banco (supabase/migrations/0001_schema.sql).
// Estes tipos são só para a UI decidir o que mostrar — a barreira real de acesso é a RLS.

export type CodigoPapel =
  | "admin_edicao"
  | "admin_leitura"
  | "tesouraria"
  | "comprovantes"
  | "responsavel_frente"
  | "colega";

export type Modulo =
  | "pessoas"
  | "presenca"
  | "pagamentos"
  | "comprovantes_pagamento"
  | "despesas"
  | "comprovantes_despesa"
  | "orcamento"
  | "patrocinadores"
  | "valores_patrocinio"
  | "tarefas"
  | "prestacao_contas"
  | "exportacoes";

export interface VinculoPapel {
  papelCodigo: CodigoPapel;
  pessoaId: string | null;
  grupoResponsavel: string | null;
  podeLer: Record<Modulo, boolean>;
  podeEscrever: Record<Modulo, boolean>;
}
