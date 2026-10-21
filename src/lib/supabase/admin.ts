import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente com service_role — ignora RLS. Só pode ser usado em código de servidor
// (server actions / route handlers), nunca exposto ao navegador, e só para as
// operações que o modelo de permissões não cobre (ex.: importação de CSV
// antes de haver pessoa cadastrada, geração de pacote de prestação de contas,
// rotina de expurgo de dados). Qualquer uso aqui deve registrar quem agiu
// manualmente em log_auditoria, já que não há usuário autenticado "dono" da linha.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada — defina em .env.local (nunca no cliente)."
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
