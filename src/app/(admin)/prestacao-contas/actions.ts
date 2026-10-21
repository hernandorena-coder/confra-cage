"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function fecharPrestacaoContas(formData: FormData) {
  const eventoId = String(formData.get("eventoId") ?? "");
  if (!eventoId) return;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  await supabase
    .from("eventos")
    .update({
      prestacao_contas_fechada: true,
      prestacao_contas_fechada_em: new Date().toISOString(),
      prestacao_contas_fechada_por: auth.user?.id,
    })
    .eq("id", eventoId);

  revalidatePath("/prestacao-contas");
}

export async function reabrirPrestacaoContas(formData: FormData) {
  const eventoId = String(formData.get("eventoId") ?? "");
  if (!eventoId) return;

  const supabase = await createClient();
  await supabase
    .from("eventos")
    .update({
      prestacao_contas_fechada: false,
      prestacao_contas_fechada_em: null,
      prestacao_contas_fechada_por: null,
    })
    .eq("id", eventoId);

  revalidatePath("/prestacao-contas");
}
