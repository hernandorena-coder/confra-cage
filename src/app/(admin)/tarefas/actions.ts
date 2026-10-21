"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function adicionarTarefa(formData: FormData) {
  const eventoId = String(formData.get("eventoId") ?? "");
  const grupo = String(formData.get("grupo") ?? "").trim();
  const tarefa = String(formData.get("tarefa") ?? "").trim();
  const responsavelTexto = String(formData.get("responsavelTexto") ?? "").trim() || null;
  const prazo = String(formData.get("prazo") ?? "").trim() || null;

  if (!eventoId || !grupo || !tarefa) {
    redirect("/tarefas?mensagem=" + encodeURIComponent("Informe grupo e tarefa."));
  }

  const supabase = await createClient();
  await supabase.from("tarefas").insert({
    evento_id: eventoId,
    grupo,
    tarefa,
    responsavel_texto: responsavelTexto,
    prazo,
    status: "pendente",
  });

  revalidatePath("/tarefas");
  redirect("/tarefas?mensagem=" + encodeURIComponent("Tarefa adicionada."));
}

export async function atualizarStatusTarefa(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;

  const supabase = await createClient();
  await supabase.from("tarefas").update({ status }).eq("id", id);
  revalidatePath("/tarefas");
}

export async function atualizarResponsavelTarefa(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const responsavelTexto = String(formData.get("responsavelTexto") ?? "").trim() || null;

  const supabase = await createClient();
  await supabase.from("tarefas").update({ responsavel_texto: responsavelTexto }).eq("id", id);
  revalidatePath("/tarefas");
}

export async function atualizarPrazoTarefa(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const prazo = String(formData.get("prazo") ?? "").trim() || null;

  const supabase = await createClient();
  await supabase.from("tarefas").update({ prazo }).eq("id", id);
  revalidatePath("/tarefas");
}
