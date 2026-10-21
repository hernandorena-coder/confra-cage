import { createClient } from "@/lib/supabase/server";
import { carregarSessao } from "@/lib/permissoes/sessao";
import { adicionarTarefa } from "./actions";
import { StatusSelect } from "./status-select";
import { EditarResponsavelPrazo } from "./editar-campos";

function formatarData(iso: string | null) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function PaginaTarefas({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string }>;
}) {
  const { mensagem } = await searchParams;
  const sessao = await carregarSessao();
  const podeEditar = sessao?.vinculos.some((v) => v.podeEscrever.tarefas);

  const supabase = await createClient();
  const { data: evento } = await supabase.from("eventos").select("id").eq("ativo", true).single();

  interface Tarefa {
    id: string;
    grupo: string;
    tarefa: string;
    responsavel_texto: string | null;
    prazo: string | null;
    status: string;
  }

  const { data: tarefas } = await supabase
    .from("tarefas")
    .select("id, grupo, tarefa, responsavel_texto, prazo, status")
    .eq("evento_id", evento?.id ?? "")
    .order("prazo")
    .overrideTypes<Tarefa[]>();

  const hoje = new Date().toISOString().slice(0, 10);
  const pendentes = (tarefas ?? []).filter((t) => t.status !== "concluida").length;
  const atrasadas = (tarefas ?? []).filter(
    (t) => t.status !== "concluida" && t.prazo && t.prazo < hoje
  ).length;

  const grupos = new Map<string, Tarefa[]>();
  for (const t of tarefas ?? []) {
    if (!grupos.has(t.grupo)) grupos.set(t.grupo, []);
    grupos.get(t.grupo)!.push(t);
  }

  return (
    <div>
      <h1 style={{ fontSize: 21, color: "var(--navy)" }}>Tarefas</h1>
      <p className="muted" style={{ marginTop: 2, marginBottom: 18 }}>
        {pendentes} pendente(s)
        {atrasadas > 0 && <span style={{ color: "var(--bad)" }}> · {atrasadas} atrasada(s)</span>}
      </p>

      {mensagem && <p className="aviso">{mensagem}</p>}

      {podeEditar && evento && (
        <form
          action={adicionarTarefa}
          className="card"
          style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 20 }}
        >
          <input type="hidden" name="eventoId" value={evento.id} />
          <label className="campo" style={{ flex: "1 1 140px" }}>
            Grupo
            <input type="text" name="grupo" required list="grupos-conhecidos" />
            <datalist id="grupos-conhecidos">
              {[...grupos.keys()].map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </label>
          <label className="campo" style={{ flex: "2 1 260px" }}>
            Tarefa
            <input type="text" name="tarefa" required />
          </label>
          <label className="campo" style={{ flex: "1 1 160px" }}>
            Responsável
            <input type="text" name="responsavelTexto" />
          </label>
          <label className="campo">
            Prazo
            <input type="date" name="prazo" />
          </label>
          <button type="submit" className="btn btn-primary">
            Adicionar
          </button>
        </form>
      )}

      {[...grupos.entries()].map(([grupo, tarefasDoGrupo]) => (
        <div key={grupo} style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: 14, color: "var(--navy)", marginBottom: 6 }}>{grupo}</h3>
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tarefa</th>
                  <th className="ocultar-mobile">Responsável</th>
                  <th>Prazo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tarefasDoGrupo.map((t) => {
                  const atrasada = t.status !== "concluida" && t.prazo && t.prazo < hoje;
                  return (
                    <tr key={t.id}>
                      <td style={{ textDecoration: t.status === "concluida" ? "line-through" : undefined }}>
                        {t.tarefa}
                      </td>
                      {podeEditar ? (
                        <td colSpan={2}>
                          <EditarResponsavelPrazo
                            id={t.id}
                            responsavelInicial={t.responsavel_texto}
                            prazoInicial={t.prazo}
                          />
                        </td>
                      ) : (
                        <>
                          <td className="ocultar-mobile muted">{t.responsavel_texto ?? "—"}</td>
                          <td style={{ color: atrasada ? "var(--bad)" : undefined, fontWeight: atrasada ? 600 : undefined }}>
                            {formatarData(t.prazo)}
                          </td>
                        </>
                      )}
                      <td>
                        {podeEditar ? (
                          <StatusSelect id={t.id} statusAtual={t.status} />
                        ) : (
                          <span className="pill">{t.status}</span>
                        )}
                      </td>
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
