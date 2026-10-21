import { redirect } from "next/navigation";
import { carregarSessao } from "@/lib/permissoes/sessao";

export default async function PaginaInicial() {
  const sessao = await carregarSessao();

  if (!sessao) redirect("/login");

  const { vinculos } = sessao;

  const ehAdministracaoOuTesouraria = vinculos.some((v) =>
    ["admin_edicao", "admin_leitura", "tesouraria", "comprovantes"].includes(v.papelCodigo)
  );

  if (ehAdministracaoOuTesouraria) redirect("/pessoas");

  redirect("/colega");
}
