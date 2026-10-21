"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface LinhaPessoa {
  nome: string;
  area: string;
  categoriaCodigo: string;
  email: string;
}

const PALAVRAS_CATEGORIA: Record<string, string> = {
  AUDITOR: "AUDITOR",
  AUDITORES: "AUDITOR",
  A: "AUDITOR",
  DEMAIS: "DEMAIS",
  B: "DEMAIS",
  ISENTO: "ISENTO",
  ISENTA: "ISENTO",
  ISENTOS: "ISENTO",
};

/**
 * Formato esperado do CSV (separador ';', com ou sem BOM UTF-8):
 * nome;area;categoria;email
 * categoria = AUDITOR | DEMAIS | ISENTO. email é opcional.
 */
function parseCsv(texto: string): LinhaPessoa[] {
  const semBom = texto.replace(/^﻿/, "");
  const linhas = semBom.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (linhas.length === 0) return [];

  const [, ...resto] = linhas; // ignora cabeçalho
  return resto
    .map((linha) => {
      const [nome = "", area = "", categoriaCodigo = "", email = ""] = linha.split(";");
      return {
        nome: nome.trim(),
        area: area.trim(),
        categoriaCodigo: PALAVRAS_CATEGORIA[categoriaCodigo.trim().toUpperCase()] ?? "",
        email: email.trim(),
      };
    })
    .filter((l) => l.nome.length > 0);
}

/**
 * Lê um texto colado livremente, uma pessoa por linha. Aceita separadores
 * comuns (";", ",", "-", "|", tab) entre nome, área e categoria — nessa ordem.
 * Se só vier o nome, área e categoria ficam em branco (sinalizado na lista,
 * nunca inventado). Pensado para quem não usa planilha: cola uma lista
 * simples, uma pessoa por linha.
 */
function parseTextoLivre(texto: string): LinhaPessoa[] {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return linhas.map((linha) => {
    const partes = linha
      .split(/\s*[;,|\t]\s*|\s+-\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const [nome = "", area = "", categoriaBruta = ""] = partes;
    return {
      nome,
      area,
      categoriaCodigo: PALAVRAS_CATEGORIA[categoriaBruta.toUpperCase()] ?? "",
      email: "",
    };
  }).filter((l) => l.nome.length > 0);
}

interface ResultadoLote {
  importadas: number;
  duplicatas: number;
  semCategoria: number;
}

async function inserirLote(
  supabase: SupabaseClient,
  eventoId: string,
  linhas: LinhaPessoa[],
  origem: "importado_csv" | "manual"
): Promise<ResultadoLote> {
  const { data: categorias } = await supabase
    .from("categorias_contribuicao")
    .select("id, codigo, valor")
    .eq("evento_id", eventoId);

  const mapaCategoria = new Map((categorias ?? []).map((c) => [c.codigo, c]));

  const { data: pessoasExistentes } = await supabase
    .from("pessoas")
    .select("id, nome")
    .eq("evento_id", eventoId);

  const nomesExistentes = new Map(
    (pessoasExistentes ?? []).map((p) => [p.nome.trim().toLowerCase(), p.id])
  );

  let importadas = 0;
  let duplicatas = 0;
  let semCategoria = 0;

  for (const linha of linhas) {
    const categoria = mapaCategoria.get(linha.categoriaCodigo) ?? null;
    if (!categoria) semCategoria++;

    const possivelDuplicataId = nomesExistentes.get(linha.nome.toLowerCase()) ?? null;
    if (possivelDuplicataId) duplicatas++;

    const { data: pessoaInserida, error } = await supabase
      .from("pessoas")
      .insert({
        evento_id: eventoId,
        nome: linha.nome,
        area: linha.area || null,
        categoria_id: categoria?.id ?? null,
        email: linha.email || null,
        origem_cadastro: origem,
        possivel_duplicata_de: possivelDuplicataId,
      })
      .select("id")
      .single();

    if (error || !pessoaInserida) continue;
    importadas++;
    nomesExistentes.set(linha.nome.toLowerCase(), pessoaInserida.id);

    await supabase.from("pagamentos").insert({
      evento_id: eventoId,
      pessoa_id: pessoaInserida.id,
      valor_devido: categoria?.valor ?? 0,
      status: linha.categoriaCodigo === "ISENTO" ? "isento" : "pendente",
    });
  }

  return { importadas, duplicatas, semCategoria };
}

function mensagemResultado(r: ResultadoLote) {
  return (
    `${r.importadas} pessoa(s) adicionada(s). ${r.duplicatas} possível(is) duplicata(s) sinalizada(s) (revise antes de confiar nos totais).` +
    (r.semCategoria > 0
      ? ` ${r.semCategoria} sem categoria reconhecida (ficaram em branco, complete manualmente).`
      : "")
  );
}

export async function importarPessoasCsv(formData: FormData) {
  const arquivo = formData.get("arquivo") as File | null;
  const eventoId = String(formData.get("eventoId") ?? "");
  if (!arquivo || arquivo.size === 0 || !eventoId) {
    redirect("/pessoas?mensagem=" + encodeURIComponent("Selecione um arquivo CSV."));
  }

  const texto = await arquivo.text();
  const linhas = parseCsv(texto);
  if (linhas.length === 0) {
    redirect("/pessoas?mensagem=" + encodeURIComponent("Nenhuma linha válida encontrada no CSV."));
  }

  const supabase = await createClient();
  const resultado = await inserirLote(supabase, eventoId, linhas, "importado_csv");
  revalidatePath("/pessoas");
  redirect("/pessoas?mensagem=" + encodeURIComponent(mensagemResultado(resultado)));
}

export async function colarListaPessoas(formData: FormData) {
  const texto = String(formData.get("lista") ?? "");
  const eventoId = String(formData.get("eventoId") ?? "");
  const linhas = parseTextoLivre(texto);
  if (linhas.length === 0) {
    redirect("/pessoas?mensagem=" + encodeURIComponent("Cole ao menos uma linha com um nome."));
  }

  const supabase = await createClient();
  const resultado = await inserirLote(supabase, eventoId, linhas, "manual");
  revalidatePath("/pessoas");
  redirect("/pessoas?mensagem=" + encodeURIComponent(mensagemResultado(resultado)));
}

export async function adicionarPessoaManual(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const categoriaCodigo = String(formData.get("categoria") ?? "").trim().toUpperCase();
  const eventoId = String(formData.get("eventoId") ?? "");

  if (!nome || !eventoId) {
    redirect("/pessoas?mensagem=" + encodeURIComponent("Informe ao menos o nome."));
  }

  const supabase = await createClient();
  const resultado = await inserirLote(
    supabase,
    eventoId,
    [{ nome, area, categoriaCodigo, email: "" }],
    "manual"
  );
  revalidatePath("/pessoas");
  redirect("/pessoas?mensagem=" + encodeURIComponent(mensagemResultado(resultado)));
}
