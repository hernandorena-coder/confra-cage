"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function atualizarParametrosOrcamento(formData: FormData) {
  const eventoId = String(formData.get("eventoId") ?? "");
  const pessoasNovasEstimadas = Number(formData.get("pessoasNovasEstimadas") ?? 0);
  const folgaPct = Number(formData.get("folgaPct") ?? 0);
  const reajustePct = Number(formData.get("reajustePct") ?? 0);

  if (!eventoId) return;

  const supabase = await createClient();
  await supabase
    .from("eventos")
    .update({
      pessoas_novas_estimadas: pessoasNovasEstimadas,
      folga_pct: folgaPct,
      reajuste_pct: reajustePct,
    })
    .eq("id", eventoId);

  revalidatePath("/orcamento");
}
