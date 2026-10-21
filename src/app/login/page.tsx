import { entrar } from "./actions";

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 360 }}>
        <h1 style={{ fontSize: 20, color: "var(--navy)" }}>Confraternização CAGE 2026</h1>
        <p className="muted" style={{ marginTop: 4, marginBottom: 24, fontSize: 14 }}>
          Entre com o e-mail e a senha cadastrados.
        </p>

        {erro && (
          <p className="aviso" style={{ background: "rgba(239,107,97,.15)", color: "var(--bad)" }}>
            {erro}
          </p>
        )}

        <form action={entrar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label className="campo">
            E-mail
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <label className="campo">
            Senha
            <input type="password" name="senha" required autoComplete="current-password" />
          </label>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 6, justifyContent: "center" }}>
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
