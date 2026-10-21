import { createClient } from "@/lib/supabase/server";
import { carregarSessao } from "@/lib/permissoes/sessao";
import { confirmarPagamento } from "./actions";
import { VerComprovanteBotao } from "./ver-comprovante-botao";

function formatarReal(valor: number | null) {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_CLASSE: Record<string, string> = {
  pago: "pill-good",
  pendente: "pill-warn",
  isento: "pill",
};
const STATUS_LABEL: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  isento: "Isento",
};

export default async function PaginaPagamentos() {
  const sessao = await carregarSessao();
  const podeConferir = sessao?.vinculos.some(
    (v) => v.podeEscrever.pagamentos || v.papelCodigo === "admin_edicao"
  );

  const supabase = await createClient();
  const { data: evento } = await supabase.from("eventos").select("id").eq("ativo", true).single();

  interface PagamentoLinha {
    id: string;
    valor_devido: number;
    valor_recebido: number | null;
    status: string;
    pessoas: { nome: string; area: string | null } | null;
    comprovantes_pagamento: { id: string; storage_path: string; enviado_em: string }[];
  }

  const { data: pagamentos } = await supabase
    .from("pagamentos")
    .select(
      "id, valor_devido, valor_recebido, status, pessoas(nome, area), comprovantes_pagamento(id, storage_path, enviado_em)"
    )
    .eq("evento_id", evento?.id ?? "")
    .order("status")
    .overrideTypes<PagamentoLinha[]>();

  const totalDevido = (pagamentos ?? []).reduce((acc, p) => acc + (p.valor_devido || 0), 0);
  const totalRecebido = (pagamentos ?? [])
    .filter((p) => p.status === "pago")
    .reduce((acc, p) => acc + (p.valor_recebido || 0), 0);

  return (
    <div>
      <h1 style={{ fontSize: 21, color: "var(--navy)" }}>Pagamentos</h1>

      <div className="cards-grid" style={{ margin: "14px 0 20px" }}>
        <div className="card">
          <p className="kpi-label">Previsto</p>
          <p className="kpi-value">{formatarReal(totalDevido)}</p>
        </div>
        <div className="card">
          <p className="kpi-label">Recebido</p>
          <p className="kpi-value" style={{ color: "var(--good)" }}>{formatarReal(totalRecebido)}</p>
        </div>
      </div>

      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Pessoa</th>
              <th className="num">Devido</th>
              <th>Status</th>
              <th>Comprovante</th>
              {podeConferir && <th>Conferir</th>}
            </tr>
          </thead>
          <tbody>
            {(pagamentos ?? []).map((p) => (
              <tr key={p.id}>
                <td>
                  {p.pessoas?.nome}
                  <div className="muted" style={{ fontSize: 12 }}>{p.pessoas?.area}</div>
                </td>
                <td className="num">{formatarReal(p.valor_devido)}</td>
                <td>
                  <span className={`pill ${STATUS_CLASSE[p.status] ?? "pill"}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </td>
                <td>
                  {(p.comprovantes_pagamento ?? []).length === 0
                    ? "—"
                    : (p.comprovantes_pagamento ?? []).map((c) => (
                        <VerComprovanteBotao key={c.id} storagePath={c.storage_path} />
                      ))}
                </td>
                {podeConferir && (
                  <td>
                    {p.status !== "pago" && p.status !== "isento" && (
                      <form action={confirmarPagamento} style={{ display: "flex", gap: 6 }}>
                        <input type="hidden" name="pagamentoId" value={p.id} />
                        <input
                          type="number"
                          name="valorRecebido"
                          step="0.01"
                          defaultValue={p.valor_devido}
                          style={{ width: 80 }}
                        />
                        <button type="submit" className="btn btn-primary btn-sm">
                          Marcar pago
                        </button>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
