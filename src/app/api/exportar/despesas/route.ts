import { createClient } from "@/lib/supabase/server";
import { gerarCsv } from "@/lib/csv";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: evento } = await supabase.from("eventos").select("id, ano").eq("ativo", true).single();
  if (!evento) return NextResponse.json({ erro: "Nenhum evento ativo." }, { status: 404 });

  interface Linha {
    item: string;
    valor: number;
    tipo_documento: string | null;
    numero_documento: string | null;
    pago_por_texto: string | null;
    status_comprovante: string;
    categorias_orcamento: { nome: string } | null;
  }

  const { data: despesas } = await supabase
    .from("despesas")
    .select(
      "item, valor, tipo_documento, numero_documento, pago_por_texto, status_comprovante, categorias_orcamento(nome)"
    )
    .eq("evento_id", evento.id)
    .order("item")
    .overrideTypes<Linha[]>();

  const linhas = (despesas ?? []).map((d) => [
    d.item,
    d.categorias_orcamento?.nome ?? "",
    d.valor,
    d.tipo_documento ?? "",
    d.numero_documento ?? "",
    d.pago_por_texto ?? "",
    d.status_comprovante,
  ]);

  const csv = gerarCsv(
    ["item", "categoria", "valor", "tipo_documento", "numero_documento", "pago_por", "status_comprovante"],
    linhas
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="despesas_${evento.ano}.csv"`,
    },
  });
}
