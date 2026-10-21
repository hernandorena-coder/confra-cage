import { createClient } from "@/lib/supabase/server";
import type { CodigoPapel, Modulo, VinculoPapel } from "./tipos";

/**
 * Carrega o(s) vínculo(s) de papel do usuário logado para o evento ativo.
 * Usado pelas páginas de servidor só para decidir o que RENDERIZAR
 * (menus, abas, botões) — nunca para decidir se uma query pode rodar:
 * isso é sempre a RLS do banco quem decide.
 */
export async function carregarSessao() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: evento } = await supabase
    .from("eventos")
    .select("id, ano, nome")
    .eq("ativo", true)
    .single();

  if (!evento) return { user: auth.user, evento: null, vinculos: [] as VinculoPapel[] };

  interface VinculoRaw {
    pessoa_id: string | null;
    grupo_responsavel: string | null;
    papel_id: string;
    papeis: { codigo: string } | null;
  }
  interface PermissaoRaw {
    papel_id: string;
    modulo: string;
    pode_ler: boolean;
    pode_escrever: boolean;
  }

  const { data: vinculosRaw } = await supabase
    .from("usuarios_papeis")
    .select("pessoa_id, grupo_responsavel, papel_id, papeis(codigo)")
    .eq("usuario_id", auth.user.id)
    .eq("evento_id", evento.id)
    .overrideTypes<VinculoRaw[]>();

  const papelIds = (vinculosRaw ?? []).map((v) => v.papel_id);
  const { data: permissoesRaw } = papelIds.length
    ? await supabase
        .from("permissoes_papel")
        .select("papel_id, modulo, pode_ler, pode_escrever")
        .in("papel_id", papelIds)
        .overrideTypes<PermissaoRaw[]>()
    : { data: [] as PermissaoRaw[] };

  const vinculos: VinculoPapel[] = (vinculosRaw ?? []).map((v) => {
    const podeLer: Record<string, boolean> = {};
    const podeEscrever: Record<string, boolean> = {};
    for (const p of (permissoesRaw ?? []).filter((p) => p.papel_id === v.papel_id)) {
      podeLer[p.modulo as Modulo] = p.pode_ler;
      podeEscrever[p.modulo as Modulo] = p.pode_escrever;
    }
    return {
      papelCodigo: (v.papeis?.codigo ?? "colega") as CodigoPapel,
      pessoaId: v.pessoa_id,
      grupoResponsavel: v.grupo_responsavel,
      podeLer: podeLer as Record<Modulo, boolean>,
      podeEscrever: podeEscrever as Record<Modulo, boolean>,
    };
  });

  return { user: auth.user, evento, vinculos };
}

export function temPapel(vinculos: VinculoPapel[], codigo: CodigoPapel) {
  return vinculos.some((v) => v.papelCodigo === codigo);
}

export function podeLerModulo(vinculos: VinculoPapel[], modulo: Modulo) {
  return vinculos.some((v) => v.podeLer[modulo]);
}
