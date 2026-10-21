import { createClient } from "@/lib/supabase/server";
import { sair } from "@/app/login/actions";
import { confirmarPresenca, enviarComprovante } from "./actions";

function formatarReal(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string | null) {
  if (!iso) return "a confirmar";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function PaginaColega() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return <main style={{ padding: 24 }}>Sessão expirada. Volte para o login.</main>;
  }

  const { data: evento } = await supabase
    .from("eventos")
    .select("id, nome, data_evento, local, prazo_presenca, prazo_pagamento")
    .eq("ativo", true)
    .single();

  if (!evento) {
    return <main style={{ padding: 24 }}>Nenhum evento ativo configurado ainda.</main>;
  }

  interface PessoaComCategoria {
    id: string;
    nome: string;
    area: string | null;
    categoria_id: string | null;
    categorias_contribuicao: { nome: string; valor: number } | null;
  }

  const { data: pessoa } = await supabase
    .from("pessoas")
    .select("id, nome, area, categoria_id, categorias_contribuicao(nome, valor)")
    .eq("user_id", auth.user.id)
    .eq("evento_id", evento.id)
    .maybeSingle()
    .overrideTypes<PessoaComCategoria>();

  if (!pessoa) {
    return (
      <main style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
        <p>
          Seu login ainda não está vinculado a um cadastro de participante do evento{" "}
          {evento.nome}. Avise a organização.
        </p>
      </main>
    );
  }

  const categoria = pessoa.categorias_contribuicao;

  const { data: presenca } = await supabase
    .from("presencas")
    .select("confirmado, confirmado_em")
    .eq("evento_id", evento.id)
    .eq("pessoa_id", pessoa.id)
    .maybeSingle();

  const { data: pagamento } = await supabase
    .from("pagamentos")
    .select("id, valor_devido, valor_recebido, status")
    .eq("evento_id", evento.id)
    .eq("pessoa_id", pessoa.id)
    .maybeSingle();

  const { data: comprovantes } = pagamento
    ? await supabase
        .from("comprovantes_pagamento")
        .select("id, enviado_em")
        .eq("pagamento_id", pagamento.id)
    : { data: [] };

  const statusLabel: Record<string, string> = {
    pendente: "Pendente",
    pago: "Pago",
    isento: "Isento",
  };
  const statusClasse: Record<string, string> = {
    pendente: "pill-warn",
    pago: "pill-good",
    isento: "pill",
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "28px 16px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 19, color: "var(--navy)" }}>{evento.nome}</h1>
        <form action={sair}>
          <button type="submit" className="btn btn-ghost">
            Sair
          </button>
        </form>
      </div>
      <p className="muted" style={{ marginTop: 4, fontSize: 14 }}>
        {formatarData(evento.data_evento)} · {evento.local}
      </p>

      <section className="card" style={{ marginTop: 20 }}>
        <p className="muted" style={{ fontSize: 13 }}>Olá,</p>
        <p style={{ fontSize: 17, fontWeight: 700, marginTop: 2, marginBottom: 14 }}>{pessoa.nome}</p>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <p className="muted" style={{ fontSize: 13 }}>Categoria</p>
            <p style={{ marginTop: 2 }}>{categoria?.nome ?? "—"}</p>
          </div>
          <div>
            <p className="muted" style={{ fontSize: 13 }}>Presença</p>
            <p style={{ marginTop: 2 }}>
              <span className={`pill ${presenca?.confirmado ? "pill-good" : "pill-warn"}`}>
                {presenca?.confirmado ? "Confirmada" : "Pendente"}
              </span>
            </p>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          Prazo para confirmar presença: {formatarData(evento.prazo_presenca)}
        </p>
        {!presenca?.confirmado && (
          <form
            action={async () => {
              "use server";
              await confirmarPresenca(pessoa.id, evento.id);
            }}
            style={{ marginTop: 12 }}
          >
            <button type="submit" className="btn btn-primary">
              Confirmar presença
            </button>
          </form>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <p className="muted" style={{ fontSize: 13 }}>Contribuição</p>
        <p style={{ marginTop: 4, fontSize: 17, fontWeight: 700, color: "var(--navy)" }}>
          {pagamento ? formatarReal(pagamento.valor_devido) : formatarReal(categoria?.valor ?? 0)}
        </p>
        <p style={{ marginTop: 4 }}>
          <span className={`pill ${statusClasse[pagamento?.status ?? "pendente"]}`}>
            {pagamento ? statusLabel[pagamento.status] ?? pagamento.status : "Pendente"}
          </span>
        </p>
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          Prazo de pagamento: {formatarData(evento.prazo_pagamento)}
        </p>

        {comprovantes && comprovantes.length > 0 && (
          <p style={{ color: "var(--good)", fontSize: 13.5, marginTop: 10 }}>
            {comprovantes.length} comprovante(s) enviado(s), aguardando conferência.
          </p>
        )}

        {pagamento && pagamento.status !== "pago" && pagamento.status !== "isento" && (
          <form action={enviarComprovante} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            <input type="hidden" name="pagamentoId" value={pagamento.id} />
            <input type="file" name="arquivo" accept="image/*,application/pdf" required />
            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
              Enviar comprovante do PIX
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
