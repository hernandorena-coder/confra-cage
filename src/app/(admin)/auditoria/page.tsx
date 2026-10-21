import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { carregarSessao } from "@/lib/permissoes/sessao";

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

const ACAO_LABEL: Record<string, string> = {
  insert: "Criou",
  update: "Alterou",
  delete: "Excluiu",
};

export default async function PaginaAuditoria() {
  const sessao = await carregarSessao();
  const podeVer = sessao?.vinculos.some((v) => ["admin_edicao", "admin_leitura"].includes(v.papelCodigo));
  if (!podeVer) redirect("/pessoas");

  const supabase = await createClient();
  const { data: evento } = await supabase.from("eventos").select("id").eq("ativo", true).single();

  interface LogLinha {
    id: string;
    tabela_afetada: string;
    acao: string;
    campo_alterado: string | null;
    valor_anterior: string | null;
    valor_novo: string | null;
    criado_em: string;
  }

  const { data: logs } = await supabase
    .from("log_auditoria")
    .select("id, tabela_afetada, acao, campo_alterado, valor_anterior, valor_novo, criado_em")
    .eq("evento_id", evento?.id ?? "")
    .order("criado_em", { ascending: false })
    .limit(200)
    .overrideTypes<LogLinha[]>();

  return (
    <div>
      <h1 style={{ fontSize: 21, color: "var(--navy)" }}>Auditoria</h1>
      <p className="muted" style={{ marginTop: 2, marginBottom: 18 }}>
        Últimas {logs?.length ?? 0} alterações em pagamentos, pessoas, eventos e patrocinadores.
      </p>

      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Tabela</th>
              <th>Ação</th>
              <th className="ocultar-mobile">Campo</th>
              <th className="ocultar-mobile">De</th>
              <th className="ocultar-mobile">Para</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((l) => (
              <tr key={l.id}>
                <td className="muted" style={{ fontSize: 13 }}>{formatarDataHora(l.criado_em)}</td>
                <td>{l.tabela_afetada}</td>
                <td>{ACAO_LABEL[l.acao] ?? l.acao}</td>
                <td className="ocultar-mobile">{l.campo_alterado ?? "—"}</td>
                <td className="ocultar-mobile muted">{l.valor_anterior ?? "—"}</td>
                <td className="ocultar-mobile">{l.valor_novo ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
