import { createClient } from "@/lib/supabase/server";
import { carregarSessao } from "@/lib/permissoes/sessao";
import { LancarDespesa } from "./lancar-despesa";
import { VerComprovanteBotao } from "./ver-comprovante-botao";

function formatarReal(valor: number | null) {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_CLASSE: Record<string, string> = {
  recebido: "pill-good",
  pendente: "pill-warn",
  fora_do_quadro: "pill-bad",
  nao_fiscal: "pill-bad",
};
const STATUS_LABEL: Record<string, string> = {
  recebido: "Recebido",
  pendente: "Pendente",
  fora_do_quadro: "Fora do quadro",
  nao_fiscal: "Não é nota fiscal",
};

export default async function PaginaDespesas({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string }>;
}) {
  const { mensagem } = await searchParams;
  const sessao = await carregarSessao();
  const podeLancar = sessao?.vinculos.some(
    (v) => v.podeEscrever.despesas || v.papelCodigo === "admin_edicao"
  );

  const supabase = await createClient();
  const { data: evento } = await supabase.from("eventos").select("id").eq("ativo", true).single();

  interface DespesaLinha {
    id: string;
    item: string;
    valor: number;
    tipo_documento: string | null;
    numero_documento: string | null;
    pago_por_texto: string | null;
    grupo_responsavel: string | null;
    status_comprovante: string;
    categorias_orcamento: { nome: string } | null;
    comprovantes_despesa: { id: string; storage_path: string }[];
  }

  const { data: categorias } = await supabase
    .from("categorias_orcamento")
    .select("id, nome")
    .eq("evento_id", evento?.id ?? "")
    .order("nome");

  const { data: despesas } = await supabase
    .from("despesas")
    .select(
      "id, item, valor, tipo_documento, numero_documento, pago_por_texto, grupo_responsavel, status_comprovante, categorias_orcamento(nome), comprovantes_despesa(id, storage_path)"
    )
    .eq("evento_id", evento?.id ?? "")
    .order("criado_em", { ascending: false })
    .overrideTypes<DespesaLinha[]>();

  const total = (despesas ?? []).reduce((acc, d) => acc + (d.valor || 0), 0);
  const pendentes = (despesas ?? []).filter(
    (d) => d.status_comprovante === "pendente" || d.status_comprovante === "fora_do_quadro"
  );

  return (
    <div>
      <h1 style={{ fontSize: 21, color: "var(--navy)" }}>Despesas</h1>

      <div className="cards-grid" style={{ margin: "14px 0 20px" }}>
        <div className="card">
          <p className="kpi-label">Total lançado</p>
          <p className="kpi-value">{formatarReal(total)}</p>
        </div>
        <div className="card">
          <p className="kpi-label">Comprovantes pendentes</p>
          <p className="kpi-value" style={{ color: pendentes.length ? "var(--warn)" : "var(--good)" }}>
            {pendentes.length}
          </p>
        </div>
      </div>

      {mensagem && <p className="aviso">{mensagem}</p>}

      {podeLancar && evento && <LancarDespesa eventoId={evento.id} categorias={categorias ?? []} />}

      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th className="ocultar-mobile">Categoria</th>
              <th className="num">Valor</th>
              <th className="ocultar-mobile">Documento</th>
              <th>Comprovante</th>
            </tr>
          </thead>
          <tbody>
            {(despesas ?? []).map((d) => (
              <tr key={d.id}>
                <td>
                  {d.item}
                  {d.grupo_responsavel && (
                    <div className="muted" style={{ fontSize: 12 }}>{d.grupo_responsavel}</div>
                  )}
                </td>
                <td className="ocultar-mobile">{d.categorias_orcamento?.nome ?? "—"}</td>
                <td className="num">{formatarReal(d.valor)}</td>
                <td className="ocultar-mobile">
                  {d.tipo_documento ?? "—"} {d.numero_documento ? `· ${d.numero_documento}` : ""}
                </td>
                <td>
                  <span className={`pill ${STATUS_CLASSE[d.status_comprovante] ?? "pill"}`}>
                    {STATUS_LABEL[d.status_comprovante] ?? d.status_comprovante}
                  </span>
                  {(d.comprovantes_despesa ?? []).map((c) => (
                    <span key={c.id} style={{ marginLeft: 8 }}>
                      <VerComprovanteBotao storagePath={c.storage_path} />
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
