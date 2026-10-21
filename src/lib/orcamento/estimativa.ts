// Replica fielmente a lógica da aba "Consumo 2025" do protótipo
// (prototipo/Coordenacao_Confraternizacao_CAGE_2026.html, função consCalc / roundQ),
// como função pura testável, para o painel de orçamento (Fase 2).

export type Unidade = "kg" | "L" | "m" | "un";

export interface ItemConsumoEntrada {
  id: string;
  unidade: Unidade;
  quantidadeReferencia: number | null;
  valorReferencia: number;
  escalaComPessoas: boolean;
}

export interface ParametrosProjecao {
  pessoasAnoAnterior: number; // ex.: 145 (n25)
  pessoasAnoAtual: number | null; // se null, usa pessoasCadastradas + pessoasNovasEstimadas
  pessoasCadastradas: number;
  pessoasNovasEstimadas: number;
  folgaPct: number; // ex.: 0
  reajustePct: number; // ex.: 0
}

export interface ItemConsumoProjetado extends ItemConsumoEntrada {
  quantidadeProjetada: number | null;
  valorProjetado: number;
}

/**
 * Arredonda para cima; kg/L/m ficam com 1 casa decimal, as demais unidades inteiras.
 * Espelha roundQ() do protótipo (inclui a mesma tolerância de ponto flutuante).
 */
export function arredondarQuantidade(valor: number, unidade: Unidade): number {
  const EPS = 1e-9;
  if (unidade === "kg" || unidade === "L" || unidade === "m") {
    return Math.ceil(valor * 10 - EPS) / 10;
  }
  return Math.ceil(valor - EPS);
}

export function calcularFatorPessoas(p: ParametrosProjecao) {
  const n25 = p.pessoasAnoAnterior || 1;
  const nAuto = p.pessoasCadastradas + (p.pessoasNovasEstimadas || 0);
  const n26 = p.pessoasAnoAtual ?? nAuto;
  const ratio = n26 / n25;
  return { n25, n26, nAuto, ratio };
}

export function projetarItensConsumo(
  itens: ItemConsumoEntrada[],
  parametros: ParametrosProjecao
): { itens: ItemConsumoProjetado[]; n25: number; n26: number; ratio: number } {
  const { n25, n26, ratio } = calcularFatorPessoas(parametros);
  const folga = 1 + (parametros.folgaPct || 0) / 100;
  const preco = 1 + (parametros.reajustePct || 0) / 100;

  const itensProjetados = itens.map((item) => {
    const k = item.escalaComPessoas ? ratio * folga : 1;
    const quantidadeProjetada =
      item.quantidadeReferencia == null
        ? null
        : arredondarQuantidade(item.quantidadeReferencia * k, item.unidade);
    const valorProjetado = item.valorReferencia * k * preco;
    return { ...item, quantidadeProjetada, valorProjetado };
  });

  return { itens: itensProjetados, n25, n26, ratio };
}
