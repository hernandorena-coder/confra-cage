import { redirect } from "next/navigation";
import { carregarSessao, podeLerModulo } from "@/lib/permissoes/sessao";
import { sair } from "@/app/login/actions";
import { NavLink } from "./nav-link";

export default async function LayoutAdministracao({ children }: { children: React.ReactNode }) {
  const sessao = await carregarSessao();
  if (!sessao) redirect("/login");

  const { vinculos, evento } = sessao;
  const semAcessoAdministrativo = !vinculos.some((v) =>
    ["admin_edicao", "admin_leitura", "tesouraria", "comprovantes", "responsavel_frente"].includes(
      v.papelCodigo
    )
  );
  if (semAcessoAdministrativo) redirect("/colega");

  const vePessoas = podeLerModulo(vinculos, "pessoas");
  const vePagamentos = podeLerModulo(vinculos, "pagamentos") || podeLerModulo(vinculos, "comprovantes_pagamento");
  const veDespesas = podeLerModulo(vinculos, "despesas");
  const veOrcamento = podeLerModulo(vinculos, "orcamento");
  const vePatrocinadores = podeLerModulo(vinculos, "patrocinadores");
  const veTarefas = podeLerModulo(vinculos, "tarefas");
  const vePrestacaoContas = podeLerModulo(vinculos, "prestacao_contas");
  const veAuditoria = vinculos.some((v) => ["admin_edicao", "admin_leitura"].includes(v.papelCodigo));

  return (
    <div>
      <header className="topbar">
        <div>
          <h1>{evento?.nome ?? "Confraternização CAGE"}</h1>
          <nav className="topnav">
            {vePessoas && <NavLink href="/pessoas">Pessoas</NavLink>}
            {vePagamentos && <NavLink href="/pagamentos">Pagamentos</NavLink>}
            {veDespesas && <NavLink href="/despesas">Despesas</NavLink>}
            {veOrcamento && <NavLink href="/orcamento">Orçamento</NavLink>}
            {vePatrocinadores && <NavLink href="/patrocinadores">Patrocinadores</NavLink>}
            {veTarefas && <NavLink href="/tarefas">Tarefas</NavLink>}
            {vePrestacaoContas && <NavLink href="/prestacao-contas">Prestação de contas</NavLink>}
            {veAuditoria && <NavLink href="/auditoria">Auditoria</NavLink>}
          </nav>
        </div>
        <form action={sair}>
          <button type="submit" className="btn btn-ghost">
            Sair
          </button>
        </form>
      </header>
      <main style={{ padding: "24px 20px", maxWidth: 1040, margin: "0 auto" }}>{children}</main>
    </div>
  );
}
