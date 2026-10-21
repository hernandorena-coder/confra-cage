import { createClient } from "@/lib/supabase/server";
import { gerarCsv } from "@/lib/csv";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: evento } = await supabase.from("eventos").select("id, ano").eq("ativo", true).single();
  if (!evento) return NextResponse.json({ erro: "Nenhum evento ativo." }, { status: 404 });

  interface Linha {
    valor_devido: number;
    valor_recebido: number | null;
    status: string;
    data_pagamento: string | null;
    pessoas: { nome: string; area: string | null } | null;
  }

  const { data: pagamentos } = await supabase
    .from("pagamentos")
    .select("valor_devido, valor_recebido, status, data_pagamento, pessoas(nome, area)")
    .eq("evento_id", evento.id)
    .order("status")
    .overrideTypes<Linha[]>();

  const linhas = (pagamentos ?? []).map((p) => [
    p.pessoas?.nome ?? "",
    p.pessoas?.area ?? "",
    p.valor_devido,
    p.valor_recebido ?? "",
    p.status,
    p.data_pagamento ?? "",
  ]);

  const csv = gerarCsv(["nome", "area", "valor_devido", "valor_recebido", "status", "data_pagamento"], linhas);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pagamentos_${evento.ano}.csv"`,
    },
  });
}
