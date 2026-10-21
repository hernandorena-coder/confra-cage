"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function confirmarPresenca(pessoaId: string, eventoId: string) {
  const supabase = await createClient();
  await supabase
    .from("presencas")
    .upsert(
      {
        evento_id: eventoId,
        pessoa_id: pessoaId,
        confirmado: true,
        confirmado_em: new Date().toISOString(),
        origem: "autoconfirmacao",
      },
      { onConflict: "evento_id,pessoa_id" }
    );
  revalidatePath("/colega");
}

export async function enviarComprovante(formData: FormData) {
  const pagamentoId = String(formData.get("pagamentoId") ?? "");
  const arquivo = formData.get("arquivo") as File | null;
  if (!pagamentoId || !arquivo || arquivo.size === 0) return;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const extensao = arquivo.name.split(".").pop() || "bin";
  const caminho = `pagamento/${pagamentoId}/${Date.now()}.${extensao}`;

  const { error: erroUpload } = await supabase.storage
    .from("comprovantes")
    .upload(caminho, arquivo, { contentType: arquivo.type });

  if (erroUpload) return;

  await supabase.from("comprovantes_pagamento").insert({
    pagamento_id: pagamentoId,
    storage_path: caminho,
    tipo_arquivo: arquivo.type,
    enviado_por: auth.user.id,
  });

  revalidatePath("/colega");
}
