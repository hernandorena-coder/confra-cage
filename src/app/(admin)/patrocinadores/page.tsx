import { createClient } from "@/lib/supabase/server";
import { carregarSessao } from "@/lib/permissoes/sessao";
import { adicionarPatrocinador, atualizarPatrocinador } from "./actions";

function formatarReal(valor: number | null) {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const STATUS_OPCOES = [
  { valor: "a_solicitar", rotulo: "A solicitar" },
  { valor: "solicitado", rotulo: "Solicitado" },
  { valor: "confirmado", rotulo: "Confirmado" },
  { valor: "recebido", rotulo: "Recebido" },
  { valor: "recusado", rotulo: "Recusado" },
];
const STATUS_CLASSE: Record<string, string> = {
  a_solicitar: "pill",
  solicitado: "pill-warn",
  confirmado: "pill-warn",
  recebido: "pill-good",
  recusado: "pill-bad",
};
const STATUS_LABEL = Object.fromEntries(STATUS_OPCOES.map((o) => [o.valor, o.rotulo]));

export default async function PaginaPatrocinadores({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string }>;
}) {
  const { mensagem } = await searchParams;
  const sessao = await carregarSessao();
  const podeEditar = sessao?.vinculos.some(
    (v) => v.podeEscrever.patrocinadores || v.papelCodigo === "admin_edicao"
  );
  const veValor = sessao?.vinculos.some((v) => v.podeLer.valores_patrocinio);

  const supabase = await createClient();
  const { data: evento } = await supabase.from("eventos").select("id").eq("ativo", true).single();

  interface Patrocinador {
    id: string;
    nome: string;
    contato: string | null;
    status: string;
    valor: number | null;
    recibo_emitido: boolean;
    prestacao_contas_enviada: boolean;
    observacao: string | null;
  }
  interface HistoricoLinha {
    id: string;
    patrocinador_id: string;
    data: string;
    descricao: string;
  }

  const { data: patrocinadores } = await supabase
    .from("patrocinadores")
    .select("id, nome, contato, status, valor, recibo_emitido, prestacao_contas_enviada, observacao")
    .eq("evento_id", evento?.id ?? "")
    .order("nome")
    .overrideTypes<Patrocinador[]>();

  const ids = (patrocinadores ?? []).map((p) => p.id);
  const { data: historico } = ids.length
    ? await supabase
        .from("historico_patrocinio")
        .select("id, patrocinador_id, data, descricao")
        .in("patrocinador_id", ids)
        .order("data", { ascending: false })
        .overrideTypes<HistoricoLinha[]>()
    : { data: [] as HistoricoLinha[] };

  const totalRecebido = (patrocinadores ?? [])
    .filter((p) => p.status === "recebido")
    .reduce((acc, p) => acc + (p.valor ?? 0), 0);

  return (
    <div>
      <h1 style={{ fontSize: 21, color: "var(--navy)" }}>Patrocinadores</h1>
      <p className="muted" style={{ marginTop: 2, marginBottom: 18 }}>
        {(patrocinadores ?? []).length} contato(s)
        {veValor && ` · ${formatarReal(totalRecebido)} recebido`}
      </p>

      {mensagem && <p className="aviso">{mensagem}</p>}

      {podeEditar && evento && (
        <form
          action={adicionarPatrocinador}
          className="card"
          style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 20 }}
        >
          <input type="hidden" name="eventoId" value={evento.id} />
          <label className="campo" style={{ flex: "1 1 180px" }}>
            Nome
            <input type="text" name="nome" required placeholder="ex.: Sindifisco-RS" />
          </label>
          <label className="campo" style={{ flex: "1 1 220px" }}>
            Contato
            <input type="text" name="contato" placeholder="e-mail, telefone, pessoa" />
          </label>
          <label className="campo" style={{ flex: "1 1 220px" }}>
            Observação
            <input type="text" name="observacao" />
          </label>
          <button type="submit" className="btn btn-primary">
            Adicionar
          </button>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {(patrocinadores ?? []).map((p) => {
          const historicoDoPatrocinador = (historico ?? []).filter((h) => h.patrocinador_id === p.id);
          return (
            <div key={p.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 16 }}>{p.nome}</p>
                  {p.contato && <p className="muted" style={{ fontSize: 13 }}>{p.contato}</p>}
                </div>
                <span className={`pill ${STATUS_CLASSE[p.status] ?? "pill"}`}>
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>

              {p.observacao && (
                <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{p.observacao}</p>
              )}

              {podeEditar ? (
                <form
                  action={atualizarPatrocinador}
                  style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}
                >
                  <input type="hidden" name="id" value={p.id} />
                  <label className="campo">
                    Status
                    <select name="status" defaultValue={p.status}>
                      {STATUS_OPCOES.map((o) => (
                        <option key={o.valor} value={o.valor}>
                          {o.rotulo}
                        </option>
                      ))}
                    </select>
                  </label>
                  {veValor && (
                    <label className="campo">
                      Valor (R$)
                      <input type="number" name="valor" step="0.01" defaultValue={p.valor ?? ""} style={{ width: 110 }} />
                    </label>
                  )}
                  <label className="campo" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" name="reciboEmitido" defaultChecked={p.recibo_emitido} />
                    Recibo emitido
                  </label>
                  <label className="campo" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" name="prestacaoEnviada" defaultChecked={p.prestacao_contas_enviada} />
                    Prestação enviada
                  </label>
                  <label className="campo" style={{ flex: "1 1 180px" }}>
                    Nova nota no histórico
                    <input type="text" name="nota" placeholder="opcional" />
                  </label>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Salvar
                  </button>
                </form>
              ) : (
                veValor && <p style={{ marginTop: 8 }}>{formatarReal(p.valor)}</p>
              )}

              {historicoDoPatrocinador.length > 0 && (
                <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                  <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Histórico</p>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                    {historicoDoPatrocinador.map((h) => (
                      <li key={h.id} style={{ marginBottom: 2 }}>
                        <span className="muted">{formatarDataHora(h.data)} · </span>
                        {h.descricao}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
