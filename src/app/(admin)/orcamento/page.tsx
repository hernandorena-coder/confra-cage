import { createClient } from "@/lib/supabase/server";
import { carregarSessao } from "@/lib/permissoes/sessao";
import { projetarItensConsumo, type ItemConsumoEntrada, type Unidade } from "@/lib/orcamento/estimativa";
import { atualizarParametrosOrcamento } from "./actions";

function formatarReal(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarQtd(valor: number | null) {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export default async function PaginaOrcamento() {
  const sessao = await carregarSessao();
  const podeEditar = sessao?.vinculos.some((v) => v.papelCodigo === "admin_edicao");

  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("eventos")
    .select("id, pessoas_ano_anterior, pessoas_novas_estimadas, folga_pct, reajuste_pct")
    .eq("ativo", true)
    .single();

  if (!evento) {
    return <p>Nenhum evento ativo configurado.</p>;
  }

  const { count: pessoasCadastradas } = await supabase
    .from("pessoas")
    .select("id", { count: "exact", head: true })
    .eq("evento_id", evento.id);

  interface CategoriaReceita {
    id: string;
    valor: number;
  }
  const { data: categoriasContrib } = await supabase
    .from("categorias_contribuicao")
    .select("id, valor")
    .eq("evento_id", evento.id)
    .overrideTypes<CategoriaReceita[]>();

  const { data: pessoasPorCategoria } = await supabase
    .from("pessoas")
    .select("categoria_id")
    .eq("evento_id", evento.id);

  const contagemPorCategoria = new Map<string, number>();
  for (const p of pessoasPorCategoria ?? []) {
    if (!p.categoria_id) continue;
    contagemPorCategoria.set(p.categoria_id, (contagemPorCategoria.get(p.categoria_id) ?? 0) + 1);
  }
  const receitaPrevista = (categoriasContrib ?? []).reduce(
    (acc, c) => acc + (contagemPorCategoria.get(c.id) ?? 0) * c.valor,
    0
  );

  const { data: despesasLancadas } = await supabase
    .from("despesas")
    .select("valor")
    .eq("evento_id", evento.id);
  const totalDespesasLancadas = (despesasLancadas ?? []).reduce((acc, d) => acc + (d.valor || 0), 0);

  interface ItemLinha {
    id: string;
    grupo: string;
    item: string;
    quantidade_referencia: number | null;
    unidade: Unidade | null;
    valor_referencia: number;
    escala_com_pessoas: boolean;
  }
  const { data: itens } = await supabase
    .from("itens_consumo")
    .select("id, grupo, item, quantidade_referencia, unidade, valor_referencia, escala_com_pessoas")
    .eq("evento_id", evento.id)
    .order("grupo")
    .overrideTypes<ItemLinha[]>();

  const itensEntrada: ItemConsumoEntrada[] = (itens ?? []).map((i) => ({
    id: i.id,
    unidade: i.unidade ?? "un",
    quantidadeReferencia: i.quantidade_referencia,
    valorReferencia: i.valor_referencia,
    escalaComPessoas: i.escala_com_pessoas,
  }));

  const projecao = projetarItensConsumo(itensEntrada, {
    pessoasAnoAnterior: evento.pessoas_ano_anterior ?? 1,
    pessoasAnoAtual: null,
    pessoasCadastradas: pessoasCadastradas ?? 0,
    pessoasNovasEstimadas: evento.pessoas_novas_estimadas ?? 0,
    folgaPct: evento.folga_pct ?? 0,
    reajustePct: evento.reajuste_pct ?? 0,
  });

  const totalEstimado = projecao.itens.reduce((acc, i) => acc + i.valorProjetado, 0);
  const saldo = receitaPrevista - totalEstimado;

  const grupos = new Map<string, typeof projecao.itens>();
  for (const item of projecao.itens) {
    const original = itens?.find((i) => i.id === item.id);
    const grupo = original?.grupo ?? "Outros";
    if (!grupos.has(grupo)) grupos.set(grupo, []);
    grupos.get(grupo)!.push(item);
  }

  return (
    <div>
      <h1 style={{ fontSize: 21, color: "var(--navy)" }}>Orçamento e consumo</h1>
      <p className="muted" style={{ marginTop: 2, marginBottom: 18 }}>
        Estimativa de 2026 projetada a partir dos itens comprados em 2025 (fator ×{" "}
        {projecao.ratio.toFixed(2).replace(".", ",")}, {pessoasCadastradas ?? 0} pessoas cadastradas +{" "}
        {evento.pessoas_novas_estimadas ?? 0} novas estimadas, contra {projecao.n25} em 2025).
      </p>

      <div className="cards-grid" style={{ marginBottom: 20 }}>
        <div className="card">
          <p className="kpi-label">Receita prevista</p>
          <p className="kpi-value">{formatarReal(receitaPrevista)}</p>
        </div>
        <div className="card">
          <p className="kpi-label">Despesa estimada</p>
          <p className="kpi-value">{formatarReal(totalEstimado)}</p>
        </div>
        <div className="card">
          <p className="kpi-label">Saldo projetado</p>
          <p className="kpi-value" style={{ color: saldo >= 0 ? "var(--good)" : "var(--bad)" }}>
            {formatarReal(saldo)}
          </p>
        </div>
        <div className="card">
          <p className="kpi-label">Já lançado em despesas</p>
          <p className="kpi-value">{formatarReal(totalDespesasLancadas)}</p>
        </div>
      </div>

      {podeEditar && (
        <form
          action={atualizarParametrosOrcamento}
          className="card"
          style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 20 }}
        >
          <input type="hidden" name="eventoId" value={evento.id} />
          <label className="campo">
            Auditores novos (sem cadastro ainda)
            <input
              type="number"
              name="pessoasNovasEstimadas"
              defaultValue={evento.pessoas_novas_estimadas ?? 0}
              style={{ width: 100 }}
            />
          </label>
          <label className="campo">
            Folga (%)
            <input type="number" name="folgaPct" defaultValue={evento.folga_pct ?? 0} style={{ width: 90 }} />
          </label>
          <label className="campo">
            Reajuste de preços (%)
            <input type="number" name="reajustePct" defaultValue={evento.reajuste_pct ?? 0} style={{ width: 90 }} />
          </label>
          <button type="submit" className="btn btn-primary">
            Atualizar projeção
          </button>
        </form>
      )}

      {[...grupos.entries()].map(([grupo, itensDoGrupo]) => (
        <div key={grupo} style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: 14, color: "var(--navy)", marginBottom: 6 }}>{grupo}</h3>
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num ocultar-mobile">2025</th>
                  <th className="num">2026 (estimado)</th>
                  <th className="num">Valor estimado</th>
                </tr>
              </thead>
              <tbody>
                {itensDoGrupo.map((item) => {
                  const original = itens?.find((i) => i.id === item.id);
                  return (
                    <tr key={item.id}>
                      <td>{original?.item}</td>
                      <td className="num ocultar-mobile muted">
                        {formatarQtd(item.quantidadeReferencia)} {item.unidade !== "un" ? item.unidade : ""}
                      </td>
                      <td className="num">
                        {formatarQtd(item.quantidadeProjetada)} {item.unidade !== "un" ? item.unidade : ""}
                      </td>
                      <td className="num">{formatarReal(item.valorProjetado)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
