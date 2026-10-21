"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function confirmarPagamento(formData: FormData) {
  const pagamentoId = String(formData.get("pagamentoId") ?? "");
  const valorRecebido = Number(formData.get("valorRecebido") ?? 0);
  if (!pagamentoId) return;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  await supabase
    .from("pagamentos")
    .update({
      status: "pago",
      valor_recebido: valorRecebido,
      data_pagamento: new Date().toISOString().slice(0, 10),
      conferido_por: auth.user?.id,
      conferido_em: new Date().toISOString(),
    })
    .eq("id", pagamentoId);

  revalidatePath("/pagamentos");
}

export async function gerarUrlComprovante(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("comprovantes")
    .createSignedUrl(storagePath, 60); // 60s — só o tempo de abrir

  if (error || !data) return null;

  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) {
    await supabase.from("log_acessos").insert({
      usuario_id: auth.user.id,
      recurso_acessado: `comprovante:${storagePath}`,
    });
  }

  return data.signedUrl;
}
