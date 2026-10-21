import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente para Server Components / Server Actions: usa a sessão do cookie,
// respeita RLS (não usa service_role). Operações que precisam de service_role
// (ex.: importação de CSV, geração de prestação de contas) usam serverAdmin().
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de um Server Component sem permissão de escrita de cookie;
            // seguro ignorar quando há middleware renovando a sessão.
          }
        },
      },
    }
  );
}
