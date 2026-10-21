import { createClient } from "@/lib/supabase/server";
import { carregarSessao } from "@/lib/permissoes/sessao";
import { FecharForm } from "./fechar-form";
import { reabrirPrestacaoContas } from "./actions";

function formatarReal(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function PaginaPrestacaoContas() {
  const sessao = await carregarSessao();
  const podeFechar = sessao?.vinculos.some(
    (v) => v.podeEscrever.prestacao_contas || v.papelCodigo === "admin_edicao"
  );

  const supabase = await createClient();
  const { data: evento } = await supabase
    .from("eventos")
    .select("id, ano, prestacao_contas_fechada, prestacao_contas_fechada_em")
    .eq("ativo", true)
    .single();

  if (!evento) return <p>Nenhum evento ativo.</p>;

  interface DespesaResumo {
    valor: number;
    status_comprovante: string;
    categorias_orcamento: { nome: string } | null;
  }
  const { data: despesas } = await supabase
    .from("despesas")
    .select("valor, status_comprovante, categorias_orcamento(nome)")
    .eq("evento_id", evento.id)
    .overrideTypes<DespesaResumo[]>();

  const { data: pagamentos } = await supabase
    .from("pagamentos")
    .select("valor_recebido, status")
    .eq("evento_id", evento.id);

  const { data: patrocinadoresRecebidos } = await supabase
    .from("patrocinadores")
    .select("nome, valor")
    .eq("evento_id", evento.id)
    .eq("status", "recebido");

  const porCategoria = new Map<string, number>();
  for (const d of despesas ?? []) {
    const nome = d.categorias_orcamento?.nome ?? "Sem categoria";
    porCategoria.set(nome, (porCategoria.get(nome) ?? 0) + d.valor);
  }

  const totalDespesas = (despesas ?? []).reduce((acc, d) => acc + d.valor, 0);
  const totalReceitaPessoas = (pagamentos ?? [])
    .filter((p) => p.status === "pago")
    .reduce((acc, p) => acc + (p.valor_recebido || 0), 0);
  const totalPatrocinio = (patrocinadoresRecebidos ?? []).reduce((acc, p) => acc + (p.valor ?? 0), 0);

  const despesasPendentes = (despesas ?? []).filter(
    (d) => d.status_comprovante === "pendente" || d.status_comprovante === "fora_do_quadro"
  ).length;

  const { count: pagamentosPendentesTotal } = await supabase
    .from("pagamentos")
    .select("id", { count: "exact", head: true })
    .eq("evento_id", evento.id)
    .eq("status", "pendente");

  const temPendencias = despesasPendentes > 0 || (pagamentosPendentesTotal ?? 0) > 0;

  return (
    <div>
      <h1 style={{ fontSize: 21, color: "var(--navy)" }}>Prestação de contas · {evento.ano}</h1>

      {evento.prestacao_contas_fechada ? (
        <div className="card" style={{ marginTop: 16, marginBottom: 20 }}>
          <p>
            <span className="pill pill-good">Fechada</span>{" "}
            {evento.prestacao_contas_fechada_em && (
              <span className="muted">em {formatarDataHora(evento.prestacao_contas_fechada_em)}</span>
            )}
          </p>
          {podeFechar && (
            <form action={reabrirPrestacaoContas} style={{ marginTop: 10 }}>
              <input type="hidden" name="eventoId" value={evento.id} />
              <button type="submit" className="btn btn-sm">
                Reabrir
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 16, marginBottom: 20 }}>
          {temPendencias ? (
            <p className="aviso" style={{ margin: 0 }}>
              {despesasPendentes > 0 &&
                `${despesasPendentes} despesa(s) com comprovante pendente ou fora do quadro. `}
              {(pagamentosPendentesTotal ?? 0) > 0 &&
                `${pagamentosPendentesTotal} pagamento(s) ainda pendente(s).`}
            </p>
          ) : (
            <p style={{ color: "var(--good)", margin: 0 }}>Nenhuma pendência encontrada.</p>
          )}
          {podeFechar && <FecharForm eventoId={evento.id} temPendencias={temPendencias} />}
        </div>
      )}

      <div className="cards-grid" style={{ marginBottom: 20 }}>
        <div className="card">
          <p className="kpi-label">Receita de colegas (pago)</p>
          <p className="kpi-value">{formatarReal(totalReceitaPessoas)}</p>
        </div>
        <div className="card">
          <p className="kpi-label">Patrocínio recebido</p>
          <p className="kpi-value">{formatarReal(totalPatrocinio)}</p>
        </div>
        <div className="card">
          <p className="kpi-label">Total de despesas</p>
          <p className="kpi-value">{formatarReal(totalDespesas)}</p>
        </div>
        <div className="card">
          <p className="kpi-label">Saldo</p>
          <p
            className="kpi-value"
            style={{
              color: totalReceitaPessoas + totalPatrocinio - totalDespesas >= 0 ? "var(--good)" : "var(--bad)",
            }}
          >
            {formatarReal(totalReceitaPessoas + totalPatrocinio - totalDespesas)}
          </p>
        </div>
      </div>

      <h3 style={{ fontSize: 14, color: "var(--navy)", marginBottom: 6 }}>Quadro-resumo por categoria</h3>
      <div className="tabela-wrap" style={{ marginBottom: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {[...porCategoria.entries()].map(([nome, valor]) => (
              <tr key={nome}>
                <td>{nome}</td>
                <td className="num">{formatarReal(valor)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 700 }}>
              <td>Total</td>
              <td className="num">{formatarReal(totalDespesas)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/api/exportar/pagamentos" className="btn">
          Exportar pagamentos (CSV)
        </a>
        <a href="/api/exportar/despesas" className="btn">
          Exportar despesas (CSV)
        </a>
      </div>
    </div>
  );
}
