"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function adicionarPatrocinador(formData: FormData) {
  const eventoId = String(formData.get("eventoId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const contato = String(formData.get("contato") ?? "").trim() || null;
  const observacao = String(formData.get("observacao") ?? "").trim() || null;

  if (!eventoId || !nome) {
    redirect("/patrocinadores?mensagem=" + encodeURIComponent("Informe ao menos o nome."));
  }

  const supabase = await createClient();
  await supabase.from("patrocinadores").insert({
    evento_id: eventoId,
    nome,
    contato,
    status: "a_solicitar",
    observacao,
  });

  revalidatePath("/patrocinadores");
  redirect("/patrocinadores?mensagem=" + encodeURIComponent("Patrocinador adicionado."));
}

export async function atualizarPatrocinador(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const valorBruto = String(formData.get("valor") ?? "").trim();
  const reciboEmitido = formData.get("reciboEmitido") === "on";
  const prestacaoEnviada = formData.get("prestacaoEnviada") === "on";
  const nota = String(formData.get("nota") ?? "").trim();

  if (!id) return;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: atual } = await supabase
    .from("patrocinadores")
    .select("status")
    .eq("id", id)
    .single();

  await supabase
    .from("patrocinadores")
    .update({
      status,
      valor: valorBruto === "" ? null : Number(valorBruto),
      recibo_emitido: reciboEmitido,
      recibo_emitido_em: reciboEmitido ? new Date().toISOString().slice(0, 10) : null,
      prestacao_contas_enviada: prestacaoEnviada,
      prestacao_contas_enviada_em: prestacaoEnviada ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq("id", id);

  if (atual && atual.status !== status) {
    await supabase.from("historico_patrocinio").insert({
      patrocinador_id: id,
      descricao: `Status alterado para "${status}"`,
      registrado_por: auth.user?.id,
    });
  }
  if (nota) {
    await supabase.from("historico_patrocinio").insert({
      patrocinador_id: id,
      descricao: nota,
      registrado_por: auth.user?.id,
    });
  }

  revalidatePath("/patrocinadores");
}
