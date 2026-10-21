import { createClient } from "@/lib/supabase/server";
import { carregarSessao } from "@/lib/permissoes/sessao";
import { AdicionarPessoas } from "./adicionar-pessoas";

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

export default async function PaginaPessoas({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string }>;
}) {
  const { mensagem } = await searchParams;
  const sessao = await carregarSessao();
  const podeEditar = sessao?.vinculos.some(
    (v) => v.papelCodigo === "admin_edicao"
  );

  const supabase = await createClient();
  const { data: evento } = await supabase
    .from("eventos")
    .select("id")
    .eq("ativo", true)
    .single();

  interface PessoaLinha {
    id: string;
    nome: string;
    area: string | null;
    possivel_duplicata_de: string | null;
    categorias_contribuicao: { nome: string } | null;
    pagamentos: { status: string; valor_devido: number }[];
  }

  const { data: pessoas } = await supabase
    .from("pessoas")
    .select(
      "id, nome, area, possivel_duplicata_de, categorias_contribuicao(nome), pagamentos(status, valor_devido)"
    )
    .eq("evento_id", evento?.id ?? "")
    .order("nome")
    .overrideTypes<PessoaLinha[]>();

  const total = pessoas?.length ?? 0;
  const pagos = (pessoas ?? []).filter((p) => p.pagamentos?.[0]?.status === "pago").length;

  return (
    <div>
      <h1 style={{ fontSize: 21, color: "var(--navy)" }}>Pessoas</h1>
      <p className="muted" style={{ marginTop: 2, marginBottom: 18 }}>
        {total} cadastradas · {pagos} com pagamento confirmado
      </p>

      {mensagem && <p className="aviso">{mensagem}</p>}

      {podeEditar && evento && <AdicionarPessoas eventoId={evento.id} />}

      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th className="ocultar-mobile">Área</th>
              <th className="ocultar-mobile">Categoria</th>
              <th className="num">Valor devido</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(pessoas ?? []).map((p) => (
              <tr key={p.id}>
                <td>
                  {p.nome}
                  {p.possivel_duplicata_de && (
                    <span className="pill pill-warn" style={{ marginLeft: 8 }}>
                      possível duplicata
                    </span>
                  )}
                </td>
                <td className="ocultar-mobile">{p.area ?? "—"}</td>
                <td className="ocultar-mobile">{p.categorias_contribuicao?.nome ?? "—"}</td>
                <td className="num">{formatarReal(p.pagamentos?.[0]?.valor_devido ?? null)}</td>
                <td>
                  <span className={`pill ${STATUS_CLASSE[p.pagamentos?.[0]?.status ?? ""] ?? "pill"}`}>
                    {STATUS_LABEL[p.pagamentos?.[0]?.status ?? ""] ?? "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
