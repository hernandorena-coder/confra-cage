import type { NextConfig } from "next";

// cacheComponents fica desligado: todas as páginas dependem de sessão/RLS
// (cookies, Supabase), então são sempre dinâmicas — não há nada útil a
// pré-renderizar ou cachear por usuário.
const nextConfig: NextConfig = {};

export default nextConfig;
