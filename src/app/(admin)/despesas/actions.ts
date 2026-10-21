"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function lancarDespesa(formData: FormData) {
  const eventoId = String(formData.get("eventoId") ?? "");
  const item = String(formData.get("item") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const categoriaOrcamentoId = String(formData.get("categoriaOrcamentoId") ?? "") || null;
  const grupoResponsavel = String(formData.get("grupoResponsavel") ?? "").trim() || null;
  const tipoDocumento = String(formData.get("tipoDocumento") ?? "").trim() || null;
  const numeroDocumento = String(formData.get("numeroDocumento") ?? "").trim() || null;
  const pagoPorTexto = String(formData.get("pagoPorTexto") ?? "").trim() || null;
  const statusComprovante = String(formData.get("statusComprovante") ?? "pendente");
  const arquivo = formData.get("arquivo") as File | null;

  if (!eventoId || !item || !valor) {
    redirect("/despesas?mensagem=" + encodeURIComponent("Informe ao menos item e valor."));
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: despesa, error } = await supabase
    .from("despesas")
    .insert({
      evento_id: eventoId,
      item,
      valor,
      categoria_orcamento_id: categoriaOrcamentoId,
      grupo_responsavel: grupoResponsavel,
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento,
      pago_por_texto: pagoPorTexto,
      status_comprovante: statusComprovante,
      criado_por: auth.user?.id,
    })
    .select("id")
    .single();

  if (error || !despesa) {
    redirect("/despesas?mensagem=" + encodeURIComponent("Não foi possível salvar a despesa."));
  }

  if (arquivo && arquivo.size > 0) {
    const extensao = arquivo.name.split(".").pop() || "bin";
    const caminho = `despesa/${despesa.id}/${Date.now()}.${extensao}`;
    const { error: erroUpload } = await supabase.storage
      .from("comprovantes")
      .upload(caminho, arquivo, { contentType: arquivo.type });

    if (!erroUpload) {
      await supabase.from("comprovantes_despesa").insert({
        despesa_id: despesa.id,
        storage_path: caminho,
        enviado_por: auth.user?.id,
      });
    }
  }

  revalidatePath("/despesas");
  redirect("/despesas?mensagem=" + encodeURIComponent("Despesa lançada."));
}

export async function gerarUrlComprovanteDespesa(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("comprovantes").createSignedUrl(storagePath, 60);
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
